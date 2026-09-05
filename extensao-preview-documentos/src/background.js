// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Service worker (Manifest V3) com dois modos de envio, escolhidos em
// options.html (chrome.storage.sync: "sendMode" = "auto" | "graph" | "owa"):
//
// A) MODO GRAPH (recomendado, oficial): autentica no Microsoft Entra ID
//    (Azure AD) via OAuth2 + PKCE (chrome.identity.launchWebAuthFlow, sem
//    client secret), cria um rascunho via Microsoft Graph já com os
//    anexos, e abre esse rascunho pronto num pop-up. Requer um aplicativo
//    cadastrado no Azure AD pelo TI (ver README).
//
// B) MODO OWA/fallback (sem Azure AD, semiautomático): abre o Outlook Web
//    (outlook.office.com) de verdade num pop-up, com um deep link que já
//    abre a tela de "Novo e-mail" com o assunto preenchido, e baixa os
//    documentos selecionados para a pasta Downloads do usuário (como
//    alternativa manual). O content script src/owa-attach.js, injetado na
//    própria página do Outlook Web, desenha um "chip" arrastável para cada
//    arquivo; o usuário arrasta o chip até a área de composição para
//    anexar.
//
//    Este modo já tentou anexar os arquivos automaticamente preenchendo o
//    campo de anexo via script, mas o Outlook Web trata anexos vindos de
//    eventos disparados por script (não confiáveis, "isTrusted: false")
//    de forma diferente de um anexo real — ele força um fluxo de upload
//    para o OneDrive que falha para um arquivo montado em memória.
//    Testado e confirmado: o mesmo arquivo anexado manualmente funciona
//    sem problemas. Como não há como um content script disparar um
//    evento "confiável" via dispatchEvent, a solução foi inverter a
//    abordagem: o chip arrastável faz o USUÁRIO iniciar o gesto de
//    arrastar (mousedown/mousemove reais), então o "dragstart" que o
//    navegador dispara É confiável, e é dentro desse evento confiável que
//    o arquivo é anexado ao dataTransfer — o "drop" resultante na área de
//    composição do Outlook também é confiável, e o anexo funciona.

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

async function createDraft(token, subject) {
	const resp = await graphFetch(token, "/me/messages", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			subject: subject || "",
			toRecipients: [],
			body: { contentType: "HTML", content: "" },
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
	const draft = await createDraft(token, message.subject);

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
// usuário (como alternativa manual) e abre o Outlook Web de verdade num
// pop-up; src/owa-attach.js (rodando dentro do Outlook Web) desenha, para
// cada arquivo, um "chip" arrastável na própria página. Como o arraste é
// iniciado por um gesto real do usuário (mousedown/mousemove dentro da
// página do Outlook), o navegador considera a operação de arrastar-e-soltar
// confiável (diferente de disparar um evento via script), então o Outlook
// aceita o anexo normalmente quando o chip é solto na área de composição.
async function handleSendEmailFallback(message) {
	await downloadAttachments(message.attachments);

	await chrome.storage.local.set({
		pendingDownloadInfo: {
			id: crypto.randomUUID(),
			attachments: message.attachments,
			createdAt: Date.now(),
		},
	});

	const composeUrl =
		"https://outlook.office.com/mail/deeplink/compose?" +
		new URLSearchParams({ subject: message.subject || "" }).toString();

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

async function handleSendEmail(message) {
	const mode = await resolveSendMode();
	if (mode === "graph") {
		return handleSendEmailGraph(message);
	}
	return handleSendEmailFallback(message);
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
