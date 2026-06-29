<script>
  import { onMount } from 'svelte';

  let { posts } = $props();

  let activeTag = $state(null);
  let searchMode = $state(null);
  let searchQuery = $state('');
  let searchIndex = $state(0);
  let tPressed = $state(false);
  let tTimer = $state(null);

  let allCategories = $derived(
    [...new Set(posts.flatMap(p => p.data.categories ?? []))].sort()
  );

  let tagSearchResults = $derived(
    searchQuery === ''
      ? allCategories
      : allCategories.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let postSearchResults = $derived(
    searchQuery === ''
      ? filtered
      : filtered.filter(post =>
          post.data.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.slug.toLowerCase().includes(searchQuery.toLowerCase())
        )
  );

  let currentResults = $derived(
    searchMode === 'tags' ? tagSearchResults : postSearchResults
  );

  let filtered = $derived(
    activeTag
      ? posts.filter(p => p.data.categories?.includes(activeTag))
      : posts
  );

  function toggleTag(cat) {
    activeTag = activeTag === cat ? null : cat;
  }

  function enterSearch(mode) {
    searchMode = mode;
    searchQuery = '';
    searchIndex = 0;
  }

  function exitSearch() {
    searchMode = null;
    searchQuery = '';
    searchIndex = 0;
  }

  function isTypableTarget(tag) {
    if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement) return true;
    if (tag?.isContentEditable) return true;
    return false;
  }

  function handleKeydown(e) {
    if (searchMode) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (e.key === 'Escape') { exitSearch(); return; }
      if (e.key === 'Backspace') { searchQuery = searchQuery.slice(0, -1); searchIndex = 0; return; }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        if (currentResults.length > 0) searchIndex = (searchIndex + 1) % currentResults.length;
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        if (currentResults.length > 0) searchIndex = (searchIndex - 1 + currentResults.length) % currentResults.length;
        return;
      }

      if (e.key === 'Enter') {
        if (searchMode === 'tags') {
          if (tagSearchResults[searchIndex]) toggleTag(tagSearchResults[searchIndex]);
          exitSearch();
        } else if (searchMode === 'posts') {
          if (postSearchResults[searchIndex]) {
            window.location.href = `/posts/${postSearchResults[searchIndex].slug}/`;
          }
        }
        return;
      }

      if (e.key.length === 1) {
        searchQuery += e.key;
        searchIndex = 0;
      }
      return;
    }

    if (isTypableTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape' && activeTag) {
      e.preventDefault();
      activeTag = null;
      return;
    }

    if (e.key === 't') {
      e.preventDefault();
      tPressed = true;
      clearTimeout(tTimer);
      tTimer = setTimeout(() => { tPressed = false; }, 1000);
      return;
    }

    if (e.key === '/' && tPressed) {
      e.preventDefault();
      tPressed = false;
      clearTimeout(tTimer);
      enterSearch('tags');
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      enterSearch('posts');
      return;
    }

    if (tPressed) {
      tPressed = false;
      clearTimeout(tTimer);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  });

  function fmt(date) {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    return `${dateStr}<span class="ls-time">, ${d.getFullYear()}</span>`;
  }

  let cmd = $derived(activeTag ? `ls ${activeTag}/` : 'ls');
  let searchPlaceholder = $derived(searchMode === 'tags' ? 'filter tags...' : 'filter posts...');
</script>

<div class="prompt-line">
  <span class="prompt-user">~/blog</span>
  <span class="prompt-sep">$</span>
  <span class="prompt-cmd">{cmd}</span>
</div>

{#if allCategories.length > 0}
  <div class="tag-bar">
    <span class="tag-label">tags:</span>
    {#each allCategories as cat}
      <button
        class="tag"
        class:active={activeTag === cat}
        onclick={() => toggleTag(cat)}
      >{cat}</button>
    {/each}
  </div>
{/if}

<div class="search-hints">
  <span>press <kbd>/</kbd> to search posts</span>
  <span>press <kbd>t</kbd><kbd>/</kbd> to search tags</span>
  {#if activeTag}<span>press <kbd>Esc</kbd> to clear filter</span>{/if}
</div>

{#if searchMode}
  <div class="search-box" class:tag-mode={searchMode === 'tags'}>
    <span class="search-prompt">{searchMode === 'tags' ? 'tags>' : 'posts>'}</span>
    <span class="search-query">{searchQuery}<span class="search-cursor">&#9608;</span></span>
    {#if currentResults.length > 0}
      <div class="search-results">
        {#each currentResults as item, i}
          <div class="search-result" class:selected={i === searchIndex}>
            {searchMode === 'tags'
              ? item
              : item.data.title}
          </div>
        {/each}
      </div>
    {:else}
      <div class="search-results">
        <div class="search-result no-results">no matches</div>
      </div>
    {/if}
  </div>
{/if}

<div class="ls-listing">
  {#if searchMode === 'posts'}
    {#each postSearchResults as post}
      <div class="ls-row">
        <span class="ls-date">{@html fmt(post.data.date)}</span>
        <a href={`/posts/${post.slug}/`} data-nav-item data-list-item>
          {post.data.title}
        </a>
      </div>
    {/each}
  {:else}
    {#each filtered as post}
      <div class="ls-row">
        <span class="ls-date">{@html fmt(post.data.date)}</span>
        <a href={`/posts/${post.slug}/`} data-nav-item data-list-item>
          {post.data.title}
        </a>
        {#if post.data.categories?.length > 0}
          <span class="post-tags">
            {#each post.data.categories as cat}
              <button class="tag" onclick={() => toggleTag(cat)}>{cat}</button>
            {/each}
          </span>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .tag-bar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .tag-label {
    color: var(--comment);
    font-size: 0.85rem;
  }

  .tag {
    display: inline-block;
    font-size: 0.8rem;
    padding: 0.05em 0.5em;
    border: 1px solid var(--surface-2);
    border-radius: 3px;
    color: var(--cyan);
    background: var(--surface-0);
    cursor: pointer;
    font-family: inherit;
  }

  .tag:hover {
    color: var(--bg);
    background: var(--cyan);
    border-color: var(--cyan);
  }

  .tag.active {
    color: var(--bg);
    background: var(--blue);
    border-color: var(--blue);
  }

  .search-hints {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    font-size: 0.75rem;
    color: var(--comment);
  }

  .search-hints kbd {
    background: var(--surface-1);
    border: 1px solid var(--surface-2);
    padding: 0.05em 0.4em;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.85em;
    color: var(--yellow);
    margin: 0 0.1em;
  }

  .search-box {
    margin-bottom: 1.25rem;
    padding: 0.75rem 1rem;
    background: var(--surface-0);
    border: 1px solid var(--blue);
    border-radius: 4px;
  }

  .search-box.tag-mode {
    border-color: var(--green);
  }

  .search-prompt {
    color: var(--green);
    margin-right: 0.5rem;
  }

  .search-query {
    color: var(--fg-bright);
  }

  .search-cursor {
    color: var(--cyan);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .search-results {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .search-result {
    padding: 0.1rem 0.5rem;
    border-radius: 2px;
    color: var(--fg);
    font-size: 0.85rem;
  }

  .search-result.selected {
    background: var(--surface-1);
    color: var(--cyan);
    outline: 1px solid var(--blue);
    outline-offset: -1px;
  }

  .search-result.no-results {
    color: var(--comment);
    font-style: italic;
  }

  .post-tags {
    display: flex;
    gap: 0.35rem;
    flex-shrink: 0;
  }
</style>
