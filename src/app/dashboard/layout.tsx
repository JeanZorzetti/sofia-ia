'use client'

import { useAuth } from '@/hooks/use-auth'
import { Navbar } from '@/components/sofia/Navbar'
import { Sidebar } from '@/components/sofia/Sidebar'
import { CommandPalette } from '@/components/ide/command-palette'
import { Breadcrumb } from '@/components/dashboard/breadcrumb'
import { TrialBanner } from '@/components/dashboard/trial-banner'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { UpgradeModal } from '@/components/dashboard/upgrade-modal'
import { Toaster } from 'sonner'

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-foreground-secondary">Carregando...</p>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={user} onLogout={logout} />
        <TrialBanner />
        <main className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <Breadcrumb />
          {children}
        </main>
      </div>
      <CommandPalette />
      <OnboardingChecklist />
      <UpgradeModal />
      <Toaster position="top-right" richColors />
    </div>
  )
}
