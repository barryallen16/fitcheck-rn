import * as FileSystem from 'expo-file-system';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export function extractJSON(raw) {
  let s = raw.trim();
  s = s.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

export function getSlotLabel(cat) {
  if (TOP_CATS.includes(cat)) return 'Top';
  if (BOTTOM_CATS.includes(cat)) return 'Bottom';
  if (FULL_CATS.includes(cat)) return 'Full-body';
  return 'Accessory';
}

export function getUnusedCombinations(wardrobe, outfits) {
  const tops = wardrobe.filter((g) => TOP_CATS.includes(g.category));
  const bottoms = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category));
  const fullBody = wardrobe.filter((g) => FULL_CATS.includes(g.category));
  const usedKeys = new Set(outfits.map((o) => comboKey(o.topId, o.bottomId)));
  const unused = [];
  for (const t of tops) for (const b of bottoms) {
    if (!usedKeys.has(comboKey(t.id, b.id))) unused.push({ top: t, bottom: b });
  }
  for (const f of fullBody) {
    if (!usedKeys.has(comboKey(f.id, null))) unused.push({ top: f, bottom: null });
  }
  return unused;
}

export function getMaxOutfits(wardrobe) {
  const t = wardrobe.filter((g) => TOP_CATS.includes(g.category)).length;
  const b = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category)).length;
  const f = wardrobe.filter((g) => FULL_CATS.includes(g.category)).length;
  return t * b + f;
}