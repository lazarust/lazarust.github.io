import { buildCommands, type CommandContext } from './commands';
import { resolve, type KeyMode } from './keymap';
import { isExternal, navigate, openExternal } from './navigate';

type PaletteMode = 'search' | 'help';
type DispatchMode = KeyMode | 'modal';

const TYPING_SELECTOR =
  'input, textarea, select, [contenteditable], [role="textbox"], [role="searchbox"], [role="combobox"]';
const ITEM_SELECTOR = '[data-list-item], [data-nav-item]';
const LIST_SELECTOR = '[data-list-item]';
const INSTALL_KEY = '__terminalKeyboardInstalled';

let mode: DispatchMode = 'normal';
let lastKey: string | null = null;
let lastKeyAt = 0;
let paletteOpen = false;
let opening = false;
let mountedPaletteClose: (() => void) | null = null;
let shellOpen = false;
let openingShell = false;
let mountedShellClose: (() => void) | null = null;

const REGISTRY = new Map(buildCommands([]).map((command) => [command.id, command]));
const CONTEXT: CommandContext = {
  navigate,
  openExternal,
  openPalette: (paletteMode) => void openPalette(paletteMode),
  openShell: () => void openShell(),
};

export async function openPalette(paletteMode: PaletteMode = 'search'): Promise<void> {
  if (typeof document === 'undefined' || paletteOpen || opening) return;

  opening = true;
  const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let host: HTMLElement | null = null;

  try {
    const [{ mount, unmount }, { default: CommandPalette }] = await Promise.all([
      import('svelte'),
      import('../components/CommandPalette.svelte'),
    ]);

    host = document.createElement('div');
    host.className = 'palette-host';
    document.body.append(host);
    const container = host;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      unmount(app);
      container.remove();
      paletteOpen = false;
      mode = 'normal';
      lastKey = null;
      if (mountedPaletteClose === close) mountedPaletteClose = null;
      if (restoreTo?.isConnected) restoreTo.focus();
    };
    const app = mount(CommandPalette, {
      target: host,
      props: {
        mode: paletteMode,
        onclose: close,
      },
    });

    mountedPaletteClose = close;
    paletteOpen = true;
    mode = 'modal';
    lastKey = null;
  } catch (error) {
    host?.remove();
    console.error('Unable to open the command palette', error);
    mode = 'normal';
  } finally {
    opening = false;
  }
}

export function closePalette(): void {
  mountedPaletteClose?.();
}

export async function openShell(): Promise<void> {
  if (typeof document === 'undefined' || shellOpen || openingShell) return;

  openingShell = true;
  const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let host: HTMLElement | null = null;

  try {
    const [{ mount, unmount }, { default: TerminalShell }] = await Promise.all([
      import('svelte'),
      import('../components/TerminalShell.svelte'),
    ]);

    host = document.createElement('div');
    host.className = 'shell-host';
    document.body.append(host);
    const container = host;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      unmount(app);
      container.remove();
      shellOpen = false;
      mode = 'normal';
      lastKey = null;
      if (mountedShellClose === close) mountedShellClose = null;
      if (restoreTo?.isConnected) restoreTo.focus();
    };
    const app = mount(TerminalShell, {
      target: host,
      props: {
        mode: 'overlay',
        onclose: close,
      },
    });

    mountedShellClose = close;
    shellOpen = true;
    mode = 'modal';
    lastKey = null;
  } catch (error) {
    host?.remove();
    console.error('Unable to open the terminal shell', error);
    mode = 'normal';
  } finally {
    openingShell = false;
  }
}

export function closeShell(): void {
  mountedShellClose?.();
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_SELECTOR) !== null;
}

function listItems(): HTMLElement[] {
  const listed = [...document.querySelectorAll<HTMLElement>(LIST_SELECTOR)];
  if (listed.length > 0) return listed;
  return [...document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)];
}

function focusItem(items: HTMLElement[], index: number): void {
  const item = items[Math.max(0, Math.min(index, items.length - 1))];
  item.focus();
  item.scrollIntoView({ block: 'nearest' });
}

function currentIndex(items: HTMLElement[]): number {
  return document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1;
}

function enterList(direction: 1 | -1): void {
  const items = listItems();
  if (items.length === 0) return;

  mode = 'list';
  const index = currentIndex(items);
  focusItem(items, index === -1 ? (direction === 1 ? 0 : items.length - 1) : index + direction);
}

function moveList(delta: 1 | -1): void {
  const items = listItems();
  if (items.length === 0) {
    mode = 'normal';
    return;
  }

  const index = currentIndex(items);
  focusItem(items, index === -1 ? 0 : index + delta);
}

function execute(commandId: string): void {
  switch (commandId) {
    case 'palette:search':
      void openPalette('search');
      return;
    case 'palette:help':
      void openPalette('help');
      return;
    case 'shell:open':
      void openShell();
      return;
    case 'list:enter':
      enterList(1);
      return;
    case 'list:enter-last':
      enterList(-1);
      return;
    case 'list:next':
      moveList(1);
      return;
    case 'list:prev':
      moveList(-1);
      return;
    case 'list:exit':
      mode = 'normal';
      return;
  }

  const command = REGISTRY.get(commandId);
  if (!command) return;

  if (command.href) {
    if (isExternal(command.href)) openExternal(command.href);
    else navigate(command.href);
    return;
  }

  command.run?.(CONTEXT);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.repeat || event.isComposing) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (mode === 'modal' || isTypingTarget(event.target)) return;

  const now = performance.now();
  const result = resolve(mode, event.key, lastKey, now - lastKeyAt);

  if (result.type === 'match') {
    lastKey = null;
    event.preventDefault();
    execute(result.binding.command);
    return;
  }

  if (result.type === 'pending') {
    lastKey = event.key;
    lastKeyAt = now;
    return;
  }

  lastKey = null;
  if (event.key === 'Tab' && mode === 'list') mode = 'normal';
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;

  if (
    mode === 'list' &&
    !(event.target instanceof Element && event.target.closest(LIST_SELECTOR))
  ) {
    mode = 'normal';
  }

  const trigger =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-open-palette]')
      : null;
  if (!trigger) return;
  void openPalette(trigger.dataset.openPalette === 'help' ? 'help' : 'search');
}

type KeyboardWindow = Window & { [INSTALL_KEY]?: boolean };

function install(): void {
  if (typeof document === 'undefined') return;

  const scope = window as KeyboardWindow;
  if (scope[INSTALL_KEY]) return;
  scope[INSTALL_KEY] = true;

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClick);
  document.addEventListener('astro:before-swap', () => {
    closePalette();
    closeShell();
    mode = 'normal';
    lastKey = null;
  });
  document.addEventListener('astro:page-load', () => {
    mode = 'normal';
    lastKey = null;
  });
  const applyTheme = () => {
    try {
      const theme = localStorage.getItem('tn-theme');
      if (theme) document.documentElement.dataset.theme = theme;
    } catch {}
  };
  document.addEventListener('astro:after-swap', applyTheme);
}

install();
