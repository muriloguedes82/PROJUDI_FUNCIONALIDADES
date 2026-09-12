// Projudi - Shim de window.close()/window.opener para o popup de Ações
// Rápidas, com diagnóstico
//
// Problema (ver quickActions.js): o diálogo final de ações como "Ordenar
// Cumprimentos" deveria se fechar sozinho ao terminar o processamento —
// mas, mesmo com um shim de close() aplicado o mais cedo possível
// ("document_start", antes de qualquer script da própria página), os logs
// mostraram que `window.close()` NUNCA chega a ser chamado dentro desse
// diálogo. Isso sugere que o script nativo trava antes de chegar lá —
// hipótese mais provável: uma exceção não tratada logo no início (ex.:
// usar `window.opener.algumaCoisa` quando `window.opener` é `null`, porque
// este diálogo não foi aberto via `window.open()` de verdade, e sim
// carregado dentro de um <iframe> desta extensão).
//
// Este arquivo faz duas coisas, registrado no manifest.json com
// "run_at": "document_start" e "all_frames": true (o Chrome garante que
// roda antes de qualquer script da própria página, em todo frame,
// incluindo o iframe do popup):
//
// 1. Se `window.opener` vier `null`, aponta para a aba real do processo
//    (`window.parent`) — evita a exceção acima e deixa o script nativo
//    continuar em vez de travar logo no início.
// 2. Sobrescreve `window.close()` para avisar quickActions.js (via
//    `postMessage`, já que esse código roda dentro do iframe) em vez de
//    silenciosamente não fazer nada.
//
// Também avisa quickActions.js sobre qualquer erro não tratado dentro do
// diálogo (window.onerror) e sobre o estado inicial de `opener` — tudo via
// postMessage, logado no console do frame de cima (sempre visível) para
// diagnosticar se esta hipótese está certa.
(function () {
	"use strict";

	// Log incondicional (não depende de postMessage nem de nada além do
	// próprio console) — só para confirmar, sem ambiguidade, que este
	// arquivo está mesmo sendo executado neste frame com a versão mais
	// recente da extensão. Aparece no console do DevTools prefixado com a
	// URL do frame de origem (o Chrome mostra logs de todos os
	// frames/iframes por padrão).
	console.info("[Projudi Ações Rápidas] closeShim.js carregado em", window.location.href, "| top?", window.top === window);

	if (window.top === window) return; // não faz sentido na aba principal (nunca é o popup desta extensão)
	if (window.__pdpCloseShimInjected) return;
	window.__pdpCloseShimInjected = true;

	function notifyParent(payload) {
		try {
			const message = { __pdpShim: true };
			for (const key in payload) message[key] = payload[key];
			window.parent.postMessage(message, window.location.origin);
		} catch (err) {
			// ignore — sem como avisar o pai
		}
	}

	window.addEventListener("error", function (event) {
		notifyParent({
			__pdpErrorSignal: true,
			href: window.location.href,
			message: event.message,
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			stack: event.error && event.error.stack,
		});
	});

	const openerWasNull = !window.opener;
	if (openerWasNull) {
		try {
			window.opener = window.parent;
		} catch (err) {
			notifyParent({ __pdpErrorSignal: true, href: window.location.href, message: "falha ao definir window.opener: " + err });
		}
	}
	notifyParent({ __pdpOpenerSignal: true, href: window.location.href, openerWasNull: openerWasNull });

	const originalClose = window.close ? window.close.bind(window) : null;

	window.close = function () {
		notifyParent({ __pdpCloseSignal: true, href: window.location.href });
		if (originalClose) {
			try {
				originalClose();
			} catch (err) {
				// ignore
			}
		}
	};
})();
