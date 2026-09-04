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
// não aponta diretamente para um documento, e sim para a tela de análise
// (ex.: analisarJuntada.do) que pode listar uma ou mais juntadas/conclusões
// pendentes. Ao passar o mouse, buscamos essa tela em segundo plano e
// abrimos um painel de pré-visualização para cada documento encontrado —
// se houver mais de uma juntada/conclusão pendente, abrimos uma janela de
// pré-visualização para cada uma delas.

(function () {
	"use strict";

	console.log("[Projudi Preview] content script carregado em", window.location.href);

	const OPEN_DELAY_MS = 350;
	const CLOSE_DELAY_MS = 250;
	const PANEL_WIDTH = 780;
	const PANEL_HEIGHT_RATIO = 0.85;
	const MARGIN = 12;
	const CASCADE_OFFSET = 28;

	const DOC_LINK_HREF_MARKER = "/arquivo.do";
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
	let pendenciaRequestToken = 0;

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

	function extractDocumentLinks(html, baseHref) {
		const parser = new DOMParser();
		const parsed = parser.parseFromString(html, "text/html");
		const anchors = Array.prototype.slice.call(parsed.querySelectorAll("a.link"));
		const seen = Object.create(null);
		const result = [];

		anchors.forEach(function (a) {
			const href = a.getAttribute("href") || "";
			if (href.indexOf(DOC_LINK_HREF_MARKER) === -1) return;

			let absolute;
			try {
				absolute = new URL(href, baseHref).href;
			} catch (e) {
				absolute = href;
			}
			if (seen[absolute]) return;
			seen[absolute] = true;

			result.push({ href: absolute, text: (a.textContent || "Documento").trim() });
		});

		return result;
	}

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

	function openPendenciaGroup(link) {
		if (activePendenciaLink === link && pendenciaPanels.length) return;

		const href = link.getAttribute("href");
		if (!href) return;

		const token = ++pendenciaRequestToken;
		activePendenciaLink = link;

		fetch(href, { credentials: "same-origin" })
			.then(function (resp) {
				if (!resp.ok) throw new Error("HTTP " + resp.status);
				return resp.text();
			})
			.then(function (html) {
				if (token !== pendenciaRequestToken) return;

				const docs = extractDocumentLinks(html, href);
				if (!docs.length) {
					showPendenciaMessage(
						link,
						"Nenhum documento encontrado para pré-visualização. Clique no link para abrir a análise completa."
					);
					return;
				}

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
			})
			.catch(function (err) {
				if (token !== pendenciaRequestToken) return;
				console.warn("[Projudi Preview] Falha ao carregar pré-visualização das pendências:", err);
				showPendenciaMessage(
					link,
					"Não foi possível carregar a pré-visualização. Clique no link para abrir a análise completa."
				);
			});
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
})();
