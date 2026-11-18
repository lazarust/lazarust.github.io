import type { PostMeta } from './posts';

const ENDPOINT = '/search.json';
const TIMEOUT_MS = 5000;

let cache: PostMeta[] | null = null;
let pending: Promise<PostMeta[]> | null = null;

async function request(): Promise<PostMeta[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, { signal: controller.signal });
    if (!response.ok) throw new Error(`${ENDPOINT} responded with ${response.status}`);
    const payload = (await response.json()) as { posts?: PostMeta[] };
    if (!Array.isArray(payload.posts)) throw new Error(`${ENDPOINT} did not return posts`);
    return payload.posts;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPosts(): Promise<PostMeta[]> {
  if (cache) return cache;
  pending ??= request()
    .then((posts) => {
      cache = posts;
      return posts;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
