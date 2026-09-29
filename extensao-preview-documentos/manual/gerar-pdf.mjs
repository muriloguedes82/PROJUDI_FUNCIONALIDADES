// Gera manual/MANUAL.pdf a partir de MANUAL.md (Markdown -> HTML -> PDF via Chromium/Playwright).
// Uso: node extensao-preview-documentos/manual/gerar-pdf.mjs   (requer python3 com o pacote "markdown" e o playwright)
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execFileSync("npm", ["root", "-g"]).toString().trim(), "playwright")); }
const aqui = path.dirname(fileURLToPath(import.meta.url));
// O conversor exige 4 espaços para listas aninhadas; o manual usa 2 ou 3.
const md = fs.readFileSync(path.join(aqui, "MANUAL.md"), "utf8").replace(/^ {2,3}(?=[-*] )/gm, "    ");
const corpo = execFileSync("python3", ["-c", "import sys,markdown;print(markdown.markdown(sys.stdin.read(),extensions=['tables','fenced_code']))"], { input: md, maxBuffer: 1 << 28 }).toString();
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Manual — Extensão Projudi/SEEU</title><style>
@page{size:A4;margin:18mm 16mm}
body{font:11pt/1.5 "Liberation Sans",Arial,sans-serif;color:#222}
h1{color:#0d3560;font-size:24pt;margin:0 0 6pt}h2{color:#0d3560;font-size:16pt;border-bottom:2px solid #174a7c;padding-bottom:3pt;margin-top:26pt;break-after:avoid}
h3{color:#174a7c;font-size:13pt;margin-top:18pt;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:9.5pt;break-inside:auto}tr{break-inside:avoid}
th,td{border:1px solid #b8c6d6;padding:4pt 6pt;vertical-align:top;text-align:left}th{background:#e4ebf2}
blockquote{margin:8pt 0;padding:6pt 12pt;background:#fff8d8;border-left:4px solid #d9c46a}
code{background:#f1f3f4;padding:0 3pt;border-radius:2pt;font-size:9.5pt}pre{background:#f1f3f4;padding:8pt;white-space:pre-wrap}
a{color:#0645ad;text-decoration:none}hr{border:0;border-top:1px solid #ccc;margin:14pt 0}li{margin:2pt 0}
</style><body>${corpo}</body></html>`;
const tmp = path.join(aqui, ".manual-pdf.html");
fs.writeFileSync(tmp, html);
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.pdf({ path: path.join(aqui, "MANUAL.pdf"), format: "A4", printBackground: true,
	displayHeaderFooter: true, headerTemplate: "<span></span>",
	footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">Manual da extensão Projudi/SEEU — versão 2.9.88 — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>' });
await browser.close();
if (!process.env.MANTER_HTML) fs.unlinkSync(tmp);
console.log("MANUAL.pdf gerado");
