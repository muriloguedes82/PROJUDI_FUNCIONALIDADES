(function () {
  'use strict';
  if (!window.__pdpHostPermitido || window.__pdpDispensarCumprimentos) return;
  window.__pdpDispensarCumprimentos = true;
  const buttons = new WeakMap();
  let busy = false;
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  function checkedUrl(value, base) {
    const u = new URL(value, base);
    if (u.origin !== location.origin || u.pathname !== '/projudi/processo/cumprimentoCartorio.do') throw new Error('Endereço de cumprimento não reconhecido.');
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
  function removalAction(doc, base) {
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
    const match = /:\s*(\d+)\s*$/.exec(link.textContent);
    const count = match && Number(match[1]);
    if (!count) return;
    busy = true;
    button.disabled = true;
    let done = 0;
    const removed = new Set();
    try {
      const url = checkedUrl(link.getAttribute('href'), document.baseURI);
      // Reabre a primeira página: atende paginação sem repetir POSTs.
      while (done < count) {
        button.textContent = 'Dispensando ' + (done + 1) + '/' + count + '…';
        const list = await page(url);
        const form = list.doc.querySelector('form#cumprimentoCartorioForm');
        if (!form) throw new Error('Listagem indisponível. Confira sua sessão.');
        const linkDetail = Array.from(form.querySelectorAll('a.link[href]')).find(a => normalize(a.textContent) === 'visualizar');
        if (!linkDetail) throw new Error('A quantidade de pendências mudou. Confira a listagem.');
        const detail = await page(checkedUrl(linkDetail.getAttribute('href'), list.url));
        const detailForm = detail.doc.querySelector('form#cumprimentoCartorioForm');
        const id = detailForm && detailForm.querySelector('[name="codCumprimentoCartorio"]');
        if (!id || !id.value || removed.has(id.value)) throw new Error('Item não identificado ou já removido.');
        const action = removalAction(detail.doc, detail.url);
        const body = new URLSearchParams();
        for (const [k, v] of new FormData(detailForm)) {
          if (typeof v !== 'string') throw new Error('Formulário inesperado.');
          body.append(k, v);
        }
        const result = await page(action, { method: 'POST', body });
        const error = result.doc.querySelector('#errorMessages');
        const success = result.doc.querySelector('#successMessages');
        if ((error && normalize(error.textContent)) || !success || !normalize(success.textContent).includes('remocao realizada com sucesso')) throw new Error('O Projudi não confirmou a remoção.');
        removed.add(id.value);
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
  function scan() {
    document.querySelectorAll('#quadroPendencias a.link[href]').forEach(link => {
      if (buttons.has(link)) return;
      try { checkedUrl(link.getAttribute('href'), document.baseURI); } catch (_) { return; }
      let row = link.closest('tr'), matches = false;
      while (row && row.closest('#quadroPendencias')) {
        const label = row.querySelector('td.labelRadio > label');
        if (label && normalize(label.textContent) === 'cumprimentos para expedir:') { matches = true; break; }
        row = row.parentElement && row.parentElement.closest('tr');
      }
      if (!matches || !/:\s*0*[1-9]\d*\s*$/.test(link.textContent)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pdp-dispensar-cumprimentos';
      button.textContent = 'Dispensar pendências';
      button.title = 'Remover todos os cumprimentos para expedir deste tipo.';
      button.style.cssText = 'margin-left:10px;padding:5px 10px;border:1px solid #bbc4b2;border-radius:4px;background:#f5f7ef;cursor:pointer;';
      button.addEventListener('click', () => dispense(link, button));
      buttons.set(link, button);
      link.insertAdjacentElement('afterend', button);
    });
  }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
