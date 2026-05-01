'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/app/components/Logo'
import { supabase } from '@/lib/supabase'
import type { CareHome } from '@/lib/types'

const SERVICE_FILTERS = [
  {
    key: 'personal_care',
    label: 'Personal Care',
    description: "Help with washing, dressing, grooming and other daily personal tasks carried out in the client's own home.",
  },
  {
    key: 'live_in_care',
    label: 'Live-in Care',
    description: "A professional carer lives in the client's home, providing round-the-clock support and companionship.",
  },
  {
    key: 'dementia_care',
    label: 'Dementia Care',
    description: "Specialist home care for people living with Alzheimer's or other forms of dementia.",
  },
  {
    key: 'nursing_care',
    label: 'Nursing Care',
    description: 'Care delivered by qualified nurses for clients with complex or clinical health needs at home.',
  },
  {
    key: 'reablement_care',
    label: 'Reablement Care',
    description: 'Short-term intensive support to help clients regain independence after illness, surgery or a hospital stay.',
  },
  {
    key: 'palliative_care',
    label: 'Palliative Care',
    description: 'Compassionate end-of-life care provided at home, focusing on comfort, dignity, and pain management.',
  },
  {
    key: 'physiotherapy',
    label: 'Physiotherapy',
    description: 'Physiotherapy sessions delivered in the home to improve mobility, strength and independence.',
  },
  {
    key: 'occupational_therapy',
    label: 'Occupational Therapy',
    description: 'Home assessments and therapy to help clients manage daily activities and adapt their living environment.',
  },
]

const RATING_STYLES: Record<string, { pill: string; dot: string }> = {
  Outstanding:            { pill: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  Good:                   { pill: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500'  },
  'Requires Improvement': { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
  'Requires improvement': { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
  Inadequate:             { pill: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500'    },
  'Very Good':            { pill: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  Excellent:              { pill: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  Adequate:               { pill: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'  },
  Weak:                   { pill: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  Unsatisfactory:         { pill: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500'    },
}

function CqcBadge({ rating }: { rating: string | null }) {
  if (!rating) return null
  const style = RATING_STYLES[rating] ?? { pill: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      CQC: {rating}
    </span>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-sm font-medium text-stone-700">{rating.toFixed(1)}</span>
    </div>
  )
}

function ProviderCard({ home }: { home: CareHome }) {
  const topServices = ['personal_care', 'live_in_care', 'dementia_care', 'nursing_care', 'reablement_care']
    .filter(s => (home as unknown as Record<string, string>)[s] === 'Yes')
    .slice(0, 3)

  return (
    <Link
      href={`/care-homes/${home.place_id}`}
      className={`group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all ${
        home.is_partner
          ? 'border-2 border-teal-300 hover:border-teal-400'
          : 'border border-stone-200 hover:border-teal-200'
      }`}
    >
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
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
            <svg className="w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}
        {home.is_partner && (
          <div className="absolute top-3 left-3">
            <span className="bg-teal-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
              ★ Featured
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-stone-900 group-hover:text-teal-600 transition-colors leading-snug line-clamp-2">
            {home.name}
          </h3>
          <StarRating rating={home.rating} />
        </div>

        <p className="text-sm text-stone-500 mb-3">
          {[home.city, home.county].filter(Boolean).join(', ')}
          {home.postal_code ? ` · ${home.postal_code}` : ''}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <CqcBadge rating={home.cqc_rating} />
          {topServices.map(s => (
            <span key={s} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
              {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          ))}
          {home.image_count > 0 && (
            <span className="text-xs bg-stone-50 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full">
              📸 {home.image_count} photos
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function HomeCareSearchContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [homes, setHomes] = useState<CareHome[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const cityParam    = params.get('city') ?? ''
  const serviceParam = params.get('service') ?? ''

  const [cityInput, setCityInput] = useState(cityParam)
  const [services, setServices]   = useState<string[]>(serviceParam ? [serviceParam] : [])

  const PAGE_SIZE = 24

  const fetchHomes = useCallback(async (pageNum: number) => {
    setLoading(true)

    let q = supabase
      .from('care_homes')
      .select('*', { count: 'exact' })
      .eq('service_type', 'domiciliary')
      .order('is_partner', { ascending: false, nullsFirst: false })
      .order('rating',     { ascending: false, nullsFirst: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (cityParam) {
      q = q.or(
        `name.ilike.%${cityParam}%,city.ilike.%${cityParam}%,county.ilike.%${cityParam}%,address.ilike.%${cityParam}%`
      )
    }
    for (const svc of services) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = (q as any).eq(svc, 'Yes')
    }
    if (serviceParam && !services.includes(serviceParam)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = (q as any).eq(serviceParam, 'Yes')
    }

    const { data, count, error } = await q
    if (!error && data) {
      setHomes(data as CareHome[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [cityParam, services, serviceParam])

  useEffect(() => {
    setPage(0)
    fetchHomes(0)
  }, [fetchHomes])

  function applyFilters() {
    const p = new URLSearchParams()
    if (cityInput.trim()) p.set('city', cityInput.trim())
    if (services.length === 1) p.set('service', services[0])
    router.push(`/home-care/search?${p.toString()}`)
  }

  function toggleService(key: string) {
    setServices(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchHomes(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Logo size="sm" />

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                placeholder="Town or city..."
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <button
              onClick={applyFilters}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm text-stone-500">
            <Link href="/" className="hover:text-teal-600 transition-colors">Care Homes</Link>
            <Link href="/home-care" className="text-teal-600 font-medium">Care at Home</Link>
          </nav>
        </div>
      </header>

      {/* Residential care crosslink banner */}
      <div className="bg-rose-50 border-b border-rose-100 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-rose-800">
            <span className="font-medium">Looking for a care home instead?</span>
            {' '}Browse 4,200+ residential care homes across the UK.
          </p>
          <Link
            href="/search"
            className="shrink-0 text-sm font-medium text-rose-700 hover:text-rose-900 underline underline-offset-2 transition-colors"
          >
            Browse care homes →
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 flex gap-6">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sticky top-24">
            <h2 className="font-semibold text-stone-900 mb-4">Filters</h2>

            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Services</p>
              {SERVICE_FILTERS.map(svc => (
                <div key={svc.key}>
                  <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={services.includes(svc.key)}
                      onChange={() => toggleService(svc.key)}
                      className="accent-teal-600 rounded"
                    />
                    <span className="text-sm text-stone-700 group-hover:text-teal-600 transition-colors">{svc.label}</span>
                  </label>
                  {services.includes(svc.key) && (
                    <p className="ml-5 mb-1 text-xs text-stone-500 leading-relaxed bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2">
                      {svc.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={applyFilters}
              className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-stone-900">
                {cityParam
                  ? `Home care providers near ${cityParam}`
                  : 'All home care providers'}
              </h1>
              <p className="text-sm text-stone-500">
                {loading ? 'Searching...' : `${total.toLocaleString()} results`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-stone-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-3/4" />
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : homes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏡</div>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">No providers found</h2>
              <p className="text-stone-500 text-sm">Try a different town, city or adjust your filters.</p>
              <Link href="/home-care/search" className="mt-4 inline-block text-teal-600 hover:underline text-sm">
                Browse all home care providers
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homes.map(home => (
                  <ProviderCard key={home.place_id} home={home} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    className="px-3 py-2 rounded-lg border border-stone-200 text-sm disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-2 rounded-lg border border-stone-200 text-sm disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function HomeCareSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-stone-400">Loading...</div></div>}>
      <HomeCareSearchContent />
    </Suspense>
  )
}
