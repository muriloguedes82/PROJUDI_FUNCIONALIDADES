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

	const url = "https://web.whatsapp.com/send?phone=" + encodeURIComponent(message.phone);
	await openOrReuseWhatsappTab(message.phone, url);
}

function extractPhoneFromUrl(url) {
	try {
		return new URL(url).searchParams.get("phone");
	} catch (e) {
		return null;
	}
}

async function openOrReuseWhatsappTab(phone, url) {
	const existingTabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
	console.info(LOG_PREFIX, "abas do WhatsApp Web encontradas:", existingTabs.length, existingTabs.map((t) => t.id));

	if (existingTabs.length) {
		const tab = existingTabs[0];

		if (extractPhoneFromUrl(tab.url) === phone) {
			// A aba já está na conversa certa: não há necessidade de navegar
			// (o que recarregaria a página inteira do WhatsApp Web). Só
			// avisamos o content script já injetado nela para buscar o novo
			// envio pendente e anexar os arquivos.
			console.info(LOG_PREFIX, "aba", tab.id, "já está na conversa certa, sem recarregar.");
			await chrome.tabs.update(tab.id, { active: true });
			if (tab.windowId != null) {
				await chrome.windows.update(tab.windowId, { focused: true });
			}
			try {
				await chrome.tabs.sendMessage(tab.id, { source: MESSAGE_SOURCE, type: "whatsapp-check-pending" });
			} catch (err) {
				console.warn(LOG_PREFIX, "não consegui avisar a aba diretamente:", err);
			}
			return tab;
		}

		// Reaproveita a primeira aba encontrada, navegando-a para a conversa
		// do número informado — em vez de abrir uma aba nova, o que faria o
		// WhatsApp Web entrar em conflito de sessão entre as duas abas. Como
		// isso é uma navegação de verdade (troca de conversa), a página é
		// recarregada — mas a sessão/login do WhatsApp Web continua a mesma.
		console.info(LOG_PREFIX, "reaproveitando a aba", tab.id, "para a nova conversa.");
		await chrome.tabs.update(tab.id, { url: url, active: true });
		if (tab.windowId != null) {
			await chrome.windows.update(tab.windowId, { focused: true });
		}
		return tab;
	}

	console.info(LOG_PREFIX, "nenhuma aba do WhatsApp Web aberta, criando uma nova.");
	return chrome.tabs.create({ url: url, active: true });
}
