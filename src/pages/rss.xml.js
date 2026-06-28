import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts');
  return rss({
    title: "Thomas' Blog",
    description: 'Personal blog about data engineering, ML, and tools',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/posts/${post.slug}/`,
    })),
  });
}
