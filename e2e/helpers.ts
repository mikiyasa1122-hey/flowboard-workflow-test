import { expect, type Locator, type Page } from '@playwright/test';

/** 初回起動時のサンプルタスク件数（src/domain/sampleData.ts） */
export const SAMPLE_COUNTS = { total: 5, todo: 2, doing: 2, done: 1 } as const;

export async function openApp(page: Page, hash = '#/board') {
  await page.goto(`./${hash}`);
  await expect(page.getByRole('status').filter({ hasText: '読み込み中' })).toHaveCount(0);
  if (hash === '#/board') await expect(page.getByTestId('column-todo')).toBeVisible();
}

export function column(page: Page, status: 'todo' | 'doing' | 'done') {
  return page.getByTestId(`column-${status}`);
}

export function cardTitle(scope: Page | Locator, title: string) {
  return scope.getByTestId('task-card').getByRole('button', { name: title, exact: true });
}

export async function createTask(
  page: Page,
  values: { title: string; description?: string; priority?: '低' | '中' | '高'; dueDate?: string; tags?: string },
) {
  await page.getByRole('button', { name: '新規タスク' }).click();
  const dialog = page.getByRole('dialog', { name: '新しいタスク' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('タイトル').fill(values.title);
  if (values.description) await dialog.getByLabel('説明').fill(values.description);
  if (values.priority) await dialog.getByLabel('優先度').selectOption({ label: values.priority });
  if (values.dueDate) await dialog.getByLabel('期限').fill(values.dueDate);
  if (values.tags) await dialog.getByLabel('タグ').fill(values.tags);
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog).toBeHidden();
}

export async function setStatus(page: Page, title: string, label: 'TODO' | 'DOING' | 'DONE') {
  await page.getByLabel(`「${title}」のステータス`).selectOption({ label });
}

/** 横スクロールが発生していないか */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, '横スクロールが発生しています').toBeLessThanOrEqual(0);
}
