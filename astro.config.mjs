// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: true,
  integrations: [react(), sitemap()],
  site: "https://www.vantage.sh",
  base: process.env.PUBLIC_BASE_URL || undefined,
});
