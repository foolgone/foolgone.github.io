# 个人博客 + 作品集

基于 [Astro](https://astro.build) 的纯静态站点：文章用 Markdown 写，构建产物是纯 HTML/CSS/JS，零后端依赖，部署在 Vercel。

## 功能

- 首页：自我介绍、精选作品、最新文章
- 作品页 `/works/`
- 文章列表 `/blog/`、文章详情、上一篇/下一篇、目录
- 标签 `/tags/`、标签详情页
- 站内搜索 `/search/`（构建期生成索引，纯前端匹配，支持中文子串）
- 暗色模式（跟随系统 + 手动切换，无闪白）
- RSS `/rss.xml`、Sitemap、robots.txt
- 响应式布局、打印样式、404 页面

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321
```

构建与预览：

```bash
npm run build      # 产物在 dist/
npm run preview
```

> 需要 Node.js ≥ 22.12。仓库里的 `.nvmrc` 已固定为 22。

## 目录结构

```
src/
├─ content/posts/        # 文章，一篇一个 .md
├─ content.config.ts     # 文章 frontmatter 的类型校验
├─ data/site.ts          # ★ 个人信息、作品、社交链接、技能、经历
├─ components/           # Header / Footer / 卡片 / 图标 / 主题切换
├─ layouts/BaseLayout.astro
├─ lib/posts.ts          # 文章查询、阅读时长、日期、标签、纯文本
├─ pages/                # 路由
│  ├─ index.astro        # 首页
│  ├─ works.astro        # 作品
│  ├─ blog/              # 文章列表与详情
│  ├─ tags/              # 标签
│  ├─ about.astro        # 关于
│  ├─ search.astro       # 搜索
│  ├─ search-index.json.ts
│  ├─ rss.xml.js
│  └─ robots.txt.ts
└─ styles/global.css     # 设计令牌 + 全部样式
public/favicon.svg
```

## 改成你自己的内容

### 1. 个人信息与作品

编辑 `src/data/site.ts`，所有带 `TODO` 的字段替换掉即可：

- `site.name` 名字、`site.role` 身份、`site.tagline` 一句话定位
- `site.intro` 首页自我介绍、`site.email` 邮箱、`site.location` 城市
- `socials` 社交链接（图标可选 `github` / `mail` / `x` / `rss` / `link`）
- `projects` 作品列表，`featured: true` 的会出现在首页
- `skills`、`timeline` 关于页的技能与经历

### 2. 写一篇新文章

在 `src/content/posts/` 新建 `my-post.md`：

```md
---
title: 文章标题
description: 一句话摘要，会显示在列表和搜索结果里
pubDate: 2026-11-01
tags: ['前端', '随笔']
draft: false
---

正文从这里开始。
```

- 文件名就是 URL：`my-post.md` → `/blog/my-post/`
- `draft: true` 的文章只在 `npm run dev` 时可见，不会构建到线上
- 二级、三级标题会自动生成右侧目录

### 3. 站点域名

部署后把 `astro.config.mjs` 里的 `site` 改成正式域名，否则 RSS 和 Sitemap 里会是占位地址：

```js
site: 'https://your-domain.com',
```

### 4. 配色与字体

全部在设计令牌里，改 `src/styles/global.css` 顶部 `:root` 与 `[data-theme='dark']` 两组变量即可，不用动组件。

## 部署到 Vercel

1. 把代码推到 GitHub（见下）
2. 打开 [vercel.com/new](https://vercel.com/new)，选择这个仓库
3. Framework Preset 会自动识别为 **Astro**，Build Command `npm run build`，Output Directory `dist`，直接 Deploy
4. 之后每次 `git push` 都会自动重新部署

首次推送 GitHub：

```bash
git init
git add .
git commit -m "init: astro blog"
gh repo create my-blog --public --source=. --push
# 或者手动在 GitHub 新建仓库后：
# git remote add origin https://github.com/<你的用户名>/<仓库名>.git
# git branch -M main
# git push -u origin main
```

## 自定义说明

- 搜索索引在构建时生成到 `/search-index.json`，文章越多索引越大。目前是全量正文（截断到 4000 字符），几十篇以内没有压力；上百篇时建议只保留标题、摘要和标签。
- 没有引入任何第三方字体，中文用系统字体，首屏不产生额外请求。
- 想加评论、统计、图床，都是加一个脚本或组件的事，不影响现有构建。
