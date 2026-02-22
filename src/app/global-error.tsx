'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Report to Sentry when DSN is configured; otherwise log to console
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            Sentry.captureException(error)
        } else {
            console.error('[Sofia Global Error]', error)
        }
    }, [error])

    return (
        <html lang="pt-BR">
            <body className="bg-[#0a0a0f] text-white">
                <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold">Algo deu errado</h1>
                        <p className="max-w-md text-center text-sm text-gray-400">
                            Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
                        </p>
                        {error.digest && (
                            <p className="text-xs text-gray-500">
                                Codigo: {error.digest}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={reset}
                            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/20"
                        >
                            Tentar novamente
                        </button>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-700"
                        >
                            Voltar ao Dashboard
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
