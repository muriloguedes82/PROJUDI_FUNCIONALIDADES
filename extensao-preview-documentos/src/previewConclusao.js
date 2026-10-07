// Projudi/SEEU - Documento do Juiz ao passar o mouse no Retorno de Conclusão
//
// Na lista "Retorno de Conclusão" (processo/conclusao.do, no Projudi e no
// SEEU), cada linha tem o link "Analisar", que abre a tela "Dados da
// Conclusão" com o despacho/decisão/sentença que o Juiz fez. Ao pousar o
// mouse sobre esse "Analisar", a extensão lê essa tela por trás (sem sair
// da lista) e mostra só o(s) arquivo(s) dela, cada um numa janela
// sobreposta — mesma ideia da pré-visualização do processo no Decurso de
// Prazo (previewProcesso.js), mas aqui só com o documento, não o processo
// inteiro.
//
// Leitura da tela "Dados da Conclusão":
//   1. fetch() da mesma URL do "Analisar" (mesma sessão) e coleta dos links
//      de arquivo (…/arquivo.do?…) que já vêm no HTML;
//   2. se não vier nenhum (o arquivo pode só aparecer depois de abrir o "+"
//      da linha), carrega a tela num iframe oculto e espera os links
//      aparecerem — se nada surgir sozinho, clica uma vez nos "+" da tela,
//      como o usuário faria (somente leitura: nada é analisado ou
//      finalizado).
// Se a tela tiver arquivos em mais de um quadro, fica só com os do primeiro
// quadro que tiver arquivo (é o da conclusão; os demais seriam contexto do
// processo).
//
// A lista nunca navega: as janelas fecham ao tirar o mouse delas (ou com
// "✕"/Esc); "📌 Fixar" mantém todas abertas até o "✕". Clicar no
// "Analisar" continua funcionando como sempre.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpPreviewConclusao) return;

	const TELA = /^\/(projudi|seeu)\/processo\/conclusao\.do$/;
	if (!TELA.test(location.pathname)) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	window.__pdpPreviewConclusao = true;

	const IFRAME_CLASS = "pdp-proc-preview-iframe";
	const OPEN_DELAY_MS = 450;
	const CLOSE_DELAY_MS = 300;
	const PANEL_WIDTH = 780;
	const PANEL_HEIGHT_RATIO = 0.85;
	const MARGIN = 12;
	const CASCADE_OFFSET = 28;
	const TIMEOUT_MS = 15000;
	const EXPAND_ICON_SELECTOR = 'a[id^="linkArquivos"] img, img[onclick*="showDetail"], img[id^="icon"]';

	let panels = [];
	let activeLink = null;
	let openTimer = null;
	let closeTimer = null;
	let fixado = false;
	let carga = 0; // identifica a busca atual (o mouse pode ir para outra linha)
	const cache = new Map(); // URL do "Analisar" -> [{ href, text }]

	const norm = function (v) {
		return String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
	};

	// --- o "Analisar" da linha ---------------------------------------------------

	function urlConclusao(valor, base) {
		try {
			const url = new URL(valor, base || location.href);
			if (url.origin !== location.origin || !TELA.test(url.pathname) || !url.search || url.hash) return null;
			return url.href;
		} catch (e) {
			return null;
		}
	}

	// Link "Analisar" de uma linha da lista (não o botão "Analisar" da própria
	// tela "Dados da Conclusão", que tem o mesmo endereço base).
	function findAnalisar(target) {
		const link = target && target.closest ? target.closest("a[href]") : null;
		if (!link || link.closest("#quadroPendencias") || panels.some(function (p) { return p.wrap.contains(link); })) return null;
		if (!link.closest("tr") || !link.closest("td")) return null;
		const rotulo = norm(link.textContent + " " + (link.title || "") + " " + Array.prototype.map.call(link.querySelectorAll("img"), function (img) {
			return (img.alt || "") + " " + (img.title || "");
		}).join(" "));
		if (rotulo.indexOf("analisar") === -1) return null;
		return urlConclusao(link.getAttribute("href")) ? link : null;
	}

	function numeroDoProcesso(link) {
		const row = link.closest("tr");
		const m = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(row ? row.textContent : "");
		return m ? m[0] : "";
	}

	// --- leitura da tela "Dados da Conclusão" ------------------------------------

	function linksDeArquivo(doc, base) {
		return Array.prototype.filter.call(doc.querySelectorAll("a[href]"), function (a) {
			return (a.getAttribute("href") || "").indexOf("/arquivo.do") !== -1;
		}).map(function (a) {
			let href;
			try { href = new URL(a.getAttribute("href"), base).href; } catch (e) { return null; }
			return { el: a, href: href, text: (a.textContent || "").replace(/\s+/g, " ").trim() || "Documento" };
		}).filter(Boolean);
	}

	// Só o primeiro quadro (fieldset/tabela de nível mais alto) que tiver
	// arquivo, sem repetir o mesmo arquivo.
	function documentosDaConclusao(doc, base) {
		const todos = linksDeArquivo(doc, base);
		if (!todos.length) return [];
		const quadro = function (el) {
			return el.closest("fieldset") || el.closest("form") || doc.body;
		};
		const primeiro = quadro(todos[0].el);
		const vistos = Object.create(null);
		return todos.filter(function (d) {
			if (quadro(d.el) !== primeiro || vistos[d.href]) return false;
			vistos[d.href] = true;
			return true;
		}).map(function (d) {
			return { href: d.href, text: d.text };
		});
	}

	async function lerPorFetch(url) {
		const resposta = await fetch(url, { credentials: "same-origin" });
		if (!resposta.ok) throw new Error("o sistema respondeu " + resposta.status);
		const bytes = await resposta.arrayBuffer();
		const inicio = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
		const m = /charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(inicio);
		const doc = new DOMParser().parseFromString(new TextDecoder((m && m[1]) || "windows-1252").decode(bytes), "text/html");
		return documentosDaConclusao(doc, resposta.url);
	}

	// Iframe oculto (navegação de verdade): para quando o arquivo só aparece
	// depois do "+" da linha, carregado pelo próprio script da tela.
	function lerNavegando(url) {
		return new Promise(function (resolve) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "preview-conclusao");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText = "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
			const inicio = Date.now();
			let clicou = false;
			let carregado = 0;
			function fim(docs) {
				clearInterval(timer);
				iframe.remove();
				resolve(docs);
			}
			function verificar() {
				let doc = null;
				try { doc = iframe.contentDocument; } catch (e) { /* segue */ }
				const decorrido = Date.now() - inicio;
				if (doc && doc.body && doc.URL !== "about:blank" && doc.readyState !== "loading") {
					if (!carregado) carregado = Date.now();
					const docs = documentosDaConclusao(doc, doc.URL);
					if (docs.length) return fim(docs);
					// Nada sozinho em 2s (a pré-visualização de pendências pode
					// estar abrindo os "+" por conta própria): abre uma vez.
					if (!clicou && Date.now() - carregado > 2000) {
						clicou = true;
						doc.querySelectorAll(EXPAND_ICON_SELECTOR).forEach(function (icon) {
							try { icon.click(); } catch (e) { /* segue */ }
						});
					}
					if (clicou && Date.now() - carregado > 6000) return fim([]);
				}
				if (decorrido > TIMEOUT_MS) fim([]);
			}
			const timer = setInterval(verificar, 200);
			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	async function documentos(url) {
		if (cache.has(url)) return cache.get(url);
		let docs = [];
		try {
			docs = await lerPorFetch(url);
		} catch (e) {
			console.warn("[Projudi Documento da Conclusão] falha ao ler a tela:", e);
		}
		if (!docs.length) docs = await lerNavegando(url);
		if (docs.length) cache.set(url, docs);
		return docs;
	}

	// --- janelas ------------------------------------------------------------------

	function buildPanel() {
		const wrap = document.createElement("div");
		wrap.className = "pdp-pc-overlay";
		wrap.innerHTML =
			'<div class="pdp-pc-panel">' +
			'<div class="pdp-pc-header">' +
			'<span class="pdp-pc-title"></span>' +
			'<span class="pdp-pc-actions">' +
			'<button type="button" class="pdp-pc-pin" title="Manter as janelas abertas ao tirar o mouse">📌 Fixar</button>' +
			'<a class="pdp-pc-open-tab" target="_blank" rel="noopener" title="Abrir o documento numa nova aba">Abrir em nova aba ↗</a>' +
			'<button type="button" class="pdp-pc-close" title="Fechar (Esc)">✕</button>' +
			"</span></div>" +
			'<div class="pdp-pc-body"><div class="pdp-pc-loading">Carregando o documento…</div></div>' +
			"</div>";
		wrap.addEventListener("mouseenter", cancelClose);
		wrap.addEventListener("mouseleave", scheduleClose);
		wrap.querySelector(".pdp-pc-close").addEventListener("click", closeNow);
		wrap.querySelector(".pdp-pc-pin").addEventListener("click", function () {
			setFixado(!fixado);
		});
		document.body.appendChild(wrap);
		return {
			wrap: wrap,
			title: wrap.querySelector(".pdp-pc-title"),
			openTab: wrap.querySelector(".pdp-pc-open-tab"),
			pin: wrap.querySelector(".pdp-pc-pin"),
			body: wrap.querySelector(".pdp-pc-body"),
			loading: wrap.querySelector(".pdp-pc-loading"),
			frame: null
		};
	}

	function setFixado(valor) {
		fixado = !!valor;
		panels.forEach(function (p) {
			p.wrap.classList.toggle("pdp-pc-fixado", fixado);
			p.pin.textContent = fixado ? "📌 Fixado" : "📌 Fixar";
			p.pin.title = fixado ? "Clique para as janelas voltarem a fechar ao tirar o mouse" : "Manter as janelas abertas ao tirar o mouse";
		});
		if (fixado) cancelClose();
	}

	// Uma janela ao lado do "Analisar" e as seguintes em cascata.
	function positionPanel(p, link, index) {
		const rect = link.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(PANEL_WIDTH, vw - MARGIN * 2);
		const height = Math.min(vh * PANEL_HEIGHT_RATIO, vh - MARGIN * 2);
		const desloc = index * CASCADE_OFFSET;

		let left = rect.right + MARGIN + desloc;
		if (left + width > vw - MARGIN) left = rect.left - MARGIN - width - desloc;
		if (left < MARGIN) left = Math.max(MARGIN, Math.min((vw - width) / 2 + desloc, vw - width - MARGIN));
		let top = rect.top - height / 2 + rect.height / 2 + desloc;
		top = Math.min(Math.max(top, MARGIN), vh - height - MARGIN);

		const st = p.wrap.style;
		st.left = left + "px";
		st.top = top + "px";
		st.width = width + "px";
		st.height = height + "px";
	}

	function removePanels() {
		panels.forEach(function (p) {
			if (p.frame) p.frame.src = "about:blank";
			p.wrap.remove();
		});
		panels = [];
	}

	function openTitulo(link) {
		const numero = numeroDoProcesso(link);
		return numero ? "Processo " + numero : "Retorno de Conclusão";
	}

	async function show(link) {
		if (activeLink === link && panels.length) return;
		const url = urlConclusao(link.getAttribute("href"));
		if (!url) return;
		removePanels();
		fixado = false;
		activeLink = link;
		const id = ++carga;

		const espera = buildPanel();
		panels = [espera];
		espera.title.textContent = openTitulo(link) + " — documento da conclusão";
		espera.openTab.href = url;
		espera.openTab.title = "Abrir a tela Dados da Conclusão numa nova aba";
		espera.loading.textContent = "Procurando o documento da conclusão…";
		positionPanel(espera, link, 0);
		espera.wrap.classList.add("pdp-pc-visible");

		const docs = await documentos(url);
		if (id !== carga || activeLink !== link) return; // o mouse foi para outra linha

		if (!docs.length) {
			espera.loading.textContent = "Nenhum documento encontrado na tela Dados da Conclusão. Clique em \"Analisar\" para abrir a tela completa.";
			return;
		}
		const manterFixado = fixado;
		removePanels();
		docs.forEach(function (doc, index) {
			const p = buildPanel();
			p.title.textContent = openTitulo(link) + " — " + doc.text + (docs.length > 1 ? " (" + (index + 1) + "/" + docs.length + ")" : "");
			p.title.title = doc.text;
			p.openTab.href = doc.href;
			const iframe = document.createElement("iframe");
			iframe.className = IFRAME_CLASS;
			iframe.setAttribute("data-pdp-hide-button-group", "");
			iframe.addEventListener("load", function () {
				p.wrap.classList.add("pdp-pc-loaded");
			});
			p.body.appendChild(iframe);
			p.frame = iframe;
			iframe.src = doc.href;
			positionPanel(p, link, index);
			p.wrap.classList.add("pdp-pc-visible");
			panels.push(p);
		});
		setFixado(manterFixado);
		// A janela de espera sumiu debaixo do mouse sem "mouseleave": se o
		// mouse já não está no "Analisar" nem numa janela, fecha como sempre.
		const alvo = ultimoAlvo;
		if (!(alvo && (link.contains(alvo) || dentroDeJanela(alvo)))) scheduleClose();
	}

	function closeNow() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		carga++;
		removePanels();
		activeLink = null;
		fixado = false;
	}

	function scheduleClose() {
		clearTimeout(openTimer);
		if (fixado) return;
		clearTimeout(closeTimer);
		closeTimer = setTimeout(closeNow, CLOSE_DELAY_MS);
	}

	function cancelClose() {
		clearTimeout(closeTimer);
	}

	function dentroDeJanela(el) {
		return !!el && panels.some(function (p) { return p.wrap.contains(el); });
	}

	document.addEventListener(
		"mouseover",
		function (e) {
			const link = findAnalisar(e.target);
			if (!link) return;
			cancelClose();
			clearTimeout(openTimer);
			if (fixado && panels.length) return;
			openTimer = setTimeout(function () {
				show(link);
			}, OPEN_DELAY_MS);
		},
		true
	);

	document.addEventListener(
		"mouseout",
		function (e) {
			const link = findAnalisar(e.target);
			if (!link) return;
			const toEl = e.relatedTarget;
			if (toEl && (link.contains(toEl) || dentroDeJanela(toEl))) return;
			scheduleClose();
		},
		true
	);

	let ultimoAlvo = null;
	document.addEventListener(
		"mousemove",
		function (e) {
			ultimoAlvo = e.target;
		},
		{ capture: true, passive: true }
	);

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") closeNow();
	});
})();
