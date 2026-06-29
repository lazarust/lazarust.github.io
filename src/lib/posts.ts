import { getCollection, type CollectionEntry } from 'astro:content';

export type PostMeta = {
  slug: string;
  data: {
    title: string;
    description?: string;
    date: string;
    categories: string[];
  };
};

export async function getPublishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  return getCollection('posts', ({ data }: CollectionEntry<'posts'>) =>
    import.meta.env.PROD ? !data.draft : true
  );
}

export function serializePost(post: CollectionEntry<'posts'>): PostMeta {
  return {
    slug: post.id,
    data: {
      title: post.data.title,
      description: post.data.description,
      date: post.data.date.toISOString(),
      categories: post.data.categories ?? [],
    },
  };
}
