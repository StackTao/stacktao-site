# StackTao Site

一个独立于原型目录的静态内容框架。这里的“框架”只负责把 Markdown 变成页面数据，不重新设计页面。

`public/css/style.css`、`public/js/site.js`、`public/js/pages.js` 和 `public/js/pages-longform.js` 是 `inkscape-45` 原型的原样快照，因此 ST 书写、水墨山峦、随机飞鸟、路由转场、导航、搜索、深浅色和文章排版都与原型一致。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会先读取 `example-content/`，生成原型能够直接读取的页面数据，再启动本地服务。运行期间修改 Markdown 会自动重生成并刷新页面，不需要手工重启。

## 使用独立文章仓库

将文章仓库检出到任意目录，然后通过 `CONTENT_DIR` 指向它：

```bash
CONTENT_DIR=/srv/stacktao-content npm run build
```

最终静态文件位于 `dist/`。构建过程不会重新打包或改写原型 CSS/JS；服务器只需发布该目录，不需要 Node.js 常驻进程。

内容树、文章格式和图片约定见 [docs/content-repository.md](docs/content-repository.md)，服务器部署见 [docs/deployment.md](docs/deployment.md)。

## 数据产物

生成器会创建：

```text
public/content/
├── manifest.json
├── search-index.json
├── assets/<slug>/images/*
└── posts/<slug>.json

public/js/
└── content-generated.js     # 注入原型 PAGES、文章列表和搜索项
```

`content-generated.js` 会覆盖原型的 `/posts` 列表和同名文章路由，但不触碰视觉与动画脚本。正文会在构建阶段经过 HTML 白名单清理；浏览器不直接执行或解析 GitHub 仓库里的 Markdown。
