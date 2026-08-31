# StackTao Site

一个独立于原型页面的静态内容框架。它保留 StackTao 的宣纸、水墨与编辑排版语言，同时采用类似 VitePress 的信息结构：站点导航、文章列表、按需加载的正文、章节大纲和启动器搜索。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会先读取 `example-content/`，把 Markdown 转换到 `public/content/`，再启动 Vite。

## 使用独立文章仓库

将文章仓库检出到任意目录，然后通过 `CONTENT_DIR` 指向它：

```bash
CONTENT_DIR=/srv/stacktao-content npm run build
```

最终静态文件位于 `dist/`。服务器只需发布这个目录，不需要 Node.js 常驻进程。

内容树、文章格式和图片约定见 [docs/content-repository.md](docs/content-repository.md)，服务器部署见 [docs/deployment.md](docs/deployment.md)。

## 数据产物

生成器会创建：

```text
public/content/
├── manifest.json
├── search-index.json
├── assets/<slug>/images/*
└── posts/<slug>.json
```

正文会在构建阶段经过 HTML 白名单清理；浏览器不直接执行或解析 GitHub 仓库里的 Markdown。
