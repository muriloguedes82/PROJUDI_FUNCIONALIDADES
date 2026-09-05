// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Content script injetado nas páginas do Outlook Web (outlook.office.com).
// Faz parte do modo "fallback" (sem Azure AD): quando o usuário seleciona
// documentos no Projudi e o modo de envio é OWA, o background script
// (src/background.js) baixa os arquivos selecionados para a pasta Downloads
// do usuário (como alternativa manual) e abre esta página num pop-up já com
// a tela de novo e-mail (deep link de compose). Este script desenha um
// aviso com um "chip" arrastável para cada arquivo — o usuário arrasta o
// chip até dentro do e-mail para anexar.
//
// NOTA: já tentamos anexar os arquivos automaticamente preenchendo o campo
// de anexo via script (dispatchEvent), mas o Outlook Web trata esses
// eventos como "não confiáveis" (isTrusted: false) e força um fluxo de
// upload para o OneDrive que falha para um arquivo montado em memória —
// uma restrição de segurança do navegador, não algo contornável com mais
// JavaScript disparando eventos sozinho. A solução foi inverter a lógica:
// o chip abaixo é arrastável de verdade (draggable="true"), então quando o
// usuário arrasta com o mouse, o navegador dispara um "dragstart" real
// (confiável) — é dentro desse evento, gerado por um gesto genuíno do
// usuário, que anexamos o arquivo ao dataTransfer. O "drop" na área de
// composição do Outlook também é um evento real, então o anexo funciona
// como se o usuário tivesse arrastado o arquivo do Explorador de Arquivos.

(function () {
	"use strict";

	if (window.__pdpOwaAttachInjected) return;
	window.__pdpOwaAttachInjected = true;

	function base64ToFile(base64, name, contentType) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return new File([bytes], name, { type: contentType || "application/octet-stream" });
	}

	function createChip(entry) {
		const chip = document.createElement("div");
		chip.className = "pdp-owa-chip";
		chip.draggable = true;
		chip.textContent = "📄 " + entry.name;
		chip.title = "Arraste para dentro do e-mail para anexar";

		chip.addEventListener("dragstart", function (e) {
			// Este handler só roda dentro de um "dragstart" real, disparado
			// pelo navegador em resposta a um arraste genuíno do usuário — por
			// isso o Outlook aceita o anexo aqui, ao contrário da tentativa
			// anterior de simular o evento inteiro via script.
			const file = base64ToFile(entry.base64, entry.name, entry.contentType);
			e.dataTransfer.effectAllowed = "copy";
			e.dataTransfer.items.add(file);
			chip.classList.add("pdp-owa-chip-dragging");
		});

		chip.addEventListener("dragend", function () {
			chip.classList.remove("pdp-owa-chip-dragging");
		});

		return chip;
	}

	function showBanner(attachments) {
		const banner = document.createElement("div");
		banner.id = "pdp-owa-banner";
		banner.innerHTML =
			'<div class="pdp-owa-banner-header">' +
			"<strong>Documentos do Projudi prontos para anexar</strong>" +
			'<button type="button" class="pdp-owa-banner-close" title="Fechar">✕</button>' +
			"</div>" +
			'<div class="pdp-owa-banner-text">Arraste os arquivos abaixo para dentro deste e-mail para anexá-los ' +
			"(eles também foram salvos na pasta Downloads, caso prefira anexar por lá).</div>" +
			'<div class="pdp-owa-chips"></div>';
		document.body.appendChild(banner);

		const chipsContainer = banner.querySelector(".pdp-owa-chips");
		attachments.forEach(function (entry) {
			chipsContainer.appendChild(createChip(entry));
		});

		banner.querySelector(".pdp-owa-banner-close").addEventListener("click", function () {
			banner.remove();
		});
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
		if (!consumed || !consumed.attachments || !consumed.attachments.length) return;

		showBanner(consumed.attachments);
	}

	run();
})();
