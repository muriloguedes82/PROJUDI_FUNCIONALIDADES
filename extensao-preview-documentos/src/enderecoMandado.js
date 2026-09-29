// Projudi - Endereço da parte e Mandado Regionalizado na ordenação
//
// No diálogo "Ordenar Cumprimentos" (`cumprimentoCartorio.do`, formulário
// `#cumprimentoCartorioForm`), a linha "Referente a(s) parte(s):" lista só
// o tipo e o nome de cada parte. Para saber se o mandado vai para um
// endereço da própria comarca ou de outra (Mandado Regionalizado), é
// preciso abrir a aba "Partes e Outros" do processo e conferir o endereço.
//
// Este recurso:
// 1. mostra, logo abaixo de cada parte MARCADA, o(s) endereço(s) dela
//    cadastrados na aba "Partes e Outros" do processo;
// 2. quando o usuário marca/desmarca partes (ou escolhe o Tipo de
//    Cumprimento "MANDADO" depois de marcá-las) e a seção "Dados do
//    Mandado" está visível, confere a cidade do endereço:
//    - cidade de OUTRA comarca que consta da lista "Comarca de Destino" ->
//      muda "Tipo do Mandado" para "Mandado Regionalizado" e marca essa
//      comarca (disparando o `onchange` nativo, que exibe a linha "Comarca
//      de Destino" e carrega as Centrais de Mandados);
//    - cidade da própria comarca -> mantém "Mandado Comum" (e desfaz o
//      "Regionalizado" se tiver sido este recurso que o escolheu);
//    - endereço sem cidade identificável, partes em comarcas diferentes ou
//      cidade fora da lista -> NÃO altera nada; uma nota explica o motivo.
//    Só reage a cliques/escolhas reais do usuário (`event.isTrusted`), para
//    não interferir no reenvio em segundo plano do "Nova Ordenação"
//    (ordenarCumprimentos.js), que reaplica os campos já escolhidos.
//
// A comarca do juízo vem do link "Atuação" do cabeçalho do Projudi
// (`#areaatuacao`, ex.: "Vara Criminal de Pinhais" -> Pinhais), lido da
// tela do processo por trás do diálogo (popup das Ações rápidas: `parent`;
// janela nativa: `opener`) ou, na falta, do último valor guardado em
// `sessionStorage` por este script ao passar por uma tela que o tenha.
//
// De onde vêm os endereços: a mesma aba "Partes e Outros" lida por
// reusCabecalho.js - se a tela do processo por trás do diálogo já a
// mostra, lê direto; senão, POST para o `#processoForm` dessa tela com
// `selectedIcon=tabPartes`. Nessa aba, cada parte é uma linha da
// `table.resultTable` do polo (link `parteProcesso.do` no nome) seguida de
// uma linha oculta com os endereços (<tr id="rowpromovidas0"
// style="display:none">, "promoventes", "vitimas", "testemunhas"...). A
// cidade é lida de "Cidade: CURITIBA/PR" (mesmo formato do endereço que o
// próprio Projudi mostra no "Cumprimento de Vinculação"), de uma coluna
// "Cidade"/"Município" ou, por último, pelo nome de uma das comarcas
// conhecidas (a do juízo e as da lista "Comarca de Destino") no texto.
//
// Estrutura real do diálogo confirmada a partir de .mhtml salvos do Projudi
// (TJPR): partes em <tr id="rowPartesMultiplas"> (checkbox
// "idxParteSelecionada"), <tr id="rowPartesMultiplasPoloPassivo">
// ("idxPartesSolicitadas") ou <tr id="rowParteUnica"> (radio
// "idxParteUnicaSelecionada"), cada uma como `<input> (Tipo) NOME <br>`;
// <div id="divMandados"> com <select id="codTipoMandadoOficialJustica"
// onchange="habilitarMandadoRegionalizado(this.value)"> (1 = Mandado Comum,
// 2 = Mandado Regionalizado) e <tr id="rowComarcaRegionalizada"> com
// <select id="codComarcaDestinoMandado"> e <select
// id="codCentralMandadosRegionalizada">.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	// Não roda em iframes ocultos (carregamentos em segundo plano e o
	// reenvio da fila do "Nova Ordenação", posicionado fora da tela).
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.classList.contains("pdp-qa-fetch-iframe") || fe.style.top === "-9999px")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpEnderecoMandado) return;
	window.__pdpEnderecoMandado = true;

	const TAG = "[Projudi Endereço no mandado]";
	const KEY_ATUACAO = "pdp-endereco-mandado:atuacao";
	const KEY_PROCESSO = "pdp-endereco-mandado:processo";
	const SPAN_CLASS = "pdp-end-parte";
	const STATUS_CLASS = "pdp-end-mandado";
	const PARTE_NAMES = ["idxParteSelecionada", "idxPartesSolicitadas", "idxParteUnicaSelecionada"];
	const TIPO_COMUM = "1";
	const TIPO_REGIONALIZADO = "2";

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	// textContent com espaço entre os nós de texto ("Bairro:</b>Portão"
	// não vira "Bairro:Portão").
	function texto(el) {
		const partes = [];
		const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) partes.push(node.nodeValue);
		return collapse(partes.join(" ")).replace(/\s+([,.;:)])/g, "$1").replace(/\(\s+/g, "(");
	}

	function sessionGet(key) {
		try {
			const raw = sessionStorage.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			return null;
		}
	}

	function sessionSet(key, value) {
		try {
			sessionStorage.setItem(key, JSON.stringify(value));
		} catch (err) {
			// sessionStorage indisponível — segue sem cache
		}
	}

	function projudiURL(value, base) {
		const url = new URL(value, base || location.href);
		if (url.origin !== location.origin || !url.pathname.startsWith("/projudi/")) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	async function readPage(url, options) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 25000);
		try {
			const response = await fetch(url, Object.assign({}, options, { credentials: "same-origin", signal: controller.signal }));
			if (!response.ok) throw new Error("O Projudi não respondeu (" + response.status + ").");
			projudiURL(response.url);
			const bytes = await response.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			return new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), "text/html");
		} finally {
			clearTimeout(timer);
		}
	}

	// ---------------------------------------------------------------------
	// Tela do processo: contexto guardado para o diálogo
	// ---------------------------------------------------------------------

	function idDoProcesso(doc) {
		const form = doc.getElementById("processoForm");
		if (!form) return null;
		const field = form.querySelector('[name="id"]');
		if (field && /^\d+$/.test(field.value)) return field.value;
		try {
			const id = new URL(form.getAttribute("action") || "", location.href).searchParams.get("id");
			return /^\d+$/.test(id || "") ? id : null;
		} catch (err) {
			return null;
		}
	}

	// Campos do formulário (equivalente a `new FormData(form)`, mas sem
	// depender do formulário estar neste documento).
	function serializar(form) {
		const body = new URLSearchParams();
		for (const el of form.elements) {
			if (!el.name || el.disabled) continue;
			const type = (el.type || "").toLowerCase();
			if (type === "file" || type === "submit" || type === "button" || type === "reset" || type === "image") continue;
			if ((type === "checkbox" || type === "radio") && !el.checked) continue;
			if (el.tagName === "SELECT") {
				for (const opt of el.options) if (opt.selected) body.append(el.name, opt.value);
				continue;
			}
			body.append(el.name, el.value);
		}
		return body;
	}

	// URL da aba "Partes e Outros": o `setTab('...')` do item de aba nativo;
	// na falta dele, a `action` do formulário do processo.
	function urlAbaPartes(doc, form) {
		const tab = Array.prototype.find.call(doc.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && /['"]tabPartes['"]/.test(onclick);
		});
		const match = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab ? tab.getAttribute("onclick") : "");
		const base = doc.location ? doc.location.href : location.href;
		return projudiURL(match ? match[1] : form.getAttribute("action") || base, base).href;
	}

	// { id, url, body } para buscar a aba "Partes e Outros" do processo de
	// `doc`, ou null se `doc` não é uma tela de processo.
	function contextoDoProcesso(doc) {
		const form = doc.getElementById("processoForm");
		const id = idDoProcesso(doc);
		if (!form || !id) return null;
		try {
			const body = serializar(form);
			body.set("selectedIcon", "tabPartes");
			body.set("id", id);
			return { id: id, url: urlAbaPartes(doc, form), body: body.toString() };
		} catch (err) {
			return null;
		}
	}

	function guardarContextoDaPagina() {
		const atuacao = document.getElementById("areaatuacao");
		if (atuacao && collapse(atuacao.textContent)) sessionSet(KEY_ATUACAO, collapse(atuacao.textContent));
		const ctx = contextoDoProcesso(document);
		if (ctx) sessionSet(KEY_PROCESSO, ctx);
	}

	// Documentos das janelas "por trás" do diálogo: parent (popup das Ações
	// rápidas), opener (janela nativa) e os frames da aba (frameset do
	// Projudi). Só os de mesma origem.
	function documentosVizinhos() {
		const docs = [];
		const vistos = new Set();
		function add(win, profundidade) {
			if (!win || profundidade > 4) return;
			let doc;
			try {
				doc = win.document;
				if (!doc || vistos.has(doc) || win.location.origin !== location.origin) return;
			} catch (err) {
				return; // outra origem
			}
			vistos.add(doc);
			if (win !== window) docs.push(doc);
			try {
				for (let i = 0; i < win.frames.length; i++) add(win.frames[i], profundidade + 1);
			} catch (err) {
				// ignora
			}
		}
		add(window.parent, 0);
		try {
			add(window.opener, 0);
			if (window.opener) add(window.opener.top, 0);
		} catch (err) {
			// opener inacessível
		}
		add(window.top, 0);
		return docs;
	}

	function textoAtuacao() {
		for (const doc of documentosVizinhos()) {
			const el = doc.getElementById("areaatuacao");
			if (el && collapse(el.textContent)) return collapse(el.textContent);
		}
		return sessionGet(KEY_ATUACAO) || "";
	}

	// "Vara Criminal de Pinhais" -> "Pinhais"; "Foro Regional de Pinhais da
	// Comarca da Região Metropolitana de Curitiba" -> "Pinhais".
	function comarcaDaAtuacao(atuacao) {
		const t = collapse(atuacao).replace(/\([^()]*\)/g, " ").replace(/\s+d[ao]\s+comarca\b.*$/i, "");
		const m = /\bforo regional de\s+(.+)$/i.exec(t) || /\bcomarca de\s+(.+)$/i.exec(t) || /^.*\sde\s+(.+)$/i.exec(t);
		return m ? collapse(m[1].split(/\s+[-–]\s+/)[0]) : "";
	}

	// ---------------------------------------------------------------------
	// Aba "Partes e Outros": partes e endereços
	// ---------------------------------------------------------------------

	function tituloDaTabela(table) {
		for (let el = table.previousElementSibling; el; el = el.previousElementSibling) {
			if (el.tagName === "H4") return collapse(el.textContent);
			if (el.tagName === "TABLE" && el.classList.contains("resultTable")) return "";
		}
		return "";
	}

	function pareceEndereco(t) {
		const n = normalize(t);
		if (n.length < 8) return false;
		return /\bcep\b|cidade|municipio|bairro|\d{2}\.?\d{3}-?\d{3}|\b(rua|r|av|avenida|rod|rodovia|estrada|travessa|al|alameda|praca|linha|sitio|chacara)\b\.?\s/.test(n);
	}

	// Endereços de uma linha oculta de endereços (ou de um trecho dela).
	function enderecosDaLinha(tr) {
		const enderecos = [];

		// Tabela com coluna "Cidade"/"Município": cada linha é um endereço.
		for (const table of tr.querySelectorAll("table")) {
			const ths = Array.prototype.slice.call(table.querySelectorAll("th"));
			const colCidade = ths.findIndex(function (th) { return /^(cidade|municipio)\b/.test(normalize(th.textContent)); });
			if (colCidade < 0) continue;
			const colUF = ths.findIndex(function (th) { return /^(uf|estado)\b/.test(normalize(th.textContent)); });
			for (const row of table.querySelectorAll("tr")) {
				if (row.querySelector("th") || row.closest("table") !== table) continue;
				const cell = row.cells[colCidade];
				const t = texto(row);
				if (!cell || !t) continue;
				enderecos.push({ texto: t, cidade: collapse(cell.textContent), uf: colUF >= 0 && row.cells[colUF] ? collapse(row.cells[colUF].textContent) : "" });
			}
			if (enderecos.length) return enderecos;
		}

		// Um endereço por <li> ou por linha de tabela interna; na falta, o
		// texto todo da linha.
		let blocos = Array.prototype.map.call(tr.querySelectorAll("li"), texto);
		if (!blocos.length) {
			blocos = Array.prototype.filter
				.call(tr.querySelectorAll("tr"), function (row) { return !row.querySelector("tr"); })
				.map(texto);
		}
		if (!blocos.length) blocos = [texto(tr)];
		for (const t of blocos) {
			if (!pareceEndereco(t)) continue;
			const cidade = cidadeDoTexto(t);
			enderecos.push({ texto: t, cidade: cidade.cidade, uf: cidade.uf });
		}
		return enderecos;
	}

	// "... Cidade: CURITIBA/PR CEP: ..." -> { cidade: "CURITIBA", uf: "PR" }
	// Formato da aba "Partes e Outros": "RUA X, 716, S/N - Jardim Carvalho -
	// PONTA GROSSA/PR - CEP: 84.016-630" -> { cidade: "PONTA GROSSA", uf: "PR" }
	// (também aceita "PONTA GROSSA - PR").
	function cidadeDoTexto(t) {
		const m = /\b(?:cidade|munic[ií]pio)\s*:\s*([^\/,;:]+?)\s*(?:[\/-]\s*([A-Za-z]{2})\b|(?=\s+(?:cep|uf|estado|telefone|complemento)\b)|[,;]|$)/i.exec(t);
		if (m) return { cidade: collapse(m[1]), uf: (m[2] || "").toUpperCase() };
		const trechos = t.split(/\s+[-–]\s+/).map(collapse);
		for (let i = trechos.length - 1; i >= 0; i--) {
			const barra = /^([^\/\d:]*[A-Za-zÀ-ÿ][^\/\d:]*?)\s*\/\s*([A-Z]{2})$/.exec(trechos[i]);
			if (barra) return { cidade: collapse(barra[1].replace(/^.*,\s*/, "")), uf: barra[2] };
			if (i > 0 && /^[A-Z]{2}$/.test(trechos[i]) && /^[^\d:\/]+$/.test(trechos[i - 1])) {
				return { cidade: collapse(trechos[i - 1].replace(/^.*,\s*/, "")), uf: trechos[i] };
			}
		}
		return { cidade: "", uf: "" };
	}

	// [{ nome, titulo, enderecos: [{ texto, cidade, uf }] }] ou null se o
	// documento não tem o conteúdo da aba "Partes e Outros".
	function lerPartes(doc) {
		const tables = Array.prototype.filter.call(doc.querySelectorAll("table.resultTable"), function (table) {
			return !!table.querySelector('a[href*="parteProcesso.do"]');
		});
		if (!tables.length) return null;

		const partes = [];
		for (const table of tables) {
			const titulo = tituloDaTabela(table);
			let atual = null;
			for (const tbody of table.tBodies) {
				for (const tr of tbody.rows) {
					if (tr.parentElement !== tbody) continue;
					const link = tr.querySelector('a[href*="parteProcesso.do"]');
					if (link) {
						atual = { nome: collapse(link.textContent), titulo: titulo, enderecos: [] };
						partes.push(atual);
						continue;
					}
					if (!atual) continue;
					for (const e of enderecosDaLinha(tr)) {
						if (!atual.enderecos.some(function (x) { return x.texto === e.texto; })) atual.enderecos.push(e);
					}
				}
			}
		}
		return partes;
	}

	function abaPartesAtiva(doc) {
		const aba = doc.querySelector("li.currentTab");
		return !!aba && /^partes\b/.test(normalize(aba.textContent));
	}

	async function buscarPartes() {
		const vizinhos = documentosVizinhos();
		for (const doc of vizinhos) {
			if (!idDoProcesso(doc) || !abaPartesAtiva(doc)) continue;
			const partes = lerPartes(doc);
			if (partes) return partes;
		}
		let ctx = null;
		for (const doc of vizinhos) {
			ctx = contextoDoProcesso(doc);
			if (ctx) break;
		}
		if (!ctx) ctx = sessionGet(KEY_PROCESSO);
		if (!ctx || !ctx.url || !ctx.id) throw new Error("não encontrei a tela do processo por trás do diálogo");
		const doc = await readPage(projudiURL(ctx.url).href, { method: "POST", body: new URLSearchParams(ctx.body) });
		if (idDoProcesso(doc) !== ctx.id) throw new Error('a resposta da aba "Partes e Outros" não corresponde ao processo');
		const partes = lerPartes(doc);
		if (!partes) throw new Error('a resposta não contém a aba "Partes e Outros"');
		return partes;
	}

	// ---------------------------------------------------------------------
	// Diálogo "Ordenar Cumprimentos"
	// ---------------------------------------------------------------------

	function formularioDoDialogo() {
		const form = document.getElementById("cumprimentoCartorioForm");
		if (!form) return null;
		const temPartes = PARTE_NAMES.some(function (name) { return !!form.querySelector('input[name="' + name + '"]'); });
		return temPartes ? form : null;
	}

	function visivel(el) {
		return !!el && el.getClientRects().length > 0;
	}

	// Partes da linha visível: [{ input, tipo, nome, fim }] — `fim` é o <br>
	// que encerra o item (o endereço é inserido logo depois dele) ou o
	// <input> do item seguinte, quando não há <br>.
	function itensDePartes(form) {
		const itens = [];
		for (const name of PARTE_NAMES) {
			for (const input of form.querySelectorAll('input[name="' + name + '"]')) {
				if (!visivel(input)) continue;
				let t = "";
				let fim = null;
				for (let node = input.nextSibling; node; node = node.nextSibling) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						if (node.tagName === "BR" || node.tagName === "INPUT") {
							fim = node;
							break;
						}
						if (node.classList.contains(SPAN_CLASS)) continue;
					}
					if (node.nodeType !== Node.COMMENT_NODE) t += " " + node.textContent;
				}
				t = collapse(t);
				const m = /^\(([^()]*)\)\s*(.*)$/.exec(t);
				itens.push({ input: input, tipo: m ? collapse(m[1]) : "", nome: collapse(m ? m[2] : t), fim: fim });
			}
		}
		return itens;
	}

	function encontrarParte(partes, item) {
		const nome = normalize(item.nome);
		let candidatas = partes.filter(function (p) { return normalize(p.nome) === nome; });
		if (!candidatas.length) {
			candidatas = partes.filter(function (p) {
				const n = normalize(p.nome);
				return n && (n.startsWith(nome) || nome.startsWith(n));
			});
		}
		if (candidatas.length > 1 && item.tipo) {
			const raiz = normalize(item.tipo).slice(0, 5);
			const mesmoPolo = candidatas.filter(function (p) { return normalize(p.titulo).indexOf(raiz) !== -1; });
			if (mesmoPolo.length) candidatas = mesmoPolo;
		}
		return candidatas.find(function (p) { return p.enderecos.length; }) || candidatas[0] || null;
	}

	// ---------------------------------------------------------------------
	// Comarcas
	// ---------------------------------------------------------------------

	function comarcasDestino(form) {
		const select = form.querySelector("#codComarcaDestinoMandado");
		if (!select) return [];
		return Array.prototype.filter
			.call(select.options, function (opt) { return opt.value; })
			.map(function (opt) { return { value: opt.value, nome: collapse(opt.textContent), chave: normalize(opt.textContent) }; });
	}

	// Cidade do endereço: a lida de "Cidade:"; senão, o nome de comarca
	// conhecida que aparece por último no texto (a cidade vem depois da rua).
	function cidadeDoEndereco(endereco, conhecidas) {
		if (endereco.cidade) return { nome: endereco.cidade, uf: endereco.uf };
		const t = " " + normalize(endereco.texto).replace(/[^a-z0-9]+/g, " ") + " ";
		let melhor = null;
		for (const nome of conhecidas) {
			const chave = " " + normalize(nome).replace(/[^a-z0-9]+/g, " ").trim() + " ";
			const pos = t.lastIndexOf(chave);
			if (pos >= 0 && (!melhor || pos > melhor.pos)) melhor = { pos: pos, nome: nome };
		}
		return melhor ? { nome: melhor.nome, uf: "" } : null;
	}

	// { tipo: "local" | "destino" | "fora" | "sem", cidade, comarca }
	function classificar(parte, local, destinos) {
		const conhecidas = destinos.map(function (d) { return d.nome; });
		if (local) conhecidas.push(local);
		for (const endereco of (parte && parte.enderecos) || []) {
			const cidade = cidadeDoEndereco(endereco, conhecidas);
			if (!cidade) continue;
			const chave = normalize(cidade.nome);
			if (local && chave === normalize(local)) return { tipo: "local", cidade: cidade.nome };
			if (cidade.uf && cidade.uf !== "PR") return { tipo: "fora", cidade: cidade.nome + "/" + cidade.uf };
			const destino = destinos.find(function (d) { return d.chave === chave; });
			if (destino) return { tipo: "destino", cidade: cidade.nome, comarca: destino };
			return { tipo: "fora", cidade: cidade.nome };
		}
		return { tipo: "sem" };
	}

	// ---------------------------------------------------------------------
	// Estado e reconciliação
	// ---------------------------------------------------------------------

	let dados = null; // { partes } | { erro }
	let comarcaLocal = "";
	let aplicarPendente = false;
	let regionalizadoAutomatico = false; // "Regionalizado" escolhido por este recurso
	let nota = "";

	function textoEnderecos(item) {
		if (!dados) return { texto: "📍 Endereço: carregando…", classe: "pdp-end-status" };
		if (dados.erro) return { texto: "📍 Endereço: não foi possível consultar a aba Partes", classe: "pdp-end-status", title: dados.erro };
		const parte = encontrarParte(dados.partes, item);
		if (!parte) return { texto: "📍 Endereço: parte não localizada na aba Partes", classe: "pdp-end-status" };
		if (!parte.enderecos.length) return { texto: "📍 Endereço: não cadastrado na aba Partes", classe: "pdp-end-status" };
		return {
			linhas: parte.enderecos.map(function (e) { return "📍 " + e.texto; }),
			classe: "pdp-end-valor",
		};
	}

	function renderEndereco(item) {
		const depoisDoBr = item.fim && item.fim.tagName === "BR";
		let span = !item.fim
			? item.input.parentElement.lastElementChild
			: depoisDoBr
				? item.fim.nextElementSibling
				: item.fim.previousElementSibling;
		if (!span || !span.classList.contains(SPAN_CLASS)) span = null;
		if (!item.input.checked) {
			if (span) span.remove();
			return;
		}
		if (!span) {
			span = document.createElement("span");
			if (!item.fim) item.input.parentElement.appendChild(span);
			else item.fim.parentNode.insertBefore(span, depoisDoBr ? item.fim.nextSibling : item.fim);
		}
		const info = textoEnderecos(item);
		const className = SPAN_CLASS + " " + info.classe;
		if (span.className !== className) span.className = className;
		const conteudo = info.linhas ? info.linhas.join("\n") : info.texto;
		if (span.textContent !== conteudo) span.textContent = conteudo;
		if ((span.getAttribute("title") || "") !== (info.title || "")) {
			if (info.title) span.setAttribute("title", info.title);
			else span.removeAttribute("title");
		}
	}

	function renderNota(form) {
		const select = form.querySelector("#codTipoMandadoOficialJustica");
		if (!select) return;
		const td = select.parentElement;
		let div = td.querySelector("." + STATUS_CLASS);
		if (!nota) {
			if (div) div.remove();
			return;
		}
		if (!div) {
			div = document.createElement("div");
			div.className = STATUS_CLASS;
			td.appendChild(div);
		}
		if (div.textContent !== nota) div.textContent = nota;
	}

	function escolher(select, value) {
		if (!select || select.value === value) return;
		select.value = value;
		select.dispatchEvent(new Event("change", { bubbles: true }));
	}

	// Depois de escolher a comarca, o Projudi carrega as Centrais de Mandados
	// dela; havendo uma só, já a deixa marcada.
	function marcarCentralUnica(form) {
		const inicio = Date.now();
		const chave = function (select) {
			return Array.prototype.map.call(select.options, function (opt) { return opt.value + "=" + opt.textContent; }).join("|");
		};
		const primeiro = form.querySelector("#codCentralMandadosRegionalizada");
		const antes = primeiro ? chave(primeiro) : "";
		const timer = setInterval(function () {
			const select = form.querySelector("#codCentralMandadosRegionalizada");
			const passado = Date.now() - inicio;
			if (!select || passado > 10000) return clearInterval(timer);
			// Espera a lista da comarca nova (a anterior pode ainda estar lá).
			if (select.disabled || (select === primeiro && chave(select) === antes && passado < 3000)) return;
			clearInterval(timer);
			const opcoes = Array.prototype.filter.call(select.options, function (opt) { return opt.value; });
			if (!select.value && opcoes.length === 1) escolher(select, opcoes[0].value);
		}, 300);
	}

	function aplicarTipoDoMandado(form, itens) {
		const tipoSelect = form.querySelector("#codTipoMandadoOficialJustica");
		if (!tipoSelect || !visivel(tipoSelect) || !dados || dados.erro) return false;
		const marcados = itens.filter(function (item) { return item.input.checked; });
		if (!marcados.length) {
			nota = "";
			return true;
		}
		const destinos = comarcasDestino(form);
		const resultados = marcados.map(function (item) {
			return { item: item, r: classificar(encontrarParte(dados.partes, item), comarcaLocal, destinos) };
		});
		const nomeDe = function (x) { return x.item.nome; };

		const semCidade = resultados.filter(function (x) { return x.r.tipo === "sem"; });
		if (semCidade.length) {
			nota = "Tipo do Mandado não alterado: o endereço de " + semCidade.map(nomeDe).join(", ") + " não indica a cidade.";
			return true;
		}
		if (!comarcaLocal) {
			nota = "Tipo do Mandado não alterado: não identifiquei a comarca do juízo (link \"Atuação\" do cabeçalho).";
			return true;
		}
		const fora = resultados.filter(function (x) { return x.r.tipo === "fora"; });
		if (fora.length) {
			nota =
				"Tipo do Mandado não alterado: " +
				fora.map(function (x) { return x.item.nome + " (" + x.r.cidade + ")"; }).join(", ") +
				" — cidade que não consta da lista de Comarcas de Destino.";
			return true;
		}
		const locais = resultados.filter(function (x) { return x.r.tipo === "local"; });
		const comarcas = Array.from(new Set(resultados.filter(function (x) { return x.r.tipo === "destino"; }).map(function (x) { return x.r.comarca.value; })));
		if (locais.length === resultados.length) {
			if (regionalizadoAutomatico && tipoSelect.value === TIPO_REGIONALIZADO) {
				escolher(tipoSelect, TIPO_COMUM);
				escolher(form.querySelector("#codComarcaDestinoMandado"), "");
			}
			regionalizadoAutomatico = false;
			nota = "Endereço na comarca de " + comarcaLocal + ": Mandado Comum.";
			return true;
		}
		if (locais.length || comarcas.length > 1) {
			nota =
				"Tipo do Mandado não alterado: as partes marcadas têm endereços em comarcas diferentes (" +
				resultados.map(function (x) { return x.item.nome + ": " + x.r.cidade; }).join("; ") +
				").";
			return true;
		}
		const destino = resultados[0].r.comarca;
		escolher(tipoSelect, TIPO_REGIONALIZADO);
		regionalizadoAutomatico = true;
		const comarcaSelect = form.querySelector("#codComarcaDestinoMandado");
		if (comarcaSelect && comarcaSelect.value !== destino.value) {
			escolher(comarcaSelect, destino.value);
			marcarCentralUnica(form);
		}
		nota = "Endereço em " + resultados[0].r.cidade + " (fora da comarca de " + comarcaLocal + "): Mandado Regionalizado — Comarca de Destino: " + destino.nome + ".";
		return true;
	}

	function reconcile() {
		const form = formularioDoDialogo();
		if (!form) return;
		const itens = itensDePartes(form);
		for (const item of itens) renderEndereco(item);
		if (aplicarPendente && aplicarTipoDoMandado(form, itens)) aplicarPendente = false;
		renderNota(form);
	}

	let agendado = false;
	function agendar() {
		if (agendado) return;
		agendado = true;
		requestAnimationFrame(function () {
			agendado = false;
			reconcile();
		});
	}

	function iniciarDialogo(form) {
		comarcaLocal = comarcaDaAtuacao(textoAtuacao());
		buscarPartes()
			.then(function (partes) { dados = { partes: partes }; })
			.catch(function (err) {
				console.warn(TAG, "falha ao buscar os endereços das partes:", err);
				dados = { erro: err && err.message ? err.message : String(err) };
			})
			.finally(agendar);

		form.addEventListener("change", function (evt) {
			const el = evt.target;
			if (!evt.isTrusted || !el) return;
			if (PARTE_NAMES.indexOf(el.name) !== -1 || el.name === "codTipoCumprimentoCartorio") aplicarPendente = true;
			if (el.id === "codTipoMandadoOficialJustica") {
				regionalizadoAutomatico = false; // escolha manual do usuário prevalece
				nota = "";
			}
			agendar();
		});
		// "Nova Ordenação" limpa o formulário com form.reset().
		form.addEventListener("reset", function () {
			regionalizadoAutomatico = false;
			aplicarPendente = false;
			nota = "";
			setTimeout(agendar, 0);
		});
		new MutationObserver(agendar).observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
		agendar();
	}

	guardarContextoDaPagina();
	const form = formularioDoDialogo();
	if (form) iniciarDialogo(form);
})();
