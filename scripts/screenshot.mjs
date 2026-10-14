#!/usr/bin/env node
/**
 * Take a screenshot of a running dev server page and report console errors.
 *
 *   node scripts/screenshot.mjs <url> <out.png> [width=1440] [height=900] [theme=dark]
 *
 * Uses Playwright's Chromium. Set CHROMIUM_PATH to use a specific binary.
 */
import { chromium } from '@playwright/test';

const [url, out, width = '1440', height = '900', theme = 'dark'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/screenshot.mjs <url> <out.png> [width] [height] [theme]');
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  colorScheme: theme === 'light' ? 'light' : 'dark',
});
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
await page.addInitScript((t) => {
  localStorage.setItem('cyberlab:settings:v1', JSON.stringify({ theme: t }));
}, theme);
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(`saved ${out}`);
if (errors.length) {
  console.log(`console errors (${errors.length}):`);
  for (const e of errors) console.log(' -', e);
} else {
  console.log('no console errors');
}
