import { describe, expect, it } from 'vitest';
import { KEYMAP, SEQUENCE_TIMEOUT, resolve } from './keymap';

describe('resolve', () => {
  it('matches a single key', () => {
    const result = resolve('normal', '/', null, Number.POSITIVE_INFINITY);
    expect(result.type).toBe('match');
    if (result.type === 'match') expect(result.binding.command).toBe('palette:search');
  });

  it('resolves a sequence inside the timeout window', () => {
    const result = resolve('normal', 'i', 'g', SEQUENCE_TIMEOUT);
    expect(result.type).toBe('match');
    if (result.type === 'match') expect(result.binding.command).toBe('social:github');
  });

  it('drops a stale first key', () => {
    expect(resolve('normal', 'i', 'g', SEQUENCE_TIMEOUT + 1)).toEqual({ type: 'none' });
  });

  it('reports the start of a sequence as pending', () => {
    expect(resolve('normal', 'g', null, 0)).toEqual({ type: 'pending' });
  });

  it('reports unknown keys as none', () => {
    expect(resolve('normal', 'z', null, 0)).toEqual({ type: 'none' });
  });

  it('falls back to a single match when a sequence does not complete', () => {
    const result = resolve('normal', 'j', 'g', 100);
    expect(result.type).toBe('match');
    if (result.type === 'match') expect(result.binding.command).toBe('list:enter');
  });

  it('prefers list bindings in list mode', () => {
    const result = resolve('list', 'j', null, 0);
    expect(result.type).toBe('match');
    if (result.type === 'match') expect(result.binding.command).toBe('list:next');
  });

  it('keeps global bindings available in list mode', () => {
    const result = resolve('list', '?', null, 0);
    expect(result.type).toBe('match');
    if (result.type === 'match') expect(result.binding.command).toBe('palette:help');
  });

  it('never maps the same single key twice in a mode', () => {
    for (const bindings of Object.values(KEYMAP)) {
      const singles = bindings
        .filter((binding) => binding.keys.length === 1)
        .map((binding) => binding.keys[0]);
      expect(new Set(singles).size).toBe(singles.length);
    }
  });

  it('maps every keymap command to a non-empty label', () => {
    for (const bindings of Object.values(KEYMAP)) {
      for (const binding of bindings) {
        expect(binding.command).not.toBe('');
        expect(binding.label).not.toBe('');
      }
    }
  });
});
