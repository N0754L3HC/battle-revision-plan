import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', 'SF Mono', monospace";

const C = {
  bg:           '#0d0f14',
  surface:      '#13161e',
  border:       'rgba(255,255,255,0.07)',
  borderHover:  'rgba(255,255,255,0.14)',
  text:         '#e8eaf0',
  muted:        '#6b7280',
  accent:       '#b5735a',
  accentBg:     'rgba(181,115,90,0.1)',
  accentBorder: 'rgba(181,115,90,0.25)',
};

const FEATURES = [
  { title: 'Past paper tracker', desc: 'Log every paper you do. Get your actual grade using real mark-scheme boundaries.' },
  { title: 'Battle Readiness score', desc: 'A single score that tells you how prepared you are for each exam.' },
  { title: 'Error pattern analysis', desc: 'Track the mistakes you keep making. Spot patterns. Fix them before the exam.' },
  { title: 'Week-by-week revision plan', desc: 'A structured plan from now to your last exam, built around your subjects.' },
];

export default function AuthGate({ onAuth }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const mobile = window.innerWidth < 768;

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
        alignItems:'center', justifyContent:'center', fontFamily:font, padding:24 }}>
        <div style={{ maxWidth:400, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:8 }}>Configuration needed</div>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:20 }}>
            Add your Supabase credentials to <code style={{ color:C.text, background:'rgba(255,255,255,0.06)',
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

  if (mobile) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font,
        display:'flex', flexDirection:'column', padding:'0 0 env(safe-area-inset-bottom)' }}>

        {/* Hero */}
        <div style={{ padding:'52px 24px 32px', flex:'0 0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:C.accent,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:mono, fontWeight:900, fontSize:13, color:'#fff' }}>A*</div>
            <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:'0 0 10px', lineHeight:1.25 }}>
            Your A-Level revision,<br />tracked properly.
          </h1>
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, margin:0 }}>
            Log past papers, track your readiness, and spot errors before they cost you marks.
          </p>
        </div>

        {/* Auth card */}
        <div style={{ margin:'0 16px', background:C.surface,
          borderRadius:16, border:`1px solid ${C.border}`, padding:'24px 20px', flex:'0 0 auto' }}>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)',
              borderRadius:8, padding:'10px 14px', marginBottom:16,
              fontSize:13, color:'#fca5a5', lineHeight:1.5 }}>
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading}
            style={{ width:'100%', padding:'14px 0',
              background:'rgba(255,255,255,0.06)',
              border:`1px solid ${C.borderHover}`,
              borderRadius:10, cursor:loading?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              fontFamily:font, fontSize:15, color:C.text, fontWeight:600,
              transition:'background 0.15s' }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ marginTop:16, textAlign:'center' }}>
            <button onClick={()=>onAuth(null)}
              style={{ background:'none', border:'none', color:C.muted,
                fontSize:13, fontFamily:font, cursor:'pointer',
                textDecoration:'underline', textDecorationColor:'rgba(100,116,139,0.3)' }}>
              Continue without an account
            </button>
          </div>
        </div>

        {/* Features */}
        <div style={{ padding:'28px 24px', flex:1 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:4, height:4, borderRadius:'50%',
                  background:C.accent, flexShrink:0, marginTop:7 }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{f.title}</div>
                  <div style={{ fontSize:12, color:C.muted, lineHeight:1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:24, padding:'12px 16px',
            background:'rgba(255,255,255,0.02)', borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:3 }}>Free during beta</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.55 }}>
              All features are free. No credit card, no trial.
              Supports all major A-Level subjects and exam boards.
            </div>
          </div>
        </div>

      </div>
    );
  }

  // Desktop layout — two columns
  return (
    <div style={{ minHeight:'100vh', background:C.bg,
      display:'flex', alignItems:'stretch', fontFamily:font }}>

      <div style={{ width:'100%', maxWidth:440, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'48px 40px',
        borderRight:`1px solid ${C.border}`, flexShrink:0 }}>

        <div style={{ marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:C.accent,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:mono, fontWeight:900, fontSize:13, color:'#fff' }}>A*</div>
            <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
          </div>
          <p style={{ fontSize:22, fontWeight:700, color:C.text, margin:0, lineHeight:1.3 }}>
            Your A-Level revision,<br />tracked properly.
          </p>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)',
            borderRadius:8, padding:'10px 14px', marginBottom:16,
            fontSize:13, color:'#fca5a5', lineHeight:1.5 }}>
            {error}
          </div>
        )}

        <button onClick={handleGoogle} disabled={loading}
          style={{ width:'100%', padding:'13px 0',
            background:'rgba(255,255,255,0.06)',
            border:`1px solid ${C.borderHover}`,
            borderRadius:8, cursor:loading?'not-allowed':'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            fontFamily:font, fontSize:15, color:C.text, fontWeight:600,
            transition:'background 0.15s' }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={{ marginTop:28, paddingTop:20, borderTop:`1px solid ${C.border}`, textAlign:'center' }}>
          <button onClick={()=>onAuth(null)}
            style={{ background:'none', border:'none', color:C.muted,
              fontSize:12, fontFamily:font, cursor:'pointer',
              textDecoration:'underline', textDecorationColor:'rgba(100,116,139,0.3)' }}>
            Continue without an account — data saved locally only
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'48px 56px',
        background:'linear-gradient(135deg, rgba(181,115,90,0.04) 0%, transparent 50%)' }}>
        <div style={{ maxWidth:440 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.muted,
            letterSpacing:0.5, marginBottom:16, textTransform:'uppercase' }}>
            UK and Wales A-Level
          </div>
          <h2 style={{ fontSize:24, fontWeight:700, color:C.text, margin:'0 0 8px', lineHeight:1.3 }}>
            Stop guessing how prepared you are.
          </h2>
          <p style={{ fontSize:15, color:C.muted, lineHeight:1.7, margin:'0 0 40px' }}>
            Battle Plan tracks every past paper you do, shows you where your marks are being dropped,
            and gives you a clear readiness score before each exam.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:4, height:4, borderRadius:'50%',
                  background:C.accent, flexShrink:0, marginTop:7 }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:3 }}>{f.title}</div>
                  <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:40, padding:'14px 18px',
            background:'rgba(255,255,255,0.025)', borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:4 }}>Free during beta</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
              All features are free right now. No credit card, no trial period.
              Supports all major A-Level subjects and exam boards, including WJEC/Eduqas.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
