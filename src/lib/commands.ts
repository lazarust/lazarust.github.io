import { formatPostDate } from './dates';
import type { PostMeta } from './posts';

export type CommandGroup = 'posts' | 'tags' | 'navigate' | 'actions';

export type CommandContext = {
  navigate: (href: string) => void;
  openExternal: (href: string) => void;
  openPalette: (mode: 'search' | 'help') => void;
  openShell: () => void;
};

export type Command = {
  id: string;
  label: string;
  group: CommandGroup;
  hint?: string;
  keywords?: string[];
  href?: string;
  run?: (context: CommandContext) => void;
};

export type CommandBlock = {
  group: CommandGroup;
  commands: Command[];
};

export type ThemeName = 'night' | 'storm' | 'moon' | 'day';

export function setTheme(name: ThemeName): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = name;
  try {
    localStorage.setItem('tn-theme', name);
  } catch {}
}

export const GROUP_ORDER: readonly CommandGroup[] = ['posts', 'tags', 'navigate', 'actions'];

const NAVIGATION: readonly Command[] = [
  { id: 'nav:home', label: 'home', group: 'navigate', keywords: ['index', 'start'], href: '/' },
  {
    id: 'nav:blog',
    label: 'blog',
    group: 'navigate',
    keywords: ['posts', 'archive'],
    href: '/blog/',
  },
  {
    id: 'nav:about',
    label: 'about',
    group: 'navigate',
    keywords: ['bio', 'me'],
    href: '/about/',
  },
  {
    id: 'nav:rss',
    label: 'rss',
    group: 'navigate',
    keywords: ['feed', 'subscribe'],
    href: '/rss.xml',
  },
  {
    id: 'nav:back',
    label: 'back',
    group: 'navigate',
    hint: 'browser history',
    keywords: ['history', 'previous'],
    run: (context) => {
      if (window.history.length > 1) window.history.back();
      else context.navigate('/blog/');
    },
  },
];

const ACTIONS: readonly Command[] = [
  {
    id: 'shell:open',
    label: 'Open terminal',
    group: 'actions',
    keywords: ['shell', 'terminal'],
    run: (context) => context.openShell(),
  },
  {
    id: 'social:github',
    label: 'GitHub',
    group: 'actions',
    hint: 'github.com/lazarust',
    keywords: ['code', 'repos'],
    href: 'https://github.com/lazarust',
  },
  {
    id: 'social:bluesky',
    label: 'Bluesky',
    group: 'actions',
    hint: '@lazarust',
    keywords: ['social', 'bsky'],
    href: 'https://bsky.app/profile/lazarust.bsky.social',
  },
  {
    id: 'social:x',
    label: 'X',
    group: 'actions',
    hint: '@lazarustda',
    keywords: ['twitter', 'social'],
    href: 'https://twitter.com/lazarustda',
  },
  {
    id: 'social:linkedin',
    label: 'LinkedIn',
    group: 'actions',
    hint: 'td-lazarus',
    keywords: ['work', 'social'],
    href: 'https://www.linkedin.com/in/td-lazarus',
  },
  {
    id: 'theme:night',
    label: 'Theme: night',
    group: 'actions',
    keywords: ['theme', 'dark'],
    run: () => setTheme('night'),
  },
  {
    id: 'theme:storm',
    label: 'Theme: storm',
    group: 'actions',
    keywords: ['theme', 'dark'],
    run: () => setTheme('storm'),
  },
  {
    id: 'theme:moon',
    label: 'Theme: moon',
    group: 'actions',
    keywords: ['theme', 'dark'],
    run: () => setTheme('moon'),
  },
  {
    id: 'theme:day',
    label: 'Theme: day',
    group: 'actions',
    keywords: ['theme', 'light'],
    run: () => setTheme('day'),
  },
];

export function tagCounts(posts: readonly PostMeta[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const category of post.data.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildCommands(posts: readonly PostMeta[]): Command[] {
  const postCommands: Command[] = posts.map((post) => ({
    id: `post:${post.slug}`,
    label: post.data.title,
    group: 'posts',
    hint: `${formatPostDate(post.data.date, 'short')}, ${formatPostDate(post.data.date, 'year')}`,
    keywords: [post.slug, ...post.data.categories],
    href: `/posts/${post.slug}/`,
  }));

  const counts = tagCounts(posts);
  const tagCommands: Command[] = [...counts.keys()].sort().map((tag) => {
    const count = counts.get(tag) ?? 0;
    return {
      id: `tag:${tag}`,
      label: `#${tag}`,
      group: 'tags',
      hint: `${count} ${count === 1 ? 'post' : 'posts'}`,
      keywords: ['tag', tag],
      href: `/blog/?${new URLSearchParams({ tag }).toString()}`,
    };
  });

  return [...postCommands, ...tagCommands, ...NAVIGATION, ...ACTIONS];
}

export function groupCommands(commands: readonly Command[]): CommandBlock[] {
  return GROUP_ORDER.map((group) => ({
    group,
    commands: commands.filter((command) => command.group === group),
  })).filter((block) => block.commands.length > 0);
}

function wordPrefix(text: string, query: string): boolean {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((word) => word.startsWith(query));
}

export function scoreCommand(query: string, command: Command): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;

  const label = command.label.toLowerCase();
  const keywords = (command.keywords ?? []).map((keyword) => keyword.toLowerCase());

  if (label === needle) return 1000;
  if (label.startsWith(needle)) return 900;
  if (wordPrefix(command.label, needle)) return 800;
  if (keywords.includes(needle)) return 700;
  if (keywords.some((keyword) => keyword.startsWith(needle))) return 600;
  if (label.includes(needle)) return 500;
  if (keywords.some((keyword) => keyword.includes(needle))) return 400;
  return -1;
}

export function searchCommands(commands: readonly Command[], query: string): Command[] {
  if (!query.trim()) return [...commands];

  return commands
    .map((command) => ({ command, score: scoreCommand(query, command) }))
    .filter((entry) => entry.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.command.label.length - b.command.label.length ||
        a.command.label.localeCompare(b.command.label),
    )
    .map((entry) => entry.command);
}
