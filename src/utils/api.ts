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

    // Log request payload
    console.log('🚀 Sending contract to n8n:', {
      url: 'https://workflow.anvayabali.com/webhook/af1052ea-d967-4ea0-b580-d6b4ae8d9943',
      payload: transformedPayload
    })

    const response = await api.post('https://workflow.anvayabali.com/webhook/af1052ea-d967-4ea0-b580-d6b4ae8d9943', transformedPayload, {
      timeout: 60000
    })

    // Log successful response
    console.log('✅ n8n response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    })

    return response.data
  } catch (error) {
    // Log error details
    if (axios.isAxiosError(error)) {
      console.error('❌ Contract submission error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      })

      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        throw new Error('Network error - please check your connection')
      }
      throw error
    }
    console.error('❌ Unexpected error:', error)
    throw new Error('Failed to submit contract')
  }
}

export const postTacticalOffer = async (payload: {
  market: string
  subject: string
  company: string
  title: string
  fullName: string
  designation: string
  addressLine1: string
  addressLine2: string
  email: string
  phone: string
  bookingPeriodStart: string
  bookingPeriodEnd: string
  travelPeriodStart: string
  travelPeriodEnd: string
  notifyMe: string[]
  emailToNotify: string
  sessionId: string
  salesName?: string
  salesEmail?: string
  salesPosition?: string
  salesPhone?: string
}) => {
  try {
    const transformedPayload = {
      "Market": payload.market,
      "Subject": payload.subject,
      "Company": toProperCase(payload.company),
      "Title": payload.title,
      "Full Name": toProperCase(payload.fullName),
      "Designation": toProperCase(payload.designation),
      "Address Line 1": toProperCase(payload.addressLine1),
      "Address Line 2": toProperCase(payload.addressLine2),
      "Email": payload.email,
      "Phone": payload.phone,
      "Booking Period Start": payload.bookingPeriodStart,
      "Booking Period End": payload.bookingPeriodEnd,
      "Travel Period Start": payload.travelPeriodStart,
      "Travel Period End": payload.travelPeriodEnd,
      "notify me": payload.notifyMe || [],
      "email to notify when offer is ready!": payload.emailToNotify,
      "submittedAt": new Date().toISOString(),
      "formMode": "live",
      "Sales Name": payload.salesName || '',
      "Sales Email": payload.salesEmail || '',
      "Sales Position": payload.salesPosition || '',
      "Sales Phone": payload.salesPhone || ''
    }

    // Tactical offer webhook URL
    const webhookUrl = 'https://workflow.anvayabali.com/webhook/4fdc3a03-28b0-4a1c-9d1c-35360d4bf1b2'

    // Log request payload
    console.log('🚀 Sending tactical offer to n8n:', {
      url: webhookUrl,
      payload: transformedPayload
    })

    const response = await api.post(webhookUrl, transformedPayload, {
      timeout: 60000
    })

    // Log successful response
    console.log('✅ n8n response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    })

    return response.data
  } catch (error) {
    // Log error details
    if (axios.isAxiosError(error)) {
      console.error('❌ Tactical offer submission error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      })

      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        throw new Error('Network error - please check your connection')
      }
      throw error
    }
    console.error('❌ Unexpected error:', error)
    throw new Error('Failed to submit tactical offer')
  }
}