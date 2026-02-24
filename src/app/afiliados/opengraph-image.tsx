import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#0A0A0F', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '600px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 65%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '15%', width: '400px', height: '350px', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.1) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '40px 60px', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>S</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>Sofia AI</span>
        </div>

        <div style={{ display: 'flex', flex: 1, padding: '0 60px', alignItems: 'center', gap: '60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', alignSelf: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#6ee7b7' }}>Programa de Afiliados</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0px' }}>
                <span style={{ fontSize: '58px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1', letterSpacing: '-2px' }}>Indique e&nbsp;</span>
                <span style={{ fontSize: '58px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-2px', background: 'linear-gradient(90deg, #34d399, #60a5fa)', backgroundClip: 'text', color: 'transparent' }}>Ganhe</span>
              </div>
              <span style={{ fontSize: '58px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1', letterSpacing: '-2px' }}>ate 40%</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ fontSize: '19px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', maxWidth: '540px' }}>Comissao recorrente por cada indicacao. Quanto mais indicacoes, maior a comissao.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '240px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Starter</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>1-5 clientes</span>
              </div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa' }}>20%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Growth</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>6-20 clientes</span>
              </div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#a855f7' }}>30%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Elite</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>21+ clientes</span>
              </div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>40%</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 60px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>sofiaia.roilabs.com.br/afiliados</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>Comissao recorrente - Pagamento mensal</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
