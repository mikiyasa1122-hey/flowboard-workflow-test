// 公開URLの基本スモークテスト。
// 使い方: node scripts/smoke.mjs https://<user>.github.io/flowboard-workflow-test/
// HTML・JS・CSS・マニフェスト・アイコン・Service Worker が 200 で取得できることを確認する。
// デプロイ直後は CDN 反映に時間がかかることがあるため、数回リトライする。

const url = process.argv[2];
if (!url) {
  console.error('URL を指定してください');
  process.exit(2);
}
const base = url.endsWith('/') ? url : `${url}/`;

async function fetchOk(target) {
  const response = await fetch(target, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${target}`);
  return response;
}

async function check() {
  const html = await (await fetchOk(base)).text();
  if (!html.includes('<title>FlowBoard</title>')) throw new Error('index.html に FlowBoard のタイトルがありません');
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  if (!assets.some((a) => a.endsWith('.js'))) throw new Error('JS の参照が見つかりません');
  if (!assets.some((a) => a.endsWith('.css'))) throw new Error('CSS の参照が見つかりません');
  const targets = [
    ...assets.map((a) => new URL(a, base).href),
    new URL('manifest.webmanifest', base).href,
    new URL('icons/icon-192.png', base).href,
    new URL('sw.js', base).href,
  ];
  for (const target of targets) {
    await fetchOk(target);
    console.log(`ok  ${target}`);
  }
}

const attempts = 6;
for (let i = 1; i <= attempts; i++) {
  try {
    await check();
    console.log('スモークテスト成功');
    process.exit(0);
  } catch (error) {
    console.error(`試行 ${i}/${attempts} 失敗: ${error.message}`);
    if (i < attempts) await new Promise((r) => setTimeout(r, 10_000));
  }
}
process.exit(1);
