import { test, expect } from './fixtures';
import { cardTitle, column, openApp, SAMPLE_COUNTS, setStatus } from './helpers';

test('保存に失敗したらエラーを表示し、画面も保存内容も変えない（入力は残る）', async ({ page }) => {
  await openApp(page);
  // 読み込み後に IndexedDB への書き込みをすべて失敗させる（容量不足などの再現）
  await page.evaluate(() => {
    const fail = () => {
      throw new DOMException('quota exceeded (test)', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.put = fail;
    IDBObjectStore.prototype.delete = fail;
    IDBObjectStore.prototype.clear = fail;
  });

  // 作成: ダイアログは開いたまま、入力は残り、ダイアログ内にエラー
  await page.getByRole('button', { name: '新規タスク' }).click();
  const dialog = page.getByRole('dialog', { name: '新しいタスク' });
  await dialog.getByLabel('タイトル').fill('保存できないタスク');
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog.getByRole('alert')).toContainText('保存できませんでした');
  await expect(dialog.getByLabel('タイトル')).toHaveValue('保存できないタスク');
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(cardTitle(page, '保存できないタスク')).toHaveCount(0);

  // 編集
  await cardTitle(page, '本を1章読む').click();
  const edit = page.getByRole('dialog', { name: 'タスクを編集' });
  await edit.getByLabel('タイトル').fill('改名できない');
  await edit.getByRole('button', { name: '保存' }).click();
  await expect(edit.getByRole('alert')).toContainText('保存に失敗しました');
  await edit.getByRole('button', { name: 'キャンセル' }).click();
  await expect(cardTitle(page, '本を1章読む')).toBeVisible();

  // ステータス変更: 通知が出て、カードは元の列に残る
  await setStatus(page, '本を1章読む', 'DONE');
  await expect(page.getByRole('alert').filter({ hasText: '保存に失敗しました' })).toBeVisible();
  await expect(cardTitle(column(page, 'doing'), '本を1章読む')).toBeVisible();
  await expect(page.getByLabel('「本を1章読む」のステータス')).toHaveValue('doing');

  // 削除: 確認後に失敗 → 通知はダイアログの背景より前に出ていて、閉じるボタンが押せる
  await cardTitle(page, '本を1章読む').click();
  await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: '削除' }).click();
  await page.getByRole('dialog', { name: 'タスクを削除' }).getByRole('button', { name: '削除する' }).click();
  const toast = page.getByRole('alert').filter({ hasText: '削除に失敗しました' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: '通知を閉じる' }).click();
  await expect(toast).toHaveCount(0);
  await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: 'キャンセル' }).click();
  await expect(cardTitle(page, '本を1章読む')).toBeVisible();

  // 再読み込み（書き込みは元に戻る）しても、保存内容は何も変わっていない
  await page.reload();
  await expect(page.getByTestId('task-card')).toHaveCount(SAMPLE_COUNTS.total);
  await expect(cardTitle(column(page, 'doing'), '本を1章読む')).toBeVisible();
});

test('データの読み込み中はローディングを表示し、操作できない', async ({ page }) => {
  // IndexedDB を開く処理が終わらない状態を作る
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      return {} as IDBOpenDBRequest;
    };
  });
  await page.goto('./');
  await expect(page.getByRole('status').filter({ hasText: '読み込み中' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新規タスク' })).toBeDisabled();
});

test('データベースを開けないときはエラーと再読み込みボタンを表示する', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException('blocked (test)', 'SecurityError');
    };
  });
  await page.goto('./');
  const alert = page.getByRole('alert').filter({ hasText: 'データを読み込めませんでした' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: '再読み込み' })).toBeVisible();
});

test('別のタブでの変更が反映され、古い内容で上書きしない', async ({ page, context }) => {
  await openApp(page);
  const other = await context.newPage();
  await openApp(other);

  // タブAで改名
  await cardTitle(page, '本を1章読む').click();
  const edit = page.getByRole('dialog', { name: 'タスクを編集' });
  await edit.getByLabel('タイトル').fill('本を2章読む');
  await edit.getByRole('button', { name: '保存' }).click();

  // タブBに反映される
  await expect(cardTitle(other, '本を2章読む')).toBeVisible();

  // タブBでステータスを変えても、タブAの改名は失われない
  await setStatus(other, '本を2章読む', 'DONE');
  await expect(cardTitle(column(page, 'done'), '本を2章読む')).toBeVisible();
  await page.reload();
  await expect(cardTitle(column(page, 'done'), '本を2章読む')).toBeVisible();
  await other.close();
});

test('スキップリンクで本文へ移動しても、表示中の画面は変わらない', async ({ page }) => {
  await openApp(page, '#/dashboard');
  await expect(page.getByRole('heading', { name: 'ダッシュボード', level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: '本文へスキップ' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'ダッシュボード', level: 1 })).toBeVisible();
  await expect(page.getByTestId('stat-total')).toBeVisible();
});
