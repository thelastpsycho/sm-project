// Survey response aggregation — pure functions, no Vue/Firestore, so both the admin
// page and server-side (MCP) code can share the same computation.

import type { Response, Stats } from '../types/survey.js'

/** Dashboard-wide stats across all responses, using the admin-configured review threshold. */
export function computeSurveyStats(
  responses: Pick<Response, 'averageScore'>[],
  reviewThreshold: number
): Stats {
  if (responses.length === 0) {
    return {
      totalResponses: 0,
      averageScore: 0,
      reviewRedirectRate: 0,
      scoreDistribution: [0, 0, 0, 0, 0]
    }
  }

  const totalResponses = responses.length
  const averageScore = responses.reduce((sum, r) => sum + r.averageScore, 0) / totalResponses

  const highScoreCount = responses.filter(r => r.averageScore >= reviewThreshold).length
  const reviewRedirectRate = (highScoreCount / totalResponses) * 100

  const scoreDistribution = [0, 0, 0, 0, 0]
  responses.forEach(response => {
    const bucket = Math.round(response.averageScore) - 1
    if (bucket >= 0 && bucket < 5) {
      const idx = bucket as 0 | 1 | 2 | 3 | 4
      scoreDistribution[idx] = (scoreDistribution[idx] ?? 0) + 1
    }
  })

  return {
    totalResponses,
    averageScore,
    reviewRedirectRate,
    scoreDistribution
  }
}

/** Per-event stats card. Historically uses a fixed 4.0 threshold (not the admin-configured one). */
export function computeEventStats(
  responses: Pick<Response, 'averageScore'>[],
  reviewThreshold = 4.0
): { count: number; averageScore: number; reviewRedirectRate: number } {
  const count = responses.length

  if (count === 0) {
    return { count, averageScore: 0, reviewRedirectRate: 0 }
  }

  const averageScore = responses.reduce((sum, r) => sum + r.averageScore, 0) / count
  const highScoreCount = responses.filter(r => r.averageScore >= reviewThreshold).length
  const reviewRedirectRate = (highScoreCount / count) * 100

  return { count, averageScore, reviewRedirectRate }
}
