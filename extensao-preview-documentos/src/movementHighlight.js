// Projudi - Destaque automático de movimentações por tipo de usuário
//
// Na aba "Movimentações" do processo, o próprio Projudi já tem um quadro
// "Realces" ("Realçar Movimentos de: Magistrado, Servidor, Advogado,
// Ministério Público, ...") que, ao marcar a caixinha correspondente,
// destaca (client-side, sem recarregar a página) as linhas da tabela cujo
// autor pertence àquele grupo — confirmado inspecionando o HTML real: cada
// linha da tabela tem um id no formato "mov1Grau,GRUPO,,,,," (ex.:
// "mov1Grau,ADVOGADO,,,,,", "mov1Grau,JUIZ,,,,,", "mov1Grau,PROMOTOR,,,,,")
// e as caixinhas de realce têm exatamente esses mesmos valores
// (gruposRealceFiltroJUIZ, gruposRealceFiltroADVOGADO,
// gruposRealceFiltroPROMOTOR, etc.).
//
// O problema é que essas caixinhas não são lembradas: é preciso marcá-las
// de novo toda vez que se abre um processo. Este script lê a preferência
// salva em chrome.storage.sync (configurada na tela de opções da extensão)
// e marca/desmarca essas mesmas caixinhas nativas do Projudi assim que a
// aba Movimentações é exibida — reaproveitando o realce e o estilo do
// próprio Projudi, em vez de reimplementar o destaque visual.

(function () {
	"use strict";

	// Evita rodar dentro do iframe oculto usado por content.js para varrer
	// pendências — ele não é exibido ao usuário, então não há o que marcar.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpMovementHighlightInjected) return;
	window.__pdpMovementHighlightInjected = true;

	const STORAGE_KEY = "movementHighlightPrefs";

	// Mapeia nossa preferência para o id da caixinha nativa "Realces" do
	// Projudi (valor do checkbox == grupo usado no id da linha da tabela).
	const ROLE_CHECKBOX_IDS = {
		magistrado: "gruposRealceFiltroJUIZ",
		ministerioPublico: "gruposRealceFiltroPROMOTOR",
		advogado: "gruposRealceFiltroADVOGADO",
	};

	const PROCESSED_ATTR = "data-pdp-mv-applied";

	let prefs = {};

	function loadPrefs() {
		return chrome.storage.sync.get([STORAGE_KEY]).then(function (data) {
			prefs = data[STORAGE_KEY] || {};
		});
	}

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "sync" || !changes[STORAGE_KEY]) return;
		prefs = changes[STORAGE_KEY].newValue || {};
		// Preferência mudou: força reaplicação mesmo nas caixinhas já
		// processadas com o valor antigo.
		document.querySelectorAll("[" + PROCESSED_ATTR + "]").forEach(function (el) {
			el.removeAttribute(PROCESSED_ATTR);
		});
		scheduleApply();
	});

	// Marca/desmarca a caixinha nativa disparando um clique de verdade
	// (não só o atributo "checked"), para que o próprio JS do Projudi que
	// escuta esse clique aplique o realce nas linhas da tabela.
	function applyToCheckbox(checkbox, shouldBeChecked) {
		if (checkbox.hasAttribute(PROCESSED_ATTR)) return;
		if (checkbox.checked !== shouldBeChecked) {
			checkbox.click();
		}
		checkbox.setAttribute(PROCESSED_ATTR, "1");
	}

	function applyAll() {
		Object.keys(ROLE_CHECKBOX_IDS).forEach(function (key) {
			const checkbox = document.getElementById(ROLE_CHECKBOX_IDS[key]);
			if (!checkbox) return;
			applyToCheckbox(checkbox, !!prefs[key]);
		});
	}

	let scheduled = false;
	function scheduleApply() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(function () {
			scheduled = false;
			try {
				applyAll();
			} catch (err) {
				console.error("[Projudi Destaque de Movimentações]", "erro ao aplicar preferência:", err);
			}
		});
	}

	loadPrefs().then(scheduleApply);

	// A tela troca de aba (Movimentações → Partes → Movimentações de novo)
	// substituindo trechos do DOM via AJAX — o quadro "Realces" e suas
	// caixinhas são recriados do zero, então reavaliamos a cada mudança
	// relevante, igual ao padrão já usado pelos demais scripts desta
	// extensão para sobreviver a essas trocas.
	const observer = new MutationObserver(scheduleApply);
	observer.observe(document.documentElement, { childList: true, subtree: true });
	setInterval(scheduleApply, 1000);
})();
