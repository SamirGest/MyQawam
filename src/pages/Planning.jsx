import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getPlanning, savePlanning } from '../data/store';
import { getMonday, toISODate, getDayName, getDayNameShort, getCategoryColor, formatDate } from '../data/helpers';
import Modal from '../components/Modal';
import { FormField, inputStyle, btnPrimary, btnSecondary, btnDanger } from '../components/FormControls';

// 5h -> 4h (next day) = 23 hours
const HOURS = Array.from({ length: 23 }, (_, i) => (i + 5) % 24);
const DAYS = [0, 1, 2, 3, 4, 5, 6]; // Lundi=0 -> Dimanche=6
const CATEGORIES = ['Travail', 'Révision', 'Sport', 'Personnel', 'RDV'];

export default function Planning() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [blocs, setBlocs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editBloc, setEditBloc] = useState(null);
  const [form, setForm] = useState({ titre: '', jours: [0], heureDebut: '09:00', heureFin: '10:00', categorie: 'Travail' });

  // Titres fréquents : extraire les titres uniques utilisés, triés par fréquence
  const getTitresFrequents = () => {
    const all = getPlanning().blocs;
    const counts = {};
    all.forEach((b) => {
      counts[b.titre] = (counts[b.titre] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([titre]) => titre);
  };
  const titresFrequents = getTitresFrequents();

  const reload = () => {
    const all = getPlanning().blocs;
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    setBlocs(all.filter((b) => {
      const d = new Date(b.date);
      return d >= start && d < end;
    }));
  };

  useEffect(() => { reload(); }, [weekStart]);

  const getDayDate = (dayIdx) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIdx);
    return d;
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const openCreate = (dayIdx, hour) => {
    setEditBloc(null);
    setForm({
      titre: '',
      jours: [dayIdx],
      heureDebut: `${String(hour).padStart(2, '0')}:00`,
      heureFin: `${String(hour + 1).padStart(2, '0')}:00`,
      categorie: 'Travail',
    });
    setShowForm(true);
  };

  const openEdit = (bloc) => {
    const dayDate = new Date(bloc.date);
    const h = parseInt(bloc.heureDebut.split(':')[0]);
    // If bloc is 0h-4h, it belongs to the previous day's column
    if (h >= 0 && h < 5) dayDate.setDate(dayDate.getDate() - 1);
    const dayIdx = (dayDate.getDay() + 6) % 7;
    setEditBloc(bloc);
    setForm({
      titre: bloc.titre,
      jours: [dayIdx],
      heureDebut: bloc.heureDebut,
      heureFin: bloc.heureFin,
      categorie: bloc.categorie,
    });
    setShowForm(true);
  };

  const toggleJour = (dayIdx) => {
    if (editBloc) {
      setForm((prev) => ({ ...prev, jours: [dayIdx] }));
    } else {
      setForm((prev) => {
        const has = prev.jours.includes(dayIdx);
        const next = has ? prev.jours.filter((d) => d !== dayIdx) : [...prev.jours, dayIdx];
        return { ...prev, jours: next.length > 0 ? next : prev.jours };
      });
    }
  };

  // For hours 0h-4h, the actual date is the next day
  const getActualDate = (dayIdx, heure) => {
    const h = parseInt(heure.split(':')[0]);
    const d = new Date(getDayDate(dayIdx));
    if (h >= 0 && h < 5) d.setDate(d.getDate() + 1);
    return toISODate(d);
  };

  const handleSave = () => {
    if (!form.titre.trim()) return;
    const data = getPlanning();

    if (editBloc) {
      const date = getActualDate(form.jours[0], form.heureDebut);
      data.blocs = data.blocs.map((b) =>
        b.id === editBloc.id
          ? { ...b, titre: form.titre, date, heureDebut: form.heureDebut, heureFin: form.heureFin, categorie: form.categorie }
          : b
      );
    } else {
      for (const dayIdx of form.jours) {
        data.blocs.push({
          id: uuidv4(),
          titre: form.titre,
          date: getActualDate(dayIdx, form.heureDebut),
          heureDebut: form.heureDebut,
          heureFin: form.heureFin,
          categorie: form.categorie,
        });
      }
    }
    savePlanning(data);
    setShowForm(false);
    setEditBloc(null);
    reload();
  };

  const handleDelete = () => {
    if (!editBloc) return;
    const data = getPlanning();
    data.blocs = data.blocs.filter((b) => b.id !== editBloc.id);
    savePlanning(data);
    setShowForm(false);
    setEditBloc(null);
    reload();
  };

  const toggleValide = (blocId) => {
    const data = getPlanning();
    data.blocs = data.blocs.map((b) =>
      b.id === blocId ? { ...b, valide: !b.valide } : b
    );
    savePlanning(data);
    reload();
  };

  const getBlocksForDay = (dayIdx) => {
    const date = toISODate(getDayDate(dayIdx));
    const nextDay = new Date(getDayDate(dayIdx));
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDate = toISODate(nextDay);
    return blocs.filter((b) => {
      const h = parseInt(b.heureDebut.split(':')[0]);
      // Blocs 5h-23h: stored with this day's date
      if (h >= 5 && b.date === date) return true;
      // Blocs 0h-4h: stored with next day's date but shown in this day's column
      if (h >= 0 && h < 5 && b.date === nextDate) return true;
      return false;
    });
  };

  const isDayPast = (dayIdx) => {
    const date = getDayDate(dayIdx);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDayToday = (dayIdx) => {
    return toISODate(getDayDate(dayIdx)) === toISODate(new Date());
  };

  const timeToRow = (time) => {
    const [h, m] = time.split(':').map(Number);
    // 5h = row 0, 6h = row 60, ... 23h = row 1080, 0h = row 1140, ... 4h = row 1380
    const offset = h >= 5 ? h - 5 : h + 19;
    return offset * 60 + m;
  };

  const sundayDate = new Date(weekStart);
  sundayDate.setDate(sundayDate.getDate() + 6);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Planning</h1>
        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={prevWeek}>←</button>
          <span style={styles.navDate}>
            {formatDate(weekStart)} — {formatDate(sundayDate)}
          </span>
          <button style={styles.navBtn} onClick={nextWeek}>→</button>
        </div>
      </div>

      <div className="planning-calendar" style={styles.calendarWrap}>
       <div className="planning-inner">
        {/* Header row */}
        <div style={styles.calendarHeader}>
          <div style={styles.timeCol}></div>
          {DAYS.map((d) => {
            const date = getDayDate(d);
            const past = isDayPast(d);
            const today = isDayToday(d);
            return (
              <div key={d} style={{ ...styles.dayHeader, ...(today ? styles.dayHeaderToday : {}), ...(past ? styles.dayHeaderPast : {}) }}>
                <span className="planning-day-name" style={styles.dayName} data-short={getDayNameShort(d).charAt(0)} data-full={getDayNameShort(d)}>{getDayNameShort(d)}</span>
                <span style={{ ...styles.dayNum, ...(past ? { color: 'var(--text-muted)', opacity: 0.6 } : {}) }}>{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div style={styles.gridWrap}>
          {/* Time labels */}
          <div style={styles.timeLabels}>
            {HOURS.map((h) => (
              <div key={h} style={styles.timeLabel}>
                <span>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div style={styles.daysGrid}>
            {DAYS.map((dayIdx) => {
              const dayBlocks = getBlocksForDay(dayIdx);
              const past = isDayPast(dayIdx);
              return (
                <div key={dayIdx} style={{ ...styles.dayColumn, ...(past ? styles.dayColumnPast : {}) }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={styles.hourCell}
                      onClick={() => openCreate(dayIdx, h)}
                    />
                  ))}
                  {/* Rendered blocks */}
                  {dayBlocks.map((bloc) => {
                    const top = timeToRow(bloc.heureDebut);
                    const bottom = timeToRow(bloc.heureFin);
                    const height = Math.max(bottom - top, 20);
                    const color = getCategoryColor(bloc.categorie);
                    const done = bloc.valide;
                    return (
                      <div
                        key={bloc.id}
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          left: '2px',
                          right: '2px',
                          height: `${height}px`,
                          background: done ? color + '55' : color + '22',
                          borderLeft: `3px solid ${color}`,
                          borderRadius: '4px',
                          padding: '4px 6px',
                          fontSize: '11px',
                          color: color,
                          fontWeight: 600,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          zIndex: 2,
                          opacity: past && !done ? 0.5 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                        onClick={(e) => { e.stopPropagation(); openEdit(bloc); }}
                      >
                        <div>
                          <div style={{ textDecoration: done ? 'line-through' : 'none' }}>{bloc.titre}</div>
                          <div style={{ fontWeight: 400, fontSize: '10px', opacity: 0.8 }}>
                            {bloc.heureDebut} - {bloc.heureFin}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleValide(bloc.id); }}
                          style={{
                            alignSelf: 'flex-end',
                            background: done ? color : 'rgba(255,255,255,0.1)',
                            color: done ? '#fff' : 'inherit',
                            border: done ? 'none' : '1px solid currentColor',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            lineHeight: '14px',
                            marginTop: '2px',
                          }}
                          title={done ? 'Marquer non fait' : 'Marquer fait'}
                        >
                          {done ? '✓' : '○'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
       </div>
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditBloc(null); }} title={editBloc ? 'Modifier le bloc' : 'Nouveau bloc'}>
        <FormField label="Titre">
          {titresFrequents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {titresFrequents.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, titre: t }))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: form.titre === t ? 'var(--accent)' : 'var(--bg-input)',
                    color: form.titre === t ? '#fff' : 'var(--text-secondary)',
                    border: form.titre === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <input style={inputStyle} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Révision Compta" />
        </FormField>
        <FormField label={editBloc ? 'Jour' : 'Jours'}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DAYS.map((d) => {
              const checked = form.jours.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleJour(d)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: checked ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: checked ? 'var(--accent-bg)' : 'var(--bg-input)',
                    color: checked ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minWidth: '44px',
                    textAlign: 'center',
                  }}
                >
                  <div>{getDayName(d).slice(0, 3)}</div>
                  <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px' }}>{getDayDate(d).getDate()}</div>
                </button>
              );
            })}
          </div>
        </FormField>
        <div style={{ display: 'flex', gap: '12px' }}>
          <FormField label="Heure de début">
            <input style={inputStyle} type="time" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} />
          </FormField>
          <FormField label="Heure de fin">
            <input style={inputStyle} type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Catégorie">
          <select style={inputStyle} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          {editBloc && (
            <button style={btnDanger} onClick={handleDelete}>Supprimer</button>
          )}
          <button style={btnSecondary} onClick={() => { setShowForm(false); setEditBloc(null); }}>Annuler</button>
          <button style={btnPrimary} onClick={handleSave}>
            {editBloc ? 'Modifier' : form.jours.length > 1 ? `Créer (${form.jours.length} jours)` : 'Créer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

const HOUR_HEIGHT = 60;

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navBtn: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  navDate: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    minWidth: '260px',
    textAlign: 'center',
  },
  calendarWrap: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  calendarHeader: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
  },
  timeCol: {
    width: '60px',
    minWidth: '60px',
    borderRight: '1px solid var(--border)',
  },
  dayHeader: {
    flex: 1,
    padding: '12px 8px',
    textAlign: 'center',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dayHeaderToday: {
    background: 'var(--accent-bg)',
  },
  dayHeaderPast: {
    background: 'rgba(0,0,0,0.25)',
    opacity: 0.7,
  },
  dayName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dayNum: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  gridWrap: {
    display: 'flex',
    overflowY: 'auto',
    maxHeight: `calc(100vh - 200px)`,
  },
  timeLabels: {
    width: '60px',
    minWidth: '60px',
    borderRight: '1px solid var(--border)',
  },
  timeLabel: {
    height: `${HOUR_HEIGHT}px`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '4px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
  },
  daysGrid: {
    display: 'flex',
    flex: 1,
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderRight: '1px solid var(--border)',
  },
  dayColumnPast: {
    background: 'rgba(0,0,0,0.15)',
  },
  hourCell: {
    height: `${HOUR_HEIGHT}px`,
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
};
