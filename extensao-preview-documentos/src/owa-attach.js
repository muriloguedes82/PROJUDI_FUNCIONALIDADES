// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Content script injetado nas páginas do Outlook Web (outlook.office.com).
// Faz parte do modo "fallback" (sem Azure AD): quando o usuário seleciona
// documentos no Projudi e o modo de envio é OWA, o background script
// (src/background.js) baixa os arquivos selecionados para a pasta Downloads
// do usuário e abre esta página num pop-up já com a tela de novo e-mail
// (deep link de compose). Este script mostra um aviso dizendo quais
// arquivos foram baixados e como anexá-los.
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

	async function run() {
		let pending;
		try {
			pending = await chrome.runtime.sendMessage({ type: "PEEK_DOWNLOAD_INFO" });
		} catch (err) {
			return; // extensão indisponível/recarregada; nada a fazer
		}
		if (!pending) return;

		const consumed = await chrome.runtime.sendMessage({ type: "CONSUME_DOWNLOAD_INFO", id: pending.id });
		if (!consumed || !consumed.fileNames || !consumed.fileNames.length) return;

		showBanner(consumed.fileNames);
	}

	run();
})();
