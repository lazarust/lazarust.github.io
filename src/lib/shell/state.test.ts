import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, save } from './state';

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
  it('saves and loads the working directory only', () => {
    const storage = storageStub();
    vi.stubGlobal('localStorage', storage);

    save({ cwd: '~/blog' });

    expect(load()).toEqual({ cwd: '~/blog' });
    expect(JSON.parse(storage.getItem('tn-shell') ?? '{}')).toEqual({
      version: 1,
      state: { cwd: '~/blog' },
    });
  });

  it('rejects malformed JSON and unsupported state versions', () => {
    vi.stubGlobal('localStorage', storageStub('{'));
    expect(load()).toEqual({ cwd: '~' });

    vi.stubGlobal(
      'localStorage',
      storageStub(JSON.stringify({ version: 2, state: { cwd: '~/blog' } })),
    );
    expect(load()).toEqual({ cwd: '~' });
  });

  it('rejects malformed or oversized working directories', () => {
    vi.stubGlobal(
      'localStorage',
      storageStub(JSON.stringify({ version: 1, state: { cwd: '../blog' } })),
    );
    expect(load()).toEqual({ cwd: '~' });

    vi.stubGlobal(
      'localStorage',
      storageStub(JSON.stringify({ version: 1, state: { cwd: `~/${'x'.repeat(256)}` } })),
    );
    expect(load()).toEqual({ cwd: '~' });
  });

  it('does not access localStorage when it is unavailable during SSR', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(load()).toEqual({ cwd: '~' });
    expect(() => save({ cwd: '~/blog' })).not.toThrow();
  });
});
