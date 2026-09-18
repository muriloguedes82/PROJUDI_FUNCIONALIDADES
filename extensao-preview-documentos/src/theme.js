// Projudi - Seletor de tema/cor da tela (inspirado no seletor nativo do
// SEEU: Ações Rápidas > botão "🎨 Tema" > lista com marca de seleção).
//
// O SEEU já tem essa opção nativa (Azul, Alto Contraste, Lilas, Verde). O
// Projudi não tem, então este recurso adiciona um botão flutuante próprio
// com uma lista de temas baseados nas cores institucionais autorizadas
// pelo Manual de Uso da Marca do TJPR (cores institucionais + gradações
// das cores secundárias). As cores "restritas" do manual (rosa/roxo,
// exclusivas de materiais da Coordenadoria da Mulher/CEVID) não entram
// aqui de propósito.
//
// Como o Projudi é um sistema legado (JSP/HTML antigo) e esta extensão não
// tem acesso ao código-fonte das telas, a recolorização do conteúdo nativo
// do Projudi (fora dos elementos desta própria extensão) é best-effort:
// usa seletores genéricos (body, links, botões, cabeçalhos de tabela,
// células com bgcolor) em vez de depender de classes específicas de cada
// tela, que podem não existir em todas elas. As cores dos próprios
// elementos desta extensão (o botão, o painel) sempre usam a cor exata do
// tema escolhido, já que esses elementos são controlados por completo.
(function () {
	"use strict";

	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(window.location.hostname);
	if (IS_SEEU) return;

	if (window.__pdpThemeInjected) return;
	window.__pdpThemeInjected = true;

	const THEME_STORAGE_KEY = "pdpTheme";

	// Cores extraídas do Manual de Uso da Marca do TJPR (Cores
	// Institucionais e Cores Secundárias/gradação). `swatch` é a cor
	// mostrada na bolinha de cada opção do painel.
	const THEMES = [
		{ id: "padrao", name: "Padrão (Projudi)", swatch: "#3a72c4" },
		{ id: "azul", name: "Azul TJPR", swatch: "#008c95" },
		{ id: "verde", name: "Verde-Água TJPR", swatch: "#49c5b1" },
		{ id: "ambar", name: "Âmbar TJPR", swatch: "#eeb134" },
		{ id: "contraste", name: "Alto Contraste", swatch: "#002a3a" },
	];

	let currentTheme = "padrao";
	let launcher = null;
	let panel = null;

	function updateStrip(id) {
		let strip = document.getElementById("pdp-theme-strip");
		if (id === "padrao") {
			if (strip) strip.remove();
			return;
		}
		if (!strip) {
			strip = document.createElement("div");
			strip.id = "pdp-theme-strip";
			strip.className = "pdp-theme-strip";
			document.body.appendChild(strip);
		}
	}

	function applyTheme(id) {
		currentTheme = id;
		if (id === "padrao") {
			document.documentElement.removeAttribute("data-pdp-theme");
		} else {
			document.documentElement.setAttribute("data-pdp-theme", id);
		}
		if (document.body) updateStrip(id);
	}

	function saveTheme(id) {
		return chrome.storage.local.set({ [THEME_STORAGE_KEY]: id }).catch(function (err) {
			console.error("[Projudi Tema] Erro ao salvar o tema escolhido:", err);
		});
	}

	function loadStoredTheme() {
		return chrome.storage.local.get([THEME_STORAGE_KEY]).then(function (data) {
			applyTheme(data[THEME_STORAGE_KEY] || "padrao");
		}).catch(function () {
			applyTheme("padrao");
		});
	}

	function closePanel() {
		if (panel) {
			panel.remove();
			panel = null;
		}
		document.removeEventListener("mousedown", handleOutsideClick, true);
	}

	function handleOutsideClick(event) {
		if (panel && !panel.contains(event.target) && event.target !== launcher) {
			closePanel();
		}
	}

	function openPanel() {
		closePanel();
		panel = document.createElement("div");
		panel.className = "pdp-theme-panel";

		THEMES.forEach(function (theme) {
			const row = document.createElement("button");
			row.type = "button";
			row.className = "pdp-theme-option";
			if (theme.id === currentTheme) row.classList.add("pdp-theme-option-active");
			row.innerHTML =
				'<span class="pdp-theme-check">' + (theme.id === currentTheme ? "✓" : "") + "</span>" +
				'<span class="pdp-theme-swatch" style="background:' + theme.swatch + '"></span>' +
				'<span class="pdp-theme-label"></span>';
			row.querySelector(".pdp-theme-label").textContent = theme.name;
			row.addEventListener("click", function () {
				applyTheme(theme.id);
				saveTheme(theme.id);
				closePanel();
			});
			panel.appendChild(row);
		});

		document.body.appendChild(panel);
		positionPanel();
		// Adiado em um tick para não fechar o painel com o mesmo clique que
		// o abriu (o listener de "mousedown" do botão dispara antes deste).
		setTimeout(function () {
			document.addEventListener("mousedown", handleOutsideClick, true);
		}, 0);
	}

	function togglePanel() {
		if (panel) {
			closePanel();
		} else {
			openPanel();
		}
	}

	function positionPanel() {
		if (!panel || !launcher) return;
		const rect = launcher.getBoundingClientRect();
		panel.style.left = rect.left + "px";
		panel.style.bottom = window.innerHeight - rect.top + 8 + "px";
	}

	function createLauncher() {
		if (document.getElementById("pdp-theme-launcher")) return;
		launcher = document.createElement("button");
		launcher.type = "button";
		launcher.id = "pdp-theme-launcher";
		launcher.className = "pdp-theme-launcher";
		launcher.title = "Alterar o tema/cor da tela";
		launcher.innerHTML = '<span class="pdp-theme-launcher-icon">🎨</span> Tema';
		launcher.addEventListener("click", function (event) {
			event.stopPropagation();
			togglePanel();
		});
		document.body.appendChild(launcher);
	}

	window.addEventListener("resize", positionPanel);
	window.addEventListener("scroll", positionPanel, true);

	loadStoredTheme().finally(function () {
		createLauncher();
	});
})();
