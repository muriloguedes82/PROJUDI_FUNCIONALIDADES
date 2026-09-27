// Projudi - Botão "Ir para o BNMP"/"BNMP 3" abre a tela num popup
//
// Nas telas "Outros Cumprimentos" (mesa, tabela BNMP) e na ordenação do
// BNMP (`cumprimentoCartorio.do?actionType=cumprirBnmp`), o botão nativo
// que leva ao BNMP 3 abre o destino numa janela/aba nova, tirando o usuário
// do Projudi. Este recurso faz o botão abrir o destino num POPUP sobreposto
// à tela atual — o mesmo visual do popup das Ações rápidas (ordenações,
// remessas; ver `showActionModal` em quickActions.js) —, com "✕ Fechar",
// "Abrir em janela ↗" e "Abrir em nova aba ↗" no cabeçalho.
//
// Botão real, confirmado num .mhtml da ordenação BNMP (TJPR): o logotipo do
// BNMP 3 ao lado de cada parte de "Referente a(s) parte(s):" —
//   <span id="infoParteBnmp27965566">&nbsp;<a href="https://portalbnmp.cnj.
//   jus.br/bnmpportal/api/pessoas/cpf/<CPF>" target="_blank"><img alt="BNMP"
//   src=".../projudi/imagens/bnmp3-logotipo.png"></a></span>
// Além dele, por segurança (outras telas, mudanças de layout), também conta
// link/botão cujo texto, `value`, `title` ou `alt` fala em "BNMP 3"/"BNMP3",
// ou "BNMP" junto de "ir para", "acessar", "abrir", "portal" etc., ou que
// abra outro host com "bnmp" no nome/caminho (ver ehBotaoBnmp). "Ordenar Expedição
// BNMP" e os links da própria ordenação (`actionType=cumprirBnmp`) nunca
// contam. Ao abrir uma tela do Projudi com "bnmp" no conteúdo, os
// candidatos encontrados são listados no console (F12), prefixados com
// "[Projudi BNMP 3 popup]", para ajustar a detecção se preciso.
//
// Como o endereço é obtido, na fase de captura do clique (antes do onclick
// nativo):
// 1. `href` comum do link, ou o primeiro endereço entre aspas em
//    `window.open(...)`, `openDialog(...)`, `location.href = ...`,
//    `location.assign/replace(...)` no `onclick`/`href="javascript:..."`;
// 2. botão de formulário: `action` do form (GET vira URL com os campos;
//    POST é enviado para o iframe do popup);
// 3. se nada disso der o endereço, o clique nativo segue normalmente e
//    bnmp3Shim.js (mundo da página) desvia o `window.open()` que o script
//    nativo fizer durante esse clique para o popup.
//
// O popup é criado no documento mais alto da mesma origem que não seja um
// <frameset> (o Projudi usa framesets), para cobrir a tela inteira mesmo
// quando o botão está num frame ou dentro de outro popup da extensão.
//
// O portal do BNMP (cnj.jus.br) e o login do PDPJ (pje.jus.br) costumam
// proibir ser exibidos dentro de outra página (X-Frame-Options/CSP
// frame-ancestors). Antes de carregar o iframe, background.js cria uma regra
// de sessão (declarativeNetRequest) que remove esses cabeçalhos SÓ dos
// frames desses domínios, SÓ na aba do Projudi que abriu o popup. Se mesmo
// assim o destino não carregar (ex.: login que não funciona dentro de um
// frame), "Abrir em janela ↗" abre o mesmo endereço numa janela pop-up do
// navegador sobre o Projudi (mesma técnica do rascunho de e-mail).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;
	if (window.__pdpBnmp3Popup) return;
	window.__pdpBnmp3Popup = true;

	const TAG = "[Projudi BNMP 3 popup]";
	const EVENTO_ABRIR = "pdp-bnmp3-abrir";
	const EVENTO_CLIQUE = "pdp-bnmp3-clique";
	const MODAL_ID = "pdp-bnmp3-modal";
	const TITULO = "BNMP 3";
	const SELETOR_CLICAVEL = 'a, button, input[type="button"], input[type="submit"], input[type="image"], [onclick]';

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function rotulo(el) {
		const partes = [el.value, el.textContent, el.getAttribute("title"), el.getAttribute("alt")];
		const img = el.querySelector && el.querySelector("img[alt], img[title]");
		if (img) partes.push(img.getAttribute("alt"), img.getAttribute("title"));
		return normalize(partes.filter(Boolean).join(" "));
	}

	function codigoDoClique(el) {
		const href = el.getAttribute("href") || "";
		return (el.getAttribute("onclick") || "") + " " + (/^\s*javascript:/i.test(href) ? href : "");
	}

	// Primeiro endereço entre aspas passado a uma função/atribuição que
	// navega ou abre janela.
	function urlDoCodigo(codigo) {
		const re = /(?:\bopen|\bopenDialog|\bopenPopup|\bpopup|\babrirJanela|\blocation(?:\.href)?\s*=|\blocation\.(?:assign|replace)|\.href\s*=)\s*\(?\s*(['"])([^'"]+)\1/gi;
		let m;
		while ((m = re.exec(codigo))) {
			const valor = m[2].trim();
			if (/^(https?:\/\/|\/|\.{1,2}\/|[\w.-]+\.(do|jsp|jsf|xhtml|html?|php|aspx?)\b)/i.test(valor)) return valor;
		}
		return null;
	}

	function absoluta(url, base) {
		try {
			const u = new URL(url, base || location.href);
			return /^https?:$/.test(u.protocol) ? u : null;
		} catch (err) {
			return null;
		}
	}

	function urlDoElemento(el) {
		const href = el.getAttribute("href") || "";
		if (href && !/^\s*(javascript:|#)/i.test(href)) {
			const u = absoluta(href);
			if (u) return u;
		}
		const doCodigo = urlDoCodigo(codigoDoClique(el));
		return doCodigo ? absoluta(doCodigo) : null;
	}

	function ehDaExtensao(el) {
		return !!el.closest('[id^="pdp-"], [class*="pdp-"]');
	}

	function ehBotaoBnmp(el) {
		if (!el || ehDaExtensao(el)) return false;
		const texto = rotulo(el);
		if (/^ordenar\b/.test(texto)) return false;
		const codigo = codigoDoClique(el) + " " + (el.getAttribute("href") || "");
		if (/cumprirBnmp/i.test(codigo)) return false;
		// Botão real da ordenação BNMP: logotipo do BNMP 3 ao lado de cada
		// parte (ver comentário do topo).
		if (el.tagName === "A" && (el.closest('[id^="infoParteBnmp"]') || el.querySelector('img[src*="bnmp3-logotipo"]'))) return true;
		// Linhas/células inteiras com onclick também casam com o seletor; o
		// texto só conta quando é curto como o de um botão.
		if (texto.length > 80) {
			const u = urlDoElemento(el);
			return !!(u && u.origin !== location.origin && /bnmp/i.test(u.hostname + u.pathname));
		}
		if (/\bbnmp\s*-?\s*(3|iii)\b|\bbnmp3\b/.test(texto)) return true;
		if (/\bbnmp\b/.test(texto) && /\b(ir|va|acessar|acesso|abrir|portal|sistema|consultar)\b/.test(texto)) return true;
		const u = urlDoElemento(el);
		return !!(u && u.origin !== location.origin && /bnmp/i.test(u.hostname + u.pathname));
	}

	function botaoDoEvento(event) {
		const alvo = event.target instanceof Element ? event.target : null;
		const el = alvo && alvo.closest(SELETOR_CLICAVEL);
		return el && ehBotaoBnmp(el) ? el : null;
	}

	// -------------------------------------------------------------------
	// Popup
	// -------------------------------------------------------------------

	// Documento mais alto da mesma origem cujo corpo não é um <frameset>.
	function janelaHospedeira() {
		let melhor = window;
		let win = window;
		for (let i = 0; i < 10; i++) {
			let pai;
			try {
				pai = win.parent;
				if (!pai || pai === win) break;
				const body = pai.document.body;
				if (body && body.tagName !== "FRAMESET") melhor = pai;
			} catch (err) {
				break; // outra origem
			}
			win = pai;
		}
		return melhor;
	}

	function fecharPopup(doc) {
		const el = (doc || janelaHospedeira().document).getElementById(MODAL_ID);
		if (el) {
			if (el.__pdpFechar) el.__pdpFechar();
			el.remove();
		}
	}

	function el(doc, tag, attrs, texto) {
		const node = doc.createElement(tag);
		for (const k in attrs || {}) node.setAttribute(k, attrs[k]);
		if (texto) node.textContent = texto;
		return node;
	}

	function abrirEmJanela(url) {
		chrome.runtime
			.sendMessage({ source: "projudi-preview", type: "bnmp3-open-window", url: url })
			.then(function (r) {
				if (!r || !r.ok) throw new Error((r && r.error) || "sem resposta");
			})
			.catch(function (err) {
				console.warn(TAG, "janela pop-up do navegador falhou; abrindo em nova aba", err);
				window.open(url, "_blank", "noopener");
			});
	}

	// Cria o popup e devolve o <iframe> (sem `src`; quem chama decide como
	// carregar). `url` é a URL (string) mostrada nos atalhos do cabeçalho.
	function criarPopup(url, titulo) {
		const host = janelaHospedeira();
		const doc = host.document;
		fecharPopup(doc);

		const backdrop = el(doc, "div", { id: MODAL_ID, class: "pdp-qa-modal-backdrop pdp-bnmp3-backdrop" });
		const box = el(doc, "div", { class: "pdp-qa-modal-box pdp-bnmp3-box" });
		const header = el(doc, "div", { class: "pdp-qa-modal-header" });
		header.appendChild(el(doc, "span", null, titulo || TITULO));
		const acoes = el(doc, "div", { class: "pdp-bnmp3-acoes" });
		const janela = el(doc, "button", { type: "button", class: "pdp-qa-modal-close", title: "Abrir numa janela pop-up do navegador, sobre o Projudi (use se o popup ficar em branco)" }, "Abrir em janela ↗");
		const aba = el(doc, "a", { class: "pdp-qa-modal-close pdp-bnmp3-aba", href: url, target: "_blank", rel: "noopener" }, "Abrir em nova aba ↗");
		const fechar = el(doc, "button", { type: "button", class: "pdp-qa-modal-close" }, "✕ Fechar");
		acoes.appendChild(janela);
		acoes.appendChild(aba);
		acoes.appendChild(fechar);
		header.appendChild(acoes);
		const body = el(doc, "div", { class: "pdp-qa-modal-body" });
		const iframe = el(doc, "iframe", {
			class: "pdp-qa-modal-iframe pdp-bnmp3-iframe",
			name: "pdp-bnmp3-" + Date.now(),
			allow: "clipboard-read; clipboard-write",
		});
		body.appendChild(iframe);
		box.appendChild(header);
		box.appendChild(body);
		backdrop.appendChild(box);
		doc.body.appendChild(backdrop);

		fechar.addEventListener("click", function () {
			fecharPopup(doc);
		});
		janela.addEventListener("click", function () {
			abrirEmJanela(aba.href);
			fecharPopup(doc);
		});
		function onKey(event) {
			if (event.key === "Escape") fecharPopup(doc);
		}
		// Sinal de window.close() de dentro do popup (closeShim.js), quando o
		// destino é uma tela do próprio Projudi.
		function onMessage(event) {
			if (event.origin !== host.location.origin || !event.data || event.data.__pdpShim !== true) return;
			if (event.source === iframe.contentWindow && event.data.__pdpCloseSignal) fecharPopup(doc);
		}
		host.addEventListener("keydown", onKey, true);
		host.addEventListener("message", onMessage);
		backdrop.__pdpFechar = function () {
			host.removeEventListener("keydown", onKey, true);
			host.removeEventListener("message", onMessage);
		};
		// Mantém o link "nova aba" apontando para onde o popup está (quando
		// o destino é da mesma origem e dá para ler).
		iframe.addEventListener("load", function () {
			try {
				const atual = iframe.contentWindow.location.href;
				if (/^https?:/.test(atual)) aba.href = atual;
			} catch (err) {
				// outra origem — mantém o endereço inicial
			}
		});
		return iframe;
	}

	// Libera a exibição em frame dos domínios do BNMP/PDPJ nesta aba (ver
	// comentário do topo). Não espera mais que ~1,5 s: sem resposta, carrega
	// assim mesmo.
	function liberarFrame(url) {
		if (new URL(url).origin === location.origin) return Promise.resolve();
		const pedido = chrome.runtime
			.sendMessage({ source: "projudi-preview", type: "bnmp3-allow-frame" })
			.then(function (r) {
				if (!r || !r.ok) console.warn(TAG, "não foi possível liberar a exibição em frame:", r && r.error);
			})
			.catch(function (err) {
				console.warn(TAG, "não foi possível liberar a exibição em frame:", err);
			});
		return Promise.race([pedido, new Promise(function (resolve) { setTimeout(resolve, 1500); })]);
	}

	function abrirPopup(url, titulo) {
		console.info(TAG, "abrindo no popup:", url);
		const iframe = criarPopup(url, titulo);
		liberarFrame(url).then(function () {
			if (iframe.isConnected && !iframe.getAttribute("src")) iframe.src = url;
		});
		return iframe;
	}

	// "BNMP 3 — NOME DA PARTE", quando o botão está na linha de uma parte.
	function tituloDoBotao(botao) {
		const li = botao.closest("li");
		const parte = li && li.querySelector('a[href*="parteProcesso.do"]');
		const nome = parte ? parte.textContent.replace(/\s+/g, " ").trim() : "";
		return nome ? TITULO + " — " + nome : TITULO;
	}

	function enviarFormNoPopup(form, botao) {
		const action = absoluta(form.getAttribute("action") || location.href);
		if (!action) return false;
		const metodo = (form.getAttribute("method") || "get").toLowerCase();
		if (metodo !== "post") {
			const dados = new FormData(form);
			if (botao && botao.name) dados.append(botao.name, botao.value || "");
			for (const [k, v] of dados) if (typeof v === "string") action.searchParams.append(k, v);
			abrirPopup(action.href);
			return true;
		}
		const iframe = criarPopup(action.href);
		const alvoAnterior = form.getAttribute("target");
		let extra = null;
		if (botao && botao.name) {
			extra = form.ownerDocument.createElement("input");
			extra.type = "hidden";
			extra.name = botao.name;
			extra.value = botao.value || "";
			form.appendChild(extra);
		}
		// O iframe precisa já estar no DOM (e carregado como about:blank)
		// para o navegador reconhecer o `name` como alvo — senão abre aba
		// nova (armadilha documentada em quickActions.js/habilitarAdvogado.js).
		setTimeout(function () {
			form.setAttribute("target", iframe.name);
			try {
				HTMLFormElement.prototype.submit.call(form);
			} finally {
				if (alvoAnterior === null) form.removeAttribute("target");
				else form.setAttribute("target", alvoAnterior);
				if (extra) extra.remove();
			}
		}, 50);
		console.info(TAG, "formulário enviado para o popup:", action.href);
		return true;
	}

	// -------------------------------------------------------------------
	// Clique no botão nativo
	// -------------------------------------------------------------------

	window.addEventListener(
		"click",
		function (event) {
			if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
			const botao = botaoDoEvento(event);
			if (!botao) return;

			const url = urlDoElemento(botao);
			if (url) {
				event.preventDefault();
				event.stopImmediatePropagation();
				abrirPopup(url.href, tituloDoBotao(botao));
				return;
			}
			const form = botao.form || (botao.matches('input[type="submit"], input[type="image"], button') ? botao.closest("form") : null);
			const ehSubmit = botao.matches('input[type="submit"], input[type="image"], button:not([type]), button[type="submit"]');
			if (form && ehSubmit && !botao.getAttribute("onclick") && enviarFormNoPopup(form, botao)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}
			// Endereço montado pelo script nativo: deixa o clique seguir e
			// avisa bnmp3Shim.js para desviar o window.open() desse clique.
			console.info(TAG, "endereço não está no botão; aguardando o window.open() do script nativo", botao.outerHTML.slice(0, 300));
			document.dispatchEvent(new CustomEvent(EVENTO_CLIQUE));
		},
		true
	);

	document.addEventListener(EVENTO_ABRIR, function (event) {
		const url = absoluta(event.detail);
		if (!url) return;
		abrirPopup(url.href);
		event.preventDefault();
	});

	// -------------------------------------------------------------------
	// Diagnóstico: candidatos na tela (uma vez por página)
	// -------------------------------------------------------------------

	function diagnosticar() {
		if (!document.body || !/bnmp/i.test(document.body.innerHTML)) return;
		const vistos = [];
		document.querySelectorAll(SELETOR_CLICAVEL).forEach(function (node) {
			if (ehDaExtensao(node)) return;
			const txt = rotulo(node) + " " + codigoDoClique(node) + " " + (node.getAttribute("href") || "");
			if (!/bnmp/i.test(txt)) return;
			vistos.push({ reconhecido: ehBotaoBnmp(node), html: node.outerHTML.slice(0, 300) });
		});
		if (vistos.length) console.info(TAG, "elementos com \"BNMP\" nesta tela:", JSON.stringify(vistos, null, 2));
	}
	if (document.readyState === "complete") diagnosticar();
	else window.addEventListener("load", diagnosticar, { once: true });
})();
