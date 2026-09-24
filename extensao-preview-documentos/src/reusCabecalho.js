// Projudi - Réus/Indiciados/Noticiados no cabeçalho do processo
//
// No SEEU, o cabeçalho do processo já mostra o nome do sentenciado (com RJI,
// CPF e RG), e o nome é um link para a tela da parte. No Projudi, para ver
// quem são os réus é preciso abrir a aba "Partes e Outros".
//
// Este recurso lê as partes do polo passivo (Réu, Indiciado, Noticiado,
// etc.) da aba "Partes e Outros" e as lista numa nova linha da tabela de
// informações do processo (`table#informacoesProcessuais`), logo abaixo da
// última linha de "Assunto" (Principal ou Secundário). Cada parte aparece
// como "NOME (RG: ...; CPF: ...)" — só os documentos preenchidos.
//
// O nome é um link para a tela da parte (`parteProcesso.do`, a mesma do
// link nativo da aba "Partes e Outros"), mas NÃO navega a aba: abre essa
// tela num POPUP sobreposto à tela atual — o mesmo popup do painel "Ações
// rápidas" (ver `openActionModal` em quickActions.js e habilitarAdvogado.js)
// —, onde o usuário usa os botões nativos da tela ("Alterar Parte",
// "Alterar Polo", "Dar Baixa", "Atualizar Dados IIPR", etc.) e fecha com
// "✕ Fechar" ao terminar.
//
// De onde vêm os dados:
// 1. Se a página atual já tem o conteúdo da aba "Partes e Outros", lê
//    direto do DOM.
// 2. Senão, busca essa aba em segundo plano via `fetch()` (POST para o
//    próprio `#processoForm` com `selectedIcon=tabPartes` — a mesma técnica
//    de habilitarAdvogado.js e oraculoDirect.js), sem iframe.
// O resultado fica salvo em `sessionStorage` (por id do processo), para a
// linha aparecer imediatamente ao trocar de aba — a busca é refeita a cada
// carregamento de página, e a linha é atualizada quando ela termina.
//
// Estrutura real confirmada a partir de um .mhtml salvo do Projudi (TJPR,
// aba "Partes e Outros"):
// - todos os polos ficam num mesmo <div class="includeContent">, cada um
//   como um <h4> ("Autor", "Réu", "Vítimas/Protegidos(as)", "Testemunhas",
//   ...) seguido da sua <table class="resultTable">;
// - o polo passivo é identificado pelo id das linhas ocultas de endereço
//   (<tr id="rowpromovidas0" style="display:none">) e do ícone
//   (<img id="iconpromovidas0">) — o polo ativo usa "promoventes", vítimas
//   "vitimas", testemunhas "testemunhas";
// - linha de dados: <td> ícone, <td><a class="link" href=".../processo/
//   parteProcesso.do?_tj=...">NOME</a></td>, <td>RG</td>, <td>CPF/CNPJ</td>,
//   ... — as colunas "RG" e "CPF/CNPJ" são localizadas pelo <th> do
//   <thead>; valores ausentes vêm vazios ou "Não Cadastrado".
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

	if (window.__pdpReusCabecalho) return;
	window.__pdpReusCabecalho = true;

	const TAG = "[Projudi Réus no cabeçalho]";
	const ROW_ATTR = "data-pdp-reus-row";
	const STORAGE_PREFIX = "pdp-reus-cabecalho:";
	const PARTE_PATH = "/projudi/processo/parteProcesso.do";
	// Fallback pelo título do polo, caso o id "promovidas" não esteja
	// presente (texto já normalizado: sem acento, minúsculo).
	const POLO_PASSIVO_TITULOS = /^(reu|reus|re|indiciad|noticiad|investigad|denunciad|querelad|acusad|autor(es)? do fato|flagrantead|sentenciad|apenad|executad|requerid|promovid)/;

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

	function localURL(value, path) {
		const url = new URL(value, location.href);
		if (url.origin !== location.origin || url.pathname !== path) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	// ---------------------------------------------------------------------
	// Leitura da aba "Partes e Outros"
	// ---------------------------------------------------------------------

	function valorDocumento(text) {
		const value = collapse(text);
		if (!value) return "";
		if (/^(nao cadastrad[oa]|nao informad[oa]|-+)$/.test(normalize(value))) return "";
		return value;
	}

	function isPoloPassivo(table, titulo) {
		if (table.querySelector('[id^="rowpromovidas"], [id^="iconpromovidas"]')) return true;
		return POLO_PASSIVO_TITULOS.test(normalize(titulo));
	}

	// Todos os polos ficam no MESMO <div class="includeContent">, em
	// sequência (<h4>Autor</h4><table>…<h4>Réu</h4><table>…) — o título de
	// cada tabela é o <h4> irmão imediatamente anterior a ela.
	function tituloDaTabela(table) {
		for (let el = table.previousElementSibling; el; el = el.previousElementSibling) {
			if (el.tagName === "H4") return el;
			if (el.tagName === "TABLE" && el.classList.contains("resultTable")) return null;
		}
		return null;
	}

	// Retorna { titulos: [..], partes: [{ nome, rg, cpf, href }] } ou null se
	// o documento não tem o conteúdo da aba "Partes e Outros".
	function lerPartes(doc) {
		const tables = Array.prototype.filter.call(doc.querySelectorAll("table.resultTable"), function (table) {
			return !!table.querySelector('a[href*="parteProcesso.do"]');
		});
		if (!tables.length) return null;

		const titulos = [];
		const partes = [];
		const vistos = new Set();
		for (const table of tables) {
			const h4 = tituloDaTabela(table);
			const titulo = collapse(h4 ? h4.textContent : "");
			if (!isPoloPassivo(table, titulo)) continue;
			if (titulo && titulos.indexOf(titulo) === -1) titulos.push(titulo);

			const ths = Array.prototype.slice.call(table.querySelectorAll("thead th"));
			const colRG = ths.findIndex(function (th) { return /^rg\b/.test(normalize(th.textContent)); });
			const colCPF = ths.findIndex(function (th) { return /^cpf/.test(normalize(th.textContent)); });

			const rows = table.tBodies.length ? table.tBodies[0].rows : [];
			for (const tr of rows) {
				const link = tr.querySelector('a[href*="parteProcesso.do"]');
				if (!link) continue;
				let href;
				try {
					href = localURL(link.getAttribute("href"), PARTE_PATH).href;
				} catch (err) {
					continue;
				}
				const nome = collapse(link.textContent);
				if (!nome || vistos.has(href)) continue;
				vistos.add(href);
				const cells = tr.cells;
				partes.push({
					nome: nome,
					rg: colRG >= 0 && cells[colRG] ? valorDocumento(cells[colRG].textContent) : "",
					cpf: colCPF >= 0 && cells[colCPF] ? valorDocumento(cells[colCPF].textContent) : "",
					href: href,
				});
			}
		}
		return { titulos: titulos, partes: partes };
	}

	async function readPage(url, options) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 25000);
		try {
			const response = await fetch(url, Object.assign({}, options, { credentials: "same-origin", signal: controller.signal }));
			if (!response.ok) throw new Error("O Projudi não respondeu (" + response.status + ").");
			localURL(response.url, new URL(url, location.href).pathname);
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

	// URL da aba "Partes e Outros": o `setTab('...')` do item de aba nativo
	// (mesma técnica de habilitarAdvogado.js); na falta dele, a própria
	// `action` do formulário do processo.
	function urlAbaPartes(form) {
		const tab = Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && /['"]tabPartes['"]/.test(onclick);
		});
		const match = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab ? tab.getAttribute("onclick") : "");
		if (match) {
			try {
				return localURL(match[1], "/projudi/visualizacaoProcesso.do");
			} catch (err) {
				// segue para o fallback
			}
		}
		return localURL(form.getAttribute("action") || location.href, "/projudi/visualizacaoProcesso.do");
	}

	// Id do processo: campo oculto "id" do #processoForm; na falta dele, o
	// parâmetro "id" da `action` do formulário.
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

	async function buscarPartes(form, id) {
		const body = new URLSearchParams();
		for (const pair of new FormData(form)) {
			if (typeof pair[1] === "string") body.append(pair[0], pair[1]);
		}
		body.set("selectedIcon", "tabPartes");
		body.set("id", id);
		const doc = await readPage(urlAbaPartes(form).href, { method: "POST", body: body });
		if (idDoProcesso(doc) !== id) throw new Error('a resposta da aba "Partes e Outros" não corresponde ao processo atual');
		const dados = lerPartes(doc);
		if (!dados) throw new Error('a resposta não contém a aba "Partes e Outros"');
		return dados;
	}

	// ---------------------------------------------------------------------
	// Estado (por processo, em sessionStorage)
	// ---------------------------------------------------------------------

	let processoId = null;
	let estado = null; // { titulos, partes } | null (ainda carregando)
	let erro = null;

	function carregarSalvo(id) {
		try {
			const raw = sessionStorage.getItem(STORAGE_PREFIX + id);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			return null;
		}
	}

	function salvar(id, dados) {
		try {
			sessionStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(dados));
		} catch (err) {
			console.warn(TAG, "não foi possível salvar em sessionStorage:", err);
		}
	}

	// ---------------------------------------------------------------------
	// Linha no cabeçalho do processo
	// ---------------------------------------------------------------------

	function abrirParte(parte) {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			alert('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup da parte.');
			return;
		}
		api.openActionModal("Parte do Processo - " + parte.nome, parte.href);
	}

	function rotulo() {
		if (estado && estado.titulos && estado.titulos.length) return estado.titulos.join(" / ") + ":";
		return "Réu(s):";
	}

	function assinatura() {
		return JSON.stringify({ estado: estado, erro: erro });
	}

	function renderConteudo(td) {
		td.textContent = "";
		if (!estado) {
			const em = document.createElement("em");
			em.className = "pdp-reus-status";
			em.textContent = erro ? "Não foi possível carregar as partes (" + erro + ")." : "Carregando partes…";
			td.appendChild(em);
			return;
		}
		if (!estado.partes.length) {
			const em = document.createElement("em");
			em.className = "pdp-reus-status";
			em.textContent = "Nenhuma parte cadastrada no polo passivo.";
			td.appendChild(em);
			return;
		}
		const lista = document.createElement("ul");
		lista.className = "pdp-reus-lista";
		estado.partes.forEach(function (parte) {
			const li = document.createElement("li");
			const a = document.createElement("a");
			a.href = parte.href;
			a.className = "link pdp-reus-nome";
			a.textContent = parte.nome;
			a.title = "Abrir a tela da parte num popup, sem sair desta tela";
			a.addEventListener("click", function (event) {
				event.preventDefault();
				event.stopPropagation();
				abrirParte(parte);
			});
			li.appendChild(a);
			const docs = [];
			if (parte.rg) docs.push("RG: " + parte.rg);
			if (parte.cpf) docs.push("CPF: " + parte.cpf);
			if (docs.length) {
				const span = document.createElement("span");
				span.className = "pdp-reus-docs";
				span.textContent = " (" + docs.join("; ") + ")";
				li.appendChild(span);
			}
			lista.appendChild(li);
		});
		td.appendChild(lista);
	}

	// Insere depois da última linha cujo rótulo começa com "Assunto"
	// (Principal/Secundário); sem ela, depois de "Classe Processual"; em
	// último caso, no início da tabela.
	function linhaReferencia(table) {
		let ultimaAssunto = null;
		let classe = null;
		for (const tr of table.rows) {
			if (tr.hasAttribute(ROW_ATTR)) continue;
			const label = tr.querySelector("td.label, td.labelRadio");
			const texto = normalize(label ? label.textContent : "");
			if (/^assunto/.test(texto)) ultimaAssunto = tr;
			else if (/^classe processual/.test(texto)) classe = tr;
		}
		return ultimaAssunto || classe;
	}

	function reconcile() {
		const table = document.getElementById("informacoesProcessuais");
		if (!table || !processoId) return;

		let row = table.querySelector("tr[" + ROW_ATTR + "]");
		if (!row) {
			row = document.createElement("tr");
			row.setAttribute(ROW_ATTR, "");
			row.innerHTML = '<td class="label"><label></label></td><td colspan="4"></td>';
		}

		const ref = linhaReferencia(table);
		if (ref) {
			if (ref.nextElementSibling !== row) ref.insertAdjacentElement("afterend", row);
		} else {
			const body = table.tBodies[0] || table;
			if (body.firstElementChild !== row) body.insertBefore(row, body.firstElementChild);
		}

		const sig = assinatura();
		if (row.getAttribute("data-pdp-sig") !== sig) {
			row.setAttribute("data-pdp-sig", sig);
			row.querySelector("label").textContent = rotulo();
			renderConteudo(row.cells[1]);
		}
	}

	// ---------------------------------------------------------------------
	// Inicialização
	// ---------------------------------------------------------------------

	let iniciado = false;

	function iniciar() {
		if (iniciado) return;
		const table = document.getElementById("informacoesProcessuais");
		const form = document.getElementById("processoForm");
		const id = idDoProcesso(document);
		if (!table || !form || !id) return;
		iniciado = true;
		processoId = id;

		const local = lerPartes(document);
		if (local) {
			estado = local;
			salvar(id, local);
			reconcile();
			return;
		}

		estado = carregarSalvo(id);
		reconcile();

		buscarPartes(form, id)
			.then(function (dados) {
				if (processoId !== id) return;
				estado = dados;
				erro = null;
				salvar(id, dados);
				reconcile();
			})
			.catch(function (err) {
				console.warn(TAG, "falha ao buscar a aba Partes e Outros:", err);
				if (processoId !== id || estado) return;
				erro = err && err.message ? err.message : String(err);
				reconcile();
			});
	}

	let agendado = false;
	new MutationObserver(function () {
		if (agendado) return;
		agendado = true;
		requestAnimationFrame(function () {
			agendado = false;
			if (!iniciado) iniciar();
			else reconcile();
		});
	}).observe(document.documentElement, { childList: true, subtree: true });
	iniciar();
})();
