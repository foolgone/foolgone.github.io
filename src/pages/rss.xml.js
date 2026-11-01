import rss from '@astrojs/rss';
import { getPosts } from '../lib/posts';
import { site } from '../data/site';

export async function GET(context) {
  const posts = await getPosts();

  return rss({
    title: `${site.name} · ${site.role}`,
    description: site.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  });
}
