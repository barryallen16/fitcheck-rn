import * as FileSystem from 'expo-file-system';
import { HF_TOKEN } from '../config/keys';
import { sleep, uid } from '../utils/helpers';
import { persistImage } from './imageStorage';

const SPACE_URL = 'https://black-forest-labs-flux-2-klein-4b.hf.space';
const API = `${SPACE_URL}/gradio_api`;

class TryOnService {
  constructor() {
    // 1. Robust key loading (handles Array or Object exports)
    let rawKeys = HF_TOKEN; // Updated to use the correct variable
    if (rawKeys && typeof rawKeys === 'object' && !Array.isArray(rawKeys)) {
      rawKeys = Object.values(rawKeys);
    }

    // 2. Be less strict: accept any string longer than 10 chars
    this.keys = (rawKeys || []).filter((k) => typeof k === 'string' && k.trim().length > 10);
    
    this.keyIndex = 0;
    this.failedKeys = new Set();
    
    console.log(`[TryOn] Service initialized. Found ${this.keys.length} usable keys.`);
    if (this.keys.length === 0) {
      console.warn("[TryOn] WARNING: No valid HuggingFace keys detected. Check your config/keys.js export.");
    }
  }

  _headers(key) {
    const h = {};
    if (key) h['Authorization'] = `Bearer ${key}`;
    return h;
  }

  _markFailed(key) {
    if (key) {
      this.failedKeys.add(key);
      console.log(`[TryOn] Key ...${key.slice(-6)} flagged as failed.`);
    }
  }

  _resetFailed() {
    this.failedKeys.clear();
  }

  _allKeys() {
    if (this.keys.length === 0) return [null];
    
    // Filter out failed keys
    let available = this.keys.filter(k => !this.failedKeys.has(k));

    // If EVERY key has failed, reset them (they might have recovered from rate limits)
    if (available.length === 0) {
      console.log(`[TryOn] All keys were flagged. Resetting pool to try again.`);
      this._resetFailed();
      available = [...this.keys];
    }

    // Reorder so we start from the last known-good index
    const ordered = [];
    for (let i = 0; i < available.length; i++) {
      const idx = (this.keyIndex + i) % available.length;
      ordered.push(available[idx]);
    }
    return ordered;
  }

  // ── Preparation & Upload ────────────────────────────
  
  async _uploadFile(localUri) {
    // We try keys sequentially for the upload
    const keysToTry = this._allKeys();
    
    for (const key of keysToTry) {
      try {
        const formData = new FormData();
        formData.append('files', {
          uri: localUri,
          type: 'image/jpeg',
          name: `img_${Date.now()}.jpg`,
        });

        const res = await fetch(`${API}/upload`, {
          method: 'POST',
          headers: this._headers(key),
          body: formData,
        });

        // If this specific key is rate limited/bad, mark and move to next
        if (res.status === 429 || res.status === 401 || res.status === 403) {
          this._markFailed(key);
          continue;
        }

        if (res.ok) {
          const paths = await res.json();
          if (Array.isArray(paths) && paths.length > 0) {
            return paths[0];
          }
        }
      } catch (err) {
        console.log(`[TryOn] Upload error with current key: ${err.message}`);
        continue;
      }
    }
    return null;
  }

  async _prepareImage(localUri) {
    const serverPath = await this._uploadFile(localUri);
    if (serverPath) {
      return {
        image: {
          path: serverPath,
          url: `${API}/file=${serverPath}`,
          size: null, orig_name: 'image.jpg', mime_type: 'image/jpeg',
          is_stream: false, meta: {},
        },
        caption: null,
      };
    }
    // Final fallback to base64 if all uploads fail
    const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    return {
      image: { url: `data:image/jpeg;base64,${b64}`, is_stream: false, meta: {} },
      caption: null,
    };
  }

  // ── Main Entry ──────────────────────────────────────

  async generate({ fullBodyUri, topUri, bottomUri, topSummary, bottomSummary, gender }) {
    if (!fullBodyUri || !topUri) throw new Error('Input images missing.');

    this._resetFailed(); // Start fresh for each user request

    console.log(`[TryOn] Preparing images...`);
    // Run preparation in parallel
    const [topImg, bottomImg, bodyImg] = await Promise.all([
      this._prepareImage(topUri),
      bottomUri ? this._prepareImage(bottomUri) : Promise.resolve(null),
      this._prepareImage(fullBodyUri)
    ]);

    const inputImages = [topImg];
    if (bottomImg) inputImages.push(bottomImg);
    inputImages.push(bodyImg);

    // Prioritizing visual attributes over subjective ones like "fit" based on your project preferences
    const prompt = `Virtual try-on: Dress the ${gender || 'person'} in the full body reference photo wearing the "${topSummary}"${bottomSummary ? ` and "${bottomSummary}"` : ''}. Keep the exact same pose, face, body shape, proportions, skin tone, hair, and lighting. Photorealistic high quality fashion photo.`;
    
    const data = [prompt, inputImages, 'Distilled (4 steps)', 0, true, 768, 1024, 4, 1, false];

    return await this._submitWithAllKeys(data);
  }

  async _submitWithAllKeys(data) {
    const availableKeys = this._allKeys();
    let lastError = null;

    console.log(`[TryOn] Starting inference loop with ${availableKeys.length} keys.`);

    for (let i = 0; i < availableKeys.length; i++) {
      const key = availableKeys[i];
      const keyLabel = key ? `...${key.slice(-6)}` : 'No-Auth';
      
      console.log(`[TryOn] Attempting key ${i + 1}/${availableKeys.length} (${keyLabel})`);

      try {
        const result = await this._tryOneKey(key, data);
        if (result) {
          // Success! Save this index so we start here next time
          this.keyIndex = this.keys.indexOf(key);
          return result;
        }
        this._markFailed(key);
      } catch (err) {
        lastError = err;
        console.log(`[TryOn] Key ${i + 1} failed: ${err.message}`);
        this._markFailed(key);
        // Continue to next key...
      }
    }

    throw lastError || new Error(`All ${this.keys.length} keys failed. Please check HuggingFace quotas.`);
  }

  async _tryOneKey(key, data) {
    const session = uid();
    // Try queue first
    const res = await fetch(`${API}/queue/join`, {
      method: 'POST',
      headers: { ...this._headers(key), 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, fn_index: 2, session_hash: session }),
    });

    if (res.status === 429 || res.status === 401 || res.status === 403) {
        throw new Error(`Status ${res.status}`);
    }

    if (!res.ok) return null;

    const body = await res.json();
    if (body.event_id) return await this._pollEventId(body.event_id, key);
    return null;
  }

  async _pollEventId(eventId, key) {
    const url = `${API}/call/infer/${eventId}`;
    const start = Date.now();

    while (Date.now() - start < 180000) { // 3 min timeout
      try {
        const res = await fetch(url, { headers: this._headers(key) });
        if (!res.ok) { await sleep(3000); continue; }

        const text = await res.text();
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.includes('process_completed')) {
            const dataStr = line.replace('data:', '').trim();
            const p = JSON.parse(dataStr);
            const img = p?.output?.data?.[0] || p?.data?.[0];
            if (img?.url) return await this._downloadResult(img.url, key);
          }
          if (line.includes('error')) throw new Error("Inference Error");
        }
      } catch (e) {
        if (e.message === "Inference Error") throw e;
      }
      await sleep(3000);
    }
    return null;
  }

  async _downloadResult(imageUrl, key) {
    const localPath = `${FileSystem.cacheDirectory}tryon_${Date.now()}.jpg`;
    try {
      const dl = await FileSystem.downloadAsync(imageUrl, localPath, { headers: this._headers(key) });
      if (dl.status === 200) return await persistImage(dl.uri);
    } catch { 
      return imageUrl; 
    }
  }
}

export default new TryOnService();