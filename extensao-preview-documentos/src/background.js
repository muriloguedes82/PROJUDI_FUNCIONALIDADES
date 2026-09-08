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
// SEMPRE reaproveitamos uma aba de web.whatsapp.com já aberta (navegando
// para o novo número dentro dela) em vez de criar uma aba nova a cada
// envio.

"use strict";

const MESSAGE_SOURCE = "projudi-preview";
const PENDING_KEY = "pdpWhatsappPending";

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

	const url = "https://web.whatsapp.com/send?phone=" + encodeURIComponent(message.phone);
	await openOrReuseWhatsappTab(url);
}

async function openOrReuseWhatsappTab(url) {
	const existingTabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });

	if (existingTabs.length) {
		// Reaproveita a primeira aba encontrada, navegando-a para a conversa
		// do número informado — em vez de abrir uma aba nova, o que faria o
		// WhatsApp Web entrar em conflito de sessão entre as duas abas.
		const tab = existingTabs[0];
		await chrome.tabs.update(tab.id, { url: url, active: true });
		if (tab.windowId != null) {
			await chrome.windows.update(tab.windowId, { focused: true });
		}
		return tab;
	}

	return chrome.tabs.create({ url: url, active: true });
}
