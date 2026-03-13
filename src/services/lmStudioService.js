// src/services/lmStudioService.js
import * as FileSystem from 'expo-file-system';
import { extractJSON } from '../utils/helpers';

const DEFAULT_URL = 'http://10.101.237.83:1234';

// Categorize garments into wearable slots
const TOP_CATS = ['Kurti', 'Top', 'Shirt', 'Blazer', 'Jacket', 'Sherwani'];
const BOTTOM_CATS = ['Palazzo', 'Churidar', 'Salwar', 'Jeans', 'Pants', 'Skirt'];
const FULL_CATS = ['Saree', 'Lehenga', 'Anarkali', 'Dress', 'Gown'];
const ACCESSORY_CATS = ['Dupatta'];

function getSlot(category) {
  if (TOP_CATS.includes(category)) return 'TOP';
  if (BOTTOM_CATS.includes(category)) return 'BOTTOM';
  if (FULL_CATS.includes(category)) return 'FULL-BODY';
  if (ACCESSORY_CATS.includes(category)) return 'ACCESSORY';
  return 'OTHER';
}

function fuzzyMatch(label, wardrobe) {
  if (!label || label === 'N/A') return null;

  const clean = label.toLowerCase().trim();

  // Exact match
  let found = wardrobe.find((g) => g.summary.toLowerCase().trim() === clean);
  if (found) return found;

  // One contains the other
  found = wardrobe.find((g) => {
    const s = g.summary.toLowerCase().trim();
    return s.includes(clean) || clean.includes(s);
  });
  if (found) return found;

  // Word overlap scoring
  const labelWords = clean.split(/\s+/).filter((w) => w.length > 2);
  let bestScore = 0;
  let bestMatch = null;

  for (const g of wardrobe) {
    const gWords = g.summary.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    let score = 0;
    for (const lw of labelWords) {
      for (const gw of gWords) {
        if (lw === gw) score += 2;
        else if (lw.includes(gw) || gw.includes(lw)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = g;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
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

      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: controller.signal,
      });
      clearTimeout(tid);

      if (!res.ok) {
        this.connected = false;
        return { ok: false, error: `Server returned ${res.status}` };
      }

      const body = await res.json();
      const models = body?.data ?? [];

      if (models.length > 0) {
        this.modelId = models[0].id;
      }

      this.connected = true;
      return { ok: true, model: this.modelId, modelCount: models.length };
    } catch (err) {
      this.connected = false;
      if (err.name === 'AbortError') {
        return { ok: false, error: 'Connection timed out — is LM Studio running?' };
      }
      return { ok: false, error: err.message };
    }
  }

  // ─── Garment Analysis (Vision) ────────────────────────────
  async analyzeGarment(imageUri) {
    await this._ensureConnected();

    let base64;
    try {
      base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (err) {
      throw new Error(`Cannot read image: ${err.message}`);
    }

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

  // ─── Outfit Recommendation ────────────────────────────────
  async getRecommendation(weatherStr, wardrobe, baseGarmentId) {
    await this._ensureConnected();

    // Build categorized wardrobe listing
    const tops = wardrobe.filter((g) => getSlot(g.category) === 'TOP');
    const bottoms = wardrobe.filter((g) => getSlot(g.category) === 'BOTTOM');
    const fullBody = wardrobe.filter((g) => getSlot(g.category) === 'FULL-BODY');
    const accessories = wardrobe.filter((g) => getSlot(g.category) === 'ACCESSORY');

    let wardrobeSection = '';

    if (tops.length > 0) {
      wardrobeSection += 'TOPS (upper body garments):\n';
      tops.forEach((g) => {
        wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`;
      });
      wardrobeSection += '\n';
    }

    if (bottoms.length > 0) {
      wardrobeSection += 'BOTTOMS (lower body garments):\n';
      bottoms.forEach((g) => {
        wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`;
      });
      wardrobeSection += '\n';
    }

    if (fullBody.length > 0) {
      wardrobeSection += 'FULL-BODY (worn as complete outfit):\n';
      fullBody.forEach((g) => {
        wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`;
      });
      wardrobeSection += '\n';
    }

    if (accessories.length > 0) {
      wardrobeSection += 'ACCESSORIES:\n';
      accessories.forEach((g) => {
        wardrobeSection += `  - "${g.summary}" [${g.category}]: ${g.analyzed_garment}\n`;
      });
      wardrobeSection += '\n';
    }

    // Handle base garment
    let baseConstraint = '';
    let baseGarment = null;
    if (baseGarmentId) {
      baseGarment = wardrobe.find((g) => g.id === baseGarmentId);
      if (baseGarment) {
        const slot = getSlot(baseGarment.category);
        baseConstraint = `
MANDATORY BASE GARMENT CONSTRAINT:
You MUST include "${baseGarment.summary}" [${baseGarment.category}] in the outfit.
This is a ${slot} garment.
${slot === 'TOP' ? `Use "${baseGarment.summary}" as the top_label. Pick a complementary BOTTOM garment for bottom_label.` : ''}
${slot === 'BOTTOM' ? `Use "${baseGarment.summary}" as the bottom_label. Pick a complementary TOP garment for top_label.` : ''}
${slot === 'FULL-BODY' ? `Use "${baseGarment.summary}" as the top_label. Set bottom_label to "N/A" since this is a full-body garment.` : ''}
${slot === 'ACCESSORY' ? `Include this as an accessory. Still pick a top and bottom from the wardrobe.` : ''}
DO NOT ignore this constraint.
`;
      }
    }

    // Add variation
    const timeOfDay = new Date().getHours();
    let mood;
    if (timeOfDay < 12) mood = 'fresh morning look';
    else if (timeOfDay < 17) mood = 'stylish afternoon look';
    else mood = 'elegant evening look';

    const systemPrompt = `You are the outfit recommendation engine for FitCheck. You recommend outfits from the user's EXISTING wardrobe ONLY.

CRITICAL RULES:
1. "top_label" MUST be the EXACT summary string of a garment from the TOPS or FULL-BODY section.
2. "bottom_label" MUST be the EXACT summary string of a garment from the BOTTOMS section. Use "N/A" ONLY if top_label is a FULL-BODY garment (Saree, Lehenga, Anarkali, Dress, Gown).
3. NEVER put a BOTTOM garment (Pants, Jeans, Palazzo, Skirt, Churidar, Salwar) as top_label.
4. NEVER put a TOP garment (Kurti, Top, Shirt, Blazer, Jacket) as bottom_label.
5. Use the EXACT summary text from the wardrobe. Do not invent garment names.
6. Respond with ONLY a valid JSON object. No markdown. No explanation outside JSON.

JSON format:
{
  "top_label": "exact summary from wardrobe",
  "bottom_label": "exact summary from wardrobe or N/A",
  "colorLogic": "why these colors complement each other",
  "silhouetteLogic": "why these silhouettes work together"
}`;

    const userPrompt = `Weather: ${weatherStr}
Desired vibe: ${mood}
${baseConstraint}
AVAILABLE WARDROBE:
${wardrobeSection}
Pick the best outfit combination. Use EXACT summary labels. Output ONLY JSON.`;

    const payload = {
      model: this.modelId || 'default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 512,
      stream: false,
    };

    const raw = await this._post('/v1/chat/completions', payload);
    const text = raw?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Model returned empty response.');

    const parsed = this._parseRecommendation(text);

    // ── Post-process: validate & fix the response ──
    return this._validateRecommendation(parsed, wardrobe, baseGarment);
  }

  _validateRecommendation(rec, wardrobe, baseGarment) {
    // Try to match labels to actual wardrobe items
    let topMatch = fuzzyMatch(rec.top_label, wardrobe);
    let botMatch = fuzzyMatch(rec.bottom_label, wardrobe);

    // Fix: if top is actually a bottom category, swap
    if (topMatch && BOTTOM_CATS.includes(topMatch.category)) {
      if (botMatch && TOP_CATS.includes(botMatch.category)) {
        // Swap them
        const temp = topMatch;
        topMatch = botMatch;
        botMatch = temp;
      } else {
        // Top is a bottom item, find a real top
        botMatch = topMatch;
        topMatch = null;
      }
    }

    // Fix: if bottom is actually a top category, swap
    if (botMatch && TOP_CATS.includes(botMatch.category)) {
      if (!topMatch) {
        topMatch = botMatch;
        botMatch = null;
      }
    }

    // Fix: if top is full-body, bottom should be N/A
    if (topMatch && FULL_CATS.includes(topMatch.category)) {
      botMatch = null;
    }

    // Enforce base garment
    if (baseGarment) {
      const baseSlot = getSlot(baseGarment.category);

      if (baseSlot === 'TOP' || baseSlot === 'FULL-BODY') {
        topMatch = baseGarment;
        if (baseSlot === 'FULL-BODY') botMatch = null;
      } else if (baseSlot === 'BOTTOM') {
        botMatch = baseGarment;
      }

      // Make sure we don't use the same garment twice
      if (topMatch && botMatch && topMatch.id === botMatch.id) {
        if (baseSlot === 'TOP') {
          botMatch = wardrobe.find((g) =>
            BOTTOM_CATS.includes(g.category) && g.id !== baseGarment.id
          ) || null;
        } else {
          topMatch = wardrobe.find((g) =>
            TOP_CATS.includes(g.category) && g.id !== baseGarment.id
          ) || null;
        }
      }
    }

    // If top is still null, pick any top from wardrobe
    if (!topMatch) {
      const availTops = wardrobe.filter((g) =>
        (TOP_CATS.includes(g.category) || FULL_CATS.includes(g.category)) &&
        g.id !== botMatch?.id
      );
      if (availTops.length > 0) {
        topMatch = availTops[Math.floor(Math.random() * availTops.length)];
      }
    }

    // If bottom is null and top is not full-body, pick a bottom
    if (!botMatch && topMatch && !FULL_CATS.includes(topMatch.category)) {
      const availBots = wardrobe.filter((g) =>
        BOTTOM_CATS.includes(g.category) && g.id !== topMatch?.id
      );
      if (availBots.length > 0) {
        botMatch = availBots[Math.floor(Math.random() * availBots.length)];
      }
    }

    return {
      top_label: topMatch ? topMatch.summary : rec.top_label,
      bottom_label: (topMatch && FULL_CATS.includes(topMatch.category))
        ? 'N/A'
        : (botMatch ? botMatch.summary : rec.bottom_label),
      colorLogic: rec.colorLogic || 'Colors complement each other well.',
      silhouetteLogic: rec.silhouetteLogic || 'Silhouettes create a balanced look.',
      // Attach matched garment objects for the result screen
      _topGarment: topMatch || null,
      _bottomGarment: botMatch || null,
    };
  }

  // ─── Internals ────────────────────────────────────────────

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
        let errText = '';
        try { errText = await res.text(); } catch {}

        if (res.status === 400) {
          throw new Error(
            `LM Studio rejected request (400). Ensure VLM model is loaded.\n${errText.substring(0, 200)}`
          );
        }
        throw new Error(`LM Studio error ${res.status}: ${errText.substring(0, 300)}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(tid);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out (3 min).');
      }
      throw err;
    }
  }

  _parseGarment(text) {
    const obj = extractJSON(text);
    if (!obj) throw new Error(`No valid JSON in response:\n${text.substring(0, 400)}`);

    if (!obj.summary || typeof obj.summary !== 'string') throw new Error('Missing "summary".');
    if (!obj.analyzed_garment || typeof obj.analyzed_garment !== 'string') throw new Error('Missing "analyzed_garment".');
    if (!obj.category || typeof obj.category !== 'string') throw new Error('Missing "category".');

    const CATS = [
      'Kurti','Lehenga','Dupatta','Palazzo','Churidar','Salwar',
      'Saree','Sherwani','Anarkali','Dress','Gown','Skirt',
      'Jeans','Pants','Blazer','Jacket','Top','Shirt',
    ];
    const match = CATS.find((c) => c.toLowerCase() === obj.category.toLowerCase());
    if (match) obj.category = match;

    return {
      summary: obj.summary.trim(),
      analyzed_garment: obj.analyzed_garment.trim(),
      category: obj.category.trim(),
    };
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