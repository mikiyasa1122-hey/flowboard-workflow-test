import { useSyncExternalStore } from 'react';

/*
 * showModal() で開いているダイアログの重なり順。
 * モーダルが開いている間はその外側の要素が操作できなくなる（inert）ため、
 * 通知は最前面のダイアログの中に描画する。
 */

const stack: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function pushModal(dialog: HTMLDialogElement) {
  removeModal(dialog);
  stack.push(dialog);
  emit();
}

export function removeModal(dialog: HTMLDialogElement) {
  const index = stack.indexOf(dialog);
  if (index === -1) return;
  stack.splice(index, 1);
  emit();
}

/** 最前面のモーダル（なければ null） */
export function useTopModal(): HTMLDialogElement | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => stack[stack.length - 1] ?? null,
    () => null,
  );
}
