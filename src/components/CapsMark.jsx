// Caps — the canonical capybara brand mark.
// A fuller, simplified head silhouette (chunky flat-topped head, round ears,
// blunt muzzle, calm eyes) that stays legible from 16px (favicon) up to hero
// size. The in-app CompanionAvatar is the detailed, user-customisable character;
// THIS is the fixed, official logo, in brand terracotta.
export default function CapsMark({ size = 30, style, title = 'Battle Plan' }) {
  const coat = '#b5735a', ear = '#9a5e47', muzzle = '#e4bca7', ink = '#33241a';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} style={style}>
      {/* ears (behind head) */}
      <ellipse cx="16" cy="15" rx="8.5" ry="8" fill={coat}/>
      <ellipse cx="48" cy="15" rx="8.5" ry="8" fill={coat}/>
      <ellipse cx="16" cy="16.5" rx="3.8" ry="3.4" fill={ear} opacity="0.55"/>
      <ellipse cx="48" cy="16.5" rx="3.8" ry="3.4" fill={ear} opacity="0.55"/>
      {/* head — chunky flat-topped rounded rectangle */}
      <path d="M5 30 Q5 11 24 11 L40 11 Q59 11 59 30 L59 43 Q59 59 40 59 L24 59 Q5 59 5 43 Z" fill={coat}/>
      {/* muzzle */}
      <ellipse cx="32" cy="46" rx="20" ry="11" fill={muzzle} opacity="0.92"/>
      {/* eyes */}
      <ellipse cx="22" cy="32" rx="3.9" ry="4.5" fill={ink}/>
      <ellipse cx="42" cy="32" rx="3.9" ry="4.5" fill={ink}/>
      {/* nose */}
      <ellipse cx="32" cy="47" rx="5.8" ry="3.7" fill={ink}/>
    </svg>
  );
}
