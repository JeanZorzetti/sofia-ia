// src/app/dashboard/teams/[id]/page.tsx
import TeamRunView from './TeamRunView'

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeamRunView teamId={id} />
}
