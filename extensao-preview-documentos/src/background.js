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
