// src/services/tryOnService.js
import * as FileSystem from 'expo-file-system';
import { HF_TOKEN } from '../config/keys';

const SPACE_URL = 'https://black-forest-labs-flux-2-klein-4b.hf.space';
const API_BASE = `${SPACE_URL}/gradio_api`;

class TryOnService {
  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (HF_TOKEN && HF_TOKEN.startsWith('hf_')) {
      this.headers['Authorization'] = `Bearer ${HF_TOKEN}`;
    }
  }

  // ── Upload a local image to the Space ──────────────────
  async _uploadImage(localUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create form data with the file
      const formData = new FormData();
      formData.append('files', {
        uri: localUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });

      const uploadHeaders = {};
      if (HF_TOKEN && HF_TOKEN.startsWith('hf_')) {
        uploadHeaders['Authorization'] = `Bearer ${HF_TOKEN}`;
      }

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}): ${errText.substring(0, 200)}`);
      }

      const paths = await res.json();
      // Returns array of paths like ["/tmp/gradio/xxxxx/upload.jpg"]
      if (!paths || paths.length === 0) {
        throw new Error('Upload returned no file paths');
      }

      return paths[0]; // Return the server path
    } catch (err) {
      throw new Error(`Image upload failed: ${err.message}`);
    }
  }

  // ── Build the image dict for Gradio ────────────────────
  _makeImageEntry(serverPath) {
    return {
      image: {
        path: serverPath,
        url: `${API_BASE}/file=${serverPath}`,
        size: null,
        orig_name: 'garment.jpg',
        mime_type: 'image/jpeg',
        is_stream: false,
        meta: {},
      },
      caption: null,
    };
  }

  // ── Main try-on function ───────────────────────────────
  async generateTryOn({
    fullBodyImageUri,
    topGarmentImageUri,
    bottomGarmentImageUri = null,
    topSummary = '',
    bottomSummary = '',
  }) {
    // Step 1: Upload all images to the Space
    const uploadPromises = [
      this._uploadImage(fullBodyImageUri),
      this._uploadImage(topGarmentImageUri),
    ];

    if (bottomGarmentImageUri) {
      uploadPromises.push(this._uploadImage(bottomGarmentImageUri));
    }

    let uploadedPaths;
    try {
      uploadedPaths = await Promise.all(uploadPromises);
    } catch (err) {
      throw new Error(`Failed to upload images: ${err.message}`);
    }

    const fullBodyPath = uploadedPaths[0];
    const topPath = uploadedPaths[1];
    const bottomPath = bottomGarmentImageUri ? uploadedPaths[2] : null;

    // Step 2: Build input images array
    // Order: garment images first, then full body model last
    const inputImages = [];

    inputImages.push(this._makeImageEntry(topPath));

    if (bottomPath) {
      inputImages.push(this._makeImageEntry(bottomPath));
    }

    inputImages.push(this._makeImageEntry(fullBodyPath));

    // Step 3: Build the prompt
    let prompt;
    if (bottomGarmentImageUri && bottomSummary) {
      prompt = `Virtual try-on: Dress the person in the full body photo wearing the "${topSummary}" as the top and "${bottomSummary}" as the bottom. Keep the exact same pose, face, body proportions, skin tone, and lighting of the original person. The garments should fit naturally on the body with correct proportions and length. Photorealistic result.`;
    } else {
      prompt = `Virtual try-on: Dress the person in the full body photo wearing the "${topSummary}". Keep the exact same pose, face, body proportions, skin tone, and lighting of the original person. The garment should fit naturally on the body with correct proportions. Photorealistic result.`;
    }

    // Step 4: Call the /infer endpoint (async — returns event_id)
    const payload = {
      data: [
        prompt,           // prompt
        inputImages,      // input_images
        'Distilled (4 steps)', // mode_choice
        0,                // seed
        true,             // randomize_seed
        768,              // width
        1024,             // height
        4,                // num_inference_steps
        1,                // guidance_scale
        false,            // prompt_upsampling
      ],
    };

    // Submit the job
    const submitRes = await fetch(`${API_BASE}/call/infer`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');

      if (submitRes.status === 429) {
        throw new Error('Rate limited — too many requests. Please wait a few minutes and try again.');
      }
      if (submitRes.status === 401 || submitRes.status === 403) {
        throw new Error('Authentication required. Add your HF token in config/keys.js');
      }
      if (submitRes.status === 503) {
        throw new Error('Model is loading (cold start). Please try again in 30-60 seconds.');
      }

      throw new Error(`API error (${submitRes.status}): ${errText.substring(0, 200)}`);
    }

    const submitData = await submitRes.json();
    const eventId = submitData.event_id;

    if (!eventId) {
      throw new Error('No event_id returned from API');
    }

    // Step 5: Poll for results via SSE
    return await this._pollResult(eventId);
  }

  // ── Poll SSE stream for completion ─────────────────────
  async _pollResult(eventId) {
    const url = `${API_BASE}/call/infer/${eventId}`;

    // Poll with fetch (SSE parsing)
    const maxWait = 180000; // 3 minutes
    const pollInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const pollHeaders = {};
        if (HF_TOKEN && HF_TOKEN.startsWith('hf_')) {
          pollHeaders['Authorization'] = `Bearer ${HF_TOKEN}`;
        }

        const res = await fetch(url, { headers: pollHeaders });

        if (!res.ok) {
          if (res.status === 404) {
            // Event not ready yet or expired
            await this._wait(pollInterval);
            continue;
          }
          throw new Error(`Poll failed (${res.status})`);
        }

        const text = await res.text();

        // Parse SSE format
        // Lines look like:
        // event: complete
        // data: [{"path":"/tmp/gradio/...","url":"..."},1234567]
        // OR
        // event: error
        // data: "error message"

        if (text.includes('event: error')) {
          const errorMatch = text.match(/data:\s*"(.+?)"/);
          throw new Error(`Generation failed: ${errorMatch ? errorMatch[1] : 'Unknown error'}`);
        }

        if (text.includes('event: complete')) {
          const dataMatch = text.match(/data:\s*(\[.+\])/s);
          if (!dataMatch) {
            throw new Error('Could not parse completion data');
          }

          const result = JSON.parse(dataMatch[1]);
          // result[0] = image dict, result[1] = seed
          const imageData = result[0];

          if (!imageData || !imageData.url) {
            throw new Error('No image URL in response');
          }

          // Download the result image locally
          const localUri = await this._downloadResult(imageData.url);
          return {
            imageUri: localUri,
            remoteUrl: imageData.url,
            seed: result[1],
          };
        }

        if (text.includes('event: heartbeat') || text.includes('event: generating')) {
          // Still processing — wait and poll again
          await this._wait(pollInterval);
          continue;
        }

        // Unknown response — wait and retry
        await this._wait(pollInterval);
      } catch (err) {
        if (err.message.includes('Generation failed') || err.message.includes('Rate limited')) {
          throw err;
        }
        // Network hiccup — retry
        await this._wait(pollInterval);
      }
    }

    throw new Error('Virtual try-on timed out after 3 minutes. The model may be overloaded.');
  }

  // ── Download result image to local filesystem ──────────
  async _downloadResult(remoteUrl) {
    try {
      const filename = `tryon_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;

      const downloadHeaders = {};
      if (HF_TOKEN && HF_TOKEN.startsWith('hf_')) {
        downloadHeaders['Authorization'] = `Bearer ${HF_TOKEN}`;
      }

      const download = await FileSystem.downloadAsync(remoteUrl, localUri, {
        headers: downloadHeaders,
      });

      if (download.status !== 200) {
        throw new Error(`Download failed (${download.status})`);
      }

      return download.uri;
    } catch (err) {
      // Return remote URL as fallback
      console.warn('Could not download result locally:', err.message);
      return remoteUrl;
    }
  }

  _wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export default new TryOnService();