import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Care Homes',
  description:
    'Search 4,000+ UK care homes by town, city or county. Filter by women-only, dementia care, nursing care, and specialist services.',
  alternates: {
    canonical: 'https://www.careformum.com/search',
  },
  openGraph: {
    title: 'Search Care Homes | Careformum',
    description:
      'Find the right care home near you. Search by location and filter by women-only, dementia care, nursing care, and more.',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
