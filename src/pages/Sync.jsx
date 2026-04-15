import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pako from 'pako';
import { importAllData } from '../data/store';

export default function Sync() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('import');

  useEffect(() => {
    try {
      // Read compressed data from URL hash
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setStatus('error');
        return;
      }

      // Base64url decode
      const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Decompress
      const decompressed = pako.inflate(bytes);
      const json = new TextDecoder().decode(decompressed);
      const data = JSON.parse(json);

      importAllData(data);
      setStatus('success');
      setTimeout(() => navigate('/'), 2000);
    } catch {
      setStatus('error');
    }
  }, [navigate]);

  return (
    <div style={styles.container}>
      {status === 'import' && (
        <div style={styles.card}>
          <span style={styles.icon}>⏳</span>
          <h2 style={styles.title}>Import en cours...</h2>
        </div>
      )}
      {status === 'success' && (
        <div style={styles.card}>
          <span style={styles.icon}>✅</span>
          <h2 style={styles.title}>Données importées !</h2>
          <p style={styles.text}>Redirection vers le Dashboard...</p>
        </div>
      )}
      {status === 'error' && (
        <div style={styles.card}>
          <span style={styles.icon}>❌</span>
          <h2 style={styles.title}>Erreur d'import</h2>
          <p style={styles.text}>Le lien est invalide ou les données sont corrompues.</p>
          <button style={styles.btn} onClick={() => navigate('/')}>Retour au Dashboard</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '400px',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  text: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  btn: {
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
