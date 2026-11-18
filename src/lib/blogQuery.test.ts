import { describe, expect, it } from 'vitest';
import { blogQueryString, parseBlogQuery, parseSort, sortPosts } from './blogQuery';

describe('parseBlogQuery', () => {
  it('reads tag and sort', () => {
    expect(parseBlogQuery('?tag=astro&sort=title')).toEqual({ tag: 'astro', sort: 'title' });
  });

  it('defaults missing and unknown values', () => {
    expect(parseBlogQuery('')).toEqual({ tag: null, sort: 'date-desc' });
    expect(parseBlogQuery('?tag=&sort=nope')).toEqual({ tag: null, sort: 'date-desc' });
  });

  it('trims whitespace around tags', () => {
    expect(parseBlogQuery('?tag=%20astro%20').tag).toBe('astro');
  });
});

describe('blogQueryString', () => {
  it('omits the default sort', () => {
    expect(blogQueryString(null, 'date-desc')).toBe('');
    expect(blogQueryString('astro', 'date-desc')).toBe('?tag=astro');
  });

  it('encodes tags and non-default sorts', () => {
    expect(blogQueryString('data engineering', 'date-asc')).toBe(
      '?tag=data+engineering&sort=date-asc',
    );
  });
});

describe('parseSort', () => {
  it('accepts known sorts only', () => {
    expect(parseSort('title')).toBe('title');
    expect(parseSort('bogus')).toBe('date-desc');
    expect(parseSort(null)).toBe('date-desc');
  });
});

describe('sortPosts', () => {
  const posts = [
    { data: { date: '2025-01-01', title: 'beta' } },
    { data: { date: '2026-01-01', title: 'alpha' } },
  ];

  it('sorts newest first by default', () => {
    expect(sortPosts(posts, 'date-desc').map((entry) => entry.data.title)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('sorts oldest first', () => {
    expect(sortPosts(posts, 'date-asc').map((entry) => entry.data.title)).toEqual([
      'beta',
      'alpha',
    ]);
  });

  it('sorts by title', () => {
    expect(sortPosts(posts, 'title').map((entry) => entry.data.title)).toEqual(['alpha', 'beta']);
  });

  it('does not mutate the input', () => {
    const copy = [...posts];
    sortPosts(posts, 'title');
    expect(posts).toEqual(copy);
  });
});
