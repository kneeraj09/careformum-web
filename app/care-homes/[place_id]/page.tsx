import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Logo from '@/app/components/Logo'
import EnquiryForm from '@/app/components/EnquiryForm'
import { supabase } from '@/lib/supabase'
import type { CareHome, CareHomeImage } from '@/lib/types'
import { SERVICE_GROUPS } from '@/lib/types'

export const revalidate = 86400 // revalidate daily

const SITE_URL = 'https://www.careformum.com'

export async function generateMetadata(
  { params }: { params: Promise<{ place_id: string }> }
): Promise<Metadata> {
  const { place_id } = await params
  const home = await getCareHome(place_id)
  if (!home) return { title: 'Care Home Not Found' }

  const name    = home.name ?? 'Care Home'
  const city    = home.city ?? home.county ?? 'UK'
  const address = [home.address, home.city, home.postal_code].filter(Boolean).join(', ')

  const genderText =
    home.gender_focus === 'women_only'     ? 'women-only ' :
    home.gender_focus === 'women_friendly' ? 'women-friendly ' : ''

  const services: string[] = []
  if (home.dementia_care === 'Yes')   services.push('dementia care')
  if (home.nursing_care  === 'Yes')   services.push('nursing care')
  if (home.respite_care  === 'Yes')   services.push('respite care')

  const description = [
    `${name} is a ${genderText}care home in ${city}.`,
    services.length ? `Services include ${services.join(', ')}.` : '',
    `Find contact details, photos, and full facilities at Careformum.`,
  ].filter(Boolean).join(' ')

  const pageUrl = `${SITE_URL}/care-homes/${place_id}`
  const image   = home.representative_image_url ?? `${SITE_URL}/images/logo.png`

  return {
    title: `${name} — Care Home in ${city}`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        'website',
      url:         pageUrl,
      title:       `${name} — Care Home in ${city}`,
      description,
      images:      [{ url: image, alt: name }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${name} — Care Home in ${city}`,
      description,
      images:      [image],
    },
    other: {
      'geo.region':   'GB',
      'geo.placename': city,
    },
  }
}

async function getCareHome(place_id: string): Promise<CareHome | null> {
  const { data } = await supabase
    .from('care_homes')
    .select('*')
    .eq('place_id', place_id)
    .single()
  return data as CareHome | null
}

async function getImages(place_id: string): Promise<CareHomeImage[]> {
  const { data } = await supabase
    .from('care_home_images')
    .select('id, place_id, supabase_url, image_type, taxonomy_tags, vision_reason, width, height')
    .eq('place_id', place_id)
    .limit(20)
  return (data as CareHomeImage[]) ?? []
}

function GenderBadge({ gender }: { gender: string | null }) {
  if (!gender) return null
  const styles: Record<string, string> = {
    women_only:      'bg-rose-100 text-rose-700 border-rose-300',
    women_friendly:  'bg-pink-100 text-pink-700 border-pink-300',
    mixed:           'bg-stone-100 text-stone-600 border-stone-300',
  }
  const labels: Record<string, string> = {
    women_only:     'Women Only',
    women_friendly: 'Women Friendly',
    mixed:          'Mixed',
  }
  return (
    <span className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-full border ${styles[gender] ?? 'bg-stone-100 text-stone-600 border-stone-300'}`}>
      {gender === 'women_only' || gender === 'women_friendly' ? '♀ ' : ''}{labels[gender] ?? gender}
    </span>
  )
}

const CQC_STYLES: Record<string, string> = {
  Outstanding:              'bg-purple-50 text-purple-800 border-purple-200',
  Good:                     'bg-green-50  text-green-800  border-green-200',
  'Requires Improvement':   'bg-amber-50  text-amber-800  border-amber-200',
  'Requires improvement':   'bg-amber-50  text-amber-800  border-amber-200',
  Inadequate:               'bg-red-50    text-red-800    border-red-200',
}
const CQC_DOT: Record<string, string> = {
  Outstanding:              'bg-purple-500',
  Good:                     'bg-green-500',
  'Requires Improvement':   'bg-amber-400',
  'Requires improvement':   'bg-amber-400',
  Inadequate:             'bg-red-500',
}

const CI_STYLES: Record<string, string> = {
  // Scottish CI
  Excellent:       'bg-purple-50 text-purple-800 border-purple-200',
  'Very Good':     'bg-blue-50   text-blue-800   border-blue-200',
  Good:            'bg-green-50  text-green-800  border-green-200',
  Adequate:        'bg-amber-50  text-amber-800  border-amber-200',
  Weak:            'bg-orange-50 text-orange-800 border-orange-200',
  Unsatisfactory:  'bg-red-50    text-red-800    border-red-200',
  // CIW (Wales)
  'Requires Improvement':             'bg-amber-50  text-amber-800  border-amber-200',
  'Requires Significant Improvement': 'bg-red-50    text-red-800    border-red-200',
}
const CI_DOT: Record<string, string> = {
  // Scottish CI
  Excellent:       'bg-purple-500',
  'Very Good':     'bg-blue-500',
  Good:            'bg-green-500',
  Adequate:        'bg-amber-400',
  Weak:            'bg-orange-400',
  Unsatisfactory:  'bg-red-500',
  // CIW (Wales)
  'Requires Improvement':             'bg-amber-400',
  'Requires Significant Improvement': 'bg-red-500',
}

function CqcDomainRow({ label, rating }: { label: string; rating: string | null }) {
  if (!rating) return null
  const dot = CQC_DOT[rating] ?? 'bg-stone-400'
  const style = CQC_STYLES[rating] ?? 'bg-stone-50 text-stone-700 border-stone-200'
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${style}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {rating}
      </span>
    </div>
  )
}

function ServiceBadge({ value, label }: { value: string; label: string }) {
  if (value === 'Yes') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
        <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-green-800 font-medium">{label}</span>
      </div>
    )
  }
  if (value === 'No') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg opacity-50">
        <svg className="w-4 h-4 text-stone-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-stone-500">{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg opacity-40">
      <span className="w-4 h-4 text-stone-300 shrink-0 text-center">?</span>
      <span className="text-sm text-stone-400">{label}</span>
    </div>
  )
}

export default async function CareHomePage({
  params,
}: {
  params: Promise<{ place_id: string }>
}) {
  const { place_id } = await params
  const [home, images] = await Promise.all([
    getCareHome(place_id),
    getImages(place_id),
  ])

  if (!home) notFound()

  const heroImage = images.find(i => i.image_type === 'exterior') ?? images[0]

  // JSON-LD structured data
  const services: string[] = []
  if (home.dementia_care   === 'Yes') services.push('Dementia Care')
  if (home.nursing_care    === 'Yes') services.push('Nursing Care')
  if (home.residential_care=== 'Yes') services.push('Residential Care')
  if (home.respite_care    === 'Yes') services.push('Respite Care')
  if (home.palliative_care === 'Yes') services.push('Palliative Care')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/care-homes/${place_id}`,
    name: home.name,
    description: services.length
      ? `${home.name} provides ${services.join(', ')} in ${home.city ?? 'the UK'}.`
      : `Care home in ${home.city ?? 'the UK'}.`,
    url: `${SITE_URL}/care-homes/${place_id}`,
    telephone: home.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: home.address ?? undefined,
      addressLocality: home.city ?? undefined,
      addressRegion: home.county ?? undefined,
      postalCode: home.postal_code ?? undefined,
      addressCountry: 'GB',
    },
    geo: home.latitude && home.longitude ? {
      '@type': 'GeoCoordinates',
      latitude:  home.latitude,
      longitude: home.longitude,
    } : undefined,
    image: heroImage?.supabase_url ?? home.representative_image_url ?? undefined,
    aggregateRating: home.rating ? {
      '@type': 'AggregateRating',
      ratingValue: home.rating,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Logo size="sm" />
          <Link
            href={home.city ? `/search?city=${encodeURIComponent(home.city)}` : '/search'}
            className="text-sm text-stone-500 hover:text-rose-600 transition-colors"
          >
            ← Back to results
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">

        {/* Hero image */}
        {heroImage && (
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-6 bg-stone-100">
            <Image
              src={heroImage.supabase_url}
              alt={home.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
            />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: main info */}
          <div className="md:col-span-2 space-y-6">
            {/* Title block */}
            <div>
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-stone-900 flex-1">{home.name}</h1>
                <div className="flex flex-wrap gap-2">
                  {home.is_partner && (
                    <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      ★ Featured Partner
                    </span>
                  )}
                  <GenderBadge gender={home.gender_focus} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
                <span>{[home.city, home.county, home.postal_code].filter(Boolean).join(', ')}</span>
                {home.weekly_fee_from && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-sm font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    From £{home.weekly_fee_from.toLocaleString()}
                    {home.weekly_fee_to ? `–£${home.weekly_fee_to.toLocaleString()}` : ''} / week
                  </span>
                )}
                {home.rating && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <strong className="text-stone-700">{home.rating.toFixed(1)}</strong>
                    {home.reviews && <span>({home.reviews.toLocaleString()} reviews)</span>}
                  </span>
                )}
                {home.category && <span className="bg-stone-100 px-2 py-0.5 rounded">{home.category}</span>}
              </div>
            </div>

            {/* Description */}
            {home.description && (
              <div>
                <h2 className="text-lg font-semibold text-stone-900 mb-2">About</h2>
                <p className="text-stone-600 leading-relaxed">{home.description}</p>
              </div>
            )}

            {/* Key selling points */}
            {home.key_selling_points && (
              <div>
                <h2 className="text-lg font-semibold text-stone-900 mb-2">Highlights</h2>
                <p className="text-stone-600 leading-relaxed whitespace-pre-line">{home.key_selling_points}</p>
              </div>
            )}

            {/* CQC Inspection Rating */}
            {home.cqc_rating && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-stone-900">CQC Inspection Rating</h2>
                  {home.cqc_location_id && (
                    <a
                      href={`https://www.cqc.org.uk/location/${home.cqc_location_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 hover:underline"
                    >
                      View full report →
                    </a>
                  )}
                </div>
                <div className={`rounded-2xl border p-4 mb-3 ${CQC_STYLES[home.cqc_rating] ?? 'bg-stone-50 border-stone-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-0.5">Overall Rating</p>
                      <p className="text-2xl font-bold">{home.cqc_rating}</p>
                      {home.cqc_rating_date && (
                        <p className="text-xs opacity-60 mt-0.5">
                          Inspected {new Date(home.cqc_rating_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    {home.cqc_beds && (
                      <div className="text-right">
                        <p className="text-2xl font-bold">{home.cqc_beds}</p>
                        <p className="text-xs opacity-70">registered beds</p>
                      </div>
                    )}
                  </div>
                </div>
                {(home.cqc_safe || home.cqc_effective || home.cqc_caring || home.cqc_responsive || home.cqc_well_led) && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-4">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Domain Ratings</p>
                    <CqcDomainRow label="Safe"        rating={home.cqc_safe} />
                    <CqcDomainRow label="Effective"   rating={home.cqc_effective} />
                    <CqcDomainRow label="Caring"      rating={home.cqc_caring} />
                    <CqcDomainRow label="Responsive"  rating={home.cqc_responsive} />
                    <CqcDomainRow label="Well-led"    rating={home.cqc_well_led} />
                  </div>
                )}
              </div>
            )}

            {/* Care Inspectorate Rating (Scotland / Wales) */}
            {home.ci_grade && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {home.ci_service_id?.startsWith('SIN-') ? 'Care Inspectorate Wales Rating' : 'Care Inspectorate Rating'}
                  </h2>
                  {home.ci_service_id && (
                    <a
                      href={
                        home.ci_service_id.startsWith('SIN-')
                          ? `https://digital.careinspectorate.wales/directory/service/${home.ci_service_id}`
                          : `https://www.careinspectorate.com/index.php/care-services?detail=${home.ci_service_id}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 hover:underline"
                    >
                      View full report →
                    </a>
                  )}
                </div>
                <div className={`rounded-2xl border p-4 mb-3 ${CI_STYLES[home.ci_grade] ?? 'bg-stone-50 border-stone-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-0.5">Overall Grade</p>
                      <p className="text-2xl font-bold">{home.ci_grade}</p>
                      {home.ci_grade_date && (
                        <p className="text-xs opacity-60 mt-0.5">
                          Inspected {new Date(home.ci_grade_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {(home.ci_care_support || home.ci_management || home.ci_staffing || home.ci_environment) && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-4">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Quality Themes</p>
                    <CqcDomainRow label="Wellbeing &amp; Care Support" rating={home.ci_care_support} />
                    <CqcDomainRow label="Leadership"                  rating={home.ci_management} />
                    <CqcDomainRow label="Staff Team"                  rating={home.ci_staffing} />
                    <CqcDomainRow label="Setting"                     rating={home.ci_environment} />
                  </div>
                )}
              </div>
            )}

            {/* Services */}
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Services &amp; Facilities</h2>
              {Object.entries(SERVICE_GROUPS).map(([groupName, items]) => (
                <div key={groupName} className="mb-5">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{groupName}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map(({ key, label }) => (
                      <ServiceBadge
                        key={key}
                        value={(home as unknown as Record<string, string>)[key] ?? 'Unknown'}
                        label={label}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Photo gallery */}
            {images.length > 1 && (
              <div>
                <h2 className="text-lg font-semibold text-stone-900 mb-3">Photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.slice(0, 9).map(img => (
                    <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden bg-stone-100">
                      <Image
                        src={img.supabase_url}
                        alt={img.image_type ?? 'Care home photo'}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: contact + map */}
          <div className="space-y-4">
            {/* Contact card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-stone-900">Contact</h2>

              {home.address && (
                <div className="flex items-start gap-2 text-sm text-stone-600">
                  <svg className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{home.address}</span>
                </div>
              )}

              {home.phone && (
                <a href={`tel:${home.phone}`} className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 transition-colors">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {home.phone}
                </a>
              )}

              {home.email && (
                <a href={`mailto:${home.email}`} className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 transition-colors truncate">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{home.email}</span>
                </a>
              )}

              {home.website && (
                <a
                  href={home.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Visit website
                </a>
              )}

              <EnquiryForm
                placeId={place_id}
                homeName={home.name}
                homeCity={home.city}
              />
            </div>

            {/* Map */}
            {home.latitude && home.longitude && (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <iframe
                  title="Map"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${home.latitude},${home.longitude}&z=15&output=embed`}
                />
                <div className="p-3">
                  <a
                    href={`https://maps.google.com/?q=${home.latitude},${home.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>
            )}

            {/* Funding */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <h3 className="font-semibold text-stone-900 mb-3 text-sm">Funding Options</h3>
              <div className="space-y-1.5">
                {[
                  { key: 'nhs_funded', label: 'NHS Funded' },
                  { key: 'local_authority_funded', label: 'Local Authority' },
                  { key: 'self_funded', label: 'Self Funded' },
                ].map(({ key, label }) => {
                  const val = (home as unknown as Record<string, string>)[key]
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">{label}</span>
                      {val === 'Yes'
                        ? <span className="text-green-600 font-medium">✓ Yes</span>
                        : val === 'No'
                        ? <span className="text-stone-400">No</span>
                        : <span className="text-stone-300">Unknown</span>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-6 px-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <Logo size="sm" linkTo="/" />
          <p>© {new Date().getFullYear()} Careformum.com · UK Care Home Directory.</p>
        </div>
      </footer>
    </div>
    </>
  )
}
