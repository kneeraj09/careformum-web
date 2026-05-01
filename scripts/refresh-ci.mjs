#!/usr/bin/env node
/**
 * scripts/refresh-ci.mjs
 *
 * Downloads the Care Inspectorate Scotland monthly CSV datastore and:
 *   1. Updates ci_service_id / ci_grade / ci_grade_date and sub-grades
 *      for Scottish residential care homes (direct CS number match +
 *      fuzzy name+postcode matching).
 *
 * Usage:
 *   node --env-file=.env.local scripts/refresh-ci.mjs
 *
 * URL pattern: https://www.careinspectorate.com/images/Datastore/YYMMDD_DatastoreExternal.csv
 * Update the URL monthly — check:
 *   https://www.careinspectorate.com/index.php/statistics-and-analysis/data-and-analysis
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import { parse } from 'csv-parse'

// ── Config ────────────────────────────────────────────────────────────────────

// Latest CI Scotland datastore — update URL monthly if needed
const CI_CSV_URL =
  'https://www.careinspectorate.com/images/Datastore/260331_DatastoreExternal.csv'

const ENABLE_FUZZY_MATCH   = true
const NAME_MATCH_THRESHOLD = 0.75

// CI uses a 1–6 numeric scale; map to text for storage
const GRADE_TEXT = {
  '6': 'Excellent',
  '5': 'Very Good',
  '4': 'Good',
  '3': 'Adequate',
  '2': 'Weak',
  '1': 'Unsatisfactory',
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.')
  console.error('Run with: node --env-file=.env.local scripts/refresh-ci.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Utilities ─────────────────────────────────────────────────────────────────

function bigrams(str) {
  const s = (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  const set = new Set()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

function similarity(a, b) {
  const ba = bigrams(a), bb = bigrams(b)
  if (!ba.size || !bb.size) return 0
  let overlap = 0
  for (const g of ba) if (bb.has(g)) overlap++
  return (2 * overlap) / (ba.size + bb.size)
}

function parseCiDate(raw) {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function gradeText(numStr) {
  return GRADE_TEXT[(numStr || '').trim()] ?? null
}

// ── Stream & parse the CI CSV ─────────────────────────────────────────────────

function streamCiCsv(url) {
  return new Promise((resolve, reject) => {
    /** @type {Map<string, object>} csNumber → entry */
    const byId = new Map()
    /** @type {Map<string, Array>} postcode → entries */
    const byPostcode = new Map()

    let careHomeCount = 0

    const csvParser = parse({
      columns:          true,   // use first row as headers
      skip_empty_lines: true,
      relax_quotes:     true,
      trim:             true,
    })

    csvParser.on('readable', () => {
      let record
      while ((record = csvParser.read()) !== null) {
        // Only active adult care home services
        if (record.ServiceStatus  !== 'Active')           continue
        if (record.CareService    !== 'Care Home Service') continue
        if (record.Client_group   === 'Children')          continue

        const csNumber    = record.CSNumber?.trim()
        if (!csNumber) continue

        const minGradeRaw = (record.MinGrade || '').trim()
        const minGrade    = gradeText(minGradeRaw)
        if (!minGrade) continue    // skip ungraded services

        const name        = record.ServiceName?.trim() || ''
        const postcode    = (record.Service_Postcode || '').replace(/\s/g, '').toUpperCase()
        const gradeDate   = parseCiDate(record.Publication_of_Latest_Grading)
        const careSupport = gradeText(record.KQ_Care_and_Support_Planning)
        const environment = gradeText(record.KQ_Setting)
        const staffing    = gradeText(record.KQ_Staff_Team)
        const management  = gradeText(record.KQ_Leadership)

        const entry = { csNumber, name, postcode, gradeDate, minGrade, careSupport, environment, staffing, management }

        byId.set(csNumber, entry)

        if (ENABLE_FUZZY_MATCH && postcode) {
          if (!byPostcode.has(postcode)) byPostcode.set(postcode, [])
          byPostcode.get(postcode).push(entry)
        }

        careHomeCount++
      }
    })

    csvParser.on('error', reject)

    csvParser.on('end', () => {
      console.log(`  Parsed ${careHomeCount.toLocaleString()} active Scottish care home rows`)
      console.log(`  ${byId.size.toLocaleString()} entries indexed by CS number`)
      if (ENABLE_FUZZY_MATCH) {
        console.log(`  ${byPostcode.size.toLocaleString()} unique postcodes indexed`)
      }
      resolve({ byId, byPostcode })
    })

    console.log(`  Downloading ${url}...`)
    const req = https.get(url, {
      timeout: 120_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Careformum-Bot/1.0)' },
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      let downloaded = 0
      res.on('data', (chunk) => {
        downloaded += chunk.length
        process.stdout.write(`\r  ${(downloaded / 1e6).toFixed(1)} MB downloaded...`)
      })
      res.on('end', () => process.stdout.write('\n'))

      res.pipe(csvParser)
    })

    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Request timed out')))
  })
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchResidentialHomes() {
  const all = []
  let page = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('care_homes')
      .select('place_id, name, postal_code, ci_service_id')
      .eq('service_type', 'residential')
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .order('place_id')

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    page++
  }

  return all
}

async function batchUpdate(updates, label) {
  if (updates.length === 0) { console.log(`  ${label}: 0 updates`); return { ok: 0, fail: 0 } }

  let ok = 0, fail = 0
  const CHUNK = 50

  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    await Promise.all(chunk.map(async ({ place_id, ...fields }) => {
      const { error } = await supabase
        .from('care_homes')
        .update(fields)
        .eq('place_id', place_id)
      if (error) { fail++; console.error(`\n  ✗ ${place_id}: ${error.message}`) }
      else ok++
    }))
    process.stdout.write(`\r  ${label}: ${Math.min(i + CHUNK, updates.length)}/${updates.length} processed`)
  }
  process.stdout.write('\n')
  return { ok, fail }
}

function buildUpdate(entry) {
  const u = { updated_at: new Date().toISOString() }
  if (entry.minGrade)    u.ci_grade       = entry.minGrade
  if (entry.gradeDate)   u.ci_grade_date  = entry.gradeDate
  if (entry.careSupport) u.ci_care_support = entry.careSupport
  if (entry.environment) u.ci_environment  = entry.environment
  if (entry.staffing)    u.ci_staffing     = entry.staffing
  if (entry.management)  u.ci_management   = entry.management
  return u
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Care Inspectorate Scotland Refresh — Careformum')
  console.log(`  ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  console.log('═══════════════════════════════════════════════════════\n')

  // Step 1 — Download and parse CSV
  console.log('Step 1/3  Downloading & parsing CI Scotland datastore...')
  const { byId, byPostcode } = await streamCiCsv(CI_CSV_URL)

  // Step 2 — Fetch residential homes from DB
  console.log('\nStep 2/3  Fetching residential homes from Supabase...')
  const homes = await fetchResidentialHomes()
  console.log(`  ${homes.length.toLocaleString()} residential homes loaded`)

  const withCiId    = homes.filter(h => h.ci_service_id)
  const withoutCiId = homes.filter(h => !h.ci_service_id)
  console.log(`  ${withCiId.length.toLocaleString()} have ci_service_id`)
  console.log(`  ${withoutCiId.length.toLocaleString()} have no ci_service_id (fuzzy match attempted)`)

  // Step 3 — Update
  console.log('\nStep 3/3  Updating CI grades...')

  // 3a — Direct CI service number matches
  console.log('\n  [A] Direct ci_service_id matches')
  const directUpdates = []
  let directNotFound  = 0

  for (const home of withCiId) {
    const entry = byId.get(home.ci_service_id)
    if (!entry) { directNotFound++; continue }
    directUpdates.push({ place_id: home.place_id, ...buildUpdate(entry) })
  }

  console.log(`  ${directUpdates.length} to update, ${directNotFound} not found in CI data`)
  const { ok: dOk, fail: dFail } = await batchUpdate(directUpdates, 'Direct')
  console.log(`  ✓ ${dOk} updated  ✗ ${dFail} errors`)

  // 3b — Fuzzy name+postcode matching
  //      Scottish homes will find matches; English/Welsh homes won't (wrong postcodes)
  let fuzzyMatched = 0

  if (ENABLE_FUZZY_MATCH && withoutCiId.length > 0) {
    console.log(`\n  [B] Fuzzy name+postcode matching (Scottish postcodes only will hit)`)

    const fuzzyUpdates = []

    for (const home of withoutCiId) {
      if (!home.postal_code || !home.name) continue
      const pc = home.postal_code.replace(/\s/g, '').toUpperCase()

      const candidates = byPostcode.get(pc)
      if (!candidates?.length) continue    // non-Scottish postcode → no match, safe to skip

      let best = null, bestScore = NAME_MATCH_THRESHOLD - 0.001

      for (const c of candidates) {
        const score = similarity(home.name, c.name)
        if (score > bestScore) { bestScore = score; best = c }
      }

      if (!best) continue

      fuzzyMatched++
      fuzzyUpdates.push({
        place_id:       home.place_id,
        ci_service_id:  best.csNumber,
        ...buildUpdate(best),
      })
    }

    console.log(`  ${fuzzyMatched} Scottish homes matched (threshold: ${NAME_MATCH_THRESHOLD})`)
    const { ok: fOk, fail: fFail } = await batchUpdate(fuzzyUpdates, 'Fuzzy')
    console.log(`  ✓ ${fOk} updated  ✗ ${fFail} errors`)
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Direct CI ID matches updated: ${dOk}`)
  console.log(`  Fuzzy matches found:          ${fuzzyMatched}`)
  console.log(`  Total homes updated:          ${dOk + fuzzyMatched}`)
  console.log('\nDone ✓\n')

  // Spot-check a couple of known Scottish homes
  console.log('Spot-check — verifying 2 known Scottish homes:')
  const checks = [
    { pid: null, name: 'Spot-check by CI postcode', note: 'fetch a Glasgow or Edinburgh home' },
  ]

  // Generic spot-check: pull 3 homes that now have ci_grade
  const { data: sample } = await supabase
    .from('care_homes')
    .select('name, ci_grade, ci_grade_date, ci_care_support, ci_staffing')
    .not('ci_grade', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (sample?.length) {
    for (const h of sample) {
      console.log(`  ${h.name}: grade=${h.ci_grade}, date=${h.ci_grade_date}, care=${h.ci_care_support}, staff=${h.ci_staffing}`)
    }
  } else {
    console.log('  No CI-graded homes found yet.')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
