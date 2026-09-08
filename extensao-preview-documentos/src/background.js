// Projudi - Envio de Documentos por WhatsApp
//
// Service worker (MV3) que faz a ponte entre o content script injetado nas
// páginas do Projudi (src/content.js) e o content script injetado no
// WhatsApp Web (src/whatsapp.js). Os dois rodam em abas/origens diferentes e
// não podem se comunicar diretamente, então os arquivos selecionados pelo
// usuário no Projudi são guardados temporariamente em chrome.storage.local;
// a aba do WhatsApp Web é aberta (ou reaproveitada, se já houver uma) e,
// assim que o chat estiver pronto, o content script de lá busca esse
// conteúdo pendente e o anexa à conversa.
//
// Importante: o WhatsApp Web não permite duas abas logadas ao mesmo tempo —
// abrir uma segunda aba força a primeira (ou a nova) a cair numa tela de
// conflito ("usado em outra janela"), sem carregar a conversa. Por isso
// SEMPRE reaproveitamos uma aba de web.whatsapp.com já aberta em vez de
// criar uma aba nova a cada envio.
//
// Um detalhe chato de content scripts declarados no manifest: eles só são
// injetados quando a página carrega/navega. Uma aba do WhatsApp Web que já
// estava aberta ANTES desta extensão existir (ou antes de uma atualização
// dela) nunca teria o content script novo, e como propositalmente nunca
// recarregamos essa aba (ver comentário abaixo), ela ficaria travada para
// sempre sem o script certo — precisando de um F5 manual do usuário toda
// vez que a extensão for atualizada. Por isso, sempre que avisar a aba por
// mensagem falha (script ausente/desatualizado), reinjetamos
// src/whatsapp.js nela por conta própria com chrome.scripting, sem precisar
// recarregar a página.
//
// Além disso, navegar a aba reaproveitada para uma URL diferente (trocar de
// conversa) força o Chrome a recarregar a página inteira do WhatsApp Web —
// o que parece um "reinício de sessão" mesmo não sendo logout. Por isso
// NUNCA navegamos uma aba já aberta: apenas focamos nela e avisamos
// src/whatsapp.js, que abre a conversa certa simulando o fluxo manual
// ("Nova conversa" → digitar o número → clicar no resultado) sem recarregar
// nada — inclusive numa aba recém-criada por este arquivo (não é preciso
// abrir direto em "send?phone=..."; o próprio content script cuida de abrir
// a conversa assim que a página carregar). A navegação via
// "send?phone=..." só é usada como último recurso, se essa simulação
// falhar (ver "whatsapp-navigate-fallback" abaixo).

"use strict";

const MESSAGE_SOURCE = "projudi-preview";
const PENDING_KEY = "pdpWhatsappPending";
const LOG_PREFIX = "[Projudi WhatsApp]";

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (!message || message.source !== MESSAGE_SOURCE) return false;

	if (message.type === "whatsapp-share") {
		handleShare(message)
			.then(function () {
				sendResponse({ ok: true });
			})
			.catch(function (err) {
				sendResponse({ ok: false, error: String((err && err.message) || err) });
			});
		return true;
	}

	if (message.type === "whatsapp-fetch-pending") {
		chrome.storage.local.get(PENDING_KEY, function (data) {
			sendResponse({ pending: (data && data[PENDING_KEY]) || null });
		});
		return true;
	}

	if (message.type === "whatsapp-clear-pending") {
		chrome.storage.local.remove(PENDING_KEY, function () {
			sendResponse({ ok: true });
		});
		return true;
	}

	return false;
});

async function handleShare(message) {
	if (!message.phone || !Array.isArray(message.files) || !message.files.length) {
		throw new Error("Número ou arquivos inválidos.");
	}

	const payload = {
		phone: message.phone,
		files: message.files,
		createdAt: Date.now(),
	};

	await chrome.storage.local.set({ [PENDING_KEY]: payload });
	await openOrReuseWhatsappTab();
}

async function openOrReuseWhatsappTab() {
	const existingTabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
	console.info(LOG_PREFIX, "abas do WhatsApp Web encontradas:", existingTabs.length, existingTabs.map((t) => t.id));

	if (existingTabs.length) {
		// Nunca navega uma aba já aberta: só foca nela e avisa o content
		// script (já injetado) para abrir a conversa certa por conta própria,
		// sem recarregar a página. Ver comentário no topo do arquivo.
		const tab = existingTabs[0];
		console.info(LOG_PREFIX, "reaproveitando a aba", tab.id, "sem recarregar.");
		await chrome.tabs.update(tab.id, { active: true });
		if (tab.windowId != null) {
			await chrome.windows.update(tab.windowId, { focused: true });
		}
		await notifyOrInjectContentScript(tab.id);
		return tab;
	}

	// Nenhuma aba aberta ainda: cria uma aba normal (sem número na URL) — o
	// content script, ao carregar, busca o envio pendente e abre a conversa
	// certa sozinho, do mesmo jeito que faria numa aba reaproveitada.
	console.info(LOG_PREFIX, "nenhuma aba do WhatsApp Web aberta, criando uma nova.");
	return chrome.tabs.create({ url: "https://web.whatsapp.com/", active: true });
}

// Tenta avisar o content script já injetado na aba; se isso falhar (script
// nunca injetado, ou órfão de uma versão anterior da extensão — o canal com
// chrome.runtime fica cortado depois de a extensão recarregar), injeta
// src/whatsapp.js de novo diretamente. O próprio arquivo já busca o envio
// pendente sozinho assim que carrega, então não precisa reenviar a
// mensagem depois de injetar.
async function notifyOrInjectContentScript(tabId) {
	try {
		await chrome.tabs.sendMessage(tabId, { source: MESSAGE_SOURCE, type: "whatsapp-check-pending" });
		console.info(LOG_PREFIX, "aba", tabId, "avisada diretamente (content script já estava ativo).");
		return;
	} catch (err) {
		console.warn(LOG_PREFIX, "content script não respondeu (ausente ou desatualizado), reinjetando:", err);
	}

	try {
		await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["src/whatsapp.js"] });
		console.info(LOG_PREFIX, "content script reinjetado na aba", tabId, "com sucesso.");
	} catch (err) {
		console.error(LOG_PREFIX, "falha ao reinjetar o content script na aba", tabId, ":", err);
	}
}

// Usado por src/whatsapp.js como último recurso, apenas se não conseguir
// abrir a conversa simulando o fluxo manual (ex.: o WhatsApp Web mudou a
// tela de nova conversa) — nesse caso navegar e recarregar é preferível a
// deixar o envio travado.
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (!message || message.source !== MESSAGE_SOURCE || message.type !== "whatsapp-navigate-fallback") return false;
	if (!sender.tab || sender.tab.id == null) return false;

	const url = "https://web.whatsapp.com/send?phone=" + encodeURIComponent(message.phone);
	console.warn(LOG_PREFIX, "abertura sem reload falhou, navegando a aba", sender.tab.id, "como último recurso.");
	chrome.tabs.update(sender.tab.id, { url: url, active: true }).then(function () {
		sendResponse({ ok: true });
	});
	return true;
});
