// Projudi - Botão "Nova Remessa" na tela "Realizar Remessa"
//
// A tela nativa "Realizar Remessa" só permite escolher UMA opção por vez
// (Enviar à Delegacia, Autos ao Distribuidor, Enviar ao Ministério Público
// ou Outras Remessas): ao clicar em "Realizar Remessa", o Projudi encerra o
// fluxo e volta para a tela do processo - correto para uma única remessa,
// mas obriga a reabrir a tela do zero para cada remessa que o processo
// precise.
//
// Este recurso segue exatamente o mesmo padrão já usado e testado pelo
// botão "🔁 Nova Ordenação" (src/ordenarCumprimentos.js) para o mesmo
// problema nos diálogos de ordenação - ver esse arquivo para o raciocínio
// completo. Resumo aqui:
//
// Duas tentativas anteriores tentaram resolver isso trocando as bolinhas
// por checkboxes e ligando/desligando campos de cada opção por conta
// própria, na PRÓPRIA tela nativa - mas a extensão não tem acesso ao
// código-fonte dela, então a heurística de "quais campos pertencem a qual
// opção" não batia com a estrutura real, e acabou travando campos que
// deveriam continuar editáveis. Este recurso NUNCA mexe no formulário
// nativo enquanto ele está sendo preenchido: a tela continua 100% nativa
// (uma bolinha por vez, validação nativa, campos habilitados/desabilitados
// exatamente como o próprio Projudi já faz).
//
// Em vez disso, um botão "🔁 Nova Remessa" ao lado do "Realizar Remessa"
// nativo:
// 1. Valida o preenchimento atual (validação nativa do navegador).
// 2. GUARDA os campos preenchidos (só os que o usuário de fato preencheu,
//    nunca campos ocultos) numa fila, em memória.
// 3. Limpa o formulário (`form.reset()`) para a próxima remessa, no MESMO
//    diálogo já aberto - sem navegar, sem reabrir nada.
//
// Ao clicar no "Realizar Remessa" nativo de verdade (o último, encerrando o
// fluxo), o item preenchido na tela nesse momento entra para a fila também
// (como último) e TUDO é reenviado em segundo plano, um de cada vez, cada
// um por um diálogo NOVO (mesmo token de sessão fresco a cada um - ver
// ordenarCumprimentos.js para o porquê disso ser necessário), num iframe
// oculto. O clique nativo em si nunca chega a ser disparado de verdade. Se
// tudo for confirmado, uma mensagem de sucesso substitui o diálogo. Se
// algum item falhar, a extensão avisa qual e para - nada mais é enviado.
(function () {
	"use strict";

	if (window.__pdpNovaRemessaInjected) return;
	window.__pdpNovaRemessaInjected = true;

	const SUBMIT_LABEL = "Realizar Remessa";
	const NEW_BUTTON_CLASS = "pdp-nova-remessa-btn";
	const DONE_MARKER = "pdpNovaRemessaFeito";
	const RECONCILE_INTERVAL_MS = 500;
	const BACKGROUND_STEP_TIMEOUT_MS = 20000;
	const AUTO_CLOSE_DELAY_MS = 500;
	const LOG_PREFIX = "[Projudi Nova Remessa]";

	// Rótulos exatos das opções da tela, só para dar um nome amigável a
	// cada item da fila (ex.: "Enviar ao Ministério Público") - não afeta
	// em nada o preenchimento/envio, que sempre usa o formulário inteiro.
	const OPTION_LABELS = [
		"Enviar à Delegacia",
		"Autos ao Distribuidor",
		"Enviar ao Ministério Público",
		"Outras Remessas",
	];

	// -------------------------------------------------------------------
	// Log de diagnóstico (mesmo padrão de ordenarCumprimentos.js): guarda
	// em sessionStorage porque o clique final em "Realizar Remessa"
	// (quando a fila está vazia, uso normal de um item só) navega de
	// verdade para a tela seguinte.
	// -------------------------------------------------------------------
	const LOG_STORAGE_KEY = "pdpNovaRemessaLog";
	const LOG_MAX_ENTRIES = 300;
	let diagnosticLog;
	try {
		diagnosticLog = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || "[]");
		if (!Array.isArray(diagnosticLog)) diagnosticLog = [];
	} catch (err) {
		diagnosticLog = [];
	}
	window.__pdpNovaRemessaLog = diagnosticLog;
	function logEvent(type, data) {
		const entry = Object.assign({ t: new Date().toISOString(), url: window.location.href, type: type }, data || {});
		diagnosticLog.push(entry);
		if (diagnosticLog.length > LOG_MAX_ENTRIES) diagnosticLog.splice(0, diagnosticLog.length - LOG_MAX_ENTRIES);
		try {
			sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(diagnosticLog));
		} catch (err) {
			// sessionStorage cheio ou indisponível - segue só em memória.
		}
		let dataText = "";
		try {
			dataText = JSON.stringify(data || {});
		} catch (err) {
			dataText = String(data);
		}
		console.info(LOG_PREFIX, type, "|", dataText);
	}
	logEvent("script-loaded", {});

	function normalizeText(el) {
		return (el.textContent || "").replace(/\s+/g, " ").trim();
	}

	function isVisible(el) {
		if (!el || !el.isConnected) return false;
		const rect = el.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return false;
		const style = window.getComputedStyle(el);
		return style.display !== "none" && style.visibility !== "hidden";
	}

	function cssEscapeAttr(value) {
		if (window.CSS && CSS.escape) return CSS.escape(value);
		return String(value).replace(/["\\]/g, "\\$&");
	}

	// Localiza o botão "Realizar Remessa" visível - o texto já é
	// específico o bastante (não existe outro controle com esse rótulo
	// exato na tela), então, ao contrário de ordenarCumprimentos.js (que
	// precisa distinguir três diálogos diferentes que usam o mesmo rótulo
	// "Ordenar"), não é preciso nenhuma outra checagem de contexto.
	function findRemessaButton(doc) {
		const controls = doc.querySelectorAll('input[type="submit"], input[type="button"], button');
		for (let i = 0; i < controls.length; i++) {
			const c = controls[i];
			if (!isVisible(c)) continue;
			if ((c.value || normalizeText(c) || "").trim() === SUBMIT_LABEL) return c;
		}
		return null;
	}

	function findRemessaDialog(doc) {
		const button = findRemessaButton(doc);
		if (!button || !button.form) return null;
		return { button: button, form: button.form };
	}

	// -------------------------------------------------------------------
	// Captura/aplicação de campos do formulário - mesmo código de
	// ordenarCumprimentos.js/quickActions.js: só campos que o usuário
	// preenche de verdade, nunca hidden/submit/button/reset/file/password;
	// checkboxes e radios (inclusive as bolinhas de opção e as de
	// Urgente/Agendar envio) são capturados com seu estado
	// marcado/desmarcado, para reproduzir a mesma escolha no diálogo novo.
	// -------------------------------------------------------------------
	function captureFormFields(form) {
		const fields = [];
		const elements = form.querySelectorAll("input, select, textarea");
		elements.forEach(function (el) {
			if (!el.name) return;
			const type = (el.type || el.tagName || "").toLowerCase();
			if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "file" || type === "password") return;
			if (type === "checkbox" || type === "radio") {
				fields.push({ name: el.name, type: type, value: el.value, checked: el.checked });
			} else if (type === "select-one" && el.selectedIndex >= 0) {
				// Guarda também o TEXTO da opção escolhida - alguns desses
				// combobox são "select2" alimentados por busca (ex.: o
				// "Destino" de "Outras Remessas", que começa vazio e só
				// ganha a opção escolhida por AJAX enquanto o usuário
				// digita/seleciona). No diálogo novo resolvido em segundo
				// plano, esse <select> nasce sem nenhuma <option> além do
				// placeholder - só atribuir `.value` não faz nada, porque a
				// opção escolhida simplesmente não existe ali ainda (visto
				// ao vivo: "Destino da remessa não informado" mesmo com o
				// valor certo capturado). applyFormFields (abaixo) usa esse
				// texto para recriar a <option> que faltar antes de aplicar
				// o valor.
				fields.push({ name: el.name, type: type, value: el.value, text: normalizeText(el.options[el.selectedIndex]) });
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
					if (f.type === "select-one" && f.value && !el.querySelector('option[value="' + cssEscapeAttr(f.value) + '"]')) {
						el.add(new Option(f.text || f.value, f.value));
					}
					el.value = f.value;
					el.dispatchEvent(new Event("input", { bubbles: true }));
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}
			}
		});
	}

	// Nome amigável do item na fila: qual das 4 opções está marcada agora,
	// achada pelo texto literal do rótulo mais próximo de cada radio (só
	// para exibição - não precisa ser perfeito).
	function findOptionLabel(radio) {
		let el = radio;
		for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
			const text = normalizeText(el);
			for (let j = 0; j < OPTION_LABELS.length; j++) {
				if (text.indexOf(OPTION_LABELS[j]) === 0) return OPTION_LABELS[j];
			}
		}
		return null;
	}

	function describeSelection(form, index) {
		const radios = form.querySelectorAll('input[type="radio"]');
		for (let i = 0; i < radios.length; i++) {
			if (!radios[i].checked) continue;
			const label = findOptionLabel(radios[i]);
			if (label) return label;
		}
		return "Remessa " + (index + 1);
	}

	// -------------------------------------------------------------------
	// Fila (em memória - reinicia sozinha se o diálogo for fechado/trocado)
	// -------------------------------------------------------------------

	function createQueueController(dialog) {
		const items = []; // { label, fields: [{name,type,value[,checked]}, ...] }
		let flushing = false;
		let succeeded = false;

		const panel = document.createElement("div");
		panel.className = "pdp-fila-ordenacoes";
		panel.hidden = true;
		dialog.novoBtn.insertAdjacentElement("afterend", panel);

		function renderPanel() {
			panel.hidden = items.length === 0;
			panel.innerHTML = "";
			if (!items.length) return;

			const header = document.createElement("div");
			header.className = "pdp-fila-header";
			header.textContent = "Fila de remessas (" + items.length + "), enviadas junto com a próxima vez que clicar em \"Realizar Remessa\":";
			panel.appendChild(header);

			const list = document.createElement("ul");
			list.className = "pdp-fila-lista";
			items.forEach(function (item, idx) {
				const li = document.createElement("li");
				const span = document.createElement("span");
				span.textContent = idx + 1 + ". " + item.label;
				li.appendChild(span);

				const removeBtn = document.createElement("button");
				removeBtn.type = "button";
				removeBtn.className = "pdp-fila-remover";
				removeBtn.title = "Remover este item da fila";
				removeBtn.textContent = "✕";
				removeBtn.addEventListener("click", function () {
					removeAt(idx);
				});
				li.appendChild(removeBtn);

				list.appendChild(li);
			});
			panel.appendChild(list);
		}

		function updateButtonLabel() {
			dialog.novoBtn.textContent = items.length ? "🔁 Nova Remessa (" + items.length + " na fila)" : "🔁 Nova Remessa";
		}

		function push(fields) {
			items.push({
				label: describeSelection(dialog.form, items.length),
				fields: fields,
			});
			renderPanel();
			updateButtonLabel();
		}

		function removeAt(idx) {
			items.splice(idx, 1);
			renderPanel();
			updateButtonLabel();
		}

		function isEmpty() {
			return items.length === 0;
		}

		function setFlushing(value) {
			if (succeeded) return;
			flushing = value;
			dialog.novoBtn.disabled = value;
			dialog.button.disabled = value;
		}

		// Chamado quando TODOS os itens (fila + o que estava na tela) foram
		// confirmados em segundo plano - o clique nativo nunca chega a
		// acontecer de verdade, então é esta mensagem quem avisa o
		// resultado. Desabilita tudo permanentemente para evitar reenvio
		// duplicado por engano.
		function showSuccess(totalCount) {
			succeeded = true;
			items.length = 0;
			dialog.novoBtn.disabled = true;
			dialog.button.disabled = true;
			Array.prototype.forEach.call(dialog.form.querySelectorAll("input, select, textarea, button"), function (el) {
				el.disabled = true;
			});
			panel.hidden = false;
			panel.innerHTML = "";
			const banner = document.createElement("div");
			banner.className = "pdp-fila-sucesso";
			banner.textContent = "✅ " + totalCount + " remessa" + (totalCount === 1 ? "" : "s") + " realizada" + (totalCount === 1 ? "" : "s") + " com sucesso. Fechando esta janela...";
			panel.appendChild(banner);

			setTimeout(function () {
				logEvent("auto-close", {});
				try {
					window.close();
				} catch (err) {
					logEvent("auto-close-error", { message: err && err.message });
				}
			}, AUTO_CLOSE_DELAY_MS);
		}

		return {
			push: push,
			isEmpty: isEmpty,
			getItems: function () {
				return items;
			},
			isFlushing: function () {
				return flushing;
			},
			setFlushing: setFlushing,
			removeAt: removeAt,
			showSuccess: showSuccess,
		};
	}

	// -------------------------------------------------------------------
	// API de quickActions.js, que expõe resolveDialogUrl(label) - a mesma
	// cadeia já usada e testada pelo recurso "Ações rápidas" para achar a
	// URL de um diálogo de ação, gerando um diálogo (e token de sessão)
	// NOVO a cada chamada.
	// -------------------------------------------------------------------
	function findQuickActionsApi() {
		try {
			if (window.parent && window.parent !== window && window.parent.__pdpQuickActions) return window.parent.__pdpQuickActions;
		} catch (err) {
			// acesso entre frames bloqueado - ignora
		}
		try {
			if (window.top && window.top !== window && window.top.__pdpQuickActions) return window.top.__pdpQuickActions;
		} catch (err) {
			// acesso entre frames bloqueado - ignora
		}
		if (window.__pdpQuickActions) return window.__pdpQuickActions;
		return null;
	}

	// Mesma caixa de erro genérica do Projudi (`#errorMessages`) já usada
	// em ordenarCumprimentos.js.
	function readErrorMessages(doc) {
		const box = doc.getElementById("errorMessages");
		if (!box) return null;
		const items = Array.prototype.map.call(box.querySelectorAll("#ulMensErros li, ul li"), function (li) {
			return normalizeText(li);
		});
		const protocolMatch = box.textContent.match(/PROTOCOLO:\s*([0-9]+)/i);
		return {
			mensagens: items,
			protocolo: protocolMatch ? protocolMatch[1] : null,
		};
	}

	// -------------------------------------------------------------------
	// Reenvio de um item da fila em segundo plano: resolve um diálogo NOVO
	// de "Realizar Remessa" (token de sessão novo), aplica os campos
	// guardados nele, e clica no botão desse diálogo novo - tudo dentro de
	// um <iframe> oculto, sem navegar a aba visível.
	// -------------------------------------------------------------------

	function waitForIframeEvent(iframe, options) {
		options = options || {};
		return new Promise(function (resolve, reject) {
			let settled = false;
			const timeout = setTimeout(function () {
				if (settled) return;
				settled = true;
				iframe.removeEventListener("load", onLoad);
				reject(new Error(options.timeoutMessage || "tempo esgotado"));
			}, BACKGROUND_STEP_TIMEOUT_MS);
			function onLoad() {
				if (settled) return;
				if (options.skipAboutBlank) {
					let href;
					try {
						href = iframe.contentWindow.location.href;
					} catch (err) {
						href = null;
					}
					if (href === "about:blank") return;
				}
				settled = true;
				clearTimeout(timeout);
				iframe.removeEventListener("load", onLoad);
				resolve();
			}
			iframe.addEventListener("load", onLoad);
		});
	}

	async function submitItemInBackground(item, api) {
		logEvent("flush-item-start", { label: item.label, fields: item.fields });

		let resolved;
		try {
			resolved = await api.resolveDialogUrl(SUBMIT_LABEL);
		} catch (err) {
			const result = { ok: false, reason: "erro ao resolver diálogo novo: " + (err && err.message) };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}
		if (!resolved || resolved.failed || !resolved.url) {
			const result = { ok: false, reason: 'não consegui abrir um diálogo novo de "' + SUBMIT_LABEL + '" em segundo plano' };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}

		const iframe = document.createElement("iframe");
		iframe.style.position = "absolute";
		iframe.style.top = "-9999px";
		iframe.style.left = "-9999px";
		iframe.style.width = "1024px";
		iframe.style.height = "768px";
		document.body.appendChild(iframe);

		function cleanup() {
			if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
		}

		try {
			const loadPromise = waitForIframeEvent(iframe, { skipAboutBlank: true, timeoutMessage: "tempo esgotado carregando o diálogo novo" });
			iframe.src = resolved.url;
			await loadPromise;
		} catch (err) {
			cleanup();
			const result = { ok: false, reason: err.message };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}

		let freshDialog;
		try {
			freshDialog = findRemessaDialog(iframe.contentDocument);
		} catch (err) {
			freshDialog = null;
		}
		if (!freshDialog) {
			cleanup();
			const result = { ok: false, reason: "o diálogo novo carregado não tinha o formulário esperado" };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}

		applyFormFields(freshDialog.form, item.fields);

		try {
			const submitPromise = waitForIframeEvent(iframe, { timeoutMessage: "tempo esgotado aguardando resposta do Projudi" });
			freshDialog.button.click();
			await submitPromise;
		} catch (err) {
			cleanup();
			const result = { ok: false, reason: err.message };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}

		let finalUrl = null;
		let errorInfo = null;
		let stillHasDialog = false;
		let htmlSnippet = null;
		try {
			const doc = iframe.contentDocument;
			finalUrl = iframe.contentWindow.location.href;
			if (doc) {
				errorInfo = readErrorMessages(doc);
				stillHasDialog = !!findRemessaDialog(doc);
				htmlSnippet = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim().slice(0, 1000);
			}
		} catch (err) {
			cleanup();
			const result = { ok: false, reason: "não consegui ler a resposta do Projudi (" + err.message + ")" };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}
		cleanup();

		let result;
		if (errorInfo) {
			result = {
				ok: false,
				reason: (errorInfo.mensagens.join("; ") || "erro não identificado") + (errorInfo.protocolo ? " (protocolo " + errorInfo.protocolo + ")" : ""),
			};
		} else if (stillHasDialog) {
			result = { ok: false, reason: "o Projudi reapresentou o formulário (sem mensagem de erro explícita)" };
		} else {
			result = { ok: true };
		}
		logEvent("flush-item-result", { label: item.label, result: result, finalUrl: finalUrl, errorInfo: errorInfo, htmlSnippet: htmlSnippet });
		return result;
	}

	// Reenvia uma lista de itens (fila + o item que está na tela no momento
	// do clique final) em segundo plano, um de cada vez, cada um por um
	// diálogo NOVO. Para no primeiro item que falhar.
	async function flushAll(items, api) {
		logEvent("flush-start", { totalItens: items.length });
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const result = await submitItemInBackground(item, api);
			if (!result.ok) {
				logEvent("flush-abort", { label: item.label, reason: result.reason });
				return { ok: false, confirmedCount: i, item: item, reason: result.reason };
			}
		}
		logEvent("flush-complete", {});
		return { ok: true, confirmedCount: items.length };
	}

	// -------------------------------------------------------------------
	// Botão "Nova Remessa" e interceptação do "Realizar Remessa" final
	// -------------------------------------------------------------------

	function makeNovaRemessaButton() {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = NEW_BUTTON_CLASS;
		btn.textContent = "🔁 Nova Remessa";
		btn.title = 'Guarda esta remessa e limpa o formulário para a próxima (ex.: uma remessa à Delegacia e outra ao Ministério Público) - tudo é enviado ao Projudi de uma vez quando você clicar em "Realizar Remessa" pela última vez.';
		return btn;
	}

	function setupDialog(dialog) {
		if (dialog.button.dataset[DONE_MARKER]) return;
		dialog.button.dataset[DONE_MARKER] = "1";

		logEvent("dialog-detected", { formAction: dialog.form.action, formMethod: dialog.form.method, formId: dialog.form.id });

		dialog.novoBtn = makeNovaRemessaButton();
		dialog.button.insertAdjacentElement("afterend", dialog.novoBtn);
		const queue = createQueueController(dialog);

		dialog.novoBtn.addEventListener("click", function (evt) {
			evt.preventDefault();
			if (queue.isFlushing()) return;
			if (!dialog.form.reportValidity()) return; // mostra a validação nativa do navegador e para aqui
			const fields = captureFormFields(dialog.form);
			logEvent("queued", { fields: fields });
			queue.push(fields);
			dialog.form.reset();
			// form.reset() não dispara 'change' - sem isso, qualquer JS do
			// próprio Projudi que mostra/habilita campos conforme a opção
			// escolhida ficaria com a tela numa aparência inconsistente com
			// os valores já resetados (nenhuma opção mais marcada).
			dialog.form.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (el) {
				el.dispatchEvent(new Event("change", { bubbles: true }));
			});
		});

		// Intercepta o clique real em "Realizar Remessa" sempre que houver
		// algo na fila: o item preenchido na tela NESTE momento entra para
		// a fila como último item, e TUDO é reenviado em segundo plano,
		// cada item por um diálogo NOVO - nunca envia nada pelo formulário
		// visível de verdade. Sem nada na fila (uso normal, de uma remessa
		// só), não intercepta nada - segue 100% nativo, exatamente como
		// sempre funcionou.
		dialog.button.addEventListener(
			"click",
			function (evt) {
				if (queue.isEmpty() || queue.isFlushing()) return;
				evt.preventDefault();
				evt.stopImmediatePropagation();
				if (!dialog.form.reportValidity()) return; // mostra a validação nativa do navegador e para aqui

				const finalFields = captureFormFields(dialog.form);
				const finalItem = { label: describeSelection(dialog.form, queue.getItems().length), fields: finalFields };
				logEvent("queued-final", { fields: finalFields });
				const queuedItems = queue.getItems().slice();
				const allItems = queuedItems.concat([finalItem]);

				queue.setFlushing(true);
				(async function () {
					const api = findQuickActionsApi();
					if (!api || typeof api.resolveDialogUrl !== "function") {
						const reason = 'não encontrei o recurso "Ações rápidas" (quickActions.js) necessário para reenviar em segundo plano';
						logEvent("flush-abort", { reason: reason });
						alert("Não consegui enviar as remessas: " + reason + ".\n\nNada foi enviado. Recarregue a página e tente novamente.");
						return;
					}

					const result = await flushAll(allItems, api);

					const confirmedFromQueue = Math.min(result.confirmedCount, queuedItems.length);
					for (let removed = 0; removed < confirmedFromQueue; removed++) queue.removeAt(0);

					if (!result.ok) {
						const isFinalItem = result.confirmedCount >= queuedItems.length;
						alert(
							'Não consegui realizar a remessa "' +
								result.item.label +
								'": ' +
								result.reason +
								".\n\n" +
								(isFinalItem
									? 'Os itens da fila já confirmados foram removidos. Revise os campos preenchidos nesta tela e clique em "Realizar Remessa" novamente.'
									: "Revise esse item (ele continua na fila) e tente novamente.") +
								'\n\nDetalhes técnicos ficam salvos em window.__pdpNovaRemessaLog (console, F12) - copy(JSON.stringify(window.__pdpNovaRemessaLog, null, 2)) copia tudo para compartilhar.'
						);
						return;
					}

					logEvent("all-confirmed", { totalItens: allItems.length });
					queue.showSuccess(allItems.length);
				})()
					.catch(function (err) {
						logEvent("flush-exception", { message: err && err.message });
						console.error(LOG_PREFIX, "erro ao enviar as remessas:", err);
					})
					.finally(function () {
						queue.setFlushing(false);
					});
			},
			true
		);
	}

	// -------------------------------------------------------------------
	// Reconciliação (mesmo padrão de quickActions.js/ordenarCumprimentos.js:
	// intervalo curto + MutationObserver, com try/catch para nunca travar a
	// tela do Projudi)
	// -------------------------------------------------------------------

	function reconcile() {
		try {
			const dialog = findRemessaDialog(document);
			if (dialog) setupDialog(dialog);
		} catch (err) {
			console.error(LOG_PREFIX, "erro ao reconciliar:", err);
		}
	}

	setInterval(reconcile, RECONCILE_INTERVAL_MS);
	reconcile();

	const observer = new MutationObserver(function () {
		try {
			reconcile();
		} catch (err) {
			console.error(LOG_PREFIX, "erro no MutationObserver:", err);
		}
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });
})();
