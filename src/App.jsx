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
          {this.state.err?.message || 'An unexpected error occurred.'}
        </div>
        <button onClick={() => window.location.reload()}
          style={{ padding:'10px 22px', background:'#c2714f', border:'none', borderRadius:8,
            color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600 }}>
          Reload
        </button>
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

// ── Exam schedule (keyed by subjectId) ─────────────────────────────────────
const EXAM_SCHEDULE = {
  maths: [
    { date:'2026-06-02', paper:'Paper 1: Pure Mathematics 1', code:'9MA0/01', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    { date:'2026-06-12', paper:'Paper 2: Pure Mathematics 2', code:'9MA0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    { date:'2026-06-18', paper:'Paper 3: Statistics & Mechanics', code:'9MA0/03', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
  ],
  'further-maths': [
    { date:'2026-05-14', paper:'Core Pure Mathematics 1', code:'9FM0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
    { date:'2026-05-21', paper:'Core Pure Mathematics 2', code:'9FM0/02', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
    { date:'2026-06-16', paper:'Decision Mathematics 1', code:'9FM0/3D', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
    { date:'2026-06-19', paper:'Further Pure Mathematics 1', code:'9FM0/3A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
  ],
  cs: [
    { date:'2026-06-10', paper:'Paper 1: Computer Systems', code:'H446/01', board:'OCR', time:'PM', duration:'2h 30m', maxMark:140 },
    { date:'2026-06-17', paper:'Paper 2: Algorithms & Programming', code:'H446/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:140 },
  ],
  chemistry: [
    { date:'2026-05-12', paper:'Paper 1: Inorganic & Physical Chemistry', code:'7405/1', board:'AQA', time:'PM', duration:'2h', maxMark:105 },
    { date:'2026-06-04', paper:'Paper 2: Organic & Physical Chemistry', code:'7405/2', board:'AQA', time:'PM', duration:'2h', maxMark:105 },
    { date:'2026-06-18', paper:'Paper 3: Practical Skills', code:'7405/3', board:'AQA', time:'PM', duration:'2h', maxMark:90 },
  ],
  physics: [
    { date:'2026-05-20', paper:'Component 1: Modelling Physics', code:'H557/01', board:'OCR A', time:'PM', duration:'2h 15m', maxMark:100 },
    { date:'2026-06-01', paper:'Component 2: Exploring Physics', code:'H557/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
    { date:'2026-06-08', paper:'Component 3: Unified Physics', code:'H557/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70 },
  ],
  economics: [
    { date:'2026-05-11', paper:'Paper 1: Markets & Market Failure', code:'7136/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    { date:'2026-05-18', paper:'Paper 2: National & International Economy', code:'7136/2', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
    { date:'2026-06-04', paper:'Paper 3: Economic Principles & Issues', code:'7136/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
  ],
  biology: [
    { date:'2026-05-15', paper:'Paper 1: Biological Processes', code:'7402/1', board:'AQA', time:'PM', duration:'2h', maxMark:91 },
    { date:'2026-06-05', paper:'Paper 2: Biological Diversity', code:'7402/2', board:'AQA', time:'AM', duration:'2h', maxMark:91 },
    { date:'2026-06-19', paper:'Paper 3: Essay & Data Analysis', code:'7402/3', board:'AQA', time:'PM', duration:'2h', maxMark:78 },
  ],
};

// ── Raw grade boundaries ────────────────────────────────────────────────────
const RAW_BOUNDARIES = {
  'Edexcel 9FM0/01 Core Pure 1 — 2023':{ max:75,'A*':62,A:51,B:40,C:29,D:19,E:10 },
  'Edexcel 9FM0/01 Core Pure 1 — 2022':{ max:75,'A*':61,A:51,B:41,C:31,D:21,E:12 },
  'Edexcel 9FM0/01 Core Pure 1 — 2019':{ max:75,'A*':68,A:56,B:45,C:34,D:23,E:12 },
  'Edexcel 9FM0/02 Core Pure 2 — 2023':{ max:75,'A*':61,A:50,B:39,C:29,D:19,E:10 },
  'Edexcel 9FM0/02 Core Pure 2 — 2022':{ max:75,'A*':60,A:50,B:40,C:30,D:20,E:11 },
  'Edexcel 9FM0/02 Core Pure 2 — 2019':{ max:75,'A*':66,A:55,B:44,C:33,D:22,E:12 },
  'Edexcel 9MA0/01 Pure 1 — 2023':{ max:100,'A*':73,A:61,B:50,C:39,D:29,E:19 },
  'Edexcel 9MA0/01 Pure 1 — 2022':{ max:100,'A*':72,A:60,B:49,C:38,D:28,E:18 },
  'Edexcel 9MA0/01 Pure 1 — 2019':{ max:100,'A*':77,A:64,B:53,C:42,D:32,E:22 },
  'Edexcel 9MA0/02 Pure 2 — 2023':{ max:100,'A*':72,A:59,B:48,C:37,D:27,E:17 },
  'Edexcel 9MA0/02 Pure 2 — 2022':{ max:100,'A*':71,A:58,B:47,C:36,D:26,E:17 },
  'Edexcel 9MA0/02 Pure 2 — 2019':{ max:100,'A*':76,A:63,B:52,C:41,D:31,E:21 },
  'Edexcel 9MA0/03 Stats & Mech — 2023':{ max:100,'A*':70,A:57,B:46,C:35,D:25,E:16 },
  'Edexcel 9MA0/03 Stats & Mech — 2022':{ max:100,'A*':68,A:55,B:44,C:33,D:23,E:14 },
  'Edexcel 9MA0/03 Stats & Mech — 2019':{ max:100,'A*':73,A:60,B:49,C:38,D:28,E:18 },
};

const ERROR_TYPES = [
  { id:'calc',     label:'Calculation error',     color:'#f59e0b' },
  { id:'method',   label:'Wrong method',           color:'#ef4444' },
  { id:'read',     label:'Misread question',       color:'#f97316' },
  { id:'forgot',   label:'Forgot content',         color:'#8b5cf6' },
  { id:'time',     label:'Ran out of time',        color:'#3b82f6' },
  { id:'notation', label:'Notation/presentation',  color:'#14b8a6' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k)     => { try { localStorage.removeItem(k); } catch {} },
};

function daysUntil(d) {
  const n = new Date(); n.setHours(0,0,0,0);
  const t = new Date(d); t.setHours(0,0,0,0);
  return Math.ceil((t - n) / 86400000);
}

function gradeColor(g) {
  return { 'A*':'#22c55e', A:'#4ade80', B:'#fbbf24', C:'#fb923c', D:'#f87171', E:'#ef4444', U:'#71717a' }[g] ?? '#71717a';
}

function getGrade(got, maxMark, paperKey, boundaries) {
  const rb = RAW_BOUNDARIES[paperKey];
  if (rb) {
    for (const g of ['A*','A','B','C','D','E']) if (got >= rb[g]) return { grade:g, exact:true };
    return { grade:'U', exact:true };
  }
  const pct = Math.round((got / maxMark) * 100);
  const b = boundaries || {};
  for (const g of ['A*','A','B','C','D','E']) if (pct >= (b[g] ?? 0)) return { grade:g, exact:false };
  return { grade:'U', exact:false };
}

function calcReadiness(scores) {
  if (!scores.length) return { total:0, label:'No data yet', color:'#71717a', avg:0 };
  const avg = scores.reduce((a,s) => a + s.pct, 0) / scores.length;
  const paperPts  = Math.min(30, Math.round((scores.length / 15) * 30));
  const avgPts    = Math.round((avg / 100) * 50);
  const recent    = scores.filter(s => Date.now() - s.ts < 14 * 86400000).length;
  const recentPts = Math.min(20, recent * 4);
  const total     = paperPts + avgPts + recentPts;
  const label     = total >= 80 ? 'Battle Ready' : total >= 55 ? 'On Track' : total >= 30 ? 'Building' : 'Just Started';
  const color     = total >= 80 ? '#22c55e' : total >= 55 ? '#f59e0b' : total >= 30 ? '#f97316' : '#ef4444';
  return { total, label, color, avg: Math.round(avg) };
}

// ── Trend chart ────────────────────────────────────────────────────────────
function TrendChart({ scores, subject, color, boundaries, C }) {
  const data = [...scores].filter(s => s.subject === subject).reverse();
  if (data.length < 2) return (
    <div style={{ height:90, display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:12, color:C.subtle }}>
      Log 2+ papers to see your trend
    </div>
  );
  const W=460, H=90, P={t:8,r:12,b:22,l:32};
  const pcts = data.map(d => d.pct);
  const lo = Math.max(0, Math.min(...pcts) - 10), hi = Math.min(100, Math.max(...pcts) + 10);
  const x = i => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const pts = data.map((d,i) => [x(i), y(d.pct)]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `M ${pts[0][0]},${y(lo)} L ${pts.map(p=>p.join(',')).join(' L ')} L ${pts[pts.length-1][0]},${y(lo)} Z`;
  const astarY = boundaries?.['A*'] ? y(boundaries['A*']) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block' }}>
      {astarY && astarY > P.t && astarY < H - P.b && (
        <g>
          <line x1={P.l} y1={astarY} x2={W-P.r} y2={astarY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" opacity="0.35"/>
          <text x={W-P.r+2} y={astarY+4} fill="#22c55e" fontSize="7" opacity="0.7">A*</text>
        </g>
      )}
      {[lo, hi].map(v => (
        <text key={v} x={P.l-4} y={y(v)+4} fill={C.subtle} fontSize="7" textAnchor="end">{Math.round(v)}%</text>
      ))}
      <path d={area} fill={color} opacity="0.07"/>
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill={color} stroke={C.card} strokeWidth="1.5"/>
          <text x={p[0]} y={H-P.b+10} fill={C.subtle} fontSize="6.5" textAnchor="middle">
            {data[i].date?.split(' ').slice(0,2).join(' ') || `P${i+1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Analytics view ──────────────────────────────────────────────────────────
function Analytics({ subjects, scores, C, font }) {
  const r = calcReadiness(scores);
  const [activeSubj, setActiveSubj] = useState(subjects[0]?.name ?? '');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Readiness card */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.muted, letterSpacing:0.5, textTransform:'uppercase' }}>
              Battle Readiness
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:r.color, lineHeight:1.2, marginTop:4 }}>
              {r.total}<span style={{ fontSize:16, fontWeight:500, color:C.muted }}>/100</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.label}</div>
            {r.avg > 0 && (
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Avg score {r.avg}%</div>
            )}
          </div>
        </div>
        <div style={{ height:6, borderRadius:3, background:C.card2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${r.total}%`, background:r.color,
            borderRadius:3, transition:'width 0.8s ease' }}/>
        </div>
        {scores.length === 0 && (
          <p style={{ fontSize:12, color:C.subtle, margin:'12px 0 0', lineHeight:1.6 }}>
            Log your first past paper in the Tracker to start building your score.
          </p>
        )}
      </div>

      {/* Per-subject trends */}
      {subjects.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, overflowX:'auto' }}>
            {subjects.map(s => (
              <button key={s.name} onClick={() => setActiveSubj(s.name)}
                style={{ padding:'12px 18px', background:'transparent', border:'none',
                  borderBottom:`2px solid ${activeSubj===s.name ? s.color : 'transparent'}`,
                  color:activeSubj===s.name ? s.color : C.muted,
                  fontSize:12, fontWeight:activeSubj===s.name ? 700 : 400,
                  fontFamily:font, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                  transition:'all 0.15s' }}>
                {s.name}
              </button>
            ))}
          </div>
          {subjects.filter(s => s.name === activeSubj).map(s => {
            const sScores = scores.filter(sc => sc.subject === s.name);
            return (
              <div key={s.name} style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Score trend</span>
                  <span style={{ fontSize:12, color:C.muted }}>{sScores.length} paper{sScores.length!==1?'s':''} logged</span>
                </div>
                <TrendChart scores={scores} subject={s.name} color={s.color} boundaries={s.gradeBoundaries} C={C}/>
                {sScores.length > 0 && (
                  <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                    {['A*','A','B','C'].map(g => {
                      const count = sScores.filter(sc => {
                        const {grade} = getGrade(sc.got, sc.maxMark, sc.paper, s.gradeBoundaries);
                        return grade === g;
                      }).length;
                      return count > 0 ? (
                        <div key={g} style={{ padding:'4px 10px', borderRadius:6,
                          background:`${gradeColor(g)}15`, border:`1px solid ${gradeColor(g)}40`,
                          fontSize:11, fontWeight:700, color:gradeColor(g) }}>
                          {g}: {count}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Locked premium cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          { icon:'📈', title:'Grade Predictor', desc:'Estimate your final grade based on paper trends' },
          { icon:'🤖', title:'AI Error Analysis', desc:'Identify patterns in your mistakes automatically' },
        ].map(item => (
          <div key={item.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
            padding:'16px 16px 14px', position:'relative', opacity:0.7 }}>
            <div style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:4,
              background:C.accentSoft, fontSize:9, fontWeight:700, color:C.accent, letterSpacing:0.3 }}>
              PRO
            </div>
            <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:4 }}>{item.title}</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tracker view ────────────────────────────────────────────────────────────
function Tracker({ subjects, scores, setScores, errors, setErrors, uid, C, font }) {
  const [form, setForm]           = useState({ subj:'', paper:'', got:'', maxMark:'', errors:[] });
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sfilt, setSfilt]         = useState('All');

  const subjOptions = subjects.map(s => s.name);

  const selectedSubj = subjects.find(s => s.name === form.subj);
  const paperOptions = selectedSubj?.papers ?? [];

  function submit() {
    const got = parseFloat(form.got);
    const max = parseFloat(form.maxMark) || selectedSubj?.gradeBoundaries?.['max'] || 100;
    if (!form.subj || !form.paper || isNaN(got) || got < 0 || got > max) return;
    const pct = Math.round((got / max) * 100);
    const ts  = Date.now();
    const d   = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const newScore = { id:ts, ts, subject:form.subj, paper:form.paper, got, maxMark:max, pct, date:d };
    const updated  = [newScore, ...scores];
    setScores(updated);
    ls.set(`rbp_scores_${uid}`, updated);
    if (form.errors.length) {
      const newErrs = form.errors.map(t => ({ id:ts + Math.random(), ts, type:t, subject:form.subj, paper:form.paper }));
      const updatedE = [...newErrs, ...errors];
      setErrors(updatedE);
      ls.set(`rbp_errors_${uid}`, updatedE);
    }
    setForm({ subj:'', paper:'', got:'', maxMark:'', errors:[] });
    setShowForm(false);
  }

  const displayed = sfilt === 'All' ? scores : scores.filter(s => s.subject === sfilt);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text, margin:0 }}>Paper Tracker</h2>
          <p style={{ fontSize:12, color:C.muted, margin:'3px 0 0' }}>
            {scores.length} paper{scores.length!==1?'s':''} logged · synced to your account
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding:'9px 16px', background:C.accent, border:'none', borderRadius:9,
            color:'#fff', fontSize:13, fontWeight:700, fontFamily:font, cursor:'pointer' }}>
          + Log paper
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 20px 18px' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:C.text, margin:'0 0 16px' }}>Log a past paper</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:5 }}>Subject</label>
                <select value={form.subj} onChange={e => setForm({...form, subj:e.target.value, paper:''})}
                  style={{ width:'100%', padding:'9px 10px', border:`1px solid ${C.border}`, borderRadius:8,
                    background:C.card2, color:C.text, fontSize:13, fontFamily:font }}>
                  <option value=''>Select…</option>
                  {subjOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:5 }}>Paper</label>
                <select value={form.paper} onChange={e => setForm({...form, paper:e.target.value})}
                  style={{ width:'100%', padding:'9px 10px', border:`1px solid ${C.border}`, borderRadius:8,
                    background:C.card2, color:C.text, fontSize:13, fontFamily:font }}>
                  <option value=''>Select…</option>
                  {paperOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:5 }}>
                  Marks scored
                </label>
                <input type='number' min={0} value={form.got} placeholder='e.g. 72'
                  onChange={e => setForm({...form, got:e.target.value})}
                  style={{ width:'100%', padding:'9px 10px', border:`1px solid ${C.border}`, borderRadius:8,
                    background:C.card2, color:C.text, fontSize:13, fontFamily:font, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:5 }}>
                  Out of
                </label>
                <input type='number' min={1} value={form.maxMark} placeholder={selectedSubj ? '100' : '—'}
                  onChange={e => setForm({...form, maxMark:e.target.value})}
                  style={{ width:'100%', padding:'9px 10px', border:`1px solid ${C.border}`, borderRadius:8,
                    background:C.card2, color:C.text, fontSize:13, fontFamily:font, boxSizing:'border-box' }}/>
              </div>
            </div>
            {form.got && form.subj && (() => {
              const max = parseFloat(form.maxMark) || 100;
              const got = parseFloat(form.got);
              if (!isNaN(got) && !isNaN(max) && max > 0) {
                const pct = Math.round((got/max)*100);
                const {grade} = getGrade(got, max, form.paper, selectedSubj?.gradeBoundaries);
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    background:C.card2, borderRadius:8 }}>
                    <span style={{ fontSize:13, color:C.muted }}>{pct}%</span>
                    <span style={{ fontSize:14, fontWeight:800, color:gradeColor(grade) }}>→ {grade}</span>
                  </div>
                );
              }
            })()}
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:8 }}>
                Error types (optional)
              </label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ERROR_TYPES.map(et => {
                  const on = form.errors.includes(et.id);
                  return (
                    <button key={et.id}
                      onClick={() => setForm({...form, errors: on ? form.errors.filter(x=>x!==et.id) : [...form.errors, et.id]})}
                      style={{ padding:'5px 11px', borderRadius:6, border:`1.5px solid ${on ? et.color+'66' : C.border}`,
                        background:on ? `${et.color}14` : 'transparent', color:on ? et.color : C.muted,
                        fontSize:11, fontWeight:on?700:400, fontFamily:font, cursor:'pointer' }}>
                      {et.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex:1, padding:'10px', background:'transparent', border:`1px solid ${C.border}`,
                  borderRadius:8, color:C.muted, fontSize:13, fontFamily:font, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={!form.subj || !form.paper || !form.got}
                style={{ flex:2, padding:'10px', background:form.subj&&form.paper&&form.got ? C.accent : C.card2,
                  border:'none', borderRadius:8,
                  color:form.subj&&form.paper&&form.got ? '#fff' : C.subtle,
                  fontSize:13, fontWeight:700, fontFamily:font, cursor:'pointer' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {scores.length > 0 && (
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {['All', ...subjOptions].map(s => {
            const on = sfilt === s;
            const subj = subjects.find(x => x.name === s);
            return (
              <button key={s} onClick={() => setSfilt(s)}
                style={{ padding:'6px 14px', borderRadius:7, border:`1.5px solid ${on ? (subj?.color||C.accent)+'66' : C.border}`,
                  background:on ? `${subj?.color||C.accent}12` : 'transparent',
                  color:on ? (subj?.color||C.accent) : C.muted,
                  fontSize:12, fontWeight:on?700:400, fontFamily:font, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* Paper list */}
      {displayed.length === 0 ? (
        <div style={{ padding:'32px 0', textAlign:'center', color:C.subtle, fontSize:13 }}>
          No papers logged yet. Hit <strong style={{color:C.accent}}>+ Log paper</strong> above.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {displayed.slice(0, 30).map(s => {
            const subj = subjects.find(x => x.name === s.subject);
            const {grade, exact} = getGrade(s.got, s.maxMark, s.paper, subj?.gradeBoundaries);
            return (
              <div key={s.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
                padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:3, height:40, borderRadius:2, background:subj?.color||C.accent, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2, whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}>{s.paper}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{s.subject} · {s.date}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:gradeColor(grade) }}>{grade}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{s.pct}%{!exact?' ≈':''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error pattern summary */}
      {errors.length >= 3 && (() => {
        const counts = {};
        errors.forEach(e => { counts[e.type] = (counts[e.type]||0) + 1; });
        const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
        return (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>
              Your error patterns
            </div>
            {top.map(([id, count]) => {
              const et = ERROR_TYPES.find(e => e.id === id);
              if (!et) return null;
              return (
                <div key={id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:et.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:C.text, flex:1 }}>{et.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:et.color }}>×{count}</span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ── Exams / Countdown view ──────────────────────────────────────────────────
function Exams({ subjects, C, font }) {
  const allExams = subjects.flatMap(s => {
    const exs = EXAM_SCHEDULE[s.id] ?? [];
    return exs.map(e => ({ ...e, subjectName:s.name, color:s.color }));
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  const upcoming = allExams.filter(e => daysUntil(e.date) >= 0);
  const past     = allExams.filter(e => daysUntil(e.date) < 0);

  if (allExams.length === 0) return (
    <div style={{ padding:'40px 0', textAlign:'center', color:C.subtle, fontSize:13 }}>
      Exam schedule data isn't available for your subjects yet.
    </div>
  );

  const Section = ({ title, items }) => (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase',
        letterSpacing:0.6, marginBottom:10 }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {items.map((e,i) => {
          const days = daysUntil(e.date);
          const urgent = days <= 14 && days >= 0;
          const done   = days < 0;
          return (
            <div key={i} style={{ background:C.card, border:`1px solid ${urgent ? e.color+'40' : C.border}`,
              borderRadius:12, padding:'14px 16px', display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ textAlign:'center', minWidth:48, flexShrink:0 }}>
                <div style={{ fontSize:20, fontWeight:800, color:done ? C.subtle : urgent ? e.color : C.text, lineHeight:1 }}>
                  {done ? '✓' : days === 0 ? 'TODAY' : days}
                </div>
                {!done && days > 0 && (
                  <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>days</div>
                )}
              </div>
              <div style={{ width:1, height:36, background:C.border, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:done ? C.muted : C.text,
                  textDecoration:done ? 'line-through' : 'none', marginBottom:2,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {e.paper}
                </div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {e.subjectName} · {e.code} · {new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} {e.time} · {e.duration}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {upcoming.length > 0 && <Section title="Upcoming" items={upcoming}/>}
      {past.length > 0 && <Section title="Completed" items={past}/>}
    </div>
  );
}

// ── Tips / Technique view ───────────────────────────────────────────────────
function Tips({ subjects, C, font }) {
  const [activeSubj, setActiveSubj] = useState(subjects[0]?.name ?? '');

  const GENERIC = [
    { title:'Timed conditions first', body:'Your first attempt at any paper must be closed-book and timed. Comfortable practice gives false confidence.' },
    { title:'Mark immediately — every question', body:"Don't skip the mark scheme. Every wrong answer goes into your error log with a topic and reason." },
    { title:'Retrieval over re-reading', body:'Write everything you remember before opening any resource. Retrieval practice beats re-reading by 2–3× for retention.' },
    { title:'Teach it in one sentence', body:"If you can't explain a concept simply, your understanding has gaps. Simplicity is a proxy for depth." },
    { title:'Redo every wrong question', body:'Two weeks after marking, redo wrong questions from scratch. If you still can\'t do it, the topic needs active work.' },
    { title:'Sleep is part of revision', body:'Memory consolidates during sleep. Cutting sleep to revise more is a net loss — you encode and retrieve less.' },
  ];

  const activeSubjData = subjects.find(s => s.name === activeSubj);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {subjects.length > 1 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, overflowX:'auto' }}>
            {[{name:'General', color:C.accent}, ...subjects].map(s => (
              <button key={s.name} onClick={() => setActiveSubj(s.name)}
                style={{ padding:'11px 16px', background:'transparent', border:'none',
                  borderBottom:`2px solid ${activeSubj===s.name ? s.color : 'transparent'}`,
                  color:activeSubj===s.name ? s.color : C.muted,
                  fontSize:12, fontWeight:activeSubj===s.name?700:400,
                  fontFamily:font, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
                {s.name}
              </button>
            ))}
          </div>
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            {(activeSubjData?.techniques ?? GENERIC).map((tip,i) => (
              <div key={i} style={{ paddingBottom:i < (activeSubjData?.techniques??GENERIC).length-1 ? 12 : 0,
                borderBottom:i < (activeSubjData?.techniques??GENERIC).length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{tip.title}</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{tip.body || tip.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked: Study Schedule */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px',
        opacity:0.75, position:'relative' }}>
        <div style={{ position:'absolute', top:14, right:14, padding:'2px 8px', borderRadius:4,
          background:C.accentSoft, fontSize:9, fontWeight:700, color:C.accent, letterSpacing:0.3 }}>PRO</div>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>📅 Personalised Study Schedule</div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
          A week-by-week plan tailored to your exam dates, current readiness, and weak spots.
          Generates automatically from your paper history.
        </div>
      </div>
    </div>
  );
}

// ── Account view ────────────────────────────────────────────────────────────
function Account({ user, subjects, selection, dark, setDark, onSignOut, onResetSubjects, C, font }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Profile */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Account</div>
        <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>{user?.email ?? 'Signed in'}</div>
        <div style={{ fontSize:11, color:C.subtle }}>
          {subjects.length} subject{subjects.length!==1?'s':''}: {subjects.map(s=>s.name).join(', ')}
        </div>
      </div>

      {/* Subjects */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Subjects</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {subjects.map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }}/>
              <span style={{ fontSize:13, color:C.text, flex:1 }}>{s.name}</span>
              <span style={{ fontSize:11, color:C.muted }}>{s.board}</span>
            </div>
          ))}
        </div>
        <button onClick={onResetSubjects}
          style={{ width:'100%', padding:'10px', background:C.card2, border:`1px solid ${C.border}`,
            borderRadius:8, color:C.muted, fontSize:13, fontFamily:font, cursor:'pointer' }}>
          Change subjects
        </button>
      </div>

      {/* Appearance */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Appearance</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:C.text }}>Dark mode</span>
          <button onClick={() => { const next=!dark; setDark(next); ls.set('rbp_dark', next); }}
            style={{ width:44, height:24, borderRadius:12, background:dark?C.accent:C.border,
              border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
            <div style={{ position:'absolute', top:3, left:dark?22:3, width:18, height:18,
              borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={onSignOut}
        style={{ width:'100%', padding:'12px', background:'transparent',
          border:`1px solid ${C.danger}40`, borderRadius:10, color:C.danger,
          fontSize:13, fontWeight:600, fontFamily:font, cursor:'pointer' }}>
        Sign out
      </button>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────
function RevisionPlan({ user, selection, onSignOut, onResetSubjects }) {
  const [dark, setDark]   = useState(() => ls.get('rbp_dark', false));
  const [view, setView]   = useState('analytics');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const uid     = user?.id ?? 'anon';
  const [scores,   setScores]   = useState(() => ls.get(`rbp_scores_${uid}`, []));
  const [errors,   setErrors]   = useState(() => ls.get(`rbp_errors_${uid}`, []));

  const C    = dark ? T.dark : T.light;
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const subjects = subjectsFromSelection(selection);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive:true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Force mobile users to valid views
  useEffect(() => {
    if (isMobile && !['analytics','tracker','exams'].includes(view)) setView('analytics');
  }, [isMobile]);

  const NAV = [
    { id:'analytics', label:'Analytics', icon:'📊' },
    { id:'tracker',   label:'Tracker',   icon:'📝' },
    { id:'exams',     label:'Exams',     icon:'📅' },
    ...(!isMobile ? [
      { id:'tips',    label:'Tips',      icon:'💡' },
      { id:'account', label:'Account',   icon:'👤' },
    ] : []),
  ];

  const viewProps = { subjects, C, font };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font, color:C.text }}>

      {/* Top nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100,
        background:C.nav, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:`1px solid ${C.border}`, height:54 }}>
        <div style={{ maxWidth:720, margin:'0 auto', height:'100%', padding:'0 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:C.accent,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:900, color:'#fff', fontFamily:"'JetBrains Mono',monospace" }}>
              A*
            </div>
            {!isMobile && (
              <span style={{ fontSize:14, fontWeight:700, color:C.text, letterSpacing:0.2 }}>
                Battle Plan
              </span>
            )}
          </div>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display:'flex', gap:2 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={() => setView(n.id)}
                  style={{ padding:'6px 14px', background:view===n.id ? C.accentSoft : 'transparent',
                    border:'none', borderRadius:7, color:view===n.id ? C.accent : C.muted,
                    fontSize:13, fontWeight:view===n.id?700:400, fontFamily:font, cursor:'pointer' }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}

          {/* Right controls */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => { const next=!dark; setDark(next); ls.set('rbp_dark', next); }}
              style={{ width:32, height:32, borderRadius:8, background:C.card2, border:`1px solid ${C.border}`,
                cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {isMobile && (
              <button onClick={() => setView('account')}
                style={{ width:32, height:32, borderRadius:8, background:C.card2, border:`1px solid ${C.border}`,
                  cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                👤
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth:720, margin:'0 auto', padding:`${54+20}px 16px ${isMobile?80:32}px` }}>
        {view === 'analytics' && <Analytics {...viewProps} scores={scores}/>}
        {view === 'tracker'   && <Tracker   {...viewProps} scores={scores} setScores={setScores}
                                   errors={errors} setErrors={setErrors} uid={uid}/>}
        {view === 'exams'     && <Exams     {...viewProps}/>}
        {view === 'tips'      && <Tips      {...viewProps}/>}
        {view === 'account'   && <Account   {...viewProps} user={user} selection={selection}
                                   dark={dark} setDark={setDark}
                                   onSignOut={onSignOut} onResetSubjects={onResetSubjects}/>}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background:C.nav, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          borderTop:`1px solid ${C.border}`, display:'grid',
          gridTemplateColumns:'1fr 1fr 1fr', height:58 }}>
          {[
            { id:'analytics', label:'Analytics', icon:'📊' },
            { id:'tracker',   label:'Tracker',   icon:'📝' },
            { id:'exams',     label:'Exams',     icon:'📅' },
          ].map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:3, background:'transparent', border:'none', cursor:'pointer',
                color:view===n.id ? C.accent : C.muted,
                fontSize:9, fontFamily:font, fontWeight:view===n.id?700:400,
                position:'relative', transition:'color 0.15s', padding:'8px 0' }}>
              {view===n.id && (
                <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:2,
                  borderRadius:1, background:C.accent }}/>
              )}
              <span style={{ fontSize:20, lineHeight:1 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

// ── App root — clean auth state machine ────────────────────────────────────
export default function App() {
  // phase: 'loading' | 'anon' | 'onboarding' | 'app'
  const [phase,     setPhase]     = useState('loading');
  const [user,      setUser]      = useState(null);
  const [selection, setSelection] = useState([]);

  const dark = ls.get('rbp_dark', false);
  const C    = dark ? T.dark : T.light;
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  useEffect(() => {
    if (!isSupabaseConfigured()) { setPhase('anon'); return; }
    let alive = true;

    async function boot(session) {
      if (!session?.user) {
        if (alive) { setUser(null); setPhase('anon'); }
        return;
      }
      const u   = session.user;
      const uid = u.id;
      if (alive) setUser(u);

      try {
        // Ensure profile row exists (trigger might not have fired yet)
        await supabase.from('user_profiles')
          .upsert({ id:uid, email:u.email }, { onConflict:'id', ignoreDuplicates:true });

        const { data } = await supabase
          .from('user_profiles')
          .select('subjects')
          .eq('id', uid)
          .single();

        if (!alive) return;

        let sel = [];
        try { if (data?.subjects) sel = JSON.parse(data.subjects); } catch {}

        if (Array.isArray(sel) && sel.length > 0) {
          ls.set(`rbp_sel_${uid}`, sel);
          setSelection(sel);
          setPhase('app');
        } else {
          const cached = ls.get(`rbp_sel_${uid}`, []);
          if (cached.length > 0) {
            setSelection(cached);
            setPhase('app');
            supabase.rpc('save_subjects', { p_subjects: JSON.stringify(cached) });
          } else {
            setPhase('onboarding');
          }
        }
      } catch {
        if (!alive) return;
        const cached = ls.get(`rbp_sel_${uid}`, []);
        if (cached.length > 0) { setSelection(cached); setPhase('app'); }
        else setPhase('onboarding');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => boot(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (alive) { setUser(null); setSelection([]); setPhase('anon'); }
      } else if (event === 'SIGNED_IN') {
        boot(session);
      }
      // TOKEN_REFRESHED / USER_UPDATED — do nothing
    });

    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  function handleSubjectsDone(sel) {
    setSelection(sel);
    setPhase('app');
  }

  async function handleSignOut() {
    const uid = user?.id;
    await supabase.auth.signOut();
    if (uid) ls.del(`rbp_sel_${uid}`);
    setUser(null); setSelection([]); setPhase('anon');
  }

  async function handleResetSubjects() {
    const uid = user?.id;
    if (uid) ls.del(`rbp_sel_${uid}`);
    await supabase.rpc('save_subjects', { p_subjects: '[]' });
    setSelection([]);
    setPhase('onboarding');
  }

  const loadingScreen = (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:16, fontFamily:font }}>
      <div style={{ width:36, height:36, borderRadius:10, background:C.accent,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, fontWeight:900, color:'#fff', fontFamily:"'JetBrains Mono',monospace" }}>A*</div>
      <div style={{ fontSize:13, color:C.muted }}>Loading…</div>
    </div>
  );

  if (phase === 'loading')     return <ErrorBoundary>{loadingScreen}</ErrorBoundary>;
  if (phase === 'anon')        return <ErrorBoundary><AuthGate onAuth={() => {}} /></ErrorBoundary>;
  if (phase === 'onboarding')  return <ErrorBoundary><SubjectPicker user={user} onComplete={handleSubjectsDone} /></ErrorBoundary>;

  return (
    <ErrorBoundary>
      <RevisionPlan
        user={user}
        selection={selection}
        onSignOut={handleSignOut}
        onResetSubjects={handleResetSubjects}
      />
    </ErrorBoundary>
  );
}
