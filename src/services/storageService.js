// src/services/storageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  WARDROBE: '@fc_wardrobe',
  SERVER: '@fc_server_url',
  OUTFITS: '@fc_outfits',
  USER_PHOTO: '@fc_user_photo',
  TRYON_HISTORY: '@fc_tryon_history',
};

export default {
  async saveWardrobe(w) { try { await AsyncStorage.setItem(KEYS.WARDROBE, JSON.stringify(w)); } catch {} },
  async loadWardrobe() { try { const v = await AsyncStorage.getItem(KEYS.WARDROBE); return v ? JSON.parse(v) : []; } catch { return []; } },
  async saveServer(url) { try { await AsyncStorage.setItem(KEYS.SERVER, url); } catch {} },
  async loadServer() { try { return await AsyncStorage.getItem(KEYS.SERVER); } catch { return null; } },
  async saveOutfits(o) { try { await AsyncStorage.setItem(KEYS.OUTFITS, JSON.stringify(o)); } catch {} },
  async loadOutfits() { try { const v = await AsyncStorage.getItem(KEYS.OUTFITS); return v ? JSON.parse(v) : []; } catch { return []; } },
  async saveUserPhoto(uri) { try { await AsyncStorage.setItem(KEYS.USER_PHOTO, uri || ''); } catch {} },
  async loadUserPhoto() { try { return await AsyncStorage.getItem(KEYS.USER_PHOTO); } catch { return null; } },
  async saveTryOnHistory(h) { try { await AsyncStorage.setItem(KEYS.TRYON_HISTORY, JSON.stringify(h)); } catch {} },
  async loadTryOnHistory() { try { const v = await AsyncStorage.getItem(KEYS.TRYON_HISTORY); return v ? JSON.parse(v) : []; } catch { return []; } },
};