import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    draft: z.boolean().optional().default(false),
    date: z.date(),
    categories: z.array(z.string()).optional(),
  }),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { posts, pages };
