import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../services/storageService';
import lm from '../services/lmStudioService';
import { uid } from '../utils/helpers';

const Ctx = createContext();

export function WardrobeProvider({ children }) {
  const [wardrobe, setWardrobe] = useState([]);
  const [serverUrl, _setUrl] = useState('http://10.101.237.83:1234');
  const [serverOk, setServerOk] = useState(false);
  const [modelName, setModelName] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => { boot(); }, []);

  async function boot() {
    const [w, url] = await Promise.all([storage.loadWardrobe(), storage.loadServer()]);
    if (w.length) setWardrobe(w);
    if (url) { _setUrl(url); lm.setUrl(url); }
    const c = await lm.checkConnection();
    setServerOk(c.ok);
    if (c.ok) setModelName(c.model);
    setBooting(false);
  }

  const setServerUrl = useCallback(async (url) => {
    _setUrl(url);
    lm.setUrl(url);
    await storage.saveServer(url);
    const c = await lm.checkConnection();
    setServerOk(c.ok);
    setModelName(c.ok ? c.model : null);
    return c;
  }, []);

  const ping = useCallback(async () => {
    const c = await lm.checkConnection();
    setServerOk(c.ok);
    if (c.ok) setModelName(c.model);
    return c;
  }, []);

  const addGarment = useCallback((data) => {
    const g = { id: uid(), ...data, addedAt: new Date().toISOString() };
    setWardrobe((p) => {
      const next = [...p, g];
      storage.saveWardrobe(next);
      return next;
    });
    return g;
  }, []);

  const removeGarment = useCallback((id) => {
    setWardrobe((p) => {
      const next = p.filter((g) => g.id !== id);
      storage.saveWardrobe(next);
      return next;
    });
  }, []);

  const clearWardrobe = useCallback(() => {
    setWardrobe([]);
    storage.saveWardrobe([]);
  }, []);

  return (
    <Ctx.Provider value={{
      wardrobe, serverUrl, serverOk, modelName, booting,
      setServerUrl, ping, addGarment, removeGarment, clearWardrobe,
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