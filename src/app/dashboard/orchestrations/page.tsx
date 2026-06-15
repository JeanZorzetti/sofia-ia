import { redirect } from 'next/navigation'

// Orquestrações foi descontinuada na UI do dashboard; Teams é o sucessor.
// A engine (API /api/orchestrations, webhooks, scheduling, templates) segue ativa.
export default function OrchestrationsRedirect() {
  redirect('/dashboard/teams')
}
