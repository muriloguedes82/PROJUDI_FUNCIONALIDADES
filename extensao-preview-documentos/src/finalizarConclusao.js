// Finalização da conclusão indicada no quadro de pendências, sem navegação.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
  if (window.__pdpFinalizarConclusao || !location.pathname.startsWith('/projudi/')) return;
  window.__pdpFinalizarConclusao = true;
  const route = '/projudi/processo/conclusao.do';
  const states = new Map();
  const controls = new WeakMap();
  let busy = false;
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function safeURL(value) {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || url.pathname !== route || !url.search) throw new Error('Endereço de conclusão não reconhecido.');
    return url.href;
  }
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {...options, credentials:'same-origin', signal:controller.signal});
      if (!response.ok) throw new Error('O Projudi não respondeu à operação.');
      safeURL(response.url);
      const bytes = await response.arrayBuffer();
      const head = new TextDecoder('windows-1252').decode(bytes.slice(0, 4096));
      const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get('content-type') || '')?.[1] || /charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] || 'windows-1252';
      return new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), 'text/html');
    } finally { clearTimeout(timer); }
  }
  function prepare(doc) {
    const form = doc.querySelector('#movimentarProcessoForm');
    const button = form?.querySelector('#extraButton');
    if (!form || !button || button.disabled || norm(button.value) !== 'finalizar conclusao pendente' ||
        form.elements.namedItem('finishButton')?.value !== 'button.finalizar.conclusao.pendente' ||
        !/^\d+$/.test(form.elements.namedItem('idMovimentacao')?.value || '')) throw new Error('Não foi encontrada uma conclusão habilitada para finalização.');
    const url = safeURL(form.elements.namedItem('finishURL')?.value || '');
    const body = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value !== 'string') throw new Error('O formulário possui arquivos e exige operação manual.');
      body.append(name, value);
    }
    return {url, body};
  }
  function succeeded(doc) {
    return norm(doc.querySelector('#successMessages')?.textContent) === 'conclusao pendente finalizada com sucesso!' &&
      !norm(doc.querySelector('#errorMessages')?.textContent);
  }
  async function finalize(link, url) {
    if (busy || states.has(url)) return;
    busy = true;
    states.set(url, {label:'Finalizando…'}); refresh();
    let submitted = false;
    try {
      const doc = await request(url);
      const data = prepare(doc);
      if (!link.isConnected || safeURL(link.getAttribute('href')) !== url) throw new Error('A pendência mudou. Consulte a página atual antes de tentar novamente.');
      submitted = true;
      const result = await request(data.url, {method:'POST', body:data.body});
      if (!succeeded(result)) throw new Error('A resposta não confirmou a finalização.');
      states.set(url, {label:'Conclusão finalizada', success:true});
    } catch (error) {
      if (submitted) {
        states.set(url, {label:'Verifique a conclusão', uncertain:true});
        alert('Não foi possível confirmar o resultado. Verifique a conclusão no Projudi antes de repetir a operação.');
      } else {
        states.delete(url);
        alert('Conclusão não enviada: ' + error.message);
      }
    } finally { busy = false; refresh(); }
  }
  function refresh() {
    for (const link of document.querySelectorAll('#quadroPendencias a.link[href]')) {
      let url;
      try { url = safeURL(link.getAttribute('href')); } catch (_) { continue; }
      if (link.hash) continue;
      let control = controls.get(link);
      if (!control || !control.isConnected) {
        control = document.createElement('button'); control.type = 'button';
        control.className = 'pdp-finalizar-conclusao';
        control.style.cssText = 'margin-left:12px;padding:5px 10px;border:1px solid #b9c4ad;border-radius:4px;background:#f4f6ef;color:#34422a;';
        control.addEventListener('click', () => {
          try { finalize(link, safeURL(link.getAttribute('href'))); } catch (_) { refresh(); }
        });
        link.insertAdjacentElement('afterend', control); controls.set(link, control);
      }
      const state = states.get(url);
      const label = state?.label || 'Finalizar conclusão';
      if (control.textContent !== label) control.textContent = label;
      control.disabled = busy || !!state;
      control.style.background = state?.success ? '#e5f5e8' : state?.uncertain ? '#fff1cc' : '#f4f6ef';
      control.style.color = state?.success ? '#216b32' : '#34422a';
    }
  }
  new MutationObserver(refresh).observe(document.documentElement, {childList:true, subtree:true});
  refresh();
})();
