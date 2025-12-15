export type ContractForm = {
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
}

export type ContractResponse = {
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
  email to notify when contract is ready!: string
  submittedAt: string
  formMode: string
}