// SEEU - Botão "📍 Localizador" com preferências de localizadores
//
// No cabeçalho do processo do SEEU (visualizacaoProcesso.do), à direita,
// ficam os localizadores do processo e o "+" que abre a lista "Associar
// localizador ao processo" com os localizadores ativos da unidade. Este
// recurso põe ao lado do "+" um botão "📍 Localizador" que abre um painel
// com as preferências do usuário: cada preferência tem um ou mais
// localizadores e, com um clique, a extensão os associa ao processo,
// usando a própria lista do "+" (como se o usuário escolhesse cada item).
//
// Exclusivo do SEEU: o catálogo (src/funcionalidades.js, `sistemas`) não
// injeta este arquivo no Projudi, e o script ainda confere o endereço.
//
// Estrutura real confirmada a partir de um .mhtml salvo do SEEU:
// - <h3> ... <span id="span-localizadore" style="flex-grow: 1">
//     <seeu-localizador-processo-header can-link-to-process=""
//       processo-numero="00000455820208160009" id="processoHeader">
//   componente Lit com shadow DOM aberto. Dentro do shadow root:
//   <div class="flex flex-row ... justify-end"> (localizadores já
//   associados) <span aria-haspopup="true" aria-expanded="false">
//   <seeu-icon name="mdi:plus" class="plus-icon"> </span>
//   <seeu-dropdown> ... <seeu-menu> <seeu-menu-label>Associar localizador
//   ao processo</seeu-menu-label> <seeu-menu-item close-on-click=""
//   role="menuitem"><span data-text-content="">ABERTO </span>
//   </seeu-menu-item> ... </seeu-menu> </seeu-dropdown>
// - o texto do item fica num <span data-text-content> do light DOM do
//   <seeu-menu-item>, encaixado num <slot> do shadow dele; clicar nesse
//   <span> faz o clique passar pelo conteúdo interno do item (o caminho do
//   evento sobe pelo slot), que é onde o componente escuta.
//
// As preferências ficam em chrome.storage.local (chave
// "pdpLocalizadorPreferencias", que entra no backup do Menu):
//   [{ id, nome, localizadores: ["NOME DO LOCALIZADOR", ...] }]
// Os nomes são comparados sem acento, sem diferença de maiúsculas e com os
// espaços colapsados - a lista do SEEU mistura "ABERTO" e "Aguardando
// Audiência - Pendente de Cumprimento".
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!/(^|\.)seeu\.pje\.jus\.br$/i.test(location.hostname)) return; // só SEEU
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpLocalizadorSeeu) return;
	window.__pdpLocalizadorSeeu = true;

	const TAG = "[SEEU Localizador]";
	const CHAVE = "pdpLocalizadorPreferencias";
	const ATTR_BOTAO = "data-pdp-localizador-botao";
	const SEL_HEADER = "seeu-localizador-processo-header";

	const normalizar = function (t) {
		return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	};
	const limpar = function (t) { return String(t || "").replace(/\s+/g, " ").trim(); };
	const esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

	function el(tag, attrs, filhos) {
		const n = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			const v = attrs[k];
			if (v == null || v === false) return;
			if (k === "text") n.textContent = v;
			else if (k === "class") n.className = v;
			else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
			else if (k === "checked" || k === "value" || k === "disabled") n[k] = v;
			else n.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) { if (f) n.append(f); });
		return n;
	}

	// ------------------------------------------------------------------
	// Preferências
	// ------------------------------------------------------------------

	let preferencias = [];

	function lerPreferencias() {
		return chrome.storage.local.get(CHAVE).then(function (d) {
			const lista = d[CHAVE];
			preferencias = Array.isArray(lista) ? lista.filter(function (p) {
				return p && Array.isArray(p.localizadores) && p.localizadores.length;
			}) : [];
			return preferencias;
		});
	}

	function gravarPreferencias() {
		return chrome.storage.local.set({ [CHAVE]: preferencias });
	}

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "local" || !changes[CHAVE]) return;
		lerPreferencias().then(function () { if (painel && modo === "lista") render(); });
	});

	// ------------------------------------------------------------------
	// Componente nativo do SEEU (shadow DOM)
	// ------------------------------------------------------------------

	function header() {
		return document.querySelector(SEL_HEADER);
	}

	function raiz() {
		const h = header();
		return h && h.shadowRoot;
	}

	// "+" que abre a lista "Associar localizador ao processo". Sem a
	// permissão de associar, o SEEU não o mostra.
	function gatilho() {
		const r = raiz();
		if (!r) return null;
		const icone = r.querySelector("seeu-icon.plus-icon, seeu-icon[name='mdi:plus']");
		if (!icone) return null;
		return icone.closest("[aria-haspopup]") || icone;
	}

	function itensMenu() {
		const r = raiz();
		if (!r) return [];
		return Array.from(r.querySelectorAll("seeu-menu-item")).filter(function (item) {
			return item.getAttribute("aria-disabled") !== "true" && limpar(textoItem(item));
		});
	}

	function textoItem(item) {
		const span = item.querySelector("[data-text-content]");
		return (span || item).textContent;
	}

	function menuAberto() {
		const g = gatilho();
		return !!(g && g.getAttribute("aria-expanded") === "true");
	}

	async function aguardar(teste, limiteMs) {
		const fim = Date.now() + (limiteMs || 5000);
		while (Date.now() < fim) {
			const v = teste();
			if (v) return v;
			await esperar(150);
		}
		return teste();
	}

	async function abrirMenu() {
		const g = gatilho();
		if (!g) throw new Error("O \"+\" de localizadores não está disponível neste processo (sem permissão para associar?).");
		if (!menuAberto()) g.click();
		const itens = await aguardar(function () { const l = itensMenu(); return l.length ? l : null; }, 6000);
		if (!itens) throw new Error("A lista de localizadores do SEEU não abriu.");
		return itens;
	}

	async function fecharMenu() {
		if (!menuAberto()) return;
		const g = gatilho();
		if (g) g.click();
		await esperar(200);
		if (menuAberto()) document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
	}

	// Textos (normalizados) de cada elemento do cabeçalho fora da lista do
	// "+", incluindo os shadow roots internos. Um localizador já associado
	// aparece como um elemento cujo texto é exatamente o nome dele (com
	// eventual "×" de remover). Comparar elemento a elemento evita confundir
	// "Aguardando Audiência" com "Aguardando Audiência - Já Cumprida".
	function textosAssociados() {
		const textos = new Set();
		const ignorar = /^(seeu-dropdown|seeu-tooltip|style|script|template)$/i;
		const profundo = function (n) {
			if (n.nodeType === 3) return n.nodeValue;
			if (n.nodeType !== 1 && n.nodeType !== 11) return "";
			if (n.nodeType === 1 && ignorar.test(n.tagName)) return "";
			let t = "";
			if (n.nodeType === 1 && n.shadowRoot) t += " " + profundo(n.shadowRoot);
			n.childNodes.forEach(function (f) { t += " " + profundo(f); });
			if (n.nodeType === 1) {
				const k = normalizar(t).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
				if (k) textos.add(k);
			}
			return t;
		};
		const r = raiz();
		if (r) profundo(r);
		return textos;
	}

	function jaAssociado(nome) {
		const alvo = normalizar(nome).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
		return !!alvo && textosAssociados().has(alvo);
	}

	async function lerLocalizadoresAtivos() {
		const jaAberto = menuAberto();
		let itens = itensMenu();
		if (!itens.length) itens = await abrirMenu();
		const nomes = [];
		const vistos = new Set();
		itens.forEach(function (item) {
			const nome = limpar(textoItem(item));
			const chave = normalizar(nome);
			if (!vistos.has(chave)) { vistos.add(chave); nomes.push(nome); }
		});
		if (!jaAberto) await fecharMenu();
		return nomes;
	}

	async function associar(nome) {
		if (jaAssociado(nome)) return "ja";
		const itens = await abrirMenu();
		const alvo = normalizar(nome);
		const item = itens.find(function (i) { return normalizar(textoItem(i)) === alvo; });
		if (!item) { await fecharMenu(); return "ausente"; }
		const span = item.querySelector("[data-text-content]") || item;
		span.click();
		const ok = await aguardar(function () { return jaAssociado(nome); }, 8000);
		await fecharMenu();
		return ok ? "ok" : "incerto";
	}

	// ------------------------------------------------------------------
	// Botão e painel
	// ------------------------------------------------------------------

	let botao = null;
	let painel = null;
	let modo = "lista"; // "lista" | "editar"
	let edicao = null; // { id, nome, selecionados:Set, disponiveis:[], filtro, carregando, erro }
	let status = null; // { texto, tipo }
	let ocupado = false;

	function inserirBotao() {
		const h = header();
		if (!h || !h.isConnected) return;
		if (botao && botao.isConnected) return;
		botao = el("button", {
			type: "button", class: "pdp-loc-botao", [ATTR_BOTAO]: true,
			title: "Preferências de localizadores: associe ao processo com um clique",
			onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); alternarPainel(); }
		}, [el("span", { text: "📍 Localizador" }), el("span", { class: "pdp-loc-seta", text: "▾" })]);
		// O <span id="span-localizadore"> ocupa a sobra da linha do <h3> e
		// alinha o "+" à direita: o botão entra logo depois dele.
		const caixa = h.closest("#span-localizadore") || h;
		caixa.after(botao);
	}

	function alternarPainel() {
		if (painel) { fecharPainel(); return; }
		modo = "lista";
		status = null;
		painel = el("div", { class: "pdp-loc-painel", role: "dialog", "aria-label": "Preferências de localizadores" });
		document.body.append(painel);
		lerPreferencias().then(render);
		render();
		setTimeout(function () {
			document.addEventListener("mousedown", foraDoPainel, true);
			document.addEventListener("keydown", teclaPainel, true);
			window.addEventListener("resize", posicionar);
			window.addEventListener("scroll", posicionar, true);
		}, 0);
	}

	function fecharPainel() {
		if (!painel) return;
		painel.remove();
		painel = null;
		edicao = null;
		document.removeEventListener("mousedown", foraDoPainel, true);
		document.removeEventListener("keydown", teclaPainel, true);
		window.removeEventListener("resize", posicionar);
		window.removeEventListener("scroll", posicionar, true);
	}

	function foraDoPainel(ev) {
		if (ocupado) return;
		const caminho = ev.composedPath ? ev.composedPath() : [];
		if (caminho.indexOf(painel) >= 0 || caminho.indexOf(botao) >= 0) return;
		fecharPainel();
	}

	function teclaPainel(ev) {
		if (ev.key === "Escape" && !ocupado) fecharPainel();
	}

	function posicionar() {
		if (!painel || !botao) return;
		const r = botao.getBoundingClientRect();
		const largura = painel.offsetWidth || 320;
		let esquerda = r.right - largura;
		if (esquerda < 8) esquerda = 8;
		if (esquerda + largura > window.innerWidth - 8) esquerda = Math.max(8, window.innerWidth - 8 - largura);
		painel.style.left = esquerda + "px";
		painel.style.top = (r.bottom + 4) + "px";
		painel.style.maxHeight = Math.max(200, window.innerHeight - r.bottom - 16) + "px";
	}

	function avisar(texto, tipo) {
		status = texto ? { texto: texto, tipo: tipo || "info" } : null;
		render();
	}

	function render() {
		if (!painel) return;
		painel.textContent = "";
		painel.append(modo === "editar" ? construirEditor() : construirLista());
		if (status) painel.append(el("div", { class: "pdp-loc-status " + status.tipo, role: "status", text: status.texto }));
		posicionar();
	}

	function construirLista() {
		const caixa = el("div", { class: "pdp-loc-corpo" }, [
			el("div", { class: "pdp-loc-titulo", text: "Minhas preferências de localizadores" })
		]);
		if (!preferencias.length) {
			caixa.append(el("div", { class: "pdp-loc-vazio", text: "Nenhuma preferência ainda. Crie uma com os localizadores que você mais usa: depois, um clique associa todos ao processo." }));
		}
		const lista = el("div", { class: "pdp-loc-prefs" });
		preferencias.forEach(function (p, i) {
			const nomes = p.localizadores.join(" • ");
			lista.append(el("div", { class: "pdp-loc-pref" }, [
				el("button", {
					type: "button", class: "pdp-loc-aplicar", disabled: ocupado,
					title: "Associar ao processo: " + nomes,
					onclick: function () { aplicar(p); }
				}, [
					el("span", { class: "pdp-loc-nome", text: p.nome || nomes }),
					p.nome ? el("span", { class: "pdp-loc-itens", text: nomes }) : null
				]),
				el("button", { type: "button", class: "pdp-loc-icone", title: "Subir", disabled: ocupado || i === 0, text: "↑", onclick: function () { mover(i, -1); } }),
				el("button", { type: "button", class: "pdp-loc-icone", title: "Editar", disabled: ocupado, text: "✏️", onclick: function () { editar(p); } }),
				el("button", { type: "button", class: "pdp-loc-icone", title: "Excluir", disabled: ocupado, text: "🗑", onclick: function () { excluir(p); } })
			]));
		});
		caixa.append(lista);
		caixa.append(el("div", { class: "pdp-loc-acoes" }, [
			el("button", { type: "button", class: "pdp-loc-bt primario", disabled: ocupado, text: "➕ Nova preferência", onclick: function () { editar(null); } })
		]));
		return caixa;
	}

	function construirEditor() {
		const e = edicao;
		const caixa = el("div", { class: "pdp-loc-corpo" }, [
			el("div", { class: "pdp-loc-titulo", text: e.id ? "Editar preferência" : "Nova preferência" })
		]);
		const nome = el("input", {
			type: "text", class: "pdp-loc-campo", placeholder: "Nome (opcional)", value: e.nome,
			oninput: function () { e.nome = nome.value; }
		});
		caixa.append(el("label", { class: "pdp-loc-rotulo", text: "Nome da preferência" }), nome);
		const qtd = el("div", { class: "pdp-loc-rotulo" });
		caixa.append(qtd);

		const filtro = el("input", {
			type: "search", class: "pdp-loc-campo", placeholder: "Pesquisar localizador...", value: e.filtro,
			oninput: function () { e.filtro = filtro.value; desenharOpcoes(); }
		});
		caixa.append(filtro);
		const opcoes = el("div", { class: "pdp-loc-opcoes" });
		caixa.append(opcoes);

		function desenharOpcoes() {
			opcoes.textContent = "";
			if (e.carregando) { opcoes.append(el("div", { class: "pdp-loc-vazio", text: "Lendo os localizadores ativos da unidade..." })); return; }
			if (e.erro) opcoes.append(el("div", { class: "pdp-loc-vazio", text: e.erro }));
			// Os já gravados que não estão na lista da unidade continuam
			// visíveis, para poderem ser desmarcados.
			const vistos = new Set(e.disponiveis.map(normalizar));
			const todos = e.disponiveis.concat(Array.from(e.selecionados.values()).filter(function (n) { return !vistos.has(normalizar(n)); }));
			const f = normalizar(e.filtro);
			todos.filter(function (n) { return !f || normalizar(n).indexOf(f) >= 0; }).forEach(function (n) {
				const chave = normalizar(n);
				const fora = !vistos.has(chave);
				const cb = el("input", {
					type: "checkbox", checked: e.selecionados.has(chave),
					onchange: function () {
						if (cb.checked) e.selecionados.set(chave, n); else e.selecionados.delete(chave);
						atualizarContagem();
					}
				});
				opcoes.append(el("label", { class: "pdp-loc-opcao" + (fora ? " fora" : "") }, [
					cb, el("span", { text: n + (fora ? " (não está na lista desta unidade)" : "") })
				]));
			});
		}
		const salvar = el("button", { type: "button", class: "pdp-loc-bt primario", text: "Salvar", onclick: salvarEdicao });
		function atualizarContagem() {
			const n = e.selecionados.size;
			qtd.textContent = "Localizadores (" + n + " marcado" + (n === 1 ? "" : "s") + ")";
			salvar.disabled = !n;
		}
		atualizarContagem();
		desenharOpcoes();

		caixa.append(el("div", { class: "pdp-loc-acoes" }, [
			el("button", { type: "button", class: "pdp-loc-bt", text: "Cancelar", onclick: function () { modo = "lista"; edicao = null; avisar(null); } }),
			salvar
		]));
		setTimeout(function () { if (document.activeElement !== nome && document.activeElement !== filtro) filtro.focus(); }, 0);
		return caixa;
	}

	function editar(pref) {
		const selecionados = new Map();
		(pref ? pref.localizadores : []).forEach(function (n) { selecionados.set(normalizar(n), n); });
		edicao = { id: pref ? pref.id : null, nome: pref ? (pref.nome || "") : "", selecionados: selecionados, disponiveis: [], filtro: "", carregando: true, erro: null };
		modo = "editar";
		status = null;
		render();
		ocupado = true;
		lerLocalizadoresAtivos().then(function (nomes) {
			if (!edicao) return;
			edicao.disponiveis = nomes;
			if (!nomes.length) edicao.erro = "A lista do \"+\" veio vazia.";
		}).catch(function (err) {
			console.warn(TAG, err);
			if (edicao) edicao.erro = err.message;
		}).finally(function () {
			ocupado = false;
			if (edicao) { edicao.carregando = false; render(); }
		});
	}

	function salvarEdicao() {
		const e = edicao;
		const item = {
			id: e.id || ("loc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
			nome: limpar(e.nome),
			localizadores: Array.from(e.selecionados.values())
		};
		const i = preferencias.findIndex(function (p) { return p.id === item.id; });
		if (i >= 0) preferencias[i] = item; else preferencias.push(item);
		gravarPreferencias().then(function () {
			modo = "lista";
			edicao = null;
			avisar("Preferência salva.", "ok");
		}).catch(function (err) { avisar("Não foi possível salvar: " + err.message, "erro"); });
	}

	function excluir(pref) {
		if (!confirm("Excluir a preferência \"" + (pref.nome || pref.localizadores.join(" • ")) + "\"?")) return;
		preferencias = preferencias.filter(function (p) { return p.id !== pref.id; });
		gravarPreferencias().then(function () { avisar("Preferência excluída.", "ok"); });
	}

	function mover(i, delta) {
		const j = i + delta;
		if (j < 0 || j >= preferencias.length) return;
		const t = preferencias[i];
		preferencias[i] = preferencias[j];
		preferencias[j] = t;
		gravarPreferencias().then(render);
	}

	async function aplicar(pref) {
		if (ocupado) return;
		ocupado = true;
		const res = { ok: [], ja: [], ausente: [], incerto: [] };
		try {
			for (let i = 0; i < pref.localizadores.length; i++) {
				const nome = pref.localizadores[i];
				avisar("Associando " + (i + 1) + " de " + pref.localizadores.length + ": " + nome + "...", "info");
				const r = await associar(nome);
				res[r].push(nome);
				if (r === "ok" || r === "incerto") await esperar(400);
			}
		} catch (err) {
			console.warn(TAG, err);
			ocupado = false;
			avisar(err.message, "erro");
			return;
		}
		ocupado = false;
		const partes = [];
		if (res.ok.length) partes.push("Associado(s): " + res.ok.join(", ") + ".");
		if (res.ja.length) partes.push("Já estava(m) no processo: " + res.ja.join(", ") + ".");
		if (res.incerto.length) partes.push("Escolhido(s) na lista, confira no cabeçalho: " + res.incerto.join(", ") + ".");
		if (res.ausente.length) partes.push("Não está(ão) na lista de localizadores ativos desta unidade: " + res.ausente.join(", ") + ".");
		avisar(partes.join(" "), res.ausente.length ? "erro" : (res.incerto.length ? "info" : "ok"));
	}

	// ------------------------------------------------------------------
	// Início: o componente é carregado pelo SEEU depois do HTML.
	// ------------------------------------------------------------------

	lerPreferencias().catch(function () {});
	inserirBotao();
	const observador = new MutationObserver(function () {
		if (!botao || !botao.isConnected) inserirBotao();
	});
	observador.observe(document.documentElement, { childList: true, subtree: true });
})();
