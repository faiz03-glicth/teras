/** One piece of work that must finish before the splash screen hides. */
export type BootTask =
  { status: 'pending' } | { status: 'done' } | { status: 'failed'; title: string; detail: string };

export type BootState =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; title: string; detail: string };

export const pending: BootTask = { status: 'pending' };
export const done: BootTask = { status: 'done' };
export const failed = (title: string, detail: string): BootTask => ({ status: 'failed', title, detail });

/** PURE: the first failure wins; otherwise ready only when every task is done. */
export function combineBootState(tasks: readonly BootTask[]): BootState {
  for (const task of tasks) {
    if (task.status === 'failed') return { status: 'error', title: task.title, detail: task.detail };
  }
  return tasks.every((task) => task.status === 'done') ? { status: 'ready' } : { status: 'loading' };
}
