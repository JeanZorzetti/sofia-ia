import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sofiaia.roilabs.com.br'

  const posts = getAllPosts()

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    // Home
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    // International — ES (Latam)
    { url: `${baseUrl}/es`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/es/precios`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // International — EN
    { url: `${baseUrl}/en`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.95 },
    // Marketing — produto
    { url: `${baseUrl}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/features/orchestrations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/comparativo`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/preco`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/como-funciona`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/templates`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    // Integrações
    { url: `${baseUrl}/integrations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/integrations/zapier`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/integrations/make`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/integrations/n8n`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // Empresa
    { url: `${baseUrl}/sobre`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/enterprise`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/whitelabel`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/parceiros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/afiliados`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/beta`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // Comunidade
    { url: `${baseUrl}/comunidade`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/early-access`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    // Conteúdo
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/changelog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    // Docs
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/docs/api`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/docs/getting-started`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/docs/plugins`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/docs/agent-to-agent`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/documentacao`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/api-reference`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/self-hosted`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    // Contato
    { url: `${baseUrl}/contato`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/status`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    // Legal — datas estáticas (raramente mudam)
    { url: `${baseUrl}/termos`, lastModified: new Date('2025-06-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacidade`, lastModified: new Date('2025-06-01'), changeFrequency: 'yearly', priority: 0.3 },
    // /login excluído: bloqueado em robots.txt — não deve aparecer no sitemap
    ...blogEntries,
  ]
}
