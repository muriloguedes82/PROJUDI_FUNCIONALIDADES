// Posição vertical compartilhada dos atalhos, WhatsApp e e-mail.
(function () {
  "use strict";
  // A janela do Oráculo mantém apenas os controles nativos.
  if (location.pathname === '/projudi/processo/criminal/antecedentesCriminais.do') return;
  if (window.__pdpButtonGroupBlocked) return;
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
      const label = buttonsHidden ? "Mostrar" : "Ocultar";
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
      handle.textContent = "↕ Mover";
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
    layoutColumns(emails, peers);
    return;
  }

  // Layout em 2 linhas, coladas ao canto do quadro de pendências/análise
  // automática (ou ao rodapé da janela, na falta dele): a primeira com o
  // toggle "Ocultar/Mostrar" e o botão do WhatsApp; a segunda com "↕
  // Mover", a seta de e-mail (▼) colada ao "Enviar por e-mail", e a fila
  // de Ações Rápidas (#pdp-qa-row, que já tem suas próprias 2 linhas
  // internas: Concluso/Remessa/…/Enviar por WhatsApp e Processo
  // copiado/Destacar movimentações/Oráculo/Enviar por e-mail). A altura de
  // referência para todos os botões soltos vem de um botão já existente
  // dentro dessa fila (Oráculo, ou o primeiro .pdp-qa-group-btn), para os
  // dois lados ficarem visualmente do mesmo tamanho.
  // Aplica um valor em pixels só quando ele muda de verdade (arredondado
  // ao pixel inteiro) — layout() roda a cada 700ms e a cada mutação no
  // DOM da página (bem frequente), e reaplicar frações de pixel
  // ligeiramente diferentes a cada chamada, mesmo sem nada realmente ter
  // mudado, fazia o navegador repintar os botões sem necessidade — o
  // "piscar" ligeiro que dava para notar. Isso não afeta a rolagem nem a
  // ancoragem: a posição continua recalculada a cada chamada, só deixa de
  // ser REAPLICADA quando o valor arredondado é idêntico ao já visível.
  function setPx(el, prop, value, priority) {
    if (!el) return;
    const next = Math.round(value) + 'px';
    if (el.style.getPropertyValue(prop) === next) return;
    el.style.setProperty(prop, next, priority);
  }

  function layoutColumns(emails, peers) {
    const sender = emails.find(el => el.id === 'pdp-from-button');
    const send = emails.find(el => el.id === 'pdp-email-button');
    const emailMenu = emails.find(el => el.id === 'pdp-email-menu-button');
    const whats = peers.find(el => el.id === 'pdp-wa-launcher');
    const row = peers.find(el => el.id === 'pdp-qa-row');
    const gap = 6;
    const horizontalPadding = 7;
    const oraculo = row?.querySelector('#pdp-oraculo-button');
    const referenceButton = oraculo || row?.querySelector('.pdp-qa-group-btn');
    const buttonHeight = Math.max(30, Math.ceil(referenceButton?.getBoundingClientRect().height || 30));
    for (const el of [send, emailMenu, whats, sender, handle, toggle].filter(Boolean)) {
      el.style.boxSizing = 'border-box';
      setPx(el, 'height', buttonHeight, 'important');
      el.style.setProperty('font-size', '12px', 'important');
      el.style.setProperty('line-height', '1', 'important');
      el.style.setProperty('white-space', 'nowrap', 'important');
      el.style.setProperty('width', 'auto', 'important');
      setPx(el, 'padding-left', horizontalPadding, 'important');
      setPx(el, 'padding-right', horizontalPadding, 'important');
    }
    const menuWidth = buttonHeight;
    if (emailMenu) {
      setPx(emailMenu, 'width', menuWidth, 'important');
      emailMenu.style.setProperty('padding-left', '0', 'important');
      emailMenu.style.setProperty('padding-right', '0', 'important');
    }
    const naturalControlWidth = Math.max(
      Math.ceil(toggle?.getBoundingClientRect().width || 0),
      Math.ceil(handle?.getBoundingClientRect().width || 0)
    );
    const controlWidth = Math.max(1, naturalControlWidth);
    for (const control of [toggle, handle]) {
      setPx(control, 'width', controlWidth, 'important');
      control.style.boxSizing = 'border-box';
    }
    const whatsWidth = Math.ceil(whats?.getBoundingClientRect().width || 0);
    const emailWidth = Math.ceil(send?.getBoundingClientRect().width || 0) + (emailMenu ? menuWidth : 0);
    const deliveryWidth = Math.max(whatsWidth, emailWidth);
    if (whats && deliveryWidth) {
      setPx(whats, 'width', deliveryWidth, 'important');
    }
    if (send && deliveryWidth) {
      const emailMainWidth = Math.max(1, deliveryWidth - (emailMenu ? menuWidth : 0));
      setPx(send, 'width', emailMainWidth, 'important');
    }
    const lines = row ? [...row.querySelectorAll('.pdp-qa-row-line')] : [];
    lines.forEach(line => { line.style.minHeight = buttonHeight + 'px'; line.style.alignItems = 'center'; });
    const firstHeight = Math.max(buttonHeight, lines[0]?.offsetHeight || 0);
    const secondHeight = Math.max(buttonHeight, lines[1]?.offsetHeight || 0);
    groupHeight = firstHeight + gap + secondHeight;
    const reference = document.getElementById('pdp-expand-movements') ||
      document.getElementById('quadroPendencias') ||
      document.getElementById('quadroAnaliseAutomatica');
    if (reference?.getClientRects().length) {
      const rect = reference.getBoundingClientRect();
      referenceTop = rect.top + rect.height / 2 - firstHeight - gap - secondHeight / 2;
    } else {
      if (fallbackPageTop === null) fallbackPageTop = window.scrollY + window.innerHeight - groupHeight - 12;
      referenceTop = fallbackPageTop - window.scrollY;
    }
    const top = Math.max(MARGIN, Math.min(referenceTop + manualOffset, window.innerHeight - groupHeight - MARGIN));
    const sendRight = 12 + controlWidth + 10;
    function place(el, y, right) {
      if (!el) return;
      setPx(el, 'top', y, 'important');
      setPx(el, 'right', right, 'important');
      el.style.setProperty('bottom', 'auto', 'important');
      el.setAttribute('data-pdp-movable', '');
    }
    const firstTop = top + (firstHeight - buttonHeight) / 2;
    const secondTop = top + firstHeight + gap + (secondHeight - buttonHeight) / 2;
    place(toggle, firstTop, 12);
    place(handle, secondTop, 12);
    place(sender, secondTop, 12);
    place(whats, firstTop, sendRight);
    place(emailMenu, secondTop, sendRight);
    place(send, secondTop, sendRight + menuWidth);
    place(row, top, sendRight + deliveryWidth + 10);
    window.dispatchEvent(new Event('pdp-buttons-moved'));
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
