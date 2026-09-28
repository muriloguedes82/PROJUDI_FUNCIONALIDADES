// "Minhas Preferências" na linha do processo - telas de Análise de
// Juntadas, Retorno de Conclusão e Análise de Decurso de Prazo.
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
// Preferências de "Juntar Documento" e do "Alvará Eletrônico" continuam só
// na tela do processo (dependem de arquivos/telas próprias).
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
		}
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
			if (url && /^\/projudi\/processo\.do$/.test(url.pathname) && url.search) return url.href;
		}
		return null;
	}

	// Carrega `url` num iframe oculto (navegação de verdade, como
	// fetchDoc em quickActions.js). A cada carga e periodicamente chama
	// `pronto(doc, decorrido)`: true = resolve com {doc, url}; uma string =
	// navega o iframe para essa URL; false = continua esperando.
	function carregar(url, pronto) {
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
					encerrar();
					resolve({ doc: doc, url: href });
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

	function mostrar(ctx, partes, tipo) {
		const s = statusDe(ctx);
		s.textContent = "";
		s.className = "pdp-pl-status" + (tipo ? " pdp-pl-" + tipo : "");
		s.appendChild(el("span", { text: partes.filter(Boolean).join(" · ") }));
		if (tipo === "ok" || tipo === "erro" || tipo === "aviso") {
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
					el("strong", { text: "★ " + item.pref.name + " — " + item.label }),
					el("button", { type: "button", class: "pdp-tl-x", title: "Cancelar", text: "✕", onclick: function () { responder(null); } })
				]),
				el("p", { text: tela.pergunta }),
				el("p", { class: "pdp-tl-vazio", text: "Respondendo Sim ou Não, a preferência é aberta em seguida, já preenchida, para você confirmar." }),
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
			if (!ctx.analisarUrl) return { ok: false, message: "Link \"Analisar\" da conclusão não encontrado." };
			if (!d.conclusao) return { ok: false, message: "Finalização de conclusão indisponível." };
			return d.conclusao(ctx.analisarUrl);
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

	async function executar(ctx, item) {
		if (emAndamento) {
			alert("Já há uma preferência sendo executada. Aguarde terminar.");
			return;
		}
		const qa = api();
		if (!qa) {
			alert("As ações rápidas não estão disponíveis nesta tela. Recarregue a página.");
			return;
		}
		const resposta = await perguntar(item);
		if (!resposta) return;

		emAndamento = true;
		const rotulo = "★ " + item.pref.name;
		let previa = null;
		let terminou = false;
		function finalizar(partes, tipo) {
			if (terminou) return;
			terminou = true;
			emAndamento = false;
			mostrar(ctx, [previa].concat(partes), tipo);
		}
		try {
			mostrar(ctx, ["Localizando o processo…"], "andamento");
			let proc = null;
			if (resposta === "sim") {
				// Juntadas/decursos: o link da pendência vem do quadro
				// Pendências da tela do processo. Conclusão: o link "Analisar"
				// da própria linha (antes de finalizar, guarda o endereço do
				// processo, que é lido nessa mesma tela de análise).
				if (tela.tipo === "conclusao") await urlDoProcesso(ctx);
				else proc = await carregarProcesso(ctx, true);
				mostrar(ctx, [tela.fazendo], "andamento");
				const r = await etapaPrevia(ctx, proc);
				previa = (r.ok ? "✅ " : "⚠ ") + (r.message || (r.ok ? "Feito." : "Não concluído."));
				// Sucesso: o card de status da dispensa sai; em caso de falha
				// ele fica (com "Ver detalhes"), e o fluxo segue mesmo assim.
				if (r.ok && r.dismiss) r.dismiss();
				mostrar(ctx, [previa, "Carregando o processo…"], "andamento");
			}
			// Sempre recarregada depois da etapa prévia: a ação parte da tela
			// do processo já sem a pendência.
			proc = await carregarProcesso(ctx, false);

			mostrar(ctx, [previa, "Abrindo \"" + item.label + "\"…"], "andamento");
			let enviado = false;
			qa.applyPreferenceFrom(item.label, item.pref, proc, {
				onSubmit: function () {
					enviado = true;
					mostrar(ctx, [previa, rotulo + ": enviando…"], "andamento");
				},
				onDone: function () {
					finalizar([rotulo + ": concluída"], "ok");
				},
				onClose: function () {
					if (enviado) finalizar([rotulo + ": enviada (confira no processo)"], "ok");
					else finalizar([rotulo + ": não executada (popup fechado)"], "aviso");
				},
				onFail: function (motivo) {
					finalizar([rotulo + ": " + motivo], "erro");
				}
			});
		} catch (e) {
			console.error(TAG, e);
			finalizar([rotulo + ": " + (e && e.message ? e.message : "falha ao carregar o processo")], "erro");
		}
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
		return null;
	}

	function abrir(ancora, row, cnj) {
		if (painel && painel.ancora === ancora) {
			fecharPainel();
			return;
		}
		fecharPainel();
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
		});
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
