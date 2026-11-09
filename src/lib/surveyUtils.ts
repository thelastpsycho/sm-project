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

export function generateSurveyUrl(eventId: string): string {
  return `${window.location.origin}/survey/${eventId}`
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false)
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

export function combineTextFeedback(textAnswers: Record<string, string> | undefined): string {
  if (!textAnswers) return ''
  return Object.entries(textAnswers)
    .filter(([, value]) => value && value.trim())
    .map(([key, value]) => `${getQuestionLabel(key)}: ${value.trim()}`)
    .join(' | ')
}

function escapeCsvField(field: string | number): string {
  const str = String(field)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map(row => row.map(escapeCsvField).join(','))
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
