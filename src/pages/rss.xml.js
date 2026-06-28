import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts');
  const published = posts.filter(p => !p.data.draft);
  return rss({
    title: "Thomas' Blog",
    description: 'Personal blog about data engineering, ML, and tools',
    site: context.site,
    items: published.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/posts/${post.slug}/`,
      description: post.data.description,
    })),
  });
}
