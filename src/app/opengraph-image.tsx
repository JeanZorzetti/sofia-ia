import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#0A0A0F', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-100px', left: '200px', width: '800px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '400px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '40px 60px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>S</span>
          </div>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.5px' }}>Sofia AI</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)' }}>
            <span style={{ fontSize: '14px', color: '#93c5fd' }}>Plataforma de Orquestração de Agentes IA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '64px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1', letterSpacing: '-2px' }}>Crie Equipes de</span>
            <span style={{ fontSize: '64px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-2px', background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', backgroundClip: 'text', color: 'transparent' }}>Agentes IA</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5', textAlign: 'center' }}>Orquestrações visuais, Knowledge Base com RAG, multi-modelo. Self-hosted.</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 60px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br</span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>Free</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>Pro</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>Business</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
