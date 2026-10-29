import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** 説明文の要素 id（aria-describedby） */
  describedBy?: string;
}

/**
 * ネイティブ <dialog> の showModal() を使うモーダル。
 * フォーカスの閉じ込め・Esc で閉じる・背景の操作不可はブラウザが行う。
 * 開いたら data-autofocus の要素へ、閉じたら開く前にフォーカスしていた要素へフォーカスを移す。
 */
export function Dialog({ open, title, onClose, children, className, describedBy }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // showModal() は最初のフォーカス可能要素（閉じるボタン）にフォーカスするため、
      // data-autofocus を付けた要素があればそちらへ移す
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      const target = returnFocus.current;
      returnFocus.current = null;
      if (target && target.isConnected) target.focus();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className ?? ''}`}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // 背景（dialog 要素自身）のクリックで閉じる
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <header className="dialog-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-button" aria-label="閉じる" onClick={onClose}>
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
