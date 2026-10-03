// Projudi - Pré-visualização do processo nas listas de decurso de prazo
//
// Nas telas de decurso de prazo do menu "Decurso de Prazo" — Intimação
// (processo/intimacaoBusca.do), Intimação de Auxiliares da Justiça
// (processo/intimacaoNomeados.do) e Citações/Notificações
// (processo/citacao.do) — a 1ª coluna traz o número do processo como link
// para a tela dele (`<a class="link" href="/projudi/processo.do?_tj=...">
// <em class="attention">NNNNNNN-DD.AAAA...</em></a>`).
//
// Ao pousar o mouse sobre esse número, a tela inicial do processo abre num
// painel sobreposto (mesma ideia da pré-visualização de documentos de
// content.js), já na aba "Movimentações": se o Projudi abrir o processo em
// outra aba (ex.: "Informações Gerais"), o próprio item de aba nativo
// "Movimentações" (onclick com setTab(..., 'tabMovimentacoesProcesso')) é
// clicado dentro do painel. A lista nunca navega: o painel fecha ao tirar o
// mouse dele (ou com "✕"/Esc); "📌 Fixar" o mantém aberto até o "✕".
//
// O quadro do painel é marcado como popup (classe pdp-proc-preview-iframe,
// reconhecida pelo Menu e pelos cards dos Sistemas do CNJ, e o atributo
// data-pdp-hide-button-group, de uiVisibility.js): a balança, os cards e o
// grupo de botões flutuantes ficam só na tela principal.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpPreviewProcesso) return;

	const TELAS = /^\/projudi\/processo\/(intimacaoBusca|intimacaoNomeados|citacao)\.do$/;
	if (!TELAS.test(location.pathname)) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	window.__pdpPreviewProcesso = true;

	const PROCESSO_PATH = "/projudi/processo.do";
	const MOVIMENTACOES_TAB_ID = "tabMovimentacoesProcesso";
	const IFRAME_CLASS = "pdp-proc-preview-iframe";
	const OPEN_DELAY_MS = 450;
	const CLOSE_DELAY_MS = 300;
	const PANEL_WIDTH = 1100;
	const PANEL_HEIGHT_RATIO = 0.88;
	const MARGIN = 12;
	// Trocas de aba seguidas (dentro do painel) até desistir e mostrar a tela
	// como estiver — nunca entra em laço.
	const MAX_TAB_CLICKS = 2;
	const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

	let panel = null;
	let activeLink = null;
	let openTimer = null;
	let closeTimer = null;
	let tabClicks = 0;
	let fixado = false;

	// Link do número do processo (não os demais links da linha, como a data
	// do prazo ou as partes, que apontam para outras telas).
	function findProcessLink(target) {
		const link = target && target.closest ? target.closest("a[href]") : null;
		if (!link || (panel && panel.wrap.contains(link))) return null;
		let url;
		try {
			url = new URL(link.getAttribute("href"), location.href);
		} catch (e) {
			return null;
		}
		if (url.origin !== location.origin || url.pathname !== PROCESSO_PATH || !url.search) return null;
		if (!link.closest("td")) return null;
		return link;
	}

	function numeroDoProcesso(link) {
		const m = CNJ.exec(link.textContent || "");
		return m ? m[0] : (link.textContent || "").replace(/\s+/g, " ").trim();
	}

	function buildPanel() {
		const wrap = document.createElement("div");
		wrap.className = "pdp-pp-overlay";
		wrap.innerHTML =
			'<div class="pdp-pp-panel">' +
			'<div class="pdp-pp-header">' +
			'<span class="pdp-pp-title"></span>' +
			'<span class="pdp-pp-actions">' +
			'<button type="button" class="pdp-pp-pin" title="Manter o painel aberto ao tirar o mouse">📌 Fixar</button>' +
			'<a class="pdp-pp-open-tab" target="_blank" rel="noopener" title="Abrir o processo numa nova aba">Abrir em nova aba ↗</a>' +
			'<button type="button" class="pdp-pp-close" title="Fechar (Esc)">✕</button>' +
			"</span></div>" +
			'<div class="pdp-pp-body"><div class="pdp-pp-loading">Carregando o processo…</div></div>' +
			"</div>";
		const iframe = document.createElement("iframe");
		iframe.className = IFRAME_CLASS;
		iframe.setAttribute("data-pdp-hide-button-group", "");
		iframe.addEventListener("load", onFrameLoad);
		wrap.querySelector(".pdp-pp-body").appendChild(iframe);
		wrap.addEventListener("mouseenter", cancelClose);
		wrap.addEventListener("mouseleave", scheduleClose);
		wrap.querySelector(".pdp-pp-close").addEventListener("click", closeNow);
		wrap.querySelector(".pdp-pp-pin").addEventListener("click", function () {
			setFixado(!fixado);
		});
		document.body.appendChild(wrap);
		return {
			wrap: wrap,
			title: wrap.querySelector(".pdp-pp-title"),
			openTab: wrap.querySelector(".pdp-pp-open-tab"),
			pin: wrap.querySelector(".pdp-pp-pin"),
			loading: wrap.querySelector(".pdp-pp-loading"),
			frame: iframe
		};
	}

	// A lista pode ser recarregada por partes (ordenação, paginação): recria
	// o painel se ele tiver saído da página.
	function ensurePanel() {
		if (panel && !panel.wrap.isConnected) panel = null;
		if (!panel) panel = buildPanel();
		return panel;
	}

	function setFixado(valor) {
		fixado = !!valor;
		if (!panel) return;
		panel.wrap.classList.toggle("pdp-pp-fixado", fixado);
		panel.pin.textContent = fixado ? "📌 Fixado" : "📌 Fixar";
		panel.pin.title = fixado ? "Clique para o painel voltar a fechar ao tirar o mouse" : "Manter o painel aberto ao tirar o mouse";
		if (fixado) cancelClose();
	}

	function positionPanel(link) {
		const rect = link.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(PANEL_WIDTH, vw - MARGIN * 2);
		const height = Math.min(vh * PANEL_HEIGHT_RATIO, vh - MARGIN * 2);

		// À direita do número (a 1ª coluna fica à esquerda); sem espaço,
		// centralizado na tela.
		let left = rect.right + MARGIN;
		if (left + width > vw - MARGIN) left = Math.max(MARGIN, (vw - width) / 2);
		let top = rect.top - height / 2 + rect.height / 2;
		top = Math.min(Math.max(top, MARGIN), vh - height - MARGIN);

		const st = panel.wrap.style;
		st.left = left + "px";
		st.top = top + "px";
		st.width = width + "px";
		st.height = height + "px";
	}

	function show(link) {
		const p = ensurePanel();
		if (activeLink === link && p.wrap.classList.contains("pdp-pp-visible")) return;
		activeLink = link;
		tabClicks = 0;
		setFixado(false);

		const href = new URL(link.getAttribute("href"), location.href).href;
		p.title.textContent = "Processo " + numeroDoProcesso(link) + " — Movimentações";
		p.openTab.href = href;
		p.loading.textContent = "Carregando o processo…";
		p.wrap.classList.remove("pdp-pp-loaded");
		p.frame.src = href;

		positionPanel(link);
		p.wrap.classList.add("pdp-pp-visible");
	}

	function closeNow() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		if (!panel) return;
		panel.wrap.classList.remove("pdp-pp-visible", "pdp-pp-loaded");
		panel.frame.src = "about:blank";
		activeLink = null;
		setFixado(false);
	}

	function scheduleClose() {
		clearTimeout(openTimer);
		if (fixado) return;
		clearTimeout(closeTimer);
		closeTimer = setTimeout(closeNow, CLOSE_DELAY_MS);
	}

	function cancelClose() {
		clearTimeout(closeTimer);
	}

	// Item de aba nativo "Movimentações" (onclick com setTab(...)).
	function findMovimentacoesTab(doc) {
		return Array.prototype.find.call(doc.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && onclick.indexOf(MOVIMENTACOES_TAB_ID) !== -1;
		}) || null;
	}

	function estaNaAbaMovimentacoes(doc) {
		const form = doc.getElementById("processoForm");
		const campo = form && form.elements ? form.elements.namedItem("selectedIcon") : null;
		if (campo && campo.value) return campo.value === MOVIMENTACOES_TAB_ID;
		// Sem o campo: considera aberta se já há linhas de movimentação.
		return !!doc.querySelector('tr[id^="mov1Grau"]');
	}

	function marcarCarregado() {
		if (panel) panel.wrap.classList.add("pdp-pp-loaded");
	}

	function onFrameLoad() {
		if (!panel || !activeLink) return;
		let doc = null;
		try {
			doc = panel.frame.contentDocument;
		} catch (e) { /* outro endereço: mostra como estiver */ }
		if (!doc || !doc.body || doc.URL === "about:blank") {
			if (doc && doc.URL === "about:blank") return;
			marcarCarregado();
			return;
		}
		if (!doc.getElementById("processoForm") || estaNaAbaMovimentacoes(doc) || tabClicks >= MAX_TAB_CLICKS) {
			marcarCarregado();
			return;
		}
		const tab = findMovimentacoesTab(doc);
		if (!tab) {
			marcarCarregado();
			return;
		}
		tabClicks++;
		panel.loading.textContent = "Abrindo a aba Movimentações…";
		tab.click();
		// A troca de aba pode ser feita sem recarregar o quadro: confere de
		// novo em seguida e, se nada mudar, mostra a tela como estiver.
		const docAntes = doc;
		let tentativas = 0;
		(function conferir() {
			if (!panel || !activeLink || panel.wrap.classList.contains("pdp-pp-loaded")) return;
			let atual = null;
			try { atual = panel.frame.contentDocument; } catch (e) { /* segue */ }
			if (atual !== docAntes) return; // recarregou: onFrameLoad confere
			if (estaNaAbaMovimentacoes(atual) || ++tentativas > 40) {
				marcarCarregado();
				return;
			}
			setTimeout(conferir, 150);
		})();
	}

	document.addEventListener(
		"mouseover",
		function (e) {
			const link = findProcessLink(e.target);
			if (!link) return;
			cancelClose();
			clearTimeout(openTimer);
			if (fixado && panel && panel.wrap.classList.contains("pdp-pp-visible")) return;
			openTimer = setTimeout(function () {
				show(link);
			}, OPEN_DELAY_MS);
		},
		true
	);

	document.addEventListener(
		"mouseout",
		function (e) {
			const link = findProcessLink(e.target);
			if (!link) return;
			const toEl = e.relatedTarget;
			if (toEl && link.contains(toEl)) return;
			if (panel && toEl && panel.wrap.contains(toEl)) return;
			scheduleClose();
		},
		true
	);

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") closeNow();
	});
})();
