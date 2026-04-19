import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator'; // Add this import
import {
  extractJSON, getSlot, comboKey,
  TOP_CATS, BOTTOM_CATS, FULL_CATS,
  getUnusedCombinations,
} from '../utils/helpers';
import groq from './groqService';

const DEFAULT_URL = 'http://192.168.29.187:1234';

function fuzzyMatch(label, wardrobe) {
  if (!label || label === 'N/A') return null;
  const clean = label.toLowerCase().trim();
  let f = wardrobe.find((g) => g.summary.toLowerCase().trim() === clean);
  if (f) return f;
  f = wardrobe.find((g) => {
    const s = g.summary.toLowerCase().trim();
    return s.includes(clean) || clean.includes(s);
  });
  if (f) return f;
  const lW = clean.split(/\s+/).filter((w) => w.length > 2);
  let best = 0, bestG = null;
  for (const g of wardrobe) {
    const gW = g.summary.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    let sc = 0;
    for (const lw of lW) for (const gw of gW) {
      if (lw === gw) sc += 2; else if (lw.includes(gw) || gw.includes(lw)) sc += 1;
    }
    if (sc > best) { best = sc; bestG = g; }
  }
  return best >= 2 ? bestG : null;
}

function buildWardrobeSection(wardrobe) {
  const tops = wardrobe.filter((g) => TOP_CATS.includes(g.category));
  const bottoms = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category));
  const fullBody = wardrobe.filter((g) => FULL_CATS.includes(g.category));
  let s = '';
  if (tops.length) { s += 'TOPS:\n'; tops.forEach((g) => { s += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; }); s += '\n'; }
  if (bottoms.length) { s += 'BOTTOMS:\n'; bottoms.forEach((g) => { s += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; }); s += '\n'; }
  if (fullBody.length) { s += 'FULL-BODY:\n'; fullBody.forEach((g) => { s += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; }); s += '\n'; }
  return s;
}

function buildMessages(weatherStr, wardrobe, baseGarmentId, existingOutfits) {
  const wardrobeSection = buildWardrobeSection(wardrobe);

  let baseConstraint = '';
  if (baseGarmentId) {
    const bg = wardrobe.find((g) => g.id === baseGarmentId);
    if (bg) {
      const slot = getSlot(bg.category);
      baseConstraint = `\nMANDATORY: Include "${bg.summary}" [${bg.category}] (${slot}).`;
      if (slot === 'TOP') baseConstraint += ` Use as top_label. Pick a BOTTOM for bottom_label.`;
      else if (slot === 'BOTTOM') baseConstraint += ` Use as bottom_label. Pick a TOP for top_label.`;
      else if (slot === 'FULL-BODY') baseConstraint += ` Use as top_label. Set bottom_label to "N/A".`;
      baseConstraint += '\n';
    }
  }

  let avoidSection = '';
  if (existingOutfits.length > 0) {
    const combos = existingOutfits.map((o) => `"${o.topLabel}" + "${o.bottomLabel}"`).slice(-10);
    avoidSection = `\nDO NOT repeat:\n${combos.join('\n')}\n`;
  }

  const hour = new Date().getHours();
  const mood = hour < 12 ? 'fresh morning' : hour < 17 ? 'stylish afternoon' : 'elegant evening';

  const sys = `You are FitCheck's outfit engine. Recommend from the user's wardrobe ONLY.
RULES:
1. top_label = EXACT summary from TOPS or FULL-BODY
2. bottom_label = EXACT summary from BOTTOMS, or "N/A" for full-body garments
3. Never swap categories
4. ONLY valid JSON output

JSON: {"top_label":"...","bottom_label":"...","colorLogic":"...","silhouetteLogic":"..."}`;

  const user = `Weather: ${weatherStr}\nVibe: ${mood}${baseConstraint}${avoidSection}\nWARDROBE:\n${wardrobeSection}\nOutput ONLY JSON.`;

  return [{ role: 'system', content: sys }, { role: 'user', content: user }];
}

class LMStudioService {
  constructor() {
    this.baseUrl = DEFAULT_URL;
    this.connected = false;
    this.modelId = null;
  }

  setUrl(url) { this.baseUrl = url.replace(/\/+$/, ''); this.connected = false; this.modelId = null; }

  async checkConnection() {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 6000);
      const r = await fetch(`${this.baseUrl}/v1/models`, { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) { this.connected = false; return { ok: false, error: `Status ${r.status}` }; }
      const b = await r.json();
      const m = b?.data ?? [];
      if (m.length > 0) this.modelId = m[0].id;
      this.connected = true;
      return { ok: true, model: this.modelId, modelCount: m.length };
    } catch (e) {
      this.connected = false;
      return { ok: false, error: e.name === 'AbortError' ? 'Timeout' : e.message };
    }
  }

  // ── Vision analysis (local only) ──────────────────────
  async analyzeGarment(imageUri) {
    await this._ensureConnected();
    let base64;
    try {
      // Resize to a width of 768px (maintains aspect ratio) and compress
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 768 } }], 
        { 
          compress: 0.7, 
          format: ImageManipulator.SaveFormat.JPEG, 
          base64: true 
        }
      );
      
      base64 = manipulatedImage.base64;
    } catch (e) { 
      throw new Error(`Cannot process or read image: ${e.message}`); 
    }

    const payload = {
      model: this.modelId || 'default',
      messages: [
        {
          role: 'system',
          content: `You are an expert fashion archivist. Analyze the main garment in the provided image and output ONLY a valid, raw JSON object. Do not include markdown formatting, code blocks, or conversational text.

Construct the JSON exactly according to this schema:
1. "summary": A 3 to 5 word descriptive title.
2. "analyzed_garment": A single paragraph describing: colors, fabric, pattern, silhouette, neckline/sleeves, embellishments.
3. "category": Exactly one of: Kurti, Lehenga, Dupatta, Palazzo, Churidar, Salwar, Saree, Sherwani, Anarkali, Dress, Gown, Skirt, Jeans, Pants, Blazer, Jacket, Top, Shirt.

Output ONLY: {"summary":"...","analyzed_garment":"...","category":"..."}`
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: 'text', text: 'Analyze the main garment. Output ONLY raw JSON.' },
          ],
        },
      ],
      temperature: 0.1, max_tokens: 512, stream: false,
    };

    const raw = await this._post('/v1/chat/completions', payload);
    const text = raw?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response from model.');
    return this._parseGarment(text);
  }

  // ── Recommendation (dual: LM Studio + Groq) ──────────
  async getRecommendation(weatherStr, wardrobe, baseGarmentId, existingOutfits = []) {
    const messages = buildMessages(weatherStr, wardrobe, baseGarmentId, existingOutfits);

    // Build LM Studio payload
    const lmPayload = {
      model: this.modelId || 'default',
      messages,
      temperature: 0.4,
      max_tokens: 512,
      stream: false,
    };

    // Fire BOTH simultaneously
    // LM Studio = slow (2B model, 10-30s)
    // Groq = fast (70B model via cloud, 2-5s)
    // We wait for BOTH — response appears after LM Studio finishes
    // We USE Groq's better response

    const [lmResult, groqResult] = await Promise.allSettled([
      this._postSafe('/v1/chat/completions', lmPayload),
      groq.call(messages, { temperature: 0.4 }),
    ]);

    let responseText = null;
    let source = null;

    // Prefer Groq (better quality from 70B)
    if (groqResult.status === 'fulfilled' && groqResult.value) {
      responseText = groqResult.value;
      source = 'groq';
    }
    // Fallback to LM Studio
    if (!responseText && lmResult.status === 'fulfilled' && lmResult.value) {
      const lmText = lmResult.value?.choices?.[0]?.message?.content ?? '';
      if (lmText) { responseText = lmText; source = 'lm'; }
    }

    if (!responseText) {
      const lmErr = lmResult.status === 'rejected' ? lmResult.reason?.message : '';
      const groqErr = groqResult.status === 'rejected' ? groqResult.reason?.message : '';
      throw new Error(`Recommendation failed.\nLM Studio: ${lmErr || 'empty'}\nDetails: ${groqErr || 'empty'}`);
    }

    const parsed = this._parseRecommendation(responseText);
    const baseGarment = baseGarmentId ? wardrobe.find((g) => g.id === baseGarmentId) : null;
    const validated = this._validateRecommendation(parsed, wardrobe, baseGarment);

    // Dedup check
    const key = comboKey(validated._topGarment?.id, validated._bottomGarment?.id);
    const isDup = existingOutfits.some((o) => comboKey(o.topId, o.bottomId) === key);

    if (isDup) {
      // Try fallback: pick unused combo and get logic for it
      const unused = getUnusedCombinations(wardrobe, existingOutfits);
      if (unused.length > 0) {
        const pick = unused[Math.floor(Math.random() * unused.length)];
        return await this._getLogicForPair(pick.top, pick.bottom, weatherStr);
      }
    }

    return validated;
  }

  async _getLogicForPair(topG, bottomG, weatherStr) {
    const prompt = `Outfit for ${weatherStr}:
Top: "${topG.summary}" — ${topG.analyzed_garment}
${bottomG ? `Bottom: "${bottomG.summary}" — ${bottomG.analyzed_garment}` : 'Full-body garment.'}
JSON ONLY: {"colorLogic":"...","silhouetteLogic":"..."}`;

    // Dual again
    const msgs = [{ role: 'user', content: prompt }];
    const lmPayload = { model: this.modelId || 'default', messages: msgs, temperature: 0.3, max_tokens: 256, stream: false };

    const [lmR, groqR] = await Promise.allSettled([
      this._postSafe('/v1/chat/completions', lmPayload),
      groq.call(msgs, { temperature: 0.3, maxTokens: 256 }),
    ]);

    let text = '';
    if (groqR.status === 'fulfilled' && groqR.value) text = groqR.value;
    else if (lmR.status === 'fulfilled' && lmR.value) text = lmR.value?.choices?.[0]?.message?.content ?? '';

    const obj = extractJSON(text) || { colorLogic: 'Complementary palette.', silhouetteLogic: 'Balanced silhouettes.' };

    return {
      top_label: topG.summary,
      bottom_label: bottomG ? bottomG.summary : 'N/A',
      colorLogic: obj.colorLogic || 'Complementary colors.',
      silhouetteLogic: obj.silhouetteLogic || 'Balanced silhouettes.',
      _topGarment: topG,
      _bottomGarment: bottomG,
    };
  }

  _validateRecommendation(rec, wardrobe, baseGarment) {
    let topM = fuzzyMatch(rec.top_label, wardrobe);
    let botM = fuzzyMatch(rec.bottom_label, wardrobe);
    if (topM && BOTTOM_CATS.includes(topM.category)) {
      if (botM && TOP_CATS.includes(botM.category)) { const t = topM; topM = botM; botM = t; }
      else { botM = topM; topM = null; }
    }
    if (botM && TOP_CATS.includes(botM.category)) { if (!topM) { topM = botM; botM = null; } }
    if (topM && FULL_CATS.includes(topM.category)) botM = null;
    if (baseGarment) {
      const sl = getSlot(baseGarment.category);
      if (sl === 'TOP' || sl === 'FULL-BODY') { topM = baseGarment; if (sl === 'FULL-BODY') botM = null; }
      else if (sl === 'BOTTOM') botM = baseGarment;
      if (topM && botM && topM.id === botM.id) {
        if (sl === 'TOP') botM = wardrobe.find((g) => BOTTOM_CATS.includes(g.category) && g.id !== baseGarment.id) || null;
        else topM = wardrobe.find((g) => TOP_CATS.includes(g.category) && g.id !== baseGarment.id) || null;
      }
    }
    if (!topM) {
      const a = wardrobe.filter((g) => (TOP_CATS.includes(g.category) || FULL_CATS.includes(g.category)) && g.id !== botM?.id);
      if (a.length) topM = a[Math.floor(Math.random() * a.length)];
    }
    if (!botM && topM && !FULL_CATS.includes(topM.category)) {
      const a = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category) && g.id !== topM?.id);
      if (a.length) botM = a[Math.floor(Math.random() * a.length)];
    }
    return {
      top_label: topM?.summary || rec.top_label,
      bottom_label: (topM && FULL_CATS.includes(topM.category)) ? 'N/A' : (botM?.summary || rec.bottom_label),
      colorLogic: rec.colorLogic || 'Complementary colors.',
      silhouetteLogic: rec.silhouetteLogic || 'Balanced silhouettes.',
      _topGarment: topM || null, _bottomGarment: botM || null,
    };
  }

  // ── Internals ─────────────────────────────────────────
  async _ensureConnected() {
    if (this.connected) return;
    const r = await this.checkConnection();
    if (!r.ok) throw new Error(`LM Studio not reachable: ${r.error}`);
  }

  async _post(path, body) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 180000);
    try {
      const r = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: c.signal,
      });
      clearTimeout(t);
      if (!r.ok) { let e = ''; try { e = await r.text(); } catch {} throw new Error(`LM Studio ${r.status}: ${e.substring(0, 300)}`); }
      return await r.json();
    } catch (e) { clearTimeout(t); if (e.name === 'AbortError') throw new Error('Timeout (3 min).'); throw e; }
  }

  // Same as _post but won't throw — returns null on failure
  async _postSafe(path, body) {
    try { return await this._post(path, body); }
    catch { return null; }
  }

  _parseGarment(text) {
    const obj = extractJSON(text);
    if (!obj) throw new Error(`No JSON:\n${text.substring(0, 400)}`);
    if (!obj.summary) throw new Error('Missing "summary".');
    if (!obj.analyzed_garment) throw new Error('Missing "analyzed_garment".');
    if (!obj.category) throw new Error('Missing "category".');
    const CATS = ['Kurti','Lehenga','Dupatta','Palazzo','Churidar','Salwar','Saree','Sherwani','Anarkali','Dress','Gown','Skirt','Jeans','Pants','Blazer','Jacket','Top','Shirt'];
    const m = CATS.find((c) => c.toLowerCase() === obj.category.toLowerCase());
    if (m) obj.category = m;
    return { summary: obj.summary.trim(), analyzed_garment: obj.analyzed_garment.trim(), category: obj.category.trim() };
  }

  _parseRecommendation(text) {
    const obj = extractJSON(text);
    if (!obj) throw new Error(`No JSON:\n${text.substring(0, 400)}`);
    if (!obj.top_label) throw new Error('Missing "top_label".');
    if (!obj.colorLogic) throw new Error('Missing "colorLogic".');
    if (!obj.silhouetteLogic) throw new Error('Missing "silhouetteLogic".');
    if (!obj.bottom_label) obj.bottom_label = 'N/A';
    return obj;
  }
}

export default new LMStudioService();