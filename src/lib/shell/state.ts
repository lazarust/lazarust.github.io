export type ShellLine = { kind: 'input' | 'output' | 'error'; text: string };
export type ShellState = { cwd: string; history: string[]; lines: ShellLine[] };

export const MAX_LINES = 200;
export const MAX_HISTORY = 100;

const STORAGE_KEY = 'tn-shell';
const VERSION = 1;

function emptyState(): ShellState {
  return { cwd: '~', history: [], lines: [] };
}

function isShellLine(value: unknown): value is ShellLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    (line.kind === 'input' || line.kind === 'output' || line.kind === 'error') &&
    typeof line.text === 'string'
  );
}

function isShellState(value: unknown): value is ShellState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.cwd === 'string' &&
    state.cwd.length > 0 &&
    Array.isArray(state.history) &&
    state.history.every((item) => typeof item === 'string') &&
    Array.isArray(state.lines) &&
    state.lines.every(isShellLine)
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
    if (record.version !== VERSION || !isShellState(record.state)) return emptyState();

    return {
      cwd: record.state.cwd,
      history: record.state.history.slice(-MAX_HISTORY),
      lines: record.state.lines.slice(-MAX_LINES),
    };
  } catch {
    return emptyState();
  }
}

export function save(state: ShellState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        state: {
          cwd: state.cwd,
          history: state.history.slice(-MAX_HISTORY),
          lines: state.lines.slice(-MAX_LINES),
        },
      }),
    );
  } catch {}
}

export function appendLine(state: ShellState, line: ShellLine): ShellState {
  return { ...state, lines: [...state.lines, line].slice(-MAX_LINES) };
}
