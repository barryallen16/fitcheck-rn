// src/services/imageStorage.js
import * as FileSystem from 'expo-file-system';

const IMG_DIR = FileSystem.documentDirectory + 'fitcheck/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(IMG_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMG_DIR, { intermediates: true });
  }
}

export async function persistImage(tempUri) {
  await ensureDir();
  const ext = tempUri.includes('.png') ? 'png' : 'jpg';
  const name = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const dest = IMG_DIR + name;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function deleteImage(uri) {
  try {
    if (uri && uri.startsWith(IMG_DIR)) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) await FileSystem.deleteAsync(uri);
    }
  } catch {}
}

export async function imageExists(uri) {
  if (!uri) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}