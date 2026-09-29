// Gera os vídeos do manual quadro a quadro, sob relógio virtual (Playwright),
// e codifica em MP4 (H.264) com ffmpeg.
//
// Uso (na raiz do repositório):
//   node manual/videos/fonte/gravar.mjs            -> todos os vídeos
//   node manual/videos/fonte/gravar.mjs V07 V12    -> só os indicados
//   CHECAR=1 node manual/videos/fonte/gravar.mjs   -> só roda as cenas (sem gravar) e acusa erros
//
// Requisitos: Node 18+, pacote "playwright" (global ou local) com Chromium,
// e um ffmpeg com libx264 (variável FFMPEG, ou "ffmpeg" no PATH).
import { createRequire } from "node:module";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.resolve(aqui, "..");
const FPS = 25;
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const browser = await playwright.chromium.launch();
const page0 = await browser.newPage();
await page0.goto(pathToFileURL(path.join(aqui, "palco.html")).href);
const cenas = await page0.evaluate(() => Object.entries(CENAS).map(([id, c]) => ({ id, arquivo: c.arquivo })));
await page0.close();

const pedidos = process.argv.slice(2);
const lista = pedidos.length ? cenas.filter(c => pedidos.includes(c.id)) : cenas;
if (!lista.length) { console.error("Nenhuma cena encontrada para", pedidos.join(", ")); process.exit(1); }

for (const cena of lista) {
	const destino = path.join(saida, cena.arquivo);
	const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
	const page = await context.newPage();
	const t0 = new Date("2026-09-29T10:00:00").getTime();
	await page.clock.install({ time: t0 });
	await page.goto(pathToFileURL(path.join(aqui, "palco.html")).href);
	await page.clock.pauseAt(t0 + 60000); // o tempo só anda com runFor()
	await page.evaluate(id => { window.__rodar(id); }, cena.id);

	if (process.env.CHECAR) {
		let t = 0;
		while (!(await page.evaluate(() => window.__fim === true)) && t < 240) { await page.clock.runFor(1000); t++; }
		const erro = await page.evaluate(() => window.__erro);
		console.log(cena.id + (erro ? " ERRO: " + erro : " ok (" + t + " s)"));
		if (erro) process.exitCode = 1;
		await context.close();
		continue;
	}

	const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
		"-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-tune", "stillimage", destino],
		{ stdio: ["pipe", "inherit", "inherit"] });
	const fimFF = new Promise((ok, erro) => ff.on("close", c => (c === 0 ? ok() : erro(new Error("ffmpeg saiu com " + c)))));

	let quadros = 0;
	for (;;) {
		const buf = await page.screenshot({ type: "jpeg", quality: 92 });
		if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
		quadros++;
		if (await page.evaluate(() => window.__fim === true)) break;
		if (quadros > FPS * 240) throw new Error(cena.id + ": cena não terminou em 4 minutos");
		await page.clock.runFor(1000 / FPS);
	}
	ff.stdin.end();
	await fimFF;
	const erro = await page.evaluate(() => window.__erro);
	await context.close();
	if (erro) { console.error(cena.id + " ERRO: " + erro); process.exitCode = 1; continue; }
	console.log(cena.id + " -> " + path.relative(process.cwd(), destino) + " (" + (quadros / FPS).toFixed(1) + " s)");
}
await browser.close();
