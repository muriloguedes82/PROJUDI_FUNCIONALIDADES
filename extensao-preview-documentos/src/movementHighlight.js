// Projudi/SEEU - Destaque de movimentações por tipo de usuário
//
// Na aba "Movimentações" do processo, cada linha da tabela mostra na
// coluna "Movimentado Por" quem fez a movimentação e, logo abaixo do
// nome, o papel dessa pessoa no processo (ex.: "Magistrada", "Membro(a)
// do Ministério Público", "Advogado"). Inspecionando o HTML real da
// tela, cada <tr> de movimentação no Projudi tem um id no formato
// "mov1Grau,GRUPO,,,,," (ex.: "mov1Grau,ADVOGADO,,,,,",
// "mov1Grau,JUIZ,,,,,", "mov1Grau,PROMOTOR,,,,,") — a mesma informação
// usada pelo quadro nativo "Realces" do Projudi. Usamos esse id (mais
// confiável do que ler o texto da coluna) para saber o grupo de cada
// linha; quando ele não existir (ex.: SEEU, ou uma tela em formato
// diferente), caímos de volta na leitura do texto da coluna "Movimentado
// Por".
//
// Diferente do quadro "Realces" do próprio Projudi (que também faz
// esse destaque, mas com cores fixas e sem lembrar a preferência entre
// processos), aqui o usuário escolhe quais tipos destacar e com qual
// cor, uma vez, na tela de opções (aberta como um popup dentro da própria
// aba do processo, pelo botão "Destacar movimentações" do painel de Ações
// Rápidas) — a preferência salva se aplica automaticamente depois, em
// qualquer processo.

(function () {
	"use strict";

	// Evita rodar dentro do iframe oculto usado por content.js para varrer
	// pendências, e no iframe/popup de ações rápidas — não fazem sentido
	// ali.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpMovementHighlightInjected) return;
	window.__pdpMovementHighlightInjected = true;

	const STORAGE_KEY = "movementHighlightPrefs";
	const ROW_ID_PREFIX = "mov1Grau,";
	const APPLIED_ATTR = "data-pdp-mv-applied";
	const HEADER_TEXT = /^movimentado\s+por$/i;

	// Ordem de prioridade quando uma linha corresponde a mais de um tipo
	// marcado (raro): usa só a cor do primeiro que bater nesta lista.
	const ROLE_DEFS = [
		{
			key: "magistrado",
			label: "Magistrado / Magistrada",
			defaultColor: "#f6a3a3",
			rowGroups: ["JUIZ"],
			textPattern: /\bmagistrad[oa]\b/i,
		},
		{
			key: "ministerioPublico",
			label: "Ministério Público",
			defaultColor: "#a3e6a3",
			rowGroups: ["PROMOTOR"],
			textPattern: /minist[ée]rio\s+p[uú]blico/i,
		},
		{
			key: "advogado",
			label: "Advogado / Advogada",
			defaultColor: "#a3c9f6",
			rowGroups: ["ADVOGADO"],
			textPattern: /\badvogad[oa]\b/i,
		},
	];

	let prefs = {};

	function defaultPrefs() {
		const out = {};
		ROLE_DEFS.forEach(function (role) {
			out[role.key] = { enabled: false, color: role.defaultColor };
		});
		return out;
	}

	function loadPrefs() {
		return chrome.storage.sync.get([STORAGE_KEY]).then(function (data) {
			prefs = Object.assign(defaultPrefs(), data[STORAGE_KEY]);
			ROLE_DEFS.forEach(function (role) {
				prefs[role.key] = Object.assign({ enabled: false, color: role.defaultColor }, prefs[role.key]);
			});
		});
	}

	function savePrefs(newPrefs) {
		prefs = newPrefs;
		return chrome.storage.sync.set({ [STORAGE_KEY]: newPrefs });
	}

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "sync" || !changes[STORAGE_KEY]) return;
		prefs = Object.assign(defaultPrefs(), changes[STORAGE_KEY].newValue);
		clearAllHighlights();
		scheduleHighlight();
	});

	// -------------------------------------------------------------------
	// Destaque das linhas
	// -------------------------------------------------------------------

	function rowGroupFromId(row) {
		if (!row.id || row.id.indexOf(ROW_ID_PREFIX) !== 0) return null;
		const rest = row.id.slice(ROW_ID_PREFIX.length);
		const comma = rest.indexOf(",");
		return comma === -1 ? rest : rest.slice(0, comma);
	}

	function matchedRoleForGroup(group) {
		if (!group) return null;
		return ROLE_DEFS.find(function (role) {
			return role.rowGroups.indexOf(group) !== -1;
		});
	}

	// Usado só quando a linha não tem o id "mov1Grau,GRUPO,..." (fora do
	// Projudi, ou tela em formato diferente): localiza a coluna
	// "Movimentado Por" pelo texto do cabeçalho e testa o texto da célula.
	function findMovimentadoPorColumns() {
		const results = [];
		document.querySelectorAll("table th, table td").forEach(function (cell) {
			const text = (cell.textContent || "").trim();
			if (!HEADER_TEXT.test(text)) return;
			const row = cell.parentElement;
			const table = cell.closest("table");
			if (!row || !table) return;
			const columnIndex = Array.prototype.indexOf.call(row.children, cell);
			if (columnIndex < 0) return;
			results.push({ table: table, headerRow: row, columnIndex: columnIndex });
		});
		return results;
	}

	function hexToRgba(hex, alpha) {
		const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
		if (!match) return null;
		const r = parseInt(match[1], 16);
		const g = parseInt(match[2], 16);
		const b = parseInt(match[3], 16);
		return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	}

	function clearRowHighlight(row) {
		row.style.removeProperty("background-color");
		row.querySelectorAll("td").forEach(function (td) {
			td.style.removeProperty("background-color");
		});
		row.removeAttribute(APPLIED_ATTR);
	}

	function clearAllHighlights() {
		document.querySelectorAll("[" + APPLIED_ATTR + "]").forEach(clearRowHighlight);
	}

	function applyRowColor(row, role) {
		if (!role) {
			if (row.hasAttribute(APPLIED_ATTR)) clearRowHighlight(row);
			return;
		}
		const pref = prefs[role.key];
		if (!pref || !pref.enabled) {
			if (row.hasAttribute(APPLIED_ATTR)) clearRowHighlight(row);
			return;
		}
		const signature = role.key + ":" + pref.color;
		if (row.getAttribute(APPLIED_ATTR) === signature) return;

		const color = hexToRgba(pref.color, 0.65) || pref.color;
		row.style.setProperty("background-color", color, "important");
		row.querySelectorAll("td").forEach(function (td) {
			td.style.setProperty("background-color", color, "important");
		});
		row.setAttribute(APPLIED_ATTR, signature);
	}

	function highlightByRowId() {
		const rows = document.querySelectorAll('tr[id^="' + ROW_ID_PREFIX + '"]');
		if (!rows.length) return false;
		rows.forEach(function (row) {
			const group = rowGroupFromId(row);
			const role = matchedRoleForGroup(group);
			applyRowColor(row, role);
		});
		return true;
	}

	function highlightByColumnText() {
		const columns = findMovimentadoPorColumns();
		columns.forEach(function (info) {
			const rows = Array.prototype.filter.call(info.table.rows, function (row) {
				return row !== info.headerRow;
			});
			rows.forEach(function (row) {
				const cell = row.children[info.columnIndex];
				if (!cell) return;
				const text = cell.textContent || "";
				const role = ROLE_DEFS.find(function (r) {
					return r.textPattern.test(text);
				});
				applyRowColor(row, role);
			});
		});
	}

	function highlightAll() {
		if (!highlightByRowId()) highlightByColumnText();
	}

	let scheduled = false;
	function scheduleHighlight() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(function () {
			scheduled = false;
			try {
				highlightAll();
			} catch (err) {
				console.error("[Projudi Destaque de Movimentações]", "erro ao destacar:", err);
			}
		});
	}

	loadPrefs().then(scheduleHighlight);

	// A tela troca de aba (Movimentações → Partes → Movimentações de novo)
	// substituindo trechos do DOM via AJAX — reavaliamos a cada mudança
	// relevante, igual ao padrão já usado pelos demais scripts desta
	// extensão para sobreviver a essas trocas.
	const observer = new MutationObserver(scheduleHighlight);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	setInterval(scheduleHighlight, 1000);

	// -------------------------------------------------------------------
	// Popup de configuração (aberto pelo botão do painel de Ações Rápidas)
	// -------------------------------------------------------------------

	const MODAL_ID = "pdp-mv-config-modal";

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text == null ? "" : String(text);
		return div.innerHTML;
	}

	function closeConfigModal() {
		const el = document.getElementById(MODAL_ID);
		if (el) el.remove();
	}

	function openConfigModal() {
		closeConfigModal();

		const backdrop = document.createElement("div");
		backdrop.id = MODAL_ID;
		backdrop.className = "pdp-mv-backdrop";

		const rowsHtml = ROLE_DEFS.map(function (role) {
			const pref = prefs[role.key] || { enabled: false, color: role.defaultColor };
			return (
				'<label class="pdp-mv-row">' +
				'<input type="checkbox" class="pdp-mv-enabled" data-role="' + role.key + '"' + (pref.enabled ? " checked" : "") + ">" +
				'<span class="pdp-mv-role-label">' + escapeHtml(role.label) + "</span>" +
				'<input type="color" class="pdp-mv-color" data-role="' + role.key + '" value="' + escapeHtml(pref.color) + '" title="Escolher a cor de destaque para ' + escapeHtml(role.label) + '">' +
				"</label>"
			);
		}).join("");

		backdrop.innerHTML =
			'<div class="pdp-mv-box">' +
			'<div class="pdp-mv-header"><span>Destacar movimentações por tipo de usuário</span>' +
			'<button type="button" class="pdp-mv-close">✕ Fechar</button></div>' +
			'<div class="pdp-mv-body">' +
			'<p class="pdp-mv-help">Marque os tipos de usuário cujas movimentações você quer destacar e escolha a cor de cada um clicando na amostra de cor. A preferência vale para todos os processos, assim que você salvar.</p>' +
			rowsHtml +
			"</div>" +
			'<div class="pdp-mv-footer">' +
			'<button type="button" class="pdp-mv-save">Salvar</button>' +
			'<span class="pdp-mv-status"></span>' +
			"</div>" +
			"</div>";

		document.body.appendChild(backdrop);

		backdrop.addEventListener("click", function (event) {
			if (event.target === backdrop) closeConfigModal();
		});
		backdrop.querySelector(".pdp-mv-close").addEventListener("click", closeConfigModal);

		backdrop.querySelector(".pdp-mv-save").addEventListener("click", function () {
			const newPrefs = defaultPrefs();
			backdrop.querySelectorAll(".pdp-mv-enabled").forEach(function (input) {
				newPrefs[input.dataset.role].enabled = input.checked;
			});
			backdrop.querySelectorAll(".pdp-mv-color").forEach(function (input) {
				newPrefs[input.dataset.role].color = input.value;
			});
			savePrefs(newPrefs).then(function () {
				clearAllHighlights();
				scheduleHighlight();
				const status = backdrop.querySelector(".pdp-mv-status");
				status.textContent = "Preferência salva.";
				setTimeout(closeConfigModal, 900);
			});
		});
	}

	window.__pdpOpenMovementHighlightConfig = openConfigModal;
})();
