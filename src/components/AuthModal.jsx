import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const colors = {
  navy: '#0B1F3A',
  blue: '#1A6FB8',
  border: '#D4E4F0',
  textSecondary: '#4A6080',
  red: '#C6373F',
};

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(11,31,58,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  title: { fontSize: '20px', fontWeight: 800, color: colors.navy, margin: '0 0 4px' },
  sub: { fontSize: '13px', color: colors.textSecondary, margin: '0 0 20px' },
  label: { fontSize: '13px', fontWeight: 600, color: colors.navy, display: 'block', margin: '14px 0 6px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    marginTop: '22px',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.blue,
    color: '#fff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
  },
  switchRow: { textAlign: 'center', marginTop: '16px', fontSize: '13px', color: colors.textSecondary },
  switchLink: { color: colors.blue, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
  close: { position: 'absolute', top: '14px', right: '18px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: colors.textSecondary },
  error: { color: colors.red, fontSize: '13px', marginTop: '12px' },
};

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(fullName, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.card, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button style={s.close} onClick={onClose} aria-label="Close">×</button>
        <h2 style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p style={s.sub}>
          {mode === 'login' ? 'Log in to save and track your simulation progress.' : 'Sign up to start practicing and saving your results.'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label style={s.label} htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                style={s.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </>
          )}

          <label style={s.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            style={s.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={s.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            style={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" style={{ ...s.btn, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style={s.switchRow}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button style={s.switchLink} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button style={s.switchLink} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
