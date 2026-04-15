import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import pako from 'pako';
import { getSettings, saveSettings, exportAllData, importAllData, resetAllData } from '../data/store';
import { FormField, inputStyle, btnPrimary, btnDanger, btnSecondary } from '../components/FormControls';

const VAPID_PUBLIC_KEY = 'BMfdU455MTFxF1XoxtRBGSDM_7tVWNfgG4ye90vtuCilHMxpQGwjtfRR1ECqIeFzWpmjI0FoK2Xmfg_y168LmVY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function Parametres() {
  const [settings, setSettingsState] = useState(getSettings());
  const [importMsg, setImportMsg] = useState('');
  const [notifStatus, setNotifStatus] = useState('loading');
  const [notifMsg, setNotifMsg] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [pasteMsg, setPasteMsg] = useState('');
  const canvasRef = useRef(null);

  // Check notification status on load
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifStatus('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setNotifStatus(sub ? 'subscribed' : 'unsubscribed');
        });
      });
    } else if (Notification.permission === 'denied') {
      setNotifStatus('denied');
    } else {
      setNotifStatus('unsubscribed');
    }
  }, []);

  const subscribePush = async () => {
    try {
      setNotifMsg('');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifStatus('denied');
        setNotifMsg('Permission refusée. Active les notifications dans les paramètres de ton navigateur.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (res.ok) {
        setNotifStatus('subscribed');
        setNotifMsg('Notifications activées !');

        // Test notification
        reg.showNotification('MyQawam', {
          body: 'Les notifications sont activées !',
          icon: '/logo.png',
        });
      } else {
        setNotifMsg('Erreur serveur. Réessaie plus tard.');
      }
    } catch (err) {
      console.error('Push subscribe error:', err);
      setNotifMsg('Erreur : ' + err.message);
    }
  };

  const unsubscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
        await subscription.unsubscribe();
      }
      setNotifStatus('unsubscribed');
      setNotifMsg('Notifications désactivées.');
    } catch (err) {
      setNotifMsg('Erreur : ' + err.message);
    }
  };

  const handleNameChange = (e) => {
    const newSettings = { ...settings, appName: e.target.value };
    setSettingsState(newSettings);
    saveSettings(newSettings);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myqawam-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importAllData(data);
        setSettingsState(getSettings());
        setImportMsg('Données importées avec succès !');
        setTimeout(() => setImportMsg(''), 3000);
      } catch {
        setImportMsg('Erreur : fichier invalide.');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.')) {
      resetAllData();
      setSettingsState(getSettings());
      window.location.reload();
    }
  };

  // Generate QR (just the app URL) + sync code (compressed data)
  const generateSync = () => {
    const data = exportAllData();
    const json = JSON.stringify(data);
    const compressed = pako.deflate(new TextEncoder().encode(json));
    const b64 = btoa(String.fromCharCode(...compressed))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    setSyncCode(b64);
    setShowQr(true);
    setCopied(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(syncCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Import from pasted sync code
  const importFromCode = () => {
    try {
      const b64 = pasteCode.trim().replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const decompressed = pako.inflate(bytes);
      const json = new TextDecoder().decode(decompressed);
      const data = JSON.parse(json);
      importAllData(data);
      setSettingsState(getSettings());
      setPasteMsg('Données importées avec succès !');
      setPasteCode('');
      setTimeout(() => setPasteMsg(''), 3000);
    } catch {
      setPasteMsg('Erreur : code invalide.');
      setTimeout(() => setPasteMsg(''), 3000);
    }
  };

  // Render QR code (just the app URL)
  useEffect(() => {
    if (showQr && canvasRef.current) {
      const host = window.location.hostname;
      const port = window.location.port || '5173';
      const appUrl = `http://${host}:${port}`;
      QRCode.toCanvas(canvasRef.current, appUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#ffffff', light: '#1e1e2e' },
      });
    }
  }, [showQr]);

  return (
    <div>
      <h1 style={styles.title}>Paramètres</h1>
      <p style={styles.subtitle}>Configurez votre application</p>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Général</h3>
        <FormField label="Nom de l'application">
          <input style={{ ...inputStyle, maxWidth: '300px' }} value={settings.appName} onChange={handleNameChange} />
        </FormField>
      </div>

      {/* Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔔 Notifications</h3>
        {notifStatus === 'unsupported' && (
          <p style={styles.sectionDesc}>Ton navigateur ne supporte pas les notifications push.</p>
        )}
        {notifStatus === 'denied' && (
          <p style={styles.sectionDesc}>
            Les notifications sont bloquées. Va dans les paramètres de ton navigateur pour les réactiver.
          </p>
        )}
        {notifStatus === 'loading' && (
          <p style={styles.sectionDesc}>Chargement...</p>
        )}
        {notifStatus === 'unsubscribed' && (
          <>
            <p style={styles.sectionDesc}>
              Active les notifications pour recevoir un rappel quotidien de tes objectifs (prières, sport, habitudes...).
            </p>
            <button style={btnPrimary} onClick={subscribePush}>
              Activer les notifications
            </button>
          </>
        )}
        {notifStatus === 'subscribed' && (
          <>
            <p style={{ ...styles.sectionDesc, color: 'var(--success)' }}>
              ✓ Notifications activées — tu recevras un rappel chaque matin à 8h.
            </p>
            <button style={btnSecondary} onClick={unsubscribePush}>
              Désactiver les notifications
            </button>
          </>
        )}
        {notifMsg && (
          <p style={{ marginTop: '12px', fontSize: '13px', color: notifMsg.includes('Erreur') || notifMsg.includes('refusée') ? 'var(--danger)' : 'var(--success)' }}>
            {notifMsg}
          </p>
        )}
      </div>

      {/* Sync téléphone */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📱 Sync téléphone</h3>
        <p style={styles.sectionDesc}>
          Transfère tes données vers ton téléphone en 3 étapes.
        </p>
        <button style={btnPrimary} onClick={generateSync}>
          Préparer la sync
        </button>

        {showQr && (
          <div style={{ marginTop: '20px' }}>
            {/* Step 1: QR to access app */}
            <div style={styles.syncStep}>
              <div style={styles.syncStepHeader}>
                <span style={styles.syncStepNum}>1</span>
                <span style={styles.syncStepTitle}>Scanne pour ouvrir l'app sur ton téléphone</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <canvas ref={canvasRef} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Ton PC et ton téléphone doivent être sur le même Wi-Fi
              </p>
            </div>

            {/* Step 2: Copy sync code */}
            <div style={styles.syncStep}>
              <div style={styles.syncStepHeader}>
                <span style={styles.syncStepNum}>2</span>
                <span style={styles.syncStepTitle}>Copie ce code et envoie-le à ton téléphone</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Via WhatsApp, Telegram, Notes, SMS... n'importe quel moyen.
              </p>
              <div style={styles.codeBox}>
                <code style={styles.codeText}>{syncCode.slice(0, 80)}...</code>
              </div>
              <button
                style={{ ...btnPrimary, marginTop: '8px', background: copied ? 'var(--success)' : 'var(--accent)' }}
                onClick={copyCode}
              >
                {copied ? '✓ Copié !' : 'Copier le code'}
              </button>
            </div>

            {/* Step 3: Instructions */}
            <div style={styles.syncStep}>
              <div style={styles.syncStepHeader}>
                <span style={styles.syncStepNum}>3</span>
                <span style={styles.syncStepTitle}>Sur le téléphone : colle le code</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Ouvre l'app → Paramètres → "Recevoir des données" → Colle le code → Importer
              </p>
            </div>
          </div>
        )}

        {/* Receive sync code (for phone side) */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Recevoir des données
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Colle ici le code de sync reçu depuis un autre appareil.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={pasteCode}
              onChange={(e) => setPasteCode(e.target.value)}
              placeholder="Coller le code de sync ici..."
            />
            <button style={btnPrimary} onClick={importFromCode} disabled={!pasteCode.trim()}>
              Importer
            </button>
          </div>
          {pasteMsg && (
            <p style={{ marginTop: '8px', fontSize: '13px', color: pasteMsg.includes('Erreur') ? 'var(--danger)' : 'var(--success)' }}>
              {pasteMsg}
            </p>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Données</h3>
        <div style={styles.btnRow}>
          <button style={btnPrimary} onClick={handleExport}>
            Exporter les données
          </button>
          <label style={{ ...btnSecondary, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            Importer des données
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
        {importMsg && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: importMsg.includes('Erreur') ? 'var(--danger)' : 'var(--success)' }}>
            {importMsg}
          </p>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={{ ...styles.sectionTitle, color: 'var(--danger)' }}>Zone dangereuse</h3>
        <p style={styles.sectionDesc}>
          Cette action supprimera toutes vos données (objectifs, planning, paramètres).
        </p>
        <button style={btnDanger} onClick={handleReset}>
          Réinitialiser toutes les données
        </button>
      </div>
    </div>
  );
}

const styles = {
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginBottom: '32px',
  },
  section: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '24px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  sectionDesc: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  syncStep: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    padding: '16px',
    marginBottom: '12px',
  },
  syncStepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  syncStepNum: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  syncStepTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  codeBox: {
    background: 'var(--bg-primary)',
    borderRadius: '6px',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  codeText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
};
