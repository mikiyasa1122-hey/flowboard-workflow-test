import { useCallback, useEffect, useState } from 'react';
import { Board } from './components/Board';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { TaskModal } from './components/TaskModal';
import { toLocalDateString } from './domain/filter';
import { STATUS_LABELS, ValidationError, type Status, type Task, type TaskInput } from './domain/task';
import { useTaskStore } from './state/useTaskStore';
import { useToast } from './state/toast';
import type { TaskRepository } from './storage/taskRepository';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function App({ repository }: { repository: TaskRepository }) {
  const store = useTaskStore(repository);
  const { notify } = useToast();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const today = toLocalDateString(new Date());

  const openNew = useCallback(() => setEditing('new'), []);

  // キーボードショートカット: N = 新規タスク
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        openNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNew]);

  const save = async (input: TaskInput, existing: Task | null) => {
    try {
      if (existing) {
        await store.update(existing.id, input);
        notify('success', 'タスクを保存しました');
      } else {
        await store.create(input);
        notify('success', 'タスクを作成しました');
      }
      setEditing(null);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      notify('error', errorMessage(error));
    }
  };

  const changeStatus = async (task: Task, status: Status) => {
    try {
      await store.setStatus(task.id, status);
      notify('success', `「${task.title}」を ${STATUS_LABELS[status]} に移動しました`);
    } catch (error) {
      notify('error', errorMessage(error));
    }
  };

  const requestDelete = (task: Task) => {
    setConfirm({
      title: 'タスクを削除',
      message: `「${task.title}」を削除します。この操作は取り消せません。`,
      confirmLabel: '削除する',
      danger: true,
      onConfirm: async () => {
        try {
          await store.remove(task.id);
          setEditing(null);
          notify('success', 'タスクを削除しました');
        } catch (error) {
          notify('error', errorMessage(error));
        }
      },
    });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へスキップ
      </a>
      <header className="topbar">
        <h1 className="brand">FlowBoard</h1>
        <button type="button" className="button button-primary" onClick={openNew} aria-keyshortcuts="N">
          ＋ 新規タスク
        </button>
      </header>
      <main id="main" className="content" tabIndex={-1}>
        {store.load.phase === 'loading' && (
          <p className="loading" role="status">
            読み込み中…
          </p>
        )}
        {store.load.phase === 'error' && (
          <div className="load-error" role="alert">
            <p>データを読み込めませんでした: {store.load.message}</p>
            <button type="button" className="button" onClick={() => window.location.reload()}>
              再読み込み
            </button>
          </div>
        )}
        {store.load.phase === 'ready' && (
          <Board tasks={store.tasks} today={today} filtered={false} onOpen={setEditing} onStatusChange={changeStatus} />
        )}
      </main>
      <TaskModal target={editing} onClose={() => setEditing(null)} onSave={save} onDelete={requestDelete} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
