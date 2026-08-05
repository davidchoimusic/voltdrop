#!/usr/bin/env node
// Ping IndexNow after publishing. Bing, Yandex, Seznam, and Naver share the
// endpoint; Bing is the one that matters here (it feeds Perplexity/ChatGPT).
// The key is deliberately public — the hosted key file IS the ownership proof.
//
// Usage:
//   node tools/indexnow-ping.mjs                 # ping every sitemap URL
//   node tools/indexnow-ping.mjs <url> [url ...] # ping specific URLs
//
// Run from the repo root AFTER the deploy is live (the endpoint fetches the
// key file from the live site to validate; pinging before deploy fails).

import { readFileSync, readdirSync } from 'node:fs';

const HOST = 'voltdrop.app';

const keyFile = readdirSync('.').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('No IndexNow key file (32-hex .txt) found at repo root.');
  process.exit(1);
}
const key = readFileSync(keyFile, 'utf8').trim();
if (key !== keyFile.replace(/\.txt$/, '')) {
  console.error(`Key file content does not match its filename: ${keyFile}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const urlList = args.length
  ? args
  : [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const foreign = urlList.filter((u) => !u.startsWith(`https://${HOST}/`));
if (foreign.length) {
  console.error(`Refusing to submit URLs off https://${HOST}/:`);
  for (const u of foreign) console.error('  ' + u);
  process.exit(1);
}
if (urlList.length === 0 || urlList.length > 10000) {
  console.error(`URL count ${urlList.length} outside IndexNow's 1..10000 per request.`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${keyFile}`,
    urlList,
  }),
});

console.log(`IndexNow: HTTP ${res.status} ${res.statusText} — submitted ${urlList.length} URL(s)`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text().catch(() => '(no body)'));
  process.exit(1);
}
