import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { cardTitle, column, expectNoHorizontalScroll, openApp, setStatus } from './helpers';

test.describe('スマートフォン幅（375px）', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('横スクロールなしで主要操作ができる', async ({ page }) => {
    await openApp(page);
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole('complementary')).toBeHidden();
    const mobileNav = page.getByRole('navigation', { name: 'メイン（モバイル）' });
    await expect(mobileNav).toBeVisible();

    // 作成
    await page.getByRole('button', { name: '新規タスク' }).click();
    const dialog = page.getByRole('dialog', { name: '新しいタスク' });
    await expectNoHorizontalScroll(page);
    await dialog.getByLabel('タイトル').fill('モバイルで作成');
    await dialog.getByRole('button', { name: '作成' }).click();
    await expect(cardTitle(column(page, 'todo'), 'モバイルで作成')).toBeVisible();

    // ステータス変更
    await setStatus(page, 'モバイルで作成', 'DONE');
    await expect(cardTitle(column(page, 'done'), 'モバイルで作成')).toBeVisible();
    await expectNoHorizontalScroll(page);

    // 編集
    await cardTitle(page, 'モバイルで作成').click();
    const edit = page.getByRole('dialog', { name: 'タスクを編集' });
    await edit.getByLabel('タイトル').fill('モバイルで編集');
    await edit.getByRole('button', { name: '保存' }).click();
    await expect(cardTitle(page, 'モバイルで編集')).toBeVisible();

    // ダッシュボード
    await mobileNav.getByRole('link', { name: 'ダッシュボード' }).click();
    await expect(page.getByTestId('stat-total')).toHaveText('6');
    await expectNoHorizontalScroll(page);

    // データメニューからエクスポート
    await page.getByLabel('データメニュー').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.mobile-menu-panel').getByRole('button', { name: 'エクスポート' }).click();
    const exported = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'));
    expect(exported.tasks).toHaveLength(6);

    // 削除
    await mobileNav.getByRole('link', { name: 'ボード', exact: true }).click();
    await cardTitle(page, 'モバイルで編集').click();
    await page.getByRole('dialog', { name: 'タスクを編集' }).getByRole('button', { name: '削除' }).click();
    await page.getByRole('dialog', { name: 'タスクを削除' }).getByRole('button', { name: '削除する' }).click();
    await expect(cardTitle(page, 'モバイルで編集')).toHaveCount(0);
  });
});

test.describe('キーボード操作・テーマ', () => {
  test('ショートカットとキーボードだけでタスクを作成・編集できる', async ({ page }) => {
    await openApp(page);
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    // N で新規作成ダイアログ、タイトルに初期フォーカス
    await page.keyboard.press('n');
    const dialog = page.getByRole('dialog', { name: '新しいタスク' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('タイトル')).toBeFocused();
    await page.keyboard.type('キーボードで作成');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(cardTitle(page, 'キーボードで作成')).toBeVisible();

    // Esc でダイアログを閉じ、開いたボタンへフォーカスが戻る
    const opener = cardTitle(page, 'キーボードで作成');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'タスクを編集' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();

    // / で検索欄へ
    await page.keyboard.press('/');
    await expect(page.getByLabel('検索', { exact: true })).toBeFocused();
    await page.keyboard.type('キーボード');
    await expect(page.getByTestId('task-card')).toHaveCount(1);
  });

  test('ダーク/ライトを切り替えられ、再読み込み後も保持される', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openApp(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'ダークモードに切り替え' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'ライトモードに切り替え' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('OS がダークモードなら初期表示もダーク', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
