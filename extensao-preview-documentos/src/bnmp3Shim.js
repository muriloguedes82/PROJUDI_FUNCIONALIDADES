// Projudi - Botão "Ir para o BNMP"/"BNMP 3" em popup: parte que roda no
// mundo da PÁGINA ("world": "MAIN", "document_start", ver manifest.json)
//
// O botão nativo que leva ao BNMP 3 (tela "Outros Cumprimentos" e
// ordenação do BNMP, `cumprimentoCartorio.do?actionType=cumprirBnmp`) abre
// o destino numa janela/aba nova. Quando o endereço está escrito no próprio
// botão (href, `onclick="window.open('...')"` etc.), bnmp3Popup.js o lê e
// abre o popup sem deixar o clique nativo acontecer. Quando o endereço só é
// montado pelo script nativo na hora do clique, só dá para capturá-lo aqui,
// no mundo da página: durante o clique num botão BNMP, `window.open()` é
// desviado para o popup da extensão.
//
// A conversa com bnmp3Popup.js (mundo isolado da extensão) é por um
// CustomEvent no `document`, que é SÍNCRONO entre os dois mundos: quando o
// evento volta com `defaultPrevented`, o popup já foi criado e o iframe dele
// é devolvido ao script nativo no lugar da janela nova (o script nativo
// pode chamar `.focus()`, `.location` etc. sem erro).
(function () {
	"use strict";
	// Mesma regra de hostGuard.js (que roda no mundo isolado e não é visível
	// daqui).
	const HOST_PERMITIDO = /^((projudi|tst)[^.]*\.tjpr\.jus\.br)$/i;
	if (!HOST_PERMITIDO.test(location.hostname)) return;
	if (!location.pathname.startsWith("/projudi/")) return;
	if (window.__pdpBnmp3Shim) return;
	window.__pdpBnmp3Shim = true;

	const EVENTO_ABRIR = "pdp-bnmp3-abrir";
	const EVENTO_CLIQUE = "pdp-bnmp3-clique";

	// bnmp3Popup.js avisa (na fase de captura, antes do onclick nativo) que o
	// clique em andamento é num botão BNMP. O aviso vale só para este clique:
	// termina no próximo ciclo do event loop, e um window.open() fora dele
	// segue nativo — salvo endereço que é claramente do BNMP (abaixo).
	let cliqueBnmpAte = 0;
	document.addEventListener(EVENTO_CLIQUE, function () {
		cliqueBnmpAte = Date.now() + 1500;
	});

	function pareceBnmp(url) {
		try {
			const u = new URL(String(url), location.href);
			return u.origin !== location.origin && /bnmp/i.test(u.hostname + u.pathname);
		} catch (err) {
			return false;
		}
	}

	function iframeDoPopup() {
		let win = window;
		for (let i = 0; i < 10 && win; i++) {
			try {
				const iframe = win.document.querySelector("iframe.pdp-bnmp3-iframe");
				if (iframe) return iframe;
			} catch (err) {
				return null;
			}
			if (win === win.parent) break;
			win = win.parent;
		}
		return null;
	}

	const openOriginal = window.open;
	window.open = function (url) {
		if (url && (Date.now() < cliqueBnmpAte || pareceBnmp(url))) {
			let absoluta;
			try {
				absoluta = new URL(String(url), location.href).href;
			} catch (err) {
				absoluta = null;
			}
			if (absoluta && /^https?:/i.test(absoluta)) {
				const evento = new CustomEvent(EVENTO_ABRIR, { detail: absoluta, cancelable: true });
				document.dispatchEvent(evento);
				if (evento.defaultPrevented) {
					cliqueBnmpAte = 0;
					const iframe = iframeDoPopup();
					if (iframe && iframe.contentWindow) return iframe.contentWindow;
				}
			}
		}
		return openOriginal.apply(this, arguments);
	};
})();
