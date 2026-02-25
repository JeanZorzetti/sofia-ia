'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  retry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Ocorreu um erro inesperado. Tente novamente.',
  retry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-foreground-tertiary max-w-sm mb-6">{description}</p>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm border border-white/20 rounded-xl hover:bg-white/5 transition-colors text-white"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Tentar novamente
        </button>
      )}
    </div>
  )
}
