// Projudi - Botão "Nova Ordenação" nos diálogos de ordenação
// (Ordenar Cumprimentos, Ordenar RPV, Ordenar Expedição BNMP)
//
// Depois que o script de triagem roda num processo, é comum o usuário
// precisar ordenar mais de um cumprimento em seguida (ex.: um ofício, um
// mandado, um edital, uma requisição de laudo). O diálogo nativo só
// ordena UM cumprimento por envio: ao clicar em "Ordenar", o Projudi
// encerra o fluxo e leva para a tela do processo — comportamento correto
// para uma única ação, mas que obriga a reabrir manualmente o diálogo do
// zero a cada nova ordenação.
//
// Este recurso adiciona um botão "🔁 Nova Ordenação" ao lado do botão
// nativo "Ordenar". Em vez de enviar o formulário, ele:
// 1. Valida o preenchimento atual (validação nativa do navegador, a
//    mesma que os campos "required" já disparam ao tentar enviar).
// 2. GUARDA os campos que o usuário preencheu de verdade (nunca campos
//    ocultos - ver "Por que reabrir um diálogo novo" abaixo) numa fila,
//    em memória, sem enviar nada ao Projudi ainda.
// 3. Limpa o formulário (`form.reset()`) para a próxima ordenação, no
//    MESMO diálogo já aberto - sem navegar, sem reabrir nada.
//
// Só quando o usuário clica no botão "Ordenar" nativo de verdade (o
// último, encerrando o fluxo) é que tudo é enviado ao Projudi:
// 1. Cada item da fila é reenviado em segundo plano, um de cada vez, num
//    <iframe> oculto (mesma técnica já usada pelo recurso "Ações
//    rápidas" em quickActions.js para não navegar a aba visível).
// 2. Só depois que todos os itens da fila forem confirmados, o clique
//    real em "Ordenar" é disparado no diálogo VISÍVEL - agora com a fila
//    vazia, o formulário atual (o último preenchido) segue o fluxo 100%
//    nativo do Projudi (mesma validação, mesmo envio, mesma navegação de
//    saída).
// 3. Se algum item da fila falhar (ex.: um campo obrigatório que o
//    Projudi rejeitou), a extensão avisa qual item falhou e PARA - nada
//    mais é enviado, o diálogo continua aberto para o usuário revisar.
//
// Clicar em "Cancelar" descarta a fila normalmente junto com o diálogo -
// nada do que foi só guardado chega a ser enviado.
//
// Por que reabrir um diálogo NOVO para cada item da fila (em vez de só
// reenviar os mesmos campos para o mesmo endereço): testes ao vivo
// mostraram um item da fila "confirmado" (sem erro nenhum, tela de
// sucesso normal) mas que não aparecia nos autos depois. A explicação
// mais provável, típica de aplicações Java/Struts como o Projudi: um
// campo oculto de sessão/token de uso único no formulário, que o
// primeiro envio consome - reenviar o MESMO token guardado (de uma
// página que o usuário ainda está vendo) arrisca reaproveitar um token
// já gasto, e o Projudi pode aceitar a requisição sem indicar erro
// algum, mas sem repetir a ação de fato. Por isso cada item da fila
// resolve e carrega um diálogo NOVO (mesma cadeia já usada e testada em
// quickActions.js/resolveDialogUrl, que gera um diálogo com token novo a
// cada chamada) e só aplica em cima dele os campos que o usuário
// preencheu de verdade - nunca os campos ocultos, que ficam com o valor
// (o token novo) que esse diálogo já trouxe.

(function () {
	"use strict";

	if (window.__pdpNovaOrdenacaoInjected) return;
	window.__pdpNovaOrdenacaoInjected = true;

	// Rótulos exatos dos diálogos de ordenação (mesmos rótulos do grupo
	// "Ordenações" em quickActions.js) - usados tanto para identificar QUAL
	// diálogo está aberto quanto para pedir um diálogo novo do mesmo tipo
	// via resolveDialogUrl(label).
	const DIALOG_TITLES = ["Ordenar Cumprimentos", "Ordenar RPV", "Ordenar Expedição BNMP"];

	const NEW_BUTTON_CLASS = "pdp-nova-ordenacao-btn";
	const DONE_MARKER = "pdpNovaOrdenacaoFeito";
	const RECONCILE_INTERVAL_MS = 500;
	const MAX_ANCESTOR_HOPS = 8;
	// Tempo máximo esperando cada etapa (carregar o diálogo novo, resposta
	// do envio) de um item da fila em segundo plano antes de considerar que
	// falhou.
	const BACKGROUND_STEP_TIMEOUT_MS = 20000;
	const LOG_PREFIX = "[Projudi Nova Ordenação]";

	// -------------------------------------------------------------------
	// Log de diagnóstico - guarda cada passo (o que foi guardado na fila,
	// o que cada reenvio em segundo plano mandou e recebeu de volta) num
	// array acessível pelo console (F12), para investigar uma causa raiz
	// real em vez de adivinhar. No console, depois de reproduzir o
	// problema:
	//   copy(JSON.stringify(window.__pdpNovaOrdenacaoLog, null, 2))
	// cola o log inteiro na área de transferência para compartilhar.
	//
	// Guardado em sessionStorage (não só em memória): o clique final em
	// "Ordenar" NAVEGA de verdade para a tela seguinte (sucesso ou erro),
	// o que destrói e reinicia este script do zero - um array só em
	// memória se perderia antes de dar tempo de copiá-lo. sessionStorage
	// sobrevive a essa navegação (mesma aba, mesma origem, inclusive para
	// uma aba nova aberta a partir da original).
	// -------------------------------------------------------------------
	const LOG_STORAGE_KEY = "pdpNovaOrdenacaoLog";
	const LOG_MAX_ENTRIES = 300;
	let diagnosticLog;
	try {
		diagnosticLog = JSON.parse(sessionStorage.getItem(LOG_STORAGE_KEY) || "[]");
		if (!Array.isArray(diagnosticLog)) diagnosticLog = [];
	} catch (err) {
		diagnosticLog = [];
	}
	window.__pdpNovaOrdenacaoLog = diagnosticLog;
	function logEvent(type, data) {
		const entry = Object.assign({ t: new Date().toISOString(), url: window.location.href, type: type }, data || {});
		diagnosticLog.push(entry);
		if (diagnosticLog.length > LOG_MAX_ENTRIES) diagnosticLog.splice(0, diagnosticLog.length - LOG_MAX_ENTRIES);
		try {
			sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(diagnosticLog));
		} catch (err) {
			// sessionStorage cheio ou indisponível - o log continua
			// funcionando só em memória (window.__pdpNovaOrdenacaoLog) para
			// esta página, mesmo que não sobreviva a uma navegação.
		}
		// Loga como texto puro (JSON já serializado), não como objeto vivo do
		// console — objetos vivos aparecem como "[object Object]" quando o
		// texto do console é selecionado/colado sem clicar em cada um pra
		// expandir, o que já causou várias rodadas de log inútil. Com texto
		// puro, um simples selecionar-tudo-e-copiar do painel Console (em
		// QUALQUER frame, o Chrome já mostra logs de todo frame na aba
		// "top") já traz o conteúdo completo, sem precisar trocar de
		// contexto no seletor de frame.
		let dataText = "";
		try {
			dataText = JSON.stringify(data || {});
		} catch (err) {
			dataText = String(data);
		}
		console.info(LOG_PREFIX, type, "|", dataText);
	}
	// Log incondicional, só pra confirmar que o script está mesmo ativo
	// neste frame antes de qualquer interação - igual ao "content script
	// carregado em ..." que os outros recursos desta extensão já logam.
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

	// Acha o botão "Ordenar" visível cujo botão "Cancelar" fica logo ao
	// lado (mesmo container imediato) — o par de botões do rodapé desses
	// diálogos, como visto na tela "Ordenar Cumprimentos"
	// (id="cumprimentoButton"/id="cancelButton" nesse diálogo em
	// particular, mas a extensão identifica pelo TEXTO visível, já que
	// "Ordenar RPV"/"Ordenar Expedição BNMP" podem usar outros ids).
	function findOrdenarButton(doc) {
		const controls = doc.querySelectorAll('input[type="submit"], input[type="button"], button');
		for (let i = 0; i < controls.length; i++) {
			const c = controls[i];
			if (!isVisible(c)) continue;
			const label = (c.value || normalizeText(c) || "").trim();
			if (label !== "Ordenar") continue;
			const parent = c.parentElement;
			if (!parent) continue;
			const hasCancelar = Array.prototype.some.call(parent.children, function (sibling) {
				const siblingLabel = (sibling.value || normalizeText(sibling) || "").trim();
				return siblingLabel === "Cancelar";
			});
			if (hasCancelar) return c;
		}
		return null;
	}

	function findOrdenacaoDialog(doc) {
		const button = findOrdenarButton(doc);
		if (!button || button.type !== "submit" || !button.form) return null;
		return { button: button, form: button.form };
	}

	// Identifica QUAL dos diálogos de ordenação está aberto, subindo alguns
	// níveis a partir do botão "Ordenar" até achar um container cujo texto
	// inclua um dos títulos esperados. Necessário para pedir um diálogo NOVO
	// do mesmo tipo via resolveDialogUrl(label) ao reenviar em segundo
	// plano.
	function findDialogTitle(button) {
		let node = button;
		for (let i = 0; i < MAX_ANCESTOR_HOPS && node; i++) {
			const text = node.textContent || "";
			for (let j = 0; j < DIALOG_TITLES.length; j++) {
				if (text.indexOf(DIALOG_TITLES[j]) !== -1) return DIALOG_TITLES[j];
			}
			node = node.parentElement;
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Captura/aplicação de campos do formulário - só campos que o usuário
	// preenche de verdade (nunca hidden/submit/button/reset/file/password),
	// mesmo padrão já usado para "preferências" em quickActions.js. Cada
	// checkbox/radio é capturado com seu estado marcado/desmarcado (não só
	// os marcados), para que aplicar num formulário novo desmarque
	// corretamente o que não deveria ficar marcado.
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

	// -------------------------------------------------------------------
	// Campos OCULTOS (token de sessão incluído) - o inverso de
	// captureFormFields/applyFormFields acima. Necessário para o diálogo
	// VISÍVEL original (aberto antes de qualquer item entrar na fila): cada
	// diálogo novo resolvido em segundo plano para um item da fila
	// (submitItemInBackground) faz o Projudi emitir um token de sessão
	// novo, invalidando o token que o diálogo visível já carregava desde
	// que foi aberto (padrão clássico de token de transação única, tipo
	// Struts: só o token mais recente emitido pro processo é aceito). Sem
	// isto, o clique final em "Ordenar" do diálogo visível é rejeitado
	// (token velho) mesmo com os itens da fila todos confirmados.
	// -------------------------------------------------------------------
	function captureHiddenFields(form) {
		const fields = [];
		form.querySelectorAll('input[type="hidden"]').forEach(function (el) {
			if (!el.name) return;
			fields.push({ name: el.name, value: el.value });
		});
		return fields;
	}

	function applyHiddenFields(form, fields) {
		fields.forEach(function (f) {
			const el = form.querySelector('input[type="hidden"][name="' + cssEscapeAttr(f.name) + '"]');
			if (el) el.value = f.value;
		});
	}

	// -------------------------------------------------------------------
	// Rótulo amigável de cada item da fila, para o usuário reconhecer o
	// que guardou (ex.: "AUTO DE ARREMATAÇÃO"). Heurística: primeiro
	// <select> do formulário cujo id/name mencione "tipo" (cobre pelo
	// menos "codTipoCumprimentoCartorio", visto no diálogo "Ordenar
	// Cumprimentos"); sem isso, cai num rótulo genérico numerado.
	// -------------------------------------------------------------------
	function describeSelection(form, index) {
		const selects = form.querySelectorAll("select");
		for (let i = 0; i < selects.length; i++) {
			const sel = selects[i];
			const key = ((sel.id || "") + " " + (sel.name || "")).toLowerCase();
			if (key.indexOf("tipo") === -1) continue;
			const opt = sel.options[sel.selectedIndex];
			if (opt && opt.value && opt.textContent.trim()) return opt.textContent.trim();
		}
		return "Ordenação " + (index + 1);
	}

	// -------------------------------------------------------------------
	// Fila (em memória - reinicia sozinha se o diálogo for fechado/trocado,
	// já que este script roda de novo do zero em cada novo diálogo).
	// -------------------------------------------------------------------

	function createQueueController(dialog) {
		const items = []; // { label, dialogTitle, fields: [{name,type,value[,checked]}, ...] }
		let flushing = false;

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
			header.textContent = "Fila de ordenações (" + items.length + "), enviadas junto com a próxima vez que clicar em \"Ordenar\":";
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
			dialog.novoBtn.textContent = items.length ? "🔁 Nova Ordenação (" + items.length + " na fila)" : "🔁 Nova Ordenação";
		}

		function push(fields) {
			items.push({
				label: describeSelection(dialog.form, items.length),
				dialogTitle: dialog.title,
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
			flushing = value;
			dialog.novoBtn.disabled = value;
			dialog.button.disabled = value;
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
		};
	}

	// -------------------------------------------------------------------
	// API de quickActions.js (src/quickActions.js), que expõe
	// resolveDialogUrl(label) - a mesma cadeia já usada e testada pelo
	// recurso "Ações rápidas" para achar a URL de um diálogo de ação,
	// gerando um diálogo (e token de sessão) NOVO a cada chamada. Pode
	// estar neste frame ou num frame acima (o diálogo de ordenação, quando
	// aberto via a cadeia "hop", fica dentro do popup que quickActions.js
	// cria no frame da tela de Ações/Movimentações).
	// -------------------------------------------------------------------
	function findQuickActionsApi() {
		// quickActions.js roda em TODO frame (all_frames: true), inclusive
		// dentro do próprio diálogo - então window.__pdpQuickActions também
		// existe AQUI, mas essa instância local não tem a lista de
		// movimentações/eventos do processo que resolveDialogUrl precisa (ela
		// só existe na tela do processo, no frame ACIMA deste diálogo). Por
		// isso, quando este diálogo está aninhado (é o caso normal - ver
		// README, "Ações rápidas"), sempre prefere o frame pai/topo; só usa a
		// instância local como último recurso, para o caso (improvável) deste
		// script não estar aninhado em nada.
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

	// O Projudi mostra erros (de validação OU erros internos genéricos,
	// tipo "Erro geral") numa caixa `<div id="errorMessages">` com uma
	// lista `#ulMensErros` e, geralmente, um número de protocolo - visto
	// ao vivo numa resposta real deste mesmo formulário. Essa caixa NÃO
	// tem os botões "Ordenar"/"Cancelar" (a tela de erro só tem um botão
	// "Voltar"), então checar só a ausência do diálogo original confundia
	// essa tela de erro com sucesso. Por isso a checagem principal de
	// falha é a presença desta caixa de erro; a ausência do diálogo
	// original é só um sinal auxiliar (ex.: formulário reapresentado com a
	// mesma tela, sem a caixa de erro visível).
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
	// do mesmo tipo (token de sessão novo - ver comentário no topo do
	// arquivo), aplica os campos guardados nele, e clica no "Ordenar" DESSE
	// diálogo novo - tudo dentro de um <iframe> oculto (mesma técnica de
	// fetchDoc em quickActions.js), sem navegar a aba visível.
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
					// Inserir o iframe (ou navegá-lo pela 1ª vez) já dispara um
					// "load" para a página em branco inicial (about:blank), ANTES
					// mesmo da navegação de verdade começar - mesma armadilha
					// documentada em fetchDoc() (quickActions.js). Ignora esse load
					// e continua esperando o load seguinte, que é o de verdade.
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
		logEvent("flush-item-start", { label: item.label, dialogTitle: item.dialogTitle, fields: item.fields });

		let resolved;
		try {
			resolved = await api.resolveDialogUrl(item.dialogTitle);
		} catch (err) {
			const result = { ok: false, reason: "erro ao resolver diálogo novo: " + (err && err.message) };
			logEvent("flush-item-result", { label: item.label, result: result });
			return result;
		}
		if (!resolved || resolved.failed || !resolved.url) {
			const result = { ok: false, reason: 'não consegui abrir um diálogo novo de "' + item.dialogTitle + '" em segundo plano' };
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
			freshDialog = findOrdenacaoDialog(iframe.contentDocument);
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
				stillHasDialog = !!findOrdenacaoDialog(doc);
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

	// Recarrega a URL da PRÓPRIA página atual (a mesma que gerou este
	// diálogo visível) num iframe oculto, só para colher seus campos
	// ocultos regenerados (token de sessão em dia) e aplicá-los no diálogo
	// visível - nunca toca nos campos que o usuário preencheu de verdade.
	//
	// Importante: NÃO usa resolveDialogUrl (a cadeia de "Ações Rápidas")
	// aqui - essa cadeia existe para abrir um diálogo NOVO nascendo dentro
	// do popup de ações rápidas, com seu próprio contexto/destino de
	// retorno pós-envio. Testes ao vivo mostraram que copiar os campos
	// ocultos de um diálogo aberto por essa cadeia trocava o destino do
	// diálogo visível: em vez de voltar para a tela do processo depois do
	// envio final, ele passava a recarregar o próprio formulário de
	// ordenação. Recarregar a MESMA URL do diálogo visível (window.location
	// deste próprio frame) preserva o destino de retorno original, porque
	// esse destino é determinado pelo processo/movimentação por trás da
	// URL, não pela cadeia de navegação usada para chegar até ela.
	async function refreshVisibleToken(dialog) {
		logEvent("refresh-token-start", { dialogTitle: dialog.title, url: window.location.href });

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
			const loadPromise = waitForIframeEvent(iframe, { skipAboutBlank: true, timeoutMessage: "tempo esgotado recarregando a página atual" });
			iframe.src = window.location.href;
			await loadPromise;
		} catch (err) {
			cleanup();
			const result = { ok: false, reason: err.message };
			logEvent("refresh-token-result", { result: result });
			return result;
		}

		let freshDialog;
		try {
			freshDialog = findOrdenacaoDialog(iframe.contentDocument);
		} catch (err) {
			freshDialog = null;
		}
		if (!freshDialog) {
			cleanup();
			const result = { ok: false, reason: "a página recarregada não tinha o formulário esperado" };
			logEvent("refresh-token-result", { result: result });
			return result;
		}

		applyHiddenFields(dialog.form, captureHiddenFields(freshDialog.form));
		cleanup();
		const result = { ok: true };
		logEvent("refresh-token-result", { result: result });
		return result;
	}

	async function flushQueue(queue) {
		logEvent("flush-start", { totalItens: queue.getItems().length });

		const api = findQuickActionsApi();
		if (!api || typeof api.resolveDialogUrl !== "function") {
			const reason = "não encontrei o recurso \"Ações rápidas\" (quickActions.js) necessário para reabrir diálogos novos em segundo plano";
			logEvent("flush-abort", { reason: reason });
			alert("Não consegui esvaziar a fila: " + reason + ".\n\nNada foi enviado. Recarregue a página e tente novamente.");
			return false;
		}

		// Sempre processa o item da FRENTE da fila (índice 0) e só o remove
		// depois de confirmado - nunca percorre por índice crescente, já que
		// remover um item desloca os seguintes (removeAt(0) reindexaria tudo
		// e faria um `for` com índice fixo pular o próximo item).
		while (!queue.isEmpty()) {
			const item = queue.getItems()[0];
			const result = await submitItemInBackground(item, api);
			if (!result.ok) {
				logEvent("flush-abort", { label: item.label, reason: result.reason });
				alert(
					'Não consegui ordenar o item da fila ("' +
						item.label +
						'"): ' +
						result.reason +
						'.\n\nNada mais foi enviado. Revise esse item (ele continua na fila) e tente novamente.\n\nDetalhes técnicos deste e de todos os itens ficam salvos em window.__pdpNovaOrdenacaoLog (console, F12) - copy(JSON.stringify(window.__pdpNovaOrdenacaoLog, null, 2)) copia tudo para compartilhar.'
				);
				return false;
			}
			queue.removeAt(0);
		}
		logEvent("flush-complete", {});
		return true;
	}

	// -------------------------------------------------------------------
	// Botão "Nova Ordenação" e interceptação do "Ordenar" final
	// -------------------------------------------------------------------

	function makeNovaOrdenacaoButton() {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = NEW_BUTTON_CLASS;
		btn.textContent = "🔁 Nova Ordenação";
		btn.title = 'Guarda esta ordenação e limpa o formulário para a próxima (ex.: um ofício, um mandado, um edital) - tudo é enviado ao Projudi de uma vez quando você clicar em "Ordenar" pela última vez.';
		return btn;
	}

	function setupDialog(dialog) {
		if (dialog.button.dataset[DONE_MARKER]) return;
		dialog.button.dataset[DONE_MARKER] = "1";

		dialog.title = findDialogTitle(dialog.button);
		if (!dialog.title) return; // não é um dos diálogos de ordenação conhecidos - não injeta nada

		logEvent("dialog-detected", { title: dialog.title, formAction: dialog.form.action, formMethod: dialog.form.method, formId: dialog.form.id });

		dialog.novoBtn = makeNovaOrdenacaoButton();
		dialog.button.insertAdjacentElement("afterend", dialog.novoBtn);
		const queue = createQueueController(dialog);

		dialog.novoBtn.addEventListener("click", function (evt) {
			evt.preventDefault();
			if (queue.isFlushing()) return;
			if (!dialog.form.reportValidity()) return; // mostra a validação nativa do navegador e para aqui
			const fields = captureFormFields(dialog.form);
			logEvent("queued", { fields: fields, dialogTitle: dialog.title });
			queue.push(fields);
			dialog.form.reset();
			// form.reset() não dispara 'change' - sem isso, qualquer JS do
			// próprio Projudi que mostra/esconde campos conforme o "Tipo de
			// Cumprimento" escolhido ficaria com a tela numa aparência
			// inconsistente com os valores já resetados.
			const tipoSelect = dialog.form.querySelector('[name="codTipoCumprimentoCartorio"]') || dialog.form.querySelector("select");
			if (tipoSelect) tipoSelect.dispatchEvent(new Event("change", { bubbles: true }));
		});

		// Intercepta o clique real em "Ordenar": se a fila tiver itens
		// pendentes, primeiro reenvia todos em segundo plano; só depois
		// dispara um clique de verdade no botão (agora com a fila vazia),
		// deixando o Projudi processar o envio final exatamente como
		// sempre processou - validação, submissão e navegação de saída
		// 100% nativas, sem nenhum atalho.
		dialog.button.addEventListener(
			"click",
			function (evt) {
				if (queue.isEmpty() || queue.isFlushing()) return;
				evt.preventDefault();
				evt.stopImmediatePropagation();
				queue.setFlushing(true);
				(async function () {
					const allOk = await flushQueue(queue);
					if (!allOk) return;

					// Cada diálogo novo resolvido acima para os itens da fila fez
					// o Projudi emitir um token de sessão novo, invalidando o
					// token que ESTE diálogo visível carrega desde que foi
					// aberto - por isso, antes do clique final de verdade, busca
					// um token em dia (sem tocar nos campos que o usuário
					// preencheu) ou o envio final seria rejeitado mesmo com a
					// fila inteira confirmada.
					const refreshResult = await refreshVisibleToken(dialog);
					if (!refreshResult.ok) {
						alert(
							"Não consegui atualizar o token de sessão do formulário antes do envio final: " +
								refreshResult.reason +
								'.\n\nNada foi enviado. Recarregue a página e tente novamente (os itens já confirmados da fila permanecem registrados nos autos).\n\nDetalhes técnicos ficam salvos em window.__pdpNovaOrdenacaoLog (console, F12) - copy(JSON.stringify(window.__pdpNovaOrdenacaoLog, null, 2)) copia tudo para compartilhar.'
						);
						return;
					}

					logEvent("final-click", {});
					dialog.button.click();
				})()
					.catch(function (err) {
						logEvent("flush-exception", { message: err && err.message });
						console.error(LOG_PREFIX, "erro ao esvaziar a fila:", err);
					})
					.finally(function () {
						queue.setFlushing(false);
					});
			},
			true
		);
	}

	// -------------------------------------------------------------------
	// Reconciliação (mesmo padrão de quickActions.js: intervalo curto +
	// MutationObserver, com try/catch para nunca travar a tela do Projudi)
	// -------------------------------------------------------------------

	function reconcile() {
		try {
			const dialog = findOrdenacaoDialog(document);
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
