// Projudi - Totais de juntadas por tipo (Análise de Juntadas)
//
// Na lista "Análise de Juntadas" (processo/analisarJuntada.do), mostra
// acima da tabela um card para cada tipo da lista "Tipo Movimento" do
// formulário de busca (ex.: JUNTADA DE MANIFESTAÇÃO(92)), com o total
// que o próprio Projudi informa ali e a porcentagem que ele representa
// no total (cards no formato dos de "Conclusões por juiz", nas cores do
// tom escolhido no Visual novo da Mesa; padrão: Projudi original). Por
// padrão aparecem os 10 tipos com mais juntadas, numa linha só; em
// "⚙ Personalizar" o usuário escolhe quantos cards e
// quais tipos aparecem por padrão (preferência salva), e os demais ficam
// no botão "+ N tipos".
//
// O card funciona como filtro automático. Se a tabela já tem a lista
// inteira (uma página só, ou as páginas reunidas por "Listas em uma única
// página" - listasPaginaUnica.js) e o campo Tipo Movimento está em
// "Todos", o filtro é feito na própria tabela, na hora: as demais linhas (e
// a linha de arquivos do "+" delas) ficam escondidas. Senão (lista ainda
// paginada, ou o campo já filtrando outro tipo), o card escolhe o tipo no
// campo Tipo Movimento e clica em Filtrar, como o usuário faria. Clicar de
// novo no mesmo card, ou em "Mostrar todas", volta a mostrar tudo.
// A tabela é observada para aplicar o filtro às linhas que chegarem depois.
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
	// Os demais tipos ficam no botão "+ N tipos". Sem preferência salva, vale
	// o padrão: os 10 tipos com mais juntadas, todos numa linha só. Qualquer
	// mudança feita em "⚙ Personalizar" é salva e passa a valer no lugar dele.
	const CHAVE_PREF = "pdpJuntadasPorTipoPreferencias";
	const PREF_PADRAO = Object.freeze({ limite: 10, tipos: [] });
	// Até quantos cards cabem numa linha só (acima disso, quebram em linhas).
	const MAX_UMA_LINHA = 12;
	let pref = { limite: PREF_PADRAO.limite, tipos: [] };

	let tipoAtivo = null; // tipo filtrado na própria tela, ou null (todas)
	let tipoDestaque = null; // card destacado (filtro da tela ou do Projudi)
	let painel = null;
	let conteudo = null;
	let config = null;
	let tabela = null;
	let observador = null;
	let agendado = false;
	let expandido = false; // mostrando também os tipos fora do padrão
	let ultimosTipos = []; // [tipo, total] da última contagem (para o ⚙)

	function lerPref(valor) {
		if (!valor || typeof valor !== "object") return { limite: PREF_PADRAO.limite, tipos: [] };
		const p = valor;
		const limite = Math.max(0, Math.floor(Number(p.limite) || 0));
		const tipos = Array.isArray(p.tipos) ? p.tipos.filter(function (t) { return typeof t === "string" && t; }) : [];
		return { limite: limite, tipos: tipos };
	}

	function carregarPref() {
		try {
			chrome.storage.local.get([CHAVE_PREF, CHAVE_TOM]).then(function (d) {
				pref = lerPref(d[CHAVE_PREF]);
				aplicarTom(d[CHAVE_TOM]);
				agendar();
			}).catch(function () {});
			// Mudou em outra aba (ou o tom foi trocado na Mesa): vale aqui também.
			chrome.storage.onChanged.addListener(function (mudancas, area) {
				if (area !== "local") return;
				if (mudancas[CHAVE_PREF]) pref = lerPref(mudancas[CHAVE_PREF].newValue);
				if (mudancas[CHAVE_TOM]) aplicarTom(mudancas[CHAVE_TOM].newValue);
				if (mudancas[CHAVE_PREF] || mudancas[CHAVE_TOM]) agendar();
			});
		} catch (e) {
			/* sem storage: fica o padrão (todos) */
		}
	}

	// Volta ao padrão: apaga a preferência salva.
	function apagarPref() {
		pref = lerPref(null);
		try {
			chrome.storage.local.remove(CHAVE_PREF).catch(function () {});
		} catch (e) {
			/* sem storage */
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
			const esconder = tipoAtivo !== null && chave(j.tipo) !== chave(tipoAtivo);
			j.linhas.forEach(function (tr) {
				if (esconder) tr.setAttribute(ATTR_OCULTA, "");
				else tr.removeAttribute(ATTR_OCULTA);
			});
			if (esconder && j.caixa && j.caixa.checked) j.caixa.checked = false;
		});
	}

	// Tom do quadro: o mesmo escolhido no "Visual novo da Mesa do Analista"
	// (visualMesa.js, chave pdpVisualMesaCor; padrão: Projudi original). As
	// cores de cada tom ficam em totaisJuntadasPorTipo.css; aqui, só a
	// paleta das faixas dos cards: tons terrosos, que combinam com o oliva
	// do Projudi, e uma versão mais clara para o Escuro suave.
	const CHAVE_TOM = "pdpVisualMesaCor";
	const TONS = ["projudi", "oliva", "areia", "salvia", "nevoa", "escuro"];
	const TOM_PADRAO = "projudi";
	let tom = TOM_PADRAO;
	const CORES_CLARO = ["#63735f", "#9a6a2f", "#4f6d7a", "#a0522d", "#6b5b8a", "#5b7a52", "#8c7a2a", "#7a4f5f", "#3e6b66", "#b06a3b"];
	const CORES_ESCURO = ["#b9c79a", "#e0b070", "#8fb4c4", "#e09a78", "#b6a6d8", "#9fc79a", "#d8c46a", "#d39ab0", "#82c4bc", "#eaa77a"];
	function cores() {
		return tom === "escuro" ? CORES_ESCURO : CORES_CLARO;
	}
	function aplicarTom(valor) {
		tom = TONS.indexOf(valor) >= 0 ? valor : TOM_PADRAO;
		if (painel) painel.setAttribute("data-tom", tom);
	}

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
		const ativo = tipoDestaque !== null && chave(tipoDestaque) === chave(tipo);
		const card = botao(
			"pdp-jtipo-card" + (ativo ? " pdp-jtipo-ativo" : tipoDestaque !== null ? " pdp-jtipo-apagado" : ""),
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
		painel.setAttribute("data-tom", tom);
		painel.lang = "pt-BR"; // hifenização das palavras longas nos cards estreitos
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

	// --- Tipos e totais: os da lista "Tipo Movimento" do Projudi -------------
	//
	// Os cards seguem a lista "Tipo Movimento" do formulário de busca: cada
	// opção traz o nome do tipo e, entre parênteses, quantas juntadas há dele
	// (ex.: "JUNTADA DE MANIFESTAÇÃO(92)"). Assim os totais são os do
	// próprio Projudi, mesmo que a tabela mostre só uma página.

	function campoTipo() {
		return document.getElementById("codTipoMovimento");
	}

	function chave(tipo) {
		return normalizar(tipo).toLocaleUpperCase("pt-BR");
	}

	// [[tipo, total], ...] das opções com total maior que zero, em ordem.
	function tiposDoCampo() {
		const campo = campoTipo();
		if (!campo) return [];
		const lista = [];
		Array.from(campo.options).forEach(function (op) {
			const valor = normalizar(op.value);
			if (!valor || valor === "-1") return;
			const m = normalizar(op.textContent).match(/\((\d+)\)\s*$/);
			const total = m ? Number(m[1]) : 0;
			if (total > 0) lista.push([valor, total]);
		});
		return lista.sort(function (a, b) {
			return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR");
		});
	}

	// Tipo que o próprio campo do Projudi está filtrando (ou null = Todos).
	function filtroServidor() {
		const campo = campoTipo();
		const valor = campo ? normalizar(campo.value) : "";
		return valor && valor !== "-1" ? valor : null;
	}

	// A tabela tem a lista inteira? (uma página só, ou páginas já reunidas
	// por "Listas em uma única página": aí não há mais "Próxima Página").
	function listaCompleta() {
		const nav = document.getElementById("navigator");
		return !nav || !nav.querySelector("a.arrowNextOn");
	}

	// Pede ao Projudi a lista de um tipo (ou de todos, com null), pelo campo
	// Tipo Movimento e o botão Filtrar, como o usuário faria.
	function filtrarNoProjudi(tipo) {
		const campo = campoTipo();
		const form = formulario();
		if (!campo || !form) return;
		const alvo = tipo === null ? "-1" : Array.from(campo.options).map(function (op) { return op.value; }).find(function (v) { return chave(v) === chave(tipo); });
		if (alvo === undefined) return;
		campo.value = alvo;
		tipoAtivo = null;
		if (conteudo) conteudo.classList.add("pdp-jtipo-carregando");
		const filtrar = document.getElementById("searchButton");
		if (filtrar) filtrar.click();
		else form.submit();
	}

	// Clique num card: na lista completa e sem filtro do Projudi, filtra na
	// própria tela (na hora); senão, filtra pelo campo Tipo Movimento.
	function escolher(tipo) {
		const servidor = filtroServidor();
		if (servidor !== null) {
			filtrarNoProjudi(chave(servidor) === chave(tipo) ? null : tipo);
			return;
		}
		if (!listaCompleta()) {
			filtrarNoProjudi(tipo);
			return;
		}
		tipoAtivo = tipoAtivo !== null && chave(tipoAtivo) === chave(tipo) ? null : tipo;
		atualizar();
	}

	function mostrarTodas() {
		if (filtroServidor() !== null) {
			filtrarNoProjudi(null);
			return;
		}
		tipoAtivo = null;
		atualizar();
	}

	// Tipos mostrados por padrão, conforme a preferência (lista já em ordem).
	function tiposPadrao(tipos) {
		let lista = tipos;
		if (pref.tipos.length) {
			const escolhidos = new Set(pref.tipos.map(chave));
			lista = lista.filter(function (par) { return escolhidos.has(chave(par[0])); });
		}
		if (pref.limite > 0) lista = lista.slice(0, pref.limite);
		return new Set(lista.map(function (par) { return chave(par[0]); }));
	}

	function atualizar() {
		if (!tabela || !tabela.isConnected) tabela = acharTabela();
		const tipos = tiposDoCampo();
		if (!tabela || !tipos.length) {
			if (painel) painel.remove();
			painel = null;
			return;
		}
		ultimosTipos = tipos;
		const geral = tipos.reduce(function (s, par) { return s + par[1]; }, 0);
		const totalDe = function (tipo) {
			const par = tipos.find(function (p) { return chave(p[0]) === chave(tipo); });
			return par ? par[1] : 0;
		};

		const servidor = filtroServidor();
		if (servidor !== null || !listaCompleta()) tipoAtivo = null;
		if (tipoAtivo !== null && !totalDe(tipoAtivo)) tipoAtivo = null;
		tipoDestaque = servidor !== null ? servidor : tipoAtivo;
		aplicarFiltro(juntadas(tabela));

		garantirPainel();
		conteudo.classList.remove("pdp-jtipo-carregando");
		const fragmento = document.createDocumentFragment();

		const topo = el("div", "pdp-jtipo-topo");
		const titulo = el("div", "pdp-jtipo-titulo");
		titulo.append(el("span", "pdp-jtipo-titulo-texto", "Juntadas por tipo"));
		titulo.append(
			el(
				"span",
				"pdp-jtipo-geral",
				geral + " " + plural(geral) + " · " + tipos.length + (tipos.length === 1 ? " tipo" : " tipos") +
					(tipoDestaque !== null ? " · mostrando " + totalDe(tipoDestaque) + " de " + geral : "")
			)
		);
		topo.append(titulo);
		topo.append(el("span", "pdp-jtipo-dica", tipoDestaque === null ? "Clique num card para ver só aquele tipo na lista." : "Filtrando: " + tipoDestaque));
		if (tipoDestaque !== null) {
			topo.append(botao("pdp-jtipo-limpar", "Mostrar todas", "Mostrar todas as juntadas", mostrarTodas));
		}
		topo.append(botao("pdp-jtipo-engrenagem", "⚙ Personalizar", "Escolher quantos cards e quais tipos aparecem por padrão", alternarConfig));
		fragmento.append(topo);

		const padrao = tiposPadrao(tipos);
		const grade = el("div", "pdp-jtipo-grade");
		let mostrados = 0;
		tipos.forEach(function (par, i) {
			// O tipo escolhido continua à vista mesmo fora do padrão.
			const destacado = tipoDestaque !== null && chave(par[0]) === chave(tipoDestaque);
			if (!expandido && !padrao.has(chave(par[0])) && !destacado) return;
			mostrados++;
			grade.append(criarCard(par[0], par[1], geral, cores()[i % cores().length]));
		});
		const fora = tipos.length - mostrados;
		// Poucos cards (ex.: os 10 do padrão): todos numa linha só.
		const colunas = mostrados + (fora > 0 || expandido ? 1 : 0);
		if (colunas <= MAX_UMA_LINHA) {
			grade.classList.add("pdp-jtipo-uma-linha");
			grade.style.setProperty("--pdp-jtipo-colunas", String(mostrados));
			if (colunas > mostrados) grade.classList.add("pdp-jtipo-com-botao");
		}
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
		const contagem = new Map(ultimosTipos.map(function (par) { return [chave(par[0]), par[1]]; }));
		const nomes = ultimosTipos.map(function (par) { return par[0]; });
		pref.tipos.forEach(function (t) { if (!contagem.has(chave(t))) nomes.push(t); });
		const escolhidos = new Set(pref.tipos.map(chave));

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
			c.checked = escolhidos.size ? escolhidos.has(chave(t)) : true;
			l.append(c, el("span", null, rotulo(t)), el("small", null, String(contagem.get(chave(t)) || 0)));
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
			botao("pdp-jtipo-link", "Voltar ao padrão (10 maiores)", "Mostrar os 10 tipos com mais juntadas, numa linha só", function () {
				apagarPref();
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
