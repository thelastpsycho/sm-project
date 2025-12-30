import axios from 'axios'

const api = axios.create({
  baseURL: 'https://workflow.anvayabali.com',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

import type { AgentConfig } from '@/types/chat'
import type { RFPForm } from '@/types/rfp'

export const postChat = async (config: AgentConfig, text: string, sessionId: string) => {
  try {
    const payload = config.payloadAdapter(text, sessionId)
    const response = await api.post(config.webhookUrl, payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        throw new Error('Network error - message will be queued')
      }
      throw error
    }
    throw new Error('Failed to send message')
  }
}

export const postRFP = async (payload: RFPForm) => {
  try {
    const response = await api.post('/webhook/bb8aa15d-08f5-4a19-97e4-c8cd9faad445', payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        throw new Error('Network error - please check your connection')
      }
      throw error
    }
    throw new Error('Failed to submit RFP')
  }
}

const toProperCase = (str: string) => {
  if (!str) return str
  return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase())
}

export const postContract = async (payload: {
  market: string
  company: string
  title: string
  fullName: string
  designation: string
  addressLine1: string
  addressLine2: string
  email: string
  phone: string
  allotment: string[]
  notifyMe: string[]
  emailToNotify: string
  sessionId: string
}) => {
  try {
    const transformedPayload = {
      "Market": payload.market,
      "Company": toProperCase(payload.company),
      "Title": payload.title,
      "Full Name": toProperCase(payload.fullName),
      "Designation": toProperCase(payload.designation),
      "Address Line 1": toProperCase(payload.addressLine1),
      "Address Line 2": toProperCase(payload.addressLine2),
      "Email": payload.email,
      "Phone": payload.phone,
      "Allotment": payload.allotment || [],
      "notify me": payload.notifyMe || [],
      "email to notify when contract is ready!": payload.emailToNotify,
      "submittedAt": new Date().toISOString(),
      "formMode": "live"
    }
    const response = await api.post('https://workflow.anvayabali.com/webhook/af1052ea-d967-4ea0-b580-d6b4ae8d9943', transformedPayload, {
      timeout: 60000
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        throw new Error('Network error - please check your connection')
      }
      throw error
    }
    throw new Error('Failed to submit contract')
  }
}