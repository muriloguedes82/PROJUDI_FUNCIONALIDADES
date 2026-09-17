// Expande/recolhe os controles nativos de anexos da página atual.
(function () {
  'use strict';
  if (window.__pdpExpandMovements) return;
  window.__pdpExpandMovements = true;
  let button = null, footer = null, running = false, scheduled = false;
  function controls() {
    return [...document.querySelectorAll('img[onclick*="showDetail"], a[id^="linkArquivos"] img')]
      .filter(img => img.isConnected && img.getClientRects().length && img.closest('tr') &&
        !img.closest('.pdp-overlay,.pdp-qa-modal-backdrop,.pdp-juntada-review') && state(img));
  }
  function state(img) {
    const src = img.getAttribute('src') || '';
    if (/(?:^|\/)iPlus\.gif(?:[?#]|$)/i.test(src)) return 'closed';
    if (/(?:^|\/)iMinus\.gif(?:[?#]|$)/i.test(src)) return 'open';
    return null;
  }
  function refresh() {
    scheduled = false;
    const panel = document.getElementById('quadroPendencias');
    let filterRow = null;
    if (!panel && location.pathname === '/projudi/processo/analisarJuntada.do') {
      const filters = [...document.querySelectorAll('input[type="submit"],input[type="button"],button')]
        .filter(el => (el.value || el.textContent || '').trim().toLowerCase() === 'filtrar' && el.getClientRects().length);
      if (filters.length === 1) filterRow = filters[0].closest('tr');
    }
    const host = panel || filterRow;
    if (!host) { if (footer) footer.remove(); return; }
    if (!footer || !footer.isConnected || !host.contains(footer)) {
      if (filterRow) {
        if (footer) footer.remove();
        footer = document.createElement('td');
        footer.id = 'pdp-expand-pendencias-footer';
        footer.style.cssText = 'text-align:left;vertical-align:middle;white-space:nowrap;padding:0 8px 0 0;';
        filterRow.insertBefore(footer, filterRow.firstChild);
        if (button) footer.appendChild(button);
      } else {
      if (footer) footer.remove();
      const table = /^(TABLE|TBODY|THEAD|TFOOT)$/.test(panel.tagName);
      footer = document.createElement(table ? 'tr' : 'div');
      footer.id = 'pdp-expand-pendencias-footer';
      let container = footer;
      if (table) {
        container = document.createElement('td');
        container.colSpan = 100;
        footer.appendChild(container);
      }
      container.style.cssText = 'padding:10px 6px 4px;text-align:left;';
      const parent = panel.tagName === 'TABLE' ? (panel.tBodies[0] || panel.createTBody()) : panel;
      parent.appendChild(footer);
      if (button) container.appendChild(button);
      }
    }
    const row = footer.tagName === 'TR' ? footer.firstElementChild : footer;
    if (!button || !button.isConnected) {
      button = document.createElement('button');
      button.type = 'button'; button.id = 'pdp-expand-movements';
      button.className = 'pdp-qa-group-btn';
      button.addEventListener('click', toggle);
      row.appendChild(button);
    }
    if (running) return;
    const items = controls();
    const expand = items.some(img => state(img) === 'closed');
    const label = expand || !items.length ? 'Expandir movimentações ▼' : 'Recolher movimentações ▲';
    if (button.textContent !== label) button.textContent = label;
    button.disabled = !items.length;
    button.title = items.length ? 'Abrir ou fechar os detalhes com anexos das movimentações desta página' : 'Nenhum controle de anexos reconhecido nesta página';
  }
  async function toggle() {
    if (running) return;
    const items = controls();
    const from = items.some(img => state(img) === 'closed') ? 'closed' : 'open';
    const targets = items.filter(img => state(img) === from);
    if (!targets.length) return;
    running = true; button.disabled = true;
    button.textContent = from === 'closed' ? 'Expandindo…' : 'Recolhendo…';
    try {
      for (const img of targets) {
        if (!button.isConnected) break;
        // Preserva itens que o usuário já mudou durante a operação.
        if (img.isConnected && state(img) === from && img.getClientRects().length) img.click();
        await new Promise(resolve => setTimeout(resolve,100));
      }
    } finally { running = false; refresh(); }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true; requestAnimationFrame(refresh);
  }
  new MutationObserver(schedule).observe(document.documentElement, {childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  refresh();
})();
