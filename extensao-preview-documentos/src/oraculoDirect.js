// Consulta somente as páginas de visualização; não executa scripts do HTML recebido.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
  const endpoint = '/projudi/processo/criminal/antecedentesCriminais.do';
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  function localURL(value, path) {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || url.pathname !== path) throw new Error('Endereço de consulta inesperado.');
    return url;
  }
  async function readPage(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {...options, credentials:'same-origin', signal:controller.signal});
      if (!response.ok) throw new Error('O Projudi não respondeu à consulta (' + response.status + ').');
      localURL(response.url, new URL(url, location.href).pathname);
      const bytes = await response.arrayBuffer();
      const preview = new TextDecoder('windows-1252').decode(bytes.slice(0, 4096));
      const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get('content-type') || '')?.[1] ||
        /charset\s*=\s*["']?([\w-]+)/i.exec(preview)?.[1] || 'windows-1252';
      return new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), 'text/html');
    } finally { clearTimeout(timer); }
  }
  function parties(doc) {
    const found = new Map();
    for (const heading of doc.querySelectorAll('h4')) {
      if (!/^(reu|reus|acusado|acusados|investigado|investigados|noticiado|noticiados|autor do fato|autores do fato|autores dos fatos|representado|representados|flagranteado|flagranteados|posso passivo|polo passivo|polos passivos|requerido|requeridos)$/.test(normalize(heading.textContent))) continue;
      let table = heading.nextElementSibling;
      while (table && !table.matches('table,h3,h4')) table = table.nextElementSibling;
      if (!table?.matches('table.resultTable')) continue;
      for (const link of table.querySelectorAll('a.link[href]')) {
        let url;
        try { url = localURL(link.getAttribute('href'), '/projudi/processo/parteProcesso.do'); } catch (_) { continue; }
        if (!url.searchParams.has('_tj')) continue;
        const name = link.textContent.trim().replace(/\s+/g, ' ');
        if (name) found.set(url.href, {name, url:url.href});
      }
    }
    return [...found.values()];
  }
  function choose(items) {
    if (items.length === 1) return Promise.resolve(items[0]);
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'max-width:520px;width:90%;padding:20px;border:1px solid #777;border-radius:8px;font:14px Arial;';
      const title = document.createElement('h3'); title.textContent = 'Oráculo — escolher parte'; dialog.appendChild(title);
      function finish(value) { dialog.close(); dialog.remove(); resolve(value); }
      for (const item of items) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = item.name;
        button.style.cssText = 'display:block;width:100%;padding:10px;margin:6px 0;text-align:left;cursor:pointer;';
        button.addEventListener('click', () => finish(item)); dialog.appendChild(button);
      }
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancelar';
      cancel.addEventListener('click', () => finish(null)); dialog.appendChild(cancel);
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
      document.body.appendChild(dialog); dialog.showModal();
    });
  }
  window.__pdpOpenOraculoDirect = async function () {
    const form = document.getElementById('processoForm');
    if (!form) return false; // A ficha da parte mantém o atalho nativo já validado.
    const id = form.elements.namedItem('id')?.value;
    if (!/^\d+$/.test(id || '')) throw new Error('Não foi possível identificar o processo atual.');
    function checkContext() {
      if (!form.isConnected || form.elements.namedItem('id')?.value !== id) throw new Error('O processo mudou durante a consulta. Clique novamente em Oráculo.');
    }
    let doc = document;
    if (form.elements.namedItem('selectedIcon')?.value !== 'tabPartes') {
      const tab = [...document.querySelectorAll('[onclick]')].find(el => /setTab\(/.test(el.getAttribute('onclick')) && /['"]tabPartes['"]/.test(el.getAttribute('onclick')));
      const action = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab?.getAttribute('onclick') || '')?.[1];
      if (!action) throw new Error('Não encontrei o acesso à aba Partes nesta tela.');
      const url = localURL(action, '/projudi/visualizacaoProcesso.do');
      if (url.searchParams.get('actionType') !== 'visualizar') throw new Error('A aba Partes não aponta para uma página de visualização.');
      const body = new URLSearchParams();
      for (const [name, value] of new FormData(form)) if (typeof value === 'string') body.append(name, value);
      body.set('selectedIcon', 'tabPartes'); body.set('id', id);
      doc = await readPage(url.href, {method:'POST', body});
      if (doc.querySelector('#processoForm [name="id"]')?.value !== id) throw new Error('A resposta da aba Partes não corresponde ao processo atual.');
    }
    checkContext();
    const items = parties(doc);
    if (!items.length) throw new Error('Não encontrei uma parte com classificação habilitada para consulta no Oráculo.');
    const selected = await choose(items);
    if (!selected) return true;
    checkContext();
    const party = await readPage(selected.url);
    if (!party.querySelector('#parteProcessoForm') || !party.querySelector('#btPesqOraculo:not([disabled])')) throw new Error('A ficha escolhida não disponibilizou o botão Oráculo.');
    const urls = new Set();
    for (const script of party.querySelectorAll('script:not([src])')) {
      const fn = /function\s+pesquisarOraculo\s*\(\s*\)\s*\{([\s\S]*?)\}/.exec(script.textContent);
      const value = /\bvar\s+url\s*=\s*(['"])([^'"]+)\1/.exec(fn?.[1] || '')?.[2];
      if (value) urls.add(localURL(value, endpoint).href);
    }
    if (urls.size !== 1) throw new Error('Não foi possível identificar um único acesso ao Oráculo na ficha escolhida.');
    checkContext();
    const result = await chrome.runtime.sendMessage({source:'projudi-preview', type:'oraculo-open-url', url:[...urls][0]});
    if (!result?.ok) throw new Error(result?.error || 'Não foi possível abrir a janela do Oráculo.');
    return true;
  };
})();
