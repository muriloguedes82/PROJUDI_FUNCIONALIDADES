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
// Abre a conversa por número dentro da aba existente, sem navegar/recarregar.
// As funções internas podem mudar: se indisponíveis, retorna erro sem anexar.
// Referência de compatibilidade: https://github.com/wppconnect-team/wa-js

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
			const pending = data && data[PENDING_KEY];
			sendResponse({ pending: pending && pending.tabId === sender.tab?.id ? pending : null });
		});
		return true;
	}

	if (message.type === "whatsapp-open-pending" || message.type === "whatsapp-verify-pending") {
		(async () => {
			const data = await chrome.storage.local.get(PENDING_KEY);
			const pending = data[PENDING_KEY];
			if (!pending || pending.id !== message.id || pending.tabId !== sender.tab?.id) throw new Error("Envio pendente não corresponde a esta aba.");
			const results = await chrome.scripting.executeScript({
				target: { tabId: sender.tab.id }, world: "MAIN",
				func: openWhatsappConversation,
				args: [pending.phone, message.type === "whatsapp-verify-pending", pending.openedChatId || null],
			});
			const result = results[0]?.result || { ok: false, error: "WhatsApp não respondeu." };
			if (result.ok && message.type === "whatsapp-open-pending") {
				const latest = (await chrome.storage.local.get(PENDING_KEY))[PENDING_KEY];
				if (!latest || latest.id !== pending.id) return { ok: false, error: "O envio pendente mudou." };
				await chrome.storage.local.set({ [PENDING_KEY]: { ...latest, openedChatId: result.chatId } });
			}
			return result;
		})().then(sendResponse).catch(err => sendResponse({ ok: false, error: err.message }));
		return true;
	}
	if (message.type === "whatsapp-clear-pending") {
		(async () => {
			const data = await chrome.storage.local.get(PENDING_KEY);
			if (data[PENDING_KEY]?.id === message.id && data[PENDING_KEY]?.tabId === sender.tab?.id) {
				await chrome.storage.local.remove(PENDING_KEY);
			}
			sendResponse({ ok: true });
		})();
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
		phone: String(message.phone).replace(/\D/g, ""),
		id: crypto.randomUUID(),
		files: files,
		createdAt: Date.now(),
	};

	const tab = await openOrReuseWhatsappTab(payload.phone);
	payload.tabId = tab.id;
	await chrome.storage.local.set({ [PENDING_KEY]: payload });
	await notifyOrInjectContentScript(tab.id);
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

// Executada no contexto da página. Não envia mensagens nem documentos.
async function openWhatsappConversation(phone, verifyOnly, openedChatId) {
	let stage = "preparar conversa";
	try {
		if (!/^\d{8,15}$/.test(phone)) throw new Error("Número inválido; informe DDI e DDD.");
		if (typeof window.require !== "function") throw new Error("WhatsApp ainda não está pronto.");
		// Testa cada capacidade separadamente para apontar a falha exata.
		function readModule(name) {
			try { return window.require(name); } catch (_) { return null; }
		}
		const factory = readModule("WAWebWidFactory");
		const chats = readModule("WAWebCollections")?.Chat;
		const cmd = readModule("WAWebCmd")?.Cmd;
		const finder = readModule("WAWebFindChatAction");
		const query = readModule("WAWebQueryExistsJob");
		const capabilities = {
			"QueryExistsJob.queryWidExists": typeof query?.queryWidExists === "function",
			"WidFactory.createWid": typeof factory?.createWid === "function",
			"Chat.get": typeof chats?.get === "function",
			"Chat.findFirst": typeof chats?.findFirst === "function",
			"Chat.active": typeof chats?.active === "function",
			"Chat.getModelsArray": typeof chats?.getModelsArray === "function",
			"Cmd.openChatBottom": typeof cmd?.openChatBottom === "function",
			"FindChatAction.findOrCreateLatestChat": typeof finder?.findOrCreateLatestChat === "function",
		};
		const missing = (verifyOnly ? [] : ["WidFactory.createWid", "Chat.get", "Cmd.openChatBottom", "FindChatAction.findOrCreateLatestChat", "QueryExistsJob.queryWidExists"]).filter(key => !capabilities[key]);
		if (!capabilities["Chat.findFirst"] && !capabilities["Chat.active"] && !capabilities["Chat.getModelsArray"]) missing.push("leitura da conversa ativa");
		if (missing.length) {
			return { ok: false, error: "Diagnóstico WA-02: faltam " + missing.join(", ") + ".", diagnostic: capabilities };
		}
		function activeChat() {
			// O fluxo atual identifica o modelo marcado como ativo.
			if (capabilities["Chat.findFirst"]) return chats.findFirst(chat => chat.active === true);
			if (capabilities["Chat.getModelsArray"]) return chats.getModelsArray().find(chat => chat.active === true);
			return chats.active();
		}
		const id = value => value?.id?._serialized || value?.id?.toString();
		let expected = openedChatId;
		if (!verifyOnly) {
			stage = "consultar número e carregar LID";
			const requestedWid = factory.createWid(phone + "@c.us");
			// A consulta nativa carrega a associação número/LID antes da abertura.
			const registration = await query.queryWidExists(requestedWid);
			if (!registration?.wid) throw new Error("WhatsApp não confirmou o cadastro deste número.");
			stage = "localizar conversa";
			const resolved = await finder.findOrCreateLatestChat(registration.wid, "createChat");
			const chat = resolved?.chat?.id && chats.get(resolved.chat.id);
			if (!chat) throw new Error("Não foi possível localizar a conversa pelo número.");
			expected = id(chat);
			if (!expected) throw new Error("Conversa sem identificador.");
			stage = "abrir conversa";
			await cmd.openChatBottom({ chat });
		}
		stage = "conferir conversa ativa";
		if (!expected) throw new Error("Identificador da conversa aberta não foi registrado.");
		const deadline = Date.now() + (verifyOnly ? 0 : 10000);
		do {
			if (id(activeChat()) === expected && document.querySelector('#main [contenteditable="true"][data-tab]')) return { ok: true, chatId: expected };
			if (verifyOnly) break;
			await new Promise(resolve => setTimeout(resolve, 150));
		} while (Date.now() < deadline);
		throw new Error("A conversa ativa não corresponde ao destinatário solicitado.");
	} catch (error) {
		return { ok: false, error: stage + ": " + error.message };
	}
}

async function openOrReuseWhatsappTab(phone) {
	const existingTabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
	if (existingTabs.length) {
		const tab = existingTabs.find(tab => tab.active) || existingTabs[0];
		await chrome.tabs.update(tab.id, { active: true });
		if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
		return tab;
	}
	return chrome.tabs.create({ url: "https://web.whatsapp.com/send?phone=" + encodeURIComponent(phone), active: true });
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
		throw err;
	}
}

// ---------------------------------------------------------------------------
// Projudi - Envio de Documentos por E-mail (Outlook)
//
// A partir daqui: lógica do recurso de envio por e-mail (origin/principal),
// mesclada com o recurso de WhatsApp acima. Os dois recursos usam
// listeners de chrome.runtime.onMessage independentes, despachados por
// message.type, então não há conflito entre eles.
// ---------------------------------------------------------------------------

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const GRAPH_SCOPES = "openid profile offline_access Mail.ReadWrite";
const INLINE_ATTACHMENT_LIMIT = 3 * 1024 * 1024; // limite recomendado pela Graph para anexos "inline"
const UPLOAD_CHUNK_SIZE = 320 * 1024 * 10; // ~3.1MB, múltiplo de 320KiB exigido pela Graph
const DOWNLOAD_INFO_TTL_MS = 10 * 60 * 1000; // tempo máximo para o pop-up do Outlook mostrar o aviso de arquivos baixados

async function getAzureConfig() {
	const { azureClientId, azureTenantId } = await chrome.storage.sync.get(["azureClientId", "azureTenantId"]);
	if (!azureClientId) {
		throw new Error("Configure o Client ID do Azure AD nas opções da extensão antes de enviar e-mails.");
	}
	return { clientId: azureClientId, tenant: azureTenantId || "common" };
}

function base64UrlEncode(buffer) {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomUrlSafeString(byteLength) {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return base64UrlEncode(bytes.buffer);
}

async function sha256(text) {
	const data = new TextEncoder().encode(text);
	return crypto.subtle.digest("SHA-256", data);
}

function base64ToBytes(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

// Converte bytes para base64 em pedaços, para não estourar o limite de
// argumentos do String.fromCharCode.apply em arquivos grandes.
function bytesToBase64(bytes) {
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

async function storeToken(tokenResponse) {
	await chrome.storage.local.set({
		msalToken: {
			accessToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token || null,
			expiresAt: Date.now() + tokenResponse.expires_in * 1000,
		},
	});
}

async function refreshAccessToken(refreshToken) {
	const { clientId, tenant } = await getAzureConfig();
	const resp = await fetch("https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			scope: GRAPH_SCOPES,
		}),
	});
	if (!resp.ok) return null;
	const data = await resp.json();
	await storeToken(data);
	return data.access_token;
}

async function interactiveLogin() {
	const { clientId, tenant } = await getAzureConfig();
	const redirectUri = chrome.identity.getRedirectURL();
	const verifier = randomUrlSafeString(32);
	const challenge = base64UrlEncode(await sha256(verifier));
	const state = randomUrlSafeString(12);

	const authUrl =
		"https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/authorize?" +
		new URLSearchParams({
			client_id: clientId,
			response_type: "code",
			redirect_uri: redirectUri,
			response_mode: "query",
			scope: GRAPH_SCOPES,
			code_challenge: challenge,
			code_challenge_method: "S256",
			state: state,
			prompt: "select_account",
		}).toString();

	const redirectedTo = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
	if (!redirectedTo) throw new Error("Login no Outlook cancelado.");

	const redirectUrl = new URL(redirectedTo);
	if (redirectUrl.searchParams.get("state") !== state) {
		throw new Error("Resposta de login inválida (state divergente).");
	}
	const code = redirectUrl.searchParams.get("code");
	if (!code) {
		const errorDescription = redirectUrl.searchParams.get("error_description");
		throw new Error(errorDescription || "Login no Outlook cancelado ou sem autorização.");
	}

	const tokenResp = await fetch("https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: "authorization_code",
			code: code,
			redirect_uri: redirectUri,
			code_verifier: verifier,
			scope: GRAPH_SCOPES,
		}),
	});
	const tokenData = await tokenResp.json();
	if (!tokenResp.ok) {
		throw new Error(tokenData.error_description || "Falha ao obter token de acesso do Outlook.");
	}
	await storeToken(tokenData);
	return tokenData.access_token;
}

async function acquireAccessToken() {
	const { msalToken } = await chrome.storage.local.get(["msalToken"]);
	if (msalToken && msalToken.expiresAt - 60000 > Date.now()) {
		return msalToken.accessToken;
	}
	if (msalToken && msalToken.refreshToken) {
		const refreshed = await refreshAccessToken(msalToken.refreshToken);
		if (refreshed) return refreshed;
	}
	return interactiveLogin();
}

async function graphFetch(token, path, options) {
	const resp = await fetch(GRAPH_BASE + path, {
		...options,
		headers: {
			Authorization: "Bearer " + token,
			...(options && options.headers),
		},
	});
	return resp;
}

async function createDraft(token, subject, recipients, bodyText) {
	const toRecipients = (recipients || []).map(function (email) {
		return { emailAddress: { address: email } };
	});
	// O texto padrão (REF. AUTOS / JUÍZO) vem como texto simples; convertido
	// para HTML só trocando quebras de linha por <br>, para preservar o
	// espaçamento no corpo HTML do rascunho.
	const bodyHtml = (bodyText || "").replace(/\n/g, "<br>");
	const resp = await graphFetch(token, "/me/messages", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			subject: subject || "",
			toRecipients: toRecipients,
			body: { contentType: "HTML", content: bodyHtml },
		}),
	});
	const data = await resp.json();
	if (!resp.ok) {
		throw new Error((data.error && data.error.message) || "Falha ao criar rascunho no Outlook.");
	}
	return data;
}

async function addInlineAttachment(token, messageId, file) {
	const resp = await graphFetch(token, "/me/messages/" + messageId + "/attachments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			"@odata.type": "#microsoft.graph.fileAttachment",
			name: file.name,
			contentType: file.contentType || "application/octet-stream",
			contentBytes: file.base64,
		}),
	});
	if (!resp.ok) {
		const data = await resp.json().catch(() => ({}));
		throw new Error((data.error && data.error.message) || "Falha ao anexar " + file.name + ".");
	}
}

async function addLargeAttachment(token, messageId, file, bytes) {
	const sessionResp = await graphFetch(token, "/me/messages/" + messageId + "/attachments/createUploadSession", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			AttachmentItem: {
				attachmentType: "file",
				name: file.name,
				size: bytes.byteLength,
			},
		}),
	});
	const session = await sessionResp.json();
	if (!sessionResp.ok) {
		throw new Error((session.error && session.error.message) || "Falha ao iniciar upload de " + file.name + ".");
	}

	const uploadUrl = session.uploadUrl;
	let offset = 0;
	while (offset < bytes.byteLength) {
		const end = Math.min(offset + UPLOAD_CHUNK_SIZE, bytes.byteLength);
		const chunk = bytes.slice(offset, end);
		const putResp = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Length": String(chunk.byteLength),
				"Content-Range": "bytes " + offset + "-" + (end - 1) + "/" + bytes.byteLength,
			},
			body: chunk,
		});
		if (!putResp.ok) {
			const errText = await putResp.text().catch(() => "");
			throw new Error("Falha ao enviar parte de " + file.name + ": " + errText);
		}
		offset = end;
	}
}

async function openComposeWindow(webLink) {
	let left = 100;
	let top = 100;
	let width = 900;
	let height = 720;
	try {
		const current = await chrome.windows.getCurrent();
		const curWidth = current.width || 1200;
		const curHeight = current.height || 900;
		width = Math.min(900, Math.round(curWidth * 0.6));
		height = Math.min(750, Math.round(curHeight * 0.75));
		left = (current.left || 0) + Math.round((curWidth - width) / 2);
		top = (current.top || 0) + Math.round((curHeight - height) / 2);
	} catch (err) {
		// mantém os valores padrão caso a janela atual não seja detectável
	}
	await chrome.windows.create({ url: webLink, type: "popup", width, height, left, top });
}

async function handleSendEmailGraph(message) {
	const token = await acquireAccessToken();
	const draft = await createDraft(token, message.subject, message.recipients, message.body);

	for (const file of message.attachments) {
		const bytes = base64ToBytes(file.base64);
		if (bytes.byteLength <= INLINE_ATTACHMENT_LIMIT) {
			await addInlineAttachment(token, draft.id, file);
		} else {
			await addLargeAttachment(token, draft.id, file, bytes);
		}
	}

	await openComposeWindow(draft.webLink);
}

// Baixa cada anexo para a pasta padrão de Downloads do usuário e devolve os
// nomes salvos, para exibirmos o aviso na tela do Outlook. Usa uma data:
// URL construída direto do base64 (em vez de Blob + URL.createObjectURL),
// porque service workers de extensão (Manifest V3) não têm
// URL.createObjectURL disponível.
async function downloadAttachments(attachments) {
	const fileNames = [];
	for (const file of attachments) {
		const contentType = file.contentType || "application/octet-stream";
		const dataUrl = "data:" + contentType + ";base64," + file.base64;

		await chrome.downloads.download({
			url: dataUrl,
			filename: file.name,
			saveAs: false,
			conflictAction: "uniquify",
		});

		fileNames.push(file.name);
	}
	return fileNames;
}

// Modo B (fallback semiautomático): baixa os anexos para o computador do
// usuário e abre o Outlook Web de verdade num pop-up; src/owa-attach.js
// (rodando dentro do Outlook Web) mostra um aviso com os nomes dos
// arquivos baixados, orientando o usuário a anexá-los via "Anexar
// arquivo" → "Navegar neste computador" (o único caminho comprovadamente
// confiável neste modo — ver nota no topo do arquivo).
async function handleSendEmailFallback(message) {
	const fileNames = await downloadAttachments(message.attachments);

	await chrome.storage.local.set({
		pendingDownloadInfo: {
			id: crypto.randomUUID(),
			fileNames: fileNames,
			createdAt: Date.now(),
		},
	});

	const composeParams = { subject: message.subject || "" };
	if (message.recipients && message.recipients.length) {
		composeParams.to = message.recipients.join(";");
	}
	if (message.body) {
		composeParams.body = message.body;
	}
	// Não usamos URLSearchParams aqui: ele codifica espaços como "+"
	// (application/x-www-form-urlencoded), mas o deep link do Outlook Web
	// não converte "+" de volta em espaço ao interpretar o parâmetro "body"
	// — mostra o "+" literalmente. encodeURIComponent codifica espaço como
	// %20, que é interpretado corretamente.
	const queryString = Object.keys(composeParams)
		.map(function (key) {
			return key + "=" + encodeURIComponent(composeParams[key]);
		})
		.join("&");
	const composeUrl = "https://outlook.office.com/mail/deeplink/compose?" + queryString;

	await openComposeWindow(composeUrl);
}

async function peekDownloadInfo() {
	const { pendingDownloadInfo } = await chrome.storage.local.get(["pendingDownloadInfo"]);
	if (!pendingDownloadInfo) return null;
	if (Date.now() - pendingDownloadInfo.createdAt > DOWNLOAD_INFO_TTL_MS) {
		await chrome.storage.local.remove("pendingDownloadInfo");
		return null;
	}
	return pendingDownloadInfo;
}

async function consumeDownloadInfo(id) {
	const { pendingDownloadInfo } = await chrome.storage.local.get(["pendingDownloadInfo"]);
	if (!pendingDownloadInfo || pendingDownloadInfo.id !== id) return null;
	await chrome.storage.local.remove("pendingDownloadInfo");
	if (Date.now() - pendingDownloadInfo.createdAt > DOWNLOAD_INFO_TTL_MS) return null;
	return pendingDownloadInfo;
}

async function resolveSendMode() {
	const { azureClientId, sendMode } = await chrome.storage.sync.get(["azureClientId", "sendMode"]);
	const mode = sendMode || "auto";
	if (mode === "owa") return "owa";
	if (mode === "graph") return "graph";
	// "auto": usa Graph se já houver Client ID configurado, senão cai no
	// fallback do Outlook Web, sem exigir nenhum cadastro no Azure AD.
	return azureClientId ? "graph" : "owa";
}

// Baixa o conteúdo de cada arquivo selecionado (a extensão recebe só nome +
// link do content script — quem baixa é o service worker, não a página).
// Isso é necessário porque, em alguns sistemas (ex.: o SEEU), o link do
// arquivo redireciona para um bucket S3 com URL assinada que não devolve
// cabeçalhos CORS liberando fetch() a partir da página (bloqueado pelo
// navegador com "No 'Access-Control-Allow-Origin' header..."). O service
// worker da extensão não sofre essa restrição para hosts cobertos pelos
// host_permissions do manifest, então o download funciona normalmente
// daqui, mesmo com o redirecionamento.
async function resolveAttachments(attachments) {
	const resolved = [];
	for (const att of attachments) {
		const resp = await fetch(att.href, { credentials: "include" });
		if (!resp.ok) {
			throw new Error("Falha ao baixar " + att.name + " (HTTP " + resp.status + ").");
		}
		const buffer = await resp.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		resolved.push({
			name: att.name,
			contentType: resp.headers.get("content-type") || "application/octet-stream",
			base64: bytesToBase64(bytes),
		});
	}
	return resolved;
}

async function handleSendEmail(message) {
	const attachments = await resolveAttachments(message.attachments || []);
	const resolvedMessage = { ...message, attachments: attachments };

	const mode = await resolveSendMode();
	if (mode === "graph") {
		return handleSendEmailGraph(resolvedMessage);
	}
	return handleSendEmailFallback(resolvedMessage);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (!message) return;

	if (message.type === "SEND_EMAIL") {
		handleSendEmail(message)
			.then(() => sendResponse({ ok: true }))
			.catch((err) => sendResponse({ ok: false, error: err.message }));
		return true; // resposta assíncrona
	}

	if (message.type === "PEEK_DOWNLOAD_INFO") {
		peekDownloadInfo().then(sendResponse);
		return true;
	}

	if (message.type === "CONSUME_DOWNLOAD_INFO") {
		consumeDownloadInfo(message.id).then(sendResponse);
		return true;
	}
});

// Executa somente o botão previamente marcado no iframe desta operação.
function clickJuntadaWithConfirmation(token) {
  if (!window.frameElement || window.frameElement.getAttribute('data-pdp-dispensa') !== token) return null;
  if (!/^\/projudi\/.*\/analisarJuntada\.do$/.test(location.pathname)) return { ok: false, error: 'Página de análise inesperada.' };
  const button = document.querySelector('[data-pdp-dispensa-button="' + token + '"]');
  if (!button || button.disabled) return { ok: false, error: 'Botão de dispensa indisponível.' };
  button.removeAttribute('data-pdp-dispensa-button');
  const originalConfirm = window.confirm;
  let accepted = false, rejected = false;
  window.confirm = function (message) {
    const text = String(message || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // Não aceita confirmações de outras ações, nem uma segunda confirmação.
    const specific = /dispens(?:a|ar)/.test(text) && /confirm|deseja|certeza/.test(text) && !/exclu|arquiv|remess|envi|conclus/.test(text);
    if (!accepted && specific) { accepted = true; return true; }
    rejected = true;
    return false;
  };
  try {
    button.click();
    return rejected ? { ok: false, error: 'A confirmação recebida não correspondeu à dispensa esperada. Operação interrompida.' } : { ok: true };
  } catch (error) { return { ok: false, error: String(error.message || error) }; }
  finally { window.confirm = originalConfirm; }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.source !== 'projudi-preview' || message.type !== 'juntada-dispense-marked') return false;
  if (!sender.tab || !/^https?:\/\/[^/]+\.tjpr\.jus\.br\/projudi\//.test(sender.url || '') || !/^[a-f0-9-]{36}$/.test(message.token || '')) {
    reply({ ok: false, error: 'Origem da operação inválida.' }); return false;
  }
  chrome.scripting.executeScript({ target: { tabId: sender.tab.id, allFrames: true }, world: 'MAIN', func: clickJuntadaWithConfirmation, args: [message.token] })
    .then(results => reply(results.map(entry => entry.result).find(Boolean) || { ok: false, error: 'Não foi localizado o iframe da dispensa.' }))
    .catch(error => reply({ ok: false, error: error.message }));
  return true;
});

chrome.runtime.onMessage.addListener((message,sender,reply) => {
  if (message?.source !== 'projudi-preview' || message.type !== 'clipboard-process-open') return false;
  try {
    const origin = new URL(sender.url);
    if (!sender.tab || !/^https?:$/.test(origin.protocol) || !/(^|\.)tjpr\.jus\.br$/.test(origin.hostname) || !origin.pathname.startsWith('/projudi/') || !/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(message.number || '')) throw new Error('Origem ou número de processo inválido.');
    const url = origin.origin + '/projudi/processo/buscaProcesso.do?actionType=iniciarSimples#pdp-search=' + encodeURIComponent(message.number);
    chrome.tabs.create({url,active:true}).then(() => reply({ok:true})).catch(error => reply({ok:false,error:error.message}));
    return true;
  } catch (error) { reply({ok:false,error:error.message}); return false; }
});

// Executada no contexto nativo do frame que recebeu o clique.
function openCurrentPartyOraculo() {
  const candidates = [];
  const visited = new Set();
  function collect(win) {
    if (visited.has(win)) return;
    visited.add(win);
    try {
      if (win.location.origin !== window.location.origin || !win.location.pathname.startsWith('/projudi/')) return;
      const doc = win.document;
      const button = doc.getElementById('btPesqOraculo');
      if (button && !button.disabled && button.getClientRects().length &&
          win.getComputedStyle(button).visibility !== 'hidden' &&
          doc.forms.namedItem('parteProcessoForm') && typeof win.pesquisarOraculo === 'function') {
        candidates.push({win, button});
      }
      for (const frame of doc.querySelectorAll('iframe,frame')) {
        if (frame.getClientRects().length && win.getComputedStyle(frame).visibility !== 'hidden') collect(frame.contentWindow);
      }
    } catch (_) { /* Frames de outra origem não são consultados. */ }
  }
  collect(window);
  if (candidates.length === 0) return {ok:false, error:'Abra a ficha da parte onde aparece o botão nativo Oráculo e use o atalho novamente. Esta página ainda não disponibiliza a consulta dessa parte.'};
  if (candidates.length !== 1) return {ok:false, error:'Há mais de uma ficha de parte aberta. Use o botão Oráculo dentro da ficha da parte desejada.'};
  try {
    candidates[0].win.pesquisarOraculo();
    return {ok:true};
  } catch (error) { return {ok:false, error:String(error.message || error)}; }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.source !== 'projudi-preview' || message.type !== 'oraculo-open') return false;
  try {
    const url = new URL(sender.url);
    if (!sender.tab || url.protocol !== 'https:' || !/(^|\.)tjpr\.jus\.br$/.test(url.hostname) || !url.pathname.startsWith('/projudi/')) throw new Error('Origem da consulta inválida.');
  } catch (error) { reply({ok:false, error:error.message}); return false; }
  chrome.scripting.executeScript({
    target:{tabId:sender.tab.id, frameIds:[sender.frameId ?? 0]},
    world:'MAIN', func:openCurrentPartyOraculo
  }).then(results => reply(results[0]?.result || {ok:false, error:'A página não respondeu à abertura do Oráculo.'}))
    .catch(error => reply({ok:false, error:error.message}));
  return true;
});

// O endereço vem da ficha consultada agora; não é persistido nem reutilizado.
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.source !== 'projudi-preview' || message.type !== 'oraculo-open-url') return false;
  let url;
  try {
    const origin = new URL(sender.url);
    url = new URL(message.url);
    if (!sender.tab || origin.protocol !== 'https:' || !/(^|\.)tjpr\.jus\.br$/.test(origin.hostname) ||
        !origin.pathname.startsWith('/projudi/') || url.origin !== origin.origin ||
        url.pathname !== '/projudi/processo/criminal/antecedentesCriminais.do' || !url.searchParams.get('_tj')) throw new Error('Endereço do Oráculo inválido.');
  } catch (error) { reply({ok:false, error:error.message}); return false; }
  chrome.scripting.executeScript({target:{tabId:sender.tab.id, frameIds:[sender.frameId ?? 0]}, world:'MAIN',
    func: url => {
      if (typeof window.openDialog !== 'function') return {ok:false, error:'A página atual não disponibiliza a abertura da janela nativa.'};
      window.openDialog(url, 'Antecedentes Criminais - Oráculo', 0, 0);
      return {ok:true};
    }, args:[url.href]
  }).then(results => reply(results[0]?.result || {ok:false, error:'A janela não respondeu.'}))
    .catch(error => reply({ok:false, error:error.message}));
  return true;
});

// Leitura alternativa fora do documento/iframe do Projudi. Sem guardar o conteúdo.
let pdpClipboardDocumentCreating;
async function ensurePdpClipboardDocument() {
  if (!chrome.offscreen) throw new Error('Este Chrome não oferece suporte à leitura auxiliar (Chrome 109 ou superior).');
  if (pdpClipboardDocumentCreating) return pdpClipboardDocumentCreating;
  pdpClipboardDocumentCreating = (async () => {
    const url = chrome.runtime.getURL('src/clipboardOffscreen.html');
    const exists = chrome.runtime.getContexts
      ? (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] })).length > 0
      : (await clients.matchAll()).some(client => client.url === url);
    if (!exists) await chrome.offscreen.createDocument({
      url: 'src/clipboardOffscreen.html', reasons: ['CLIPBOARD'],
      justification: 'Ler o número copiado quando o usuário clica em Processo copiado.'
    });
  })();
  try { await pdpClipboardDocumentCreating; }
  finally { pdpClipboardDocumentCreating = null; }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.source !== 'projudi-preview' || message.type !== 'clipboard-process-read') return false;
  try {
    const origin = new URL(sender.url);
    if (!sender.tab || !/^https?:$/.test(origin.protocol) || !/(^|\.)tjpr\.jus\.br$/.test(origin.hostname) || !origin.pathname.startsWith('/projudi/')) throw new Error('Origem da leitura inválida.');
  } catch (error) { reply({ ok: false, error: error.message }); return false; }
  ensurePdpClipboardDocument()
    .then(() => chrome.runtime.sendMessage({ target: 'pdp-clipboard-offscreen', type: 'read-text' }))
    .then(result => reply(result || { ok: false, error: 'O leitor auxiliar não respondeu.' }))
    .catch(error => reply({ ok: false, error: error.message }));
  return true;
});
