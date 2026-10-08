// Projudi/SEEU - Documento do Juiz ao passar o mouse no Retorno de Conclusão
//
// Na lista "Retorno de Conclusão" (processo/conclusao.do, no Projudi e no
// SEEU), cada linha tem o link "Analisar". Para ver o despacho/decisão/
// sentença que o Juiz fez, o usuário precisaria clicar nele (tela "Dados da
// Conclusão"), depois no botão "Analisar" dessa tela (tela "Movimentar
// Processo") e só então abrir o arquivo da linha "Documentos:". Ao pousar o
// mouse sobre o "Analisar" da lista, a extensão percorre essas duas telas
// por trás (sem sair da lista) e mostra só o(s) arquivo(s) da linha
// "Documentos:", cada um numa janela sobreposta — mesma ideia da
// pré-visualização do processo no Decurso de Prazo (previewProcesso.js),
// mas aqui só com o documento, não o processo inteiro.
//
// As telas são lidas direto (fetch, mesma sessão); se a leitura não trouxer
// o documento, elas são abertas num iframe oculto, seguindo o mesmo
// endereço do botão "Analisar". Somente leitura: nada é analisado nem
// finalizado.
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

	// --- leitura das telas "Dados da Conclusão" e "Movimentar Processo" ----------
	//
	// O "Analisar" da lista abre "Dados da Conclusão", que não tem arquivo: o
	// documento só aparece na tela seguinte, a do botão "Analisar" dela
	// (<input id="editButton" onclick="...document.location.href='...'">),
	// "Movimentar Processo", na linha "Documentos:" (tabela Descrição /
	// Assinado Por / Arquivo / Nível de Sigilo). Essa mesma tela também lista,
	// mais abaixo, as "Movimentações Realizadas" do processo, com outros
	// arquivos — por isso só a linha "Documentos:" conta.

	function urlDoBotaoAnalisar(doc, base) {
		const botao = doc.querySelector("#editButton") ||
			Array.prototype.find.call(doc.querySelectorAll('input[type="button"], button'), function (b) {
				return norm(b.value || b.textContent) === "analisar";
			});
		const m = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec((botao && botao.getAttribute("onclick")) || "");
		return m ? urlConclusao(m[1], base) : null;
	}

	function linksDeArquivo(raiz, base) {
		const vistos = Object.create(null);
		return Array.prototype.filter.call(raiz.querySelectorAll("a[href]"), function (a) {
			return (a.getAttribute("href") || "").indexOf("/arquivo.do") !== -1;
		}).map(function (a) {
			let href;
			try { href = new URL(a.getAttribute("href"), base).href; } catch (e) { return null; }
			if (vistos[href]) return null;
			vistos[href] = true;
			return { href: href, text: (a.textContent || "").replace(/\s+/g, " ").trim() || "Documento" };
		}).filter(Boolean);
	}

	// Célula ao lado do rótulo "Documentos:" (fora do quadro Pendências e das
	// Movimentações Realizadas).
	function celulaDocumentos(doc) {
		const rotulos = doc.querySelectorAll("td.labelRadio, td.label");
		for (const td of rotulos) {
			if (norm(td.textContent) !== "documentos:" || td.closest("#quadroPendencias")) continue;
			const celula = td.nextElementSibling;
			if (celula) return celula;
		}
		return null;
	}

	function documentosDaTela(doc, base) {
		const celula = celulaDocumentos(doc);
		return celula ? linksDeArquivo(celula, base) : [];
	}

	async function buscar(url) {
		const resposta = await fetch(url, { credentials: "same-origin" });
		if (!resposta.ok) throw new Error("o sistema respondeu " + resposta.status);
		const bytes = await resposta.arrayBuffer();
		const inicio = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
		const m = /charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(inicio);
		const doc = new DOMParser().parseFromString(new TextDecoder((m && m[1]) || "windows-1252").decode(bytes), "text/html");
		return { doc: doc, url: resposta.url };
	}

	// Dados da Conclusão -> (botão Analisar) -> Movimentar Processo.
	async function lerPorFetch(url) {
		const dados = await buscar(url);
		let docs = documentosDaTela(dados.doc, dados.url);
		if (docs.length) return { docs: docs };
		const seguinte = urlDoBotaoAnalisar(dados.doc, dados.url);
		if (!seguinte) return { docs: [] };
		const mov = await buscar(seguinte);
		return { docs: documentosDaTela(mov.doc, mov.url), seguinte: seguinte };
	}

	// Iframe oculto (navegação de verdade), para quando a leitura direta não
	// traz a tela completa: abre a tela e, se for a "Dados da Conclusão",
	// segue o endereço do botão "Analisar" dela, como o clique faria.
	function lerNavegando(url) {
		return new Promise(function (resolve) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "preview-conclusao");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText = "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
			const inicio = Date.now();
			let seguiu = false;
			let carregadoEm = 0;
			let ultimoURL = "";
			function fim(docs) {
				clearInterval(timer);
				iframe.remove();
				resolve(docs);
			}
			function verificar() {
				let doc = null;
				try { doc = iframe.contentDocument; } catch (e) { /* segue */ }
				if (Date.now() - inicio > TIMEOUT_MS) return fim([]);
				if (!doc || !doc.body || doc.URL === "about:blank" || doc.readyState === "loading") return;
				if (doc.URL !== ultimoURL) {
					ultimoURL = doc.URL;
					carregadoEm = Date.now();
				}
				const docs = documentosDaTela(doc, doc.URL);
				if (docs.length) return fim(docs);
				const seguinte = !seguiu && urlDoBotaoAnalisar(doc, doc.URL);
				if (seguinte) {
					seguiu = true;
					iframe.src = seguinte;
					return;
				}
				if (Date.now() - carregadoEm > 3000) fim([]);
			}
			const timer = setInterval(verificar, 200);
			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	async function documentos(url) {
		if (cache.has(url)) return cache.get(url);
		let docs = [];
		let alvo = url;
		try {
			const r = await lerPorFetch(url);
			docs = r.docs;
			if (r.seguinte) alvo = r.seguinte;
		} catch (e) {
			console.warn("[Projudi Documento da Conclusão] falha ao ler a tela:", e);
		}
		if (!docs.length) docs = await lerNavegando(alvo);
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
			espera.loading.textContent = "Nenhum documento encontrado na linha \"Documentos\" da conclusão. Clique em \"Analisar\" para abrir a tela completa.";
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
