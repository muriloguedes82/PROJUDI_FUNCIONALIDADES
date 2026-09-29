// Termos de Uso - aceite obrigatório (service worker).
//
// Os scripts que atuam no Projudi/SEEU não ficam mais em "content_scripts"
// do manifest.json: são registrados aqui, com chrome.scripting, somente
// depois que o usuário aceita os Termos de Uso (src/termos.html). Enquanto
// não houver aceite da versão vigente (PDP_TERMOS.versao), nada é injetado
// nas páginas do Tribunal e a página de termos é aberta:
//   - logo após a instalação (e após atualizações, se ainda sem aceite);
//   - ao iniciar o navegador;
//   - ao abrir uma página do Projudi/SEEU.
// Os scripts do Outlook Web e do WhatsApp Web continuam no manifest: eles só
// agem a partir de envios iniciados nas telas do Projudi/SEEU.
//
// Ao incluir ou remover arquivos dos blocos abaixo, mantenha a mesma ordem
// que antes era usada no manifest.json - hostGuard.js sempre primeiro.

"use strict";

importScripts("termosConfig.js", "funcionalidades.js");

const PDP_TERMOS_MATCHES = ["*://*.tjpr.jus.br/*", "*://seeu.pje.jus.br/*"];
const PDP_TERMOS_HOST_TRIBUNAL = /^https?:\/\/((projudi|tst)[^./]*\.tjpr\.jus\.br|seeu\.pje\.jus\.br)\//i;

const PDP_SCRIPTS_TRIBUNAL = [
	{
		id: "pdp-tribunal-inicio",
		matches: PDP_TERMOS_MATCHES,
		js: ["src/hostGuard.js", "src/closeShim.js"],
		runAt: "document_start",
		allFrames: true,
		matchOriginAsFallback: true,
		persistAcrossSessions: true
	},
	{
		id: "pdp-tribunal-principal",
		matches: PDP_TERMOS_MATCHES,
		js: [
			"src/hostGuard.js",
			"src/uiVisibility.js",
			"src/clipboardProcess.js",
			"src/documentSelection.js",
			"src/content.js",
			"src/email.js",
			"src/quickActions.js",
			"src/remessaMultipla.js",
			"src/buttonDrag.js",
			"src/juntadaDrag.js",
			"src/finalizarConclusao.js",
			"src/mesaAnalistaContadores.js",
			"src/ordenarCumprimentos.js",
			"src/movementHighlight.js",
			"src/expandMovements.js",
			"src/sequencialProcessoPrincipal.js",
			"src/decursoPrazoSequencial.js",
			"src/suspensaoAtiva.js",
			"src/monitoracaoAtiva.js",
			"src/oraculoDirect.js",
			"src/oraculo.js",
			"src/habilitarAdvogado.js",
			"src/editarPartes.js",
			"src/alvaraEletronico.js",
			"src/juntarDocumento.js",
			"src/reusCabecalho.js",
			"src/cpfPartesCumprimentos.js",
			"src/bnmpMandadoPrisao.js",
			"src/enderecoMandado.js",
			"src/preferenciasNaLinha.js",
			"src/listaTarefas.js",
			"src/funcionalidades.js",
			"src/menuExtensao.js"
		],
		css: [
			"src/content.css",
			"src/email.css",
			"src/quickActions.css",
			"src/remessaMultipla.css",
			"src/juntadaDrag.css",
			"src/ordenarCumprimentos.css",
			"src/movementHighlight.css",
			"src/reusCabecalho.css",
			"src/cpfPartesCumprimentos.css",
			"src/bnmpMandadoPrisao.css",
			"src/enderecoMandado.css",
			"src/juntarDocumento.css",
			"src/listaTarefas.css"
		],
		runAt: "document_idle",
		allFrames: true,
		matchOriginAsFallback: true,
		persistAcrossSessions: true
	}
];

// O bloco principal é registrado uma vez por sistema (cada um com o seu
// endereço e a sua lista de funcionalidades desativadas - ver
// src/funcionalidades.js). Os ids antigos, de antes da separação, são
// removidos a cada sincronização.
const PDP_MATCHES_SISTEMA = { projudi: ["*://*.tjpr.jus.br/*"], seeu: ["*://seeu.pje.jus.br/*"] };
const PDP_ID_PRINCIPAL_ANTIGO = "pdp-tribunal-principal";

async function pdpTermosAceitos() {
	const data = await chrome.storage.local.get(PDP_TERMOS.chave);
	const aceite = data[PDP_TERMOS.chave];
	return !!(aceite && aceite.aceito === true && aceite.versao === PDP_TERMOS.versao);
}

async function pdpRegistrarScripts(scripts) {
	try {
		await chrome.scripting.registerContentScripts(scripts);
	} catch (error) {
		// Navegadores anteriores ao Chrome 119 não aceitam
		// matchOriginAsFallback em scripts registrados dinamicamente.
		if (!/matchOriginAsFallback/i.test(String(error && error.message))) throw error;
		await chrome.scripting.registerContentScripts(scripts.map(function (script) {
			const copia = Object.assign({}, script);
			delete copia.matchOriginAsFallback;
			return copia;
		}));
	}
}

// Remove e registra de novo a cada chamada: assim uma atualização da
// extensão que inclua/retire arquivos passa a valer, e a revogação do
// aceite (ou uma nova versão dos termos) desliga os scripts.
async function pdpSincronizarScriptsTribunal() {
	const ids = pdpScriptsBase().map(function (script) { return script.id; }).concat(PDP_ID_PRINCIPAL_ANTIGO);
	const registrados = await chrome.scripting.getRegisteredContentScripts({ ids: ids });
	if (registrados.length) {
		await chrome.scripting.unregisterContentScripts({
			ids: registrados.map(function (script) { return script.id; })
		});
	}
	if (await pdpTermosAceitos()) await pdpRegistrarScripts(await pdpScriptsAtivos());
}

// Blocos registrados: o de início (comum) e um bloco principal por sistema.
function pdpScriptsBase() {
	const inicio = PDP_SCRIPTS_TRIBUNAL.filter(function (script) { return script.id !== PDP_ID_PRINCIPAL_ANTIGO; });
	const principal = PDP_SCRIPTS_TRIBUNAL.find(function (script) { return script.id === PDP_ID_PRINCIPAL_ANTIGO; });
	return inicio.concat(PDP_FUNCIONALIDADES.sistemas.map(function (sistema) {
		return Object.assign({}, principal, { id: principal.id + "-" + sistema.id, matches: PDP_MATCHES_SISTEMA[sistema.id] });
	}));
}

// Retira dos blocos os arquivos das funcionalidades desativadas no Menu da
// extensão (ver src/funcionalidades.js), conforme o sistema do bloco. A
// ordem dos demais é mantida.
async function pdpScriptsAtivos() {
	const data = await chrome.storage.local.get([PDP_FUNCIONALIDADES.chave, PDP_FUNCIONALIDADES.chaveAntiga]);
	return pdpScriptsBase().map(function (script) {
		const sistema = PDP_FUNCIONALIDADES.sistemas.find(function (s) { return script.id === PDP_ID_PRINCIPAL_ANTIGO + "-" + s.id; });
		if (!sistema) return script;
		const fora = pdpArquivosDesativados(pdpDesativadasDoSistema(data, sistema.id));
		const manter = function (arquivo) { return !fora.has(arquivo); };
		const copia = Object.assign({}, script, { js: script.js.filter(manter) });
		if (script.css) copia.css = script.css.filter(manter);
		if (copia.css && !copia.css.length) delete copia.css;
		return copia;
	});
}

// Serializa as sincronizações (instalação e aceite podem ocorrer quase ao
// mesmo tempo) para evitar erro de id duplicado no registro.
let pdpFilaSincronizacao = Promise.resolve();
function pdpSincronizar() {
	pdpFilaSincronizacao = pdpFilaSincronizacao
		.then(pdpSincronizarScriptsTribunal)
		.catch(function (error) {
			console.error("[Termos de Uso] Falha ao registrar os scripts:", error);
		});
	return pdpFilaSincronizacao;
}

async function pdpAbrirTermos() {
	const url = chrome.runtime.getURL(PDP_TERMOS.pagina);
	const abertas = (await chrome.tabs.query({})).filter(function (tab) {
		return (tab.url || tab.pendingUrl || "").indexOf(url) === 0;
	});
	if (abertas.length) {
		await chrome.tabs.update(abertas[0].id, { active: true });
		await chrome.windows.update(abertas[0].windowId, { focused: true });
		return;
	}
	await chrome.tabs.create({ url: url, active: true });
}

async function pdpExigirTermosSePendente() {
	if (!(await pdpTermosAceitos())) await pdpAbrirTermos();
}

chrome.runtime.onInstalled.addListener(function () {
	pdpSincronizar().then(pdpExigirTermosSePendente);
});

chrome.runtime.onStartup.addListener(function () {
	pdpSincronizar().then(pdpExigirTermosSePendente);
});

chrome.storage.onChanged.addListener(function (changes, area) {
	if (area === "local" && (changes[PDP_TERMOS.chave] || changes[PDP_FUNCIONALIDADES.chave] || changes[PDP_FUNCIONALIDADES.chaveAntiga])) pdpSincronizar();
});

// Sem aceite, abrir o Projudi/SEEU traz a página de termos para a frente.
chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo, tab) {
	if (changeInfo.status !== "complete" || !PDP_TERMOS_HOST_TRIBUNAL.test(tab.url || "")) return;
	pdpExigirTermosSePendente().catch(function () {});
});
