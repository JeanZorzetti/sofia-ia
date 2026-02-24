import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
            top: '-100px',
            right: '-100px',
            width: '700px',
            height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.13) 0%, transparent 65%)',
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
                border: '1px solid rgba(168,85,247,0.4)',
                background: 'rgba(168,85,247,0.08)',
                fontSize: '13px', color: '#c4b5fd', alignSelf: 'flex-start',
              }}
            >
              🏷️ White-label
            </div>
            <div
              style={{
                fontSize: '58px', fontWeight: '800', color: '#ffffff',
                lineHeight: '1.1', letterSpacing: '-2px',
              }}
            >
              Sua marca.{'\n'}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Nossa tecnologia.
              </span>
            </div>
            <div
              style={{
                fontSize: '19px', color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5', maxWidth: '580px',
              }}
            >
              Plataforma de agentes IA completa com o nome, logo e domínio da sua agência ou empresa.
            </div>
          </div>

          {/* Right — feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px', flexShrink: 0 }}>
            {[
              'Domínio personalizado',
              'Logo e cores da marca',
              'Painel de clientes',
              'Revenue share',
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ fontSize: '16px', color: '#a78bfa' }}>✓</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>{item}</span>
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
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br/whitelabel</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>Para agências e revendas</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
