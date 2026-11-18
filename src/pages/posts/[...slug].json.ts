import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts } from '../../lib/posts';

type PostPayload = {
  id: string;
  data: {
    title: string;
    date: string;
    categories: string[];
  };
  body?: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
};

export const GET: APIRoute = ({ props }) => {
  const { post } = props as { post: PostPayload };

  return new Response(
    JSON.stringify({
      slug: post.id,
      title: post.data.title,
      date: post.data.date,
      categories: post.data.categories,
      text: post.body ?? '',
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
