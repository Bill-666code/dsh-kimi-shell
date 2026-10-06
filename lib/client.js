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
 *  7. 会话重命名防误触：真双击全拦，长按 500ms 唤起宿主原生重命名弹窗
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

    // ---- 会话重命名防误触（手机，v0.5.0 方案B）-----------------------------
    // 宿主在会话标题上绑 onDoubleClick=打开重命名弹窗；桌面是刻意设计，
    // 手机上双击缩放已被 viewport 禁掉，快速两连点会真的派发 dblclick ——
    // 划列表/急点两下就误弹重命名。对策：
    //   1) 真双击（isTrusted）在 window 捕获层全拦（仅会话行范围）；
    //   2) 长按 500ms → 在标题上合成 dblclick（isTrusted=false，放行）
    //      唤起宿主原生重命名弹窗 + 短震动反馈；
    //   3) 长按触发后的抬指 click 吞掉（不切会话、不收浮层）；
    //   4) 抑制长按期间的原生 contextmenu/文本选择。
    function installSessionRenameGuard() {
      const rowOf = (el) =>
        el && el.closest ? el.closest('[class*="sessionRow"], [class*="searchResultRow"]') : null;

      window.addEventListener('dblclick', (e) => {
        if (!e.isTrusted) return;              // 自己合成的长按事件放行
        if (!rowOf(e.target)) return;
        e.stopImmediatePropagation();
        e.preventDefault();
      }, { capture: true });

      let pending = null;                       // { timer, row, x, y, id }
      let suppressUntil = 0;                    // 长按触发后吞掉抬指 click 的窗口
      let suppressRow = null;

      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch' || pending) return;
        const row = rowOf(e.target);
        if (!row) return;
        pending = {
          row,
          x: e.clientX,
          y: e.clientY,
          id: e.pointerId,
          timer: setTimeout(() => {
            const r = pending && pending.row;
            pending = null;
            if (!r || !r.isConnected) return;
            suppressUntil = performance.now() + 800;
            suppressRow = r;
            try { navigator.vibrate && navigator.vibrate(12); } catch (err) { /* noop */ }
            const title = r.querySelector('[class*="title"]');
            if (title) title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
          }, 500),
        };
      }, { capture: true });

      const cancel = (e) => {
        if (!pending || (e.pointerId !== undefined && e.pointerId !== pending.id)) return;
        clearTimeout(pending.timer);
        pending = null;
      };
      window.addEventListener('pointermove', (e) => {
        if (!pending) return;
        // 移动超阈值 = 滚动意图，取消长按
        if (Math.abs(e.clientX - pending.x) > 12 || Math.abs(e.clientY - pending.y) > 12) cancel(e);
      }, { capture: true });
      window.addEventListener('pointerup', cancel, { capture: true });
      window.addEventListener('pointercancel', cancel, { capture: true });

      // 长按唤起弹窗后，抬指产生的原生 click 不该切会话/收浮层
      // （window 捕获先于 document，可一并挡掉本插件的 onTapClose）
      window.addEventListener('click', (e) => {
        if (performance.now() > suppressUntil) return;
        if (!suppressRow || !suppressRow.contains(e.target)) return;
        e.stopImmediatePropagation();
        e.preventDefault();
      }, { capture: true });

      // 长按期间抑制原生文本选择/长按菜单（宿主行本身 user-select:none）
      window.addEventListener('contextmenu', (e) => {
        if (rowOf(e.target)) e.preventDefault();
      }, { capture: true });
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

    // 0.2.0 起服务必须显式声明注入（loader 会等待这些 provide 后才调 apply）
    return { inject: ['layout', 'theme', 'slots'], apply };
  },
});
