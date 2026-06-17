// Phase 1 (Teams subordination): turn a content Team's run output into Threads
// campaign posts. Called as the startTeamRun `onComplete` hook from the campaign
// "Planejar com IA" route — same-process, no self-webhook. The coordinator stays
// INTACT: this only READS run.output (the lead's consolidated JSON of posts) and
// WRITES posts.
//
// Contract: the `threads-campaign` template instructs the lead to consolidate the
// final deliverable as a JSON array of { tema, angle, content }. run.output is that
// consolidation (team-coordinator finishes with conso.message). Parsing is tolerant
// of code fences and surrounding prose, and never throws.

const THREADS_MAX_CHARS = 500

export interface ParsedCampaignPost {
  tema: string
  angle?: string
  content: string
}

/** PURE — extract the posts array from the lead's consolidated output. Tolerant of
 *  ```json fences and stray prose; returns [] when nothing parseable is found. */
export function parseCampaignPosts(output: string | null | undefined): ParsedCampaignPost[] {
  if (!output || typeof output !== 'string') return []

  // Prefer a fenced ```json ... ``` block; fall back to the whole string.
  const fence = output.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : output

  // Grab the first top-level JSON array.
  const arrMatch = candidate.match(/\[[\s\S]*\]/)
  if (!arrMatch) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(arrMatch[0])
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const posts: ParsedCampaignPost[] = []
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const content = typeof o.content === 'string' ? o.content.trim()
      : typeof o.texto === 'string' ? (o.texto as string).trim()
      : typeof o.text === 'string' ? (o.text as string).trim()
      : ''
    if (!content) continue
    const tema = typeof o.tema === 'string' && o.tema.trim() ? o.tema.trim()
      : typeof o.theme === 'string' && (o.theme as string).trim() ? (o.theme as string).trim()
      : 'Post'
    const angle = typeof o.angle === 'string' && o.angle.trim() ? o.angle.trim() : undefined
    posts.push({ tema, angle, content: content.slice(0, THREADS_MAX_CHARS) })
  }
  return posts
}

/** PURE — evenly spread N posts across [start, end], avoiding the exact edges.
 *  Post i gets start + (i+1)/(count+1) of the window. Falls back to `start` if the
 *  window is degenerate. */
export function spreadSchedule(count: number, start: Date, end: Date): Date[] {
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (count <= 0) return []
  const span = endMs - startMs
  if (!(span > 0)) return Array.from({ length: count }, () => new Date(startMs))
  return Array.from({ length: count }, (_, i) => new Date(startMs + (span * (i + 1)) / (count + 1)))
}

export interface IngestResult {
  created: number
  reason?: string
}

/** BORDER — load the run + campaign, parse the output, and create one
 *  ThreadsScheduledPost (the publishable text, shown on the calendar) plus one
 *  ThreadsCampaignPost (the tema/angle slot, linked) per post. Best-effort:
 *  returns a result and never throws (it runs in the run's background context). */
export async function ingestCampaignRun(campaignId: string, runId: string): Promise<IngestResult> {
  const { prisma } = await import('@/lib/prisma')

  const run = await prisma.teamRun.findUnique({
    where: { id: runId },
    select: { status: true, output: true },
  })
  if (!run) return { created: 0, reason: 'run-not-found' }
  if (run.status !== 'completed') return { created: 0, reason: `run-status-${run.status}` }

  const campaign = await prisma.threadsCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, userId: true, startDate: true, endDate: true, _count: { select: { posts: true } } },
  })
  if (!campaign) return { created: 0, reason: 'campaign-not-found' }

  const posts = parseCampaignPosts(run.output)
  if (posts.length === 0) return { created: 0, reason: 'no-posts-parsed' }

  const schedule = spreadSchedule(posts.length, campaign.startDate, campaign.endDate)
  const positionOffset = campaign._count.posts

  let created = 0
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]
    const scheduledAt = schedule[i]
    try {
      const scheduled = await prisma.threadsScheduledPost.create({
        data: {
          userId: campaign.userId,
          text: p.content,
          scheduledAt,
          status: 'pending',
          metadata: { source: 'team-campaign', campaignId, runId, tema: p.tema, angle: p.angle ?? null },
        },
      })
      await prisma.threadsCampaignPost.create({
        data: {
          campaignId,
          scheduledPostId: scheduled.id,
          position: positionOffset + i,
          tema: p.tema,
          angle: p.angle ?? null,
          status: 'scheduled',
          scheduledAt,
        },
      })
      created++
    } catch (err) {
      console.error(`[CampaignIngest] failed to create post ${i} for campaign ${campaignId}:`, err)
    }
  }

  return { created }
}
