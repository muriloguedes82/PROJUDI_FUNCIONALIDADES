// Projudi - Totais de juntadas por tipo (Análise de Juntadas)
//
// Na lista "Análise de Juntadas" (processo/analisarJuntada.do), mostra
// acima da tabela um card para cada tipo de documento presente na lista
// (coluna "Tipo de Documento", ex.: JUNTADA DE MANIFESTAÇÃO), com o total
// de juntadas daquele tipo, e um card "Todas" com o total geral.
//
// O card funciona como filtro automático: clicar nele deixa na tabela só
// as juntadas daquele tipo (as demais linhas, e a linha de arquivos do
// "+" delas, ficam escondidas); clicar de novo no mesmo card, ou em
// "Todas", mostra tudo outra vez. Nada é pedido ao servidor: o filtro é
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

	function criarCard(texto, total, dica, ativo, aoClicar) {
		const botao = document.createElement("button");
		botao.type = "button";
		botao.className = "pdp-jtipo-card" + (ativo ? " pdp-jtipo-ativo" : "");
		botao.title = dica;
		botao.setAttribute("aria-pressed", ativo ? "true" : "false");
		const numero = document.createElement("span");
		numero.className = "pdp-jtipo-total";
		numero.textContent = String(total);
		const nome = document.createElement("span");
		nome.className = "pdp-jtipo-nome";
		nome.textContent = texto;
		botao.append(numero, nome);
		botao.addEventListener("click", function (ev) {
			ev.preventDefault();
			aoClicar();
		});
		return botao;
	}

	function garantirPainel() {
		if (painel && painel.isConnected) return painel;
		painel = document.createElement("div");
		painel.className = "pdp-jtipo-painel";
		painel.setAttribute("role", "group");
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

		const tipos = Array.from(totais.entries()).sort(function (a, b) {
			return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR");
		});

		const caixa = garantirPainel();
		const fragmento = document.createDocumentFragment();
		const titulo = document.createElement("div");
		titulo.className = "pdp-jtipo-titulo";
		titulo.textContent =
			tipoAtivo === null
				? "Juntadas por tipo — clique num card para ver só aquele tipo"
				: "Mostrando " + totais.get(tipoAtivo) + " de " + lista.length + " juntadas (" + tipoAtivo + "). Clique em \"Todas\" para ver a lista inteira.";
		fragmento.appendChild(titulo);

		const grade = document.createElement("div");
		grade.className = "pdp-jtipo-grade";
		grade.appendChild(
			criarCard("Todas", lista.length, "Mostrar todas as juntadas da lista", tipoAtivo === null, function () {
				tipoAtivo = null;
				atualizar();
			})
		);
		tipos.forEach(function (par) {
			const tipo = par[0];
			grade.appendChild(
				criarCard(
					rotulo(tipo),
					par[1],
					tipo + " — " + par[1] + " juntada(s). " + (tipoAtivo === tipo ? "Clique para mostrar todas." : "Clique para ver só este tipo."),
					tipoAtivo === tipo,
					function () {
						escolher(tipo);
					}
				)
			);
		});
		fragmento.appendChild(grade);

		const filtroProjudi = document.getElementById("codTipoMovimento");
		if (filtroProjudi && filtroProjudi.value && filtroProjudi.value !== "-1") {
			const nota = document.createElement("div");
			nota.className = "pdp-jtipo-nota";
			nota.textContent =
				"O campo Tipo Movimento do Projudi está filtrando a lista (" +
				normalizar(filtroProjudi.options[filtroProjudi.selectedIndex].text) +
				"). Para ver os totais de todos os tipos, escolha \"Todos\" nele e clique em Filtrar.";
			fragmento.appendChild(nota);
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
