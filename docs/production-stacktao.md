# stacktao.cn 生产部署记录

部署日期：2026-10-23。服务器 43.163.226.167，宝塔网站名称 `stacktao.cn`（网站 ID 11）。

## 入口与运行方式

- 博客：https://stacktao.cn/
- 管理端：https://stacktao.cn/admin/，共用主域名，无须另配 DNS。
- 宝塔 Nginx：`/www/server/panel/vhost/nginx/stacktao.cn.conf`。
- 宝塔网站目录：`/www/wwwroot/stacktao.cn`，符号链接到 `/srv/stacktao/data/site/dist`。
- 容器：`stacktao-app-1`，Node 22，非 root UID/GID 1000，`unless-stopped` 自动启动。
- 后端仅绑定 `127.0.0.1:15174`，Nginx 反向代理 `/admin`、`/api`、`/site`。
- Nginx 覆写 `X-Stacktao-Client-IP`，后端 `TRUST_PROXY=nginx`。不要开放 15174 公网端口。
- 代码：`/srv/stacktao/current` → `/srv/stacktao/releases/20261023`。
- Compose：`/srv/stacktao/current/deploy/compose.baota.yml`；同目录 `.env` 保存部署路径与域名。

## 首次登录与待配置项

在宝塔文件管理中读取 `/srv/stacktao/data/state/owner-token`，只在首次创建管理员账号时填入初始化凭据；用户名、找回邮箱、密码由站长本人设置。不要将该文件或 state 目录放入网站根目录、Git 或聊天记录。

登录后，在设置中配置邮件服务和 Google / GitHub / Linux DO 的 Client ID、Client Secret；回调地址以设置页显示为准。绑定站长账号后再启用第三方登录。未配置邮件服务时不能通过邮件找回密码。

当前沿用主域名原证书，有效期至 **2026-12-11**。证书路径已归入宝塔 `vhost/cert/stacktao.cn`；需要在到期前通过宝塔配置续期/更换证书，本次未申请新证书或建立自动续期。

## 数据与备份

- 文章、图片、相册、项目、站点设置：`/srv/stacktao/data/content`。
- 账号、API 凭据、共享留言墙、草稿、统计：`/srv/stacktao/data/state`。
- 构建输出：`/srv/stacktao/data/site/dist`，可重新生成。
- 自动备份：root crontab 每日 **04:20（服务器 CST / Asia Shanghai）**，运行 `sh /srv/stacktao/current/deploy/backup.sh`。
- 快照：`/srv/stacktao/backups/<UTC时间>-<进程号>`，日志 `backup.log`；备份短暂停止后端以确保一致性，静态博客仍可阅读。
- 本次实际完成快照和独立目录恢复验证，使用 SHA-256 检验文件完整性。
- 当前备份保留全部快照，需关注磁盘空间；尚未配置异地备份。务必另行定期将加密快照复制到另一台机器或对象存储。

手动备份：

```sh
sh /srv/stacktao/current/deploy/backup.sh
```

恢复必须先停止 app，并将快照恢复到**不存在的新目录**；禁止直接覆盖现有数据：

```sh
cd /srv/stacktao/current/deploy
docker compose -f compose.baota.yml stop app
docker run --rm --entrypoint node \
  -v /srv/stacktao/backups:/backups:ro -v /srv/stacktao:/restore \
  stacktao:20261023 scripts/data-snapshot.mjs restore \
  /backups/选择的快照 /restore/data-restored
chown -R 1000:1000 /srv/stacktao/data-restored
chmod 755 /srv/stacktao/data-restored
```

保留旧 data 为回滚副本，再将 data-restored 更名为 data；Compose 挂载路径和宝塔网站符号链接不需更改。启动 app 后重新生成静态文件，检查 HTTPS 和管理端，再恢复对外写入。

## 更新代码

先备份。将新代码上传到新的 releases 目录（不要上传 `.local`、`.env`、`node_modules`、账号文件），复制私有 deploy/.env 到新版本，设置新的 APP_VERSION 镜像标签。以新目录的 compose.baota.yml 构建、启动，并更新 current 符号链接。必须保持 DATA_DIR=/srv/stacktao/data，不要覆盖该目录。

不要运行普通 compose.yml，否则其中的 Caddy 会争用宝塔的 80/443 端口。回滚代码时使用旧镜像和同一份数据；涉及数据格式变化时需同时评估快照恢复，避免覆盖更新后的留言。

## Halo 保留与回滚

- Halo 已停止，`halo.service` 已 disabled；没有删除安装目录、附件或原 PostgreSQL 数据库。
- 保留 `/root/.halo2`、`/opt/sttao/halo` 和 PostgreSQL `halo` 数据库。
- 迁移前备份：`/srv/stacktao/backups/pre-halo/`，包含 PostgreSQL 自定义格式备份 `halo.dump`、文件压缩包 `halo-files.tar.gz`、原 Nginx 主配置、服务配置和宝塔网站登记数据库快照。
- 原先同样代理 Halo 的 `sutao.site` 已 301 跳转到 `https://stacktao.cn`。
- **2026-10-23 已完成 Halo 文章迁移：23 篇公开文章、1 篇草稿，跳过 1 篇已删除文章。** 原有 9 篇内容保留；迁移详情见 `docs/halo-migration.md`。
- 回滚需暂停新博客写入，备份新数据，将独立的 stacktao.cn vhost 配置移出 Nginx include 目录，恢复 pre-halo/nginx.conf，启动 Halo，执行 nginx -t 后 reload。不要直接覆盖整个宝塔数据库，否则会影响其他网站后续改动。

服务器对 systemd 启动目录及 root crontab 设置了 immutable 保护。仅为禁用 Halo 与添加备份临时解锁了对应条目，操作后已恢复原属性；未关闭全局防护。

## 验证结果

- 公网 HTTPS 首页、后台 200；HTTP 重定向 HTTPS；实际浏览器打开首页与共享留言墙，无页面错误。
- 后台初始化要求私有初始化凭据，未设置默认公开密码。
- 后台/账号/OAuth/共享墙回归 9 项通过，部署与备份回归 3 项通过，构建通过。
- 生产依赖 sanitize-html、undici、source-map-js 已更新；npm audit --omit=dev 为 0 项漏洞。
- 真实备份恢复到隔离目录成功，Halo 数据库备份目录可读取。
