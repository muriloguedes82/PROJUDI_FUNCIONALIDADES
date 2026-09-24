// Restringe a extensão às telas do Projudi e do SEEU.
//
// Os blocos de content_scripts do manifest.json usam "*://*.tjpr.jus.br/*"
// (o Chrome exige path "*" com `match_origin_as_fallback`), o que também
// injeta os scripts em outras páginas do domínio, como o portal
// www.tjpr.jus.br - onde a barra de botões aparecia indevidamente. Este
// script roda antes de todos os demais (em ambos os blocos) e marca em
// `window.__pdpHostPermitido` se o frame pertence a um host cujo nome
// começa com "projudi" (projudi.tjpr.jus.br, projudi2.tjpr.jus.br...) ou
// "tst" (tst.tjpr.jus.br, ambiente de testes) ou
// a seeu.pje.jus.br. Cada script da extensão encerra de imediato quando a
// marca é falsa.
//
// Usa `location.origin` (e não `location.hostname`) porque os iframes
// "about:srcdoc"/"about:blank" criados pela extensão herdam a origem da
// página que os criou - o hostname deles é vazio.
(function () {
	"use strict";
	const HOST_PERMITIDO = /^((projudi|tst)[^.]*\.tjpr\.jus\.br|seeu\.pje\.jus\.br)$/i;

	function hostEfetivo() {
		let origin = window.location.origin;
		if (!origin || origin === "null") {
			const ancestors = window.location.ancestorOrigins;
			origin = ancestors && ancestors.length ? ancestors[0] : "";
		}
		try {
			return new URL(origin).hostname;
		} catch (e) {
			return "";
		}
	}

	window.__pdpHostPermitido = HOST_PERMITIDO.test(hostEfetivo());
})();
