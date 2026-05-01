import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import type { CareHome } from '@/lib/types'

export const revalidate = 86400 // revalidate daily

const SITE_URL = 'https://www.careformum.com'

// Top UK cities with care homes — pre-generated at build time
const TOP_CITIES = [
  'London','Birmingham','Nottingham','Liverpool','Bristol','Leicester',
  'Southampton','Glasgow','Manchester','Leeds','Sheffield','Coventry',
  'Norwich','Wolverhampton','Preston','Stoke-on-Trent','Newcastle upon Tyne',
  'Derby','Bradford','Cambridge','Reading','Poole','Ipswich','Edinburgh',
  'Walsall','Stockport','Oxford','Chelmsford','Bournemouth','Aylesbury',
  'Dudley','Solihull','Doncaster','Colchester','Worthing','Eastbourne',
  'Lincoln','Worcester','York','Swansea','Blackpool','Exeter','Wigan',
  'Northampton','Southport','Bedford','Chesterfield','Leamington Spa',
  'Hull','Huddersfield','Slough','Sunderland','Plymouth','Milton Keynes',
  'Oldham','Warrington','Belfast','Stockton-on-Tees','Barnsley','Watford',
  'Cardiff','Portsmouth','Maidstone','Harrow','Ilford','Shrewsbury',
  'Aberdeen','Luton','Harrogate','Newport','Wirral','Romford','Telford',
  'Gravesend','Salisbury','Chester','Cheltenham','Enfield',
]

export function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-')
}

function slugToSearchTerm(slug: string): string {
  return slug.replace(/-/g, ' ')
}

export async function generateStaticParams() {
  return TOP_CITIES.map(city => ({ city: cityToSlug(city) }))
}

async function getCityData(citySlug: string) {
  const searchTerm = slugToSearchTerm(citySlug)

  const { data, error } = await supabase
    .from('care_homes')
    .select('*')
    .eq('service_type', 'residential')    // exclude domiciliary agencies & sheltered housing
    .ilike('city', searchTerm)
    .order('is_partner', { ascending: false, nullsFirst: false })
    .order('rating',     { ascending: false, nullsFirst: false })

  if (error || !data || data.length === 0) return null

  const homes = data as CareHome[]
  const displayCity = homes[0].city ?? searchTerm.replace(/\b\w/g, c => c.toUpperCase())

  // Compute stats
  const womenCount    = homes.filter(h => h.gender_focus === 'women_only' || h.gender_focus === 'women_friendly').length
  const dementiaCount = homes.filter(h => (h as unknown as Record<string,string>).dementia_care === 'Yes').length
  const nursingCount  = homes.filter(h => (h as unknown as Record<string,string>).nursing_care === 'Yes').length
  const ratedGood     = homes.filter(h => h.cqc_rating === 'Good' || h.cqc_rating === 'Outstanding' ||
                                           h.ci_grade === 'Good' || h.ci_grade === 'Very Good' || h.ci_grade === 'Excellent').length
  const feePrices     = homes.map(h => h.weekly_fee_from).filter(Boolean) as number[]
  const minFee        = feePrices.length ? Math.min(...feePrices) : null
  const maxFee        = feePrices.length ? Math.max(...feePrices) : null

  return { homes, displayCity, womenCount, dementiaCount, nursingCount, ratedGood, minFee, maxFee }
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> }
): Promise<Metadata> {
  const { city: citySlug } = await params
  const data = await getCityData(citySlug)
  if (!data) return { title: 'Care Homes | Careformum' }

  const { displayCity, homes, womenCount } = data
  const count = homes.length
  const pageUrl = `${SITE_URL}/care-homes/in/${citySlug}`

  const title = `Care Homes in ${displayCity} (${count} Homes) | Careformum`
  const description = `Find ${count} care homes in ${displayCity}${womenCount > 0 ? `, including ${womenCount} women-only or women-friendly options` : ''}. Compare CQC ratings, costs, and facilities. Nursing, dementia, and residential care.`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title,
      description,
    },
  }
}

const RATING_STYLES: Record<string, { pill: string; dot: string }> = {
  Outstanding:            { pill: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  Good:                   { pill: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500'  },
  'Requires Improvement': { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
  'Requires improvement': { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
  Inadequate:             { pill: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500'    },
  'Very Good':            { pill: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  Excellent:              { pill: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  Adequate:               { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
}

function CareHomeCard({ home }: { home: CareHome }) {
  const topServices = ['residential_care','nursing_care','dementia_care','respite_care']
    .filter(s => (home as unknown as Record<string,string>)[s] === 'Yes')
    .slice(0, 3)
    .map(s => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()))

  const rating = home.cqc_rating ?? home.ci_grade
  const ratingStyle = rating ? (RATING_STYLES[rating] ?? { pill: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' }) : null

  return (
    <Link
      href={`/care-homes/${home.place_id}`}
      className={`group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all ${
        home.is_partner ? 'border-2 border-rose-300' : 'border border-stone-200 hover:border-rose-200'
      }`}
    >
      <div className="relative h-44 bg-stone-100">
        {home.representative_image_url ? (
          <Image
            src={home.representative_image_url}
            alt={home.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
        )}
        {(home.is_partner || home.gender_focus === 'women_only' || home.gender_focus === 'women_friendly') && (
          <div className="absolute top-2 left-2 flex gap-1">
            {home.is_partner && (
              <span className="bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">★ Featured</span>
            )}
            {home.gender_focus === 'women_only' && (
              <span className="bg-rose-100 text-rose-700 text-xs font-medium px-2 py-0.5 rounded-full border border-rose-200">♀ Women Only</span>
            )}
            {home.gender_focus === 'women_friendly' && (
              <span className="bg-pink-100 text-pink-700 text-xs font-medium px-2 py-0.5 rounded-full border border-pink-200">♀ Women Friendly</span>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-stone-900 group-hover:text-rose-600 transition-colors leading-snug line-clamp-2 text-sm">{home.name}</h3>
          {home.rating && (
            <div className="flex items-center gap-0.5 shrink-0">
              <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-stone-700">{home.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-2">{[home.address, home.postal_code].filter(Boolean).join(' · ')}</p>
        <div className="flex flex-wrap gap-1">
          {ratingStyle && rating && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${ratingStyle.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ratingStyle.dot}`} />
              {rating}
            </span>
          )}
          {home.weekly_fee_from && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              From £{home.weekly_fee_from.toLocaleString()}/wk
            </span>
          )}
          {topServices.map(s => (
            <span key={s} className="text-xs bg-stone-50 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

// Nearby / related cities to show at the bottom
const RELATED_CITY_GROUPS: Record<string, string[]> = {
  'London':           ['Harrow','Ilford','Enfield','Romford','Watford'],
  'Birmingham':       ['Coventry','Wolverhampton','Walsall','Dudley','Solihull'],
  'Manchester':       ['Stockport','Oldham','Wigan','Warrington','Preston'],
  'Leeds':            ['Bradford','Huddersfield','Harrogate','York','Sheffield'],
  'Bristol':          ['Swindon','Cheltenham','Gloucester','Bath'],
  'Liverpool':        ['Wirral','Southport','Warrington'],
  'Glasgow':          ['Edinburgh','Aberdeen'],
  'Edinburgh':        ['Glasgow','Aberdeen'],
  'Cardiff':          ['Swansea','Newport'],
  'Nottingham':       ['Derby','Leicester','Sheffield'],
}

function getRelatedCities(city: string): string[] {
  return RELATED_CITY_GROUPS[city] ?? TOP_CITIES.filter(c => c !== city).slice(0, 6)
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: citySlug } = await params
  const result = await getCityData(citySlug)
  if (!result) notFound()

  const { homes, displayCity, womenCount, dementiaCount, nursingCount, ratedGood, minFee, maxFee } = result
  const total   = homes.length
  const preview = homes.slice(0, 24)
  const pageUrl = `${SITE_URL}/care-homes/in/${citySlug}`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',       item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Care Homes', item: `${SITE_URL}/search` },
      { '@type': 'ListItem', position: 3, name: `Care Homes in ${displayCity}`, item: pageUrl },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many care homes are there in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are ${total} care homes listed in ${displayCity} on Careformum${womenCount > 0 ? `, of which ${womenCount} are women-only or women-friendly` : ''}.`,
        },
      },
      {
        '@type': 'Question',
        name: `How much does a care home in ${displayCity} cost?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: minFee
            ? `Care home fees in ${displayCity} typically start from £${minFee.toLocaleString()} per week${maxFee && maxFee !== minFee ? ` and can reach £${maxFee.toLocaleString()} per week` : ''}, depending on the level of care required. Nursing care and specialist dementia care are generally more expensive than residential care.`
            : `Care home costs in ${displayCity} vary by care type. Residential care is generally the most affordable, with nursing care and dementia care costing more. Contact homes directly or use our enquiry form for up-to-date pricing.`,
        },
      },
      {
        '@type': 'Question',
        name: `Are there women-only care homes in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: womenCount > 0
            ? `Yes — ${womenCount} care homes in ${displayCity} are either women-only or women-friendly, catering to women who prefer single-sex care environments or have specific cultural and religious preferences. All other listed homes are mixed-gender and welcome female residents.`
            : `Genuinely women-only care homes are rare across the UK (fewer than ten exist nationwide). The care homes listed in ${displayCity} are mixed-gender and welcome female residents — the majority of care home residents in the UK are women. Many homes offer private rooms, female-carer preferences for personal care, and a comfortable environment for older women. Use the Women\u2019s Care filter on our search page to see homes in this area sorted by women-focused policies.`,
        },
      },
      {
        '@type': 'Question',
        name: `What types of care are available in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${displayCity} care homes offer a range of services including residential care, nursing care${dementiaCount > 0 ? `, dementia care (${dementiaCount} homes)` : ''}, respite care, and palliative care. Use Careformum's filters to find homes offering the specific care type you need.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the CQC rating for care homes in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: ratedGood > 0
            ? `${ratedGood} out of ${total} care homes in ${displayCity} are rated Good or Outstanding by the Care Quality Commission (CQC) or equivalent inspectorate. Ratings are displayed on each home's listing page on Careformum.`
            : `CQC and Care Inspectorate ratings are displayed on each care home's profile on Careformum. Always check the latest inspection report before making a decision.`,
        },
      },
    ],
  }

  const relatedCities = getRelatedCities(displayCity)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Logo size="sm" />
            {/* Breadcrumb */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm text-stone-400">
              <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/search" className="hover:text-rose-600 transition-colors">Care Homes</Link>
              <span>/</span>
              <span className="text-stone-700 font-medium">{displayCity}</span>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-rose-50 to-white py-10 px-6 border-b border-stone-100">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">
                Care Homes in {displayCity}
              </h1>
              <p className="text-stone-500 text-lg max-w-2xl">
                Browse {total} care homes in {displayCity}
                {womenCount > 0 ? `, including ${womenCount} women-only and women-friendly options` : ''}.
                Compare CQC ratings, costs, and facilities.
              </p>

              {/* Stats bar */}
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-stone-900">{total}</p>
                  <p className="text-xs text-stone-500">Care Homes</p>
                </div>
                {womenCount > 0 && (
                  <div className="bg-rose-50 rounded-xl border border-rose-200 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-2xl font-bold text-rose-700">{womenCount}</p>
                    <p className="text-xs text-rose-500">Women-Friendly</p>
                  </div>
                )}
                {dementiaCount > 0 && (
                  <div className="bg-purple-50 rounded-xl border border-purple-200 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-2xl font-bold text-purple-700">{dementiaCount}</p>
                    <p className="text-xs text-purple-500">Dementia Care</p>
                  </div>
                )}
                {nursingCount > 0 && (
                  <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-2xl font-bold text-blue-700">{nursingCount}</p>
                    <p className="text-xs text-blue-500">Nursing Care</p>
                  </div>
                )}
                {ratedGood > 0 && (
                  <div className="bg-green-50 rounded-xl border border-green-200 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-2xl font-bold text-green-700">{ratedGood}</p>
                    <p className="text-xs text-green-500">Good / Outstanding</p>
                  </div>
                )}
                {minFee && (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3 text-center min-w-[100px]">
                    <p className="text-2xl font-bold text-emerald-700">£{minFee.toLocaleString()}</p>
                    <p className="text-xs text-emerald-500">From / week</p>
                  </div>
                )}
              </div>

              {/* Quick filter links */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href={`/search?city=${encodeURIComponent(displayCity)}&gender=women`}
                  className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-full hover:bg-rose-200 transition-colors">
                  ♀ Women&apos;s care homes in {displayCity}
                </Link>
                <Link href={`/search?city=${encodeURIComponent(displayCity)}&service=dementia_care`}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors">
                  Dementia care in {displayCity}
                </Link>
                <Link href={`/search?city=${encodeURIComponent(displayCity)}&service=nursing_care`}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                  Nursing care in {displayCity}
                </Link>
                <Link href={`/search?city=${encodeURIComponent(displayCity)}&service=respite_care`}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
                  Respite care in {displayCity}
                </Link>
              </div>
            </div>
          </section>

          {/* Care home grid */}
          <section className="py-10 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-stone-900">
                  {total > 24 ? `Top ${preview.length} of ${total} care homes in ${displayCity}` : `All ${total} care homes in ${displayCity}`}
                </h2>
                <Link
                  href={`/search?city=${encodeURIComponent(displayCity)}`}
                  className="text-sm text-rose-600 hover:underline"
                >
                  View all with filters →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {preview.map(home => (
                  <CareHomeCard key={home.place_id} home={home} />
                ))}
              </div>

              {total > 24 && (
                <div className="text-center mt-8">
                  <Link
                    href={`/search?city=${encodeURIComponent(displayCity)}`}
                    className="inline-block bg-rose-600 hover:bg-rose-700 text-white font-medium px-8 py-3 rounded-xl transition-colors"
                  >
                    View all {total} care homes in {displayCity}
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* FAQ section */}
          <section className="py-12 px-6 bg-stone-50 border-t border-stone-100">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-stone-900 mb-8">
                Frequently Asked Questions — Care Homes in {displayCity}
              </h2>
              <div className="space-y-5">
                {faqSchema.mainEntity.map((faq, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-900 mb-2 text-sm">{faq.name}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed">{faq.acceptedAnswer.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related cities */}
          <section className="py-10 px-6 border-t border-stone-100">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Care Homes in Nearby Areas</h2>
              <div className="flex flex-wrap gap-2">
                {relatedCities.map(city => (
                  <Link
                    key={city}
                    href={`/care-homes/in/${cityToSlug(city)}`}
                    className="text-sm bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-600 text-stone-600 px-4 py-2 rounded-xl transition-colors"
                  >
                    {city}
                  </Link>
                ))}
                <Link
                  href="/search"
                  className="text-sm bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  Browse all cities →
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-stone-900 text-stone-400 py-6 px-6 mt-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <Logo size="sm" linkTo="/" />
            <p>© {new Date().getFullYear()} Careformum.com · UK Care Home Directory for Elderly Women</p>
          </div>
        </footer>
      </div>
    </>
  )
}
