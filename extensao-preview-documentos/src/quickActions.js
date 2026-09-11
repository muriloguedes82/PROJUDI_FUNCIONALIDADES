// Projudi - Atalhos para o painel "Ações" da tela de Movimentações
//
// A tela de Movimentações do Projudi tem um painel lateral "Ações" (e um
// segundo bloco "Outras Ações" logo abaixo) com uma lista comprida de
// links (Intimar Partes, Ordenar Cumprimentos, Realizar Remessa, Enviar
// Concluso, Apensar, etc.) que obriga a rolar a tela para encontrar a ação
// desejada. Este recurso adiciona um botão flutuante "⚡ Ações rápidas"
// (mesmo padrão visual/posicionamento dos botões irmãos de WhatsApp e
// e-mail) que abre um painel com essas mesmas ações agrupadas.
//
// Importante: nenhuma ação é executada por conta própria. Cada item do
// painel apenas localiza o link NATIVO correspondente já presente na
// página (mesmo texto, mesmo elemento <a class="link">, com o onclick que
// o próprio Projudi já definiu) e simula um clique nele — o mesmo dialog
// (openDialog/openDialogMaximized) ou confirmação que apareceria clicando
// diretamente no painel "Ações" aparece normalmente, e o preenchimento/
// confirmação continua manual. Isso evita depender de tokens de sessão
// (o "_tj=..." de cada link, que expira e é específico de cada usuário) —
// a extensão nunca reconstrói essas URLs, só clica no elemento que já
// está na página.

(function () {
	"use strict";

	if (window.__pdpQuickActionsInjected) return;
	window.__pdpQuickActionsInjected = true;

	// Rótulos exatos dos links do painel Ações/Outras Ações, agrupados como
	// aparecem para o usuário. Comparados com o texto do link já "limpo"
	// (sem os marcadores "(*)"/ícones de ajuda/menu de contexto — ver
	// normalizeLinkText()).
	const ACTION_GROUPS = [
		{
			id: "concluso",
			title: "Concluso",
			icon: "📤",
			actions: ["Enviar Concluso"],
		},
		{
			id: "remessa",
			title: "Remessa",
			icon: "📦",
			actions: ["Realizar Remessa", "Remessa Eletrônica para o Tribunal de Justiça"],
		},
		{
			id: "ordenacoes",
			title: "Ordenações",
			icon: "🔀",
			actions: ["Ordenar Cumprimentos", "Ordenar RPV", "Ordenar Expedição BNMP"],
		},
		{
			id: "partes",
			title: "Partes",
			icon: "📨",
			actions: ["Intimar Partes", "Notificar Partes", "Citar Partes", "Intimar Peritos e Auxiliares da Justiça"],
		},
		{
			id: "outras",
			title: "Outras ações",
			icon: "⋯",
			actions: [
				"Interromper Prazo",
				"Suspender ou Sobrestar Processo",
				"Transitar em Julgado",
				"Declínio de competência para a Segunda Instância",
				"Arquivar Processo",
				"Apensar",
				"Desapensar",
			],
		},
	];

	const PROCESS_TOOLBAR_LABELS = [
		"Peticionar",
		"Juntar Documento",
		"Patronato",
		"Exportar Processo",
		"Pedido Incidental",
		"Navegar",
		"Voltar",
	];
	const BUTTON_SCREEN_MARGIN = 12;
	// Fica à esquerda do botão de WhatsApp e dos botões de e-mail, quando
	// existirem, para os grupos de botões desta extensão ficarem juntos sem
	// se sobrepor (mesma técnica usada entre WhatsApp e e-mail).
	const OTHER_BUTTON_SELECTOR = "#pdp-wa-launcher, .pdp-email-visible";

	let launcher = null;
	let panel = null;
	let processScreenEligible = false;

	function findProcessToolbarElement() {
		const candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			const text = (el.textContent || el.value || "").trim();
			if (PROCESS_TOOLBAR_LABELS.indexOf(text) !== -1) return el;
		}
		return null;
	}

	function isOnProcessScreen() {
		if (processScreenEligible) return true;
		if (findProcessToolbarElement()) processScreenEligible = true;
		return processScreenEligible;
	}

	// Remove marcadores que não fazem parte do rótulo visível da ação
	// ("(*)", ícones de ajuda, o "+" do menu de contexto de Ordenar
	// normal/urgente) e normaliza espaços/quebras de linha, para comparar
	// com um texto fixo independente de como o Projudi formatou o HTML.
	function normalizeLinkText(link) {
		const clone = link.cloneNode(true);
		clone.querySelectorAll("em, img, span").forEach(function (el) {
			el.remove();
		});
		return (clone.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findActionLink(label) {
		const links = document.querySelectorAll("a.link");
		for (let i = 0; i < links.length; i++) {
			if (normalizeLinkText(links[i]) === label) return links[i];
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Botão flutuante e painel
	// -------------------------------------------------------------------

	function ensureLauncher() {
		if (launcher && launcher.isConnected) return;
		if (!isOnProcessScreen()) return;

		launcher = document.createElement("button");
		launcher.type = "button";
		launcher.id = "pdp-qa-launcher";
		launcher.className = "pdp-qa-launcher";
		launcher.innerHTML = '<span class="pdp-qa-icon">⚡</span><span>Ações rápidas</span>';
		launcher.title = "Atalhos para o painel Ações (Concluso, Remessa, Ordenações, Partes...)";
		launcher.addEventListener("click", togglePanel);
		document.body.appendChild(launcher);
	}

	function closePanel() {
		if (panel) {
			panel.remove();
			panel = null;
		}
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onKeydown, true);
	}

	function onOutsideClick(e) {
		if (panel && !panel.contains(e.target) && e.target !== launcher) closePanel();
	}

	function onKeydown(e) {
		if (e.key === "Escape") closePanel();
	}

	function togglePanel() {
		if (panel) {
			closePanel();
			return;
		}
		buildPanel();
	}

	function buildPanel() {
		panel = document.createElement("div");
		panel.className = "pdp-qa-panel";

		let hasAnyAction = false;

		ACTION_GROUPS.forEach(function (group) {
			const availableActions = group.actions.filter(function (label) {
				return !!findActionLink(label);
			});
			if (!availableActions.length) return;
			hasAnyAction = true;

			const groupEl = document.createElement("div");
			groupEl.className = "pdp-qa-group";

			const titleEl = document.createElement("div");
			titleEl.className = "pdp-qa-group-title";
			titleEl.textContent = group.icon + " " + group.title;
			groupEl.appendChild(titleEl);

			availableActions.forEach(function (label) {
				const item = document.createElement("button");
				item.type = "button";
				item.className = "pdp-qa-item";
				item.textContent = label;
				item.addEventListener("click", function () {
					closePanel();
					const target = findActionLink(label);
					if (target) {
						target.click();
					} else {
						alert('Não foi possível localizar a ação "' + label + '" na tela atual. Role a página até o painel "Ações" e clique diretamente nele.');
					}
				});
				groupEl.appendChild(item);
			});

			panel.appendChild(groupEl);
		});

		if (!hasAnyAction) {
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Nenhuma ação do painel "Ações" foi encontrada nesta tela.';
			panel.appendChild(empty);
		}

		document.body.appendChild(panel);
		positionPanel();

		// Registrado no próximo tick para não fechar o painel com o mesmo
		// clique que o abriu (o listener de "click" no launcher já
		// terminou de disparar, mas o evento ainda está se propagando).
		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onKeydown, true);
		}, 0);
	}

	function positionPanel() {
		if (!panel || !launcher) return;
		const rect = launcher.getBoundingClientRect();
		const panelRect = panel.getBoundingClientRect();

		let bottom = window.innerHeight - rect.top + 6;
		let maxHeight = rect.top - BUTTON_SCREEN_MARGIN * 2;
		panel.style.bottom = Math.round(bottom) + "px";
		panel.style.maxHeight = Math.max(120, Math.round(maxHeight)) + "px";

		let right = window.innerWidth - rect.right;
		const overflowLeft = window.innerWidth - right - panelRect.width - BUTTON_SCREEN_MARGIN;
		if (overflowLeft < 0) right += overflowLeft;
		panel.style.right = Math.max(BUTTON_SCREEN_MARGIN, Math.round(right)) + "px";
	}

	function repositionLauncher() {
		if (!launcher) return;

		const otherButtons = Array.prototype.slice.call(document.querySelectorAll(OTHER_BUTTON_SELECTOR));
		if (otherButtons.length) {
			let minLeft = null;
			let minTop = null;
			let maxBottom = null;
			otherButtons.forEach(function (btn) {
				const rect = btn.getBoundingClientRect();
				if (minLeft === null || rect.left < minLeft) minLeft = rect.left;
				if (minTop === null || rect.top < minTop) minTop = rect.top;
				if (maxBottom === null || rect.bottom > maxBottom) maxBottom = rect.bottom;
			});

			const groupCenter = (minTop + maxBottom) / 2;
			const launcherHeight = launcher.offsetHeight || 32;
			const bottom = window.innerHeight - groupCenter - launcherHeight / 2;
			launcher.style.bottom = Math.max(BUTTON_SCREEN_MARGIN, Math.round(bottom)) + "px";
			launcher.style.right = Math.round(window.innerWidth - minLeft + 8) + "px";
			positionPanel();
			return;
		}

		let bottom = BUTTON_SCREEN_MARGIN;
		const toolbarButton = findProcessToolbarElement();
		if (toolbarButton) {
			const row = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = row.getBoundingClientRect();
			const toolbarVisible = rect.bottom > 0 && rect.top < window.innerHeight;
			if (toolbarVisible) {
				const offset = Math.round(window.innerHeight - rect.top + BUTTON_SCREEN_MARGIN);
				bottom = Math.min(Math.max(BUTTON_SCREEN_MARGIN, offset), window.innerHeight - BUTTON_SCREEN_MARGIN);
			}
		}
		launcher.style.bottom = bottom + "px";
		launcher.style.right = BUTTON_SCREEN_MARGIN + "px";
		positionPanel();
	}

	function isElementUsable(el) {
		return !!el && el.isConnected;
	}

	function reconcile() {
		try {
			if (!isElementUsable(launcher)) {
				ensureLauncher();
			}
			if (panel && !panel.isConnected) panel = null;
			repositionLauncher();
		} catch (err) {
			console.error("[Projudi Ações Rápidas]", "erro ao reconciliar:", err);
		}
	}

	setInterval(reconcile, 700);
	reconcile();

	const observer = new MutationObserver(function () {
		try {
			reconcile();
		} catch (err) {
			console.error("[Projudi Ações Rápidas]", "erro no MutationObserver:", err);
		}
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });

	let repositionScheduled = false;
	function scheduleReposition() {
		if (repositionScheduled) return;
		repositionScheduled = true;
		requestAnimationFrame(function () {
			repositionScheduled = false;
			repositionLauncher();
		});
	}
	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);
})();
