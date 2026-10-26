// SEEU - Botão "📍 Localizador" com preferências de localizadores
//
// No cabeçalho do processo do SEEU (visualizacaoProcesso.do), à direita,
// ficam os localizadores do processo e o "+" que abre a lista "Associar
// localizador ao processo" com os localizadores ativos da unidade. Este
// recurso põe na fileira de botões da extensão, logo depois do
// "⭐ Minhas Preferências" (quickActions.js), um botão "📍 Localizador" que
// abre um painel com as preferências do usuário: cada preferência tem um ou
// mais localizadores e, com um clique, a extensão os associa ao processo,
// usando a própria lista do "+" (como se o usuário escolhesse cada item).
// As mesmas preferências aparecem como cards no "⭐ Minhas Preferências"
// (que as aplica/edita por window.__pdpLocalizador).
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
	if (!/(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname)) return; // só SEEU
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

	// Todas as funções abaixo recebem o documento (`doc`, padrão: a própria
	// página): as preferências na linha das listas de juntadas/conclusões
	// (preferenciasNaLinha.js) associam os localizadores na tela do processo
	// carregada num iframe oculto.
	function header(doc) {
		return (doc || document).querySelector(SEL_HEADER);
	}

	function raiz(doc) {
		const h = header(doc);
		return h && h.shadowRoot;
	}

	// "+" que abre a lista "Associar localizador ao processo". Sem a
	// permissão de associar, o SEEU não o mostra.
	function gatilho(doc) {
		const r = raiz(doc);
		if (!r) return null;
		const icone = r.querySelector("seeu-icon.plus-icon, seeu-icon[name='mdi:plus']");
		if (!icone) return null;
		return icone.closest("[aria-haspopup]") || icone;
	}

	function itensMenu(doc) {
		const r = raiz(doc);
		if (!r) return [];
		return Array.from(r.querySelectorAll("seeu-menu-item")).filter(function (item) {
			return item.getAttribute("aria-disabled") !== "true" && limpar(textoItem(item));
		});
	}

	function textoItem(item) {
		const span = item.querySelector("[data-text-content]");
		return (span || item).textContent;
	}

	function menuAberto(doc) {
		const g = gatilho(doc);
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

	async function abrirMenu(doc) {
		const g = gatilho(doc);
		if (!g) throw new Error("O \"+\" de localizadores não está disponível neste processo (sem permissão para associar?).");
		if (!menuAberto(doc)) g.click();
		const itens = await aguardar(function () { const l = itensMenu(doc); return l.length ? l : null; }, 6000);
		if (!itens) throw new Error("A lista de localizadores do SEEU não abriu.");
		return itens;
	}

	async function fecharMenu(doc) {
		if (!menuAberto(doc)) return;
		const g = gatilho(doc);
		if (g) g.click();
		await esperar(200);
		if (menuAberto(doc)) (doc || document).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
	}

	// Textos (normalizados) de cada elemento do cabeçalho fora da lista do
	// "+", incluindo os shadow roots internos. Um localizador já associado
	// aparece como um elemento cujo texto é exatamente o nome dele (com
	// eventual "×" de remover). Comparar elemento a elemento evita confundir
	// "Aguardando Audiência" com "Aguardando Audiência - Já Cumprida".
	function textosAssociados(doc) {
		const textos = new Set();
		const profundo = function (n) {
			if (n.nodeType === 3) return n.nodeValue;
			if (n.nodeType !== 1 && n.nodeType !== 11) return "";
			if (n.nodeType === 1 && ignorado(n)) return "";
			let t = "";
			if (n.nodeType === 1 && n.shadowRoot) t += " " + profundo(n.shadowRoot);
			n.childNodes.forEach(function (f) { t += " " + profundo(f); });
			if (n.nodeType === 1) {
				const k = normalizar(t).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
				if (k) textos.add(k);
			}
			return t;
		};
		const r = raiz(doc);
		if (r) profundo(r);
		return textos;
	}

	function jaAssociado(nome, doc) {
		const alvo = normalizar(nome).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
		return !!alvo && textosAssociados(doc).has(alvo);
	}

	async function lerLocalizadoresAtivos(doc) {
		const jaAberto = menuAberto(doc);
		let itens = itensMenu(doc);
		if (!itens.length) itens = await abrirMenu(doc);
		const nomes = [];
		const vistos = new Set();
		itens.forEach(function (item) {
			const nome = limpar(textoItem(item));
			const chave = normalizar(nome);
			if (!vistos.has(chave)) { vistos.add(chave); nomes.push(nome); }
		});
		if (!jaAberto) await fecharMenu(doc);
		return nomes;
	}

	// Nomes dos localizadores associados ao processo, na ordem do
	// cabeçalho: os textos próprios (sem o de filhos) de cada elemento do
	// cabeçalho fora da lista do "+", sem o "×" de remover.
	const RE_SIMBOLOS = /[×✕✖+]/g;
	const RE_NAO_NOME = /^(localizador(es)?( do processo)?|nenhum localizador.*|sem localizador.*)\s*:?$/;
	// Fora da leitura dos localizadores: a lista do "+", dicas e a janela
	// "Confirme" (que repete o nome do localizador ao desassociar).
	const IGNORAR_TAGS = /^(seeu-dropdown|seeu-menu|seeu-tooltip|seeu-dialog|seeu-modal|dialog|style|script|template)$/i;
	function ignorado(n) {
		return IGNORAR_TAGS.test(n.tagName) || /^(dialog|alertdialog)$/i.test(n.getAttribute("role") || "");
	}

	function nomesAssociados(doc) {
		const r = raiz(doc);
		const nomes = [];
		const vistos = new Set();
		const visitar = function (n) {
			if (n.nodeType === 1) {
				if (ignorado(n)) return;
				let proprio = "";
				n.childNodes.forEach(function (f) { if (f.nodeType === 3) proprio += f.nodeValue; });
				const nome = limpar(proprio.replace(RE_SIMBOLOS, " "));
				const chave = normalizar(nome);
				if (/[a-z0-9]/.test(chave) && !RE_NAO_NOME.test(chave) && !vistos.has(chave)) {
					vistos.add(chave);
					nomes.push(nome);
				}
				if (n.shadowRoot) visitar(n.shadowRoot);
			}
			n.childNodes.forEach(function (f) { if (f.nodeType === 1) visitar(f); });
		};
		if (r) visitar(r);
		return nomes;
	}

	// Texto de um elemento com os shadow roots internos (sem símbolos).
	function textoProfundo(n) {
		if (n.nodeType === 3) return n.nodeValue;
		if (n.nodeType !== 1 && n.nodeType !== 11) return "";
		if (n.nodeType === 1 && ignorado(n)) return "";
		let t = "";
		if (n.nodeType === 1 && n.shadowRoot) t += " " + textoProfundo(n.shadowRoot);
		n.childNodes.forEach(function (f) { t += " " + textoProfundo(f); });
		return t;
	}

	function chaveDe(t) {
		return normalizar(String(t || "").replace(RE_SIMBOLOS, " ")).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
	}

	// Elementos (em profundidade, atravessando shadow roots) de `raizBusca`
	// que casam com `seletor`.
	function buscarProfundo(raizBusca, seletor) {
		const achados = [];
		const visitar = function (n) {
			if (n.nodeType === 1) {
				if (ignorado(n)) return;
				if (n.matches(seletor)) achados.push(n);
				if (n.shadowRoot) visitar(n.shadowRoot);
			}
			n.childNodes.forEach(function (f) { if (f.nodeType === 1) visitar(f); });
		};
		visitar(raizBusca);
		return achados;
	}

	// Elemento do cabeçalho cujo texto próprio é o nome do localizador.
	function elementoDoNome(nome, doc) {
		const r = raiz(doc);
		if (!r) return null;
		const alvo = chaveDe(nome);
		return buscarProfundo(r, "*").find(function (n) {
			let proprio = "";
			n.childNodes.forEach(function (f) { if (f.nodeType === 3) proprio += f.nodeValue; });
			return chaveDe(proprio) === alvo;
		}) || null;
	}

	// O "×" (ou ícone/botão de remover) do localizador `nome` no cabeçalho.
	// Sobe a partir do elemento com o nome só enquanto o conteúdo continua
	// sendo apenas esse nome (o "chip" dele), para não pegar o "×" de outro.
	// A estrutura do "×" no SEEU não foi confirmada: aceita ícones com nome
	// de fechar/apagar, rótulos (label, aria-label, title) e classes/partes
	// com "remove"/"close"/"delete", ou um "×" escrito.
	const RE_ICONE_REMOVER = /close|delete|remove|trash|minus|cancel|(^|[:-])x(-lg|-circle|-square)?$/i;
	const RE_ROTULO_REMOVER = /remov|desassoci|exclu|retirar|apagar|delete|close|fechar/i;

	// Prioridade do elemento como botão de remover (0 = não é): ícone de
	// fechar/apagar, rótulo, "×" escrito e, por último, classe/parte - esta
	// só sem texto dentro (a "moldura" do chip também pode ter
	// "removable" na classe).
	function pesoRemover(c) {
		if (c.matches("seeu-icon.plus-icon, [name='mdi:plus'], [name*='plus' i]")) return 0;
		const nomeIcone = c.getAttribute("name") || c.getAttribute("icon") || "";
		if (nomeIcone && RE_ICONE_REMOVER.test(nomeIcone)) return 4;
		if (RE_ROTULO_REMOVER.test([c.getAttribute("label"), c.getAttribute("aria-label"), c.getAttribute("title")].join(" "))) return 3;
		const texto = limpar(textoProfundo(c));
		if (/^[×✕✖✗xX]$/.test(texto)) return 2;
		if (!texto.replace(/[×✕✖✗]/g, "") && RE_ROTULO_REMOVER.test([c.getAttribute("part"), typeof c.className === "string" ? c.className : ""].join(" "))) return 1;
		return 0;
	}

	function controleRemover(nome, doc) {
		const r = raiz(doc);
		const alvo = chaveDe(nome);
		let atual = elementoDoNome(nome, doc);
		for (let nivel = 0; atual && nivel < 6; nivel++) {
			if (chaveDe(textoProfundo(atual)) !== alvo) break;
			let melhor = null;
			let peso = 0;
			buscarProfundo(atual, "*").forEach(function (c) {
				const p = c === atual ? 0 : pesoRemover(c);
				if (p > peso) { peso = p; melhor = c; }
			});
			if (melhor) return melhor.closest("button,[role='button']") || melhor;
			const pai = atual.parentNode;
			if (!pai || pai === r) break;
			atual = pai.nodeType === 11 ? pai.host : pai;
		}
		return null;
	}

	// Clique "completo" (alguns componentes reagem ao pointerdown/mousedown).
	function clicar(alvo) {
		const op = { bubbles: true, composed: true, cancelable: true, view: alvo.ownerDocument.defaultView };
		["pointerdown", "mousedown", "pointerup", "mouseup"].forEach(function (tipo) {
			const C = /^pointer/.test(tipo) && typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
			alvo.dispatchEvent(new C(tipo, op));
		});
		alvo.click();
	}

	// Como buscarProfundo, mas entra também em listas suspensas e menus.
	function buscarProfundoTudo(raizBusca, seletor) {
		const achados = [];
		const visitar = function (n) {
			if (n.nodeType === 1) {
				if (/^(style|script|template)$/i.test(n.tagName)) return;
				if (n.matches(seletor)) achados.push(n);
				if (n.shadowRoot) visitar(n.shadowRoot);
			}
			n.childNodes.forEach(function (f) { if (f.nodeType === 1) visitar(f); });
		};
		visitar(raizBusca);
		return achados;
	}

	// Janela "Confirme" do SEEU ao clicar no localizador: "Deseja
	// desassociar o localizador X do processo N?", com "Não" e "SIM".
	// Clica no "SIM" (visível) cuja janela fala em desassociar.
	const clicados = new WeakSet();
	function confirmarDialogo(doc) {
		const d = doc || document;
		const botoes = buscarProfundoTudo(d.documentElement, "button,[role='button'],seeu-button,input[type='button'],input[type='submit'],a");
		for (const b of botoes) {
			const texto = normalizar(b.tagName === "INPUT" ? b.value : b.textContent);
			if (!/^(sim|confirmar|desassociar)$/.test(texto) || clicados.has(b)) continue;
			if (!b.getClientRects().length) continue; // janela escondida
			let janela = b;
			let achou = false;
			for (let i = 0; janela && i < 10 && !achou; i++) {
				const pai = janela.parentNode;
				janela = pai && pai.nodeType === 11 ? pai.host : pai;
				if (janela && janela.nodeType === 1 && /desassociar|remover|excluir/.test(normalizar(textoProfundoTudo(janela)))) achou = true;
			}
			if (!achou) continue;
			clicados.add(b);
			console.info(TAG, "confirmando:", texto);
			b.click();
			return true;
		}
		return false;
	}

	function textoProfundoTudo(n) {
		if (n.nodeType === 3) return n.nodeValue;
		if (n.nodeType !== 1 && n.nodeType !== 11) return "";
		let t = "";
		if (n.nodeType === 1 && n.shadowRoot) t += " " + textoProfundoTudo(n.shadowRoot);
		n.childNodes.forEach(function (f) { t += " " + textoProfundoTudo(f); });
		return t;
	}

	function erroRemover(nome) {
		return new Error("O SEEU não mostrou a confirmação para desassociar \"" + nome + "\" (sem permissão para remover?). Tire pelo cabeçalho do processo e use \"📋 Copiar diagnóstico\" para informar o problema.");
	}

	// Tira o localizador `nome` do processo de `doc` como no SEEU: clique no
	// localizador no cabeçalho e "SIM" na janela "Confirme" ("Deseja
	// desassociar o localizador ..."). Se a janela não aparecer, tenta um
	// "×" ao lado do nome. Devolve "ok", "ja" (não estava no processo) ou
	// "incerto"; sem como remover, lança um erro.
	async function remover(nome, doc) {
		if (!jaAssociado(nome, doc)) return "ja";
		const alvo = elementoDoNome(nome, doc);
		if (!alvo) throw erroRemover(nome);
		console.info(TAG, "remover", nome, "clicando no localizador", alvo);
		alvo.click();
		let confirmou = await aguardar(function () { return confirmarDialogo(doc); }, 4000);
		if (!confirmou) {
			const ctrl = controleRemover(nome, doc);
			if (!ctrl) throw erroRemover(nome);
			console.info(TAG, "remover", nome, "pelo controle", ctrl);
			clicar(ctrl);
			confirmou = await aguardar(function () { return confirmarDialogo(doc) || !jaAssociado(nome, doc); }, 4000);
		}
		const ok = await aguardar(function () { return !jaAssociado(nome, doc); }, 8000);
		return ok ? "ok" : "incerto";
	}

	// Estrutura do cabeçalho de localizadores (marcas, atributos e textos),
	// para o usuário copiar e informar quando a remoção não funciona.
	function diagnostico(doc) {
		const h = header(doc);
		if (!h) return "Cabeçalho de localizadores não encontrado.";
		const linhas = [];
		const ATTRS = ["id", "class", "name", "icon", "label", "aria-label", "title", "part", "role", "slot", "removable", "aria-haspopup", "aria-expanded", "href", "open"];
		const visitar = function (n, nivel) {
			if (linhas.length > 400) return;
			const recuo = "  ".repeat(nivel);
			if (n.nodeType === 3) {
				const t = limpar(n.nodeValue);
				if (t) linhas.push(recuo + "\"" + t.slice(0, 80) + "\"");
				return;
			}
			if (n.nodeType === 11) {
				linhas.push(recuo + "#shadow-root");
				n.childNodes.forEach(function (f) { visitar(f, nivel + 1); });
				return;
			}
			if (n.nodeType !== 1 || /^(style|script)$/i.test(n.tagName)) return;
			const attrs = ATTRS.filter(function (a) { return n.hasAttribute(a); }).map(function (a) {
				return a + "=\"" + String(n.getAttribute(a)).slice(0, 60) + "\"";
			});
			linhas.push(recuo + "<" + n.tagName.toLowerCase() + (attrs.length ? " " + attrs.join(" ") : "") + ">");
			if (n.shadowRoot) visitar(n.shadowRoot, nivel + 1);
			// Da lista do "+" bastam os primeiros itens.
			const filhos = Array.from(n.childNodes);
			const limite = /^seeu-menu$/i.test(n.tagName) ? 4 : filhos.length;
			filhos.slice(0, limite).forEach(function (f) { visitar(f, nivel + 1); });
			if (filhos.length > limite) linhas.push(recuo + "  …");
		};
		visitar(h, 0);
		let versao = "";
		try { versao = chrome.runtime.getManifest().version; } catch (e) { /* segue */ }
		return "Extensão " + versao + " · " + (doc || document).URL.split("?")[0] + "\n" + linhas.join("\n");
	}

	async function associar(nome, doc) {
		if (jaAssociado(nome, doc)) return "ja";
		const alvo = normalizar(nome);
		// Uma nova tentativa quando o localizador não aparece no cabeçalho
		// (ex.: o clique chegou antes de a página estar pronta para ele).
		for (let tentativa = 1; tentativa <= 2; tentativa++) {
			if (tentativa > 1 && jaAssociado(nome, doc)) return "ok";
			const itens = await abrirMenu(doc);
			const item = itens.find(function (i) { return normalizar(textoItem(i)) === alvo; });
			if (!item) { await fecharMenu(doc); return tentativa === 1 ? "ausente" : "incerto"; }
			const span = item.querySelector("[data-text-content]") || item;
			span.click();
			const ok = await aguardar(function () { return jaAssociado(nome, doc); }, tentativa === 1 ? 6000 : 8000);
			await fecharMenu(doc);
			if (ok) return "ok";
		}
		return "incerto";
	}

	// Associa, um de cada vez, os localizadores no processo de `doc`.
	// `progresso(i, total, nome)` informa o andamento. Devolve as listas
	// { ok, ja, ausente, incerto }; um erro (ex.: sem o "+") é lançado.
	async function associarTodos(localizadores, doc, progresso) {
		const res = { ok: [], ja: [], ausente: [], incerto: [] };
		for (let i = 0; i < localizadores.length; i++) {
			const nome = localizadores[i];
			if (progresso) progresso(i + 1, localizadores.length, nome);
			const r = await associar(nome, doc);
			res[r].push(nome);
			if (r === "ok" || r === "incerto") await esperar(400);
		}
		return res;
	}

	// Texto do resultado e o tipo do aviso ("ok", "info" ou "erro").
	function resumir(res) {
		const partes = [];
		if (res.ok.length) partes.push("Associado(s): " + res.ok.join(", ") + ".");
		if (res.ja.length) partes.push("Já estava(m) no processo: " + res.ja.join(", ") + ".");
		if (res.incerto.length) partes.push("Escolhido(s) na lista, confira no cabeçalho: " + res.incerto.join(", ") + ".");
		if (res.ausente.length) partes.push("Não está(ão) na lista de localizadores ativos desta unidade: " + res.ausente.join(", ") + ".");
		return { texto: partes.join(" "), tipo: res.ausente.length ? "erro" : (res.incerto.length ? "info" : "ok") };
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

	// O botão fica na fileira de botões da extensão, logo depois do
	// "⭐ Minhas Preferências" (quickActions.js), e só no frame que também
	// tem o cabeçalho de localizadores do processo.
	//
	// No SEEU o "Advogados" (habilitarAdvogado.js) também fica logo depois
	// do ⭐; quando ele está na fileira, este botão vai depois dele. Se os
	// dois disputassem o lugar logo depois do ⭐, cada MutationObserver
	// recolocaria o seu botão a cada movimento do outro, sem fim, e a aba
	// travava por completo (aba Movimentações do SEEU, 2.55.4). A ordem na
	// tela vem do `order` de ordemBotoesAcoes.js, não do HTML.
	function reconciliarBotao() {
		const fav = document.getElementById("pdp-fav-prefs-button");
		if (!fav || !header()) {
			if (botao && botao.isConnected) { fecharPainel(); botao.remove(); }
			return;
		}
		if (!botao) {
			botao = el("button", {
				type: "button", id: "pdp-localizador-button", class: "pdp-qa-group-btn", [ATTR_BOTAO]: true,
				title: "Preferências de localizadores: associe ao processo com um clique",
				onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); alternarPainel(); }
			}, [el("span", { text: "Localizador" })]);
		}
		const advogados = document.getElementById("pdp-habilitar-advogado-button");
		const ancora = advogados && advogados.parentElement === fav.parentElement ? advogados : fav;
		if (botao.previousElementSibling !== ancora || botao.parentElement !== ancora.parentElement) ancora.after(botao);
	}

	function alternarPainel() {
		if (painel) { fecharPainel(); return; }
		abrirPainel();
	}

	function abrirPainel() {
		if (painel) return;
		const qa = window.__pdpQuickActions;
		if (qa && typeof qa.closePanel === "function") qa.closePanel();
		modo = "lista";
		status = null;
		painel = el("div", { class: "pdp-loc-painel", role: "dialog", "aria-label": "Preferências de localizadores" });
		document.body.append(painel);
		if (botao) botao.classList.add("pdp-qa-active");
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
		if (botao) botao.classList.remove("pdp-qa-active");
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

	// Área útil da janela, sem as barras de rolagem: `right`/`bottom` de um
	// elemento fixo contam a partir das bordas dela, e window.innerWidth/
	// innerHeight incluem as barras (com a barra vertical à vista, 13-17px
	// no Windows, o painel abria deslocado para a esquerda). Em página sem
	// DOCTYPE (modo de compatibilidade) a medida vem do <body>.
	function areaUtil() {
		const el = document.compatMode === "BackCompat" && document.body ? document.body : document.documentElement;
		return { largura: el.clientWidth || window.innerWidth, altura: el.clientHeight || window.innerHeight };
	}

	function posicionar() {
		if (!painel || !botao) return;
		const r = botao.getBoundingClientRect();
		const area = areaUtil();
		const largura = painel.offsetWidth || 320;
		let esquerda = r.right - largura;
		if (esquerda < 8) esquerda = 8;
		if (esquerda + largura > area.largura - 8) esquerda = Math.max(8, area.largura - 8 - largura);
		painel.style.left = esquerda + "px";
		// A fileira costuma ficar no rodapé da tela: abre para cima quando
		// há mais espaço acima do botão do que abaixo.
		const abaixo = area.altura - r.bottom - 12;
		const acima = r.top - 12;
		if (abaixo >= Math.min(painel.scrollHeight, 360) || abaixo >= acima) {
			painel.style.top = (r.bottom + 4) + "px";
			painel.style.bottom = "";
			painel.style.maxHeight = Math.max(160, abaixo) + "px";
		} else {
			painel.style.top = "";
			painel.style.bottom = (area.altura - r.top + 4) + "px";
			painel.style.maxHeight = Math.max(160, acima) + "px";
		}
	}

	function avisar(texto, tipo) {
		status = texto ? { texto: texto, tipo: tipo || "info" } : null;
		render();
	}

	function render() {
		if (!painel) return;
		// A lista é refeita a cada aviso: a busca do topo é mantida.
		const buscaAntes = painel.querySelector(".pdp-pp-busca");
		const termo = buscaAntes ? buscaAntes.value : "";
		painel.textContent = "";
		painel.append(modo === "editar" ? construirEditor() : construirLista());
		if (status) painel.append(el("div", { class: "pdp-loc-status " + status.tipo, role: "status", text: status.texto }));
		const lista = painel.querySelector(".pdp-pp-painel");
		if (lista) {
			const busca = lista.querySelector(".pdp-pp-busca");
			if (busca) busca.value = termo;
			window.__pdpPainelPrefs.filtrar(lista);
		}
		posicionar();
	}

	function construirLista() {
		const caixa = el("div", { class: "pdp-loc-corpo" });
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
					onclick: function () { aplicarComPendencias(p); }
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
		// Título, busca e "➕ Nova preferência" no topo fixo
		// (painelPreferencias.js): no fim de uma lista comprida, o "Nova"
		// ficava fora da vista.
		window.__pdpPainelPrefs.topo(caixa, {
			conteudo: [el("div", { class: "pdp-loc-titulo", text: "Minhas preferências de localizadores" })],
			novas: [el("button", { type: "button", class: "pdp-loc-bt primario", disabled: ocupado, text: "➕ Nova preferência", onclick: function () { editar(null); } })],
			itens: ".pdp-loc-pref"
		});
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
		item.createdAt = (i >= 0 && preferencias[i].createdAt) || Date.now();
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

	// Como toda preferência (ver executarComPendencias em quickActions.js):
	// com juntadas ou conclusão pendentes no quadro Pendências, pergunta
	// antes se deve dispensá-las/finalizá-la.
	function aplicarComPendencias(pref) {
		const qa = window.__pdpQuickActions;
		if (!qa || typeof qa.executarComPendencias !== "function") {
			aplicar(pref);
			return;
		}
		qa.executarComPendencias("★ " + (pref.nome || pref.localizadores.join(" • ")) + " — 📍 Localizador", false, function () { aplicar(pref); });
	}

	async function aplicar(pref) {
		if (ocupado) return;
		ocupado = true;
		let res;
		try {
			res = await associarTodos(pref.localizadores, document, function (i, total, nome) {
				avisar("Associando " + i + " de " + total + ": " + nome + "...", "info");
			});
		} catch (err) {
			console.warn(TAG, err);
			ocupado = false;
			avisar(err.message, "erro");
			return;
		}
		ocupado = false;
		const r = resumir(res);
		avisar(r.texto, r.tipo);
	}

	// ------------------------------------------------------------------
	// Início: o componente é carregado pelo SEEU depois do HTML.
	// ------------------------------------------------------------------

	// Usado pelo painel "⭐ Minhas Preferências" (quickActions.js), onde as
	// preferências de localizadores também aparecem como cards.
	window.__pdpLocalizador = {
		disponivel: function () { return !!(botao && botao.isConnected && gatilho()); },
		// Para as preferências na linha (preferenciasNaLinha.js): lista
		// gravada, cabeçalho/"+" de um documento e associação nele.
		preferencias: function () { return lerPreferencias().then(function (l) { return l.slice(); }); },
		temCabecalho: function (doc) { return !!header(doc); },
		podeAssociar: function (doc) { return !!gatilho(doc); },
		// Para o localizador na lista (localizadorNaLista.js): o que está
		// associado, a lista do "+", e associar/remover um localizador.
		associadosEm: function (doc) { return nomesAssociados(doc); },
		ativosEm: function (doc) { return lerLocalizadoresAtivos(doc); },
		associarUmEm: function (doc, nome) { return associar(nome, doc); },
		removerEm: function (doc, nome) { return remover(nome, doc); },
		diagnosticoEm: function (doc) { return diagnostico(doc); },
		associarEm: function (doc, localizadores, progresso) {
			return associarTodos(localizadores, doc, progresso).then(function (res) {
				return Object.assign({ resultado: res }, resumir(res));
			});
		},
		aplicar: function (pref) {
			abrirPainel();
			lerPreferencias().then(function () {
				const atual = preferencias.find(function (p) { return p.id === pref.id; }) || pref;
				aplicar(atual);
			});
		},
		editar: function (pref) {
			abrirPainel();
			lerPreferencias().then(function () {
				editar(preferencias.find(function (p) { return p.id === pref.id; }) || pref);
			});
		}
	};

	lerPreferencias().catch(function () {});
	reconciliarBotao();
	new MutationObserver(reconciliarBotao).observe(document.documentElement, { childList: true, subtree: true });
})();
