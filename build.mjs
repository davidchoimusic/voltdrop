// Generates the per-tool pages (own URLs for SEO) from index.html.
// Run after editing index.html: node build.mjs — then commit the outputs.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

// Cache-busting: stamp asset links with a content hash so Cloudflare's
// edge cache can never serve stale JS/CSS after a deploy. Idempotent —
// re-running with unchanged assets produces identical output.
const hash = (f) => createHash('md5').update(readFileSync(f)).digest('hex').slice(0, 10);
const cssV = hash('styles.css');
const jsV = hash('app.js');

let src = readFileSync('index.html', 'utf8')
  .replace(/\/styles\.css\?v=[A-Za-z0-9]+/, `/styles.css?v=${cssV}`)
  .replace(/\/app\.js\?v=[A-Za-z0-9]+/, `/app.js?v=${jsV}`);
writeFileSync('index.html', src);
console.log(`stamped assets: styles.css?v=${cssV} app.js?v=${jsV}`);

const PAGES = [
  {
    dir: 'wire-size-calculator',
    mode: 'size',
    title: 'Wire Size Calculator — what gauge wire do I need? | VoltDrop',
    description: 'Free wire size calculator: enter amps, voltage, and one-way distance to get the smallest copper or aluminum AWG that keeps voltage drop under 3%. Plain English, full math shown, no signup.',
  },
  {
    dir: 'max-wire-length',
    mode: 'length',
    title: 'Max Wire Length Calculator — how far can this wire run? | VoltDrop',
    description: 'Free max wire run calculator: enter wire size, amps, and voltage to get the longest one-way distance that stays under 3% or 5% voltage drop. Copper and aluminum, DC and AC, no signup.',
  },
];

for (const p of PAGES) {
  let html = src
    .replace(/<title>[^<]*<\/title>/, `<title>${p.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${p.description}$2`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://voltdrop.app/${p.dir}/">`)
    .replace('<body>', `<body data-mode="${p.mode}">`);
  if (!html.includes(`data-mode="${p.mode}"`)) throw new Error(`body stamp failed for ${p.dir}`);
  mkdirSync(p.dir, { recursive: true });
  writeFileSync(`${p.dir}/index.html`, html);
  console.log(`built ${p.dir}/index.html`);
}
