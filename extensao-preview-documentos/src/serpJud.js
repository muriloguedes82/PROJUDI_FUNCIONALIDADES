// Projudi - Botão "SerpJud" (Sistema Eletrônico dos Registros Públicos -
// SERP-JUD, do CNJ) numa TERCEIRA linha da fileira de botões
// (#pdp-qa-row, criada por quickActions.js).
//
// O clique abre o SerpJud num popup sobre a própria tela do processo - o
// mesmo tipo de janela usado pelas ações rápidas (Remessa, Concluso etc.,
// ver showActionModal em quickActions.js) -, sem nova aba. O botão
// "↗ Janela separada" do cabeçalho do popup abre o mesmo endereço numa
// janela à parte, para o caso de o login do SerpJud não funcionar dentro
// do popup.
//
// Não mexe na posição, na ancoragem nem nas telas em que a fileira é
// ocultada (buttonDrag.js e uiVisibility.js): só acrescenta a linha nova à
// fileira, quando ela existe. O SerpJud costuma recusar ser exibido dentro
// de outra página; a regra em rules/serpJud.json retira essa recusa apenas
// quando a janela é aberta a partir do Projudi.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	// A janela do Oráculo mantém apenas os controles nativos.
	if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return;
	if (window.__pdpButtonGroupBlocked) return;
	if (window.__pdpSerpJud || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpSerpJud = true;

	const SERPJUD_URL = "https://serp.registros.org.br/?login-callback=true";
	const LINE_ID = "pdp-qa-row-line-serpjud";
	const BUTTON_ID = "pdp-serpjud-button";
	const MODAL_ID = "pdp-serpjud-modal";

	let line = null;
	let button = null;

	function openWindow() {
		chrome.runtime.sendMessage({ source: "projudi-preview", type: "serpjud-open-window" })
			.then(function (result) {
				if (!result || !result.ok) alert((result && result.error) || "Não foi possível abrir o SerpJud.");
			})
			.catch(function (error) {
				alert("Não foi possível abrir o SerpJud: " + error.message);
			});
	}

	function closeModal() {
		const el = document.getElementById(MODAL_ID);
		if (el) el.remove();
		document.removeEventListener("keydown", onKeydown, true);
	}

	function onKeydown(event) {
		if (event.key === "Escape") closeModal();
	}

	function openModal() {
		closeModal();
		const backdrop = document.createElement("div");
		backdrop.id = MODAL_ID;
		backdrop.className = "pdp-qa-modal-backdrop";
		backdrop.innerHTML =
			'<div class="pdp-qa-modal-box" style="width: min(1280px, 96vw); height: 94vh;">' +
			'<div class="pdp-qa-modal-header"><span>SerpJud — CNJ</span>' +
			'<span style="display: flex; gap: 6px;">' +
			'<button type="button" class="pdp-qa-modal-close pdp-serpjud-window" title="Abrir o SerpJud numa janela separada (use se o login não funcionar aqui)">↗ Janela separada</button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-serpjud-close">✕ Fechar</button>' +
			"</span></div>" +
			'<div class="pdp-qa-modal-body"><iframe class="pdp-serpjud-iframe" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-read; clipboard-write; fullscreen"></iframe></div>' +
			"</div>";
		backdrop.querySelector(".pdp-serpjud-close").addEventListener("click", closeModal);
		backdrop.querySelector(".pdp-serpjud-window").addEventListener("click", function () {
			closeModal();
			openWindow();
		});
		backdrop.querySelector(".pdp-serpjud-iframe").src = SERPJUD_URL;
		document.body.appendChild(backdrop);
		document.addEventListener("keydown", onKeydown, true);
	}

	function reconcile() {
		const row = document.getElementById("pdp-qa-row");
		if (!row) {
			if (line && line.isConnected) line.remove();
			return;
		}
		if (!line) {
			line = document.createElement("div");
			line.id = LINE_ID;
			line.className = "pdp-qa-row-line";
			button = document.createElement("button");
			button.id = BUTTON_ID;
			button.type = "button";
			button.className = "pdp-qa-group-btn";
			button.innerHTML = '<span class="pdp-qa-icon">🏛️</span><span>SerpJud</span>';
			button.title = "Abrir o SerpJud (CNJ) num popup sobre esta tela";
			button.addEventListener("click", openModal);
			line.appendChild(button);
		}
		// Sempre a última linha da fileira (depois das duas de quickActions.js).
		if (line.parentElement !== row || row.lastElementChild !== line) row.appendChild(line);
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
