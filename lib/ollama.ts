// Local AI via Ollama — no tokens, no API keys, runs on your Mac
// Install: brew install ollama && ollama pull llama3.2:3b
import type { DailyLog, FoodEntry } from '@/types'
import { getGermanFoodContext } from './germanFoods'
import { getProfile, buildProfileContext } from './profile'
import { getGymKnowledgeContext } from './gymKnowledge'
import type { WorkoutSession } from '@/types'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const AI_MEMORY_KEY = 'lifeos_ai_memory'

// ─── AI Self-Learning Memory ─────────────────────────────────────
export interface AIMemory {
  patterns: string[]    // observed behavioral patterns
  foodHabits: string[]  // what they usually eat, preferences
  wins: string[]        // consistent good habits
  concerns: string[]    // recurring issues to address
  lastUpdated: string
}

export function getAIMemory(): AIMemory {
  if (typeof window === 'undefined') return { patterns: [], foodHabits: [], wins: [], concerns: [], lastUpdated: '' }
  try {
    const raw = localStorage.getItem(AI_MEMORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { patterns: [], foodHabits: [], wins: [], concerns: [], lastUpdated: '' }
}

function appendAIMemory(update: { pattern?: string; foodHabit?: string; win?: string; concern?: string }) {
  if (typeof window === 'undefined') return
  const mem = getAIMemory()
  const push = (arr: string[], val?: string) => val && val.length > 10
    ? [...new Set([...arr, val])].slice(-12)
    : arr
  const next: AIMemory = {
    patterns:   push(mem.patterns,   update.pattern),
    foodHabits: push(mem.foodHabits, update.foodHabit),
    wins:       push(mem.wins,       update.win),
    concerns:   push(mem.concerns,   update.concern),
    lastUpdated: new Date().toISOString(),
  }
  localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(next))
}

function buildMemoryContext(): string {
  const mem = getAIMemory()
  const lines: string[] = []
  if (mem.patterns.length)   lines.push(`Observed patterns: ${mem.patterns.slice(-4).join(' | ')}`)
  if (mem.foodHabits.length) lines.push(`Food habits: ${mem.foodHabits.slice(-4).join(' | ')}`)
  if (mem.wins.length)       lines.push(`Consistent wins: ${mem.wins.slice(-3).join(' | ')}`)
  if (mem.concerns.length)   lines.push(`Areas needing work: ${mem.concerns.slice(-3).join(' | ')}`)
  return lines.length ? `WHAT I KNOW ABOUT THIS USER (learned over time):\n${lines.join('\n')}` : ''
}

// ─── Ollama helpers ────────────────────────────────────────────────
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/`, { signal: AbortSignal.timeout(800) })
    return res.ok
  } catch { return false }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(1500) })
    const data = await res.json()
    return (data.models ?? []).map((m: { name: string }) => m.name)
  } catch { return [] }
}

async function getBestModel(): Promise<string> {
  const models = await getOllamaModels()
  const preferred = ['llama3.2:3b', 'llama3.2', 'llama3.1', 'llama3', 'gemma3:4b', 'gemma3', 'mistral', 'phi4', 'phi3']
  for (const p of preferred) {
    if (models.some(m => m.startsWith(p))) return models.find(m => m.startsWith(p))!
  }
  return models[0] ?? 'llama3.2'
}

// ─── Food parsing ─────────────────────────────────────────────────
export interface FoodNutrition {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium_mg: number
}

export async function parseFoodWithOllama(input: string): Promise<FoodNutrition> {
  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const germanCtx = getGermanFoodContext()

  const systemContext = [
    profileCtx,
    'The user is on a CLEAN DIET targeting 10% body fat (currently ~12-14%). Prioritise accuracy for:',
    '- Sugar content (goal: <25g/day total) — flag hidden sugars in processed foods',
    '- Sodium content (goal: <2000mg/day) — common in German processed meats, bread, sauces',
    '- Protein content (key for lean muscle building)',
    'The user shops at German stores: REWE, ALDI, LIDL, NETTO, Penny, Edeka.',
    'Use German product sizes and realistic German portion sizes.',
    germanCtx,
  ].filter(Boolean).join('\n\n')

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model, stream: false, format: 'json',
      messages: [{
        role: 'user',
        content: `${systemContext}

You are a precision nutrition expert. Parse this food/meal and return ONLY valid JSON (no markdown):

Food: "${input}"

{"food_name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium_mg":0}

Rules:
- Be very precise, especially for sugar and sodium
- If multiple items, sum all values
- Use realistic German grocery store portions (e.g. Magerquark 200g, Vollkornbrot 50g slice)
- If a product is from REWE/ALDI/LIDL, use their actual product nutrition data from the reference`,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  const content = data.message?.content ?? data.response ?? ''
  const parsed = typeof content === 'string' ? JSON.parse(content) : content
  return {
    food_name:  String(parsed.food_name ?? input),
    calories:   Math.round(Number(parsed.calories) || 0),
    protein:    Math.round(Number(parsed.protein) * 10) / 10,
    carbs:      Math.round(Number(parsed.carbs) * 10) / 10,
    fat:        Math.round(Number(parsed.fat) * 10) / 10,
    fiber:      Math.round(Number(parsed.fiber) * 10) / 10,
    sugar:      Math.round(Number(parsed.sugar) * 10) / 10,
    sodium_mg:  Math.round(Number(parsed.sodium_mg) || 0),
  }
}

export async function parseFood(input: string): Promise<FoodNutrition> {
  if (await isOllamaRunning()) return parseFoodWithOllama(input)

  const key = process.env.NEXT_PUBLIC_CALORIE_NINJAS_API_KEY
  if (key && key !== 'your_key_here') {
    const res = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(input)}`,
      { headers: { 'X-Api-Key': key } }
    )
    if (res.ok) {
      const data = await res.json()
      const items = data.items ?? []
      if (items.length) {
        type Item = { calories: number; protein_g: number; carbohydrates_total_g: number; fat_total_g: number; fiber_g: number; sugar_g: number; sodium_mg: number; name: string }
        const t = items.reduce((a: FoodNutrition, i: Item) => ({
          food_name: '', calories: a.calories + i.calories, protein: a.protein + i.protein_g,
          carbs: a.carbs + i.carbohydrates_total_g, fat: a.fat + i.fat_total_g,
          fiber: a.fiber + i.fiber_g, sugar: a.sugar + i.sugar_g, sodium_mg: a.sodium_mg + i.sodium_mg,
        }), { food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 })
        return { ...t, food_name: items.map((i: Item) => i.name).join(', ') }
      }
    }
  }
  throw new Error('no_ai')
}

// ─── Food / Nutrition AI Summary ─────────────────────────────────
export interface FoodSummary {
  headline: string
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  insight: string
  tip: string
  highlight: string
  // Self-learning fields (stored in AIMemory)
  foodHabit?: string   // key food pattern observed today
  concern?: string     // any nutrition concern to remember
}

export async function getFoodSummary(entries: FoodEntry[]): Promise<FoodSummary | null> {
  if (!(await isOllamaRunning())) return null
  if (entries.length < 1) return null

  const totalCal    = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
  const totalProtein = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0))
  const totalCarbs  = Math.round(entries.reduce((s, e) => s + (e.carbs ?? 0), 0))
  const totalFat    = Math.round(entries.reduce((s, e) => s + (e.fat ?? 0), 0))
  const totalFiber  = Math.round(entries.reduce((s, e) => s + (e.fiber ?? 0), 0))
  const totalSugar  = Math.round(entries.reduce((s, e) => s + (e.sugar ?? 0), 0))
  const totalSodium = Math.round(entries.reduce((s, e) => s + (e.sodium_mg ?? 0), 0))
  const foods = entries.map(e => e.food_name ?? e.raw_input).join(', ')

  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const memCtx = buildMemoryContext()
  const tdee = profile.weightKg && profile.heightCm && profile.age
    ? Math.round((10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5) * 1.55)
    : 2200
  const proteinTarget = profile.weightKg ? Math.round(profile.weightKg * 2.0) : 160

  const prompt = `You are a precision personal nutrition coach and physique trainer. Analyse today's food log.

${profileCtx}

${memCtx}

TODAY'S FOOD LOG (Germany):
Items: ${foods}
Totals: ${totalCal} kcal | ${totalProtein}g protein | ${totalCarbs}g carbs | ${totalFat}g fat | ${totalFiber}g fiber | ${totalSugar}g sugar | ${totalSodium}mg sodium

TARGETS:
- Calories: ~${tdee} kcal (TDEE)
- Protein: ${proteinTarget}g/day (2g per kg bodyweight for lean muscle)
- Sugar: <25g/day (STRICT - clean diet, sub-10% BF goal)
- Sodium: <2000mg/day (clean eating)
- Fiber: >30g/day

ANALYSIS PRIORITIES (in order):
1. Was protein high enough for muscle retention/growth?
2. Was sugar under 25g? (critical for fat loss to 10% BF)
3. Was sodium under 2000mg? (water retention affects definition)
4. Were calories appropriate for the goal?
5. Food quality — whole foods vs processed?

Respond ONLY with valid JSON, no markdown:
{"headline":"punchy 8-word max sentence","rating":"excellent|good|fair|poor","insight":"2 specific sentences about today — mention actual numbers for protein/sugar/sodium if notable","tip":"one very specific actionable tip for tomorrow referencing actual foods or German grocery items","highlight":"the single best food choice today and why","foodHabit":"one short food pattern observation to remember about this user (for future coaching)","concern":"one nutrition concern to remember if any, else empty string"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    // Store patterns for self-learning
    if (parsed.foodHabit) appendAIMemory({ foodHabit: String(parsed.foodHabit) })
    if (parsed.concern)   appendAIMemory({ concern: String(parsed.concern) })

    return {
      headline:  String(parsed.headline ?? ''),
      rating: (['excellent', 'good', 'fair', 'poor'].includes(parsed.rating) ? parsed.rating : 'fair') as FoodSummary['rating'],
      insight:   String(parsed.insight ?? ''),
      tip:       String(parsed.tip ?? ''),
      highlight: String(parsed.highlight ?? ''),
      foodHabit: parsed.foodHabit ? String(parsed.foodHabit) : undefined,
      concern:   parsed.concern ? String(parsed.concern) : undefined,
    }
  } catch { return null }
}

// ─── Life AI Summary ─────────────────────────────────────────────
export interface LifeSummary {
  headline: string
  insight: string
  suggestion: string
  label: 'peak' | 'strong' | 'growing' | 'needs_work'
  pattern: string
}

export async function getLifeSummary(logs: DailyLog[], food: FoodEntry[]): Promise<LifeSummary | null> {
  if (!(await isOllamaRunning())) return null

  const n = logs.length
  if (n < 2) return null

  const gymRate    = Math.round(logs.filter(l => l.gym_done).length / n * 100)
  const studyRate  = Math.round(logs.filter(l => l.study_done).length / n * 100)
  const amRate     = Math.round(logs.filter(l => l.skincare_am).length / n * 100)
  const pmRate     = Math.round(logs.filter(l => l.skincare_pm).length / n * 100)
  const avgSleep   = logs.filter(l => l.sleep_hours).length > 0
    ? (logs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / logs.filter(l => l.sleep_hours).length).toFixed(1)
    : 'not tracked'
  const avgWater   = (logs.reduce((s, l) => s + (l.water_glasses ?? 0), 0) / n).toFixed(1)
  const avgScore   = Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / n)
  const avgMood    = logs.filter(l => l.mood).length
    ? (logs.reduce((s, l) => s + (l.mood ?? 0), 0) / logs.filter(l => l.mood).length).toFixed(1)
    : 'not tracked'

  const last7 = logs.slice(0, 7)
  const last7Score = last7.length ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length) : 0
  const trend = last7Score > avgScore ? 'improving' : last7Score < avgScore ? 'declining' : 'steady'

  const avgCal    = food.length ? Math.round(food.reduce((s, f) => s + (f.calories ?? 0), 0) / n) : 0
  const avgSugar  = food.length ? Math.round(food.reduce((s, f) => s + (f.sugar ?? 0), 0) / n) : 0
  const avgSodium = food.length ? Math.round(food.reduce((s, f) => s + (f.sodium_mg ?? 0), 0) / n) : 0

  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const memCtx = buildMemoryContext()

  const prompt = `You are a personal life coach and physique trainer AI. Analyse this person's life data.

${profileCtx}

${memCtx}

PERFORMANCE DATA (last ${n} days):
- Gym attendance: ${gymRate}% days (target: ${(profile.gymTargetDays ?? 4) * 14}% = ${profile.gymTargetDays ?? 4}x/week)
- Study: ${studyRate}% days
- Skincare AM: ${amRate}%, PM: ${pmRate}%
- Average sleep: ${avgSleep}h (target: 8h — critical for body fat reduction & muscle recovery)
- Average water: ${avgWater} glasses/day (target: 8 glasses)
- Average performance score: ${avgScore}/100
- Recent trend (7d vs overall): ${trend}
- Average mood: ${avgMood}/10
- Avg daily calories: ${avgCal > 0 ? avgCal + ' kcal' : 'not tracked'}
- Avg daily sugar: ${avgSugar > 0 ? avgSugar + 'g (target <25g for 10% BF)' : 'not tracked'}
- Avg daily sodium: ${avgSodium > 0 ? avgSodium + 'mg (target <2000mg)' : 'not tracked'}

KEY COACHING PRIORITIES:
1. Gym consistency (biggest lever for 10% BF + lean muscle)
2. Sleep quality (affects cortisol → fat storage, muscle recovery)
3. Nutrition adherence (clean diet, sugar/sodium control)
4. Progressive training + recovery balance

Respond with ONLY valid JSON, no markdown:
{"headline":"punchy 10-word max sentence about overall status","insight":"2-3 sentences with specific numbers — what's their biggest strength and what's holding them back from 10% BF","suggestion":"one very specific actionable tip for the next 7 days — concrete, measurable","label":"peak|strong|growing|needs_work","pattern":"one key behavioral pattern observed about this person","win":"one thing consistently going well to reinforce","challenge":"one recurring challenge to note for future coaching"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(28000),
      body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    // Store patterns for self-learning
    if (parsed.pattern)   appendAIMemory({ pattern: String(parsed.pattern) })
    if (parsed.win)       appendAIMemory({ win: String(parsed.win) })
    if (parsed.challenge) appendAIMemory({ concern: String(parsed.challenge) })

    return {
      headline:   String(parsed.headline ?? ''),
      insight:    String(parsed.insight ?? ''),
      suggestion: String(parsed.suggestion ?? ''),
      label: (['peak', 'strong', 'growing', 'needs_work'].includes(parsed.label) ? parsed.label : 'growing') as LifeSummary['label'],
      pattern:    String(parsed.pattern ?? ''),
    }
  } catch { return null }
}

// ─── Gym AI Coach ─────────────────────────────────────────────
export interface GymCoachResponse {
  rating: 'excellent' | 'good' | 'fair' | 'below_par'
  headline: string
  volume_analysis: string
  overload_tip: string
  next_session: string
  recovery_tip: string
  form_note?: string
}

export async function getGymCoaching(
  session: WorkoutSession,
  history: WorkoutSession[]
): Promise<GymCoachResponse | null> {
  if (!(await isOllamaRunning())) return null

  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const gymKnowledge = getGymKnowledgeContext()
  const memCtx = buildMemoryContext()
  const model = await getBestModel()

  const sessionSummary = session.exercises.map(ex => {
    const setsStr = ex.sets.map((s, i) =>
      `  Set ${i+1}: ${s.reps} reps${s.weight_kg ? ` @ ${s.weight_kg}kg` : ' (bodyweight)'}`
    ).join('\n')
    const totalVol = ex.sets.reduce((sum, s) => sum + s.reps * (s.weight_kg ?? 0), 0)
    return `${ex.name}${ex.muscle_group ? ` [${ex.muscle_group}]` : ''}:\n${setsStr}\n  Volume: ${totalVol > 0 ? `${totalVol}kg` : `${ex.sets.reduce((s, set) => s + set.reps, 0)} total reps`}`
  }).join('\n\n')

  const historyCtx = history.slice(0, 5).map(h => {
    const exNames = h.exercises.map(e => {
      const top = e.sets.reduce((best, s) => (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best, e.sets[0])
      return `${e.name}: ${top?.reps}r×${top?.weight_kg ?? 'BW'}kg`
    }).join(', ')
    return `${h.date}: [${exNames}]${h.duration_min ? ` ${h.duration_min}min` : ''}`
  }).join('\n')

  const prompt = `${gymKnowledge}

${profileCtx}
${memCtx}

YOU ARE: An elite physique coach specialising in body recomposition — lean muscle + <10% BF. This user is currently ~${profile.bodyFatPct ?? 13}% BF targeting ${profile.targetBodyFatPct ?? 10}%.

TODAY'S SESSION (${session.date}):
Duration: ${session.duration_min ? `${session.duration_min} minutes` : 'not recorded'}

${sessionSummary}

RECENT HISTORY:
${historyCtx || 'First session logged'}

Respond ONLY with valid JSON:
{"rating":"excellent|good|fair|below_par","headline":"max 8 words","volume_analysis":"2 sentences on volume adequacy and muscle balance","overload_tip":"SPECIFIC: exact exercise + weight/rep target for next session","next_session":"what muscle groups + why, based on recovery logic","recovery_tip":"specific recovery advice for today/tonight","form_note":"technique note if sets/weights suggest an issue, else empty string"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    if (parsed.overload_tip) appendAIMemory({ pattern: `Gym: ${String(parsed.overload_tip)}` })
    return {
      rating: (['excellent','good','fair','below_par'].includes(parsed.rating) ? parsed.rating : 'good') as GymCoachResponse['rating'],
      headline:        String(parsed.headline ?? ''),
      volume_analysis: String(parsed.volume_analysis ?? ''),
      overload_tip:    String(parsed.overload_tip ?? ''),
      next_session:    String(parsed.next_session ?? ''),
      recovery_tip:    String(parsed.recovery_tip ?? ''),
      form_note:       parsed.form_note ? String(parsed.form_note) : undefined,
    }
  } catch { return null }
}
