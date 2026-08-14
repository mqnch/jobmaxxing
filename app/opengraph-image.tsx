import { ImageResponse } from 'next/og'
import { site } from '@/lib/site'

export const alt = site.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: '#fafafa',
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.04em',
          }}
        >
          <span>{site.domain}</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>❄️</span>
            <span>☀️</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: '-0.06em',
              lineHeight: 1.05,
            }}
          >
            {site.title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              color: '#475569',
              lineHeight: 1.35,
              maxWidth: 860,
            }}
          >
            Browse internships. Track applications. Stop living in a spreadsheet.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {['Summer internships', 'Winter internships', 'Application tracker'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: 22,
                fontWeight: 600,
                color: '#334155',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
