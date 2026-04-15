import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getObjectifById, updateObjectif } from '../data/store';
import { computeObjectifProgress, toISODate } from '../data/helpers';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import { FormField, inputStyle, btnPrimary, btnSecondary, btnDanger } from '../components/FormControls';

export default function ObjectifDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState(null);

  const reload = useCallback(() => {
    const o = getObjectifById(id);
    if (!o) { navigate('/objectifs'); return; }
    setObj({ ...o });
  }, [id, navigate]);

  useEffect(() => { reload(); }, [reload]);

  if (!obj) return null;

  const progress = computeObjectifProgress(obj);

  const save = (updater) => {
    updateObjectif(id, updater);
    reload();
  };

  return (
    <div>
      <button style={styles.back} onClick={() => navigate('/objectifs')}>← Retour</button>
      <div style={styles.header}>
        <span style={styles.icon}>{obj.icone}</span>
        <div>
          <h1 style={styles.title}>{obj.nom}</h1>
          {obj.description && <p style={styles.desc}>{obj.description}</p>}
        </div>
      </div>
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Progression globale</span>
          <span style={styles.progressPct}>{progress}%</span>
        </div>
        <ProgressBar value={progress} height={10} />
      </div>

      {obj.type === 'financier' && <FinancierDetail obj={obj} save={save} />}
      {obj.type === 'scolaire' && <ScolaireDetail obj={obj} save={save} />}
      {obj.type === 'sport' && <SportDetail obj={obj} save={save} />}
      {(obj.type === 'habitude' || obj.type === 'autre') && <HabitudeDetail obj={obj} save={save} />}
    </div>
  );
}

/* ========== FINANCIER ========== */
function FinancierDetail({ obj, save }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [form, setForm] = useState({ nom: '', dateSignature: '', montantSetup: '', paidSetup: '', abonnement: false, montantAbo: '' });
  const [payForm, setPayForm] = useState({ montant: '', mois: 1, mode: 'setup' });

  const clients = obj.data?.clients || [];
  const totalEncaisse = clients.reduce((s, c) => {
    return s + (parseFloat(c.paidSetup) || parseFloat(c.montantEncaisse) || 0) + (parseFloat(c.paidAbo) || 0);
  }, 0);
  const cible = parseFloat(obj.cible) || 0;

  const getMonthsElapsed = (dateSignature) => {
    const start = new Date(dateSignature);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() >= start.getDate()) months += 1;
    return Math.max(0, months);
  };

  const getSetupReste = (c) => {
    const setup = parseFloat(c.montantSetup) || parseFloat(c.montantSigne) || 0;
    const paid = parseFloat(c.paidSetup) || parseFloat(c.montantEncaisse) || 0;
    return setup - paid;
  };

  const getAboReste = (c) => {
    if (!c.abonnement || !parseFloat(c.montantAbo)) return 0;
    const mois = getMonthsElapsed(c.dateSignature);
    const du = mois * parseFloat(c.montantAbo);
    const paid = parseFloat(c.paidAbo) || 0;
    return du - paid;
  };

  const addClient = () => {
    if (!form.nom.trim()) return;
    const newClients = [...clients, {
      id: Date.now().toString(),
      nom: form.nom,
      dateSignature: form.dateSignature || toISODate(new Date()),
      montantSetup: parseFloat(form.montantSetup) || 0,
      paidSetup: parseFloat(form.paidSetup) || 0,
      abonnement: form.abonnement,
      montantAbo: parseFloat(form.montantAbo) || 0,
      paidAbo: 0,
    }];
    save((o) => ({ ...o, data: { ...o.data, clients: newClients } }));
    setForm({ nom: '', dateSignature: '', montantSetup: '', paidSetup: '', abonnement: false, montantAbo: '' });
    setShowAdd(false);
  };

  const payClient = showPay ? clients.find((c) => c.id === showPay) : null;
  const hasAbo = payClient?.abonnement && parseFloat(payClient?.montantAbo) > 0;
  const hasSetup = payClient && (parseFloat(payClient.montantSetup) || parseFloat(payClient.montantSigne) || 0) > 0;

  const openPay = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    const setup = (parseFloat(cl?.montantSetup) || parseFloat(cl?.montantSigne) || 0) > 0;
    const abo = cl?.abonnement && parseFloat(cl?.montantAbo) > 0;
    setPayForm({ montant: '', mois: 1, mode: setup ? 'setup' : abo ? 'abo' : 'setup' });
    setShowPay(clientId);
  };

  const deleteClient = (clientId) => {
    if (!confirm('Supprimer ce client ?')) return;
    const newClients = clients.filter((c) => c.id !== clientId);
    save((o) => ({ ...o, data: { ...o.data, clients: newClients } }));
  };

  const enregistrerPaiement = () => {
    if (!showPay) return;
    if (payForm.mode === 'abo' && hasAbo) {
      const montant = parseFloat(payClient.montantAbo) * (parseInt(payForm.mois) || 1);
      if (montant <= 0) return;
      const newClients = clients.map((c) =>
        c.id === showPay ? { ...c, paidAbo: (parseFloat(c.paidAbo) || 0) + montant } : c
      );
      save((o) => ({ ...o, data: { ...o.data, clients: newClients } }));
    } else {
      const montant = parseFloat(payForm.montant) || 0;
      if (montant <= 0) return;
      const newClients = clients.map((c) =>
        c.id === showPay ? { ...c, paidSetup: (parseFloat(c.paidSetup) || parseFloat(c.montantEncaisse) || 0) + montant } : c
      );
      save((o) => ({ ...o, data: { ...o.data, clients: newClients } }));
    }
    setPayForm({ montant: '', mois: 1, mode: 'setup' });
    setShowPay(null);
  };

  return (
    <div>
      <div style={styles.metricRow}>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{totalEncaisse.toLocaleString('fr-FR')} €</span>
          <span style={styles.metricLabel}>total encaissé</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{cible.toLocaleString('fr-FR')} €</span>
          <span style={styles.metricLabel}>objectif</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{clients.length}</span>
          <span style={styles.metricLabel}>clients</span>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Clients</h3>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Ajouter un client</button>
      </div>

      {clients.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Setup</th>
                <th style={styles.th}>Abo mensuel</th>
                <th style={styles.th}>Reste dû</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const setupReste = getSetupReste(c);
                const aboReste = getAboReste(c);
                const setupTotal = parseFloat(c.montantSetup) || parseFloat(c.montantSigne) || 0;
                const setupPaid = parseFloat(c.paidSetup) || parseFloat(c.montantEncaisse) || 0;
                const aboMois = c.abonnement ? getMonthsElapsed(c.dateSignature) : 0;
                const aboPaid = parseFloat(c.paidAbo) || 0;
                return (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.nom}</td>
                    <td style={styles.td}>{c.dateSignature}</td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '13px' }}>
                        <span>{setupPaid.toLocaleString('fr-FR')} / {setupTotal.toLocaleString('fr-FR')} €</span>
                        {setupReste > 0 && <div style={{ color: 'var(--danger)', fontSize: '11px' }}>reste {setupReste.toLocaleString('fr-FR')} €</div>}
                        {setupReste <= 0 && setupTotal > 0 && <div style={{ color: 'var(--success)', fontSize: '11px' }}>soldé ✓</div>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {c.abonnement ? (
                        <div style={{ fontSize: '13px' }}>
                          <span>{parseFloat(c.montantAbo).toLocaleString('fr-FR')} €/mois</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {aboPaid.toLocaleString('fr-FR')} € payé / {(aboMois * parseFloat(c.montantAbo)).toLocaleString('fr-FR')} € dû ({aboMois} mois)
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '13px' }}>
                        {setupReste > 0 && <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Setup : {setupReste.toLocaleString('fr-FR')} €</div>}
                        {c.abonnement && aboReste > 0 && <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Abo : {aboReste.toLocaleString('fr-FR')} €</div>}
                        {c.abonnement && aboReste < 0 && <div style={{ color: 'var(--success)', fontWeight: 600 }}>Abo : {Math.abs(aboReste).toLocaleString('fr-FR')} € d'avance</div>}
                        {setupReste <= 0 && (!c.abonnement || aboReste === 0) && <span style={{ color: 'var(--success)', fontWeight: 600 }}>À jour ✓</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }} onClick={() => openPay(c.id)}>
                          Paiement
                        </button>
                        <button style={{ ...btnDanger, padding: '6px 10px', fontSize: '12px' }} onClick={() => deleteClient(c.id)}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add client modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un client">
        <FormField label="Nom du client">
          <input style={inputStyle} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        </FormField>
        <FormField label="Date de signature">
          <input style={inputStyle} type="date" value={form.dateSignature} onChange={(e) => setForm({ ...form, dateSignature: e.target.value })} />
        </FormField>
        <FormField label="Montant setup / one-shot (€)">
          <input style={inputStyle} type="number" value={form.montantSetup} onChange={(e) => setForm({ ...form, montantSetup: e.target.value })} placeholder="Ex: 500" />
        </FormField>
        <FormField label="Déjà encaissé sur le setup (€)">
          <input style={inputStyle} type="number" value={form.paidSetup} onChange={(e) => setForm({ ...form, paidSetup: e.target.value })} placeholder="0" />
        </FormField>
        <FormField label="Abonnement mensuel ?">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="checkbox" checked={form.abonnement} onChange={(e) => setForm({ ...form, abonnement: e.target.checked })} />
            {form.abonnement && (
              <input style={{ ...inputStyle, width: '140px' }} type="number" placeholder="€/mois" value={form.montantAbo} onChange={(e) => setForm({ ...form, montantAbo: e.target.value })} />
            )}
          </div>
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowAdd(false)}>Annuler</button>
          <button style={btnPrimary} onClick={addClient}>Ajouter</button>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!showPay} onClose={() => setShowPay(null)} title="Enregistrer un paiement">
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px', width: 'fit-content' }}>
          {hasSetup && (
            <button
              type="button"
              onClick={() => setPayForm((p) => ({ ...p, mode: 'setup' }))}
              style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', background: payForm.mode === 'setup' ? 'var(--bg-card)' : 'transparent', color: payForm.mode === 'setup' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Setup
            </button>
          )}
          {hasAbo && (
            <button
              type="button"
              onClick={() => setPayForm((p) => ({ ...p, mode: 'abo' }))}
              style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', background: payForm.mode === 'abo' ? 'var(--bg-card)' : 'transparent', color: payForm.mode === 'abo' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Abonnement
            </button>
          )}
        </div>

        {payForm.mode === 'abo' && hasAbo ? (
          <>
            <FormField label="Nombre de mois">
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPayForm((p) => ({ ...p, mois: n }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: payForm.mois === n ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: payForm.mois === n ? 'var(--accent-bg)' : 'var(--bg-input)',
                      color: payForm.mois === n ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {n} mois
                  </button>
                ))}
              </div>
            </FormField>
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {payForm.mois} x {parseFloat(payClient.montantAbo).toLocaleString('fr-FR')} €
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                {(parseFloat(payClient.montantAbo) * payForm.mois).toLocaleString('fr-FR')} €
              </span>
            </div>
          </>
        ) : (
          <FormField label="Montant reçu pour le setup (€)">
            <input style={inputStyle} type="number" value={payForm.montant} onChange={(e) => setPayForm((p) => ({ ...p, montant: e.target.value }))} />
          </FormField>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowPay(null)}>Annuler</button>
          <button style={btnPrimary} onClick={enregistrerPaiement}>Valider</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========== SCOLAIRE ========== */
function ScolaireDetail({ obj, save }) {
  const [showMatiere, setShowMatiere] = useState(false);
  const [showChapitre, setShowChapitre] = useState(null);
  const [matiereNom, setMatiereNom] = useState('');
  const [chapNom, setChapNom] = useState('');

  const matieres = obj.data?.matieres || [];

  const addMatiere = () => {
    if (!matiereNom.trim()) return;
    const newMatieres = [...matieres, { id: Date.now().toString(), nom: matiereNom, chapitres: [] }];
    save((o) => ({ ...o, data: { ...o.data, matieres: newMatieres } }));
    setMatiereNom('');
    setShowMatiere(false);
  };

  const addChapitre = () => {
    if (!chapNom.trim() || !showChapitre) return;
    const newMatieres = matieres.map((m) =>
      m.id === showChapitre
        ? { ...m, chapitres: [...m.chapitres, { id: Date.now().toString(), nom: chapNom, fait: false }] }
        : m
    );
    save((o) => ({ ...o, data: { ...o.data, matieres: newMatieres } }));
    setChapNom('');
    setShowChapitre(null);
  };

  const toggleChapitre = (matiereId, chapId) => {
    const newMatieres = matieres.map((m) =>
      m.id === matiereId
        ? { ...m, chapitres: m.chapitres.map((c) => c.id === chapId ? { ...c, fait: !c.fait } : c) }
        : m
    );
    save((o) => ({ ...o, data: { ...o.data, matieres: newMatieres } }));
  };

  const deleteMatiere = (matiereId) => {
    if (!confirm('Supprimer cette matière et tous ses chapitres ?')) return;
    const newMatieres = matieres.filter((m) => m.id !== matiereId);
    save((o) => ({ ...o, data: { ...o.data, matieres: newMatieres } }));
  };

  const deleteChapitre = (matiereId, chapId) => {
    const newMatieres = matieres.map((m) =>
      m.id === matiereId
        ? { ...m, chapitres: m.chapitres.filter((c) => c.id !== chapId) }
        : m
    );
    save((o) => ({ ...o, data: { ...o.data, matieres: newMatieres } }));
  };

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Matières</h3>
        <button style={btnPrimary} onClick={() => setShowMatiere(true)}>+ Ajouter une matière</button>
      </div>

      {matieres.map((m) => {
        const total = m.chapitres.length;
        const done = m.chapitres.filter((c) => c.fait).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={m.id} style={styles.scolaireCard}>
            <div style={styles.scolaireHeader}>
              <div>
                <h4 style={styles.scolaireName}>{m.nom}</h4>
                <span style={styles.scolaireCount}>{done}/{total} chapitres — {pct}%</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowChapitre(m.id)}>
                  + Chapitre
                </button>
                <button style={{ ...btnDanger, padding: '6px 10px', fontSize: '12px' }} onClick={() => deleteMatiere(m.id)}>
                  ✕
                </button>
              </div>
            </div>
            <ProgressBar value={pct} height={6} />
            <div style={styles.chapList}>
              {m.chapitres.map((c) => (
                <div key={c.id} style={{ ...styles.chapItem, justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={c.fait}
                      onChange={() => toggleChapitre(m.id, c.id)}
                      style={styles.checkbox}
                    />
                    <span style={{ textDecoration: c.fait ? 'line-through' : 'none', color: c.fait ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {c.nom}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteChapitre(m.id, c.id)}
                    style={{ background: 'none', color: 'var(--text-muted)', fontSize: '13px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Modal open={showMatiere} onClose={() => setShowMatiere(false)} title="Ajouter une matière">
        <FormField label="Nom de la matière">
          <input style={inputStyle} value={matiereNom} onChange={(e) => setMatiereNom(e.target.value)} placeholder="Ex: Comptabilité" />
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowMatiere(false)}>Annuler</button>
          <button style={btnPrimary} onClick={addMatiere}>Ajouter</button>
        </div>
      </Modal>

      <Modal open={!!showChapitre} onClose={() => setShowChapitre(null)} title="Ajouter un chapitre">
        <FormField label="Nom du chapitre">
          <input style={inputStyle} value={chapNom} onChange={(e) => setChapNom(e.target.value)} placeholder="Ex: Chapitre 1 — Les bases" />
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowChapitre(null)}>Annuler</button>
          <button style={btnPrimary} onClick={addChapitre}>Ajouter</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========== SPORT ========== */
function SportDetail({ obj, save }) {
  const [showAddMetrique, setShowAddMetrique] = useState(false);
  const [showEntry, setShowEntry] = useState(null);
  const [metForm, setMetForm] = useState({ nom: '', unite: 'kg', cible: '' });
  const [entryForm, setEntryForm] = useState({ valeur: '', date: toISODate(new Date()) });

  const data = obj.data || {};
  const metriques = data.metriques || [];
  const seances = data.seances || [];
  // routine: array of 7 values — null (pending), 'fait', 'repos'
  const routine = data.routine || [null, null, null, null, null, null, null];
  const streak = data.streak || 0;
  const cibleJours = data.cibleJours || 5;
  const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const nbFait = routine.filter((r) => r === 'fait').length;

  const addMetrique = () => {
    if (!metForm.nom.trim()) return;
    const newMetriques = [...metriques, {
      id: Date.now().toString(),
      nom: metForm.nom,
      unite: metForm.unite,
      cible: parseFloat(metForm.cible) || 0,
      historique: [],
    }];
    save((o) => ({ ...o, data: { ...o.data, metriques: newMetriques } }));
    setMetForm({ nom: '', unite: 'kg', cible: '' });
    setShowAddMetrique(false);
  };

  const deleteMetrique = (metId) => {
    if (!confirm('Supprimer cette métrique ?')) return;
    const newMetriques = metriques.filter((m) => m.id !== metId);
    save((o) => ({ ...o, data: { ...o.data, metriques: newMetriques } }));
  };

  const addEntry = () => {
    const val = parseFloat(entryForm.valeur);
    if (!val || !showEntry) return;
    const newMetriques = metriques.map((m) =>
      m.id === showEntry
        ? { ...m, historique: [...m.historique, { date: entryForm.date || toISODate(new Date()), valeur: val }] }
        : m
    );
    save((o) => ({ ...o, data: { ...o.data, metriques: newMetriques } }));
    setEntryForm({ valeur: '', date: toISODate(new Date()) });
    setShowEntry(null);
  };

  const deleteEntry = (metId, idx) => {
    const newMetriques = metriques.map((m) =>
      m.id === metId
        ? { ...m, historique: m.historique.filter((_, i) => i !== idx) }
        : m
    );
    save((o) => ({ ...o, data: { ...o.data, metriques: newMetriques } }));
  };

  const cycleRoutine = (idx) => {
    const newRoutine = [...routine];
    const current = newRoutine[idx];
    if (current === null) newRoutine[idx] = 'fait';
    else if (current === 'fait') newRoutine[idx] = 'repos';
    else newRoutine[idx] = null;
    save((o) => ({ ...o, data: { ...o.data, routine: newRoutine } }));
  };

  const setCibleJours = (n) => {
    save((o) => ({ ...o, data: { ...o.data, cibleJours: n } }));
  };

  const deleteSeance = (idx) => {
    const newSeances = seances.filter((_, i) => i !== idx);
    save((o) => ({ ...o, data: { ...o.data, seances: newSeances } }));
  };

  const validerSemaine = () => {
    const newSeances = [...seances, { date: toISODate(new Date()), fait: nbFait, cible: cibleJours, atteint: nbFait >= cibleJours }];
    const newStreak = nbFait >= cibleJours ? streak + 1 : 0;
    const newRoutine = [null, null, null, null, null, null, null];
    save((o) => ({ ...o, data: { ...o.data, seances: newSeances, streak: newStreak, routine: newRoutine } }));
  };

  const entryMetrique = showEntry ? metriques.find((m) => m.id === showEntry) : null;

  return (
    <div>
      {/* Métriques personnalisées */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Métriques</h3>
        <button style={btnPrimary} onClick={() => setShowAddMetrique(true)}>+ Ajouter une métrique</button>
      </div>

      {metriques.length === 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
          Aucune métrique. Ajoute-en une : Poids, Séances/semaine, Pompes, km...
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {metriques.map((m) => {
          const derniere = m.historique.length > 0 ? m.historique[m.historique.length - 1] : null;
          const actuel = derniere ? derniere.valeur : '—';
          return (
            <div key={m.id} style={{ ...styles.metric, minWidth: '200px', position: 'relative' }}>
              <button onClick={() => deleteMetrique(m.id)} style={{ ...styles.deleteSmall, position: 'absolute', top: '8px', right: '8px' }} title="Supprimer">✕</button>
              <span style={styles.metricValue}>{actuel} {m.unite}</span>
              <span style={styles.metricLabel}>{m.nom}{m.cible ? ` — cible : ${m.cible} ${m.unite}` : ''}</span>
              <button
                style={{ marginTop: '8px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => { setShowEntry(m.id); setEntryForm({ valeur: '', date: toISODate(new Date()) }); }}
              >
                + Entrée
              </button>
              {m.historique.length > 0 && (
                <div style={{ marginTop: '10px', maxHeight: '120px', overflowY: 'auto' }}>
                  {[...m.historique].reverse().map((e, i) => {
                    const realIdx = m.historique.length - 1 - i;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{e.date}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{e.valeur} {m.unite}</span>
                          <button onClick={() => deleteEntry(m.id, realIdx)} style={{ ...styles.deleteSmall, fontSize: '11px', padding: '0 4px' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Routine hebdomadaire */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Routine hebdomadaire</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: nbFait >= cibleJours ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
            {nbFait}/{cibleJours} jours
          </span>
          <button style={{ ...btnPrimary, background: 'var(--success)' }} onClick={validerSemaine}>Valider la semaine</button>
        </div>
      </div>

      {/* Objectif jours/semaine */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Objectif :</span>
        {[3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => setCibleJours(n)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: cibleJours === n ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: cibleJours === n ? 'var(--accent-bg)' : 'var(--bg-input)',
              color: cibleJours === n ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {n}/7
          </button>
        ))}
      </div>

      {/* Jours de la semaine — 3 états */}
      <div style={styles.routineRow}>
        {jours.map((j, i) => {
          const state = routine[i];
          let bg = 'var(--bg-input)';
          let color = 'var(--text-secondary)';
          let label = j;
          if (state === 'fait') { bg = 'var(--success)'; color = '#fff'; label = `${j} ✓`; }
          if (state === 'repos') { bg = 'var(--warning)'; color = '#fff'; label = `${j} 💤`; }
          return (
            <button
              key={j}
              style={{ ...styles.routineBtn, background: bg, color, minWidth: '70px' }}
              onClick={() => cycleRoutine(i)}
              title="Cliquer pour changer : → Fait → Repos → Vide"
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', marginBottom: '24px' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, color: streak > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{streak}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>semaines consécutives réussies</span>
      </div>

      {/* Historique séances */}
      {seances.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <h3 style={styles.sectionTitle}>Historique des semaines</h3>
          <div style={styles.histList}>
            {[...seances].reverse().map((s, i) => {
              const realIdx = seances.length - 1 - i;
              const atteint = s.atteint !== undefined ? s.atteint : true;
              return (
                <div key={i} style={styles.histItem}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{s.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: atteint ? 'var(--success)' : 'var(--danger)' }}>
                      {s.fait !== undefined ? `${s.fait}/${s.cible || 5}` : '✓'} {atteint ? '✓' : '✕'}
                    </span>
                    <button onClick={() => deleteSeance(realIdx)} style={styles.deleteSmall} title="Supprimer">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal ajouter métrique */}
      <Modal open={showAddMetrique} onClose={() => setShowAddMetrique(false)} title="Ajouter une métrique">
        <FormField label="Nom">
          <input style={inputStyle} value={metForm.nom} onChange={(e) => setMetForm({ ...metForm, nom: e.target.value })} placeholder="Ex: Poids, Séances/semaine, Pompes..." />
        </FormField>
        <FormField label="Unité">
          <select style={inputStyle} value={metForm.unite} onChange={(e) => setMetForm({ ...metForm, unite: e.target.value })}>
            <option value="kg">kg</option>
            <option value="km">km</option>
            <option value="min">min</option>
            <option value="séances">séances</option>
            <option value="reps">reps</option>
            <option value="fois">fois</option>
            <option value="%">%</option>
            <option value="">aucune</option>
          </select>
        </FormField>
        <FormField label="Cible (optionnel)">
          <input style={inputStyle} type="number" value={metForm.cible} onChange={(e) => setMetForm({ ...metForm, cible: e.target.value })} placeholder="Ex: 75, 5, 100..." />
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowAddMetrique(false)}>Annuler</button>
          <button style={btnPrimary} onClick={addMetrique}>Ajouter</button>
        </div>
      </Modal>

      {/* Modal ajouter entrée */}
      <Modal open={!!showEntry} onClose={() => setShowEntry(null)} title={entryMetrique ? `Nouvelle entrée — ${entryMetrique.nom}` : 'Nouvelle entrée'}>
        <FormField label="Date">
          <input style={inputStyle} type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
        </FormField>
        <FormField label={`Valeur${entryMetrique ? ` (${entryMetrique.unite})` : ''}`}>
          <input style={inputStyle} type="number" step="0.1" value={entryForm.valeur} onChange={(e) => setEntryForm({ ...entryForm, valeur: e.target.value })} />
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowEntry(null)}>Annuler</button>
          <button style={btnPrimary} onClick={addEntry}>Enregistrer</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========== HABITUDE / AUTRE ========== */
function HabitudeDetail({ obj, save }) {
  const [showAdd, setShowAdd] = useState(false);
  const [itemNom, setItemNom] = useState('');

  const data = obj.data || {};
  const items = data.items || [];
  const frequence = data.frequence || 'hebdomadaire';
  const historique = data.historique || [];

  const done = items.filter((i) => i.fait).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  const addItem = () => {
    if (!itemNom.trim()) return;
    const newItems = [...items, { id: Date.now().toString(), nom: itemNom, fait: false }];
    save((o) => ({ ...o, data: { ...o.data, items: newItems } }));
    setItemNom('');
    setShowAdd(false);
  };

  const toggleItem = (itemId) => {
    const newItems = items.map((i) => i.id === itemId ? { ...i, fait: !i.fait } : i);
    save((o) => ({ ...o, data: { ...o.data, items: newItems } }));
  };

  const deleteItem = (itemId) => {
    const newItems = items.filter((i) => i.id !== itemId);
    save((o) => ({ ...o, data: { ...o.data, items: newItems } }));
  };

  const setFrequence = (f) => {
    save((o) => ({ ...o, data: { ...o.data, frequence: f } }));
  };

  const reinitialiser = () => {
    const newHist = [...historique, { date: toISODate(new Date()), pct }];
    const newItems = items.map((i) => ({ ...i, fait: false }));
    save((o) => ({ ...o, data: { ...o.data, items: newItems, historique: newHist, lastResetDate: toISODate(new Date()) } }));
  };

  return (
    <div>
      <div style={styles.metricRow}>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{pct}%</span>
          <span style={styles.metricLabel}>complétion période en cours</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{done}/{items.length}</span>
          <span style={styles.metricLabel}>items complétés</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{historique.length}</span>
          <span style={styles.metricLabel}>périodes passées</span>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h3 style={styles.sectionTitle}>Checklist</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{ ...styles.freqBtn, ...(frequence === 'quotidienne' ? { background: 'var(--accent)', color: '#fff' } : {}) }}
              onClick={() => setFrequence('quotidienne')}
            >
              Quotidienne
            </button>
            <button
              style={{ ...styles.freqBtn, ...(frequence === 'hebdomadaire' ? { background: 'var(--accent)', color: '#fff' } : {}) }}
              onClick={() => setFrequence('hebdomadaire')}
            >
              Hebdomadaire
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Ajouter un item</button>
          <button style={{ ...btnPrimary, background: 'var(--warning)' }} onClick={reinitialiser}>Réinitialiser</button>
        </div>
      </div>

      <div style={styles.checkList}>
        {items.map((item) => (
          <div key={item.id} style={{ ...styles.checkItem, justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
              <input type="checkbox" checked={item.fait} onChange={() => toggleItem(item.id)} style={styles.checkbox} />
              <span style={{ textDecoration: item.fait ? 'line-through' : 'none', color: item.fait ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {item.nom}
              </span>
            </label>
            <button onClick={() => deleteItem(item.id)} style={styles.deleteSmall} title="Supprimer">✕</button>
          </div>
        ))}
      </div>

      {historique.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={styles.sectionTitle}>Historique</h3>
          <div style={styles.histList}>
            {[...historique].reverse().map((h, i) => (
              <div key={i} style={styles.histItem}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{h.date}</span>
                <span style={{ fontWeight: 600, color: h.pct >= 80 ? 'var(--success)' : 'var(--warning)' }}>{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un item">
        <FormField label="Nom de l'item">
          <input style={inputStyle} value={itemNom} onChange={(e) => setItemNom(e.target.value)} placeholder="Ex: Méditation 10 min" />
        </FormField>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={() => setShowAdd(false)}>Annuler</button>
          <button style={btnPrimary} onClick={addItem}>Ajouter</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========== STYLES ========== */
const styles = {
  back: {
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginBottom: '20px',
    padding: '6px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  icon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  desc: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginTop: '2px',
  },
  progressSection: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '20px',
    marginBottom: '28px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  progressLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  progressPct: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  metricRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  metric: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '20px',
    flex: '1 1 160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  metricLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  tableWrap: {
    overflowX: 'auto',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)',
  },
  scolaireCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '20px',
    marginBottom: '16px',
  },
  scolaireHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  scolaireName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  scolaireCount: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  chapList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  chapItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--accent)',
    cursor: 'pointer',
  },
  routineRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  routineBtn: {
    padding: '12px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '60px',
  },
  histList: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    marginTop: '8px',
  },
  histItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: '14px',
  },
  freqBtn: {
    padding: '5px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    background: 'var(--bg-input)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
  },
  checkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '16px',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '6px 0',
  },
  deleteSmall: {
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: '13px',
    padding: '2px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    transition: 'color 0.15s',
  },
};
