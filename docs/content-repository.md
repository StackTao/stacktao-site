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
├── projects/
│   └── projects.json
├── talks/
│   └── talks.json
├── albums/
│   └── 2026-jiangnan/
│       ├── album.json
│       └── images/
│           └── bridge.webp
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
- 相对图片路径会发布为 `content/assets/<slug>/images/*`。

## 站点与菜单配置

文章仓库根目录必须包含 `content.config.json`。`site` 控制首页文案、左侧个人资料和页脚署名，`navigation` 控制顶部菜单，`footerNavigation` 控制页脚菜单；未提供菜单数组时保留页面框架的默认菜单。

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
  "navigation": [
    { "label": "文章", "route": "/posts", "key": "blog", "enabled": true },
    { "label": "项目", "route": "/projects", "key": "projects", "enabled": true },
    { "label": "演讲", "route": "/talks", "key": "talks", "enabled": true },
    { "label": "相册", "route": "/photos", "key": "photos", "enabled": true }
  ],
  "footerNavigation": [
    { "label": "笔记", "route": "/notes" },
    { "label": "相册", "route": "/photos" }
  ]
}
```

- `route` 必须是站内 `/` 开头的 Hash 路由。
- `enabled: false` 可以临时隐藏顶部菜单项。
- `key` 用于导航状态标识，建议使用稳定的英文名称。

## 项目数据

`projects/projects.json` 按分组维护项目。缺少该文件时保留原型内置项目页。

```json
{
  "title": "项目",
  "description": "持续维护的开源工具与设计实验。",
  "groups": [
    {
      "title": "当前维护",
      "projects": [
        {
          "name": "Peak",
          "summary": "面向开发者的性能观察工具。",
          "status": "Active",
          "url": "https://github.com/StackTao",
          "color": "#3f7666"
        }
      ]
    }
  ]
}
```

## 演讲数据

`talks/talks.json` 保存演讲主题和每次活动记录。缺少该文件时保留原型内置演讲页。

```json
{
  "title": "演讲",
  "description": "关于工具设计与长期维护的分享。",
  "talks": [
    {
      "title": "让工具经得起时间",
      "lang": "zh",
      "url": "#/posts/tools-that-last",
      "events": [
        {
          "name": "StackTao Notes",
          "date": "2026-08-29",
          "location": "线上",
          "language": "中文",
          "links": [
            { "label": "文章", "url": "#/posts/tools-that-last" }
          ]
        }
      ]
    }
  ]
}
```

## 相册数据

每个相册独立一个目录。`src` 可以是相对于相册目录的图片路径，也可以是 `https://` 图片地址；本地图片会复制到 `content/assets/albums/<slug>/`。

```json
{
  "title": "江南",
  "slug": "2026-jiangnan",
  "date": "2026-08-17",
  "description": "雨后的街巷与水面。",
  "photos": [
    {
      "src": "images/bridge.webp",
      "alt": "雨后的石桥",
      "place": "苏州",
      "date": "2026"
    }
  ]
}
```

相册目录名和 `slug` 只能使用小写英文、数字和连字符。图片建议预先压缩为 WebP 或 AVIF，并填写准确的 `alt`。

提交内容后，由服务器拉取仓库并重新执行 `CONTENT_DIR=/path/to/content npm run build`。生成器会同步更新菜单、文章、项目、演讲、相册、搜索索引和章节大纲。构建成功后再替换线上 `dist/`，可避免半成品被访问。
