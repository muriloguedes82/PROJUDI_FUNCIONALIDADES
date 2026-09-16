// Projudi/SEEU - Destaque de movimentações por tipo de usuário
//
// Na aba "Movimentações" do processo, a tabela tem uma coluna "Movimentado
// Por" com o nome de quem fez a movimentação e, logo abaixo, o papel dessa
// pessoa no processo (ex.: "Magistrada", "Ministério Público", "Advogado").
// Este script lê a preferência salva em chrome.storage.sync (configurada na
// tela de opções da extensão) e, quando habilitada para um papel, destaca
// (com uma cor à esquerda) toda linha da tabela cuja coluna "Movimentado
// Por" mencione esse papel — para qualquer processo, sem precisar repetir a
// configuração.

(function () {
	"use strict";

	// Não faz sentido (e pode até confundir o usuário) destacar linhas
	// dentro do iframe oculto usado por content.js para varrer pendências —
	// ele não é exibido, então evitamos processá-lo.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpMovementHighlightInjected) return;
	window.__pdpMovementHighlightInjected = true;

	const STORAGE_KEY = "movementHighlightPrefs";
	const HEADER_TEXT = /^movimentado\s+por$/i;
	const ROW_SIGNATURE_ATTR = "data-pdp-mv-sig";

	const ROLE_DEFS = [
		{ key: "magistrado", pattern: /\bmagistrad[oa]\b/i },
		{ key: "ministerioPublico", pattern: /minist[ée]rio\s+p[uú]blico/i },
		{ key: "advogado", pattern: /\badvogad[oa]\b/i },
	];

	let prefs = null; // carregado de chrome.storage.sync

	function loadPrefs() {
		return chrome.storage.sync.get([STORAGE_KEY]).then(function (data) {
			prefs = data[STORAGE_KEY] || {};
		});
	}

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "sync" || !changes[STORAGE_KEY]) return;
		prefs = changes[STORAGE_KEY].newValue || {};
		clearAllHighlights();
		highlightAll();
	});

	function activeRoles() {
		if (!prefs) return [];
		return ROLE_DEFS.filter(function (role) {
			const pref = prefs[role.key];
			return pref && pref.enabled;
		});
	}

	function roleColor(key) {
		const pref = prefs && prefs[key];
		return (pref && pref.color) || "#888";
	}

	// Encontra, em cada tabela da página, a célula de cabeçalho "Movimentado
	// Por" e devolve {table, headerRow, columnIndex}. Não assume classes ou
	// ids específicos — só o texto do cabeçalho, que é estável entre telas.
	function findMovimentacoesColumns() {
		const results = [];
		const cells = document.querySelectorAll("table th, table td");
		cells.forEach(function (cell) {
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

	function clearRowHighlight(row) {
		row.style.removeProperty("box-shadow");
		row.removeAttribute(ROW_SIGNATURE_ATTR);
	}

	function clearAllHighlights() {
		document.querySelectorAll("[" + ROW_SIGNATURE_ATTR + "]").forEach(clearRowHighlight);
	}

	function applyRowHighlight(row, matchedRoles) {
		const signature = matchedRoles.map(function (r) { return r.key; }).join(",");
		if (!signature) {
			if (row.hasAttribute(ROW_SIGNATURE_ATTR)) clearRowHighlight(row);
			return;
		}
		if (row.getAttribute(ROW_SIGNATURE_ATTR) === signature) return;

		const shadows = matchedRoles.map(function (role, index) {
			const offset = 4 + index * 4;
			return "inset " + offset + "px 0 0 0 " + roleColor(role.key);
		});
		row.style.setProperty("box-shadow", shadows.join(", "), "important");
		row.setAttribute(ROW_SIGNATURE_ATTR, signature);
	}

	function highlightAll() {
		const roles = activeRoles();
		if (!roles.length) {
			clearAllHighlights();
			return;
		}

		const columns = findMovimentacoesColumns();
		columns.forEach(function (info) {
			const rows = Array.prototype.filter.call(info.table.rows, function (row) {
				return row !== info.headerRow;
			});
			rows.forEach(function (row) {
				const cell = row.children[info.columnIndex];
				if (!cell) return;
				const text = cell.textContent || "";
				const matched = roles.filter(function (role) {
					return role.pattern.test(text);
				});
				applyRowHighlight(row, matched);
			});
		});
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
	// substituindo trechos do DOM via AJAX, então reavaliamos a cada
	// mudança relevante — igual ao padrão já usado pelos demais scripts
	// desta extensão para sobreviver a essas trocas.
	const observer = new MutationObserver(scheduleHighlight);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	setInterval(scheduleHighlight, 1000);
})();
