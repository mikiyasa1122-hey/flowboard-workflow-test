import { useRef, type ChangeEvent } from 'react';
import { buildExport, exportFileName, IMPORT_MAX_BYTES, parseImport } from '../domain/importExport';
import type { Task } from '../domain/task';
import { useToast } from '../state/toast';
import type { ConfirmRequest } from './ConfirmDialog';

interface DataActionsProps {
  tasks: Task[];
  disabled: boolean;
  onReplaceAll: (tasks: Task[]) => Promise<void>;
  onConfirm: (request: ConfirmRequest) => void;
}

/** JSON エクスポート / インポートのボタン */
export function DataActions({ tasks, disabled, onReplaceAll, onConfirm }: DataActionsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const exportJson = () => {
    const now = new Date();
    const blob = new Blob([JSON.stringify(buildExport(tasks, now), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(now);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('success', `${tasks.length}件のタスクをエクスポートしました`);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // 同じファイルを続けて選べるようにする
    if (!file) return;
    if (file.size > IMPORT_MAX_BYTES) {
      notify('error', 'インポートに失敗しました: ファイルが大きすぎます（最大5MB）');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      notify('error', 'インポートに失敗しました: ファイルを読み込めません');
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      notify('error', `インポートに失敗しました: ${result.error}`);
      return;
    }
    onConfirm({
      title: 'データをインポート',
      message: `「${file.name}」の${result.tasks.length}件のタスクで、現在の${tasks.length}件をすべて置き換えます。よろしいですか？`,
      confirmLabel: 'インポートする',
      danger: true,
      onConfirm: async () => {
        try {
          await onReplaceAll(result.tasks);
          notify('success', `${result.tasks.length}件のタスクをインポートしました`);
        } catch (error) {
          notify('error', `インポートに失敗しました（データは変更されていません）: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });
  };

  return (
    <>
      <button type="button" className="button button-block" onClick={exportJson} disabled={disabled}>
        ⬇ エクスポート
      </button>
      <button type="button" className="button button-block" onClick={() => fileRef.current?.click()} disabled={disabled}>
        ⬆ インポート
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="インポートするJSONファイル"
        data-testid="import-input"
        onChange={onFile}
      />
    </>
  );
}
