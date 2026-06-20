// Rasterise the Caps capybara badge (public/pwa-icon.svg) into the PNG app
// icons iOS/Windows need. Run: node scripts/gen-icons.mjs
//
// The source SVG is a ROUNDED square (transparent outside the corners) so the
// installed icon reads as a soft rounded badge (Teams-style) on Windows/Android
// and in the browser tab. iOS, however, fills a transparent apple-touch icon
// with black and applies its own squircle mask — so for THAT one icon we flatten
// the corners onto the terracotta so it stays clean and lets iOS do the rounding.
import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/pwa-icon.svg');

// Rounded (transparent corners) — Windows / Android / favicons.
const rounded = [
  ['public/favicon-64.png', 64],
  ['public/favicon-32.png', 32],
  ['public/pwa-192.png', 192],
  ['public/pwa-512.png', 512],
];
for (const [file, size] of rounded) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(file);
  console.log('wrote', file, size + 'px (rounded)');
}

// Apple touch — opaque square; iOS applies its own rounding.
await sharp(svg, { density: 512 })
  .resize(180, 180)
  .flatten({ background: '#b5735a' })
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('wrote public/apple-touch-icon.png 180px (opaque, iOS rounds)');
