export const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '14px',
};

export const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
};

export const btnPrimary = {
  padding: '10px 20px',
  background: 'var(--accent)',
  color: '#fff',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

export const btnDanger = {
  ...btnPrimary,
  background: 'var(--danger)',
};

export const btnSecondary = {
  ...btnPrimary,
  background: 'var(--bg-input)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
};

export function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
