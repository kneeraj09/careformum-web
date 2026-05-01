import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Care Homes for Elderly Women',
  description:
    'Search 4,000+ UK care homes for elderly women by town, city or county. Filter by women-only, dementia care, nursing care, and specialist services.',
  alternates: {
    canonical: 'https://www.careformum.com/search',
  },
  openGraph: {
    title: 'Search Care Homes for Elderly Women | Careformum',
    description:
      'Find the right care home for elderly women near you. Search by location and filter by women-only, dementia care, nursing care, and more.',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
