# 后台账号与安全

## 首次使用和迁移

现有内容、留言和 AI 令牌不变。重启新版本服务后，在 `/admin/` 输入服务器私有 `state/owner-token` 初始化凭据，自行设置账号（3–64 位英文、数字、点、横线或下划线）、邮箱和密码。密码为 12–128 字符，允许空格及 Unicode，建议密码管理器生成独特长密码。不提供默认账号或默认密码。

初始化是一次性的；成功后旧口令不能再登录或调用管理接口。服务器端没有公开注册功能。已有 AI 令牌仍按原权限和有效期工作。

## 修改和找回

- 后台「账号与安全」验证当前密码后修改，所有浏览器会话立即失效，AI 令牌保留。
- 登录页「忘记密码」向已设置的邮箱发送重置链接。无论邮箱是否匹配，返回相同文案。每个 IP 15 分钟最多 5 次请求，同一账号每分钟最多发一封。
- 链接使用 32 字节随机令牌，服务器只保存 SHA-256，15 分钟有效，使用一次后作废。链接 token 位于 URL fragment，不进入服务器访问日志；页面加载后立即从地址栏移除，不写入 localStorage。
- 重置成功不自动登录，所有会话和 API 令牌均被撤销，已有第三方身份绑定也会移除，之后需要重新绑定。
- 可在「站点设置 → 登录与找回」配置发件服务。邮件未配置明确返回 503；投递异常只记录不含邮箱和令牌的错误。邮件平台控制台可检查投递。不要在日志中打印 API 密钥、密码或重置链接。
- 邮箱暂不提供网页修改入口，避免账号劫持后随意替换找回渠道。初始化时请核对地址；需要改邮箱时由服务器管理员停服维护 `state/account.json` 中的 email，再重新启动。
- 无法收邮件时使用部署文档中的 `scripts/recover-account.mjs`，通过 SSH 停服生成一次性恢复链接，然后重启并在自己的浏览器设置新密码。不要删除账号文件来重新开放初始化。

## 密码与会话

密码使用 Node scrypt（N=131072, r=8, p=1）及独立随机 16 字节盐存储，恒定时间比较派生哈希。认证计算串行并限制队列，限制恶意请求导致的内存占用。登录、初始化、修改密码和重置均限流；用户名错误与密码错误使用相同提示和密码计算路径。

会话只在服务器内存中，8 小时过期，重启后失效。Cookie 为 HttpOnly、SameSite=Strict，HTTPS 环境使用 Secure。同源校验阻止跨站写入。密码更新改变账号认证版本，旧会话即使存在也不可用。Caddy 覆盖客户端 IP 头，只有不开放后端端口的受信任代理部署才启用 `TRUST_PROXY=caddy`。

`state/account.json`、初始化凭据和 API 令牌文件不得进入公开产物。现有备份脚本会一并备份账号文件；快照包含敏感认证信息，异地存储必须加密。恢复历史快照也会恢复当时的密码及 API 令牌，因此安全事件后恢复备份要重新修改密码并撤销旧令牌。

## 邮件配置

使用 Resend 的发送 API，无新增 npm 依赖。在「站点设置 → 登录与找回」填写 API Key 和发件邮箱，验证当前密码后保存即可生效，无需重启或重新构建博客。也兼容部署环境的 `RESEND_API_KEY`、`MAIL_FROM`；一旦在后台保存，以后台配置为准。发件域名需通过平台验证。重置链接基于固定的 `ADMIN_PUBLIC_ORIGIN`，不根据客户端 Host 生成。代码不会自动创建邮件服务账户或购买套餐；未配置时不发送真实邮件。

## GitHub、Linux DO、Google 登录

入口：后台「站点设置 → 登录与找回」，或「账号与安全 → 管理登录方式与邮件找回」。

1. 在对应平台创建 OAuth 应用，复制页面显示的回调地址，必须逐字一致（包含 `/api/v1/auth/oauth/平台/callback`）。正式环境先配置 HTTPS 域名和 `ADMIN_PUBLIC_ORIGIN`；测试与生产建议使用不同的应用。
2. 填写 Client ID / Client Secret，开启开关，输入当前密码保存。保存后密钥不会回显，留空保留原值；清除密钥必须同时停用该方式。
3. 再次输入当前密码，点击「绑定本人账号」，到平台授权。成功后会返回设置页。只有完成绑定且已启用的方式才显示在登录页。
4. 退出后用第三方入口验证一次。不要关闭或遗忘账号密码；密码登录始终保留。

GitHub 使用 OAuth App（不是仓库访问 Token），只请求 `read:user`；Linux DO 使用 Connect 应用；Google 使用 Web application OAuth Client，配置授权同意页面，测试状态下把自己的账号添加为测试用户，仅请求 `openid`。

每个平台只绑定一个本人身份，按 GitHub / Linux DO 的稳定 `id`、Google 的 `sub` 核对，不使用用户名或相同邮箱自动授权。绑定和解除均要求当前密码；绑定变更使旧会话失效，绑定成功的当前浏览器获得新会话。解除后需重新登录。修改登录或邮件配置会取消正在进行的授权，并使已有第三方登录会话失效；密码登录会话不受影响。Client ID 变化后必须重新绑定。

授权使用服务端 code exchange，5 分钟一次性 state，并绑定发起浏览器的 HttpOnly、SameSite=Lax 临时 Cookie。回调按平台隔离；GitHub 与 Google 使用 PKCE，Google 还通过 jose 验证 JWT 签名、issuer、audience、过期时间和 nonce。Linux DO 使用文档中的授权码 + confidential client Basic 认证，不假定其支持 PKCE。回调仅允许固定站内跳转。平台 access token / refresh token 不保存到本机文件或浏览器。

配置保存在私有 `state/login-settings.json`（0600），不进入文章源文件、生成前台、日志或普通内容 API。后台 API 只返回 Client ID、启用状态及是否已有密钥。该文件随现有快照备份，备份必须私有且异地加密。设置以 revision 防止多窗口互相覆盖，保存与解除操作均限流。没有公开第三方管理员注册。

真实应用凭据未配置前，只能验证本地协议、安全校验与模拟回调，不能宣称已完成真实平台授权验收。

安全与接入参考：[OWASP 忘记密码指南](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)、[GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)、[Linux DO Connect](https://wiki.linux.do/Community/LinuxDoConnect)、[Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)、[Resend 发送接口](https://resend.com/docs/api-reference/emails/send-email)。
