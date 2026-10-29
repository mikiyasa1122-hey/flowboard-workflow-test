import { useId, useState, type FormEvent } from 'react';
import {
  DESCRIPTION_MAX,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  TAGS_MAX,
  TITLE_MAX,
  taskInputSchema,
  ValidationError,
  type Priority,
  type Status,
  type Task,
  type TaskInput,
} from '../domain/task';
import { parseTagInput } from '../domain/taskOps';
import { Dialog } from './Dialog';
import { formatDateTime } from './format';

interface TaskModalProps {
  /** null: 閉じている / 'new': 新規作成 / Task: 編集 */
  target: Task | 'new' | null;
  onClose: () => void;
  onSave: (input: TaskInput, existing: Task | null) => Promise<void>;
  onDelete: (task: Task) => void;
}

export function TaskModal({ target, onClose, onSave, onDelete }: TaskModalProps) {
  const title = target === 'new' ? '新しいタスク' : 'タスクを編集';
  return (
    <Dialog open={target !== null} title={title} onClose={onClose} className="dialog-task">
      {target !== null && (
        <TaskForm
          key={target === 'new' ? 'new' : target.id}
          task={target === 'new' ? null : target}
          onCancel={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </Dialog>
  );
}

interface TaskFormProps {
  task: Task | null;
  onCancel: () => void;
  onSave: TaskModalProps['onSave'];
  onDelete: TaskModalProps['onDelete'];
}

function TaskForm({ task, onCancel, onSave, onDelete }: TaskFormProps) {
  const id = useId();
  const [titleText, setTitleText] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Status>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [tagsText, setTagsText] = useState(task?.tags.join(', ') ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input: TaskInput = {
      title: titleText,
      description,
      status,
      priority,
      dueDate: dueDate === '' ? null : dueDate,
      tags: parseTagInput(tagsText),
    };
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = ValidationError.fromZod(parsed.error).fieldErrors();
      setErrors(fieldErrors);
      const first = Object.keys(fieldErrors)[0];
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(parsed.data, task);
    } catch (error) {
      // 保存に失敗しても入力内容は残し、ダイアログ内にエラーを出す
      if (error instanceof ValidationError) setErrors(error.fieldErrors());
      else setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (name: string) => ({
    id: `${id}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : `${id}-${name}-hint`,
  });

  const errorText = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form className="task-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-title`}>
          タイトル <span className="required">必須</span>
        </label>
        <input
          {...fieldProps('title')}
          type="text"
          value={titleText}
          onChange={(e) => setTitleText(e.target.value)}
          data-autofocus
          autoComplete="off"
        />
        <p id={`${id}-title-hint`} className="field-hint">
          {titleText.trim().length}/{TITLE_MAX}文字
        </p>
        {errorText('title')}
      </div>

      <div className="field">
        <label htmlFor={`${id}-description`}>説明</label>
        <textarea {...fieldProps('description')} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        <p id={`${id}-description-hint`} className="field-hint">
          {description.length}/{DESCRIPTION_MAX}文字
        </p>
        {errorText('description')}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-status`}>ステータス</label>
          <select {...fieldProps('status')} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errorText('status')}
        </div>
        <div className="field">
          <label htmlFor={`${id}-priority`}>優先度</label>
          <select {...fieldProps('priority')} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          {errorText('priority')}
        </div>
        <div className="field">
          <label htmlFor={`${id}-dueDate`}>期限</label>
          <input {...fieldProps('dueDate')} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          {errorText('dueDate')}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${id}-tags`}>タグ</label>
        <input
          {...fieldProps('tags')}
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="例: 仕事, 家"
          autoComplete="off"
        />
        <p id={`${id}-tags-hint`} className="field-hint">
          カンマ区切りで最大{TAGS_MAX}件
        </p>
        {errorText('tags')}
      </div>

      {task && (
        <dl className="timestamps">
          <div>
            <dt>作成</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>
          <div>
            <dt>更新</dt>
            <dd>{formatDateTime(task.updatedAt)}</dd>
          </div>
          <div>
            <dt>完了</dt>
            <dd>{formatDateTime(task.completedAt)}</dd>
          </div>
        </dl>
      )}

      {saveError && (
        <p className="form-error" role="alert">
          保存できませんでした: {saveError}。入力内容はそのまま残っています。
        </p>
      )}

      <div className="dialog-actions">
        {task && (
          <button type="button" className="button button-danger push-left" onClick={() => onDelete(task)}>
            削除
          </button>
        )}
        <button type="button" className="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" className="button button-primary" disabled={saving}>
          {task ? '保存' : '作成'}
        </button>
      </div>
    </form>
  );
}
