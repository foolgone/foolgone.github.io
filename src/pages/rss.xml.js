import rss from '@astrojs/rss';
import { getPosts } from '../lib/posts';
import { site } from '../data/site';

export async function GET(context) {
  const posts = await getPosts();

  const feed = await rss({
    title: site.name,
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

  // 浏览器直接打开 XML 时套用样式表，RSS 阅读器不受影响
  const xml = (await feed.text()).replace(
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>',
  );

  return new Response(xml, {
    headers: feed.headers,
  });
}
