// Projudi - Envio de Documentos por WhatsApp
//
// Content script injetado em web.whatsapp.com. Ao carregar, verifica se há
// um envio pendente (arquivos selecionados no Projudi, guardados por
// src/background.js em chrome.storage.local). Se houver, espera a conversa
// (aberta via https://web.whatsapp.com/send?phone=...) terminar de carregar
// e então simula um "arrastar e soltar" dos arquivos na área da conversa,
// que é o mecanismo que o próprio WhatsApp Web usa para anexar arquivos.
//
// Os arquivos ficam anexados prontos para revisão/legenda: o envio final
// (clicar em "Enviar") continua sendo uma ação manual do usuário.

(function () {
	"use strict";

	const MESSAGE_SOURCE = "projudi-preview";
	const PENDING_MAX_AGE_MS = 3 * 60 * 1000;
	const POLL_INTERVAL_MS = 700;
	const POLL_TIMEOUT_MS = 60000;

	function dataUrlToFile(dataUrl, name, type) {
		const commaIndex = dataUrl.indexOf(",");
		const base64 = dataUrl.slice(commaIndex + 1);
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return new File([bytes], name, { type: type || "application/octet-stream" });
	}

	function findDropTarget() {
		const main = document.querySelector("#main");
		if (!main) return null;
		const composer = main.querySelector('[contenteditable="true"][data-tab]');
		if (!composer) return null;
		return main;
	}

	function dispatchFileDrop(target, files) {
		const dataTransfer = new DataTransfer();
		files.forEach(function (file) {
			dataTransfer.items.add(file);
		});

		["dragenter", "dragover", "drop"].forEach(function (type) {
			const event = new DragEvent(type, {
				bubbles: true,
				cancelable: true,
				dataTransfer: dataTransfer,
			});
			target.dispatchEvent(event);
		});
	}

	function waitFor(predicate, timeoutMs, intervalMs) {
		return new Promise(function (resolve, reject) {
			const start = Date.now();
			(function tick() {
				const result = predicate();
				if (result) return resolve(result);
				if (Date.now() - start > timeoutMs) return reject(new Error("timeout"));
				setTimeout(tick, intervalMs);
			})();
		});
	}

	function clearPending() {
		try {
			chrome.runtime.sendMessage({ source: MESSAGE_SOURCE, type: "whatsapp-clear-pending" });
		} catch (e) {
			/* aba pode ter sido fechada; sem problema */
		}
	}

	function processPending(pending) {
		if (!pending) return;
		if (Date.now() - pending.createdAt > PENDING_MAX_AGE_MS) {
			clearPending();
			return;
		}

		waitFor(findDropTarget, POLL_TIMEOUT_MS, POLL_INTERVAL_MS)
			.then(function (target) {
				const files = pending.files.map(function (f) {
					return dataUrlToFile(f.dataUrl, f.name, f.type);
				});
				dispatchFileDrop(target, files);
			})
			.catch(function () {
				/* conversa não carregou a tempo (ex.: sessão não conectada) */
			})
			.then(clearPending);
	}

	chrome.runtime.sendMessage({ source: MESSAGE_SOURCE, type: "whatsapp-fetch-pending" }, function (response) {
		if (chrome.runtime.lastError) return;
		if (response && response.pending) processPending(response.pending);
	});
})();
