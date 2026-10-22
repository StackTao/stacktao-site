# 内容工作台

管理界面与 AI 使用同一套 `/api/v1` 接口。前台仍是静态网站；后台是独立 Node 服务，不包含在 `dist/`，不会随 GitHub Pages 公开部署。

## 启动

```bash
npm ci
npm run admin
```

打开 `http://127.0.0.1:5174/admin/`。首次启动会生成 `.local/admin/owner-token`，权限为仅当前用户可读写。使用终端查看并粘贴到登录框：

```bash
cat .local/admin/owner-token
```

口令不写入前端资源或浏览器 localStorage。登录使用 8 小时 HttpOnly、SameSite=Strict 会话。`.local/` 已加入 Git 忽略，仍需自行妥善备份其中的草稿与历史。

默认内容来自 `example-content/`，也可指定：

```bash
CONTENT_DIR=/absolute/path/to/content npm run admin
```

请使用 Node 22。工作台默认只监听 127.0.0.1；远程使用需配置 HTTPS 反向代理、`ADMIN_HOST` 与准确的 `ADMIN_PUBLIC_ORIGIN=https://studio.example.com`，并保留 Host 请求头。API 不开放跨域访问。静态站与管理服务可以分开部署。

## 日常写作

1. 文章 → 写一篇。填写标题、Markdown 正文，可直接拖入或粘贴图片。
2. 停止输入约 1.2 秒自动保存草稿；也可按 Ctrl/Cmd+S。
3. 点击预览，检查文字和图片。日期、标签、摘要、封面和文末讨论在右侧维护。
4. 「发布并构建」生成新的 `dist/`，通过「打开站点预览」查看。线上发布见下节。

编辑已发布文章只修改私有草稿，不会改变正在展示的正文。发布后才修改内容源。写作使用 revision + If-Match 防止不同窗口或 AI 互相覆盖；冲突时保留当前输入，不自动强行合并。文章链接名首次保存后固定。

相册有名称、描述、日期、上传照片、说明与地点、上移和移除入口；项目与站点菜单使用表单维护。媒体库展示通过后台上传的图片，旧文章自带的 `images/` 继续按原路径使用。当前上传不做自动图片压缩，单张上限 12 MB，建议上传前使用适合网页的尺寸。

## 构建与线上发布的区别

后台的「发布并构建」是完整的本机/服务器静态构建：先构建到临时目录，成功后替换 `dist/`。失败时保留之前的静态站并恢复源文件，草稿不丢失。上一个成功产物保留在 `dist.previous/`，历史源文件在 `.local/admin/history/`。

- 自有服务器：让静态服务指向构建产物目录；在同一主机上运行后台即可更新。
- GitHub Pages：需要将内容提交并推送到主仓库，GitHub Actions 完成后才上线。

可以手动提交，也可开启后台「发布记录 → 同步上线」：

```bash
ADMIN_GIT_PUBLISH=1 npm run admin
```

启用前确保当前内容仓库位于 `main` 分支、`origin` 正确、Git 认证和作者信息已配置。同步只会提交 `posts/`、`albums/`、`media/`、`projects/`、`content.config.json`，不会提交后台口令或框架修改。未提交的内容文件也会一起发布，因此在同步确认前检查内容库。

该操作推送到 `origin/main`；界面显示「已推送」，不把它当作部署成功。需要在 GitHub Actions 确认部署完成。独立内容仓库必须另行配置部署工作流；当前主仓库工作流不会因另一仓库的推送自动触发。首次上线新版框架仍需正常提交、推送框架代码。

## AI 与其他管理工具

在「AI 与 API」创建单独令牌。默认 `content:read`、`drafts:write`、`media:write`；需要 AI 直接发布才添加 `publish`，自动推送另需 `deploy`。相册、项目和站点设置有独立管理权限。令牌明文只展示一次，服务端保存哈希，90 天过期，可立即撤销。

- [OpenAPI 文档](../admin/openapi.json)：启动后可访问 `/admin/openapi.json`。
- [AI 发布协议与示例](ai-publishing.md)。

## 存储与边界

- 公开内容仍为 Markdown、JSON 和图片，不需要数据库迁移。
- 未发布草稿、会话凭据、令牌哈希、发布记录、历史备份位于私有状态目录。`ADMIN_STATE_DIR` 可指定其他绝对路径。
- 新上传图片放在内容库 `media/`；只有被公开文章或相册引用的图片才复制进公开产物。原图 API 需要登录。
- 会话在服务重启后失效；令牌、草稿和内容继续保留。
- 当前定位为单作者工作台。管理 API 按序执行写入和构建，不能在多个实例上同时共享写入相同目录。
- 留言墙仍是访客当前浏览器的本机数据。没有假装提供全站留言审核、跨访客同步或用户账号管理。
