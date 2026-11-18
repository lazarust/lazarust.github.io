export type ShellState = { cwd: string };

const STORAGE_KEY = 'tn-shell';
const VERSION = 1;
const MAX_CWD_LENGTH = 256;

function emptyState(): ShellState {
  return { cwd: '~' };
}

function validCwd(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_CWD_LENGTH &&
    (value === '~' || value.startsWith('~/')) &&
    !value.includes('\0') &&
    !value.split('/').includes('..')
  );
}

export function load(): ShellState {
  try {
    if (typeof localStorage === 'undefined') return emptyState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return emptyState();

    const record = saved as Record<string, unknown>;
    if (record.version !== VERSION || typeof record.state !== 'object' || record.state === null) {
      return emptyState();
    }
    const state = record.state as Record<string, unknown>;
    return validCwd(state.cwd) ? { cwd: state.cwd } : emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state: ShellState): void {
  try {
    if (typeof localStorage === 'undefined' || !validCwd(state.cwd)) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        state: { cwd: state.cwd },
      }),
    );
  } catch {}
}
