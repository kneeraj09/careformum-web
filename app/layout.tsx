import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Careformum.com — Find Care Homes for Women in the UK',
  description:
    'Search thousands of UK care homes. Filter by location, gender focus, and specialist services including dementia care, nursing care, and more.',
  keywords: 'care homes, elderly care, women only care home, UK care home directory, nursing home',
  icons: {
    icon: '/images/logo-icon.png',
    apple: '/images/logo-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  )
}
