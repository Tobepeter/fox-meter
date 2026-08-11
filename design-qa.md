# Design QA

## 验收对象

- 功能：FoxMeter 52×52 Mini 默认 / 悬浮状态
- 用户问题截图：`/var/folders/pj/cft9_35560v7mh9ync0x35000000gn/T/codex-clipboard-2d0962e8-c709-4049-98b8-773b006d4904.png`
- 默认实现：`.temp/screenshots/sc-mini-default-no-background-light.png`
- 悬浮等效实现：`.temp/screenshots/sc-mini-hover-expand-light.png`
- 原生默认实现：`.temp/screenshots/sc-mini-default-no-background-native.jpg`
- 问题前后对照：`.temp/screenshots/sc-mini-feedback-2-final-comparison.png`
- 默认 / 悬浮聚焦对照：`.temp/screenshots/sc-mini-default-hover-comparison.png`
- 数字宽度边界对照：`.temp/screenshots/sc-mini-adaptive-values.png`（从左到右为 9% / 42% / 100%）
- 单容器完整 / Mini：`.temp/screenshots/sc-window-single-container-expanded.png`、`.temp/screenshots/sc-window-single-container-mini.png`
- 原生交通灯完整 / Mini：`.temp/screenshots/sc-window-controls-native-expanded.png`、`.temp/screenshots/sc-window-controls-native-mini.png`

## 尺寸与状态

- 用户截图为 224×146 px，其中旧 Mini 主体裁为 106×106 px
- 浏览器截图为 320×184 px，CSS 视口 320×184，Mini 主体精确为 52×52 CSS px，截图密度为 1×
- 问题前后对照将旧主体与新主体分别归一化为 520×520 px 后拼接
- 默认 / 悬浮聚焦对照将两个 52×52 状态分别归一化为 312×312 px 后拼接
- 用户截图为真实每周数据 96%，浏览器 Mock 为每周 42%；动态数值差异不参与视觉判断
- 自适应验证使用 9% / 42% / 100% 三个开发预览值，分别覆盖一位、两位与三位数字

## Findings

- [P1 已修复] 圆角外出现半透明方形背景
  - 位置：Mini 外沿
  - 证据：用户截图在圆角下方可见矩形灰色区域；新实现仅保留 1px 内高光，不再使用会被透明窗口裁切的 CSS 外阴影
  - 影响：圆角内容看起来像叠在未裁切的方形面板上
  - 修复：移除默认与 hover 的全部 CSS 外阴影；原生 Mini 同时保持 `set_shadow(false)`
- [P1 已修复] 狐狸水印背景不符合最终偏好
  - 位置：Mini 数字后方
  - 证据：中间迭代曾加入低透明度真实狐狸图标；用户明确更正为“背景不好看”
  - 影响：常驻 52px 小窗信息过密，水印会干扰数字识别
  - 修复：完全删除 Mini 水印图片与相关样式，默认只显示百分比
- [P2 已修复] 小号角落展开图标不够直接
  - 位置：Mini hover / focus 状态
  - 证据：旧状态在右上角显示 10px 图标；新状态让数字淡出，并在中心显示 20px `Maximize2`
  - 影响：小角标在 52px 目标上不易辨认，也无法清楚表达“点击恢复完整窗口”
  - 修复：hover / focus 使用 180ms 缩放与淡入淡出完成数字到展开图标的状态切换
- [P1 已修复] 100% 超出 Mini 右侧边界
  - 位置：Mini 默认态百分比
  - 证据：用户截图中 `100%` 的百分号被 52px 按钮右缘裁切
  - 影响：满额状态恰好是最宽的合法值，却无法完整阅读
  - 修复：以 23px 渲染后读取实际内容宽度，再按按钮内 46px 可用宽度等比计算字号；百分号通过同一 CSS 变量同步缩放，字号下限为 18px
- [P1 已修复] Mini 恢复后偶发残留原生标题栏空白
  - 位置：完整窗口顶部与交通灯区域
  - 证据：旧实现切换 `set_decorations(false / true)`，恢复时 macOS 会重建标题栏，Overlay 与 WebView 的相对位置存在时序竞争
  - 影响：动画结束后仍可能留下独立标题栏，交通灯位于页面之外，看起来像完整页面整体向下错位
  - 修复：不再拆装 decorations；窗口始终保留 Overlay 结构，Mini 只隐藏三颗 `standardWindowButton`，展开后再恢复显示
- [P1 已修复] Mini 与完整页面在窗口切换期间同时占据布局
  - 位置：React 根布局与窗口尺寸动画
  - 证据：新实现始终只有一个 `.window-frame` 和一个绝对定位 `.window-content`；实测切换全过程 `frameChildren = 1`
  - 影响：旧 Mini 退出节点尚未卸载时会把完整页面向下挤，暴露出 52px 中间状态
  - 修复：先淡出当前内容，保持同一原生窗口容器做尺寸动画，再互斥替换 Mini / 完整内容并淡入
- P0 / P1 / P2 未解决项：无

## 必查表面

- 字体：SF Pro Display / 系统回退；一位、两位数字保持 23px，三位数字按实测宽度缩小，百分号同比例缩放
- 间距：数字组与 20px 展开图标均在 52×52 中心；15px 圆角保持不变
- 色彩：浅色使用中性近白与灰色细边框，深色使用中性近黑；无紫色表面、渐变或水印
- 图片质量：Mini 最终不使用任何背景图片；完整模式继续复用原狐狸图标资产
- 图标：展开态使用现有 Lucide `Maximize2`，没有自制 SVG 或字符替代
- 文案与内容：默认只显示动态百分比；可访问名称仍包含周期与剩余值

## 交互与技术验证

- 默认态：数字可见、展开图标不可见、无水印
- hover / focus：数字透明度为 0，展开图标透明度为 0.82，并保持整块可点击
- 点击、Enter 或 Space 恢复完整模式；超过 4px 的拖动只移动窗口
- 双周期优先每周；无每周时回退第一个可用周期
- 浏览器 Mini 尺寸 52×52，控制台错误 0
- 边界值实测：9% 为 23px、42% 为 23px、100% 为 19.9px；100% 内容宽 45.23px，左右间距均约 3.38px
- 原生 debug `.app` 验证 Mini 无交通灯、无系统阴影，但保留不可见的 Overlay 标题栏结构；展开后交通灯恢复且内容顶部无空白；连续往返 5 轮均通过，未覆盖 `/Applications/FoxMeter.app`
- macOS 尺寸过渡使用非阻塞 AppKit `NSAnimationContext + animator().setFrame`，缩小与放大统一为 240ms，不再依赖阻塞式 `setFrame(...animate:true)` 或 Tauri 队列中的多次 `set_size`；左上角锚点保持不动，140ms 内容 Fade 与尺寸动画交叉执行，避免窗口先清空后放大造成白屏

## Comparison History

1. 初始实现：固定紫色描边、淡紫表面与原生阴影
2. 第一轮修复：中性深浅主题并关闭原生阴影，但 CSS 外阴影仍在透明窗口内形成方形区域
3. 第二轮尝试：移除 CSS 外阴影并加入低透明度狐狸水印
4. 用户最终更正：不要水印背景，hover 时切换为放大的展开图标
5. 最终证据：`.temp/screenshots/sc-mini-feedback-2-final-comparison.png` 与 `.temp/screenshots/sc-mini-default-hover-comparison.png`
6. 数字宽度修复：100% 从固定 23px 改为按真实内容宽度计算，最终证据为 `.temp/screenshots/sc-mini-adaptive-values.png`

final result: passed
