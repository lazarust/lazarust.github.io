export type KeyMode = 'normal' | 'list';

export type BindingGroup = 'overlay' | 'navigation' | 'social' | 'list';

export type KeyBinding = {
  keys: readonly string[];
  command: string;
  label: string;
  group: BindingGroup;
};

export const SEQUENCE_TIMEOUT = 700;

export const KEYMAP: Record<KeyMode, readonly KeyBinding[]> = {
  normal: [
    { keys: ['/'], command: 'palette:search', label: 'Search commands', group: 'overlay' },
    { keys: ['?'], command: 'palette:help', label: 'Show keyboard shortcuts', group: 'overlay' },
    { keys: ['j'], command: 'list:enter', label: 'Enter list navigation', group: 'list' },
    { keys: ['k'], command: 'list:enter-last', label: 'Enter list navigation', group: 'list' },
    { keys: ['H'], command: 'nav:back', label: 'Go back', group: 'navigation' },
    { keys: ['r'], command: 'nav:rss', label: 'Open RSS feed', group: 'navigation' },
    { keys: ['g', 'i'], command: 'social:github', label: 'Open GitHub', group: 'social' },
    { keys: ['g', 'b'], command: 'social:bluesky', label: 'Open Bluesky', group: 'social' },
    { keys: ['g', 'x'], command: 'social:x', label: 'Open X', group: 'social' },
    { keys: ['g', 'l'], command: 'social:linkedin', label: 'Open LinkedIn', group: 'social' },
  ],
  list: [
    { keys: ['j'], command: 'list:next', label: 'Next item', group: 'list' },
    { keys: ['ArrowDown'], command: 'list:next', label: 'Next item', group: 'list' },
    { keys: ['k'], command: 'list:prev', label: 'Previous item', group: 'list' },
    { keys: ['ArrowUp'], command: 'list:prev', label: 'Previous item', group: 'list' },
    { keys: ['Escape'], command: 'list:exit', label: 'Leave list navigation', group: 'list' },
  ],
};

export type ResolveResult =
  | { readonly type: 'match'; readonly binding: KeyBinding }
  | { readonly type: 'pending' }
  | { readonly type: 'none' };

function bindingsFor(mode: KeyMode): readonly KeyBinding[] {
  return mode === 'list' ? [...KEYMAP.list, ...KEYMAP.normal] : KEYMAP.normal;
}

export function resolve(
  mode: KeyMode,
  key: string,
  previousKey: string | null,
  elapsed: number,
): ResolveResult {
  const bindings = bindingsFor(mode);

  if (previousKey !== null && elapsed <= SEQUENCE_TIMEOUT) {
    const sequence = bindings.find(
      (binding) =>
        binding.keys.length === 2 && binding.keys[0] === previousKey && binding.keys[1] === key,
    );
    if (sequence) return { type: 'match', binding: sequence };
  }

  const single = bindings.find((binding) => binding.keys.length === 1 && binding.keys[0] === key);
  if (single) return { type: 'match', binding: single };

  const isPrefix = bindings.some((binding) => binding.keys.length > 1 && binding.keys[0] === key);
  return isPrefix ? { type: 'pending' } : { type: 'none' };
}
