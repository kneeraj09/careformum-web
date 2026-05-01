'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from './components/Logo'

const POPULAR_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol',
  'Sheffield', 'Edinburgh', 'Liverpool', 'Cardiff', 'Newcastle',
]

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [gender, setGender] = useState<'all' | 'women' | 'mixed'>('all')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams({ city: query.trim() })
    if (gender !== 'all') params.set('gender', gender)
    router.push(`/search?${params.toString()}`)
  }

  function quickSearch(city: string) {
    const params = new URLSearchParams({ city })
    if (gender !== 'all') params.set('gender', gender)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6 text-sm text-stone-600">
            <Link href="/search" className="hover:text-rose-600 transition-colors">Browse All</Link>
            <Link href="/search?gender=women" className="hover:text-rose-600 transition-colors">Women&apos;s Care</Link>
            <Link href="/home-care" className="hover:text-teal-600 transition-colors">Care at Home</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="bg-gradient-to-br from-rose-50 via-white to-amber-50 py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-rose-100 text-rose-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
              4,200+ Care Homes Across the UK
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">
              Care Homes for Elderly Women<br />
              <span className="text-rose-600">Across the UK</span>
            </h1>
            <p className="text-lg text-stone-600 mb-10 max-w-xl mx-auto">
              Search 4,000+ care homes by location and specialist services — including
              women-only, women-friendly, and mixed homes with elderly care, dementia
              support, and nursing care.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-4 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter town or city..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-stone-900 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>

              {/* Gender filter */}
              <div className="flex rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
                {(['all', 'women', 'mixed'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      gender === g
                        ? 'bg-rose-600 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {g === 'all' ? 'All' : g === 'women' ? "Women's" : 'Mixed'}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                Search
              </button>
            </form>

            {/* Popular cities */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 items-center">
              <span className="text-sm text-stone-500">Popular:</span>
              {POPULAR_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => quickSearch(city)}
                  className="text-sm text-rose-600 hover:text-rose-800 hover:underline transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">
              Why Use Careformum?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: '🔍',
                  title: 'Detailed Service Profiles',
                  desc: 'Every care home is enriched with 29 service categories — from dementia care to en-suite rooms and funding options.',
                },
                {
                  icon: '♀',
                  title: 'Women-Focused Filters',
                  desc: "Easily find women-only or women-friendly care homes — a unique filter not available on other directories.",
                },
                {
                  icon: '⭐',
                  title: 'Trusted Ratings',
                  desc: 'See Google user reviews alongside official care inspectorate scores — CQC in England, Care Inspectorate in Scotland, and CIW in Wales — so you can confidently choose the right home.',
                },
                {
                  icon: '📸',
                  title: 'Real Photos',
                  desc: 'AI-verified photos showing actual care home facilities, gardens, dining rooms and more — no stock imagery.',
                },
              ].map(f => (
                <div key={f.title} className="text-center p-6 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-stone-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browse by city */}
        <section className="py-14 px-6 bg-white border-t border-stone-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">
              Browse Care Homes by City
            </h2>
            <p className="text-stone-500 text-sm text-center mb-8">Find care homes in your area across the UK</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'London','Birmingham','Manchester','Leeds','Bristol','Liverpool',
                'Nottingham','Sheffield','Leicester','Glasgow','Edinburgh','Cardiff',
                'Southampton','Coventry','Norwich','Preston','Oxford','Cambridge',
                'York','Plymouth','Exeter','Belfast','Aberdeen','Swansea',
              ].map(city => (
                <Link
                  key={city}
                  href={`/care-homes/in/${city.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm bg-stone-50 border border-stone-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-stone-700 px-4 py-2 rounded-full transition-colors"
                >
                  {city}
                </Link>
              ))}
              <Link
                href="/search"
                className="text-sm bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full transition-colors font-medium"
              >
                All cities →
              </Link>
            </div>
          </div>
        </section>

        {/* Care at Home promo */}
        <section className="py-14 px-6 bg-teal-50 border-t border-teal-100">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <span className="inline-block bg-teal-100 text-teal-700 text-xs font-medium px-3 py-1 rounded-full mb-3">
                New Section
              </span>
              <h2 className="text-2xl font-bold text-stone-900 mb-3">
                Looking for Care at Home?
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-5 max-w-md">
                We also list CQC-rated home care providers across the UK — personal care,
                live-in care, dementia support and more, delivered in the comfort of
                your own home.
              </p>
              <Link
                href="/home-care"
                className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Find Home Care Providers →
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-end">
              {['Personal Care','Live-in Care','Dementia Care','Reablement','Nursing at Home','Palliative Care'].map(type => (
                <span key={type} className="bg-white border border-teal-200 text-teal-700 text-sm px-4 py-2 rounded-full">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Browse by type */}
        <section className="py-16 px-6 bg-stone-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">
              Browse by Care Type
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Women's Care", href: '/search?gender=women', color: 'bg-rose-50 border-rose-200 text-rose-700' },
                { label: 'Dementia Care', href: '/search?service=dementia_care', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                { label: 'Nursing Care', href: '/search?service=nursing_care', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Residential Care', href: '/search?service=residential_care', color: 'bg-green-50 border-green-200 text-green-700' },
                { label: 'Respite Care', href: '/search?service=respite_care', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Palliative Care', href: '/search?service=palliative_care', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                { label: 'Day Care', href: '/search?service=day_care', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                { label: 'Live-in Care', href: '/search?service=live_in_care', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`border rounded-xl px-4 py-5 text-center font-medium text-sm hover:shadow-md transition-shadow ${item.color}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Key considerations */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-stone-900 mb-3">
                What to Look for in a Care Home for Elderly Women
              </h2>
              <p className="text-stone-500 max-w-2xl mx-auto text-sm leading-relaxed">
                Choosing the right care home is one of the most important decisions a
                family will make. Here are the key things to consider — and questions
                worth asking on your visit.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: '🏥',
                  title: 'Level of Care Needed',
                  desc: 'Match the home to current and likely future needs — residential, nursing, or specialist dementia care. The best homes can adapt as needs increase, avoiding a disruptive move later.',
                },
                {
                  icon: '♀',
                  title: "Women-Only or Mixed",
                  desc: "Consider whether a women-only environment matters for dignity, privacy, or personal care preferences. Many women also prefer female staff for washing and dressing.",
                },
                {
                  icon: '⭐',
                  title: 'Inspection Ratings',
                  desc: "Always check the latest CQC (England), Care Inspectorate (Scotland), or CIW (Wales) report. Read the inspector's narrative, not just the headline score.",
                },
                {
                  icon: '📍',
                  title: 'Location & Visiting',
                  desc: 'A home within easy reach of family encourages regular visits, which significantly improves wellbeing. Check transport links for visitors without a car.',
                },
                {
                  icon: '👩‍⚕️',
                  title: 'Staffing & Continuity',
                  desc: 'Ask about staff-to-resident ratios and staff turnover. Residents benefit greatly from having a named key worker who knows their history, routines, and preferences.',
                },
                {
                  icon: '🍽️',
                  title: 'Daily Life & Activities',
                  desc: 'Look for varied activities, outdoor spaces, and nutritious food. Ask whether cultural, dietary, or religious requirements — including Halal or vegetarian meals — can be accommodated.',
                },
                {
                  icon: '💰',
                  title: 'Costs & Funding',
                  desc: 'Understand exactly what the weekly fee includes and what costs extra. Ask whether the home accepts local authority funding and what happens if personal savings are depleted.',
                },
                {
                  icon: '🛡️',
                  title: 'Dignity & Safeguarding',
                  desc: 'Ask how the home handles complaints and safeguarding concerns. For women with past trauma or vulnerability, the culture and values of a home matter as much as its clinical ratings.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="bg-stone-50 rounded-2xl p-5 border border-stone-100 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* About / SEO content */}
      <section className="py-12 px-6 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            The UK&apos;s Care Home Directory for Elderly Women
          </h2>
          <p className="text-stone-600 leading-relaxed text-sm">
            Careformum is the only UK care home directory built specifically to help
            families find the right care home for elderly women. Whether you are
            looking for a women-only care home, a home with specialist dementia care
            for older women, or a mixed residential home with a strong track record of
            female-focused care — we make the search straightforward. Browse over
            4,200 care homes across England, Scotland, and Wales, each with verified
            photos, Google ratings, and official inspection scores from the CQC, Care
            Inspectorate, and CIW.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <Logo size="sm" linkTo="/" />
          <p>© {new Date().getFullYear()} Careformum.com · UK Care Home Directory.</p>
        </div>
      </footer>
    </div>
  )
}
