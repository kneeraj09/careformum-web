'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/components/Logo'

const POPULAR_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol',
  'Sheffield', 'Liverpool', 'Nottingham', 'Leicester', 'Coventry',
]

function cityToSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, '-')
}

export default function HomeCareHomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/home-care/search?city=${encodeURIComponent(query.trim())}`)
  }

  function quickSearch(city: string) {
    router.push(`/home-care/in/${cityToSlug(city)}`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6 text-sm text-stone-600">
            <Link href="/" className="hover:text-teal-600 transition-colors">Care Homes</Link>
            <Link href="/home-care" className="text-teal-600 font-medium">Care at Home</Link>
            <Link href="/home-care/search" className="hover:text-teal-600 transition-colors">Browse All</Link>
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

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-teal-50 via-white to-cyan-50 py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-teal-100 text-teal-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
              Find CQC-Rated Home Care Near You
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">
              Care at Home<br />
              <span className="text-teal-600">Across the UK</span>
            </h1>
            <p className="text-lg text-stone-600 mb-10 max-w-xl mx-auto">
              Search hundreds of CQC-registered home care providers — personal care,
              live-in care, dementia support and more, delivered in the comfort of
              your own home.
            </p>

            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-4 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter your town or city..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-stone-900 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                Find Providers
              </button>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-2 items-center">
              <span className="text-sm text-stone-500">Popular:</span>
              {POPULAR_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => quickSearch(city)}
                  className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* What is home care */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 text-center mb-10">
              Types of Care at Home
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: '🏡',
                  title: 'Personal Care',
                  desc: 'Help with washing, dressing, grooming and medication, delivered in the client\'s own home by a trained carer — usually for a few hours each day.',
                },
                {
                  icon: '🛏️',
                  title: 'Live-in Care',
                  desc: 'A professional carer lives in your home full-time, providing 24-hour support and companionship — the closest alternative to a care home.',
                },
                {
                  icon: '🧠',
                  title: 'Dementia Care',
                  desc: 'Specialist carers trained in dementia support, helping people with Alzheimer\'s or other forms of dementia to remain safely at home for longer.',
                },
                {
                  icon: '🔄',
                  title: 'Reablement',
                  desc: 'Short-term intensive support after a hospital stay or illness, focused on rebuilding independence and confidence in everyday tasks.',
                },
                {
                  icon: '💊',
                  title: 'Nursing Care',
                  desc: 'Qualified nurses visiting the home to manage complex health conditions, wound care, catheter care or medication administration.',
                },
                {
                  icon: '🤝',
                  title: 'Companionship',
                  desc: 'Regular visits from a carer primarily for social engagement — conversation, outings, light housekeeping — reducing isolation and loneliness.',
                },
                {
                  icon: '🕊️',
                  title: 'Palliative Care',
                  desc: 'End-of-life care delivered at home, focusing on comfort, dignity and pain management so people can spend their final weeks with family.',
                },
                {
                  icon: '🧰',
                  title: 'Occupational Therapy',
                  desc: 'Home assessments and practical support to adapt the living environment and help with daily tasks, maintaining independence for longer.',
                },
              ].map(item => (
                <div key={item.title} className="text-center p-6 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-semibold text-stone-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why choose home care */}
        <section className="py-16 px-6 bg-stone-50">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 mb-4">
                  Why Choose Care at Home?
                </h2>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Most people prefer to remain in their own home as they get older —
                  surrounded by familiar surroundings, belongings and routines. Home care
                  makes this possible, whether a few hours of support each week or full
                  live-in care.
                </p>
                <ul className="space-y-3 text-sm text-stone-700">
                  {[
                    'One-to-one care tailored entirely to the individual',
                    'No need to leave a familiar home environment',
                    'Flexible — scale hours up or down as needs change',
                    'Often more cost-effective than a residential care home',
                    'Loved ones can visit freely at any time',
                    'Pets can stay at home',
                  ].map(point => (
                    <li key={point} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Providers Listed', value: '500+' },
                  { label: 'CQC Rated Good+', value: 'Filter by rating' },
                  { label: 'Live-in Care', value: 'Available UK-wide' },
                  { label: 'Free to Search', value: 'No referral fees' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
                    <div className="text-lg font-bold text-teal-600 mb-1">{stat.value}</div>
                    <div className="text-xs text-stone-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Browse by city */}
        <section className="py-14 px-6 bg-white border-t border-stone-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 text-center mb-2">
              Browse Home Care by City
            </h2>
            <p className="text-stone-500 text-sm text-center mb-8">
              Find CQC-registered home care providers in your area
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'London','Birmingham','Manchester','Leeds','Bristol','Liverpool',
                'Nottingham','Sheffield','Leicester','Glasgow','Edinburgh','Cardiff',
                'Southampton','Coventry','Norwich','Preston','Oxford','Cambridge',
                'York','Plymouth','Exeter','Belfast','Aberdeen','Swansea',
              ].map(city => (
                <Link
                  key={city}
                  href={`/home-care/in/${cityToSlug(city)}`}
                  className="text-sm bg-stone-50 border border-stone-200 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 text-stone-700 px-4 py-2 rounded-full transition-colors"
                >
                  {city}
                </Link>
              ))}
              <Link
                href="/home-care/search"
                className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-full transition-colors font-medium"
              >
                All providers →
              </Link>
            </div>
          </div>
        </section>

        {/* CQC info */}
        <section className="py-12 px-6 bg-stone-50 border-t border-stone-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-bold text-stone-900 mb-4">
              What to Look for in a Home Care Provider
            </h2>
            <div className="grid md:grid-cols-3 gap-5 text-left mt-8">
              {[
                {
                  title: 'CQC Registration',
                  desc: 'All home care providers in England must be registered with the Care Quality Commission (CQC). Check their rating — Good or Outstanding is a strong indicator of quality.',
                },
                {
                  title: 'Continuity of Carers',
                  desc: 'Ask whether you\'ll have a small, consistent team of carers rather than a different person each visit. Continuity matters enormously for wellbeing and trust.',
                },
                {
                  title: 'Training & Specialist Skills',
                  desc: 'If specialist care is needed — dementia, Parkinson\'s, end-of-life — ask specifically about carer training. Good agencies will be able to evidence this clearly.',
                },
              ].map(item => (
                <div key={item.title} className="bg-white rounded-xl border border-stone-200 p-5">
                  <h3 className="font-semibold text-stone-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* SEO text */}
      <section className="py-12 px-6 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            The UK&apos;s Care at Home Directory
          </h2>
          <p className="text-stone-600 leading-relaxed text-sm">
            Careformum lists hundreds of CQC-registered home care providers across
            England, Scotland and Wales. Whether you need a few hours of personal care
            each week, specialist dementia support, or full-time live-in care,
            our directory helps you find and compare providers in your area.
            Every listing shows the provider&apos;s CQC rating, the services they offer,
            and contact details so you can enquire directly — no referral fees, no
            gatekeeping.
          </p>
        </div>
      </section>

      <footer className="bg-stone-900 text-stone-400 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <Logo size="sm" linkTo="/" />
          <p>© {new Date().getFullYear()} Careformum.com · UK Care Home Directory</p>
        </div>
      </footer>
    </div>
  )
}
