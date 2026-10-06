/**
 * dsh-kimi-shell — DSH Web 手机端独立移动壳（无需 dsh-web-mobile）。
 *
 * 能力：
 *  1. 会话侧栏 → kimi 风格底部浮层（100vw × 82dvh、圆角、抓手、遮罩、单轴滑动）
 *  2. 自建 FAB（收起态唯一入口）+ 遮罩点击关闭（开合优先驱动宿主原生开关按钮）
 *  3. 切换/新建会话后输入法防误弹（focusin 捕获 + 抑制窗口）
 *  4. 手机端默认浅色主题：偏好为 system 时一次性改写为 light（写入宿主
 *     user-settings，服务端持久，之后所有设备默认浅色；显式选过 dark 的不动）
 *  5. viewport meta 补齐（viewport-fit=cover / interactive-widget / 禁双击缩放）
 *  6. 项目行「+ 新建会话」常显（宿主靠 :hover 展开，手机无 hover）
 *  7. 会话重命名防误触：真双击全拦（重命名入口=行尾 ⋯ 菜单；长按手势 v0.6.1 已撤）
 *  8. 会话行 ⋯ 菜单（kimi 式）：重命名 / 归档（回收站）/ 彻底删除 ——
 *     删除能力来自 dsh-session-recycle-bin（未安装则自动降级只留重命名）
 *
 * 门控：`(max-width: 1023px) and (pointer: coarse)`，桌面零影响。
 * 共存：检测到 dsh-web-mobile 在场时整体休眠（避免双壳打架）。
 * 测试通道：sessionStorage['kimi-test']='1' 或 URL #kimi-test=1（宿主会清 query），
 * 去 media 包装直接生效 + 强制启用 JS 外壳效果；kimi-test=0 退出。
 * 主题改写只在真移动条件执行（TEST 不触发，避免污染测试者的服务端偏好）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-kimi-shell',
  factory(require) {
    const STYLE_ID = 'dsh-kimi-shell-style';
    const TEST_STYLE_ID = 'dsh-kimi-shell-test-style';
    const MQ = '(max-width: 1023px) and (pointer: coarse)';

    const RULES = `
/* ===== 1. 帧：网格收为单列（侧栏列已离棚），居中列满宽 ===== */
[data-kimi-frame] {
  position: relative !important;
  grid-template-columns: minmax(0, 1fr) 0 0 !important;
}
/* 拖宽手柄在手机上无意义 */
[data-kimi-frame] > [class*="handle"] { display: none !important; }

/* ===== 2. 侧栏列 → 底部浮层盒子 =====
   开合不用 transform：宿主的模态冻结机制（settings/plugins 等）会在该列
   上留 top 值并反复制造 CSSTransition，把 transform 钉在"打开位"变成吞
   点击的透明墙（动画层压过一切内联/!important 声明）。改用 display 翻转：
   不可动画、不可钉、display:none 不接收任何点击。 */
[data-kimi-frame] > :first-child {
  position: absolute !important;
  top: auto !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: 82vh !important;
  height: 82dvh !important;
  max-height: 82dvh !important;
  z-index: 1300 !important;
  border-radius: 14px 14px 0 0 !important;
  box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.28) !important;
  overflow: hidden !important;
  background: transparent !important;
  transition: none !important;
  animation: none !important;
}
[data-kimi-frame][data-sidebar-collapsed] > :first-child {
  display: none !important;
}
[data-kimi-frame]:not([data-sidebar-collapsed]) > :first-child {
  transform: none !important; /* 抹掉宿主残留/钉住的位移 */
}

/* ===== 3. 抓手（列自身透明，留白在内层真实表面上，避免白边）===== */
[data-kimi-frame] > :first-child::before {
  content: "";
  position: absolute;
  top: 7px;
  left: 50%;
  width: 36px;
  height: 4px;
  transform: translateX(-50%);
  border-radius: 2px;
  background: currentColor;
  opacity: 0.22;
  z-index: 5;
  pointer-events: none;
}

/* ===== 4. 内层铺满整宽（列下有 display:contents 包装层，锤四代）===== */
[data-kimi-frame] > :first-child > * {
  padding-top: 20px;
  min-height: 100%;
  box-sizing: border-box;
}
[data-kimi-frame] > :first-child,
[data-kimi-frame] > :first-child > *,
[data-kimi-frame] > :first-child > * > *,
[data-kimi-frame] > :first-child > * > * > *,
[data-kimi-frame] > :first-child > * > * > * > * {
  box-sizing: border-box;
}
[data-kimi-frame] > :first-child > *,
[data-kimi-frame] > :first-child > * > *,
[data-kimi-frame] > :first-child > * > * > *,
[data-kimi-frame] > :first-child > * > * > * > * {
  width: 100% !important;
  max-width: 100% !important;
}

/* ===== 5. 内容 kimi 化 ===== */
[data-kimi-frame] [class*="_logoRow"] { display: none !important; }
[data-kimi-frame] [class*="_projectRow"] { min-height: 28px !important; font-size: 12px; opacity: 0.62; }
[data-kimi-frame] [class*="sessionRow"] { min-height: 44px; }

/* ===== 6. 遮罩（挂帧内，可见性由宿主 collapsed 状态驱动，无需 JS 同步）===== */
[data-kimi-frame] [data-kimi-backdrop] {
  position: fixed;
  inset: 0;
  z-index: 1250;
  background: rgba(0, 0, 0, 0.45);
  opacity: 1;
  transition: opacity 0.3s ease;
}
[data-kimi-frame][data-sidebar-collapsed] [data-kimi-backdrop] {
  opacity: 0;
  pointer-events: none;
}

/* ===== 7. FAB（收起态入口；系统色 Canvas/CanvasText 自适应明暗主题）===== */
[data-kimi-frame] [data-kimi-fab] {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 1260;
  width: 48px;
  height: 48px;
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: Canvas;
  color: CanvasText;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), 0 0 0 1px color-mix(in srgb, CanvasText 12%, transparent) inset;
}
[data-kimi-frame][data-sidebar-collapsed] [data-kimi-fab] { display: flex; }
[data-kimi-frame] [data-kimi-fab]:active { transform: scale(0.94); }

/* ===== 8. 输入 16px 防 iOS 聚焦自动放大 ===== */
[data-kimi-frame] [contenteditable="true"],
[data-kimi-frame] textarea {
  font-size: 16px;
}

/* ===== 9. 头部切换按钮（slot 注入 conversation.header.leading，原生左侧首位区）===== */
[data-kimi-frame] [data-kimi-header-btn] {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  padding: 2px;
  cursor: pointer;
}
/* 头部按钮可见时 FAB 隐藏（slot 不可见处由 FAB 兜底）*/
html[data-kimi-header-btn] [data-kimi-fab] { display: none !important; }

/* ===== 10. 设置弹窗：桌面双栏 → 手机单列（方案A，纯 CSS）=====
   弹窗渲染在 body 级 portal，不在 [data-kimi-frame] 内；锚点用
   [role=dialog] + 结构选择器（nav 标签 / 子元素序），不碰哈希类。
   作用域护栏 :has(> nav)：只有设置弹窗内含 <nav>；宿主其余小弹窗
   （重命名会话/删除确认等）无 nav，保持原生样式不被本节误伤。
   本段仍在 @media 移动门控内，桌面零影响。 */
/* 容器：竖排 + 近全屏 */
[role=dialog]:has(> nav) {
  display: flex !important;
  flex-direction: column !important;
  width: calc(100vw - 16px) !important;
  max-width: calc(100vw - 16px) !important;
  height: auto !important;
  max-height: calc(100dvh - 24px) !important;
}
/* 左栏 → 标题 + 顶部横向标签条（列容器须撑满，宿主默认 164px 桌面宽）*/
[role=dialog]:has(> nav) > nav {
  flex: 0 0 auto !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 10px 12px 0 !important;
}
/* navList → 横滑标签条。宿主会在渲染间切换形态：有时是 nav 直接子级的
   flex 盒，有时变成带 inline display:contents 的裸 div（样式表 !important
   可压过内联普通声明）。锚定用「nav 里直接含按钮的 div」（:has），两种
   形态都命中。 */
[role=dialog]:has(> nav) nav div:has(> button) {
  width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
  flex-direction: row !important;
  overflow-x: auto !important;
  gap: 6px !important;
  padding: 6px 0 8px !important;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
[role=dialog]:has(> nav) nav div:has(> button)::-webkit-scrollbar { display: none; }
[role=dialog]:has(> nav) nav button {
  flex: 0 0 auto !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  white-space: nowrap !important;
  min-height: 34px !important;
  padding: 6px 16px !important;
  border-radius: 17px !important;
}
/* 内容栏头（Open configuration file + 关闭X）→ 只留 X，绝对定位右上与标题同行 */
[role=dialog]:has(> nav) > div > div:first-child {
  position: absolute !important;
  top: 6px !important;
  right: 8px !important;
  z-index: 5 !important;
}
[role=dialog]:has(> nav) > div > div:first-child > div:first-child {  /* actions（仅 loopback 有）手机上收进设置里没入口，隐藏避免压标签条 */
  display: none !important;
}
/* 右栏：占满剩余 + 纵向滚动 */
[role=dialog]:has(> nav) > div {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  min-width: 0 !important;
}
[role=dialog]:has(> nav) > div > div:last-child {          /* options → 全宽纵滚 */
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 4px 16px calc(16px + env(safe-area-inset-bottom, 0px)) !important;
  -webkit-overflow-scrolling: touch;
}
/* 控件防挤压：任何控件不得超宽；弹性子项允许收缩 */
[role=dialog] select,
[role=dialog] input,
[role=dialog] textarea,
[role=dialog] button { max-width: 100% !important; }
[role=dialog]:has(> nav) > div > div:last-child * { min-width: 0; }
/* 主题三选（Light/Dark/System）：宿主 wrap+180px 基准在窄屏会竖排成大卡片，
   强制不换行 + 等分三列（cubeRow 为宿主语义类名后缀，同 sessionRow 风险级别） */
[role=dialog] [class*="cubeRow"] { flex-wrap: nowrap !important; }
[role=dialog] [class*="cubeRow"] > button {
  flex: 1 1 0 !important;
  min-width: 0 !important;
}
/* 设置弹窗打开时藏 FAB（弹窗在 portal，从 body 判断；任何 modal 期间都不该有 FAB） */
body:has([role=dialog]) [data-kimi-fab] { display: none !important; }

/* ===== 11. 项目行「+ 新建会话」常显（v0.5.0；v0.5.1 去文案锚定）=====
   宿主 rowActions 默认 display:none，靠 :hover 展开；手机无 hover → 永不可见。
   强制常显，但只放行直接子级 <button>（即 +，宿主 JSX 里它是 rowActions 唯一
   裸按钮）；⋯（Workspace actions，含删除工作区）包在 Menu 的 span 锚点里，
   随非 button 子级一并隐藏。会话行的 rowActions 不动 —— 误触归档比少个按钮糟糕。
   ⚠ 不能用 aria-label 文案锚定：宿主界面全量本地化（中文 UI 下 + 的标签是
   「在“X”中新建会话」），英文前缀匹配落空后 :not() 会把整个行动区藏空。 */
[data-kimi-frame] [class*="projectRow"] [class*="rowActions"] {
  display: inline-flex !important;
  height: auto !important;
}
[data-kimi-frame] [class*="projectRow"] [class*="rowActions"] > *:not(button) {
  display: none !important;
}
[data-kimi-frame] [class*="projectRow"] [class*="rowActions"] > button {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  min-height: 34px !important;
  padding: 0 !important;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
/* 宿主小弹窗（重命名会话等）portal root z=1000，会被本插件浮层(1300)整个
   盖住变成"隐形弹窗"。把直接承载 [role=dialog] 的容器统一提到浮层之上。
   纯结构选择器（直接子级关系），不碰哈希类；设置弹窗本就在更高层，提级无副作用。 */
div:has(> [role="dialog"]) {
  z-index: 1400 !important;
}

/* ===== 12. 会话行 ⋯ 菜单 + 底部动作单（v0.6.0，kimi 式）=====
   每个会话行行尾常显 ⋯：重命名 / 归档（入回收站，可还原）/ 彻底删除。
   删除能力来自 dsh-session-recycle-bin 插件（其行内垃圾桶图标 :hover 门控，
   手机不可见，正好由本菜单作手机端唯一入口；未安装该插件时菜单自动降级
   只留重命名）。动作单是 body 级 portal，z 高于浮层与宿主 modal。 */
[data-kimi-frame] [class*="sessionRow"] > [data-kimi-rowmenu] {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  margin: 0 2px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.62;
  padding: 0;
  cursor: pointer;
  border-radius: 8px;
}
[data-kimi-frame] [class*="sessionRow"] > [data-kimi-rowmenu]:active {
  opacity: 1;
  background: color-mix(in srgb, CanvasText 10%, transparent);
}
[data-kimi-action-sheet] {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: flex-end;
}
[data-kimi-action-sheet] [data-kimi-as-scrim] {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
[data-kimi-action-sheet] [data-kimi-as-panel] {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background: Canvas;
  color: CanvasText;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.28);
  padding: 10px 12px calc(14px + env(safe-area-inset-bottom, 0px));
  max-height: 72dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
[data-kimi-action-sheet] [data-kimi-as-title] {
  font-size: 13px;
  opacity: 0.6;
  padding: 6px 10px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-kimi-action-sheet] [data-kimi-as-item] {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 15px;
  text-align: left;
  border-radius: 10px;
  cursor: pointer;
}
[data-kimi-action-sheet] [data-kimi-as-item]:active {
  background: color-mix(in srgb, CanvasText 8%, transparent);
}
[data-kimi-action-sheet] [data-kimi-as-item][data-danger] {
  color: #e5484d;
}
[data-kimi-action-sheet] [data-kimi-as-note] {
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.75;
  padding: 4px 12px 12px;
}
[data-kimi-action-sheet] [data-kimi-as-row] {
  display: flex;
  gap: 10px;
  padding: 0 2px 2px;
}
[data-kimi-action-sheet] [data-kimi-as-row] > button {
  flex: 1 1 0;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  cursor: pointer;
}
[data-kimi-toast] {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 1600;
  max-width: calc(100vw - 48px);
  padding: 10px 16px;
  border-radius: 10px;
  background: CanvasText;
  color: Canvas;
  font-size: 13px;
  line-height: 1.45;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: opacity 0.25s ease;
}
`;

    const FAB_SVG =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>';

    // ---- 工具 --------------------------------------------------------------
    function ensureStyle(id, text) {
      let el = document.getElementById(id);
      if (el) el.remove();
      el = document.createElement('style');
      el.id = id;
      el.dataset.plugin = 'dsh-kimi-shell';
      el.textContent = text;
      document.head.appendChild(el);
      return el;
    }

    function watchOrder(id) {
      const mo = new MutationObserver(() => {
        const el = document.getElementById(id);
        if (!el) { mo.disconnect(); return; }
        const styles = [...document.querySelectorAll('head style')];
        const last = styles[styles.length - 1];
        if (styles.length > 0 && last !== el) document.head.appendChild(el);
      });
      mo.observe(document.head, { childList: true, subtree: false });
    }

    function dshWebMobilePresent() {
      return (
        document.querySelector('[data-mobile-nav]') !== null ||
        document.querySelector('style[data-plugin="dsh-web-mobile"]') !== null
      );
    }

    // ---- 侧栏开合 -----------------------------------------------------------
    // 优先驱动宿主原生开关按钮：Plugins / Automation 等面板页会令插件运行
    // 上下文失活（ctx.layout 抛 "inactive context"），宿主按钮永远可用。
    // 标签双语并列：宿主界面全量本地化（zh: 打开侧边栏 / 收起侧边栏）。
    function hostToggleSidebar(ctx) {
      // 只点宿主自己的开合按钮（精确标签，避免误中 dsh-better-sidebar 等插件的按钮）
      const btn = document.querySelector(
        'button[aria-label="Open sidebar"], button[aria-label="打开侧边栏"], ' +
        'button[aria-label="Close sidebar"], button[aria-label="Collapse sidebar"], ' +
        'button[aria-label="收起侧边栏"], button[aria-label="Expand sidebar"]'
      );
      if (btn) { btn.click(); return; }
      try { ctx.layout.toggleSidebar(); } catch (e) { console.debug('[dsh-kimi-shell] toggle failed:', e && e.message); }
    }

    // ---- 外壳 reconciler：标记帧、确保 FAB/遮罩存在 --------------------------
    // 卡死自愈（display 版）：宿主模态冻结会给侧栏列留 top 值 + 反复制造
    // CSSTransition 把列钉在"打开位"（吞点击的透明墙）。开合真源改为
    // display：collapsed → none。这里核对「属性说收起但列仍参与渲染」，
    // 或反向，发现即内联强制 + 杀动画；内联不撤防。
    function enforceSheetPosition(frame) {
      const col = frame.firstElementChild;
      if (!col || !col.isConnected) return;
      const collapsed = frame.hasAttribute('data-sidebar-collapsed');
      const force = () => {
        try { col.getAnimations().forEach((a) => a.cancel()); } catch (e) { /* noop */ }
        col.style.transition = 'none';
        col.style.animation = 'none';
        col.style.transform = 'none';
        col.style.display = collapsed ? 'none' : '';
        frame._kimiMismatchSince = 0;
      };
      const stateChanged = frame._kimiCollapsed !== undefined && frame._kimiCollapsed !== collapsed;
      frame._kimiCollapsed = collapsed;
      if (stateChanged) { force(); return; }
      const rendered = col.getClientRects().length > 0 && col.getBoundingClientRect().height > 0;
      const mismatch = collapsed ? rendered : !rendered;
      if (!mismatch) { frame._kimiMismatchSince = 0; return; }
      const now = performance.now();
      if (!frame._kimiMismatchSince) { frame._kimiMismatchSince = now; return; }
      if (now - frame._kimiMismatchSince < 300) return;
      force();
    }

    function ensureShell(ctx) {
      if (dshWebMobilePresent()) return false;
      const overlay = document.querySelector('[data-shell-overlay]');
      const frame = overlay ? overlay.parentElement : null;
      if (!frame || !frame.firstElementChild) return false;
      frame.setAttribute('data-kimi-frame', '');
      enforceSheetPosition(frame);
      if (!frame.querySelector('[data-kimi-backdrop]')) {
        const backdrop = document.createElement('div');
        backdrop.setAttribute('data-kimi-backdrop', '');
        backdrop.addEventListener('click', () => hostToggleSidebar(ctx));
        overlay.appendChild(backdrop);
      }
      if (!frame.querySelector('[data-kimi-fab]')) {
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.setAttribute('data-kimi-fab', '');
        fab.setAttribute('aria-label', '切换会话 Switch sessions');
        fab.innerHTML = FAB_SVG;
        fab.addEventListener('click', () => hostToggleSidebar(ctx));
        frame.appendChild(fab);
      }
      ensureRowMenus(ctx, frame);
      return true;
    }

    function installShell(ctx) {
      let scheduled = false;
      const run = () => { scheduled = false; ensureShell(ctx); };
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(run);
      };
      const mo = new MutationObserver(schedule);
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        // style 也要听：对话框冻结机制靠持续改写 style 制造卡死 transition
        attributeFilter: ['data-sidebar-collapsed', 'style'],
      });
      schedule();

      // 兜底巡检：卡死可能在 DOM 停止变更后残留（模态关闭、页面静置），
      // 高频核对浮层位置与 collapsed 状态是否一致（rect 读取消耗可忽略）。
      const patrol = setInterval(() => {
        const f = document.querySelector('[data-kimi-frame]');
        if (f) enforceSheetPosition(f);
      }, 300);

      // kimi 式「点行即收」：选中会话/新建会话/切面板后自动收起浮层。
      // 宿主（0.2.0）原生在窄屏不会自动收；工作区分组行（projectRow）只做
      // 展开折叠，不收。延时等宿主先处理导航；若宿主自己收了就跳过。
      // v0.5.0：项目行常显的「+ 新建会话」也纳入；v0.5.1 改结构锚定（不认
      // aria-label 文案——宿主全量本地化，中文 UI 下英文前缀匹配落空）。
      const CLOSE_ON_TAP = '[class*="sessionRow"], [class*="_newSession"], [class*="panelRow"], [class*="settingsArea"], [class*="projectRow"] [class*="rowActions"] > button';
      const onTapClose = (e) => {
        const frame = document.querySelector('[data-kimi-frame]');
        if (!frame || !frame.firstElementChild) return;
        if (!frame.firstElementChild.contains(e.target)) return;
        // v0.6.0：会话行 ⋯ 菜单按钮只开动作单，不收浮层
        if (e.target.closest && e.target.closest('[data-kimi-rowmenu]')) return;
        if (!e.target.closest(CLOSE_ON_TAP)) return;
        setTimeout(() => {
          const f = document.querySelector('[data-kimi-frame]');
          if (f && f.getAttribute('data-sidebar-collapsed') === null) {
            hostToggleSidebar(ctx);
          }
        }, 200);
      };
      document.addEventListener('click', onTapClose, true);

      return () => {
        mo.disconnect();
        clearInterval(patrol);
        document.removeEventListener('click', onTapClose, true);
      };
    }

    // ---- 输入法防误弹 -------------------------------------------------------
    function installComposerFocusGuard() {
      let suppressUntil = 0;
      let lastPtr = null;
      let lastPtrT = 0;
      const isEditable = (el) =>
        el && el.nodeType === 1 && (el.getAttribute('contenteditable') === 'true' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
      document.addEventListener('pointerdown', (e) => {
        lastPtr = e.target;
        lastPtrT = performance.now();
        const frame = document.querySelector('[data-kimi-frame]');
        if (frame && frame.firstElementChild && frame.firstElementChild.contains(e.target)) {
          suppressUntil = performance.now() + 1500;
        }
      }, true);
      document.addEventListener('focusin', (e) => {
        if (performance.now() > suppressUntil) return;
        const frame = document.querySelector('[data-kimi-frame]');
        const t = e.target;
        if (!isEditable(t)) return;
        if (frame && frame.firstElementChild && frame.firstElementChild.contains(t)) return; // 浮层内输入不拦
        if (lastPtr && lastPtrT > performance.now() - 400 && t.contains(lastPtr)) return;    // 直接点按放行
        if (frame && !frame.contains(t)) return;                                             // 只管主界面
        t.blur();
      }, true);
    }

    // ---- 会话重命名防误触（手机；v0.5.0 方案B → v0.6.1 撤长按）--------------
    // 宿主在会话标题上绑 onDoubleClick=打开重命名弹窗；桌面是刻意设计，
    // 手机上双击缩放已被 viewport 禁掉，快速两连点会真的派发 dblclick ——
    // 划列表/急点两下就误弹重命名。v0.5.0 的对策是拦双击+长按 500ms 重命名；
    // v0.6.0 行尾 ⋯ 菜单接管重命名后，长按手势冗余，v0.6.1 撤销。
    // 现在只保留：真双击（isTrusted）在 window 捕获层全拦（会话行范围）+
    // 抑制行上原生 contextmenu（防误触长按菜单）。
    function installSessionRenameGuard() {
      const rowOf = (el) =>
        el && el.closest ? el.closest('[class*="sessionRow"], [class*="searchResultRow"]') : null;

      window.addEventListener('dblclick', (e) => {
        if (!e.isTrusted) return;              // ⋯ 菜单合成的重命名事件放行
        if (!rowOf(e.target)) return;
        e.stopImmediatePropagation();
        e.preventDefault();
      }, { capture: true });

      // 抑制行上原生长按菜单/文本选择（宿主行本身 user-select:none）
      window.addEventListener('contextmenu', (e) => {
        if (rowOf(e.target)) e.preventDefault();
      }, { capture: true });
    }

    // ---- 会话行 ⋯ 菜单（kimi 式：重命名/归档/彻底删除，v0.6.0）-------------
    // 归档与删除依赖 dsh-session-recycle-bin 插件：
    //   · 归档 = 点击它注入在行内的垃圾桶按钮（[data-dsh-session-recycle-bin-delete]，
    //     :hover 门控手机不可见，JS click 照常触发）→ 完整走它的流程
    //     （API + 撤销 toast + 列表刷新）。
    //   · 彻底删除 = 先 POST /api/session-trash/archive 再 POST …/purge（与它
    //     的回收站管理器同一路由；CSRF 头 x-dsh-plugin: session-trash），
    //     随后 sessions/workspaces refresh 让行消失。
    //   · 插件不在场时菜单降级只留重命名。
    const TRASH_ROW_BTN = '[data-dsh-session-recycle-bin-delete]';
    const TRASH_API = '/api/session-trash';

    const DOTS_SVG =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

    function sessionIdOfRow(row) {
      const key = row.getAttribute('data-row-key') || '';
      return key.startsWith('session:') ? key.slice('session:'.length) : '';
    }

    function kimiToast(text) {
      document.querySelectorAll('[data-kimi-toast]').forEach((el) => el.remove());
      const el = document.createElement('div');
      el.setAttribute('data-kimi-toast', '');
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; }, 2200);
      setTimeout(() => el.remove(), 2600);
    }

    async function trashApi(path, body) {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dsh-plugin': 'session-trash' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        throw new Error((payload && payload.error && payload.error.message) || 'HTTP ' + res.status);
      }
      return payload.data;
    }

    function refreshSessionViews(ctx) {
      // 本插件未注入 sessions/workspaces 服务（注入模块名会永久 pending，见文末），
      // 此函数只是尽力而为：ctx 上有就刷，没有由调用方兜底（收浮层重开重拉）。
      try { ctx && ctx.sessions && ctx.sessions.refresh && ctx.sessions.refresh(); } catch (e) { /* noop */ }
      try {
        const w = (ctx && ctx.get && ctx.get('workspaces')) || (ctx && ctx.workspaces);
        if (w && w.refresh) w.refresh();
      } catch (e) { /* noop */ }
    }

    function closeActionSheet() {
      document.querySelectorAll('[data-kimi-action-sheet]').forEach((el) => el.remove());
    }

    function openActionSheet(ctx, row) {
      closeActionSheet();
      const title = (row.querySelector('[class*="title"]') || row).textContent.trim();
      const sessionId = sessionIdOfRow(row);
      const trashBtn = row.querySelector(TRASH_ROW_BTN);   // 回收站插件注入的行内按钮
      const canTrash = !!(trashBtn && sessionId);

      const sheet = document.createElement('div');
      sheet.setAttribute('data-kimi-action-sheet', '');
      const scrim = document.createElement('div');
      scrim.setAttribute('data-kimi-as-scrim', '');
      scrim.addEventListener('click', closeActionSheet);
      const panel = document.createElement('div');
      panel.setAttribute('data-kimi-as-panel', '');
      sheet.appendChild(scrim);
      sheet.appendChild(panel);
      document.body.appendChild(sheet);

      const titleEl = document.createElement('div');
      titleEl.setAttribute('data-kimi-as-title', '');
      titleEl.textContent = title || '会话 Session';
      panel.appendChild(titleEl);

      const mkItem = (label, fn, danger) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-kimi-as-item', '');
        if (danger) b.setAttribute('data-danger', '');
        b.textContent = label;
        b.addEventListener('click', fn);
        panel.appendChild(b);
        return b;
      };

      // 重命名：走既有长按合成 dblclick 通道（宿主原生弹窗）
      mkItem('重命名 Rename', () => {
        closeActionSheet();
        const t = row.isConnected ? row.querySelector('[class*="title"]') : null;
        if (t) t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      });

      // 取消（点遮罩亦可）
      const mkCancel = () => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-kimi-as-item', '');
        b.style.opacity = '0.6';
        b.textContent = '取消 Cancel';
        b.addEventListener('click', closeActionSheet);
        panel.appendChild(b);
      };

      if (canTrash) {
        // 归档 = 移入回收站（可还原）：交给回收站插件自身的行按钮流程（含撤销 toast）
        mkItem('归档（入回收站，可还原）Archive', () => {
          closeActionSheet();
          trashBtn.click();
        });

        // 彻底删除：面板内二次确认 → archive + purge
        mkItem('彻底删除 Delete permanently', () => {
          panel.textContent = '';
          const t = document.createElement('div');
          t.setAttribute('data-kimi-as-title', '');
          t.textContent = title || sessionId;
          const note = document.createElement('div');
          note.setAttribute('data-kimi-as-note', '');
          note.textContent = '将彻底删除该会话，聊天记录会从磁盘清除，不可恢复。';
          const rowEl = document.createElement('div');
          rowEl.setAttribute('data-kimi-as-row', '');
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = '取消';
          cancel.addEventListener('click', closeActionSheet);
          const confirm = document.createElement('button');
          confirm.type = 'button';
          confirm.textContent = '彻底删除';
          confirm.setAttribute('data-danger', '');
          confirm.style.background = '#e5484d';
          confirm.style.color = '#fff';
          confirm.addEventListener('click', async () => {
            confirm.disabled = true;
            confirm.textContent = '删除中…';
            try {
              await trashApi(TRASH_API + '/archive', { sessionId, title });
              try {
                await trashApi(TRASH_API + '/purge', { sessionIds: [sessionId] });
                kimiToast('已彻底删除会话');
              } catch (err) {
                kimiToast('已移入回收站，但彻底删除失败：' + err.message);
              }
            } catch (err) {
              kimiToast('删除失败：' + err.message);
            }
            closeActionSheet();
            // 无 ctx.sessions 可刷新：收起浮层（SessionTree 卸载退订），
            // 下次展开即重新拉取最新列表。
            setTimeout(() => {
              const f = document.querySelector('[data-kimi-frame]');
              if (f && f.getAttribute('data-sidebar-collapsed') === null) hostToggleSidebar(ctx);
            }, 250);
          });
          rowEl.appendChild(cancel);
          rowEl.appendChild(confirm);
          panel.appendChild(t);
          panel.appendChild(note);
          panel.appendChild(rowEl);
        });
      }
      mkCancel();
    }

    // 行尾常显 ⋯ 按钮（reconciler：React 重渲染会丢弃，随 ensureShell 补挂）
    function ensureRowMenus(ctx, frame) {
      const col = frame.firstElementChild;
      if (!col) return;
      const rows = col.querySelectorAll('[class*="sessionRow"]');
      for (const row of rows) {
        if (row.querySelector(':scope > [data-kimi-rowmenu]')) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-kimi-rowmenu', '');
        btn.setAttribute('aria-label', '会话操作 Session actions');
        btn.innerHTML = DOTS_SVG;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openActionSheet(ctx, row);
        });
        row.appendChild(btn);
      }
    }

    // ---- 手机默认浅色主题 ---------------------------------------------------
    function applyThemeDefault(ctx) {
      if (!window.matchMedia(MQ).matches) return; // 仅真移动条件；TEST 不触发
      try {
        const theme = ctx.theme;
        if (!theme || typeof theme.getTheme !== 'function' || typeof theme.setTheme !== 'function') return;
        if (theme.getTheme().preference === 'system') theme.setTheme('light');
      } catch (e) {
        console.debug('[dsh-kimi-shell] theme default skipped:', e && e.message);
      }
    }

    // ---- viewport meta ------------------------------------------------------
    function ensureViewportMeta() {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content');
    }

    // ---- 头部切换按钮（slot 注入，左上角紧挨标题；不可见时 FAB 兜底）---------
    function installHeaderToggle(ctx) {
      try {
        const React = require('react');
        const h = React.createElement;
        const Toggle = function (props) {
          const ref = React.useRef(null);
          React.useEffect(function () {
            const el = ref.current;
            const html = document.documentElement;
            const apply = function () {
              // 可点性探测：不仅要有尺寸，还不能被盖住（多标签时宿主的
              // 标签条会压在 slot 按钮上方；被盖住时撤标记，露出 FAB 兜底）
              let reachable = false;
              if (el && el.offsetWidth > 0 && el.getClientRects().length > 0) {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                reachable = !!hit && (hit === el || el.contains(hit));
              }
              if (reachable) {
                html.setAttribute('data-kimi-header-btn', '1');
              } else {
                html.removeAttribute('data-kimi-header-btn');
              }
            };
            apply();
            const t = setInterval(apply, 1000);
            return function () { clearInterval(t); html.removeAttribute('data-kimi-header-btn'); };
          }, []);
          return h('button', {
            ref: ref,
            type: 'button',
            'aria-label': '切换会话 Switch sessions',
            'data-kimi-header-btn': '',
            onClick: function () { hostToggleSidebar(props.ctx); },
          }, h('svg', {
            width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true,
          },
            h('line', { x1: 4, y1: 7, x2: 20, y2: 7 }),
            h('line', { x1: 4, y1: 12, x2: 20, y2: 12 }),
            h('line', { x1: 4, y1: 17, x2: 14, y2: 17 })));
        };
        ctx.slots.inject('conversation.header.leading', function () {
          return ctx.slots.register(
            { name: 'conversation.header.leading', id: 'dsh-kimi-shell', order: 20 },
            function () { return h(Toggle, { ctx: ctx }); }
          );
        });
        return true;
      } catch (e) {
        console.debug('[dsh-kimi-shell] header toggle unavailable:', e && e.message);
        return false;
      }
    }

    // ---- 装载 ---------------------------------------------------------------
    function readFlag(name) {
      const q = new URLSearchParams(location.search);
      if (q.has(name)) return q.get(name);
      const h = new URLSearchParams(location.hash.replace(/^#/, ''));
      if (h.has(name)) return h.get(name);
      return null;
    }

    function mount(ctx) {
      const flag = readFlag('kimi-test');
      let TEST;
      if (flag !== null) {
        TEST = flag !== '0';
        if (!TEST) sessionStorage.removeItem('kimi-test');
      } else {
        TEST = sessionStorage.getItem('kimi-test') === '1';
      }
      const mobile = () => TEST || window.matchMedia(MQ).matches;

      if (TEST) {
        document.documentElement.dataset.kimiTest = '1';
        sessionStorage.setItem('kimi-test', '1');
        ensureStyle(TEST_STYLE_ID, RULES);
        watchOrder(TEST_STYLE_ID);
      } else {
        sessionStorage.removeItem('kimi-test');
        ensureStyle(STYLE_ID, `@media ${MQ} {\n${RULES}\n}`);
        watchOrder(STYLE_ID);
      }

      if (dshWebMobilePresent()) {
        console.info('[dsh-kimi-shell] dormant: dsh-web-mobile 在场，本插件休眠以避免双壳冲突；卸载后者后自动接管。');
        return;
      }

      if (mobile()) {
        ensureViewportMeta();
        installHeaderToggle(ctx);
        ctx.effect(() => installShell(ctx), 'dsh-kimi-shell: shell');
        ctx.effect(() => { installComposerFocusGuard(); }, 'dsh-kimi-shell: composer focus guard');
        ctx.effect(() => { installSessionRenameGuard(); }, 'dsh-kimi-shell: session rename guard');
      }
      applyThemeDefault(ctx);
    }

    function apply(ctx) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => mount(ctx), { once: true });
      } else {
        mount(ctx);
      }
    }

    // 0.2.0 起服务必须显式声明注入（loader 会等待这些 provide 后才调 apply）。
    // ⚠ 只能用真实存在的服务名：v0.6.0 试过注入模块名
    // '@deepseek-ai/dsh-client-ui-conversation'（模仿 recycle-bin）→ 永久
    // pending（"waiting for service"），整个壳挂掉。ctx.sessions 因此不可用，
    // 彻底删除后的列表刷新退化为收浮层（SessionTree 卸载即退订，重开重拉）。
    return { inject: ['layout', 'theme', 'slots'], apply };
  },
});
