// Projudi - Resumo do processo (painel lateral)
//
// Um botão fixo na borda direita da tela do processo ("📋 Resumo") abre um
// painel lateral com as principais informações do processo, em cards que
// podem ser recolhidos (como os dashboards de outras extensões do SEEU).
// O painel fecha no "✕" e só abre quando o usuário clica no botão; enquanto
// estiver aberto, continua aberto ao trocar de aba ou de processo (até ser
// fechado) — a escolha fica em sessionStorage, só nesta aba do navegador.
//
// Cards (nesta primeira versão, a partir de três abas do processo):
// - Processo: número, dias em tramitação, classe, assunto e prioridade — do
//   próprio cabeçalho (table#informacoesProcessuais), presente em todas as
//   abas;
// - Partes ("Partes e Outros", selectedIcon=tabPartes): cada polo (<h4> +
//   table.resultTable dentro de div#includeContent) com nome, RG/CPF, as
//   observações da parte (preso, citado, denúncia recebida…) e advogados;
// - Informações Adicionais (tabDadosAdicionais): os dados do fato (data da
//   infração, delegacia, inquérito, tempo de tramitação) e só os registros
//   que EXISTEM (ex.: "Existem prisões cadastradas", "Recebida em…"): os
//   campos vazios ("Sem…", "Não há…", "Nenhum…", "Processo sem…") ficam de
//   fora, para o resumo ser direto;
// - Movimentações (tabMovimentacoesProcesso): total, último evento, atos do
//   juiz (tipo JUIZ no id da linha "mov1Grau,JUIZ,…", sem as expedições) e
//   marcos do processo (denúncia, prisão/soltura, audiências, sentença,
//   trânsito, suspensão, arquivamento…).
//
// De onde vêm os dados (mesma técnica de reusCabecalho.js e
// habilitarAdvogado.js): a aba que já está aberta é lida do próprio DOM; as
// outras são buscadas em segundo plano com fetch() (POST do #processoForm
// com selectedIcon=<aba>), sem iframe e sem trocar a aba visível. A busca só
// acontece com o painel aberto (nunca ao simplesmente carregar a página) e o
// resultado fica em sessionStorage por processo, para o painel reaparecer
// na hora ao trocar de aba; "↻" busca tudo de novo.
//
// Estruturas confirmadas em .mhtml salvos do Projudi (TJPR):
// - Partes: <div id="includeContent"><h4>Réu</h4><table class="resultTable">;
//   linha de dados = <tr> com <a href=".../parteProcesso.do">; colunas
//   achadas pelo <th>: "RG", "CPF/CNPJ", "Observação" (<li><b>Parte citada
//   nos Autos</b></li>, <em>Denúncia Recebida em …</em>, <ul style="color:
//   red"><li>Réu Preso (…)</li>) e "Advogados" (<li>OAB 12345N-PR - NOME</li>
//   ou "Parte sem advogado");
// - Informações Adicionais: <div id="includeContent"> com tabelas
//   table.form; cada dado é <td class="label|labelRadio"><label>Rótulo:
//   </label></td> seguido da <td> do valor (às vezes dois pares na mesma
//   linha); valores com lista usam <li> (ex.: Denunciados);
// - Movimentações: table.resultTable com <th> "Seq.", "Data", "Evento",
//   "Movimentado Por"; linha de evento <tr id="mov1Grau,TIPO,…"> com 5 <td>,
//   título em <b><a class="link" href=".../movimentacao.do">.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpResumoProcesso) return;
	window.__pdpResumoProcesso = true;

	const TAG = "[Projudi Resumo do processo]";
	const BASE = "/projudi";
	const CHAVE_ABERTO = "pdp-resumo-aberto";
	const CHAVE_DADOS = "pdp-resumo:";
	const CHAVE_RECOLHIDOS = "pdp-resumo-recolhidos";
	const ABAS = {
		partes: { id: "tabPartes", nome: "Partes e Outros" },
		info: { id: "tabDadosAdicionais", nome: "Informações Adicionais" },
		movs: { id: "tabMovimentacoesProcesso", nome: "Movimentações" },
	};
	const LIMITE_LISTA = 6;

	// ---------------------------------------------------------------------
	// Utilitários
	// ---------------------------------------------------------------------

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

	function semDoisPontos(text) {
		return collapse(text).replace(/\s*:\s*$/, "");
	}

	function localURL(value, path) {
		const url = new URL(value, location.href);
		if (url.origin !== location.origin || url.pathname !== path) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	// Link interno do Projudi (qualquer tela), ou "" se for de fora.
	function linkProjudi(a) {
		if (!a) return "";
		const href = a.getAttribute("href") || "";
		if (!href || /^(#|javascript:)/i.test(href)) return "";
		try {
			const url = new URL(href, location.href);
			if (url.origin !== location.origin || !url.pathname.startsWith(BASE + "/")) return "";
			return url.href;
		} catch (err) {
			return "";
		}
	}

	// Texto de uma célula sem os botões/links que a própria extensão
	// acrescenta (Alterar, ⭐, ✖, Incluir…).
	function textoLimpo(el) {
		if (!el) return "";
		const clone = el.cloneNode(true);
		clone.querySelectorAll('[class*="pdp-"], [id^="pdp"], img, input, button, select, script, style').forEach(function (n) {
			n.remove();
		});
		return collapse(clone.textContent);
	}

	async function readPage(url, options) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 30000);
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

	// ---------------------------------------------------------------------
	// Tela do processo e abas
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

	// Só a própria tela do processo (visualizacaoProcesso.do?actionType=
	// visualizar, com as abas) pode receber o reenvio do #processoForm:
	// diálogos e telas de ação também usam id="processoForm", e reenviar um
	// deles EXECUTARIA a ação de novo (ver reusCabecalho.js).
	function ehTelaDoProcesso() {
		const form = document.getElementById("processoForm");
		if (!form || !idDoProcesso(document)) return false;
		if (!document.querySelector('[id^="tabItemprefix"]')) return false;
		if (!document.getElementById("informacoesProcessuais")) return false;
		try {
			const url = new URL(form.getAttribute("action") || location.href, location.href);
			return url.pathname === BASE + "/visualizacaoProcesso.do";
		} catch (err) {
			return false;
		}
	}

	function urlDaAba(form, tabId) {
		const tab = Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && new RegExp("['\"]" + tabId + "['\"]").test(onclick);
		});
		const match = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab ? tab.getAttribute("onclick") : "");
		let url = null;
		if (match) {
			try {
				url = localURL(match[1], BASE + "/visualizacaoProcesso.do");
			} catch (err) {
				url = null;
			}
		}
		if (!url) url = localURL(form.getAttribute("action") || location.href, BASE + "/visualizacaoProcesso.do");
		if (url.searchParams.get("actionType") !== "visualizar") throw new Error("a aba não aponta para a tela do processo");
		return url;
	}

	function abaAtual() {
		const form = document.getElementById("processoForm");
		const campo = form && form.elements.namedItem("selectedIcon");
		return campo && typeof campo.value === "string" ? campo.value : "";
	}

	async function lerAba(chave, id) {
		const aba = ABAS[chave];
		const form = document.getElementById("processoForm");
		if (abaAtual() === aba.id) return document;
		const body = new URLSearchParams();
		for (const pair of new FormData(form)) {
			if (typeof pair[1] === "string") body.append(pair[0], pair[1]);
		}
		body.set("selectedIcon", aba.id);
		body.set("id", id);
		const doc = await readPage(urlDaAba(form, aba.id).href, { method: "POST", body: body });
		if (idDoProcesso(doc) !== id) throw new Error('a resposta da aba "' + aba.nome + '" não corresponde ao processo atual');
		return doc;
	}

	// ---------------------------------------------------------------------
	// Leitura: cabeçalho (card "Processo")
	// ---------------------------------------------------------------------

	function lerCabecalho(doc) {
		const dados = { numero: "", dias: "", campos: [] };
		const titulo = doc.getElementById("barraTituloStatusProcessual");
		if (titulo) {
			const em = titulo.querySelector("em");
			dados.numero = collapse(em ? em.textContent : "");
			const dias = /\(\s*(\d+)\s*dia\(s\)\s*em\s*tramita/i.exec(titulo.textContent || "");
			if (dias) dados.dias = dias[1];
		}
		const table = doc.getElementById("informacoesProcessuais");
		if (!table) return dados;
		const QUERO = [
			{ re: /^classe processual/, nome: "Classe" },
			{ re: /^assunto principal/, nome: "Assunto" },
			{ re: /^prioridade/, nome: "Prioridade", destaque: true },
			{ re: /^nivel de sigilo/, nome: "Sigilo", ignorar: /^publico$/ },
		];
		for (const tr of table.rows) {
			if (tr.hasAttribute("data-pdp-reus-row")) continue;
			const label = tr.querySelector("td.label");
			if (!label || !label.nextElementSibling) continue;
			const rotulo = normalize(label.textContent);
			const q = QUERO.find(function (item) { return item.re.test(rotulo); });
			if (!q) continue;
			const valor = textoLimpo(label.nextElementSibling)
				.replace(/\s*(Alterar|Incluir|Secundários)\s*$/g, "")
				.trim();
			if (!valor || (q.ignorar && q.ignorar.test(normalize(valor)))) continue;
			dados.campos.push({ rotulo: q.nome, valor: valor, destaque: !!q.destaque });
		}
		return dados;
	}

	// ---------------------------------------------------------------------
	// Leitura: aba "Partes e Outros"
	// ---------------------------------------------------------------------

	function tituloDaTabela(table) {
		for (let el = table.previousElementSibling; el; el = el.previousElementSibling) {
			if (el.tagName === "H4") return collapse(el.textContent);
			if (el.tagName === "TABLE" && el.classList.contains("resultTable")) return "";
		}
		return "";
	}

	function valorDocumento(text) {
		const value = collapse(text);
		if (!value) return "";
		if (/^(nao cadastrad[oa]|nao informad[oa]|-+)$/.test(normalize(value))) return "";
		return value;
	}

	function tipoDoPolo(table, titulo) {
		if (table.querySelector('[id^="rowpromovidas"], [id^="iconpromovidas"]')) return "passivo";
		if (table.querySelector('[id^="rowpromoventes"], [id^="iconpromoventes"]')) return "ativo";
		if (table.querySelector('[id^="rowvitimas"], [id^="iconvitimas"]')) return "vitimas";
		if (table.querySelector('[id^="rowtestemunhas"], [id^="icontestemunhas"]')) return "testemunhas";
		const t = normalize(titulo);
		if (/^testemunh/.test(t)) return "testemunhas";
		if (/^vitim/.test(t)) return "vitimas";
		return "outros";
	}

	// Observações da parte: cada <li> e cada <em>/<a> vira um item curto.
	function lerObservacoes(td) {
		if (!td) return [];
		const itens = [];
		const vistos = new Set();
		function add(texto, alerta) {
			const t = collapse(texto);
			if (!t || vistos.has(normalize(t))) return;
			if (/^\(?citacao e intimacao online/.test(normalize(t))) return;
			vistos.add(normalize(t));
			itens.push({ texto: t, alerta: !!alerta });
		}
		td.querySelectorAll("li").forEach(function (li) {
			const ul = li.closest("ul");
			const vermelho = !!(ul && /red/i.test(ul.getAttribute("style") || ""));
			add(li.textContent, vermelho || /pres[oa]\b/i.test(li.textContent));
		});
		td.querySelectorAll("em, a").forEach(function (el) {
			if (el.closest("li")) return;
			if (el.tagName === "A" && el.querySelector("em")) return;
			add(el.textContent, false);
		});
		if (!itens.length) add(td.textContent, false);
		return itens;
	}

	function lerAdvogados(td) {
		if (!td) return [];
		const lis = Array.prototype.map.call(td.querySelectorAll("li"), function (li) { return collapse(li.textContent); }).filter(Boolean);
		if (lis.length) return lis;
		const texto = collapse(td.textContent);
		return texto && !/sem advogado/i.test(texto) ? [texto] : [];
	}

	function lerPartes(doc) {
		const raiz = doc.getElementById("includeContent") || doc;
		const tables = Array.prototype.filter.call(raiz.querySelectorAll("table.resultTable"), function (table) {
			return !!table.querySelector('a[href*="parteProcesso.do"]');
		});
		if (!tables.length) return null;
		const polos = [];
		const vistos = new Set();
		for (const table of tables) {
			const titulo = tituloDaTabela(table) || "Partes";
			const tipo = tipoDoPolo(table, titulo);
			const ths = Array.prototype.slice.call(table.querySelectorAll("thead th")).map(function (th) { return normalize(th.textContent); });
			const col = function (re) { return ths.findIndex(function (t) { return re.test(t); }); };
			const colRG = col(/^rg\b/), colCPF = col(/^cpf/), colObs = col(/^observacao/), colAdv = col(/^advogad/);
			const partes = [];
			const rows = table.tBodies.length ? table.tBodies[0].rows : [];
			for (const tr of rows) {
				const link = tr.querySelector('a[href*="parteProcesso.do"]');
				if (!link || link.closest("tr") !== tr) continue;
				const href = linkProjudi(link);
				const nome = collapse(link.textContent).replace(/\s*\(cita[çc][ãa]o e intima[çc][ãa]o online[^)]*\)\s*$/i, "");
				if (!nome || (href && vistos.has(href))) continue;
				if (href) vistos.add(href);
				const cells = tr.cells;
				const cel = function (i) { return i >= 0 && cells[i] ? cells[i] : null; };
				const advTd = cel(colAdv);
				partes.push({
					nome: nome,
					href: href,
					rg: cel(colRG) ? valorDocumento(cel(colRG).textContent) : "",
					cpf: cel(colCPF) ? valorDocumento(cel(colCPF).textContent) : "",
					obs: lerObservacoes(cel(colObs)),
					advogados: lerAdvogados(advTd),
					semAdvogado: !!(advTd && /sem advogado/i.test(advTd.textContent || "")),
				});
			}
			if (partes.length) polos.push({ titulo: titulo, tipo: tipo, partes: partes });
		}
		return { polos: polos };
	}

	// ---------------------------------------------------------------------
	// Leitura: aba "Informações Adicionais"
	// ---------------------------------------------------------------------

	// Dados "do fato": aparecem sempre, mesmo sem link.
	const INFO_DADOS = /^(tempo de tramitacao|data da infracao|delegacia|data de conhecimento|numero do inquerito|data do fato)/;
	// Valores que dizem que NÃO há nada cadastrado (ficam fora do resumo).
	const INFO_VAZIO = /^(sem |nao ha |nao existe|nenhum|nenhuma|processo sem |novo |nao possui|nao informad|visualizar$|clique aqui)/;
	// Campos que não interessam ao resumo.
	const INFO_IGNORAR = /^(apreensao\/sngb|formulario nacional|relatorios de antecedentes)/;

	function lerInfo(doc) {
		const raiz = doc.getElementById("includeContent");
		if (!raiz || !raiz.querySelector("td.label, td.labelRadio")) return null;
		const dados = [];
		const registros = [];
		raiz.querySelectorAll("td.label, td.labelRadio").forEach(function (labelTd) {
			if (labelTd.closest("#informacoesProcessuais")) return;
			const rotulo = semDoisPontos(labelTd.textContent);
			if (!rotulo) return;
			const valorTd = labelTd.nextElementSibling;
			if (!valorTd) return;
			const nr = normalize(rotulo);
			if (INFO_IGNORAR.test(nr)) return;

			if (INFO_DADOS.test(nr)) {
				const v = textoLimpo(valorTd);
				if (v && !INFO_VAZIO.test(normalize(v))) dados.push({ rotulo: rotulo, valor: v });
				return;
			}

			let itens = Array.prototype.map.call(valorTd.querySelectorAll("li"), function (li) {
				return { texto: textoLimpo(li), href: linkProjudi(li.querySelector("a")) };
			});
			if (!itens.length) itens = [{ texto: textoLimpo(valorTd), href: linkProjudi(valorTd.querySelector("a")) }];
			itens = itens.filter(function (item) {
				return item.texto && !INFO_VAZIO.test(normalize(item.texto)) && !/^sem sentenca/.test(normalize(item.texto));
			});
			itens.forEach(function (item) {
				item.texto = item.texto.replace(/\s*\(clique para (visualizar|cadastrar)\)\s*/i, " ").trim();
			});
			if (itens.length) registros.push({ rotulo: rotulo, itens: itens });
		});
		return { dados: dados, registros: registros };
	}

	// ---------------------------------------------------------------------
	// Leitura: aba "Movimentações"
	// ---------------------------------------------------------------------

	const MARCOS = [
		/denuncia|queixa-crime/,
		/pris[aã]o|preso|soltura|liberdade|flagrante|preventiva|relaxad|revogad/,
		/audiencia .*(designada|realizada|redesignada|cancelada|nao realizada)/,
		/sentenca|julgad|condenad|absolvi|absolvid|extint|pronuncia|impronuncia|desclassific/,
		/transito|transitad/,
		/suspens|suspenso/,
		/arquivad|arquivamento|baixa definitiva/,
		/citad|citacao/,
		/mandado de prisao|alvara/,
		/recurso|apelacao|remetidos os autos para area recursal/,
		/acordo de nao persecucao|transacao penal|anpp/,
		/redistribuid|evoluida a classe/,
	];

	function lerMovimentacoes(doc) {
		const raiz = doc.getElementById("includeContent") || doc;
		const table = Array.prototype.find.call(raiz.querySelectorAll("table.resultTable"), function (t) {
			const ths = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) { return normalize(th.textContent); });
			return ths.indexOf("evento") !== -1 && ths.some(function (h) { return /^seq/.test(h); });
		});
		if (!table) return null;
		const movs = [];
		Array.prototype.forEach.call(table.querySelectorAll("tr"), function (tr) {
			if (tr.cells.length < 5) return;
			const titulo = tr.cells[3].querySelector("a.link, b a, a");
			if (!titulo) return;
			const seq = collapse(tr.cells[1].textContent);
			if (!/^\d+$/.test(seq)) return;
			const idLinha = tr.getAttribute("id") || "";
			let tipo = idLinha.indexOf(",") !== -1 ? idLinha.split(",")[1] || "" : "";
			const por = collapse(tr.cells[4].textContent);
			if (!tipo && /\b(juiz|juiza|magistrad)/i.test(por)) tipo = "JUIZ";
			const compl = tr.cells[3].querySelector("div");
			const tituloTexto = collapse(titulo.textContent);
			movs.push({
				seq: seq,
				data: collapse(tr.cells[2].textContent).slice(0, 10),
				titulo: tituloTexto,
				compl: textoLimpo(compl).slice(0, 220),
				tipo: tipo.toUpperCase(),
				por: por,
				href: linkProjudi(titulo),
				cancelada: !!tr.querySelector("strike, s, del") || /line-through/.test(tr.getAttribute("style") || ""),
			});
		});
		movs.sort(function (a, b) { return Number(b.seq) - Number(a.seq); });
		const validas = movs.filter(function (m) { return !m.cancelada && !/^cancelada a movimentacao/.test(normalize(m.titulo)); });
		const juiz = validas.filter(function (m) {
			return /^(JUIZ|MAGISTRADO)$/.test(m.tipo) && !/^expedicao/.test(normalize(m.titulo));
		});
		const marcos = validas.filter(function (m) {
			const t = normalize(m.titulo);
			if (/^(expedicao de|juntada de|confirmada a|autos entregues|recebidos os autos|leitura de)/.test(t) && !/mandado de prisao|alvara/.test(t)) return false;
			return MARCOS.some(function (re) { return re.test(t); });
		});
		return {
			total: validas.length,
			ultima: validas[0] || null,
			juiz: juiz,
			marcos: marcos,
		};
	}

	// ---------------------------------------------------------------------
	// Estado (por processo, em sessionStorage)
	// ---------------------------------------------------------------------

	let processoId = null;
	let estado = { cabecalho: null, partes: null, info: null, movs: null, quando: 0 };
	const carregando = { partes: false, info: false, movs: false };
	const erros = { partes: "", info: "", movs: "" };
	let geracao = 0;

	function carregarSalvo(id) {
		try {
			const raw = sessionStorage.getItem(CHAVE_DADOS + id);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			return null;
		}
	}

	function salvar() {
		if (!processoId) return;
		try {
			sessionStorage.setItem(CHAVE_DADOS + processoId, JSON.stringify(estado));
		} catch (err) {
			console.warn(TAG, "não foi possível salvar em sessionStorage:", err);
		}
	}

	function lerPreferencia(chave, padrao, area) {
		try {
			const raw = (area || sessionStorage).getItem(chave);
			return raw == null ? padrao : JSON.parse(raw);
		} catch (err) {
			return padrao;
		}
	}

	function gravarPreferencia(chave, valor, area) {
		try {
			(area || sessionStorage).setItem(chave, JSON.stringify(valor));
		} catch (err) {
			// navegador sem armazenamento: só não lembra a escolha
		}
	}

	const LEITORES = { partes: lerPartes, info: lerInfo, movs: lerMovimentacoes };

	function atualizarTudo() {
		if (!processoId) return;
		const id = processoId;
		const minha = ++geracao;
		estado.cabecalho = lerCabecalho(document);
		Object.keys(ABAS).forEach(function (chave) {
			carregando[chave] = true;
			erros[chave] = "";
			lerAba(chave, id)
				.then(function (doc) {
					if (minha !== geracao || processoId !== id) return;
					const dados = LEITORES[chave](doc);
					if (!dados) throw new Error('a resposta não contém a aba "' + ABAS[chave].nome + '"');
					estado[chave] = dados;
					estado.quando = Date.now();
					salvar();
				})
				.catch(function (err) {
					if (minha !== geracao) return;
					console.warn(TAG, "falha ao ler a aba " + ABAS[chave].nome + ":", err);
					erros[chave] = err && err.message ? err.message : String(err);
				})
				.finally(function () {
					if (minha !== geracao) return;
					carregando[chave] = false;
					render();
				});
		});
		render();
	}

	// ---------------------------------------------------------------------
	// Interface
	// ---------------------------------------------------------------------

	let painel = null;
	let botaoAba = null;

	function el(tag, classe, texto) {
		const e = document.createElement(tag);
		if (classe) e.className = classe;
		if (texto != null) e.textContent = texto;
		return e;
	}

	function abrirLink(titulo, url) {
		if (!url) return;
		const api = window.__pdpQuickActions;
		if (api && typeof api.openActionModal === "function") {
			api.openActionModal(titulo, url);
		} else {
			window.open(url, "_blank", "noopener");
		}
	}

	function linkOuTexto(texto, url, tituloPopup, classe) {
		if (!url) return el("span", classe || "", texto);
		const a = el("a", "pdp-rs-link " + (classe || ""), texto);
		a.href = url;
		a.title = "Abrir num popup, sem sair desta tela";
		a.addEventListener("click", function (event) {
			event.preventDefault();
			abrirLink(tituloPopup || texto, url);
		});
		return a;
	}

	// Na aba Movimentações aberta, rola até o evento; senão abre o evento
	// num popup.
	function irParaMovimentacao(mov) {
		if (abaAtual() === ABAS.movs.id) {
			const raiz = document.getElementById("includeContent") || document;
			const linha = Array.prototype.find.call(raiz.querySelectorAll("table.resultTable tr"), function (tr) {
				return tr.cells.length >= 5 && collapse(tr.cells[1].textContent) === mov.seq;
			});
			if (linha) {
				linha.scrollIntoView({ behavior: "smooth", block: "center" });
				linha.classList.remove("pdp-rs-piscar");
				void linha.offsetWidth;
				linha.classList.add("pdp-rs-piscar");
				return;
			}
		}
		abrirLink("Movimentação " + mov.seq + " - " + mov.titulo, mov.href);
	}

	function recolhidos() {
		const v = lerPreferencia(CHAVE_RECOLHIDOS, [], localStorage);
		return Array.isArray(v) ? v : [];
	}

	function card(chave, titulo, badge, montarCorpo) {
		const sec = el("section", "pdp-rs-card");
		sec.setAttribute("data-card", chave);
		const fechado = recolhidos().indexOf(chave) !== -1;
		if (fechado) sec.classList.add("pdp-rs-recolhido");
		const cab = el("button", "pdp-rs-card-cab");
		cab.type = "button";
		cab.setAttribute("aria-expanded", fechado ? "false" : "true");
		cab.appendChild(el("span", "pdp-rs-card-titulo", titulo));
		if (badge != null && badge !== "") cab.appendChild(el("span", "pdp-rs-badge", String(badge)));
		cab.appendChild(el("span", "pdp-rs-seta", "▾"));
		cab.addEventListener("click", function () {
			const lista = recolhidos().filter(function (c) { return c !== chave; });
			const fechar = !sec.classList.contains("pdp-rs-recolhido");
			if (fechar) lista.push(chave);
			gravarPreferencia(CHAVE_RECOLHIDOS, lista, localStorage);
			sec.classList.toggle("pdp-rs-recolhido", fechar);
			cab.setAttribute("aria-expanded", fechar ? "false" : "true");
		});
		sec.appendChild(cab);
		const corpo = el("div", "pdp-rs-card-corpo");
		montarCorpo(corpo);
		sec.appendChild(corpo);
		return sec;
	}

	function status(corpo, chave, vazio) {
		if (estado[chave]) {
			if (carregando[chave]) corpo.appendChild(el("p", "pdp-rs-status", "Atualizando…"));
			return false;
		}
		if (carregando[chave]) {
			corpo.appendChild(el("p", "pdp-rs-status", "Carregando…"));
		} else if (erros[chave]) {
			corpo.appendChild(el("p", "pdp-rs-status pdp-rs-erro", "Não foi possível ler a aba " + ABAS[chave].nome + " (" + erros[chave] + ")."));
		} else {
			corpo.appendChild(el("p", "pdp-rs-status", vazio));
		}
		return true;
	}

	function linhaDado(rotulo, valor, destaque) {
		const d = el("div", "pdp-rs-dado" + (destaque ? " pdp-rs-destaque" : ""));
		d.appendChild(el("span", "pdp-rs-rotulo", rotulo));
		if (valor instanceof Node) d.appendChild(valor);
		else d.appendChild(el("span", "pdp-rs-valor", valor));
		return d;
	}

	// Lista com "+ N mais" quando passa do limite.
	function listaLimitada(corpo, itens, montarItem) {
		const ul = el("ul", "pdp-rs-lista");
		itens.forEach(function (item, i) {
			const li = montarItem(item);
			if (i >= LIMITE_LISTA) li.hidden = true;
			ul.appendChild(li);
		});
		corpo.appendChild(ul);
		if (itens.length > LIMITE_LISTA) {
			const mais = el("button", "pdp-rs-mais", "+ " + (itens.length - LIMITE_LISTA) + " mais");
			mais.type = "button";
			mais.addEventListener("click", function () {
				ul.querySelectorAll("li[hidden]").forEach(function (li) { li.hidden = false; });
				mais.remove();
			});
			corpo.appendChild(mais);
		}
	}

	function itemMov(mov) {
		const li = el("li", "pdp-rs-mov");
		const topo = el("div", "pdp-rs-mov-topo");
		topo.appendChild(el("span", "pdp-rs-seq", mov.seq));
		topo.appendChild(el("span", "pdp-rs-data", mov.data));
		li.appendChild(topo);
		const a = el("a", "pdp-rs-link pdp-rs-mov-titulo", mov.titulo);
		a.href = mov.href || "#";
		a.title = (mov.compl ? mov.compl + "\n\n" : "") + (abaAtual() === ABAS.movs.id ? "Clique para ir até o evento" : "Clique para abrir o evento num popup");
		a.addEventListener("click", function (event) {
			event.preventDefault();
			irParaMovimentacao(mov);
		});
		li.appendChild(a);
		return li;
	}

	function montarProcesso(corpo) {
		const c = estado.cabecalho || lerCabecalho(document);
		if (c.numero) {
			const linha = el("div", "pdp-rs-numero", c.numero);
			if (c.dias) linha.appendChild(el("span", "pdp-rs-dias", c.dias + " dia(s) em tramitação"));
			corpo.appendChild(linha);
		}
		c.campos.forEach(function (campo) { corpo.appendChild(linhaDado(campo.rotulo, campo.valor, campo.destaque)); });
	}

	function montarPartes(corpo) {
		if (status(corpo, "partes", "Nenhuma parte cadastrada.")) return;
		estado.partes.polos.forEach(function (polo) {
			const grupo = el("div", "pdp-rs-polo pdp-rs-polo-" + polo.tipo);
			grupo.appendChild(el("div", "pdp-rs-subtitulo", polo.titulo + (polo.partes.length > 1 ? " (" + polo.partes.length + ")" : "")));
			const compacto = polo.tipo === "testemunhas";
			const ul = el("ul", "pdp-rs-lista");
			polo.partes.forEach(function (p, i) {
				const li = el("li", "pdp-rs-parte");
				if (compacto && i >= LIMITE_LISTA) li.hidden = true;
				li.appendChild(linkOuTexto(p.nome, p.href, "Parte do Processo - " + p.nome, "pdp-rs-nome"));
				const docs = [];
				if (p.rg) docs.push("RG " + p.rg);
				if (p.cpf) docs.push((p.cpf.indexOf("/") !== -1 ? "CNPJ " : "CPF ") + p.cpf);
				if (docs.length && !compacto) li.appendChild(el("div", "pdp-rs-docs", docs.join(" · ")));
				if (!compacto && p.obs.length) {
					const chips = el("div", "pdp-rs-chips");
					p.obs.forEach(function (o) { chips.appendChild(el("span", "pdp-rs-chip" + (o.alerta ? " pdp-rs-chip-alerta" : ""), o.texto)); });
					li.appendChild(chips);
				}
				if (polo.tipo === "passivo" || polo.tipo === "ativo") {
					if (p.advogados.length) {
						p.advogados.forEach(function (adv) { li.appendChild(el("div", "pdp-rs-adv", "⚖ " + adv)); });
					} else if (polo.tipo === "passivo" || !p.semAdvogado) {
						li.appendChild(el("div", "pdp-rs-adv pdp-rs-adv-sem", "Sem advogado"));
					}
				}
				ul.appendChild(li);
			});
			grupo.appendChild(ul);
			if (compacto && polo.partes.length > LIMITE_LISTA) {
				const mais = el("button", "pdp-rs-mais", "+ " + (polo.partes.length - LIMITE_LISTA) + " mais");
				mais.type = "button";
				mais.addEventListener("click", function () {
					ul.querySelectorAll("li[hidden]").forEach(function (li) { li.hidden = false; });
					mais.remove();
				});
				grupo.appendChild(mais);
			}
			corpo.appendChild(grupo);
		});
	}

	function montarInfo(corpo) {
		if (status(corpo, "info", "Nada cadastrado.")) return;
		const info = estado.info;
		info.dados.forEach(function (d) { corpo.appendChild(linhaDado(d.rotulo, d.valor)); });
		if (info.registros.length) {
			if (info.dados.length) corpo.appendChild(el("div", "pdp-rs-subtitulo", "Cadastrado no processo"));
			info.registros.forEach(function (r) {
				const box = el("div", "pdp-rs-dado");
				box.appendChild(el("span", "pdp-rs-rotulo", r.rotulo));
				const valores = el("span", "pdp-rs-valor");
				r.itens.forEach(function (item, i) {
					if (i) valores.appendChild(document.createElement("br"));
					valores.appendChild(linkOuTexto(item.texto, item.href, r.rotulo));
				});
				box.appendChild(valores);
				corpo.appendChild(box);
			});
		} else if (!info.dados.length) {
			corpo.appendChild(el("p", "pdp-rs-status", "Nada cadastrado."));
		}
	}

	function montarMovs(corpo) {
		if (status(corpo, "movs", "Nenhuma movimentação.")) return;
		const m = estado.movs;
		if (m.ultima) {
			corpo.appendChild(el("div", "pdp-rs-subtitulo", "Último evento"));
			const ul = el("ul", "pdp-rs-lista");
			ul.appendChild(itemMov(m.ultima));
			corpo.appendChild(ul);
		}
		corpo.appendChild(el("div", "pdp-rs-subtitulo", "Decisões e despachos do juiz" + (m.juiz.length ? " (" + m.juiz.length + ")" : "")));
		if (m.juiz.length) listaLimitada(corpo, m.juiz, itemMov);
		else corpo.appendChild(el("p", "pdp-rs-status", "Nenhum."));
		corpo.appendChild(el("div", "pdp-rs-subtitulo", "Marcos do processo" + (m.marcos.length ? " (" + m.marcos.length + ")" : "")));
		if (m.marcos.length) listaLimitada(corpo, m.marcos, itemMov);
		else corpo.appendChild(el("p", "pdp-rs-status", "Nenhum."));
	}

	function contarPartes() {
		if (!estado.partes) return "";
		return estado.partes.polos.reduce(function (n, p) { return n + p.partes.length; }, 0);
	}

	function render() {
		if (!painel) return;
		const scroll = painel.querySelector(".pdp-rs-conteudo");
		const topo = scroll ? scroll.scrollTop : 0;
		const conteudo = el("div", "pdp-rs-conteudo");
		conteudo.appendChild(card("processo", "Processo", null, montarProcesso));
		conteudo.appendChild(card("partes", "Partes", contarPartes(), montarPartes));
		conteudo.appendChild(card("info", "Informações Adicionais", estado.info ? estado.info.registros.length : "", montarInfo));
		conteudo.appendChild(card("movs", "Movimentações", estado.movs ? estado.movs.total : "", montarMovs));
		const rodape = el("div", "pdp-rs-rodape");
		const ocupado = carregando.partes || carregando.info || carregando.movs;
		rodape.textContent = ocupado
			? "Lendo as abas do processo…"
			: estado.quando
				? "Atualizado às " + new Date(estado.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
				: "";
		conteudo.appendChild(rodape);
		if (scroll) scroll.replaceWith(conteudo);
		else painel.appendChild(conteudo);
		conteudo.scrollTop = topo;
		const btn = painel.querySelector(".pdp-rs-atualizar");
		if (btn) btn.disabled = ocupado;
	}

	function criarPainel() {
		painel = el("aside", "pdp-rs-painel");
		painel.id = "pdp-resumo-painel";
		painel.setAttribute("role", "complementary");
		painel.setAttribute("aria-label", "Resumo do processo");
		const cab = el("header", "pdp-rs-cab");
		const botoes = el("div", "pdp-rs-botoes");
		const atualizar = el("button", "pdp-rs-botao pdp-rs-atualizar", "↻");
		atualizar.type = "button";
		atualizar.title = "Ler as abas de novo";
		atualizar.addEventListener("click", atualizarTudo);
		const fechar = el("button", "pdp-rs-botao pdp-rs-fechar", "✕");
		fechar.type = "button";
		fechar.title = "Fechar o resumo";
		fechar.addEventListener("click", function () { definirAberto(false); });
		botoes.appendChild(atualizar);
		botoes.appendChild(fechar);
		// Botões à esquerda: a barra "Ocultar/↕ Mover" da extensão fica no
		// canto direito da tela e pode passar por cima do painel.
		cab.appendChild(botoes);
		cab.appendChild(el("h2", "pdp-rs-titulo", "Resumo do Processo"));
		painel.appendChild(cab);
		document.body.appendChild(painel);
	}

	function definirAberto(aberto) {
		gravarPreferencia(CHAVE_ABERTO, !!aberto);
		if (aberto) {
			if (!painel) criarPainel();
			painel.hidden = false;
			if (botaoAba) botaoAba.hidden = true;
			const ocupado = carregando.partes || carregando.info || carregando.movs;
			const antigo = !estado.quando || Date.now() - estado.quando > 15000;
			if (!ocupado && (antigo || !estado.partes || !estado.info || !estado.movs)) atualizarTudo();
			else render();
		} else {
			if (painel) painel.hidden = true;
			if (botaoAba) botaoAba.hidden = false;
		}
	}

	function criarBotaoAba() {
		botaoAba = el("button", "pdp-rs-aba");
		botaoAba.id = "pdp-resumo-aba";
		botaoAba.type = "button";
		botaoAba.title = "Abrir o resumo do processo (partes, informações adicionais e movimentações)";
		botaoAba.appendChild(el("span", "pdp-rs-aba-icone", "📋"));
		botaoAba.appendChild(el("span", "pdp-rs-aba-texto", "Resumo"));
		botaoAba.addEventListener("click", function () { definirAberto(true); });
		document.body.appendChild(botaoAba);
	}

	// ---------------------------------------------------------------------
	// Inicialização
	// ---------------------------------------------------------------------

	function iniciar() {
		if (!document.body || !ehTelaDoProcesso()) return false;
		processoId = idDoProcesso(document);
		const salvo = carregarSalvo(processoId);
		if (salvo) estado = Object.assign(estado, salvo);
		estado.cabecalho = lerCabecalho(document);
		// A aba aberta já está no DOM: usa direto.
		Object.keys(ABAS).forEach(function (chave) {
			if (abaAtual() === ABAS[chave].id) {
				const dados = LEITORES[chave](document);
				if (dados) estado[chave] = dados;
			}
		});
		criarBotaoAba();
		if (lerPreferencia(CHAVE_ABERTO, false)) definirAberto(true);
		return true;
	}

	if (!iniciar()) {
		let tentativas = 0;
		const timer = setInterval(function () {
			tentativas++;
			if (iniciar() || tentativas > 20) clearInterval(timer);
		}, 500);
	}

	// Para testes e para outras funções da extensão.
	window.__pdpResumoProcessoApi = {
		lerPartes: lerPartes,
		lerInfo: lerInfo,
		lerMovimentacoes: lerMovimentacoes,
		lerCabecalho: lerCabecalho,
		abrir: function () { definirAberto(true); },
		fechar: function () { definirAberto(false); },
	};
})();
