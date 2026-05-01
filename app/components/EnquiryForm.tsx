'use client'

import { useState } from 'react'

interface Props {
  placeId:  string
  homeName: string
  homeCity: string | null
}

const CARE_TYPES = [
  'Residential Care',
  'Nursing Care',
  'Dementia Care',
  'Respite Care',
  'Palliative Care',
  'Not sure yet',
]

const BUDGETS = [
  'Up to £800 / week',
  '£800 – £1,200 / week',
  '£1,200 – £1,600 / week',
  '£1,600+ / week',
  'Not sure yet',
]

const TIMINGS = [
  'Urgently (within 2 weeks)',
  'Within 1 month',
  'Within 3 months',
  'Just researching',
]

export default function EnquiryForm({ placeId, homeName, homeCity }: Props) {
  const [open,    setOpen]    = useState(false)
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [form,    setForm]    = useState({
    name: '', email: '', phone: '',
    care_type: '', budget_range: '', timing: '', message: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/enquire', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          place_id:  placeId,
          home_name: homeName,
          home_city: homeCity,
          ...form,
        }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors mt-2"
      >
        Make an Enquiry
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-stone-100">
              <div>
                <h2 className="font-bold text-stone-900 text-lg">Make an Enquiry</h2>
                <p className="text-sm text-stone-500 mt-0.5">{homeName}{homeCity ? `, ${homeCity}` : ''}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors ml-4 mt-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Success state */}
            {status === 'success' ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-stone-900 text-lg mb-2">Enquiry Sent!</h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  Thank you. We&apos;ll be in touch within one business day with information
                  on availability and costs at {homeName}.
                </p>
                <button
                  onClick={() => { setOpen(false); setStatus('idle') }}
                  className="mt-6 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Your name <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Phone <span className="text-stone-400">(optional)</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="07700 000000"
                      className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Email address <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50"
                  />
                </div>

                {/* Care type + Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Care type needed</label>
                    <select
                      value={form.care_type}
                      onChange={e => set('care_type', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50"
                    >
                      <option value="">Select…</option>
                      {CARE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Weekly budget</label>
                    <select
                      value={form.budget_range}
                      onChange={e => set('budget_range', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50"
                    >
                      <option value="">Select…</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">When is care needed?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIMINGS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('timing', t)}
                        className={`text-xs px-3 py-2 rounded-lg border text-left transition-colors ${
                          form.timing === t
                            ? 'bg-rose-50 border-rose-400 text-rose-700 font-medium'
                            : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-stone-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Message <span className="text-stone-400">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Any specific requirements or questions…"
                    className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-stone-50 resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    Something went wrong — please try again or call the home directly.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  {status === 'sending' ? 'Sending…' : 'Send Enquiry'}
                </button>

                <p className="text-xs text-stone-400 text-center">
                  We typically respond within one business day.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
