import * as FileSystem from 'expo-file-system';
import { HF_KEYS } from '../config/keys';
import { sleep, uid } from '../utils/helpers';
import { persistImage } from './imageStorage';

const SPACE_URL = 'https://black-forest-labs-flux-2-klein-4b.hf.space';
const API = `${SPACE_URL}/gradio_api`;

class TryOnService {
  constructor() {
    this.keys = (HF_KEYS || []).filter((k) => k && k.startsWith('hf_'));
    this.keyIndex = 0;
    this.failedKeys = new Set();
    console.log(`[TryOn] Loaded ${this.keys.length} HF keys`);
  }

  _key() {
    if (!this.keys.length) return null;
    return this.keys[this.keyIndex % this.keys.length];
  }

  _nextKey() {
    if (this.keys.length <= 1) return this._key();
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
    let tried = 0;
    while (this.failedKeys.has(this._key()) && tried < this.keys.length) {
      this.keyIndex = (this.keyIndex + 1) % this.keys.length;
      tried++;
    }
    return this._key();
  }

  _markFailed(key) {
    if (key) {
      this.failedKeys.add(key);
      console.log(`[TryOn] Marked key ...${key.slice(-6)} as failed. Failed: ${this.failedKeys.size}/${this.keys.length}`);
    }
  }

  _resetFailed() {
    this.failedKeys.clear();
  }

  _allKeys() {
    if (!this.keys.length) return [null];
    const ordered = [];
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.keyIndex + i) % this.keys.length;
      if (!this.failedKeys.has(this.keys[idx])) {
        ordered.push(this.keys[idx]);
      }
    }
    // If all are failed, try them all again
    if (ordered.length === 0) {
      for (let i = 0; i < this.keys.length; i++) {
        ordered.push(this.keys[(this.keyIndex + i) % this.keys.length]);
      }
    }
    return ordered;
  }

  _headers(key) {
    const h = {};
    if (key) h['Authorization'] = `Bearer ${key}`;
    return h;
  }

  async _readBase64(uri) {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async _uploadFile(localUri) {
    const keys = this._allKeys();
    for (const key of keys) {
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

        if (res.status === 429 || res.status === 401 || res.status === 403) {
          this._markFailed(key);
          continue;
        }

        if (res.ok) {
          const paths = await res.json();
          if (Array.isArray(paths) && paths.length > 0) {
            if (key) {
              const idx = this.keys.indexOf(key);
              if (idx >= 0) this.keyIndex = idx;
            }
            return paths[0];
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  _makeImageObj(serverPath) {
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

  _makeBase64ImageObj(b64) {
    return {
      image: {
        path: null,
        url: `data:image/jpeg;base64,${b64}`,
        size: null, orig_name: 'image.jpg', mime_type: 'image/jpeg',
        is_stream: false, meta: {},
      },
      caption: null,
    };
  }

  async _prepareImage(localUri) {
    const serverPath = await this._uploadFile(localUri);
    if (serverPath) return this._makeImageObj(serverPath);
    const b64 = await this._readBase64(localUri);
    return this._makeBase64ImageObj(b64);
  }

  // ── Main entry ──────────────────────────────────────
  async generate({ fullBodyUri, topUri, bottomUri, topSummary, bottomSummary, gender }) {
    if (!fullBodyUri) throw new Error('Full-body photo is required.');
    if (!topUri) throw new Error('Top garment image is required.');

    this._resetFailed();

    console.log(`[TryOn] Preparing images...`);
    const topImg = await this._prepareImage(topUri);
    const bottomImg = bottomUri ? await this._prepareImage(bottomUri) : null;
    const bodyImg = await this._prepareImage(fullBodyUri);

    const inputImages = [topImg];
    if (bottomImg) inputImages.push(bottomImg);
    inputImages.push(bodyImg);

    const personDesc = gender === 'male'
      ? 'male person (man/boy)'
      : gender === 'female'
        ? 'female person (woman/girl)'
        : 'person';

    const pro = gender === 'male'
      ? { pos: 'his' }
      : gender === 'female'
        ? { pos: 'her' }
        : { pos: 'their' };

    let prompt;
    if (bottomUri && bottomSummary) {
      prompt = `Virtual try-on for a ${personDesc}: Dress the ${personDesc} in the full body reference photo wearing the "${topSummary}" as the top and "${bottomSummary}" as the bottom. This is a ${gender || 'unspecified'} model. Keep the exact same pose, face, body shape, proportions, skin tone, hair, and lighting. Garments must fit naturally on ${pro.pos} body with correct proportions. Photorealistic high quality fashion photo.`;
    } else {
      prompt = `Virtual try-on for a ${personDesc}: Dress the ${personDesc} in the full body reference photo wearing the "${topSummary}". This is a ${gender || 'unspecified'} model. Keep the exact same pose, face, body shape, proportions, skin tone, hair, and lighting. The garment must fit naturally on ${pro.pos} body with correct proportions. Photorealistic high quality fashion photo.`;
    }

    const data = [prompt, inputImages, 'Distilled (4 steps)', 0, true, 768, 1024, 4, 1, false];

    return await this._submitWithAllKeys(data);
  }

  // ── Try every key ───────────────────────────────────
  async _submitWithAllKeys(data) {
    const keys = this._allKeys();
    let lastError = null;
    let rateLimitedCount = 0;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const keyLabel = key ? `...${key.slice(-6)}` : 'no-auth';
      console.log(`[TryOn] Trying key ${i + 1}/${keys.length} (${keyLabel})...`);

      try {
        const result = await this._tryOneKey(key, data);
        if (result) {
          console.log(`[TryOn] Success with key ${i + 1}`);
          if (key) {
            const idx = this.keys.indexOf(key);
            if (idx >= 0) this.keyIndex = idx;
          }
          return result;
        }
        // result is null/undefined — treat as soft failure, try next
        console.log(`[TryOn] Key ${i + 1} returned empty result, trying next...`);
        this._markFailed(key);
        continue;
      } catch (err) {
        lastError = err;
        const msg = err.message || '';

        // Key-specific errors → rotate to next key
        if (
          msg.includes('Rate limited') ||
          msg.includes('quota') ||
          msg.includes('Auth failed') ||
          msg.includes('429') ||
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('null') ||  // "Generation failed: null" = usually quota
          msg === 'Generation failed: null'
        ) {
          console.log(`[TryOn] Key ${i + 1} failed (${msg}), rotating...`);
          this._markFailed(key);
          rateLimitedCount++;
          continue;
        }

        // Model loading — worth retrying with same logic
        if (msg.includes('loading') || msg.includes('503')) {
          console.log(`[TryOn] Model loading, trying next key...`);
          this._markFailed(key);
          continue;
        }

        // Timeout — try next key (might be key-specific throttling)
        if (msg.includes('Timed out')) {
          console.log(`[TryOn] Timed out with key ${i + 1}, trying next...`);
          this._markFailed(key);
          continue;
        }

        // Genuinely fatal errors (parse errors, etc) — still try next key
        console.log(`[TryOn] Key ${i + 1} error: ${msg}, trying next...`);
        this._markFailed(key);
        continue;
      }
    }

    if (rateLimitedCount > 0 && rateLimitedCount >= keys.length) {
      throw new Error(
        `All ${keys.length} HF keys exceeded quota. Wait a few minutes or add more keys.`
      );
    }

    throw lastError || new Error('All keys failed. Check your HF tokens.');
  }

  // ── Single key attempt ──────────────────────────────
  async _tryOneKey(key, data) {
    const session = uid();

    // Try /queue/join first
    const joinResult = await this._tryQueueJoin(key, data, session);
    if (joinResult !== null) return joinResult;

    // Fallback: /call/infer
    const callResult = await this._tryCallInfer(key, data);
    if (callResult !== null) return callResult;

    return null;
  }

  async _tryQueueJoin(key, data, session) {
    try {
      const payload = { data, fn_index: 2, session_hash: session };

      const res = await fetch(`${API}/queue/join`, {
        method: 'POST',
        headers: { ...this._headers(key), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) throw new Error('Rate limited / quota exceeded');
      if (res.status === 401 || res.status === 403) throw new Error('Auth failed');

      if (res.status === 503) {
        console.log(`[TryOn] Space sleeping, waiting 8s...`);
        await sleep(8000);
        const retry = await fetch(`${API}/queue/join`, {
          method: 'POST',
          headers: { ...this._headers(key), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (retry.status === 429) throw new Error('Rate limited / quota exceeded');
        if (retry.status === 401) throw new Error('Auth failed');
        if (!retry.ok) return null;
        const retryData = await retry.json();
        if (retryData.event_id) return await this._pollEventId(retryData.event_id, key);
        return await this._pollQueue(session, key);
      }

      if (!res.ok) return null;

      const body = await res.json();
      if (body.event_id) return await this._pollEventId(body.event_id, key);
      return await this._pollQueue(session, key);
    } catch (err) {
      if (err.message.includes('Rate limited') || err.message.includes('Auth failed')) throw err;
      console.log(`[TryOn] queue/join failed: ${err.message}`);
      return null;
    }
  }

  async _tryCallInfer(key, data) {
    try {
      const res = await fetch(`${API}/call/infer`, {
        method: 'POST',
        headers: { ...this._headers(key), 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (res.status === 429) throw new Error('Rate limited / quota exceeded');
      if (res.status === 401 || res.status === 403) throw new Error('Auth failed');
      if (res.status === 503) throw new Error('Model is loading');
      if (!res.ok) return null;

      const body = await res.json();
      if (body.event_id) return await this._pollEventId(body.event_id, key);
      return null;
    } catch (err) {
      if (err.message.includes('Rate limited') || err.message.includes('Auth failed') || err.message.includes('loading')) throw err;
      return null;
    }
  }

  // ── Poll event_id ───────────────────────────────────
  async _pollEventId(eventId, key) {
    const url = `${API}/call/infer/${eventId}`;
    const maxWait = 180000;
    const start = Date.now();
    let pollKey = key;

    console.log(`[TryOn] Polling event ${eventId}...`);

    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(url, { headers: this._headers(pollKey) });

        if (res.status === 429 || res.status === 401 || res.status === 403) {
          pollKey = this._findWorkingKey(pollKey);
          await sleep(2000);
          continue;
        }

        if (res.status === 404) {
          await sleep(3000);
          continue;
        }

        if (!res.ok) {
          await sleep(3000);
          continue;
        }

        const text = await res.text();
        const parsed = this._parseSSE(text);

        if (parsed.error) {
          // "null" error is usually quota — retriable with different key
          if (parsed.error === 'null' || parsed.error === 'None' || parsed.error === 'undefined') {
            console.log(`[TryOn] Got null error from poll — likely quota issue`);
            throw new Error('Generation failed: null');
          }
          throw new Error(`Generation failed: ${parsed.error}`);
        }

        if (parsed.complete && parsed.imageUrl) {
          console.log(`[TryOn] Got result image URL`);
          return await this._downloadResult(parsed.imageUrl);
        }

        await sleep(3000);
      } catch (err) {
        if (err.message.includes('Generation failed')) throw err;
        await sleep(3000);
      }
    }

    throw new Error('Timed out after 3 minutes.');
  }

  // ── Poll queue ──────────────────────────────────────
  async _pollQueue(sessionHash, key) {
    const url = `${API}/queue/data?session_hash=${sessionHash}`;
    const maxWait = 180000;
    const start = Date.now();
    let pollKey = key;

    console.log(`[TryOn] Polling queue session...`);

    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(url, { headers: this._headers(pollKey) });

        if (res.status === 429 || res.status === 401 || res.status === 403) {
          pollKey = this._findWorkingKey(pollKey);
          await sleep(2000);
          continue;
        }

        if (!res.ok) { await sleep(3000); continue; }

        const text = await res.text();
        const lines = text.split('\n');
        let evt = '', d = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            evt = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            d = line.substring(5).trim();

            if (evt === 'error' || evt === 'process_error') {
              let msg = 'Unknown error';
              try {
                const obj = JSON.parse(d);
                if (obj === null) msg = 'null';
                else if (typeof obj === 'string') msg = obj;
                else msg = obj.message || obj.error || JSON.stringify(obj);
              } catch {
                msg = d.replace(/^"/, '').replace(/"$/, '') || 'null';
              }
              if (msg === 'null' || msg === 'None') {
                throw new Error('Generation failed: null');
              }
              throw new Error(`Generation failed: ${msg}`);
            }

            if (evt === 'complete' || evt === 'process_completed') {
              try {
                const p = JSON.parse(d);
                const output = p?.output?.data || p?.data;
                if (output?.[0]) {
                  const img = output[0];
                  const imgUrl = img?.url || (img?.path ? `${API}/file=${img.path}` : null);
                  if (imgUrl) return await this._downloadResult(imgUrl);
                }
              } catch (e) {
                throw new Error(`Parse error: ${e.message}`);
              }
            }
          }
        }

        await sleep(3000);
      } catch (err) {
        if (err.message.includes('Generation failed') || err.message.includes('Parse error')) throw err;
        await sleep(3000);
      }
    }

    throw new Error('Timed out after 3 minutes.');
  }

  _findWorkingKey(currentKey) {
    for (const k of this.keys) {
      if (k !== currentKey && !this.failedKeys.has(k)) return k;
    }
    return this.keys[0] || null;
  }

  _parseSSE(text) {
    const result = { complete: false, error: null, imageUrl: null };
    const lines = text.split('\n');
    let evt = '';

    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('event:')) {
        evt = t.substring(6).trim();
      } else if (t.startsWith('data:')) {
        const d = t.substring(5).trim();

        if (evt === 'error' || evt === 'process_error') {
          try {
            const p = JSON.parse(d);
            if (p === null || p === undefined) {
              result.error = 'null';
            } else if (typeof p === 'string') {
              result.error = p || 'null';
            } else {
              result.error = p.message || p.error || JSON.stringify(p);
            }
          } catch {
            const cleaned = d.replace(/^"/, '').replace(/"$/, '').trim();
            result.error = cleaned || 'null';
          }
          return result;
        }

        if (evt === 'complete' || evt === 'process_completed') {
          try {
            const p = JSON.parse(d);
            if (Array.isArray(p) && p[0]) {
              result.imageUrl = p[0].url || (p[0].path ? `${API}/file=${p[0].path}` : null);
            } else if (p?.data?.[0]) {
              result.imageUrl = p.data[0].url || (p.data[0].path ? `${API}/file=${p.data[0].path}` : null);
            } else if (p?.output?.data?.[0]) {
              result.imageUrl = p.output.data[0].url || (p.output.data[0].path ? `${API}/file=${p.output.data[0].path}` : null);
            }
            result.complete = !!result.imageUrl;
          } catch {
            result.error = `Parse error`;
          }
          return result;
        }
      }
    }
    return result;
  }

  async _downloadResult(imageUrl) {
    console.log(`[TryOn] Downloading result...`);
    const fname = `tryon_${Date.now()}.jpg`;
    const localPath = FileSystem.cacheDirectory + fname;

    const keysToTry = [...this.keys.filter((k) => !this.failedKeys.has(k)), ...this.keys, null];
    // Deduplicate
    const unique = [...new Set(keysToTry)];

    for (let i = 0; i < unique.length; i++) {
      const key = unique[i];
      try {
        const dl = await FileSystem.downloadAsync(
          imageUrl,
          localPath + (i > 0 ? `_${i}` : ''),
          { headers: this._headers(key) }
        );
        if (dl.status === 200) {
          const persisted = await persistImage(dl.uri);
          console.log(`[TryOn] Downloaded and persisted`);
          return persisted;
        }
        if (dl.status === 429 || dl.status === 401) {
          if (key) this._markFailed(key);
        }
      } catch {
        continue;
      }
    }

    return imageUrl;
  }
}

export default new TryOnService();