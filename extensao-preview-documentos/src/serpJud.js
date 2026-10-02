// Projudi - Ícone "SerpJud" (Sistema Eletrônico dos Registros Públicos -
// SERP-JUD, do CNJ) ao lado do ícone do Menu da extensão (a balança
// dourada, ver menuExtensao.js), no verde-água claro usado pelo SerpJud.
//
// O ícone tem o mesmo tamanho da balança, fica logo à esquerda dela e a
// acompanha (rolagem, redimensionamento): menuExtensao.js publica a posição
// da balança no atributo "data-pdp-icone-pos" de #pdp-menu-host. Sem a
// balança no documento, o ícone não aparece. Não mexe na fileira de botões
// do rodapé (quickActions.js/buttonDrag.js).
//
// O clique abre o SerpJud num popup sobre a própria tela do processo - o
// mesmo tipo de janela usado pelas ações rápidas (Remessa, Concluso etc.,
// ver showActionModal em quickActions.js) -, sem nova aba. Se a balança
// estiver num frame só do cabeçalho, o popup é aberto no documento do topo,
// para ocupar a tela toda. No cabeçalho do popup, "🗂 Nova aba" abre o
// mesmo endereço numa aba nova do navegador (ao lado da do processo) e
// "🖥 Segundo monitor" numa janela maximizada no outro monitor, se houver
// (ver serpjud-open em background.js).
//
// O SerpJud costuma recusar ser exibido dentro de outra página; a regra em
// rules/serpJud.json retira essa recusa apenas quando a janela é aberta a
// partir do Projudi.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	// A janela do Oráculo mantém apenas os controles nativos.
	if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return;
	if (window.__pdpSerpJud || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpSerpJud = true;

	const SERPJUD_URL = "https://serp.registros.org.br/?login-callback=true";
	const MODAL_ID = "pdp-serpjud-modal";
	const MENSAGEM_ABRIR = "pdp-serpjud-abrir";
	const TAM = 22; // mesmo tamanho da balança (menuExtensao.js)
	const ESPACO = 6;

	// Prédio de colunas (registros públicos), no traço da balança.
	const ICONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="cheio" d="M12 2.5L2.5 7.5h19z"/>' +
		'<path d="M3 9.5h18M5 11v6.5M9.7 11v6.5M14.3 11v6.5M19 11v6.5M3 19.5h18M2 21.5h20"/></svg>';

	const CSS = `
:host { all: initial; }
.icone {
	position: fixed; z-index: 2147483000; width: ${TAM}px; height: ${TAM}px; padding: 0; margin: 0;
	border-radius: 6px; border: 1.5px solid #2a8c7f; background: linear-gradient(135deg, #d4f7f1, #a8eadf 55%, #7fd6c8);
	color: #0f5e55; cursor: pointer; display: flex; align-items: center; justify-content: center;
	box-shadow: 0 1px 4px rgba(15,94,85,.45); transition: transform .15s, box-shadow .15s, filter .15s;
}
.icone[hidden] { display: none; }
.icone:hover, .icone:focus-visible { transform: scale(1.1); filter: brightness(1.04); box-shadow: 0 2px 7px rgba(15,94,85,.5); outline: none; }
.icone svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icone svg .cheio { fill: currentColor; }
`;

	// ------------------------------------------------------------------
	// Popup
	// ------------------------------------------------------------------

	// `onde`: "aba" ou "monitor". O popup só fecha se abriu de fato (ex.:
	// sem segundo monitor, avisa e mantém o popup).
	function openOutside(onde) {
		chrome.runtime.sendMessage({ source: "projudi-preview", type: "serpjud-open", onde: onde })
			.then(function (result) {
				if (result && result.ok) closeModal();
				else alert((result && result.error) || "Não foi possível abrir o SerpJud.");
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
			'<button type="button" class="pdp-qa-modal-close pdp-serpjud-aba" title="Abrir o SerpJud numa nova aba deste navegador">🗂 Nova aba</button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-serpjud-monitor" title="Abrir o SerpJud numa janela no segundo monitor, se houver">🖥 Segundo monitor</button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-serpjud-close">✕ Fechar</button>' +
			"</span></div>" +
			'<div class="pdp-qa-modal-body"><iframe class="pdp-serpjud-iframe" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-read; clipboard-write; fullscreen"></iframe></div>' +
			"</div>";
		backdrop.querySelector(".pdp-serpjud-close").addEventListener("click", closeModal);
		backdrop.querySelector(".pdp-serpjud-aba").addEventListener("click", function () {
			openOutside("aba");
		});
		backdrop.querySelector(".pdp-serpjud-monitor").addEventListener("click", function () {
			openOutside("monitor");
		});
		backdrop.querySelector(".pdp-serpjud-iframe").src = SERPJUD_URL;
		document.body.appendChild(backdrop);
		document.addEventListener("keydown", onKeydown, true);
	}

	// Documento do topo que pode receber o popup (não um <frameset>).
	function topoUtil() {
		if (window.top === window) return null;
		try {
			const body = window.top.document.body;
			return body && body.tagName !== "FRAMESET" ? window.top : null;
		} catch (err) {
			return null;
		}
	}

	function abrir() {
		const topo = topoUtil();
		if (topo) topo.postMessage({ tipo: MENSAGEM_ABRIR }, location.origin);
		else openModal();
	}

	if (window.top === window) {
		window.addEventListener("message", function (event) {
			if (event.origin !== location.origin || !event.data || event.data.tipo !== MENSAGEM_ABRIR) return;
			openModal();
		});
	}

	// ------------------------------------------------------------------
	// Ícone ao lado da balança
	// ------------------------------------------------------------------

	let host = null;
	let icone = null;
	let menuHost = null;
	const observaMenu = new MutationObserver(posicionar);

	function montar() {
		host = document.createElement("div");
		host.id = "pdp-serpjud-host";
		const shadow = host.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		style.textContent = CSS;
		icone = document.createElement("button");
		icone.type = "button";
		icone.className = "icone";
		icone.title = "SerpJud (CNJ) — abrir num popup sobre esta tela";
		icone.setAttribute("aria-label", "SerpJud (CNJ)");
		icone.innerHTML = ICONE_SVG;
		icone.hidden = true;
		icone.addEventListener("click", function (ev) {
			ev.stopPropagation();
			abrir();
		});
		shadow.append(style, icone);
		document.documentElement.append(host);
	}

	function posicionar() {
		const pos = menuHost && menuHost.isConnected ? String(menuHost.getAttribute("data-pdp-icone-pos") || "").split(",") : [];
		const top = parseFloat(pos[0]);
		const left = parseFloat(pos[1]);
		if (!isFinite(top) || !isFinite(left)) {
			if (icone) icone.hidden = true;
			return;
		}
		if (!host || !host.isConnected) montar();
		icone.style.top = top + "px";
		icone.style.left = Math.max(4, left - TAM - ESPACO) + "px";
		icone.hidden = false;
	}

	// A balança (#pdp-menu-host) é montada direto em <html>, às vezes alguns
	// segundos depois do carregamento (ver iniciar em menuExtensao.js).
	function procurarMenu() {
		const atual = document.getElementById("pdp-menu-host");
		if (atual === menuHost) return;
		observaMenu.disconnect();
		menuHost = atual;
		if (menuHost) observaMenu.observe(menuHost, { attributes: true, attributeFilter: ["data-pdp-icone-pos"] });
		posicionar();
	}

	new MutationObserver(procurarMenu).observe(document.documentElement, { childList: true });
	procurarMenu();
})();
