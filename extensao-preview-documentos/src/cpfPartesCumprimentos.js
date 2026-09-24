// Projudi - RG e CPF das partes nas telas de cumprimentos
//
// Na lista de cumprimentos da serventia (`cumprimentoCartorio.do` — a tela
// que se abre ao clicar num dos contadores da lista de ordenações, ex.:
// "Demais cumprimentos" > "Para Expedir"), a coluna "Referente a(s)
// parte(s)" mostra só o nome e o tipo da parte ("FULANO (Investigado)").
// Para expedir o cumprimento é comum precisar do RG e do CPF, que só
// aparecem na aba "Partes e Outros" do processo. O mesmo vale para a tela
// de um cumprimento (link "Visualizar" da lista, `cumprimentoCartorio.do`
// com `actionType=editar`), cuja linha "Referente a(s) parte(s):" também
// traz só o nome.
//
// Este recurso acrescenta o RG e o CPF ao lado de cada parte nessas duas
// telas ("FULANO (Investigado) — RG: 1.234.567-8; CPF: 000.000.000-00"),
// buscando-os de forma oculta no processo do link "Processo" (coluna da
// lista ou link ao lado do "Identificador do Cumprimento"):
// 1. GET no link do processo (`processo.do?_tj=...`), via `fetch()`, sem
//    iframe e sem navegar a aba;
// 2. se a página devolvida já traz a aba "Partes e Outros", lê dali; senão,
//    POST para o `#processoForm` dessa página com `selectedIcon=tabPartes`
//    (a mesma técnica de reusCabecalho.js e habilitarAdvogado.js);
// 3. as partes de TODOS os polos são lidas das tabelas da aba (colunas
//    localizadas pelos <th> "RG" e "CPF/CNPJ", como em reusCabecalho.js) e a parte
//    da lista é localizada pelo nome (sem acentos/maiúsculas).
//
// As buscas são feitas poucas de cada vez (ver MAX_PARALELO), uma só vez
// por processo (linhas do mesmo processo compartilham a busca), e o
// resultado fica em `sessionStorage` por número do processo, para a coluna
// aparecer na hora ao filtrar de novo ou trocar de página.
//
// Estrutura real da tela confirmada a partir de um .mhtml salvo do Projudi
// (TJPR, `cumprimentoCartorio.do`): `table.resultTable` com <th>
// "Processo" (link `processo.do?_tj=...` com o número num <em>) e <th>
// "Referente a(s) parte(s)" (um <ul> com um <li> "NOME (Tipo)" por parte).
// Tela do cumprimento: `table.form` com a linha <td class="label">
// "Referente a(s) parte(s):" (um <ul> com um <li> "NOME" por parte) e, na
// linha "Identificador do Cumprimento:", o link `processo.do?_tj=...` do
// processo (número num <em>). A linha "Prazo (Referente a(s) parte(s)):" é
// outra coisa e é ignorada.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	// Evita rodar dentro de iframes ocultos (carregamento em segundo plano)
	// e dentro do próprio popup desta extensão.
	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpCpfPartesCumprimentos) return;
	window.__pdpCpfPartesCumprimentos = true;

	const TAG = "[Projudi RG/CPF nos cumprimentos]";
	const SPAN_CLASS = "pdp-cpf-parte";
	const STORAGE_PREFIX = "pdp-cpf-cumprimentos-v2:";
	const MAX_PARALELO = 2;

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

	function valorDocumento(text) {
		const value = collapse(text);
		if (!value) return "";
		if (/^(nao cadastrad[oa]|nao informad[oa]|-+)$/.test(normalize(value))) return "";
		return value;
	}

	// Aceita qualquer página do próprio Projudi (o link do processo pode
	// redirecionar para outra tela, ex.: visualizacaoProcesso.do).
	function projudiURL(value) {
		const url = new URL(value, location.href);
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
			const doc = new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), "text/html");
			return { doc: doc, url: response.url };
		} finally {
			clearTimeout(timer);
		}
	}

	// ---------------------------------------------------------------------
	// Leitura da aba "Partes e Outros" (todos os polos)
	// ---------------------------------------------------------------------

	// Retorna [{ nome, rg, cpf }] ou null se o documento não tem a aba.
	function lerPartes(doc) {
		const tables = Array.prototype.filter.call(doc.querySelectorAll("table.resultTable"), function (table) {
			return !!table.querySelector('a[href*="parteProcesso.do"]');
		});
		if (!tables.length) return null;

		const partes = [];
		for (const table of tables) {
			const ths = Array.prototype.slice.call(table.querySelectorAll("thead th"));
			const colRG = ths.findIndex(function (th) { return /^rg\b/.test(normalize(th.textContent)); });
			const colCPF = ths.findIndex(function (th) { return /^cpf/.test(normalize(th.textContent)); });
			const rows = table.tBodies.length ? table.tBodies[0].rows : [];
			for (const tr of rows) {
				const link = tr.querySelector('a[href*="parteProcesso.do"]');
				if (!link) continue;
				const nome = collapse(link.textContent);
				if (!nome) continue;
				const cells = tr.cells;
				partes.push({
					nome: nome,
					rg: colRG >= 0 && cells[colRG] ? valorDocumento(cells[colRG].textContent) : "",
					cpf: colCPF >= 0 && cells[colCPF] ? valorDocumento(cells[colCPF].textContent) : "",
				});
			}
		}
		return partes;
	}

	// URL da aba "Partes e Outros": o `setTab('...')` do item de aba nativo
	// na página do processo buscada; na falta dele, a `action` do formulário.
	function urlAbaPartes(doc, form, base) {
		const tab = Array.prototype.find.call(doc.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && /['"]tabPartes['"]/.test(onclick);
		});
		const match = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab ? tab.getAttribute("onclick") : "");
		return projudiURL(new URL(match ? match[1] : form.getAttribute("action") || base, base).href);
	}

	// Campos do formulário (equivalente a `new FormData(form)`, mas sem
	// depender do formulário estar no documento visível).
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

	function idDoProcesso(doc) {
		const field = doc.querySelector('#processoForm [name="id"]');
		return field && /^\d+$/.test(field.value) ? field.value : null;
	}

	async function buscarPartes(processoHref) {
		const pagina = await readPage(projudiURL(processoHref).href, { method: "GET" });
		const local = lerPartes(pagina.doc);
		if (local) return local;

		const form = pagina.doc.getElementById("processoForm");
		const id = idDoProcesso(pagina.doc);
		if (!form || !id) throw new Error("a página do processo não pôde ser lida");
		const body = serializar(form);
		body.set("selectedIcon", "tabPartes");
		body.set("id", id);
		const aba = await readPage(urlAbaPartes(pagina.doc, form, pagina.url).href, { method: "POST", body: body });
		if (idDoProcesso(aba.doc) !== id) throw new Error('a resposta da aba "Partes e Outros" não corresponde ao processo');
		const partes = lerPartes(aba.doc);
		if (!partes) throw new Error('a resposta não contém a aba "Partes e Outros"');
		return partes;
	}

	// ---------------------------------------------------------------------
	// Cache e fila de buscas (uma por processo)
	// ---------------------------------------------------------------------

	const resultados = new Map(); // numero -> { partes } | { erro }
	const pendentes = new Map(); // numero -> href
	let ativos = 0;

	function carregarSalvo(numero) {
		try {
			const raw = sessionStorage.getItem(STORAGE_PREFIX + numero);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			return null;
		}
	}

	function salvar(numero, partes) {
		try {
			sessionStorage.setItem(STORAGE_PREFIX + numero, JSON.stringify(partes));
		} catch (err) {
			console.warn(TAG, "não foi possível salvar em sessionStorage:", err);
		}
	}

	function solicitar(numero, href) {
		if (resultados.has(numero) || pendentes.has(numero)) return;
		const salvo = carregarSalvo(numero);
		if (Array.isArray(salvo)) {
			resultados.set(numero, { partes: salvo });
			return;
		}
		pendentes.set(numero, href);
		bombear();
	}

	function bombear() {
		while (ativos < MAX_PARALELO) {
			const proximo = Array.from(pendentes.keys()).find(function (numero) { return !resultados.has(numero) && pendentes.get(numero) !== null; });
			if (!proximo) return;
			const href = pendentes.get(proximo);
			pendentes.set(proximo, null); // em andamento
			ativos++;
			buscarPartes(href)
				.then(function (partes) {
					resultados.set(proximo, { partes: partes });
					salvar(proximo, partes);
				})
				.catch(function (err) {
					console.warn(TAG, "falha ao buscar as partes do processo " + proximo + ":", err);
					resultados.set(proximo, { erro: err && err.message ? err.message : String(err) });
				})
				.finally(function () {
					pendentes.delete(proximo);
					ativos--;
					agendar();
					bombear();
				});
		}
	}

	// ---------------------------------------------------------------------
	// Coluna "Referente a(s) parte(s)"
	// ---------------------------------------------------------------------

	// "FULANO DE TAL (Investigado)" -> "fulano de tal"
	function nomeDoItem(li) {
		let texto = "";
		for (const node of li.childNodes) {
			if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(SPAN_CLASS)) continue;
			texto += node.textContent;
		}
		return normalize(collapse(texto).replace(/\s*\([^()]*\)\s*$/, ""));
	}

	function encontrarParte(partes, nome) {
		const iguais = partes.filter(function (p) { return normalize(p.nome) === nome; });
		const candidatas = iguais.length
			? iguais
			: partes.filter(function (p) {
				const n = normalize(p.nome);
				return n.startsWith(nome) || nome.startsWith(n);
			});
		return candidatas.find(function (p) { return p.cpf || p.rg; }) || candidatas[0] || null;
	}

	function textoDocumentos(resultado, nome) {
		if (!resultado) return { texto: " — RG/CPF: carregando…", classe: "pdp-cpf-status" };
		if (resultado.erro) return { texto: " — RG/CPF: não foi possível consultar", classe: "pdp-cpf-status", title: resultado.erro };
		const parte = encontrarParte(resultado.partes, nome);
		if (!parte) return { texto: " — RG/CPF: parte não localizada no processo", classe: "pdp-cpf-status" };
		if (!parte.rg && !parte.cpf) return { texto: " — RG/CPF: não cadastrados", classe: "pdp-cpf-status" };
		const rg = "RG: " + (parte.rg || "não cadastrado");
		const cpf = "CPF: " + (parte.cpf || "não cadastrado");
		return { texto: " — " + rg + "; " + cpf, classe: "pdp-cpf-valor" };
	}

	function localizarColunas(table) {
		const ths = Array.prototype.slice.call(table.querySelectorAll("thead th"));
		const colProcesso = ths.findIndex(function (th) { return normalize(th.textContent) === "processo"; });
		const colPartes = ths.findIndex(function (th) { return /^referente a\(?s?\)? parte/.test(normalize(th.textContent)); });
		return colProcesso >= 0 && colPartes >= 0 ? { processo: colProcesso, partes: colPartes } : null;
	}

	function linkDoProcesso(container) {
		const link = container.querySelector('a[href*="/processo.do"]');
		if (!link) return null;
		const numero = collapse((link.querySelector("em") || link).textContent);
		return numero ? { numero: numero, href: link.href } : null;
	}

	// Cada alvo: { numero, href, itens: [<li>] } — as partes de um processo.
	function coletarAlvos() {
		const alvos = [];

		// Lista de cumprimentos: colunas "Processo" e "Referente a(s) parte(s)".
		for (const table of document.querySelectorAll("table.resultTable")) {
			const cols = localizarColunas(table);
			if (!cols) continue;
			for (const tbody of table.tBodies) {
				for (const tr of tbody.rows) {
					const tdProcesso = tr.cells[cols.processo];
					const tdPartes = tr.cells[cols.partes];
					if (!tdProcesso || !tdPartes) continue;
					const processo = linkDoProcesso(tdProcesso);
					if (!processo) continue;
					alvos.push(Object.assign(processo, { itens: Array.prototype.slice.call(tdPartes.querySelectorAll("li")) }));
				}
			}
		}

		// Tela do cumprimento: linha "Referente a(s) parte(s):" da table.form.
		for (const table of document.querySelectorAll("table.form")) {
			const processo = linkDoProcesso(table);
			if (!processo) continue;
			for (const tr of table.rows) {
				const label = tr.cells[0];
				if (!label || !label.classList.contains("label")) continue;
				if (!/^referente a\(?s?\)? parte\(?s?\)?:?$/.test(normalize(label.textContent))) continue;
				const td = tr.cells[1];
				if (!td) continue;
				alvos.push(Object.assign({}, processo, { itens: Array.prototype.slice.call(td.querySelectorAll("li")) }));
			}
		}

		return alvos;
	}

	function reconcile() {
		for (const alvo of coletarAlvos()) {
			if (!alvo.itens.length) continue;
			solicitar(alvo.numero, alvo.href);
			const resultado = resultados.get(alvo.numero);
			for (const li of alvo.itens) {
				const info = textoDocumentos(resultado, nomeDoItem(li));
				let span = li.querySelector("span." + SPAN_CLASS);
				if (!span) {
					span = document.createElement("span");
					li.appendChild(span);
				}
				const className = SPAN_CLASS + " " + info.classe;
				if (span.className !== className) span.className = className;
				if (span.textContent !== info.texto) span.textContent = info.texto;
				if ((span.getAttribute("title") || "") !== (info.title || "")) {
					if (info.title) span.setAttribute("title", info.title);
					else span.removeAttribute("title");
				}
			}
		}
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

	new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
