// Projudi - Localizador na lista (Análise de Juntadas e Retorno de Conclusão)
//
// Versão do Projudi do "Localizador na lista" do SEEU (localizadorNaLista.js):
// na coluna do número do processo de cada linha, mostra "📍" com o que
// consta na linha "Localizadores:" da aba Informações Gerais do processo e
// um "✏️" que abre um painel para trocar ou incluir um localizador,
// escolhido entre os localizadores ativos da tela "Histórico de
// Localizadores". Clicar num localizador da linha tira-o do processo
// (depois de confirmar), como no SEEU.
//
// Onde fica cada coisa no Projudi (estrutura confirmada por .mhtml salvos):
// - Informações Gerais (tela do processo): <td class="label"><label>
//   Localizadores:</label></td><td> <a class="link"
//   href="/projudi/processo/localizadorProcesso.do?_tj=…"> Localizador não
//   cadastrado&nbsp;(clique para cadastrar) </a></td>. O link leva ao
//   Histórico de Localizadores do processo; quando há localizador, o texto
//   do link traz o(s) nome(s).
// - Histórico de Localizadores (localizadorProcesso.do): formulário
//   #localizadorProcessoForm com <select id="codLocalizador"> (os
//   localizadores ativos da unidade; o valor "0" é "Não cadastrado(a)"),
//   a caixa "baixarLocalizadoresAbertos" ("Baixar demais localizadores em
//   aberto", marcada por padrão: é a troca) e o botão #addButton
//   ("Adicionar"); abaixo, a tabela "Localizador | Cadastrado em (por) |
//   Removido em (por) | Remover", em que os localizadores em aberto são os
//   sem data de remoção, e a coluna "Remover" tem o comando de remoção.
//
// A lista não traz os localizadores: a extensão lê a tela de cada processo
// (link da linha; no Retorno de Conclusão, pela tela "Analisar" ou pela
// busca do número), um de cada vez, de cima para baixo. O que foi lido fica
// guardado por alguns minutos na aba (sessionStorage); o "↻" lê de novo.
// As alterações são feitas na tela Histórico de Localizadores carregada num
// iframe oculto: a extensão escolhe o localizador no <select> e clica em
// "Adicionar" (ou no comando da coluna "Remover"), como o usuário faria. O
// clique passa pelo service worker (background.js, "localizador-projudi-
// click") para rodar no mundo da página e aceitar a confirmação do Projudi,
// se houver.
//
// Exclusivo do Projudi: o catálogo (src/funcionalidades.js, `sistemas`)
// não injeta este arquivo no SEEU, e o script ainda confere o endereço.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (/(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname)) return; // só Projudi
	if (!/^\/projudi\/processo\/(analisarJuntada|conclusao)\.do$/.test(location.pathname)) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	if (window.__pdpLocalizadorNaListaProjudi) return;

	const TAG = "[Projudi Localizador na lista]";
	const RE_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
	const CHAVE_CACHE = "pdpLocalizadorNaListaProjudi";
	const CHAVE_IDS = "pdpLocalizadorNaListaProjudiIds";
	// Quantos processos são lidos ao mesmo tempo. 1 = um de cada vez (como
	// até a versão 2.56.1).
	const SIMULTANEAS = 3;
	const VALIDADE_MS = 10 * 60 * 1000;
	const TIMEOUT_CARGA_MS = 25000;
	const PATH_HISTORICO = "/projudi/processo/localizadorProcesso.do";
	const SEM_LOCALIZADOR = "sem localizador"; // terminologia do SEEU

	const esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
	const normalizar = function (t) {
		return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	};
	const limpar = function (t) { return String(t || "").replace(/[\s ]+/g, " ").trim(); };

	function el(tag, attrs, filhos) {
		const n = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) {
			const v = attrs[k];
			if (v == null || v === false) return;
			if (k === "text") n.textContent = v;
			else if (k === "class") n.className = v;
			else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
			else if (k === "value" || k === "disabled" || k === "checked") n[k] = v;
			else n.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) { if (f) n.append(f); });
		return n;
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
			if (url && url.pathname === "/projudi/processo.do" && url.search) return url.href;
		}
		return null;
	}

	// ------------------------------------------------------------------
	// Leitura da aba Informações Gerais
	// ------------------------------------------------------------------

	// Linha "Localizadores:" da tela do processo:
	// { nomes: [..], rotulo: "texto quando não há nomes", historico: url }
	// ou null quando a linha não está na tela.
	function lerInformacoesGerais(doc, base) {
		let celula = null;
		for (const lb of doc.querySelectorAll("td.label")) {
			if (/^localizador(es)?:?$/i.test(limpar(lb.textContent))) {
				celula = lb.nextElementSibling;
				if (celula) break;
			}
		}
		if (!celula) return null;
		let historico = null;
		for (const a of celula.querySelectorAll("a[href]")) {
			const url = mesmaOrigem(a.getAttribute("href"), base);
			if (url && url.pathname === PATH_HISTORICO) { historico = url.href; break; }
		}
		// Texto da célula, com quebra de linha em cada <br> e em cada link.
		const partes = [];
		const percorrer = function (n) {
			n.childNodes.forEach(function (f) {
				if (f.nodeType === 3) partes.push(f.nodeValue);
				else if (f.nodeType === 1) {
					const tag = f.tagName.toLowerCase();
					if (tag === "script" || tag === "style") return;
					if (tag === "br") { partes.push("\n"); return; }
					const bloco = tag === "a" || tag === "div" || tag === "li" || tag === "p";
					if (bloco) partes.push("\n");
					percorrer(f);
					if (bloco) partes.push("\n");
				}
			});
		};
		percorrer(celula);
		const nomes = [];
		let rotulo = null;
		partes.join("").split(/\n|;/).forEach(function (linha) {
			const t = limpar(linha.replace(/\(\s*clique[^)]*\)/gi, ""));
			if (!t || /^[,\-–]$/.test(t)) return;
			if (/n[aã]o cadastrad/i.test(t)) { rotulo = t; return; }
			if (nomes.indexOf(t) < 0) nomes.push(t);
		});
		return { nomes: nomes, rotulo: nomes.length ? null : (rotulo || SEM_LOCALIZADOR), historico: historico };
	}

	async function buscarHTML(url, opcoes) {
		const resposta = await fetch(url, Object.assign({ credentials: "same-origin" }, opcoes || {}));
		if (!resposta.ok) throw new Error("o Projudi respondeu " + resposta.status);
		const bytes = await resposta.arrayBuffer();
		const inicio = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
		const m = /charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(inicio);
		let decodificador;
		try { decodificador = new TextDecoder((m && m[1]) || "windows-1252"); } catch (e) { decodificador = new TextDecoder("windows-1252"); }
		const doc = new DOMParser().parseFromString(decodificador.decode(bytes), "text/html");
		return { doc: doc, url: resposta.url };
	}

	// Carrega `url` num iframe oculto. A cada carga e periodicamente chama
	// `pronto(doc, decorrido)`: true = resolve com { doc, url, iframe };
	// uma string = navega o iframe para essa URL; false = continua
	// esperando. Com `manter`, o iframe fica (quem chamou o remove).
	function carregar(url, pronto, manter, token) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "localizador-na-lista-projudi");
			if (token) iframe.setAttribute("data-pdp-locl-projudi", token);
			iframe.setAttribute("aria-hidden", "true");
			iframe.tabIndex = -1;
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
				if (Date.now() - inicio > TIMEOUT_CARGA_MS) { encerrar(); reject(new Error("a tela demorou demais para carregar")); return; }
				let doc, href;
				try {
					doc = iframe.contentDocument;
					href = iframe.contentWindow.location.href;
				} catch (e) { encerrar(); reject(e); return; }
				if (navegando || !doc || href === "about:blank" || doc.readyState === "loading") return;
				let r;
				try { r = pronto(doc, Date.now() - inicio); } catch (e) { encerrar(); reject(e); return; }
				if (r === true) {
					if (manter) { fim = true; clearInterval(timer); } else encerrar();
					resolve({ doc: doc, url: href, iframe: iframe });
				} else if (typeof r === "string") {
					navegando = true;
					iframe.src = r;
				}
			}
			iframe.addEventListener("load", function () { navegando = false; verificar(); });
			const timer = setInterval(verificar, 300);
			document.body.append(iframe);
			iframe.src = url;
		});
	}

	function caminho(doc) {
		try { return new URL(doc.URL).pathname; } catch (e) { return ""; }
	}

	// Tela do processo com a linha "Localizadores:" (ou resultado da busca
	// pelo número com um só processo, que é aberto).
	function prontoProcesso(doc, decorrido) {
		const path = caminho(doc);
		if (path === "/projudi/processo.do" || path === "/projudi/visualizacaoProcesso.do") {
			// Aba Informações Gerais, ou outra aba com o formulário do
			// processo (a troca de aba é feita depois, em abaInformacoesGerais).
			if (lerInformacoesGerais(doc, doc.URL)) return true;
			if (doc.readyState === "complete" && doc.getElementById("processoForm")) return true;
			return false;
		}
		if (path === "/projudi/processo/buscaProcesso.do") {
			const links = new Set();
			doc.querySelectorAll("a[href]").forEach(function (a) {
				const url = mesmaOrigem(a.getAttribute("href"), doc.URL);
				if (url && url.pathname === "/projudi/processo.do" && url.search) links.add(url.href);
			});
			if (links.size === 1) return links.values().next().value;
			if (links.size > 1) throw new Error("a busca pelo número trouxe mais de um processo");
			return false;
		}
		if (decorrido > 8000 && doc.readyState === "complete") throw new Error("a tela do processo não abriu (sessão expirada?)");
		return false;
	}

	// URL da tela do processo. No Retorno de Conclusão a linha não tem link
	// para o processo: procura na tela "Analisar" (como preferenciasNaLinha.js).
	async function urlDoProcesso(item) {
		if (item.url) return item.url;
		if (urlsProcesso[item.cnj]) return urlsProcesso[item.cnj];
		if (item.analisar) {
			try {
				const r = await buscarHTML(item.analisar);
				const url = linkProcesso(r.doc, r.url);
				if (url) { urlsProcesso[item.cnj] = url; return url; }
			} catch (e) {
				console.warn(TAG, "falha ao ler a tela de análise da conclusão:", e);
			}
		}
		return null;
	}
	const urlsProcesso = {};

	// A tela do processo abre na aba Movimentações, sem a linha
	// "Localizadores:". A aba Informações Gerais vem pela mesma troca de aba
	// do Projudi: o #processoForm enviado com selectedIcon=tabDadosProcesso
	// (como blocoAnotacoes.js e habilitarAdvogado.js fazem) ou o endereço
	// processo.do?actionType=visualizar&id=…&selectedIcon=… (o mesmo formato
	// dos links da própria tela).
	//
	// Leituras simultâneas (SIMULTANEAS): o Projudi guarda na sessão o
	// "processo atual", então cada resposta da aba é conferida (id interno e
	// número CNJ). Se vier a aba de outro processo, a leitura é refeita
	// sozinha, sem nenhuma outra em andamento (ver processarFila).
	//
	// O id interno de cada processo (o "id=" do #processoForm) fica guardado
	// na aba (sessionStorage, CHAVE_IDS): a partir da segunda leitura (↻,
	// depois de alterar, outra página da lista) a extensão vai direto à aba
	// Informações Gerais, com uma consulta só.
	const idsProcesso = {};
	try { Object.assign(idsProcesso, JSON.parse(sessionStorage.getItem(CHAVE_IDS) || "{}")); } catch (e) { /* segue */ }
	function guardarId(cnj, id) {
		if (!/^\d+$/.test(id || "") || idsProcesso[cnj] === id) return;
		idsProcesso[cnj] = id;
		try { sessionStorage.setItem(CHAVE_IDS, JSON.stringify(idsProcesso)); } catch (e) { /* segue */ }
	}
	// Qual troca de aba funcionou ("post" ou "get"), para ir direto a ela.
	let modoAba = null;

	function erroTrocado() {
		const e = new Error("o Projudi devolveu a aba de outro processo");
		e.trocado = true;
		return e;
	}

	function idDoDoc(doc, base) {
		const form = doc.getElementById("processoForm");
		if (!form) return "";
		const campo = form.querySelector('[name="id"]');
		if (campo && /^\d+$/.test(campo.value || "")) return campo.value;
		const acao = mesmaOrigem(form.getAttribute("action") || "", base);
		return (acao && acao.searchParams.get("id")) || "";
	}

	// Confere que a resposta é do processo esperado.
	function conferir(doc, base, cnj, id) {
		const recebido = idDoDoc(doc, base);
		if (id && recebido && recebido !== id) throw erroTrocado();
		const texto = (doc.body && doc.body.textContent) || "";
		if (cnj && RE_CNJ.test(texto) && texto.indexOf(cnj) < 0) throw erroTrocado();
	}

	async function abaPorGet(cnj, id) {
		const r = await buscarHTML(location.origin + "/projudi/processo.do?actionType=visualizar&id=" + id + "&selectedIcon=tabDadosProcesso");
		const info = lerInformacoesGerais(r.doc, r.url);
		if (info) conferir(r.doc, r.url, cnj, id);
		return info;
	}

	async function abaPorPost(cnj, id, acao, form) {
		const corpo = new URLSearchParams();
		if (form) {
			for (const c of form.querySelectorAll("input[name], select[name], textarea[name]")) {
				if (c.disabled || /^(button|submit|image|file|reset)$/i.test(c.type || "")) continue;
				if (/^(checkbox|radio)$/i.test(c.type || "") && !c.checked) continue;
				corpo.append(c.name, c.value || "");
			}
		}
		corpo.set("selectedIcon", "tabDadosProcesso");
		if (id) corpo.set("id", id);
		const r = await buscarHTML(acao, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: corpo.toString() });
		const info = lerInformacoesGerais(r.doc, r.url);
		if (info) conferir(r.doc, r.url, cnj, id);
		return info;
	}

	// Direto à aba Informações Gerais pelo id guardado (uma consulta).
	async function lerPeloId(cnj, id) {
		const modos = modoAba === "post" ? ["post", "get"] : ["get", "post"];
		for (const modo of modos) {
			try {
				const info = modo === "get" ? await abaPorGet(cnj, id)
					: await abaPorPost(cnj, id, location.origin + "/projudi/visualizacaoProcesso.do?actionType=visualizar&id=" + id, null);
				if (info) { modoAba = modo; return info; }
			} catch (e) {
				if (e && e.trocado) throw e;
				console.warn(TAG, cnj, "leitura pelo id (" + modo + ") falhou:", e);
			}
		}
		return null;
	}

	async function abaInformacoesGerais(doc, base, cnj) {
		const id = idDoDoc(doc, base);
		const direto = lerInformacoesGerais(doc, base);
		if (direto) {
			conferir(doc, base, cnj, null);
			guardarId(cnj, id);
			return direto;
		}
		const form = doc.getElementById("processoForm");
		if (!form) return null;
		conferir(doc, base, cnj, null);
		guardarId(cnj, id);
		const acao = mesmaOrigem(form.getAttribute("action") || "", base);
		if (acao && modoAba !== "get") {
			try {
				const info = await abaPorPost(cnj, /^\d+$/.test(id) ? id : null, acao.href, form);
				if (info) { modoAba = "post"; return info; }
			} catch (e) {
				if (e && e.trocado) throw e;
				console.warn(TAG, "troca para a aba Informações Gerais (envio do formulário) falhou:", e);
			}
		}
		if (/^\d+$/.test(id)) {
			const info = await abaPorGet(cnj, id);
			if (info) { modoAba = "get"; return info; }
		}
		return null;
	}

	// Lê a linha "Localizadores:" do processo da linha: direto pela aba
	// Informações Gerais quando o id já é conhecido; senão pela tela do
	// processo baixada e a troca de aba; se nada disso der, carrega a tela
	// num iframe oculto (ou pesquisa pelo número).
	async function lerProcesso(item) {
		if (idsProcesso[item.cnj]) {
			try {
				const info = await lerPeloId(item.cnj, idsProcesso[item.cnj]);
				if (info) return info;
			} catch (e) {
				// Aba de outro processo pelo atalho: segue pelo caminho completo.
				if (!(e && e.trocado)) throw e;
			}
		}
		const url = await urlDoProcesso(item);
		if (url) {
			try {
				const r = await buscarHTML(url);
				const info = await abaInformacoesGerais(r.doc, r.url, item.cnj);
				if (info) return info;
			} catch (e) {
				if (e && e.trocado) throw e;
				console.warn(TAG, item.cnj, "leitura direta falhou; abrindo a tela:", e);
			}
		}
		const alvo = url || (location.origin + "/projudi/processo/buscaProcesso.do?actionType=iniciarSimples#pdp-search=" + encodeURIComponent(item.cnj));
		const r = await carregar(alvo, prontoProcesso);
		if (!url && r.url) urlsProcesso[item.cnj] = r.url;
		return abaInformacoesGerais(r.doc, r.url, item.cnj);
	}

	// ------------------------------------------------------------------
	// Tela Histórico de Localizadores
	// ------------------------------------------------------------------

	function prontoHistorico(doc, decorrido) {
		if (caminho(doc) === PATH_HISTORICO && doc.getElementById("codLocalizador") && doc.readyState === "complete") return true;
		if (decorrido > 8000 && doc.readyState === "complete") throw new Error("a tela Histórico de Localizadores não abriu (perfil sem permissão ou sessão expirada?)");
		return false;
	}

	// Localizadores ativos da unidade (opções do <select>, sem o "Não
	// cadastrado(a)"): [{ valor, nome }].
	function ativosNoHistorico(doc) {
		const sel = doc.getElementById("codLocalizador");
		if (!sel) return [];
		return Array.from(sel.options).filter(function (o) { return o.value && o.value !== "0"; })
			.map(function (o) { return { valor: o.value, nome: limpar(o.textContent) }; });
	}

	// Linhas da tabela do histórico: [{ nome, aberto, row, remover }].
	function linhasHistorico(doc) {
		const resultado = [];
		for (const t of doc.querySelectorAll("table.resultTable")) {
			const ths = Array.from(t.querySelectorAll("thead th")).map(function (th) { return normalizar(th.textContent); });
			const iNome = ths.findIndex(function (h) { return h.indexOf("localizador") === 0; });
			if (iNome < 0) continue;
			const iRemovido = ths.findIndex(function (h) { return h.indexOf("removido") === 0; });
			const iRemover = ths.findIndex(function (h) { return h === "remover"; });
			const tbody = t.tBodies[0];
			if (!tbody) continue;
			for (const row of tbody.rows) {
				if (row.cells.length <= iNome || row.cells[iNome].colSpan > 1) continue;
				const nome = limpar(row.cells[iNome].textContent);
				if (!nome) continue;
				const removido = iRemovido >= 0 && row.cells[iRemovido] ? limpar(row.cells[iRemovido].textContent) : "";
				const celRemover = iRemover >= 0 ? row.cells[iRemover] : row.cells[row.cells.length - 1];
				const remover = celRemover ? celRemover.querySelector("a, input[type=button], input[type=image], input[type=submit], button, img[onclick], img") : null;
				resultado.push({ nome: nome, aberto: !/\d/.test(removido), row: row, remover: remover });
			}
		}
		return resultado;
	}

	function abertosNoHistorico(doc) {
		return linhasHistorico(doc).filter(function (l) { return l.aberto; }).map(function (l) { return l.nome; });
	}

	function novoToken() {
		if (crypto.randomUUID) return crypto.randomUUID();
		const b = crypto.getRandomValues(new Uint8Array(16));
		const h = Array.from(b, function (x) { return x.toString(16).padStart(2, "0"); }).join("");
		return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
	}

	// Clica, no mundo da página, no elemento marcado do iframe do histórico
	// (background.js aceita a confirmação do Projudi, se houver) e espera a
	// tela do histórico carregar de novo.
	async function clicarEAguardar(hist, alvo, acao) {
		const token = hist.token;
		const docAntes = hist.iframe.contentDocument;
		alvo.setAttribute("data-pdp-locl-projudi-botao", token);
		let r;
		try {
			r = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "localizador-projudi-click", token: token, acao: acao });
		} catch (e) {
			throw new Error("a extensão não respondeu (recarregue a página): " + ((e && e.message) || e));
		}
		if (!r || !r.ok) throw new Error((r && r.error) || "não foi possível clicar na tela do histórico");
		const inicio = Date.now();
		while (Date.now() - inicio < TIMEOUT_CARGA_MS) {
			await esperar(300);
			let doc;
			try { doc = hist.iframe.contentDocument; } catch (e) { throw new Error("a tela do histórico ficou inacessível"); }
			if (!doc || doc === docAntes || doc.URL === "about:blank" || doc.readyState !== "complete") continue;
			if (caminho(doc) !== PATH_HISTORICO) {
				await esperar(800);
				throw new Error("depois do clique o Projudi abriu outra tela: " + limpar((doc.body && doc.body.textContent) || "").slice(0, 160));
			}
			if (!doc.getElementById("codLocalizador") && !doc.querySelector("table.resultTable")) continue;
			await esperar(300);
			hist.doc = doc;
			return true;
		}
		return false; // não recarregou: resultado incerto
	}

	async function abrirHistorico(url) {
		const token = novoToken();
		const r = await carregar(url, prontoHistorico, true, token);
		return { iframe: r.iframe, doc: r.doc, token: token };
	}

	// "ok" | "ja" | "ausente" | "incerto"
	async function adicionarNoHistorico(hist, nome, trocar) {
		const doc = hist.doc;
		const ativo = ativosNoHistorico(doc).find(function (a) { return normalizar(a.nome) === normalizar(nome); });
		if (!ativo) return "ausente";
		const abertos = abertosNoHistorico(doc);
		const outros = abertos.filter(function (n) { return normalizar(n) !== normalizar(nome); });
		if (abertos.length !== outros.length && (!trocar || !outros.length)) return "ja";
		const sel = doc.getElementById("codLocalizador");
		sel.value = ativo.valor;
		sel.dispatchEvent(new Event("change", { bubbles: true }));
		const caixa = doc.querySelector('input[name="baixarLocalizadoresAbertos"]');
		if (caixa && caixa.checked !== !!trocar) caixa.click();
		if (caixa && caixa.checked !== !!trocar) caixa.checked = !!trocar;
		const botao = doc.getElementById("addButton") || Array.from(doc.querySelectorAll("input[type=button], input[type=submit], button")).find(function (b) { return /^adicionar$/i.test(limpar(b.value || b.textContent)); });
		if (!botao) throw new Error("o botão \"Adicionar\" não está na tela do histórico");
		const recarregou = await clicarEAguardar(hist, botao, "adicionar");
		if (!recarregou) return "incerto";
		const agora = abertosNoHistorico(hist.doc).map(normalizar);
		return agora.indexOf(normalizar(nome)) >= 0 ? "ok" : "incerto";
	}

	// "ok" | "ja" | "sem-comando" | "incerto"
	async function removerNoHistorico(hist, nome) {
		const linha = linhasHistorico(hist.doc).find(function (l) { return l.aberto && normalizar(l.nome) === normalizar(nome); });
		if (!linha) return "ja";
		if (!linha.remover) return "sem-comando";
		const recarregou = await clicarEAguardar(hist, linha.remover, "remover");
		if (!recarregou) return "incerto";
		const agora = abertosNoHistorico(hist.doc).map(normalizar);
		return agora.indexOf(normalizar(nome)) < 0 ? "ok" : "incerto";
	}

	function diagnosticoHistorico(doc) {
		try {
			const tabela = Array.from(doc.querySelectorAll("table.resultTable")).find(function (t) { return /localizador/i.test(t.textContent); });
			return "Tela: " + doc.URL.replace(/_tj=[^&]+/, "_tj=…") + "\n\n" + (tabela ? tabela.outerHTML.replace(/_tj=[^&"']+/g, "_tj=…").slice(0, 6000) : "(tabela do histórico não encontrada)");
		} catch (e) {
			return String(e && e.message);
		}
	}

	// ------------------------------------------------------------------
	// Localizadores lidos: { "<CNJ>": { estado, nomes, rotulo, erro, ts } }
	// estado: "fila" | "lendo" | "ok" | "erro"
	// ------------------------------------------------------------------

	const lidos = {};
	try {
		const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CACHE) || "{}");
		Object.keys(salvo).forEach(function (cnj) {
			const d = salvo[cnj];
			if (d && Array.isArray(d.nomes) && Date.now() - d.ts < VALIDADE_MS) lidos[cnj] = { estado: "ok", nomes: d.nomes, rotulo: d.rotulo || null, ts: d.ts };
		});
	} catch (e) { /* sem sessionStorage: lê de novo */ }

	function guardar() {
		const salvo = {};
		Object.keys(lidos).forEach(function (cnj) {
			const d = lidos[cnj];
			if (d.estado === "ok" && Date.now() - d.ts < VALIDADE_MS) salvo[cnj] = { nomes: d.nomes, rotulo: d.rotulo, ts: d.ts };
		});
		try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(salvo)); } catch (e) { /* segue */ }
	}

	function definir(cnj, info) {
		lidos[cnj] = { estado: "ok", nomes: (info.nomes || []).slice(), rotulo: info.nomes && info.nomes.length ? null : (info.rotulo || SEM_LOCALIZADOR), ts: Date.now() };
		guardar();
		renderizar();
	}

	function valido(cnj) {
		const d = lidos[cnj];
		if (!d) return false;
		if (d.estado === "ok") return Date.now() - d.ts < VALIDADE_MS;
		return true;
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

	function linkAnalisar(row) {
		for (const a of row.querySelectorAll("a[href]")) {
			const url = mesmaOrigem(a.getAttribute("href"));
			if (url && url.pathname === "/projudi/processo/conclusao.do" && url.search && !url.hash) return url.href;
		}
		return null;
	}

	// [{ row, cnj, celula, url, analisar }] - a célula é a do número.
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
			resultado.push({ row: row, cnj: em.textContent.match(RE_CNJ)[0], celula: em.closest("td"), url: linkProcesso(row), analisar: linkAnalisar(row) });
		}
		return resultado;
	}

	// ------------------------------------------------------------------
	// Exibição na linha
	// ------------------------------------------------------------------

	const avisos = {};
	function avisarLinha(cnj, texto, tipo) {
		if (texto) avisos[cnj] = { texto: texto, tipo: tipo || "info" };
		else delete avisos[cnj];
		renderizar();
	}

	function renderizarLinha(item) {
		let caixa = item.celula.querySelector(":scope > .pdp-locl");
		if (!caixa) {
			caixa = el("div", { class: "pdp-locl" });
			item.celula.append(caixa);
		}
		const d = lidos[item.cnj] || null;
		const aviso = avisos[item.cnj] || null;
		const assinatura = JSON.stringify([item.cnj, d && d.estado, d && d.nomes, d && d.rotulo, d && d.erro, aviso]);
		if (caixa.dataset.assinatura === assinatura) return;
		caixa.dataset.assinatura = assinatura;
		caixa.textContent = "";
		caixa.append(el("span", { class: "pdp-locl-icone", text: "📍", title: "Localizadores do processo (aba Informações Gerais)" }));

		if (!d || d.estado === "fila" || d.estado === "lendo") {
			caixa.append(el("span", { class: "pdp-locl-vazio", text: d && d.estado === "lendo" ? "lendo…" : "aguardando…" }));
		} else if (d.estado === "erro") {
			caixa.append(el("span", { class: "pdp-locl-erro", title: d.erro || "", text: "⚠ não foi possível ler" }));
		} else if (!d.nomes.length) {
			caixa.append(el("span", { class: "pdp-locl-vazio", text: d.rotulo || SEM_LOCALIZADOR }));
		} else {
			d.nomes.forEach(function (n) {
				const remover = function (ev) { ev.preventDefault(); ev.stopPropagation(); removerNaLinha(item, n); };
				caixa.append(el("span", {
					class: "pdp-locl-item pdp-locl-removivel", role: "button", tabindex: "0", title: "Remover do processo",
					onclick: remover,
					onkeydown: function (ev) { if (ev.key === "Enter" || ev.key === " ") remover(ev); }
				}, [el("span", { text: n }), el("span", { class: "pdp-locl-x", "aria-hidden": "true", text: "⊗" })]));
			});
		}
		const editar = el("button", {
			type: "button", class: "pdp-locl-bt pdp-locl-editar",
			title: "Trocar ou incluir localizador neste processo", text: "✏️",
			onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); abrirEditor(item, editar); }
		});
		caixa.append(editar);
		if (d && (d.estado === "ok" || d.estado === "erro")) {
			caixa.append(el("button", {
				type: "button", class: "pdp-locl-bt", title: "Ler de novo os localizadores deste processo", text: "↻",
				onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); delete lidos[item.cnj]; delete avisos[item.cnj]; renderizar(); }
			}));
		}
		if (aviso) {
			caixa.append(el("span", { class: "pdp-locl-aviso " + aviso.tipo, role: "status", text: aviso.texto }, [
				aviso.tipo === "info" ? null : el("button", {
					type: "button", class: "pdp-locl-x-aviso", title: "Fechar aviso", text: "✕",
					onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); delete avisos[item.cnj]; renderizar(); }
				})
			]));
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
				if (!valido(item.cnj)) lidos[item.cnj] = { estado: "fila" };
				renderizarLinha(item);
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

	// Leitores em andamento (até SIMULTANEAS). Uma leitura que recebeu a
	// aba de outro processo volta para a fila marcada `sozinho` e só é
	// refeita quando nenhuma outra está em andamento.
	let leitores = 0;
	let pausado = false;
	// Limite em uso: cai para 1 se o Projudi devolver a aba de outro
	// processo duas vezes nesta página (aí ler junto só atrasaria).
	let limite = SIMULTANEAS;
	let trocados = 0;

	function proximoDaFila() {
		const fila = linhas().filter(function (i) { return lidos[i.cnj] && lidos[i.cnj].estado === "fila"; });
		return fila.find(function (i) { return lidos[i.cnj].sozinho; }) || fila[0] || null;
	}

	function processarFila() {
		while (!pausado) {
			const item = proximoDaFila();
			if (!item) return;
			if (lidos[item.cnj].sozinho) {
				if (leitores > 0) return; // espera as demais terminarem
				leitores = Infinity; // ninguém mais começa
				lerSozinho(item).finally(function () { leitores = 0; processarFila(); });
				return;
			}
			if (leitores >= limite) return;
			leitores++;
			leitor().finally(function () { leitores--; processarFila(); });
		}
	}

	async function ler(item, sozinho) {
		lidos[item.cnj] = { estado: "lendo" };
		renderizar();
		try {
			const info = await lerProcesso(item);
			if (!info) throw new Error("a linha \"Localizadores\" não está na aba Informações Gerais");
			definir(item.cnj, info);
		} catch (e) {
			if (e && e.trocado && !sozinho) {
				console.info(TAG, item.cnj, "resposta de outro processo; será lido de novo, sem leituras simultâneas.");
				if (++trocados >= 2 && limite > 1) {
					limite = 1;
					console.info(TAG, "o Projudi misturou processos lidos ao mesmo tempo; nesta página, um de cada vez.");
				}
				lidos[item.cnj] = { estado: "fila", sozinho: true };
				renderizar();
				return;
			}
			console.warn(TAG, item.cnj, e);
			lidos[item.cnj] = { estado: "erro", erro: (e && e.message) || "falha ao ler" };
			renderizar();
		}
	}

	async function lerSozinho(item) {
		await ler(item, true);
	}

	async function leitor() {
		for (;;) {
			if (pausado) return;
			const item = proximoDaFila();
			if (!item || lidos[item.cnj].sozinho) return;
			await ler(item, false);
		}
	}

	// Lê o processo de novo (para ter o link do histórico atualizado) e
	// abre o Histórico de Localizadores num iframe oculto.
	async function prepararHistorico(item) {
		const info = await lerProcesso(item);
		if (!info) throw new Error("a linha \"Localizadores\" não está na aba Informações Gerais");
		definir(item.cnj, info);
		if (!info.historico) throw new Error("a linha \"Localizadores\" não tem o link para o Histórico de Localizadores (perfil sem permissão?)");
		return { info: info, hist: await abrirHistorico(info.historico) };
	}

	// Depois de alterar: o que a aba Informações Gerais mostra agora (ou,
	// se não der para ler, os em aberto no histórico).
	async function atualizarDepois(item, hist) {
		try {
			const info = await lerProcesso(item);
			if (info) { definir(item.cnj, info); return info; }
		} catch (e) {
			console.warn(TAG, item.cnj, "releitura falhou:", e);
		}
		const abertos = hist ? abertosNoHistorico(hist.doc) : [];
		const info = { nomes: abertos, rotulo: SEM_LOCALIZADOR };
		definir(item.cnj, info);
		return info;
	}

	// ------------------------------------------------------------------
	// Remoção pelo clique no localizador da linha
	// ------------------------------------------------------------------

	let removendo = false;
	async function removerNaLinha(item, nome) {
		if (editor && editor.cnj === item.cnj && editor.hist) { alterar("remover", nome); return; }
		if (removendo || (editor && editor.ocupado && !editor.carregando)) {
			alert("Aguarde terminar a alteração de localizador em andamento.");
			return;
		}
		if (!confirm("Remover o localizador \"" + nome + "\" do processo " + item.cnj + "?")) return;
		if (editor) fecharEditor();
		removendo = true;
		pausado = true;
		avisarLinha(item.cnj, "Removendo \"" + nome + "\"…", "info");
		let hist = null;
		try {
			while (leitores > 0) await esperar(200);
			hist = (await prepararHistorico(item)).hist;
			const r = await removerNoHistorico(hist, nome);
			await atualizarDepois(item, hist);
			const textos = {
				ok: "✅ \"" + nome + "\" removido do processo.",
				ja: "\"" + nome + "\" já não estava em aberto no processo.",
				"sem-comando": "⚠ A linha de \"" + nome + "\" no Histórico de Localizadores não tem o comando \"Remover\".",
				incerto: "⚠ Não deu para confirmar se \"" + nome + "\" saiu. Use o ↻ para conferir."
			};
			avisarLinha(item.cnj, textos[r] || r, r === "ok" || r === "ja" ? "ok" : "aviso");
			if (r === "sem-comando" || r === "incerto") console.info(TAG, "diagnóstico:\n" + diagnosticoHistorico(hist.doc));
			if (r === "ok" || r === "ja") setTimeout(function () { if (avisos[item.cnj] && avisos[item.cnj].tipo === "ok") avisarLinha(item.cnj, null); }, 6000);
		} catch (err) {
			console.warn(TAG, err);
			avisarLinha(item.cnj, "⚠ " + ((err && err.message) || "Falha ao remover o localizador."), "erro");
		} finally {
			if (hist) hist.iframe.remove();
			removendo = false;
			pausado = !!editor;
			renderizar();
		}
	}

	// ------------------------------------------------------------------
	// Painel "Localizadores" de um processo (trocar / incluir / remover)
	// ------------------------------------------------------------------

	// { cnj, item, ancora, painel, hist, associados, ativos, filtro, trocar,
	//   ocupado, carregando, status:{texto,tipo,diagnostico} }
	let editor = null;

	async function abrirEditor(item, ancora) {
		if (editor && editor.cnj === item.cnj) { fecharEditor(); return; }
		if (removendo) { alert("Aguarde terminar a remoção de localizador em andamento."); return; }
		fecharEditor();
		const e = { cnj: item.cnj, item: item, ancora: ancora, painel: null, hist: null, associados: [], ativos: [], filtro: "", trocar: true, ocupado: true, carregando: true, status: { texto: "Abrindo o Histórico de Localizadores em segundo plano…", tipo: "info" } };
		editor = e;
		e.painel = el("div", { class: "pdp-locl-painel", role: "dialog", "aria-label": "Localizadores de " + item.cnj });
		e.painel.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
		document.body.append(e.painel);
		desenharEditor();
		renderizar();
		setTimeout(function () { document.addEventListener("mousedown", foraDoEditor, true); }, 0);

		pausado = true;
		while (leitores > 0) await esperar(200);
		if (editor !== e) return;
		try {
			const r = await prepararHistorico(item);
			if (editor !== e) { r.hist.iframe.remove(); return; }
			e.hist = r.hist;
			e.associados = abertosNoHistorico(e.hist.doc);
			if (!e.associados.length) e.associados = r.info.nomes.slice();
			e.ativos = ativosNoHistorico(e.hist.doc).map(function (a) { return a.nome; });
			const caixa = e.hist.doc.querySelector('input[name="baixarLocalizadoresAbertos"]');
			e.trocar = caixa ? caixa.checked : true;
			e.status = e.ativos.length ? null : { texto: "A tela Histórico de Localizadores não trouxe localizadores ativos para escolher.", tipo: "erro" };
		} catch (err) {
			console.warn(TAG, err);
			e.status = { texto: (err && err.message) || "Falha ao abrir o Histórico de Localizadores.", tipo: "erro" };
		}
		if (editor !== e) { if (e.hist) e.hist.iframe.remove(); return; }
		e.carregando = false;
		e.ocupado = false;
		desenharEditor();
	}

	function fecharEditor() {
		if (!editor) return;
		if (editor.ocupado && !editor.carregando) return;
		const e = editor;
		editor = null;
		if (e.hist) e.hist.iframe.remove();
		e.painel.remove();
		document.removeEventListener("mousedown", foraDoEditor, true);
		pausado = false;
		renderizar();
	}

	function foraDoEditor(ev) {
		if (!editor) return;
		const cam = ev.composedPath ? ev.composedPath() : [];
		if (cam.indexOf(editor.painel) >= 0 || cam.indexOf(editor.ancora) >= 0) return;
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
		const esquerda = Math.min(r.left, window.innerWidth - largura - 8);
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
		if (e.status && e.status.diagnostico) {
			const texto = e.status.diagnostico;
			const bt = el("button", {
				type: "button", class: "pdp-locl-bt pdp-locl-diag", text: "📋 Copiar diagnóstico",
				title: "Copia a estrutura da tabela do Histórico de Localizadores, para enviar a quem mantém a extensão",
				onclick: function () {
					navigator.clipboard.writeText(texto).then(function () { bt.textContent = "✅ Diagnóstico copiado"; }).catch(function () {
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
		if (!e.associados.length) {
			const d = lidos[e.cnj];
			noProcesso.append(el("div", { class: "pdp-locl-vazio", text: (d && d.rotulo) || "Nenhum localizador." }));
		}
		e.associados.forEach(function (n) {
			noProcesso.append(el("div", { class: "pdp-locl-linha" }, [
				el("span", { class: "pdp-locl-item", text: n }),
				el("button", {
					type: "button", class: "pdp-locl-bt", title: "Remover \"" + n + "\" do processo", text: "✖", disabled: e.ocupado || !e.hist,
					onclick: function () { alterar("remover", n); }
				})
			]));
		});
		e.painel.append(noProcesso);

		if (e.hist && e.ativos.length) {
			e.painel.append(el("div", { class: "pdp-locl-sec", text: e.trocar ? "Trocar por" : "Incluir" }));
			const caixa = el("input", {
				type: "checkbox", checked: e.trocar, disabled: e.ocupado,
				onchange: function () { e.trocar = caixa.checked; desenharEditor(); }
			});
			e.painel.append(el("label", { class: "pdp-locl-opcao-trocar", title: "Mesma caixa \"Baixar demais localizadores em aberto\" da tela Histórico de Localizadores" }, [
				caixa, document.createTextNode(" Baixar demais localizadores em aberto (trocar)")
			]));
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
				if (!lista.length) opcoes.append(el("div", { class: "pdp-locl-vazio", text: "Nenhum localizador encontrado." }));
				lista.forEach(function (n) {
					opcoes.append(el("button", {
						type: "button", class: "pdp-locl-opcao", disabled: e.ocupado,
						title: (e.trocar ? "Trocar os localizadores em aberto por \"" : "Incluir \"") + n + "\" no processo",
						text: (e.trocar ? "🔁 " : "➕ ") + n,
						onclick: function () { alterar(e.trocar ? "trocar" : "incluir", n); }
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
		if (!e || e.ocupado || !e.hist) return;
		if (acao === "remover" && !confirm("Remover o localizador \"" + nome + "\" do processo " + e.cnj + "?")) return;
		e.ocupado = true;
		e.status = { texto: ({ remover: "Removendo \"", trocar: "Trocando por \"", incluir: "Incluindo \"" })[acao] + nome + "\"…", tipo: "info" };
		desenharEditor();
		try {
			const r = acao === "remover" ? await removerNoHistorico(e.hist, nome) : await adicionarNoHistorico(e.hist, nome, acao === "trocar");
			const info = await atualizarDepois(e.item, e.hist);
			e.associados = abertosNoHistorico(e.hist.doc);
			if (!e.associados.length) e.associados = info.nomes.slice();
			const textos = acao === "remover"
				? { ok: "\"" + nome + "\" removido do processo.", ja: "\"" + nome + "\" já não estava em aberto no processo.", "sem-comando": "A linha de \"" + nome + "\" no Histórico de Localizadores não tem o comando \"Remover\".", incerto: "Clicado o \"Remover\" de \"" + nome + "\", mas não deu para confirmar. Use o ↻ para conferir." }
				: { ok: "\"" + nome + "\" " + (acao === "trocar" ? "é agora o localizador do processo." : "incluído no processo."), ja: "\"" + nome + "\" já estava no processo.", ausente: "\"" + nome + "\" não está na lista de localizadores ativos.", incerto: "Clicado o \"Adicionar\" com \"" + nome + "\", mas não deu para confirmar. Use o ↻ para conferir." };
			e.status = { texto: textos[r] || r, tipo: r === "ok" || r === "ja" ? "ok" : r === "ausente" || r === "sem-comando" ? "erro" : "info" };
			if (r === "sem-comando" || r === "incerto") e.status.diagnostico = diagnosticoHistorico(e.hist.doc);
		} catch (err) {
			console.warn(TAG, err);
			e.status = { texto: (err && err.message) || "Falha ao alterar.", tipo: "erro" };
			try { e.status.diagnostico = diagnosticoHistorico(e.hist.doc); } catch (x) { /* segue */ }
		}
		e.ocupado = false;
		if (editor === e) desenharEditor();
	}

	// ------------------------------------------------------------------
	// Início
	// ------------------------------------------------------------------

	window.__pdpLocalizadorNaListaProjudi = {
		atualizar: function (cnj) { delete lidos[cnj]; renderizar(); },
		// Para testes: leitura da linha "Localizadores:" de um documento.
		lerInformacoesGerais: lerInformacoesGerais
	};

	renderizar();
})();
