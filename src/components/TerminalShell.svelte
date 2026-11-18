<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { setTheme, type ThemeName, buildCommands } from '../lib/commands';
  import { formatPostDate } from '../lib/dates';
  import { isExternal, navigate, openExternal } from '../lib/navigate';
  import { loadPosts } from '../lib/postIndex';
  import { appendLine, load, MAX_HISTORY, save, type ShellLine } from '../lib/shell/state';
  import { parse } from '../lib/shell/parse';
  import { buildTree, completePath, listChildren, resolvePath, type Node } from '../lib/shell/vfs';
  import type { PostMeta } from '../lib/posts';

  interface Props {
    mode: 'page' | 'overlay';
    onclose?: () => void;
  }

  let { mode, onclose }: Props = $props();

  const THEME_NAMES: ThemeName[] = ['night', 'storm', 'moon', 'day'];
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
    clear: 'clear — clear the terminal log',
    help: 'help — list available commands',
    man: 'man <cmd> — show command usage',
    ':q': ':q — show the unsaved-change message',
    ':wq': ':wq — show the static-site message',
  };

  let shellState = $state(load());
  let posts = $state<PostMeta[]>([]);
  let root = $state<Node>(buildTree([]));
  let commandInput = $state('');
  let inputElement = $state<HTMLInputElement>();
  let logElement = $state<HTMLDivElement>();
  let dialog = $state<HTMLDialogElement>();
  let status = $state('');
  let historyIndex = $state<number | null>(null);
  let commands = $derived(buildCommands(posts));

  onMount(() => {
    if (mode === 'overlay' && dialog && !dialog.open) dialog.showModal();
    if (mode === 'page') inputElement?.focus();

    let alive = true;
    loadPosts()
      .then((loaded) => {
        if (!alive) return;
        posts = loaded;
        root = buildTree(loaded);
        if ('error' in resolvePath(root, '~', shellState.cwd)) {
          shellState = { ...shellState, cwd: '~' };
          save(shellState);
        }
      })
      .catch(() => {
        if (alive) status = 'Post index unavailable.';
      });

    return () => {
      alive = false;
      if (dialog?.open) dialog.close();
    };
  });

  function addLine(kind: ShellLine['kind'], text: string): void {
    shellState = appendLine(shellState, { kind, text });
    save(shellState);
  }

  async function scrollToBottom(): Promise<void> {
    await tick();
    if (logElement) logElement.scrollTop = logElement.scrollHeight;
  }

  function summarize(text: string): void {
    status = text.split('\n')[0] ?? '';
  }

  function entriesText(node: Node, long: boolean): string {
    const entries = listChildren(node);
    if (!long)
      return entries.map((entry) => `${entry.name}${entry.kind === 'dir' ? '/' : ''}`).join('  ');

    return entries
      .map((entry) => {
        const date = entry.post ? formatPostDate(entry.post.data.date, 'short') : '';
        const tags = entry.post ? entry.post.data.categories.map((tag) => `#${tag}`).join(' ') : '';
        const name = `${entry.name}${entry.kind === 'dir' ? '/' : ''}`;
        return [date, tags, name].filter(Boolean).join('  ');
      })
      .join('\n');
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

  function printUnknown(name: string): string {
    const suggestion = nearestCommand(name);
    const text = `command not found: ${name}${suggestion ? `\ndid you mean: ${suggestion}` : ''}`;
    addLine('error', `command not found: ${name}`);
    if (suggestion) addLine('output', `did you mean: ${suggestion}`);
    return text;
  }

  function getTheme(): string {
    if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
      return document.documentElement.dataset.theme;
    }
    try {
      return localStorage.getItem('tn-theme') ?? 'night';
    } catch {
      return 'night';
    }
  }

  function routeFor(node: Node, path: string): string | null {
    if (node.href) return node.href;
    if (node.post) {
      return commands.find((command) => command.id === `post:${node.post?.slug}`)?.href ?? null;
    }
    if (node.kind === 'dir' && node.name === 'blog') return '/blog/';
    if (node.kind === 'dir') {
      return `/blog/?${new URLSearchParams({ tag: node.name }).toString()}`;
    }
    if (path === '~/about.md') return '/about/';
    if (path === '~/rss.xml') return '/rss.xml';
    return null;
  }

  async function run(commandLine: string): Promise<string> {
    const { command: rawCommand, args } = parse(commandLine);
    const command = rawCommand.toLowerCase();
    if (!command) return '';

    switch (command) {
      case 'ls': {
        const long = args.includes('-l');
        const target = args.find((arg) => arg !== '-l') ?? '.';
        const resolved = resolvePath(root, shellState.cwd, target);
        if ('error' in resolved) {
          addLine('error', `ls: ${resolved.error}`);
          return `ls: ${resolved.error}`;
        }
        if (resolved.node.kind !== 'dir') {
          addLine('error', `ls: not a directory: ${target}`);
          return `ls: not a directory: ${target}`;
        }
        const text = entriesText(resolved.node, long);
        if (text) addLine('output', text);
        else addLine('output', '(empty)');
        return `${listChildren(resolved.node).length} items`;
      }
      case 'cd': {
        const target = args[0];
        const resolved = target ? resolvePath(root, shellState.cwd, target) : null;
        if (!target || !resolved || 'error' in resolved || resolved.node.kind !== 'dir') {
          const text = `cd: no such directory: ${target ?? ''}`.trimEnd();
          addLine('error', text);
          return text;
        }
        shellState = { ...shellState, cwd: resolved.path };
        save(shellState);
        addLine('output', shellState.cwd);
        return shellState.cwd;
      }
      case 'pwd':
        addLine('output', shellState.cwd);
        return shellState.cwd;
      case 'cat': {
        const target = args[0];
        const resolved = target ? resolvePath(root, shellState.cwd, target) : null;
        if (!target || !resolved || 'error' in resolved || resolved.node.kind !== 'file') {
          const text = `cat: no such file: ${target ?? ''}`.trimEnd();
          addLine('error', text);
          return text;
        }
        if (!resolved.node.post) {
          const text = `cat: use open ${resolved.node.name} to view this route`;
          addLine('error', text);
          return text;
        }

        const marker = 'loading…';
        addLine('output', marker);
        const lineIndex = shellState.lines.length - 1;
        const slug = resolved.node.post.slug;
        try {
          const response = await fetch(`/posts/${slug}.json`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = (await response.json()) as { text?: unknown };
          if (typeof payload.text !== 'string') throw new Error('Invalid post response');
          const updated = [...shellState.lines];
          if (updated[lineIndex]?.text === marker) {
            updated[lineIndex] = { kind: 'output', text: payload.text };
            shellState = { ...shellState, lines: updated };
            save(shellState);
          } else {
            addLine('output', payload.text);
          }
          await scrollToBottom();
          return `printed ${slug}`;
        } catch {
          const text = `cat: unable to load ${slug}`;
          const updated = [...shellState.lines];
          if (updated[lineIndex]?.text === marker) {
            updated[lineIndex] = { kind: 'error', text };
            shellState = { ...shellState, lines: updated };
            save(shellState);
          } else {
            addLine('error', text);
          }
          return text;
        }
      }
      case 'open': {
        const target = args[0];
        if (!target) {
          addLine('error', 'open: usage: open <path|url>');
          return 'open: usage: open <path|url>';
        }
        if (isExternal(target)) {
          openExternal(target);
          addLine('output', `opened ${target}`);
          return `opened ${target}`;
        }
        const resolved = resolvePath(root, shellState.cwd, target);
        if ('error' in resolved) {
          if (target.startsWith('/')) {
            navigate(target);
            addLine('output', `opened ${target}`);
            return `opened ${target}`;
          }
          addLine('error', `open: ${resolved.error}`);
          return `open: ${resolved.error}`;
        }
        const href = routeFor(resolved.node, resolved.path);
        if (!href) {
          addLine('error', `open: no route for ${target}`);
          return `open: no route for ${target}`;
        }
        navigate(href);
        addLine('output', `opened ${href.replace(/^\//, '')}`);
        return `opened ${href.replace(/^\//, '')}`;
      }
      case 'grep': {
        const term = args.join(' ');
        if (!term) {
          addLine('error', 'grep: usage: grep <term>');
          return 'grep: usage: grep <term>';
        }
        const matches = posts.filter((post) =>
          [post.data.title, post.data.description, ...post.data.categories].some((value) =>
            value.includes(term),
          ),
        );
        const text = matches.map((post) => post.slug).join('\n') || 'no matches';
        addLine('output', text);
        return `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
      }
      case 'theme': {
        if (args.length === 0) {
          const current = getTheme();
          const text = `current: ${current}\nvalid: ${THEME_NAMES.join(', ')}`;
          addLine('output', text);
          return `theme ${current}`;
        }
        const name = args[0] as ThemeName;
        if (!THEME_NAMES.includes(name)) {
          const text = `theme: invalid theme: ${args[0]}\nvalid: ${THEME_NAMES.join(', ')}`;
          addLine('error', text);
          return text;
        }
        setTheme(name);
        addLine('output', `theme set to ${name}`);
        return `theme set to ${name}`;
      }
      case 'history': {
        const text =
          shellState.history
            .slice(0, -1)
            .map((entry, index) => `${index + 1}  ${entry}`)
            .join('\n') || '(empty)';
        addLine('output', text);
        return `${shellState.history.length > 1 ? shellState.history.length - 1 : 0} commands`;
      }
      case 'clear':
        shellState = { ...shellState, lines: [] };
        save(shellState);
        return 'cleared';
      case 'help': {
        const text = COMMANDS.map((name) => MANUAL[name]).join('\n');
        addLine('output', text);
        return `${COMMANDS.length} commands`;
      }
      case 'man': {
        const text = MANUAL[args[0] ?? ''];
        if (!text) {
          const error = `man: no manual entry for ${args[0] ?? ''}`.trimEnd();
          addLine('error', error);
          return error;
        }
        addLine('output', text);
        return `manual: ${args[0]}`;
      }
      case ':q':
        addLine('error', 'E37: No write since last change (add ! to override)');
        return 'E37: No write since last change (add ! to override)';
      case ':wq':
        addLine('output', 'this is a static site');
        return 'this is a static site';
      default:
        return printUnknown(rawCommand);
    }
  }

  async function submit(): Promise<void> {
    const value = commandInput.trim();
    if (!value) return;
    commandInput = '';
    historyIndex = null;
    addLine('input', `${shellState.cwd} $ ${value}`);
    shellState = {
      ...shellState,
      history: [...shellState.history, value].slice(-MAX_HISTORY),
    };
    save(shellState);
    const summary = await run(value);
    summarize(summary);
    await scrollToBottom();
    inputElement?.focus();
  }

  function closeDialog(): void {
    if (dialog?.open) dialog.close();
    else onclose?.();
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (shellState.history.length === 0) return;
      historyIndex = Math.max(0, (historyIndex ?? shellState.history.length) - 1);
      commandInput = shellState.history[historyIndex] ?? '';
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === null) return;
      historyIndex += 1;
      if (historyIndex >= shellState.history.length) {
        historyIndex = null;
        commandInput = '';
      } else {
        commandInput = shellState.history[historyIndex] ?? '';
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const separator = commandInput.lastIndexOf(' ');
      const prefix = commandInput.slice(separator + 1);
      const matches = completePath(root, shellState.cwd, prefix);
      if (matches.length === 1)
        commandInput = `${commandInput.slice(0, separator + 1)}${matches[0]}`;
      else if (matches.length > 1) {
        addLine('output', matches.join('  '));
        void scrollToBottom();
      }
    } else if (event.key === 'Escape' && mode === 'overlay') {
      event.preventDefault();
      closeDialog();
    } else if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
      event.preventDefault();
      shellState = { ...shellState, lines: [] };
      save(shellState);
      status = 'cleared';
    }
  }

  function handleDialogClose(): void {
    onclose?.();
  }
</script>

{#if mode === 'overlay'}
  <dialog bind:this={dialog} class="shell-dialog" onclose={handleDialogClose}>
    <section class="shell">
      {@render shellContent()}
    </section>
  </dialog>
{:else}
  <section class="shell">
    {@render shellContent()}
  </section>
{/if}

{#snippet shellContent()}
  <div bind:this={logElement} class="shell-log" role="log" aria-live="off">
    {#each shellState.lines as line, index (`${index}-${line.text}`)}
      <p class="shell-line" class:shell-error={line.kind === 'error'}>{line.text}</p>
    {/each}
  </div>
  <form
    class="shell-input-row"
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    <label class="prompt-line shell-prompt" for="terminal-command">
      <span class="prompt-user">{shellState.cwd}</span>
      <span class="prompt-sep">$</span>
    </label>
    <input
      bind:this={inputElement}
      bind:value={commandInput}
      id="terminal-command"
      class="prompt-cmd shell-input"
      type="text"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      aria-label="Terminal command"
      onkeydown={handleInputKeydown}
    />
  </form>
  <p class="sr-only" role="status">{status}</p>
{/snippet}
