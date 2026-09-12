// Projudi - Shim de window.close() para o popup de Ações Rápidas
//
// Problema (ver quickActions.js): o diálogo final de ações como "Ordenar
// Cumprimentos" chama `window.close()` para se fechar sozinho ao terminar
// o processamento — mas essa chamada acontece de forma SÍNCRONA, durante o
// carregamento da própria página (não num evento posterior tipo "load" ou
// num setTimeout). Um shim aplicado de fora (ex.: no evento "load" do
// <iframe>, feito por quickActions.js) chega tarde demais: o script nativo
// já rodou e já tentou fechar a janela antes de qualquer código externo
// conseguir reagir — e como essa janela é só um <iframe> desta extensão
// (não uma janela de verdade aberta via window.open()), o `window.close()`
// nativo simplesmente não faz nada, silenciosamente, e a tela fica presa
// (tipicamente em "Aguarde...") mesmo com a ação já registrada no processo.
//
// A única forma confiável de interceptar essa chamada é rodar ANTES dos
// scripts da própria página — por isso este arquivo é registrado no
// manifest.json com "run_at": "document_start" e "all_frames": true: o
// Chrome garante que content scripts em "document_start" rodam antes de
// qualquer script da página carregada no frame (incluindo o iframe do
// popup desta extensão), então dá tempo de sobrescrever `window.close`
// antes que o Projudi chegue a chamá-lo.
//
// Como avisar quickActions.js (que roda no documento de cima, fora deste
// iframe) que o fechamento aconteceu: via `postMessage` para a janela pai —
// quickActions.js registra um listener que só reage quando a mensagem vem
// do iframe do popup atualmente aberto (compara `event.source`), então
// mensagens de outros frames/iframes do Projudi (este mesmo shim roda em
// todos eles) são ignoradas sem efeito.
(function () {
	"use strict";

	if (window.top === window) return; // não faz sentido na aba principal (nunca é o popup desta extensão)
	if (window.__pdpCloseShimInjected) return;
	window.__pdpCloseShimInjected = true;

	const originalClose = window.close ? window.close.bind(window) : null;

	window.close = function () {
		try {
			window.parent.postMessage({ __pdpCloseSignal: true }, window.location.origin);
		} catch (err) {
			// ignore — se não der para avisar o pai, ao menos tenta o close nativo abaixo
		}
		if (originalClose) {
			try {
				originalClose();
			} catch (err) {
				// ignore
			}
		}
	};
})();
