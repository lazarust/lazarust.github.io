import { describe, expect, it } from 'vitest';
import type { PostMeta } from '../posts';
import { buildTree, completePath, listChildren, resolvePath } from './vfs';

function post(slug: string, categories: string[] = []): PostMeta {
  return {
    slug,
    data: { title: slug, description: `${slug} description`, date: '2026-01-01', categories },
  };
}

const root = buildTree([
  post('zed-notes', ['tools', 'writing']),
  post('astro-notes', ['tools']),
  post('alpha', []),
]);

describe('resolvePath', () => {
  it('resolves the home path and current directory', () => {
    expect(resolvePath(root, '~/blog', '~')).toMatchObject({ path: '~', node: root });
    expect(resolvePath(root, '~/blog', '.')).toMatchObject({ path: '~/blog' });
  });

  it('normalizes parent segments', () => {
    expect(resolvePath(root, '~/blog/tools', '..')).toMatchObject({ path: '~/blog' });
    expect(resolvePath(root, '~/blog', '../about.md')).toMatchObject({ path: '~/about.md' });
  });

  it('resolves absolute paths from the virtual root', () => {
    expect(resolvePath(root, '~', '/blog/zed-notes.md')).toMatchObject({
      path: '~/blog/zed-notes.md',
    });
  });

  it('returns errors for missing paths and traversal above home', () => {
    expect(resolvePath(root, '~', 'missing')).toHaveProperty('error');
    expect(resolvePath(root, '~', '..')).toHaveProperty('error');
  });
});

describe('listChildren', () => {
  it('orders directories first and alphabetically within each kind', () => {
    expect(
      listChildren(root).map((node) => `${node.name}${node.kind === 'dir' ? '/' : ''}`),
    ).toEqual(['blog/', 'about.md', 'rss.xml']);
    const blog = listChildren(root).find((node) => node.name === 'blog');
    expect(blog && listChildren(blog).map((node) => node.name)).toEqual([
      'tools',
      'writing',
      'alpha.md',
      'astro-notes.md',
      'zed-notes.md',
    ]);
  });
});

describe('completePath', () => {
  it('completes paths without depending on the command name', () => {
    expect(completePath(root, '~/blog', 'zed')).toEqual(['zed-notes.md']);
  });

  it('returns every candidate for an ambiguous prefix', () => {
    expect(completePath(root, '~/blog', 'a')).toEqual(['alpha.md', 'astro-notes.md']);
  });

  it('completes children after a directory prefix', () => {
    expect(completePath(root, '~/blog', 'tools/a')).toEqual(['tools/astro-notes.md']);
  });
});
