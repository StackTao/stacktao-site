# StackTao Site

由 Markdown 文章和 JSON 内容驱动的个人博客。根目录预览与构建站点共用 StackTao 的作者资料、项目和文章数据；根目录保留原始页面作为辅助栏目与内容缺失时的回退。

GitHub Pages：<https://stacktao.github.io/stacktao-site/>

主导航为「文字、造物、沿途、留言墙」；「逛逛」打开完整站内目录与搜索，支持等辅助栏目也可从这里或页脚进入。界面支持深浅色、正文检索、归档筛选、阅读字号和段落书签。相册中的 Unsplash 图片是明确标注的示例影像。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会先读取 `example-content/`，生成原型能够直接读取的页面数据，再启动本地服务。运行期间修改 Markdown 会自动重生成并刷新页面，不需要手工重启。

## 内容管理后台与 AI 发布

```bash
npm run admin
```

打开 `http://127.0.0.1:5174/admin/`，用首次启动生成的 `.local/admin/owner-token` 登录。后台支持文章自动存草稿、Markdown 预览、图片拖放/粘贴、发布/撤回、相册、项目、站点菜单和 AI 令牌管理。前台静态站与管理服务独立，GitHub Pages 不运行后台。

所有后台操作使用 `/api/v1`；AI 可用受限令牌写草稿，也可单独授权发布与 Git 同步。发布构建本机静态产物，线上发布需推送仓库并等待部署完成。

使用与部署见 [内容工作台说明](docs/content-studio.md)，API 调用见 [AI 发布协议](docs/ai-publishing.md) 和 [OpenAPI 文档](admin/openapi.json)。

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

`content-generated.js` 覆盖首页、文章、最近更新、项目和相册，并按配置更新作者资料、顶部菜单与页脚菜单。根预览通过 `data-content-base` 使用同一份生成文件和媒体资源；无需复制内容资产。缺少项目或相册 JSON 时保留回退页面。演讲模块已移除，旧配置中的演讲菜单会被忽略，旧地址显示 404。页面合并后，指向已经移除文章的旧链接保留原文字、取消跳转。正文在构建阶段经过 HTML 白名单清理；浏览器不直接执行或解析 Markdown。

## 留言墙（本机交互预览）

导航「留言墙」或 `#/guestbook` 可进入。支持喷绘、刻画、纸条与贴纸，文字效果随媒介变化，可修改或收回自己的痕迹。墙册显示每面墙的容量、留言目录和定位入口；每面最多 24 处，可主动开新墙。留言保存在当前浏览器的 localStorage，没有公开发布或跨访客同步。未保存内容离开时会提醒；这不是草稿自动保存，刷新后只保留已保存的留言。设计和存储边界见 [docs/guestbook.md](docs/guestbook.md)。

## Personal Journal 设计

作者介绍、文章折页、可拖拽回弹的页边书签、照片接触印样、项目工作笔记与纸笺留言墙；标题、正文和题签采用不同字体层次。设计原则、参考来源、动效和验收范围见 [docs/studio.md](docs/studio.md)。

## 回归验证

```bash
npm run test:site
npm run test:admin
npm run build
```

导航、搜索、相册灯箱、归档、阅读偏好、书签与留言墙存储/碰撞流程均有回归测试。浏览器视觉与指针交互验收另外执行，不能由 DOM 测试替代。
