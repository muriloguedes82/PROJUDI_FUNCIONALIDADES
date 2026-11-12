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
//   4. percorre TODAS as páginas da lista (link "Próxima Página", como em
//      listasPaginaUnica.js) procurando o tipo pelo nome na coluna "Tipo de
//      Documento"; em cada página com juntadas do tipo, marca e dispensa;
//      depois filtra de novo e recomeça da 1ª página, até uma volta inteira
//      por todas as páginas não achar nenhuma. Se o Projudi não aplicar o
//      filtro pelo tipo, a busca é feita na lista inteira ("Todos"), página
//      por página. Se uma juntada já dispensada voltar a aparecer, para e
//      avisa, sem insistir.
//
// No fim, a lista da tela é recarregada (o mesmo "Filtrar" da pessoa) e o
// resultado aparece no quadro.
//
// Os cards são escolhidos pela pessoa (+ Card / ×) e guardados em
// chrome.storage.local ("pdpDispensaTipoJuntadaCards"), como as demais
// preferências (entram no Exportar/Importar do Menu). Por padrão (decisão do
// usuário) não há card nenhum: cada pessoa cria os seus.
// As preferências gravadas aparecem sempre que a tela é
// aberta ou atualizada (Filtrar, F5, volta após a dispensa), inclusive com a
// lista vazia, e o quadro é montado de novo se a tela for refeita no lugar.
// Só aparecem os cards com total maior que zero (decisão do usuário); os
// zerados continuam gravados e são lembrados numa nota discreta.
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
	const MAX_RODADAS = 200;
	const MAX_PAGINAS = 300;
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
	// O tipo da juntada é o texto em negrito da coluna "Tipo de Documento"
	// (ou, sem negrito, o que vem antes da primeira quebra de linha): o que a
	// célula traz depois (responsável, complemento) é ignorado (decisão do
	// usuário).
	function tipoDaCelula(celula) {
		if (!celula) return "";
		const negrito = celula.querySelector("b, strong");
		if (negrito && normalizar(negrito.textContent)) return normalizar(negrito.textContent);
		let texto = "";
		for (const no of celula.childNodes) {
			if (no.nodeName === "BR") break;
			texto += no.textContent || "";
		}
		return normalizar(texto) || normalizar(celula.textContent);
	}

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
			resultado.push({ caixa, id: caixa.value, tipo: tipoDaCelula(celula), completo: celula ? normalizar(celula.textContent) : "" });
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

	// "Próxima Página" do quadro oculto: aplica no formulário dele as mesmas
	// atribuições do link (document.forms[...]['pageNumber'].value='2' etc.)
	// e o envia. Devolve false se não houver próxima página.
	function irParaProxima(doc) {
		const link = doc.querySelector("#navigator a.arrowNextOn");
		if (!link) return false;
		const href = link.getAttribute("href") || "";
		const trecho = href + "\n" + (link.getAttribute("onclick") || "");
		const form = formulario(doc);
		const atribuicoes = [];
		let m;
		const porNome = /document\.forms\[['"]([^'"]+)['"]\]\[['"]([^'"]+)['"]\]\.value\s*=\s*['"]([^'"]*)['"]/g;
		while ((m = porNome.exec(trecho))) atribuicoes.push({ nome: m[2], valor: m[3] });
		const porId = /getElementById\(\s*['"]([^'"]+)['"]\s*\)\.value\s*=\s*['"]([^'"]*)['"]/g;
		while ((m = porId.exec(trecho))) atribuicoes.push({ id: m[1], valor: m[2] });
		if (atribuicoes.length && form) {
			for (const a of atribuicoes) {
				let campo = a.id ? doc.getElementById(a.id) : form.elements[a.nome];
				if (!campo && a.nome) {
					campo = doc.createElement("input");
					campo.type = "hidden";
					campo.name = a.nome;
					form.append(campo);
				}
				if (campo) campo.value = a.valor;
			}
			HTMLFormElement.prototype.submit.call(form);
			return true;
		}
		if (href && !/^\s*(javascript:|#)/i.test(href)) {
			doc.location.href = new URL(href, doc.URL).href;
			return true;
		}
		throw new Error("não foi possível passar para a próxima página da lista");
	}

	// Filtros limpos ("Todos") e só o tipo escolhido (ou "Todos" também no
	// tipo, quando `porTipo` é false).
	function prepararFiltro(doc, valorTipo, porTipo) {
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
		select.value = porTipo === false ? "-1" : opcao.value;
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
			let presentes = new Set(); // do tipo, vistas na volta atual pelas páginas
			let fase = "filtrar"; // filtrar -> listado (página a página) -> dispensando -> filtrar ...
			let rodadas = 0;
			let porTipo = true; // filtro "Tipo Movimento" aplicado pelo Projudi
			let paginas = 0; // páginas vistas na volta atual
			let vistas = new Set(); // ids das linhas vistas na volta atual
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
						const botao = prepararFiltro(doc, valorTipo, porTipo);
						if (!botao) {
							// Sem o tipo no filtro: não há mais juntadas dele.
							if (formulario(doc) && doc.getElementById("codTipoMovimento")) {
								presentes = new Set();
								fim(true, "");
							}
							else fim(false, "O filtro da Análise de Juntadas não foi encontrado.");
							return;
						}
						fase = "listado";
						presentes = new Set();
						vistas = new Set();
						paginas = 0;
						vigiar();
						botao.click();
						return;
					}
					if (fase === "listado") {
						const select = doc.getElementById("codTipoMovimento");
						if (!select) {
							fim(false, "O filtro da Análise de Juntadas não foi encontrado.");
							return;
						}
						if (paginas === 0 && porTipo && normalizar(select.value) !== alvo) {
							// O Projudi tira o tipo do filtro quando não sobra nenhuma.
							if (!acharTipo(doc, valorTipo)) {
								presentes = new Set();
								fim(true, "");
								return;
							}
							// Filtro pelo tipo não aplicado: procura na lista inteira.
							porTipo = false;
							const botao = prepararFiltro(doc, valorTipo, false);
							if (!botao) {
								fim(false, "O filtro da Análise de Juntadas não foi encontrado.");
								return;
							}
							fase = "listado";
							vigiar();
							botao.click();
							return;
						}
						paginas++;
						const todas = linhas(doc) || [];
						// Página repetida (o Projudi devolveu de novo uma já vista):
						// não há como seguir pelas páginas.
						if (todas.length && todas.every((l) => vistas.has(l.id))) {
							fim(false, "A lista voltou a uma página já vista; confira a lista.");
							return;
						}
						todas.forEach((l) => vistas.add(l.id));
						// Com o filtro "Tipo Movimento" aplicado, a lista já é só do
						// tipo: basta a célula começar pelo nome (o resto é o
						// responsável). Sem o filtro, o tipo tem de ser o mesmo.
						const ehDoTipo = (l) => l.tipo === alvo || (porTipo && l.completo.startsWith(alvo));
						const doTipo = todas.filter(ehDoTipo);
						doTipo.forEach((l) => presentes.add(l.id));
						if (!doTipo.length) {
							// Nada do tipo nesta página: segue para a próxima; na
							// última, a volta inteira não achou nenhuma - terminou.
							if (paginas > MAX_PAGINAS) {
								fim(false, "A lista tem páginas demais; confira a lista.");
								return;
							}
							vigiar();
							if (!irParaProxima(doc)) fim(true, "");
							return;
						}
						if (doTipo.some((l) => dispensadas.has(l.id))) {
							fim(false, "Uma juntada já dispensada continua na lista; nada mais foi feito.");
							return;
						}
						// Só as do tipo ficam marcadas.
						for (const l of todas) {
							const querida = ehDoTipo(l) && !l.caixa.disabled;
							if (l.caixa.checked !== querida) l.caixa.click();
						}
						const marcadas = todas.filter((l) => l.caixa.checked);
						if (!marcadas.length || marcadas.some((l) => !ehDoTipo(l))) {
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

	// Uma cor de faixa lateral por preferência (pela posição na lista
	// gravada, então cada uma mantém a sua mesmo quando outras somem por
	// estarem zeradas); da 11ª em diante, as cores se repetem.
	// Tons mais sóbrios, que combinam com o creme e o verde-oliva do Projudi,
	// mas ainda diferentes entre si.
	const CORES = ["#5f7340", "#3d6f86", "#9a5a36", "#6e5d8f", "#4a7d63", "#9b4f5c", "#5a6a80", "#a1813a", "#3f7773", "#7d5a70"];

	// "JUNTADA DE CERTIDÃO" -> "Juntada de certidão" (deixa o card menor).
	function emFrase(texto) {
		const s = String(texto || "").toLocaleLowerCase("pt-BR");
		return s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
	}
	// Preferências gravadas (tipos de juntada). Lidas de novo a cada vez que
	// a tela é aberta ou atualizada, e acompanhadas se mudarem em outra aba.
	let lista = [];
	let redesenhar = null; // desenho do quadro montado agora
	let quadroAtual = null; // o quadro vivo (com os cliques) desta página

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

	// Mensagem final (sucesso, nada a dispensar ou falha) some sozinha
	// depois de 2 segundos (decisão do usuário); as de andamento ficam até a
	// próxima.
	const TEMPO_AVISO_MS = 2000;
	let relogioAviso = null;
	function mostrarAviso(quadro, texto, ok, final) {
		const aviso = quadro.querySelector(".pdp-dpt-aviso");
		clearTimeout(relogioAviso);
		aviso.textContent = texto;
		aviso.hidden = !texto;
		aviso.classList.toggle("pdp-dpt-aviso-erro", !ok);
		if (final && texto) {
			relogioAviso = setTimeout(() => {
				aviso.hidden = true;
				aviso.textContent = "";
			}, TEMPO_AVISO_MS);
		}
	}

	// O quadro aparece sempre que a tela tem o filtro "Tipo Movimento",
	// mesmo com a lista vazia (sem juntadas, as preferências ficam com 0).
	function montar() {
		const form = formulario(document);
		if (!form || !document.getElementById("codTipoMovimento")) return;
		if (quadroAtual && quadroAtual.isConnected) return;
		// Cópia sem vida deixada por uma tela refeita no lugar: sai.
		document.querySelectorAll("#pdp-dispensa-tipo").forEach((velho) => velho.remove());

		const quadro = el("div", "pdp-dpt");
		quadro.id = "pdp-dispensa-tipo";
		const topo = el("div", "pdp-dpt-topo");
		topo.append(el("span", "pdp-dpt-titulo", "Dispensa rápida por tipo"));
		const mais = el("button", "pdp-dpt-mais", "+ Preferência");
		mais.type = "button";
		mais.title = "Criar uma preferência com um tipo de juntada";
		topo.append(mais);
		const cards = el("div", "pdp-dpt-cards");
		const aviso = el("div", "pdp-dpt-aviso");
		aviso.setAttribute("role", "status");
		aviso.hidden = true;
		quadro.append(topo, cards, aviso);

		const titulo = form.querySelector("h3");
		if (titulo) titulo.insertAdjacentElement("afterend", quadro);
		else form.prepend(quadro);

		let carregado = false;

		function desenhar() {
			cards.textContent = "";
			if (!carregado) {
				cards.append(el("span", "pdp-dpt-vazio", "Carregando as preferências…"));
				mais.disabled = true; // não grava por cima das ainda não lidas
				return;
			}
			if (!lista.length) cards.append(el("span", "pdp-dpt-vazio", "Nenhuma preferência ainda. Clique em + Preferência e escolha o tipo de juntada que quer dispensar com um clique."));
			// Só aparecem as preferências com juntadas na lista (total > 0);
			// as zeradas continuam gravadas e voltam quando houver juntadas.
			const zeradas = [];
			lista.forEach((nome, indice) => {
				const tipo = acharTipo(document, nome);
				const total = tipo ? tipo.total : 0;
				if (!tipo || total === 0) {
					zeradas.push(nome);
					return;
				}
				const card = el("div", "pdp-dpt-card");
				card.style.setProperty("--cor", CORES[indice % CORES.length]);
				card.dataset.nome = nome;
				const botao = el("button", "pdp-dpt-acao");
				botao.type = "button";
				botao.append(el("span", "pdp-dpt-total", String(total == null ? "?" : total)), el("span", "pdp-dpt-nome", emFrase(nome)));
				botao.title = "Dispensar todas as juntadas do tipo " + nome;
				botao.disabled = ocupado;
				botao.addEventListener("click", () => executar(nome, tipo, card));
				const tirar = el("button", "pdp-dpt-tirar", "×");
				tirar.type = "button";
				tirar.title = "Tirar esta preferência";
				tirar.disabled = ocupado;
				tirar.addEventListener("click", () => {
					if (!confirm('Tirar a preferência "' + nome + '"?')) return;
					lista = lista.filter((t) => t !== nome);
					gravarCards(lista);
					desenhar();
				});
				card.append(botao, tirar);
				cards.append(card);
			});
			if (zeradas.length) {
				const nota = el("span", "pdp-dpt-zeradas", (zeradas.length === lista.length ? "Nenhuma juntada dos tipos das suas preferências agora" : "+" + zeradas.length + " sem juntadas agora"));
				nota.title = "Preferências guardadas, sem juntadas na lista agora (aparecem quando houver):\n" + zeradas.map(emFrase).join("\n");
				cards.append(nota);
			}
			mais.disabled = ocupado;
		}

		async function executar(nome, tipo, card) {
			if (ocupado || !tipo) return;
			const qtd = tipo.total == null ? "todas as" : (tipo.total === 1 ? "a 1" : "as " + tipo.total);
			if (!confirm("Dispensar " + qtd + " juntada(s) do tipo\n\n" + nome + "\n\nem todos os processos da lista? A dispensa não pode ser desfeita.")) return;
			ocupado = true;
			desenhar();
			const vivo = Array.from(cards.children).find((c) => c.dataset && c.dataset.nome === nome) || card;
			vivo.classList.add("pdp-dpt-card-andamento");
			// Linha fina na cor da preferência, na base do card, que cresce
			// conforme as juntadas são dispensadas.
			const barra = el("span", "pdp-dpt-barra");
			barra.style.width = "4%";
			vivo.append(barra);
			mostrarAviso(quadro, "Dispensando as juntadas do tipo " + emFrase(nome) + "…", true);
			const r = await dispensarTipo(tipo.valor, (n) => {
				if (tipo.total) barra.style.width = Math.min(100, Math.round((n / tipo.total) * 100)) + "%";
				mostrarAviso(quadro, "Dispensando as juntadas do tipo " + emFrase(nome) + "… " + n + " dispensada(s).", true);
			});
			ocupado = false;
			const texto = r.ok
				? (r.total ? r.total + " juntada(s) do tipo " + emFrase(nome) + " dispensada(s)." : "Nenhuma juntada do tipo " + emFrase(nome) + " para dispensar.")
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
			mostrarAviso(quadro, texto, r.ok, true);
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
				mostrarAviso(quadro, a.texto, a.ok, true);
			}
		} catch (e) {
			/* ignora */
		}

		redesenhar = desenhar;
		quadroAtual = quadro;
		desenhar();
		lerCards().then((gravadas) => {
			lista = gravadas;
			carregado = true;
			if (quadro.isConnected) desenhar();
		});
	}

	// Tipos do filtro (com os totais), para notar quando o Projudi atualiza a
	// lista sem recarregar a página.
	function assinaturaTipos() {
		return tiposDoFiltro(document).map((t) => t.valor + "=" + t.total).join("|");
	}

	let assinatura = "";
	let agendado = false;
	function conferir() {
		agendado = false;
		if (!quadroAtual || !quadroAtual.isConnected) {
			montar();
			assinatura = assinaturaTipos();
			return;
		}
		const agora = assinaturaTipos();
		if (agora !== assinatura) {
			assinatura = agora;
			if (redesenhar && !ocupado) redesenhar();
		}
	}

	montar();
	assinatura = assinaturaTipos();
	// Tela atualizada no lugar (quadro retirado ou filtro refeito): monta de
	// novo, já com as preferências gravadas, e refaz os totais.
	new MutationObserver(() => {
		if (agendado) return;
		agendado = true;
		setTimeout(conferir, 150);
	}).observe(document.documentElement, { childList: true, subtree: true });
	// Preferência criada ou tirada em outra aba: vale aqui também.
	try {
		chrome.storage.onChanged.addListener((mudancas, area) => {
			if (area !== "local" || !mudancas[CHAVE]) return;
			const nova = mudancas[CHAVE].newValue;
			lista = Array.isArray(nova) ? nova.filter((t) => typeof t === "string" && t.trim()) : [];
			if (redesenhar && !ocupado) redesenhar();
		});
	} catch (e) {
		/* contexto da extensão invalidado - ignora */
	}
})();
