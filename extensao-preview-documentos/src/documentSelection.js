// Seleção única, compartilhada pelos fluxos de WhatsApp e e-mail deste frame.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
  if (window.__pdpDocumentSelection) return;
  const listeners = new Set();
  const decorated = new WeakMap();
  function sync() {
    document.querySelectorAll('.pdp-document-checkbox').forEach(cb => {
      cb.checked = docs.has(cb.dataset.pdpDocumentHref);
    });
    listeners.forEach(listener => listener());
  }
  class Selection extends Map {
    set(key, value) { super.set(key, value); sync(); return this; }
    delete(key) { const changed = super.delete(key); if (changed) sync(); return changed; }
    clear() { if (!this.size) return; super.clear(); sync(); }
  }
  const docs = new Selection();
  // Número (coluna "Seq.") da movimentação a que o arquivo pertence: a
  // linha da própria movimentação (tr id="mov1Grau…") ou a anterior mais
  // próxima, quando os arquivos ficam numa linha expandida logo abaixo
  // dela. Usado na certidão de envio (certidaoEnvio.js); null se não achar.
  function seqDoArquivo(link) {
    const seqDaLinha = row => {
      for (const td of row.querySelectorAll(':scope > td')) {
        const text = (td.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\d+$/.test(text)) return text;
      }
      return null;
    };
    for (let row = link.closest('tr'); row; row = row.parentElement && row.parentElement.closest('tr')) {
      if (/^mov1Grau/.test(row.id || '')) return seqDaLinha(row);
      for (let prev = row.previousElementSibling; prev; prev = prev.previousElementSibling) {
        if (/^mov1Grau/.test(prev.id || '')) return seqDaLinha(prev);
      }
    }
    return null;
  }
  function decorate(link) {
    const existing = decorated.get(link);
    if (existing?.isConnected) return existing;
    const href = new URL(link.getAttribute('href'), document.baseURI).href;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'pdp-wa-checkbox pdp-document-checkbox';
    cb.title = 'Selecionar para WhatsApp ou e-mail';
    cb.setAttribute('aria-label', 'Selecionar documento para WhatsApp ou e-mail');
    cb.dataset.pdpDocumentHref = href;
    cb.checked = docs.has(href);
    cb.addEventListener('click', event => event.stopPropagation());
    cb.addEventListener('change', () => {
      if (cb.checked) docs.set(href, { href, name: (link.textContent || 'documento').trim(), seq: seqDoArquivo(link) });
      else docs.delete(href);
    });
    link.parentNode.insertBefore(cb, link);
    decorated.set(link,cb);
    return cb;
  }
  window.__pdpDocumentSelection = { docs, decorate, subscribe: listener => listeners.add(listener) };
})();
