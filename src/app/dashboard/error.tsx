'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Sofia Dashboard Error]', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-foreground">
                        Erro ao carregar a página
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        {error.message || 'Ocorreu um erro inesperado. Tente novamente ou volte ao Dashboard.'}
                    </p>
                </div>
                {error.digest && (
                    <p className="text-xs text-muted-foreground/50">
                        Ref: {error.digest}
                    </p>
                )}
            </div>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent"
                >
                    <RefreshCw className="h-4 w-4" />
                    Tentar novamente
                </button>
                <a
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                    <Home className="h-4 w-4" />
                    Dashboard
                </a>
            </div>
        </div>
    )
}
