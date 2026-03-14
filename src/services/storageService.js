import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  PERSONAS: '@fc_personas',
  ACTIVE: '@fc_active_persona',
  SERVER: '@fc_server_url',
};

export default {
  async savePersonas(p) { try { await AsyncStorage.setItem(K.PERSONAS, JSON.stringify(p)); } catch {} },
  async loadPersonas() { try { const v = await AsyncStorage.getItem(K.PERSONAS); return v ? JSON.parse(v) : []; } catch { return []; } },
  async saveActive(id) { try { await AsyncStorage.setItem(K.ACTIVE, id); } catch {} },
  async loadActive() { try { return await AsyncStorage.getItem(K.ACTIVE); } catch { return null; } },
  async saveServer(url) { try { await AsyncStorage.setItem(K.SERVER, url); } catch {} },
  async loadServer() { try { return await AsyncStorage.getItem(K.SERVER); } catch { return null; } },
};