// Projudi - Atalhos para o painel "Ações" da tela de Movimentações
//
// A tela de Movimentações do Projudi tem um painel lateral "Ações" (e um
// segundo bloco "Outras Ações" logo abaixo) com uma lista comprida de
// links (Intimar Partes, Ordenar Cumprimentos, Realizar Remessa, Enviar
// Concluso, Apensar, etc.) que obriga a rolar a tela para encontrar a ação
// desejada. Este recurso adiciona um botão flutuante POR GRUPO de ações
// (Concluso, Remessa, Ordenações, Partes, Outras ações), lado a lado, no
// mesmo canto onde já ficam os botões de WhatsApp e e-mail.
//
// Cada botão abre um painel com:
// 1. As ações do grupo, com um atalho "Abrir" que só localiza o link
//    NATIVO correspondente já presente na página (mesmo texto, mesmo
//    elemento <a class="link">, com o onclick que o próprio Projudi já
//    definiu) e simula um clique nele — sem reconstruir nenhuma URL/token
//    de sessão.
// 2. Preferências salvas para cada ação: um "instantâneo" dos campos que o
//    próprio usuário preencheu uma vez num diálogo do Projudi. Clicar numa
//    preferência salva reabre o diálogo, repreenche os mesmos campos e
//    pede UMA confirmação rápida (dentro do próprio painel desta
//    extensão, sem precisar digitar nada de novo) antes de clicar no botão
//    de confirmar/enviar do próprio Projudi.
//
// Aviso importante (ver README, seção "Ações rápidas e preferências"): como
// o Projudi abre esses diálogos como janelas internas da própria página
// (não uma nova aba), a extensão não tem uma lista oficial dos campos de
// cada formulário — ela localiza o formulário visível mais provável de
// forma heurística. Sempre confira os campos preenchidos automaticamente
// antes de confirmar.

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
			title: "Outras",
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
	const PREFERENCES_KEY = "pdpActionPreferences"; // { [actionLabel]: [{id, name, fields, createdAt}] }
	const DIALOG_WAIT_TIMEOUT_MS = 6000;
	const DIALOG_WAIT_INTERVAL_MS = 150;
	const SUBMIT_LABEL_CANDIDATES = ["confirmar", "enviar", "salvar", "ok", "concluir", "sim", "gravar", "executar", "confirma"];

	let row = null;
	let activePanel = null;
	let activeGroupId = null;
	let processScreenEligible = false;
	let captureToolbar = null;
	let confirmBar = null;

	// -------------------------------------------------------------------
	// Detecção da tela de processo (mesma técnica usada em content.js/email.js)
	// -------------------------------------------------------------------

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

	// -------------------------------------------------------------------
	// Localização dos links nativos do painel Ações
	// -------------------------------------------------------------------

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
	// Preferências salvas (chrome.storage.local)
	// -------------------------------------------------------------------

	function loadAllPreferences() {
		return chrome.storage.local.get([PREFERENCES_KEY]).then(function (data) {
			return data[PREFERENCES_KEY] || {};
		});
	}

	function saveAllPreferences(all) {
		return chrome.storage.local.set({ [PREFERENCES_KEY]: all });
	}

	function loadPreferencesFor(label) {
		return loadAllPreferences().then(function (all) {
			return all[label] || [];
		});
	}

	function addPreference(label, name, fields) {
		return loadAllPreferences().then(function (all) {
			const list = all[label] || [];
			list.push({ id: "p" + Date.now() + Math.random().toString(36).slice(2, 7), name: name, fields: fields, createdAt: Date.now() });
			all[label] = list;
			return saveAllPreferences(all);
		});
	}

	function removePreference(label, id) {
		return loadAllPreferences().then(function (all) {
			all[label] = (all[label] || []).filter(function (p) {
				return p.id !== id;
			});
			return saveAllPreferences(all);
		});
	}

	// -------------------------------------------------------------------
	// Captura/preenchimento genérico de formulário de diálogo
	//
	// O Projudi abre cada ação como uma janela "interna" da própria página
	// (não uma aba nova), normalmente inserindo um novo <form> no fim do
	// documento. Como não temos acesso ao código-fonte desses diálogos
	// (só ao HTML estático de cada um, sem garantia de que a estrutura
	// seja idêntica em todo Tribunal/versão), a extensão localiza o
	// formulário-alvo de forma heurística: o <form> visível mais recente
	// que tenha campos — e, ao aplicar uma preferência, o mais recente que
	// contenha algum campo com o mesmo "name" do que foi salvo. Sempre
	// confira os campos antes de confirmar.
	// -------------------------------------------------------------------

	function isVisible(el) {
		return !!el && el.offsetParent !== null;
	}

	function findLikelyDialogForm() {
		const forms = document.querySelectorAll("form");
		for (let i = forms.length - 1; i >= 0; i--) {
			const form = forms[i];
			if (isVisible(form) && form.querySelector("input, select, textarea")) return form;
		}
		return null;
	}

	function findFormContainingFieldNames(names) {
		const forms = document.querySelectorAll("form");
		for (let i = forms.length - 1; i >= 0; i--) {
			const form = forms[i];
			if (!isVisible(form)) continue;
			const hasAny = names.some(function (name) {
				return !!form.querySelector('[name="' + cssEscapeAttr(name) + '"]');
			});
			if (hasAny) return form;
		}
		return null;
	}

	function cssEscapeAttr(value) {
		if (window.CSS && CSS.escape) return CSS.escape(value);
		return String(value).replace(/["\\]/g, "\\$&");
	}

	function captureFormFields(form) {
		const fields = [];
		const elements = form.querySelectorAll("input, select, textarea");
		elements.forEach(function (el) {
			if (!el.name) return;
			const type = (el.type || el.tagName || "").toLowerCase();
			if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "file" || type === "password") return;
			if (type === "checkbox" || type === "radio") {
				fields.push({ name: el.name, type: type, value: el.value, checked: el.checked });
			} else {
				fields.push({ name: el.name, type: type, value: el.value });
			}
		});
		return fields;
	}

	function applyFormFields(form, fields) {
		fields.forEach(function (f) {
			if (f.type === "checkbox" || f.type === "radio") {
				const el = form.querySelector('[name="' + cssEscapeAttr(f.name) + '"][value="' + cssEscapeAttr(f.value) + '"]');
				if (el) {
					el.checked = f.checked;
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}
			} else {
				const el = form.querySelector('[name="' + cssEscapeAttr(f.name) + '"]');
				if (el) {
					el.value = f.value;
					el.dispatchEvent(new Event("input", { bubbles: true }));
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}
			}
		});
	}

	function findSubmitControl(form) {
		const controls = Array.prototype.slice.call(
			form.querySelectorAll('input[type="submit"], button[type="submit"], input[type="button"], button')
		);
		for (let i = 0; i < controls.length; i++) {
			const c = controls[i];
			if (!isVisible(c)) continue;
			const label = (c.value || c.textContent || "").trim().toLowerCase();
			if (SUBMIT_LABEL_CANDIDATES.indexOf(label) !== -1) return c;
		}
		const submits = controls.filter(function (c) {
			return c.type === "submit" && isVisible(c);
		});
		return submits.length ? submits[submits.length - 1] : null;
	}

	function waitForFormWithFieldNames(names, callback) {
		const start = Date.now();
		const iv = setInterval(function () {
			const form = findFormContainingFieldNames(names);
			if (form) {
				clearInterval(iv);
				callback(form);
			} else if (Date.now() - start > DIALOG_WAIT_TIMEOUT_MS) {
				clearInterval(iv);
				callback(null);
			}
		}, DIALOG_WAIT_INTERVAL_MS);
	}

	// -------------------------------------------------------------------
	// Barra flutuante de captura ("+ Nova preferência")
	// -------------------------------------------------------------------

	function removeCaptureToolbar() {
		if (captureToolbar) {
			captureToolbar.remove();
			captureToolbar = null;
		}
	}

	function showCaptureToolbar(label) {
		removeCaptureToolbar();
		captureToolbar = document.createElement("div");
		captureToolbar.className = "pdp-qa-capture-bar";
		captureToolbar.innerHTML =
			'<span>Preencha o diálogo acima normalmente e depois:</span>' +
			'<button type="button" class="pdp-qa-capture-save">💾 Salvar como preferência</button>' +
			'<button type="button" class="pdp-qa-capture-cancel">Cancelar</button>';
		document.body.appendChild(captureToolbar);

		captureToolbar.querySelector(".pdp-qa-capture-cancel").addEventListener("click", removeCaptureToolbar);
		captureToolbar.querySelector(".pdp-qa-capture-save").addEventListener("click", function () {
			const form = findLikelyDialogForm();
			if (!form) {
				alert('Não encontrei o formulário do diálogo "' + label + '" para capturar. Ele ainda está aberto na tela?');
				return;
			}
			const name = prompt('Nome para esta preferência de "' + label + '":', "");
			if (!name) return;
			const fields = captureFormFields(form);
			addPreference(label, name.trim(), fields).then(function () {
				removeCaptureToolbar();
				alert('Preferência "' + name.trim() + '" salva para "' + label + '". Você ainda pode revisar e enviar este formulário normalmente.');
			});
		});
	}

	// -------------------------------------------------------------------
	// Barra flutuante de confirmação (aplicar preferência)
	// -------------------------------------------------------------------

	function removeConfirmBar() {
		if (confirmBar) {
			confirmBar.remove();
			confirmBar = null;
		}
	}

	function showConfirmBar(label, pref, form) {
		removeConfirmBar();
		confirmBar = document.createElement("div");
		confirmBar.className = "pdp-qa-confirm-bar";
		confirmBar.innerHTML =
			'<span>Confirmar "' + escapeHtml(label) + '" com a preferência "' + escapeHtml(pref.name) + '"?</span>' +
			'<button type="button" class="pdp-qa-confirm-yes">✅ Sim, executar</button>' +
			'<button type="button" class="pdp-qa-confirm-cancel">Cancelar</button>';
		document.body.appendChild(confirmBar);

		confirmBar.querySelector(".pdp-qa-confirm-cancel").addEventListener("click", removeConfirmBar);
		confirmBar.querySelector(".pdp-qa-confirm-yes").addEventListener("click", function () {
			const submit = findSubmitControl(form);
			removeConfirmBar();
			if (!submit) {
				alert('Os campos foram preenchidos, mas não encontrei o botão de confirmar do Projudi automaticamente. Confira e clique nele manualmente.');
				return;
			}
			submit.click();
		});
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	// -------------------------------------------------------------------
	// Ações dos itens do painel
	// -------------------------------------------------------------------

	function openActionDialog(label) {
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		link.click();
	}

	function startNewPreferenceCapture(label) {
		closePanel();
		removeConfirmBar();
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		link.click();
		setTimeout(function () {
			showCaptureToolbar(label);
		}, 400);
	}

	function applyPreference(label, pref) {
		closePanel();
		removeCaptureToolbar();
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		const fieldNames = pref.fields.map(function (f) {
			return f.name;
		});
		link.click();
		waitForFormWithFieldNames(fieldNames, function (form) {
			if (!form) {
				alert('A janela de "' + label + '" não apareceu a tempo (ou os campos mudaram). Preencha manualmente desta vez.');
				return;
			}
			applyFormFields(form, pref.fields);
			showConfirmBar(label, pref, form);
		});
	}

	// -------------------------------------------------------------------
	// Botões flutuantes (um por grupo) e painéis
	// -------------------------------------------------------------------

	function ensureRow() {
		if (row && row.isConnected) return;
		if (!isOnProcessScreen()) return;

		row = document.createElement("div");
		row.id = "pdp-qa-row";
		row.className = "pdp-qa-row";

		ACTION_GROUPS.forEach(function (group) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "pdp-qa-group-btn";
			btn.dataset.groupId = group.id;
			btn.innerHTML = '<span class="pdp-qa-icon">' + group.icon + "</span><span>" + group.title + "</span>";
			btn.title = "Ações de " + group.title;
			btn.addEventListener("click", function () {
				togglePanel(group);
			});
			row.appendChild(btn);
		});

		document.body.appendChild(row);
	}

	function closePanel() {
		if (activePanel) {
			activePanel.remove();
			activePanel = null;
		}
		if (activeGroupId && row) {
			const prevBtn = row.querySelector('[data-group-id="' + activeGroupId + '"]');
			if (prevBtn) prevBtn.classList.remove("pdp-qa-active");
		}
		activeGroupId = null;
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onKeydown, true);
	}

	function onOutsideClick(e) {
		if (activePanel && !activePanel.contains(e.target) && !(row && row.contains(e.target))) closePanel();
	}

	function onKeydown(e) {
		if (e.key === "Escape") closePanel();
	}

	function togglePanel(group) {
		if (activeGroupId === group.id) {
			closePanel();
			return;
		}
		closePanel();
		buildPanel(group);
	}

	// Diagnóstico: quando nenhuma ação de um grupo é encontrada, registra no
	// console (F12, filtro "Projudi Ações Rápidas") os rótulos esperados e
	// todo texto de link "a.link" realmente presente neste frame/URL — útil
	// para comparar se o Projudi usa um texto levemente diferente do
	// esperado (acento, espaço, "(*)" etc.) ou se esta tela/frame
	// simplesmente não é a que tem o painel "Ações" (ex.: usuário está em
	// outra aba do processo, não em Movimentações).
	function logAvailableLinkTexts(group) {
		const found = Array.prototype.slice.call(document.querySelectorAll("a.link")).map(normalizeLinkText).filter(Boolean);
		console.info(
			"[Projudi Ações Rápidas]",
			'grupo "' + group.title + '" — nenhum rótulo esperado bateu nesta tela.',
			"\nURL/frame:",
			window.location.href,
			"\nRótulos esperados:",
			group.actions,
			"\nTextos de a.link encontrados aqui:",
			found
		);
	}

	function buildPanel(group) {
		activeGroupId = group.id;
		const activeBtn = row && row.querySelector('[data-group-id="' + group.id + '"]');
		if (activeBtn) activeBtn.classList.add("pdp-qa-active");
		activePanel = document.createElement("div");
		activePanel.className = "pdp-qa-panel";

		const availableActions = group.actions.filter(function (label) {
			return !!findActionLink(label);
		});

		if (!availableActions.length) {
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Nenhuma ação de "' + group.title + '" foi encontrada nesta tela.';
			activePanel.appendChild(empty);
			logAvailableLinkTexts(group);
		} else {
			availableActions.forEach(function (label) {
				activePanel.appendChild(buildActionRow(label));
			});
		}

		document.body.appendChild(activePanel);
		positionPanel(group.id);

		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onKeydown, true);
		}, 0);

		availableActions.forEach(function (label) {
			loadPreferencesFor(label).then(function (prefs) {
				if (activeGroupId !== group.id) return; // painel já fechado/trocado
				renderPreferences(label, prefs);
			});
		});
	}

	function buildActionRow(label) {
		const actionRow = document.createElement("div");
		actionRow.className = "pdp-qa-action";
		actionRow.dataset.actionLabel = label;

		const header = document.createElement("div");
		header.className = "pdp-qa-action-header";

		const labelEl = document.createElement("span");
		labelEl.className = "pdp-qa-action-label";
		labelEl.textContent = label;
		header.appendChild(labelEl);

		const openBtn = document.createElement("button");
		openBtn.type = "button";
		openBtn.className = "pdp-qa-open-btn";
		openBtn.textContent = "Abrir";
		openBtn.title = "Abrir o diálogo normal do Projudi para esta ação";
		openBtn.addEventListener("click", function () {
			closePanel();
			openActionDialog(label);
		});
		header.appendChild(openBtn);

		actionRow.appendChild(header);

		const prefsWrap = document.createElement("div");
		prefsWrap.className = "pdp-qa-prefs";
		prefsWrap.dataset.actionLabel = label;
		actionRow.appendChild(prefsWrap);

		const newPrefBtn = document.createElement("button");
		newPrefBtn.type = "button";
		newPrefBtn.className = "pdp-qa-pref-new";
		newPrefBtn.textContent = "+ Nova preferência";
		newPrefBtn.title = "Abre o diálogo para você preencher e salvar o preenchimento como preferência";
		newPrefBtn.addEventListener("click", function () {
			startNewPreferenceCapture(label);
		});
		actionRow.appendChild(newPrefBtn);

		return actionRow;
	}

	function renderPreferences(label, prefs) {
		if (!activePanel) return;
		const wrap = activePanel.querySelector('.pdp-qa-prefs[data-action-label="' + cssEscapeAttr(label) + '"]');
		if (!wrap) return;
		wrap.innerHTML = "";
		prefs.forEach(function (pref) {
			const chip = document.createElement("span");
			chip.className = "pdp-qa-pref-chip";

			const applyBtn = document.createElement("button");
			applyBtn.type = "button";
			applyBtn.className = "pdp-qa-pref-btn";
			applyBtn.textContent = "★ " + pref.name;
			applyBtn.title = 'Preenche automaticamente e pede 1 confirmação para executar "' + label + '"';
			applyBtn.addEventListener("click", function () {
				applyPreference(label, pref);
			});
			chip.appendChild(applyBtn);

			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "pdp-qa-pref-del";
			delBtn.textContent = "🗑";
			delBtn.title = "Remover esta preferência";
			delBtn.addEventListener("click", function () {
				if (!confirm('Remover a preferência "' + pref.name + '" de "' + label + '"?')) return;
				removePreference(label, pref.id).then(function () {
					return loadPreferencesFor(label);
				}).then(function (updated) {
					renderPreferences(label, updated);
				});
			});
			chip.appendChild(delBtn);

			wrap.appendChild(chip);
		});
	}

	// -------------------------------------------------------------------
	// Posicionamento (mesma técnica dos botões irmãos de WhatsApp/e-mail)
	// -------------------------------------------------------------------

	function positionPanel(groupId) {
		if (!activePanel || !row) return;
		const btn = row.querySelector('[data-group-id="' + groupId + '"]');
		if (!btn) return;
		const rect = btn.getBoundingClientRect();

		const bottom = window.innerHeight - rect.top + 6;
		const maxHeight = rect.top - BUTTON_SCREEN_MARGIN * 2;
		activePanel.style.bottom = Math.round(bottom) + "px";
		activePanel.style.maxHeight = Math.max(140, Math.round(maxHeight)) + "px";

		const panelRect = activePanel.getBoundingClientRect();
		let right = window.innerWidth - rect.right;
		const overflowLeft = window.innerWidth - right - panelRect.width - BUTTON_SCREEN_MARGIN;
		if (overflowLeft < 0) right += overflowLeft;
		activePanel.style.right = Math.max(BUTTON_SCREEN_MARGIN, Math.round(right)) + "px";
	}

	function repositionRow() {
		if (!row) return;

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
			const rowHeight = row.offsetHeight || 32;
			const bottom = window.innerHeight - groupCenter - rowHeight / 2;
			row.style.bottom = Math.max(BUTTON_SCREEN_MARGIN, Math.round(bottom)) + "px";
			row.style.right = Math.round(window.innerWidth - minLeft + 8) + "px";
			if (activeGroupId) positionPanel(activeGroupId);
			return;
		}

		let bottom = BUTTON_SCREEN_MARGIN;
		const toolbarButton = findProcessToolbarElement();
		if (toolbarButton) {
			const toolbarRow = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = toolbarRow.getBoundingClientRect();
			const toolbarVisible = rect.bottom > 0 && rect.top < window.innerHeight;
			if (toolbarVisible) {
				const offset = Math.round(window.innerHeight - rect.top + BUTTON_SCREEN_MARGIN);
				bottom = Math.min(Math.max(BUTTON_SCREEN_MARGIN, offset), window.innerHeight - BUTTON_SCREEN_MARGIN);
			}
		}
		row.style.bottom = bottom + "px";
		row.style.right = BUTTON_SCREEN_MARGIN + "px";
		if (activeGroupId) positionPanel(activeGroupId);
	}

	// -------------------------------------------------------------------
	// Reconciliação (sobrevive a trocas de aba do processo) e listeners
	// -------------------------------------------------------------------

	function isElementUsable(el) {
		return !!el && el.isConnected;
	}

	function reconcile() {
		try {
			if (!isElementUsable(row)) {
				ensureRow();
			}
			if (activePanel && !activePanel.isConnected) {
				activePanel = null;
				activeGroupId = null;
			}
			repositionRow();
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
			repositionRow();
		});
	}
	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);
})();
