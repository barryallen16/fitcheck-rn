// src/utils/helpers.js

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function extractJSON(raw) {
  let s = raw.trim();
  s = s.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function comboKey(topId, bottomId) {
  return `${topId || 'X'}|${bottomId || 'NONE'}`;
}

export const TOP_CATS = ['Kurti', 'Top', 'Shirt', 'Blazer', 'Jacket', 'Sherwani'];
export const BOTTOM_CATS = ['Palazzo', 'Churidar', 'Salwar', 'Jeans', 'Pants', 'Skirt'];
export const FULL_CATS = ['Saree', 'Lehenga', 'Anarkali', 'Dress', 'Gown'];
export const ACCESSORY_CATS = ['Dupatta'];

export function getSlot(category) {
  if (TOP_CATS.includes(category)) return 'TOP';
  if (BOTTOM_CATS.includes(category)) return 'BOTTOM';
  if (FULL_CATS.includes(category)) return 'FULL-BODY';
  if (ACCESSORY_CATS.includes(category)) return 'ACCESSORY';
  return 'OTHER';
}

export function getUnusedCombinations(wardrobe, outfits) {
  const tops = wardrobe.filter((g) => TOP_CATS.includes(g.category));
  const bottoms = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category));
  const fullBody = wardrobe.filter((g) => FULL_CATS.includes(g.category));

  const usedKeys = new Set(outfits.map((o) => comboKey(o.topId, o.bottomId)));
  const unused = [];

  for (const top of tops) {
    for (const bot of bottoms) {
      if (!usedKeys.has(comboKey(top.id, bot.id))) {
        unused.push({ top, bottom: bot });
      }
    }
  }

  for (const fb of fullBody) {
    if (!usedKeys.has(comboKey(fb.id, null))) {
      unused.push({ top: fb, bottom: null });
    }
  }

  return unused;
}

export function getMaxOutfits(wardrobe) {
  const tops = wardrobe.filter((g) => TOP_CATS.includes(g.category)).length;
  const bottoms = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category)).length;
  const fullBody = wardrobe.filter((g) => FULL_CATS.includes(g.category)).length;
  return tops * bottoms + fullBody;
}