export type Message = {
  id: string
  sessionId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  status?: 'sent' | 'sending' | 'failed'
}

export type OutboxItem = {
  id: string
  sessionId: string
  text: string
  createdAt: number
  attempts: number
}

export type AgentId = 'general' | 'rate' | 'forecast'

export interface AgentConfig {
  id: AgentId
  name: string
  webhookUrl: string
  disabled?: boolean
  payloadAdapter: (text: string, sessionId: string) => any
}