// Posição vertical compartilhada dos atalhos, WhatsApp e e-mail.
(function () {
  "use strict";
  if (window.__pdpButtonDrag) return;
  window.__pdpButtonDrag = true;
  const style = document.createElement("style");
  style.textContent = "#pdp-wa-launcher[data-pdp-movable], .pdp-email-visible[data-pdp-movable], #pdp-qa-row[data-pdp-movable] { bottom: auto !important; }";
  style.textContent += "html[data-pdp-buttons-hidden] #pdp-wa-launcher, html[data-pdp-buttons-hidden] .pdp-email-visible, html[data-pdp-buttons-hidden] #pdp-qa-row { visibility: hidden !important; pointer-events: none !important; }";
  document.documentElement.appendChild(style);
  const KEY = "pdpButtonsTop";
  const HIDDEN_KEY = "pdpButtonsHidden";
  let buttonsHidden = false;
  let toggle = null;
  const MARGIN = 8;
  let preferredTop = null;
  let loaded = false;
  let handle = null;
  let drag = null;
  let scheduled = false;
  let saveQueue = Promise.resolve();

  function save() {
    const value = preferredTop;
    saveQueue = saveQueue.then(() => chrome.storage.local.set({ [KEY]: value }))
      .catch(error => console.error("[Projudi] Não foi possível salvar a posição dos botões:", error));
  }

  function applyVisibility() {
    document.documentElement.toggleAttribute("data-pdp-buttons-hidden", buttonsHidden);
    if (toggle) {
      const label = buttonsHidden ? "Mostrar opções" : "Ocultar opções";
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.setAttribute("aria-expanded", String(!buttonsHidden));
      toggle.title = buttonsHidden ? "Mostrar todos os botões da extensão" : "Ocultar todos os botões da extensão";
    }
    if (buttonsHidden) window.dispatchEvent(new Event("pdp-buttons-hide"));
  }

  function layout() {
    scheduled = false;
    if (!loaded) return;
    const emails = Array.from(document.querySelectorAll(".pdp-email-visible"))
      .filter(el => el.getClientRects().length && getComputedStyle(el).display !== "none");
    const peers = Array.from(document.querySelectorAll("#pdp-wa-launcher, #pdp-qa-row"))
      .filter(el => el.getClientRects().length && getComputedStyle(el).display !== "none");
    if (!emails.length && !peers.length) {
      if (handle) handle.hidden = true;
      if (toggle) toggle.hidden = true;
      return;
    }
    if (!handle || !handle.isConnected) {
      handle = document.createElement("button");
      handle.type = "button";
      handle.id = "pdp-buttons-drag";
      handle.textContent = "↕ Mover botões";
      handle.title = "Arraste para cima ou para baixo. Use também as setas do teclado.";
      handle.style.cssText = "position:fixed;right:12px;z-index:2147483647;height:24px;padding:2px 8px;border:1px solid #aaa;border-radius:4px;background:#fff;color:#333;font:12px Arial;cursor:ns-resize;touch-action:none;user-select:none;";
      handle.addEventListener("pointerdown", event => {
        if (event.button !== 0 || drag) return;
        event.preventDefault();
        drag = { id: event.pointerId, y: event.clientY, top: parseFloat(handle.style.top) };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", event => {
        if (!drag || drag.id !== event.pointerId) return;
        preferredTop = drag.top + event.clientY - drag.y;
        layout();
      });
      function finish(event) {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        preferredTop = parseFloat(handle.style.top);
        save();
      }
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
      handle.addEventListener("lostpointercapture", finish);
      handle.addEventListener("keydown", event => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        preferredTop = parseFloat(handle.style.top) + (event.key === "ArrowUp" ? -1 : 1) * (event.shiftKey ? 1 : 10);
        layout();
        preferredTop = parseFloat(handle.style.top);
        save();
      });
      document.body.appendChild(handle);
    }
    if (!toggle || !toggle.isConnected) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.id = "pdp-buttons-toggle";
      toggle.style.cssText = "position:fixed;z-index:2147483647;height:24px;padding:2px 8px;border:1px solid #aaa;border-radius:4px;background:#fff;color:#333;font:12px Arial;cursor:pointer;";
      toggle.addEventListener("click", () => {
        buttonsHidden = !buttonsHidden;
        applyVisibility();
        const value = buttonsHidden;
        saveQueue = saveQueue.then(() => chrome.storage.local.set({ [HIDDEN_KEY]: value }))
          .catch(error => console.error("[Projudi] Não foi possível salvar a visibilidade dos botões:", error));
        layout();
      });
      document.body.appendChild(toggle);
      applyVisibility();
    }
    handle.hidden = false;
    toggle.hidden = false;
    toggle.style.right = (12 + handle.offsetWidth + 6) + "px";
    const emailHeight = emails.reduce((sum, el) => sum + el.offsetHeight, 0) + Math.max(0, emails.length - 1) * 6;
    const height = Math.max(emailHeight, ...peers.map(el => el.offsetHeight), 0);
    const total = height + 30;
    const top = Math.max(MARGIN, Math.min(preferredTop === null ? window.innerHeight - total - 12 : preferredTop, window.innerHeight - total - MARGIN));
    handle.style.top = top + "px";
    toggle.style.top = top + "px";
    function place(el, y) {
      el.style.setProperty("top", y + "px", "important");
      el.setAttribute("data-pdp-movable", "");
      el.style.removeProperty("bottom");
    }
    let bottom = top + 30 + (height + emailHeight) / 2;
    emails.forEach(el => {
      bottom -= el.offsetHeight;
      place(el, bottom);
      bottom -= 6;
    });
    peers.forEach(el => place(el, top + 30 + (height - el.offsetHeight) / 2));
    window.dispatchEvent(new Event("pdp-buttons-moved"));
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(layout);
  }
  chrome.storage.local.get([KEY, HIDDEN_KEY]).then(data => {
    buttonsHidden = data[HIDDEN_KEY] === true;
    applyVisibility();
    if (typeof data[KEY] === "number" && Number.isFinite(data[KEY])) preferredTop = data[KEY];
  }).catch(error => console.error("[Projudi] Erro ao carregar posição:", error))
    .finally(() => { loaded = true; schedule(); });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pdp-buttons-layout", schedule);
  setInterval(schedule, 700);
})();
