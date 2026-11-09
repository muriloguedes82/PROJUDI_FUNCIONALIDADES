// Projudi - Mesa do Analista, aba "Análise de Juntadas": total de
// "Feitos sem infração penal"
//
// Na aba "Mesa do Escrivão Criminal" (usuario/mesaAnalista.do?actionType=
// listaMesaEscrivao, só nas varas criminais) há o quadro "Feitos sem infração
// penal" ("Feitos ativos sem infração penal"). O quadro não mostra número:
// clicar nele abre a lista "Feitos Ativos Com Pendência De Anotação Da
// Infração Penal" (usuario/mesaAnalistaEscrivao.do, formulário com action
// "?actionType=pesquisarProcessosSemInfracaoPenal"), que traz o total em
// "N registro(s) encontrado(s), exibindo de 1 até 20" (div.navLeft).
//
// Esta funcionalidade acrescenta, na aba "Análise de Juntadas", no fim do
// quadro "Para Realizar", a linha "Feitos sem infração penal:" com esse
// total, como os demais contadores da aba (<span class="contador"> dentro de
// um link). O total é obtido em segundo plano:
//   1. abre (fetch) a lista pelo endereço da ação
//      (mesaAnalistaEscrivao.do?actionType=pesquisarProcessosSemInfracaoPenal);
//   2. se o Projudi não aceitar esse endereço, abre a aba "Mesa do Escrivão
//      Criminal" e procura, no código da página, o endereço que o quadro
//      "Feitos sem infração penal" abre ao ser clicado, e usa esse;
//   3. lê o total em "N registro(s) encontrado(s)".
// Clicar no número abre a mesma lista (Ctrl+clique abre em outra aba).
//
// Só aparece quando a Mesa tem a aba "Mesa do Escrivão Criminal". Com total
// zero a linha fica como as demais: some se "Ocultar contadores zerados"
// estiver ligado (mesaAnalistaContadores.js). Para não refazer a pesquisa a
// cada volta à aba, o total fica guardado por alguns minutos
// (sessionStorage da aba).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpSemInfracaoPenal) return;
	window.__pdpSemInfracaoPenal = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Sem Infração Penal]";
	const ROTULO = "Feitos sem infração penal:";
	const CACHE = "pdpSemInfracaoPenal";
	const VALIDADE_MS = 5 * 60 * 1000;
	const LINHA_ATTR = "data-pdp-sem-infracao-penal";
	const ACAO = "pesquisarProcessosSemInfracaoPenal";
	const BASE = location.origin + "/projudi/usuario/";

	function normalizar(texto) {
		return String(texto || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function nomesDasAbas() {
		return Array.from(document.querySelectorAll("#tabHorz li")).map((li) => ({
			nome: normalizar(li.textContent),
			atual: li.classList.contains("currentTab"),
		}));
	}

	function naAnaliseDeJuntadas(abas) {
		const atual = abas.find((a) => a.atual);
		if (atual) return /^An[aá]lise de Juntadas$/i.test(atual.nome);
		return /(^|[?&])actionType=listaAnaliseJuntadas(&|$)/.test(location.search);
	}

	// Quadro "Para Realizar" da aba (o <h4> seguido do <fieldset>).
	function acharTabelaParaRealizar() {
		for (const h4 of document.querySelectorAll("h4")) {
			if (!/^Para Realizar$/i.test(normalizar(h4.textContent))) continue;
			let el = h4.nextElementSibling;
			while (el && el.tagName !== "FIELDSET") el = el.nextElementSibling;
			const tabela = el && el.querySelector("table.form, table");
			if (tabela) return tabela;
		}
		return null;
	}

	async function baixarDocumento(url) {
		const resposta = await fetch(url, { credentials: "same-origin" });
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		const tipo = resposta.headers.get("content-type") || "";
		let charset = /charset=([\w-]+)/i.exec(tipo);
		if (!charset) charset = /charset=["']?([\w-]+)/i.exec(new TextDecoder("windows-1252").decode(bytes.slice(0, 4096)));
		let texto;
		try {
			texto = new TextDecoder((charset && charset[1]) || "windows-1252").decode(bytes);
		} catch (e) {
			texto = new TextDecoder("windows-1252").decode(bytes);
		}
		return { texto, doc: new DOMParser().parseFromString(texto, "text/html") };
	}

	// A resposta é mesmo a lista dos feitos sem infração penal?
	function ehListaSemInfracao(doc) {
		const form = doc.querySelector("form[action*='" + ACAO + "'], #mesaAnalistaEscrivaoForm");
		if (form && (form.getAttribute("action") || "").indexOf(ACAO) >= 0) return true;
		const h3 = doc.querySelector("h3");
		return !!(h3 && /Infra[cç][aã]o Penal/i.test(h3.textContent) && /Anota[cç][aã]o/i.test(h3.textContent));
	}

	function lerTotal(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /([\d.]+)\s*registro/i.exec(nav.textContent);
		if (m) return parseInt(m[1].replace(/\./g, ""), 10);
		// Sem resultados (ou numa página só) o navegador pode faltar.
		const tabela = doc.querySelector("table.resultTable");
		if (tabela) return tabela.querySelectorAll("tbody tr").length;
		if (/nenhum\s+registro/i.test(doc.body ? doc.body.textContent : "")) return 0;
		throw new Error("total não encontrado na resposta");
	}

	// Endereço que o quadro "Feitos sem infração penal" abre, procurado no
	// código (com os scripts) da aba "Mesa do Escrivão Criminal".
	async function enderecoPeloQuadro() {
		const { texto } = await baixarDocumento(BASE + "mesaAnalista.do?actionType=listaMesaEscrivao");
		let achado = null;
		// 1) A própria linha do quadro (<tr ... title="Feitos ativos sem infração penal" onclick=...>).
		const i = texto.search(/Feitos ativos sem infra/i);
		if (i >= 0) {
			const inicio = texto.lastIndexOf("<tr", i);
			const fim = texto.indexOf("</tr>", i);
			const trecho = inicio >= 0 ? texto.slice(inicio, fim > i ? fim : i + 2000) : "";
			const m = /[^\s'"<>()]*mesaAnalistaEscrivao\.do\?[^\s'"<>()]+/.exec(trecho);
			if (m) achado = m[0];
		}
		// 2) Qualquer endereço com o nome da ação, em qualquer ponto da página.
		if (!achado) {
			const m = new RegExp("[^\\s'\"<>()]*mesaAnalistaEscrivao\\.do\\?[^\\s'\"<>()]*" + ACAO + "[^\\s'\"<>()]*").exec(texto);
			if (m) achado = m[0];
		}
		if (achado) return new URL(achado.replace(/&amp;/g, "&"), BASE).href;
		throw new Error("endereço do quadro \"Feitos sem infração penal\" não encontrado na Mesa do Escrivão Criminal");
	}

	async function contar() {
		const direto = BASE + "mesaAnalistaEscrivao.do?actionType=" + ACAO;
		try {
			const { doc } = await baixarDocumento(direto);
			if (ehListaSemInfracao(doc)) return { total: lerTotal(doc), href: direto };
			console.log(TAG, "o endereço direto não trouxe a lista; procurando o do quadro na Mesa do Escrivão Criminal");
		} catch (erro) {
			console.log(TAG, "endereço direto falhou (" + erro.message + "); procurando o do quadro na Mesa do Escrivão Criminal");
		}
		const href = await enderecoPeloQuadro();
		const { doc } = await baixarDocumento(href);
		if (!ehListaSemInfracao(doc)) throw new Error("a página aberta não é a lista dos feitos sem infração penal");
		return { total: lerTotal(doc), href };
	}

	function lerCache() {
		try {
			const c = JSON.parse(sessionStorage.getItem(CACHE) || "null");
			return c && Date.now() - c.quando < VALIDADE_MS && Number.isFinite(c.total) ? c : null;
		} catch (e) {
			return null;
		}
	}

	function gravarCache(dados) {
		try {
			sessionStorage.setItem(CACHE, JSON.stringify(Object.assign({ quando: Date.now() }, dados)));
		} catch (e) {}
	}

	function criarLinha(tabela) {
		const corpo = tabela.tBodies[0] || tabela;
		const tr = document.createElement("tr");
		tr.setAttribute(LINHA_ATTR, "");
		const tdRotulo = document.createElement("td");
		tdRotulo.className = "label";
		const modelo = corpo.querySelector("td.label");
		tdRotulo.setAttribute("style", (modelo && modelo.getAttribute("style")) || "width:150px");
		const label = document.createElement("label");
		label.textContent = ROTULO;
		label.title = "Feitos ativos sem infração penal (quadro da aba Mesa do Escrivão Criminal)";
		tdRotulo.appendChild(label);
		const tdValor = document.createElement("td");
		const espera = document.createElement("span");
		espera.textContent = "…";
		espera.title = "Contando os feitos sem infração penal…";
		tdValor.appendChild(espera);
		tr.append(tdRotulo, tdValor);
		corpo.appendChild(tr);
		return espera;
	}

	function mostrarTotal(espera, dados) {
		const link = document.createElement("a");
		link.href = dados.href;
		link.title = "Abrir a lista dos feitos ativos com pendência de anotação da infração penal";
		const span = document.createElement("span");
		span.className = "contador";
		span.id = "pdpNumeroFeitosSemInfracaoPenal";
		span.textContent = String(dados.total);
		link.appendChild(span);
		espera.replaceWith(link);
	}

	async function iniciar() {
		const abas = nomesDasAbas();
		if (!abas.some((a) => /^Mesa do Escriv[aã]o Criminal$/i.test(a.nome))) return;
		if (!naAnaliseDeJuntadas(abas)) return;
		if (document.querySelector("[" + LINHA_ATTR + "]")) return;
		const tabela = acharTabelaParaRealizar();
		if (!tabela) {
			console.log(TAG, "quadro \"Para Realizar\" não encontrado na Análise de Juntadas");
			return;
		}
		const espera = criarLinha(tabela);
		let dados = lerCache();
		if (!dados) {
			try {
				dados = await contar();
				gravarCache(dados);
			} catch (erro) {
				console.warn(TAG, "não foi possível contar os feitos sem infração penal:", erro);
				espera.textContent = "não disponível";
				espera.title = "Não foi possível abrir a lista dos feitos sem infração penal agora.";
				return;
			}
		}
		console.log(TAG, "total de feitos sem infração penal:", dados.total);
		mostrarTotal(espera, dados);
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
	else iniciar();
})();
