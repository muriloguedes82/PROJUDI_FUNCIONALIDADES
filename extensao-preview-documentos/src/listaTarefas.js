// Listas de tarefas (por cores/bolinhas e por escrito) nas telas de Análise
// de Juntadas, Retorno de Conclusão e Análise de Decurso de Prazo.
//
// O usuário cria as suas listas (nome + cor), que formam a legenda exibida
// acima da tabela de resultados. Em cada linha de processo aparecem:
//   - as bolinhas coloridas das listas em que o processo foi incluído;
//   - a quantidade de tarefas escritas pendentes (o texto aparece no title);
//   - um botão "+" que abre o painel do processo, onde se marcam/desmarcam
//     as listas, se escrevem, concluem, editam e removem tarefas, e se
//     aplicam as preferências (tarefas pré-definidas) com um clique.
// As listas e as preferências podem ser criadas, editadas e removidas no
// painel "Gerenciar listas e preferências" (botão ao lado da legenda).
// Clicar numa lista da legenda filtra a tabela, mostrando só os processos
// daquela lista (clicar de novo desfaz o filtro).
//
// Tudo fica em chrome.storage.local (vale para todos os hosts do Projudi e
// sobrevive ao fechamento do navegador), nas chaves:
//   pdpTarefasListas       [{id, nome, cor}]
//   pdpTarefasPreferencias [{id, texto, listaId}]
//   pdpTarefasProcessos    {"<número CNJ>": {listas: [id], tarefas: [{id, texto, feita, criada}]}}
// Alterações feitas numa aba/frame se refletem nas demais (storage.onChanged).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpListaTarefas) return;
	window.__pdpListaTarefas = true;

	// Iframes ocultos que a extensão usa para carregar telas em segundo plano.
	try {
		if (window.frameElement && (window.frameElement.hasAttribute("data-pdp-loader") || window.frameElement.hasAttribute("data-pdp-decurso") || window.frameElement.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }

	// Telas de análise (Juntadas, Retorno de Conclusão, Decurso de Prazo) e
	// de cumprimentos (Expedir Intimações, Expedir Citação/Notificação,
	// Expedir Intimações de Auxiliares da Justiça e Demais Cumprimentos -
	// esta para qualquer "Tipo de Cumprimento", que é só um filtro da mesma
	// tela).
	const ROTAS = /\/processo\/(analisarJuntada|conclusao|intimacaoBusca|expedirIntimacao|expedirCitacao|intimacaoNomeados|cumprimentoCartorio)\.do$/;
	if (!ROTAS.test(location.pathname)) return;

	const K_LISTAS = "pdpTarefasListas";
	const K_PREFS = "pdpTarefasPreferencias";
	const K_PROCESSOS = "pdpTarefasProcessos";
	const RE_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
	const PALETA = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#00897b", "#1e88e5", "#3949ab", "#8e24aa", "#d81b60", "#6d4c41", "#757575", "#111111"];

	let listas = [];
	let prefs = [];
	let processos = {};
	let carregado = false;
	let filtroListaId = null;
	let popover = null; // {el, cnj}
	let modal = null;

	// --- utilitários -----------------------------------------------------------

	function novoId() {
		return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
	}

	function el(tag, attrs, filhos) {
		const node = document.createElement(tag);
		if (attrs) {
			for (const k of Object.keys(attrs)) {
				const v = attrs[k];
				if (v === undefined || v === null || v === false) continue;
				if (k === "class") node.className = v;
				else if (k === "text") node.textContent = v;
				else if (k === "style") node.style.cssText = v;
				else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
				else node.setAttribute(k, v === true ? "" : v);
			}
		}
		(filhos || []).forEach(function (f) {
			if (f === null || f === undefined || f === false) return;
			node.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
		});
		return node;
	}

	function bolinha(cor, extra) {
		return el("span", { class: "pdp-tl-dot" + (extra ? " " + extra : ""), style: "background:" + cor });
	}

	function listaPorId(id) {
		return listas.find(function (l) { return l.id === id; }) || null;
	}

	function dadosProcesso(cnj) {
		const d = processos[cnj];
		return {
			listas: (d && Array.isArray(d.listas) ? d.listas : []).filter(listaPorId),
			tarefas: d && Array.isArray(d.tarefas) ? d.tarefas : []
		};
	}

	function contextoValido() {
		try {
			return !!(chrome.runtime && chrome.runtime.id);
		} catch (e) {
			return false;
		}
	}

	function salvar(parcial) {
		if (!contextoValido()) {
			alert("A extensão foi atualizada. Recarregue a página para continuar usando as listas de tarefas.");
			return;
		}
		chrome.storage.local.set(parcial);
	}

	function salvarProcesso(cnj, dados) {
		const limpo = {
			listas: dados.listas.filter(listaPorId),
			tarefas: dados.tarefas
		};
		if (!limpo.listas.length && !limpo.tarefas.length) delete processos[cnj];
		else processos[cnj] = limpo;
		salvar({ [K_PROCESSOS]: processos });
		renderizarTudo();
	}

	// --- leitura da tabela -------------------------------------------------------

	function tabelaResultados() {
		const tabelas = document.querySelectorAll("table.resultTable");
		for (const t of tabelas) {
			const th = t.querySelector("thead");
			// "Seq." nas telas de análise; "Sequencial" ou só "Processo" nas
			// de cumprimentos.
			if (th && /seq\.|sequencial|processo/i.test(th.textContent)) return t;
		}
		return null;
	}

	// Linhas de processo: filhas diretas do <tbody> com um número CNJ num
	// <em> (a tela de Decurso tem também a tabela "Partes" aninhada, e as
	// linhas ocultas "rowN" com os arquivos - ambas ficam de fora).
	function linhasProcesso(tabela) {
		const resultado = [];
		const tbody = tabela && tabela.tBodies[0];
		if (!tbody) return resultado;
		for (const row of tbody.rows) {
			if (/^row\d+$/.test(row.id)) continue;
			let emProc = null;
			for (const em of row.querySelectorAll(":scope > td em")) {
				if (RE_CNJ.test(em.textContent) && em.textContent.trim().length <= 30) {
					emProc = em;
					break;
				}
			}
			if (!emProc) continue;
			resultado.push({ row: row, cnj: emProc.textContent.match(RE_CNJ)[0], em: emProc });
		}
		return resultado;
	}

	// Ponto de inserção: depois do ícone "copiar número" (quando houver) ou
	// do link/em com o número do processo.
	function ancora(item) {
		const link = item.em.closest("a") || item.em;
		let prox = link.nextElementSibling;
		if (prox && prox.classList.contains("ajaxCalloutMiniClipboardHelp")) return prox;
		return link;
	}

	// --- legenda + filtro --------------------------------------------------------

	function renderizarLegenda(tabela, itens) {
		let barra = document.getElementById("pdpTarefasLegenda");
		if (!barra) {
			barra = el("div", { id: "pdpTarefasLegenda", class: "pdp-tl-legenda" });
			const nav = tabela.previousElementSibling && tabela.previousElementSibling.id === "navigator" ? tabela.previousElementSibling : null;
			(nav || tabela).insertAdjacentElement("beforebegin", barra);
		}
		barra.textContent = "";
		const contagem = {};
		itens.forEach(function (item) {
			dadosProcesso(item.cnj).listas.forEach(function (id) {
				contagem[id] = (contagem[id] || 0) + 1;
			});
		});

		barra.appendChild(el("span", { class: "pdp-tl-legenda-titulo", text: "Listas de tarefas:" }));
		if (!listas.length) {
			barra.appendChild(el("span", { class: "pdp-tl-vazio", text: "nenhuma lista criada ainda." }));
		}
		listas.forEach(function (l) {
			const ativo = filtroListaId === l.id;
			barra.appendChild(el("button", {
				type: "button",
				class: "pdp-tl-chip" + (ativo ? " pdp-tl-chip-ativo" : ""),
				title: ativo ? "Mostrar todos os processos" : "Mostrar só os processos da lista \"" + l.nome + "\"",
				onclick: function () {
					filtroListaId = ativo ? null : l.id;
					renderizarTudo();
				}
			}, [bolinha(l.cor), l.nome + " (" + (contagem[l.id] || 0) + ")"]));
		});
		if (filtroListaId && !listaPorId(filtroListaId)) filtroListaId = null;
		if (filtroListaId) {
			barra.appendChild(el("button", {
				type: "button",
				class: "pdp-tl-link",
				text: "✕ limpar filtro",
				onclick: function () {
					filtroListaId = null;
					renderizarTudo();
				}
			}));
		}
		barra.appendChild(el("button", {
			type: "button",
			class: "pdp-tl-btn pdp-tl-gerenciar",
			text: "⚙ Gerenciar listas e preferências",
			onclick: abrirGerenciador
		}));
	}

	function aplicarFiltro(itens) {
		itens.forEach(function (item) {
			const oculto = !!filtroListaId && dadosProcesso(item.cnj).listas.indexOf(filtroListaId) < 0;
			item.row.classList.toggle("pdp-tl-oculta", oculto);
			const prox = item.row.nextElementSibling;
			if (prox && /^row\d+$/.test(prox.id)) prox.classList.toggle("pdp-tl-oculta", oculto);
		});
	}

	// --- widget na linha ---------------------------------------------------------

	function renderizarLinha(item) {
		let w = item.row.querySelector(".pdp-tl-linha");
		if (!w || w.dataset.cnj !== item.cnj) {
			if (w) w.remove();
			w = el("span", { class: "pdp-tl-linha" });
			w.dataset.cnj = item.cnj;
			ancora(item).insertAdjacentElement("afterend", w);
		}
		const dados = dadosProcesso(item.cnj);
		const pendentes = dados.tarefas.filter(function (t) { return !t.feita; });
		const assinatura = JSON.stringify([dados, listas]);
		if (w.dataset.assinatura === assinatura) return;
		w.dataset.assinatura = assinatura;
		w.textContent = "";

		dados.listas.forEach(function (id) {
			const l = listaPorId(id);
			const dot = bolinha(l.cor);
			dot.title = l.nome;
			w.appendChild(dot);
		});
		if (dados.tarefas.length) {
			const titulo = dados.tarefas.map(function (t) { return (t.feita ? "☑ " : "☐ ") + t.texto; }).join("\n");
			w.appendChild(el("span", {
				class: "pdp-tl-contador" + (pendentes.length ? "" : " pdp-tl-contador-ok"),
				title: titulo,
				text: "✎ " + (pendentes.length || "✓")
			}));
		}
		w.appendChild(el("button", {
			type: "button",
			class: "pdp-tl-mais",
			title: "Listas e tarefas deste processo",
			text: "+",
			onclick: function (ev) {
				ev.preventDefault();
				ev.stopPropagation();
				abrirPopover(item.cnj, w);
			}
		}));
		// "Minhas Preferências" deste processo (preferenciasNaLinha.js).
		if (window.__pdpPreferenciasNaLinha) {
			const estrela = el("button", {
				type: "button",
				class: "pdp-tl-mais pdp-tl-estrela",
				title: /^\/seeu\//.test(location.pathname)
					? "Minhas Preferências: associar localizadores a este processo"
					: "Minhas Preferências: executar uma ação rápida neste processo",
				text: "⭐",
				onclick: function (ev) {
					ev.preventDefault();
					ev.stopPropagation();
					window.__pdpPreferenciasNaLinha.abrir(estrela, item.row, item.cnj);
				}
			});
			w.appendChild(estrela);
		}
	}

	// `soTabela`: chamada pelo MutationObserver (a página mudou, os dados
	// não) - não reconstrói o painel aberto, para não perder o que o
	// usuário está digitando.
	function renderizarTudo(soTabela) {
		if (!carregado) return;
		const tabela = tabelaResultados();
		if (!tabela) return;
		observador.disconnect();
		try {
			const itens = linhasProcesso(tabela);
			renderizarLegenda(tabela, itens);
			itens.forEach(renderizarLinha);
			aplicarFiltro(itens);
			if (popover && !soTabela) preencherPopover();
			if (modal && !soTabela) preencherGerenciador();
		} finally {
			observar();
		}
	}

	// --- painel do processo ------------------------------------------------------

	function fecharPopover() {
		if (!popover) return;
		popover.el.remove();
		popover = null;
	}

	function abrirPopover(cnj, ancoraEl) {
		if (popover && popover.cnj === cnj) {
			fecharPopover();
			return;
		}
		fecharPopover();
		const painel = el("div", { class: "pdp-tl-popover", id: "pdpTarefasPopover" });
		painel.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
		document.body.appendChild(painel);
		popover = { el: painel, cnj: cnj, ancora: ancoraEl, editando: null };
		preencherPopover();
		posicionar(painel, ancoraEl);
		const campo = painel.querySelector(".pdp-tl-nova-tarefa");
		if (campo) campo.focus();
	}

	function posicionar(painel, ancoraEl) {
		const r = ancoraEl.getBoundingClientRect();
		const largura = painel.offsetWidth;
		const altura = painel.offsetHeight;
		let left = Math.min(r.left, window.innerWidth - largura - 8);
		let top = r.bottom + 4;
		if (top + altura > window.innerHeight - 8 && r.top - altura - 4 > 8) top = r.top - altura - 4;
		painel.style.left = Math.max(8, left) + "px";
		painel.style.top = Math.max(8, top) + "px";
	}

	function preencherPopover() {
		const p = popover;
		const painel = p.el;
		const dados = dadosProcesso(p.cnj);
		const foco = document.activeElement && painel.contains(document.activeElement) ? document.activeElement.className : null;
		painel.textContent = "";

		painel.appendChild(el("div", { class: "pdp-tl-pop-cab" }, [
			el("strong", { text: p.cnj }),
			el("button", { type: "button", class: "pdp-tl-x", title: "Fechar", text: "✕", onclick: fecharPopover })
		]));

		// Listas (bolinhas)
		painel.appendChild(el("div", { class: "pdp-tl-sec", text: "Listas (cores)" }));
		const caixaListas = el("div", { class: "pdp-tl-pop-listas" });
		if (!listas.length) caixaListas.appendChild(el("span", { class: "pdp-tl-vazio", text: "Crie listas em \"Gerenciar\"." }));
		listas.forEach(function (l) {
			const marcado = dados.listas.indexOf(l.id) >= 0;
			caixaListas.appendChild(el("label", { class: "pdp-tl-opcao" + (marcado ? " pdp-tl-opcao-on" : "") }, [
				el("input", {
					type: "checkbox",
					checked: marcado,
					onchange: function (ev) {
						const d = dadosProcesso(p.cnj);
						d.listas = d.listas.filter(function (id) { return id !== l.id; });
						if (ev.target.checked) d.listas.push(l.id);
						salvarProcesso(p.cnj, d);
					}
				}),
				bolinha(l.cor),
				l.nome
			]));
		});
		painel.appendChild(caixaListas);

		// Tarefas escritas
		painel.appendChild(el("div", { class: "pdp-tl-sec", text: "Tarefas" }));
		const ul = el("ul", { class: "pdp-tl-tarefas" });
		if (!dados.tarefas.length) ul.appendChild(el("li", { class: "pdp-tl-vazio", text: "Nenhuma tarefa escrita." }));
		dados.tarefas.forEach(function (t) {
			if (p.editando === t.id) {
				const input = el("input", { type: "text", class: "pdp-tl-input pdp-tl-edita-tarefa", value: t.texto });
				const confirmar = function () {
					const texto = input.value.trim();
					if (!texto) return;
					const d = dadosProcesso(p.cnj);
					d.tarefas = d.tarefas.map(function (x) { return x.id === t.id ? Object.assign({}, x, { texto: texto }) : x; });
					p.editando = null;
					salvarProcesso(p.cnj, d);
				};
				input.addEventListener("keydown", function (ev) {
					if (ev.key === "Enter") confirmar();
					if (ev.key === "Escape") { p.editando = null; preencherPopover(); }
				});
				ul.appendChild(el("li", { class: "pdp-tl-tarefa" }, [
					input,
					el("button", { type: "button", class: "pdp-tl-btn", text: "Salvar", onclick: confirmar }),
					el("button", { type: "button", class: "pdp-tl-link", text: "Cancelar", onclick: function () { p.editando = null; preencherPopover(); } })
				]));
				setTimeout(function () { input.focus(); input.select(); }, 0);
				return;
			}
			ul.appendChild(el("li", { class: "pdp-tl-tarefa" + (t.feita ? " pdp-tl-feita" : "") }, [
				el("input", {
					type: "checkbox",
					checked: !!t.feita,
					title: t.feita ? "Marcar como pendente" : "Marcar como concluída",
					onchange: function (ev) {
						const d = dadosProcesso(p.cnj);
						d.tarefas = d.tarefas.map(function (x) { return x.id === t.id ? Object.assign({}, x, { feita: ev.target.checked }) : x; });
						salvarProcesso(p.cnj, d);
					}
				}),
				el("span", { class: "pdp-tl-texto", text: t.texto, title: t.criada ? "Criada em " + new Date(t.criada).toLocaleString("pt-BR") : null }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Editar", text: "✏️", onclick: function () { p.editando = t.id; preencherPopover(); } }),
				el("button", {
					type: "button",
					class: "pdp-tl-icone",
					title: "Remover",
					text: "🗑",
					onclick: function () {
						const d = dadosProcesso(p.cnj);
						d.tarefas = d.tarefas.filter(function (x) { return x.id !== t.id; });
						salvarProcesso(p.cnj, d);
					}
				})
			]));
		});
		painel.appendChild(ul);

		const nova = el("input", { type: "text", class: "pdp-tl-input pdp-tl-nova-tarefa", placeholder: "Escreva uma tarefa e tecle Enter" });
		const adicionar = function () {
			const texto = nova.value.trim();
			if (!texto) return;
			adicionarTarefa(p.cnj, texto, null);
		};
		nova.addEventListener("keydown", function (ev) { if (ev.key === "Enter") adicionar(); });
		painel.appendChild(el("div", { class: "pdp-tl-linha-form" }, [
			nova,
			el("button", { type: "button", class: "pdp-tl-btn", text: "Adicionar", onclick: adicionar })
		]));

		// Preferências
		painel.appendChild(el("div", { class: "pdp-tl-sec", text: "Preferências (tarefas prontas)" }));
		const caixaPrefs = el("div", { class: "pdp-tl-pop-prefs" });
		if (!prefs.length) caixaPrefs.appendChild(el("span", { class: "pdp-tl-vazio", text: "Crie preferências em \"Gerenciar\"." }));
		prefs.forEach(function (pr) {
			const l = pr.listaId ? listaPorId(pr.listaId) : null;
			caixaPrefs.appendChild(el("button", {
				type: "button",
				class: "pdp-tl-chip",
				title: "Adicionar esta tarefa" + (l ? " e incluir na lista \"" + l.nome + "\"" : ""),
				onclick: function () { adicionarTarefa(p.cnj, pr.texto, pr.listaId); }
			}, [l ? bolinha(l.cor) : null, pr.texto]));
		});
		painel.appendChild(caixaPrefs);

		painel.appendChild(el("div", { class: "pdp-tl-pop-rodape" }, [
			el("button", { type: "button", class: "pdp-tl-link", text: "⚙ Gerenciar listas e preferências", onclick: abrirGerenciador })
		]));

		if (foco && foco.indexOf("pdp-tl-nova-tarefa") >= 0) {
			const campo = painel.querySelector(".pdp-tl-nova-tarefa");
			if (campo) campo.focus();
		}
	}

	function adicionarTarefa(cnj, texto, listaId) {
		const d = dadosProcesso(cnj);
		d.tarefas = d.tarefas.concat([{ id: novoId(), texto: texto, feita: false, criada: Date.now() }]);
		if (listaId && listaPorId(listaId) && d.listas.indexOf(listaId) < 0) d.listas.push(listaId);
		salvarProcesso(cnj, d);
		if (popover) {
			const campo = popover.el.querySelector(".pdp-tl-nova-tarefa");
			if (campo) campo.focus();
		}
	}

	document.addEventListener("mousedown", function (ev) {
		if (popover && !popover.el.contains(ev.target) && !(popover.ancora && popover.ancora.contains(ev.target))) fecharPopover();
	}, true);
	document.addEventListener("keydown", function (ev) {
		if (ev.key !== "Escape") return;
		if (modal) fecharGerenciador();
		else if (popover && !popover.editando) fecharPopover();
	});
	window.addEventListener("scroll", function () {
		if (popover && popover.ancora && popover.ancora.isConnected) posicionar(popover.el, popover.ancora);
	}, true);

	// --- gerenciador de listas e preferências ------------------------------------

	function fecharGerenciador() {
		if (!modal) return;
		modal.fundo.remove();
		modal = null;
	}

	function abrirGerenciador() {
		fecharPopover();
		if (modal) return;
		const caixa = el("div", { class: "pdp-tl-modal", role: "dialog" });
		const fundo = el("div", { class: "pdp-tl-fundo", id: "pdpTarefasGerenciador" }, [caixa]);
		fundo.addEventListener("mousedown", function (ev) { if (ev.target === fundo) fecharGerenciador(); });
		document.body.appendChild(fundo);
		modal = { fundo: fundo, caixa: caixa, editandoLista: null, editandoPref: null, corNova: PALETA[0] };
		preencherGerenciador();
	}

	function seletorCor(corAtual, aoEscolher) {
		const box = el("div", { class: "pdp-tl-paleta" });
		PALETA.forEach(function (c) {
			box.appendChild(el("button", {
				type: "button",
				class: "pdp-tl-cor" + (c.toLowerCase() === String(corAtual).toLowerCase() ? " pdp-tl-cor-on" : ""),
				style: "background:" + c,
				title: c,
				onclick: function () { aoEscolher(c); }
			}));
		});
		box.appendChild(el("input", {
			type: "color",
			class: "pdp-tl-cor-livre",
			value: corAtual,
			title: "Outra cor",
			onchange: function (ev) { aoEscolher(ev.target.value); }
		}));
		return box;
	}

	function preencherGerenciador() {
		const m = modal;
		const caixa = m.caixa;
		caixa.textContent = "";
		caixa.appendChild(el("div", { class: "pdp-tl-pop-cab" }, [
			el("strong", { text: "Listas de tarefas — listas (legenda) e preferências" }),
			el("button", { type: "button", class: "pdp-tl-x", title: "Fechar", text: "✕", onclick: fecharGerenciador })
		]));

		// Listas
		caixa.appendChild(el("div", { class: "pdp-tl-sec", text: "Listas (cores da legenda)" }));
		const tabListas = el("div", { class: "pdp-tl-ger-itens" });
		if (!listas.length) tabListas.appendChild(el("div", { class: "pdp-tl-vazio", text: "Nenhuma lista criada." }));
		listas.forEach(function (l, i) {
			if (m.editandoLista && m.editandoLista.id === l.id) {
				tabListas.appendChild(formLista(m.editandoLista, function (dados) {
					listas = listas.map(function (x) { return x.id === l.id ? Object.assign({}, x, dados) : x; });
					m.editandoLista = null;
					salvar({ [K_LISTAS]: listas });
					renderizarTudo();
				}, function () { m.editandoLista = null; preencherGerenciador(); }));
				return;
			}
			const emUso = Object.keys(processos).filter(function (cnj) { return (processos[cnj].listas || []).indexOf(l.id) >= 0; }).length;
			tabListas.appendChild(el("div", { class: "pdp-tl-ger-item" }, [
				bolinha(l.cor, "pdp-tl-dot-g"),
				el("span", { class: "pdp-tl-ger-nome", text: l.nome }),
				el("span", { class: "pdp-tl-ger-info", text: emUso + " processo(s)" }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Subir", text: "▲", disabled: i === 0, onclick: function () { mover(listas, i, -1, K_LISTAS); } }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Descer", text: "▼", disabled: i === listas.length - 1, onclick: function () { mover(listas, i, 1, K_LISTAS); } }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Editar", text: "✏️", onclick: function () { m.editandoLista = Object.assign({}, l); preencherGerenciador(); } }),
				el("button", {
					type: "button",
					class: "pdp-tl-icone",
					title: "Remover",
					text: "🗑",
					onclick: function () {
						if (!confirm("Remover a lista \"" + l.nome + "\"?" + (emUso ? "\nEla será retirada de " + emUso + " processo(s). As tarefas escritas continuam." : ""))) return;
						removerLista(l.id);
					}
				})
			]));
		});
		caixa.appendChild(tabListas);
		if (!m.editandoLista) {
			const rascunho = m.novaLista || { nome: "", cor: PALETA[listas.length % PALETA.length] };
			m.novaLista = rascunho;
			caixa.appendChild(formLista(rascunho, function (dados) {
				listas = listas.concat([{ id: novoId(), nome: dados.nome, cor: dados.cor }]);
				m.novaLista = null;
				salvar({ [K_LISTAS]: listas });
				renderizarTudo();
			}, null));
		}

		// Preferências
		caixa.appendChild(el("div", { class: "pdp-tl-sec", text: "Preferências (tarefas prontas, aplicadas com um clique)" }));
		const tabPrefs = el("div", { class: "pdp-tl-ger-itens" });
		if (!prefs.length) tabPrefs.appendChild(el("div", { class: "pdp-tl-vazio", text: "Nenhuma preferência criada." }));
		prefs.forEach(function (pr, i) {
			if (m.editandoPref && m.editandoPref.id === pr.id) {
				tabPrefs.appendChild(formPref(m.editandoPref, function (dados) {
					prefs = prefs.map(function (x) { return x.id === pr.id ? Object.assign({}, x, dados) : x; });
					m.editandoPref = null;
					salvar({ [K_PREFS]: prefs });
					renderizarTudo();
				}, function () { m.editandoPref = null; preencherGerenciador(); }));
				return;
			}
			const l = pr.listaId ? listaPorId(pr.listaId) : null;
			tabPrefs.appendChild(el("div", { class: "pdp-tl-ger-item" }, [
				l ? bolinha(l.cor, "pdp-tl-dot-g") : el("span", { class: "pdp-tl-dot pdp-tl-dot-g pdp-tl-dot-vazia" }),
				el("span", { class: "pdp-tl-ger-nome", text: pr.texto }),
				el("span", { class: "pdp-tl-ger-info", text: l ? "lista: " + l.nome : "sem lista" }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Subir", text: "▲", disabled: i === 0, onclick: function () { mover(prefs, i, -1, K_PREFS); } }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Descer", text: "▼", disabled: i === prefs.length - 1, onclick: function () { mover(prefs, i, 1, K_PREFS); } }),
				el("button", { type: "button", class: "pdp-tl-icone", title: "Editar", text: "✏️", onclick: function () { m.editandoPref = Object.assign({}, pr); preencherGerenciador(); } }),
				el("button", {
					type: "button",
					class: "pdp-tl-icone",
					title: "Remover",
					text: "🗑",
					onclick: function () {
						if (!confirm("Remover a preferência \"" + pr.texto + "\"?")) return;
						prefs = prefs.filter(function (x) { return x.id !== pr.id; });
						salvar({ [K_PREFS]: prefs });
						renderizarTudo();
					}
				})
			]));
		});
		caixa.appendChild(tabPrefs);
		if (!m.editandoPref) {
			m.novaPref = m.novaPref || { texto: "", listaId: "" };
			caixa.appendChild(formPref(m.novaPref, function (dados) {
				prefs = prefs.concat([{ id: novoId(), texto: dados.texto, listaId: dados.listaId }]);
				m.novaPref = null;
				salvar({ [K_PREFS]: prefs });
				renderizarTudo();
			}, null));
		}

		// Manutenção
		const concluidas = Object.keys(processos).reduce(function (n, cnj) {
			return n + (processos[cnj].tarefas || []).filter(function (t) { return t.feita; }).length;
		}, 0);
		caixa.appendChild(el("div", { class: "pdp-tl-pop-rodape" }, [
			el("button", {
				type: "button",
				class: "pdp-tl-link",
				text: "Apagar tarefas concluídas de todos os processos (" + concluidas + ")",
				disabled: !concluidas,
				onclick: function () {
					if (!confirm("Apagar " + concluidas + " tarefa(s) concluída(s) de todos os processos?")) return;
					Object.keys(processos).forEach(function (cnj) {
						const d = processos[cnj];
						d.tarefas = (d.tarefas || []).filter(function (t) { return !t.feita; });
						if (!(d.listas || []).length && !d.tarefas.length) delete processos[cnj];
					});
					salvar({ [K_PROCESSOS]: processos });
					renderizarTudo();
				}
			})
		]));
	}

	function formLista(rascunho, aoSalvar, aoCancelar) {
		const nome = el("input", { type: "text", class: "pdp-tl-input", placeholder: "Nome da lista (ex.: Urgente, Cobrar AR...)", value: rascunho.nome, maxlength: "60" });
		nome.addEventListener("input", function () { rascunho.nome = nome.value; });
		const confirmar = function () {
			const texto = nome.value.trim();
			if (!texto) { nome.focus(); return; }
			aoSalvar({ nome: texto, cor: rascunho.cor });
		};
		nome.addEventListener("keydown", function (ev) { if (ev.key === "Enter") confirmar(); });
		return el("div", { class: "pdp-tl-ger-form" }, [
			el("div", { class: "pdp-tl-linha-form" }, [
				bolinha(rascunho.cor, "pdp-tl-dot-g"),
				nome,
				el("button", { type: "button", class: "pdp-tl-btn", text: aoCancelar ? "Salvar" : "+ Criar lista", onclick: confirmar }),
				aoCancelar ? el("button", { type: "button", class: "pdp-tl-link", text: "Cancelar", onclick: aoCancelar }) : null
			]),
			seletorCor(rascunho.cor, function (c) { rascunho.cor = c; preencherGerenciador(); })
		]);
	}

	function formPref(rascunho, aoSalvar, aoCancelar) {
		const texto = el("input", { type: "text", class: "pdp-tl-input", placeholder: "Texto da tarefa (ex.: Certificar decurso)", value: rascunho.texto, maxlength: "200" });
		texto.addEventListener("input", function () { rascunho.texto = texto.value; });
		const sel = el("select", { class: "pdp-tl-select", title: "Lista em que o processo será incluído ao aplicar a preferência" }, [
			el("option", { value: "", text: "(sem lista)" })
		].concat(listas.map(function (l) {
			return el("option", { value: l.id, text: "● " + l.nome, selected: rascunho.listaId === l.id, style: "color:" + l.cor });
		})));
		sel.addEventListener("change", function () { rascunho.listaId = sel.value; });
		const confirmar = function () {
			const t = texto.value.trim();
			if (!t) { texto.focus(); return; }
			aoSalvar({ texto: t, listaId: sel.value || null });
		};
		texto.addEventListener("keydown", function (ev) { if (ev.key === "Enter") confirmar(); });
		return el("div", { class: "pdp-tl-ger-form" }, [
			el("div", { class: "pdp-tl-linha-form" }, [
				texto,
				sel,
				el("button", { type: "button", class: "pdp-tl-btn", text: aoCancelar ? "Salvar" : "+ Criar preferência", onclick: confirmar }),
				aoCancelar ? el("button", { type: "button", class: "pdp-tl-link", text: "Cancelar", onclick: aoCancelar }) : null
			])
		]);
	}

	function mover(arr, i, delta, chave) {
		const j = i + delta;
		if (j < 0 || j >= arr.length) return;
		const copia = arr.slice();
		const tmp = copia[i];
		copia[i] = copia[j];
		copia[j] = tmp;
		if (chave === K_LISTAS) listas = copia;
		else prefs = copia;
		salvar({ [chave]: copia });
		renderizarTudo();
	}

	function removerLista(id) {
		listas = listas.filter(function (l) { return l.id !== id; });
		prefs = prefs.map(function (p) { return p.listaId === id ? Object.assign({}, p, { listaId: null }) : p; });
		Object.keys(processos).forEach(function (cnj) {
			const d = processos[cnj];
			d.listas = (d.listas || []).filter(function (x) { return x !== id; });
			if (!d.listas.length && !(d.tarefas || []).length) delete processos[cnj];
		});
		if (filtroListaId === id) filtroListaId = null;
		salvar({ [K_LISTAS]: listas, [K_PREFS]: prefs, [K_PROCESSOS]: processos });
		renderizarTudo();
	}

	// --- inicialização / sincronização -------------------------------------------

	let agendado = false;
	const observador = new MutationObserver(function () {
		if (agendado) return;
		agendado = true;
		setTimeout(function () {
			agendado = false;
			renderizarTudo(true);
		}, 150);
	});
	function observar() {
		observador.observe(document.body || document.documentElement, { childList: true, subtree: true });
	}

	function aplicarStorage(dados) {
		if (K_LISTAS in dados) listas = Array.isArray(dados[K_LISTAS]) ? dados[K_LISTAS] : [];
		if (K_PREFS in dados) prefs = Array.isArray(dados[K_PREFS]) ? dados[K_PREFS] : [];
		if (K_PROCESSOS in dados) processos = dados[K_PROCESSOS] && typeof dados[K_PROCESSOS] === "object" ? dados[K_PROCESSOS] : {};
	}

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "local") return;
		const novo = {};
		[K_LISTAS, K_PREFS, K_PROCESSOS].forEach(function (k) {
			if (changes[k]) novo[k] = changes[k].newValue;
		});
		if (!Object.keys(novo).length) return;
		aplicarStorage(novo);
		renderizarTudo();
	});

	chrome.storage.local.get([K_LISTAS, K_PREFS, K_PROCESSOS], function (dados) {
		aplicarStorage({
			[K_LISTAS]: dados[K_LISTAS],
			[K_PREFS]: dados[K_PREFS],
			[K_PROCESSOS]: dados[K_PROCESSOS]
		});
		carregado = true;
		renderizarTudo();
	});
})();
