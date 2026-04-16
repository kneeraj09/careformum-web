'use client'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-stone-900 mb-2">Something went wrong</h2>
      <p className="text-stone-500 text-sm mb-6 max-w-sm">
        We couldn&apos;t load the search results. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
