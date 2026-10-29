import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/*
 * Service Worker の登録と更新通知。
 * 新しいバージョンを勝手に適用すると入力中の内容が失われるため、
 * 「更新があります」と表示し、利用者が選んだときだけ再読み込みする。
 */

let updateReady = false;
let applyUpdate: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export function registerServiceWorker() {
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      listeners.forEach((l) => l());
    },
  });
  applyUpdate = () => update(true);
}

export function useUpdateAvailable(): [boolean, () => void] {
  const ready = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => updateReady,
    () => false,
  );
  return [ready, () => void applyUpdate?.()];
}
