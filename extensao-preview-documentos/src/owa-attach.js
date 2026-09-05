// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Content script injetado nas páginas do Outlook Web (outlook.office.com).
// Faz parte do modo "fallback" (sem Azure AD): quando o usuário seleciona
// documentos no Projudi e o modo de envio é OWA, o background script
// (src/background.js) guarda os anexos temporariamente e abre esta página
// num pop-up já com a tela de novo e-mail (deep link de compose). Este
// script busca esses anexos pendentes e os anexa automaticamente assim que
// encontra o campo de anexo da tela de composição, como se o usuário
// tivesse selecionado os arquivos manualmente.
//
// ATENÇÃO - abordagem não-oficial e frágil: depende de o Outlook Web usar
// um <input type="file"> "clássico" por trás do botão de anexar. Se a
// Microsoft trocar esse mecanismo (por exemplo, para o seletor nativo via
// File System Access API), este script deixa de conseguir anexar
// automaticamente, e o usuário precisará anexar manualmente. Não há como
// testar isso a partir deste repositório (o ambiente de desenvolvimento não
// tem acesso a uma conta real do Outlook Web); se algo não funcionar,
// inspecione o botão de anexar no navegador (clique com o botão direito →
// Inspecionar) para localizar o input real e ajuste o seletor abaixo.

(function () {
	"use strict";

	if (window.__pdpOwaAttachInjected) return;
	window.__pdpOwaAttachInjected = true;

	const FILE_INPUT_SELECTOR = 'input[type="file"]';
	const WAIT_TIMEOUT_MS = 20000;
	const ATTACH_DELAY_MS = 400;

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function findFileInput() {
		return document.querySelector(FILE_INPUT_SELECTOR);
	}

	function waitForFileInput(timeoutMs) {
		return new Promise((resolve) => {
			const existing = findFileInput();
			if (existing) return resolve(existing);

			const observer = new MutationObserver(function () {
				const el = findFileInput();
				if (el) {
					observer.disconnect();
					resolve(el);
				}
			});
			observer.observe(document.documentElement, { childList: true, subtree: true });

			setTimeout(function () {
				observer.disconnect();
				resolve(findFileInput());
			}, timeoutMs);
		});
	}

	function base64ToFile(base64, name, contentType) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return new File([bytes], name, { type: contentType || "application/octet-stream" });
	}

	async function attachFilesSequentially(files) {
		for (const file of files) {
			const input = findFileInput() || (await waitForFileInput(WAIT_TIMEOUT_MS));
			if (!input) {
				throw new Error("Campo de anexo do Outlook Web não encontrado.");
			}
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			input.files = dataTransfer.files;
			input.dispatchEvent(new Event("change", { bubbles: true }));
			input.dispatchEvent(new Event("input", { bubbles: true }));
			await sleep(ATTACH_DELAY_MS);
		}
	}

	async function run() {
		let pending;
		try {
			pending = await chrome.runtime.sendMessage({ type: "PEEK_PENDING_EMAIL" });
		} catch (err) {
			return; // extensão indisponível/recarregada; nada a fazer
		}
		if (!pending) return;

		const input = await waitForFileInput(WAIT_TIMEOUT_MS);
		if (!input) {
			console.warn(
				"[Projudi->Outlook] Não encontrei o campo de anexo automaticamente. " +
					"Anexe os documentos manualmente a partir do processo no Projudi."
			);
			return;
		}

		const consumed = await chrome.runtime.sendMessage({ type: "CONSUME_PENDING_EMAIL", id: pending.id });
		if (!consumed || !consumed.attachments || !consumed.attachments.length) return;

		try {
			const files = consumed.attachments.map(function (a) {
				return base64ToFile(a.base64, a.name, a.contentType);
			});
			await attachFilesSequentially(files);
		} catch (err) {
			console.error("[Projudi->Outlook] Falha ao anexar automaticamente:", err);
			alert(
				"Os documentos foram baixados, mas não foi possível anexá-los automaticamente no Outlook Web. " +
					"Anexe-os manualmente a partir do processo no Projudi."
			);
		}
	}

	run();
})();
