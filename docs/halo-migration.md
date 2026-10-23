# Halo 文章迁移记录

2026-10-23，将同服务器保留的 Halo PostgreSQL 内容迁入 https://stacktao.cn/。

## 迁移范围

- 25 条原文章记录：迁入 23 篇公开文章、1 篇未发布草稿；1 篇已删除文章不恢复到新站。
- 原有 9 篇新站文章未覆盖、未删除，因此当前前台共 32 篇文章。
- 保留标题、日期、摘要、标签、分类、置顶标记与正文。分类同时加入可筛选的标签，原分类独立保存在 frontmatter `categories`。
- 保留原始 Halo ID、slug、永久链接、发布时间戳、快照 ID 和格式，便于追溯。
- 已发布文章只读取 releaseSnapshot；草稿读取 headSnapshot；递归还原增量快照，避免把空补丁当成空正文。
- 17 篇公开原文为 HTML，6 篇为 Markdown。HTML 文章标记 `format: html`，构建与后台预览直接清洗 HTML，避免二次 Markdown 解析破坏代码块；后台明确显示 HTML 格式，插入加粗、链接与图片也使用对应语法。
- 中文 slug 不满足本站路径约束时使用稳定的 `halo-原ID`；23 个公开旧链接通过 Nginx 301 跳转到新地址，草稿不生成公开跳转。

## 图片未找回项

原文引用的 8 张外链图片未找回，保留原地址，不用其他图片冒充原图。服务器当前附件目录没有这批旧 WordPress 文件；Halo 附件记录仍有元数据，但相应文件不存在。经用户授权后从本机及服务器探测：

- blob.sutao.site：4 张，服务器 DNS 无法解析。
- blog.sutao.site：1 张，服务器 DNS 无法解析。
- ljdhwitv.eu-central-1.clawcloudrun.com：3 张，连接超时。

后续拿到原 WordPress uploads 备份，可按原文件名补入文章 images 目录并更新引用。详细 URL 与错误清单留在服务器私有迁移目录 `missing-images.json`。

## 服务器文件

- 迁移记录：`/srv/stacktao/migrations/20261023-halo/report.json`。
- 原始转换暂存与 Nginx 切换前备份：同目录，仅 root 可访问；含未发布草稿，勿放到网站目录。
- 公开文章与草稿：`/srv/stacktao/data/content/posts/<年>/<slug>/index.md`。
- 旧链接规则：`/www/server/panel/vhost/rewrite/stacktao-halo-redirects.conf`，由主站 HTTPS 配置 include。修改/重建宝塔网站配置时保留这条 include。
- 新应用镜像标签：`stacktao:20261023-halo`；旧镜像保留。
- 导入前快照：`/srv/stacktao/backups/20261023T033434Z-3618212`。导入后再次执行常规备份。
- 原 Halo 数据库、附件和停用的程序仍保留。

## 转换工具与验证

`node scripts/import-halo.mjs CONTENT.ndjson NEW_OUTPUT [IMAGE_RESULTS.json]` 读取限定类型的内容导出。不要导出完整 extensions 表，该表还包含系统配置及凭据。转换输出目录必须不存在，不直接改线上目录；导入线上时逐篇检查 slug 冲突，禁止覆盖已有内容。

验证覆盖：快照还原、草稿隔离、删除记录跳过、中文链接解码、后台 HTML 保存与预览、安全过滤、构建代码块保持。逐篇核对线上 23 篇标题/日期/正文和旧地址跳转；未发布草稿的公开 JSON 返回 404。HTML 代码块内容与原文逐块一致。
