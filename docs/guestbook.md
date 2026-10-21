# 纸笺留言墙

2026-10-21。以安静的编辑式排版取代整页环境动画，将表现力放在书写、预览、贴纸和翻看中。现有文章与内容布局保留，移除四季 Canvas 和常驻品牌动画。

## 参考与取舍

- [Rauno — Craft](https://rauno.me/craft)：参考局部交互、输入与签名等细节方向，不移植其组件或视觉资产。
- [Brittany Chiang](https://brittanychiang.com/)：参考信息层级与清晰的内容组织。
- [Anthony Fu](https://antfu.me/)：参考轻量内容入口；不继续复制背景生长效果。

本次采用大留白、宋体标题、小号编号、三种低饱和纸色和石墨主色。纸张微倾斜、有轻薄胶带与阴影；不用持续浮动、季节特效或满屏粒子。

## 完整交互

1. 从导航进入 `#/guestbook` 后，整个视口是一面墙。点击空白处打开书写工具，选择刻字、墨迹或贴纸；墙上的邀请题字提供键盘入口。
2. 默认手写，支持鼠标、手指、触控笔；也可切换打字（180字）。手写与打字草稿分别保留，张贴时使用当前方式。
3. 可选米白／灰绿／浅粉纸，石墨／靛蓝／赭红墨色，细笔／粗笔；可撤回最后一笔、清空或署名。
4. 点击「写好了，看看」检查纸笺，可返回修改。空内容不允许张贴。
5. 点击「留在墙上」或「贴到墙上」先持久化，成功后才关闭编辑器并把痕迹放到点击的墙面位置（未指定时寻找空位）；播放一次短暂落定动画。
6. 点击纸笺在原生对话框中放大。可收回自己的本机纸笺，并恢复刚收回的一张。
7. Esc／关闭会保留当前会话的未完成草稿；已张贴内容刷新后仍在。未完成草稿不跨刷新保存。

## 数据与边界

用户选择本机交互预览：使用 `localStorage` 的 `stacktao-paper-wall-v1`，没有联网发布、多人同步、登录或审核后台。页面和最终确认均明确说明。无留言时显示明确标注的纸笺示例，不伪造访客记录。

纸笺存储原始矢量笔画，按相对坐标记录，写字板与卡片使用同一平滑路径，不因手机尺寸或 DPR 改变比例。本机预览限制300处、每张150笔／6000采样点；读取时校验数据。存储失败保留草稿，不伪报成功。用户文字通过 textContent 渲染，不作为 HTML 插入。

使用原生 dialog 管理键盘焦点与 Esc，交互控件有名称，保留打字替代方式、focus-visible 和减少动态效果支持。路由离开时取消页面事件并清理对话框。

## 实现

- `public/js/guestbook.js`：页面、草稿、笔画、存储与张贴流程。
- `public/css/guestbook.css`：纸笺、书写台、响应式和局部动效。
- `public/js/site.js`：导航状态、页面挂载和卸载。
- `index.html`：导航及资源入口。

## 本轮验证

- 通过原型与生产文件语法检查、生产构建及差异空白检查。
- 使用临时 jsdom 环境验证空白拦截、手写与撤回、换纸不改变墙上纸笺、预览与回改、安全文本渲染、保存刷新、收回恢复、存储配额失败、笔迹归一化、会话草稿与路由清理。
- 原型和 dist 分别验证直达留言页、导航高亮、离开页面关闭对话框、返回后正常挂载，且不再创建环境 Canvas。
- 这些测试不包含真实布局、触控设备和屏幕视觉验收；本轮浏览器访问受安全策略限制，尚未完成页面截图复核。

## 自由摆放与保存

直接拖动整张纸笺，超过6px移动才进入拿起状态；松开贴在新位置，点按仍打开详情。取消、Esc、失焦及切页回原位，拖动后的click不会误开详情。键盘空格拿起，方向键移动（Shift加快），空格或Enter贴好。触屏阅读模式保留纵向滚动；纸条详情中的“移动这张纸”打开拖放，放下后恢复滚动。刻字和墨迹不接受移动。

位置使用独立的 `stacktao-paper-wall-v1-positions-v1` 存储键，原留言内容无需迁移。宽屏和窄屏各保存一套坐标，横向按可用宽度归一化，纵向以墙内像素记录，附带层级。只在成功放下时保存，失败会回退并提示。旧留言没有坐标时按空位摆放；后贴纸张在上面，可重叠，不能拖出墙面。新增、删除和撤销不重排已有位置。

新增离线DOM验证覆盖：真实留言数据不变、位置刷新恢复、宽窄屏分别恢复、短按打开、拖放点击去重、取消/捕获丢失、键盘、触屏模式、坐标边界、配额失败回退、删除恢复、新增保持、路由清理和损坏位置数据。真实触屏及视觉验证仍待完成。

## 墙面与媒介

导航、页脚、标题、统计和独立工具条在此路由隐藏，常态只有墙。工具由点击空白位置唤起，预览完成后消失。街头混凝土底材使用原创生成纹理，凹刻与墨迹使用SVG/CSS实现；纸条才有背景、纸边和胶带/图钉。

新留言增加可选medium（paper / engraving / ink）与anchor（宽窄屏模式、归一化横坐标、纵坐标）。旧留言无需迁移，缺少medium时视为paper。原有位置键继续使用。墙上初始题字标为非访客留言，不创建虚构访客。工具中说明本机保存。

## 街头记忆墙：当前实现与多人方案

当前实现（本机预览）：

- 原创街头材质，参考 [Leake Street 官方介绍](https://www.leakestreetarches.london/) 的持续创作空间概念，不复用现场艺术家的作品。混凝土、旧钴蓝/黄绿喷漆和撕纸残痕属于背景底材，不是虚构访客内容。
- 涂鸦支持七种墨色及2.4/4.5/12三个笔宽；刻画将手写路径或安全文本转换为SVG轮廓，通过粗糙位移和两个相反方向的内部边缘形成暗槽、亮边。不会修改原始笔画和文字。
- 三款原创SVG贴纸：闪光、野花、轨道；另保留手写纸条。贴纸无需输入文字即可张贴，支持移动和持久化。
- 尺寸三档：普通痕迹宽210/280/350 CSS像素，贴纸100/148/200，窄屏限制在可用宽度内。这是当前预览尺寸，不是现实厘米。
- 本机最多300处，存储配额仍由浏览器决定。新内容优先使用点击位置；与已有内容相撞时自动选择空白处并提示，墙随内容向下延伸。不会通过缩小旧内容增加容量。
- IntersectionObserver 跟踪视口及前后800px，远处的内容隐藏绘制，保留几何占位。此版仍保留全部本机DOM，**不是**服务端分页或完整DOM虚拟化。
- 283条夹具验证：无30条截断、墙面扩展、尺寸保持、贴纸/手写刻画/文字刻画保存刷新、凹槽滤镜结构、文字安全、视口绘制开关、清理。原型和dist均通过。构建、JS/CSS解析与原留言回归通过。浏览器访问限制仍存在，不能把离线DOM测试当成材质视觉验收。

多人公开版建议（尚未实现、未连接服务）：

1. 统一世界坐标。每段墙先设为2400×1600逻辑单位，记录segment_id、x/y、宽高、旋转、媒介、笔迹、作者与版本；手机通过平移/缩放查看同一块墙，不能沿用本机版各设备独立排列的坐标。旧本机内容不自动上传。
2. 有限占地。先沿用三档相对尺寸，轮廓外保留约24逻辑单位。刻画不得覆盖已有内容；贴纸可以有少量经服务端允许的边缘重叠。每段约50–60%的可用面积被占用后引导到下一段，保留呼吸空间；这是起始设计参数，需用真实内容密度校准。
3. 连续浏览、分段加载。当前墙段及相邻两段加载矢量内容，更远的墙段只保留缓存缩略图或占位。旧墙保留，容量通过增加段数扩展；不要让数万条记录同时创建DOM或SVG滤镜。
4. 服务器提交位置。客户端选位置只是预览；服务端在事务内锁住目标墙段，检查占位后写入。两人同时提交到同一位置时，后一位保留草稿并得到可选附近空位，不能静默覆盖。请求带幂等键；纸条移动带版本号，防止后提交覆盖新位置。
5. 身份与同步。可用匿名会话身份让游客直接参与，写入/修改受作者权限控制。数据库保存原始内容，实时通道只通知新记录或修改；不要逐笔广播所有人的每次鼠标移动。可选 [Supabase 数据库变更订阅](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) 配合 [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。实时消息不是占位成功的凭据，写入事务才是。
6. 发布边界。服务端校验占地、笔画数量与内容大小，限制连续提交，支持举报与管理员隐藏。浏览器不提供任意删除他人记录的操作；本机预览中“擦去”全部本机数据的权限不直接照搬到公共墙。

## 材质生成记录

使用内置 image_gen（未使用CLI/API key）。最终资产：`public/assets/materials/street-wall-v1.jpg`，约884KiB；原型同路径 `assets/materials/street-wall-v1.jpg`。JPG由生成的PNG转换，无外部图片运行时依赖。此前生成的素灰泥方案未接入页面。

最终生成提示词：

> Use case: photorealistic-natural. Create an original street-art wall MATERIAL for an interactive website, inspired by the layered physical textures of a contemporary legal urban graffiti tunnel, NOT any specific existing artist or mural. Landscape 3:2, orthographic straight-on view, edge to edge wall, no ground or perspective. Weathered medium-gray concrete with dark charcoal old paint, abraded cobalt blue and acid yellow-green spray-paint arcs and patches primarily across edges and corners, sparse peeling blank wheatpaste paper remnants, scrape marks and small paint drips. Bold contemporary underground visual identity with tactile realistic surface. Keep at least 60 percent of the wall relatively quiet, exposed medium-gray concrete throughout the center and in irregular islands for visitors to write on. Color covers no more than 30 percent. No readable words, letters, logos, recognizable figures, faces or existing artworks. No frame, UI, signs, text, graffiti signatures. Soft diffuse raking daylight from upper left, visibly real roughness, no dramatic vignette. Create a wall people can continue adding to, not a finished mural. Texture should continue naturally at the edges for repeating use.


## 2026-10-21 实际浏览器视觉验收

在现有 localhost 留言墙、默认桌面视口中实际打开并截图对比，保留用户原有的七条留言。旧墙纹与喷漆对比过高，细刻痕难辨；本轮用统一的暖灰薄层降低背景对比，同时保持凹凸纹理，编辑及预览沿用相同材质。刻痕缩小扰动及内缘偏移，保留暗槽、较窄内侧亮边和低透明度下沿反光。纸条增加短距离接触阴影，贴纸收紧阴影，区分墙内、墙上和贴附三种层次。

实际点击发现刻画详情的 SVG 遮住了关闭按钮；提高按钮层级后，以真实点击验证关闭成功。小贴纸预览落款原先被挤成竖排，现与贴纸图形分开限制宽度；详情贴纸保持选择的尺寸。

通过界面添加临时刻字和贴纸，检查同墙搭配、刻字近景、贴纸详情。用真实鼠标事件将贴纸从 left=16/top=120 拖至 left=568/top=360；刷新后坐标一致，松手未误开编辑器。验收后通过界面删除两条临时内容，刷新确认恢复七条原留言。未声称移动端或多人在线同步验收。

验证：构建通过；street-wall.cjs 与 paper-wall.cjs 在原型和 dist 上均通过；浏览器未返回 warning/error。截图存放在任务目录 artifacts/guestbook-review，未加入公开站点资源。
