// Projudi - Dispensa rápida por tipo na Análise de Juntadas
//
// Na lista "Análise de Juntadas" (processo/analisarJuntada.do), mostra logo
// abaixo do título um quadro com cards de tipos de juntada (ex.: "JUNTADA DE
// ANOTAÇÃO DE DISTRIBUIÇÃO"). Cada card traz o total daquele tipo (o número
// entre parênteses no filtro "Tipo Movimento" do próprio Projudi) e, ao ser
// clicado (com confirmação), dispensa TODAS as juntadas daquele tipo:
//
//   1. abre a Análise de Juntadas num quadro oculto (marcado com
//      data-pdp-dispensa, como a dispensa do quadro Pendências em
//      juntadaDrag.js);
//   2. limpa os filtros, escolhe o tipo em "Tipo Movimento" e clica em
//      "Filtrar";
//   3. marca só as linhas cuja coluna "Tipo de Documento" é exatamente o tipo
//      do card e aciona o "Dispensar" nativo pelo service worker
//      (mensagem "juntada-dispense-marked", que aceita apenas a confirmação
//      da dispensa - ver background.js);
//   4. filtra de novo e repete (a lista do Projudi é paginada) até não sobrar
//      nenhuma juntada do tipo. Se uma juntada já dispensada voltar a
//      aparecer, ou se nada mudar, para e avisa, sem insistir.
//
// No fim, a lista da tela é recarregada (o mesmo "Filtrar" da pessoa) e o
// resultado aparece no quadro.
//
// Os cards são escolhidos pela pessoa (+ Card / ×) e guardados em
// chrome.storage.local ("pdpDispensaTipoJuntadaCards"), como as demais
// preferências (entram no Exportar/Importar do Menu). Por padrão (decisão do
// usuário, versão 25) não há card nenhum: cada pessoa cria os seus.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpDispensaPorTipoJuntada) return;
	if (!/^\/projudi\/processo\/analisarJuntada\.do$/.test(location.pathname)) return;
	window.__pdpDispensaPorTipoJuntada = true;

	// Nunca roda nos quadros ocultos da própria extensão.
	try {
		const quadro = window.frameElement;
		if (quadro) {
			if (quadro.classList.contains("pdp-qa-modal-iframe")) return;
			for (const atributo of Array.from(quadro.attributes)) {
				if (/^data-pdp-/.test(atributo.name)) return;
			}
		}
	} catch (e) {
		/* frameElement inacessível - segue */
	}

	const CHAVE = "pdpDispensaTipoJuntadaCards";
	const CHAVE_AVISO = "pdpDispensaTipoJuntadaAviso";
	const MAX_RODADAS = 60;
	const TEMPO_ETAPA_MS = 60000;

	const normalizar = (texto) => String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

	function formulario(doc) {
		return doc.querySelector('form#analisarJuntadaForm, form[name="analisarJuntadaForm"]');
	}

	// Tipos do filtro "Tipo Movimento": [{ valor, nome, total }].
	function tiposDoFiltro(doc) {
		const select = doc.getElementById("codTipoMovimento");
		if (!select) return [];
		return Array.from(select.options)
			.filter((o) => o.value && o.value !== "-1")
			.map((o) => {
				const m = /\((\d+)\)\s*$/.exec(o.textContent || "");
				return { valor: o.value, nome: o.value.trim(), total: m ? Number(m[1]) : null };
			});
	}

	function acharTipo(doc, nome) {
		const alvo = normalizar(nome);
		return tiposDoFiltro(doc).find((t) => normalizar(t.valor) === alvo) || null;
	}

	// --- cards guardados ---------------------------------------------------------

	function lerCards() {
		return new Promise((resolve) => {
			try {
				chrome.storage.local.get(CHAVE, (data) => {
					const lista = data && Array.isArray(data[CHAVE]) ? data[CHAVE].filter((t) => typeof t === "string" && t.trim()) : null;
					resolve(lista || []);
				});
			} catch (e) {
				resolve([]);
			}
		});
	}

	function gravarCards(lista) {
		try {
			chrome.storage.local.set({ [CHAVE]: lista });
		} catch (e) {
			/* contexto da extensão invalidado - ignora */
		}
	}

	// --- dispensa em segundo plano ----------------------------------------------

	// Linhas da tabela de resultados: [{ caixa, tipo, id }].
	function linhas(doc) {
		const form = formulario(doc);
		const tabela = form && form.querySelector("table.resultTable");
		if (!tabela) return null;
		const cabecalho = tabela.tHead && tabela.tHead.rows[0];
		if (!cabecalho) return null;
		const indice = Array.from(cabecalho.cells).findIndex((th) => normalizar(th.textContent) === "TIPO DE DOCUMENTO");
		if (indice < 0) return null;
		const resultado = [];
		for (const caixa of tabela.querySelectorAll('tbody input[type="checkbox"][name="idJuntadas"]')) {
			const tr = caixa.closest("tr");
			const celula = tr && tr.cells[indice];
			resultado.push({ caixa, id: caixa.value, tipo: celula ? normalizar(celula.textContent) : "" });
		}
		return resultado;
	}

	function marcarValor(el, valor) {
		if (!el) return;
		if (el.value !== valor) {
			el.value = valor;
			el.dispatchEvent(new Event("change", { bubbles: true }));
		}
	}

	function desmarcar(el) {
		if (el && el.checked) el.click();
	}

	// Filtros limpos ("Todos") e só o tipo escolhido.
	function prepararFiltro(doc, valorTipo) {
		const form = formulario(doc);
		if (!form) return null;
		const select = doc.getElementById("codTipoMovimento");
		const botao = doc.getElementById("searchButton");
		if (!select || !botao) return null;
		const opcao = Array.from(select.options).find((o) => normalizar(o.value) === normalizar(valorTipo));
		if (!opcao) return null;
		marcarValor(form.elements.numeroProcesso, "");
		marcarValor(doc.getElementById("codStatusProcessual"), "");
		marcarValor(doc.getElementById("codGrupo"), "-1");
		const todos = form.querySelector('input[name="situacao"][value="todos"]');
		if (todos && !todos.checked) todos.click();
		desmarcar(form.querySelector('input[name="comAudienciaAgendada"]'));
		marcarValor(doc.getElementById("idLocalizador"), "-1");
		marcarValor(doc.getElementById("sequencial"), "");
		desmarcar(doc.getElementById("flagSomentePrioritarios"));
		marcarValor(doc.getElementById("descricaoClasseProcessual"), "");
		marcarValor(doc.getElementById("descricaoAssuntoPrincipal"), "");
		marcarValor(doc.getElementById("dataInicioEnvio"), "");
		marcarValor(doc.getElementById("dataFimEnvio"), "");
		if (form.elements.pageNumber) form.elements.pageNumber.value = "1";
		select.value = opcao.value;
		select.dispatchEvent(new Event("change", { bubbles: true }));
		return botao;
	}

	// Dispensa todas as juntadas do tipo. `progresso(n)` recebe o total já
	// dispensado. Resolve com { ok, total, mensagem }.
	function dispensarTipo(valorTipo, progresso) {
		return new Promise((resolve) => {
			const alvo = normalizar(valorTipo);
			const token = crypto.randomUUID();
			const frame = document.createElement("iframe");
			frame.setAttribute("data-pdp-dispensa", token);
			frame.title = "Dispensa de juntadas por tipo em segundo plano";
			frame.style.cssText = "position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;";
			const dispensadas = new Set(); // enviadas ao "Dispensar"
			let presentes = new Set(); // do tipo, na última lista filtrada
			let fase = "filtrar"; // filtrar -> listado -> dispensando -> filtrar ...
			let rodadas = 0;
			let terminou = false;
			let relogio = null;

			function fim(ok, mensagem) {
				if (terminou) return;
				terminou = true;
				clearTimeout(relogio);
				frame.remove();
				// Só conta as que de fato saíram da lista.
				const total = Array.from(dispensadas).filter((id) => !presentes.has(id)).length;
				resolve({ ok, total, mensagem });
			}
			function vigiar() {
				clearTimeout(relogio);
				relogio = setTimeout(() => fim(false, "O Projudi não respondeu a tempo."), TEMPO_ETAPA_MS);
			}

			frame.addEventListener("load", async () => {
				if (terminou) return;
				let doc;
				try {
					doc = frame.contentDocument;
				} catch (e) {
					doc = null;
				}
				if (!doc || !/\/analisarJuntada\.do$/.test(new URL(doc.URL).pathname)) {
					fim(false, "A tela da Análise de Juntadas não abriu como esperado.");
					return;
				}
				try {
					if (fase === "dispensando") fase = "filtrar";
					if (fase === "filtrar") {
						if (++rodadas > MAX_RODADAS) {
							fim(false, "Muitas voltas sem terminar; confira a lista.");
							return;
						}
						const botao = prepararFiltro(doc, valorTipo);
						if (!botao) {
							// Sem o tipo no filtro: não há mais juntadas dele.
							if (formulario(doc) && doc.getElementById("codTipoMovimento")) fim(true, "");
							else fim(false, "O filtro da Análise de Juntadas não foi encontrado.");
							return;
						}
						fase = "listado";
						vigiar();
						botao.click();
						return;
					}
					if (fase === "listado") {
						const select = doc.getElementById("codTipoMovimento");
						if (!select || normalizar(select.value) !== alvo) {
							// O Projudi tira o tipo do filtro quando não sobra nenhuma.
							if (select && !acharTipo(doc, valorTipo)) fim(true, "");
							else fim(false, "O filtro pelo tipo não foi aplicado.");
							return;
						}
						const todas = linhas(doc);
						if (!todas) {
							fim(true, ""); // sem tabela: nenhum registro
							return;
						}
						const doTipo = todas.filter((l) => l.tipo === alvo);
						presentes = new Set(doTipo.map((l) => l.id));
						if (!doTipo.length) {
							fim(true, "");
							return;
						}
						if (doTipo.some((l) => dispensadas.has(l.id))) {
							fim(false, "Uma juntada já dispensada continua na lista; nada mais foi feito.");
							return;
						}
						// Só as do tipo ficam marcadas.
						for (const l of todas) {
							const querida = l.tipo === alvo && !l.caixa.disabled;
							if (l.caixa.checked !== querida) l.caixa.click();
						}
						const marcadas = todas.filter((l) => l.caixa.checked);
						if (!marcadas.length || marcadas.some((l) => l.tipo !== alvo)) {
							fim(false, "Não foi possível marcar só as juntadas do tipo.");
							return;
						}
						const dispensar = doc.getElementById("dispensarButton");
						if (!dispensar || dispensar.disabled || normalizar(dispensar.value) !== "DISPENSAR") {
							fim(false, "O botão Dispensar do Projudi não foi encontrado.");
							return;
						}
						dispensar.setAttribute("data-pdp-dispensa-button", token);
						fase = "dispensando";
						vigiar();
						// Anotadas antes do clique: a recarga do quadro pode chegar
						// antes da resposta do service worker.
						marcadas.forEach((l) => dispensadas.add(l.id));
						const resposta = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "juntada-dispense-marked", token });
						if (!resposta || !resposta.ok) {
							marcadas.forEach((l) => dispensadas.delete(l.id));
							fim(false, (resposta && resposta.error) || "Não foi possível acionar o Dispensar.");
							return;
						}
						progresso(dispensadas.size);
					}
				} catch (e) {
					fim(false, "Não foi possível concluir: " + String((e && e.message) || e));
				}
			});

			vigiar();
			frame.src = location.pathname + "?actionType=listar";
			document.body.append(frame);
		});
	}

	// --- quadro de cards -----------------------------------------------------------

	let ocupado = false;

	function el(tag, classe, texto) {
		const e = document.createElement(tag);
		if (classe) e.className = classe;
		if (texto != null) e.textContent = texto;
		return e;
	}

	function recarregarLista() {
		const botao = document.getElementById("searchButton");
		if (botao) botao.click();
		else location.reload();
	}

	function mostrarAviso(quadro, texto, ok) {
		const aviso = quadro.querySelector(".pdp-dpt-aviso");
		aviso.textContent = texto;
		aviso.hidden = !texto;
		aviso.classList.toggle("pdp-dpt-aviso-erro", !ok);
	}

	async function montar() {
		const form = formulario(document);
		if (!form || !document.getElementById("codTipoMovimento") || !document.getElementById("dispensarButton")) return;
		if (document.getElementById("pdp-dispensa-tipo")) return;

		const quadro = el("div", "pdp-dpt");
		quadro.id = "pdp-dispensa-tipo";
		const topo = el("div", "pdp-dpt-topo");
		topo.append(el("span", "pdp-dpt-titulo", "Dispensa rápida por tipo"));
		const mais = el("button", "pdp-dpt-mais", "+ Card");
		mais.type = "button";
		mais.title = "Acrescentar um card com um tipo de juntada";
		topo.append(mais);
		const cards = el("div", "pdp-dpt-cards");
		const aviso = el("div", "pdp-dpt-aviso");
		aviso.setAttribute("role", "status");
		aviso.hidden = true;
		quadro.append(topo, cards, aviso);

		const titulo = form.querySelector("h3");
		if (titulo) titulo.insertAdjacentElement("afterend", quadro);
		else form.prepend(quadro);

		let lista = await lerCards();

		function desenhar() {
			cards.textContent = "";
			if (!lista.length) cards.append(el("span", "pdp-dpt-vazio", "Nenhum card ainda. Clique em + Card e escolha o tipo de juntada que quer dispensar com um clique."));
			for (const nome of lista) {
				const tipo = acharTipo(document, nome);
				const total = tipo ? tipo.total : 0;
				const card = el("div", "pdp-dpt-card");
				const botao = el("button", "pdp-dpt-acao");
				botao.type = "button";
				botao.append(el("span", "pdp-dpt-nome", nome), el("span", "pdp-dpt-total", String(total == null ? "?" : total)));
				botao.title = total
					? "Dispensar todas as juntadas do tipo " + nome
					: "Nenhuma juntada deste tipo na lista";
				botao.disabled = ocupado || !tipo || total === 0;
				botao.addEventListener("click", () => executar(nome, tipo, card));
				const tirar = el("button", "pdp-dpt-tirar", "×");
				tirar.type = "button";
				tirar.title = "Tirar este card";
				tirar.disabled = ocupado;
				tirar.addEventListener("click", () => {
					if (!confirm('Tirar o card "' + nome + '"?')) return;
					lista = lista.filter((t) => t !== nome);
					gravarCards(lista);
					desenhar();
				});
				card.append(botao, tirar);
				cards.append(card);
			}
			mais.disabled = ocupado;
		}

		async function executar(nome, tipo, card) {
			if (ocupado || !tipo) return;
			const qtd = tipo.total == null ? "todas as" : (tipo.total === 1 ? "a 1" : "as " + tipo.total);
			if (!confirm("Dispensar " + qtd + " juntada(s) do tipo\n\n" + nome + "\n\nem todos os processos da lista? A dispensa não pode ser desfeita.")) return;
			ocupado = true;
			desenhar();
			const vivo = cards.children[lista.indexOf(nome)] || card;
			vivo.classList.add("pdp-dpt-card-andamento");
			mostrarAviso(quadro, "Dispensando as juntadas do tipo " + nome + "…", true);
			const r = await dispensarTipo(tipo.valor, (n) => mostrarAviso(quadro, "Dispensando as juntadas do tipo " + nome + "… " + n + " dispensada(s).", true));
			ocupado = false;
			const texto = r.ok
				? (r.total ? r.total + " juntada(s) do tipo " + nome + " dispensada(s)." : "Nenhuma juntada do tipo " + nome + " para dispensar.")
				: "Dispensa interrompida (" + r.total + " dispensada(s)): " + r.mensagem;
			if (r.total) {
				try {
					sessionStorage.setItem(CHAVE_AVISO, JSON.stringify({ texto, ok: r.ok }));
				} catch (e) {
					/* sem sessionStorage: o aviso só some com a recarga */
				}
				mostrarAviso(quadro, texto + " Atualizando a lista…", r.ok);
				recarregarLista();
				return;
			}
			mostrarAviso(quadro, texto, r.ok);
			desenhar();
		}

		mais.addEventListener("click", () => {
			if (quadro.querySelector(".pdp-dpt-escolha")) return;
			const disponiveis = tiposDoFiltro(document).filter((t) => !lista.some((n) => normalizar(n) === normalizar(t.valor)));
			const escolha = el("span", "pdp-dpt-escolha");
			const sel = el("select");
			sel.append(new Option("Escolha o tipo de juntada…", ""));
			for (const t of disponiveis) sel.append(new Option(t.nome + (t.total != null ? " (" + t.total + ")" : ""), t.valor));
			const ok = el("button", null, "Acrescentar");
			ok.type = "button";
			const cancelar = el("button", null, "Cancelar");
			cancelar.type = "button";
			ok.addEventListener("click", () => {
				if (!sel.value) return;
				lista = lista.concat(sel.value.trim());
				gravarCards(lista);
				escolha.remove();
				desenhar();
			});
			cancelar.addEventListener("click", () => escolha.remove());
			escolha.append(sel, ok, cancelar);
			topo.append(escolha);
			sel.focus();
		});

		try {
			const guardado = sessionStorage.getItem(CHAVE_AVISO);
			if (guardado) {
				sessionStorage.removeItem(CHAVE_AVISO);
				const a = JSON.parse(guardado);
				mostrarAviso(quadro, a.texto, a.ok);
			}
		} catch (e) {
			/* ignora */
		}

		desenhar();
	}

	montar();
})();
