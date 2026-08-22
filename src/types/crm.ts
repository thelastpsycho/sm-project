// CRM / Sales-Pipeline types — modeled on the team's existing pipeline spreadsheet.

export const DEAL_STATUSES = ['Active', 'Idle', 'Win', 'Lost'] as const
export type DealStatus = (typeof DEAL_STATUSES)[number]

// Sales-funnel stage (where a lead sits in the journey — distinct from status/outcome).
export const DEAL_STAGES = ['New', 'Proposal', 'Negotiation', 'Contract', 'Confirmed'] as const
export type DealStage = (typeof DEAL_STAGES)[number]

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
  status: DealStatus
  statusEnteredAt?: string // ISO — when the deal last entered its current status
  ownerId: string // app user email; empty when unassigned
  ownerName: string // display name
  stage?: DealStage // sales-funnel stage; absent = 'New'
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
  reasonWonLost?: string
  nextAction?: string
  actionDueDate?: string
  notes?: string
  commentCount?: number // denormalized count of deals/{id}/comments
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

// A seed row from src/data/dealsSeed.json — same shape without id/timestamps,
// and with optional fields possibly absent.
export type SeedDeal = Partial<NewDeal> &
  Pick<Deal, 'company' | 'segment' | 'leadSource' | 'status' | 'ownerName' | 'currency'>
