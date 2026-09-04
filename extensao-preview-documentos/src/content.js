// Projudi - Pré-visualização de Documentos
//
// Ao passar o mouse sobre um link de arquivo na tela de Movimentações
// (ex.: <a class="link" target="_blank" href=".../arquivo.do?...">Certidao.pdf</a>),
// mostra a íntegra do documento em um painel flutuante, sem abrir nova aba.
// O documento é carregado num <iframe> apontando para a própria URL do
// Projudi, reaproveitando a sessão/cookies já autenticados do usuário.

(function () {
	"use strict";

	console.log("[Projudi Preview] content script carregado em", window.location.href);

	const OPEN_DELAY_MS = 350;
	const CLOSE_DELAY_MS = 250;
	const PANEL_WIDTH = 780;
	const PANEL_HEIGHT_RATIO = 0.85;
	const MARGIN = 12;

	let overlay = null;
	let iframe = null;
	let titleEl = null;
	let openInTabLink = null;
	let openTimer = null;
	let closeTimer = null;
	let activeLink = null;

	function isDocumentLink(el) {
		if (!(el instanceof HTMLAnchorElement)) return false;
		if (!el.classList.contains("link")) return false;
		const href = el.getAttribute("href") || "";
		return href.indexOf("/arquivo.do") !== -1;
	}

	function findDocumentLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isDocumentLink(link) ? link : null;
	}

	function buildOverlay() {
		const wrap = document.createElement("div");
		wrap.id = "pdp-overlay";
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

		wrap.addEventListener("mouseenter", cancelClose);
		wrap.addEventListener("mouseleave", scheduleClose);

		wrap.querySelector(".pdp-close").addEventListener("click", closeNow);

		const frame = wrap.querySelector(".pdp-frame");
		frame.addEventListener("load", function () {
			wrap.classList.add("pdp-loaded");
		});

		return {
			wrap: wrap,
			frame: frame,
			title: wrap.querySelector(".pdp-title"),
			openTab: wrap.querySelector(".pdp-open-tab"),
		};
	}

	function ensureOverlay() {
		if (overlay) return;
		const built = buildOverlay();
		overlay = built.wrap;
		iframe = built.frame;
		titleEl = built.title;
		openInTabLink = built.openTab;
	}

	function positionOverlay(link) {
		const rect = link.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(PANEL_WIDTH, vw - MARGIN * 2);
		const height = Math.min(vh * PANEL_HEIGHT_RATIO, vh - MARGIN * 2);

		let left = rect.right + MARGIN;
		if (left + width > vw - MARGIN) {
			left = rect.left - MARGIN - width;
		}
		if (left < MARGIN) {
			left = Math.max(MARGIN, (vw - width) / 2);
		}

		let top = rect.top - height / 2 + rect.height / 2;
		top = Math.min(Math.max(top, MARGIN), vh - height - MARGIN);
		if (top < MARGIN) top = MARGIN;

		overlay.style.left = left + "px";
		overlay.style.top = top + "px";
		overlay.style.width = width + "px";
		overlay.style.height = height + "px";
	}

	function show(link) {
		ensureOverlay();

		const href = link.getAttribute("href");
		const filename = (link.textContent || "Documento").trim();

		if (activeLink === link && overlay.classList.contains("pdp-visible")) {
			return;
		}
		activeLink = link;

		overlay.classList.remove("pdp-loaded");
		titleEl.textContent = filename;
		openInTabLink.href = href;
		iframe.src = href;

		positionOverlay(link);
		overlay.classList.add("pdp-visible");
	}

	function closeNow() {
		if (!overlay) return;
		overlay.classList.remove("pdp-visible", "pdp-loaded");
		iframe.src = "about:blank";
		activeLink = null;
	}

	function scheduleClose() {
		cancelOpen();
		clearTimeout(closeTimer);
		closeTimer = setTimeout(closeNow, CLOSE_DELAY_MS);
	}

	function cancelClose() {
		clearTimeout(closeTimer);
	}

	function cancelOpen() {
		clearTimeout(openTimer);
	}

	document.addEventListener(
		"mouseover",
		function (e) {
			const link = findDocumentLink(e.target);
			if (!link) return;
			cancelClose();
			cancelOpen();
			openTimer = setTimeout(function () {
				show(link);
			}, OPEN_DELAY_MS);
		},
		true
	);

	document.addEventListener(
		"mouseout",
		function (e) {
			const link = findDocumentLink(e.target);
			if (!link) return;
			const toEl = e.relatedTarget;
			if (overlay && toEl && overlay.contains(toEl)) return;
			scheduleClose();
		},
		true
	);

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") closeNow();
	});

	window.addEventListener("scroll", function () {
		if (activeLink && overlay && overlay.classList.contains("pdp-visible")) {
			positionOverlay(activeLink);
		}
	}, true);
})();
