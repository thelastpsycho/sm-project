export type EventLanguage = 'en' | 'id'

export interface Event {
  id: string
  eventName: string
  companyName: string
  language: EventLanguage
  createdAt: Date
}

export type UserRole = 'participant' | 'organizer' | 'speaker'

export interface Response {
  id: string
  eventId: string
  name: string
  email: string
  role: UserRole
  scores: Record<string, number>
  textAnswers: Record<string, string>
  totalScore: number
  percentage: number
  averageScore: number
  comment?: string
  createdAt: Date
}

export interface AdminSettings {
  reviewThreshold: number
  googleReviewUrl: string
  webhookUrl: string
  adminPinHash: string
}

export type QuestionType = 'rating' | 'text'

export interface SurveyQuestion {
  id: string
  question: string
  type: QuestionType
}

export interface ResponseWithEvent extends Response {
  event?: Event
}

export interface LikertOption {
  value: number
  label: string
}

export interface UIText {
  welcomeTitle: string
  welcomeDescription: string
  fullName: string
  fullNamePlaceholder: string
  emailAddress: string
  emailAddressPlaceholder: string
  role: string
  roleParticipant: string
  roleOrganizer: string
  roleSpeaker: string
  next: string
  rateYourExperience: string
  yourFeedback: string
  placeholderShareThoughts: string
  submitSurvey: string
  progress: string
  answeredOf: string
  eventSurvey: string
  thankYouForChoosing: string
  selectRating: string
}

export interface ValidationMessages {
  nameRequired: string
  emailRequired: string
  emailInvalid: string
  roleRequired: string
}

export type AdminTab = 'dashboard' | 'events' | 'results' | 'stats' | 'settings'

export interface Stats {
  totalResponses: number
  averageScore: number
  reviewRedirectRate: number
  scoreDistribution: number[]
}
