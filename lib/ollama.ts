// Local AI via Ollama — no tokens, no API keys, runs on your Mac
// Install: brew install ollama && ollama pull llama3.2:3b
// Docs: https://ollama.com

const OLLAMA_BASE = 'http://127.0.0.1:11434'

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

// Returns best available model for the task
async function getBestModel(): Promise<string> {
  const models = await getOllamaModels()
  const preferred = ['llama3.2:3b', 'llama3.2', 'llama3.1', 'llama3', 'gemma3:4b', 'gemma3', 'mistral', 'phi3', 'phi4']
  for (const p of preferred) {
    if (models.some(m => m.startsWith(p))) return models.find(m => m.startsWith(p))!
  }
  return models[0] ?? 'llama3.2'
}

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

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [{
        role: 'user',
        content: `You are a nutrition expert. Parse this food input and return a JSON object with realistic nutritional estimates.

Food input: "${input}"

Return ONLY this JSON structure (no extra text, no markdown):
{
  "food_name": "clean display name for the food",
  "calories": <integer, total calories>,
  "protein": <decimal, grams of protein>,
  "carbs": <decimal, grams of carbohydrates>,
  "fat": <decimal, grams of fat>,
  "fiber": <decimal, grams of fiber>,
  "sugar": <decimal, grams of sugar>,
  "sodium_mg": <integer, milligrams of sodium>
}

Be realistic about portion sizes. If multiple foods, sum all values.`
      }],
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()

  const content = data.message?.content ?? data.response ?? ''
  const parsed = typeof content === 'string' ? JSON.parse(content) : content

  return {
    food_name: String(parsed.food_name ?? input),
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round(Number(parsed.protein) * 10) / 10,
    carbs: Math.round(Number(parsed.carbs) * 10) / 10,
    fat: Math.round(Number(parsed.fat) * 10) / 10,
    fiber: Math.round(Number(parsed.fiber) * 10) / 10,
    sugar: Math.round(Number(parsed.sugar) * 10) / 10,
    sodium_mg: Math.round(Number(parsed.sodium_mg) || 0),
  }
}

export async function parseFood(input: string): Promise<FoodNutrition> {
  // 1. Try Ollama (local, free, private)
  if (await isOllamaRunning()) {
    return parseFoodWithOllama(input)
  }

  // 2. Fall back to CalorieNinjas if key set
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
        const t = items.reduce((a: FoodNutrition, i: { calories: number; protein_g: number; carbohydrates_total_g: number; fat_total_g: number; fiber_g: number; sugar_g: number; sodium_mg: number; name: string }) => ({
          food_name: '', calories: a.calories + i.calories, protein: a.protein + i.protein_g,
          carbs: a.carbs + i.carbohydrates_total_g, fat: a.fat + i.fat_total_g,
          fiber: a.fiber + i.fiber_g, sugar: a.sugar + i.sugar_g, sodium_mg: a.sodium_mg + i.sodium_mg,
        }), { food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 })
        return { ...t, food_name: items.map((i: { name: string }) => i.name).join(', ') }
      }
    }
  }

  throw new Error('no_ai')
}
