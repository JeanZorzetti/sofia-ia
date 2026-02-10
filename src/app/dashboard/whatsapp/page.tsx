'use client'

import { useState } from 'react'
import { useWhatsAppInstances, useWhatsAppStats } from '@/hooks/use-sofia-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog'
import { MessageSquare, Plus, QrCode, RefreshCw, Trash2, Smartphone, CheckCircle, Loader2 } from 'lucide-react'

export default function WhatsAppPage() {
  const { instances, loading, createInstance, deleteInstance, restartInstance, getQRCode } = useWhatsAppInstances()
  const { stats, loading: statsLoading } = useWhatsAppStats()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [qrCodeDialog, setQrCodeDialog] = useState<{ open: boolean; qrCode: string | null; instanceName: string }>({
    open: false,
    qrCode: null,
    instanceName: ''
  })

  const [creating, setCreating] = useState(false)

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return
    setCreating(true)
    try {
      const result = await createInstance(newInstanceName, '')
      if (result.success) {
        setNewInstanceName('')
        setIsCreateDialogOpen(false)
      } else {
        alert(`Erro ao criar instância: ${result.error || 'Erro desconhecido'}`)
      }
    } catch (err) {
      alert(`Erro de conexão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setCreating(false)
    }
  }

  const handleShowQRCode = async (instanceId: string, instanceName: string) => {
    const result = await getQRCode(instanceId)
    if (result.success && result.qrCode) {
      setQrCodeDialog({ open: true, qrCode: result.qrCode, instanceName })
    }
  }

  const handleDeleteInstance = async (instanceId: string) => {
    if (confirm('Tem certeza que deseja excluir esta instância?')) {
      await deleteInstance(instanceId)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'disconnected':
        return 'bg-red-500'
      case 'connecting':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado'
      case 'disconnected':
        return 'Desconectado'
      case 'connecting':
        return 'Conectando'
      default:
        return 'Desconhecido'
    }
  }

  const statsData = [
    {
      title: 'Total de Instâncias',
      value: stats?.total_instances || 0,
      icon: Smartphone,
      color: 'text-blue-400'
    },
    {
      title: 'Conectadas',
      value: stats?.connected_instances || 0,
      icon: CheckCircle,
      color: 'text-green-400'
    },
    {
      title: 'Mensagens Hoje',
      value: stats?.messages_today || 0,
      icon: MessageSquare,
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp</h1>
          <p className="text-white/60 mt-1">Gerenciamento de instâncias</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="button-luxury">
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/95 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Nova Instância</DialogTitle>
              <DialogDescription className="text-white/60">
                Digite um nome para identificar esta instância do WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="instance-name" className="text-white/80">
                  Nome da Instância
                </Label>
                <Input
                  id="instance-name"
                  placeholder="Ex: Atendimento Principal"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="button-luxury" onClick={handleCreateInstance} disabled={creating || !newInstanceName.trim()}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {stat.value}
                    </p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances?.map((instance: any) => (
            <Card key={instance.id} className="glass-card hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg">
                      {instance.name}
                    </CardTitle>
                    {instance.phone_number && (
                      <p className="text-sm text-white/60 mt-1">
                        {instance.phone_number}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={instance.status === 'connected' ? 'default' : 'secondary'}
                    className={`${getStatusColor(instance.status)} text-white border-0`}
                  >
                    {getStatusLabel(instance.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShowQRCode(instance.id, instance.name)}
                    disabled={instance.status === 'connected'}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restartInstance(instance.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteInstance(instance.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={qrCodeDialog.open} onOpenChange={(open) => setQrCodeDialog({ ...qrCodeDialog, open })}>
        <DialogContent className="bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">QR Code - {qrCodeDialog.instanceName}</DialogTitle>
            <DialogDescription className="text-white/60">
              Escaneie este QR Code com o WhatsApp do seu celular
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrCodeDialog.qrCode ? (
              <img
                src={qrCodeDialog.qrCode}
                alt="QR Code"
                className="max-w-full h-auto rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 w-64 bg-white/5 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrCodeDialog({ open: false, qrCode: null, instanceName: '' })}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
