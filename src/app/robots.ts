import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow public pages, block private routes
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/login', '/cadastro', '/onboarding']
      },
      // Allow all LLM crawlers to access public content (GEO optimization)
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/dashboard/', '/api/']
      }
    ],
    sitemap: 'https://sofiaia.roilabs.com.br/sitemap.xml'
  }
}
