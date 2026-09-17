// Expande/recolhe os controles nativos de anexos da página atual, e permite
// ocultar as movimentações/pendências que não têm nenhum controle de anexo
// (ou seja, sem arquivo). O próprio botão "(Des)ocultar sem arquivo" traz
// embutida a caixa "sempre", que grava a preferência para o ocultamento já
// vir ativado da próxima vez; essa preferência pode ser ligada/desligada a
// qualquer momento pela mesma caixa.
(function () {
  'use strict';
  if (window.__pdpExpandMovements) return;
  window.__pdpExpandMovements = true;

  const LOG_PREFIX = '[PDP expandMovements]';
  function log() { console.log(LOG_PREFIX, ...arguments); }

  const HIDE_STORAGE_KEY = 'hideMovementsWithoutFilePrefs';
  const HIDDEN_ROW_ATTR = 'data-pdp-hidden-no-file';

  let button = null, footer = null, running = false, scheduled = false;
  let hideGroup = null, alwaysCheckbox = null;
  let hideNoFile = false, alwaysHide = false;

  function defaultHidePrefs() {
    return { alwaysHide: false };
  }

  function loadHidePrefs() {
    return chrome.storage.sync.get([HIDE_STORAGE_KEY]).then(function (data) {
      const prefs = Object.assign(defaultHidePrefs(), data[HIDE_STORAGE_KEY]);
      alwaysHide = !!prefs.alwaysHide;
      if (alwaysHide) hideNoFile = true;
      log('preferência carregada', { alwaysHide, hideNoFile });
    }).catch(function (err) {
      log('erro ao carregar preferência', err);
    });
  }

  function saveAlwaysHide(value) {
    alwaysHide = value;
    log('gravando preferência "sempre"', value);
    return chrome.storage.sync.set({ [HIDE_STORAGE_KEY]: { alwaysHide: value } }).catch(function (err) {
      log('erro ao gravar preferência', err);
    });
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync' || !changes[HIDE_STORAGE_KEY]) return;
    const prefs = Object.assign(defaultHidePrefs(), changes[HIDE_STORAGE_KEY].newValue);
    alwaysHide = !!prefs.alwaysHide;
    log('preferência alterada em outra aba/tela', { alwaysHide });
    if (alwaysCheckbox) alwaysCheckbox.checked = alwaysHide;
    if (alwaysHide) hideNoFile = true;
    refresh();
  });

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
  function rowHasFile(row) {
    return [...row.querySelectorAll('img[onclick*="showDetail"], a[id^="linkArquivos"] img')]
      .some(img => state(img));
  }
  function movementRows(host, footer, filterRow) {
    const table = host.tagName === 'TABLE' ? host : host.closest('table');
    if (!table) {
      log('movementRows: nenhuma tabela encontrada a partir do host', host);
      return [];
    }
    return [...table.rows].filter(row =>
      row !== footer && row !== filterRow && row.parentElement && row.parentElement.tagName !== 'THEAD' &&
      row.cells.length && ![...row.cells].every(cell => cell.tagName === 'TH') &&
      !row.closest('.pdp-overlay,.pdp-qa-modal-backdrop,.pdp-juntada-review'));
  }
  function applyHideNoFile(host, footer, filterRow) {
    const rows = movementRows(host, footer, filterRow);
    let hiddenCount = 0, changed = 0;
    rows.forEach(row => {
      const shouldHide = hideNoFile && !rowHasFile(row);
      if (shouldHide) hiddenCount++;
      if (shouldHide) {
        if (!row.hasAttribute(HIDDEN_ROW_ATTR)) {
          row.setAttribute(HIDDEN_ROW_ATTR, '1');
          row.style.setProperty('display', 'none', 'important');
          changed++;
        }
      } else if (row.hasAttribute(HIDDEN_ROW_ATTR)) {
        row.removeAttribute(HIDDEN_ROW_ATTR);
        row.style.removeProperty('display');
        changed++;
      }
    });
    if (changed) log('applyHideNoFile', { hideNoFile, totalLinhas: rows.length, ocultas: hiddenCount, alteradas: changed });
    return rows;
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
    if (!host) {
      if (footer) { log('refresh: host sumiu, removendo footer'); footer.remove(); }
      return;
    }
    if (!footer || !footer.isConnected || !host.contains(footer)) {
      log('refresh: (re)criando footer', { temPanel: !!panel, temFilterRow: !!filterRow });
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
      log('refresh: criando botão Expandir/Recolher movimentações');
      button = document.createElement('button');
      button.type = 'button'; button.id = 'pdp-expand-movements';
      button.className = 'pdp-qa-group-btn';
      button.addEventListener('click', toggle);
      row.appendChild(button);
    }
    if (!hideGroup || !hideGroup.isConnected) {
      log('refresh: criando botão (Des)ocultar sem arquivo');
      // Não pode ser um <button> real: precisa hospedar um checkbox
      // interativo dentro dele, e a especificação HTML não permite
      // controles de formulário aninhados num <button>.
      hideGroup = document.createElement('span');
      hideGroup.id = 'pdp-hide-no-file-movements';
      hideGroup.setAttribute('role', 'button');
      hideGroup.setAttribute('tabindex', '0');
      hideGroup.className = 'pdp-qa-group-btn';
      hideGroup.style.marginLeft = '6px';

      const label = document.createElement('span');
      label.className = 'pdp-hide-no-file-label';
      label.textContent = '(Des)ocultar sem arquivo (+)';
      hideGroup.appendChild(label);

      const alwaysWrap = document.createElement('label');
      alwaysWrap.className = 'pdp-hide-no-file-always';
      alwaysWrap.style.cssText = 'margin-left:6px;padding-left:6px;border-left:1px solid #adadad;cursor:pointer;display:inline-flex;align-items:center;gap:3px;';
      alwaysWrap.title = 'Ocultar automaticamente, sempre que a tela abrir, as movimentações sem arquivo';
      alwaysCheckbox = document.createElement('input');
      alwaysCheckbox.type = 'checkbox'; alwaysCheckbox.id = 'pdp-hide-no-file-always';
      alwaysCheckbox.style.margin = '0';
      alwaysCheckbox.checked = alwaysHide;
      // Clicar na caixa "sempre" não deve também disparar o clique do botão.
      alwaysWrap.addEventListener('click', function (event) { event.stopPropagation(); });
      alwaysCheckbox.addEventListener('change', function () {
        log('checkbox "sempre" alterada pelo usuário', alwaysCheckbox.checked);
        saveAlwaysHide(alwaysCheckbox.checked).then(function () {
          if (alwaysCheckbox.checked) { hideNoFile = true; refresh(); }
        });
      });
      const alwaysText = document.createElement('span');
      alwaysText.textContent = 'sempre';
      alwaysWrap.appendChild(alwaysCheckbox);
      alwaysWrap.appendChild(alwaysText);
      hideGroup.appendChild(alwaysWrap);

      function activateHideToggle(event) {
        if (alwaysWrap.contains(event.target)) return;
        if (hideGroup.getAttribute('aria-disabled') === 'true') return;
        hideNoFile = !hideNoFile;
        log('botão (Des)ocultar sem arquivo acionado', { hideNoFile });
        refresh();
      }
      hideGroup.addEventListener('click', activateHideToggle);
      hideGroup.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateHideToggle(event); }
      });
      row.appendChild(hideGroup);
    }
    if (running) return;
    const items = controls();
    const expand = items.some(img => state(img) === 'closed');
    const label = expand || !items.length ? 'Expandir movimentações ▼' : 'Recolher movimentações ▲';
    if (button.textContent !== label) button.textContent = label;
    button.disabled = !items.length;
    button.title = items.length ? 'Abrir ou fechar os detalhes com anexos das movimentações desta página' : 'Nenhum controle de anexos reconhecido nesta página';

    const rows = applyHideNoFile(host, footer, filterRow);
    const withoutFile = rows.filter(r => !rowHasFile(r));
    hideGroup.classList.toggle('pdp-qa-active', hideNoFile);
    const hideDisabled = !withoutFile.length && !hideNoFile;
    hideGroup.setAttribute('aria-disabled', String(hideDisabled));
    hideGroup.classList.toggle('pdp-qa-btn-disabled', hideDisabled);
    hideGroup.title = withoutFile.length || hideNoFile
      ? 'Oculta ou mostra as movimentações/pendências desta página que não têm nenhum arquivo anexado'
      : 'Nenhuma movimentação sem arquivo nesta página';
    if (alwaysCheckbox.checked !== alwaysHide) alwaysCheckbox.checked = alwaysHide;
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
  loadHidePrefs().then(refresh);
})();
