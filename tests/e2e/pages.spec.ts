import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { collectErrors, seriousViolations } from './helpers';

/** Every top-level page, plus one of each detail page. */
const PAGES = [
  { path: '/', heading: /Read the concept/ },
  { path: '/learn', heading: /The whole field, one map/ },
  { path: '/learn/fnd-01', heading: /Security goals and properties/ },
  { path: '/coverage', heading: /What the curriculum covers/ },
  { path: '/attacks', heading: /Every major attack/ },
  { path: '/attacks/sql-injection', heading: /SQL injection/i },
  { path: '/labs', heading: /Run the attack, then build the defense/ },
  { path: '/labs/homograph', heading: /Homograph/ },
  { path: '/challenges', heading: /Prove it in the lab/ },
  { path: '/library', heading: /Textbooks, standards and open references/ },
  { path: '/glossary', heading: /Every term, defined and linked/ },
  { path: '/progress', heading: /Your progress/ },
  { path: '/settings', heading: /Make it comfortable/ },
  { path: '/about', heading: /An open studio/ },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders without errors or serious accessibility issues`, async ({ page }) => {
    const errors = collectErrors(page);
    // Audit the settled page: a looping demo or an entrance animation caught
    // mid-fade fails the contrast check at random. The pause test below covers
    // the home page with motion on.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#${path}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    // A finished page never falls back to placeholder copy.
    await expect(page.getByText(/Coming together/)).toHaveCount(0);
    if (path.startsWith('/labs/')) await expect(page.getByText(/being built/i)).toHaveCount(0);
    // Let lazy chunks, fonts and entrance animations settle before auditing.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    expect(await seriousViolations(page), 'serious or critical axe violations').toEqual([]);
    expect(errors, 'console errors').toEqual([]);
  });
}

test('the home page demo can be paused, and passes the audit with motion on', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Pause demo' }).click();
  await expect(page.getByRole('button', { name: 'Play demo' })).toBeVisible();
  // Let a fade that was running when the demo stopped finish.
  await page.waitForTimeout(400);
  expect(await seriousViolations(page)).toEqual([]);
});

test('the light theme passes the same audit on a lesson', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('cyberlab:settings:v1', JSON.stringify({ theme: 'light' })),
  );
  await page.goto('/#/learn/fnd-01');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(serious).toEqual([]);
});

test('an unknown address shows the not-found page', async ({ page }) => {
  await page.goto('/#/no-such-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/couldn.t find that page/);
  await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();
});
