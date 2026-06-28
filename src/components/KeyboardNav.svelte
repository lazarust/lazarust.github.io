<script>
  import { onMount } from 'svelte';

  let focusedIndex = $state(-1);
  let hintOpen = $state(false);

  function getItems() {
    const listItems = [...document.querySelectorAll('[data-list-item]')];
    if (listItems.length > 0) return listItems;
    return [...document.querySelectorAll('[data-nav-item]')];
  }

  function focusItem(index) {
    const items = getItems();
    if (items.length === 0) return;
    const idx = Math.max(0, Math.min(index, items.length - 1));
    focusedIndex = idx;
    const el = items[idx];
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeydown(e) {
    const tag = e.target;
    if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement) return;
    if (tag?.isContentEditable) return;

    if (hintOpen) {
      if (e.key === 'Escape' || e.key === 'q' || e.key === '?') {
        hintOpen = false;
        e.preventDefault();
      }
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(focusedIndex + 1);
      return;
    }

    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(focusedIndex - 1);
      return;
    }

    if (e.key === 'H') {
      e.preventDefault();
      window.history.back();
      return;
    }

    if (e.key === 'g') { e.preventDefault(); window.open('https://github.com/lazarust', '_blank', 'noopener,noreferrer'); return; }
    if (e.key === 'b') { e.preventDefault(); window.open('https://bsky.app/profile/lazarust.bsky.social', '_blank', 'noopener,noreferrer'); return; }
    if (e.key === 'x') { e.preventDefault(); window.open('https://twitter.com/lazarustda', '_blank', 'noopener,noreferrer'); return; }
    if (e.key === 'l') { e.preventDefault(); window.open('https://www.linkedin.com/in/td-lazarus', '_blank', 'noopener,noreferrer'); return; }
    if (e.key === 'r') { e.preventDefault(); window.location.href = '/rss.xml'; return; }

    if (e.key === '?') {
      e.preventDefault();
      hintOpen = true;
      return;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if hintOpen}
  <div class="hint-overlay" onclick={() => hintOpen = false} role="presentation">
    <dialog open class="hint-dialog" aria-modal="true" aria-labelledby="hint-title">
      <h2 id="hint-title">Keybinds</h2>
      <div class="hint-list">
        <div class="hint-row"><kbd>j</kbd><span class="hint-arrow">&rarr;</span> Next item</div>
        <div class="hint-row"><kbd>k</kbd><span class="hint-arrow">&rarr;</span> Previous item</div>
        <div class="hint-row"><kbd>Enter</kbd><span class="hint-arrow">&rarr;</span> Open item</div>
        <hr class="hint-divider" />
        <div class="hint-row"><kbd>H</kbd><span class="hint-arrow">&rarr;</span> Go back</div>
        <hr class="hint-divider" />
        <div class="hint-row"><kbd>g</kbd><span class="hint-arrow">&rarr;</span> GitHub</div>
        <div class="hint-row"><kbd>b</kbd><span class="hint-arrow">&rarr;</span> Bluesky</div>
        <div class="hint-row"><kbd>x</kbd><span class="hint-arrow">&rarr;</span> X / Twitter</div>
        <div class="hint-row"><kbd>l</kbd><span class="hint-arrow">&rarr;</span> LinkedIn</div>
        <div class="hint-row"><kbd>r</kbd><span class="hint-arrow">&rarr;</span> RSS feed</div>
        <hr class="hint-divider" />
        <div class="hint-row"><kbd>?</kbd><span class="hint-arrow">&rarr;</span> Show keybinds</div>
        <div class="hint-row"><kbd>Esc</kbd><span class="hint-arrow">&rarr;</span> Close keybinds</div>
      </div>
    </dialog>
  </div>
{/if}

<style>
  .hint-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    padding: 1rem;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .hint-dialog {
    position: relative;
    margin: 0;
    width: fit-content;
    max-width: calc(100vw - 2rem);
    border: 1px solid var(--blue);
    background: var(--surface-0);
    color: var(--fg);
    padding: 2rem 2.5rem 2.5rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    border-radius: 4px;
  }

  .hint-dialog h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--fg-bright);
    margin-bottom: 1.25rem;
    letter-spacing: 0.05em;
  }

  .hint-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hint-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.9rem;
  }

  .hint-row kbd {
    display: inline-block;
    background: var(--surface-1);
    border: 1px solid var(--surface-2);
    padding: 0.1em 0.5em;
    font-family: inherit;
    font-size: 0.85em;
    border-radius: 3px;
    min-width: 2.5ch;
    text-align: center;
    color: var(--yellow);
  }

  .hint-arrow {
    color: var(--comment);
  }

  .hint-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.25rem 0;
  }
</style>
