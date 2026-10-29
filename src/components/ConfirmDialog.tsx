import { useId, useState } from 'react';
import { Dialog } from './Dialog';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  onClose: () => void;
}

export function ConfirmDialog({ request, onClose }: ConfirmDialogProps) {
  const messageId = useId();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!request) return;
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Dialog open={request !== null} title={request?.title ?? ''} onClose={onClose} describedBy={messageId} className="dialog-confirm">
      <p id={messageId} className="confirm-message">
        {request?.message}
      </p>
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onClose} data-autofocus>
          キャンセル
        </button>
        <button
          type="button"
          className={`button ${request?.danger ? 'button-danger' : 'button-primary'}`}
          onClick={confirm}
          disabled={busy}
        >
          {request?.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
