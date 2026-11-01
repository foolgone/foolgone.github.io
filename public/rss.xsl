<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/rss/channel">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="title" /> · RSS</title>
        <style>
          :root {
            color-scheme: light dark;
            --bg: #faf8f4;
            --surface: #fffdfa;
            --text: #191512;
            --muted: #6f665c;
            --faint: #948a7e;
            --border: #e4ded4;
            --accent: #b4451f;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #12100e;
              --surface: #1a1714;
              --text: #ece6dd;
              --muted: #9c9287;
              --faint: #7a7166;
              --border: #2a2521;
              --accent: #e2764f;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 3rem 1.5rem 5rem;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
              "Microsoft YaHei", system-ui, sans-serif;
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 42rem; margin: 0 auto; }
          .eyebrow {
            margin: 0 0 0.5rem;
            font-family: ui-monospace, Consolas, monospace;
            font-size: 0.7rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--faint);
          }
          h1 {
            margin: 0;
            font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", Georgia, serif;
            font-size: clamp(1.7rem, 5vw, 2.3rem);
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }
          .desc { margin: 0.75rem 0 0; color: var(--muted); font-size: 0.95rem; }
          .meta {
            margin: 1.25rem 0 0;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid var(--border);
            font-family: ui-monospace, Consolas, monospace;
            font-size: 0.75rem;
            color: var(--faint);
          }
          code {
            padding: 0.1em 0.35em;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--surface);
            font-size: 0.85em;
            word-break: break-all;
          }
          ul { list-style: none; margin: 0; padding: 0; }
          li {
            padding: 1.25rem 0;
            border-bottom: 1px solid var(--border);
          }
          li a {
            font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", Georgia, serif;
            font-size: 1.15rem;
            font-weight: 600;
            color: var(--text);
            text-decoration: none;
          }
          li a:hover { color: var(--accent); }
          li p { margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--muted); }
          li .date {
            display: block;
            margin-top: 0.4rem;
            font-family: ui-monospace, Consolas, monospace;
            font-size: 0.72rem;
            color: var(--faint);
          }
          .hint {
            margin-top: 2rem;
            padding: 1rem 1.15rem;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface);
            font-size: 0.85rem;
            color: var(--muted);
          }
          .hint a { color: var(--accent); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="eyebrow">RSS 2.0 Feed</p>
          <h1><xsl:value-of select="title" /></h1>
          <p class="desc"><xsl:value-of select="description" /></p>
          <p class="meta">
            共 <xsl:value-of select="count(item)" /> 篇文章 · 订阅地址
            <code><xsl:value-of select="link" />rss.xml</code>
          </p>

          <ul>
            <xsl:for-each select="item">
              <li>
                <a href="{link}"><xsl:value-of select="title" /></a>
                <p><xsl:value-of select="description" /></p>
                <span class="date"><xsl:value-of select="substring(pubDate, 6, 11)" /></span>
              </li>
            </xsl:for-each>
          </ul>

          <p class="hint">
            这是一个 RSS 订阅源，不是普通网页。把上面的地址复制到阅读器（Follow、Inoreader、Feedly
            等）即可订阅新文章。
          </p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
