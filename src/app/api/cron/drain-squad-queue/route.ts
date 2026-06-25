import { NextRequest } from 'next/server'
import { apiOk, apiError } from '@/lib/api-response'
import { dispatchSquadQueue } from '@/lib/companies/squad-queue'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return apiError('Unauthorized', 401)
  }
  await dispatchSquadQueue()
  return apiOk({ drained: true })
}
