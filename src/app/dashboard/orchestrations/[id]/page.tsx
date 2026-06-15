import { redirect } from 'next/navigation'

// Orquestrações foi descontinuada na UI do dashboard; Teams é o sucessor.
export default function OrchestrationDetailRedirect() {
  redirect('/dashboard/teams')
}
