import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const updates = [
    { version: 'v2.4', label: 'Google OAuth + Afiliados', color: '59,130,246' },
    { version: 'v2.3', label: 'Webhooks de Output', color: '168,85,247' },
    { version: 'v2.2', label: 'Billing & Planos', color: '16,185,129' },
    { version: 'v2.1', label: 'Blog & SEO', color: '245,158,11' },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-60px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '40px 60px', gap: '10px' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}
          >✦</div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>Sofia AI</span>
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex', flex: 1, padding: '0 60px',
            alignItems: 'center', gap: '60px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px', borderRadius: '100px',
                border: '1px solid rgba(59,130,246,0.35)',
                background: 'rgba(59,130,246,0.08)',
                fontSize: '13px', color: '#93c5fd', width: 'fit-content',
              }}
            >
              📋 Changelog
            </div>
            <div
              style={{
                fontSize: '58px', fontWeight: '800', color: '#ffffff',
                lineHeight: '1.1', letterSpacing: '-2px',
              }}
            >
              Novidades{'\n'}
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                do Sofia AI
              </span>
            </div>
            <div
              style={{
                fontSize: '19px', color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5', maxWidth: '500px',
              }}
            >
              Acompanhe todas as novas features, melhorias e correções da plataforma.
            </div>
          </div>

          {/* Right — changelog list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '310px', flexShrink: 0 }}>
            {updates.map((u) => (
              <div
                key={u.version}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span
                  style={{
                    fontSize: '12px', fontWeight: '700', fontFamily: 'monospace',
                    padding: '3px 8px', borderRadius: '6px',
                    background: `rgba(${u.color},0.15)`,
                    border: `1px solid rgba(${u.color},0.3)`,
                    color: `rgb(${u.color})`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.version}
                </span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>{u.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '22px 60px', borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br/changelog</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>Atualizado semanalmente</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
