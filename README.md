# dsh-kimi-shell

**把 dsh-web-mobile 的左侧会话抽屉，变成 kimi 风格的底部浮层（bottom sheet）。**
**Turn the dsh-web-mobile session drawer into a kimi-style bottom sheet.**

[中文](#中文) · [English](#english)

| 改造前 Before | 改造后 After |
|---|---|
| 左侧抽屉盖住 70% 屏宽，内容区被挤成竖缝 | 底部上滑浮层，会话记录全程可见 |
| ![before](docs/before.png) | ![after](docs/after.png) |

## 中文

DSH（DeepSeek Harness）手机端 Web 的会话侧栏默认是「从左侧盖过来的抽屉」，
打开后挤占大半个屏幕。本插件把它改造成移动端原生的底部浮层交互：

- **底部浮层**：100vw × 82dvh、顶部圆角 + 抓手（grabber）+ 投影 + 遮罩
- **单轴动画**：打开自底部上滑、关闭向下滑出，一气呵成（内置「动画改道器」，
  把 dsh-web-mobile 的内联 translateX 序章实时改写为等进度 translateY）
- **内容铺满**：会话列表横向铺满整宽；工作区分组降为紧凑小节头；
  会话行 44px 触屏目标；隐藏品牌行
- **输入法防误弹**：切换/新建会话后不再自动聚焦输入框（键盘不再遮挡会话记录），
  直接点输入框仍可正常打字
- **桌面零影响**：所有规则锁在 `(max-width: 1023px) and (pointer: coarse)` 里，
  鼠标指针下任何窗口宽度都不生效；不写宿主半逻辑、不 patch 组件

### 环境要求

- DeepSeek Harness `dsh` ≥ 0.1.7-rc.2（在 0.1.7-rc.2 实测）
- **[dsh-web-mobile](https://github.com/mexiaosqwq/dsh-web-mobile) ≥ 3.0.3（硬依赖）**
  —— 本插件改造的就是它的抽屉：开合状态机、遮罩、FAB、gzip 全部复用，
  只覆盖呈现层。请先装它，再装本插件（顺序不影响功能）。

### 安装 / 卸载

```sh
# 先装依赖（若尚未安装）
dsh plugin --profile web add dsh-web-mobile

# 安装本插件（热生效，无需重启服务）
dsh plugin --profile web add github:<OWNER>/dsh-kimi-shell

# 卸载
dsh plugin --profile web rm dsh-kimi-shell
```

装好后手机浏览器打开 DSH Web 即生效，无需任何配置；桌面端不受影响。

### 工作原理

1. **CSS 覆盖**（媒体查询门控 + 双写属性选择器保特异性）：
   把 dsh-web-mobile 定位为左抽屉的侧栏列改写为底部浮层盒子；
2. **动画改道器**：MutationObserver 监听列的内联 `transform`
   （它的开合序章是 JS 内联 `translateX(±110%)!important` CSS 动画，
   样式表无法覆盖），在渲染前把每一帧改写为等进度的 `translateY`；
3. **输入法防误弹**：`focusin` 捕获 + 抑制窗口（浮层内按下指针起 1.5s），
   期间主会话区编辑框聚焦即 blur；直接点按放行，浮层内重命名输入不拦。

自有 `data-kimi-shell` / id 键控的命名空间，不碰 `[data-mobile-nav]` 属性值，
与 dsh-better-sidebar 等其它插件实测共存。

### 无触摸仿真的浏览器上如何调试

浏览器原生 CSS media query 不吃 JS 的 matchMedia 补丁，无头/桌面浏览器看不到
移动效果。本插件内置测试通道：`sessionStorage.setItem('kimi-test','1')` 后刷新
（或 URL 带 `#kimi-test=1`）——会复制 dsh-web-mobile 的样式表、把移动 media query
改写为无条件命中后注入副本，同时本插件 CSS 去 media 包装直接生效。
`kimi-test=0` 退出。真实手机无需任何参数。

### 兼容性说明

- 会话树定位使用 `[class*="sessionRow"]` 等子串选择器（与 dsh-web-mobile 同款
  技术），宿主大版本升级改类名时可能需要跟随更新；
- 已实测组合：dsh 0.1.7-rc.2 + dsh-web-mobile 3.0.3 + dsh-better-sidebar 0.21.1。

## English

A [DSH](https://github.com/deepseek-ai/deepseek-harness) web UI plugin that
transforms the **dsh-web-mobile** session drawer (a left overlay covering ~70%
of the screen) into a **kimi-style bottom sheet** — full-width, rounded top
corners, grabber, dimmed scrim, single-axis slide animation.

- Bottom sheet: 100vw × 82dvh; session rows become 44px touch targets
- Clean open/close: a MutationObserver redirects dsh-web-mobile's inline
  `translateX` choreography to equivalent-progress `translateY` in real time
- No keyboard hijack: switching/creating sessions no longer auto-focuses the
  composer; tapping the input directly still works
- Zero desktop impact: everything is gated behind
  `(max-width: 1023px) and (pointer: coarse)`

### Requirements

- dsh ≥ 0.1.7-rc.2 · **dsh-web-mobile ≥ 3.0.3** (hard dependency — this plugin
  only restyles its drawer; install it first)

### Install

```sh
dsh plugin --profile web add dsh-web-mobile        # dependency, if missing
dsh plugin --profile web add github:<OWNER>/dsh-kimi-shell
```

Hot-reloads into a running profile — no service restart needed. Desktop is
untouched.

## License

MIT
