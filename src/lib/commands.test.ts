import { describe, expect, it } from 'vitest';
import {
  buildCommands,
  groupCommands,
  scoreCommand,
  searchCommands,
  tagCounts,
  type Command,
} from './commands';
import type { PostMeta } from './posts';

function post(slug: string, title: string, date: string, categories: string[]): PostMeta {
  return { slug, data: { title, description: 'description', date, categories } };
}

const posts: PostMeta[] = [
  post('zed-notes', 'Thoughts after using Zed', '2026-01-04', ['zed', 'productivity']),
  post('astro-blog', 'Blogging with Astro', '2025-05-17', ['blogging']),
];

function command(overrides: Partial<Command> & Pick<Command, 'id' | 'label'>): Command {
  return { group: 'actions', ...overrides };
}

describe('buildCommands', () => {
  it('builds one command per post with a route href', () => {
    const commands = buildCommands(posts);
    expect(commands.find((entry) => entry.id === 'post:zed-notes')?.href).toBe('/posts/zed-notes/');
  });

  it('builds one command per tag with a count hint and query href', () => {
    const commands = buildCommands(posts);
    const tag = commands.find((entry) => entry.id === 'tag:zed');
    expect(tag?.href).toBe('/blog/?tag=zed');
    expect(tag?.hint).toBe('1 post');
    expect(commands.find((entry) => entry.id === 'tag:productivity')?.hint).toBe('1 post');
  });

  it('encodes tag query values', () => {
    const commands = buildCommands([post('x', 'X', '2026-01-01', ['data engineering'])]);
    expect(commands.find((entry) => entry.id === 'tag:data engineering')?.href).toBe(
      '/blog/?tag=data+engineering',
    );
  });

  it('keeps navigation and social commands when no posts are known', () => {
    const ids = buildCommands([]).map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'nav:home',
        'nav:blog',
        'nav:about',
        'nav:rss',
        'nav:back',
        'social:github',
        'social:bluesky',
        'social:x',
        'social:linkedin',
      ]),
    );
    expect(ids.some((id) => id.startsWith('post:'))).toBe(false);
    expect(ids.some((id) => id.startsWith('tag:'))).toBe(false);
  });
});

describe('tagCounts', () => {
  it('counts every category', () => {
    expect([...tagCounts(posts).entries()]).toEqual([
      ['zed', 1],
      ['productivity', 1],
      ['blogging', 1],
    ]);
  });
});

describe('scoreCommand and searchCommands', () => {
  const commands: Command[] = [
    command({ id: 'nav:blog', label: 'blog', group: 'navigate' }),
    command({ id: 'tag:blogging', label: '#blogging', group: 'tags', keywords: ['tag', 'blog'] }),
    command({ id: 'post:blogging', label: 'Blogging with Astro', group: 'posts' }),
    command({
      id: 'social:github',
      label: 'GitHub',
      group: 'actions',
      keywords: ['code', 'repos'],
    }),
  ];

  it('ranks exact matches above prefixes above substrings', () => {
    expect(searchCommands(commands, 'blog').map((entry) => entry.id)).toEqual([
      'nav:blog',
      'post:blogging',
      'tag:blogging',
    ]);
  });

  it('matches labels and keywords case-insensitively', () => {
    expect(searchCommands(commands, 'GITHUB').map((entry) => entry.id)).toEqual(['social:github']);
    expect(searchCommands(commands, 'repos').map((entry) => entry.id)).toEqual(['social:github']);
  });

  it('returns every command for an empty query', () => {
    expect(searchCommands(commands, '   ')).toHaveLength(commands.length);
  });

  it('drops commands that do not match', () => {
    expect(searchCommands(commands, 'zzz')).toEqual([]);
  });

  it('scores exact labels highest', () => {
    expect(scoreCommand('blog', commands[0])).toBeGreaterThan(scoreCommand('blog', commands[3]));
  });
});

describe('groupCommands', () => {
  it('returns non-empty groups in registry order', () => {
    const blocks = groupCommands(buildCommands(posts));
    expect(blocks.map((block) => block.group)).toEqual(['posts', 'tags', 'navigate', 'actions']);
  });
});
