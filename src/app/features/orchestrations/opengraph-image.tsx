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
            top: '-80px',
            right: '-80px',
            width: '600px',
            height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.14) 0%, transparent 65%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '10%',
            width: '400px',
            height: '300px',
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, transparent 70%)',
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
            display: 'flex',
            flex: 1,
            padding: '0 60px',
            alignItems: 'center',
            gap: '60px',
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '100px',
                border: '1px solid rgba(59,130,246,0.35)',
                background: 'rgba(59,130,246,0.08)',
                fontSize: '13px',
                color: '#93c5fd',
                alignSelf: 'flex-start',
              }}
            >
              ⚡ Feature
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: '800',
                color: '#ffffff',
                lineHeight: '1.1',
                letterSpacing: '-2px',
              }}
            >
              Orquestrações{'\n'}
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                de Agentes IA
              </span>
            </div>
            <div
              style={{
                fontSize: '19px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5',
                maxWidth: '540px',
              }}
            >
              Crie pipelines visuais com múltiplos agentes IA trabalhando em sequência ou em paralelo.
            </div>
          </div>

          {/* Right — mini pipeline visual */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '260px',
              flexShrink: 0,
            }}
          >
            {['Pesquisador', 'Copywriter', 'Revisor'].map((name, i) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    width: '32px', height: '32px',
                    borderRadius: '8px',
                    background: `rgba(${i === 0 ? '59,130,246' : i === 1 ? '168,85,247' : '16,185,129'},0.2)`,
                    border: `1px solid rgba(${i === 0 ? '59,130,246' : i === 1 ? '168,85,247' : '16,185,129'},0.35)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  {i === 0 ? '🔍' : i === 1 ? '✍' : '✓'}
                </div>
                <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', fontWeight: '500' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '22px 60px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br/features/orchestrations</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>Multi-agente • Visual • Self-hosted</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
