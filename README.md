# StackTao Site

一个独立于原型目录的静态内容框架。这里的“框架”负责把 Markdown 文章和 JSON 结构化内容变成页面数据，使用独立的 Personal Studio 视觉层展示内容。

GitHub Pages：<https://stacktao.github.io/stacktao-site/>

当前界面以个人文集为主：正文优先，照片与文字旋钮作为独立的小物件。支持深浅色、键盘搜索、归档筛选、阅读字号和段落书签；内容生成接入相同的视觉与路由。

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

`content-generated.js` 会覆盖原型的首页、文章、最近更新、项目、演讲和相册路由，并按配置更新左侧个人资料、顶部菜单与页脚菜单，但不触碰视觉和 Canvas 动画。缺少某类 JSON 时继续使用原型内置页面。正文会在构建阶段经过 HTML 白名单清理；浏览器不直接执行或解析 GitHub 仓库里的 Markdown。

## 留言墙（本机交互预览）

导航「留言」或 `#/guestbook` 可进入。支持喷绘、刻画、纸条与贴纸，文字效果随媒介变化，可修改或收回自己的痕迹。墙册显示每面墙的容量、留言目录和定位入口；每面最多 24 处，可主动开新墙。留言保存在当前浏览器的 localStorage，没有公开发布或跨访客同步。未保存内容离开时会提醒；这不是草稿自动保存，刷新后只保留已保存的留言。设计和存储边界见 [docs/guestbook.md](docs/guestbook.md)。

## Personal Journal 设计

作者介绍、文章折页、可拖拽回弹的页边书签、照片接触印样、项目工作笔记与纸笺留言墙；标题、正文和题签采用不同字体层次。设计原则、参考来源、动效和验收范围见 [docs/studio.md](docs/studio.md)。

## 回归验证

```bash
npm run test:site
npm run build
```

导航、搜索、相册灯箱、归档、阅读偏好、书签与留言墙存储/碰撞流程均有回归测试。浏览器视觉与指针交互验收另外执行，不能由 DOM 测试替代。
