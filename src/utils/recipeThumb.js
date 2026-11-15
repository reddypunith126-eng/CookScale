// Deterministic, appetizing placeholder art for recipes that have no photo.
// Given a recipe we derive (a) a food emoji from its tags/title and (b) one of a
// curated set of warm, food-friendly gradients — so every recipe reads as
// distinct and inviting instead of a generic empty tile. Same recipe always maps
// to the same look (hash-based), which keeps the grid stable between renders.

// Muted, moody duotones — deep and desaturated so thumbnails read like
// restrained food photography rather than bright tiles. Each is [from, to],
// tuned to sit calmly behind a large emoji against an austere UI.
const GRADIENTS = [
  ['#3a4a42', '#28322c'], // pine → charcoal
  ['#4a3f38', '#2f2823'], // espresso
  ['#4f4636', '#332e24'], // olive ink
  ['#553d3a', '#382a28'], // oxblood → brown
  ['#3f4650', '#2a2f36'], // slate
  ['#524a3b', '#37322a'], // bronze
  ['#463a44', '#2f272e'], // plum ink
  ['#3d4a4a', '#2a3332'], // teal ink
]

// Emoji keyed on words we look for in tags first, then the title. Order matters:
// earlier, more specific matches win (e.g. "cake" before generic "dessert").
const EMOJI_RULES = [
  [['pizza'], '🍕'],
  [['taco', 'burrito', 'quesadilla', 'nacho', 'mexican'], '🌮'],
  [['sushi', 'ramen', 'noodle', 'noodles', 'udon', 'pho', 'thai'], '🍜'],
  [['curry', 'dal', 'dahl', 'masala', 'tikka', 'biryani', 'indian'], '🍛'],
  [['pasta', 'spaghetti', 'lasagna', 'risotto', 'gnocchi', 'italian'], '🍝'],
  [['burger'], '🍔'],
  [['sandwich', 'toast', 'panini', 'wrap'], '🥪'],
  [['cake', 'cupcake', 'brownie', 'muffin'], '🍰'],
  [['cookie', 'biscuit'], '🍪'],
  [['pie', 'tart', 'pastry', 'croissant'], '🥧'],
  [['bread', 'sourdough', 'bagel', 'baguette', 'bun', 'roll', 'baking'], '🍞'],
  [['dessert', 'sweet', 'chocolate', 'pudding', 'custard'], '🍮'],
  [['soup', 'stew', 'chowder', 'broth', 'chili'], '🍲'],
  [['salad', 'slaw', 'greens'], '🥗'],
  [['egg', 'omelet', 'omelette', 'frittata', 'scramble', 'breakfast'], '🍳'],
  [['pancake', 'waffle'], '🥞'],
  [['smoothie', 'juice', 'shake'], '🥤'],
  [['coffee', 'latte', 'espresso'], '☕'],
  [['chicken', 'poultry', 'turkey'], '🍗'],
  [['steak', 'beef', 'pork', 'lamb', 'meat', 'high-protein'], '🥩'],
  [['fish', 'salmon', 'tuna', 'seafood', 'shrimp', 'prawn'], '🐟'],
  [['rice', 'grain', 'bowl'], '🍚'],
  [['veg', 'vegan', 'vegetarian', 'veggie'], '🥬'],
  [['fruit', 'berry', 'apple', 'banana'], '🍓'],
  [['cheese'], '🧀'],
]

const DEFAULT_EMOJI = '🍽️'

function hash(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function recipeEmoji(recipe) {
  const tags = (recipe.tags || []).map((t) => t.toLowerCase())
  const words = new Set([...tags, ...String(recipe.title || '').toLowerCase().split(/[^a-z]+/)])
  for (const [keys, emoji] of EMOJI_RULES) {
    if (keys.some((k) => words.has(k))) return emoji
  }
  // Substring fallback catches things like "cheeseburger" or "flatbread".
  const hay = (recipe.title + ' ' + tags.join(' ')).toLowerCase()
  for (const [keys, emoji] of EMOJI_RULES) {
    if (keys.some((k) => hay.includes(k))) return emoji
  }
  return DEFAULT_EMOJI
}

export function recipeThumb(recipe) {
  const [from, to] = GRADIENTS[hash(recipe.title || recipe.id || '') % GRADIENTS.length]
  return {
    emoji: recipeEmoji(recipe),
    gradient: `linear-gradient(150deg, ${from}, ${to})`,
  }
}
