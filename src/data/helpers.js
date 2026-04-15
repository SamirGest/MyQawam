export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayName(dayIndex) {
  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  return names[dayIndex];
}

export function getDayNameShort(dayIndex) {
  const names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return names[dayIndex];
}

export function getCategoryColor(cat) {
  const colors = {
    'Travail': '#7c5cfc',
    'Révision': '#60a5fa',
    'Sport': '#34d399',
    'Personnel': '#fbbf24',
    'RDV': '#f87171',
  };
  return colors[cat] || '#7c5cfc';
}

export function computeObjectifProgress(obj) {
  if (!obj) return 0;
  const { type, data, cible } = obj;

  if (type === 'financier') {
    const clients = data?.clients || [];
    const total = clients.reduce((s, c) => {
      return s + (parseFloat(c.paidSetup) || parseFloat(c.montantEncaisse) || 0) + (parseFloat(c.paidAbo) || 0);
    }, 0);
    const target = parseFloat(cible) || 1;
    return Math.min(100, Math.round((total / target) * 100));
  }

  if (type === 'scolaire') {
    const matieres = data?.matieres || [];
    if (matieres.length === 0) return 0;
    const avg = matieres.reduce((s, m) => {
      const total = m.chapitres?.length || 0;
      const done = m.chapitres?.filter((c) => c.fait).length || 0;
      return s + (total > 0 ? done / total : 0);
    }, 0) / matieres.length;
    return Math.round(avg * 100);
  }

  if (type === 'sport') {
    const metriques = data?.metriques || [];
    if (metriques.length === 0) return 0;
    const withCible = metriques.filter((m) => m.cible > 0);
    if (withCible.length === 0) return 0;
    const avg = withCible.reduce((s, m) => {
      const last = m.historique?.length > 0 ? m.historique[m.historique.length - 1].valeur : 0;
      return s + Math.min(1, last / m.cible);
    }, 0) / withCible.length;
    return Math.min(100, Math.round(avg * 100));
  }

  if (type === 'habitude' || type === 'autre') {
    const items = data?.items || [];
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.fait).length;
    return Math.round((done / items.length) * 100);
  }

  return 0;
}
