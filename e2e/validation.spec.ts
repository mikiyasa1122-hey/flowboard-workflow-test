import { test, expect } from './fixtures';
import { cardTitle, openApp, SAMPLE_COUNTS } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('無効な入力ではタスクが作成されず、エラーが表示される', async ({ page }) => {
  await page.getByRole('button', { name: '新規タスク' }).click();
  const dialog = page.getByRole('dialog', { name: '新しいタスク' });
  const title = dialog.getByLabel('タイトル');

  // 空のタイトル
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByText('タイトルは必須です')).toBeVisible();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(title).toBeFocused();

  // 空白だけのタイトル
  await title.fill('    ');
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByText('タイトルは必須です')).toBeVisible();

  // 81文字のタイトル
  await title.fill('あ'.repeat(81));
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByText('タイトルは80文字以内にしてください')).toBeVisible();

  // 501文字の説明
  await title.fill('境界値テスト');
  await dialog.getByLabel('説明').fill('x'.repeat(501));
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByText('説明は500文字以内にしてください')).toBeVisible();

  // タグ6件
  await dialog.getByLabel('説明').fill('');
  await dialog.getByLabel('タグ').fill('a, b, c, d, e, f');
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByText('タグは最大5件までです')).toBeVisible();

  // 何も保存されていない
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
  await page.reload();
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);

  // 境界値（80文字・タグ5件）は保存できる
  await page.getByRole('button', { name: '新規タスク' }).click();
  await dialog.getByLabel('タイトル').fill('い'.repeat(80));
  await dialog.getByLabel('タグ').fill('a, b, c, d, e');
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog).toBeHidden();
  await expect(cardTitle(page, 'い'.repeat(80))).toBeVisible();
});

test('削除は確認ダイアログでキャンセルできる', async ({ page }) => {
  const target = page.getByTestId('task-card').first();
  const title = (await target.getByRole('heading').textContent()) ?? '';
  await target.getByRole('button').first().click();
  await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: '削除' }).click();
  const confirm = page.getByRole('dialog', { name: 'タスクを削除' });
  await expect(confirm).toBeVisible();
  // 確認ダイアログの初期フォーカスは安全な「キャンセル」
  await expect(confirm.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await confirm.getByRole('button', { name: 'キャンセル' }).click();
  await expect(confirm).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cardTitle(page, title)).toBeVisible();
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
});
