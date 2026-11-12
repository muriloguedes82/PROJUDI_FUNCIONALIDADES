// Projudi - Totais de juntadas por tipo (Análise de Juntadas)
//
// Na lista "Análise de Juntadas" (processo/analisarJuntada.do), mostra
// acima da tabela um card para cada tipo de documento presente na lista
// (coluna "Tipo de Documento", ex.: JUNTADA DE MANIFESTAÇÃO), com o total
// de juntadas daquele tipo e a porcentagem que ele representa no total
// (visual igual ao dos cards de "Conclusões por juiz"). Por padrão aparecem
// todos os tipos; em "⚙ Personalizar" o usuário escolhe quantos cards e
// quais tipos aparecem por padrão (preferência salva), e os demais ficam
// no botão "+ N tipos".
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

	// Preferência do usuário (chrome.storage.local; entra no backup do Menu):
	//   limite: quantos cards mostrar por padrão (0 = todos);
	//   tipos: tipos mostrados por padrão (vazio = todos os tipos).
	// Os demais tipos ficam no botão "+ N tipos". Por padrão, tudo aparece.
	const CHAVE_PREF = "pdpJuntadasPorTipoPreferencias";
	let pref = { limite: 0, tipos: [] };

	let tipoAtivo = null; // texto do tipo filtrado, ou null (todas)
	let painel = null;
	let conteudo = null;
	let config = null;
	let tabela = null;
	let observador = null;
	let agendado = false;
	let expandido = false; // mostrando também os tipos fora do padrão
	let ultimosTipos = []; // [tipo, total] da última contagem (para o ⚙)

	function lerPref(valor) {
		const p = valor && typeof valor === "object" ? valor : {};
		const limite = Math.max(0, Math.floor(Number(p.limite) || 0));
		const tipos = Array.isArray(p.tipos) ? p.tipos.filter(function (t) { return typeof t === "string" && t; }) : [];
		return { limite: limite, tipos: tipos };
	}

	function carregarPref() {
		try {
			chrome.storage.local.get(CHAVE_PREF).then(function (d) {
				pref = lerPref(d[CHAVE_PREF]);
				agendar();
			}).catch(function () {});
			// Mudou em outra aba: vale aqui também.
			chrome.storage.onChanged.addListener(function (mudancas, area) {
				if (area !== "local" || !mudancas[CHAVE_PREF]) return;
				pref = lerPref(mudancas[CHAVE_PREF].newValue);
				agendar();
			});
		} catch (e) {
			/* sem storage: fica o padrão (todos) */
		}
	}

	function salvarPref(nova) {
		pref = lerPref(nova);
		try {
			chrome.storage.local.set({ [CHAVE_PREF]: pref }).catch(function (err) {
				console.warn(TAG, "não gravou a preferência:", err);
			});
		} catch (e) {
			/* sem storage */
		}
	}

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

	// Agrupa as linhas do corpo da tabela por juntada: a linha principal e
	// as linhas que vêm logo depois dela (ex.: a linha escondida dos arquivos
	// do "+", que tem uma célula só).
	function juntadas(tab) {
		const indice = indiceColunaTipo(tab);
		if (indice < 0) return [];
		const lista = [];
		let atual = null;
		const linhas = Array.from(tab.tBodies).flatMap(function (tb) { return Array.from(tb.rows); });
		linhas.forEach(function (tr) {
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

	// Siglas que continuam em maiúsculas no nome curto do card.
	const SIGLAS = new Set(["FUPEN", "SISBAJUD", "RENAJUD", "INFOJUD", "BNMP", "CNH", "CPF", "RG", "IP", "PIC", "TJ", "MP", "ANPP", "SAIJ", "CNJ", "DEPEN", "PR"]);

	// "JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO" ->
	// "Petição de cumprimento de intimação" (o nome completo fica na dica).
	function rotulo(tipo) {
		const curto = tipo.replace(/^JUNTADA\s+DE\s+/i, "") || tipo;
		const minusculo = curto.split(" ").map(function (p) {
			return SIGLAS.has(p.replace(/[^A-Za-zÀ-ú]/g, "")) ? p : p.toLocaleLowerCase("pt-BR");
		}).join(" ");
		return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
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

	function botao(cls, texto, dica, aoClicar) {
		const b = el("button", cls, texto);
		b.type = "button";
		if (dica) b.title = dica;
		b.addEventListener("click", function (ev) {
			ev.preventDefault();
			aoClicar();
		});
		return b;
	}

	function plural(n) {
		return n === 1 ? "juntada" : "juntadas";
	}

	function porcentagem(total, geral) {
		if (!geral) return "0%";
		const p = (total / geral) * 100;
		return (p > 0 && p < 1 ? "<1" : String(Math.round(p))) + "%";
	}

	function criarCard(tipo, total, geral, cor) {
		const ativo = tipoAtivo === tipo;
		const card = botao(
			"pdp-jtipo-card" + (ativo ? " pdp-jtipo-ativo" : tipoAtivo !== null ? " pdp-jtipo-apagado" : ""),
			null,
			tipo + " — " + total + " " + plural(total) + ". " + (ativo ? "Clique para mostrar todas." : "Clique para ver só este tipo."),
			function () {
				escolher(tipo);
			}
		);
		card.style.setProperty("--pdp-jtipo-cor", cor);
		card.setAttribute("aria-pressed", ativo ? "true" : "false");
		// Card compacto: total e nome numa linha e, embaixo, a parte que o
		// tipo representa no total da lista.
		const cab = el("span", "pdp-jtipo-cab");
		cab.append(el("strong", "pdp-jtipo-total", String(total)), el("span", "pdp-jtipo-nome", rotulo(tipo)));
		card.append(cab, el("span", "pdp-jtipo-pct", porcentagem(total, geral) + " do total"));
		return card;
	}

	function garantirPainel() {
		if (painel && painel.isConnected) return painel;
		painel = el("section", "pdp-jtipo");
		painel.id = "pdp-juntadas-tipo";
		painel.setAttribute("aria-label", "Totais de juntadas por tipo");
		conteudo = el("div", "pdp-jtipo-conteudo");
		config = el("div", "pdp-jtipo-config");
		config.hidden = true;
		painel.append(conteudo, config);
		// Logo acima da navegação de páginas (ou da própria tabela).
		const ancora = document.getElementById("navigator") || tabela;
		ancora.parentNode.insertBefore(painel, ancora);
		return painel;
	}

	function escolher(tipo) {
		tipoAtivo = tipoAtivo === tipo ? null : tipo;
		atualizar();
	}

	// Tipos mostrados por padrão, conforme a preferência (lista já em ordem).
	function tiposPadrao(tipos) {
		let lista = tipos;
		if (pref.tipos.length) {
			const escolhidos = new Set(pref.tipos);
			lista = lista.filter(function (par) { return escolhidos.has(par[0]); });
		}
		if (pref.limite > 0) lista = lista.slice(0, pref.limite);
		return new Set(lista.map(function (par) { return par[0]; }));
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
		ultimosTipos = tipos;

		garantirPainel();
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
			topo.append(botao("pdp-jtipo-limpar", "Mostrar todas", "Mostrar todas as juntadas da lista", function () {
				tipoAtivo = null;
				atualizar();
			}));
		}
		topo.append(botao("pdp-jtipo-engrenagem", "⚙ Personalizar", "Escolher quantos cards e quais tipos aparecem por padrão", alternarConfig));
		fragmento.append(topo);

		const padrao = tiposPadrao(tipos);
		const grade = el("div", "pdp-jtipo-grade");
		let mostrados = 0;
		tipos.forEach(function (par, i) {
			// O tipo escolhido continua à vista mesmo fora do padrão.
			if (!expandido && !padrao.has(par[0]) && par[0] !== tipoAtivo) return;
			mostrados++;
			grade.append(criarCard(par[0], par[1], lista.length, CORES[i % CORES.length]));
		});
		const fora = tipos.length - mostrados;
		if (fora > 0) {
			grade.append(botao("pdp-jtipo-mais", "+ " + fora + (fora === 1 ? " tipo" : " tipos"), "Mostrar os cards dos demais tipos", function () {
				expandido = true;
				atualizar();
			}));
		} else if (expandido && padrao.size < tipos.length) {
			grade.append(botao("pdp-jtipo-mais", "− Mostrar menos", "Voltar a mostrar só os tipos escolhidos em Personalizar", function () {
				expandido = false;
				atualizar();
			}));
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

		conteudo.replaceChildren(fragmento);
	}

	// --- ⚙ Personalizar: quantos cards e quais tipos por padrão -------------
	//
	// Fica num bloco à parte do quadro, para não ser apagado quando os cards
	// são refeitos (ex.: páginas da lista chegando). A lista de tipos é a da
	// tela, mais os que já estavam escolhidos (mesmo sem juntada agora).

	function alternarConfig() {
		if (!config) return;
		if (!config.hidden) {
			config.hidden = true;
			return;
		}
		montarConfig();
		config.hidden = false;
	}

	function montarConfig() {
		const contagem = new Map(ultimosTipos);
		const nomes = ultimosTipos.map(function (par) { return par[0]; });
		pref.tipos.forEach(function (t) { if (!contagem.has(t)) nomes.push(t); });
		const escolhidos = new Set(pref.tipos);

		const caixa = document.createDocumentFragment();
		caixa.append(el("div", "pdp-jtipo-config-titulo", "Personalizar os cards (fica salvo para as próximas vezes)"));

		const linhaLimite = el("label", "pdp-jtipo-config-linha");
		linhaLimite.append(document.createTextNode("Quantos cards mostrar por padrão: "));
		const limite = el("input", "pdp-jtipo-config-numero");
		limite.type = "number";
		limite.min = "0";
		limite.step = "1";
		limite.placeholder = "todos";
		limite.value = pref.limite > 0 ? String(pref.limite) : "";
		linhaLimite.append(limite, el("span", "pdp-jtipo-config-ajuda", " (vazio = todos; os maiores vêm primeiro)"));
		caixa.append(linhaLimite);

		const modo = el("div", "pdp-jtipo-config-linha");
		modo.append(document.createTextNode("Tipos mostrados por padrão: "));
		const nomeGrupo = "pdp-jtipo-modo";
		const radio = function (valor, texto, marcado) {
			const l = el("label", "pdp-jtipo-config-opcao");
			const r = el("input");
			r.type = "radio";
			r.name = nomeGrupo;
			r.value = valor;
			r.checked = marcado;
			l.append(r, document.createTextNode(" " + texto));
			return { label: l, input: r };
		};
		const rTodos = radio("todos", "todos os tipos", !escolhidos.size);
		const rEscolhidos = radio("escolhidos", "só os marcados abaixo", !!escolhidos.size);
		modo.append(rTodos.label, rEscolhidos.label);
		caixa.append(modo);

		const listaTipos = el("div", "pdp-jtipo-config-tipos");
		const caixas = nomes.map(function (t) {
			const l = el("label", "pdp-jtipo-config-tipo");
			l.title = t;
			const c = el("input");
			c.type = "checkbox";
			c.value = t;
			c.checked = escolhidos.size ? escolhidos.has(t) : true;
			l.append(c, el("span", null, rotulo(t)), el("small", null, contagem.has(t) ? String(contagem.get(t)) : "0"));
			listaTipos.append(l);
			return c;
		});
		const sincronizar = function () {
			listaTipos.classList.toggle("pdp-jtipo-config-desligado", rTodos.input.checked);
			caixas.forEach(function (c) { c.disabled = rTodos.input.checked; });
		};
		rTodos.input.addEventListener("change", sincronizar);
		rEscolhidos.input.addEventListener("change", sincronizar);
		sincronizar();
		const atalhos = el("div", "pdp-jtipo-config-atalhos");
		atalhos.append(
			botao("pdp-jtipo-link", "Marcar todos", null, function () { caixas.forEach(function (c) { if (!c.disabled) c.checked = true; }); }),
			botao("pdp-jtipo-link", "Desmarcar todos", null, function () { caixas.forEach(function (c) { if (!c.disabled) c.checked = false; }); })
		);
		caixa.append(atalhos, listaTipos);

		const aviso = el("div", "pdp-jtipo-config-aviso");
		const acoes = el("div", "pdp-jtipo-config-acoes");
		acoes.append(
			botao("pdp-jtipo-salvar", "Salvar", null, function () {
				const tipos = rEscolhidos.input.checked ? caixas.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }) : [];
				if (rEscolhidos.input.checked && !tipos.length) {
					aviso.textContent = "Marque pelo menos um tipo, ou escolha \"todos os tipos\".";
					return;
				}
				salvarPref({ limite: Number(limite.value) || 0, tipos: tipos });
				expandido = false;
				config.hidden = true;
				atualizar();
			}),
			botao("pdp-jtipo-limpar", "Cancelar", null, function () { config.hidden = true; }),
			botao("pdp-jtipo-link", "Voltar ao padrão (todos)", "Mostrar sempre todos os tipos", function () {
				salvarPref({ limite: 0, tipos: [] });
				expandido = false;
				config.hidden = true;
				atualizar();
			})
		);
		caixa.append(aviso, acoes);
		config.replaceChildren(caixa);
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

	carregarPref();

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
