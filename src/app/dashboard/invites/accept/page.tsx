'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

interface InviteDetails {
  orgName: string
  orgSlug: string
  role: string
  invitedBy: string
  email: string
  expiresAt: string
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Token de convite invalido')
      setLoading(false)
      return
    }

    fetch(`/api/organizations/invites/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvite(data.data)
        } else {
          setError(data.error || 'Convite invalido ou expirado')
        }
      })
      .catch(() => setError('Erro ao carregar convite'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError('')
    try {
      const res = await fetch('/api/organizations/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) {
        setAccepted(true)
        setTimeout(() => {
          router.push('/dashboard/settings/team')
        }, 2000)
      } else if (res.status === 401) {
        // Not logged in - redirect to login with callback
        router.push(`/login?redirect=/dashboard/invites/accept?token=${token}`)
      } else {
        setError(data.error || 'Erro ao aceitar convite')
      }
    } catch {
      setError('Erro ao aceitar convite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando convite...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {accepted ? 'Convite Aceito!' : error ? 'Convite Invalido' : 'Convite de Organizacao'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {accepted && (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <p className="text-zinc-300">
                Voce agora e membro de <strong className="text-white">{invite?.orgName}</strong>.
              </p>
              <p className="text-zinc-500 text-sm">Redirecionando para o dashboard...</p>
            </div>
          )}

          {error && !accepted && (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-zinc-400">{error}</p>
              <Link href="/dashboard">
                <Button variant="outline">Ir para o Dashboard</Button>
              </Link>
            </div>
          )}

          {invite && !accepted && !error && (
            <>
              <div className="space-y-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Organizacao</span>
                  <span className="text-sm font-medium text-zinc-200">{invite.orgName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Sua funcao</span>
                  <Badge className="bg-purple-500/20 text-purple-300">
                    {ROLE_LABELS[invite.role] || invite.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Convidado por</span>
                  <span className="text-sm text-zinc-200">{invite.invitedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Expira em</span>
                  <span className="text-sm text-zinc-200">
                    {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aceitando...
                  </>
                ) : (
                  'Aceitar Convite'
                )}
              </Button>

              <p className="text-xs text-center text-zinc-500">
                Ao aceitar, voce tera acesso ao workspace da organizacao como{' '}
                <strong>{ROLE_LABELS[invite.role] || invite.role}</strong>.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
