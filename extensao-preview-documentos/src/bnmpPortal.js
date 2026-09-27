// Portal do BNMP 3 (portalbnmp.cnj.jus.br) aberto pelo botão do BNMP 3 da
// ordenação no Projudi (ver bnmp3Popup.js)
//
// Só age na aba/janela que a própria extensão abriu a partir de uma
// ordenação: background.js guarda, por aba, os dados dessa ordenação (tipo
// de documento, processo, parte, CPF). Em qualquer outra aba do portal, não
// faz nada.
//
// Por enquanto:
// 1. mostra, num quadro pequeno no canto da tela (recolhível), os dados da
//    ordenação que abriu a janela — para conferir a peça a expedir sem
//    voltar ao Projudi;
// 2. registra no console (F12), a cada troca de tela do portal (é uma
//    aplicação de página única, a URL muda sem recarregar), o endereço e os
//    botões/links visíveis, prefixados com "[Projudi BNMP portal]" — base
//    para automatizar os cliques até a expedição da nova peça quando a
//    estrutura das telas do portal for conhecida (.mhtml das telas).
(function () {
	"use strict";
	if (window.top !== window) return;
	if (window.__pdpBnmpPortal) return;
	window.__pdpBnmpPortal = true;

	const TAG = "[Projudi BNMP portal]";
	const QUADRO_ID = "pdp-bnmp-portal-quadro";

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	function visivel(el) {
		return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
	}

	function diagnosticar() {
		const itens = [];
		document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"]').forEach(function (el) {
			if (!visivel(el) || el.closest("#" + QUADRO_ID)) return;
			const texto = collapse(el.value || el.textContent || el.getAttribute("aria-label") || el.getAttribute("title"));
			if (!texto) return;
			itens.push(el.tagName.toLowerCase() + ": " + texto.slice(0, 80) + (el.getAttribute("href") ? " → " + el.getAttribute("href") : ""));
		});
		console.info(TAG, "tela:", location.href, "\n" + itens.slice(0, 150).join("\n"));
	}

	function mostrarQuadro(ctx) {
		if (document.getElementById(QUADRO_ID)) return;
		const quadro = document.createElement("div");
		quadro.id = QUADRO_ID;
		quadro.style.cssText =
			"position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:340px;background:#fffbe6;border:1px solid #c9b458;" +
			"border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.25);font:12px/1.4 Arial,Helvetica,sans-serif;color:#222;";
		const cab = document.createElement("div");
		cab.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;font-weight:bold;cursor:pointer;";
		cab.textContent = "Ordenação do Projudi";
		const seta = document.createElement("span");
		seta.textContent = "▾";
		cab.appendChild(seta);
		const corpo = document.createElement("div");
		corpo.style.cssText = "padding:0 10px 8px;";
		[
			["Peça", ctx.tipoDocumento],
			["Processo", ctx.processo],
			["Parte", ctx.parte],
			["CPF", ctx.cpf && ctx.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")],
		].forEach(function (par) {
			if (!par[1]) return;
			const linha = document.createElement("div");
			const b = document.createElement("b");
			b.textContent = par[0] + ": ";
			linha.appendChild(b);
			linha.appendChild(document.createTextNode(par[1]));
			corpo.appendChild(linha);
		});
		cab.addEventListener("click", function () {
			const aberto = corpo.style.display !== "none";
			corpo.style.display = aberto ? "none" : "";
			seta.textContent = aberto ? "▸" : "▾";
		});
		quadro.appendChild(cab);
		quadro.appendChild(corpo);
		document.body.appendChild(quadro);
	}

	chrome.runtime
		.sendMessage({ source: "projudi-preview", type: "bnmp3-contexto" })
		.then(function (ctx) {
			if (!ctx) return;
			console.info(TAG, "aberto pela ordenação do Projudi:", ctx);
			mostrarQuadro(ctx);

			// Troca de tela na aplicação de página única: reavalia quando a URL
			// muda e o conteúdo assenta.
			let ultimaUrl = "";
			let timer = null;
			new MutationObserver(function () {
				if (!document.getElementById(QUADRO_ID) && document.body) mostrarQuadro(ctx);
				if (location.href === ultimaUrl) return;
				clearTimeout(timer);
				timer = setTimeout(function () {
					ultimaUrl = location.href;
					diagnosticar();
				}, 1500);
			}).observe(document.documentElement, { childList: true, subtree: true });
			ultimaUrl = location.href;
			setTimeout(diagnosticar, 1500);
		})
		.catch(function (err) {
			console.warn(TAG, "sem contato com a extensão:", err);
		});
})();
