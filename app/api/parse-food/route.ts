import { NextRequest, NextResponse } from 'next/server'

// CalorieNinjas — free tier: 10,000 req/month, no credit card
// Get your free key at https://calorieninjas.com/api
// Set CALORIE_NINJAS_API_KEY in .env.local

export async function POST(req: NextRequest) {
  const { input } = await req.json()
  if (!input?.trim()) return NextResponse.json({ error: 'No input' }, { status: 400 })

  const apiKey = process.env.CALORIE_NINJAS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'CALORIE_NINJAS_API_KEY not set in .env.local' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(input.trim())}`,
      { headers: { 'X-Api-Key': apiKey } }
    )

    if (!res.ok) throw new Error(`API error: ${res.status}`)

    const data = await res.json()
    const items: {
      name: string; calories: number; protein_g: number; carbohydrates_total_g: number;
      fat_total_g: number; fiber_g: number; sugar_g: number; sodium_mg: number
    }[] = data.items ?? []

    if (items.length === 0) {
      return NextResponse.json({ error: 'Food not found — try a more specific name' }, { status: 404 })
    }

    // Sum all items
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein_g,
        carbs: acc.carbs + item.carbohydrates_total_g,
        fat: acc.fat + item.fat_total_g,
        fiber: acc.fiber + item.fiber_g,
        sugar: acc.sugar + item.sugar_g,
        sodium_mg: acc.sodium_mg + item.sodium_mg,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 }
    )

    const food_name = items.map(i => i.name).join(', ')

    return NextResponse.json({
      food_name,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
      sugar: Math.round(totals.sugar * 10) / 10,
      sodium_mg: Math.round(totals.sodium_mg),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
