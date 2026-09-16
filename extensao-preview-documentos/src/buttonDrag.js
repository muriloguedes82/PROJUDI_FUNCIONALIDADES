// Posição vertical compartilhada dos atalhos, WhatsApp e e-mail.
(function () {
  "use strict";
  if (window.__pdpButtonDrag) return;
  window.__pdpButtonDrag = true;
  const style = document.createElement("style");
  style.textContent = "#pdp-wa-launcher[data-pdp-movable], .pdp-email-visible[data-pdp-movable], #pdp-qa-row[data-pdp-movable] { bottom: auto !important; }";
  style.textContent += "html[data-pdp-buttons-hidden] #pdp-wa-launcher, html[data-pdp-buttons-hidden] .pdp-email-visible, html[data-pdp-buttons-hidden] #pdp-qa-row { visibility: hidden !important; pointer-events: none !important; }";
  document.documentElement.appendChild(style);
  // O deslocamento manual vale apenas nesta página; cada abertura realinha o grupo.
  const HIDDEN_KEY = "pdpButtonsHidden";
  let buttonsHidden = false;
  let toggle = null;
  const MARGIN = 8;
  let manualOffset = 0;
  let referenceTop = 0;
  let fallbackPageTop = null;
  let groupHeight = 30;
  let loaded = false;
  let handle = null;
  let drag = null;
  let scheduled = false;
  let saveQueue = Promise.resolve();

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
        manualOffset = Math.max(MARGIN, Math.min(drag.top + event.clientY - drag.y, window.innerHeight - groupHeight - MARGIN)) - referenceTop;
        layout();
      });
      function finish(event) {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        manualOffset = parseFloat(handle.style.top) - referenceTop;
      }
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
      handle.addEventListener("lostpointercapture", finish);
      handle.addEventListener("keydown", event => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        manualOffset = Math.max(MARGIN, Math.min(parseFloat(handle.style.top) + (event.key === "ArrowUp" ? -1 : 1) * (event.shiftKey ? 1 : 10), window.innerHeight - groupHeight - MARGIN)) - referenceTop;
        layout();
        manualOffset = parseFloat(handle.style.top) - referenceTop;
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
    groupHeight = total;
    const reference = document.getElementById('pdp-expand-movements');
    if (reference && reference.getClientRects().length) {
      const rect = reference.getBoundingClientRect();
      let cursor = 30 + (height + emailHeight) / 2;
      let recipientCenter = 30 + height / 2;
      emails.forEach(el => {
        cursor -= el.offsetHeight;
        if (el.id === 'pdp-recipients-button') recipientCenter = cursor + el.offsetHeight / 2;
        cursor -= 6;
      });
      referenceTop = rect.top + rect.height / 2 - recipientCenter;
    } else {
      if (fallbackPageTop === null) fallbackPageTop = window.scrollY + window.innerHeight - total - 12;
      referenceTop = fallbackPageTop - window.scrollY;
    }
    // Mantém o conjunto inteiro entre as bordas, inclusive ao voltar para cima.
    const top = Math.max(MARGIN, Math.min(referenceTop + manualOffset, window.innerHeight - total - MARGIN));
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
  chrome.storage.local.get([HIDDEN_KEY]).then(data => {
    buttonsHidden = data[HIDDEN_KEY] === true;
    applyVisibility();
  }).catch(error => console.error("[Projudi] Erro ao carregar posição:", error))
    .finally(() => { loaded = true; schedule(); });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("pdp-buttons-layout", schedule);
  setInterval(schedule, 700);
})();
