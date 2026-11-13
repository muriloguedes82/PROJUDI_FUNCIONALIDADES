// Projudi - Resumo do processo (painel lateral)
//
// Um botão fixo na borda direita da tela do processo ("📋 Resumo") abre um
// painel lateral, em cards que podem ser recolhidos, com um resumo
// objetivo do processo. O painel fecha no "✕" e só abre quando o usuário
// clica no botão; enquanto estiver aberto, continua aberto ao trocar de aba
// ou de processo (até ser fechado) — a escolha fica em sessionStorage, só
// nesta aba do navegador.
//
// Cards (decisão do usuário, versão 34 — "objetivo e direto"):
// - Resumo: só os réus (polo passivo da aba "Partes e Outros") com as
//   informações EM VERMELHO da coluna "Observação" da linha de cada um
//   (<ul style="color:red"><li>Réu Preso (…)</li>), a data da infração e se
//   existem apreensões e depósitos (aba "Informações Adicionais");
// - Movimentações relevantes (aba "Movimentações"): não transcreve todos os
//   eventos. Mostra as audiências futuras e os eventos de juiz, Ministério
//   Público e advogados/defensores/procuradores, sem os eventos automáticos
//   (confirmações de leitura, recebimento dos autos, expedições…).
//
// De onde vêm os dados (mesma técnica de reusCabecalho.js e
// habilitarAdvogado.js): a aba que já está aberta é lida do próprio DOM; as
// outras são buscadas em segundo plano com fetch() (POST do #processoForm
// com selectedIcon=<aba>), sem iframe e sem trocar a aba visível. A busca só
// acontece com o painel aberto (nunca ao simplesmente carregar a página) e o
// resultado fica em sessionStorage por processo; "↻" busca tudo de novo.
//
// Estruturas confirmadas em .mhtml salvos do Projudi (TJPR):
// - Partes: <div id="includeContent"><h4>Réu</h4><table class="resultTable">;
//   o polo passivo tem <tr id="rowpromovidas0"> / <img id="iconpromovidas0">;
//   linha de dados = <tr> com <a href=".../parteProcesso.do">; a coluna
//   "Observação" (achada pelo <th>) traz <ul style="color:red;"><li>Réu Preso
//   (2 meses e 20 dias)</li></ul> — só esses itens vermelhos entram;
// - Informações Adicionais: <td class="label|labelRadio">Rótulo:</td>
//   seguido da <td> do valor. "Data da Infração:" traz a data; "Depósito
//   Judicial/Fiança" e "Depósitos/Alvarás Eletrônicos - Integração CEF"
//   dizem "Não há depósitos…" quando não há nada; "Apreensão/SNGB" mostra
//   sempre "Visualizar" (link para apreensao.do), por isso a existência de
//   apreensões é conferida abrindo essa tela em segundo plano (GET, o mesmo
//   do clique no link) e, como reforço, pelos eventos "CADASTRAMENTO DE BENS
//   APREENDIDOS" / "JUNTADA DE DOCUMENTOS APREENSÃO" das movimentações;
// - Movimentações: table.resultTable com <th> "Seq.", "Data", "Evento",
//   "Movimentado Por"; linha de evento <tr id="mov1Grau,TIPO,…"> (TIPO =
//   JUIZ, PROMOTOR, ADVOGADO, SERVIDOR, OUTROS…) com 5 <td>; título em
//   <b><a class="link" href=".../movimentacao.do">; complemento no <div>;
//   "Movimentado Por" = nome + <font><b>Papel</b></font> ("Magistrada",
//   "Ministério Público", "Advogada"…). Audiência designada: título
//   "AUDIÊNCIA DE … DESIGNADA" e complemento "(Agendada para: 13 de
//   novembro de 2026 às 13:15, em …)".
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
	const CHAVE_DADOS = "pdp-resumo-v2:";
	const CHAVE_RECOLHIDOS = "pdp-resumo-recolhidos";
	const ABAS = {
		partes: { id: "tabPartes", nome: "Partes e Outros" },
		info: { id: "tabDadosAdicionais", nome: "Informações Adicionais" },
		movs: { id: "tabMovimentacoesProcesso", nome: "Movimentações" },
	};
	const LIMITE_LISTA = 5;
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
	// Leitura: réus (aba "Partes e Outros")
	// ---------------------------------------------------------------------

	function tituloDaTabela(table) {
		for (let el = table.previousElementSibling; el; el = el.previousElementSibling) {
			if (el.tagName === "H4") return collapse(el.textContent);
			if (el.tagName === "TABLE" && el.classList.contains("resultTable")) return "";
		}
		return "";
	}

	// Mesmo critério de reusCabecalho.js.
	const POLO_PASSIVO_TITULOS = /^(reu|reus|re|indiciad|noticiad|investigad|denunciad|querelad|acusad|autor(es)? do fato|flagrantead|sentenciad|apenad|executad|requerid|promovid)/;

	function ehPoloPassivo(table, titulo) {
		if (table.querySelector('[id^="rowpromovidas"], [id^="iconpromovidas"]')) return true;
		return POLO_PASSIVO_TITULOS.test(normalize(titulo));
	}

	function ehVermelho(el) {
		const estilo = (el.getAttribute("style") || "") + ";color:" + (el.getAttribute("color") || "");
		return /color\s*:\s*(red|#f00\b|#ff0000|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\))/i.test(estilo);
	}

	// Itens em vermelho da coluna "Observação" (ex.: "Réu Preso (…)").
	function observacoesVermelhas(td) {
		if (!td) return [];
		const itens = [];
		td.querySelectorAll("li, span, font, em, b").forEach(function (n) {
			let vermelho = false;
			for (let a = n; a && a !== td.parentNode; a = a.parentElement) {
				if (ehVermelho(a)) { vermelho = true; break; }
			}
			if (!vermelho) return;
			if (n.tagName !== "LI" && n.closest("li")) return;
			if (n.tagName !== "LI" && n.querySelector("li")) return;
			const t = collapse(n.textContent);
			if (t && itens.indexOf(t) === -1) itens.push(t);
		});
		return itens;
	}

	function lerReus(doc) {
		const raiz = doc.getElementById("includeContent") || doc;
		const tables = Array.prototype.filter.call(raiz.querySelectorAll("table.resultTable"), function (table) {
			return !!table.querySelector('a[href*="parteProcesso.do"]');
		});
		if (!tables.length) return null;
		const titulos = [];
		const reus = [];
		const vistos = new Set();
		for (const table of tables) {
			const titulo = tituloDaTabela(table);
			if (!ehPoloPassivo(table, titulo)) continue;
			if (titulo && titulos.indexOf(titulo) === -1) titulos.push(titulo);
			const ths = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return normalize(th.textContent); });
			const colObs = ths.findIndex(function (t) { return /^observacao/.test(t); });
			const rows = table.tBodies.length ? table.tBodies[0].rows : [];
			for (const tr of rows) {
				const link = tr.querySelector('a[href*="parteProcesso.do"]');
				if (!link || link.closest("tr") !== tr) continue;
				const href = linkProjudi(link);
				const nome = collapse(link.textContent);
				if (!nome || (href && vistos.has(href))) continue;
				if (href) vistos.add(href);
				reus.push({
					nome: nome,
					href: href,
					alertas: observacoesVermelhas(colObs >= 0 ? tr.cells[colObs] : null),
				});
			}
		}
		return { titulo: titulos.join(" / "), reus: reus };
	}

	// ---------------------------------------------------------------------
	// Leitura: aba "Informações Adicionais"
	// ---------------------------------------------------------------------

	const VAZIO = /^(sem |nao ha |nao existe|nenhum|nenhuma|processo sem |nao possui)/;

	// { dataInfracao, depositos: [{ rotulo, texto, href, existe }], apreensaoHref }
	function lerInfo(doc) {
		const raiz = doc.getElementById("includeContent");
		if (!raiz || !raiz.querySelector("td.label, td.labelRadio")) return null;
		const info = { dataInfracao: "", depositos: [], apreensaoHref: "" };
		raiz.querySelectorAll("td.label, td.labelRadio").forEach(function (labelTd) {
			const valorTd = labelTd.nextElementSibling;
			const rotulo = semDoisPontos(labelTd.textContent);
			if (!rotulo || !valorTd) return;
			const nr = normalize(rotulo);
			if (/^data da infracao/.test(nr)) {
				info.dataInfracao = textoLimpo(valorTd);
			} else if (/^apreensao/.test(nr)) {
				info.apreensaoHref = linkProjudi(valorTd.querySelector("a"));
			} else if (/^deposito/.test(nr)) {
				const texto = textoLimpo(valorTd).replace(/\s*\(clique para (visualizar|cadastrar)\)\s*/i, "").trim();
				info.depositos.push({
					rotulo: rotulo,
					texto: texto,
					href: linkProjudi(valorTd.querySelector("a")),
					existe: !!texto && !VAZIO.test(normalize(texto)),
				});
			}
		});
		return info;
	}

	// Tela "Apreensão/SNGB" (apreensao.do): há apreensão se alguma tabela de
	// resultado tem linha de dados; não há se a tela diz que não há nada.
	// Resultado: true, false ou null (não deu para saber).
	function lerApreensoes(doc) {
		const corpo = doc.body;
		if (!corpo) return null;
		const linhas = Array.prototype.filter.call(corpo.querySelectorAll("table.resultTable tbody tr"), function (tr) {
			const tds = Array.prototype.filter.call(tr.cells, function (td) { return collapse(td.textContent); });
			return tds.length >= 2;
		});
		if (linhas.length) return true;
		const texto = normalize(corpo.textContent);
		if (/(nenhum|nenhuma|nao ha|nao existe|nao foram encontrad|sem )[^.]{0,40}(apreens|bem|bens|registro|resultado)/.test(texto)) return false;
		return null;
	}

	async function buscarApreensoes(href) {
		const url = new URL(href, location.href);
		if (url.origin !== location.origin || !/\/apreensao\.do$/.test(url.pathname)) return null;
		const doc = await readPage(url.href, { method: "GET" });
		return lerApreensoes(doc);
	}

	// ---------------------------------------------------------------------
	// Leitura: aba "Movimentações"
	// ---------------------------------------------------------------------

	const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

	// "(Agendada para: 13 de novembro de 2026 às 13:15, …)" → Date
	function dataAgendada(texto) {
		const m = /agendada para:?\s*(\d{1,2}) de ([a-z]+) de (\d{4})(?: as (\d{1,2})[:h](\d{2}))?/.exec(normalize(texto));
		if (!m) return null;
		const mes = MESES.indexOf(m[2]);
		if (mes < 0) return null;
		return new Date(Number(m[3]), mes, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
	}

	function papel(tr) {
		const font = tr.cells[4].querySelector("font");
		return collapse(font ? font.textContent : "");
	}

	function nomeDeQuemMovimentou(tr) {
		const clone = tr.cells[4].cloneNode(true);
		clone.querySelectorAll("font, img").forEach(function (n) { n.remove(); });
		return collapse(clone.textContent);
	}

	// Eventos automáticos ou de mero trâmite: ficam fora do resumo.
	const TRAMITE = /^(expedicao|confirmada a|leitura de|recebidos os autos|autos entregues|ato ordinatorio|cancelada a movimentacao|decorrido prazo|certificado|juntada de analise de decurso)/;

	function grupoDoEvento(m) {
		const tipo = m.tipo;
		const p = normalize(m.papel);
		if (tipo === "JUIZ" || tipo === "MAGISTRADO" || /^(juiz|juiza|magistrad|desembargador)/.test(p)) return "juiz";
		if (tipo === "PROMOTOR" || /ministerio publico|promotor|procurador de justica/.test(p)) return "mp";
		if (/^(ADVOGADO|DEFENSOR|PROCURADOR)/.test(tipo) || /advogad|defensor|defensoria|procurador/.test(p)) return "defesa";
		return "";
	}

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
			if (tr.querySelector("strike, s, del")) return; // movimentação cancelada
			const idLinha = tr.getAttribute("id") || "";
			const compl = tr.cells[3].querySelector("div");
			movs.push({
				seq: seq,
				data: collapse(tr.cells[2].textContent).slice(0, 10),
				titulo: collapse(titulo.textContent),
				compl: textoLimpo(compl).slice(0, 300),
				tipo: (idLinha.indexOf(",") !== -1 ? idLinha.split(",")[1] || "" : "").toUpperCase(),
				papel: papel(tr),
				por: nomeDeQuemMovimentou(tr),
				href: linkProjudi(titulo),
			});
		});
		movs.sort(function (a, b) { return Number(b.seq) - Number(a.seq); });

		// Audiências futuras: para cada tipo de audiência, vale o evento mais
		// recente (designada, redesignada, cancelada, realizada…); se for uma
		// designação com data de hoje em diante, a audiência está marcada.
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const ultimoPorTipo = {};
		movs.forEach(function (m) {
			const t = normalize(m.titulo);
			const a = /^audiencia (.+?) (designada|redesignada|cancelada|realizada|nao realizada|nao-realizada|adiada|suspensa)\b/.exec(t);
			if (!a || ultimoPorTipo[a[1]]) return;
			ultimoPorTipo[a[1]] = { mov: m, situacao: a[2] };
		});
		const audiencias = [];
		Object.keys(ultimoPorTipo).forEach(function (k) {
			const u = ultimoPorTipo[k];
			if (!/designada/.test(u.situacao)) return;
			const quando = dataAgendada(u.mov.titulo + " " + u.mov.compl);
			if (!quando || quando < hoje) return;
			audiencias.push({
				seq: u.mov.seq,
				data: u.mov.data,
				href: u.mov.href,
				titulo: u.mov.titulo.replace(/\s+(re)?designada$/i, ""),
				quando: quando.getTime(),
				compl: u.mov.compl,
			});
		});
		audiencias.sort(function (a, b) { return a.quando - b.quando; });

		const grupos = { juiz: [], mp: [], defesa: [] };
		movs.forEach(function (m) {
			const g = grupoDoEvento(m);
			if (!g || TRAMITE.test(normalize(m.titulo))) return;
			grupos[g].push(m);
		});

		const apreensao = movs.find(function (m) {
			return /bens apreendidos|documentos apreensao|auto de apreensao|apreensao de bens/.test(normalize(m.titulo));
		});

		return {
			audiencias: audiencias,
			juiz: grupos.juiz,
			mp: grupos.mp,
			defesa: grupos.defesa,
			apreensaoMov: apreensao ? { seq: apreensao.seq, titulo: apreensao.titulo } : null,
		};
	}

	// ---------------------------------------------------------------------
	// Estado (por processo, em sessionStorage)
	// ---------------------------------------------------------------------

	let processoId = null;
	// apreensao: true | false | null (não deu para saber) | undefined (ainda não lido)
	let estado = { partes: null, info: null, movs: null, apreensao: undefined, quando: 0 };
	const carregando = { partes: false, info: false, movs: false, apreensao: false };
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

	const LEITORES = { partes: lerReus, info: lerInfo, movs: lerMovimentacoes };

	function atualizarApreensao(minha, id) {
		const href = estado.info && estado.info.apreensaoHref;
		if (!href) {
			estado.apreensao = null;
			return;
		}
		carregando.apreensao = true;
		buscarApreensoes(href)
			.then(function (r) {
				if (minha !== geracao || processoId !== id) return;
				estado.apreensao = r;
				salvar();
			})
			.catch(function (err) {
				if (minha !== geracao) return;
				console.warn(TAG, "falha ao abrir a tela de apreensões:", err);
				estado.apreensao = null;
			})
			.finally(function () {
				if (minha !== geracao) return;
				carregando.apreensao = false;
				render();
			});
	}

	function atualizarTudo() {
		if (!processoId) return;
		const id = processoId;
		const minha = ++geracao;
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
					if (chave === "info") atualizarApreensao(minha, id);
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

	function itemMov(mov, mostrarPor) {
		const li = el("li", "pdp-rs-mov");
		const topo = el("div", "pdp-rs-mov-topo");
		topo.appendChild(el("span", "pdp-rs-seq", mov.seq));
		topo.appendChild(el("span", "pdp-rs-data", mov.data));
		if (mostrarPor && mov.por) topo.appendChild(el("span", "pdp-rs-por", mov.por));
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

	function aguardando(chave) {
		if (carregando[chave]) return el("span", "pdp-rs-status", "Carregando…");
		if (erros[chave]) return el("span", "pdp-rs-status pdp-rs-erro", "Não foi possível ler a aba " + ABAS[chave].nome + ".");
		return el("span", "pdp-rs-status", "—");
	}

	function simNao(existe, texto, href, titulo) {
		const span = el("span", "pdp-rs-valor");
		const marca = el("span", "pdp-rs-simnao " + (existe ? "pdp-rs-sim" : "pdp-rs-nao"), existe ? "Sim" : "Não");
		span.appendChild(href ? linkOuTexto("", href, titulo) : el("span"));
		const alvo = span.firstChild;
		alvo.appendChild(marca);
		if (texto) alvo.appendChild(document.createTextNode(" " + texto));
		return span;
	}

	function montarResumo(corpo) {
		// Réus e informações em vermelho da coluna Observação.
		const partes = estado.partes;
		if (!partes) {
			corpo.appendChild(linhaDado("Réu(s)", aguardando("partes")));
		} else if (!partes.reus.length) {
			corpo.appendChild(linhaDado(partes.titulo || "Réu(s)", "Nenhum cadastrado"));
		} else {
			const lista = el("div", "pdp-rs-valor");
			partes.reus.forEach(function (r) {
				const item = el("div", "pdp-rs-reu");
				item.appendChild(linkOuTexto(r.nome, r.href, "Parte do Processo - " + r.nome, "pdp-rs-nome"));
				r.alertas.forEach(function (t) { item.appendChild(el("div", "pdp-rs-alerta", t)); });
				lista.appendChild(item);
			});
			corpo.appendChild(linhaDado(partes.titulo || "Réu(s)", lista));
		}

		const info = estado.info;
		corpo.appendChild(linhaDado("Data da infração", info ? info.dataInfracao || "Não informada" : aguardando("info")));

		// Apreensões: tela Apreensão/SNGB; reforço pelas movimentações.
		let apreensao;
		const mov = estado.movs && estado.movs.apreensaoMov;
		if (!info || estado.apreensao === undefined && carregando.apreensao) {
			apreensao = info ? el("span", "pdp-rs-status", "Carregando…") : aguardando("info");
		} else if (estado.apreensao === true) {
			apreensao = simNao(true, "", info.apreensaoHref, "Apreensão/SNGB");
		} else if (mov) {
			apreensao = simNao(true, "(mov. " + mov.seq + ")", info.apreensaoHref, "Apreensão/SNGB");
		} else if (estado.apreensao === false) {
			apreensao = simNao(false, "", info.apreensaoHref, "Apreensão/SNGB");
		} else if (carregando.apreensao || carregando.movs) {
			apreensao = el("span", "pdp-rs-status", "Carregando…");
		} else {
			apreensao = info.apreensaoHref ? linkOuTexto("Conferir", info.apreensaoHref, "Apreensão/SNGB") : el("span", "pdp-rs-status", "—");
		}
		corpo.appendChild(linhaDado("Apreensões", apreensao));

		// Depósitos: Depósito Judicial/Fiança e Depósitos/Alvarás Eletrônicos.
		if (!info) {
			corpo.appendChild(linhaDado("Depósitos", aguardando("info")));
		} else {
			const existentes = info.depositos.filter(function (d) { return d.existe; });
			if (!existentes.length) {
				corpo.appendChild(linhaDado("Depósitos", simNao(false, "", "", "")));
			} else {
				const v = el("div", "pdp-rs-valor");
				existentes.forEach(function (d) {
					const linha = simNao(true, d.texto, d.href, d.rotulo);
					linha.className = "pdp-rs-deposito";
					v.appendChild(linha);
				});
				corpo.appendChild(linhaDado("Depósitos", v));
			}
		}
	}

	function grupoMovs(corpo, titulo, itens, mostrarPor) {
		corpo.appendChild(el("div", "pdp-rs-subtitulo", titulo + (itens.length ? " (" + itens.length + ")" : "")));
		if (itens.length) listaLimitada(corpo, itens, function (m) { return itemMov(m, mostrarPor); });
		else corpo.appendChild(el("p", "pdp-rs-status", "Nenhum."));
	}

	function montarMovs(corpo) {
		if (status(corpo, "movs", "Nenhuma movimentação.")) return;
		const m = estado.movs;
		corpo.appendChild(el("div", "pdp-rs-subtitulo", "Audiências futuras"));
		if (m.audiencias.length) {
			const ul = el("ul", "pdp-rs-lista");
			m.audiencias.forEach(function (a) {
				const li = el("li", "pdp-rs-audiencia");
				const d = new Date(a.quando);
				li.appendChild(el("div", "pdp-rs-quando",
					d.toLocaleDateString("pt-BR") + (d.getHours() || d.getMinutes() ? " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "")));
				const link = el("a", "pdp-rs-link pdp-rs-mov-titulo", a.titulo);
				link.href = a.href || "#";
				link.title = a.compl || "";
				link.addEventListener("click", function (event) {
					event.preventDefault();
					irParaMovimentacao({ seq: a.seq, titulo: a.titulo, href: a.href });
				});
				li.appendChild(link);
				ul.appendChild(li);
			});
			corpo.appendChild(ul);
		} else {
			corpo.appendChild(el("p", "pdp-rs-status", "Nenhuma designada."));
		}
		grupoMovs(corpo, "Juiz", m.juiz, false);
		grupoMovs(corpo, "Ministério Público", m.mp, false);
		grupoMovs(corpo, "Advogados, defensores e procuradores", m.defesa, true);
	}

	function render() {
		if (!painel) return;
		const scroll = painel.querySelector(".pdp-rs-conteudo");
		const topo = scroll ? scroll.scrollTop : 0;
		const conteudo = el("div", "pdp-rs-conteudo");
		conteudo.appendChild(card("resumo", "Réus e dados principais", null, montarResumo));
		const m = estado.movs;
		conteudo.appendChild(card("movs", "Movimentações relevantes", m ? m.juiz.length + m.mp.length + m.defesa.length + m.audiencias.length : "", montarMovs));
		const rodape = el("div", "pdp-rs-rodape");
		const ocupado = carregando.partes || carregando.info || carregando.movs || carregando.apreensao;
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
		botaoAba.title = "Abrir o resumo do processo (réus, apreensões, depósitos e movimentações relevantes)";
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
		lerReus: lerReus,
		lerInfo: lerInfo,
		lerApreensoes: lerApreensoes,
		lerMovimentacoes: lerMovimentacoes,
		abrir: function () { definirAberto(true); },
		fechar: function () { definirAberto(false); },
	};
})();
