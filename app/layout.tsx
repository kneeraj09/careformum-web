import type { Metadata } from 'next'
import './globals.css'
import HomeJsonLd from './HomeJsonLd'
import { GoogleAnalytics } from '@next/third-parties/google'

const SITE_URL = 'https://www.careformum.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Careformum — Find Care Homes for Women in the UK',
    template: '%s | Careformum',
  },
  description:
    'Search 4,000+ UK care homes by location. Filter by women-only, dementia care, nursing care, and more. Find the right care home for your loved one.',
  keywords: [
    'care homes UK',
    'women only care home',
    'elderly care homes',
    'nursing homes UK',
    'dementia care homes',
    'care home directory',
    'residential care UK',
    'women care home near me',
  ],
  authors: [{ name: 'Careformum', url: SITE_URL }],
  creator: 'Careformum',
  publisher: 'Careformum',
  verification: {
    google: 'LbPLosPZpQaPSlQEt6_nwwB-NUyOCTdkHAbDvJkD130',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: 'Careformum',
    title: 'Careformum — Find Care Homes for Women in the UK',
    description:
      'Search 4,000+ UK care homes by location. Filter by women-only, dementia care, nursing care, and more.',
    images: [
      {
        url: '/images/logo.png',
        width: 600,
        height: 400,
        alt: 'Careformum — UK Care Home Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careformum — Find Care Homes for Women in the UK',
    description:
      'Search 4,000+ UK care homes by location. Filter by women-only, dementia care, nursing care, and more.',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/images/logo-icon.png',
    shortcut: '/images/logo-icon.png',
    apple: '/images/logo-icon.png',
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        <HomeJsonLd />
        {children}
      </body>
      <GoogleAnalytics gaId="G-4991F0KGLD" />
    </html>
  )
}
