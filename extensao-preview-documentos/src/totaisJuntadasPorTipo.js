// Projudi - Totais de juntadas por tipo (Análise de Juntadas)
//
// Na lista "Análise de Juntadas" (processo/analisarJuntada.do), mostra
// acima da tabela um card para cada tipo de documento presente na lista
// (coluna "Tipo de Documento", ex.: JUNTADA DE MANIFESTAÇÃO), com o total
// de juntadas daquele tipo e a parte da lista que ele representa (visual
// igual ao dos cards de "Conclusões por juiz").
//
// O card funciona como filtro automático: clicar nele deixa na tabela só
// as juntadas daquele tipo (as demais linhas, e a linha de arquivos do
// "+" delas, ficam escondidas); clicar de novo no mesmo card, ou em
// "Mostrar todas", mostra tudo outra vez. Nada é pedido ao servidor: o filtro é
// feito na própria tabela, por isso é instantâneo.
//
// Junto com "Listas em uma única página" (listasPaginaUnica.js), que
// acrescenta à tabela as linhas das páginas seguintes, os totais abrangem
// a lista inteira: a tabela é observada e os cards são refeitos (e o
// filtro escolhido é aplicado às linhas novas) a cada linha acrescentada.
//
// Segurança dos atos em lote: ao filtrar, as caixas de marcar das linhas
// escondidas são desmarcadas, e a caixa "marcar todos" do cabeçalho passa a
// marcar só as linhas visíveis. Assim "Análise Múltipla", "Analisar" e
// "Dispensar" nunca alcançam uma juntada que não está à vista.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpTotaisJuntadasPorTipo) return;
	window.__pdpTotaisJuntadasPorTipo = true;

	if (!/^\/projudi\/processo\/analisarJuntada\.do$/.test(location.pathname)) return;

	// Não roda nos quadros ocultos que a própria extensão usa para carregar
	// telas em segundo plano (mesma regra de listasPaginaUnica.js).
	try {
		const quadro = window.frameElement;
		if (quadro) {
			if (quadro.classList.contains("pdp-qa-modal-iframe")) return;
			for (const atributo of Array.from(quadro.attributes)) {
				if (/^data-pdp-/.test(atributo.name)) return;
			}
		}
	} catch (e) {
		/* frameElement inacessível (outra origem) — segue normalmente */
	}

	const TAG = "[Projudi Totais de juntadas por tipo]";
	const ATTR_OCULTA = "data-pdp-jtipo-oculta";

	let tipoAtivo = null; // texto do tipo filtrado, ou null (todas)
	let painel = null;
	let tabela = null;
	let observador = null;
	let agendado = false;
	let expandido = false; // mostrar todos os tipos (quando passam do limite)
	// Com muitos tipos, mostra só os maiores e um botão "+ N tipos".
	const LIMITE_CARDS = 12;

	function formulario() {
		return document.querySelector('form#analisarJuntadaForm, form[name="analisarJuntadaForm"]');
	}

	function acharTabela() {
		const form = formulario();
		return form ? form.querySelector("table.resultTable") : null;
	}

	function normalizar(texto) {
		return String(texto || "").replace(/\s+/g, " ").trim();
	}

	// Índice da coluna "Tipo de Documento" no cabeçalho.
	function indiceColunaTipo(tab) {
		const ths = tab.querySelectorAll("thead tr th");
		for (let i = 0; i < ths.length; i++) {
			if (/tipo\s+de\s+documento/i.test(ths[i].textContent)) return i;
		}
		return -1;
	}

	// Agrupa as linhas do corpo da tabela por juntada: a linha principal
	// (com a caixa idJuntadas, ou com células suficientes) e as linhas que
	// vêm logo depois dela (ex.: a linha escondida dos arquivos do "+").
	function juntadas(tab) {
		const indice = indiceColunaTipo(tab);
		if (indice < 0) return [];
		const lista = [];
		let atual = null;
		const linhas = tab.tBodies.length ? Array.from(tab.tBodies).flatMap(function (tb) { return Array.from(tb.rows); }) : [];
		linhas.forEach(function (tr) {
			// A linha de arquivos do "+" tem uma célula só (colspan).
			if (tr.cells.length > indice) {
				const tipo = normalizar(tr.cells[indice].textContent);
				atual = { tipo: tipo || "(sem tipo)", linhas: [tr], caixa: tr.querySelector('input[name="idJuntadas"]') };
				lista.push(atual);
			} else if (atual) {
				atual.linhas.push(tr);
			}
		});
		return lista;
	}

	function rotulo(tipo) {
		// "JUNTADA DE MANIFESTAÇÃO" -> "MANIFESTAÇÃO" (o nome completo fica na dica).
		return tipo.replace(/^JUNTADA\s+DE\s+/i, "") || tipo;
	}

	function aplicarFiltro(lista) {
		lista.forEach(function (j) {
			const esconder = tipoAtivo !== null && j.tipo !== tipoAtivo;
			j.linhas.forEach(function (tr) {
				if (esconder) tr.setAttribute(ATTR_OCULTA, "");
				else tr.removeAttribute(ATTR_OCULTA);
			});
			if (esconder && j.caixa && j.caixa.checked) j.caixa.checked = false;
		});
	}

	// Mesma paleta dos cards de "Conclusões por juiz" (conclusoesPorJuiz.js).
	const CORES = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#059669", "#dc2626", "#0891b2", "#65a30d"];

	function el(tag, cls, texto) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (texto != null) e.textContent = texto;
		return e;
	}

	function plural(n) {
		return n === 1 ? "juntada" : "juntadas";
	}

	function criarCard(tipo, total, geral, cor) {
		const ativo = tipoAtivo === tipo;
		const card = el("button", "pdp-jtipo-card" + (ativo ? " pdp-jtipo-ativo" : tipoAtivo !== null ? " pdp-jtipo-apagado" : ""));
		card.type = "button";
		card.style.setProperty("--pdp-jtipo-cor", cor);
		card.setAttribute("aria-pressed", ativo ? "true" : "false");
		const pct = geral ? Math.round((total / geral) * 100) : 0;
		card.title = tipo + " — " + total + " " + plural(total) + " (" + pct + "% da lista). " + (ativo ? "Clique para mostrar todas." : "Clique para ver só este tipo.");

		// Card compacto (pode haver dezenas de tipos): total e nome numa
		// linha só e, embaixo, uma barrinha com a parte da lista.
		const cab = el("span", "pdp-jtipo-cab");
		cab.append(el("strong", "pdp-jtipo-total", String(total)), el("span", "pdp-jtipo-nome", rotulo(tipo)));
		const barra = el("span", "pdp-jtipo-barra");
		const preenchido = el("span", "pdp-jtipo-seg");
		preenchido.style.width = Math.max(pct, 3) + "%";
		barra.append(preenchido);

		card.append(cab, barra);
		card.addEventListener("click", function (ev) {
			ev.preventDefault();
			escolher(tipo);
		});
		return card;
	}

	function garantirPainel() {
		if (painel && painel.isConnected) return painel;
		painel = el("section", "pdp-jtipo");
		painel.id = "pdp-juntadas-tipo";
		painel.setAttribute("aria-label", "Totais de juntadas por tipo");
		// Logo acima da navegação de páginas (ou da própria tabela).
		const ancora = document.getElementById("navigator") || tabela;
		ancora.parentNode.insertBefore(painel, ancora);
		return painel;
	}

	function escolher(tipo) {
		tipoAtivo = tipoAtivo === tipo ? null : tipo;
		atualizar();
	}

	function atualizar() {
		if (!tabela || !tabela.isConnected) tabela = acharTabela();
		if (!tabela) return;
		const lista = juntadas(tabela);
		if (!lista.length) {
			if (painel) painel.remove();
			painel = null;
			return;
		}

		const totais = new Map();
		lista.forEach(function (j) {
			totais.set(j.tipo, (totais.get(j.tipo) || 0) + 1);
		});
		if (tipoAtivo !== null && !totais.has(tipoAtivo)) tipoAtivo = null;

		aplicarFiltro(lista);

		// Só tipos com total maior que zero ganham card.
		const tipos = Array.from(totais.entries()).filter(function (par) {
			return par[1] > 0;
		}).sort(function (a, b) {
			return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR");
		});

		const caixa = garantirPainel();
		const fragmento = document.createDocumentFragment();

		const topo = el("div", "pdp-jtipo-topo");
		const titulo = el("div", "pdp-jtipo-titulo");
		titulo.append(el("span", "pdp-jtipo-titulo-texto", "Juntadas por tipo"));
		titulo.append(
			el(
				"span",
				"pdp-jtipo-geral",
				lista.length + " " + plural(lista.length) + " · " + tipos.length + (tipos.length === 1 ? " tipo" : " tipos") +
					(tipoAtivo !== null ? " · mostrando " + totais.get(tipoAtivo) + " de " + lista.length : "")
			)
		);
		topo.append(titulo);
		topo.append(el("span", "pdp-jtipo-dica", tipoAtivo === null ? "Clique num card para ver só aquele tipo na lista." : "Filtrando: " + tipoAtivo));
		if (tipoAtivo !== null) {
			const limpar = el("button", "pdp-jtipo-limpar", "Mostrar todas");
			limpar.type = "button";
			limpar.title = "Mostrar todas as juntadas da lista";
			limpar.addEventListener("click", function (ev) {
				ev.preventDefault();
				tipoAtivo = null;
				atualizar();
			});
			topo.append(limpar);
		}
		fragmento.append(topo);

		const grade = el("div", "pdp-jtipo-grade");
		const recolher = !expandido && tipos.length > LIMITE_CARDS;
		const visiveis = recolher ? LIMITE_CARDS - 1 : tipos.length;
		tipos.forEach(function (par, i) {
			// O tipo escolhido continua à vista mesmo com a lista recolhida.
			if (i >= visiveis && par[0] !== tipoAtivo) return;
			grade.append(criarCard(par[0], par[1], lista.length, CORES[i % CORES.length]));
		});
		if (tipos.length > LIMITE_CARDS) {
			const escondidos = tipos.length - visiveis - (recolher && tipos.slice(visiveis).some(function (par) { return par[0] === tipoAtivo; }) ? 1 : 0);
			const mais = el("button", "pdp-jtipo-mais", recolher ? "+ " + escondidos + (escondidos === 1 ? " tipo" : " tipos") : "− Mostrar menos");
			mais.type = "button";
			mais.title = recolher ? "Mostrar os cards de todos os tipos" : "Mostrar só os tipos com mais juntadas";
			mais.addEventListener("click", function (ev) {
				ev.preventDefault();
				expandido = !expandido;
				atualizar();
			});
			grade.append(mais);
		}
		fragmento.append(grade);

		const filtroProjudi = document.getElementById("codTipoMovimento");
		if (filtroProjudi && filtroProjudi.value && filtroProjudi.value !== "-1") {
			fragmento.append(
				el(
					"div",
					"pdp-jtipo-nota",
					"O campo Tipo Movimento do Projudi está filtrando a lista (" +
						normalizar(filtroProjudi.options[filtroProjudi.selectedIndex].text) +
						"). Para ver os totais de todos os tipos, escolha \"Todos\" nele e clique em Filtrar."
				)
			);
		}

		caixa.replaceChildren(fragmento);
	}

	function agendar() {
		if (agendado) return;
		agendado = true;
		setTimeout(function () {
			agendado = false;
			try {
				atualizar();
			} catch (e) {
				console.error(TAG, e);
			}
		}, 50);
	}

	function observar() {
		if (observador) observador.disconnect();
		if (!tabela) return;
		observador = new MutationObserver(function (mutacoes) {
			// Só interessa linha entrando/saindo do corpo da tabela.
			for (const m of mutacoes) {
				if (m.type !== "childList") continue;
				const tem = function (nos) {
					return Array.from(nos).some(function (n) {
						return n.nodeType === 1 && (n.tagName === "TR" || n.tagName === "TBODY");
					});
				};
				if (tem(m.addedNodes) || tem(m.removedNodes)) {
					agendar();
					return;
				}
			}
		});
		observador.observe(tabela, { childList: true, subtree: true });
	}

	// "Marcar todos" do cabeçalho: com um tipo filtrado, desmarca o que o
	// Projudi marcou nas linhas escondidas (roda depois do código dele).
	document.addEventListener("click", function (ev) {
		const alvo = ev.target;
		if (!alvo || alvo.name !== "checker" || !tabela || !tabela.contains(alvo)) return;
		setTimeout(function () {
			if (tipoAtivo === null) return;
			tabela.querySelectorAll("tr[" + ATTR_OCULTA + '] input[name="idJuntadas"]').forEach(function (cx) {
				cx.checked = false;
			});
		}, 0);
	});

	function iniciar() {
		tabela = acharTabela();
		if (!tabela) return false;
		atualizar();
		observar();
		return true;
	}

	if (!iniciar()) {
		// A tabela pode chegar depois (página ainda montando).
		const espera = new MutationObserver(function () {
			if (iniciar()) espera.disconnect();
		});
		espera.observe(document.documentElement, { childList: true, subtree: true });
		setTimeout(function () {
			espera.disconnect();
		}, 15000);
	}
})();
