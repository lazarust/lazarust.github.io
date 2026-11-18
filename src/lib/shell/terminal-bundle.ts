import pluginCss from 'jquery.terminal/css/jquery.terminal.css?inline';
import $ from 'jquery';
import 'jquery.terminal';
import installUnixFormatting from 'jquery.terminal/js/unix_formatting';

type TerminalInstance = JQueryTerminal;

export type TerminalOptions = {
  prompt: string;
  interpreter: (command: string, terminal: TerminalInstance) => void | Promise<void>;
  completion: (prefix: string) => string[];
  onExit?: () => void;
};

let scopedStyles: HTMLStyleElement | null = null;
let ansiInstalled = false;
const ansiColors = {
  black: 'var(--terminal-black)',
  red: 'var(--terminal-red)',
  green: 'var(--terminal-green)',
  yellow: 'var(--terminal-yellow)',
  blue: 'var(--terminal-blue)',
  magenta: 'var(--terminal-purple)',
  cyan: 'var(--terminal-cyan)',
  white: 'var(--terminal-white)',
};

function installAnsiColors(): void {
  if (ansiInstalled) return;
  installUnixFormatting(window, $);
  $.terminal.color_names.push(...Object.values(ansiColors));
  Object.assign($.terminal.ansi_colors.normal, ansiColors);
  Object.assign($.terminal.ansi_colors.faited, ansiColors);
  Object.assign($.terminal.ansi_colors.bold, ansiColors);
  ansiInstalled = true;
}

function splitSelectors(value: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = '';

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== '\\') quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(' || character === '[') {
      depth += 1;
    } else if (character === ')' || character === ']') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      selectors.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  selectors.push(value.slice(start).trim());
  return selectors.filter(Boolean);
}

function scopeCss(css: string): string {
  let output = '';
  let index = 0;

  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open === -1) {
      output += css.slice(index);
      break;
    }

    const header = css.slice(index, open);
    let depth = 1;
    let close = open + 1;
    let quote = '';

    while (close < css.length && depth > 0) {
      const character = css[close];
      if (quote) {
        if (character === quote && css[close - 1] !== '\\') quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
      }
      close += 1;
    }

    const body = css.slice(open + 1, close - 1);
    const trimmed = header.trim();
    if (
      trimmed.startsWith('@media') ||
      trimmed.startsWith('@supports') ||
      trimmed.startsWith('@container')
    ) {
      output += `${header}{${scopeCss(body)}}`;
    } else if (trimmed.startsWith('@')) {
      output += `${header}{${body}}`;
    } else {
      const selectors = splitSelectors(header).map((selector) => {
        const scoped = selector.replace(
          /(^|[\s>+~])(?:html|body|:root)(?=$|[\s.#:[>+~])/g,
          '$1.shell-surface',
        );
        return scoped.startsWith('.shell-surface') ? scoped : `.shell-surface ${scoped}`;
      });
      output += `${selectors.join(', ')}{${body}}`;
    }
    index = close;
  }

  return output;
}

function installStyles(): void {
  if (scopedStyles?.isConnected) return;
  scopedStyles = document.createElement('style');
  scopedStyles.dataset.jqueryTerminal = '';
  scopedStyles.textContent = scopeCss(pluginCss);
  document.head.append(scopedStyles);
}

export function createTerminal(host: HTMLElement, options: TerminalOptions): TerminalInstance {
  installStyles();
  installAnsiColors();
  let terminal: TerminalInstance;
  const keymap: JQueryTerminal.keymapObject = {
    'CTRL+L': () => {
      terminal.clear();
      return false;
    },
  };
  if (options.onExit) {
    keymap['CTRL+D'] = () => {
      options.onExit?.();
      return false;
    };
    keymap.ESCAPE = () => {
      options.onExit?.();
      return false;
    };
  }
  terminal = $(host).terminal((command, instance) => options.interpreter(command, instance), {
    prompt: options.prompt,
    completion: (prefix, callback) => callback(options.completion(prefix)),
    historyState: true,
    exit: false,
    keymap,
  });
  host.querySelector('textarea')?.setAttribute('aria-label', 'Terminal command');
  return terminal;
}

export function destroyTerminal(instance: unknown): void {
  (instance as TerminalInstance | null)?.destroy();
}
