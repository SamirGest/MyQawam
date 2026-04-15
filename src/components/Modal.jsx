export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button style={styles.close} onClick={onClose}>{'\u2715'}</button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  close: {
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: '18px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  body: {
    padding: '24px',
  },
};
