import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const POST_CATEGORIES = [
  'blogging',
  'obsidian',
  'mkdocs',
  'zed',
  'ollama',
  'productivity',
  'todo-list',
] as const;

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(20).max(160),
    draft: z.boolean().optional().default(false),
    date: z.iso.date(),
    categories: z.array(z.enum(POST_CATEGORIES)).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { posts, pages };
