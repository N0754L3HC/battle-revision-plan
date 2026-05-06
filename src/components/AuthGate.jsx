import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import TermsOfService from './TermsOfService';

// ── Tokens ──────────────────────────────────────────────────────────────────

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', 'SF Mono', monospace";

const colors = {
  bg:       '#0d0f14',
  surface:  '#13161e',
  border:   'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  text:     '#e8eaf0',
  muted:    '#6b7280',
  accent:   '#b5735a',
  accentBg: 'rgba(181,115,90,0.1)',
  accentBorder: 'rgba(181,115,90,0.25)',
};

// ── Small components ─────────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: colors.muted, marginBottom: 6, fontFamily: font }}>
      {children}
    </div>
  );
}

function Input({ type = 'text', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? colors.borderHover : colors.border}`,
        borderRadius: 8, padding: '11px 14px',
        color: colors.text, fontSize: 14, fontFamily: font,
        outline: 'none', transition: 'border-color 0.15s',
        ...props.style,
      }}
    />
  );
}

function Button({ children, variant = 'primary', loading, disabled, ...props }) {
  const isPrimary = variant === 'primary';
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '12px 0',
        background: isPrimary
          ? (disabled || loading ? 'rgba(181,115,90,0.35)' : colors.accent)
          : 'transparent',
        border: `1px solid ${isPrimary ? 'transparent' : colors.border}`,
        borderRadius: 8, color: isPrimary ? '#fff' : colors.muted,
        fontSize: 14, fontWeight: isPrimary ? 600 : 400,
        fontFamily: font, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', letterSpacing: 0.2,
        ...props.style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

// ── Feature highlights shown on the right panel ───────────────────────────

const FEATURES = [
  {
    title: 'Past paper tracker',
    desc: 'Log every paper you do. Get your actual grade using real mark-scheme boundaries, not rough percentages.',
  },
  {
    title: 'Battle Readiness score',
    desc: 'A single score that tells you how prepared you are for each exam. Updated every time you log a paper.',
  },
  {
    title: 'Error pattern analysis',
    desc: 'Track the mistakes you keep making. Spot patterns. Fix them before the exam.',
  },
  {
    title: 'Week-by-week revision plan',
    desc: 'A structured plan from now to your last exam, built around your specific subjects.',
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function AuthGate({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tosAgreed, setTosAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTos, setShowTos] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, padding: 16 }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            Configuration needed
          </div>
          <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Add your Supabase credentials to <code style={{ color: colors.text, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>.env</code> and restart the dev server.
          </p>
          <Button onClick={() => onAuth(null)}>Continue without account</Button>
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
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).single();
    onAuth(data.user, profile || {});
  };

  const handleSignup = async () => {
    if (!email || !password) return setError('Enter your email and password.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!tosAgreed) return setError('You need to agree to the Terms of Service to continue.');
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) return setError(err.message);
    if (data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id, email,
        display_name: name.trim() || null,
        tos_agreed_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    setSuccess('Account created — check your email to confirm, then log in.');
    setTab('login');
  };

  const handleForgot = async () => {
    if (!email) return setError('Enter your email address above first.');
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) return setError(err.message);
    setSuccess('Password reset email sent. Check your inbox.');
  };

  const submit = tab === 'login' ? handleLogin : handleSignup;

  return (
    <>
      {showTos && <TermsOfService onClose={() => setShowTos(false)} />}

      <div style={{
        minHeight: '100vh', background: colors.bg,
        display: 'flex', alignItems: 'stretch',
        fontFamily: font,
      }}>

        {/* ── Left: auth form ───────────────────────────── */}
        <div style={{
          width: '100%', maxWidth: 440,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '48px 40px',
          borderRight: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>

          {/* Logo */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: colors.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: mono, fontWeight: 900, fontSize: 13, color: '#fff',
              }}>
                A*
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, letterSpacing: 0.2 }}>
                Battle Plan
              </span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0, lineHeight: 1.3 }}>
              Your A-Level revision,<br />tracked properly.
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: 3, marginBottom: 24, border: `1px solid ${colors.border}`,
          }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }} style={{
                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
                background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === t ? colors.text : colors.muted,
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                fontFamily: font, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t === 'login' ? 'Log in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#fca5a5', lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#86efac', lineHeight: 1.5,
            }}>
              {success}
            </div>
          )}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'signup' && (
              <div>
                <Label>Your name (optional)</Label>
                <Input
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>
            <div>
              <Label>Password{tab === 'signup' ? ' (min. 8 characters)' : ''}</Label>
              <Input
                type="password"
                placeholder={tab === 'signup' ? 'Choose a strong password' : 'Your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>

            {tab === 'signup' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={tosAgreed}
                  onChange={e => setTosAgreed(e.target.checked)}
                  style={{ marginTop: 3, accentColor: colors.accent, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
                  I've read and agree to the{' '}
                  <span
                    onClick={e => { e.preventDefault(); setShowTos(true); }}
                    style={{ color: colors.text, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Terms of Service & Privacy Policy
                  </span>
                </span>
              </label>
            )}

            <Button onClick={submit} loading={loading}>
              {tab === 'login' ? 'Log in' : 'Create account'}
            </Button>

            {tab === 'login' && (
              <button
                onClick={handleForgot}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', color: colors.muted,
                  fontSize: 12, fontFamily: font, cursor: 'pointer',
                  textAlign: 'center', padding: 0,
                  textDecoration: 'underline', textDecorationColor: 'rgba(100,116,139,0.4)',
                }}
              >
                Forgot your password?
              </button>
            )}
          </div>

          {/* Skip */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <button
              onClick={() => onAuth(null)}
              style={{
                background: 'none', border: 'none', color: colors.muted,
                fontSize: 12, fontFamily: font, cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(100,116,139,0.3)',
              }}
            >
              Continue without an account — data saved locally only
            </button>
          </div>
        </div>

        {/* ── Right: value prop (hidden on narrow screens) ──────────── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '48px 56px',
          background: 'linear-gradient(135deg, rgba(181,115,90,0.04) 0%, transparent 50%)',
        }}>
          <div style={{ maxWidth: 440 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase' }}>
              UK and Wales A-Level
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: '0 0 8px', lineHeight: 1.3 }}>
              Stop guessing how prepared you are.
            </h2>
            <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.7, margin: '0 0 40px' }}>
              Battle Plan tracks every past paper you do, shows you where your marks are being dropped, and gives you a clear readiness score before each exam.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: colors.accent, flexShrink: 0, marginTop: 7,
                  }}/>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 3 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 40, padding: '14px 18px',
              background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: 13, color: colors.text, fontWeight: 600, marginBottom: 4 }}>
                Free during beta
              </div>
              <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
                All features are free right now. No credit card, no trial period. Supports all major A-Level subjects and exam boards, including WJEC/Eduqas.
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
