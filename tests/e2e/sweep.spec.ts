import { expect, type Locator, type Page, test } from '@playwright/test';

import { ATTACKS, collectErrors, GLOSSARY, LABS, LESSONS, seriousViolations } from './helpers';

// Every lesson, lab, attack and glossary page that ships, used the way a student uses them.

const TOP_LEVEL = ['/', '/learn', '/coverage', '/attacks', '/labs', '/challenges', '/library'];
const MAIN_PAGES = [...TOP_LEVEL, '/glossary', '/progress', '/settings', '/about'];
const DOMAINS = [...new Set(LESSONS.map((lesson) => lesson.domain))];
const ONE_LESSON_PER_AREA = DOMAINS.map(
  (domain) => `/learn/${LESSONS.find((l) => l.domain === domain)!.id.toLowerCase()}`,
);
const LAB_PAGES = LABS.map((lab) => `/labs/${lab.id}`);

const ROUTE_IDS: Record<string, Set<string>> = {
  learn: new Set(LESSONS.map((lesson) => lesson.id.toLowerCase())),
  labs: new Set(LABS.map((lab) => lab.id)),
  attacks: new Set(ATTACKS.map((attack) => attack.id)),
  glossary: new Set(GLOSSARY.map((term) => term.id)),
};
const SECTIONS = new Set(MAIN_PAGES.map((path) => path.slice(1)));

/** In-app links on the page whose route or item does not exist. */
async function deadLinks(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('a[href^="#/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  return [...new Set(hrefs)].filter((href) => {
    const [, section = '', id, ...rest] = href.slice(1).split(/[?#]/)[0]!.split('/');
    if (!SECTIONS.has(section) || rest.length > 0) return true;
    if (!id) return false;
    return !ROUTE_IDS[section]?.has(decodeURIComponent(id));
  });
}

// An HTML entity, a lab, lesson or glossary link, or a callout marker showing as plain text
// means some content skipped the renderer.
const RAW_MARKUP =
  /&(?:[a-z]{2,8}|#\d{2,5});|\]\((?:lab|lesson):|\[\[[a-z0-9-]+|\[!(?:NOTE|TIP|WARNING|ETHICS|IMPORTANT|CAUTION)\]/i;

/** The text a reader sees outside code samples. */
function prose(page: Page): Promise<string> {
  return page.locator('main').evaluate((main) => {
    const copy = main.cloneNode(true) as HTMLElement;
    copy
      .querySelectorAll('pre, code, kbd, samp, textarea, script, style')
      .forEach((el) => el.remove());
    return copy.textContent ?? '';
  });
}

/** Opens a page and waits until its lazy content (a lesson body, a lab) has loaded. */
async function open(page: Page, path: string) {
  await page.goto(`/#${path}`);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole('status', { name: /^Loading/ })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
}

// Quotes, markup, shell and path characters, a right-to-left override and an emoji.
const AWKWARD_INPUT = `' OR '1'='1 <b>"x"</b> $(id); ../../etc %00 ‮🙂`;

/** Raw markup in what the reader sees, quoted with a little context; none when clean. */
async function rawMarkup(page: Page): Promise<string | undefined> {
  const text = await prose(page);
  const match = RAW_MARKUP.exec(text);
  return match ? text.slice(Math.max(0, match.index - 40), match.index + 40) : undefined;
}

const CONTROLS = 'button:enabled, input[type="checkbox"]:enabled, input[type="radio"]:enabled';

/**
 * Types awkward input into every field, then presses every enabled button, checkbox and
 * radio once (each occurrence of a label counts separately), closing any dialog a press
 * opens. Returns the presses made and any raw markup a press revealed.
 */
async function pressEveryControl(page: Page, scope: Locator) {
  const fields = scope.locator(
    'input:not([type]), input[type="text"], input[type="search"], input[type="url"], textarea',
  );
  for (const field of await fields.all()) {
    if (await field.isEditable()) await field.fill(AWKWARD_INPUT).catch(() => undefined);
  }
  const pressed = new Set<string>();
  const revealed: string[] = [];
  for (let step = 0; step < 80; step++) {
    const seen = new Map<string, number>();
    let next: Locator | undefined;
    for (const control of await scope.locator(CONTROLS).filter({ visible: true }).all()) {
      const label = await control.evaluate((el) =>
        (
          el.getAttribute('aria-label') ??
          ((el as HTMLInputElement).labels?.[0] ?? el).textContent ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
      );
      const occurrence = (seen.get(label) ?? 0) + 1;
      seen.set(label, occurrence);
      const key = `${label} #${occurrence}`;
      if (pressed.has(key) || /^reset lab$/i.test(label)) continue;
      pressed.add(key);
      next = control;
      break;
    }
    if (!next) break;
    await next.click({ timeout: 2_000 }).catch(() => next.dispatchEvent('click'));
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
    const raw = await rawMarkup(page);
    if (raw) revealed.push(`after ${[...pressed].at(-1)}: ${raw}`);
  }
  return { presses: pressed.size, raw: revealed };
}

/** Opens every challenge and reveals each of its hints and its worked solution. */
async function revealEveryChallenge(side: Locator) {
  for (const card of await side.locator('article').all()) {
    const toggle = card.locator('button[aria-expanded]').first();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    const hint = card.getByRole('button', { name: /^Show hint/ });
    for (let shown = 0; shown < 10 && (await hint.count()); shown++) await hint.click();
    const solution = card.getByRole('button', { name: 'Reveal worked solution' });
    if (await solution.count()) await solution.click();
  }
}

/** Opens challenges in turn until one takes a typed answer; none when every one is a task. */
async function firstAnswerBox(side: Locator): Promise<Locator | undefined> {
  const cards = side.locator('article');
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    const toggle = card.locator('button[aria-expanded]').first();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
    const box = card.getByRole('textbox');
    if (await box.count()) return box.first();
  }
  return undefined;
}

test.beforeEach(async ({ page }) => {
  // Audit settled pages: an entrance animation caught mid-fade fails the contrast check.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const lesson of LESSONS) {
  test(`lesson ${lesson.id} renders, links correctly, takes its quiz and passes the audit`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await open(page, `/learn/${lesson.id.toLowerCase()}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lesson.title);
    expect(await rawMarkup(page), 'raw markup').toBeFalsy();
    expect(await deadLinks(page), 'dead links').toEqual([]);

    if (lesson.quizLength > 0) {
      const quiz = page.getByRole('region', { name: 'Check your understanding' });
      const questions = quiz.getByRole('group');
      await expect(questions).toHaveCount(lesson.quizLength);
      for (const question of await questions.all()) {
        await question.getByRole('radio').first().check();
      }
      await quiz.getByRole('button', { name: 'Check my answers' }).click();
      await expect(quiz.getByRole('status')).toBeVisible();
    }

    expect(await seriousViolations(page), 'serious or critical axe violations').toEqual([]);
    expect(errors, 'console errors').toEqual([]);
  });
}

for (const lab of LABS) {
  test(`the ${lab.id} lab survives every control, refuses a wrong answer and passes the audit`, async ({
    page,
  }) => {
    test.slow();
    const errors = collectErrors(page);
    await open(page, `/labs/${lab.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lab.title);
    await expect(page.getByText(/being built/i)).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(await seriousViolations(page), 'serious or critical axe violations').toEqual([]);
    expect(await deadLinks(page), 'dead links').toEqual([]);
    expect(await rawMarkup(page), 'raw markup in the guide').toBeFalsy();

    const side = page.getByTestId('side');
    await side.getByRole('tab', { name: /Challenges/ }).click();
    const answer = await firstAnswerBox(side);
    if (answer) {
      await answer.fill('not the answer');
      await answer.press('Enter');
      await expect(side.getByText('Not quite. Check the evidence and try again.')).toBeVisible();
    }
    await revealEveryChallenge(side);
    expect(await rawMarkup(page), 'raw markup in the hints or solutions').toBeFalsy();
    expect(await deadLinks(page), 'dead links in the challenges').toEqual([]);

    const { presses, raw } = await pressEveryControl(page, page.getByTestId('main'));
    expect(presses).toBeGreaterThan(0);
    expect(raw, 'raw markup in the workspace').toEqual([]);
    await page.waitForTimeout(500);
    // Still the lab, not the error screen.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lab.title);
    expect(errors, 'console errors').toEqual([]);
  });
}

/** Splits a list into runs of `size`, one test each, so a failure names a short range. */
function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

for (const attacks of chunks(ATTACKS, 50)) {
  test(`attack pages ${attacks[0]!.id} to ${attacks.at(-1)!.id} render with working links`, async ({
    page,
  }) => {
    test.slow();
    const errors = collectErrors(page);
    for (const attack of attacks) {
      await page.goto(`/#/attacks/${attack.id}`);
      await expect(page.getByRole('heading', { level: 1 }), attack.id).toHaveText(attack.name);
      expect(await deadLinks(page), `${attack.id} dead links`).toEqual([]);
    }
    expect(errors, 'console errors').toEqual([]);
  });
}

for (const terms of chunks(GLOSSARY, 160)) {
  test(`glossary pages ${terms[0]!.id} to ${terms.at(-1)!.id} render with working links`, async ({
    page,
  }) => {
    test.slow();
    const errors = collectErrors(page);
    for (const term of terms) {
      await page.goto(`/#/glossary/${term.id}`);
      await expect(page.getByRole('heading', { level: 1 }), term.id).toHaveText(term.term);
      expect(await deadLinks(page), `${term.id} dead links`).toEqual([]);
    }
    expect(errors, 'console errors').toEqual([]);
  });
}

test.describe('in the light theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('cyberlab:settings:v1', JSON.stringify({ theme: 'light' })),
    );
  });

  for (const path of [...MAIN_PAGES, ...ONE_LESSON_PER_AREA, ...LAB_PAGES]) {
    test(`${path} passes the audit`, async ({ page }) => {
      const errors = collectErrors(page);
      await open(page, path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.waitForTimeout(300);
      expect(await seriousViolations(page), 'serious or critical axe violations').toEqual([]);
      expect(errors, 'console errors').toEqual([]);
    });
  }
});

test.describe('at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of [...MAIN_PAGES, ...ONE_LESSON_PER_AREA, ...LAB_PAGES]) {
    test(`${path} fits the screen`, async ({ page }) => {
      const errors = collectErrors(page);
      await open(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
      expect(errors, 'console errors').toEqual([]);
    });
  }

  test('the menu opens and reaches every top-level page', async ({ page }) => {
    await page.goto('/#/');
    for (const path of TOP_LEVEL.slice(1)) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const menu = page.getByRole('dialog', { name: 'Navigation' });
      await menu.locator(`a[href="#${path}"]`).click();
      await expect(menu).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`#${path}$`));
    }
  });
});
