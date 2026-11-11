import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Firestore } from 'firebase-admin/firestore'
import { VENUE_STRUCTURE, canonicalVenue, isValidVenueSelection } from '../../../src/lib/functionChartVenues.js'
import { FUNCTION_STATUSES, type FunctionBooking, type FunctionStatus } from '../../../src/types/functionChart.js'
import type { RoleMatrix } from '../../../src/lib/permissions.js'
import { type McpCaller, McpToolError, requirePermission, runTool } from '../_shared.js'

interface Ctx {
  store: Firestore
  caller: McpCaller
  matrix: RoleMatrix
}

function mapBooking(id: string, data: Record<string, any>): FunctionBooking {
  return {
    id,
    salesOwner: data.salesOwner ?? '',
    company: data.company ?? '',
    eventName: data.eventName ?? '',
    pax: data.pax ?? 0,
    venues: Array.isArray(data.venues) ? data.venues : data.venue ? [data.venue] : [],
    status: (data.status ?? 'tentative') as FunctionStatus,
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? data.startDate ?? '',
    note: data.note ?? '',
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(0)
  }
}

export function registerFunctionChartTools(server: McpServer, ctx: Ctx) {
  const { store, caller, matrix } = ctx

  server.registerTool(
    'fc_list_bookings',
    {
      description: 'List Function Chart venue bookings, optionally filtered by date range, status, or venue.',
      inputSchema: {
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(FUNCTION_STATUSES).optional(),
        venue: z.string().optional()
      }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'function:view')
        const snap = await store.collection('functions').orderBy('startDate', 'asc').get()
        let bookings = snap.docs.map(d => mapBooking(d.id, d.data()))
        if (args.startDate) bookings = bookings.filter(b => b.endDate >= args.startDate!)
        if (args.endDate) bookings = bookings.filter(b => b.startDate <= args.endDate!)
        if (args.status) bookings = bookings.filter(b => b.status === args.status)
        if (args.venue) {
          const canon = canonicalVenue(args.venue) ?? args.venue
          bookings = bookings.filter(b => b.venues.includes(canon))
        }
        return bookings
      })
  )

  server.registerTool(
    'fc_list_venues',
    {
      description: 'List the static Function Chart venue structure (categories and rooms).',
      inputSchema: {}
    },
    async () =>
      runTool(async () => {
        requirePermission(matrix, caller, 'function:view')
        return VENUE_STRUCTURE
      })
  )

  server.registerTool(
    'fc_create_booking',
    {
      description:
        'Create a new Function Chart venue booking. Venues must be a single room or a valid adjacent combo.',
      inputSchema: {
        salesOwner: z.string(),
        company: z.string(),
        eventName: z.string(),
        pax: z.number().int().positive(),
        venues: z.array(z.string()).min(1),
        status: z.enum(FUNCTION_STATUSES),
        startDate: z.string(),
        endDate: z.string(),
        note: z.string().optional()
      }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'function:create')
        const canonVenues = args.venues.map(v => canonicalVenue(v))
        const unknown = args.venues.filter((_, i) => !canonVenues[i])
        if (unknown.length > 0) {
          throw new McpToolError('invalid_input', `Unknown venue(s): ${unknown.join(', ')}`)
        }
        const resolved = canonVenues as string[]
        if (!isValidVenueSelection(resolved)) {
          throw new McpToolError(
            'invalid_input',
            `"${resolved.join(', ')}" is not a valid venue selection (must be one room, or a contiguous run within a combinable group).`
          )
        }
        const now = new Date()
        const ref = await store.collection('functions').add({
          salesOwner: args.salesOwner,
          company: args.company,
          eventName: args.eventName,
          pax: args.pax,
          venues: resolved,
          status: args.status,
          startDate: args.startDate,
          endDate: args.endDate,
          note: args.note ?? '',
          createdAt: now,
          updatedAt: now
        })
        return { ok: true, bookingId: ref.id }
      })
  )

  server.registerTool(
    'fc_update_booking_status',
    {
      description: "Update a Function Chart booking's status (definite/tentative/waitingList/foc).",
      inputSchema: { bookingId: z.string(), status: z.enum(FUNCTION_STATUSES) }
    },
    async args =>
      runTool(async () => {
        requirePermission(matrix, caller, 'function:edit')
        const ref = store.collection('functions').doc(args.bookingId)
        const snap = await ref.get()
        if (!snap.exists) throw new McpToolError('not_found', `No booking with id "${args.bookingId}".`)
        await ref.update({ status: args.status, updatedAt: new Date() })
        return { ok: true }
      })
  )
}
