// Projudi/SEEU - Movimentação de referência para as Ações rápidas
//
// No Projudi, quem movimenta à mão escolhe primeiro a movimentação (clica no
// evento, na aba Movimentações, e depois em "Movimentar a Partir Desta
// Movimentação") e só então a ação (Realizar Remessa, Intimar Partes,
// Ordenar Cumprimentos...). Essa movimentação é a que aparece para o
// destinatário como referência da remessa/intimação/ordenação.
//
// As Ações rápidas, as preferências e os combos (quickActions.js) escolhem
// essa movimentação sozinhos: a mais recente válida (ver resolveDialogUrl).
// Este arquivo só ACRESCENTA uma caixinha na primeira coluna (à esquerda do
// "Seq.") de cada movimentação válida da aba Movimentações: marcando uma,
// as ações rápidas/preferências/combos partem dela. Só uma fica marcada por vez (marcar outra desmarca a
// anterior). Sem nenhuma marcada, tudo continua como antes.
//
// A marcação vale só para esta tela: ao recarregar (por exemplo, no fim de
// uma ação) ela some, como na movimentação manual. Um combo guarda a
// movimentação marcada no início e a usa em todas as etapas (ver startCombo
// em quickActions.js).
//
// Expõe window.__pdpMovimentoBase.selecionada(): { id, seq, texto, numero }
// da movimentação marcada, ou null.

(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	// Nada nos iframes ocultos/popups desta extensão (a lista pode estar num
	// frame do próprio Projudi, por isso não basta olhar só a janela principal).
	try {
		const frame = window.frameElement;
		if (frame && (frame.hasAttribute("data-pdp-loader") || frame.classList.contains("pdp-qa-fetch-iframe") || frame.classList.contains("pdp-qa-modal-iframe"))) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}
	// Telas sem a fileira de Ações rápidas (ver uiVisibility.js).
	if (window.__pdpButtonGroupBlocked) return;

	if (window.__pdpMovimentoBaseInjected) return;
	window.__pdpMovimentoBaseInjected = true;

	const LOG = "[Projudi Movimentação base]";
	const LINK_SELECTOR = 'a[id^="LNKmov"]';
	const ROW_SELECTOR = 'tr[id^="mov1Grau"]';
	const CHECKBOX_CLASS = "pdp-movbase-chk";
	const ROW_CLASS = "pdp-movbase-row";
	const DIM_CLASS = "pdp-movbase-esmaecida";
	const TITULO =
		"Marque para que as Ações rápidas, as preferências e os combos partam desta movimentação " +
		"(como em \"Movimentar a Partir Desta Movimentação\"). Sem nenhuma marcada, a extensão usa a mais recente.";
	const TITULO_BLOQUEADA = "Já há uma movimentação marcada. Desmarque-a para escolher outra.";
	const TITULO_SEM_LINK = "Esta movimentação não permite movimentar a partir dela.";

	function linkValido(link) {
		return (link.id || "").indexOf("INVALIDO") === -1 && !link.closest("strike, s, del");
	}

	// Número da movimentação (coluna "Seq."): primeira célula numérica da linha.
	function seqDaLinha(row) {
		if (!row) return null;
		const cells = row.querySelectorAll(":scope > td");
		for (let i = 0; i < cells.length; i++) {
			const text = (cells[i].textContent || "").replace(/\s+/g, " ").trim();
			if (/^\d+$/.test(text)) return text;
		}
		return null;
	}

	function limpar(text) {
		return (text || "").replace(/\s+/g, " ").trim();
	}

	// Nome do evento: o texto do próprio link ou, se ele for só um ícone, o
	// título em negrito da linha.
	function textoDoEvento(link, row) {
		const proprio = limpar(link.textContent);
		if (proprio) return proprio.slice(0, 120);
		const titulo = row && row.querySelector("b, strong");
		return limpar(titulo ? titulo.textContent : "").slice(0, 120);
	}

	function linhaDoLink(link) {
		return link.closest(ROW_SELECTOR) || link.closest("tr");
	}

	// Link do evento (o mesmo que leva a "Movimentar a Partir Desta
	// Movimentação") de uma linha; null se a movimentação for inválida.
	function linkDaLinha(row) {
		const links = row.querySelectorAll(LINK_SELECTOR);
		for (let i = 0; i < links.length; i++) {
			if (linkValido(links[i]) && linhaDoLink(links[i]) === row) return links[i];
		}
		return null;
	}

	function numeroProcesso() {
		const el = document.querySelector("em.attention");
		const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((el ? el.textContent : "") + " " + (document.title || ""));
		return match ? match[0] : null;
	}

	function marcarLinha(chk) {
		const row = chk.closest("tr");
		if (row) row.classList.toggle(ROW_CLASS, chk.checked);
	}

	function todasAsCaixas() {
		return Array.prototype.slice.call(document.querySelectorAll("input." + CHECKBOX_CLASS));
	}

	// Com uma marcada, as demais ficam esmaecidas e bloqueadas; para escolher
	// outra, desmarca-se a atual. Sem link de evento válido (movimentação
	// inválida), a caixinha fica sempre bloqueada.
	function atualizarBloqueio() {
		const marcada = todasAsCaixas().filter(function (chk) {
			return chk.checked;
		})[0];
		todasAsCaixas().forEach(function (chk) {
			const semLink = !chk.dataset.movId;
			const bloquear = semLink || (!!marcada && chk !== marcada);
			chk.disabled = bloquear;
			chk.classList.toggle(DIM_CLASS, bloquear);
			chk.title = semLink ? TITULO_SEM_LINK : marcada && chk !== marcada ? TITULO_BLOQUEADA : TITULO;
		});
	}

	function aoMudar(ev) {
		marcarLinha(ev.target);
		atualizarBloqueio();
	}

	function criarCaixa(link) {
		const chk = document.createElement("input");
		chk.type = "checkbox";
		chk.className = CHECKBOX_CLASS;
		chk.title = TITULO;
		chk.setAttribute("aria-label", "Usar esta movimentação nas Ações rápidas");
		if (link) chk.dataset.movId = link.id;
		chk.addEventListener("change", aoMudar);
		// Não deixa o clique chegar a algum onclick nativo da linha.
		chk.addEventListener("click", function (ev) {
			ev.stopPropagation();
		});
		return chk;
	}

	// Linhas de movimentação: as do Projudi (id "mov1Grau,..."), as que
	// tiverem um link de evento e as linhas (com número na coluna "Seq.") da
	// tabela cujo cabeçalho tem "Seq." e "Evento" — haja ou não arquivos.
	function linhasDeMovimentacao() {
		const linhas = new Set(document.querySelectorAll(ROW_SELECTOR));
		document.querySelectorAll(LINK_SELECTOR).forEach(function (link) {
			const row = linhaDoLink(link);
			if (row) linhas.add(row);
		});
		document.querySelectorAll("th").forEach(function (th) {
			if (!/^seq\.?$/i.test(limpar(th.textContent))) return;
			const tabela = th.closest("table");
			if (!tabela || !/evento/i.test(limpar(th.parentNode.textContent))) return;
			Array.prototype.forEach.call(tabela.rows, function (row) {
				if (seqDaLinha(row)) linhas.add(row);
			});
		});
		return Array.from(linhas);
	}

	let ultimoLog = "";
	function aplicar() {
		const linhas = linhasDeMovimentacao();
		let novas = 0;
		let semLink = 0;
		linhas.forEach(function (row) {
			if (row.querySelector(":scope > td > input." + CHECKBOX_CLASS)) return;
			const celula = row.querySelector(":scope > td");
			if (!celula) return;
			const link = linkDaLinha(row);
			if (!link) semLink++;
			celula.insertBefore(criarCaixa(link), celula.firstChild);
			novas++;
		});
		if (novas) atualizarBloqueio();
		// Diagnóstico (F12 → Console, filtro "Movimentação base").
		const resumo = linhas.length + " linha(s) de movimentação" + (semLink ? ", " + semLink + " nova(s) sem link de evento válido" : "");
		if (linhas.length && resumo !== ultimoLog) {
			ultimoLog = resumo;
			console.info(LOG, resumo);
		}
	}

	let agendado = false;
	function agendar() {
		if (agendado) return;
		agendado = true;
		setTimeout(function () {
			agendado = false;
			aplicar();
		}, 300);
	}

	window.__pdpMovimentoBase = {
		selecionada: function () {
			const chk = document.querySelector("input." + CHECKBOX_CLASS + ":checked");
			if (!chk || !chk.isConnected) return null;
			const row = chk.closest("tr");
			const link = (row && linkDaLinha(row)) || document.getElementById(chk.dataset.movId);
			if (!link || !linkValido(link)) return null;
			return {
				id: link.id,
				seq: seqDaLinha(linhaDoLink(link)),
				texto: textoDoEvento(link, linhaDoLink(link)),
				numero: numeroProcesso(),
			};
		},
	};

	aplicar();
	new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true });
})();
