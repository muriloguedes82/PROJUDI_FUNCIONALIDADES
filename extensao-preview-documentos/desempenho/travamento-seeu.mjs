// Confere se a tela do processo do SEEU (aba Movimentações) trava com a
// extensão: carrega a extensão num Chromium, abre uma tela que imita a do
// SEEU e verifica se a página continua respondendo.
//
// Não faz parte da extensão (não é carregado pelo navegador do usuário): é
// uma ferramenta de quem mantém o código. Ver DIAGNOSTICO-TRAVAMENTO-SEEU.md.
//
// Uso (na pasta extensao-preview-documentos):
//   node desempenho/travamento-seeu.mjs
//
// Sai com código 1 se a página parar de responder (laço sem fim).
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
const ORIGEM = "https://seeu.pje.jus.br";
const LINHAS = Number(process.env.LINHAS || 60);

// Quadro "Movimentações" como o SEEU o monta (ver
// DIAGNOSTICO-PREVIEW-MOVIMENTACOES-SEEU.md): "+" ligado por classe, linha
// oculta com o div dos arquivos, preenchido só depois do clique.
function movimentacoes(n) {
	let html = "";
	for (let i = 0; i < n; i++) {
		html += '<tr class="' + (i % 2 ? "odd" : "even") + '" id=""><td><a class="linkArquivos' + i + '"><img src="/seeu/imagens/iPlus.gif" id="icon' + i + '"></a></td>' +
			'<td>' + String(1 + (i % 28)).padStart(2, "0") + '/03/2026 12:20:45</td><td><b>DOCUMENTO</b><br>Guia de Recolhimento Penal ' + i + '</td></tr>' +
			'<tr id="row' + i + '" style="display:none"><td colspan="5"><div id="div' + i + '" class="extendedinfo"></div></td></tr>';
	}
	return html;
}

const TELA = `<!doctype html><html><head><meta charset="utf-8"><title>SEEU</title></head><body>
<div id="userinfo">Usuário: TESTE &nbsp; Atribuição: Analista Judiciário</div>
${process.env.SEM_LOCALIZADOR ? "" : "<seeu-localizador-processo-header></seeu-localizador-processo-header>"}
<h3 id="barraTituloStatusProcessual">Processo 0001234-56.2026.8.16.0001</h3>
<form id="processoForm" name="processoForm" method="post" action="/seeu/visualizacaoProcesso.do?actionType=visualizar"><input type="hidden" name="_tj" value="abc"></form>
<table id="informacoesProcessuais"><tr><td>Classe Processual:</td><td>Execução da Pena</td></tr></table>
<div id="toolbar"><input type="button" value="Peticionar"><input type="button" value="Juntar Documento"><input type="button" value="Voltar"></div>
<ul><li class="currentTab"><a href="#">Movimentações</a></li><li><a href="#">Partes</a></li></ul>
<table class="resultTable" id="movimentacoes"><tbody>${movimentacoes(LINHAS)}</tbody></table>
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

async function comPrazo(promessa, ms) {
	let t;
	const limite = new Promise(ok => { t = setTimeout(() => ok("TRAVOU"), ms); });
	try { return await Promise.race([promessa, limite]); } finally { clearTimeout(t); }
}

const metadata = path.join(extensao, "_metadata");
const metadataJaExistia = fs.existsSync(metadata);
process.on("exit", () => { if (!metadataJaExistia) fs.rmSync(metadata, { recursive: true, force: true }); });

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "pdp-trava-"));
const contexto = await playwright.chromium.launchPersistentContext(perfil, {
	headless: false,
	args: ["--no-first-run", "--headless=new", "--disable-extensions-except=" + extensao, "--load-extension=" + extensao],
	viewport: { width: 1366, height: 1000 },
});
let travou = false;
try {
	await contexto.route(ORIGEM + "/**", function (route) {
		const url = route.request().url();
		if (/\.gif/.test(url)) return route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAAAAACw=", "base64") });
		if (/arquivo\.do/.test(url)) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
		return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: TELA });
	});
	let sw = contexto.serviceWorkers()[0];
	if (!sw) sw = await contexto.waitForEvent("serviceworker");
	await sw.evaluate(async function () {
		await chrome.storage.local.set({ pdpTermosUso: { aceito: true, versao: PDP_TERMOS.versao, em: Date.now() } });
		await pdpSincronizar();
	});
	for (const p of contexto.pages()) if (p.url().startsWith("chrome-extension://")) await p.close();

	const pagina = await contexto.newPage();
	if (process.env.CONSOLE) pagina.on("console", m => { if (new RegExp(process.env.CONSOLE).test(m.text())) console.log("    [console]", m.text().slice(0, 300)); });
	pagina.goto(ORIGEM + "/seeu/visualizacaoProcesso.do?actionType=visualizar", { waitUntil: "load", timeout: 15000 }).catch(() => {});

	// Responde a cada segundo por 8 s (a extensão monta os botões depois do
	// document_idle e após ler o chrome.storage).
	for (let s = 1; s <= 8; s++) {
		await new Promise(ok => setTimeout(ok, 1000));
		const r = await comPrazo(pagina.evaluate(() => ({
			fav: !!document.getElementById("pdp-fav-prefs-button"),
			advogados: !!document.getElementById("pdp-habilitar-advogado-button"),
			localizador: !!document.getElementById("pdp-localizador-button"),
		})), 4000);
		if (r === "TRAVOU") { travou = true; console.log("  " + s + " s: a página PAROU DE RESPONDER"); break; }
		console.log("  " + s + " s: responde | botões: ⭐ " + r.fav + ", Advogados " + r.advogados + ", Localizador " + r.localizador);
	}
	if (!travou) {
		const r = await comPrazo(pagina.evaluate(async () => {
			const imgs = [...document.querySelectorAll("a[class^='linkArquivos'] img")].slice(0, 10);
			for (const img of imgs) { img.click(); await new Promise(ok => setTimeout(ok, 50)); }
			await new Promise(ok => setTimeout(ok, 500));
			return document.querySelectorAll("img[src*='iMinus']").length;
		}), 6000);
		if (r === "TRAVOU") { travou = true; console.log("  ao abrir os \"+\": a página PAROU DE RESPONDER"); }
		else console.log("  ao abrir os \"+\": responde (" + r + " abertos)");
	}
} finally {
	await contexto.close().catch(() => {});
	fs.rmSync(perfil, { recursive: true, force: true });
}
console.log(travou ? "\nRESULTADO: TRAVOU" : "\nRESULTADO: OK, a página continuou respondendo");
process.exit(travou ? 1 : 0);
