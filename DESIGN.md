# RateMyCourse · Design

更新：2026-11-26（日本时间）。这是现行视觉与交互约定的入口，不是旧原型集合。产品规则见 [PRD.md](PRD.md)，module 及资产迁移见 [ARCH.md](ARCH.md)。

状态：首页已切换为获批的**蓝调「岩岸海湾」**正式版本；课程工作区（`#/browse`、`#/course/:id`、`#/share`、`#/profile`、`guide.html`、`analytics.html`）保持既有暖纸／酒红界面与交互不变。

## 1. 设计方向

- **Landing（蓝调岩岸海湾）**：以倒悬东京夜城、深海蓝湾、暖光孤帆与授权改编的蓝调枝叶前景构建“出发与探索”的首屏叙事；随后过渡到深海蓝社区与阅读界面（深海蓝 `#132d3f` 卡片 + 帆布琥珀 `#e6b37c` 主操作），让视线聚焦在具体学生与真实修课原话。主标题 `Chart your own course`，第二拍承接 `RateMyCourse` 与 `Your Major is a Starting Point`。
- **课程工作区（既有保持）**：沿用暖纸背景、墨色文字与早大酒红强调，保证长文评价阅读与表单填写的清晰层级；本轮未改动工作区 UI/UX 或动效。

品牌统一使用 **RateMyCourse**；历史文件中的 Odyssey 是来源，不代表恢复旧品牌。

## 2. 现有视觉语汇

Landing 与课程工作区当前各自维护独立样式表，未强行合并为一套 token；后续如需统一工作区视觉，另行设计评审。

| 用途 | Landing（蓝调岩岸海湾） | 课程工作区（既有暖纸） |
| --- | --- | --- |
| 主底色 | `#082034`（夜湾）／`#081926`（深海）／`#0c1c29`（阅读底） | `#f6f3ee` |
| 卡片表面 | `#132d3f`（课程卡）／`#102c37`（名片背面） | `#fffdfa` |
| 主文字 | `#f8f2e6`（首屏）／`#f2f0ea`（正文） | `#292522` |
| 次文字 | `#bccad3`／`#b1c6cc` | `#746d65` |
| 强调色 | `#e6b37c`（帆布琥珀） | `#7a1731`（酒红） |
| 分隔线 | `#4a6172`（阅读区）／`#29434d`（名片区） | `#ddd6cb` |

Landing 本地字体包含 Space Grotesk、Hanken Grotesk、JetBrains Mono；许可证与字体文件一起保留。工作区字体规则保持现有 CSS。

## 3. 信息与交互

### Landing（正式五段结构）

1. **固定顶栏（`.site-header`）**：桌面及手机均为单行四等分网格（课程库、选课指南、中英切换、登录／个人名片），每项 `min-height: 44px`，顶缘渐隐深蓝背景不遮挡主体阅读。
2. **两拍海湾 Hero（`bay-hero.js`）**：
   - 首拍展示倒悬东京城景、夜帆与倒影、蓝调原图枝叶前景（按窗口宽高比等比取景，保留原 Alpha 与叶形，通过 sRGB 矩阵调蓝）、主标题、早大开放课副文案、`Explore courses` 按钮，以及底部 3 秒周期轻浮的小帆船提示。
   - 随滚动进入第二拍：背景渐暗、小帆船淡出、居中浮现 `RateMyCourse` 与产品介绍；随后 1px 白色实线从裁切窗上缘进入并向下退出，引导进入社区模块。
3. **3D 环形学生名片轮播（`student-carousel/`）**：
   - Shadow DOM 隔离样式；保持获批的圆柱几何参数、入场旋转、拖拽／方向键浏览、悬停暂停、点击／回车翻转查看学生背景与修课列表，以及 Escape 返回写真并恢复键盘焦点。
   - 严格受实时 `getContributorWall()` 控制（fail-closed：读取失败或全员撤墙时隐藏整个区段，不显示过期或撤墙名片）。
4. **课程原话轮播（`.voices`）**：
   - 深海蓝卡片 + 帆布琥珀主操作；桌面左列课程信息与操作、右列纵向排布学生原话；窄屏按课程 → 原话 → 操作纵向排列。支持箭头按钮与手势左／右滑切课。
   - 中文模式直接展示作者中文原文；英文模式清晰标注译文来源，并保留可展开查看的中文原文，绝不将译文冒充原话。
5. **目录入口与居中页脚（`.official-band` / `.bay-footer`）**：
   - 底部 `Find your next course` 与 `Explore courses` 主按钮；页脚居中呈现两行旅程文案、巨幅 `RateMyCourse` 字标、版权与选课指南入口，素材署名默认折叠在 `<details>` 中（仅列实际使用的东京塔 CC BY 2.0 改编与获授权的 Joseph Berry 枝叶改编）。
6. **真实 Google 登录弹窗（`dialog.bay-dialog`）**：
   - 首页所有受控业务入口（课程库、探索课程、学生名片查看经历、课程原话查看完整评价、登录按钮）在未登录时打开深海蓝 Google 登录弹窗，保留具体返回路由；已登录时直接跳转目标路由。弹窗支持 `×`、点击遮罩与 Escape 关闭，并恢复焦点；OAuth 失败显示错误并可重试。

### 找课与阅读（工作区既有约定，本轮未改）

- 课程名称、教师、学期和课程事实帮助定位；作者与教师分别标识。
- 四项指标同时可见，不做只能逐个点击的 tab；缺值与不确定使用明确文字。
- 阅读顺序为作者经历、适合／不适合、考核／说明，再到作者资料及自愿公开背景，官方课程信息收尾。
- 五段作者原文是主展示；译文独立标记且默认收起。不能为“更好看”改写、截断为替代全文或补写作者意见。
- 原文中的有效链接可由键盘操作；显示原文不因界面语言切换被替换成译写。
- 手机上 fit／avoid 及拥挤信息自然纵向排列，不靠裁掉内容保持卡片高度。

### 投稿与个人名片（工作区既有约定，本轮未改）

- 投稿按阅读卡片组织；完整公开内容预览复用阅读呈现，清楚标明尚待提交／审核。
- 返回修改、确认提交、保存中、失败重试具有明确反馈。不能用成功动画冒充持久化成功。
- 学期按年份→春／秋两步选择；不预选。Escape、返回、外部点击与关闭不丢失已选值。
- 四指标允许跳过或表达不确定；必需与可选标签符合真实校验规则。
- 草稿状态、未保存修改、账号变化和失败恢复要可理解，不把内存保留写成云端保存。
- 名片、照片和评价的公开选择分别表述；预览与保存分开。照片取景有独立的头像与墙端状态。

## 4. 动效与可访问性

- 保留原生滚动，不劫持滚轮，不以强制吸附代替导航。
- Hero 使用单一 GSAP ScrollTrigger scrub，阶段切换同步维护 `inert` 与 `aria-hidden` 并在焦点落在隐藏层时安全转移至舞台。
- 尊重 `prefers-reduced-motion` 以及短横屏（视口高度 `< 560px`）：关闭滚动时间轴与小帆船漂浮后，两拍文案与 CTA 在正常文档流中完整可读可操作。
- 遮罩渐变同时声明 `-webkit-mask-image` 与 `mask-image` 以兼容 Safari；视口高度同时提供 `100vh` 与 `100svh`。
- 持续旋转的环形轮播支持悬停、聚焦、离屏和标签页隐藏时自动暂停，减少动态模式下关闭入场旋转与翻转过渡。
- 正式发布前须结合桌面／手机 Chrome 自动化验收以及**实体手机 Safari 实测**确认滚动、裁切与触控手感。

## 5. 视觉资产与历史方案

| 资产 | 当前政策 |
| --- | --- |
| `src/site/landing/assets/bay/`（7 张图） | 蓝调海湾正式素材：`bay-desktop.webp`、`bay-phone.webp`、`city.webp`、`city-mobile.webp`、`night-sail.webp`、`night-reflection.webp`、`background-min-3.png`（SHA-256 锁定）。 |
| `src/site/landing/student-carousel/` | 预构建 ESM 运行包、4 位贡献者肖像、Hanken 字体及 4 份开源许可证；可编辑 `src/` 留在仓库内但被打包脚本排除出公开产物。 |
| `src/site/landing/assets/` 字体与许可证 | Space Grotesk、Hanken Grotesk、JetBrains Mono 及对应 `OFL-*.txt` 保留。 |
| 根 `assets/`（3 张历史人物图） | 仍供工作区 `src/identity/wall.js` 使用，保持原路径不变。 |
| 已淘汰的暖纸首页资产 | 已归档至仓库外 `Archive/Landing-WarmPaper-2026-11-26/`（含 `manifest.json` 哈希与恢复命令）；同时历史上缓存的已发布版本继续由 `pages-compatibility.json` 从 Git 历史按需打包保留。 |
| 已淘汰的 A 版／东京建筑版／生成枝叶候选 | 不合入正式仓库；历史探索证据保留在本地 `Reference/` 与 `QA/`。 |

设计入口沿用项目指定 Figma 文件「宇宙」内的 Page「乱画画」；后续注册／投稿／名片及工作区 UI 改动须先经过设计评审再实现。

## 6. 维护规则

- 视觉、信息层级、交互或资产政策改变时更新本文件；实现位置、module 接口或打包机制变化更新 [ARCH.md](ARCH.md)；产品对象与访问资格变化更新 [PRD.md](PRD.md)。
- 一个规则只在一处维护；内容原文保护和资格政策引用 PRD，不另造一套行为。
- 历史批准依据仍保留在 [direction-approved.md @ 77a2aea](https://github.com/huangyuanchang2006/ratemycourse/blob/77a2aea999b5c6be98601368097d7658d4bc3f9f/direction-approved.md)。

当前实现定位：[Landing 装配](src/site/landing/index.js)、[海湾 Hero](src/site/landing/bay-hero.js)、[真实摘录数据](src/site/landing/previews.js)、[Landing CSS](src/site/landing/landing.css)、[工作区 CSS](src/site/workspace.css)、[名片墙 CSS](src/identity/wall.css)。
