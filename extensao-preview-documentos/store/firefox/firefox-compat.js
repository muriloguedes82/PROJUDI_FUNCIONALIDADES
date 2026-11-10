// Compatibilidade com o Firefox (só no pacote do Firefox).
//
// O gerador store/firefox/gerar-pacote-firefox.mjs copia este arquivo para
// src/firefox-compat.js e o carrega ANTES dos demais scripts de fundo. No
// Chrome ele não existe: o código da extensão continua o mesmo.
//
// No Firefox o processo de fundo é uma página (background.scripts), não um
// service worker. Por isso:
//   - importScripts não existe: os arquivos já vêm carregados em ordem pelo
//     manifest, então aqui ele não faz nada;
//   - chrome.offscreen não existe: a "leitura auxiliar" do Colar processo
//     roda num quadro escondido dentro da própria página de fundo;
//   - downloads.download não aceita endereços data:, que viram blob:.

"use strict";

if (typeof self.importScripts !== "function") {
	self.importScripts = function () { /* scripts já carregados pelo manifest */ };
}

if (!chrome.offscreen && typeof document !== "undefined") {
	const quadros = new Map();
	chrome.offscreen = {
		createDocument: function (opcoes) {
			const url = chrome.runtime.getURL(opcoes.url);
			if (quadros.has(url)) return quadros.get(url);
			const pronto = new Promise(function (resolve, reject) {
				const quadro = document.createElement("iframe");
				quadro.src = url;
				quadro.addEventListener("load", function () { resolve(); }, { once: true });
				quadro.addEventListener("error", function () { quadros.delete(url); reject(new Error("Falha ao abrir a leitura auxiliar.")); }, { once: true });
				document.body.appendChild(quadro);
			});
			quadros.set(url, pronto);
			return pronto;
		},
		hasDocument: async function () { return quadros.size > 0; }
	};
	// O fundo pergunta se o documento já existe: responde pelos quadros
	// criados aqui (createDocument acima também não cria um segundo).
	const getContextsOriginal = chrome.runtime.getContexts;
	chrome.runtime.getContexts = async function (filtro) {
		if (filtro && Array.isArray(filtro.contextTypes) && filtro.contextTypes.indexOf("OFFSCREEN_DOCUMENT") >= 0) {
			const urls = (filtro.documentUrls || []);
			return [...quadros.keys()].filter(function (u) { return !urls.length || urls.indexOf(u) >= 0; }).map(function (u) { return { documentUrl: u, contextType: "OFFSCREEN_DOCUMENT" }; });
		}
		return getContextsOriginal ? getContextsOriginal.call(chrome.runtime, filtro) : [];
	};
}

if (chrome.downloads && typeof URL.createObjectURL === "function") {
	const baixarOriginal = chrome.downloads.download.bind(chrome.downloads);
	chrome.downloads.download = async function (opcoes) {
		if (!opcoes || !/^data:/i.test(String(opcoes.url || ""))) return baixarOriginal(opcoes);
		const blob = await (await fetch(opcoes.url)).blob();
		const url = URL.createObjectURL(blob);
		try {
			return await baixarOriginal(Object.assign({}, opcoes, { url: url }));
		} finally {
			setTimeout(function () { URL.revokeObjectURL(url); }, 60 * 1000);
		}
	};
}
