// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Content script injetado nas páginas do Outlook Web (outlook.office.com).
// Faz parte do modo "fallback" (sem Azure AD): quando o usuário seleciona
// documentos no Projudi e o modo de envio é OWA, o background script
// (src/background.js) baixa os arquivos selecionados para a pasta Downloads
// do usuário e abre esta página num pop-up já com a tela de novo e-mail
// (deep link de compose). Este script:
// 1) mostra um aviso dizendo quais arquivos foram baixados e como anexá-los;
// 2) tenta revelar o campo "De" da composição, caso esteja recolhido, para
//    o usuário poder trocar manualmente o remetente (ex.: entre o e-mail
//    pessoal e uma caixa de grupo/secretaria), quando já tiver permissão de
//    "Enviar como" na conta desejada. Diferente da automação de anexo (que
//    esbarrou em restrições de "evento não confiável"), isto é só um clique
//    normal de UI, então funciona sem os mesmos problemas.
//
// NOTA - por que o anexo não é automático: já tentamos três formas de
// anexar sozinho e nenhuma funcionou:
// 1) Preencher o campo de anexo (<input type="file">) via script: o
//    Outlook Web trata esse anexo como vindo de um evento "não confiável"
//    (isTrusted: false) e força um fluxo de upload para o OneDrive que
//    falha para um arquivo montado em memória.
// 2) Simular o "drop" inteiro via dispatchEvent: mesmo problema, o Outlook
//    nem chega a mostrar a tela de destino do arraste.
// 3) Um elemento arrastável de verdade (draggable="true"), para que o
//    "dragstart" fosse disparado por um gesto real do usuário: mesmo assim
//    o Outlook Web não mostrou a interface de destino do arraste (a tela
//    de "Carregar no OneDrive" / "Anexar arquivo" que aparece num arraste
//    de arquivo real), então parece haver alguma verificação adicional
//    (possivelmente da origem do arraste) que não conseguimos replicar de
//    dentro de um content script.
// O único caminho comprovadamente confiável, testado manualmente, é anexar
// pelo próprio botão "Anexar arquivo" → "Navegar neste computador",
// escolhendo o arquivo já baixado — por isso o aviso abaixo orienta esse
// caminho, em vez de insistir em mais automação.

(function () {
	"use strict";

	if (window.__pdpOwaAttachInjected) return;
	window.__pdpOwaAttachInjected = true;

	function showBanner(fileNames) {
		const banner = document.createElement("div");
		banner.id = "pdp-owa-banner";
		banner.innerHTML =
			'<div class="pdp-owa-banner-header">' +
			"<strong>Documentos do Projudi baixados</strong>" +
			'<button type="button" class="pdp-owa-banner-close" title="Fechar">✕</button>' +
			"</div>" +
			'<div class="pdp-owa-banner-text">' +
			fileNames.map(escapeHtml).join(", ") +
			' — salvos na pasta <strong>Downloads</strong>. Para anexar, clique em ' +
			'"<strong>Anexar arquivo</strong>" → "<strong>Navegar neste computador</strong>" e selecione ' +
			"o(s) arquivo(s) acima." +
			"</div>";
		document.body.appendChild(banner);
		banner.querySelector(".pdp-owa-banner-close").addEventListener("click", function () {
			banner.remove();
		});
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	function sleep(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	// O campo "De" não é um botão isolado: fica escondido atrás da guia
	// "Opções" da faixa de opções (ribbon) → caixinha "Mostrar de" (grupo
	// "Mostrar campos"). Os rótulos abaixo podem mudar conforme
	// idioma/versão — ajuste esta lista se parar de funcionar.
	const OPTIONS_TAB_LABELS = ["opções", "options"];
	const MESSAGE_TAB_LABELS = ["mensagem", "message"];
	const SHOW_FROM_LABELS = ["mostrar de", "show from"];
	const WAIT_TIMEOUT_MS = 15000;
	const POLL_INTERVAL_MS = 300;

	function findByAccessibleText(selector, labelsLower) {
		const elements = document.querySelectorAll(selector);
		for (const el of elements) {
			const text = (el.getAttribute("aria-label") || el.textContent || "").trim().toLowerCase();
			if (labelsLower.indexOf(text) !== -1) return el;
		}
		return null;
	}

	// As abas da faixa de opções (role="tab") têm um <span
	// class="pivot-header-label"> com o texto visível — mas quando a aba
	// NÃO está selecionada, existe um segundo <span> "de reserva de
	// espaço" com o mesmo texto, duplicando o textContent do botão inteiro
	// (ex.: "MensagemMensagem"). Por isso comparamos o texto só do
	// primeiro span, não do botão inteiro.
	function findRibbonTab(labelsLower) {
		const tabs = document.querySelectorAll('[role="tab"]');
		for (const tab of tabs) {
			const labelEl = tab.querySelector(".pivot-header-label") || tab.querySelector("span") || tab;
			const text = (labelEl.textContent || "").trim().toLowerCase();
			if (labelsLower.indexOf(text) !== -1) return tab;
		}
		return null;
	}

	// Espera até "find()" retornar algo (tentando a cada POLL_INTERVAL_MS),
	// até WAIT_TIMEOUT_MS. A faixa de opções do Outlook Web pode demorar
	// para terminar de montar, então uma única tentativa não é suficiente.
	function waitFor(find, timeoutMs) {
		return new Promise(function (resolve) {
			const deadline = Date.now() + timeoutMs;
			(function attempt() {
				const result = find();
				if (result) return resolve(result);
				if (Date.now() >= deadline) return resolve(null);
				setTimeout(attempt, POLL_INTERVAL_MS);
			})();
		});
	}

	function findShowFromCheckbox() {
		// Tenta um <label> associado a um <input type="checkbox"> (padrão
		// nativo de formulário).
		const labels = document.querySelectorAll("label");
		for (const label of labels) {
			const text = (label.textContent || "").trim().toLowerCase();
			if (SHOW_FROM_LABELS.indexOf(text) === -1) continue;
			if (label.control) return label.control;
			const forId = label.getAttribute("for");
			if (forId) {
				const el = document.getElementById(forId);
				if (el) return el;
			}
		}
		// Tenta um elemento com role="checkbox" (padrão comum em componentes
		// Fluent UI), identificado pelo aria-label ou pelo próprio texto.
		return findByAccessibleText('[role="checkbox"]', SHOW_FROM_LABELS);
	}

	function isCheckedOn(el) {
		if (typeof el.checked === "boolean") return el.checked;
		return el.getAttribute("aria-checked") === "true";
	}

	// Tenta revelar o campo "De" da composição: clica na guia "Opções" da
	// faixa de opções, marca a caixinha "Mostrar de" (só se ainda não
	// estiver marcada, para não escondê-la sem querer) e volta para a guia
	// "Mensagem". Não pré-seleciona nenhuma conta — só expõe o seletor
	// nativo do Outlook para o usuário trocar manualmente.
	async function tryRevealFromField() {
		const optionsTab = await waitFor(function () {
			return findRibbonTab(OPTIONS_TAB_LABELS);
		}, WAIT_TIMEOUT_MS);
		if (!optionsTab) {
			console.warn("[Projudi->Outlook] não encontrei a guia 'Opções' da faixa de opções.");
			return;
		}
		optionsTab.click();
		console.log("[Projudi->Outlook] cliquei na guia 'Opções' da faixa de opções.", optionsTab);
		await sleep(400);

		const checkbox = await waitFor(findShowFromCheckbox, WAIT_TIMEOUT_MS);
		if (!checkbox) {
			console.warn("[Projudi->Outlook] não encontrei a caixa 'Mostrar de' na guia Opções.");
			return;
		}

		if (isCheckedOn(checkbox)) {
			console.log("[Projudi->Outlook] 'Mostrar de' já estava marcado.");
		} else {
			checkbox.click();
			console.log("[Projudi->Outlook] marquei 'Mostrar de' para revelar o campo De.", checkbox);
		}

		await sleep(300);
		const messageTab = findRibbonTab(MESSAGE_TAB_LABELS);
		if (messageTab) messageTab.click();
	}

	async function run() {
		let pending;
		try {
			pending = await chrome.runtime.sendMessage({ type: "PEEK_DOWNLOAD_INFO" });
		} catch (err) {
			return; // extensão indisponível/recarregada; nada a fazer
		}
		if (!pending) return;

		tryRevealFromField();

		const consumed = await chrome.runtime.sendMessage({ type: "CONSUME_DOWNLOAD_INFO", id: pending.id });
		if (!consumed || !consumed.fileNames || !consumed.fileNames.length) return;

		showBanner(consumed.fileNames);
	}

	run();
})();
