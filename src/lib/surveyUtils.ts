import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculatePercentage(score: number, maxScore: number): number {
  return (score / maxScore) * 100
}

export function formatScore(score: number, decimals: number = 1): string {
  return score.toFixed(decimals)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateSurveyUrl(eventId: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/survey/${eventId}`
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false)
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getQuestionLabel(questionId: string): string {
  const questionMap: Record<string, string> = {
    q1: 'Overall Exp.',
    q2: 'Room',
    q3: 'F&B',
    q4: 'Event Exp.',
    q5: 'Team',
    q6: 'Recommend',
    q7: 'Enjoyed Most',
    q8: 'Improve'
  }
  return questionMap[questionId] || questionId
}

export function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    participant: 'Participant',
    organizer: 'Organizer',
    speaker: 'Speaker'
  }
  return roleMap[role] || role
}
