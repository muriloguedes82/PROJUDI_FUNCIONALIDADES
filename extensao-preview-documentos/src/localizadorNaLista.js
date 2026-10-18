// SEEU - Localizador na lista (Análise de Juntadas e Retorno de Conclusão)
//
// Na coluna do número do processo de cada linha, mostra "📍" com os
// localizadores cadastrados no processo e um "✏️" que abre um painel para
// alterá-los: tirar (✖) um localizador do processo ou associar outro da
// lista de localizadores ativos da unidade (a mesma do "+" do cabeçalho do
// processo).
//
// A lista não traz os localizadores: a extensão carrega a tela de cada
// processo (link da linha, visualizacaoProcesso.do) num iframe oculto, um
// processo de cada vez, de cima para baixo, e lê os localizadores no
// cabeçalho (componente <seeu-localizador-processo-header>, ver
// localizadorSeeu.js, que faz a leitura, a associação e a remoção por
// window.__pdpLocalizador). O que foi lido fica guardado por alguns minutos
// na aba (sessionStorage), para não carregar tudo de novo ao trocar de
// página da lista; o "↻" lê de novo.
//
// Exclusivo do SEEU: o catálogo (src/funcionalidades.js, `sistemas`) não
// injeta este arquivo no Projudi, e o script ainda confere o endereço.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!/(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname)) return; // só SEEU
	if (!/^\/seeu\/processo\/(analisarJuntada|conclusao)\.do$/.test(location.pathname)) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	if (window.__pdpLocalizadorNaLista) return;

	const TAG = "[SEEU Localizador na lista]";
	const RE_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
	const CHAVE_CACHE = "pdpLocalizadorNaLista";
	const VALIDADE_MS = 10 * 60 * 1000;
	const TIMEOUT_CARGA_MS = 25000;

	const esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
	const normalizar = function (t) {
		return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	};

	function el(tag, attrs, filhos) {
		const n = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			const v = attrs[k];
			if (v == null || v === false) return;
			if (k === "text") n.textContent = v;
			else if (k === "class") n.className = v;
			else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
			else if (k === "value" || k === "disabled") n[k] = v;
			else n.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) { if (f) n.append(f); });
		return n;
	}

	function loc() {
		const l = window.__pdpLocalizador;
		return l && l.associadosEm ? l : null;
	}

	// ------------------------------------------------------------------
	// Localizadores lidos: { "<CNJ>": { estado, nomes, erro, ts } }
	// estado: "fila" | "lendo" | "ok" | "erro"
	// ------------------------------------------------------------------

	const lidos = {};
	try {
		const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CACHE) || "{}");
		Object.keys(salvo).forEach(function (cnj) {
			const d = salvo[cnj];
			if (d && Array.isArray(d.nomes) && Date.now() - d.ts < VALIDADE_MS) lidos[cnj] = { estado: "ok", nomes: d.nomes, ts: d.ts };
		});
	} catch (e) { /* sem sessionStorage: lê de novo */ }

	function guardar() {
		const salvo = {};
		Object.keys(lidos).forEach(function (cnj) {
			const d = lidos[cnj];
			if (d.estado === "ok" && Date.now() - d.ts < VALIDADE_MS) salvo[cnj] = { nomes: d.nomes, ts: d.ts };
		});
		try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(salvo)); } catch (e) { /* segue */ }
	}

	function definir(cnj, nomes) {
		lidos[cnj] = { estado: "ok", nomes: nomes.slice(), ts: Date.now() };
		guardar();
		renderizar();
	}

	function valido(cnj) {
		const d = lidos[cnj];
		if (!d) return false;
		if (d.estado === "ok") return Date.now() - d.ts < VALIDADE_MS;
		return true; // na fila, lendo ou com erro (o "↻" tenta de novo)
	}

	// ------------------------------------------------------------------
	// Linhas da lista
	// ------------------------------------------------------------------

	function tabelaResultados() {
		for (const t of document.querySelectorAll("table.resultTable")) {
			const th = t.querySelector("thead");
			if (th && /seq\.|sequencial|processo/i.test(th.textContent)) return t;
		}
		return null;
	}

	function linkProcesso(row) {
		for (const a of row.querySelectorAll("a[href]")) {
			try {
				const url = new URL(a.getAttribute("href"), location.href);
				if (url.origin === location.origin && url.pathname === "/seeu/visualizacaoProcesso.do" && url.search) return url.href;
			} catch (e) { /* link inválido */ }
		}
		return null;
	}

	// [{ row, cnj, celula, url }] - a célula é a do número do processo.
	function linhas() {
		const tabela = tabelaResultados();
		const tbody = tabela && tabela.tBodies[0];
		const resultado = [];
		if (!tbody) return resultado;
		for (const row of tbody.rows) {
			if (/^row\d+$/.test(row.id)) continue;
			let em = null;
			for (const e of row.querySelectorAll(":scope > td em")) {
				if (RE_CNJ.test(e.textContent) && e.textContent.trim().length <= 30) { em = e; break; }
			}
			if (!em) continue;
			resultado.push({ row: row, cnj: em.textContent.match(RE_CNJ)[0], celula: em.closest("td"), url: linkProcesso(row) });
		}
		return resultado;
	}

	// ------------------------------------------------------------------
	// Exibição na linha
	// ------------------------------------------------------------------

	function renderizarLinha(item) {
		let caixa = item.celula.querySelector(":scope > .pdp-locl");
		if (!caixa) {
			caixa = el("div", { class: "pdp-locl" });
			item.celula.append(caixa);
		}
		const d = lidos[item.cnj] || null;
		const assinatura = JSON.stringify([item.cnj, !!item.url, d && d.estado, d && d.nomes, d && d.erro]);
		if (caixa.dataset.assinatura === assinatura) return;
		caixa.dataset.assinatura = assinatura;
		caixa.textContent = "";
		caixa.append(el("span", { class: "pdp-locl-icone", text: "📍", title: "Localizadores do processo" }));

		if (!item.url) {
			caixa.append(el("span", { class: "pdp-locl-vazio", text: "sem link do processo na linha" }));
			return;
		}
		if (!d || d.estado === "fila" || d.estado === "lendo") {
			caixa.append(el("span", { class: "pdp-locl-vazio", text: d && d.estado === "lendo" ? "lendo…" : "aguardando…" }));
		} else if (d.estado === "erro") {
			caixa.append(el("span", { class: "pdp-locl-erro", title: d.erro || "", text: "⚠ não foi possível ler" }));
		} else if (!d.nomes.length) {
			caixa.append(el("span", { class: "pdp-locl-vazio", text: "sem localizador" }));
		} else {
			d.nomes.forEach(function (n) { caixa.append(el("span", { class: "pdp-locl-item", text: n })); });
		}
		const editar = el("button", {
			type: "button", class: "pdp-locl-bt pdp-locl-editar",
			title: "Alterar os localizadores deste processo", text: "✏️",
			onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); abrirEditor(item.cnj, item.url, editar); }
		});
		caixa.append(editar);
		if (d && (d.estado === "ok" || d.estado === "erro")) {
			caixa.append(el("button", {
				type: "button", class: "pdp-locl-bt", title: "Ler de novo os localizadores deste processo", text: "↻",
				onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); delete lidos[item.cnj]; renderizar(); }
			}));
		}
	}

	let agendado = false;
	const observador = new MutationObserver(function () {
		if (agendado) return;
		agendado = true;
		setTimeout(function () { agendado = false; renderizar(); }, 200);
	});
	function observar() {
		observador.observe(document.body || document.documentElement, { childList: true, subtree: true });
	}

	function renderizar() {
		observador.disconnect();
		try {
			linhas().forEach(function (item) {
				if (item.url && !valido(item.cnj)) lidos[item.cnj] = { estado: "fila" };
				renderizarLinha(item);
				// O ✏️ é refeito quando a linha muda: o painel aberto passa a
				// se posicionar pelo novo.
				const bt = item.celula.querySelector(":scope > .pdp-locl .pdp-locl-editar");
				if (!bt) return;
				const ativo = !!editor && editor.cnj === item.cnj;
				bt.classList.toggle("ativo", ativo);
				if (ativo) editor.ancora = bt;
			});
		} finally {
			observar();
		}
		processarFila();
	}

	// ------------------------------------------------------------------
	// Leitura em segundo plano (um processo de cada vez)
	// ------------------------------------------------------------------

	// Carrega `url` num iframe oculto e resolve com { doc, iframe } quando
	// `pronto(doc, decorrido)` devolver true. Quem chamou remove o iframe.
	function carregar(url, pronto) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "localizador-na-lista");
			iframe.setAttribute("aria-hidden", "true");
			iframe.tabIndex = -1;
			iframe.style.cssText = "position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;";
			const inicio = Date.now();
			const timer = setInterval(verificar, 250);
			function falhar(e) {
				clearInterval(timer);
				iframe.remove();
				reject(e);
			}
			function verificar() {
				if (Date.now() - inicio > TIMEOUT_CARGA_MS) { falhar(new Error("o processo demorou demais para carregar")); return; }
				let doc;
				try { doc = iframe.contentDocument; } catch (e) { falhar(e); return; }
				if (!doc || doc.URL === "about:blank" || doc.readyState === "loading") return;
				let ok;
				try { ok = pronto(doc, Date.now() - inicio); } catch (e) { falhar(e); return; }
				if (ok) { clearInterval(timer); resolve({ doc: doc, iframe: iframe }); }
			}
			iframe.src = url;
			document.body.append(iframe);
		});
	}

	// Tela do processo com o cabeçalho de localizadores (e o "+", quando o
	// perfil pode associar).
	function prontoProcesso(doc, decorrido) {
		const l = loc();
		let path = "";
		try { path = new URL(doc.URL).pathname; } catch (e) { /* segue */ }
		if (path !== "/seeu/visualizacaoProcesso.do") {
			if (decorrido > 8000 && doc.readyState === "complete") throw new Error("a tela do processo não abriu (sessão expirada?)");
			return false;
		}
		if (l.podeAssociar(doc)) return true;
		return l.temCabecalho(doc) && decorrido > 5000;
	}

	// O cabeçalho busca os localizadores depois de montar: espera a lista
	// lida ficar igual em duas leituras seguidas.
	async function lerAssociados(doc) {
		const l = loc();
		await esperar(1000);
		let antes = JSON.stringify(l.associadosEm(doc));
		for (let i = 0; i < 8; i++) {
			await esperar(500);
			const agora = JSON.stringify(l.associadosEm(doc));
			if (agora === antes) break;
			antes = agora;
		}
		return l.associadosEm(doc);
	}

	let rodando = false;
	let pausado = false;

	async function processarFila() {
		if (rodando || pausado || !loc()) return;
		rodando = true;
		try {
			for (;;) {
				if (pausado) break;
				const item = linhas().find(function (i) { return i.url && lidos[i.cnj] && lidos[i.cnj].estado === "fila"; });
				if (!item) break;
				lidos[item.cnj] = { estado: "lendo" };
				renderizar();
				let proc = null;
				try {
					proc = await carregar(item.url, prontoProcesso);
					definir(item.cnj, await lerAssociados(proc.doc));
				} catch (e) {
					console.warn(TAG, item.cnj, e);
					lidos[item.cnj] = { estado: "erro", erro: (e && e.message) || "falha ao ler" };
					renderizar();
				} finally {
					if (proc) proc.iframe.remove();
				}
			}
		} finally {
			rodando = false;
		}
	}

	// ------------------------------------------------------------------
	// Painel "Alterar localizadores" de um processo
	// ------------------------------------------------------------------

	// { cnj, url, ancora, painel, proc, associados, ativos, podeAssociar,
	//   filtro, ocupado, status:{texto,tipo}, carregando }
	let editor = null;

	async function abrirEditor(cnj, url, ancora) {
		if (editor && editor.cnj === cnj) { fecharEditor(); return; }
		fecharEditor();
		const l = loc();
		if (!l || !l.removerEm) {
			alert("Ative \"Localizador (SEEU)\" no Menu da extensão (ícone da balança) e recarregue a página.");
			return;
		}
		const e = { cnj: cnj, url: url, ancora: ancora, painel: null, proc: null, associados: [], ativos: [], podeAssociar: false, filtro: "", ocupado: true, carregando: true, status: { texto: "Abrindo o processo em segundo plano…", tipo: "info" } };
		editor = e;
		e.painel = el("div", { class: "pdp-locl-painel", role: "dialog", "aria-label": "Alterar localizadores de " + cnj });
		e.painel.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
		document.body.append(e.painel);
		desenharEditor();
		renderizar();
		setTimeout(function () { document.addEventListener("mousedown", foraDoEditor, true); }, 0);

		// A leitura da fila para enquanto o painel está aberto: um processo
		// carregado de cada vez.
		pausado = true;
		while (rodando) await esperar(200);
		if (editor !== e) return;
		try {
			e.proc = await carregar(url, prontoProcesso);
			if (editor !== e) { e.proc.iframe.remove(); return; }
			e.associados = await lerAssociados(e.proc.doc);
			definir(cnj, e.associados);
			e.podeAssociar = l.podeAssociar(e.proc.doc);
			if (e.podeAssociar) {
				e.ativos = await l.ativosEm(e.proc.doc);
				e.status = null;
			} else {
				e.status = { texto: "O \"+\" de localizadores não está disponível neste processo (perfil sem permissão para associar?).", tipo: "erro" };
			}
		} catch (err) {
			console.warn(TAG, err);
			e.status = { texto: (err && err.message) || "Falha ao abrir o processo.", tipo: "erro" };
		}
		if (editor !== e) { if (e.proc) e.proc.iframe.remove(); return; }
		e.carregando = false;
		e.ocupado = false;
		desenharEditor();
	}

	function diagnostico(e) {
		try { return loc().diagnosticoEm(e.proc.doc); } catch (err) { return String(err && err.message); }
	}

	function fecharEditor() {
		if (!editor) return;
		if (editor.ocupado && !editor.carregando) return; // no meio de uma associação/remoção
		const e = editor;
		editor = null;
		if (e.proc) e.proc.iframe.remove();
		e.painel.remove();
		document.removeEventListener("mousedown", foraDoEditor, true);
		pausado = false;
		renderizar();
	}

	function foraDoEditor(ev) {
		if (!editor) return;
		const caminho = ev.composedPath ? ev.composedPath() : [];
		if (caminho.indexOf(editor.painel) >= 0 || caminho.indexOf(editor.ancora) >= 0) return;
		fecharEditor();
	}

	document.addEventListener("keydown", function (ev) {
		if (ev.key === "Escape" && editor) fecharEditor();
	}, true);

	function posicionarEditor() {
		const e = editor;
		if (!e || !e.ancora.isConnected) return;
		const r = e.ancora.getBoundingClientRect();
		const largura = e.painel.offsetWidth || 340;
		let esquerda = Math.min(r.left, window.innerWidth - largura - 8);
		e.painel.style.left = Math.max(8, esquerda) + "px";
		const abaixo = window.innerHeight - r.bottom - 12;
		const acima = r.top - 12;
		if (abaixo >= Math.min(e.painel.scrollHeight, 360) || abaixo >= acima) {
			e.painel.style.top = (r.bottom + 4) + "px";
			e.painel.style.bottom = "";
			e.painel.style.maxHeight = Math.max(160, abaixo) + "px";
		} else {
			e.painel.style.top = "";
			e.painel.style.bottom = (window.innerHeight - r.top + 4) + "px";
			e.painel.style.maxHeight = Math.max(160, acima) + "px";
		}
	}
	window.addEventListener("resize", posicionarEditor);
	window.addEventListener("scroll", posicionarEditor, true);

	function desenharEditor() {
		const e = editor;
		if (!e) return;
		const focoNoFiltro = document.activeElement && document.activeElement.classList.contains("pdp-locl-filtro");
		e.painel.textContent = "";
		e.painel.append(el("div", { class: "pdp-locl-cab" }, [
			el("strong", { text: "📍 Localizadores — " + e.cnj }),
			el("button", { type: "button", class: "pdp-locl-x", title: "Fechar", text: "✕", disabled: e.ocupado && !e.carregando, onclick: fecharEditor })
		]));
		if (e.status) e.painel.append(el("div", { class: "pdp-locl-status " + e.status.tipo, role: "status", text: e.status.texto }));
		// Remoção que não funcionou: a estrutura do cabeçalho do SEEU, para
		// o usuário copiar e informar.
		if (e.status && e.status.diagnostico) {
			const texto = e.status.diagnostico;
			const bt = el("button", {
				type: "button", class: "pdp-locl-bt pdp-locl-diag", text: "📋 Copiar diagnóstico",
				title: "Copia a estrutura dos localizadores desta tela do SEEU, para enviar a quem mantém a extensão",
				onclick: function () {
					const ok = function () { bt.textContent = "✅ Diagnóstico copiado"; };
					navigator.clipboard.writeText(texto).then(ok).catch(function () {
						const area = el("textarea", { class: "pdp-locl-filtro", rows: "6" });
						area.value = texto;
						bt.replaceWith(area);
						area.select();
					});
				}
			});
			e.painel.append(bt);
		}
		if (e.carregando) { posicionarEditor(); return; }

		e.painel.append(el("div", { class: "pdp-locl-sec", text: "No processo" }));
		const noProcesso = el("div", { class: "pdp-locl-lista" });
		if (!e.associados.length) noProcesso.append(el("div", { class: "pdp-locl-vazio", text: "Nenhum localizador." }));
		e.associados.forEach(function (n) {
			noProcesso.append(el("div", { class: "pdp-locl-linha" }, [
				el("span", { class: "pdp-locl-item", text: n }),
				el("button", {
					type: "button", class: "pdp-locl-bt", title: "Tirar \"" + n + "\" do processo", text: "✖", disabled: e.ocupado,
					onclick: function () { alterar("remover", n); }
				})
			]));
		});
		e.painel.append(noProcesso);

		if (e.podeAssociar) {
			e.painel.append(el("div", { class: "pdp-locl-sec", text: "Associar" }));
			const filtro = el("input", {
				type: "search", class: "pdp-locl-filtro", placeholder: "Pesquisar localizador...", value: e.filtro,
				oninput: function () { e.filtro = filtro.value; desenharOpcoes(); }
			});
			e.painel.append(filtro);
			const opcoes = el("div", { class: "pdp-locl-lista pdp-locl-opcoes" });
			e.painel.append(opcoes);
			const desenharOpcoes = function () {
				opcoes.textContent = "";
				const ja = new Set(e.associados.map(normalizar));
				const f = normalizar(e.filtro);
				const lista = e.ativos.filter(function (n) { return !ja.has(normalizar(n)) && (!f || normalizar(n).indexOf(f) >= 0); });
				if (!lista.length) opcoes.append(el("div", { class: "pdp-locl-vazio", text: e.ativos.length ? "Nenhum localizador encontrado." : "A lista do \"+\" veio vazia." }));
				lista.forEach(function (n) {
					opcoes.append(el("button", {
						type: "button", class: "pdp-locl-opcao", title: "Associar \"" + n + "\" ao processo", text: "➕ " + n, disabled: e.ocupado,
						onclick: function () { alterar("associar", n); }
					}));
				});
			};
			desenharOpcoes();
			if (focoNoFiltro || !e.status) setTimeout(function () { if (filtro.isConnected) filtro.focus(); }, 0);
		}
		posicionarEditor();
	}

	async function alterar(acao, nome) {
		const e = editor;
		if (!e || e.ocupado || !e.proc) return;
		if (acao === "remover" && !confirm("Tirar o localizador \"" + nome + "\" do processo " + e.cnj + "?")) return;
		const l = loc();
		e.ocupado = true;
		e.status = { texto: (acao === "remover" ? "Tirando \"" : "Associando \"") + nome + "\"…", tipo: "info" };
		desenharEditor();
		try {
			const r = acao === "remover" ? await l.removerEm(e.proc.doc, nome) : await l.associarUmEm(e.proc.doc, nome);
			await esperar(400);
			e.associados = l.associadosEm(e.proc.doc);
			definir(e.cnj, e.associados);
			const textos = acao === "remover"
				? { ok: "\"" + nome + "\" tirado do processo.", ja: "\"" + nome + "\" já não estava no processo.", incerto: "Clicado o \"×\" de \"" + nome + "\", mas não deu para confirmar. Use o ↻ para conferir." }
				: { ok: "\"" + nome + "\" associado ao processo.", ja: "\"" + nome + "\" já estava no processo.", ausente: "\"" + nome + "\" não está na lista de localizadores ativos desta unidade.", incerto: "Escolhido \"" + nome + "\" na lista, mas não deu para confirmar. Use o ↻ para conferir." };
			e.status = { texto: textos[r] || r, tipo: r === "ok" || r === "ja" ? "ok" : r === "ausente" ? "erro" : "info" };
			if (acao === "remover" && r === "incerto") e.status.diagnostico = diagnostico(e);
		} catch (err) {
			console.warn(TAG, err);
			e.status = { texto: (err && err.message) || "Falha ao alterar.", tipo: "erro" };
			if (acao === "remover") e.status.diagnostico = diagnostico(e);
		}
		e.ocupado = false;
		if (editor === e) desenharEditor();
	}

	// ------------------------------------------------------------------
	// Início
	// ------------------------------------------------------------------

	// Para preferenciasNaLinha.js: depois de associar localizadores pela ⭐,
	// a linha mostra os que ficaram no processo (ou lê de novo).
	window.__pdpLocalizadorNaLista = {
		atualizar: function (cnj, nomes) {
			if (Array.isArray(nomes)) definir(cnj, nomes);
			else { delete lidos[cnj]; renderizar(); }
		}
	};

	renderizar();
})();
