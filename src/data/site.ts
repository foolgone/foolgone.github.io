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
  /** 项目链接，可以是外部地址，也可以是站内路径（如 /blog/xxx/） */
  href?: string;
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
  // TODO: 你的名字
  name: '你的名字',
  // TODO: 你的职业 / 身份
  role: '前端工程师',
  // TODO: 一句话定位，出现在首页大标题下方
  tagline: '写界面，也写界面背后的思考。',
  // TODO: 首页自我介绍，两到三句话
  intro:
    '我做前端工程与交互设计，关注可读性、动效节奏和长期可维护的代码。这里放我的作品，和偶尔写下的长文。',
  // TODO: 当前状态，留空则不显示
  availability: '开放远程合作',
  // TODO: 站点描述，会用于 SEO 与 RSS
  description: '个人作品集与技术博客，记录前端工程、交互设计与长期主义的实践。',
  // TODO: 联系邮箱
  email: 'hello@example.com',
  // TODO: 所在城市，留空则不显示
  location: '中国 · 远程',
  // TODO: 建站年份，用于页脚版权
  since: 2024,
};

export const socials: Social[] = [
  { label: 'GitHub', href: 'https://github.com/yourname', icon: 'github' },
  { label: 'Email', href: 'mailto:hello@example.com', icon: 'mail' },
  { label: 'X', href: 'https://x.com/yourname', icon: 'x' },
  { label: 'RSS', href: '/rss.xml', icon: 'rss' },
];

export const projects: Project[] = [
  {
    title: '设计系统组件库',
    summary:
      '为 12 条业务线统一交互与视觉语言，把重复实现的表单、表格、弹层收敛成 40+ 个可组合组件，配套文档站与视觉回归测试。',
    year: '2025',
    role: '设计与实现',
    stack: ['TypeScript', 'React', 'Design Tokens', 'Storybook'],
    href: 'https://github.com/yourname',
    featured: true,
  },
  {
    title: '实时协作白板',
    summary:
      '支持多人光标、无限画布与离线合并的协作白板，用 CRDT 解决冲突，首屏交互时间控制在 1.2 秒以内。',
    year: '2024',
    role: '前端负责人',
    stack: ['Canvas', 'WebSocket', 'CRDT', '性能优化'],
    href: 'https://github.com/yourname',
    featured: true,
  },
  {
    title: '数据看板可视化',
    summary:
      '把七张分散的运营报表整合成一块可下钻的看板，支持自定义指标与导出，日均使用人数从 30 提升到 400+。',
    year: '2023',
    role: '全栈开发',
    stack: ['Vue', 'D3', 'Node.js', 'ClickHouse'],
    href: 'https://github.com/yourname',
    featured: true,
  },
  {
    title: '写作与发布工具',
    summary:
      '面向技术写作者的 Markdown 编辑器，支持图片自动压缩、代码高亮主题与一键发布到多个平台。',
    year: '2023',
    role: '独立开发',
    stack: ['Electron', 'Markdown', 'Sharp'],
    repo: 'https://github.com/yourname',
  },
];

export const skills = [
  {
    title: '前端工程',
    items: ['TypeScript', 'React / Vue', 'Astro', '构建与性能优化'],
  },
  {
    title: '设计与交互',
    items: ['设计令牌', '排版与栅格', '动效节奏', '可访问性'],
  },
  {
    title: '工程化',
    items: ['组件库建设', 'CI / CD', '自动化测试', '文档体系'],
  },
];

export const timeline = [
  { year: '2024 — 至今', title: '高级前端工程师', detail: '负责设计系统与核心业务前端架构。' },
  { year: '2021 — 2024', title: '前端工程师', detail: '从 0 到 1 搭建数据产品前端，主导可视化模块。' },
  { year: '2019 — 2021', title: '初级前端工程师', detail: '企业后台系统开发，沉淀表单与表格方案。' },
];

export const nav = [
  { label: '首页', href: '/' },
  { label: '作品', href: '/works/' },
  { label: '文章', href: '/blog/' },
  { label: '关于', href: '/about/' },
];
