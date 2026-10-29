const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso: string | null): string {
  return iso ? dateTimeFormat.format(new Date(iso)) : '—';
}

/** "2026-10-29" → "2026/10/29" */
export function formatDueDate(date: string): string {
  return date.replaceAll('-', '/');
}
