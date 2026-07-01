// ── Theme ──────────────────────────────────────────────────────────────────
// Shared design tokens for every entry point (app, landing, admin). Extracted
// from App.jsx so light chunks (landing, root shell) don't pull the whole app.
export const T = {
  // Palette synced to the Claude Design prototype (Battle Plan.dc.html).
  light: {
    bg:      '#f4eee3',
    surface: '#fbf7ef',
    nav:     'rgba(251,247,239,0.92)',
    border:  '#e7ddcc',
    card:    '#fbf7ef',
    card2:   '#efe7d8',
    shadow:  '0 1px 2px rgba(60,40,20,0.05), 0 8px 30px rgba(60,40,20,0.05)',
    text:    '#2b2620',
    muted:   '#6f665b',
    subtle:  '#a39a8c',
    accent:  '#b5735a',
    accentSoft: 'rgba(181,115,90,0.12)',
    tintCream:'#f4ecda', tintSage:'#e7eee4', tintSky:'#e3ecf2', tintTerra:'#f3e3da',
    success: '#4f7256', warn: '#b45309', danger: '#b91c1c',
  },
  dark: {
    bg:      '#1d1916',
    surface: '#272220',
    nav:     'rgba(29,25,22,0.92)',
    border:  '#39312b',
    card:    '#272220',
    card2:   '#2f2925',
    shadow:  '0 1px 2px rgba(0,0,0,0.3), 0 10px 34px rgba(0,0,0,0.34)',
    text:    '#f3ede3',
    muted:   '#b3a99c',
    subtle:  '#857c70',
    accent:  '#cf8568',
    accentSoft: 'rgba(207,133,104,0.15)',
    tintCream:'#322c23', tintSage:'#243029', tintSky:'#222e38', tintTerra:'#3a2b24',
    success: '#7fb389', warn: '#fbbf24', danger: '#f87171',
  },
};

// ── Type system ──────────────────────────────────────────────────────────────
// ONE font family across the entire app (Notion model). Hierarchy comes from
// size, weight and colour only - never a second typeface. This is what makes
// the UI read as a single owned system rather than an assembled template.
export const FONT_BODY    = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
export const FONT_DISPLAY = FONT_BODY;   // alias: same family, kept so callers needn't change
export const FONT_MONO    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

// Reusable text styles - spread into inline styles, override colour per use.
// Notion-tuned: bold-but-not-huge headings, calm 1.5 body, subtle eyebrows.
export const type = {
  display: { fontFamily:FONT_BODY, fontWeight:700, letterSpacing:'-0.022em', lineHeight:1.1 },
  h1:      { fontFamily:FONT_BODY, fontWeight:700, fontSize:27, letterSpacing:'-0.02em',  lineHeight:1.2 },
  h2:      { fontFamily:FONT_BODY, fontWeight:600, fontSize:19, letterSpacing:'-0.013em', lineHeight:1.25 },
  h3:      { fontFamily:FONT_BODY, fontWeight:600, fontSize:15, letterSpacing:'-0.006em', lineHeight:1.3 },
  body:    { fontFamily:FONT_BODY, fontWeight:400, fontSize:15, lineHeight:1.5 },
  caption: { fontFamily:FONT_BODY, fontWeight:400, fontSize:13, lineHeight:1.45 },
  eyebrow: { fontFamily:FONT_BODY, fontWeight:600, fontSize:11, letterSpacing:'0.05em', textTransform:'uppercase' },
};

// ── Utilities ──────────────────────────────────────────────────────────────
export const ls = {
  get:(k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } },
  set:(k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
  del:(k)    => { try { localStorage.removeItem(k); } catch {} },
};

// ── Animation styles ───────────────────────────────────────────────────────
export const ANIM_CSS=`
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
export function ensureAnimStyles(){if(!document.getElementById('rbp-anims')){const s=document.createElement('style');s.id='rbp-anims';s.textContent=ANIM_CSS;document.head.appendChild(s);}}

// Grade → colour (shared by app views and the landing mockups).
export function gradeColor(g) {
  return {
    'A*':'#22c55e', A:'#4ade80', B:'#fbbf24', C:'#fb923c', D:'#f87171', E:'#ef4444',
    '9':'#22c55e', '8':'#4ade80', '7':'#86efac', '6':'#fbbf24', '5':'#fb923c', '4':'#f87171', '3':'#ef4444', '2':'#dc2626', '1':'#b91c1c',
    U:'#71717a'
  }[g]??'#71717a';
}
