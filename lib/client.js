/**
 * dsh-kimi-shell — 把 dsh-web-mobile 的左侧会话抽屉改成 kimi 风格底部浮层。
 *
 * 只在 dsh-web-mobile 同款条件下生效：(max-width: 1023px) and (pointer: coarse)。
 * 桌面端（鼠标指针）任何窗口宽度都不匹配，零影响。
 * 不写宿主半逻辑、不 patch 任何组件；纯 CSS 注入 + 测试通道。
 *
 * 测试通道：URL 加 ?kimi-test=1 ——
 *   1) 骗过 dsh-web-mobile 的 JS 门控（matchMedia 强制 matches）；
 *   2) 复制其样式表、把移动 media query 改写成无条件命中后注入副本（不动原表）；
 *   3) 本插件 CSS 去 media 包装直接生效。
 *   用于无触摸仿真的测试浏览器；生产路径完全走不到这些代码。
 */
window.__ModuleLoader__.load({
  id: 'dsh-kimi-shell',
  factory() {
    const STYLE_ID = 'dsh-kimi-shell-style';
    const TEST_STYLE_ID = 'dsh-kimi-shell-test-style';
    const MQ = '(max-width: 1023px) and (pointer: coarse)';

    // ---- 核心规则（生产态包在 MQ 里；测试态裸注入）--------------------------
    // 特异性说明：所有列级选择器双写 [data-mobile-nav="frame"]，
    // (0,3,0)/(0,4,0) 对 dsh-web-mobile 同目标规则的 (0,2,0)/(0,3,0) 稳赢，
    // 与样式表插入顺序无关；辅以 head 末尾重排作双保险。
    const RULES = `
/* ===== 1. 侧栏列 → 底部浮层盒子（开合两态同盒）===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child {
  top: auto !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: 82vh !important;
  height: 82dvh !important;
  max-height: 82dvh !important;
  border-radius: 14px 14px 0 0 !important;
  box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.28) !important;
  overflow: hidden !important;
  padding-top: 0 !important;
}

/* ===== 2. 开合方向 translateX → translateY ===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"][data-sidebar-collapsed] > :first-child {
  transform: translateY(110%) !important;
}
[data-mobile-nav="frame"][data-mobile-nav="frame"]:not([data-sidebar-collapsed]) > :first-child {
  transform: translateY(0) !important;
}

/* 上滑动画（kimi sheet 曲线） */
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0.24, 1) !important;
}

/* ===== 3. 抓手 ===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child::before {
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

/* ===== 4. 内层铺满整宽（列下有 display:contents 包装层，锤四代）+ 抓手让位 =====
   注意：抓手留白放在内层第一实盒（真实表面色），不放列上——列自身是白底，
   放列上会露出一条白边。列背景透明，由内层表面负责涂色。 */
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child {
  padding-top: 0 !important;
  background: transparent !important;
}
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * {
  padding-top: 20px;
  min-height: 100%;
  box-sizing: border-box;
}
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > * > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > * > * > * {
  box-sizing: border-box;
}
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > * > *,
[data-mobile-nav="frame"][data-mobile-nav="frame"] > :first-child > * > * > * > * {
  width: 100% !important;
  max-width: 100% !important;
}

/* ===== 5. 隐藏品牌行（kimi sheet 无 logo）===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"] [class*="_logoRow"] {
  display: none !important;
}

/* ===== 6. 工作区分组 → 紧凑小节头 ===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"] [class*="_projectRow"] {
  min-height: 28px !important;
  font-size: 12px;
  opacity: 0.62;
}

/* ===== 7. 会话行 → 44px 触屏目标 ===== */
[data-mobile-nav="frame"][data-mobile-nav="frame"] [class*="sessionRow"] {
  min-height: 44px;
}
`;

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

    // 保持自己的表位于 head 末尾（对无 !important 的规则保级联胜出）
    function watchOrder(id) {
      const mo = new MutationObserver(() => {
        const el = document.getElementById(id);
        if (!el) { mo.disconnect(); return; }
        const styles = [...document.querySelectorAll('head style')];
        if (styles.length && styles[styles.length - 1] !== el) el.remove(), document.head.appendChild(el);
      });
      mo.observe(document.head, { childList: true, subtree: false });
    }

    // ---- 测试通道 ----------------------------------------------------------
    function patchMatchMediaForTheirGates() {
      const orig = window.matchMedia.bind(window);
      window.matchMedia = (q) => {
        const m = orig(typeof q === 'string' ? q : String(q));
        if (typeof q === 'string' && q.includes('pointer: coarse') && q.includes('max-width')) {
          return new Proxy(m, {
            get(t, k) {
              if (k === 'matches') return true;
              const v = t[k];
              return typeof v === 'function' ? v.bind(t) : v;
            },
          });
        }
        return m;
      };
    }

    // 复制 dsh-web-mobile 的样式表，改写移动 media query 后注入副本（原表不动）。
    // 自愈式：按源表长度签名配对，副本被删会自动补回（每次 head 变动 + 每 2s）。
    const THEIR_SELECTOR = 'style[data-plugin="dsh-web-mobile"]';
    function rewriteMedia(text) {
      return text
        .replace(/\(max-width:\s*1023px\)\s*and\s*\(pointer:\s*coarse\)/g, '(min-width: 0)')
        .replace(/\(max-width:\s*767px\)\s*and\s*\(pointer:\s*coarse\)/g, '(min-width: 0)')
        .replace(/\(hover:\s*none\),\s*\(pointer:\s*coarse\)/g, '(min-width: 0)');
    }
    function activateTheirMobileCss() {
      document.querySelectorAll(THEIR_SELECTOR).forEach((st) => {
        const len = String(st.textContent.length);
        if (!st.dataset.kimiSig) st.dataset.kimiSig = len;
        const sig = st.dataset.kimiSig;
        let copy = document.querySelector(`style[data-kimi-copy-of="${sig}"]`);
        if (copy && copy.dataset.kimiLen === len) return; // 副本健在
        if (copy) copy.remove();
        copy = document.createElement('style');
        copy.dataset.plugin = 'dsh-kimi-shell';
        copy.dataset.kimiCopyOf = sig;
        copy.dataset.kimiLen = len;
        copy.textContent = rewriteMedia(st.textContent);
        document.head.appendChild(copy);
      });
    }

    // ---- 动画改道器 ----------------------------------------------------
    // dsh-web-mobile 的开/关序章是 JS 内联 translateX 动画（inline !important，
    // 样式表压不住）。列变成底部浮层后，左滑→必须变成下滑。
    // 策略：MutationObserver 盯列的 style，每写一帧 translateX(e)，
    // 同步改写成等进度的 translateY（微任务时机在渲染前，不闪帧）。
    // 它的收尾（transitionend / 超时后翻转 data-sidebar-collapsed、清内联）
    // 不受影响；内联清除后由本插件的 CSS 规则接管，位置本就一致，无二段跳。
    function installTransformRedirect(getCol) {
      let observed = null;
      let mo = null;
      function parseTx(v, el) {
        v = String(v || '').trim();
        let mm;
        if ((mm = /^matrix\(([^)]+)\)$/.exec(v)) || (mm = /^matrix3d\(([^)]+)\)$/.exec(v))) {
          const n = mm[1].split(',').map(Number);
          return n.length >= 6 ? n[4] : 0;
        }
        if ((mm = /translateX\(\s*(-?[\d.]+)\s*(%|px)?\s*\)/.exec(v))) {
          const val = parseFloat(mm[1]);
          const unit = mm[2] || 'px';
          return unit === '%' ? (val / 100) * el.offsetWidth : val;
        }
        return 0;
      }
      function rewrite() {
        const col = observed;
        if (!col || !col.isConnected) return;
        const v = col.style.getPropertyValue('transform');
        if (!v || v === 'none') return;
        const tx = parseTx(v, col);
        if (Math.abs(tx) < 0.5) return; // 无横向分量不动（含本函数自己的改写）
        const w = col.offsetWidth || 1;
        const h = col.offsetHeight || 1;
        const p = Math.min(1.2, Math.abs(tx) / (w * 1.1)); // 关闭进度 0→1.1
        const y = p * h * 1.1;
        col.style.setProperty('transform', 'translateY(' + y.toFixed(1) + 'px)', 'important');
      }
      function attach() {
        const col = getCol();
        if (!col || col === observed) return;
        if (mo) mo.disconnect();
        observed = col;
        mo = new MutationObserver(rewrite);
        mo.observe(col, { attributes: true, attributeFilter: ['style'] });
        rewrite();
      }
      attach();
      setInterval(attach, 1000); // 宿主重渲染换节点时重挂
      return function dispose() { if (mo) mo.disconnect(); };
    }

    function frameCol() {
      const f = document.querySelector('[data-mobile-nav="frame"]');
      return f ? f.firstElementChild : null;
    }

    // ---- 输入法防误弹 ----------------------------------------------------
    // 宿主在切换/新建会话后会把焦点交给 composer（桌面习惯）。实测它不走
    // HTMLElement.prototype.focus（插桩 0 调用、activeElement 却是输入框），
    // 走的是挂载期原生 autofocus 类路径——原型补丁拦不住，改用 focusin 捕获。
    // 规则（kimi 同款哲学）：从浮层内按下指针起 1.5s 内，主会话区的可编辑框
    // 获得焦点一律立即 blur；直接点输入框不受影响（那不是本窗口触发的 focusin
    // 之外的场景——原生点按聚焦同样会过 focusin，但窗口已过期故放行）。
    // 浮层内部（如会话重命名输入）按包含关系排除，不拦。
    function installComposerFocusGuard(getCol) {
      let suppressUntil = 0;
      let lastPtr = null;
      let lastPtrT = 0;
      const isEditable = (el) =>
        el && el.nodeType === 1 && (el.getAttribute('contenteditable') === 'true' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
      document.addEventListener('pointerdown', (e) => {
        lastPtr = e.target;
        lastPtrT = performance.now();
        const col = getCol();
        if (col && col.contains(e.target)) suppressUntil = performance.now() + 1500;
      }, true);
      document.addEventListener('focusin', (e) => {
        if (performance.now() > suppressUntil) return;
        const col = getCol();
        const t = e.target;
        if (!isEditable(t)) return;
        if (col && col.contains(t)) return; // 浮层内的输入（重命名等）不拦
        // 窗口内用户直接点了这个编辑框 → 放行（选完会话立刻打字的场景）
        if (lastPtr && lastPtrT > performance.now() - 400 && t.contains(lastPtr)) return;
        const frame = document.querySelector('[data-mobile-nav="frame"]');
        if (frame && !frame.contains(t)) return; // 只管主界面
        t.blur();
      }, true);
    }

    // ---- 装载 --------------------------------------------------------------
    // 注意：宿主启动后会清掉 URL query（token 消费后 replaceState），
    // 所以 ?kimi-test=1 只在首帧可见；hash 与 sessionStorage 作为主要通道。
    function readFlag(name) {
      const q = new URLSearchParams(location.search);
      if (q.has(name)) return q.get(name);
      const h = new URLSearchParams(location.hash.replace(/^#/, ''));
      if (h.has(name)) return h.get(name);
      return null;
    }
    const flag = readFlag('kimi-test');
    let TEST;
    if (flag !== null) {
      TEST = flag !== '0';
      if (!TEST) sessionStorage.removeItem('kimi-test'); // 逃生口
    } else {
      TEST = sessionStorage.getItem('kimi-test') === '1';
    }

    function mount() {
      if (TEST) {
        document.documentElement.dataset.kimiTest = '1';
        sessionStorage.setItem('kimi-test', '1');
        patchMatchMediaForTheirGates();
        activateTheirMobileCss();
        new MutationObserver(activateTheirMobileCss).observe(document.head, { childList: true, subtree: false });
        setInterval(activateTheirMobileCss, 2000); // 自愈：副本被外部删除时补回
        ensureStyle(TEST_STYLE_ID, RULES);
        watchOrder(TEST_STYLE_ID);
      } else {
        sessionStorage.removeItem('kimi-test');
        ensureStyle(STYLE_ID, `@media ${MQ} {\n${RULES}\n}`);
        watchOrder(STYLE_ID);
      }
      // 动画改道器 + 输入法防误弹：仅移动条件（桌面 matchMedia 不匹配即跳过；测试态已被补丁强制匹配）
      if (TEST || window.matchMedia(MQ).matches) {
        installTransformRedirect(frameCol);
        installComposerFocusGuard(frameCol);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }

    return { inject: [], apply() {} };
  },
});
