// src/context/WardrobeContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../services/storageService';
import lm from '../services/lmStudioService';
import { uid, todayStr, comboKey, getMaxOutfits, getUnusedCombinations } from '../utils/helpers';

const Ctx = createContext();

export function WardrobeProvider({ children }) {
  const [wardrobe, setWardrobe] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [tryOnHistory, setTryOnHistory] = useState([]);
  const [userPhoto, setUserPhotoState] = useState(null);
  const [serverUrl, _setUrl] = useState('http://10.101.237.83:1234');
  const [serverOk, setServerOk] = useState(false);
  const [modelName, setModelName] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => { boot(); }, []);

  async function boot() {
    const [w, url, o, photo, th] = await Promise.all([
      storage.loadWardrobe(),
      storage.loadServer(),
      storage.loadOutfits(),
      storage.loadUserPhoto(),
      storage.loadTryOnHistory(),
    ]);
    if (w.length) setWardrobe(w);
    if (o.length) setOutfits(o);
    if (th.length) setTryOnHistory(th);
    if (photo) setUserPhotoState(photo);
    if (url) { _setUrl(url); lm.setUrl(url); }
    const c = await lm.checkConnection();
    setServerOk(c.ok); if (c.ok) setModelName(c.model);
    setBooting(false);
  }

  const setServerUrl = useCallback(async (url) => {
    _setUrl(url); lm.setUrl(url);
    await storage.saveServer(url);
    const c = await lm.checkConnection();
    setServerOk(c.ok); setModelName(c.ok ? c.model : null);
    return c;
  }, []);

  const ping = useCallback(async () => {
    const c = await lm.checkConnection();
    setServerOk(c.ok); if (c.ok) setModelName(c.model);
    return c;
  }, []);

  const addGarment = useCallback((data) => {
    const g = { id: uid(), ...data, addedAt: new Date().toISOString() };
    setWardrobe((p) => { const n = [...p, g]; storage.saveWardrobe(n); return n; });
    return g;
  }, []);

  const removeGarment = useCallback((id) => {
    setWardrobe((p) => { const n = p.filter((g) => g.id !== id); storage.saveWardrobe(n); return n; });
  }, []);

  const clearWardrobe = useCallback(() => {
    setWardrobe([]); storage.saveWardrobe([]);
  }, []);

  // ── Outfits ─────────────────────────────────────────
  const addOutfit = useCallback((data) => {
    const o = {
      id: uid(), topId: data.topId || null, bottomId: data.bottomId || null,
      topLabel: data.topLabel, bottomLabel: data.bottomLabel,
      colorLogic: data.colorLogic, silhouetteLogic: data.silhouetteLogic,
      weather: data.weather, weatherCity: data.weatherCity || '',
      createdAt: new Date().toISOString(), status: 'unworn', wornDate: null,
    };
    setOutfits((p) => { const n = [...p, o]; storage.saveOutfits(n); return n; });
    return o;
  }, []);

  const wearOutfit = useCallback((id, date) => {
    setOutfits((p) => {
      const n = p.map((o) => o.id === id ? { ...o, status: 'worn', wornDate: date || todayStr() } : o);
      storage.saveOutfits(n); return n;
    });
  }, []);

  const unwearOutfit = useCallback((id) => {
    setOutfits((p) => {
      const n = p.map((o) => o.id === id ? { ...o, status: 'unworn', wornDate: null } : o);
      storage.saveOutfits(n); return n;
    });
  }, []);

  const deleteOutfit = useCallback((id) => {
    setOutfits((p) => { const n = p.filter((o) => o.id !== id); storage.saveOutfits(n); return n; });
  }, []);

  const isExhausted = useCallback(() => {
    return getUnusedCombinations(wardrobe, outfits).length === 0 && getMaxOutfits(wardrobe) > 0;
  }, [wardrobe, outfits]);

  const outfitsForDate = useCallback((dateStr) => {
    return outfits.filter((o) => o.status === 'worn' && o.wornDate === dateStr);
  }, [outfits]);

  // ── User Photo ──────────────────────────────────────
  const setUserPhoto = useCallback(async (uri) => {
    setUserPhotoState(uri);
    await storage.saveUserPhoto(uri);
  }, []);

  // ── Try-On History ──────────────────────────────────
  const addTryOn = useCallback((data) => {
    const t = {
      id: uid(),
      resultImageUri: data.resultImageUri,
      topLabel: data.topLabel,
      bottomLabel: data.bottomLabel || 'N/A',
      userPhotoUri: data.userPhotoUri,
      createdAt: new Date().toISOString(),
    };
    setTryOnHistory((p) => { const n = [t, ...p]; storage.saveTryOnHistory(n); return n; });
    return t;
  }, []);

  const deleteTryOn = useCallback((id) => {
    setTryOnHistory((p) => { const n = p.filter((t) => t.id !== id); storage.saveTryOnHistory(n); return n; });
  }, []);

  return (
    <Ctx.Provider value={{
      wardrobe, outfits, tryOnHistory, userPhoto, serverUrl, serverOk, modelName, booting,
      setServerUrl, ping, addGarment, removeGarment, clearWardrobe,
      addOutfit, wearOutfit, unwearOutfit, deleteOutfit, isExhausted, outfitsForDate,
      setUserPhoto, addTryOn, deleteTryOn,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWardrobe = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWardrobe outside provider');
  return c;
};