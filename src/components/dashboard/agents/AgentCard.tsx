'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Bot,
  MessageSquare,
  Mail,
  Globe,
  Settings,
  Trash2,
  GripVertical,
} from 'lucide-react'

interface AgentChannel {
  id: string
  channel: string
  isActive: boolean
}

export interface Agent {
  id: string
  name: string
  description: string | null
  status: string
  model: string
  folderId: string | null
  folder: { id: string; name: string; color: string } | null
  channels: AgentChannel[]
  creator: { id: string; name: string; email: string }
  createdAt: string
}

function getChannelIcon(channel: string) {
  if (channel === 'whatsapp') return <MessageSquare className="h-3.5 w-3.5" />
  if (channel === 'email') return <Mail className="h-3.5 w-3.5" />
  if (channel === 'webchat') return <Globe className="h-3.5 w-3.5" />
  return null
}

interface AgentCardProps {
  agent: Agent
  draggedAgentId: string | null
  onDragStart: (e: React.DragEvent, agentId: string) => void
  onDragEnd: () => void
  onToggleStatus: (agentId: string, currentStatus: string) => void
  onDelete: (agentId: string) => void
  onNavigate: (agentId: string) => void
}

export function AgentCard({
  agent,
  draggedAgentId,
  onDragStart,
  onDragEnd,
  onToggleStatus,
  onDelete,
  onNavigate,
}: AgentCardProps) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, agent.id)}
      onDragEnd={onDragEnd}
      className={`glass-card hover-scale cursor-grab active:cursor-grabbing transition-opacity ${
        draggedAgentId === agent.id ? 'opacity-40' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-white text-base truncate">{agent.name}</CardTitle>
              <p className="text-xs text-white/50 truncate">
                {agent.description || 'Sem descrição'}
              </p>
            </div>
          </div>
          <GripVertical className="h-4 w-4 text-white/20 shrink-0 mt-1" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {agent.channels.map((ch) => (
            <Badge
              key={ch.id}
              variant={ch.isActive ? 'default' : 'secondary'}
              className="flex items-center gap-1 text-xs"
            >
              {getChannelIcon(ch.channel)}
              {ch.channel}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <Badge
            variant={agent.status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {agent.status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onNavigate(agent.id)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Switch
              checked={agent.status === 'active'}
              onCheckedChange={() => onToggleStatus(agent.id, agent.status)}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
