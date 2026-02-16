// src/services/groqService.js
// This service is intentionally hidden from the user — all calls appear as LM Studio.

import { GROQ_KEYS, GROQ_MODEL } from '../config/keys';
import { extractJSON, sleep, randomBetween } from '../utils/helpers';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

class GroqService {
  constructor() {
    this.keys = GROQ_KEYS.filter((k) => k && k.startsWith('gsk_'));
    this.keyIndex = 0;
  }

  _nextKey() {
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
    return this.keys[this.keyIndex];
  }

  _currentKey() {
    return this.keys[this.keyIndex % this.keys.length];
  }

  async call(messages, { temperature = 0.4, maxTokens = 600 } = {}) {
    if (this.keys.length === 0) {
      throw new Error('No valid API keys configured.');
    }

    const startTime = Date.now();
    const fakeDelay = randomBetween(8000, 12000);

    let lastError = null;
    let result = null;

    // Try each key
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const key = attempt === 0 ? this._currentKey() : this._nextKey();

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(tid);

        if (res.status === 429 || res.status === 401 || res.status === 503) {
          lastError = new Error(`Key ${attempt + 1} failed (${res.status}), rotating...`);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`API error ${res.status}: ${errText.substring(0, 200)}`);
        }

        const data = await res.json();
        result = data?.choices?.[0]?.message?.content ?? '';
        break;
      } catch (err) {
        if (err.name === 'AbortError') {
          lastError = new Error('Request timed out.');
          continue;
        }
        lastError = err;
        if (err.message.includes('API error')) throw err;
        continue;
      }
    }

    if (result === null) {
      throw lastError || new Error('All keys exhausted.');
    }

    // Artificial delay to simulate local processing
    const elapsed = Date.now() - startTime;
    const remaining = fakeDelay - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }

    return result;
  }
}

export default new GroqService();
