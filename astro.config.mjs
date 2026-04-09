// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: true,
  integrations: [react({
    babel: {
      plugins: [
        [
          "babel-plugin-react-compiler",
        ],
      ],
    },
  }), sitemap()],
  site: process.env.PUBLIC_BASE_URL,
  base: process.env.PUBLIC_BASE_PATH || undefined,
});
