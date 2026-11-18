import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendLine, load, MAX_LINES, save, type ShellState } from './state';

function storageStub(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('tn-shell', initial);
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('shell state', () => {
  it('saves and loads valid state', () => {
    vi.stubGlobal('localStorage', storageStub());
    const state: ShellState = {
      cwd: '~/blog',
      history: ['pwd', 'ls'],
      lines: [{ kind: 'output', text: '~/blog' }],
    };

    save(state);

    expect(load()).toEqual(state);
  });

  it('rejects malformed JSON and unsupported state versions', () => {
    vi.stubGlobal('localStorage', storageStub('{'));
    expect(load()).toEqual({ cwd: '~', history: [], lines: [] });

    vi.stubGlobal(
      'localStorage',
      storageStub(JSON.stringify({ version: 2, state: { cwd: '~/blog', history: [], lines: [] } })),
    );
    expect(load()).toEqual({ cwd: '~', history: [], lines: [] });
  });

  it('rejects malformed state entries', () => {
    vi.stubGlobal(
      'localStorage',
      storageStub(
        JSON.stringify({
          version: 1,
          state: { cwd: '~/blog', history: ['pwd'], lines: [{ kind: 'unknown', text: 'bad' }] },
        }),
      ),
    );
    expect(load()).toEqual({ cwd: '~', history: [], lines: [] });
  });

  it('caps appended lines at 200 by dropping the oldest lines', () => {
    const state: ShellState = { cwd: '~', history: [], lines: [] };
    const capped = Array.from({ length: MAX_LINES + 2 }).reduce<ShellState>(
      (current, _, index) => appendLine(current, { kind: 'output', text: String(index) }),
      state,
    );

    expect(capped.lines).toHaveLength(MAX_LINES);
    expect(capped.lines[0]?.text).toBe('2');
    expect(capped.lines.at(-1)?.text).toBe(String(MAX_LINES + 1));
  });
});
