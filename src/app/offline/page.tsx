import Link from 'next/link'

export const metadata = {
  title: 'Sem conexão — Sofia AI',
  description: 'Você está offline. Verifique sua conexão com a internet.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-8">
        <svg
          className="w-12 h-12 text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.288 3.818A10.5 10.5 0 0121.5 12a10.46 10.46 0 01-1.284 5.012M3.5 12a10.5 10.5 0 0015.7-7.5M12 6v.01M6.834 6.834A7.5 7.5 0 004.5 12M12 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">
        Você está offline
      </h1>

      <p className="text-white/60 max-w-md mb-2">
        Não foi possível conectar ao servidor da Sofia AI.
        Verifique sua conexão com a internet e tente novamente.
      </p>

      <p className="text-white/40 text-sm mb-8">
        Algumas páginas podem estar disponíveis no cache do seu dispositivo.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Tentar novamente
        </button>

        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
        >
          Ir para o Dashboard
        </Link>
      </div>

      {/* Status info */}
      <div className="mt-12 p-4 rounded-xl bg-white/5 border border-white/10 max-w-sm">
        <p className="text-xs text-white/40 font-medium mb-2">Status da conexao</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <p className="text-xs text-white/60">Sem conexão com a internet</p>
        </div>
      </div>

      {/* Branding */}
      <div className="mt-8">
        <p className="text-white/20 text-sm">
          Sofia AI — Plataforma de Orquestração de Agentes IA
        </p>
      </div>
    </div>
  )
}
