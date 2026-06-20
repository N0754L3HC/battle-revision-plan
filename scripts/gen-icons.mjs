// Rasterise the Caps capybara badge (public/pwa-icon.svg) into the PNG app
// icons iOS/Windows need. Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/pwa-icon.svg');
const targets = [
  ['public/apple-touch-icon.png', 180],
  ['public/favicon-64.png', 64],
  ['public/favicon-32.png', 32],
  ['public/pwa-192.png', 192],
  ['public/pwa-512.png', 512],
];

for (const [file, size] of targets) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(file);
  console.log('wrote', file, size + 'px');
}
