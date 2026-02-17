// src/services/lmStudioService.js
import * as FileSystem from 'expo-file-system';
import {
  extractJSON, getSlot, comboKey,
  TOP_CATS, BOTTOM_CATS, FULL_CATS,
  getUnusedCombinations,
} from '../utils/helpers';
import groq from './groqService';

const DEFAULT_URL = 'http://10.101.237.83:1234';

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

  const lWords = clean.split(/\s+/).filter((w) => w.length > 2);
  let best = 0;
  let bestG = null;
  for (const g of wardrobe) {
    const gWords = g.summary.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    let score = 0;
    for (const lw of lWords) {
      for (const gw of gWords) {
        if (lw === gw) score += 2;
        else if (lw.includes(gw) || gw.includes(lw)) score += 1;
      }
    }
    if (score > best) { best = score; bestG = g; }
  }
  return best >= 2 ? bestG : null;
}

class LMStudioService {
  constructor() {
    this.baseUrl = DEFAULT_URL;
    this.connected = false;
    this.modelId = null;
  }

  setUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
    this.connected = false;
    this.modelId = null;
  }

  async checkConnection() {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.baseUrl}/v1/models`, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) { this.connected = false; return { ok: false, error: `Status ${res.status}` }; }
      const body = await res.json();
      const models = body?.data ?? [];
      if (models.length > 0) this.modelId = models[0].id;
      this.connected = true;
      return { ok: true, model: this.modelId, modelCount: models.length };
    } catch (err) {
      this.connected = false;
      return { ok: false, error: err.name === 'AbortError' ? 'Timeout' : err.message };
    }
  }

  // ── Vision analysis (local LM Studio) ──────────────────
  async analyzeGarment(imageUri) {
    await this._ensureConnected();
    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (err) { throw new Error(`Cannot read image: ${err.message}`); }

    const dataUri = `data:image/jpeg;base64,${base64}`;

    const systemPrompt = `You are an expert fashion archivist. Analyze the main garment in the provided image and output ONLY a valid, raw JSON object. Do not include markdown formatting, code blocks, or conversational text.

Construct the JSON exactly according to this schema:

1. "summary": A 3 to 5 word descriptive title (e.g., "Mustard Yellow Silk Anarkali").
2. "analyzed_garment": A single, concise paragraph that strictly describes these 6 elements:
   - Exact colors and shades
   - Fabric type and texture
   - Dominant pattern or print
   - Silhouette and cut
   - Neckline and sleeve style
   - Embellishments or detailing
3. "category": Must be exactly one of the following: Kurti, Lehenga, Dupatta, Palazzo, Churidar, Salwar, Saree, Sherwani, Anarkali, Dress, Gown, Skirt, Jeans, Pants, Blazer, Jacket, Top, Shirt.

REQUIRED OUTPUT FORMAT:
{"summary": "Crimson Red Banarasi Saree", "analyzed_garment": "A traditional crimson red Saree crafted from heavy Banarasi silk. It features intricate gold zari brocade work in floral motifs across the entire body, with a thick, ornate gold border and a heavily embellished pallu.", "category": "Saree"}`;

    const payload = {
      model: this.modelId || 'default',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUri } },
            { type: 'text', text: 'Analyze the main garment in this image. Output ONLY raw JSON.' },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 512,
      stream: false,
    };

    const raw = await this._post('/v1/chat/completions', payload);
    const text = raw?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Model returned empty response.');
    return this._parseGarment(text);
  }

  // ── Recommendation (secretly via Groq) ─────────────────
  async getRecommendation(weatherStr, wardrobe, baseGarmentId, existingOutfits = []) {
    const tops = wardrobe.filter((g) => TOP_CATS.includes(g.category));
    const bottoms = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category));
    const fullBody = wardrobe.filter((g) => FULL_CATS.includes(g.category));

    // Build categorised wardrobe
    let wardrobeSection = '';
    if (tops.length > 0) {
      wardrobeSection += 'TOPS (upper body):\n';
      tops.forEach((g) => { wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; });
      wardrobeSection += '\n';
    }
    if (bottoms.length > 0) {
      wardrobeSection += 'BOTTOMS (lower body):\n';
      bottoms.forEach((g) => { wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; });
      wardrobeSection += '\n';
    }
    if (fullBody.length > 0) {
      wardrobeSection += 'FULL-BODY (complete outfit):\n';
      fullBody.forEach((g) => { wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`; });
      wardrobeSection += '\n';
    }

    // Base garment constraint
    let baseConstraint = '';
    let baseGarment = null;
    if (baseGarmentId) {
      baseGarment = wardrobe.find((g) => g.id === baseGarmentId);
      if (baseGarment) {
        const slot = getSlot(baseGarment.category);
        baseConstraint = `\nMANDATORY: You MUST include "${baseGarment.summary}" [${baseGarment.category}] (a ${slot} garment) in the outfit.`;
        if (slot === 'TOP') baseConstraint += ` Use it as top_label. Pick a BOTTOM for bottom_label.`;
        else if (slot === 'BOTTOM') baseConstraint += ` Use it as bottom_label. Pick a TOP for top_label.`;
        else if (slot === 'FULL-BODY') baseConstraint += ` Use it as top_label. Set bottom_label to "N/A".`;
        baseConstraint += '\n';
      }
    }

    // Already generated combinations to avoid
    let avoidSection = '';
    if (existingOutfits.length > 0) {
      const combos = existingOutfits.map((o) => `"${o.topLabel}" + "${o.bottomLabel}"`);
      avoidSection = `\nALREADY RECOMMENDED (DO NOT repeat these combinations):\n${combos.join('\n')}\nChoose a DIFFERENT combination.\n`;
    }

    const timeHour = new Date().getHours();
    const mood = timeHour < 12 ? 'fresh morning' : timeHour < 17 ? 'stylish afternoon' : 'elegant evening';

    const systemPrompt = `You are the outfit recommendation engine for FitCheck. Recommend outfits from the user's EXISTING wardrobe ONLY.

CRITICAL RULES:
1. "top_label" MUST be the EXACT summary of a garment from TOPS or FULL-BODY.
2. "bottom_label" MUST be the EXACT summary of a garment from BOTTOMS. Use "N/A" ONLY for FULL-BODY garments.
3. NEVER put a BOTTOM garment as top_label or a TOP garment as bottom_label.
4. Use EXACT summary text. Do not invent names.
5. Respond with ONLY valid JSON. No markdown.

JSON: {"top_label":"...","bottom_label":"...","colorLogic":"...","silhouetteLogic":"..."}`;

    const userPrompt = `Weather: ${weatherStr}
Vibe: ${mood}
${baseConstraint}${avoidSection}
WARDROBE:
${wardrobeSection}
Pick the best NEW outfit combination. Output ONLY JSON.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Try up to 3 times for a unique combination
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await groq.call(messages, { temperature: 0.4 + attempt * 0.15 });
        const parsed = this._parseRecommendation(text);
        const validated = this._validateRecommendation(parsed, wardrobe, baseGarment);

        // Check if duplicate
        const key = comboKey(validated._topGarment?.id, validated._bottomGarment?.id);
        const isDup = existingOutfits.some(
          (o) => comboKey(o.topId, o.bottomId) === key
        );

        if (!isDup || attempt === 2) {
          return validated;
        }

        // Add stronger dedup instruction for retry
        messages.push({
          role: 'assistant',
          content: text,
        });
        messages.push({
          role: 'user',
          content: `That combination was already recommended. Pick a COMPLETELY DIFFERENT pair. Output ONLY JSON.`,
        });
      } catch (err) {
        if (attempt === 2) throw err;
      }
    }

    // Fallback: manually pick unused combination
    const unused = getUnusedCombinations(wardrobe, existingOutfits);
    if (unused.length > 0) {
      const pick = unused[Math.floor(Math.random() * unused.length)];
      return await this._getLogicForPair(pick.top, pick.bottom, weatherStr);
    }

    throw new Error('Could not generate a unique outfit.');
  }

  async _getLogicForPair(topGarment, bottomGarment, weatherStr) {
    const prompt = `Given this outfit for ${weatherStr} weather:
Top: "${topGarment.summary}" — ${topGarment.analyzed_garment}
${bottomGarment ? `Bottom: "${bottomGarment.summary}" — ${bottomGarment.analyzed_garment}` : 'This is a full-body garment.'}

Explain in JSON ONLY: {"colorLogic":"why colors work","silhouetteLogic":"why silhouettes complement"}`;

    const text = await groq.call([
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    const obj = extractJSON(text) || {
      colorLogic: 'These colors create a harmonious palette.',
      silhouetteLogic: 'The silhouettes balance each other well.',
    };

    return {
      top_label: topGarment.summary,
      bottom_label: bottomGarment ? bottomGarment.summary : 'N/A',
      colorLogic: obj.colorLogic || 'Complementary color palette.',
      silhouetteLogic: obj.silhouetteLogic || 'Balanced silhouettes.',
      _topGarment: topGarment,
      _bottomGarment: bottomGarment,
    };
  }

  _validateRecommendation(rec, wardrobe, baseGarment) {
    let topMatch = fuzzyMatch(rec.top_label, wardrobe);
    let botMatch = fuzzyMatch(rec.bottom_label, wardrobe);

    if (topMatch && BOTTOM_CATS.includes(topMatch.category)) {
      if (botMatch && TOP_CATS.includes(botMatch.category)) {
        const t = topMatch; topMatch = botMatch; botMatch = t;
      } else { botMatch = topMatch; topMatch = null; }
    }
    if (botMatch && TOP_CATS.includes(botMatch.category)) {
      if (!topMatch) { topMatch = botMatch; botMatch = null; }
    }
    if (topMatch && FULL_CATS.includes(topMatch.category)) botMatch = null;

    if (baseGarment) {
      const slot = getSlot(baseGarment.category);
      if (slot === 'TOP' || slot === 'FULL-BODY') { topMatch = baseGarment; if (slot === 'FULL-BODY') botMatch = null; }
      else if (slot === 'BOTTOM') botMatch = baseGarment;

      if (topMatch && botMatch && topMatch.id === botMatch.id) {
        if (slot === 'TOP') botMatch = wardrobe.find((g) => BOTTOM_CATS.includes(g.category) && g.id !== baseGarment.id) || null;
        else topMatch = wardrobe.find((g) => TOP_CATS.includes(g.category) && g.id !== baseGarment.id) || null;
      }
    }

    if (!topMatch) {
      const avail = wardrobe.filter((g) => (TOP_CATS.includes(g.category) || FULL_CATS.includes(g.category)) && g.id !== botMatch?.id);
      if (avail.length) topMatch = avail[Math.floor(Math.random() * avail.length)];
    }
    if (!botMatch && topMatch && !FULL_CATS.includes(topMatch.category)) {
      const avail = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category) && g.id !== topMatch?.id);
      if (avail.length) botMatch = avail[Math.floor(Math.random() * avail.length)];
    }

    return {
      top_label: topMatch?.summary || rec.top_label,
      bottom_label: (topMatch && FULL_CATS.includes(topMatch.category)) ? 'N/A' : (botMatch?.summary || rec.bottom_label),
      colorLogic: rec.colorLogic || 'Complementary colors.',
      silhouetteLogic: rec.silhouetteLogic || 'Balanced silhouettes.',
      _topGarment: topMatch || null,
      _bottomGarment: botMatch || null,
    };
  }

  // ── Internals ──────────────────────────────────────────
  async _ensureConnected() {
    if (this.connected) return;
    const r = await this.checkConnection();
    if (!r.ok) throw new Error(`LM Studio not reachable: ${r.error}`);
  }

  async _post(path, body) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 180000);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!res.ok) {
        let e = ''; try { e = await res.text(); } catch {}
        throw new Error(`LM Studio ${res.status}: ${e.substring(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(tid);
      if (err.name === 'AbortError') throw new Error('Request timed out (3 min).');
      throw err;
    }
  }

  _parseGarment(text) {
    const obj = extractJSON(text);
    if (!obj) throw new Error(`No valid JSON:\n${text.substring(0, 400)}`);
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
    if (!obj) throw new Error(`No valid JSON:\n${text.substring(0, 400)}`);
    if (!obj.top_label) throw new Error('Missing "top_label".');
    if (!obj.colorLogic) throw new Error('Missing "colorLogic".');
    if (!obj.silhouetteLogic) throw new Error('Missing "silhouetteLogic".');
    if (!obj.bottom_label) obj.bottom_label = 'N/A';
    return obj;
  }
}

export default new LMStudioService();