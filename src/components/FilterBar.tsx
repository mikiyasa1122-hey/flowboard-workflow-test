import { forwardRef, useId } from 'react';
import { DEFAULT_CRITERIA, isFiltered, SORT_LABELS, type FilterCriteria, type SortKey } from '../domain/filter';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Priority, type Status } from '../domain/task';

interface FilterBarProps {
  criteria: FilterCriteria;
  tags: string[];
  resultCount: number;
  totalCount: number;
  onChange: (criteria: FilterCriteria) => void;
}

export const FilterBar = forwardRef<HTMLInputElement, FilterBarProps>(function FilterBar(
  { criteria, tags, resultCount, totalCount, onChange },
  searchRef,
) {
  const id = useId();
  const set = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => onChange({ ...criteria, [key]: value });
  const active = isFiltered(criteria);

  return (
    <search className="filters" aria-label="タスクの検索と絞り込み">
      <div className="field field-search">
        <label htmlFor={`${id}-q`}>検索</label>
        <input
          ref={searchRef}
          id={`${id}-q`}
          type="search"
          placeholder="タイトル・説明文（/ で移動）"
          value={criteria.query}
          onChange={(e) => set('query', e.target.value)}
          aria-keyshortcuts="/"
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-status`}>ステータス</label>
        <select id={`${id}-status`} value={criteria.status} onChange={(e) => set('status', e.target.value as Status | 'all')}>
          <option value="all">すべて</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-priority`}>優先度</label>
        <select id={`${id}-priority`} value={criteria.priority} onChange={(e) => set('priority', e.target.value as Priority | 'all')}>
          <option value="all">すべて</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-tag`}>タグ</label>
        <select id={`${id}-tag`} value={criteria.tag} onChange={(e) => set('tag', e.target.value)}>
          <option value="all">すべて</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-sort`}>並び替え</label>
        <select id={`${id}-sort`} value={criteria.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={criteria.overdueOnly} onChange={(e) => set('overdueOnly', e.target.checked)} />
        期限超過のみ
      </label>
      <div className="filters-footer">
        <span role="status" aria-live="polite">
          {active ? `${totalCount}件中 ${resultCount}件を表示` : `全${totalCount}件`}
        </span>
        <button
          type="button"
          className="button"
          onClick={() => onChange({ ...DEFAULT_CRITERIA })}
          disabled={!active && criteria.sort === DEFAULT_CRITERIA.sort}
        >
          フィルターを解除
        </button>
      </div>
    </search>
  );
});
