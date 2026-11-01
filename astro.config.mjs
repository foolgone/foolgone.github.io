import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: 部署到 Vercel 后，把这里改成你的正式域名（影响 RSS、Sitemap、canonical 链接）
export default defineConfig({
  site: 'https://your-blog.vercel.app',
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
