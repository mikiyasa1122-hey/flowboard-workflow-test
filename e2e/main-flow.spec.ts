import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { cardTitle, column, createTask, openApp, SAMPLE_COUNTS, setStatus } from './helpers';

const TITLE = 'E2E 主要フローのタスク';
const EDITED = 'E2E 主要フローのタスク（編集済み）';
const IMPORTED = 'インポートで追加されたタスク';

test('主要フロー: 作成 → ステータス変更 → 集計 → 再読み込み → 検索 → 編集 → エクスポート → インポート → 削除', async ({ page }) => {
  // 1. アプリを起動する
  await openApp(page);
  await expect(page.getByTestId('count-todo')).toHaveText(String(SAMPLE_COUNTS.todo));

  // 2. タスクを新規作成する
  await createTask(page, { title: TITLE, description: '主要フローの確認用', priority: '高', tags: 'e2e, 確認' });
  await expect(page.getByRole('status').filter({ hasText: 'タスクを作成しました' })).toBeVisible();

  // 3. 作成したタスクが TODO に表示される
  await expect(cardTitle(column(page, 'todo'), TITLE)).toBeVisible();
  await expect(page.getByTestId('count-todo')).toHaveText(String(SAMPLE_COUNTS.todo + 1));

  // 4. DOING に変更する
  await setStatus(page, TITLE, 'DOING');
  await expect(cardTitle(column(page, 'doing'), TITLE)).toBeVisible();
  await expect(cardTitle(column(page, 'todo'), TITLE)).toHaveCount(0);
  await expect(page.getByTestId('count-doing')).toHaveText(String(SAMPLE_COUNTS.doing + 1));

  // 5. DONE に変更する
  await setStatus(page, TITLE, 'DONE');
  await expect(cardTitle(column(page, 'done'), TITLE)).toBeVisible();
  await expect(page.getByTestId('count-done')).toHaveText(String(SAMPLE_COUNTS.done + 1));

  // 6. ダッシュボードの集計が更新される（全6件・完了2件 → 33.3%）
  await page.getByRole('navigation', { name: 'メイン', exact: true }).getByRole('link', { name: 'ダッシュボード' }).click();
  await expect(page.getByRole('heading', { name: 'ダッシュボード', level: 1 })).toBeVisible();
  await expect(page.getByTestId('stat-total')).toHaveText('6');
  await expect(page.getByTestId('stat-done')).toHaveText('2');
  await expect(page.getByTestId('stat-todo')).toHaveText('2');
  await expect(page.getByTestId('stat-rate')).toHaveText('33.3%');
  await expect(page.getByTestId('priority-high')).toHaveText('3件');
  await expect(page.getByTestId('status-chart')).toContainText('DONE');

  // 7. ページを再読み込みする
  await page.reload();

  // 8. タスクが保持されていることを確認する
  await expect(page.getByTestId('stat-total')).toHaveText('6');
  await page.getByRole('navigation', { name: 'メイン', exact: true }).getByRole('link', { name: 'ボード', exact: true }).click();
  await expect(cardTitle(column(page, 'done'), TITLE)).toBeVisible();

  // 9. 検索とフィルタリングを実行する
  const filters = page.getByRole('search', { name: 'タスクの検索と絞り込み' });
  await filters.getByLabel('検索').fill('主要フロー');
  await expect(page.getByTestId('task-card')).toHaveCount(1);
  await expect(filters.getByText('6件中 1件を表示')).toBeVisible();
  await filters.getByLabel('検索').fill('');
  await filters.getByLabel('タグ').selectOption('e2e');
  await filters.getByLabel('ステータス').selectOption({ label: 'DONE' });
  await expect(page.getByTestId('task-card')).toHaveCount(1);
  await filters.getByLabel('優先度').selectOption({ label: '低' });
  await expect(page.getByText('条件に一致するタスクが見つかりませんでした。')).toBeVisible();
  await page.getByRole('button', { name: 'フィルターを解除' }).first().click();
  await expect(page.getByTestId('task-card')).toHaveCount(6);
  await filters.getByLabel('並び替え').selectOption({ label: '優先度（高い順）' });
  await expect(column(page, 'done').getByTestId('task-card').first()).toContainText(TITLE);
  await filters.getByLabel('期限超過のみ').check();
  await expect(page.getByTestId('task-card')).toHaveCount(1);
  await expect(page.getByTestId('task-card')).toContainText('期限超過');
  await page.getByRole('button', { name: 'フィルターを解除' }).click();

  // 10. タスクを編集する
  await cardTitle(page, TITLE).click();
  const editDialog = page.getByRole('dialog', { name: 'タスクを編集' });
  await expect(editDialog.getByLabel('タイトル')).toHaveValue(TITLE);
  await expect(editDialog.getByText('完了', { exact: true })).toBeVisible();
  await editDialog.getByLabel('タイトル').fill(EDITED);
  await editDialog.getByRole('button', { name: '保存' }).click();
  await expect(editDialog).toBeHidden();
  await expect(cardTitle(column(page, 'done'), EDITED)).toBeVisible();

  // 11. JSON をエクスポートする
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('complementary').getByRole('button', { name: 'エクスポート' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^flowboard-export-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.schemaVersion).toBe(1);
  expect(exported.app).toBe('flowboard');
  expect(exported.tasks).toHaveLength(6);
  const editedTask = exported.tasks.find((t: { title: string }) => t.title === EDITED);
  expect(editedTask).toMatchObject({ status: 'done', priority: 'high', tags: ['e2e', '確認'] });
  expect(editedTask.completedAt).toEqual(expect.any(String));

  // 12. JSON をインポートする（エクスポート内容 + 1件）
  const now = new Date().toISOString();
  exported.tasks.push({
    ...editedTask,
    id: '9b2f8a4e-1c3d-4e5f-8a7b-0c1d2e3f4a5b',
    title: IMPORTED,
    status: 'todo',
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await page.getByTestId('import-input').setInputFiles({
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  const importDialog = page.getByRole('dialog', { name: 'データをインポート' });
  await expect(importDialog).toContainText('7件のタスクで、現在の6件をすべて置き換えます');
  await importDialog.getByRole('button', { name: 'インポートする' }).click();
  await expect(page.getByRole('status').filter({ hasText: '7件のタスクをインポートしました' })).toBeVisible();
  await expect(cardTitle(column(page, 'todo'), IMPORTED)).toBeVisible();
  await expect(page.getByTestId('task-card')).toHaveCount(7);

  // 13. タスクを削除する
  await cardTitle(page, EDITED).click();
  await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: '削除' }).click();
  const confirmDialog = page.getByRole('dialog', { name: 'タスクを削除' });
  await expect(confirmDialog).toContainText(EDITED);
  await confirmDialog.getByRole('button', { name: '削除する' }).click();
  await expect(cardTitle(page, EDITED)).toHaveCount(0);
  await expect(page.getByTestId('task-card')).toHaveCount(6);

  // 14. 削除結果が保存されていることを確認する
  await page.reload();
  await expect(page.getByTestId('task-card')).toHaveCount(6);
  await expect(cardTitle(page, EDITED)).toHaveCount(0);
  await expect(cardTitle(page, IMPORTED)).toBeVisible();
});
