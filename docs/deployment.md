# 自有域名部署

## 服务器目录

```text
/srv/
├── stacktao-site/       # 本页面框架仓库
└── stacktao-content/    # GitHub 文章仓库，只读 Deploy Key

/var/www/stacktao/       # 对外发布的构建结果
```

## 更新流程

```bash
git -C /srv/stacktao-content pull --ff-only
cd /srv/stacktao-site
npm ci
CONTENT_DIR=/srv/stacktao-content npm run build
```

确认构建成功后，将 `dist/` 原子切换到 `/var/www/stacktao/current`。GitHub Webhook 可以触发这组命令；Webhook 接收端必须校验 `X-Hub-Signature-256`，并使用无登录权限的专用系统用户运行。不要把 GitHub Token 放进前端代码。

## Nginx

参考 [deploy/nginx.conf](../deploy/nginx.conf)。页面沿用原型的 Hash 路由，文章地址形如 `/#/posts/quiet-interface`；Nginx 只需发布静态文件，不参与文章渲染。

域名的 `A` 或 `AAAA` 记录指向服务器后，使用 Certbot 或现有证书系统启用 HTTPS。`manifest.json` 使用短缓存，带 slug 的文章和图片可以使用长缓存。
