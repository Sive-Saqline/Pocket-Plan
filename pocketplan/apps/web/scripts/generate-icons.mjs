// Regenerates the PNG app icons from the logo artwork.
// Run from apps/web:  node scripts/generate-icons.mjs
// Uses sharp, which Next.js installs for image optimisation.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const ACCENT = "#1F7A8C";
const INK = "#FFFFFF";
const strokes = `<g fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 9h16v9c0 4.5-3.6 7-8 8-4.4-1-8-3.5-8-8z"/><path d="M8 9l8 4.5L24 9"/><path d="M12.5 19.5l2.5 2.2 4.5-4.7"/></g>`;

// Rounded tile, as used in the app and browser tab.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${ACCENT}"/>${strokes}</svg>`;

// Full-bleed square for iOS and maskable icons: the OS applies its own mask,
// so the artwork is shrunk into the central safe zone.
const square = (scale) => {
  const offset = (32 - 32 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${ACCENT}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${strokes}</g></svg>`;
};

const out = [
  ["public/icons/icon-192.png", rounded, 192],
  ["public/icons/icon-512.png", rounded, 512],
  ["public/icons/icon-maskable-512.png", square(0.7), 512],
  ["src/app/apple-icon.png", square(0.85), 180],
];

await mkdir("public/icons", { recursive: true });
for (const [file, svg, size] of out) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 32 }).resize(size, size).png().toFile(file);
  console.log(`wrote ${file} (${size}x${size})`);
}
