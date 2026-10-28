// Confere se o processo aberto em NOVA ABA a partir das listas de Análise
// de Juntadas e de Retorno de Conclusão (Projudi e SEEU) trava com a
// extensão. Também confere a aba da lista, que fica aberta atrás.
//
// Não faz parte da extensão: é uma ferramenta de quem mantém o código. Ver
// DIAGNOSTICO-TRAVAMENTO-SEEU.md.
//
// Uso (na pasta extensao-preview-documentos):
//   node desempenho/travamento-nova-aba.mjs
//   EXTENSAO=/outra/pasta node desempenho/travamento-nova-aba.mjs  (outra versão)
//
// Em cada cenário: abre o sistema (cabeçalho + quadro principal com a
// lista), espera a extensão montar a lista, clica no processo da linha (o
// link abre em nova aba, como no sistema) e confere, por 8 s, se a nova aba
// e a da lista respondem. Lista também os avisos "[Projudi] Vigia de ...
// desligado" (laços que o vigia de hostGuard.js cortou).
//
// Sai com código 1 se alguma aba parar de responder.
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
const extensao = path.resolve(process.env.EXTENSAO || path.resolve(aqui, ".."));
const LINHAS = Number(process.env.LINHAS || 15);

const SISTEMAS = {
	projudi: { origem: "https://projudi.tjpr.jus.br", raiz: "/projudi", processo: "/projudi/processo.do" },
	seeu: { origem: "https://seeu.pje.jus.br", raiz: "/seeu", processo: "/seeu/visualizacaoProcesso.do" },
};

function numero(i) { return String(1000 + i).padStart(7, "0") + "-12.2026.8.16.0001"; }

// Lista "Análise de Juntadas" ou "Retorno de Conclusão": número do processo
// como link (target _blank, como no sistema) e o link da pendência.
function lista(s, tela) {
	const r = SISTEMAS[s].raiz;
	let linhas = "";
	for (let i = 0; i < LINHAS; i++) {
		const proc = '<a class="link" href="' + SISTEMAS[s].processo + '?_tj=p' + i + '" target="_blank"><em class="attention">' + numero(i) + '</em></a>';
		const acao = tela === "conclusao"
			? '<a class="link" href="' + r + '/processo/conclusao.do?actionType=analisar&_tj=c' + i + '">Analisar</a>'
			: '<input type="checkbox" name="idJuntadas" value="' + i + '"> <a class="link" href="' + r + '/processo/analisarJuntada.do?actionType=analisar&_tj=j' + i + '">Petição</a>';
		linhas += '<tr class="' + (i % 2 ? "odd" : "even") + '"><td>' + acao + '</td><td>' + proc + '</td><td>FULANO ' + i + '</td><td>0' + (1 + i % 9) + '/10/2026</td></tr>';
	}
	const titulo = tela === "conclusao" ? "Retorno de Conclusão" : "Análise de Juntadas";
	return `<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title></head><body>
<h3>${titulo}</h3>
<form name="busca" action="${r}/processo/${tela}.do"><input type="submit" value="Filtrar"></form>
<form name="lista" action="${r}/processo/${tela}.do"><table class="resultTable"><thead><tr><th></th><th>Processo</th><th>Parte</th><th>Data</th></tr></thead>
<tbody>${linhas}</tbody></table><input type="button" value="Dispensar"></form></body></html>`;
}

function movimentacoesSeeu(n) {
	let html = "";
	for (let i = 0; i < n; i++) {
		html += '<tr class="' + (i % 2 ? "odd" : "even") + '" id=""><td><a class="linkArquivos' + i + '"><img src="/seeu/imagens/iPlus.gif" id="icon' + i + '"></a></td>' +
			'<td>' + String(1 + (i % 28)).padStart(2, "0") + '/03/2026 12:20:45</td><td><b>DOCUMENTO</b><br>Petição ' + i + '</td></tr>' +
			'<tr id="row' + i + '" style="display:none"><td colspan="5"><div id="div' + i + '" class="extendedinfo"></div></td></tr>';
	}
	return html;
}
function movimentacoesProjudi(n) {
	let html = "";
	for (let i = n; i > 0; i--) {
		html += '<tr id="mov1Grau,' + i + '" class="' + (i % 2 ? "odd" : "even") + '"><td>' + i + '</td><td>01/10/2026 10:00</td><td><b>JUNTADA DE PETIÇÃO</b></td><td>Fulano</td><td>' +
			'<a class="link" href="/projudi/arquivo.do?_tj=' + (1000 + i) + '" target="_blank">peticao_' + i + '.pdf</a></td></tr>';
	}
	return html;
}

// Tela do processo com o quadro Pendências como vem de quem abre pela
// lista (juntada para analisar e conclusão).
function processo(s, id) {
	const r = SISTEMAS[s].raiz;
	const pendencias = `<table id="quadroPendencias"><tr><td class="labelRadio"><label>Juntadas para analisar:</label></td><td>
<a class="link" href="${r}/processo/analisarJuntada.do?actionType=analisar&_tj=j${id}">1 juntada(s) para analisar</a></td></tr>
<tr><td class="labelRadio"><label>Conclusões:</label></td><td><a class="link" href="${r}/processo/conclusao.do?actionType=analisar&_tj=c${id}">Conclusão para Despacho</a></td></tr></table>`;
	const seeu = s === "seeu";
	return `<!doctype html><html><head><meta charset="utf-8"><title>Processo</title></head><body>
${seeu ? "<seeu-localizador-processo-header></seeu-localizador-processo-header>" : ""}
<h3 id="barraTituloStatusProcessual">Processo ${numero(Number(String(id).replace(/\D/g, "")) || 0)} &nbsp;-&nbsp; (10 dia(s) em tramitação)</h3>
<form id="processoForm" name="processoForm" method="post" action="${seeu ? "/seeu/visualizacaoProcesso.do" : "/projudi/processo/visualizacaoProcesso.do"}?actionType=visualizar"><input type="hidden" name="_tj" value="${id}"></form>
<table id="informacoesProcessuais"><tr><td>Classe Processual:</td><td>${seeu ? "Execução da Pena" : "Procedimento Comum Cível"}</td></tr><tr><td>Assunto Principal:</td><td>Indenização</td></tr></table>
${pendencias}
<div id="toolbar"><input type="button" value="Peticionar"><input type="button" value="Juntar Documento"><input type="button" value="Voltar"></div>
<ul><li class="currentTab"><a href="#">Movimentações</a></li><li><a href="#">Partes</a></li></ul>
<table class="resultTable" id="movimentacoes"><tbody>${seeu ? movimentacoesSeeu(40) : movimentacoesProjudi(40)}</tbody></table>
<script>
document.addEventListener("click", function (ev) {
	const a = ev.target.closest && ev.target.closest("a[class^='linkArquivos']");
	if (!a) return;
	const i = a.className.replace("linkArquivos", "");
	const linha = document.getElementById("row" + i), img = document.getElementById("icon" + i);
	const abrir = linha.style.display === "none";
	linha.style.display = abrir ? "" : "none";
	img.src = abrir ? "/seeu/imagens/iMinus.gif" : "/seeu/imagens/iPlus.gif";
	if (abrir) document.getElementById("div" + i).innerHTML = '<a class="link" href="/seeu/arquivo.do?_tj=' + i + '">online.pdf</a>';
});
</script></body></html>`;
}

const CABECALHO = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="userinfo">Usuário: TESTE &nbsp; Atribuição: Analista Judiciário</div>
<ul id="menu"><li><a href="#">Mesa</a></li><li><a href="#">Buscas</a></li><li><a href="#">Sair</a></li></ul></body></html>`;

function topo(s, tela) {
	const r = SISTEMAS[s].raiz;
	return `<!doctype html><html><head><meta charset="utf-8"><title>${s}</title>
<style>body{margin:0}iframe{border:0;width:100%;display:block}</style></head><body>
<iframe name="header" src="${r}/cabecalho.do" style="height:90px"></iframe>
<iframe name="userMainFrame" id="userMainFrame" src="${r}/processo/${tela}.do" style="height:900px"></iframe>
</body></html>`;
}

async function rotear(contexto) {
	for (const s of Object.keys(SISTEMAS)) {
		await contexto.route(SISTEMAS[s].origem + "/**", function (route) {
			const url = new URL(route.request().url());
			const p = url.pathname;
			if (/\.gif$/.test(p)) return route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAAAAACw=", "base64") });
			if (/arquivo\.do$/.test(p)) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
			let body;
			if (/cabecalho\.do$/.test(p)) body = CABECALHO;
			else if (/(analisarJuntada|conclusao)\.do$/.test(p) && !url.searchParams.get("actionType")) body = lista(s, /conclusao/.test(p) ? "conclusao" : "analisarJuntada");
			else if (/(processo|visualizacaoProcesso)\.do$/.test(p)) body = processo(s, url.searchParams.get("_tj") || "p0");
			else if (/(analisarJuntada|conclusao)\.do$/.test(p)) body = '<!doctype html><html><body><h3>Pendência</h3><a class="link" href="' + SISTEMAS[s].processo + '?_tj=p0">processo</a></body></html>';
			else body = topo(s, url.searchParams.get("tela") || "analisarJuntada");
			return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body });
		});
	}
}

async function comPrazo(promessa, ms) {
	let t;
	const limite = new Promise(ok => { t = setTimeout(() => ok("TRAVOU"), ms); });
	try { return await Promise.race([promessa.catch(e => "ERRO: " + e.message), limite]); } finally { clearTimeout(t); }
}

const espera = ms => new Promise(ok => setTimeout(ok, ms));

async function cenario(contexto, s, tela) {
	const avisos = [];
	const escutar = p => p.on("console", m => { if (/Vigia de/.test(m.text())) avisos.push(m.text().replace(/^\[Projudi\] /, "").slice(0, 90)); });
	contexto.on("page", escutar);
	const listaAba = await contexto.newPage();
	escutar(listaAba);
	await listaAba.goto(SISTEMAS[s].origem + SISTEMAS[s].raiz + "/?tela=" + tela, { waitUntil: "load" });
	const quadro = listaAba.frame({ name: "userMainFrame" });
	await quadro.waitForSelector("a[target=_blank]");
	await espera(4000); // a extensão monta a lista (e, no SEEU, lê os localizadores)
	const novaAbaP = contexto.waitForEvent("page", { timeout: 10000 });
	await quadro.click("a[target=_blank] >> nth=0");
	const novaAba = await novaAbaP;
	let travou = false;
	const linhas = [];
	for (let t = 1; t <= 8; t++) {
		await espera(1000);
		const r = await comPrazo(novaAba.evaluate(() => ({
			url: location.pathname,
			botoes: [...document.querySelectorAll(".pdp-qa-group-btn,[id^='pdp-'][id$='-button']")].length,
		})), 4000);
		const rl = await comPrazo(quadro.evaluate(() => 1), 4000);
		if (r === "TRAVOU" || rl === "TRAVOU") {
			travou = true;
			linhas.push(t + " s: " + (r === "TRAVOU" ? "NOVA ABA PAROU DE RESPONDER" : "") + (rl === "TRAVOU" ? " ABA DA LISTA PAROU DE RESPONDER" : ""));
			break;
		}
		if (t === 8) linhas.push("8 s: as duas abas respondem | botões da extensão na nova aba: " + r.botoes);
	}
	if (!travou) {
		// Clica no "+" de algumas movimentações (aba Movimentações).
		const r = await comPrazo(novaAba.evaluate(async () => {
			const imgs = [...document.querySelectorAll("a[class^='linkArquivos'] img")].slice(0, 5);
			for (const img of imgs) { img.click(); await new Promise(ok => setTimeout(ok, 50)); }
			await new Promise(ok => setTimeout(ok, 500));
			return "ok";
		}), 6000);
		if (r === "TRAVOU") { travou = true; linhas.push("ao abrir os \"+\": NOVA ABA PAROU DE RESPONDER"); }
	}
	contexto.off("page", escutar);
	for (const p of contexto.pages()) await p.close({ runBeforeUnload: false }).catch(() => {});
	return { travou, linhas, avisos };
}

const metadata = path.join(extensao, "_metadata");
const metadataJaExistia = fs.existsSync(metadata);
process.on("exit", () => { if (!metadataJaExistia) fs.rmSync(metadata, { recursive: true, force: true }); });

const versao = JSON.parse(fs.readFileSync(path.join(extensao, "manifest.json"), "utf8")).version;
console.log("Extensão " + versao + " (" + extensao + ")\n");
let algumTravou = false;
for (const s of Object.keys(SISTEMAS)) {
	for (const tela of ["analisarJuntada", "conclusao"]) {
		const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "pdp-nova-aba-"));
		const contexto = await playwright.chromium.launchPersistentContext(perfil, {
			headless: false,
			args: ["--no-first-run", "--headless=new", "--disable-extensions-except=" + extensao, "--load-extension=" + extensao],
			viewport: { width: 1366, height: 1000 },
		});
		try {
			await rotear(contexto);
			let sw = contexto.serviceWorkers()[0];
			if (!sw) sw = await contexto.waitForEvent("serviceworker");
			await sw.evaluate(async function () {
				await chrome.storage.local.set({ pdpTermosUso: { aceito: true, versao: PDP_TERMOS.versao, em: Date.now() } });
				await pdpSincronizar();
			});
			for (const p of contexto.pages()) if (p.url().startsWith("chrome-extension://")) await p.close();
			const r = await cenario(contexto, s, tela);
			algumTravou = algumTravou || r.travou;
			console.log((r.travou ? "TRAVOU " : "OK     ") + s + " / " + tela);
			for (const l of r.linhas) console.log("         " + l);
			for (const a of [...new Set(r.avisos)]) console.log("         aviso: " + a);
		} finally {
			await contexto.close().catch(() => {});
			fs.rmSync(perfil, { recursive: true, force: true });
		}
	}
}
console.log(algumTravou ? "\nRESULTADO: TRAVOU" : "\nRESULTADO: OK, todas as abas continuaram respondendo");
process.exit(algumTravou ? 1 : 0);
