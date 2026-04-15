const OBJECTIFS_KEY = 'myqawam_objectifs';
const PLANNING_KEY = 'myqawam_planning';
const SETTINGS_KEY = 'myqawam_settings';

const defaultObjectifs = { objectifs: [] };
const defaultPlanning = { blocs: [] };
const defaultSettings = { appName: 'MyQawam' };

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Objectifs
export function getObjectifs() {
  const raw = localStorage.getItem(OBJECTIFS_KEY);
  if (!raw) return defaultObjectifs;
  return safeJsonParse(raw, defaultObjectifs);
}

export function saveObjectifs(data) {
  localStorage.setItem(OBJECTIFS_KEY, JSON.stringify(data));
}

export function getObjectifById(id) {
  const { objectifs } = getObjectifs();
  return objectifs.find((o) => o.id === id) || null;
}

export function updateObjectif(id, updater) {
  const data = getObjectifs();
  const idx = data.objectifs.findIndex((o) => o.id === id);
  if (idx === -1) return;
  if (typeof updater === 'function') {
    data.objectifs[idx] = updater(data.objectifs[idx]);
  } else {
    data.objectifs[idx] = { ...data.objectifs[idx], ...updater };
  }
  saveObjectifs(data);
  return data.objectifs[idx];
}

export function addObjectif(objectif) {
  const data = getObjectifs();
  data.objectifs.push(objectif);
  saveObjectifs(data);
}

export function deleteObjectif(id) {
  const data = getObjectifs();
  data.objectifs = data.objectifs.filter((o) => o.id !== id);
  saveObjectifs(data);
}

// Planning
export function getPlanning() {
  const raw = localStorage.getItem(PLANNING_KEY);
  if (!raw) return defaultPlanning;
  return safeJsonParse(raw, defaultPlanning);
}

export function savePlanning(data) {
  localStorage.setItem(PLANNING_KEY, JSON.stringify(data));
}

export function addBloc(bloc) {
  const data = getPlanning();
  data.blocs.push(bloc);
  savePlanning(data);
}

export function updateBloc(id, updates) {
  const data = getPlanning();
  const idx = data.blocs.findIndex((b) => b.id === id);
  if (idx === -1) return;
  data.blocs[idx] = { ...data.blocs[idx], ...updates };
  savePlanning(data);
}

export function deleteBloc(id) {
  const data = getPlanning();
  data.blocs = data.blocs.filter((b) => b.id !== id);
  savePlanning(data);
}

export function getBlocsForWeek(startDate) {
  const data = getPlanning();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return data.blocs.filter((b) => {
    const d = new Date(b.date);
    return d >= start && d < end;
  });
}

// Settings
export function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  return safeJsonParse(raw, defaultSettings);
}

export function saveSettings(data) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

// Export/Import
export function exportAllData() {
  return {
    objectifs: getObjectifs(),
    planning: getPlanning(),
    settings: getSettings(),
  };
}

export function importAllData({ objectifs, planning, settings }) {
  if (objectifs) saveObjectifs(objectifs);
  if (planning) savePlanning(planning);
  if (settings) saveSettings(settings);
}

// Auto-reset habitudes quotidiennes/hebdomadaires
export function autoResetHabitudes() {
  const data = getObjectifs();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let changed = false;

  data.objectifs.forEach((obj) => {
    if ((obj.type !== 'habitude' && obj.type !== 'autre') || obj.statut !== 'actif') return;
    const d = obj.data || {};
    const items = d.items || [];
    const freq = d.frequence || 'hebdomadaire';
    const lastReset = d.lastResetDate || '';
    if (!lastReset || items.length === 0) {
      if (!lastReset) {
        obj.data = { ...d, lastResetDate: todayStr };
        changed = true;
      }
      return;
    }

    const lastDate = new Date(lastReset);
    let shouldReset = false;

    if (freq === 'quotidienne') {
      const todayDate = new Date(todayStr);
      shouldReset = todayDate > lastDate;
    } else {
      const daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      shouldReset = daysSince >= 7;
    }

    if (shouldReset) {
      const done = items.filter((i) => i.fait).length;
      const pct = Math.round((done / items.length) * 100);
      const historique = d.historique || [];
      historique.push({ date: lastReset, pct });
      obj.data = {
        ...d,
        items: items.map((i) => ({ ...i, fait: false })),
        historique,
        lastResetDate: todayStr,
      };
      changed = true;
    }
  });

  // Auto-reset sport hebdo : si semaineValidee et qu'on est dans une nouvelle semaine
  data.objectifs.forEach((obj) => {
    if (obj.type !== 'sport' || obj.statut !== 'actif') return;
    const d = obj.data || {};
    if (!d.semaineValidee) return;
    // Vérifier si la dernière séance validée est d'une semaine précédente
    const seances = d.seances || [];
    const lastSeance = seances.length > 0 ? seances[seances.length - 1] : null;
    if (lastSeance) {
      const lastDate = new Date(lastSeance.date);
      const daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      // Reset le lundi (ou dès qu'un nouveau jour commence après validation)
      if (daysSince >= 1) {
        obj.data = { ...d, semaineValidee: false };
        changed = true;
      }
    }
  });

  if (changed) saveObjectifs(data);
}

export function resetAllData() {
  localStorage.removeItem(OBJECTIFS_KEY);
  localStorage.removeItem(PLANNING_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}
