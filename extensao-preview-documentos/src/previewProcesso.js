// Projudi/SEEU - Pré-visualização do processo nas listas de decurso de
// prazo, na Análise de Juntadas, nas Conclusões, nos cumprimentos, no Expedir
// Intimações/Citação e nos Paralisados (e, no SEEU, nas Execuções e no
// Painel de Incidentes)
//
// Nas telas de decurso de prazo do menu "Decurso de Prazo" — Intimação
// (processo/intimacaoBusca.do), Intimação de Auxiliares da Justiça
// (processo/intimacaoNomeados.do) e Citações/Notificações
// (processo/citacao.do) — e na lista da Análise de Juntadas
// (processo/analisarJuntada.do) e nas listas de cumprimentos — Demais
// Cumprimentos (processo/cumprimentoCartorio.do) e Mandados
// (processo/cumprimentoCartorioMandado.do) — e na lista de Processos
// Paralisados (processo/processoBuscaParalisado.do), a coluna Processo traz
// o número como link para a tela dele
// (`<a class="link" href="/projudi/processo.do?_tj=...">
// <em class="attention">NNNNNNN-DD.AAAA...</em></a>`).
//
// Na lista de Conclusões (processo/conclusao.do) o número é só texto
// (`<em class="attention">` sem link). Lá o endereço do processo é lido na
// tela do "Analisar" da mesma linha (leitura direta, sem abrir nada — a
// mesma que previewConclusao.js já lê ao pousar o mouse no "Analisar") e,
// se não vier, o painel abre a busca por número do Projudi (preenchida por
// clipboardProcess.js) e segue o único resultado. O "Analisar" continua com
// a pré-visualização do documento do Juiz (previewConclusao.js).
//
// Nos cumprimentos só vale o link dentro da tabela da lista
// (table.resultTable): a tela de um cumprimento (mesmo endereço, link
// "Visualizar") também tem o link do processo, ao lado do "Identificador do
// Cumprimento", e ali fica como sempre.
//
// Expedir Intimações (processo/expedirIntimacao.do) e Expedir Citação
// (processo/expedirCitacao.do): vale o link do número e, se o número
// estiver só como texto (<em class="attention">), o endereço vem de um link
// do processo na mesma linha ou, sem ele, da busca por número.
//
// Ao pousar o mouse sobre esse número, a tela inicial do processo abre num
// painel sobreposto (mesma ideia da pré-visualização de documentos de
// content.js), já na aba "Movimentações": se o Projudi abrir o processo em
// outra aba (ex.: "Informações Gerais"), o próprio item de aba nativo
// "Movimentações" (onclick com setTab(..., 'tabMovimentacoesProcesso')) é
// clicado dentro do painel. A lista nunca navega: o painel fecha ao tirar o
// mouse dele (ou com "✕"/Esc); "📌 Fixar" o mantém aberto até o "✕".
//
// SEEU: as mesmas listas (com /seeu/ no lugar de /projudi/), mais a de
// Processos Suspensos (processo/processoBuscaSuspenso.do), as Execuções (processo.do, que no SEEU é uma lista, não a tela do processo) e
// o Painel de Incidentes (processo/criminal/execucao/pendencia_incidente.do).
// Em todas o número é link para a tela do processo, que no SEEU é
// visualizacaoProcesso.do (`<a class="link" href="/seeu/visualizacaoProcesso.do?_tj=...">
// <em class="attention">NNNNNNN-DD.AAAA...</em></a>`), dentro da tabela da
// lista (table.resultTable) — inclusive nas Conclusões, onde no SEEU o
// número já é link. Só vale o link dentro dessa tabela.
//
// O quadro do painel é marcado como popup (classe pdp-proc-preview-iframe,
// reconhecida pelo Menu e pelos cards dos Sistemas do CNJ, e o atributo
// data-pdp-hide-button-group, de uiVisibility.js): a balança, os cards e o
// grupo de botões flutuantes ficam só na tela principal.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpPreviewProcesso) return;

	const TELAS = /^\/projudi\/processo\/(intimacaoBusca|intimacaoNomeados|citacao|analisarJuntada|conclusao|cumprimentoCartorio|cumprimentoCartorioMandado|expedirIntimacao|expedirCitacao|processoBuscaParalisado)\.do$/;
	const TELAS_SEEU = /^\/seeu\/(processo|processo\/(intimacaoBusca|intimacaoNomeados|citacao|analisarJuntada|conclusao|cumprimentoCartorio|cumprimentoCartorioMandado|processoBuscaParalisado|processoBuscaSuspenso)|processo\/criminal\/execucao\/pendencia_incidente)\.do$/;
	const NO_SEEU = TELAS_SEEU.test(location.pathname);
	if (!NO_SEEU && !TELAS.test(location.pathname)) return;
	const NA_CONCLUSAO = location.pathname === "/projudi/processo/conclusao.do";
	const NO_EXPEDIR = /\/expedir(Intimacao|Citacao)\.do$/.test(location.pathname);
	const NOS_CUMPRIMENTOS = /\/cumprimentoCartorio(Mandado)?\.do$/.test(location.pathname);
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	window.__pdpPreviewProcesso = true;

	const PROCESSO_PATH = NO_SEEU ? "/seeu/visualizacaoProcesso.do" : "/projudi/processo.do";
	const CONCLUSAO_PATH = "/projudi/processo/conclusao.do";
	const BUSCA_PATH = "/projudi/processo/buscaProcesso.do";
	// Sem resultado da busca nesse tempo, mostra o painel como estiver.
	const BUSCA_TIMEOUT_MS = 15000;
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
	let activeLink = null; // link do número ou, nas Conclusões, o <em> do número
	let openTimer = null;
	let closeTimer = null;
	let tabClicks = 0;
	let fixado = false;
	let buscaTimer = null;
	let buscaCargas = 0;
	// Número só como texto: endereço do processo já descoberto para cada <em>.
	const urlCache = new WeakMap();

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
		if ((NOS_CUMPRIMENTOS || NO_SEEU) && !link.closest("table.resultTable")) return null;
		return link;
	}

	// Conclusões: link "Analisar" da linha (conclusao.do?_tj=..., sem o "#"
	// do botão de copiar o número).
	function analisarDaLinha(row) {
		if (!row) return null;
		for (const a of row.querySelectorAll("a.link[href]")) {
			const href = a.getAttribute("href") || "";
			if (href.indexOf("#") !== -1) continue;
			try {
				const url = new URL(href, location.href);
				if (url.origin === location.origin && url.pathname === CONCLUSAO_PATH && url.search) return url.href;
			} catch (e) { /* segue */ }
		}
		return null;
	}

	// Número do processo só como texto (não link) numa linha da lista:
	// Conclusões (linha com o "Analisar") e Expedir Intimações/Citação.
	function findNumeroTexto(target) {
		const em = target && target.closest ? target.closest("em.attention") : null;
		if (!em || (panel && panel.wrap.contains(em)) || em.closest("a[href]")) return null;
		if (!CNJ.test(em.textContent || "")) return null;
		const row = em.closest("tr");
		if (!row || !em.closest("td")) return null;
		if (NA_CONCLUSAO) return analisarDaLinha(row) ? em : null;
		return NO_EXPEDIR ? em : null;
	}

	function findAlvo(target) {
		if (NO_SEEU) return findProcessLink(target);
		if (NA_CONCLUSAO) return findNumeroTexto(target);
		return findProcessLink(target) || (NO_EXPEDIR ? findNumeroTexto(target) : null);
	}

	// Link do processo em outra coluna da mesma linha.
	function linkDaLinha(row) {
		if (!row) return null;
		for (const a of row.querySelectorAll("a[href]")) {
			try {
				const url = new URL(a.getAttribute("href"), location.href);
				if (url.origin === location.origin && url.pathname === PROCESSO_PATH && url.search) return url.href;
			} catch (e) { /* segue */ }
		}
		return null;
	}

	function urlDaBusca(alvo) {
		return location.origin + BUSCA_PATH + "?actionType=iniciarSimples#pdp-search=" + encodeURIComponent(numeroDoProcesso(alvo));
	}

	async function urlPelaLinha(alvo) {
		const daLinha = linkDaLinha(alvo.closest("tr"));
		if (daLinha) return daLinha;
		if (!NA_CONCLUSAO) return null;
		const analisar = analisarDaLinha(alvo.closest("tr"));
		if (!analisar) return null;
		const resposta = await fetch(analisar, { credentials: "same-origin" });
		if (!resposta.ok) return null;
		const doc = new DOMParser().parseFromString(await resposta.text(), "text/html");
		for (const a of doc.querySelectorAll("a[href]")) {
			try {
				const url = new URL(a.getAttribute("href"), resposta.url);
				if (url.origin === location.origin && url.pathname === PROCESSO_PATH && url.search) return url.href;
			} catch (e) { /* segue */ }
		}
		return null;
	}

	// Endereço a abrir no painel: o do link ou, com o número só como texto,
	// o de um link do processo na linha, o descoberto pela tela do
	// "Analisar" (Conclusões) ou, se nada vier, a busca por número.
	function urlDoAlvo(alvo) {
		if (alvo.tagName === "A") return Promise.resolve(new URL(alvo.getAttribute("href"), location.href).href);
		let p = urlCache.get(alvo);
		if (!p) {
			p = urlPelaLinha(alvo)
				.catch(function () { return null; })
				.then(function (url) {
					if (!url) urlCache.delete(alvo); // tenta ler de novo na próxima vez
					return url || urlDaBusca(alvo);
				});
			urlCache.set(alvo, p);
		}
		return p;
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

		// À direita do número (a coluna fica à esquerda); sem espaço,
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

		clearTimeout(buscaTimer);
		buscaCargas = 0;
		p.title.textContent = "Processo " + numeroDoProcesso(link) + " — Movimentações";
		p.loading.textContent = link.tagName === "A" ? "Carregando o processo…" : "Localizando o processo…";
		p.wrap.classList.remove("pdp-pp-loaded");
		p.frame.src = "about:blank";
		if (link.tagName !== "A") p.openTab.href = urlDaBusca(link);

		positionPanel(link);
		p.wrap.classList.add("pdp-pp-visible");

		urlDoAlvo(link).then(function (href) {
			if (!panel || activeLink !== link) return; // o mouse já foi para outro
			panel.openTab.href = href;
			panel.loading.textContent = "Carregando o processo…";
			panel.frame.src = href;
		});
	}

	function closeNow() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		if (!panel) return;
		clearTimeout(buscaTimer);
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
		clearTimeout(buscaTimer);
		if (panel) panel.wrap.classList.add("pdp-pp-loaded");
	}

	// Busca por número (Conclusões, sem endereço na tela do "Analisar"): a
	// 1ª carga é o formulário, que clipboardProcess.js preenche e envia; no
	// resultado, um único processo é aberto no painel; senão, mostra a busca.
	function seguirBusca(doc) {
		const links = new Set();
		doc.querySelectorAll("a[href]").forEach(function (a) {
			try {
				const url = new URL(a.getAttribute("href"), doc.URL);
				if (url.origin === location.origin && url.pathname === PROCESSO_PATH && url.search) links.add(url.href);
			} catch (e) { /* segue */ }
		});
		if (links.size === 1) {
			const href = links.values().next().value;
			panel.openTab.href = href;
			panel.frame.src = href;
			return;
		}
		if (++buscaCargas > 1 || links.size > 1 || !doc.getElementById("buscaProcessoForm")) {
			marcarCarregado();
			return;
		}
		clearTimeout(buscaTimer);
		buscaTimer = setTimeout(marcarCarregado, BUSCA_TIMEOUT_MS);
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
		let path = "";
		try { path = new URL(doc.URL).pathname; } catch (e) { /* segue */ }
		if (path === BUSCA_PATH) {
			seguirBusca(doc);
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
			const link = findAlvo(e.target);
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
			const link = findAlvo(e.target);
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
