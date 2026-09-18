// Projudi - Aplicação antecipada do tema de cores (ver src/theme.js)
//
// Roda em "document_start" (mesmo estágio do closeShim.js) só para colocar
// o atributo `data-pdp-theme` no <html> o mais cedo possível, antes da
// primeira pintura da tela — evita o "flash" da tela no tema padrão antes
// de trocar para o tema salvo pelo usuário. A lógica de exibir o botão e o
// painel de escolha de tema fica em theme.js (document_idle), que já
// reaplica o mesmo atributo por segurança (ver applyStoredTheme lá).
//
// Só se aplica ao Projudi: o SEEU já tem seletor de tema nativo (ver
// screenshots no pedido desta funcionalidade), então não faz sentido
// competir com ele.
(function () {
	"use strict";

	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(window.location.hostname);
	if (IS_SEEU) return;

	const THEME_STORAGE_KEY = "pdpTheme";

	chrome.storage.local.get([THEME_STORAGE_KEY]).then(function (data) {
		const theme = data[THEME_STORAGE_KEY];
		if (theme && theme !== "padrao") {
			document.documentElement.setAttribute("data-pdp-theme", theme);
		}
	}).catch(function () {
		// Sem tema salvo/acessível ainda: mantém o visual padrão do Projudi.
	});
})();
