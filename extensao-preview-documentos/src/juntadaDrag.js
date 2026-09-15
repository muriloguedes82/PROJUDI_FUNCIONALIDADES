// Implementação própria: gesto de dispensa de juntadas no Projudi.
// Seleciona a página atual e clica uma vez no controle nativo; preserva a confirmação.
(function () {
  "use strict";
  if (window.__pdpJuntadaDrag || !location.pathname.startsWith('/projudi/')) return;
  window.__pdpJuntadaDrag = true;
  const DIAGNOSTIC_ONLY = false; // Seletores confirmados no diagnóstico do Projudi.
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const outside = (x, y, rect) => x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  function eligible(link) {
    if (!link || !link.matches('a.link') || !link.closest('#quadroPendencias')) return null;
    try {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || !/^\/projudi\/.*\/analisarJuntada\.do$/.test(url.pathname)) return null;
      return url.href;
    } catch (_) { return null; }
  }
  // Restringe a seleção a uma única tabela e a um único grupo de campos.
  function candidates(doc) {
    const buttons = [...doc.querySelectorAll('button,input[type="button"],input[type="submit"],a')]
      .filter(el => normalize(el.value || el.textContent) === 'dispensar' && !el.disabled && el.getClientRects().length);
    if (buttons.length !== 1) return { reason: 'Não foi identificado um único botão nativo “Dispensar”. Use a página abaixo manualmente.' };
    const form = buttons[0].closest('form');
    if (!form) return { reason: 'O formulário nativo não foi identificado. Use a seleção manual abaixo.' };
    // Confirmado na tela real: filtros usam outros nomes; só idJuntadas é item.
    const all = [...form.querySelectorAll('input[type="checkbox"]')];
    const boxes = all.filter(el => el.name === 'idJuntadas' && !el.disabled && el.getClientRects().length && !el.closest('thead,th'));
    const tables = [...new Set(boxes.map(el => el.closest('table')))];
    if (!boxes.length || tables.length !== 1 || !tables[0]) {
      return { reason: 'Não foi encontrado um único grupo de juntadas habilitadas (idJuntadas). Nenhuma dispensa automática foi acionada.' };
    }
    const masters = all.filter(el => el.name === 'checker' && el.closest('table') === tables[0] && !!el.closest('thead,th') && !el.disabled && el.getClientRects().length);
    if (masters.length > 1) return { reason: 'Mais de um seletor de juntadas foi encontrado. Nenhuma dispensa automática foi acionada.' };
    // Não usa o cabeçalho se ele puder marcar outros tipos de controles na tabela.
    const otherFields = all.some(el => el.closest('table') === tables[0] && el.name !== 'idJuntadas' && el.name !== 'checker' && !el.disabled);
    const master = !otherFields && masters.length === 1 ? masters[0] : null;
    return { boxes, master, button: buttons[0] };
  }
  function successMessages(doc) {
    // Só considera mensagens visíveis e explícitas de dispensa bem-sucedida.
    return [...doc.querySelectorAll('div,span,p,td,li,[role="alert"]')]
      .filter(el => el.getClientRects().length)
      .map(el => normalize(el.innerText || ''))
      .filter(text => text.length > 0 && text.length < 500 &&
        !/nao|erro|falh|cancel|confirma|deseja|\?/.test(text) &&
        (/(?:juntadas?|pendencias?).{0,100}dispensad[ao]s?.{0,50}(?:sucesso|exito)/.test(text) ||
         /dispensa.{0,80}(?:sucesso|exito)/.test(text)));
  }
  function describeControls(doc) {
    // Somente estrutura de controles; não lê URLs, valores, textos de linhas ou argumentos JS.
    const token = value => /^[a-zA-Z_$][a-zA-Z0-9_$.[\]-]{0,99}$/.test(value || '')
      ? value.replace(/[0-9]+/g, '#') : (value ? '[omitido]' : '(vazio)');
    const tables = [...doc.querySelectorAll('table')];
    const controls = [...doc.querySelectorAll('input[type="checkbox"]')];
    const report = controls.map((el, index) => ({
      controle: index + 1,
      nome: token(el.name), id: token(el.id),
      tabela: tables.indexOf(el.closest('table')) + 1,
      tabelaPai: tables.indexOf(el.closest('table')?.parentElement?.closest('table')) + 1,
      cabecalho: !!el.closest('thead,th'),
      marcado: el.checked, desabilitado: el.disabled,
      visivel: !!el.getClientRects().length,
      funcoesClique: [...(el.getAttribute('onclick') || '').matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map(match => token(match[1])),
      funcoesMudanca: [...(el.getAttribute('onchange') || '').matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map(match => token(match[1]))
    }));
    return 'Diagnóstico J-04 (estrutura e seleção manual)\n' + JSON.stringify(report, null, 2);
  }
  function selectCandidates(result) {
    // Usa o evento nativo do cabeçalho para respeitar a seleção da página.
    if (result.master && !result.master.checked) result.master.click();
    // Um cabeçalho não funcional não autoriza marcar outros campos por aproximação.
    if (!result.master) result.boxes.forEach(box => { if (!box.checked) box.click(); });
  }

  let gesture = null, badge = null, modal = null, blockedLink = null, blockTimer;
  function blockClick(link) {
    blockedLink = link;
    clearTimeout(blockTimer);
    blockTimer = setTimeout(() => { blockedLink = null; }, 500);
  }
  function finish() {
    if (badge) badge.remove();
    badge = null;
    if (gesture?.dragging) blockClick(gesture.link);
    gesture = null;
    window.__pdpJuntadaDragging = false;
  }
  function review(url, source) {
    if (modal) return;
    const token = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.setAttribute('data-pdp-dispensa', token);
    frame.title = 'Dispensa de juntadas em segundo plano';
    frame.style.cssText = 'position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;';
    modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;background:white;color:#222;border:1px solid #aaa;border-radius:6px;padding:12px;box-shadow:0 3px 14px #0004;font:13px Arial;max-width:380px;';
    modal.setAttribute('role','status');
    const note = document.createElement('div');
    note.textContent = 'Dispensando juntadas selecionáveis desta página…';
    const details = document.createElement('button');
    details.type = 'button'; details.textContent = 'Ver detalhes'; details.hidden = true;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Fechar aviso'; close.hidden = true;
    modal.append(note,details,close);
    document.body.append(modal,frame);
    let closed = false, attempted = false, submitted = false, timer;
    let oldSuccess = new Set(), stable = null, stableAt = 0;
    const deadline = Date.now() + 60000;
    function cleanup() {
      if (closed) return;
      closed = true; clearTimeout(timer); frame.remove(); modal.remove(); modal = null;
    }
    function fail(message) {
      if (closed) return;
      clearTimeout(timer);
      note.textContent = message;
      details.hidden = false; close.hidden = false;
    }
    close.addEventListener('click', cleanup);
    details.addEventListener('click', () => {
      frame.style.cssText = 'position:fixed;inset:12vh 3vw 3vh;width:94vw;height:85vh;background:white;border:2px solid #536478;z-index:2147483646;';
    });
    function poll() {
      if (closed) return;
      try {
        const doc = frame.contentDocument;
        const message = submitted && doc && successMessages(doc).find(text => !oldSuccess.has(text));
        if (message) {
          if (message !== stable) { stable = message; stableAt = Date.now(); }
          if (Date.now() - stableAt >= 500) {
            frame.remove(); note.textContent = 'Juntadas dispensadas com sucesso.';
            close.hidden = false; timer = setTimeout(cleanup, 5000); return;
          }
        } else stable = null;
      } catch (_) { /* Não presume resultado quando a página não está acessível. */ }
      if (Date.now() >= deadline) {
        fail('Não foi possível confirmar a dispensa. Confira em “Ver detalhes” antes de tentar novamente.'); return;
      }
      timer = setTimeout(poll,250);
    }
    frame.addEventListener('load', async () => {
      if (closed || attempted) return;
      try {
        const doc = frame.contentDocument;
        if (!doc || new URL(doc.URL).pathname !== new URL(url).pathname) return;
        attempted = true;
        const result = candidates(doc);
        if (!result.boxes) { fail(result.reason); return; }
        selectCandidates(result);
        const fresh = candidates(doc);
        if (!fresh.boxes || fresh.button !== result.button || fresh.boxes.length !== result.boxes.length || !fresh.boxes.every((box,i) => box === result.boxes[i] && box.checked && box.isConnected)) {
          fail('A seleção não foi concluída. Nenhuma dispensa automática foi acionada.'); return;
        }
        oldSuccess = new Set(successMessages(doc));
        submitted = true;
        result.button.setAttribute('data-pdp-dispensa-button',token);
        const response = await chrome.runtime.sendMessage({ source:'projudi-preview',type:'juntada-dispense-marked',token });
        if (!closed && !response?.ok) fail(response?.error || 'Não foi possível acionar a dispensa. Confira os detalhes.');
      } catch (_) { fail('Não foi possível concluir a operação automaticamente. Confira os detalhes antes de tentar novamente.'); }
    });
    timer = setTimeout(poll,250);
    frame.src = url;
  }
  document.addEventListener('mousedown', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || modal) return;
    const link = event.target.closest?.('a.link');
    const url = eligible(link);
    if (!url) return;
    gesture = { link, url, x: event.clientX, y: event.clientY, area: link.closest('#quadroPendencias'), dragging: false };
  }, true);
  document.addEventListener('mousemove', event => {
    if (!gesture) return;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.x,event.clientY - gesture.y) < 5) return;
    if (!gesture.link.isConnected) { finish(); return; }
    if (!gesture.dragging) {
      gesture.dragging = true;
      window.__pdpJuntadaDragging = true;
      window.dispatchEvent(new Event('pdp-juntada-drag-start'));
      badge = document.createElement('div'); badge.className = 'pdp-juntada-drag-badge';
      document.body.append(badge);
    }
    event.preventDefault();
    const out = outside(event.clientX,event.clientY,gesture.area.getBoundingClientRect());
    badge.textContent = out ? '🗑 Solte para dispensar as juntadas desta página' : 'Solte aqui ou pressione Esc para cancelar';
    badge.dataset.outside = String(out);
    badge.style.left = Math.max(8,Math.min(event.clientX + 14,window.innerWidth - badge.offsetWidth - 8)) + 'px';
    badge.style.top = Math.max(8,Math.min(event.clientY + 14,window.innerHeight - badge.offsetHeight - 8)) + 'px';
  }, true);
  document.addEventListener('mouseup', event => {
    if (!gesture || event.button !== 0) return;
    const current = gesture;
    const execute = current.dragging && current.area.isConnected && outside(event.clientX,event.clientY,current.area.getBoundingClientRect());
    finish();
    if (execute) review(current.url,current.link);
  }, true);
  document.addEventListener('dragstart', event => { if (gesture) event.preventDefault(); },true);
  document.addEventListener('click', event => {
    if (blockedLink && (event.target === blockedLink || blockedLink.contains(event.target))) {
      event.preventDefault(); event.stopImmediatePropagation(); blockedLink = null;
    }
  },true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') finish(); },true);
  window.addEventListener('blur',finish);
})();
