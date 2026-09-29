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
const LIMITE_ENTRADA_IA = 9000;

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
let opcoes = { usuario: false, invalidos: true, seq: true, formato: "lista", subitens: true, simples: true };

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
	const totalReal = pdf.numPages;
	await pdf.destroy();
	return { texto: partes.join("\n"), paginas: partes, totalPaginas: totalReal };
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

// Texto integral do arquivo para o quadro ① (conferência do resumo), com
// a marcação de cada página. O carimbo de assinatura digital, repetido em
// todas as páginas, só aparece se "mostrar carimbos" estiver marcado.
function textoIntegral(arquivo, comCarimbo) {
	const n = arquivo.paginas.length;
	const partes = arquivo.paginas.map((p, i) => {
		const conteudo = (comCarimbo ? p : T.limparAssinaturas(p)).replace(/[ \t]+/g, " ").replace(/\n[ \t]*(?=\n)/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
		return n > 1 ? `──────── Página ${i + 1} de ${arquivo.totalPaginas} ────────\n${conteudo}` : conteudo;
	});
	if (arquivo.totalPaginas > n) partes.push(`──────── (páginas ${n + 1} a ${arquivo.totalPaginas} não foram lidas — abra o arquivo) ────────`);
	return partes.join("\n\n");
}

// Seleciona, no texto integral, o trecho que a extensão usou (pedidos,
// dispositivo, fatos): procura as primeiras palavras do trecho, tolerando
// diferenças de espaços e quebras de linha.
function localizarNoIntegral(ui) {
	// Na denúncia, a 1ª linha do trecho é o título montado pela extensão
	// ("Fato único (31/12/2023)"), que não existe no arquivo.
	let alvo = String(ui.relevante || "");
	if (/^Fato [^\n]*\n/.test(alvo)) alvo = alvo.replace(/^Fato [^\n]*\n/, "");
	const palavras = T.colapsar(alvo).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
	if (!palavras.length) return false;
	const texto = ui.trecho.value;
	for (let n = Math.min(palavras.length, 10); n >= 3; n--) {
		const re = new RegExp(palavras.slice(0, n).join("[^\\p{L}\\p{N}]+"), "iu");
		const m = re.exec(texto);
		if (!m) continue;
		const fim = Math.min(texto.length, m.index + Math.max(m[0].length, T.colapsar(alvo).length + 40));
		ui.trecho.focus();
		ui.trecho.setSelectionRange(m.index, fim);
		// Rola até a seleção (o textarea não faz isso sozinho com setSelectionRange).
		const antes = texto.slice(0, m.index).split("\n").length;
		const altura = parseFloat(getComputedStyle(ui.trecho).lineHeight) || 17;
		ui.trecho.scrollTop = Math.max(0, (antes - 2) * altura);
		return true;
	}
	return false;
}

async function textoDoArquivo(url) {
	const { bytes, contentType } = await baixarArquivo(url);
	const cabeca = new TextDecoder("latin1").decode(bytes.slice(0, 5));
	if (cabeca === "%PDF-" || /pdf/i.test(contentType)) return textoDoPdf(bytes);
	if (/html|text/i.test(contentType) || /^\s*</.test(new TextDecoder("latin1").decode(bytes.slice(0, 200)))) {
		const texto = textoDoHtml(bytes, contentType);
		return { texto, paginas: [texto], totalPaginas: 1 };
	}
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
let iaEstado = "verificando"; // available | downloadable | downloading | unavailable | verificando

const IA_ROTULOS = {
	verificando: { classe: "ia-verificando", texto: "IA: verificando…" },
	available: { classe: "ia-ok", texto: "✅ IA: Chrome (local)" },
	downloadable: { classe: "ia-baixar", texto: "⬇️ IA: Chrome — modelo será baixado no 1º uso" },
	downloading: { classe: "ia-baixar", texto: "⏳ IA: Chrome — baixando o modelo…" },
	unavailable: { classe: "ia-nao", texto: "⛔ IA do Chrome indisponível — clique para ver o motivo" },
};

// Mostra, na barra, se a IA pode ser usada; desativa a opção e os botões
// "Resumir com IA" quando não pode.
function mostrarEstadoIA(estado, detalhe) {
	iaEstado = estado;
	const r = IA_ROTULOS[estado] || IA_ROTULOS.verificando;
	const nomeIA = usandoClaude() ? "Claude (" + claudeModelo().nome + ")" : "IA do Chrome";
	const badge = $("#ia-status");
	if (badge) {
		badge.className = "ia-status " + r.classe;
		let texto = detalhe || r.texto;
		if (usandoClaude() && !detalhe) {
			texto = estado === "available" ? "✅ IA: " + claudeModelo().nome : estado === "unavailable" ? "⛔ Claude sem chave — clique para configurar" : texto;
		}
		badge.textContent = texto;
		badge.title = estado === "unavailable" ? (usandoClaude() ? "Clique para informar a chave" : "Clique para ver o diagnóstico") : "";
	}
	const opcaoIA = document.querySelector('#modo option[value="ia"]');
	if (opcaoIA) {
		opcaoIA.disabled = estado === "unavailable";
		opcaoIA.textContent = "IA — " + nomeIA + (estado === "unavailable" ? " (indisponível)" : "");
	}
	if (estado === "unavailable" && $("#modo").value === "ia") $("#modo").value = "manual";
	pecasUI.forEach(atualizarBotaoIA);
	const botaoSimplesIA = $("#simples-ia");
	if (botaoSimplesIA) {
		botaoSimplesIA.disabled = estado === "unavailable";
		botaoSimplesIA.title = estado === "unavailable" ? "A IA escolhida não está disponível (veja o selo na barra)" : "Reescrever o resumo com a IA escolhida";
	}
}

function atualizarBotaoIA(ui) {
	if (!ui.botaoIA) return;
	ui.botaoIA.disabled = iaEstado === "unavailable";
	ui.botaoIA.title = iaEstado === "unavailable" ? "A IA escolhida não está disponível (veja o selo na barra)" : "Resumir esta peça com a IA escolhida";
}

async function verificarIA() {
	mostrarEstadoIA("verificando");
	mostrarEstadoIA(await iaDisponibilidade());
	return iaEstado;
}

// Combinações testadas, nesta ordem: português declarado; sem declarar
// idioma; inglês declarado (algumas versões só aceitam en/es/ja nas
// opções, mas respondem em português quando o prompt pede).
const IA_TENTATIVAS = [
	{ nome: "português (pt)", opcoes: OPCOES_IA_PT },
	{ nome: "sem idioma declarado", opcoes: {} },
	{ nome: "inglês (en)", opcoes: { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] } },
];

async function iaDisponibilidade() {
	if (usandoClaude()) return iaConfig.chave ? "available" : "unavailable";
	if (!("LanguageModel" in self)) return "unavailable";
	for (const t of IA_TENTATIVAS) {
		try {
			const disp = await self.LanguageModel.availability(t.opcoes);
			if (disp !== "unavailable") {
				iaOpcoes = t.opcoes;
				return disp;
			}
		} catch (e) {
			/* combinação não aceita nesta versão: tenta a próxima */
		}
	}
	return "unavailable";
}

// Texto de diagnóstico, para o usuário saber POR QUE a IA não está
// disponível (ver README: "Como ativar a IA do Chrome").
async function iaDiagnostico() {
	const linhas = [];
	if (usandoClaude()) {
		linhas.push("IA escolhida: Claude (API da Anthropic), modelo " + claudeModelo().nome + " (" + claudeModelo().id + ").");
		linhas.push("Chave: " + chaveMascarada() + (iaConfig.chave ? "" : " — informe-a em ⚙️ Chave da API Claude."));
		linhas.push("Use “Testar conexão” no painel da chave para confirmar que ela funciona.");
		return linhas;
	}
	const versao = (/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1];
	linhas.push("Versão do Chrome: " + (versao || "não identificada"));
	if (!("LanguageModel" in self)) {
		linhas.push("A API LanguageModel NÃO existe neste navegador (Chrome anterior ao 138, Edge/outro navegador, ou recurso desativado por política).");
		return linhas;
	}
	linhas.push("API LanguageModel: presente.");
	for (const t of IA_TENTATIVAS) {
		let r;
		try {
			r = await self.LanguageModel.availability(t.opcoes);
		} catch (e) {
			r = "erro: " + e.message;
		}
		linhas.push("Disponibilidade (" + t.nome + "): " + r);
	}
	linhas.push(
		"Significados: available = pronto; downloadable = o modelo será baixado no 1º uso (clique em Gerar resumos); " +
			"downloading = baixando; unavailable = o Chrome considera este computador/configuração inelegível. " +
			"Veja o motivo exato em chrome://on-device-internals (aba Model Status)."
	);
	return linhas;
}

async function iaSessaoBase() {
	if (iaBase) return iaBase;
	iaBase = await self.LanguageModel.create({
		...iaOpcoes,
		initialPrompts: [{ role: "system", content: SISTEMA_IA }],
		monitor(m) {
			m.addEventListener("downloadprogress", (e) => {
				const pct = Math.round((e.loaded || 0) * 100);
				status("Baixando o modelo de IA do Chrome: " + pct + "%");
				mostrarEstadoIA("downloading", "⏳ IA do Chrome: baixando o modelo… " + pct + "%");
			});
		},
	});
	mostrarEstadoIA("available");
	return iaBase;
}

// ---------------------------------------------------------------------
// Provedor de IA: Chrome (local) ou Claude (API da Anthropic, chave própria)
// ---------------------------------------------------------------------
//
// A extensão não tem etapa de build (é carregada direto no Chrome), por
// isso a API da Anthropic é chamada por HTTP (fetch), sem o SDK.
// Modelo: o mais barato disponível (Claude Haiku 4.5). A chave fica só no
// armazenamento local da extensão (chrome.storage.local), neste navegador.

const IA_CONFIG_KEY = "pdpCertidaoIA";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
// Modelos oferecidos. O padrão é o mais barato; Sonnet e Opus são mais
// precisos (e mais caros). Preços por milhão de tokens (entrada / saída).
const CLAUDE_MODELOS = [
	{ id: "claude-haiku-4-5", nome: "Claude Haiku 4.5", descricao: "mais barato (US$ 1 / US$ 5)" },
	{ id: "claude-sonnet-5-5", nome: "Claude Sonnet 5.5", descricao: "equilibrado (US$ 2 / US$ 10)", raciocinio: true },
	{ id: "claude-opus-5-5", nome: "Claude Opus 5.5", descricao: "mais preciso (US$ 4 / US$ 20)", raciocinio: true },
];
function claudeModelo() {
	return CLAUDE_MODELOS.find((m) => m.id === iaConfig.modelo) || CLAUDE_MODELOS[0];
}
const LIMITE_ENTRADA_CLAUDE = 120000; // caracteres (~30 mil tokens), bem abaixo do contexto do modelo

let iaConfig = { provedor: "chrome", chave: "", modelo: "claude-haiku-4-5", avisoAceito: false };
let sigiloConfirmado = false;

// "o Claude (Claude Haiku 4.5)" ou "a IA do navegador (Chrome)"
function nomeIAAtual() {
	return usandoClaude() ? "o Claude (" + claudeModelo().nome + ")" : "a IA do navegador (Chrome)";
}

// "pelo Claude (Claude Haiku 4.5)" ou "pela IA do navegador (Chrome)"
function porIAAtual() {
	return usandoClaude() ? "pelo Claude (" + claudeModelo().nome + ")" : "pela IA do navegador (Chrome)";
}

// Só TEXTO vai para a IA (nunca o PDF): espaços e quebras de linha
// repetidos são compactados para gastar menos tokens de entrada.
function compactarParaIA(texto) {
	return String(texto || "")
		.replace(/[ \t\u00a0]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{2,}/g, "\n")
		.trim();
}

let ultimoEnvioIA = 0; // caracteres enviados na última chamada

function usandoClaude() {
	return iaConfig.provedor === "claude";
}

function limiteEntradaIA() {
	return usandoClaude() ? LIMITE_ENTRADA_CLAUDE : LIMITE_ENTRADA_IA;
}

async function carregarConfigIA() {
	try {
		const salvo = (await chrome.storage.local.get(IA_CONFIG_KEY))[IA_CONFIG_KEY];
		if (salvo) iaConfig = Object.assign(iaConfig, salvo);
		// A IA local (Chrome) é SEMPRE a padrão ao abrir a certidão: o Claude
		// precisa ser escolhido manualmente a cada vez (a chave e o modelo
		// continuam salvos).
		iaConfig.provedor = "chrome";
	} catch (e) {
		/* segue com o padrão */
	}
}

// Guarda chave, modelo e aceite do aviso — nunca a escolha do provedor.
function salvarConfigIA() {
	const { provedor, ...resto } = iaConfig;
	return chrome.storage.local.set({ [IA_CONFIG_KEY]: resto });
}

function chaveMascarada() {
	const c = iaConfig.chave || "";
	return c ? c.slice(0, 7) + "…" + c.slice(-4) : "(não informada)";
}

function mensagemErroClaude(status, corpo) {
	const detalhe = corpo && corpo.error && corpo.error.message ? " (" + corpo.error.message + ")" : "";
	switch (status) {
		case 400: return "requisição recusada pela API" + detalhe;
		case 401: return "chave da API inválida ou revogada — confira em ⚙️ Chave da API Claude";
		case 402: return "problema de cobrança na conta da Anthropic (sem créditos?)" + detalhe;
		case 403: return "a chave não tem permissão para este uso" + detalhe;
		case 404: return "modelo " + claudeModelo().id + " não disponível para esta conta" + detalhe;
		case 413: return "o texto enviado é grande demais";
		case 429: return "limite de uso da API atingido — tente de novo em instantes";
		case 529: return "a API da Anthropic está sobrecarregada — tente de novo em instantes";
		default: return "erro " + status + " na API da Anthropic" + detalhe;
	}
}

// Uma chamada à API (Messages). Tenta de novo, até 2 vezes, nos erros
// temporários (429, 5xx, 529 e falha de rede).
async function claudeGerar(prompt, maxTokens) {
	if (!iaConfig.chave) throw new Error("informe a chave da API Claude em ⚙️ Chave da API Claude");
	let ultimoErro;
	for (let tentativa = 0; tentativa < 3; tentativa++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 120000);
		let resp;
		const modelo = claudeModelo();
		const headers = {
			"content-type": "application/json",
			"x-api-key": iaConfig.chave,
			"anthropic-version": "2023-06-01",
			// Necessário para chamar a API direto de uma página de navegador/extensão.
			"anthropic-dangerous-direct-browser-access": "true",
		};
		const corpoReq = {
			model: modelo.id,
			max_tokens: maxTokens || 2000,
			system: SISTEMA_IA,
			messages: [{ role: "user", content: prompt }], // texto puro, sem anexos
		};
		if (modelo.raciocinio) {
			// Sonnet 5.5 / Opus 5.5 raciocinam antes de responder (e isso conta
			// em max_tokens): esforço baixo basta para resumir, e sobra espaço
			// para a resposta. Se o modelo recusar, a API tenta outro modelo.
			corpoReq.max_tokens = Math.max(8000, (maxTokens || 2000) * 4);
			corpoReq.output_config = { effort: "low" };
			corpoReq.fallbacks = "default";
			headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
		}
		try {
			resp = await fetch(CLAUDE_URL, {
				method: "POST",
				signal: controller.signal,
				headers,
				body: JSON.stringify(corpoReq),
			});
		} catch (e) {
			ultimoErro = new Error(e.name === "AbortError" ? "a API da Anthropic não respondeu a tempo" : "falha de conexão com a API da Anthropic (" + e.message + ")");
			await new Promise((r) => setTimeout(r, 1500 * (tentativa + 1)));
			continue;
		} finally {
			clearTimeout(timer);
		}
		const corpo = await resp.json().catch(() => null);
		if (resp.ok) {
			if (corpo && corpo.stop_reason === "refusal") throw new Error("o modelo recusou a solicitação");
			const texto = ((corpo && corpo.content) || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
			if (!texto) throw new Error("a API não devolveu texto");
			if (corpo.stop_reason === "max_tokens") return texto + " […]";
			return texto;
		}
		ultimoErro = new Error(mensagemErroClaude(resp.status, corpo));
		if (resp.status === 429 || resp.status >= 500) {
			const espera = Math.min(20, parseFloat(resp.headers.get("retry-after")) || 2 * (tentativa + 1));
			await new Promise((r) => setTimeout(r, espera * 1000));
			continue;
		}
		throw ultimoErro;
	}
	throw ultimoErro;
}

// Antes de enviar texto do processo à Anthropic: aviso (uma vez) e, se o
// processo tiver sigilo, confirmação (uma vez por janela).
function confirmarEnvioClaude() {
	if (!usandoClaude()) return true;
	if (!iaConfig.avisoAceito) {
		const ok = confirm(
			"Com o Claude, o texto das peças deste processo é enviado à Anthropic (empresa dos EUA) para processamento.\n\n" +
				"Use somente se permitido pelas normas do Tribunal, observando a LGPD e o segredo de justiça.\n\nContinuar?"
		);
		if (!ok) return false;
		iaConfig.avisoAceito = true;
		salvarConfigIA();
	}
	const sigilo = T.normalizar(dados.sigilo || "");
	if (sigilo && !/publico|sem sigilo|nenhum|nivel 0/.test(sigilo) && !sigiloConfirmado) {
		if (!confirm("Este processo tem nível de sigilo “" + dados.sigilo + "”. Enviar o texto das peças à Anthropic mesmo assim?")) return false;
		sigiloConfirmado = true;
	}
	return true;
}

// Ponto único de geração de texto, qualquer que seja o provedor.
async function iaGerar(prompt, maxTokens) {
	prompt = compactarParaIA(prompt);
	ultimoEnvioIA = prompt.length;
	if (usandoClaude()) {
		if (!confirmarEnvioClaude()) throw new Error("envio ao Claude cancelado");
		return claudeGerar(prompt, maxTokens);
	}
	const base = await iaSessaoBase();
	const sessao = await base.clone();
	try {
		return await sessao.prompt(prompt);
	} finally {
		sessao.destroy();
	}
}

// Painel "⚙️ Chave da API Claude" na barra.
function prepararPainelClaude() {
	const painel = $("#painel-claude");
	const campo = $("#claude-chave");
	const estado = $("#claude-estado");
	const atualizar = () => {
		estado.textContent = iaConfig.chave ? "Chave salva neste navegador: " + chaveMascarada() : "Nenhuma chave salva.";
	};
	// Painel "⚙️ Configurações" (escondido por padrão).
	const config = $("#painel-config");
	const toggle = $("#config-toggle");
	window.abrirConfiguracoes = (abrir) => {
		config.hidden = abrir === undefined ? !config.hidden : !abrir;
		toggle.setAttribute("aria-expanded", String(!config.hidden));
		toggle.classList.toggle("ativo", !config.hidden);
	};
	toggle.addEventListener("click", () => window.abrirConfiguracoes());
	// Modelo do Claude
	const selModelo = $("#claude-modelo");
	CLAUDE_MODELOS.forEach((m) => selModelo.append(el("option", { value: m.id, text: m.nome + " — " + m.descricao })));
	selModelo.value = claudeModelo().id;
	selModelo.addEventListener("change", async () => {
		iaConfig.modelo = selModelo.value;
		await salvarConfigIA();
		verificarIA();
	});
	painel.hidden = !usandoClaude();
	$("#claude-mostrar").addEventListener("click", () => (campo.type = campo.type === "password" ? "text" : "password"));
	$("#claude-salvar").addEventListener("click", async () => {
		const chave = campo.value.trim();
		if (!/^sk-ant-[\w-]{20,}$/.test(chave)) {
			estado.textContent = "A chave deve começar com “sk-ant-”. Confira e cole de novo.";
			return;
		}
		iaConfig.chave = chave;
		await salvarConfigIA();
		campo.value = "";
		atualizar();
		if (usandoClaude()) verificarIA();
	});
	$("#claude-apagar").addEventListener("click", async () => {
		if (!confirm("Apagar a chave da API Claude salva neste navegador?")) return;
		iaConfig.chave = "";
		await salvarConfigIA();
		atualizar();
		if (usandoClaude()) verificarIA();
	});
	$("#claude-testar").addEventListener("click", async () => {
		estado.textContent = "Testando a conexão…";
		try {
			const r = await claudeGerar("Responda apenas: OK", 10);
			estado.textContent = "Conexão OK (" + claudeModelo().nome + " respondeu: " + T.colapsar(r).slice(0, 20) + "). Chave: " + chaveMascarada();
		} catch (e) {
			estado.textContent = "Falhou: " + e.message;
		}
	});
	const sel = $("#ia-provedor");
	sel.value = usandoClaude() ? "claude" : "chrome";
	sel.addEventListener("change", async () => {
		iaConfig.provedor = sel.value;
		await salvarConfigIA();
		painel.hidden = !usandoClaude();
		atualizar();
		verificarIA();
	});
}

// Prompts por tipo de peça. A IA recebe o texto já limpo (sem o carimbo
// de assinatura) e, na denúncia, os fatos NA ÍNTEGRA, separados por fato,
// e os artigos da imputação já isolados.
// Regras comuns aos resumos de peças das partes: objetivo e IMPARCIAL,
// sempre atribuindo as afirmações a quem as fez.
const IMPARCIAL =
	" Seja objetivo e imparcial: atribua cada afirmação à parte que a fez ('a autora alega que…', 'segundo a defesa…'), " +
	"sem adjetivos, sem juízo de valor e sem tomar partido. Não repita a qualificação das partes nem citações de lei e de jurisprudência.";

const INSTRUCOES_IA = {
	inicial:
		"Resuma a petição inicial abaixo em dois parágrafos curtos: (1) FATOS — o que a parte autora narra que aconteceu " +
		"(quem, quando, o quê), em até 3 frases; (2) PEDIDOS — o que ela pede ao juiz (condenação a pagar valores, obrigação " +
		"de fazer, tutela de urgência, gratuidade etc.), com os valores quando houver, começando por 'Pede'." + IMPARCIAL,
	contestacao:
		"Resuma a contestação abaixo em dois parágrafos curtos: (1) FATOS E DEFESA — a versão dos fatos apresentada pela parte ré " +
		"e as preliminares e teses de mérito, em até 3 frases; (2) PEDIDOS — o que ela pede (improcedência, extinção, " +
		"acolhimento de preliminar, pedido contraposto etc.), começando por 'Pede'." + IMPARCIAL,
	resposta:
		"Resuma a resposta à acusação abaixo em dois parágrafos curtos: (1) FATOS E DEFESA — a versão da defesa sobre os fatos e as " +
		"preliminares ou nulidades alegadas, em até 3 frases (se a defesa apenas se reservar para discutir o mérito depois, diga isso); " +
		"(2) PEDIDOS — absolvição sumária, rejeição da denúncia (com o fundamento) e requerimentos de prova (testemunhas, diligências)." + IMPARCIAL,
	sentencaCriminal:
		"Resuma a sentença criminal abaixo para uma certidão, em linhas curtas, trazendo SOMENTE os itens que existirem no texto, " +
		"nesta ordem: (a) quem foi absolvido e quem foi condenado (nomes); (b) a pena definitiva aplicada a cada condenado, com a " +
		"espécie (reclusão/detenção), os dias-multa e o regime inicial; (c) se houve substituição da pena privativa de liberdade ou " +
		"suspensão condicional da pena, e em que termos; (d) se houve condenação ao pagamento de indenização por danos materiais ou " +
		"morais à vítima, com o valor; (e) se houve condenação ao pagamento de honorários ao advogado dativo, com o nome do advogado, " +
		"a OAB, o valor fixado e o item da tabela. Se algum desses itens não existir na sentença, NÃO o mencione (não escreva " +
		"'não houve' nem 'não consta'). Não inclua fundamentação, relatório, dosimetria intermediária nem dados de assinatura.",
	decisao:
		"Resuma em no máximo 3 frases objetivas o que foi decidido na decisão abaixo (o que foi deferido ou indeferido e as determinações).",
	outra:
		"Resuma a peça abaixo em até 2 parágrafos curtos: os fatos ou fundamentos apresentados e o que se pede (ou o que se decide)." + IMPARCIAL,
	recurso:
		"Resuma o recurso abaixo em dois parágrafos curtos: (1) quem recorre (se constar), qual decisão é atacada e os principais " +
		"argumentos, em até 3 frases; (2) PEDIDOS — o que se pede ao tribunal (reforma, anulação, redução de pena etc.)." + IMPARCIAL,
};

function promptPara(ui) {
	const delimitar = (t) => '"""\n' + t + '\n"""';
	if (ui.peca.tipo === "denuncia" && ui.denuncia && ui.denuncia.fatos.length) {
		const d = ui.denuncia;
		const partes = [];
		if (d.denunciados.length) partes.push("DENUNCIADO(S): " + d.denunciados.join(", "));
		d.fatos.forEach((f) => partes.push(T.tituloDoFato(f).toUpperCase() + " — NARRATIVA INTEGRAL:\n" + delimitar(f.texto)));
		const artigos = T.artigosImputacao(d.capitulacao);
		partes.push("ARTIGOS DA IMPUTAÇÃO (copie exatamente): " + (artigos || "não identificados — extraia do texto da capitulação: " + d.capitulacao));
		return (
			"A seguir estão os fatos narrados numa denúncia criminal, cada um na íntegra. Escreva o resumo para uma certidão, assim:\n" +
			"- uma linha por fato, começando por 'Fato N – <crime> (<data>):' (use 'Fato único' se houver só um);\n" +
			"- em cada linha, 1 ou 2 frases objetivas dizendo QUANDO (data e hora), ONDE (só o tipo de local e o município, sem endereço), " +
			"QUEM (o denunciado), O QUE FEZ (a conduta, com o meio empregado) e CONTRA QUEM (a vítima pelas iniciais, como no original), " +
			"e o resultado, se houver;\n" +
			"- não use fórmulas como 'dolosamente, ciente da ilicitude', não cite provas, movimentos do processo nem assinaturas;\n" +
			"- na última linha, escreva 'Imputação:' seguido APENAS dos artigos de lei informados.\n\n" +
			partes.join("\n\n")
		);
	}
	const chave = ui.peca.tipo === "sentenca" && dados.criminal ? "sentencaCriminal" : ui.peca.tipo;
	const instrucao = INSTRUCOES_IA[chave] || INSTRUCOES_IA.outra;
	// Trecho curto (título não encontrado, peça atípica): manda também o
	// final do texto, onde costumam estar os pedidos ou o dispositivo.
	let base = ui.relevante || "";
	if (usandoClaude() && ui.texto) {
		// O Claude comporta a peça inteira: vai o texto integral (sem o
		// carimbo de assinatura), para um resumo mais completo.
		base = T.limparAssinaturas(ui.texto).slice(0, LIMITE_ENTRADA_CLAUDE - 4000);
	} else if (ui.texto && ["inicial", "contestacao", "resposta", "recurso", "outra"].includes(ui.peca.tipo)) {
		// IA do Chrome (janela pequena): o começo da peça, onde ficam os
		// fatos, e o trecho dos pedidos.
		const limpo = T.limparAssinaturas(ui.texto);
		const inicio = limpo.slice(0, 3500);
		const pedidos = T.colapsar(base).length >= 200 ? base.slice(0, 3500) : limpo.slice(-3500);
		base = inicio + "\n[…]\n" + pedidos;
	} else if (T.colapsar(base).length < 400 && ui.texto) {
		base = T.limparAssinaturas(ui.texto).slice(-4000);
	}
	return instrucao + "\n\nTexto:\n" + delimitar(base);
}

// Resposta da IA: sem markdown, espaços normalizados, mas mantendo as
// quebras de linha (um fato por linha na denúncia).
function limparRespostaIA(resposta) {
	return String(resposta || "")
		.replace(/\*\*|__|^#+\s*/gm, "")
		.replace(/^\s*[-•*]\s*/gm, "")
		.split("\n")
		.map((l) => l.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}

async function resumirComIA(ui) {
	let prompt = promptPara(ui);
	if (prompt.length > limiteEntradaIA()) prompt = prompt.slice(0, limiteEntradaIA());
	for (let tentativa = 0; tentativa < 3; tentativa++) {
		try {
			return limparRespostaIA(await iaGerar(prompt, 1500));
		} catch (e) {
			// A IA do Chrome tem janela pequena: reduz o texto e tenta de novo.
			if (!usandoClaude() && /quota|too large|context/i.test(e.name + " " + e.message) && prompt.length > 1500) {
				prompt = prompt.slice(0, Math.floor(prompt.length / 2));
				continue;
			}
			throw e;
		}
	}
	throw new Error("o trecho é grande demais para a IA escolhida");
}

// ---------------------------------------------------------------------
// Montagem da certidão
// ---------------------------------------------------------------------

// Quadro-resumo no início: número, classe, juízo, partes e advogados,
// assuntos, valor da causa. Cada valor é editável.
function quadroResumo() {
	const tabela = el("table", { class: "quadro" });
	const linha = (rotulo, ...valor) => {
		const tr = el("tr", {});
		const remover = el("button", {
			type: "button",
			class: "btn-remover-linha no-print",
			title: "Excluir a linha “" + rotulo + "” desta certidão",
			text: "✕",
			onclick: () => removerLinhaQuadro(tr),
		});
		tr.append(el("th", {}, el("span", { text: rotulo }), remover), el("td", { contenteditable: "true" }, ...valor));
		tabela.append(tr);
	};
	linha("Processo nº", valorOuPendente(dados.numero));
	linha("Classe processual", valorOuPendente(dados.classe));
	linha("Juízo", valorOuPendente(dados.juizo));
	if (dados.distribuicao) linha("Distribuição", dados.distribuicao);
	if (dados.polos && dados.polos.length) {
		dados.polos.forEach((polo) => {
			const celula = polo.partes.map((p) => {
				const bloco = el("div", { class: "parte" }, el("span", { class: "parte-nome", text: p.nome }));
				if (p.documento) bloco.append(" – " + p.documento);
				if (p.advogados && p.advogados.length) {
					bloco.append(el("div", { class: "advogados", text: (p.advogados.length > 1 ? "Advogados: " : "Advogado(a): ") + p.advogados.join("; ") }));
				}
				return bloco;
			});
			linha(polo.titulo, ...celula);
		});
	} else {
		linha("Partes", el("span", { class: "pendente", text: "[partes e advogados]" }));
	}
	linha("Assunto principal", valorOuPendente((dados.assuntos || [])[0] || ""));
	linha("Valor da causa", valorOuPendente(dados.valorCausa));
	// Processos relacionados (cabeçalho do processo). null = campo não
	// existe na tela; [] = existe, mas só com o próprio processo.
	const relacionados = (rotulo, itens, semItens) => {
		if (itens === undefined) return; // dados de versão anterior
		if (!itens || !itens.length) {
			if (semItens) linha(rotulo, semItens);
			return;
		}
		linha(rotulo, ...itens.map((t) => el("div", { class: "relacionado", text: t })));
	};
	relacionados("Apensamentos", dados.apensamentos, "Não há processos apensados.");
	relacionados("Vínculos", dados.vinculos, "Não há processos vinculados.");
	relacionados("Processos dependentes", dados.dependentes, "");
	return tabela;
}

// Agrupa as comunicações (intimação, citação, leitura, decurso de prazo,
// DJEN...) sob o evento a que se referem ("Referente ao evento (seq. N)").
// Devolve a lista já "achatada", na ordem de exibição, com o nível de
// recuo de cada item.
function arvoreEventos(movs) {
	const porSeq = new Map();
	const raizes = [];
	for (const m of movs) {
		const no = { m, nivel: 0, filhos: [], pai: null };
		const ref = opcoes.subitens ? T.referenciaEvento(m.complemento || m.evento) : "";
		const pai = ref && ref !== m.seq && T.ehComunicacao(m.titulo || m.evento) ? porSeq.get(ref) : null;
		if (pai) {
			no.nivel = Math.min(pai.nivel + 1, 3);
			no.pai = pai;
			pai.filhos.push(no);
		} else {
			raizes.push(no);
		}
		if (m.seq) porSeq.set(m.seq, no);
	}
	const plana = [];
	const visitar = (no) => {
		plana.push(no);
		no.filhos.forEach(visitar);
	};
	raizes.forEach(visitar);
	return plana;
}

function linhaEvento(no) {
	const m = no.m;
	const ehAudiencia = /\baudiencia/.test(T.normalizar(m.titulo || m.evento));
	const div = el("div", { class: "evento nivel-" + no.nivel + (m.invalido ? " invalidado" : "") + (ehAudiencia ? " ev-audiencia" : "") });
	if (no.nivel > 0) div.append(el("span", { class: "seta", text: "↳ " }));
	div.append(el("span", { class: "ev-data", text: m.dataHora || "[data]" }), " – ");
	const titulo = m.titulo || m.evento || "[evento]";
	div.append(el("span", { class: "ev-titulo", text: titulo }));
	let complemento = m.complemento || "";
	if (no.pai) {
		// No subitem, o recuo já mostra a que evento ele se refere: tira o
		// "Referente ao evento (seq. N) <nome do evento>" do complemento.
		complemento = complemento.replace(/^\s*refer[^\d]*\d+(?:\.\d+)?\s*\)?\s*[-–:]?\s*/i, "");
		const tituloPai = no.pai.m.titulo || "";
		if (tituloPai && complemento.toUpperCase().indexOf(tituloPai.toUpperCase()) === 0) complemento = complemento.slice(tituloPai.length);
		complemento = complemento.replace(/^\s*[-–]\s*/, "").trim();
	}
	if (complemento && complemento !== titulo) div.append(" – " + complemento);
	const extras = [];
	if (opcoes.seq && m.seq) extras.push("seq. " + m.seq);
	if (m.invalido) extras.push("invalidado");
	if (extras.length) div.append(" (" + extras.join(", ") + ")");
	if (opcoes.usuario && m.usuario) div.append(el("span", { class: "ev-usuario", text: " — " + m.usuario }));
	return div;
}

// Seção de audiências, em destaque: se há audiência designada (data
// futura) e o histórico de designações, redesignações, cancelamentos e
// realizações, a partir dos movimentos.
function secaoAudiencias() {
	const a = T.analisarAudiencias(dados.movimentos, Date.now());
	const sec = el("section", { id: "secao-audiencias" }, el("h2", { class: "subtitulo", text: "II – AUDIÊNCIAS" }));
	const caixa = el("div", { class: "audiencias", contenteditable: "true" });
	const descrever = (e) => {
		let s = e.tipo;
		if (e.dataAudiencia) s += " em " + e.dataAudiencia.replace(" ", " às ");
		if (e.seq) s += " (evento " + e.seq + ")";
		return s;
	};
	if (a.pendentes.length) {
		const p = el("p", { class: "aud-destaque aud-sim" }, el("strong", { text: a.pendentes.length > 1 ? "HÁ AUDIÊNCIAS DESIGNADAS: " : "HÁ AUDIÊNCIA DESIGNADA: " }));
		p.append(a.pendentes.map(descrever).join("; ") + ".");
		caixa.append(p);
	} else {
		caixa.append(el("p", { class: "aud-destaque aud-nao" }, el("strong", { text: "NÃO HÁ AUDIÊNCIA DESIGNADA" }), " (com data futura) nos registros do processo."));
	}
	if (a.eventos.length) {
		const c = a.contagem;
		const resumo = [
			c.designada + (c.designada === 1 ? " designação" : " designações"),
			c.redesignada + (c.redesignada === 1 ? " redesignação" : " redesignações"),
			c.cancelada + (c.cancelada === 1 ? " cancelamento" : " cancelamentos"),
			c.realizada + (c.realizada === 1 ? " realizada" : " realizadas"),
		];
		if (c["não realizada"]) resumo.push(c["não realizada"] + " não realizada(s)");
		caixa.append(el("p", { class: "aud-resumo", text: "Ocorrências no histórico: " + resumo.join(" · ") + "." }));
		caixa.append(el("p", { class: "aud-resumo", text: "Situação de cada audiência (último evento registrado):" }));
		a.finais.forEach((e) => {
			const linha = el("div", { class: "aud-item aud-" + e.situacao.replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "") });
			linha.append(el("span", { class: "ev-data", text: (e.dataHora || "").slice(0, 10) }), " – " + e.tipo + " – ");
			linha.append(el("span", { class: "aud-situacao", text: e.situacao.toUpperCase() + (e.semResultado ? " (sem registro de resultado)" : "") }));
			if (e.dataAudiencia) linha.append((e.situacao === "redesignada" ? " para " : " — data: ") + e.dataAudiencia.replace(" ", " às "));
			if (e.seq && opcoes.seq) linha.append(" (seq. " + e.seq + ")");
			caixa.append(linha);
		});
	} else {
		caixa.append(el("p", { class: "aud-resumo", text: "Não há registro de audiências (designadas, redesignadas, canceladas ou realizadas) nos movimentos do processo." }));
	}
	sec.append(caixa);
	return sec;
}

function movimentosVisiveis() {
	return dados.movimentos.filter((m) => opcoes.invalidos || !m.invalido);
}

function introEventos() {
	const p = el("p", { contenteditable: "true" });
	p.append(
		el("strong", { text: "CERTIFICO" }),
		", com base nos registros processuais eletrônicos do sistema " + dados.sistema + ", acessados em " + agoraFormatado() +
			", que no processo acima identificado constam os seguintes eventos, em ordem cronológica:"
	);
	return p;
}

// Formato "lista": um evento por linha, comunicações como subitens.
function listaEventos() {
	const caixa = el("div", { class: "eventos", contenteditable: "true" });
	const movs = movimentosVisiveis();
	if (!movs.length) caixa.append(el("span", { class: "pendente", text: "[nenhum movimento encontrado]" }));
	arvoreEventos(movs).forEach((no) => caixa.append(linhaEvento(no)));
	return caixa;
}

// Formato "corrido": parágrafo único no modelo da certidão do eproc.
function paragrafoCorrido() {
	const p = el("p", { contenteditable: "true" });
	p.append("O Tribunal de Justiça do Estado do Paraná, com base nos registros processuais eletrônicos do sistema " + dados.sistema + ", acessados em " + agoraFormatado() + ", ");
	p.append(el("strong", { text: "CERTIFICA" }));
	p.append(" que, sobre o(a) ");
	p.append(dados.classe ? document.createTextNode(dados.classe.toUpperCase()) : valorOuPendente(""));
	p.append(", processo nº ", valorOuPendente(dados.numero));
	if (dados.distribuicao) p.append(", distribuído em " + dados.distribuicao);
	p.append(", em trâmite no(a) ", valorOuPendente(dados.juizo));
	if (dados.polos && dados.polos.length) {
		p.append(", e no qual figuram, ");
		dados.polos.forEach((polo, i) => {
			if (i > 0) p.append(i === dados.polos.length - 1 ? " e, " : "; ");
			p.append(T.frasePolo(polo));
		});
	}
	p.append(", constam os seguintes eventos: ");
	const movs = movimentosVisiveis();
	movs.forEach((m, i) => {
		const mov = Object.assign({}, m, { seq: opcoes.seq ? m.seq : "" });
		let frase = T.fraseMovimento(mov);
		if (opcoes.usuario && m.usuario) frase += " — por " + m.usuario;
		p.append(frase + (i === movs.length - 1 ? "." : "; "));
	});
	if (!movs.length) p.append(el("span", { class: "pendente", text: "[nenhum movimento encontrado]" }), ".");
	p.append(" Certifica, ainda, que o assunto principal cadastrado é ");
	p.append(valorOuPendente((dados.assuntos || [])[0] || ""));
	p.append(". Certifica, por fim, que o valor da causa é de ", valorOuPendente(dados.valorCausa), ".");
	return p;
}

function secaoEventos() {
	const sec = el("section", { id: "secao-eventos" }, el("h2", { class: "subtitulo", text: "III – EVENTOS DO PROCESSO" }));
	if (opcoes.formato === "corrido") sec.append(paragrafoCorrido());
	else sec.append(introEventos(), listaEventos());
	return sec;
}

// Cartão de cada peça principal. Na tela:
//   cabeçalho (peça N de M, tipo, evento, data, incluir, arquivo)
//   ① Texto extraído do arquivo — referência, não sai na impressão
//   ② Resumo que vai para a certidão — exatamente o parágrafo impresso
// Na impressão só o parágrafo ② aparece.
function blocoPeca(peca, indice, total) {
	const titulo = `${peca.rotulo} (${peca.seq ? "evento " + peca.seq + ", " : ""}${dataDe(peca.dataHora) || "data não informada"})`;
	const resumo = el("span", {
		class: "resumo",
		contenteditable: "true",
		"data-placeholder": "[escreva aqui o resumo — ou use os botões do quadro ①]",
	});
	const paragrafo = el("p", { class: "peca-texto" }, el("strong", { text: titulo + ": " }), resumo);

	const incluir = el("input", { type: "checkbox", checked: true });
	const seletor = el("select", { title: "Arquivo usado para extrair o texto" });
	(peca.docs || []).forEach((d, i) => seletor.append(el("option", { value: String(i), text: d.nome || "Documento " + (i + 1) })));
	if (!(peca.docs || []).length) seletor.append(el("option", { value: "", text: "(nenhum arquivo encontrado)" }));
	const estado = el("span", { class: "estado", text: "" });
	const seloIA = el("span", { class: "selo-ia", hidden: true, text: "✨ Gerado pela IA — revise antes de imprimir" });
	const trecho = el("textarea", { spellcheck: "false", rows: "16", readonly: true, placeholder: "O texto integral do arquivo aparecerá aqui." });
	const infoTexto = el("span", { class: "peca-info-texto" });
	const carimbos = el("input", { type: "checkbox" });
	const localizar = el("button", { type: "button", text: "🔎 Localizar trecho relevante" });
	const abrir = el("button", { type: "button", text: "📄 Abrir arquivo" });
	const releer = el("button", { type: "button", text: "↻ Reextrair" });
	const botaoIA = el("button", { type: "button", class: "btn-ia", text: "✨ Resumir com IA" });
	const usarTrecho = el("button", { type: "button", text: "Copiar trecho relevante para o resumo ↓" });
	const usarIntegral = el("button", { type: "button", hidden: peca.tipo !== "denuncia", text: "Usar os fatos na íntegra ↓" });
	const usarObjetivo = el("button", { type: "button", hidden: peca.tipo !== "denuncia", text: "Usar resumo objetivo ↓" });

	const numero = el("span", { class: "peca-num", text: `Peça ${indice + 1} de ${total}` });
	const subir = el("button", { type: "button", class: "btn-ordem", title: "Subir esta peça (muda a ordem na certidão)", text: "▲" });
	const descer = el("button", { type: "button", class: "btn-ordem", title: "Descer esta peça (muda a ordem na certidão)", text: "▼" });
	const remover = el("button", { type: "button", class: "btn-ordem", title: "Remover esta peça da certidão", text: "✕" });
	const cabecalho = el(
		"div",
		{ class: "peca-cab no-print" },
		el(
			"div",
			{ class: "peca-cab-linha" },
			numero,
			el("span", { class: "peca-nome", text: peca.rotulo }),
			peca.manual ? el("span", { class: "peca-manual", text: "incluída manualmente" }) : null,
			el("span", { class: "peca-info", text: [peca.seq ? "evento " + peca.seq : "", dataDe(peca.dataHora)].filter(Boolean).join(" · ") }),
			el("span", { class: "barra-espaco" }),
			el("label", { class: "peca-incluir" }, incluir, " incluir na certidão"),
			el("span", { class: "peca-ordem" }, subir, descer, remover)
		),
		el("div", { class: "peca-cab-linha peca-evento", text: "Movimento: " + (peca.evento || "") }),
		el("div", { class: "peca-cab-linha" }, el("label", {}, "Arquivo: ", seletor), abrir, releer)
	);

	const referencia = el(
		"div",
		{ class: "peca-bloco peca-ref no-print" },
		el("div", { class: "peca-bloco-titulo" }, el("span", { class: "passo", text: "1" }), "Texto integral do arquivo ", el("em", { text: "(para conferir o resumo — não sai na impressão)" })),
		el("div", { class: "peca-acoes peca-acoes-topo" }, localizar, el("label", { title: "Mostrar o carimbo “Documento assinado digitalmente…” que o Projudi repete em cada página" }, carimbos, " mostrar carimbos de assinatura"), infoTexto),
		trecho,
		el("div", { class: "peca-acoes" }, usarTrecho, usarIntegral, usarObjetivo)
	);

	const saida = el(
		"div",
		{ class: "peca-bloco peca-saida" },
		el("div", { class: "peca-bloco-titulo no-print" }, el("span", { class: "passo", text: "2" }), "Resumo que vai para a certidão ", el("em", { text: "(editável — é este texto que sai impresso)" })),
		paragrafo,
		el("div", { class: "peca-acoes no-print" }, botaoIA, seloIA),
		el("div", { class: "peca-estado no-print" }, estado)
	);

	const raiz = el("div", { class: "peca" }, cabecalho, referencia, saida);
	const ui = { peca, raiz, resumo, trecho, estado, seletor, seloIA, incluir, indice, botaoIA, numero, subir, descer, infoTexto, carimbos, texto: "", relevante: "", denuncia: null };
	carimbos.addEventListener("change", () => {
		if (ui.arquivo) ui.trecho.value = textoIntegral(ui.arquivo, carimbos.checked);
	});
	localizar.addEventListener("click", () => {
		if (!localizarNoIntegral(ui)) alert("Não encontrei o trecho relevante no texto integral (ou a extensão não identificou um trecho para esta peça).");
	});
	subir.addEventListener("click", () => moverPeca(ui, -1));
	descer.addEventListener("click", () => moverPeca(ui, +1));
	remover.addEventListener("click", () => {
		if (confirm("Remover a peça \"" + peca.rotulo + "\" desta certidão?")) removerPeca(ui);
	});

	incluir.addEventListener("change", () => raiz.classList.toggle("excluida", !incluir.checked));
	abrir.addEventListener("click", () => {
		const d = (peca.docs || [])[Number(seletor.value)];
		if (d) window.open(d.url, "_blank", "noopener");
	});
	releer.addEventListener("click", () => extrair(ui, true));
	seletor.addEventListener("change", () => extrair(ui, true));
	botaoIA.addEventListener("click", () => resumirUmaComIA(ui, true));
	const definirResumo = (texto) => {
		resumo.textContent = texto;
		seloIA.hidden = true;
	};
	usarTrecho.addEventListener("click", () => definirResumo(T.colapsar(ui.relevante || "")));
	usarIntegral.addEventListener("click", () => {
		if (!ui.denuncia) return;
		const d = ui.denuncia;
		definirResumo((d.denunciados.length ? "Denúncia oferecida contra " + T.juntarLista(d.denunciados) + ".\n" : "") + T.fatosIntegrais(d));
	});
	usarObjetivo.addEventListener("click", () => ui.denuncia && definirResumo(ui.denuncia.resumo));
	resumo.addEventListener("input", () => (seloIA.hidden = true));
	atualizarBotaoIA(ui);
	return ui;
}

// ---------------------------------------------------------------------
// Peças: ordem e inclusão manual
// ---------------------------------------------------------------------

const TIPOS_MANUAIS = [
	["inicial", "Petição inicial"],
	["denuncia", "Denúncia"],
	["contestacao", "Contestação"],
	["resposta", "Resposta à acusação"],
	["sentenca", "Sentença"],
	["recurso", "Recurso"],
	["decisao", "Decisão"],
	["outra", "Outra peça (informar o nome)"],
];

// "Peça N de M" e os botões ▲/▼ refletem a ordem atual.
function renumerarPecas() {
	pecasUI.forEach((ui, i) => {
		ui.numero.textContent = `Peça ${i + 1} de ${pecasUI.length}`;
		ui.subir.disabled = i === 0;
		ui.descer.disabled = i === pecasUI.length - 1;
	});
	const vazio = $("#pecas-vazio");
	if (vazio) vazio.hidden = pecasUI.length > 0;
}

// Move a peça uma posição (delta -1 = sobe, +1 = desce), na tela e na
// impressão (a ordem do DOM é a ordem impressa).
function moverPeca(ui, delta) {
	const i = pecasUI.indexOf(ui);
	const j = i + delta;
	if (i < 0 || j < 0 || j >= pecasUI.length) return;
	const outro = pecasUI[j];
	if (delta < 0) outro.raiz.before(ui.raiz);
	else outro.raiz.after(ui.raiz);
	pecasUI[i] = outro;
	pecasUI[j] = ui;
	renumerarPecas();
	ui.raiz.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function removerPeca(ui) {
	const i = pecasUI.indexOf(ui);
	if (i < 0) return;
	pecasUI.splice(i, 1);
	ui.raiz.remove();
	renumerarPecas();
}

function descricaoMovimento(m) {
	return `seq. ${m.seq || "?"} – ${(m.dataHora || "").slice(0, 10)} – ${m.titulo || m.evento || ""}`;
}

// Formulário "+ Adicionar peça": tipo, movimento e arquivo. Os arquivos do
// movimento escolhido são carregados na aba do Projudi que gerou a
// certidão (pelo "+" da linha, como na coleta inicial).
function formularioNovaPeca() {
	const caixa = el("div", { class: "peca-nova no-print" });
	const abrir = el("button", { type: "button", class: "btn-nova-peca", text: "+ Adicionar peça" });
	const form = el("div", { class: "peca-nova-form", hidden: true });

	const tipo = el("select", {});
	TIPOS_MANUAIS.forEach(([v, r]) => tipo.append(el("option", { value: v, text: r })));
	const nomeOutra = el("input", { type: "text", placeholder: "Nome da peça (ex.: Alegações finais)", hidden: true });
	tipo.addEventListener("change", () => (nomeOutra.hidden = tipo.value !== "outra"));

	const comArquivos = dados.movimentos.filter((m) => m.temArquivos && !m.invalido);
	const lista = comArquivos.length ? comArquivos : dados.movimentos.filter((m) => !m.invalido);
	const movimento = el("select", {});
	movimento.append(el("option", { value: "", text: "— escolha o movimento —" }));
	lista
		.slice()
		.reverse() // mais recentes primeiro, como na tela do Projudi
		.forEach((m) => movimento.append(el("option", { value: String(dados.movimentos.indexOf(m)), text: descricaoMovimento(m) })));

	const arquivo = el("select", { disabled: true }, el("option", { value: "", text: "— escolha o movimento primeiro —" }));
	const estado = el("span", { class: "estado" });
	const adicionar = el("button", { type: "button", class: "primario", text: "Adicionar à certidão", disabled: true });
	const cancelar = el("button", { type: "button", text: "Cancelar" });
	let docsCarregados = [];

	movimento.addEventListener("change", async () => {
		docsCarregados = [];
		arquivo.textContent = "";
		arquivo.disabled = true;
		adicionar.disabled = true;
		const m = dados.movimentos[Number(movimento.value)];
		if (!m) return;
		estado.textContent = "Carregando os arquivos do movimento na tela do processo…";
		estado.classList.remove("erro");
		const r = await chrome.runtime
			.sendMessage({ source: "projudi-preview", type: "certidao-arquivos", id: dados.id, seq: m.seq, dataHora: m.dataHora })
			.catch((e) => ({ ok: false, error: e.message }));
		if (!r || !r.ok) {
			estado.textContent = (r && r.error) || "Não foi possível carregar os arquivos.";
			estado.classList.add("erro");
			return;
		}
		docsCarregados = (r.docs || []).map((d) => ({ nome: d.nome, url: d.url }));
		if (!docsCarregados.length) {
			arquivo.append(el("option", { value: "", text: "(este movimento não tem arquivos)" }));
			estado.textContent = "Este movimento não tem arquivos.";
			estado.classList.add("erro");
			return;
		}
		docsCarregados.forEach((d, i) => arquivo.append(el("option", { value: String(i), text: d.nome || "Documento " + (i + 1) })));
		arquivo.disabled = false;
		adicionar.disabled = false;
		estado.textContent = docsCarregados.length + " arquivo(s) encontrado(s).";
	});

	adicionar.addEventListener("click", async () => {
		const m = dados.movimentos[Number(movimento.value)];
		const escolhido = Number(arquivo.value);
		if (!m || !docsCarregados[escolhido]) return;
		const rotulo = tipo.value === "outra" ? T.colapsar(nomeOutra.value) || "Peça" : TIPOS_MANUAIS.find(([v]) => v === tipo.value)[1];
		// O arquivo escolhido vem primeiro; os demais do movimento continuam
		// disponíveis na lista "Arquivo" do cartão.
		const docs = [docsCarregados[escolhido]].concat(docsCarregados.filter((_, i) => i !== escolhido));
		const peca = { tipo: tipo.value, rotulo, seq: m.seq, dataHora: m.dataHora, evento: m.evento, docs, manual: true };
		const ui = blocoPeca(peca, pecasUI.length, pecasUI.length + 1);
		pecasUI.push(ui);
		caixa.before(ui.raiz);
		renumerarPecas();
		form.hidden = true;
		abrir.hidden = false;
		movimento.value = "";
		arquivo.textContent = "";
		arquivo.disabled = true;
		adicionar.disabled = true;
		estado.textContent = "";
		ui.raiz.scrollIntoView({ block: "center", behavior: "smooth" });
		await extrair(ui);
		if ($("#modo").value === "ia" && iaEstado === "available") await resumirUmaComIA(ui, false);
	});

	abrir.addEventListener("click", () => {
		form.hidden = false;
		abrir.hidden = true;
	});
	cancelar.addEventListener("click", () => {
		form.hidden = true;
		abrir.hidden = false;
	});

	form.append(
		el("div", { class: "peca-bloco-titulo" }, "Nova peça"),
		el("div", { class: "peca-nova-linha" }, el("label", {}, "Tipo: ", tipo), nomeOutra),
		el("div", { class: "peca-nova-linha" }, el("label", {}, "Movimento: ", movimento)),
		el("div", { class: "peca-nova-linha" }, el("label", {}, "Arquivo: ", arquivo)),
		el("div", { class: "peca-nova-linha" }, adicionar, cancelar, estado)
	);
	caixa.append(abrir, form);
	return caixa;
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
			const arquivo = await textoDoArquivo(d.url);
			const texto = arquivo.texto;
			ui.texto = texto;
			ui.arquivo = arquivo;
			ui.relevante = "";
			if (T.colapsar(texto).length < 80) {
				estadoPeca(ui, "Documento sem texto (provavelmente digitalizado) — preencha o resumo manualmente.", true);
				ui.trecho.value = "";
				ui.infoTexto.textContent = "";
				return;
			}
			ui.trecho.value = textoIntegral(arquivo, ui.carimbos.checked);
			ui.infoTexto.textContent = `${arquivo.totalPaginas} página(s) · ${T.colapsar(texto).length.toLocaleString("pt-BR")} caracteres`;
			if (ui.peca.tipo === "denuncia") {
				ui.denuncia = T.extrairDenuncia(texto);
				ui.relevante = ui.denuncia.trecho;
				if (!T.colapsar(ui.resumo.textContent)) ui.resumo.textContent = ui.denuncia.resumo;
				const nf = ui.denuncia.fatos.length;
				estadoPeca(
					ui,
					nf
						? `Resumo objetivo pré-montado (${nf === 1 && ui.denuncia.fatos[0].unico ? "fato único, sem título" : nf + " fato(s)"}) — revise. No quadro ① estão os fatos na íntegra.`
						: "Não identifiquei a narrativa dos fatos — confira o quadro ① e escreva o resumo (ou use a IA).",
					!nf
				);
			} else {
				if (ui.peca.tipo === "sentenca" && dados.criminal) {
					// Sentença criminal: absolvidos, condenados e pena de cada
					// um, substituição/suspensão, indenização e honorários do
					// dativo — só os itens que existem na sentença.
					ui.sentenca = T.extrairSentencaCriminal(texto);
					ui.relevante = ui.sentenca.trecho;
					if (!T.colapsar(ui.resumo.textContent) && ui.sentenca.resumo) ui.resumo.textContent = ui.sentenca.resumo;
					estadoPeca(ui, ui.sentenca.resumo ? "Resumo da sentença criminal pré-montado — revise." : "Não identifiquei absolvição/condenação no texto — confira o quadro ① e escreva o resumo (ou use a IA).", !ui.sentenca.resumo);
				} else {
					const tipoTrecho = ui.peca.tipo === "decisao" ? "sentenca" : ui.peca.tipo === "outra" ? "inicial" : ui.peca.tipo;
					ui.relevante = T.extrairTrechoPedidos(texto, tipoTrecho);
					estadoPeca(ui, "Texto lido. Use “Localizar trecho relevante” para ver os pedidos/dispositivo no texto integral e escreva o resumo (ou use a IA).");
				}
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
		mostrarEstadoIA("unavailable");
		const msg = usandoClaude()
			? "O Claude não está configurado (falta a chave da API) — abra ⚙️ Configurações ou use o modo manual."
			: "A IA do Chrome não está disponível neste computador/versão do navegador — use o modo manual.";
		estadoPeca(ui, msg, true);
		if (interativo) alert(msg + "\n\n" + (await iaDiagnostico()).join("\n"));
		return false;
	}
	await extrair(ui);
	if (!T.colapsar(ui.relevante || "") && !(ui.denuncia && ui.denuncia.fatos.length)) return false;
	estadoPeca(ui, "Resumindo com " + nomeIAAtual() + "…");
	try {
		const texto = await resumirComIA(ui);
		ui.resumo.textContent = texto;
		ui.seloIA.hidden = false;
		ui.seloIA.textContent = "✨ Gerado " + porIAAtual() + " — revise antes de imprimir";
		estadoPeca(ui, "Resumo gerado " + porIAAtual() + " (" + ultimoEnvioIA.toLocaleString("pt-BR") + " caracteres de texto enviados) — revise antes de imprimir.");
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
				mostrarEstadoIA("unavailable");
				mostrarAvisos([
					(usandoClaude() ? "O Claude não está configurado (falta a chave da API)" : "A IA do Chrome não está disponível neste computador/versão") +
						" — os textos foram extraídos para preenchimento manual.",
				]);
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
		gerarSimplesFixo();
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

// ---------------------------------------------------------------------
// V – Entenda esta certidão (linguagem simples)
// ---------------------------------------------------------------------

const S = globalThis.PdpCertidaoSimples;
let simplesEditado = false;

// Dados extras já extraídos das peças (denúncia, sentença criminal).
function extrasSimples() {
	const den = pecasUI.find((ui) => ui.denuncia && ui.denuncia.fatos && ui.denuncia.fatos.length && ui.incluir.checked);
	const sent = pecasUI.find((ui) => ui.sentenca && ui.incluir.checked);
	const clone = $("#folha").cloneNode(true);
	clone.querySelectorAll("#secao-simples, .no-print, .apoio").forEach((n) => n.remove());
	return {
		denuncia: den ? den.denuncia : null,
		sentencaCriminal: sent ? sent.sentenca : null,
		textoCertidao: clone.textContent,
		agora: Date.now(),
	};
}

// Blocos -> DOM: título (h3), parágrafos e glossário (lista).
function renderizarSimples(blocos) {
	const caixa = $("#simples-conteudo");
	caixa.textContent = "";
	blocos.forEach((b) => {
		caixa.append(el("h3", { class: "simples-titulo", text: b.titulo }));
		b.paragrafos.forEach((p) => caixa.append(el("p", { text: p })));
		if (b.glossario && b.glossario.length) {
			const ul = el("ul", { class: "simples-glossario" });
			b.glossario.forEach(([termo, def]) => ul.append(el("li", {}, el("strong", { text: termo + ": " }), def)));
			caixa.append(ul);
		}
	});
}

// Modelo fixo: sempre o mesmo texto para os mesmos dados.
function gerarSimplesFixo(forcar) {
	if (!S || !$("#simples-conteudo")) return;
	if (simplesEditado && !forcar) {
		$("#simples-estado").textContent = "O texto foi editado; clique em “Gerar com modelo fixo” para refazê-lo com os dados atuais.";
		return;
	}
	renderizarSimples(S.gerarLinguagemSimples(dados, extrasSimples()));
	simplesEditado = false;
	$("#simples-selo").hidden = true;
	$("#simples-estado").textContent = "Gerado com modelo fixo a partir dos dados da certidão — revise antes de imprimir.";
}

// Texto da IA -> blocos: linhas iguais aos títulos (ou terminadas em "?")
// viram títulos; linhas com "•" ou "-" viram itens do glossário.
function textoIAparaBlocos(texto) {
	const blocos = [];
	let atual = null;
	texto.split("\n").forEach((linha) => {
		const l = linha.trim();
		if (!l) return;
		const ehTitulo = S.TITULOS.some((t) => T.normalizar(l).replace(/[:#*]/g, "").trim() === T.normalizar(t)) || (/\?$/.test(l) && l.length < 70);
		if (ehTitulo) {
			atual = { titulo: l.replace(/[:#*]/g, "").trim(), paragrafos: [], glossario: [] };
			blocos.push(atual);
			return;
		}
		if (!atual) {
			atual = { titulo: "Resumo", paragrafos: [], glossario: [] };
			blocos.push(atual);
		}
		const item = /^[•\-–*]\s*([^:]{2,60}):\s*(.+)$/.exec(l);
		if (item) atual.glossario.push([item[1].trim(), item[2].trim()]);
		else atual.paragrafos.push(l.replace(/^[•\-–*]\s*/, ""));
	});
	return blocos;
}

// Resumos (e textos) das peças principais, para a IA explicar os pedidos,
// a sentença e o recurso em linguagem simples. "orcamento" limita o total
// de caracteres (a IA do Chrome tem janela pequena; o Claude, grande).
function pecasParaSimples(orcamento) {
	const pecas = pecasUI.filter((ui) => ui.incluir.checked);
	if (!pecas.length) return "";
	const porPeca = Math.floor(orcamento / pecas.length);
	const partes = pecas.map((ui) => {
		const p = ui.peca;
		const cab = `PEÇA: ${p.rotulo} (${p.seq ? "evento " + p.seq + ", " : ""}${dataDe(p.dataHora) || "sem data"})`;
		const resumo = T.colapsar(ui.resumo.textContent);
		let texto = "";
		const cabe = porPeca - resumo.length - cab.length - 40;
		if (cabe > 300) {
			// Para entender pedidos, sentença e argumento do recurso: o texto
			// da peça (integral no Claude; o trecho relevante na IA do Chrome).
			const fonte = usandoClaude() && ui.texto ? T.limparAssinaturas(ui.texto) : ui.relevante || "";
			texto = T.colapsar(fonte).slice(0, cabe);
		}
		return cab + (resumo ? "\nRESUMO NA CERTIDÃO: " + resumo : "") + (texto ? '\nTEXTO DA PEÇA:\n"""\n' + texto + '\n"""' : "");
	});
	return "\n\nPEÇAS PRINCIPAIS DO PROCESSO (use para os pedidos, a sentença e o recurso):\n\n" + partes.join("\n\n");
}

async function reescreverSimplesComIA() {
	const botao = $("#simples-ia");
	const estado = $("#simples-estado");
	if ((await iaDisponibilidade()) === "unavailable") {
		mostrarEstadoIA("unavailable");
		estado.textContent = "A IA escolhida não está disponível — use o modelo fixo" + (usandoClaude() ? " ou informe a chave da API Claude." : ".");
		return;
	}
	botao.disabled = true;
	estado.textContent = "Reescrevendo com " + nomeIAAtual() + "…";
	try {
		const fixo = S.blocosEmTexto(S.gerarLinguagemSimples(dados, extrasSimples()));
		const prompt =
			"Reescreva o texto abaixo em LINGUAGEM SIMPLES, seguindo o Pacto Nacional do Judiciário pela Linguagem Simples (CNJ), " +
			"para que QUALQUER CIDADÃO entenda, mesmo sem conhecimento jurídico:\n" +
			"- frases curtas (até 20 palavras), na ordem direta e na voz ativa;\n" +
			"- palavras do dia a dia; se precisar de um termo jurídico, explique-o na mesma frase;\n" +
			"- sem latim, sem juridiquês, sem siglas sem explicação;\n" +
			"- mantenha EXATAMENTE os nomes, números, datas, horários e valores; não acrescente nenhuma informação que não esteja no texto;\n" +
			"- mantenha as vítimas pelas iniciais;\n" +
			"- mantenha os mesmos títulos, cada um sozinho numa linha, e os itens do glossário no formato '• Termo: explicação';\n" +
			"- depois do bloco 'O que já aconteceu?', inclua o bloco 'O que cada parte pediu?', com os pedidos de cada parte " +
			"(petição inicial ou denúncia, contestação ou resposta), resumidos em 1 ou 2 frases por parte, a partir das PEÇAS abaixo;\n" +
			"- no bloco 'O que o juiz decidiu?', explique também, em poucas frases, o entendimento da sentença: por que o juiz " +
			"decidiu assim e o que isso significa na prática para as partes (use as PEÇAS abaixo);\n" +
			"- se houver recurso nas PEÇAS, inclua o bloco 'Houve recurso?' dizendo quem recorreu, contra qual decisão e, " +
			"brevemente, qual é o principal argumento;\n" +
			"- se não houver informação para algum bloco, não o inclua (não escreva 'não consta');\n" +
			"- não use markdown.\n\n" +
			'TEXTO A REESCREVER:\n"""\n' + fixo + '\n"""' +
			pecasParaSimples(Math.max(2000, limiteEntradaIA() - fixo.length - 3000));
		const resposta = await iaGerar(prompt, 4000);
		const blocos = textoIAparaBlocos(limparRespostaIA(resposta));
		if (!blocos.length) throw new Error("a IA não devolveu texto");
		renderizarSimples(blocos);
		simplesEditado = true; // não é refeito automaticamente por cima
		$("#simples-selo").hidden = false;
		$("#simples-selo").textContent = "✨ Reescrito " + porIAAtual() + " — revise";
		estado.textContent = "Reescrito " + porIAAtual() + " (" + ultimoEnvioIA.toLocaleString("pt-BR") + " caracteres de texto enviados) — confira nomes, datas e valores antes de imprimir.";
	} catch (e) {
		estado.textContent = "A IA não conseguiu reescrever: " + e.message;
	} finally {
		botao.disabled = iaEstado === "unavailable";
	}
}

function secaoSimples() {
	const sec = el("section", { id: "secao-simples" });
	sec.append(
		el("h2", { class: "subtitulo", text: "V – ENTENDA ESTA CERTIDÃO (LINGUAGEM SIMPLES)" }),
		el(
			"div",
			{ class: "simples-acoes no-print" },
			el("button", { type: "button", id: "simples-fixo", text: "↻ Gerar com modelo fixo", onclick: () => gerarSimplesFixo(true) }),
			el("button", { type: "button", id: "simples-ia", class: "btn-ia", text: "✨ Reescrever com IA", onclick: reescreverSimplesComIA }),
			el("span", { id: "simples-selo", class: "selo-ia", hidden: true, text: "✨ Reescrito pela IA — revise" }),
			el("span", { id: "simples-estado", class: "simples-estado" })
		),
		el("div", { id: "simples-conteudo", class: "simples", contenteditable: "true", oninput: () => (simplesEditado = true) })
	);
	return sec;
}

// Mostra/oculta a seção V (e a tira da impressão e do "Copiar texto").
function aplicarOpcaoSimples() {
	const sec = $("#secao-simples");
	if (sec) sec.hidden = !opcoes.simples;
}

// ---------------------------------------------------------------------
// ✕ nas linhas do quadro "I – Dados do processo"
// ---------------------------------------------------------------------

const linhasRemovidas = [];

function removerLinhaQuadro(tr) {
	linhasRemovidas.push({ tr, depoisDe: tr.previousElementSibling, tabela: tr.parentElement });
	tr.remove();
	atualizarRestaurar();
}

function restaurarLinhasQuadro() {
	while (linhasRemovidas.length) {
		const { tr, depoisDe, tabela } = linhasRemovidas.pop();
		if (depoisDe && depoisDe.isConnected) depoisDe.after(tr);
		else tabela.prepend(tr);
	}
	atualizarRestaurar();
}

function atualizarRestaurar() {
	const b = $("#quadro-restaurar");
	if (!b) return;
	b.hidden = !linhasRemovidas.length;
	b.textContent = `↺ Restaurar ${linhasRemovidas.length} linha(s) removida(s)`;
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
		el(
			"section",
			{ id: "secao-resumo" },
			el("h2", { class: "subtitulo", text: "I – DADOS DO PROCESSO" }),
			quadroResumo(),
			el("button", { type: "button", id: "quadro-restaurar", class: "no-print", hidden: true, onclick: restaurarLinhasQuadro })
		),
		secaoAudiencias(),
		secaoEventos()
	);

	pecasUI = [];
	{
		const pecas = dados.pecas || [];
		const secao = el("section", { id: "pecas" });
		secao.append(
			el("h2", { class: "subtitulo", text: "IV – PEÇAS PRINCIPAIS" }),
			el("p", { contenteditable: "true", text: "CERTIFICO, ainda, que as peças principais do processo apresentam, em síntese, o seguinte conteúdo:" }),
			el("p", { id: "pecas-vazio", class: "no-print aviso-vazio", text: "Nenhuma peça principal foi identificada automaticamente. Use “+ Adicionar peça” para incluir." })
		);
		pecas.forEach((peca, i) => {
			const ui = blocoPeca(peca, i, pecas.length);
			pecasUI.push(ui);
			secao.append(ui.raiz);
		});
		secao.append(formularioNovaPeca());
		folha.append(secao);
		renumerarPecas();
	}

	folha.append(secaoSimples());
	aplicarOpcaoSimples();

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

// Só a seção dos eventos é refeita quando as opções mudam.
function refazerParagrafoPrincipal() {
	const atual = $("#secao-eventos");
	if (atual) atual.replaceWith(secaoEventos());
	const aud = $("#secao-audiencias");
	if (aud) aud.replaceWith(secaoAudiencias());
}

function textoParaCopiar() {
	const clone = $("#folha").cloneNode(true);
	clone.querySelectorAll(".apoio, .peca.excluida, .no-print, [hidden]").forEach((n) => n.remove());
	const blocos = [];
	clone.querySelectorAll(".cabecalho > div, h1, h2, h3, p, li, .quadro tr, .aud-item, .evento, .assinatura > div").forEach((n) => {
		let t;
		if (n.matches(".quadro tr")) {
			const partes = Array.from(n.cells[1].querySelectorAll(".parte, .relacionado")).map((p) => T.colapsar(p.textContent));
			t = T.colapsar(n.cells[0].textContent) + ": " + (partes.length ? partes.join("; ") : T.colapsar(n.cells[1].textContent));
		} else if (n.matches("li")) {
			t = "• " + T.colapsar(n.textContent);
		} else if (n.matches(".aud-item")) {
			t = "    " + T.colapsar(n.textContent);
		} else if (n.matches(".evento")) {
			const nivel = Number((/nivel-(\d)/.exec(n.className) || [])[1] || 0);
			t = "    ".repeat(nivel) + T.colapsar(n.textContent);
		} else {
			t = T.colapsar(n.textContent);
		}
		if (t) blocos.push(t);
	});
	return blocos.join("\n");
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
	$("#opt-subitens").checked = opcoes.subitens;
	$("#opt-simples").checked = opcoes.simples;
	$("#opt-simples").addEventListener("change", () => {
		opcoes.simples = $("#opt-simples").checked;
		chrome.storage.local.set({ [OPCOES_KEY]: opcoes });
		aplicarOpcaoSimples();
	});
	$("#formato").value = opcoes.formato === "corrido" ? "corrido" : "lista";
	$("#formato").addEventListener("change", () => {
		opcoes.formato = $("#formato").value;
		chrome.storage.local.set({ [OPCOES_KEY]: opcoes });
		refazerParagrafoPrincipal();
	});
	[["#opt-usuario", "usuario"], ["#opt-invalidos", "invalidos"], ["#opt-seq", "seq"], ["#opt-subitens", "subitens"]].forEach(([sel, chaveOpcao]) => {
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
	await carregarConfigIA();
	await montar();
	prepararPainelClaude();
	await verificarIA();
	gerarSimplesFixo();

	$("#gerar-resumos").addEventListener("click", gerarResumos);
	$("#imprimir").addEventListener("click", () => window.print());
	$("#ia-status").addEventListener("click", async () => {
		if (iaEstado !== "unavailable") return;
		if (usandoClaude()) window.abrirConfiguracoes(true);
		else alert("Diagnóstico da IA\n\n" + (await iaDiagnostico()).join("\n\n"));
	});
	$("#diagnostico-ia").addEventListener("click", async () => {
		alert("Diagnóstico da IA\n\n" + (await iaDiagnostico()).join("\n\n"));
	});
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
			status('Clique em "✨ Gerar resumos" para resumir com ' + nomeIAAtual() + (usandoClaude() ? "." : " (na primeira vez, o Chrome baixa o modelo)."));
			return;
		}
	}
	await gerarResumos();
}

iniciar().catch((e) => {
	console.error("[Certidão]", e);
	mostrarAvisos(["Erro ao montar a certidão: " + e.message]);
});
