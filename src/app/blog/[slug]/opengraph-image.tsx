import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/blog'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  const title = post?.title ?? 'Blog Sofia AI'
  const description = post?.description ?? 'Artigos sobre orquestração de agentes IA e automação'
  const author = post?.author ?? 'Sofia AI'
  const date = post?.date ? new Date(post.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const tag = post?.tags?.[0] ?? 'IA'

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
        {/* Gradient glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            left: '-60px',
            width: '500px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '100px',
            width: '400px',
            height: '300px',
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Top bar — brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '36px 60px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              ✦
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
              Sofia AI
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>•</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Blog</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: '100px',
              border: '1px solid rgba(59,130,246,0.35)',
              background: 'rgba(59,130,246,0.1)',
              fontSize: '13px',
              color: '#93c5fd',
            }}
          >
            {tag}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '10px 60px 0',
            justifyContent: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? '44px' : '52px',
              fontWeight: '800',
              color: '#ffffff',
              lineHeight: '1.15',
              letterSpacing: '-1.5px',
              maxWidth: '950px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: '1.5',
              maxWidth: '800px',
            }}
          >
            {description.length > 140 ? description.slice(0, 140) + '…' : description}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 60px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#fff',
                fontWeight: '600',
              }}
            >
              {author.charAt(0)}
            </div>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              {author}
            </span>
            {date && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>•</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>{date}</span>
              </>
            )}
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
            sofiaia.roilabs.com.br/blog
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
