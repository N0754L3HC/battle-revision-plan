import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import CapsMark from './CapsMark';

const font = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const mono = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

// Matches the app's grounded dark theme (T.dark) so sign-in is continuous with the landing.
// Palette synced to the Claude Design prototype (matches landing + app).
const C = {
  bg:           '#f4eee3',
  surface:      '#fbf7ef',
  surface2:     '#efe7d8',
  inputBg:      '#fbf7ef',
  border:       '#e7ddcc',
  borderHover:  '#cdbfa8',
  text:         '#2b2620',
  muted:        '#6f665b',
  subtle:       '#a39a8c',
  accent:       '#b5735a',
  accentBg:     'rgba(181,115,90,0.12)',
  accentBorder: 'rgba(181,115,90,0.28)',
  green:        '#4f7256',
};

const FEATURES = [
  { title: 'Past paper tracker', desc: 'Log every paper with your real grade — calculated against official mark-scheme boundaries.' },
  { title: 'Battle Readiness score', desc: 'A single score telling you exactly how prepared you are for each exam.' },
  { title: 'RAG topic tracker', desc: 'Red, amber, green every topic. See at a glance where your time should go.' },
  { title: 'Error pattern log', desc: 'Tag every mistake by type. Fix the patterns before they cost you on exam day.' },
  { title: 'Exam countdown', desc: 'All your paper dates in one place — days remaining, board, and timetable.' },
  { title: 'School timetable', desc: 'Store your weekly timetable in-app. Your whole week, right next to your revision.' },
];

const STATS = [
  { value: 'Free', label: 'no credit card' },
  { value: '15+', label: 'subjects' },
  { value: 'All boards', label: 'AQA · Edexcel · OCR · WJEC' },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function AuthGate({ onAuth }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('google'); // 'google' | 'email'
  const [emailMode, setEmailMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const mobile = window.innerWidth < 768;

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
        alignItems:'center', justifyContent:'center', fontFamily:font, padding:24 }}>
        <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:8 }}>Configuration needed</div>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>
            Add your Supabase credentials to <code style={{ color:C.text, background:C.inputBg,
              padding:'1px 6px', borderRadius:4 }}>.env</code> and restart the dev server.
          </p>
          <button onClick={()=>onAuth(null)} style={{ width:'100%', padding:'12px 0',
            background:C.accent, border:'none', borderRadius:10,
            color:'#fff', fontSize:14, fontWeight:600, fontFamily:font, cursor:'pointer' }}>
            Continue without account
          </button>
        </div>
      </div>
    );
  }

  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) { setLoading(false); setError(err.message); }
  };

  const sanitizeEmail = v => v.trim().toLowerCase().slice(0, 254);
  const sanitizePassword = v => v.slice(0, 128);

  const handleEmailAuth = async () => {
    setLoading(true); setError('');
    const safeEmail = sanitizeEmail(email);
    const safePass = sanitizePassword(password);
    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      setError('Enter a valid email address.'); setLoading(false); return;
    }
    if (emailMode === 'reset') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: `${window.location.origin}?reset=1`,
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setEmailSent(true); return;
    }
    if (safePass.length < 8) {
      setError('Password must be at least 8 characters.'); setLoading(false); return;
    }
    if (emailMode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email: safeEmail, password: safePass,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setEmailSent(true); return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: safeEmail, password: safePass });
    setLoading(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
  };

  if (mobile) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font,
        display:'flex', flexDirection:'column', padding:'0 0 env(safe-area-inset-bottom)' }}>

        {/* Hero */}
        <div style={{ padding:'52px 24px 28px', flex:'0 0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
            <CapsMark size={34}/>
            <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16,
            fontSize:11, fontWeight:600, color:C.accent, letterSpacing:'0.05em', textTransform:'uppercase' }}>
            <span style={{ width:20, height:1.5, background:C.accent, display:'inline-block' }}/>
            A-Levels &amp; GCSEs
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:'0 0 10px', lineHeight:1.25, letterSpacing:'-0.01em' }}>
            Stop guessing.<br/>Start tracking.
          </h1>
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, margin:0 }}>
            Log past papers, see your real grade against mark-scheme boundaries, and know exactly where you're dropping marks.
          </p>
        </div>

        {/* Auth card */}
        <div style={{ margin:'0 16px', background:C.surface,
          borderRadius:16, border:`1px solid ${C.border}`, padding:'22px 20px', flex:'0 0 auto' }}>

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:18, background:'rgba(0,0,0,0.04)', borderRadius:8, padding:3 }}>
            {[['google','Google'],['email','Email']].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setError('');setEmailSent(false);}} style={{
                flex:1, padding:'7px 0', borderRadius:6, border:'none', cursor:'pointer',
                fontFamily:font, fontSize:13, fontWeight:tab===t?600:400,
                background:tab===t?C.surface2||'rgba(255,255,255,0.08)':'transparent',
                color:tab===t?C.text:C.muted, transition:'all 0.12s',
              }}>{l}</button>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)',
              borderRadius:8, padding:'10px 14px', marginBottom:16,
              fontSize:13, color:'#b91c1c', lineHeight:1.5 }}>
              {error}
            </div>
          )}

          {tab === 'google' ? (
            <button onClick={handleGoogle} disabled={loading}
              style={{ width:'100%', padding:'14px 0',
                background:C.inputBg,
                border:`1px solid ${C.borderHover}`,
                borderRadius:10, cursor:loading?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                fontFamily:font, fontSize:15, color:C.text, fontWeight:600,
                transition:'background 0.15s' }}>
              <GoogleIcon/>
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>
          ) : emailSent ? (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
            </div>
              <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>
                {emailMode==='reset' ? 'Reset link sent' : 'Check your email'}
              </div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
                {emailMode==='reset'
                  ? 'A password reset link has been sent. Check your inbox.'
                  : 'We sent a confirmation link to your email. Click it to activate your account.'}
              </div>
              <button onClick={()=>{setEmailSent(false);setEmailMode('signin');}} style={{
                marginTop:16, background:'transparent', border:`1px solid ${C.border}`,
                borderRadius:8, color:C.muted, fontSize:13, fontFamily:font,
                cursor:'pointer', padding:'8px 16px',
              }}>Back to sign in</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email"
                placeholder="Email address" autoComplete="email"
                onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()}
                style={{ width:'100%', padding:'12px 14px', background:C.inputBg,
                  border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                  fontSize:14, fontFamily:font, outline:'none', boxSizing:'border-box' }}/>
              {emailMode !== 'reset' && (
                <input value={password} onChange={e=>setPassword(e.target.value)} type="password"
                  placeholder={emailMode==='signup' ? 'Create password (8+ chars)' : 'Password'}
                  autoComplete={emailMode==='signup'?'new-password':'current-password'}
                  onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()}
                  style={{ width:'100%', padding:'12px 14px', background:C.inputBg,
                    border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                    fontSize:14, fontFamily:font, outline:'none', boxSizing:'border-box' }}/>
              )}
              <button onClick={handleEmailAuth} disabled={loading}
                style={{ width:'100%', padding:'13px 0', background:C.accent, border:'none',
                  borderRadius:10, color:'#fff', fontSize:14, fontWeight:600,
                  fontFamily:font, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
                {loading ? '…' : emailMode==='signup' ? 'Create account' : emailMode==='reset' ? 'Send reset link' : 'Sign in'}
              </button>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                <button onClick={()=>{setEmailMode(emailMode==='signin'?'signup':'signin');setError('');}} style={{
                  background:'none', border:'none', color:C.muted, fontSize:11,
                  fontFamily:font, cursor:'pointer', textDecoration:'underline',
                  textDecorationColor:'rgba(100,116,139,0.3)',
                }}>
                  {emailMode==='signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
                {emailMode==='signin' && (
                  <button onClick={()=>{setEmailMode('reset');setError('');}} style={{
                    background:'none', border:'none', color:C.muted, fontSize:11,
                    fontFamily:font, cursor:'pointer', textDecoration:'underline',
                    textDecorationColor:'rgba(100,116,139,0.3)',
                  }}>Forgot password?</button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Stats strip */}
        <div style={{ padding:'20px 24px 0', display:'flex', gap:0 }}>
          {STATS.map((s,i) => (
            <div key={s.label} style={{ flex:1, textAlign:'center',
              borderRight: i < STATS.length-1 ? `1px solid ${C.border}` : 'none',
              padding:'0 4px' }}>
              <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:mono }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ padding:'20px 24px', flex:1 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {FEATURES.slice(0,4).map(f=>(
              <div key={f.title} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ marginTop:1, flexShrink:0 }}><CheckIcon/></div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:1 }}>{f.title}</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // Desktop — two-column layout
  return (
    <div style={{ minHeight:'100vh', background:C.bg,
      display:'flex', alignItems:'stretch', fontFamily:font }}>

      {/* Left: auth panel */}
      <div style={{ width:'100%', maxWidth:420, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'52px 44px',
        borderRight:`1px solid ${C.border}`, flexShrink:0 }}>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:40 }}>
          <CapsMark size={32}/>
          <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18,
          fontSize:11, fontWeight:600, color:C.accent, letterSpacing:'0.05em', textTransform:'uppercase',
          alignSelf:'flex-start' }}>
          <span style={{ width:20, height:1.5, background:C.accent, display:'inline-block' }}/>
          A-Levels &amp; GCSEs
        </div>

        <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:'0 0 10px', lineHeight:1.25, letterSpacing:'-0.01em' }}>
          Your revision,<br/>tracked properly.
        </h1>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.7, margin:'0 0 32px' }}>
          Know your real grade, spot the patterns in your mistakes, and prepare with confidence.
        </p>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:18, background:'rgba(0,0,0,0.04)', borderRadius:8, padding:3 }}>
          {[['google','Google'],['email','Email / Password']].map(([t,l])=>(
            <button key={t} onClick={()=>{setTab(t);setError('');setEmailSent(false);}} style={{
              flex:1, padding:'7px 0', borderRadius:6, border:'none', cursor:'pointer',
              fontFamily:font, fontSize:13, fontWeight:tab===t?600:400,
              background:tab===t?C.surface2:'transparent',
              color:tab===t?C.text:C.muted, transition:'all 0.12s',
            }}>{l}</button>
          ))}
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)',
            borderRadius:8, padding:'10px 14px', marginBottom:16,
            fontSize:13, color:'#b91c1c', lineHeight:1.5 }}>
            {error}
          </div>
        )}

        {tab === 'google' ? (
          <button onClick={handleGoogle} disabled={loading}
            style={{ width:'100%', padding:'13px 0',
              background:C.inputBg,
              border:`1px solid ${C.borderHover}`,
              borderRadius:10, cursor:loading?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              fontFamily:font, fontSize:15, color:C.text, fontWeight:600,
              transition:'background 0.15s' }}>
            <GoogleIcon/>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        ) : emailSent ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ marginBottom:12, display:'flex', justifyContent:'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:6 }}>
              {emailMode==='reset' ? 'Reset link sent' : 'Check your email'}
            </div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
              {emailMode==='reset'
                ? 'A password reset link has been sent. Check your inbox.'
                : 'We sent a confirmation link to your email. Click it to activate your account, then come back and sign in.'}
            </div>
            <button onClick={()=>{setEmailSent(false);setEmailMode('signin');}} style={{
              marginTop:14, background:'transparent', border:`1px solid ${C.border}`,
              borderRadius:8, color:C.muted, fontSize:13, fontFamily:font,
              cursor:'pointer', padding:'8px 16px',
            }}>Back to sign in</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email"
              placeholder="Email address" autoComplete="email"
              onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()}
              style={{ width:'100%', padding:'12px 14px', background:C.inputBg,
                border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                fontSize:14, fontFamily:font, outline:'none', boxSizing:'border-box' }}/>
            {emailMode !== 'reset' && (
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password"
                placeholder={emailMode==='signup' ? 'Create password (8+ chars)' : 'Password'}
                autoComplete={emailMode==='signup'?'new-password':'current-password'}
                onKeyDown={e=>e.key==='Enter'&&handleEmailAuth()}
                style={{ width:'100%', padding:'12px 14px', background:C.inputBg,
                  border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                  fontSize:14, fontFamily:font, outline:'none', boxSizing:'border-box' }}/>
            )}
            <button onClick={handleEmailAuth} disabled={loading}
              style={{ width:'100%', padding:'13px 0', background:C.accent, border:'none',
                borderRadius:10, color:'#fff', fontSize:14, fontWeight:600,
                fontFamily:font, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
              {loading ? '…' : emailMode==='signup' ? 'Create account' : emailMode==='reset' ? 'Send reset link' : 'Sign in'}
            </button>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
              <button onClick={()=>{setEmailMode(emailMode==='signin'?'signup':'signin');setError('');}} style={{
                background:'none', border:'none', color:C.muted, fontSize:11,
                fontFamily:font, cursor:'pointer', textDecoration:'underline',
                textDecorationColor:'rgba(100,116,139,0.3)',
              }}>
                {emailMode==='signin' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}
              </button>
              {emailMode==='signin' && (
                <button onClick={()=>{setEmailMode('reset');setError('');}} style={{
                  background:'none', border:'none', color:C.muted, fontSize:11,
                  fontFamily:font, cursor:'pointer', textDecoration:'underline',
                  textDecorationColor:'rgba(100,116,139,0.3)',
                }}>Forgot password?</button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ marginTop:28, display:'flex', gap:0,
          background:C.surface, borderRadius:10, border:`1px solid ${C.border}`,
          overflow:'hidden' }}>
          {STATS.map((s,i) => (
            <div key={s.label} style={{ flex:1, textAlign:'center', padding:'12px 0',
              borderRight: i < STATS.length-1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize:17, fontWeight:800, color:C.text, fontFamily:mono }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Right: features panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'52px 60px',
        background:`radial-gradient(ellipse at 30% 50%, rgba(181,115,90,0.05) 0%, transparent 60%)` }}>
        <div style={{ maxWidth:460 }}>

          <div style={{ fontSize:11, fontWeight:700, color:C.muted,
            letterSpacing:0.6, marginBottom:20, textTransform:'uppercase' }}>
            What you get
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{ display:'flex', gap:12, alignItems:'flex-start',
                padding:'14px 16px', background:C.surface,
                border:`1px solid ${C.border}`, borderRadius:10 }}>
                <div style={{ marginTop:1, flexShrink:0 }}><CheckIcon/></div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:3 }}>{f.title}</div>
                  <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:28, padding:'14px 18px',
            background:C.accentBg, borderRadius:10, border:`1px solid ${C.accentBorder}` }}>
            <div style={{ fontSize:13, color:C.accent, fontWeight:700, marginBottom:4 }}>Free during beta</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
              All features are free right now — no credit card, no trial. Supports AQA, Edexcel, OCR, WJEC, and all major boards.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
