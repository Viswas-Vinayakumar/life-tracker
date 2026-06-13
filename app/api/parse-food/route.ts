import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { input } = await req.json()
  if (!input?.trim()) return NextResponse.json({ error: 'No input' }, { status: 400 })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Parse this food input and return ONLY a JSON object with nutritional estimates. Be realistic with portions. If multiple foods, sum all values.

Food: "${input}"

Return ONLY this JSON (no markdown, no explanation):
{
  "food_name": "clean display name",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium_mg": number
}`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 })
  }
}
