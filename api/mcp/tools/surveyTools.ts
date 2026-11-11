import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Firestore } from 'firebase-admin/firestore'
import { computeEventStats } from '../../../src/lib/surveyStats.js'
import type { RoleMatrix } from '../../../src/lib/permissions.js'
import { type McpCaller, requirePermission, runTool } from '../_shared.js'

interface Ctx {
  store: Firestore
  caller: McpCaller
  matrix: RoleMatrix
}

export function registerSurveyTools(server: McpServer, ctx: Ctx) {
  const { store, caller, matrix } = ctx

  server.registerTool(
    'survey_list_events',
    {
      description: 'List survey events (one per client occasion).',
      inputSchema: {}
    },
    async () =>
      runTool(async () => {
        requirePermission(matrix, caller, 'survey:view')
        const snap = await store.collection('events').orderBy('createdAt', 'desc').get()
        return snap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            eventName: data.eventName ?? '',
            companyName: data.companyName ?? '',
            language: data.language ?? 'en',
            createdAt: data.createdAt?.toDate?.() ?? new Date(0)
          }
        })
      })
  )

  server.registerTool(
    'survey_get_event_stats',
    {
      description: 'Aggregate stats (response count, average score, review-redirect rate) for one survey event.',
      inputSchema: { eventId: z.string() }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'survey:view')
        const snap = await store.collection('responses').where('eventId', '==', args.eventId).get()
        const responses = snap.docs.map(d => ({ averageScore: d.data().averageScore ?? 0 }))
        return computeEventStats(responses)
      })
  )

  server.registerTool(
    'survey_list_responses',
    {
      description:
        'List survey responses for an event (name, email, role, scores, comment). Device/location metadata is omitted.',
      inputSchema: { eventId: z.string(), limit: z.number().int().min(1).max(500).default(100) }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'survey:view')
        const snap = await store.collection('responses').where('eventId', '==', args.eventId).get()
        return snap.docs.slice(0, args.limit).map(d => {
          const data = d.data()
          return {
            id: d.id,
            eventId: data.eventId ?? '',
            name: data.name ?? '',
            email: data.email ?? '',
            role: data.role ?? 'participant',
            scores: data.scores ?? {},
            textAnswers: data.textAnswers ?? {},
            totalScore: data.totalScore ?? 0,
            percentage: data.percentage ?? 0,
            averageScore: data.averageScore ?? 0,
            comment: data.comment,
            createdAt: data.createdAt?.toDate?.() ?? new Date(0)
            // metadata (browser/device/geo) intentionally omitted — no business need
            // for an externally-reachable tool to expose it.
          }
        })
      })
  )
}
