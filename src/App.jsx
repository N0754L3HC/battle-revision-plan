import React, { useState, useEffect, useRef } from "react";

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) {
      const dark = (() => { try { return JSON.parse(localStorage.getItem('rbp_dark')||'false'); } catch { return false; } })();
      return (
        <div style={{minHeight:'100vh',background:dark?'#0d0f14':'#e8e4dd',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,padding:24,fontFamily:'system-ui,sans-serif'}}>
          <div style={{fontSize:16,fontWeight:700,color:dark?'#e2ddd6':'#2b2b2b'}}>Something went wrong</div>
          <div style={{fontSize:13,color:'#7a7268',maxWidth:380,textAlign:'center',lineHeight:1.7}}>{this.state.err?.message||'An unexpected error occurred.'}</div>
          <button onClick={()=>window.location.reload()} style={{padding:'9px 20px',background:'#b5735a',border:'none',borderRadius:7,color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600}}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import AuthGate from "./components/AuthGate";
import SubjectPicker from "./components/SubjectPicker";
import TermsOfService from "./components/TermsOfService";
import { subjectsFromSelection } from "./data/subjects";

const GENERIC_TIPS = [
  { category:"Past Paper Strategy", color:"#3b82f6", tips:[
    { title:"Time under exam conditions first", body:"Your first attempt at any paper must be timed and closed-book. Comfortable practice gives false confidence — exam conditions reveal real gaps." },
    { title:"Mark immediately and log every mistake", body:"Don't skip the mark scheme. Every question you dropped marks on goes into your error log with a topic tag and reason (method / knowledge / careless)." },
    { title:"Work backwards from mark schemes", body:"When you lose marks, find the expected answer and reverse-engineer why the examiner accepted it. Then rewrite the answer in your own words from memory." },
    { title:"Do the same paper twice", body:"Two weeks after marking, redo any question you dropped marks on — from scratch, no notes. If you still can't do it, the topic needs more active review." },
  ]},
  { category:"Active Recall", color:"#8b5cf6", tips:[
    { title:"Close the notes before you write", body:"Every time you review a topic, write what you remember before opening any resource. Retrieval practice beats re-reading by 2–3× for long-term retention." },
    { title:"Brain-dump before each session", body:"Spend 5 minutes writing everything you remember from the last session. This primes recall and highlights what didn't stick overnight." },
    { title:"Teach it in one sentence", body:"If you can't explain a concept in a single sentence a non-student would understand, your understanding has gaps. Simplicity is a proxy for depth." },
    { title:"Spaced repetition for key facts", body:"Review definitions and formulae on day 1, 3, 7, 14, 30. Anything you still recall at 30 days is in long-term memory." },
  ]},
  { category:"Exam Technique", color:"#f97316", tips:[
    { title:"Read the command word first", body:'"Describe" needs observation. "Explain" needs cause and effect. "Evaluate" needs a judgement. Miss the command word and you miss the marks regardless of knowledge.' },
    { title:"Write to the mark allocation", body:"3 marks = 3 distinct points. If a question is worth 6 marks and you wrote 3 lines, you left marks on the table. Always count marks before moving on." },
    { title:"Show all working — always", body:"Even if the final answer is wrong, method marks are available throughout. A wrong answer with correct working can still score 70% of the available marks." },
    { title:"Attempt every question", body:"A blank answer scores 0 with certainty. A partial answer, a formula, a diagram — any of these can pick up method or context marks." },
  ]},
  { category:"Error Pattern Analysis", color:"#ef4444", tips:[
    { title:"Tag every error by type", body:"Every mistake is one of three types: knowledge gap (didn't know it), method error (applied it wrong), careless slip. Different types need different fixes." },
    { title:"Weekly error review", body:"At the end of each week, scan your error log for recurring topics. One topic appearing three times is more urgent than three one-off errors." },
    { title:"Recreate the error from scratch", body:"Don't just read your mistake — reproduce it, then correct it. Physically writing the correction embeds the fix far better than reading a mark scheme." },
    { title:"Build a personal formula sheet", body:"Any formula or rule you've dropped marks on more than once goes on a single A4 sheet. Review it before every practice session." },
  ]},
  { category:"Time Management", color:"#22c55e", tips:[
    { title:"Weekly paper quota", body:"Aim for 2–3 past papers per subject per week in the final 8 weeks. More and quality drops; fewer and you won't build stamina." },
    { title:"Prioritise by mark per minute", body:"Not all questions are equal. A 1-mark question costing 4 minutes is less efficient than a 4-mark question in the same time. Learn to identify and skip time sinks." },
    { title:"Revision in 50-minute blocks", body:"Focus degrades after 45–60 minutes. Set a timer. After 50 minutes: 10 minutes off screens, then back in." },
    { title:"Hardest subject first", body:"Willpower depletes during the day. Put your most difficult subject in the first block when concentration is highest." },
  ]},
  { category:"Mental Performance", color:"#0ea5e9", tips:[
    { title:"Sleep is part of the revision", body:"Memory consolidation happens during sleep. Cutting sleep to revise more is a net loss — you encode less and retrieve slower the next day." },
    { title:"Progress ≠ comfort", body:"If revision feels easy, it's probably not working. The feeling of struggle during retrieval practice is the signal that memory traces are being strengthened." },
    { title:"Data over gut feeling", body:"Students consistently misjudge their weakest subjects. Your error log and past paper averages are more accurate than your intuition. Let data set the priority." },
    { title:"One day per week fully off", body:"Sustained output requires recovery. A planned day off each week maintains performance across 8+ weeks. Burning out in week 4 is worse than slightly less revision overall." },
  ]},
];

const EXAMS = [
  { date: "2026-05-14", subject: "Further Mathematics", paper: "Paper 1: Core Pure Mathematics 1", code: "9FM0/01", time: "PM", duration: "1h 30m", board: "Edexcel", topics: "Proof, complex numbers, matrices, further algebra, further calculus, further vectors", maxMark: 75 },
  { date: "2026-05-21", subject: "Further Mathematics", paper: "Paper 2: Core Pure Mathematics 2", code: "9FM0/02", time: "PM", duration: "1h 30m", board: "Edexcel", topics: "Polar coords, hyperbolic functions, differential equations, plus anything from CP1", maxMark: 75 },
  { date: "2026-06-02", subject: "Mathematics", paper: "Paper 1: Pure Mathematics 1", code: "9MA0/01", time: "PM", duration: "2h", board: "Edexcel", topics: "Proof, algebra, functions, coordinate geometry, sequences, trigonometry, exponentials, differentiation", maxMark: 100 },
  { date: "2026-06-10", subject: "Computer Science", paper: "Paper 1: Computer Systems", code: "H446/01", time: "PM", duration: "2h 30m", board: "OCR", topics: "Processors, software, networking, data types, data structures, legal/moral/ethical issues", maxMark: 140 },
  { date: "2026-06-12", subject: "Mathematics", paper: "Paper 2: Pure Mathematics 2", code: "9MA0/02", time: "PM", duration: "2h", board: "Edexcel", topics: "Integration, numerical methods, vectors, plus anything from Paper 1 topics", maxMark: 100 },
  { date: "2026-06-16", subject: "Further Mathematics", paper: "Paper 3D: Decision Mathematics 1", code: "9FM0/3D", time: "PM", duration: "1h 30m", board: "Edexcel", topics: "Algorithms, graphs, networks, linear programming, critical path analysis, bin packing, matchings", maxMark: 75 },
  { date: "2026-06-17", subject: "Computer Science", paper: "Paper 2: Algorithms & Programming", code: "H446/02", time: "AM", duration: "2h 30m", board: "OCR", topics: "Computational thinking, programming, algorithms (sorting/searching), OOP, problem solving", maxMark: 140 },
  { date: "2026-06-18", subject: "Mathematics", paper: "Paper 3: Statistics & Mechanics", code: "9MA0/03", time: "PM", duration: "2h", board: "Edexcel", topics: "Stats: sampling, probability, distributions, hypothesis testing. Mechanics: kinematics, forces, moments", maxMark: 100 },
  { date: "2026-06-19", subject: "Further Mathematics", paper: "Paper 3A: Further Pure Mathematics 1", code: "9FM0/3A", time: "PM", duration: "1h 30m", board: "Edexcel", topics: "t-formulae, Taylor series, Leibnitz theorem, L'Hôpital, Weierstrass, further differential equations", maxMark: 75 },
];

const GRADE_BOUNDARIES = {
  "Maths":        { "A*": 80, "A": 70, "B": 60, "C": 50, "D": 40, "E": 30 },
  "Further Maths":{ "A*": 83, "A": 72, "B": 60, "C": 50, "D": 40, "E": 30 },
  "CS":           { "A*": 75, "A": 65, "B": 55, "C": 45, "D": 35, "E": 25 },
};

const PAPER_SUGGESTIONS = {
  "Maths": ["Edexcel 9MA0/01 Pure 1 — 2023","Edexcel 9MA0/01 Pure 1 — 2022","Edexcel 9MA0/02 Pure 2 — 2023","Edexcel 9MA0/02 Pure 2 — 2022","Edexcel 9MA0/03 Stats & Mech — 2023","Edexcel 9MA0/03 Stats & Mech — 2022","Edexcel 9MA0/01 Pure 1 — 2019","Edexcel 9MA0/02 Pure 2 — 2019"],
  "Further Maths": ["Edexcel 9FM0/01 Core Pure 1 — 2023","Edexcel 9FM0/01 Core Pure 1 — 2022","Edexcel 9FM0/02 Core Pure 2 — 2023","Edexcel 9FM0/02 Core Pure 2 — 2022","Edexcel 9FM0/3D Decision Maths 1 — 2023","Edexcel 9FM0/3A Further Pure 1 — 2023","Edexcel 9FM0/01 Core Pure 1 — 2019"],
  "CS": ["OCR H446/01 Computer Systems — 2023","OCR H446/01 Computer Systems — 2022","OCR H446/02 Algorithms & Programming — 2023","OCR H446/02 Algorithms & Programming — 2022","OCR H446/01 Computer Systems — 2019","OCR H446/02 Algorithms & Programming — 2019"],
};

const SUBJECT_COLORS = { "Maths": "#2979FF", "Further Maths": "#E040FB", "CS": "#00E676" };
const SUBJECTS = ["Maths", "Further Maths", "CS"];

// ── Friend profile: Economics AQA · Physics OCR A · Chemistry AQA ──────────
// NOTE: exam dates below are estimated for 2026 — verify against official timetables.

const FRIEND_EXAMS = [
  { date: "2026-05-12", subject: "Chemistry", paper: "Paper 1: Inorganic & Physical Chemistry", code: "7405/1", time: "PM", duration: "2h", board: "AQA", topics: "Atomic structure, bonding, energetics, kinetics, equilibria, redox, periodicity, Group 2 & 7, transition metals", maxMark: 105 },
  { date: "2026-05-20", subject: "Physics", paper: "Component 1: Modelling Physics", code: "H557/01", time: "PM", duration: "2h 15m", board: "OCR", topics: "Motion, forces, energy, electricity, waves, quantum, circular motion, oscillations, SHM", maxMark: 100 },
  { date: "2026-05-11", subject: "Economics", paper: "Paper 1: Markets & Market Failure", code: "7136/1", time: "AM", duration: "2h", board: "AQA", topics: "Individual decision making, price determination, production & costs, competitive markets, market failure, government intervention", maxMark: 80 },
  { date: "2026-06-04", subject: "Chemistry", paper: "Paper 2: Organic & Physical Chemistry", code: "7405/2", time: "PM", duration: "2h", board: "AQA", topics: "Organic: alkanes, alkenes, halogenoalkanes, alcohols, aldehydes, ketones, carboxylic acids, amines, amino acids. Rate equations, electrode potentials, NMR", maxMark: 105 },
  { date: "2026-06-01", subject: "Physics", paper: "Component 2: Exploring Physics", code: "H557/02", time: "AM", duration: "2h 15m", board: "OCR", topics: "Thermal physics, nuclear & particle physics, gravitational fields, electric fields, capacitors, magnetic fields, electromagnetic induction", maxMark: 100 },
  { date: "2026-05-18", subject: "Economics", paper: "Paper 2: National & International Economy", code: "7136/2", time: "PM", duration: "2h", board: "AQA", topics: "Macroeconomic objectives, AD/AS, fiscal policy, monetary policy, supply-side policy, international trade, balance of payments, exchange rates", maxMark: 80 },
  { date: "2026-06-18", subject: "Chemistry", paper: "Paper 3: Practical Skills & Data Analysis", code: "7405/3", time: "PM", duration: "2h", board: "AQA", topics: "Practical techniques, data analysis, organic synthesis, identification, spectroscopy (IR, MS, NMR), research skills", maxMark: 90 },
  { date: "2026-06-04", subject: "Economics", paper: "Paper 3: Economic Principles & Issues", code: "7136/3", time: "AM", duration: "2h", board: "AQA", topics: "Synoptic: micro + macro + global economies. Case study data response + extended essay", maxMark: 80 },
  { date: "2026-06-08", subject: "Physics", paper: "Component 3: Unified Physics", code: "H557/03", time: "AM", duration: "1h 30m", board: "OCR", topics: "Synoptic: Breadth & Depth topics combined, experimental data analysis, extended response", maxMark: 70 },
];

const FRIEND_GRADE_BOUNDARIES = {
  "Chemistry": { "A*": 80, "A": 70, "B": 60, "C": 50, "D": 40, "E": 30 },
  "Physics":   { "A*": 80, "A": 70, "B": 60, "C": 50, "D": 40, "E": 30 },
  "Economics": { "A*": 75, "A": 65, "B": 55, "C": 45, "D": 35, "E": 25 },
};

const FRIEND_PAPER_SUGGESTIONS = {
  "Chemistry": ["AQA 7405/1 Paper 1 — 2023","AQA 7405/1 Paper 1 — 2022","AQA 7405/2 Paper 2 — 2023","AQA 7405/2 Paper 2 — 2022","AQA 7405/3 Paper 3 — 2023","AQA 7405/3 Paper 3 — 2022","AQA 7405/1 Paper 1 — 2019","AQA 7405/2 Paper 2 — 2019"],
  "Physics":   ["OCR H557/01 Modelling Physics — 2023","OCR H557/01 Modelling Physics — 2022","OCR H557/02 Exploring Physics — 2023","OCR H557/02 Exploring Physics — 2022","OCR H557/03 Unified Physics — 2023","OCR H557/03 Unified Physics — 2022","OCR H557/01 Modelling Physics — 2019","OCR H557/02 Exploring Physics — 2019"],
  "Economics": ["AQA 7136/1 Paper 1 — 2023","AQA 7136/1 Paper 1 — 2022","AQA 7136/2 Paper 2 — 2023","AQA 7136/2 Paper 2 — 2022","AQA 7136/3 Paper 3 — 2023","AQA 7136/3 Paper 3 — 2022","AQA 7136/1 Paper 1 — 2019","AQA 7136/2 Paper 2 — 2019"],
};

const FRIEND_SUBJECT_COLORS = { "Chemistry": "#FF4081", "Physics": "#40C4FF", "Economics": "#FFD600" };
const FRIEND_SUBJECTS = ["Chemistry", "Physics", "Economics"];

const FRIEND_WEEKS = [
  { num:1, start:"10 Mar", end:"16 Mar", title:"Audit & Foundation", focus:"Identify gaps across Chemistry, Physics, Economics", days:[
    {day:"Mon 10",blocks:[{t:"Chemistry: Spec checklist — mark every topic RAG",d:"2h",s:"Chemistry"},{t:"Economics: Spec checklist — mark every topic RAG",d:"1.5h",s:"Economics"}]},
    {day:"Tue 11",blocks:[{t:"Physics: Spec checklist — all modules RAG",d:"2h",s:"Physics"},{t:"Chemistry: Atomic structure, bonding, periodicity recap",d:"1.5h",s:"Chemistry"}]},
    {day:"Wed 12",blocks:[{t:"Economics: Markets — supply & demand, elasticities",d:"2h",s:"Economics"},{t:"Physics: Mechanics — kinematics, forces, energy, momentum",d:"1.5h",s:"Physics"}]},
    {day:"Thu 13",blocks:[{t:"Chemistry: Energetics — enthalpy, Hess's Law, bond enthalpy",d:"2h",s:"Chemistry"},{t:"Economics: Market failure — externalities, public goods, info failure",d:"1.5h",s:"Economics"}]},
    {day:"Fri 14",blocks:[{t:"Physics: Electricity — current, resistance, Kirchhoff's laws, IV curves",d:"2h",s:"Physics"},{t:"Chemistry: Kinetics — rate, activation energy, Maxwell-Boltzmann",d:"1h",s:"Chemistry"}]},
    {day:"Sat 15",blocks:[{t:"PAST PAPER: Chemistry Paper 1 (timed, 2h)",d:"2h",s:"Chemistry"},{t:"Mark + error log every wrong answer",d:"1h",s:"Chemistry"}]},
    {day:"Sun 16",blocks:[{t:"REST DAY — light review of RAG lists only",d:"0.5h",s:"rest"}]},
  ]},
  { num:2, start:"17 Mar", end:"23 Mar", title:"Physical Chemistry Blitz", focus:"Energetics, equilibria, kinetics — core Chemistry topics", days:[
    {day:"Mon 17",blocks:[{t:"Chemistry: Equilibria — Le Chatelier's, Kc, Kp calculations",d:"2.5h",s:"Chemistry"},{t:"Economics: Production & costs — short run vs long run, returns to scale",d:"1.5h",s:"Economics"}]},
    {day:"Tue 18",blocks:[{t:"Chemistry: Redox — oxidation states, half-equations, standard electrode potentials",d:"2.5h",s:"Chemistry"},{t:"Physics: Waves — superposition, diffraction, interference, polarisation",d:"1.5h",s:"Physics"}]},
    {day:"Wed 19",blocks:[{t:"Physics: Quantum physics — photoelectric effect, wave-particle duality, energy levels",d:"2h",s:"Physics"},{t:"Chemistry: Periodicity — Period 3, Group 2, Group 7",d:"1.5h",s:"Chemistry"}]},
    {day:"Thu 20",blocks:[{t:"Economics: Market structures — perfect comp, monopoly, oligopoly, monopsony",d:"2h",s:"Economics"},{t:"Chemistry: Organic — alkanes, alkenes, halogenoalkanes mechanisms",d:"1.5h",s:"Chemistry"}]},
    {day:"Fri 21",blocks:[{t:"Physics: Circular motion + simple harmonic motion",d:"2h",s:"Physics"},{t:"Economics: Labour market — wages, trade unions, discrimination",d:"1.5h",s:"Economics"}]},
    {day:"Sat 22",blocks:[{t:"PAST PAPER: Physics Component 1 (timed, 2h15)",d:"2.5h",s:"Physics"},{t:"Mark + error log",d:"1h",s:"Physics"}]},
    {day:"Sun 23",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:3, start:"24 Mar", end:"30 Mar", title:"Organic Chemistry + Macro Economics", focus:"Mechanisms + AD/AS model", days:[
    {day:"Mon 24",blocks:[{t:"Chemistry: Alcohols, aldehydes, ketones — reactions & tests",d:"2h",s:"Chemistry"},{t:"Economics: National income — GDP, circular flow, multiplier",d:"1.5h",s:"Economics"}]},
    {day:"Tue 25",blocks:[{t:"Chemistry: Carboxylic acids, esters, amines — synthesis & reactions",d:"2h",s:"Chemistry"},{t:"Physics: Thermal physics — ideal gas laws, Boltzmann, internal energy",d:"1.5h",s:"Physics"}]},
    {day:"Wed 26",blocks:[{t:"Economics: AD/AS model — shifts, price level effects, macroeconomic equilibrium",d:"2h",s:"Economics"},{t:"Chemistry: Amino acids, proteins, NMR spectroscopy — A2 organic",d:"1.5h",s:"Chemistry"}]},
    {day:"Thu 27",blocks:[{t:"Physics: Gravitational & electric fields — field lines, potential, satellite orbits",d:"2h",s:"Physics"},{t:"Economics: Unemployment & inflation — causes, types, trade-offs",d:"1.5h",s:"Economics"}]},
    {day:"Fri 28",blocks:[{t:"Chemistry: Organic mechanisms from memory — no notes",d:"2h",s:"Chemistry"},{t:"Physics: Capacitors — charge/discharge, time constants, energy stored",d:"1h",s:"Physics"}]},
    {day:"Sat 29",blocks:[{t:"PAST PAPER: Economics Paper 1 (timed, 2h)",d:"2h",s:"Economics"},{t:"Mark + note all knowledge & data gaps",d:"1h",s:"Economics"}]},
    {day:"Sun 30",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:4, start:"31 Mar", end:"6 Apr", title:"Physics Fields + Macro Policy", focus:"Fields, induction + fiscal/monetary/supply-side policy", days:[
    {day:"Mon 31",blocks:[{t:"Physics: Magnetic fields — force on conductors & charges, flux density",d:"2.5h",s:"Physics"},{t:"Economics: Fiscal policy — government spending, taxation, budget balance",d:"1.5h",s:"Economics"}]},
    {day:"Tue 1",blocks:[{t:"Physics: Electromagnetic induction — Faraday, Lenz, AC generators, transformers",d:"2.5h",s:"Physics"},{t:"Chemistry: Rate equations, Arrhenius equation, A2 kinetics",d:"1.5h",s:"Chemistry"}]},
    {day:"Wed 2",blocks:[{t:"Economics: Monetary policy — interest rates, QE, inflation targeting",d:"2h",s:"Economics"},{t:"Physics: Nuclear physics — radioactive decay, half-life, binding energy",d:"1.5h",s:"Physics"}]},
    {day:"Thu 3",blocks:[{t:"Chemistry: Electrode potentials — Born-Haber, electrolysis, fuel cells",d:"2h",s:"Chemistry"},{t:"Economics: Supply-side policy — deregulation, labour flexibility, investment",d:"1.5h",s:"Economics"}]},
    {day:"Fri 4",blocks:[{t:"PAST PAPER: Chemistry Paper 2 (timed, 2h)",d:"2h",s:"Chemistry"},{t:"Mark + review organic mechanisms carefully",d:"1h",s:"Chemistry"}]},
    {day:"Sat 5",blocks:[{t:"PAST PAPER: Economics Paper 2 (timed, 2h)",d:"2h",s:"Economics"},{t:"Mark + review all macro diagrams",d:"1h",s:"Economics"}]},
    {day:"Sun 6",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:5, start:"7 Apr", end:"13 Apr", title:"Easter Sprint Week 1", focus:"INTENSIVE — 5+ hours/day", days:[
    {day:"Mon 7",blocks:[{t:"Chemistry: Paper 1 past paper → mark → redo every wrong Q",d:"3h",s:"Chemistry"},{t:"Economics: 25-mark essay — micro topic under timed conditions",d:"2h",s:"Economics"}]},
    {day:"Tue 8",blocks:[{t:"Physics: Component 1 past paper → mark → error analysis",d:"3h",s:"Physics"},{t:"Chemistry: Spectroscopy — IR, mass spec, NMR structure identification",d:"2h",s:"Chemistry"}]},
    {day:"Wed 9",blocks:[{t:"Economics: Paper 2 past paper → mark → review AD/AS diagrams",d:"3h",s:"Economics"},{t:"Physics: Weakest topic past Q deep dive",d:"2h",s:"Physics"}]},
    {day:"Thu 10",blocks:[{t:"Chemistry: Required practicals — write full method for each from memory",d:"3h",s:"Chemistry"},{t:"Economics: Paper 3 data extract practice — annotation technique",d:"2h",s:"Economics"}]},
    {day:"Fri 11",blocks:[{t:"Physics: Component 2 past paper (timed, 2h15) → mark",d:"3h",s:"Physics"},{t:"Chemistry: All wrong answers from Weeks 1-4 — rework each one",d:"2h",s:"Chemistry"}]},
    {day:"Sat 12",blocks:[{t:"Economics: Full Paper 3 (timed, 2h) → mark",d:"3h",s:"Economics"},{t:"Physics: Flashcard review — all formulas, units, constants",d:"1h",s:"Physics"}]},
    {day:"Sun 13",blocks:[{t:"REST — 30 min flashcard review",d:"0.5h",s:"rest"}]},
  ]},
  { num:6, start:"14 Apr", end:"20 Apr", title:"Easter Sprint Week 2", focus:"Paper practice every day — exam conditions", days:[
    {day:"Mon 14",blocks:[{t:"Chemistry: Paper 1 — second past paper (different year)",d:"2.5h",s:"Chemistry"},{t:"Economics: Micro essay — market failure + government failure debate",d:"2h",s:"Economics"}]},
    {day:"Tue 15",blocks:[{t:"Physics: Synoptic connections — build topic link map across modules",d:"2h",s:"Physics"},{t:"Chemistry: A2 organic synthesis — multi-step routes from memory",d:"2h",s:"Chemistry"}]},
    {day:"Wed 16",blocks:[{t:"Economics: Paper 1 — second past paper (timed)",d:"2.5h",s:"Economics"},{t:"Physics: Component 1 — second past paper",d:"2.5h",s:"Physics"}]},
    {day:"Thu 17",blocks:[{t:"Chemistry: Paper 2 — second past paper (timed)",d:"2.5h",s:"Chemistry"},{t:"Economics: International trade — comparative advantage, protectionism",d:"1.5h",s:"Economics"}]},
    {day:"Fri 18",blocks:[{t:"Physics: Full Component 1 + Component 2 (back-to-back, exam conditions)",d:"5h",s:"Physics"},{t:"Mark both, full error log",d:"1h",s:"Physics"}]},
    {day:"Sat 19",blocks:[{t:"Economics: 25-mark macro essay — fiscal vs monetary policy",d:"2.5h",s:"Economics"},{t:"Chemistry: NMR deep dive — splitting patterns, chemical shifts, structure ID",d:"1.5h",s:"Chemistry"}]},
    {day:"Sun 20",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:7, start:"21 Apr", end:"27 Apr", title:"Weak Spot Assault", focus:"Everything still going wrong", days:[
    {day:"Mon–Fri",blocks:[{t:"Review ALL error logs. Top 5 weakest topics = this week's focus.",d:"",s:"Chemistry"},{t:"Daily: 2h weakest Chem, 2h weakest Physics, 1.5h weakest Econ",d:"5.5h",s:"Physics"},{t:"PMT topic papers for targeted weak-topic practice",d:"",s:"Economics"}]},
    {day:"Sat 26",blocks:[{t:"FULL MOCK: Chemistry Paper 1 under exam conditions",d:"2h",s:"Chemistry"},{t:"Compare score to Week 1 score — quantify improvement",d:"0.5h",s:"Chemistry"}]},
    {day:"Sun 27",blocks:[{t:"REST",d:"",s:"rest"}]},
  ]},
  { num:8, start:"28 Apr", end:"4 May", title:"Pre-Exam Consolidation", focus:"Refine, don't learn new things", days:[
    {day:"Mon–Wed",blocks:[{t:"One past paper per day — alternate subjects. Mark immediately.",d:"3h",s:"Chemistry"},{t:"Flashcard review: all formulas, definitions, required practicals",d:"1h",s:"Physics"},{t:"Write one-page cheat sheet for each subject",d:"1h",s:"Economics"}]},
    {day:"Thu–Fri",blocks:[{t:"Chemistry: Final Paper 3 practice — data analysis & practical Qs",d:"2h",s:"Chemistry"},{t:"Physics: Long-answer synoptic questions from past papers",d:"2h",s:"Physics"},{t:"Economics: Essay plans — 5 micro + 5 macro from past papers",d:"1.5h",s:"Economics"}]},
    {day:"Sat 3",blocks:[{t:"Light review only. Read cheat sheets. Early night.",d:"1h",s:"rest"}]},
    {day:"Sun 4",blocks:[{t:"REST. Prepare exam kit. Sleep well.",d:"",s:"rest"}]},
  ]},
  { num:9, start:"5 May", end:"21 May", title:"EXAM PERIOD: Phase 1", focus:"Chemistry P1, Physics C1, Economics P1", days:[
    {day:"5–11 May",blocks:[{t:"Final Chemistry Paper 1 revision. Past paper every other day.",d:"3h",s:"Chemistry"},{t:"Night before: cheat sheet, 5-10 Qs, early bed.",d:"1h",s:"Chemistry"}]},
    {day:"12 May ★",blocks:[{t:"EXAM: Chemistry Paper 1 — Inorganic & Physical Chemistry (PM, 2h)",d:"2h",s:"Chemistry"}]},
    {day:"13–18 May",blocks:[{t:"Physics Component 1 revision: mechanics, electricity, waves, quantum.",d:"3h",s:"Physics"}]},
    {day:"19 May ★",blocks:[{t:"EXAM: Physics Component 1 — Modelling Physics (AM, 2h15)",d:"2.25h",s:"Physics"}]},
    {day:"20 May",blocks:[{t:"Economics Paper 1: Markets & Market Failure — final revision sprint.",d:"3h",s:"Economics"}]},
    {day:"21 May ★",blocks:[{t:"EXAM: Economics Paper 1 — Markets & Market Failure (AM, 2h)",d:"2h",s:"Economics"}]},
  ]},
  { num:10, start:"22 May", end:"23 Jun", title:"EXAM PERIOD: Phase 2", focus:"Chemistry P2+P3, Physics C2+C3, Economics P2+P3", days:[
    {day:"22 May–3 Jun",blocks:[{t:"Chemistry Paper 2: Organic + physical. Past papers daily.",d:"4h",s:"Chemistry"}]},
    {day:"4 Jun ★",blocks:[{t:"EXAM: Chemistry Paper 2 — Organic & Physical Chemistry (PM, 2h)",d:"2h",s:"Chemistry"}]},
    {day:"5–7 Jun",blocks:[{t:"Physics Component 2: fields, nuclear, thermal. Economics Paper 2: Macro.",d:"4h",s:"Physics"}]},
    {day:"8 Jun ★",blocks:[{t:"EXAM: Physics Component 2 — Exploring Physics (PM, 2h15)",d:"2.25h",s:"Physics"}]},
    {day:"9–10 Jun",blocks:[{t:"Economics Paper 2: National & International Economy — final push.",d:"3h",s:"Economics"}]},
    {day:"11 Jun ★",blocks:[{t:"EXAM: Economics Paper 2 — National & International Economy (AM, 2h)",d:"2h",s:"Economics"}]},
    {day:"12–17 Jun",blocks:[{t:"Chemistry Paper 3: Required practicals, data analysis, spectroscopy.",d:"4h",s:"Chemistry"}]},
    {day:"18 Jun ★",blocks:[{t:"EXAM: Chemistry Paper 3 — Practical Skills (PM, 2h)",d:"2h",s:"Chemistry"}]},
    {day:"19–21 Jun",blocks:[{t:"Economics Paper 3: Case study technique + synoptic essay practice.",d:"3h",s:"Economics"}]},
    {day:"22 Jun ★",blocks:[{t:"EXAM: Economics Paper 3 — Economic Principles & Issues (PM, 2h)",d:"2h",s:"Economics"}]},
    {day:"22 Jun",blocks:[{t:"Physics Component 3: Unified Physics synoptic revision.",d:"2h",s:"Physics"}]},
    {day:"23 Jun ★",blocks:[{t:"EXAM: Physics Component 3 — Unified Physics (AM, 1h30) — LAST EXAM",d:"1.5h",s:"Physics"}]},
  ]},
];

const FRIEND_TECHNIQUE = [
  { subject: "Chemistry (AQA 7405)", color: "#FF4081", tips: [
    { title: "Required practicals are 25% of your marks", text: "Paper 3 tests all 12 required practicals. Know the method, variables, analysis technique, and common errors for each." },
    { title: "'State', 'Explain', 'Suggest' — different demands", text: "'State' = brief fact, no explanation. 'Explain' = mechanism required. 'Suggest' = apply knowledge to unfamiliar context." },
    { title: "Curly arrow mechanisms — every arrow matters", text: "Every arrow must go from electron source to electron sink. Missing or misplaced arrows lose marks. Practise until automatic." },
    { title: "Enthalpy cycles: draw first, calculate second", text: "Hess's Law and Born-Haber: draw the full cycle, label every arrow's direction and sign, then apply." },
    { title: "Spectroscopy: learn key shifts cold", text: "IR: O-H broad ~3200-3550, C=O ~1700, N-H ~3300. NMR: know TMS reference, chemical shift regions, n+1 splitting rule." },
  ]},
  { subject: "Physics (OCR A H557)", color: "#40C4FF", tips: [
    { title: "Define the principle before applying it", text: "Many 3-4 mark 'explain' questions want a definition first. State the law/principle, then show it applies to this case." },
    { title: "Show ALL working — even obvious steps", text: "Unit errors cost 1 mark. Carried-forward errors (ECF) save you if your method is right. Never skip intermediate steps." },
    { title: "Graph axes: label with quantity / unit", text: "e.g. 'Distance / m' not 'distance (m)'. Missing units on axes scores zero for that mark." },
    { title: "Component 3 is synoptic — connect topics", text: "Link capacitor discharge ↔ exponential decay ↔ radioactive decay ↔ Newton cooling. Examiners reward cross-topic thinking." },
    { title: "Required practicals: know methods and uncertainties", text: "For every practical: what you measure, how, systematic errors, random errors, how to minimise uncertainty." },
  ]},
  { subject: "Economics (AQA 7136)", color: "#FFD600", tips: [
    { title: "Every answer: Chain of reasoning (PEEL + evaluation)", text: "Point → Explain the mechanism → Evidence (data or example) → Link to question. Then evaluate with a limitation or context." },
    { title: "25-mark essays: plan for 5 minutes first", text: "Plan 3 arguments + evaluation. Judgement in your conclusion is where A* marks live — don't leave it vague." },
    { title: "Diagrams: label every element", text: "Every axis, every curve, every equilibrium point, every shift direction. An unlabelled diagram scores 0 for diagram marks." },
    { title: "Paper 3: read the extract before you write anything", text: "Spend 8-10 mins annotating the data extract. Every high-mark answer must reference data from the insert." },
    { title: "Evaluation: specific real-world examples only", text: "Vague examples ('a firm might...') score less than specific ones. Prepare 5-6 strong, real examples across micro and macro." },
  ]},
];

const FRIEND_RESOURCES = [
  { subject: "Chemistry", items: [
    { name: "Physics & Maths Tutor — AQA Chemistry past papers", url: "https://www.physicsandmathstutor.com/a-level-chemistry/aqa/" },
    { name: "Save My Exams — AQA A-Level Chemistry", url: "https://www.savemyexams.com/a-level/chemistry/aqa/" },
    { name: "ChemGuide — all AQA Chemistry topics in depth", url: "https://www.chemguide.co.uk/" },
    { name: "RSC Education — required practical resources", url: "https://edu.rsc.org/" },
  ]},
  { subject: "Physics", items: [
    { name: "Physics & Maths Tutor — OCR A Physics past papers", url: "https://www.physicsandmathstutor.com/a-level-physics/ocr-a/" },
    { name: "Save My Exams — OCR A Physics", url: "https://www.savemyexams.com/a-level/physics/ocr-a/" },
    { name: "Isaac Physics — OCR A problems and skills", url: "https://isaacphysics.org/" },
    { name: "A Level Physics Online — video tutorials", url: "https://www.alevelphysicsonline.com/" },
  ]},
  { subject: "Economics", items: [
    { name: "Physics & Maths Tutor — AQA Economics past papers", url: "https://www.physicsandmathstutor.com/economics/a-level/aqa/" },
    { name: "Save My Exams — AQA A-Level Economics", url: "https://www.savemyexams.com/a-level/economics/aqa/" },
    { name: "Tutor2u — Economics revision resources", url: "https://www.tutor2u.net/economics/a-level" },
    { name: "Economics Online — AQA revision notes", url: "https://www.economicsonline.co.uk/" },
  ]},
];

const ERROR_TYPES = [
  { id: "calc", label: "Calculation error", color: "#FFD600" },
  { id: "method", label: "Wrong method", color: "#FF3D00" },
  { id: "read", label: "Misread question", color: "#FF6D00" },
  { id: "forgot", label: "Forgot content", color: "#E040FB" },
  { id: "time", label: "Ran out of time", color: "#2979FF" },
  { id: "notation", label: "Notation / presentation", color: "#26A69A" },
];

const WEEKS = [
  { num:1, start:"10 Mar", end:"16 Mar", title:"Audit & Foundation", focus:"Identify gaps across all 3 subjects", days:[
    {day:"Mon 10",blocks:[{t:"FM: Core Pure 1 — Complex numbers review",d:"2h",s:"FM"},{t:"CS: Spec checklist — mark every topic Red/Amber/Green",d:"1.5h",s:"CS"}]},
    {day:"Tue 11",blocks:[{t:"Maths: Pure 1 — Proof, algebra, functions past Qs",d:"2h",s:"Maths"},{t:"FM: Core Pure 1 — Matrices foundations",d:"1.5h",s:"FM"}]},
    {day:"Wed 12",blocks:[{t:"CS: 1.1 Processors + 1.2 Software — notes & flashcards",d:"2h",s:"CS"},{t:"Maths: Statistics — data presentation & probability",d:"1.5h",s:"Maths"}]},
    {day:"Thu 13",blocks:[{t:"FM: Core Pure 1 — Series, roots of polynomials",d:"2h",s:"FM"},{t:"CS: 1.3 Networking + 1.4 Data types",d:"1.5h",s:"CS"}]},
    {day:"Fri 14",blocks:[{t:"Maths: Pure — Coordinate geometry, sequences, trig",d:"2h",s:"Maths"},{t:"FM: Options — identify which papers you're doing",d:"1h",s:"FM"}]},
    {day:"Sat 15",blocks:[{t:"PAST PAPER: FM Core Pure 1 (timed, full paper)",d:"2h",s:"FM"},{t:"Mark + review every wrong answer",d:"1h",s:"FM"}]},
    {day:"Sun 16",blocks:[{t:"REST DAY — light review of flashcards only",d:"0.5h",s:"rest"}]},
  ]},
  { num:2, start:"17 Mar", end:"23 Mar", title:"Pure Maths Blitz", focus:"Calculus, trigonometry, vectors — high-mark topics", days:[
    {day:"Mon 17",blocks:[{t:"Maths: Differentiation — chain, product, quotient rules",d:"2.5h",s:"Maths"},{t:"CS: 2.1 Computational thinking + 2.2 Programming concepts",d:"1.5h",s:"CS"}]},
    {day:"Tue 18",blocks:[{t:"Maths: Integration — by parts, substitution, partial fractions",d:"2.5h",s:"Maths"},{t:"FM: Core Pure — further calculus, Maclaurin series",d:"1.5h",s:"FM"}]},
    {day:"Wed 19",blocks:[{t:"FM: Core Pure 2 — differential equations, polar coordinates",d:"2h",s:"FM"},{t:"CS: 2.3 Algorithms — sorting, searching, Big O notation",d:"1.5h",s:"CS"}]},
    {day:"Thu 20",blocks:[{t:"Maths: Trigonometry — identities, equations, radians",d:"2h",s:"Maths"},{t:"FM: Further trig + hyperbolic functions",d:"1.5h",s:"FM"}]},
    {day:"Fri 21",blocks:[{t:"Maths: Vectors + exponentials & logs",d:"2h",s:"Maths"},{t:"CS: Data structures — arrays, linked lists, trees, graphs",d:"1.5h",s:"CS"}]},
    {day:"Sat 22",blocks:[{t:"PAST PAPER: Maths Paper 1 Pure (timed)",d:"2h",s:"Maths"},{t:"Mark + error log",d:"1h",s:"Maths"}]},
    {day:"Sun 23",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:3, start:"24 Mar", end:"30 Mar", title:"FM Core Pure + CS Theory", focus:"Lock in Further Maths foundations + CS Paper 1 content", days:[
    {day:"Mon 24",blocks:[{t:"FM: Volumes of revolution, mean value of function",d:"2h",s:"FM"},{t:"CS: Boolean algebra, logic gates, Karnaugh maps",d:"1.5h",s:"CS"}]},
    {day:"Tue 25",blocks:[{t:"FM: Complex number loci, de Moivre's theorem",d:"2h",s:"FM"},{t:"Maths: Numerical methods — Newton-Raphson, trapezium rule",d:"1.5h",s:"Maths"}]},
    {day:"Wed 26",blocks:[{t:"CS: Databases, SQL queries, normalisation",d:"2h",s:"CS"},{t:"FM: Matrices — transformations, eigenvalues, Cayley-Hamilton",d:"1.5h",s:"FM"}]},
    {day:"Thu 27",blocks:[{t:"Maths: Mechanics — SUVAT, forces, moments",d:"2h",s:"Maths"},{t:"CS: Operating systems, scheduling, memory management",d:"1.5h",s:"CS"}]},
    {day:"Fri 28",blocks:[{t:"FM: Core Pure mixed practice — weakest topics",d:"2h",s:"FM"},{t:"CS: Legal, moral, ethical issues + legislation",d:"1h",s:"CS"}]},
    {day:"Sat 29",blocks:[{t:"PAST PAPER: CS Paper 1 (timed, 2.5h)",d:"2.5h",s:"CS"},{t:"Mark + note cards for every unknown fact",d:"1h",s:"CS"}]},
    {day:"Sun 30",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:4, start:"31 Mar", end:"6 Apr", title:"Applied Maths + CS Programming", focus:"Stats/Mechanics for Maths Paper 3 + CS Paper 2 prep", days:[
    {day:"Mon 31",blocks:[{t:"Maths: Stats — hypothesis testing, normal distribution",d:"2.5h",s:"Maths"},{t:"CS: OOP — classes, inheritance, polymorphism",d:"1.5h",s:"CS"}]},
    {day:"Tue 1",blocks:[{t:"Maths: Mechanics — projectiles, friction, connected particles",d:"2.5h",s:"Maths"},{t:"FM: Decision Maths 1 — algorithms on graphs, bin packing",d:"1.5h",s:"FM"}]},
    {day:"Wed 2",blocks:[{t:"CS: Algorithm design — pseudocode, trace tables, recursion",d:"2h",s:"CS"},{t:"Maths: Stats — binomial + normal distribution problems",d:"1.5h",s:"Maths"}]},
    {day:"Thu 3",blocks:[{t:"FM: Core Pure 2 — eigenvalues + polar focus",d:"2h",s:"FM"},{t:"CS: Sorting & searching — write algorithms from memory",d:"1.5h",s:"CS"}]},
    {day:"Fri 4",blocks:[{t:"PAST PAPER: Maths Paper 3 Stats & Mechanics (timed)",d:"2h",s:"Maths"},{t:"Mark + review",d:"1h",s:"Maths"}]},
    {day:"Sat 5",blocks:[{t:"PAST PAPER: FM Core Pure 2 (timed)",d:"2h",s:"FM"},{t:"Mark + review",d:"1h",s:"FM"}]},
    {day:"Sun 6",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:5, start:"7 Apr", end:"13 Apr", title:"Easter Sprint Week 1", focus:"INTENSIVE — 5+ hours/day", days:[
    {day:"Mon 7",blocks:[{t:"Maths: Paper 1 past paper → mark → redo wrong Qs",d:"3h",s:"Maths"},{t:"CS: Full spec review Paper 1 — flashcard blitz",d:"2h",s:"CS"}]},
    {day:"Tue 8",blocks:[{t:"FM: Core Pure 1 past paper → mark → error analysis",d:"3h",s:"FM"},{t:"CS: Practice pseudocode/programming Qs",d:"2h",s:"CS"}]},
    {day:"Wed 9",blocks:[{t:"Maths: Paper 2 past paper → mark → redo",d:"3h",s:"Maths"},{t:"FM: Decision Maths 1 past paper → mark",d:"2h",s:"FM"}]},
    {day:"Thu 10",blocks:[{t:"CS: Paper 2 past paper (timed, 2.5h) → mark",d:"3.5h",s:"CS"},{t:"Maths: Weakest topic deep dive",d:"1.5h",s:"Maths"}]},
    {day:"Fri 11",blocks:[{t:"FM: All wrong answers — rework every one",d:"3h",s:"FM"},{t:"CS: Big O, data structures, traversal algorithms",d:"2h",s:"CS"}]},
    {day:"Sat 12",blocks:[{t:"Maths: Paper 3 past paper → mark",d:"3h",s:"Maths"},{t:"FM: Core Pure 2 past paper → mark",d:"2h",s:"FM"}]},
    {day:"Sun 13",blocks:[{t:"REST — 30 min flashcard review",d:"0.5h",s:"rest"}]},
  ]},
  { num:6, start:"14 Apr", end:"20 Apr", title:"Easter Sprint Week 2", focus:"Paper practice every day — simulate exam conditions", days:[
    {day:"Mon 14",blocks:[{t:"FM: Core Pure 1 — second past paper (different year)",d:"2.5h",s:"FM"},{t:"CS: Networking in depth — TCP/IP, protocols",d:"2h",s:"CS"}]},
    {day:"Tue 15",blocks:[{t:"Maths: Mixed topic test — 20 Qs across Pure 1+2",d:"2.5h",s:"Maths"},{t:"FM: Further Pure 1 — t-formulae, Taylor, L'Hôpital",d:"2h",s:"FM"}]},
    {day:"Wed 16",blocks:[{t:"CS: Paper 1 — second past paper (timed)",d:"3h",s:"CS"},{t:"Maths: Mechanics deep dive — forces, moments, pulleys",d:"2h",s:"Maths"}]},
    {day:"Thu 17",blocks:[{t:"FM: Core Pure 2 — second past paper",d:"2.5h",s:"FM"},{t:"CS: SQL practice + Boolean algebra exam Qs",d:"1.5h",s:"CS"}]},
    {day:"Fri 18",blocks:[{t:"Maths: Full Paper 1 + Paper 2 back-to-back (exam conditions)",d:"4h",s:"Maths"},{t:"Mark both, error log",d:"1h",s:"Maths"}]},
    {day:"Sat 19",blocks:[{t:"CS: Paper 2 — second past paper (timed)",d:"3h",s:"CS"},{t:"FM: Flashcard review of all Core Pure formulas",d:"1h",s:"FM"}]},
    {day:"Sun 20",blocks:[{t:"REST DAY",d:"",s:"rest"}]},
  ]},
  { num:7, start:"21 Apr", end:"27 Apr", title:"Weak Spot Assault", focus:"Everything you're still getting wrong", days:[
    {day:"Mon–Fri",blocks:[{t:"Review ALL error logs. Top 5 weakest topics = this week's focus.",d:"",s:"Maths"},{t:"Daily: 2h weakest maths, 2h weakest FM, 1.5h weakest CS",d:"5.5h",s:"FM"},{t:"PMT topic papers for targeted weak-topic practice",d:"",s:"CS"}]},
    {day:"Sat 26",blocks:[{t:"FULL MOCK: FM Paper 1 Core Pure 1 under exam conditions",d:"2h",s:"FM"},{t:"Compare score to Week 1 score",d:"0.5h",s:"FM"}]},
    {day:"Sun 27",blocks:[{t:"REST",d:"",s:"rest"}]},
  ]},
  { num:8, start:"28 Apr", end:"4 May", title:"Pre-Exam Consolidation", focus:"Refine, don't learn new things", days:[
    {day:"Mon–Wed",blocks:[{t:"One past paper per day — alternate subjects. Mark immediately.",d:"3h",s:"Maths"},{t:"Flashcard review: all formulas, CS definitions, algorithms",d:"1h",s:"CS"},{t:"Write one-page cheat sheet for each subject",d:"1h",s:"FM"}]},
    {day:"Thu–Fri",blocks:[{t:"FM: Final Core Pure practice — proof + complex numbers",d:"2h",s:"FM"},{t:"Maths: Final Pure practice — calculus + proof",d:"2h",s:"Maths"},{t:"CS: Long-answer question structures from past papers",d:"1.5h",s:"CS"}]},
    {day:"Sat 3",blocks:[{t:"Light review only. Read cheat sheets. Early night.",d:"1h",s:"rest"}]},
    {day:"Sun 4",blocks:[{t:"REST. Prepare exam kit. Sleep well.",d:"",s:"rest"}]},
  ]},
  { num:9, start:"5 May", end:"21 May", title:"EXAM PERIOD: Phase 1", focus:"FM Core Pure papers", days:[
    {day:"5–13 May",blocks:[{t:"Final Core Pure revision. Past paper every other day.",d:"3h",s:"FM"},{t:"Night before each exam: cheat sheet, 5-10 Qs, early bed.",d:"1.5h",s:"FM"}]},
    {day:"14 May ★",blocks:[{t:"EXAM: FM Paper 1 — Core Pure Mathematics 1 (PM, 1h30)",d:"1.5h",s:"FM"}]},
    {day:"15–20 May",blocks:[{t:"Revise Core Pure 2: polar, hyperbolics, DEs. Then Maths Pure.",d:"3h",s:"FM"}]},
    {day:"21 May ★",blocks:[{t:"EXAM: FM Paper 2 — Core Pure Mathematics 2 (PM, 1h30)",d:"1.5h",s:"FM"}]},
  ]},
  { num:10, start:"22 May", end:"19 Jun", title:"EXAM PERIOD: Phase 2", focus:"Maths + CS + FM options", days:[
    {day:"22 May–1 Jun",blocks:[{t:"Maths Pure 1: past papers daily, calculus + proof focus",d:"4h",s:"Maths"}]},
    {day:"2 Jun ★",blocks:[{t:"EXAM: Maths Paper 1 — Pure Mathematics 1 (PM, 2h)",d:"2h",s:"Maths"}]},
    {day:"3–9 Jun",blocks:[{t:"CS Paper 1: processors, networking, data structures, ethics. Maths Paper 2 topics.",d:"4h",s:"CS"}]},
    {day:"10 Jun ★",blocks:[{t:"EXAM: CS Paper 1 — Computer Systems (PM, 2h30)",d:"2.5h",s:"CS"}]},
    {day:"12 Jun ★",blocks:[{t:"EXAM: Maths Paper 2 — Pure Mathematics 2 (PM, 2h)",d:"2h",s:"Maths"}]},
    {day:"16 Jun ★",blocks:[{t:"EXAM: FM Paper 3D — Decision Mathematics 1 (PM, 1h30)",d:"1.5h",s:"FM"}]},
    {day:"17 Jun ★",blocks:[{t:"EXAM: CS Paper 2 — Algorithms & Programming (AM, 2h30)",d:"2.5h",s:"CS"}]},
    {day:"18 Jun ★",blocks:[{t:"EXAM: Maths Paper 3 — Statistics & Mechanics (PM, 2h)",d:"2h",s:"Maths"}]},
    {day:"19 Jun ★",blocks:[{t:"EXAM: FM Paper 3A — Further Pure Mathematics 1 (PM, 1h30) — LAST EXAM",d:"1.5h",s:"FM"}]},
  ]},
];

const TECHNIQUE = [
  { subject: "Maths (Edexcel 9MA0)", color: "#2979FF", tips: [
    { title: "Always show full working", text: "Method marks are worth more than answer marks. Even wrong final answers can score 3-4 marks with correct working." },
    { title: "Read the question twice", text: "Circle key words: 'hence', 'show that', 'exact value', 'prove'. 'Hence' means use your previous answer." },
    { title: "Paper 3 Stats: context is everything", text: "In hypothesis testing, write your conclusion in the context of the question. 'Reject H₀' alone gets 0 marks." },
    { title: "Paper 3 Mechanics: draw a diagram EVERY time", text: "Forces, particles, projectiles — always draw and label a diagram first." },
    { title: "Check with substitution", text: "Found x = 3? Plug it back. 30 seconds, catches errors worth 2-4 marks." },
  ]},
  { subject: "Further Maths (Edexcel 9FM0)", color: "#E040FB", tips: [
    { title: "Proof by induction — 4 steps every time", text: "Base case, assume for n=k, show for n=k+1, conclude. Free marks if you practise." },
    { title: "Decision Maths 1: follow the algorithm EXACTLY", text: "Kruskal's, Prim's, Dijkstra's — each has a fixed process. Don't improvise. Show working in tables." },
    { title: "Further Pure 1: L'Hôpital's rule", text: "If you get 0/0 or ∞/∞, differentiate top and bottom separately." },
    { title: "Taylor/Maclaurin — memorise standard expansions", text: "eˣ, sin x, cos x, ln(1+x), (1+x)ⁿ — know these cold." },
  ]},
  { subject: "Computer Science (OCR H446)", color: "#00E676", tips: [
    { title: "Definition questions — be precise", text: "OCR mark schemes require specific terminology. Learn exact definitions for every key term." },
    { title: "Paper 2: pseudocode must be readable", text: "Use clear variable names, proper indentation, and comments." },
    { title: "Trace tables — go slowly", text: "Write out every variable change, every iteration. Don't skip steps mentally." },
    { title: "Big O — know the common ones", text: "O(1) constant, O(log n) binary search, O(n) linear, O(n log n) merge sort, O(n²) bubble sort." },
  ]},
];

const RESOURCES = [
  { subject: "Mathematics", items: [
    { name: "Physics & Maths Tutor — Edexcel past papers + topic Qs", url: "https://www.physicsandmathstutor.com/a-level-maths/edexcel-a-level/" },
    { name: "ExamSolutions — video walkthroughs", url: "https://www.examsolutions.net/a-level-maths/edexcel/" },
    { name: "Save My Exams — Edexcel A-Level Maths", url: "https://www.savemyexams.com/a-level/maths/edexcel/" },
    { name: "Desmos — graphing calculator", url: "https://www.desmos.com/calculator" },
  ]},
  { subject: "Further Mathematics", items: [
    { name: "Physics & Maths Tutor — FM past papers", url: "https://www.physicsandmathstutor.com/a-level-maths/edexcel-a-level-further/" },
    { name: "ExamSolutions — FM video solutions", url: "https://www.examsolutions.net/a-level-further-maths/edexcel/" },
    { name: "Save My Exams — FM revision notes", url: "https://www.savemyexams.com/a-level/further-maths/edexcel/" },
  ]},
  { subject: "Computer Science", items: [
    { name: "Physics & Maths Tutor — OCR CS past papers", url: "https://www.physicsandmathstutor.com/past-papers/a-level-computer-science/" },
    { name: "Craig'n'Dave — OCR A-Level CS YouTube", url: "https://www.youtube.com/@craigndave" },
    { name: "Isaac Computer Science — OCR revision", url: "https://isaaccomputerscience.org/" },
    { name: "Computer Science UK — H446 revision notes", url: "https://www.computerscience.uk/" },
  ]},
];

const DAILY_ROUTINE = [
  { time: "07:00", block: "Wake + Move", desc: "15 min bodyweight or walk. Cold water. No phone for 30 min.", color: "#7a7268" },
  { time: "07:30", block: "Plan the Day", desc: "Check today's blocks. Write 3 priorities. Set a timer.", color: "#7a7268" },
  { time: "08:00", block: "Deep Block 1", desc: "Hardest subject. Timed past paper or topic questions. Phone away. 90 min.", color: "#3b82f6" },
  { time: "09:30", block: "Mark + Error Log", desc: "Mark with the official mark scheme. For every wrong answer: log topic, what went wrong, correct method. Most important 30 min of your day.", color: "#f97316" },
  { time: "10:00", block: "Break", desc: "20 min. Walk outside. No scrolling.", color: "#7a7268" },
  { time: "10:20", block: "Deep Block 2", desc: "Second subject. Topic-based questions on your weak areas. 90 min.", color: "#3b82f6" },
  { time: "11:50", block: "Lunch + Rest", desc: "Proper food. Step away. 40 min.", color: "#7a7268" },
  { time: "12:30", block: "Deep Block 3", desc: "Third subject or redo wrong questions from this morning. 60 to 90 min.", color: "#3b82f6" },
  { time: "14:00", block: "Active Recall", desc: "Close notes. Write everything you remember. Check what you missed.", color: "#8b5cf6" },
  { time: "14:30", block: "Done", desc: "4+ hours of genuine focused revision is done. Basketball, Taekwondo, relax. You have earned it.", color: "#22c55e" },
  { time: "21:30", block: "Shutdown", desc: "What did I learn? What is tomorrow's focus? Screens off by 22:00.", color: "#8a847c" },
];

const PROFILES = {
  me: {
    exams: EXAMS, gradeBoundaries: GRADE_BOUNDARIES, paperSuggestions: PAPER_SUGGESTIONS,
    subjectColors: SUBJECT_COLORS, subjects: SUBJECTS, weeks: WEEKS, technique: TECHNIQUE, resources: RESOURCES,
    defaultTargets: {Maths:"A*","Further Maths":"A*",CS:"A*"},
  },
  friend: {
    exams: FRIEND_EXAMS, gradeBoundaries: FRIEND_GRADE_BOUNDARIES, paperSuggestions: FRIEND_PAPER_SUGGESTIONS,
    subjectColors: FRIEND_SUBJECT_COLORS, subjects: FRIEND_SUBJECTS, weeks: FRIEND_WEEKS, technique: FRIEND_TECHNIQUE, resources: FRIEND_RESOURCES,
    defaultTargets: {Chemistry:"A*",Physics:"A*",Economics:"A*"},
  },
};

const S_SCORES  = "rbp_scores_v3";
const S_ERRORS  = "rbp_errors_v3";
const S_CHECKS  = "rbp_checks_v3";
const S_NOTIFS  = "rbp_notifs_v3";
const S_TARGETS = "rbp_targets_v3";

function load(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function save(k, v)  { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function daysUntil(d) {
  const n = new Date(); n.setHours(0,0,0,0);
  const t = new Date(d); t.setHours(0,0,0,0);
  return Math.ceil((t-n)/86400000);
}

// Raw mark boundaries per paper per year.
// Keys must match strings used in PAPER_SUGGESTIONS / score logging.
// Format: { maxMark, "A*", A, B, C, D, E }
const RAW_BOUNDARIES = {
  // ── Edexcel Further Maths 9FM0/01 Core Pure 1 (max 75) ──────────────
  "Edexcel 9FM0/01 Core Pure 1 — 2024": { max:75, "A*":67, A:56, B:44, C:33, D:22, E:12 },
  "Edexcel 9FM0/01 Core Pure 1 — 2023": { max:75, "A*":62, A:51, B:40, C:29, D:19, E:10 },
  "Edexcel 9FM0/01 Core Pure 1 — 2022": { max:75, "A*":61, A:51, B:41, C:31, D:21, E:12 },
  "Edexcel 9FM0/01 Core Pure 1 — 2019": { max:75, "A*":68, A:56, B:45, C:34, D:23, E:12 },
  // ── Edexcel Further Maths 9FM0/02 Core Pure 2 (max 75) ──────────────
  "Edexcel 9FM0/02 Core Pure 2 — 2024": { max:75, "A*":65, A:54, B:43, C:32, D:22, E:12 },
  "Edexcel 9FM0/02 Core Pure 2 — 2023": { max:75, "A*":61, A:50, B:39, C:29, D:19, E:10 },
  "Edexcel 9FM0/02 Core Pure 2 — 2022": { max:75, "A*":60, A:50, B:40, C:30, D:20, E:11 },
  "Edexcel 9FM0/02 Core Pure 2 — 2019": { max:75, "A*":66, A:55, B:44, C:33, D:22, E:12 },
  // ── Edexcel Further Maths 9FM0/3D Decision Maths 1 (max 75) ─────────
  "Edexcel 9FM0/3D Decision Maths 1 — 2024": { max:75, "A*":66, A:55, B:44, C:33, D:22, E:12 },
  "Edexcel 9FM0/3D Decision Maths 1 — 2023": { max:75, "A*":64, A:53, B:42, C:31, D:21, E:11 },
  "Edexcel 9FM0/3D Decision Maths 1 — 2022": { max:75, "A*":62, A:52, B:42, C:31, D:21, E:11 },
  "Edexcel 9FM0/3D Decision Maths 1 — 2019": { max:75, "A*":66, A:55, B:44, C:33, D:22, E:12 },
  // ── Edexcel Further Maths 9FM0/3A Further Pure 1 (max 75) ───────────
  "Edexcel 9FM0/3A Further Pure 1 — 2024": { max:75, "A*":63, A:52, B:41, C:30, D:20, E:11 },
  "Edexcel 9FM0/3A Further Pure 1 — 2023": { max:75, "A*":60, A:49, B:38, C:27, D:18, E:10 },
  "Edexcel 9FM0/3A Further Pure 1 — 2022": { max:75, "A*":65, A:54, B:43, C:32, D:22, E:12 },
  "Edexcel 9FM0/3A Further Pure 1 — 2019": { max:75, "A*":64, A:53, B:42, C:31, D:21, E:11 },
  // ── Edexcel Maths 9MA0/01 Pure 1 (max 100) ──────────────────────────
  "Edexcel 9MA0/01 Pure 1 — 2024": { max:100, "A*":77, A:65, B:54, C:43, D:32, E:22 },
  "Edexcel 9MA0/01 Pure 1 — 2023": { max:100, "A*":73, A:61, B:50, C:39, D:29, E:19 },
  "Edexcel 9MA0/01 Pure 1 — 2022": { max:100, "A*":72, A:60, B:49, C:38, D:28, E:18 },
  "Edexcel 9MA0/01 Pure 1 — 2019": { max:100, "A*":77, A:64, B:53, C:42, D:32, E:22 },
  // ── Edexcel Maths 9MA0/02 Pure 2 (max 100) ──────────────────────────
  "Edexcel 9MA0/02 Pure 2 — 2024": { max:100, "A*":74, A:61, B:50, C:39, D:29, E:19 },
  "Edexcel 9MA0/02 Pure 2 — 2023": { max:100, "A*":72, A:59, B:48, C:37, D:27, E:17 },
  "Edexcel 9MA0/02 Pure 2 — 2022": { max:100, "A*":71, A:58, B:47, C:36, D:26, E:17 },
  "Edexcel 9MA0/02 Pure 2 — 2019": { max:100, "A*":76, A:63, B:52, C:41, D:31, E:21 },
  // ── Edexcel Maths 9MA0/03 Stats & Mechanics (max 100) ───────────────
  "Edexcel 9MA0/03 Stats & Mech — 2024": { max:100, "A*":73, A:60, B:49, C:38, D:28, E:18 },
  "Edexcel 9MA0/03 Stats & Mech — 2023": { max:100, "A*":70, A:57, B:46, C:35, D:25, E:16 },
  "Edexcel 9MA0/03 Stats & Mech — 2022": { max:100, "A*":68, A:55, B:44, C:33, D:23, E:14 },
  "Edexcel 9MA0/03 Stats & Mech — 2019": { max:100, "A*":73, A:60, B:49, C:38, D:28, E:18 },
};

// Returns { grade, exact } — exact=true means raw boundaries were found for this paper.
function getGradeForPaper(got, max, paper, subject, gradeBoundaries=GRADE_BOUNDARIES) {
  const rb = RAW_BOUNDARIES[paper];
  if (rb) {
    for (const g of ["A*","A","B","C","D","E"]) {
      if (got >= rb[g]) return { grade: g, exact: true };
    }
    return { grade: "U", exact: true };
  }
  // Fallback: percentage-based
  const pct = Math.round((got/max)*100);
  const b = gradeBoundaries[subject] || {};
  for (const g of ["A*","A","B","C","D","E"]) {
    if (pct >= b[g]) return { grade: g, exact: false };
  }
  return { grade: "U", exact: false };
}

function getGrade(pct, subject, boundaries=GRADE_BOUNDARIES) {
  const b = boundaries[subject] || {};
  for (const g of ["A*","A","B","C","D","E"]) {
    if (pct >= b[g]) return g;
  }
  return "U";
}

function gradeColor(g) {
  return { "A*":"#22c55e", A:"#4ade80", B:"#fbbf24", C:"#fb923c", D:"#f87171", E:"#ef4444", U:"#8a847c" }[g] || "#8a847c";
}

function calcBattleReadiness(scores, errors, checks) {
  const avgScore = scores.length ? scores.reduce((a,s)=>a+s.pct,0)/scores.length : 0;
  const scoreComp = Math.round((avgScore/100)*40);
  const paperComp = Math.min(20, Math.round((scores.length/12)*20));
  const recentErrors = errors.filter(e => Date.now()-e.id < 7*86400000).length;
  const errorComp = Math.max(0, 20 - recentErrors*2);
  const totalChecks = Object.keys(checks).length;
  const checkComp = Math.min(20, Math.round((totalChecks/40)*20));
  const total = scoreComp + paperComp + errorComp + checkComp;
  return {
    total, scoreComp, paperComp, errorComp, checkComp,
    avgScore: Math.round(avgScore),
    label: total >= 80 ? "BATTLE READY" : total >= 60 ? "ON TRACK" : total >= 40 ? "BUILDING" : "JUST STARTED",
    labelColor: total >= 80 ? "#00E676" : total >= 60 ? "#FFD600" : total >= 40 ? "#FF9100" : "#FF3D00",
  };
}

function getNotifications(scores, errors, {exams=EXAMS,subjects=SUBJECTS,paperSuggestions=PAPER_SUGGESTIONS}={}) {
  const now = new Date(); now.setHours(0,0,0,0);
  const notes = [];
  const upcoming = exams.map(e=>({...e,d:Math.ceil((new Date(e.date)-now)/86400000)})).filter(e=>e.d>0).sort((a,b)=>a.d-b.d);
  if (upcoming.length && upcoming[0].d<=14) {
    const n=upcoming[0];
    notes.push({id:`exam_${n.code}`,type:"urgent",title:`${n.subject} exam in ${n.d} days`,body:`${n.paper} · ${n.time}, ${n.duration}`});
  }
  subjects.forEach(subj=>{
    const done=scores.filter(s=>s.subject===subj).map(s=>s.paper);
    const next=(paperSuggestions[subj]||[]).find(p=>!done.includes(p));
    if(next){
      const examD=upcoming.find(e=>e.subject===subj)?.d??999;
      notes.push({id:`paper_${subj}_${next}`,type:examD<=21?"urgent":examD<=42?"warn":"info",title:`Suggested next: ${subj}`,body:next});
    }
    const ss=scores.filter(s=>s.subject===subj);
    if(ss.length){
      const daysSince=Math.floor((Date.now()-ss.sort((a,b)=>b.id-a.id)[0].id)/86400000);
      if(daysSince>=7) notes.push({id:`overdue_${subj}`,type:"warn",title:`${subj}: no paper in ${daysSince} days`,body:`Last: ${ss[0].paper}`});
    }
  });
  if(errors.length>=5){
    const counts={};
    errors.forEach(e=>{counts[e.type]=(counts[e.type]||0)+1;});
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const et=ERROR_TYPES.find(t=>t.id===top[0]);
    if(et&&top[1]>=3) notes.push({id:`errpat_${top[0]}`,type:"warn",title:`Recurring pattern: "${et.label}" (x${top[1]})`,body:"Dedicate a full session to fixing this."});
  }
  const today=new Date().toDateString();
  const ts=scores.find(s=>new Date(s.id).toDateString()===today);
  if(ts) notes.push({id:`today_${today}`,type:"success",title:"Paper logged today",body:`${ts.subject} · ${ts.paper} · ${ts.pct}%`});
  return notes;
}

const notifColor = {urgent:"#ef4444",warn:"#f97316",info:"#3b82f6",success:"#22c55e"};

function TrendChart({ scores, subject, subjectColors=SUBJECT_COLORS, gradeBoundaries=GRADE_BOUNDARIES, bgColor="#ede9e2", textColor="#7a7268" }) {
  const data = [...scores].filter(s=>s.subject===subject).reverse();
  if (data.length < 2) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:120,fontSize:14,color:C.muted}}>
      Need 2+ papers to show trend
    </div>
  );
  const W=480, H=110, PAD={t:10,r:16,b:28,l:36};
  const pcts = data.map(d=>d.pct);
  const minY = Math.max(0, Math.min(...pcts)-10);
  const maxY = Math.min(100, Math.max(...pcts)+10);
  const col = subjectColors[subject]||"#888";
  const bounds = gradeBoundaries[subject]||{};
  const xScale = i => PAD.l + (i/(data.length-1))*(W-PAD.l-PAD.r);
  const yScale = v => PAD.t + (1-(v-minY)/(maxY-minY))*(H-PAD.t-PAD.b);
  const pts = data.map((d,i)=>([xScale(i), yScale(d.pct)]));
  const polyline = pts.map(p=>p.join(",")).join(" ");
  const areaPath = `M ${pts[0][0]},${yScale(minY)} L ${pts.map(p=>p.join(",")).join(" L ")} L ${pts[pts.length-1][0]},${yScale(minY)} Z`;
  const gradeLines = ["A*","A","B"].map(g=>({g, y:yScale(bounds[g]||0), pct:bounds[g]||0})).filter(gl=>gl.pct>minY && gl.pct<maxY);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}>
      {gradeLines.map(gl=>(
        <g key={gl.g}>
          <line x1={PAD.l} y1={gl.y} x2={W-PAD.r} y2={gl.y} stroke={gradeColor(gl.g)} strokeWidth="1" strokeDasharray="4 3" opacity="0.3"/>
          <text x={W-PAD.r+2} y={gl.y+4} fill={gradeColor(gl.g)} fontSize="8" opacity="0.6">{gl.g}</text>
        </g>
      ))}
      {[minY, Math.round((minY+maxY)/2), maxY].map(v=>(
        <text key={v} x={PAD.l-4} y={yScale(v)+4} fill={textColor} fontSize="8" textAnchor="end">{Math.round(v)}%</text>
      ))}
      <path d={areaPath} fill={col} opacity="0.06"/>
      <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill={col} stroke={bgColor} strokeWidth="1.5"/>
          <text x={p[0]} y={H-PAD.b+10} fill={textColor} fontSize="7" textAnchor="middle">
            {data[i].date?.split(" ").slice(0,2).join(" ")||`P${i+1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BattleGauge({ score, label, labelColor, textColor="#2b2b2b", mutedColor="#7a7268" }) {
  const pct = score / 100;
  const R = 54, CX = 70, CY = 70;
  const circumference = Math.PI * R;
  const strokeDash = circumference * pct;
  const col = labelColor;
  return (
    <svg viewBox="0 0 140 80" style={{width:"100%",maxWidth:200,display:"block",margin:"0 auto"}}>
      <path d={`M ${CX-R},${CY} A ${R},${R} 0 0 1 ${CX+R},${CY}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="10" strokeLinecap="round"/>
      <path d={`M ${CX-R},${CY} A ${R},${R} 0 0 1 ${CX+R},${CY}`} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
        style={{transition:"stroke-dasharray 1s ease"}}
      />
      <text x={CX} y={CY-8} textAnchor="middle" fill={textColor} fontSize="22" fontWeight="700" fontFamily="inherit">{score}</text>
      <text x={CX} y={CY+8} textAnchor="middle" fill={col} fontSize="7" fontWeight="600" letterSpacing="0.5">{label}</text>
      <text x={CX-R} y={CY+14} fill={mutedColor} fontSize="7" textAnchor="middle">0</text>
      <text x={CX+R} y={CY+14} fill={mutedColor} fontSize="7" textAnchor="middle">100</text>
    </svg>
  );
}

function RevisionPlan({ profile: profileName, onProfileChange, user, userProfile, onLogout, userSubjectSelection, cloudData }) {
  const P = PROFILES[profileName];

  // Use the user's own catalog selection if available, else fall back to hardcoded profile
  const catalogSubs = (Array.isArray(userSubjectSelection) && userSubjectSelection.length > 0) ? subjectsFromSelection(userSubjectSelection) : null;
  const SUBJECTS = catalogSubs ? catalogSubs.map(s=>s.name) : P.subjects;
  const SUBJECT_COLORS = catalogSubs ? Object.fromEntries(catalogSubs.map(s=>[s.name,s.color])) : P.subjectColors;
  const GRADE_BOUNDARIES = catalogSubs ? Object.fromEntries(catalogSubs.map(s=>[s.name,s.gradeBoundaries])) : P.gradeBoundaries;
  const PAPER_SUGGESTIONS = catalogSubs
    ? Object.fromEntries(catalogSubs.map(s=>[s.name, Array.isArray(s.papers) ? s.papers : []]))
    : P.paperSuggestions;
  const TECHNIQUE = catalogSubs ? catalogSubs.map(s=>({subject:s.name,color:s.color,tips:s.techniques||[]})) : P.technique;
  const RESOURCES = catalogSubs ? catalogSubs.map(s=>({subject:s.name,items:s.resources||[]})) : P.resources;
  const EXAMS = catalogSubs
    ? [...PROFILES.me.exams,...FRIEND_EXAMS].filter(e=>SUBJECTS.includes(e.subject))
    : P.exams;
  const WEEKS = P.weeks;
  const defaultTargets = catalogSubs ? Object.fromEntries(SUBJECTS.map(s=>[s,'A*'])) : P.defaultTargets;
  const sk = profileName === "friend" ? "friend_" : "";
  const BLOCK_COLOR_MAP = {"Maths":"Mathematics","FM":"Further Mathematics","CS":"Computer Science","Further Maths":"Further Mathematics"};
  const blockColor = s => SUBJECT_COLORS[BLOCK_COLOR_MAP[s]||s] || SUBJECT_COLORS[SUBJECTS[0]] || "#888";
  const sScores  = `rbp_${sk}scores_v3`;
  const sErrors  = `rbp_${sk}errors_v3`;
  const sChecks  = `rbp_${sk}checks_v3`;
  const sNotifs  = `rbp_${sk}notifs_v3`;
  const sTargets = `rbp_${sk}targets_v3`;

  const [darkMode, setDarkMode] = useState(()=>load('rbp_dark', false));
  useEffect(()=>save('rbp_dark', darkMode),[darkMode]);
  const C = {
    bg:      darkMode ? '#0d0f14'              : '#e8e4dd',
    surface: darkMode ? '#13161e'              : '#f0ece5',
    nav:     darkMode ? 'rgba(13,15,20,0.97)'  : 'rgba(232,228,221,0.97)',
    text:    darkMode ? '#e2ddd6'              : '#2b2b2b',
    muted:   darkMode ? '#9a9490'              : '#7a7268',
    subtle:  darkMode ? '#6a6460'              : '#9a9490',
    border:  darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    card2:   darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    card3:   darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    accent:  '#b5735a',
  };
  const iS = {width:"100%",background:darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 12px",color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};

  const [view, setView]           = useState("analytics");
  const [activeWeek, setActiveWeek] = useState(2);
  const [scores, setScores]       = useState(()=>load(sScores,[]));
  const [errors, setErrors]       = useState(()=>load(sErrors,[]));
  const [checks, setChecks]       = useState(()=>load(sChecks,{}));
  const [dismissed, setDismissed] = useState(()=>load(sNotifs,[]));
  const [targets, setTargets]     = useState(()=>load(sTargets, defaultTargets));
  const [scoreSubject, setScoreSubject] = useState(SUBJECTS[0]);
  const [scorePaper, setScorePaper]     = useState("");
  const [scoreGot, setScoreGot]         = useState("");
  const [scoreMax, setScoreMax]         = useState("");
  const [sfilt, setSfilt]               = useState("All");
  const [errSubject, setErrSubject] = useState(SUBJECTS[0]);
  const [errTopic, setErrTopic]     = useState("");
  const [errType, setErrType]       = useState("method");
  const [errNote, setErrNote]       = useState("");
  const [efilt, setEfilt]           = useState("All");
  const [confirmDel, setConfirmDel] = useState(null);
  const [chartSubject, setChartSubject] = useState(SUBJECTS[0]);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(()=>save(sScores,scores),[scores]);
  useEffect(()=>save(sErrors,errors),[errors]);
  useEffect(()=>save(sChecks,checks),[checks]);
  useEffect(()=>save(sNotifs,dismissed),[dismissed]);
  useEffect(()=>save(sTargets,targets),[targets]);

  // Load cloud data when received (cross-device sync)
  useEffect(()=>{
    if(!cloudData) return;
    if(cloudData.scores?.length) setScores(cloudData.scores);
    if(cloudData.errors?.length) setErrors(cloudData.errors);
    if(cloudData.checks && Object.keys(cloudData.checks).length) setChecks(cloudData.checks);
    if(cloudData.targets && Object.keys(cloudData.targets).length) setTargets(cloudData.targets);
  },[cloudData]);

  const [showTos, setShowTos] = useState(false);

  // Sync to Supabase when data changes (debounced — fires 2s after last change)
  useEffect(()=>{
    if(!user||!isSupabaseConfigured()) return;
    const t = setTimeout(()=>{
      supabase.from("user_data").upsert({
        user_id: user.id, profile: profileName,
        scores, errors, checks, targets,
        updated_at: new Date().toISOString(),
      },{onConflict:"user_id,profile"});
    }, 2000);
    return ()=>clearTimeout(t);
  },[scores,errors,checks,targets,user,profileName]);

  const notifications = getNotifications(scores,errors,{exams:EXAMS,subjects:SUBJECTS,paperSuggestions:PAPER_SUGGESTIONS}).filter(n=>!dismissed.includes(n.id));
  const br = calcBattleReadiness(scores,errors,checks);
  const toggle = k => setChecks(p=>{const n={...p};n[k]?delete n[k]:n[k]=true;return n;});

  const addScore = () => {
    if(!scorePaper||!scoreGot||!scoreMax) return;
    const got=parseInt(scoreGot),max=parseInt(scoreMax);
    if(isNaN(got)||isNaN(max)||max===0) return;
    setScores(p=>[{subject:scoreSubject,paper:scorePaper,got,max,pct:Math.round((got/max)*100),date:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),id:Date.now()},...p]);
    setScorePaper(""); setScoreGot(""); setScoreMax("");
  };

  const addError = () => {
    if(!errTopic.trim()) return;
    setErrors(p=>[{subject:errSubject,topic:errTopic.trim(),type:errType,note:errNote.trim(),date:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"}),id:Date.now()},...p].slice(0,200));
    setErrTopic(""); setErrNote("");
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from("user_data").delete().eq("user_id", user.id);
      await supabase.from("user_profiles").delete().eq("id", user.id);
      await supabase.rpc("delete_current_user");
    } catch(_) {}
    setDeleting(false);
    onLogout();
  };

  const subjectAvg = s => { const ss=scores.filter(x=>x.subject===s); return ss.length?Math.round(ss.reduce((a,x)=>a+x.pct,0)/ss.length):null; };
  const nextSuggested = (PAPER_SUGGESTIONS[scoreSubject]||[]).find(p=>!scores.filter(s=>s.subject===scoreSubject).map(s=>s.paper).includes(p));
  const filteredScores = sfilt==="All"?scores:scores.filter(s=>s.subject===sfilt);
  const filteredErrors = efilt==="All"?errors:errors.filter(e=>e.subject===efilt);

  const navItems = [
    {id:"analytics",l:"Analytics"},{id:"tracker",l:"Tracker"},{id:"countdown",l:"Exams"},
    {id:"weekly",l:"Plan"},{id:"technique",l:"Tips"},{id:"daily",l:"Daily"},{id:"resources",l:"Links"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <nav style={{position:"sticky",top:0,zIndex:50,background:C.nav,backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:900,fontSize:10,color:"#fff",flexShrink:0}}>A*</div>
          <span style={{fontWeight:700,fontSize:14,color:C.text,letterSpacing:0.2}}>Battle Plan</span>
        </div>
        <div style={{display:"flex",gap:1,alignItems:"center"}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{background:view===n.id?C.card2:"transparent",border:`1px solid ${view===n.id?C.border:"transparent"}`,color:view===n.id?C.text:C.muted,padding:"7px 12px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:view===n.id?500:400,position:"relative",transition:"color 0.15s"}}>
              {n.l}
              {n.id==="tracker"&&notifications.length>0&&<span style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"#ef4444"}}/>}
            </button>
          ))}
          <button
            onClick={()=>setDarkMode(d=>!d)}
            style={{marginLeft:4,padding:"5px 10px",background:darkMode?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",fontSize:12,color:C.muted,lineHeight:1,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}
          >{darkMode?'☀ Light':'🌙 Dark'}</button>
          {user?(
            <button onClick={()=>setView("account")} style={{marginLeft:4,paddingLeft:10,borderLeft:`1px solid ${C.border}`,background:"transparent",border:"none",color:view==="account"?C.accent:C.muted,fontSize:12,cursor:"pointer",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {userProfile?.display_name||user.email}
            </button>
          ):(
            <span style={{fontSize:12,color:C.subtle,marginLeft:10}}>Local mode</span>
          )}
        </div>
      </nav>
      {showTos&&<TermsOfService onClose={()=>setShowTos(false)}/>}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px 100px",position:"relative",zIndex:1}}>
        {notifications.length>0&&(view==="tracker"||view==="analytics")&&(
          <div style={{marginBottom:16}}>
            {notifications.slice(0,3).map(n=>(
              <div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",marginBottom:5,borderRadius:8,background:`${notifColor[n.type]}18`,border:`1px solid ${notifColor[n.type]}40`}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:notifColor[n.type],flexShrink:0,marginTop:5}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:notifColor[n.type]}}>{n.title}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{n.body}</div>
                </div>
                <button onClick={()=>setDismissed(p=>[...p,n.id])} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0,lineHeight:1,flexShrink:0}}>×</button>
              </div>
            ))}
          </div>
        )}

        {view==="analytics"&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Performance</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>Track your scores and readiness across all subjects.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:12,marginBottom:16}}>
              <div style={{background:C.surface,border:`1px solid ${br.labelColor}40`,borderRadius:10,padding:"16px 12px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>Battle Readiness</div>
                <BattleGauge score={br.total} label={br.label} labelColor={br.labelColor} textColor={C.text} mutedColor={C.muted}/>
                <div style={{width:"100%",marginTop:12}}>
                  {[["Papers",br.paperComp,20,"#3b82f6"],["Avg score",br.scoreComp,40,"#8b5cf6"],["Error ctrl",br.errorComp,20,"#f97316"],["Plan done",br.checkComp,20,"#22c55e"]].map(([l,v,mx,c])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                      <div style={{fontSize:13,color:C.muted,width:50,flexShrink:0}}>{l}</div>
                      <div style={{flex:1,height:4,borderRadius:2,background:C.border,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(v/mx)*100}%`,background:c,borderRadius:2,transition:"width 1s ease"}}/>
                      </div>
                      <div style={{fontSize:13,color:c,width:20,textAlign:"right"}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SUBJECTS.map(s=>{
                  const avg=subjectAvg(s),grade=avg?getGrade(avg,s,GRADE_BOUNDARIES):null,col=SUBJECT_COLORS[s];
                  const cnt=scores.filter(x=>x.subject===s).length;
                  const target=targets[s]||"A*";
                  const targetPct=GRADE_BOUNDARIES[s]?.[target]||80;
                  const progress=avg?Math.min(100,Math.round((avg/targetPct)*100)):0;
                  const ss=[...scores].filter(x=>x.subject===s).reverse();
                  const trend=ss.length>=2?ss[ss.length-1].pct-ss[ss.length-2].pct:null;
                  return (
                    <div key={s} style={{background:C.surface,border:`1px solid ${col}40`,borderRadius:10,padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:12,color:col,fontWeight:600}}>{s}</div>
                          <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:2}}>
                            <span style={{fontSize:28,fontWeight:900,color:grade?gradeColor(grade):"#333",fontFamily:"'Inter',sans-serif"}}>{grade||"—"}</span>
                            {avg&&<span style={{fontSize:15,color:C.muted}}>{avg}% avg</span>}
                            {trend!==null&&<span style={{fontSize:14,color:trend>=0?"#00E676":"#FF3D00"}}>{trend>=0?"▲":"▼"}{Math.abs(trend)}%</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{cnt} paper{cnt!==1?"s":""} · Target:
                            <select value={target} onChange={e=>setTargets(p=>({...p,[s]:e.target.value}))} style={{background:"transparent",border:"none",color:gradeColor(target),fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer",outline:"none",marginLeft:4}}>
                              {["A*","A","B","C"].map(g=><option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:80,height:4,borderRadius:2,background:C.border,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${progress}%`,background:col,borderRadius:2,transition:"width 1s ease"}}/>
                            </div>
                            <span style={{fontSize:13,color:progress>=100?"#00E676":col}}>{progress}%</span>
                          </div>
                        </div>
                      </div>
                      {ss.length>=2&&(()=>{
                        const minP=Math.min(...ss.map(d=>d.pct))-5,maxP=Math.min(100,Math.max(...ss.map(d=>d.pct))+5);
                        const W2=200,H2=28;
                        const x2=i=>(i/(ss.length-1))*W2;
                        const y2=v=>H2-(((v-minP)/(maxP-minP))*H2);
                        const poly2=ss.map((d,i)=>`${x2(i)},${y2(d.pct)}`).join(" ");
                        return <svg viewBox={`0 0 ${W2} ${H2}`} style={{width:"100%",height:28,display:"block",marginTop:4}}>
                          <polyline points={poly2} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/>
                          {ss.map((d,i)=><circle key={i} cx={x2(i)} cy={y2(d.pct)} r="2.5" fill={col} opacity="0.8"/>)}
                        </svg>;
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Score trend</div>
                <div style={{display:"flex",gap:4}}>
                  {SUBJECTS.map(s=>(
                    <button key={s} onClick={()=>setChartSubject(s)} style={{background:chartSubject===s?`${SUBJECT_COLORS[s]}14`:"transparent",border:`1px solid ${chartSubject===s?SUBJECT_COLORS[s]+"44":C.border}`,color:chartSubject===s?SUBJECT_COLORS[s]:C.muted,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:chartSubject===s?600:400}}>
                      {s==="Further Maths"?"FM":s}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart scores={scores} subject={chartSubject} subjectColors={SUBJECT_COLORS} gradeBoundaries={GRADE_BOUNDARIES} bgColor={C.bg} textColor={C.muted}/>
              <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
                {Object.entries(GRADE_BOUNDARIES[chartSubject]||{}).filter(([g])=>["A*","A","B"].includes(g)).map(([g,v])=>(
                  <div key={g} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:16,height:2,background:gradeColor(g),opacity:0.5,borderRadius:1}}/>
                    <span style={{fontSize:13,color:gradeColor(g)}}>{g} ≥{v}%</span>
                  </div>
                ))}
              </div>
            </div>
            {(()=>{
              const upcoming=EXAMS.map(e=>({...e,d:daysUntil(e.date)})).filter(e=>e.d>0).sort((a,b)=>a.d-b.d);
              if(!upcoming.length) return null;
              const n=upcoming[0],col=SUBJECT_COLORS[n.subject]||"#888";
              const urgency=Math.max(0,Math.min(100,100-(n.d/90)*100));
              return (
                <div style={{padding:14,borderRadius:10,background:`${col}14`,border:`1px solid ${col}40`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Next exam</div>
                    <div style={{fontSize:15,fontWeight:800,color:n.d<=14?"#FF3D00":"#FF9100"}}>{n.d} days</div>
                  </div>
                  <div style={{height:6,borderRadius:3,background:C.border,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:`${urgency}%`,background:`linear-gradient(90deg,#2979FF,#FF3D00)`,borderRadius:3,transition:"width 1s ease"}}/>
                  </div>
                  <div style={{fontSize:14,color:C.subtle}}>{n.subject}: {n.paper}</div>
                </div>
              );
            })()}
          </div>
        )}

        {view==="tracker"&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Tracker</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>Log past papers and errors. Synced to your account automatically.</p>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>Log a past paper</div>
              {nextSuggested&&(
                <div onClick={()=>setScorePaper(nextSuggested)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.14)",marginBottom:10,cursor:"pointer"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#22c55e",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Suggested next</div>
                    <div style={{fontSize:13,color:C.text}}>{nextSuggested}</div>
                  </div>
                  <span style={{fontSize:12,color:C.muted}}>Tap to fill</span>
                </div>
              )}
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <select value={scoreSubject} onChange={e=>{setScoreSubject(e.target.value);setScorePaper("");}} style={{...iS,flex:"1 1 100px",background:darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"}}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
                <input value={scorePaper} onChange={e=>setScorePaper(e.target.value)} placeholder="Paper name / year" style={{...iS,flex:"2 1 150px"}}/>
                <input value={scoreGot} onChange={e=>setScoreGot(e.target.value)} placeholder="Score" type="number" style={{...iS,flex:"0 0 60px"}}/>
                <input value={scoreMax} onChange={e=>setScoreMax(e.target.value)} placeholder="/Max" type="number" style={{...iS,flex:"0 0 60px"}}/>
                <button onClick={addScore} style={{background:"#22c55e",border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>Save</button>
              </div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Paper history ({filteredScores.length})</div>
                <div style={{display:"flex",gap:3}}>
                  {["All",...SUBJECTS].map(s=>(
                    <button key={s} onClick={()=>setSfilt(s)} style={{background:sfilt===s?C.card2:"transparent",border:`1px solid ${C.border}`,color:sfilt===s?C.text:C.muted,padding:"3px 6px",borderRadius:4,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                      {s==="Further Maths"?"FM":s==="Computer Science"?"CS":s}
                    </button>
                  ))}
                </div>
              </div>
              {filteredScores.length===0&&<div style={{fontSize:15,color:C.muted,textAlign:"center",padding:"16px 0"}}>No papers logged yet.</div>}
              {filteredScores.map(s=>{
                const {grade,exact}=getGradeForPaper(s.got,s.max,s.paper,s.subject,GRADE_BOUNDARIES);
                return (
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                    <div style={{width:3,height:32,borderRadius:2,background:SUBJECT_COLORS[s.subject]||"#888",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.subject}</div>
                      <div style={{fontSize:13,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.paper}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.date}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:17,fontWeight:700,color:gradeColor(grade)}}>{grade}{!exact&&<span style={{fontSize:10,opacity:0.5,marginLeft:1}}>~</span>} <span style={{fontSize:14,color:C.muted}}>{s.pct}%</span></div>
                        <div style={{fontSize:12,color:C.muted}}>{s.got}/{s.max}{!exact&&<span style={{marginLeft:3,color:C.muted}}>est.</span>}</div>
                      </div>
                      {confirmDel===s.id?(
                        <div style={{display:"flex",gap:3}}>
                          <button onClick={()=>{setScores(p=>p.filter(x=>x.id!==s.id));setConfirmDel(null);}} style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Delete</button>
                          <button onClick={()=>setConfirmDel(null)} style={{background:"rgba(0,0,0,0.04)",border:`1px solid ${C.border}`,color:C.muted,padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancel</button>
                        </div>
                      ):(
                        <button onClick={()=>setConfirmDel(s.id)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Del</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>Log an error</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                <select value={errSubject} onChange={e=>setErrSubject(e.target.value)} style={{...iS,flex:"1 1 90px",background:darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"}}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
                <input value={errTopic} onChange={e=>setErrTopic(e.target.value)} placeholder="Topic" style={{...iS,flex:"2 1 140px"}}/>
                <select value={errType} onChange={e=>setErrType(e.target.value)} style={{...iS,flex:"1 1 120px",background:darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"}}>{ERROR_TYPES.map(et=><option key={et.id} value={et.id}>{et.label}</option>)}</select>
              </div>
              <div style={{display:"flex",gap:5}}>
                <input value={errNote} onChange={e=>setErrNote(e.target.value)} placeholder="What specifically went wrong? (optional)" style={{...iS,flex:1}}/>
                <button onClick={addError} style={{background:"#ef4444",border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>Save</button>
              </div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Error log ({filteredErrors.length})</div>
                <div style={{display:"flex",gap:3}}>
                  {["All",...SUBJECTS].map(s=>(
                    <button key={s} onClick={()=>setEfilt(s)} style={{background:efilt===s?C.card2:"transparent",border:`1px solid ${C.border}`,color:efilt===s?C.text:C.muted,padding:"3px 6px",borderRadius:4,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                      {s==="Further Maths"?"FM":s==="Computer Science"?"CS":s}
                    </button>
                  ))}
                </div>
              </div>
              {errors.length>=3&&(
                <div style={{display:"flex",gap:3,marginBottom:10,flexWrap:"wrap"}}>
                  {ERROR_TYPES.map(et=>{
                    const cnt=filteredErrors.filter(e=>e.type===et.id).length;
                    if(!cnt) return null;
                    return <div key={et.id} style={{fontSize:13,padding:"3px 7px",borderRadius:4,background:`${et.color}12`,color:et.color,fontWeight:700}}>{et.label}: {cnt}</div>;
                  })}
                </div>
              )}
              {filteredErrors.length===0&&<div style={{fontSize:15,color:C.muted,textAlign:"center",padding:"14px 0"}}>No errors logged{efilt!=="All"?` for ${efilt}`:""} yet.</div>}
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {filteredErrors.map(e=>{
                  const et=ERROR_TYPES.find(t=>t.id===e.type);
                  return (
                    <div key={e.id} style={{display:"flex",gap:8,padding:"7px 0",borderTop:`1px solid ${C.border}`,alignItems:"flex-start"}}>
                      <div style={{width:3,borderRadius:2,background:et?.color||"#555",flexShrink:0,alignSelf:"stretch"}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,color:C.muted}}><span style={{color:SUBJECT_COLORS[e.subject]||"#7a7268",fontWeight:600}}>{e.subject}</span> · {e.topic}</div>
                        <div style={{fontSize:12,color:C.muted,marginTop:2}}>{et?.label} · {e.date}{e.note&&` · ${e.note}`}</div>
                      </div>
                      <button onClick={()=>setErrors(p=>p.filter(x=>x.id!==e.id))} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"3px 8px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0}}>Del</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view==="countdown"&&(()=>{
          const upcoming=EXAMS.map(e=>({...e,d:daysUntil(e.date)})).sort((a,b)=>a.d-b.d);
          const next=upcoming.find(e=>e.d>0);
          return (
            <div>
              {next&&<div style={{textAlign:"center",marginBottom:28,padding:"28px 0"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:12}}>First exam in</div>
                <div style={{fontSize:68,fontWeight:700,color:C.text,lineHeight:1}}>{next.d}</div>
                <div style={{fontSize:14,color:C.muted,marginTop:8}}>{next.subject} · {next.paper}</div>
              </div>}
              <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:10}}>All exams</div>
              {EXAMS.map((e,i)=>{
                const d=daysUntil(e.date),col=SUBJECT_COLORS[e.subject]||"#888",past=d<0;
                return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:4,borderRadius:8,background:past?"rgba(0,0,0,0.02)":C.surface,border:`1px solid ${past?"rgba(0,0,0,0.02)":col+"22"}`,opacity:past?0.3:1}}>
                  <div style={{width:4,height:30,borderRadius:2,background:col,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.subject}: {e.paper.split(":")[1]?.trim()||e.paper}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{e.code} · {e.board} · {e.time} · {e.duration}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.5}}>{e.topics}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,color:C.muted}}>{new Date(e.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                    <div style={{fontSize:14,fontWeight:700,color:d<=7?"#ef4444":d<=30?"#f97316":col}}>{d>0?`${d}d`:"Done"}</div>
                  </div>
                </div>;
              })}
            </div>
          );
        })()}

        {view==="weekly"&&(()=>{
          const week=WEEKS.find(w=>w.num===activeWeek);
          return (
            <div>
              <div style={{marginBottom:16}}>
                <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>10-Week Plan</h1>
                <p style={{fontSize:13,color:C.muted,margin:0}}>Your week-by-week revision schedule to exam day.</p>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:16,flexWrap:"wrap"}}>
                {WEEKS.map(w=>(
                  <button key={w.num} onClick={()=>setActiveWeek(w.num)} style={{background:activeWeek===w.num?"rgba(255,109,0,0.15)":C.card3,border:`1px solid ${activeWeek===w.num?"#FF6D0044":C.border}`,color:activeWeek===w.num?"#FF6D00":C.muted,padding:"5px 9px",borderRadius:5,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>W{w.num}</button>
                ))}
              </div>
              {week&&<div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:18,fontWeight:700,color:C.text}}>Week {week.num}: {week.title}</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:3}}>{week.start} to {week.end} · {week.focus}</div>
                </div>
                {week.days.map((day,di)=>(
                  <div key={di} style={{marginBottom:10,background:C.card3,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:8}}>{day.day}</div>
                    {day.blocks.map((b,bi)=>{
                      const k=`${week.num}-${di}-${bi}`,done=checks[k],col=blockColor(b.s);
                      return <div key={bi} onClick={()=>toggle(k)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderBottom:bi<day.blocks.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",opacity:done?0.3:1}}>
                        <div style={{width:14,height:14,borderRadius:3,flexShrink:0,marginTop:2,border:done?"none":`2px solid ${col}44`,background:done?col:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {done&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
                        </div>
                        <div style={{width:3,borderRadius:2,background:col,opacity:0.5,flexShrink:0,alignSelf:"stretch"}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,lineHeight:1.5,color:done?C.muted:C.text,textDecoration:done?"line-through":"none"}}>{b.t}</div>
                          {b.d&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{b.d}</div>}
                        </div>
                      </div>;
                    })}
                  </div>
                ))}
              </div>}
            </div>
          );
        })()}

        {view==="technique"&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Study Technique</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>Evidence-based strategies that raise scores regardless of subject.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
              {GENERIC_TIPS.map((cat,ci)=>(
                <div key={ci} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18,display:"flex",flexDirection:"column"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <div style={{width:3,height:16,borderRadius:2,background:cat.color,flexShrink:0}}/>
                    <div style={{fontSize:12,fontWeight:700,color:cat.color,letterSpacing:0.3,textTransform:"uppercase"}}>{cat.category}</div>
                  </div>
                  {cat.tips.map((tip,ti)=>(
                    <div key={ti} style={{marginBottom:12,paddingBottom:12,borderBottom:ti<cat.tips.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{tip.title}</div>
                      <div style={{fontSize:12,lineHeight:1.65,color:C.muted}}>{tip.body}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {view==="daily"&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Daily Routine</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>A structured revision day that builds focus and retains more.</p>
            </div>
            {DAILY_ROUTINE.map((b,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:44,flexShrink:0,textAlign:"right"}}><div style={{fontSize:12,fontWeight:500,color:C.muted}}>{b.time}</div></div>
                <div style={{width:3,flexShrink:0,borderRadius:2,background:b.color,opacity:0.6}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:3}}>{b.block}</div>
                  <p style={{margin:0,fontSize:13,lineHeight:1.6,color:C.muted}}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {view==="resources"&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Resources</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>Past papers, video solutions, and revision notes for each subject.</p>
            </div>
            {RESOURCES.map((r,ri)=>(
              <div key={ri} style={{marginBottom:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
                <div style={{fontSize:12,fontWeight:600,color:SUBJECT_COLORS[r.subject]||"#7a7268",marginBottom:12}}>{r.subject}</div>
                {r.items.map((item,ii)=>(
                  <a key={ii} href={item.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:14,color:C.text,textDecoration:"none",padding:"8px 0",borderBottom:ii<r.items.length-1?`1px solid ${C.border}`:"none",transition:"color 0.12s"}}>
                    <span>{item.name}</span><span style={{color:C.muted,fontSize:12}}>↗</span>
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}

        {view==="account"&&(
          <div style={{maxWidth:480}}>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Account</h1>
              <p style={{fontSize:13,color:C.muted,margin:0}}>Manage your profile and account settings.</p>
            </div>

            {/* Profile info */}
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:14}}>Profile</div>
              {userProfile?.display_name&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:3}}>Name</div>
                  <div style={{fontSize:14,color:C.text,fontWeight:500}}>{userProfile.display_name}</div>
                </div>
              )}
              <div>
                <div style={{fontSize:12,color:C.muted,marginBottom:3}}>Email</div>
                <div style={{fontSize:14,color:C.text}}>{user?.email||"Local mode"}</div>
              </div>
            </div>

            {/* Sign out */}
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:14}}>Session</div>
              <button
                onClick={onLogout}
                style={{padding:"10px 18px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}
              >
                Sign out
              </button>
            </div>

            {/* Delete account */}
            {user&&(
              <div style={{background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:10,padding:20}}>
                <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>Danger zone</div>
                <p style={{fontSize:13,color:C.muted,margin:"0 0 14px",lineHeight:1.6}}>
                  Permanently deletes your account and all data. This cannot be undone.
                </p>
                {!confirmDeletion?(
                  <button
                    onClick={()=>setConfirmDeletion(true)}
                    style={{padding:"10px 18px",background:"transparent",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,color:"#f87171",fontSize:14,fontFamily:"inherit",cursor:"pointer"}}
                  >
                    Delete account
                  </button>
                ):(
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:"#f87171",margin:"0 0 12px"}}>Are you sure? This is permanent.</p>
                    <div style={{display:"flex",gap:8}}>
                      <button
                        onClick={()=>setConfirmDeletion(false)}
                        style={{flex:1,padding:"10px 0",background:C.card2,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteAccount}
                        disabled={deleting}
                        style={{flex:1,padding:"10px 0",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,color:"#f87171",fontSize:14,fontWeight:600,fontFamily:"inherit",cursor:deleting?"not-allowed":"pointer"}}
                      >
                        {deleting?"Deleting...":"Yes, delete everything"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{textAlign:"center",padding:"24px 0 8px",borderTop:`1px solid ${C.border}`,color:C.muted,fontSize:11}}>
        A* Battle Plan &nbsp;·&nbsp;
        <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setShowTos(true)}>Terms of Service &amp; Privacy Policy</span>
      </div>
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState(()=>load("rbp_active_profile","me"));
  const [user, setUser] = useState(undefined);
  const [userProfile, setUserProfile] = useState(null);
  const [subjectSelection, setSubjectSelection] = useState(null);
  const [cloudData, setCloudData] = useState(null);

  useEffect(()=>save("rbp_active_profile",profile),[profile]);

  useEffect(()=>{
    if(!isSupabaseConfigured()){ setUser(null); return; }
    const timeout = setTimeout(()=>setUser(u=>u===undefined?null:u), 3000);
    const applySession = async (event, session) => {
      if(event==='TOKEN_REFRESHED'||event==='USER_UPDATED') return;
      clearTimeout(timeout);
      if(!session?.user){ setUser(null); setUserProfile(null); return; }
      const uid = session.user.id;
      let {data:prof} = await supabase.from('user_profiles').select('*').eq('id',uid).single();
      if(!prof){
        await supabase.from('user_profiles').upsert(
          {id:uid, email:session.user.email, tos_agreed_at:new Date().toISOString()},
          {onConflict:'id'}
        );
        prof = {id:uid, email:session.user.email};
      }
      const {data:ud} = await supabase.from('user_data').select('*').eq('user_id',uid).maybeSingle();
      let parsed = [];
      if (prof?.subjects) {
        try { const p = JSON.parse(prof.subjects); if (Array.isArray(p)) parsed = p; } catch(_) {}
      }
      try { localStorage.removeItem('rbp_subjects'); } catch(_) {}
      setUser(session.user);
      setUserProfile(prof);
      setSubjectSelection(parsed);
      if(ud) setCloudData(ud);
    };
    const {data:{subscription}} = supabase.auth.onAuthStateChange(applySession);
    return ()=>{ subscription.unsubscribe(); clearTimeout(timeout); };
  },[]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setUserProfile(null); setSubjectSelection(null); setCloudData(null);
  };

  const handleSubjectsDone = (sel) => setSubjectSelection(sel);

  if (user === undefined) {
    const _dark = (() => { try { return JSON.parse(localStorage.getItem('rbp_dark')||'false'); } catch { return false; } })();
    return (
      <div style={{minHeight:"100vh",background:_dark?"#0d0f14":"#e8e4dd",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:_dark?"#9a9490":"#7a7268",fontSize:13}}>
        Loading…
      </div>
    );
  }

  if (user === null && isSupabaseConfigured()) return <AuthGate onAuth={()=>{}} />;

  if (Array.isArray(subjectSelection) && subjectSelection.length === 0) {
    return <SubjectPicker user={user} onComplete={handleSubjectsDone}/>;
  }

  return (
    <RevisionPlan
      key={profile}
      profile={profile}
      onProfileChange={setProfile}
      user={user}
      userProfile={userProfile}
      onLogout={handleLogout}
      userSubjectSelection={Array.isArray(subjectSelection) ? subjectSelection : []}
      cloudData={cloudData}
    />
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
