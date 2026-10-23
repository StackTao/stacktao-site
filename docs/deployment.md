# 上线、登录与数据恢复

## 推荐：一台服务器，同域名前台 + 后台

当前共享留言墙使用文件持久化和单进程串行写入，适合一台 Linux VPS、一个 Node 服务实例。Caddy 提供 HTTPS 和静态博客，Node 提供 `/admin/`、发布 API 和共享留言墙。不要开多个 app 副本，也不要把数据目录共享给另一台运行中的服务器。访问量增长后再迁移数据库。

GitHub Pages 只能承载静态页面，不能运行当前后台和共享留言 API。已有 Pages 工作流不会部署这套服务。推荐整个站统一走下述 VPS 方案，不混用两个写入源。

```text
/srv/stacktao/code/          Git 仓库：程序，可以更新和替换
/srv/stacktao/data/
  content/                  文章、相册、项目、配置、media 上传图片
  state/                    草稿、历史、登录口令、API 令牌、留言、统计
  site/dist/                生成的公开网站（可重新构建）
/srv/stacktao/backups/       完整校验快照，不放进公开目录
```

必须备份 content 和 state。远程 URL 引用的图片不在本机备份里，需要先通过后台上传为本站媒体。备份包含管理凭据，权限为 0700/0600，不要上传到公开仓库或放在网站根目录。

## 首次部署

服务器安装 Docker Engine 和 Compose 插件。域名 A/AAAA 记录指向服务器，开放 80/443；不要暴露 5174 端口。SSH 使用密钥登录。下列操作在服务器执行：

```sh
cd /srv/stacktao/code
cp deploy/.env.example deploy/.env
# 修改 DOMAIN 为真实域名，检查 DATA_DIR、BACKUP_DIR
# APP_VERSION 建议填本次 git commit 的短 SHA，便于回滚
mkdir -p /srv/stacktao/data /srv/stacktao/backups
chmod 700 /srv/stacktao/data /srv/stacktao/backups
cd deploy
docker compose config --quiet
docker compose up -d --build
docker compose logs --tail=50 app caddy
```

首次启动仅在 content 目录不存在时复制示例内容；之后始终使用持久化内容。已有空目录或损坏配置会明确报错，不会偷偷覆盖。已有本机内容应在启动前复制到 `data/content`，`.local/admin` 复制到 `data/state`（先停止本机后台，排除 `wall-writer.lock`），不要用示例内容覆盖真实数据。

Caddy 自动申请和续期证书。打开 `https://你的域名/` 和 `https://你的域名/admin/`。管理员登录后确认设置中的留言 API 为 `/api/wall`；开启统计时把统计地址设为 `https://你的域名/api/v1/collect` 并发布配置。默认不采集访问统计。

首发验收：两个独立浏览器分别留言，确认互相可见；管理员删除一条测试留言；上传图片并发布测试文章；重启 app 后再次检查文章、图片、留言和统计。不要在验收前导入唯一的一份生产数据。

## 登录、退出和恢复访问

后台采用单管理员账号密码登录。首次打开会显示初始化表单，需要服务器 `data/state/owner-token` 中的初始化凭据，然后自行设置账号、找回邮箱和至少 12 位密码。账号创建后，旧初始化口令不能登录，也不能作为管理 API Bearer 令牌使用。

登录会话为 8 小时 HttpOnly、SameSite=Strict、生产环境 Secure Cookie。修改密码需验证当前密码，并退出所有设备。忘记密码通过一次性邮件链接找回，15 分钟过期；成功重置会退出所有设备并撤销 AI/API 令牌。

推荐在后台「站点设置 → 登录与找回」配置 Resend API Key 和已验证域名的发件邮箱，保存后立即生效。也兼容 `deploy/.env` 的 `RESEND_API_KEY` 和 `MAIL_FROM`，但后台保存的配置优先。未配置邮件时，页面明确提示无法邮件找回。配置后应实际向自己的邮箱验证投递，不能仅凭配置存在就认为投递成功。

账号与密码哈希保存在 `state/account.json`，第三方与邮件密钥配置保存在 `state/login-settings.json`，都会随数据快照备份。不要手动删除此文件重新初始化。邮件服务不可用时，可通过 SSH 在停止 app 后生成一次性恢复链接：

```sh
cd /srv/stacktao/code/deploy
docker compose stop app
docker compose run --rm --no-deps --entrypoint node app scripts/recover-account.mjs
docker compose start app
```

在自己浏览器中打开输出的链接，设置新密码；不要分享链接或保存终端输出到公开日志。该脚本必须在服务停止时运行。旧的 `rotate-owner.mjs` 仅轮换初始化凭据，不能重置已创建账号的密码。

AI 发布使用独立、有限权限 API 令牌，不使用账号密码。修改密码保留这些令牌；忘记密码重置会全部撤销，需要重新签发。GitHub、Linux DO、Google 登录可在后台配置并绑定本人账号，不能按相同邮箱自动授予管理员权限。完整安全设计见 [账号与安全](authentication.md)。

访客的匿名编辑凭据保存在其浏览器中；换设备或清理浏览器后不能认领原留言，管理员仍能查看和删除。不是多用户账号体系。

## 备份（短暂停止写入，博客仍可阅读）

```sh
cd /srv/stacktao/code
sh deploy/backup.sh
```

脚本停止 app，备份 content + state，生成逐文件 SHA-256 清单，然后自动启动原容器。备份期间后台和留言 API 暂不可用，静态博客仍由 Caddy 提供。半途失败的备份没有有效清单，不能恢复。不要在服务写入时直接复制 state 文件，也不要手工删除运行中的 writer lock。

建议每天低峰执行一次、每次升级前再执行一次。服务器 cron 示例（先手动验证路径和权限）：

```cron
15 3 * * * /bin/sh /srv/stacktao/code/deploy/backup.sh >> /var/log/stacktao-backup.log 2>&1
```

本机备份不能防服务器磁盘损坏。还需把成功快照用加密备份工具（如 restic）复制到另一台机器或私有对象存储，并单独保管解密密码。这里没有配置云存储账号，也没有自动开启定时任务或异地备份。建议保留 14 份日备份、8 份周备份，每月做一次恢复演练；确认异地副本有效后再清理旧备份。

## 恢复：先恢复到新目录，再切换

需要 Node 22，或用已构建的 app 镜像运行该命令：

```sh
node scripts/data-snapshot.mjs restore /srv/stacktao/backups/某次快照 /srv/stacktao/data-restored
```

目标目录必须不存在。工具先验证全部文件的校验和及路径，才创建恢复目录；拒绝符号链接和活动锁文件。恢复后停止旧 app，修改 `deploy/.env` 的 DATA_DIR 为新目录，再运行 `docker compose up -d --force-recreate`。应用会重新生成公开站点。核对留言、图片和文章后才处理旧目录，保留旧数据方便回退。

不要直接把历史备份解压覆盖正在使用的数据目录。完整恢复会回到快照时间点，之后的留言和文章需要从旧目录单独找回。

## 更新与回滚

1. 运行备份脚本并确认成功；记录当前 APP_VERSION 和 Git commit。
2. 更新程序仓库到要发布的版本，修改 APP_VERSION 为新版本号。
3. 在 deploy 目录执行 `docker compose build app`；构建成功后执行 `docker compose up -d app`。
4. 查看日志、打开前后台，验证一次发布和留言。启动失败时旧持久化数据仍在。

启动使用持久化内容重新构建网站，失败不会覆盖之前的公开结果。代码镜像不包含真实数据。不要执行 `docker compose down -v`，不要删除 DATA_DIR；不要把整个数据目录加入 Git。公开输出的父目录被挂载，后台发布时的目录切换能被 Caddy 正确看到。

回滚程序：把仓库和 APP_VERSION 改回记录的版本，然后 `docker compose up -d --no-build app` 使用保留的旧镜像。旧镜像需事先保留，不要在验收前清理镜像。未来若升级改变数据格式，必须先确认兼容性；必要时恢复升级前快照，不能保证任意版本都可直接读取新数据。

## 验证范围

`node --test tests/deployment.test.mjs` 检查备份、恢复、校验失败、禁止覆盖。`npm run test:admin` 检查登录、权限、发布、并发留言和重启持久化。真实证书签发、服务器网络和异地备份仍需在你的域名及服务器上验收。

## 上线前由站点所有者配置

1. 服务器与域名：`deploy/.env` 的 `DOMAIN`、`DATA_DIR`、`BACKUP_DIR`、`APP_VERSION`；DNS 指向服务器，开放 80/443，保持 Node 管理端口在反向代理后。
2. 初始化管理员：用私有 `state/owner-token` 创建账号、独特长密码和找回邮箱。后台“站点设置”填写正式网站地址，RSS 将使用此地址。
3. 邮件：后台“登录与找回”填写 Resend API Key 和已经完成域名验证的发件邮箱；上线后实际走一次忘记密码。可选环境变量 `RESEND_API_KEY`/`MAIL_FROM`。
4. 第三方登录（可选）：分别创建 GitHub、Linux DO、Google OAuth 应用，填写 Client ID/Secret；把后台展示的 HTTPS 回调地址原样填入对应平台，保存后绑定本人账号。不能仅填密钥就认为绑定完成。
5. 统计（可选）：配置 `ANALYTICS_ORIGINS` 和后台 HTTPS 采集地址。共享留言同域默认 `/api/wall`；跨域时另配 `WALL_ORIGINS` 和服务地址。
6. 备份：选择备份保留策略，安装定时任务并配置异地存储及加密凭据；手动备份、恢复演练成功后再启用定时执行。
7. 内容：替换示例照片/节目/随手记，检查外链和版权；若走 GitHub Pages，再配置内容仓库写入权限与 Actions。推荐的 Docker 同域部署不需要 Git 推送才能发布。
