#!/usr/bin/env node
/**
 * scripts/refresh-ciw.mjs
 *
 * Downloads the Care Inspectorate Wales (CIW) bulk data export CSV and:
 *   1. Updates ci_service_id / ci_grade / ci_grade_date and sub-grades
 *      for Welsh residential care homes (direct SIN number match +
 *      fuzzy name+postcode matching).
 *
 * Usage:
 *   node --env-file=.env.local scripts/refresh-ciw.mjs
 *
 * Data source (auto-updated by CIW):
 *   https://digital.careinspectorate.wales/api/DataExport
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import { parse } from 'csv-parse'

// ── Config ────────────────────────────────────────────────────────────────────

const CIW_CSV_URL = 'https://digital.careinspectorate.wales/api/DataExport'

const ENABLE_FUZZY_MATCH   = true
const NAME_MATCH_THRESHOLD = 0.75

// CIW uses a 4-level scale; lower number = worse grade
const GRADE_ORDER = {
  'Excellent':                        4,
  'Good':                             3,
  'Requires Improvement':             2,
  'Requires Significant Improvement': 1,
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.')
  console.error('Run with: node --env-file=.env.local scripts/refresh-ciw.mjs')
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

/** Parse "dd/mm/yyyy hh:mm" → "yyyy-mm-dd" */
function parseCiwDate(raw) {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Return the worst (lowest rank) grade from an array of grade strings */
function worstGrade(grades) {
  let worst = null, worstRank = 99
  for (const g of grades) {
    const rank = GRADE_ORDER[g] ?? 99
    if (rank < worstRank) { worstRank = rank; worst = g }
  }
  return worst
}

/**
 * Parse CIW ratings string:
 * "Well-being: Good; Care and Support: Good; Environment: Good; Leadership and Management: Good"
 * → { wellbeing, careSupport, environment, management }
 */
function parseRatings(raw) {
  if (!raw) return {}
  const map = {}
  for (const part of raw.split(';')) {
    const idx = part.indexOf(':')
    if (idx < 0) continue
    map[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim()
  }
  return {
    wellbeing:   map['well-being']              ?? null,
    careSupport: map['care and support']        ?? null,
    environment: map['environment']             ?? null,
    management:  map['leadership and management'] ?? null,
  }
}

// ── Stream & parse the CIW CSV ────────────────────────────────────────────────

function streamCiwCsv(url) {
  return new Promise((resolve, reject) => {
    /** @type {Map<string, object>} sinNumber → entry */
    const byId = new Map()
    /** @type {Map<string, Array>} postcode → entries */
    const byPostcode = new Map()

    let careHomeCount = 0

    const csvParser = parse({
      columns:          true,
      skip_empty_lines: true,
      relax_quotes:     true,
      trim:             true,
    })

    csvParser.on('readable', () => {
      let record
      while ((record = csvParser.read()) !== null) {
        // Adult care homes only
        if (record['Service Type'] !== 'Care Home Service') continue
        const subType = record['Service Sub-Type'] || ''
        if (!subType.includes('Adults')) continue   // skip children's homes

        const sinNumber = record['Service URN']?.trim()
        if (!sinNumber) continue

        const ratingsRaw = record['Service Ratings']?.trim() || ''
        const ratings    = parseRatings(ratingsRaw)

        // Must have at least one rated theme
        const gradeValues = [ratings.wellbeing, ratings.careSupport, ratings.environment, ratings.management]
          .filter(Boolean)
        if (gradeValues.length === 0) continue   // ungraded — skip

        const name      = record['Service Name']?.trim() || ''
        const postcode  = (record['Service Postcode'] || '').replace(/\s/g, '').toUpperCase()
        const gradeDate = parseCiwDate(record['Last Updated On'])
        const minGrade  = worstGrade(gradeValues)

        const entry = { sinNumber, name, postcode, gradeDate, minGrade,
                        careSupport: ratings.careSupport,
                        environment: ratings.environment,
                        management:  ratings.management,
                        staffing:    ratings.wellbeing,   // Well-being → ci_staffing
                      }

        byId.set(sinNumber, entry)

        if (ENABLE_FUZZY_MATCH && postcode) {
          if (!byPostcode.has(postcode)) byPostcode.set(postcode, [])
          byPostcode.get(postcode).push(entry)
        }

        careHomeCount++
      }
    })

    csvParser.on('error', reject)

    csvParser.on('end', () => {
      console.log(`  Parsed ${careHomeCount.toLocaleString()} rated adult care home rows`)
      console.log(`  ${byId.size.toLocaleString()} entries indexed by SIN number`)
      if (ENABLE_FUZZY_MATCH) {
        console.log(`  ${byPostcode.size.toLocaleString()} unique postcodes indexed`)
      }
      resolve({ byId, byPostcode })
    })

    console.log(`  Downloading ${url}...`)
    const req = https.get(url, {
      timeout: 120_000,
      headers: {
        'Accept':            'text/csv, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent':        'Mozilla/5.0 (compatible; Careformum-Bot/1.0)',
      },
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

/** Fetch all residential homes that could be Welsh:
 *  - those already with a SIN- service ID
 *  - those without any ci_service_id (Welsh ones will match by postcode)
 */
async function fetchWelshCandidates() {
  const all = []
  let page = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('care_homes')
      .select('place_id, name, postal_code, ci_service_id')
      .eq('service_type', 'residential')
      .or('ci_service_id.like.SIN-%,ci_service_id.is.null')
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
  if (entry.minGrade)    u.ci_grade        = entry.minGrade
  if (entry.gradeDate)   u.ci_grade_date   = entry.gradeDate
  if (entry.careSupport) u.ci_care_support  = entry.careSupport
  if (entry.environment) u.ci_environment   = entry.environment
  if (entry.management)  u.ci_management    = entry.management
  if (entry.staffing)    u.ci_staffing      = entry.staffing
  return u
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Care Inspectorate Wales (CIW) Refresh — Careformum')
  console.log(`  ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  console.log('═══════════════════════════════════════════════════════\n')

  // Step 1 — Download and parse CSV
  console.log('Step 1/3  Downloading & parsing CIW data export...')
  const { byId, byPostcode } = await streamCiwCsv(CIW_CSV_URL)

  // Step 2 — Fetch Welsh candidate homes from DB
  console.log('\nStep 2/3  Fetching Welsh candidate homes from Supabase...')
  const homes = await fetchWelshCandidates()
  console.log(`  ${homes.length.toLocaleString()} candidate homes loaded`)

  const withSinId    = homes.filter(h => h.ci_service_id?.startsWith('SIN-'))
  const withoutSinId = homes.filter(h => !h.ci_service_id?.startsWith('SIN-'))
  console.log(`  ${withSinId.length.toLocaleString()} have ci_service_id (SIN-)`)
  console.log(`  ${withoutSinId.length.toLocaleString()} have no SIN- ID (Welsh ones will fuzzy-match)`)

  // Step 3 — Update
  console.log('\nStep 3/3  Updating CIW grades...')

  // 3a — Direct SIN number matches
  console.log('\n  [A] Direct ci_service_id (SIN-) matches')
  const directUpdates = []
  let directNotFound  = 0

  for (const home of withSinId) {
    const entry = byId.get(home.ci_service_id)
    if (!entry) { directNotFound++; continue }
    directUpdates.push({ place_id: home.place_id, ...buildUpdate(entry) })
  }

  console.log(`  ${directUpdates.length} to update, ${directNotFound} SIN IDs not found in CIW data`)
  const { ok: dOk, fail: dFail } = await batchUpdate(directUpdates, 'Direct')
  console.log(`  ✓ ${dOk} updated  ✗ ${dFail} errors`)

  // 3b — Fuzzy name+postcode matching
  //      Only Welsh postcodes will find candidates in the CIW postcode index
  let fuzzyMatched = 0

  if (ENABLE_FUZZY_MATCH && withoutSinId.length > 0) {
    console.log(`\n  [B] Fuzzy name+postcode matching (Welsh postcodes only will hit)`)

    const fuzzyUpdates = []

    for (const home of withoutSinId) {
      if (!home.postal_code || !home.name) continue
      const pc = home.postal_code.replace(/\s/g, '').toUpperCase()

      const candidates = byPostcode.get(pc)
      if (!candidates?.length) continue    // non-Welsh postcode → no match, safe to skip

      let best = null, bestScore = NAME_MATCH_THRESHOLD - 0.001

      for (const c of candidates) {
        const score = similarity(home.name, c.name)
        if (score > bestScore) { bestScore = score; best = c }
      }

      if (!best) continue

      fuzzyMatched++
      fuzzyUpdates.push({
        place_id:       home.place_id,
        ci_service_id:  best.sinNumber,
        ...buildUpdate(best),
      })
    }

    console.log(`  ${fuzzyMatched} Welsh homes matched (threshold: ${NAME_MATCH_THRESHOLD})`)
    const { ok: fOk, fail: fFail } = await batchUpdate(fuzzyUpdates, 'Fuzzy')
    console.log(`  ✓ ${fOk} updated  ✗ ${fFail} errors`)
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Direct SIN ID matches updated:  ${dOk}`)
  console.log(`  Fuzzy matches found:            ${fuzzyMatched}`)
  console.log(`  Total homes updated:            ${dOk + fuzzyMatched}`)
  console.log('\nDone ✓\n')

  // Spot-check: pull 3 recently updated Welsh homes
  console.log('Spot-check — 3 most recently updated Welsh (SIN-) homes:')
  const { data: sample } = await supabase
    .from('care_homes')
    .select('name, ci_grade, ci_grade_date, ci_care_support, ci_staffing, ci_management')
    .like('ci_service_id', 'SIN-%')
    .not('ci_grade', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (sample?.length) {
    for (const h of sample) {
      console.log(`  ${h.name}`)
      console.log(`    grade=${h.ci_grade}, date=${h.ci_grade_date}`)
      console.log(`    wellbeing=${h.ci_staffing}, care=${h.ci_care_support}, management=${h.ci_management}`)
    }
  } else {
    console.log('  No CIW-graded homes found yet.')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
