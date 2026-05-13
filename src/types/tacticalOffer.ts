export type TacticalOfferForm = {
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
  salesName?: string
  salesEmail?: string
  salesPosition?: string
  salesPhone?: string
}

export type TacticalOfferResponse = {
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
  emailToNotifyWhenOfferIsReady: string
  submittedAt: string
  formMode: string
}
