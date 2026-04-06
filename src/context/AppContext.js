import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../services/storageService';
import lm from '../services/lmStudioService';
import { uid, todayStr, getMaxOutfits, getUnusedCombinations } from '../utils/helpers';
import { persistImage, deleteImage } from '../services/imageStorage';
import { PERSONA_COLORS } from '../constants/theme';

const Ctx = createContext();

function newPersona(name, index) {
  return {
    id: uid(),
    name,
    color: PERSONA_COLORS[index % PERSONA_COLORS.length],
    fullBodyPhoto: null,
    gender: null,
    wardrobe: [],
    outfits: [],
    createdAt: new Date().toISOString(),
  };
}

export function AppProvider({ children }) {
  const [personas, setPersonas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [serverUrl, _setUrl] = useState('http://192.168.29.187:1234');
  const [serverOk, setServerOk] = useState(false);
  const [modelName, setModelName] = useState(null);
  const [booting, setBooting] = useState(true);

  const active = personas.find((p) => p.id === activeId) || personas[0] || null;

  useEffect(() => { boot(); }, []);

  async function boot() {
    const [saved, actId, url] = await Promise.all([
      storage.loadPersonas(), storage.loadActive(), storage.loadServer(),
    ]);
    let ps = saved;
    if (!ps.length) ps = [newPersona('Default', 0)];
    setPersonas(ps);
    setActiveId(actId && ps.find((p) => p.id === actId) ? actId : ps[0].id);
    if (url) { _setUrl(url); lm.setUrl(url); }
    const c = await lm.checkConnection();
    setServerOk(c.ok); if (c.ok) setModelName(c.model);
    setBooting(false);
  }

  function _update(fn) {
    setPersonas((prev) => {
      const next = prev.map((p) => p.id === activeId ? fn(p) : p);
      storage.savePersonas(next);
      return next;
    });
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

  const switchPersona = useCallback((id) => {
    setActiveId(id); storage.saveActive(id);
  }, []);

  const addPersona = useCallback((name) => {
    setPersonas((prev) => {
      const p = newPersona(name, prev.length);
      const next = [...prev, p];
      storage.savePersonas(next);
      setActiveId(p.id); storage.saveActive(p.id);
      return next;
    });
  }, []);

  const renamePersona = useCallback((id, name) => {
    setPersonas((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, name } : p);
      storage.savePersonas(next); return next;
    });
  }, []);

  const deletePersona = useCallback((id) => {
    setPersonas((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((p) => p.id !== id);
      storage.savePersonas(next);
      if (activeId === id) { setActiveId(next[0].id); storage.saveActive(next[0].id); }
      return next;
    });
  }, [activeId]);

  const setFullBodyPhoto = useCallback(async (uri) => {
    const persisted = uri ? await persistImage(uri) : null;
    _update((p) => ({ ...p, fullBodyPhoto: persisted }));
  }, [activeId]);

  const setGender = useCallback((gender) => {
    _update((p) => ({ ...p, gender }));
  }, [activeId]);

  const addGarment = useCallback(async (data) => {
    const imageUri = await persistImage(data.imageUri);
    const g = { id: uid(), ...data, imageUri, addedAt: new Date().toISOString() };
    _update((p) => ({ ...p, wardrobe: [...p.wardrobe, g] }));
    return g;
  }, [activeId]);

  const removeGarment = useCallback((id) => {
    _update((p) => {
      const g = p.wardrobe.find((x) => x.id === id);
      if (g) deleteImage(g.imageUri);
      return { ...p, wardrobe: p.wardrobe.filter((x) => x.id !== id) };
    });
  }, [activeId]);

  const clearWardrobe = useCallback(() => {
    _update((p) => {
      p.wardrobe.forEach((g) => deleteImage(g.imageUri));
      return { ...p, wardrobe: [] };
    });
  }, [activeId]);

  const addOutfit = useCallback((data) => {
    const o = {
      id: uid(), topId: data.topId || null, bottomId: data.bottomId || null,
      topLabel: data.topLabel, bottomLabel: data.bottomLabel,
      colorLogic: data.colorLogic, silhouetteLogic: data.silhouetteLogic,
      weather: data.weather, weatherCity: data.weatherCity || '',
      createdAt: new Date().toISOString(), status: 'unworn', wornDate: null,
      tryOnImageUri: null,
    };
    _update((p) => ({ ...p, outfits: [...p.outfits, o] }));
    return o;
  }, [activeId]);

  const wearOutfit = useCallback((id, date) => {
    _update((p) => ({
      ...p, outfits: p.outfits.map((o) => o.id === id ? { ...o, status: 'worn', wornDate: date || todayStr() } : o),
    }));
  }, [activeId]);

  const unwearOutfit = useCallback((id) => {
    _update((p) => ({
      ...p, outfits: p.outfits.map((o) => o.id === id ? { ...o, status: 'unworn', wornDate: null } : o),
    }));
  }, [activeId]);

  const deleteOutfit = useCallback((id) => {
    _update((p) => {
      const o = p.outfits.find((x) => x.id === id);
      if (o?.tryOnImageUri) deleteImage(o.tryOnImageUri);
      return { ...p, outfits: p.outfits.filter((x) => x.id !== id) };
    });
  }, [activeId]);

  const setOutfitTryOn = useCallback((outfitId, imageUri) => {
    _update((p) => ({
      ...p, outfits: p.outfits.map((o) => o.id === outfitId ? { ...o, tryOnImageUri: imageUri } : o),
    }));
  }, [activeId]);

  const wardrobe = active?.wardrobe || [];
  const outfits = active?.outfits || [];
  const fullBodyPhoto = active?.fullBodyPhoto || null;
  const gender = active?.gender || null;

  const isExhausted = useCallback(() => {
    return getUnusedCombinations(wardrobe, outfits).length === 0 && getMaxOutfits(wardrobe) > 0;
  }, [wardrobe, outfits]);

  const outfitsForDate = useCallback((dateStr) => {
    return outfits.filter((o) => o.status === 'worn' && o.wornDate === dateStr);
  }, [outfits]);

  return (
    <Ctx.Provider value={{
      personas, active, activeId, switchPersona, addPersona, renamePersona, deletePersona,
      serverUrl, serverOk, modelName, booting, setServerUrl, ping,
      wardrobe, outfits, fullBodyPhoto, gender,
      setFullBodyPhoto, setGender, addGarment, removeGarment, clearWardrobe,
      addOutfit, wearOutfit, unwearOutfit, deleteOutfit, setOutfitTryOn,
      isExhausted, outfitsForDate,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};