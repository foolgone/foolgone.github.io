import type { ImageMetadata } from 'astro';
import insightHub from '../assets/projects/insight-hub.png';
import customerReview from '../assets/projects/customer-review.png';
import agentRuntime from '../assets/projects/agent-runtime.png';

/**
 * 作品封面图。key 对应 src/data/site.ts 里 project.cover 的值。
 * 加新图：把图片放进 src/assets/projects/，在这里注册，然后在 site.ts 里写 cover。
 */
export const covers: Record<string, ImageMetadata> = {
  'insight-hub': insightHub,
  'customer-review': customerReview,
  'agent-runtime': agentRuntime,
};
