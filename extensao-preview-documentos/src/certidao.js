// Página da certidão narrativa (aberta pelo botão "📜 Certidão").
//
// Lê os dados coletados pelo content script (chrome.storage.local,
// "pdpCertidao:<id>"), monta a certidão no modelo da "Certidão Narrativa"
// do eproc e, para as peças principais, baixa o arquivo, extrai o texto
// (pdf.js para PDF; DOMParser para HTML) e prepara o resumo dos pedidos:
//   - modo "manual": o trecho dos pedidos (ou o dispositivo, na sentença)
//     aparece num campo de apoio para o servidor revisar e escrever o
//     resumo; na denúncia, o resumo já vem pré-montado (fatos, capitulação
//     e requerimentos);
//   - modo "ia": a IA embutida no Chrome (Prompt API, Gemini Nano) resume
//     o trecho, localmente, sem enviar nada para fora do computador.
// Tudo fica editável antes de imprimir. Nada daqui é gravado no processo.

import * as pdfjsLib from "./lib/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("src/lib/pdfjs/pdf.worker.min.mjs");

const T = globalThis.PdpCertidaoTexto;
const SERVIDOR_KEY = "pdpCertidaoServidor";
const OPCOES_KEY = "pdpCertidaoOpcoes";
const PLACEHOLDER = "[preencher]";
const MAX_PAGINAS_PDF = 120;
const LIMITE_ENTRADA_IA = 6000;

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs, ...filhos) => {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs || {})) {
		if (v === undefined || v === null || v === false) continue;
		if (k === "class") e.className = v;
		else if (k === "text") e.textContent = v;
		else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
		else e.setAttribute(k, v === true ? "" : v);
	}
	for (const f of filhos.flat()) if (f !== undefined && f !== null && f !== false) e.append(f);
	return e;
};

let dados = null;
let pecasUI = []; // [{ peca, raiz, resumo, trecho, estado, seletor, seloIA, incluir, texto, denuncia }]
let opcoes = { usuario: false, invalidos: true, seq: true };

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

function status(msg) {
	$("#status").textContent = msg || "";
}

function valorOuPendente(valor) {
	return valor ? document.createTextNode(valor) : el("span", { class: "pendente", text: PLACEHOLDER });
}

function agoraFormatado() {
	const d = new Date();
	const p = (n) => String(n).padStart(2, "0");
	return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function dataPorExtensoHoje() {
	return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function dataDe(dataHora) {
	const m = /(\d{2}\/\d{2}\/\d{4})/.exec(dataHora || "");
	return m ? m[1] : "";
}

function base64ParaBytes(b64) {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

// ---------------------------------------------------------------------
// Texto dos arquivos
// ---------------------------------------------------------------------

async function baixarArquivo(url) {
	const r = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "certidao-fetch-doc", url });
	if (!r || !r.ok) throw new Error((r && r.error) || "falha ao baixar o arquivo");
	return { bytes: base64ParaBytes(r.base64), contentType: r.contentType || "" };
}

async function textoDoPdf(bytes) {
	const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
	const partes = [];
	const total = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
	for (let n = 1; n <= total; n++) {
		const pagina = await pdf.getPage(n);
		const conteudo = await pagina.getTextContent();
		let ultimoY = null;
		let linha = "";
		const linhas = [];
		for (const item of conteudo.items) {
			if (!("str" in item)) continue;
			const y = item.transform ? Math.round(item.transform[5]) : null;
			if (ultimoY !== null && y !== null && Math.abs(y - ultimoY) > 2 && linha) {
				linhas.push(linha);
				linha = "";
			}
			linha += item.str;
			if (item.hasEOL) {
				linhas.push(linha);
				linha = "";
			}
			ultimoY = y;
		}
		if (linha) linhas.push(linha);
		partes.push(linhas.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"));
		pagina.cleanup();
	}
	await pdf.destroy();
	return partes.join("\n");
}

function textoDoHtml(bytes, contentType) {
	const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
	const m = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType) || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
	let html;
	try {
		html = new TextDecoder((m && m[1]) || "utf-8").decode(bytes);
	} catch (e) {
		html = new TextDecoder("windows-1252").decode(bytes);
	}
	const doc = new DOMParser().parseFromString(html, "text/html");
	doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());
	doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
	doc.querySelectorAll("p, div, li, tr, h1, h2, h3, h4, h5, h6").forEach((n) => n.append("\n"));
	return (doc.body ? doc.body.textContent : doc.documentElement.textContent)
		.split("\n")
		.map((l) => l.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}

async function textoDoArquivo(url) {
	const { bytes, contentType } = await baixarArquivo(url);
	const cabeca = new TextDecoder("latin1").decode(bytes.slice(0, 5));
	if (cabeca === "%PDF-" || /pdf/i.test(contentType)) return textoDoPdf(bytes);
	if (/html|text/i.test(contentType) || /^\s*</.test(new TextDecoder("latin1").decode(bytes.slice(0, 200)))) return textoDoHtml(bytes, contentType);
	throw new Error("formato de arquivo não suportado (" + (contentType || "desconhecido") + ")");
}

// ---------------------------------------------------------------------
// IA do navegador (Prompt API / Gemini Nano)
// ---------------------------------------------------------------------

const OPCOES_IA_PT = {
	expectedInputs: [{ type: "text", languages: ["pt"] }],
	expectedOutputs: [{ type: "text", languages: ["pt"] }],
};

const SISTEMA_IA =
	"Você é servidor de cartório judicial e redige certidões. Responda sempre em português do Brasil, " +
	"em texto corrido, sem títulos, listas, markdown ou comentários. Seja objetivo e fiel ao texto recebido: " +
	"não invente nomes, datas, valores ou pedidos que não estejam nele. Se o trecho não trouxer a informação " +
	"pedida, responda exatamente: Pedidos não identificados no trecho.";

let iaOpcoes = null;
let iaBase = null;

async function iaDisponibilidade() {
	if (!("LanguageModel" in self)) return "unavailable";
	try {
		const disp = await self.LanguageModel.availability(OPCOES_IA_PT);
		if (disp !== "unavailable") {
			iaOpcoes = OPCOES_IA_PT;
			return disp;
		}
	} catch (e) {
		/* versões antigas não aceitam as opções de idioma */
	}
	try {
		const disp = await self.LanguageModel.availability();
		iaOpcoes = {};
		return disp;
	} catch (e) {
		return "unavailable";
	}
}

async function iaSessaoBase() {
	if (iaBase) return iaBase;
	iaBase = await self.LanguageModel.create({
		...iaOpcoes,
		initialPrompts: [{ role: "system", content: SISTEMA_IA }],
		monitor(m) {
			m.addEventListener("downloadprogress", (e) => {
				status("Baixando o modelo de IA do Chrome: " + Math.round((e.loaded || 0) * 100) + "%");
			});
		},
	});
	return iaBase;
}

function promptPara(ui) {
	const rotulo = ui.peca.rotulo.toLowerCase();
	if (ui.peca.tipo === "denuncia" && ui.denuncia) {
		const d = ui.denuncia;
		const blocos = [];
		if (d.fatos.length) blocos.push("FATOS:\n" + d.fatos.map((f) => `Fato ${f.n} – ${f.crime}${f.data ? " (" + f.data + ")" : ""}: ${f.texto.slice(0, 400)}`).join("\n"));
		if (d.capitulacao) blocos.push("CAPITULAÇÃO:\n" + d.capitulacao);
		if (d.requerimentos.length) blocos.push("REQUERIMENTOS IDENTIFICADOS:\n" + d.requerimentos.join("; "));
		const base = blocos.length ? blocos.join("\n\n") : ui.trecho.value;
		return (
			"Resuma a denúncia abaixo em no máximo 4 frases: liste os fatos (número, crime e data), o(s) denunciado(s), " +
			"a capitulação legal e os requerimentos do Ministério Público. Mantenha as iniciais da vítima como no original.\n\n" +
			base
		);
	}
	if (ui.peca.tipo === "sentenca") {
		return "Resuma em no máximo 3 frases objetivas o que foi decidido na sentença (dispositivo) abaixo: resultado, condenações, valores e penas, se houver.\n\n" + ui.trecho.value;
	}
	return `Resuma em no máximo 3 frases objetivas os pedidos formulados na ${rotulo} abaixo, com valores quando houver.\n\n` + ui.trecho.value;
}

async function resumirComIA(ui) {
	const base = await iaSessaoBase();
	let prompt = promptPara(ui);
	if (prompt.length > LIMITE_ENTRADA_IA) prompt = prompt.slice(0, LIMITE_ENTRADA_IA);
	for (let tentativa = 0; tentativa < 3; tentativa++) {
		const sessao = await base.clone();
		try {
			const resposta = await sessao.prompt(prompt);
			return String(resposta || "").replace(/\*\*/g, "").replace(/^\s*[-•]\s*/gm, "").replace(/\s+/g, " ").trim();
		} catch (e) {
			if (/quota|too large|context/i.test(e.name + " " + e.message) && prompt.length > 1500) {
				prompt = prompt.slice(0, Math.floor(prompt.length / 2));
				continue;
			}
			throw e;
		} finally {
			sessao.destroy();
		}
	}
	throw new Error("o trecho é grande demais para a IA do navegador");
}

// ---------------------------------------------------------------------
// Montagem da certidão
// ---------------------------------------------------------------------

function paragrafoPrincipal() {
	const p = el("p", { id: "texto-principal", contenteditable: "true" });
	p.append(
		"O Tribunal de Justiça do Estado do Paraná, com base nos registros processuais eletrônicos do sistema " + dados.sistema + ", acessados em " + agoraFormatado() + ", "
	);
	p.append(el("strong", { text: "CERTIFICA" }));
	p.append(" que, sobre o(a) ");
	p.append(dados.classe ? document.createTextNode(dados.classe.toUpperCase()) : valorOuPendente(""));
	p.append(", processo nº ", valorOuPendente(dados.numero));
	if (dados.distribuicao) p.append(", distribuído em " + dados.distribuicao);
	p.append(", em trâmite no(a) ", valorOuPendente(dados.juizo));
	if (dados.comarca && !T.normalizar(dados.juizo).includes(T.normalizar(dados.comarca))) p.append(" (" + dados.comarca + ")");
	if (dados.polos && dados.polos.length) {
		p.append(", e no qual figuram, ");
		dados.polos.forEach((polo, i) => {
			if (i > 0) p.append(i === dados.polos.length - 1 ? " e, " : "; ");
			p.append(T.frasePolo(polo));
		});
	} else {
		p.append(", e no qual figuram, como ", el("span", { class: "pendente", text: "[partes]" }));
	}
	p.append(", constam os seguintes eventos: ");
	const movs = dados.movimentos.filter((m) => opcoes.invalidos || !m.invalido);
	if (!movs.length) p.append(el("span", { class: "pendente", text: "[nenhum movimento encontrado]" }));
	movs.forEach((m, i) => {
		const mov = Object.assign({}, m, { seq: opcoes.seq ? m.seq : "" });
		let frase = T.fraseMovimento(mov);
		if (opcoes.usuario && m.usuario) frase += " — por " + m.usuario;
		p.append(frase + (i === movs.length - 1 ? "." : "; "));
	});
	return p;
}

function paragrafoFinal() {
	const p = el("p", { id: "texto-final", contenteditable: "true" });
	p.append("Certifica, ainda, que os assuntos cadastrados no mencionado processo são: ");
	p.append(dados.assuntos && dados.assuntos.length ? document.createTextNode(T.juntarLista(dados.assuntos)) : valorOuPendente(""));
	p.append(". Certifica, por fim, que o valor da causa é de ", valorOuPendente(dados.valorCausa), ".");
	return p;
}

function blocoPeca(peca, indice) {
	const titulo = `${peca.rotulo} (${peca.seq ? "evento " + peca.seq + ", " : ""}${dataDe(peca.dataHora) || "data não informada"})`;
	const resumo = el("span", {
		class: "resumo",
		contenteditable: "true",
		"data-placeholder": "[escreva aqui o resumo dos pedidos]",
	});
	const raiz = el("div", { class: "peca" }, el("p", { class: "peca-texto" }, el("strong", { text: titulo + ": " }), resumo));

	const incluir = el("input", { type: "checkbox", checked: true });
	const seletor = el("select", { title: "Arquivo usado para extrair o texto" });
	(peca.docs || []).forEach((d, i) => seletor.append(el("option", { value: String(i), text: d.nome || "Documento " + (i + 1) })));
	if (!(peca.docs || []).length) seletor.append(el("option", { value: "", text: "(nenhum arquivo encontrado)" }));
	const estado = el("span", { class: "estado", text: "" });
	const seloIA = el("span", { class: "selo-ia", hidden: true, text: "✨ gerado por IA — revise antes de imprimir" });
	const trecho = el("textarea", { spellcheck: "false", placeholder: "O trecho extraído da peça aparecerá aqui." });
	const abrir = el("button", { type: "button", text: "Abrir arquivo" });
	const releer = el("button", { type: "button", text: "Reextrair" });
	const botaoIA = el("button", { type: "button", text: "✨ Resumir com IA" });
	const usarTrecho = el("button", { type: "button", text: "Copiar trecho para o resumo" });

	const apoio = el(
		"div",
		{ class: "apoio" },
		el(
			"div",
			{ class: "apoio-linha" },
			el("label", {}, incluir, " incluir na certidão"),
			el("label", {}, "Arquivo: ", seletor),
			abrir,
			releer,
			botaoIA,
			usarTrecho,
			seloIA
		),
		el("div", { class: "apoio-linha" }, estado),
		el("details", {}, el("summary", { text: "Trecho extraído (referência — não sai na impressão)" }), trecho)
	);
	raiz.append(apoio);

	const ui = { peca, raiz, resumo, trecho, estado, seletor, seloIA, incluir, indice, texto: "", denuncia: null };

	incluir.addEventListener("change", () => raiz.classList.toggle("excluida", !incluir.checked));
	abrir.addEventListener("click", () => {
		const d = (peca.docs || [])[Number(seletor.value)];
		if (d) window.open(d.url, "_blank", "noopener");
	});
	releer.addEventListener("click", () => extrair(ui, true));
	seletor.addEventListener("change", () => extrair(ui, true));
	botaoIA.addEventListener("click", () => resumirUmaComIA(ui, true));
	usarTrecho.addEventListener("click", () => {
		resumo.textContent = T.colapsar(trecho.value);
		seloIA.hidden = true;
	});
	resumo.addEventListener("input", () => (seloIA.hidden = true));
	return ui;
}

function estadoPeca(ui, texto, erro) {
	ui.estado.textContent = texto;
	ui.estado.classList.toggle("erro", !!erro);
}

async function extrair(ui, forcar) {
	if (ui.extraindo) return ui.extraindo;
	if (ui.texto && !forcar) return;
	const d = (ui.peca.docs || [])[Number(ui.seletor.value)];
	if (!d) {
		estadoPeca(ui, "Nenhum arquivo encontrado nesta movimentação — preencha o resumo manualmente.", true);
		return;
	}
	estadoPeca(ui, "Lendo o arquivo…");
	ui.extraindo = (async () => {
		try {
			const texto = await textoDoArquivo(d.url);
			ui.texto = texto;
			if (T.colapsar(texto).length < 80) {
				estadoPeca(ui, "Documento sem texto (provavelmente digitalizado) — preencha o resumo manualmente.", true);
				ui.trecho.value = "";
				return;
			}
			if (ui.peca.tipo === "denuncia") {
				ui.denuncia = T.extrairDenuncia(texto);
				ui.trecho.value = ui.denuncia.trecho;
				if (!T.colapsar(ui.resumo.textContent)) ui.resumo.textContent = ui.denuncia.resumo;
				estadoPeca(ui, `Resumo pré-montado a partir da denúncia (${ui.denuncia.fatos.length} fato(s)) — revise.`);
			} else {
				ui.trecho.value = T.extrairTrechoPedidos(texto, ui.peca.tipo);
				estadoPeca(ui, "Trecho extraído — revise e escreva o resumo (ou use a IA).");
			}
		} catch (e) {
			estadoPeca(ui, "Não foi possível ler o arquivo: " + e.message, true);
		} finally {
			ui.extraindo = null;
		}
	})();
	return ui.extraindo;
}

async function resumirUmaComIA(ui, interativo) {
	const disp = await iaDisponibilidade();
	if (disp === "unavailable") {
		const msg = "A IA do Chrome não está disponível neste computador/versão do navegador — use o modo manual.";
		estadoPeca(ui, msg, true);
		if (interativo) alert(msg + "\n\nRequisitos: Chrome 138 ou superior, com o modelo Gemini Nano habilitado (ver README).");
		return false;
	}
	await extrair(ui);
	if (!T.colapsar(ui.trecho.value) && !ui.denuncia) return false;
	estadoPeca(ui, "Resumindo com a IA do navegador…");
	try {
		const texto = await resumirComIA(ui);
		ui.resumo.textContent = texto;
		ui.seloIA.hidden = false;
		estadoPeca(ui, "Resumo gerado pela IA do navegador — revise antes de imprimir.");
		return true;
	} catch (e) {
		estadoPeca(ui, "A IA não conseguiu resumir: " + e.message, true);
		return false;
	}
}

async function gerarResumos() {
	const botao = $("#gerar-resumos");
	botao.disabled = true;
	try {
		const modo = $("#modo").value;
		if (modo === "ia") {
			const disp = await iaDisponibilidade();
			if (disp === "unavailable") {
				mostrarAvisos(["A IA do Chrome não está disponível neste computador/versão — os trechos foram extraídos para preenchimento manual."]);
				$("#modo").value = "manual";
			}
		}
		const usarIA = $("#modo").value === "ia";
		for (let i = 0; i < pecasUI.length; i++) {
			const ui = pecasUI[i];
			if (!ui.incluir.checked) continue;
			status(`${usarIA ? "Resumindo" : "Lendo"} peça ${i + 1} de ${pecasUI.length}…`);
			await extrair(ui);
			if (usarIA) await resumirUmaComIA(ui, false);
		}
		status("Pronto. Revise o texto antes de imprimir.");
	} finally {
		botao.disabled = false;
	}
}

function mostrarAvisos(lista) {
	const box = $("#avisos");
	const itens = (lista || []).filter(Boolean);
	if (!itens.length) return;
	let ul = box.querySelector("ul");
	if (!ul) {
		box.append(el("strong", { text: "Atenção:" }));
		ul = el("ul");
		box.append(ul);
	}
	itens.forEach((a) => ul.append(el("li", { text: a })));
	box.hidden = false;
}

async function montar() {
	const folha = $("#folha");
	folha.textContent = "";

	const servidor = (await chrome.storage.local.get(SERVIDOR_KEY))[SERVIDOR_KEY] || {};

	folha.append(
		el(
			"div",
			{ class: "cabecalho", contenteditable: "true" },
			el("div", { text: "PODER JUDICIÁRIO" }),
			el("div", { text: "TRIBUNAL DE JUSTIÇA DO ESTADO DO PARANÁ" }),
			el("div", { class: "juizo" }, valorOuPendente(dados.juizo))
		),
		el("h1", { class: "titulo", contenteditable: "true", text: "CERTIDÃO NARRATIVA" }),
		paragrafoPrincipal()
	);

	pecasUI = [];
	if (dados.pecas && dados.pecas.length) {
		const secao = el("section", { id: "pecas" });
		secao.append(
			el("p", { contenteditable: "true", text: "Certifica, também, que as peças principais do processo apresentam, em síntese, o seguinte conteúdo:" })
		);
		dados.pecas.forEach((peca, i) => {
			const ui = blocoPeca(peca, i);
			pecasUI.push(ui);
			secao.append(ui.raiz);
		});
		folha.append(secao);
	}

	folha.append(paragrafoFinal());

	const local = el("p", { class: "fecho", contenteditable: "true" });
	local.append((servidor.local || dados.comarca || PLACEHOLDER) + ", " + dataPorExtensoHoje() + ".");
	const nome = el("div", { contenteditable: "true", "data-campo": "nome", text: servidor.nome || "" });
	const cargo = el("div", { contenteditable: "true", "data-campo": "cargo", text: servidor.cargo || "" });
	if (!servidor.nome) nome.append(el("span", { class: "pendente", text: "[nome do(a) servidor(a)]" }));
	if (!servidor.cargo) cargo.append(el("span", { class: "pendente", text: "[cargo]" }));
	folha.append(local, el("div", { class: "assinatura" }, nome, cargo));

	// Lembra nome, cargo e local para as próximas certidões.
	const salvarServidor = () => {
		const valor = {
			nome: T.colapsar(nome.textContent).replace(/^\[.*\]$/, ""),
			cargo: T.colapsar(cargo.textContent).replace(/^\[.*\]$/, ""),
			local: T.colapsar(local.textContent).replace(/,.*$/, "").replace(/^\[.*\]$/, ""),
		};
		chrome.storage.local.set({ [SERVIDOR_KEY]: valor });
	};
	[nome, cargo, local].forEach((n) => n.addEventListener("blur", salvarServidor));
}

// Só o parágrafo dos eventos é refeito quando as opções mudam.
function refazerParagrafoPrincipal() {
	const atual = $("#texto-principal");
	if (atual) atual.replaceWith(paragrafoPrincipal());
}

function textoParaCopiar() {
	const clone = $("#folha").cloneNode(true);
	clone.querySelectorAll(".apoio, .peca.excluida").forEach((n) => n.remove());
	const blocos = [];
	clone.querySelectorAll(".cabecalho > div, h1, p, .assinatura > div").forEach((n) => {
		const t = T.colapsar(n.textContent);
		if (t) blocos.push(t);
	});
	return blocos.join("\n\n");
}

async function iniciar() {
	const id = new URLSearchParams(location.search).get("id");
	const chave = "pdpCertidao:" + id;
	dados = id ? (await chrome.storage.local.get(chave))[chave] : null;
	if (!dados) {
		$("#folha").textContent = "Os dados desta certidão não foram encontrados (expiram após algumas horas). Clique de novo em \"📜 Certidão\" na tela do processo.";
		return;
	}
	document.title = "Certidão narrativa — " + (dados.numero || "processo");

	const guardadas = (await chrome.storage.local.get(OPCOES_KEY))[OPCOES_KEY];
	if (guardadas) opcoes = Object.assign(opcoes, guardadas);
	$("#opt-usuario").checked = opcoes.usuario;
	$("#opt-invalidos").checked = opcoes.invalidos;
	$("#opt-seq").checked = opcoes.seq;
	[["#opt-usuario", "usuario"], ["#opt-invalidos", "invalidos"], ["#opt-seq", "seq"]].forEach(([sel, chaveOpcao]) => {
		$(sel).addEventListener("change", () => {
			opcoes[chaveOpcao] = $(sel).checked;
			chrome.storage.local.set({ [OPCOES_KEY]: opcoes });
			refazerParagrafoPrincipal();
		});
	});

	const { certidaoModo } = await chrome.storage.sync.get("certidaoModo");
	$("#modo").value = certidaoModo === "ia" ? "ia" : "manual";
	$("#modo").addEventListener("change", () => chrome.storage.sync.set({ certidaoModo: $("#modo").value }));

	mostrarAvisos(dados.avisos);
	await montar();

	$("#gerar-resumos").addEventListener("click", gerarResumos);
	$("#imprimir").addEventListener("click", () => window.print());
	$("#copiar").addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(textoParaCopiar());
			status("Texto copiado.");
		} catch (e) {
			status("Não foi possível copiar: " + e.message);
		}
	});

	// Extrai os trechos já na abertura. No modo IA, só resume sozinho se o
	// modelo já estiver baixado (o download exige um clique do usuário).
	if (!pecasUI.length) return;
	if ($("#modo").value === "ia") {
		const disp = await iaDisponibilidade();
		if (disp === "unavailable") {
			// gerarResumos() avisa e segue no modo manual (sem mudar a preferência).
			await gerarResumos();
			return;
		}
		if (disp !== "available") {
			status("Extraindo os trechos das peças…");
			for (const ui of pecasUI) await extrair(ui);
			status('Clique em "✨ Gerar resumos" para resumir com a IA do navegador (na primeira vez, o Chrome baixa o modelo).');
			return;
		}
	}
	await gerarResumos();
}

iniciar().catch((e) => {
	console.error("[Certidão]", e);
	mostrarAvisos(["Erro ao montar a certidão: " + e.message]);
});
