'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquarePlus, X, CheckCircle, Loader2 } from 'lucide-react'

/**
 * Widget flutuante de feedback para beta testers.
 * Renderizado condicionalmente apenas para usuários com isBetaTester=true.
 */
interface BetaFeedbackWidgetProps {
  /** Passado pelo layout quando user.isBetaTester === true */
  isBetaTester: boolean
}

export default function BetaFeedbackWidget({ isBetaTester }: BetaFeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isBetaTester) return null

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) return
    setLoading(true)
    try {
      const res = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          category,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      if (res.ok) {
        setSent(true)
        setTimeout(() => {
          setSent(false)
          setOpen(false)
          setMessage('')
          setCategory('general')
        }, 2000)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-card border shadow-xl rounded-2xl p-5 w-80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Enviar Feedback</p>
              <p className="text-xs text-muted-foreground">Beta Tester — obrigado por ajudar!</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center py-4 gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Feedback enviado! Obrigado.</p>
            </div>
          ) : (
            <>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Feedback geral</SelectItem>
                  <SelectItem value="bug">Bug / Erro</SelectItem>
                  <SelectItem value="feature">Sugestao de feature</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="O que voce achou? O que poderia melhorar?"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
                maxLength={1000}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{message.length}/1000</span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={loading || message.trim().length < 5}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <Button
        size="sm"
        className="rounded-full shadow-lg h-12 px-4 gap-2"
        onClick={() => setOpen(o => !o)}
        title="Enviar feedback beta"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="text-sm">Feedback</span>
      </Button>
    </div>
  )
}
