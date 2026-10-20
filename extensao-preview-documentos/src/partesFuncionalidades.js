// Partes das funcionalidades escondidas pelo Menu da extensão (ver `partes`
// em src/funcionalidades.js).
//
// Roda no início de cada página/quadro (bloco "pdp-tribunal-inicio" de
// src/termosUso.js), logo depois de funcionalidades.js, e mantém um <style>
// que esconde os botões das partes desativadas no sistema da página. Como os
// botões são criados depois, pelos scripts das funcionalidades, eles já
// nascem escondidos. Quando a escolha muda no Menu (nesta ou em outra aba),
// o estilo é refeito na hora - sem recarregar a página.
//
// Os scripts das funcionalidades não precisam conferir nada: o botão
// continua existindo na página (outros botões se posicionam ao lado dele),
// só não aparece.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido || window.__pdpPartesFuncionalidades || !self.PDP_FUNCIONALIDADES) return;
	window.__pdpPartesFuncionalidades = true;

	const CHAVE = self.PDP_FUNCIONALIDADES.chavePartes;
	// origin, e não hostname: os quadros "about:srcdoc" da extensão herdam a
	// origem da página, mas ficam com o hostname vazio.
	const SISTEMA = self.pdpSistemaDoHost(location.origin);
	let estilo = null;

	function aplicar(dados) {
		const seletores = self.pdpSeletoresPartesOcultas(self.pdpPartesDesativadasDoSistema(dados, SISTEMA), SISTEMA);
		if (!seletores.length) {
			if (estilo) estilo.remove();
			return;
		}
		if (!estilo) {
			estilo = document.createElement("style");
			estilo.id = "pdp-partes-ocultas";
		}
		estilo.textContent = seletores.join(",\n") + " { display: none !important; }";
		if (!estilo.isConnected) (document.head || document.documentElement).appendChild(estilo);
	}

	chrome.storage.local.get(CHAVE).then(aplicar).catch(function () {});
	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "local" || !changes[CHAVE]) return;
		aplicar({ [CHAVE]: changes[CHAVE].newValue });
	});
})();
