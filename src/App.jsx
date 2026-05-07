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
    bg:      '#bfbab2',
    surface: '#d6d1ca',
    nav:     'rgba(191,186,178,0.97)',
    border:  'rgba(0,0,0,0.14)',
    card:    '#dedad3',
    card2:   'rgba(0,0,0,0.07)',
    text:    '#18170f',
    muted:   '#574f48',
    subtle:  '#7e7870',
    accent:  '#b5735a',
    accentSoft: 'rgba(181,115,90,0.13)',
    success: '#15803d', warn: '#b45309', danger: '#b91c1c',
  },
  dark: {
    bg:      '#0c0e13',
    surface: '#141720',
    nav:     'rgba(12,14,19,0.97)',
    border:  'rgba(255,255,255,0.09)',
    card:    '#171b26',
    card2:   'rgba(255,255,255,0.05)',
    text:    '#e4dfd8',
    muted:   '#857f79',
    subtle:  '#4e4a47',
    accent:  '#c27c60',
    accentSoft: 'rgba(194,124,96,0.13)',
    success: '#4ade80', warn: '#fbbf24', danger: '#f87171',
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

function getSubjectGrade(avg, subjectName, gradeBoundaries) {
  const b = (gradeBoundaries||{})[subjectName]||{};
  for (const g of ['A*','A','B','C','D','E']) if (avg>=(b[g]??0)) return g;
  return 'U';
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

function getGradeForPaper(got, max, paper, subject, gradeBoundaries) {
  const rb = RAW_BOUNDARIES[paper];
  if (rb) {
    for (const g of ['A*','A','B','C','D','E']) if (got>=rb[g]) return {grade:g,exact:true};
    return {grade:'U',exact:true};
  }
  const pct = Math.round((got/max)*100);
  const b = (gradeBoundaries||{})[subject] || {};
  for (const g of ['A*','A','B','C','D','E']) if (pct>=(b[g]??0)) return {grade:g,exact:false};
  return {grade:'U',exact:false};
}

function calcBattleReadiness(scores, errors) {
  const avgScore  = scores.length ? scores.reduce((a,s)=>a+s.pct,0)/scores.length : 0;
  const scoreComp = Math.round((avgScore/100)*40);
  const paperComp = Math.min(20, Math.round((scores.length/12)*20));
  const recentErrs = errors.filter(e=>Date.now()-(e.ts||e.id)<7*86400000).length;
  const errorComp  = Math.max(0, 20-recentErrs*2);
  const total      = scoreComp+paperComp+errorComp;
  const label      = total>=80?'BATTLE READY':total>=60?'ON TRACK':total>=40?'BUILDING':'JUST STARTED';
  const labelColor = total>=80?'#00E676':total>=60?'#FFD600':total>=40?'#FF9100':'#FF3D00';
  return {total, scoreComp, paperComp, errorComp, label, labelColor, avg:Math.round(avgScore)};
}

function getPaperSuggestions(subject) {
  const years=['2023','2022','2019'];
  return subject.papers.flatMap(p=>years.map(y=>`${p} — ${y}`));
}

function getNotifications(scores, errors, subjects, examSched=EXAM_SCHEDULE) {
  const now=new Date(); now.setHours(0,0,0,0);
  const notes=[];
  const allExams=subjects.flatMap(s=>(examSched[s.id]??[]).map(e=>({...e,subject:s.name,color:s.color})));
  const upcoming=allExams.map(e=>({...e,d:Math.ceil((new Date(e.date)-now)/86400000)}))
    .filter(e=>e.d>0).sort((a,b)=>a.d-b.d);
  if (upcoming.length&&upcoming[0].d<=14) {
    const n=upcoming[0];
    notes.push({id:`exam_${n.code}`,type:'urgent',title:`${n.subject} exam in ${n.d} days`,body:`${n.paper} · ${n.time} · ${n.duration}`});
  }
  subjects.forEach(s=>{
    const done=scores.filter(sc=>sc.subject===s.name).map(sc=>sc.paper);
    const next=getPaperSuggestions(s).find(p=>!done.includes(p));
    if (next) {
      const d=upcoming.find(e=>e.subject===s.name)?.d??999;
      notes.push({id:`paper_${s.name}`,type:d<=21?'urgent':d<=42?'warn':'info',title:`Suggested next: ${s.name}`,body:next});
    }
    const ss=scores.filter(sc=>sc.subject===s.name);
    if (ss.length) {
      const daysSince=Math.floor((Date.now()-Math.max(...ss.map(x=>x.ts||x.id)))/86400000);
      if (daysSince>=7) notes.push({id:`overdue_${s.name}`,type:'warn',title:`${s.name}: no paper in ${daysSince} days`,body:`Last: ${ss[0].paper}`});
    }
  });
  if (errors.length>=5) {
    const counts={};
    errors.forEach(e=>{counts[e.type]=(counts[e.type]||0)+1;});
    const [topId,topCount]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const et=ERROR_TYPES.find(t=>t.id===topId);
    if (et&&topCount>=3) notes.push({id:`errpat_${topId}`,type:'warn',title:`Recurring pattern: "${et.label}" (×${topCount})`,body:'Dedicate a full session to fixing this.'});
  }
  const today=new Date().toDateString();
  const ts=scores.find(s=>new Date(s.ts||s.id).toDateString()===today);
  if (ts) notes.push({id:`today_${today}`,type:'success',title:'Paper logged today',body:`${ts.subject} · ${ts.paper} · ${ts.pct}%`});
  return notes;
}

const NOTIF_COLOR={urgent:'#ef4444',warn:'#f97316',info:'#3b82f6',success:'#22c55e'};

// ── Trend chart ────────────────────────────────────────────────────────────
function TrendChart({scores, subject, subjectColors={}, gradeBoundaries={}, bgColor='#e8e4dd', textColor='#7a7268'}) {
  const data=[...scores].filter(s=>s.subject===subject).reverse();
  if (data.length<2) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:120,fontSize:14,color:textColor}}>
      Need 2+ papers to show trend
    </div>
  );
  const W=480,H=110,PAD={t:10,r:16,b:28,l:36};
  const pcts=data.map(d=>d.pct);
  const minY=Math.max(0,Math.min(...pcts)-10);
  const maxY=Math.min(100,Math.max(...pcts)+10);
  const col=subjectColors[subject]||'#888';
  const bounds=gradeBoundaries[subject]||{};
  const xScale=i=>PAD.l+(i/(data.length-1))*(W-PAD.l-PAD.r);
  const yScale=v=>PAD.t+(1-(v-minY)/(maxY-minY))*(H-PAD.t-PAD.b);
  const pts=data.map((d,i)=>([xScale(i),yScale(d.pct)]));
  const polyline=pts.map(p=>p.join(',')).join(' ');
  const areaPath=`M ${pts[0][0]},${yScale(minY)} L ${pts.map(p=>p.join(',')).join(' L ')} L ${pts[pts.length-1][0]},${yScale(minY)} Z`;
  const gradeLines=['A*','A','B'].map(g=>({g,y:yScale(bounds[g]||0),pct:bounds[g]||0})).filter(gl=>gl.pct>minY&&gl.pct<maxY);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
      {gradeLines.map(gl=>(
        <g key={gl.g}>
          <line x1={PAD.l} y1={gl.y} x2={W-PAD.r} y2={gl.y} stroke={gradeColor(gl.g)} strokeWidth="1" strokeDasharray="4 3" opacity="0.3"/>
          <text x={W-PAD.r+2} y={gl.y+4} fill={gradeColor(gl.g)} fontSize="8" opacity="0.6">{gl.g}</text>
        </g>
      ))}
      {[minY,Math.round((minY+maxY)/2),maxY].map(v=>(
        <text key={v} x={PAD.l-4} y={yScale(v)+4} fill={textColor} fontSize="8" textAnchor="end">{Math.round(v)}%</text>
      ))}
      <path d={areaPath} fill={col} opacity="0.06"/>
      <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill={col} stroke={bgColor} strokeWidth="1.5"/>
          <text x={p[0]} y={H-PAD.b+10} fill={textColor} fontSize="7" textAnchor="middle">
            {data[i].date?.split(' ').slice(0,2).join(' ')||`P${i+1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Battle gauge ───────────────────────────────────────────────────────────
function BattleGauge({score, label, labelColor, textColor='#2b2b2b', mutedColor='#7a7268'}) {
  const R=54, CX=70, CY=70;
  const circumference=Math.PI*R;
  const strokeDash=circumference*(score/100);
  return (
    <svg viewBox="0 0 140 80" style={{width:'100%',maxWidth:200,display:'block',margin:'0 auto'}}>
      <path d={`M ${CX-R},${CY} A ${R},${R} 0 0 1 ${CX+R},${CY}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="10" strokeLinecap="round"/>
      <path d={`M ${CX-R},${CY} A ${R},${R} 0 0 1 ${CX+R},${CY}`} fill="none" stroke={labelColor} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`} style={{transition:'stroke-dasharray 1s ease'}}/>
      <text x={CX} y={CY-8} textAnchor="middle" fill={textColor} fontSize="22" fontWeight="700" fontFamily="inherit">{score}</text>
      <text x={CX} y={CY+8} textAnchor="middle" fill={labelColor} fontSize="7" fontWeight="600" letterSpacing="0.5">{label}</text>
      <text x={CX-R} y={CY+14} fill={mutedColor} fontSize="7" textAnchor="middle">0</text>
      <text x={CX+R} y={CY+14} fill={mutedColor} fontSize="7" textAnchor="middle">100</text>
    </svg>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
function Analytics({subjects, scores, errors, uid, C, font, examSched=EXAM_SCHEDULE}) {
  const SUBJ_COLORS  = Object.fromEntries(subjects.map(s=>[s.name,s.color]));
  const GRADE_BOUNDS = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));

  const defaultTargets = Object.fromEntries(subjects.map(s=>[s.name,'A*']));
  const [targets,     setTargets]     = useState(()=>ls.get(`rbp_targets_${uid}`, defaultTargets));
  const [dismissed,   setDismissed]   = useState(()=>ls.get(`rbp_notifs_${uid}`, []));
  const [chartSubject,setChartSubject] = useState(subjects[0]?.name??'');

  useEffect(()=>ls.set(`rbp_targets_${uid}`, targets),  [targets]);
  useEffect(()=>ls.set(`rbp_notifs_${uid}`, dismissed),  [dismissed]);

  const br = calcBattleReadiness(scores, errors);
  const notifications = getNotifications(scores, errors, subjects, examSched).filter(n=>!dismissed.includes(n.id));

  const subjectAvg = name => {
    const ss=scores.filter(x=>x.subject===name);
    return ss.length ? Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length) : null;
  };

  return (
    <div>
      {/* Dismissable notifications */}
      {notifications.length>0&&(
        <div style={{marginBottom:16}}>
          {notifications.slice(0,3).map(n=>(
            <div key={n.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',
              marginBottom:5,borderRadius:8,background:`${NOTIF_COLOR[n.type]}18`,
              border:`1px solid ${NOTIF_COLOR[n.type]}40`}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:NOTIF_COLOR[n.type],flexShrink:0,marginTop:5}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:NOTIF_COLOR[n.type]}}>{n.title}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{n.body}</div>
              </div>
              <button onClick={()=>setDismissed(p=>[...p,n.id])}
                style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',
                  fontSize:18,padding:0,lineHeight:1,flexShrink:0}}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Analytics</div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>Performance Dashboard</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Track your scores and readiness across all subjects.</p>
      </div>

      {/* Gauge + subject cards */}
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:12,marginBottom:16}}>
        {/* Battle readiness */}
        <div style={{background:C.surface,border:`1px solid ${br.labelColor}40`,borderRadius:10,
          padding:'16px 12px',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>
            Battle Readiness
          </div>
          <BattleGauge score={br.total} label={br.label} labelColor={br.labelColor} textColor={C.text} mutedColor={C.muted}/>
          <div style={{width:'100%',marginTop:12}}>
            {[
              ['Papers',    br.paperComp, 20, '#3b82f6'],
              ['Avg score', br.scoreComp, 40, '#8b5cf6'],
              ['Error ctrl',br.errorComp, 20, '#f97316'],
              ['Plan done', 0,            20, '#22c55e'],
            ].map(([l,v,mx,c])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                <div style={{fontSize:12,color:C.muted,width:58,flexShrink:0}}>{l}</div>
                <div style={{flex:1,height:4,borderRadius:2,background:C.border,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${(v/mx)*100}%`,background:c,borderRadius:2,transition:'width 1s ease'}}/>
                </div>
                <div style={{fontSize:12,color:c,width:18,textAlign:'right'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-subject cards */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {subjects.map(s=>{
            const avg      = subjectAvg(s.name);
            const grade    = avg!=null ? getSubjectGrade(avg, s.name, GRADE_BOUNDS) : null;
            const cnt      = scores.filter(x=>x.subject===s.name).length;
            const target   = targets[s.name]||'A*';
            const targetPct = (s.gradeBoundaries?.[target])||80;
            const progress  = avg!=null ? Math.min(100,Math.round((avg/targetPct)*100)) : 0;
            const ss=[...scores].filter(x=>x.subject===s.name).reverse();
            const trend=ss.length>=2 ? ss[ss.length-1].pct - ss[ss.length-2].pct : null;
            return (
              <div key={s.name} style={{background:C.surface,border:`1px solid ${s.color}40`,borderRadius:10,padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:12,color:s.color,fontWeight:600,textTransform:'uppercase',letterSpacing:0.3}}>{s.name}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
                      <span style={{fontSize:28,fontWeight:900,color:grade?gradeColor(grade):'#888'}}>{grade||'—'}</span>
                      {avg!=null&&<span style={{fontSize:15,color:C.muted}}>{avg}% avg</span>}
                      {trend!=null&&(
                        <span style={{fontSize:14,color:trend>=0?'#00E676':'#FF3D00'}}>
                          {trend>=0?'▲':'▼'}{Math.abs(trend)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4}}>
                      {cnt} paper{cnt!==1?'s':''} · Target:
                      <select value={target} onChange={e=>setTargets(p=>({...p,[s.name]:e.target.value}))}
                        style={{background:'transparent',border:'none',color:gradeColor(target),
                          fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',outline:'none',marginLeft:4}}>
                        {['A*','A','B','C'].map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                      <div style={{width:80,height:4,borderRadius:2,background:C.border,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${progress}%`,background:s.color,borderRadius:2,transition:'width 1s ease'}}/>
                      </div>
                      <span style={{fontSize:13,color:progress>=100?'#00E676':s.color}}>{progress}%</span>
                    </div>
                  </div>
                </div>
                {ss.length>=2&&(()=>{
                  const minP=Math.min(...ss.map(d=>d.pct))-5;
                  const maxP=Math.min(100,Math.max(...ss.map(d=>d.pct))+5);
                  const W2=200,H2=28;
                  const x2=i=>(i/(ss.length-1))*W2;
                  const y2=v=>H2-(((v-minP)/(maxP-minP))*H2);
                  const poly2=ss.map((d,i)=>`${x2(i)},${y2(d.pct)}`).join(' ');
                  return (
                    <svg viewBox={`0 0 ${W2} ${H2}`} style={{width:'100%',height:28,display:'block',marginTop:4}}>
                      <polyline points={poly2} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/>
                      {ss.map((d,i)=><circle key={i} cx={x2(i)} cy={y2(d.pct)} r="2.5" fill={s.color} opacity="0.8"/>)}
                    </svg>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Score trend chart */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Score Trend Chart</div>
          <div style={{display:'flex',gap:4}}>
            {subjects.map(s=>(
              <button key={s.name} onClick={()=>setChartSubject(s.name)}
                style={{background:chartSubject===s.name?`${s.color}14`:'transparent',
                  border:`1px solid ${chartSubject===s.name?s.color+'44':C.border}`,
                  color:chartSubject===s.name?s.color:C.muted,
                  padding:'4px 10px',borderRadius:5,cursor:'pointer',fontSize:12,
                  fontFamily:'inherit',fontWeight:chartSubject===s.name?600:400}}>
                {s.name==='Further Mathematics'||s.name==='Further Maths'?'FM':s.name}
              </button>
            ))}
          </div>
        </div>
        <TrendChart scores={scores} subject={chartSubject}
          subjectColors={SUBJ_COLORS} gradeBoundaries={GRADE_BOUNDS}
          bgColor={C.bg} textColor={C.muted}/>
        <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
          {Object.entries(GRADE_BOUNDS[chartSubject]||{}).filter(([g])=>['A*','A','B'].includes(g)).map(([g,v])=>(
            <div key={g} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:16,height:2,background:gradeColor(g),opacity:0.5,borderRadius:1}}/>
              <span style={{fontSize:12,color:gradeColor(g)}}>{g} ≥{v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tracker ────────────────────────────────────────────────────────────────
function Tracker({subjects,scores,setScores,errors,setErrors,uid,C,font}) {
  const SUBJECTS      = subjects.map(s=>s.name);
  const SUBJ_COLORS   = Object.fromEntries(subjects.map(s=>[s.name,s.color]));
  const GRADE_BOUNDS  = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
  const PAPER_SUGGS   = Object.fromEntries(subjects.map(s=>[s.name,getPaperSuggestions(s)]));

  const iS = {width:'100%',background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
    padding:'9px 12px',color:C.text,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  const [scoreSubject, setScoreSubject] = useState(SUBJECTS[0]??'');
  const [scorePaper,   setScorePaper]   = useState('');
  const [scoreGot,     setScoreGot]     = useState('');
  const [scoreMax,     setScoreMax]     = useState('');
  const [sfilt,        setSfilt]        = useState('All');
  const [errSubject,   setErrSubject]   = useState(SUBJECTS[0]??'');
  const [errTopic,     setErrTopic]     = useState('');
  const [errType,      setErrType]      = useState('method');
  const [errNote,      setErrNote]      = useState('');
  const [efilt,        setEfilt]        = useState('All');
  const [confirmDel,   setConfirmDel]   = useState(null);

  const nextSuggested = (PAPER_SUGGS[scoreSubject]||[]).find(p=>
    !scores.filter(s=>s.subject===scoreSubject).map(s=>s.paper).includes(p)
  );
  const filteredScores = sfilt==='All' ? scores : scores.filter(s=>s.subject===sfilt);
  const filteredErrors = efilt==='All' ? errors : errors.filter(e=>e.subject===efilt);

  const abbr = s => s==='Further Mathematics'||s==='Further Maths'?'FM':s==='Computer Science'?'CS':s;

  const addScore = () => {
    if (!scorePaper||!scoreGot||!scoreMax) return;
    const got=parseInt(scoreGot), max=parseInt(scoreMax);
    if (isNaN(got)||isNaN(max)||max===0) return;
    const entry={
      subject:scoreSubject, paper:scorePaper, got, max, maxMark:max,
      pct:Math.round((got/max)*100),
      date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
      id:Date.now(), ts:Date.now(),
    };
    const updated=[entry,...scores];
    setScores(updated); ls.set(`rbp_scores_${uid}`,updated);
    setScorePaper(''); setScoreGot(''); setScoreMax('');
  };

  const addError = () => {
    if (!errTopic.trim()) return;
    const entry={
      subject:errSubject, topic:errTopic.trim(), type:errType,
      note:errNote.trim(), date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),
      id:Date.now(), ts:Date.now(),
    };
    const updated=[entry,...errors].slice(0,200);
    setErrors(updated); ls.set(`rbp_errors_${uid}`,updated);
    setErrTopic(''); setErrNote('');
  };

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:'0 0 4px'}}>Tracker</h1>
        <p style={{fontSize:13,color:C.muted,margin:0}}>Log past papers and errors. Synced to your account automatically.</p>
      </div>

      {/* Log a past paper */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>Log a past paper</div>
        {nextSuggested&&(
          <div onClick={()=>setScorePaper(nextSuggested)} style={{display:'flex',alignItems:'center',gap:10,
            padding:'10px 12px',borderRadius:8,background:'rgba(34,197,94,0.05)',
            border:'1px solid rgba(34,197,94,0.14)',marginBottom:10,cursor:'pointer'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:'#22c55e',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>Suggested next</div>
              <div style={{fontSize:13,color:C.text}}>{nextSuggested}</div>
            </div>
            <span style={{fontSize:12,color:C.muted}}>Tap to fill</span>
          </div>
        )}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <select value={scoreSubject} onChange={e=>{setScoreSubject(e.target.value);setScorePaper('');}}
            style={{...iS,flex:'1 1 100px'}}>
            {SUBJECTS.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={scorePaper} onChange={e=>setScorePaper(e.target.value)}
            placeholder="Paper name / year" style={{...iS,flex:'2 1 150px'}}/>
          <input value={scoreGot} onChange={e=>setScoreGot(e.target.value)}
            placeholder="Score" type="number" style={{...iS,flex:'0 0 60px'}}/>
          <input value={scoreMax} onChange={e=>setScoreMax(e.target.value)}
            placeholder="/Max" type="number" style={{...iS,flex:'0 0 60px'}}/>
          <button onClick={addScore} style={{background:'#22c55e',border:'none',color:'#fff',
            padding:'8px 16px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
            Save
          </button>
        </div>
      </div>

      {/* Paper history */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Paper history ({filteredScores.length})</div>
          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
            {['All',...SUBJECTS].map(s=>(
              <button key={s} onClick={()=>setSfilt(s)}
                style={{background:sfilt===s?C.card2:'transparent',border:`1px solid ${C.border}`,
                  color:sfilt===s?C.text:C.muted,padding:'3px 6px',borderRadius:4,
                  cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>
                {abbr(s)}
              </button>
            ))}
          </div>
        </div>
        {filteredScores.length===0&&(
          <div style={{fontSize:15,color:C.muted,textAlign:'center',padding:'16px 0'}}>No papers logged yet.</div>
        )}
        {filteredScores.map(s=>{
          const maxVal=s.max??s.maxMark??100;
          const {grade,exact}=getGradeForPaper(s.got,maxVal,s.paper,s.subject,GRADE_BOUNDS);
          return (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,
              padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
              <div style={{width:3,height:32,borderRadius:2,background:SUBJ_COLORS[s.subject]||'#888',flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.subject}</div>
                <div style={{fontSize:13,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.paper}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.date}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:17,fontWeight:700,color:gradeColor(grade)}}>
                    {grade}{!exact&&<span style={{fontSize:10,opacity:0.5,marginLeft:1}}>~</span>}
                    {' '}<span style={{fontSize:14,color:C.muted}}>{s.pct}%</span>
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>{s.got}/{maxVal}{!exact&&<span style={{marginLeft:3}}>est.</span>}</div>
                </div>
                {confirmDel===s.id?(
                  <div style={{display:'flex',gap:3}}>
                    <button onClick={()=>{const u=scores.filter(x=>x.id!==s.id);setScores(u);ls.set(`rbp_scores_${uid}`,u);setConfirmDel(null);}}
                      style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#ef4444',
                        padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Delete</button>
                    <button onClick={()=>setConfirmDel(null)}
                      style={{background:'rgba(0,0,0,0.04)',border:`1px solid ${C.border}`,color:C.muted,
                        padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Cancel</button>
                  </div>
                ):(
                  <button onClick={()=>setConfirmDel(s.id)}
                    style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,
                      padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Del</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Log an error */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>Log an error</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
          <select value={errSubject} onChange={e=>setErrSubject(e.target.value)}
            style={{...iS,flex:'1 1 90px'}}>
            {SUBJECTS.map(s=><option key={s}>{s}</option>)}
          </select>
          <input value={errTopic} onChange={e=>setErrTopic(e.target.value)}
            placeholder="Topic" style={{...iS,flex:'2 1 140px'}}/>
          <select value={errType} onChange={e=>setErrType(e.target.value)}
            style={{...iS,flex:'1 1 120px'}}>
            {ERROR_TYPES.map(et=><option key={et.id} value={et.id}>{et.label}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:5}}>
          <input value={errNote} onChange={e=>setErrNote(e.target.value)}
            placeholder="What specifically went wrong? (optional)" style={{...iS,flex:1}}/>
          <button onClick={addError} style={{background:'#ef4444',border:'none',color:'#fff',
            padding:'8px 16px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
            Save
          </button>
        </div>
      </div>

      {/* Error log */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Error log ({filteredErrors.length})</div>
          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
            {['All',...SUBJECTS].map(s=>(
              <button key={s} onClick={()=>setEfilt(s)}
                style={{background:efilt===s?C.card2:'transparent',border:`1px solid ${C.border}`,
                  color:efilt===s?C.text:C.muted,padding:'3px 6px',borderRadius:4,
                  cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>
                {abbr(s)}
              </button>
            ))}
          </div>
        </div>
        {errors.length>=3&&(
          <div style={{display:'flex',gap:3,marginBottom:10,flexWrap:'wrap'}}>
            {ERROR_TYPES.map(et=>{
              const cnt=filteredErrors.filter(e=>e.type===et.id).length;
              if (!cnt) return null;
              return (
                <div key={et.id} style={{fontSize:13,padding:'3px 7px',borderRadius:4,
                  background:`${et.color}12`,color:et.color,fontWeight:700}}>
                  {et.label}: {cnt}
                </div>
              );
            })}
          </div>
        )}
        {filteredErrors.length===0&&(
          <div style={{fontSize:15,color:C.muted,textAlign:'center',padding:'14px 0'}}>
            No errors logged{efilt!=='All'?` for ${efilt}`:''} yet.
          </div>
        )}
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {filteredErrors.map(e=>{
            const et=ERROR_TYPES.find(t=>t.id===e.type);
            return (
              <div key={e.id} style={{display:'flex',gap:8,padding:'7px 0',
                borderTop:`1px solid ${C.border}`,alignItems:'flex-start'}}>
                <div style={{width:3,borderRadius:2,background:et?.color||'#555',flexShrink:0,alignSelf:'stretch'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:C.muted}}>
                    <span style={{color:SUBJ_COLORS[e.subject]||'#7a7268',fontWeight:600}}>{e.subject}</span> · {e.topic}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                    {et?.label} · {e.date}{e.note&&` · ${e.note}`}
                  </div>
                </div>
                <button onClick={()=>{const u=errors.filter(x=>x.id!==e.id);setErrors(u);ls.set(`rbp_errors_${uid}`,u);}}
                  style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,
                    padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit',flexShrink:0}}>
                  Del
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Exams ──────────────────────────────────────────────────────────────────
function Exams({subjects,C,font,examSched=EXAM_SCHEDULE}) {
  const allExams=subjects.flatMap(s=>(examSched[s.id]??[]).map(e=>({...e,subjectName:s.name,color:s.color})))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming=allExams.filter(e=>daysUntil(e.date)>=0);
  const past=allExams.filter(e=>daysUntil(e.date)<0);
  const next=upcoming[0]??null;

  if (!allExams.length) return (
    <div style={{padding:'40px 0',textAlign:'center',color:C.subtle,fontSize:13}}>
      Exam schedule for your subjects isn't available yet.
    </div>
  );

  const ExamRow=({e})=>{
    const days=daysUntil(e.date);
    const done=days<0;
    const urgent=days>=0&&days<=14;
    return (
      <div style={{background:C.surface,border:`1px solid ${urgent?e.color+'22':done?'rgba(0,0,0,0.02)':C.border}`,
        borderRadius:8,padding:'9px 12px',display:'flex',alignItems:'center',gap:10,
        opacity:done?0.3:1}}>
        <div style={{width:4,height:30,borderRadius:2,background:done?C.subtle:e.color,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:done?C.muted:C.text,
            textDecoration:done?'line-through':'none',
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {e.subjectName}: {e.paper.split(':')[1]?.trim()||e.paper}
          </div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>
            {e.code} · {e.time} · {e.duration}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:12,color:C.muted}}>
            {new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:days<=7?'#ef4444':days<=30?'#f97316':e.color}}>
            {days>0?`${days}d`:days===0?'Today':'Done'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Next exam hero */}
      {next&&(
        <div style={{textAlign:'center',marginBottom:28,padding:'28px 0'}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:'uppercase',marginBottom:12}}>
            {daysUntil(next.date)===0?'Today':'First exam in'}
          </div>
          <div style={{fontSize:68,fontWeight:700,color:C.text,lineHeight:1}}>
            {daysUntil(next.date)===0?'!':daysUntil(next.date)}
          </div>
          {daysUntil(next.date)>0&&(
            <div style={{fontSize:13,color:C.muted,marginTop:4}}>days</div>
          )}
          <div style={{fontSize:14,color:C.muted,marginTop:12}}>
            {next.subjectName} · {next.paper.split(':')[1]?.trim()||next.paper}
          </div>
        </div>
      )}

      {/* All exams list */}
      {upcoming.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>All exams</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {allExams.map((e,i)=><ExamRow key={i} e={e}/>)}
          </div>
        </div>
      )}

      {upcoming.length===0&&past.length>0&&(
        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>Completed</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {past.map((e,i)=><ExamRow key={i} e={e}/>)}
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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px',opacity:0.75,position:'relative'}}>
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
        <div key={s.name} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
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
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Account</div>
        <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:4}}>{user?.email??'Signed in'}</div>
        <div style={{fontSize:12,color:C.subtle}}>{subjects.map(s=>s.name).join(' · ')}</div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
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

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Appearance</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:C.text}}>Theme</span>
          <div style={{display:'flex',gap:6}}>
            {['Light','Dark'].map(mode=>(
              <button key={mode} onClick={()=>{const n=mode==='Dark';setDark(n);ls.set('rbp_dark',n);}}
                style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${(mode==='Dark')===dark?C.accent:C.border}`,
                  background:(mode==='Dark')===dark?C.accentSoft:'transparent',
                  color:(mode==='Dark')===dark?C.accent:C.muted,
                  fontSize:12,fontWeight:(mode==='Dark')===dark?600:400,fontFamily:font,cursor:'pointer'}}>
                {mode}
              </button>
            ))}
          </div>
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

  const vp={subjects,scores,errors,uid,C,font,examSched};

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
              style={{padding:'5px 11px',borderRadius:6,background:'transparent',
                border:`1px solid ${C.border}`,cursor:'pointer',
                fontSize:11,fontWeight:600,color:C.muted,fontFamily:font,
                letterSpacing:0.4,textTransform:'uppercase',transition:'color 0.15s,border-color 0.15s'}}>
              {dark?'Light':'Dark'}
            </button>
            {isMobile&&(
              <button onClick={()=>setView('account')}
                style={{padding:'5px 11px',borderRadius:6,background:'transparent',
                  border:`1px solid ${C.border}`,cursor:'pointer',
                  fontSize:11,fontWeight:600,color:view==='account'?C.accent:C.muted,
                  fontFamily:font,letterSpacing:0.4,textTransform:'uppercase'}}>
                Account
              </button>
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
          borderTop:`1px solid ${C.border}`,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',height:56}}>
          {[{id:'analytics',label:'Analytics'},{id:'tracker',label:'Tracker'},{id:'exams',label:'Exams'}]
            .map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                gap:0,background:'transparent',border:'none',cursor:'pointer',
                color:view===n.id?C.accent:C.muted,fontSize:11,fontFamily:font,
                fontWeight:view===n.id?700:500,position:'relative',transition:'color 0.15s',padding:'0 8px',
                letterSpacing:0.2,
                borderTop:`2px solid ${view===n.id?C.accent:'transparent'}`}}>
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
  const [examSched,setExamSched] = useState(EXAM_SCHEDULE);

  const dark = ls.get('rbp_dark',false);
  const C    = dark?T.dark:T.light;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  useEffect(()=>{
    if (!isSupabaseConfigured()) { setPhase('anon'); return; }
    let alive=true;

    async function boot(session) {
      if (!session?.user) { if (alive) { setUser(null); setPhase('anon'); } return; }
      if (sessionStorage.getItem('rbp_goto_admin')) {
        sessionStorage.removeItem('rbp_goto_admin');
        window.location.href = '/admin';
        return;
      }
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

  useEffect(()=>{
    if (phase!=='app') return;
    supabase.from('app_config').select('value').eq('key','exam_schedule').single()
      .then(({data})=>{
        if (data?.value) {
          try {
            const db=typeof data.value==='string'?JSON.parse(data.value):data.value;
            setExamSched(prev=>({...prev,...db}));
          } catch(_) {}
        }
      });
  },[phase]);

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
