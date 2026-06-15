// Tests for nutritionLookup — run with:
//   node --experimental-strip-types lib/__tests__/nutritionLookup.test.ts
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { lookupFood, parseNutritionLocally } from '../nutritionLookup.ts'

// ── lookupFood ────────────────────────────────────────────────────

describe('lookupFood', () => {
  test('exact alias: black coffee', () => {
    const f = lookupFood('black coffee')
    assert.ok(f, 'should find black coffee')
    assert.equal(f!.name, 'Black Coffee')
    assert.equal(f!.per100g.calories, 1)
  })

  test('alias with extra words: black coffee without sugar', () => {
    const f = lookupFood('black coffee without sugar')
    assert.ok(f, 'should find coffee via alias')
    assert.equal(f!.name, 'Black Coffee')
  })

  test('exact alias: hard boiled egg', () => {
    const f = lookupFood('hard boiled egg')
    assert.ok(f, 'should find hard boiled egg')
    assert.equal(f!.name, 'Hard Boiled Egg')
    assert.equal(f!.per100g.calories, 155)
  })

  test('plural: hard boiled eggs', () => {
    const f = lookupFood('hard boiled eggs')
    assert.ok(f, 'should find hard boiled eggs (plural)')
    assert.equal(f!.name, 'Hard Boiled Egg')
  })

  test('frozen pommes', () => {
    const f = lookupFood('frozen pommes')
    assert.ok(f, 'should find frozen pommes')
    assert.ok(f!.per100g.calories > 100, `expected >100 kcal/100g, got ${f!.per100g.calories}`)
  })

  test('pommes air fried', () => {
    const f = lookupFood('pommes air fried')
    assert.ok(f, 'should find pommes via air fried alias lookup')
    assert.ok(f!.per100g.calories > 100)
  })

  test('Pommes Air fried (mixed case with trailing text)', () => {
    const f = lookupFood('Pommes Air fried')
    assert.ok(f, 'should find pommes case-insensitively')
  })

  test('unknown food returns null', () => {
    const f = lookupFood('xyzzy unobtainium surprise')
    assert.equal(f, null, 'should return null for unknown food')
  })

  test('chicken breast', () => {
    const f = lookupFood('chicken breast')
    assert.ok(f)
    assert.ok(f!.per100g.calories >= 130)
  })
})

// ── parseNutritionLocally ─────────────────────────────────────────

describe('parseNutritionLocally', () => {
  test('3 hard boiled eggs → ~234 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('3 hard boiled eggs')
    assert.ok(matchedAll, 'should match fully')
    // 3 × 50g × (155/100) = 232.5 → 233 kcal
    assert.ok(result.calories >= 220 && result.calories <= 250,
      `expected 220-250 kcal for 3 hard boiled eggs, got ${result.calories}`)
    assert.ok(result.protein >= 15, `expected protein ≥15g, got ${result.protein}`)
  })

  test('200g frozen pommes → ~290 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('Frozen pommes Air fried ~200 gms')
    assert.ok(matchedAll, 'should match fully')
    // 200g × 145/100 = 290 kcal
    assert.ok(result.calories >= 240 && result.calories <= 340,
      `expected 240-340 kcal for 200g pommes, got ${result.calories}`)
  })

  test('black coffee → near-zero calories', () => {
    const { result, matchedAll } = parseNutritionLocally('black coffee without sugar')
    assert.ok(matchedAll, 'should match fully')
    assert.ok(result.calories <= 5, `expected ≤5 kcal for black coffee, got ${result.calories}`)
  })

  test('multi-item: black coffee + pommes + 3 eggs', () => {
    const { result, matchedAll, matchedAny } = parseNutritionLocally(
      'black coffee without sugar, Frozen pommes Air fried ~200 gms, 3 hard boiled eggs.'
    )
    assert.ok(matchedAny, 'should match at least some items')
    // Rough total: ~2 + 290 + 233 = ~525 kcal
    assert.ok(result.calories >= 400 && result.calories <= 650,
      `expected 400-650 kcal total, got ${result.calories}`)
    assert.ok(result.protein >= 15, `total protein should be ≥15g, got ${result.protein}`)
    assert.ok(result.carbs >= 20, `total carbs should be ≥20g, got ${result.carbs}`)
  })

  test('Pommes Air fried ~200 gms (standalone)', () => {
    const { result, matchedAll } = parseNutritionLocally('Pommes Air fried ~200 gms')
    assert.ok(matchedAll, 'should match')
    assert.ok(result.calories >= 240 && result.calories <= 340,
      `got ${result.calories}`)
  })

  test('1 banana → ~107 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('banana')
    assert.ok(matchedAll)
    // 120g × 89/100 = 106.8 ≈ 107 kcal
    assert.ok(result.calories >= 90 && result.calories <= 130,
      `expected 90-130 kcal for banana, got ${result.calories}`)
  })

  test('2 bananas', () => {
    const { result } = parseNutritionLocally('2 bananas')
    const single = parseNutritionLocally('banana')
    assert.equal(result.calories, single.result.calories * 2)
  })

  test('150g chicken breast', () => {
    const { result, matchedAll } = parseNutritionLocally('150g chicken breast')
    assert.ok(matchedAll)
    // 150g × 165/100 = 247.5 ≈ 248 kcal
    assert.ok(result.calories >= 220 && result.calories <= 275,
      `got ${result.calories}`)
    assert.ok(result.protein >= 40, `expected ≥40g protein, got ${result.protein}`)
  })

  test('unknown food returns matchedAny=false', () => {
    const { matchedAny } = parseNutritionLocally('xyzzy mystery dish')
    assert.equal(matchedAny, false)
  })

  test('mixed: known + unknown returns matchedAll=false but matchedAny=true', () => {
    const { matchedAny, matchedAll, result } = parseNutritionLocally('3 eggs, mystery alien dish')
    assert.ok(matchedAny, 'eggs should match')
    assert.equal(matchedAll, false, 'alien dish should not match')
    assert.ok(result.calories > 0, 'egg calories should still be counted')
  })
})

// ── Trailing count & extra units ──────────────────────────────────

describe('trailing count and extra units', () => {
  test('"Boiled eggs 3" → 3 eggs = ~233 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('Boiled eggs 3')
    assert.ok(matchedAll, 'should fully match')
    assert.ok(result.calories >= 200 && result.calories <= 270,
      `expected 200-270 kcal for 3 boiled eggs, got ${result.calories}`)
  })

  test('"eggs x3" → 3 eggs', () => {
    const { result } = parseNutritionLocally('eggs x3')
    assert.ok(result.calories >= 200 && result.calories <= 270, `got ${result.calories}`)
  })

  test('"eggs ×3" → same as 3 eggs', () => {
    const a = parseNutritionLocally('eggs ×3')
    const b = parseNutritionLocally('3 eggs')
    assert.equal(a.result.calories, b.result.calories)
  })

  test('150ml milk → ~91 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('150ml milk')
    assert.ok(matchedAll)
    // 150ml × 61/100 = 91.5 ≈ 92 kcal
    assert.ok(result.calories >= 80 && result.calories <= 110, `got ${result.calories}`)
  })

  test('2 tbsp olive oil → ~265 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('2 tbsp olive oil')
    assert.ok(matchedAll)
    // 2 × 15g × 884/100 = 265.2 ≈ 265 kcal
    assert.ok(result.calories >= 240 && result.calories <= 290, `got ${result.calories}`)
  })

  test('1 oz almonds → ~164 kcal', () => {
    const { result, matchedAll } = parseNutritionLocally('1 oz almonds')
    assert.ok(matchedAll)
    // 28.35g × 579/100 = 164.1 ≈ 164 kcal
    assert.ok(result.calories >= 150 && result.calories <= 180, `got ${result.calories}`)
  })

  test('buildQuery: qty+unit combined correctly', () => {
    // Simulate buildQuery logic from the UI
    const buildQuery = (food: string, qty: string, unit: string) => {
      if (!qty || !unit || unit === 'auto') return food
      if (unit === 'pcs') return `${qty} ${food}`
      return `${food} ${qty}${unit}`
    }
    assert.equal(buildQuery('eggs', '3', 'pcs'), '3 eggs')
    assert.equal(buildQuery('chicken breast', '200', 'g'), 'chicken breast 200g')
    assert.equal(buildQuery('olive oil', '2', 'tbsp'), 'olive oil 2tbsp')
    assert.equal(buildQuery('chicken breast', '', 'g'), 'chicken breast') // no qty = no unit appended
  })
})
