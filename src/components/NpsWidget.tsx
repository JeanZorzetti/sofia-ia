'use client'

import { useEffect, useState, useCallback } from 'react'

const NPS_STORAGE_KEY = 'nps_shown'
const NPS_EXECUTION_COUNT_KEY = 'nps_execution_count'
const NPS_TRIGGER_THRESHOLD = 3

/**
 * NpsWidget — floating NPS survey shown after the user's 3rd orchestration execution.
 *
 * Usage: Mount once in your layout (e.g., DashboardLayout) and the widget manages
 * its own visibility via localStorage.
 *
 * Call `NpsWidget.registerExecution()` (static helper) from the execution flow,
 * or simply pass `executionCount` prop directly.
 */
export default function NpsWidget({ executionCount }: { executionCount?: number } = {}) {
  const [visible, setVisible] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Don't show if already shown/dismissed
    const alreadyShown = localStorage.getItem(NPS_STORAGE_KEY)
    if (alreadyShown) return

    // Check execution count from prop or localStorage
    let count = executionCount ?? 0
    if (executionCount === undefined) {
      const stored = localStorage.getItem(NPS_EXECUTION_COUNT_KEY)
      count = stored ? parseInt(stored, 10) : 0
    }

    if (count >= NPS_TRIGGER_THRESHOLD) {
      // Small delay so it doesn't pop immediately
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [executionCount])

  const dismiss = useCallback(() => {
    localStorage.setItem(NPS_STORAGE_KEY, 'dismissed')
    setVisible(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (score === null) return
    setSubmitting(true)
    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      })
      localStorage.setItem(NPS_STORAGE_KEY, 'submitted')
      setSubmitted(true)
      setTimeout(() => setVisible(false), 2500)
    } catch {
      // Silent — never break UX over analytics
      localStorage.setItem(NPS_STORAGE_KEY, 'submitted')
      setSubmitted(true)
      setTimeout(() => setVisible(false), 2500)
    } finally {
      setSubmitting(false)
    }
  }, [score, comment])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-5 animate-in slide-in-from-bottom-4 duration-300">
      {submitted ? (
        <div className="text-center py-4">
          <p className="text-2xl mb-2">Obrigado pelo feedback!</p>
          <p className="text-sm text-gray-500">Sua opiniao e muito importante para nos.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Voce recomendaria a Sofia?</p>
              <p className="text-xs text-gray-500 mt-0.5">0 = nada provavel, 10 = com certeza</p>
            </div>
            <button
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
              aria-label="Fechar"
            >
              x
            </button>
          </div>

          {/* Score selector */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  score === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
            rows={2}
            placeholder="Comentario opcional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Agora nao
            </button>
            <button
              onClick={handleSubmit}
              disabled={score === null || submitting}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Call this function each time an orchestration execution completes on the client side.
 * The widget will show automatically once the threshold is reached.
 */
export function registerOrchestrationExecution(): void {
  try {
    const alreadyShown = localStorage.getItem(NPS_STORAGE_KEY)
    if (alreadyShown) return

    const stored = localStorage.getItem(NPS_EXECUTION_COUNT_KEY)
    const current = stored ? parseInt(stored, 10) : 0
    localStorage.setItem(NPS_EXECUTION_COUNT_KEY, String(current + 1))
  } catch {
    // localStorage not available (SSR / private mode)
  }
}
