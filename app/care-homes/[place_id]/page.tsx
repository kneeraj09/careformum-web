import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import type { CareHome, CareHomeImage } from '@/lib/types'
import { SERVICE_GROUPS } from '@/lib/types'

export const revalidate = 86400 // revalidate daily

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

  return (
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
                <GenderBadge gender={home.gender_focus} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
                <span>{[home.city, home.county, home.postal_code].filter(Boolean).join(', ')}</span>
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

              {home.website && (
                <a
                  href={home.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm py-2.5 rounded-xl transition-colors mt-2"
                >
                  Enquire Now
                </a>
              )}
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
  )
}
