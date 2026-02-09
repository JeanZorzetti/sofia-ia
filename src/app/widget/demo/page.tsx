'use client'

import { ChatWidget } from '@/components/widget/ChatWidget'

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Demo do Chat Widget
          </h1>
          <p className="text-gray-600 mb-6">
            Esta é uma demonstração do widget de chat embeddable da ROI Labs.
            O widget pode ser integrado em qualquer site e conectado a um agente de IA.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Como usar
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Clique no botão de chat no canto inferior direito</li>
              <li>Digite sua mensagem e pressione Enter ou clique em Enviar</li>
              <li>O agente de IA responderá automaticamente</li>
              <li>Use os botões de minimizar ou fechar para controlar o widget</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Código de integração
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Para integrar o widget no seu site, adicione o seguinte código:
            </p>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto text-xs">
{`<!-- ROI Labs Chat Widget -->
<script>
  window.roiLabsConfig = {
    agentId: '00000000-0000-0000-0000-000000000001',
    apiUrl: 'https://sofiaia.roilabs.com.br/api/chat/widget',
    primaryColor: '#3b82f6',
    position: 'bottom-right',
    title: 'Atendimento',
    subtitle: 'Estamos online'
  };
</script>
<script src="https://sofiaia.roilabs.com.br/widget.js"></script>`}
            </pre>
          </div>
        </div>
      </div>

      {/* Widget component */}
      <ChatWidget
        agentId="00000000-0000-0000-0000-000000000001"
        primaryColor="#3b82f6"
        position="bottom-right"
        title="Atendimento ROI Labs"
        subtitle="Estamos online"
        welcomeMessage="Olá! Sou a Sofia, assistente virtual da ROI Labs. Como posso ajudar você hoje?"
        placeholder="Digite sua mensagem..."
      />
    </div>
  )
}
