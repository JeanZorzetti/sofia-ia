import { withAuth } from '@/lib/with-auth'
import { apiOk } from '@/lib/api-response'
import { getSquadQueueState } from '@/lib/companies/squad-queue'

export const GET = withAuth(async () => {
  const state = await getSquadQueueState()
  return apiOk(state)
})
