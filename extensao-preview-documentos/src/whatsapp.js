// Projudi - Envio de Documentos por WhatsApp
//
// Content script injetado em web.whatsapp.com. Ao carregar (ou ao ser
// avisado pelo background sem recarregar a página — ver src/background.js),
// verifica se há um envio pendente (arquivos selecionados no Projudi,
// guardados em chrome.storage.local). Se houver:
//
// 1. Abre a conversa do número informado, simulando o fluxo manual: clicar
//    em "Nova conversa", digitar o número na busca e clicar no resultado.
//    Isso é feito SEMPRE, mesmo se a conversa "parecer" já ser a certa —
//    não há como saber com certeza, de fora, qual conversa está aberta no
//    momento (o usuário pode ter trocado de chat manualmente, ou a aba pode
//    ter sido reaproveitada de um envio anterior para outro número), e
//    anexar no chat errado enviaria o documento para a pessoa errada. Re-
//    selecionar a mesma conversa não tem efeito colateral, então o custo de
//    sempre fazer essa checagem é só um pouco de tempo a mais.
// 2. Anexa os arquivos à conversa, tentando dois mecanismos que o próprio
//    WhatsApp Web já suporta manualmente: "colar" (paste, como quando se
//    copia um arquivo e aperta Ctrl+V no chat) e, se isso falhar, "arrastar
//    e soltar".
//
// Os arquivos ficam anexados prontos para revisão/legenda: o envio final
// (clicar em "Enviar") continua sendo uma ação manual do usuário.
//
// Também é exibido um pequeno aviso no canto da tela com o andamento (e
// mensagens de erro), além de tudo ser registrado no console com o prefixo
// "[Projudi WhatsApp]" — útil para diagnosticar se o WhatsApp Web mudar a
// estrutura da tela e algum desses seletores parar de funcionar.

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

	function wait(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
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

	// Espera até que `getCount()` pare de mudar por `settleMs` seguidos,
	// depois de já ter passado pelo menos `minWaitMs` no total (ou até
	// `timeoutMs`, o que vier primeiro). Usado depois de digitar na busca: o
	// WhatsApp Web filtra a lista de forma assíncrona/com debounce, então
	// ler a contagem logo após digitar corre o risco de pegar a lista
	// ANTIGA (ainda não filtrada, ex.: a lista de conversas inteira) — e
	// clicar no primeiro item dela seria abrir a conversa errada. O
	// `minWaitMs` garante que o debounce do WhatsApp já teve tempo de
	// disparar pelo menos uma vez antes de aceitarmos a contagem como final.
	function waitForStableCount(getCount, settleMs, minWaitMs, timeoutMs, intervalMs) {
		return new Promise(function (resolve) {
			const start = Date.now();
			let lastCount = getCount();
			let lastChangeAt = Date.now();

			(function tick() {
				const count = getCount();
				if (count !== lastCount) {
					lastCount = count;
					lastChangeAt = Date.now();
				}

				const stableFor = Date.now() - lastChangeAt;
				const elapsed = Date.now() - start;
				const settled = count > 0 && stableFor >= settleMs && elapsed >= minWaitMs;
				if (settled || elapsed >= timeoutMs) {
					return resolve(count);
				}
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

	function currentUrlPhone() {
		try {
			return new URL(window.location.href).searchParams.get("phone");
		} catch (e) {
			return null;
		}
	}

	// ---------------------------------------------------------------------
	// Abrir a conversa certa sem recarregar a página (evita "reiniciar" a
	// sessão do WhatsApp Web) — simula o fluxo manual: clicar em "Nova
	// conversa", digitar o número na busca e clicar no resultado.
	// ---------------------------------------------------------------------

	const NEW_CHAT_SELECTORS = [
		'span[data-icon="new-chat-outline"]',
		'span[data-icon="chat"]',
		'span[data-icon="new-chat"]',
		'span[data-icon="chat-refreshed"]',
		'span[data-icon="lab-chat-refreshed"]',
		'[aria-label="Nova conversa"]',
		'[aria-label="New chat"]',
		'[title="Nova conversa"]',
		'[title="New chat"]',
	];

	function findNewChatButton() {
		for (let i = 0; i < NEW_CHAT_SELECTORS.length; i++) {
			const el = document.querySelector(NEW_CHAT_SELECTORS[i]);
			if (el) return el.closest('[role="button"]') || el;
		}
		return null;
	}

	// Confirmado (via DevTools numa instalação real): a busca padrão da
	// lista de conversas é um <input type="text"> de verdade, com
	// aria-label "Pesquisar ou começar uma nova conversa" (ou "Pesquisar
	// nome, número ou @nomedeusuário" dentro do painel de nova conversa) —
	// versões mais antigas usavam um <div contenteditable="true"> em vez de
	// <input>, então aceitamos os dois. Damos preferência ao aria-label
	// (mais estável entre versões que os nomes de classe, que no WhatsApp
	// Web atual são gerados/ilegíveis, ex.: "xdj266r x14z9mp ...").
	function findChatSearchInput() {
		const side = document.querySelector("#side");
		if (!side) return null;

		const byLabel = side.querySelector(
			'input[aria-label*="Pesquisar" i], input[aria-label*="Search" i], ' +
				'[contenteditable="true"][aria-label*="Pesquisar" i], [contenteditable="true"][aria-label*="Search" i]'
		);
		if (byLabel) return byLabel;

		const candidates = side.querySelectorAll(
			'[contenteditable="true"], input[type="text"], input[type="search"], input:not([type])'
		);
		return candidates.length ? candidates[candidates.length - 1] : null;
	}

	// Seletores para os itens de resultado da busca (uma conversa/contato
	// listado depois de digitar um nome/número). Ainda não confirmados numa
	// instalação com a versão mais nova do WhatsApp Web (a que reescreveu a
	// interface com classes CSS geradas, tipo "x1c1uobl") — por isso a lista
	// é propositalmente ampla, cobrindo tanto o WhatsApp Web "clássico"
	// quanto suposições razoáveis sobre o novo. Ver LOG_PREFIX no console se
	// nenhum desses bater: a extensão avisa quantos resultados encontrou.
	const SEARCH_RESULT_SELECTOR = [
		'[data-testid="cell-frame-container"]',
		'[data-testid*="cell" i]',
		'[data-testid*="chat" i]',
		'[role="listitem"]',
		'[role="row"]',
		'[role="option"]',
		'[role="gridcell"]',
	].join(", ");

	function countSearchResults() {
		const side = document.querySelector("#side");
		if (!side) return 0;
		return side.querySelectorAll(SEARCH_RESULT_SELECTOR).length;
	}

	// O elemento que bate no SEARCH_RESULT_SELECTOR pode ser só um contêiner
	// (ex.: a "célula" da linha, sem handler de clique nenhum) — o alvo
	// realmente clicável costuma ser ele mesmo, um ancestral próximo com
	// role="button"/tabindex, ou um descendente assim. Tentamos achar esse
	// alvo mais específico; se não achar nenhum, clicamos no próprio item
	// (o clique ainda bubbleia, então às vezes funciona mesmo assim).
	function findClickTarget(item) {
		if (!item) return null;
		return (
			item.closest('[role="button"], [role="link"], button, a') ||
			item.querySelector('[role="button"], [role="link"], button, a, [tabindex]') ||
			item
		);
	}

	function findFirstSearchResult() {
		const side = document.querySelector("#side");
		if (!side) return null;
		return side.querySelector(SEARCH_RESULT_SELECTOR);
	}

	// Descreve um elemento de forma resumida (tag, role, data-testid e um
	// pedaço do texto) para aparecer no console e ajudar a diagnosticar qual
	// seletor está pegando o elemento errado. Pode conter nome/telefone de
	// contato — some com essa parte do log antes de compartilhar, se quiser.
	function describeElement(el) {
		if (!el) return "(nenhum)";
		const text = (el.textContent || "").trim().slice(0, 60);
		return (
			"<" +
			el.tagName.toLowerCase() +
			(el.getAttribute("role") ? ' role="' + el.getAttribute("role") + '"' : "") +
			(el.getAttribute("data-testid") ? ' data-testid="' + el.getAttribute("data-testid") + '"' : "") +
			'> "' +
			text +
			'"'
		);
	}

	// Preenche um campo de busca controlado por React (o WhatsApp Web inteiro
	// é React) disparando os eventos que o próprio app espera — atribuir
	// textContent/value diretamente não funciona nesses casos.
	function setContentEditableText(el, text) {
		el.focus();

		if (el.isContentEditable) {
			// execCommand é deprecated, mas continua sendo a forma mais
			// confiável de preencher um contenteditable e disparar o "input"
			// que frameworks tipo Draft.js escutam.
			document.execCommand("selectAll", false, null);
			document.execCommand("insertText", false, text);
			return;
		}

		// <input>/<textarea> controlado por React: usar o setter nativo do
		// protótipo para o valor "pegar" mesmo com o value tracker do React
		// (setar `el.value = text` diretamente é ignorado pelo componente).
		const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
		const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
		nativeSetter.call(el, text);
		el.dispatchEvent(new Event("input", { bubbles: true }));
	}

	// Tenta digitar o número direto na busca que já está visível (a barra de
	// busca padrão da lista de conversas, sem precisar clicar em nada) e
	// aguarda um resultado aparecer. Não lança erro se não achar nada — só
	// devolve `false`, para o chamador decidir se tenta outra estratégia.
	async function trySearchDirectly(phone) {
		const input = findChatSearchInput();
		if (!input) {
			log("busca padrão não encontrada.");
			return false;
		}

		log("campo de busca padrão encontrado, digitando o número…");
		setContentEditableText(input, "+" + phone);
		const count = await waitForStableCount(countSearchResults, 500, 600, 6000, 150);
		log(count > 0 ? count + " resultado(s) encontrado(s) na busca padrão." : "nenhum resultado na busca padrão.");
		return count > 0;
	}

	// Estratégia alternativa: clicar explicitamente em "Nova conversa" antes
	// de buscar — em algumas versões do WhatsApp Web a busca padrão só
	// filtra conversas já existentes, e é só dentro desse painel que
	// aparece a opção de "conversar" com um número novo.
	async function openViaNewChatButton(phone) {
		log("tentando pelo botão 'Nova conversa'…");
		// Timeout maior aqui: numa aba recém-criada, o WhatsApp Web ainda pode
		// estar carregando a lista de conversas (ou esperando a leitura do QR
		// Code) quando chegamos a este ponto.
		const newChatBtn = await waitFor(findNewChatButton, 25000, 300);
		log("botão 'Nova conversa' encontrado, clicando…");
		newChatBtn.click();

		await wait(400);
		const searchInput = await waitFor(findChatSearchInput, 8000, 300);
		log("campo de busca do painel 'Nova conversa' encontrado, digitando o número…");
		setContentEditableText(searchInput, "+" + phone);

		const count = await waitForStableCount(countSearchResults, 500, 600, 6000, 150);
		log(count > 0 ? count + " resultado(s) encontrado(s) no painel 'Nova conversa'." : "nenhum resultado no painel 'Nova conversa'.");
		if (count === 0) {
			throw new Error("nenhum resultado apareceu na busca do painel 'Nova conversa'");
		}
	}

	async function openChatBySearch(phone) {
		log("abrindo a conversa de", phone, "…");
		showBanner("abrindo conversa…");

		const foundDirectly = await trySearchDirectly(phone);
		if (!foundDirectly) {
			await openViaNewChatButton(phone);
		}

		const result = await waitFor(findFirstSearchResult, 5000, 300);
		const target = findClickTarget(result);
		log("clicando no resultado da busca:", describeElement(result), "→ alvo do clique:", describeElement(target));

		// Checagem best-effort: se o número buscado aparecer no texto do
		// resultado, é um bom sinal de que é o item certo. Não bloqueia o
		// clique se não bater — um contato já salvo aparece pelo NOME, não
		// pelo número, então a ausência do número aqui não significa erro.
		// Mas se não bater, avisa bem alto no console para o usuário
		// desconfiar e conferir o destinatário antes de enviar.
		const resultDigits = (result.textContent || "").replace(/\D/g, "");
		if (resultDigits.indexOf(phone.slice(-8)) === -1) {
			warn(
				"O resultado clicado não parece conter o número buscado (" +
					phone +
					") — pode ser um contato salvo por nome, mas CONFIRA o destinatário antes de enviar."
			);
		}

		target.click();
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

	function requestNavigateFallback(phone) {
		return new Promise(function (resolve, reject) {
			chrome.runtime.sendMessage(
				{ source: MESSAGE_SOURCE, type: "whatsapp-navigate-fallback", phone: phone },
				function (response) {
					if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
					resolve(response);
				}
			);
		});
	}

	// Sinalizador interno: quando abrir a conversa sem recarregar falha e
	// caímos para a navegação de último recurso, a página vai recarregar
	// sozinha (e um novo carregamento deste script vai reprocessar o mesmo
	// envio pendente) — por isso não seguimos o fluxo nem limpamos o
	// pendente aqui.
	const FALLING_BACK = {};

	// Só existe uma janela em que dá pra confiar que a URL já reflete a
	// conversa certa: a primeira checagem deste carregamento de página, se
	// ela foi carregada via .../send?phone=<mesmo número> (isso só acontece
	// hoje no fallback de último recurso, quando a busca falhou e caímos
	// para navegação). Qualquer checagem seguinte (avisada por mensagem, sem
	// reload) tem que sempre abrir a conversa de novo por busca — a URL não
	// muda mais depois disso, então não dá pra confiar nela de novo.
	let firstCheckDone = false;

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
		log("envio pendente encontrado…", fileNames);

		const trustUrl = !firstCheckDone && currentUrlPhone() === pending.phone;
		firstCheckDone = true;

		let openStep;
		if (trustUrl) {
			log("página já carregada na conversa certa, não precisa abrir por busca.");
			openStep = Promise.resolve();
		} else {
			openStep = openChatBySearch(pending.phone);
		}

		openStep
			.catch(function (err) {
				warn("não consegui abrir a conversa sem recarregar, caindo para navegação:", err);
				showBanner("abrindo conversa (recarregando)…");
				return requestNavigateFallback(pending.phone).then(function () {
					return Promise.reject(FALLING_BACK);
				});
			})
			.then(function () {
				showBanner("aguardando a conversa carregar…");
				return waitFor(findComposer, POLL_TIMEOUT_MS, POLL_INTERVAL_MS);
			})
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
				clearPending();
			})
			.catch(function (err) {
				if (err === FALLING_BACK) return;
				// Causas comuns: sessão do WhatsApp Web não conectada (QR Code
				// pendente), ou a conversa não carregou a tempo (ex.: tela de
				// conflito de sessão porque havia mais de uma aba aberta).
				warn("não foi possível anexar automaticamente:", err);
				showBanner("não anexou automaticamente — anexe manualmente (veja o console).", true);
				clearPending();
			});
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
