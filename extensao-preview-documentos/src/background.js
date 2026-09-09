// Projudi - Envio de Documentos por WhatsApp
//
// Service worker (MV3) que faz a ponte entre o content script injetado nas
// páginas do Projudi (src/content.js) e o content script injetado no
// WhatsApp Web (src/whatsapp.js). Os dois rodam em abas/origens diferentes e
// não podem se comunicar diretamente, então os arquivos selecionados pelo
// usuário no Projudi são guardados temporariamente em chrome.storage.local;
// a aba do WhatsApp Web é aberta (ou reaproveitada, se já houver uma) na
// conversa certa e, assim que o chat estiver pronto, o content script de lá
// busca esse conteúdo pendente e o anexa à conversa.
//
// Importante: o WhatsApp Web não permite duas abas logadas ao mesmo tempo —
// abrir uma segunda aba força a primeira (ou a nova) a cair numa tela de
// conflito ("usado em outra janela"), sem carregar a conversa. Por isso
// SEMPRE reaproveitamos uma aba de web.whatsapp.com já aberta em vez de
// criar uma aba nova a cada envio.
//
// Sobre COMO abrir a conversa certa: a extensão já tentou simular o fluxo
// manual (clicar em "Nova conversa", digitar o número na busca e clicar no
// resultado) para evitar recarregar a aba reaproveitada — mas isso se
// mostrou pouco confiável (a estrutura da tela do WhatsApp Web muda entre
// versões, e um seletor errado já chegou a abrir a conversa de OUTRA
// pessoa, ou a clicar em elementos sem relação com o resultado da busca).
// Enviar um documento de processo para o destinatário errado é muito pior
// do que uma aba recarregando, então a extensão usa sempre o link oficial
// "send?phone=<número>" (o "clique para conversar" do próprio WhatsApp
// Web) para abrir a conversa — é a única forma 100% confiável de garantir
// que o destinatário é o número informado. Isso recarrega a página ao
// trocar de conversa, mas SÓ nesse caso: se a aba já estiver exatamente
// nessa mesma conversa (reenvio para o mesmo número), ela não é recarregada
// de novo, só é avisada para buscar e anexar o novo arquivo.
//
// Outro detalhe: content scripts declarados no manifest só são injetados
// quando a página carrega/navega. Uma aba do WhatsApp Web que já estava
// aberta ANTES desta extensão existir (ou antes de uma atualização dela)
// pode não ter o content script mais recente rodando (ou pode estar órfã —
// o canal com chrome.runtime é cortado depois que a extensão recarrega).
// Por isso, ao avisar uma aba sem navegar (mesma conversa de novo), se isso
// falhar reinjetamos src/whatsapp.js nela por conta própria com
// chrome.scripting, sem precisar de F5 manual.

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
	if (!message.phone || !Array.isArray(message.docs) || !message.docs.length) {
		throw new Error("Número ou arquivos inválidos.");
	}

	const files = await Promise.all(message.docs.map(downloadDocAsPayload));

	const payload = {
		phone: message.phone,
		files: files,
		createdAt: Date.now(),
	};

	await chrome.storage.local.set({ [PENDING_KEY]: payload });
	await openOrReuseWhatsappTab(message.phone);
}

function ensureFileName(name, mime) {
	if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
	const ext = (mime && mime.split("/")[1]) || "pdf";
	return name + "." + ext;
}

function blobToDataUrl(blob) {
	return new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function () {
			resolve(reader.result);
		};
		reader.onerror = function () {
			reject(new Error("Falha ao ler o arquivo"));
		};
		reader.readAsDataURL(blob);
	});
}

// Baixa o documento a partir do service worker (não do content script) de
// propósito: alguns sistemas (ex.: SEEU) redirecionam o link do documento
// para um armazenamento externo (ex.: um bucket S3 com URL assinada) sem
// cabeçalhos de CORS liberando leitura via fetch() feito de dentro da
// própria página. Um fetch feito por uma extensão a partir do seu contexto
// de background, para um domínio coberto por host_permissions, ignora essa
// restrição de CORS — daí a exigência de host_permissions tanto para o
// domínio do sistema (Projudi/SEEU) quanto para o domínio de armazenamento
// para onde ele redireciona (ver manifest.json).
async function downloadDocAsPayload(doc) {
	const resp = await fetch(doc.href, { credentials: "include" });
	if (!resp.ok) throw new Error("Não foi possível baixar " + doc.name);
	const blob = await resp.blob();
	const dataUrl = await blobToDataUrl(blob);
	return { name: ensureFileName(doc.name, blob.type), type: blob.type, dataUrl: dataUrl };
}

function extractPhoneFromUrl(url) {
	try {
		return new URL(url).searchParams.get("phone");
	} catch (e) {
		return null;
	}
}

async function openOrReuseWhatsappTab(phone) {
	const existingTabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
	console.info(LOG_PREFIX, "abas do WhatsApp Web encontradas:", existingTabs.length, existingTabs.map((t) => t.id));

	const url = "https://web.whatsapp.com/send?phone=" + encodeURIComponent(phone);

	if (existingTabs.length) {
		const tab = existingTabs[0];

		if (extractPhoneFromUrl(tab.url) === phone) {
			// A aba já está exatamente nessa conversa: não precisa navegar de
			// novo, só focar nela e avisar o content script a buscar o novo
			// arquivo pendente.
			console.info(LOG_PREFIX, "aba", tab.id, "já está na conversa certa, sem recarregar.");
			await chrome.tabs.update(tab.id, { active: true });
			if (tab.windowId != null) {
				await chrome.windows.update(tab.windowId, { focused: true });
			}
			await notifyOrInjectContentScript(tab.id);
			return tab;
		}

		// Reaproveita a mesma aba, navegando-a para a conversa certa — isso
		// recarrega a página do WhatsApp Web, mas é o único jeito confiável
		// de garantir que abre no destinatário certo (ver comentário no topo
		// do arquivo). A sessão/login do WhatsApp Web continua a mesma.
		console.info(LOG_PREFIX, "reaproveitando a aba", tab.id, "e navegando para a conversa certa.");
		await chrome.tabs.update(tab.id, { url: url, active: true });
		if (tab.windowId != null) {
			await chrome.windows.update(tab.windowId, { focused: true });
		}
		return tab;
	}

	console.info(LOG_PREFIX, "nenhuma aba do WhatsApp Web aberta, criando uma nova.");
	return chrome.tabs.create({ url: url, active: true });
}

// Tenta avisar o content script já injetado na aba; se isso falhar (script
// nunca injetado, ou órfão de uma versão anterior da extensão), injeta
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
