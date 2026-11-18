<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { formatPostDate } from '../lib/dates';
  import {
    blogQueryString,
    parseBlogQuery,
    sortPosts,
    SORT_OPTIONS,
    type SortMode,
  } from '../lib/blogQuery';
  import type { PostMeta } from '../lib/posts';

  interface Props {
    posts: PostMeta[];
  }

  let { posts }: Props = $props();

  let activeTag = $state<string | null>(null);
  let sort = $state<SortMode>('date-desc');

  let tagCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const category of post.data.categories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return counts;
  });

  let categories = $derived([...tagCounts.keys()].sort());

  let filtered = $derived.by(() => {
    const tag = activeTag;
    const visible = tag ? posts.filter((post) => post.data.categories.includes(tag)) : posts;
    return sortPosts(visible, sort);
  });

  let cmd = $derived(activeTag ? `ls ${activeTag}/` : 'ls');
  let summary = $derived(`${filtered.length} ${filtered.length === 1 ? 'post' : 'posts'}`);

  onMount(() => {
    const restored = parseBlogQuery(window.location.search);
    if (restored.tag && tagCounts.has(restored.tag)) activeTag = restored.tag;
    sort = restored.sort;
  });

  function writeUrl(): void {
    const query = blogQueryString(activeTag, sort);
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query}${window.location.hash}`,
    );
  }

  function focusedSlug(): string | null {
    if (!(document.activeElement instanceof Element)) return null;
    return (
      document.activeElement.closest<HTMLElement>('[data-post-slug]')?.dataset.postSlug ?? null
    );
  }

  async function restoreFocus(slug: string | null, fallback: string): Promise<void> {
    await tick();
    if (slug) {
      const link = document.querySelector<HTMLElement>(`[data-post-slug="${CSS.escape(slug)}"] a`);
      if (link) {
        link.focus();
        return;
      }
    }
    document.querySelector<HTMLElement>(fallback)?.focus();
  }

  async function toggleTag(category: string): Promise<void> {
    const slug = focusedSlug();
    activeTag = activeTag === category ? null : category;
    writeUrl();
    await restoreFocus(slug, `[data-tag="${CSS.escape(category)}"]`);
  }

  async function changeSort(next: SortMode): Promise<void> {
    if (next === sort) return;
    const slug = focusedSlug();
    sort = next;
    writeUrl();
    await restoreFocus(slug, `[data-sort="${next}"]`);
  }
</script>

<div class="prompt-line">
  <span class="prompt-user">~/blog</span>
  <span class="prompt-sep">$</span>
  <span class="prompt-cmd">{cmd}</span>
</div>

{#if categories.length > 0}
  <div class="tag-bar" role="group" aria-label="Filter by tag">
    <span class="tag-label">tags:</span>
    {#each categories as category (category)}
      <button
        type="button"
        class="tag"
        data-tag={category}
        aria-pressed={activeTag === category}
        onclick={() => toggleTag(category)}
      >
        {category}
        <span class="tag-count">{tagCounts.get(category)}</span>
      </button>
    {/each}
  </div>
{/if}

<div class="sort-bar" role="group" aria-label="Sort posts">
  <span class="tag-label">sort:</span>
  {#each SORT_OPTIONS as option (option.value)}
    <button
      type="button"
      class="tag"
      data-sort={option.value}
      aria-label={option.ariaLabel}
      aria-pressed={sort === option.value}
      onclick={() => changeSort(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<p class="ls-summary" aria-live="polite">
  {summary}{activeTag ? ` in ${activeTag}` : ''}
</p>

{#if filtered.length > 0}
  <div class="ls-listing">
    {#each filtered as post (post.slug)}
      <div class="ls-row" data-post-slug={post.slug}>
        <span class="ls-date">
          {formatPostDate(post.data.date, 'short')}<span class="ls-time">
            , {formatPostDate(post.data.date, 'year')}
          </span>
        </span>
        <a href={`/posts/${post.slug}/`} data-nav-item data-list-item>{post.data.title}</a>
        {#if post.data.categories.length > 0}
          <span class="post-tags">
            {#each post.data.categories as category (category)}
              <button
                type="button"
                class="tag"
                data-tag={category}
                aria-pressed={activeTag === category}
                onclick={() => toggleTag(category)}
              >
                {category}
              </button>
            {/each}
          </span>
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <p class="ls-empty">no matches</p>
{/if}

<style>
  .sort-bar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .tag-count {
    margin-left: 0.35em;
    color: var(--comment);
    font-size: 0.9em;
  }

  .tag[aria-pressed='true'] .tag-count {
    color: inherit;
    opacity: 0.75;
  }

  .ls-summary {
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: var(--comment);
  }

  .ls-empty {
    padding: 0.15rem 0.5rem;
    color: var(--comment);
    font-style: italic;
  }
</style>
