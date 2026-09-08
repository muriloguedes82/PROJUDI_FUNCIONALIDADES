// Projudi - Pré-visualização de Documentos
//
// Ao passar o mouse sobre um link de arquivo na tela de Movimentações
// (ex.: <a class="link" target="_blank" href=".../arquivo.do?...">Certidao.pdf</a>),
// mostra a íntegra do documento em um painel flutuante, sem abrir nova aba.
// O documento é carregado num <iframe> apontando para a própria URL do
// Projudi, reaproveitando a sessão/cookies já autenticados do usuário.
//
// O mesmo painel flutuante é oferecido para os itens do quadro
// "Pendências" (ex.: "Análise de Juntadas: Há 1 pendência(s) de análise de
// juntada", "Análise de Conclusões: ..."). Nesse caso o link da pendência
// não aponta direto para um documento, e sim para uma tela de análise
// (ex.: analisarJuntada.do) que lista uma ou mais juntadas/conclusões
// pendentes; o link do documento de cada uma só existe no DOM depois que o
// próprio JS da página expande a linha (ícone "+") e carrega o resultado
// via AJAX. Por isso, ao passar o mouse sobre a pendência, carregamos essa
// tela dentro de um <iframe> oculto (mesma sessão/cookies do usuário),
// clicamos programaticamente nos mesmos ícones "+" que o usuário clicaria
// manualmente — disparando a mesma listagem, somente leitura, sem aceitar
// ou rejeitar nada — esperamos o resultado ser inserido no DOM e então
// abrimos um painel de pré-visualização para cada documento encontrado. Se
// houver mais de uma juntada/conclusão pendente, abrimos uma janela de
// pré-visualização para cada uma delas.

(function () {
	"use strict";

	const LOADER_ATTR = "data-pdp-loader";
	const MESSAGE_SOURCE = "projudi-preview";
	const DOC_LINK_HREF_MARKER = "/arquivo.do";

	const loaderToken = (function () {
		try {
			return window.frameElement && window.frameElement.getAttribute(LOADER_ATTR);
		} catch (e) {
			return null;
		}
	})();

	if (loaderToken) {
		runLoaderMode(loaderToken);
		return;
	}

	console.log("[Projudi Preview] content script carregado em", window.location.href);

	const OPEN_DELAY_MS = 350;
	const CLOSE_DELAY_MS = 250;
	const PANEL_WIDTH = 780;
	const PANEL_HEIGHT_RATIO = 0.85;
	const MARGIN = 12;
	const CASCADE_OFFSET = 28;
	const PENDENCIA_TIMEOUT_MS = 8000;

	const PENDENCIA_FIELDSET_SELECTOR = "#quadroPendencias";

	let openTimer = null;
	let closeTimerDoc = null;
	let closeTimerPendencia = null;

	// --- pré-visualização simples (link de documento, ex.: aba Movimentações) ---
	let docPanel = null;
	let activeDocLink = null;

	// --- pré-visualização das pendências (Análise de Juntadas / Conclusões) ---
	// pode abrir mais de um painel, um para cada juntada/conclusão pendente
	let pendenciaPanels = [];
	let activePendenciaLink = null;
	let pendenciaLoader = null; // { iframe, token, cleanup }

	function isDocumentLink(el) {
		if (!(el instanceof HTMLAnchorElement)) return false;
		if (!el.classList.contains("link")) return false;
		const href = el.getAttribute("href") || "";
		return href.indexOf(DOC_LINK_HREF_MARKER) !== -1;
	}

	function findDocumentLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isDocumentLink(link) ? link : null;
	}

	function isPendenciaLink(el) {
		if (!(el instanceof HTMLAnchorElement)) return false;
		if (!el.classList.contains("link")) return false;
		if (isDocumentLink(el)) return false; // esse já é tratado pelo preview simples
		if (!el.getAttribute("href")) return false;
		return !!el.closest(PENDENCIA_FIELDSET_SELECTOR);
	}

	function findPendenciaLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isPendenciaLink(link) ? link : null;
	}

	function buildPanel() {
		const wrap = document.createElement("div");
		wrap.className = "pdp-overlay";
		wrap.innerHTML =
			'<div class="pdp-panel" role="dialog" aria-label="Pré-visualização do documento">' +
			'  <div class="pdp-header">' +
			'    <span class="pdp-title">Documento</span>' +
			'    <div class="pdp-actions">' +
			'      <a class="pdp-open-tab" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' +
			'      <button type="button" class="pdp-close" title="Fechar (Esc)">✕</button>' +
			"    </div>" +
			"  </div>" +
			'  <div class="pdp-body">' +
			'    <div class="pdp-loading">Carregando documento…</div>' +
			'    <iframe class="pdp-frame" referrerpolicy="no-referrer"></iframe>' +
			"  </div>" +
			"</div>";
		document.body.appendChild(wrap);

		const frame = wrap.querySelector(".pdp-frame");
		frame.addEventListener("load", function () {
			wrap.classList.add("pdp-loaded");
		});

		const panel = {
			wrap: wrap,
			frame: frame,
			title: wrap.querySelector(".pdp-title"),
			openTab: wrap.querySelector(".pdp-open-tab"),
			onClose: null,
		};

		wrap.querySelector(".pdp-close").addEventListener("click", function () {
			if (panel.onClose) panel.onClose();
		});

		return panel;
	}

	function positionPanel(panel, link, cascadeIndex) {
		const rect = link.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(PANEL_WIDTH, vw - MARGIN * 2);
		const height = Math.min(vh * PANEL_HEIGHT_RATIO, vh - MARGIN * 2);
		const cascade = (cascadeIndex || 0) * CASCADE_OFFSET;

		let left = rect.right + MARGIN + cascade;
		if (left + width > vw - MARGIN) {
			left = rect.left - MARGIN - width - cascade;
		}
		if (left < MARGIN || left + width > vw - MARGIN) {
			left = Math.max(MARGIN, Math.min((vw - width) / 2 + cascade, vw - width - MARGIN));
		}

		let top = rect.top - height / 2 + rect.height / 2 + cascade;
		top = Math.min(Math.max(top, MARGIN), vh - height - MARGIN);

		panel.wrap.style.left = left + "px";
		panel.wrap.style.top = top + "px";
		panel.wrap.style.width = width + "px";
		panel.wrap.style.height = height + "px";
	}

	// ---------------------------------------------------------------------
	// Pré-visualização simples (link de documento)
	// ---------------------------------------------------------------------

	function ensureDocPanel() {
		if (docPanel) return docPanel;
		docPanel = buildPanel();
		docPanel.wrap.addEventListener("mouseenter", cancelCloseDoc);
		docPanel.wrap.addEventListener("mouseleave", scheduleCloseDoc);
		docPanel.onClose = closeDocNow;
		return docPanel;
	}

	function showDoc(link) {
		const panel = ensureDocPanel();
		const href = link.getAttribute("href");
		const filename = (link.textContent || "Documento").trim();

		if (activeDocLink === link && panel.wrap.classList.contains("pdp-visible")) {
			return;
		}
		activeDocLink = link;

		panel.wrap.classList.remove("pdp-loaded");
		panel.title.textContent = filename;
		panel.openTab.href = href;
		panel.frame.src = href;

		positionPanel(panel, link, 0);
		panel.wrap.classList.add("pdp-visible");
	}

	function closeDocNow() {
		if (!docPanel) return;
		docPanel.wrap.classList.remove("pdp-visible", "pdp-loaded");
		docPanel.frame.src = "about:blank";
		activeDocLink = null;
	}

	function scheduleCloseDoc() {
		cancelOpen();
		clearTimeout(closeTimerDoc);
		closeTimerDoc = setTimeout(closeDocNow, CLOSE_DELAY_MS);
	}

	function cancelCloseDoc() {
		clearTimeout(closeTimerDoc);
	}

	// ---------------------------------------------------------------------
	// Pré-visualização das pendências (Análise de Juntadas / Conclusões)
	// ---------------------------------------------------------------------

	function closeAllPendenciaPanels() {
		pendenciaPanels.forEach(function (panel) {
			panel.frame.src = "about:blank";
			panel.wrap.remove();
		});
		pendenciaPanels = [];
		activePendenciaLink = null;
	}

	function scheduleClosePendencia() {
		cancelOpen();
		clearTimeout(closeTimerPendencia);
		closeTimerPendencia = setTimeout(closeAllPendenciaPanels, CLOSE_DELAY_MS);
	}

	function cancelClosePendencia() {
		clearTimeout(closeTimerPendencia);
	}

	function attachPendenciaPanelBehavior(panel) {
		panel.wrap.addEventListener("mouseenter", cancelClosePendencia);
		panel.wrap.addEventListener("mouseleave", scheduleClosePendencia);
	}

	function showPendenciaMessage(link, message) {
		closeAllPendenciaPanels();

		const panel = buildPanel();
		attachPendenciaPanelBehavior(panel);
		panel.onClose = closeAllPendenciaPanels;
		panel.title.textContent = "Pendências";
		panel.openTab.href = link.getAttribute("href");

		const body = panel.wrap.querySelector(".pdp-body");
		panel.frame.remove();
		const msg = document.createElement("div");
		msg.className = "pdp-message";
		msg.textContent = message;
		body.appendChild(msg);

		positionPanel(panel, link, 0);
		panel.wrap.classList.add("pdp-visible", "pdp-loaded");

		pendenciaPanels = [panel];
		activePendenciaLink = link;
	}

	function showPendenciaDocs(link, docs) {
		closeAllPendenciaPanels();
		activePendenciaLink = link;

		docs.forEach(function (doc, index) {
			const panel = buildPanel();
			attachPendenciaPanelBehavior(panel);
			panel.onClose = function () {
				panel.frame.src = "about:blank";
				panel.wrap.remove();
				pendenciaPanels = pendenciaPanels.filter(function (p) {
					return p !== panel;
				});
			};

			panel.title.textContent = docs.length > 1 ? doc.text + " (" + (index + 1) + "/" + docs.length + ")" : doc.text;
			panel.openTab.href = doc.href;
			panel.frame.src = doc.href;

			positionPanel(panel, link, index);
			panel.wrap.classList.add("pdp-visible");

			pendenciaPanels.push(panel);
		});
	}

	function cleanupPendenciaLoader() {
		if (!pendenciaLoader) return;
		window.removeEventListener("message", pendenciaLoader.onMessage);
		clearTimeout(pendenciaLoader.timeoutId);
		if (pendenciaLoader.iframe.parentNode) {
			pendenciaLoader.iframe.parentNode.removeChild(pendenciaLoader.iframe);
		}
		pendenciaLoader = null;
	}

	function openPendenciaGroup(link) {
		if (activePendenciaLink === link && (pendenciaPanels.length || (pendenciaLoader && pendenciaLoader.link === link))) {
			return;
		}

		const href = link.getAttribute("href");
		if (!href) return;

		cleanupPendenciaLoader();
		activePendenciaLink = link;

		const token = "pdp-" + Date.now() + "-" + Math.random().toString(36).slice(2);

		const iframe = document.createElement("iframe");
		iframe.setAttribute(LOADER_ATTR, token);
		iframe.style.position = "fixed";
		iframe.style.top = "0";
		iframe.style.left = "-9999px";
		iframe.style.width = "1px";
		iframe.style.height = "1px";
		iframe.style.opacity = "0";
		iframe.style.pointerEvents = "none";
		iframe.setAttribute("aria-hidden", "true");

		function onMessage(e) {
			if (e.origin !== window.location.origin) return;
			const data = e.data;
			if (!data || data.source !== MESSAGE_SOURCE || data.type !== "pendencia-docs" || data.token !== token) return;

			cleanupPendenciaLoader();
			if (activePendenciaLink !== link) return;

			const docs = Array.isArray(data.docs) ? data.docs : [];
			if (!docs.length) {
				showPendenciaMessage(
					link,
					"Nenhum documento encontrado para pré-visualização. Clique no link para abrir a análise completa."
				);
				return;
			}
			showPendenciaDocs(link, docs);
		}

		const timeoutId = setTimeout(function () {
			cleanupPendenciaLoader();
			if (activePendenciaLink === link && !pendenciaPanels.length) {
				showPendenciaMessage(
					link,
					"Não foi possível carregar a pré-visualização a tempo. Clique no link para abrir a análise completa."
				);
			}
		}, PENDENCIA_TIMEOUT_MS);

		pendenciaLoader = { iframe: iframe, link: link, onMessage: onMessage, timeoutId: timeoutId };

		window.addEventListener("message", onMessage);
		document.body.appendChild(iframe);
		iframe.src = href;
	}

	function cancelOpen() {
		clearTimeout(openTimer);
	}

	document.addEventListener(
		"mouseover",
		function (e) {
			const docLink = findDocumentLink(e.target);
			if (docLink) {
				cancelCloseDoc();
				cancelOpen();
				openTimer = setTimeout(function () {
					showDoc(docLink);
				}, OPEN_DELAY_MS);
				return;
			}

			const pendenciaLink = findPendenciaLink(e.target);
			if (pendenciaLink) {
				cancelClosePendencia();
				cancelOpen();
				openTimer = setTimeout(function () {
					openPendenciaGroup(pendenciaLink);
				}, OPEN_DELAY_MS);
			}
		},
		true
	);

	document.addEventListener(
		"mouseout",
		function (e) {
			const docLink = findDocumentLink(e.target);
			if (docLink) {
				const toEl = e.relatedTarget;
				if (docPanel && toEl && docPanel.wrap.contains(toEl)) return;
				scheduleCloseDoc();
				return;
			}

			const pendenciaLink = findPendenciaLink(e.target);
			if (pendenciaLink) {
				const toEl = e.relatedTarget;
				const stillInsideAPanel =
					toEl &&
					pendenciaPanels.some(function (panel) {
						return panel.wrap.contains(toEl);
					});
				if (stillInsideAPanel) return;
				scheduleClosePendencia();
			}
		},
		true
	);

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") {
			closeDocNow();
			cleanupPendenciaLoader();
			closeAllPendenciaPanels();
		}
	});

	window.addEventListener(
		"scroll",
		function () {
			if (activeDocLink && docPanel && docPanel.wrap.classList.contains("pdp-visible")) {
				positionPanel(docPanel, activeDocLink, 0);
			}
			if (activePendenciaLink && pendenciaPanels.length) {
				pendenciaPanels.forEach(function (panel, index) {
					positionPanel(panel, activePendenciaLink, index);
				});
			}
		},
		true
	);

	// ---------------------------------------------------------------------
	// Modo "loader": executado dentro do <iframe> oculto criado acima.
	// ---------------------------------------------------------------------

	function runLoaderMode(token) {
		const EXPAND_ICON_SELECTOR = 'a[id^="linkArquivos"] img, img[onclick*="showDetail"], img[id^="icon"]';

		function collectDocsFrom(scope) {
			const anchors = Array.prototype.slice.call(scope.querySelectorAll("a.link"));
			const docs = [];

			anchors.forEach(function (a) {
				const href = a.getAttribute("href") || "";
				if (href.indexOf(DOC_LINK_HREF_MARKER) === -1) return;

				let absolute;
				try {
					absolute = new URL(href, document.baseURI).href;
				} catch (e) {
					absolute = href;
				}

				docs.push({ href: absolute, text: (a.textContent || "Documento").trim() });
			});

			return docs;
		}

		function dedupe(docs) {
			const seen = Object.create(null);
			return docs.filter(function (doc) {
				if (seen[doc.href]) return false;
				seen[doc.href] = true;
				return true;
			});
		}

		function finish(docs) {
			try {
				window.parent.postMessage(
					{ source: MESSAGE_SOURCE, type: "pendencia-docs", token: token, docs: dedupe(docs) },
					window.location.origin
				);
			} catch (e) {
				/* ignore */
			}
		}

		// A partir do ícone "+" (ex.: id="icon0"), localiza o contêiner que o
		// Projudi preenche com o resultado da expansão (ex.: id="row0"/"div0"),
		// para restringir a coleta de documentos só ao que essa linha trouxe.
		function findContainerForIcon(icon, row) {
			const id = icon.id || "";
			const match = id.match(/(\d+)$/);
			if (match) {
				const suffix = match[1];
				const byRow = document.getElementById("row" + suffix);
				if (byRow) return byRow;
				const byDiv = document.getElementById("div" + suffix);
				if (byDiv) return byDiv;
			}
			const next = row && row.nextElementSibling;
			if (next && next.tagName === "TR") return next;
			return row;
		}

		function run() {
			// A tela de análise (analisarJuntada.do e afins) normalmente lista o
			// HISTÓRICO completo de juntadas/conclusões do processo, não só as
			// pendentes — só as linhas com checkbox de seleção são as realmente
			// pendentes de análise (as demais aparecem apenas para contexto).
			// Por isso, restringimos a expansão/coleta às linhas com checkbox;
			// se a tela não seguir esse padrão, caímos de volta no comportamento
			// de expandir e coletar a página inteira.
			const checkboxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]'));

			const items = [];
			checkboxes.forEach(function (checkbox) {
				const row = checkbox.closest("tr");
				if (!row) return;
				const icon = row.querySelector(EXPAND_ICON_SELECTOR);
				items.push({
					row: row,
					icon: icon,
					container: icon ? findContainerForIcon(icon, row) : row,
				});
			});

			if (items.length) {
				items.forEach(function (item) {
					if (item.icon) {
						try {
							item.icon.click();
						} catch (e) {
							/* ignore */
						}
					}
				});

				setTimeout(function () {
					let docs = [];
					items.forEach(function (item) {
						docs = docs.concat(collectDocsFrom(item.container));
					});
					finish(docs);
				}, 1500);
				return;
			}

			// Sem checkboxes de pendência: mantém o comportamento anterior
			// (expande tudo que houver na página e coleta o resultado inteiro).
			const expandIcons = Array.prototype.slice.call(document.querySelectorAll(EXPAND_ICON_SELECTOR));

			if (!expandIcons.length) {
				finish(collectDocsFrom(document));
				return;
			}

			expandIcons.forEach(function (icon) {
				try {
					icon.click();
				} catch (e) {
					/* ignore */
				}
			});

			setTimeout(function () {
				finish(collectDocsFrom(document));
			}, 1500);
		}

		if (document.readyState === "complete" || document.readyState === "interactive") {
			run();
		} else {
			document.addEventListener("DOMContentLoaded", run, { once: true });
		}
	}
})();
