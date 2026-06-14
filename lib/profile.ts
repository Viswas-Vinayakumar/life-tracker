const PROFILE_KEY = 'lifeos_user_profile'

export interface UserProfile {
  name: string
  age?: number
  heightCm?: number
  weightKg?: number
  goal?: 'build_muscle' | 'lose_fat' | 'maintain' | 'improve_health' | 'athlete'
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  dietaryPrefs?: ('vegetarian' | 'vegan' | 'halal' | 'lactose_free' | 'gluten_free')[]
  city?: string
  country?: string
  // Physique-specific
  bodyFatPct?: number         // Current estimated BF%
  targetBodyFatPct?: number   // Target BF%
  gymTargetDays?: number      // Target gym days per week
  physiqueGoal?: 'lean_muscle' | 'fat_loss' | 'recomp' | 'bulk'
}

export const GOAL_LABELS: Record<NonNullable<UserProfile['goal']>, string> = {
  build_muscle:    'Build Muscle',
  lose_fat:        'Lose Fat',
  maintain:        'Maintain Weight',
  improve_health:  'Improve Health',
  athlete:         'Athletic Performance',
}

export const ACTIVITY_LABELS: Record<NonNullable<UserProfile['activityLevel']>, string> = {
  sedentary:  'Sedentary (desk job, little exercise)',
  light:      'Light (1–3 workouts/week)',
  moderate:   'Moderate (3–5 workouts/week)',
  active:     'Active (6–7 workouts/week)',
  very_active: 'Very Active (physical job + training)',
}

const DEFAULTS: Partial<UserProfile> = {
  country: 'Germany',
  bodyFatPct: 13,
  targetBodyFatPct: 10,
  gymTargetDays: 4,
  physiqueGoal: 'lean_muscle',
}

export function getProfile(): UserProfile {
  if (typeof window === 'undefined') return { name: '' }
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { name: '', ...DEFAULTS }
  } catch { return { name: '', ...DEFAULTS } }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

// Calculate BMI
export function calcBMI(heightCm: number, weightKg: number): number {
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25)   return 'Normal weight'
  if (bmi < 30)   return 'Overweight'
  return 'Obese'
}

// Calculate TDEE (Total Daily Energy Expenditure) using Mifflin-St Jeor
export function calcTDEE(profile: UserProfile): number | null {
  if (!profile.heightCm || !profile.weightKg || !profile.age) return null
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5 // male approximation
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  const mult = multipliers[profile.activityLevel ?? 'moderate']
  return Math.round(bmr * mult)
}

export const PHYSIQUE_LABELS: Record<NonNullable<UserProfile['physiqueGoal']>, string> = {
  lean_muscle: 'Lean Muscle + Defined Abs',
  fat_loss:    'Fat Loss',
  recomp:      'Body Recomposition',
  bulk:        'Muscle Bulk',
}

// Build a profile summary string for Ollama prompts
export function buildProfileContext(profile: UserProfile): string {
  const parts: string[] = []
  if (profile.name) parts.push(`Name: ${profile.name}`)
  if (profile.age) parts.push(`Age: ${profile.age}`)
  if (profile.heightCm) parts.push(`Height: ${profile.heightCm}cm`)
  if (profile.weightKg) parts.push(`Weight: ${profile.weightKg}kg`)
  if (profile.heightCm && profile.weightKg) {
    const bmi = calcBMI(profile.heightCm, profile.weightKg)
    parts.push(`BMI: ${bmi} (${bmiLabel(bmi)})`)
  }
  if (profile.bodyFatPct) parts.push(`Current body fat: ~${profile.bodyFatPct}%`)
  if (profile.targetBodyFatPct) parts.push(`Target body fat: ${profile.targetBodyFatPct}% (lean/defined)`)
  if (profile.physiqueGoal) parts.push(`Physique goal: ${PHYSIQUE_LABELS[profile.physiqueGoal]}`)
  if (profile.gymTargetDays) parts.push(`Gym target: ${profile.gymTargetDays}x/week (ideally 6x but realistic 3-4x)`)
  if (profile.goal) parts.push(`General goal: ${GOAL_LABELS[profile.goal]}`)
  if (profile.activityLevel) parts.push(`Activity level: ${ACTIVITY_LABELS[profile.activityLevel]}`)
  if (profile.dietaryPrefs?.length) parts.push(`Dietary prefs: ${profile.dietaryPrefs.join(', ')}`)
  const tdee = calcTDEE(profile)
  if (tdee) parts.push(`Estimated TDEE: ${tdee} kcal/day`)
  parts.push('Dietary priority: clean eating — minimize sugar (<25g/day), sodium (<2000mg/day), processed foods. High protein, whole foods.')
  parts.push('Location: Germany (shops at REWE, ALDI, LIDL, NETTO, Penny, Edeka)')
  return parts.length ? `USER PROFILE:\n${parts.join('\n')}` : ''
}
