(function () {
  var pages = window.PAGES || {}
  var titles = window.PAGE_TITLES || {}

  var articles = [
    {
      route: '/posts/tools-that-last',
      title: '让工具经得起时间',
      date: 'Aug 29, 2026',
      listDate: 'Aug 29',
      minutes: 14,
      body: `
        <p>做一个工具并不难，难的是让它在热情退去、需求改变、维护者变少之后，仍然值得被使用。真正长寿的工具通常没有最耀眼的首发，却能在一次次微小变化中守住自己的边界。</p>
        <p>我越来越相信，工具的寿命不是由功能数量决定的，而是由承诺的清晰程度决定的。承诺越少、越稳定，使用者越容易建立信任，维护者也越有余力把事情做深。</p>

        <h2 id="start-with-the-problem"><a class="header-anchor" href="#start-with-the-problem">#</a>从问题开始，而不是从功能开始</h2>
        <p>很多项目的第一版都来自一个具体的不便：某个命令每天要重复输入，某种格式总是需要手工转换，某段流程在团队里反复出错。这个阶段最重要的不是把产品想得完整，而是把问题描述得足够准确。</p>
        <p>如果一句话说不清工具解决什么，后面的功能就很容易变成补丁。每一个新入口都看似合理，合在一起却让用户不知道应该从哪里开始。清晰的问题陈述，是设计、文档和接口共同的原点。</p>
        <h3 id="write-down-non-goals"><a class="header-anchor" href="#write-down-non-goals">#</a>先写下不做什么</h3>
        <p>我会在项目早期写一张很短的“不做清单”。它不是拒绝变化，而是提醒自己：哪些需求即使真实存在，也不应该由这个工具承担。边界公开以后，讨论会更诚实，贡献者也更容易判断一个想法应该进入核心、插件，还是另一个项目。</p>
        <blockquote><p>一个可靠的工具，不需要回答所有问题；它只需要持续回答好同一个问题。</p></blockquote>

        <h2 id="interfaces-are-promises"><a class="header-anchor" href="#interfaces-are-promises">#</a>接口是一种长期承诺</h2>
        <p>界面上的一个按钮、命令行里的一个参数、配置文件里的一个字段，都会慢慢进入别人的习惯和自动化脚本。发布之后，它们就不再只是实现细节，而是对外的承诺。</p>
        <p>因此我更愿意推迟一个名字，也不愿意先发布再频繁修改。一个略显朴素但含义稳定的名称，往往比聪明却需要解释的名称更有生命力。稳定并不意味着永不改变，而是每次改变都能说明理由，并给出可预测的迁移路径。</p>
        <h3 id="leave-a-migration-path"><a class="header-anchor" href="#leave-a-migration-path">#</a>为迁移留下台阶</h3>
        <p>好的迁移不是在更新日志里写一句“这是破坏性变更”。它需要旧写法的告警、自动转换的可能性、足够长的过渡时间，以及一份从使用者角度写成的说明。维护者熟悉内部结构，但使用者只看到自己的工作突然停了下来。</p>
        <p>把迁移成本纳入设计，项目会自然减少不必要的变更。因为一旦认真计算每个使用者需要付出的时间，许多“更优雅”的重构就不再显得那么紧急。</p>

        <h2 id="maintenance-is-product-work"><a class="header-anchor" href="#maintenance-is-product-work">#</a>维护本身就是产品工作</h2>
        <p>修复边缘问题、整理错误信息、补齐示例、关闭过期议题，这些工作没有发布新功能那么显眼，却决定了一个工具是否可信。用户对质量的判断，往往来自失败时发生了什么，而不是成功时多快。</p>
        <p>我会把维护任务放进和功能相同的优先级系统里。每次发布至少解决一部分积累已久的小摩擦，让项目的表面和内部都比上一个版本更整洁。长期来看，这比不断扩大功能清单更能提高留存。</p>
        <h3 id="feedback-in-routine"><a class="header-anchor" href="#feedback-in-routine">#</a>让反馈回到日常</h3>
        <p>反馈不只来自议题区。文档里反复被搜索的词、示例中经常被复制的片段、同一个错误被问到的次数，都在告诉我们哪里需要调整。把这些信号定期整理，维护就不再只是被动救火。</p>
        <p>当项目开始稳定，我会减少大规模路线图，改用较短的维护周期：观察、修补、发布，再观察。节奏变慢以后，决策反而更准确，因为每次变化都有时间被真实使用。</p>

        <h2 id="slow-is-far"><a class="header-anchor" href="#slow-is-far">#</a>慢一点，反而走得更远</h2>
        <p>长寿项目很少依赖持续兴奋。它需要一种普通日子里也能维持的速度：没有发布压力时仍愿意整理文档，没有外界关注时仍愿意修复小问题，也允许维护者暂时离开。</p>
        <p>工具经得起时间，不是因为它拒绝变化，而是因为它知道什么必须稳定、什么可以生长。把这条线画清楚，项目才有机会从一次性的作品，变成别人可以安心依赖的基础。</p>
        <p class="share-line">&gt; 留言讨论：你正在维护什么，希望它五年后仍然存在吗？</p>
      `,
    },
    {
      route: '/posts/quiet-interface',
      title: '安静的界面如何工作',
      date: 'Aug 17, 2026',
      listDate: 'Aug 17',
      minutes: 13,
      body: `
        <p>安静不是空白，也不是把所有东西调成浅灰。一个真正安静的界面，会在需要行动时给出明确方向，在不需要行动时退到背景里。它不要求用户欣赏设计，而是让人更快进入自己的工作。</p>
        <p>这种安静来自秩序：信息有主次，控件有固定位置，反馈有一致节奏。视觉上的克制只是结果，背后仍然需要大量判断。</p>

        <h2 id="quiet-is-hierarchy"><a class="header-anchor" href="#quiet-is-hierarchy">#</a>安静首先是层级清楚</h2>
        <p>当页面上每个标题都很大、每个按钮都很亮、每个区块都像卡片一样浮起时，用户会失去阅读顺序。真正的层级不是制造更多差异，而是让少数关键差异足够可靠。</p>
        <p>我通常先用纯文字和发丝线完成排版。如果在没有颜色、阴影和动效的情况下仍能看懂页面，说明结构已经成立。之后增加的视觉手段，才是在强化秩序，而不是掩盖问题。</p>
        <h3 id="one-focus"><a class="header-anchor" href="#one-focus">#</a>一个视口只保留一个焦点</h3>
        <p>焦点不一定是按钮，也可以是一段正在阅读的文字、一张需要比较的表格，或者一项等待完成的任务。周围元素应该帮助焦点被理解，而不是同时争夺注意力。</p>
        <p>这也是留白真正的用途：它不是剩余空间，而是把无关信息推远，让关系变得可见。留白需要服务于结构，一块没有任何理由的大空地，只会让人怀疑内容是否缺失。</p>

        <h2 id="motion-explains-change"><a class="header-anchor" href="#motion-explains-change">#</a>动效只负责解释变化</h2>
        <p>动效最有价值的时刻，是界面状态发生改变：页面从哪里进入，内容为什么消失，点击之后哪个区域被更新。用户能从运动方向和时间关系中理解因果。</p>
        <p>如果一个元素不断移动，却没有状态变化，它很快就会变成噪声。背景动画尤其如此。它可以在开场建立气氛，但应该及时收束，把稳定的阅读面还给内容。</p>
        <h3 id="feedback-before-decoration"><a class="header-anchor" href="#feedback-before-decoration">#</a>反馈先于装饰</h3>
        <p>悬停、聚焦、加载和完成状态都需要反馈，但反馈不必夸张。一次 1px 规则线的生长、一个短距离位移、一段透明度变化，已经足够说明系统收到了操作。</p>
        <blockquote><p>好的动效不是让人看到“这里有动画”，而是让人确信“刚才的操作已经发生”。</p></blockquote>

        <h2 id="density-needs-rhythm"><a class="header-anchor" href="#density-needs-rhythm">#</a>信息密度需要节奏</h2>
        <p>安静的界面不等于信息稀少。编辑器、仪表盘和资料库都可以很密集，只要重复结构稳定、对齐关系清楚、行距与分隔保持一致。人眼擅长扫描规律，不擅长不断重新学习布局。</p>
        <p>我会把高频操作放在固定区域，把低频设置藏进语义明确的菜单。页面因此看起来更少，但功能并没有消失。减少的是同时暴露的选择，而不是能力本身。</p>
        <h3 id="words-are-interface"><a class="header-anchor" href="#words-are-interface">#</a>文字也是界面</h3>
        <p>模糊的按钮文案会迫使用户停下来猜测。相比“确定”“继续”，更具体的“保存草稿”“发布文章”能直接说明结果。减少解释成本，往往比重新设计按钮样式更有效。</p>

        <h2 id="calm-needs-confidence"><a class="header-anchor" href="#calm-needs-confidence">#</a>克制需要足够自信</h2>
        <p>界面越安静，错误越容易被看见。间距差一点、对齐偏一点、文字层级不稳定，都会失去装饰的遮掩。因此克制并不是少做，而是愿意把时间花在那些不容易被截图展示的细节上。</p>
        <p>最终，安静是一种对用户的尊重：相信他们来这里有自己的目的，不需要页面持续表演。设计只要在正确的时刻出现，然后退开。</p>
        <p class="share-line">&gt; 留言讨论：哪个界面让你可以长时间专注而不感到疲惫？</p>
      `,
    },
    {
      route: '/posts/open-source-rhythm',
      title: '在开源项目里建立长期节奏',
      date: 'Aug 6, 2026',
      listDate: 'Aug 6',
      minutes: 12,
      body: `
        <p>开源项目最容易在两个时刻失去节奏：刚开始时什么都想做，稳定之后又觉得每件事都必须立刻回应。前者消耗方向，后者消耗维护者。</p>
        <p>长期维护需要的不是更强的意志力，而是一套在普通生活里也能运行的节奏。它允许项目成长，也允许人休息。</p>

        <h2 id="define-a-week"><a class="header-anchor" href="#define-a-week">#</a>先定义一个可以完成的星期</h2>
        <p>我不再用“清空所有议题”衡量一周是否成功。更现实的目标是：确认重要问题、合并少量高质量改动、发布一次可解释的更新。剩下的工作继续排队，不代表失败。</p>
        <p>一个可以反复完成的星期，比偶尔爆发的周末更可靠。节奏一旦稳定，贡献者也会知道什么时候适合提交、什么时候可以期待反馈。</p>
        <h3 id="separate-inbox"><a class="header-anchor" href="#separate-inbox">#</a>把收件箱和路线图分开</h3>
        <p>议题区记录的是外界输入，不应该自动成为维护者的待办清单。真实、合理的需求也可能不符合当前方向。先分类，再承诺，可以避免每条反馈都变成心理债务。</p>

        <h2 id="release-small"><a class="header-anchor" href="#release-small">#</a>小批量发布，完整地说明</h2>
        <p>积累很久的大版本会让每次发布都像一次考试。改动越多，验证越难，迁移说明也越容易遗漏。较小的发布让问题更容易定位，也让维护者保持对变化的理解。</p>
        <p>小并不意味着随意。每次发布仍然需要清楚回答：什么变了，谁会受到影响，遇到问题如何退回。说明写得完整，版本号才真正有意义。</p>
        <h3 id="notes-for-humans"><a class="header-anchor" href="#notes-for-humans">#</a>为人写更新说明</h3>
        <p>提交记录面向实现，更新说明面向使用。把内部重构翻译成用户能感知的变化，是发布过程中不可省略的一步。没有可见影响的改动可以简写，有迁移成本的改动必须举例。</p>
        <blockquote><p>发布不是把代码推到远端，而是把变化安全地交给别人。</p></blockquote>

        <h2 id="make-contribution-legible"><a class="header-anchor" href="#make-contribution-legible">#</a>让贡献路径可以被看懂</h2>
        <p>很多项目欢迎贡献，却没有说明一次贡献如何被评估。贡献者只能从历史讨论里猜测偏好，维护者则不断重复相同解释。把判断标准写下来，双方都会轻松很多。</p>
        <p>好的贡献指南不需要很长，但要说明项目边界、测试方式、设计取舍和响应节奏。它既是入口，也是过滤器，让真正合适的改动更快抵达。</p>
        <h3 id="recognize-maintenance"><a class="header-anchor" href="#recognize-maintenance">#</a>承认维护型贡献</h3>
        <p>修正文档、复现问题、整理测试、回答新手问题，都会减少系统的摩擦。只奖励新功能，会让项目不断扩张，却没有人照顾已有部分。长期项目需要让维护型工作被看见。</p>

        <h2 id="rest-is-part"><a class="header-anchor" href="#rest-is-part">#</a>休息也是节奏的一部分</h2>
        <p>维护者离开一段时间，不应该让项目立刻陷入危机。自动化测试、发布清单、明确权限和可查阅的决策记录，都是为了让项目不依赖某个人持续在线。</p>
        <p>最健康的状态不是永远活跃，而是能够暂停，也能够回来。真正长期的节奏会为变化留出余地：团队会变，兴趣会变，生活也会变，但项目仍然知道下一步怎样开始。</p>
        <p class="share-line">&gt; 留言讨论：你的项目现在依赖热情，还是已经拥有自己的节奏？</p>
      `,
    },
  ]

  articles.forEach(function (article) {
    pages[article.route] = '<article class="page prose slide-enter-content">'
      + '<h1>' + article.title + '</h1>'
      + '<p class="post-meta">' + article.date + ' · ' + article.minutes + 'min</p>'
      + article.body
      + '</article>'
    titles[article.route] = article.title + ' - StackTao'
  })

  var yearMarker = '<div data-year-group><div class="year-label">2026</div>'
  var rows = articles.map(function (article) {
    return '<a class="post-row item" data-lang="zh" href="#' + article.route + '">'
      + '<span>' + article.title + '</span>'
      + '<span class="meta">' + article.listDate + ' · ' + article.minutes + 'min</span>'
      + '</a>'
  }).join('')
  if (pages['/posts'] && pages['/posts'].indexOf(articles[0].route) === -1)
    pages['/posts'] = pages['/posts'].replace(yearMarker, yearMarker + rows)

  var search = window.SEARCH_INDEX || []
  for (var i = articles.length - 1; i >= 0; i--) {
    search.unshift({
      title: articles[i].title,
      kind: '文章',
      href: '#' + articles[i].route,
    })
  }
})()
