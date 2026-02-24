'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Org {
  id: string
  name: string
  slug: string
  plan: string
  role: string
  memberCount?: number
  createdAt: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-zinc-500/20 text-zinc-300',
  pro: 'bg-blue-500/20 text-blue-300',
  business: 'bg-purple-500/20 text-purple-300',
}

export default function OrganizationSettingsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations')
      const data = await res.json()
      if (data.success) {
        setOrgs(data.data)
        if (data.data.length > 0) {
          setSelectedOrg(data.data[0])
          setEditName(data.data[0].name)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  const handleSave = async () => {
    if (!selectedOrg || !editName.trim()) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Nome atualizado com sucesso')
        setSelectedOrg({ ...selectedOrg, name: editName.trim() })
        loadOrgs()
      } else {
        setError(data.error || 'Erro ao salvar')
      }
    } catch {
      setError('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOrg || deleteConfirm !== selectedOrg.slug) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.slug}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeleteOpen(false)
        setDeleteConfirm('')
        setSelectedOrg(null)
        loadOrgs()
      } else {
        setError(data.error || 'Erro ao deletar')
      }
    } catch {
      setError('Erro ao deletar')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Configuracoes da Organizacao
        </h1>
        <p className="text-zinc-400 mt-1">Gerencie as informacoes e configuracoes da organizacao</p>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Building2 className="h-10 w-10 text-zinc-500" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300">Nenhuma organizacao</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Crie uma organizacao na aba Gestao de Equipe.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {orgs.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Organizacao:</span>
              <Select
                value={selectedOrg?.slug || ''}
                onValueChange={(slug) => {
                  const org = orgs.find((o) => o.slug === slug)
                  if (org) {
                    setSelectedOrg(org)
                    setEditName(org.name)
                    setMessage('')
                    setError('')
                  }
                }}
              >
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.slug} value={org.slug}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedOrg && (
            <>
              {/* General Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informacoes Gerais</CardTitle>
                  <CardDescription>Atualize o nome da organizacao</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Organizacao</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={selectedOrg.role !== 'ADMIN'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input
                      value={selectedOrg.slug}
                      disabled
                      className="opacity-60"
                    />
                    <p className="text-xs text-zinc-500">O slug nao pode ser alterado apos a criacao.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <Label>Plano Atual</Label>
                      <div className="mt-1">
                        <Badge className={PLAN_COLORS[selectedOrg.plan] || PLAN_COLORS.free}>
                          {PLAN_LABELS[selectedOrg.plan] || selectedOrg.plan}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Criada em</Label>
                      <p className="text-sm text-zinc-400 mt-1">
                        {new Date(selectedOrg.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {message && <p className="text-sm text-green-400">{message}</p>}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {selectedOrg.role === 'ADMIN' && (
                    <Button onClick={handleSave} disabled={saving || editName === selectedOrg.name}>
                      {saving ? 'Salvando...' : 'Salvar Alteracoes'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Danger Zone */}
              {selectedOrg.role === 'ADMIN' && (
                <Card className="border-red-500/30">
                  <CardHeader>
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Zona de Perigo
                    </CardTitle>
                    <CardDescription>
                      Acoes irreversiveis. Prossiga com cautela.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Deletar Organizacao</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Remove permanentemente a organizacao, todos os membros e convites.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Deletar Organizacao</DialogTitle>
            <DialogDescription>
              Esta acao e irreversivel. Todos os membros e convites serao removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Para confirmar, digite o slug da organizacao:{' '}
              <strong className="text-zinc-200">{selectedOrg?.slug}</strong>
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={selectedOrg?.slug}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirm !== selectedOrg?.slug}
            >
              {deleting ? 'Deletando...' : 'Confirmar Exclusao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
