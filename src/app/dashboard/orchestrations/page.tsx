'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useOrchestrations, EMPTY_FORM, type OrchestrationForm } from '@/components/dashboard/orchestrations/useOrchestrations'
import { OrchestrationsHeader } from '@/components/dashboard/orchestrations/OrchestrationsHeader'
import { OrchestrationsStats } from '@/components/dashboard/orchestrations/OrchestrationsStats'
import { OrchestrationCard } from '@/components/dashboard/orchestrations/OrchestrationCard'
import { OrchestrationsEmptyState } from '@/components/dashboard/orchestrations/OrchestrationsEmptyState'
import { TemplatePickerDialog } from '@/components/dashboard/orchestrations/TemplatePickerDialog'
import { CreateOrchestrationDialog } from '@/components/dashboard/orchestrations/CreateOrchestrationDialog'
import { AIGeneratorDialog } from '@/components/dashboard/orchestrations/AIGeneratorDialog'

export default function OrchestrationsPage() {
  const {
    orchestrations,
    agents,
    templates,
    loading,
    creatingFromTemplate,
    aiLoading,
    aiCreating,
    aiSuggestion,
    setAiSuggestion,
    handleCreateFromTemplate,
    handleCreateOrchestration,
    handleAiGenerate,
    handleCreateFromAi,
    handleDeleteOrchestration,
    router,
  } = useOrchestrations()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [form, setForm] = useState<OrchestrationForm>(EMPTY_FORM)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <OrchestrationsHeader
        onHistoryClick={() => router.push('/dashboard/orchestrations/history')}
        onTemplateClick={() => setTemplateDialogOpen(true)}
        onAIClick={() => {
          setAiSuggestion(null)
          setAiDescription('')
          setAiDialogOpen(true)
        }}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      <OrchestrationsStats orchestrations={orchestrations} />

      {orchestrations.length === 0 ? (
        <OrchestrationsEmptyState
          templates={templates}
          creatingFromTemplate={creatingFromTemplate}
          onCreateFromTemplate={handleCreateFromTemplate}
          onManualCreate={() => setCreateDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orchestrations.map((orchestration) => (
            <OrchestrationCard
              key={orchestration.id}
              orchestration={orchestration}
              onView={(id) => router.push(`/dashboard/orchestrations/${id}`)}
              onDelete={handleDeleteOrchestration}
            />
          ))}
        </div>
      )}

      <TemplatePickerDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        creatingFromTemplate={creatingFromTemplate}
        onCreateFromTemplate={async (id) => {
          await handleCreateFromTemplate(id)
          setTemplateDialogOpen(false)
        }}
      />

      <AIGeneratorDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        aiDescription={aiDescription}
        onDescriptionChange={setAiDescription}
        aiLoading={aiLoading}
        aiCreating={aiCreating}
        aiSuggestion={aiSuggestion}
        onGenerate={() => handleAiGenerate(aiDescription)}
        onRegenerate={() => setAiSuggestion(null)}
        onCreateFromAi={async () => {
          if (!aiSuggestion) return
          const id = await handleCreateFromAi(aiSuggestion)
          if (id) {
            setAiDialogOpen(false)
            setAiDescription('')
            setAiSuggestion(null)
            router.push(`/dashboard/orchestrations/${id}`)
          }
        }}
      />

      <CreateOrchestrationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        agents={agents}
        form={form}
        onFormChange={setForm}
        onSubmit={async () => {
          const ok = await handleCreateOrchestration(form)
          if (ok) {
            setCreateDialogOpen(false)
            setForm(EMPTY_FORM)
          }
        }}
      />
    </div>
  )
}
