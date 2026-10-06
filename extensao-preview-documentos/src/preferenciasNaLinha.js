// "Minhas Preferências" na linha do processo - telas de Análise de
// Juntadas, Retorno de Conclusão e Análise de Decurso de Prazo, e telas de
// cumprimentos (Expedir Intimações, Expedir Citação/Notificação, Expedir
// Intimações de Auxiliares da Justiça e Demais Cumprimentos).
//
// O botão ⭐ (inserido por listaTarefas.js ao lado das bolinhas de cada
// linha) abre os cards das preferências salvas nas ações rápidas (Realizar
// Remessa, Enviar Concluso, Intimar Partes, Ordenar Cumprimentos...). Ao
// escolher um card, o fluxo é:
//   1. Pergunta, conforme a tela, se deve antes dispensar as juntadas,
//      finalizar a conclusão ou dispensar os decursos de prazo pendentes do
//      processo. "Sim" e "Não" seguem o fluxo - o "Sim" só acrescenta a
//      dispensa/finalização (feitas pelos mesmos recursos dos botões do
//      quadro Pendências: juntadaDrag.js e finalizarConclusao.js), e uma
//      falha nessa etapa é informada na linha, sem interromper o fluxo.
//   2. Carrega a tela do processo em segundo plano (iframe oculto) e, a
//      partir dela, abre o diálogo da ação já preenchido com a preferência
//      no mesmo popup das ações rápidas (quickActions.js), com a mesma barra
//      "✅ Sim, executar" - nada é enviado ao Projudi sem esse clique.
//   3. A linha mostra o andamento e o resultado. A listagem não é
//      recarregada.
// Preferências de "Juntar Documento", do "Alvará Eletrônico" e de "Advogados" continuam só
// na tela do processo (dependem de arquivos/telas próprias).
//
// SEEU (listas Análise de Juntadas e Retorno de Conclusão): as ações
// rápidas não funcionam no SEEU, então o ⭐ lista as preferências do
// "📍 Localizador" (localizadorSeeu.js). Ao escolher uma, a tela do
// processo (link da linha, visualizacaoProcesso.do) é carregada num iframe
// oculto e os localizadores são associados nela, pela lista do "+" do
// próprio SEEU (window.__pdpLocalizador.associarEm); a linha mostra o
// andamento e o resultado, sem sair da listagem.
//
// EM LOTE: cada linha ganha uma caixinha de marcar, abaixo do "+" da
// primeira coluna, e uma barra "⭐ Em lote" acima da tabela executa a mesma
// preferência ou combo em todos os processos marcados, um de cada vez.
// Projudi: a pergunta da etapa prévia (dispensar/finalizar) é feita uma só
// vez e vale para todos; depois o popup de cada processo abre já preenchido
// e cada um continua exigindo o seu "✅ Sim, executar" (fechar o popup pula
// o processo). SEEU: os localizadores são associados direto em todos.
// Combos que precisam da tela do processo (nova aba) não rodam em lote.
//
// REGRA (Projudi x SEEU): o Projudi trava as ações enquanto houver juntadas
// ou conclusões pendentes, por isso lá a extensão pergunta antes se deve
// dispensar as juntadas, finalizar a conclusão ou dispensar os decursos. O
// SEEU NÃO trava: lá não há pergunta nem dispensa/finalização - a
// preferência é executada direto. Não acrescentar essas perguntas ao SEEU.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpPreferenciasNaLinha) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }

	const TELAS = {
		"/projudi/processo/analisarJuntada.do": {
			tipo: "juntada",
			pergunta: "Dispensar as juntadas pendentes deste processo antes de executar a preferência?",
			sim: "Sim, dispensar juntadas",
			fazendo: "Dispensando juntadas…"
		},
		"/projudi/processo/conclusao.do": {
			tipo: "conclusao",
			pergunta: "Finalizar a conclusão pendente deste processo antes de executar a preferência?",
			sim: "Sim, finalizar conclusão",
			fazendo: "Finalizando a conclusão…"
		},
		"/projudi/processo/intimacaoBusca.do": {
			tipo: "decurso",
			pergunta: "Dispensar os decursos de prazo pendentes deste processo antes de executar a preferência?",
			sim: "Sim, dispensar decursos",
			fazendo: "Dispensando decursos de prazo…"
		},
		// Telas de cumprimentos: a lista não é de uma pendência específica,
		// então a extensão abre a tela do processo e pergunta só pelo que
		// estiver pendente nela (juntadas e/ou "Retorno de Conclusão" no
		// quadro Pendências), como executarComPendencias faz na tela do
		// processo (quickActions.js). Sem pendências, abre direto. Demais
		// Cumprimentos vale para qualquer "Tipo de Cumprimento" (filtro da
		// mesma tela).
		"/projudi/processo/expedirIntimacao.do": { tipo: "cumprimento", verificaPendencias: true },
		"/projudi/processo/expedirCitacao.do": { tipo: "cumprimento", verificaPendencias: true },
		"/projudi/processo/intimacaoNomeados.do": { tipo: "cumprimento", verificaPendencias: true },
		// Demais Cumprimentos: o card ⭐ também traz as preferências do
		// "Analisar" (Pré-Análise) - ver abrirPreAnalise.
		"/projudi/processo/cumprimentoCartorio.do": { tipo: "cumprimento", verificaPendencias: true, preAnalise: true },
		// Mandados (Expedir Mandados): mesma coluna "Pré-Análise" com o link
		// "Analisar" de Demais Cumprimentos, então vale o mesmo card ⭐.
		"/projudi/processo/cumprimentoCartorioMandado.do": { tipo: "cumprimento", verificaPendencias: true, preAnalise: true },
		// Decurso de Prazo - Citações/Notificações: como as de cumprimentos
		// (pergunta só pelas pendências que o processo tiver).
		"/projudi/processo/citacao.do": { tipo: "cumprimento", verificaPendencias: true },
		// SEEU: sem `pergunta` de propósito (o SEEU não trava ações com
		// pendências - ver a REGRA no início do arquivo).
		"/seeu/processo/analisarJuntada.do": { tipo: "juntada", seeu: true },
		"/seeu/processo/conclusao.do": { tipo: "conclusao", seeu: true }
	};
	const tela = TELAS[location.pathname];
	if (!tela) return;

	const TAG = "[Projudi Preferências na linha]";
	const TIMEOUT_CARGA_MS = 25000;
	let emAndamento = false;
	let painel = null;
	let dialogo = null;

	// --- utilitários -----------------------------------------------------------

	function el(tag, attrs, filhos) {
		const node = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			const v = attrs[k];
			if (v === undefined || v === null || v === false) return;
			if (k === "class") node.className = v;
			else if (k === "text") node.textContent = v;
			else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
			else node.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) {
			if (f) node.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
		});
		return node;
	}

	function api() {
		return window.__pdpQuickActions && window.__pdpQuickActions.applyPreferenceFrom ? window.__pdpQuickActions : null;
	}

	function mesmaOrigem(href, base) {
		try {
			const url = new URL(href, base || location.href);
			return url.origin === location.origin ? url : null;
		} catch (e) {
			return null;
		}
	}

	function linkProcesso(root, base) {
		for (const a of root.querySelectorAll("a[href]")) {
			const url = mesmaOrigem(a.getAttribute("href"), base);
			if (url && /^\/(projudi\/processo|seeu\/visualizacaoProcesso)\.do$/.test(url.pathname) && url.search) return url.href;
		}
		return null;
	}

	// Carrega `url` num iframe oculto (navegação de verdade, como
	// fetchDoc em quickActions.js). A cada carga e periodicamente chama
	// `pronto(doc, decorrido)`: true = resolve com {doc, url}; uma string =
	// navega o iframe para essa URL; false = continua esperando.
	// `manter`: o iframe não é removido ao resolver (vem em `iframe`, para
	// quem chamou agir nele e removê-lo depois).
	function carregar(url, pronto, manter) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "preferencias-na-linha");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText = "position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;";
			const inicio = Date.now();
			let fim = false;
			let navegando = false;
			function encerrar() {
				fim = true;
				clearInterval(timer);
				setTimeout(function () { iframe.remove(); }, 0);
			}
			function verificar() {
				if (fim) return;
				if (Date.now() - inicio > TIMEOUT_CARGA_MS) {
					encerrar();
					reject(new Error("a tela demorou demais para carregar"));
					return;
				}
				let doc, href;
				try {
					doc = iframe.contentDocument;
					href = iframe.contentWindow.location.href;
				} catch (e) {
					encerrar();
					reject(e);
					return;
				}
				if (navegando || !doc || href === "about:blank" || doc.readyState === "loading") return;
				let r;
				try {
					r = pronto(doc, Date.now() - inicio);
				} catch (e) {
					encerrar();
					reject(e);
					return;
				}
				if (r === true) {
					if (manter) {
						fim = true;
						clearInterval(timer);
					} else {
						encerrar();
					}
					resolve({ doc: doc, url: href, iframe: iframe });
				} else if (typeof r === "string") {
					navegando = true;
					iframe.src = r;
				}
			}
			iframe.addEventListener("load", function () {
				navegando = false;
				verificar();
			});
			const timer = setInterval(verificar, 300);
			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	async function buscarHTML(url) {
		const resposta = await fetch(url, { credentials: "same-origin" });
		if (!resposta.ok) throw new Error("o Projudi respondeu " + resposta.status);
		const bytes = await resposta.arrayBuffer();
		const inicio = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
		const m = /charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(inicio);
		const doc = new DOMParser().parseFromString(new TextDecoder((m && m[1]) || "windows-1252").decode(bytes), "text/html");
		return { doc: doc, url: resposta.url };
	}

	// --- dados da linha -----------------------------------------------------------

	function dadosLinha(row, cnj) {
		const ctx = { row: row, cnj: cnj, processoUrl: linkProcesso(row), analisarUrl: null };
		if (tela.tipo === "conclusao") {
			for (const a of row.querySelectorAll("a.link[href]")) {
				const url = mesmaOrigem(a.getAttribute("href"));
				if (url && url.pathname === "/projudi/processo/conclusao.do" && url.search && !url.hash) {
					ctx.analisarUrl = url.href;
					break;
				}
			}
		}
		return ctx;
	}

	// URL da tela do processo. No Retorno de Conclusão a linha não tem
	// link para o processo: procura na tela de análise da conclusão e, se
	// não houver, pesquisa pelo número (mesma busca do "Processo copiado",
	// clipboardProcess.js).
	async function urlDoProcesso(ctx) {
		if (ctx.processoUrl) return ctx.processoUrl;
		if (ctx.analisarUrl) {
			try {
				const r = await buscarHTML(ctx.analisarUrl);
				const url = linkProcesso(r.doc, r.url);
				if (url) {
					ctx.processoUrl = url;
					return url;
				}
			} catch (e) {
				console.warn(TAG, "falha ao ler a tela de análise da conclusão:", e);
			}
		}
		return null;
	}

	function pronto(precisaPendencias) {
		return function (doc, decorrido) {
			let path = "";
			try { path = new URL(doc.URL).pathname; } catch (e) { /* segue */ }
			if (path === "/projudi/processo.do") {
				if (!doc.querySelector('a.link[id^="LNKmov"]')) return false;
				if (precisaPendencias && !doc.querySelector("#quadroPendencias") && decorrido < 6000) return false;
				return true;
			}
			if (path === "/projudi/processo/buscaProcesso.do") {
				// Resultado da busca por número: um único processo → abre.
				const links = new Set();
				doc.querySelectorAll("a[href]").forEach(function (a) {
					const url = mesmaOrigem(a.getAttribute("href"), doc.URL);
					if (url && url.pathname === "/projudi/processo.do" && url.search) links.add(url.href);
				});
				if (links.size === 1) return links.values().next().value;
				if (links.size > 1) throw new Error("a busca pelo número trouxe mais de um processo");
			}
			return false;
		};
	}

	async function carregarProcesso(ctx, precisaPendencias) {
		const url = await urlDoProcesso(ctx);
		if (url) return carregar(url, pronto(precisaPendencias));
		const busca = location.origin + "/projudi/processo/buscaProcesso.do?actionType=iniciarSimples#pdp-search=" + encodeURIComponent(ctx.cnj);
		const r = await carregar(busca, pronto(precisaPendencias));
		ctx.processoUrl = r.url;
		return r;
	}

	// --- status na linha ------------------------------------------------------------

	function statusDe(ctx) {
		let s = ctx.row.querySelector(".pdp-pl-status");
		if (!s || !s.isConnected) {
			s = el("span", { class: "pdp-pl-status", role: "status" });
			const w = ctx.row.querySelector(".pdp-tl-linha");
			if (w) w.insertAdjacentElement("afterend", s);
			else ctx.row.cells[0].appendChild(s);
		}
		return s;
	}

	// `botoes` (opcional): [{ texto, titulo, acao }] - ex.: Repetir/Próxima/
	// Parar de uma etapa de combo que não foi executada.
	function mostrar(ctx, partes, tipo, botoes) {
		const s = statusDe(ctx);
		s.textContent = "";
		s.className = "pdp-pl-status" + (tipo ? " pdp-pl-" + tipo : "");
		s.appendChild(el("span", { text: partes.filter(Boolean).join(" · ") }));
		(botoes || []).forEach(function (b) {
			s.appendChild(el("button", { type: "button", class: "pdp-tl-btn pdp-pl-acao", title: b.titulo, text: b.texto, onclick: b.acao }));
		});
		if (!botoes && (tipo === "ok" || tipo === "erro" || tipo === "aviso")) {
			s.appendChild(el("button", { type: "button", class: "pdp-pl-x", title: "Fechar aviso", text: "✕", onclick: function () { s.remove(); } }));
		}
	}

	// --- fluxo ------------------------------------------------------------------------

	// `explicacao` (opcional) substitui o texto que explica o que vem depois.
	function perguntar(item, textoPergunta, textoSim, explicacao) {
		return new Promise(function (resolve) {
			fecharDialogo();
			const responder = function (valor) {
				fecharDialogo();
				resolve(valor);
			};
			const caixa = el("div", { class: "pdp-tl-modal pdp-pl-pergunta", role: "dialog" }, [
				el("div", { class: "pdp-tl-pop-cab" }, [
					el("strong", { text: (item.lote ? "Em lote (" + item.lote + " processos) · " : "") + (item.combo ? "🔗 Combo \"" + item.combo.name + "\" (" + item.combo.steps.length + " etapas)" : "★ " + item.pref.name + " — " + item.label) }),
					el("button", { type: "button", class: "pdp-tl-x", title: "Cancelar", text: "✕", onclick: function () { responder(null); } })
				]),
				el("p", { text: textoPergunta }),
				el("p", { class: "pdp-tl-vazio", text: explicacao ? explicacao : item.combo
					? (item.novaAba
						? "Respondendo Sim ou Não, o processo é aberto numa nova aba e o combo começa lá (ele tem etapa que só roda na tela do processo)."
						: "Respondendo Sim ou Não, as etapas do combo abrem em seguida, uma a uma, já preenchidas, para você confirmar cada uma.")
					: "Respondendo Sim ou Não, a preferência é aberta em seguida, já preenchida, para você confirmar." }),
				el("div", { class: "pdp-pl-botoes" }, [
					el("button", { type: "button", class: "pdp-tl-btn pdp-pl-sim", text: "✅ " + textoSim, onclick: function () { responder("sim"); } }),
					el("button", { type: "button", class: "pdp-tl-btn", text: "Não, seguir sem isso", onclick: function () { responder("nao"); } })
				])
			]);
			const fundo = el("div", { class: "pdp-tl-fundo", id: "pdpPreferenciaPergunta" }, [caixa]);
			fundo.addEventListener("mousedown", function (ev) { if (ev.target === fundo) responder(null); });
			document.body.appendChild(fundo);
			dialogo = { fundo: fundo, cancelar: function () { resolve(null); } };
			const botao = caixa.querySelector(".pdp-pl-sim");
			if (botao) botao.focus();
		});
	}

	function fecharDialogo() {
		if (!dialogo) return;
		dialogo.fundo.remove();
		dialogo = null;
	}

	// Se o fetch() não trouxer o botão nativo, a tela de análise da
	// conclusão é carregada de novo numa navegação de verdade (iframe oculto).
	function carregarTelaConclusao(url) {
		return carregar(url, function (doc, decorrido) {
			return !!doc.querySelector("#movimentarProcessoForm #extraButton") || decorrido > 5000;
		}).then(function (r) { return r.doc; });
	}

	// Telas de cumprimentos: abre a tela do processo e pergunta, uma a uma,
	// pelas pendências que ela tiver - juntadas e "Retorno de Conclusão" (as
	// mesmas de executarComPendencias, na tela do processo). Resolve com
	// { cancelado } ou { previa } (texto do que foi feito, ou null).
	// `respostaLote` ("sim"/"nao"): em lote, a resposta dada uma vez para
	// todos os processos - nada é perguntado aqui.
	async function pendenciasDoProcesso(ctx, item, respostaLote) {
		if (respostaLote === "nao") return { previa: null };
		const d = window.__pdpDispensas || {};
		mostrar(ctx, ["Verificando pendências do processo…"], "andamento");
		const proc = await carregarProcesso(ctx, true);
		const etapas = [];
		const juntadaUrl = d.juntadas && d.juntadaURL ? d.juntadaURL(proc.doc) : null;
		if (juntadaUrl) {
			etapas.push({
				pergunta: "Dispensar as juntadas pendentes deste processo antes de executar a preferência?",
				sim: "Sim, dispensar juntadas",
				fazendo: "Dispensando juntadas…",
				fazer: function () { return d.juntadas(juntadaUrl, statusDe(ctx)); }
			});
		}
		const conclusaoUrl = d.conclusao && d.conclusaoURL ? d.conclusaoURL(proc.doc) : null;
		if (conclusaoUrl) {
			etapas.push({
				pergunta: "Finalizar a conclusão pendente deste processo antes de executar a preferência?",
				sim: "Sim, finalizar conclusão",
				fazendo: "Finalizando a conclusão…",
				fazer: function () { return d.conclusao(conclusaoUrl, carregarTelaConclusao); }
			});
		}
		const feitas = [];
		for (const etapa of etapas) {
			mostrar(ctx, feitas.concat(["Aguardando sua resposta…"]), "andamento");
			const resposta = respostaLote || await perguntar(item, etapa.pergunta, etapa.sim);
			if (!resposta) return { cancelado: true };
			if (resposta !== "sim") continue;
			mostrar(ctx, feitas.concat([etapa.fazendo]), "andamento");
			const r = await etapa.fazer();
			if (r.ok && r.dismiss) r.dismiss();
			feitas.push((r.ok ? "✅ " : "⚠ ") + (r.message || (r.ok ? "Feito." : "Não concluído.")));
		}
		return { previa: feitas.length ? feitas.join(" · ") : null };
	}

	async function etapaPrevia(ctx, proc) {
		const d = window.__pdpDispensas || {};
		const ancora = statusDe(ctx);
		if (tela.tipo === "conclusao") {
			if (!d.conclusao) return { ok: false, message: "Finalização de conclusão indisponível." };
			// Primeiro o link do quadro Pendências da tela do processo (o do
			// botão "Finalizar conclusão" da capa); sem ele, o "Analisar" da
			// linha (tela "Dados da Conclusão", que leva à análise).
			const urlPendencia = proc && d.conclusaoURL ? d.conclusaoURL(proc.doc) : null;
			if (urlPendencia) ctx.analisarUrl = urlPendencia;
			if (!ctx.analisarUrl) return { ok: false, message: "Linha \"Retorno de Conclusão\" não encontrada no quadro Pendências do processo." };
			return d.conclusao(ctx.analisarUrl, carregarTelaConclusao);
		}
		if (tela.tipo === "juntada") {
			if (!d.juntadas || !d.juntadaURL) return { ok: false, message: "Dispensa de juntadas indisponível." };
			const url = d.juntadaURL(proc.doc);
			if (!url) return { ok: false, message: "Nenhuma juntada pendente no quadro Pendências do processo." };
			return d.juntadas(url, ancora);
		}
		if (!d.decursos || !d.decursoURL) return { ok: false, message: "Dispensa de decursos indisponível." };
		const url = d.decursoURL(proc.doc);
		if (!url) return { ok: false, message: "Nenhum decurso de prazo pendente no quadro Pendências do processo." };
		return d.decursos(url, ancora);
	}

	// Etapa prévia (Sim): dispensa as juntadas/decursos ou finaliza a
	// conclusão. Devolve o texto do resultado (ou null, no "Não").
	async function fazerPrevia(ctx, resposta) {
		if (resposta !== "sim") return null;
		// O link da pendência (juntadas, decursos ou conclusão) vem do quadro
		// Pendências da tela do processo; na conclusão, sem ele, usa o
		// "Analisar" da própria linha (ver etapaPrevia).
		mostrar(ctx, ["Localizando o processo…"], "andamento");
		const proc = await carregarProcesso(ctx, true);
		mostrar(ctx, [tela.fazendo], "andamento");
		const r = await etapaPrevia(ctx, proc);
		// Sucesso: o card de status da dispensa sai; em caso de falha ele
		// fica (com "Ver detalhes"), e o fluxo segue mesmo assim.
		if (r.ok && r.dismiss) r.dismiss();
		return (r.ok ? "✅ " : "⚠ ") + (r.message || (r.ok ? "Feito." : "Não concluído."));
	}

	// Abre uma preferência no popup, a partir da tela do processo carregada
	// de novo em segundo plano (depois da etapa prévia ou da etapa anterior
	// do combo). Resolve com { ok, texto }.
	// "Analisar" dos cumprimentos (Pré-Análise): abre o link "Analisar" da
	// linha (preAnalise.do) no popup das ações rápidas e deixa o motor do
	// Juntar Documento (juntarDocumento.js, prepararPreAnalise) conduzir:
	// Tipo do Arquivo/Modelo → "Digitar Texto" → texto → "Salvar e
	// Concluir" → na tela do cumprimento, "Postergar Assinatura" (se a
	// preferência mandar) ou "Assinar e Expedir" pelo usuário. `item.acao`:
	// "pref" (aplicar), "nova" (gravar) ou "editar". Resolve com
	// { ok, texto, aviso, executado }.
	function linkPreAnalise(row) {
		for (const a of row.querySelectorAll("a[href]")) {
			const url = mesmaOrigem(a.getAttribute("href"));
			if (url && url.pathname === "/projudi/processo/preAnalise.do" && url.search && !url.hash) return url.href;
		}
		return null;
	}

	function abrirPreAnalise(ctx, item, previa) {
		const qa = api();
		const jd = window.__pdpJuntarDocumentoApi;
		const url = linkPreAnalise(ctx.row);
		if (!url) return Promise.resolve({ ok: false, texto: "esta linha não tem o link \"Analisar\" (Pré-Análise)." });
		if (!jd || !jd.prepararPreAnalise) return Promise.resolve({ ok: false, texto: "ligue o \"Juntar Documento\" no Menu da extensão para usar estas preferências." });
		if (!qa || !qa.openActionModal) return Promise.resolve({ ok: false, texto: "as ações rápidas não estão disponíveis nesta tela." });
		const mode = item.acao === "pref" ? "apply" : item.acao === "editar" ? "edit" : "capture";
		const rotulo = mode === "capture" ? "Analisar — gravando nova preferência" : "Analisar — ★ " + item.pref.name;
		jd.prepararPreAnalise(mode, item.pref || null, ctx.cnj);
		mostrar(ctx, [previa, mode === "capture" ? "Gravando: faça a pré-análise no popup…" : mode === "edit" ? "Editando ★ " + item.pref.name + " no popup…" : "★ " + item.pref.name + ": pré-análise no popup…"], "andamento");
		return new Promise(function (resolve) {
			let concluida = false;
			let fechar = null;
			const timer = setInterval(function () {
				const fim = jd.fimDecurso ? jd.fimDecurso() : null;
				if (fim === "concluida" && !concluida) {
					concluida = true;
					mostrar(ctx, [previa, "Postergando a assinatura…"], "andamento");
					fechar = setTimeout(function () { if (qa.closeActionModal) qa.closeActionModal(); }, 2500);
				} else if (fim === "aguardando") {
					mostrar(ctx, [previa, "Pré-análise concluída: clique em \"Assinar e Expedir\" no popup e, depois, feche-o."], "aviso");
				}
			}, 500);
			qa.openActionModal(rotulo, url, {
				onClose: function (motivo) {
					clearInterval(timer);
					clearTimeout(fechar);
					const fim = jd.fimDecurso ? jd.fimDecurso() : null;
					if (jd.hasActiveJob && jd.hasActiveJob()) jd.cancel();
					const gravou = mode !== "apply" ? "Preferência " + (mode === "edit" ? "atualizada" : "salva") + " · " : "★ " + item.pref.name + ": ";
					if (concluida) resolve({ ok: true, texto: gravou + "pré-análise concluída e assinatura postergada", executado: true });
					else if (fim === "aguardando") resolve({ ok: true, texto: gravou + "pré-análise concluída; confira se o cumprimento foi assinado e expedido", aviso: true, executado: true });
					else if (mode !== "apply") resolve({ ok: true, texto: "Popup fechado. A preferência é salva na tela do cumprimento, depois do \"Salvar e Concluir\".", aviso: true, executado: false });
					else resolve({ ok: true, texto: motivo === "auto" ? "Pré-análise concluída" : "Popup fechado antes do fim (confira o cumprimento)", aviso: motivo !== "auto", executado: motivo === "auto" });
				}
			});
		});
	}

	async function abrirPreferencia(ctx, label, pref, prefixo) {
		const rotulo = "★ " + pref.name;
		mostrar(ctx, prefixo.concat(["Carregando o processo…"]), "andamento");
		const proc = await carregarProcesso(ctx, false);
		mostrar(ctx, prefixo.concat(["Abrindo \"" + label + "\"…"]), "andamento");
		return new Promise(function (resolve) {
			let enviado = false;
			let fim = false;
			function terminar(ok, texto) {
				if (fim) return;
				fim = true;
				resolve({ ok: ok, texto: texto });
			}
			api().applyPreferenceFrom(label, pref, proc, {
				onSubmit: function () {
					enviado = true;
					mostrar(ctx, prefixo.concat([rotulo + ": enviando…"]), "andamento");
				},
				onDone: function () { terminar(true, rotulo + ": concluída"); },
				onClose: function () {
					if (enviado) terminar(true, rotulo + ": enviada (confira no processo)");
					else terminar(false, rotulo + ": não executada (popup fechado)");
				},
				onFail: function (motivo) { terminar(false, rotulo + ": " + motivo); }
			});
		});
	}

	async function executar(ctx, item) {
		if (emAndamento) {
			alert("Já há uma preferência ou combo sendo executado. Aguarde terminar.");
			return;
		}
		if (!api()) {
			alert("As ações rápidas não estão disponíveis nesta tela. Recarregue a página.");
			return;
		}
		// Analisar Decurso (decursoNaLinha.js): a própria linha mostra o
		// andamento; sem a pergunta de dispensar decursos antes.
		if (item.decurso) {
			const dec = window.__pdpDecursoNaLinha;
			const r = dec ? await dec.executarNaLinha(ctx.row, item.escolha) : { ok: false, texto: "o Analisar Decurso não está ligado nesta tela." };
			if (!r.ok) mostrar(ctx, ["⚠ " + r.texto], "erro");
			return;
		}
		// Gravar/editar uma preferência do "Analisar" (Pré-Análise): nada é
		// executado no processo além do que o usuário fizer - sem pendências.
		if (item.preAnalise && item.acao !== "pref") {
			emAndamento = true;
			try {
				const r = await abrirPreAnalise(ctx, item, null);
				mostrar(ctx, [r.texto], r.ok ? (r.aviso ? "aviso" : "ok") : "erro");
			} finally {
				emAndamento = false;
			}
			return;
		}
		// Telas de análise: pergunta fixa, conforme a tela. Telas de
		// cumprimentos (verificaPendencias): perguntas só pelo que estiver
		// pendente no processo (pendenciasDoProcesso). SEEU: nenhuma.
		const resposta = tela.pergunta ? await perguntar(item, tela.pergunta, tela.sim) : "nao";
		if (!resposta) return;
		emAndamento = true;
		try {
			await rodar(ctx, item, resposta, false);
		} finally {
			emAndamento = false;
		}
	}

	// Executa a preferência/combo num processo, já com a resposta da
	// etapa prévia. `emLote`: nas telas de cumprimentos, `resposta` vale
	// para as pendências encontradas (sem perguntar de novo). Resolve com
	// true quando a preferência (ou o combo inteiro) foi executada.
	async function rodar(ctx, item, resposta, emLote) {
		let previa = null;
		try {
			if (tela.verificaPendencias) {
				const p = await pendenciasDoProcesso(ctx, item, emLote ? resposta : null);
				if (p.cancelado) {
					const s = ctx.row.querySelector(".pdp-pl-status");
					if (s) s.remove();
					return false;
				}
				previa = p.previa;
			} else {
				previa = await fazerPrevia(ctx, resposta);
			}
			if (item.combo) return await executarCombo(ctx, item, previa);
			if (item.preAnalise) {
				const rp = await abrirPreAnalise(ctx, item, previa);
				mostrar(ctx, [previa, rp.texto], rp.ok ? (rp.aviso ? "aviso" : "ok") : "erro");
				return !!rp.executado;
			}
			const r = await abrirPreferencia(ctx, item.label, item.pref, [previa]);
			mostrar(ctx, [previa, r.texto], r.ok ? "ok" : "aviso");
			return r.ok;
		} catch (e) {
			console.error(TAG, e);
			ctx.erro = true; // falha real: em lote, interrompe (ver percorrerLote)
			mostrar(ctx, [previa, (e && e.message) || "falha ao carregar o processo"], "erro");
			return false;
		}
	}

	// Pergunta na própria linha como seguir depois de uma etapa de combo não
	// executada. Resolve com "repetir", "proxima" ou "parar".
	function escolherNaLinha(ctx, partes) {
		return new Promise(function (resolve) {
			mostrar(ctx, partes, "aviso", [
				{ texto: "↻ Repetir etapa", titulo: "Abrir de novo esta etapa", acao: function () { resolve("repetir"); } },
				{ texto: "⏭ Próxima etapa", titulo: "Considerar esta etapa concluída (ou pulá-la) e abrir a próxima", acao: function () { resolve("proxima"); } },
				{ texto: "⏹ Parar combo", titulo: "Encerrar o combo (as etapas já executadas continuam valendo)", acao: function () { resolve("parar"); } }
			]);
		});
	}

	async function executarCombo(ctx, item, previa) {
		const qa = api();
		const combo = item.combo;
		const nome = "🔗 " + combo.name;
		if (item.novaAba) {
			// Etapas que só rodam na tela do processo: o combo começa numa
			// nova aba, na tela do processo (quickActions.js, maybeStartPendingCombo).
			await chrome.storage.local.set({ [qa.comboPendingKey]: { comboId: combo.id, numero: ctx.cnj, criadoEm: Date.now() } });
			const r = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "clipboard-process-open", number: ctx.cnj });
			if (!r || !r.ok) throw new Error("não foi possível abrir o processo numa nova aba" + (r && r.error ? " (" + r.error + ")" : ""));
			mostrar(ctx, [previa, nome + ": aberto numa nova aba — o combo continua lá"], "ok");
			return true;
		}
		const todas = await qa.loadComboPreferences();
		const feitas = [];
		let i = 0;
		while (i < combo.steps.length) {
			const passo = combo.steps[i];
			const etapa = nome + " — etapa " + (i + 1) + " de " + combo.steps.length;
			const pref = qa.findComboPref(todas, passo);
			let r;
			if (!pref) r = { ok: false, texto: "a preferência \"" + (passo.prefName || passo.label) + "\" não existe mais" };
			else r = await abrirPreferencia(ctx, passo.label, pref, [previa, etapa]);
			if (r.ok) {
				feitas.push(i + 1);
				i++;
				continue;
			}
			const escolha = await escolherNaLinha(ctx, [previa, etapa, r.texto]);
			if (escolha === "parar") {
				mostrar(ctx, [previa, nome + ": parado na etapa " + (i + 1) + " (" + feitas.length + " executada(s))"], "aviso");
				return false;
			}
			if (escolha === "proxima") i++;
		}
		mostrar(ctx, [previa, nome + ": concluído (" + combo.steps.length + " etapas)"], "ok");
		return true;
	}

	// --- painel de cards ------------------------------------------------------------------

	function fecharPainel() {
		if (!painel) return;
		painel.el.remove();
		painel = null;
		document.removeEventListener("mousedown", foraDoPainel, true);
	}

	function foraDoPainel(ev) {
		if (painel && !painel.el.contains(ev.target) && !painel.ancora.contains(ev.target)) fecharPainel();
	}

	function disponivel(item) {
		if (item.kind !== "action") return "Só na tela do processo (Juntar Documento).";
		if (item.label === "Alvará Eletrônico") return "Só na tela do processo (Alvará Eletrônico).";
		if (item.label === "Advogados") return "Só na tela do processo (Advogados).";
		return null;
	}

	function cardClicavel(card, ativar) {
		card.addEventListener("click", ativar);
		card.addEventListener("keydown", function (ev) {
			if (ev.key === "Enter" || ev.key === " ") {
				ev.preventDefault();
				ativar();
			}
		});
		return card;
	}

	function novoPainel(ancora, titulo) {
		const box = el("div", { class: "pdp-tl-popover pdp-pl-painel", id: "pdpPreferenciasLinha" });
		box.appendChild(el("div", { class: "pdp-tl-pop-cab" }, [
			el("strong", { text: titulo }),
			el("button", { type: "button", class: "pdp-tl-x", title: "Fechar", text: "✕", onclick: fecharPainel })
		]));
		const grade = el("div", { class: "pdp-qa-fav-grid" });
		box.appendChild(grade);
		document.body.appendChild(box);
		painel = { el: box, ancora: ancora };
		posicionar(box, ancora);
		setTimeout(function () { document.addEventListener("mousedown", foraDoPainel, true); }, 0);
		return { box: box, grade: grade };
	}

	// ⭐ de uma linha.
	function abrir(ancora, row, cnj) {
		if (painel && painel.ancora === ancora) {
			fecharPainel();
			return;
		}
		fecharPainel();
		const titulo = "⭐ Minhas Preferências — " + cnj;
		if (tela.seeu) {
			montarPainelSeeu(ancora, titulo, false, function (pref, nome) {
				executarSeeu(dadosLinha(row, cnj), pref, nome);
			});
			return;
		}
		montarPainel(ancora, titulo, false, function (item) {
			executar(dadosLinha(row, cnj), item);
		});
	}

	// Cards das preferências e combos das ações rápidas. `escolher(item)`:
	// item = { kind, label, pref } ou { combo, novaAba }.
	function montarPainel(ancora, titulo, emLote, escolher) {
		const qa = api();
		const p = novoPainel(ancora, titulo);
		const box = p.box;
		const grade = p.grade;
		const onde = emLote ? "nos processos marcados, um de cada vez" : "neste processo";

		if (!qa || !qa.loadFavItems) {
			grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "As ações rápidas não estão disponíveis nesta tela. Recarregue a página." }));
			return;
		}
		qa.loadFavItems().then(function (itens) {
			if (!painel || painel.el !== box) return;
			if (!itens.length) {
				grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Nenhuma preferência salva. Crie em \"+ Nova preferência\" no painel de uma ação, na tela do processo." }));
				posicionar(box, ancora);
				return;
			}
			itens.forEach(function (item) {
				const motivo = disponivel(item);
				const card = el("div", {
					class: "pdp-qa-fav-card" + (motivo ? " pdp-qa-fav-unavailable" : ""),
					tabindex: "0",
					role: "button",
					title: motivo || ("Executar \"" + item.label + "\" com esta preferência " + onde + (item.pref.descricao ? "\n" + item.pref.descricao : ""))
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: item.label }),
					el("span", { class: "pdp-qa-fav-card-name", text: "★ " + item.pref.name })
				]);
				grade.appendChild(cardClicavel(card, function () {
					if (motivo) return;
					fecharPainel();
					escolher(item);
				}));
			});
			posicionar(box, ancora);
		}).then(function () {
			return Promise.all([qa.loadCombos ? qa.loadCombos() : [], qa.loadComboPreferences ? qa.loadComboPreferences() : {}]);
		}).then(function (dados) {
			const combos = dados[0] || [];
			if (!painel || painel.el !== box || !combos.length) return;
			box.appendChild(el("div", { class: "pdp-tl-sec", text: "🔗 Combos" }));
			const gradeCombos = el("div", { class: "pdp-qa-fav-grid" });
			box.appendChild(gradeCombos);
			combos.forEach(function (combo) {
				const passos = combo.steps || [];
				const novaAba = passos.some(function (p) { return qa.stepNeedsProcessScreen(p.label); });
				// Em lote, um combo que abre uma nova aba por processo não roda.
				const motivo = emLote && novaAba ? "Em lote, não: este combo tem etapa que só roda na tela do processo (abriria uma aba por processo)." : null;
				const descricao = passos.map(function (p, i) {
					const pref = qa.findComboPref(dados[1], p);
					return (i + 1) + ". " + p.label + " — ★ " + (pref ? pref.name : p.prefName || "(preferência removida)");
				}).join("\n");
				const card = el("div", {
					class: "pdp-qa-fav-card pdp-pl-combo" + (motivo ? " pdp-qa-fav-unavailable" : ""),
					tabindex: "0",
					role: "button",
					title: motivo || ((novaAba ? "Tem etapa que só roda na tela do processo: o combo começa numa nova aba.\n" : "Executar as etapas " + onde + ", uma a uma:\n") + descricao)
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: "Combo · " + passos.length + " etapas" + (novaAba ? " · nova aba" : "") }),
					el("span", { class: "pdp-qa-fav-card-name", text: "▶ " + combo.name })
				]);
				gradeCombos.appendChild(cardClicavel(card, function () {
					if (motivo) return;
					fecharPainel();
					escolher({ combo: combo, novaAba: novaAba });
				}));
			});
			posicionar(box, ancora);
		}).then(function () {
			if (tela.preAnalise) secaoPreAnalise(box, ancora, emLote, escolher);
			const dec = window.__pdpDecursoNaLinha;
			if (dec && dec.disponivel()) return secaoDecurso(box, ancora, emLote, escolher, dec);
		}).catch(function (e) {
			console.error(TAG, "falha ao listar preferências/combos:", e);
		});
	}

	// Seção "📝 Analisar Decurso" do card ⭐ nas listas de decurso de prazo
	// (decursoNaLinha.js): as mesmas preferências do botão "Analisar Decurso"
	// da linha, para usar também no "Em lote". Fora do lote, "+ Nova
	// preferência", ✏️ e 🗑. O Analisar Decurso resolve a própria pendência
	// do decurso: aqui não há a pergunta de dispensar decursos antes.
	async function secaoDecurso(box, ancora, emLote, escolher, dec) {
		const prefs = await dec.listarPreferencias();
		if (!painel || painel.el !== box) return;
		const vazio = box.querySelector(":scope > .pdp-tl-vazio");
		if (vazio) vazio.textContent = "Nenhuma preferência de ação salva (crie no painel de uma ação, na tela do processo).";
		box.appendChild(el("div", { class: "pdp-tl-sec", text: "📝 Analisar Decurso" }));
		const grade = el("div", { class: "pdp-qa-fav-grid" });
		box.appendChild(grade);
		if (!emLote) {
			grade.appendChild(cardClicavel(el("div", {
				class: "pdp-qa-fav-card pdp-pl-nova",
				tabindex: "0",
				role: "button",
				title: "Abre a análise do decurso no popup e grava a inclusão do arquivo (Tipo do Arquivo, Modelo e texto); no \"Assinar Arquivos\", pede o nome e salva."
			}, [
				el("span", { class: "pdp-qa-fav-card-action", text: "Analisar Decurso" }),
				el("span", { class: "pdp-qa-fav-card-name", text: "+ Nova preferência" })
			]), function () {
				fecharPainel();
				escolher({ decurso: true, escolha: { acao: "nova" } });
			}));
		}
		const todas = prefs.decurso.map(function (p) { return { pref: p, juntar: false }; })
			.concat(prefs.juntar.map(function (p) { return { pref: p, juntar: true }; }));
		if (!todas.length && emLote) {
			grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Nenhuma preferência de Analisar Decurso salva. Crie pelo \"+ Nova preferência\" do ⭐ (ou do botão \"Analisar Decurso\") de uma linha." }));
		}
		todas.forEach(function (x) {
			const pref = x.pref;
			const filhos = [
				el("span", { class: "pdp-qa-fav-card-action", text: x.juntar ? "Analisar Decurso · do Juntar Documento" : "Analisar Decurso" }),
				el("span", { class: "pdp-qa-fav-card-name", text: "★ " + pref.name })
			];
			if (!emLote && !x.juntar) {
				filhos.push(el("span", { class: "pdp-pl-card-icones" }, [
					el("button", { type: "button", class: "pdp-tl-icone", title: "Editar: abre a análise já preenchida, sem avançar sozinha; no \"Assinar Arquivos\", atualiza a preferência", text: "✏️", onclick: function (ev) {
						ev.stopPropagation();
						fecharPainel();
						escolher({ decurso: true, escolha: { acao: "editar", pref: pref } });
					} }),
					el("button", { type: "button", class: "pdp-tl-icone", title: "Remover esta preferência", text: "🗑", onclick: function (ev) {
						ev.stopPropagation();
						if (!confirm("Remover a preferência \"" + pref.name + "\" do Analisar Decurso?")) return;
						dec.removerPreferencia(pref.id).then(function () { fecharPainel(); });
					} })
				]));
			}
			grade.appendChild(cardClicavel(el("div", {
				class: "pdp-qa-fav-card",
				tabindex: "0",
				role: "button",
				title: "Analisa o decurso com esta preferência: clica em \"Adicionar\", inclui o arquivo (Tipo do Arquivo, Modelo e texto) e, depois da sua assinatura, conclui" + (emLote ? " — em cada processo marcado, um de cada vez." : ".")
			}, filhos), function () {
				fecharPainel();
				escolher({ decurso: true, escolha: { acao: "pref", pref: pref } });
			}));
		});
		posicionar(box, ancora);
	}

	// Seção "📝 Analisar (Pré-Análise)" do card ⭐ (Demais Cumprimentos):
	// "+ Nova preferência" e as preferências gravadas, com ✏️ e 🗑 (fora do
	// lote, só as preferências).
	function secaoPreAnalise(box, ancora, emLote, escolher) {
		const jd = window.__pdpJuntarDocumentoApi;
		if (!painel || painel.el !== box) return;
		// Sem preferências de ação, o painel troca a grade por um aviso.
		const vazio = box.querySelector(":scope > .pdp-tl-vazio");
		if (vazio) vazio.textContent = "Nenhuma preferência de ação salva (crie no painel de uma ação, na tela do processo).";
		box.appendChild(el("div", { class: "pdp-tl-sec", text: "📝 Analisar (Pré-Análise)" }));
		const grade = el("div", { class: "pdp-qa-fav-grid" });
		box.appendChild(grade);
		if (!jd || !jd.listarPreAnalise) {
			grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Ligue o \"Juntar Documento\" no Menu da extensão para usar estas preferências." }));
			return;
		}
		if (!emLote) {
			grade.appendChild(cardClicavel(el("div", {
				class: "pdp-qa-fav-card pdp-pl-nova",
				tabindex: "0",
				role: "button",
				title: "Abre o \"Analisar\" (Pré-Análise) deste cumprimento no popup e grava o que você fizer: Tipo do Arquivo, Modelo e texto. Na tela do cumprimento, a extensão pergunta se deve sempre clicar em \"Postergar Assinatura\" e salva."
			}, [
				el("span", { class: "pdp-qa-fav-card-action", text: "Analisar (Pré-Análise)" }),
				el("span", { class: "pdp-qa-fav-card-name", text: "+ Nova preferência" })
			]), function () {
				fecharPainel();
				escolher({ preAnalise: true, acao: "nova" });
			}));
		}
		jd.listarPreAnalise().then(function (prefs) {
			if (!painel || painel.el !== box) return;
			if (!prefs.length && emLote) {
				grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Nenhuma preferência de Pré-Análise salva. Crie pelo \"+ Nova preferência\" do ⭐ de uma linha." }));
			}
			prefs.forEach(function (pref) {
				const fim = pref.postergar ? "postergar assinatura" : "você assina e expede";
				const filhos = [
					el("span", { class: "pdp-qa-fav-card-action", text: "Analisar · " + fim }),
					el("span", { class: "pdp-qa-fav-card-name", text: "★ " + pref.name })
				];
				if (!emLote) {
					filhos.push(el("span", { class: "pdp-pl-card-icones" }, [
						el("button", { type: "button", class: "pdp-tl-icone", title: "Editar: abre a pré-análise já preenchida, sem avançar sozinha; na tela do cumprimento, atualiza a preferência", text: "✏️", onclick: function (ev) {
							ev.stopPropagation();
							fecharPainel();
							escolher({ preAnalise: true, acao: "editar", pref: pref });
						} }),
						el("button", { type: "button", class: "pdp-tl-icone", title: "Remover esta preferência", text: "🗑", onclick: function (ev) {
							ev.stopPropagation();
							if (!confirm("Remover a preferência \"" + pref.name + "\" do Analisar (Pré-Análise)?")) return;
							jd.removerPreAnalise(pref.id).then(function () { fecharPainel(); });
						} })
					]));
				}
				grade.appendChild(cardClicavel(el("div", {
					class: "pdp-qa-fav-card",
					tabindex: "0",
					role: "button",
					title: "Faz a pré-análise com esta preferência (Tipo do Arquivo, Modelo e texto) e, no fim, " + (pref.postergar ? "clica em \"Postergar Assinatura\"" : "deixa \"Assinar e Expedir\" para você") + (emLote ? ", em cada processo marcado." : ".")
				}, filhos), function () {
					fecharPainel();
					escolher({ preAnalise: true, acao: "pref", pref: pref, label: "Analisar (Pré-Análise)" });
				}));
			});
			posicionar(box, ancora);
		});
	}

	// --- SEEU: preferências do 📍 Localizador --------------------------------------------

	function montarPainelSeeu(ancora, titulo, emLote, escolher) {
		const loc = window.__pdpLocalizador;
		const p = novoPainel(ancora, titulo);
		const box = p.box;
		const grade = p.grade;

		if (!loc || !loc.associarEm) {
			grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Ative \"Localizador (SEEU)\" no Menu da extensão (ícone da balança) e recarregue a página." }));
			posicionar(box, ancora);
			return;
		}
		loc.preferencias().then(function (prefs) {
			if (!painel || painel.el !== box) return;
			if (!prefs.length) {
				grade.replaceWith(el("div", { class: "pdp-tl-vazio", text: "Nenhuma preferência de localizador salva. Crie no botão \"📍 Localizador\", na tela do processo." }));
				posicionar(box, ancora);
				return;
			}
			prefs.forEach(function (pref) {
				const nome = pref.nome || pref.localizadores.join(" • ");
				const card = el("div", {
					class: "pdp-qa-fav-card",
					tabindex: "0",
					role: "button",
					title: (emLote ? "Associar aos processos marcados, em segundo plano:\n" : "Associar a este processo, em segundo plano:\n") + pref.localizadores.join("\n")
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: "📍 Localizador" }),
					el("span", { class: "pdp-qa-fav-card-name", text: "★ " + nome })
				]);
				grade.appendChild(cardClicavel(card, function () {
					fecharPainel();
					escolher(pref, nome);
				}));
			});
			posicionar(box, ancora);
		}).catch(function (e) {
			console.error(TAG, "falha ao listar as preferências de localizadores:", e);
		});
	}

	// Tela do processo do SEEU pronta: com o cabeçalho de localizadores e o
	// "+" (sem o "+" depois de alguns segundos, segue para dar o erro de
	// permissão em associarEm).
	function prontoSeeu(doc, decorrido) {
		const loc = window.__pdpLocalizador;
		let path = "";
		try { path = new URL(doc.URL).pathname; } catch (e) { /* segue */ }
		if (path !== "/seeu/visualizacaoProcesso.do") return false;
		if (loc.podeAssociar(doc)) return true;
		return loc.temCabecalho(doc) && decorrido > 8000;
	}

	async function executarSeeu(ctx, pref, nome) {
		if (emAndamento) {
			alert("Já há uma preferência sendo executada. Aguarde terminar.");
			return;
		}
		emAndamento = true;
		try {
			await rodarSeeu(ctx, pref, nome);
		} finally {
			emAndamento = false;
		}
	}

	// Associa os localizadores num processo. Resolve com true se todos
	// foram associados.
	async function rodarSeeu(ctx, pref, nome) {
		const loc = window.__pdpLocalizador;
		const rotulo = "★ " + nome;
		let proc = null;
		try {
			if (!ctx.processoUrl) throw new Error("link do processo não encontrado na linha");
			mostrar(ctx, [rotulo, "Carregando o processo…"], "andamento");
			proc = await carregar(ctx.processoUrl, prontoSeeu, true);
			// A tela acabou de montar o cabeçalho: um instante para o SEEU
			// terminar de ligar o "+" antes do primeiro clique.
			await new Promise(function (r) { setTimeout(r, 1500); });
			const r = await loc.associarEm(proc.doc, pref.localizadores, function (i, total, local) {
				mostrar(ctx, [rotulo, "Associando " + i + " de " + total + ": " + local + "…"], "andamento");
			});
			mostrar(ctx, [(r.tipo === "ok" ? "✅ " : "⚠ ") + rotulo, r.texto], r.tipo === "ok" ? "ok" : r.tipo === "erro" ? "erro" : "aviso");
			if (r.tipo === "erro") ctx.erro = true;
			return r.tipo === "ok";
		} catch (e) {
			console.error(TAG, e);
			ctx.erro = true;
			mostrar(ctx, ["⚠ " + rotulo, (e && e.message) || "falha ao carregar o processo"], "erro");
			return false;
		} finally {
			if (proc && proc.iframe) proc.iframe.remove();
		}
	}

	// --- em lote ----------------------------------------------------------------------------
	// Caixinha de marcar em cada linha (abaixo do "+" da primeira coluna) e
	// a barra "⭐ Em lote" acima da tabela. Os processos marcados recebem a
	// mesma preferência/combo, um de cada vez, cada um na sua linha.

	let barra = null; // { el, todos, contagem, executar, parar, status }
	let lote = null; // { parar } enquanto um lote roda

	// Chamado por listaTarefas.js a cada linha de processo renderizada.
	function marcador(row, cnj) {
		const celula = row.cells && row.cells[0];
		if (!celula) return;
		let caixa = celula.querySelector(":scope > .pdp-pl-lote-celula > .pdp-pl-lote-check");
		if (caixa && caixa.getAttribute("data-cnj") === cnj) {
			garantirBarra(row);
			return;
		}
		if (caixa) caixa.parentNode.remove();
		caixa = el("input", {
			type: "checkbox",
			class: "pdp-pl-lote-check",
			"data-cnj": cnj,
			title: "Marcar este processo para executar uma preferência em lote (barra \"⭐ Em lote\", acima da tabela)",
			"aria-label": "Marcar " + cnj + " para executar em lote"
		});
		// O clique não chega à linha (que pode ter ação própria no Projudi).
		caixa.addEventListener("click", function (ev) { ev.stopPropagation(); });
		caixa.addEventListener("change", atualizarBarra);
		celula.appendChild(el("div", { class: "pdp-pl-lote-celula" }, [caixa]));
		garantirBarra(row);
	}

	function caixasVisiveis() {
		return Array.from(document.querySelectorAll("input.pdp-pl-lote-check")).filter(function (c) {
			const row = c.closest("tr");
			return row && !row.classList.contains("pdp-tl-oculta");
		});
	}

	function marcadas() {
		return caixasVisiveis().filter(function (c) { return c.checked; }).map(function (c) {
			return { caixa: c, row: c.closest("tr"), cnj: c.getAttribute("data-cnj") };
		});
	}

	function garantirBarra(row) {
		if (barra && barra.el.isConnected) return;
		const legenda = document.getElementById("pdpTarefasLegenda");
		const tabela = row.closest("table");
		if (!legenda && !tabela) return;
		const todos = el("input", { type: "checkbox", title: "Marcar/desmarcar todos os processos visíveis na tabela" });
		todos.addEventListener("change", function () {
			caixasVisiveis().forEach(function (c) { c.checked = todos.checked; });
			atualizarBarra();
		});
		const contagem = el("span", { class: "pdp-pl-lote-contagem" });
		const executar = el("button", {
			type: "button",
			class: "pdp-tl-btn pdp-pl-sim",
			text: tela.seeu ? "⭐ Associar localizadores nos marcados" : "⭐ Executar preferência nos marcados",
			onclick: function (ev) {
				ev.preventDefault();
				abrirLote(executar);
			}
		});
		const desmarcar = el("button", {
			type: "button",
			class: "pdp-tl-link",
			text: "Desmarcar todos",
			onclick: function () {
				document.querySelectorAll("input.pdp-pl-lote-check").forEach(function (c) { c.checked = false; });
				atualizarBarra();
			}
		});
		const parar = el("button", {
			type: "button",
			class: "pdp-tl-btn pdp-pl-lote-parar",
			text: "⏹ Parar lote",
			title: "Não abrir os próximos processos (o que estiver aberto agora continua)",
			onclick: function () {
				if (!lote) return;
				lote.parar = true;
				parar.disabled = true;
				statusLote("Parando: o lote para depois do processo atual…");
			}
		});
		const status = el("span", { class: "pdp-pl-lote-status", role: "status" });
		const caixa = el("div", { id: "pdpPreferenciasLote", class: "pdp-pl-lote" }, [
			el("strong", { text: "⭐ Em lote:" }),
			el("label", { class: "pdp-pl-lote-todos" }, [todos, "marcar todos"]),
			contagem,
			executar,
			desmarcar,
			parar,
			status
		]);
		if (legenda) legenda.insertAdjacentElement("afterend", caixa);
		else tabela.insertAdjacentElement("beforebegin", caixa);
		barra = { el: caixa, todos: todos, contagem: contagem, executar: executar, desmarcar: desmarcar, parar: parar, status: status };
		atualizarBarra();
	}

	function atualizarBarra() {
		if (!barra) return;
		const visiveis = caixasVisiveis();
		const n = visiveis.filter(function (c) { return c.checked; }).length;
		barra.contagem.textContent = n + " processo(s) marcado(s)";
		barra.todos.checked = n > 0 && n === visiveis.length;
		barra.todos.indeterminate = n > 0 && n < visiveis.length;
		barra.executar.disabled = !n || !!lote;
		barra.desmarcar.disabled = !n || !!lote;
		barra.todos.disabled = !!lote;
		barra.parar.hidden = !lote;
		if (!lote) barra.parar.disabled = false;
	}

	function statusLote(texto) {
		if (barra) barra.status.textContent = texto || "";
	}

	function abrirLote(ancora) {
		if (painel && painel.ancora === ancora) {
			fecharPainel();
			return;
		}
		fecharPainel();
		const n = marcadas().length;
		if (!n) return;
		const titulo = "⭐ Em lote — " + n + " processo(s) marcado(s)";
		if (tela.seeu) montarPainelSeeu(ancora, titulo, true, executarLoteSeeu);
		else montarPainel(ancora, titulo, true, executarLote);
	}

	// Pergunta da etapa prévia, uma vez para o lote todo (só Projudi - ver a
	// REGRA no início do arquivo). Resolve com "sim", "nao" ou null.
	function perguntaLote(item, n) {
		const explicacao = "A resposta vale para os " + n + " processos marcados. Depois, " + (item.combo
			? "as etapas do combo abrem processo por processo, já preenchidas,"
			: "a preferência abre em cada processo, um de cada vez, já preenchida,") +
			" e cada uma só é executada quando você clicar em ✅ Sim, executar. Fechar o popup pula o processo.";
		const itemLote = Object.assign({}, item, { lote: n });
		if (tela.pergunta) {
			return perguntar(itemLote, tela.pergunta.replace("deste processo", "de cada processo marcado"), tela.sim, explicacao);
		}
		if (tela.verificaPendencias) {
			return perguntar(itemLote,
				"Nos processos marcados que tiverem juntadas pendentes ou conclusão pendente (linha \"Retorno de Conclusão\" do quadro Pendências), dispensar as juntadas e finalizar a conclusão antes de executar a preferência?",
				"Sim, dispensar/finalizar", explicacao);
		}
		return Promise.resolve("nao");
	}

	// Segurança das ações em lote: antes de começar, mostra a lista exata de
	// processos que serão afetados (limitada, para caber na janela).
	function listaProcessosParaConfirmar(cnjs) {
		const MAX = 25;
		const linhas = cnjs.slice(0, MAX).map(function (c, i) { return (i + 1) + ". " + (c || "(número não identificado)"); });
		if (cnjs.length > MAX) linhas.push("… e mais " + (cnjs.length - MAX) + " processo(s).");
		return linhas.join("\n");
	}

	function nomeDoItem(item) {
		if (item.combo) return "🔗 Combo \"" + item.combo.name + "\" (" + item.combo.steps.length + " etapas)";
		return "★ " + (item.pref && item.pref.name) + (item.label ? " — " + item.label : "");
	}

	// Percorre os processos marcados, um de cada vez. `rodarUm(ctx)` resolve
	// com true quando o processo foi executado (a caixinha é desmarcada).
	// Segurança: se `rodarUm` marcar `ctx.erro = true` (falha real, não um
	// popup fechado pelo usuário), o lote PARA ali, para que um problema de
	// leitura da tela (ex.: o Projudi mudou o layout) não se repita em todos
	// os processos seguintes.
	async function percorrerLote(alvos, rodarUm) {
		emAndamento = true;
		lote = { parar: false };
		atualizarBarra();
		const total = alvos.length;
		let feitos = 0;
		let falhas = 0;
		let erroEm = null;
		try {
			for (let i = 0; i < total; i++) {
				if (lote.parar) break;
				const a = alvos[i];
				if (!a.row.isConnected) {
					falhas++;
					continue;
				}
				statusLote("Processo " + (i + 1) + " de " + total + ": " + a.cnj + "…");
				a.row.classList.add("pdp-pl-lote-atual");
				try { a.row.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* segue */ }
				let ok = false;
				const ctx = dadosLinha(a.row, a.cnj);
				try {
					ok = await rodarUm(ctx);
				} catch (e) {
					console.error(TAG, e);
					ctx.erro = true;
				}
				a.row.classList.remove("pdp-pl-lote-atual");
				if (ok) {
					feitos++;
					a.caixa.checked = false;
				} else {
					falhas++;
				}
				atualizarBarra();
				if (!ok && ctx.erro) {
					erroEm = a.cnj || ("processo " + (i + 1));
					break;
				}
			}
		} finally {
			const parado = lote.parar;
			lote = null;
			emAndamento = false;
			atualizarBarra();
			const pulados = total - feitos - falhas;
			if (erroEm) {
				statusLote("⛔ Lote interrompido por erro em " + erroEm + ": " + feitos + " executado(s)" +
					(pulados ? " · " + pulados + " não iniciado(s) (continuam marcados)" : "") + ". Veja a mensagem na linha do processo.");
				alert("O lote foi interrompido porque houve um erro no processo " + erroEm + ".\n\n" +
					feitos + " processo(s) já tinham sido executados. Os demais não foram tocados e continuam marcados.\n\n" +
					"Confira o erro na linha do processo antes de executar de novo.");
			} else {
				statusLote((parado ? "⏹ Lote parado: " : "Lote concluído: ") + feitos + " executado(s)" +
				(falhas ? " · " + falhas + " não executado(s)" : "") +
				(pulados ? " · " + pulados + " não iniciado(s)" : "") +
				(falhas || pulados ? " (continuam marcados)" : ""));
			}
		}
	}

	async function executarLote(item) {
		if (item.decurso) {
			const dec = window.__pdpDecursoNaLinha;
			if (dec) await dec.executarLote(item.escolha);
			return;
		}
		if (emAndamento) {
			alert("Já há uma preferência ou combo sendo executado. Aguarde terminar.");
			return;
		}
		if (!api()) {
			alert("As ações rápidas não estão disponíveis nesta tela. Recarregue a página.");
			return;
		}
		const alvos = marcadas();
		if (!alvos.length) return;
		const resposta = await perguntaLote(item, alvos.length);
		if (!resposta) return;
		// Avisa da etapa prévia automática: nas telas de cumprimentos, só nos
		// processos que tiverem pendências; nas telas de análise, em todos
		// (dispensar juntadas, finalizar conclusão ou dispensar decursos).
		const previaTexto = resposta !== "sim" ? "" : tela.verificaPendencias
			? "\n\nAntes, em cada processo que tiver: dispensar juntadas pendentes e finalizar a conclusão (automático)."
			: "\n\nAntes, em cada processo: " + tela.sim.replace(/^Sim, /, "") + " (automático).";
		if (!confirm("Executar " + nomeDoItem(item) + " em " + alvos.length + " processo(s):\n\n" +
			listaProcessosParaConfirmar(alvos.map(function (a) { return a.cnj; })) + previaTexto +
			"\n\nSe ocorrer um erro, o lote para no processo com erro.")) return;
		await percorrerLote(alvos, function (ctx) { return rodar(ctx, item, resposta, true); });
	}

	// SEEU: sem pergunta sobre pendências (ver a REGRA no início do
	// arquivo) - só a confirmação de quantos processos recebem os
	// localizadores, já que ali nada é confirmado processo a processo.
	async function executarLoteSeeu(pref, nome) {
		if (emAndamento) {
			alert("Já há uma preferência sendo executada. Aguarde terminar.");
			return;
		}
		const alvos = marcadas();
		if (!alvos.length) return;
		if (!confirm("Associar \"★ " + nome + "\" aos " + alvos.length + " processo(s) marcado(s)?\n\nLocalizadores:\n" + pref.localizadores.join("\n") +
			"\n\nProcessos:\n" + listaProcessosParaConfirmar(alvos.map(function (a) { return a.cnj; })) +
			"\n\nSe ocorrer um erro, o lote para no processo com erro.")) return;
		await percorrerLote(alvos, function (ctx) { return rodarSeeu(ctx, pref, nome); });
	}

	function posicionar(box, ancora) {
		const r = ancora.getBoundingClientRect();
		const largura = box.offsetWidth;
		const altura = box.offsetHeight;
		let top = r.bottom + 4;
		if (top + altura > window.innerHeight - 8 && r.top - altura - 4 > 8) top = r.top - altura - 4;
		box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)) + "px";
		box.style.top = Math.max(8, top) + "px";
	}

	document.addEventListener("keydown", function (ev) {
		if (ev.key !== "Escape") return;
		if (dialogo) {
			const d = dialogo;
			fecharDialogo();
			d.cancelar();
		} else {
			fecharPainel();
		}
	});

	window.__pdpPreferenciasNaLinha = { abrir: abrir, marcador: marcador, atualizarLote: atualizarBarra };
})();
