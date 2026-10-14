// Notas locais e sincronização explícita com o lembrete ativo do Projudi.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido || window.__pdpButtonGroupBlocked || window.__pdpPostit) return;
  function deveOcultarPostitNesteFrame() {
    const classesPopup = ['pdp-qa-modal-iframe', 'pdp-proc-preview-iframe', 'pdp-sistemas-cnj-iframe'];
    let atual = window;
    let primeiroFrame = null;
    try {
      while (atual !== atual.top) {
        const frame = atual.frameElement;
        if (!frame) return true;
        if (atual === window) primeiroFrame = frame;
        if (frame.hasAttribute('data-pdp-loader') || frame.hasAttribute('data-pdp-hide-button-group') ||
            classesPopup.some(nome => frame.classList.contains(nome)) || /dialog|popup/i.test(frame.id || '')) return true;
        atual = atual.parent;
      }
      // A aplicação usa um frameset com quadros de cabeçalho e conteúdo.
      // Só o userMainFrame representa a tela atual; nos demais quadros o post-it
      // ficava sobreposto ao que era renderizado no quadro principal.
      if (window === window.top) {
        return document.documentElement?.tagName === 'FRAMESET' || document.body?.tagName === 'FRAMESET';
      }
      const nome = String(primeiroFrame?.name || primeiroFrame?.id || '').toLowerCase();
      return nome !== 'usermainframe';
    } catch (_) { return true; }
  }
  if (deveOcultarPostitNesteFrame()) return;
  const isProjudi = location.pathname.startsWith('/projudi/');
  // A ficha inicial também pode usar processo.do com um token opaco, sem
  // actionType/id na URL. A listagem usa essa rota, mas não tem a barra de
  // título individual verificada logo abaixo.
  const isProjudiProcessRoute = /^\/projudi\/(?:processo|visualizacaoProcesso|movimentarProcesso)\.do$/i.test(location.pathname);
  // Só a barra de título da ficha individual é uma fonte segura para o número.
  // Títulos genéricos e linhas de tabela em listagens podem conter vários processos.
  const header = document.querySelector('#barraTituloStatusProcessual');
  const match = (!isProjudi || isProjudiProcessRoute) && header ?
    /\bProcesso\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/i.exec(header.textContent) : null;
  const hasProcessContext = !!match;
  const prefix = 'pdpPostit:' + location.hostname + ':';
  const globalKey = prefix + 'permanente';
  // Em páginas sem uma ficha individual, a nota principal aponta sempre para
  // a nota permanente. O conteúdo por processo nunca usa um número extraído de listagens.
  const processKey = hasProcessContext ? prefix + match[1] : globalKey;
  const settingsKey = prefix + 'posicao', extrasKey = processKey + ':extras';
  const createUrlKey = processKey + ':linkNovoLembrete';
  const colors = { amarelo: 'Amarelo', azul: 'Azul', verde: 'Verde', vermelho: 'Vermelho' };
  const cards = new Set();
  const records = {};
  const defaultSubject = 'Anotação compartilhada - Abra ou instale a extensão Olirum';
  let extraIds = [], queue = Promise.resolve(), main;
  let lembrete = { mode: 'loading', url: '', detail: '', subject: '', problem: '', cachedCreateUrl: '', deactivate: null };
  function normalize(value, fallback = {}) {
    const data = value && typeof value === 'object' ? value : { ...fallback, text: typeof value === 'string' ? value : '' };
    return { text: typeof data.text === 'string' ? data.text : '', color: colors[data.color] ? data.color : 'amarelo',
      x: Number.isFinite(data.x) ? data.x : null, y: Number.isFinite(data.y) ? data.y : null, collapsed: !!data.collapsed };
  }
  function persist(values, card) {
    const output = card?.box.querySelector('output');
    const revision = card ? ++card.revision : 0;
    if (output) output.textContent = 'Salvando…';
    // Snapshot antes de enfileirar: trocar de nota não altera uma gravação pendente.
    const snapshot = JSON.parse(JSON.stringify(values));
    queue = queue.catch(() => {}).then(() => chrome.storage.local.set(snapshot)).then(() => {
      if (output && card.revision === revision) output.textContent = 'Salvo neste navegador';
      return true;
    }).catch(() => {
      if (output) output.textContent = 'Não foi possível salvar. Mantenha esta página aberta.';
      return false;
    });
  }
  function clamp(card) {
    const rect = card.box.getBoundingClientRect(), data = records[card.key];
    data.x = Math.max(0, Math.min(data.x ?? innerWidth - rect.width - 16, innerWidth - rect.width));
    data.y = Math.max(0, Math.min(data.y ?? 130, innerHeight - rect.height));
    card.box.style.left = data.x + 'px'; card.box.style.top = data.y + 'px';
  }
  function save(card) { persist({ [card.key]: records[card.key] }, card); }
  function render(card) {
    const data = records[card.key], box = card.box;
    box.dataset.color = data.color;
    box.classList.toggle('pdp-postit-collapsed', data.collapsed);
    box.querySelector('textarea').value = data.text;
    const toggle = box.querySelector('[data-toggle]');
    toggle.textContent = data.collapsed ? '▾' : '−';
    toggle.title = data.collapsed ? 'Abrir anotações' : 'Recolher anotações';
    toggle.setAttribute('aria-label', toggle.title);
    box.querySelector('small').textContent = card.key === globalKey ? 'Nota pessoal para todos os processos' :
      (lembrete.mode === 'active' ? 'Lembrete ativo · ' + (lembrete.subject || match?.[1] || '') :
        lembrete.mode === 'create' ? 'Novo lembrete · ' + defaultSubject : (match?.[1] || 'Nota permanente'));
    box.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === data.color)));
    box.querySelector('output').textContent = 'Salvo neste navegador';
    const sync = box.querySelector('[data-sync]');
    if (sync) {
      sync.hidden = card !== main || card.key === globalKey || !hasProcessContext || !isProjudi;
      sync.disabled = lembrete.mode === 'loading' || lembrete.mode === 'idle' || lembrete.mode === 'unavailable' || !records[processKey];
      sync.textContent = lembrete.mode === 'create' ? 'Salvar no Projudi (novo lembrete)' : 'Salvar no Projudi';
      const message = box.querySelector('[data-sync-status]');
      const deactivate = box.querySelector('[data-deactivate]');
      if (deactivate) {
        deactivate.hidden = card !== main || card.key === globalKey || lembrete.mode !== 'active' || !lembrete.deactivate;
        deactivate.disabled = lembrete.mode !== 'active' || !lembrete.deactivate;
      }
      if (message && !message.dataset.edited) {
        message.textContent = lembrete.mode === 'loading' ? 'Verificando lembrete ativo…' :
          lembrete.mode === 'unavailable' ? (lembrete.problem || 'Não foi possível localizar o lembrete ativo.') :
          lembrete.mode === 'create' ? 'Será criado com o assunto “' + defaultSubject + '”.' :
          lembrete.mode === 'active' ? (lembrete.deactivate ? 'Lembrete ativo conectado.' : 'Lembrete conectado; não foi possível identificar a ação de desativar nesta página.') :
          lembrete.mode === 'personal' ? 'Nota pessoal, salva neste navegador.' : '';
      }
    }
    clamp(card);
  }
  function normalizarTexto(value) { return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR'); }
  function urlDeCriacaoValida(value) {
    try {
      const url = new URL(value);
      return url.origin === location.origin && /\/projudi\/util\/lembrete\.do$/i.test(url.pathname);
    } catch (_) { return false; }
  }
  function encontrarLembretes(root = document) {
    const fieldset = Array.from(root.querySelectorAll('fieldset')).find(box =>
      /^lembrete ativo:?$/i.test(normalizarTexto(box.querySelector('legend')?.textContent)));
    if (fieldset) {
      const activeLink = Array.from(fieldset.querySelectorAll('a[href]')).find(a =>
        /\/projudi\/util\/lembrete\.do/i.test(a.href) && !/^desativar$/i.test(normalizarTexto(a.textContent)));
      if (activeLink) return { mode: 'active', url: activeLink.href };
    }
    const rows = Array.from(root.querySelectorAll('tr'));
    const active = rows.find(row => {
      const label = row.querySelector('td.label, td.labelRadio, th');
      return label && /^lembrete ativo:?$/i.test(normalizarTexto(label.textContent));
    });
    const activeLink = active && Array.from(active.querySelectorAll('a[href]')).find(a => /\/projudi\/util\/lembrete\.do/i.test(a.href));
    if (activeLink) return { mode: 'active', url: activeLink.href };
    const list = rows.find(row => {
      const label = row.querySelector('td.label, td.labelRadio, th');
      return label && /^lembretes?:?$/i.test(normalizarTexto(label.textContent));
    });
    // Dependendo do layout, “Novo Lembrete” pode ficar numa célula separada
    // ou fora da linha que contém o rótulo “Lembretes”. Procure primeiro a
    // linha conhecida e depois o link na página inteira.
    const linkValido = a => /\/projudi\/util\/lembrete\.do/i.test(a.href) &&
      /novo lembrete/i.test(normalizarTexto(a.textContent));
    const createLink = (list && Array.from(list.querySelectorAll('a[href]')).find(linkValido)) ||
      Array.from(root.querySelectorAll('a[href]')).find(linkValido);
    if (createLink) return { mode: 'create', url: createLink.href };
    // Um quadro “Lembrete Ativo” vazio pode coexistir com o link de criação.
    // Só bloqueie duplicação se o quadro existir e nenhum link de criação foi encontrado.
    return fieldset ? { mode: 'invalid', url: '' } : null;
  }
  async function aguardarLinkLembrete(root = document) {
    let found = encontrarLembretes(root);
    for (let tentativa = 0; !found && tentativa < 10; tentativa++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      found = encontrarLembretes(root);
    }
    return found;
  }
  async function obterPagina(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, options || {}));
    if (!response.ok) throw new Error('O Projudi respondeu com erro (' + response.status + ').');
    const bytes = await response.arrayBuffer();
    // O Projudi costuma servir HTML em Windows-1252. response.text() pode
    // decodificar como UTF-8 e corromper ç/ã/õ nos lembretes.
    const preview = new TextDecoder('windows-1252').decode(bytes.slice(0, 4096));
    const charsetMatch = /charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get('content-type') || '') ||
      /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
    let html;
    try { html = new TextDecoder((charsetMatch && charsetMatch[1]) || 'windows-1252').decode(bytes); }
    catch (_) { html = new TextDecoder('windows-1252').decode(bytes); }
    return { url: response.url || url, html };
  }
  function parsePagina(htmlText) { return new DOMParser().parseFromString(htmlText, 'text/html'); }
  function textoHTML(markup) {
    const doc = parsePagina('<body>' + (markup || '') + '</body>');
    doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    doc.querySelectorAll('p,div,li,tr').forEach(el => el.append('\n'));
    return (doc.body.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function conteudoDoLembrete(doc) {
    const editor = doc.querySelector('textarea[name="conteudoEditor"]');
    const rendered = doc.querySelector('table.tabelaImpressao');
    return textoHTML(rendered ? rendered.innerHTML : editor ? editor.value : '');
  }
  function assuntoDoLembrete(doc) {
    const input = doc.querySelector('input[name="assunto"]');
    if (input && input.value) return input.value;
    const row = Array.from(doc.querySelectorAll('tr')).find(tr => /^assunto:?$/i.test(normalizarTexto(tr.querySelector('td.label')?.textContent)));
    return row ? (row.querySelectorAll('td')[1]?.textContent || '').trim() : '';
  }
  function enderecoDeAlteracao(doc, pageUrl) {
    const button = doc.querySelector('#alterarButton, input[name="alterarButton"]');
    const match = button && /submitPage\s*\(\s*['"]([^'"]+)/i.exec(button.getAttribute('onclick') || '');
    return match ? new URL(match[1], pageUrl).href : '';
  }
  function acaoDesativarLembrete(doc, pageUrl) {
    const safeUrl = value => {
      try {
        const url = new URL(value, pageUrl);
        return url.origin === location.origin && /\/projudi\/util\/lembrete\.do$/i.test(url.pathname) ? url.href : '';
      } catch (_) { return ''; }
    };
    const controles = Array.from(doc.querySelectorAll('a[href], button, input[type="button"], input[type="submit"]'));
    const controle = controles.find(el => {
      const label = el.matches('input') ? el.value : el.textContent;
      return /^desativar(?: lembrete)?$/i.test(normalizarTexto(label));
    });
    if (!controle) return null;
    if (controle.matches('a[href]')) {
      const url = safeUrl(controle.getAttribute('href'));
      return url ? { url, method: 'GET' } : null;
    }
    const form = controle.form || doc.querySelector('form[name="lembreteForm"]');
    const match = /submitPage\s*\(\s*(['"])(.*?)\1/i.exec(controle.getAttribute('onclick') || '');
    const submitUrl = match && safeUrl(match[2]);
    if (submitUrl && form) return { url: submitUrl, method: 'POST', form, control: controle };
    if (controle.matches('input[type="submit"], button[type="submit"]') && form?.action) {
      const url = safeUrl(form.getAttribute('action') || form.action);
      return url ? { url, method: (form.method || 'POST').toUpperCase(), form, control: controle } : null;
    }
    return null;
  }
  function corpoDoFormulario(form, overrides) {
    const params = new URLSearchParams(Array.from(new FormData(form).entries()));
    Object.entries(overrides || {}).forEach(([name, value]) => params.set(name, value));
    return params;
  }
  async function postForm(form, action, overrides) {
    return obterPagina(action || form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: corpoDoFormulario(form, overrides).toString()
    });
  }
  async function buscarLembreteNaAbaGeral() {
    const form = document.querySelector('#processoForm') || document.forms[0];
    if (!form || !form.elements.namedItem('selectedIcon') ||
        !/\/projudi\/visualizacaoProcesso\.do(?:\?|$)/i.test(form.action)) return null;
    // Replica a troca de aba do Projudi sem navegar nem alterar a tela visível.
    const page = await postForm(form, form.action, { selectedIcon: 'tabDadosProcesso' });
    return encontrarLembretes(parsePagina(page.html));
  }
  async function carregarLembreteAtivo() {
    lembrete.problem = '';
    let found = await aguardarLinkLembrete();
    if (!found) {
      try { found = await buscarLembreteNaAbaGeral(); }
      catch (error) { lembrete.problem = error.message || 'Não foi possível consultar Informações Gerais.'; }
    }
    if (!found && urlDeCriacaoValida(lembrete.cachedCreateUrl)) {
      found = { mode: 'create', url: lembrete.cachedCreateUrl };
    }
    if (!found) throw new Error(lembrete.problem || 'Não foi possível localizar o lembrete na ficha deste processo.');
    if (found.mode === 'invalid') throw new Error('O quadro “Lembrete Ativo” existe, mas não foi possível ler o link do assunto.');
    lembrete.url = found.url;
    if (found.mode === 'create') {
      lembrete.mode = 'create';
      lembrete.cachedCreateUrl = found.url;
      chrome.storage.local.set({ [createUrlKey]: { url: found.url, savedAt: Date.now() } });
      render(main);
      return;
    }
    lembrete.cachedCreateUrl = '';
    chrome.storage.local.remove(createUrlKey);
    const detail = await obterPagina(found.url);
    const doc = parsePagina(detail.html);
    if (!doc.querySelector('form[name="lembreteForm"]') || !enderecoDeAlteracao(doc, detail.url)) {
      throw new Error('Não foi possível abrir o lembrete ativo para edição.');
    }
    lembrete.detail = detail.html;
    lembrete.subject = assuntoDoLembrete(doc);
    lembrete.deactivate = acaoDesativarLembrete(doc, detail.url);
    records[processKey].text = conteudoDoLembrete(doc);
    lembrete.mode = 'active';
    if (main && main.key === processKey) render(main);
    persist({ [processKey]: records[processKey] }, main);
    lembrete.mode = 'active';
  }
  async function salvarLembrete(button, message) {
    if (lembrete.mode !== 'active' && lembrete.mode !== 'create') return;
    button.disabled = true;
    message.dataset.edited = 'true';
    message.textContent = 'Salvando no Projudi…';
    const noteText = records[processKey].text;
    let submissionStarted = false;
    try {
      if (!noteText.trim()) throw new Error('Escreva o texto do lembrete antes de salvar no Projudi.');
      let editorPage;
      if (lembrete.mode === 'active') {
        const detailDoc = parsePagina(lembrete.detail);
        const form = detailDoc.querySelector('form[name="lembreteForm"]');
        const editUrl = enderecoDeAlteracao(detailDoc, lembrete.url);
        if (!form || !editUrl) throw new Error('O formulário do lembrete ativo não está disponível.');
        editorPage = await postForm(form, editUrl);
      } else {
        editorPage = await obterPagina(lembrete.url);
      }
      const editorDoc = parsePagina(editorPage.html);
      const editorForm = editorDoc.querySelector('form[name="lembreteForm"]');
      if (!editorForm) throw new Error('O Projudi não abriu o formulário de edição do lembrete.');
      const subject = editorForm.querySelector('[name="assunto"]');
      const content = editorForm.querySelector('textarea[name="conteudoEditor"]');
      if (!subject || !content) throw new Error('Não encontrei os campos de assunto e texto do lembrete.');
      if (lembrete.mode === 'create') subject.value = defaultSubject;
      content.value = noteText.split('\n').map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
      submissionStarted = true;
      const saved = await postForm(editorForm, new URL(editorForm.getAttribute('action') || editorPage.url, editorPage.url).href);
      const savedDoc = parsePagina(saved.html);
      const errors = savedDoc.querySelector('#errorMessages, .errorMessages');
      if (errors && errors.textContent.trim()) throw new Error(errors.textContent.trim());
      const savedForm = savedDoc.querySelector('form[name="lembreteForm"]');
      const savedText = conteudoDoLembrete(savedDoc);
      if (!savedForm || normalizarTexto(savedText) !== normalizarTexto(noteText)) {
        throw new Error('O Projudi não confirmou o texto salvo. Confira o lembrete antes de tentar novamente.');
      }
      lembrete.mode = 'active'; lembrete.detail = saved.html; lembrete.url = saved.url;
      lembrete.subject = assuntoDoLembrete(savedDoc);
      lembrete.deactivate = acaoDesativarLembrete(savedDoc, saved.url);
      lembrete.cachedCreateUrl = '';
      chrome.storage.local.remove(createUrlKey);
      render(main);
      message.textContent = 'Lembrete compartilhado salvo no Projudi.';
      delete message.dataset.edited;
    } catch (error) {
      if (submissionStarted) {
        lembrete.mode = 'unavailable';
        lembrete.problem = 'Não foi possível confirmar o salvamento. Confira o lembrete no Projudi antes de tentar novamente.';
        render(main);
      }
      message.textContent = error.message || 'Não foi possível salvar no Projudi.';
    } finally {
      button.disabled = lembrete.mode === 'unavailable';
    }
  }
  async function desativarLembrete(button, message) {
    if (lembrete.mode !== 'active' || !lembrete.deactivate) return;
    if (!window.confirm('Desativar o lembrete compartilhado deste processo no Projudi?')) return;
    button.disabled = true;
    message.dataset.edited = 'true';
    message.textContent = 'Desativando no Projudi…';
    let submissionStarted = false;
    try {
      // Atualiza os campos de segurança antes da ação para evitar usar um
      // formulário antigo caso o post-it permaneça aberto por muito tempo.
      const latestPage = await obterPagina(lembrete.url);
      const latestDoc = parsePagina(latestPage.html);
      const action = acaoDesativarLembrete(latestDoc, latestPage.url);
      if (!action) throw new Error('Não localizei a ação nativa de desativar neste lembrete. Nenhuma alteração foi enviada.');
      lembrete.detail = latestPage.html;
      lembrete.deactivate = action;
      if (action.method === 'POST') {
        const params = corpoDoFormulario(action.form);
        if (action.control?.name) params.set(action.control.name, action.control.value || '');
        submissionStarted = true;
        const response = await obterPagina(action.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: params.toString()
        });
        const responseDoc = parsePagina(response.html);
        const errors = responseDoc.querySelector('#errorMessages, .errorMessages');
        if (errors && errors.textContent.trim()) throw new Error(errors.textContent.trim());
      } else {
        submissionStarted = true;
        const response = await obterPagina(action.url);
        const responseDoc = parsePagina(response.html);
        const errors = responseDoc.querySelector('#errorMessages, .errorMessages');
        if (errors && errors.textContent.trim()) throw new Error(errors.textContent.trim());
      }
      const refreshed = await buscarLembreteNaAbaGeral();
      if (!refreshed || refreshed.mode !== 'create') {
        throw new Error('A ação foi enviada, mas o Projudi ainda não confirmou a desativação. Confira o lembrete antes de tentar novamente.');
      }
      lembrete.mode = 'create';
      lembrete.url = refreshed.url;
      lembrete.cachedCreateUrl = refreshed.url;
      lembrete.subject = '';
      lembrete.detail = '';
      lembrete.deactivate = null;
      chrome.storage.local.set({ [createUrlKey]: { url: refreshed.url, savedAt: Date.now() } });
      render(main);
      message.textContent = 'Lembrete desativado no Projudi. A anotação foi mantida neste navegador.';
      delete message.dataset.edited;
    } catch (error) {
      if (submissionStarted) {
        lembrete.mode = 'unavailable';
        lembrete.deactivate = null;
        lembrete.problem = 'Não foi possível confirmar a desativação. Confira o lembrete no Projudi antes de repetir.';
        render(main);
      }
      message.textContent = error.message || 'Não foi possível desativar o lembrete no Projudi.';
    } finally {
      button.disabled = lembrete.mode !== 'active' || !lembrete.deactivate;
    }
  }
  function createCard(key, isMain, id) {
    const box = document.createElement('aside');
    box.className = 'pdp-postit';
    if (isMain) box.id = 'pdp-postit';
    box.setAttribute('aria-label', isMain ? 'Bloco de anotações' : 'Anotação adicional do processo');
    box.innerHTML = '<header><strong>📝 Anotações</strong><span><button type="button" data-add title="Nova nota neste processo" aria-label="Nova nota neste processo">+</button><button type="button" data-toggle></button>' +
      (isMain ? '' : '<button type="button" data-delete title="Excluir esta nota" aria-label="Excluir esta nota">×</button>') +
      '</span></header><div class="pdp-postit-body">' + (isMain ? '<select aria-label="Tipo de anotação"><option value="processo">Deste processo</option><option value="permanente">Permanente (todos os processos)</option></select>' : '') +
      '<small></small><textarea aria-label="Anotações" placeholder="Escreva suas anotações…" spellcheck="true"></textarea><footer><output aria-live="polite"></output><div class="pdp-postit-colors" aria-label="Cor da nota"></div></footer>' +
      (isMain ? '<div class="pdp-postit-sync"><button type="button" data-sync disabled>Salvar no Projudi</button><button type="button" data-deactivate hidden>Desativar lembrete</button><output data-sync-status aria-live="polite">Verificando lembrete ativo…</output></div>' : '') + '</div>';
    const card = { box, key, revision: 0 };
    cards.add(card); document.body.appendChild(box);
    if (isMain && !hasProcessContext) box.querySelector('[data-add]').hidden = true;
    const palette = box.querySelector('.pdp-postit-colors');
    Object.entries(colors).forEach(([color, name]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.color = color; button.title = name;
      button.setAttribute('aria-label', 'Cor ' + name.toLowerCase());
      button.addEventListener('click', () => { records[card.key].color = color; render(card); save(card); });
      palette.appendChild(button);
    });
    box.querySelector('textarea').addEventListener('input', event => {
      records[card.key].text = event.target.value; save(card);
      const syncMessage = box.querySelector('[data-sync-status]');
      if (syncMessage && card.key === processKey && lembrete.mode === 'active') {
        syncMessage.dataset.edited = 'true'; syncMessage.textContent = 'Alterações não enviadas ao Projudi.';
      }
    });
    box.querySelector('[data-add]').addEventListener('click', () => {
      const noteId = crypto.randomUUID(), noteKey = processKey + ':note:' + noteId;
      const origin = records[card.key];
      const nextX = origin.x >= 310 ? origin.x - 310 : origin.x + 620 <= innerWidth ? origin.x + 310 : origin.x + 30;
      records[noteKey] = normalize({ text: '', color: origin.color, x: nextX, y: nextX === origin.x + 30 ? origin.y + 40 : origin.y });
      extraIds.push(noteId);
      const added = createCard(noteKey, false, noteId);
      persist({ [extrasKey]: extraIds, [noteKey]: records[noteKey] }, added);
      added.box.querySelector('textarea').focus();
    });
    box.querySelector('[data-toggle]').addEventListener('click', () => {
      records[card.key].collapsed = !records[card.key].collapsed; render(card); save(card);
    });
    if (!isMain) box.querySelector('[data-delete]').addEventListener('click', () => {
      if (records[card.key].text.trim() && !window.confirm('Excluir esta anotação?')) return;
      extraIds = extraIds.filter(item => item !== id);
      persist({ [extrasKey]: extraIds }, main);
      // O conteúdo deixa de ser exibido apenas após salvar a nova lista.
      queue.then(saved => {
        if (!saved) { if (!extraIds.includes(id)) extraIds.push(id); return; }
        if (!extraIds.includes(id)) {
          box.remove(); cards.delete(card);
          chrome.storage.local.remove(card.key).catch(error => console.error('[Projudi Anotações] Não foi possível limpar a nota excluída:', error));
        }
      });
    });
    if (isMain) {
      const scope = box.querySelector('select');
      scope.value = key === globalKey ? 'permanente' : 'processo';
      box.querySelector('[data-sync]').addEventListener('click', event => salvarLembrete(event.currentTarget, box.querySelector('[data-sync-status]')));
      box.querySelector('[data-deactivate]').addEventListener('click', event => desativarLembrete(event.currentTarget, box.querySelector('[data-sync-status]')));
      scope.addEventListener('change', () => {
        card.revision++;
        card.key = scope.value === 'permanente' ? globalKey : processKey;
        if (card.key === processKey && lembrete.mode === 'idle') {
          lembrete.mode = 'loading';
          const editor = box.querySelector('textarea'); editor.disabled = true;
          carregarLembreteAtivo().catch(error => {
            lembrete.mode = 'unavailable'; lembrete.problem = error.message || 'Não foi possível verificar o lembrete ativo.';
          }).finally(() => { editor.disabled = false; render(card); });
        }
        render(card); persist({ [settingsKey]: { scope: scope.value } }, card);
      });
    }
    const bar = box.querySelector('header');
    let drag;
    bar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = box.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      bar.setPointerCapture(event.pointerId); event.preventDefault();
    });
    bar.addEventListener('pointermove', event => {
      if (!drag) return;
      const data = records[card.key]; data.x = event.clientX - drag.x; data.y = event.clientY - drag.y; clamp(card);
    });
    function endDrag() { if (drag) { drag = null; save(card); } }
    bar.addEventListener('pointerup', endDrag); bar.addEventListener('pointercancel', endDrag);
    render(card); return card;
  }
  window.addEventListener('resize', () => cards.forEach(clamp));
  const storageKeys = [...new Set([processKey, globalKey, settingsKey, ...(hasProcessContext ? [extrasKey, createUrlKey] : [])])];
  chrome.storage.local.get(storageKeys).then(async data => {
    // Mantém o texto da primeira versão e usa a antiga posição como ponto inicial.
    const prefs = data[settingsKey] || {};
    records[processKey] = normalize(data[processKey], prefs);
    records[globalKey] = normalize(data[globalKey], prefs);
    const cachedCreate = hasProcessContext ? data[createUrlKey] : null;
    if (cachedCreate && Date.now() - cachedCreate.savedAt < 45 * 60 * 1000 && urlDeCriacaoValida(cachedCreate.url)) {
      lembrete.cachedCreateUrl = cachedCreate.url;
    } else if (cachedCreate) {
      chrome.storage.local.remove(createUrlKey);
    }
    extraIds = hasProcessContext && Array.isArray(data[extrasKey]) ? [...new Set(data[extrasKey].filter(id => typeof id === 'string'))] : [];
    const extraKeys = extraIds.map(id => processKey + ':note:' + id);
    const extraData = extraKeys.length ? await chrome.storage.local.get(extraKeys) : {};
    window.__pdpPostit = true;
    main = createCard(!hasProcessContext || prefs.scope === 'permanente' ? globalKey : processKey, true);
    if (!hasProcessContext) {
      const processOption = main.box.querySelector('select option[value="processo"]');
      if (processOption) { processOption.hidden = true; processOption.disabled = true; }
    }
    render(main);
    if (hasProcessContext && prefs.scope !== 'permanente' && isProjudi) {
      const editor = main.box.querySelector('textarea');
      editor.disabled = true;
      carregarLembreteAtivo().catch(error => {
        lembrete.mode = 'unavailable';
        lembrete.problem = error.message || 'Não foi possível verificar o lembrete ativo.';
      }).finally(() => { editor.disabled = false; render(main); });
    } else if (hasProcessContext && isProjudi) {
      lembrete.mode = 'idle';
      render(main);
    } else {
      lembrete.mode = 'personal';
      render(main);
    }
    extraIds.forEach((id, index) => {
      const key = extraKeys[index]; records[key] = normalize(extraData[key]); createCard(key, false, id);
    });
  }).catch(error => { console.error('[Projudi Anotações] Não foi possível carregar as notas:', error); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[createUrlKey] || !main) return;
    const cached = changes[createUrlKey].newValue;
    if (cached && urlDeCriacaoValida(cached.url) && lembrete.mode !== 'active' && lembrete.mode !== 'invalid') {
      lembrete.cachedCreateUrl = cached.url;
      if (lembrete.mode === 'unavailable' || lembrete.mode === 'idle') lembrete.mode = 'create';
      if (lembrete.mode === 'loading') return;
    } else if (!cached && lembrete.mode === 'create') {
      lembrete.cachedCreateUrl = '';
      lembrete.mode = 'unavailable';
      lembrete.problem = 'O lembrete mudou em outra aba. Atualize esta página antes de salvar novamente.';
    }
    render(main);
  });
})();
