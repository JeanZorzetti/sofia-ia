'use client'

import { useEffect, useRef } from 'react'

export default function ApiDocsPage() {
  const swaggerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load Swagger UI
    const loadSwaggerUI = async () => {
      // Import Swagger UI CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'
      document.head.appendChild(link)

      // Import Swagger UI Bundle
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js'
      script.async = true
      script.onload = () => {
        // @ts-ignore
        if (window.SwaggerUIBundle && swaggerContainerRef.current) {
          // @ts-ignore
          window.SwaggerUIBundle({
            url: '/openapi.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              // @ts-ignore
              window.SwaggerUIBundle.presets.apis,
              // @ts-ignore
              window.SwaggerUIStandalonePreset
            ],
            layout: 'BaseLayout',
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            docExpansion: 'list',
            filter: true,
            syntaxHighlight: {
              activate: true,
              theme: 'monokai'
            }
          })
        }
      }
      document.body.appendChild(script)

      // Import Swagger UI Standalone Preset
      const presetScript = document.createElement('script')
      presetScript.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js'
      presetScript.async = true
      document.body.appendChild(presetScript)
    }

    loadSwaggerUI()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            ROI Labs Platform API
          </h1>
          <p className="text-gray-400">
            Documentação completa da API pública para integração com agentes de IA,
            automações e analytics
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div
          id="swagger-ui"
          ref={swaggerContainerRef}
          className="bg-white rounded-lg shadow-lg"
        />
      </div>


    </div>
  )
}
