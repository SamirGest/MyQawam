import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getObjectifs, addObjectif, deleteObjectif, updateObjectif } from '../data/store';
import { computeObjectifProgress, toISODate } from '../data/helpers';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import { FormField, inputStyle, btnPrimary, btnDanger, btnSecondary } from '../components/FormControls';

const EMOJI_LIST = [
  '🎯', '💰', '💵', '💸', '📈', '📊', '📅', '📚', '📖', '📝',
  '🏋️', '🏃', '💪', '⚽', '🏀', '🎾', '🚴', '🧘', '🥇', '🏆',
  '✅', '⭐', '🔥', '💡', '🧠', '🎓', '💻', '📱', '🚀', '🛠️',
  '🏠', '🚗', '✈️', '🌍', '❤️', '🎵', '🎨', '📸', '🍎', '💤',
  '⏰', '🗓️', '💼', '🤝', '👨‍💻', '🧑‍🎓', '🏦', '📦', '🎁', '🌟',
];

export default function Objectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [tab, setTab] = useState('actif');
  const [showForm, setShowForm] = useState(false);
  const [editObj, setEditObj] = useState(null);
  const [form, setForm] = useState({ nom: '', type: 'financier', description: '', cible: '', icone: '🎯' });
  const navigate = useNavigate();

  const reload = () => setObjectifs(getObjectifs().objectifs);
  useEffect(() => { reload(); }, []);

  const filtered = objectifs.filter((o) => tab === 'actif' ? o.statut === 'actif' : o.statut === 'cloture');


  const openEdit = (e, obj) => {
    e.stopPropagation();
    setEditObj(obj);
    setForm({ nom: obj.nom, type: obj.type, description: obj.description || '', cible: obj.cible || '', icone: obj.icone || '🎯' });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditObj(null);
    setForm({ nom: '', type: 'financier', description: '', cible: '', icone: '🎯' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    if (editObj) {
      updateObjectif(editObj.id, { nom: form.nom, type: form.type, description: form.description, cible: form.cible, icone: form.icone });
    } else {
      const obj = {
        id: uuidv4(),
        nom: form.nom,
        type: form.type,
        icone: form.icone || '🎯',
        description: form.description,
        cible: form.cible,
        statut: 'actif',
        dateCreation: toISODate(new Date()),
        data: {},
      };
      addObjectif(obj);
    }
    setForm({ nom: '', type: 'financier', description: '', cible: '', icone: '🎯' });
    setShowForm(false);
    setEditObj(null);
    reload();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Supprimer cet objectif ?')) {
      deleteObjectif(id);
      reload();
    }
  };

  const handleCloturer = (e, id) => {
    e.stopPropagation();
    updateObjectif(id, { statut: 'cloture' });
    reload();
  };

  const handleReactiver = (e, id) => {
    e.stopPropagation();
    updateObjectif(id, { statut: 'actif' });
    reload();
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Objectifs</h1>
          <p style={styles.subtitle}>Gérez vos objectifs de vie</p>
        </div>
        <button style={btnPrimary} onClick={openCreate}>+ Nouvel objectif</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'actif' ? styles.tabActive : {}) }}
          onClick={() => setTab('actif')}
        >
          Actifs ({objectifs.filter((o) => o.statut === 'actif').length})
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'cloture' ? styles.tabActive : {}) }}
          onClick={() => setTab('cloture')}
        >
          Clôturés ({objectifs.filter((o) => o.statut === 'cloture').length})
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ color: 'var(--text-muted)' }}>
            {tab === 'actif' ? 'Aucun objectif actif' : 'Aucun objectif clôturé'}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((obj) => {
            const progress = computeObjectifProgress(obj);
            return (
              <div
                key={obj.id}
                style={styles.card}
                onClick={() => navigate(`/objectifs/${obj.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                <div style={styles.cardTop}>
                  <span style={styles.cardIcon}>{obj.icone}</span>
                  <div style={styles.cardActions}>
                    <button style={styles.actionBtn} onClick={(e) => openEdit(e, obj)} title="Modifier">
                      {'✎'}
                    </button>
                    {obj.statut === 'actif' ? (
                      <button style={styles.actionBtn} onClick={(e) => handleCloturer(e, obj.id)} title="Clôturer">
                        {'✓'}
                      </button>
                    ) : (
                      <button style={styles.actionBtn} onClick={(e) => handleReactiver(e, obj.id)} title="Réactiver">
                        {'↺'}
                      </button>
                    )}
                    <button style={{ ...styles.actionBtn, color: 'var(--danger)' }} onClick={(e) => handleDelete(e, obj.id)} title="Supprimer">
                      {'✕'}
                    </button>
                  </div>
                </div>
                <h3 style={styles.cardName}>{obj.nom}</h3>
                <span style={styles.cardType}>{obj.type}</span>
                <div style={styles.progressRow}>
                  <ProgressBar value={progress} height={6} />
                  <span style={styles.pct}>{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditObj(null); }} title={editObj ? 'Modifier l\'objectif' : 'Nouvel objectif'}>
        <FormField label="Nom de l'objectif">
          <input style={inputStyle} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: AutoLoc — 10 000 €" />
        </FormField>
        <FormField label="Type">
          <select style={{ ...inputStyle, ...(editObj ? { opacity: 0.5 } : {}) }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={!!editObj}>
            <option value="financier">Financier</option>
            <option value="scolaire">Scolaire</option>
            <option value="sport">Sport</option>
            <option value="habitude">Habitude</option>
            <option value="autre">Autre</option>
          </select>
          {editObj && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Le type ne peut pas être changé</span>}
        </FormField>
        <FormField label="Description (optionnelle)">
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
        <FormField label="Cible mesurable">
          <input style={inputStyle} value={form.cible} onChange={(e) => setForm({ ...form, cible: e.target.value })} placeholder="Ex: 10000, 75, 12 chapitres..." />
        </FormField>
        <FormField label="Icône">
          <div style={styles.emojiGrid}>
            {EMOJI_LIST.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm({ ...form, icone: e })}
                style={{
                  ...styles.emojiBtn,
                  ...(form.icone === e ? styles.emojiBtnActive : {}),
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button style={btnSecondary} onClick={() => { setShowForm(false); setEditObj(null); }}>Annuler</button>
          <button style={btnPrimary} onClick={handleSave}>{editObj ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
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
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px',
    width: 'fit-content',
  },
  tab: {
    padding: '8px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
  },
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
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '28px',
  },
  cardActions: {
    display: 'flex',
    gap: '4px',
  },
  actionBtn: {
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  cardType: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'var(--bg-input)',
    padding: '3px 10px',
    borderRadius: '20px',
    textTransform: 'capitalize',
    display: 'inline-block',
    marginBottom: '14px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pct: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--accent)',
    minWidth: '36px',
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  emojiGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    maxHeight: '160px',
    overflowY: 'auto',
    padding: '4px',
  },
  emojiBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  emojiBtnActive: {
    border: '2px solid var(--accent)',
    background: 'var(--accent-bg)',
    transform: 'scale(1.15)',
  },
};
