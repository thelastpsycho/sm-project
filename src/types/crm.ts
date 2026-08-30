// CRM / Sales-Pipeline types — modeled on the team's existing pipeline spreadsheet.

// Sales-funnel stage — the SINGLE pipeline axis. `Confirmed` = won, `Lost` = terminal.
// (Replaces the old separate `status` field: outcome + idle are now derived, see below.)
export const DEAL_STAGES = ['New', 'Proposal', 'Negotiation', 'Contract', 'Confirmed', 'Lost'] as const
export type DealStage = (typeof DEAL_STAGES)[number]

// The in-play stages a deal can be dragged through (excludes the two terminal ones).
export const OPEN_STAGES = ['New', 'Proposal', 'Negotiation', 'Contract'] as const

// Derived outcome — computed from stage, never stored. Confirmed → won, Lost → lost,
// anything else → open. See `dealOutcome()` in crmUtils.
export const DEAL_OUTCOMES = ['open', 'won', 'lost'] as const
export type DealOutcome = (typeof DEAL_OUTCOMES)[number]

export const SEGMENTS = ['MICE', 'Leisure', 'Wedding'] as const
export const LEAD_SOURCES = ['Whatsapp', 'Email', 'Phone'] as const
export const LOST_REASONS = [
  'No Feedback',
  'Budget Constrain',
  'Move Area',
  'Event Cancelled',
  'Lose to other hotel'
] as const

export interface Deal {
  id: string
  company: string
  segment: string // preset (SEGMENTS) or free text
  leadSource: string // preset (LEAD_SOURCES) or free text
  ownerId: string // app user email; empty when unassigned
  ownerName: string // display name
  stage?: DealStage // pipeline stage (the single axis); absent = 'New'
  stageEnteredAt?: string // ISO — when the deal last entered its current stage
  groupName?: string
  leadDate?: string // ISO date (yyyy-mm-dd)
  arrivalDate?: string
  checkoutDate?: string
  rooms?: number
  nights?: number
  roomNights?: number // calc: rooms * nights (unless manualRevenue)
  proposedADR?: number
  estimatedRoomRevenue?: number // calc: roomNights * proposedADR
  fbAncillary?: number
  totalRevenue?: number // calc: estimatedRoomRevenue + fbAncillary
  manualRevenue?: boolean // when true, revenue fields are free-entry
  actualRevenue?: number // real booked value, captured when a deal is won (stage → Confirmed)
  reasonWonLost?: string
  nextAction?: string
  actionDueDate?: string
  notes?: string
  commentCount?: number // denormalized count of deals/{id}/comments
  link_to_pdf?: string // generated proposal PDF link, from the most recent RFP run for this deal
  rfpId?: string // id of the linked rfps/{id} doc that produced link_to_pdf
  currency: string // e.g. 'IDR'
  createdAt: Date
  updatedAt: Date
}

// A comment left on a deal by a team member (deals/{id}/comments subcollection).
export interface DealComment {
  id: string
  authorId: string // app user email; empty when unknown
  authorName: string // display name
  text: string
  createdAt: Date
}

// Payload used when creating a deal (server stamps id / timestamps).
export type NewDeal = Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>

// An append-only pipeline event (top-level `pipelineEvents` collection). Records every
// stage transition so we can compute conversion rates, time-in-stage and velocity later.
export interface PipelineEvent {
  id: string
  dealId: string
  company: string
  type: 'created' | 'stage' | 'reopened'
  from?: DealStage // absent on 'created'
  to: DealStage
  reason?: string // lost reason, when to === 'Lost'
  valueAtChange?: number // revenue snapshot at won/lost time
  byId: string // actor email
  byName: string // actor display name
  at: Date
}
export type NewPipelineEvent = Omit<PipelineEvent, 'id'>
