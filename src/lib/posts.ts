import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 取全部已发布文章，按时间倒序。开发环境下包含草稿。 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 中英混排的粗略阅读时长：中文按 350 字/分钟，英文按 200 词/分钟。 */
export function readingTime(body: string | undefined): number {
  const text = body ?? '';
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(cjk / 350 + words / 200));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026.10.28 */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** 2026 年 10 月 28 日 */
export function formatDateLong(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export interface TagCount {
  tag: string;
  count: number;
}

/** 统计标签，按文章数倒序、名称正序。 */
export async function getTags(): Promise<TagCount[]> {
  const posts = await getPosts();
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/** 把 Markdown 正文压成纯文本，供站内搜索使用。 */
export function toPlainText(markdown: string | undefined, limit = 4000): string {
  const text = (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, limit);
}
