import { setTheme, type ThemeName, buildCommands } from '../commands';
import { formatPostDate } from '../dates';
import { isExternal, navigate, openExternal } from '../navigate';
import type { PostMeta } from '../posts';
import { parse } from './parse';
import { save } from './state';
import { listChildren, resolvePath, type Node } from './vfs';

type TerminalInstance = {
  clear: () => void;
  echo: (text: string) => unknown;
  history: () => { data: () => string[] };
  set_prompt: (prompt: string) => unknown;
};

type Result = { text: string; error?: boolean };

export type InterpreterOptions = {
  getCwd: () => string;
  setCwd: (cwd: string) => void;
  getRoot: () => Node;
  getPosts: () => PostMeta[];
  mode: 'page' | 'overlay';
  onExit: () => void;
  announce: (text: string) => void;
};

const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  cyan: '\u001b[36m',
  highlight: '\u001b[30;43m',
};

const COMMANDS = [
  'ls',
  'cd',
  'pwd',
  'cat',
  'open',
  'grep',
  'theme',
  'history',
  'clear',
  'help',
  'man',
  ':q',
  ':wq',
  'exit',
];
const MANUAL: Record<string, string> = {
  ls: 'ls [-l] [path] — list directory entries',
  cd: 'cd <path> — change the shell working directory',
  pwd: 'pwd — print the shell working directory',
  cat: 'cat <path> — print a post’s Markdown text',
  open: 'open <path|url> — navigate to a site route or open an external URL',
  grep: 'grep <term> — search post titles, descriptions, and categories',
  theme: 'theme [name] — show or set the theme',
  history: 'history — print previous commands',
  clear: 'clear — clear the terminal scrollback',
  help: 'help — list available commands',
  man: 'man <cmd> — show command usage',
  ':q': ':q — show the unsaved-change message',
  ':wq': ':wq — show the static-site message',
  exit: 'exit — close the overlay terminal',
};

function color(text: string, code: string): string {
  return `${code}${text}${ANSI.reset}`;
}

function promptFor(cwd: string): string {
  return `${color(cwd, ANSI.green)} $ `;
}

function nearestCommand(name: string): string | null {
  const lower = name.toLowerCase();
  const distances = COMMANDS.map((candidate) => {
    const other = candidate.toLowerCase();
    const row = Array.from({ length: other.length + 1 }, (_, index) => index);
    for (let i = 1; i <= lower.length; i += 1) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= other.length; j += 1) {
        const above = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          diagonal + Number(lower[i - 1] !== other[j - 1]),
        );
        diagonal = above;
      }
    }
    return { candidate, distance: row[other.length] };
  }).sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate));

  if (distances[0]?.candidate.toLowerCase().startsWith(lower)) return distances[0].candidate;
  return (distances[0]?.distance ?? Infinity) <= 2 ? distances[0].candidate : null;
}

function linkify(text: string): string {
  return text.replace(/https?:\/\/[^\s)]+/g, (url) => `[[!;;;;${url}]${url}]`);
}

function terminalLink(href: string, label: string): string {
  return `[[!;;;;${href}]${label}]`;
}

function markdown(text: string): string {
  let inCode = false;
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) {
        inCode = !inCode;
        return color(line, ANSI.dim);
      }
      if (inCode) return color(line, ANSI.dim);
      const heading = line.match(/^#{1,6}\s+(.+)$/);
      return heading ? color(heading[1], ANSI.bold) : linkify(line);
    })
    .join('\n');
}

function highlight(text: string, term: string): string {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), (match) => color(match, ANSI.highlight));
}

function listOutput(node: Node, long: boolean): string {
  return listChildren(node)
    .map((entry) => {
      const name = `${entry.name}${entry.kind === 'dir' ? '/' : ''}`;
      if (!long) return entry.kind === 'dir' ? color(name, ANSI.blue) : name;
      const date = entry.post ? formatPostDate(entry.post.data.date, 'short') : '';
      const tags = entry.post ? entry.post.data.categories.map((tag) => `#${tag}`).join(' ') : '';
      const details = [
        date && color(date, ANSI.dim),
        tags,
        entry.kind === 'dir' ? color(name, ANSI.blue) : name,
      ];
      return details.filter(Boolean).join('  ');
    })
    .join('\n');
}

function formatHelp(): string {
  const nameWidth = Math.max(...COMMANDS.map((name) => name.length));
  return COMMANDS.map(
    (name) =>
      `${color(name.padEnd(nameWidth), ANSI.cyan)}  ${MANUAL[name]!.slice(name.length + 1)}`,
  ).join('\n');
}

export function createInterpreter(options: InterpreterOptions) {
  const themeNames: ThemeName[] = ['night', 'storm', 'moon', 'day'];

  return async (commandLine: string, terminal: TerminalInstance): Promise<void> => {
    const { command: rawCommand, args } = parse(commandLine);
    const command = rawCommand.toLowerCase();
    if (!command) return;

    let result: Result = { text: '' };
    const cwd = options.getCwd();
    const root = options.getRoot();

    switch (command) {
      case 'ls': {
        const long = args.includes('-l');
        const target = args.find((arg) => arg !== '-l') ?? '.';
        const resolved = resolvePath(root, cwd, target);
        if ('error' in resolved) result = { text: `ls: ${resolved.error}`, error: true };
        else if (resolved.node.kind !== 'dir')
          result = { text: `ls: not a directory: ${target}`, error: true };
        else result = { text: listOutput(resolved.node, long) || '(empty)' };
        break;
      }
      case 'cd': {
        const target = args[0];
        const resolved = target ? resolvePath(root, cwd, target) : null;
        if (!target || !resolved || 'error' in resolved || resolved.node.kind !== 'dir') {
          result = { text: `cd: no such directory: ${target ?? ''}`.trimEnd(), error: true };
          break;
        }
        options.setCwd(resolved.path);
        save({ cwd: resolved.path });
        terminal.set_prompt(promptFor(resolved.path));
        result = { text: resolved.path };
        break;
      }
      case 'pwd':
        result = { text: cwd };
        break;
      case 'cat': {
        const target = args[0];
        const resolved = target ? resolvePath(root, cwd, target) : null;
        if (!target || !resolved || 'error' in resolved || resolved.node.kind !== 'file') {
          result = { text: `cat: no such file: ${target ?? ''}`.trimEnd(), error: true };
          break;
        }
        if (!resolved.node.post) {
          result = { text: `cat: use open ${resolved.node.name} to view this route`, error: true };
          break;
        }
        try {
          const response = await fetch(`/posts/${resolved.node.post.slug}.json`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = (await response.json()) as { text?: unknown };
          if (typeof payload.text !== 'string') throw new Error('Invalid post response');
          result = { text: markdown(payload.text) };
        } catch {
          result = { text: `cat: unable to load ${resolved.node.post.slug}`, error: true };
        }
        break;
      }
      case 'open': {
        const target = args[0];
        if (!target) {
          result = { text: 'open: usage: open <path|url>', error: true };
          break;
        }
        if (isExternal(target)) {
          openExternal(target);
          result = { text: `opened ${terminalLink(target, target)}` };
          break;
        }
        const resolved = resolvePath(root, cwd, target);
        if ('error' in resolved) {
          if (target.startsWith('/')) {
            navigate(target);
            result = { text: `opened ${terminalLink(target, target)}` };
          } else result = { text: `open: ${resolved.error}`, error: true };
          break;
        }
        const href =
          resolved.node.href ??
          (resolved.node.post
            ? buildCommands(options.getPosts()).find(
                (entry) => entry.id === `post:${resolved.node.post?.slug}`,
              )?.href
            : resolved.node.kind === 'dir' && resolved.node.name === 'blog'
              ? '/blog/'
              : resolved.node.kind === 'dir'
                ? `/blog/?${new URLSearchParams({ tag: resolved.node.name })}`
                : resolved.path === '~/about.md'
                  ? '/about/'
                  : resolved.path === '~/rss.xml'
                    ? '/rss.xml'
                    : null);
        if (!href) {
          result = { text: `open: no route for ${target}`, error: true };
          break;
        }
        navigate(href);
        result = { text: `opened ${terminalLink(href, href.replace(/^\//, ''))}` };
        break;
      }
      case 'grep': {
        const term = args.join(' ');
        if (!term) {
          result = { text: 'grep: usage: grep <term>', error: true };
          break;
        }
        const matches = options
          .getPosts()
          .filter((post) =>
            [post.data.title, post.data.description, ...post.data.categories].some((value) =>
              value.toLowerCase().includes(term.toLowerCase()),
            ),
          );
        result = {
          text:
            matches
              .map((post) => `${post.slug} — ${highlight(post.data.title, term)}`)
              .join('\n') || 'no matches',
        };
        break;
      }
      case 'theme': {
        if (args.length === 0) {
          const current = document.documentElement.dataset.theme ?? 'night';
          result = { text: `current: ${current}\nvalid: ${themeNames.join(', ')}` };
        } else if (!themeNames.includes(args[0] as ThemeName)) {
          result = {
            text: `theme: invalid theme: ${args[0]}\nvalid: ${themeNames.join(', ')}`,
            error: true,
          };
        } else {
          setTheme(args[0] as ThemeName);
          result = { text: `theme set to ${args[0]}` };
        }
        break;
      }
      case 'history': {
        const entries = terminal.history().data().slice(0, -1);
        result = {
          text: entries.map((entry, index) => `${index + 1}  ${entry}`).join('\n') || '(empty)',
        };
        break;
      }
      case 'clear':
        terminal.clear();
        result = { text: '' };
        break;
      case 'help':
        result = { text: formatHelp() };
        break;
      case 'man': {
        const name = args[0] ?? '';
        result = MANUAL[name]
          ? { text: `${color(name, ANSI.cyan)}  ${MANUAL[name]!.slice(name.length + 1)}` }
          : { text: `man: no manual entry for ${name}`.trimEnd(), error: true };
        break;
      }
      case ':q':
        result = { text: 'E37: No write since last change (add ! to override)', error: true };
        break;
      case ':wq':
        result = { text: 'this is a static site' };
        break;
      case 'exit':
        if (options.mode === 'overlay') options.onExit();
        else result = { text: 'use the classic view link to leave the terminal' };
        break;
      default: {
        const suggestion = nearestCommand(rawCommand);
        result = {
          text: `command not found: ${rawCommand}${suggestion ? `\ndid you mean: ${suggestion}` : ''}`,
          error: true,
        };
      }
    }

    if (result.text) terminal.echo(result.error ? color(result.text, ANSI.red) : result.text);
    const firstLine = result.text.replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0] ?? '';
    options.announce(`${command}: ${firstLine || (result.error ? 'error' : 'done')}`);
  };
}

export { promptFor };
