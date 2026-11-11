// Remote MCP server (Streamable HTTP transport) exposing CRM, Function Chart, and
// Survey data as tools. Runs stateless — a fresh McpServer + transport per Vercel
// invocation (sessionIdGenerator: undefined), since serverless functions aren't
// long-lived processes and tool calls here don't need multi-turn session state.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { db, loadRoleMatrix } from '../cron/_shared.js'
import { resolveMcpCaller } from './_shared.js'
import { registerCrmTools } from './tools/crmTools.js'
import { registerFunctionChartTools } from './tools/functionChartTools.js'
import { registerSurveyTools } from './tools/surveyTools.js'

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. This MCP server only supports stateless POST requests.' })
    return
  }

  const store = db()

  let caller
  try {
    caller = await resolveMcpCaller(req, store)
  } catch (err) {
    console.error('MCP auth error:', err)
    res.status(500).json({ error: 'Internal error resolving caller' })
    return
  }
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized. Provide a valid MCP API key as "Authorization: Bearer <key>".' })
    return
  }
  if (caller.status === 'disabled') {
    res.status(403).json({ error: 'This account is disabled.' })
    return
  }

  try {
    const matrix = await loadRoleMatrix(store)

    const server = new McpServer({ name: 'sm-anvaya-mcp', version: '1.0.0' })
    const ctx = { store, caller, matrix }
    registerCrmTools(server, ctx)
    registerFunctionChartTools(server, ctx)
    registerSurveyTools(server, ctx)

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP request error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
