if (typeof window.__ZAHANDO_LOADED__ === 'undefined') {
  window.__ZAHANDO_LOADED__ = true;

  let isActive      = false;
  let hoveredEl     = null;
  let sessionErased = 0;
  let sfxIndex      = 0;
  const sfxFiles    = ['sfx1.mp3', 'sfx2.mp3', 'sfx3.mp3'];
  // Preload all 3 audio objects
  const sfxAudio    = sfxFiles.map(f => {
    const a = new Audio(chrome.runtime.getURL(f));
    a.volume = 0.9;
    return a;
  });

  // ── Play next SFX in cycle ──────────────────────────────────────────────────
  function playSound() {
    try {
      const a = sfxAudio[sfxIndex % 3];
      sfxIndex++;
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (_) {}
  }

  // ── Inject styles once ─────────────────────────────────────────────────────
  if (!document.getElementById('__zahando_style__')) {
    const s = document.createElement('style');
    s.id = '__zahando_style__';
    s.textContent = `
      #__zahando_overlay__ {
        position: fixed !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        border: 2px solid #2980ff !important;
        background: rgba(41,128,255,0.07) !important;
        box-shadow: 0 0 0 3px rgba(41,128,255,0.2) !important;
        border-radius: 3px !important;
        display: none !important;
        transition: top .05s, left .05s, width .05s, height .05s !important;
      }
      #__zahando_banner__ {
        position: fixed !important;
        top: 14px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        background: #020d1f !important;
        border: 2px solid #2980ff !important;
        color: #4d9fff !important;
        font-family: Impact, 'Arial Black', sans-serif !important;
        font-size: 15px !important;
        letter-spacing: 0.12em !important;
        padding: 7px 22px !important;
        display: none !important;
        white-space: nowrap !important;
        clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%) !important;
        animation: __zh_glow__ 1.6s infinite !important;
      }
      @keyframes __zh_glow__ {
        0%,100% { box-shadow: 0 0 12px rgba(41,128,255,0.35); }
        50%      { box-shadow: 0 0 26px rgba(41,128,255,0.8); }
      }
      @keyframes __zh_erase__ {
        0%   { opacity:1; transform:scale(1);      filter:brightness(1); }
        30%  { opacity:1; transform:scale(1.02);   filter:brightness(2) saturate(0) hue-rotate(200deg); }
        60%  { opacity:0.4; transform:scale(0.97); filter:brightness(4) saturate(0) blur(1px); }
        100% { opacity:0; transform:scale(0.85);   filter:brightness(8) blur(4px); }
      }
      @keyframes __zh_particle__ {
        to { opacity:0; transform: translate(var(--tx),var(--ty)) scale(0) rotate(var(--tr)); }
      }
    `;
    document.documentElement.appendChild(s);
  }

  // ── Overlay ────────────────────────────────────────────────────────────────
  let overlay = document.getElementById('__zahando_overlay__');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__zahando_overlay__';
    document.documentElement.appendChild(overlay);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  let banner = document.getElementById('__zahando_banner__');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = '__zahando_banner__';
    banner.textContent = '✋  ZA HANDO — ERASER ACTIVE';
    document.documentElement.appendChild(banner);
  }

  // ── FX container ───────────────────────────────────────────────────────────
  let fx = document.getElementById('__zahando_fx__');
  if (!fx) {
    fx = document.createElement('div');
    fx.id = '__zahando_fx__';
    fx.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483645;overflow:hidden;';
    document.documentElement.appendChild(fx);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const IGNORED = new Set(['__zahando_overlay__','__zahando_banner__','__zahando_fx__','__zahando_style__']);

  function isSafe(el) {
    return el && el !== document.body && el !== document.documentElement && !IGNORED.has(el.id);
  }

  function positionOverlay(el) {
    if (!isSafe(el)) { overlay.style.setProperty('display','none','important'); return; }
    const r = el.getBoundingClientRect();
    overlay.style.setProperty('display','block','important');
    overlay.style.setProperty('left',  r.left   + 'px','important');
    overlay.style.setProperty('top',   r.top    + 'px','important');
    overlay.style.setProperty('width', r.width  + 'px','important');
    overlay.style.setProperty('height',r.height + 'px','important');
  }

  // ── Subtle blue particle burst (no text popup) ─────────────────────────────
  function spawnEffects(rect) {
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    // Small particles only — functional, not dramatic
    for (let i = 0; i < 16; i++) {
      const p   = document.createElement('div');
      const ang = (i / 16) * 360 + (Math.random() - 0.5) * 15;
      const d   = 30 + Math.random() * 60;
      const sz  = 3 + Math.random() * 5;
      const clr = ['#2980ff','#4d9fff','#a8d0ff','#ffffff','#1a4fa8'][i % 5];
      p.style.cssText = `
        position:fixed; left:${cx}px; top:${cy}px;
        width:${sz}px; height:${sz}px;
        background:${clr};
        border-radius:50%;
        --tx:${Math.cos(ang*Math.PI/180)*d}px;
        --ty:${Math.sin(ang*Math.PI/180)*d}px;
        --tr:${(Math.random()-0.5)*360}deg;
        animation:__zh_particle__ 0.45s ease-out forwards;
        pointer-events:none;
        z-index:2147483646;
      `;
      fx.appendChild(p);
      setTimeout(() => p.remove(), 500);
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  function onMouseMove(e) {
    hoveredEl = e.target;
    positionOverlay(hoveredEl);
  }

  function onClick(e) {
    if (!isSafe(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const el   = e.target;
    const rect = el.getBoundingClientRect();

    playSound();
    overlay.style.setProperty('display','none','important');

    el.style.animation       = '__zh_erase__ 0.4s ease-out forwards';
    el.style.transformOrigin = 'center center';
    el.style.pointerEvents   = 'none';
    spawnEffects(rect);

    setTimeout(() => el.remove(), 390);

    sessionErased++;
    chrome.storage.local.get(['zahando_total'], (data) => {
      const total = (data['zahando_total'] || 0) + 1;
      chrome.storage.local.set({ zahando_total: total, zahando_session: sessionErased });
      chrome.runtime.sendMessage({ type: 'ZAHANDO_ERASED', total, session: sessionErased }).catch(() => {});
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') deactivate();
  }

  // ── Activate / Deactivate ──────────────────────────────────────────────────
  function activate() {
    isActive = true;
    document.body.style.setProperty('cursor', 'crosshair', 'important');
    banner.style.setProperty('display','block','important');
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click',     onClick,     true);
    document.addEventListener('keydown',   onKeyDown,   true);
  }

  function deactivate() {
    isActive = false;
    document.body.style.removeProperty('cursor');
    banner.style.setProperty('display','none','important');
    overlay.style.setProperty('display','none','important');
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click',     onClick,     true);
    document.removeEventListener('keydown',   onKeyDown,   true);
    chrome.storage.local.set({ zahando_active: false });
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'ZAHANDO_TOGGLE') {
      msg.active ? activate() : deactivate();
      sendResponse({ ok: true });
    }
  });

  // ── Restore on page load ───────────────────────────────────────────────────
  chrome.storage.local.get(['zahando_active'], (data) => {
    if (data['zahando_active']) activate();
  });
}
