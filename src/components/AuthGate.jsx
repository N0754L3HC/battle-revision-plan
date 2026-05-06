import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import TermsOfService from './TermsOfService';

const S = {
  root: {
    minHeight: '100vh', background: '#08080D',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono','SF Mono',monospace", padding: 16,
  },
  card: {
    background: '#0f0f18', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 400,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 },
  logoA: { fontSize: 22, fontWeight: 800, color: '#FF3D00' },
  logoT: { fontWeight: 700, fontSize: 14, letterSpacing: 2, color: '#fff' },
  tabs: { display: 'flex', gap: 4, marginBottom: 24 },
  tab: (active) => ({
    flex: 1, padding: '8px 0', textAlign: 'center',
    background: active ? 'rgba(255,61,0,0.15)' : 'transparent',
    border: `1px solid ${active ? 'rgba(255,61,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#FF3D00' : '#555', borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  }),
  label: { fontSize: 11, color: '#666', marginBottom: 5, display: 'block', letterSpacing: 1 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
    padding: '10px 12px', color: '#ddd', fontSize: 14,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14,
  },
  btn: (disabled) => ({
    width: '100%', background: disabled ? '#2a1008' : '#FF3D00',
    color: disabled ? '#553020' : '#fff', border: 'none',
    padding: '11px 0', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14, fontWeight: 700, fontFamily: 'inherit', marginTop: 6,
  }),
  err: { color: '#FF3D00', fontSize: 12, marginBottom: 12, lineHeight: 1.5 },
  ok: { color: '#00E676', fontSize: 12, marginBottom: 12 },
  tosRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, marginTop: 2 },
  tosLink: { color: '#FF3D00', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 },
  hint: { fontSize: 11, color: '#444', marginTop: 16, textAlign: 'center', lineHeight: 1.5 },
};

export default function AuthGate({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tosAgreed, setTosAgreed] = useState(false);
  const [showTos, setShowTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isSupabaseConfigured()) {
    return (
      <div style={S.root}>
        <div style={S.card}>
          <div style={S.logo}>
            <span style={S.logoA}>A*</span>
            <span style={S.logoT}>BATTLE PLAN</span>
          </div>
          <p style={{ color: '#FF3D00', fontSize: 13, marginBottom: 12 }}>Supabase not configured</p>
          <p style={{ color: '#888', fontSize: 12, lineHeight: 1.7 }}>
            Add your Supabase credentials to <code style={{ color: '#ddd' }}>.env</code> then restart the dev server.
            <br /><br />
            <code style={{ color: '#ddd' }}>VITE_SUPABASE_URL=...</code><br />
            <code style={{ color: '#ddd' }}>VITE_SUPABASE_ANON_KEY=...</code>
          </p>
          <button
            style={{ ...S.btn(false), marginTop: 20 }}
            onClick={() => onAuth(null)}
          >
            Continue without account (local only)
          </button>
        </div>
      </div>
    );
  }

  const handleLogin = async () => {
    if (!email || !password) return setError('Enter your email and password.');
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    onAuth(data.user, profile || {});
  };

  const handleSignup = async () => {
    if (!email || !password) return setError('Enter your email and password.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!tosAgreed) return setError('You must agree to the Terms of Service to create an account.');
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    if (data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        display_name: name.trim() || null,
        tos_agreed_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    setSuccess('Account created! Check your email to confirm, then log in.');
    setMode('login');
  };

  const handleForgot = async () => {
    if (!email) return setError('Enter your email address first.');
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) return setError(err.message);
    setSuccess('Password reset email sent — check your inbox.');
  };

  return (
    <>
      {showTos && <TermsOfService onClose={() => setShowTos(false)} />}
      <div style={S.root}>
        <div style={S.card}>
          <div style={S.logo}>
            <span style={S.logoA}>A*</span>
            <span style={S.logoT}>BATTLE PLAN</span>
          </div>

          <div style={S.tabs}>
            <button style={S.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Log In
            </button>
            <button style={S.tab(mode === 'signup')} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
              Sign Up
            </button>
          </div>

          {error && <div style={S.err}>{error}</div>}
          {success && <div style={S.ok}>{success}</div>}

          {mode === 'signup' && (
            <>
              <label style={S.label}>DISPLAY NAME (OPTIONAL)</label>
              <input
                style={S.input}
                placeholder="e.g. Alex"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </>
          )}

          <label style={S.label}>EMAIL</label>
          <input
            style={S.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
          />

          <label style={S.label}>PASSWORD</label>
          <input
            style={S.input}
            type="password"
            placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Your password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
          />

          {mode === 'signup' && (
            <div style={S.tosRow}>
              <input
                type="checkbox"
                id="tos"
                checked={tosAgreed}
                onChange={e => setTosAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#FF3D00', cursor: 'pointer' }}
              />
              <label htmlFor="tos" style={{ fontSize: 12, color: '#888', cursor: 'pointer', lineHeight: 1.6 }}>
                I have read and agree to the{' '}
                <span style={S.tosLink} onClick={() => setShowTos(true)}>
                  Terms of Service &amp; Privacy Policy
                </span>
              </label>
            </div>
          )}

          <button
            style={S.btn(loading)}
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>

          {mode === 'login' && (
            <div style={S.hint}>
              <span
                style={{ color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleForgot}
              >
                Forgot password?
              </span>
            </div>
          )}

          <div style={S.hint}>
            <span
              style={{ color: '#444', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => onAuth(null)}
            >
              Continue without an account (data saved locally only)
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
