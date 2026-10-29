import { test, expect } from './fixtures';

test('アプリがサブパスで起動し、CSS・JS・画像が読み込める', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  await expect(page).toHaveTitle(/FlowBoard/);

  // JS: React が描画している
  await expect(page.getByRole('heading', { name: 'ボード', level: 1 })).toBeVisible();

  // CSS: スタイルが適用されている（サイドバーとボードがグリッド配置）
  await expect(page.locator('.board')).toHaveCSS('display', 'grid');

  // 画像: サイドバーのロゴ（BASE_URL 付きのパス）が読み込めている
  const logo = page.locator('.sidebar .brand img');
  await expect(logo).toHaveAttribute('src', '/flowboard-workflow-test/favicon.svg');
  expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // PWA: マニフェストとアイコン
  const manifest = await page.request.get('manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ start_url: '/flowboard-workflow-test/', scope: '/flowboard-workflow-test/' });
  expect((await page.request.get('icons/icon-192.png')).ok()).toBe(true);
  expect((await page.request.get('icons/icon-512.png')).ok()).toBe(true);

  expect(failed).toEqual([]);
});
