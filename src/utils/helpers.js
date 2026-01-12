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