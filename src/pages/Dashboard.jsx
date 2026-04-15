import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getObjectifs, updateObjectif, getPlanning } from '../data/store';
import { computeObjectifProgress, getMonday, toISODate, getDayName } from '../data/helpers';
import ProgressBar from '../components/ProgressBar';

export default function Dashboard() {
  const [objectifs, setObjectifs] = useState([]);
  const [blocs, setBlocs] = useState([]);
  const [, forceUpdate] = useState(0);
  const navigate = useNavigate();

  const reload = () => {
    setObjectifs(getObjectifs().objectifs.filter((o) => o.statut === 'actif'));
    setBlocs(getPlanning().blocs);
  };

  useEffect(() => { reload(); }, []);

  const monday = getMonday(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const weekBlocs = blocs.filter((b) => {
    const d = new Date(b.date);
    return d >= monday && d <= sunday;
  });

  const now = new Date();
  const upcoming = weekBlocs
    .filter((b) => {
      const d = new Date(b.date + 'T' + b.heureDebut);
      return d > now;
    })
    .sort((a, b) => new Date(a.date + 'T' + a.heureDebut) - new Date(b.date + 'T' + b.heureDebut));

  const nextEvent = upcoming[0];

  // Habitudes quotidiennes — masquer celles à 100%
  const habQuot = objectifs.filter((o) => {
    if ((o.type !== 'habitude' && o.type !== 'autre') || o.data?.frequence !== 'quotidienne') return false;
    const items = o.data?.items || [];
    if (items.length === 0) return false;
    const allDone = items.every((i) => i.fait);
    return !allDone;
  });

  // Compteur de jours validés (historique avec pct === 100) + aujourd'hui si 100%
  const getCompletedDays = (obj) => {
    const hist = obj.data?.historique || [];
    const items = obj.data?.items || [];
    const pastDays = hist.filter((h) => h.pct === 100).length;
    const todayDone = items.length > 0 && items.every((i) => i.fait) ? 1 : 0;
    return pastDays + todayDone;
  };

  // Objectifs sport actifs — masquer si semaine déjà validée
  const sportObjs = objectifs.filter((o) => {
    if (o.type !== 'sport') return false;
    return !o.data?.semaineValidee;
  });

  const cycleSportRoutine = (objId, dayIdx) => {
    const obj = objectifs.find((o) => o.id === objId);
    if (!obj) return;
    const routine = [...(obj.data?.routine || [null, null, null, null, null, null, null])];
    const current = routine[dayIdx];
    if (current === null) routine[dayIdx] = 'fait';
    else if (current === 'fait') routine[dayIdx] = 'repos';
    else routine[dayIdx] = null;
    updateObjectif(objId, (o) => ({ ...o, data: { ...o.data, routine } }));
    reload();
    forceUpdate((n) => n + 1);
  };

  const validerSemaineSport = (objId) => {
    const obj = objectifs.find((o) => o.id === objId);
    if (!obj) return;
    const d = obj.data || {};
    const routine = d.routine || [null, null, null, null, null, null, null];
    const cibleJ = d.cibleJours || 5;
    const nbFait = routine.filter((r) => r === 'fait').length;
    const seances = d.seances || [];
    const streak = d.streak || 0;
    const newSeances = [...seances, { date: toISODate(new Date()), fait: nbFait, cible: cibleJ, atteint: nbFait >= cibleJ }];
    const newStreak = nbFait >= cibleJ ? streak + 1 : 0;
    updateObjectif(objId, (o) => ({
      ...o,
      data: {
        ...o.data,
        seances: newSeances,
        streak: newStreak,
        routine: [null, null, null, null, null, null, null],
        semaineValidee: true,
      },
    }));
    reload();
    forceUpdate((n) => n + 1);
  };

  const toggleHabItem = (objId, itemId) => {
    const obj = objectifs.find((o) => o.id === objId);
    if (!obj) return;
    const items = (obj.data?.items || []).map((i) =>
      i.id === itemId ? { ...i, fait: !i.fait } : i
    );
    updateObjectif(objId, (o) => ({ ...o, data: { ...o.data, items } }));
    reload();
    forceUpdate((n) => n + 1);
  };

  return (
    <div>
      <div className="dashboard-top" style={styles.topRow}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Vue d'ensemble de vos objectifs et planning</p>
        </div>
        <div className="dashboard-badges" style={styles.badges}>
          <div style={styles.badge}>
            <span style={styles.badgeNumber}>{objectifs.length}</span>
            <span style={styles.badgeLabel}>objectifs actifs</span>
          </div>
          <div style={styles.badge}>
            <span style={styles.badgeIcon}>📅</span>
            <span style={styles.badgeText}>
              {nextEvent
                ? `${nextEvent.titre} — ${getDayName(((new Date(nextEvent.date).getDay() + 6) % 7))} ${nextEvent.heureDebut}`
                : 'Aucun événement'}
            </span>
          </div>
        </div>
      </div>

      {/* Widgets suivi — grille 2 colonnes */}
      {(habQuot.length > 0 || sportObjs.length > 0) && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={styles.sectionTitle}>Suivi quotidien</h2>
          <div className="widget-grid-2col" style={styles.widgetGrid}>
            {/* Habitudes quotidiennes */}
            {habQuot.map((obj) => {
              const items = obj.data?.items || [];
              const done = items.filter((i) => i.fait).length;
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              const completedDays = getCompletedDays(obj);
              return (
                <div key={obj.id} style={styles.habCard}>
                  <div style={styles.habHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{obj.icone}</span>
                      <div>
                        <h4 style={styles.habName}>{obj.nom}</h4>
                        <span style={styles.habCount}>{done}/{items.length} — {pct}%</span>
                        <span style={styles.habDays}>{completedDays}/365 jours</span>
                      </div>
                    </div>
                    <button style={styles.habLink} onClick={() => navigate(`/objectifs/${obj.id}`)}>
                      Détail →
                    </button>
                  </div>
                  <ProgressBar value={pct} height={4} color={pct === 100 ? 'var(--success)' : 'var(--accent)'} />
                  <div style={styles.habItems}>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleHabItem(obj.id, item.id)}
                        style={{
                          ...styles.habItemBtn,
                          background: item.fait ? 'var(--success)' : 'var(--bg-input)',
                          color: item.fait ? '#fff' : 'var(--text-secondary)',
                          border: item.fait ? '1px solid var(--success)' : '1px solid var(--border)',
                        }}
                      >
                        {item.fait && <span style={{ marginRight: '4px' }}>✓</span>}
                        {item.nom}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Sport — routine semaine */}
            {sportObjs.map((obj) => {
              const routine = obj.data?.routine || [null, null, null, null, null, null, null];
              const cibleJ = obj.data?.cibleJours || 5;
              const fait = routine.filter((r) => r === 'fait').length;
              const allFilled = routine.every((r) => r !== null);
              const jourNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
              return (
                <div key={obj.id} style={styles.habCard}>
                  <div style={styles.habHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{obj.icone}</span>
                      <div>
                        <h4 style={styles.habName}>{obj.nom}</h4>
                        <span style={{ fontSize: '12px', color: fait >= cibleJ ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {fait}/{cibleJ} jours
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {allFilled && (
                        <button
                          onClick={() => validerSemaineSport(obj.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: fait >= cibleJ ? 'var(--success)' : 'var(--warning)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Valider
                        </button>
                      )}
                      <button style={styles.habLink} onClick={() => navigate(`/objectifs/${obj.id}`)}>
                        Détail →
                      </button>
                    </div>
                  </div>
                  <div style={styles.habItems}>
                    {jourNames.map((j, i) => {
                      const state = routine[i];
                      let bg = 'var(--bg-input)';
                      let color = 'var(--text-secondary)';
                      let label = j;
                      if (state === 'fait') { bg = 'var(--success)'; color = '#fff'; label = `✓ ${j}`; }
                      if (state === 'repos') { bg = 'var(--warning)'; color = '#fff'; label = `💤 ${j}`; }
                      return (
                        <button
                          key={j}
                          onClick={() => cycleSportRoutine(obj.id, i)}
                          style={{
                            ...styles.habItemBtn,
                            background: bg,
                            color,
                            border: state === 'fait' ? '1px solid var(--success)' : state === 'repos' ? '1px solid var(--warning)' : '1px solid var(--border)',
                            minWidth: '55px',
                          }}
                          title="→ Fait → Repos → Vide"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Objectifs grid */}
      {objectifs.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Aucun objectif actif</p>
          <button style={styles.emptyBtn} onClick={() => navigate('/objectifs')}>
            Créer un objectif
          </button>
        </div>
      ) : (
        <>
          <h2 style={styles.sectionTitle}>Objectifs</h2>
          <div className="objectifs-grid" style={styles.grid}>
            {objectifs.map((obj) => {
              const progress = computeObjectifProgress(obj);
              return (
                <div
                  key={obj.id}
                  style={styles.card}
                  onClick={() => navigate(`/objectifs/${obj.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  <div style={styles.cardHeader}>
                    <span style={styles.cardIcon}>{obj.icone}</span>
                    <span style={styles.cardType}>{obj.type}</span>
                  </div>
                  <h3 style={styles.cardName}>{obj.nom}</h3>
                  <div style={styles.progressRow}>
                    <ProgressBar value={progress} height={6} />
                    <span style={styles.progressPct}>{progress}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={styles.cardStatus}>
                      {progress >= 100 ? 'Atteint' : 'En cours'}
                    </span>
                    {(obj.type === 'habitude' || obj.type === 'autre') && obj.data?.frequence === 'quotidienne' && (
                      <span style={styles.cardDays}>{getCompletedDays(obj)}/365 jours</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  badges: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  badge: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    padding: '10px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badgeNumber: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  badgeLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  badgeIcon: {
    fontSize: '16px',
  },
  badgeText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  // Widget habitudes
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  habGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  habCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  habHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  habCount: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  habDays: {
    fontSize: '11px',
    color: 'var(--accent)',
    fontWeight: 600,
    marginLeft: '8px',
  },
  habLink: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  habItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  habItemBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  // Objectifs grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '20px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '28px',
  },
  cardType: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    background: 'var(--bg-input)',
    padding: '3px 10px',
    borderRadius: '20px',
    textTransform: 'capitalize',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '14px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  progressPct: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--accent)',
    minWidth: '36px',
    textAlign: 'right',
  },
  cardStatus: {
    fontSize: '12px',
    color: 'var(--success)',
    fontWeight: 500,
  },
  cardDays: {
    fontSize: '11px',
    color: 'var(--accent)',
    fontWeight: 600,
    background: 'var(--accent-bg)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  emptyText: {
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  emptyBtn: {
    padding: '10px 24px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
};
