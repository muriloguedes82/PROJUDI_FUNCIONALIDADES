// Projudi - Assinador TJPR aberto sozinho ao clicar em "Assinar"
//
// Ao clicar em "Assinar" (ou "Assinar Arquivos"...), o Projudi baixa o
// arquivo "AssinadorTJPR.jnlp" e o navegador só o deixa na lista de
// downloads: o usuário precisa clicar na seta de downloads e no arquivo para
// o assinador abrir e pedir o PIN.
//
// O Chrome só deixa uma extensão abrir um arquivo baixado
// (chrome.downloads.open) em resposta a um clique do usuário NUMA PÁGINA DA
// PRÓPRIA EXTENSÃO, feito há no máximo 5 segundos - um clique na página do
// Projudi não serve. Por isso, sobre cada botão "Assinar" visível, este
// script põe um iframe transparente da extensão (src/assinadorAbrir.html,
// modo "botao") do mesmo tamanho do botão. O clique do usuário cai nesse
// iframe, que avisa este script (postMessage) para clicar no botão de
// verdade; o Projudi baixa o .jnlp e, assim que o download termina, o
// próprio iframe o abre - o assinador aparece pedindo o PIN.
//
// Detalhe do Chrome: quando o download começa por uma navegação da página
// principal (location.href / envio de formulário), o Chrome descarta o
// clique e a abertura é recusada. Por isso o service worker guarda o
// endereço de cada .jnlp do assinador já baixado (pdpAssinadorEnderecos) e,
// logo depois do clique repassado, a navegação da página principal para um
// desses endereços é desviada para um iframe oculto (evento "navigate"):
// o download é o mesmo, mas o clique continua valendo. Na primeira vez,
// antes de conhecer o endereço, vale o cartão descrito abaixo.
//
// Quando não há esse clique (a extensão clicou no "Assinar" sozinha, numa
// preferência; o usuário usou o teclado; o download demorou mais de 5 s; ou
// a autorização "abrir arquivos baixados" ainda não foi dada), o service
// worker avisa a aba (mensagem "assinador-jnlp-pendente") e este script, no
// frame principal, mostra um cartão com o botão "🔏 Abrir o assinador" (o
// mesmo iframe, modo "cartao"): um clique só, sem passar pela lista de
// downloads. É nesse cartão que, na primeira vez, o Chrome pede a
// autorização opcional "downloads.open" (ver manifest.json).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	// Evita rodar dentro de iframes ocultos usados por esta ou outras
	// funcionalidades para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpAssinadorAutomatico) return;
	window.__pdpAssinadorAutomatico = true;

	const MESSAGE_SOURCE = "projudi-preview";
	const PAGINA = chrome.runtime.getURL("src/assinadorAbrir.html");
	const ORIGEM = new URL(PAGINA).origin;
	const ATTR = "data-pdp-assinador";
	const CLASSE_HOVER = "pdp-assinador-hover";
	const INTERVALO_MS = 400;
	const CHAVE_ENDERECOS = "pdpAssinadorEnderecos";
	// Depois do clique repassado, por quanto tempo desviar a navegação.
	const DESVIO_MS = 3000;

	// botão do Projudi -> iframe transparente sobre ele
	const sobreposicoes = new Map();
	let cartao = null;

	function norm(texto) {
		return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
	}

	function rotulo(el) {
		return norm(el.tagName === "INPUT" ? el.value : el.textContent);
	}

	// "Assinar", "Assinar Arquivos", "Assinar Documento"... (texto curto,
	// para não pegar links ou células que só mencionam a palavra).
	function ehBotaoAssinar(el) {
		if (!el || el.disabled || el.closest("[" + ATTR + "]")) return false;
		const bruto = el.tagName === "INPUT" ? el.value : el.textContent;
		if (!bruto || bruto.length > 80 || !/ssinar/i.test(bruto)) return false; // filtro rápido
		const texto = rotulo(el);
		return texto.length <= 40 && /^ASSINAR\b/.test(texto);
	}

	function candidatos() {
		const lista = [];
		document.querySelectorAll("input[type='button'], input[type='submit'], button, a").forEach(function (el) {
			if (ehBotaoAssinar(el)) lista.push(el);
		});
		return lista;
	}

	// Visível e não coberto por outra janela (ex.: um popup do Projudi aberto
	// por cima): o ponto central do botão tem de ser o próprio botão.
	function retanguloVisivel(btn) {
		if (!btn.isConnected || !btn.getClientRects().length) return null;
		const r = btn.getBoundingClientRect();
		if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return null;
		const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
		const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
		const noPonto = document.elementsFromPoint(cx, cy).find(function (el) { return !el.hasAttribute(ATTR); });
		if (!noPonto || (noPonto !== btn && !btn.contains(noPonto))) return null;
		return r;
	}

	function criarSobreposicao(btn) {
		const ifr = document.createElement("iframe");
		ifr.setAttribute(ATTR, "botao");
		ifr.setAttribute("allowtransparency", "true");
		ifr.setAttribute("tabindex", "-1");
		ifr.setAttribute("aria-hidden", "true");
		ifr.title = "Assinar";
		ifr.src = PAGINA + "?modo=botao";
		ifr.style.cssText = "position:fixed;border:0;margin:0;padding:0;background:transparent;color-scheme:normal;z-index:2147483000;display:none;";
		(document.body || document.documentElement).appendChild(ifr);
		return ifr;
	}

	function posicionar(ifr, r) {
		ifr.style.left = r.left + "px";
		ifr.style.top = r.top + "px";
		ifr.style.width = r.width + "px";
		ifr.style.height = r.height + "px";
		ifr.style.display = "block";
	}

	function sincronizar() {
		const atuais = new Set(candidatos());
		sobreposicoes.forEach(function (ifr, btn) {
			if (!atuais.has(btn)) {
				ifr.remove();
				btn.classList.remove(CLASSE_HOVER);
				sobreposicoes.delete(btn);
			}
		});
		atuais.forEach(function (btn) {
			const r = retanguloVisivel(btn);
			let ifr = sobreposicoes.get(btn);
			if (!r) {
				if (ifr) ifr.style.display = "none";
				return;
			}
			if (!ifr || !ifr.isConnected) {
				ifr = criarSobreposicao(btn);
				sobreposicoes.set(btn, ifr);
			}
			posicionar(ifr, r);
		});
	}

	function botaoDoIframe(fonte) {
		for (const [btn, ifr] of sobreposicoes) {
			if (ifr.contentWindow === fonte) return btn;
		}
		return null;
	}

	window.addEventListener("message", function (event) {
		if (event.origin !== ORIGEM || !event.data || typeof event.data.pdpAssinador !== "string") return;
		const tipo = event.data.pdpAssinador;

		if (cartao && cartao.ifr.contentWindow === event.source) {
			if (tipo === "pronto") cartao.pronto = true;
			if (tipo === "aberto") fecharCartao();
			if (tipo === "fechar") fecharCartao();
			return;
		}

		const btn = botaoDoIframe(event.source);
		if (!btn) return;
		if (tipo === "entrar") btn.classList.add(CLASSE_HOVER);
		if (tipo === "sair") btn.classList.remove(CLASSE_HOVER);
		if (tipo === "clique" && ehBotaoAssinar(btn)) {
			// O clique foi no iframe da extensão: repassa ao botão do Projudi
			// (com o mesmo efeito do clique direto, inclusive nas gravações
			// de preferência do Juntar Documento, que escutam este botão).
			btn.classList.remove(CLASSE_HOVER);
			try { btn.focus({ preventScroll: true }); } catch (e) { /* sem foco */ }
			desviarAte = Date.now() + DESVIO_MS;
			btn.click();
			setTimeout(sincronizar, 50);
		}
	});

	// ---- Download do .jnlp por iframe oculto (ver comentário no início) ----

	let enderecos = [];
	let desviarAte = 0;
	let iframeDownload = null;

	function carregarEnderecos(lista) {
		enderecos = Array.isArray(lista) ? lista.filter(function (e) { return typeof e === "string"; }) : [];
	}
	chrome.storage.local.get(CHAVE_ENDERECOS, function (dados) {
		void chrome.runtime.lastError;
		carregarEnderecos(dados && dados[CHAVE_ENDERECOS]);
	});
	chrome.storage.onChanged.addListener(function (mudancas, area) {
		if (area === "local" && mudancas[CHAVE_ENDERECOS]) carregarEnderecos(mudancas[CHAVE_ENDERECOS].newValue);
	});

	function ehEnderecoDoAssinador(url) {
		return url.origin === location.origin && enderecos.indexOf(url.origin + url.pathname) !== -1;
	}

	function obterIframeDownload() {
		if (iframeDownload && iframeDownload.isConnected) return iframeDownload;
		iframeDownload = document.createElement("iframe");
		iframeDownload.name = "pdp-assinador-download";
		iframeDownload.setAttribute(ATTR, "download");
		iframeDownload.setAttribute("data-pdp-loader", "1");
		iframeDownload.setAttribute("aria-hidden", "true");
		iframeDownload.style.cssText = "display:none;";
		(document.body || document.documentElement).appendChild(iframeDownload);
		return iframeDownload;
	}

	// Envia (GET ou POST) para o alvo indicado ("_self" = página principal).
	function navegar(url, formData, alvo) {
		if (!formData) {
			if (alvo === "_self") location.href = url;
			else obterIframeDownload().src = url;
			return;
		}
		const form = document.createElement("form");
		form.method = "post";
		form.action = url;
		form.target = alvo;
		form.style.display = "none";
		for (const [nome, valor] of formData) {
			if (typeof valor !== "string") continue;
			const campo = document.createElement("input");
			campo.type = "hidden";
			campo.name = nome;
			campo.value = valor;
			form.appendChild(campo);
		}
		(document.body || document.documentElement).appendChild(form);
		form.submit();
		form.remove();
	}

	if (window.navigation && typeof window.navigation.addEventListener === "function") {
		window.navigation.addEventListener("navigate", function (event) {
			if (Date.now() > desviarAte || !event.cancelable || event.hashChange || event.downloadRequest) return;
			if (event.navigationType === "traverse" || event.navigationType === "reload") return;
			let url;
			try { url = new URL(event.destination.url); } catch (e) { return; }
			if (!ehEnderecoDoAssinador(url)) return;
			desviarAte = 0;
			event.preventDefault();
			const formData = event.formData || null;
			const ifr = obterIframeDownload();
			// Um download não carrega nada no iframe. Se vier uma página (o
			// endereço deixou de ser o do assinador, sessão expirada...),
			// refaz a navigação original na página principal.
			const aoCarregar = function () {
				let pagina = false;
				try { pagina = !!(ifr.contentDocument && ifr.contentDocument.URL !== "about:blank"); } catch (e) { pagina = true; }
				if (!pagina) return;
				ifr.removeEventListener("load", aoCarregar);
				navegar(url.href, formData, "_self");
			};
			ifr.addEventListener("load", aoCarregar);
			setTimeout(function () { ifr.removeEventListener("load", aoCarregar); }, 30000);
			navegar(url.href, formData, ifr.name);
		});
	}

	// Realce do botão do Projudi enquanto o mouse está sobre o iframe (o
	// botão não recebe o "hover" porque o iframe está por cima).
	function instalarEstilo() {
		if (document.getElementById("pdp-assinador-estilo")) return;
		const style = document.createElement("style");
		style.id = "pdp-assinador-estilo";
		style.textContent = "." + CLASSE_HOVER + "{outline:2px solid #2d7a46 !important;outline-offset:1px !important;filter:brightness(0.95);}";
		(document.head || document.documentElement).appendChild(style);
	}

	// ---- Cartão "Abrir o assinador" (só no frame principal) ----

	function fecharCartao() {
		if (!cartao) return;
		clearTimeout(cartao.timer);
		clearTimeout(cartao.verificar);
		cartao.el.remove();
		cartao = null;
	}

	const ESTILO_CARTAO = "position:fixed;right:16px;bottom:16px;z-index:2147483001;width:340px;max-width:calc(100vw - 32px);" +
		"border:0;margin:0;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.28);background:#fff;";

	function mostrarCartao(id) {
		fecharCartao();
		const ifr = document.createElement("iframe");
		ifr.setAttribute(ATTR, "cartao");
		ifr.title = "Abrir o Assinador TJPR";
		ifr.src = PAGINA + "?modo=cartao&id=" + encodeURIComponent(id);
		ifr.style.cssText = ESTILO_CARTAO + "height:170px;display:block;color-scheme:normal;";
		(document.body || document.documentElement).appendChild(ifr);
		cartao = { el: ifr, ifr: ifr, pronto: false };
		// Se a página do Projudi não deixar o iframe da extensão carregar,
		// troca por um aviso simples com o caminho manual.
		cartao.verificar = setTimeout(function () {
			if (!cartao || cartao.pronto) return;
			const aviso = document.createElement("div");
			aviso.setAttribute(ATTR, "cartao");
			aviso.style.cssText = ESTILO_CARTAO + "box-sizing:border-box;padding:12px 14px;font:13px/1.4 Arial, sans-serif;color:#222;cursor:pointer;";
			aviso.textContent = "O Assinador TJPR foi baixado. Para abri-lo, clique na seta de downloads (⬇) do navegador e no arquivo \"AssinadorTJPR\".";
			aviso.addEventListener("click", fecharCartao);
			ifr.replaceWith(aviso);
			cartao.el = aviso;
		}, 4000);
		cartao.timer = setTimeout(fecharCartao, 90000);
	}

	if (window === window.top) {
		chrome.runtime.onMessage.addListener(function (message) {
			if (!message || message.source !== MESSAGE_SOURCE) return;
			if (message.type === "assinador-jnlp-pendente" && Number.isInteger(message.id)) mostrarCartao(message.id);
			if (message.type === "assinador-jnlp-aberto" && cartao) fecharCartao();
		});
	}

	instalarEstilo();
	sincronizar();
	setInterval(sincronizar, INTERVALO_MS);
	window.addEventListener("scroll", sincronizar, { capture: true, passive: true });
	window.addEventListener("resize", sincronizar, { passive: true });
})();
