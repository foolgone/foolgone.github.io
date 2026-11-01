import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 正式域名（影响 RSS、Sitemap、canonical 链接）
export default defineConfig({
  site: 'https://foolgone.github.io',
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      defaultColor: 'light',
      wrap: true,
    },
  },
});
