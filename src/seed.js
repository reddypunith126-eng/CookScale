// Sample data so the app is explorable on first run. Everything here can be
// edited or deleted in the UI, and "Reset data" restores this set.
import { titleCase } from './utils/format.js'

let counter = 0
const sid = (p) => `${p}-${++counter}`

// per-100-base-unit nutrition: { calories, protein, carbs, fat, fiber, sugar,
// sodium, calcium, iron, potassium, vitaminA, vitaminC, vitaminD }
function n(calories, protein, carbs, fat, fiber, sugar, extra = {}) {
  return { calories, protein, carbs, fat, fiber, sugar, sodium: 0, calcium: 0, iron: 0, potassium: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, ...extra }
}

function ing(id, name, category, baseUnit, nutritionPer100, prices, extra = {}) {
  return {
    id,
    name: titleCase(name),
    category,
    baseUnit,
    nutritionPer100,
    servingSize: extra.servingSize ?? null,
    packages: extra.packages ?? [],
    fdcId: extra.fdcId ?? null,
    brand: extra.brand ?? '',
    priceHistory: prices.map(([date, pricePerBase, store]) => ({ date, pricePerBase, store: store || 'Market' })),
  }
}

const I = {
  breadFlour: 'i-bread-flour',
  water: 'i-water',
  salt: 'i-salt',
  starter: 'i-starter',
  oliveOil: 'i-olive-oil',
  chickpeas: 'i-chickpeas',
  onion: 'i-onion',
  garlic: 'i-garlic',
  tomatoes: 'i-tomatoes',
  spinach: 'i-spinach',
  coconutMilk: 'i-coconut-milk',
  redLentils: 'i-red-lentils',
  cumin: 'i-cumin',
  eggs: 'i-eggs',
  banana: 'i-banana',
  apFlour: 'i-ap-flour',
  butter: 'i-butter',
  sugar: 'i-sugar',
}

function ingredients() {
  return [
    ing(I.breadFlour, 'Bread flour', 'baking', 'g', n(361, 12, 73, 1.5, 2.7, 0.3, { sodium: 2, calcium: 15, iron: 4.6, potassium: 100 }), [
      ['2026-01-05', 0.00129], ['2026-03-10', 0.00139], ['2026-05-20', 0.00149],
    ], { servingSize: 30, packages: [{ label: 'bag', unit: 'kg', quantity: 1 }] }),
    ing(I.water, 'Water', 'other', 'ml', n(0, 0, 0, 0, 0, 0), [['2026-01-01', 0]]),
    ing(I.salt, 'Sea salt', 'pantry', 'g', n(0, 0, 0, 0, 0, 0, { sodium: 38758 }), [['2026-01-05', 0.00134]]),
    ing(I.starter, 'Sourdough starter', 'baking', 'g', n(180, 5, 38, 0.5, 1.5, 0.1), [['2026-01-01', 0]]),
    ing(I.oliveOil, 'Olive oil', 'pantry', 'ml', n(800, 0, 0, 92, 0, 0, { vitaminA: 0 }), [
      ['2026-01-12', 0.018], ['2026-04-02', 0.020], ['2026-06-01', 0.022],
    ]),
    ing(I.chickpeas, 'Chickpeas (canned)', 'pantry', 'g', n(139, 7.3, 22, 2.6, 6, 0.5, { sodium: 240, calcium: 45, iron: 1.6, potassium: 230 }), [
      ['2026-02-01', 0.0030], ['2026-05-01', 0.0032],
    ], { servingSize: 130, packages: [{ label: 'can', unit: 'g', quantity: 400 }] }),
    ing(I.onion, 'Onion', 'produce', 'g', n(40, 1.1, 9.3, 0.1, 1.7, 4.2, { vitaminC: 7.4, potassium: 146 }), [
      ['2026-01-20', 0.00089], ['2026-04-15', 0.00099],
    ]),
    ing(I.garlic, 'Garlic', 'produce', 'g', n(149, 6.4, 33, 0.5, 2.1, 1, { vitaminC: 31, calcium: 181 }), [
      ['2026-02-10', 0.010], ['2026-05-05', 0.011],
    ]),
    ing(I.tomatoes, 'Tomatoes (canned)', 'pantry', 'g', n(32, 1.6, 7, 0.3, 1.9, 4, { vitaminC: 14, potassium: 220 }), [
      ['2026-01-15', 0.0028], ['2026-04-20', 0.0030],
    ]),
    ing(I.spinach, 'Spinach', 'produce', 'g', n(23, 2.9, 3.6, 0.4, 2.2, 0.4, { vitaminA: 469, vitaminC: 28, iron: 2.7, calcium: 99, potassium: 558 }), [
      ['2026-03-01', 0.0090], ['2026-06-02', 0.010],
    ]),
    ing(I.coconutMilk, 'Coconut milk', 'pantry', 'ml', n(197, 2, 3, 21, 0, 2, { iron: 1.6, potassium: 220 }), [
      ['2026-02-05', 0.0049], ['2026-05-10', 0.0050],
    ], { servingSize: 80, packages: [{ label: 'can', unit: 'ml', quantity: 400 }] }),
    ing(I.redLentils, 'Red lentils', 'pantry', 'g', n(358, 24, 63, 1.1, 11, 2, { iron: 7.5, potassium: 955, calcium: 56 }), [
      ['2026-01-25', 0.0048], ['2026-05-15', 0.0050],
    ]),
    ing(I.cumin, 'Ground cumin', 'spice', 'g', n(375, 18, 44, 22, 11, 2, { iron: 66, calcium: 931 }), [['2026-02-01', 0.040]]),
    ing(I.eggs, 'Eggs', 'dairy', 'each', n(7200, 630, 36, 480, 0, 36, { sodium: 7100, calcium: 2800, iron: 90, potassium: 6900, vitaminA: 8000, vitaminD: 110 }), [
      ['2026-01-10', 0.31], ['2026-03-15', 0.38], ['2026-06-05', 0.42],
    ], { servingSize: 1, packages: [{ label: 'dozen', unit: 'dozen', quantity: 1 }, { label: 'half dozen', unit: 'each', quantity: 6 }] }),
    ing(I.banana, 'Banana', 'produce', 'each', n(10500, 130, 2700, 40, 310, 1440, { vitaminC: 1020, potassium: 42200 }), [
      ['2026-02-12', 0.28], ['2026-05-22', 0.30],
    ]),
    ing(I.apFlour, 'All-purpose flour', 'baking', 'g', n(364, 10, 76, 1, 2.7, 0.3, { calcium: 15, iron: 4.6 }), [
      ['2026-01-08', 0.00089], ['2026-04-10', 0.00099],
    ]),
    ing(I.butter, 'Butter', 'dairy', 'g', n(717, 0.85, 0.1, 81, 0, 0.1, { vitaminA: 684, calcium: 24, sodium: 11 }), [
      ['2026-02-03', 0.0105], ['2026-05-12', 0.011],
    ], { servingSize: 14, packages: [{ label: 'stick', unit: 'g', quantity: 113 }, { label: 'block', unit: 'g', quantity: 454 }] }),
    ing(I.sugar, 'Granulated sugar', 'baking', 'g', n(387, 0, 100, 0, 0, 100), [['2026-01-18', 0.00249]]),
  ]
}

const R = { sourdough: 'r-sourdough', chana: 'r-chana', dal: 'r-dal', banana: 'r-banana' }

function recipes() {
  return [
    {
      id: R.sourdough,
      title: 'Classic Sourdough Loaf',
      servings: 12,
      prepTime: 30,
      cookTime: 45,
      tags: ['bread', 'vegan', 'dairy-free', 'baking'],
      image: '',
      sourceUrl: '',
      rating: 5,
      favorite: true,
      createdAt: '2026-01-06T08:00:00Z',
      ingredients: [
        { ingredientId: I.breadFlour, quantity: 500, unit: 'g', note: '' },
        { ingredientId: I.water, quantity: 350, unit: 'ml', note: 'room temp' },
        { ingredientId: I.salt, quantity: 10, unit: 'g', note: '' },
        { ingredientId: I.starter, quantity: 100, unit: 'g', note: 'active, bubbly' },
      ],
      instructions: [
        'Mix flour and water; rest 30 min (autolyse).',
        'Add starter and salt, mix until combined.',
        'Stretch and fold every 30 min for 2.5 hours.',
        'Bulk ferment until ~50% risen, then shape.',
        'Cold proof in the fridge overnight.',
        'Bake at 230°C / 450°F in a Dutch oven, 20 min covered + 25 min uncovered.',
      ],
    },
    {
      id: R.chana,
      title: 'Chana Masala',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      tags: ['indian', 'vegan', 'gluten-free', 'dairy-free'],
      image: '',
      sourceUrl: '',
      rating: 4,
      favorite: false,
      createdAt: '2026-02-02T18:00:00Z',
      ingredients: [
        { ingredientId: I.chickpeas, quantity: 400, unit: 'g', note: 'drained' },
        { ingredientId: I.onion, quantity: 150, unit: 'g', note: 'diced' },
        { ingredientId: I.garlic, quantity: 15, unit: 'g', note: 'minced' },
        { ingredientId: I.tomatoes, quantity: 400, unit: 'g', note: '' },
        { ingredientId: I.oliveOil, quantity: 2, unit: 'tbsp', note: '' },
        { ingredientId: I.cumin, quantity: 5, unit: 'g', note: '' },
        { ingredientId: I.spinach, quantity: 100, unit: 'g', note: 'optional' },
      ],
      instructions: [
        'Sauté onion in oil until golden.',
        'Add garlic and cumin; cook 1 min.',
        'Add tomatoes; simmer 10 min.',
        'Stir in chickpeas; simmer 15 min.',
        'Fold in spinach until wilted. Season and serve.',
      ],
    },
    {
      id: R.dal,
      title: 'Coconut Red Lentil Dal',
      servings: 4,
      prepTime: 10,
      cookTime: 25,
      tags: ['indian', 'vegan', 'gluten-free', 'dairy-free'],
      image: '',
      sourceUrl: '',
      rating: 5,
      favorite: true,
      createdAt: '2026-02-20T19:00:00Z',
      ingredients: [
        { ingredientId: I.redLentils, quantity: 200, unit: 'g', note: 'rinsed' },
        { ingredientId: I.coconutMilk, quantity: 1.5, unit: 'cup', note: '' },
        { ingredientId: I.onion, quantity: 100, unit: 'g', note: '' },
        { ingredientId: I.garlic, quantity: 10, unit: 'g', note: '' },
        { ingredientId: I.cumin, quantity: 4, unit: 'g', note: '' },
        { ingredientId: I.spinach, quantity: 80, unit: 'g', note: '' },
      ],
      instructions: [
        'Sauté onion and garlic.',
        'Add cumin, lentils, coconut milk and 300ml water.',
        'Simmer 20 min until lentils break down.',
        'Stir in spinach; season to taste.',
      ],
    },
    {
      id: R.banana,
      title: 'Banana Bread',
      servings: 10,
      prepTime: 15,
      cookTime: 55,
      tags: ['baking', 'vegetarian', 'dessert'],
      image: '',
      sourceUrl: '',
      rating: 4,
      favorite: false,
      createdAt: '2026-03-05T10:00:00Z',
      ingredients: [
        { ingredientId: I.apFlour, quantity: 250, unit: 'g', note: '' },
        { ingredientId: I.sugar, quantity: 150, unit: 'g', note: '' },
        { ingredientId: I.butter, quantity: 100, unit: 'g', note: 'melted' },
        { ingredientId: I.eggs, quantity: 2, unit: 'each', note: '' },
        { ingredientId: I.banana, quantity: 3, unit: 'each', note: 'ripe, mashed' },
      ],
      instructions: [
        'Cream butter and sugar; beat in eggs.',
        'Mash bananas and fold in.',
        'Add flour; mix until just combined.',
        'Bake at 175°C / 350°F for 55 min.',
      ],
    },
  ]
}

// Spread cooks across 2026 for a meaningful dashboard.
function cookLog() {
  const log = []
  const add = (recipeId, date, servings) => log.push({ id: sid('cook'), recipeId, date, servings })
  // sourdough roughly weekly
  ;['2026-01-12', '2026-01-26', '2026-02-09', '2026-03-02', '2026-03-30', '2026-04-20', '2026-05-11', '2026-06-08']
    .forEach((d) => add(R.sourdough, d, 12))
  ;['2026-02-04', '2026-03-15', '2026-04-22', '2026-05-30', '2026-06-12'].forEach((d) => add(R.chana, d, 4))
  ;['2026-02-22', '2026-04-05', '2026-05-18', '2026-06-14'].forEach((d) => add(R.dal, d, 4))
  ;['2026-03-08', '2026-05-04'].forEach((d) => add(R.banana, d, 10))
  return log
}

function purchases() {
  // Mirror a few price-history points as grocery purchases for spend tracking.
  return [
    { id: sid('p'), ingredientId: I.breadFlour, date: '2026-05-20', totalPrice: 1.49, quantity: 1, unit: 'kg', store: 'Market' },
    { id: sid('p'), ingredientId: I.oliveOil, date: '2026-06-01', totalPrice: 11.0, quantity: 500, unit: 'ml', store: 'Market' },
    { id: sid('p'), ingredientId: I.eggs, date: '2026-06-05', totalPrice: 5.04, quantity: 12, unit: 'each', store: 'Market' },
    { id: sid('p'), ingredientId: I.spinach, date: '2026-06-02', totalPrice: 3.0, quantity: 300, unit: 'g', store: 'Market' },
    { id: sid('p'), ingredientId: I.chickpeas, date: '2026-05-01', totalPrice: 1.28, quantity: 400, unit: 'g', store: 'Market' },
    { id: sid('p'), ingredientId: I.coconutMilk, date: '2026-05-10', totalPrice: 2.0, quantity: 400, unit: 'ml', store: 'Market' },
  ]
}

function pantry() {
  return [
    { ingredientId: I.breadFlour, quantity: 2000, unit: 'g' },
    { ingredientId: I.water, quantity: 5000, unit: 'ml' },
    { ingredientId: I.salt, quantity: 500, unit: 'g' },
    { ingredientId: I.starter, quantity: 220, unit: 'g' },
    { ingredientId: I.chickpeas, quantity: 800, unit: 'g' },
    { ingredientId: I.onion, quantity: 500, unit: 'g' },
    { ingredientId: I.garlic, quantity: 60, unit: 'g' },
    { ingredientId: I.tomatoes, quantity: 800, unit: 'g' },
    { ingredientId: I.oliveOil, quantity: 450, unit: 'ml' },
    { ingredientId: I.cumin, quantity: 60, unit: 'g' },
    { ingredientId: I.spinach, quantity: 250, unit: 'g' },
    { ingredientId: I.eggs, quantity: 6, unit: 'each' },
    { ingredientId: I.banana, quantity: 4, unit: 'each' },
  ]
}

function starterFeedings() {
  return [
    { id: sid('f'), date: '2026-06-10T08:00', flour: 50, water: 50, starter: 50, flourType: 'bread flour', tempF: 72, note: 'Doubled in 5h, very bubbly', discardUsed: true },
    { id: sid('f'), date: '2026-06-11T08:30', flour: 50, water: 50, starter: 50, flourType: 'bread flour', tempF: 70, note: '', discardUsed: false },
    { id: sid('f'), date: '2026-06-12T09:00', flour: 60, water: 60, starter: 40, flourType: 'whole wheat', tempF: 74, note: 'Switched to whole wheat for tang', discardUsed: true },
    { id: sid('f'), date: '2026-06-13T08:15', flour: 50, water: 50, starter: 50, flourType: 'bread flour', tempF: 73, note: '', discardUsed: false },
    { id: sid('f'), date: '2026-06-14T08:00', flour: 50, water: 55, starter: 50, flourType: 'bread flour', tempF: 75, note: 'Higher hydration', discardUsed: false, weather: { tempF: 68, humidity: 72, code: 3, description: 'Overcast', icon: '☁️' } },
    { id: sid('f'), date: '2026-06-15T08:45', flour: 50, water: 50, starter: 50, flourType: 'bread flour', tempF: 72, note: 'Feeding before bake', discardUsed: false, weather: { tempF: 74, humidity: 55, code: 1, description: 'Mainly clear', icon: '🌤️' } },
  ]
}

function bakes() {
  const b = (date, label, hydration, folds, bulkHours, bulkTempF, proofType, proofHours, risePct, ovenSpring, crumb, crust, overall, notes) =>
    ({ id: sid('bake'), recipeId: R.sourdough, date, label, hydration, folds, bulkHours, bulkTempF, proofType, proofHours, bakeTempF: 450, risePct, ovenSpring, crumb, crust, overall, notes, photo: '' })
  return [
    b('2026-02-14', 'Baseline', 70, 2, 5, 72, 'fridge', 14, 35, 2, 2, 3, 3, 'Dense-ish crumb, underproofed slightly. Only 2 folds — weak gluten.'),
    b('2026-03-21', 'Three folds', 72, 3, 4.5, 74, 'fridge', 12, 55, 3, 3, 4, 4, 'Better structure with the extra fold. More open.'),
    b('2026-04-25', 'Four folds + warmer bulk', 74, 4, 4, 76, 'fridge', 12, 75, 4, 4, 4, 5, 'Big jump in oven spring. Open, even crumb.'),
    b('2026-05-30', 'Higher hydration', 78, 4, 4, 76, 'counter', 5, 80, 4, 5, 3, 5, 'Wild open crumb but harder to handle; a couple large holes.'),
    b('2026-06-13', 'Refined', 75, 4, 4.5, 75, 'fridge', 14, 78, 5, 5, 5, 5, 'Best yet — glossy ears, even open crumb, deep crust.'),
  ]
}

export function seedData() {
  counter = 0
  return {
    ingredients: ingredients(),
    recipes: recipes(),
    bakes: bakes(),
    cookLog: cookLog(),
    purchases: purchases(),
    pantry: pantry(),
    starterFeedings: starterFeedings(),
    settings: { usdaApiKey: 'DEMO_KEY', location: null, weatherUnit: 'F', theme: 'light' },
    shoppingList: [{ id: sid('s'), ingredientId: I.redLentils, quantity: 500, unit: 'g', checked: false, price: 2.49, note: 'for dal' }],
    shoppingTrips: [],
    mealPlan: [
      { id: sid('m'), date: '2026-06-16', recipeId: R.dal, meal: 'dinner' },
      { id: sid('m'), date: '2026-06-17', recipeId: R.chana, meal: 'dinner' },
      { id: sid('m'), date: '2026-06-18', recipeId: R.sourdough, meal: 'lunch' },
    ],
  }
}
