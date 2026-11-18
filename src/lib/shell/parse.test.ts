import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('parse', () => {
  it('supports single and double quoted arguments', () => {
    expect(parse(`cat 'zed notes.md' "with spaces"`)).toEqual({
      command: 'cat',
      args: ['zed notes.md', 'with spaces'],
    });
  });

  it('collapses multiple spaces between tokens', () => {
    expect(parse('  ls    -l   blog  ')).toEqual({ command: 'ls', args: ['-l', 'blog'] });
  });

  it('returns an empty command for empty input', () => {
    expect(parse(' \t ')).toEqual({ command: '', args: [] });
  });
});
