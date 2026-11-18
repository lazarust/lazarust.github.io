import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';

export default defineConfig({
  integrations: [svelte(), sitemap(), expressiveCode({ themes: ['tokyo-night'] })],
  site: 'https://lazarust.github.io',
  output: 'static',
  srcDir: './src',
  publicDir: './public',
  outDir: './dist',
});
