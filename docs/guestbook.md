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

## 2026-10-21 · 过客墙：返回、分墙与灰泥材质

本节取代此前的单墙 300 条容量限制。页面仍为整面墙，不恢复博客导航栏；左上角“返回博客”使用明确的 `#/` 链接，刷新或直接进入留言墙也能退出。底部固定工具条提供落笔、上一面 / 下一面和墙面选择。留言墙禁用页面入场 transform，避免 fixed 控件被固定到长页面底部。

### 视觉与参考

- 实际浏览 [Good Enough 的留言簿](https://goodenough.us/guestbook)：保留真实手绘、不把所有留言挤在一屏，并用分页承载历史内容。
- 阅读 [Wallble 的数字留言墙](https://www.wallble.com/ideas/digital-guestbook)：借鉴文字和涂鸦共存的表达方式，没有复制商业页面或新增照片 / 语音功能。
- 原有斑驳街墙改为原创 SVG 灰泥纹理 `public/assets/materials/plaster-wall.svg`：细颗粒、缓慢的灰度起伏和浅侧光。没有自动播放装饰动画，交互只发生在按钮和拿起纸条时。
- 预览使用同一墙面材质；保留刻痕的内阴影、边缘亮部，纸条和贴纸各自的投影。默认笔色改为靛蓝，旧笔迹颜色不修改。

### 数据与容量

- 保留 `stacktao-paper-wall-v1` 和原来的桌面 / 手机位置存储；不会在打开页面时重写留言或坐标。
- 留言新增稳定的 `section` 编号，每面 24 处。无编号的旧留言按从旧到新的顺序分组，下一次成功保存时写入编号。新留言不会把旧留言推到另一面墙。
- 删除总量 300 条的读取截断和写入拦截，只渲染当前面。满面时延伸至末面可用空间或新增一面。换面选择单独保存，刷新后恢复。
- 新墙第一条也保存落点。发布失败则返回原墙，编辑草稿仍在；撤销删除预留原位置对应的容量。
- 依旧是本机预览，其他访客看不到。没有“无限容量”的承诺：总量最终受浏览器 localStorage 配额和笔迹复杂度限制，满额会明确提示并保留草稿，不清理旧内容。

### 验证

- 隔离的 jsdom 数据验证：1,000 条旧格式留言，42 面墙，所有 ID 可到达，单面最多 24 个留言节点；读取不修改原数据。
- 验证第 25 条自动延伸、新墙落点持久化、刷新选面、旧坐标保留、保存失败保留草稿、删除后新增再撤销仍保留原墙容量。
- 原型和构建版均通过纸条鼠标 / 键盘拖放、保存失败回滚、移动布局、撤销与卸载检查。
- 真实浏览器检查返回首页、落笔、刻字与贴纸预览，以及 320px / 390px / 1212px 布局；未往用户真实墙面添加测试留言。手机为响应式视口验证，未使用真实触摸设备。
- 同时通过相册、阅读页和项目关联交互回归，构建通过。

## 2026-10-21 · 直接在墙面留下痕迹

本节取代上节的弹窗编辑 / 预览流程和疏散排布。

- 工具条直接提供画笔、凿刀、纸条和贴纸。选工具后点墙面空白处，或用“就在可用空白处写”键盘入口，画布出现在实际落点。旁边的小工具盒只保留笔色、笔宽、大小、手写 / 打字、落款和确认；取消独立预览步骤。
- 在墙面实时显示凹痕，预览和最终刻画共用同一 SVG：更清楚的暗槽、下沿亮边、粗糙断口，并为细笔设置最低可见槽宽。使用 userSpaceOnUse 滤镜范围，修正单点和水平 / 垂直直线因包围盒高度或宽度为零而消失的问题。长刻字按行宽限制字号，避免裁切。
- “换个位置”携带草稿移动，Escape / 关闭保留本次未发布笔迹。关闭编辑回到原浏览位置；成功留下后定位到新痕迹。原生 dialog 的 close 事件异步触发，换位置单独保留选择状态，避免被 close 清理误取消。
- 桌面工具盒避开落笔区左右放置；手机工具盒停靠底部，选中的画布滚动至上方。只禁止画布内部触摸滚动，墙面仍可正常浏览。
- 原留言重新聚拢为不遮挡内容的紧凑排列，旧笔迹按画面密度缩放并混合排列；新留言严格使用所选大小。墨迹和刻画不再占据带页脚的大卡片，署名日期在查看或悬停时出现。纸条角度和图钉 / 胶带以 ID 确定，不随新留言插入改变。
- 新坐标存储使用 `stacktao-paper-wall-v1-positions-studio-v1`；原 `positions-v1` 不删除不覆盖，内容存储不变。旧坐标留作备份，新排布与拖动坐标刷新保留。`layout: 2` 标识采用当前画布尺寸和落点的新留言，不是存储 key 版本。
- 保留每面 24 处、自动延伸、当前墙面记忆与存储失败保留草稿。

验证：原型和构建版均通过直接涂鸦 / 刻画 / 纸条 / 贴纸、实时水平刻线、换位置保留草稿、一步发布、失败保留、旧坐标备份、新位置刷新稳定，以及 1,000 条留言分墙检查。相册、项目关联和其他页面回归通过。

真实浏览器：在用户墙上只检查展示和未发布笔迹；在独立的 `localhost` 测试源实际发布刻字和贴纸，确认关闭编辑、换位置以及刷新落点。检查 320px、390px、1212px 视口，画布与工具盒无重叠、工具条无横向溢出；未以模拟视口冒充真实触摸设备测试。


### 2026-10-22 · 错落叠放与内凹刻痕

- 自动布局取消固定列，按留言 ID 生成连续空间中的候选位置；纸张、贴纸先落位，墙上的笔迹填入剩余空隙。只允许实物边角少量叠压（窄边不超过 12 px），不遮盖正文。
- 自动排布写入 `stacktao-paper-wall-v1-positions-organic-v1`，旧 `positions-studio-v1` 保留作位置备份；留言内容不改写。新留言既有的明确落点继续保留，拖动后位置、层级仍持久化。
- 位置预留与发布共用碰撞规则，避免允许叠放的草稿在发布时又跳走。手动移动时层级包含所有已落位的留言。
- 刻痕移除外侧亮轮廓，改为全部裁切在槽内的上沿阴影、浅灰槽底和很窄的下沿反光；手写细线保留可辨认的槽宽，预览与最终落墙使用同一渲染。
- 已在真实浏览器检查现有 21 条留言、390 px 手机宽度及刻字预览；在独立 localhost 测试墙验证发布、移动、刷新。自动检查覆盖边角叠压范围、自由横坐标、迁移备份、保存失败与 1,000 条留言分页。


### 2026-10-22 · 刻槽光照重做

参考 Jackie Perkins 的手工 V-cut 工艺说明（https://www.jackiemperkins.com/materials-methods/）：槽面在侧光下产生明暗差，避免用连续亮线模拟深度。

- 用反转后的笔迹高度场计算哑光漫反射，笔画向墙内下沉；槽底混入暗色石屑调子，取消原来的连续浅色内沿。
- 光从左上方照入，槽口内部保留阴影，下沿只有很弱的窄反光；笔画交叉先合并轮廓再计算光照，避免铁丝搭接感。
- 刻线使用平切端头，保留单点的圆形凿痕；三种笔触保持不同槽宽。原笔迹数据、墙面位置及留言内容不改写。
- 浏览器检查了真实墙面已有手写、独立测试墙的中文输入与单点凿痕，并制作宽槽光照对照页确认明暗朝向。构建及原有保存、迁移、发布、分页回归检查通过。

## 2026-10-22 · 暖墙、题名与沉浸式创作

- 墙材改为参考村落照片的暖米黄石灰砂浆，连续纹理，无瓷砖缝。题字是靠最右侧的深色立体字，左下配篆意朱印。题字保护范围仅为自身实际边界，不再用整条顶部空白占位；返回按钮也只保护自身。
- 名字以 32 个固定意象 × 8 个地点字组成 256 个名字。首次保存随机种子，以互质步长打乱分配，256 面以内不重名；超出后标注「续卷 N」，完整标识保持唯一。词表和种子 key 固定为 names-v1；新词表不得改变旧版本映射。本机不同浏览器的种子独立，并非服务端统一题名。
- 喷瓶 / 刻刀在整面墙直接创作。喷瓶停留加深、提供实体工具光标与可选声音。完成才按实际笔迹外接框存储范围，保存 canonical 1000 宽度的坐标。旧留言仍可读取。
- 触及已保存留言、题字或另一个窗口的临时占位时，落笔处出现提醒，冲突部分不写入。最初使用留言外接框；已由下述「按实际笔迹避让」修复替代。
- 同一浏览器同源窗口使用 Web Locks + 15 秒临时区域租约，4 秒续期；未提交区域不冒充已完成留言。完成、取消、卸载会释放，失联后过期。保存前读取最新留言并再次检查。这个机制不是跨访客联网协作，跨浏览器仍需服务端身份和原子占位。
- 性能：合并 Pointer Events / coalesced events，每帧处理一批；已占区域内不逐点写 storage；Canvas 增量补画新增线段，刻画停笔后再渲染完整凹槽滤镜。避免每个点重建 SVG 或重画全部喷漆。移动设备仍需真机性能测试。
- 点击本机涂鸦 / 刻画后可「修改这处痕迹」。新旧手绘笔迹都可继续画、按整笔擦除、撤回；取消保留原作，保存更新同一个 ID。打字内容也可原位修改。另一窗口改过原作时拒绝覆盖并保留草稿。整条擦去仍可恢复。刻画文字编辑使用可见原生 textarea，避免隐藏文字与 SVG 预览字形错位造成的光标问题。
- 仍为本机预览：本机保存的留言视为可管理的作品。上线前必须绑定作者身份，不能仅凭客户端 UI 判断所有权。

验证：原型、构建版通过百万墙面标识唯一性、刷新持久化、绘制范围、ID 唯一、占位碰撞、配额失败保留、修改/取消/擦笔/撤回/删除恢复、打字修改、100 点批量输入占位写入次数、1,000 条旧留言分墙与满墙延伸检查。真实浏览器在独立测试源验证顶部左侧落笔、补画及擦笔保存、旧笔迹转换、两个窗口冲突提醒，390px 布局无横向溢出；没有向用户正式墙面发布测试留言。

### 位图素材来源

使用内置 imagegen 生成，墙材借用用户照片的材料、色调，不复制建筑与景观。最终资产在 `public/assets/materials/village-wall-v1.jpg`（生成 PNG 的网页压缩版）和 `visitor-seal-v1.png`（保留透明通道、缩至 160px）。原生成图保留在 Codex generated_images 中。

墙材提示词：
> Create a production website wall texture inspired ONLY by the warm pale ochre limewashed exterior wall material of the buildings in the reference photograph. A frontal photograph filling the entire wide frame with one CONTINUOUS old Chinese village lime-and-sand plaster wall, warm muted pale ochre / ivory yellow, fine stone powder grain, delicate trowel variations and very subtle weathered patches. Mostly quiet even mid-light color, so dark incised handwriting and aerosol graffiti remain highly visible. Authentic mineral texture, NOT smooth ceramic and NOT coarse exposed quarry rock. No mortar lines, no grid, no seams, no tiles, no borders, no roofs, no doors, no windows, no buildings, no landscape, no plants, no lettering or graffiti. Soft diffuse upper-left daylight. Fine small physical grain, low-contrast discoloration, occasional tiny hairline fissures only. No large cracks, no strong chipped patches, no vignette.

朱印提示词：
> Create one small authentic traditional Chinese scholar's seal impression for a personal guestbook wall. TRANSPARENT BACKGROUND. A nearly square cinnabar red seal, white-character intaglio yinwen seal carving, with four archaic seal-script characters arranged in traditional columns: right column 过 above 客, left column 留 above 痕. Tightly interlocking rounded-square calligraphic structure. Deep muted cinnabar, a thin irregular red perimeter, modest natural worn gaps and tiny dry ink flecks. Flat graphic ink impression, no embossing, no shadow, no wall, no paper, no modern printed font, no extra characters. Seal nearly fills square canvas with only 5% transparent margin. Visually crisp at 32 CSS pixels.


## 2026-10-22 · 按实际笔迹避让

- 修复两类误报：已有手绘作品的空白外框不再锁住；当前草稿的分散笔画也不再合成大矩形检测。自由喷绘、刻画按线段及实际笔触宽度检测，额外留 2 屏幕像素间距；纸条、贴纸和打字内容仍保护整块表面，题名与返回控件保护自身。
- 检查整个移动线段，防止快速划过穿透已有笔迹。受阻后在新位置恢复时另起一段，不跨过被保护区域补连线。新自由刻画落墙与绘制时使用相同折线路径，旧曲线则采样实际 SVG 路径及其缩放。
- 同源多窗口占位改为笔迹沿线的稀疏 8 单位网格（墙面宽度标准化为 1000），不再占用外接框内的空白；这不是逐像素检测，格边有少量保守余量。旧版本窗口仍使用旧框占位，刷新或租约过期后消失。保留 Web Locks、续期及保存前二次检查；仍非跨访客后端。
- 新增可直接运行的几何回归：`node tests/wall-collision.cjs`，覆盖 U 形内部空白、笔宽、快速跨线、纸张表面及稀疏占位。原型与构建版通过集成检查，包括分散笔画围住纸条、受阻后断开恢复、保存、编辑、擦除、撤回及批量输入。
- 真实浏览器在独立测试墙验证 U 形刻痕内部喷绘并保存、跨线提醒、双窗口空白可写和实际笔迹受保护；未向用户的墙面写入测试内容。

## 2026-10-22 · 原地创作、文字材质与明确容量

- 取消打字、纸条和贴纸的自动找位置、自动滚动和发布后搬动。先选择工具，再点击落点；鼠标移动时显示放置轮廓。冲突时原地标红并禁止发布，内容保留。可拖动「拖动位置」把手，或用方向键微调；文字编辑保存时同步更新原有位置记录。
- 修复纸条拖动松手时的异步竞态：在保存位置之前抑制随后产生的点击，避免误开详情、挡住下一步工具操作。纸条移动使用实际笔迹避让，不再因为同墙另一个窗口正在画而全墙禁用。
- 刻字、喷漆和纸条的文字有独立材质：刻字沿用凹槽光照滤镜；喷漆具有扩散边缘和颗粒；纸条保留普通墨字。输入时使用原生 textarea，字体、字号、换行与材质预览一致；失焦或「看上墙效果」显示最终材质，不用错位的透明光标叠层。新增楷书、宋体、黑体、圆体、行楷、等宽六种字体风格和 18/24/32 三档字号，随留言保存。字体使用系统字体栈，缺少该字体的平台采用回退字形。
- 容量明确为「每次完成计 1 处，每面最多 24 处」，工具栏、编辑面板和完成反馈显示本面数量及余量。改为显式「开新墙」：任何时候可开新墙，满墙提示后也由用户决定切换，不再在创作或保存过程中突然换墙。主动打开的空墙同样持久保存；旧留言不迁移。保存锁内重新检查容量，避免多窗口越过上限。
- 避让几何在内容、位置或尺寸改变时更新，拖动草稿复用索引。仍为本机预览，不是跨访客服务。

验证：`npm run test:guestbook`（新增开发测试依赖 jsdom），覆盖碰撞几何、裸墙误触、明确落点、字体/颜色持久化、原地修改、拖动松手误点击、纸条/贴纸/喷漆/刻画、撤回/擦除/删除恢复、保存失败保留、批量落笔、1,000 条旧留言及满墙手动延伸。构建产物另以 `node tests/guestbook-flow.cjs dist` 运行。真实浏览器在独立测试源实际发布各材质、修改文字、拖动纸条、擦除与撤回、切换笔宽和声音、刷新恢复，并在 390px 宽度检查输入和工具面板；没有模拟真实手机的系统软键盘或触控笔硬件。用户现有留言和未完成草稿未改动。
