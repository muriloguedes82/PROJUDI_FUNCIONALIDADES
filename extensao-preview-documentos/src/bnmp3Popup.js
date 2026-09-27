// Projudi - Botão do BNMP 3 abre o portal numa janela pop-up sobre o Projudi
//
// Na ordenação do BNMP (`cumprimentoCartorio.do?actionType=cumprirBnmp`),
// cada parte de "Referente a(s) parte(s):" tem o logotipo do BNMP 3, um link
// que o Projudi abre numa ABA nova, tirando o usuário da tela da ordenação.
// Confirmado num .mhtml da tela (TJPR):
//   <span id="infoParteBnmp27965566">&nbsp;<a href="https://portalbnmp.cnj.
//   jus.br/bnmpportal/api/pessoas/cpf/<CPF>" target="_blank"><img alt="BNMP"
//   src=".../projudi/imagens/bnmp3-logotipo.png"></a></span>
//
// Com este recurso, o clique abre o portal numa JANELA POP-UP do navegador
// (background.js, `chrome.windows.create({type: "popup"})`), menor que a do
// Projudi e centralizada sobre ela; o usuário a arrasta para onde quiser
// pela barra de título, deixando a ordenação legível atrás. Os cliques
// seguintes reaproveitam a mesma janela (se ainda estiver aberta), e a
// posição/tamanho escolhidos pelo usuário são lembrados.
//
// Por que não um popup DENTRO da página (como os das ordenações/remessas):
// o portal do CNJ e o login do PDPJ proíbem ser exibidos dentro de outra
// página (X-Frame-Options/CSP), e o login num frame de outro site sofre com
// o particionamento de cookies/armazenamento do Chrome.
//
// Junto com o endereço, vão para background.js os dados da ordenação (tipo
// de documento, processo, parte, CPF), guardados para a aba do portal
// (ver bnmpPortal.js, que roda dentro do portal do BNMP).
//
// Além do logotipo, também conta, em qualquer tela do Projudi, link/botão
// cujo texto, `value`, `title` ou `alt` fale em "BNMP 3"/"BNMP3", ou "BNMP"
// junto de "ir para", "acessar", "abrir", "portal" etc., ou que abra outro
// host com "bnmp" no endereço. "Ordenar Expedição BNMP" e os links da
// própria ordenação nunca contam. Em toda tela do Projudi que mencione
// "BNMP", os candidatos são listados no console (F12), prefixados com
// "[Projudi BNMP 3]", para ajustar a detecção se preciso.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;
	if (window.__pdpBnmp3Popup) return;
	window.__pdpBnmp3Popup = true;

	const TAG = "[Projudi BNMP 3]";
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

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	// Valor da linha "<td class="label">Rótulo:</td><td>valor</td>" da
	// 1ª table.form da ordenação.
	function campoDaOrdenacao(regex) {
		const tabela = document.querySelector("#cumprimentoCartorioForm table.form");
		if (!tabela) return "";
		for (const td of tabela.querySelectorAll("td.label")) {
			if (!regex.test(normalize(td.textContent).replace(/\s*:\s*$/, ""))) continue;
			let next = td.nextElementSibling;
			while (next && next.tagName !== "TD") next = next.nextElementSibling;
			return next ? collapse(next.textContent) : "";
		}
		return "";
	}

	// Dados da ordenação para a aba do portal (ver bnmpPortal.js).
	function contexto(botao, url) {
		const li = botao.closest("li");
		const parte = li && li.querySelector('a[href*="parteProcesso.do"]');
		const processo = document.querySelector('#cumprimentoCartorioForm table.form a[href*="/processo.do"]');
		const cpf = /\/cpf\/(\d{11})\b/.exec(url.pathname);
		return {
			tipoDocumento: campoDaOrdenacao(/^tipo de documento$/),
			processo: processo ? collapse((processo.querySelector("em") || processo).textContent) : "",
			parte: parte ? collapse(parte.textContent) : "",
			cpf: cpf ? cpf[1] : "",
			ordenacao: location.href,
		};
	}

	window.addEventListener(
		"click",
		function (event) {
			if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
			const botao = botaoDoEvento(event);
			if (!botao) return;
			const url = urlDoElemento(botao);
			if (!url) {
				console.info(TAG, "botão BNMP sem endereço legível; segue o clique nativo", botao.outerHTML.slice(0, 300));
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			const dados = contexto(botao, url);
			console.info(TAG, "abrindo na janela pop-up:", url.href, dados);
			chrome.runtime
				.sendMessage({ source: "projudi-preview", type: "bnmp3-open-window", url: url.href, contexto: dados })
				.then(function (r) {
					if (!r || !r.ok) throw new Error((r && r.error) || "sem resposta");
				})
				.catch(function (err) {
					console.warn(TAG, "janela pop-up falhou; abrindo em nova aba", err);
					window.open(url.href, "_blank", "noopener");
				});
		},
		true
	);

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
