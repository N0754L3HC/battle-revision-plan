import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthGate from './components/AuthGate';
import SubjectPicker from './components/SubjectPicker';
import { subjectsFromSelection } from './data/subjects';

// ── Error boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight:'100vh', background:'#0d0f14', display:'flex', alignItems:'center',
        justifyContent:'center', flexDirection:'column', gap:16, padding:24, fontFamily:'system-ui,sans-serif' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#e8e4dd' }}>Something went wrong</div>
        <div style={{ fontSize:13, color:'#8a8480', maxWidth:360, textAlign:'center', lineHeight:1.7 }}>
          {this.state.err?.message || 'Unexpected error.'}
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding:'10px 22px', background:'#c2714f', border:'none', borderRadius:8,
            color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

// ── Theme ──────────────────────────────────────────────────────────────────
const T = {
  light: {
    bg:'#f0ede8', surface:'#faf8f5', nav:'rgba(240,237,232,0.94)',
    border:'rgba(0,0,0,0.08)', card:'#ffffff', card2:'rgba(0,0,0,0.03)',
    text:'#1a1a1a', muted:'#6b6560', subtle:'#9b958f',
    accent:'#c2714f', accentSoft:'rgba(194,113,79,0.1)',
    success:'#16a34a', warn:'#d97706', danger:'#dc2626',
  },
  dark: {
    bg:'#0c0e13', surface:'#131720', nav:'rgba(12,14,19,0.94)',
    border:'rgba(255,255,255,0.08)', card:'#1a1f2e', card2:'rgba(255,255,255,0.04)',
    text:'#e8e4dd', muted:'#8a8480', subtle:'#4a4640',
    accent:'#d4825f', accentSoft:'rgba(212,130,95,0.12)',
    success:'#4ade80', warn:'#fbbf24', danger:'#f87171',
  },
};

// ── Exam schedule (subjectId → exams) ──────────────────────────────────────
const EXAM_SCHEDULE = {
  maths: [
    { date:'2026-06-02', paper:'Paper 1: Pure Mathematics 1',   code:'9MA0/01', board:'Edexcel', time:'PM', duration:'2h',     maxMark:100 },
    { date:'2026-06-12', paper:'Paper 2: Pure Mathematics 2',   code:'9MA0/02', board:'Edexcel', time:'PM', duration:'2h',     maxMark:100 },
    { date:'2026-06-18', paper:'Paper 3: Statistics & Mechanics',code:'9MA0/03', board:'Edexcel', time:'PM', duration:'2h',     maxMark:100 },
  ],
  'further-maths': [
    { date:'2026-05-14', paper:'Core Pure Mathematics 1',        code:'9FM0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75  },
    { date:'2026-05-21', paper:'Core Pure Mathematics 2',        code:'9FM0/02', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75  },
    { date:'2026-06-16', paper:'Decision Mathematics 1',         code:'9FM0/3D', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75  },
    { date:'2026-06-19', paper:'Further Pure Mathematics 1',     code:'9FM0/3A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75  },
  ],
  cs: [
    { date:'2026-06-10', paper:'Paper 1: Computer Systems',         code:'H446/01', board:'OCR', time:'PM', duration:'2h 30m', maxMark:140 },
    { date:'2026-06-17', paper:'Paper 2: Algorithms & Programming', code:'H446/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:140 },
  ],
  chemistry: [
    { date:'2026-05-12', paper:'Paper 1: Inorganic & Physical Chemistry', code:'7405/1', board:'AQA', time:'PM', duration:'2h', maxMark:105 },
    { date:'2026-06-04', paper:'Paper 2: Organic & Physical Chemistry',   code:'7405/2', board:'AQA', time:'PM', duration:'2h', maxMark:105 },
    { date:'2026-06-18', paper:'Paper 3: Practical Skills',               code:'7405/3', board:'AQA', time:'PM', duration:'2h', maxMark:90  },
  ],
  physics: [
    { date:'2026-05-20', paper:'Component 1: Modelling Physics', code:'H557/01', board:'OCR A', time:'PM', duration:'2h 15m', maxMark:100 },
    { date:'2026-06-01', paper:'Component 2: Exploring Physics', code:'H557/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
    { date:'2026-06-08', paper:'Component 3: Unified Physics',   code:'H557/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
  ],
  economics: [
    { date:'2026-05-11', paper:'Paper 1: Markets & Market Failure',          code:'7136/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    { date:'2026-05-18', paper:'Paper 2: National & International Economy',  code:'7136/2', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
    { date:'2026-06-04', paper:'Paper 3: Economic Principles & Issues',      code:'7136/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
  ],
  biology: [
    { date:'2026-05-15', paper:'Paper 1: Biological Processes',   code:'7402/1', board:'AQA', time:'PM', duration:'2h', maxMark:91 },
    { date:'2026-06-05', paper:'Paper 2: Biological Diversity',   code:'7402/2', board:'AQA', time:'AM', duration:'2h', maxMark:91 },
    { date:'2026-06-19', paper:'Paper 3: Essay & Data Analysis',  code:'7402/3', board:'AQA', time:'PM', duration:'2h', maxMark:78 },
  ],
};

// ── Raw grade boundaries (paper-specific) ───────────────────────────────────
const RAW_BOUNDARIES = {
  'Core Pure Mathematics 1 — 2023':{ max:75,'A*':62,A:51,B:40,C:29,D:19,E:10 },
  'Core Pure Mathematics 1 — 2022':{ max:75,'A*':61,A:51,B:41,C:31,D:21,E:12 },
  'Core Pure Mathematics 1 — 2019':{ max:75,'A*':68,A:56,B:45,C:34,D:23,E:12 },
  'Core Pure Mathematics 2 — 2023':{ max:75,'A*':61,A:50,B:39,C:29,D:19,E:10 },
  'Core Pure Mathematics 2 — 2022':{ max:75,'A*':60,A:50,B:40,C:30,D:20,E:11 },
  'Core Pure Mathematics 2 — 2019':{ max:75,'A*':66,A:55,B:44,C:33,D:22,E:12 },
  'Paper 1: Pure Mathematics 1 — 2023':{ max:100,'A*':73,A:61,B:50,C:39,D:29,E:19 },
  'Paper 1: Pure Mathematics 1 — 2022':{ max:100,'A*':72,A:60,B:49,C:38,D:28,E:18 },
  'Paper 1: Pure Mathematics 1 — 2019':{ max:100,'A*':77,A:64,B:53,C:42,D:32,E:22 },
  'Paper 2: Pure Mathematics 2 — 2023':{ max:100,'A*':72,A:59,B:48,C:37,D:27,E:17 },
  'Paper 2: Pure Mathematics 2 — 2022':{ max:100,'A*':71,A:58,B:47,C:36,D:26,E:17 },
  'Paper 2: Pure Mathematics 2 — 2019':{ max:100,'A*':76,A:63,B:52,C:41,D:31,E:21 },
  'Paper 3: Statistics & Mechanics — 2023':{ max:100,'A*':70,A:57,B:46,C:35,D:25,E:16 },
  'Paper 3: Statistics & Mechanics — 2022':{ max:100,'A*':68,A:55,B:44,C:33,D:23,E:14 },
  'Paper 3: Statistics & Mechanics — 2019':{ max:100,'A*':73,A:60,B:49,C:38,D:28,E:18 },
};

const ERROR_TYPES = [
  { id:'calc',     label:'Calculation error',     color:'#f59e0b' },
  { id:'method',   label:'Wrong method',           color:'#ef4444' },
  { id:'read',     label:'Misread question',       color:'#f97316' },
  { id:'forgot',   label:'Forgot content',         color:'#8b5cf6' },
  { id:'time',     label:'Ran out of time',        color:'#3b82f6' },
  { id:'notation', label:'Notation/presentation',  color:'#14b8a6' },
];

const DAILY_ROUTINE = [
  { time:'07:00', block:'Wake + Move',    desc:'15 min walk or bodyweight. Cold water. No phone for 30 min.',                                          color:'#6b7280' },
  { time:'07:30', block:'Plan the Day',   desc:'Check today\'s revision blocks. Write 3 priorities. Set a timer.',                                       color:'#6b7280' },
  { time:'08:00', block:'Deep Block 1',   desc:'Hardest subject. Timed past paper or topic questions. Phone away. 90 min.',                              color:'#3b82f6' },
  { time:'09:30', block:'Mark + Log',     desc:'Mark with the official mark scheme. Every wrong answer: log topic, what went wrong, correct method.',    color:'#f97316' },
  { time:'10:00', block:'Break',          desc:'20 min. Walk outside if possible. No scrolling.',                                                        color:'#6b7280' },
  { time:'10:20', block:'Deep Block 2',   desc:'Second subject. Topic-based questions targeting your weak areas. 90 min.',                               color:'#3b82f6' },
  { time:'11:50', block:'Lunch + Rest',   desc:'Proper food. Step away completely. 40 min.',                                                             color:'#6b7280' },
  { time:'12:30', block:'Deep Block 3',   desc:'Third subject or redo all wrong questions from this morning. 60–90 min.',                                color:'#3b82f6' },
  { time:'14:00', block:'Active Recall',  desc:'Close all notes. Write everything you remember. Check what didn\'t stick.',                              color:'#8b5cf6' },
  { time:'14:30', block:'Done',           desc:'4+ hours of genuine focused revision. You\'ve earned the rest.',                                         color:'#22c55e' },
  { time:'21:30', block:'Shutdown',       desc:'Write tomorrow\'s 3 priorities. Screens off by 22:00. Sleep is part of the revision.',                   color:'#6b7280' },
];

const STUDY_TIPS = [
  { category:'Past Paper Strategy', color:'#3b82f6', tips:[
    { title:'Timed conditions first — always', body:'Your first attempt at any paper must be closed-book and timed. Comfortable practice gives false confidence — exam conditions expose real gaps.' },
    { title:'Mark immediately, log every mistake', body:"Don't skip the mark scheme. Every wrong answer goes into your error log with a topic tag and reason (method / knowledge / careless)." },
    { title:'Work backwards from mark schemes', body:'When you lose marks, find the expected answer and reverse-engineer why the examiner accepted it. Then rewrite that answer from memory.' },
    { title:'Redo wrong questions two weeks later', body:'Two weeks after marking, redo every question you dropped marks on — from scratch, no notes. If you still can\'t do it, the topic needs active work.' },
  ]},
  { category:'Active Recall', color:'#8b5cf6', tips:[
    { title:'Close the notes before you write', body:'Every review session: write what you remember before opening any resource. Retrieval practice beats re-reading by 2–3× for long-term retention.' },
    { title:'Brain-dump to start each session', body:'Spend 5 minutes writing everything you remember from the last session. This primes recall and shows what didn\'t consolidate overnight.' },
    { title:'Teach it in one sentence', body:"If you can't explain a concept simply, your understanding has gaps. Simplicity is the proxy for depth." },
    { title:'Spaced repetition for key facts', body:'Review definitions and formulas on day 1, 3, 7, 14, 30. Anything recalled correctly at 30 days is in long-term memory.' },
  ]},
  { category:'Exam Technique', color:'#f97316', tips:[
    { title:'Read the command word first', body:'"Describe" needs observation. "Explain" needs cause and effect. "Evaluate" needs a judgement. Miss the command word and you miss the marks.' },
    { title:'Write to the mark allocation', body:'3 marks = 3 distinct points. If a question is 6 marks and you wrote 3 lines, you left marks on the table. Count marks before moving on.' },
    { title:'Show all working — every step', body:'Even if the final answer is wrong, method marks are available. A wrong answer with correct working often scores 70%+ of available marks.' },
    { title:'Attempt every question', body:'A blank answer scores 0 with certainty. A partial answer, a formula, a diagram — any of these can pick up marks.' },
  ]},
  { category:'Error Analysis', color:'#ef4444', tips:[
    { title:'Tag every error by type', body:'Every mistake is one of three types: knowledge gap (didn\'t know it), method error (applied it wrong), careless slip. Different types need different fixes.' },
    { title:'Weekly error review', body:'Scan your error log at the end of each week for recurring topics. One topic appearing 3 times is more urgent than 3 one-off errors.' },
    { title:'Recreate the error before correcting it', body:"Don't just read your mistake — reproduce it, then correct it. Writing the correction embeds the fix far better than reading a mark scheme." },
    { title:'Build a personal formula sheet', body:'Any formula or rule you\'ve dropped marks on more than once goes on one A4 sheet. Review it before every practice session.' },
  ]},
];

// ── Utilities ──────────────────────────────────────────────────────────────
const ls = {
  get:(k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } },
  set:(k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
  del:(k)    => { try { localStorage.removeItem(k); } catch {} },
};

function daysUntil(d) {
  const n=new Date(); n.setHours(0,0,0,0);
  const t=new Date(d); t.setHours(0,0,0,0);
  return Math.ceil((t-n)/86400000);
}

function gradeColor(g) {
  return {'A*':'#22c55e',A:'#4ade80',B:'#fbbf24',C:'#fb923c',D:'#f87171',E:'#ef4444',U:'#71717a'}[g]??'#71717a';
}

function getGrade(got, maxMark, paperKey, boundaries) {
  const rb = RAW_BOUNDARIES[paperKey];
  if (rb) {
    for (const g of ['A*','A','B','C','D','E']) if (got>=rb[g]) return {grade:g,exact:true};
    return {grade:'U',exact:true};
  }
  const pct=Math.round((got/maxMark)*100);
  const b=boundaries||{};
  for (const g of ['A*','A','B','C','D','E']) if (pct>=(b[g]??0)) return {grade:g,exact:false};
  return {grade:'U',exact:false};
}

function calcReadiness(scores, errors) {
  if (!scores.length) return {total:0,label:'No data yet',color:'#71717a',avg:0,scoreComp:0,paperComp:0,errorComp:0};
  const avg     = scores.reduce((a,s)=>a+s.pct,0)/scores.length;
  const scoreComp  = Math.round((avg/100)*45);
  const paperComp  = Math.min(35,Math.round((scores.length/20)*35));
  const recentErrs = errors.filter(e=>Date.now()-e.ts<7*86400000).length;
  const errorComp  = Math.max(0,20-recentErrs*2);
  const total      = scoreComp+paperComp+errorComp;
  const label      = total>=80?'Battle Ready':total>=55?'On Track':total>=30?'Building':'Just Started';
  const color      = total>=80?'#22c55e':total>=55?'#f59e0b':total>=30?'#f97316':'#ef4444';
  return {total,label,color,avg:Math.round(avg),scoreComp,paperComp,errorComp};
}

function getPaperSuggestions(subject) {
  const years=['2023','2022','2019'];
  return subject.papers.flatMap(p=>years.map(y=>`${p} — ${y}`));
}

function getNotifications(scores, errors, subjects) {
  const notes=[];
  const allExams = subjects.flatMap(s=>(EXAM_SCHEDULE[s.id]??[]).map(e=>({...e,subjectName:s.name,color:s.color})))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming=allExams.filter(e=>daysUntil(e.date)>=0);
  if (upcoming.length&&daysUntil(upcoming[0].date)<=14) {
    const n=upcoming[0];
    const d=daysUntil(n.date);
    notes.push({id:`exam_${n.code}`,type:'urgent',title:`${n.subjectName} exam in ${d} day${d!==1?'s':''}`,body:`${n.paper} · ${n.time} · ${n.duration}`});
  }
  subjects.forEach(s=>{
    const done=scores.filter(sc=>sc.subject===s.name).map(sc=>sc.paper);
    const suggestions=getPaperSuggestions(s);
    const next=suggestions.find(p=>!done.includes(p));
    if (next) {
      const examDays=upcoming.find(e=>e.subjectName===s.name);
      const d=examDays?daysUntil(examDays.date):999;
      notes.push({id:`suggest_${s.name}`,type:d<=21?'urgent':d<=42?'warn':'info',title:`Next up: ${s.name}`,body:next});
    }
    const ss=scores.filter(sc=>sc.subject===s.name);
    if (ss.length) {
      const daysSince=Math.floor((Date.now()-Math.max(...ss.map(x=>x.ts)))/86400000);
      if (daysSince>=7) notes.push({id:`overdue_${s.name}`,type:'warn',title:`${s.name}: no paper in ${daysSince} days`,body:`Last logged ${daysSince} days ago`});
    }
  });
  if (errors.length>=5) {
    const counts={};
    errors.forEach(e=>{counts[e.type]=(counts[e.type]||0)+1;});
    const [topId,topCount]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const et=ERROR_TYPES.find(t=>t.id===topId);
    if (et&&topCount>=3) notes.push({id:`errpat_${topId}`,type:'warn',title:`Recurring: "${et.label}" ×${topCount}`,body:'Dedicate a full session to fixing this pattern.'});
  }
  const todayStr=new Date().toDateString();
  const todayPaper=scores.find(s=>new Date(s.ts).toDateString()===todayStr);
  if (todayPaper) notes.push({id:`today`,type:'success',title:'Paper logged today',body:`${todayPaper.subject} · ${todayPaper.pct}%`});
  return notes.slice(0,5);
}

const NOTIF_COLOR={urgent:'#ef4444',warn:'#f97316',info:'#3b82f6',success:'#22c55e'};

// ── Trend chart ────────────────────────────────────────────────────────────
function TrendChart({scores,subject,color,boundaries,C}) {
  const data=[...scores].filter(s=>s.subject===subject).reverse();
  if (data.length<2) return (
    <div style={{height:90,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:C.subtle}}>
      Log 2+ papers to see your trend
    </div>
  );
  const W=460,H=90,P={t:8,r:14,b:22,l:32};
  const pcts=data.map(d=>d.pct);
  const lo=Math.max(0,Math.min(...pcts)-10),hi=Math.min(100,Math.max(...pcts)+10);
  const x=i=>P.l+(i/(data.length-1))*(W-P.l-P.r);
  const y=v=>P.t+(1-(v-lo)/(hi-lo))*(H-P.t-P.b);
  const pts=data.map((d,i)=>[x(i),y(d.pct)]);
  const line=pts.map(p=>p.join(',')).join(' ');
  const area=`M ${pts[0][0]},${y(lo)} L ${pts.map(p=>p.join(',')).join(' L ')} L ${pts[pts.length-1][0]},${y(lo)} Z`;
  const astarY=boundaries?.['A*']?y(boundaries['A*']):null;
  const aY=boundaries?.['A']?y(boundaries['A']):null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
      {astarY&&astarY>P.t&&astarY<H-P.b&&(
        <g><line x1={P.l} y1={astarY} x2={W-P.r} y2={astarY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" opacity="0.4"/>
          <text x={W-P.r+2} y={astarY+4} fill="#22c55e" fontSize="7" opacity="0.7">A*</text></g>
      )}
      {aY&&aY>P.t&&aY<H-P.b&&(
        <g><line x1={P.l} y1={aY} x2={W-P.r} y2={aY} stroke="#4ade80" strokeWidth="1" strokeDasharray="4 3" opacity="0.3"/>
          <text x={W-P.r+2} y={aY+4} fill="#4ade80" fontSize="7" opacity="0.6">A</text></g>
      )}
      {[lo,hi].map(v=>(
        <text key={v} x={P.l-4} y={y(v)+4} fill={C.subtle} fontSize="7" textAnchor="end">{Math.round(v)}%</text>
      ))}
      <path d={area} fill={color} opacity="0.07"/>
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill={color} stroke={C.card} strokeWidth="1.5"/>
          <text x={p[0]} y={H-P.b+10} fill={C.subtle} fontSize="6.5" textAnchor="middle">
            {data[i].date?.split(' ').slice(0,2).join(' ')||`P${i+1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
function Analytics({subjects,scores,errors,C,font}) {
  const r=calcReadiness(scores,errors);
  const [activeSubj,setActiveSubj]=useState(subjects[0]?.name??'');
  const notifs=getNotifications(scores,errors,subjects);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:18}}>

      {/* Readiness */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 22px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>
              Battle Readiness
            </div>
            <div style={{fontSize:30,fontWeight:800,color:r.color,lineHeight:1.1}}>
              {r.total}<span style={{fontSize:15,fontWeight:500,color:C.muted}}>/100</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:700,color:r.color,marginBottom:4}}>{r.label}</div>
            {r.avg>0&&<div style={{fontSize:12,color:C.muted}}>Avg {r.avg}% across {scores.length} paper{scores.length!==1?'s':''}</div>}
          </div>
        </div>
        <div style={{height:6,borderRadius:3,background:C.card2,overflow:'hidden',marginBottom:14}}>
          <div style={{height:'100%',width:`${r.total}%`,background:r.color,borderRadius:3,transition:'width 0.8s ease'}}/>
        </div>
        {r.total>0&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[
              {label:'Score avg',val:r.scoreComp,max:45},
              {label:'Papers done',val:r.paperComp,max:35},
              {label:'Error control',val:r.errorComp,max:20},
            ].map(c=>(
              <div key={c.label} style={{background:C.card2,borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.val}<span style={{fontSize:10,color:C.subtle}}>/{c.max}</span></div>
              </div>
            ))}
          </div>
        )}
        {scores.length===0&&(
          <p style={{fontSize:12,color:C.subtle,margin:'8px 0 0',lineHeight:1.6}}>
            Log your first past paper in Tracker to start building your score.
          </p>
        )}
      </div>

      {/* Notifications */}
      {notifs.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {notifs.map(n=>(
            <div key={n.id} style={{background:C.card,border:`1px solid ${NOTIF_COLOR[n.type]}30`,
              borderLeft:`3px solid ${NOTIF_COLOR[n.type]}`,borderRadius:10,padding:'12px 14px',
              display:'flex',gap:10,alignItems:'flex-start'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:NOTIF_COLOR[n.type],marginTop:4,flexShrink:0}}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:12,color:C.muted}}>{n.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-subject trend */}
      {subjects.length>0&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>
            {subjects.map(s=>(
              <button key={s.name} onClick={()=>setActiveSubj(s.name)}
                style={{padding:'11px 18px',background:'transparent',border:'none',
                  borderBottom:`2px solid ${activeSubj===s.name?s.color:'transparent'}`,
                  color:activeSubj===s.name?s.color:C.muted,
                  fontSize:12,fontWeight:activeSubj===s.name?700:400,
                  fontFamily:font,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'}}>
                {s.name}
              </button>
            ))}
          </div>
          {subjects.filter(s=>s.name===activeSubj).map(s=>{
            const ss=scores.filter(sc=>sc.subject===s.name);
            const avg=ss.length?Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length):null;
            const best=ss.length?Math.max(...ss.map(x=>x.pct)):null;
            const suggestions=getPaperSuggestions(s);
            const done=ss.map(sc=>sc.paper);
            const next=suggestions.find(p=>!done.includes(p));
            return (
              <div key={s.name} style={{padding:'16px 20px'}}>
                {avg!==null&&(
                  <div style={{display:'flex',gap:16,marginBottom:14}}>
                    {[{label:'Average',val:`${avg}%`},{label:'Best',val:`${best}%`},{label:'Papers',val:ss.length}].map(stat=>(
                      <div key={stat.label}>
                        <div style={{fontSize:11,color:C.muted,marginBottom:2}}>{stat.label}</div>
                        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{stat.val}</div>
                      </div>
                    ))}
                  </div>
                )}
                <TrendChart scores={scores} subject={s.name} color={s.color} boundaries={s.gradeBoundaries} C={C}/>
                {next&&(
                  <div style={{marginTop:12,padding:'10px 12px',background:C.card2,borderRadius:8,
                    fontSize:12,color:C.muted,borderLeft:`2px solid ${s.color}`}}>
                    <span style={{fontWeight:600,color:C.text}}>Suggested next: </span>{next}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Locked premium */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[{icon:'📈',title:'Grade Predictor',desc:'Estimate your final grade from paper trends'},
          {icon:'🤖',title:'AI Error Analysis',desc:'Auto-detect patterns in your mistakes'}].map(item=>(
          <div key={item.title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:'16px 16px 14px',position:'relative',opacity:0.7}}>
            <div style={{position:'absolute',top:10,right:10,padding:'2px 7px',borderRadius:4,
              background:C.accentSoft,fontSize:9,fontWeight:700,color:C.accent,letterSpacing:0.3}}>PRO</div>
            <div style={{fontSize:20,marginBottom:8}}>{item.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>{item.title}</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tracker ────────────────────────────────────────────────────────────────
function Tracker({subjects,scores,setScores,errors,setErrors,uid,C,font}) {
  const [form,setForm]=useState({subj:'',paper:'',got:'',maxMark:'',errs:[]});
  const [showForm,setShowForm]=useState(false);
  const [sfilt,setSfilt]=useState('All');

  const selectedSubj=subjects.find(s=>s.name===form.subj);
  const suggestions=selectedSubj?getPaperSuggestions(selectedSubj):[];

  function submit() {
    const got=parseFloat(form.got);
    const max=parseFloat(form.maxMark)||100;
    if (!form.subj||!form.paper||isNaN(got)||got<0||got>max) return;
    const pct=Math.round((got/max)*100);
    const ts=Date.now();
    const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    const entry={id:ts,ts,subject:form.subj,paper:form.paper,got,maxMark:max,pct,date};
    const updated=[entry,...scores];
    setScores(updated); ls.set(`rbp_scores_${uid}`,updated);
    if (form.errs.length) {
      const newErrs=form.errs.map(t=>({id:ts+Math.random(),ts,type:t,subject:form.subj,paper:form.paper}));
      const updatedE=[...newErrs,...errors];
      setErrors(updatedE); ls.set(`rbp_errors_${uid}`,updatedE);
    }
    setForm({subj:'',paper:'',got:'',maxMark:'',errs:[]});
    setShowForm(false);
  }

  const displayed=sfilt==='All'?scores:scores.filter(s=>s.subject===sfilt);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:700,color:C.text,margin:0}}>Paper Tracker</h2>
          <p style={{fontSize:12,color:C.muted,margin:'3px 0 0'}}>
            {scores.length} paper{scores.length!==1?'s':''} logged · synced to your account
          </p>
        </div>
        <button onClick={()=>setShowForm(!showForm)}
          style={{padding:'9px 16px',background:C.accent,border:'none',borderRadius:9,
            color:'#fff',fontSize:13,fontWeight:700,fontFamily:font,cursor:'pointer'}}>
          + Log paper
        </button>
      </div>

      {showForm&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 20px 18px'}}>
          <h3 style={{fontSize:14,fontWeight:700,color:C.text,margin:'0 0 16px'}}>Log a past paper</h3>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:'block',marginBottom:5}}>Subject</label>
                <select value={form.subj} onChange={e=>setForm({...form,subj:e.target.value,paper:''})}
                  style={{width:'100%',padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:8,
                    background:C.card2,color:C.text,fontSize:13,fontFamily:font}}>
                  <option value=''>Select…</option>
                  {subjects.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:'block',marginBottom:5}}>Paper</label>
                <select value={form.paper} onChange={e=>setForm({...form,paper:e.target.value})}
                  style={{width:'100%',padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:8,
                    background:C.card2,color:C.text,fontSize:13,fontFamily:font}}>
                  <option value=''>Select…</option>
                  {suggestions.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:'block',marginBottom:5}}>Marks scored</label>
                <input type='number' min={0} value={form.got} placeholder='e.g. 72'
                  onChange={e=>setForm({...form,got:e.target.value})}
                  style={{width:'100%',padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:8,
                    background:C.card2,color:C.text,fontSize:13,fontFamily:font,boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:'block',marginBottom:5}}>Out of</label>
                <input type='number' min={1} value={form.maxMark} placeholder='100'
                  onChange={e=>setForm({...form,maxMark:e.target.value})}
                  style={{width:'100%',padding:'9px 10px',border:`1px solid ${C.border}`,borderRadius:8,
                    background:C.card2,color:C.text,fontSize:13,fontFamily:font,boxSizing:'border-box'}}/>
              </div>
            </div>
            {form.got&&form.subj&&(()=>{
              const max=parseFloat(form.maxMark)||100;
              const got=parseFloat(form.got);
              if (!isNaN(got)&&!isNaN(max)&&max>0) {
                const pct=Math.round((got/max)*100);
                const {grade}=getGrade(got,max,form.paper,selectedSubj?.gradeBoundaries);
                return (
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:C.card2,borderRadius:8}}>
                    <span style={{fontSize:13,color:C.muted}}>{pct}%</span>
                    <span style={{fontSize:15,fontWeight:800,color:gradeColor(grade)}}>→ {grade}</span>
                    {selectedSubj?.gradeBoundaries?.['A*']&&(
                      <span style={{fontSize:11,color:C.subtle,marginLeft:'auto'}}>
                        A* boundary: {selectedSubj.gradeBoundaries['A*']}%
                      </span>
                    )}
                  </div>
                );
              }
            })()}
            <div>
              <label style={{fontSize:11,color:C.muted,fontWeight:600,display:'block',marginBottom:8}}>Error types (optional)</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {ERROR_TYPES.map(et=>{
                  const on=form.errs.includes(et.id);
                  return (
                    <button key={et.id}
                      onClick={()=>setForm({...form,errs:on?form.errs.filter(x=>x!==et.id):[...form.errs,et.id]})}
                      style={{padding:'5px 11px',borderRadius:6,border:`1.5px solid ${on?et.color+'66':C.border}`,
                        background:on?`${et.color}14`:'transparent',color:on?et.color:C.muted,
                        fontSize:11,fontWeight:on?700:400,fontFamily:font,cursor:'pointer'}}>
                      {et.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={()=>setShowForm(false)}
                style={{flex:1,padding:'10px',background:'transparent',border:`1px solid ${C.border}`,
                  borderRadius:8,color:C.muted,fontSize:13,fontFamily:font,cursor:'pointer'}}>Cancel</button>
              <button onClick={submit} disabled={!form.subj||!form.paper||!form.got}
                style={{flex:2,padding:'10px',
                  background:form.subj&&form.paper&&form.got?C.accent:C.card2,
                  border:'none',borderRadius:8,
                  color:form.subj&&form.paper&&form.got?'#fff':C.subtle,
                  fontSize:13,fontWeight:700,fontFamily:font,cursor:'pointer'}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {scores.length>0&&(
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
          {['All',...subjects.map(s=>s.name)].map(s=>{
            const on=sfilt===s;
            const subj=subjects.find(x=>x.name===s);
            return (
              <button key={s} onClick={()=>setSfilt(s)}
                style={{padding:'6px 14px',borderRadius:7,
                  border:`1.5px solid ${on?(subj?.color||C.accent)+'55':C.border}`,
                  background:on?`${subj?.color||C.accent}10`:'transparent',
                  color:on?subj?.color||C.accent:C.muted,
                  fontSize:12,fontWeight:on?700:400,fontFamily:font,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                {s}
              </button>
            );
          })}
        </div>
      )}

      {displayed.length===0?(
        <div style={{padding:'32px 0',textAlign:'center',color:C.subtle,fontSize:13}}>
          No papers logged yet. Hit <strong style={{color:C.accent}}>+ Log paper</strong> above.
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {displayed.slice(0,40).map(s=>{
            const subj=subjects.find(x=>x.name===s.subject);
            const {grade,exact}=getGrade(s.got,s.maxMark,s.paper,subj?.gradeBoundaries);
            return (
              <div key={s.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
                padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:3,height:38,borderRadius:2,background:subj?.color||C.accent,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.paper}</div>
                  <div style={{fontSize:11,color:C.muted}}>{s.subject} · {s.date}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:17,fontWeight:800,color:gradeColor(grade)}}>{grade}</div>
                  <div style={{fontSize:11,color:C.muted}}>{s.pct}%{!exact?' ≈':''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errors.length>=3&&(()=>{
        const counts={};
        errors.forEach(e=>{counts[e.type]=(counts[e.type]||0)+1;});
        const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
        return (
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>
              Your error patterns
            </div>
            {top.map(([id,count])=>{
              const et=ERROR_TYPES.find(e=>e.id===id);
              if (!et) return null;
              const pct=Math.round((count/errors.length)*100);
              return (
                <div key={id} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,color:C.text}}>{et.label}</span>
                    <span style={{fontSize:12,fontWeight:700,color:et.color}}>×{count} ({pct}%)</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:C.card2}}>
                    <div style={{height:'100%',width:`${pct}%`,background:et.color,borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ── Exams ──────────────────────────────────────────────────────────────────
function Exams({subjects,C,font}) {
  const allExams=subjects.flatMap(s=>(EXAM_SCHEDULE[s.id]??[]).map(e=>({...e,subjectName:s.name,color:s.color})))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming=allExams.filter(e=>daysUntil(e.date)>=0);
  const past=allExams.filter(e=>daysUntil(e.date)<0);

  if (!allExams.length) return (
    <div style={{padding:'40px 0',textAlign:'center',color:C.subtle,fontSize:13}}>
      Exam schedule for your subjects isn't available yet.
    </div>
  );

  const ExamCard=({e})=>{
    const days=daysUntil(e.date);
    const done=days<0;
    const urgent=days>=0&&days<=14;
    return (
      <div style={{background:C.card,border:`1px solid ${urgent?e.color+'40':C.border}`,borderRadius:12,
        padding:'14px 16px',display:'flex',gap:14,alignItems:'center'}}>
        <div style={{textAlign:'center',minWidth:52,flexShrink:0}}>
          {done?(
            <div style={{fontSize:18,color:C.subtle}}>✓</div>
          ):(
            <>
              <div style={{fontSize:22,fontWeight:800,color:urgent?e.color:C.text,lineHeight:1}}>
                {days===0?'!':days}
              </div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{days===0?'TODAY':'days'}</div>
            </>
          )}
        </div>
        <div style={{width:1,height:40,background:C.border,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:done?C.muted:C.text,
            textDecoration:done?'line-through':'none',marginBottom:3,
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.paper}</div>
          <div style={{fontSize:11,color:C.muted}}>
            {e.subjectName} · {e.code} · {new Date(e.date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
          </div>
          <div style={{fontSize:11,color:C.subtle,marginTop:2}}>
            {e.time} · {e.duration} · Max {e.maxMark} marks
          </div>
        </div>
        <div style={{flexShrink:0,width:3,height:40,borderRadius:2,background:done?C.subtle:e.color}}/>
      </div>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {upcoming.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:10}}>
            Upcoming — {upcoming.length} exam{upcoming.length!==1?'s':''}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {upcoming.map((e,i)=><ExamCard key={i} e={e}/>)}
          </div>
        </div>
      )}
      {past.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:10}}>
            Completed
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {past.map((e,i)=><ExamCard key={i} e={e}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Study tips ─────────────────────────────────────────────────────────────
function Tips({subjects,C,font}) {
  const [tab,setTab]=useState('general');
  const tabs=[{id:'general',label:'Strategy'},...subjects.map(s=>({id:s.id,label:s.name,color:s.color,techniques:s.techniques}))];
  const active=tabs.find(t=>t.id===tab);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,overflowX:'auto'}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'11px 16px',background:'transparent',border:'none',
                borderBottom:`2px solid ${tab===t.id?(t.color||C.accent):'transparent'}`,
                color:tab===t.id?(t.color||C.accent):C.muted,
                fontSize:12,fontWeight:tab===t.id?700:400,fontFamily:font,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{padding:'16px 18px'}}>
          {tab==='general'
            ?STUDY_TIPS.map((cat,ci)=>(
              <div key={ci} style={{marginBottom:ci<STUDY_TIPS.length-1?20:0}}>
                <div style={{fontSize:11,fontWeight:700,color:cat.color,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>
                  {cat.category}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {cat.tips.map((tip,ti)=>(
                    <div key={ti} style={{paddingBottom:ti<cat.tips.length-1?10:0,
                      borderBottom:ti<cat.tips.length-1?`1px solid ${C.border}`:'none'}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{tip.title}</div>
                      <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{tip.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
            :active?.techniques?.map((tip,i)=>(
              <div key={i} style={{paddingBottom:i<active.techniques.length-1?14:0,
                borderBottom:i<active.techniques.length-1?`1px solid ${C.border}`:'none',marginBottom:i<active.techniques.length-1?14:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{tip.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{tip.body}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Daily routine */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Ideal revision day</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>A structure that works. Adapt to your timetable.</div>
        </div>
        <div style={{padding:'0 18px'}}>
          {DAILY_ROUTINE.map((r,i)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'12px 0',
              borderBottom:i<DAILY_ROUTINE.length-1?`1px solid ${C.border}`:'none'}}>
              <div style={{fontSize:11,fontWeight:600,color:C.subtle,width:40,flexShrink:0,paddingTop:1}}>{r.time}</div>
              <div style={{width:3,flexShrink:0,borderRadius:2,background:r.color,alignSelf:'stretch'}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{r.block}</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked: personalised plan */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px',opacity:0.75,position:'relative'}}>
        <div style={{position:'absolute',top:14,right:14,padding:'2px 8px',borderRadius:4,
          background:C.accentSoft,fontSize:9,fontWeight:700,color:C.accent,letterSpacing:0.3}}>PRO</div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>📅 Personalised week-by-week plan</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
          A structured plan from today to your last exam — built from your paper history, your weakest topics, and your specific exam dates.
        </div>
      </div>
    </div>
  );
}

// ── Resources ──────────────────────────────────────────────────────────────
function Resources({subjects,C,font}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {subjects.map(s=>(
        <div key={s.name} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,
            display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:s.color}}/>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</div>
            <div style={{fontSize:11,color:C.muted,marginLeft:'auto'}}>{s.board}</div>
          </div>
          <div style={{padding:'0 18px'}}>
            {s.resources.map((r,i)=>(
              <div key={i} style={{padding:'12px 0',borderBottom:i<s.resources.length-1?`1px solid ${C.border}`:'none'}}>
                <a href={r.url} target='_blank' rel='noopener noreferrer'
                  style={{fontSize:13,fontWeight:600,color:C.accent,textDecoration:'none',display:'block',marginBottom:2}}>
                  {r.name}
                </a>
                <div style={{fontSize:11,color:C.muted,wordBreak:'break-all'}}>{r.url.replace('https://','')}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Account ────────────────────────────────────────────────────────────────
function Account({user,subjects,dark,setDark,onSignOut,onResetSubjects,C,font}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Account</div>
        <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:4}}>{user?.email??'Signed in'}</div>
        <div style={{fontSize:12,color:C.subtle}}>{subjects.map(s=>s.name).join(' · ')}</div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Subjects & boards</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
          {subjects.map(s=>(
            <div key={s.name} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:s.color,flexShrink:0}}/>
              <span style={{fontSize:13,color:C.text,flex:1,fontWeight:500}}>{s.name}</span>
              <span style={{fontSize:12,color:C.muted}}>{s.board}</span>
            </div>
          ))}
        </div>
        <button onClick={onResetSubjects}
          style={{width:'100%',padding:'10px',background:C.card2,border:`1px solid ${C.border}`,
            borderRadius:8,color:C.muted,fontSize:13,fontFamily:font,cursor:'pointer'}}>
          Change subjects
        </button>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Appearance</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:C.text}}>Dark mode</span>
          <button onClick={()=>{const n=!dark;setDark(n);ls.set('rbp_dark',n);}}
            style={{width:44,height:24,borderRadius:12,background:dark?C.accent:C.border,
              border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
            <div style={{position:'absolute',top:3,left:dark?22:3,width:18,height:18,
              borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
          </button>
        </div>
      </div>

      <button onClick={onSignOut}
        style={{width:'100%',padding:'12px',background:'transparent',
          border:`1px solid ${C.danger}40`,borderRadius:10,color:C.danger,
          fontSize:13,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
        Sign out
      </button>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────
function RevisionPlan({user,selection,onSignOut,onResetSubjects}) {
  const [dark,setDark]     = useState(()=>ls.get('rbp_dark',false));
  const [view,setView]     = useState('analytics');
  const [isMobile,setIsMobile] = useState(()=>window.innerWidth<768);

  const uid      = user?.id??'anon';
  const [scores,setScores] = useState(()=>ls.get(`rbp_scores_${uid}`,[]));
  const [errors,setErrors] = useState(()=>ls.get(`rbp_errors_${uid}`,[]));

  const C    = dark?T.dark:T.light;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
  const subjects = subjectsFromSelection(selection);

  useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener('resize',fn,{passive:true});
    return ()=>window.removeEventListener('resize',fn);
  },[]);

  useEffect(()=>{
    if (isMobile&&!['analytics','tracker','exams'].includes(view)) setView('analytics');
  },[isMobile]);

  const DESKTOP_NAV=[
    {id:'analytics',label:'Analytics'},
    {id:'tracker',label:'Tracker'},
    {id:'exams',label:'Exams'},
    {id:'tips',label:'Tips & Routine'},
    {id:'resources',label:'Resources'},
    {id:'account',label:'Account'},
  ];

  const vp={subjects,scores,errors,C,font};

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:font,color:C.text}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,
        background:C.nav,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderBottom:`1px solid ${C.border}`,height:54}}>
        <div style={{maxWidth:740,margin:'0 auto',height:'100%',padding:'0 16px',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:26,height:26,borderRadius:7,background:C.accent,display:'flex',
              alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',
              fontFamily:"'JetBrains Mono',monospace"}}>A*</div>
            {!isMobile&&<span style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:0.2}}>Battle Plan</span>}
          </div>
          {!isMobile&&(
            <div style={{display:'flex',gap:2}}>
              {DESKTOP_NAV.map(n=>(
                <button key={n.id} onClick={()=>setView(n.id)}
                  style={{padding:'6px 13px',background:view===n.id?C.accentSoft:'transparent',
                    border:'none',borderRadius:7,color:view===n.id?C.accent:C.muted,
                    fontSize:12,fontWeight:view===n.id?700:400,fontFamily:font,cursor:'pointer'}}>
                  {n.label}
                </button>
              ))}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>{const n=!dark;setDark(n);ls.set('rbp_dark',n);}}
              style={{width:32,height:32,borderRadius:8,background:C.card2,border:`1px solid ${C.border}`,
                cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {dark?'☀️':'🌙'}
            </button>
            {isMobile&&(
              <button onClick={()=>setView('account')}
                style={{width:32,height:32,borderRadius:8,background:C.card2,border:`1px solid ${C.border}`,
                  cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>👤</button>
            )}
          </div>
        </div>
      </nav>

      <main style={{maxWidth:740,margin:'0 auto',padding:`${54+20}px 16px ${isMobile?82:32}px`}}>
        {view==='analytics' && <Analytics {...vp}/>}
        {view==='tracker'   && <Tracker   {...vp} setScores={setScores} setErrors={setErrors} uid={uid}/>}
        {view==='exams'     && <Exams     {...vp}/>}
        {view==='tips'      && <Tips      {...vp}/>}
        {view==='resources' && <Resources {...vp}/>}
        {view==='account'   && <Account   {...vp} user={user} selection={selection}
                                  dark={dark} setDark={setDark} onSignOut={onSignOut} onResetSubjects={onResetSubjects}/>}
      </main>

      {isMobile&&(
        <nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,
          background:C.nav,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
          borderTop:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',height:60}}>
          {[{id:'analytics',label:'Analytics',icon:'📊'},{id:'tracker',label:'Tracker',icon:'📝'},{id:'exams',label:'Exams',icon:'📅'}]
            .map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                gap:3,background:'transparent',border:'none',cursor:'pointer',
                color:view===n.id?C.accent:C.muted,fontSize:10,fontFamily:font,
                fontWeight:view===n.id?700:400,position:'relative',transition:'color 0.15s',padding:'8px 0'}}>
              {view===n.id&&<div style={{position:'absolute',top:0,left:'20%',right:'20%',height:2,borderRadius:1,background:C.accent}}/>}
              <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

// ── App root ───────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]         = useState('loading');
  const [user,setUser]           = useState(null);
  const [selection,setSelection] = useState([]);

  const dark = ls.get('rbp_dark',false);
  const C    = dark?T.dark:T.light;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  useEffect(()=>{
    if (!isSupabaseConfigured()) { setPhase('anon'); return; }
    let alive=true;

    async function boot(session) {
      if (!session?.user) { if (alive) { setUser(null); setPhase('anon'); } return; }
      const u=session.user; const uid=u.id;
      if (alive) setUser(u);
      try {
        await supabase.from('user_profiles').upsert({id:uid,email:u.email},{onConflict:'id',ignoreDuplicates:true});
        const {data}=await supabase.from('user_profiles').select('subjects').eq('id',uid).single();
        if (!alive) return;
        let sel=[];
        try { if (data?.subjects) sel=JSON.parse(data.subjects); } catch {}
        if (Array.isArray(sel)&&sel.length>0) {
          ls.set(`rbp_sel_${uid}`,sel); setSelection(sel); setPhase('app');
        } else {
          const cached=ls.get(`rbp_sel_${uid}`,[]);
          if (cached.length>0) {
            setSelection(cached); setPhase('app');
            supabase.rpc('save_subjects',{p_subjects:JSON.stringify(cached)});
          } else { setPhase('onboarding'); }
        }
      } catch {
        if (!alive) return;
        const cached=ls.get(`rbp_sel_${uid}`,[]);
        if (cached.length>0) { setSelection(cached); setPhase('app'); }
        else setPhase('onboarding');
      }
    }

    supabase.auth.getSession().then(({data:{session}})=>boot(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==='SIGNED_OUT') { if (alive) { setUser(null); setSelection([]); setPhase('anon'); } }
      else if (event==='SIGNED_IN') boot(session);
    });
    return ()=>{ alive=false; subscription.unsubscribe(); };
  },[]);

  function handleSubjectsDone(sel) { setSelection(sel); setPhase('app'); }

  async function handleSignOut() {
    const uid=user?.id;
    await supabase.auth.signOut();
    if (uid) ls.del(`rbp_sel_${uid}`);
    setUser(null); setSelection([]); setPhase('anon');
  }

  async function handleResetSubjects() {
    const uid=user?.id;
    if (uid) ls.del(`rbp_sel_${uid}`);
    await supabase.rpc('save_subjects',{p_subjects:'[]'});
    setSelection([]); setPhase('onboarding');
  }

  const loading=(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16,fontFamily:font}}>
      <div style={{width:36,height:36,borderRadius:10,background:C.accent,display:'flex',
        alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#fff',
        fontFamily:"'JetBrains Mono',monospace"}}>A*</div>
      <div style={{fontSize:13,color:C.muted}}>Loading…</div>
    </div>
  );

  if (phase==='loading')    return <ErrorBoundary>{loading}</ErrorBoundary>;
  if (phase==='anon')       return <ErrorBoundary><AuthGate onAuth={()=>{}}/></ErrorBoundary>;
  if (phase==='onboarding') return <ErrorBoundary><SubjectPicker user={user} onComplete={handleSubjectsDone}/></ErrorBoundary>;
  return (
    <ErrorBoundary>
      <RevisionPlan user={user} selection={selection} onSignOut={handleSignOut} onResetSubjects={handleResetSubjects}/>
    </ErrorBoundary>
  );
}
