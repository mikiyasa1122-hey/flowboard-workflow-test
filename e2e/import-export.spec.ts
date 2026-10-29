import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { cardTitle, openApp, SAMPLE_COUNTS } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

async function importFile(page: import('@playwright/test').Page, content: string, name = 'data.json') {
  await page.getByTestId('import-input').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
}

const invalidFiles: [string, string, RegExp][] = [
  ['JSON でない', '{ broken', /JSON として読み込めません/],
  ['別アプリのファイル', JSON.stringify({ app: 'other', schemaVersion: 1, exportedAt: '', tasks: [] }), /FlowBoard のエクスポートファイルではありません/],
  ['未対応のバージョン', JSON.stringify({ app: 'flowboard', schemaVersion: 99, exportedAt: '', tasks: [] }), /対応していないスキーマバージョン/],
  [
    '不正なタスクを含む',
    JSON.stringify({ app: 'flowboard', schemaVersion: 1, exportedAt: '', tasks: [{ id: 'x', title: '' }] }),
    /1件目のタスクが不正です/,
  ],
];

for (const [label, content, message] of invalidFiles) {
  test(`不正ファイル（${label}）はエラーを表示し、既存データを変更しない`, async ({ page }) => {
    await importFile(page, content);
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
    await page.reload();
    await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
  });
}

test('インポート確認でキャンセルすると既存データは変わらない', async ({ page }) => {
  const sample = await readFile('samples/sample-tasks.json', 'utf8');
  await importFile(page, sample, 'sample-tasks.json');
  const dialog = page.getByRole('dialog', { name: 'データをインポート' });
  await expect(dialog).toContainText('「sample-tasks.json」の5件のタスクで、現在の5件をすべて置き換えます');
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(cardTitle(page, '四半期レポートを提出')).toHaveCount(0);
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
});

test('同梱のサンプルデータをインポートでき、エクスポートと往復できる', async ({ page }) => {
  const sample = JSON.parse(await readFile('samples/sample-tasks.json', 'utf8'));
  await importFile(page, JSON.stringify(sample), 'sample-tasks.json');
  await page.getByRole('dialog', { name: 'データをインポート' }).getByRole('button', { name: 'インポートする' }).click();
  await expect(cardTitle(page, '四半期レポートを提出')).toBeVisible();
  await expect(page.getByTestId('task-card')).toHaveCount(sample.tasks.length);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('complementary').getByRole('button', { name: 'エクスポート' }).click();
  const exported = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'));
  const byId = (list: { id: string }[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
  expect(byId(exported.tasks)).toEqual(byId(sample.tasks));
});
