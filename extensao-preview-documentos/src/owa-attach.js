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

	// Rótulo do campo "De" na composição do Outlook Web (o rótulo pode mudar
	// conforme idioma/versão — ajuste esta lista se parar de funcionar).
	const FROM_TOGGLE_LABELS = ["de", "from"];

	function findFromToggleCandidates() {
		const elements = document.querySelectorAll('button, [role="button"], a');
		const matches = [];
		elements.forEach(function (el) {
			const text = (el.textContent || "").trim().toLowerCase();
			if (FROM_TOGGLE_LABELS.indexOf(text) !== -1) matches.push(el);
		});
		return matches;
	}

	// Tenta revelar o campo "De" da composição, clicando nele, para o
	// usuário poder trocar o remetente manualmente. Só clica quando há
	// exatamente UM candidato óbvio (um botão/link cujo texto é só "De"),
	// para evitar clicar em algo errado por ambiguidade — "De" é uma
	// palavra comum, então preferimos não agir a agir errado.
	async function tryRevealFromField() {
		await sleep(1500); // dá tempo da tela de composição terminar de montar
		const candidates = findFromToggleCandidates();
		if (candidates.length === 1) {
			candidates[0].click();
			console.log("[Projudi->Outlook] cliquei para revelar o campo 'De':", candidates[0]);
		} else if (candidates.length > 1) {
			console.warn(
				"[Projudi->Outlook] mais de um elemento parecido com o campo 'De' encontrado; não cliquei, para evitar " +
					"ambiguidade. Troque o remetente manualmente.",
				candidates
			);
		} else {
			console.warn(
				"[Projudi->Outlook] não encontrei o campo 'De' para revelar automaticamente (pode já estar visível, " +
					"ou o rótulo mudou)."
			);
		}
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
