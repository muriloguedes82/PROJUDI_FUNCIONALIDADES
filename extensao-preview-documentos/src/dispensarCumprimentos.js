(function () {
  'use strict';
  if (!window.__pdpHostPermitido || window.__pdpDispensarCumprimentos) return;
  if (!/^\/(projudi|seeu)\//.test(location.pathname)) return;
  window.__pdpDispensarCumprimentos = true;
  // Projudi e SEEU: mesmas listas e telas de cumprimento; muda o começo do
  // endereço e, no quadro Pendências do SEEU, a quantidade vem no fim do
  // texto sem os dois-pontos ("Comunicações Tre 01", no Projudi "Ofício: 1").
  const NO_SEEU = location.pathname.startsWith('/seeu/');
  const SISTEMA = NO_SEEU ? 'SEEU' : 'Projudi';
  const BASE = NO_SEEU ? '/seeu' : '/projudi';
  const COUNT_RE = NO_SEEU ? /(?::|\s)\s*0*([1-9]\d*)\s*$/ : /:\s*0*([1-9]\d*)\s*$/;
  const buttons = new WeakMap();
  let busy = false;
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const COMMON_PATH = BASE + '/processo/cumprimentoCartorio.do';
  const MANDADO_PATH = BASE + '/processo/cumprimentoCartorioMandado.do';
  const PRE_ANALISE_PATH = BASE + '/processo/preAnalise.do';
  const ALLOWED_PATHS = new Set([COMMON_PATH, MANDADO_PATH, PRE_ANALISE_PATH]);
  function checkedUrl(value, base) {
    const u = new URL(value, base);
    if (u.origin !== location.origin || !ALLOWED_PATHS.has(u.pathname)) throw new Error('Endereço de cumprimento não reconhecido.');
    return u.href;
  }
  async function page(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(url, Object.assign({ credentials: 'same-origin', signal: controller.signal }, options));
      if (!r.ok) throw new Error('Erro HTTP ' + r.status);
      checkedUrl(r.url, url);
      const bytes = await r.arrayBuffer();
      const sample = new TextDecoder('windows-1252').decode(bytes.slice(0, 4096));
      const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(r.headers.get('content-type') || '') || /charset\s*=\s*["']?([\w-]+)/i.exec(sample);
      return { doc: new DOMParser().parseFromString(new TextDecoder(charset ? charset[1] : 'windows-1252').decode(bytes), 'text/html'), url: r.url };
    } finally { clearTimeout(timer); }
  }
  function removalAction(doc, base, isMandado) {
    if (isMandado) {
      // A página do mandado reutiliza o id "removeButton" em mais de um
      // controle. O valor distingue a remoção de ações como alterar endereço.
      const button = Array.from(doc.querySelectorAll('input[type="button"]')).find(el => normalize(el.value) === 'remover');
      const onclick = button && button.getAttribute('onclick') || '';
      const submitted = /submitPage\s*\(\s*(['"])([^'"]+)\1\s*,\s*document\.cumprimentoCartorioMandadoForm\s*\)/i.exec(onclick);
      if (!button || button.disabled || !submitted || !/confirm\s*\(/i.test(onclick)) throw new Error('Botão Remover do mandado indisponível.');
      const action = checkedUrl(submitted[2], base);
      if (new URL(action).pathname !== MANDADO_PATH) throw new Error('Ação de remoção do mandado não reconhecida.');
      return action;
    }
    const button = doc.querySelector('#removeButton');
    if (!button || button.disabled || !/removerCumprimento\s*\(/.test(button.getAttribute('onclick') || '')) throw new Error('Botão Remover indisponível.');
    const scripts = Array.from(doc.scripts).map(s => s.textContent).join('\n');
    const fn = /function\s+removerCumprimento\s*\(\s*\)\s*\{([\s\S]*?)\n\}/.exec(scripts);
    const action = fn && /document\.cumprimentoCartorioForm\.action\s*=\s*(['"])([^'"]+)\1/.exec(fn[1]);
    if (!action) throw new Error('Ação de remoção não reconhecida.');
    return checkedUrl(action[2], base);
  }
  async function dispense(link, button) {
    if (busy) return;
    const match = COUNT_RE.exec(link.textContent);
    const count = match && Number(match[1]);
    if (!count) return;
    busy = true;
    button.disabled = true;
    let done = 0;
    const removed = new Set();
    const mandado = new URL(link.href, document.baseURI).pathname === MANDADO_PATH;
    try {
      const url = checkedUrl(link.getAttribute('href'), document.baseURI);
      // Reabre a primeira página: atende paginação sem repetir POSTs.
      while (done < count) {
        button.textContent = 'Dispensando ' + (done + 1) + '/' + count + '…';
        const list = await page(url);
        const form = list.doc.querySelector(mandado ? 'form#cumprimentoCartorioMandadoForm' : 'form#cumprimentoCartorioForm');
        if (!form) throw new Error('Listagem indisponível. Confira sua sessão.');
        const detailLabel = mandado ? 'analisar' : 'visualizar';
        const linkDetail = Array.from(form.querySelectorAll('a[href]')).find(a => normalize(a.textContent) === detailLabel);
        if (!linkDetail) throw new Error(mandado ? 'Não foi encontrado o link Analisar na listagem de mandados.' : 'A quantidade de pendências mudou. Confira a listagem.');
        // Na linha do mandado há também um link na data que abre diretamente
        // a ficha editável. Ele fica numa linha irmã de "Analisar"; o código
        // do semáforo (chave) identifica as duas linhas do mesmo mandado.
        const row = linkDetail.closest('tr');
        const rowKey = row && /"chave"\s*:\s*"([^"]+)"/.exec(row.innerHTML);
        const itemKey = rowKey && rowKey[1];
        const directDetailLink = mandado && itemKey && Array.from(form.querySelectorAll('a.url[href]')).find(a => {
          const dateRow = a.closest('tr');
          const dateRowKey = dateRow && /"chave"\s*:\s*"([^"]+)"/.exec(dateRow.innerHTML);
          try { return dateRowKey && dateRowKey[1] === itemKey && new URL(a.href, list.url).pathname === MANDADO_PATH; } catch (_) { return false; }
        });
        const detailLink = directDetailLink || linkDetail;
        const detail = await page(checkedUrl(detailLink.getAttribute('href'), list.url));
        const detailForm = detail.doc.querySelector(mandado ? 'form#cumprimentoCartorioMandadoForm' : 'form#cumprimentoCartorioForm');
        const id = mandado
          ? (detailForm && new URL(detailForm.getAttribute('action') || detail.url, detail.url).searchParams.get('id')) || itemKey
          : detailForm && detailForm.querySelector('[name="codCumprimentoCartorio"]')?.value;
        if (!id || removed.has(id)) throw new Error('Item não identificado ou já removido.');
        const action = removalAction(detail.doc, detail.url, mandado);
        const body = new URLSearchParams();
        for (const [k, v] of new FormData(detailForm)) {
          if (typeof v !== 'string') throw new Error('Formulário inesperado.');
          body.append(k, v);
        }
        const result = await page(action, { method: 'POST', body });
        const error = result.doc.querySelector('#errorMessages');
        const success = result.doc.querySelector('#successMessages');
        const confirmed = mandado
          ? Boolean(success && normalize(success.textContent) && !(error && normalize(error.textContent)))
          : Boolean(success && normalize(success.textContent).includes('remocao realizada com sucesso') && !(error && normalize(error.textContent)));
        if (!confirmed) throw new Error('O ' + SISTEMA + ' não confirmou a remoção.');
        removed.add(id);
        done++;
      }
      button.textContent = 'Cumprimentos dispensados (' + done + ')';
      button.style.background = '#e5f4e8';
      button.style.color = '#206334';
    } catch (error) {
      button.textContent = 'Conferir dispensa (' + done + '/' + count + ')';
      button.style.background = '#fff1d6';
      button.title = error.message;
      alert('Dispensa: ' + done + ' de ' + count + ' remoções confirmadas. ' + error.message + '\nConfira a listagem antes de repetir. Não houve reenvio automático.');
    } finally { busy = false; }
  }
  // "Cumprimentos Aguardando Análise de Decurso:" — botão "Dispensar decurso".
  // O link abre a lista "Demais Cumprimentos"; cada "Visualizar" abre a tela
  // do cumprimento, cujo botão nativo "Dispensar Decurso" tem
  // onclick="if(confirm('Confirma que é desnecessário gerar alguma
  // movimentação em função da análise deste decurso de prazo ...')){
  // submitPage('/projudi/processo/cumprimentoCartorio.do?_tj=...',
  // document.cumprimentoCartorioForm);}". A extensão faz, sem sair da tela do
  // processo, o mesmo envio que o OK dessa confirmação faria (submitPage troca
  // a action do formulário e o envia) e confere o resultado.
  const DECURSO_LABEL = 'cumprimentos aguardando analise de decurso';
  function dispensarDecursoAction(doc, base) {
    const button = Array.from(doc.querySelectorAll('input[type="button"], button')).find(el => normalize(el.value || el.textContent) === 'dispensar decurso');
    if (!button) return null;
    const onclick = button.getAttribute('onclick') || '';
    const submitted = /submitPage\s*\(\s*(['"])([^'"]+)\1\s*,\s*document\.cumprimentoCartorioForm\s*\)/i.exec(onclick);
    if (button.disabled || !submitted || !/confirm\s*\(/i.test(onclick)) throw new Error('Botão Dispensar Decurso indisponível.');
    const action = checkedUrl(submitted[2], base);
    if (new URL(action).pathname !== COMMON_PATH) throw new Error('Ação de dispensa do decurso não reconhecida.');
    return action;
  }
  function formBody(form) {
    const body = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      if (typeof v !== 'string') throw new Error('Formulário inesperado.');
      body.append(k, v);
    }
    return body;
  }
  function hasMessage(doc, selector) {
    const el = doc.querySelector(selector);
    return Boolean(el && normalize(el.textContent));
  }
  async function dispensarDecurso(link, button) {
    if (busy) return;
    const match = COUNT_RE.exec(link.textContent);
    const count = match ? Number(match[1]) : 1;
    busy = true;
    button.disabled = true;
    let done = 0;
    const processed = new Set();
    const label = () => count > 1 ? 'Dispensando decurso ' + (done + 1) + '/' + count + '…' : 'Dispensando decurso…';
    try {
      const url = checkedUrl(link.getAttribute('href'), document.baseURI);
      // Reabre a lista a cada volta (atende paginação); "processed" evita
      // abrir de novo um cumprimento já dispensado ou sem decurso a dispensar.
      for (let volta = 0; volta < 5 && done < count; volta++) {
        button.textContent = label();
        const list = await page(url);
        const form = list.doc.querySelector('form#cumprimentoCartorioForm');
        if (!form) throw new Error('Lista de cumprimentos indisponível. Confira sua sessão.');
        const detalhes = Array.from(form.querySelectorAll('a[href]'))
          .filter(a => normalize(a.textContent) === 'visualizar')
          .map(a => { try { return checkedUrl(a.getAttribute('href'), list.url); } catch (_) { return null; } })
          .filter(Boolean);
        let avancou = false;
        for (const detailUrl of detalhes) {
          if (done >= count) break;
          button.textContent = label();
          const detail = await page(detailUrl);
          const detailForm = detail.doc.querySelector('form#cumprimentoCartorioForm');
          if (!detailForm) continue;
          const id = new URL(detailForm.getAttribute('action') || detail.url, detail.url).searchParams.get('id')
            || detailForm.querySelector('[name="codCumprimentoCartorio"]')?.value || detailUrl;
          if (processed.has(id)) continue;
          processed.add(id);
          const action = dispensarDecursoAction(detail.doc, detail.url);
          if (!action) continue; // cumprimento sem decurso a dispensar
          avancou = true;
          const result = await page(action, { method: 'POST', body: formBody(detailForm) });
          if (hasMessage(result.doc, '#errorMessages')) throw new Error(result.doc.querySelector('#errorMessages').textContent.replace(/\s+/g, ' ').trim());
          let confirmed = hasMessage(result.doc, '#successMessages');
          if (!confirmed) {
            // Sem mensagem de sucesso: confere se a tela do cumprimento ainda
            // oferece o "Dispensar Decurso".
            const again = await page(detailUrl);
            confirmed = !hasMessage(again.doc, '#errorMessages') && !dispensarDecursoAction(again.doc, again.url);
          }
          if (!confirmed) throw new Error('O ' + SISTEMA + ' não confirmou a dispensa do decurso.');
          done++;
        }
        if (!avancou) break;
      }
      if (!done) throw new Error('Não foi encontrado nenhum cumprimento com o botão Dispensar Decurso.');
      button.textContent = done > 1 ? 'Decursos dispensados (' + done + ')' : 'Decurso dispensado';
      button.style.background = '#e5f4e8';
      button.style.color = '#206334';
      button.title = 'Recarregue a página para atualizar o quadro Pendências.';
      const analisar = button.nextElementSibling;
      if (analisar && analisar.classList.contains('pdp-analisar-decurso-cumprimento')) {
        analisar.dataset.pdpFeito = '1';
        analisar.disabled = true;
      }
    } catch (error) {
      button.textContent = 'Conferir dispensa (' + done + '/' + count + ')';
      button.style.background = '#fff1d6';
      button.title = error.message;
      alert('Dispensar decurso: ' + done + ' de ' + count + ' dispensa(s) confirmada(s). ' + error.message + '\nConfira a lista antes de repetir. Não houve reenvio automático.');
    } finally { busy = false; }
  }
  // "Analisar decurso": acha, na lista Demais Cumprimentos, o primeiro
  // cumprimento com o botão nativo "Analisar Decurso de Prazo" (onclick
  // submitPage('/projudi/processo/certificar.do?_tj=...',
  // document.cumprimentoCartorioForm)) e abre a tela desse cumprimento no
  // popup das ações rápidas; lá, a extensão clica nesse botão (o envio é o
  // do próprio Projudi) e a tela "Analisar Decurso de Prazo" segue como no
  // "Analisar Decurso" das listas de decurso (decursoNaLinha.js, com o menu
  // de preferências; juntarDocumento.js clica em "Adicionar" e preenche a
  // "Inserir Arquivo").
  const ANALISAR_ROTULO = 'analisar decurso de prazo';
  function botaoAnalisar(doc) {
    return Array.from(doc.querySelectorAll('input[type="button"], button')).find(el => normalize(el.value || el.textContent) === ANALISAR_ROTULO) || null;
  }
  async function cumprimentoParaAnalisar(link) {
    const url = checkedUrl(link.getAttribute('href'), document.baseURI);
    const list = await page(url);
    const form = list.doc.querySelector('form#cumprimentoCartorioForm');
    if (!form) throw new Error('lista de cumprimentos indisponível. Confira sua sessão.');
    const detalhes = Array.from(form.querySelectorAll('a[href]')).filter(a => normalize(a.textContent) === 'visualizar');
    for (const a of detalhes) {
      let detailUrl;
      try { detailUrl = checkedUrl(a.getAttribute('href'), list.url); } catch (_) { continue; }
      const detail = await page(detailUrl);
      const botao = botaoAnalisar(detail.doc);
      if (botao && !botao.disabled) return detailUrl;
    }
    throw new Error('não foi encontrado nenhum cumprimento com o botão "Analisar Decurso de Prazo".');
  }
  function numeroDoProcesso() {
    const heading = document.querySelector('h3 em.attention');
    const m = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((document.title || '') + ' ' + (heading ? heading.textContent : ''));
    return m ? m[0] : null;
  }
  function statusDecurso(el, texto, tipo) {
    el.textContent = texto || '';
    el.style.display = texto ? 'inline-block' : 'none';
    const cores = { ok: ['#e5f4e8', '#206334'], erro: ['#fde8e8', '#8a1f1f'], aviso: ['#fff1d6', '#6b4e00'], andamento: ['#eef4fb', '#1f4a7a'] };
    const c = cores[tipo] || cores.andamento;
    el.style.background = c[0];
    el.style.color = c[1];
  }
  async function analisarDecurso(link, button, statusEl, outros) {
    if (busy) return;
    const api = window.__pdpAnalisarDecurso;
    if (!api) {
      alert('Para analisar o decurso por aqui, ligue a função "Analisar e Dispensar decurso na lista" no Menu da extensão.');
      return;
    }
    busy = true;
    const travar = sim => { button.disabled = sim; outros.forEach(b => { if (!b.dataset.pdpFeito) b.disabled = sim; }); };
    travar(true);
    try {
      const escolha = await api.escolher(button);
      if (!escolha) return;
      statusDecurso(statusEl, 'Procurando o cumprimento…', 'andamento');
      const detailUrl = await cumprimentoParaAnalisar(link);
      statusDecurso(statusEl, escolha.pref ? 'Abrindo a análise com ★ ' + escolha.pref.name + '…' : 'Abrindo a análise do decurso…', 'andamento');
      let clicado = false;
      const r = await api.abrir(detailUrl, escolha, {
        cnj: numeroDoProcesso(),
        status: (texto, tipo) => statusDecurso(statusEl, texto, tipo),
        textoFechado: 'Popup da análise fechado (recarregue a página para conferir)',
        aoCarregar: iframe => {
          if (clicado) return;
          const doc = iframe.contentDocument;
          if (!doc || new URL(doc.URL).pathname !== COMMON_PATH) return;
          const botao = botaoAnalisar(doc);
          if (!botao || botao.disabled) return;
          clicado = true;
          botao.click();
        }
      });
      statusDecurso(statusEl, (r.aviso ? '' : '✅ ') + r.texto, r.aviso ? 'aviso' : 'ok');
      if (r.executado) {
        [button].concat(outros).forEach(b => { b.dataset.pdpFeito = '1'; b.disabled = true; });
        button.textContent = 'Decurso analisado';
        button.style.background = '#e5f4e8';
        button.style.color = '#206334';
      }
    } catch (error) {
      statusDecurso(statusEl, '⚠ ' + ((error && error.message) || 'falha.'), 'erro');
    } finally {
      busy = false;
      if (!button.dataset.pdpFeito) travar(false);
    }
  }
  function rowLabel(link) {
    let row = link.closest('tr');
    while (row && row.closest('#quadroPendencias')) {
      const label = row.querySelector('td.labelRadio > label');
      if (label) return normalize(label.textContent);
      row = row.parentElement && row.parentElement.closest('tr');
    }
    return '';
  }
  function scan() {
    document.querySelectorAll('#quadroPendencias a.link[href]').forEach(link => {
      if (buttons.has(link)) return;
      try { checkedUrl(link.getAttribute('href'), document.baseURI); } catch (_) { return; }
      if (!rowLabel(link).startsWith(DECURSO_LABEL)) return;
      if (new URL(link.href, document.baseURI).pathname !== COMMON_PATH) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pdp-dispensar-decurso-cumprimento';
      button.textContent = 'Dispensar decurso';
      button.title = 'Dispensar a análise de decurso de prazo deste cumprimento (o mesmo que o botão "Dispensar Decurso" do ' + SISTEMA + ', confirmando com OK).';
      button.style.cssText = 'margin-left:10px;padding:5px 10px;border:1px solid #bbc4b2;border-radius:4px;background:#f5f7ef;cursor:pointer;';
      button.addEventListener('click', () => dispensarDecurso(link, button));
      buttons.set(link, button);
      const analisar = document.createElement('button');
      analisar.type = 'button';
      analisar.className = 'pdp-analisar-decurso-cumprimento';
      analisar.textContent = 'Analisar decurso';
      analisar.title = 'Abrir a análise do decurso de prazo deste cumprimento (botão "Analisar Decurso de Prazo" do ' + SISTEMA + ') no popup, com as preferências do Analisar Decurso.';
      analisar.style.cssText = button.style.cssText;
      const statusEl = document.createElement('span');
      statusEl.className = 'pdp-analisar-decurso-cumprimento-status';
      statusEl.style.cssText = 'display:none;margin-left:8px;padding:3px 8px;border-radius:4px;font-size:11px;';
      analisar.addEventListener('click', () => analisarDecurso(link, analisar, statusEl, [button]));
      link.insertAdjacentElement('afterend', button);
      button.insertAdjacentElement('afterend', analisar);
      analisar.insertAdjacentElement('afterend', statusEl);
    });
    document.querySelectorAll('#quadroPendencias a.link[href]').forEach(link => {
      if (buttons.has(link)) return;
      try { checkedUrl(link.getAttribute('href'), document.baseURI); } catch (_) { return; }
      let row = link.closest('tr'), matches = false;
      let mandado = false;
      while (row && row.closest('#quadroPendencias')) {
        const label = row.querySelector('td.labelRadio > label');
        if (label && normalize(label.textContent) === 'cumprimentos para expedir:') {
          matches = true;
          mandado = /^mandado\b/.test(normalize(link.textContent));
          break;
        }
        row = row.parentElement && row.parentElement.closest('tr');
      }
      if (!matches || !COUNT_RE.test(link.textContent)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pdp-dispensar-cumprimentos';
      button.textContent = 'Dispensar pendências';
      button.title = mandado ? 'Remover todos os mandados pendentes para expedir.' : 'Remover todos os cumprimentos para expedir deste tipo.';
      button.style.cssText = 'margin-left:10px;padding:5px 10px;border:1px solid #bbc4b2;border-radius:4px;background:#f5f7ef;cursor:pointer;';
      button.addEventListener('click', () => dispense(link, button));
      buttons.set(link, button);
      link.insertAdjacentElement('afterend', button);
    });
  }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
