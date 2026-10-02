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
// Este arquivo só ACRESCENTA uma caixinha ao lado de cada evento válido da
// aba Movimentações: marcando uma, as ações rápidas/preferências/combos
// partem dela. Só uma fica marcada por vez (marcar outra desmarca a
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
	// Só na tela visível: nada nos iframes ocultos/popups desta extensão.
	if (window.top !== window) return;
	// Telas sem a fileira de Ações rápidas (ver uiVisibility.js).
	if (window.__pdpButtonGroupBlocked) return;

	if (window.__pdpMovimentoBaseInjected) return;
	window.__pdpMovimentoBaseInjected = true;

	const LINK_SELECTOR = 'a.link[id^="LNKmov"]';
	const CHECKBOX_CLASS = "pdp-movbase-chk";
	const ROW_CLASS = "pdp-movbase-row";
	const TITULO =
		"Marque para que as Ações rápidas, as preferências e os combos partam desta movimentação " +
		"(como em \"Movimentar a Partir Desta Movimentação\"). Sem nenhuma marcada, a extensão usa a mais recente.";

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

	function textoDoEvento(link) {
		return (link.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
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

	function aoMudar(ev) {
		const chk = ev.target;
		if (chk.checked) {
			document.querySelectorAll("input." + CHECKBOX_CLASS).forEach(function (outro) {
				if (outro !== chk && outro.checked) {
					outro.checked = false;
					marcarLinha(outro);
				}
			});
		}
		marcarLinha(chk);
	}

	function criarCaixa(link) {
		const chk = document.createElement("input");
		chk.type = "checkbox";
		chk.className = CHECKBOX_CLASS;
		chk.title = TITULO;
		chk.setAttribute("aria-label", "Usar esta movimentação nas Ações rápidas");
		chk.dataset.movId = link.id;
		chk.addEventListener("change", aoMudar);
		// Não deixa o clique chegar a algum onclick nativo da linha.
		chk.addEventListener("click", function (ev) {
			ev.stopPropagation();
		});
		return chk;
	}

	function aplicar() {
		document.querySelectorAll(LINK_SELECTOR).forEach(function (link) {
			if (!linkValido(link)) return;
			const prev = link.previousElementSibling;
			if (prev && prev.classList.contains(CHECKBOX_CLASS)) return;
			link.parentNode.insertBefore(criarCaixa(link), link);
		});
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
			const link = chk.nextElementSibling && chk.nextElementSibling.matches(LINK_SELECTOR) ? chk.nextElementSibling : document.getElementById(chk.dataset.movId);
			if (!link || !linkValido(link)) return null;
			return {
				id: link.id,
				seq: seqDaLinha(link.closest("tr")),
				texto: textoDoEvento(link),
				numero: numeroProcesso(),
			};
		},
	};

	aplicar();
	new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true });
})();
