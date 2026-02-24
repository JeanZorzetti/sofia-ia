'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Trash2, Shield, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    createdAt: string
  }
}

interface Invite {
  id: string
  email: string
  role: string
  invitedBy: string
  expiresAt: string
  createdAt: string
}

interface Org {
  id: string
  name: string
  slug: string
  plan: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  MEMBER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  VIEWER: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

export default function TeamPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [newOrgOpen, setNewOrgOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [error, setError] = useState('')

  const loadOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations')
      const data = await res.json()
      if (data.success) {
        setOrgs(data.data)
        if (data.data.length > 0 && !selectedOrg) {
          setSelectedOrg(data.data[0])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrg])

  const loadMembers = useCallback(async () => {
    if (!selectedOrg) return
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/organizations/${selectedOrg.slug}/members`),
        fetch(`/api/organizations/${selectedOrg.slug}/invites`),
      ])
      const [membersData, invitesData] = await Promise.all([membersRes.json(), invitesRes.json()])
      if (membersData.success) setMembers(membersData.data)
      if (invitesData.success) setInvites(invitesData.data)
    } catch (err) {
      console.error(err)
    }
  }, [selectedOrg])

  useEffect(() => {
    loadOrgs()
  }, [loadOrgs])

  useEffect(() => {
    if (selectedOrg) loadMembers()
  }, [selectedOrg, loadMembers])

  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail) return
    setInviting(true)
    setError('')
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.slug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteOpen(false)
        setInviteEmail('')
        setInviteRole('MEMBER')
        loadMembers()
      } else {
        setError(data.error || 'Erro ao enviar convite')
      }
    } catch {
      setError('Erro ao enviar convite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrg || !confirm('Remover este membro?')) return
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.slug}/members/${memberId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!selectedOrg) return
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.slug}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (data.success) loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgSlug) return
    setCreatingOrg(true)
    setError('')
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      })
      const data = await res.json()
      if (data.success) {
        setNewOrgOpen(false)
        setNewOrgName('')
        setNewOrgSlug('')
        loadOrgs()
      } else {
        setError(data.error || 'Erro ao criar organização')
      }
    } catch {
      setError('Erro ao criar organização')
    } finally {
      setCreatingOrg(false)
    }
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestao de Equipe
          </h1>
          <p className="text-zinc-400 mt-1">Gerencie membros e convites da sua organizacao</p>
        </div>
        <Dialog open={newOrgOpen} onOpenChange={setNewOrgOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              + Nova Organizacao
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Organizacao</DialogTitle>
              <DialogDescription>Crie um workspace colaborativo para sua equipe.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Minha Empresa"
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value)
                    setNewOrgSlug(generateSlug(e.target.value))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  placeholder="minha-empresa"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                />
                <p className="text-xs text-zinc-500">Apenas letras minusculas, numeros e hifens</p>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOrgOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrg} disabled={creatingOrg || !newOrgName || !newOrgSlug}>
                {creatingOrg ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Users className="h-10 w-10 text-zinc-500" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300">Nenhuma organizacao</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Crie uma organizacao para colaborar com sua equipe.
              </p>
            </div>
            <Button onClick={() => setNewOrgOpen(true)}>+ Criar Organizacao</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Org selector */}
          {orgs.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Organizacao:</span>
              <Select
                value={selectedOrg?.slug || ''}
                onValueChange={(slug) => setSelectedOrg(orgs.find((o) => o.slug === slug) || null)}
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
              {/* Members */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Membros</CardTitle>
                    <CardDescription>
                      {members.length} membro{members.length !== 1 ? 's' : ''} em {selectedOrg.name}
                    </CardDescription>
                  </div>
                  {selectedOrg.role === 'ADMIN' && (
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Convidar Membro
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Convidar Membro</DialogTitle>
                          <DialogDescription>
                            Envie um convite por email para adicionar alguem a sua organizacao.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              placeholder="email@empresa.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Funcao</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin — acesso total</SelectItem>
                                <SelectItem value="MEMBER">Membro — pode criar e editar</SelectItem>
                                <SelectItem value="VIEWER">Visualizador — somente leitura</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInviteOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                            {inviting ? 'Enviando...' : 'Enviar Convite'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {member.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{member.user.name}</p>
                            <p className="text-xs text-zinc-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_COLORS[member.role] || ROLE_COLORS.VIEWER}>
                            {ROLE_LABELS[member.role] || member.role}
                          </Badge>
                          {selectedOrg.role === 'ADMIN' && (
                            <div className="flex items-center gap-1">
                              <Select
                                value={member.role}
                                onValueChange={(role) => handleChangeRole(member.user.id, role)}
                              >
                                <SelectTrigger className="h-7 w-8 p-0 border-0 bg-transparent">
                                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                  <SelectItem value="MEMBER">Membro</SelectItem>
                                  <SelectItem value="VIEWER">Visualizador</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleRemoveMember(member.user.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Invites */}
              {selectedOrg.role === 'ADMIN' && invites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Convites Pendentes</CardTitle>
                    <CardDescription>{invites.length} convite{invites.length !== 1 ? 's' : ''} aguardando resposta</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center">
                              <Shield className="h-4 w-4 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-300">{invite.email}</p>
                              <p className="text-xs text-zinc-500">
                                Convidado por {invite.invitedBy} · Expira em{' '}
                                {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge className={ROLE_COLORS[invite.role] || ROLE_COLORS.VIEWER}>
                            {ROLE_LABELS[invite.role] || invite.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
