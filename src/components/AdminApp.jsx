import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import CapsMark from './CapsMark';
import { EXAM_SCHEDULE } from '../App';

// ── Constants ──────────────────────────────────────────────────────────────
// Admin status is enforced server-side via user_profiles.is_admin (set via SQL).
// This list is informational only — used in the access-denied screen.
const ADMIN_EMAILS = ['51r4h100@gmail.com'];
// ── Design tokens — the SAME theme as the student app (T.dark + terracotta) ──
const FONT  = "'Inter','SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const mono  = FONT;              // legacy name kept; resolves to the app's Inter
const numF  = "'SF Mono','JetBrains Mono',ui-monospace,monospace"; // tabular figures only
const BG     = '#1d1916';        // T.dark.bg (warm, synced to prototype)
const PANEL  = '#272220';        // T.dark.surface
const PANEL2 = '#2f2925';        // nested / hover
const BORDER = '#39312b';
const ACCENT = '#cf8568';        // T.dark.accent — terracotta
const ACCENT_SOFT = 'rgba(207,133,104,0.15)';
const TXT    = '#f3ede3';        // T.dark.text
const TXT2   = '#b3a99c';        // T.dark.muted
const OK = '#4ade80', WARN = '#fbbf24', BAD = '#f87171';
const GC = { 'A*':'#22c55e', A:'#4ade80', B:'#eab308', C:'#f59e0b', D:'#f97316', E:'#ef4444', U:'#64748b' };
const SC = { maths:'#3b82f6','further-maths':'#a855f7',cs:'#10b981',chemistry:'#ec4899',physics:'#38bdf8',economics:'#eab308',biology:'#84cc16',history:'#fb923c',psychology:'#a78bfa',geography:'#22d3ee' };
const GRADE_BOUNDS = { Maths:{'A*':80,A:70,B:60,C:50,D:40,E:30},'Further Maths':{'A*':83,A:72,B:60,C:50,D:40,E:30},CS:{'A*':75,A:65,B:55,C:45,D:35,E:25},Chemistry:{'A*':80,A:70,B:60,C:50,D:40,E:30},Physics:{'A*':80,A:70,B:60,C:50,D:40,E:30},Economics:{'A*':75,A:65,B:55,C:45,D:35,E:25} };
const R = (r) => r>=80?'#22c55e':r>=60?'#eab308':r>=40?'#f59e0b':'#ef4444';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const timeSince = ts => {
  if (!ts) return '—';
  const s=(Date.now()-new Date(ts))/1000;
  if (s<60) return 'just now'; if (s<3600) return `${Math.floor(s/60)}m ago`;
  if (s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
};
const pill = (color,dim=false) => ({
  display:'inline-block',background:`${color}${dim?'18':'22'}`,border:`1px solid ${color}${dim?'44':'66'}`,
  color:dim?`${color}99`:color,fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:4,letterSpacing:0.5,
});
function calcReadiness(scores=[],errors=[]) {
  const avg=scores.length?scores.reduce((a,s)=>a+s.pct,0)/scores.length:0;
  const t=Math.round((avg/100)*40)+Math.min(20,Math.round((scores.length/12)*20))+Math.max(0,20-errors.filter(e=>Date.now()-(e.ts||e.id||0)<7*86400000).length*2);
  return {t:Math.min(t,80),avg:Math.round(avg)};
}
function gradeFromPct(pct,subject='') {
  const b=GRADE_BOUNDS[subject]||{};
  for (const g of ['A*','A','B','C','D','E']) if (pct>=(b[g]||0)) return g;
  return 'U';
}

// ── Shared input style ─────────────────────────────────────────────────────
const iS = {background:'#0f1218',border:`1px solid ${BORDER}`,borderRadius:8,padding:'9px 12px',color:TXT,fontSize:13,fontFamily:FONT,outline:'none',width:'100%',boxSizing:'border-box'};
// De-boxed: borderless panels (PANEL is lighter than BG, so they read without a border).
const card = {background:PANEL,borderRadius:12};
const TINTS = ['#322c23','#243029','#222e38']; // cream/sage/sky on warm dark (prototype)
const btn = (col=ACCENT,fill=false) => ({background:fill?col:'transparent',border:`1px solid ${fill?col:BORDER}`,color:fill?'#fff':col,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:FONT,letterSpacing:0,transition:'all 0.15s'});
// warm greys — match the student theme
const DIM = '#6f6862';   // timestamps, ranks, footnotes
const MUT = '#9b938b';   // secondary labels, sub-text
const SEC = '#9b938b';   // section header labels

// ── Cursor ─────────────────────────────────────────────────────────────────
function Cursor() {
  const [on,setOn]=useState(true);
  useEffect(()=>{ const t=setInterval(()=>setOn(p=>!p),530); return ()=>clearInterval(t); },[]);
  return <span style={{color:'#FF3D00',opacity:on?1:0}}>█</span>;
}

// ── Mini sparkline ─────────────────────────────────────────────────────────
function Spark({scores,color='#FF3D00',w=80,h=24}) {
  if (scores.length<2) return <span style={{color:DIM,fontSize:10}}>—</span>;
  const pts=scores.slice(-12);
  const min=Math.min(...pts.map(s=>s.pct)),max=Math.max(...pts.map(s=>s.pct));
  const range=max-min||1;
  const xs=pts.map((_,i)=>((i/(pts.length-1))*w).toFixed(1));
  const ys=pts.map(s=>(h-((s.pct-min)/range)*(h-4)-2).toFixed(1));
  const d=xs.map((x,i)=>`${i===0?'M':'L'}${x},${ys[i]}`).join(' ');
  return (
    <svg width={w} height={h} style={{overflow:'visible'}}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
    </svg>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({onAuth}) {
  const [email,setEmail]=useState('');
  const [pw,setPw]=useState('');
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const [status,setStatus]=useState('idle');

  const attempt=async()=>{
    if (!email||!pw) { setErr('Fields cannot be empty'); return; }
    setLoading(true); setErr(''); setStatus('checking');
    const {data,error:aE}=await supabase.auth.signInWithPassword({email,password:pw});
    if (aE) { setLoading(false); setErr(aE.message); setStatus('idle'); return; }
    const {data:prof}=await supabase.from('user_profiles').select('*').eq('id',data.user.id).single();
    const isAdmin=prof?.is_admin===true;
    if (!isAdmin) { await supabase.auth.signOut(); setLoading(false); setStatus('denied'); setTimeout(()=>setStatus('idle'),3000); return; }
    setStatus('ok');
    setTimeout(()=>onAuth(data.user,{...prof,is_admin:true}),600);
  };

  const googleLogin=async()=>{
    setLoading(true); setErr('');
    sessionStorage.setItem('rbp_goto_admin','1');
    await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
  };

  return (
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT,padding:16}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{marginBottom:28}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
            <CapsMark size={36}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:TXT,letterSpacing:'-0.01em'}}>Battle Plan</div>
              <div style={{fontSize:11,color:MUT}}>Admin Console</div>
            </div>
          </div>
          <div style={{fontSize:20,fontWeight:700,color:TXT,letterSpacing:'-0.02em'}}>Sign in</div>
          <div style={{fontSize:13,color:MUT,marginTop:4}}>
            {status==='checking'?'Verifying your credentials…':status==='ok'?'Verified — loading console…':'Administrator access only.'}
          </div>
        </div>
        {status==='denied'&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'11px 14px',marginBottom:14,fontSize:13,color:BAD}}>Administrator privileges required for this account.</div>}
        {err&&status==='idle'&&<div style={{color:BAD,fontSize:13,marginBottom:12}}>{err}</div>}
        <div style={{opacity:status!=='idle'?0.4:1,transition:'opacity 0.3s',pointerEvents:status!=='idle'?'none':'auto'}}>
          <label style={{fontSize:12,fontWeight:600,color:TXT2,display:'block',marginBottom:6}}>Email</label>
          <input style={{...iS,marginBottom:14}} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} autoComplete="username" placeholder="you@company.com"/>
          <label style={{fontSize:12,fontWeight:600,color:TXT2,display:'block',marginBottom:6}}>Password</label>
          <input style={{...iS,marginBottom:20}} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} autoComplete="current-password" placeholder="••••••••••••"/>
          <button onClick={attempt} disabled={loading} style={{width:'100%',padding:'11px',background:ACCENT,border:'none',borderRadius:8,color:'#fff',fontSize:14,fontWeight:600,fontFamily:FONT,cursor:'pointer'}}>
            {status==='checking'?'Verifying…':status==='ok'?'Signed in':'Sign in'}
          </button>
          <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0'}}>
            <div style={{flex:1,height:1,background:BORDER}}/><div style={{fontSize:12,color:DIM}}>or</div><div style={{flex:1,height:1,background:BORDER}}/>
          </div>
          <button onClick={googleLogin} disabled={loading} style={{width:'100%',padding:'10px',background:'transparent',border:`1px solid ${BORDER}`,borderRadius:8,color:TXT,fontSize:13,fontWeight:600,fontFamily:FONT,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 19.07 12H12v4h7.93A8 8 0 1 1 12 4a7.93 7.93 0 0 1 5.4 2.1L14.93 8.6A4.5 4.5 0 0 0 12 7.5a4.49 4.49 0 0 0-4.24 3L5.27 9.76Z"/></svg>
            Continue with Google
          </button>
        </div>
        <div style={{fontSize:11,color:DIM,marginTop:26,textAlign:'center'}}>Access is restricted and all actions are logged.</div>
      </div>
    </div>
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────
function UserDetail({u,onClose,onToggleAdmin,onTogglePro,onDeleteUser}) {
  const [toggling,setToggling]=useState(false);
  const [togglingPro,setTogglingPro]=useState(false);
  const [confirmDel,setConfirmDel]=useState(false);
  const allScores=Object.values(u.scores||{}).flat();
  const allErrors=Object.values(u.errors||{}).flat();
  const br=calcReadiness(allScores,allErrors);
  const subjects=[...new Set(allScores.map(s=>s.subject))];
  const bySubject=subjects.map(sub=>{
    const ss=allScores.filter(x=>x.subject===sub);
    const avg=Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length);
    return {sub,avg,g:gradeFromPct(avg,sub),n:ss.length};
  });
  const errTypes={};
  allErrors.forEach(e=>{errTypes[e.type]=(errTypes[e.type]||0)+1;});

  // Pro status — Stripe-paid OR admin-granted (referral_pro_until in future)
  const proViaStripe = ['active','trialing'].includes(u.subscription_status);
  const proViaGrant  = u.referral_pro_until && new Date(u.referral_pro_until).getTime() > Date.now();
  const isPro        = proViaStripe || proViaGrant;

  const doToggle=async()=>{ setToggling(true); await onToggleAdmin(u); setToggling(false); };
  const doTogglePro=async()=>{
    if (proViaStripe) {
      alert('This user has an active Stripe subscription. Cancel via Stripe dashboard instead of revoking the admin grant.');
      return;
    }
    setTogglingPro(true); await onTogglePro(u, proViaGrant ? 0 : 365); setTogglingPro(false);
  };
  const doDelete=async()=>{ await onDeleteUser(u); onClose(); };

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.95)',display:'flex',flexDirection:'column',fontFamily:mono}}>
      {/* Top bar */}
      <div style={{background:'#080810',borderBottom:'1px solid rgba(255,61,0,0.12)',padding:'12px 24px',display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
        <button onClick={onClose} style={btn()}>← BACK</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{u.display_name||<span style={{color:MUT}}>No name</span>} <span style={{fontSize:11,color:MUT,fontWeight:400}}>{u.email}</span></div>
          <div style={{fontSize:10,color:DIM,marginTop:2}}>JOINED {fmtDate(u.created_at)} · LAST ACTIVE {timeSince(u.lastActive)} · {u.tos_agreed_at?'ToS ✓':'ToS pending'}</div>
        </div>
        <button onClick={doTogglePro} disabled={togglingPro} title={proViaStripe?'Stripe-paid Pro — manage in Stripe dashboard':isPro?'Pro until '+new Date(u.referral_pro_until).toLocaleDateString('en-GB'):'Grants 365 days of Pro'} style={btn(isPro?'#FFD600':'#555')}>
          {togglingPro?'...':(proViaStripe?'PRO (STRIPE)':proViaGrant?'REVOKE PRO':'GRANT PRO')}
        </button>
        <button onClick={doToggle} disabled={toggling} style={btn(u.is_admin?'#FF3D00':'#555')}>
          {toggling?'...':(u.is_admin?'REVOKE ADMIN':'GRANT ADMIN')}
        </button>
        {confirmDel
          ? <><button onClick={doDelete} style={btn('#FF3D00',true)}>CONFIRM DELETE</button><button onClick={()=>setConfirmDel(false)} style={btn()}>CANCEL</button></>
          : <button onClick={()=>setConfirmDel(true)} style={btn('#FF3D00')}>DELETE USER</button>}
      </div>
      <div style={{overflowY:'auto',flex:1,padding:24,maxWidth:1000,width:'100%',margin:'0 auto'}}>
        {/* Readiness + stats */}
        <div style={{display:'grid',gridTemplateColumns:'160px 1fr',gap:10,marginBottom:12}}>
          <div style={{...card,padding:'16px 20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderColor:`${R(br.t)}22`}}>
            <div style={{fontSize:48,fontWeight:900,color:R(br.t),lineHeight:1}}>{br.t}</div>
            <div style={{fontSize:9,color:MUT,letterSpacing:2,marginTop:3}}>READINESS</div>
            <div style={{height:3,width:'80%',background:'rgba(255,255,255,0.05)',borderRadius:2,marginTop:8,overflow:'hidden'}}><div style={{height:'100%',width:`${br.t}%`,background:R(br.t)}}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
            {[
              {v:allScores.length,l:'PAPERS',c:'#fff'},
              {v:allErrors.length,l:'ERRORS',c:allErrors.length>10?'#FF9100':'#fff'},
              {v:`${br.avg}%`,l:'AVG SCORE',c:br.avg>=70?'#00E676':br.avg>=50?'#FFD600':'#FF3D00'},
              {v:u.subjectList?.length||0,l:'SUBJECTS',c:'#40C4FF'},
              {v:`${Math.round((u.totalStudySecs||0)/3600)}h`,l:'STUDY TIME',c:'#00E676'},
            ].map(({v,l,c})=>(
              <div key={l} style={{...card,padding:'14px 16px'}}>
                <div style={{fontSize:22,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:9,color:MUT,letterSpacing:1.5,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Subject breakdown */}
        {bySubject.length>0&&(
          <div style={{...card,padding:'16px 20px',marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>SUBJECT BREAKDOWN</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {bySubject.map(({sub,avg,g,n})=>(
                <div key={sub} style={{...card,padding:'12px 16px',minWidth:140,flex:'1 1 140px',borderColor:`${SC[sub]||MUT}33`}}>
                  <div style={{fontSize:9,letterSpacing:2,color:MUT,marginBottom:6,textTransform:'uppercase'}}>{sub.replace(/-/g,' ')}</div>
                  <div style={{fontSize:32,fontWeight:900,color:GC[g]||'#555'}}>{g}</div>
                  <div style={{fontSize:11,color:'#777',marginTop:2}}>{avg}% · {n} paper{n!==1?'s':''}</div>
                  <Spark scores={allScores.filter(s=>s.subject===sub)} color={SC[sub]||MUT} w={80} h={20}/>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Error types */}
        {Object.keys(errTypes).length>0&&(
          <div style={{...card,padding:'14px 20px',marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:10}}>ERROR PATTERN</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(errTypes).sort((a,b)=>b[1]-a[1]).map(([t,n])=>(
                <div key={t} style={{...card,padding:'8px 14px',display:'flex',gap:8,alignItems:'center'}}>
                  <span style={pill('#FF9100',true)}>{t}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#FF9100'}}>{n}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Papers table */}
        <div style={{...card,padding:'16px 20px',marginBottom:12}}>
          <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>PAPERS ({allScores.length})</div>
          {allScores.length===0?<div style={{color:DIM,fontSize:12}}>No papers logged.</div>:allScores.slice(0,30).map((sc,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                <span style={pill(SC[sc.subject]||MUT)}>{sc.subject}</span>
                <span style={{color:MUT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sc.paper}</span>
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                <span style={{color:MUT,fontSize:10}}>{sc.date}</span>
                <span style={{color:MUT}}>{sc.got}/{sc.max??sc.maxMark??100}</span>
                <span style={{fontWeight:800,color:GC[gradeFromPct(sc.pct,sc.subject)]}}>{sc.pct}%</span>
              </div>
            </div>
          ))}
          {allScores.length>30&&<div style={{fontSize:11,color:DIM,marginTop:8}}>+ {allScores.length-30} more</div>}
        </div>
        {/* Errors */}
        <div style={{...card,padding:'16px 20px',marginBottom:12}}>
          <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>ERROR LOG ({allErrors.length})</div>
          {allErrors.length===0?<div style={{color:DIM,fontSize:12}}>No errors logged.</div>:allErrors.slice(0,20).map((e,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={pill(SC[e.subject]||MUT,true)}>{e.subject||'?'}</span>
                <span style={{color:TXT}}>{e.topic}</span>
                {e.note&&<span style={{color:MUT,fontSize:11}}>— {e.note}</span>}
              </div>
              <span style={pill('#FF9100',true)}>{e.type}</span>
            </div>
          ))}
        </div>
        {/* Study sessions */}
        {(()=>{
          const allSess=Object.values(u.sessions||{}).flat();
          if (!allSess.length) return null;
          const totalSecs=allSess.reduce((a,s)=>a+(s.secs||0),0);
          const bySubj={};
          allSess.forEach(s=>{ const k=s.subjectId||'unknown'; bySubj[k]=(bySubj[k]||0)+(s.secs||0); });
          const recent=allSess.sort((a,b)=>(b.ts||b.id||0)-(a.ts||a.id||0)).slice(0,10);
          return (
            <div style={{...card,padding:'16px 20px',marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>STUDY SESSIONS ({allSess.length} · {Math.round(totalSecs/3600)}h total)</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                {Object.entries(bySubj).sort((a,b)=>b[1]-a[1]).map(([sub,secs])=>(
                  <div key={sub} style={{...card,padding:'8px 12px',borderColor:`${SC[sub]||MUT}33`}}>
                    <div style={{fontSize:9,color:MUT,textTransform:'uppercase'}}>{sub.replace(/-/g,' ')}</div>
                    <div style={{fontSize:16,fontWeight:800,color:SC[sub]||MUT,marginTop:2}}>{Math.round(secs/3600)}h {Math.round((secs%3600)/60)}m</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:9,letterSpacing:2,color:DIM,marginBottom:8}}>RECENT SESSIONS</div>
              {recent.map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <span style={pill(SC[s.subjectId]||MUT,true)}>{(s.subjectId||'?').replace(/-/g,' ')}</span>
                  <span style={{color:'#bbb'}}>{Math.round((s.secs||0)/60)}m</span>
                  <span style={{color:DIM}}>{s.ts?timeSince(new Date(s.ts)):s.id?timeSince(new Date(s.id)):'—'}</span>
                </div>
              ))}
            </div>
          );
        })()}
        {/* User metadata */}
        <div style={{...card,padding:'16px 20px'}}>
          <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>USER METADATA</div>
          {[
            ['Exam level',    u.exam_level||'—'],
            ['School',        u.school_name||'—'],
            ['School opt-in', u.school_opt_in?'Yes':'No'],
            ['Referral code', u.referral_code||'—'],
            ['Subscription',  u.subscription_status||'free'],
            ['Pro grant until', u.referral_pro_until?fmtDate(u.referral_pro_until):'—'],
            ['Subjects',      (u.subjectList||[]).join(', ')||'—'],
          ].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <span style={{color:MUT,fontSize:11}}>{l}</span>
              <span style={{color:TXT,maxWidth:320,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Broadcast Panel ────────────────────────────────────────────────────────
function BroadcastPanel({users}) {
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState('');
  const [history,setHistory]=useState([]);

  useEffect(()=>{ loadHistory(); },[]);
  const loadHistory=async()=>{
    const {data}=await supabase.from('broadcasts').select('*').order('created_at',{ascending:false}).limit(10);
    if (data) setHistory(data);
  };

  const send=async()=>{
    if (!title.trim()||!body.trim()) { setErr('Title and body required'); return; }
    setSending(true); setErr('');
    const {error}=await supabase.from('broadcasts').insert({title:title.trim(),body:body.trim(),sent_by_email:'admin',recipient_count:users.length});
    if (error) { setErr('broadcasts table may not exist — run migration first'); setSending(false); return; }
    setSent(true); setTitle(''); setBody('');
    await loadHistory();
    setTimeout(()=>setSent(false),3000);
    setSending(false);
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16}}>
      <div style={{...card,padding:24}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:20,fontWeight:700}}>COMPOSE BROADCAST</div>
        <div style={{fontSize:9,color:SEC,letterSpacing:2,marginBottom:5}}>TITLE</div>
        <input style={{...iS,marginBottom:14}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Important update"/>
        <div style={{fontSize:9,color:SEC,letterSpacing:2,marginBottom:5}}>MESSAGE</div>
        <textarea style={{...iS,marginBottom:14,height:120,resize:'vertical'}} value={body} onChange={e=>setBody(e.target.value)} placeholder="Message to all users..."/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <button onClick={send} disabled={sending} style={{...btn('#FF3D00',true),padding:'10px 24px'}}>
            {sending?'SENDING...':sent?'SENT ✓':'BROADCAST TO ALL USERS'}
          </button>
          <span style={{fontSize:10,color:MUT}}>{users.length} recipient{users.length!==1?'s':''}</span>
        </div>
        {err&&<div style={{fontSize:11,color:'#FF9100'}}>{err}</div>}
        <div style={{fontSize:10,color:DIM,marginTop:12,borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:10}}>Broadcasts are stored in the <code style={{color:'#666'}}>broadcasts</code> table. The main app reads them on login and shows as notifications. Requires <code style={{color:'#666'}}>broadcasts</code> table to exist in Supabase.</div>
      </div>
      <div style={{...card,padding:20}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:14,fontWeight:700}}>RECENT BROADCASTS</div>
        {history.length===0?<div style={{color:DIM,fontSize:12}}>No broadcasts yet.</div>:history.map((b,i)=>(
          <div key={b.id||i} style={{...card,padding:'10px 14px',marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:700,color:TXT,marginBottom:4}}>{b.title}</div>
            <div style={{fontSize:11,color:MUT,marginBottom:6,lineHeight:1.5}}>{b.body}</div>
            <div style={{fontSize:9,color:DIM}}>{fmtDate(b.created_at)} · {b.recipient_count||0} recipients</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Full Analytics Dashboard ───────────────────────────────────────────────
function AnalyticsDashboard({users,referrals=[],groups=[],groupMembers=[]}) {
  const now=Date.now();
  const D1=86400000,D7=D1*7,D14=D1*14,D30=D1*30,D60=D1*60;

  const total   = users.length;
  const pro     = users.filter(u=>u.subscription_status==='active').length;
  const trialing= users.filter(u=>u.subscription_status==='trialing').length;
  const cancelled=users.filter(u=>u.subscription_status==='canceled'||u.subscription_status==='cancelled').length;
  const mrr     = +(pro*4.99).toFixed(2);
  const arr     = +(mrr*12).toFixed(0);
  const conv    = total?Math.round(pro/total*100):0;

  const new7    = users.filter(u=>now-new Date(u.created_at)<D7).length;
  const new30   = users.filter(u=>now-new Date(u.created_at)<D30).length;
  const dau     = users.filter(u=>now-new Date(u.lastActive)<D1).length;
  const wau     = users.filter(u=>now-new Date(u.lastActive)<D7).length;
  const mau     = users.filter(u=>now-new Date(u.lastActive)<D30).length;
  const stick   = mau?Math.round(dau/mau*100):0;

  const act1    = users.filter(u=>u.totalScores>=1).length;
  const act5    = users.filter(u=>u.totalScores>=5).length;
  const act10   = users.filter(u=>u.totalScores>=10).length;
  const dormant = users.filter(u=>now-new Date(u.created_at)>D14&&u.totalScores===0).length;
  const atRisk  = users.filter(u=>{const i=now-new Date(u.lastActive);return i>D7&&i<D30&&u.totalScores>=1;}).length;
  const churned = users.filter(u=>now-new Date(u.lastActive)>D30&&u.totalScores>=1).length;
  const schoolOpt=users.filter(u=>u.school_opt_in).length;
  const usedErr = users.filter(u=>u.totalErrors>0).length;
  const usedTimer=users.filter(u=>u.totalStudySecs>0).length;

  const c7=users.filter(u=>{const a=now-new Date(u.created_at);return a>=D7&&a<D14;});
  const c30=users.filter(u=>{const a=now-new Date(u.created_at);return a>=D30&&a<D60;});
  const r7=c7.filter(u=>now-new Date(u.lastActive)<D7).length;
  const r30=c30.filter(u=>now-new Date(u.lastActive)<D30).length;
  const ret7=c7.length?Math.round(r7/c7.length*100):null;
  const ret30=c30.length?Math.round(r30/c30.length*100):null;
  const retC=r=>r===null?'#555':r>=40?'#00E676':r>=20?'#FFD600':'#FF3D00';

  const signupDays=Array.from({length:30},(_,i)=>{
    const d=new Date(now-(29-i)*D1); d.setHours(0,0,0,0);
    const e=d.getTime()+D1;
    return {v:users.filter(u=>{const t=new Date(u.created_at).getTime();return t>=d.getTime()&&t<e;}).length,
      label:d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
  });
  const peakDay=Math.max(...signupDays.map(d=>d.v));
  const totalPapers=users.reduce((a,u)=>a+u.totalScores,0);
  const totalHours=Math.round(users.reduce((a,u)=>a+(u.totalStudySecs||0),0)/3600);
  const avgPapers=total?(totalPapers/total).toFixed(1):0;

  const subMap={};
  for (const u of users) for (const sc of Object.values(u.scores||{})) for (const s of sc) subMap[s.subject]=(subMap[s.subject]||0)+1;
  const topSubs=Object.entries(subMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSub=topSubs[0]?.[1]||1;

  const Sec=({title,children,cols=1})=>(
    <div style={{...card,padding:'18px 20px',marginBottom:14,gridColumn:cols>1?`span ${cols}`:undefined}}>
      <div style={{fontSize:9,color:SEC,letterSpacing:2,fontWeight:700,marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
  const Kpi=({v,l,c='#FF3D00',sub})=>(
    <div style={{...card,padding:'14px 16px',flex:'1 1 140px'}}>
      <div style={{fontSize:9,color:DIM,letterSpacing:2,fontWeight:700,marginBottom:8,textTransform:'uppercase'}}>{l}</div>
      <div style={{fontSize:26,fontWeight:800,color:c,letterSpacing:-0.5,lineHeight:1}}>{v}</div>
      {sub&&<div style={{fontSize:10,color:MUT,marginTop:4}}>{sub}</div>}
    </div>
  );
  const FRow=({label,count,base,color,prev})=>{
    const pct=base?Math.round(count/base*100):0;
    const drop=prev?Math.round((1-count/prev)*100):null;
    return (
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
          <span style={{color:'#999'}}>{label}</span>
          <span style={{fontWeight:700,color:'#fff'}}>{count.toLocaleString()} <span style={{color:DIM,fontWeight:400}}>({pct}%)</span>{drop!==null&&drop>0&&<span style={{color:'#FF9100',fontWeight:400,fontSize:10}}> ↓{drop}%</span>}</span>
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:3}}/>
        </div>
      </div>
    );
  };

  const SparkBar=({data,color='#00E676',h=52})=>{
    const mx=Math.max(...data.map(d=>d.v),1);
    return (
      <div style={{display:'flex',alignItems:'flex-end',gap:2,height:h,overflow:'hidden'}}>
        {data.map((d,i)=>(
          <div key={i} title={`${d.label}: ${d.v}`} style={{
            flex:1,background:color,borderRadius:'2px 2px 0 0',
            height:`${Math.max(2,Math.round(d.v/mx*100))}%`,
            opacity:0.4+0.6*(d.v/mx),
          }}/>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,opacity:0.7}}>ACQUISITION</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
        <Kpi v={total} l="Total Users" sub={`+${new7} this week · +${new30} this month`}/>
        <Kpi v={new7} l="New (7d)" c='#00E676' sub={`${new30} this month`}/>
        <Kpi v={mau} l="MAU" c='#40C4FF' sub={`${wau} wau · ${dau} dau`}/>
        <Kpi v={`${stick}%`} l="Stickiness DAU/MAU" c='#40C4FF' sub="industry avg ~25%"/>
      </div>

      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,opacity:0.7}}>REVENUE</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
        <Kpi v={pro} l="Pro Users" c='#FFD600' sub={`${conv}% conv · ${trialing} trialing · ${cancelled} cancelled`}/>
        <Kpi v={`£${mrr}`} l="MRR (est.)" c='#FFD600' sub="£4.99/mo per Pro"/>
        <Kpi v={`£${arr}`} l="ARR (est.)" c='#FFD600' sub="MRR × 12"/>
        <Kpi v={`£${(total?mrr/total:0).toFixed(2)}`} l="ARPU" c='#FFD600' sub="MRR ÷ all users"/>
      </div>

      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,opacity:0.7}}>RETENTION</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
        <Kpi v={ret7!==null?`${ret7}%`:'—'} l="D7 Retention" c={retC(ret7)} sub={`n=${c7.length} · ≥40% good`}/>
        <Kpi v={ret30!==null?`${ret30}%`:'—'} l="D30 Retention" c={retC(ret30)} sub={`n=${c30.length} · ≥25% good`}/>
        <Kpi v={avgPapers} l="Avg Papers/User" c='#40C4FF' sub={`${totalPapers} total`}/>
        <Kpi v={`${totalHours}h`} l="Total Study Time" c='#40C4FF' sub="all users combined"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <Sec title={`DAILY SIGNUPS — 30 DAYS  (peak: ${peakDay}/day)`}>
          <SparkBar data={signupDays} color='#00E676' h={60}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:DIM,marginTop:4}}>
            <span>{signupDays[0].label}</span><span>{signupDays[29].label}</span>
          </div>
        </Sec>

        <Sec title="ACTIVATION FUNNEL">
          <FRow label="Signed up"              count={total} base={total} color='#40C4FF'/>
          <FRow label="Logged 1st paper"       count={act1}  base={total} color='#00E676' prev={total}/>
          <FRow label="5+ papers (engaged)"    count={act5}  base={total} color='#00E676' prev={act1}/>
          <FRow label="10+ papers (power)"     count={act10} base={total} color='#FFD600' prev={act5}/>
          <FRow label="Upgraded to Pro"        count={pro}   base={total} color='#FF3D00' prev={act10}/>
          <div style={{fontSize:10,color:DIM,marginTop:6}}>
            {act1>0&&pro>0?`${Math.round(pro/act1*100)}% of activated users convert to Pro`:'no data yet'}
          </div>
        </Sec>

        <Sec title="USER HEALTH SEGMENTS">
          {[
            ['Active today',           dau,       '#00E676'],
            ['Active this week',       wau,       '#00E676'],
            ['Active this month',      mau,       '#40C4FF'],
            ['Pro subscribers',        pro,       '#FFD600'],
            ['Dormant (14d+, 0 papers)',dormant,   '#FF3D00'],
            ['At-risk (7–30d idle)',    atRisk,    '#FF9100'],
            ['Churned (30d+ inactive)',churned,    '#FF3D00'],
            ['School opt-in',          schoolOpt, '#40C4FF'],
          ].map(([l,n,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <span style={{color:MUT}}>{l}</span>
              <span style={{fontWeight:800,color:c}}>{n} <span style={{color:DIM,fontWeight:400,fontSize:10}}>({total?Math.round(n/total*100):0}%)</span></span>
            </div>
          ))}
        </Sec>

        <Sec title="FEATURE ADOPTION">
          {[
            ['Past paper tracker',  act1,      total, '#00E676'],
            ['Error log',          usedErr,   total, '#40C4FF'],
            ['Study timer',        usedTimer, total, '#40C4FF'],
            ['School opt-in',      schoolOpt, total, '#FFD600'],
          ].map(([l,n,t,c])=>{
            const pct=t?Math.round(n/t*100):0;
            return (
              <div key={l} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:MUT}}>{l}</span>
                  <span style={{color:'#fff',fontWeight:700}}>{pct}% <span style={{color:DIM,fontWeight:400}}>({n})</span></span>
                </div>
                <div style={{height:5,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
          <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'12px 0'}}/>
          <div style={{fontSize:11,color:DIM,lineHeight:1.8}}>
            Total papers: <strong style={{color:TXT}}>{totalPapers.toLocaleString()}</strong><br/>
            Total study hours: <strong style={{color:TXT}}>{totalHours}h</strong>
          </div>
        </Sec>

        <Sec title="TOP SUBJECTS BY PAPERS LOGGED">
          {topSubs.map(([s,n])=>(
            <div key={s} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                <span style={{textTransform:'capitalize',color:SC[s]||MUT}}>{s.replace(/-/g,' ')}</span>
                <span style={{color:'#FF3D00'}}>{n} <span style={{color:DIM}}>({total?Math.round(n/total*100):0}%)</span></span>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,0.04)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(n/maxSub)*100}%`,background:SC[s]||'#FF3D00',borderRadius:2}}/>
              </div>
            </div>
          ))}
        </Sec>

        <Sec title="RETENTION COHORT DETAIL">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            {[{label:'D7',rate:ret7,size:c7.length},{label:'D30',rate:ret30,size:c30.length}].map(({label,rate,size})=>(
              <div key={label} style={{...card,padding:12}}>
                <div style={{fontSize:9,color:DIM,letterSpacing:2,marginBottom:6}}>{label} RETENTION</div>
                <div style={{fontSize:30,fontWeight:800,color:retC(rate)}}>{rate!==null?`${rate}%`:'—'}</div>
                <div style={{fontSize:10,color:DIM,marginTop:3}}>n={size}</div>
                {rate!==null&&<div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',marginTop:8}}><div style={{height:'100%',width:`${rate}%`,background:retC(rate)}}/></div>}
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:DIM,lineHeight:1.7}}>D7 ≥40% good · D30 ≥25% good · D30 ≥10% median</div>
        </Sec>
      </div>

      {/* ── GROWTH ENGINES ───────────────────────────────────────────── */}
      <div style={{fontSize:9,color:'#FF3D00',letterSpacing:3,fontWeight:800,marginBottom:10,marginTop:14,opacity:0.6}}>GROWTH ENGINES</div>
      {(()=>{
        const refByCode={};
        for (const r of referrals) refByCode[r.referrer_code]=(refByCode[r.referrer_code]||0)+1;
        const totalRefs=referrals.length;
        const referredUsers=new Set(referrals.map(r=>r.referred_user_id)).size;
        const usersByCode=Object.fromEntries(users.filter(u=>u.referral_code).map(u=>[u.referral_code,u]));
        const topReferrers=Object.entries(refByCode)
          .map(([code,c])=>({code,count:c,user:usersByCode[code]}))
          .sort((a,b)=>b.count-a.count).slice(0,8);
        const activeReferralPro=users.filter(u=>u.referral_pro_until && new Date(u.referral_pro_until).getTime()>now).length;
        const schoolMap={};
        for (const u of users) {
          if (!u.school_name || !u.school_opt_in) continue;
          const n=u.school_name.trim(); if (!n) continue;
          if (!schoolMap[n]) schoolMap[n]={count:0,total:0};
          schoolMap[n].count++; schoolMap[n].total+=u.leaderboard_score??0;
        }
        const topSchools=Object.entries(schoolMap)
          .map(([n,v])=>({name:n,count:v.count,avg:Math.round(v.total/v.count)}))
          .sort((a,b)=>b.count-a.count).slice(0,8);
        const totalGroups=groups.length;
        const totalMemberships=groupMembers.length;
        const avgGroupSize=totalGroups?(totalMemberships/totalGroups).toFixed(1):0;
        const lvlCount=users.reduce((acc,u)=>{const k=u.exam_level||'(unset)';acc[k]=(acc[k]||0)+1;return acc;},{});
        return (
        <>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
            <Kpi v={totalRefs} l="Total Referrals" c='#fbbf24' sub={`${referredUsers} unique users referred`}/>
            <Kpi v={topReferrers.length} l="Active Referrers" c='#fbbf24' sub={`avg ${topReferrers.length?(totalRefs/topReferrers.length).toFixed(1):0}/referrer`}/>
            <Kpi v={activeReferralPro} l="Referral Pro Grants" c='#FFD600' sub="users with active Pro week"/>
            <Kpi v={totalGroups} l="Study Groups" c='#40C4FF' sub={`${totalMemberships} memberships · avg ${avgGroupSize}/grp`}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}>
            {topReferrers.length>0&&(
              <Sec title="TOP REFERRERS">
                {topReferrers.map((r,i)=>(
                  <div key={r.code} style={{display:'flex',gap:10,alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
                    <span style={{width:16,textAlign:'center',fontSize:11,color:i<3?'#FFD600':DIM,fontWeight:800}}>{i+1}</span>
                    <span style={{flex:1,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.user?.display_name||r.user?.email||r.code}</span>
                    <span style={{fontWeight:700,color:'#fbbf24'}}>{r.count}</span>
                  </div>
                ))}
              </Sec>
            )}
            {topSchools.length>0&&(
              <Sec title="TOP SCHOOLS (OPT-IN)">
                {topSchools.map((s,i)=>(
                  <div key={s.name} style={{display:'flex',gap:10,alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
                    <span style={{width:16,textAlign:'center',fontSize:11,color:i<3?'#FFD600':DIM,fontWeight:800}}>{i+1}</span>
                    <span style={{flex:1,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                    <span style={{fontSize:10,color:DIM,marginRight:5}}>{s.count}u</span>
                    <span style={{fontWeight:700,color:s.avg>=80?'#00E676':s.avg>=60?'#FFD600':'#FF9100'}}>{s.avg}%</span>
                  </div>
                ))}
              </Sec>
            )}
            <Sec title="EXAM LEVEL MIX">
              {Object.entries(lvlCount).sort((a,b)=>b[1]-a[1]).map(([k,n])=>{
                const pct=total?Math.round(n/total*100):0;
                const c=k==='alevel'?'#40C4FF':k==='aslevel'?'#FF9100':k==='gcse'?'#00E676':'#555';
                return (
                  <div key={k} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                      <span style={{color:MUT,textTransform:'uppercase',letterSpacing:0.5}}>{k}</span>
                      <span style={{color:'#fff',fontWeight:700}}>{n} <span style={{color:DIM,fontWeight:400,fontSize:10}}>({pct}%)</span></span>
                    </div>
                    <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:c}}/>
                    </div>
                  </div>
                );
              })}
            </Sec>
          </div>
        </>
        );
      })()}
    </div>
  );
}

// ── Query Explorer (preset-only, no eval) ─────────────────────────────────
function QueryExplorer({users}) {
  const [result,setResult]=useState(null);
  const [activePreset,setActivePreset]=useState(null);

  const PRESETS=[
    {
      label:'Top 10 by papers',
      desc:'Highest paper count users',
      fn:u=>[...u].sort((a,b)=>b.totalScores-a.totalScores).slice(0,10)
        .map(u=>({email:u.email,name:u.display_name||'—',papers:u.totalScores,avg:`${u.avgScore}%`,readiness:u.readiness})),
    },
    {
      label:'Active this week',
      desc:'Users seen in last 7 days',
      fn:u=>u.filter(x=>Date.now()-new Date(x.lastActive)<604800000)
        .sort((a,b)=>new Date(b.lastActive)-new Date(a.lastActive))
        .map(x=>({email:x.email,last_active:timeSince(x.lastActive),papers:x.totalScores,exam_level:x.exam_level||'—'})),
    },
    {
      label:'Pro subscribers',
      desc:'All active paying users',
      fn:u=>u.filter(x=>x.subscription_status==='active')
        .map(x=>({email:x.email,name:x.display_name||'—',joined:fmtDate(x.created_at),papers:x.totalScores})),
    },
    {
      label:'Dormant (0 papers)',
      desc:'Signed up but never logged a paper',
      fn:u=>u.filter(x=>x.totalScores===0)
        .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
        .map(x=>({email:x.email,joined:fmtDate(x.created_at),last_seen:timeSince(x.lastActive),exam_level:x.exam_level||'—'})),
    },
    {
      label:'Subject breakdown',
      desc:'How many users per subject',
      fn:u=>{const m={};u.forEach(x=>(x.subjectList||[]).forEach(s=>m[s]=(m[s]||0)+1));
        return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([s,n])=>({subject:s,users:n,pct:`${u.length?Math.round(n/u.length*100):0}%`}));},
    },
    {
      label:'Error type analysis',
      desc:'Most common error types across all users',
      fn:u=>{const m={};u.forEach(x=>Object.values(x.errors||{}).flat().forEach(e=>{if(e.type)m[e.type]=(m[e.type]||0)+1;}));
        return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([type,count])=>({type,count}));},
    },
    {
      label:'GCSE vs A-Level split',
      desc:'Exam level breakdown',
      fn:u=>{
        const gcse=u.filter(x=>x.exam_level==='gcse').length;
        const alevel=u.filter(x=>x.exam_level==='alevel'||!x.exam_level).length;
        return [{level:'A-Level',users:alevel,pct:`${u.length?Math.round(alevel/u.length*100):0}%`},{level:'GCSE',users:gcse,pct:`${u.length?Math.round(gcse/u.length*100):0}%`}];
      },
    },
    {
      label:'School leaderboard',
      desc:'Avg score per school (≥2 opted-in users)',
      fn:u=>{
        const m={};
        u.filter(x=>x.school_opt_in&&x.school_name).forEach(x=>{
          const k=x.school_name.trim();
          if(!m[k])m[k]={total:0,count:0};
          m[k].total+=x.avgScore||0; m[k].count++;
        });
        return Object.entries(m).filter(([,v])=>v.count>=2)
          .map(([school,v])=>({school,students:v.count,avg_score:Math.round(v.total/v.count)}))
          .sort((a,b)=>b.avg_score-a.avg_score);
      },
    },
  ];

  const runPreset=p=>{
    setActivePreset(p.label);
    setResult(p.fn(users));
  };

  const cols=result?.length>0?Object.keys(result[0]):[];

  const exportJson=()=>{
    if (!result) return;
    const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${activePreset?.replace(/\s+/g,'-').toLowerCase()??'query'}.json`;a.click();
  };

  const exportCsv=()=>{
    if (!result||!cols.length) return;
    const rows=[cols.join(','),...result.map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(','))];
    const blob=new Blob([rows.join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${activePreset?.replace(/\s+/g,'-').toLowerCase()??'query'}.csv`;a.click();
  };

  return (
    <div>
      <div style={{...card,padding:20,marginBottom:14}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:4,fontWeight:700}}>DATA QUERIES</div>
        <div style={{fontSize:10,color:DIM,marginBottom:16,lineHeight:1.6}}>
          Read-only queries over the loaded user dataset. No eval — all queries are safe predefined functions.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:6}}>
          {PRESETS.map(p=>(
            <button key={p.label} onClick={()=>runPreset(p)} style={{
              background:activePreset===p.label?'rgba(255,61,0,0.12)':'rgba(255,255,255,0.03)',
              border:`1px solid ${activePreset===p.label?'rgba(255,61,0,0.4)':'rgba(255,255,255,0.08)'}`,
              borderRadius:6,padding:'10px 14px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',
            }}>
              <div style={{fontSize:11,fontWeight:700,color:activePreset===p.label?'#FF3D00':TXT,marginBottom:3}}>{p.label}</div>
              <div style={{fontSize:9,color:DIM}}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {result&&(
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,61,0,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:9,color:SEC,letterSpacing:2,fontWeight:700}}>
              {activePreset} — {result.length} row{result.length!==1?'s':''}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={exportCsv} style={{...btn('#00E676'),fontSize:9,padding:'4px 10px'}}>↓ CSV</button>
              <button onClick={exportJson} style={{...btn('#40C4FF'),fontSize:9,padding:'4px 10px'}}>↓ JSON</button>
            </div>
          </div>
          {result.length===0?(
            <div style={{padding:24,color:DIM,fontSize:12,textAlign:'center'}}>No results.</div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,61,0,0.1)'}}>
                    {cols.map(c=><th key={c} style={{textAlign:'left',padding:'8px 14px',fontSize:9,color:SEC,letterSpacing:1.5,fontWeight:700,whiteSpace:'nowrap'}}>{c.toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.slice(0,100).map((row,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.03)',transition:'background 0.1s'}}>
                      {cols.map(c=><td key={c} style={{padding:'8px 14px',color:'#bbb',maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{String(row[c]??'—')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.length>100&&<div style={{padding:'10px 16px',fontSize:10,color:DIM}}>Showing first 100 of {result.length} rows — export to see all.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Known subjects (for exam editor) ──────────────────────────────────────
const KNOWN_SUBJECTS = [
  {id:'maths',name:'Mathematics'},{id:'further-maths',name:'Further Mathematics'},
  {id:'cs',name:'Computer Science'},{id:'chemistry',name:'Chemistry'},
  {id:'physics',name:'Physics'},{id:'biology',name:'Biology'},
  {id:'economics',name:'Economics'},{id:'history',name:'History'},
  {id:'psychology',name:'Psychology'},{id:'geography',name:'Geography'},
  {id:'english-lit',name:'English Literature'},{id:'english-lang',name:'English Language'},
  {id:'business',name:'Business'},{id:'sociology',name:'Sociology'},
  {id:'french',name:'French'},{id:'spanish',name:'Spanish'},
  {id:'german',name:'German'},{id:'art',name:'Art & Design'},
];

// ── Exam Editor ────────────────────────────────────────────────────────────
function ExamEditor() {
  const [schedule,setSchedule]=useState({});
  const [activeSub,setActiveSub]=useState('maths');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [newSubId,setNewSubId]=useState('');
  const DEF={date:'',paper:'',code:'',board:'',time:'PM',duration:'',maxMark:100};

  useEffect(()=>{ loadSchedule(); },[]);

  const loadSchedule=async()=>{
    setLoading(true);
    const {data}=await supabase.from('app_config').select('value').eq('key','exam_schedule').maybeSingle();
    if (data?.value) {
      try { setSchedule(typeof data.value==='string'?JSON.parse(data.value):data.value); }
      catch(_) { setSchedule(EXAM_SCHEDULE); }
    } else {
      // No override saved yet — seed from the app's built-in schedule so you edit
      // the real dates. The live app merges per subject, so saving a half-empty
      // schedule would wipe a subject's papers; seeding the full set avoids that.
      setSchedule(EXAM_SCHEDULE);
    }
    setLoading(false);
  };

  const saveSchedule=async()=>{
    setSaving(true);
    await supabase.from('app_config').upsert({key:'exam_schedule',value:JSON.stringify(schedule),updated_at:new Date().toISOString()},{onConflict:'key'});
    setSaved(true); setTimeout(()=>setSaved(false),2500); setSaving(false);
  };

  const addExam=()=>setSchedule(p=>({...p,[activeSub]:[...(p[activeSub]||[]),{...DEF}]}));

  const updateExam=(sub,idx,field,val)=>setSchedule(p=>({
    ...p,[sub]:p[sub].map((e,i)=>i===idx?{...e,[field]:val}:e)
  }));

  const deleteExam=(sub,idx)=>setSchedule(p=>({...p,[sub]:p[sub].filter((_,i)=>i!==idx)}));

  const addSubject=()=>{
    if (!newSubId.trim()) return;
    const id=newSubId.trim().toLowerCase().replace(/\s+/g,'-');
    setSchedule(p=>({...p,[id]:[]})); setActiveSub(id); setNewSubId('');
  };

  const allSubjects=[
    ...KNOWN_SUBJECTS,
    ...Object.keys(schedule).filter(id=>!KNOWN_SUBJECTS.find(s=>s.id===id)).map(id=>({id,name:id})),
  ];
  const activeExams=schedule[activeSub]||[];

  return (
    <div style={{display:'grid',gridTemplateColumns:'210px 1fr',gap:16,alignItems:'start'}}>
      {/* Subject sidebar */}
      <div style={{...card,padding:14}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:10,fontWeight:700}}>SUBJECTS</div>
        <div style={{maxHeight:'60vh',overflowY:'auto'}}>
          {allSubjects.map(s=>(
            <button key={s.id} onClick={()=>setActiveSub(s.id)} style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              width:'100%',textAlign:'left',padding:'7px 10px',
              background:activeSub===s.id?'rgba(255,61,0,0.12)':'transparent',
              border:activeSub===s.id?'1px solid rgba(255,61,0,0.3)':'1px solid transparent',
              borderRadius:5,cursor:'pointer',marginBottom:2,
              color:activeSub===s.id?'#FF3D00':'#bbb',fontFamily:mono,fontSize:11,
            }}>
              <span>{s.name}</span>
              {schedule[s.id]?.length>0&&<span style={{fontSize:9,color:DIM}}>{schedule[s.id].length}</span>}
            </button>
          ))}
        </div>
        <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <input style={{...iS,marginBottom:6,fontSize:11}} value={newSubId}
            onChange={e=>setNewSubId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSubject()}
            placeholder="new-subject-id"/>
          <button onClick={addSubject} style={{...btn('#FF3D00'),width:'100%',textAlign:'center',padding:'7px'}}>+ ADD SUBJECT</button>
        </div>
      </div>

      {/* Exam rows */}
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:TXT}}>
              {allSubjects.find(s=>s.id===activeSub)?.name||activeSub}
            </span>
            <span style={{fontSize:10,color:MUT,marginLeft:8}}>{activeExams.length} exam{activeExams.length!==1?'s':''}</span>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={addExam} style={btn('#00E676')}>+ ADD EXAM</button>
            <button onClick={saveSchedule} disabled={saving} style={btn('#FF3D00',true)}>
              {saving?'SAVING...':saved?'SAVED ✓':'SAVE ALL CHANGES'}
            </button>
          </div>
        </div>

        {loading?(
          <div style={{color:DIM,fontSize:12,padding:24}}>// LOADING SCHEDULE FROM DATABASE...</div>
        ):activeExams.length===0?(
          <div style={{...card,padding:28,textAlign:'center',color:DIM,fontSize:12,lineHeight:1.8}}>
            No exams for this subject yet.<br/>Click "+ ADD EXAM" to add one.
          </div>
        ):activeExams.map((e,idx)=>(
          <div key={idx} style={{...card,padding:'10px 12px',marginBottom:8}}>
            <div style={{display:'grid',gridTemplateColumns:'140px 1fr 90px 80px 52px 90px 80px 34px',gap:6,alignItems:'center'}}>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} type="date" value={e.date}
                onChange={ev=>updateExam(activeSub,idx,'date',ev.target.value)}/>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} value={e.paper}
                onChange={ev=>updateExam(activeSub,idx,'paper',ev.target.value)} placeholder="Paper name"/>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} value={e.code||''}
                onChange={ev=>updateExam(activeSub,idx,'code',ev.target.value)} placeholder="Code"/>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} value={e.board||''}
                onChange={ev=>updateExam(activeSub,idx,'board',ev.target.value)} placeholder="Board"/>
              <select style={{...iS,fontSize:11,padding:'7px 8px'}} value={e.time||'PM'}
                onChange={ev=>updateExam(activeSub,idx,'time',ev.target.value)}>
                <option>AM</option><option>PM</option>
              </select>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} value={e.duration||''}
                onChange={ev=>updateExam(activeSub,idx,'duration',ev.target.value)} placeholder="e.g. 2h 30m"/>
              <input style={{...iS,fontSize:11,padding:'7px 10px'}} type="number" value={e.maxMark||''}
                onChange={ev=>updateExam(activeSub,idx,'maxMark',Number(ev.target.value))} placeholder="Marks"/>
              <button onClick={()=>deleteExam(activeSub,idx)} style={{...btn('#FF3D00'),padding:'7px 8px',textAlign:'center'}}>✕</button>
            </div>
            {e.date&&<div style={{fontSize:9,color:DIM,marginTop:5,paddingLeft:2}}>
              {new Date(e.date+' 12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {e.time||'PM'}
            </div>}
          </div>
        ))}

        <div style={{marginTop:12,fontSize:10,color:DIM,lineHeight:1.7}}>
          Changes are saved to the <code style={{color:MUT}}>app_config</code> Supabase table (key: <code style={{color:MUT}}>exam_schedule</code>). The main app reads this on login and merges with built-in dates. Requires an <code style={{color:MUT}}>app_config</code> table with columns <code style={{color:MUT}}>key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ</code>.
        </div>
      </div>
    </div>
  );
}

// ── Resources Panel ────────────────────────────────────────────────────────
function ResourcesPanel() {
  const [title,setTitle]=useState('');
  const [desc,setDesc]=useState('');
  const [file,setFile]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [resources,setResources]=useState([]);
  const [err,setErr]=useState('');
  const [dragOver,setDragOver]=useState(false);
  const fileRef=useRef(null);

  useEffect(()=>{ loadResources(); },[]);

  const loadResources=async()=>{
    const {data}=await supabase.from('resources').select('*').order('created_at',{ascending:false});
    if (data) setResources(data);
  };

  const handleUpload=async()=>{
    if (!file||!title.trim()) { setErr('File and title are required'); return; }
    setUploading(true); setErr('');
    const path=`${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const {error:upErr}=await supabase.storage.from('resources').upload(path,file);
    if (upErr) { setErr(`Upload failed: ${upErr.message}`); setUploading(false); return; }
    const {data:{publicUrl}}=supabase.storage.from('resources').getPublicUrl(path);
    const {error:dbErr}=await supabase.from('resources').insert({
      title:title.trim(),description:desc.trim(),file_url:publicUrl,
      file_name:file.name,file_size:file.size,storage_path:path,
    });
    if (dbErr) { setErr(`Save failed: ${dbErr.message}`); setUploading(false); return; }
    setTitle(''); setDesc(''); setFile(null);
    await loadResources();
    setUploading(false);
  };

  const handleDelete=async(r)=>{
    if (r.storage_path) await supabase.storage.from('resources').remove([r.storage_path]);
    await supabase.from('resources').delete().eq('id',r.id);
    setResources(prev=>prev.filter(x=>x.id!==r.id));
  };

  const onDrop=ev=>{
    ev.preventDefault(); setDragOver(false);
    const f=ev.dataTransfer.files[0]; if (f) setFile(f);
  };

  const fmtSize=b=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${(b/1024).toFixed(0)} KB`;

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:16,alignItems:'start'}}>
      {/* Upload form */}
      <div style={{...card,padding:24}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:20,fontWeight:700}}>UPLOAD RESOURCE</div>

        {/* Drop zone */}
        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
          onClick={()=>fileRef.current?.click()}
          style={{border:`2px dashed ${dragOver?'#FF3D00':'rgba(255,255,255,0.12)'}`,borderRadius:8,
            padding:'32px 20px',textAlign:'center',cursor:'pointer',marginBottom:18,
            background:dragOver?'rgba(255,61,0,0.05)':'rgba(255,255,255,0.02)',transition:'all 0.2s'}}
        >
          <input ref={fileRef} type="file" style={{display:'none'}} onChange={e=>setFile(e.target.files[0]||null)}/>
          {file?(
            <div>
              <div style={{fontSize:22,marginBottom:6}}>📄</div>
              <div style={{fontSize:13,color:TXT,fontWeight:600,marginBottom:3}}>{file.name}</div>
              <div style={{fontSize:10,color:MUT}}>{fmtSize(file.size)}</div>
              <button onClick={e=>{e.stopPropagation();setFile(null);}} style={{...btn('#FF3D00'),marginTop:10,fontSize:10}}>✕ REMOVE</button>
            </div>
          ):(
            <div>
              <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>↑</div>
              <div style={{fontSize:13,color:MUT,marginBottom:3}}>Drop file here or click to browse</div>
              <div style={{fontSize:10,color:DIM}}>PDF, DOCX, PPTX, MP4, images — any format</div>
            </div>
          )}
        </div>

        <div style={{fontSize:9,color:SEC,letterSpacing:2,marginBottom:5,fontWeight:700}}>TITLE</div>
        <input style={{...iS,marginBottom:12}} value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="e.g. Chemistry — Organic Reactions Summary"/>
        <div style={{fontSize:9,color:SEC,letterSpacing:2,marginBottom:5,fontWeight:700}}>DESCRIPTION</div>
        <textarea style={{...iS,marginBottom:18,height:90,resize:'vertical'}} value={desc}
          onChange={e=>setDesc(e.target.value)} placeholder="What is this? Which students should use it? Key topics covered..."/>
        <button onClick={handleUpload} disabled={uploading} style={{...btn('#FF3D00',true),padding:'12px',width:'100%',fontSize:12,letterSpacing:2}}>
          {uploading?'UPLOADING...':'↑ UPLOAD RESOURCE'}
        </button>
        {err&&<div style={{color:'#FF9100',fontSize:11,marginTop:10}}>{err}</div>}
        <div style={{fontSize:9,color:DIM,marginTop:14,lineHeight:1.8,borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:12}}>
          Requires Supabase Storage bucket <code style={{color:MUT}}>resources</code> (public) and a <code style={{color:MUT}}>resources</code> table with columns: id, title, description, file_url, file_name, file_size, storage_path, created_at.
        </div>
      </div>

      {/* Resource list */}
      <div>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:14,fontWeight:700}}>RESOURCES ({resources.length})</div>
        {resources.length===0?(
          <div style={{...card,padding:20,textAlign:'center',color:DIM,fontSize:12}}>No resources uploaded yet.</div>
        ):resources.map(r=>(
          <div key={r.id} style={{...card,padding:'14px 16px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:TXT,marginBottom:3}}>{r.title}</div>
                {r.description&&<div style={{fontSize:11,color:MUT,marginBottom:6,lineHeight:1.5}}>{r.description}</div>}
                <div style={{fontSize:9,color:DIM}}>{r.file_name}{r.file_size?` · ${fmtSize(r.file_size)}`:''} · {fmtDate(r.created_at)}</div>
              </div>
              <div style={{display:'flex',gap:5,flexShrink:0}}>
                <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                  style={{...btn('#00E676'),textDecoration:'none',padding:'6px 10px',fontSize:13}}>↓</a>
                <button onClick={()=>handleDelete(r)} style={{...btn('#FF3D00'),padding:'6px 10px'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Waitlist Panel ─────────────────────────────────────────────────────────
function WaitlistPanel() {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    supabase.from('pro_waitlist').select('id,email,user_id,created_at,notified_at').order('created_at',{ascending:false})
      .then(({data})=>{ setRows(data||[]); setLoading(false); });
  },[]);

  const markNotified = async (id) => {
    const now = new Date().toISOString();
    await supabase.from('pro_waitlist').update({notified_at:now}).eq('id',id);
    setRows(prev=>prev.map(r=>r.id===id?{...r,notified_at:now}:r));
  };

  const copyEmails = () => {
    const emails = rows.map(r=>r.email).join('\n');
    navigator.clipboard.writeText(emails);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  if (loading) return <div style={{color:'#555',fontSize:12,padding:20}}>Loading…</div>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:9,letterSpacing:3,color:SEC,fontWeight:700}}>PRO WAITLIST</div>
          <div style={{fontSize:22,fontWeight:900,color:TXT,marginTop:4}}>{rows.length} <span style={{fontSize:13,color:MUT,fontWeight:400}}>signups</span></div>
        </div>
        <button onClick={copyEmails} style={btn('#fbbf24',false)}>
          {copied?'✓ COPIED':'COPY ALL EMAILS'}
        </button>
      </div>

      {rows.length===0?(
        <div style={{...card,padding:20,textAlign:'center',color:MUT,fontSize:13}}>No waitlist signups yet.</div>
      ):(
        <div style={{...card,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,fontFamily:mono}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                {['Email','Signed up','Notified','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',color:MUT,fontWeight:700,fontSize:9,letterSpacing:1}}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'10px 14px',color:TXT}}>{r.email}</td>
                  <td style={{padding:'10px 14px',color:DIM}}>{fmtDate(r.created_at)}</td>
                  <td style={{padding:'10px 14px'}}>
                    {r.notified_at
                      ? <span style={pill('#00E676')}>NOTIFIED {fmtDate(r.notified_at)}</span>
                      : <span style={pill('#fbbf24')}>PENDING</span>}
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    {!r.notified_at&&(
                      <button onClick={()=>markNotified(r.id)} style={btn('#00E676')}>MARK NOTIFIED</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{marginTop:16,fontSize:11,color:DIM,lineHeight:1.6}}>
        Use "Copy All Emails" to paste into Resend broadcast or BCC field when Pro launches.
        Mark users as notified once you've emailed them so you don't double-send.
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
// ── Finance ─────────────────────────────────────────────────────────────────
function FinanceSection({users=[],waitlist=[]}) {
  const PRICE=4.99;
  const now=Date.now();
  const active   = users.filter(u=>u.subscription_status==='active');
  const trialing = users.filter(u=>u.subscription_status==='trialing');
  const churned  = users.filter(u=>['canceled','cancelled','past_due'].includes(u.subscription_status));
  const granted  = users.filter(u=>u.referral_pro_until && new Date(u.referral_pro_until).getTime()>now && !['active','trialing'].includes(u.subscription_status));
  const free     = Math.max(0, users.length-active.length-trialing.length-granted.length);
  const mrr = active.length*PRICE;
  const arr = mrr*12;
  const arpu = users.length? mrr/users.length : 0;
  const conv = users.length? (active.length/users.length)*100 : 0;
  const activated = users.filter(u=>u.totalScores>0).length;
  const waitN = waitlist.length;
  const waitPending = waitlist.filter(w=>!w.notified_at).length;

  const Kpi=({v,l,sub,c})=>(
    <div style={{...card,padding:'16px 18px'}}>
      <div style={{fontSize:13,color:MUT,marginBottom:8}}>{l}</div>
      <div style={{fontSize:27,fontWeight:700,color:c||TXT,lineHeight:1,letterSpacing:'-0.02em',fontFamily:numF}}>{v}</div>
      {sub&&<div style={{fontSize:12,color:DIM,marginTop:6}}>{sub}</div>}
    </div>
  );
  const breakdown=[
    {l:'Paying (active)',v:active.length,c:OK},
    {l:'Trialing',v:trialing.length,c:ACCENT},
    {l:'Admin-granted',v:granted.length,c:'#a855f7'},
    {l:'Churned / past due',v:churned.length,c:BAD},
    {l:'Free',v:free,c:MUT},
  ];
  const maxB=Math.max(1,...breakdown.map(b=>b.v));
  const funnel=[
    {l:'Total users',v:users.length},
    {l:'Activated (logged a paper)',v:activated},
    {l:'Pro waitlist',v:waitN},
    {l:'Paying subscribers',v:active.length},
  ];
  const maxF=Math.max(1,users.length);

  return (
    <div>
      <div style={{...card,padding:'12px 16px',marginBottom:16,borderColor:'rgba(245,158,11,0.35)',background:'rgba(245,158,11,0.06)',display:'flex',gap:10,alignItems:'baseline',flexWrap:'wrap'}}>
        <span style={{fontSize:13,color:WARN,fontWeight:700}}>Estimated</span>
        <span style={{fontSize:13,color:TXT2}}>Revenue is derived from active subscriptions at £{PRICE.toFixed(2)}/mo. Live Stripe figures populate here once payments go live.</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
        <Kpi l="MRR" v={`£${mrr.toFixed(2)}`} sub={`${active.length} paying × £${PRICE}`} c={OK}/>
        <Kpi l="ARR (run-rate)" v={`£${arr.toFixed(0)}`} sub="MRR × 12"/>
        <Kpi l="Paying subscribers" v={active.length} sub={`${trialing.length} on trial`} c={ACCENT}/>
        <Kpi l="ARPU" v={`£${arpu.toFixed(2)}`} sub="MRR ÷ all users"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        <Kpi l="Free → Pro conversion" v={`${conv.toFixed(1)}%`}/>
        <Kpi l="Pro waitlist" v={waitN} sub={`${waitPending} not yet notified`} c={WARN}/>
        <Kpi l="Admin-granted Pro" v={granted.length} sub="non-revenue comps"/>
        <Kpi l="Churned" v={churned.length} c={BAD}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{...card,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:16}}>Subscriber breakdown</div>
          {breakdown.map(b=>(
            <div key={b.l} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                <span style={{color:TXT2}}>{b.l}</span>
                <span style={{color:TXT,fontWeight:600,fontFamily:numF}}>{b.v}</span>
              </div>
              <div style={{height:6,background:PANEL2,borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(b.v/maxB)*100}%`,background:b.c,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{...card,padding:20}}>
          <div style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:16}}>Conversion funnel</div>
          {funnel.map((f,i)=>{
            const pct=(f.v/maxF)*100;
            const prev=i>0?funnel[i-1].v:f.v;
            const step=prev>0?Math.round((f.v/prev)*100):0;
            return (
              <div key={f.l} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:TXT2}}>{f.l}</span>
                  <span style={{color:TXT,fontWeight:600}}><span style={{fontFamily:numF}}>{f.v}</span>{i>0&&<span style={{color:DIM,marginLeft:6}}>{step}%</span>}</span>
                </div>
                <div style={{height:8,background:PANEL2,borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:ACCENT,borderRadius:4}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard({adminUser,adminProfile,onLogout}) {
  const [users,setUsers]=useState([]);
  const [referrals,setReferrals]=useState([]);
  const [groups,setGroups]=useState([]);
  const [groupMembers,setGroupMembers]=useState([]);
  const [waitlist,setWaitlist]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState({col:'created_at',dir:-1});
  const [selected,setSelected]=useState(null);
  const [hover,setHover]=useState(null);
  const [tab,setTab]=useState('overview');
  const [lastRefresh,setLastRefresh]=useState(null);
  const [filterAdmin,setFilterAdmin]=useState(false);
  const [filterActive,setFilterActive]=useState(false);

  const loadData=useCallback(async()=>{
    setLoading(true);
    const [
      {data:profiles},
      {data:userData},
      {data:refRows},
      {data:groupRows},
      {data:memberRows},
      {data:waitRows},
    ]=await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('user_data').select('*'),
      supabase.from('referrals').select('referrer_code,referred_user_id,created_at'),
      supabase.from('study_groups').select('id,name,created_by,created_at'),
      supabase.from('group_members').select('group_id,user_id'),
      supabase.from('pro_waitlist').select('id,created_at,notified_at'),
    ]);
    setReferrals(refRows||[]);
    setGroups(groupRows||[]);
    setGroupMembers(memberRows||[]);
    setWaitlist(waitRows||[]);
    if (!profiles) { setLoading(false); return; }
    const merged=profiles.map(p=>{
      const rows=(userData||[]).filter(d=>d.user_id===p.id);
      const scores={},errors={},checks={},targets={},sessions={},timetables={};
      rows.forEach(r=>{ scores[r.profile]=r.scores||[]; errors[r.profile]=r.errors||[]; checks[r.profile]=r.checks||{}; targets[r.profile]=r.targets||{}; sessions[r.profile]=r.sessions||[]; timetables[r.profile]=r.timetable||{}; });
      const allS=Object.values(scores).flat();
      const allE=Object.values(errors).flat();
      const allSess=Object.values(sessions).flat();
      const totalStudySecs=allSess.reduce((a,s)=>a+(s.secs||0),0);
      const lastA=rows.length?rows.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0].updated_at:p.created_at;
      const br=calcReadiness(allS,allE);
      let subjectList=[];
      try { if (p.subjects) { const ps=JSON.parse(p.subjects); if (Array.isArray(ps)) subjectList=ps.map(s=>s.subjectId||s.subject||'').filter(Boolean); } } catch(_) {}
      return {...p,scores,errors,checks,targets,sessions,timetables,subjectList,allScores:allS,totalScores:allS.length,totalErrors:allE.length,totalStudySecs,lastActive:lastA,readiness:br.t,avgScore:br.avg};
    });
    setUsers(merged);
    setLastRefresh(new Date());
    setLoading(false);
    setSelected(prev=>prev?merged.find(u=>u.id===prev.id)||null:null);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  const toggleAdmin=async(u)=>{
    const next=!u.is_admin;
    // is_admin column is server-controlled (revoked from authenticated UPDATE).
    // set_admin RPC re-verifies the caller is admin before applying the change.
    const {error}=await supabase.rpc('set_admin',{p_target:u.id,p_value:next});
    if (error) { alert(`Failed: ${error.message}`); return; }
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_admin:next}:x));
    setSelected(prev=>prev?.id===u.id?{...prev,is_admin:next}:prev);
  };

  // Grant or revoke Pro via referral_pro_until. p_days=0 revokes, 365 grants a year.
  // set_pro RPC re-verifies caller is admin. We deliberately don't touch
  // subscription_status (Stripe owns that — webhook is source of truth).
  const togglePro=async(u,days=365)=>{
    const {data,error}=await supabase.rpc('set_pro',{p_target:u.id,p_days:days});
    if (error) { alert(`Failed: ${error.message}`); return; }
    const newUntil=data ?? null;
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,referral_pro_until:newUntil}:x));
    setSelected(prev=>prev?.id===u.id?{...prev,referral_pro_until:newUntil}:prev);
  };

  const deleteUser=async(u)=>{
    await supabase.from('user_data').delete().eq('user_id',u.id);
    await supabase.from('user_profiles').delete().eq('id',u.id);
    setUsers(prev=>prev.filter(x=>x.id!==u.id));
  };

  const exportCSV=()=>{
    const h=['Email','Name','Joined','Last Active','Subjects','Papers','Avg Score','Readiness','Errors','ToS','Admin'];
    const rows=users.map(u=>[u.email||'',u.display_name||'',fmtDate(u.created_at),fmtDate(u.lastActive),u.subjectList.join(';'),u.totalScores,u.avgScore,u.readiness,u.totalErrors,u.tos_agreed_at?'yes':'no',u.is_admin?'yes':'no'].map(v=>JSON.stringify(v??'')).join(','));
    const blob=new Blob([[h.join(','),...rows].join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`godmode-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const now=Date.now(); const week=7*24*60*60*1000;
  const stats={
    total:users.length,
    activeWeek:users.filter(u=>now-new Date(u.lastActive)<week).length,
    newWeek:users.filter(u=>now-new Date(u.created_at)<week).length,
    activated:users.filter(u=>u.totalScores>0).length,
    totalPapers:users.reduce((a,u)=>a+u.totalScores,0),
    totalErrors:users.reduce((a,u)=>a+u.totalErrors,0),
    totalStudyHours:Math.round(users.reduce((a,u)=>a+(u.totalStudySecs||0),0)/3600),
    avgReadiness:users.length?Math.round(users.reduce((a,u)=>a+u.readiness,0)/users.length):0,
    admins:users.filter(u=>u.is_admin).length,
    pro:users.filter(u=>u.subscription_status==='active').length,
  };

  const subjectCounts={};
  users.forEach(u=>(u.subjectList||[]).forEach(s=>{ subjectCounts[s]=(subjectCounts[s]||0)+1; }));
  const topSubjects=Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSub=topSubjects[0]?.[1]||1;

  const rdist=[{l:'Battle Ready',min:80,c:'#00E676'},{l:'On Track',min:60,c:'#FFD600'},{l:'Building',min:40,c:'#FF9100'},{l:'Just Started',min:0,c:'FF3D00'}];

  const cycleSort=col=>setSort(s=>s.col===col?{col,dir:-s.dir}:{col,dir:-1});
  const sa=col=>sort.col===col?(sort.dir===-1?'↓':'↑'):'⇅';

  const filtered=[...users]
    .filter(u=>{
      if (filterAdmin&&!u.is_admin) return false;
      if (filterActive&&now-new Date(u.lastActive)>week) return false;
      if (!search) return true;
      const q=search.toLowerCase();
      return u.email?.toLowerCase().includes(q)||u.display_name?.toLowerCase().includes(q)||(u.subjectList||[]).some(s=>s.includes(q));
    })
    .sort((a,b)=>{
      const av=a[sort.col]??(sort.col==='readiness'?0:'');
      const bv=b[sort.col]??(sort.col==='readiness'?0:'');
      return sort.dir*(av<bv?-1:av>bv?1:0);
    });

  const topByReadiness=[...users].sort((a,b)=>b.readiness-a.readiness).slice(0,5);
  const recentSignups=[...users].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);


  const NAV=[
    {group:'Insights',items:[['overview','Overview'],['finance','Finance'],['analytics','Analytics']]},
    {group:'People',items:[['users','Users'],['waitlist','Pro waitlist']]},
    {group:'Operations',items:[['exams','Exam schedule'],['resources','Resources'],['broadcast','Messaging'],['query','Data explorer'],['system','System']]},
    {group:'Personal',items:[['myplan','My revision plan']]},
  ];
  const TITLES={overview:'Overview',finance:'Finance',analytics:'Analytics',users:'Users',waitlist:'Pro waitlist',exams:'Exam schedule',resources:'Resources',broadcast:'Messaging',query:'Data explorer',system:'System',myplan:'My revision plan'};

  return (
    <>
      {selected&&<UserDetail u={selected} onClose={()=>setSelected(null)} onToggleAdmin={toggleAdmin} onTogglePro={togglePro} onDeleteUser={deleteUser}/>}
      <div style={{minHeight:'100vh',background:BG,color:TXT,fontFamily:FONT,display:'flex'}}>
        {/* Sidebar nav */}
        <aside style={{width:222,flexShrink:0,background:PANEL,borderRight:`1px solid ${BORDER}`,position:'sticky',top:0,height:'100vh',display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{padding:'18px 18px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:`1px solid ${BORDER}`}}>
            <CapsMark size={30}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:TXT,lineHeight:1.15}}>Battle Plan</div>
              <div style={{fontSize:10,color:MUT}}>Admin Console</div>
            </div>
          </div>
          <div style={{flex:1,padding:'12px 10px'}}>
            {NAV.map(grp=>(
              <div key={grp.group} style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:DIM,letterSpacing:0.6,textTransform:'uppercase',padding:'0 8px 6px'}}>{grp.group}</div>
                {grp.items.map(([id,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:9,padding:'8px 10px',marginBottom:1,borderRadius:7,border:'none',cursor:'pointer',background:tab===id?ACCENT_SOFT:'transparent',color:tab===id?'#fff':TXT2,fontSize:13,fontWeight:tab===id?600:500,fontFamily:FONT}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:tab===id?ACCENT:'transparent',border:tab===id?'none':`1px solid ${BORDER}`,flexShrink:0}}/>
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{padding:'12px 14px',borderTop:`1px solid ${BORDER}`}}>
            <div style={{fontSize:11,color:TXT2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:8}}>{adminProfile?.email||adminUser?.email}</div>
            <button onClick={onLogout} style={{...btn(),width:'100%'}}>Sign out</button>
          </div>
        </aside>

        {/* Main column */}
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
          <div style={{position:'sticky',top:0,zIndex:50,background:'rgba(11,13,18,0.88)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:56}}>
            <div style={{fontSize:16,fontWeight:700,color:TXT,letterSpacing:'-0.01em'}}>{TITLES[tab]||'Console'}</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {lastRefresh&&<span style={{fontSize:11,color:DIM}}>Updated {timeSince(lastRefresh)}</span>}
              <button onClick={loadData} disabled={loading} style={btn()}>Refresh</button>
              <button onClick={exportCSV} style={btn(OK)}>Export CSV</button>
            </div>
          </div>

          <div style={{padding:'24px',maxWidth:1180,width:'100%',boxSizing:'border-box'}}>
          {tab==='overview'&&(<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:10}}>
            {[
              {v:stats.total,l:'Total users'},
              {v:stats.activeWeek,l:'Active · 7d',c:OK},
              {v:stats.newWeek,l:'New · 7d',c:ACCENT},
              {v:stats.activated,l:'Activated'},
              {v:stats.admins,l:'Admins'},
            ].map(({v,l,c},i)=>(
              <div key={l} style={{background:TINTS[i%3],borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:24,fontWeight:700,color:c||TXT,lineHeight:1,letterSpacing:'-0.02em',fontFamily:numF}}>{v}</div>
                <div style={{fontSize:12,color:MUT,marginTop:6}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
            {[
              {v:stats.totalPapers,l:'Papers logged'},
              {v:`${stats.totalStudyHours}h`,l:'Study hours',c:OK},
              {v:stats.totalErrors,l:'Errors logged',c:WARN},
              {v:stats.avgReadiness,l:'Avg readiness',c:R(stats.avgReadiness)},
              {v:`£${(stats.pro*4.99).toFixed(0)}`,l:'Est. MRR',c:ACCENT},
            ].map(({v,l,c},i)=>(
              <div key={l} style={{background:TINTS[(i+1)%3],borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:24,fontWeight:700,color:c||TXT,lineHeight:1,letterSpacing:'-0.02em',fontFamily:numF}}>{v}</div>
                <div style={{fontSize:12,color:MUT,marginTop:6}}>{l}</div>
              </div>
            ))}
          </div>
          </>)}

          {/* OVERVIEW */}
          {tab==='overview'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>TOP BY READINESS</div>
                {topByReadiness.map((u,i)=>(
                  <div key={u.id} onClick={()=>setSelected(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}>
                    <span style={{fontSize:11,color:DIM,width:16,textAlign:'right'}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.display_name||u.email}</div>
                      <div style={{fontSize:9,color:MUT,marginTop:1}}>{u.totalScores} papers · {u.avgScore}% avg</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:40,height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}><div style={{width:`${u.readiness}%`,height:'100%',background:R(u.readiness)}}/></div>
                      <span style={{fontSize:12,fontWeight:800,color:R(u.readiness),minWidth:24,textAlign:'right'}}>{u.readiness}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>RECENT SIGN-UPS</div>
                {recentSignups.map(u=>(
                  <div key={u.id} onClick={()=>setSelected(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.display_name||u.email}</div>
                      <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                        {(u.subjectList||[]).slice(0,3).map(s=><span key={s} style={{fontSize:8,color:'#FF3D00',background:'rgba(255,61,0,0.08)',border:'1px solid rgba(255,61,0,0.2)',padding:'1px 5px',borderRadius:3,textTransform:'capitalize'}}>{s.replace(/-/g,' ')}</span>)}
                      </div>
                    </div>
                    <span style={{fontSize:10,color:MUT,flexShrink:0}}>{timeSince(u.created_at)}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>ENGAGEMENT METRICS</div>
                {[
                  {l:'Activation rate',v:`${users.length?Math.round((stats.activated/users.length)*100):0}%`,c:'#40C4FF'},
                  {l:'Avg papers / activated user',v:stats.activated?Math.round(stats.totalPapers/stats.activated):0,c:'#fff'},
                  {l:'Avg errors / activated user',v:stats.activated?Math.round(stats.totalErrors/stats.activated):0,c:'#FF9100'},
                  {l:'ToS agreed',v:users.filter(u=>u.tos_agreed_at).length,c:'#00E676'},
                  {l:'Users with no papers',v:users.filter(u=>u.totalScores===0).length,c:'#555'},
                ].map(({l,v,c})=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{fontSize:11,color:MUT}}>{l}</span>
                    <span style={{fontSize:14,fontWeight:800,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>SUBJECT POPULARITY</div>
                {topSubjects.slice(0,6).map(([s,n])=>(
                  <div key={s} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#666',marginBottom:3}}>
                      <span style={{textTransform:'capitalize',color:SC[s]||MUT}}>{s.replace(/-/g,' ')}</span>
                      <span style={{color:'#FF3D00'}}>{n}</span>
                    </div>
                    <div style={{height:3,background:'rgba(255,255,255,0.04)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(n/maxSub)*100}%`,background:SC[s]||'#FF3D00',borderRadius:2,opacity:0.8}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {tab==='users'&&(
            <>
              <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
                <input style={{...iS,flex:1}} placeholder="Search by email, name, or subject…" value={search} onChange={e=>setSearch(e.target.value)}/>
                <button onClick={()=>setFilterAdmin(p=>!p)} style={{...btn(ACCENT),background:filterAdmin?ACCENT_SOFT:'transparent',whiteSpace:'nowrap'}}>Admins only</button>
                <button onClick={()=>setFilterActive(p=>!p)} style={{...btn(OK),background:filterActive?'rgba(34,197,94,0.12)':'transparent',whiteSpace:'nowrap'}}>Active this week</button>
                <span style={{fontSize:12,color:MUT,whiteSpace:'nowrap'}}>{filtered.length} / {users.length}</span>
              </div>
              {loading?<div style={{color:MUT,fontSize:13,padding:40,textAlign:'center'}}>Loading user data…</div>:(
                <div style={{...card,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:`1px solid ${BORDER}`,background:'rgba(255,255,255,0.02)'}}>
                        {[{k:'email',l:'User'},{k:'created_at',l:'Joined'},{k:'lastActive',l:'Last active'},{k:'totalScores',l:'Papers'},{k:'avgScore',l:'Avg'},{k:'readiness',l:'Readiness'},{k:'totalErrors',l:'Errors'},{k:'tos_agreed_at',l:'ToS'},{k:'is_admin',l:'Role'}].map(({k,l})=>(
                          <th key={k} onClick={()=>cycleSort(k)} style={{textAlign:'left',padding:'11px 14px',fontSize:11,color:SEC,fontWeight:600,cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                            {l} <span style={{opacity:0.5,fontSize:10}}>{sa(k)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0&&<tr><td colSpan={9} style={{padding:'32px 14px',color:DIM,fontSize:13,textAlign:'center'}}>No users found.</td></tr>}
                      {filtered.map(u=>(
                        <tr key={u.id} onClick={()=>setSelected(u)} onMouseEnter={()=>setHover(u.id)} onMouseLeave={()=>setHover(null)}
                          style={{background:hover===u.id?PANEL2:'transparent',cursor:'pointer',borderBottom:`1px solid ${BORDER}`,transition:'background 0.1s'}}>
                          <td style={{padding:'11px 14px'}}>
                            <div style={{fontSize:13,fontWeight:600,color:TXT}}>{u.display_name||<span style={{color:MUT}}>—</span>}</div>
                            <div style={{fontSize:11,color:DIM,marginTop:1}}>{u.email}</div>
                            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>{(u.subjectList||[]).slice(0,3).map(s=><span key={s} style={{fontSize:9,color:SC[s]||MUT,background:`${SC[s]||MUT}1a`,border:`1px solid ${SC[s]||MUT}33`,padding:'1px 5px',borderRadius:4,textTransform:'capitalize'}}>{s.replace(/-/g,' ')}</span>)}</div>
                          </td>
                          <td style={{padding:'11px 14px',fontSize:12,color:MUT,whiteSpace:'nowrap',fontFamily:numF}}>{fmtDate(u.created_at)}</td>
                          <td style={{padding:'11px 14px',fontSize:12,color:MUT,whiteSpace:'nowrap'}}>{timeSince(u.lastActive)}</td>
                          <td style={{padding:'11px 14px',fontSize:14,fontWeight:700,color:TXT,fontFamily:numF}}>{u.totalScores}</td>
                          <td style={{padding:'11px 14px',fontSize:13,fontWeight:600,fontFamily:numF,color:u.avgScore>=70?OK:u.avgScore>=50?WARN:u.avgScore?BAD:DIM}}>{u.avgScore?`${u.avgScore}%`:'—'}</td>
                          <td style={{padding:'11px 14px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:42,height:5,background:PANEL2,borderRadius:3,overflow:'hidden'}}><div style={{width:`${u.readiness}%`,height:'100%',background:R(u.readiness)}}/></div>
                              <span style={{fontSize:12,fontWeight:700,color:R(u.readiness),fontFamily:numF}}>{u.readiness}</span>
                            </div>
                          </td>
                          <td style={{padding:'11px 14px',fontSize:13,fontFamily:numF,color:u.totalErrors>10?WARN:MUT}}>{u.totalErrors}</td>
                          <td style={{padding:'11px 14px'}}>{u.tos_agreed_at?<span style={pill(OK,true)}>Yes</span>:<span style={pill('#64748b',true)}>—</span>}</td>
                          <td style={{padding:'11px 14px'}}>{u.is_admin?<span style={pill(ACCENT)}>Admin</span>:<span style={pill('#64748b',true)}>User</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* FINANCE */}
          {tab==='finance'&&<FinanceSection users={users} waitlist={waitlist}/>}

          {/* ANALYTICS */}
          {tab==='analytics'&&<AnalyticsDashboard users={users} referrals={referrals} groups={groups} groupMembers={groupMembers}/>}

          {/* QUERY */}
          {tab==='query'&&<QueryExplorer users={users}/>}

          {/* EXAMS */}
          {tab==='myplan'&&<MyRevisionPlan/>}

          {tab==='exams'&&<ExamEditor/>}

          {/* RESOURCES */}
          {tab==='resources'&&<ResourcesPanel/>}

          {/* BROADCAST */}
          {tab==='broadcast'&&<BroadcastPanel users={users}/>}

          {/* WAITLIST */}
          {tab==='waitlist'&&<WaitlistPanel/>}

          {/* SYSTEM */}
          {tab==='system'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>SYSTEM STATUS</div>
                {[
                  {l:'Supabase URL',v:import.meta.env.VITE_SUPABASE_URL?'Configured':'Missing',ok:!!import.meta.env.VITE_SUPABASE_URL},
                  {l:'Supabase Key',v:import.meta.env.VITE_SUPABASE_ANON_KEY?'Configured':'Missing',ok:!!import.meta.env.VITE_SUPABASE_ANON_KEY},
                  {l:'Total users in DB',v:stats.total,ok:true},
                  {l:'Users with data rows',v:stats.activated,ok:true},
                  {l:'Admin accounts',v:stats.admins,ok:stats.admins>0},
                ].map(({l,v,ok})=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{fontSize:11,color:MUT}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:700,color:ok?'#00E676':'#FF3D00'}}>{typeof v==='boolean'?(v?'Yes':'No'):v}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>ADMIN ACCOUNTS</div>
                {users.filter(u=>u.is_admin).map(u=>(
                  <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div>
                      <div style={{fontSize:12,color:TXT}}>{u.display_name||u.email}</div>
                      <div style={{fontSize:9,color:DIM,marginTop:1}}>{u.email}</div>
                    </div>
                    {u.id!==adminUser?.id&&(
                      <button onClick={()=>toggleAdmin(u)} style={btn('#FF3D00')}>REVOKE</button>
                    )}
                  </div>
                ))}
                <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.05)',fontSize:10,color:DIM,lineHeight:1.7}}>
                  Hardcoded admin fallback emails:<br/>
                  {ADMIN_EMAILS.map(e=><span key={e} style={{color:'#FF3D00'}}>{e}</span>)}
                </div>
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:14,fontWeight:700}}>DANGER ZONE</div>
                <div style={{fontSize:11,color:MUT,marginBottom:14,lineHeight:1.7}}>Destructive actions. These cannot be undone.</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <button onClick={exportCSV} style={{...btn('#00E676'),padding:'10px 16px',textAlign:'left'}}>↓ EXPORT ALL USER DATA (CSV)</button>
                </div>
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:14,fontWeight:700}}>LOGGED IN AS</div>
                <div style={{fontSize:13,color:TXT,marginBottom:4}}>{adminProfile?.display_name||'Admin'}</div>
                <div style={{fontSize:11,color:MUT,marginBottom:16}}>{adminUser?.email}</div>
                <button onClick={onLogout} style={{...btn('#FF3D00',true),padding:'10px 20px'}}>LOGOUT → SIGN OUT</button>
              </div>
            </div>
          )}

          <div style={{fontSize:11,color:DIM,marginTop:28,textAlign:'center'}}>Battle Plan · Admin Console · all actions are logged</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
// ── My Revision Plan (private — admin/owner only) ──────────────────────────
// A personal cockpit for the three papers the owner flagged as "forgotten":
// FP1, OCR CS Paper 2, and Edexcel Maths Paper 3 (Stats & Mechanics). Dates are
// the verified summer-2026 board dates. Checklists persist in localStorage.
const MY_PLAN_SUBJECTS = [
  {
    key:'csp2', name:'CS Paper 2 — Algorithms & Programming', code:'OCR H446/02',
    date:'2026-06-17', time:'AM', color:'#00E676',
    topics:[
      'Computational thinking: abstraction, decomposition, thinking ahead/procedurally/logically',
      'Programming techniques: recursion, parameters & scope, OOP (classes, inheritance, encapsulation)',
      'Computational methods: divide & conquer, backtracking, heuristics, performance modelling, pipelining',
      'Big-O complexity: constant, linear, polynomial, exponential — best/worst case',
      'Searching: linear search, binary search (and when each applies)',
      'Sorting: bubble, insertion, merge, quick — how they work + complexity',
      'Data structures: arrays, records, lists, tuples, stacks, queues',
      'Graphs & trees: representation, traversal (DFS/BFS), binary search trees',
      'Dijkstra’s shortest path + A* — trace through by hand',
      'Hash tables & dictionaries: collisions, why O(1) lookup',
    ],
  },
  {
    key:'stats', name:'Statistics — Maths Paper 3', code:'Edexcel 9MA0/03',
    date:'2026-06-18', time:'PM', color:'#40C4FF',
    topics:[
      'Sampling: random, systematic, stratified, quota, opportunity + the Large Data Set',
      'Data presentation: histograms, box plots, cumulative frequency, outliers',
      'Measures: mean, sd, interpolation for medians/quartiles, coding',
      'Correlation & regression: PMCC, regression lines, interpretation in context',
      'Probability: Venn diagrams, tree diagrams, conditional, set notation',
      'Binomial distribution: P(X=x), cumulative, modelling assumptions',
      'Normal distribution: probabilities, inverse normal, approximating binomial',
      'Hypothesis testing: binomial test, correlation (PMCC) test, normal mean — full method',
    ],
  },
  {
    key:'mech', name:'Mechanics — Maths Paper 3', code:'Edexcel 9MA0/03',
    date:'2026-06-18', time:'PM', color:'#FFD600',
    topics:[
      'Kinematics: suvat (constant acceleration) + motion graphs',
      'Kinematics: variable acceleration with calculus + vectors (i, j)',
      'Forces & Newton’s laws: F = ma, weight, normal reaction',
      'Connected particles: pulleys, lifts, tow ropes',
      'Friction & inclined planes: μ, limiting equilibrium, resolving',
      'Projectiles: horizontal & angled, range, time of flight, greatest height',
      'Moments: equilibrium of rigid bodies, tilting/about to rotate',
      'Vectors in mechanics: forces as vectors, equilibrium',
    ],
  },
  {
    key:'fp1', name:'Further Pure 1 (FP1)', code:'Edexcel 9FM0/3A',
    date:'2026-06-19', time:'PM', color:'#E040FB',
    topics:[
      'Coordinate systems: parabola & rectangular hyperbola — tangents, normals, loci',
      'Coordinate systems: ellipse & hyperbola — foci, directrices, eccentricity',
      'Inequalities: algebraic, modulus, using graphs',
      'Further trigonometry: the t = tan(½θ) substitution',
      'Series: method of differences',
      'Maclaurin & Taylor series',
      'Further calculus: improper integrals, mean value, arc length, surface of revolution',
      'Further vectors: vector (cross) product, scalar triple product, lines & planes',
      'Further differential equations: Taylor series method, reducible equations',
      'Further numerical methods: numerical solution of differential equations',
    ],
  },
];

function MyRevisionPlan() {
  const STORE_KEY='rbp_myplan_done_v1';
  const [done,setDone]=useState(()=>{ try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}');}catch{return{};} });
  const toggle=id=>setDone(p=>{ const n={...p,[id]:!p[id]}; try{localStorage.setItem(STORE_KEY,JSON.stringify(n));}catch{} return n; });

  const today=new Date(); today.setHours(0,0,0,0);
  const dleft=iso=>Math.round((new Date(iso+'T00:00:00')-today)/86400000);
  const fmtLong=iso=>new Date(iso+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});

  const totalTopics=MY_PLAN_SUBJECTS.reduce((a,s)=>a+s.topics.length,0);
  const totalDone=MY_PLAN_SUBJECTS.reduce((a,s)=>a+s.topics.filter((_,i)=>done[`${s.key}_${i}`]).length,0);
  const overallPct=Math.round(totalDone/totalTopics*100);

  return (
    <div style={{maxWidth:1100}}>
      {/* Banner */}
      <div style={{...card,padding:'18px 22px',marginBottom:16,borderColor:'rgba(255,61,0,0.25)'}}>
        <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:0.3}}>MISSION: A* — final push 🎯</div>
        <div style={{fontSize:12,color:MUT,marginTop:6,lineHeight:1.6}}>
          Your three flagged papers, in date order. Relearn fast with active recall + past papers — reading notes alone won’t move the needle. Tick topics as you genuinely master them (you can redo a paper question on it without notes). Progress saves to this browser.
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginTop:14}}>
          <div style={{flex:1,height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${overallPct}%`,background:overallPct>=70?'#00E676':overallPct>=40?'#FFD600':'#FF9100',transition:'width 0.3s'}}/>
          </div>
          <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{totalDone}/{totalTopics} <span style={{color:DIM,fontWeight:400}}>({overallPct}%)</span></div>
        </div>
      </div>

      {/* Countdown cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginBottom:18}}>
        {MY_PLAN_SUBJECTS.filter((s,i,arr)=>arr.findIndex(x=>x.date===s.date&&x.code===s.code)===i).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(s=>{
          const d=dleft(s.date);
          return (
            <div key={s.code+s.date} style={{...card,padding:'14px 16px',borderColor:`${s.color}33`}}>
              <div style={{fontSize:10,color:MUT,letterSpacing:1.5,textTransform:'uppercase'}}>{s.code}</div>
              <div style={{fontSize:13,fontWeight:700,color:TXT,margin:'4px 0 8px',lineHeight:1.3}}>{s.name.replace(/ —.*/,'')}</div>
              <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                <span style={{fontSize:30,fontWeight:900,color:d<=3?'#FF3D00':d<=7?'#FF9100':s.color,lineHeight:1}}>{d>0?d:d===0?'TODAY':'—'}</span>
                {d>0&&<span style={{fontSize:11,color:DIM}}>days</span>}
              </div>
              <div style={{fontSize:11,color:MUT,marginTop:6}}>{fmtLong(s.date)} · {s.time}</div>
            </div>
          );
        })}
      </div>

      {/* Daily engine */}
      <div style={{...card,padding:'16px 20px',marginBottom:18}}>
        <div style={{fontSize:9,letterSpacing:3,color:SEC,fontWeight:700,marginBottom:12}}>THE 12-HOUR DAY (REPEAT DAILY)</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          {[
            ['Block 1 · 3h','Weakest subject. Relearn 1–2 topics: watch/read → worked examples → 8–10 practice questions. No passive reading.'],
            ['Block 2 · 3h','Second subject, same method. Switch subjects to stay sharp — interleaving beats blocking.'],
            ['Block 3 · 3h','One FULL past paper under timed, silent, no-notes conditions. This is non-negotiable from ~12 June.'],
            ['Block 4 · 2–3h','Mark it brutally. Log every error, redo each missed question, then 20 min flashcards/active recall of today’s topics.'],
          ].map(([t,b])=>(
            <div key={t} style={{...card,padding:'12px 14px'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#FF6D00',marginBottom:5}}>{t}</div>
              <div style={{fontSize:11.5,color:'#bbb',lineHeight:1.6}}>{b}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:DIM,marginTop:12,lineHeight:1.7}}>
          50-min focus / 10-min break (Pomodoro). Protect <strong style={{color:MUT}}>7–8h sleep</strong> — it’s when memory consolidates; an all-nighter loses you more marks than it gains. Eat, move, hydrate. <br/>
          <strong style={{color:MUT}}>Phase 1 (now → ~11 Jun):</strong> relearn topic-by-topic. <strong style={{color:MUT}}>Phase 2 (12–16 Jun):</strong> past papers daily + error log. <strong style={{color:MUT}}>Exam days 17–19:</strong> light review of summary sheets + technique, then rest.
        </div>
      </div>

      {/* Per-subject checklists */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:12}}>
        {MY_PLAN_SUBJECTS.map(s=>{
          const sDone=s.topics.filter((_,i)=>done[`${s.key}_${i}`]).length;
          const pct=Math.round(sDone/s.topics.length*100);
          return (
            <div key={s.key} style={{...card,padding:'16px 18px',borderColor:`${s.color}2a`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:800,color:s.color}}>{s.name}</div>
                <div style={{fontSize:11,fontWeight:700,color:pct===100?'#00E676':MUT}}>{sDone}/{s.topics.length}</div>
              </div>
              <div style={{fontSize:10,color:MUT,marginBottom:12}}>{s.code} · {fmtLong(s.date)} · {s.time}</div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {s.topics.map((t,i)=>{
                  const id=`${s.key}_${i}`; const isDone=!!done[id];
                  return (
                    <label key={id} style={{display:'flex',gap:9,alignItems:'flex-start',padding:'7px 6px',borderRadius:6,cursor:'pointer',background:isDone?'rgba(0,230,118,0.05)':'transparent'}}>
                      <input type="checkbox" checked={isDone} onChange={()=>toggle(id)} style={{marginTop:2,accentColor:s.color,cursor:'pointer',flexShrink:0}}/>
                      <span style={{fontSize:12,lineHeight:1.5,color:isDone?DIM:'#cfcdc9',textDecoration:isDone?'line-through':'none'}}>{t}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{...card,padding:'12px 16px',marginTop:16,fontSize:11,color:DIM,lineHeight:1.7,borderColor:'rgba(255,255,255,0.06)'}}>
        Topic lists are a strong starting point — open your spec/checklist and add anything missing on paper. If you also have <strong style={{color:MUT}}>CS Paper 1 (10 Jun)</strong> and <strong style={{color:MUT}}>Maths Paper 2 (11 Jun)</strong> on your timetable, those come first — slot them into Phase 1. One bad paper does not sink three A*s; consistent daily reps do the opposite. You’ve got this.
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [phase,setPhase]=useState('init');
  const [adminUser,setAdminUser]=useState(null);
  const [adminProfile,setAdminProfile]=useState(null);

  // Paint html+body to the console's slate so overscroll never reveals white.
  useEffect(()=>{
    const html=document.documentElement, body=document.body;
    html.style.background=BG; body.style.background=BG;
    body.style.margin='0'; body.style.overscrollBehavior='none';
  },[]);

  useEffect(()=>{
    let alive=true;
    async function checkAdmin(session) {
      if (!session?.user) { if (alive) setPhase('login'); return; }
      const email=session.user.email;
      const {data:prof}=await supabase.from('user_profiles').select('*').eq('id',session.user.id).single();
      if (!alive) return;
      // Admin status comes from the DB column only (server-controlled).
      // First admin must be set via SQL (bootstrap one-time).
      const isAdmin=!!prof?.is_admin;
      if (isAdmin) {
        setAdminUser(session.user);
        setAdminProfile(prof);
        setPhase('authed');
      } else {
        await supabase.auth.signOut();
        if (alive) setPhase('login');
      }
    }
    supabase.auth.getSession().then(({data:{session}})=>checkAdmin(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==='SIGNED_IN') checkAdmin(session);
      else if (event==='SIGNED_OUT'&&alive) { setAdminUser(null); setAdminProfile(null); setPhase('login'); }
    });
    return ()=>{ alive=false; subscription.unsubscribe(); };
  },[]);

  const handleAuth=(user,prof)=>{ setAdminUser(user); setAdminProfile(prof); setPhase('authed'); };
  const handleLogout=async()=>{ await supabase.auth.signOut(); setAdminUser(null); setAdminProfile(null); setPhase('login'); };

  if (phase==='init') return (
    <div style={{minHeight:'100vh',background:'#050508',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:mono,color:'#cc4422',fontSize:11,letterSpacing:3}}>
      // INITIALISING SYSTEM...
    </div>
  );
  if (phase==='login') return <LoginScreen onAuth={handleAuth}/>;
  return <Dashboard adminUser={adminUser} adminProfile={adminProfile} onLogout={handleLogout}/>;
}
