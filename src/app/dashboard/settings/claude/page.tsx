'use client'

// 011-byos — cadastrar/rotacionar/remover o token da assinatura Claude do usuário.
// O valor nunca volta do servidor: a tela só mostra a máscara + timestamps.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound, ShieldAlert, CheckCircle2, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Metadata =
  | { configured: false }
  | { configured: true; mask: string; createdAt: string; lastVerifiedAt: string; lastUsedAt: string | null }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

export default function ClaudeTokenSettingsPage() {
  const [meta, setMeta] = useState<Metadata | null>(null)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = () =>
    fetch('/api/settings/claude-token')
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => setMeta({ configured: false }))

  useEffect(() => {
    load()
  }, [])

  const configured = meta?.configured === true

  async function save() {
    setError(null)
    setSuccess(null)
    if (!token.trim()) {
      setError('Cole o token antes de salvar.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/claude-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 400 invalid_format · 422 token_rejected/token_rate_limited · 503 verification_unavailable
        setError(data?.message ?? 'Não foi possível salvar o token.')
        return
      }
      setToken('')
      setSuccess(configured ? 'Token rotacionado com sucesso.' : 'Token cadastrado e verificado.')
      setMeta(data)
    } catch {
      setError('Erro de rede ao salvar o token.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Remover o token da sua assinatura Claude? Seus runs voltarão a usar o pool da plataforma.')) return
    setError(null)
    setSuccess(null)
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/claude-token', { method: 'DELETE' })
      if (!res.ok && res.status !== 404) {
        setError('Não foi possível remover o token.')
        return
      }
      setSuccess('Token removido.')
      setMeta({ configured: false })
    } catch {
      setError('Erro de rede ao remover o token.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Configurações
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          Assinatura Claude
        </h1>
        <p className="text-zinc-400 mt-1">
          Rode seus times com a sua própria assinatura Claude. Sem token cadastrado, seus runs usam o pool da plataforma.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {configured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" /> Token ativo
              </>
            ) : (
              'Nenhum token cadastrado'
            )}
          </CardTitle>
          <CardDescription>
            {configured
              ? 'Seus runs usam a sua assinatura. O valor é write-only: não é possível exibi-lo de novo.'
              : 'Cadastre um token para passar a rodar com a sua assinatura.'}
          </CardDescription>
        </CardHeader>
        {configured && meta.configured && (
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Token</div>
              <code className="text-zinc-200">{meta.mask}</code>
            </div>
            <div>
              <div className="text-zinc-500">Cadastrado em</div>
              <div className="text-zinc-200">{fmt(meta.createdAt)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Última verificação</div>
              <div className="text-zinc-200">{fmt(meta.lastVerifiedAt)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Último uso em run</div>
              <div className="text-zinc-200">{fmt(meta.lastUsedAt)}</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como gerar o token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-300">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tenha o Claude Code CLI instalado e uma assinatura Claude ativa.</li>
            <li>
              No terminal, rode <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-green-300">claude setup-token</code>.
            </li>
            <li>Faça login no navegador quando pedido e copie o token gerado (começa com <code className="bg-zinc-800 px-1.5 py-0.5 rounded">sk-ant-oat</code>).</li>
            <li>Cole abaixo e salve — verificamos o token na hora.</li>
          </ol>
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Trate o token como uma senha: ele dá acesso à sua conta Claude. Nunca o compartilhe.</span>
          </div>
        </CardContent>
      </Card>

      {/* Cadastrar / rotacionar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{configured ? 'Rotacionar token' : 'Cadastrar token'}</CardTitle>
          <CardDescription>
            {configured ? 'Colar um novo token substitui o atual (verificado antes de trocar).' : 'O token é verificado e criptografado antes de salvar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sk-ant-oat01-..."
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {configured ? 'Rotacionar' : 'Salvar e verificar'}
            </button>
            {configured && (
              <button
                onClick={remove}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remover
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
