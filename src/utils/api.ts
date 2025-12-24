import axios from 'axios'

const api = axios.create({
  baseURL: 'https://workflow.anvayabali.com',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const postChat = async (payload: { sessionId: string; text: string }) => {
  try {
    const response = await api.post('/webhook/f9d94d1b-aa15-4b76-8326-b83d9b49e609', payload)
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

export const postRFP = async (payload: {
  title: string
  pic_name: string
  full_company_name: string
  event_date_start: string
  event_date_end: string
  number_of_participants: string
  number_of_rooms_required: string
  sales_pic_name: string
  sales_pic_position: string
  sales_pic_email: string
  sales_pic_phone_number: string
  rate_deluxe: string
  rate_premiere: string
}) => {
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
    const response = await api.post('/webhook-test/da5e5913-c534-4b60-b621-146908662546', payload)
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