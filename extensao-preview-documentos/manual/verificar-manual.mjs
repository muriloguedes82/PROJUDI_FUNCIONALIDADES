// Verifica se o manual está coerente com a extensão e com os vídeos.
//
// Uso (na raiz do repositório):
//   node extensao-preview-documentos/manual/verificar-manual.mjs              -> só verifica (usado no CI)
//   node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir   -> também regrava a tabela do Anexo A
//
// Regras verificadas:
//  1. "Versão do manual" e "Versão da extensão" (capa) = version do manifest.json;
//  2. o Anexo B (histórico) tem uma linha para essa versão;
//  3. todo link interno (#...) aponta para uma âncora <a id="..."> existente;
//  4. todo vídeo citado no texto existe em manual/videos/;
//  5. toda cena de manual/videos/fonte/cenas*.js tem o seu MP4 e é citada no texto;
//  6. a tabela do Anexo A está igual à gerada a partir das cenas (título, seção, duração).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(aqui, "..");
const manualPath = path.join(aqui, "MANUAL.md");
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
const fonte = path.join(aqui, "videos", "fonte");
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
	const arq = path.join(aqui, "videos", c.arquivo);
	let dur = "—";
	if (!fs.existsSync(arq)) erros.push(`${c.id}: vídeo não encontrado (manual/videos/${c.arquivo}). Gere com: node extensao-preview-documentos/manual/videos/fonte/gravar.mjs ${c.id}`);
	else dur = mmss(duracaoMp4(arq));
	const ancora = "cap-" + c.secao.replace(/\./g, "-");
	if (!ids.has(ancora)) erros.push(`${c.id}: seção ${c.secao} não existe no manual.`);
	const citado = md.split('<a id="anexo-a"></a>')[0].includes("](videos/" + c.arquivo + ")");
	if (!citado) erros.push(`${c.id}: o vídeo não é citado em nenhuma seção do manual.`);
	linhas.push(`| [${c.id}](videos/${c.arquivo}) | [${c.titulo}](videos/${c.arquivo}) | [${c.secao}](#${ancora}) | ${dur} |`);
}

// 4 — vídeos citados
for (const [, v] of md.matchAll(/\]\(videos\/([^)]+\.mp4)\)/g))
	if (!fs.existsSync(path.join(aqui, "videos", v))) erros.push(`Vídeo citado e inexistente: videos/${v}`);

// 6 — tabela do Anexo A
const ini = "<!-- tabela-videos:inicio -->", fim = "<!-- tabela-videos:fim -->";
const a = md.indexOf(ini), b = md.indexOf(fim);
if (a < 0 || b < 0) erros.push("Anexo A: marcadores da tabela de vídeos não encontrados.");
else {
	const nova = ini + "\n" + linhas.join("\n") + "\n" + fim;
	if (md.slice(a, b + fim.length) !== nova) {
		if (corrigir) {
			md = md.slice(0, a) + nova + md.slice(b + fim.length);
			fs.writeFileSync(manualPath, md);
			console.log("Anexo A: tabela de vídeos regravada.");
		} else erros.push("Anexo A: tabela de vídeos desatualizada. Rode: node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir");
	}
}

if (erros.length) {
	console.error("Manual com pendências (" + erros.length + "):\n - " + erros.join("\n - "));
	process.exit(1);
}
console.log(`Manual OK: versão ${versao}, ${cenas.length} vídeos.`);
