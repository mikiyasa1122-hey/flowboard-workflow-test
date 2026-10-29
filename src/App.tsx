import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './components/Board';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { Dashboard } from './components/Dashboard';
import { DataActions } from './components/DataActions';
import { FilterBar } from './components/FilterBar';
import { TaskModal } from './components/TaskModal';
import { collectTags, DEFAULT_CRITERIA, filterTasks, isFiltered, sortTasks, toLocalDateString, type FilterCriteria } from './domain/filter';
import { computeStats } from './domain/stats';
import { STATUS_LABELS, ValidationError, type Status, type Task, type TaskInput } from './domain/task';
import { useTaskStore } from './state/useTaskStore';
import { useToast } from './state/toast';
import type { TaskRepository } from './storage/taskRepository';

type View = 'board' | 'dashboard';

const VIEW_TITLES: Record<View, string> = { board: 'ボード', dashboard: 'ダッシュボード' };

function viewFromHash(hash: string): View {
  return hash === '#/dashboard' ? 'dashboard' : 'board';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function useHashView(): View {
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return view;
}

/** 日付が変わったら期限超過の判定を更新するため、1分ごとに今日の日付を確認する */
function useToday(): string {
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(toLocalDateString(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

export function App({ repository }: { repository: TaskRepository }) {
  const store = useTaskStore(repository);
  const { notify } = useToast();
  const view = useHashView();
  const today = useToday();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [rawCriteria, setCriteria] = useState<FilterCriteria>(DEFAULT_CRITERIA);
  const searchRef = useRef<HTMLInputElement>(null);
  const ready = store.load.phase === 'ready';

  const tags = useMemo(() => collectTags(store.tasks), [store.tasks]);
  // 絞り込み中のタグが削除・インポートで消えたら、そのタグ条件は無効として扱う
  const criteria = useMemo(
    () => (rawCriteria.tag !== 'all' && !tags.includes(rawCriteria.tag) ? { ...rawCriteria, tag: 'all' } : rawCriteria),
    [rawCriteria, tags],
  );
  const visibleTasks = useMemo(
    () => sortTasks(filterTasks(store.tasks, criteria, today), criteria.sort),
    [store.tasks, criteria, today],
  );
  const stats = useMemo(() => computeStats(store.tasks, today), [store.tasks, today]);
  const filtered = isFiltered(criteria);

  useEffect(() => {
    document.title = `${VIEW_TITLES[view]} | FlowBoard`;
  }, [view]);

  useEffect(() => {
    if (store.skipped > 0) notify('error', `保存データのうち${store.skipped}件が壊れていたため読み込めませんでした`);
  }, [store.skipped, notify]);

  const openNew = useCallback(() => {
    if (ready) setEditing('new');
  }, [ready]);

  // キーボードショートカット: N = 新規タスク、/ = 検索へ移動
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        openNew();
      } else if (event.key === '/' && view === 'board') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNew, view]);

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

  const navItems: { view: View; href: string; icon: string }[] = [
    { view: 'board', href: '#/board', icon: '▦' },
    { view: 'dashboard', href: '#/dashboard', icon: '◔' },
  ];

  const navList = (
    <ul className="nav-list">
      {navItems.map((item) => (
        <li key={item.view}>
          <a className="nav-link" href={item.href} aria-current={view === item.view ? 'page' : undefined}>
            <span aria-hidden="true">{item.icon}</span>
            {VIEW_TITLES[item.view]}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へスキップ
      </a>
      <aside className="sidebar">
        <p className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          FlowBoard
        </p>
        <nav aria-label="メイン">{navList}</nav>
        <section className="sidebar-section" aria-labelledby="sidebar-data">
          <h2 id="sidebar-data">データ</h2>
          <DataActions tasks={store.tasks} disabled={!ready} onReplaceAll={store.replaceAll} onConfirm={setConfirm} />
        </section>
      </aside>

      <header className="topbar">
        <h1 className="page-title">{VIEW_TITLES[view]}</h1>
        <div className="topbar-actions">
          <button type="button" className="button button-primary" onClick={openNew} disabled={!ready} aria-keyshortcuts="N">
            ＋<span className="button-label"> 新規タスク</span>
            <span className="visually-hidden">（新規タスク）</span>
          </button>
        </div>
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
        {ready && view === 'board' && (
          <>
            <FilterBar
              ref={searchRef}
              criteria={criteria}
              tags={tags}
              resultCount={visibleTasks.length}
              totalCount={store.tasks.length}
              onChange={setCriteria}
            />
            {filtered && visibleTasks.length === 0 ? (
              <div className="no-results" role="status">
                <p>条件に一致するタスクが見つかりませんでした。</p>
                <button type="button" className="button" onClick={() => setCriteria({ ...DEFAULT_CRITERIA })}>
                  フィルターを解除
                </button>
              </div>
            ) : (
              <Board tasks={visibleTasks} today={today} filtered={filtered} onOpen={setEditing} onStatusChange={changeStatus} />
            )}
          </>
        )}
        {ready && view === 'dashboard' && <Dashboard stats={stats} />}
      </main>

      <nav className="mobile-nav" aria-label="メイン（モバイル）">
        {navList}
      </nav>

      <TaskModal target={editing} onClose={() => setEditing(null)} onSave={save} onDelete={requestDelete} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
