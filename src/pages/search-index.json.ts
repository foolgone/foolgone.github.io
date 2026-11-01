import type { APIRoute } from 'astro';
import { formatDate, getPosts, toPlainText } from '../lib/posts';

/** 构建期生成的纯前端搜索索引，供 /search/ 页面拉取。 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();

  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    date: formatDate(post.data.pubDate),
    url: `/blog/${post.id}/`,
    text: toPlainText(post.body),
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
