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

  let busy = false;
  // Pendências já confirmadas como dispensadas: nunca mais oferece o botão
  // para o mesmo link, mesmo depois do aviso ser fechado. Só volta a
  // aparecer se a linha inteira for recriada pela própria tela do Projudi.
  const dispensed = new WeakSet();
  // Aviso (progresso, sucesso ou falha) atualmente exibido no lugar do
  // botão de cada pendência.
  const cards = new Map();
  function review(url, button, link) {
    if (busy) return;
    busy = true;
    const token = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.setAttribute('data-pdp-dispensa', token);
    frame.title = 'Dispensa de juntadas em segundo plano';
    frame.style.cssText = 'position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;';
    document.body.append(frame);
    // Mensagem inline, num card no lugar do próprio botão, em vez de um aviso solto na tela.
    const status = document.createElement('span');
    status.className = 'pdp-dispensar-status';
    status.setAttribute('role','status');
    const note = document.createElement('span');
    note.className = 'pdp-dispensar-card';
    note.textContent = 'Dispensando juntadas selecionáveis desta página…';
    const details = document.createElement('button');
    details.type = 'button'; details.textContent = 'Ver detalhes'; details.hidden = true;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Fechar aviso'; close.hidden = true;
    status.append(note,details,close);
    button.remove();
    buttons.delete(link);
    link.insertAdjacentElement('afterend',status);
    cards.set(link,status);
    let closed = false, attempted = false, submitted = false, succeeded = false, timer;
    let oldSuccess = new Set(), stable = null, stableAt = 0;
    const deadline = Date.now() + 60000;
    // Some sozinho só se o usuário fechar, ou se a própria linha desaparecer
    // da tela (troca de aba, remessa, ordenação, conclusão etc.), nunca por
    // tempo: scanButtons() cuida da segunda parte.
    function cleanup() {
      if (closed) return;
      closed = true; clearTimeout(timer); frame.remove(); status.remove(); cards.delete(link);
      if (!succeeded) scanButtons(); // dispensa não confirmada: permite tentar de novo
    }
    function fail(message) {
      if (closed) return;
      busy = false; clearTimeout(timer);
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
            frame.remove(); busy = false; succeeded = true; dispensed.add(link);
            note.textContent = 'Juntada(s) já dispensada(s) - Movimentação permitida.';
            note.classList.add('pdp-dispensar-card-ok');
            close.hidden = false; return;
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
    for (const [link,card] of cards) {
      if (!link.isConnected) { card.remove(); cards.delete(link); }
    }
    document.querySelectorAll('#quadroPendencias a.link').forEach(link => {
      if (!eligible(link) || dispensed.has(link) || cards.has(link)) return;
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
          if (!url || busy) return;
          window.dispatchEvent(new Event('pdp-juntada-action-start'));
          review(url,button,link);
        });
        link.insertAdjacentElement('afterend',button);
        buttons.set(link,button);
      }
      button.disabled = busy;
    });
  }
  scanButtons();
  new MutationObserver(scanButtons).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['href'] });
})();

// Dispensa, em segundo plano, todas as intimações que aguardam análise de
// decurso de prazo no processo atualmente aberto.
(function () {
  'use strict';
  if (window.__pdpDispensarDecurso || !location.pathname.startsWith('/projudi/')) return;
  window.__pdpDispensarDecurso = true;

  const listRoute = '/projudi/processo/intimacaoBusca.do';
  const detailRoute = '/projudi/processo/intimacao.do';
  const normalize = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const controls = new Map();
  const completed = new WeakSet();
  const cards = new Map();
  let busy = false;

  function pendingURL(link) {
    if (!link || !link.matches('a.link[href]') || !link.closest('#quadroPendencias')) return null;
    const text = normalize(link.textContent);
    if (!/intimac/.test(text) || !/aguardando analise de decurso de prazo/.test(text)) return null;
    try {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.origin !== location.origin || url.pathname !== listRoute || !url.search) return null;
      return url.href;
    } catch (_) { return null; }
  }

  function detailLinks(doc) {
    try {
      if (!doc || new URL(doc.URL).pathname !== listRoute) return null;
    } catch (_) { return null; }
    const table = doc.querySelector('table.resultTable');
    if (!table) return null;
    const links = [];
    for (const row of table.querySelectorAll('tbody > tr:not([id])')) {
      if (!/aguardando analise do decurso de prazo/.test(normalize(row.textContent))) continue;
      const link = [...row.querySelectorAll('a.link[href]')].find(candidate => {
        try {
          const url = new URL(candidate.getAttribute('href'), doc.URL);
          return url.origin === location.origin && url.pathname === detailRoute && !!url.search;
        } catch (_) { return false; }
      });
      if (link) links.push(new URL(link.getAttribute('href'), doc.URL).href);
    }
    return [...new Set(links)];
  }

  function dismissButton(doc) {
    try {
      if (!doc || new URL(doc.URL).pathname !== detailRoute) return null;
    } catch (_) { return null; }
    const form = doc.querySelector('#intimacaoForm');
    const button = form?.querySelector('#dispensarButton');
    if (!form || !button || button.disabled || normalize(button.value || button.textContent) !== 'dispensar') return null;
    return button;
  }

  function run(link, listUrl, button) {
    if (busy) return;
    busy = true;
    const token = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.title = 'Dispensa de decursos de prazo em segundo plano';
    frame.setAttribute('data-pdp-decurso', token);
    frame.style.cssText = 'position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;';
    document.body.append(frame);

    const status = document.createElement('span');
    status.className = 'pdp-dispensar-status';
    status.setAttribute('role', 'status');
    const note = document.createElement('span');
    note.className = 'pdp-dispensar-card';
    note.textContent = 'Localizando decursos pendentes…';
    const details = document.createElement('button');
    details.type = 'button'; details.textContent = 'Ver detalhes'; details.hidden = true;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Fechar aviso'; close.hidden = true;
    status.append(note, details, close);
    button.remove(); controls.delete(link);
    link.insertAdjacentElement('afterend', status); cards.set(link, status);

    let state = 'list';
    let closed = false;
    let succeeded = false;
    let previousCount = 0;
    let processed = 0;
    let total = 0;
    let timer = setTimeout(() => fail('A operação demorou além do esperado. Confira em “Ver detalhes” antes de tentar novamente.'), 120000);

    function cleanup() {
      if (closed) return;
      closed = true; clearTimeout(timer); frame.remove(); status.remove(); cards.delete(link);
      if (!succeeded) refresh();
    }
    function fail(message) {
      if (closed) return;
      busy = false; clearTimeout(timer);
      note.textContent = message; details.hidden = false; close.hidden = false;
    }
    function finish() {
      if (closed) return;
      succeeded = true; busy = false; clearTimeout(timer); frame.remove(); completed.add(link);
      note.textContent = 'Decurso(s) já dispensado(s) - Movimentação permitida.';
      note.classList.add('pdp-dispensar-card-ok'); close.hidden = false;
      refresh();
    }
    function loadList() {
      state = 'list'; frame.src = listUrl;
    }
    function openNext(entries) {
      if (!entries.length) { finish(); return; }
      previousCount = entries.length;
      total = Math.max(total, processed + entries.length);
      note.textContent = 'Dispensando decurso ' + (processed + 1) + ' de ' + total + '…';
      state = 'detail'; frame.src = entries[0];
    }

    close.addEventListener('click', cleanup);
    details.addEventListener('click', () => {
      frame.style.cssText = 'position:fixed;inset:12vh 3vw 3vh;width:94vw;height:85vh;background:white;border:2px solid #536478;z-index:2147483646;';
    });
    frame.addEventListener('load', async () => {
      if (closed) return;
      try {
        const doc = frame.contentDocument;
        if (state === 'list') {
          const entries = detailLinks(doc);
          if (!entries) throw new Error('A listagem de decursos não foi reconhecida.');
          openNext(entries); return;
        }
        if (state === 'detail') {
          const nativeButton = dismissButton(doc);
          if (!nativeButton) throw new Error('O botão nativo “Dispensar” não foi encontrado para esta intimação.');
          nativeButton.setAttribute('data-pdp-decurso-button', token);
          state = 'submitted';
          const response = await chrome.runtime.sendMessage({source:'projudi-preview', type:'decurso-dispense-marked', token});
          if (!response?.ok) throw new Error(response?.error || 'Não foi possível acionar a dispensa.');
          return;
        }
        if (state === 'submitted') {
          state = 'verify'; frame.src = listUrl; return;
        }
        if (state === 'verify') {
          const entries = detailLinks(doc);
          if (!entries) throw new Error('Não foi possível conferir a listagem após a dispensa.');
          if (entries.length >= previousCount) throw new Error('A listagem não confirmou a dispensa. Confira antes de tentar novamente.');
          processed += previousCount - entries.length;
          openNext(entries);
        }
      } catch (error) { fail(error.message || 'Não foi possível concluir a dispensa.'); }
    });
    frame.src = listUrl;
  }

  function refresh() {
    for (const [link, control] of controls) {
      if (!link.isConnected || !pendingURL(link)) { control.remove(); controls.delete(link); }
    }
    for (const [link, card] of cards) {
      if (!link.isConnected) { card.remove(); cards.delete(link); }
    }
    for (const link of document.querySelectorAll('#quadroPendencias a.link[href]')) {
      const url = pendingURL(link);
      if (!url || completed.has(link) || cards.has(link)) continue;
      let control = controls.get(link);
      if (!control?.isConnected) {
        control = document.createElement('button');
        control.type = 'button'; control.className = 'pdp-dispensar-juntadas';
        control.textContent = 'Dispensar decursos';
        control.title = 'Dispensar todas as intimações deste processo que aguardam análise de decurso de prazo';
        control.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const freshUrl = pendingURL(link);
          if (freshUrl && !busy) run(link, freshUrl, control);
        });
        link.insertAdjacentElement('afterend', control); controls.set(link, control);
      }
      control.disabled = busy;
    }
  }

  new MutationObserver(refresh).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
  refresh();
})();
