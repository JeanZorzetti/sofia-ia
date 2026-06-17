'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useWhatsAppAccounts, type WabaAccountView } from '@/hooks/use-polaris-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Plus, Trash2, CheckCircle, Loader2, ShieldCheck } from 'lucide-react'

// ── Tipos mínimos do Facebook JS SDK (Embedded Signup) ────────────────────────
interface FbAuthResponse {
  code?: string
}
interface FbLoginResponse {
  authResponse?: FbAuthResponse
}
interface FbSdk {
  init(params: Record<string, unknown>): void
  login(cb: (response: FbLoginResponse) => void, params: Record<string, unknown>): void
}
declare global {
  interface Window {
    FB?: FbSdk
    fbAsyncInit?: () => void
  }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ''
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ''
const GRAPH_VERSION = 'v21.0'

export default function WhatsAppPage() {
  const { accounts, loading, connect, disconnect } = useWhatsAppAccounts()
  const [sdkReady, setSdkReady] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const sessionInfo = useRef<{ wabaId?: string; phoneNumberId?: string }>({})

  // Captura o session info (waba_id, phone_number_id) emitido pelo popup do Embedded Signup
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data) {
          sessionInfo.current = {
            wabaId: data.data.waba_id,
            phoneNumberId: data.data.phone_number_id,
          }
        }
      } catch {
        /* ignora mensagens não-JSON */
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function initSdk() {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION })
      setSdkReady(true)
    }
    if (window.FB) {
      window.FB.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION })
      setSdkReady(true)
    }
  }

  function launchSignup() {
    if (!window.FB) {
      alert('SDK do Facebook ainda não carregou. Tente novamente em instantes.')
      return
    }
    setConnecting(true)
    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code
        const { wabaId, phoneNumberId } = sessionInfo.current
        if (!code || !wabaId || !phoneNumberId) {
          setConnecting(false)
          alert('Conexão cancelada ou incompleta.')
          return
        }
        const result = await connect({ code, wabaId, phoneNumberId })
        setConnecting(false)
        if (!result.success) alert(`Erro ao conectar: ${result.error}`)
      },
      {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      }
    )
  }

  const connected = accounts.filter((a) => a.status === 'connected').length

  const statsData = [
    { title: 'Números Conectados', value: connected, icon: CheckCircle, color: 'text-green-400' },
    { title: 'Total de Números', value: accounts.length, icon: MessageSquare, color: 'text-blue-400' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initSdk}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp</h1>
          <p className="text-white/60 mt-1">Números conectados via API oficial da Meta (WABA)</p>
        </div>
        <Button
          className="button-luxury"
          onClick={launchSignup}
          disabled={connecting || !sdkReady || !APP_ID || !CONFIG_ID}
        >
          {connecting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Conectando...</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" />Conectar WhatsApp</>
          )}
        </Button>
      </div>

      {(!APP_ID || !CONFIG_ID) && (
        <Card className="glass-card border-yellow-500/30">
          <CardContent className="pt-6 text-sm text-yellow-300/90">
            Configure <code>NEXT_PUBLIC_META_APP_ID</code> e <code>NEXT_PUBLIC_META_CONFIG_ID</code> no
            ambiente para habilitar o Embedded Signup (ver docs/Wpp/ENV-VARS.md).
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <Icon className={`h-12 w-12 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-center text-white/60">
            Nenhum número conectado. Clique em “Conectar WhatsApp” para vincular um número via Meta.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account: WabaAccountView) => (
            <Card key={account.id} className="glass-card hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      {account.verifiedName || account.displayPhoneNumber || account.phoneNumberId}
                    </CardTitle>
                    {account.displayPhoneNumber && (
                      <p className="text-sm text-white/60 mt-1">{account.displayPhoneNumber}</p>
                    )}
                  </div>
                  <Badge
                    className={`${account.status === 'connected' ? 'bg-green-500' : 'bg-gray-500'} text-white border-0`}
                  >
                    {account.status === 'connected' ? 'Conectado' : account.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Desconectar este número?')) await disconnect(account.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Desconectar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
