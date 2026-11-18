<script lang="ts">
  import { onMount } from 'svelte';
  import { buildCommands, groupCommands, searchCommands, type Command } from '../lib/commands';
  import { KEYMAP, type KeyBinding } from '../lib/keymap';
  import { isExternal, navigate, openExternal } from '../lib/navigate';
  import { loadPosts } from '../lib/postIndex';
  import type { PostMeta } from '../lib/posts';

  interface Props {
    mode: 'search' | 'help';
    onclose: () => void;
  }

  let { mode, onclose }: Props = $props();

  let dialog = $state<HTMLDialogElement>();
  let input = $state<HTMLInputElement>();
  let closeButton = $state<HTMLButtonElement>();
  let query = $state('');
  let activeIndex = $state(0);
  let posts = $state<PostMeta[]>([]);
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let closed = false;

  const HELP_SECTIONS: readonly { title: string; bindings: readonly KeyBinding[] }[] = [
    { title: 'global', bindings: KEYMAP.normal },
    { title: 'list navigation', bindings: KEYMAP.list },
  ];

  const KEY_LABELS: Record<string, string> = {
    ArrowDown: '↓',
    ArrowUp: '↑',
    Escape: 'esc',
  };

  let commands = $derived(buildCommands(posts));
  let results = $derived(searchCommands(commands, query));
  let blocks = $derived(groupCommands(results));
  let active = $derived(
    results.length > 0 ? results[Math.min(activeIndex, results.length - 1)] : null,
  );
  let activeId = $derived(active ? optionId(active) : undefined);

  let announcement = $derived(
    status === 'error'
      ? 'Post index unavailable. Showing navigation commands.'
      : status === 'loading'
        ? 'Loading posts.'
        : `${results.length} ${results.length === 1 ? 'command' : 'commands'}`,
  );

  $effect(() => {
    const id = activeId;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  });

  onMount(() => {
    const element = dialog;
    if (!element) return;

    element.showModal();
    if (mode === 'search') input?.focus();
    else closeButton?.focus();

    let alive = true;
    if (mode === 'search') {
      loadPosts()
        .then((value) => {
          if (!alive) return;
          posts = value;
          status = 'ready';
        })
        .catch(() => {
          if (!alive) return;
          status = 'error';
        });
    }

    return () => {
      alive = false;
      if (element.open) element.close();
    };
  });

  function optionId(command: Command): string {
    return `command-${command.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  function displayKey(key: string): string {
    return KEY_LABELS[key] ?? key;
  }

  function close(): void {
    if (dialog?.open) dialog.close();
  }

  function handleClose(): void {
    if (closed) return;
    closed = true;
    onclose();
  }

  function move(delta: number): void {
    if (results.length === 0) return;
    activeIndex = (activeIndex + delta + results.length) % results.length;
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      activeIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      activeIndex = Math.max(0, results.length - 1);
    } else if (event.key === 'Enter' && active) {
      event.preventDefault();
      runCommand(active);
    }
  }

  function runCommand(command: Command): void {
    close();
    if (command.href) {
      if (isExternal(command.href)) openExternal(command.href);
      else navigate(command.href);
      return;
    }
    command.run?.({ navigate, openExternal, openPalette: () => {} });
  }
</script>

<dialog
  bind:this={dialog}
  class="palette"
  aria-labelledby="palette-title"
  onclose={handleClose}
  onclick={(event) => {
    if (event.target === dialog) close();
  }}
>
  <header class="palette-header">
    <h2 id="palette-title">{mode === 'search' ? 'commands' : 'keyboard shortcuts'}</h2>
    <button
      bind:this={closeButton}
      type="button"
      class="palette-close"
      onclick={close}
      aria-label="Close"
    >
      esc
    </button>
  </header>

  {#if mode === 'search'}
    <input
      bind:this={input}
      bind:value={query}
      class="palette-input"
      type="text"
      role="combobox"
      aria-expanded={blocks.length > 0}
      aria-controls={blocks.length > 0 ? 'command-list' : undefined}
      aria-activedescendant={activeId}
      aria-autocomplete="list"
      aria-label="Search commands"
      placeholder="type a command…"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      oninput={() => (activeIndex = 0)}
      onkeydown={onInputKeydown}
    />

    {#if status === 'error'}
      <p class="palette-notice">post index unavailable — showing navigation only</p>
    {/if}

    <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

    {#if blocks.length > 0}
      <ul class="palette-list" id="command-list" role="listbox" aria-label="Commands">
        {#each blocks as block (block.group)}
          <li role="group" aria-label={block.group} class="palette-block">
            <p class="palette-group" aria-hidden="true">{block.group}</p>
            <ul class="palette-options" role="presentation">
              {#each block.commands as command (command.id)}
                <li
                  id={optionId(command)}
                  role="option"
                  aria-selected={active?.id === command.id}
                  class="palette-option"
                  onmouseenter={() => (activeIndex = results.indexOf(command))}
                >
                  {#if command.href}
                    <a
                      class="palette-entry"
                      href={command.href}
                      tabindex="-1"
                      target={isExternal(command.href) ? '_blank' : undefined}
                      rel={isExternal(command.href) ? 'noopener noreferrer' : undefined}
                      onclick={(event) => {
                        if (!event.metaKey && !event.ctrlKey && !event.shiftKey) close();
                      }}
                    >
                      <span class="palette-label">{command.label}</span>
                      {#if command.hint}<span class="palette-hint">{command.hint}</span>{/if}
                    </a>
                  {:else}
                    <button
                      type="button"
                      tabindex="-1"
                      class="palette-entry"
                      onmousedown={(event) => event.preventDefault()}
                      onclick={() => runCommand(command)}
                    >
                      <span class="palette-label">{command.label}</span>
                      {#if command.hint}<span class="palette-hint">{command.hint}</span>{/if}
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="palette-empty">no matches</p>
    {/if}
  {:else}
    <div class="help">
      {#each HELP_SECTIONS as section (section.title)}
        <section class="help-section">
          <h3>{section.title}</h3>
          <ul class="help-list">
            {#each section.bindings as binding (binding.command + binding.keys.join('-'))}
              <li class="help-row">
                <span class="help-keys">
                  {#each binding.keys as key (key)}<kbd>{displayKey(key)}</kbd>{/each}
                </span>
                <span class="help-label">{binding.label}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
      <p class="help-note">
        <kbd>/</kbd> and <kbd>?</kbd> work while list navigation is active. Escape closes this dialog.
      </p>
    </div>
  {/if}
</dialog>

<style>
  .palette {
    width: min(42rem, calc(100vw - 2rem));
    max-height: min(32rem, calc(100vh - 4rem));
    margin: auto;
    padding: 0;
    border: 1px solid var(--blue);
    border-radius: 4px;
    background: var(--surface-0);
    color: var(--fg);
    font-family: inherit;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .palette::backdrop {
    background: color-mix(in srgb, var(--bg) 70%, transparent);
  }

  .palette-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .palette-header h2 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--fg-bright);
  }

  .palette-close {
    font-family: inherit;
    font-size: 0.75rem;
    color: var(--comment);
    background: var(--surface-1);
    border: 1px solid var(--surface-2);
    border-radius: 3px;
    padding: 0.1em 0.5em;
    cursor: pointer;
  }

  .palette-close:hover {
    color: var(--cyan);
  }

  .palette-input {
    width: calc(100% - 2rem);
    margin: 0.75rem 1rem;
    padding: 0.4rem 0.65rem;
    font-family: inherit;
    font-size: 0.95rem;
    color: var(--fg-bright);
    background: var(--bg-alt);
    border: 1px solid var(--surface-2);
    border-radius: 3px;
  }

  .palette-input::placeholder {
    color: var(--comment);
  }

  .palette-notice {
    margin: 0 1rem 0.5rem;
    font-size: 0.75rem;
    color: var(--yellow);
  }

  .palette-list {
    list-style: none;
    margin: 0;
    padding: 0 0.5rem 0.75rem;
    max-height: 22rem;
    overflow-y: auto;
  }

  .palette-block {
    list-style: none;
  }

  .palette-options {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .palette-group {
    padding: 0.35rem 0.5rem 0.15rem;
    font-size: 0.7rem;
    color: var(--comment);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .palette-option {
    list-style: none;
    border-radius: 2px;
  }

  .palette-option[aria-selected='true'] {
    background: var(--surface-1);
  }

  .palette-entry {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 0.25rem 0.5rem;
    font-family: inherit;
    font-size: 0.85rem;
    text-align: left;
    color: var(--fg);
    background: none;
    border: none;
    cursor: pointer;
  }

  .palette-option[aria-selected='true'] .palette-entry {
    color: var(--cyan);
  }

  .palette-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .palette-hint {
    flex-shrink: 0;
    color: var(--comment);
    font-size: 0.75rem;
  }

  .palette-empty {
    padding: 0.5rem 1.5rem 1rem;
    color: var(--comment);
    font-style: italic;
  }

  .help {
    padding: 0.75rem 1rem 1rem;
    max-height: 26rem;
    overflow-y: auto;
  }

  .help-section {
    margin-bottom: 1rem;
  }

  .help-section h3 {
    margin-bottom: 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--comment);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .help-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .help-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.1rem 0;
    font-size: 0.85rem;
  }

  .help-keys {
    display: flex;
    gap: 0.25rem;
    min-width: 7ch;
  }

  .help-note {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--comment);
  }
</style>
