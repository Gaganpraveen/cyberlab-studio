#!/usr/bin/env node
/**
 * Rebuild every desktop app icon from src-tauri/app-icon.svg:
 * render it to a 1024 x 1024 PNG with a transparent background, run
 * `tauri icon` on it, and drop the mobile sizes the desktop app doesn't use.
 *
 *   npm run desktop:icons
 *
 * Uses Playwright's Chromium. Set CHROMIUM_PATH to use a specific binary.
 */
import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const icons = `${root}src-tauri/icons`;
const svg = await readFile(`${root}src-tauri/app-icon.svg`, 'utf8');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page
  .locator('svg')
  .screenshot({ path: `${root}src-tauri/app-icon.png`, omitBackground: true });
await browser.close();

execFileSync('npx', ['tauri', 'icon', 'src-tauri/app-icon.png', '--output', icons], {
  cwd: root,
  stdio: 'inherit',
});
for (const extra of ['android', 'ios', 'StoreLogo.png']) {
  await rm(`${icons}/${extra}`, { recursive: true, force: true });
}
for (const size of [30, 44, 71, 89, 107, 142, 150, 284, 310]) {
  await rm(`${icons}/Square${size}x${size}Logo.png`, { force: true });
}
console.log('Updated src-tauri/icons');
