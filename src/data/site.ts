/**
 * 全站个人信息与作品数据。
 *
 * 想改名字、简介、作品、社交链接，只改这个文件就够了。
 * 所有标注 TODO 的地方都是占位内容，替换成你自己的即可。
 */

export interface Project {
  /** 项目名称 */
  title: string;
  /** 一句话说明它解决什么问题 */
  summary: string;
  /** 年份，用于排序与展示 */
  year: string;
  /** 你在这个项目里的角色 */
  role: string;
  /** 技术栈或能力标签 */
  stack: string[];
  /** 封面图 key，对应 src/lib/covers.ts 里的键 */
  cover?: string;
  /** 在线演示地址 */
  demo?: string;
  /** 演示补充说明，例如体验账号 */
  demoNote?: string;
  /** 源码地址 */
  repo?: string;
  /** 是否在首页「精选作品」里展示 */
  featured?: boolean;
}

export interface Social {
  label: string;
  href: string;
  /** 对应 src/components/Icon.astro 里的图标名 */
  icon: 'github' | 'mail' | 'x' | 'rss' | 'link';
}

export const site = {
  name: '江晚',
  // TODO: 一句话定位，出现在首页大标题下方
  tagline: '做 AI 应用，也记录过程中踩过的坑。',
  // TODO: 首页自我介绍，两到三句话
  intro:
    '我做 AI 应用与工程实现，关注 Agent 运行时、检索质量和评测方法。这里放我做过的项目，和偶尔写下的长文。',
  // 当前状态，留空则不显示
  availability: '',
  // 站点描述，会用于 SEO 与 RSS
  description: '个人作品集与技术笔记，记录 Agent、RAG 检索与 LLM 应用评测的实践。',
  // TODO: 联系邮箱，填了才会显示
  email: '',
  // 所在城市，留空则不显示
  location: '',
  // 建站年份，用于页脚版权
  since: 2026,
};

export const socials: Social[] = [
  { label: 'GitHub', href: 'https://github.com/foolgone', icon: 'github' },
  { label: 'RSS', href: '/feed/', icon: 'rss' },
  // TODO: 有邮箱、X、掘金等再加，格式同上
];

export const projects: Project[] = [
  {
    title: 'AI Insight Hub',
    summary:
      'AI 客服数据分析平台：用多个 Agent 自动清洗、评估和分析客服对话，覆盖导入、质检、统计与报告导出全链路。后端 42 个端点、479 条用例，前端 323 条用例。',
    year: '2026',
    role: '全栈开发',
    stack: ['FastAPI', 'PostgreSQL', 'pgvector', 'Celery', 'React 18'],
    cover: 'insight-hub',
    demo: 'https://bjwplus.dpdns.org:8443',
    demoNote: '体验账号 demo@example.com\n密码 demo123',
    repo: 'https://github.com/foolgone/ai-insight-hub',
    featured: true,
  },
  {
    title: '客服质检工作台',
    summary:
      '导入对话后人工标注评分，AI 给出辅助建议，配合三栏工作台、键盘快捷键与自动保存，单条审核控制在一分钟内，支持统计看板与多格式报告导出。',
    year: '2026',
    role: '独立开发',
    stack: ['React 18', 'Vite', 'TailwindCSS', 'Recharts', 'Vitest'],
    cover: 'customer-review',
    demo: 'https://customer-service-review.vercel.app',
    repo: 'https://github.com/foolgone/customer-service-review',
    featured: true,
  },
  {
    title: 'agent-runtime',
    summary:
      '可恢复、幂等的 Agent 任务运行时。会话状态由 append-only 事件日志重放得出，进程崩溃后接着跑；工具调用先记账后执行，重试不会产生两份副作用。',
    year: '2026',
    role: '独立开发',
    stack: ['Python', 'FastAPI', '事件溯源', 'LLM 工具调用'],
    cover: 'agent-runtime',
    repo: 'https://github.com/foolgone/agent-runtime',
    featured: true,
  },
  {
    title: 'DSH AI 接待工作台',
    summary:
      '基于 DSH 的客服接待助手：模型根据客户咨询与上下文自主选择知识检索、Skill 与已授权工具，知识库提供事实、Skill 提供处理方法，不绑定为固定流水线。',
    year: '2026',
    role: '前端与平台开发',
    stack: ['TypeScript', 'pnpm workspace', 'Agent 编排', '飞书 OAuth'],
  },
  {
    title: '多 Agent 旅游规划',
    summary:
      '六个 Agent 分工处理偏好、目的地、航班、酒店、活动与预算，由 orchestrator 串成可并行执行的流水线，预算超限时回到上游重新规划。',
    year: '2025',
    role: '独立开发',
    stack: ['Python', 'FastAPI', 'Streamlit', '多 Agent 编排'],
  },
];

export interface SkillGroup {
  title: string;
  items: string[];
}

export interface TimelineItem {
  year: string;
  title: string;
  detail: string;
}

/**
 * 关于页的技能分组。留空则整块不显示。
 * 想加上就照下面注释里的格式填。
 *
 * export const skills: SkillGroup[] = [
 *   { title: '语言与框架', items: ['Python', 'TypeScript', 'FastAPI', 'React'] },
 * ];
 */
export const skills: SkillGroup[] = [];

/**
 * 关于页的经历时间线。留空则整块不显示。
 *
 * export const timeline: TimelineItem[] = [
 *   { year: '2024 — 至今', title: '公司 / 职位', detail: '一句话职责' },
 * ];
 */
export const timeline: TimelineItem[] = [];

export const nav = [
  { label: '首页', href: '/' },
  { label: '作品', href: '/works/' },
  { label: '文章', href: '/blog/' },
  { label: '关于', href: '/about/' },
];
