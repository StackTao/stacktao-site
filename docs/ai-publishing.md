# AI 发布与管理协议

接口基址默认 `http://127.0.0.1:5174/api/v1`，完整字段与错误码见 [OpenAPI](../admin/openapi.json)。管理界面也调用这些接口，不存在另一套仅 UI 可用的发布操作。

将令牌放到工具的环境变量 `STACKTAO_TOKEN`，不要写入文章、仓库或提示词正文。

## 最短流程

```bash
export STACKTAO_API=http://127.0.0.1:5174
# 由安全环境注入 STACKTAO_TOKEN
npm run publish:article -- /path/to/article.md
npm run publish:article -- /path/to/article.md --slug=my-article --publish
# 明确启用了 Git 发布且令牌拥有 deploy 权限时：
npm run publish:article -- /path/to/article.md --slug=my-article --deploy
```

默认只创建草稿。Markdown 文件沿用 title、date、summary、tags 等 Frontmatter；`images/` 中的相对配图会上传后替换为媒体库引用。提供相同 `--slug` 会读取现有 revision 后更新草稿；不要用新 slug 重试同一篇发布。CLI 不会绕过版本冲突。

## HTTP 示例

创建草稿：

```bash
curl "$STACKTAO_API/api/v1/posts" \
  -H "Authorization: Bearer $STACKTAO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"slug":"my-article","title":"我的文章","date":"2026-10-22","tags":["随记"],"markdown":"## 你好\n这是正文。"}'
```

返回 `slug`、`revision`、`published` 和 `hasDraft`。更新或发布必须携带刚读取的 revision：

```bash
curl "$STACKTAO_API/api/v1/posts/my-article/publish" \
  -H "Authorization: Bearer $STACKTAO_TOKEN" \
  -H 'If-Match: 返回的revision' \
  -H 'Content-Type: application/json' \
  --data '{}'
```

上传图片（原始文件，不是 multipart）：

```bash
curl "$STACKTAO_API/api/v1/media?name=photo.webp" \
  -H "Authorization: Bearer $STACKTAO_TOKEN" \
  -H 'Content-Type: image/webp' \
  --data-binary @photo.webp
```

将返回的 `src` 写成 `![描述](media/文件名.webp)`；相册 `photos[].src` 也使用同一值。私有预览 URL 不能写进文章作为公开图片地址。

## 管理能力与权限

| 接口 | 能力 | 令牌权限 |
|---|---|---|
| GET /posts、/posts/{slug} | 列表与详情 | content:read |
| POST /posts、PUT /posts/{slug} | 创建/修改草稿 | drafts:write |
| POST /preview | 安全 Markdown 预览 | drafts:write |
| POST /posts/{slug}/publish、/unpublish | 发布/撤回并构建 | publish |
| GET /media、POST /media | 媒体列表/上传 | content:read / media:write |
| GET /collections、PUT /collections | 相册读取/管理并构建 | content:read / albums:write |
| GET /projects、PUT /projects | 项目读取/管理并构建 | content:read / projects:write |
| GET /settings、PUT /settings | 设置读取/管理并构建 | content:read / settings:write |
| POST /deploy | 构建、提交内容、推送 origin/main | deploy，且服务显式启用 |
| GET /events、GET/POST/DELETE /tokens | 记录与访问授权管理 | 管理员会话或管理口令 |

更新相册的 If-Match 来自 GET /collections 中该相册的 revision；新相册使用 `If-Match: new`。项目和设置从对应 GET 返回的 revision 取值。令牌管理的 DELETE 路径为 `/tokens/{id}`。

## AI 必须遵守的处理顺序

1. 默认写草稿。仅当用户授权公开发布，且令牌有 publish 权限时发布。
2. 修改之前先读取详情与 revision；409 表示存在新版本，重新读取并让用户决定如何合并，不能反复用最新 revision 盲目覆盖。
3. 网络结果不确定时先 GET 同一 slug 检查状态，不创建另一篇副本。创建已存在 slug 返回 409。
4. 422 表示构建失败，草稿仍保留，之前的公开产物不受影响。修复错误后再试。
5. publish 仅构建静态站。需要 GitHub Pages 上线时再调用 deploy，并检查 GitHub Actions；pushed 不等于 deployed。
6. 不修改与任务无关的文章、菜单或项目；不在公开内容中输出令牌。
