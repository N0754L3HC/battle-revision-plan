import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthGate from './components/AuthGate';
import SubjectPicker from './components/SubjectPicker';
import FriendsView from './components/FriendsView';
import { subjectsFromSelection, GCSE_CATALOG } from './data/subjects';
import { BarChart3, PenLine, CalendarDays, ClipboardList, Trophy, Users, Timer, BookOpen, User, Sun, Moon, Lock, Pencil, GraduationCap, FileText, TrendingUp, Zap, Star, ArrowUpRight, Target, Shield, CheckCircle, Calendar, Search } from 'lucide-react';

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
    bg:      '#f0ece6',
    surface: '#ffffff',
    nav:     'rgba(248,245,241,0.97)',
    border:  'rgba(0,0,0,0.09)',
    card:    '#faf8f5',
    card2:   'rgba(0,0,0,0.04)',
    text:    '#18170f',
    muted:   '#574f48',
    subtle:  '#9b938b',
    accent:  '#b5735a',
    accentSoft: 'rgba(181,115,90,0.10)',
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

// ── Exam schedule (subjectId → boardId → exams) ────────────────────────────
const EXAM_SCHEDULE = {
  maths: {
    edexcel: [
      { date:'2026-06-03', paper:'Paper 1: Pure Mathematics 1',     code:'9MA0/01', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Pure Mathematics 2',     code:'9MA0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Statistics & Mechanics', code:'9MA0/03', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    ],
    aqa: [
      { date:'2026-05-20', paper:'Paper 1: Pure Mathematics (7357/1)',              code:'7357/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-03', paper:'Paper 2: Pure Mathematics & Mechanics (7357/2)',  code:'7357/2', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-12', paper:'Paper 3: Pure Mathematics & Statistics (7357/3)', code:'7357/3', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
    ],
    'ocr-a': [
      { date:'2026-05-19', paper:'Paper 1: Pure Mathematics (H230/01)',                       code:'H230/01', board:'OCR A', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 2: Pure Mathematics & Statistics (H230/02)',          code:'H230/02', board:'OCR A', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-19', paper:'Paper 3: Pure Mathematics & Mechanics (H230/03)',           code:'H230/03', board:'OCR A', time:'PM', duration:'2h', maxMark:100 },
    ],
  },
  'further-maths': {
    edexcel: [
      { date:'2026-05-14', paper:'Core Pure Mathematics 1',           code:'9FM0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-05-21', paper:'Core Pure Mathematics 2',           code:'9FM0/02', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-05', paper:'Option: Further Mechanics 1',       code:'9FM0/3C', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-12', paper:'Option: Further Statistics 1',      code:'9FM0/3B', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-16', paper:'Option: Decision Mathematics 1',    code:'9FM0/3D', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
    ],
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Compulsory (7367/1)',  code:'7367/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-05-20', paper:'Paper 2: Optional 1 (7367/2)', code:'7367/2', board:'AQA', time:'AM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-10', paper:'Paper 3: Optional 2 (7367/3)', code:'7367/3', board:'AQA', time:'PM', duration:'1h 30m', maxMark:75 },
    ],
  },
  cs: {
    ocr: [
      { date:'2026-06-10', paper:'Paper 1: Computer Systems',         code:'H446/01', board:'OCR', time:'PM', duration:'2h 30m', maxMark:140 },
      { date:'2026-06-17', paper:'Paper 2: Algorithms & Programming', code:'H446/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:140 },
    ],
    aqa: [
      { date:'2026-06-11', paper:'Paper 1: On-screen exam (7517/1)', code:'7517/1', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
      { date:'2026-06-18', paper:'Paper 2: Written exam (7517/2)',   code:'7517/2', board:'AQA', time:'AM', duration:'2h 30m', maxMark:75 },
    ],
    edexcel: [
      { date:'2026-06-04', paper:'Paper 1: Computational Thinking (9CP0/01)',  code:'9CP0/01', board:'Edexcel', time:'PM', duration:'2h 30m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Algorithms & Programming (9CP0/02)', code:'9CP0/02', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:100 },
    ],
  },
  chemistry: {
    aqa: [
      { date:'2026-06-02', paper:'Paper 1: Inorganic & Physical Chemistry', code:'7405/1', board:'AQA', time:'AM', duration:'2h', maxMark:105 },
      { date:'2026-06-09', paper:'Paper 2: Organic & Physical Chemistry',   code:'7405/2', board:'AQA', time:'AM', duration:'2h', maxMark:105 },
      { date:'2026-06-15', paper:'Paper 3: Practical Skills',               code:'7405/3', board:'AQA', time:'AM', duration:'2h', maxMark:90  },
    ],
    edexcel: [
      { date:'2026-06-01', paper:'Paper 1: Core Inorganic & Physical Chemistry (9CH0/01)',    code:'9CH0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-08', paper:'Paper 2: Core Organic & Physical Chemistry (9CH0/02)',      code:'9CH0/02', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 3: General & Practical Principles (9CH0/03)',         code:'9CH0/03', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
    'ocr-a': [
      { date:'2026-06-03', paper:'Paper 1: Periodic Table, Elements & Physical Chemistry (H432/01)', code:'H432/01', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 2: Synthesis & Analytical Techniques (H432/02)',              code:'H432/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Unified Chemistry (H432/03)',                              code:'H432/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
  },
  physics: {
    'ocr-a': [
      { date:'2026-05-20', paper:'Component 1: Modelling Physics (H557/01)',  code:'H557/01', board:'OCR A', time:'PM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-01', paper:'Component 2: Exploring Physics (H557/02)',  code:'H557/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-08', paper:'Component 3: Unified Physics (H557/03)',    code:'H557/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
    aqa: [
      { date:'2026-05-21', paper:'Paper 1: Sections 1–5 (7408/1)',          code:'7408/1', board:'AQA', time:'AM', duration:'2h', maxMark:85 },
      { date:'2026-06-04', paper:'Paper 2: Sections 6–8 (7408/2)',          code:'7408/2', board:'AQA', time:'AM', duration:'2h', maxMark:85 },
      { date:'2026-06-16', paper:'Paper 3: Practical & Options (7408/3)',   code:'7408/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-19', paper:'Paper 1: Advanced Physics I (9PH0/01)',                   code:'9PH0/01', board:'Edexcel', time:'PM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-05', paper:'Paper 2: Advanced Physics II (9PH0/02)',                  code:'9PH0/02', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-17', paper:'Paper 3: General & Practical Principles (9PH0/03)',       code:'9PH0/03', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
  },
  economics: {
    aqa: [
      { date:'2026-05-11', paper:'Paper 1: Markets & Market Failure (7136/1)',         code:'7136/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-05-18', paper:'Paper 2: National & International Economy (7136/2)', code:'7136/2', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 3: Economic Principles & Issues (7136/3)',     code:'7136/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-13', paper:'Paper 1: Markets & Business Behaviour (9EC0/01)',               code:'9EC0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-05-21', paper:'Paper 2: The Macroeconomy (9EC0/02)',                            code:'9EC0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 3: Microeconomics & Macroeconomics (9EC0/03)',             code:'9EC0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  biology: {
    aqa: [
      { date:'2026-06-04', paper:'Paper 1: Biological Processes (7402/1)',  code:'7402/1', board:'AQA', time:'PM', duration:'2h', maxMark:91 },
      { date:'2026-06-12', paper:'Paper 2: Biological Diversity (7402/2)',  code:'7402/2', board:'AQA', time:'AM', duration:'2h', maxMark:91 },
      { date:'2026-06-15', paper:'Paper 3: Essay & Data Analysis (7402/3)', code:'7402/3', board:'AQA', time:'PM', duration:'2h', maxMark:78 },
    ],
    'edexcel-a': [
      { date:'2026-05-19', paper:'Paper 1: The Natural Environment (9BI0/01)',              code:'9BI0/01', board:'Edexcel A', time:'PM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-05', paper:'Paper 2: Energy, Exercise & Co-ordination (9BI0/02)',    code:'9BI0/02', board:'Edexcel A', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 3: General & Practical Principles (9BI0/03)',      code:'9BI0/03', board:'Edexcel A', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
    'ocr-a': [
      { date:'2026-06-03', paper:'Paper 1: Biological Processes (H420/01)',   code:'H420/01', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Biological Diversity (H420/02)',   code:'H420/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Unified Biology (H420/03)',        code:'H420/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
  },
  psychology: {
    aqa: [
      { date:'2026-05-15', paper:'Paper 1: Social Influence, Memory, Attachment & Psychopathology (7182/1)', code:'7182/1', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
      { date:'2026-05-20', paper:'Paper 2: Biopsychology, Approaches & Research Methods (7182/2)',            code:'7182/2', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
      { date:'2026-06-05', paper:'Paper 3: Issues, Debates & Options (7182/3)',                               code:'7182/3', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
    ],
    edexcel: [
      { date:'2026-05-18', paper:'Paper 1: Social & Cognitive Psychology (9PS0/01)',              code:'9PS0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-03', paper:'Paper 2: Biological & Learning Approaches (9PS0/02)',           code:'9PS0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-15', paper:'Paper 3: Clinical Psychology & Issues (9PS0/03)',               code:'9PS0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  sociology: {
    aqa: [
      { date:'2026-05-18', paper:'Paper 1: Education with Theory & Methods (7192/1)',            code:'7192/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-03', paper:'Paper 2: Topics in Sociology (7192/2)',                        code:'7192/2', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-12', paper:'Paper 3: Crime & Deviance with Theory & Methods (7192/3)',     code:'7192/3', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
    ],
  },
  history: {
    aqa: [
      { date:'2026-05-19', paper:'Paper 1: Breadth Study (7042/1)', code:'7042/1', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
      { date:'2026-06-02', paper:'Paper 2: Depth Study (7042/2)',   code:'7042/2', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Breadth Study (9HI0/1)',                    code:'9HI0/1', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:80 },
      { date:'2026-06-02', paper:'Paper 2: Depth Study (9HI0/2)',                      code:'9HI0/2', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:64 },
      { date:'2026-06-09', paper:'Paper 3: Thematic Study & Source Skills (9HI0/3)',   code:'9HI0/3', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:64 },
    ],
  },
  geography: {
    aqa: [
      { date:'2026-05-12', paper:'Paper 1: Physical Geography (7037/1)', code:'7037/1', board:'AQA', time:'AM', duration:'2h 30m', maxMark:80 },
      { date:'2026-05-21', paper:'Paper 2: Human Geography (7037/2)',    code:'7037/2', board:'AQA', time:'PM', duration:'2h 30m', maxMark:80 },
    ],
    'edexcel-a': [
      { date:'2026-05-18', paper:'Paper 1: Dynamic Landscapes (9GE0/01)',        code:'9GE0/01', board:'Edexcel A', time:'AM', duration:'2h 15m', maxMark:94 },
      { date:'2026-06-04', paper:'Paper 2: Dynamic Places (9GE0/02)',            code:'9GE0/02', board:'Edexcel A', time:'PM', duration:'2h 15m', maxMark:94 },
      { date:'2026-06-15', paper:'Paper 3: Synoptic Investigation (9GE0/03)',    code:'9GE0/03', board:'Edexcel A', time:'AM', duration:'2h 30m', maxMark:70 },
    ],
    'ocr-a': [
      { date:'2026-05-13', paper:'Component 1: Physical Systems (H481/01)',        code:'H481/01', board:'OCR A', time:'AM', duration:'2h 30m', maxMark:66 },
      { date:'2026-05-20', paper:'Component 2: Human Interactions (H481/02)',      code:'H481/02', board:'OCR A', time:'PM', duration:'2h 30m', maxMark:66 },
      { date:'2026-06-10', paper:'Component 3: Geographical Debates (H481/03)',    code:'H481/03', board:'OCR A', time:'AM', duration:'3h',     maxMark:70 },
    ],
  },
  'english-lit': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Love Through the Ages (7712/1)',    code:'7712/1', board:'AQA', time:'AM', duration:'3h',     maxMark:75 },
      { date:'2026-06-01', paper:'Paper 2: Texts in Shared Contexts (7712/2)', code:'7712/2', board:'AQA', time:'AM', duration:'2h 30m', maxMark:50 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Drama (9ET0/01)',  code:'9ET0/01', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:60 },
      { date:'2026-05-21', paper:'Paper 2: Prose (9ET0/02)',  code:'9ET0/02', board:'Edexcel', time:'PM', duration:'1h 15m', maxMark:40 },
      { date:'2026-06-08', paper:'Paper 3: Poetry (9ET0/03)', code:'9ET0/03', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:60 },
    ],
    ocr: [
      { date:'2026-05-19', paper:'Paper 1: Drama & Poetry Pre-1900 (H472/01)',         code:'H472/01', board:'OCR', time:'AM', duration:'2h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Comparative & Contextual Study (H472/02)', code:'H472/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:80 },
    ],
  },
  business: {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Business 1 (7132/1)',              code:'7132/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-05-19', paper:'Paper 2: Business 2 (7132/2)',              code:'7132/2', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 3: Business 3 — Case Study (7132/3)', code:'7132/3', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-12', paper:'Paper 1: Marketing, People & Global Business (9BS0/01)',                          code:'9BS0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-05-20', paper:'Paper 2: Business Activities, Decisions & Strategy (9BS0/02)',                    code:'9BS0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 3: Investigating Business in a Competitive Environment (9BS0/03)',          code:'9BS0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
};

// Returns the exam list for a specific subject+board; falls back to first available board
function getSubjectExams(sched, subjectId, boardId) {
  const sub = sched[subjectId];
  if (!sub) return [];
  if (Array.isArray(sub)) return sub; // backward-compat
  return sub[boardId] || sub[Object.keys(sub)[0]] || [];
}

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

// ── Historical grade boundaries (%) per paper per year ──────────────────────
// Official data: Edexcel Maths/FM. Closely-estimated for other boards based on
// published boundary reports and notional-grade patterns. 2020/21 omitted (CAGs/TAGs).
const HISTORICAL_GRADE_PCT = {
  'Paper 1: Pure Mathematics 1':{
    2018:{'A*':77,A:63,B:51,C:39,D:27,E:16},
    2019:{'A*':77,A:64,B:53,C:42,D:32,E:22},
    2022:{'A*':72,A:60,B:49,C:38,D:28,E:18},
    2023:{'A*':73,A:61,B:50,C:39,D:29,E:19},
    2024:{'A*':74,A:62,B:51,C:40,D:29,E:19},
  },
  'Paper 2: Pure Mathematics 2':{
    2018:{'A*':75,A:62,B:50,C:38,D:27,E:16},
    2019:{'A*':76,A:63,B:52,C:41,D:31,E:21},
    2022:{'A*':71,A:58,B:47,C:36,D:26,E:17},
    2023:{'A*':72,A:59,B:48,C:37,D:27,E:17},
    2024:{'A*':72,A:60,B:49,C:38,D:27,E:17},
  },
  'Paper 3: Statistics & Mechanics':{
    2018:{'A*':73,A:59,B:48,C:37,D:27,E:17},
    2019:{'A*':73,A:60,B:49,C:38,D:28,E:18},
    2022:{'A*':68,A:55,B:44,C:33,D:23,E:14},
    2023:{'A*':70,A:57,B:46,C:35,D:25,E:16},
    2024:{'A*':70,A:57,B:46,C:35,D:25,E:16},
  },
  'Core Pure Mathematics 1':{
    2019:{'A*':91,A:75,B:60,C:45,D:31,E:16},
    2022:{'A*':81,A:68,B:55,C:41,D:28,E:16},
    2023:{'A*':83,A:68,B:53,C:39,D:25,E:13},
    2024:{'A*':81,A:67,B:53,C:39,D:25,E:13},
  },
  'Core Pure Mathematics 2':{
    2019:{'A*':88,A:73,B:59,C:44,D:29,E:16},
    2022:{'A*':80,A:67,B:53,C:40,D:27,E:15},
    2023:{'A*':81,A:67,B:52,C:39,D:25,E:13},
    2024:{'A*':80,A:67,B:53,C:39,D:25,E:13},
  },
  'Option: Further Mechanics 1':{
    2019:{'A*':85,A:71,B:57,C:43,D:29,E:16},
    2022:{'A*':79,A:65,B:52,C:39,D:27,E:15},
    2023:{'A*':80,A:67,B:53,C:40,D:27,E:15},
    2024:{'A*':79,A:65,B:52,C:39,D:27,E:15},
  },
  'Option: Further Statistics 1':{
    2019:{'A*':84,A:70,B:56,C:42,D:28,E:15},
    2022:{'A*':79,A:65,B:52,C:39,D:27,E:15},
    2023:{'A*':80,A:67,B:53,C:40,D:27,E:15},
    2024:{'A*':79,A:65,B:52,C:39,D:27,E:15},
  },
  'Option: Decision Mathematics 1':{
    2019:{'A*':83,A:69,B:55,C:41,D:28,E:15},
    2022:{'A*':77,A:64,B:51,C:38,D:26,E:14},
    2023:{'A*':79,A:65,B:52,C:39,D:27,E:15},
    2024:{'A*':77,A:64,B:51,C:38,D:26,E:14},
  },
  'Paper 1: Computer Systems':{
    2019:{'A*':73,A:61,B:51,C:41,D:31,E:22},
    2022:{'A*':70,A:58,B:48,C:38,D:28,E:18},
    2023:{'A*':70,A:58,B:48,C:38,D:28,E:18},
    2024:{'A*':71,A:59,B:49,C:39,D:29,E:19},
  },
  'Paper 2: Algorithms & Programming':{
    2019:{'A*':74,A:62,B:52,C:42,D:32,E:22},
    2022:{'A*':71,A:59,B:49,C:39,D:29,E:19},
    2023:{'A*':72,A:60,B:50,C:40,D:30,E:20},
    2024:{'A*':72,A:60,B:50,C:40,D:30,E:20},
  },
  'Paper 1: Inorganic & Physical Chemistry':{
    2018:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2022:{'A*':73,A:62,B:52,C:41,D:30,E:20},
    2023:{'A*':74,A:63,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:63,B:53,C:42,D:31,E:21},
  },
  'Paper 2: Organic & Physical Chemistry':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:22},
    2019:{'A*':76,A:65,B:55,C:44,D:33,E:22},
    2022:{'A*':72,A:61,B:51,C:40,D:29,E:19},
    2023:{'A*':73,A:62,B:52,C:41,D:30,E:20},
    2024:{'A*':73,A:62,B:52,C:41,D:30,E:20},
  },
  'Paper 3: Practical Skills':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:22},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':74,A:63,B:53,C:42,D:31,E:21},
    2023:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:20},
  },
  'Component 1: Modelling Physics':{
    2018:{'A*':74,A:63,B:53,C:43,D:33,E:23},
    2019:{'A*':74,A:63,B:53,C:43,D:33,E:23},
    2022:{'A*':71,A:60,B:50,C:40,D:30,E:20},
    2023:{'A*':72,A:61,B:51,C:41,D:31,E:21},
    2024:{'A*':72,A:61,B:51,C:41,D:31,E:21},
  },
  'Component 2: Exploring Physics':{
    2018:{'A*':73,A:62,B:52,C:42,D:32,E:22},
    2019:{'A*':73,A:62,B:52,C:42,D:32,E:22},
    2022:{'A*':70,A:59,B:49,C:39,D:29,E:19},
    2023:{'A*':71,A:60,B:50,C:40,D:30,E:20},
    2024:{'A*':71,A:60,B:50,C:40,D:30,E:20},
  },
  'Component 3: Unified Physics':{
    2018:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2019:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2022:{'A*':71,A:60,B:49,C:38,D:27,E:17},
    2023:{'A*':72,A:61,B:50,C:39,D:28,E:18},
    2024:{'A*':72,A:61,B:50,C:39,D:28,E:18},
  },
  'Paper 1: Markets & Market Failure':{
    2018:{'A*':77,A:66,B:56,C:46,D:36,E:26},
    2019:{'A*':76,A:65,B:55,C:45,D:35,E:25},
    2022:{'A*':74,A:63,B:53,C:43,D:33,E:23},
    2023:{'A*':75,A:64,B:54,C:44,D:34,E:24},
    2024:{'A*':75,A:64,B:54,C:44,D:34,E:24},
  },
  'Paper 2: National & International Economy':{
    2018:{'A*':76,A:65,B:55,C:45,D:35,E:25},
    2019:{'A*':76,A:65,B:55,C:45,D:35,E:25},
    2022:{'A*':73,A:62,B:52,C:42,D:32,E:22},
    2023:{'A*':74,A:63,B:53,C:43,D:33,E:23},
    2024:{'A*':74,A:63,B:53,C:43,D:33,E:23},
  },
  'Paper 3: Economic Principles & Issues':{
    2018:{'A*':77,A:66,B:56,C:46,D:36,E:26},
    2019:{'A*':77,A:66,B:56,C:46,D:36,E:26},
    2022:{'A*':74,A:63,B:53,C:43,D:33,E:23},
    2023:{'A*':75,A:64,B:54,C:44,D:34,E:24},
    2024:{'A*':75,A:64,B:54,C:44,D:34,E:24},
  },
  'Paper 1: Biological Processes':{
    2018:{'A*':79,A:68,B:57,C:46,D:36,E:26},
    2019:{'A*':78,A:67,B:56,C:46,D:35,E:25},
    2022:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2023:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2024:{'A*':76,A:65,B:54,C:43,D:32,E:22},
  },
  'Paper 2: Biological Diversity':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 3: Essay & Data Analysis':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 1: Social Influence, Memory, Attachment & Psychopathology':{
    2018:{'A*':79,A:68,B:57,C:46,D:36,E:26},
    2019:{'A*':78,A:67,B:56,C:46,D:35,E:25},
    2022:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2023:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2024:{'A*':77,A:66,B:55,C:44,D:33,E:23},
  },
  'Paper 2: Biopsychology, Approaches & Research Methods':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2024:{'A*':76,A:65,B:54,C:43,D:32,E:22},
  },
  'Paper 3: Issues, Debates & Options':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':73,A:62,B:51,C:40,D:29,E:19},
    2023:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2024:{'A*':74,A:63,B:52,C:41,D:30,E:20},
  },
  'Paper 1: Education with Theory & Methods':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2023:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2024:{'A*':76,A:65,B:54,C:43,D:32,E:22},
  },
  'Paper 2: Topics in Sociology':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 3: Crime & Deviance with Theory & Methods':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':73,A:62,B:51,C:40,D:29,E:19},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 1: Breadth Study':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2023:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2024:{'A*':76,A:65,B:54,C:43,D:32,E:22},
  },
  'Paper 2: Depth Study':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 1: Physical Geography':{
    2018:{'A*':78,A:67,B:56,C:45,D:34,E:24},
    2019:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2022:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2023:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2024:{'A*':76,A:65,B:54,C:43,D:32,E:22},
  },
  'Paper 2: Human Geography':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':73,A:62,B:51,C:40,D:29,E:19},
    2023:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2024:{'A*':74,A:63,B:52,C:41,D:30,E:20},
  },
  'Paper 1: Love Through the Ages':{
    2018:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2022:{'A*':73,A:62,B:52,C:41,D:30,E:20},
    2023:{'A*':74,A:63,B:53,C:42,D:31,E:21},
    2024:{'A*':74,A:63,B:53,C:42,D:31,E:21},
  },
  'Paper 2: Texts in Shared Contexts':{
    2018:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:55,C:44,D:33,E:23},
    2022:{'A*':73,A:62,B:52,C:41,D:30,E:20},
    2023:{'A*':74,A:63,B:53,C:42,D:31,E:21},
    2024:{'A*':74,A:63,B:53,C:42,D:31,E:21},
  },
  'Paper 1: Business 1':{
    2018:{'A*':77,A:66,B:55,C:44,D:33,E:23},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2023:{'A*':75,A:64,B:53,C:42,D:31,E:21},
    2024:{'A*':75,A:64,B:53,C:42,D:31,E:21},
  },
  'Paper 2: Business 2':{
    2018:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':73,A:62,B:51,C:40,D:29,E:19},
    2023:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2024:{'A*':74,A:63,B:52,C:41,D:30,E:20},
  },
  'Paper 3: Business 3 (Case Study)':{
    2018:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2019:{'A*':76,A:65,B:54,C:43,D:32,E:22},
    2022:{'A*':73,A:62,B:51,C:40,D:29,E:19},
    2023:{'A*':74,A:63,B:52,C:41,D:30,E:20},
    2024:{'A*':74,A:63,B:52,C:41,D:30,E:20},
  },
};

// ── Notional grade boundaries (%) per subject — used when no year-specific data ─
const NOTIONAL_GRADE_PCT = {
  maths:          {'A*':72,A:60,B:49,C:38,D:27,E:17},
  'further-maths':{'A*':81,A:68,B:54,C:40,D:27,E:14},
  cs:             {'A*':71,A:59,B:49,C:39,D:29,E:19},
  chemistry:      {'A*':74,A:63,B:52,C:41,D:30,E:20},
  physics:        {'A*':71,A:60,B:50,C:40,D:30,E:20},
  economics:      {'A*':75,A:64,B:53,C:43,D:33,E:23},
  biology:        {'A*':76,A:65,B:53,C:42,D:31,E:21},
  psychology:     {'A*':77,A:66,B:54,C:43,D:32,E:22},
  sociology:      {'A*':75,A:64,B:53,C:42,D:31,E:21},
  history:        {'A*':76,A:65,B:54,C:43,D:32,E:22},
  geography:      {'A*':75,A:64,B:53,C:42,D:31,E:21},
  'english-lit':  {'A*':74,A:63,B:52,C:41,D:30,E:20},
  business:       {'A*':74,A:63,B:52,C:41,D:30,E:20},
};

const ERROR_TYPES = [
  { id:'calc',     label:'Calculation error',     color:'#f59e0b' },
  { id:'method',   label:'Wrong method',           color:'#ef4444' },
  { id:'read',     label:'Misread question',       color:'#f97316' },
  { id:'forgot',   label:'Forgot content',         color:'#8b5cf6' },
  { id:'time',     label:'Ran out of time',        color:'#3b82f6' },
  { id:'notation', label:'Notation/presentation',  color:'#14b8a6' },
];

const TIMER_WORK_OPTS  = [25, 50, 90];
const TIMER_BREAK_OPTS = [5, 10, 15];

const FLASHCARD_DECKS = {
  maths: [
    {q:'What is the quadratic formula?', a:'x = (-b ± √(b²-4ac)) / 2a\nFor ax² + bx + c = 0'},
    {q:'State the chain rule.', a:'dy/dx = dy/du × du/dx\nIf y = f(g(x)), then y\' = f\'(g(x)) · g\'(x)'},
    {q:'What is integration by parts?', a:'∫u dv = uv - ∫v du\nChoose u = LIATE order (Logs, Inverse trig, Algebraic, Trig, Exponential)'},
    {q:'State the binomial expansion for (1+x)ⁿ, |x|<1.', a:'(1+x)ⁿ = 1 + nx + n(n-1)/2! x² + n(n-1)(n-2)/3! x³ + …\nValid for any n when |x| < 1'},
    {q:'What is the formula for arc length?', a:'s = rθ  (θ in radians)\nArc length = radius × angle'},
    {q:'Differentiate sin(x), cos(x), tan(x).', a:'d/dx sin(x) = cos(x)\nd/dx cos(x) = -sin(x)\nd/dx tan(x) = sec²(x)'},
    {q:'What is the trapezium rule?', a:'∫ₐᵇ f(x) dx ≈ h/2 [y₀ + 2(y₁+…+yₙ₋₁) + yₙ]\nwhere h = (b-a)/n'},
    {q:'State the factor theorem.', a:'If f(a) = 0 then (x-a) is a factor of f(x).'},
    {q:'What is the normal distribution notation?', a:'X ~ N(μ, σ²)\nμ = mean, σ² = variance\nStandardise: Z = (X-μ)/σ ~ N(0,1)'},
    {q:'How do you find the nth term of an arithmetic sequence?', a:'aₙ = a + (n-1)d\nSum Sₙ = n/2 (2a + (n-1)d) = n/2 (a + l)'},
  ],
  'further-maths': [
    {q:'What is a complex number in modulus-argument form?', a:'z = r(cosθ + i sinθ) = re^(iθ)\nr = |z| = √(a²+b²), θ = arg(z) = arctan(b/a)'},
    {q:'State de Moivre\'s theorem.', a:'(cosθ + i sinθ)ⁿ = cos(nθ) + i sin(nθ)\nEquivalently: (re^(iθ))ⁿ = rⁿe^(inθ)'},
    {q:'What is the scalar (dot) product?', a:'a·b = |a||b|cosθ = a₁b₁ + a₂b₂ + a₃b₃\nPerpendicular ⟺ a·b = 0'},
    {q:'State the reduction formula approach for ∫sinⁿx dx.', a:'Iₙ = -(1/n)sinⁿ⁻¹x cosx + (n-1)/n Iₙ₋₂\nUse integration by parts repeatedly'},
    {q:'What is the Maclaurin series for eˣ?', a:'eˣ = 1 + x + x²/2! + x³/3! + … (all x)\nSimilarly: sin x = x - x³/3! + x⁵/5! - …\ncos x = 1 - x²/2! + x⁴/4! - …'},
    {q:'Define a matrix eigenvalue.', a:'Av = λv\nλ is an eigenvalue if det(A - λI) = 0\nSolve characteristic equation to find λ'},
    {q:'What is Hooke\'s Law in mechanics?', a:'T = kx  (elastic string)\nT = λx/l  (using modulus of elasticity)\nEPE = λx²/2l'},
    {q:'State the formula for polar area.', a:'A = ½∫θ₁θ₂ r² dθ\nFor polar curve r = f(θ)'},
    {q:'What is the Argand diagram?', a:'Complex plane: x-axis = Re(z), y-axis = Im(z)\nz = a + bi plotted at point (a, b)'},
    {q:'State Newton\'s second law for rotation.', a:'τ = Iα  (torque = moment of inertia × angular acceleration)\nAnalogue of F = ma for rotation'},
  ],
  cs: [
    {q:'What is Big O notation O(n log n)?', a:'Describes algorithm time complexity.\nO(n log n) = linearithmic — typical of efficient sorts (merge sort, quicksort avg case).\nBetter than O(n²) for large n.'},
    {q:'What is a stack vs a queue?', a:'Stack: LIFO — push/pop from same end.\nQueue: FIFO — enqueue rear, dequeue front.\nStack uses: recursion, undo. Queue uses: scheduling, BFS.'},
    {q:'Explain the difference between TCP and UDP.', a:'TCP: connection-oriented, reliable, ordered delivery, slower.\nUDP: connectionless, no guarantee, faster.\nUse TCP for web/email, UDP for streaming/gaming.'},
    {q:'What is a binary search tree (BST)?', a:'Each node: left child < node < right child.\nSearch/insert O(log n) average, O(n) worst.\nIn-order traversal gives sorted output.'},
    {q:'Define an abstract data type (ADT).', a:'A data type defined by its behaviour (operations) not implementation.\nExamples: Stack, Queue, List, Tree, Graph.\nHides implementation details — encapsulation.'},
    {q:'What is a hash table collision?', a:'When two keys map to the same index.\nResolution: chaining (linked list at slot) or open addressing (probe for next free slot).\nGood hash function minimises collisions.'},
    {q:'Explain the fetch-decode-execute cycle.', a:'Fetch: MAR ← PC, MDR ← memory[MAR], PC++, CIR ← MDR\nDecode: control unit interprets CIR\nExecute: ALU performs operation, result stored in registers/memory'},
    {q:'What is the difference between lossy and lossless compression?', a:'Lossless: exact original recoverable (ZIP, PNG, FLAC).\nLossy: data discarded, smaller files, not reversible (JPEG, MP3).\nLossy exploits human perception limits.'},
    {q:'Define recursion and state the base case requirement.', a:'A function that calls itself.\nMust have: (1) base case — stops recursion, (2) recursive case — reduces problem size.\nWithout base case: infinite recursion → stack overflow.'},
    {q:'What are the four principles of OOP?', a:'Encapsulation: bundle data + methods, hide internals.\nInheritance: subclass inherits from superclass.\nPolymorphism: same interface, different implementations.\nAbstraction: hide complexity, show essentials.'},
  ],
  chemistry: [
    {q:'State Le Chatelier\'s principle.', a:'When a system at equilibrium is disturbed, it shifts to oppose the change and restore equilibrium.\nExamples: increase pressure → shift to fewer moles of gas; increase temp → shift endothermic direction.'},
    {q:'What is the Henderson-Hasselbalch equation?', a:'pH = pKa + log([A⁻]/[HA])\nUsed for buffer calculations.\nAt half-equivalence point: pH = pKa'},
    {q:'Define enthalpy of formation.', a:'ΔHf°: enthalpy change when 1 mole of compound is formed from its elements in their standard states at 298K, 1 atm.\nElements in standard state: ΔHf° = 0'},
    {q:'What is Hess\'s law?', a:'The total enthalpy change is independent of the route taken.\nΔH(reaction) = Σ ΔHf°(products) - Σ ΔHf°(reactants)'},
    {q:'State the rate equation and what it means.', a:'rate = k[A]^m[B]^n\nm = order w.r.t. A, n = order w.r.t. B, overall order = m+n\nk = rate constant (temp-dependent)'},
    {q:'What is nucleophilic addition? Give an example.', a:'Nu attacks electrophilic carbonyl carbon (C=O).\nExample: HCN + CH₃CHO → CH₃CH(OH)CN (hydroxynitrile)\nNu: CN⁻ attacks C, then H⁺ from HCN attaches to O⁻'},
    {q:'Define oxidation and reduction in terms of electrons.', a:'Oxidation: loss of electrons (OIL)\nReduction: gain of electrons (RIG)\nOIL RIG — "Oxidation Is Loss, Reduction Is Gain"'},
    {q:'What is the Born-Haber cycle?', a:'Thermodynamic cycle to calculate lattice enthalpy.\nSteps: atomisation + ionisation energies + electron affinities + lattice enthalpy = ΔHf°\nLattice enthalpy: energy released forming ionic lattice from gaseous ions'},
    {q:'What is Kp and how does it relate to Kc?', a:'Kp = equilibrium constant in terms of partial pressures.\nKp = Kc(RT)^Δn where Δn = moles gas products - moles gas reactants\nKp = Kc when Δn = 0'},
    {q:'Describe the mechanism of electrophilic addition to alkenes.', a:'1. π bond attacks electrophile (e.g. Br₂) → forms carbocation intermediate\n2. Nucleophile (Br⁻) attacks carbocation\nMarkovnikov\'s rule: H adds to less substituted C'},
  ],
  physics: [
    {q:'State Newton\'s three laws of motion.', a:'1st: Body stays at rest/constant velocity unless net force acts.\n2nd: F = ma (net force = mass × acceleration).\n3rd: Equal and opposite reaction forces.'},
    {q:'What is the equation for electric potential energy?', a:'E = kq₁q₂/r = Q₁Q₂/(4πε₀r)\nPotential V = kQ/r\nCoulomb\'s law: F = kq₁q₂/r²'},
    {q:'State Faraday\'s laws of electromagnetic induction.', a:'1st: EMF induced when flux linkage changes.\n2nd: |EMF| = dΦN/dt = N dΦ/dt\nLenz\'s law: induced current opposes change causing it.'},
    {q:'What is the de Broglie wavelength?', a:'λ = h/p = h/mv\nh = Planck\'s constant = 6.63×10⁻³⁴ J s\nWave-particle duality: all matter has associated wavelength'},
    {q:'Define simple harmonic motion (SHM).', a:'a = -ω²x  (acceleration proportional to displacement, opposite direction)\nx = A cos(ωt), v = -Aω sin(ωt)\nT = 2π/ω, ω = 2πf'},
    {q:'What is the photoelectric effect equation?', a:'hf = φ + ½mv²max\nhf = photon energy, φ = work function, ½mv²max = max KE of electron\nThreshold frequency: f₀ = φ/h'},
    {q:'State the ideal gas law.', a:'pV = nRT\np = pressure (Pa), V = volume (m³), n = moles, R = 8.31 J mol⁻¹ K⁻¹, T = temp (K)\nAlso: pV = NkT where k = 1.38×10⁻²³ J/K'},
    {q:'What is radioactive decay? State the decay equation.', a:'N = N₀e^(-λt)\nλ = decay constant, t½ = ln2/λ\nActivity A = λN = A₀e^(-λt)'},
    {q:'Define capacitance and give the energy stored formula.', a:'C = Q/V (farads)\nE = ½CV² = ½QV = Q²/2C\nSeries: 1/C = 1/C₁ + 1/C₂; Parallel: C = C₁ + C₂'},
    {q:'What is gravitational potential?', a:'V = -GM/r  (negative — work done to escape)\nGravitational PE = mV = -GMm/r\ng = -dV/dr = GM/r²'},
  ],
  economics: [
    {q:'What is price elasticity of demand (PED)?', a:'PED = % change in Qd / % change in P\n|PED| > 1: elastic, |PED| < 1: inelastic, |PED| = 1: unit elastic\nInelastic goods: necessities, no substitutes, addictive'},
    {q:'Explain the multiplier effect.', a:'An injection into the economy leads to a larger increase in national income.\nMultiplier = 1/(1-MPC) = 1/MPS+MPT+MPM\nHigher MPC → larger multiplier → more stimulus effect'},
    {q:'What is a deadweight loss?', a:'Loss of economic efficiency from market distortion (tax, monopoly).\nArea of triangle between supply and demand curves outside equilibrium.\nRepresents transactions that don\'t happen but would benefit both parties.'},
    {q:'Define comparative advantage.', a:'Country has comparative advantage if it can produce a good at lower opportunity cost.\nBasis for international trade — both countries gain even if one is absolutely better at both.\nRicardo\'s theory of specialisation'},
    {q:'What is the Lorenz curve and Gini coefficient?', a:'Lorenz curve: plots cumulative income share vs cumulative population %.\nLine of equality = 45° diagonal.\nGini = Area A / (A + B); 0 = perfect equality, 1 = perfect inequality'},
    {q:'Explain demand-pull vs cost-push inflation.', a:'Demand-pull: AD increases → prices rise (economy overheating).\nCost-push: supply costs rise (e.g. oil price) → AS shifts left → stagflation.\nInflation target UK: 2% CPI'},
    {q:'What is the J-curve effect?', a:'After depreciation, current account worsens before improving.\nShort run: prices adjust before quantities (contracts, inelastic demand).\nLong run: volumes respond → trade balance improves'},
    {q:'Define market failure and list types.', a:'When free market misallocates resources.\nTypes: externalities, public goods, information asymmetry, monopoly power, factor immobility.\nResults in over/under-provision'},
    {q:'What is quantitative easing (QE)?', a:'Central bank creates money to buy government bonds/assets.\nIncreases money supply → lower long-term interest rates → stimulate borrowing/spending.\nUsed when base rate near zero (liquidity trap)'},
    {q:'Explain the accelerator theory of investment.', a:'Investment depends on change in national income (not level).\nI = v × ΔY, where v = capital-output ratio\nSlowing growth → falling investment even if economy still growing'},
  ],
  biology: [
    {q:'Describe the process of DNA replication.', a:'Semi-conservative: each strand acts as template.\n1. Helicase unwinds double helix\n2. DNA polymerase adds complementary nucleotides (5\'→3\')\n3. Ligase joins Okazaki fragments on lagging strand'},
    {q:'What is the Bohr effect?', a:'Increased CO₂/lower pH shifts oxyhaemoglobin dissociation curve right.\nHaemoglobin releases O₂ more readily to active tissues.\nBohr shift: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻'},
    {q:'Define trophic levels and energy transfer efficiency.', a:'Producers (level 1) → Primary consumers → Secondary → Tertiary\nTypically 10% energy transferred between levels (90% lost as heat/excretion)\nThis limits food chain length to ~4-5 levels'},
    {q:'What is the Hardy-Weinberg principle?', a:'p² + 2pq + q² = 1, and p + q = 1\np = dominant allele freq, q = recessive allele freq\nAssumptions: large pop, random mating, no selection/mutation/migration'},
    {q:'Explain the role of ATP synthase in oxidative phosphorylation.', a:'H⁺ ions flow through ATP synthase (chemiosmosis) down concentration gradient.\nProton gradient created by electron transport chain.\nATP synthase uses flow to phosphorylate ADP + Pi → ATP\n~34 ATP per glucose from this stage'},
    {q:'What is transcription and translation?', a:'Transcription: DNA → mRNA in nucleus (RNA polymerase).\nTranslation: mRNA → protein at ribosome (tRNA brings amino acids).\nCodon = 3 bases on mRNA; anticodon on tRNA'},
    {q:'Define allopatric and sympatric speciation.', a:'Allopatric: geographic isolation → different selection → reproductive isolation → new species.\nSympatric: in same area, e.g. polyploidy in plants, niche differentiation.\nReproductive isolation is key for speciation'},
    {q:'What is the Calvin cycle?', a:'Light-independent stage of photosynthesis (stroma).\nCO₂ fixed by RuBisCO onto RuBP (5C) → 2 × GP (3C)\nGP reduced using ATP + NADPH → G3P → glucose/RuBP\n3 turns = 1 net G3P'},
    {q:'Explain negative feedback in homeostasis. Example.', a:'Receptor detects change → effector produces corrective response → returns to set point.\nExample: blood glucose ↑ → β-cells secrete insulin → glucose uptake ↑ → blood glucose ↓\nGlucagon does opposite when blood glucose falls'},
    {q:'What is a monoclonal antibody and how is it made?', a:'Single antibody type from cloned B-lymphocyte (hybridoma).\nMade by: immunise mouse → extract B-cells → fuse with myeloma → hybridoma → clone.\nUses: pregnancy tests, cancer therapy (Herceptin), ELISA'},
  ],
  psychology: [
    {q:'What are the three types of conformity? (Kelman)', a:'Compliance: change behaviour not beliefs (public only).\nIdentification: adopt attitudes of group temporarily.\nInternalisation: genuine change in beliefs and behaviour (deepest level).\nRelated to informational vs normative social influence'},
    {q:'Describe Milgram\'s obedience study (1963).', a:'650V shock machine, "learner" in next room (confederate).\n65% gave maximum 450V shock.\nSituational factors: agentic state, proximity, authority figure in uniform.\nShows situational not dispositional causes of obedience'},
    {q:'What is Ainsworth\'s Strange Situation?', a:'8 episodes testing infant attachment in standardised lab.\nTypes: Secure (70%): uses caregiver as safe base.\nInsecure-avoidant (20%): little distress, avoids caregiver.\nInsecure-resistant (10%): high distress, angry at return.'},
    {q:'Explain the Working Memory Model (Baddeley & Hitch).', a:'Central Executive (CE): supervisor, limited capacity, controls other components.\nPhonological Loop: inner ear (phonological store) + inner voice (articulatory process).\nVisuo-spatial Sketchpad: visual/spatial info.\nEpisodic Buffer (added 2000): links to LTM.'},
    {q:'What is the cognitive approach to psychopathology?', a:'Disorders caused by irrational/negative thinking patterns.\nEllis: ABC model — Activating event → Beliefs → Consequences.\nBeck: negative cognitive triad (self, world, future) → depression.\nTreatment: CBT'},
    {q:'Describe the biological approach to schizophrenia.', a:'Dopamine hypothesis: excess dopamine activity in mesolimbic pathway.\nEvidence: antipsychotics (dopamine antagonists) reduce positive symptoms.\nGenetics: concordance rate 48% MZ twins → not purely genetic.\nAlso: enlarged ventricles, prefrontal underactivity'},
    {q:'What is the SLT (Bandura)? Key study?', a:'Social Learning Theory: learn through observation, imitation, vicarious reinforcement.\nMediational processes: Attention → Retention → Reproduction → Motivation.\nBandura (1961) Bobo doll: children imitated aggressive model, esp. same-sex.'},
    {q:'Explain gender schema theory (Martin & Halverson).', a:'Children develop gender schemas (mental frameworks) about gender-appropriate behaviour.\nBy age 3: know own gender.\nIn-group schema (own gender): detailed. Out-group: limited.\nSchemas distort memory to fit gender expectations'},
    {q:'What is the psychodynamic explanation of OCD?', a:'Freud: OCD is defence against anxiety from unconscious conflicts.\nFixation at anal stage → obsessional character.\nDefence mechanisms: isolation (emotions detached), reaction formation, undoing.\nLimited empirical support'},
    {q:'Define reliability and validity in research.', a:'Reliability: consistency of results (test-retest, inter-rater).\nInternal validity: study measures what it claims (controlled variables).\nExternal validity: generalisability (ecological, population).\nReliability ≠ validity'},
  ],
  sociology: [
    {q:'What is the Marxist view of education?', a:'Schools reproduce class inequality — transmit ruling class ideology (Althusser: ISA).\nHidden curriculum: punctuality, obedience, conformity — prepares workers.\nBowles & Gintis correspondence principle: school mirrors workplace hierarchy.\nCounter: doesn\'t explain working-class resistance'},
    {q:'Explain Durkheim\'s functionalist view of crime.', a:'Crime is normal and functional: universal in all societies.\nFunctions: boundary maintenance (punishments affirm shared norms), social solidarity, safety valve, warnings of problems.\nToo much crime → anomie (normlessness), too little → stagnation'},
    {q:'What is Willis\'s "Learning to Labour" (1977)?', a:'Ethnographic study of 12 working-class "lads" in Midlands school.\nLads rejected school, formed counter-school culture.\nParadox: resistance led them into manual labour → reproduced class structure.\nChallenge to cultural deprivation theory'},
    {q:'Define the concept of patriarchy.', a:'System where men hold power and dominate women in social, political, economic spheres.\nFeminist perspectives: liberal (reform through legislation), radical (patriarchy root cause), Marxist (capitalism + patriarchy), intersectionality.\nStatistics: gender pay gap, glass ceiling, domestic labour'},
    {q:'What is the New Right view of the family?', a:'Traditional nuclear family is best — 2 parents, breadwinner/homemaker.\nMurray: underclass caused by welfare dependency, absent fathers.\nCriticisms: ignores diversity, romanticises nuclear family, ignores domestic abuse.'},
    {q:'Explain Merton\'s strain theory.', a:'Anomie when cultural goals (success) blocked for some groups by legitimate means.\nAdaptations: Conformity, Innovation (crime), Ritualism, Retreatism, Rebellion.\nExplains working-class crime but not white-collar crime or corporate crime.'},
    {q:'What is Foucault\'s concept of surveillance?', a:'Power operates through surveillance — Panopticon (Bentham): prisoners behave if they think watched.\nModern institutions (schools, hospitals, prisons) use similar disciplinary power.\nSurveillance society: CCTV, data collection — self-regulation through gaze'},
    {q:'Describe the functionalist theory of stratification (Davis & Moore).', a:'Social inequality is functional and universal.\nSome positions more important and require scarce talent — high rewards attract able people.\nCriticisms: ignores ascription (birth), doesn\'t explain inheritance of wealth, tautological.'},
    {q:'What is the secularisation thesis?', a:'Religion\'s social significance declining in modern societies (Weber, Bruce).\nEvidence: church attendance falls, civil religion rises, religion privatised.\nCounter: religious revival, fundamentalism, global religion (Berger revised).\nSocial cohesion functions remain?'},
    {q:'Explain postmodernist views on identity.', a:'Identity is fluid, multiple, chosen — not fixed by class/gender/religion.\nConsumption defines identity (Bauman: liquid modernity).\nMedia creates simulacra (Baudrillard) — signs detached from reality.\nCriticisms: ignores material constraints on choice'},
  ],
  history: [
    {q:'What were the main causes of WWI?', a:'MAIN: Militarism, Alliances (Triple Alliance vs Triple Entente), Imperialism, Nationalism.\nPrecipitating event: assassination of Archduke Franz Ferdinand (June 1914).\nShort-term: Schlieffen Plan; Long-term: arms race, colonial rivalry.'},
    {q:'Explain Stalin\'s consolidation of power 1924-1929.', a:'Exploited Lenin\'s Testament against Trotsky; allied with Zinoviev/Kamenev; later turned on them.\nGeneral Secretary: controlled party appointments — packed with loyalists.\nSocialism in one country vs Trotsky\'s permanent revolution.\n1929: Trotsky expelled from USSR.'},
    {q:'What were the causes of the 1905 Russian Revolution?', a:'Short-term: Bloody Sunday (Jan 1905) — troops fired on peaceful marchers.\nLong-term: poverty, land hunger, autocratic rule, defeat in Russo-Japanese War.\nOutcome: October Manifesto — Duma promised; revolution quelled but pressures remained.'},
    {q:'Describe the significance of the New Deal (USA 1933).', a:'FDR\'s response to Great Depression — "Relief, Recovery, Reform".\nKey acts: FERA, AAA, NRA, CCC, TVA, Social Security Act (1935).\nDebate: did it end Depression (no — WWII did) or restore confidence and reduce suffering?'},
    {q:'What were Hitler\'s foreign policy aims 1933-1939?', a:'Overturn Versailles, Lebensraum (living space east), unite German-speaking peoples, destroy communism.\nAchievements: Rhineland (1936), Anschluss (1938), Sudetenland, then rest of Czechoslovakia.\nAppeasement: Munich 1938 — Chamberlain gave Sudetenland.'},
    {q:'Explain the policy of appeasement and reasons for it.', a:'Giving concessions to aggressor to prevent war.\nReasons: public anti-war feeling, economic weakness, military unpreparedness, belief Hitler\'s demands were reasonable, fear of communism more than fascism.\nFailure: Munich 1938 didn\'t stop Hitler; invaded Poland 1939 → WWII'},
    {q:'What was the Weimar Republic\'s major crises 1919-1923?', a:'1919: Spartacist uprising (left) suppressed.\n1920: Kapp Putsch (right) failed — general strike stopped it.\n1923: French/Belgian occupation of Ruhr → hyperinflation.\n1923: Munich/Beer Hall Putsch — Hitler arrested.\nStabilised under Stresemann.'},
    {q:'Describe the causes and consequences of the Wall Street Crash (1929).', a:'Causes: overproduction, speculation on margin, weak banking system, overvalued stocks.\nConsequences: Great Depression, bank failures, 25% unemployment USA, global spread.\nPolitical: rise of extremism, collapse of Weimar, New Deal.'},
    {q:'What were the main causes of the Cold War?', a:'Ideological clash: capitalism (USA) vs communism (USSR).\nYalta/Potsdam conferences — disagreement over Germany, Eastern Europe.\nMutual suspicion: A-bomb, Soviet expansion, Truman Doctrine (1947), Marshall Plan.\nIron Curtain speech (Churchill 1946).'},
    {q:'Explain the significance of the Berlin Wall (1961-1989).', a:'Built 1961 by East Germany to stop brain drain (3.5m fled west 1945-61).\nSymbol of Cold War division — "Antifascist Protection Rampart".\nFell 9 Nov 1989 — end of Cold War symbol.\nTear down this wall — Reagan (1987).'},
  ],
  geography: [
    {q:'What is the demographic transition model (DTM)?', a:'4+ stage model of population change:\nStage 1: High BR + DR, stable.\nStage 2: DR falls (medicine/food), BR high → rapid growth.\nStage 3: BR falls (development, women\'s rights).\nStage 4: Low BR + DR, stable.\nStage 5: Sub-replacement fertility.'},
    {q:'Explain plate tectonics and types of plate boundary.', a:'Constructive (divergent): plates move apart, magma rises, mid-ocean ridges/rift valleys.\nDestructive (convergent): subduction or collision, volcanoes/fold mountains/trenches.\nConservative (transform): plates slide past, earthquakes, no magma (San Andreas).'},
    {q:'What is the hydrological cycle?', a:'Closed system — no water added/removed from Earth.\nInputs: precipitation. Stores: interception, soil, groundwater, surface water.\nProcesses: evapotranspiration, infiltration, percolation, surface runoff, throughflow.\nOutputs: evaporation, transpiration, river discharge'},
    {q:'Define urbanisation and its causes.', a:'Increasing proportion of population living in urban areas.\nCauses: rural push (poverty, land shortage) + urban pull (jobs, services, education).\nMegacities (10m+): growing rapidly in Global South.\nUrbanisation level: developed 80%+, developing ~50%'},
    {q:'What is the Rostow model of development?', a:'Linear 5-stage model: Traditional → Preconditions → Take-off → Drive to maturity → Mass consumption.\nCriticisms: Eurocentric, ignores colonialism, dependency theory (Frank) — development of underdevelopment.\nModernisation theory assumes Western path universal'},
    {q:'Explain the causes and effects of tropical deforestation.', a:'Causes: commercial farming (soya, cattle), logging, mining, roads, subsistence farming.\nEffects: biodiversity loss, carbon release, soil erosion, disrupted water cycle, indigenous displacement.\nAmazon: "tipping point" at 20-25% deforestation → savannification'},
    {q:'What is the coastal sediment cell system?', a:'Closed system of sediment transfer along coastline.\nProcesses: erosion (hydraulic action, abrasion, attrition) → transport (longshore drift) → deposition.\nInterventions: groynes trap sediment (updrift accumulation, downdrift starvation).'},
    {q:'Define globalisation and its critics.', a:'Increasing interconnectedness of economies, cultures, people across world.\nDrivers: TNCs, trade liberalisation, internet, container shipping.\nCritics: widens inequality, cultural homogenisation, race to bottom (labour/environment), Western imperialism.'},
    {q:'What are the causes of flooding?', a:'Physical: intense rainfall, impermeable geology, snowmelt, deforestation, steep slopes.\nHuman: urbanisation (impermeable surfaces), floodplain development, channel modification.\nManagement: hard (dams, embankments) vs soft (floodplain zoning, afforestation)'},
    {q:'Explain the concept of sustainable development.', a:'"Development that meets the needs of the present without compromising ability of future generations to meet their own needs" (Brundtland 1987).\nThree pillars: economic, social, environmental.\nSDGs: 17 goals by 2030 (UN).'},
  ],
  'english-lit': [
    {q:'What are the key themes in "The Great Gatsby" (Fitzgerald)?', a:'The American Dream and its corruption/failure.\nClass and social mobility (old money vs new money vs no money).\nIllusion vs reality (Gatsby\'s constructed identity).\nTime and the past ("Can\'t repeat the past? Why of course you can!")'},
    {q:'What are the main themes of "Hamlet"?', a:'Revenge vs moral paralysis (To be or not to be).\nCorruption — "Something is rotten in the state of Denmark".\nMadness — real (Ophelia) vs performed (Hamlet?).\nParents, duty, mortality. Revenge tragedy conventions.'},
    {q:'Define dramatic irony.', a:'When the audience knows something characters don\'t.\nEffect: creates tension, sympathy, or dark comedy.\nExample: Othello believes Iago without knowing Iago is villainous.\nContrasted with: situational irony (unexpected outcomes), verbal irony (saying opposite of meaning)'},
    {q:'What is the significance of colour symbolism in "The Great Gatsby"?', a:'Green light: Gatsby\'s dream, hope, unattainable goal.\nWhite: false purity (Daisy, Jordan — corrupt beneath).\nYellow/Gold: corruption of dream, wealth\'s tawdriness.\nGrey: Valley of Ashes, waste, moral emptiness of the rich.'},
    {q:'What are the feminist themes in "The Handmaid\'s Tale" (Atwood)?', a:'Patriarchal control of women\'s bodies and fertility.\nLanguage as power — Handmaids stripped of names.\nCollaboration vs resistance.\n"Nolite te bastardes carborundorum" — Don\'t let the bastards grind you down.\nAtwood: "nothing in this book isn\'t already happening somewhere"'},
    {q:'Explain the concept of an unreliable narrator.', a:'Narrator whose account we cannot fully trust — limited perspective, bias, lies, mental state.\nExamples: Nick Carraway (self-serving), Stevens (Remains of the Day — self-deception).\nEffect: reader must read against the grain; creates irony and complexity.'},
    {q:'What is the tragic flaw (hamartia) in Greek tragedy?', a:'Protagonist\'s inherent weakness leading to downfall.\nAristotle\'s Poetics: tragedy arouses pity and fear, achieves catharsis.\nExamples: Oedipus — hubris + determination; Macbeth — ambition; Hamlet — indecision.\nNot necessarily a moral failing — may be circumstantial'},
    {q:'What are the key features of Gothic literature?', a:'Settings: decaying mansions, remote/wild landscapes, darkness.\nThemes: supernatural, death, transgression, the double, repressed desire.\nCharacters: monsters, villains, persecuted heroines, mysterious strangers.\nExamples: Frankenstein, Wuthering Heights, Rebecca.'},
    {q:'Explain the significance of the "green light" in Gatsby — extended reading.', a:'Chapter 1: Gatsby reaches towards it across the water — hope, longing.\nChapter 5: Enchanted object fades once he has Daisy — "His count of enchanted objects had diminished by one".\nFinal lines: boats against the current — human striving, nostalgia, inevitability of failure.\nRepresents the American Dream\'s contradictions.'},
    {q:'What is an allegory? Give an example.', a:'Extended narrative where characters/events represent abstract ideas.\nExample: Animal Farm — allegory of Russian Revolution (Napoleon = Stalin, Snowball = Trotsky, pigs = Soviet leadership).\nDistinct from symbolism (single image) — allegory is systematic throughout text.'},
  ],
  business: [
    {q:'What is price elasticity of demand and why does it matter for pricing?', a:'PED = % ΔQd / % ΔP\nInelastic (|PED|<1): price rise → higher revenue. Elastic (|PED|>1): price rise → lower revenue.\nTR = P × Q. Inelastic: raise prices to maximise revenue. Elastic: lower prices.'},
    {q:'Explain the Boston Matrix (BCG).', a:'2×2 matrix: Market Share (high/low) × Market Growth (high/low).\nStar: high share, high growth — needs investment.\nCash Cow: high share, low growth — generates cash.\nQuestion Mark: low share, high growth — needs decision.\nDog: low share, low growth — divest/harvest.'},
    {q:'What are Porter\'s Five Forces?', a:'1. Competitive rivalry — intensity of competition.\n2. Supplier power — dependence, switching costs.\n3. Buyer power — concentration, price sensitivity.\n4. Threat of new entrants — barriers to entry.\n5. Threat of substitutes — alternative products.\nUsed for industry attractiveness analysis.'},
    {q:'Define contribution and how it relates to break-even.', a:'Contribution per unit = Selling price - Variable cost per unit.\nTotal contribution = Revenue - Total variable costs.\nBreak-even output = Fixed costs / Contribution per unit.\nMargin of safety = Actual output - Break-even output'},
    {q:'What is Herzberg\'s two-factor theory?', a:'Hygiene factors (prevent dissatisfaction): pay, working conditions, security — don\'t motivate.\nMotivators (drive satisfaction): achievement, recognition, responsibility, advancement.\nImplication: fix hygiene first, then focus on intrinsic motivators.\nContrasted with Maslow\'s hierarchy.'},
    {q:'Explain the difference between organic and inorganic growth.', a:'Organic (internal): develop new products, expand market share gradually, self-funded.\nInorganic (external): mergers, acquisitions, joint ventures — faster but riskier.\nMerger benefits: economies of scale, market power, diversification.\nRisks: culture clash, diseconomies, debt.'},
    {q:'What is cash flow vs profit? Why can a profitable business fail?', a:'Profit = Revenue - Total costs (accruals accounting).\nCash flow = actual money in vs out at a given time.\nProfitable but cash poor: credit sales (debtors), overtrading, large capital expenditure.\nSolution: invoice factoring, overdraft, reduce credit terms.'},
    {q:'What are the main sources of finance for a business?', a:'Internal: retained profit, sale of assets, working capital management.\nExternal Debt: bank loan, overdraft, debentures, mortgage.\nExternal Equity: share issue, venture capital, crowdfunding.\nFit to purpose: long-term needs → long-term finance.'},
    {q:'Define economies of scale with examples.', a:'Fall in average cost as output increases (long run).\nInternal: purchasing (bulk discounts), technical (larger machines), managerial (specialisation), financial (lower interest).\nExternal: industry clusters, skilled labour pool, supplier networks.\nDiseconomies: communication problems, coordination failure.'},
    {q:'What is Ansoff\'s matrix?', a:'4 growth strategies based on product/market combinations.\nMarket penetration: existing product, existing market (lowest risk).\nMarket development: existing product, new market.\nProduct development: new product, existing market.\nDiversification: new product, new market (highest risk).'},
  ],
};

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
  return {
    'A*':'#22c55e', A:'#4ade80', B:'#fbbf24', C:'#fb923c', D:'#f87171', E:'#ef4444',
    '9':'#22c55e', '8':'#4ade80', '7':'#86efac', '6':'#fbbf24', '5':'#fb923c', '4':'#f87171', '3':'#ef4444', '2':'#dc2626', '1':'#b91c1c',
    U:'#71717a'
  }[g]??'#71717a';
}

function gradeScale(boundaries) {
  if (!boundaries) return ['A*','A','B','C','D','E'];
  if ('9' in boundaries) return ['9','8','7','6','5','4','3','2','1'];
  return ['A*','A','B','C','D','E'];
}

function getSubjectGrade(avg, subjectName, gradeBoundaries) {
  const b = (gradeBoundaries||{})[subjectName]||{};
  for (const g of gradeScale(b)) if (avg>=(b[g]??0)) return g;
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
  for (const g of gradeScale(b)) if (pct>=(b[g]??0)) return {grade:g,exact:false};
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
  for (const g of gradeScale(b)) if (pct>=(b[g]??0)) return {grade:g,exact:false};
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

// ── Study streak ───────────────────────────────────────────────────────────
function getStudyStreak(scores) {
  if (!scores.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const loggedDays = new Set(scores.map(s => {
    const d = new Date(s.ts||s.id); d.setHours(0,0,0,0); return d.getTime();
  }));
  // check if today or yesterday has a log (otherwise streak is broken)
  if (!loggedDays.has(today.getTime()) && !loggedDays.has(yesterday.getTime())) return 0;
  let streak = 0;
  const cursor = loggedDays.has(today.getTime()) ? new Date(today) : new Date(yesterday);
  while (loggedDays.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

// ── Predicted grade ────────────────────────────────────────────────────────
function predictedGrade(scores, subjectName, gradeBounds) {
  const ss = [...scores].filter(s=>s.subject===subjectName).sort((a,b)=>(a.ts||a.id)-(b.ts||b.id));
  if (ss.length < 2) return null;
  const n = ss.length;
  const xMean = (n-1)/2;
  const yMean = ss.reduce((a,s)=>a+s.pct,0)/n;
  let num=0, den=0;
  ss.forEach((s,i)=>{ num+=(i-xMean)*(s.pct-yMean); den+=(i-xMean)**2; });
  const slope = den===0 ? 0 : num/den;
  const intercept = yMean - slope*xMean;
  const projectedPct = Math.min(100, Math.max(0, Math.round(intercept + slope*(n+2))));
  const b = (gradeBounds||{})[subjectName]||{};
  let grade='U';
  for (const g of gradeScale(b)) if (projectedPct>=(b[g]??0)) { grade=g; break; }
  const trend = slope>1 ? 'up' : slope<-1 ? 'down' : 'stable';
  return { pct: projectedPct, grade, trend };
}

// ── Paper bank (PMT + official board past-paper pages) ────────────────────
const PAPER_BANK = {
  maths: {
    edexcel: { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/mathematics-2017.coursematerials.html' },
    aqa:     { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/mathematics/a-level/mathematics-7357/assessment-resources' },
    'ocr-a': { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/mathematics-a-h240-from-2017/assessment/' },
    'ocr-b': { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/mathematics-b-mei-h640-from-2017/assessment/' },
    wjec:    { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-wjec/past-papers/', board:'https://www.wjec.co.uk/qualifications/mathematics-a-level/#tab_pastpapers' },
    caie:    { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-cie/past-papers/', board:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/' },
  },
  'further-maths': {
    edexcel: { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-edexcel/further-maths-past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/further-mathematics-2017.coursematerials.html' },
    aqa:     { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-aqa/further-maths-past-papers/', board:'https://www.aqa.org.uk/subjects/mathematics/a-level/further-mathematics-7367/assessment-resources' },
    'ocr-a': { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-ocr/further-maths-past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/further-mathematics-a-h245-from-2017/assessment/' },
    'ocr-b': { pmt:'https://www.physicsandmathstutor.com/maths-revision/a-level-ocr/further-maths-past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/further-mathematics-b-mei-h645-from-2017/assessment/' },
  },
  biology: {
    aqa:        { pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/science/a-level/biology-7402/assessment-resources' },
    'edexcel-a':{ pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/biology-a-2015.coursematerials.html' },
    'edexcel-b':{ pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-edexcel-b/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/biology-b-2015.coursematerials.html' },
    'ocr-a':    { pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/biology-a-h420-from-2015/assessment/' },
    'ocr-b':    { pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-ocr-b/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/biology-b-advancing-biology-h422-from-2015/assessment/' },
    wjec:       { pmt:'https://www.physicsandmathstutor.com/biology-revision/a-level-wjec/past-papers/', board:'https://www.wjec.co.uk/qualifications/biology-a-level/#tab_pastpapers' },
  },
  chemistry: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/chemistry-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/science/a-level/chemistry-7405/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/chemistry-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/chemistry-2015.coursematerials.html' },
    'ocr-a': { pmt:'https://www.physicsandmathstutor.com/chemistry-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/chemistry-a-h432-from-2015/assessment/' },
    'ocr-b': { pmt:'https://www.physicsandmathstutor.com/chemistry-revision/a-level-ocr-b/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/chemistry-b-salters-h433-from-2015/assessment/' },
    wjec:    { pmt:'https://www.physicsandmathstutor.com/chemistry-revision/a-level-wjec/past-papers/', board:'https://www.wjec.co.uk/qualifications/chemistry-a-level/#tab_pastpapers' },
  },
  physics: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/physics-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/science/a-level/physics-7408/assessment-resources' },
    'ocr-a': { pmt:'https://www.physicsandmathstutor.com/physics-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/physics-a-h557-from-2015/assessment/' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/physics-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/physics-2015.coursematerials.html' },
    wjec:    { pmt:'https://www.physicsandmathstutor.com/physics-revision/a-level-wjec/past-papers/', board:'https://www.wjec.co.uk/qualifications/physics-a-level/#tab_pastpapers' },
    caie:    { pmt:'https://www.physicsandmathstutor.com/physics-revision/a-level-cie/past-papers/', board:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/past-papers/' },
  },
  cs: {
    ocr:     { pmt:'https://www.physicsandmathstutor.com/computer-science-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/computer-science-h446-from-2015/assessment/' },
    aqa:     { pmt:'https://www.physicsandmathstutor.com/computer-science-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/computer-science-and-it/a-level/computer-science-7517/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/computer-science-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/computer-science-2015.coursematerials.html' },
  },
  economics: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/economics-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/economics/a-level/economics-7136/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/economics-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/economics-a-2015.coursematerials.html' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/economics-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/economics-h460-from-2015/assessment/' },
    caie:    { pmt:'https://www.physicsandmathstutor.com/economics-revision/a-level-cie/past-papers/', board:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-economics-9708/past-papers/' },
  },
  psychology: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/psychology-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/psychology/a-level/psychology-7182/assessment-resources' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/psychology-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/psychology-h567-from-2015/assessment/' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/psychology-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/psychology-2015.coursematerials.html' },
  },
  history: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/history-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/history/a-level/history-7042/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/history-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/history-2015.coursematerials.html' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/history-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/history-y100-from-2015/assessment/' },
  },
  geography: {
    aqa:        { pmt:'https://www.physicsandmathstutor.com/geography-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/geography/a-level/geography-7037/assessment-resources' },
    'edexcel-a':{ pmt:'https://www.physicsandmathstutor.com/geography-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/geography-2016.coursematerials.html' },
    'ocr-a':    { pmt:'https://www.physicsandmathstutor.com/geography-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/geography-h481-from-2016/assessment/' },
  },
  'english-lit': {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/english-revision/a-level-aqa-english-literature/past-papers/', board:'https://www.aqa.org.uk/subjects/english/a-level/english-literature-a-7712/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/english-revision/a-level-edexcel-english-literature/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/english-literature-2015.coursematerials.html' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/english-revision/a-level-ocr-english-literature/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/english-literature-h472-from-2015/assessment/' },
  },
  business: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/business-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/business/a-level/business-7132/assessment-resources' },
    edexcel: { pmt:'https://www.physicsandmathstutor.com/business-revision/a-level-edexcel/past-papers/', board:'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/business-2015.coursematerials.html' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/business-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/business-h431-from-2015/assessment/' },
  },
  sociology: {
    aqa:     { pmt:'https://www.physicsandmathstutor.com/sociology-revision/a-level-aqa/past-papers/', board:'https://www.aqa.org.uk/subjects/sociology/a-level/sociology-7192/assessment-resources' },
    ocr:     { pmt:'https://www.physicsandmathstutor.com/sociology-revision/a-level-ocr/past-papers/', board:'https://www.ocr.org.uk/qualifications/as-and-a-level/sociology-h580-from-2015/assessment/' },
  },
};

// ── Schedule generator ─────────────────────────────────────────────────────
function generateSchedule(subjects, scores, errors, examSched, rag={}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const ranked = [...subjects].map(s => {
    const exs = getSubjectExams(examSched, s.id, s.boardId);
    const minDays = exs.length ? Math.min(...exs.map(e=>daysUntil(e.date))) : 999;
    const urgency = 1/(Math.max(0,minDays)+1)*50;
    const ss = scores.filter(x=>x.subject===s.name);
    const avg = ss.length ? ss.reduce((a,x)=>a+x.pct,0)/ss.length : 50;
    const weakness = (100-avg)*0.5;
    const topics = SPEC_TOPICS[s.id]||[];
    const redTopics = topics.filter((_,i)=>rag[`${s.id}_${i}`]==='red');
    const ragBoost = redTopics.length * 4;
    return { name:s.name, color:s.color, priority: urgency+weakness+ragBoost, redTopics };
  }).sort((a,b)=>b.priority-a.priority);

  const days = [];
  let slotIdx = 0;
  for (let i=0; i<14; i++) {
    const d = new Date(today); d.setDate(today.getDate()+i);
    const dateStr = d.toISOString().slice(0,10);
    const examsToday = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId).filter(e=>e.date===dateStr).map(e=>({...e,subjectName:s.name,color:s.color})));
    if (examsToday.length) {
      days.push({date:d, isExamDay:true, exams:examsToday, slots:[]});
    } else {
      const slots = [];
      for (let j=0; j<2; j++) {
        slots.push(ranked[slotIdx%ranked.length]);
        slotIdx++;
      }
      days.push({date:d, isExamDay:false, exams:[], slots});
    }
  }
  return days;
}

function getNotifications(scores, errors, subjects, examSched=EXAM_SCHEDULE) {
  const now=new Date(); now.setHours(0,0,0,0);
  const notes=[];
  const allExams=subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId).map(e=>({...e,subject:s.name,color:s.color})));
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

// ── Animation styles ───────────────────────────────────────────────────────
const ANIM_CSS=`
@keyframes rbp-aura-ring{0%{transform:translate(-50%,-50%) scale(0.5);opacity:.9}100%{transform:translate(-50%,-50%) scale(2.8);opacity:0}}
@keyframes rbp-check-in{0%{transform:scale(0) rotate(-30deg);opacity:0}55%{transform:scale(1.25) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes rbp-grade-pop{0%{transform:scale(0.2);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes rbp-improve-fly{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-36px);opacity:0}}
@keyframes rbp-ach-bg{0%{opacity:0}100%{opacity:1}}
@keyframes rbp-ach-card{0%{transform:scale(.35) translateY(50px);opacity:0}55%{transform:scale(1.06) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes rbp-ach-star{0%{transform:rotate(0deg) scale(0);opacity:0}35%{transform:rotate(200deg) scale(1.4);opacity:1}100%{transform:rotate(360deg) scale(1);opacity:1}}
@keyframes rbp-particle{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0)}}
@keyframes rbp-shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes rbp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes rbp-slide-up{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes rbp-fade-in{0%{opacity:0}100%{opacity:1}}
@keyframes rbp-slide-right{0%{transform:translateX(-14px);opacity:0}100%{transform:translateX(0);opacity:1}}
@keyframes rbp-bounce-in{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes rbp-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
`;
function ensureAnimStyles(){if(!document.getElementById('rbp-anims')){const s=document.createElement('style');s.id='rbp-anims';s.textContent=ANIM_CSS;document.head.appendChild(s);}}

// ── Paper key utilities ────────────────────────────────────────────────────
function parsePaperKey(key){
  const m=key.match(/^(.+?)\s[—–-]+\s?(\d{4})$/);
  if(m) return {name:m[1].trim(),year:parseInt(m[2])};
  return {name:key,year:null};
}
function getHistoricalGrade(pct,paperKey){
  const {name,year}=parsePaperKey(paperKey);
  const b=HISTORICAL_GRADE_PCT[name]?.[year];
  if(!b) return null;
  for(const g of ['A*','A','B','C','D','E']) if(pct>=(b[g]??0)) return g;
  return 'U';
}
function getNotionalGrade(pct,subjectId){
  const b=NOTIONAL_GRADE_PCT[subjectId];
  if(!b) return null;
  for(const g of ['A*','A','B','C','D','E']) if(pct>=(b[g]??0)) return g;
  return 'U';
}
function getNotionalThreshold(grade,subjectId){
  return NOTIONAL_GRADE_PCT[subjectId]?.[grade]??null;
}
function getHistoricalThreshold(grade,paperKey){
  const {name,year}=parsePaperKey(paperKey);
  return HISTORICAL_GRADE_PCT[name]?.[year]?.[grade]??null;
}

// ── Achievements ───────────────────────────────────────────────────────────
const ACHIEVEMENTS=[
  {id:'first_paper',  title:'First Paper',     desc:'Log your first past paper',              Icon:FileText,     tier:'bronze'  },
  {id:'three_papers', title:'Getting Going',   desc:'Log 3 past papers',                      Icon:BookOpen,     tier:'bronze'  },
  {id:'ten_papers',   title:'Grinder',         desc:'Log 10 papers',                          Icon:TrendingUp,   tier:'silver'  },
  {id:'twenty_five',  title:'Marathon Runner', desc:'Log 25 papers',                          Icon:Zap,          tier:'gold'    },
  {id:'first_a_star', title:'A* Club',         desc:'Score an A* on any paper',               Icon:Star,         tier:'gold'    },
  {id:'five_a_stars', title:'Star Collector',  desc:'Score A* on 5 papers',                   Icon:Trophy,       tier:'platinum'},
  {id:'improvement',  title:'Level Up',        desc:'Improve your grade on a retried paper',  Icon:ArrowUpRight, tier:'bronze'  },
  {id:'all_subjects', title:'Versatile',       desc:'Log a paper in every subject',           Icon:Target,       tier:'silver'  },
  {id:'battle_ready', title:'Battle Ready',    desc:'Reach 80+ Battle Readiness',             Icon:Shield,       tier:'gold'    },
  {id:'perfect',      title:'Perfect Score',   desc:'Score 100% on a paper',                  Icon:CheckCircle,  tier:'platinum'},
  {id:'week_streak',  title:'Week Warrior',    desc:'Log papers on 7 different days',         Icon:Calendar,     tier:'silver'  },
  {id:'error_hunter', title:'Error Hunter',    desc:'Log 10 errors in the error tracker',     Icon:Search,       tier:'bronze'  },
];
const TIER_COLOR={bronze:'#cd7f32',silver:'#9ca3af',gold:'#fbbf24',platinum:'#a78bfa'};

function computeUnlockedAchievements(scores,errors,subjects){
  const gb=Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
  const grades=scores.map(s=>getSubjectGrade(s.pct,s.subject,gb));
  const byPaper={};
  let hasImprovement=false;
  for(const s of [...scores].reverse()){
    if(byPaper[s.paper]===undefined) byPaper[s.paper]=s.pct;
    else if(s.pct>byPaper[s.paper]) hasImprovement=true;
  }
  const days=new Set(scores.map(s=>new Date(s.ts||s.id).toDateString())).size;
  const br=calcBattleReadiness(scores,errors);
  return ACHIEVEMENTS.filter(a=>{
    switch(a.id){
      case 'first_paper':  return scores.length>=1;
      case 'three_papers': return scores.length>=3;
      case 'ten_papers':   return scores.length>=10;
      case 'twenty_five':  return scores.length>=25;
      case 'first_a_star': return grades.includes('A*');
      case 'five_a_stars': return grades.filter(g=>g==='A*').length>=5;
      case 'improvement':  return hasImprovement;
      case 'all_subjects': return subjects.every(sub=>scores.some(s=>s.subject===sub.name));
      case 'battle_ready': return br.total>=80;
      case 'perfect':      return scores.some(s=>s.pct>=100);
      case 'week_streak':  return days>=7;
      case 'error_hunter': return errors.length>=10;
      default: return false;
    }
  }).map(a=>a.id);
}

// ── Achievement toast (full-screen burst) ─────────────────────────────────
function AchievementToast({achievement,onDismiss}){
  ensureAnimStyles();
  const isPlatOrStar=achievement.tier==='platinum'||achievement.id==='first_a_star';
  const tc=TIER_COLOR[achievement.tier]||'#fbbf24';
  useEffect(()=>{const t=setTimeout(onDismiss,4500);return()=>clearTimeout(t);},[]);
  const particles=Array.from({length:24},(_,i)=>{
    const a=(i/24)*Math.PI*2,d=90+Math.random()*140;
    return{tx:`${Math.cos(a)*d}px`,ty:`${Math.sin(a)*d-60}px`,
      color:['#fbbf24','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ef4444','#ec4899'][i%7],
      sz:5+Math.random()*9,del:Math.random()*0.5};
  });
  return(
    <div onClick={onDismiss} style={{position:'fixed',inset:0,zIndex:1000,
      background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',
      justifyContent:'center',cursor:'pointer',
      animation:'rbp-ach-bg 0.25s ease forwards'}}>
      {particles.map((p,i)=>(
        <div key={i} style={{position:'absolute',width:p.sz,height:p.sz,borderRadius:'50%',
          background:p.color,top:'50%',left:'50%',
          '--tx':p.tx,'--ty':p.ty,
          animation:`rbp-particle 1.4s ${p.del}s ease-out forwards`}}/>
      ))}
      <div style={{background:isPlatOrStar?'linear-gradient(135deg,#110f00,#1e1900,#110f00)':'#141720',
        border:`2px solid ${tc}`,borderRadius:22,
        padding:'40px 48px',textAlign:'center',maxWidth:340,margin:'0 20px',
        boxShadow:isPlatOrStar?`0 0 80px ${tc}55,0 0 160px ${tc}22`:`0 0 40px ${tc}44`,
        animation:'rbp-ach-card 0.55s cubic-bezier(.34,1.56,.64,1) forwards'}}>
        <div style={{fontSize:isPlatOrStar?64:52,marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center',
          animation:isPlatOrStar?'rbp-ach-star 0.9s cubic-bezier(.34,1.56,.64,1) forwards':'rbp-float 2s ease-in-out infinite'}}>
          {achievement.Icon && <achievement.Icon size={isPlatOrStar?54:42} color={tc} strokeWidth={1.5}/>}
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',
          color:tc,marginBottom:10}}>Achievement Unlocked</div>
        <div style={{fontSize:isPlatOrStar?26:22,fontWeight:800,color:tc,marginBottom:8,
          textShadow:isPlatOrStar?`0 0 30px ${tc}88`:undefined,
          background:isPlatOrStar?`linear-gradient(90deg,${tc},#fff,${tc})`:undefined,
          backgroundSize:'200%',
          WebkitBackgroundClip:isPlatOrStar?'text':undefined,
          WebkitTextFillColor:isPlatOrStar?'transparent':undefined,
          animation:isPlatOrStar?'rbp-shimmer 2s linear infinite':undefined}}>
          {achievement.title}
        </div>
        <div style={{fontSize:14,color:'#857f79',lineHeight:1.5,marginBottom:16}}>{achievement.desc}</div>
        <div style={{fontSize:10,color:'#4e4a47',letterSpacing:0.3,textTransform:'uppercase',
          fontWeight:600,padding:'4px 10px',borderRadius:20,border:`1px solid ${tc}44`,
          display:'inline-block'}}>{achievement.tier}</div>
        <div style={{marginTop:14,fontSize:11,color:'#3a3a3a'}}>Tap to continue</div>
      </div>
    </div>
  );
}

// ── Toast bar ──────────────────────────────────────────────────────────────
function ToastBar({toasts,dismiss,isMobile}) {
  ensureAnimStyles();
  if (!toasts.length) return null;
  return (
    <div style={{position:'fixed',bottom:20,left:70,zIndex:300,
      display:'flex',flexDirection:'column-reverse',gap:8,pointerEvents:'none'}}>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>dismiss(t.id)}
          style={{pointerEvents:'auto',maxWidth:300,borderRadius:10,padding:'10px 14px',
            display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',
            background:t.type==='error'?'#ef4444':t.type==='success'?'#22c55e':t.type==='warn'?'#f97316':'#18170f',
            border:`1px solid rgba(255,255,255,0.12)`,
            boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
            animation:'rbp-slide-up 0.22s ease'}}>
          <span style={{fontSize:12,color:'#fff',lineHeight:1.5,flex:1}}>{t.msg}</span>
          <span style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1,marginTop:1}}>✕</span>
        </div>
      ))}
    </div>
  );
}

// ── Onboarding walkthrough ─────────────────────────────────────────────────
const TOUR_STEPS = [
  {Icon:FileText,  title:'Log your past papers',desc:"Hit the + button to record any past paper. Your scores, grades, and trends are tracked automatically."},
  {Icon:Target,    title:'RAG topic tracker',desc:"Go to Resources → mark every spec topic as Red (needs work), Amber, or Green (confident). Your weakest areas surface automatically."},
  {Icon:BarChart3, title:'Battle Readiness',desc:"Analytics combines your scores, paper count, and topic coverage into a single readiness score. Aim for 80+ before exam day."},
  {Icon:Timer,     title:'Study Timer',desc:"Pomodoro and free stopwatch — both track time per subject and sync across your devices so your streaks are always accurate."},
  {Icon:CalendarDays, title:'Exam countdown',desc:"Exams shows every paper with days remaining. Tap Send Schedule to email your full timetable to yourself."},
];

function Onboarding({onDone,setView,C,font}) {
  ensureAnimStyles();
  const [step,setStep] = useState(0);
  const s = TOUR_STEPS[step];
  const isLast = step===TOUR_STEPS.length-1;
  const navMap = {1:'resources',2:'analytics',3:'timer',4:'exams'};
  const next = () => {
    if (isLast){onDone();return;}
    if (navMap[step+1]) setView(navMap[step+1]);
    setStep(step+1);
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:250,pointerEvents:'none',
      animation:'rbp-fade-in 0.3s ease'}}>
      <div style={{position:'absolute',bottom:66,left:0,right:0,padding:'0 16px',
        display:'flex',justifyContent:'center',pointerEvents:'auto'}}>
        <div style={{width:'100%',maxWidth:480,background:C.surface,
          border:`1px solid ${C.accent}44`,borderRadius:16,padding:'20px',
          boxShadow:`0 8px 48px rgba(0,0,0,0.28),0 0 0 1px ${C.accent}18`}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
            <div style={{flexShrink:0,color:C.accent,opacity:0.85}}>{s.Icon&&<s.Icon size={24} strokeWidth={1.8}/>}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:C.accent,letterSpacing:0.8,
                textTransform:'uppercase',marginBottom:3}}>
                Step {step+1} of {TOUR_STEPS.length}
              </div>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>{s.title}</div>
            </div>
            <button onClick={onDone}
              style={{background:'transparent',border:'none',color:C.muted,
                cursor:'pointer',fontSize:18,lineHeight:1,padding:'2px 4px',flexShrink:0}}>✕</button>
          </div>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.65,margin:'0 0 16px'}}>{s.desc}</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:4}}>
              {TOUR_STEPS.map((_,i)=>(
                <div key={i} style={{width:i===step?18:6,height:6,borderRadius:3,
                  background:i===step?C.accent:C.border,transition:'all 0.2s'}}/>
              ))}
            </div>
            <button onClick={next}
              style={{padding:'8px 22px',background:C.accent,border:'none',borderRadius:8,
                color:'#fff',fontSize:13,fontWeight:700,fontFamily:font,cursor:'pointer'}}>
              {isLast?'Get started':'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Companion character ─────────────────────────────────────────────────────
const SKIN_TONES   = ['#FDDBB4','#F0C185','#C68642','#8D5524','#4A2912'];
const HAIR_COLORS  = ['#1a0a00','#3d1f0c','#7a4520','#c28a3a','#e8c86a','#c8c0b8','#cc2828','#4a2ee0'];
const EYE_COLORS   = ['#4a2c17','#8b6914','#1a6b2a','#1a5090','#5a5f64'];
const OUTFIT_COLORS = ['#4a90d9','#e87c3e','#5cb85c','#9b59b6','#e74c3c','#2c3e50'];

const HAIR_STYLE_LABELS = ['Buzz','Bob','Long','Bun','Curly','Ponytail'];
const ACCESSORY_LABELS  = ['None','Glasses','Cat-eye','Headband'];

function CompanionAvatar({skin=0,hair=0,hairStyle=0,eyeColor=0,outfitColor=0,accessory=0,mood='neutral',pose='idle',size=80}) {
  const ST   = SKIN_TONES[skin]           ?? SKIN_TONES[0];
  const HC   = HAIR_COLORS[hair]          ?? HAIR_COLORS[0];
  const EC   = EYE_COLORS[eyeColor]       ?? EYE_COLORS[0];
  const OC   = OUTFIT_COLORS[outfitColor] ?? OUTFIT_COLORS[0];
  const PANT = '#2c3a4e';
  const SHOE = '#1a1a2e';

  const h = Math.round(size * 1.5);

  const browL = mood==='worried' ? 'M22 29 Q33 25 44 30' : mood==='excited' ? 'M22 26 Q33 23 44 26' : 'M22 28 Q33 24 44 28';
  const browR = mood==='worried' ? 'M56 30 Q67 25 78 29' : mood==='excited' ? 'M56 26 Q67 23 78 26' : 'M56 28 Q67 24 78 28';

  return (
    <svg width={size} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">

      {/* SHOES */}
      <ellipse cx="34" cy="146" rx="14" ry="6"   fill={SHOE}/>
      <ellipse cx="66" cy="146" rx="14" ry="6"   fill={SHOE}/>
      <ellipse cx="37" cy="145" rx="9"  ry="3.5" fill="white" opacity="0.12"/>
      <ellipse cx="69" cy="145" rx="9"  ry="3.5" fill="white" opacity="0.12"/>

      {/* LEGS */}
      <rect x="27" y="112" width="16" height="36" rx="8" fill={PANT}/>
      <rect x="57" y="112" width="16" height="36" rx="8" fill={PANT}/>

      {/* TORSO */}
      <path d="M18 76 Q18 72 50 68 Q82 72 82 76 L84 114 Q68 122 50 122 Q32 122 16 114 Z" fill={OC}/>

      {/* LEFT ARM */}
      <path d="M18 78 Q8 88 10 114" stroke={OC} strokeWidth="15" strokeLinecap="round" fill="none"/>
      <circle cx="10" cy="117" r="8" fill={ST}/>

      {/* RIGHT ARM */}
      {pose==='wave'?(
        <>
          <path d="M82 78 Q92 62 90 36" stroke={OC} strokeWidth="15" strokeLinecap="round" fill="none"/>
          <path d="M90 36 Q92 22 88 14" stroke={ST} strokeWidth="12" strokeLinecap="round" fill="none"/>
          <circle cx="87" cy="11" r="9" fill={ST}/>
          <line x1="80" y1="5"  x2="81" y2="2"  stroke={ST} strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="87" y1="2"  x2="87" y2="-1" stroke={ST} strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="94" y1="5"  x2="95" y2="2"  stroke={ST} strokeWidth="3.5" strokeLinecap="round"/>
        </>
      ):(
        <>
          <path d="M82 78 Q92 88 90 114" stroke={OC} strokeWidth="15" strokeLinecap="round" fill="none"/>
          <circle cx="90" cy="117" r="8" fill={ST}/>
        </>
      )}

      {/* NECK */}
      <rect x="44" y="68" width="12" height="12" rx="5" fill={ST}/>

      {/* EARS — behind head */}
      <ellipse cx="23" cy="44" rx="6.5" ry="7.5" fill={ST}/>
      <ellipse cx="77" cy="44" rx="6.5" ry="7.5" fill={ST}/>
      <ellipse cx="23" cy="44" rx="3.5" ry="4.5" fill="#e8a880" opacity="0.4"/>
      <ellipse cx="77" cy="44" rx="3.5" ry="4.5" fill="#e8a880" opacity="0.4"/>

      {/* HEAD — large chibi/Bitmoji circle */}
      <ellipse cx="50" cy="42" rx="28" ry="32" fill={ST}/>

      {/* HAIR */}
      {hairStyle===0&&(
        <path d="M22 42 Q22 10 50 8 Q78 10 78 42 Q76 12 50 11 Q24 12 22 42Z" fill={HC}/>
      )}
      {hairStyle===1&&(<>
        <path d="M22 42 Q22 10 50 8 Q78 10 78 42 Q76 12 50 11 Q24 12 22 42Z" fill={HC}/>
        <rect x="15" y="48" width="10" height="30" rx="5" fill={HC}/>
        <rect x="75" y="48" width="10" height="30" rx="5" fill={HC}/>
      </>)}
      {hairStyle===2&&(<>
        <path d="M22 42 Q22 10 50 8 Q78 10 78 42 Q76 12 50 11 Q24 12 22 42Z" fill={HC}/>
        <path d="M16 48 L10 130 Q14 134 18 130 L22 48Z" fill={HC}/>
        <path d="M84 48 L90 130 Q86 134 82 130 L78 48Z" fill={HC}/>
      </>)}
      {hairStyle===3&&(<>
        <path d="M24 44 Q24 12 50 10 Q76 12 76 44 Q74 13 50 12 Q26 13 24 44Z" fill={HC}/>
        <circle cx="50" cy="3"  r="12" fill={HC}/>
        <ellipse cx="50" cy="9" rx="9" ry="3.5" fill={HC}/>
      </>)}
      {hairStyle===4&&(<>
        <ellipse cx="50" cy="18" rx="32" ry="22" fill={HC}/>
        <circle cx="22" cy="34" r="13" fill={HC}/>
        <circle cx="78" cy="34" r="13" fill={HC}/>
        <circle cx="34" cy="8"  r="10" fill={HC}/>
        <circle cx="50" cy="4"  r="10" fill={HC}/>
        <circle cx="66" cy="8"  r="10" fill={HC}/>
      </>)}
      {hairStyle===5&&(<>
        <path d="M24 44 Q24 12 50 10 Q76 12 76 44 Q74 13 50 12 Q26 13 24 44Z" fill={HC}/>
        <path d="M71 12 Q88 22 84 68 Q80 82 76 78 Q82 60 78 38 Q74 20 71 12Z" fill={HC}/>
      </>)}

      {/* EYES — Bitmoji style: large whites, filled crescent upper lash, wing tip */}
      {/* Left eye */}
      <ellipse cx="33" cy="42" rx="11" ry="11.5" fill="white"/>
      <path d="M23.5 46.5 Q33 53.5 42.5 46.5" stroke="#2a1a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45"/>
      <circle cx="33" cy="43" r="7.5"  fill={EC}/>
      <circle cx="33" cy="43" r="4.8"  fill="#0a0a0a"/>
      <circle cx="35.5" cy="40.5" r="2.4" fill="white"/>
      <circle cx="30.5" cy="45.5" r="1"   fill="white" opacity="0.4"/>
      <circle cx="22.5" cy="44"   r="2"   fill="#ffb3c0" opacity="0.55"/>
      <path d="M22 43 Q33 29 44 43 Q33 35.5 22 43Z" fill="#1a0a00"/>
      <path d="M44 43 Q47 38 46 33 Q46 38.5 45 43Z" fill="#1a0a00"/>

      {/* Right eye */}
      <ellipse cx="67" cy="42" rx="11" ry="11.5" fill="white"/>
      <path d="M57.5 46.5 Q67 53.5 76.5 46.5" stroke="#2a1a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45"/>
      <circle cx="67" cy="43" r="7.5"  fill={EC}/>
      <circle cx="67" cy="43" r="4.8"  fill="#0a0a0a"/>
      <circle cx="69.5" cy="40.5" r="2.4" fill="white"/>
      <circle cx="64.5" cy="45.5" r="1"   fill="white" opacity="0.4"/>
      <circle cx="77.5" cy="44"   r="2"   fill="#ffb3c0" opacity="0.55"/>
      <path d="M56 43 Q67 29 78 43 Q67 35.5 56 43Z" fill="#1a0a00"/>
      <path d="M78 43 Q81 38 80 33 Q80 38.5 79 43Z" fill="#1a0a00"/>

      {/* EYEBROWS */}
      <path d={browL} stroke={HC} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d={browR} stroke={HC} strokeWidth="3.5" fill="none" strokeLinecap="round"/>

      {/* NOSE */}
      <path d="M46 55 Q50 58 54 55" stroke={ST} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>

      {/* CHEEK BLUSH */}
      <ellipse cx="17" cy="54" rx="8.5" ry="5" fill="#f9a8d4" opacity="0.22"/>
      <ellipse cx="83" cy="54" rx="8.5" ry="5" fill="#f9a8d4" opacity="0.22"/>

      {/* MOUTH */}
      {mood==='excited'&&(<>
        <path d="M30 62 Q50 82 70 62 Q58 78 50 79 Q42 78 30 62Z" fill="#c93060"/>
        <path d="M30 62 Q50 80 70 62" fill="white" opacity="0.8"/>
        <line x1="50" y1="62" x2="50" y2="78" stroke="#f0c0cc" strokeWidth="1"/>
      </>)}
      {mood==='happy'&&(<>
        <path d="M34 62 Q50 74 66 62 Q56 72 50 73 Q44 72 34 62Z" fill="#c93060"/>
        <path d="M34 62 Q50 72 66 62" fill="white" opacity="0.8"/>
      </>)}
      {mood==='worried'&&(
        <path d="M36 68 Q50 62 64 68" stroke="#996060" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      )}
      {mood==='neutral'&&(
        <path d="M36 65 Q50 72 64 65 Q54 70 50 70.5 Q46 70 36 65Z" fill="#c04060" opacity="0.85"/>
      )}

      {/* ACCESSORIES */}
      {accessory===1&&(<>
        <circle cx="33" cy="43" r="13.5" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        <circle cx="67" cy="43" r="13.5" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="46.5" y1="43" x2="53.5" y2="43" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="8"    y1="41" x2="19.5" y2="43" stroke="#1a1a1a" strokeWidth="1.8"/>
        <line x1="92"   y1="41" x2="80.5" y2="43" stroke="#1a1a1a" strokeWidth="1.8"/>
      </>)}
      {accessory===2&&(<>
        <path d="M19 37 Q33 31 47 39 Q47 52 33 55 Q19 52 19 37Z" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        <path d="M53 37 Q67 31 81 39 Q81 52 67 55 Q53 52 53 37Z" fill="none" stroke="#1a1a1a" strokeWidth="2.2"/>
        <line x1="47" y1="39" x2="53" y2="39" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="7"  y1="35" x2="19" y2="37" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="93" y1="35" x2="81" y2="37" stroke="#1a1a1a" strokeWidth="2"/>
      </>)}
      {accessory===3&&(
        <path d="M22 26 Q50 16 78 26" fill="none" stroke="#e03870" strokeWidth="7" strokeLinecap="round"/>
      )}
    </svg>
  );
}

function getCompanionMood({sessions,scores,examSched,subjects}) {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const recent2d = sessions.filter(s=>s.ts>=(todayStart.getTime()-86400000));
  const lastScore = scores.length?scores[scores.length-1]:null;
  const nextExamDays = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId))
    .map(e=>Math.ceil((new Date(e.date)-Date.now())/86400000))
    .filter(d=>d>=0).sort((a,b)=>a-b)[0]??999;
  if (nextExamDays<=3&&recent2d.length>=1) return 'excited';
  if (nextExamDays<=5&&recent2d.length===0) return 'worried';
  if (lastScore&&lastScore.pct>=80) return 'excited';
  if (lastScore&&lastScore.pct>=65) return 'happy';
  if (recent2d.length>=1) return 'happy';
  return 'neutral';
}

function getCompanionMessage({mood,sessions,scores,subjects,examSched,name}) {
  const hour = new Date().getHours();
  const tod = hour<12?'Morning':hour<17?'Afternoon':'Evening';
  const nextExam = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId))
    .map(e=>({...e,d:Math.ceil((new Date(e.date)-Date.now())/86400000)}))
    .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d)[0];
  if (mood==='excited'&&nextExam&&nextExam.d<=3) {
    const when = nextExam.d===0?'today':nextExam.d===1?'tomorrow':`in ${nextExam.d} days`;
    return `${nextExam.paper?.split(':')[0]||'Your exam'} is ${when}. You've put in the work — go show it.`;
  }
  if (mood==='worried') return `Haven't seen you study recently. Even 30 focused minutes today makes a real difference.`;
  if (mood==='excited'&&scores.length) {
    const l=scores[scores.length-1];
    return `${l.grade||Math.round(l.pct)+'%'} on ${l.paper||l.subject} — that's what the work looks like. Keep it up.`;
  }
  if (mood==='happy') return `${tod}. Solid progress. Stay consistent and the grades will follow.`;
  if (!scores.length) return `${tod}! Log your first past paper to get your readiness score. I'll track everything for you.`;
  return `${tod}. Even one paper a week builds real momentum over time. Let's get to work.`;
}

function CompanionCustomiser({companion,draft,setDraft,setCompanion,onSave,onCancel,C,font}) {
  const Swatch = ({colors,field,size=22})=>(
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      {colors.map((c,i)=>(
        <button key={i} onClick={()=>setCompanion(p=>({...p,[field]:i}))}
          style={{width:size,height:size,borderRadius:'50%',background:c,cursor:'pointer',padding:0,
            border:`2.5px solid ${companion[field]===i?C.accent:'transparent'}`,
            boxShadow:companion[field]===i?`0 0 0 1.5px ${C.accent}55`:'none',
            transition:'border 0.1s,box-shadow 0.1s',flexShrink:0}}/>
      ))}
    </div>
  );
  const ChipRow = ({items,field})=>(
    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
      {items.map((lbl,i)=>(
        <button key={i} onClick={()=>setCompanion(p=>({...p,[field]:i}))}
          style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontFamily:font,cursor:'pointer',
            background:companion[field]===i?C.accentSoft:'transparent',
            border:`1px solid ${companion[field]===i?C.accent:C.border}`,
            color:companion[field]===i?C.accent:C.muted,
            fontWeight:companion[field]===i?600:400,transition:'all 0.1s'}}>
          {lbl}
        </button>
      ))}
    </div>
  );
  const Row = ({label,children})=>(
    <div style={{display:'flex',alignItems:'center',gap:12,minHeight:32}}>
      <div style={{fontSize:11,fontWeight:600,color:C.subtle,width:52,flexShrink:0,textAlign:'right'}}>{label}</div>
      {children}
    </div>
  );
  return (
    <div style={{position:'fixed',inset:0,zIndex:320,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',
      backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div style={{background:C.surface,borderRadius:20,width:'100%',maxWidth:520,
        boxShadow:'0 24px 80px rgba(0,0,0,0.45)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'20px 22px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Customise your character</div>
          <button onClick={onCancel}
            style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',
              fontSize:20,lineHeight:1,padding:'2px 4px',borderRadius:6}}>✕</button>
        </div>

        <div style={{display:'flex',gap:0,overflow:'auto',flex:1}}>

          {/* Avatar preview */}
          <div style={{padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',
            gap:12,borderRight:`1px solid ${C.border}`,flexShrink:0,width:140}}>
            <CompanionAvatar
              skin={companion.skin} hair={companion.hair} hairStyle={companion.hairStyle}
              eyeColor={companion.eyeColor??0} outfitColor={companion.outfitColor??0}
              accessory={companion.accessory??0} mood="happy" size={100}/>
            <input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={16}
              placeholder="Name" autoFocus onKeyDown={e=>e.key==='Enter'&&onSave()}
              style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,
                padding:'7px 10px',color:C.text,fontSize:13,fontFamily:font,outline:'none',
                width:'100%',boxSizing:'border-box',textAlign:'center',fontWeight:600}}/>
          </div>

          {/* Options */}
          <div style={{padding:'20px 20px',display:'flex',flexDirection:'column',gap:14,flex:1,overflow:'auto'}}>
            <Row label="Skin"><Swatch colors={SKIN_TONES} field="skin"/></Row>
            <Row label="Eyes"><Swatch colors={EYE_COLORS} field="eyeColor"/></Row>
            <Row label="Hair">
              <Swatch colors={HAIR_COLORS} field="hair" size={20}/>
            </Row>
            <Row label="Style"><ChipRow items={HAIR_STYLE_LABELS} field="hairStyle"/></Row>
            <Row label="Outfit"><Swatch colors={OUTFIT_COLORS} field="outfitColor"/></Row>
            <Row label="Extras"><ChipRow items={ACCESSORY_LABELS} field="accessory"/></Row>

            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button onClick={onSave}
                style={{flex:1,padding:'10px',background:C.accent,border:'none',borderRadius:10,
                  color:'#fff',fontSize:13,fontWeight:700,fontFamily:font,cursor:'pointer'}}>
                Save
              </button>
              <button onClick={onCancel}
                style={{padding:'10px 16px',background:'transparent',border:`1px solid ${C.border}`,
                  borderRadius:10,color:C.muted,fontSize:13,fontFamily:font,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanionCard({sessions,scores,subjects,examSched,C,font,isPro=false,onUpgrade}) {
  ensureAnimStyles();
  const [companion,setCompanion] = useState(()=>{
    const saved = ls.get('rbp_companion',{name:'Alex',skin:0,hair:0,hairStyle:0});
    return {eyeColor:0,outfitColor:0,accessory:0,...saved};
  });
  const [editing,setEditing]     = useState(false);
  const [draft,setDraft]         = useState(companion.name);
  const [chatOpen,setChatOpen]   = useState(false);
  const mood    = getCompanionMood({sessions,scores,examSched,subjects});
  const message = getCompanionMessage({mood,sessions,scores,subjects,examSched,name:companion.name});
  const moodColor = {happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent}[mood]||C.accent;
  const moodLabel = {happy:'Happy',excited:'Pumped',worried:'Worried',neutral:'Ready'}[mood]||'Ready';

  const openEdit = () => { setDraft(companion.name); setEditing(true); };
  const save = () => {
    const c={...companion,name:draft.trim()||'Alex'};
    setCompanion(c); ls.set('rbp_companion',c); setEditing(false);
  };
  const cancel = () => {
    // revert any live-preview changes back to saved
    const saved=ls.get('rbp_companion',{name:'Alex',skin:0,hair:0,hairStyle:0,eyeColor:0,outfitColor:0,accessory:0});
    setCompanion({eyeColor:0,outfitColor:0,accessory:0,...saved});
    setEditing(false);
  };

  return (
    <>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,
        padding:'14px 16px',marginBottom:12,display:'flex',gap:14,alignItems:'flex-start'}}>
        <div style={{position:'relative',flexShrink:0}}>
          <CompanionAvatar
            skin={companion.skin} hair={companion.hair} hairStyle={companion.hairStyle}
            eyeColor={companion.eyeColor??0} outfitColor={companion.outfitColor??0}
            accessory={companion.accessory??0} mood={mood} size={80}/>
          <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',
            background:moodColor,borderRadius:20,padding:'1px 8px',fontSize:9,fontWeight:700,
            color:'#fff',border:`2px solid ${C.surface}`,whiteSpace:'nowrap'}}>
            {moodLabel}
          </div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>{companion.name}</span>
            <span style={{fontSize:11,color:C.subtle,marginLeft:6}}>· your study companion</span>
            <button onClick={openEdit}
              style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,
                cursor:'pointer',fontSize:11,marginLeft:'auto',
                padding:'3px 9px',borderRadius:6,fontFamily:font}}>
              Customise
            </button>
          </div>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.6,margin:'0 0 10px'}}>{message}</p>
          {isPro?(
            <button onClick={()=>setChatOpen(true)}
              style={{padding:'6px 14px',background:C.accentSoft,
                border:`1px solid ${C.accent}44`,borderRadius:7,
                color:C.accent,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
              Chat with {companion.name}
            </button>
          ):(
            <button onClick={onUpgrade}
              style={{padding:'6px 14px',background:'transparent',
                border:`1px solid ${C.border}`,borderRadius:7,
                color:C.muted,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer',
                display:'flex',alignItems:'center',gap:5}}>
              <Lock size={10} strokeWidth={2.5}/> Chat · Pro feature
            </button>
          )}
        </div>
      </div>
      {editing&&(
        <CompanionCustomiser
          companion={companion} draft={draft} setDraft={setDraft}
          setCompanion={setCompanion} onSave={save} onCancel={cancel}
          C={C} font={font}/>
      )}
      {chatOpen&&(
        <CompanionChat companion={companion} subjects={subjects} scores={scores}
          sessions={sessions} examSched={examSched} C={C} font={font}
          onClose={()=>setChatOpen(false)}/>
      )}
    </>
  );
}

// ── Companion chat ─────────────────────────────────────────────────────────
function getCharacterReply(input, {subjects, scores, sessions, examSched}) {
  const t = input.toLowerCase().trim();
  if (!t) return null;
  if (t.match(/stress|anxious|nervous|overwhelm|panic/))
    return "That feeling is completely normal — it means you care. Take one breath. The preparation you've done doesn't disappear when nerves show up. Focus on the next 25 minutes, nothing else.";
  if (t.match(/can'?t focus|distract|procrastinat/))
    return "Classic. Open the timer, pick one subject, 25 minutes — no phone. Don't open a new tab. The hard part is starting. After 25 minutes you'll probably want to keep going.";
  if (t.match(/fail|did badly|terrible|awful|bomb|mess/))
    return "One bad paper is just data. What specifically went wrong — timing, a topic gap, nerves? Log it as an error, spend 20 minutes on that one thing today. That's how you convert a bad paper into real exam prep.";
  if (t.match(/a\*|aced|nailed|crushed|great paper|did well|went well/))
    return "That's the work paying off. Log it if you haven't — every A* shifts your readiness score. Don't ease off though. Consistent pressure through to exam day is what locks it in.";
  if (t.match(/tired|exhaust|burnout|can'?t sleep|no sleep/))
    return "Rest is part of the process. Tired studying tanks your retention — you'd get more from 5 hours' sleep than 2 hours of grinding half-asleep. Come back sharp tomorrow.";
  if (t.match(/motivat|inspire|struggling|hard|difficult|giving up/))
    return "Here's the truth: everyone sitting your exams is also finding it hard. The ones who get the top grades aren't smarter — they just kept going when it got difficult. You're still here. That's the whole job.";
  if (t.match(/exam|when|how long|days left|next paper/)) {
    const next = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId))
      .map(e=>({...e,d:Math.ceil((new Date(e.date)-Date.now())/86400000)}))
      .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d)[0];
    if (next) {
      const when = next.d===0?'today — rest, key notes only.'
        :next.d===1?'tomorrow. No new topics today, just consolidation.'
        :`in ${next.d} days — ${Math.floor(next.d/7)} week${next.d>=14?'s':''} of prep. Make them count.`;
      return `${next.paper.split(':')[0]} is ${when}`;
    }
    return "I can't see any upcoming exams — go to the Exams tab and make sure your schedule is set up correctly.";
  }
  if (t.match(/help|advice|tip|what should|where do i start/))
    return "The whole game: past paper under timed conditions → mark it properly → log your errors → drill those topics → repeat. Everything else is secondary. How many papers have you done this week?";
  if (t.match(/thank|cheers|appreciate|you'?re great/))
    return "Any time. Now go log a paper — I'll be watching your readiness score climb.";
  if (t.match(/^(hello|hi|hey|sup|yo|alright)\b/))
    return `Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}. What's on your mind? Ask me anything — exam tips, what to focus on, or just vent if you need to.`;
  if (t.match(/topic|subject|weak|bad at/))
    return "Go to Resources and mark your weakest topics red. Then spend your next session on just one of them. Narrow focus beats scattered effort every time.";
  const fallbacks = [
    "Tell me more — what specifically are you finding hard right now?",
    "I'm here. What's weighing on you most at the moment?",
    "You haven't given up, and that matters more than people think. What do you need?",
  ];
  return fallbacks[Math.floor(Math.random()*fallbacks.length)];
}

function CompanionChat({companion,subjects,scores,sessions,examSched,C,font,onClose}) {
  ensureAnimStyles();
  const [messages,setMessages] = useState([{
    from:'char',
    text:`Hey, I'm ${companion.name}. What's on your mind? You can ask me anything — how you're doing, what to focus on, or just vent if you need to.`
  }]);
  const [input,setInput] = useState('');
  const listRef = useRef(null);
  const mood = getCompanionMood({sessions,scores,examSched,subjects});
  useEffect(()=>{
    if(listRef.current) listRef.current.scrollTop=listRef.current.scrollHeight;
  },[messages]);
  const send = () => {
    const text=input.trim(); if(!text) return;
    const reply=getCharacterReply(text,{subjects,scores,sessions,examSched});
    setMessages(prev=>[...prev,{from:'user',text},...(reply?[{from:'char',text:reply}]:[])]);
    setInput('');
  };
  return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.72)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
      animation:'rbp-fade-in 0.2s ease'}}>
      <div style={{width:'100%',maxWidth:500,height:'72vh',background:C.surface,
        borderRadius:'20px 20px 0 0',display:'flex',flexDirection:'column',
        boxShadow:'0 -8px 48px rgba(0,0,0,0.4)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
          borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <CompanionAvatar skin={companion.skin} hair={companion.hair} hairStyle={companion.hairStyle} eyeColor={companion.eyeColor??0} outfitColor={companion.outfitColor??0} accessory={companion.accessory??0} mood={mood} size={40}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{companion.name}</div>
            <div style={{fontSize:11,color:C.muted}}>Your study companion</div>
          </div>
          <button onClick={onClose}
            style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:22,lineHeight:1,padding:'4px 8px'}}>×</button>
        </div>
        <div ref={listRef} style={{flex:1,overflowY:'auto',padding:'16px',
          display:'flex',flexDirection:'column',gap:10}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:m.from==='user'?'flex-end':'flex-start'}}>
              <div style={{maxWidth:'84%',
                borderRadius:m.from==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                padding:'10px 14px',
                background:m.from==='user'?C.accent:C.card2,
                color:m.from==='user'?'#fff':C.text,
                fontSize:13,lineHeight:1.6}}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,padding:'12px 16px',
          borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder={`Message ${companion.name}...`}
            style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,
              padding:'10px 14px',color:C.text,fontSize:13,fontFamily:font,outline:'none'}}/>
          <button onClick={send}
            style={{padding:'10px 18px',background:C.accent,border:'none',borderRadius:10,
              color:'#fff',fontSize:13,fontWeight:700,fontFamily:font,cursor:'pointer'}}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ── Achievements view ──────────────────────────────────────────────────────
function AchievementsView({scores,errors,subjects,C,font,unlockedIds=[]}){
  const total=ACHIEVEMENTS.length;
  const unlocked=unlockedIds.length;
  const pct=Math.round((unlocked/total)*100);
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Achievements</div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>Your Milestones</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 12px'}}>{unlocked}/{total} unlocked</p>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:C.accent,borderRadius:3,transition:'width 1s ease'}}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {ACHIEVEMENTS.map(a=>{
          const on=unlockedIds.includes(a.id);
          const tc=TIER_COLOR[a.tier];
          return(
            <div key={a.id} style={{background:on?C.surface:C.card2,
              border:`1px solid ${on?tc+'44':C.border}`,borderRadius:12,
              padding:'16px 14px',opacity:on?1:0.45,transition:'all 0.2s',
              boxShadow:on?`0 0 12px ${tc}22`:undefined}}>
              <div style={{marginBottom:8,color:on?tc:C.subtle,opacity:on?1:0.4}}>{a.Icon&&<a.Icon size={28} strokeWidth={1.5}/>}</div>
              <div style={{fontSize:13,fontWeight:700,color:on?C.text:C.muted,marginBottom:3}}>{a.title}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginBottom:on?8:0}}>{a.desc}</div>
              {on&&<div style={{fontSize:10,fontWeight:700,color:tc,textTransform:'uppercase',
                letterSpacing:0.6}}>{a.tier}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mission board ──────────────────────────────────────────────────────────
function MissionBoard({subjects,scores,C,font,examSched,onQuickLog=()=>{}}) {
  const PAPER_SUGGS=Object.fromEntries(subjects.map(s=>[s.name,getPaperSuggestions(s)]));
  const allExams=subjects
    .flatMap(s=>getSubjectExams(examSched,s.id,s.boardId).map(e=>({...e,subjectName:s.name,color:s.color})))
    .filter(e=>daysUntil(e.date)>0)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const soonest=allExams[0]??null;
  const suggestions=subjects.map(s=>{
    const done=new Set(scores.filter(sc=>sc.subject===s.name).map(sc=>sc.paper));
    const next=(PAPER_SUGGS[s.name]||[]).find(p=>!done.has(p));
    const examIn=allExams.find(e=>e.subjectName===s.name);
    return next?{name:s.name,color:s.color,paper:next,days:examIn?daysUntil(examIn.date):null}:null;
  }).filter(Boolean);
  const abbr=n=>n==='Further Mathematics'||n==='Further Maths'?'FM':n==='Computer Science'?'CS':n;
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',marginBottom:16}}>
      {soonest&&(
        <div style={{padding:'12px 18px',borderBottom:`1px solid ${C.border}`,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          background:`${soonest.color}08`}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Next exam</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {soonest.subjectName} — {soonest.paper.split(':')[1]?.trim()||soonest.paper}
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>
              {new Date(soonest.date).toLocaleDateString('en-GB',{day:'numeric',month:'long'})} · {soonest.time}
            </div>
          </div>
          <div style={{textAlign:'center',flexShrink:0,marginLeft:16}}>
            <div style={{fontSize:42,fontWeight:800,lineHeight:1,
              color:daysUntil(soonest.date)<=7?'#ef4444':daysUntil(soonest.date)<=21?'#f97316':soonest.color}}>
              {daysUntil(soonest.date)}
            </div>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,letterSpacing:0.3}}>days</div>
          </div>
        </div>
      )}
      <div style={{padding:'14px 18px'}}>
        {suggestions.length>0&&(
          <>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>
              Papers to do next
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:0,marginBottom:12}}>
              {suggestions.slice(0,3).map(m=>(
                <div key={m.name} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:m.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:m.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.3,marginBottom:1}}>{abbr(m.name)}</div>
                    <div style={{fontSize:13,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.paper}</div>
                  </div>
                  {m.days!==null&&<div style={{fontSize:11,color:C.muted,flexShrink:0}}>{m.days}d to exam</div>}
                </div>
              ))}
            </div>
          </>
        )}
        <button onClick={onQuickLog}
          style={{width:'100%',padding:'11px',background:C.accent,border:'none',
            borderRadius:9,color:'#fff',fontSize:14,fontWeight:700,fontFamily:font,
            cursor:'pointer',letterSpacing:0.2}}>
          + Log a paper now
        </button>
      </div>
    </div>
  );
}

// ── Insurance eligibility ──────────────────────────────────────────────────
function computeEligibility(scores) {
  const WINDOW = 60 * 86400000;
  const now = Date.now();
  const recent = [...scores]
    .filter(s => now - (s.ts||s.id) < WINDOW)
    .sort((a,b) => (a.ts||a.id) - (b.ts||b.id));

  const papersLogged = recent.length;
  const papersNeeded = Math.max(0, 8 - papersLogged);

  let longestGap = 0;
  for (let i=1; i<recent.length; i++) {
    const gap = Math.floor(((recent[i].ts||recent[i].id) - (recent[i-1].ts||recent[i-1].id)) / 86400000);
    if (gap > longestGap) longestGap = gap;
  }

  let trend = 'stable';
  if (recent.length >= 4) {
    const half = Math.floor(recent.length / 2);
    const firstAvg = recent.slice(0, half).reduce((a,s)=>a+s.pct,0) / half;
    const lastSlice = recent.slice(half);
    const lastAvg  = lastSlice.reduce((a,s)=>a+s.pct,0) / lastSlice.length;
    if (lastAvg - firstAvg > 3) trend = 'improving';
    else if (firstAvg - lastAvg > 3) trend = 'declining';
  }

  const blockers = [];
  if (papersNeeded > 0) blockers.push(`Log ${papersNeeded} more paper${papersNeeded!==1?'s':''}`);
  if (longestGap > 10) blockers.push('Keep gap under 10 days');
  if (trend === 'declining') blockers.push('Reverse your score decline');

  return { isEligible: blockers.length===0, papersLogged, papersNeeded, longestGap, trend, blockers };
}

function EligChip({ ok, label, C }) {
  return (
    <div style={{fontSize:11, padding:'3px 8px', borderRadius:4, fontWeight:600,
      background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      color: ok ? '#22c55e' : '#ef4444'}}>
      {ok ? '✓' : '✗'} {label}
    </div>
  );
}

function InsuranceEligibilityCard({ scores, uid, C, font }) {
  const [expanded, setExpanded] = useState(false);
  const [noted, setNoted]       = useState(()=>ls.get(`rbp_ins_noted_${uid}`, false));

  if (scores.length < 2) return null;

  const elig = computeEligibility(scores);
  const pct  = Math.min(100, Math.round((elig.papersLogged / 8) * 100));

  return (
    <div style={{background:C.surface, border:`1px solid ${elig.isEligible?'#22c55e44':C.border}`,
      borderRadius:10, padding:'14px 18px', marginBottom:12}}>

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
        <div>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase',
            color: elig.isEligible ? '#22c55e' : C.accent}}>Revision Insurance</div>
          <div style={{fontSize:14, fontWeight:600, color:C.text, marginTop:2}}>
            {elig.isEligible
              ? 'You qualify — miss your grade, get £100 back'
              : `${elig.papersNeeded > 0 ? `${elig.papersNeeded} more paper${elig.papersNeeded!==1?'s':''} to qualify` : 'Almost eligible'}`}
          </div>
        </div>
        {elig.isEligible && !noted && (
          <button onClick={()=>setExpanded(e=>!e)}
            style={{background:'#22c55e', border:'none', color:'#fff',
              padding:'8px 14px', borderRadius:7, fontSize:13, fontWeight:600,
              fontFamily:font, cursor:'pointer', flexShrink:0}}>
            {expanded ? 'Close' : 'Get covered'}
          </button>
        )}
        {noted && (
          <span style={{fontSize:12, color:'#22c55e', fontWeight:600, flexShrink:0}}>✓ We'll notify you</span>
        )}
      </div>

      {/* Progress */}
      <div style={{marginBottom:10}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
          <span style={{fontSize:12, color:C.muted}}>Papers logged in last 60 days (need 8)</span>
          <span style={{fontSize:12, fontWeight:600, color:C.text}}>{elig.papersLogged}/8</span>
        </div>
        <div style={{height:4, background:C.border, borderRadius:2, overflow:'hidden'}}>
          <div style={{height:'100%', width:`${pct}%`, borderRadius:2, transition:'width 1s ease',
            background: elig.isEligible ? '#22c55e' : C.accent}}/>
        </div>
      </div>

      {/* Chips */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap',
        marginBottom: expanded || (!elig.isEligible && elig.blockers.length) ? 10 : 0}}>
        <EligChip ok={elig.papersLogged>=8}  label={`${elig.papersLogged}/8 papers`} C={C}/>
        <EligChip ok={elig.longestGap<=10}   label={`Max gap: ${elig.longestGap||0}d`} C={C}/>
        <EligChip ok={elig.trend!=='declining'} label={`Trend: ${elig.trend}`} C={C}/>
      </div>

      {/* How it works panel */}
      {expanded && (
        <div style={{padding:'12px 14px', background:C.card2, borderRadius:8,
          border:`1px solid ${C.border}`, marginTop:4}}>
          <div style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:6}}>How it works</div>
          <div style={{fontSize:12, color:C.muted, lineHeight:1.7, marginBottom:12}}>
            Pay <strong style={{color:C.text}}>£20</strong> before your first exam. If you miss your
            target grade in any covered subject on results day, we pay you{' '}
            <strong style={{color:C.text}}>£100 back</strong>. Only available to students who've been
            consistently revising — which you have been.
          </div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:14}}>
            {['£20 one-time','Up to £100 payout','Results day claim','48hr processing'].map(t=>(
              <span key={t} style={{fontSize:11, padding:'3px 8px', borderRadius:4,
                background:'rgba(34,197,94,0.08)', color:'#22c55e', fontWeight:600}}>{t}</span>
            ))}
          </div>
          <button onClick={()=>{setNoted(true); ls.set(`rbp_ins_noted_${uid}`,true); setExpanded(false);}}
            style={{background:'#22c55e', border:'none', color:'#fff',
              padding:'9px 18px', borderRadius:7, fontSize:13, fontWeight:600,
              fontFamily:font, cursor:'pointer'}}>
            Notify me when it launches
          </button>
        </div>
      )}

      {!elig.isEligible && elig.blockers.length>0 && (
        <div style={{fontSize:12, color:C.muted, marginTop:4}}>
          To qualify: {elig.blockers.join(' · ')}
        </div>
      )}
    </div>
  );
}

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
  const topGrades = '9' in bounds ? ['9','8','7'] : ['A*','A','B'];
  const gradeLines=topGrades.map(g=>({g,y:yScale(bounds[g]||0),pct:bounds[g]||0})).filter(gl=>gl.pct>minY&&gl.pct<maxY);
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

// ── Streak banner ──────────────────────────────────────────────────────────
function StreakBanner({scores, C}) {
  const streak = getStudyStreak(scores);
  if (streak === 0) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const loggedDays = new Set(scores.map(s=>{
    const d=new Date(s.ts||s.id); d.setHours(0,0,0,0); return d.getTime();
  }));
  const gold = streak>=7;
  return (
    <div style={{background: gold ? 'rgba(251,191,36,0.08)' : C.surface,
      border:`1px solid ${gold?'rgba(251,191,36,0.4)':C.border}`,
      borderRadius:10, padding:'12px 16px', marginBottom:12,
      boxShadow: gold ? '0 0 20px rgba(251,191,36,0.15)' : undefined}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:4,alignSelf:'stretch',minHeight:36,borderRadius:2,background:gold?'#fbbf24':C.accent,flexShrink:0}}/>
        <div>
          <div style={{fontSize:15, fontWeight:800,
            color: gold ? '#fbbf24' : C.text}}>
            {streak}-day streak
          </div>
          <div style={{fontSize:11, color:C.muted}}>Keep it going — log a paper today!</div>
        </div>
      </div>
      <div style={{display:'flex',gap:5,marginTop:10}}>
        {Array.from({length:7},(_,i)=>{
          const d=new Date(today); d.setDate(today.getDate()-(6-i));
          const hasLog=loggedDays.has(d.getTime());
          const isToday=d.getTime()===today.getTime();
          return (
            <div key={i} style={{flex:1,textAlign:'center'}}>
              <div style={{width:'100%',height:8,borderRadius:4,
                background:hasLog?(gold?'#fbbf24':C.accent):(isToday?`${C.accent}40`:C.border)}}/>
              <div style={{fontSize:9,color:C.muted,marginTop:3}}>
                {['M','T','W','T','F','S','S'][(d.getDay()+6)%7]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Schedule component ─────────────────────────────────────────────────────
function Schedule({subjects, scores, errors, uid, C, font, examSched=EXAM_SCHEDULE, rag={}}) {
  const [dayIdx, setDayIdx] = useState(0);
  const days = generateSchedule(subjects, scores, errors, examSched, rag);
  const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const stripRef = useRef(null);

  const day = days[dayIdx];
  const dateLabel = dayIdx===0 ? 'Today'
    : dayIdx===1 ? 'Tomorrow'
    : `${DAY_NAMES[day.date.getDay()]} ${day.date.getDate()} ${MONTH_NAMES[day.date.getMonth()]}`;
  const fullDate = `${DAY_NAMES[day.date.getDay()]}, ${day.date.getDate()} ${MONTH_NAMES[day.date.getMonth()]}`;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Plan</div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>Revision Schedule</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Ranked by exam urgency and your weak areas.</p>
      </div>

      {/* Day strip */}
      <div ref={stripRef} style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2,
        scrollbarWidth:'none',msOverflowStyle:'none'}}>
        {days.map((d,i)=>{
          const lbl = i===0?'Today':i===1?'Tmrw':`${DAY_NAMES[d.date.getDay()]} ${d.date.getDate()}`;
          const isExam = d.isExamDay;
          const sel = dayIdx===i;
          return (
            <button key={i} onClick={()=>setDayIdx(i)}
              style={{flexShrink:0,padding:'7px 13px',borderRadius:8,cursor:'pointer',
                fontFamily:font,fontSize:12,fontWeight:sel?700:400,whiteSpace:'nowrap',
                background: sel ? (isExam?'rgba(249,115,22,0.12)':C.accentSoft) : 'transparent',
                border:`1px solid ${sel?(isExam?'#f97316':C.accent):(isExam?'rgba(249,115,22,0.3)':C.border)}`,
                color: sel ? (isExam?'#f97316':C.accent) : (isExam?'#f9731699':C.muted),
                transition:'all 0.12s'}}>
              {lbl}{isExam?' ·':''}{isExam&&<span style={{fontSize:9,fontWeight:800,letterSpacing:0.3}}> EXAM</span>}
            </button>
          );
        })}
      </div>

      {/* Selected day card */}
      <div style={{background:day.isExamDay?'rgba(249,115,22,0.04)':C.surface,
        border:`1px solid ${day.isExamDay?'rgba(249,115,22,0.35)':C.border}`,
        borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${day.isExamDay?'rgba(249,115,22,0.2)':C.border}`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>{dateLabel}</div>
            {dayIdx!==0&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>{fullDate}</div>}
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setDayIdx(i=>Math.max(0,i-1))} disabled={dayIdx===0}
              style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,
                background:'transparent',color:dayIdx===0?C.subtle:C.muted,cursor:dayIdx===0?'default':'pointer',
                fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:font}}>
              ‹
            </button>
            <button onClick={()=>setDayIdx(i=>Math.min(days.length-1,i+1))} disabled={dayIdx===days.length-1}
              style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,
                background:'transparent',color:dayIdx===days.length-1?C.subtle:C.muted,
                cursor:dayIdx===days.length-1?'default':'pointer',
                fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:font}}>
              ›
            </button>
          </div>
        </div>

        <div style={{padding:'16px 18px'}}>
          {day.isExamDay ? (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{fontSize:11,fontWeight:700,color:'#f97316',textTransform:'uppercase',letterSpacing:0.5}}>
                Exam day — rest, review key notes only
              </div>
              {day.exams.map((e,j)=>(
                <div key={j} style={{display:'flex',alignItems:'flex-start',gap:10,
                  padding:'10px 14px',background:'rgba(249,115,22,0.07)',borderRadius:8}}>
                  <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:'#f97316',flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{e.subjectName}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{e.paper}</div>
                    <div style={{fontSize:11,color:'#f9731699',marginTop:2}}>{e.time} &middot; {e.duration} &middot; {e.code}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>
                Suggested focus
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {day.slots.map((s,j)=>(
                  <div key={j} style={{padding:'12px 14px',background:`${s.color}0d`,borderRadius:8,
                    border:`1px solid ${s.color}22`}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:s.color,flexShrink:0}}/>
                      <div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.name}</div>
                    </div>
                    {s.redTopics?.length>0&&(
                      <div style={{marginTop:7,marginLeft:15,display:'flex',flexDirection:'column',gap:3}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#ef4444',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2}}>
                          Weak spots to drill
                        </div>
                        {s.redTopics.slice(0,2).map((t,k)=>(
                          <div key={k} style={{fontSize:12,color:C.muted,display:'flex',alignItems:'center',gap:5}}>
                            <span style={{color:'#ef4444',fontSize:9}}>●</span>{t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {dayIdx===0&&(
                <div style={{marginTop:14,fontSize:12,color:C.subtle,lineHeight:1.6}}>
                  Priority order: exam urgency + weak scores + red RAG topics.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share readiness card ────────────────────────────────────────────────────
function ShareReadinessCard({br, subjects, scores, C, font}) {
  const canvasRef = useRef(null);
  const [generated,  setGenerated]  = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing,    setSharing]    = useState(false);

  const subjectAvg = name => {
    const ss=scores.filter(x=>x.subject===name);
    return ss.length ? Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length) : null;
  };

  const drawCard = () => {
    if (!canvasRef.current) return;
    ensureAnimStyles();
    setGenerating(true);
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) { setGenerating(false); return; }
      const ctx = canvas.getContext('2d');
      const W=600, H=315, DEG=Math.PI/180;
      canvas.width=W; canvas.height=H;

      // ── BACKGROUND ──
      ctx.fillStyle='#0d0f16';
      ctx.fillRect(0,0,W,H);
      const bgG=ctx.createRadialGradient(0,H,0,0,H,W*0.9);
      bgG.addColorStop(0,'rgba(194,124,96,0.2)');
      bgG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bgG; ctx.fillRect(0,0,W,H);
      const bgG2=ctx.createRadialGradient(W,0,0,W,0,W*0.55);
      bgG2.addColorStop(0,'rgba(90,110,200,0.07)');
      bgG2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bgG2; ctx.fillRect(0,0,W,H);

      // Left accent bar
      const barG=ctx.createLinearGradient(0,0,0,H);
      barG.addColorStop(0,br.labelColor+'ff');
      barG.addColorStop(1,br.labelColor+'33');
      ctx.fillStyle=barG; ctx.fillRect(0,0,4,H);

      // ── GAUGE ──
      const GX=118, GY=158, GR=74;
      const startA=210*DEG, sweepA=240*DEG;
      const pct=Math.min(Math.max(br.total,0),100)/100;

      // Glow
      ctx.beginPath();
      ctx.arc(GX,GY,GR+2,startA,startA+sweepA*pct);
      ctx.strokeStyle=br.labelColor+'20'; ctx.lineWidth=22; ctx.lineCap='round'; ctx.stroke();
      // Track
      ctx.beginPath();
      ctx.arc(GX,GY,GR,startA,startA+sweepA);
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=13; ctx.lineCap='round'; ctx.stroke();
      // Progress
      ctx.beginPath();
      ctx.arc(GX,GY,GR,startA,startA+sweepA*pct);
      ctx.strokeStyle=br.labelColor; ctx.lineWidth=13; ctx.lineCap='round'; ctx.stroke();

      // Score number
      ctx.textAlign='center';
      ctx.font="900 68px system-ui,-apple-system,sans-serif";
      ctx.fillStyle=br.labelColor;
      ctx.fillText(`${br.total}`,GX,GY+12);
      const sW=ctx.measureText(`${br.total}`).width;
      ctx.font="700 20px system-ui,-apple-system,sans-serif";
      ctx.textAlign='left'; ctx.fillStyle=br.labelColor+'88';
      ctx.fillText('%',GX+sW/2+3,GY-18);

      // Readiness label
      ctx.textAlign='center';
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.font="600 9px system-ui,-apple-system,sans-serif";
      ctx.fillText('BATTLE READINESS',GX,GY+42);
      ctx.fillStyle=br.labelColor;
      ctx.font="800 13px system-ui,-apple-system,sans-serif";
      ctx.fillText(br.label.toUpperCase(),GX,GY+59);

      // ── DIVIDER ──
      ctx.strokeStyle='rgba(255,255,255,0.07)';
      ctx.lineWidth=1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(228,22); ctx.lineTo(228,H-22); ctx.stroke();

      // ── RIGHT: header ──
      ctx.textAlign='left';
      ctx.fillStyle=br.labelColor;
      ctx.font="800 16px system-ui,-apple-system,sans-serif";
      ctx.fillText('Battle Plan',246,44);
      ctx.fillStyle='rgba(255,255,255,0.22)';
      ctx.font="500 9px system-ui,-apple-system,sans-serif";
      ctx.fillText('A-LEVEL REVISION TRACKER  ·  BEATTHEEXAM.ORG',246,59);

      ctx.strokeStyle='rgba(255,255,255,0.06)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(246,68); ctx.lineTo(W-18,68); ctx.stroke();

      // ── SUBJECT LIST ──
      const subList=subjects.filter(s=>subjectAvg(s.name)!==null).slice(0,4);
      let sy=84;
      for (const s of subList) {
        const avg=subjectAvg(s.name);
        ctx.fillStyle=s.color;
        ctx.beginPath(); ctx.arc(252,sy,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.48)';
        ctx.font="500 11px system-ui,-apple-system,sans-serif";
        ctx.textAlign='left';
        ctx.fillText(s.name.length>23?s.name.slice(0,22)+'…':s.name,264,sy+4);
        ctx.fillStyle=s.color;
        ctx.font="700 12px system-ui,-apple-system,sans-serif";
        ctx.textAlign='right';
        ctx.fillText(`${avg}%`,W-20,sy+4);
        // Bar
        const bx=264,by=sy+10,bw=W-20-264-46,bh=4;
        ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle=s.color+'bb'; ctx.fillRect(bx,by,bw*avg/100,bh);
        sy+=34;
      }

      // ── BOTTOM ──
      ctx.strokeStyle='rgba(255,255,255,0.05)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,H-24); ctx.lineTo(W,H-24); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.font="500 9px system-ui,-apple-system,sans-serif";
      ctx.textAlign='left';
      ctx.fillText('Tracked with Battle Plan',8,H-8);
      ctx.textAlign='right';
      ctx.fillText('beattheexam.org',W-8,H-8);

      setGenerating(false);
      setGenerated(true);
    });
  };

  const download = () => {
    const canvas=canvasRef.current;
    if (!canvas) return;
    const link=document.createElement('a');
    link.download='battle-readiness.png';
    link.href=canvas.toDataURL('image/png');
    link.click();
  };

  const share = async () => {
    const canvas=canvasRef.current;
    if (!canvas||sharing) return;
    setSharing(true);
    try {
      await new Promise(resolve=>canvas.toBlob(async blob=>{
        try {
          const file=new File([blob],'battle-readiness.png',{type:'image/png'});
          const shareText=`${br.total}% Battle Readiness — ${br.label}!\nTracked with A* Battle Plan`;
          if (navigator.canShare?.({files:[file]})) {
            await navigator.share({files:[file],title:'My Battle Readiness',text:shareText});
          } else {
            await navigator.share({title:'My Battle Readiness',url:'https://beattheexam.org',text:shareText});
          }
        } catch {}
        resolve();
      },'image/png'));
    } catch {}
    setSharing(false);
  };

  const canWebShare=typeof navigator!=='undefined'&&typeof navigator.share==='function';
  const Spinner=()=>(
    <span style={{display:'inline-block',width:12,height:12,borderRadius:'50%',
      border:'2px solid #fff',borderTopColor:'transparent',
      animation:'rbp-spin 0.65s linear infinite',verticalAlign:'middle'}}/>
  );

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 18px',marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:generated?10:0}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>Brag card</div>
          <div style={{fontSize:11,color:C.muted}}>Generate a shareable readiness card</div>
        </div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={drawCard} disabled={generating}
            style={{padding:'7px 16px',background:C.accent,border:'none',borderRadius:8,
              color:'#fff',fontSize:12,fontWeight:600,fontFamily:font,
              cursor:generating?'default':'pointer',
              display:'flex',alignItems:'center',gap:6,opacity:generating?0.85:1}}>
            {generating?<Spinner/>:null}
            {generating?'Building…':generated?'Regenerate':'Generate card'}
          </button>
          {generated&&!generating&&(
            <>
              <button onClick={download}
                style={{padding:'7px 13px',background:'transparent',border:`1px solid ${C.border}`,
                  borderRadius:8,color:C.muted,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
                Download
              </button>
              {canWebShare&&(
                <button onClick={share} disabled={sharing}
                  style={{padding:'7px 13px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
                    borderRadius:8,color:C.accent,fontSize:12,fontWeight:600,fontFamily:font,
                    cursor:sharing?'not-allowed':'pointer'}}>
                  {sharing?'…':'Share'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <canvas ref={canvasRef}
        style={{width:'100%',borderRadius:8,display:generated&&!generating?'block':'none'}}/>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
function Analytics({subjects, scores, errors, uid, C, font, examSched=EXAM_SCHEDULE, onQuickLog, targets, setTargets, sessions=[], rag={}, isPro=false, onUpgrade, isGcse=false}) {
  const SUBJ_COLORS  = Object.fromEntries(subjects.map(s=>[s.name,s.color]));
  const GRADE_BOUNDS = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));

  const [chartSubject,setChartSubject] = useState(subjects[0]?.name??'');

  const br = calcBattleReadiness(scores, errors);

  const subjectAvg = name => {
    const ss=scores.filter(x=>x.subject===name);
    return ss.length ? Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length) : null;
  };

  const allUpcoming = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId))
    .map(e=>({...e,d:Math.ceil((new Date(e.date)-Date.now())/86400000)}))
    .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d);
  const isOffSeason = allUpcoming.length===0 || allUpcoming[0].d>90;

  const redTopics = isOffSeason ? subjects.flatMap(s=>
    (SPEC_TOPICS[s.id]||[]).map((topic,i)=>({topic,s,key:`${s.id}_${i}`}))
  ).filter(t=>rag[t.key]==='red').slice(0,6) : [];

  const hour = new Date().getHours();
  const greeting = hour<5?'Night ops':hour<12?'Morning briefing':hour<17?'Afternoon briefing':'Evening briefing';

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>
          {isOffSeason?'Foundation Mode':greeting}
        </div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>
          {isOffSeason?'Build Your Foundation':'Performance Dashboard'}
        </h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>
          {isOffSeason
            ? allUpcoming.length>0
              ? `${allUpcoming[0].d} days until your first exam. Build the habits that will carry you through.`
              : 'No exams scheduled yet. Set your subjects up in Account and start logging papers.'
            : 'Track your scores and readiness across all subjects.'}
        </p>
      </div>

      {/* ── Exam countdown / off-season strip ───────────────────────────── */}
      {isOffSeason ? (
        <>
          {allUpcoming.length>0&&(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,
              borderRadius:12,padding:'14px 16px',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:0.8,
                textTransform:'uppercase',marginBottom:8}}>Season countdown</div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div>
                  <div style={{fontSize:36,fontWeight:900,color:C.accent,lineHeight:1}}>{allUpcoming[0].d}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>days to go</div>
                </div>
                <div style={{flex:1,fontSize:13,color:C.muted,lineHeight:1.55}}>
                  {Math.floor(allUpcoming[0].d/7)} week{allUpcoming[0].d>=14?'s':''} to build solid habits.
                  Log past papers regularly and watch your readiness climb.
                </div>
              </div>
            </div>
          )}
          {redTopics.length>0&&(
            <div style={{background:C.surface,border:'1px solid rgba(239,68,68,0.2)',
              borderRadius:12,padding:'14px 16px',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'#ef4444',letterSpacing:0.8,
                textTransform:'uppercase',marginBottom:10}}>Topics to master before exam season</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {redTopics.map(t=>(
                  <div key={t.key} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:t.s.color,flexShrink:0}}/>
                    <span style={{fontSize:12,color:C.muted,flex:1}}>{t.topic}</span>
                    <span style={{fontSize:10,color:t.s.color,fontWeight:600}}>{t.s.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {redTopics.length===0&&Object.keys(rag).length===0&&(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,
              borderRadius:12,padding:'14px 16px',marginBottom:12}}>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
                Go to <strong style={{color:C.text}}>Resources</strong> and mark your spec topics.
                Red items will appear here so you know exactly what to focus on before exam season.
              </div>
            </div>
          )}
        </>
      ):(
        (()=>{
          const now=new Date(); now.setHours(0,0,0,0);
          const upcoming=subjects.flatMap(s=>
            getSubjectExams(examSched,s.id,s.boardId).map(e=>({...e,subjectName:s.name,color:s.color}))
          ).map(e=>({...e,d:Math.ceil((new Date(e.date)-now)/86400000)}))
           .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d);
          if(!upcoming.length) return null;
          const thisWeek=upcoming.filter(e=>e.d<=7);
          return (
            <div style={{background:C.surface,border:`1px solid ${upcoming[0].d<=7?upcoming[0].color+'44':C.border}`,
              borderRadius:12,padding:'12px 16px',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:0.8,textTransform:'uppercase',marginBottom:10}}>
                {thisWeek.length>1?`${thisWeek.length} exams this week`:'Next exam'}
              </div>
              <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:2,scrollbarWidth:'none'}}>
                {upcoming.slice(0,6).map(e=>(
                  <div key={e.code} style={{flexShrink:0,background:`${e.color}12`,
                    border:`1px solid ${e.d<=7?e.color+'55':e.color+'22'}`,
                    borderRadius:10,padding:'8px 12px',minWidth:72,textAlign:'center'}}>
                    <div style={{fontSize:10,fontWeight:700,color:e.color,marginBottom:3,
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:80}}>
                      {e.subjectName.split(' ')[0]}
                    </div>
                    <div style={{fontSize:e.d===0?18:26,fontWeight:900,color:e.d<=7?e.color:C.text,lineHeight:1}}>
                      {e.d===0?'Today':e.d}
                    </div>
                    {e.d>0&&<div style={{fontSize:9,color:C.muted,fontWeight:600,letterSpacing:0.5,marginTop:1}}>DAYS</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* ── Battle readiness gauge ───────────────────────────────────────── */}
      <div style={{background:C.surface,border:`1px solid ${br.labelColor}30`,borderRadius:12,
        padding:'16px 18px',marginBottom:12,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:0.8,textTransform:'uppercase',marginBottom:6}}>Battle Readiness</div>
          <BattleGauge score={br.total} label={br.label} labelColor={br.labelColor} textColor={C.text} mutedColor={C.muted}/>
        </div>
        <div style={{flex:1,minWidth:160}}>
          {[
            ['Papers',    br.paperComp, 20, '#3b82f6'],
            ['Avg score', br.scoreComp, 40, '#8b5cf6'],
            ['Error ctrl',br.errorComp, 20, '#f97316'],
            ['Plan done', 0,            20, '#22c55e'],
          ].map(([l,v,mx,c])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
              <div style={{fontSize:12,color:C.muted,width:62,flexShrink:0}}>{l}</div>
              <div style={{flex:1,height:5,borderRadius:3,background:C.border,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(v/mx)*100}%`,background:c,borderRadius:3,transition:'width 1.2s ease'}}/>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:c,width:20,textAlign:'right'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Share card ───────────────────────────────────────────────────── */}
      {scores.length>0&&<ShareReadinessCard br={br} subjects={subjects} scores={scores} C={C} font={font}/>}

      {/* ── Per-subject cards ─────────────────────────────────────────────── */}
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
        {subjects.map(s=>{
          const avg      = subjectAvg(s.name);
          const grade    = avg!=null ? getSubjectGrade(avg, s.name, GRADE_BOUNDS) : null;
          const cnt      = scores.filter(x=>x.subject===s.name).length;
          const target   = targets[s.name]||'A*';
          const targetPct = (s.gradeBoundaries?.[target])||80;
          const progress  = avg!=null ? Math.min(100,Math.round((avg/targetPct)*100)) : 0;
          const ss=[...scores].filter(x=>x.subject===s.name).reverse();
          const trend=ss.length>=2 ? ss[ss.length-1].pct - ss[ss.length-2].pct : null;
          const pred=predictedGrade(scores, s.name, GRADE_BOUNDS);
          return (
            <div key={s.name} style={{
              background:C.surface,
              borderRadius:10,padding:'12px 16px',
              border:`1px solid ${C.border}`,
              borderLeft:`3px solid ${s.color}`,
              boxShadow:`0 2px 8px rgba(0,0,0,0.05)`,
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{fontSize:12,color:s.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.3}}>{s.name}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
                    <span style={{fontSize:30,fontWeight:900,color:grade?gradeColor(grade):'#888',lineHeight:1}}>{grade||'—'}</span>
                    {avg!=null&&<span style={{fontSize:14,color:C.muted}}>{avg}% avg</span>}
                    {trend!=null&&(
                      <span style={{fontSize:13,fontWeight:700,color:trend>=0?'#22c55e':'#ef4444'}}>
                        {trend>=0?'▲':'▼'}{Math.abs(trend)}%
                      </span>
                    )}
                  </div>
                  {pred&&(
                    <div style={{fontSize:11,color:C.muted,marginTop:3,display:'flex',alignItems:'center',gap:4}}>
                      <span style={{color:C.subtle}}>Projected:</span>
                      <span style={{fontWeight:700,color:gradeColor(pred.grade)}}>{pred.grade}</span>
                      <span style={{color:C.subtle}}>({pred.pct}%)</span>
                      <span style={{color:pred.trend==='up'?'#22c55e':pred.trend==='down'?'#ef4444':C.subtle,fontSize:10}}>
                        {pred.trend==='up'?'↗ improving':pred.trend==='down'?'↘ declining':'→ stable'}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:6}}>
                    {cnt} paper{cnt!==1?'s':''} · Target:
                    <select value={target} onChange={e=>setTargets(p=>({...p,[s.name]:e.target.value}))}
                      style={{background:'transparent',border:'none',color:gradeColor(target),
                        fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',outline:'none',marginLeft:4}}>
                      {(isGcse?['9','8','7','6','5']:['A*','A','B','C']).map(g=><option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                    <div style={{width:80,height:5,borderRadius:3,background:C.border,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${progress}%`,background:s.color,borderRadius:3,transition:'width 1.2s ease'}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:progress>=100?'#22c55e':s.color}}>{progress}%</span>
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
          {Object.entries(GRADE_BOUNDS[chartSubject]||{}).filter(([g])=>isGcse?['9','8','7'].includes(g):['A*','A','B'].includes(g)).map(([g,v])=>(
            <div key={g} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:16,height:2,background:gradeColor(g),opacity:0.5,borderRadius:1}}/>
              <span style={{fontSize:12,color:gradeColor(g)}}>{g} ≥{v}%</span>
            </div>
          ))}
        </div>
      </div>

      <InsuranceEligibilityCard scores={scores} uid={uid} C={C} font={font}/>
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
  const allExams=subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId).map(e=>({...e,subjectName:s.name,color:s.color})))
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

// ── Donut chart for timer ──────────────────────────────────────────────────
function DonutChart({slices,selected,onSelect,C,size=140}) {
  const total = slices.reduce((a,s)=>a+s.secs,0);
  if (!total) return null;
  const R=size*0.37, r=size*0.24, cx=size/2, cy=size/2;
  let angle=-Math.PI/2;
  const paths=slices.map(s=>{
    const frac=s.secs/total;
    const a1=angle, a2=angle+frac*2*Math.PI; angle=a2;
    const x1=cx+R*Math.cos(a1),y1=cy+R*Math.sin(a1);
    const x2=cx+R*Math.cos(a2),y2=cy+R*Math.sin(a2);
    const xi1=cx+r*Math.cos(a2),yi1=cy+r*Math.sin(a2);
    const xi2=cx+r*Math.cos(a1),yi2=cy+r*Math.sin(a1);
    const lg=frac>0.5?1:0;
    const d=frac>0.9999
      ?`M ${cx} ${cy-R} A ${R} ${R} 0 1 1 ${cx-0.01} ${cy-R} Z M ${cx} ${cy-r} A ${r} ${r} 0 1 0 ${cx-0.01} ${cy-r} Z`
      :`M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${lg} 0 ${xi2} ${yi2} Z`;
    return {...s,d,frac};
  });
  const fmt=secs=>{const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;};
  const sel=slices.find(s=>s.id===selected);
  return (
    <svg width={size} height={size} style={{flexShrink:0,overflow:'visible'}}>
      {paths.map(p=>(
        <path key={p.id} d={p.d} fill={p.color}
          opacity={selected&&selected!==p.id?0.22:1}
          style={{cursor:'pointer',transition:'opacity 0.2s'}}
          onClick={()=>onSelect(selected===p.id?null:p.id)}/>
      ))}
      {sel?(
        <>
          <text x={cx} y={cy-5} textAnchor="middle" fontSize={10} fontWeight="700" fill={sel.color}>
            {sel.name.split(' ').slice(0,2).join(' ')}
          </text>
          <text x={cx} y={cy+11} textAnchor="middle" fontSize={13} fontWeight="800" fill={sel.color}>
            {fmt(sel.secs)}
          </text>
        </>
      ):(
        <>
          <text x={cx} y={cy-4} textAnchor="middle" fontSize={15} fontWeight="800" fill={C.text}>
            {fmt(total)}
          </text>
          <text x={cx} y={cy+12} textAnchor="middle" fontSize={8} fontWeight="700" fill={C.muted}>
            TODAY
          </text>
        </>
      )}
    </svg>
  );
}

// ── Study timer ────────────────────────────────────────────────────────────
function StudyTimer({subjects,uid,C,font,sessions,setSessions}) {
  const [timerMode,  setTimerMode]  = useState('pomodoro');
  const [selSubject, setSelSubject] = useState(subjects[0]?.id??'');
  const [workMins,   setWorkMins]   = useState(25);
  const [breakMins,  setBreakMins]  = useState(5);
  const [pomMode,    setPomMode]    = useState('work');
  const [pomRunning, setPomRunning] = useState(false);
  const [swRunning,  setSwRunning]  = useState(false);
  const [pieSelected,setPieSelected]= useState(null);
  const [,setTick] = useState(0); // force re-renders

  // Background-safe timer refs: all time derived from Date.now() not counters
  const pomEndRef  = useRef(null); // timestamp when pomodoro expires
  const pomRemRef  = useRef(25*60); // remaining secs when paused
  const swStartRef = useRef(null); // adjusted start time for stopwatch
  const swAccumRef = useRef(0);    // accumulated secs when stopped

  // Derived display values (always computed from timestamps)
  const pomSecs = pomRunning
    ? Math.max(0, Math.ceil((pomEndRef.current - Date.now()) / 1000))
    : pomRemRef.current;
  const swSecs = swRunning
    ? Math.max(0, Math.round((Date.now() - swStartRef.current) / 1000))
    : swAccumRef.current;

  // Tick interval — just triggers re-renders; accuracy comes from Date.now()
  useEffect(()=>{
    if (!pomRunning && !swRunning) return;
    const id = setInterval(()=>{
      setTick(t=>t+1);
      if (pomRunning && pomEndRef.current && Date.now()>=pomEndRef.current) {
        setPomRunning(false); pomEndRef.current=null;
        if (pomMode==='work') {
          const sess={id:Date.now(),subjectId:selSubject,secs:workMins*60,ts:Date.now()};
          setSessions(prev=>{const next=[...prev,sess];ls.set(`rbp_sessions_${uid}`,next);return next;});
          setPomMode('break'); pomRemRef.current=breakMins*60;
        } else {
          setPomMode('work'); pomRemRef.current=workMins*60;
        }
      }
    }, 250);
    return ()=>clearInterval(id);
  },[pomRunning,swRunning,pomMode,selSubject,workMins,breakMins,uid]);

  // Re-render when tab regains focus (catches background throttling)
  useEffect(()=>{
    const fn=()=>{if(!document.hidden)setTick(t=>t+1);};
    document.addEventListener('visibilitychange',fn);
    return ()=>document.removeEventListener('visibilitychange',fn);
  },[]);

  const pomStart = () => {
    pomEndRef.current = Date.now() + pomRemRef.current * 1000;
    setPomRunning(true);
  };
  const pomPause = () => {
    pomRemRef.current = Math.max(0, Math.ceil((pomEndRef.current - Date.now()) / 1000));
    pomEndRef.current = null; setPomRunning(false);
  };
  const pomReset = () => {
    pomEndRef.current = null;
    pomRemRef.current = (pomMode==='work'?workMins:breakMins)*60;
    setPomRunning(false); setTick(t=>t+1);
  };

  const swStart = () => {
    swStartRef.current = Date.now() - swAccumRef.current * 1000;
    setSwRunning(true);
  };
  const swPause = () => {
    swAccumRef.current = Math.round((Date.now() - swStartRef.current) / 1000);
    swStartRef.current = null; setSwRunning(false);
  };
  const swReset = () => {
    swAccumRef.current = 0; swStartRef.current = null;
    setSwRunning(false); setTick(t=>t+1);
  };
  const saveStopwatch = () => {
    const secs = swSecs;
    if (secs < 60) return;
    const sess={id:Date.now(),subjectId:selSubject,secs,ts:Date.now()};
    setSessions(prev=>{const next=[...prev,sess];ls.set(`rbp_sessions_${uid}`,next);return next;});
    swReset();
  };
  const switchTimerMode = m => {
    pomReset(); swReset(); setTimerMode(m);
  };

  const fmtSw = secs=>{
    const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
    if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const fmtDur=secs=>{const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;};

  const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const weekStart=new Date(todayStart); weekStart.setDate(weekStart.getDate()-6);
  const workSessions=sessions.filter(s=>s.subjectId);
  const todaySessions=workSessions.filter(s=>s.ts>=todayStart.getTime());
  const weekSessions=workSessions.filter(s=>s.ts>=weekStart.getTime());
  const todaySecs=todaySessions.reduce((a,s)=>a+s.secs,0);
  const weekSecs=weekSessions.reduce((a,s)=>a+s.secs,0);

  const bySubjectToday = subjects.map(s=>({
    ...s, secs:todaySessions.filter(ss=>ss.subjectId===s.id).reduce((a,ss)=>a+ss.secs,0)
  })).filter(s=>s.secs>0).sort((a,b)=>b.secs-a.secs);

  const daySet=new Set(workSessions.map(s=>{const d=new Date(s.ts);d.setHours(0,0,0,0);return d.getTime();}));
  let streak=0; const chk=new Date(); chk.setHours(0,0,0,0);
  while(daySet.has(chk.getTime())){streak++;chk.setDate(chk.getDate()-1);}

  const pomMm=String(Math.floor(pomSecs/60)).padStart(2,'0');
  const pomSs=String(pomSecs%60).padStart(2,'0');
  const isBreak=pomMode==='break';

  // Detail panel for selected pie segment
  const selSubjectObj = pieSelected ? subjects.find(s=>s.id===pieSelected) : null;
  const selDetail = selSubjectObj ? (()=>{
    const allSess = workSessions.filter(s=>s.subjectId===pieSelected);
    const totalSecs = allSess.reduce((a,s)=>a+s.secs,0);
    const weekSubSecs = weekSessions.filter(s=>s.subjectId===pieSelected).reduce((a,s)=>a+s.secs,0);
    // Last 7 days bars
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      const next=new Date(d); next.setDate(next.getDate()+1);
      days.push({
        label:d.toLocaleDateString('en-GB',{weekday:'short'}).slice(0,1),
        secs:allSess.filter(s=>s.ts>=d.getTime()&&s.ts<next.getTime()).reduce((a,s)=>a+s.secs,0),
        isToday:i===0,
      });
    }
    const maxDay=Math.max(...days.map(d=>d.secs),1);
    return {allSess,totalSecs,weekSubSecs,days,maxDay};
  })() : null;

  const subjectPill = locked=>(
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
      {subjects.map(s=>(
        <button key={s.id} onClick={()=>{if(!locked)setSelSubject(s.id);}} disabled={locked}
          style={{padding:'5px 13px',borderRadius:20,
            border:`1px solid ${selSubject===s.id?s.color:C.border}`,
            background:selSubject===s.id?`${s.color}18`:'transparent',
            color:selSubject===s.id?s.color:C.muted,
            fontSize:11,fontWeight:selSubject===s.id?700:400,
            fontFamily:font,cursor:locked?'default':'pointer',transition:'all 0.15s'}}>
          {s.name}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Focus</div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>Study Timer</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Runs in background. Sessions synced across devices.</p>
      </div>

      <div style={{display:'flex',gap:0,background:C.card2,borderRadius:9,padding:3,alignSelf:'flex-start',border:`1px solid ${C.border}`}}>
        {[['pomodoro','Pomodoro'],['stopwatch','Stopwatch']].map(([m,lbl])=>(
          <button key={m} onClick={()=>switchTimerMode(m)}
            style={{padding:'7px 18px',borderRadius:7,border:'none',
              background:timerMode===m?C.surface:'transparent',
              color:timerMode===m?C.text:C.muted,
              fontSize:12,fontWeight:timerMode===m?700:400,fontFamily:font,cursor:'pointer',
              boxShadow:timerMode===m?'0 1px 3px rgba(0,0,0,0.12)':'none',
              transition:'all 0.15s'}}>
            {lbl}
          </button>
        ))}
      </div>

      {timerMode==='pomodoro'?(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'24px 20px'}}>
          {subjectPill(pomRunning)}
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
              color:isBreak?'#4ade80':C.accent,marginBottom:6}}>{isBreak?'Break':'Focus'}</div>
            <div style={{fontSize:76,fontWeight:800,color:C.text,
              fontFamily:"'JetBrains Mono','SF Mono',monospace",
              lineHeight:1,letterSpacing:-3,marginBottom:18}}>{pomMm}:{pomSs}</div>
            <div style={{display:'flex',gap:24,justifyContent:'center',marginBottom:20,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:5}}>Work</div>
                <div style={{display:'flex',gap:4}}>
                  {TIMER_WORK_OPTS.map(m=>(
                    <button key={m} onClick={()=>{if(!pomRunning){setWorkMins(m);if(pomMode==='work')pomRemRef.current=m*60;setTick(t=>t+1);}}}
                      disabled={pomRunning}
                      style={{padding:'3px 9px',borderRadius:5,
                        border:`1px solid ${workMins===m?C.accent:C.border}`,
                        background:workMins===m?C.accentSoft:'transparent',
                        color:workMins===m?C.accent:C.muted,
                        fontSize:11,fontWeight:workMins===m?700:400,fontFamily:font,cursor:pomRunning?'default':'pointer'}}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:5}}>Break</div>
                <div style={{display:'flex',gap:4}}>
                  {TIMER_BREAK_OPTS.map(m=>(
                    <button key={m} onClick={()=>{if(!pomRunning){setBreakMins(m);if(pomMode==='break')pomRemRef.current=m*60;setTick(t=>t+1);}}}
                      disabled={pomRunning}
                      style={{padding:'3px 9px',borderRadius:5,
                        border:`1px solid ${breakMins===m?'#4ade80':C.border}`,
                        background:breakMins===m?'rgba(74,222,128,0.10)':'transparent',
                        color:breakMins===m?'#4ade80':C.muted,
                        fontSize:11,fontWeight:breakMins===m?700:400,fontFamily:font,cursor:pomRunning?'default':'pointer'}}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={pomRunning?pomPause:pomStart}
                style={{padding:'11px 36px',borderRadius:8,
                  background:pomRunning?C.card2:isBreak?'#4ade80':C.accent,
                  border:`1px solid ${pomRunning?C.border:isBreak?'#4ade80':C.accent}`,
                  color:pomRunning?C.text:'#fff',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer',transition:'all 0.15s'}}>
                {pomRunning?'Pause':'Start'}
              </button>
              <button onClick={pomReset}
                style={{padding:'11px 20px',borderRadius:8,background:'transparent',
                  border:`1px solid ${C.border}`,color:C.muted,fontSize:14,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
                Reset
              </button>
            </div>
          </div>
          {todaySessions.length>0&&(
            <div style={{textAlign:'center',fontSize:12,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              {todaySessions.length} session{todaySessions.length!==1?'s':''} today
              &nbsp;&middot;&nbsp;{fmtDur(todaySecs)} focused
              {streak>0&&<>&nbsp;&middot;&nbsp;<span style={{color:C.accent,fontWeight:600}}>{streak}-day streak</span></>}
            </div>
          )}
        </div>
      ):(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'24px 20px'}}>
          {subjectPill(swRunning)}
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
              color:swRunning?C.accent:C.subtle,marginBottom:6}}>{swRunning?'Running':'Stopped'}</div>
            <div style={{fontSize:swSecs>=3600?64:76,fontWeight:800,color:C.text,
              fontFamily:"'JetBrains Mono','SF Mono',monospace",
              lineHeight:1,letterSpacing:-3,marginBottom:24}}>{fmtSw(swSecs)}</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={swRunning?swPause:swStart}
                style={{padding:'11px 36px',borderRadius:8,
                  background:swRunning?C.card2:C.accent,
                  border:`1px solid ${swRunning?C.border:C.accent}`,
                  color:swRunning?C.text:'#fff',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer',transition:'all 0.15s'}}>
                {swRunning?'Pause':'Start'}
              </button>
              {swSecs>=60&&(
                <button onClick={saveStopwatch}
                  style={{padding:'11px 20px',borderRadius:8,
                    background:'rgba(74,222,128,0.10)',border:'1px solid #4ade8040',
                    color:'#4ade80',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer',transition:'all 0.15s'}}>
                  Save Session
                </button>
              )}
              {swSecs>0&&!swRunning&&(
                <button onClick={swReset}
                  style={{padding:'11px 16px',borderRadius:8,background:'transparent',
                    border:`1px solid ${C.border}`,color:C.muted,fontSize:14,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
                  Reset
                </button>
              )}
            </div>
            {swSecs>0&&swSecs<60&&!swRunning&&(
              <div style={{marginTop:12,fontSize:12,color:C.subtle}}>Keep going — save when you hit 1 minute</div>
            )}
          </div>
          {todaySessions.length>0&&(
            <div style={{textAlign:'center',fontSize:12,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              {todaySessions.length} session{todaySessions.length!==1?'s':''} today
              &nbsp;&middot;&nbsp;{fmtDur(todaySecs)} focused
              {streak>0&&<>&nbsp;&middot;&nbsp;<span style={{color:C.accent,fontWeight:600}}>{streak}-day streak</span></>}
            </div>
          )}
        </div>
      )}

      {weekSessions.length>0?(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'13px 18px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>This week</div>
          </div>
          <div style={{padding:'14px 18px'}}>
            <div style={{display:'flex',gap:28,flexWrap:'wrap',marginBottom:16}}>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:C.text}}>{fmtDur(weekSecs)}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>total focused</div>
              </div>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:C.text}}>{weekSessions.length}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:1}}>sessions</div>
              </div>
              {streak>1&&(
                <div>
                  <div style={{fontSize:22,fontWeight:800,color:C.accent}}>{streak}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:1}}>day streak</div>
                </div>
              )}
            </div>
            {bySubjectToday.length>0&&(
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Today — tap to explore</div>
                <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <DonutChart slices={bySubjectToday} selected={pieSelected} onSelect={setPieSelected} C={C} size={140}/>
                  <div style={{flex:1,minWidth:120}}>
                    {bySubjectToday.map(s=>(
                      <button key={s.id} onClick={()=>setPieSelected(pieSelected===s.id?null:s.id)}
                        style={{display:'flex',alignItems:'center',gap:8,width:'100%',
                          background:'transparent',border:'none',cursor:'pointer',
                          padding:'4px 0',textAlign:'left',
                          opacity:pieSelected&&pieSelected!==s.id?0.4:1,
                          transition:'opacity 0.2s'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                        <span style={{fontSize:12,color:C.text,flex:1,fontFamily:font}}>{s.name}</span>
                        <span style={{fontSize:11,color:C.muted,fontFamily:font}}>{fmtDur(s.secs)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Detail panel when segment selected */}
                {selDetail&&selSubjectObj&&(
                  <div style={{marginTop:14,background:C.card2,borderRadius:10,
                    padding:'12px 14px',border:`1px solid ${selSubjectObj.color}33`}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:700,color:selSubjectObj.color}}>{selSubjectObj.name}</span>
                      <button onClick={()=>setPieSelected(null)}
                        style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:14,padding:'0 4px'}}>✕</button>
                    </div>
                    <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap'}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{fmtDur(selDetail.totalSecs)}</div>
                        <div style={{fontSize:10,color:C.muted}}>all time</div>
                      </div>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{fmtDur(selDetail.weekSubSecs)}</div>
                        <div style={{fontSize:10,color:C.muted}}>this week</div>
                      </div>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:C.text}}>{selDetail.allSess.length}</div>
                        <div style={{fontSize:10,color:C.muted}}>sessions</div>
                      </div>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Last 7 days</div>
                    <div style={{display:'flex',gap:4,alignItems:'flex-end',height:44}}>
                      {selDetail.days.map((d,i)=>(
                        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                          <div style={{width:'100%',borderRadius:3,
                            background:d.secs>0?selSubjectObj.color:C.border,
                            height:d.secs>0?Math.max(4,Math.round((d.secs/selDetail.maxDay)*36)):4,
                            opacity:d.isToday?1:0.65,transition:'height 0.4s'}}/>
                          <div style={{fontSize:8,color:d.isToday?selSubjectObj.color:C.muted,fontWeight:d.isToday?700:400}}>
                            {d.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ):(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
          padding:'24px 20px',textAlign:'center'}}>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
            Complete a session to start tracking.<br/>
            Analytics appear once you finish your first session.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Spec topics per subject ────────────────────────────────────────────────
const SPEC_TOPICS = {
  maths:['Algebra & Functions','Coordinate Geometry','Sequences & Series','Trigonometry','Exponentials & Logarithms','Differentiation','Integration','Numerical Methods','Proof & Vectors','Statistical Sampling & Data','Probability','Statistical Distributions','Hypothesis Testing','Kinematics','Forces & Newton\'s Laws','Moments'],
  'further-maths':['Complex Numbers','Argand Diagrams & Loci','Matrices','Linear Transformations','Series (Σr, Σr², Σr³)','Roots of Polynomials','Proof by Induction','Volumes of Revolution','Vectors (3D)','Further Calculus','1st Order Differential Equations','2nd Order Differential Equations','Polar Coordinates','Hyperbolic Functions','Decision: Algorithms & Sorting','Decision: Graphs & Networks','Decision: Linear Programming','Decision: Critical Path Analysis','FM: Momentum & Impulse','FM: Work, Energy & Power','FM: Circular Motion','FS: Distributions & Hypothesis Testing'],
  cs:['Processors & Architecture','Software & Hardware','Boolean Logic & Gates','Memory & Storage','Networking & Protocols','Web Technologies','Databases (SQL)','Big Data','Functional Programming','Computational Thinking','Algorithms & Complexity','Data Structures','Theory of Computation','Regular Languages & Automata','Context-Free Languages','OOP & Software Development','Recursion & Higher-Order Functions'],
  chemistry:['Atomic Structure','Amount of Substance & Moles','Bonding','Energetics','Kinetics','Chemical Equilibria (Kc)','Redox Chemistry','Thermodynamics (Kp)','Rate Equations & Mechanisms','Electrode Potentials','Acids & Bases (pH, buffers)','Periodicity & Group 2','Group 7 (Halogens)','Transition Metals','Alkanes & Halogenoalkanes','Alkenes & Alcohols','Carbonyl Compounds','Aromatic Chemistry','Amines & Polymers','Amino Acids, DNA & NMR'],
  physics:['Measurements & Errors','Particles & Radiation','Waves','Quantities & Units','Kinematics','Forces & Newton\'s Laws','Work, Energy & Power','Materials','DC Electricity','Further Mechanics (Circular Motion)','Simple Harmonic Motion','Thermal Physics','Gravitational Fields','Electric Fields','Capacitance','Magnetic Fields','Electromagnetic Induction','Nuclear Physics','Optional Topic'],
  economics:['Supply & Demand','Elasticities (PED, YED, XED, PES)','Market Structures','Market Failure & Externalities','Government Intervention','Labour Markets','Macroeconomic Objectives','Aggregate Demand & Supply','Monetary Policy','Fiscal Policy','Supply-Side Policies','International Trade & Exchange Rates','Balance of Payments','Inequality & Poverty','Globalisation & Development'],
  biology:['Biological Molecules','Nucleic Acids & DNA Technology','Cell Structure & Division','Transport in Cells (membranes)','The Immune System','Exchange Surfaces','Mass Transport (blood, xylem, phloem)','DNA & Protein Synthesis','Regulation of Gene Expression','Respiration','Photosynthesis','Populations, Ecosystems & Succession','Inheritance & Selection','Responses & Nervous System','Hormonal Communication'],
  psychology:['Social Influence (conformity, obedience)','Memory (models, EWT, forgetting)','Attachment (types, explanations, deprivation)','Psychopathology (OCD, phobias, depression)','Approaches in Psychology','Biopsychology (nervous system, brain)','Research Methods (stats, design, ethics)','Issues & Debates (gender, culture, free will)','Optional Topic'],
  sociology:['Education (achievement, inequality)','Research Methods','Families & Households','Beliefs in Society','Global Development','Media','Power & Politics','Crime & Deviance','Social Stratification'],
  history:['Historical Context & Background','Key Events & Chronology','Key Individuals & Roles','Cause & Effect (short/long-term)','Continuity & Change','Historical Interpretations','Essay Structure & Argument','Source Analysis Skills'],
  geography:['Hazards (tectonic & atmospheric)','Coastal Systems & Landscapes','Glacial Systems & Landscapes','Ecosystems under Stress','Global Systems & Governance','Changing Places','Contemporary Urban Environments','Population & the Environment','Resource Security','Geographical Skills & Fieldwork'],
  'english-lit':['Paper 1 Novel/Prose Text','Paper 1 Poetry (pre-1900)','Paper 2 Drama Text','Paper 2 Prose Text','Comparative Essay Technique','Unseen Poetry Analysis','Contextual Factors & Interpretations','Critical Vocabulary & Close Reading','AO1: Argument & Expression','AO3: Connections across texts'],
  business:['Business Objectives & Strategy','Financial Statements & Ratios','Investment Appraisal','Marketing Strategies & Mix','Operations Management','HR Strategies (motivation, org. structure)','Corporate Strategy (Ansoff, Porter)','External Influences (PESTLE)','Globalisation & Business','Case Study Analysis Skills'],
};

// ── RAG Tracker (Resources) ────────────────────────────────────────────────
const RAG = [
  {k:'red',   label:'Need Work',     color:'#ef4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.28)' },
  {k:'amber', label:'Getting There', color:'#f97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.28)'},
  {k:'green', label:'Confident',     color:'#22c55e', bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.28)' },
];

function Resources({subjects,uid,C,font,rag,setRag,ragNotes,setRagNotes}) {
  const [view,       setView]      = useState('status');
  const [selSubject, setSelSubject] = useState(subjects[0]?.id??'');
  const [hovered,    setHovered]   = useState(null);
  const [expandedNote, setExpandedNote] = useState(null); // `${sid}_${i}`

  const setStatus = (sid,i,st) => {
    const k=`${sid}_${i}`;
    const next={...rag};
    if(next[k]===st) delete next[k]; else next[k]=st;
    setRag(next);
  };

  const setNote = (sid,i,text) => {
    const k=`${sid}_${i}`;
    setRagNotes(prev=>{ const next={...prev}; if(text.trim()) next[k]=text; else delete next[k]; return next; });
  };

  const allTopics = subjects.flatMap(s=>
    (SPEC_TOPICS[s.id]||[]).map((topic,i)=>({topic,i,s,status:rag[`${s.id}_${i}`]||null}))
  );
  const counts = {
    red:   allTopics.filter(t=>t.status==='red').length,
    amber: allTopics.filter(t=>t.status==='amber').length,
    green: allTopics.filter(t=>t.status==='green').length,
    unset: allTopics.filter(t=>!t.status).length,
  };
  const total = allTopics.length;

  const TopicRow = ({topic,i,s,showSubject}) => {
    const k   = `${s.id}_${i}`;
    const st  = rag[k]||null;
    const note= ragNotes?.[k]||'';
    const ragCfg = RAG.find(r=>r.k===st);
    const noteOpen = expandedNote===k;
    return (
      <div style={{borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',
          background:ragCfg?ragCfg.bg:'transparent'}}>
          <div style={{width:3,alignSelf:'stretch',minHeight:20,borderRadius:2,background:s.color,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            {showSubject&&<div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:0.4,marginBottom:1}}>{s.name}</div>}
            <div style={{fontSize:13,color:C.text,lineHeight:1.4}}>{topic}</div>
            {note&&!noteOpen&&<div style={{fontSize:11,color:C.muted,marginTop:2,fontStyle:'italic',
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:220}}>{note}</div>}
          </div>
          <div style={{display:'flex',gap:4,flexShrink:0,alignItems:'center'}}>
            <button onClick={()=>setExpandedNote(noteOpen?null:k)} title="Add note"
              style={{width:28,height:28,borderRadius:6,cursor:'pointer',
                border:`2px solid ${note?C.accent:C.border}`,
                background:note?C.accentSoft:'transparent',
                color:note?C.accent:C.subtle,
                fontSize:11,fontWeight:700,fontFamily:font,
                transition:'background 0.1s,border-color 0.1s,color 0.1s'}}>
              ✎
            </button>
            {RAG.map(r=>{
              const active  = st===r.k;
              const isHover = hovered===`${k}_${r.k}`;
              return (
                <button key={r.k}
                  onClick={()=>setStatus(s.id,i,r.k)}
                  onMouseEnter={()=>setHovered(`${k}_${r.k}`)}
                  onMouseLeave={()=>setHovered(null)}
                  title={r.label}
                  style={{width:28,height:28,borderRadius:6,cursor:'pointer',
                    border:`2px solid ${(active||isHover)?r.color:C.border}`,
                    background: active ? r.color : isHover ? `${r.color}22` : 'transparent',
                    color: active ? '#fff' : isHover ? r.color : C.muted,
                    fontSize:10,fontWeight:800,fontFamily:font,
                    transition:'background 0.1s,border-color 0.1s,color 0.1s'}}>
                  {r.k[0].toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
        {noteOpen&&(
          <div style={{padding:'0 14px 10px 30px',background:ragCfg?ragCfg.bg:'transparent'}}>
            <textarea
              value={note}
              onChange={e=>setNote(s.id,i,e.target.value)}
              placeholder="Add a note (key formula, weak spot, resource link…)"
              rows={2}
              style={{width:'100%',boxSizing:'border-box',padding:'7px 10px',
                background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:7,color:C.text,fontSize:12,fontFamily:font,
                resize:'vertical',outline:'none',lineHeight:1.5}}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:0.6,textTransform:'uppercase',marginBottom:4}}>Resources</div>
        <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:0}}>RAG Tracker</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Rate every spec topic Red, Amber, or Green so you know exactly where to focus.</p>
      </div>

      {/* Summary bar */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 18px',marginBottom:12}}>
        <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
          {[...RAG,{k:'unset',label:'Unrated',color:C.muted,bg:'transparent',border:C.border}].map(r=>(
            <div key={r.k} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:r.color,flexShrink:0}}/>
              <span style={{fontSize:12,color:r.color,fontWeight:700}}>{counts[r.k]}</span>
              <span style={{fontSize:12,color:C.muted}}>{r.label}</span>
            </div>
          ))}
        </div>
        {/* Stacked proportion bar */}
        <div style={{height:8,borderRadius:4,background:C.border,overflow:'hidden',display:'flex'}}>
          {RAG.map(r=>{
            const w = total?Math.round((counts[r.k]/total)*100):0;
            return w>0?(
              <div key={r.k} style={{height:'100%',width:`${w}%`,background:r.color,transition:'width 0.4s ease'}}/>
            ):null;
          })}
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:5}}>
          {total-counts.unset} of {total} topics rated
        </div>
      </div>

      {/* View toggle */}
      <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
        {[{v:'status',l:'By Status'},{v:'subject',l:'By Subject'},{v:'papers',l:'Paper Bank'}].map(({v,l})=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'6px 14px',borderRadius:7,border:`1px solid ${view===v?C.accent:C.border}`,
              background:view===v?C.accentSoft:'transparent',
              color:view===v?C.accent:C.muted,
              fontSize:12,fontWeight:view===v?700:400,fontFamily:font,cursor:'pointer'}}>
            {l}
          </button>
        ))}
      </div>

      {view==='status' ? (
        /* ── Grouped by RAG status ─────────────────────────────────────── */
        <div>
          {RAG.map(r=>{
            const items = allTopics.filter(t=>t.status===r.k);
            return (
              <div key={r.k} style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:r.color}}/>
                  <span style={{fontSize:11,fontWeight:700,color:r.color,textTransform:'uppercase',letterSpacing:0.5}}>{r.label}</span>
                  <span style={{fontSize:11,color:C.muted}}>({items.length})</span>
                </div>
                {items.length===0?(
                  <div style={{fontSize:13,color:C.muted,padding:'10px 14px',
                    background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
                    No topics here yet — rate them below.
                  </div>
                ):(
                  <div style={{background:C.surface,border:`1px solid ${r.border}`,borderRadius:10,overflow:'hidden'}}>
                    {items.map(({topic,i,s})=>(
                      <TopicRow key={`${s.id}_${i}`} topic={topic} i={i} s={s} showSubject={true}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Unrated section */}
          {counts.unset>0&&(
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:C.border}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Not Yet Rated</span>
                <span style={{fontSize:11,color:C.muted}}>({counts.unset})</span>
              </div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
                {allTopics.filter(t=>!t.status).map(({topic,i,s})=>(
                  <TopicRow key={`${s.id}_${i}`} topic={topic} i={i} s={s} showSubject={true}/>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── By Subject: dropdown picker + topic list ──────────────────── */
        <div>
          {/* Subject dropdown */}
          {(()=>{
            const sel = subjects.find(s=>s.id===selSubject)||subjects[0];
            const topics = SPEC_TOPICS[sel?.id]||[];
            const subjCounts={red:0,amber:0,green:0};
            topics.forEach((_,i)=>{const st=rag[`${sel.id}_${i}`]; if(st)subjCounts[st]++;});
            const unrated = topics.length - Object.values(subjCounts).reduce((a,b)=>a+b,0);
            return (
              <div>
                {/* Dropdown */}
                <select value={selSubject} onChange={e=>setSelSubject(e.target.value)}
                  style={{width:'100%',background:C.surface,border:`1px solid ${sel?.color||C.accent}55`,
                    borderLeft:`4px solid ${sel?.color||C.accent}`,
                    borderRadius:10,padding:'11px 14px',color:C.text,fontSize:14,
                    fontWeight:700,fontFamily:font,outline:'none',cursor:'pointer',
                    appearance:'none',WebkitAppearance:'none',marginBottom:10,
                    boxShadow:`0 2px 8px rgba(0,0,0,0.06)`}}>
                  {subjects.map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* RAG mini-summary for selected subject */}
                <div style={{display:'flex',gap:10,marginBottom:10,padding:'8px 14px',
                  background:C.surface,border:`1px solid ${C.border}`,borderRadius:8}}>
                  {RAG.map(r=>(
                    <div key={r.k} style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:r.color}}/>
                      <span style={{fontSize:12,color:r.color,fontWeight:700}}>{subjCounts[r.k]}</span>
                      <span style={{fontSize:11,color:C.muted}}>{r.label}</span>
                    </div>
                  ))}
                  <span style={{fontSize:11,color:C.muted,marginLeft:'auto'}}>{unrated} unrated</span>
                </div>

                {/* Topic list for selected subject */}
                {topics.length===0?(
                  <div style={{padding:'14px',fontSize:13,color:C.muted,background:C.surface,
                    border:`1px solid ${C.border}`,borderRadius:10}}>No topics defined for this subject.</div>
                ):(
                  <div style={{background:C.surface,border:`1px solid ${sel?.color||C.border}33`,
                    borderLeft:`3px solid ${sel?.color||C.accent}`,borderRadius:10,overflow:'hidden'}}>
                    {topics.map((topic,i)=>(
                      <TopicRow key={i} topic={topic} i={i} s={sel} showSubject={false}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Paper Bank ──────────────────────────────────────────────────── */}
      {view==='papers'&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:4}}>
            Official past paper collections for your subjects. Links open the board's assessment resources page and Physics & Maths Tutor (PMT).
          </div>
          {subjects.map(s=>{
            const bank = (PAPER_BANK[s.id]||{})[s.boardId];
            return (
              <div key={s.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                borderLeft:`3px solid ${s.color}`,borderRadius:10,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</div>
                  <div style={{fontSize:11,color:s.color,fontWeight:600,background:`${s.color}14`,
                    border:`1px solid ${s.color}33`,borderRadius:4,padding:'1px 7px'}}>{s.board}</div>
                </div>
                {bank ? (
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <a href={bank.pmt} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 13px',
                        background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:7,
                        color:C.accent,fontSize:12,fontWeight:600,textDecoration:'none',
                        fontFamily:font,transition:'background 0.12s'}}>
                      PMT Paper Bank ↗
                    </a>
                    <a href={bank.board} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 13px',
                        background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                        color:C.muted,fontSize:12,fontWeight:600,textDecoration:'none',
                        fontFamily:font}}>
                      Official board page ↗
                    </a>
                  </div>
                ):(
                  <div style={{fontSize:12,color:C.subtle}}>
                    No direct link available — search "{s.name} {s.board} past papers" on the board's website.
                  </div>
                )}
              </div>
            );
          })}
          <div style={{fontSize:11,color:C.subtle,marginTop:4,lineHeight:1.7}}>
            Always verify mark schemes and grade boundaries on the official board site. Links were last checked May 2026 — boards occasionally restructure their pages.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account ────────────────────────────────────────────────────────────────
function Account({user,subjects,uid,dark,setDark,onSignOut,onResetSubjects,C,font,examSched,scores=[],rag={},isPro=false,stripeCustomerId=null,referralCode=null}) {
  const [analyticsConsent, setAnalyticsConsent] = useState(()=>ls.get(`rbp_analytics_${uid}`,true));
  const [emailSending, setEmailSending] = useState(false);
  const [emailState, setEmailState] = useState('idle'); // 'idle'|'sent'|'error'
  const [emailMsg, setEmailMsg] = useState('');
  const [digestSending, setDigestSending] = useState(false);
  const [digestState, setDigestState] = useState('idle'); // 'idle'|'sent'|'error'
  const [digestMsg, setDigestMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const upgraded = typeof window!=='undefined' && new URLSearchParams(window.location.search).get('upgraded')==='1';

  const [schoolName, setSchoolName] = useState('');
  const [schoolOptIn, setSchoolOptIn] = useState(false);
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [referralCount, setReferralCount] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(()=>{
    if (!uid||uid==='anon') return;
    supabase.from('user_profiles').select('school_name,school_opt_in').eq('id',uid).single()
      .then(({data})=>{
        if (data) { setSchoolName(data.school_name||''); setSchoolOptIn(!!data.school_opt_in); }
      });
    if (!referralCode) return;
    supabase.auth.getSession().then(({data:{session}})=>{
      if (!session) return;
      fetch('/api/referral',{headers:{Authorization:`Bearer ${session.access_token}`}})
        .then(r=>r.json()).then(d=>{ if (d.count!=null) setReferralCount(d.count); }).catch(()=>{});
    });
  },[uid,referralCode]);

  const saveSchool = async (name, optIn) => {
    setSchoolSaving(true);
    await supabase.from('user_profiles').update({school_name:name||null,school_opt_in:optIn}).eq('id',uid);
    setSchoolSaving(false);
  };

  const copyReferralLink = () => {
    const link=`https://beattheexam.org?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(()=>{
      setCopySuccess(true);
      setTimeout(()=>setCopySuccess(false),2000);
    }).catch(()=>{});
  };

  const sendSchedule = async () => {
    if (!user?.email) return;
    setEmailSending(true); setEmailState('idle'); setEmailMsg('');
    const today = new Date().toISOString().split('T')[0];
    const exams = subjects.flatMap(s =>
      getSubjectExams(examSched, s.id, s.boardId).map(e => ({ subject: s.name, ...e }))
    ).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    try {
      const r = await fetch('/api/send-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, exams }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setEmailState('sent');
    } catch (err) {
      setEmailState('error'); setEmailMsg(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const sendDigest = async () => {
    if (!user?.email) return;
    setDigestSending(true); setDigestState('idle'); setDigestMsg('');
    try {
      const r = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, scores, subjects: subjects.map(s=>({id:s.id,name:s.name,color:s.color,board:s.board})), rag }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setDigestState('sent');
    } catch (err) {
      setDigestState('error'); setDigestMsg(err.message);
    } finally {
      setDigestSending(false);
    }
  };

  const toggleConsent = async (v) => {
    setAnalyticsConsent(v);
    ls.set(`rbp_analytics_${uid}`, v);
    if (isSupabaseConfigured()) {
      await supabase.from('analytics_consent')
        .upsert({user_id:uid, opted_in:v, updated_at:new Date().toISOString()},
          {onConflict:'user_id'});
    }
  };

  const handleUpgrade = async () => {
    if (!user?.email) return;
    setUpgrading(true); setUpgradeError('');
    try {
      const r = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({userId:uid, email:user.email, customerId:stripeCustomerId||undefined}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      window.location.href = d.url;
    } catch(err) {
      setUpgradeError(err.message);
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const r = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({customerId:stripeCustomerId}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      window.location.href = d.url;
    } catch(err) {
      setUpgradeError(err.message);
      setPortalLoading(false);
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {upgraded&&!isPro&&(
        <div style={{background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.2)',
          borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'flex-start',gap:10}}>
          <span style={{fontSize:18,lineHeight:1,flexShrink:0}}>🎉</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.success,marginBottom:3}}>Payment received!</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Your Pro access is activating — refresh the page in a moment to unlock all Pro features.</div>
          </div>
        </div>
      )}

      <div style={{background:isPro?'linear-gradient(135deg,rgba(194,124,96,0.08),rgba(251,191,36,0.06))':C.card,
        border:`1px solid ${isPro?C.accent+'55':C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:isPro?12:0}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>
            Battle Plan {isPro?<span style={{color:C.accent}}>Pro</span>:'Free'}
          </div>
          {isPro&&(
            <div style={{fontSize:10,fontWeight:800,color:'#fbbf24',background:'rgba(251,191,36,0.12)',
              border:'1px solid rgba(251,191,36,0.25)',borderRadius:4,padding:'2px 8px',letterSpacing:0.5}}>
              PRO ✓
            </div>
          )}
        </div>
        {isPro?(
          <>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
              You have access to all Pro features — email reports, companion chat, and priority updates.
            </div>
            <button onClick={handleManageBilling} disabled={portalLoading||!stripeCustomerId}
              style={{padding:'9px 16px',background:'transparent',border:`1px solid ${C.border}`,
                borderRadius:8,color:C.muted,fontSize:12,fontWeight:600,fontFamily:font,
                cursor:portalLoading||!stripeCustomerId?'not-allowed':'pointer'}}>
              {portalLoading?'Opening…':'Manage subscription'}
            </button>
          </>
        ):(
          <>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginTop:10,marginBottom:14}}>
              Upgrade to Pro to unlock email reports, companion chat, and more — supporting ongoing development.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
              {['Email exam schedule & weekly digest','Companion chat','Priority feature access'].map(f=>(
                <div key={f} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:C.muted}}>
                  <span style={{color:C.accent,fontSize:11}}>✓</span>{f}
                </div>
              ))}
            </div>
            {upgradeError&&(
              <div style={{fontSize:12,color:C.danger,marginBottom:10,lineHeight:1.5}}>{upgradeError}</div>
            )}
            <button onClick={handleUpgrade} disabled={upgrading||!user}
              style={{width:'100%',padding:'11px',
                background:upgrading?C.card2:C.accent,
                border:`1px solid ${upgrading?C.border:C.accent}`,borderRadius:8,
                color:upgrading?C.muted:'#fff',fontSize:14,fontWeight:700,fontFamily:font,
                cursor:upgrading||!user?'not-allowed':'pointer',transition:'background 0.15s'}}>
              {upgrading?'Redirecting to checkout…':'Upgrade to Pro — £4.99/mo'}
            </button>
          </>
        )}
      </div>

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

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>Research contribution</div>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>Share anonymised data with universities</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Your scores are aggregated and anonymised — never individual — to help universities understand how students revise. You can opt out at any time.
            </div>
          </div>
          <button onClick={()=>toggleConsent(!analyticsConsent)}
            style={{flexShrink:0,width:44,height:24,borderRadius:12,padding:0,
              background:analyticsConsent?C.accent:C.border,border:'none',cursor:'pointer',
              position:'relative',transition:'background 0.2s'}}>
            <div style={{position:'absolute',top:3,width:18,height:18,borderRadius:'50%',
              background:'#fff',transition:'left 0.2s',
              left:analyticsConsent?23:3}}/>
          </button>
        </div>
      </div>

      {user && (
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px',position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Exam schedule email</div>
          {!isPro&&<span style={{fontSize:10,fontWeight:700,color:C.accent,background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:4,padding:'1px 6px',letterSpacing:0.3}}>PRO</span>}
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Send your full exam timetable to <span style={{color:C.text,fontWeight:500}}>{user.email}</span>.
        </div>
        {!isPro?(
          <button onClick={handleUpgrade} disabled={upgrading}
            style={{width:'100%',padding:'10px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
              borderRadius:8,color:C.accent,fontSize:13,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
            {upgrading?'Redirecting…':'Unlock with Pro'}
          </button>
        ):(
          <>
            {emailState==='sent'&&(
              <div style={{background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.2)',
                borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:C.success}}>
                Sent — check your inbox.
              </div>
            )}
            {emailState==='error'&&(
              <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:C.danger,lineHeight:1.6}}>
                {emailMsg?.includes('Sender not verified')
                  ? <>Domain not verified. Go to <b>resend.com/domains</b>, add <b>beattheexam.org</b>, add the DNS records, then set <b>RESEND_FROM</b> in Vercel env vars.</>
                  : (emailMsg||'Email service not available yet.')}
              </div>
            )}
            <button onClick={sendSchedule} disabled={emailSending||emailState==='sent'}
              style={{width:'100%',padding:'10px',
                background:emailState==='sent'?C.card2:C.accentSoft,
                border:`1px solid ${emailState==='sent'?C.border:C.accent}`,
                borderRadius:8,color:emailState==='sent'?C.muted:C.accent,
                fontSize:13,fontWeight:600,fontFamily:font,
                cursor:emailSending||emailState==='sent'?'not-allowed':'pointer',
                transition:'background 0.15s'}}>
              {emailSending?'Sending…':emailState==='sent'?'Sent ✓':'Email me my schedule'}
            </button>
          </>
        )}
      </div>
      )}

      {user && (
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Weekly progress digest</div>
          {!isPro&&<span style={{fontSize:10,fontWeight:700,color:C.accent,background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:4,padding:'1px 6px',letterSpacing:0.3}}>PRO</span>}
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Get a summary of this week's papers, scores, readiness, and RAG status sent to <span style={{color:C.text,fontWeight:500}}>{user.email}</span>.
        </div>
        {!isPro?(
          <button onClick={handleUpgrade} disabled={upgrading}
            style={{width:'100%',padding:'11px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
              borderRadius:8,color:C.accent,fontSize:13,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
            {upgrading?'Redirecting…':'Unlock with Pro'}
          </button>
        ):(
          <>
            {digestState==='sent'&&(
              <div style={{background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.2)',
                borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:C.success}}>
                Digest sent — check your inbox.
              </div>
            )}
            {digestState==='error'&&(
              <div style={{background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:C.danger}}>
                {digestMsg||'Failed to send. Try again.'}
              </div>
            )}
            <button onClick={sendDigest} disabled={digestSending||digestState==='sent'}
              style={{width:'100%',padding:'11px',
                background:digestState==='sent'?C.card2:C.accentSoft,
                border:`1px solid ${digestState==='sent'?C.border:C.accent}`,
                borderRadius:8,color:digestState==='sent'?C.muted:C.accent,
                fontSize:13,fontWeight:600,fontFamily:font,
                cursor:digestSending||digestState==='sent'?'not-allowed':'pointer',
                transition:'background 0.15s'}}>
              {digestSending?'Sending…':digestState==='sent'?'Sent ✓':'Email me weekly digest'}
            </button>
          </>
        )}
      </div>
      )}

      {/* Referral */}
      {referralCode&&(
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Refer a friend</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Share Battle Plan with a friend. Send them your link — when they sign up, they'll be linked to you on the leaderboard automatically.
        </div>
        <div style={{display:'flex',gap:8,marginBottom:referralCount!==null?10:0}}>
          <div style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,
            padding:'9px 12px',fontSize:12,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
            fontFamily:"'JetBrains Mono',monospace"}}>
            beattheexam.org?ref={referralCode}
          </div>
          <button onClick={copyReferralLink}
            style={{flexShrink:0,padding:'9px 16px',background:copySuccess?'rgba(74,222,128,0.1)':C.accentSoft,
              border:`1px solid ${copySuccess?'rgba(74,222,128,0.3)':C.accent}44`,borderRadius:8,
              color:copySuccess?C.success:C.accent,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer',
              transition:'all 0.15s'}}>
            {copySuccess?'Copied!':'Copy link'}
          </button>
        </div>
        {referralCount!==null&&(
          <div style={{fontSize:12,color:C.subtle}}>
            {referralCount===0?'No referrals yet — share your link to get started.'
              :`${referralCount} friend${referralCount!==1?'s':''} joined via your link`}
          </div>
        )}
      </div>
      )}

      {/* School leaderboard opt-in */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>School leaderboard</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Enter your school name and opt in to appear on the anonymous school leaderboard in the Friends tab. Only your school's average score is visible — never individual data.
        </div>
        <input
          value={schoolName}
          onChange={e=>setSchoolName(e.target.value)}
          placeholder="Your school name"
          maxLength={80}
          style={{width:'100%',boxSizing:'border-box',background:C.card2,border:`1px solid ${C.border}`,
            borderRadius:8,padding:'10px 12px',color:C.text,fontSize:13,fontFamily:font,
            outline:'none',marginBottom:10}}
        />
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:13,color:C.text}}>Show on school leaderboard</div>
          <button onClick={()=>setSchoolOptIn(v=>!v)}
            style={{flexShrink:0,width:44,height:24,borderRadius:12,padding:0,
              background:schoolOptIn?C.accent:C.border,border:'none',cursor:'pointer',
              position:'relative',transition:'background 0.2s'}}>
            <div style={{position:'absolute',top:3,width:18,height:18,borderRadius:'50%',
              background:'#fff',transition:'left 0.2s',left:schoolOptIn?23:3}}/>
          </button>
        </div>
        <button onClick={()=>saveSchool(schoolName,schoolOptIn)} disabled={schoolSaving}
          style={{width:'100%',padding:'10px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
            borderRadius:8,color:C.accent,fontSize:13,fontWeight:600,fontFamily:font,
            cursor:schoolSaving?'not-allowed':'pointer'}}>
          {schoolSaving?'Saving…':'Save school settings'}
        </button>
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

// ── Landing page ───────────────────────────────────────────────────────────
function LandingPage({ onGetStarted }) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
  const mono = "'JetBrains Mono','SF Mono',monospace";
  const C = T.dark;

  const FEATURES = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      title: 'Past paper tracker',
      desc: 'Log every paper you do. See your actual grade using official mark-scheme boundaries — not rough percentages.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      title: 'Error pattern analysis',
      desc: 'Tag every mistake by type. See which topics keep coming up. Fix the patterns before the exam — not after.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      title: 'Exam countdown',
      desc: 'See exactly how many days until each paper, across every subject and board — all in one place.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
      title: 'Battle Readiness score',
      desc: 'A single number that tells you how prepared you actually are. Updated every time you log a paper.',
    },
  ];

  const TRUST = ['Free — no credit card', 'Works on mobile', 'No ads', 'Made by an A-level student'];

  return (
    <div style={{minHeight:'100vh', background:C.bg, fontFamily:font, color:C.text}}>

      {/* Nav */}
      <nav style={{position:'fixed', top:0, left:0, right:0, zIndex:100,
        background:'rgba(13,15,20,0.92)', backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)', borderBottom:`1px solid ${C.border}`,
        height:54, display:'flex', alignItems:'center', padding:'0 20px',
        justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:28, height:28, borderRadius:7, background:C.accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:mono, fontWeight:900, fontSize:12, color:'#fff'}}>A*</div>
          <span style={{fontSize:15, fontWeight:700, color:C.text, letterSpacing:0.2}}>Battle Plan</span>
        </div>
        <button onClick={onGetStarted}
          style={{padding:'7px 16px', background:'transparent', border:`1px solid ${C.border}`,
            borderRadius:7, color:C.muted, fontSize:13, fontWeight:600,
            fontFamily:font, cursor:'pointer', letterSpacing:0.2}}>
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <section style={{maxWidth:680, margin:'0 auto', padding:'120px 24px 64px',
        textAlign:'center'}}>
        <div style={{display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px',
          borderRadius:20, background:'rgba(181,115,90,0.1)', border:`1px solid rgba(181,115,90,0.25)`,
          fontSize:12, fontWeight:600, color:C.accent, marginBottom:28, letterSpacing:0.3}}>
          Free during beta
        </div>
        <h1 style={{fontSize:'clamp(36px, 7vw, 60px)', fontWeight:800, lineHeight:1.1,
          color:C.text, margin:'0 0 20px', letterSpacing:'-0.02em'}}>
          Know exactly where<br/>
          <span style={{color:C.accent}}>you're losing marks.</span>
        </h1>
        <p style={{fontSize:'clamp(15px, 2.5vw, 19px)', color:C.muted, lineHeight:1.7,
          margin:'0 auto 36px', maxWidth:520}}>
          Free A-level revision tracker. Log past papers, track your grade trajectory,
          and fix weak topics before exam day.
        </p>
        <button onClick={onGetStarted}
          style={{display:'inline-flex', alignItems:'center', gap:8, padding:'15px 32px',
            background:C.accent, border:'none', borderRadius:10, color:'#fff',
            fontSize:16, fontWeight:700, fontFamily:font, cursor:'pointer',
            letterSpacing:0.2, boxShadow:`0 0 40px rgba(181,115,90,0.3)`}}>
          Get started — it's free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
        <div style={{display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap',
          marginTop:20}}>
          {TRUST.map(t => (
            <span key={t} style={{fontSize:12, color:C.subtle, display:'flex',
              alignItems:'center', gap:5}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{maxWidth:800, margin:'0 auto', padding:'0 24px 80px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))',
          gap:12}}>
          {FEATURES.map(f => (
            <div key={f.title} style={{background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, padding:'20px 22px', display:'flex', gap:14,
              alignItems:'flex-start'}}>
              <div style={{width:36, height:36, borderRadius:8, background:'rgba(181,115,90,0.1)',
                border:`1px solid rgba(181,115,90,0.2)`, display:'flex', alignItems:'center',
                justifyContent:'center', color:C.accent, flexShrink:0}}>
                {f.icon}
              </div>
              <div>
                <div style={{fontSize:14, fontWeight:700, color:C.text, marginBottom:5}}>{f.title}</div>
                <div style={{fontSize:13, color:C.muted, lineHeight:1.6}}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA strip */}
      <section style={{borderTop:`1px solid ${C.border}`, padding:'40px 24px',
        textAlign:'center', background:'rgba(255,255,255,0.015)'}}>
        <div style={{fontSize:11, fontWeight:700, color:C.muted, letterSpacing:0.5,
          textTransform:'uppercase', marginBottom:12}}>Exams are in weeks. Start now.</div>
        <button onClick={onGetStarted}
          style={{display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px',
            background:'transparent', border:`1px solid ${C.accent}`,
            borderRadius:8, color:C.accent, fontSize:15, fontWeight:600,
            fontFamily:font, cursor:'pointer'}}>
          Set up your account — 2 minutes
        </button>
        <div style={{marginTop:20, fontSize:12, color:C.subtle}}>
          Supports AQA · Edexcel · OCR · WJEC · All major A-level subjects
        </div>
      </section>

    </div>
  );
}

// ── Quick log modal ────────────────────────────────────────────────────────
function QuickLog({subjects,scores,setScores,uid,C,font,onClose,onSaved}){
  ensureAnimStyles();
  const PAPER_SUGGS=Object.fromEntries(subjects.map(s=>[s.name,getPaperSuggestions(s)]));
  const GRADE_BOUNDS=Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
  const subjectObj=s=>subjects.find(x=>x.name===s);

  const [subject,setSubject]=useState(subjects[0]?.name??'');
  const [pct,setPct]=useState('');
  const [paper,setPaper]=useState('');
  const [saved,setSaved]=useState(false);
  const [savedGrade,setSavedGrade]=useState(null);
  const [improvement,setImprovement]=useState(null);
  const [tip,setTip]=useState(null);

  const subjectDone=s=>new Set(scores.filter(x=>x.subject===s).map(x=>x.paper));
  const allPapers=PAPER_SUGGS[subject]||[];
  const suggested=allPapers.find(p=>!subjectDone(subject).has(p))??allPapers[0]??'';

  useEffect(()=>{setPaper(suggested);},[subject]);

  const numPct=pct===''?NaN:parseInt(pct,10);
  const valid=!isNaN(numPct)&&numPct>=0&&numPct<=100;
  const sId=subjectObj(subject)?.id??'';

  const histGrade=valid&&paper?getHistoricalGrade(numPct,paper):null;
  const notGrade=valid?getNotionalGrade(numPct,sId):null;
  const fallbackGrade=valid?getSubjectGrade(numPct,subject,GRADE_BOUNDS):null;
  const displayGrade=histGrade||notGrade||fallbackGrade;

  const histThresh=paper?getHistoricalThreshold('A*',paper):null;
  const notThresh=getNotionalThreshold('A*',sId);
  const {name:paperBase,year:paperYear}=parsePaperKey(paper||'');
  const hasHistData=paperYear&&HISTORICAL_GRADE_PCT[paperBase]?.[paperYear];

  const prevBest=()=>{
    const prev=scores.filter(s=>s.subject===subject&&s.paper===paper);
    return prev.length?Math.max(...prev.map(s=>s.pct)):null;
  };

  const save=()=>{
    if(!valid) return;
    const gb=Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
    const grade=getSubjectGrade(numPct,subject,gb);
    const pb=prevBest();
    let imp=null;
    if(pb!==null){
      const prevGrade=getSubjectGrade(pb,subject,gb);
      const GRADES=['U','E','D','C','B','A','A*'];
      if(GRADES.indexOf(grade)>GRADES.indexOf(prevGrade)) imp={from:prevGrade,to:grade};
    }
    const entry={subject,
      paper:paper.trim()||`Quick log ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`,
      got:numPct,max:100,maxMark:100,pct:numPct,grade,
      date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
      id:Date.now(),ts:Date.now()};
    const updated=[entry,...scores];
    setScores(updated); ls.set(`rbp_scores_${uid}`,updated);
    setSavedGrade(grade); setImprovement(imp); setSaved(true);
    if(onSaved) onSaved(entry,imp);
    // pick a random technique tip for the saved subject
    const subObj = subjects.find(s=>s.name===subject);
    if(subObj?.techniques?.length) {
      const t=subObj.techniques[Math.floor(Math.random()*subObj.techniques.length)];
      setTip(t);
    }
  };

  const gradeGlow=g=>{
    const map={'A*':'0 0 20px rgba(251,191,36,0.6)','A':'0 0 16px rgba(74,222,128,0.5)','B':'0 0 14px rgba(251,191,36,0.35)',
               '9':'0 0 20px rgba(251,191,36,0.6)','8':'0 0 16px rgba(74,222,128,0.5)','7':'0 0 14px rgba(251,191,36,0.35)'};
    return map[g]??undefined;
  };

  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',
        display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:C.surface,borderRadius:'20px 20px 0 0',
        padding:'20px 20px 40px',width:'100%',maxWidth:500,
        boxShadow:'0 -8px 40px rgba(0,0,0,0.4)'}}>
        {saved?(
          <div style={{textAlign:'center',padding:'32px 0',position:'relative',overflow:'hidden'}}>
            {/* Aura ring */}
            <div style={{position:'absolute',top:'50%',left:'50%',width:120,height:120,
              borderRadius:'50%',border:`3px solid ${gradeColor(savedGrade||'A')}`,
              animation:'rbp-aura-ring 1s ease-out forwards',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:'50%',left:'50%',width:80,height:80,
              borderRadius:'50%',border:`2px solid ${gradeColor(savedGrade||'A')}88`,
              animation:'rbp-aura-ring 1s 0.15s ease-out forwards',pointerEvents:'none'}}/>
            <div style={{fontSize:48,marginBottom:8,animation:'rbp-check-in 0.5s cubic-bezier(.34,1.56,.64,1) forwards',
              display:'inline-block'}}>✓</div>
            <div style={{fontSize:20,fontWeight:800,color:'#22c55e',marginBottom:8}}>Logged!</div>
            {savedGrade&&(
              <div style={{fontSize:36,fontWeight:900,color:gradeColor(savedGrade),
                animation:'rbp-grade-pop 0.5s 0.2s cubic-bezier(.34,1.56,.64,1) both',
                textShadow:gradeGlow(savedGrade)}}>
                {savedGrade}
              </div>
            )}
            {improvement&&(
              <div style={{marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                animation:'rbp-improve-fly 1.5s 0.5s ease-out both'}}>
                <span style={{fontSize:14,color:C.muted,textDecoration:'line-through'}}>{improvement.from}</span>
                <span style={{fontSize:16}}>→</span>
                <span style={{fontSize:16,fontWeight:800,color:gradeColor(improvement.to)}}>{improvement.to}</span>
                <span style={{fontSize:12,color:'#22c55e',fontWeight:600}}>Grade up!</span>
              </div>
            )}
            {tip&&(
              <div style={{marginTop:20,padding:'14px 16px',background:C.card2,
                borderRadius:10,border:`1px solid ${C.border}`,textAlign:'left'}}>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',
                  letterSpacing:0.5,marginBottom:6}}>Quick tip:</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{tip.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{tip.body}</div>
              </div>
            )}
            <button onClick={onClose}
              style={{marginTop:18,width:'100%',padding:'12px',background:C.accent,border:'none',
                borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer'}}>
              Done
            </button>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontSize:16,fontWeight:700,color:C.text}}>Quick log</div>
              <button onClick={onClose} style={{background:'transparent',border:'none',color:C.muted,fontSize:26,cursor:'pointer',lineHeight:1,padding:0}}>×</button>
            </div>

            {/* Subject dropdown */}
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Subject</div>
            <select value={subject} onChange={e=>setSubject(e.target.value)}
              style={{width:'100%',background:C.card2,border:`1px solid ${C.border}`,
                borderRadius:10,padding:'12px 14px',color:C.text,fontSize:14,fontWeight:600,
                fontFamily:font,outline:'none',cursor:'pointer',
                appearance:'none',WebkitAppearance:'none',
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',
                paddingRight:36,marginBottom:16}}>
              {subjects.map(s=>(
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            {/* Paper dropdown */}
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Paper</div>
            <select value={paper} onChange={e=>setPaper(e.target.value)}
              style={{width:'100%',background:C.card2,border:`1px solid ${C.border}`,
                borderRadius:10,padding:'12px 14px',color:C.text,fontSize:13,fontWeight:500,
                fontFamily:font,outline:'none',cursor:'pointer',
                appearance:'none',WebkitAppearance:'none',
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',
                paddingRight:36,marginBottom:16}}>
              {allPapers.map(p=>{
                const done=subjectDone(subject).has(p);
                return <option key={p} value={p}>{done?'✓ ':''}{p}</option>;
              })}
            </select>

            {/* Score input */}
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Score (%)</div>
            <div style={{position:'relative',marginBottom:14}}>
              <input type="number" min="0" max="100" value={pct}
                onChange={e=>setPct(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}
                placeholder="e.g. 74" autoFocus
                style={{width:'100%',background:C.card2,border:`1px solid ${valid&&displayGrade?gradeColor(displayGrade)+'66':C.border}`,
                  borderRadius:10,padding:'14px 60px 14px 16px',color:C.text,
                  fontSize:24,fontWeight:700,fontFamily:font,outline:'none',boxSizing:'border-box',
                  transition:'border-color 0.2s'}}/>
              {displayGrade&&(
                <div style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',
                  fontSize:22,fontWeight:800,color:gradeColor(displayGrade),
                  animation:'rbp-grade-pop 0.25s cubic-bezier(.34,1.56,.64,1) both'}}>{displayGrade}</div>
              )}
            </div>

            {/* Dual boundary display */}
            {valid&&(hasHistData||notGrade)&&(
              <div style={{display:'grid',gridTemplateColumns:hasHistData&&notGrade?'1fr 1fr':'1fr',
                gap:8,marginBottom:14}}>
                {hasHistData&&histGrade&&(
                  <div style={{background:C.card2,border:`1px solid ${gradeColor(histGrade)}44`,
                    borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
                      letterSpacing:0.4,marginBottom:4}}>{paperYear} Actual</div>
                    <div style={{fontSize:22,fontWeight:800,color:gradeColor(histGrade)}}>{histGrade}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                      A* needs {getHistoricalThreshold('A*',paper)??'—'}%
                    </div>
                  </div>
                )}
                {notGrade&&(
                  <div style={{background:C.card2,border:`1px solid ${gradeColor(notGrade)}44`,
                    borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',
                      letterSpacing:0.4,marginBottom:4}}>Notional</div>
                    <div style={{fontSize:22,fontWeight:800,color:gradeColor(notGrade)}}>{notGrade}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                      A* needs {notThresh??'—'}%
                    </div>
                  </div>
                )}
              </div>
            )}
            {valid&&hasHistData&&histGrade&&notGrade&&histGrade!==notGrade&&(
              <div style={{fontSize:11,color:C.muted,marginBottom:10,textAlign:'center',padding:'6px 10px',
                background:C.card2,borderRadius:7}}>
                {['A*','A','B','C','D','E'].indexOf(histGrade)<['A*','A','B','C','D','E'].indexOf(notGrade)
                  ?`Grade higher on ${paperYear} paper vs notional standard`
                  :`Grade lower on ${paperYear} paper vs notional standard`}
              </div>
            )}

            <button onClick={save} disabled={!valid}
              style={{width:'100%',padding:'14px',
                background:valid?C.accent:'rgba(0,0,0,0.08)',
                border:'none',borderRadius:10,
                color:valid?'#fff':C.muted,
                fontSize:15,fontWeight:700,fontFamily:font,
                cursor:valid?'pointer':'default',transition:'all 0.2s',
                boxShadow:valid?`0 4px 16px ${C.accent}55`:undefined}}>
              Log it →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────
function RevisionPlan({user,selection,examLevel='alevel',onSignOut,onResetSubjects,examSched=EXAM_SCHEDULE,isPro=false,stripeCustomerId=null,referralCode=null}) {
  const [dark,setDark]     = useState(()=>ls.get('rbp_dark',false));
  const [view,setView]     = useState('analytics');
  const [isMobile,setIsMobile] = useState(()=>window.innerWidth<640);
  const [isWide,  setIsWide]   = useState(()=>window.innerWidth>=768);
  const [quickLogOpen,setQuickLogOpen] = useState(false);
  const [moreOpen,    setMoreOpen]     = useState(false);
  const [pendingAchievement,setPendingAchievement] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showTour, setShowTour] = useState(()=>!ls.get('rbp_tour_v1',false));
  const [aStarFlash, setAStarFlash] = useState(false);
  const addToast = (msg,type='info') => {
    const id=Date.now()+Math.random();
    setToasts(prev=>[...prev,{id,msg,type}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4200);
  };
  const dismissToast = id => setToasts(prev=>prev.filter(t=>t.id!==id));
  const doneTour = () => { ls.set('rbp_tour_v1',true); setShowTour(false); };

  const uid      = user?.id??'anon';
  const [scores,   setScores]    = useState(()=>ls.get(`rbp_scores_${uid}`,[]));
  const [errors,   setErrors]    = useState(()=>ls.get(`rbp_errors_${uid}`,[]));
  const [rag,      setRag]       = useState(()=>ls.get(`rbp_rag_${uid}`,{}));
  const [ragNotes, setRagNotes]  = useState(()=>ls.get(`rbp_rag_notes_${uid}`,{}));
  const [sessions, setSessions]  = useState(()=>ls.get(`rbp_sessions_${uid}`,[]));

  const C    = dark?T.dark:T.light;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
  const isGcse = examLevel === 'gcse';
  const subjects = subjectsFromSelection(selection, isGcse ? GCSE_CATALOG : null);

  // ── Companion state (lifted from CompanionCard to here so sidebar can access) ──
  const [companion,setCompanion] = useState(()=>{
    const s=ls.get('rbp_companion',{name:'Alex',skin:0,hair:0,hairStyle:0});
    return {eyeColor:0,outfitColor:0,accessory:0,...s};
  });
  const [showBubble,    setShowBubble]   = useState(false);
  const [customising,   setCustomising]  = useState(false);
  const [companionDraft,setCompanionDraft] = useState(companion.name);
  const [companionChat, setCompanionChat]= useState(false);

  const mood    = getCompanionMood({sessions,scores,examSched,subjects});
  const message = getCompanionMessage({mood,sessions,scores,subjects,examSched,name:companion.name});

  useEffect(()=>{
    ensureAnimStyles();
    const t1=setTimeout(()=>setShowBubble(true),700);
    const t2=setTimeout(()=>setShowBubble(false),7000);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[]);

  const saveCompanion = (c) => { setCompanion(c); ls.set('rbp_companion',c); };

  useEffect(()=>ls.set(`rbp_rag_notes_${uid}`,ragNotes),[ragNotes]);

  const defaultTargets = Object.fromEntries(subjects.map(s=>[s.name, isGcse ? '9' : 'A*']));
  const [targets,setTargets] = useState(()=>{
    const stored=ls.get(`rbp_targets_${uid}`,{});
    return Object.keys(stored).length>0?stored:defaultTargets;
  });

  useEffect(()=>ls.set(`rbp_targets_${uid}`,targets),[targets]);
  useEffect(()=>ls.set(`rbp_rag_${uid}`,rag),[rag]);

  useEffect(()=>{
    const fn=()=>{ setIsMobile(window.innerWidth<640); setIsWide(window.innerWidth>=768); };
    window.addEventListener('resize',fn,{passive:true});
    return ()=>window.removeEventListener('resize',fn);
  },[]);

  useEffect(()=>{
    if (isMobile&&isWide) setMoreOpen(false);
  },[isMobile,isWide]);

  // Supabase sync — load on mount, push on change
  const syncRef        = useRef(null);
  const [syncLoaded,setSyncLoaded] = useState(false);
  useEffect(()=>{
    if (!user?.id||!isSupabaseConfigured()) { setSyncLoaded(true); return; }
    const lS=ls.get(`rbp_scores_${uid}`,[]);
    const lE=ls.get(`rbp_errors_${uid}`,[]);
    const lR=ls.get(`rbp_rag_${uid}`,{});
    const lT=ls.get(`rbp_targets_${uid}`,{});
    const lSess=ls.get(`rbp_sessions_${uid}`,[]);
    const lRN=ls.get(`rbp_rag_notes_${uid}`,{});
    supabase.from('user_data').select('scores,errors,rag,targets,sessions,rag_notes').eq('user_id',user.id).eq('profile','me').single()
      .then(({data})=>{
        let fS=lS,fE=lE,fR=lR,fT=lT,fSess=lSess,fRN=lRN;
        if (data) {
          const sIds=new Set(lS.map(s=>s.id));
          fS=[...lS,...(data.scores||[]).filter(s=>!sIds.has(s.id))];
          const eIds=new Set(lE.map(e=>e.id));
          fE=[...lE,...(data.errors||[]).filter(e=>!eIds.has(e.id))];
          if (data.rag&&Object.keys(data.rag).length>0) fR={...data.rag,...lR};
          if (data.targets&&Object.keys(data.targets).length>0&&!Object.keys(lT).length) fT=data.targets;
          if (data.sessions?.length) {
            const sessIds=new Set(lSess.map(s=>s.id));
            fSess=[...lSess,...(data.sessions||[]).filter(s=>!sessIds.has(s.id))];
          }
          if (data.rag_notes&&Object.keys(data.rag_notes).length>0) fRN={...data.rag_notes,...lRN};
          setScores(fS);   ls.set(`rbp_scores_${uid}`,fS);
          setErrors(fE);   ls.set(`rbp_errors_${uid}`,fE);
          setRag(fR);      ls.set(`rbp_rag_${uid}`,fR);
          setTargets(fT);  ls.set(`rbp_targets_${uid}`,fT);
          setSessions(fSess); ls.set(`rbp_sessions_${uid}`,fSess);
          setRagNotes(fRN);   ls.set(`rbp_rag_notes_${uid}`,fRN);
        }
        supabase.from('user_data').upsert(
          {user_id:user.id,profile:'me',scores:fS,errors:fE,rag:fR,targets:fT,sessions:fSess,rag_notes:fRN,updated_at:new Date().toISOString()},
          {onConflict:'user_id,profile'}
        ).then(()=>{});
        setSyncLoaded(true);
      })
      .catch(()=>setSyncLoaded(true));
  },[user?.id]);
  useEffect(()=>{
    if (!user?.id||!isSupabaseConfigured()||!syncLoaded) return;
    clearTimeout(syncRef.current);
    syncRef.current=setTimeout(()=>{
      const lbScore = scores.length ? Math.round(scores.reduce((s,x)=>s+(x.pct??0),0)/scores.length) : 0;
      supabase.from('user_data').upsert(
        {user_id:user.id,profile:'me',scores,errors,rag,targets,sessions,rag_notes:ragNotes,updated_at:new Date().toISOString()},
        {onConflict:'user_id,profile'}
      ).then(({error})=>{
        if(error) addToast('Auto-save failed — your data is safe locally','warn');
      });
      supabase.from('user_profiles')
        .update({leaderboard_score:lbScore,papers_count:scores.length})
        .eq('id',user.id);
    },2000);
    return ()=>clearTimeout(syncRef.current);
  },[scores,errors,rag,targets,sessions,ragNotes,syncLoaded]);

  // Browser push notifications
  useEffect(()=>{
    if (!('Notification' in window)) return;
    if (Notification.permission==='default' && scores.length>=1) {
      Notification.requestPermission();
    }
    if (Notification.permission==='granted') {
      const today = new Date().toDateString();
      const notifKey = `rbp_notif_shown_${today}`;
      if (ls.get(notifKey, false)) return;
      if (!scores.length) return;
      const lastTs = Math.max(...scores.map(s=>s.ts||s.id));
      const daysSince = Math.floor((Date.now()-lastTs)/86400000);
      if (daysSince>=3) {
        new Notification('Time to revise!', {
          body: "You haven't logged a paper in 3+ days. Keep your streak going.",
          icon:'/pwa-icon.svg'
        });
        ls.set(notifKey, true);
      }
    }
  },[scores]);

  // Achievement tracking
  const prevUnlockedRef = useRef(()=>new Set(ls.get(`rbp_ach_${uid}`,[]) ));
  useEffect(()=>{
    if(!scores.length) return;
    const current=computeUnlockedAchievements(scores,errors,subjects);
    const prev=ls.get(`rbp_ach_${uid}`,[]);
    const prevSet=new Set(prev);
    const newlyUnlocked=current.filter(id=>!prevSet.has(id));
    if(newlyUnlocked.length>0){
      ls.set(`rbp_ach_${uid}`,current);
      const a=ACHIEVEMENTS.find(x=>x.id===newlyUnlocked[0]);
      if(a&&!pendingAchievement) setPendingAchievement(a);
    }
  },[scores,errors]);

  const unlockedIds=ls.get(`rbp_ach_${uid}`,[]);

  const DESKTOP_NAV=[
    {id:'analytics',    label:'Analytics',    Icon:BarChart3},
    {id:'tracker',      label:'Tracker',      Icon:PenLine},
    {id:'exams',        label:'Exams',        Icon:CalendarDays},
    {id:'plan',         label:'Plan',         Icon:ClipboardList},
    {id:'achievements', label:'Achievements', Icon:Trophy},
    {id:'friends',      label:'Friends',      Icon:Users},
    {id:'timer',        label:'Timer',        Icon:Timer},
    {id:'resources',    label:'Resources',    Icon:BookOpen},
    {id:'account',      label:'Account',      Icon:User},
  ];

  const vp={subjects,scores,errors,uid,C,font,examSched,rag,setRag,targets,setTargets,ragNotes,setRagNotes,sessions,addToast,isPro,stripeCustomerId,referralCode,examLevel,isGcse};

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:font,color:C.text}}>
      {/* ── Speech bubble (desktop: right of sidebar, mobile: top-centre) ── */}
      {showBubble&&(
        <div style={{
          position:'fixed',
          left: isMobile ? 64 : 220, top: 16,
          zIndex:150,maxWidth:260,
          background:C.surface,
          border:`1px solid ${C.border}`,borderRadius:16,padding:'14px 16px 12px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
          animation:'rbp-slide-right 0.3s ease',
          pointerEvents:'auto',
        }}>
          {/* Tail pointing left */}
          <div style={{position:'absolute',left:-9,top:22,width:0,height:0,
            borderTop:'9px solid transparent',borderBottom:'9px solid transparent',
            borderRight:`9px solid ${C.border}`}}/>
          <div style={{position:'absolute',left:-7,top:23,width:0,height:0,
            borderTop:'8px solid transparent',borderBottom:'8px solid transparent',
            borderRight:`8px solid ${C.surface}`}}/>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text}}>{companion.name}</span>
            <span style={{fontSize:10,fontWeight:700,color:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent}[mood]||C.accent,
              background:'rgba(0,0,0,0.06)',borderRadius:4,padding:'1px 6px'}}>
              {{happy:'Happy',excited:'Pumped',worried:'Worried',neutral:'Ready'}[mood]||'Ready'}
            </span>
            <button onClick={()=>setShowBubble(false)}
              style={{marginLeft:'auto',background:'transparent',border:'none',color:C.subtle,
                cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px'}}>✕</button>
          </div>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.65,margin:'0 0 10px'}}>{message}</p>
          {isPro&&(
            <button onClick={()=>{setShowBubble(false);setCompanionChat(true);}}
              style={{padding:'6px 14px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
                borderRadius:8,color:C.accent,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
              Chat →
            </button>
          )}
        </div>
      )}

      {/* ── SIDEBAR — always visible, narrow on phones, full on tablet/desktop ── */}
      <aside style={{position:'fixed',left:0,top:0,bottom:0,
        width:isMobile?54:210,zIndex:100,
        background:C.nav,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderRight:`1px solid ${C.border}`,
        display:'flex',flexDirection:'column',alignItems:isMobile?'center':'stretch'}}>

        {isMobile?(
          /* ── NARROW (phone): icon strip ── */
          <>
            <div style={{paddingTop:10,paddingBottom:6,width:'100%',
              display:'flex',flexDirection:'column',alignItems:'center',gap:3,
              borderBottom:`1px solid ${C.border}`}}>
              <div style={{position:'relative',cursor:'pointer'}} onClick={()=>setShowBubble(v=>!v)}>
                <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',
                  border:`2px solid ${C.accent}`,background:C.surface,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <CompanionAvatar
                    skin={companion.skin} hair={companion.hair} hairStyle={companion.hairStyle}
                    eyeColor={companion.eyeColor??0} outfitColor={companion.outfitColor??0}
                    accessory={companion.accessory??0} mood={mood}
                    pose={showBubble?'wave':'idle'} size={28}/>
                </div>
                <div style={{position:'absolute',bottom:-1,right:-1,width:8,height:8,borderRadius:'50%',
                  background:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent}[mood]||C.accent,
                  border:`2px solid ${C.nav}`}}/>
              </div>
              <button onClick={e=>{e.stopPropagation();setCompanionDraft(companion.name);setCustomising(true);}}
                style={{padding:'1px 0',background:'transparent',border:'none',
                  cursor:'pointer',color:C.muted,lineHeight:1,display:'flex',alignItems:'center'}}>
                <Pencil size={11} strokeWidth={2}/>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',width:'100%'}}>
              {DESKTOP_NAV.map(n=>(
                <button key={n.id} onClick={()=>setView(n.id)} style={{
                  width:'100%',display:'flex',flexDirection:'column',alignItems:'center',
                  justifyContent:'center',padding:'8px 0',background:'transparent',border:'none',
                  cursor:'pointer',position:'relative',
                  borderLeft:`3px solid ${view===n.id?C.accent:'transparent'}`,
                  color:view===n.id?C.accent:C.muted,
                  transition:'border-color 0.12s,color 0.12s'}}>
                  <n.Icon size={17} strokeWidth={view===n.id?2:1.6}/>
                  {n.id==='achievements'&&unlockedIds.length>0&&(
                    <span style={{position:'absolute',top:4,right:4,width:5,height:5,
                      borderRadius:'50%',background:TIER_COLOR.gold}}/>
                  )}
                </button>
              ))}
            </div>
            <div style={{padding:'8px 0',borderTop:`1px solid ${C.border}`,width:'100%',
              display:'flex',justifyContent:'center'}}>
              <button onClick={()=>{const n=!dark;setDark(n);ls.set('rbp_dark',n);}}
                style={{padding:4,background:'transparent',border:'none',cursor:'pointer',color:C.muted,display:'flex',alignItems:'center'}}>
                {dark?<Sun size={15} strokeWidth={1.8}/>:<Moon size={15} strokeWidth={1.8}/>}
              </button>
            </div>
          </>
        ):(
          /* ── FULL (tablet/desktop): avatar + labels ── */
          <>
            <div style={{padding:'16px 14px 12px',borderBottom:`1px solid ${C.border}`,
              display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer'}}
              onClick={()=>setShowBubble(v=>!v)}>
              <div style={{position:'relative'}}>
                <CompanionAvatar
                  skin={companion.skin} hair={companion.hair} hairStyle={companion.hairStyle}
                  eyeColor={companion.eyeColor??0} outfitColor={companion.outfitColor??0}
                  accessory={companion.accessory??0} mood={mood}
                  pose={showBubble?'wave':'idle'} size={68}/>
                <div style={{position:'absolute',bottom:8,right:-2,width:11,height:11,borderRadius:'50%',
                  background:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent}[mood]||C.accent,
                  border:`2px solid ${C.nav}`}}/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,letterSpacing:0.1}}>{companion.name}</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center'}}>
                <button onClick={e=>{e.stopPropagation();setCompanionDraft(companion.name);setCustomising(true);}}
                  style={{fontSize:10,color:C.muted,background:'transparent',
                    border:`1px solid ${C.border}`,borderRadius:5,padding:'3px 8px',
                    fontFamily:font,cursor:'pointer',fontWeight:500}}>
                  Customise
                </button>
                <button onClick={e=>{e.stopPropagation(); isPro?setCompanionChat(true):addToast('Upgrade to Pro to chat with your companion','info');}}
                  style={{fontSize:10,color:C.accent,background:C.accentSoft,
                    border:`1px solid ${C.accent}44`,borderRadius:5,padding:'3px 8px',
                    fontFamily:font,cursor:'pointer',fontWeight:600}}>
                  {isPro?'Chat':<span style={{display:'flex',alignItems:'center',gap:3}}>Chat<Lock size={9} strokeWidth={2.5}/></span>}
                </button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'6px 8px'}}>
              {DESKTOP_NAV.map(n=>(
                <button key={n.id} onClick={()=>setView(n.id)} style={{
                  width:'100%',textAlign:'left',padding:'9px 10px',
                  background:view===n.id?C.accentSoft:'transparent',
                  border:'none',borderRadius:8,
                  color:view===n.id?C.accent:C.muted,
                  fontSize:12,fontWeight:view===n.id?700:400,
                  fontFamily:font,cursor:'pointer',marginBottom:1,
                  display:'flex',alignItems:'center',gap:8,position:'relative',
                  transition:'color 0.12s,background 0.12s'
                }}>
                  <n.Icon size={14} strokeWidth={view===n.id?2:1.6} style={{flexShrink:0}}/>
                  {n.label}
                  {n.id==='achievements'&&unlockedIds.length>0&&(
                    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                      width:6,height:6,borderRadius:'50%',background:TIER_COLOR.gold}}/>
                  )}
                </button>
              ))}
            </div>
            <div style={{padding:'8px',borderTop:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:3}}>
              <button onClick={()=>{const n=!dark;setDark(n);ls.set('rbp_dark',n);}} style={{
                width:'100%',textAlign:'left',padding:'8px 10px',
                background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,
                color:C.muted,fontSize:11,fontWeight:600,fontFamily:font,cursor:'pointer',
                display:'flex',alignItems:'center',gap:8,letterSpacing:0.4,textTransform:'uppercase'
              }}>
                {dark?<><Sun size={12} strokeWidth={2} style={{flexShrink:0}}/><span>Light</span></>:<><Moon size={12} strokeWidth={2} style={{flexShrink:0}}/><span>Dark</span></>}
              </button>
            </div>
          </>
        )}
      </aside>

      <main style={{marginLeft:isMobile?54:210,padding:isMobile?'16px 12px':'28px 32px',minHeight:'100vh'}}>
        {view==='analytics'    && <Analytics    {...vp} onQuickLog={()=>setQuickLogOpen(true)} onUpgrade={()=>setView('account')}/>}
        {view==='tracker'      && <Tracker      {...vp} setScores={setScores} setErrors={setErrors} uid={uid}/>}
        {view==='exams'        && <Exams        {...vp}/>}
        {view==='plan'         && <Schedule     {...vp}/>}
{view==='achievements' && <AchievementsView {...vp} unlockedIds={unlockedIds}/>}
        {view==='friends'      && <FriendsView   user={user} scores={scores} uid={uid} C={C} font={font} addToast={addToast}/>}
        {view==='timer'        && <StudyTimer    subjects={subjects} uid={uid} C={C} font={font} sessions={sessions} setSessions={setSessions}/>}
        {view==='resources'    && <Resources    {...vp}/>}
        {view==='account'      && <Account      {...vp} user={user} selection={selection}
                                    dark={dark} setDark={setDark} onSignOut={onSignOut} onResetSubjects={onResetSubjects} isPro={isPro} stripeCustomerId={stripeCustomerId}/>}
      </main>

      {quickLogOpen&&(
        <QuickLog subjects={subjects} scores={scores} setScores={setScores}
          uid={uid} C={C} font={font} onClose={()=>setQuickLogOpen(false)}
          onSaved={(entry,imp)=>{
            addToast(`${entry.grade} · ${entry.subject}`,'success');
            if(entry.grade==='A*'||entry.grade==='9') { setAStarFlash(true); setTimeout(()=>setAStarFlash(false),3200); }
          }}/>
      )}
      {pendingAchievement&&(
        <AchievementToast achievement={pendingAchievement} onDismiss={()=>setPendingAchievement(null)}/>
      )}
      <ToastBar toasts={toasts} dismiss={dismissToast} isMobile={isMobile}/>
      {showTour&&<Onboarding onDone={doneTour} setView={setView} C={C} font={font}/>}
      {aStarFlash&&(()=>{
        ensureAnimStyles();
        const particles=Array.from({length:20},(_,i)=>{
          const a=(i/20)*Math.PI*2,d=80+Math.random()*120;
          return{tx:`${Math.cos(a)*d}px`,ty:`${Math.sin(a)*d-40}px`,
            color:['#fbbf24','#f59e0b','#fde68a','#ffffff','#fcd34d'][i%5],
            sz:6+Math.random()*8,del:Math.random()*0.4};
        });
        return(
          <div onClick={()=>setAStarFlash(false)}
            style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.82)',
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',animation:'rbp-fade-in 0.2s ease'}}>
            {particles.map((p,i)=>(
              <div key={i} style={{position:'absolute',width:p.sz,height:p.sz,borderRadius:'50%',
                background:p.color,top:'50%',left:'50%',
                '--tx':p.tx,'--ty':p.ty,
                animation:`rbp-particle 1.2s ${p.del}s ease-out forwards`}}/>
            ))}
            <div style={{textAlign:'center',animation:'rbp-ach-card 0.5s cubic-bezier(.34,1.56,.64,1) forwards'}}>
              <div style={{fontSize:90,lineHeight:1,marginBottom:12,
                animation:'rbp-ach-star 0.8s cubic-bezier(.34,1.56,.64,1) forwards'}}>⭐</div>
              <div style={{fontSize:64,fontWeight:900,color:'#fbbf24',lineHeight:1,
                textShadow:'0 0 40px rgba(251,191,36,0.8)',marginBottom:8,letterSpacing:-2}}>A*</div>
              <div style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,0.85)'}}>Brilliant work</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:8}}>Tap to continue</div>
            </div>
          </div>
        );
      })()}
      {(()=>{
        const streak = getStudyStreak(scores);
        if (!streak) return null;
        const gold = streak >= 7;
        return (
          <div style={{position:'fixed',top:isWide?20:62,right:16,zIndex:95,
            display:'flex',alignItems:'center',gap:6,
            padding:'6px 12px',borderRadius:20,
            background: gold ? 'rgba(251,191,36,0.18)' : C.surface,
            border:`1px solid ${gold?'rgba(251,191,36,0.5)':C.border}`,
            boxShadow: gold ? '0 0 16px rgba(251,191,36,0.25)' : '0 2px 8px rgba(0,0,0,0.12)',
            backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
            cursor:'default',userSelect:'none'}}>
            <span style={{fontSize:11,fontWeight:700,color:gold?'#fbbf24':C.muted,letterSpacing:0.5}}>STREAK</span>
            <span style={{fontSize:14,fontWeight:800,color: gold ? '#fbbf24' : C.text,fontFamily:'inherit'}}>
              {streak}
            </span>
          </div>
        );
      })()}
      <button
        onClick={()=>setQuickLogOpen(true)}
        aria-label="Log a paper"
        style={{position:'fixed',bottom:24,right:24,
          width:52,height:52,borderRadius:'50%',background:C.accent,border:'none',
          color:'#fff',fontSize:30,fontWeight:300,cursor:'pointer',zIndex:90,
          boxShadow:`0 4px 20px ${C.accent}55`,display:'flex',alignItems:'center',
          justifyContent:'center',lineHeight:1,transition:'transform 0.15s,box-shadow 0.15s'}}
        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.12)';e.currentTarget.style.boxShadow=`0 6px 28px ${C.accent}88`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow=`0 4px 20px ${C.accent}55`;}}>
        +
      </button>

      {/* Companion modals */}
      {customising&&(
        <CompanionCustomiser
          companion={companion}
          draft={companionDraft}
          setDraft={setCompanionDraft}
          setCompanion={setCompanion}
          onSave={()=>{
            const c={...companion,name:companionDraft.trim()||'Alex'};
            saveCompanion(c); setCustomising(false);
          }}
          onCancel={()=>{
            const saved=ls.get('rbp_companion',{name:'Alex',skin:0,hair:0,hairStyle:0});
            setCompanion({eyeColor:0,outfitColor:0,accessory:0,...saved});
            setCompanionDraft(saved.name||'Alex');
            setCustomising(false);
          }}
          C={C} font={font}/>
      )}
      {companionChat&&(
        <CompanionChat companion={companion} subjects={subjects} scores={scores}
          sessions={sessions} examSched={examSched} C={C} font={font}
          onClose={()=>setCompanionChat(false)}/>
      )}
    </div>
  );
}

// ── LevelPicker ────────────────────────────────────────────────────────────
function LevelPicker({ onComplete }) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
  const C = { bg:'#e8e4dd', surface:'#f0ece5', border:'rgba(0,0,0,0.09)', text:'#2b2b2b', muted:'#7a7268', accent:'#b5735a' };
  const [hover, setHover] = useState(null);

  const options = [
    {
      id: 'alevel',
      LvlIcon: GraduationCap,
      title: 'A-Levels',
      subtitle: 'Years 12–13',
      desc: 'Tracking A-Level papers with A*–E grade boundaries. Subjects like Maths, Chemistry, Biology, Economics.',
      grades: ['A*', 'A', 'B', 'C'],
    },
    {
      id: 'gcse',
      LvlIcon: BookOpen,
      title: 'GCSEs',
      subtitle: 'Years 10–11',
      desc: 'Tracking GCSE papers with 9–1 grade boundaries. Subjects like Maths, English, Sciences, History.',
      grades: ['9', '8', '7', '6'],
    },
  ];

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:font, padding:24 }}>
      <div style={{ width:'100%', maxWidth:560 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:40 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:C.accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:900, fontSize:11, color:'#fff', fontFamily:"'JetBrains Mono',monospace" }}>
            A*
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:C.text, letterSpacing:0.2 }}>Battle Plan</span>
        </div>

        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text, margin:'0 0 8px', lineHeight:1.2 }}>
            What are you studying?
          </h1>
          <p style={{ fontSize:14, color:C.muted, margin:0, lineHeight:1.5 }}>
            Choose your qualification. This sets the right grade scale and subjects for you.{' '}
            <span style={{ fontWeight:600, color:'#b91c1c' }}>This cannot be changed later.</span>
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
          {options.map(opt => {
            const isHov = hover === opt.id;
            return (
              <button
                key={opt.id}
                onMouseEnter={() => setHover(opt.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onComplete(opt.id)}
                style={{
                  display:'flex', alignItems:'flex-start', gap:16, padding:'20px 22px',
                  background: isHov ? `${C.accent}10` : C.surface,
                  border: `2px solid ${isHov ? C.accent+'66' : C.border}`,
                  borderRadius:14, cursor:'pointer', textAlign:'left',
                  transition:'all 0.15s',
                }}
              >
                <div style={{ flexShrink:0, marginTop:2, color:C.accent }}><opt.LvlIcon size={32} strokeWidth={1.5}/></div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:18, fontWeight:800, color:C.text }}>{opt.title}</span>
                    <span style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{opt.subtitle}</span>
                  </div>
                  <p style={{ fontSize:13, color:C.muted, margin:'0 0 10px', lineHeight:1.5 }}>{opt.desc}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    {opt.grades.map(g => (
                      <div key={g} style={{
                        background:gradeColor(g)+'22', border:`1px solid ${gradeColor(g)}44`,
                        borderRadius:4, padding:'2px 7px', fontSize:12, fontWeight:700, color:gradeColor(g),
                      }}>{g}</div>
                    ))}
                    <div style={{ fontSize:12, color:C.muted, alignSelf:'center' }}>…</div>
                  </div>
                </div>
                <div style={{
                  fontSize:18, color: isHov ? C.accent : C.border,
                  flexShrink:0, alignSelf:'center', transition:'color 0.15s',
                }}>→</div>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize:11, color:C.muted, textAlign:'center', margin:0 }}>
          Your choice is saved securely and cannot be changed after sign-up.
        </p>
      </div>
    </div>
  );
}

// ── App root ───────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]           = useState('loading');
  const [user,setUser]             = useState(null);
  const [selection,setSelection]   = useState([]);
  const [examLevel,setExamLevel]   = useState('alevel');
  const [examSched,setExamSched]   = useState(EXAM_SCHEDULE);
  const [isPro,setIsPro]           = useState(false);
  const [stripeCustomerId,setStripeCustomerId] = useState(null);
  const [referralCode,setReferralCode] = useState(null);

  const dark = ls.get('rbp_dark',false);
  const C    = dark?T.dark:T.light;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  useEffect(()=>{
    if (!isSupabaseConfigured()) { setPhase('landing'); return; }
    // Capture referral code from URL before auth
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) sessionStorage.setItem('rbp_ref', refParam.toUpperCase().trim());
    let alive=true;

    async function boot(session) {
      if (!session?.user) { if (alive) { setUser(null); setPhase('landing'); } return; }
      if (sessionStorage.getItem('rbp_goto_admin')) {
        sessionStorage.removeItem('rbp_goto_admin');
        window.location.href = '/admin';
        return;
      }
      const u=session.user; const uid=u.id;
      if (alive) setUser(u);
      try {
        await supabase.from('user_profiles').upsert({id:uid,email:u.email},{onConflict:'id',ignoreDuplicates:true});
        const {data}=await supabase.from('user_profiles').select('subjects,subscription_status,stripe_customer_id,referral_code,exam_level').eq('id',uid).single();
        if (!alive) return;
        if (data?.subscription_status) setIsPro(data.subscription_status==='pro'||data.subscription_status==='trialing');
        if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id);
        let rc=data?.referral_code;
        if (!rc) {
          rc=Math.random().toString(36).slice(2,8).toUpperCase();
          await supabase.from('user_profiles').update({referral_code:rc}).eq('id',uid);
        }
        if (alive) setReferralCode(rc);
        const pendingRef=sessionStorage.getItem('rbp_ref');
        if (pendingRef && pendingRef!==rc) {
          sessionStorage.removeItem('rbp_ref');
          supabase.auth.getSession().then(({data:{session:s}})=>{
            if (!s) return;
            fetch('/api/referral',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({referrerCode:pendingRef})}).catch(()=>{});
          });
        }
        const lvl = data?.exam_level || null;
        if (lvl && alive) setExamLevel(lvl);
        let sel=[];
        try { if (data?.subjects) sel=JSON.parse(data.subjects); } catch {}
        if (Array.isArray(sel)&&sel.length>0) {
          ls.set(`rbp_sel_${uid}`,sel); setSelection(sel);
          if (!lvl) {
            // Existing user without exam_level — default to alevel, save it silently
            setExamLevel('alevel');
            supabase.from('user_profiles').update({exam_level:'alevel'}).eq('id',uid).then(()=>{});
          }
          if (alive) setPhase('app');
        } else {
          const cached=ls.get(`rbp_sel_${uid}`,[]);
          if (cached.length>0) {
            setSelection(cached);
            if (!lvl) { setExamLevel('alevel'); supabase.from('user_profiles').update({exam_level:'alevel'}).eq('id',uid).then(()=>{}); }
            if (alive) setPhase('app');
            supabase.rpc('save_subjects',{p_subjects:JSON.stringify(cached)});
          } else {
            // New user — if exam_level not set show level picker, else go to subject picker
            if (alive) setPhase(lvl ? 'onboarding' : 'level-pick');
          }
        }
      } catch {
        if (!alive) return;
        const cached=ls.get(`rbp_sel_${uid}`,[]);
        if (cached.length>0) { setSelection(cached); setPhase('app'); }
        else setPhase('level-pick');
      }
    }

    supabase.auth.getSession().then(({data:{session}})=>boot(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==='SIGNED_OUT') { if (alive) { setUser(null); setSelection([]); setPhase('landing'); } }
      else if (event==='SIGNED_IN') boot(session);
    });
    return ()=>{ alive=false; subscription.unsubscribe(); };
  },[]);


  function handleSubjectsDone(sel) { setSelection(sel); setPhase('app'); }

  async function handleLevelDone(level) {
    setExamLevel(level);
    const uid=user?.id;
    if (uid) await supabase.from('user_profiles').update({exam_level:level}).eq('id',uid);
    setPhase('onboarding');
  }

  async function handleSignOut() {
    const uid=user?.id;
    await supabase.auth.signOut();
    if (uid) ls.del(`rbp_sel_${uid}`);
    setUser(null); setSelection([]); setExamLevel('alevel'); setPhase('anon');
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
  if (phase==='landing')    return <ErrorBoundary><LandingPage onGetStarted={()=>setPhase('anon')}/></ErrorBoundary>;
  if (phase==='anon')       return <ErrorBoundary><AuthGate onAuth={()=>{}}/></ErrorBoundary>;
  if (phase==='level-pick') return <ErrorBoundary><LevelPicker onComplete={handleLevelDone}/></ErrorBoundary>;
  if (phase==='onboarding') return <ErrorBoundary><SubjectPicker user={user} onComplete={handleSubjectsDone} examLevel={examLevel}/></ErrorBoundary>;
  return (
    <ErrorBoundary>
      <RevisionPlan user={user} selection={selection} examLevel={examLevel} onSignOut={handleSignOut} onResetSubjects={handleResetSubjects} examSched={examSched} isPro={isPro} stripeCustomerId={stripeCustomerId} referralCode={referralCode}/>
    </ErrorBoundary>
  );
}
