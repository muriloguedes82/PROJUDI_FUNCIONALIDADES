// Gera o pacote da extensão para o Firefox (addons.mozilla.org).
//
// Uso, na raiz do repositório:
//   node extensao-preview-documentos/store/firefox/gerar-pacote-firefox.mjs [saida.zip]
//
// Parte da mesma pasta da edição da Chrome Web Store e só muda o que o
// Firefox exige; o código da extensão é o mesmo:
//   - manifest.json: nome de até 45 caracteres; processo de fundo como lista de scripts
//     (background.scripts), identificador do complemento e declaração de
//     coleta de dados (browser_specific_settings.gecko) e sem as permissões
//     que o Firefox não conhece (offscreen, system.display, windows);
//   - src/firefox-compat.js (cópia de store/firefox/firefox-compat.js),
//     carregado antes dos demais scripts de fundo.
// Ficam de fora os mesmos arquivos do pacote do Chrome (anotações, a pasta
// store/, _metadata etc.); o manual (manual/MANUAL.md) vai junto.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(AQUI, "..", "..");
const saida = path.resolve(process.argv[2] || path.join(EXT, "..", "assistente-projudi-firefox.zip"));

const ID_FIREFOX = "assistente-projudi@muriloguedes82";
const VERSAO_MINIMA = "140.0"; // declaração de coleta de dados (data_collection_permissions)
// O Firefox aceita nomes de até 45 caracteres.
const NOME_FIREFOX = "Assistente Projudi – Ações e Pré-visualização";
const SEM_NO_FIREFOX = ["offscreen", "system.display", "windows"];
const SCRIPTS_FUNDO = [
	"src/firefox-compat.js",
	"src/termosConfig.js",
	"src/funcionalidades.js",
	"src/termosUso.js",
	"src/sistemasCnjLista.js",
	"src/background.js"
];

const fora = (rel) =>
	rel.startsWith("_metadata") || rel.startsWith("desempenho") || rel.startsWith("store") ||
	rel === "RECONSTRUCAO-CHROME-2.9.9.txt" || rel === "icones.png" ||
	rel === "manual/MANUAL.pdf" || /^manual\/.*\.mjs$/.test(rel) ||
	(rel.endsWith(".md") && rel !== "manual/MANUAL.md");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "assistente-projudi-firefox-"));
const copiar = (dir) => {
	for (const nome of fs.readdirSync(path.join(EXT, dir))) {
		const rel = dir ? dir + "/" + nome : nome;
		if (fora(rel)) continue;
		const origem = path.join(EXT, rel);
		if (fs.statSync(origem).isDirectory()) { fs.mkdirSync(path.join(tmp, rel), { recursive: true }); copiar(rel); }
		else fs.copyFileSync(origem, path.join(tmp, rel));
	}
};
copiar("");
fs.copyFileSync(path.join(AQUI, "firefox-compat.js"), path.join(tmp, "src", "firefox-compat.js"));

const m = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
const novo = {};
for (const [chave, valor] of Object.entries(m)) {
	if (chave === "background") novo.background = { scripts: SCRIPTS_FUNDO };
	else if (chave === "name") novo.name = NOME_FIREFOX;
	else if (chave === "action") novo.action = Object.assign({}, valor, { default_title: NOME_FIREFOX });
	else if (chave === "permissions") novo.permissions = valor.filter((p) => !SEM_NO_FIREFOX.includes(p));
	else novo[chave] = valor;
	if (chave === "version") {
		novo.browser_specific_settings = {
			gecko: {
				id: ID_FIREFOX,
				strict_min_version: VERSAO_MINIMA,
				data_collection_permissions: { required: ["websiteContent", "personalCommunications"] }
			}
		};
	}
}
for (const arq of SCRIPTS_FUNDO) if (!fs.existsSync(path.join(tmp, arq))) throw new Error("Falta " + arq);
fs.writeFileSync(path.join(tmp, "manifest.json"), JSON.stringify(novo, null, 2) + "\n");

fs.rmSync(saida, { force: true });
execFileSync("zip", ["-qr", "-X", saida, "."], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Pacote do Firefox gerado:", saida, "(versão " + novo.version + ")");
