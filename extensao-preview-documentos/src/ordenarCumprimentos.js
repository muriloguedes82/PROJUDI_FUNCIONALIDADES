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
// 2. GUARDA os dados preenchidos (todos os campos do formulário, via
//    FormData - nada é reinterpretado nem uma lista fixa de nomes de
//    campo, já que o Projudi não documenta esse HTML) numa fila, em
//    memória, sem enviar nada ao Projudi ainda.
// 3. Limpa o formulário (`form.reset()`) para a próxima ordenação, no
//    MESMO diálogo já aberto - sem navegar, sem reabrir nada.
//
// Só quando o usuário clica no botão "Ordenar" nativo de verdade (o
// último, encerrando o fluxo) é que tudo é enviado ao Projudi:
// 1. Cada item da fila é reenviado em segundo plano, um de cada vez, num
//    <iframe> oculto (mesma técnica já usada pelo recurso "Ações
//    rápidas" em quickActions.js para não navegar a aba visível) - para
//    o MESMO endereço (`action`) e com o MESMO método do formulário
//    original.
// 2. Só depois que todos os itens da fila forem confirmados, o clique
//    real em "Ordenar" é disparado - agora com a fila vazia, o
//    formulário atual (o último preenchido) segue o fluxo 100% nativo do
//    Projudi (mesma validação, mesmo envio, mesma navegação de saída).
// 3. Se algum item da fila falhar (ex.: um campo obrigatório que o
//    Projudi rejeitou), a extensão avisa qual item falhou e PARA - nada
//    mais é enviado, o diálogo continua aberto para o usuário revisar.
//
// Clicar em "Cancelar" descarta a fila normalmente junto com o diálogo -
// nada do que foi só guardado chega a ser enviado.

(function () {
	"use strict";

	if (window.__pdpNovaOrdenacaoInjected) return;
	window.__pdpNovaOrdenacaoInjected = true;

	const NEW_BUTTON_CLASS = "pdp-nova-ordenacao-btn";
	const DONE_MARKER = "pdpNovaOrdenacaoFeito";
	const RECONCILE_INTERVAL_MS = 500;
	// Tempo máximo esperando a resposta de cada item da fila reenviado em
	// segundo plano antes de considerar que falhou.
	const BACKGROUND_SUBMIT_TIMEOUT_MS = 20000;
	const LOG_PREFIX = "[Projudi Nova Ordenação]";

	// -------------------------------------------------------------------
	// Log de diagnóstico - guarda cada passo (o que foi guardado na fila,
	// o que cada reenvio em segundo plano mandou e recebeu de volta) num
	// array acessível pelo console (F12), para investigar uma causa raiz
	// real em vez de adivinhar. No console, depois de reproduzir o
	// problema:
	//   copy(JSON.stringify(window.__pdpNovaOrdenacaoLog, null, 2))
	// cola o log inteiro na área de transferência para compartilhar.
	// -------------------------------------------------------------------
	const diagnosticLog = [];
	window.__pdpNovaOrdenacaoLog = diagnosticLog;
	function logEvent(type, data) {
		const entry = Object.assign({ t: new Date().toISOString(), url: window.location.href, type: type }, data || {});
		diagnosticLog.push(entry);
		console.info(LOG_PREFIX, type, data || "");
	}

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
		const items = []; // { label, action, method, fields: [[name, value], ...] }
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

		function push(fields, action, method) {
			items.push({
				label: describeSelection(dialog.form, items.length),
				action: action,
				method: method,
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
	// Reenvio de um item da fila em segundo plano, num iframe oculto -
	// mesma técnica de fetchDoc em quickActions.js (um <iframe> fora da
	// área visível da tela, mas uma navegação de verdade, com a MESMA
	// sessão/cookies do usuário).
	// -------------------------------------------------------------------

	// O Projudi mostra erros (de validação OU erros internos genéricos,
	// tipo "Erro geral") numa caixa `<div id="errorMessages">` com uma
	// lista `#ulMensErros` e, geralmente, um número de protocolo - visto
	// ao vivo numa resposta real deste mesmo formulário. Essa caixa NÃO
	// tem os botões "Ordenar"/"Cancelar" (a tela de erro só tem um botão
	// "Voltar"), então checar só a ausência do diálogo original (como a
	// primeira versão deste recurso fazia) confundia essa tela de erro
	// com sucesso - o item era dado como enviado e tirado da fila, mas na
	// verdade nunca tinha sido de fato ordenado. Por isso a checagem
	// principal de falha é a presença desta caixa de erro; a ausência do
	// diálogo original é só um sinal auxiliar (ex.: formulário
	// reapresentado com a mesma tela, sem a caixa de erro visível).
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

	function submitItemInBackground(item) {
		return new Promise(function (resolve) {
			const frameName = "pdp-fila-" + Date.now() + "-" + Math.random().toString(36).slice(2);
			const iframe = document.createElement("iframe");
			iframe.name = frameName;
			iframe.style.position = "absolute";
			iframe.style.top = "-9999px";
			iframe.style.left = "-9999px";
			iframe.style.width = "1024px";
			iframe.style.height = "768px";

			const form = document.createElement("form");
			form.action = item.action;
			form.method = item.method || "post";
			form.target = frameName;
			form.style.display = "none";
			item.fields.forEach(function (pair) {
				const input = document.createElement("input");
				input.type = "hidden";
				input.name = pair[0];
				input.value = pair[1];
				form.appendChild(input);
			});

			logEvent("flush-item-start", {
				label: item.label,
				action: item.action,
				method: item.method,
				fields: item.fields,
			});

			let settled = false;
			const timeout = setTimeout(function () {
				if (settled) return;
				settled = true;
				cleanup();
				const result = { ok: false, reason: "tempo esgotado aguardando resposta do Projudi" };
				logEvent("flush-item-result", { label: item.label, result: result });
				resolve(result);
			}, BACKGROUND_SUBMIT_TIMEOUT_MS);

			function cleanup() {
				clearTimeout(timeout);
				if (form.parentNode) form.parentNode.removeChild(form);
				if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
			}

			iframe.addEventListener("load", function () {
				if (settled) return;
				settled = true;

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
					resolve(result);
					return;
				}
				cleanup();

				let result;
				if (errorInfo) {
					// Caixa de erro do Projudi presente na resposta - o motivo
					// exato (mensagens + protocolo, quando houver) vai no log
					// para investigar a causa raiz em vez de adivinhar.
					result = {
						ok: false,
						reason: (errorInfo.mensagens.join("; ") || "erro não identificado") + (errorInfo.protocolo ? " (protocolo " + errorInfo.protocolo + ")" : ""),
					};
				} else if (stillHasDialog) {
					// O Projudi reapresentou o MESMO formulário sem uma caixa de
					// erro visível - normalmente sinal de validação client-side
					// que não fez o formulário ser enviado de verdade.
					result = { ok: false, reason: "o Projudi reapresentou o formulário (sem mensagem de erro explícita)" };
				} else {
					result = { ok: true };
				}
				logEvent("flush-item-result", {
					label: item.label,
					result: result,
					finalUrl: finalUrl,
					errorInfo: errorInfo,
					htmlSnippet: htmlSnippet,
				});
				resolve(result);
			});

			document.body.appendChild(iframe);
			document.body.appendChild(form);
			form.submit();
		});
	}

	async function flushQueue(queue) {
		logEvent("flush-start", { totalItens: queue.getItems().length });
		// Sempre processa o item da FRENTE da fila (índice 0) e só o remove
		// depois de confirmado - nunca percorre por índice crescente, já que
		// remover um item desloca os seguintes (removeAt(0) reindexaria tudo
		// e faria um `for` com índice fixo pular o próximo item).
		while (!queue.isEmpty()) {
			const item = queue.getItems()[0];
			const result = await submitItemInBackground(item);
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

		dialog.novoBtn = makeNovaOrdenacaoButton();
		dialog.button.insertAdjacentElement("afterend", dialog.novoBtn);
		const queue = createQueueController(dialog);

		dialog.novoBtn.addEventListener("click", function (evt) {
			evt.preventDefault();
			if (queue.isFlushing()) return;
			if (!dialog.form.reportValidity()) return; // mostra a validação nativa do navegador e para aqui
			const fields = Array.prototype.slice
				.call(new FormData(dialog.form).entries())
				.filter(function (pair) {
					return !(pair[1] instanceof File); // não há como reenviar arquivos num form de campos ocultos
				});
			// `new FormData(form)` NÃO inclui o nome/valor do botão de envio
			// (só aconteceria numa submissão de verdade) - como aplicações
			// Java/Struts como o Projudi costumam decidir o que fazer no
			// servidor pelo nome do botão clicado (`request.getParameter(...)`),
			// inclui esse par manualmente para o reenvio em segundo plano se
			// comportar como um clique de verdade no "Ordenar".
			if (dialog.button.name) fields.push([dialog.button.name, dialog.button.value || ""]);
			logEvent("queued", { fields: fields, action: dialog.form.action, method: dialog.form.method });
			queue.push(fields, dialog.form.action, dialog.form.method);
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
				flushQueue(queue)
					.then(function (allOk) {
						queue.setFlushing(false);
						if (allOk) {
							logEvent("final-click", {});
							dialog.button.click();
						}
					})
					.catch(function (err) {
						queue.setFlushing(false);
						logEvent("flush-exception", { message: err && err.message });
						console.error(LOG_PREFIX, "erro ao esvaziar a fila:", err);
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
