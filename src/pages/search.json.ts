import type { APIRoute } from 'astro';
import { byDateDesc, getPublishedPosts, serializePost } from '../lib/posts';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const sorted = [...posts].sort(byDateDesc);

  return new Response(JSON.stringify({ posts: sorted.map(serializePost) }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
