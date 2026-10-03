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
		// Telas de cumprimentos: não há pendência a dispensar antes - sem
		// `pergunta`, a preferência é aberta direto. Demais Cumprimentos vale
		// para qualquer "Tipo de Cumprimento" (filtro da mesma tela).
		"/projudi/processo/expedirIntimacao.do": { tipo: "cumprimento" },
		"/projudi/processo/expedirCitacao.do": { tipo: "cumprimento" },
		"/projudi/processo/intimacaoNomeados.do": { tipo: "cumprimento" },
		"/projudi/processo/cumprimentoCartorio.do": { tipo: "cumprimento" },
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

	function perguntar(item) {
		return new Promise(function (resolve) {
			fecharDialogo();
			const responder = function (valor) {
				fecharDialogo();
				resolve(valor);
			};
			const caixa = el("div", { class: "pdp-tl-modal pdp-pl-pergunta", role: "dialog" }, [
				el("div", { class: "pdp-tl-pop-cab" }, [
					el("strong", { text: item.combo ? "🔗 Combo \"" + item.combo.name + "\" (" + item.combo.steps.length + " etapas)" : "★ " + item.pref.name + " — " + item.label }),
					el("button", { type: "button", class: "pdp-tl-x", title: "Cancelar", text: "✕", onclick: function () { responder(null); } })
				]),
				el("p", { text: tela.pergunta }),
				el("p", { class: "pdp-tl-vazio", text: item.combo
					? (item.novaAba
						? "Respondendo Sim ou Não, o processo é aberto numa nova aba e o combo começa lá (ele tem etapa que só roda na tela do processo)."
						: "Respondendo Sim ou Não, as etapas do combo abrem em seguida, uma a uma, já preenchidas, para você confirmar cada uma.")
					: "Respondendo Sim ou Não, a preferência é aberta em seguida, já preenchida, para você confirmar." }),
				el("div", { class: "pdp-pl-botoes" }, [
					el("button", { type: "button", class: "pdp-tl-btn pdp-pl-sim", text: "✅ " + tela.sim, onclick: function () { responder("sim"); } }),
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
			// Se o fetch() não trouxer o botão nativo, a tela de análise é
			// carregada de novo numa navegação de verdade (iframe oculto).
			return d.conclusao(ctx.analisarUrl, function (url) {
				return carregar(url, function (doc, decorrido) {
					return !!doc.querySelector("#movimentarProcessoForm #extraButton") || decorrido > 5000;
				}).then(function (r) { return r.doc; });
			});
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
		// Sem `pergunta` (telas de cumprimentos): segue direto, sem etapa prévia.
		const resposta = tela.pergunta ? await perguntar(item) : "nao";
		if (!resposta) return;
		emAndamento = true;
		let previa = null;
		try {
			previa = await fazerPrevia(ctx, resposta);
			if (item.combo) await executarCombo(ctx, item, previa);
			else {
				const r = await abrirPreferencia(ctx, item.label, item.pref, [previa]);
				mostrar(ctx, [previa, r.texto], r.ok ? "ok" : "aviso");
			}
		} catch (e) {
			console.error(TAG, e);
			mostrar(ctx, [previa, (e && e.message) || "falha ao carregar o processo"], "erro");
		} finally {
			emAndamento = false;
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
			return;
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
				return;
			}
			if (escolha === "proxima") i++;
		}
		mostrar(ctx, [previa, nome + ": concluído (" + combo.steps.length + " etapas)"], "ok");
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

	function abrir(ancora, row, cnj) {
		if (painel && painel.ancora === ancora) {
			fecharPainel();
			return;
		}
		fecharPainel();
		if (tela.seeu) {
			abrirSeeu(ancora, row, cnj);
			return;
		}
		const qa = api();
		const box = el("div", { class: "pdp-tl-popover pdp-pl-painel", id: "pdpPreferenciasLinha" });
		box.appendChild(el("div", { class: "pdp-tl-pop-cab" }, [
			el("strong", { text: "⭐ Minhas Preferências — " + cnj }),
			el("button", { type: "button", class: "pdp-tl-x", title: "Fechar", text: "✕", onclick: fecharPainel })
		]));
		const grade = el("div", { class: "pdp-qa-fav-grid" });
		box.appendChild(grade);
		document.body.appendChild(box);
		painel = { el: box, ancora: ancora };
		posicionar(box, ancora);
		setTimeout(function () { document.addEventListener("mousedown", foraDoPainel, true); }, 0);

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
					title: motivo || ("Executar \"" + item.label + "\" com esta preferência neste processo" + (item.pref.descricao ? "\n" + item.pref.descricao : ""))
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: item.label }),
					el("span", { class: "pdp-qa-fav-card-name", text: "★ " + item.pref.name })
				]);
				const ativar = function () {
					if (motivo) return;
					fecharPainel();
					executar(dadosLinha(row, cnj), item);
				};
				card.addEventListener("click", ativar);
				card.addEventListener("keydown", function (ev) {
					if (ev.key === "Enter" || ev.key === " ") {
						ev.preventDefault();
						ativar();
					}
				});
				grade.appendChild(card);
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
				const descricao = passos.map(function (p, i) {
					const pref = qa.findComboPref(dados[1], p);
					return (i + 1) + ". " + p.label + " — ★ " + (pref ? pref.name : p.prefName || "(preferência removida)");
				}).join("\n");
				const card = el("div", {
					class: "pdp-qa-fav-card pdp-pl-combo",
					tabindex: "0",
					role: "button",
					title: (novaAba ? "Tem etapa que só roda na tela do processo: o combo começa numa nova aba.\n" : "Executar as etapas neste processo, uma a uma:\n") + descricao
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: "Combo · " + passos.length + " etapas" + (novaAba ? " · nova aba" : "") }),
					el("span", { class: "pdp-qa-fav-card-name", text: "▶ " + combo.name })
				]);
				const ativar = function () {
					fecharPainel();
					executar(dadosLinha(row, cnj), { combo: combo, novaAba: novaAba });
				};
				card.addEventListener("click", ativar);
				card.addEventListener("keydown", function (ev) {
					if (ev.key === "Enter" || ev.key === " ") {
						ev.preventDefault();
						ativar();
					}
				});
				gradeCombos.appendChild(card);
			});
			posicionar(box, ancora);
		}).catch(function (e) {
			console.error(TAG, "falha ao listar preferências/combos:", e);
		});
	}

	// --- SEEU: preferências do 📍 Localizador --------------------------------------------

	function abrirSeeu(ancora, row, cnj) {
		const loc = window.__pdpLocalizador;
		const box = el("div", { class: "pdp-tl-popover pdp-pl-painel", id: "pdpPreferenciasLinha" });
		box.appendChild(el("div", { class: "pdp-tl-pop-cab" }, [
			el("strong", { text: "⭐ Minhas Preferências — " + cnj }),
			el("button", { type: "button", class: "pdp-tl-x", title: "Fechar", text: "✕", onclick: fecharPainel })
		]));
		const grade = el("div", { class: "pdp-qa-fav-grid" });
		box.appendChild(grade);
		document.body.appendChild(box);
		painel = { el: box, ancora: ancora };
		posicionar(box, ancora);
		setTimeout(function () { document.addEventListener("mousedown", foraDoPainel, true); }, 0);

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
			const ordem = {};
			prefs.forEach(function (p, i) { ordem[p.id] = i; });
			prefs.forEach(function (pref) {
				const nome = pref.nome || pref.localizadores.join(" • ");
				const card = el("div", {
					class: "pdp-qa-fav-card",
					tabindex: "0",
					role: "button",
					title: "Associar a este processo, em segundo plano:\n" + pref.localizadores.join("\n")
				}, [
					el("span", { class: "pdp-qa-fav-card-action", text: "📍 Localizador" }),
					el("span", { class: "pdp-qa-fav-card-name", text: "★ " + nome })
				]);
				const ativar = function () {
					fecharPainel();
					executarSeeu(dadosLinha(row, cnj), pref, nome);
				};
				card.addEventListener("click", ativar);
				card.addEventListener("keydown", function (ev) {
					if (ev.key === "Enter" || ev.key === " ") {
						ev.preventDefault();
						ativar();
					}
				});
				grade.appendChild(card);
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
		const loc = window.__pdpLocalizador;
		const rotulo = "★ " + nome;
		emAndamento = true;
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
		} catch (e) {
			console.error(TAG, e);
			mostrar(ctx, ["⚠ " + rotulo, (e && e.message) || "falha ao carregar o processo"], "erro");
		} finally {
			if (proc && proc.iframe) proc.iframe.remove();
			emAndamento = false;
		}
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

	window.__pdpPreferenciasNaLinha = { abrir: abrir };
})();
