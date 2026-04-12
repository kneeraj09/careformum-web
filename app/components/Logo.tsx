'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
}

export default function Logo({ size = 'md', linkTo = '/' }: LogoProps) {
  const iconDims = { sm: 32, md: 40, lg: 56 }[size]
  const textSize = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl' }[size]
  const dotSize  = { sm: 'text-xs',  md: 'text-sm', lg: 'text-base' }[size]

  const content = (
    <div className="flex items-center gap-2">
      {/* Circular icon — just the mum character */}
      <div style={{ width: iconDims, height: iconDims }} className="relative shrink-0">
        <Image
          src="/images/logo-icon.png"
          alt="Careformum"
          width={iconDims}
          height={iconDims}
          className="object-contain rounded-full"
        />
      </div>

      {/* Brand name */}
      <div className="leading-none">
        <div
          className={`font-extrabold tracking-wide ${textSize}`}
          style={{ color: '#5b9ea0', letterSpacing: '0.05em' }}
        >
          CAREFORMUM
        </div>
        <div
          className={`font-semibold ${dotSize}`}
          style={{ color: '#5b9ea0', letterSpacing: '0.12em' }}
        >
          .COM
        </div>
      </div>
    </div>
  )

  if (!linkTo) return content

  return (
    <Link href={linkTo} className="hover:opacity-90 transition-opacity">
      {content}
    </Link>
  )
}
