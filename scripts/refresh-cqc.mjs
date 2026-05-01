#!/usr/bin/env node
/**
 * scripts/refresh-cqc.mjs
 *
 * Downloads the CQC HSCA Active Locations ODS file and:
 *   1. Updates cqc_rating / cqc_beds / cqc_rating_date for residential homes
 *      (direct CQC ID match + fuzzy name+postcode matching).
 *   2. Also matches domiciliary care providers by postcode + name, setting
 *      their cqc_location_id and cqc_rating.
 *
 * Usage:
 *   node --env-file=.env.local scripts/refresh-cqc.mjs
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import unzipper from 'unzipper'
import sax from 'sax'

// ── Config ────────────────────────────────────────────────────────────────────

// Latest CQC HSCA Active Locations ODS — update URL monthly if needed
// Check: https://www.cqc.org.uk/about-us/transparency/using-cqc-data
const CQC_ODS_URL =
  'https://www.cqc.org.uk/sites/default/files/2026-04/01_April_2026_HSCA_Active_Locations.ods'

// The ODS file has 27 preamble rows before the actual header row (row 28 = index 27)
const HEADER_ROW_INDEX = 27   // 0-based

// Column indices in the data (from the header row we inspected)
const COL = {
  LOCATION_ID:     0,
  DORMANT:         2,
  IS_CARE_HOME:    3,
  NAME:            4,
  BEDS:            9,
  RATING:          13,
  RATING_DATE:     14,
  REGION:          16,
  STREET:          23,
  CITY:            25,
  COUNTY:          26,
  POSTCODE:        27,
  IS_DOMICILIARY:  92,   // "Service type - Domiciliary care service"
  // Service user bands
  DEMENTIA:        109,
  OLDER_PEOPLE:    112,
}

// Set to true to attempt name+postcode matching for homes that have no CQC ID
const ENABLE_FUZZY_MATCH = true
const NAME_MATCH_THRESHOLD = 0.75   // bigram similarity 0–1

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.')
  console.error('Run with: node --env-file=.env.local scripts/refresh-cqc.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Name similarity (bigram Dice coefficient) ─────────────────────────────────

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

// ── Parse CQC date strings ────────────────────────────────────────────────────

function parseCqcDate(raw) {
  if (!raw) return null
  // Format: "20/04/2022" or "DD/MM/YYYY"
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
}

// ── Stream & parse the ODS file ───────────────────────────────────────────────

function streamCqcOds(url) {
  return new Promise((resolve, reject) => {
    /** @type {Map<string, {name,rating,beds,ratingDate,postcode,region}>} residential */
    const byId = new Map()
    /** @type {Map<string, Array>} postcode → entries (residential fuzzy) */
    const byPostcode = new Map()
    /** @type {Map<string, {name,rating,ratingDate,postcode,region}>} domiciliary */
    const byIdDom = new Map()
    /** @type {Map<string, Array>} postcode → entries (domiciliary fuzzy) */
    const byPostcodeDom = new Map()

    let rowIndex = 0    // tracks which row we're on (0-based)
    let headers = null
    let currentRow = []
    let currentCell = ''
    let inCell = false
    let dataRowCount = 0
    let domRowCount = 0

    const saxParser = sax.createStream(false, { lowercase: true })

    saxParser.on('opentag', (node) => {
      if (node.name === 'table:table-row') {
        currentRow = []
      }
      if (node.name === 'table:table-cell' || node.name === 'table:covered-table-cell') {
        inCell = true
        currentCell = ''
        // Expand repeated empty columns
        const repeat = parseInt(node.attributes['table:number-columns-repeated'] || '1')
        if (repeat > 1 && repeat < 200) {  // Guard against huge repeat values
          for (let i = 1; i < repeat; i++) currentRow.push('')
        }
      }
    })

    saxParser.on('text', (t) => {
      if (inCell) currentCell += t
    })

    saxParser.on('closetag', (name) => {
      if (name === 'table:table-cell' || name === 'table:covered-table-cell') {
        currentRow.push(currentCell.trim())
        inCell = false
        currentCell = ''
      }

      if (name === 'table:table-row') {
        const row = currentRow
        currentRow = []

        if (rowIndex === HEADER_ROW_INDEX) {
          // This is the header row — validate key columns
          headers = row
          const check = {
            'Location ID': row[COL.LOCATION_ID],
            'Care home?':  row[COL.IS_CARE_HOME],
            'Care homes beds': row[COL.BEDS],
            'Rating': row[COL.RATING],
          }
          console.log('  Header row confirmed:', JSON.stringify(check))
          rowIndex++
          return
        }

        if (!headers) { rowIndex++; return }

        // Skip dormant services
        if (row[COL.DORMANT] === 'Y') { rowIndex++; return }

        const locationId = row[COL.LOCATION_ID]
        if (!locationId) { rowIndex++; return }

        const name       = row[COL.NAME] || ''
        const rating     = row[COL.RATING] || null
        const ratingDate = parseCqcDate(row[COL.RATING_DATE])
        const postcode   = (row[COL.POSTCODE] || '').replace(/\s/g, '').toUpperCase()
        const region     = row[COL.REGION] || null

        // ── Residential care homes ──────────────────────────────────────────
        if (row[COL.IS_CARE_HOME] === 'Y') {
          const bedsRaw = row[COL.BEDS]
          const beds    = bedsRaw ? (parseInt(bedsRaw, 10) || null) : null
          const entry   = { locationId, name, rating, beds, ratingDate, postcode, region }

          byId.set(locationId, entry)

          if (ENABLE_FUZZY_MATCH && postcode) {
            if (!byPostcode.has(postcode)) byPostcode.set(postcode, [])
            byPostcode.get(postcode).push(entry)
          }

          dataRowCount++

        // ── Domiciliary care services ───────────────────────────────────────
        } else if (row[COL.IS_DOMICILIARY] === 'Y') {
          const entry = { locationId, name, rating, ratingDate, postcode, region }

          byIdDom.set(locationId, entry)

          if (ENABLE_FUZZY_MATCH && postcode) {
            if (!byPostcodeDom.has(postcode)) byPostcodeDom.set(postcode, [])
            byPostcodeDom.get(postcode).push(entry)
          }

          domRowCount++
        }

        rowIndex++
      }
    })

    saxParser.on('error', (e) => {
      if (e.message !== 'STOP') reject(e)
    })

    saxParser.on('end', () => {
      console.log(`  Parsed ${dataRowCount.toLocaleString()} residential care home rows`)
      console.log(`  ${byId.size.toLocaleString()} entries indexed by Location ID`)
      if (ENABLE_FUZZY_MATCH) {
        console.log(`  ${byPostcode.size.toLocaleString()} unique postcodes indexed`)
      }
      console.log(`  Parsed ${domRowCount.toLocaleString()} domiciliary care rows`)
      console.log(`  ${byIdDom.size.toLocaleString()} domiciliary entries indexed by Location ID`)
      if (ENABLE_FUZZY_MATCH) {
        console.log(`  ${byPostcodeDom.size.toLocaleString()} unique domiciliary postcodes indexed`)
      }
      resolve({ byId, byPostcode, byIdDom, byPostcodeDom })
    })

    console.log(`  Downloading ${url}...`)
    const req = https.get(url, { timeout: 180_000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      let downloaded = 0
      res.on('data', (chunk) => {
        downloaded += chunk.length
        process.stdout.write(`\r  ${(downloaded / 1e6).toFixed(1)}MB downloaded...`)
      })

      res.pipe(unzipper.Parse())
        .on('entry', (entry) => {
          if (entry.path === 'content.xml') {
            process.stdout.write('\n')
            console.log('  Parsing content.xml...')
            entry.pipe(saxParser)
          } else {
            entry.autodrain()
          }
        })
        .on('error', reject)
    })

    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Request timed out')))
  })
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

/** Fetch ALL care homes from Supabase, paginating through the 1,000 row limit */
async function fetchAllHomes() {
  const all = []
  let page = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('care_homes')
      .select('place_id, name, postal_code, cqc_location_id, service_type')
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

/** Batch-update care homes in chunks of 50 parallel requests */
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

// ── Build update payload from CQC entry ──────────────────────────────────────

function buildUpdate(entry) {
  const u = { updated_at: new Date().toISOString() }
  if (entry.rating)     u.cqc_rating      = entry.rating
  if (entry.beds)       u.cqc_beds        = entry.beds
  if (entry.ratingDate) u.cqc_rating_date = entry.ratingDate
  return u
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  CQC Ratings Refresh — Careformum')
  console.log(`  ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}`)
  console.log('═══════════════════════════════════════════════\n')

  // Step 1 — Download and parse ODS
  console.log('Step 1/4  Downloading & parsing CQC data...')
  const { byId, byPostcode, byIdDom, byPostcodeDom } = await streamCqcOds(CQC_ODS_URL)

  // Step 2 — Fetch all DB homes
  console.log('\nStep 2/4  Fetching care homes from Supabase...')
  const homes = await fetchAllHomes()
  console.log(`  ${homes.length.toLocaleString()} homes loaded`)

  const residentialHomes = homes.filter(h => h.service_type === 'residential' || !h.service_type)
  const domHomes         = homes.filter(h => h.service_type === 'domiciliary')

  const withId    = residentialHomes.filter(h => h.cqc_location_id)
  const withoutId = residentialHomes.filter(h => !h.cqc_location_id)
  console.log(`  ${residentialHomes.length.toLocaleString()} residential  (${withId.length} with CQC ID, ${withoutId.length} without)`)
  console.log(`  ${domHomes.length.toLocaleString()} domiciliary`)

  // Step 3 — Update residential ratings
  console.log('\nStep 3/4  Updating residential ratings...')

  // 3a — Direct ID matches
  console.log('\n  [A] Direct cqc_location_id matches')
  const directUpdates = []
  let directNotFound = 0

  for (const home of withId) {
    const entry = byId.get(home.cqc_location_id)
    if (!entry) { directNotFound++; continue }
    directUpdates.push({ place_id: home.place_id, ...buildUpdate(entry) })
  }

  console.log(`  ${directUpdates.length} to update, ${directNotFound} not found in CQC data`)
  const { ok: dOk, fail: dFail } = await batchUpdate(directUpdates, 'Direct')
  console.log(`  ✓ ${dOk} updated  ✗ ${dFail} errors`)

  // 3b — Fuzzy name+postcode matching for residential without CQC ID
  let fuzzyMatched = 0

  if (ENABLE_FUZZY_MATCH && withoutId.length > 0) {
    console.log(`\n  [B] Fuzzy name+postcode matching for ${withoutId.length.toLocaleString()} homes without CQC ID`)

    const fuzzyUpdates = []

    for (const home of withoutId) {
      if (!home.postal_code || !home.name) continue
      const pc = home.postal_code.replace(/\s/g, '').toUpperCase()
      const candidates = byPostcode.get(pc)
      if (!candidates?.length) continue

      let best = null, bestScore = NAME_MATCH_THRESHOLD - 0.001

      for (const c of candidates) {
        if (!c.name) continue
        const score = similarity(home.name, c.name)
        if (score > bestScore) { bestScore = score; best = c }
      }

      if (!best) continue

      fuzzyMatched++
      fuzzyUpdates.push({
        place_id: home.place_id,
        cqc_location_id: best.locationId,
        ...buildUpdate(best),
      })
    }

    console.log(`  ${fuzzyMatched} matches found (threshold: ${NAME_MATCH_THRESHOLD})`)
    const { ok: fOk, fail: fFail } = await batchUpdate(fuzzyUpdates, 'Fuzzy')
    console.log(`  ✓ ${fOk} updated  ✗ ${fFail} errors`)
  }

  // Step 4 — Update domiciliary ratings (direct ID first, then fuzzy)
  let domMatched = 0
  let domOk = 0, domFail = 0

  if (domHomes.length > 0) {
    console.log(`\nStep 4/4  Matching domiciliary providers (${domHomes.length.toLocaleString()})...`)

    const domUpdates = []

    for (const home of domHomes) {
      if (!home.name) continue

      // Direct ID match first (some may already have a cqc_location_id)
      if (home.cqc_location_id) {
        const entry = byIdDom.get(home.cqc_location_id)
        if (entry) {
          domMatched++
          domUpdates.push({ place_id: home.place_id, ...buildUpdate(entry) })
          continue
        }
      }

      // Fuzzy postcode + name match
      if (!home.postal_code) continue
      const pc = home.postal_code.replace(/\s/g, '').toUpperCase()
      const candidates = byPostcodeDom.get(pc)
      if (!candidates?.length) continue

      let best = null, bestScore = NAME_MATCH_THRESHOLD - 0.001

      for (const c of candidates) {
        if (!c.name) continue
        const score = similarity(home.name, c.name)
        if (score > bestScore) { bestScore = score; best = c }
      }

      if (!best) continue

      domMatched++
      domUpdates.push({
        place_id: home.place_id,
        cqc_location_id: best.locationId,
        ...buildUpdate(best),
      })
    }

    console.log(`  ${domMatched} matches found (threshold: ${NAME_MATCH_THRESHOLD})`)
    const { ok, fail } = await batchUpdate(domUpdates, 'Domiciliary')
    domOk = ok; domFail = fail
    console.log(`  ✓ ${domOk} updated  ✗ ${domFail} errors`)
  } else {
    console.log('\nStep 4/4  No domiciliary providers in DB — skipping.')
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Residential — direct ID matches:  ${dOk}`)
  if (ENABLE_FUZZY_MATCH) {
    console.log(`  Residential — fuzzy matches:      ${fuzzyMatched}`)
  }
  console.log(`  Domiciliary — matched & updated:  ${domOk}`)
  console.log(`  Total updated:                    ${dOk + fuzzyMatched + domOk}`)
  console.log('\nDone ✓\n')

  // Spot-check a few known homes
  console.log('Spot-check — verifying 3 known homes:')
  const checks = [
    'ChIJ00_nVOFtdkgR97E6xZywYBA',  // Marian House Uxbridge
    'ChIJl-7MzhvudUgR0vQlF67jT0M',  // Greensleeves Crawley
    'cqc_1-115224949',               // Heathfield Warrington
  ]
  for (const pid of checks) {
    const { data } = await supabase
      .from('care_homes')
      .select('name, cqc_rating, cqc_beds, cqc_rating_date')
      .eq('place_id', pid)
      .single()
    console.log(`  ${data?.name}: rating=${data?.cqc_rating}, beds=${data?.cqc_beds}, date=${data?.cqc_rating_date}`)
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
