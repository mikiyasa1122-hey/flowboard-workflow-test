import { test, expect } from './fixtures';
import { cardTitle, column, createTask, openApp, SAMPLE_COUNTS, setStatus } from './helpers';

test('初回オンラインアクセス後はオフラインで起動し、作成・編集・削除・保存ができる', async ({ page, context }) => {
  // 1回目: オンラインでアクセスし、Service Worker のインストール（プリキャッシュ）完了を待つ
  await openApp(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // PWA マニフェストが読み込まれている
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest$/);

  // オフラインにして再読み込み → Service Worker のキャッシュから起動する
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('column-todo')).toBeVisible();
  await expect(page.getByText('オフラインです。')).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // オフラインで作成・ステータス変更・編集
  await createTask(page, { title: 'オフラインで作成' });
  await setStatus(page, 'オフラインで作成', 'DOING');
  await expect(cardTitle(column(page, 'doing'), 'オフラインで作成')).toBeVisible();
  await cardTitle(page, 'オフラインで作成').click();
  const edit = page.getByRole('dialog', { name: 'タスクを編集' });
  await edit.getByLabel('タイトル').fill('オフラインで編集');
  await edit.getByRole('button', { name: '保存' }).click();
  await expect(cardTitle(page, 'オフラインで編集')).toBeVisible();

  // オフラインで削除（サンプルの1件）
  const sample = page.getByTestId('task-card').filter({ hasText: '本を1章読む' });
  await sample.getByRole('button', { name: '本を1章読む' }).click();
  await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: '削除' }).click();
  await page.getByRole('dialog', { name: 'タスクを削除' }).getByRole('button', { name: '削除する' }).click();
  await expect(cardTitle(page, '本を1章読む')).toHaveCount(0);

  // オフラインのまま再読み込みしても IndexedDB に保存されている
  await page.reload();
  await expect(cardTitle(column(page, 'doing'), 'オフラインで編集')).toBeVisible();
  await expect(cardTitle(page, '本を1章読む')).toHaveCount(0);
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);

  // オンラインに戻るとバナーが消える
  await context.setOffline(false);
  await expect(page.getByText('オフラインです。')).toHaveCount(0);
});
