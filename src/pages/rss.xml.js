import rss from '@astrojs/rss';
import { getPublishedPosts, byDateDesc } from '../lib/posts';
import { postDateToUTC } from '../lib/dates';

export async function GET(context) {
  const posts = await getPublishedPosts();
  const sorted = posts.sort(byDateDesc);
  return rss({
    title: "Thomas' Blog",
    description: 'Personal blog about data engineering, ML, and tools',
    site: context.site,
    items: sorted.map(post => ({
      title: post.data.title,
      pubDate: postDateToUTC(post.data.date),
      link: `/posts/${post.id}/`,
      description: post.data.description,
      categories: post.data.categories,
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en</language><atom:link href="${new URL('rss.xml', context.site)}" rel="self" type="application/rss+xml" />`,
  });
}
