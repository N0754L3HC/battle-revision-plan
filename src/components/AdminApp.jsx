import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────
const mono = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const ADMIN_EMAILS = ['51r4h100@gmail.com'];
const GC = { 'A*':'#00E676', A:'#69F0AE', B:'#FFD600', C:'#FF9100', D:'#FF6D00', E:'#FF3D00', U:'#555' };
const SC = { maths:'#3b82f6','further-maths':'#E040FB',cs:'#00E676',chemistry:'#FF4081',physics:'#40C4FF',economics:'#FFD600',biology:'#84cc16',history:'#fb923c',psychology:'#a78bfa',geography:'#22d3ee' };
const GRADE_BOUNDS = { Maths:{'A*':80,A:70,B:60,C:50,D:40,E:30},'Further Maths':{'A*':83,A:72,B:60,C:50,D:40,E:30},CS:{'A*':75,A:65,B:55,C:45,D:35,E:25},Chemistry:{'A*':80,A:70,B:60,C:50,D:40,E:30},Physics:{'A*':80,A:70,B:60,C:50,D:40,E:30},Economics:{'A*':75,A:65,B:55,C:45,D:35,E:25} };
const R = (r) => r>=80?'#00E676':r>=60?'#FFD600':r>=40?'#FF9100':'#FF3D00';

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
const iS = {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'10px 14px',color:'#ddd',fontSize:13,fontFamily:mono,outline:'none',width:'100%',boxSizing:'border-box'};
const card = {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8};
const btn = (col='#FF3D00',fill=false) => ({background:fill?col:'transparent',border:`1px solid ${col}66`,color:fill?'#fff':col,padding:'6px 14px',borderRadius:5,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:mono,letterSpacing:1,transition:'all 0.15s'});
// colour tokens — all readable on #050508 background
const DIM = '#5a5550';   // timestamps, ranks, footnotes
const MUT = '#8a8480';   // secondary labels, sub-text
const SEC = '#b04020';   // section header labels (red-ish but legible)

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
    const isAdmin=prof?.is_admin||ADMIN_EMAILS.includes(data.user.email);
    if (!isAdmin) { await supabase.auth.signOut(); setLoading(false); setStatus('denied'); setTimeout(()=>setStatus('idle'),3000); return; }
    if (!prof?.is_admin) await supabase.from('user_profiles').update({is_admin:true}).eq('id',data.user.id);
    setStatus('ok');
    setTimeout(()=>onAuth(data.user,{...prof,is_admin:true}),600);
  };

  const googleLogin=async()=>{
    setLoading(true); setErr('');
    sessionStorage.setItem('rbp_goto_admin','1');
    await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
  };

  return (
    <div style={{minHeight:'100vh',background:'#050508',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:mono,padding:16,position:'relative',overflow:'hidden'}}>
      <div style={{position:'fixed',top:'22%',left:'50%',transform:'translate(-50%,-50%)',width:900,height:500,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(255,30,0,0.05) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{width:'100%',maxWidth:380,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:44}}>
          <div style={{fontSize:9,letterSpacing:5,color:'#3d1810',marginBottom:16,fontWeight:700}}>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
          <div style={{fontSize:34,fontWeight:900,color:'#FF3D00',letterSpacing:10,marginBottom:4}}>GOD MODE</div>
          <div style={{fontSize:9,letterSpacing:3,color:'#cc4422',marginTop:2}}>A* BATTLE PLAN · RESTRICTED SYSTEM ACCESS</div>
          <div style={{fontSize:9,letterSpacing:5,color:'#3d1810',marginTop:16,fontWeight:700}}>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
        </div>
        <div style={{fontSize:11,color:'#cc4422',marginBottom:18,letterSpacing:1,minHeight:18}}>
          {status==='checking'?'// VERIFYING CREDENTIALS...':status==='denied'?'// ACCESS DENIED — UNAUTHORIZED':status==='ok'?'// ACCESS GRANTED — LOADING...':(<>// ENTER CREDENTIALS <Cursor/></>)}
        </div>
        {status==='denied'&&<div style={{background:'rgba(255,0,0,0.06)',border:'1px solid rgba(255,0,0,0.2)',borderRadius:6,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#FF3D00',letterSpacing:0.5}}>⛔ ADMINISTRATOR PRIVILEGES REQUIRED</div>}
        {err&&status==='idle'&&<div style={{color:'#FF6D00',fontSize:12,marginBottom:12}}>{err}</div>}
        <div style={{opacity:status!=='idle'?0.3:1,transition:'opacity 0.3s',pointerEvents:status!=='idle'?'none':'auto'}}>
          <div style={{fontSize:9,color:'#cc4422',letterSpacing:2,marginBottom:5,fontWeight:700}}>EMAIL</div>
          <input style={{...iS,marginBottom:11,border:'1px solid rgba(255,61,0,0.25)',background:'rgba(255,61,0,0.04)'}} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} autoComplete="username" placeholder="admin@example.com"/>
          <div style={{fontSize:9,color:'#cc4422',letterSpacing:2,marginBottom:5,fontWeight:700}}>PASSWORD</div>
          <input style={{...iS,marginBottom:20,border:'1px solid rgba(255,61,0,0.25)',background:'rgba(255,61,0,0.04)'}} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} autoComplete="current-password" placeholder="················"/>
          <button onClick={attempt} disabled={loading} style={{width:'100%',padding:'13px',background:'rgba(255,61,0,0.9)',border:'1px solid rgba(255,61,0,0.6)',borderRadius:6,color:'#fff',fontSize:12,fontWeight:800,fontFamily:mono,letterSpacing:3,cursor:'pointer'}}>
            {status==='checking'?'VERIFYING...':status==='ok'?'GRANTED ✓':'ACCESS SYSTEM →'}
          </button>
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'16px 0'}}>
            <div style={{flex:1,height:1,background:'rgba(255,61,0,0.12)'}}/><div style={{fontSize:9,color:'#aa4422',letterSpacing:2}}>OR</div><div style={{flex:1,height:1,background:'rgba(255,61,0,0.12)'}}/>
          </div>
          <button onClick={googleLogin} disabled={loading} style={{width:'100%',padding:'12px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,61,0,0.14)',borderRadius:6,color:'#cc7755',fontSize:11,fontWeight:700,fontFamily:mono,letterSpacing:2,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 19.07 12H12v4h7.93A8 8 0 1 1 12 4a7.93 7.93 0 0 1 5.4 2.1L14.93 8.6A4.5 4.5 0 0 0 12 7.5a4.49 4.49 0 0 0-4.24 3L5.27 9.76Z"/></svg>
            CONTINUE WITH GOOGLE
          </button>
        </div>
        <div style={{fontSize:9,color:'#6a3020',marginTop:28,textAlign:'center',letterSpacing:1.5}}>UNAUTHORIZED ACCESS IS PROHIBITED AND MONITORED</div>
      </div>
    </div>
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────
function UserDetail({u,onClose,onToggleAdmin,onDeleteUser}) {
  const [toggling,setToggling]=useState(false);
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

  const doToggle=async()=>{ setToggling(true); await onToggleAdmin(u); setToggling(false); };
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {[{v:allScores.length,l:'PAPERS',c:'#fff'},{v:allErrors.length,l:'ERRORS',c:allErrors.length>10?'#FF9100':'#fff'},{v:`${br.avg}%`,l:'AVG SCORE',c:br.avg>=70?'#00E676':br.avg>=50?'#FFD600':'#FF3D00'},{v:u.subjectList?.length||0,l:'SUBJECTS',c:'#40C4FF'}].map(({v,l,c})=>(
              <div key={l} style={{...card,padding:'14px 16px'}}>
                <div style={{fontSize:28,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
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
                <div key={sub} style={{...card,padding:'12px 16px',minWidth:140,flex:'1 1 140px',borderColor:`${SC[sub]||'#888'}33`}}>
                  <div style={{fontSize:9,letterSpacing:2,color:'#aaa',marginBottom:6,textTransform:'uppercase'}}>{sub.replace(/-/g,' ')}</div>
                  <div style={{fontSize:32,fontWeight:900,color:GC[g]||'#555'}}>{g}</div>
                  <div style={{fontSize:11,color:'#777',marginTop:2}}>{avg}% · {n} paper{n!==1?'s':''}</div>
                  <Spark scores={allScores.filter(s=>s.subject===sub)} color={SC[sub]||'#888'} w={80} h={20}/>
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
                <span style={pill(SC[sc.subject]||'#888')}>{sc.subject}</span>
                <span style={{color:'#aaa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sc.paper}</span>
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                <span style={{color:MUT,fontSize:10}}>{sc.date}</span>
                <span style={{color:'#aaa'}}>{sc.got}/{sc.max??sc.maxMark??100}</span>
                <span style={{fontWeight:800,color:GC[gradeFromPct(sc.pct,sc.subject)]}}>{sc.pct}%</span>
              </div>
            </div>
          ))}
          {allScores.length>30&&<div style={{fontSize:11,color:DIM,marginTop:8}}>+ {allScores.length-30} more</div>}
        </div>
        {/* Errors */}
        <div style={{...card,padding:'16px 20px'}}>
          <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:12}}>ERROR LOG ({allErrors.length})</div>
          {allErrors.length===0?<div style={{color:DIM,fontSize:12}}>No errors logged.</div>:allErrors.slice(0,20).map((e,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={pill(SC[e.subject]||'#888',true)}>{e.subject||'?'}</span>
                <span style={{color:'#ccc'}}>{e.topic}</span>
                {e.note&&<span style={{color:MUT,fontSize:11}}>— {e.note}</span>}
              </div>
              <span style={pill('#FF9100',true)}>{e.type}</span>
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
            <div style={{fontSize:12,fontWeight:700,color:'#ddd',marginBottom:4}}>{b.title}</div>
            <div style={{fontSize:11,color:'#aaa',marginBottom:6,lineHeight:1.5}}>{b.body}</div>
            <div style={{fontSize:9,color:DIM}}>{fmtDate(b.created_at)} · {b.recipient_count||0} recipients</div>
          </div>
        ))}
      </div>
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
    const {data}=await supabase.from('app_config').select('value').eq('key','exam_schedule').single();
    if (data?.value) {
      try { setSchedule(typeof data.value==='string'?JSON.parse(data.value):data.value); } catch(_) {}
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
            <span style={{fontSize:14,fontWeight:700,color:'#ddd'}}>
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
          Changes are saved to the <code style={{color:'#888'}}>app_config</code> Supabase table (key: <code style={{color:'#888'}}>exam_schedule</code>). The main app reads this on login and merges with built-in dates. Requires an <code style={{color:'#888'}}>app_config</code> table with columns <code style={{color:'#888'}}>key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ</code>.
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
              <div style={{fontSize:13,color:'#ddd',fontWeight:600,marginBottom:3}}>{file.name}</div>
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
          Requires Supabase Storage bucket <code style={{color:'#888'}}>resources</code> (public) and a <code style={{color:'#888'}}>resources</code> table with columns: id, title, description, file_url, file_name, file_size, storage_path, created_at.
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
                <div style={{fontSize:13,fontWeight:700,color:'#ddd',marginBottom:3}}>{r.title}</div>
                {r.description&&<div style={{fontSize:11,color:'#aaa',marginBottom:6,lineHeight:1.5}}>{r.description}</div>}
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

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({adminUser,adminProfile,onLogout}) {
  const [users,setUsers]=useState([]);
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
    const [{data:profiles},{data:userData}]=await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('user_data').select('*'),
    ]);
    if (!profiles) { setLoading(false); return; }
    const merged=profiles.map(p=>{
      const rows=(userData||[]).filter(d=>d.user_id===p.id);
      const scores={},errors={},checks={},targets={};
      rows.forEach(r=>{ scores[r.profile]=r.scores||[]; errors[r.profile]=r.errors||[]; checks[r.profile]=r.checks||{}; targets[r.profile]=r.targets||{}; });
      const allS=Object.values(scores).flat();
      const allE=Object.values(errors).flat();
      const lastA=rows.length?rows.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0].updated_at:p.created_at;
      const br=calcReadiness(allS,allE);
      let subjectList=[];
      try { if (p.subjects) { const ps=JSON.parse(p.subjects); if (Array.isArray(ps)) subjectList=ps.map(s=>s.subjectId||s.subject||'').filter(Boolean); } } catch(_) {}
      return {...p,scores,errors,checks,targets,subjectList,allScores:allS,totalScores:allS.length,totalErrors:allE.length,lastActive:lastA,readiness:br.t,avgScore:br.avg};
    });
    setUsers(merged);
    setLastRefresh(new Date());
    setLoading(false);
    setSelected(prev=>prev?merged.find(u=>u.id===prev.id)||null:null);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  const toggleAdmin=async(u)=>{
    const next=!u.is_admin;
    await supabase.from('user_profiles').update({is_admin:next}).eq('id',u.id);
    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,is_admin:next}:x));
    setSelected(prev=>prev?.id===u.id?{...prev,is_admin:next}:prev);
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
    avgReadiness:users.length?Math.round(users.reduce((a,u)=>a+u.readiness,0)/users.length):0,
    admins:users.filter(u=>u.is_admin).length,
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

  const TABS=['overview','users','analytics','exams','resources','broadcast','system'];

  return (
    <>
      {selected&&<UserDetail u={selected} onClose={()=>setSelected(null)} onToggleAdmin={toggleAdmin} onDeleteUser={deleteUser}/>}
      <div style={{minHeight:'100vh',background:'#050508',color:'#d0ccc8',fontFamily:mono}}>
        {/* Top bar */}
        <div style={{position:'sticky',top:0,zIndex:50,background:'rgba(5,5,8,0.98)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,61,0,0.1)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:50}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:14,fontWeight:900,color:'#FF3D00',letterSpacing:5}}>GOD MODE</span>
            <span style={{background:'rgba(255,61,0,0.1)',border:'1px solid rgba(255,61,0,0.25)',color:'#FF3D00',fontSize:8,fontWeight:900,letterSpacing:2,padding:'2px 7px',borderRadius:3}}>ADMIN</span>
            <div style={{display:'flex',gap:1,marginLeft:6}}>
              {TABS.map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?'rgba(255,61,0,0.1)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'#FF3D00':'transparent'}`,color:tab===t?'#FF3D00':'#7a7570',padding:'0 12px',height:50,cursor:'pointer',fontSize:10,fontFamily:mono,letterSpacing:1,fontWeight:700,transition:'all 0.15s'}}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {lastRefresh&&<span style={{fontSize:9,color:'#8a4030'}}>↺ {timeSince(lastRefresh)}</span>}
            <button onClick={loadData} disabled={loading} style={btn()}>REFRESH</button>
            <button onClick={exportCSV} style={btn('#00E676')}>↓ CSV</button>
            <span style={{fontSize:10,color:DIM,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{adminProfile?.email||adminUser?.email}</span>
            <button onClick={onLogout} style={btn('#FF3D00')}>LOGOUT</button>
          </div>
        </div>

        <div style={{maxWidth:1280,margin:'0 auto',padding:'24px 24px 80px'}}>
          {/* Stat cards — always visible */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:8,marginBottom:20}}>
            {[
              {v:stats.total,l:'USERS',c:'#FF3D00'},
              {v:stats.activeWeek,l:'ACTIVE / WEEK',c:stats.activeWeek>0?'#00E676':'#555'},
              {v:stats.newWeek,l:'NEW / WEEK',c:stats.newWeek>0?'#FFD600':'#555'},
              {v:stats.activated,l:'ACTIVATED',c:'#40C4FF'},
              {v:stats.totalPapers,l:'PAPERS',c:'#fff'},
              {v:stats.totalErrors,l:'ERRORS',c:'#FF9100'},
              {v:stats.avgReadiness,l:'AVG READY',c:R(stats.avgReadiness)},
              {v:stats.admins,l:'ADMINS',c:'#FF3D00'},
            ].map(({v,l,c})=>(
              <div key={l} style={{...card,padding:'12px 14px'}}>
                <div style={{fontSize:24,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:9,color:'#b07060',letterSpacing:1.5,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab==='overview'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>TOP BY READINESS</div>
                {topByReadiness.map((u,i)=>(
                  <div key={u.id} onClick={()=>setSelected(u)} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}>
                    <span style={{fontSize:11,color:DIM,width:16,textAlign:'right'}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.display_name||u.email}</div>
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
                      <div style={{fontSize:12,color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.display_name||u.email}</div>
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
                    <span style={{fontSize:11,color:'#aaa'}}>{l}</span>
                    <span style={{fontSize:14,fontWeight:800,color:c}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>SUBJECT POPULARITY</div>
                {topSubjects.slice(0,6).map(([s,n])=>(
                  <div key={s} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#666',marginBottom:3}}>
                      <span style={{textTransform:'capitalize',color:SC[s]||'#888'}}>{s.replace(/-/g,' ')}</span>
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
              <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
                <input style={{...iS,flex:1}} placeholder="// search by email, name, or subject..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <button onClick={()=>setFilterAdmin(p=>!p)} style={{...btn('#FF3D00'),background:filterAdmin?'rgba(255,61,0,0.12)':'transparent',whiteSpace:'nowrap'}}>ADMINS ONLY</button>
                <button onClick={()=>setFilterActive(p=>!p)} style={{...btn('#00E676'),background:filterActive?'rgba(0,230,118,0.1)':'transparent',whiteSpace:'nowrap'}}>ACTIVE WEEK</button>
                <span style={{fontSize:10,color:DIM,whiteSpace:'nowrap'}}>{filtered.length} / {users.length}</span>
              </div>
              {loading?<div style={{color:'#cc4422',fontSize:12,padding:40,textAlign:'center',letterSpacing:2}}>// LOADING USER DATA...</div>:(
                <div style={{...card,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid rgba(255,61,0,0.1)'}}>
                        {[{k:'email',l:'USER'},{k:'created_at',l:'JOINED'},{k:'lastActive',l:'LAST ACTIVE'},{k:'totalScores',l:'PAPERS'},{k:'avgScore',l:'AVG'},{k:'readiness',l:'READINESS'},{k:'totalErrors',l:'ERRORS'},{k:'tos_agreed_at',l:'ToS'},{k:'is_admin',l:'ROLE'}].map(({k,l})=>(
                          <th key={k} onClick={()=>cycleSort(k)} style={{textAlign:'left',padding:'10px 14px',fontSize:10,color:'#c05030',letterSpacing:1.5,fontWeight:700,cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                            {l} <span style={{opacity:0.5,fontSize:9}}>{sa(k)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0&&<tr><td colSpan={9} style={{padding:'32px 14px',color:DIM,fontSize:12,textAlign:'center'}}>No users found.</td></tr>}
                      {filtered.map(u=>(
                        <tr key={u.id} onClick={()=>setSelected(u)} onMouseEnter={()=>setHover(u.id)} onMouseLeave={()=>setHover(null)}
                          style={{background:hover===u.id?'rgba(255,61,0,0.04)':'transparent',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.025)',transition:'background 0.1s'}}>
                          <td style={{padding:'10px 14px'}}>
                            <div style={{fontSize:12,fontWeight:600,color:'#ddd'}}>{u.display_name||<span style={{color:MUT}}>—</span>}</div>
                            <div style={{fontSize:9,color:DIM,marginTop:1}}>{u.email}</div>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>{(u.subjectList||[]).slice(0,3).map(s=><span key={s} style={{fontSize:7,color:'#FF3D00',background:'rgba(255,61,0,0.08)',border:'1px solid rgba(255,61,0,0.18)',padding:'1px 4px',borderRadius:2,textTransform:'capitalize'}}>{s.replace(/-/g,' ')}</span>)}</div>
                          </td>
                          <td style={{padding:'10px 14px',fontSize:10,color:MUT,whiteSpace:'nowrap'}}>{fmtDate(u.created_at)}</td>
                          <td style={{padding:'10px 14px',fontSize:10,color:MUT,whiteSpace:'nowrap'}}>{timeSince(u.lastActive)}</td>
                          <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:'#fff'}}>{u.totalScores}</td>
                          <td style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:u.avgScore>=70?'#00E676':u.avgScore>=50?'#FFD600':'#FF3D00'}}>{u.avgScore?`${u.avgScore}%`:'—'}</td>
                          <td style={{padding:'10px 14px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <div style={{width:36,height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden'}}><div style={{width:`${u.readiness}%`,height:'100%',background:R(u.readiness)}}/></div>
                              <span style={{fontSize:11,fontWeight:700,color:R(u.readiness)}}>{u.readiness}</span>
                            </div>
                          </td>
                          <td style={{padding:'10px 14px',fontSize:12,color:u.totalErrors>10?'#FF9100':'#666'}}>{u.totalErrors}</td>
                          <td style={{padding:'10px 14px'}}>{u.tos_agreed_at?<span style={pill('#00E676',true)}>✓</span>:<span style={pill('#555',true)}>—</span>}</td>
                          <td style={{padding:'10px 14px'}}>{u.is_admin?<span style={pill('#FF3D00')}>ADMIN</span>:<span style={pill('#444',true)}>USER</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ANALYTICS */}
          {tab==='analytics'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>SUBJECT POPULARITY</div>
                {topSubjects.map(([s,n])=>(
                  <div key={s} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                      <span style={{textTransform:'capitalize',color:SC[s]||'#888'}}>{s.replace(/-/g,' ')}</span>
                      <span style={{color:'#FF3D00'}}>{n} user{n!==1?'s':''} &nbsp;<span style={{color:DIM}}>({users.length?Math.round((n/users.length)*100):0}%)</span></span>
                    </div>
                    <div style={{height:5,background:'rgba(255,255,255,0.04)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(n/maxSub)*100}%`,background:SC[s]||'#FF3D00',borderRadius:3}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>READINESS DISTRIBUTION</div>
                {[{l:'Battle Ready (80+)',min:80,max:101,c:'#00E676'},{l:'On Track (60–79)',min:60,max:80,c:'#FFD600'},{l:'Building (40–59)',min:40,max:60,c:'#FF9100'},{l:'Just Started (<40)',min:0,max:40,c:'#FF3D00'}].map(({l,min,max,c})=>{
                  const count=users.filter(u=>u.readiness>=min&&u.readiness<max).length;
                  const pct=users.length?Math.round((count/users.length)*100):0;
                  return (
                    <div key={l} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                        <span style={{color:c,fontWeight:700}}>{l}</span>
                        <span style={{color:'#aaa'}}>{count} ({pct}%)</span>
                      </div>
                      <div style={{height:5,background:'rgba(255,255,255,0.04)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:3}}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[{l:'Activation rate',v:`${users.length?Math.round((stats.activated/users.length)*100):0}%`},{l:'Avg papers/user',v:users.length?Math.round(stats.totalPapers/users.length):0},{l:'Avg readiness',v:stats.avgReadiness},{l:'Total papers',v:stats.totalPapers}].map(({l,v})=>(
                    <div key={l}><div style={{fontSize:9,color:DIM}}>{l}</div><div style={{fontSize:16,fontWeight:700,color:'#ccc'}}>{v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>SCORE DISTRIBUTION BY GRADE</div>
                {['A*','A','B','C','D','E','U'].map(g=>{
                  const count=users.reduce((a,u)=>a+u.allScores.filter(s=>gradeFromPct(s.pct,s.subject)===g).length,0);
                  const total=stats.totalPapers||1;
                  return (
                    <div key={g} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{...pill(GC[g]),minWidth:26,textAlign:'center'}}>{g}</span>
                      <div style={{flex:1,height:4,background:'rgba(255,255,255,0.04)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${(count/total)*100}%`,background:GC[g],borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:10,color:'#aaa',minWidth:40,textAlign:'right'}}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>ERROR PATTERN ACROSS ALL USERS</div>
                {(()=>{
                  const et={};
                  users.forEach(u=>Object.values(u.errors||{}).flat().forEach(e=>{et[e.type]=(et[e.type]||0)+1;}));
                  const top=Object.entries(et).sort((a,b)=>b[1]-a[1]).slice(0,8);
                  const mx=top[0]?.[1]||1;
                  return top.map(([t,n])=>(
                    <div key={t} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontSize:10,color:'#FF9100',minWidth:100,textTransform:'capitalize'}}>{t}</span>
                      <div style={{flex:1,height:4,background:'rgba(255,255,255,0.04)',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${(n/mx)*100}%`,background:'#FF9100',borderRadius:2,opacity:0.7}}/>
                      </div>
                      <span style={{fontSize:10,color:'#aaa',minWidth:30,textAlign:'right'}}>{n}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* EXAMS */}
          {tab==='exams'&&<ExamEditor/>}

          {/* RESOURCES */}
          {tab==='resources'&&<ResourcesPanel/>}

          {/* BROADCAST */}
          {tab==='broadcast'&&<BroadcastPanel users={users}/>}

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
                    <span style={{fontSize:11,color:'#aaa'}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:700,color:ok?'#00E676':'#FF3D00'}}>{typeof v==='boolean'?(v?'Yes':'No'):v}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:16,fontWeight:700}}>ADMIN ACCOUNTS</div>
                {users.filter(u=>u.is_admin).map(u=>(
                  <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div>
                      <div style={{fontSize:12,color:'#ddd'}}>{u.display_name||u.email}</div>
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
                <div style={{fontSize:11,color:'#aaa',marginBottom:14,lineHeight:1.7}}>Destructive actions. These cannot be undone.</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <button onClick={exportCSV} style={{...btn('#00E676'),padding:'10px 16px',textAlign:'left'}}>↓ EXPORT ALL USER DATA (CSV)</button>
                </div>
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontSize:9,letterSpacing:3,color:SEC,marginBottom:14,fontWeight:700}}>LOGGED IN AS</div>
                <div style={{fontSize:13,color:'#ddd',marginBottom:4}}>{adminProfile?.display_name||'Admin'}</div>
                <div style={{fontSize:11,color:'#aaa',marginBottom:16}}>{adminUser?.email}</div>
                <button onClick={onLogout} style={{...btn('#FF3D00',true),padding:'10px 20px'}}>LOGOUT → SIGN OUT</button>
              </div>
            </div>
          )}

          <div style={{fontSize:9,color:'#5a3020',marginTop:24,textAlign:'center',letterSpacing:2}}>
            // A* BATTLE PLAN · GOD MODE · ALL ACTIONS LOGGED //
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [phase,setPhase]=useState('init');
  const [adminUser,setAdminUser]=useState(null);
  const [adminProfile,setAdminProfile]=useState(null);

  useEffect(()=>{
    let alive=true;
    async function checkAdmin(session) {
      if (!session?.user) { if (alive) setPhase('login'); return; }
      const email=session.user.email;
      const {data:prof}=await supabase.from('user_profiles').select('*').eq('id',session.user.id).single();
      if (!alive) return;
      const isAdmin=prof?.is_admin||ADMIN_EMAILS.includes(email);
      if (isAdmin) {
        if (!prof?.is_admin) await supabase.from('user_profiles').update({is_admin:true}).eq('id',session.user.id);
        setAdminUser(session.user);
        setAdminProfile({...prof,is_admin:true});
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
