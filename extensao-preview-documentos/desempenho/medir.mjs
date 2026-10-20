// Mede quanto processamento a extensão consome numa tela que imita o Projudi.
//
// Não faz parte da extensão (não é carregado pelo navegador do usuário): é
// uma ferramenta de quem mantém o código, para comparar versões.
//
// Uso (na pasta extensao-preview-documentos):
//   node desempenho/medir.mjs              -> com e sem a extensão
//   LINHAS=800 node desempenho/medir.mjs   -> tela com 800 movimentações
//   PERFIL=1 node desempenho/medir.mjs     -> também lista onde o tempo foi gasto
//   PERFIL=fundo node desempenho/medir.mjs -> idem, só na etapa em segundo plano
//
// O que é medido (tempo de JavaScript e de layout no processo da aba,
// via Chrome DevTools Protocol, somando a página e os quadros):
//   1. carregamento da tela do processo;
//   2. 10 s parado (custo "de fundo": temporizadores);
//   3. 40 trocas de aba via AJAX (custo dos observadores de DOM);
//   4. 10 carregamentos da tela do processo em quadro oculto (como as
//      prévias e buscas em segundo plano da extensão);
//   5. 10 s com a aba em segundo plano.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const aqui = path.dirname(fileURLToPath(import.meta.url));
const extensao = path.resolve(aqui, "..");
const LINHAS = Number(process.env.LINHAS || 400);
const ORIGEM = "https://projudi.tjpr.jus.br";

function linhasMovimentacoes(n, rodada) {
	let html = "";
	for (let i = n; i > 0; i--) {
		html += '<tr class="' + (i % 2 ? "odd" : "even") + '"><td>' + i + '</td><td>01/0' + (1 + (i % 9)) + '/2026 10:' + String(i % 60).padStart(2, "0") +
			'</td><td><b>JUNTADA DE PETIÇÃO</b> (rodada ' + rodada + ')</td><td>Fulano de Tal</td><td>' +
			'<a class="link" href="/projudi/arquivo.do?_tj=' + (1000 + i) + '" target="_blank">peticao_' + i + '.pdf</a></td></tr>';
	}
	return html;
}

const TELA_PROCESSO = `<!doctype html><html><head><meta charset="utf-8"><title>Processo</title></head><body>
<form id="processoForm" name="processoForm" method="post" action="/projudi/processo/visualizacaoProcesso.do?actionType=visualizar"><input type="hidden" name="_tj" value="abc"></form>
<h3 id="barraTituloStatusProcessual">Processo 0001234-56.2026.8.16.0001 &nbsp;-&nbsp; (10 dia(s) em tramitação)</h3>
<ul><li id="tabItemprefix0" class="currentTab"><a href="#">Movimentações</a></li><li id="tabItemprefix2"><a href="#">Partes</a></li></ul>
<div id="Partes"><table class="form"><tr><td>Autor: FULANO</td></tr><tr><td>Réu: BELTRANO</td></tr></table></div>
<div id="toolbar"><input type="button" value="Peticionar"><input type="button" value="Juntar Documento"><a href="#">Movimentações</a> <a href="#">Partes</a></div>
<div id="tabprefix"><table class="resultTable" id="movimentacoes"><thead><tr><th>Seq</th><th>Data</th><th>Evento</th><th>Usuário</th><th>Arquivos</th></tr></thead>
<tbody id="corpo">${linhasMovimentacoes(LINHAS, 0)}</tbody></table></div>
<script>
// Simula a troca de aba do Projudi (o conteúdo é substituído por AJAX).
window.__trocarAba = function (rodada) {
	document.getElementById("corpo").innerHTML = window.__linhas(rodada);
};
window.__linhas = ${linhasMovimentacoes.toString()}.bind(null, ${LINHAS});
</script></body></html>`;

const CABECALHO = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="userinfo">Usuário: TESTE &nbsp; Atribuição: Analista Judiciário</div>
<ul id="menu"><li><a href="#">Mesa</a></li><li><a href="#">Buscas</a></li></ul></body></html>`;

const TOPO = `<!doctype html><html><head><meta charset="utf-8"><title>Projudi</title>
<style>body{margin:0}iframe{border:0;width:100%;display:block}</style></head><body>
<iframe name="header" src="/projudi/cabecalho.do" style="height:90px"></iframe>
<iframe name="userMainFrame" id="userMainFrame" src="/projudi/processo/visualizacaoProcesso.do?actionType=visualizar" style="height:900px"></iframe>
</body></html>`;

let postsDoProcesso = 0;
async function rotear(contexto) {
	await contexto.route(ORIGEM + "/**", function (route) {
		const url = route.request().url();
		let body = TOPO;
		if (url.includes("cabecalho.do")) body = CABECALHO;
		else if (url.includes("visualizacaoProcesso.do")) {
			// Processo sem a aba "Informações Adicionais" (ex.: cível).
			if (route.request().method() === "POST") postsDoProcesso++;
			body = TELA_PROCESSO;
		}
		else if (url.includes("arquivo.do")) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
		return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body });
	});
}

function metricas(lista) {
	const m = {};
	for (const x of lista.metrics) m[x.name] = x.value;
	return m;
}

async function medir(comExtensao) {
	const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "pdp-perf-"));
	// Sem tela (DISPLAY), usa o modo sem janela; nele, porém, nenhuma aba
	// fica "em segundo plano" (document.hidden é sempre falso).
	const args = ["--no-first-run"];
	if (!process.env.DISPLAY) args.push("--headless=new");
	if (comExtensao) args.push("--disable-extensions-except=" + extensao, "--load-extension=" + extensao);
	const contexto = await playwright.chromium.launchPersistentContext(perfil, {
		headless: false, // o modo "--headless=new" acima é o que permite extensões
		args: args,
		// O Playwright desliga por padrão o tratamento de abas em segundo
		// plano; aqui ele precisa valer como no navegador do usuário.
		ignoreDefaultArgs: ["--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
		viewport: { width: 1366, height: 1000 },
	});
	try {
		await rotear(contexto);
		let sw = null;
		if (comExtensao) {
			sw = contexto.serviceWorkers()[0];
			if (!sw) sw = await contexto.waitForEvent("serviceworker");
			// Aceita os Termos de Uso: é isso que registra os scripts do Projudi.
			await sw.evaluate(async function () {
				await chrome.storage.local.set({ pdpTermosUso: { aceito: true, versao: PDP_TERMOS.versao, em: Date.now() } });
				await pdpSincronizar();
			});
			for (const p of contexto.pages()) if (p.url().startsWith("chrome-extension://")) await p.close();
		}

		const pagina = await contexto.newPage();
		if (process.env.CONSOLE) pagina.on("console", m => { if (new RegExp(process.env.CONSOLE).test(m.text())) console.log("    [console]", m.text().slice(0, 200)); });
		const cdp = await contexto.newCDPSession(pagina);
		await cdp.send("Performance.enable", { timeDomain: "threadTicks" });
		const contextosDaExtensao = new Set();
		cdp.on("Runtime.executionContextCreated", e => { if (/^chrome-extension:/.test(e.context.origin) || (e.context.auxData && e.context.auxData.type === "isolated")) contextosDaExtensao.add(e.context.id); });
		cdp.on("Runtime.executionContextDestroyed", e => contextosDaExtensao.delete(e.executionContextId));
		await cdp.send("Runtime.enable");
		const amostra = async () => metricas(await cdp.send("Performance.getMetrics"));
		const diferenca = (a, b) => ({
			script: (b.ScriptDuration - a.ScriptDuration) * 1000,
			layout: (b.LayoutDuration + b.RecalcStyleDuration - a.LayoutDuration - a.RecalcStyleDuration) * 1000,
			tarefas: (b.TaskDuration - a.TaskDuration) * 1000,
		});
		const resultado = {};
		postsDoProcesso = 0;
		if (process.env.PERFIL) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start"); }

		let a = await amostra();
		await pagina.goto(ORIGEM + "/projudi/", { waitUntil: "load" });
		const quadro = pagina.frame({ name: "userMainFrame" });
		await quadro.waitForSelector("#corpo tr");
		await pagina.waitForTimeout(3000); // document_idle + inicialização dos scripts
		let b = await amostra();
		resultado.carregamento = diferenca(a, b);
		resultado.botoesInseridos = await quadro.evaluate(() => document.querySelectorAll('[id^="pdp-"],[class*="pdp-"]').length);

		a = await amostra();
		await pagina.waitForTimeout(10000);
		b = await amostra();
		resultado.parado10s = diferenca(a, b);

		a = await amostra();
		const t0 = Date.now();
		for (let i = 1; i <= 40; i++) {
			await quadro.evaluate(r => window.__trocarAba(r), i);
			await pagina.waitForTimeout(50);
		}
		await pagina.waitForTimeout(1000);
		b = await amostra();
		resultado.trocas40 = diferenca(a, b);
		resultado.trocas40.relogio = Date.now() - t0;

		// Quadros ocultos (como os que a extensão cria para prévias e buscas
		// em segundo plano): 10 carregamentos da tela do processo.
		a = await amostra();
		const t1 = Date.now();
		await quadro.evaluate(async function () {
			for (let i = 0; i < 10; i++) {
				await new Promise(function (ok) {
					const f = document.createElement("iframe");
					f.setAttribute("data-pdp-loader", "medicao-" + i);
					f.style.cssText = "position:absolute;left:-9999px;width:1024px;height:768px";
					f.addEventListener("load", function () {
						if (f.contentWindow.location.href === "about:blank") return;
						setTimeout(function () { f.remove(); ok(); }, 300);
					});
					document.body.appendChild(f);
					f.src = "/projudi/processo/visualizacaoProcesso.do?actionType=visualizar&q=" + i;
				});
			}
		});
		b = await amostra();
		resultado.quadros10 = diferenca(a, b);
		resultado.quadros10.relogio = Date.now() - t1;

		// Segundo plano: outra aba passa a ser a visível (só funciona com
		// janela de verdade - ver DISPLAY no início do arquivo).
		// O Playwright mantém toda página "à vista" (document.hidden sempre
		// falso), então a aba em segundo plano é simulada: nos contextos da
		// extensão (mundo isolado dos scripts), document.hidden passa a ser
		// verdadeiro, como o navegador informa quando o usuário troca de aba.
		for (const id of contextosDaExtensao) {
			await cdp.send("Runtime.evaluate", { contextId: id, expression: "Object.defineProperty(Document.prototype, 'hidden', { get: () => true, configurable: true }); document.hidden" }).catch(() => {});
		}
		const outra = pagina;
		await outra.waitForTimeout(500);
		// PERFIL=fundo: o resumo de onde o tempo foi gasto cobre só esta etapa.
		if (process.env.PERFIL === "fundo") { await cdp.send("Profiler.stop"); await cdp.send("Profiler.start"); }
		resultado.ocultaEmSegundoPlano = contextosDaExtensao.size;
		a = await amostra();
		await outra.waitForTimeout(10000);
		b = await amostra();
		resultado.segundoPlano10s = diferenca(a, b);
		resultado.posts = postsDoProcesso;
		if (process.env.PERFIL) resultado.perfil = resumirPerfil((await cdp.send("Profiler.stop")).profile);
		return resultado;
	} finally {
		await contexto.close();
		fs.rmSync(perfil, { recursive: true, force: true });
	}
}

// Soma o tempo próprio de cada amostra por arquivo e por função (só os
// arquivos da extensão), para apontar onde o tempo é gasto.
function resumirPerfil(perfil) {
	const porNo = new Map(perfil.nodes.map(n => [n.id, n]));
	const contagem = new Map();
	for (const id of perfil.samples) contagem.set(id, (contagem.get(id) || 0) + 1);
	const dt = (perfil.endTime - perfil.startTime) / 1000 / perfil.samples.length;
	const porArquivo = {}, porFuncao = {};
	const pais = new Map();
	for (const x of perfil.nodes) for (const c of x.children || []) pais.set(c, x);
	for (const [id, n] of contagem) {
		const no = porNo.get(id);
		// Atribui tempo de funções nativas (querySelectorAll etc.) ao chamador da extensão.
		let atual = no, url;
		while (atual && !/chrome-extension:/.test(atual.callFrame.url)) atual = pais.get(atual.id);
		if (!atual) continue;
		url = atual.callFrame.url.split("/").pop();
		const nome = url + " " + (atual.callFrame.functionName || "(anônima)") + ":" + (atual.callFrame.lineNumber + 1);
		porArquivo[url] = (porArquivo[url] || 0) + n * dt;
		porFuncao[nome] = (porFuncao[nome] || 0) + n * dt;
	}
	const topo = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => "    " + v.toFixed(0).padStart(6) + " ms  " + k).join("\n");
	return "  por arquivo:\n" + topo(porArquivo) + "\n  por função:\n" + topo(porFuncao);
}

function fmt(r) {
	const ms = v => v.toFixed(0).padStart(6) + " ms";
	return [
		"  carregamento ............ JS " + ms(r.carregamento.script) + " | layout " + ms(r.carregamento.layout) + " | total " + ms(r.carregamento.tarefas),
		"  10 s parado ............. JS " + ms(r.parado10s.script) + " | layout " + ms(r.parado10s.layout) + " | total " + ms(r.parado10s.tarefas),
		"  40 trocas de aba ........ JS " + ms(r.trocas40.script) + " | layout " + ms(r.trocas40.layout) + " | total " + ms(r.trocas40.tarefas),
		"  10 quadros ocultos ...... JS " + ms(r.quadros10.script) + " | layout " + ms(r.quadros10.layout) + " | total " + ms(r.quadros10.tarefas) + " | relógio " + ms(r.quadros10.relogio),
		"  10 s em segundo plano ... JS " + ms(r.segundoPlano10s.script) + " | layout " + ms(r.segundoPlano10s.layout) + " | total " + ms(r.segundoPlano10s.tarefas),
		"  elementos da extensão na tela: " + r.botoesInseridos + " | contextos da extensão: " + r.ocultaEmSegundoPlano,
		"  pedidos POST da tela do processo feitos em segundo plano (~35 s): " + r.posts,
	].join("\n") + (r.perfil ? "\n" + r.perfil : "");
}

// O Chrome grava a pasta _metadata dentro da extensão ao carregá-la
// descompactada; ela não faz parte do código e é apagada no fim.
const metadata = path.join(extensao, "_metadata");
const metadataJaExistia = fs.existsSync(metadata);
process.on("exit", () => { if (!metadataJaExistia) fs.rmSync(metadata, { recursive: true, force: true }); });

console.log("Tela simulada com " + LINHAS + " movimentações.\n");
console.log("SEM a extensão:");
const sem = await medir(false);
console.log(fmt(sem) + "\n");
console.log("COM a extensão:");
const com = await medir(true);
console.log(fmt(com));
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify({ linhas: LINHAS, sem, com }, null, 2));
