# 文章仓库约定

推荐将页面框架与文章分为两个仓库。页面框架负责设计、路由和部署；文章仓库只保存内容与媒体。

## 文件树

```text
stacktao-content/
├── content.config.json
├── posts/
│   ├── 2026/
│   │   ├── quiet-interface/
│   │   │   ├── index.md
│   │   │   └── images/
│   │   │       └── layout.webp
│   │   └── tools-that-last/
│   │       └── index.md
│   └── 2025/
│       └── open-source-rhythm/
│           └── index.md
├── drafts/
└── README.md
```

每篇文章使用一个英文 `slug` 目录，正文与图片放在一起。年份目录用于编辑管理，不参与最终 URL；例如 `posts/2026/quiet-interface/index.md` 的地址始终是 `/#/posts/quiet-interface`。

## Frontmatter

```markdown
---
title: 安静的界面如何工作
date: 2026-08-17
updated: 2026-08-31
summary: 一段用于文章列表和搜索结果的摘要。
tags:
  - 设计
  - 交互
cover: ./images/layout.webp
lang: zh
discussion: 哪个界面让你可以长时间专注而不感到疲惫？
draft: false
featured: true
---

## 第一节

正文……
```

- `title`、`date` 必填。
- `draft: true` 不进入站点产物。
- `featured` 会写入内容清单，预留给后续首页策划使用；当前原型仍按发布日期展示最近文章。
- `lang` 默认是 `zh`，仅用于原型已有的语言数据属性。
- `discussion` 可选，填写后会在文章卷末显示讨论引子和原型印章落款。
- `slug` 默认取文章目录名，也可以在 Frontmatter 显式指定。
- `h2` 和 `h3` 自动生成文章大纲。
- 阅读时间、年份分组和搜索索引自动计算。
- 相对图片路径会发布为 `/content/assets/<slug>/images/*`。

## 站点配置

文章仓库根目录必须包含 `content.config.json`。当前版本将它写入内容清单作为站点元数据，不会用它重写原型的个人介绍和导航：

```json
{
  "site": {
    "name": "StackTao",
    "title": "在复杂的世界里，做清醒的工具。",
    "description": "开源工具作者、设计工程师。",
    "role": "开源工具作者\n设计工程师",
    "bio": "专注开发者工具与交互设计。",
    "now": "构建安静而可靠的工具",
    "email": "hi@example.com"
  },
  "projects": []
}
```

提交内容后，由服务器拉取仓库并重新执行 `CONTENT_DIR=/path/to/content npm run build`。生成器会同步更新文章页、归档列表、首页最近文章、搜索索引和章节大纲。构建成功后再替换线上 `dist/`，可避免半成品被访问。
