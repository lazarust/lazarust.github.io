export type SortMode = 'date-desc' | 'date-asc' | 'title';

export type BlogQuery = {
  tag: string | null;
  sort: SortMode;
};

export const SORT_OPTIONS = [
  { value: 'date-desc', label: 'date ↓', ariaLabel: 'Sort by date, newest first' },
  { value: 'date-asc', label: 'date ↑', ariaLabel: 'Sort by date, oldest first' },
  { value: 'title', label: 'title', ariaLabel: 'Sort by title' },
] as const;

const SORT_VALUES: readonly SortMode[] = SORT_OPTIONS.map((option) => option.value);

export function parseSort(value: string | null | undefined): SortMode {
  return SORT_VALUES.includes(value as SortMode) ? (value as SortMode) : 'date-desc';
}

export function parseBlogQuery(search: string): BlogQuery {
  const params = new URLSearchParams(search);
  const tag = params.get('tag')?.trim();
  return { tag: tag ? tag : null, sort: parseSort(params.get('sort')) };
}

export function blogQueryString(tag: string | null, sort: SortMode): string {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (sort !== 'date-desc') params.set('sort', sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

type SortablePost = { data: { date: string; title: string } };

export function sortPosts<T extends SortablePost>(posts: readonly T[], sort: SortMode): T[] {
  const sorted = [...posts];
  switch (sort) {
    case 'date-asc':
      return sorted.sort((a, b) => a.data.date.localeCompare(b.data.date));
    case 'title':
      return sorted.sort((a, b) => a.data.title.localeCompare(b.data.title));
    default:
      return sorted.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }
}
