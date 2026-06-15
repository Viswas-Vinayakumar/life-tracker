// Local nutrition database — USDA FoodData Central + EU label data
// All per-100g values. No AI required for common foods.

export interface NutritionPer100g {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium_mg: number
}

export interface FoodRecord {
  name: string
  per100g: NutritionPer100g
  servingG: number   // default serving when no quantity given
  aliases: string[]  // all lowercase keyword strings
}

export interface NutritionResult {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium_mg: number
}

const FOODS: FoodRecord[] = [
  // ── Eggs ──────────────────────────────────────────────────────────
  {
    name: 'Hard Boiled Egg',
    per100g: { calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6, fiber: 0, sugar: 1.1, sodium_mg: 124 },
    servingG: 50,
    aliases: ['hard boiled egg', 'hard-boiled egg', 'boiled egg', 'hardboiled egg',
      'hart gekochtes ei', 'hartgekochtes ei', 'gekochtes ei', 'ei', 'eier'],
  },
  {
    name: 'Egg (scrambled)',
    per100g: { calories: 196, protein: 13.6, carbs: 1.6, fat: 15.0, fiber: 0, sugar: 1.6, sodium_mg: 342 },
    servingG: 50,
    aliases: ['scrambled egg', 'fried egg', 'scrambled eggs', 'rührei'],
  },
  {
    name: 'Egg (raw)',
    per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0, sugar: 0.4, sodium_mg: 142 },
    servingG: 50,
    aliases: ['raw egg', 'egg', 'rohes ei'],
  },
  {
    name: 'Egg White',
    per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, sodium_mg: 166 },
    servingG: 33,
    aliases: ['egg white', 'egg whites', 'eiweiß', 'eiklarung'],
  },

  // ── Potatoes & Fries ──────────────────────────────────────────────
  {
    name: 'Frozen Fries (Air Fried)',
    per100g: { calories: 145, protein: 2.2, carbs: 22.5, fat: 5.5, fiber: 2.2, sugar: 0.6, sodium_mg: 240 },
    servingG: 150,
    aliases: [
      'frozen pommes', 'frozen fries', 'air fried fries', 'air fried pommes',
      'pommes air fried', 'tiefkühl pommes', 'tiefgekühlt pommes', 'pommes frites',
      'french fries', 'pommes', 'air fryer fries', 'frozen chips', 'oven fries',
      'tiefkühlfrites', 'fritten',
    ],
  },
  {
    name: 'Potato (boiled)',
    per100g: { calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8, sugar: 0.9, sodium_mg: 6 },
    servingG: 180,
    aliases: ['boiled potato', 'kartoffel', 'kartoffeln', 'potato', 'potatoes', 'gekochte kartoffel'],
  },
  {
    name: 'Sweet Potato (baked)',
    per100g: { calories: 90, protein: 2.0, carbs: 21.0, fat: 0.1, fiber: 3.3, sugar: 4.2, sodium_mg: 36 },
    servingG: 200,
    aliases: ['sweet potato', 'süßkartoffel', 'yam', 'sweetpotato'],
  },

  // ── Coffee & Beverages ────────────────────────────────────────────
  {
    name: 'Black Coffee',
    per100g: { calories: 1, protein: 0.1, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 2 },
    servingG: 240,
    aliases: [
      'black coffee', 'coffee', 'kaffee', 'espresso', 'americano', 'filter coffee',
      'schwarzer kaffee', 'coffee without sugar', 'black coffee without sugar',
      'kaffee ohne zucker', 'lungo', 'drip coffee',
    ],
  },
  {
    name: 'Latte / Cappuccino',
    per100g: { calories: 40, protein: 3.0, carbs: 4.0, fat: 1.5, fiber: 0, sugar: 4.0, sodium_mg: 50 },
    servingG: 240,
    aliases: ['latte', 'cappuccino', 'café latte', 'flat white', 'milchkaffee', 'caffe latte'],
  },
  {
    name: 'Tea (black/green)',
    per100g: { calories: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0, sugar: 0, sodium_mg: 3 },
    servingG: 240,
    aliases: ['tea', 'green tea', 'black tea', 'herbal tea', 'tee', 'grüner tee', 'schwarzer tee', 'chai'],
  },
  {
    name: 'Whole Milk',
    per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 5.1, sodium_mg: 43 },
    servingG: 250,
    aliases: ['whole milk', 'milk', 'milch', 'vollmilch', 'cow milk', 'kuhmilch'],
  },
  {
    name: 'Low-fat Milk',
    per100g: { calories: 42, protein: 3.4, carbs: 5.0, fat: 1.0, fiber: 0, sugar: 5.0, sodium_mg: 44 },
    servingG: 250,
    aliases: ['low fat milk', 'skim milk', 'semi-skimmed milk', 'fettarme milch', '1.5% milk'],
  },
  {
    name: 'Orange Juice',
    per100g: { calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2, sugar: 8.4, sodium_mg: 1 },
    servingG: 200,
    aliases: ['orange juice', 'oj', 'orangensaft', 'fresh orange juice'],
  },
  {
    name: 'Water',
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 5 },
    servingG: 250,
    aliases: ['water', 'wasser', 'sparkling water', 'still water', 'mineral water'],
  },

  // ── Proteins ──────────────────────────────────────────────────────
  {
    name: 'Chicken Breast (grilled)',
    per100g: { calories: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium_mg: 74 },
    servingG: 150,
    aliases: ['chicken breast', 'hähnchenbrust', 'grilled chicken', 'baked chicken',
      'chicken', 'hähnchen', 'huhn', 'hühnerbrust'],
  },
  {
    name: 'Ground Beef (lean)',
    per100g: { calories: 215, protein: 26.1, carbs: 0, fat: 12.0, fiber: 0, sugar: 0, sodium_mg: 75 },
    servingG: 150,
    aliases: ['ground beef', 'hackfleisch', 'beef mince', 'minced beef', 'burger patty', 'beef'],
  },
  {
    name: 'Salmon (fillet)',
    per100g: { calories: 208, protein: 20.0, carbs: 0, fat: 13.4, fiber: 0, sugar: 0, sodium_mg: 59 },
    servingG: 150,
    aliases: ['salmon', 'lachs', 'salmon fillet', 'lachsfilet', 'salmon steak'],
  },
  {
    name: 'Canned Tuna (in water)',
    per100g: { calories: 116, protein: 25.5, carbs: 0, fat: 0.8, fiber: 0, sugar: 0, sodium_mg: 333 },
    servingG: 130,
    aliases: ['tuna', 'thunfisch', 'canned tuna', 'tuna in water', 'thunfisch dose'],
  },
  {
    name: 'Turkey Breast',
    per100g: { calories: 135, protein: 29.9, carbs: 0, fat: 1.0, fiber: 0, sugar: 0, sodium_mg: 59 },
    servingG: 150,
    aliases: ['turkey breast', 'putenbrust', 'turkey', 'pute'],
  },
  {
    name: 'Shrimp / Prawns (cooked)',
    per100g: { calories: 99, protein: 20.9, carbs: 0.9, fat: 1.1, fiber: 0, sugar: 0, sodium_mg: 148 },
    servingG: 100,
    aliases: ['shrimp', 'prawns', 'garnelen', 'crevettes', 'gambas'],
  },
  {
    name: 'Tofu (firm)',
    per100g: { calories: 76, protein: 8.1, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, sodium_mg: 7 },
    servingG: 150,
    aliases: ['tofu', 'firm tofu', 'silken tofu', 'soybean curd'],
  },
  {
    name: 'Bratwurst',
    per100g: { calories: 305, protein: 14.0, carbs: 1.0, fat: 27.0, fiber: 0, sugar: 0.5, sodium_mg: 750 },
    servingG: 100,
    aliases: ['bratwurst', 'sausage', 'wurst', 'würstchen', 'frankfurter'],
  },

  // ── Grains & Carbs ────────────────────────────────────────────────
  {
    name: 'White Rice (cooked)',
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, sugar: 0, sodium_mg: 1 },
    servingG: 180,
    aliases: ['white rice', 'basmati rice', 'jasmine rice', 'reis', 'basmati',
      'gekochter reis', 'cooked rice', 'steamed rice'],
  },
  {
    name: 'Brown Rice (cooked)',
    per100g: { calories: 123, protein: 2.7, carbs: 25.6, fat: 1.0, fiber: 1.8, sugar: 0, sodium_mg: 1 },
    servingG: 180,
    aliases: ['brown rice', 'vollkornreis', 'whole grain rice'],
  },
  {
    name: 'Pasta (cooked)',
    per100g: { calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8, sugar: 0.6, sodium_mg: 1 },
    servingG: 220,
    aliases: ['pasta', 'nudeln', 'spaghetti', 'penne', 'fusilli', 'noodles', 'tagliatelle', 'rigatoni'],
  },
  {
    name: 'Oats (dry)',
    per100g: { calories: 389, protein: 17.0, carbs: 66.0, fat: 7.0, fiber: 10.6, sugar: 1.1, sodium_mg: 2 },
    servingG: 50,
    aliases: ['oats', 'haferflocken', 'rolled oats', 'oatmeal', 'porridge', 'overnight oats'],
  },
  {
    name: 'White Bread',
    per100g: { calories: 265, protein: 9.0, carbs: 49.4, fat: 3.2, fiber: 2.7, sugar: 5.0, sodium_mg: 491 },
    servingG: 30,
    aliases: ['white bread', 'weißbrot', 'toast', 'toast bread', 'toastbrot', 'sandwich bread', 'brot'],
  },
  {
    name: 'Whole Wheat Bread',
    per100g: { calories: 247, protein: 13.0, carbs: 41.0, fat: 3.4, fiber: 6.8, sugar: 5.6, sodium_mg: 480 },
    servingG: 30,
    aliases: ['whole wheat bread', 'wholemeal bread', 'vollkornbrot', 'wholegrain bread', 'dark bread'],
  },

  // ── Vegetables ────────────────────────────────────────────────────
  {
    name: 'Broccoli',
    per100g: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium_mg: 33 },
    servingG: 150,
    aliases: ['broccoli', 'brokkoli'],
  },
  {
    name: 'Spinach',
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium_mg: 79 },
    servingG: 100,
    aliases: ['spinach', 'spinat'],
  },
  {
    name: 'Tomato',
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium_mg: 5 },
    servingG: 120,
    aliases: ['tomato', 'tomate', 'tomatoes', 'tomaten', 'cherry tomato'],
  },
  {
    name: 'Cucumber',
    per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium_mg: 2 },
    servingG: 100,
    aliases: ['cucumber', 'gurke'],
  },
  {
    name: 'Carrot',
    per100g: { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium_mg: 69 },
    servingG: 80,
    aliases: ['carrot', 'karotte', 'möhre', 'carrots'],
  },
  {
    name: 'Bell Pepper',
    per100g: { calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium_mg: 4 },
    servingG: 120,
    aliases: ['bell pepper', 'paprika', 'pepper', 'red pepper', 'green pepper'],
  },
  {
    name: 'Onion',
    per100g: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium_mg: 4 },
    servingG: 80,
    aliases: ['onion', 'zwiebel', 'zwiebeln', 'red onion', 'white onion'],
  },
  {
    name: 'Zucchini',
    per100g: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1.0, sugar: 2.5, sodium_mg: 8 },
    servingG: 150,
    aliases: ['zucchini', 'courgette', 'zucchetti'],
  },

  // ── Fruits ────────────────────────────────────────────────────────
  {
    name: 'Banana',
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, sodium_mg: 1 },
    servingG: 120,
    aliases: ['banana', 'banane'],
  },
  {
    name: 'Apple',
    per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10.4, sodium_mg: 1 },
    servingG: 150,
    aliases: ['apple', 'apfel'],
  },
  {
    name: 'Orange',
    per100g: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, sugar: 9.4, sodium_mg: 0 },
    servingG: 130,
    aliases: ['orange', 'orangen'],
  },
  {
    name: 'Strawberries',
    per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0, sugar: 4.9, sodium_mg: 1 },
    servingG: 150,
    aliases: ['strawberry', 'strawberries', 'erdbeere', 'erdbeeren'],
  },
  {
    name: 'Blueberries',
    per100g: { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, sugar: 10.0, sodium_mg: 1 },
    servingG: 150,
    aliases: ['blueberry', 'blueberries', 'heidelbeere', 'blaubeere'],
  },
  {
    name: 'Avocado',
    per100g: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, sodium_mg: 7 },
    servingG: 100,
    aliases: ['avocado', 'avokado'],
  },
  {
    name: 'Mango',
    per100g: { calories: 60, protein: 0.8, carbs: 15.0, fat: 0.4, fiber: 1.6, sugar: 13.7, sodium_mg: 1 },
    servingG: 165,
    aliases: ['mango'],
  },

  // ── Dairy ─────────────────────────────────────────────────────────
  {
    name: 'Greek Yogurt',
    per100g: { calories: 115, protein: 9.9, carbs: 3.6, fat: 5.0, fiber: 0, sugar: 3.6, sodium_mg: 36 },
    servingG: 200,
    aliases: ['greek yogurt', 'griechischer joghurt', 'greek yoghurt', 'skyr'],
  },
  {
    name: 'Greek Yogurt (0% fat)',
    per100g: { calories: 59, protein: 10.0, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.6, sodium_mg: 36 },
    servingG: 200,
    aliases: ['low fat greek yogurt', '0% greek yogurt', 'non-fat greek yogurt', '0% yogurt'],
  },
  {
    name: 'Yogurt (plain)',
    per100g: { calories: 59, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, sugar: 4.7, sodium_mg: 36 },
    servingG: 150,
    aliases: ['yogurt', 'joghurt', 'plain yogurt', 'natural yogurt'],
  },
  {
    name: 'Cottage Cheese',
    per100g: { calories: 98, protein: 11.1, carbs: 3.4, fat: 4.3, fiber: 0, sugar: 2.7, sodium_mg: 364 },
    servingG: 200,
    aliases: ['cottage cheese', 'hüttenkäse'],
  },
  {
    name: 'Low-fat Quark (Magerquark)',
    per100g: { calories: 67, protein: 12.0, carbs: 4.0, fat: 0.2, fiber: 0, sugar: 3.5, sodium_mg: 43 },
    servingG: 250,
    aliases: ['magerquark', 'low fat quark', 'quark', 'fromage blanc'],
  },
  {
    name: 'Cheddar / Hard Cheese',
    per100g: { calories: 403, protein: 25.0, carbs: 1.3, fat: 33.1, fiber: 0, sugar: 0.5, sodium_mg: 621 },
    servingG: 30,
    aliases: ['cheddar', 'cheddar cheese', 'hard cheese', 'gouda', 'emmental', 'käse', 'cheese'],
  },
  {
    name: 'Mozzarella',
    per100g: { calories: 280, protein: 18.0, carbs: 3.1, fat: 22.0, fiber: 0, sugar: 0.5, sodium_mg: 627 },
    servingG: 60,
    aliases: ['mozzarella'],
  },

  // ── Nuts & Seeds ──────────────────────────────────────────────────
  {
    name: 'Almonds',
    per100g: { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, sugar: 4.4, sodium_mg: 1 },
    servingG: 30,
    aliases: ['almonds', 'almond', 'mandeln', 'mandel'],
  },
  {
    name: 'Peanuts',
    per100g: { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5, sugar: 4.7, sodium_mg: 18 },
    servingG: 30,
    aliases: ['peanuts', 'erdnüsse', 'peanut', 'groundnut'],
  },
  {
    name: 'Peanut Butter',
    per100g: { calories: 588, protein: 25.0, carbs: 20.0, fat: 50.0, fiber: 6.0, sugar: 9.0, sodium_mg: 459 },
    servingG: 30,
    aliases: ['peanut butter', 'erdnussbutter', 'pb'],
  },
  {
    name: 'Walnuts',
    per100g: { calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, sugar: 2.6, sodium_mg: 2 },
    servingG: 30,
    aliases: ['walnuts', 'walnüsse', 'walnut'],
  },
  {
    name: 'Chia Seeds',
    per100g: { calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, sugar: 0, sodium_mg: 16 },
    servingG: 15,
    aliases: ['chia seeds', 'chia', 'chiasamen'],
  },

  // ── Oils & Condiments ─────────────────────────────────────────────
  {
    name: 'Olive Oil',
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium_mg: 2 },
    servingG: 10,
    aliases: ['olive oil', 'olivenöl', 'oil', 'öl', 'cooking oil'],
  },
  {
    name: 'Butter',
    per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, sugar: 0.1, sodium_mg: 643 },
    servingG: 10,
    aliases: ['butter'],
  },
  {
    name: 'Honey',
    per100g: { calories: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, sugar: 82.1, sodium_mg: 4 },
    servingG: 20,
    aliases: ['honey', 'honig'],
  },

  // ── Common Snacks / Supplements ───────────────────────────────────
  {
    name: 'Protein Bar',
    per100g: { calories: 360, protein: 30.0, carbs: 35.0, fat: 10.0, fiber: 5.0, sugar: 8.0, sodium_mg: 200 },
    servingG: 55,
    aliases: ['protein bar', 'proteinriegel', 'quest bar', 'clif bar', 'eiweißriegel'],
  },
  {
    name: 'Whey Protein Shake',
    per100g: { calories: 375, protein: 75.0, carbs: 8.0, fat: 5.0, fiber: 1.0, sugar: 3.0, sodium_mg: 150 },
    servingG: 35,
    aliases: ['protein shake', 'whey protein', 'protein powder', 'whey', 'eiweißshake', 'protein mix'],
  },
  {
    name: 'Chocolate (dark)',
    per100g: { calories: 546, protein: 4.9, carbs: 59.4, fat: 31.3, fiber: 10.9, sugar: 47.6, sodium_mg: 20 },
    servingG: 30,
    aliases: ['dark chocolate', 'zartbitterschokolade', 'dark choc'],
  },
  {
    name: 'Chocolate (milk)',
    per100g: { calories: 535, protein: 7.0, carbs: 58.0, fat: 30.0, fiber: 1.5, sugar: 55.0, sodium_mg: 79 },
    servingG: 25,
    aliases: ['milk chocolate', 'schokolade', 'milka', 'chocolate'],
  },

  // ── Legumes & Grains (extended) ──────────────────────────────────
  {
    name: 'Lentils (cooked)',
    per100g: { calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium_mg: 2 },
    servingG: 200,
    aliases: ['lentils', 'lentil', 'linsen', 'red lentils', 'rote linsen', 'dal', 'dahl'],
  },
  {
    name: 'Chickpeas (cooked)',
    per100g: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, sugar: 4.8, sodium_mg: 7 },
    servingG: 150,
    aliases: ['chickpeas', 'chickpea', 'kichererbsen', 'garbanzo', 'garbanzos'],
  },
  {
    name: 'Black Beans (cooked)',
    per100g: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, sugar: 0.3, sodium_mg: 1 },
    servingG: 150,
    aliases: ['black beans', 'black bean', 'schwarze bohnen', 'kidney beans', 'beans', 'bohnen'],
  },
  {
    name: 'Quinoa (cooked)',
    per100g: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8, sugar: 0.9, sodium_mg: 7 },
    servingG: 185,
    aliases: ['quinoa'],
  },
  {
    name: 'Couscous (cooked)',
    per100g: { calories: 112, protein: 3.8, carbs: 23.2, fat: 0.2, fiber: 1.4, sugar: 0.1, sodium_mg: 5 },
    servingG: 150,
    aliases: ['couscous', 'cous cous'],
  },

  // ── Vegetables (extended) ─────────────────────────────────────────
  {
    name: 'Lettuce / Salad Greens',
    per100g: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium_mg: 28 },
    servingG: 60,
    aliases: ['lettuce', 'salad', 'salat', 'greens', 'mixed greens', 'rocket', 'arugula', 'rucola', 'blattsalat'],
  },
  {
    name: 'Mushrooms',
    per100g: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1.0, sugar: 2.0, sodium_mg: 5 },
    servingG: 100,
    aliases: ['mushroom', 'mushrooms', 'champignons', 'pilze', 'pilz'],
  },
  {
    name: 'Cauliflower',
    per100g: { calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3, fiber: 2.0, sugar: 1.9, sodium_mg: 30 },
    servingG: 100,
    aliases: ['cauliflower', 'blumenkohl'],
  },
  {
    name: 'Green Peas',
    per100g: { calories: 81, protein: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7, sugar: 5.7, sodium_mg: 5 },
    servingG: 80,
    aliases: ['peas', 'green peas', 'erbsen'],
  },
  {
    name: 'Sweet Corn',
    per100g: { calories: 86, protein: 3.2, carbs: 19.0, fat: 1.2, fiber: 2.7, sugar: 3.2, sodium_mg: 15 },
    servingG: 150,
    aliases: ['corn', 'sweetcorn', 'sweet corn', 'mais'],
  },
  {
    name: 'Mixed Vegetables',
    per100g: { calories: 45, protein: 2.5, carbs: 8.5, fat: 0.4, fiber: 3.0, sugar: 3.5, sodium_mg: 30 },
    servingG: 100,
    aliases: ['vegetables', 'vegetable', 'veggies', 'veggie', 'veg', 'mixed vegetables', 'mixed veg', 'gemüse', 'gemuese', 'salad veg'],
  },

  // ── Prepared / Composite Dishes ───────────────────────────────────
  {
    name: 'Flour Tortilla / Wrap',
    per100g: { calories: 312, protein: 8.2, carbs: 50.0, fat: 7.9, fiber: 3.0, sugar: 2.6, sodium_mg: 610 },
    servingG: 50,
    aliases: ['tortilla', 'flour tortilla', 'wrap', 'tortilla wrap', 'fajita', 'soft taco'],
  },
  {
    name: 'Pizza (cheese/margherita)',
    per100g: { calories: 266, protein: 11.0, carbs: 33.0, fat: 10.0, fiber: 2.3, sugar: 3.6, sodium_mg: 598 },
    servingG: 125,
    aliases: ['pizza', 'margherita', 'pizza slice', 'cheese pizza'],
  },
  {
    name: 'Döner Kebab',
    per100g: { calories: 215, protein: 15.0, carbs: 12.0, fat: 12.0, fiber: 1.5, sugar: 2.0, sodium_mg: 480 },
    servingG: 350,
    aliases: ['döner', 'doner', 'kebab', 'döner kebab', 'dürüm', 'durum'],
  },
  {
    name: 'Pretzel (Brezel)',
    per100g: { calories: 338, protein: 8.2, carbs: 71.0, fat: 3.1, fiber: 2.9, sugar: 2.0, sodium_mg: 1240 },
    servingG: 80,
    aliases: ['pretzel', 'brezel', 'breze', 'brezn'],
  },
  {
    name: 'Croissant',
    per100g: { calories: 406, protein: 8.2, carbs: 45.8, fat: 21.0, fiber: 2.6, sugar: 11.0, sodium_mg: 424 },
    servingG: 60,
    aliases: ['croissant', 'butter croissant'],
  },

  // ── Proteins (extended) ───────────────────────────────────────────
  {
    name: 'Pork Chop (lean)',
    per100g: { calories: 231, protein: 26.0, carbs: 0, fat: 13.0, fiber: 0, sugar: 0, sodium_mg: 62 },
    servingG: 150,
    aliases: ['pork', 'pork chop', 'schwein', 'schweinefleisch', 'kotelett', 'schnitzel'],
  },
  {
    name: 'Bacon (fried)',
    per100g: { calories: 541, protein: 37.0, carbs: 1.4, fat: 42.0, fiber: 0, sugar: 0, sodium_mg: 1717 },
    servingG: 30,
    aliases: ['bacon', 'speck', 'bacon strips'],
  },
  {
    name: 'Cod / White Fish',
    per100g: { calories: 82, protein: 18.0, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium_mg: 54 },
    servingG: 150,
    aliases: ['cod', 'white fish', 'kabeljau', 'dorsch', 'pollock', 'seelachs', 'haddock'],
  },
]

// ─── Lookup Index ─────────────────────────────────────────────────
const ALIAS_INDEX = new Map<string, FoodRecord>()
for (const food of FOODS) {
  for (const alias of food.aliases) {
    ALIAS_INDEX.set(alias, food)
  }
}

export function lookupFood(query: string): FoodRecord | null {
  const q = query.toLowerCase().trim().replace(/\.$/, '')
  if (!q) return null

  // Exact alias match
  if (ALIAS_INDEX.has(q)) return ALIAS_INDEX.get(q)!

  // Substring: q contains an alias (longest wins)
  let best: { food: FoodRecord; len: number } | null = null
  for (const [alias, food] of ALIAS_INDEX) {
    if (q.includes(alias)) {
      if (!best || alias.length > best.len) best = { food, len: alias.length }
    }
  }
  if (best) return best.food

  // Substring: alias contains q (shortest alias wins)
  for (const [alias, food] of ALIAS_INDEX) {
    if (alias.includes(q) && q.length >= 4) return food
  }

  return null
}

// ─── Quantity Parser ──────────────────────────────────────────────
interface ParsedItem {
  grams?: number
  count?: number
  foodQuery: string
}

// Conversion to grams for each unit (approximate)
const UNIT_TO_G: Record<string, number> = {
  g: 1, gr: 1, gram: 1, grams: 1, gm: 1, gms: 1,
  ml: 1, milliliter: 1, milliliters: 1,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, pound: 453.6, pounds: 453.6,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  cup: 240, cups: 240,
}

const UNIT_PATTERN = Object.keys(UNIT_TO_G).sort((a, b) => b.length - a.length).join('|')
const UNIT_RX = new RegExp(`~?(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})(?=[\\s,.]|$)`, 'i')

function parseItemQuantity(text: string): ParsedItem {
  const t = text.trim().replace(/\.$/, '')

  // Any weight/volume unit anywhere: "200g chicken", "chicken ~200 gms", "2 tbsp oil", "250ml milk"
  const unitMatch = UNIT_RX.exec(t)
  if (unitMatch) {
    const amount = parseFloat(unitMatch[1])
    const unitKey = unitMatch[2].toLowerCase()
    const grams = Math.round(amount * (UNIT_TO_G[unitKey] ?? 1))
    const foodQuery = t.replace(UNIT_RX, '').replace(/\s+/g, ' ').trim()
    return { grams, foodQuery }
  }

  // Count at START: "3 eggs", "3 hard boiled eggs"
  const countStartMatch = t.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (countStartMatch) {
    const count = parseFloat(countStartMatch[1])
    if (count >= 1 && count <= 50) {
      return { count, foodQuery: countStartMatch[2].trim() }
    }
  }

  // Count at END: "Boiled eggs 3", "eggs ×3", "eggs x3"
  const countEndMatch = t.match(/^(.+?)\s+[×x]?(\d+(?:\.\d+)?)$/)
  if (countEndMatch) {
    const count = parseFloat(countEndMatch[2])
    const foodPart = countEndMatch[1].trim()
    if (count >= 1 && count <= 20 && !/\d/.test(foodPart)) {
      return { count, foodQuery: foodPart }
    }
  }

  return { count: 1, foodQuery: t }
}

// Connectors and cooking/size descriptors. Their presence in a query doesn't
// need to be "explained" by the matched food — but any OTHER unexplained content
// word means the input is a composite dish that the local DB can't fully represent.
const IGNORE_WORDS = new Set([
  'with', 'and', 'of', 'the', 'a', 'an', 'plus', 'in', 'on', 'to', 'my', 'some', 'extra', 'side',
  'mit', 'und', 'ohne', 'oder', 'dazu',
  'grilled', 'baked', 'boiled', 'fried', 'cooked', 'roasted', 'steamed', 'raw', 'fresh',
  'plain', 'lean', 'hot', 'cold', 'sliced', 'chopped', 'diced', 'large', 'small', 'medium', 'big',
])

// True when every meaningful word in the query is accounted for by the matched
// food (its aliases + name). A greedy substring hit like "chicken" inside
// "chicken tortilla wrap with vegetables" leaves "tortilla"/"wrap"/"vegetables"
// unexplained → not confident, so the dish falls through to the AI instead of
// being mis-logged as a single ingredient.
function isConfidentMatch(foodQuery: string, food: FoodRecord): boolean {
  const haystack = `${food.aliases.join(' ')} ${food.name}`.toLowerCase()
  const words = foodQuery.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean)
  for (const w of words) {
    if (w.length < 3 || IGNORE_WORDS.has(w)) continue
    // Plural-tolerant: "eggs" should match the alias "egg"
    const stem = w.endsWith('s') ? w.slice(0, -1) : w
    if (!haystack.includes(w) && !haystack.includes(stem)) return false
  }
  return true
}

// ─── Per-item Calculation ─────────────────────────────────────────
interface CalcResult {
  result: NutritionResult
  confident: boolean   // local DB fully explains this item (vs a greedy partial hit)
}

function calcItem(text: string): CalcResult | null {
  const { grams, count, foodQuery } = parseItemQuantity(text)
  const food = lookupFood(foodQuery) ?? lookupFood(text)
  if (!food) return null

  const effectiveGrams = grams ?? ((count ?? 1) * food.servingG)
  const r = effectiveGrams / 100

  const countLabel = (count && count > 1) ? ` ×${count}` : ''
  const gramsLabel = grams ? ` (${Math.round(grams)}g)` : ''
  const name = `${food.name}${countLabel || gramsLabel}`

  return {
    result: {
      food_name: name,
      calories:   Math.round(food.per100g.calories   * r),
      protein:    Math.round(food.per100g.protein     * r * 10) / 10,
      carbs:      Math.round(food.per100g.carbs       * r * 10) / 10,
      fat:        Math.round(food.per100g.fat         * r * 10) / 10,
      fiber:      Math.round(food.per100g.fiber       * r * 10) / 10,
      sugar:      Math.round(food.per100g.sugar       * r * 10) / 10,
      sodium_mg:  Math.round(food.per100g.sodium_mg   * r),
    },
    confident: isConfidentMatch(foodQuery, food),
  }
}

// ─── Multi-item Parser (public entry point) ───────────────────────
export interface LocalParseResult {
  result: NutritionResult
  matchedAll: boolean   // true if every part was found in the DB
  matchedAny: boolean   // true if at least one part matched
}

// Connectors that join ingredients of a single composite dish.
const COMPONENT_SPLIT = /\s+(?:and|with|plus|mit|und)\s+|\s*\+\s*|\s*&\s*/i
// A trailing total weight, e.g. "… 200g" or "… ~250 ml"
const TRAILING_TOTAL_RX = new RegExp(`^(.+?)\\s+~?(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\s*$`, 'i')

// Compose nutrition for `grams` of a food (per-100g scaling).
function scaleFood(food: FoodRecord, grams: number, label?: string): NutritionResult {
  const r = grams / 100
  return {
    food_name: label ?? food.name,
    calories:   Math.round(food.per100g.calories  * r),
    protein:    Math.round(food.per100g.protein    * r * 10) / 10,
    carbs:      Math.round(food.per100g.carbs      * r * 10) / 10,
    fat:        Math.round(food.per100g.fat        * r * 10) / 10,
    fiber:      Math.round(food.per100g.fiber      * r * 10) / 10,
    sugar:      Math.round(food.per100g.sugar      * r * 10) / 10,
    sodium_mg:  Math.round(food.per100g.sodium_mg  * r),
  }
}

// Composite dish with one shared total weight, e.g.
// "tortilla wrap with chicken and vegetables 200g". Splits the weight evenly
// across the known ingredients and sums real per-ingredient data — far more
// accurate than asking the model to guess a whole-dish macro split.
function parseCompositeWithTotal(input: string): LocalParseResult | null {
  if (/,/.test(input)) return null                       // commas = separate items, not one dish
  if (!/\s+with\s+|\s*\+\s*/i.test(input)) return null    // need a composite indicator
  const m = TRAILING_TOTAL_RX.exec(input.trim())
  if (!m) return null
  const foodText = m[1]
  const totalGrams = Math.round(parseFloat(m[2]) * (UNIT_TO_G[m[3].toLowerCase()] ?? 1))
  if (!(totalGrams > 0)) return null

  const comps = foodText.split(COMPONENT_SPLIT).map(s => s.trim()).filter(Boolean)
  if (comps.length < 2) return null
  const foods = comps.map(c => lookupFood(c))
  if (foods.some(f => !f)) return null                   // every ingredient must be known

  const per = totalGrams / foods.length                  // even split across ingredients
  const items = foods.map((f, i) => scaleFood(f!, per, `${f!.name} (${Math.round(per)}g)`))
  const zero: NutritionResult = { food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 }
  const total = items.reduce((acc, r) => ({
    food_name: acc.food_name ? `${acc.food_name} + ${r.food_name}` : r.food_name,
    calories:  acc.calories  + r.calories,
    protein:   Math.round((acc.protein + r.protein) * 10) / 10,
    carbs:     Math.round((acc.carbs   + r.carbs)   * 10) / 10,
    fat:       Math.round((acc.fat     + r.fat)     * 10) / 10,
    fiber:     Math.round((acc.fiber   + r.fiber)   * 10) / 10,
    sugar:     Math.round((acc.sugar   + r.sugar)   * 10) / 10,
    sodium_mg: acc.sodium_mg + r.sodium_mg,
  }), zero)
  return { result: total, matchedAll: true, matchedAny: true }
}

export function parseNutritionLocally(input: string): LocalParseResult {
  // Composite dish with a shared total weight → decompose into ingredients
  const composite = parseCompositeWithTotal(input)
  if (composite) return composite

  // Split on commas or " and " (case-insensitive)
  const parts = input.split(/,|\s+and\s+/i).map(p => p.trim()).filter(Boolean)

  const zero: NutritionResult = {
    food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0,
  }

  const matched: NutritionResult[] = []
  let unmatched = 0
  let allConfident = true

  for (const part of parts) {
    const r = calcItem(part)
    if (r) {
      matched.push(r.result)
      if (!r.confident) allConfident = false
    } else {
      unmatched++
    }
  }

  if (matched.length === 0) {
    return { result: zero, matchedAll: false, matchedAny: false }
  }

  const total = matched.reduce(
    (acc, r) => ({
      food_name: acc.food_name ? `${acc.food_name} + ${r.food_name}` : r.food_name,
      calories:   acc.calories   + r.calories,
      protein:    Math.round((acc.protein    + r.protein)   * 10) / 10,
      carbs:      Math.round((acc.carbs      + r.carbs)     * 10) / 10,
      fat:        Math.round((acc.fat        + r.fat)       * 10) / 10,
      fiber:      Math.round((acc.fiber      + r.fiber)     * 10) / 10,
      sugar:      Math.round((acc.sugar      + r.sugar)     * 10) / 10,
      sodium_mg:  acc.sodium_mg  + r.sodium_mg,
    }),
    zero,
  )

  return {
    result: total,
    // Only authoritative (skip the AI) when every part matched AND the local DB
    // fully explains them. Composite dishes drop to matchedAny so the AI runs.
    matchedAll: unmatched === 0 && allConfident,
    matchedAny: true,
  }
}

export { FOODS }
