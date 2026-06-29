import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "Thomas' Blog",
    description: 'Personal blog about data engineering, ML, and tools',
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      description: post.data.description,
    })),
  });
}
