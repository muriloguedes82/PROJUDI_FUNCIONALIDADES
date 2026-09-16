// Botão ao lado da pendência: dispensa de juntadas em segundo plano.
(function () {
  "use strict";
  if (window.__pdpJuntadaDrag || !location.pathname.startsWith('/projudi/')) return;
  window.__pdpJuntadaDrag = true;
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
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
        (/(?:juntadas?|pendencias?).{0,100}dispensad[ao]s?.{0,50}(?:sucesso|exito|movimenta[a-z]*.{0,20}permitida)/.test(text) ||
         /dispensa.{0,80}(?:sucesso|exito)/.test(text)));
  }
  function selectCandidates(result) {
    // Usa o evento nativo do cabeçalho para respeitar a seleção da página.
    if (result.master && !result.master.checked) result.master.click();
    // Um cabeçalho não funcional não autoriza marcar outros campos por aproximação.
    if (!result.master) result.boxes.forEach(box => { if (!box.checked) box.click(); });
  }

  // Uma dispensa por pendência, mas pendências diferentes rodam em paralelo.
  const busyLinks = new Set();
  function review(url, button, link) {
    if (busyLinks.has(link)) return;
    busyLinks.add(link);
    const token = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.setAttribute('data-pdp-dispensa', token);
    frame.title = 'Dispensa de juntadas em segundo plano';
    frame.style.cssText = 'position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;';
    document.body.append(frame);
    // Mensagem inline, no lugar do próprio botão, em vez de um aviso solto na tela.
    const status = document.createElement('span');
    status.className = 'pdp-dispensar-status';
    status.setAttribute('role','status');
    const note = document.createElement('span');
    note.textContent = 'Dispensando juntadas selecionáveis desta página…';
    const details = document.createElement('button');
    details.type = 'button'; details.textContent = 'Ver detalhes'; details.hidden = true;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Fechar aviso'; close.hidden = true;
    status.append(note,details,close);
    button.hidden = true;
    button.insertAdjacentElement('afterend',status);
    let closed = false, attempted = false, submitted = false, timer;
    let oldSuccess = new Set(), stable = null, stableAt = 0;
    const deadline = Date.now() + 60000;
    function cleanup() {
      if (closed) return;
      closed = true; busyLinks.delete(link); clearTimeout(timer); frame.remove(); status.remove();
      button.hidden = false; scanButtons();
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
            frame.remove(); note.textContent = 'Juntada(s) já dispensada(s) - Movimentação permitida.';
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
  const buttons = new Map();
  function scanButtons() {
    for (const [link,button] of buttons) {
      if (!link.isConnected || !eligible(link)) { button.remove(); buttons.delete(link); }
    }
    document.querySelectorAll('#quadroPendencias a.link').forEach(link => {
      if (!eligible(link)) return;
      let button = buttons.get(link);
      if (!button || !button.isConnected) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'pdp-dispensar-juntadas';
        button.textContent = 'Dispensar juntadas';
        button.title = 'Dispensar todas as juntadas selecionáveis da página, em segundo plano';
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const url = eligible(link);
          if (!url || busyLinks.has(link)) return;
          window.dispatchEvent(new Event('pdp-juntada-action-start'));
          review(url,button,link);
        });
        link.insertAdjacentElement('afterend',button);
        buttons.set(link,button);
      }
    });
  }
  scanButtons();
  new MutationObserver(scanButtons).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['href'] });
})();
