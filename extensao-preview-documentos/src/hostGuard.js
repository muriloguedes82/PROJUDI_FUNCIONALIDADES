// Restringe a extensão às telas do Projudi e do SEEU e a bloqueia nos
// perfis de advogado(a) e de assessor(a) de advogado.
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
//
// Bloqueio por perfil: a extensão é de uso interno (servidores) e não deve
// funcionar para advogado(a) nem para assessor(a) de advogado. Como a
// mesma marca `__pdpHostPermitido` é conferida por todos os scripts, basta
// deixá-la falsa quando o perfil for de advocacia. A identificação usa
// várias camadas independentes, e qualquer uma delas basta para bloquear:
//   1. campo "Atribuição:" do cabeçalho (#userinfo), ex. "Advogada
//      (PR12345)" ou "Assessor de Advogado ...";
//   2. título da mesa inicial ("Mesa do(a) Advogado ...") e o formulário
//      #mesaAdvogadoForm;
//   3. endereço do próprio frame em telas exclusivas da advocacia
//      (mesaAdvogado.do, processosAdvogado.do, intimacaoAdvogado.do...);
//   4. links do menu do Projudi que só existem para advogados (Início da
//      "área do advogado", Intimações/Citações do advogado...);
//   5. as camadas 1 a 4 aplicadas também aos frames ancestrais e aos
//      demais frames da aba (mesma origem), já que o cabeçalho e o menu
//      ficam em frames diferentes das telas do processo;
//   6. memória do perfil detectado: localStorage/sessionStorage (leitura
//      síncrona, por origem) e chrome.storage.local (vale para todos os
//      hosts e sobrevive ao fechamento do navegador). A memória só é
//      apagada quando o campo "Atribuição:" mostra um perfil que não é de
//      advocacia (ex. troca de perfil ou login de outro usuário).
// Se o perfil for detectado depois que os scripts já rodaram (conteúdo
// carregado tardiamente), os elementos da extensão são ocultados e o
// bloqueio passa a valer nas próximas telas.
(function () {
	"use strict";
	const HOST_PERMITIDO = /^((projudi|tst)[^.]*\.tjpr\.jus\.br|seeu\.pje\.jus\.br)$/i;
	const CHAVE_BLOQUEIO = "pdpPerfilAdvocaciaBloqueado";
	const ATTR_BLOQUEIO = "data-pdp-perfil-bloqueado";

	// Qualquer menção a advogado(a) na atribuição cobre "Advogado",
	// "Advogada", "Assessor de Advogado", "Assessora do(a) Advogado(a)"...
	const RE_ATRIBUICAO_ADVOCACIA = /advogad/i;
	const RE_TITULO_MESA = /mesa\s+do\(?a?\)?\s+(assessor\(?a?\)?\s+d[eoa]\(?a?\)?\s+)?advogad/i;
	// Telas que só existem na área da advocacia. Não inclui telas que
	// servidores também usam (ex. processo/advogadosParte.do).
	const RE_PATH_ADVOCACIA = /\/(mesa\w*Advogad\w*|processosAdvogado|intimacaoAdvogado|citacaoAdvogado|sustentacaoOralAdvogado|assessorAdvogado\w*)\.do\b/i;
	const RE_TITULO_LINK = /(á|a)rea\s+do\s+advogado/i;

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

	function normalizar(texto) {
		return String(texto || "").replace(/\s+/g, " ").trim();
	}

	// Lê o valor do campo "Atribuição:" (ou "Perfil:") do cabeçalho.
	// Retorna null quando o campo não existe no documento.
	function lerAtribuicao(doc) {
		const labels = doc.querySelectorAll("#userinfo .userinfo_label, .userinfo_label");
		for (const label of labels) {
			const nome = normalizar(label.textContent).toLowerCase();
			// Só o início do rótulo: tolera acentuação corrompida por encoding.
			if (!/^(atribui|perfil\b)/.test(nome)) continue;
			let valor = "";
			let irmao = label.nextElementSibling;
			while (irmao && !valor) {
				valor = normalizar(irmao.getAttribute("title") || irmao.textContent);
				irmao = irmao.nextElementSibling;
			}
			if (!valor && label.parentElement) {
				valor = normalizar(label.parentElement.textContent.replace(label.textContent, ""));
			}
			return valor;
		}
		return null;
	}

	// Examina um documento. Retorna "advocacia", "outro" (atribuição
	// conhecida e sem relação com advocacia) ou null (nada conclusivo).
	function avaliarDocumento(doc) {
		if (!doc) return null;
		try {
			const path = (doc.location && doc.location.pathname) || "";
			if (RE_PATH_ADVOCACIA.test(path)) return "advocacia";
			if (!doc.documentElement) return null;

			const atribuicao = lerAtribuicao(doc);
			if (atribuicao && RE_ATRIBUICAO_ADVOCACIA.test(atribuicao)) return "advocacia";

			if (doc.getElementById("mesaAdvogadoForm")) return "advocacia";
			if (doc.querySelector("form[name^='mesaAdvogado'], form[action*='mesaAdvogado.do'], form[action*='AssessorAdvogado']")) return "advocacia";

			const titulos = doc.querySelectorAll("h1, h2, h3, h4, .title, .titulo, legend, caption");
			for (const titulo of titulos) {
				if (RE_TITULO_MESA.test(normalizar(titulo.textContent))) return "advocacia";
			}

			const links = doc.querySelectorAll("a[name='projudiMenu'], a[href]");
			for (const link of links) {
				const href = link.getAttribute("href") || "";
				if (RE_PATH_ADVOCACIA.test(href.split(/[?#]/)[0])) return "advocacia";
				if (RE_TITULO_LINK.test(link.getAttribute("title") || "")) return "advocacia";
			}

			if (atribuicao) return "outro";
		} catch (e) {
			// Documento inacessível/incompleto: nada conclusivo.
		}
		return null;
	}

	// Documentos da mesma origem a examinar: o próprio frame, os ancestrais
	// e todos os frames da aba (o cabeçalho e o menu ficam em frames
	// irmãos das telas do processo).
	function documentosDaAba() {
		const docs = [];
		const vistos = new Set();
		function incluir(win) {
			try {
				if (!win || vistos.has(win)) return;
				vistos.add(win);
				const doc = win.document; // lança se for de outra origem
				if (doc) docs.push(doc);
			} catch (e) {
				// outra origem
			}
		}
		function percorrer(win, profundidade) {
			if (profundidade > 6) return;
			incluir(win);
			let filhos;
			try {
				filhos = win.frames;
			} catch (e) {
				return;
			}
			for (let i = 0; i < (filhos ? filhos.length : 0); i++) {
				percorrer(filhos[i], profundidade + 1);
			}
		}
		incluir(window);
		let atual = window;
		for (let i = 0; i < 8; i++) {
			let pai;
			try {
				pai = atual.parent;
			} catch (e) {
				break;
			}
			if (!pai || pai === atual) break;
			incluir(pai);
			atual = pai;
		}
		try {
			percorrer(window.top, 0);
		} catch (e) {
			// sem acesso ao topo
		}
		try {
			if (window.opener) percorrer(window.opener.top, 0);
		} catch (e) {
			// popup aberto por outra origem
		}
		return docs;
	}

	function avaliarAba() {
		let resultado = null;
		for (const doc of documentosDaAba()) {
			const r = avaliarDocumento(doc);
			if (r === "advocacia") return "advocacia";
			if (r === "outro") resultado = "outro";
		}
		return resultado;
	}

	function lerMemoriaLocal() {
		try {
			if (window.sessionStorage.getItem(CHAVE_BLOQUEIO) === "1") return true;
		} catch (e) { /* sem acesso */ }
		try {
			if (window.localStorage.getItem(CHAVE_BLOQUEIO) === "1") return true;
		} catch (e) { /* sem acesso */ }
		return false;
	}

	function gravarMemoria(bloqueado) {
		try {
			if (bloqueado) window.sessionStorage.setItem(CHAVE_BLOQUEIO, "1");
			else window.sessionStorage.removeItem(CHAVE_BLOQUEIO);
		} catch (e) { /* sem acesso */ }
		try {
			if (bloqueado) window.localStorage.setItem(CHAVE_BLOQUEIO, "1");
			else window.localStorage.removeItem(CHAVE_BLOQUEIO);
		} catch (e) { /* sem acesso */ }
		try {
			if (bloqueado) chrome.storage.local.set({ [CHAVE_BLOQUEIO]: Date.now() });
			else chrome.storage.local.remove(CHAVE_BLOQUEIO);
		} catch (e) { /* contexto da extensão invalidado */ }
	}

	// Oculta o que a extensão já tiver inserido na tela (todos os elementos
	// dela usam id/classe com prefixo "pdp").
	function ocultarInterface() {
		const raiz = document.documentElement;
		if (!raiz || raiz.hasAttribute(ATTR_BLOQUEIO)) return;
		raiz.setAttribute(ATTR_BLOQUEIO, "1");
		const estilo = document.createElement("style");
		estilo.id = "pdpPerfilBloqueadoEstilo";
		estilo.textContent = "[id^='pdp'],[class^='pdp'],[class*=' pdp']{display:none!important;visibility:hidden!important;pointer-events:none!important;}";
		(document.head || raiz).appendChild(estilo);
	}

	function desbloquear() {
		window.__pdpPerfilBloqueado = false;
		window.__pdpHostPermitido = true;
		const raiz = document.documentElement;
		if (raiz) raiz.removeAttribute(ATTR_BLOQUEIO);
		const estilo = document.getElementById("pdpPerfilBloqueadoEstilo");
		if (estilo) estilo.remove();
	}

	function bloquear() {
		window.__pdpPerfilBloqueado = true;
		window.__pdpHostPermitido = false;
		ocultarInterface();
	}

	const hostOk = HOST_PERMITIDO.test(hostEfetivo());
	window.__pdpHostPermitido = hostOk && !window.__pdpPerfilBloqueado;
	if (!hostOk) return;

	// Camada 6 (síncrona): perfil de advocacia já detectado nesta origem.
	let bloqueado = !!window.__pdpPerfilBloqueado || lerMemoriaLocal();

	// Camadas 1 a 5: o que está na tela agora.
	const avaliacao = avaliarAba();
	if (avaliacao === "advocacia") {
		bloqueado = true;
		gravarMemoria(true);
	} else if (avaliacao === "outro") {
		// A atribuição exibida é de outro perfil (troca de perfil/usuário).
		bloqueado = false;
		gravarMemoria(false);
		desbloquear();
	}

	if (bloqueado) {
		bloquear();
		return;
	}

	// Camada 6 (assíncrona): perfil detectado em outro host/origem. Na
	// injeção de document_start, a resposta chega antes dos scripts de
	// document_idle, que então já encontram a marca falsa.
	if (avaliacao === null) {
		try {
			chrome.storage.local.get(CHAVE_BLOQUEIO, function (dados) {
				if (dados && dados[CHAVE_BLOQUEIO]) {
					gravarMemoria(true);
					bloquear();
				}
			});
		} catch (e) { /* contexto da extensão invalidado */ }
	}

	// Conteúdo carregado depois (cabeçalho/menu em frames que terminam de
	// carregar mais tarde): reavalia algumas vezes após o carregamento.
	if (window.__pdpVerificacaoPerfilAgendada) return;
	window.__pdpVerificacaoPerfilAgendada = true;
	function reavaliar() {
		if (window.__pdpPerfilBloqueado) return;
		if (avaliarAba() === "advocacia") {
			gravarMemoria(true);
			bloquear();
		}
	}
	function agendar() {
		[500, 2000, 5000].forEach(function (ms) {
			setTimeout(reavaliar, ms);
		});
	}
	if (document.readyState === "complete") agendar();
	else window.addEventListener("load", agendar, { once: true });
})();
