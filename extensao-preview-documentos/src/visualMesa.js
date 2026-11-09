// Projudi - Visual novo da Mesa do Analista Judiciário (versão 13).
//
// Reorganiza as abas Início, Citações e Intimações, Análise de Juntadas,
// Outros Cumprimentos, Cumprimentos de Medidas e Mesa do Escrivão Criminal
// em cartões fáceis de ler. A aba Lembretes fica como está (só a barra de
// abas, que é comum a todas, ganha o visual novo). Só no Projudi.
//
// REGRA: nenhuma informação some. Os elementos ORIGINAIS da página (linhas
// das tabelas, links e os <span class="contador"> que o Projudi atualiza por
// AJAX pelo id) são MOVIDOS para os cartões - nunca copiados. Assim os
// números continuam se atualizando sozinhos, cada clique abre a mesma lista
// de sempre e o recurso "Ocultar contadores zerados"
// (mesaAnalistaContadores.js) continua funcionando, porque cada contador
// segue dentro de um <tr>.
//
// Mesa do Escrivão Criminal: os quadrados (div.quadroCorregedoria*) são
// movidos para os grupos DENTRO da mesma célula de #tbMesa, para que os
// cliques tratados pelo Projudi continuem chegando onde chegavam.
//
// Cor de destaque: escolhida nas bolinhas ao lado do título da Mesa ou no
// Menu (balança). Fica em chrome.storage.local (CHAVE_COR, entra no backup
// do Menu). Padrão: oliva. O vermelho dos urgentes não muda com a cor.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpVisualMesa) return;
	window.__pdpVisualMesa = true;
	if (!/^\/projudi\/usuario\/mesaAnalista\.do/.test(location.pathname)) return;

	const TAG = "[Projudi Visual da Mesa]";
	const CHAVE_COR = "pdpVisualMesaCor";
	const CHAVE_SO_PENDENCIAS = "pdpVisualMesaSoPendencias";
	const CORES = [
		{ id: "oliva", nome: "Oliva", amostra: "#56613c" },
		{ id: "petroleo", nome: "Azul-petróleo", amostra: "#1d6272" },
		{ id: "marinho", nome: "Azul-marinho", amostra: "#2c4a80" },
		{ id: "grafite", nome: "Grafite", amostra: "#3f444c" }
	];
	const COR_PADRAO = "oliva";

	const form = document.getElementById("mesaAnalistaForm");
	const tabHorz = document.getElementById("tabHorz");
	if (!form || !tabHorz) return;

	const normalizar = function (t) {
		return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	};
	// Só troca o texto quando muda: evita que o observador da página dispare de novo à toa.
	const trocarTexto = function (no, texto) { if (no.textContent !== texto) no.textContent = texto; };
	const semDoisPontos = function (t) { return String(t || "").replace(/\s+/g, " ").trim().replace(/\s*:\s*$/, ""); };

	function el(tag, attrs, filhos) {
		const e = document.createElement(tag);
		Object.entries(attrs || {}).forEach(function ([k, v]) {
			if (v == null || v === false) return;
			if (k === "text") e.textContent = v;
			else if (k === "class") e.className = v;
			else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
			else e.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) { if (f != null) e.append(f); });
		return e;
	}

	// ---------- cor ----------
	const raiz = document.documentElement;
	function aplicarCor(id) {
		raiz.setAttribute("data-pdp-vm-cor", CORES.some(function (c) { return c.id === id; }) ? id : COR_PADRAO);
		document.querySelectorAll(".pdp-vm-cor").forEach(function (b) {
			b.setAttribute("aria-pressed", String(b.dataset.cor === raiz.getAttribute("data-pdp-vm-cor")));
		});
	}
	aplicarCor(COR_PADRAO);
	raiz.classList.add("pdp-vm");

	function montarSeletorCor() {
		const grupo = el("span", { class: "pdp-vm-cores", role: "group", "aria-label": "Cor do visual da Mesa" }, [el("span", { text: "Cor:" })]);
		CORES.forEach(function (c) {
			grupo.append(el("button", {
				type: "button", class: "pdp-vm-cor", "data-cor": c.id, title: c.nome, "aria-label": "Cor " + c.nome,
				style: "background:" + c.amostra,
				onclick: function (ev) {
					ev.preventDefault();
					aplicarCor(c.id);
					try {
						chrome.storage.local.set({ [CHAVE_COR]: c.id }).catch(function (err) { console.warn(TAG, "não gravou a cor:", err); });
					} catch (err) { console.warn(TAG, "não gravou a cor:", err); }
				}
			}));
		});
		return grupo;
	}
	const titulo = form.querySelector("h3");
	if (titulo) {
		titulo.classList.add("pdp-vm-titulo");
		titulo.append(montarSeletorCor());
	}
	aplicarCor(COR_PADRAO);
	try {
		chrome.storage.local.get(CHAVE_COR).then(function (d) { aplicarCor(d[CHAVE_COR] || COR_PADRAO); }).catch(function () {});
		chrome.storage.onChanged.addListener(function (ch, area) {
			if (area === "local" && ch[CHAVE_COR]) aplicarCor(ch[CHAVE_COR].newValue || COR_PADRAO);
		});
	} catch (err) { console.warn(TAG, "storage indisponível:", err); }

	// ---------- aba atual ----------
	const atual = tabHorz.querySelector("li.currentTab");
	const nomeAba = normalizar(atual && atual.textContent);
	const painel = form.querySelector(".masterBlockSubInfoHorz > div[id^='tabprefix']") || form.querySelector("div[id^='tabprefix']");
	if (!painel) { console.log(TAG, "conteúdo da aba não encontrado"); return; }
	console.log(TAG, "aba:", nomeAba);

	// ---------- utilidades dos cartões ----------
	function valorDe(span) {
		const n = parseInt(String(span.textContent).replace(/\D+/g, ""), 10);
		return Number.isFinite(n) ? n : null;
	}
	// Linha visível = não foi escondida pelo "Ocultar contadores zerados" nem pelo Projudi.
	function linhaVisivel(tr) {
		return !tr.hasAttribute("data-pdp-contador-zero") && tr.style.display !== "none";
	}

	// Cartão com título e uma tabela própria (table.form) para as linhas movidas.
	// estilo: "blocos" (número grande) ou "lista" (rótulo à esquerda, número à direita).
	function cartao(tituloTxt, estilo, opcoes) {
		const o = opcoes || {};
		const tbody = el("tbody");
		const vazio = el("div", { class: "pdp-vm-vazio", text: o.vazio || "Nada pendente.", hidden: true });
		const c = el("section", { class: "pdp-vm-cartao pdp-vm-" + estilo + (o.urgente ? " pdp-vm-urgente" : "") + (o.largo ? " pdp-vm-largo" : "") }, [
			el("h4", { class: "pdp-vm-cartao-titulo", text: tituloTxt }),
			el("table", { class: "form pdp-vm-tabela" }, [tbody]),
			vazio
		]);
		c.__tbody = tbody;
		return c;
	}
	function marcarLinha(tr) {
		tr.classList.add("pdp-vm-linha");
		const celulas = Array.from(tr.cells);
		if (celulas[0]) {
			celulas[0].classList.add("pdp-vm-rotulo");
			tirarDoisPontos(celulas[0]);
		}
		if (celulas[1]) celulas[1].classList.add("pdp-vm-valor");
	}
	// "Juntadas:" vira "Juntadas" (só o último texto do rótulo; nada mais muda).
	function tirarDoisPontos(celula) {
		const textos = [];
		const w = document.createTreeWalker(celula, NodeFilter.SHOW_TEXT);
		while (w.nextNode()) if (w.currentNode.textContent.trim()) textos.push(w.currentNode);
		const ultimo = textos[textos.length - 1];
		if (ultimo && /:\s*$/.test(ultimo.textContent)) ultimo.textContent = ultimo.textContent.replace(/\s*:\s*$/, "");
	}
	function atualizarCartoes(raizBusca) {
		// Números que não são <span class="contador"> (ex.: Início): link cujo texto é só "0".
		raizBusca.querySelectorAll(".pdp-vm-cartao td.pdp-vm-valor a").forEach(function (a) {
			if (a.querySelector("span.contador")) return;
			const zero = /^\s*0\s*$/.test(a.textContent);
			if (a.classList.contains("pdp-vm-zero") !== zero) a.classList.toggle("pdp-vm-zero", zero);
			const num = /^\s*\d+\s*$/.test(a.textContent);
			if (a.classList.contains("pdp-vm-num") !== num) a.classList.toggle("pdp-vm-num", num);
		});
		raizBusca.querySelectorAll("span.contador").forEach(function (s) {
			const v = valorDe(s);
			if (s.classList.contains("pdp-vm-zero") !== (v === 0)) s.classList.toggle("pdp-vm-zero", v === 0);
		});
		raizBusca.querySelectorAll(".pdp-vm-cartao").forEach(function (c) {
			if (!c.__tbody) return;
			const linhas = Array.from(c.__tbody.rows);
			const vis = linhas.filter(linhaVisivel).length;
			const vazio = c.querySelector(".pdp-vm-vazio");
			if (vazio && vazio.hidden !== (vis > 0)) vazio.hidden = vis > 0;
			if (c.classList.contains("pdp-vm-sem-itens") !== (vis === 0)) c.classList.toggle("pdp-vm-sem-itens", vis === 0);
		});
	}
	function observar(alvo, fn) {
		let pendente = false;
		new MutationObserver(function () {
			if (pendente) return;
			pendente = true;
			requestAnimationFrame(function () { pendente = false; fn(); });
		}).observe(alvo, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "data-pdp-contador-zero"] });
	}

	// Abas feitas de grupos <h4> + <fieldset><table class="form">.
	// Devolve [{ titulo, linhas: [tr] }] na ordem da página.
	function gruposH4() {
		const grupos = [];
		painel.querySelectorAll("fieldset").forEach(function (fs) {
			const tabela = fs.querySelector("table.form");
			if (!tabela) return;
			let h = fs.previousElementSibling;
			while (h && h.tagName !== "H4") h = h.previousElementSibling;
			grupos.push({ titulo: h ? h.textContent.trim() : "", linhas: Array.from(tabela.rows), fs: fs, h4: h });
		});
		return grupos;
	}
	function grade() { return el("div", { class: "pdp-vm-grade" }); }
	function substituirConteudo(novo) {
		Array.from(painel.children).forEach(function (filho) { filho.classList.add("pdp-vm-original"); });
		painel.prepend(novo);
		painel.classList.add("pdp-vm-painel");
	}
	const ehUrgente = function (t) { return /urgencia|atrasad/.test(normalizar(t)); };

	// ---------- Citações e Intimações / Cumprimentos de Medidas ----------
	function montarGruposSimples(opcoes) {
		const g = grade();
		const grupos = gruposH4();
		if (!grupos.length) return false;
		const urg = grupos.filter(function (x) { return ehUrgente(x.titulo); });
		const resto = grupos.filter(function (x) { return !ehUrgente(x.titulo); });
		urg.concat(resto).forEach(function (x) {
			const c = cartao(x.titulo, "blocos", { urgente: ehUrgente(x.titulo), largo: ehUrgente(x.titulo) && opcoes.urgenteLargo, vazio: opcoes.vazio });
			x.linhas.forEach(function (tr) { marcarLinha(tr); c.__tbody.append(tr); });
			g.append(c);
		});
		substituirConteudo(g);
		return true;
	}

	// ---------- Análise de Juntadas ----------
	const JUNTADAS_PRINCIPAIS = ["numeroPeticoesFazerJuntada", "numeroRetornoConclusoes"];
	const JUNTADAS_SUBGRUPOS = [
		{ titulo: "Retornos de cumprimento", ids: ["numeroMandadosAguardandoAnaliseRetorno", "numeroCartasPrecatoriasAguardandoAnaliseRetorno", "numeroDiligenciasPendentes", "numeroRemessasFisicasMinisterioPublico", "numeroRetornoAssessoriaMilitar", "numeroPedidoProvidenciasAgendados"] },
		{ titulo: "Multas Fupen e custas", ids: ["numeroMultaFupenPendenteQuitada", "numeroMultaFupenPendenteVencida", "numeroMultaFupenPendenteReenvio", "numeroPrestacoesPecuniariasEmAtraso", "numeroPrestacoesPecuniariasEmAnalise"] },
		{ titulo: "Outros", ids: [] } // tudo o que não estiver acima (inclusive itens novos do Projudi)
	];
	function montarJuntadas() {
		const grupos = gruposH4();
		if (!grupos.length) return false;
		const g = grade();
		grupos.forEach(function (x) {
			if (ehUrgente(x.titulo)) {
				const c = cartao(x.titulo, "blocos", { urgente: true, largo: true, vazio: "Nada com urgência." });
				x.linhas.forEach(function (tr) { marcarLinha(tr); c.__tbody.append(tr); });
				g.prepend(c);
				return;
			}
			if (!/para realizar/.test(normalizar(x.titulo))) {
				const c = cartao(x.titulo, "lista");
				x.linhas.forEach(function (tr) { marcarLinha(tr); c.__tbody.append(tr); });
				g.append(c);
				return;
			}
			const principal = cartao(x.titulo, "blocos", { largo: true });
			const subs = JUNTADAS_SUBGRUPOS.map(function (s) { return { def: s, c: cartao(s.titulo, "lista") }; });
			x.linhas.forEach(function (tr) {
				marcarLinha(tr);
				const span = tr.querySelector("span.contador[id]");
				const id = span ? span.id : "";
				if (JUNTADAS_PRINCIPAIS.indexOf(id) >= 0) { principal.__tbody.append(tr); return; }
				const alvo = subs.find(function (s) { return s.def.ids.indexOf(id) >= 0; }) || subs[subs.length - 1];
				alvo.c.__tbody.append(tr);
			});
			g.append(principal);
			subs.forEach(function (s) { if (s.c.__tbody.rows.length) g.append(s.c); });
		});
		substituirConteudo(g);
		return true;
	}

	// ---------- Início ----------
	// Uma tabela.form com linhas-título (<h4>) seguidas das linhas de cada seção.
	function montarInicio() {
		const tabelas = Array.from(painel.querySelectorAll("table.form"));
		if (!tabelas.length) return false;
		const g = grade();
		tabelas.forEach(function (tabela) {
			let atualC = null;
			Array.from(tabela.rows).forEach(function (tr) {
				const h4 = tr.querySelector("h4");
				if (h4) {
					const t = h4.textContent.trim();
					const nt = normalizar(t);
					atualC = cartao(t, /processos ativos/.test(nt) ? "blocos" : "lista", { largo: true });
					if (/mensagens/.test(nt)) atualC.classList.add("pdp-vm-mensagens");
					g.append(atualC);
					return;
				}
				if (!tr.cells.length || !tr.textContent.replace(/\u00a0/g, " ").trim()) { tr.classList.add("pdp-vm-original"); return; }
				if (!atualC) { atualC = cartao("", "lista"); g.append(atualC); }
				marcarLinha(tr);
				const rot = normalizar(tr.cells[0] && tr.cells[0].textContent);
				if (/paralisados/.test(rot) && tr.cells[1]) {
					// "Secretaria: 812 · Em Remessa: 41 ..." vira um bloco para cada par rótulo/número.
					const c = cartao(semDoisPontos(tr.cells[0].textContent), "blocos", { largo: true });
					c.classList.add("pdp-vm-paralisados");
					dividirPares(tr.cells[1]).forEach(function (novo) { c.__tbody.append(novo); });
					tr.classList.add("pdp-vm-original");
					c.__tbody.append(tr); // a linha original (já vazia) vai junto, escondida
					g.append(c);
					return;
				}
				atualC.__tbody.append(tr);
			});
		});
		substituirConteudo(g);
		return true;
	}
	// Separa "Rótulo: <a>n</a> Rótulo2: <a>m</a>" em linhas próprias, MOVENDO os <a> originais.
	function dividirPares(td) {
		const linhas = [];
		let rotulo = "";
		Array.from(td.childNodes).forEach(function (n) {
			if (n.nodeType === 3) {
				const t = n.textContent.replace(/\u00a0/g, " ").trim();
				if (t) rotulo += (rotulo ? " " : "") + t;
				return;
			}
			if (n.nodeType === 1 && n.tagName === "A") {
				const tr = el("tr", { class: "pdp-vm-linha" }, [
					el("td", { class: "label pdp-vm-rotulo", text: semDoisPontos(rotulo) || "Total" }),
					el("td", { class: "pdp-vm-valor" }, [n])
				]);
				linhas.push(tr);
				rotulo = "";
			}
		});
		return linhas;
	}

	// ---------- Outros Cumprimentos ----------
	const GRUPOS_COLUNAS = [
		["Andamento", /^para (conferir|expedir|assinar)/],
		["Atenção", /^(com urgencia|devolvido)/],
		["Prazos", /^(decurso|aguardando deposito)/],
		["AR Digital", /ar digital/]
	];
	function montarOutros() {
		const tabelas = Array.from(painel.querySelectorAll("table.resultTable"));
		if (!tabelas.length) return false;
		painel.classList.add("pdp-vm-painel", "pdp-vm-outros");
		tabelas.forEach(function (t) {
			t.classList.add("pdp-vm-resultado");
			t.removeAttribute("style");
			const h4 = t.parentElement && t.parentElement.querySelector(":scope > h4");
			const cab = Array.from(t.querySelectorAll("thead th")).map(function (th) { return th.textContent; });
			const ehCumprimentos = /^cumprimento/.test(normalizar(cab[0]));
			const c = el("section", { class: "pdp-vm-cartao pdp-vm-tabela-cartao pdp-vm-largo" });
			const tituloTxt = h4 ? h4.textContent.trim() : (ehCumprimentos ? "Cumprimentos" : "");
			if (h4) h4.classList.add("pdp-vm-original");
			c.append(el("h4", { class: "pdp-vm-cartao-titulo", text: tituloTxt }));
			if (ehCumprimentos) c.append(barraFiltro(t));
			t.parentNode.insertBefore(c, t);
			const rolagem = el("div", { class: "pdp-vm-rolagem" });
			c.append(rolagem);
			rolagem.append(t);
			if (ehCumprimentos) cabecalhoAgrupado(t);
			marcarTotais(t);
		});
		// Itens soltos abaixo das tabelas (ex.: "Comunicações Recursais Pendentes
		// de Encaminhamento"): viram um cartão em lista, com as linhas originais.
		painel.querySelectorAll("table.form").forEach(function (tf) {
			if (tf.querySelector("table") || !tf.querySelector("td.label")) return;
			const c = cartao("Outros pendentes", "lista", { largo: true });
			Array.from(tf.rows).forEach(function (tr) { marcarLinha(tr); c.__tbody.append(tr); });
			tf.parentNode.insertBefore(c, tf);
			tf.classList.add("pdp-vm-original");
		});
		return true;
	}
	function marcarTotais(t) {
		Array.from(t.tBodies).forEach(function (tb) {
			Array.from(tb.rows).forEach(function (tr) {
				if (/^total$/.test(normalizar(tr.cells[0] && tr.cells[0].textContent))) tr.classList.add("pdp-vm-total");
			});
		});
	}
	function cabecalhoAgrupado(t) {
		const linha = t.tHead && t.tHead.rows[0];
		if (!linha) return;
		const grupos = Array.from(linha.cells).map(function (th, i) {
			if (i === 0) return null;
			const n = normalizar(th.textContent);
			const achou = GRUPOS_COLUNAS.find(function (gc) { return gc[1].test(n); });
			return achou ? achou[0] : "";
		});
		if (grupos.slice(1).every(function (x) { return !x; })) return;
		const nova = el("tr", { class: "pdp-vm-grupos" });
		linha.cells[0].rowSpan = 2;
		let i = 1;
		while (i < grupos.length) {
			let j = i;
			while (j + 1 < grupos.length && grupos[j + 1] === grupos[i]) j++;
			nova.append(el("th", { class: "pdp-vm-grupo", colspan: String(j - i + 1), text: grupos[i] }));
			i = j + 1;
		}
		// A primeira coluna (rowspan=2) fica na linha de cima, com os grupos;
		// os títulos das colunas descem para a segunda linha.
		nova.prepend(linha.cells[0]);
		t.tHead.insertBefore(nova, linha);
		const ajustar = function () { t.style.setProperty("--pdp-vm-alt-grupos", nova.getBoundingClientRect().height + "px"); };
		ajustar();
		addEventListener("resize", ajustar);
	}
	function barraFiltro(t) {
		const busca = el("input", { type: "search", class: "pdp-vm-busca", placeholder: "Filtrar cumprimento (ex.: ofício, edital)", "aria-label": "Filtrar cumprimento" });
		const caixa = el("input", { type: "checkbox", checked: true });
		const contagem = el("span", { class: "pdp-vm-contagem" });
		const barra = el("div", { class: "pdp-vm-barra" }, [
			busca,
			el("label", { class: "pdp-vm-checar" }, [caixa, document.createTextNode(" Só linhas com pendência")]),
			contagem
		]);
		const linhas = function () {
			return Array.from(t.tBodies).flatMap(function (tb) { return Array.from(tb.rows); }).filter(function (tr) { return !tr.classList.contains("pdp-vm-total"); });
		};
		const aplicar = function () {
			const q = normalizar(busca.value);
			const so = caixa.checked;
			t.classList.toggle("pdp-vm-mostrar-zeradas", !so);
			let vis = 0;
			const todas = linhas();
			todas.forEach(function (tr) {
				const nome = normalizar(tr.cells[0] && tr.cells[0].textContent);
				const spans = Array.from(tr.querySelectorAll("span.contador"));
				const algum = spans.some(function (s) { return (valorDe(s) || 0) > 0; });
				const filtrada = !!q && nome.indexOf(q) < 0;
				const zerada = so && !algum;
				if (tr.hasAttribute("data-pdp-vm-oculta") !== (filtrada || zerada)) tr.toggleAttribute("data-pdp-vm-oculta", filtrada || zerada);
				if (!(filtrada || zerada)) vis++;
			});
			trocarTexto(contagem, "Mostrando " + vis + " de " + todas.length + " tipos de cumprimento");
		};
		busca.addEventListener("input", aplicar);
		caixa.addEventListener("change", function () {
			aplicar();
			try { chrome.storage.local.set({ [CHAVE_SO_PENDENCIAS]: caixa.checked }).catch(function () {}); } catch (e) { /* sem storage */ }
		});
		try {
			chrome.storage.local.get(CHAVE_SO_PENDENCIAS).then(function (d) {
				if (d[CHAVE_SO_PENDENCIAS] === false) caixa.checked = false;
				aplicar();
			}).catch(function () {});
		} catch (e) { /* sem storage */ }
		t.__pdpVmAplicar = aplicar;
		requestAnimationFrame(aplicar);
		return barra;
	}

	// ---------- Mesa do Escrivão Criminal ----------
	const GRUPOS_ESCRIVAO = [
		["Réu preso e prisões", ["feitos de reu preso", "flagrantes em andamento", "prisoes provisorias", "reavaliacao da prisao", "monitoracao eletronica"]],
		["Prazos vencidos e atrasos", ["mandados com prazo", "oficios com prazo", "precatorias expedidas", "precatorias recebidas", "prescricoes", "medidas alternativas", "fiancas com prazo", "processos paralisados"]],
		["Denúncia, sentença e arquivamento", ["acoes penais sem denuncia", "oferecimento de denuncia", "acoes penais sem sentenca", "processos fisicos sem sentenca", "inqueritos/flagrantes", "incidentes em andamento", "hcs tj"]],
		["Bens, fianças e valores", ["apreensoes em aberto", "fiancas nao levantadas", "feitos com apreensoes", "multa do fupen", "autuacoes de guia"]],
		["Cadastro incompleto", ["feitos sem infracao", "feitos sem data", "feitos com reu sem rg", "feitos com reu sem cpf"]],
		["Violência doméstica", ["violencia domestica", "campos obrigatorios", "aplicativos do panico"]],
		["Comunicações e remessas", ["comunicacoes ao iipr", "e-mandado", "remessas"]],
		["Outros atalhos", []] // o que o Projudi acrescentar e não estiver acima
	];
	function montarEscrivao() {
		const mesa = painel.querySelector("#tbMesa");
		const quadros = mesa ? Array.from(mesa.querySelectorAll("div[class^='quadroCorregedoria']")) : [];
		if (!quadros.length) return false;
		const celula = quadros[0].parentElement;
		const cartoes = GRUPOS_ESCRIVAO.map(function (gr) {
			const c = el("section", { class: "pdp-vm-cartao pdp-vm-atalhos" }, [el("h4", { class: "pdp-vm-cartao-titulo" }, [el("span", { text: gr[0] }), el("span", { class: "pdp-vm-qtd" })])]);
			return { def: gr, c: c };
		});
		quadros.forEach(function (q) {
			const lbl = q.querySelector("label");
			const nome = normalizar(lbl ? lbl.textContent : q.textContent);
			const alvo = cartoes.find(function (x) { return x.def[1].some(function (k) { return nome.indexOf(k) === 0; }); }) || cartoes[cartoes.length - 1];
			q.classList.add("pdp-vm-atalho");
			// Tira os colchetes de "[Vencidas] [A vencer]": os links viram botõezinhos.
			q.querySelectorAll("td").forEach(function (td) {
				Array.from(td.childNodes).forEach(function (n) {
					if (n.nodeType === 3 && /^[\s\[\]\u00a0]*$/.test(n.textContent)) n.textContent = " ";
				});
				td.querySelectorAll("a").forEach(function (a) { a.classList.add("pdp-vm-chip"); });
			});
			q.__pdpVmNome = nome;
			alvo.c.append(q);
		});
		const busca = el("input", { type: "search", class: "pdp-vm-busca", placeholder: "Procurar atalho (ex.: fiança, prazo)", "aria-label": "Procurar atalho" });
		const contagem = el("span", { class: "pdp-vm-contagem" });
		const usados = cartoes.filter(function (x) { return x.c.querySelector(".pdp-vm-atalho"); });
		const colunas = el("div", { class: "pdp-vm-colunas" }, usados.map(function (x) { return x.c; }));
		const total = quadros.length;
		const aplicar = function () {
			const q = normalizar(busca.value);
			let n = 0;
			usados.forEach(function (x) {
				let k = 0;
				x.c.querySelectorAll(".pdp-vm-atalho").forEach(function (a) {
					const ok = !q || a.__pdpVmNome.indexOf(q) >= 0 || normalizar(a.textContent).indexOf(q) >= 0;
					a.toggleAttribute("data-pdp-vm-oculta", !ok);
					if (ok) k++;
				});
				trocarTexto(x.c.querySelector(".pdp-vm-qtd"), String(k));
				x.c.toggleAttribute("data-pdp-vm-oculta", k === 0);
				n += k;
			});
			trocarTexto(contagem, q ? n + " atalho(s) encontrado(s)" : total + " atalhos em " + usados.length + " grupos");
		};
		busca.addEventListener("input", aplicar);
		const bloco = el("div", { class: "pdp-vm-escrivao" }, [el("div", { class: "pdp-vm-barra" }, [busca, contagem]), colunas]);
		celula.prepend(bloco);
		painel.classList.add("pdp-vm-painel", "pdp-vm-painel-escrivao");
		mesa.classList.add("pdp-vm-tbmesa");
		aplicar();
		return true;
	}

	// ---------- montagem ----------
	let montou = false;
	try {
		if (/^inicio$/.test(nomeAba)) montou = montarInicio();
		else if (/^citacoes/.test(nomeAba)) montou = montarGruposSimples({ urgenteLargo: true });
		else if (/^analise de juntadas/.test(nomeAba)) montou = montarJuntadas();
		else if (/^cumprimentos de medidas/.test(nomeAba)) montou = montarGruposSimples({ urgenteLargo: false, vazio: "Nada a cumprir." });
		else if (/^outros cumprimentos/.test(nomeAba)) montou = montarOutros();
		else if (/^mesa do escrivao/.test(nomeAba)) montou = montarEscrivao();
	} catch (err) {
		console.error(TAG, "erro ao montar a aba (a parte já movida continua visível):", err);
	}
	console.log(TAG, montou ? "visual aplicado" : "aba mantida no visual original (só a barra de abas muda)");
	if (!montou) return;

	const refazer = function () {
		atualizarCartoes(painel);
		painel.querySelectorAll("table.pdp-vm-resultado").forEach(function (t) { if (t.__pdpVmAplicar) t.__pdpVmAplicar(); });
	};
	refazer();
	observar(painel, refazer);
})();
