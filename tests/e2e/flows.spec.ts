import { expect, test } from '@playwright/test';

test('search finds a lesson by a word in its title and opens it', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = page.getByPlaceholder(/Search topics/);
  await expect(input).toBeFocused();
  await input.fill('security goals');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/learn\/fnd-01$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Security goals/);
});

test('a lesson records its quiz and completion on the progress page', async ({ page }) => {
  await page.goto('/#/learn/fnd-01');
  const quiz = page.getByRole('region', { name: 'Check your understanding' });
  await expect(quiz).toBeVisible();

  // Answer every question with its first choice, then check the answers.
  for (const group of await quiz.getByRole('group').all()) {
    await group.getByRole('radio').first().check();
  }
  await quiz.getByRole('button', { name: 'Check my answers' }).click();
  await expect(quiz.getByRole('status')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as complete' }).click();
  await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible();

  await page.goto('/#/progress');
  await expect(page.getByText('Lessons completed')).toBeVisible();
  await expect(page.getByRole('link', { name: /Security goals and properties/ })).toBeVisible();
});

test('the coverage map recolors by lens and shows a topic on hover', async ({ page }) => {
  await page.goto('/#/coverage');
  await page.getByRole('radio', { name: 'Readings' }).click();
  await expect(page.getByRole('radio', { name: 'Readings' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('link', { name: /^WEB-01 / }).hover();
  await expect(page.getByRole('complementary', { name: 'Topic details' })).toContainText('WEB-01');
});

test('a glossary term in a lesson previews its definition', async ({ page }) => {
  await page.goto('/#/learn/fnd-01');
  const term = page.locator('article button[aria-haspopup="dialog"]').first();
  await term.click();
  await expect(page.getByRole('dialog')).toContainText(/Open in glossary/);
});
