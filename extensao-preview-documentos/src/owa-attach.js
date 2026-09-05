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
// ATENÇÃO - abordagem não-oficial e frágil: tenta duas técnicas, nessa
// ordem, e nenhuma delas é garantida pela Microsoft:
// 1) Clica no botão "Anexar arquivo" (para o caso de o Outlook Web só criar
//    o <input type="file"> no DOM depois desse clique) e então preenche
//    esse input via DataTransfer, disparando um evento "change".
// 2) Se nenhum input for encontrado, tenta simular um arrastar-e-soltar dos
//    arquivos na área de composição (dragenter/dragover/drop).
// Se o Outlook Web mudar a interface de anexo (ex.: passar a exigir a File
// System Access API sem nenhuma zona de drop), nenhuma das duas funciona, e
// o usuário precisa anexar manualmente. Não há como testar isso a partir
// deste repositório (sem acesso a uma conta real do Outlook Web); se algo
// não funcionar, inspecione o botão de anexar (clique com o botão direito →
// Inspecionar) e ajuste os seletores/rótulos abaixo.

(function () {
	"use strict";

	if (window.__pdpOwaAttachInjected) return;
	window.__pdpOwaAttachInjected = true;

	console.log("[Projudi->Outlook] content script carregado em", window.location.href);

	const FILE_INPUT_SELECTOR = 'input[type="file"]';
	// Rótulo visto no botão de anexar do Outlook Web atual (Fluent UI). Se a
	// Microsoft mudar o texto (ex.: outro idioma/versão), ajuste esta lista.
	const ATTACH_BUTTON_LABELS = ["anexar arquivo", "attach file"];
	const WAIT_TIMEOUT_MS = 20000;
	const ATTACH_DELAY_MS = 400;
	const AFTER_CLICK_DELAY_MS = 600;

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function findAttachButton() {
		const spans = document.querySelectorAll("span, button, [role=\"menuitem\"], [role=\"button\"]");
		for (const el of spans) {
			const text = (el.textContent || "").trim().toLowerCase();
			if (ATTACH_BUTTON_LABELS.indexOf(text) !== -1) {
				return el.closest('button, [role="button"], [role="menuitem"]') || el;
			}
		}
		return null;
	}

	function findFileInput() {
		// O Outlook Web pode ter mais de um <input type="file"> na página (ex.:
		// upload de foto de perfil, outras áreas da interface). Pega o ÚLTIMO
		// da ordem do DOM como heurística: como a janela abre direto na tela de
		// composição (deep link), o input de anexo da composição tende a ser
		// montado depois de qualquer input "de fundo" já presente no shell do
		// Outlook. Não há garantia disso — é uma aposta razoável, não uma
		// certeza, dado que não temos acesso à estrutura real da página.
		const inputs = document.querySelectorAll(FILE_INPUT_SELECTOR);
		return inputs.length ? inputs[inputs.length - 1] : null;
	}

	function waitForFileInput(timeoutMs) {
		// Em vez de resolver assim que o primeiro <input type="file"> aparece,
		// espera o DOM "assentar" (sem novas mutações por SETTLE_MS) antes de
		// escolher o último input encontrado — a tela de composição do Outlook
		// Web é uma SPA que segue re-renderizando por um tempo depois do
		// carregamento inicial, e queremos evitar pegar um input "de fundo" que
		// já existia antes da composição terminar de montar.
		const SETTLE_MS = 500;
		return new Promise((resolve) => {
			let settleTimer = null;

			function scheduleResolve() {
				clearTimeout(settleTimer);
				settleTimer = setTimeout(function () {
					observer.disconnect();
					resolve(findFileInput());
				}, SETTLE_MS);
			}

			const observer = new MutationObserver(scheduleResolve);
			observer.observe(document.documentElement, { childList: true, subtree: true });

			if (findFileInput()) scheduleResolve();

			setTimeout(function () {
				clearTimeout(settleTimer);
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

	function findDropTarget() {
		// Área onde o Outlook Web normalmente aceita arrastar-e-soltar
		// anexos: o corpo do e-mail (editor de texto). Se não achar, usa a
		// página inteira como alvo — a maioria dos apps de e-mail trata a
		// tela de composição inteira como zona de soltar arquivos.
		return document.querySelector('[contenteditable="true"]') || document.querySelector('[role="textbox"]') || document.body;
	}

	function buildDataTransfer(files) {
		const dataTransfer = new DataTransfer();
		files.forEach(function (file) {
			dataTransfer.items.add(file);
		});
		return dataTransfer;
	}

	function dispatchDropSequence(target, dataTransfer) {
		const opts = { bubbles: true, cancelable: true, dataTransfer: dataTransfer };
		target.dispatchEvent(new DragEvent("dragenter", opts));
		target.dispatchEvent(new DragEvent("dragover", opts));
		target.dispatchEvent(new DragEvent("drop", opts));
	}

	// Alternativa ao <input type="file">: simula um arrastar-e-soltar dos
	// arquivos direto na área de composição. Funciona independentemente de
	// como o botão "Anexar arquivo" está implementado por baixo dos panos
	// (inclusive se usar a File System Access API, que não pode ser
	// automatizada por script), desde que a tela de composição tenha uma
	// área de soltar arquivos — o que é comum, mas não garantido.
	function attachFilesViaDragAndDrop(files) {
		const target = findDropTarget();
		if (!target) return false;
		dispatchDropSequence(target, buildDataTransfer(files));
		return true;
	}

	async function run() {
		let pending;
		try {
			pending = await chrome.runtime.sendMessage({ type: "PEEK_PENDING_EMAIL" });
		} catch (err) {
			console.warn("[Projudi->Outlook] Não consegui falar com a extensão:", err);
			return;
		}

		console.log("[Projudi->Outlook] anexo pendente encontrado?", pending);
		if (!pending) return;

		// Em algumas versões do Outlook Web o <input type="file"> só é
		// inserido no DOM depois que o botão "Anexar arquivo" é clicado (ele
		// não existe desde o carregamento da página). Por isso, tentamos
		// clicar nesse botão antes de procurar o campo — isso não abre
		// nenhuma janela de seleção de arquivo do sistema operacional (o
		// navegador bloqueia isso para cliques disparados por script, sem
		// gesto real do usuário), mas pode ser suficiente para o input ser
		// montado no DOM, que é tudo que precisamos.
		const attachButton = findAttachButton();
		if (attachButton) {
			console.log("[Projudi->Outlook] clicando no botão 'Anexar arquivo' para revelar o campo…", attachButton);
			attachButton.click();
			await sleep(AFTER_CLICK_DELAY_MS);
		} else {
			console.warn("[Projudi->Outlook] Botão 'Anexar arquivo' não encontrado; tentando localizar o campo mesmo assim.");
		}

		console.log("[Projudi->Outlook] aguardando campo de anexo aparecer na tela…");
		const input = await waitForFileInput(WAIT_TIMEOUT_MS);
		console.log("[Projudi->Outlook] campo de anexo encontrado?", input);

		const consumed = await chrome.runtime.sendMessage({ type: "CONSUME_PENDING_EMAIL", id: pending.id });
		if (!consumed || !consumed.attachments || !consumed.attachments.length) {
			console.warn("[Projudi->Outlook] anexo pendente já havia sido consumido ou expirou.");
			return;
		}

		const files = consumed.attachments.map(function (a) {
			return base64ToFile(a.base64, a.name, a.contentType);
		});

		try {
			if (input) {
				await attachFilesSequentially(files);
				console.log(
					"[Projudi->Outlook] anexos inseridos via input[type=file]:",
					files.map((f) => f.name)
				);
			} else {
				console.warn(
					"[Projudi->Outlook] Nenhum campo de anexo encontrado; tentando arrastar-e-soltar os arquivos na tela."
				);
				const dropped = attachFilesViaDragAndDrop(files);
				if (!dropped) throw new Error("Não encontrei onde soltar os arquivos na tela do Outlook.");
				console.log(
					"[Projudi->Outlook] simulação de arrastar-e-soltar disparada para:",
					files.map((f) => f.name)
				);
			}
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
