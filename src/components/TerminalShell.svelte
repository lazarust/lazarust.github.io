<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPosts } from '../lib/postIndex';
  import { createInterpreter, promptFor } from '../lib/shell/interpreter';
  import { load, save } from '../lib/shell/state';
  import { buildTree, completePath, resolvePath, type Node } from '../lib/shell/vfs';

  interface Props {
    mode: 'page' | 'overlay';
    onclose?: () => void;
  }

  let { mode, onclose }: Props = $props();
  let host = $state<HTMLDivElement>();
  let dialog = $state<HTMLDialogElement>();
  let terminal: { focus: () => unknown } | undefined;
  let destroyTerminal: ((instance: unknown) => void) | undefined;
  let cwd = '~';
  let posts: Awaited<ReturnType<typeof loadPosts>> = [];
  let root: Node = buildTree([]);
  let status = $state('');
  let closeNotified = false;

  onMount(() => {
    let alive = true;
    if (mode === 'overlay') dialog?.showModal();
    const state = load();
    cwd = state.cwd;

    void (async () => {
      try {
        const [{ createTerminal, destroyTerminal: destroy }, loadedPosts] = await Promise.all([
          import('../lib/shell/terminal-bundle'),
          loadPosts(),
        ]);
        if (!alive || !host) return;
        destroyTerminal = destroy;
        posts = loadedPosts;
        root = buildTree(loadedPosts);
        if ('error' in resolvePath(root, '~', cwd)) {
          cwd = '~';
          save({ cwd });
        }
        const interpreter = createInterpreter({
          getCwd: () => cwd,
          setCwd: (value) => (cwd = value),
          getRoot: () => root,
          getPosts: () => posts,
          mode,
          onExit: closeDialog,
          announce: (message) => (status = message),
        });
        terminal = createTerminal(host, {
          prompt: promptFor(cwd),
          interpreter,
          completion: (prefix) => completePath(root, cwd, prefix),
          ...(mode === 'overlay' ? { onExit: closeDialog } : {}),
        });
        terminal.focus();
      } catch {
        if (alive) status = 'Terminal unavailable.';
      }
    })();

    return () => {
      alive = false;
      if (terminal) destroyTerminal?.(terminal);
      host?.replaceChildren();
      if (dialog?.open) dialog.close();
    };
  });

  function closeDialog(): void {
    if (dialog?.open) dialog.close();
    else if (mode === 'overlay' && !closeNotified) {
      closeNotified = true;
      onclose?.();
    }
  }

  function handleClose(): void {
    if (closeNotified) return;
    closeNotified = true;
    onclose?.();
  }
</script>

{#if mode === 'overlay'}
  <dialog bind:this={dialog} class="shell-dialog" aria-label="Terminal" onclose={handleClose}>
    <button type="button" class="shell-close" onclick={closeDialog} aria-label="Close terminal">
      close
    </button>
    <div bind:this={host} class="shell-surface"></div>
    <p class="sr-only" role="status" aria-live="polite">{status}</p>
  </dialog>
{:else}
  <div bind:this={host} class="shell-surface"></div>
  <p class="sr-only" role="status" aria-live="polite">{status}</p>
{/if}
