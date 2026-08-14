'use client'

import { markCompanyLogoMissing, useCompanyLogo } from '@/lib/company-logos'

interface CompanyLogoProps {
  company: string
  season?: 'summer' | 'winter'
  className?: string
  size?: 'sm' | 'lg'
}

export default function CompanyLogo({ company, season, className = '', size = 'sm' }: CompanyLogoProps) {
  const { status, url } = useCompanyLogo(company)
  const emoji = season === 'winter' ? '❄️' : '☀️'
  const title = status === 'loaded' ? company : season === 'winter' ? 'Winter internship' : 'Summer internship'
  const boxClass = size === 'lg'
    ? 'w-12 self-stretch min-h-[3rem] text-lg'
    : 'w-9 h-9 text-base'

  return (
    <div
      className={`flex items-center justify-center rounded-none bg-slate-100 shrink-0 overflow-hidden ${boxClass} ${className}`}
      title={title}
    >
      {status === 'loaded' && url ? (
        <img
          src={url}
          alt=""
          className="w-full h-full object-contain p-1"
          onError={() => markCompanyLogoMissing(company)}
        />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
    </div>
  )
}
