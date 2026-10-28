// Confere a pré-visualização do processo ao passar o mouse sobre o número
// na lista Retorno de Conclusão do Projudi (processo/conclusao.do): carrega
// a extensão num Chromium, abre uma lista que imita a do Projudi e passa o
// mouse, um a um, sobre o número de cada processo.
//
// Não faz parte da extensão (não é carregado pelo navegador do usuário): é
// uma ferramenta de quem mantém o código.
//
// Uso (na pasta extensao-preview-documentos):
//   node desempenho/retorno-conclusao-hover.mjs
// Variáveis: LINHAS (padrão 12); COM_LINK=1 faz a tela "Dados da
// Conclusão" trazer o link do processo (sem ele, o painel usa a busca por
// número); CONTINUO=1 leva o mouse de um número direto para o seguinte (sem
// sair da lista); LARGURA/ALTURA da janela (padrão 1600x1000);
// LATENCIA=<ms> atrasa as respostas do "Projudi";
// CONSOLE=<regex> mostra mensagens do console; PEDIDOS=1 lista os pedidos.
//
// Sai com código 1 se algum número não abrir o processo certo no painel.
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
const ORIGEM = "https://projudi.tjpr.jus.br";
const LINHAS = Number(process.env.LINHAS || 12);
const COM_LINK = !!process.env.COM_LINK;
const CONTINUO = !!process.env.CONTINUO;
const LATENCIA = Number(process.env.LATENCIA || 0);

const cnj = i => String(1000 + i).padStart(7, "0") + "-12.2026.8.16.0001";
const CABECALHO = '<div id="userinfo">Usuário: TESTE &nbsp; Atribuição: Analista Judiciário</div>';
const html = corpo => `<!doctype html><html><head><meta charset="utf-8"><title>Projudi</title></head><body>${CABECALHO}${corpo}</body></html>`;

function lista() {
	let linhas = "";
	for (let i = 0; i < LINHAS; i++) {
		linhas += `<tr class="${i % 2 ? "odd" : "even"}"><td><input type="checkbox" name="ids" value="${i}"></td>` +
			`<td><em class="attention">${cnj(i)}</em> <a class="link" href="#" title="Copiar">📋</a></td>` +
			`<td>Fulano ${i} x Beltrano ${i}</td><td>Despacho</td><td>2${i % 10}/10/2026</td>` +
			`<td><a class="link" href="/projudi/processo/conclusao.do?_tj=dados${i}">Analisar</a></td></tr>`;
	}
	return html(`<h3>Retorno de Conclusão</h3><table class="resultTable"><thead><tr><th></th><th>Processo</th><th>Partes</th><th>Tipo</th><th>Data</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`);
}

const dadosConclusao = i => html(`<h3>Dados da Conclusão</h3>
${COM_LINK ? `<a class="link" href="/projudi/processo.do?_tj=proc${i}">${cnj(i)}</a>` : `<em class="attention">${cnj(i)}</em>`}
<input type="button" id="editButton" value="Analisar" onclick="document.location.href='/projudi/processo/conclusao.do?_tj=mov${i}'">`);

const processo = i => html(`<h3 id="barraTituloStatusProcessual">Processo <em class="attention">${cnj(i)}</em></h3>
<form id="processoForm" name="processoForm" method="post" action="/projudi/processo.do"><input type="hidden" name="selectedIcon" value="tabMovimentacoesProcesso"></form>
<table><tr id="mov1Grau1"><td>Movimentação do processo ${cnj(i)}</td></tr></table>`);

function busca(numero) {
	const i = numero ? Number(numero.slice(0, 7)) - 1000 : -1;
	return html(`<form id="buscaProcessoForm" method="post" action="/projudi/processo/buscaProcesso.do?actionType=pesquisar">
<input type="checkbox" id="flagNumeroUnico"><input type="hidden" id="flagNumeroUnicoHidden"><input type="hidden" id="flagNumeroFisicoAntigo">
<input type="text" id="numeroProcesso" name="numeroProcesso"><input type="submit" id="pesquisar" value="Pesquisar"></form>
${i >= 0 ? `<table class="resultTable"><tr><td><a class="link" href="/projudi/processo.do?_tj=proc${i}">${cnj(i)}</a></td></tr></table>` : ""}`);
}

const metadata = path.join(extensao, "_metadata");
const metadataJaExistia = fs.existsSync(metadata);
process.on("exit", () => { if (!metadataJaExistia) fs.rmSync(metadata, { recursive: true, force: true }); });

const pedidos = [];
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "pdp-conclusao-"));
const contexto = await playwright.chromium.launchPersistentContext(perfil, {
	headless: false,
	args: ["--no-first-run", "--headless=new", "--disable-extensions-except=" + extensao, "--load-extension=" + extensao],
	viewport: { width: Number(process.env.LARGURA || 1600), height: Number(process.env.ALTURA || 1000) },
});
let falhas = 0;
try {
	await contexto.route(ORIGEM + "/**", async function (route) {
		const req = route.request();
		const url = new URL(req.url());
		const tj = url.searchParams.get("_tj") || "";
		pedidos.push(req.method() + " " + url.pathname + url.search);
		if (LATENCIA && url.search) await new Promise(ok => setTimeout(ok, LATENCIA));
		let corpo;
		if (url.pathname === "/projudi/processo/conclusao.do") {
			if (!tj) corpo = lista();
			else if (tj.startsWith("dados")) corpo = dadosConclusao(Number(tj.slice(5)));
			else corpo = html(`<h3>Movimentar Processo</h3>`);
		} else if (url.pathname === "/projudi/processo.do") corpo = processo(Number(tj.slice(4)));
		else if (url.pathname === "/projudi/processo/buscaProcesso.do") {
			const numero = req.method() === "POST" ? new URLSearchParams(req.postData() || "").get("numeroProcesso") : "";
			corpo = busca(numero);
		} else corpo = html("");
		return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: corpo });
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
	await pagina.goto(ORIGEM + "/projudi/processo/conclusao.do", { waitUntil: "load" });
	await pagina.waitForTimeout(2500);

	for (let i = 0; i < LINHAS; i++) {
		const numero = pagina.locator("em.attention", { hasText: cnj(i) });
		if (CONTINUO) {
			// Desce do número anterior direto para este, como a mão faz.
			await numero.scrollIntoViewIfNeeded();
			const caixa = await numero.boundingBox();
			await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 15 });
		} else {
			await pagina.mouse.move(5, 5);
			await pagina.waitForTimeout(500);
			await numero.hover();
		}
		let resultado = "painel não abriu";
		const fim = Date.now() + 8000 + LATENCIA * 4;
		while (Date.now() < fim) {
			await pagina.waitForTimeout(200);
			const r = await pagina.evaluate(() => {
				const w = document.querySelector(".pdp-pp-overlay");
				const f = w && w.querySelector("iframe");
				let mostrado = "";
				try { mostrado = (f.contentDocument.querySelector("#barraTituloStatusProcessual") || {}).textContent || ""; } catch (e) { /* segue */ }
				return { visivel: !!w && w.classList.contains("pdp-pp-visible"), carregado: !!w && w.classList.contains("pdp-pp-loaded"), src: f ? f.src : "", mostrado };
			});
			// O painel anterior pode seguir na tela até o novo abrir (espera de
			// 450 ms): só para quando mostrar este processo.
			if (r.visivel && r.carregado && r.mostrado.indexOf(cnj(i)) !== -1) { resultado = "OK"; break; }
			if (r.visivel && r.carregado) { resultado = "mostrou outro: " + (r.mostrado || r.src); continue; }
			if (r.visivel) resultado = "painel aberto, sem carregar (" + r.src + ")";
		}
		if (resultado !== "OK") falhas++;
		console.log("  " + String(i + 1).padStart(2) + "º processo " + cnj(i) + ": " + resultado);
	}
	if (process.env.PEDIDOS) console.log(pedidos.join("\n"));
} finally {
	await contexto.close().catch(() => {});
	fs.rmSync(perfil, { recursive: true, force: true });
}
console.log(falhas ? "\nRESULTADO: " + falhas + " processo(s) sem pré-visualização" : "\nRESULTADO: OK, todos abriram");
process.exit(falhas ? 1 : 0);
