// Projudi - Envio de Documentos por WhatsApp
//
// Content script injetado em web.whatsapp.com. Ao carregar (ou ao ser
// avisado pelo background sem recarregar a página — ver src/background.js),
// verifica se há um envio pendente (arquivos selecionados no Projudi,
// guardados em chrome.storage.local). Se houver:
//
// 1. Espera a conversa certa terminar de carregar. Quem garante que é a
//    conversa certa é o próprio WhatsApp Web: src/background.js sempre abre
//    a aba (ou navega a já aberta) para a URL oficial
//    "send?phone=<número>", que é o link "clique para conversar" que o
//    próprio WhatsApp Web disponibiliza — sem depender de nenhuma
//    automação de clique/busca por conta desta extensão, que já se provou
//    não confiável (chegou a abrir a conversa errada e a clicar em
//    elementos da interface sem relação nenhuma com o resultado da busca).
//    O único caso em que a aba não é navegada é quando ela já estava
//    exatamente nessa mesma conversa — nesse caso não há nada a abrir.
// 2. Anexa os arquivos à conversa, tentando dois mecanismos que o próprio
//    WhatsApp Web já suporta manualmente: "colar" (paste, como quando se
//    copia um arquivo e aperta Ctrl+V no chat) e, se isso falhar, "arrastar
//    e soltar".
//
// Os arquivos ficam anexados prontos para revisão/legenda: o envio final
// (clicar em "Enviar") continua sendo uma ação manual do usuário — e vale
// sempre conferir o nome/número no topo da conversa antes desse clique.
//
// Também é exibido um pequeno aviso no canto da tela com o andamento (e
// mensagens de erro), além de tudo ser registrado no console com o prefixo
// "[Projudi WhatsApp]" — útil para diagnosticar se o WhatsApp Web mudar a
// estrutura da tela (ex.: o seletor da caixa de mensagem).

(function () {
	"use strict";

	const MESSAGE_SOURCE = "projudi-preview";
	const PENDING_MAX_AGE_MS = 3 * 60 * 1000;
	const POLL_INTERVAL_MS = 700;
	const POLL_TIMEOUT_MS = 60000;
	const LOG_PREFIX = "[Projudi WhatsApp]";

	function log() {
		console.info.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
	}

	function warn() {
		console.warn.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
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

	// ---------------------------------------------------------------------
	// Aviso visual (canto da tela), para não depender de abrir o DevTools
	// ---------------------------------------------------------------------

	let banner = null;

	function showBanner(text, isError) {
		if (!banner) {
			banner = document.createElement("div");
			banner.style.position = "fixed";
			banner.style.left = "16px";
			banner.style.bottom = "16px";
			banner.style.zIndex = "2147483647";
			banner.style.maxWidth = "320px";
			banner.style.padding = "10px 14px";
			banner.style.borderRadius = "6px";
			banner.style.fontFamily = "Arial, Helvetica, sans-serif";
			banner.style.fontSize = "12px";
			banner.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
			document.body.appendChild(banner);
		}
		banner.textContent = "Projudi: " + text;
		banner.style.background = isError ? "#c0392b" : "#25d366";
		banner.style.color = "#fff";
		banner.style.display = "block";
	}

	function hideBannerLater(delayMs) {
		if (!banner) return;
		setTimeout(function () {
			if (banner) banner.style.display = "none";
		}, delayMs);
	}

	// ---------------------------------------------------------------------
	// Conversão do payload (data URL) recebido do Projudi para File
	// ---------------------------------------------------------------------

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

	// ---------------------------------------------------------------------
	// Localizar a conversa aberta / caixa de mensagem
	// ---------------------------------------------------------------------

	// A caixa de mensagem (contenteditable) só existe no DOM quando uma
	// conversa está realmente aberta (não na tela de espera do QR Code, nem
	// na tela de conflito de sessão "usado em outra janela/aba").
	function findComposer() {
		const main = document.querySelector("#main");
		if (!main) return null;
		return main.querySelector('[contenteditable="true"][data-tab]');
	}

	// ---------------------------------------------------------------------
	// Mecanismos de anexo: colar (paste) e arrastar-e-soltar (drag & drop)
	// ---------------------------------------------------------------------

	function buildDataTransfer(files) {
		const dataTransfer = new DataTransfer();
		files.forEach(function (file) {
			dataTransfer.items.add(file);
		});
		return dataTransfer;
	}

	function dispatchPaste(composer, files) {
		composer.focus();
		const event = new ClipboardEvent("paste", {
			bubbles: true,
			cancelable: true,
			clipboardData: buildDataTransfer(files),
		});
		composer.dispatchEvent(event);
	}

	function fireDragEvent(target, type, dataTransfer) {
		const event = new DragEvent(type, {
			bubbles: true,
			cancelable: true,
			composed: true,
			dataTransfer: dataTransfer,
		});
		target.dispatchEvent(event);
	}

	function wait(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	// O WhatsApp Web só revela a área de "soltar para anexar" depois de
	// detectar um dragenter no documento (o `body`) — o drop em si precisa
	// então acontecer na área da conversa (#main).
	async function dispatchFileDrop(main, files) {
		const dataTransfer = buildDataTransfer(files);
		fireDragEvent(document.body, "dragenter", dataTransfer);
		fireDragEvent(main, "dragenter", dataTransfer);
		await wait(150);
		fireDragEvent(main, "dragover", dataTransfer);
		await wait(50);
		fireDragEvent(main, "drop", dataTransfer);
	}

	// Não há como confirmar com certeza, a partir de fora, que o WhatsApp Web
	// realmente processou o "colar" (os elementos da pré-visualização do
	// anexo mudam de nome/estrutura entre versões). Por isso o critério de
	// sucesso aqui é apenas conseguir disparar o evento na caixa de mensagem
	// certa — se isso falhar (ex.: a caixa não existe mais), tentamos
	// arrastar-e-soltar como alternativa antes de desistir.
	async function attachFiles(files) {
		const composer = findComposer();
		const main = document.querySelector("#main");
		if (!composer || !main) throw new Error("caixa de mensagem não encontrada");

		try {
			log("anexando via colar (paste)…");
			showBanner("anexando arquivo(s)…");
			dispatchPaste(composer, files);
		} catch (err) {
			warn("colar falhou, tentando arrastar-e-soltar…", err);
			await dispatchFileDrop(main, files);
		}
	}

	// ---------------------------------------------------------------------
	// Fluxo principal
	// ---------------------------------------------------------------------

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
			log("envio pendente expirado, ignorando.");
			clearPending();
			return;
		}

		const fileNames = pending.files.map(function (f) {
			return f.name;
		});
		log("envio pendente encontrado, aguardando a conversa carregar…", fileNames);
		showBanner("aguardando a conversa carregar…");

		waitFor(findComposer, POLL_TIMEOUT_MS, POLL_INTERVAL_MS)
			.then(function () {
				log("conversa pronta.");
				const files = pending.files.map(function (f) {
					return dataUrlToFile(f.dataUrl, f.name, f.type);
				});
				return attachFiles(files);
			})
			.then(function () {
				log("arquivo(s) enviado(s) para a caixa de mensagem — CONFIRA o destinatário antes de enviar.");
				showBanner("arquivo(s) anexado(s) — confira o destinatário antes de enviar!");
				hideBannerLater(8000);
			})
			.catch(function (err) {
				// Causas comuns: sessão do WhatsApp Web não conectada (QR Code
				// pendente), ou a conversa não carregou a tempo (ex.: tela de
				// conflito de sessão porque havia mais de uma aba aberta).
				warn("não foi possível anexar automaticamente:", err);
				showBanner("não anexou automaticamente — anexe manualmente (veja o console).", true);
			})
			.then(clearPending);
	}

	function checkPendingNow() {
		chrome.runtime.sendMessage({ source: MESSAGE_SOURCE, type: "whatsapp-fetch-pending" }, function (response) {
			if (chrome.runtime.lastError) return;
			if (response && response.pending) processPending(response.pending);
		});
	}

	// Quando a extensão reaproveita esta mesma aba sem navegar (o número de
	// destino já era o da conversa aberta), não há recarregamento de página
	// para reinjetar este content script — o background nos avisa
	// diretamente por mensagem.
	chrome.runtime.onMessage.addListener(function (message) {
		if (!message || message.source !== MESSAGE_SOURCE) return;
		if (message.type === "whatsapp-check-pending") checkPendingNow();
	});

	checkPendingNow();
})();
