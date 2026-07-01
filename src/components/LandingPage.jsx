// ── Landing page ────────────────────────────────────────────────────────────
// Public marketing page. Lazy-loaded from the root shell so signed-in users
// never download it and new visitors don't download the app.
import React, { useState, useEffect, useRef } from 'react';
import { type, FONT_BODY, FONT_DISPLAY, FONT_MONO, gradeColor } from '../theme';
import { RANKS } from '../data/ranks';
import { RichText } from '../lib/richtext';
import CapsMark from './CapsMark';
import TermsOfService from './TermsOfService';

export default function LandingPage({ onGetStarted }) {
  const font = FONT_BODY;
  const display = FONT_DISPLAY;
  const mono = FONT_MONO;
  // Palette synced to the Claude Design prototype (landing).
  const C = {
    bg:'#f4eee3', surface:'#fbf7ef', nav:'rgba(251,247,239,0.9)',
    border:'#e7ddcc', card2:'#efe7d8',
    text:'#2b2620', muted:'#6f665b', subtle:'#a39a8c', accent:'#b5735a',
    success:'#4f7256',
  };
  const [showTerms, setShowTerms] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [slide, setSlide] = useState(0);
  const ic = d => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );

  // AI-marker showcase - a hard question per subject (with diagram where it
  // fits), the student's WRONG answer, and Caps re-working it in full. All
  // rendered live by RichText (real LaTeX, charts, graphs, code) - not images.
  const MARKER_SAMPLES = [
    { tab:'Maths', subject:'Mathematics', paper:'Pure · Integration by parts', marks:'2 / 7', diagram:true,
      question:`**Q8** The diagram shows the curve $y = x^{2}e^{x}$. Find the **exact** area of the shaded region $R$ between the curve and the $x$-axis for $0 \\le x \\le 2$.

\`\`\`chart
{"type":"line","title":"R = area under y = x²eˣ","xLabel":"x","yLabel":"y","series":[{"name":"y = x²eˣ","points":[[0,0],[0.5,0.41],[1,2.72],[1.5,10.08],[2,29.56]]}]}
\`\`\``,
      student:[
        {text:'$\\int x^{2}e^{x}\\,dx = x^{2}e^{x}-\\int 2xe^{x}\\,dx = x^{2}e^{x}-2xe^{x}+C$', bad:true},
        {text:'Area $=\\left[x^{2}e^{x}-2xe^{x}\\right]_{0}^{2}=(4e^{2}-4e^{2})-0=0$', bad:true},
      ],
      caps:[
        'Integrate by parts with $u=x^{2}$: $\\displaystyle\\int x^{2}e^{x}\\,dx = x^{2}e^{x}-\\int 2xe^{x}\\,dx$.',
        'That remaining integral needs parts **again**: $\\displaystyle\\int 2xe^{x}\\,dx = 2xe^{x}-\\int 2e^{x}\\,dx = 2xe^{x}-2e^{x}$.',
        'So $\\displaystyle\\int x^{2}e^{x}\\,dx = e^{x}\\!\\left(x^{2}-2x+2\\right)+C$.',
        'Evaluate $0\\to 2$: $e^{2}(4-4+2)-e^{0}(0-0+2)=\\mathbf{2e^{2}-2}\\approx 12.78$.',
      ],
      verdict:'You stopped after one integration by parts. The $\\int 2xe^{x}$ term needs parts a second time - dropping it collapsed the area to 0.' },

    { tab:'Further Mech', subject:'Further Maths', paper:'Further Mechanics · Circular motion', marks:'1 / 6', diagram:false,
      question:`**Q6** A particle of mass $0.5\\,\\text{kg}$ on a light string of length $0.8\\,\\text{m}$ moves in a complete vertical circle. At the **lowest** point its speed is $7\\,\\text{m s}^{-1}$. Find the tension at the **highest** point. $(g=9.8)$`,
      student:[
        {text:'At the top: $T=\\dfrac{mv^{2}}{r}=\\dfrac{0.5\\times 7^{2}}{0.8}=30.6\\,\\text{N}$', bad:true},
      ],
      caps:[
        'The speed drops going up - use conservation of energy over the rise $2r=1.6\\,\\text{m}$.',
        '$v_{\\text{top}}^{2}=v_{\\text{bot}}^{2}-4gr = 49 - 4(9.8)(0.8) = 17.64\\,\\text{m}^2\\text{s}^{-2}$.',
        'At the top, tension **and** weight point to the centre: $T+mg=\\dfrac{mv_{\\text{top}}^{2}}{r}$.',
        '$T = 0.5\\!\\left(\\dfrac{17.64}{0.8}-9.8\\right)=0.5(22.05-9.8)=\\mathbf{6.13\\,\\text{N}}$.',
      ],
      verdict:'Two slips: the top speed is lower than the bottom (energy), and at the top the weight adds to the central force.' },

    { tab:'Decision', subject:'Further Maths', paper:'Decision 1 · Simplex', marks:'2 / 7', diagram:true,
      question:`**Q5** Maximise $P = 3x + 2y$ subject to $x+y\\le 4$, $x+3y\\le 6$, $x,y\\ge 0$. Use the Simplex algorithm.`,
      student:[
        {text:'I pivoted on the $y$ column first (it looked simpler) and got $P = 4$ at $(0,2)$.', bad:true},
      ],
      caps:[
        'Set up the tableau with slacks $s,t$. The most negative objective entry is under $x$, so **$x$ enters**:\n\n| basic | x | y | s | t | val |\n| --- | --- | --- | --- | --- | --- |\n| s | 1 | 1 | 1 | 0 | 4 |\n| t | 1 | 3 | 0 | 1 | 6 |\n| P | −3 | −2 | 0 | 0 | 0 |',
        'Ratio test: $4/1=4$ vs $6/1=6$ → smallest is $4$, so **$s$ leaves**; pivot on that row.',
        'No negative objective entries remain → optimal:\n\n| basic | x | y | s | t | val |\n| --- | --- | --- | --- | --- | --- |\n| x | 1 | 1 | 1 | 0 | 4 |\n| t | 0 | 2 | −1 | 1 | 2 |\n| P | 0 | 1 | 3 | 0 | 12 |',
        'Read off $x=4,\\,y=0$, giving $\\mathbf{P=12}$ - not 4.',
      ],
      verdict:'Always bring in the column with the most negative objective coefficient ($x$ at $-3$), then ratio-test. Entering $y$ left you stuck at a worse vertex.' },

    { tab:'Physics', subject:'Physics', paper:'Mechanics · Projectiles', marks:'1 / 3', diagram:true,
      question:`**Q5** A ball is launched at $20\\,\\text{m s}^{-1}$ at $30^{\\circ}$ to the horizontal. Find its range. $(g=9.8)$

\`\`\`chart
{"type":"line","title":"","xLabel":"x (m)","yLabel":"height (m)","series":[{"name":"path","points":[[0,0],[8.8,3.8],[17.7,5.1],[26.5,3.8],[35.3,0]]}]}
\`\`\``,
      student:[
        {text:'$R=\\dfrac{u^{2}\\sin\\theta}{g}=\\dfrac{400 \\times 0.5}{9.8}=20.4\\,\\text{m}$', bad:true},
      ],
      caps:[
        'The range formula uses $\\sin 2\\theta$, not $\\sin\\theta$: $R=\\dfrac{u^{2}\\sin 2\\theta}{g}$.',
        '$\\sin(2\\times 30^{\\circ})=\\sin 60^{\\circ}=0.866$.',
        '$R=\\dfrac{400 \\times 0.866}{9.8}=\\mathbf{35.3\\,\\text{m}}$.',
      ],
      verdict:'Right method, wrong angle - range uses sin of double the angle. A very common dropped mark.' },

    { tab:'Comp Sci', subject:'Computer Science', paper:'Paper 1 · Recursion', marks:'2 / 4', diagram:false,
      question:`**Q6** Write a function returning the $n$th Fibonacci number ($F_1=F_2=1$).`,
      student:[
        {text:'```python\ndef fib(n):\n    return fib(n-1) + fib(n-2)\n```', bad:true},
      ],
      caps:[
        'There is no base case, so it recurses forever. Anchor it:',
        '```python\ndef fib(n):\n    if n <= 2:\n        return 1\n    return fib(n - 1) + fib(n - 2)\n```',
        'Trace for $n=4$:\n\n| call | returns |\n| --- | --- |\n| fib(4) | fib(3) + fib(2) |\n| fib(3) | fib(2) + fib(1) = 2 |\n| **fib(4)** | **3** |',
      ],
      verdict:'Your logic was right, but with no base case it never stops. Always anchor a recursion first.' },

    { tab:'Economics', subject:'Economics', paper:'Theme 3 · Monopoly', marks:'3 / 9', diagram:true,
      question:`**Q6** Using a diagram, find the profit-maximising price and output for a monopolist, and shade its supernormal profit. $AR = 20 - Q$, $MR = 20 - 2Q$, $MC = 2 + Q$, and $ATC = £8$ at the profit-maximising output.

\`\`\`chart
{"type":"line","title":"Monopoly · profit maximisation","xLabel":"Quantity","yLabel":"Price (£)","series":[{"name":"AR (D)","points":[[0,20],[20,0]]},{"name":"MR","points":[[0,20],[10,0]]},{"name":"MC","points":[[0,2],[18,20]]},{"name":"ATC","points":[[2,14],[4,9.5],[6,8],[9,8.3],[13,10]]}]}
\`\`\``,
      student:[
        {text:'Profit max is where $MR = MC$, so I read straight across: $Q = 6$ and **price $= £8$**.', bad:true},
        {text:'Profit $= 0$ because price $= $ cost there.', bad:true},
      ],
      caps:[
        'Profit max is where $MR = MC$: $20 - 2Q = 2 + Q \\Rightarrow Q = \\mathbf{6}$.',
        'Crucial step: read the **price up on the AR (demand) curve**, not on MC: $P = 20 - 6 = \\mathbf{£14}$.',
        'Supernormal profit per unit $= AR - ATC = 14 - 8 = £6$.',
        'Total supernormal profit $= (AR - ATC)\\times Q = 6 \\times 6 = \\mathbf{£36}$ - the shaded rectangle.',
      ],
      verdict:'The classic monopoly trap: you priced at MC. A monopolist sets quantity where MR=MC, then charges what the demand curve will bear above it.' },

    { tab:'English', subject:'English Literature', paper:'Macbeth · 30 marks', marks:'Level 2 / 5', diagram:false,
      question:`**Q1** "Macbeth is a victim of fate." Explore how far you agree.`,
      student:[
        {text:'The witches say Macbeth will be king and he does become king, which shows fate. There are three witches and they speak in rhyme.', bad:true},
      ],
      caps:[
        '**AO1** - take a clear line: he is *partly* fated, but his choices drive the tragedy.',
        '**AO2** - analyse language: "*stars, hide your fires*" is an imperative showing **agency**, not fate.',
        '**AO3** - add context: a Jacobean audience saw regicide as a chosen sin against the divine order.',
        'Feature-spotting ("three witches, rhyme") earns little - **analyse the effect**, do not list devices.',
      ],
      verdict:'You retold the plot and spotted features. The top bands reward analysis of how language and context create meaning.' },
  ];

  // One marked-answer card (question + diagram, wrong answer, Caps's full re-work).
  const renderMarkerCard = (s) => (
    <div key={s.subject} style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
      overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(20,14,8,0.28)'}}>
      {/* header */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'15px 22px',
        borderBottom:`1px solid ${C.border}`, background:C.card2}}>
        <CapsMark size={28}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:15, fontWeight:800, color:C.text, lineHeight:1.2}}>{s.subject}</div>
          <div style={{fontSize:11.5, color:C.subtle, fontFamily:mono}}>{s.paper}</div>
        </div>
        <div style={{fontSize:13, fontWeight:800, fontFamily:mono, color:C.accent,
          background:`${C.accent}14`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'5px 11px'}}>{s.marks}</div>
      </div>

      {/* question on top, full width */}
      <div style={{padding:'20px 22px 8px'}}>
        <div style={{fontSize:10.5, fontWeight:800, color:C.subtle, textTransform:'uppercase', letterSpacing:0.6, marginBottom:8}}>The question</div>
        <RichText style={{fontSize:14.5, color:C.text, lineHeight:1.75}}>{s.question}</RichText>
      </div>

      {/* student vs Caps, side by side */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(270px, 1fr))', gap:14, padding:'12px 22px 6px'}}>
        <div style={{background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.28)', borderRadius:12, padding:'13px 15px'}}>
          <div style={{fontSize:10.5, fontWeight:800, color:'#c0392b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10,
            display:'flex', alignItems:'center', gap:7}}>
            <span style={{width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:10, fontWeight:900,
              display:'inline-flex', alignItems:'center', justifyContent:'center'}}>✕</span>
            Student's answer
          </div>
          {s.student.map((ln,i)=>(
            <RichText key={i} style={{fontSize:13, lineHeight:1.6, color:ln.bad?'#c0392b':C.muted,
              fontWeight:ln.bad?600:400, marginBottom:i<s.student.length-1?6:0}}>{ln.text}</RichText>
          ))}
        </div>
        <div style={{background:`${C.success}0f`, border:`1px solid ${C.success}33`, borderRadius:12, padding:'13px 15px'}}>
          <div style={{fontSize:10.5, fontWeight:800, color:C.success, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10,
            display:'flex', alignItems:'center', gap:7}}>
            <span style={{width:16, height:16, borderRadius:'50%', background:C.success, color:'#fff', fontSize:10, fontWeight:900,
              display:'inline-flex', alignItems:'center', justifyContent:'center'}}>✓</span>
            Caps re-worked it in full
          </div>
          {s.caps.map((step,i)=>(
            <div key={i} style={{display:'flex', gap:9, alignItems:'flex-start', marginBottom:i<s.caps.length-1?9:0}}>
              <span style={{flexShrink:0, fontSize:11, fontWeight:800, color:'#fff', background:C.success, fontFamily:mono,
                width:18, height:18, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', marginTop:1}}>{i+1}</span>
              <RichText style={{flex:1, minWidth:0, fontSize:13, lineHeight:1.65, color:C.text}}>{step}</RichText>
            </div>
          ))}
        </div>
      </div>

      {/* verdict */}
      <div style={{display:'flex', gap:9, alignItems:'flex-start', fontSize:13, color:C.muted, lineHeight:1.6,
        margin:'10px 22px 20px', background:`${C.accent}0e`, border:`1px solid ${C.accent}26`, borderRadius:10, padding:'12px 15px'}}>
        <span style={{flexShrink:0, color:C.accent, fontWeight:800}}>Caps:</span>
        <span>{s.verdict}</span>
      </div>
    </div>
  );

  // Lightweight mockups of the rest of the app, for the Gallery sheet.
  const spark = (pts, col) => (
    <svg width="100%" height="34" viewBox="0 0 120 34" preserveAspectRatio="none" style={{display:'block'}}>
      <polyline points={pts.split(',').map((y,i)=>`${i*(120/(pts.split(',').length-1))},${34-(+y/100)*30-2}`).join(' ')}
        fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const APP_SHOTS = [
    { tag:'Analytics', title:'Projected results', desc:'Where each subject is heading on current form, not just where it is now.',
      render:()=>(
        <div style={{display:'flex', flexDirection:'column', gap:9}}>
          {[['Further Maths','A','A*','#4f7256','18,30,28,44,52,70'],
            ['Chemistry','C','B','#c2944a','22,30,26,40,38,52'],
            ['Physics','B','A','#4f7256','30,34,40,38,52,60']].map(([n,now,proj,col,pts])=>(
            <div key={n} style={{display:'flex', alignItems:'center', gap:12, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px'}}>
              <span style={{flex:1, fontSize:13, fontWeight:600, color:C.text}}>{n}</span>
              <div style={{width:90}}>{spark(pts, col)}</div>
              <span style={{fontSize:12, color:C.subtle, fontFamily:mono}}>{now}</span>
              <span style={{fontSize:12, color:C.subtle}}>→</span>
              <span style={{fontSize:14, fontWeight:800, color:col, fontFamily:mono, width:24, textAlign:'right'}}>{proj}</span>
            </div>
          ))}
        </div>
      ) },
    { tag:'Analytics', title:'Readiness & trend', desc:'One score for how prepared you are, with the trajectory behind it.',
      render:()=>(
        <div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:9, marginBottom:11}}>
            {[['Readiness','74',C.accent],['Avg score','78%',C.text],['Papers','24',C.text]].map(([l,v,c])=>(
              <div key={l} style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'11px 12px'}}>
                <div style={{fontSize:10.5, color:C.subtle, marginBottom:6}}>{l}</div>
                <div style={{fontSize:22, fontWeight:800, color:c, fontFamily:mono, lineHeight:1}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px'}}>
            <div style={{fontSize:10.5, color:C.subtle, marginBottom:8}}>Score trend · last 8 papers</div>
            {spark('40,48,44,55,52,63,68,78', C.accent)}
          </div>
        </div>
      ) },
    { tag:'Tracker', title:'Every paper, real grades', desc:'Log a mark, get the grade from official boundaries - and tag the mistakes.',
      render:()=>(
        <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'2px 14px'}}>
          {[['Edexcel Pure 1','June 2022','64/75','A'],['AQA Chem P2','Specimen','58/100','C'],['OCR CS P1','June 2023','72/90','A']].map(([n,d,m,g],i)=>(
            <div key={n} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:i?`1px solid ${C.border}`:'none'}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:600, color:C.text}}>{n}</div>
                <div style={{fontSize:11, color:C.subtle, fontFamily:mono}}>{d}</div>
              </div>
              <span style={{fontSize:12, color:C.muted, fontFamily:mono}}>{m}</span>
              <span style={{fontSize:13, fontWeight:800, color:gradeColor(g), width:24, textAlign:'center'}}>{g}</span>
            </div>
          ))}
        </div>
      ) },
    { tag:'Focus timer', title:'Time your revision', desc:'Pomodoro-style sessions logged against each subject so your hours count.',
      render:()=>(
        <div style={{display:'flex', alignItems:'center', gap:18, justifyContent:'center', padding:'10px 0'}}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="44" fill="none" stroke={C.border} strokeWidth="8"/>
            <circle cx="52" cy="52" r="44" fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*44*0.68} ${2*Math.PI*44}`} transform="rotate(-90 52 52)"/>
            <text x="52" y="50" textAnchor="middle" fontSize="20" fontWeight="800" fill={C.text} fontFamily={mono}>17:08</text>
            <text x="52" y="66" textAnchor="middle" fontSize="9" fill={C.subtle} fontFamily={font}>FOCUS</text>
          </svg>
          <div>
            <div style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:4}}>Chemistry · Rates</div>
            <div style={{fontSize:12, color:C.muted, lineHeight:1.6}}>Session 3 of 4<br/>2h 10m logged today</div>
          </div>
        </div>
      ) },
    { tag:'Caps chat', title:'Ask Caps anything', desc:'Exactly how it looks in the app - your companion answers grounded in your own papers, topics and dates.',
      render:()=>(
        <div style={{border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', background:C.bg}}>
          {/* chat header, as the student sees it */}
          <div style={{display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderBottom:`1px solid ${C.border}`, background:C.card2}}>
            <CapsMark size={24}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, fontWeight:800, color:C.text, lineHeight:1.1}}>Caps</div>
              <div style={{fontSize:10, color:C.success, display:'flex', alignItems:'center', gap:4}}>
                <span style={{width:6, height:6, borderRadius:'50%', background:C.success, display:'inline-block'}}/>online
              </div>
            </div>
          </div>
          {/* messages */}
          <div style={{padding:'12px', display:'flex', flexDirection:'column', gap:9, background:C.surface}}>
            <div style={{alignSelf:'flex-end', maxWidth:'82%', background:C.accent, color:'#fff', borderRadius:'13px 13px 4px 13px', padding:'9px 12px', fontSize:12.5, lineHeight:1.5}}>
              What should I revise tonight?
            </div>
            <div style={{alignSelf:'flex-start', maxWidth:'90%', display:'flex', gap:7, alignItems:'flex-end'}}>
              <CapsMark size={20}/>
              <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:'13px 13px 13px 4px', padding:'10px 12px'}}>
                <RichText style={{fontSize:12.5, color:C.text, lineHeight:1.6}}>{`Your weakest topic is **Chemistry - rates** (3 lost marks last paper). Do 30 mins on activation energy, then a timed 6-marker. Your **Physics** paper is in **9 days** - keep it warm with one mechanics question.`}</RichText>
              </div>
            </div>
          </div>
          {/* input bar (visual only) */}
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderTop:`1px solid ${C.border}`, background:C.bg}}>
            <div style={{flex:1, fontSize:12, color:C.subtle, background:C.surface, border:`1px solid ${C.border}`, borderRadius:999, padding:'8px 13px'}}>Ask Caps anything...</div>
            <div style={{width:30, height:30, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
          </div>
        </div>
      ) },
  ];

  const FEATURES = [
    { icon: ic(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
      title: 'Past paper tracker',
      desc: 'Log every paper and see your real grade - calculated against official mark-scheme boundaries, not rough percentages.' },
    { icon: ic(<><path d="M22 12A10 10 0 1 1 12 2"/><path d="M12 12 16 8"/></>),
      title: 'Battle Readiness',
      desc: 'One score for how prepared you actually are, updated every time you log a paper.' },
    { icon: ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
      title: 'Error patterns',
      desc: 'Tag every mistake by type and see which topics keep costing you marks - so you fix the cause, not the symptom.' },
    { icon: ic(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>),
      title: 'RAG topic map',
      desc: 'Rate every topic red, amber or green. See at a glance exactly where your revision time should go.' },
    { icon: ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
      title: 'Exam countdown',
      desc: 'Every paper date across every subject and board, with the days remaining, in one place.' },
    { icon: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>),
      title: 'AI study companion',
      desc: 'Ask what to do next and get an answer grounded in your own papers, weak topics and exam dates.' },
    { icon: ic(<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></>),
      title: 'AI past-paper marker',
      desc: "Snap or upload your answers and Caps marks them in your board's style - estimated grade, marks earned, and the exact step to fix. Renders real maths, diagrams, networks and code." },
  ];

  const TRUST_CHIPS = ['Free during beta', 'No credit card', 'A-Levels & GCSEs', 'No ads'];

  const STEPS = [
    { n:'1', title:'Set up in two minutes', desc:'Pick your subjects and exam boards. The right papers and official grade boundaries load automatically.' },
    { n:'2', title:'Log papers as you go', desc:'Enter your mark after each past paper, tag the mistakes you made, and rate every topic red, amber or green.' },
    { n:'3', title:'See exactly what to fix', desc:'Your real grade, your trajectory and the topics costing you the most marks - so every revision hour is spent where it counts.' },
  ];

  const TRUST = [
    { title:'Free to start, no card', desc:'Everything you need to revise is free as a Recruit - no card to sign up. Commander is an optional upgrade, never a wall.' },
    { title:'Your data stays yours', desc:'No ads, never sold. Export everything or delete your account at any time.' },
    { title:'Real grades, not guesses', desc:'Marks become grades using official mark-scheme boundaries - not rough percentages.' },
    { title:'Every major board', desc:'AQA, Edexcel, OCR and WJEC - across A-Levels, AS and GCSEs.' },
  ];

  const FAQ = [
    { q:'Is it actually free?', a:'Yes. As a Recruit you get everything you need to track papers and revise - free, forever, no card needed. Commander (£8.99/mo, or £69.99/year) is an optional upgrade for generous AI marking and unlimited companion chat.' },
    { q:'Which exam boards do you support?', a:'AQA, Edexcel, OCR and WJEC, for A-Levels, AS-Levels and GCSEs across the main subjects.' },
    { q:'Is my data safe?', a:'Your revision data is stored securely and is never sold or used for ads. You can export it or permanently delete your account whenever you like.' },
    { q:'Do I have to log every single paper?', a:'No. Even a handful of papers gives you a grade trajectory and shows your weakest topics. Log as much or as little as you want.' },
    { q:'I do GCSEs - does it work for me?', a:'Yes. Choose GCSE at sign-up and everything switches to the 9–1 grade scale and GCSE papers.' },
  ];

  return (
    <div style={{minHeight:'100vh', background:C.bg, fontFamily:font, color:C.text}}>
      {showTerms && <TermsOfService onClose={()=>setShowTerms(false)}/>}

      {/* ── Gallery sheet (own presentation palette) ───────────────────── */}
      {showGallery && (()=>{
        // Distinct, focused "presentation" scheme - warm charcoal so the live
        // cream cards and diagrams pop. Cards inside stay on the light palette.
        const G = { bg:'#211b16', head:'rgba(33,27,22,0.86)', panel:'#2b231c', border:'#3c332a',
          text:'#f5eee2', muted:'#bcb1a0', subtle:'#8d8273', accent:'#e0966c' };
        const total = MARKER_SAMPLES.length;
        const s = MARKER_SAMPLES[slide];
        const go = (d) => setSlide((slide + d + total) % total);
        return (
        <div style={{position:'fixed', inset:0, zIndex:300, background:G.bg, overflowY:'auto', fontFamily:font}}>
          {/* sticky header */}
          <div style={{position:'sticky', top:0, zIndex:5, background:G.head, backdropFilter:'blur(16px)',
            WebkitBackdropFilter:'blur(16px)', borderBottom:`1px solid ${G.border}`, height:56,
            display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px'}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <CapsMark size={26}/>
              <span style={{fontFamily:display, fontSize:16, fontWeight:700, color:G.text}}>Gallery</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <button onClick={()=>{setShowGallery(false); onGetStarted();}}
                style={{padding:'7px 15px', background:G.accent, border:'none', borderRadius:6, color:'#241a12',
                  fontSize:13, fontWeight:800, fontFamily:font, cursor:'pointer'}}>Get started free</button>
              <button onClick={()=>setShowGallery(false)} aria-label="Close gallery"
                style={{width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center',
                  background:'transparent', border:`1px solid ${G.border}`, borderRadius:8, color:G.muted,
                  fontSize:18, cursor:'pointer', lineHeight:1}}>✕</button>
            </div>
          </div>

          <div style={{maxWidth:1100, margin:'0 auto', padding:'40px 20px 100px'}}>
            {/* intro */}
            <div style={{textAlign:'center', maxWidth:680, margin:'0 auto 26px'}}>
              <div style={{...type.eyebrow, color:G.accent, marginBottom:12}}>The AI marker · real output</div>
              <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.6vw, 40px)', color:G.text,
                margin:'0 0 12px', letterSpacing:'-0.03em'}}>
                You get it wrong. Caps shows you right - in full.
              </h2>
              <p style={{fontSize:15.5, color:G.muted, margin:0, lineHeight:1.6}}>
                A hard past-paper question from each subject - the answer students actually write, then Caps
                re-working it step by step. Rendered live: real LaTeX, diagrams, networks and code.
              </p>
            </div>

            {/* subject selector chips */}
            <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:7, marginBottom:18}}>
              {MARKER_SAMPLES.map((m,i)=>(
                <button key={m.tab} onClick={()=>setSlide(i)}
                  style={{padding:'7px 13px', borderRadius:999, cursor:'pointer', fontFamily:font, fontSize:12.5, fontWeight:700,
                    border:`1px solid ${slide===i?G.accent:G.border}`,
                    background:slide===i?G.accent:'transparent', color:slide===i?'#241a12':G.muted, transition:'all 0.12s'}}>
                  {m.tab}
                </button>
              ))}
            </div>

            {/* slideshow: one card at a time */}
            <div style={{display:'flex', justifyContent:'center'}}>
              <div style={{flex:1, maxWidth:880, minWidth:0}}>{renderMarkerCard(s)}</div>
            </div>

            {/* controls: prev / dots / next */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:20}}>
              <button onClick={()=>go(-1)} aria-label="Previous"
                style={{width:40, height:40, borderRadius:'50%', border:`1px solid ${G.border}`, background:G.panel,
                  color:G.text, fontSize:20, cursor:'pointer', lineHeight:1}}>‹</button>
              <div style={{display:'flex', alignItems:'center', gap:7}}>
                {MARKER_SAMPLES.map((m,i)=>(
                  <button key={i} onClick={()=>setSlide(i)} aria-label={m.tab}
                    style={{width:slide===i?22:8, height:8, borderRadius:999, border:'none', cursor:'pointer',
                      background:slide===i?G.accent:G.border, transition:'all 0.2s'}}/>
                ))}
              </div>
              <button onClick={()=>go(1)} aria-label="Next"
                style={{width:40, height:40, borderRadius:'50%', border:`1px solid ${G.border}`, background:G.panel,
                  color:G.text, fontSize:20, cursor:'pointer', lineHeight:1}}>›</button>
            </div>
            <div style={{textAlign:'center', marginTop:10, fontSize:12, color:G.subtle, fontFamily:mono}}>
              {slide+1} / {total} · {s.subject}
            </div>

            {/* everything else */}
            <div style={{textAlign:'center', maxWidth:680, margin:'74px auto 26px'}}>
              <div style={{...type.eyebrow, color:G.accent, marginBottom:12}}>Everything else it does</div>
              <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(24px, 3.2vw, 36px)', color:G.text,
                margin:'0 0 12px', letterSpacing:'-0.03em'}}>
                The whole revision picture, in one place.
              </h2>
              <p style={{fontSize:15, color:G.muted, margin:0, lineHeight:1.6}}>
                Marking is one piece. Battle Plan also shows where your grades are heading, tracks every paper,
                times your focus, and puts Caps on tap.
              </p>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:16}}>
              {APP_SHOTS.map(shot=>(
                <div key={shot.title} style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
                  overflow:'hidden', boxShadow:'0 20px 50px rgba(10,6,3,0.4)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:7, padding:'11px 14px', borderBottom:`1px solid ${C.border}`, background:C.card2}}>
                    {['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{width:9, height:9, borderRadius:'50%', background:c}}/>)}
                    <span style={{marginLeft:6, fontSize:10.5, fontWeight:800, color:C.accent, textTransform:'uppercase', letterSpacing:0.5}}>{shot.tag}</span>
                  </div>
                  <div style={{padding:'16px 16px 18px'}}>
                    <div style={{fontSize:15, fontWeight:800, color:C.text, marginBottom:4}}>{shot.title}</div>
                    <div style={{fontSize:12.5, color:C.muted, lineHeight:1.55, marginBottom:14}}>{shot.desc}</div>
                    {shot.render()}
                  </div>
                </div>
              ))}
            </div>

            {/* footer CTA */}
            <div style={{display:'flex', gap:12, marginTop:48, flexWrap:'wrap', alignItems:'center', justifyContent:'center'}}>
              <button onClick={()=>{setShowGallery(false); onGetStarted();}}
                style={{padding:'14px 28px', background:G.accent, border:'none', borderRadius:8, color:'#241a12',
                  fontSize:15, fontWeight:800, fontFamily:font, cursor:'pointer'}}>
                Mark your first paper free
              </button>
              <span style={{fontSize:13.5, color:G.muted}}>3 free marks to try it, then Commander for unlimited. Estimates for revision, not official marks.</span>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Nav */}
      <nav style={{position:'fixed', top:0, left:0, right:0, zIndex:100,
        background:C.nav, backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)', borderBottom:`1px solid ${C.border}`,
        height:56, display:'flex', alignItems:'center', padding:'0 24px',
        justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <CapsMark size={30}/>
          <span style={{fontFamily:display, fontSize:17, fontWeight:600, color:C.text, letterSpacing:'-0.01em'}}>Battle Plan</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <button onClick={()=>setShowGallery(true)}
            style={{display:'inline-flex', alignItems:'center', gap:7, padding:'7px 14px', background:C.accent,
              border:`1px solid ${C.accent}`, borderRadius:6, color:'#fff', fontSize:13, fontWeight:700,
              fontFamily:font, cursor:'pointer'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            Gallery
          </button>
          <button onClick={onGetStarted}
            style={{padding:'7px 15px', background:'transparent', border:`1px solid ${C.border}`,
              borderRadius:6, color:C.muted, fontSize:13, fontWeight:500,
              fontFamily:font, cursor:'pointer'}}>
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero - minimal, centred, type-led */}
      <section>
        <div style={{maxWidth:820, margin:'0 auto', padding:'132px 24px 0', textAlign:'center'}}>
          <div style={{display:'inline-flex', alignItems:'center', gap:8, padding:'5px 13px',
            borderRadius:999, border:`1px solid ${C.border}`, background:C.surface, marginBottom:28}}>
            <span style={{width:6, height:6, borderRadius:'50%', background:C.accent}}/>
            <span style={{...type.caption, color:C.muted}}>Free · A-Levels &amp; GCSEs</span>
          </div>
          <h1 style={{fontFamily:display, fontWeight:700, fontSize:'clamp(44px, 7.4vw, 78px)',
            color:C.text, margin:'0 0 22px', letterSpacing:'-0.04em', lineHeight:0.98}}>
            Stop guessing.<br/>Know your <span style={{color:C.accent}}>real grade.</span>
          </h1>
          <p style={{...type.body, fontSize:'clamp(17px, 1.9vw, 21px)', color:C.muted, margin:'0 auto 36px', maxWidth:530, lineHeight:1.5}}>
            Log one past paper and instantly see your real grade, your weakest topics, and exactly
            what to revise next. Free for every A-Level and GCSE student.
          </p>
          <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}}>
            <button onClick={onGetStarted}
              style={{display:'inline-flex', alignItems:'center', gap:8, padding:'12px 22px',
                background:C.accent, border:'none', borderRadius:8, color:'#fff',
                fontSize:14, fontWeight:600, fontFamily:font, cursor:'pointer'}}>
              Get started - it's free
            </button>
            <button onClick={onGetStarted}
              style={{display:'inline-flex', alignItems:'center', padding:'12px 20px',
                background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
                fontSize:14, fontWeight:600, fontFamily:font, cursor:'pointer'}}>
              Sign in
            </button>
          </div>
        </div>

        {/* Windowed product shot */}
        <div style={{position:'relative', maxWidth:960, margin:'56px auto 0', padding:'0 24px'}}>
          <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:'14px 14px 0 0',
            boxShadow:'0 30px 80px rgba(40,30,18,0.14)', overflow:'hidden'}}>
            <div style={{display:'flex', alignItems:'center', gap:7, padding:'11px 14px',
              borderBottom:`1px solid ${C.border}`, background:C.card2}}>
              {['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{width:11, height:11, borderRadius:'50%', background:c}}/>)}
              <div style={{flex:1, textAlign:'center'}}>
                <span style={{fontSize:11, color:C.subtle, fontFamily:mono}}>beattheexam.org</span>
              </div>
              <span style={{width:40}}/>
            </div>
            <div style={{padding:'20px 22px'}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14}}>
                {[['Avg score','78%'],['Papers logged','24'],['Battle readiness','74']].map(([l,v])=>(
                  <div key={l} style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'left'}}>
                    <div style={{fontSize:11, color:C.subtle, marginBottom:7}}>{l}</div>
                    <div style={{fontSize:23, fontWeight:800, color:l==='Battle readiness'?C.accent:C.text, fontFamily:mono, letterSpacing:'-0.02em', lineHeight:1}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'4px 16px'}}>
                {[['Further Maths','A*',86,'12,34,28,44,40,58'],
                  ['Chemistry','A',71,'30,36,22,40,34,48'],
                  ['Computer Science','A*',79,'20,26,30,28,42,52']].map(([n,g,v,pts],i)=>(
                  <div key={n} style={{display:'flex', alignItems:'center', gap:14, padding:'13px 0', borderTop:i?`1px solid ${C.border}`:'none'}}>
                    <span style={{width:7, height:7, borderRadius:'50%', background:C.subtle, flexShrink:0}}/>
                    <span style={{flex:1, minWidth:0, fontSize:13.5, color:C.text, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{n}</span>
                    <svg width="72" height="22" viewBox="0 0 72 22" style={{flexShrink:0}}>
                      <polyline points={String(pts).split(',').map((y,j)=>`${j*14},${22-(+y/60)*22}`).join(' ')}
                        fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{fontSize:12, fontWeight:800, color:gradeColor(g), width:24, textAlign:'center'}}>{g}</span>
                    <span style={{fontSize:12, fontWeight:600, color:C.muted, width:34, textAlign:'right', fontFamily:mono}}>{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery teaser - opens the full Gallery sheet */}
      <section style={{borderTop:`1px solid ${C.border}`, background:C.surface, marginTop:64}}>
        <div style={{maxWidth:920, margin:'0 auto', padding:'68px 24px', textAlign:'center'}}>
          <div style={{...type.eyebrow, color:C.accent, marginBottom:12}}>See it in action</div>
          <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.6vw, 42px)', color:C.text,
            margin:'0 0 14px', letterSpacing:'-0.03em'}}>
            You get it wrong. Caps shows you right - in full.
          </h2>
          <p style={{...type.body, fontSize:16, color:C.muted, margin:'0 auto 22px', maxWidth:580, lineHeight:1.6}}>
            A hard question from every subject - Further Mechanics, Decision Simplex, complex integrals and more -
            with the answer students actually write and Caps re-working it step by step. Plus a look at the analytics,
            tracker, timer and Caps chat.
          </p>
          <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, marginBottom:26}}>
            {['LaTeX maths','Curve & data charts','Decision networks','Code + traces','Mark-scheme points','Essay AO levels'].map(t=>(
              <span key={t} style={{fontSize:12, fontWeight:600, color:C.muted, background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:999, padding:'5px 12px'}}>{t}</span>
            ))}
          </div>
          <button onClick={()=>setShowGallery(true)}
            style={{display:'inline-flex', alignItems:'center', gap:9, padding:'13px 26px', background:C.accent,
              border:'none', borderRadius:8, color:'#fff', fontSize:15, fontWeight:700, fontFamily:font, cursor:'pointer'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            Open the gallery
          </button>
        </div>
      </section>

      {/* Boards strip */}
      <section style={{maxWidth:1100, margin:'0 auto', padding:'44px 24px 8px', textAlign:'center'}}>
        <div style={{...type.eyebrow, color:C.subtle, marginBottom:16}}>Built for every major UK exam board</div>
        <div style={{display:'flex', gap:'14px 40px', justifyContent:'center', flexWrap:'wrap'}}>
          {['AQA','Edexcel','OCR','WJEC','Eduqas'].map(b=>(
            <span key={b} style={{fontSize:'clamp(16px,2.4vw,22px)', fontWeight:800, color:C.muted, letterSpacing:'-0.01em', opacity:0.8}}>{b}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{borderTop:`1px solid ${C.border}`, background:C.surface}}>
        <div style={{maxWidth:1100, margin:'0 auto', padding:'64px 24px'}}>
          <div style={{...type.eyebrow, color:C.accent, marginBottom:10}}>How it works</div>
          <h2 style={{...type.h2, fontSize:'clamp(24px, 3vw, 32px)', color:C.text, margin:'0 0 36px', maxWidth:560}}>
            From "I think I'm fine" to knowing exactly where you stand.
          </h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'28px 40px'}}>
            {STEPS.map(s => (
              <div key={s.n}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                  <div style={{width:30, height:30, borderRadius:8, border:`1px solid ${C.accent}`,
                    color:C.accent, display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:mono, fontWeight:700, fontSize:14}}>{s.n}</div>
                  <div style={{...type.h3, color:C.text}}>{s.title}</div>
                </div>
                <p style={{...type.body, fontSize:14, color:C.muted, margin:0}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - minimal uniform grid with hairline dividers */}
      <section style={{maxWidth:1080, margin:'0 auto', padding:'104px 24px'}}>
        <div style={{...type.eyebrow, color:C.subtle, marginBottom:14}}>Features</div>
        <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.4vw, 40px)', color:C.text,
          margin:'0 0 44px', letterSpacing:'-0.03em', maxWidth:540}}>
          Everything you need to walk in ready.
        </h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
          gap:1, background:C.border, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden'}}>
          {FEATURES.map(f => (
            <div key={f.title} style={{background:C.surface, padding:'30px 28px'}}>
              <div style={{width:38, height:38, borderRadius:10, background:`${C.accent}14`, color:C.accent,
                display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18}}>{f.icon}</div>
              <div style={{...type.h3, color:C.text, marginBottom:8}}>{f.title}</div>
              <div style={{...type.body, fontSize:14, color:C.muted, lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section style={{borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1080, margin:'0 auto', padding:'104px 24px'}}>
          <div style={{...type.eyebrow, color:C.subtle, marginBottom:14}}>Why you can trust it</div>
          <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.4vw, 40px)', color:C.text,
            margin:'0 0 44px', letterSpacing:'-0.03em', maxWidth:540}}>
            No gimmicks. An honest tool for your grades.
          </h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'36px 48px'}}>
            {TRUST.map(t => (
              <div key={t.title}>
                <div style={{...type.h3, fontSize:15, color:C.text, marginBottom:8}}>{t.title}</div>
                <div style={{...type.body, fontSize:14, color:C.muted, lineHeight:1.6}}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div style={{...type.body, fontSize:15, color:C.muted, marginTop:48, maxWidth:600, lineHeight:1.7,
            paddingTop:32, borderTop:`1px solid ${C.border}`}}>
            <span style={{color:C.text, fontWeight:600}}>Made by a student who just sat their A-Levels</span> - built out of
            frustration with revision that felt busy but not effective, and shaped around what actually moves a grade.
          </div>
        </div>
      </section>

      {/* Plans */}
      <section style={{borderTop:`1px solid ${C.border}`, background:C.surface}}>
        <div style={{maxWidth:1080, margin:'0 auto', padding:'104px 24px'}}>
          <div style={{...type.eyebrow, color:C.accent, marginBottom:10}}>Plans</div>
          <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.4vw, 40px)', color:C.text,
            margin:'0 0 12px', letterSpacing:'-0.03em', maxWidth:560}}>
            Free to start. Upgrade only if you want more.
          </h2>
          <p style={{...type.body, fontSize:15, color:C.muted, margin:'0 0 40px', maxWidth:520, lineHeight:1.6}}>
            Everyone starts as a <strong style={{color:C.text}}>Recruit</strong> - free, forever. Go{' '}
            <strong style={{color:C.accent}}>Commander</strong> when you want generous AI marking and your companion on tap.
          </p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16}}>
            {[RANKS.recruit, RANKS.commander].map(r => {
              const isCmd = r.id==='commander';
              return (
                <div key={r.id} style={{display:'flex', flexDirection:'column', padding:'28px 26px',
                  background: isCmd ? 'linear-gradient(160deg,#fff8ec,#fbf7ef)' : C.bg,
                  border:`1.5px solid ${isCmd ? C.accent+'66' : C.border}`, borderRadius:16}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
                    <span style={{fontFamily:display, fontSize:22, fontWeight:700, color:C.text, letterSpacing:'-0.02em'}}>{r.name}</span>
                    {isCmd && <span style={{fontSize:10, fontWeight:800, color:'#c2802e', background:'#c2802e1c',
                      border:'1px solid #c2802e44', borderRadius:5, padding:'3px 8px', letterSpacing:0.5}}>PRO</span>}
                  </div>
                  <div style={{...type.body, fontSize:13, color:C.muted, marginBottom:12}}>{r.tag}</div>
                  <div style={{fontFamily:display, fontSize:30, fontWeight:800, color:isCmd?C.accent:C.text, letterSpacing:'-0.02em', marginBottom:isCmd?4:16}}>{r.price}</div>
                  {isCmd && <div style={{fontSize:12.5, color:C.muted, marginBottom:16}}>or <strong style={{color:C.text}}>£69.99/year</strong> (about £5.83/mo, save ~£38)</div>}
                  <div style={{display:'flex', flexDirection:'column', gap:9, marginBottom:24, flex:1}}>
                    {r.perks.map(p => (
                      <div key={p} style={{display:'flex', alignItems:'flex-start', gap:9, ...type.body, fontSize:14, color:C.text}}>
                        <span style={{color:C.accent, fontWeight:800, flexShrink:0}}>✓</span>{p}
                      </div>
                    ))}
                  </div>
                  <button onClick={onGetStarted}
                    style={{width:'100%', padding:'12px', borderRadius:8, fontSize:14, fontWeight:600, fontFamily:font, cursor:'pointer',
                      background: isCmd ? C.accent : 'transparent', color: isCmd ? '#fff' : C.text,
                      border:`1px solid ${isCmd ? C.accent : C.border}`}}>
                    {isCmd ? 'Become a Commander' : 'Start free'}
                  </button>
                </div>
              );
            })}
          </div>
          <p style={{...type.body, fontSize:12, color:C.subtle, marginTop:18, lineHeight:1.6}}>
            Commander includes a 3-day free trial - cancel any time before it ends and you won't be charged. Or pay yearly (£69.99, about £5.83/mo). Switch ranks whenever you like.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1080, margin:'0 auto', padding:'104px 24px'}}>
          <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(26px, 3.4vw, 40px)', color:C.text,
            margin:'0 0 44px', letterSpacing:'-0.03em'}}>
            Questions, answered.
          </h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'0 56px'}}>
            {FAQ.map((f, i) => (
              <div key={f.q} style={{padding:'22px 0', borderTop:i<2 ? 'none' : `1px solid ${C.border}`}}>
                <div style={{...type.h3, fontSize:15, color:C.text, marginBottom:8}}>{f.q}</div>
                <div style={{...type.body, fontSize:14, color:C.muted, lineHeight:1.6}}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1080, margin:'0 auto', padding:'96px 24px', textAlign:'center'}}>
          <h2 style={{fontFamily:display, fontWeight:600, fontSize:'clamp(28px, 3.6vw, 44px)', color:C.text,
            margin:'0 0 14px', letterSpacing:'-0.03em'}}>
            Your exams won't wait.
          </h2>
          <p style={{...type.body, fontSize:16, color:C.muted, margin:'0 auto 28px', maxWidth:440}}>
            Two-minute setup. Free to start as a Recruit. No card.
          </p>
          <div style={{display:'flex', justifyContent:'center'}}>
          <button onClick={onGetStarted}
            style={{display:'inline-flex', alignItems:'center', gap:8, padding:'14px 26px',
              background:C.accent, border:'none',
              borderRadius:6, color:'#fff', fontSize:15, fontWeight:600,
              fontFamily:font, cursor:'pointer', flexShrink:0}}>
            Get started - it's free
          </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1100, margin:'0 auto', padding:'28px 24px',
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:'14px 24px', flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:9}}>
            <CapsMark size={24}/>
            <span style={{...type.caption, color:C.subtle}}>Battle Plan · AQA · Edexcel · OCR · WJEC</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:18, flexWrap:'wrap'}}>
            <a href="/terms" style={{color:C.muted, fontSize:13, textDecoration:'none'}}>Terms</a>
            <a href="/privacy" style={{color:C.muted, fontSize:13, textDecoration:'none'}}>Privacy</a>
            <a href="mailto:51r4h100@gmail.com" style={{color:C.muted, fontSize:13, textDecoration:'none'}}>Contact</a>
          </div>
        </div>
        <div style={{maxWidth:1100, margin:'0 auto', padding:'0 24px 28px'}}>
          <p style={{fontSize:11, color:C.subtle, lineHeight:1.6, margin:0, maxWidth:760}}>
            Battle Plan is an independent revision tool and is not affiliated with, endorsed by, or connected to AQA,
            Pearson Edexcel, OCR, WJEC/Eduqas or any other exam board. Exam board names and trademarks are the property
            of their respective owners and are used for identification only. Grade boundaries are indicative - always
            verify against the official board.
          </p>
        </div>
      </footer>

    </div>
  );
}

// ── Quick log modal ────────────────────────────────────────────────────────
