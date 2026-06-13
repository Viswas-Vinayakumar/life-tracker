// German grocery store food database
// Sources: REWE, ALDI Süd/Nord, LIDL, NETTO, Penny product nutritional labels
// All values per 100g unless noted. Common German portion sizes included.

export interface GermanFoodItem {
  name: string          // German product name
  nameEn: string        // English equivalent
  stores: string[]      // Where typically found
  tags: string[]        // e.g. ['breakfast', 'protein', 'dairy']
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  serving?: { grams: number; label: string }
}

export const GERMAN_FOODS: GermanFoodItem[] = [
  // ── Dairy & Protein ──────────────────────────────────────────
  { name: 'Magerquark', nameEn: 'Low-fat quark (0.2% fat)', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','snack','protein','dairy'],
    per100g: { calories: 67, protein: 12, carbs: 4, fat: 0.2, fiber: 0 },
    serving: { grams: 250, label: '1 Becher (250g)' } },

  { name: 'Quark (20% Fett i.Tr.)', nameEn: 'Quark 20% fat in dry matter', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast','snack','dairy'],
    per100g: { calories: 104, protein: 11, carbs: 4, fat: 5, fiber: 0 },
    serving: { grams: 250, label: '1 Becher (250g)' } },

  { name: 'Speisequark (40% Fett i.Tr.)', nameEn: 'Full-fat quark', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dairy'],
    per100g: { calories: 142, protein: 9, carbs: 4, fat: 9, fiber: 0 },
    serving: { grams: 250, label: '1 Becher (250g)' } },

  { name: 'Skyr (Milbona/Arla)', nameEn: 'Skyr Icelandic-style yogurt', stores: ['LIDL','REWE'],
    tags: ['breakfast','snack','protein','dairy'],
    per100g: { calories: 63, protein: 11, carbs: 4, fat: 0.2, fiber: 0 },
    serving: { grams: 200, label: '1 Becher (200g)' } },

  { name: 'Müller Milchreis', nameEn: 'Müller rice pudding', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','dairy'],
    per100g: { calories: 113, protein: 3.5, carbs: 18, fat: 3.2, fiber: 0 },
    serving: { grams: 200, label: '1 Becher (200g)' } },

  { name: 'Müller Joghurt mit Ecke', nameEn: 'Müller Corner yogurt', stores: ['REWE','ALDI','NETTO'],
    tags: ['snack','dairy'],
    per100g: { calories: 120, protein: 4, carbs: 18, fat: 3.5, fiber: 0 },
    serving: { grams: 150, label: '1 Becher (150g)' } },

  { name: 'Danone Activia Joghurt', nameEn: 'Danone Activia yogurt', stores: ['REWE','ALDI','NETTO'],
    tags: ['breakfast','snack','dairy'],
    per100g: { calories: 73, protein: 4, carbs: 9, fat: 2, fiber: 0 },
    serving: { grams: 125, label: '1 Becher (125g)' } },

  { name: 'Griechischer Joghurt (REWE Beste Wahl / Fage)', nameEn: 'Greek yogurt', stores: ['REWE','LIDL'],
    tags: ['breakfast','snack','protein','dairy'],
    per100g: { calories: 115, protein: 7, carbs: 4, fat: 7.5, fiber: 0 },
    serving: { grams: 150, label: '1 Portion (150g)' } },

  { name: 'Hüttenkäse', nameEn: 'Cottage cheese', stores: ['REWE','ALDI','LIDL'],
    tags: ['snack','protein','dairy'],
    per100g: { calories: 96, protein: 11, carbs: 3, fat: 4, fiber: 0 },
    serving: { grams: 200, label: '1 Becher (200g)' } },

  { name: 'Gouda jung (Scheibe)', nameEn: 'Young Gouda cheese slice', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','dairy'],
    per100g: { calories: 356, protein: 25, carbs: 0.5, fat: 28, fiber: 0 },
    serving: { grams: 30, label: '1 Scheibe (30g)' } },

  { name: 'Emmentaler', nameEn: 'Emmental cheese', stores: ['REWE','ALDI','LIDL'],
    tags: ['dairy'],
    per100g: { calories: 380, protein: 29, carbs: 0.5, fat: 30, fiber: 0 },
    serving: { grams: 30, label: '1 Scheibe (30g)' } },

  { name: 'Frischkäse (Philadelphia / REWE Bio)', nameEn: 'Cream cheese', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast','dairy'],
    per100g: { calories: 225, protein: 7, carbs: 4, fat: 20, fiber: 0 },
    serving: { grams: 30, label: '1 EL (30g)' } },

  { name: 'Alpro Soja Joghurt Alternative', nameEn: 'Alpro soy yogurt alternative', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast','vegan','dairy-free'],
    per100g: { calories: 60, protein: 3.8, carbs: 6, fat: 2, fiber: 0.5 },
    serving: { grams: 150, label: '1 Portion (150g)' } },

  { name: 'Hähnchenbrust (frisch)', nameEn: 'Chicken breast (fresh)', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['lunch','dinner','protein','meat'],
    per100g: { calories: 110, protein: 23, carbs: 0, fat: 2, fiber: 0 },
    serving: { grams: 150, label: '1 Brust (150g)' } },

  { name: 'Putenbrust (Aufschnitt)', nameEn: 'Turkey breast deli slices', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['lunch','protein','meat'],
    per100g: { calories: 105, protein: 22, carbs: 1, fat: 1.5, fiber: 0 },
    serving: { grams: 80, label: '3 Scheiben (80g)' } },

  { name: 'Lachs (Frische / tiefgekühlt)', nameEn: 'Salmon fillet', stores: ['REWE','ALDI','LIDL'],
    tags: ['lunch','dinner','protein','fish'],
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 14, fiber: 0 },
    serving: { grams: 150, label: '1 Filet (150g)' } },

  { name: 'Thunfisch in Wasser (Dose)', nameEn: 'Canned tuna in water', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['lunch','protein','fish'],
    per100g: { calories: 110, protein: 25, carbs: 0, fat: 1, fiber: 0 },
    serving: { grams: 130, label: '1 Dose abgetropft (130g)' } },

  { name: 'Eier (Klasse M)', nameEn: 'Medium eggs', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','lunch','protein'],
    per100g: { calories: 143, protein: 13, carbs: 0.7, fat: 10, fiber: 0 },
    serving: { grams: 60, label: '1 Ei Klasse M (60g)' } },

  { name: 'Bratwurst (Thüringer)', nameEn: 'Thuringian sausage', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dinner','meat'],
    per100g: { calories: 305, protein: 15, carbs: 1, fat: 26, fiber: 0 },
    serving: { grams: 100, label: '1 Bratwurst (100g)' } },

  { name: 'Mett (Hackepeter)', nameEn: 'Raw seasoned minced pork', stores: ['REWE','ALDI','NETTO'],
    tags: ['breakfast','meat'],
    per100g: { calories: 212, protein: 16, carbs: 0, fat: 17, fiber: 0 },
    serving: { grams: 80, label: '1 Portion (80g)' } },

  // ── Bread & Bakery ───────────────────────────────────────────
  { name: 'Vollkornbrot (Schwarzbrot)', nameEn: 'Wholegrain rye bread', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','lunch','bread'],
    per100g: { calories: 215, protein: 7, carbs: 38, fat: 2, fiber: 7 },
    serving: { grams: 50, label: '1 Scheibe (50g)' } },

  { name: 'Toastbrot (Sandwich/Harry\'s)', nameEn: 'White toast bread', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','bread'],
    per100g: { calories: 255, protein: 8, carbs: 46, fat: 3, fiber: 2 },
    serving: { grams: 30, label: '1 Scheibe (30g)' } },

  { name: 'Vollkorntoast', nameEn: 'Whole grain toast', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast','bread'],
    per100g: { calories: 237, protein: 9, carbs: 40, fat: 3, fiber: 6 },
    serving: { grams: 30, label: '1 Scheibe (30g)' } },

  { name: 'Brötchen (Weizenbrötchen)', nameEn: 'White bread roll', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','bread'],
    per100g: { calories: 270, protein: 9, carbs: 52, fat: 2, fiber: 2 },
    serving: { grams: 55, label: '1 Brötchen (55g)' } },

  { name: 'Knäckebrot (Wasa/Aldi)', nameEn: 'Crispbread / Ryvita', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','bread'],
    per100g: { calories: 340, protein: 10, carbs: 64, fat: 2, fiber: 14 },
    serving: { grams: 20, label: '2 Scheiben (20g)' } },

  { name: 'Laugenbrezel (Bäckerei)', nameEn: 'Pretzel', stores: ['REWE','ALDI','Bäckerei'],
    tags: ['snack','bread'],
    per100g: { calories: 280, protein: 8, carbs: 55, fat: 2, fiber: 2 },
    serving: { grams: 100, label: '1 Brezel (100g)' } },

  // ── Cereals & Breakfast ──────────────────────────────────────
  { name: 'Kölln Haferflocken (zart)', nameEn: 'Kölln rolled oats fine', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','vegan'],
    per100g: { calories: 366, protein: 13, carbs: 59, fat: 7, fiber: 10 },
    serving: { grams: 50, label: '1 Portion (50g)' } },

  { name: 'Seitenbacher Müsli', nameEn: 'Seitenbacher muesli', stores: ['REWE','ALDI','NETTO'],
    tags: ['breakfast'],
    per100g: { calories: 360, protein: 9, carbs: 60, fat: 7, fiber: 9 },
    serving: { grams: 60, label: '1 Portion (60g)' } },

  { name: 'Granola (REWE/ALDI)', nameEn: 'Crunchy granola', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast'],
    per100g: { calories: 420, protein: 7, carbs: 64, fat: 14, fiber: 5 },
    serving: { grams: 50, label: '1 Portion (50g)' } },

  // ── Produce & Staples ────────────────────────────────────────
  { name: 'Kartoffeln (mehligkochend)', nameEn: 'Floury potatoes', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dinner','vegan','carbs'],
    per100g: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2 },
    serving: { grams: 200, label: '2 mittelgroße Kartoffeln (200g)' } },

  { name: 'Süßkartoffel', nameEn: 'Sweet potato', stores: ['REWE','ALDI','LIDL'],
    tags: ['dinner','vegan','carbs'],
    per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
    serving: { grams: 200, label: '1 mittlere Süßkartoffel (200g)' } },

  { name: 'Basmati Reis (gekocht)', nameEn: 'Basmati rice cooked', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dinner','lunch','vegan'],
    per100g: { calories: 130, protein: 3, carbs: 28, fat: 0.3, fiber: 0.4 },
    serving: { grams: 180, label: '1 Portion gekocht (180g)' } },

  { name: 'Nudeln (gekocht, Barilla/Birkel)', nameEn: 'Pasta cooked', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dinner','lunch','vegan'],
    per100g: { calories: 131, protein: 5, carbs: 25, fat: 1, fiber: 1.8 },
    serving: { grams: 220, label: '1 Portion gekocht (220g)' } },

  { name: 'Vollkornnudeln (gekocht)', nameEn: 'Whole wheat pasta cooked', stores: ['REWE','ALDI','LIDL'],
    tags: ['dinner','lunch','vegan'],
    per100g: { calories: 124, protein: 5, carbs: 23, fat: 1, fiber: 4 },
    serving: { grams: 220, label: '1 Portion gekocht (220g)' } },

  // ── Convenience & Fast Food ──────────────────────────────────
  { name: 'Döner Kebab (mit Fladenbrot)', nameEn: 'Doner kebab in flatbread', stores: ['Imbiss'],
    tags: ['lunch','dinner','meat'],
    per100g: { calories: 220, protein: 13, carbs: 20, fat: 10, fiber: 1 },
    serving: { grams: 400, label: '1 Döner (ca. 400g)' } },

  { name: 'Currywurst mit Pommes', nameEn: 'Currywurst with fries', stores: ['Imbiss','REWE Bistro'],
    tags: ['lunch','dinner','meat'],
    per100g: { calories: 230, protein: 9, carbs: 18, fat: 14, fiber: 1 },
    serving: { grams: 350, label: '1 Portion Currywurst+Pommes (350g)' } },

  { name: 'Schnitzel (paniert, gebraten)', nameEn: 'Breaded pork schnitzel', stores: ['REWE','ALDI','LIDL','Restaurant'],
    tags: ['dinner','meat'],
    per100g: { calories: 285, protein: 22, carbs: 12, fat: 16, fiber: 0.5 },
    serving: { grams: 180, label: '1 Schnitzel (180g)' } },

  { name: 'Pizza (tiefgekühlt, Dr. Oetker Ristorante)', nameEn: 'Frozen pizza Dr. Oetker Ristorante', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['dinner'],
    per100g: { calories: 245, protein: 10, carbs: 30, fat: 9, fiber: 2 },
    serving: { grams: 320, label: '1 Pizza (320g)' } },

  { name: 'REWE Beste Wahl Proteinriegel', nameEn: 'REWE protein bar', stores: ['REWE'],
    tags: ['snack','protein'],
    per100g: { calories: 365, protein: 30, carbs: 38, fat: 8, fiber: 3 },
    serving: { grams: 55, label: '1 Riegel (55g)' } },

  // ── Snacks & Sweets ──────────────────────────────────────────
  { name: 'Milka Schokolade (100g Tafel)', nameEn: 'Milka chocolate bar', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','sweet'],
    per100g: { calories: 535, protein: 7, carbs: 58, fat: 30, fiber: 1.5 },
    serving: { grams: 25, label: '2 Rippen (25g)' } },

  { name: 'Haribo Goldbären', nameEn: 'Haribo Gold Bears gummy candy', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','sweet'],
    per100g: { calories: 340, protein: 6, carbs: 77, fat: 0.5, fiber: 0 },
    serving: { grams: 50, label: '1 Portion (50g)' } },

  { name: 'Bifi Original (Salami Snack)', nameEn: 'Bifi salami snack stick', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['snack','meat'],
    per100g: { calories: 455, protein: 21, carbs: 1, fat: 40, fiber: 0 },
    serving: { grams: 22, label: '1 Stück (22g)' } },

  // ── Drinks ───────────────────────────────────────────────────
  { name: 'Milch 3,5% (frisch)', nameEn: 'Whole milk 3.5%', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['breakfast','dairy','drink'],
    per100g: { calories: 66, protein: 3.4, carbs: 4.8, fat: 3.8, fiber: 0 },
    serving: { grams: 250, label: '1 Glas (250ml)' } },

  { name: 'Hafermilch (Oatly / REWE Bio)', nameEn: 'Oat milk', stores: ['REWE','ALDI','LIDL'],
    tags: ['breakfast','vegan','dairy-free','drink'],
    per100g: { calories: 45, protein: 1, carbs: 7, fat: 1.5, fiber: 0.8 },
    serving: { grams: 250, label: '1 Glas (250ml)' } },

  { name: 'Protein Shake (weider / Body Attack)', nameEn: 'Whey protein shake', stores: ['REWE','online'],
    tags: ['snack','protein','drink'],
    per100g: { calories: 390, protein: 75, carbs: 8, fat: 6, fiber: 1 },
    serving: { grams: 35, label: '1 Messlöffel in 300ml Wasser (35g Pulver)' } },

  { name: 'Apfelsaft naturtrüb (Rauch/Eckes)', nameEn: 'Apple juice cloudy', stores: ['REWE','ALDI','LIDL','NETTO'],
    tags: ['drink'],
    per100g: { calories: 46, protein: 0.3, carbs: 11, fat: 0.1, fiber: 0 },
    serving: { grams: 200, label: '1 Glas (200ml)' } },
]

// Build a lookup map: name variants → nutrition
const FOOD_LOOKUP = new Map<string, GermanFoodItem>()
for (const item of GERMAN_FOODS) {
  FOOD_LOOKUP.set(item.name.toLowerCase(), item)
  FOOD_LOOKUP.set(item.nameEn.toLowerCase(), item)
  // Also index first word of name
  FOOD_LOOKUP.set(item.name.split(' ')[0].toLowerCase(), item)
}

export function lookupGermanFood(query: string): GermanFoodItem | null {
  const q = query.toLowerCase().trim()
  // Exact match first
  if (FOOD_LOOKUP.has(q)) return FOOD_LOOKUP.get(q)!
  // Partial match
  for (const [key, item] of FOOD_LOOKUP) {
    if (q.includes(key) || key.includes(q)) return item
  }
  return null
}

// Returns a compact summary string for Ollama prompts
export function getGermanFoodContext(): string {
  const sample = GERMAN_FOODS.slice(0, 20).map(f =>
    `${f.name}: ${f.per100g.calories}kcal, P${f.per100g.protein}g, C${f.per100g.carbs}g, F${f.per100g.fat}g per 100g`
  ).join('\n')
  return `Common German grocery items for reference:\n${sample}`
}
