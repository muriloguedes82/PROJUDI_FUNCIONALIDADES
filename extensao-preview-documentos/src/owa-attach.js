// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Content script injetado nas páginas do Outlook Web (outlook.office.com).
// Faz parte do modo "fallback" (sem Azure AD): quando o usuário seleciona
// documentos no Projudi e o modo de envio é OWA, o background script
// (src/background.js) baixa os arquivos selecionados para a pasta Downloads
// do usuário e abre esta página num pop-up já com a tela de novo e-mail
// (deep link de compose). Este script mostra um aviso na tela com os nomes
// dos arquivos baixados, para o usuário arrastá-los até o e-mail.
//
// NOTA: já tentamos anexar os arquivos automaticamente (preenchendo o
// campo de anexo via script), mas o Outlook Web trata anexos vindos de
// eventos disparados por script como "não confiáveis" e força um fluxo de
// upload para o OneDrive que falha para um arquivo montado em memória —
// uma restrição de segurança do navegador, não algo contornável com mais
// JavaScript. Por isso este modo pede o arraste manual (1 passo), em vez
// de tentar anexar sozinho.

(function () {
	"use strict";

	if (window.__pdpOwaAttachInjected) return;
	window.__pdpOwaAttachInjected = true;

	function showBanner(fileNames) {
		const banner = document.createElement("div");
		banner.id = "pdp-owa-banner";
		banner.innerHTML =
			'<div class="pdp-owa-banner-text">' +
			"<strong>Documentos baixados do Projudi:</strong> " +
			fileNames.map(escapeHtml).join(", ") +
			". Arraste-os desta pasta (ou da barra de downloads do navegador) para dentro deste e-mail para anexá-los." +
			"</div>" +
			'<button type="button" class="pdp-owa-banner-close" title="Fechar">✕</button>';
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
