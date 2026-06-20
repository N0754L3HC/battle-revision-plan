import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthGate from './components/AuthGate';
import SubjectPicker from './components/SubjectPicker';
import GroupsView from './components/GroupsView';
import TermsOfService from './components/TermsOfService';
import { subjectsFromSelection, GCSE_CATALOG } from './data/subjects';
import { BarChart3, PenLine, CalendarDays, ClipboardList, Trophy, Users, Timer, BookOpen, User, Sun, Moon, Lock, Pencil, GraduationCap, FileText, TrendingUp, Zap, Star, ArrowUpRight, Target, Shield, CheckCircle, Calendar, Search, Grid3x3, PanelLeftClose, PanelLeftOpen, UserPlus } from 'lucide-react';

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

// ── Type system ──────────────────────────────────────────────────────────────
// ONE font family across the entire app (Notion model). Hierarchy comes from
// size, weight and colour only — never a second typeface. This is what makes
// the UI read as a single owned system rather than an assembled template.
const FONT_BODY    = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const FONT_DISPLAY = FONT_BODY;   // alias: same family, kept so callers needn't change
const FONT_MONO    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

// Reusable text styles — spread into inline styles, override colour per use.
// Notion-tuned: bold-but-not-huge headings, calm 1.5 body, subtle eyebrows.
const type = {
  display: { fontFamily:FONT_BODY, fontWeight:700, letterSpacing:'-0.022em', lineHeight:1.1 },
  h1:      { fontFamily:FONT_BODY, fontWeight:700, fontSize:27, letterSpacing:'-0.02em',  lineHeight:1.2 },
  h2:      { fontFamily:FONT_BODY, fontWeight:600, fontSize:19, letterSpacing:'-0.013em', lineHeight:1.25 },
  h3:      { fontFamily:FONT_BODY, fontWeight:600, fontSize:15, letterSpacing:'-0.006em', lineHeight:1.3 },
  body:    { fontFamily:FONT_BODY, fontWeight:400, fontSize:15, lineHeight:1.5 },
  caption: { fontFamily:FONT_BODY, fontWeight:400, fontSize:13, lineHeight:1.45 },
  eyebrow: { fontFamily:FONT_BODY, fontWeight:600, fontSize:11, letterSpacing:'0.05em', textTransform:'uppercase' },
};

// ── Exam schedule (subjectId → boardId → exams) ────────────────────────────
// Built-in defaults. Admin-managed overrides live in Supabase app_config
// (key: exam_schedule) and are merged over these on load — see App() boot.
// IMPORTANT: dates are verified against official board timetables but students
// are always told to confirm with their own school timetable (dates can move).
export const EXAM_SCHEDULE = {
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
      { date:'2026-05-14', paper:'Core Pure Mathematics 1',              code:'9FM0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-05-21', paper:'Core Pure Mathematics 2',              code:'9FM0/02', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-19', paper:'Option: Further Pure Mathematics 1',   code:'9FM0/3A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3A' },
      { date:'2026-06-05', paper:'Option: Further Mechanics 1',          code:'9FM0/3C', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3C' },
      { date:'2026-06-12', paper:'Option: Further Statistics 1',         code:'9FM0/3B', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3B' },
      { date:'2026-06-16', paper:'Option: Decision Mathematics 1',       code:'9FM0/3D', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3D' },
      { date:'2026-06-09', paper:'Option: Further Pure Mathematics 2',   code:'9FM0/4A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'4A' },
      { date:'2026-06-12', paper:'Option: Further Statistics 2',         code:'9FM0/4B', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4B' },
      { date:'2026-06-05', paper:'Option: Further Mechanics 2',          code:'9FM0/4C', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4C' },
      { date:'2026-06-16', paper:'Option: Decision Mathematics 2',       code:'9FM0/4D', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4D' },
    ],
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Compulsory (7367/1)',  code:'7367/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-05-20', paper:'Paper 2: Optional 1 (7367/2)', code:'7367/2', board:'AQA', time:'AM', duration:'1h 30m', maxMark:75, option:'OA' },
      { date:'2026-06-10', paper:'Paper 3: Optional 2 (7367/3)', code:'7367/3', board:'AQA', time:'PM', duration:'1h 30m', maxMark:75, option:'OB' },
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
      { date:'2026-05-20', paper:'Paper 1: Sections 1–5 (7408/1)',          code:'7408/1', board:'AQA', time:'PM', duration:'2h', maxMark:85 },
      { date:'2026-06-01', paper:'Paper 2: Sections 6–8 (7408/2)',          code:'7408/2', board:'AQA', time:'AM', duration:'2h', maxMark:85 },
      { date:'2026-06-08', paper:'Paper 3: Practical & Options (7408/3)',   code:'7408/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
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
      { date:'2026-06-16', paper:'Paper 3: Essay & Data Analysis (7402/3)', code:'7402/3', board:'AQA', time:'AM', duration:'2h', maxMark:78 },
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

  // ── GCSE subjects ──────────────────────────────────────────────────────────
  'gcse-maths': {
    aqa: [
      { date:'2026-05-18', paper:'Paper 1: Non-Calculator (8300/1H)', code:'8300/1H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Calculator (8300/2H)',     code:'8300/2H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-08', paper:'Paper 3: Calculator (8300/3H)',     code:'8300/3H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-19', paper:'Paper 1: Non-Calculator (1MA1/1H)', code:'1MA1/1H', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Calculator (1MA1/2H)',     code:'1MA1/2H', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-09', paper:'Paper 3: Calculator (1MA1/3H)',     code:'1MA1/3H', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-21', paper:'Paper 1: Non-Calculator (J560/01)', code:'J560/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-05', paper:'Paper 2: Calculator (J560/02)',     code:'J560/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-10', paper:'Paper 3: Calculator (J560/03)',     code:'J560/03', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-english-lang': {
    aqa: [
      { date:'2026-05-21', paper:'Paper 1: Explorations in Creative Reading & Writing (8700/1)', code:'8700/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Writers\' Viewpoints & Perspectives (8700/2)',        code:'8700/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-22', paper:'Paper 1: Fiction & Imaginative Writing (1EN0/01)', code:'1EN0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-05', paper:'Paper 2: Non-Fiction & Transactional Writing (1EN0/02)', code:'1EN0/02', board:'Edexcel', time:'AM', duration:'2h 5m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-19', paper:'Component 1: Communicating Information & Ideas (J351/01)', code:'J351/01', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-03', paper:'Component 2: Exploring Effects & Impact (J351/02)',         code:'J351/02', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
    ],
  },
  'gcse-english-lit': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Shakespeare & the 19th Century Novel (8702/1)', code:'8702/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:64 },
      { date:'2026-06-10', paper:'Paper 2: Modern Texts, Poetry & Unseen (8702/2)',        code:'8702/2', board:'AQA', time:'AM', duration:'2h 15m', maxMark:96 },
    ],
    edexcel: [
      { date:'2026-05-18', paper:'Paper 1: Shakespeare & Post-1914 Literature (1ET0/01)', code:'1ET0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:60 },
      { date:'2026-06-08', paper:'Paper 2: 19th Century Novel & Poetry since 1789 (1ET0/02)', code:'1ET0/02', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-20', paper:'Component 1: Shakespeare & Poetry (J352/01)', code:'J352/01', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-04', paper:'Component 2: Prose & Drama (J352/02)',         code:'J352/02', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
    ],
  },
  'gcse-biology': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Cell Biology, Organisation, Infection, Bioenergetics (8461/1H)', code:'8461/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Homeostasis, Inheritance, Ecology (8461/2H)',                   code:'8461/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Key Concepts in Biology (1BI0/1H)', code:'1BI0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-15', paper:'Paper 2: Application of Key Concepts (1BI0/2H)', code:'1BI0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-05-18', paper:'Paper 1: Biology B1–B4 (J257/01)', code:'J257/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 2: Biology B5–B7 (J257/02)', code:'J257/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-chemistry': {
    aqa: [
      { date:'2026-05-19', paper:'Paper 1: Atomic Structure, Bonding, Quantitative, Chemical Changes (8462/1H)', code:'8462/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-16', paper:'Paper 2: Rates, Organic, Analysis, Atmosphere (8462/2H)',                     code:'8462/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-20', paper:'Paper 1: Key Concepts in Chemistry (1CH0/1H)', code:'1CH0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-17', paper:'Paper 2: Application of Key Concepts (1CH0/2H)', code:'1CH0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-05-21', paper:'Paper 1: Chemistry C1–C4 (J258/01)', code:'J258/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 2: Chemistry C5–C8 (J258/02)', code:'J258/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-physics': {
    aqa: [
      { date:'2026-06-02', paper:'Paper 1: Energy, Electricity, Particle Model, Atomic Structure (8463/1H)', code:'8463/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-22', paper:'Paper 2: Forces, Waves, Magnetism, Space (8463/2H)',                       code:'8463/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-06-03', paper:'Paper 1: Key Concepts in Physics (1PH0/1H)', code:'1PH0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-23', paper:'Paper 2: Application of Key Concepts (1PH0/2H)', code:'1PH0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-06-04', paper:'Paper 1: Physics P1–P4 (J259/01)', code:'J259/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 2: Physics P5–P8 (J259/02)', code:'J259/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-combined-science': {
    aqa: [
      { date:'2026-05-13', paper:'Biology Paper 1 (8464/B/1H)',  code:'8464/B/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-05-19', paper:'Chemistry Paper 1 (8464/C/1H)', code:'8464/C/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-02', paper:'Physics Paper 1 (8464/P/1H)',  code:'8464/P/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-11', paper:'Biology Paper 2 (8464/B/2H)',  code:'8464/B/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-16', paper:'Chemistry Paper 2 (8464/C/2H)', code:'8464/C/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-22', paper:'Physics Paper 2 (8464/P/2H)',  code:'8464/P/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Biology 1 (1SC0/1BH)',   code:'1SC0/1BH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-05-20', paper:'Chemistry 1 (1SC0/1CH)', code:'1SC0/1CH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-03', paper:'Physics 1 (1SC0/1PH)',   code:'1SC0/1PH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-15', paper:'Biology 2 (1SC0/2BH)',   code:'1SC0/2BH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-17', paper:'Chemistry 2 (1SC0/2CH)', code:'1SC0/2CH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-23', paper:'Physics 2 (1SC0/2PH)',   code:'1SC0/2PH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
    ],
  },
  'gcse-history': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Understanding the Modern World (8145/1A or 1B)', code:'8145/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:84 },
      { date:'2026-06-09', paper:'Paper 2: Shaping the Nation (8145/2A or 2B)',             code:'8145/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:84 },
    ],
    edexcel: [
      { date:'2026-05-13', paper:'Paper 1: Thematic Study & Historic Environment (1HI0/1)', code:'1HI0/1', board:'Edexcel', time:'AM', duration:'1h 15m', maxMark:52 },
      { date:'2026-06-03', paper:'Paper 2: Period Study & British Depth Study (1HI0/2)',    code:'1HI0/2', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:64 },
      { date:'2026-06-12', paper:'Paper 3: Modern Depth Study (1HI0/3)',                    code:'1HI0/3', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:52 },
    ],
    ocr: [
      { date:'2026-05-18', paper:'Component 1: Studies in Depth (J410/01)',     code:'J410/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:60 },
      { date:'2026-06-04', paper:'Component 2: Period Studies (J410/02)',        code:'J410/02', board:'OCR', time:'AM', duration:'1h 45m', maxMark:60 },
      { date:'2026-06-15', paper:'Component 3: Historical Investigations (J410/03)', code:'J410/03', board:'OCR', time:'AM', duration:'1h 45m', maxMark:60 },
    ],
  },
  'gcse-geography': {
    aqa: [
      { date:'2026-05-12', paper:'Paper 1: Living with the Physical Environment (8035/1)', code:'8035/1', board:'AQA', time:'AM', duration:'1h 30m', maxMark:88 },
      { date:'2026-05-20', paper:'Paper 2: Challenges in the Human Environment (8035/2)',  code:'8035/2', board:'AQA', time:'AM', duration:'1h 30m', maxMark:88 },
      { date:'2026-06-11', paper:'Paper 3: Geographical Applications (8035/3)',            code:'8035/3', board:'AQA', time:'AM', duration:'1h 15m', maxMark:76 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Global Geographical Issues (1GB0/01)',                        code:'1GB0/01', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:94 },
      { date:'2026-06-04', paper:'Paper 2: UK Geographical Issues (1GB0/02)',                            code:'1GB0/02', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:94 },
      { date:'2026-06-16', paper:'Paper 3: People & Environment Issues — Making Decisions (1GB0/03)',    code:'1GB0/03', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:64 },
    ],
    'ocr-a': [
      { date:'2026-05-15', paper:'Component 1: Our Natural World (J383/01)',   code:'J383/01', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70 },
      { date:'2026-06-05', paper:'Component 2: People and Society (J383/02)', code:'J383/02', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70 },
      { date:'2026-06-17', paper:'Component 3: Geographical Skills (J383/03)', code:'J383/03', board:'OCR A', time:'AM', duration:'1h',     maxMark:40 },
    ],
  },
  'gcse-cs': {
    aqa: [
      { date:'2026-05-20', paper:'Paper 1: Computational Thinking & Programming (8525/1)', code:'8525/1', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
      { date:'2026-06-10', paper:'Paper 2: Computer Systems (8525/2)',                    code:'8525/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-21', paper:'Paper 1: Computer Systems (J277/01)',                                  code:'J277/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-11', paper:'Paper 2: Computational Thinking, Algorithms & Programming (J277/02)', code:'J277/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-22', paper:'Paper 1: Computational Thinking & Problem Solving (1CP2/01)', code:'1CP2/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-12', paper:'Paper 2: Applications & Implications of Computing (1CP2/02)', code:'1CP2/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-french': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Listening (8658/LH)', code:'8658/LH', board:'AQA', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-21', paper:'Paper 2: Reading (8658/RH)',   code:'8658/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-10', paper:'Paper 3: Writing (8658/WH)',   code:'8658/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Listening & Understanding (1FR0/1H)', code:'1FR0/1H', board:'Edexcel', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading & Understanding (1FR0/2H)',   code:'1FR0/2H', board:'Edexcel', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-11', paper:'Paper 3: Writing in French (1FR0/3H)',         code:'1FR0/3H', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-spanish': {
    aqa: [
      { date:'2026-05-15', paper:'Paper 1: Listening (8698/LH)', code:'8698/LH', board:'AQA', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading (8698/RH)',   code:'8698/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-12', paper:'Paper 3: Writing (8698/WH)',   code:'8698/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Listening & Understanding (1SP0/1H)', code:'1SP0/1H', board:'Edexcel', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading & Understanding (1SP0/2H)',   code:'1SP0/2H', board:'Edexcel', time:'PM', duration:'1h', maxMark:60 },
      { date:'2026-06-12', paper:'Paper 3: Writing (1SP0/3H)',                   code:'1SP0/3H', board:'Edexcel', time:'PM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-religious-studies': {
    aqa: [
      { date:'2026-05-11', paper:'Paper 1: Religion, Beliefs & Practices (8062/1A–M)', code:'8062/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:102 },
      { date:'2026-06-05', paper:'Paper 2: Thematic Studies (8062/2)',                 code:'8062/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:102 },
    ],
    edexcel: [
      { date:'2026-05-12', paper:'Paper 1: Study of Religion — Beliefs, Teachings & Practices (1RB0/1H)', code:'1RB0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:118 },
      { date:'2026-06-03', paper:'Paper 2: Area of Study 2 — Christianity (1RB0/2H)',                     code:'1RB0/2H', board:'Edexcel', time:'PM', duration:'50m',    maxMark:48  },
      { date:'2026-06-10', paper:'Paper 3: Philosophical & Ethical Studies (1RB0/3H)',                    code:'1RB0/3H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:118 },
    ],
  },
  'gcse-german': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Listening (8668/LH)', code:'8668/LH', board:'AQA', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-20', paper:'Paper 2: Reading (8668/RH)',   code:'8668/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-09', paper:'Paper 3: Writing (8668/WH)',   code:'8668/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Listening & Understanding in German (1GN0/1H)', code:'1GN0/1H', board:'Edexcel', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-21', paper:'Paper 2: Reading & Understanding in German (1GN0/2H)',   code:'1GN0/2H', board:'Edexcel', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-10', paper:'Paper 3: Writing in German (1GN0/3H)',                   code:'1GN0/3H', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-music': {
    aqa: [
      { date:'2026-06-10', paper:'Paper 1: Listening (8271/W)', code:'8271/W', board:'AQA', time:'AM', duration:'1h 30m', maxMark:68 },
    ],
    edexcel: [
      { date:'2026-06-10', paper:'Paper 1: Instrumental Music (1MU0/01)', code:'1MU0/01', board:'Edexcel', time:'PM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-17', paper:'Paper 2: Vocal Music (1MU0/02)',         code:'1MU0/02', board:'Edexcel', time:'AM', duration:'45m',    maxMark:40 },
    ],
    ocr: [
      { date:'2026-06-11', paper:'Listening & Appraising (J536/01)', code:'J536/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-drama': {
    aqa: [
      { date:'2026-06-11', paper:'Written Exam: Understanding Drama (8261/W)', code:'8261/W', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-06-11', paper:'Written Exam: Theatre Makers in Practice (1DR0/01)', code:'1DR0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-06-12', paper:'Written Exam (J316/01)', code:'J316/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-business': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Business 1 (8132/1)', code:'8132/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-03', paper:'Paper 2: Business 2 (8132/2)', code:'8132/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:90 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Investigating Small Business (1BS0/01)', code:'1BS0/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Building a Business (1BS0/02)',          code:'1BS0/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-18', paper:'Paper 1: Business 1 (J204/01)', code:'J204/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-08', paper:'Paper 2: Business 2 (J204/02)', code:'J204/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-dt': {
    aqa: [
      { date:'2026-06-05', paper:'Written Exam: D&T in the Real World (8552/W)', code:'8552/W', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-06-05', paper:'Written Exam (1DT0/01)', code:'1DT0/01', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    ],
    ocr: [
      { date:'2026-06-08', paper:'Written Exam (J310/01)', code:'J310/01', board:'OCR', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  'gcse-pe': {
    aqa: [
      { date:'2026-05-26', paper:'Paper 1: The Human Body and Movement in Sport (8582/1)', code:'8582/1', board:'AQA', time:'AM', duration:'1h 15m', maxMark:78 },
      { date:'2026-06-15', paper:'Paper 2: Socio-Cultural Influences & Well-being (8582/2)', code:'8582/2', board:'AQA', time:'AM', duration:'1h 15m', maxMark:78 },
    ],
    edexcel: [
      { date:'2026-05-27', paper:'Paper 1: Fitness & Body Systems (1PE0/01)', code:'1PE0/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 2: Health & Performance (1PE0/02)',   code:'1PE0/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:90 },
    ],
    ocr: [
      { date:'2026-05-28', paper:'Paper 1: Physical Factors Affecting Performance (J587/01)',     code:'J587/01', board:'OCR', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-17', paper:'Paper 2: Socio-Cultural Issues & Sports Psychology (J587/02)', code:'J587/02', board:'OCR', time:'AM', duration:'1h', maxMark:60 },
    ],
  },
};

// Returns the exam list for a specific subject+board; filters by options when provided
function getSubjectExams(sched, subjectId, boardId, options=[]) {
  const sub = sched[subjectId];
  if (!sub) return [];
  if (Array.isArray(sub)) return sub; // backward-compat
  const papers = sub[boardId] || sub[Object.keys(sub)[0]] || [];
  if (!options || !options.length) return papers;
  return papers.filter(p => !p.option || options.includes(p.option));
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
// [label, minutes]
const EXAM_DURATIONS = [
  ['45m',  45], ['1h',  60], ['1h 15m', 75], ['1h 30m', 90],
  ['1h 45m', 105], ['2h', 120], ['2h 30m', 150], ['3h', 180],
];
const EXTRA_TIME_OPTS = [
  {label:'None', factor:0},
  {label:'+25%', factor:0.25},
  {label:'+50%', factor:0.50},
];

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
  const years=['2024','2023','2022','2019'];
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
function generateSchedule(subjects, scores, errors, examSched, rag={}, targets={}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const GRADE_BOUNDS = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries||{}]));
  const ranked = [...subjects].map(s => {
    const exs = getSubjectExams(examSched, s.id, s.boardId, s.options);
    const minDays = exs.length ? Math.min(...exs.map(e=>daysUntil(e.date))) : 999;
    const urgency = 1/(Math.max(0,minDays)+1)*50;
    const ss = scores.filter(x=>x.subject===s.name);
    const avg = ss.length ? ss.reduce((a,x)=>a+x.pct,0)/ss.length : 50;
    const weakness = (100-avg)*0.5;
    const topics = SPEC_TOPICS[s.id]||[];
    const redTopics = topics.filter((_,i)=>rag[`${s.id}_${i}`]==='red');
    const ragBoost = redTopics.length * 4;
    // Predicted vs target gap — if projected below target, boost priority
    const targetGrade = targets[s.name] || (Object.keys(s.gradeBoundaries||{})[0]==='9' ? '9' : 'A*');
    const targetPct = (s.gradeBoundaries||{})[targetGrade] || 80;
    const pred = predictedGrade(scores, s.name, GRADE_BOUNDS);
    let gapBoost = 0;
    let predGrade = null;
    if (pred) {
      predGrade = pred.grade;
      const gap = targetPct - pred.pct;
      if (gap > 0) gapBoost = Math.min(30, gap * 0.8);
      if (pred.trend === 'down') gapBoost += 6;
    }
    return { id:s.id, name:s.name, color:s.color, priority: urgency+weakness+ragBoost+gapBoost, redTopics, gapBoost: Math.round(gapBoost), predGrade, targetGrade };
  }).sort((a,b)=>b.priority-a.priority);

  const days = [];
  let slotIdx = 0;
  for (let i=0; i<14; i++) {
    const d = new Date(today); d.setDate(today.getDate()+i);
    const dateStr = d.toISOString().slice(0,10);
    const examsToday = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options).filter(e=>e.date===dateStr).map(e=>({...e,subjectName:s.name,color:s.color})));
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
  const allExams=subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options).map(e=>({...e,subject:s.name,color:s.color})));
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
// Subject paper labels carry the spec code (e.g. "… (9MA0/01)") but the
// HISTORICAL_GRADE_PCT keys don't. Map explicitly + code-scoped so that two
// boards sharing a bare paper name (OCR vs Edexcel "Algorithms & Programming",
// or OCR A-Level vs GCSE "Computer Systems") can never cross-map to the wrong
// boundaries. Anything unmapped falls back to the Notional standard — never a
// wrong year-specific grade.
const HIST_PAPER_MAP = {
  'Paper 1: Pure Mathematics 1 (9MA0/01)':'Paper 1: Pure Mathematics 1',
  'Paper 2: Pure Mathematics 2 (9MA0/02)':'Paper 2: Pure Mathematics 2',
  'Paper 3: Statistics & Mechanics (9MA0/03)':'Paper 3: Statistics & Mechanics',
  'Core Pure 1 (9FM0/01)':'Core Pure Mathematics 1',
  'Core Pure 2 (9FM0/02)':'Core Pure Mathematics 2',
  'Paper 1: Computer Systems (H446/01)':'Paper 1: Computer Systems',
  'Paper 2: Algorithms & Programming (H446/02)':'Paper 2: Algorithms & Programming',
  'Paper 1: Inorganic & Physical Chemistry (7405/1)':'Paper 1: Inorganic & Physical Chemistry',
  'Paper 2: Organic & Physical Chemistry (7405/2)':'Paper 2: Organic & Physical Chemistry',
  'Paper 3: Practical Skills (7405/3)':'Paper 3: Practical Skills',
  'Component 1: Modelling Physics (H557/01)':'Component 1: Modelling Physics',
  'Component 2: Exploring Physics (H557/02)':'Component 2: Exploring Physics',
};
function histBaseName(name){ return HIST_PAPER_MAP[name] || name; }
function parsePaperKey(key){
  const m=key.match(/^(.+?)\s[—–-]+\s?(\d{4})$/);
  if(m) return {name:m[1].trim(),year:parseInt(m[2])};
  return {name:key,year:null};
}
function getHistoricalGrade(pct,paperKey){
  const {name,year}=parsePaperKey(paperKey);
  const b=HISTORICAL_GRADE_PCT[histBaseName(name)]?.[year];
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
  return HISTORICAL_GRADE_PCT[histBaseName(name)]?.[year]?.[grade]??null;
}

// ── Achievements ───────────────────────────────────────────────────────────
const ACHIEVEMENTS=[
  {id:'first_paper',     title:'First Paper',     desc:'Log your first past paper',                       Icon:FileText,     tier:'bronze'  },
  {id:'three_papers',    title:'Getting Going',   desc:'Log 3 past papers',                               Icon:BookOpen,     tier:'bronze'  },
  {id:'ten_papers',      title:'Grinder',         desc:'Log 10 papers',                                   Icon:TrendingUp,   tier:'silver'  },
  {id:'twenty_five',     title:'Marathon Runner', desc:'Log 25 papers',                                   Icon:Zap,          tier:'gold'    },
  {id:'fifty_papers',    title:'Half Century',    desc:'Log 50 papers',                                   Icon:Zap,          tier:'gold'    },
  {id:'hundred_papers',  title:'Centurion',       desc:'Log 100 papers',                                  Icon:Trophy,       tier:'platinum'},
  {id:'first_a_star',    title:'A* Club',         desc:'Score an A* on any paper',                        Icon:Star,         tier:'gold'    },
  {id:'five_a_stars',    title:'Star Collector',  desc:'Score A* on 5 papers',                            Icon:Trophy,       tier:'platinum'},
  {id:'improvement',     title:'Level Up',        desc:'Improve your grade on a retried paper',           Icon:ArrowUpRight, tier:'bronze'  },
  {id:'big_comeback',    title:'Comeback Kid',    desc:'Improve a retried paper by 20% or more',          Icon:ArrowUpRight, tier:'silver'  },
  {id:'all_subjects',    title:'Versatile',       desc:'Log a paper in every subject',                    Icon:Target,       tier:'silver'  },
  {id:'subject_master',  title:'Subject Master',  desc:'Score A* on 3 papers in one subject',             Icon:Target,       tier:'gold'    },
  {id:'battle_ready',    title:'Battle Ready',    desc:'Reach 80+ Battle Readiness',                      Icon:Shield,       tier:'gold'    },
  {id:'perfect',         title:'Perfect Score',   desc:'Score 100% on a paper',                           Icon:CheckCircle,  tier:'platinum'},
  {id:'week_streak',     title:'Week Warrior',    desc:'Log papers on 7 different days',                  Icon:Calendar,     tier:'silver'  },
  {id:'fortnight',       title:'Fortnight Focus', desc:'Log papers on 14 different days',                 Icon:Calendar,     tier:'gold'    },
  {id:'month_streak',    title:'Iron Discipline', desc:'Log papers on 30 different days',                 Icon:Calendar,     tier:'platinum'},
  {id:'error_hunter',    title:'Error Hunter',    desc:'Log 10 errors in the error tracker',              Icon:Search,       tier:'bronze'  },
  {id:'coin_collector',  title:'Coin Collector',  desc:'Earn 500 coins from study sessions and papers',   Icon:Star,         tier:'silver'  },
  {id:'mascot_stylist',  title:'Mascot Stylist',  desc:'Own 5 different items from the capybara shop',    Icon:Star,         tier:'gold'    },
  {id:'plan_maker',      title:'Plan Maker',      desc:'Add 10 items to your study plan',                 Icon:ClipboardList,tier:'bronze'  },
  {id:'exam_eve',        title:'Eve of Battle',   desc:'Log a paper within 24h of an upcoming exam',      Icon:Shield,       tier:'gold'    },
];
const TIER_COLOR={bronze:'#cd7f32',silver:'#9ca3af',gold:'#fbbf24',platinum:'#a78bfa'};

function computeUnlockedAchievements(scores,errors,subjects,extras={}){
  const gb=Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
  const grades=scores.map(s=>getSubjectGrade(s.pct,s.subject,gb));
  const byPaper={};
  let hasImprovement=false, hasBigComeback=false;
  for(const s of [...scores].reverse()){
    if(byPaper[s.paper]===undefined) byPaper[s.paper]=s.pct;
    else {
      if(s.pct>byPaper[s.paper]) hasImprovement=true;
      if(s.pct-byPaper[s.paper]>=20) hasBigComeback=true;
    }
  }
  const days=new Set(scores.map(s=>new Date(s.ts||s.id).toDateString())).size;
  const br=calcBattleReadiness(scores,errors);
  // Subject Master: A* on 3 papers within one subject
  const aStarBySubject={};
  scores.forEach((s,i)=>{ if(grades[i]==='A*') aStarBySubject[s.subject]=(aStarBySubject[s.subject]||0)+1; });
  const subjectMaster=Object.values(aStarBySubject).some(c=>c>=3);
  // Exam eve: paper logged within 24h of an upcoming exam date in examSched
  const examEve=(()=>{
    const sched=extras.examSched;
    if(!sched) return false;
    const upcoming=subjects.flatMap(s=>getSubjectExams(sched,s.id,s.boardId,s.options));
    return scores.some(p=>{
      const pt=new Date(p.ts||p.id).getTime();
      return upcoming.some(e=>{
        const et=new Date(e.date).getTime();
        return et>=pt && et-pt<=86400000;
      });
    });
  })();
  const coinsEarned = extras.coinsEarned||0;
  const ownedItems = extras.ownedItems||1; // start with 3 default-owned items (coats[0]+scarves[0]+hats[0])
  const groupsCreatedByMe = extras.groupsCreatedByMe||0;
  return ACHIEVEMENTS.filter(a=>{
    switch(a.id){
      case 'first_paper':     return scores.length>=1;
      case 'three_papers':    return scores.length>=3;
      case 'ten_papers':      return scores.length>=10;
      case 'twenty_five':     return scores.length>=25;
      case 'fifty_papers':    return scores.length>=50;
      case 'hundred_papers':  return scores.length>=100;
      case 'first_a_star':    return grades.includes('A*');
      case 'five_a_stars':    return grades.filter(g=>g==='A*').length>=5;
      case 'improvement':     return hasImprovement;
      case 'big_comeback':    return hasBigComeback;
      case 'all_subjects':    return subjects.every(sub=>scores.some(s=>s.subject===sub.name));
      case 'subject_master':  return subjectMaster;
      case 'battle_ready':    return br.total>=80;
      case 'perfect':         return scores.some(s=>s.pct>=100);
      case 'week_streak':     return days>=7;
      case 'fortnight':       return days>=14;
      case 'month_streak':    return days>=30;
      case 'error_hunter':    return errors.length>=10;
      case 'coin_collector':  return coinsEarned>=500;
      case 'mascot_stylist':  return ownedItems>=5;
      case 'plan_maker':      return (extras.myPlanCount||0)>=10;
      case 'exam_eve':        return examEve;
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
// Capybara coat palette — natural/light/golden/dark/chocolate/grey/sandy
const CAPY_COATS    = ['#8B6240','#B08560','#C99363','#5A3F26','#3a2210','#8a8275','#a08068'];
const OUTFIT_COLORS = ['#4a90d9','#e87c3e','#5cb85c','#9b59b6','#e74c3c','#2c3e50','#ec4899','#0ea5e9','#fbbf24'];
const HAT_LABELS    = ['None','Glasses','Grad cap','Beanie','Headphones','Crown','Flower'];

// Legacy constants kept so any out-of-tree imports don't break (unused by capybara avatar)
const SKIN_TONES = CAPY_COATS;

// ── In-game shop ────────────────────────────────────────────────────────────
// idx maps to CAPY_COATS / OUTFIT_COLORS / HAT_LABELS positions.
// pro=true means the item requires Pro to PURCHASE (you keep it after).
const SHOP_COATS = [
  {idx:0, name:'Natural',   price:0,   pro:false},
  {idx:1, name:'Light',     price:50,  pro:false},
  {idx:5, name:'Grey',      price:60,  pro:false},
  {idx:6, name:'Sandy',     price:80,  pro:false},
  {idx:3, name:'Dark',      price:100, pro:false},
  {idx:2, name:'Golden',    price:200, pro:true },
  {idx:4, name:'Chocolate', price:250, pro:true },
];
const SHOP_SCARVES = [
  {idx:0, name:'Blue',   price:0,   pro:false},
  {idx:1, name:'Orange', price:40,  pro:false},
  {idx:2, name:'Green',  price:50,  pro:false},
  {idx:3, name:'Purple', price:60,  pro:false},
  {idx:4, name:'Red',    price:70,  pro:false},
  {idx:5, name:'Navy',   price:80,  pro:false},
  {idx:6, name:'Pink',   price:100, pro:true },
  {idx:7, name:'Cyan',   price:120, pro:true },
  {idx:8, name:'Gold',   price:150, pro:true },
];
const SHOP_HATS = [
  {idx:0, name:'None',       price:0,   pro:false},
  {idx:1, name:'Glasses',    price:50,  pro:false},
  {idx:3, name:'Beanie',     price:80,  pro:false},
  {idx:6, name:'Flower',     price:100, pro:false},
  {idx:2, name:'Grad cap',   price:150, pro:true },
  {idx:4, name:'Headphones', price:200, pro:true },
  {idx:5, name:'Crown',      price:300, pro:true },
];

function computeCoins(scores=[], sessions=[], spent=0) {
  // Study sessions are stored with a `secs` field (see StudyTimer). The older
  // duration/durationSec keys are kept as fallbacks for any legacy rows.
  const sessionMin = sessions.reduce((sum, s) => sum + Math.max(0, (s.secs ?? s.duration ?? s.durationSec ?? 0) / 60), 0);
  const earned = Math.floor(scores.length * 5 + sessionMin);
  return { earned, spent, available: Math.max(0, earned - spent) };
}

// "Did you show up?" — any meaningful study action counts toward streaks,
// momentum and the mascot: a timed session, a logged past paper, or a logged
// error. This is deliberately separate from *minutes studied*, which stays
// measured-only (timer + exam mode) so the clock never reflects a guess.
// Returns a Set of local-midnight timestamps that had at least one action.
function studyActivityDays({sessions=[],scores=[],errors=[]}={}) {
  const days=new Set();
  const add=ts=>{ if(!ts) return; const d=new Date(ts); d.setHours(0,0,0,0); days.add(d.getTime()); };
  sessions.forEach(s=>add(s.ts));
  scores.forEach(s=>add(s.ts??s.id));
  errors.forEach(e=>add(e.ts??e.id));
  return days;
}

function defaultOwned() { return { coats:[0], scarves:[0], hats:[0] }; }
function totalOwnedItems(owned) {
  if (!owned) return 0;
  return (owned.coats?.length||0) + (owned.scarves?.length||0) + (owned.hats?.length||0);
}

function CompanionAvatar({skin=0,outfitColor=0,accessory=0,mood='neutral',pose='idle',size=80}) {
  const COAT  = CAPY_COATS[skin]          ?? CAPY_COATS[0];
  const SCARF = OUTFIT_COLORS[outfitColor] ?? OUTFIT_COLORS[0];

  // Coat tint helpers — lighter for belly/muzzle, darker for shading
  const tint = (hex, amt, dir) => {
    const n=parseInt(hex.slice(1),16);
    const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    const m = dir==='lighter'
      ? v=>Math.min(255, Math.round(v + (255-v)*amt))
      : v=>Math.max(0,   Math.round(v*(1-amt)));
    return `#${[m(r),m(g),m(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
  };
  const BELLY   = tint(COAT, 0.35, 'lighter');
  const MUZZLE  = tint(COAT, 0.50, 'lighter');
  const SHADOW  = tint(COAT, 0.28, 'darker');
  const SCARFD  = tint(SCARF, 0.30, 'darker');

  const h = Math.round(size * 1.5);

  return (
    <svg width={size} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">

      {/* Ground shadow */}
      <ellipse cx="50" cy="143" rx="36" ry="4" fill="#000" opacity="0.13"/>

      {/* BACK LEGS — stubby cylinders peeking out behind body */}
      <ellipse cx="22" cy="132" rx="9"   ry="10"  fill={SHADOW}/>
      <ellipse cx="78" cy="132" rx="9"   ry="10"  fill={SHADOW}/>
      <ellipse cx="22" cy="140" rx="9"   ry="3.5" fill="#241608"/>
      <ellipse cx="78" cy="140" rx="9"   ry="3.5" fill="#241608"/>

      {/* BODY — chunky barrel */}
      <ellipse cx="50" cy="108" rx="38" ry="30" fill={COAT}/>
      {/* Top-of-back shading band */}
      <path d="M14 100 Q50 82 86 100" stroke={SHADOW} strokeWidth="1.4" fill="none" opacity="0.35"/>
      {/* Belly highlight */}
      <ellipse cx="50" cy="120" rx="26" ry="14" fill={BELLY} opacity="0.9"/>

      {/* FRONT LEGS */}
      {pose==='wave'?(
        <>
          <ellipse cx="36" cy="132" rx="7" ry="11" fill={SHADOW}/>
          <ellipse cx="36" cy="140" rx="7.5" ry="3.5" fill="#241608"/>
          {/* Right paw lifted in wave */}
          <path d="M68 118 Q80 96 78 70" stroke={COAT} strokeWidth="14" strokeLinecap="round" fill="none"/>
          <ellipse cx="78" cy="66" rx="9" ry="8" fill={COAT}/>
          <ellipse cx="78" cy="69" rx="6" ry="3" fill={BELLY} opacity="0.7"/>
        </>
      ):(
        <>
          <ellipse cx="36" cy="132" rx="7"   ry="11"  fill={SHADOW}/>
          <ellipse cx="64" cy="132" rx="7"   ry="11"  fill={SHADOW}/>
          <ellipse cx="36" cy="140" rx="7.5" ry="3.5" fill="#241608"/>
          <ellipse cx="64" cy="140" rx="7.5" ry="3.5" fill="#241608"/>
        </>
      )}

      {/* SCARF — wraps the neck between body + head */}
      <ellipse cx="50" cy="78" rx="34" ry="9" fill={SCARF}/>
      <ellipse cx="50" cy="76" rx="34" ry="2" fill={SCARFD} opacity="0.55"/>
      <path d="M68 84 Q80 96 74 110 L66 108 Q70 98 64 86 Z" fill={SCARF}/>
      <path d="M68 84 Q80 96 74 110" stroke={SCARFD} strokeWidth="0.7" fill="none" opacity="0.5"/>

      {/* EARS — tiny, on top corners of head, drawn before head so they tuck behind */}
      <ellipse cx="22" cy="18" rx="6" ry="5.5" fill={COAT}/>
      <ellipse cx="78" cy="18" rx="6" ry="5.5" fill={COAT}/>
      <ellipse cx="22" cy="20" rx="3" ry="2.5" fill={SHADOW} opacity="0.55"/>
      <ellipse cx="78" cy="20" rx="3" ry="2.5" fill={SHADOW} opacity="0.55"/>

      {/* HEAD — flat-topped rounded rectangle (capybara silhouette) */}
      <path d="M14 32 Q14 16 30 16 L70 16 Q86 16 86 32 L86 64 Q86 78 70 78 L30 78 Q14 78 14 64 Z" fill={COAT}/>
      {/* Top-of-head highlight */}
      <path d="M22 22 Q50 18 78 22" stroke={BELLY} strokeWidth="1" fill="none" opacity="0.45"/>

      {/* MUZZLE — wide lighter region across lower half */}
      <ellipse cx="50" cy="60" rx="30" ry="13" fill={MUZZLE} opacity="0.85"/>
      <ellipse cx="50" cy="72" rx="22" ry="3" fill="#000" opacity="0.06"/>

      {/* CHEEK BLUSH — only when happy/excited */}
      {(mood==='happy'||mood==='excited')&&(<>
        <ellipse cx="22" cy="58" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
        <ellipse cx="78" cy="58" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
      </>)}

      {/* BROWS — only on worried */}
      {mood==='worried'&&(<>
        <path d="M27 34 Q34 30 42 33" stroke={SHADOW} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M58 33 Q66 30 73 34" stroke={SHADOW} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      </>)}

      {/* EYES — small black dots with catchlight; excited = squinty, sleepy = closed */}
      {mood==='sleepy'?(
        <>
          <path d="M28 42 Q34 46 40 42" stroke="#1a0e08" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M60 42 Q66 46 72 42" stroke="#1a0e08" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <text x="78" y="22" fontSize="9"  fill={SHADOW} opacity="0.7" fontFamily="sans-serif" fontWeight="700">z</text>
          <text x="84" y="12" fontSize="11" fill={SHADOW} opacity="0.7" fontFamily="sans-serif" fontWeight="700">z</text>
        </>
      ):mood==='excited'?(
        <>
          <path d="M26 42 Q34 36 42 42" stroke="#1a0e08" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
          <path d="M58 42 Q66 36 74 42" stroke="#1a0e08" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
        </>
      ):(
        <>
          <ellipse cx="34" cy="42" rx="4.6" ry="5.2" fill="#1a0e08"/>
          <ellipse cx="66" cy="42" rx="4.6" ry="5.2" fill="#1a0e08"/>
          <circle cx="35.6" cy="40.6" r="1.4" fill="#fff"/>
          <circle cx="67.6" cy="40.6" r="1.4" fill="#fff"/>
        </>
      )}

      {/* NOSTRILS */}
      <ellipse cx="44" cy="58" rx="1.4" ry="1"   fill="#241608"/>
      <ellipse cx="56" cy="58" rx="1.4" ry="1"   fill="#241608"/>

      {/* MOUTH */}
      {mood==='excited'&&(
        <path d="M40 64 Q50 73 60 64 Q56 70 50 70 Q44 70 40 64 Z" fill="#241608"/>
      )}
      {mood==='happy'&&(
        <path d="M42 64 Q50 70 58 64" stroke="#241608" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      )}
      {mood==='neutral'&&(
        <path d="M44 65 L56 65" stroke="#241608" strokeWidth="1.6" strokeLinecap="round"/>
      )}
      {mood==='worried'&&(
        <path d="M42 67 Q46 63 50 67 Q54 63 58 67" stroke="#241608" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      )}
      {mood==='sleepy'&&(
        <ellipse cx="50" cy="66" rx="3" ry="1.6" fill="#241608" opacity="0.75"/>
      )}

      {/* ACCESSORIES — round Harry-Potter glasses */}
      {accessory===1&&(<>
        <circle cx="34" cy="42" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <circle cx="66" cy="42" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="42" y1="42" x2="58" y2="42" stroke="#1a1a1a" strokeWidth="1.8"/>
        <line x1="14" y1="40" x2="26" y2="42" stroke="#1a1a1a" strokeWidth="1.6"/>
        <line x1="86" y1="40" x2="74" y2="42" stroke="#1a1a1a" strokeWidth="1.6"/>
      </>)}

      {/* Graduation cap — mortarboard with tassel */}
      {accessory===2&&(<>
        <path d="M14 14 L50 4 L86 14 L50 22 Z" fill="#1a1a1a"/>
        <path d="M14 14 L50 22 L86 14" fill="none" stroke="#2a2a2a" strokeWidth="0.8"/>
        <rect x="46" y="11" width="8" height="6" fill="#1a1a1a"/>
        <line x1="78" y1="11" x2="86" y2="22" stroke="#fbbf24" strokeWidth="1.6"/>
        <circle cx="86" cy="23" r="2.6" fill="#fbbf24"/>
      </>)}

      {/* Beanie */}
      {accessory===3&&(<>
        <path d="M12 22 Q12 -2 50 -2 Q88 -2 88 22 L86 30 Q50 26 14 30 Z" fill="#2c3a4e"/>
        <path d="M10 28 Q50 22 90 28 L90 34 Q50 30 10 34 Z" fill="#1a2230"/>
        <circle cx="50" cy="-3" r="4.5" fill="#fbbf24"/>
        <line x1="30" y1="25" x2="30" y2="32" stroke="#1a2230" strokeWidth="0.6"/>
        <line x1="50" y1="25" x2="50" y2="32" stroke="#1a2230" strokeWidth="0.6"/>
        <line x1="70" y1="25" x2="70" y2="32" stroke="#1a2230" strokeWidth="0.6"/>
      </>)}

      {/* Headphones — band over ears + cans on the tiny ears */}
      {accessory===4&&(<>
        <path d="M14 26 Q14 2 50 2 Q86 2 86 26" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <rect x="10" y="18" width="14" height="20" rx="5" fill="#1a1a1a"/>
        <rect x="76" y="18" width="14" height="20" rx="5" fill="#1a1a1a"/>
        <rect x="13" y="22" width="8" height="12" rx="3" fill="#e74c3c"/>
        <rect x="79" y="22" width="8" height="12" rx="3" fill="#e74c3c"/>
      </>)}

      {/* Crown */}
      {accessory===5&&(<>
        <path d="M16 18 L22 4 L32 14 L42 2 L50 14 L58 2 L68 14 L78 4 L84 18 Z" fill="#fbbf24"/>
        <path d="M16 18 L84 18" stroke="#b78118" strokeWidth="1.2"/>
        <circle cx="22" cy="6" r="2"   fill="#ef4444"/>
        <circle cx="50" cy="6" r="2.4" fill="#3b82f6"/>
        <circle cx="78" cy="6" r="2"   fill="#22c55e"/>
      </>)}

      {/* Flower — tucked behind one ear */}
      {accessory===6&&(<>
        <circle cx="32" cy="14" r="3.5" fill="#ec4899"/>
        <circle cx="28" cy="10" r="3.5" fill="#ec4899"/>
        <circle cx="36" cy="10" r="3.5" fill="#ec4899"/>
        <circle cx="28" cy="18" r="3.5" fill="#ec4899"/>
        <circle cx="36" cy="18" r="3.5" fill="#ec4899"/>
        <circle cx="32" cy="14" r="2"   fill="#fbbf24"/>
      </>)}
    </svg>
  );
}

function getCompanionMood({sessions,scores,examSched,subjects}) {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  // Activity = any study action (timed session OR logged paper), not just the timer.
  const acts = [...sessions.map(s=>s.ts), ...scores.map(s=>s.ts??s.id)].filter(Boolean);
  const activeToday  = acts.some(t=>t>=todayStart.getTime());
  const activeRecent = acts.some(t=>t>=(todayStart.getTime()-86400000));
  const lastScore = scores.length?scores[scores.length-1]:null;
  const nextExamDays = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options))
    .map(e=>Math.ceil((new Date(e.date)-Date.now())/86400000))
    .filter(d=>d>=0).sort((a,b)=>a-b)[0]??999;
  if (nextExamDays<=3&&activeRecent) return 'excited';
  if (nextExamDays<=5&&!activeRecent) return 'worried';
  if (lastScore&&lastScore.pct>=80) return 'excited';
  if (lastScore&&lastScore.pct>=65) return 'happy';
  if (activeRecent) return 'happy';
  const hour = new Date().getHours();
  if ((hour>=23||hour<5) && !activeToday && nextExamDays>5) return 'sleepy';
  return 'neutral';
}

// Generate the mascot's contextual notifications from current state.
// Each has a stable ID so we can persist dismissed-set across visits.
function generateMascotNotifications({scores=[], sessions=[], subjects=[], examSched, coinsEarned=0, dismissed=[]}) {
  const out = [];
  const dset = new Set(dismissed);
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  // High score celebration on the most recent strong paper
  const recentScores = scores.filter(s => (s.ts||s.id) > now - 7*86400000);
  const topRecent = recentScores.slice().sort((a,b)=>b.pct-a.pct)[0];
  if (topRecent && topRecent.pct >= 80) {
    const id = `score_${topRecent.id || topRecent.ts}`;
    if (!dset.has(id)) out.push({id, kind:'celebrate',
      msg:`${Math.round(topRecent.pct)}% on ${topRecent.paper||topRecent.subject}. That's the work paying off.`});
  }

  // Exam within 7 days
  const nextExam = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options))
    .map(e=>({...e, days: Math.ceil((new Date(e.date).getTime()-now)/86400000)}))
    .filter(e=>e.days>=0 && e.days<=7).sort((a,b)=>a.days-b.days)[0];
  if (nextExam) {
    const id = `exam_${nextExam.code||nextExam.paper}_${nextExam.date}`;
    if (!dset.has(id)) out.push({id, kind:'warn',
      msg:`${(nextExam.paper||'Exam').split(':')[0]} is ${nextExam.days===0?'today':nextExam.days===1?'tomorrow':`in ${nextExam.days} days`}. Drill weak topics.`});
  }

  // Activity gap warning — counts any study action (paper logged, error logged,
  // timed session), so the warning never fires on a day the student did work.
  const acts = [...sessions.map(s=>s.ts), ...scores.map(s=>s.ts??s.id)].filter(Boolean);
  const activeToday = acts.some(t=>t>=todayStart.getTime());
  const lastActTs = acts.length ? Math.max(...acts) : 0;
  const daysSinceActive = lastActTs ? Math.floor((now-lastActTs)/86400000) : 999;
  if (lastActTs && daysSinceActive >= 3 && !activeToday) {
    const id = `gap_${todayStart.toISOString().slice(0,10)}`;
    if (!dset.has(id)) out.push({id, kind:'warn',
      msg:`Haven't seen you in ${daysSinceActive} days. Even 20 focused minutes today rebuilds momentum.`});
  }

  // Coin milestone (only highest unhit, descending)
  for (const milestone of [500, 250, 100]) {
    if (coinsEarned >= milestone) {
      const id = `coins_${milestone}`;
      if (!dset.has(id)) { out.push({id, kind:'info', msg:`${milestone}+ coins earned. Customise me in the shop.`}); break; }
    }
  }

  return out.slice(0, 3); // cap at 3 visible
}

function getCompanionMessage({mood,sessions,scores,subjects,examSched,name}) {
  const hour = new Date().getHours();
  const tod = hour<12?'Morning':hour<17?'Afternoon':'Evening';
  const nextExam = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options))
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

function CompanionCustomiser({companion,draft,setDraft,setCompanion,onSave,onCancel,C,font,coins=0,isPro=false,addToast=()=>{}}) {
  const owned = companion.owned || defaultOwned();
  const isOwned = (cat, idx) => (owned[cat]||[]).includes(idx);

  const buyItem = (cat, item) => {
    if (isOwned(cat, item.idx)) return; // already owned, no-op
    if (item.pro && !isPro) { addToast('This item is Pro-only — upgrade to unlock','info'); return; }
    if (coins < item.price) { addToast(`You need ${item.price - coins} more coin${item.price-coins===1?'':'s'}`,'info'); return; }
    setCompanion(p => ({
      ...p,
      spent_coins: (p.spent_coins||0) + item.price,
      owned: {
        ...(p.owned||defaultOwned()),
        [cat]: [...new Set([...((p.owned||defaultOwned())[cat]||[]), item.idx])],
      },
    }));
    addToast(`Bought ${item.name} (-${item.price} 🪙)`,'success');
  };
  const wearItem = (field, idx) => setCompanion(p => ({...p,[field]:idx}));

  const ShopTile = ({cat, item, field, swatchColor, label}) => {
    const owned = isOwned(cat, item.idx);
    const worn = companion[field] === item.idx;
    const canAfford = coins >= item.price;
    const locked = item.pro && !isPro;
    const onClick = owned ? () => wearItem(field, item.idx) : () => buyItem(cat, item);
    return (
      <button onClick={onClick}
        style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,
          padding:'8px 6px',borderRadius:10,minWidth:62,
          background: worn ? C.accentSoft : C.card2,
          border:`1.5px solid ${worn ? C.accent : C.border}`,
          cursor:'pointer',fontFamily:font,position:'relative',
          opacity: owned || (canAfford && !locked) ? 1 : 0.55}}>
        {swatchColor ? (
          <div style={{width:24,height:24,borderRadius:'50%',background:swatchColor,
            border:`1px solid ${C.border}`}}/>
        ) : (
          <div style={{fontSize:11,fontWeight:700,color:C.text,height:24,
            display:'flex',alignItems:'center'}}>{label||item.name}</div>
        )}
        <div style={{fontSize:9,color:C.muted,fontWeight:600,letterSpacing:0.2}}>
          {owned ? (worn ? 'WEARING' : 'OWNED')
            : locked ? 'PRO'
            : `${item.price}🪙`}
        </div>
        {locked && !owned && (
          <Lock size={9} strokeWidth={2.5} style={{position:'absolute',top:4,right:4,color:C.accent}}/>
        )}
      </button>
    );
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:320,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',
      backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div style={{background:C.surface,borderRadius:20,width:'100%',maxWidth:560,
        boxShadow:'0 24px 80px rgba(0,0,0,0.45)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'20px 22px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>Customise & shop</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
              <span style={{color:C.accent,fontWeight:700}}>{coins} 🪙</span> available
              {' · '}Earn 1 coin per minute studied + 5 per paper
            </div>
          </div>
          <button onClick={onCancel}
            style={{background:'transparent',border:'none',color:C.muted,cursor:'pointer',
              fontSize:20,lineHeight:1,padding:'2px 4px',borderRadius:6}}>✕</button>
        </div>

        <div style={{display:'flex',gap:0,overflow:'auto',flex:1}}>

          {/* Avatar preview */}
          <div style={{padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',
            gap:12,borderRight:`1px solid ${C.border}`,flexShrink:0,width:150}}>
            <CompanionAvatar
              skin={companion.skin} outfitColor={companion.outfitColor??0}
              accessory={companion.accessory??0} mood="happy" size={100}/>
            <input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={16}
              placeholder="Name" autoFocus onKeyDown={e=>e.key==='Enter'&&onSave()}
              style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,
                padding:'7px 10px',color:C.text,fontSize:13,fontFamily:font,outline:'none',
                width:'100%',boxSizing:'border-box',textAlign:'center',fontWeight:600}}/>
          </div>

          {/* Shop tiles */}
          <div style={{padding:'18px 18px',display:'flex',flexDirection:'column',gap:14,flex:1,overflow:'auto'}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.subtle,letterSpacing:0.5,
                textTransform:'uppercase',marginBottom:6}}>Coat</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {SHOP_COATS.map(it=>(
                  <ShopTile key={it.idx} cat="coats" item={it} field="skin" swatchColor={CAPY_COATS[it.idx]}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.subtle,letterSpacing:0.5,
                textTransform:'uppercase',marginBottom:6}}>Scarf</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {SHOP_SCARVES.map(it=>(
                  <ShopTile key={it.idx} cat="scarves" item={it} field="outfitColor" swatchColor={OUTFIT_COLORS[it.idx]}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.subtle,letterSpacing:0.5,
                textTransform:'uppercase',marginBottom:6}}>Hat</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {SHOP_HATS.map(it=>(
                  <ShopTile key={it.idx} cat="hats" item={it} field="accessory" label={it.name}/>
                ))}
              </div>
            </div>

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
    const saved = ls.get('rbp_companion',{name:'Caps',skin:0,outfitColor:0,accessory:0});
    return {skin:0,outfitColor:0,accessory:0,...saved};
  });
  const [editing,setEditing]     = useState(false);
  const [draft,setDraft]         = useState(companion.name);
  const [chatOpen,setChatOpen]   = useState(false);
  const mood    = getCompanionMood({sessions,scores,examSched,subjects});
  const message = getCompanionMessage({mood,sessions,scores,subjects,examSched,name:companion.name});
  const moodColor = {happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent,sleepy:'#64748b'}[mood]||C.accent;
  const moodLabel = {happy:'Happy',excited:'Pumped',worried:'Worried',neutral:'Ready',sleepy:'Sleepy'}[mood]||'Ready';

  const openEdit = () => { setDraft(companion.name); setEditing(true); };
  const save = () => {
    const c={...companion,name:draft.trim()||'Caps'};
    setCompanion(c); ls.set('rbp_companion',c); setEditing(false);
  };
  const cancel = () => {
    // revert any live-preview changes back to saved
    const saved=ls.get('rbp_companion',{name:'Caps',skin:0,outfitColor:0,accessory:0});
    setCompanion({skin:0,outfitColor:0,accessory:0,...saved});
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
          C={C} font={font}
          coins={computeCoins(scores, sessions, companion?.spent_coins||0).available}
          isPro={isPro}
          addToast={(msg,type)=>{}}/>
      )}
      {chatOpen&&(
        <CompanionChat companion={companion} subjects={subjects} scores={scores}
          sessions={sessions} examSched={examSched} rag={{}} examLevel="alevel"
          C={C} font={font}
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
    const next = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options))
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

function CompanionChat({companion,subjects,scores,sessions,examSched,rag={},examLevel='alevel',errors=[],targets={},C,font,onClose}) {
  ensureAnimStyles();
  const [messages,setMessages] = useState([{
    from:'char',
    text:`Hey, I'm ${companion.name}. What's on your mind? You can ask me anything — how you're doing, what to focus on, or just vent if you need to.`
  }]);
  const [input,setInput] = useState('');
  const [sending,setSending] = useState(false);
  const listRef = useRef(null);
  const mood = getCompanionMood({sessions,scores,examSched,subjects});
  useEffect(()=>{
    if(listRef.current) listRef.current.scrollTop=listRef.current.scrollHeight;
  },[messages,sending]);

  const send = async () => {
    const text=input.trim();
    if(!text||sending) return;
    if (text.length > 600) return; // ui caps input length; defensive (matches server CHAT_MSG_MAX_CHARS)
    const nextHistory = [...messages, {from:'user', text}];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    // Build FULL context — the whole study system so Caps can reason properly.
    // No PII (no real name, school, address) — just the student's revision data.
    const nowMs = Date.now();
    const GB = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
    const subjById = Object.fromEntries(subjects.map(s=>[s.id,s]));

    // Per-subject summary: scores, grades, projection, RAG, weak topics
    const subjSummary = subjects.map(s=>{
      const ss = [...scores].filter(x=>x.subject===s.name).sort((a,b)=>(a.ts||a.id)-(b.ts||b.id));
      const cnt = ss.length;
      const avg = cnt ? Math.round(ss.reduce((a,x)=>a+x.pct,0)/cnt) : null;
      const pred = predictedGrade(scores, s.name, GB);
      const topics = SPEC_TOPICS[s.id]||[];
      let r=0,a=0,g=0;
      topics.forEach((t,i)=>{ const v=rag[`${s.id}_${i}`]; if(v==='red')r++; else if(v==='amber')a++; else if(v==='green')g++; });
      const weak = topics.filter((t,i)=>rag[`${s.id}_${i}`]==='red').slice(0,5);
      return {
        name:s.name, papers:cnt,
        avg, grade: avg!=null?getSubjectGrade(avg,s.name,GB):null,
        best: cnt?Math.max(...ss.map(x=>x.pct)):null,
        latest: cnt?ss[cnt-1].pct:null,
        target: targets[s.name]||null,
        projected: pred?pred.grade:null, trend: pred?pred.trend:null,
        topicsRated:{red:r,amber:a,green:g}, weakTopics:weak,
      };
    });

    // Study time + streak
    const secsBySubj={}; let totalSecs=0, weekSecs=0;
    sessions.forEach(se=>{
      const t=se.ts??se.id; totalSecs+=se.secs||0;
      if(nowMs-t<7*86400000) weekSecs+=se.secs||0;
      const sub=subjById[se.subjectId]; if(sub) secsBySubj[sub.name]=(secsBySubj[sub.name]||0)+(se.secs||0);
    });
    const activeDays = studyActivityDays({sessions,scores,errors});
    let streak=0; { const d=new Date(); d.setHours(0,0,0,0); while(activeDays.has(d.getTime())){ streak++; d.setDate(d.getDate()-1); } }

    const upcoming = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options)
        .map(e=>({...e,subjectName:s.name})))
      .map(e=>({...e, d:Math.ceil((new Date(e.date)-nowMs)/86400000)}))
      .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d).slice(0,5)
      .map(e=>({paper:e.paper, subject:e.subjectName, date:e.date, daysAway:e.d}));

    const br = calcBattleReadiness(scores, errors);

    const ctx = {
      examLevel,
      battleReadiness: {score:br.total, label:br.label},
      overallAvg: scores.length ? Math.round(scores.reduce((a,s)=>a+s.pct,0)/scores.length) : null,
      totalPapers: scores.length,
      studyTime: {
        totalMins: Math.round(totalSecs/60),
        thisWeekMins: Math.round(weekSecs/60),
        streakDays: streak,
        perSubjectMins: Object.fromEntries(Object.entries(secsBySubj).map(([k,v])=>[k,Math.round(v/60)])),
      },
      subjects: subjSummary,
      recentErrors: errors.slice(0,8).map(e=>({subject:e.subject, topic:e.topic, type:e.type})),
      upcomingExams: upcoming,
      // legacy fields kept for backward-compat with the server context builder
      rag,
      scores: scores.slice(-3).map(s=>({subject:s.subject, pct:s.pct, grade:s.grade})),
      nextExam: upcoming[0] ? {paper:upcoming[0].paper, subject:upcoming[0].subject, date:upcoming[0].date} : null,
    };

    let replyText = null;
    let serverHit = false; // did we actually reach the chat server with a real reply?
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (session) {
        const r = await fetch('/api/mascot-chat', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
          body: JSON.stringify({ messages: nextHistory.slice(-8), context: ctx }),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.reply) { replyText = d.reply; serverHit = true; }
        } else if (r.status === 429) {
          const d = await r.json().catch(()=>({}));
          replyText = d.error || "I need a breather — too many messages this hour. Try again in a bit.";
          serverHit = true;
        } else if (r.status === 402) {
          replyText = "Mascot chat is a Pro feature. Upgrade in Account → Settings to unlock me properly.";
          serverHit = true;
        } else if (r.status === 503) {
          const d = await r.json().catch(()=>({}));
          replyText = `Chat is offline (${d.error || 'server not configured'}). I'll be back once that's fixed.`;
          serverHit = true;
        } else {
          const d = await r.json().catch(()=>({}));
          replyText = d.error ? `Chat error: ${d.error}` : null;
          if (replyText) serverHit = true;
        }
      }
    } catch {/* network failure — fall through */}

    // If the server didn't respond at all (no session, network down, or empty reply),
    // be honest about it rather than silently injecting a rule-based reply that
    // looks like a non-sequitur mid-conversation.
    if (!replyText) {
      replyText = "I'm having trouble reaching the chat server right now — try again in a moment, or refresh the page.";
    }

    setMessages(prev => [...prev, {from:'char', text: replyText}]);
    setSending(false);
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
                fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap'}}>
                {m.text}
              </div>
            </div>
          ))}
          {sending&&(
            <div style={{display:'flex',justifyContent:'flex-start'}}>
              <div style={{borderRadius:'14px 14px 14px 4px',padding:'10px 14px',
                background:C.card2,color:C.subtle,fontSize:13,fontStyle:'italic'}}>
                {companion.name} is typing…
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'4px 16px 0',fontSize:10,color:C.subtle,textAlign:'center',lineHeight:1.4}}>
          {companion.name} can make mistakes. Don't share personal info. If you're struggling, talk to someone real (Samaritans 116 123).
        </div>
        <div style={{display:'flex',gap:8,padding:'10px 16px 12px',
          borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value.slice(0,600))}
            onKeyDown={e=>e.key==='Enter'&&!sending&&send()}
            placeholder={sending?'Sending…':`Message ${companion.name}...`}
            maxLength={600}
            disabled={sending}
            style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,
              padding:'10px 14px',color:C.text,fontSize:13,fontFamily:font,outline:'none',
              opacity:sending?0.6:1}}/>
          <button onClick={send} disabled={sending||!input.trim()}
            style={{padding:'10px 18px',
              background:sending||!input.trim()?C.card2:C.accent,
              border:sending||!input.trim()?`1px solid ${C.border}`:'none',
              borderRadius:10,
              color:sending||!input.trim()?C.subtle:'#fff',
              fontSize:13,fontWeight:700,fontFamily:font,
              cursor:sending||!input.trim()?'not-allowed':'pointer'}}>
            Send
          </button>
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
        <h1 style={{...type.h1,color:C.text,margin:0}}>Your Milestones</h1>
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
    .flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options).map(e=>({...e,subjectName:s.name,color:s.color})))
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

function InsuranceEligibilityCard({ scores, uid, C, font, noted=false, setNoted=()=>{} }) {
  const [expanded, setExpanded] = useState(false);

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
          <button onClick={()=>{setNoted(true); setExpanded(false);}}
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
function TrendChart({scores, subject, subjectColors={}, gradeBoundaries={}, bgColor='#e8e4dd', textColor='#7a7268', targetGrade=null}) {
  const data=[...scores].filter(s=>s.subject===subject).reverse();
  if (data.length<2) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:120,fontSize:14,color:textColor}}>
      Need 2+ papers to show trend
    </div>
  );
  const W=480,H=110,PAD={t:10,r:16,b:28,l:36};
  const bounds=gradeBoundaries[subject]||{};
  // Linear regression for projection
  const n=data.length;
  const xMean=(n-1)/2;
  const yMean=data.reduce((a,d)=>a+d.pct,0)/n;
  let num=0,den=0;
  data.forEach((d,i)=>{ num+=(i-xMean)*(d.pct-yMean); den+=(i-xMean)**2; });
  const slope = den===0 ? 0 : num/den;
  const intercept = yMean - slope*xMean;
  const projectN = 2; // project 2 future papers
  const projPts = [];
  for (let i=n; i<n+projectN; i++) {
    projPts.push({i, pct:Math.max(0,Math.min(100, intercept+slope*i))});
  }
  const allPcts = [...data.map(d=>d.pct), ...projPts.map(p=>p.pct)];
  const targetPct = targetGrade ? (bounds[targetGrade]||null) : null;
  if (targetPct) allPcts.push(targetPct);
  const minY=Math.max(0,Math.min(...allPcts)-10);
  const maxY=Math.min(100,Math.max(...allPcts)+10);
  const col=subjectColors[subject]||'#888';
  const totalLen = n + projectN - 1;
  const xScale=i=>PAD.l+(i/totalLen)*(W-PAD.l-PAD.r);
  const yScale=v=>PAD.t+(1-(v-minY)/(maxY-minY))*(H-PAD.t-PAD.b);
  const pts=data.map((d,i)=>([xScale(i),yScale(d.pct)]));
  const polyline=pts.map(p=>p.join(',')).join(' ');
  const areaPath=`M ${pts[0][0]},${yScale(minY)} L ${pts.map(p=>p.join(',')).join(' L ')} L ${pts[pts.length-1][0]},${yScale(minY)} Z`;
  // Projection points (start from last actual)
  const projLine = [pts[pts.length-1], ...projPts.map(p=>[xScale(p.i), yScale(p.pct)])];
  const projPoly = projLine.map(p=>p.join(',')).join(' ');
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
      {targetPct&&(()=>{
        const ty=yScale(targetPct);
        return (
          <g>
            <line x1={PAD.l} y1={ty} x2={W-PAD.r} y2={ty} stroke={gradeColor(targetGrade)} strokeWidth="1.5" strokeDasharray="2 4" opacity="0.7"/>
            <text x={PAD.l+2} y={ty-3} fill={gradeColor(targetGrade)} fontSize="8" fontWeight="700">Target {targetGrade}</text>
          </g>
        );
      })()}
      {[minY,Math.round((minY+maxY)/2),maxY].map(v=>(
        <text key={v} x={PAD.l-4} y={yScale(v)+4} fill={textColor} fontSize="8" textAnchor="end">{Math.round(v)}%</text>
      ))}
      <path d={areaPath} fill={col} opacity="0.06"/>
      <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Projection line */}
      <polyline points={projPoly} fill="none" stroke={col} strokeWidth="1.8" strokeDasharray="4 3" opacity="0.55" strokeLinejoin="round"/>
      {projPts.map((p,i)=>(
        <circle key={`pr_${i}`} cx={xScale(p.i)} cy={yScale(p.pct)} r="3" fill="none" stroke={col} strokeWidth="1.5" opacity="0.65"/>
      ))}
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill={col} stroke={bgColor} strokeWidth="1.5"/>
          <text x={p[0]} y={H-PAD.b+10} fill={textColor} fontSize="7" textAnchor="middle">
            {data[i].date?.split(' ').slice(0,2).join(' ')||`P${i+1}`}
          </text>
        </g>
      ))}
      {/* Projection label */}
      <text x={xScale(totalLen)-2} y={H-PAD.b+10} fill={col} fontSize="7" textAnchor="end" opacity="0.75" fontWeight="700">Proj.</text>
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
function Schedule({subjects, scores, errors, uid, C, font, examSched=EXAM_SCHEDULE, rag={}, targets={}, myPlan=[], setMyPlan=()=>{}}) {
  const [dayIdx, setDayIdx] = useState(0);
  const days = generateSchedule(subjects, scores, errors, examSched, rag, targets);
  const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const stripRef = useRef(null);

  const day = days[dayIdx];
  const dayKey = day.date.toISOString().slice(0,10);
  const dayItems = myPlan.filter(p=>p.date===dayKey);

  const addItem = (subjectId, subjectName, color, topic, durationMin, note) => {
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    setMyPlan(prev=>[...prev,{
      id, date:dayKey, subjectId, subjectName, color,
      topic: topic||'',
      duration_min: durationMin||null,
      note: note||'',
      done: false,
    }]);
  };
  const toggleDone = (id) => setMyPlan(prev=>prev.map(p=>p.id===id?{...p,done:!p.done}:p));
  const [showAdd, setShowAdd] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftDuration, setDraftDuration] = useState('30');
  const openAdd = () => {
    setDraftSubject(subjects[0]?.id || '');
    setDraftTopic(''); setDraftNote(''); setDraftDuration('30');
    setShowAdd(true);
  };
  const submitAdd = () => {
    const subj = subjects.find(s=>s.id===draftSubject);
    const dur = parseInt(draftDuration,10)||null;
    addItem(
      draftSubject || 'custom',
      subj?.name || (draftSubject ? draftSubject : 'Custom task'),
      subj?.color || '#9ca3af',
      draftTopic,
      dur,
      draftNote,
    );
    setShowAdd(false);
  };
  const removeItem = (id) => setMyPlan(prev=>prev.filter(p=>p.id!==id));
  const dateLabel = dayIdx===0 ? 'Today'
    : dayIdx===1 ? 'Tomorrow'
    : `${DAY_NAMES[day.date.getDay()]} ${day.date.getDate()} ${MONTH_NAMES[day.date.getMonth()]}`;
  const fullDate = `${DAY_NAMES[day.date.getDay()]}, ${day.date.getDate()} ${MONTH_NAMES[day.date.getMonth()]}`;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div>
        <h1 style={{...type.h1,color:C.text,margin:'0 0 4px'}}>Plan</h1>
        <p style={{...type.caption,color:C.muted,margin:0}}>Ranked by exam urgency and your weak areas.</p>
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
              style={{flexShrink:0,padding:'7px 12px',borderRadius:6,cursor:'pointer',
                fontFamily:font,fontSize:12,fontWeight:sel?600:500,whiteSpace:'nowrap',
                background: sel ? C.text : 'transparent',
                border:`1px solid ${sel?C.text:C.border}`,
                color: sel ? C.bg : C.muted,
                transition:'all 0.12s',display:'flex',alignItems:'center',gap:5}}>
              {isExam&&<span style={{width:5,height:5,borderRadius:'50%',background:C.warn,flexShrink:0}}/>}
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Selected day card */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'13px 16px',borderBottom:`1px solid ${C.border}`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{...type.h3,color:C.text}}>{dateLabel}</div>
            {dayIdx!==0&&<div style={{...type.caption,color:C.muted,marginTop:1}}>{fullDate}</div>}
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
              {/* My plan for this day */}
              {dayItems.length>0&&(
                <div style={{marginBottom:18}}>
                  <div style={{...type.eyebrow,color:C.subtle,marginBottom:6}}>
                    My plan · {dayItems.filter(p=>p.done).length}/{dayItems.length}
                  </div>
                  <div>
                    {dayItems.map(p=>(
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,
                        padding:'10px 0',borderTop:`1px solid ${C.border}`,
                        opacity:p.done?0.5:1,transition:'opacity 0.15s'}}>
                        <button onClick={()=>toggleDone(p.id)}
                          aria-label={p.done?'Mark not done':'Mark done'}
                          style={{width:18,height:18,borderRadius:'50%',
                            border:`2px solid ${p.color}`,background:p.done?p.color:'transparent',
                            cursor:'pointer',padding:0,flexShrink:0,display:'flex',alignItems:'center',
                            justifyContent:'center',fontSize:11,color:'#fff',fontWeight:900,lineHeight:1}}>
                          {p.done?'✓':''}
                        </button>
                        <div style={{flex:1,minWidth:0,fontSize:13,color:C.text,
                          textDecoration:p.done?'line-through':'none'}}>
                          <span style={{fontWeight:600}}>{p.subjectName}</span>
                          {p.topic&&<span style={{color:C.muted,marginLeft:6,fontSize:12}}>· {p.topic}</span>}
                          {p.duration_min&&<span style={{color:C.subtle,marginLeft:6,fontSize:11}}>· {p.duration_min}m</span>}
                          {p.note&&(
                            <div style={{fontSize:11,color:C.muted,marginTop:3,lineHeight:1.4,
                              whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{p.note}</div>
                          )}
                        </div>
                        <button onClick={()=>removeItem(p.id)}
                          style={{background:'transparent',border:'none',color:C.subtle,
                            cursor:'pointer',fontSize:14,padding:'0 4px',lineHeight:1}}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{...type.eyebrow,color:C.subtle}}>Suggested focus</div>
                <button onClick={openAdd}
                  style={{fontSize:12,fontWeight:600,fontFamily:font,
                    padding:'5px 11px',background:'transparent',color:C.accent,
                    border:`1px solid ${C.accent}55`,borderRadius:6,cursor:'pointer'}}>
                  + Add task
                </button>
              </div>
              <div>
                {day.slots.map((s,j)=>{
                  const alreadyAdded = dayItems.some(p=>p.subjectId===s.id && !p.topic);
                  return (
                  <div key={j} style={{padding:'12px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                      <div style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{s.name}</div>
                      <button onClick={()=>addItem(s.id,s.name,s.color,'')}
                        disabled={alreadyAdded}
                        style={{padding:'5px 11px',fontSize:11,fontWeight:700,fontFamily:font,
                          background:alreadyAdded?'transparent':`${s.color}22`,
                          color:alreadyAdded?C.subtle:s.color,
                          border:`1px solid ${alreadyAdded?C.border:s.color+'66'}`,
                          borderRadius:6,cursor:alreadyAdded?'default':'pointer',
                          transition:'all 0.12s',whiteSpace:'nowrap'}}>
                        {alreadyAdded?'✓ Added':'+ Add to plan'}
                      </button>
                    </div>
                    {s.redTopics?.length>0&&(
                      <div style={{marginTop:7,marginLeft:15,display:'flex',flexDirection:'column',gap:3}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#ef4444',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2}}>
                          Weak spots to drill
                        </div>
                        {s.redTopics.slice(0,2).map((t,k)=>{
                          const topicAdded = dayItems.some(p=>p.subjectId===s.id && p.topic===t);
                          return (
                          <div key={k} style={{fontSize:12,color:C.muted,display:'flex',alignItems:'center',gap:5}}>
                            <span style={{color:'#ef4444',fontSize:9}}>●</span>
                            <span style={{flex:1}}>{t}</span>
                            <button onClick={()=>addItem(s.id,s.name,s.color,t)}
                              disabled={topicAdded}
                              style={{padding:'2px 8px',fontSize:10,fontWeight:600,fontFamily:font,
                                background:topicAdded?'transparent':`${s.color}18`,
                                color:topicAdded?C.subtle:s.color,
                                border:`1px solid ${topicAdded?C.border:s.color+'44'}`,
                                borderRadius:4,cursor:topicAdded?'default':'pointer',whiteSpace:'nowrap'}}>
                              {topicAdded?'✓':'+ Plan'}
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                    {s.gapBoost>0&&(
                      <div style={{marginTop:6,marginLeft:15,fontSize:11,color:'#f59e0b',display:'flex',alignItems:'center',gap:4}}>
                        <span style={{fontSize:9}}>▲</span>
                        On track for <strong style={{margin:'0 2px'}}>{s.predGrade}</strong>, target <strong style={{margin:'0 2px'}}>{s.targetGrade}</strong> — boosted priority
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              {dayIdx===0&&(
                <div style={{marginTop:14,fontSize:12,color:C.subtle,lineHeight:1.6}}>
                  Priority order: exam urgency + weak scores + red RAG topics + predicted vs target gap.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add-task modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.55)',
          display:'flex',alignItems:'center',justifyContent:'center',padding:16,
          backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)'}}
          onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,width:'100%',maxWidth:420,
            boxShadow:'0 12px 40px rgba(0,0,0,0.25)',padding:'22px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{...type.h3,color:C.text}}>Add task to plan</div>
              <button onClick={()=>setShowAdd(false)}
                style={{background:'transparent',border:'none',color:C.muted,
                  cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>For {dateLabel}</div>

            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.subtle,letterSpacing:0.4,
                  textTransform:'uppercase',display:'block',marginBottom:5}}>
                  Subject
                </label>
                <select value={draftSubject} onChange={e=>setDraftSubject(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 11px',
                    background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                    color:C.text,fontSize:13,fontFamily:font,outline:'none'}}>
                  {subjects.map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
                  <option value="custom">Custom (not a subject)</option>
                </select>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.subtle,letterSpacing:0.4,
                  textTransform:'uppercase',display:'block',marginBottom:5}}>
                  Topic <span style={{color:C.subtle,fontWeight:400}}>(optional)</span>
                </label>
                <input value={draftTopic} onChange={e=>setDraftTopic(e.target.value)}
                  placeholder="e.g. Differentiation rules"
                  maxLength={60}
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 11px',
                    background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                    color:C.text,fontSize:13,fontFamily:font,outline:'none'}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.subtle,letterSpacing:0.4,
                  textTransform:'uppercase',display:'block',marginBottom:5}}>
                  Duration (minutes)
                </label>
                <input value={draftDuration} onChange={e=>setDraftDuration(e.target.value.replace(/[^0-9]/g,''))}
                  inputMode="numeric" maxLength={3} placeholder="30"
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 11px',
                    background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                    color:C.text,fontSize:13,fontFamily:font,outline:'none'}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.subtle,letterSpacing:0.4,
                  textTransform:'uppercase',display:'block',marginBottom:5}}>
                  Note <span style={{color:C.subtle,fontWeight:400}}>(optional)</span>
                </label>
                <textarea value={draftNote} onChange={e=>setDraftNote(e.target.value)}
                  placeholder="Anything to remember…"
                  maxLength={200} rows={3}
                  style={{width:'100%',boxSizing:'border-box',padding:'9px 11px',
                    background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                    color:C.text,fontSize:13,fontFamily:font,outline:'none',resize:'vertical'}}/>
              </div>

              <div style={{display:'flex',gap:8,marginTop:6}}>
                <button onClick={submitAdd}
                  style={{flex:1,padding:'10px',background:C.accent,border:'none',
                    borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,
                    fontFamily:font,cursor:'pointer'}}>
                  Add to plan
                </button>
                <button onClick={()=>setShowAdd(false)}
                  style={{padding:'10px 16px',background:'transparent',
                    border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,
                    fontSize:13,fontFamily:font,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Share readiness card ────────────────────────────────────────────────────
const SHARE_THEMES = {
  dark:  { bg:'#0d0f16', glow1:'rgba(194,124,96,0.2)', glow2:'rgba(90,110,200,0.07)', text:'rgba(255,255,255,0.48)', mute:'rgba(255,255,255,0.22)', divider:'rgba(255,255,255,0.07)', track:'rgba(255,255,255,0.07)' },
  light: { bg:'#f5f1ea', glow1:'rgba(194,124,96,0.18)', glow2:'rgba(60,80,180,0.05)',  text:'rgba(30,30,30,0.70)',   mute:'rgba(30,30,30,0.38)',   divider:'rgba(0,0,0,0.10)',   track:'rgba(0,0,0,0.08)' },
  glow:  { bg:'#0a0820', glow1:'rgba(180,90,255,0.30)', glow2:'rgba(0,200,255,0.18)',  text:'rgba(255,255,255,0.62)', mute:'rgba(255,255,255,0.32)', divider:'rgba(255,255,255,0.10)', track:'rgba(255,255,255,0.10)' },
};

function ShareReadinessCard({br, subjects, scores, C, font, shareTheme='dark', setShareTheme=()=>{}, shareAspect='landscape', setShareAspect=()=>{}}) {
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
      const DEG=Math.PI/180;
      const story = shareAspect==='story';
      const W = story ? 1080 : 600;
      const H = story ? 1920 : 315;
      const P = SHARE_THEMES[shareTheme] || SHARE_THEMES.dark;
      canvas.width=W; canvas.height=H;

      // ── BACKGROUND ──
      ctx.fillStyle=P.bg;
      ctx.fillRect(0,0,W,H);
      const bgG=ctx.createRadialGradient(0,H,0,0,H,W*0.9);
      bgG.addColorStop(0,P.glow1);
      bgG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bgG; ctx.fillRect(0,0,W,H);
      const bgG2=ctx.createRadialGradient(W,0,0,W,0,W*0.55);
      bgG2.addColorStop(0,P.glow2);
      bgG2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bgG2; ctx.fillRect(0,0,W,H);

      // Accent bar
      const barG=story
        ? ctx.createLinearGradient(0,0,W,0)
        : ctx.createLinearGradient(0,0,0,H);
      barG.addColorStop(0,br.labelColor+'ff');
      barG.addColorStop(1,br.labelColor+'33');
      ctx.fillStyle=barG;
      if (story) ctx.fillRect(0,0,W,8);
      else ctx.fillRect(0,0,4,H);

      const pct=Math.min(Math.max(br.total,0),100)/100;

      if (story) {
        // ── STORY LAYOUT: 1080x1920 ──
        // Top: brand
        ctx.textAlign='center';
        ctx.fillStyle=br.labelColor;
        ctx.font="800 56px system-ui,-apple-system,sans-serif";
        ctx.fillText('A* Battle Plan',W/2,160);
        ctx.fillStyle=P.mute;
        ctx.font="500 22px system-ui,-apple-system,sans-serif";
        ctx.fillText('A* REVISION TRACKER  ·  BEATTHEEXAM.ORG',W/2,200);

        // Big circular gauge
        const GX=W/2, GY=560, GR=240;
        const startA=210*DEG, sweepA=240*DEG;
        ctx.beginPath(); ctx.arc(GX,GY,GR+6,startA,startA+sweepA*pct);
        ctx.strokeStyle=br.labelColor+'22'; ctx.lineWidth=72; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(GX,GY,GR,startA,startA+sweepA);
        ctx.strokeStyle=P.track; ctx.lineWidth=42; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(GX,GY,GR,startA,startA+sweepA*pct);
        ctx.strokeStyle=br.labelColor; ctx.lineWidth=42; ctx.lineCap='round'; ctx.stroke();

        ctx.textAlign='center';
        ctx.fillStyle=br.labelColor;
        ctx.font="900 220px system-ui,-apple-system,sans-serif";
        ctx.fillText(`${br.total}`,GX,GY+50);
        ctx.font="800 64px system-ui,-apple-system,sans-serif";
        ctx.fillStyle=br.labelColor+'cc';
        ctx.fillText('%',GX+ctx.measureText(`${br.total}`).width/2+50,GY-80);

        ctx.fillStyle=P.mute;
        ctx.font="700 26px system-ui,-apple-system,sans-serif";
        ctx.fillText('BATTLE READINESS',GX,GY+170);
        ctx.fillStyle=br.labelColor;
        ctx.font="900 50px system-ui,-apple-system,sans-serif";
        ctx.fillText(br.label.toUpperCase(),GX,GY+230);

        // Divider
        ctx.strokeStyle=P.divider; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(120,1020); ctx.lineTo(W-120,1020); ctx.stroke();

        // Subject list (up to 5)
        ctx.textAlign='left';
        ctx.fillStyle=P.mute;
        ctx.font="700 24px system-ui,-apple-system,sans-serif";
        ctx.fillText('SUBJECTS',120,1080);

        const subList=subjects.filter(s=>subjectAvg(s.name)!==null).slice(0,5);
        let sy=1160;
        for (const s of subList) {
          const avg=subjectAvg(s.name);
          ctx.fillStyle=s.color;
          ctx.beginPath(); ctx.arc(140,sy,12,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=P.text;
          ctx.font="600 32px system-ui,-apple-system,sans-serif";
          ctx.textAlign='left';
          ctx.fillText(s.name.length>22?s.name.slice(0,21)+'…':s.name,170,sy+10);
          ctx.fillStyle=s.color;
          ctx.font="800 34px system-ui,-apple-system,sans-serif";
          ctx.textAlign='right';
          ctx.fillText(`${avg}%`,W-120,sy+10);
          const bx=170,by=sy+28,bw=W-120-170,bh=10;
          ctx.fillStyle=P.track; ctx.fillRect(bx,by,bw,bh);
          ctx.fillStyle=s.color+'cc'; ctx.fillRect(bx,by,bw*avg/100,bh);
          sy+=104;
        }

        // CTA
        ctx.textAlign='center';
        ctx.fillStyle=br.labelColor+'22';
        ctx.fillRect(W/2-280,H-220,560,100);
        ctx.fillStyle=br.labelColor;
        ctx.font="800 38px system-ui,-apple-system,sans-serif";
        ctx.fillText('Track yours: beattheexam.org',W/2,H-156);

        ctx.fillStyle=P.mute;
        ctx.font="500 22px system-ui,-apple-system,sans-serif";
        ctx.fillText('Tracked with A* Battle Plan',W/2,H-50);
      } else {
        // ── LANDSCAPE LAYOUT: 600x315 ──
        const GX=118, GY=158, GR=74;
        const startA=210*DEG, sweepA=240*DEG;

        ctx.beginPath(); ctx.arc(GX,GY,GR+2,startA,startA+sweepA*pct);
        ctx.strokeStyle=br.labelColor+'20'; ctx.lineWidth=22; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(GX,GY,GR,startA,startA+sweepA);
        ctx.strokeStyle=P.track; ctx.lineWidth=13; ctx.lineCap='round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(GX,GY,GR,startA,startA+sweepA*pct);
        ctx.strokeStyle=br.labelColor; ctx.lineWidth=13; ctx.lineCap='round'; ctx.stroke();

        ctx.textAlign='center';
        ctx.font="900 68px system-ui,-apple-system,sans-serif";
        ctx.fillStyle=br.labelColor;
        ctx.fillText(`${br.total}`,GX,GY+12);
        const sW=ctx.measureText(`${br.total}`).width;
        ctx.font="700 20px system-ui,-apple-system,sans-serif";
        ctx.textAlign='left'; ctx.fillStyle=br.labelColor+'88';
        ctx.fillText('%',GX+sW/2+3,GY-18);

        ctx.textAlign='center';
        ctx.fillStyle=P.mute;
        ctx.font="600 9px system-ui,-apple-system,sans-serif";
        ctx.fillText('BATTLE READINESS',GX,GY+42);
        ctx.fillStyle=br.labelColor;
        ctx.font="800 13px system-ui,-apple-system,sans-serif";
        ctx.fillText(br.label.toUpperCase(),GX,GY+59);

        ctx.strokeStyle=P.divider; ctx.lineWidth=1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(228,22); ctx.lineTo(228,H-22); ctx.stroke();

        ctx.textAlign='left';
        ctx.fillStyle=br.labelColor;
        ctx.font="800 16px system-ui,-apple-system,sans-serif";
        ctx.fillText('A* Battle Plan',246,44);
        ctx.fillStyle=P.mute;
        ctx.font="500 9px system-ui,-apple-system,sans-serif";
        ctx.fillText('A* REVISION TRACKER  ·  BEATTHEEXAM.ORG',246,59);

        ctx.strokeStyle=P.divider;
        ctx.beginPath(); ctx.moveTo(246,68); ctx.lineTo(W-18,68); ctx.stroke();

        const subList=subjects.filter(s=>subjectAvg(s.name)!==null).slice(0,4);
        let sy=84;
        for (const s of subList) {
          const avg=subjectAvg(s.name);
          ctx.fillStyle=s.color;
          ctx.beginPath(); ctx.arc(252,sy,5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=P.text;
          ctx.font="500 11px system-ui,-apple-system,sans-serif";
          ctx.textAlign='left';
          ctx.fillText(s.name.length>23?s.name.slice(0,22)+'…':s.name,264,sy+4);
          ctx.fillStyle=s.color;
          ctx.font="700 12px system-ui,-apple-system,sans-serif";
          ctx.textAlign='right';
          ctx.fillText(`${avg}%`,W-20,sy+4);
          const bx=264,by=sy+10,bw=W-20-264-46,bh=4;
          ctx.fillStyle=P.track; ctx.fillRect(bx,by,bw,bh);
          ctx.fillStyle=s.color+'bb'; ctx.fillRect(bx,by,bw*avg/100,bh);
          sy+=34;
        }

        ctx.strokeStyle=P.divider;
        ctx.beginPath(); ctx.moveTo(0,H-24); ctx.lineTo(W,H-24); ctx.stroke();
        ctx.fillStyle=P.mute;
        ctx.font="500 9px system-ui,-apple-system,sans-serif";
        ctx.textAlign='left';
        ctx.fillText('Tracked with A* Battle Plan',8,H-8);
        ctx.textAlign='right';
        ctx.fillText('beattheexam.org',W-8,H-8);
      }

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
          {/* Theme picker */}
          <div style={{display:'flex',gap:3,padding:2,background:C.card2,border:`1px solid ${C.border}`,borderRadius:8}}>
            {['dark','light','glow'].map(t=>(
              <button key={t} onClick={()=>{setShareTheme(t); if(generated) setTimeout(drawCard,0);}}
                style={{padding:'4px 9px',border:'none',borderRadius:6,cursor:'pointer',
                  fontSize:10,fontWeight:700,fontFamily:font,textTransform:'uppercase',letterSpacing:0.5,
                  background:shareTheme===t?C.accent:'transparent',
                  color:shareTheme===t?'#fff':C.muted}}>
                {t}
              </button>
            ))}
          </div>
          {/* Aspect toggle */}
          <div style={{display:'flex',gap:3,padding:2,background:C.card2,border:`1px solid ${C.border}`,borderRadius:8}}>
            {[['landscape','Post'],['story','Story']].map(([k,l])=>(
              <button key={k} onClick={()=>{setShareAspect(k); if(generated) setTimeout(drawCard,0);}}
                style={{padding:'4px 9px',border:'none',borderRadius:6,cursor:'pointer',
                  fontSize:10,fontWeight:700,fontFamily:font,letterSpacing:0.3,
                  background:shareAspect===k?C.accent:'transparent',
                  color:shareAspect===k?'#fff':C.muted}}>
                {l}
              </button>
            ))}
          </div>
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
function Analytics({subjects, scores, errors, uid, C, font, examSched=EXAM_SCHEDULE, onQuickLog, targets, setTargets, sessions=[], rag={}, isPro=false, onUpgrade, isGcse=false, isAS=false, insNoted=false, setInsNoted=()=>{}, shareTheme='dark', setShareTheme=()=>{}, shareAspect='landscape', setShareAspect=()=>{}}) {
  const SUBJ_COLORS  = Object.fromEntries(subjects.map(s=>[s.name,s.color]));
  const GRADE_BOUNDS = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));

  const [chartSubject,setChartSubject] = useState(subjects[0]?.name??'');

  const br = calcBattleReadiness(scores, errors);
  const now = Date.now();

  // ── Time helpers ──────────────────────────────────────────────────────────
  const fmtMins = secs => {
    const m = Math.round(secs/60);
    if (m < 60) return `${m}m`;
    const h = m/60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  };
  const subjById = Object.fromEntries(subjects.map(s=>[s.id,s]));
  const sessTs   = x => x.ts ?? x.id;
  const totalSecs = sessions.reduce((a,s)=>a+(s.secs||0),0);
  const weekSecs  = sessions.filter(s=>now-sessTs(s)<7*86400000).reduce((a,s)=>a+(s.secs||0),0);
  const secsBySubj = {};
  sessions.forEach(s=>{ const sub=subjById[s.subjectId]; if(sub) secsBySubj[sub.name]=(secsBySubj[sub.name]||0)+(s.secs||0); });

  // ── Per-subject rollup (the analytical core) ──────────────────────────────
  const rows = subjects.map(s=>{
    const ss   = [...scores].filter(x=>x.subject===s.name).sort((a,b)=>(a.ts||a.id)-(b.ts||b.id));
    const cnt  = ss.length;
    const avg  = cnt ? Math.round(ss.reduce((a,x)=>a+x.pct,0)/cnt) : null;
    const grade= avg!=null ? getSubjectGrade(avg, s.name, GRADE_BOUNDS) : null;
    const target = targets[s.name] || (isGcse?'9':isAS?'A':'A*');
    const targetPct = (s.gradeBoundaries?.[target]) || 80;
    const progress  = avg!=null ? Math.min(100,Math.round((avg/targetPct)*100)) : 0;
    const trend = cnt>=2 ? ss[cnt-1].pct - ss[cnt-2].pct : null;
    const pred  = predictedGrade(scores, s.name, GRADE_BOUNDS);
    const timeSecs = secsBySubj[s.name] || 0;
    const timeShare = totalSecs>0 ? timeSecs/totalSecs : 0;
    const gap = avg!=null ? avg - targetPct : null;           // +ve = above target
    return {s, ss, cnt, avg, grade, target, targetPct, progress, trend, pred, timeSecs, timeShare, gap};
  });

  // ── Headline stats ────────────────────────────────────────────────────────
  const overallAvg = scores.length ? Math.round(scores.reduce((a,s)=>a+s.pct,0)/scores.length) : null;
  const onTarget   = rows.filter(r=>r.avg!=null && r.gap!=null && r.gap>=0).length;
  const ratedSubs  = rows.filter(r=>r.avg!=null).length;

  // Activity / streak (counts every kind of study action, not just the timer)
  const activeDays = studyActivityDays({sessions,scores,errors});
  let streak=0; { const d=new Date(); d.setHours(0,0,0,0); while(activeDays.has(d.getTime())){ streak++; d.setDate(d.getDate()-1); } }
  const weekBars=[];
  for(let w=7; w>=0; w--){
    const end=new Date(); end.setHours(0,0,0,0); end.setDate(end.getDate()-w*7);
    const start=new Date(end); start.setDate(start.getDate()-6);
    let days=0; activeDays.forEach(t=>{ if(t>=start.getTime() && t<=end.getTime()) days++; });
    weekBars.push(days);
  }

  // Next exam
  const allUpcoming = subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options))
    .map(e=>({...e,d:Math.ceil((new Date(e.date)-now)/86400000)}))
    .filter(e=>e.d>=0).sort((a,b)=>a.d-b.d);
  const nextExam = allUpcoming[0] || null;
  const isOffSeason = allUpcoming.length===0 || allUpcoming[0].d>90;

  // Biggest mover (largest single-subject trend, needs >=2 papers)
  const movers = rows.filter(r=>r.trend!=null).sort((a,b)=>Math.abs(b.trend)-Math.abs(a.trend));
  const topMover = movers[0] || null;

  // Under-invested: below target AND a below-average slice of study time
  const evenShare = subjects.length ? 1/subjects.length : 0;
  const underInvested = rows.filter(r=>r.avg!=null && r.gap!=null && r.gap<-3 && (totalSecs===0 || r.timeShare<evenShare*0.8))
    .sort((a,b)=>a.gap-b.gap);

  // Error hotspots — last 21 days, grouped by topic (fallback subject)
  const recentErrs = errors.filter(e=>now-(e.ts||e.id)<21*86400000);
  const hotMap={}; recentErrs.forEach(e=>{ const k=(e.topic&&e.topic.trim())||e.subject||'General'; hotMap[k]=(hotMap[k]||0)+1; });
  const hotspots = Object.entries(hotMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const hour = new Date().getHours();
  const greeting = hour<5?'Night ops':hour<12?'Morning briefing':hour<17?'Afternoon briefing':'Evening briefing';

  const cardSx = {background:C.surface,border:`1px solid ${C.border}`,borderRadius:10};
  const Eyebrow = ({children}) => <div style={{...type.eyebrow,color:C.subtle,marginBottom:12}}>{children}</div>;

  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={{...type.eyebrow,color:C.accent,marginBottom:6}}>
          {isOffSeason?'Foundation Mode':greeting}
        </div>
        <h1 style={{...type.h1,color:C.text,margin:0}}>Performance</h1>
        <p style={{...type.caption,color:C.muted,margin:'4px 0 0'}}>
          {scores.length===0
            ? 'Log your first past paper to start building your picture.'
            : isOffSeason
              ? (nextExam ? `${nextExam.d} days to first exam. Build the habits now.` : 'Off-season — build the foundation.')
              : 'Where you stand across every subject, right now.'}
        </p>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
        {[
          {l:'Avg score', v: overallAvg!=null?`${overallAvg}%`:'—', sub:`${scores.length} paper${scores.length===1?'':'s'}`, c:C.text},
          {l:'On target', v: ratedSubs?`${onTarget}/${ratedSubs}`:'—', sub:'subjects at/above', c: ratedSubs&&onTarget===ratedSubs?(C.success||'#22c55e'):C.text},
          {l:'Study time', v: totalSecs?fmtMins(totalSecs):'0m', sub:`${fmtMins(weekSecs)} this week`, c:C.text},
          nextExam
            ? {l:'Next exam', v:`${nextExam.d}d`, sub:'until first paper', c:C.accent}
            : {l:'Streak', v:`${streak}`, sub:`day${streak===1?'':'s'} active`, c: streak>0?C.accent:C.subtle},
        ].map(k=>(
          <div key={k.l} style={{...cardSx,padding:'11px 13px',minWidth:0}}>
            <div style={{...type.eyebrow,color:C.subtle,marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{k.l}</div>
            <div style={{fontSize:23,fontWeight:800,color:k.c,lineHeight:1,letterSpacing:'-0.02em'}}>{k.v}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Battle readiness gauge (protected) ────────────────────────────── */}
      <div style={{...cardSx,padding:'16px 18px',marginBottom:12,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
          <div style={{...type.eyebrow,color:C.subtle,marginBottom:6}}>Battle Readiness</div>
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

      {/* ── Subject performance table ─────────────────────────────────────── */}
      <div style={{...cardSx,padding:'14px 16px 6px',marginBottom:12}}>
        <Eyebrow>Subjects</Eyebrow>
        {scores.length===0 ? (
          <div style={{...type.caption,color:C.muted,paddingBottom:12}}>No papers logged yet.</div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1.6fr 52px 56px 64px 1fr',gap:8,alignItems:'center',
              padding:'0 0 8px',borderBottom:`1px solid ${C.border}`}}>
              {['Subject','Avg','Proj','Target','vs target'].map((h,i)=>(
                <div key={h} style={{...type.eyebrow,color:C.subtle,textAlign:i===0?'left':i===4?'left':'center'}}>{h}</div>
              ))}
            </div>
            {rows.map(r=>(
              <div key={r.s.name} style={{display:'grid',gridTemplateColumns:'1.6fr 52px 56px 64px 1fr',gap:8,
                alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                {/* subject + sparkline */}
                <div style={{minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:r.s.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.s.name}</span>
                  </div>
                  <div style={{fontSize:10,color:C.subtle,marginTop:2,paddingLeft:15}}>
                    {r.cnt} paper{r.cnt===1?'':'s'}{r.timeSecs>0?` · ${fmtMins(r.timeSecs)}`:''}
                  </div>
                </div>
                {/* avg */}
                <div style={{textAlign:'center'}}>
                  <span style={{fontSize:15,fontWeight:700,color:r.grade?gradeColor(r.grade):C.subtle}}>{r.avg!=null?r.avg:'—'}</span>
                  {r.trend!=null&&Math.abs(r.trend)>=1&&(
                    <div style={{fontSize:10,fontWeight:700,color:r.trend>=0?(C.success||'#22c55e'):(C.danger||'#ef4444')}}>
                      {r.trend>=0?'▲':'▼'}{Math.abs(r.trend)}
                    </div>
                  )}
                </div>
                {/* projected */}
                <div style={{textAlign:'center'}}>
                  {r.pred ? (
                    <span style={{fontSize:14,fontWeight:700,color:gradeColor(r.pred.grade)}}>{r.pred.grade}</span>
                  ) : <span style={{fontSize:12,color:C.subtle}}>—</span>}
                  {r.pred&&r.pred.trend!=='stable'&&(
                    <div style={{fontSize:10,color:r.pred.trend==='up'?(C.success||'#22c55e'):(C.danger||'#ef4444')}}>
                      {r.pred.trend==='up'?'↗':'↘'}
                    </div>
                  )}
                </div>
                {/* target select */}
                <div style={{textAlign:'center'}}>
                  <select value={r.target} onChange={e=>setTargets(p=>({...p,[r.s.name]:e.target.value}))}
                    style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,
                      color:gradeColor(r.target),fontSize:13,fontWeight:700,fontFamily:'inherit',
                      cursor:'pointer',outline:'none',padding:'2px 4px'}}>
                    {(isGcse?['9','8','7','6','5']:isAS?['A','B','C','D']:['A*','A','B','C']).map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {/* vs target bar */}
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{flex:1,height:5,borderRadius:3,background:C.border,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${r.progress}%`,
                      background:r.progress>=100?(C.success||'#22c55e'):r.s.color,borderRadius:3,transition:'width 1s ease'}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:r.progress>=100?(C.success||'#22c55e'):C.muted,width:30,textAlign:'right'}}>{r.avg!=null?`${r.progress}%`:'—'}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Insights row: consistency + where time goes ───────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        {/* Consistency */}
        <div style={{...cardSx,padding:'14px 16px'}}>
          <Eyebrow>Consistency · 8 weeks</Eyebrow>
          <div style={{display:'flex',alignItems:'flex-end',gap:5,height:54}}>
            {weekBars.map((d,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',height:'100%'}}>
                <div title={`${d}/7 days active`} style={{height:`${Math.max(6,(d/7)*100)}%`,
                  background:d===0?C.border:(i===weekBars.length-1?C.accent:C.subtle),
                  borderRadius:3,minHeight:3}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
            <span style={{fontSize:12,color:C.muted}}>Current streak</span>
            <span style={{fontSize:12,fontWeight:700,color:streak>0?C.accent:C.subtle}}>{streak} day{streak===1?'':'s'}</span>
          </div>
        </div>
        {/* Where time goes */}
        <div style={{...cardSx,padding:'14px 16px'}}>
          <Eyebrow>Where time goes</Eyebrow>
          {totalSecs===0 ? (
            <div style={{...type.caption,color:C.muted}}>No study time logged yet. Use the timer or log papers.</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {[...rows].filter(r=>r.timeSecs>0).sort((a,b)=>b.timeSecs-a.timeSecs).slice(0,5).map(r=>(
                <div key={r.s.name} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:C.muted,width:64,flexShrink:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.s.name}</span>
                  <div style={{flex:1,height:5,borderRadius:3,background:C.border,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.round(r.timeShare*100)}%`,background:r.s.color,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:C.muted,width:32,textAlign:'right'}}>{Math.round(r.timeShare*100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Coach: under-invested + biggest mover ─────────────────────────── */}
      {(underInvested.length>0 || topMover) && (
        <div style={{...cardSx,padding:'14px 16px',marginBottom:12}}>
          <Eyebrow>What the numbers say</Eyebrow>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {underInvested.slice(0,2).map(r=>(
              <div key={r.s.name} style={{display:'flex',alignItems:'flex-start',gap:9}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:r.s.color,flexShrink:0,marginTop:5}}/>
                <span style={{fontSize:13,color:C.muted,lineHeight:1.5}}>
                  <strong style={{color:C.text}}>{r.s.name}</strong> is {Math.abs(r.gap)}% below your {r.target} target but only {Math.round(r.timeShare*100)}% of your study time. Under-invested — give it more sessions.
                </span>
              </div>
            ))}
            {topMover && Math.abs(topMover.trend)>=2 && (
              <div style={{display:'flex',alignItems:'flex-start',gap:9}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:topMover.s.color,flexShrink:0,marginTop:5}}/>
                <span style={{fontSize:13,color:C.muted,lineHeight:1.5}}>
                  <strong style={{color:C.text}}>{topMover.s.name}</strong> {topMover.trend>0?'jumped':'dropped'} {Math.abs(topMover.trend)}% on your last paper{topMover.trend>0?' — keep that momentum.':' — worth a review.'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Error hotspots ────────────────────────────────────────────────── */}
      {hotspots.length>0 && (
        <div style={{...cardSx,padding:'14px 16px',marginBottom:12}}>
          <Eyebrow>Error hotspots · last 3 weeks</Eyebrow>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {hotspots.map(([topic,n])=>(
              <div key={topic} style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:13,color:C.text,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topic}</span>
                <div style={{flex:1,height:5,borderRadius:3,background:C.border,overflow:'hidden',maxWidth:120}}>
                  <div style={{height:'100%',width:`${(n/hotspots[0][1])*100}%`,background:C.accent,borderRadius:3}}/>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:C.muted,width:48,textAlign:'right'}}>{n}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Score trend chart ─────────────────────────────────────────────── */}
      <div style={{...cardSx,padding:18,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <div style={{...type.eyebrow,color:C.subtle}}>Score trend</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
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
          bgColor={C.bg} textColor={C.muted}
          targetGrade={targets[chartSubject]||(isGcse?'9':isAS?'A':'A*')}/>
        <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
          {Object.entries(GRADE_BOUNDS[chartSubject]||{}).filter(([g])=>isGcse?['9','8','7'].includes(g):isAS?['A','B','C'].includes(g):['A*','A','B'].includes(g)).map(([g,v])=>(
            <div key={g} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:16,height:2,background:gradeColor(g),opacity:0.5,borderRadius:1}}/>
              <span style={{fontSize:12,color:gradeColor(g)}}>{g} ≥{v}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Share card ───────────────────────────────────────────────────── */}
      {scores.length>0&&<ShareReadinessCard br={br} subjects={subjects} scores={scores} C={C} font={font}
        shareTheme={shareTheme} setShareTheme={setShareTheme}
        shareAspect={shareAspect} setShareAspect={setShareAspect}/>}

      <InsuranceEligibilityCard scores={scores} uid={uid} C={C} font={font} noted={insNoted} setNoted={setInsNoted}/>
    </div>
  );
}

// ── Tracker ────────────────────────────────────────────────────────────────
function Tracker({subjects,scores,setScores,errors,setErrors,uid,C,font}) {
  const SUBJECTS      = subjects.map(s=>s.name);
  const GRADE_BOUNDS  = Object.fromEntries(subjects.map(s=>[s.name,s.gradeBoundaries]));
  const PAPER_SUGGS   = Object.fromEntries(subjects.map(s=>[s.name,getPaperSuggestions(s)]));

  const iS = {width:'100%',background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
    padding:'9px 12px',color:C.text,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  const [scoreSubject, setScoreSubject] = useState(SUBJECTS[0]??'');
  const [scorePaper,   setScorePaper]   = useState('');
  const [scoreGot,     setScoreGot]     = useState('');
  const [scoreMax,     setScoreMax]     = useState('');
  const [errSubject,   setErrSubject]   = useState(SUBJECTS[0]??'');
  const [errTopic,     setErrTopic]     = useState('');
  const [errType,      setErrType]      = useState('method');
  const [errNote,      setErrNote]      = useState('');
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [tab,          setTab]          = useState('papers'); // papers | errors
  const [selSubject,   setSelSubject]   = useState(null);     // null = overview

  const nextSuggested = (PAPER_SUGGS[scoreSubject]||[]).find(p=>
    !scores.filter(s=>s.subject===scoreSubject).map(s=>s.paper).includes(p)
  );
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

  // Tiny inline sparkline of a subject's paper %s over time.
  const Spark=({pts,color})=>{
    if(!pts||pts.length<2) return <div style={{width:62,flexShrink:0}}/>;
    const w=62,h=22;
    const xs=pts.map((_,i)=>(i/(pts.length-1))*w);
    const ys=pts.map(p=>h-(Math.max(0,Math.min(100,p))/100)*(h-3)-1.5);
    const d=xs.map((x,i)=>`${i?'L':'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    return (
      <svg width={w} height={h} style={{flexShrink:0,overflow:'visible'}}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.2" fill={color}/>
      </svg>
    );
  };

  // Per-subject roll-up for the overview.
  const subjectStats = subjects.map(sub=>{
    const sc=scores.filter(s=>s.subject===sub.name).sort((a,b)=>(a.ts||a.id)-(b.ts||b.id));
    const ec=errors.filter(e=>e.subject===sub.name).length;
    const avg=sc.length?Math.round(sc.reduce((a,s)=>a+s.pct,0)/sc.length):null;
    const latest=sc.length?sc[sc.length-1]:null;
    let latestGrade=null;
    if(latest){const mv=latest.max??latest.maxMark??100;latestGrade=getGradeForPaper(latest.got,mv,latest.paper,latest.subject,GRADE_BOUNDS).grade;}
    return {sub, count:sc.length, errCount:ec, avg, latestGrade, pts:sc.map(s=>s.pct)};
  });

  return (
    <div>
      {!selSubject ? (
        /* ── Overview: analytics across subjects ── */
        <>
          <div style={{marginBottom:18}}>
            <h1 style={{...type.h1,color:C.text,margin:'0 0 4px'}}>Tracker</h1>
            <p style={{...type.caption,color:C.muted,margin:0}}>Tap a subject to log papers and see its trend.</p>
          </div>

          <div style={{...type.eyebrow,color:C.subtle,marginBottom:2}}>Subjects</div>
          {subjectStats.map(({sub,count,errCount,avg,latestGrade,pts})=>(
            <button key={sub.id}
              onClick={()=>{setSelSubject(sub.name);setScoreSubject(sub.name);setErrSubject(sub.name);setTab('papers');setScorePaper('');setConfirmDel(null);}}
              style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',
                padding:'14px 0',borderTop:`1px solid ${C.border}`,background:'transparent',
                border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{width:9,height:9,borderRadius:'50%',background:sub.color,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub.name}</div>
                <div style={{...type.caption,color:C.muted,marginTop:1}}>
                  {count} paper{count===1?'':'s'}{errCount>0?` · ${errCount} error${errCount===1?'':'s'}`:''}
                </div>
              </div>
              <Spark pts={pts} color={sub.color}/>
              <div style={{textAlign:'right',flexShrink:0,minWidth:50}}>
                {avg!=null?(
                  <>
                    <div style={{fontSize:16,fontWeight:700,color:gradeColor(latestGrade)}}>{latestGrade}</div>
                    <div style={{...type.caption,color:C.muted}}>avg {avg}%</div>
                  </>
                ):(
                  <div style={{...type.caption,color:C.subtle}}>none yet</div>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </>
      ) : (() => {
        /* ── Subject detail ── */
        const sub = subjects.find(s=>s.name===selSubject);
        const color = sub?.color||'#888';
        const subjScores = scores.filter(s=>s.subject===selSubject).sort((a,b)=>(b.ts||b.id)-(a.ts||a.id));
        const subjErrors = errors.filter(e=>e.subject===selSubject);
        const avg = subjScores.length?Math.round(subjScores.reduce((a,s)=>a+s.pct,0)/subjScores.length):null;
        const best = subjScores.length?Math.max(...subjScores.map(s=>s.pct)):null;
        return (
        <>
          <button onClick={()=>setSelSubject(null)} style={{display:'flex',alignItems:'center',gap:5,
            background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:C.muted,
            fontSize:13,padding:0,marginBottom:14}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            All subjects
          </button>

          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{width:11,height:11,borderRadius:'50%',background:color,flexShrink:0}}/>
            <h1 style={{...type.h1,fontSize:24,color:C.text,margin:0}}>{selSubject}</h1>
          </div>
          <div style={{...type.caption,color:C.muted,marginBottom:18}}>
            {subjScores.length} paper{subjScores.length===1?'':'s'}
            {avg!=null&&<> · avg {avg}%</>}{best!=null&&<> · best {best}%</>}
            {subjErrors.length>0&&<> · {subjErrors.length} error{subjErrors.length===1?'':'s'}</>}
          </div>

          {/* Papers / Errors toggle */}
          <div style={{display:'flex',gap:22,borderBottom:`1px solid ${C.border}`,marginBottom:16}}>
            {[['papers','Papers',subjScores.length],['errors','Errors',subjErrors.length]].map(([id,lbl,n])=>(
              <button key={id} onClick={()=>setTab(id)} style={{background:'none',border:'none',
                cursor:'pointer',fontFamily:'inherit',padding:'0 0 9px',marginBottom:-1,fontSize:14,
                fontWeight:tab===id?600:500,color:tab===id?C.text:C.muted,
                borderBottom:`2px solid ${tab===id?C.text:'transparent'}`}}>
                {lbl}{n>0&&<span style={{color:C.subtle,fontWeight:500}}> · {n}</span>}
              </button>
            ))}
          </div>

          {tab==='papers'?(
            <>
              {/* Add (subject fixed) */}
              <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:12,marginBottom:20}}>
                {nextSuggested&&(
                  <button onClick={()=>setScorePaper(nextSuggested)} style={{display:'flex',alignItems:'center',gap:9,
                    width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:6,background:'transparent',
                    border:`1px solid ${C.border}`,marginBottom:8,cursor:'pointer',fontFamily:'inherit'}}>
                    <span style={{...type.eyebrow,color:C.subtle,flexShrink:0}}>Next</span>
                    <span style={{fontSize:13,color:C.text,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nextSuggested}</span>
                    <span style={{fontSize:12,color:C.accent,fontWeight:600,flexShrink:0}}>Use</span>
                  </button>
                )}
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  <input value={scorePaper} onChange={e=>setScorePaper(e.target.value)}
                    placeholder="Paper name / year" style={{...iS,flex:'2 1 150px'}}/>
                  <input value={scoreGot} onChange={e=>setScoreGot(e.target.value)}
                    placeholder="Score" type="number" style={{...iS,flex:'0 0 64px'}}/>
                  <input value={scoreMax} onChange={e=>setScoreMax(e.target.value)}
                    placeholder="/Max" type="number" style={{...iS,flex:'0 0 64px'}}/>
                  <button onClick={addScore} style={{background:C.accent,border:'none',color:'#fff',
                    padding:'8px 18px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
                    Log
                  </button>
                </div>
              </div>

              {/* Papers — exam-table style */}
              {subjScores.length===0&&(
                <div style={{...type.body,color:C.muted,textAlign:'center',padding:'18px 0'}}>No papers logged for {selSubject} yet.</div>
              )}
              {subjScores.map(s=>{
                const maxVal=s.max??s.maxMark??100;
                const {grade,exact}=getGradeForPaper(s.got,maxVal,s.paper,s.subject,GRADE_BOUNDS);
                const d=new Date(s.ts||s.id);
                return (
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{width:38,flexShrink:0}}>
                      <div style={{...type.eyebrow,color:C.subtle,fontSize:10}}>{d.toLocaleDateString('en-GB',{month:'short'})}</div>
                      <div style={{fontSize:18,fontWeight:700,color:C.text,lineHeight:1.1}}>{d.getDate()}</div>
                    </div>
                    <span style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.paper}</div>
                      <div style={{...type.caption,color:C.muted,marginTop:1}}>{s.got}/{maxVal}{!exact&&' est.'}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:gradeColor(grade)}}>
                        {grade}{!exact&&<span style={{fontSize:10,opacity:0.5}}>~</span>}{' '}
                        <span style={{fontSize:13,fontWeight:500,color:C.muted}}>{s.pct}%</span>
                      </div>
                    </div>
                    {confirmDel===s.id?(
                      <div style={{display:'flex',gap:3,flexShrink:0}}>
                        <button onClick={()=>{const u=scores.filter(x=>x.id!==s.id);setScores(u);ls.set(`rbp_scores_${uid}`,u);setConfirmDel(null);}}
                          style={{background:'transparent',border:`1px solid ${C.danger}55`,color:C.danger,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Delete</button>
                        <button onClick={()=>setConfirmDel(null)}
                          style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Cancel</button>
                      </div>
                    ):(
                      <button onClick={()=>setConfirmDel(s.id)} style={{background:'transparent',border:'none',color:C.subtle,padding:'4px 6px',cursor:'pointer',fontSize:14,fontFamily:'inherit',flexShrink:0}}>✕</button>
                    )}
                  </div>
                );
              })}
            </>
          ):(
            <>
              {/* Add error (subject fixed) */}
              <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:12,marginBottom:20}}>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                  <input value={errTopic} onChange={e=>setErrTopic(e.target.value)}
                    placeholder="Topic" style={{...iS,flex:'2 1 140px'}}/>
                  <select value={errType} onChange={e=>setErrType(e.target.value)} style={{...iS,flex:'1 1 120px'}}>
                    {ERROR_TYPES.map(et=><option key={et.id} value={et.id}>{et.label}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',gap:5}}>
                  <input value={errNote} onChange={e=>setErrNote(e.target.value)}
                    placeholder="What went wrong? (optional)" style={{...iS,flex:1}}/>
                  <button onClick={addError} style={{background:C.accent,border:'none',color:'#fff',
                    padding:'8px 18px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Log</button>
                </div>
              </div>

              {subjErrors.length===0&&(
                <div style={{...type.body,color:C.muted,textAlign:'center',padding:'18px 0'}}>No errors logged for {selSubject} yet.</div>
              )}
              {subjErrors.map(e=>{
                const et=ERROR_TYPES.find(t=>t.id===e.type);
                return (
                  <div key={e.id} style={{display:'flex',gap:10,padding:'11px 0',borderTop:`1px solid ${C.border}`,alignItems:'flex-start'}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:et?.color||'#555',flexShrink:0,marginTop:5}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,color:C.text}}>{e.topic}</div>
                      <div style={{...type.caption,color:C.muted,marginTop:1}}>{et?.label} · {e.date}{e.note&&` · ${e.note}`}</div>
                    </div>
                    <button onClick={()=>{const u=errors.filter(x=>x.id!==e.id);setErrors(u);ls.set(`rbp_errors_${uid}`,u);}}
                      style={{background:'transparent',border:'none',color:C.subtle,padding:'4px 6px',cursor:'pointer',fontSize:14,fontFamily:'inherit',flexShrink:0}}>✕</button>
                  </div>
                );
              })}
            </>
          )}
        </>
        );
      })()}
    </div>
  );
}

// ── Exams ──────────────────────────────────────────────────────────────────
function Exams({subjects,C,font,examSched=EXAM_SCHEDULE,yearGroup=''}) {
  const isY12 = yearGroup === 'Y12' || yearGroup === 'Y10';
  const allExams=subjects.flatMap(s=>getSubjectExams(examSched,s.id,s.boardId,s.options).map(e=>({...e,subjectName:s.name,color:s.color})))
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming=allExams.filter(e=>daysUntil(e.date)>=0);
  const past=allExams.filter(e=>daysUntil(e.date)<0);
  const next=upcoming[0]??null;

  // Y12/Y10 sit a year out — official 2027 dates aren't published yet, so show a
  // rough countdown built from last year's earliest paper shifted into 2027.
  let estDaysToExams=null;
  if (isY12 && allExams.length) {
    const d=new Date(allExams[0].date+'T00:00:00'); d.setFullYear(2027);
    const today=new Date(); today.setHours(0,0,0,0);
    estDaysToExams=Math.round((d-today)/86400000);
  }

  if (isY12 && !upcoming.length) return (
    <div style={{padding:'40px 24px',maxWidth:520}}>
      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:10}}>Your exams are in 2027</div>
      {estDaysToExams!=null&&estDaysToExams>0&&(
        <div style={{display:'inline-flex',alignItems:'baseline',gap:8,background:C.card2,
          border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',marginBottom:16}}>
          <span style={{fontSize:28,fontWeight:800,color:C.accent}}>~{estDaysToExams}</span>
          <span style={{fontSize:13,color:C.muted}}>days until your 2027 exams (estimated)</span>
        </div>
      )}
      <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:16}}>
        {yearGroup==='Y12'?'A-Level':'GCSE'} exam dates for {yearGroup==='Y12'?'2027':'2027'} haven't been officially published by exam boards yet — they're usually released in autumn {yearGroup==='Y12'?'2026':'2026'}.
      </div>
      <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:12}}>
        In the meantime, use this app to:<br/>
        • Log past papers to build your Battle Readiness score<br/>
        • Track weak topics in the Topics tab<br/>
        • Check back here once your board publishes the timetable
      </div>
      <div style={{fontSize:11,color:C.subtle,background:C.card2,borderRadius:8,padding:'10px 14px',border:`1px solid ${C.border}`}}>
        The dates below (grayed out) are last year's 2026 schedule — shown for reference only. Your actual dates will differ.
      </div>
      {allExams.length>0&&(
        <div style={{marginTop:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.subtle,marginBottom:10,textTransform:'uppercase',letterSpacing:0.5}}>2026 reference dates (not your year)</div>
          <div style={{display:'flex',flexDirection:'column',gap:4,opacity:0.35}}>
            {allExams.map((e,i)=>(
              <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px'}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{e.subjectName}: {e.paper.split(':')[1]?.trim()||e.paper}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{e.date} · {e.board} · {e.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!allExams.length) return (
    <div style={{padding:'40px 0',textAlign:'center',color:C.subtle,fontSize:13}}>
      Exam schedule for your subjects isn't available yet.
    </div>
  );

  const ExamRow=({e})=>{
    const days=daysUntil(e.date);
    const done=days<0;
    const d=new Date(e.date);
    return (
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',
        borderTop:`1px solid ${C.border}`,opacity:done?0.45:1}}>
        {/* date column */}
        <div style={{width:38,flexShrink:0}}>
          <div style={{...type.eyebrow,color:C.subtle,fontSize:10}}>{d.toLocaleDateString('en-GB',{month:'short'})}</div>
          <div style={{fontSize:18,fontWeight:700,color:done?C.muted:C.text,lineHeight:1.1}}>{d.getDate()}</div>
        </div>
        <span style={{width:8,height:8,borderRadius:'50%',background:done?C.subtle:e.color,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:done?C.muted:C.text,
            textDecoration:done?'line-through':'none',
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {e.subjectName}: {e.paper.split(':')[1]?.trim()||e.paper}
          </div>
          <div style={{...type.caption,color:C.muted,marginTop:1}}>
            {e.code} · {e.time} · {e.duration}
          </div>
        </div>
        <div style={{fontSize:14,fontWeight:700,flexShrink:0,
          color:done?C.subtle:days<=7?C.danger:days<=30?C.warn:C.text}}>
          {days>0?`${days}d`:days===0?'Today':'Done'}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Next exam — compact, left-aligned */}
      {next&&(
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:22,
          padding:'16px 18px',background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
          <div style={{textAlign:'center',flexShrink:0,minWidth:58}}>
            <div style={{fontSize:36,fontWeight:700,color:C.accent,lineHeight:1}}>
              {daysUntil(next.date)===0?'!':daysUntil(next.date)}
            </div>
            <div style={{...type.eyebrow,color:C.subtle,marginTop:3}}>
              {daysUntil(next.date)===0?'today':'days'}
            </div>
          </div>
          <div style={{width:1,alignSelf:'stretch',background:C.border}}/>
          <div style={{minWidth:0}}>
            <div style={{...type.eyebrow,color:C.muted,marginBottom:5}}>Next exam</div>
            <div style={{fontSize:15,fontWeight:600,color:C.text}}>
              {next.subjectName}: {next.paper.split(':')[1]?.trim()||next.paper}
            </div>
            <div style={{...type.caption,color:C.muted,marginTop:2}}>
              {new Date(next.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · {next.time}
            </div>
          </div>
        </div>
      )}

      {/* All exams done — celebratory close-out (current-year students only;
          Y12/Y10 return early above, and the empty-schedule case is handled too). */}
      {!next&&(
        <div style={{marginBottom:24,padding:'26px 22px',background:C.surface,
          border:`1px solid ${C.border}`,borderRadius:10}}>
          <div style={{...type.eyebrow,color:C.accent,marginBottom:10}}>That's a wrap</div>
          <div style={{...type.h1,fontSize:25,color:C.text,margin:'0 0 8px'}}>Exams done.</div>
          <div style={{...type.body,color:C.muted,maxWidth:420}}>
            Every paper on your schedule is behind you. However they went, the hard part is over — and that took real graft.
          </div>
          <div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:14}}>
            Results land in August. Until then, rest — you've earned it.
          </div>
        </div>
      )}

      {/* Always-confirm banner — only while exams are still ahead. A wrong date
          is the one mistake you can't recover from; once everything's done it's
          just noise, so we drop it. */}
      {upcoming.length>0&&(
        <div style={{marginBottom:20,padding:'10px 14px',background:C.card2,
          borderLeft:`2px solid ${C.warn}`,borderRadius:'0 6px 6px 0',fontSize:12.5,
          color:C.muted,lineHeight:1.55}}>
          <strong style={{color:C.text}}>Double-check every date and time against your own school timetable.</strong> Boards occasionally move papers, and your centre's start times are the ones that count.
        </div>
      )}

      {/* All exams timeline */}
      {upcoming.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{...type.eyebrow,color:C.subtle,marginBottom:2}}>All exams</div>
          <div>{allExams.map((e,i)=><ExamRow key={i} e={e}/>)}</div>
        </div>
      )}

      {upcoming.length===0&&past.length>0&&(
        <div>
          <div style={{...type.eyebrow,color:C.subtle,marginBottom:2}}>Completed</div>
          <div>{past.map((e,i)=><ExamRow key={i} e={e}/>)}</div>
        </div>
      )}

      <div style={{marginTop:22,paddingTop:14,borderTop:`1px solid ${C.border}`,
        ...type.caption,color:C.subtle,lineHeight:1.6}}>
        Exam dates are based on 2026 timetables and provided for guidance only.
        Always verify with your school and the official board website before making decisions.
        A* Battle Plan is not responsible for changes to the exam schedule.
      </div>
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
function StudyTimer({subjects,uid,C,font,sessions,setSessions,scores=[],errors=[],rag={}}) {
  const [timerMode,  setTimerMode]  = useState('pomodoro');
  const [selSubject, setSelSubject] = useState(subjects[0]?.id??'');
  const [workMins,   setWorkMins]   = useState(25);
  const [breakMins,  setBreakMins]  = useState(5);
  const [pomMode,    setPomMode]    = useState('work');
  const [pomRunning, setPomRunning] = useState(false);
  const [swRunning,  setSwRunning]  = useState(false);
  const [pieSelected,setPieSelected]= useState(null);
  const [,setTick] = useState(0); // force re-renders

  // Exam mode state
  const [examBaseMins,  setExamBaseMins]  = useState(90);
  const [examExtraIdx,  setExamExtraIdx]  = useState(0); // index into EXTRA_TIME_OPTS
  const [examRunning,   setExamRunning]   = useState(false);
  const [examDone,      setExamDone]      = useState(false);
  const [examResult,    setExamResult]    = useState(null); // {secs,logged} of last finished exam
  const examEndRef  = useRef(null);
  const examRemRef  = useRef(90*60);

  const examExtraFactor = EXTRA_TIME_OPTS[examExtraIdx]?.factor ?? 0;
  const examTotalMins   = Math.round(examBaseMins * (1 + examExtraFactor));
  const examExtraMins   = examTotalMins - examBaseMins;
  // Keep examRemRef in sync with settings changes (only when not running)
  useEffect(()=>{ if(!examRunning){ examRemRef.current=examTotalMins*60; setTick(t=>t+1); } },[examBaseMins,examExtraIdx]);

  const examSecs = examRunning
    ? Math.max(0, Math.ceil((examEndRef.current - Date.now()) / 1000))
    : examRemRef.current;

  const examStart = () => {
    examEndRef.current = Date.now() + examRemRef.current * 1000;
    setExamRunning(true); setExamDone(false);
  };
  const examReset = () => {
    examEndRef.current = null;
    examRemRef.current = examTotalMins * 60;
    setExamRunning(false); setExamDone(false); setExamResult(null); setTick(t=>t+1);
  };
  // End the exam and log the elapsed time as a real, subject-attributed study
  // session (measured time — same footing as the stopwatch). Called both when
  // the clock hits zero and when the student finishes early.
  const finishExam = (elapsedSecs) => {
    examEndRef.current = null; examRemRef.current = 0;
    setExamRunning(false); setExamDone(true); setTick(t=>t+1);
    const secs = Math.round(elapsedSecs);
    const logged = secs >= 60 && !!selSubject;
    if (logged) {
      const sess={id:Date.now(),subjectId:selSubject,secs,ts:Date.now(),mode:'exam'};
      setSessions(prev=>{const next=[...prev,sess];ls.set(`rbp_sessions_${uid}`,next);return next;});
    }
    setExamResult({secs, logged});
  };

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
    if (!pomRunning && !swRunning && !examRunning) return;
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
      if (examRunning && examEndRef.current && Date.now()>=examEndRef.current) {
        finishExam(examTotalMins*60); // ran full duration
      }
    }, 250);
    return ()=>clearInterval(id);
  },[pomRunning,swRunning,examRunning,pomMode,selSubject,workMins,breakMins,uid]);

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
    pomReset(); swReset(); examReset(); setTimerMode(m);
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

  // Streak counts any study action that day — timed session, logged paper, or
  // logged error — not just timer use. (Minutes above stay measured-only.)
  const daySet=studyActivityDays({sessions,scores,errors});
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
    // Topic-level drill-in
    const allTopics = SPEC_TOPICS[pieSelected] || [];
    const weakTopics = allTopics
      .map((topic,i)=>({topic, status: rag[`${pieSelected}_${i}`]||'none'}))
      .filter(t=>t.status==='red'||t.status==='amber')
      .sort((a,b)=>(a.status==='red'?-1:1)-(b.status==='red'?-1:1))
      .slice(0,5);
    // Recent papers logged for this subject
    const recentPapers = scores
      .filter(s=>s.subject===selSubjectObj.name)
      .sort((a,b)=>(b.ts||b.id)-(a.ts||a.id))
      .slice(0,3);
    // Error patterns: top error types for this subject
    const subjErrors = errors.filter(e=>e.subject===selSubjectObj.name || e.subjectId===pieSelected);
    const errCounts = {};
    subjErrors.forEach(e=>{ if(e.type) errCounts[e.type]=(errCounts[e.type]||0)+1; });
    const topErrors = Object.entries(errCounts)
      .sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([id,n])=>({label:(ERROR_TYPES.find(t=>t.id===id)?.label)||id, count:n}));
    return {allSess,totalSecs,weekSubSecs,days,maxDay,weakTopics,recentPapers,topErrors};
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
        <h1 style={{...type.h1,color:C.text,margin:0}}>Study Timer</h1>
        <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Runs in background. Sessions synced across devices.</p>
      </div>

      <div style={{display:'flex',gap:0,background:C.card2,borderRadius:9,padding:3,alignSelf:'flex-start',border:`1px solid ${C.border}`}}>
        {[['pomodoro','Pomodoro'],['stopwatch','Stopwatch'],['exam','Exam Mode']].map(([m,lbl])=>(
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
      ):timerMode==='exam'?(
        /* ── EXAM MODE ── */
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'24px 20px'}}>
          {examDone?(()=>{
            const earlyFinish = examResult && examResult.secs < examTotalMins*60;
            return (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:13,fontWeight:700,color:earlyFinish?C.accent:'#ef4444',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>{earlyFinish?'Exam ended':"Time's up"}</div>
              <div style={{fontSize:72,fontWeight:900,color:earlyFinish?C.text:'#ef4444',
                fontFamily:"'JetBrains Mono','SF Mono',monospace",lineHeight:1,marginBottom:8}}>{earlyFinish?fmtSw(examResult.secs):'00:00'}</div>
              {examExtraMins>0&&!earlyFinish&&(
                <div style={{fontSize:13,color:C.muted,marginBottom:20}}>
                  That included {examExtraMins} min extra time
                </div>
              )}
              {examResult?.logged&&(
                <div style={{fontSize:13,color:'#4ade80',fontWeight:600,marginBottom:20}}>
                  ✓ Logged {fmtDur(examResult.secs)} to {subjects.find(s=>s.id===selSubject)?.name||'your studies'}
                </div>
              )}
              {examResult&&!examResult.logged&&(
                <div style={{fontSize:12,color:C.subtle,marginBottom:20}}>
                  {selSubject?'Under a minute — not logged.':'Pick a subject next time to log this as study time.'}
                </div>
              )}
              <button onClick={examReset}
                style={{padding:'11px 32px',borderRadius:8,background:C.accent,
                  border:'none',color:'#fff',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer'}}>
                Reset
              </button>
            </div>
            );
          })():(()=>{
            const mm=String(Math.floor(examSecs/60)).padStart(2,'0');
            const ss=String(examSecs%60).padStart(2,'0');
            const pct=examTotalMins>0?examSecs/(examTotalMins*60):1;
            const warn10=examSecs<=600&&examSecs>0;
            const warn30=examSecs<=1800&&examSecs>600;
            const dispColor=warn10?'#ef4444':warn30?'#f97316':C.text;
            return (
              <>
                {/* Subject — so exam time logs against the right subject */}
                {subjectPill(examRunning)}
                {/* Duration picker */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Exam duration</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {EXAM_DURATIONS.map(([lbl,mins])=>(
                      <button key={mins} disabled={examRunning}
                        onClick={()=>{if(!examRunning){setExamBaseMins(mins);examRemRef.current=Math.round(mins*(1+examExtraFactor))*60;setTick(t=>t+1);}}}
                        style={{padding:'5px 11px',borderRadius:6,
                          border:`1px solid ${examBaseMins===mins?C.accent:C.border}`,
                          background:examBaseMins===mins?C.accentSoft:'transparent',
                          color:examBaseMins===mins?C.accent:C.muted,
                          fontSize:11,fontWeight:examBaseMins===mins?700:400,fontFamily:font,
                          cursor:examRunning?'default':'pointer'}}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extra time */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Extra time</div>
                  <div style={{display:'flex',gap:5}}>
                    {EXTRA_TIME_OPTS.map((opt,i)=>(
                      <button key={i} disabled={examRunning}
                        onClick={()=>{if(!examRunning){setExamExtraIdx(i);examRemRef.current=Math.round(examBaseMins*(1+(opt.factor)))*60;setTick(t=>t+1);}}}
                        style={{padding:'5px 12px',borderRadius:6,
                          border:`1px solid ${examExtraIdx===i?'#22c55e':C.border}`,
                          background:examExtraIdx===i?'rgba(34,197,94,0.10)':'transparent',
                          color:examExtraIdx===i?'#22c55e':C.muted,
                          fontSize:11,fontWeight:examExtraIdx===i?700:400,fontFamily:font,
                          cursor:examRunning?'default':'pointer'}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {examExtraMins>0&&(
                    <div style={{fontSize:11,color:'#22c55e',marginTop:6}}>
                      Total: {examTotalMins} min ({examBaseMins} + {examExtraMins} extra)
                    </div>
                  )}
                </div>

                {/* Countdown */}
                <div style={{textAlign:'center',marginBottom:16}}>
                  {warn10&&<div style={{fontSize:11,fontWeight:700,color:'#ef4444',letterSpacing:0.8,textTransform:'uppercase',marginBottom:6}}>Under 10 minutes</div>}
                  {warn30&&!warn10&&<div style={{fontSize:11,fontWeight:700,color:'#f97316',letterSpacing:0.8,textTransform:'uppercase',marginBottom:6}}>30 minutes remaining</div>}
                  {!warn10&&!warn30&&<div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:examRunning?C.accent:C.subtle,marginBottom:6}}>{examRunning?'In progress':'Ready'}</div>}
                  <div style={{fontSize:76,fontWeight:900,color:dispColor,
                    fontFamily:"'JetBrains Mono','SF Mono',monospace",
                    lineHeight:1,letterSpacing:-3,marginBottom:8}}>{mm}:{ss}</div>
                  {/* Progress bar */}
                  <div style={{height:4,background:C.border,borderRadius:2,marginBottom:20,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:2,
                      background:warn10?'#ef4444':warn30?'#f97316':C.accent,
                      width:`${pct*100}%`,transition:'width 1s linear'}}/>
                  </div>
                  {examRunning?(
                    <button onClick={()=>finishExam(examTotalMins*60-examSecs)}
                      style={{padding:'11px 32px',borderRadius:8,
                        background:'rgba(74,222,128,0.10)',border:'1px solid #4ade8040',
                        color:'#4ade80',fontSize:14,fontWeight:700,fontFamily:font,cursor:'pointer',transition:'all 0.15s'}}>
                      Finish &amp; log
                    </button>
                  ):(
                    <button onClick={examStart}
                      style={{padding:'11px 36px',borderRadius:8,
                        background:C.accent,border:`1px solid ${C.accent}`,
                        color:'#fff',fontSize:14,fontWeight:700,fontFamily:font,
                        cursor:'pointer',transition:'all 0.15s'}}>
                      Start Exam
                    </button>
                  )}
                  {!examRunning&&examSecs<examTotalMins*60&&examSecs>0&&(
                    <button onClick={examReset} style={{marginLeft:10,padding:'11px 20px',borderRadius:8,
                      background:'transparent',border:`1px solid ${C.border}`,
                      color:C.muted,fontSize:14,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
                      Reset
                    </button>
                  )}
                </div>
                <div style={{fontSize:11,color:C.subtle,textAlign:'center',lineHeight:1.6}}>
                  Can't be paused — just like a real exam. Finish early to log your time.
                </div>
              </>
            );
          })()}
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

                    {/* Weak topics from RAG */}
                    {selDetail.weakTopics.length>0&&(
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Drill these topics</div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          {selDetail.weakTopics.map((t,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:C.text}}>
                              <span style={{width:6,height:6,borderRadius:'50%',background:t.status==='red'?'#ef4444':'#f59e0b',flexShrink:0}}/>
                              <span style={{flex:1}}>{t.topic}</span>
                              <span style={{fontSize:9,fontWeight:700,color:t.status==='red'?'#ef4444':'#f59e0b',textTransform:'uppercase'}}>{t.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent papers logged */}
                    {selDetail.recentPapers.length>0&&(
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Recent papers</div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          {selDetail.recentPapers.map((p,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:C.muted}}>
                              <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.paper||'Paper'}</span>
                              <span style={{fontSize:11,fontWeight:700,color:selSubjectObj.color}}>{p.grade||(p.pct+'%')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top error patterns */}
                    {selDetail.topErrors.length>0&&(
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:10,fontWeight:700,color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Top error patterns</div>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          {selDetail.topErrors.map((e,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:C.text}}>
                              <span style={{flex:1}}>{e.label}</span>
                              <span style={{fontSize:10,fontWeight:700,color:'#f97316',background:'#f9731622',padding:'1px 6px',borderRadius:4}}>×{e.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selDetail.weakTopics.length===0&&selDetail.recentPapers.length===0&&selDetail.topErrors.length===0&&(
                      <div style={{marginTop:12,fontSize:11,color:C.subtle,fontStyle:'italic'}}>
                        Log papers and rate topics in Resources to see weak spots here.
                      </div>
                    )}
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
  const [view,       setView]      = useState('subjects'); // subjects | papers
  const [selSubject, setSelSubject] = useState(null);      // null=overview · id · '__weak__'
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

  const linkPrimary={display:'inline-flex',alignItems:'center',gap:5,padding:'7px 13px',
    background:C.accentSoft,border:`1px solid ${C.accent}44`,borderRadius:6,
    color:C.accent,fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:font};
  const linkSecondary={display:'inline-flex',alignItems:'center',gap:5,padding:'7px 13px',
    background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.muted,fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:font};
  const chev=<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>;
  const redColor=RAG.find(r=>r.k==='red')?.color||'#e23b3b';

  return (
    <div>
      <div style={{marginBottom:16}}>
        <h1 style={{...type.h1,color:C.text,margin:'0 0 4px'}}>Topics</h1>
        <p style={{...type.caption,color:C.muted,margin:0}}>Rate every spec topic Red, Amber or Green so you know exactly where to focus.</p>
      </div>

      {selSubject===null ? (<>
        {/* Mode tabs */}
        <div style={{display:'flex',gap:22,borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
          {[['subjects','By subject'],['papers','Paper bank']].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)} style={{background:'none',border:'none',
              cursor:'pointer',fontFamily:'inherit',padding:'0 0 9px',marginBottom:-1,fontSize:14,
              fontWeight:view===id?600:500,color:view===id?C.text:C.muted,
              borderBottom:`2px solid ${view===id?C.text:'transparent'}`}}>{lbl}</button>
          ))}
        </div>

        {view==='subjects' ? (<>
          {/* Overall RAG proportion bar (protected) */}
          {total>0&&(
            <div style={{marginBottom:20}}>
              <div style={{height:8,borderRadius:4,background:C.border,overflow:'hidden',display:'flex',marginBottom:8}}>
                {RAG.map(r=>{
                  const w=total?Math.round((counts[r.k]/total)*100):0;
                  return w>0?<div key={r.k} style={{height:'100%',width:`${w}%`,background:r.color,transition:'width 0.4s ease'}}/>:null;
                })}
              </div>
              <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
                {[...RAG,{k:'unset',label:'unrated',color:C.subtle}].map(r=>(
                  <span key={r.k} style={{...type.caption,color:C.muted,display:'flex',alignItems:'center',gap:5}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:r.color}}/>
                    <span style={{color:C.text,fontWeight:600}}>{counts[r.k]}</span> {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Needs work drill-in */}
          {(counts.red+counts.amber)>0&&(
            <button onClick={()=>setSelSubject('__weak__')} style={{display:'flex',alignItems:'center',gap:12,
              width:'100%',textAlign:'left',padding:'14px 0',borderTop:`1px solid ${C.border}`,
              background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{width:9,height:9,borderRadius:'50%',background:redColor,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,color:C.text}}>Needs work</div>
                <div style={{...type.caption,color:C.muted,marginTop:1}}>{counts.red} red · {counts.amber} amber across all subjects</div>
              </div>
              {chev}
            </button>
          )}

          {/* Subject rows */}
          {subjects.map(s=>{
            const topics=SPEC_TOPICS[s.id]||[];
            const cc={red:0,amber:0,green:0};
            topics.forEach((_,i)=>{const st=rag[`${s.id}_${i}`];if(st&&cc[st]!=null)cc[st]++;});
            const tot=topics.length; const rated=cc.red+cc.amber+cc.green;
            return (
              <button key={s.id} onClick={()=>setSelSubject(s.id)} style={{display:'flex',alignItems:'center',gap:12,
                width:'100%',textAlign:'left',padding:'14px 0',borderTop:`1px solid ${C.border}`,
                background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                <span style={{width:9,height:9,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                  <div style={{height:5,borderRadius:3,background:C.border,overflow:'hidden',display:'flex',maxWidth:200}}>
                    {RAG.map(r=>{const w=tot?Math.round((cc[r.k]/tot)*100):0;return w>0?<div key={r.k} style={{height:'100%',width:`${w}%`,background:r.color}}/>:null;})}
                  </div>
                </div>
                <div style={{...type.caption,color:C.muted,flexShrink:0,textAlign:'right'}}>
                  {rated>0?`${rated}/${tot}`:`${tot} topics`}
                </div>
                {chev}
              </button>
            );
          })}
        </>) : (
          /* Paper bank */
          <div>
            <div style={{...type.caption,color:C.muted,lineHeight:1.6,marginBottom:8}}>
              Official past-paper collections. Links open the board's resources page and Physics &amp; Maths Tutor (PMT).
            </div>
            {subjects.map(s=>{
              const bank=(PAPER_BANK[s.id]||{})[s.boardId];
              return (
                <div key={s.id} style={{padding:'14px 0',borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.name}</div>
                    <div style={{...type.caption,color:C.muted}}>{s.board}</div>
                  </div>
                  {bank?(
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <a href={bank.pmt} target="_blank" rel="noopener noreferrer" style={linkPrimary}>PMT paper bank ↗</a>
                      <a href={bank.board} target="_blank" rel="noopener noreferrer" style={linkSecondary}>Official board page ↗</a>
                    </div>
                  ):(
                    <div style={{...type.caption,color:C.subtle}}>No direct link — search "{s.name} {s.board} past papers".</div>
                  )}
                </div>
              );
            })}
            <div style={{...type.caption,color:C.subtle,marginTop:12,lineHeight:1.7}}>
              Always verify mark schemes and grade boundaries on the official board site. Links last checked May 2026.
            </div>
          </div>
        )}
      </>) : (() => {
        /* Detail: a subject's topics, or the cross-subject weak list */
        const weak = selSubject==='__weak__';
        const sel = weak?null:subjects.find(s=>s.id===selSubject);
        const items = weak
          ? allTopics.filter(t=>t.status==='red'||t.status==='amber')
              .sort((a,b)=>(a.status==='red'?0:1)-(b.status==='red'?0:1))
          : (SPEC_TOPICS[sel?.id]||[]).map((topic,i)=>({topic,i,s:sel,status:rag[`${sel.id}_${i}`]||null}));
        const cc={red:0,amber:0,green:0};
        if(!weak&&sel)(SPEC_TOPICS[sel.id]||[]).forEach((_,i)=>{const st=rag[`${sel.id}_${i}`];if(st&&cc[st]!=null)cc[st]++;});
        const bank=!weak&&sel?(PAPER_BANK[sel.id]||{})[sel.boardId]:null;
        return (<>
          <button onClick={()=>setSelSubject(null)} style={{display:'flex',alignItems:'center',gap:5,
            background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:C.muted,
            fontSize:13,padding:0,marginBottom:14}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            All topics
          </button>

          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{width:11,height:11,borderRadius:'50%',background:weak?redColor:(sel?.color||'#888'),flexShrink:0}}/>
            <h1 style={{...type.h1,fontSize:24,color:C.text,margin:0}}>{weak?'Needs work':sel?.name}</h1>
          </div>
          <div style={{...type.caption,color:C.muted,marginBottom:bank?14:18}}>
            {weak
              ? `${items.length} red & amber topic${items.length===1?'':'s'} — drill these first`
              : `${cc.red} red · ${cc.amber} amber · ${cc.green} green`}
          </div>

          {bank&&(
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>
              <a href={bank.pmt} target="_blank" rel="noopener noreferrer" style={linkPrimary}>PMT paper bank ↗</a>
              <a href={bank.board} target="_blank" rel="noopener noreferrer" style={linkSecondary}>Board page ↗</a>
            </div>
          )}

          {items.length===0?(
            <div style={{...type.body,color:C.muted,textAlign:'center',padding:'18px 0'}}>
              {weak?'Nothing flagged — rate topics Red or Amber to see them here.':'No topics defined for this subject.'}
            </div>
          ):(
            <div>
              {items.map(({topic,i,s})=>(
                <TopicRow key={`${s.id}_${i}`} topic={topic} i={i} s={s} showSubject={weak}/>
              ))}
            </div>
          )}
        </>);
      })()}
    </div>
  );
}

// ── Account ────────────────────────────────────────────────────────────────
function Account({user,subjects,uid,dark,setDark,onSignOut,onResetSubjects,C,font,examSched,scores=[],rag={},isPro=false,stripeCustomerId=null,referralCode=null,analyticsConsent=true,setAnalyticsConsent=()=>{},yearGroup='',setYearGroup=()=>{}}) {
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
  const [referralProUntil, setReferralProUntil] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle, 1=confirm, 2=type-confirm
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportMyData = async () => {
    if (!uid||uid==='anon') return;
    setExporting(true);
    try {
      const [{data:profile},{data:dataRow}] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id',uid).single(),
        supabase.from('user_data').select('*').eq('user_id',uid).eq('profile','me').maybeSingle(),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        app: 'A* Battle Plan',
        format_version: 1,
        profile: profile || null,
        revision_data: dataRow || null,
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `battle-plan-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const deleteMyAccount = async () => {
    setDeleting(true);
    try {
      const {error} = await supabase.rpc('delete_current_user');
      if (error) { alert(`Delete failed: ${error.message}`); setDeleting(false); return; }
      // Clear local storage scoped to this uid
      try { Object.keys(localStorage).filter(k=>k.includes(uid)).forEach(k=>localStorage.removeItem(k)); } catch {}
      await supabase.auth.signOut();
      // signOut triggers boot's SIGNED_OUT handler -> back to landing
    } catch (e) {
      alert(`Delete failed: ${e?.message ?? 'unknown error'}`);
      setDeleting(false);
    }
  };

  useEffect(()=>{
    if (!uid||uid==='anon') return;
    supabase.from('user_profiles').select('school_name,school_opt_in,year_group').eq('id',uid).single()
      .then(({data})=>{
        if (data) {
          setSchoolName(data.school_name||'');
          setSchoolOptIn(!!data.school_opt_in);
          if (data.year_group && !yearGroup) setYearGroup(data.year_group);
        }
      });
    if (!referralCode) return;
    supabase.auth.getSession().then(({data:{session}})=>{
      if (!session) return;
      fetch('/api/referral',{headers:{Authorization:`Bearer ${session.access_token}`}})
        .then(r=>r.json()).then(d=>{
          if (d.count!=null) setReferralCount(d.count);
          if (d.referral_pro_until) setReferralProUntil(d.referral_pro_until);
        }).catch(()=>{});
    });
  },[uid,referralCode]);

  const saveSchool = async (name, optIn, yg) => {
    setSchoolSaving(true);
    await supabase.from('user_profiles').update({school_name:name||null,school_opt_in:optIn,year_group:yg||null}).eq('id',uid);
    setSchoolSaving(false);
  };

  const referralProDays = (()=>{
    if (!referralProUntil) return 0;
    const ms = new Date(referralProUntil).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  })();
  const refsToNextReward = referralCount==null ? null : (3 - (referralCount % 3));

  const shareReferralLink = async () => {
    const link=`https://beattheexam.org/?ref=${referralCode}`;
    const text=`I'm using A* Battle Plan to track my revision and predict my grades — give it a go:`;
    // Prefer the native share sheet (one tap into WhatsApp/iMessage with the
    // link prefilled) — copy-only loses a lot of shares on mobile. Fall back to
    // clipboard on desktop / where the Web Share API isn't available.
    try {
      if (navigator.share) { await navigator.share({ title:'A* Battle Plan', text, url:link }); return; }
    } catch(e) { if (e?.name==='AbortError') return; }
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(()=>setCopySuccess(false),2000);
    } catch {}
  };

  const sendSchedule = async () => {
    if (!user?.email) return;
    setEmailSending(true); setEmailState('idle'); setEmailMsg('');
    const today = new Date().toISOString().split('T')[0];
    const exams = subjects.flatMap(s =>
      getSubjectExams(examSched, s.id, s.boardId, s.options).map(e => ({ subject: s.name, ...e }))
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
    if (isSupabaseConfigured()) {
      await supabase.from('analytics_consent')
        .upsert({user_id:uid, opted_in:v, updated_at:new Date().toISOString()},
          {onConflict:'user_id'});
    }
  };

  // Pro payments aren't live yet — capture interest into pro_waitlist instead.
  // Flip BETA_WAITLIST back to false (or rip this block) once Stripe is live.
  const BETA_WAITLIST = true;
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  useEffect(()=>{
    if (!BETA_WAITLIST || !uid) return;
    (async()=>{
      const {data}=await supabase.from('pro_waitlist').select('id').eq('user_id',uid).maybeSingle();
      if (data) setWaitlistJoined(true);
    })();
  },[uid]);

  const handleUpgrade = async () => {
    if (!user?.email) return;
    if (BETA_WAITLIST) {
      setUpgrading(true); setUpgradeError('');
      const {error}=await supabase.from('pro_waitlist')
        .insert({user_id:uid, email:user.email});
      setUpgrading(false);
      // 23505 = unique violation = already on the list; treat as success
      if (error && error.code !== '23505') { setUpgradeError(error.message); return; }
      setWaitlistJoined(true);
      addToast("You're on the list — we'll email you when Pro launches.", 'success');
      return;
    }
    setUpgrading(true); setUpgradeError('');
    try {
      // The API derives userId/email from the verified JWT (it ignores the body
      // for security), so we MUST send the access token or it 401s.
      const { data:{ session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Please sign in again to upgrade');
      const r = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({customerId:stripeCustomerId||undefined}),
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
      const { data:{ session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Please sign in again');
      const r = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: {'Content-Type':'application/json', Authorization:`Bearer ${token}`},
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

  const [accountTab, setAccountTab] = useState('settings');
  const TABS = [
    ['settings','Settings'],
    ['data','Data & Privacy'],
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {/* Sub-tab nav */}
      <div style={{display:'flex',gap:0,background:C.card2,borderRadius:9,padding:3,
        border:`1px solid ${C.border}`,overflow:'auto',scrollbarWidth:'none',msOverflowStyle:'none'}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setAccountTab(id)}
            style={{padding:'8px 14px',borderRadius:7,border:'none',flexShrink:0,
              background:accountTab===id?C.surface:'transparent',
              color:accountTab===id?C.text:C.muted,
              fontSize:12,fontWeight:accountTab===id?700:500,fontFamily:font,cursor:'pointer',
              boxShadow:accountTab===id?'0 1px 3px rgba(0,0,0,0.12)':'none',
              transition:'all 0.15s',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>

      {accountTab==='settings'&&<>
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
              {BETA_WAITLIST
                ? "Pro isn't quite ready yet — payments aren't live during the beta. Join the waitlist and you'll be the first to know when it launches."
                : "Upgrade to Pro to unlock email reports, companion chat, and more — supporting ongoing development."}
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
            <button onClick={handleUpgrade} disabled={upgrading||!user||(BETA_WAITLIST&&waitlistJoined)}
              style={{width:'100%',padding:'11px',
                background:(BETA_WAITLIST&&waitlistJoined)?C.card2:(upgrading?C.card2:C.accent),
                border:`1px solid ${(BETA_WAITLIST&&waitlistJoined)?C.border:(upgrading?C.border:C.accent)}`,borderRadius:8,
                color:(BETA_WAITLIST&&waitlistJoined)?C.muted:(upgrading?C.muted:'#fff'),
                fontSize:14,fontWeight:700,fontFamily:font,
                cursor:upgrading||!user||(BETA_WAITLIST&&waitlistJoined)?'not-allowed':'pointer',transition:'background 0.15s'}}>
              {BETA_WAITLIST
                ? (waitlistJoined ? "✓ You're on the waitlist" : (upgrading ? 'Adding you…' : 'Join the Pro waitlist'))
                : (upgrading?'Redirecting to checkout…':'Upgrade to Pro — £4.99/mo')}
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
            {BETA_WAITLIST
              ? (waitlistJoined ? '✓ On the waitlist' : (upgrading ? 'Adding you…' : 'Join the Pro waitlist'))
              : (upgrading?'Redirecting…':'Unlock with Pro')}
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
            {BETA_WAITLIST
              ? (waitlistJoined ? '✓ On the waitlist' : (upgrading ? 'Adding you…' : 'Join the Pro waitlist'))
              : (upgrading?'Redirecting…':'Unlock with Pro')}
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
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Refer a friend</div>
          <span style={{fontSize:10,fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.32)',borderRadius:4,padding:'1px 6px',letterSpacing:0.3}}>EARN PRO</span>
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Every <strong style={{color:C.text}}>3 friends</strong> who sign up via your link earns you{' '}
          <strong style={{color:C.text}}>1 free week of Pro</strong>. Stack them up.
        </div>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <div style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,
            padding:'9px 12px',fontSize:12,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
            fontFamily:"'JetBrains Mono',monospace"}}>
            beattheexam.org/?ref={referralCode}
          </div>
          <button onClick={shareReferralLink}
            style={{flexShrink:0,padding:'9px 16px',background:copySuccess?'rgba(74,222,128,0.1)':C.accentSoft,
              border:`1px solid ${copySuccess?'rgba(74,222,128,0.3)':C.accent}44`,borderRadius:8,
              color:copySuccess?C.success:C.accent,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer',
              transition:'all 0.15s'}}>
            {copySuccess?'Copied!':'Share link'}
          </button>
        </div>
        {referralProDays>0&&(
          <div style={{background:'rgba(251,191,36,0.07)',border:'1px solid rgba(251,191,36,0.28)',
            borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:C.text}}>
            <strong style={{color:'#fbbf24'}}>🎉 Pro active</strong> for the next <strong>{referralProDays} day{referralProDays!==1?'s':''}</strong> via referrals.
          </div>
        )}
        {referralCount!==null&&(
          <>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <div style={{fontSize:12,color:C.subtle,flex:1}}>
                {referralCount===0?'No referrals yet — share your link to get started.'
                  :`${referralCount} joined · ${refsToNextReward} more to unlock the next week`}
              </div>
              <div style={{fontSize:11,fontWeight:700,color:C.accent}}>{referralCount}/{Math.ceil((referralCount+1)/3)*3}</div>
            </div>
            <div style={{height:6,background:C.border,borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${((referralCount%3)/3)*100}%`,background:C.accent,
                borderRadius:3,transition:'width 0.4s'}}/>
            </div>
          </>
        )}
      </div>
      )}

      {/* School leaderboard opt-in */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>School leaderboard</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
          Enter your school name and opt in to appear on the anonymous school leaderboard in the Groups tab. Only your school's average score is visible — never individual data.
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
        <div style={{fontSize:11,color:C.subtle,marginBottom:6}}>Year group (optional — used for filtering)</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
          {['Y10','Y11','Y12','Y13'].map(y=>(
            <button key={y} onClick={()=>setYearGroup(yearGroup===y?'':y)}
              style={{padding:'5px 11px',borderRadius:6,
                background:yearGroup===y?C.accentSoft:'transparent',
                border:`1px solid ${yearGroup===y?C.accent:C.border}`,
                color:yearGroup===y?C.accent:C.muted,
                fontSize:11,fontWeight:yearGroup===y?700:500,fontFamily:font,cursor:'pointer'}}>
              {y}
            </button>
          ))}
        </div>
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
        <button onClick={()=>saveSchool(schoolName,schoolOptIn,yearGroup)} disabled={schoolSaving}
          style={{width:'100%',padding:'10px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
            borderRadius:8,color:C.accent,fontSize:13,fontWeight:600,fontFamily:font,
            cursor:schoolSaving?'not-allowed':'pointer'}}>
          {schoolSaving?'Saving…':'Save school settings'}
        </button>
      </div>
      </>}

      {accountTab==='data'&&<>
      {/* Your data — GDPR Article 20 (portability) + Article 17 (erasure) */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'18px 20px'}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>
          Your data
        </div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>
          Your data belongs to you. Download a complete JSON copy of everything
          we have on file, or permanently delete your account at any time.
          We comply with UK GDPR (Article 17 erasure, Article 20 portability).
        </div>

        <button onClick={exportMyData} disabled={exporting||uid==='anon'}
          style={{width:'100%',padding:'10px',background:C.card2,border:`1px solid ${C.border}`,
            borderRadius:8,color:C.text,fontSize:13,fontWeight:600,fontFamily:font,
            cursor:exporting?'wait':'pointer',marginBottom:10}}>
          {exporting?'Preparing…':'Export my data (JSON)'}
        </button>

        {deleteStep===0&&(
          <button onClick={()=>setDeleteStep(1)}
            style={{width:'100%',padding:'10px',background:'transparent',
              border:`1px solid ${C.danger}40`,borderRadius:8,color:C.danger,
              fontSize:13,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
            Delete my account
          </button>
        )}
        {deleteStep===1&&(
          <div style={{padding:'12px',background:`${C.danger}0a`,
            border:`1px solid ${C.danger}40`,borderRadius:8}}>
            <div style={{fontSize:12,color:C.text,marginBottom:10,lineHeight:1.6}}>
              This <strong>permanently</strong> deletes your account, all your
              papers, scores, errors, group memberships, and referral history.
              It cannot be undone.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setDeleteStep(2)}
                style={{flex:1,padding:'9px',background:C.danger,border:'none',
                  borderRadius:7,color:'#fff',fontSize:12,fontWeight:700,
                  fontFamily:font,cursor:'pointer'}}>
                I understand — continue
              </button>
              <button onClick={()=>setDeleteStep(0)}
                style={{padding:'9px 14px',background:'transparent',
                  border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,
                  fontSize:12,fontFamily:font,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteStep===2&&(
          <div style={{padding:'12px',background:`${C.danger}0a`,
            border:`1px solid ${C.danger}40`,borderRadius:8}}>
            <div style={{fontSize:12,color:C.text,marginBottom:10,lineHeight:1.6}}>
              Type <strong style={{fontFamily:"'JetBrains Mono',monospace"}}>DELETE</strong> below
              to confirm. Your account will be removed within seconds and you'll
              be signed out.
            </div>
            <input value={deleteText} onChange={e=>setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{width:'100%',boxSizing:'border-box',padding:'9px 11px',
                background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,
                color:C.text,fontSize:13,fontFamily:font,outline:'none',marginBottom:10}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={deleteMyAccount}
                disabled={deleteText!=='DELETE'||deleting}
                style={{flex:1,padding:'9px',
                  background:deleteText==='DELETE'?C.danger:C.card2,
                  border:`1px solid ${deleteText==='DELETE'?C.danger:C.border}`,
                  borderRadius:7,
                  color:deleteText==='DELETE'?'#fff':C.muted,
                  fontSize:12,fontWeight:700,fontFamily:font,
                  cursor:deleteText==='DELETE'&&!deleting?'pointer':'not-allowed'}}>
                {deleting?'Deleting…':'Permanently delete my account'}
              </button>
              <button onClick={()=>{setDeleteStep(0);setDeleteText('');}}
                disabled={deleting}
                style={{padding:'9px 14px',background:'transparent',
                  border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,
                  fontSize:12,fontFamily:font,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={onSignOut}
        style={{width:'100%',padding:'12px',background:'transparent',
          border:`1px solid ${C.danger}40`,borderRadius:10,color:C.danger,
          fontSize:13,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
        Sign out
      </button>

      {/* Footer: beta notice + ToS link */}
      <div style={{textAlign:'center',padding:'12px 0 4px',fontSize:11,color:C.subtle,lineHeight:1.8}}>
        <div>
          <strong style={{color:C.muted}}>A* Battle Plan</strong>
          <span style={{marginLeft:6,padding:'1px 7px',background:C.accentSoft,
            border:`1px solid ${C.accent}55`,borderRadius:8,fontSize:9,
            fontWeight:800,color:C.accent,letterSpacing:0.5}}>BETA</span>
        </div>
        <div style={{marginTop:4}}>
          <button onClick={()=>setShowTerms(true)}
            style={{background:'transparent',border:'none',color:C.muted,
              fontSize:11,fontFamily:font,cursor:'pointer',textDecoration:'underline',
              padding:0}}>
            Terms of Service &amp; Privacy Policy
          </button>
        </div>
        <div style={{marginTop:2,fontSize:10}}>
          Built in the UK · Data stored in EU under UK GDPR
        </div>
      </div>
      </>}

      {showTerms && <TermsOfService onClose={()=>setShowTerms(false)}/>}
    </div>
  );
}

// ── Timetable view ─────────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const PERIODS = ['Period 1','Period 2','Period 3','Period 4','Period 5','Period 6'];
const BREAK_AFTER = [1, 3]; // show break row after period index 1 (after P2) and 3 (after P4)

function TimetableView({ timetable, onSave, C, font }) {
  const [editing, setEditing] = useState(null); // {day, period}
  const [draft, setDraft] = useState('');

  const cellKey = (day, period) => `${day}__${period}`;
  const get = (day, period) => timetable[cellKey(day, period)] || '';

  const startEdit = (day, period) => {
    setEditing({day, period});
    setDraft(get(day, period));
  };

  const commitEdit = () => {
    if (!editing) return;
    const key = cellKey(editing.day, editing.period);
    const updated = {...timetable, [key]: draft.trim()};
    if (!draft.trim()) delete updated[key];
    onSave(updated);
    setEditing(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const filledCount = Object.values(timetable).filter(v=>v).length;

  return (
    <div style={{maxWidth:900}}>
      <div style={{marginBottom:24}}>
        <h2 style={{...type.h1,color:C.text,margin:'0 0 6px'}}>School Timetable</h2>
        <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:font}}>
          Click any slot to add your lesson. {filledCount > 0 ? `${filledCount} slots filled.` : 'Your week at a glance.'}
        </p>
      </div>

      <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
        <table style={{borderCollapse:'collapse',width:'100%',minWidth:520,fontFamily:font}}>
          <thead>
            <tr>
              <th style={{width:90,padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:600,
                color:C.subtle,textTransform:'uppercase',letterSpacing:0.5,borderBottom:`1px solid ${C.border}`}}></th>
              {DAYS.map(d=>(
                <th key={d} style={{padding:'8px 8px',textAlign:'center',fontSize:12,fontWeight:700,
                  color:C.text,borderBottom:`1px solid ${C.border}`,letterSpacing:0.2}}>{d.slice(0,3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pi) => (
              <React.Fragment key={period}>
                <tr>
                  <td style={{padding:'6px 12px',fontSize:11,fontWeight:600,color:C.muted,
                    textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap',
                    borderBottom:`1px solid ${C.border}44`}}>
                    {period}
                  </td>
                  {DAYS.map(day => {
                    const isEditing = editing?.day===day && editing?.period===period;
                    const value = get(day, period);
                    return (
                      <td key={day} style={{padding:'4px',borderBottom:`1px solid ${C.border}44`}}>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={e=>setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. Maths"
                            style={{
                              width:'100%',padding:'8px 10px',
                              background:C.surface,border:`1px solid ${C.accent}88`,
                              borderRadius:6,color:C.text,fontSize:12,
                              fontFamily:font,outline:'none',boxSizing:'border-box',
                            }}
                          />
                        ) : (
                          <button
                            onClick={()=>startEdit(day, period)}
                            style={{
                              width:'100%',minHeight:40,padding:'6px 10px',
                              background:value?`${C.accent}0d`:'transparent',
                              border:`1px solid ${value?C.accent+'33':C.border+'66'}`,
                              borderRadius:6,cursor:'pointer',textAlign:'left',
                              fontSize:12,fontWeight:value?600:400,
                              color:value?C.text:C.subtle,fontFamily:font,
                              transition:'background 0.12s,border-color 0.12s',
                            }}
                          >
                            {value || <span style={{opacity:0.35,fontSize:11}}>+</span>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {BREAK_AFTER.includes(pi) && (
                  <tr>
                    <td style={{padding:'4px 12px',fontSize:10,color:C.subtle,fontStyle:'italic',
                      letterSpacing:0.2}}>Break</td>
                    {DAYS.map(d=>(
                      <td key={d} style={{background:`${C.border}22`,height:22}}/>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filledCount > 0 && (
        <div style={{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
          <button
            onClick={()=>onSave({})}
            style={{padding:'7px 14px',background:'transparent',
              border:`1px solid ${C.border}`,borderRadius:7,
              color:C.muted,fontSize:12,fontFamily:font,cursor:'pointer'}}>
            Clear all
          </button>
        </div>
      )}

      <p style={{marginTop:16,fontSize:11,color:C.subtle,fontFamily:font}}>
        Click any slot to edit. Press Enter to save, Escape to cancel. Your timetable is saved automatically.
      </p>
    </div>
  );
}

// ── Landing page ───────────────────────────────────────────────────────────
function LandingPage({ onGetStarted }) {
  const font = FONT_BODY;
  const display = FONT_DISPLAY;
  const mono = FONT_MONO;
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

  const TRUST = ['Free — no credit card', 'A-Levels & GCSEs', 'Works on mobile', 'No ads'];

  return (
    <div style={{minHeight:'100vh', background:C.bg, fontFamily:font, color:C.text}}>

      {/* Nav — the one frosted layer in the app */}
      <nav style={{position:'fixed', top:0, left:0, right:0, zIndex:100,
        background:C.nav, backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)', borderBottom:`1px solid ${C.border}`,
        height:56, display:'flex', alignItems:'center', padding:'0 24px',
        justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:26, height:26, borderRadius:6, background:C.accent,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:mono, fontWeight:800, fontSize:11, color:'#fff'}}>A*</div>
          <span style={{fontFamily:display, fontSize:17, fontWeight:600, color:C.text, letterSpacing:'-0.01em'}}>Battle Plan</span>
        </div>
        <button onClick={onGetStarted}
          style={{padding:'7px 15px', background:'transparent', border:`1px solid ${C.border}`,
            borderRadius:6, color:C.muted, fontSize:13, fontWeight:500,
            fontFamily:font, cursor:'pointer'}}>
          Sign in
        </button>
      </nav>

      {/* Hero — left-aligned, asymmetric */}
      <section style={{maxWidth:1040, margin:'0 auto', padding:'132px 24px 72px'}}>
        <div style={{maxWidth:760}}>
          {/* Flat eyebrow — a thin accent rule, not a pill */}
          <div style={{...type.eyebrow, color:C.accent, marginBottom:22,
            display:'flex', alignItems:'center', gap:10}}>
            <span style={{width:22, height:1.5, background:C.accent, display:'inline-block'}}/>
            Free during beta
          </div>
          <h1 style={{...type.display, fontSize:'clamp(40px, 6.4vw, 66px)',
            color:C.text, margin:'0 0 22px'}}>
            Know exactly where<br/>
            <span style={{color:C.accent}}>you're losing marks.</span>
          </h1>
          <p style={{...type.body, fontSize:'clamp(16px, 1.9vw, 19px)', color:C.muted,
            margin:'0 0 34px', maxWidth:560}}>
            Free revision tracker for A-Levels and GCSEs. Log past papers, track your grade trajectory,
            and fix weak topics before exam day.
          </p>
          <button onClick={onGetStarted}
            style={{display:'inline-flex', alignItems:'center', gap:9, padding:'14px 26px',
              background:C.accent, border:'none', borderRadius:6, color:'#fff',
              fontSize:15, fontWeight:600, fontFamily:font, cursor:'pointer'}}>
            Get started — it's free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          <div style={{display:'flex', gap:18, flexWrap:'wrap', marginTop:26}}>
            {TRUST.map(t => (
              <span key={t} style={{...type.caption, color:C.subtle, display:'flex',
                alignItems:'center', gap:6}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.subtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features — asymmetric: intro column + a structured list, not a card grid */}
      <section style={{maxWidth:1040, margin:'0 auto', padding:'8px 24px 96px'}}>
        <div style={{display:'flex', flexWrap:'wrap', gap:'48px 56px', alignItems:'flex-start'}}>
          <div style={{flex:'1 1 240px', minWidth:0, maxWidth:340}}>
            <h2 style={{...type.h2, fontSize:'clamp(24px, 3vw, 32px)', color:C.text, margin:'0 0 12px'}}>
              Everything you need to walk in ready.
            </h2>
            <p style={{...type.body, color:C.muted, margin:0}}>
              Four tools, one place. Built around how marks are actually won and lost.
            </p>
          </div>
          <div style={{flex:'2 1 460px', minWidth:0}}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{display:'flex', gap:18, alignItems:'flex-start',
                padding:'22px 0', borderTop:i===0 ? 'none' : `1px solid ${C.border}`}}>
                <div style={{color:C.subtle, flexShrink:0, marginTop:1}}>{f.icon}</div>
                <div>
                  <div style={{...type.h3, color:C.text, marginBottom:5}}>{f.title}</div>
                  <div style={{...type.body, fontSize:13.5, color:C.muted, maxWidth:520}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — flat band, left/right rhythm (not centered) */}
      <section style={{borderTop:`1px solid ${C.border}`, background:C.surface}}>
        <div style={{maxWidth:1040, margin:'0 auto', padding:'52px 24px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          gap:'28px 40px', flexWrap:'wrap'}}>
          <div style={{maxWidth:520}}>
            <div style={{...type.h2, fontSize:'clamp(22px, 2.6vw, 30px)', color:C.text, margin:'0 0 8px'}}>
              Exams are in weeks. Start now.
            </div>
            <div style={{...type.caption, color:C.subtle}}>
              Supports AQA · Edexcel · OCR · WJEC · A-Levels &amp; GCSEs
            </div>
          </div>
          <button onClick={onGetStarted}
            style={{display:'inline-flex', alignItems:'center', gap:8, padding:'13px 24px',
              background:'transparent', border:`1px solid ${C.accent}`,
              borderRadius:6, color:C.accent, fontSize:14, fontWeight:600,
              fontFamily:font, cursor:'pointer', flexShrink:0}}>
            Set up your account — 2 minutes
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
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
  const hasHistData=paperYear&&HISTORICAL_GRADE_PCT[histBaseName(paperBase)]?.[paperYear];

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

  // Magic-link auto-join: if /j/CODE was captured pre-auth, join the group now
  useEffect(()=>{
    const code = sessionStorage.getItem('rbp_join_code');
    if (!code) return;
    sessionStorage.removeItem('rbp_join_code');
    (async()=>{
      const {data:{session}} = await supabase.auth.getSession();
      if (!session) return;
      try {
        const r = await fetch('/api/groups',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
          body:JSON.stringify({action:'join',invite_code:code}),
        });
        const d = await r.json();
        if (d.group) { addToast(`Joined "${d.group.name}"`,'success'); setView('groups'); }
        else if (d.error==='Already in this group') { addToast('You\'re already in that group','info'); setView('groups'); }
        else if (d.error) addToast(d.error,'error');
      } catch { addToast('Could not join group','error'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const uid      = user?.id??'anon';
  const [scores,   setScores]    = useState(()=>ls.get(`rbp_scores_${uid}`,[]));
  const [errors,   setErrors]    = useState(()=>ls.get(`rbp_errors_${uid}`,[]));
  const [rag,      setRag]       = useState(()=>ls.get(`rbp_rag_${uid}`,{}));
  const [ragNotes, setRagNotes]  = useState(()=>ls.get(`rbp_rag_notes_${uid}`,{}));
  const [sessions, setSessions]  = useState(()=>ls.get(`rbp_sessions_${uid}`,[]));

  const C    = dark?T.dark:T.light;
  const font = FONT_BODY;
  const isGcse = examLevel === 'gcse';
  const isAS = examLevel === 'aslevel';
  let subjects = subjectsFromSelection(selection, isGcse ? GCSE_CATALOG : null);
  // AS-Level: drop A* and lower boundaries by ~5 points across the board
  if (isAS) {
    subjects = subjects.map(s=>{
      const gb = s.gradeBoundaries||{};
      const next = {};
      for (const g of ['A','B','C','D','E']) if (g in gb) next[g] = Math.max(0, (gb[g]||0) - 5);
      return {...s, gradeBoundaries: next};
    });
  }

  // ── Companion state (lifted from CompanionCard to here so sidebar can access) ──
  const [companion,setCompanion] = useState(()=>{
    const defaults={name:'Caps',skin:0,outfitColor:0,accessory:0};
    const scoped=ls.get(`rbp_companion_${uid}`,null);
    if (scoped) return {...defaults,...scoped};
    const legacy=ls.get('rbp_companion',null);
    if (legacy) { ls.set(`rbp_companion_${uid}`,legacy); return {...defaults,...legacy}; }
    return defaults;
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

  const saveCompanion = (c) => { setCompanion(c); ls.set(`rbp_companion_${uid}`,c); };

  // Mascot notifications — generated from state, dismissed-set persisted on companion
  const mascotNots = generateMascotNotifications({
    scores, sessions, subjects, examSched,
    coinsEarned: computeCoins(scores, sessions, companion?.spent_coins||0).earned,
    dismissed: companion?.mascot_dismissed || [],
  });
  const dismissMascotNot = (id) => {
    saveCompanion({...companion,
      mascot_dismissed: [...new Set([...(companion?.mascot_dismissed||[]), id])].slice(-50),
    });
  };

  useEffect(()=>ls.set(`rbp_rag_notes_${uid}`,ragNotes),[ragNotes]);

  const defaultTargets = Object.fromEntries(subjects.map(s=>[s.name, isGcse ? '9' : isAS ? 'A' : 'A*']));
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
  const [timetable, setTimetable] = useState(()=>ls.get(`rbp_timetable_${uid}`,{}));
  const saveTimetable = (t) => { setTimetable(t); ls.set(`rbp_timetable_${uid}`,t); };
  const [sidebarOpen, setSidebarOpen] = useState(()=>ls.get('rbp_sidebar_open',true));
  const toggleSidebar = () => { const v=!sidebarOpen; setSidebarOpen(v); ls.set('rbp_sidebar_open',v); };
  const [unlockedAch, setUnlockedAch] = useState(()=>ls.get(`rbp_ach_${uid}`,[]));
  const [analyticsConsent, setAnalyticsConsent] = useState(()=>ls.get(`rbp_analytics_${uid}`,true));
  const [insNoted, setInsNoted] = useState(()=>ls.get(`rbp_ins_noted_${uid}`,false));
  const [shareTheme, setShareTheme] = useState(()=>ls.get(`rbp_share_theme_${uid}`,'dark'));
  const [shareAspect, setShareAspect] = useState(()=>ls.get(`rbp_share_aspect_${uid}`,'landscape'));
  const [yearGroup, setYearGroup] = useState('');
  useEffect(()=>ls.set(`rbp_share_theme_${uid}`,shareTheme),[shareTheme,uid]);
  useEffect(()=>ls.set(`rbp_share_aspect_${uid}`,shareAspect),[shareAspect,uid]);
  const [myPlan, setMyPlan] = useState(()=>ls.get(`rbp_my_plan_${uid}`,[]));
  useEffect(()=>ls.set(`rbp_my_plan_${uid}`,myPlan),[myPlan,uid]);
  useEffect(()=>{
    if (!user?.id||!isSupabaseConfigured()) { setSyncLoaded(true); return; }
    const localScores    = ls.get(`rbp_scores_${uid}`,[]);
    const localErrors    = ls.get(`rbp_errors_${uid}`,[]);
    const localRag       = ls.get(`rbp_rag_${uid}`,{});
    const localTargets   = ls.get(`rbp_targets_${uid}`,{});
    const localSessions  = ls.get(`rbp_sessions_${uid}`,[]);
    const localRagNotes  = ls.get(`rbp_rag_notes_${uid}`,{});
    const localTimetable = ls.get(`rbp_timetable_${uid}`,{});
    const localCompanion = ls.get(`rbp_companion_${uid}`,null);
    const localAch       = ls.get(`rbp_ach_${uid}`,[]);
    const localPlan      = ls.get(`rbp_my_plan_${uid}`,[]);
    supabase.from('user_data').select('scores,errors,rag,targets,sessions,rag_notes,timetable,companion,achievements,my_plan').eq('user_id',user.id).eq('profile','me').single()
      .then(({data})=>{
        let mergedScores    = localScores,
            mergedErrors    = localErrors,
            mergedRag       = localRag,
            mergedTargets   = localTargets,
            mergedSessions  = localSessions,
            mergedRagNotes  = localRagNotes,
            mergedTimetable = localTimetable,
            mergedCompanion = localCompanion,
            mergedAch       = localAch,
            mergedPlan      = localPlan;
        if (data) {
          // Merge server rows into local, de-duping by id, then sort newest-first
          // so a paper logged on another device can't land at the bottom and skew
          // the analytics trend.
          const scoreIds = new Set(localScores.map(s=>s.id));
          mergedScores = [...localScores, ...(data.scores||[]).filter(s=>!scoreIds.has(s.id))].sort((a,b)=>(b.ts||b.id)-(a.ts||a.id));
          const errorIds = new Set(localErrors.map(e=>e.id));
          mergedErrors = [...localErrors, ...(data.errors||[]).filter(e=>!errorIds.has(e.id))].sort((a,b)=>(b.ts||b.id)-(a.ts||a.id));
          if (data.rag&&Object.keys(data.rag).length>0) mergedRag={...data.rag,...localRag};
          if (data.targets&&Object.keys(data.targets).length>0&&!Object.keys(localTargets).length) mergedTargets=data.targets;
          if (data.sessions?.length) {
            const sessionIds = new Set(localSessions.map(s=>s.id));
            mergedSessions = [...localSessions, ...(data.sessions||[]).filter(s=>!sessionIds.has(s.id))];
          }
          if (data.rag_notes&&Object.keys(data.rag_notes).length>0) mergedRagNotes={...data.rag_notes,...localRagNotes};
          if (data.timetable&&Object.keys(data.timetable).length>0&&!Object.keys(localTimetable).length) mergedTimetable=data.timetable;
          if (data.companion&&Object.keys(data.companion).length>0) mergedCompanion={...(localCompanion||{}),...data.companion};
          if (Array.isArray(data.achievements)&&data.achievements.length>0) mergedAch=[...new Set([...(localAch||[]),...data.achievements])];
          if (Array.isArray(data.my_plan)) {
            const planIds = new Set(localPlan.map(p=>p.id));
            mergedPlan = [...localPlan, ...data.my_plan.filter(p=>!planIds.has(p.id))];
          }
          setScores(mergedScores);        ls.set(`rbp_scores_${uid}`,mergedScores);
          setErrors(mergedErrors);        ls.set(`rbp_errors_${uid}`,mergedErrors);
          setRag(mergedRag);              ls.set(`rbp_rag_${uid}`,mergedRag);
          setTargets(mergedTargets);      ls.set(`rbp_targets_${uid}`,mergedTargets);
          setSessions(mergedSessions);    ls.set(`rbp_sessions_${uid}`,mergedSessions);
          setRagNotes(mergedRagNotes);    ls.set(`rbp_rag_notes_${uid}`,mergedRagNotes);
          setTimetable(mergedTimetable);  ls.set(`rbp_timetable_${uid}`,mergedTimetable);
          if (mergedCompanion) { setCompanion(c=>({...c,...mergedCompanion})); ls.set(`rbp_companion_${uid}`,mergedCompanion); }
          setUnlockedAch(mergedAch);      ls.set(`rbp_ach_${uid}`,mergedAch);
          setMyPlan(mergedPlan);          ls.set(`rbp_my_plan_${uid}`,mergedPlan);
        }
        supabase.from('user_data').upsert(
          {user_id:user.id,profile:'me',scores:mergedScores,errors:mergedErrors,rag:mergedRag,targets:mergedTargets,sessions:mergedSessions,rag_notes:mergedRagNotes,timetable:mergedTimetable,companion:mergedCompanion||companion,achievements:mergedAch,my_plan:mergedPlan,updated_at:new Date().toISOString()},
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
        {user_id:user.id,profile:'me',scores,errors,rag,targets,sessions,rag_notes:ragNotes,timetable,companion,achievements:unlockedAch,my_plan:myPlan,updated_at:new Date().toISOString()},
        {onConflict:'user_id,profile'}
      ).then(({error})=>{
        if(error) addToast('Auto-save failed — your data is safe locally','warn');
      });
      // leaderboard_score + papers_count are computed server-side by the
      // recompute_leaderboard_score trigger on user_data; we only touch
      // safe columns here.
      const profileUpdate={last_seen_at:new Date().toISOString()};
      supabase.from('user_profiles').update(profileUpdate).eq('id',user.id);
    },2000);
    return ()=>clearTimeout(syncRef.current);
  },[scores,errors,rag,targets,sessions,ragNotes,timetable,companion,unlockedAch,myPlan,syncLoaded]);

  // Settings sync — load once from user_profiles.user_settings, then debounced push on changes
  const settingsSyncRef = useRef(null);
  const settingsLoadedRef = useRef(false);
  useEffect(()=>{
    if (!user?.id||!isSupabaseConfigured()) { settingsLoadedRef.current = true; return; }
    supabase.from('user_profiles').select('user_settings').eq('id',user.id).single()
      .then(({data})=>{
        const s = data?.user_settings;
        if (s && typeof s === 'object') {
          if (typeof s.dark === 'boolean') { setDark(s.dark); ls.set('rbp_dark',s.dark); }
          if (typeof s.tour_done === 'boolean') { setShowTour(!s.tour_done); if (s.tour_done) ls.set('rbp_tour_v1',true); }
          if (typeof s.sidebar_open === 'boolean') { setSidebarOpen(s.sidebar_open); ls.set('rbp_sidebar_open',s.sidebar_open); }
          if (typeof s.analytics_consent === 'boolean') setAnalyticsConsent(s.analytics_consent);
          if (typeof s.ins_noted === 'boolean') setInsNoted(s.ins_noted);
          if (typeof s.share_theme === 'string') setShareTheme(s.share_theme);
          if (typeof s.share_aspect === 'string') setShareAspect(s.share_aspect);
        }
      })
      .finally(()=>{ settingsLoadedRef.current = true; });
  },[user?.id]);
  useEffect(()=>{
    if (!user?.id||!isSupabaseConfigured()||!syncLoaded) return;
    // Skip until initial remote load completes — don't push stale local values over remote
    if (!settingsLoadedRef.current) return;
    clearTimeout(settingsSyncRef.current);
    settingsSyncRef.current = setTimeout(()=>{
      supabase.from('user_profiles').update({user_settings:{
        dark, tour_done:!showTour, sidebar_open:sidebarOpen, analytics_consent:analyticsConsent, ins_noted:insNoted,
        share_theme: shareTheme, share_aspect: shareAspect,
      }}).eq('id',user.id);
    }, 1500);
    return ()=>clearTimeout(settingsSyncRef.current);
  },[dark,showTour,sidebarOpen,analyticsConsent,insNoted,shareTheme,shareAspect,syncLoaded]);

  // Mirror analytics_consent + ins_noted to localStorage (matches the existing dark/tour/sidebar pattern)
  useEffect(()=>ls.set(`rbp_analytics_${uid}`,analyticsConsent),[analyticsConsent,uid]);
  useEffect(()=>ls.set(`rbp_ins_noted_${uid}`,insNoted),[insNoted,uid]);

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
  useEffect(()=>{
    if(!scores.length && !sessions.length && !myPlan.length) return;
    const coinsState = computeCoins(scores, sessions, companion?.spent_coins||0);
    const extras = {
      examSched,
      coinsEarned: coinsState.earned,
      ownedItems: totalOwnedItems(companion?.owned || defaultOwned()),
      myPlanCount: myPlan.length,
    };
    const current=computeUnlockedAchievements(scores,errors,subjects,extras);
    const prevSet=new Set(unlockedAch);
    const newlyUnlocked=current.filter(id=>!prevSet.has(id));
    if(newlyUnlocked.length>0){
      setUnlockedAch(current);
      ls.set(`rbp_ach_${uid}`,current);
      const a=ACHIEVEMENTS.find(x=>x.id===newlyUnlocked[0]);
      if(a&&!pendingAchievement) setPendingAchievement(a);
    }
  },[scores,errors,sessions,myPlan,companion]);

  const unlockedIds=unlockedAch;

  const DESKTOP_NAV=[
    {id:'analytics',    label:'Analytics',    Icon:BarChart3},
    {id:'tracker',      label:'Tracker',      Icon:PenLine},
    {id:'exams',        label:'Exams',        Icon:CalendarDays},
    {id:'plan',         label:'Plan',         Icon:ClipboardList},
    {id:'achievements', label:'Achievements', Icon:Trophy},
    {id:'groups',       label:'Groups',       Icon:Users},
    {id:'friends',      label:'Friends',      Icon:UserPlus, comingSoon:true},
    {id:'timer',        label:'Timer',        Icon:Timer},
    {id:'resources',    label:'Topics',       Icon:BookOpen},
    {id:'account',      label:'Account',      Icon:User},
  ];
  const sidebarW = sidebarOpen ? (isMobile ? 54 : 210) : 0;

  const vp={subjects,scores,errors,uid,C,font,examSched,rag,setRag,targets,setTargets,ragNotes,setRagNotes,sessions,addToast,isPro,stripeCustomerId,referralCode,examLevel,isGcse,isAS,analyticsConsent,setAnalyticsConsent,insNoted,setInsNoted,myPlan,setMyPlan,shareTheme,setShareTheme,shareAspect,setShareAspect,yearGroup,setYearGroup};

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:font,color:C.text}}>
      {/* ── Speech bubble (desktop: right of sidebar, mobile: top-centre) ── */}
      {showBubble&&(
        <div style={{
          position:'fixed',
          left: sidebarW + 10, top: 16,
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
            <span style={{fontSize:10,fontWeight:700,color:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent,sleepy:'#64748b'}[mood]||C.accent,
              background:'rgba(0,0,0,0.06)',borderRadius:4,padding:'1px 6px'}}>
              {{happy:'Happy',excited:'Pumped',worried:'Worried',neutral:'Ready',sleepy:'Sleepy'}[mood]||'Ready'}
            </span>
            <button onClick={()=>setShowBubble(false)}
              style={{marginLeft:'auto',background:'transparent',border:'none',color:C.subtle,
                cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px'}}>✕</button>
          </div>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.65,margin:'0 0 10px'}}>{message}</p>

          {mascotNots.length>0&&(
            <div style={{margin:'0 0 10px',padding:'8px 10px',background:C.card2,
              borderRadius:8,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{fontSize:9,fontWeight:800,letterSpacing:0.5,color:C.subtle,
                textTransform:'uppercase'}}>
                📬 From {companion.name} ({mascotNots.length})
              </div>
              {mascotNots.map(n=>{
                const kc = n.kind==='celebrate' ? '#22c55e'
                  : n.kind==='warn' ? '#f97316' : C.accent;
                return (
                  <div key={n.id} style={{display:'flex',alignItems:'flex-start',gap:6,
                    padding:'6px 8px',background:`${kc}10`,borderRadius:6,
                    borderLeft:`3px solid ${kc}`}}>
                    <div style={{flex:1,fontSize:12,color:C.text,lineHeight:1.45}}>{n.msg}</div>
                    <button onClick={()=>dismissMascotNot(n.id)}
                      style={{background:'transparent',border:'none',color:C.subtle,
                        cursor:'pointer',fontSize:13,lineHeight:1,padding:'0 2px',flexShrink:0}}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {isPro&&(
            <button onClick={()=>{setShowBubble(false);setCompanionChat(true);}}
              style={{padding:'6px 14px',background:C.accentSoft,border:`1px solid ${C.accent}44`,
                borderRadius:8,color:C.accent,fontSize:12,fontWeight:600,fontFamily:font,cursor:'pointer'}}>
              Chat →
            </button>
          )}
        </div>
      )}

      {/* ── Sidebar open button (shown when sidebar is closed) ── */}
      {!sidebarOpen&&(
        <button onClick={toggleSidebar} style={{
          position:'fixed',left:8,top:'50%',transform:'translateY(-50%)',
          zIndex:200,padding:'8px 6px',
          background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,
          color:C.muted,cursor:'pointer',display:'flex',alignItems:'center',
          boxShadow:'0 2px 12px rgba(0,0,0,0.15)',transition:'color 0.15s',
        }}>
          <PanelLeftOpen size={16} strokeWidth={1.8}/>
        </button>
      )}

      {/* ── SIDEBAR — always visible, narrow on phones, full on tablet/desktop ── */}
      <aside style={{position:'fixed',left:0,top:0,bottom:0,
        width:sidebarW,zIndex:100,overflow:'hidden',
        background:C.nav,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        borderRight:sidebarOpen?`1px solid ${C.border}`:'none',
        display:'flex',flexDirection:'column',alignItems:isMobile?'center':'stretch',
        transition:'width 0.2s ease'}}>

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
                  background:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent,sleepy:'#64748b'}[mood]||C.accent,
                  border:`2px solid ${C.nav}`}}/>
                {mascotNots.length>0&&(
                  <div style={{position:'absolute',top:-2,right:-2,minWidth:14,height:14,
                    borderRadius:7,background:'#ef4444',color:'#fff',fontSize:9,fontWeight:800,
                    display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',
                    border:`2px solid ${C.nav}`,lineHeight:1}}>
                    {mascotNots.length}
                  </div>
                )}
              </div>
              <button onClick={e=>{e.stopPropagation();setCompanionDraft(companion.name);setCustomising(true);}}
                style={{padding:'1px 0',background:'transparent',border:'none',
                  cursor:'pointer',color:C.muted,lineHeight:1,display:'flex',alignItems:'center'}}>
                <Pencil size={11} strokeWidth={2}/>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',width:'100%'}}>
              {DESKTOP_NAV.map(n=>(
                <button key={n.id} onClick={()=>!n.comingSoon&&setView(n.id)} style={{
                  width:'100%',display:'flex',flexDirection:'column',alignItems:'center',
                  justifyContent:'center',padding:'8px 0',background:'transparent',border:'none',
                  cursor:n.comingSoon?'default':'pointer',position:'relative',
                  borderLeft:`3px solid ${view===n.id?C.accent:'transparent'}`,
                  color:n.comingSoon?C.subtle:view===n.id?C.accent:C.muted,
                  transition:'border-color 0.12s,color 0.12s'}}>
                  <n.Icon size={17} strokeWidth={view===n.id?2:1.6}/>
                  {n.comingSoon&&(
                    <span style={{position:'absolute',top:3,right:2,fontSize:6,fontWeight:800,
                      color:'#fbbf24',background:'rgba(251,191,36,0.15)',borderRadius:3,
                      padding:'1px 3px',letterSpacing:0.2,lineHeight:1}}>SOON</span>
                  )}
                  {n.id==='achievements'&&unlockedIds.length>0&&(
                    <span style={{position:'absolute',top:4,right:4,width:5,height:5,
                      borderRadius:'50%',background:TIER_COLOR.gold}}/>
                  )}
                </button>
              ))}
            </div>
            <div style={{padding:'8px 0',borderTop:`1px solid ${C.border}`,width:'100%',
              display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <button onClick={()=>{const n=!dark;setDark(n);ls.set('rbp_dark',n);}}
                style={{padding:4,background:'transparent',border:'none',cursor:'pointer',color:C.muted,display:'flex',alignItems:'center'}}>
                {dark?<Sun size={15} strokeWidth={1.8}/>:<Moon size={15} strokeWidth={1.8}/>}
              </button>
              <button onClick={toggleSidebar}
                style={{padding:4,background:'transparent',border:'none',cursor:'pointer',color:C.muted,display:'flex',alignItems:'center'}}>
                <PanelLeftClose size={15} strokeWidth={1.8}/>
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
                  background:{happy:'#22c55e',excited:'#fbbf24',worried:'#f97316',neutral:C.accent,sleepy:'#64748b'}[mood]||C.accent,
                  border:`2px solid ${C.nav}`}}/>
                {mascotNots.length>0&&(
                  <div style={{position:'absolute',top:-2,right:-4,minWidth:16,height:16,
                    borderRadius:8,background:'#ef4444',color:'#fff',fontSize:10,fontWeight:800,
                    display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',
                    border:`2px solid ${C.nav}`,lineHeight:1}}>
                    {mascotNots.length}
                  </div>
                )}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,letterSpacing:0.1}}>{companion.name}</div>
                <span style={{fontSize:8,fontWeight:800,color:C.accent,background:C.accentSoft,
                  border:`1px solid ${C.accent}55`,borderRadius:5,padding:'1px 5px',letterSpacing:0.4}}>BETA</span>
              </div>
              <div title="Earn coins by logging papers (+5 each) and study time (+1/min). Spend them in Customise." style={{display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:700,color:C.accent}}>
                {computeCoins(scores,sessions,companion?.spent_coins||0).available} 🪙
                <span style={{color:C.muted,fontWeight:500}}>coins</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center'}}>
                <button onClick={e=>{e.stopPropagation();setCompanionDraft(companion.name);setCustomising(true);}}
                  style={{fontSize:10,color:C.muted,background:'transparent',
                    border:`1px solid ${C.border}`,borderRadius:5,padding:'3px 8px',
                    fontFamily:font,cursor:'pointer',fontWeight:500}}>
                  Customise
                </button>
                <button onClick={e=>{e.stopPropagation(); isPro?setCompanionChat(true):addToast('Companion chat is a Pro feature — payments are launching soon. Join the waitlist in Account → Settings.','info');}}
                  style={{fontSize:10,color:C.accent,background:C.accentSoft,
                    border:`1px solid ${C.accent}44`,borderRadius:5,padding:'3px 8px',
                    fontFamily:font,cursor:'pointer',fontWeight:600}}>
                  {isPro?'Chat':<span style={{display:'flex',alignItems:'center',gap:3}}>Chat<Lock size={9} strokeWidth={2.5}/></span>}
                </button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'6px 8px'}}>
              {DESKTOP_NAV.map(n=>(
                <button key={n.id} onClick={()=>!n.comingSoon&&setView(n.id)} style={{
                  width:'100%',textAlign:'left',padding:'9px 10px',
                  background:view===n.id?C.accentSoft:'transparent',
                  border:'none',borderRadius:8,
                  color:n.comingSoon?C.subtle:view===n.id?C.accent:C.muted,
                  fontSize:12,fontWeight:view===n.id?700:400,
                  fontFamily:font,cursor:n.comingSoon?'default':'pointer',marginBottom:1,
                  display:'flex',alignItems:'center',gap:8,position:'relative',
                  transition:'color 0.12s,background 0.12s'
                }}>
                  <n.Icon size={14} strokeWidth={view===n.id?2:1.6} style={{flexShrink:0}}/>
                  {n.label}
                  {n.comingSoon&&(
                    <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:'#fbbf24',
                      background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.28)',
                      borderRadius:4,padding:'1px 5px',letterSpacing:0.3,flexShrink:0}}>SOON</span>
                  )}
                  {n.id==='achievements'&&!n.comingSoon&&unlockedIds.length>0&&(
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
              <button onClick={toggleSidebar} style={{
                width:'100%',textAlign:'left',padding:'8px 10px',
                background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,
                color:C.muted,fontSize:11,fontWeight:600,fontFamily:font,cursor:'pointer',
                display:'flex',alignItems:'center',gap:8,letterSpacing:0.4,textTransform:'uppercase'
              }}>
                <PanelLeftClose size={12} strokeWidth={2} style={{flexShrink:0}}/><span>Collapse</span>
              </button>
            </div>
          </>
        )}
      </aside>

      <main style={{marginLeft:sidebarW,padding:isMobile?'16px 12px':'28px 32px',minHeight:'100vh',transition:'margin-left 0.2s ease'}}>
        {view==='analytics'    && <Analytics    {...vp} onQuickLog={()=>setQuickLogOpen(true)} onUpgrade={()=>setView('account')}/>}
        {view==='tracker'      && <Tracker      {...vp} setScores={setScores} setErrors={setErrors} uid={uid}/>}
        {view==='exams'        && <Exams        {...vp}/>}
        {view==='plan'         && <Schedule     {...vp}/>}
        {view==='achievements' && <AchievementsView {...vp} unlockedIds={unlockedIds}/>}
        {view==='groups'       && <GroupsView    user={user} scores={scores} uid={uid} C={C} font={font} addToast={addToast}/>}
        {view==='timer'        && <StudyTimer    subjects={subjects} uid={uid} C={C} font={font} sessions={sessions} setSessions={setSessions} scores={scores} errors={errors} rag={rag}/>}
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
            const c={...companion,name:companionDraft.trim()||'Caps'};
            saveCompanion(c); setCustomising(false);
          }}
          onCancel={()=>{
            const saved=ls.get(`rbp_companion_${uid}`,{name:'Caps',skin:0,outfitColor:0,accessory:0});
            setCompanion({skin:0,outfitColor:0,accessory:0,...saved});
            setCompanionDraft(saved.name||'Caps');
            setCustomising(false);
          }}
          C={C} font={font}
          coins={computeCoins(scores, sessions, companion?.spent_coins||0).available}
          isPro={isPro}
          addToast={addToast}/>
      )}
      {companionChat&&(
        <CompanionChat companion={companion} subjects={subjects} scores={scores}
          sessions={sessions} examSched={examSched} rag={rag} examLevel={examLevel}
          errors={errors} targets={targets}
          C={C} font={font}
          onClose={()=>setCompanionChat(false)}/>
      )}
    </div>
  );
}

// ── LevelPicker ────────────────────────────────────────────────────────────
function LevelPicker({ onComplete }) {
  const font = FONT_BODY;
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
      id: 'aslevel',
      LvlIcon: GraduationCap,
      title: 'AS-Levels',
      subtitle: 'Year 12',
      desc: 'Tracking AS-Level papers with A–E grade boundaries. Same A-Level subjects, year-1 content only.',
      grades: ['A', 'B', 'C', 'D'],
    },
    {
      id: 'gcse',
      LvlIcon: BookOpen,
      title: 'GCSEs',
      subtitle: 'Years 10–11',
      desc: 'Tracking GCSE papers with 9–1 grade boundaries. Triple Science means picking Biology, Chemistry, Physics separately.',
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
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:600, color:C.text, letterSpacing:'-0.01em' }}>Battle Plan</span>
        </div>

        <div style={{ marginBottom:32 }}>
          <h1 style={{ ...type.h1, color:C.text, margin:'0 0 8px' }}>
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
  const font = FONT_BODY;

  // Load admin-managed exam-date overrides (app_config.exam_schedule) and merge
  // them over the built-in schedule. Public read, admin-only write (RLS). This is
  // what makes the God-Mode exam editor's saved dates actually reach students —
  // without it the editor wrote to a table nothing ever read back.
  useEffect(()=>{
    if (!isSupabaseConfigured()) return;
    let alive=true;
    (async()=>{
      try {
        const {data}=await supabase.from('app_config').select('value').eq('key','exam_schedule').maybeSingle();
        if (!alive || !data?.value) return;
        const override = typeof data.value==='string' ? JSON.parse(data.value) : data.value;
        if (override && typeof override==='object' && !Array.isArray(override)) {
          setExamSched(prev=>({...prev,...override}));
        }
      } catch(_) { /* keep built-in defaults on any error */ }
    })();
    return ()=>{ alive=false; };
  },[]);

  useEffect(()=>{
    if (!isSupabaseConfigured()) { setPhase('landing'); return; }
    // Capture referral code from URL before auth
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) sessionStorage.setItem('rbp_ref', refParam.toUpperCase().trim());
    // Capture group invite from /j/CODE path before auth; consumed by useEffect in RevisionPlan post-auth
    const joinMatch = window.location.pathname.match(/^\/j\/([A-Z0-9]{4,8})$/i);
    if (joinMatch) {
      sessionStorage.setItem('rbp_join_code', joinMatch[1].toUpperCase());
      window.history.replaceState({}, '', '/');
    }
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
        // Row is created by handle_new_user trigger on auth.users insert.
        // Heartbeat just bumps last_seen_at (email is server-controlled).
        await supabase.from('user_profiles').update({last_seen_at:new Date().toISOString()}).eq('id',uid);
        const {data}=await supabase.from('user_profiles').select('subjects,subscription_status,stripe_customer_id,referral_code,exam_level,referral_pro_until,is_admin').eq('id',uid).single();
        if (!alive) return;
        const stripePro = data?.subscription_status==='pro'||data?.subscription_status==='trialing'||data?.subscription_status==='active';
        const referralPro = data?.referral_pro_until && new Date(data.referral_pro_until).getTime() > Date.now();
        // Admins always get Pro for free.
        if (stripePro || referralPro || data?.is_admin) setIsPro(true);
        if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id);
        // referral_code is auto-assigned by the column DEFAULT on insert.
        // If still null on an existing row, re-read after a short pause —
        // the row was likely created by handle_new_user mid-boot.
        let rc=data?.referral_code;
        if (!rc) {
          const {data:retry}=await supabase.from('user_profiles').select('referral_code').eq('id',uid).single();
          rc = retry?.referral_code ?? null;
        }
        if (alive && rc) setReferralCode(rc);
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

    let booted=false;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if (event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED') {
        if (!booted||event==='SIGNED_IN') { booted=true; boot(session); }
      }
      if (event==='SIGNED_OUT') { booted=false; if (alive) { setUser(null); setSelection([]); setPhase('landing'); } }
    });
    return ()=>{ alive=false; subscription.unsubscribe(); };
  },[]);


  function handleSubjectsDone(sel, yg) {
    setSelection(sel);
    if (yg && user?.id) {
      supabase.from('user_profiles').update({year_group:yg}).eq('id',user.id).then(()=>{});
    }
    setPhase('app');
  }

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
