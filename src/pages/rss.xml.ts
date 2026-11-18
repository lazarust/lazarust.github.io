import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getPublishedPosts, byDateDesc } from '../lib/posts';
import { postDateToUTC } from '../lib/dates';

export const GET: APIRoute = async (context) => {
  const site = context.site;
  if (!site) {
    throw new Error('`site` is not configured in astro.config.mjs');
  }

  const posts = await getPublishedPosts();
  const sorted = posts.sort(byDateDesc);
  return rss({
    title: "Thomas' Blog",
    description: 'Personal blog about data engineering, ML, and tools',
    site,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: postDateToUTC(post.data.date),
      link: `/posts/${post.id}/`,
      description: post.data.description,
      categories: post.data.categories,
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en</language><atom:link href="${new URL('rss.xml', site)}" rel="self" type="application/rss+xml" />`,
  });
};
