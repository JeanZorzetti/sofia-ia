import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#0A0A0F', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-100px', left: '30%', width: '600px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.13) 0%, transparent 65%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '40px 60px', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>S</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>Sofia AI</span>
        </div>

        <div style={{ display: 'flex', flex: 1, padding: '0 60px', gap: '60px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.08)', alignSelf: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#c4b5fd' }}>Templates Prontos</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '56px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1', letterSpacing: '-2px' }}>Comece em</span>
              <span style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-2px', background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', backgroundClip: 'text', color: 'transparent' }}>Minutos</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ fontSize: '19px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', maxWidth: '480px' }}>Orquestracoes pre-configuradas para 10+ verticais de negocio. Sem programar.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '320px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Marketing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Suporte</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Pesquisa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Juridico</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>RH</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', width: '145px' }}>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Financas</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 60px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br/templates</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>10+ templates - Gratis para usar</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
