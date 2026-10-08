// Notas locais: nenhuma anotação é enviada ao processo ou ao servidor.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido || window.__pdpButtonGroupBlocked || window.__pdpPostit) return;
  try {
    if (window.frameElement && (window.frameElement.matches('.pdp-qa-modal-iframe, [data-pdp-loader], [data-pdp-hide-button-group]') || /dialog|popup/i.test(window.frameElement.id))) return;
  } catch (_) { return; }
  const header = document.querySelector('em.attention') || document.querySelector('#informacoesProcessuais');
  if (!header) return;
  const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(header.textContent + ' ' + document.title);
  if (!match) return;
  window.__pdpPostit = true;
  const prefix = 'pdpPostit:' + location.hostname + ':';
  const processKey = prefix + match[0], globalKey = prefix + 'permanente';
  const settingsKey = prefix + 'posicao', extrasKey = processKey + ':extras';
  const colors = { amarelo: 'Amarelo', azul: 'Azul', verde: 'Verde', vermelho: 'Vermelho' };
  const cards = new Set();
  const records = {};
  let extraIds = [], queue = Promise.resolve(), main;
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
    box.querySelector('small').textContent = card.key === globalKey ? 'Nota pessoal para todos os processos' : match[0];
    box.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === data.color)));
    box.querySelector('output').textContent = 'Salvo neste navegador';
    clamp(card);
  }
  function createCard(key, isMain, id) {
    const box = document.createElement('aside');
    box.className = 'pdp-postit';
    if (isMain) box.id = 'pdp-postit';
    box.setAttribute('aria-label', isMain ? 'Bloco de anotações' : 'Anotação adicional do processo');
    box.innerHTML = '<header><strong>📝 Anotações</strong><span><button type="button" data-add title="Nova nota neste processo" aria-label="Nova nota neste processo">+</button><button type="button" data-toggle></button>' +
      (isMain ? '' : '<button type="button" data-delete title="Excluir esta nota" aria-label="Excluir esta nota">×</button>') +
      '</span></header><div class="pdp-postit-body">' + (isMain ? '<select aria-label="Tipo de anotação"><option value="processo">Deste processo</option><option value="permanente">Permanente (todos os processos)</option></select>' : '') +
      '<small></small><textarea aria-label="Anotações" placeholder="Escreva suas anotações…" spellcheck="true"></textarea><footer><output aria-live="polite"></output><div class="pdp-postit-colors" aria-label="Cor da nota"></div></footer></div>';
    const card = { box, key, revision: 0 };
    cards.add(card); document.body.appendChild(box);
    const palette = box.querySelector('.pdp-postit-colors');
    Object.entries(colors).forEach(([color, name]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.color = color; button.title = name;
      button.setAttribute('aria-label', 'Cor ' + name.toLowerCase());
      button.addEventListener('click', () => { records[card.key].color = color; render(card); save(card); });
      palette.appendChild(button);
    });
    box.querySelector('textarea').addEventListener('input', event => { records[card.key].text = event.target.value; save(card); });
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
      scope.addEventListener('change', () => {
        card.revision++;
        card.key = scope.value === 'permanente' ? globalKey : processKey;
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
  chrome.storage.local.get([processKey, globalKey, settingsKey, extrasKey]).then(async data => {
    // Mantém o texto da primeira versão e usa a antiga posição como ponto inicial.
    const prefs = data[settingsKey] || {};
    records[processKey] = normalize(data[processKey], prefs);
    records[globalKey] = normalize(data[globalKey], prefs);
    extraIds = Array.isArray(data[extrasKey]) ? [...new Set(data[extrasKey].filter(id => typeof id === 'string'))] : [];
    const extraKeys = extraIds.map(id => processKey + ':note:' + id);
    const extraData = extraKeys.length ? await chrome.storage.local.get(extraKeys) : {};
    main = createCard(prefs.scope === 'permanente' ? globalKey : processKey, true);
    extraIds.forEach((id, index) => {
      const key = extraKeys[index]; records[key] = normalize(extraData[key]); createCard(key, false, id);
    });
  }).catch(error => { console.error('[Projudi Anotações] Não foi possível carregar as notas:', error); });
})();
