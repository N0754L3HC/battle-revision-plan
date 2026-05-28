import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', 'SF Mono', monospace";

const C = {
  bg:           '#0d0f14',
  surface:      '#13161e',
  surface2:     '#1a1e28',
  border:       'rgba(255,255,255,0.07)',
  borderHover:  'rgba(255,255,255,0.14)',
  text:         '#e8eaf0',
  muted:        '#6b7280',
  subtle:       '#4b5563',
  accent:       '#b5735a',
  accentBg:     'rgba(181,115,90,0.08)',
  accentBorder: 'rgba(181,115,90,0.22)',
  green:        '#22c55e',
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
  { value: '2,000+', label: 'students using it' },
  { value: '15+', label: 'subjects supported' },
  { value: 'Free', label: 'no credit card' },
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
        <div style={{ padding:'52px 24px 28px', flex:'0 0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:C.accent,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:mono, fontWeight:900, fontSize:13, color:'#fff' }}>A*</div>
            <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px',
            borderRadius:20, background:C.accentBg, border:`1px solid ${C.accentBorder}`,
            fontSize:11, fontWeight:600, color:C.accent, marginBottom:16, letterSpacing:0.3 }}>
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
            <GoogleIcon/>
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ marginTop:14, textAlign:'center' }}>
            <button onClick={()=>onAuth(null)}
              style={{ background:'none', border:'none', color:C.muted,
                fontSize:12, fontFamily:font, cursor:'pointer',
                textDecoration:'underline', textDecorationColor:'rgba(100,116,139,0.3)' }}>
              Continue without an account
            </button>
          </div>
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
          <div style={{ width:30, height:30, borderRadius:8, background:C.accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:mono, fontWeight:900, fontSize:13, color:'#fff' }}>A*</div>
          <span style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
        </div>

        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px',
          borderRadius:20, background:C.accentBg, border:`1px solid ${C.accentBorder}`,
          fontSize:11, fontWeight:600, color:C.accent, marginBottom:18, letterSpacing:0.3,
          alignSelf:'flex-start' }}>
          A-Levels &amp; GCSEs
        </div>

        <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:'0 0 10px', lineHeight:1.25, letterSpacing:'-0.01em' }}>
          Your revision,<br/>tracked properly.
        </h1>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.7, margin:'0 0 32px' }}>
          Know your real grade, spot the patterns in your mistakes, and prepare with confidence.
        </p>

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
            borderRadius:10, cursor:loading?'not-allowed':'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            fontFamily:font, fontSize:15, color:C.text, fontWeight:600,
            transition:'background 0.15s' }}>
          <GoogleIcon/>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

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

        <div style={{ marginTop:20, textAlign:'center' }}>
          <button onClick={()=>onAuth(null)}
            style={{ background:'none', border:'none', color:C.subtle,
              fontSize:12, fontFamily:font, cursor:'pointer',
              textDecoration:'underline', textDecorationColor:'rgba(100,116,139,0.2)' }}>
            Continue without an account — data saved locally only
          </button>
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
