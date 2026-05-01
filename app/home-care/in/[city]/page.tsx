import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import type { CareHome } from '@/lib/types'

export const revalidate = 86400

const SITE_URL = 'https://www.careformum.com'

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
    .eq('service_type', 'domiciliary')
    .ilike('city', searchTerm)
    .order('is_partner', { ascending: false, nullsFirst: false })
    .order('rating',     { ascending: false, nullsFirst: false })

  if (error || !data || data.length === 0) return null

  const providers = data as CareHome[]
  const displayCity = providers[0].city ?? searchTerm.replace(/\b\w/g, c => c.toUpperCase())

  const ratedGood       = providers.filter(h => h.cqc_rating === 'Good' || h.cqc_rating === 'Outstanding').length
  const liveInCount     = providers.filter(h => (h as unknown as Record<string,string>).live_in_care === 'Yes').length
  const dementiaCount   = providers.filter(h => (h as unknown as Record<string,string>).dementia_care === 'Yes').length

  return { providers, displayCity, ratedGood, liveInCount, dementiaCount }
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> }
): Promise<Metadata> {
  const { city: citySlug } = await params
  const data = await getCityData(citySlug)
  if (!data) return { title: 'Home Care | Careformum' }

  const { displayCity, providers } = data
  const count = providers.length
  const pageUrl = `${SITE_URL}/home-care/in/${citySlug}`

  const title = `Home Care in ${displayCity} (${count} Providers) | Careformum`
  const description = `Find ${count} CQC-rated home care providers in ${displayCity}. Compare ratings and services — personal care, live-in care, dementia support and more.`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { type: 'website', url: pageUrl, title, description },
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

function ProviderCard({ home }: { home: CareHome }) {
  const topServices = ['personal_care', 'live_in_care', 'dementia_care', 'nursing_care', 'reablement_care']
    .filter(s => (home as unknown as Record<string,string>)[s] === 'Yes')
    .slice(0, 3)
    .map(s => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()))

  const ratingStyle = home.cqc_rating
    ? (RATING_STYLES[home.cqc_rating] ?? { pill: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' })
    : null

  return (
    <Link
      href={`/care-homes/${home.place_id}`}
      className={`group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all ${
        home.is_partner ? 'border-2 border-teal-300' : 'border border-stone-200 hover:border-teal-200'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        {home.is_partner && (
          <div className="absolute top-2 left-2">
            <span className="bg-teal-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">★ Featured</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-stone-900 group-hover:text-teal-600 transition-colors leading-snug line-clamp-2 text-sm">
            {home.name}
          </h3>
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
          {ratingStyle && home.cqc_rating && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${ratingStyle.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ratingStyle.dot}`} />
              CQC: {home.cqc_rating}
            </span>
          )}
          {topServices.map(s => (
            <span key={s} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

const RELATED_CITY_GROUPS: Record<string, string[]> = {
  'London':           ['Harrow','Ilford','Enfield','Romford','Watford'],
  'Birmingham':       ['Coventry','Wolverhampton','Walsall','Dudley','Solihull'],
  'Manchester':       ['Stockport','Oldham','Wigan','Warrington','Preston'],
  'Leeds':            ['Bradford','Huddersfield','Harrogate','York','Sheffield'],
  'Bristol':          ['Cheltenham','Gloucester','Bath','Swindon'],
  'Liverpool':        ['Wirral','Southport','Warrington'],
  'Glasgow':          ['Edinburgh','Aberdeen'],
  'Edinburgh':        ['Glasgow','Aberdeen'],
  'Cardiff':          ['Swansea','Newport'],
  'Nottingham':       ['Derby','Leicester','Sheffield'],
}

function getRelatedCities(city: string): string[] {
  return RELATED_CITY_GROUPS[city] ?? TOP_CITIES.filter(c => c !== city).slice(0, 6)
}

export default async function HomeCareInCityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: citySlug } = await params
  const result = await getCityData(citySlug)
  if (!result) notFound()

  const { providers, displayCity, ratedGood, liveInCount, dementiaCount } = result
  const total    = providers.length
  const preview  = providers.slice(0, 24)
  const pageUrl  = `${SITE_URL}/home-care/in/${citySlug}`
  const relatedCities = getRelatedCities(displayCity)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',      item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Care at Home', item: `${SITE_URL}/home-care` },
      { '@type': 'ListItem', position: 3, name: `Home Care in ${displayCity}`, item: pageUrl },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many home care providers are there in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are ${total} home care providers listed in ${displayCity} on Careformum.`,
        },
      },
      {
        '@type': 'Question',
        name: `How much does home care cost in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Home care costs in ${displayCity} vary by the level of care and number of hours required. Personal care visits typically cost £20–£30 per hour. Live-in care is usually charged as a weekly rate and can range from £800 to over £1,800 per week depending on needs. Contact providers directly for personalised quotes.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is home care available for people with dementia in ${displayCity}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: dementiaCount > 0
            ? `Yes — ${dementiaCount} home care provider${dementiaCount !== 1 ? 's' : ''} in ${displayCity} offer specialist dementia support. This can range from regular companionship visits to specialist live-in carers trained in dementia care.`
            : `Home care for people with dementia is available in ${displayCity}. Use the Dementia Care filter on our search page to find relevant providers.`,
        },
      },
      {
        '@type': 'Question',
        name: `Are home care providers in ${displayCity} CQC-rated?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: ratedGood > 0
            ? `${ratedGood} out of ${total} home care providers in ${displayCity} are rated Good or Outstanding by the Care Quality Commission (CQC). Always check the latest CQC report before engaging a provider.`
            : `CQC ratings are displayed on each provider's profile on Careformum. Always check the latest inspection report before choosing a provider.`,
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-6 text-sm text-stone-600">
              <Link href="/" className="hover:text-teal-600 transition-colors">Care Homes</Link>
              <Link href="/home-care" className="text-teal-600 font-medium">Care at Home</Link>
              <Link
                href={`/home-care/search?city=${encodeURIComponent(displayCity)}`}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                Search all
              </Link>
            </nav>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="bg-stone-50 border-b border-stone-100 px-6 py-2">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-stone-500">
            <Link href="/" className="hover:text-teal-600">Home</Link>
            <span>›</span>
            <Link href="/home-care" className="hover:text-teal-600">Care at Home</Link>
            <span>›</span>
            <span className="text-stone-900">Home Care in {displayCity}</span>
          </div>
        </div>

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-12 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">
                  Home Care in {displayCity}
                </h1>
                <p className="text-stone-600 max-w-2xl">
                  {total} CQC-registered home care provider{total !== 1 ? 's' : ''} in {displayCity}
                  {liveInCount > 0 ? `, including ${liveInCount} offering live-in care` : ''}.
                  Support delivered in your own home — from regular visits to round-the-clock live-in care.
                </p>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white rounded-xl border border-stone-200 px-5 py-3 text-center min-w-[120px]">
                  <div className="text-2xl font-bold text-teal-600">{total}</div>
                  <div className="text-xs text-stone-500 mt-0.5">Providers</div>
                </div>
                {ratedGood > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 px-5 py-3 text-center min-w-[120px]">
                    <div className="text-2xl font-bold text-green-600">{ratedGood}</div>
                    <div className="text-xs text-stone-500 mt-0.5">Good / Outstanding</div>
                  </div>
                )}
                {liveInCount > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 px-5 py-3 text-center min-w-[120px]">
                    <div className="text-2xl font-bold text-teal-600">{liveInCount}</div>
                    <div className="text-xs text-stone-500 mt-0.5">Live-in Care</div>
                  </div>
                )}
                {dementiaCount > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 px-5 py-3 text-center min-w-[120px]">
                    <div className="text-2xl font-bold text-purple-600">{dementiaCount}</div>
                    <div className="text-xs text-stone-500 mt-0.5">Dementia Support</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Provider grid */}
          <section className="py-10 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900">
                  Home Care Providers in {displayCity}
                </h2>
                {total > 24 && (
                  <Link
                    href={`/home-care/search?city=${encodeURIComponent(displayCity)}`}
                    className="text-sm text-teal-600 hover:underline"
                  >
                    View all {total} →
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {preview.map(provider => (
                  <ProviderCard key={provider.place_id} home={provider} />
                ))}
              </div>

              {total > 24 && (
                <div className="mt-8 text-center">
                  <Link
                    href={`/home-care/search?city=${encodeURIComponent(displayCity)}`}
                    className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
                  >
                    View all {total} providers in {displayCity}
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-10 px-6 bg-stone-50 border-t border-stone-100">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-stone-900 mb-6">
                Home Care in {displayCity} — FAQs
              </h2>
              <div className="space-y-4">
                {faqSchema.mainEntity.map((faq, i) => (
                  <div key={i} className="bg-white rounded-xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-900 mb-2 text-sm">{faq.name}</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{faq.acceptedAnswer.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Other cities */}
          <section className="py-10 px-6 bg-white border-t border-stone-100">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-lg font-bold text-stone-900 mb-4">
                Home Care in Nearby Areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {relatedCities.map(city => (
                  <Link
                    key={city}
                    href={`/home-care/in/${cityToSlug(city)}`}
                    className="text-sm bg-stone-50 border border-stone-200 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 text-stone-700 px-4 py-2 rounded-full transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-stone-900 text-stone-400 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <Logo size="sm" linkTo="/" />
            <p>© {new Date().getFullYear()} Careformum.com · UK Care Home Directory</p>
          </div>
        </footer>
      </div>
    </>
  )
}
