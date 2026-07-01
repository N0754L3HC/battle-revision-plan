// ── Companion character ─────────────────────────────────────────────────────
// Caps the capybara SVG avatar. Standalone so the splash/root shell can show
// the mascot without importing the whole app chunk.
// Capybara coat palette - natural/light/golden/dark/chocolate/grey/sandy
export const CAPY_COATS    = ['#8B6240','#B08560','#C99363','#5A3F26','#3a2210','#8a8275','#a08068'];
export const OUTFIT_COLORS = ['#4a90d9','#e87c3e','#5cb85c','#9b59b6','#e74c3c','#2c3e50','#ec4899','#0ea5e9','#fbbf24'];

export default function CompanionAvatar({skin=0,outfitColor=0,accessory=0,mood='neutral',pose='idle',size=80}) {
  const COAT  = CAPY_COATS[skin]          ?? CAPY_COATS[0];
  const SCARF = OUTFIT_COLORS[outfitColor] ?? OUTFIT_COLORS[0];

  // Coat tint helpers - lighter for belly/muzzle, darker for shading
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

      {/* BACK LEGS - stubby cylinders peeking out behind body */}
      <ellipse cx="22" cy="132" rx="9"   ry="10"  fill={SHADOW}/>
      <ellipse cx="78" cy="132" rx="9"   ry="10"  fill={SHADOW}/>
      <ellipse cx="22" cy="140" rx="9"   ry="3.5" fill="#241608"/>
      <ellipse cx="78" cy="140" rx="9"   ry="3.5" fill="#241608"/>

      {/* BODY - chunky barrel */}
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

      {/* SCARF - wraps the neck between body + head */}
      <ellipse cx="50" cy="78" rx="34" ry="9" fill={SCARF}/>
      <ellipse cx="50" cy="76" rx="34" ry="2" fill={SCARFD} opacity="0.55"/>
      <path d="M68 84 Q80 96 74 110 L66 108 Q70 98 64 86 Z" fill={SCARF}/>
      <path d="M68 84 Q80 96 74 110" stroke={SCARFD} strokeWidth="0.7" fill="none" opacity="0.5"/>

      {/* EARS - tiny, on top corners of head, drawn before head so they tuck behind */}
      <ellipse cx="22" cy="18" rx="6" ry="5.5" fill={COAT}/>
      <ellipse cx="78" cy="18" rx="6" ry="5.5" fill={COAT}/>
      <ellipse cx="22" cy="20" rx="3" ry="2.5" fill={SHADOW} opacity="0.55"/>
      <ellipse cx="78" cy="20" rx="3" ry="2.5" fill={SHADOW} opacity="0.55"/>

      {/* HEAD - flat-topped rounded rectangle (capybara silhouette) */}
      <path d="M14 32 Q14 16 30 16 L70 16 Q86 16 86 32 L86 64 Q86 78 70 78 L30 78 Q14 78 14 64 Z" fill={COAT}/>
      {/* Top-of-head highlight */}
      <path d="M22 22 Q50 18 78 22" stroke={BELLY} strokeWidth="1" fill="none" opacity="0.45"/>

      {/* MUZZLE - wide lighter region across lower half */}
      <ellipse cx="50" cy="60" rx="30" ry="13" fill={MUZZLE} opacity="0.85"/>
      <ellipse cx="50" cy="72" rx="22" ry="3" fill="#000" opacity="0.06"/>

      {/* CHEEK BLUSH - only when happy/excited */}
      {(mood==='happy'||mood==='excited')&&(<>
        <ellipse cx="22" cy="58" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
        <ellipse cx="78" cy="58" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
      </>)}

      {/* BROWS - only on worried */}
      {mood==='worried'&&(<>
        <path d="M27 34 Q34 30 42 33" stroke={SHADOW} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M58 33 Q66 30 73 34" stroke={SHADOW} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      </>)}

      {/* EYES - small black dots with catchlight; excited = squinty, sleepy = closed */}
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

      {/* ACCESSORIES - round Harry-Potter glasses */}
      {accessory===1&&(<>
        <circle cx="34" cy="42" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <circle cx="66" cy="42" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2"/>
        <line x1="42" y1="42" x2="58" y2="42" stroke="#1a1a1a" strokeWidth="1.8"/>
        <line x1="14" y1="40" x2="26" y2="42" stroke="#1a1a1a" strokeWidth="1.6"/>
        <line x1="86" y1="40" x2="74" y2="42" stroke="#1a1a1a" strokeWidth="1.6"/>
      </>)}

      {/* Graduation cap - mortarboard with tassel */}
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

      {/* Headphones - band over ears + cans on the tiny ears */}
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

      {/* Flower - tucked behind one ear */}
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
