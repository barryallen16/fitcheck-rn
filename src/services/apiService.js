import { LMS_KEYS, LMS_MODEL, LMS_API_URL } from "../config/keys.js";

class ApiService {
  constructor() {
    this.keys = LMS_KEYS.filter(Boolean);
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
    if (!LMS_API_URL) throw new Error("No API URL configured.");
    if (this.keys.length === 0) throw new Error("No API keys configured.");

    let lastError = null;
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const key = attempt === 0 ? this._currentKey() : this._nextKey();
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(LMS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: LMS_MODEL,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
          signal: controller.signal,
        });
        clearTimeout(tid);
        if (res.status === 429 || res.status === 401 || res.status === 503) {
          lastError = new Error(`Key ${attempt + 1} failed (${res.status})`);
          continue;
        }
        if (!res.ok) {
          const e = await res.text().catch(() => "");
          throw new Error(`API ${res.status}: ${e.substring(0, 200)}`);
        }
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      } catch (err) {
        if (err.name === "AbortError") {
          lastError = new Error("Timeout");
          continue;
        }
        lastError = err;
        if (err.message.includes("API")) throw err;
        continue;
      }
    }
    throw lastError || new Error("All API keys failed.");
  }
}

export default new ApiService();
