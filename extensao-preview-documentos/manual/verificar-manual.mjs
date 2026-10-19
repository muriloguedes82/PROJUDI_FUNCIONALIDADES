// Verifica se o manual está coerente com a extensão e com os vídeos.
//
// Os vídeos ficam FORA da extensão, em videos-do-manual/ (raiz do
// repositório): continuam sendo gravados a cada função nova, mas não vão
// com a extensão nem são citados no manual (decisão do usuário, versão
// 2.53.2). O índice deles fica em videos-do-manual/README.md.
//
// Uso (na raiz do repositório):
//   node extensao-preview-documentos/manual/verificar-manual.mjs              -> só verifica (rodar antes de cada commit)
//   node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir   -> também regrava o índice dos vídeos
//
// Regras verificadas:
//  1. "Versão do manual" e "Versão da extensão" (capa) = version do manifest.json;
//  2. o Anexo B (histórico) tem uma linha para essa versão;
//  3. todo link interno (#...) aponta para uma âncora <a id="..."> existente;
//  4. o manual não cita vídeos (eles não vão com a extensão);
//  5. toda cena de videos-do-manual/fonte/cenas*.js tem o seu MP4 e aponta para uma seção existente;
//  6. o índice de videos-do-manual/README.md está igual ao gerado a partir das cenas (título, seção, duração).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(aqui, "..");
const manualPath = path.join(aqui, "MANUAL.md");
const videos = path.resolve(ext, "..", "videos-do-manual");
const indicePath = path.join(videos, "README.md");
const corrigir = process.argv.includes("--corrigir");
const erros = [];

const versao = JSON.parse(fs.readFileSync(path.join(ext, "manifest.json"), "utf8")).version;
let md = fs.readFileSync(manualPath, "utf8");

// 1 e 2 — versões
const vManual = /\*\*Versão do manual\*\*\s*\|\s*([^\s|]+)/.exec(md)?.[1];
const vExt = /\*\*Versão da extensão\*\*\s*\|\s*([^\s|]+)/.exec(md)?.[1];
if (vManual !== versao) erros.push(`Capa: "Versão do manual" é ${vManual}, mas o manifest.json está em ${versao}.`);
if (vExt !== versao) erros.push(`Capa: "Versão da extensão" é ${vExt}, mas o manifest.json está em ${versao}.`);
const anexoB = md.slice(md.indexOf('<a id="anexo-b"></a>'));
if (!new RegExp("^\\|\\s*" + versao.replace(/\./g, "\\.") + "\\s*\\|", "m").test(anexoB))
	erros.push(`Anexo B: falta a linha do histórico para a versão ${versao}.`);

// 3 — âncoras
const ids = new Set([...md.matchAll(/<a id="([^"]+)"><\/a>/g)].map(m => m[1]));
for (const [, alvo] of md.matchAll(/\]\(#([^)]+)\)/g)) if (!ids.has(alvo)) erros.push(`Link interno sem âncora: #${alvo}`);

// 5 — cenas
const fonte = path.join(videos, "fonte");
const cenas = [];
for (const f of fs.readdirSync(fonte).filter(n => /^cenas\d*\.js$/.test(n)).sort()) {
	const js = fs.readFileSync(path.join(fonte, f), "utf8");
	for (const m of js.matchAll(/CENAS\.(V\d+) = \{\s*arquivo: "([^"]+)",\s*titulo: "([^"]+)",\s*secao: "([^"]+)",/g))
		cenas.push({ id: m[1], arquivo: m[2], titulo: m[3], secao: m[4] });
}
cenas.sort((a, b) => a.id.localeCompare(b.id));

function duracaoMp4(arquivo) {
	const buf = fs.readFileSync(arquivo);
	const i = buf.indexOf("mvhd");
	if (i < 0) return null;
	const v = buf[i + 4];
	const escala = v === 1 ? buf.readUInt32BE(i + 24) : buf.readUInt32BE(i + 16);
	const dur = v === 1 ? Number(buf.readBigUInt64BE(i + 28)) : buf.readUInt32BE(i + 20);
	return dur / escala;
}
const mmss = s => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

const linhas = ["| Vídeo | Função | Seção do manual | Duração |", "|---|---|---|---|"];
for (const c of cenas) {
	const arq = path.join(videos, c.arquivo);
	let dur = "—";
	if (!fs.existsSync(arq)) erros.push(`${c.id}: vídeo não encontrado (videos-do-manual/${c.arquivo}). Gere com: node videos-do-manual/fonte/gravar.mjs ${c.id}`);
	else dur = mmss(duracaoMp4(arq));
	const ancora = "cap-" + c.secao.replace(/\./g, "-");
	if (!ids.has(ancora)) erros.push(`${c.id}: seção ${c.secao} não existe no manual.`);
	linhas.push(`| [${c.id}](${c.arquivo}) | [${c.titulo}](${c.arquivo}) | [${c.secao}](../extensao-preview-documentos/manual/MANUAL.md#${ancora}) | ${dur} |`);
}

// 4 — o manual não cita vídeos
for (const [, v] of md.matchAll(/\]\(([^)]*\.mp4)\)/g))
	erros.push(`O manual cita um vídeo (${v}), mas os vídeos não vão mais com a extensão: retire o link.`);

// 6 — índice dos vídeos (videos-do-manual/README.md)
const ini = "<!-- tabela-videos:inicio -->", fim = "<!-- tabela-videos:fim -->";
let indice = fs.existsSync(indicePath) ? fs.readFileSync(indicePath, "utf8") : "";
const a = indice.indexOf(ini), b = indice.indexOf(fim);
if (a < 0 || b < 0) erros.push("videos-do-manual/README.md: marcadores da tabela de vídeos não encontrados.");
else {
	const nova = ini + "\n" + linhas.join("\n") + "\n" + fim;
	if (indice.slice(a, b + fim.length) !== nova) {
		if (corrigir) {
			indice = indice.slice(0, a) + nova + indice.slice(b + fim.length);
			fs.writeFileSync(indicePath, indice);
			console.log("videos-do-manual/README.md: tabela de vídeos regravada.");
		} else erros.push("videos-do-manual/README.md: tabela de vídeos desatualizada. Rode: node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir");
	}
}

if (erros.length) {
	console.error("Manual com pendências (" + erros.length + "):\n - " + erros.join("\n - "));
	process.exit(1);
}
console.log(`Manual OK: versão ${versao}, ${cenas.length} vídeos guardados em videos-do-manual/.`);
