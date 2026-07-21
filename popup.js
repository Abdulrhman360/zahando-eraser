// All DOM interaction here — NO inline handlers in HTML (Chrome CSP blocks them)
document.addEventListener('DOMContentLoaded', () => {
  const btn          = document.getElementById('toggleBtn');
  const statusLabel  = document.getElementById('statusLabel');
  const totalCount   = document.getElementById('totalCount');
  const sessionCount = document.getElementById('sessionCount');

  let currentTabId = null;

  // ── Load state for the current tab ─────────────────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    currentTabId = tab.id;

    chrome.storage.local.get(['zahando_active', 'zahando_total', 'zahando_session'], (data) => {
      const active  = data['zahando_active']  || false;
      const total   = data['zahando_total']   || 0;
      const session = data['zahando_session'] || 0;
      setUI(active);
      totalCount.textContent   = total;
      sessionCount.textContent = session;
    });
  });

  // ── Toggle on button click ──────────────────────────────────────────────────
  btn.addEventListener('click', () => {
    if (currentTabId === null) return;

    chrome.storage.local.get(['zahando_active'], (data) => {
      const wasActive = data['zahando_active'] || false;
      const nowActive = !wasActive;

      chrome.storage.local.set({ zahando_active: nowActive });
      setUI(nowActive);

      // Inject content script if not already there, then send toggle message
      chrome.scripting.executeScript(
        { target: { tabId: currentTabId }, files: ['content.js'] },
        () => {
          // Ignore "already injected" errors
          chrome.runtime.lastError;
          chrome.tabs.sendMessage(currentTabId, {
            type: 'ZAHANDO_TOGGLE',
            active: nowActive
          }, () => {
            chrome.runtime.lastError; // suppress "no receiver" errors
          });
        }
      );
    });
  });

  // ── Listen for erase count updates from content script ─────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ZAHANDO_ERASED') {
      totalCount.textContent   = msg.total;
      sessionCount.textContent = msg.session;
    }
  });

  // ── UI state helper ─────────────────────────────────────────────────────────
  function setUI(active) {
    if (active) {
      btn.textContent = '🖐  STAND: ACTIVE';
      btn.classList.add('active');
      statusLabel.textContent = '● ERASURE MODE ON';
      statusLabel.className   = 'status on';
    } else {
      btn.textContent = '✋  ACTIVATE STAND';
      btn.classList.remove('active');
      statusLabel.textContent = '● STAND DORMANT';
      statusLabel.className   = 'status off';
    }
  }
});
