import { getCollection, type CollectionEntry } from 'astro:content';

export type PostMeta = {
  slug: string;
  data: {
    title: string;
    description: string;
    date: string;
    categories: string[];
  };
};

export function byDateDesc(
  a: { data: { date: string } },
  b: { data: { date: string } }
): number {
  return b.data.date.localeCompare(a.data.date);
}

export async function getPublishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', ({ data }: CollectionEntry<'posts'>) =>
    import.meta.env.PROD ? !data.draft : true
  );

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.id)) duplicates.add(post.id);
    seen.add(post.id);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate post slugs in src/content/posts: ${[...duplicates].sort().join(', ')}`
    );
  }

  return posts;
}

export function serializePost(post: CollectionEntry<'posts'>): PostMeta {
  return {
    slug: post.id,
    data: {
      title: post.data.title,
      description: post.data.description,
      date: post.data.date,
      categories: post.data.categories,
    },
  };
}
