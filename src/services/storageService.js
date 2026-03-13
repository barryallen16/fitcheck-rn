import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  WARDROBE: '@fc_wardrobe',
  SERVER: '@fc_server_url',
};

export default {
  async saveWardrobe(w) {
    try { await AsyncStorage.setItem(KEYS.WARDROBE, JSON.stringify(w)); }
    catch (e) { console.warn('storage write fail', e); }
  },

  async loadWardrobe() {
    try {
      const v = await AsyncStorage.getItem(KEYS.WARDROBE);
      return v ? JSON.parse(v) : [];
    } catch { return []; }
  },

  async saveServer(url) {
    try { await AsyncStorage.setItem(KEYS.SERVER, url); }
    catch {}
  },

  async loadServer() {
    try { return await AsyncStorage.getItem(KEYS.SERVER); }
    catch { return null; }
  },
};