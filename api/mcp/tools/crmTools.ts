import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { loadDeals, loadEventsSince } from '../../cron/_shared.js'
import { outcome } from '../../pipeline/_shared.js'
import { computeKpis, stageFunnel, ownerLeaderboard, attentionList } from '../../../src/lib/crmReport.js'
import { buildPipelineIntelligence } from '../../../src/lib/crmIntelligence.js'
import { buildLostDealIntelligence } from '../../../src/lib/crmLostIntelligence.js'
import { applyRevenueCalc } from '../../../src/lib/crmUtils.js'
import { DEAL_STAGES, type Deal, type DealStage, type NewPipelineEvent } from '../../../src/types/crm.js'
import type { RoleMatrix } from '../../../src/lib/permissions.js'
import { type McpCaller, McpToolError, canEditDealServer, requirePermission, runTool } from '../_shared.js'

interface Ctx {
  store: Firestore
  caller: McpCaller
  matrix: RoleMatrix
}

const EVENTS_LOOKBACK_DAYS = 365

function isTerminal(stage: DealStage): boolean {
  return stage === 'Confirmed' || stage === 'Lost'
}

async function getDealOrThrow(store: Firestore, dealId: string): Promise<Deal> {
  const snap = await store.collection('deals').doc(dealId).get()
  if (!snap.exists) throw new McpToolError('not_found', `No deal with id "${dealId}".`)
  const data = snap.data() as Record<string, any>
  return {
    id: snap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(0)
  } as Deal
}

export function registerCrmTools(server: McpServer, ctx: Ctx) {
  const { store, caller, matrix } = ctx

  // ---- Read ----

  server.registerTool(
    'crm_list_deals',
    {
      description: 'List CRM pipeline deals, optionally filtered by stage, segment, owner, company, or outcome.',
      inputSchema: {
        stage: z.enum(DEAL_STAGES).optional(),
        segment: z.string().optional(),
        ownerId: z.string().optional(),
        company: z.string().optional(),
        outcome: z.enum(['open', 'won', 'lost']).optional(),
        limit: z.number().int().min(1).max(200).default(100)
      }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:view')
        let deals = await loadDeals(store)
        if (args.stage) deals = deals.filter(d => (d.stage ?? 'New') === args.stage)
        if (args.segment) deals = deals.filter(d => d.segment === args.segment)
        if (args.ownerId) deals = deals.filter(d => d.ownerId === args.ownerId)
        if (args.company) deals = deals.filter(d => d.company.toLowerCase().includes(args.company!.toLowerCase()))
        if (args.outcome) deals = deals.filter(d => outcome(d) === args.outcome)
        return deals.slice(0, args.limit)
      })
  )

  server.registerTool(
    'crm_get_deal',
    {
      description: 'Get a single CRM deal by id, including its comment/activity timeline.',
      inputSchema: { dealId: z.string() }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:view')
        const deal = await getDealOrThrow(store, args.dealId)
        const commentsSnap = await store
          .collection('deals')
          .doc(args.dealId)
          .collection('comments')
          .orderBy('createdAt', 'desc')
          .get()
        const comments = commentsSnap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            authorId: data.authorId ?? '',
            authorName: data.authorName ?? '',
            text: data.text ?? '',
            kind: data.kind === 'activity' ? 'activity' : 'comment',
            createdAt: data.createdAt?.toDate?.() ?? new Date(0)
          }
        })
        return { deal, comments }
      })
  )

  server.registerTool(
    'crm_pipeline_report',
    {
      description: 'Pipeline KPIs (counts/values/win rate/forecast), stage funnel, and owner leaderboard.',
      inputSchema: {}
    },
    async () =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:report')
        const deals = await loadDeals(store)
        return { kpis: computeKpis(deals), funnel: stageFunnel(deals), leaderboard: ownerLeaderboard(deals) }
      })
  )

  server.registerTool(
    'crm_attention_list',
    {
      description: 'Deals needing attention: aging/stuck/action-due alerts, plus arrivals coming up within N days.',
      inputSchema: { withinDays: z.number().int().min(1).max(90).default(14) }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:report')
        const deals = await loadDeals(store)
        return attentionList(deals, new Date(), args.withinDays)
      })
  )

  server.registerTool(
    'crm_pipeline_intelligence',
    {
      description: 'Per-deal priority/risk scoring, health label, recommended action, anomalies, and duplicates.',
      inputSchema: {}
    },
    async () =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:intelligence')
        const since = Date.now() - EVENTS_LOOKBACK_DAYS * 86_400_000
        const [deals, events] = await Promise.all([loadDeals(store), loadEventsSince(store, since)])
        return buildPipelineIntelligence(deals, new Date(), events)
      })
  )

  server.registerTool(
    'crm_lost_deal_intelligence',
    {
      description: 'Lost-deal breakdown by reason, segment, lead source, and the stage deals were lost from.',
      inputSchema: {}
    },
    async () =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:intelligence')
        const since = Date.now() - EVENTS_LOOKBACK_DAYS * 86_400_000
        const [deals, events] = await Promise.all([loadDeals(store), loadEventsSince(store, since)])
        return buildLostDealIntelligence(deals, events)
      })
  )

  // ---- Write ----

  server.registerTool(
    'crm_add_comment',
    {
      description: "Add a comment to a deal's timeline. Any authenticated user may comment.",
      inputSchema: { dealId: z.string(), text: z.string().min(1).max(4000) }
    },
    async args =>
      runTool(async () => {
        await getDealOrThrow(store, args.dealId) // 404s cleanly if the deal doesn't exist
        const batch = store.batch()
        const commentRef = store.collection('deals').doc(args.dealId).collection('comments').doc()
        const now = new Date()
        batch.set(commentRef, {
          authorId: caller.email,
          authorName: caller.name,
          text: args.text,
          kind: 'comment',
          createdAt: now
        })
        batch.update(store.collection('deals').doc(args.dealId), { commentCount: FieldValue.increment(1) })
        await batch.commit()
        return { ok: true, commentId: commentRef.id }
      })
  )

  server.registerTool(
    'crm_update_deal_stage',
    {
      description:
        'Move a deal to a new stage (including Won/Lost). Requires reasonWonLost when moving to Lost. Requires edit rights on the deal.',
      inputSchema: {
        dealId: z.string(),
        stage: z.enum(DEAL_STAGES),
        reasonWonLost: z.string().optional(),
        actualRevenue: z.number().optional(),
        note: z.string().optional()
      }
    },
    async args =>
      runTool(async () => {
        const deal = await getDealOrThrow(store, args.dealId)
        if (!canEditDealServer(matrix, caller, deal)) {
          throw new McpToolError('forbidden', 'You do not have edit rights on this deal.')
        }
        if (args.stage === 'Lost' && !args.reasonWonLost) {
          throw new McpToolError('invalid_input', 'reasonWonLost is required when moving a deal to Lost.')
        }

        const prevStage = (deal.stage ?? 'New') as DealStage
        if (prevStage === args.stage) return { ok: true, unchanged: true }

        const reopening = isTerminal(prevStage) && !isTerminal(args.stage)
        const nowIso = new Date().toISOString()
        const now = new Date()

        const update: Record<string, any> = { stage: args.stage, stageEnteredAt: nowIso, updatedAt: now }
        if (reopening) {
          update.reasonWonLost = FieldValue.delete()
          update.actualRevenue = FieldValue.delete()
        }
        if (args.stage === 'Lost') {
          update.reasonWonLost = args.reasonWonLost
          if (args.note) update.notes = [deal.notes, args.note].filter(Boolean).join('\n')
        }
        if (args.stage === 'Confirmed') {
          update.actualRevenue = args.actualRevenue == null ? FieldValue.delete() : args.actualRevenue
        }

        const activityText =
          args.stage === 'Lost'
            ? `Moved from ${prevStage} to Lost — ${args.reasonWonLost}`
            : args.stage === 'Confirmed'
              ? `Moved from ${prevStage} to Confirmed (Won)`
              : `Moved from ${prevStage} to ${args.stage}`

        const event: NewPipelineEvent = {
          dealId: args.dealId,
          company: deal.company,
          type: reopening ? 'reopened' : 'stage',
          from: prevStage,
          to: args.stage,
          reason: args.stage === 'Lost' ? args.reasonWonLost : undefined,
          valueAtChange: args.actualRevenue ?? deal.totalRevenue,
          byId: caller.email,
          byName: caller.name,
          at: now
        }
        const cleanEvent = Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined))

        const batch = store.batch()
        batch.update(store.collection('deals').doc(args.dealId), update)
        batch.set(store.collection('pipelineEvents').doc(), cleanEvent)
        batch.set(store.collection('deals').doc(args.dealId).collection('comments').doc(), {
          authorId: caller.email,
          authorName: caller.name,
          text: activityText,
          kind: 'activity',
          createdAt: now
        })
        await batch.commit()
        return { ok: true, from: prevStage, to: args.stage }
      })
  )

  server.registerTool(
    'crm_create_deal',
    {
      description: 'Create a new CRM deal (stage defaults to New). Requires the pipeline:create permission.',
      inputSchema: {
        company: z.string(),
        segment: z.string(),
        leadSource: z.string(),
        ownerId: z.string().optional(),
        ownerName: z.string().optional(),
        currency: z.string().default('IDR'),
        groupName: z.string().optional(),
        leadDate: z.string().optional(),
        arrivalDate: z.string().optional(),
        checkoutDate: z.string().optional(),
        rooms: z.number().optional(),
        nights: z.number().optional(),
        proposedADR: z.number().optional(),
        fbAncillary: z.number().optional(),
        manualRevenue: z.boolean().optional(),
        totalRevenue: z.number().optional(),
        nextAction: z.string().optional(),
        actionDueDate: z.string().optional(),
        notes: z.string().optional()
      }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'pipeline:create')
        const now = new Date()
        const nowIso = now.toISOString()
        const payload = applyRevenueCalc({
          ...args,
          ownerId: args.ownerId ?? '',
          ownerName: args.ownerName ?? ''
        })
        const ref = store.collection('deals').doc()
        const batch = store.batch()
        batch.set(ref, { ...payload, stage: 'New', stageEnteredAt: nowIso, createdAt: now, updatedAt: now })
        batch.set(store.collection('pipelineEvents').doc(), {
          dealId: ref.id,
          company: args.company,
          type: 'created',
          to: 'New',
          byId: caller.email,
          byName: caller.name,
          at: now
        })
        await batch.commit()
        return { ok: true, dealId: ref.id }
      })
  )
}
