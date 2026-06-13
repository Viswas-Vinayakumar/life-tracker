import type { DailyLog, FoodEntry } from '@/types'

// Body (40) + Mind (40) + Life Systems (20) = 100
export function calculateScore(log: Partial<DailyLog>, foodEntries: FoodEntry[]): number {
  let score = 0

  // BODY (40 pts)
  if (log.gym_done) score += 20

  const glasses = log.water_glasses ?? 0
  if (glasses >= 8) score += 10
  else if (glasses >= 4) score += 5

  const sleep = log.sleep_hours ?? 0
  if (sleep >= 7 && sleep <= 9) score += 10
  else if ((sleep >= 6 && sleep < 7) || (sleep > 9 && sleep <= 10)) score += 6
  else if (sleep > 0) score += 3
  // no sleep logged → 0 (neutral nudge to log it)

  // MIND (40 pts)
  if (log.study_done) score += 20
  if (log.skincare_am) score += 10
  if (log.skincare_pm) score += 10

  // LIFE SYSTEMS (20 pts)
  if (foodEntries.length > 0) score += 10
  if (log.mood) score += 5    // reward checking in with yourself
  if (log.energy) score += 5  // reward logging energy

  return Math.min(100, Math.max(0, score))
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#fbbf24' // gold — peak
  if (score >= 75) return '#22c55e' // green — strong
  if (score >= 60) return '#06b6d4' // cyan — solid
  if (score >= 40) return '#f59e0b' // amber — off-day
  return '#f87171'                  // soft red — reset
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Peak 🔥'
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Solid'
  if (score >= 40) return 'Off-day'
  if (score > 0) return 'Reset'
  return 'Start'
}
