// Caps — the canonical capybara brand mark.
// A simplified head silhouette (flat-topped rounded head, small ears, blunt
// muzzle, calm eyes) that stays legible from 16px (favicon) up to hero size.
// The in-app CompanionAvatar is the detailed, user-customisable character; THIS
// is the fixed, official logo. Recoloured to the brand terracotta so it reads as
// one mark on both light and dark surfaces.
export default function CapsMark({ size = 28, style, title = 'Battle Plan' }) {
  const coat = '#b5735a', ear = '#9a5e47', muzzle = '#e2bba6', ink = '#33241a';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} style={style}>
      {/* ears (behind head) */}
      <ellipse cx="17" cy="16" rx="7.5" ry="7" fill={coat}/>
      <ellipse cx="47" cy="16" rx="7.5" ry="7" fill={coat}/>
      <ellipse cx="17" cy="17.5" rx="3.2" ry="3" fill={ear} opacity="0.55"/>
      <ellipse cx="47" cy="17.5" rx="3.2" ry="3" fill={ear} opacity="0.55"/>
      {/* head — flat-topped rounded rectangle */}
      <path d="M7 31 Q7 14 23 14 L41 14 Q57 14 57 31 L57 41 Q57 56 41 56 L23 56 Q7 56 7 41 Z" fill={coat}/>
      {/* muzzle */}
      <ellipse cx="32" cy="45" rx="18" ry="9.5" fill={muzzle} opacity="0.92"/>
      {/* eyes */}
      <ellipse cx="23" cy="33" rx="3.6" ry="4.1" fill={ink}/>
      <ellipse cx="41" cy="33" rx="3.6" ry="4.1" fill={ink}/>
      {/* nose */}
      <ellipse cx="32" cy="46" rx="5.2" ry="3.4" fill={ink}/>
    </svg>
  );
}
