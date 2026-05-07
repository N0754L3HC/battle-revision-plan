import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ── Helpers ────────────────────────────────────────────────────────────────

const GRADE_COLORS = { 'A*':'#00E676', A:'#69F0AE', B:'#FFD600', C:'#FF9100', D:'#FF6D00', E:'#FF3D00', U:'#444' };
const SUB_COLORS = {
  Maths:'#2979FF','Further Maths':'#E040FB',CS:'#00E676',
  Chemistry:'#FF4081',Physics:'#40C4FF',Economics:'#FFD600',
};

function grade(pct, subject) {
  const B = {
    Maths:{'A*':80,A:70,B:60,C:50,D:40,E:30},
    'Further Maths':{'A*':83,A:72,B:60,C:50,D:40,E:30},
    CS:{'A*':75,A:65,B:55,C:45,D:35,E:25},
    Chemistry:{'A*':80,A:70,B:60,C:50,D:40,E:30},
    Physics:{'A*':80,A:70,B:60,C:50,D:40,E:30},
    Economics:{'A*':75,A:65,B:55,C:45,D:35,E:25},
  };
  const b = B[subject] || {};
  for (const g of ['A*','A','B','C','D','E']) if (pct >= (b[g]||0)) return g;
  return 'U';
}

function readiness(scores, errors, checks) {
  const avg = scores.length ? scores.reduce((a,s)=>a+s.pct,0)/scores.length : 0;
  const t = Math.round((avg/100)*40)
    + Math.min(20, Math.round((scores.length/12)*20))
    + Math.max(0, 20 - errors.filter(e=>Date.now()-e.id<7*86400000).length*2)
    + Math.min(20, Math.round((Object.keys(checks).length/40)*20));
  return { t, label: t>=80?'BATTLE READY':t>=60?'ON TRACK':t>=40?'BUILDING':'JUST STARTED' };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
}

function timeSince(iso) {
  const s = (Date.now()-new Date(iso))/1000;
  if (s<60) return 'just now';
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  if (s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── Shared style atoms ─────────────────────────────────────────────────────

const mono = "'JetBrains Mono','SF Mono','Fira Code',monospace";

const pill = (color, dim=false) => ({
  display:'inline-block', background:`${color}${dim?'18':'22'}`,
  border:`1px solid ${color}${dim?'44':'66'}`, color: dim?`${color}99`:color,
  fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:4, letterSpacing:0.5,
});

const inputStyle = {
  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:6, padding:'10px 14px', color:'#ddd', fontSize:13,
  fontFamily:mono, outline:'none', width:'100%', boxSizing:'border-box',
};

// ── Blinking cursor ────────────────────────────────────────────────────────

function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(()=>{ const t=setInterval(()=>setOn(p=>!p),530); return ()=>clearInterval(t); },[]);
  return <span style={{color:'#FF3D00',opacity:on?1:0}}>█</span>;
}

// ── Gate screen (passphrase before Supabase login) ─────────────────────────

const GATE_PASS = import.meta.env.VITE_ADMIN_PASSPHRASE || '';

function GateScreen({ onPass }) {
  const [val, setVal]     = useState('');
  const [phase, setPhase] = useState('idle'); // idle | denied
  const inputRef = useRef(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const attempt = () => {
    if (val.trim() === GATE_PASS) { onPass(); return; }
    setPhase('denied');
    setVal('');
    setTimeout(()=>setPhase('idle'), 2000);
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#000', display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:mono, padding:16, position:'relative', overflow:'hidden',
    }}>
      <div style={{position:'fixed',top:'30%',left:'50%',transform:'translate(-50%,-50%)',
        width:600,height:300,borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(255,30,0,0.08) 0%,transparent 70%)',
        pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:360,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:9,letterSpacing:6,color:'#3a0000',marginBottom:12}}>
            ████████████████████████████████████████████████████
          </div>
          <div style={{fontSize:28,fontWeight:900,color:'#FF3D00',letterSpacing:8,marginBottom:4}}>
            GOD MODE
          </div>
          <div style={{fontSize:9,letterSpacing:3,color:'#4a0000',marginTop:2}}>
            A* BATTLE PLAN // RESTRICTED SYSTEM ACCESS
          </div>
          <div style={{fontSize:9,letterSpacing:6,color:'#3a0000',marginTop:12}}>
            ████████████████████████████████████████████████████
          </div>
        </div>

        <div style={{fontSize:11,color:'#550000',marginBottom:20,letterSpacing:1}}>
          {phase==='denied' ? '// ACCESS DENIED — WRONG PASSPHRASE' : <>// ENTER PASSPHRASE <Cursor/></>}
        </div>

        {phase==='denied' && (
          <div style={{background:'rgba(255,0,0,0.06)',border:'1px solid rgba(255,0,0,0.2)',
            borderRadius:6,padding:'12px 14px',marginBottom:16,fontSize:12,
            color:'#FF3D00',letterSpacing:1}}>
            ⛔ &nbsp;INVALID PASSPHRASE
          </div>
        )}

        <div style={{opacity:phase==='denied'?0.3:1,transition:'opacity 0.3s'}}>
          <div style={{fontSize:10,color:'#440000',letterSpacing:2,marginBottom:5}}>PASSPHRASE</div>
          <input
            ref={inputRef}
            style={{...inputStyle,marginBottom:20,borderColor:'rgba(255,61,0,0.2)',
              background:'rgba(255,61,0,0.04)'}}
            type="password"
            value={val}
            onChange={e=>setVal(e.target.value)}
            disabled={phase!=='idle'}
            onKeyDown={e=>e.key==='Enter'&&attempt()}
            autoComplete="off"
            placeholder="················"
          />
          <button
            onClick={attempt}
            disabled={phase!=='idle'}
            style={{width:'100%',padding:'12px',background:'rgba(255,61,0,0.1)',
              border:'1px solid rgba(255,61,0,0.3)',borderRadius:6,color:'#FF3D00',
              fontSize:12,fontWeight:700,fontFamily:mono,cursor:'pointer',letterSpacing:2}}>
            AUTHENTICATE →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login screen ───────────────────────────────────────────────────────────

function LoginScreen({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | checking | denied | ok

  const attempt = async () => {
    if (!email || !password) { setError('// fields cannot be empty'); return; }
    setLoading(true); setError(''); setPhase('checking');

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setLoading(false); setError(`// ${authErr.message}`); setPhase('idle'); return; }

    const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', data.user.id).single();

    if (!prof?.is_admin) {
      await supabase.auth.signOut();
      setLoading(false);
      setPhase('denied');
      setTimeout(()=>setPhase('idle'), 3000);
      return;
    }

    setPhase('ok');
    setTimeout(()=>onAuth(data.user, prof), 600);
  };

  const googleLogin = async () => {
    setLoading(true); setError('');
    const adminUrl = `${window.location.origin}/admin`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: adminUrl },
    });
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#000', display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:mono, padding:16, position:'relative', overflow:'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{position:'fixed',top:'30%',left:'50%',transform:'translate(-50%,-50%)',
        width:600,height:300,borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(255,30,0,0.08) 0%,transparent 70%)',
        pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:360,position:'relative',zIndex:1}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:9,letterSpacing:6,color:'#3a0000',marginBottom:12}}>
            ████████████████████████████████████████████████████
          </div>
          <div style={{fontSize:28,fontWeight:900,color:'#FF3D00',letterSpacing:8,marginBottom:4}}>
            GOD MODE
          </div>
          <div style={{fontSize:9,letterSpacing:3,color:'#4a0000',marginTop:2}}>
            A* BATTLE PLAN // RESTRICTED SYSTEM ACCESS
          </div>
          <div style={{fontSize:9,letterSpacing:6,color:'#3a0000',marginTop:12}}>
            ████████████████████████████████████████████████████
          </div>
        </div>

        {/* Terminal prompt */}
        <div style={{fontSize:11,color:'#550000',marginBottom:20,letterSpacing:1}}>
          {phase==='checking' ? '// VERIFYING CREDENTIALS...' :
           phase==='denied'  ? '// ACCESS DENIED — UNAUTHORIZED' :
           phase==='ok'      ? '// ACCESS GRANTED — LOADING...' :
           <>// ENTER CREDENTIALS <Cursor/></>}
        </div>

        {phase==='denied' && (
          <div style={{
            background:'rgba(255,0,0,0.06)', border:'1px solid rgba(255,0,0,0.2)',
            borderRadius:6, padding:'12px 14px', marginBottom:16, fontSize:12,
            color:'#FF3D00', letterSpacing:1,
          }}>
            ⛔ &nbsp;ADMINISTRATOR PRIVILEGES REQUIRED
          </div>
        )}

        {error && phase==='idle' && (
          <div style={{color:'#FF3D00',fontSize:12,marginBottom:14,letterSpacing:0.5}}>{error}</div>
        )}

        {/* Form */}
        <div style={{opacity: phase!=='idle'?0.4:1, transition:'opacity 0.3s'}}>
          <div style={{fontSize:10,color:'#440000',letterSpacing:2,marginBottom:5}}>EMAIL</div>
          <input
            style={{...inputStyle, marginBottom:12, borderColor:'rgba(255,61,0,0.2)',
              background:'rgba(255,61,0,0.04)'}}
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            disabled={phase!=='idle'}
            onKeyDown={e=>e.key==='Enter'&&attempt()}
            autoComplete="username"
          />
          <div style={{fontSize:10,color:'#440000',letterSpacing:2,marginBottom:5}}>PASSWORD</div>
          <input
            style={{...inputStyle, marginBottom:20, borderColor:'rgba(255,61,0,0.2)',
              background:'rgba(255,61,0,0.04)'}}
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            disabled={phase!=='idle'}
            onKeyDown={e=>e.key==='Enter'&&attempt()}
            autoComplete="current-password"
          />
          <button
            onClick={attempt}
            disabled={loading||phase!=='idle'}
            style={{
              width:'100%', background: phase!=='idle'?'#1a0000':'rgba(255,61,0,0.9)',
              border:`1px solid ${phase!=='idle'?'#3a0000':'rgba(255,61,0,0.7)'}`,
              color: phase!=='idle'?'#440000':'#fff',
              padding:'12px 0', borderRadius:6, cursor:phase!=='idle'?'not-allowed':'pointer',
              fontSize:12, fontWeight:800, fontFamily:mono, letterSpacing:3,
              transition:'all 0.2s',
            }}
          >
            {phase==='checking'?'VERIFYING...':phase==='ok'?'GRANTED':'ACCESS SYSTEM'}
          </button>

          <div style={{display:'flex',alignItems:'center',gap:10,margin:'16px 0'}}>
            <div style={{flex:1,height:1,background:'rgba(255,61,0,0.1)'}}/>
            <div style={{fontSize:9,color:'#440000',letterSpacing:2}}>OR</div>
            <div style={{flex:1,height:1,background:'rgba(255,61,0,0.1)'}}/>
          </div>

          <button
            onClick={googleLogin}
            disabled={loading||phase!=='idle'}
            style={{
              width:'100%', background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,61,0,0.2)',
              color:'#883322', padding:'11px 0', borderRadius:6,
              cursor:loading?'not-allowed':'pointer',
              fontSize:11, fontWeight:700, fontFamily:mono, letterSpacing:2,
              transition:'all 0.2s',
            }}
          >
            CONTINUE WITH GOOGLE
          </button>
        </div>

        <div style={{fontSize:10,color:'#220000',marginTop:24,textAlign:'center',letterSpacing:1}}>
          UNAUTHORIZED ACCESS IS PROHIBITED AND MONITORED
        </div>
      </div>
    </div>
  );
}

// ── User detail panel ──────────────────────────────────────────────────────

function UserDetail({ u, onClose, onToggleAdmin, onRefresh }) {
  const [tab, setTab] = useState('me');
  const [toggling, setToggling] = useState(false);

  const scores  = (u.scores  ||{})[tab]||[];
  const errors  = (u.errors  ||{})[tab]||[];
  const checks  = (u.checks  ||{})[tab]||{};
  const targets = (u.targets ||{})[tab]||{};
  const br = readiness(scores, errors, checks);
  const brColor = br.t>=80?'#00E676':br.t>=60?'#FFD600':br.t>=40?'#FF9100':'#FF3D00';

  const subjects = [...new Set(scores.map(s=>s.subject))];
  const bySubject = subjects.map(s=>{
    const ss=scores.filter(x=>x.subject===s);
    const avg=Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length);
    return {s, avg, g:grade(avg,s), n:ss.length, target:targets[s]};
  });

  const errorTypes = {};
  errors.forEach(e=>{errorTypes[e.type]=(errorTypes[e.type]||0)+1;});
  const topErr = Object.entries(errorTypes).sort((a,b)=>b[1]-a[1])[0];

  const handleToggle = async () => {
    setToggling(true);
    await onToggleAdmin(u);
    setToggling(false);
  };

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.92)',
      display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono,
    }}>
      {/* Header */}
      <div style={{
        background:'#080810',borderBottom:'1px solid rgba(255,61,0,0.15)',
        padding:'14px 24px',display:'flex',alignItems:'center',gap:16,flexShrink:0,
      }}>
        <button onClick={onClose} style={{
          background:'transparent',border:'1px solid rgba(255,255,255,0.08)',
          color:'#666',padding:'5px 12px',borderRadius:5,cursor:'pointer',
          fontSize:11,fontFamily:mono,
        }}>← BACK</button>

        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>
            {u.display_name||'—'} &nbsp;
            <span style={{fontSize:12,color:'#555',fontWeight:400}}>{u.email}</span>
          </div>
          <div style={{fontSize:10,color:'#444',marginTop:2,letterSpacing:0.5}}>
            JOINED {fmtDate(u.created_at)} &nbsp;·&nbsp;
            LAST ACTIVE {timeSince(u.lastActive)} &nbsp;·&nbsp;
            {u.tos_agreed_at?'ToS AGREED':'ToS NOT AGREED'}
          </div>
        </div>

        {/* Profile tabs */}
        <div style={{display:'flex',gap:4}}>
          {['me','friend'].map(p=>(
            <button key={p} onClick={()=>setTab(p)} style={{
              background:tab===p?'rgba(255,61,0,0.12)':'transparent',
              border:`1px solid ${tab===p?'rgba(255,61,0,0.35)':'rgba(255,255,255,0.07)'}`,
              color:tab===p?'#FF3D00':'#555',
              padding:'5px 12px',borderRadius:5,cursor:'pointer',
              fontSize:11,fontWeight:700,fontFamily:mono,
            }}>
              {p==='me'?'THEIR PLAN':'FRIEND PLAN'}
            </button>
          ))}
        </div>

        {/* Admin toggle */}
        <button onClick={handleToggle} disabled={toggling} style={{
          background:u.is_admin?'rgba(255,61,0,0.15)':'rgba(255,255,255,0.04)',
          border:`1px solid ${u.is_admin?'rgba(255,61,0,0.5)':'rgba(255,255,255,0.1)'}`,
          color:u.is_admin?'#FF3D00':'#555',
          padding:'5px 12px',borderRadius:5,cursor:'pointer',
          fontSize:11,fontWeight:800,fontFamily:mono,letterSpacing:1,
        }}>
          {toggling?'...':(u.is_admin?'REVOKE ADMIN':'GRANT ADMIN')}
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{overflowY:'auto',flex:1,padding:'24px',maxWidth:1000,width:'100%',margin:'0 auto'}}>

        {/* Readiness + quick stats */}
        <div style={{
          display:'grid',gridTemplateColumns:'180px 1fr',gap:12,marginBottom:16,
        }}>
          <div style={{
            background:'rgba(255,255,255,0.03)',border:`1px solid ${brColor}22`,
            borderRadius:8,padding:'16px 20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          }}>
            <div style={{fontSize:44,fontWeight:900,color:brColor,lineHeight:1}}>{br.t}</div>
            <div style={{fontSize:9,color:'#444',letterSpacing:2,marginTop:4}}>READINESS</div>
            <div style={{fontSize:11,color:brColor,fontWeight:700,marginTop:6}}>{br.label}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {[
              {v:scores.length,l:'PAPERS DONE',c:'#fff'},
              {v:errors.length,l:'ERRORS',c:errors.length>10?'#FF9100':'#fff'},
              {v:Object.keys(checks).length,l:'TOPICS TICKED',c:'#fff'},
              {v:scores.length?Math.round(scores.reduce((a,s)=>a+s.pct,0)/scores.length)+'%':'—',l:'AVG SCORE',c:'#fff'},
            ].map(({v,l,c})=>(
              <div key={l} style={{
                background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
                borderRadius:8,padding:'14px',display:'flex',flexDirection:'column',justifyContent:'center',
              }}>
                <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:9,color:'#444',letterSpacing:1.5,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Readiness bar */}
        <div style={{
          background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:8,padding:'14px 20px',marginBottom:16,
        }}>
          <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',width:`${br.t}%`,background:brColor,borderRadius:3,transition:'width 0.8s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#444'}}>
            <span>Score component: {Math.round((scores.length?scores.reduce((a,s)=>a+s.pct,0)/scores.length:0)/100*40)}/40</span>
            <span>Papers: {Math.min(20,Math.round((scores.length/12)*20))}/20</span>
            <span>Errors: {Math.max(0,20-errors.filter(e=>Date.now()-e.id<7*86400000).length*2)}/20</span>
            <span>Topics: {Math.min(20,Math.round((Object.keys(checks).length/40)*20))}/20</span>
          </div>
        </div>

        {/* Subject breakdown */}
        {bySubject.length>0&&(
          <div style={{
            background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:8,padding:'16px 20px',marginBottom:16,
          }}>
            <div style={{fontSize:9,letterSpacing:3,color:'#444',marginBottom:12}}>SUBJECT BREAKDOWN</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {bySubject.map(({s,avg,g,n,target})=>(
                <div key={s} style={{
                  background:'rgba(255,255,255,0.03)',
                  border:`1px solid ${SUB_COLORS[s]||'#888'}33`,
                  borderRadius:8,padding:'12px 16px',minWidth:150,flex:'1 1 150px',
                }}>
                  <div style={{fontSize:9,letterSpacing:2,color:'#555',marginBottom:6}}>
                    {s.toUpperCase()}
                  </div>
                  <div style={{fontSize:32,fontWeight:900,color:GRADE_COLORS[g]||'#555'}}>{g}</div>
                  <div style={{fontSize:12,color:'#888',marginTop:2}}>{avg}% avg · {n} paper{n!==1?'s':''}</div>
                  {target&&<div style={{fontSize:10,color:'#555',marginTop:4}}>Target: {target}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error pattern */}
        {topErr&&errors.length>=3&&(
          <div style={{
            background:'rgba(255,140,0,0.06)',border:'1px solid rgba(255,140,0,0.15)',
            borderRadius:8,padding:'12px 20px',marginBottom:16,fontSize:12,color:'#FF9100',
          }}>
            Recurring pattern: <strong>"{topErr[0]}"</strong> — {topErr[1]} times logged
          </div>
        )}

        {/* Papers table */}
        <div style={{
          background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:8,padding:'16px 20px',marginBottom:16,
        }}>
          <div style={{fontSize:9,letterSpacing:3,color:'#444',marginBottom:12}}>
            PAPERS ({scores.length})
          </div>
          {scores.length===0
            ? <div style={{color:'#333',fontSize:13}}>No papers logged.</div>
            : scores.slice(0,40).map((sc,i)=>(
              <div key={i} style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12,
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  <span style={pill(SUB_COLORS[sc.subject]||'#888')}>{sc.subject}</span>
                  <span style={{color:'#bbb',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {sc.paper}
                  </span>
                </div>
                <div style={{display:'flex',gap:14,alignItems:'center',flexShrink:0}}>
                  <span style={{color:'#444',fontSize:10}}>{sc.date}</span>
                  <span style={{color:'#666'}}>{sc.got}/{sc.max}</span>
                  <span style={{
                    fontWeight:800,color:GRADE_COLORS[grade(sc.pct,sc.subject)]||'#555',
                    minWidth:60,textAlign:'right',
                  }}>
                    {sc.pct}% · {grade(sc.pct,sc.subject)}
                  </span>
                </div>
              </div>
            ))}
          {scores.length>40&&(
            <div style={{fontSize:11,color:'#444',marginTop:8}}>
              + {scores.length-40} more
            </div>
          )}
        </div>

        {/* Error log */}
        <div style={{
          background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:8,padding:'16px 20px',marginBottom:16,
        }}>
          <div style={{fontSize:9,letterSpacing:3,color:'#444',marginBottom:12}}>
            ERROR LOG ({errors.length})
          </div>
          {errors.length===0
            ? <div style={{color:'#333',fontSize:13}}>No errors logged.</div>
            : errors.slice(0,25).map((e,i)=>(
              <div key={i} style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12,
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={pill(SUB_COLORS[e.subject]||'#888')}>{e.subject}</span>
                  <span style={{color:'#ccc'}}>{e.topic}</span>
                  {e.note&&<span style={{color:'#444',fontSize:11}}>— {e.note}</span>}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{color:'#444',fontSize:10}}>{e.date}</span>
                  <span style={pill('#FF9100',true)}>{e.type}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Checked topics */}
        {Object.keys(checks).length>0&&(
          <div style={{
            background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:8,padding:'16px 20px',
          }}>
            <div style={{fontSize:9,letterSpacing:3,color:'#444',marginBottom:12}}>
              CHECKED TOPICS ({Object.keys(checks).length})
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {Object.keys(checks).slice(0,80).map(k=>(
                <span key={k} style={pill('#00E676',true)}>{k}</span>
              ))}
              {Object.keys(checks).length>80&&(
                <span style={{color:'#333',fontSize:10}}>+{Object.keys(checks).length-80} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

function Dashboard({ adminUser, adminProfile, onLogout }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState({col:'created_at',dir:-1});
  const [selected, setSelected] = useState(null);
  const [hover, setHover]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tab, setTab]         = useState('users'); // users | analytics

  const loadData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('user_profiles').select('*').order('created_at',{ascending:false});
    const { data: userData }  = await supabase.from('user_data').select('*');
    if (!profiles) { setLoading(false); return; }

    const merged = profiles.map(p => {
      const rows = (userData||[]).filter(d=>d.user_id===p.id);
      const scores={}, errors={}, checks={}, targets={};
      rows.forEach(r=>{
        scores[r.profile]  = r.scores  ||[];
        errors[r.profile]  = r.errors  ||[];
        checks[r.profile]  = r.checks  ||{};
        targets[r.profile] = r.targets ||{};
      });
      const allS = Object.values(scores).flat();
      const allE = Object.values(errors).flat();
      const lastA = rows.length
        ? rows.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0].updated_at
        : p.created_at;
      const br = readiness(allS, allE, Object.values(checks).reduce((a,c)=>({...a,...c}),{}));
      let subjectList = [];
      if (p.subjects) { try { const ps = JSON.parse(p.subjects); if (Array.isArray(ps)) subjectList = ps.map(s=>s.subjectId||s.subject||''); } catch(_) {} }
      return {
        ...p, scores, errors, checks, targets, subjectList,
        totalScores:allS.length, totalErrors:allE.length,
        lastActive:lastA, readiness:br.t, readinessLabel:br.label,
      };
    });

    setUsers(merged);
    setLastRefresh(new Date());
    setLoading(false);
    if (selected) setSelected(merged.find(u=>u.id===selected.id)||null);
  };

  useEffect(()=>{ loadData(); },[]);

  const toggleAdmin = async (u) => {
    const next = !u.is_admin;
    await supabase.from('user_profiles').update({is_admin:next}).eq('id',u.id);
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_admin:next}:x));
    if (selected?.id===u.id) setSelected(prev=>({...prev,is_admin:next}));
  };

  const sortedFiltered = [...users]
    .filter(u=>!search||u.email?.toLowerCase().includes(search.toLowerCase())||
      u.display_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      const av=a[sort.col]??(sort.col==='readiness'?0:'');
      const bv=b[sort.col]??(sort.col==='readiness'?0:'');
      return sort.dir*(av<bv?-1:av>bv?1:0);
    });

  const cycleSort = (col) => setSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1});
  const sortArrow = (col) => sort.col===col?(sort.dir===-1?'↓':'↑'):'↕';

  const now = Date.now();
  const week = 7*24*60*60*1000;
  const totalPapers   = users.reduce((a,u)=>a+u.totalScores,0);
  const totalErrors   = users.reduce((a,u)=>a+u.totalErrors,0);
  const activeWeek    = users.filter(u=>now-new Date(u.lastActive)<week).length;
  const newThisWeek   = users.filter(u=>now-new Date(u.created_at)<week).length;
  const avgReadiness  = users.length?Math.round(users.reduce((a,u)=>a+u.readiness,0)/users.length):0;
  const activatedUsers = users.filter(u=>u.totalScores>0).length;
  const rColor = r => r>=80?'#00E676':r>=60?'#FFD600':r>=40?'#FF9100':'#FF3D00';

  // Subject popularity
  const subjectCounts = {};
  users.forEach(u=>(u.subjectList||[]).forEach(s=>{ if(s) subjectCounts[s]=(subjectCounts[s]||0)+1; }));
  const topSubjects = Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSubCount = topSubjects[0]?.[1]||1;

  // Readiness distribution
  const rdist = [
    {l:'Battle Ready',min:80,c:'#00E676'},
    {l:'On Track',min:60,c:'#FFD600'},
    {l:'Building',min:40,c:'#FF9100'},
    {l:'Just Started',min:0,c:'#FF3D00'},
  ];

  // CSV export
  const exportCSV = () => {
    const header = ['Email','Name','Joined','Last Active','Papers','Avg Score','Readiness','Errors','ToS','Admin'];
    const rows = users.map(u=>{
      const allS = Object.values(u.scores||{}).flat();
      const avg = allS.length ? Math.round(allS.reduce((a,s)=>a+s.pct,0)/allS.length) : '';
      return [
        u.email||'', u.display_name||'',
        new Date(u.created_at).toLocaleDateString('en-GB'),
        new Date(u.lastActive).toLocaleDateString('en-GB'),
        u.totalScores, avg, u.readiness, u.totalErrors,
        u.tos_agreed_at?'yes':'no', u.is_admin?'yes':'no',
      ].map(v=>JSON.stringify(v??'')).join(',');
    });
    const blob = new Blob([[header.join(','),...rows].join('\n')],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`battleplan-users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const STAT_CARDS = [
    {v:users.length,      l:'TOTAL USERS',      c:'#FF3D00'},
    {v:activeWeek,        l:'ACTIVE THIS WEEK',  c:activeWeek>0?'#00E676':'#555'},
    {v:newThisWeek,       l:'NEW THIS WEEK',     c:newThisWeek>0?'#FFD600':'#555'},
    {v:activatedUsers,    l:'ACTIVATED',         c:'#40C4FF'},
    {v:totalPapers,       l:'PAPERS LOGGED',     c:'#fff'},
    {v:totalErrors,       l:'ERRORS LOGGED',     c:'#FF9100'},
    {v:`${avgReadiness}`, l:'AVG READINESS',     c:rColor(avgReadiness)},
    {v:users.filter(u=>u.is_admin).length, l:'ADMINS', c:'#FF3D00'},
  ];

  return (
    <>
      {selected&&(
        <UserDetail
          u={selected}
          onClose={()=>setSelected(null)}
          onToggleAdmin={toggleAdmin}
          onRefresh={loadData}
        />
      )}

      <div style={{minHeight:'100vh',background:'#000',color:'#E0E0E5',fontFamily:mono}}>
        {/* Top bar */}
        <div style={{
          position:'sticky',top:0,zIndex:50,
          background:'rgba(0,0,0,0.97)',backdropFilter:'blur(16px)',
          borderBottom:'1px solid rgba(255,61,0,0.12)',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 24px',height:52,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:15,fontWeight:900,color:'#FF3D00',letterSpacing:4}}>GOD MODE</span>
            <span style={{background:'rgba(255,61,0,0.1)',border:'1px solid rgba(255,61,0,0.3)',color:'#FF3D00',fontSize:9,fontWeight:800,letterSpacing:2,padding:'2px 8px',borderRadius:3}}>BETA</span>
            <div style={{display:'flex',gap:2,marginLeft:8}}>
              {['users','analytics'].map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  background:tab===t?'rgba(255,61,0,0.12)':'transparent',
                  border:`1px solid ${tab===t?'rgba(255,61,0,0.3)':'transparent'}`,
                  color:tab===t?'#FF3D00':'#444',padding:'4px 10px',borderRadius:4,
                  cursor:'pointer',fontSize:10,fontFamily:mono,letterSpacing:1,fontWeight:700,
                }}>{t.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {lastRefresh&&<span style={{fontSize:10,color:'#333'}}>↺ {timeSince(lastRefresh)}</span>}
            <button onClick={loadData} disabled={loading} style={{background:'transparent',border:'1px solid rgba(255,255,255,0.07)',color:'#444',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:10,fontFamily:mono}}>
              {loading?'…':'REFRESH'}
            </button>
            <button onClick={exportCSV} style={{background:'rgba(0,230,118,0.07)',border:'1px solid rgba(0,230,118,0.2)',color:'#00E676',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:10,fontFamily:mono,letterSpacing:1}}>
              ↓ CSV
            </button>
            <span style={{fontSize:10,color:'#333'}}>{adminProfile?.email||adminUser?.email||'admin'}</span>
            <button onClick={onLogout} style={{background:'rgba(255,0,0,0.07)',border:'1px solid rgba(255,0,0,0.18)',color:'#550000',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:10,fontFamily:mono}}>
              LOGOUT
            </button>
          </div>
        </div>

        <div style={{maxWidth:1240,margin:'0 auto',padding:'24px 24px 60px'}}>

          {/* Stat cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
            {STAT_CARDS.map(({v,l,c})=>(
              <div key={l} style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:8,padding:'14px 18px'}}>
                <div style={{fontSize:28,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:9,color:'#444',letterSpacing:2,marginTop:5}}>{l}</div>
              </div>
            ))}
          </div>

          {tab==='analytics'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {/* Subject popularity */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'18px 20px'}}>
                <div style={{fontSize:9,letterSpacing:3,color:'#440000',marginBottom:14}}>SUBJECT POPULARITY</div>
                {topSubjects.length===0
                  ? <div style={{color:'#333',fontSize:12}}>No subject data yet.</div>
                  : topSubjects.map(([s,n])=>(
                    <div key={s} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#888',marginBottom:3}}>
                        <span style={{textTransform:'capitalize'}}>{s.replace(/-/g,' ')}</span>
                        <span style={{color:'#FF3D00'}}>{n} user{n!==1?'s':''}</span>
                      </div>
                      <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${(n/maxSubCount)*100}%`,background:'#FF3D00',borderRadius:2,opacity:0.7}}/>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Readiness distribution */}
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'18px 20px'}}>
                <div style={{fontSize:9,letterSpacing:3,color:'#440000',marginBottom:14}}>READINESS DISTRIBUTION</div>
                {rdist.map(({l,min,c},i)=>{
                  const next = rdist[i-1]?.min??101;
                  const count = users.filter(u=>u.readiness>=min&&u.readiness<next).length;
                  const pct = users.length?Math.round((count/users.length)*100):0;
                  return (
                    <div key={l} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#666',marginBottom:3}}>
                        <span style={{color:c,fontWeight:700}}>{l}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.05)',fontSize:10,color:'#333'}}>
                  Activation rate: <span style={{color:'#fff',fontWeight:700}}>{users.length?Math.round((activatedUsers/users.length)*100):0}%</span>
                  &nbsp;· Avg papers/user: <span style={{color:'#fff',fontWeight:700}}>{users.length?Math.round(totalPapers/users.length):0}</span>
                </div>
              </div>
            </div>
          )}

          {tab==='users'&&(
            <>
              {/* Search */}
              <input
                style={{...inputStyle,marginBottom:10,borderColor:'rgba(255,61,0,0.15)',background:'rgba(255,61,0,0.03)'}}
                placeholder="// search by email or name..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />

              {loading?(
                <div style={{color:'#330000',fontSize:13,padding:32,textAlign:'center',letterSpacing:2}}>
                  // LOADING USER DATA...
                </div>
              ):(
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid rgba(255,61,0,0.1)'}}>
                        {[
                          {k:'email',l:'USER'},
                          {k:'created_at',l:'JOINED'},
                          {k:'lastActive',l:'LAST ACTIVE'},
                          {k:'totalScores',l:'PAPERS'},
                          {k:'readiness',l:'READINESS'},
                          {k:'tos_agreed_at',l:'ToS'},
                          {k:'is_admin',l:'ROLE'},
                        ].map(({k,l})=>(
                          <th key={k} onClick={()=>cycleSort(k)} style={{textAlign:'left',padding:'10px 16px',fontSize:9,color:'#440000',letterSpacing:2,fontWeight:700,cursor:'pointer',userSelect:'none'}}>
                            {l} <span style={{opacity:0.5}}>{sortArrow(k)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFiltered.length===0&&(
                        <tr><td colSpan={7} style={{padding:'24px 16px',color:'#333',fontSize:12,textAlign:'center'}}>No users found.</td></tr>
                      )}
                      {sortedFiltered.map(u=>(
                        <tr key={u.id}
                          onClick={()=>setSelected(u)}
                          onMouseEnter={()=>setHover(u.id)}
                          onMouseLeave={()=>setHover(null)}
                          style={{background:hover===u.id?'rgba(255,61,0,0.04)':'transparent',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.03)',transition:'background 0.1s'}}
                        >
                          <td style={{padding:'11px 16px'}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#ddd'}}>{u.display_name||<span style={{color:'#444'}}>—</span>}</div>
                            <div style={{fontSize:10,color:'#444',marginTop:1}}>{u.email}</div>
                            {u.subjectList?.length>0&&(
                              <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:4}}>
                                {u.subjectList.slice(0,4).map(s=>(
                                  <span key={s} style={{fontSize:8,color:'#FF3D00',background:'rgba(255,61,0,0.08)',border:'1px solid rgba(255,61,0,0.2)',padding:'1px 5px',borderRadius:3,textTransform:'capitalize'}}>{s.replace(/-/g,' ')}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{padding:'11px 16px',fontSize:11,color:'#444'}}>{fmtDate(u.created_at)}</td>
                          <td style={{padding:'11px 16px',fontSize:11,color:'#444'}}>{timeSince(u.lastActive)}</td>
                          <td style={{padding:'11px 16px',fontSize:14,fontWeight:800,color:'#fff'}}>{u.totalScores}</td>
                          <td style={{padding:'11px 16px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:48,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:`${u.readiness}%`,height:'100%',background:rColor(u.readiness),borderRadius:2}}/>
                              </div>
                              <span style={{fontSize:11,color:rColor(u.readiness),fontWeight:700}}>{u.readiness}</span>
                            </div>
                          </td>
                          <td style={{padding:'11px 16px'}}>
                            {u.tos_agreed_at?<span style={pill('#00E676',true)}>AGREED</span>:<span style={pill('#FF3D00',true)}>PENDING</span>}
                          </td>
                          <td style={{padding:'11px 16px'}}>
                            {u.is_admin?<span style={pill('#FF3D00')}>ADMIN</span>:<span style={pill('#444',true)}>USER</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div style={{fontSize:10,color:'#150000',marginTop:20,textAlign:'center',letterSpacing:1.5}}>
            // A* BATTLE PLAN ADMIN — RESTRICTED ACCESS — ALL ACTIONS MONITORED //
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const [phase, setPhase] = useState('init'); // init | login | authed
  const [adminUser, setAdminUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(()=>{
    let alive = true;

    async function checkAdmin(session) {
      if (!session?.user) { if (alive) setPhase('login'); return; }
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
      if (!alive) return;
      if (prof?.is_admin) {
        setAdminUser(session.user);
        setAdminProfile(prof);
        setPhase('authed');
      } else {
        await supabase.auth.signOut();
        setPhase('login');
      }
    }

    supabase.auth.getSession().then(({data:{session}}) => checkAdmin(session));

    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') checkAdmin(session);
      else if (event === 'SIGNED_OUT') {
        if (alive) { setAdminUser(null); setAdminProfile(null); setPhase('login'); }
      }
    });

    return () => { alive = false; subscription.unsubscribe(); };
  },[]);

  const handleAuth = (user, prof) => {
    setAdminUser(user);
    setAdminProfile(prof);
    setPhase('authed');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
    setAdminProfile(null);
    setPhase('login');
  };

  if (phase==='init') return (
    <div style={{
      minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',
      justifyContent:'center',fontFamily:mono,color:'#330000',fontSize:12,letterSpacing:2,
    }}>
      // INITIALISING...
    </div>
  );

  if (phase==='login') return <LoginScreen onAuth={handleAuth}/>;

  return (
    <Dashboard
      adminUser={adminUser}
      adminProfile={adminProfile}
      onLogout={handleLogout}
    />
  );
}
