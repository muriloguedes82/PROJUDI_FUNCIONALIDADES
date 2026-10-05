// Projudi - Cards dos sistemas do CNJ (SerpJud, CNIEP, BNMP 3.0, PrevJud,
// Sisbajud, SNGB, Sniper, Infojud, da Receita, Renajud e Sistema Uniformizado, do
// TJPR - lista em sistemasCnjLista.js) ao lado do ícone do Menu da extensão
// (a balança dourada, ver menuExtensao.js).
//
// Cada card tem a altura da balança e o nome oficial do sistema escrito
// (`rotulo`), na cor pastel dele; a largura acompanha o nome. Ficam
// enfileirados à esquerda da balança e a acompanham (rolagem,
// redimensionamento): menuExtensao.js publica a posição da balança no
// atributo "data-pdp-icone-pos" de #pdp-menu-host. Sem a balança no
// documento, os ícones não aparecem. Também só aparecem com um PROCESSO
// aberto, e só na tela principal dele - nunca dentro de um popup (ver
// dentroDePopup): a balança fica no cabeçalho, mas a tela (Mesa, processo...) é
// carregada num quadro interno, então os ícones conferem todos os quadros
// da aba, a partir do topo (ver processoAberto). Não mexe na fileira de botões do
// rodapé (quickActions.js/buttonDrag.js).
//
// No SEEU só aparecem os cards marcados com `seeu: true` na lista (BNMP 3.0,
// SESP Intranet e Sistema Uniformizado), sem o card "Outros".
//
// Ordem: por padrão ALFABÉTICA (pelo `nome`, da esquerda para a direita);
// o usuário reorganiza à vontade arrastando um card para o lado. No Projudi
// há ainda o card "Outros", colado à balança, que guarda os sistemas fora da
// fila (no começo, os marcados com `outros: true`): clicar abre um painel
// com eles; arrastar um card do painel para cima de um card da fila troca
// os dois de lugar, e arrastar um card da fila para o "Outros" (o card ou o
// painel) o guarda lá. Tudo fica em chrome.storage.local
// ("pdpSistemasCnjOrdem" e "pdpSistemasCnjOutros" no Projudi,
// "pdpSistemasCnjOrdemSeeu" no SEEU) - sobrevive às atualizações da
// extensão e, por começar com "pdp", entra no Exportar/Importar do Menu
// (menuExtensao.js). Um clique sem arrastar abre o sistema.
//
// O clique abre o sistema num popup sobre a própria tela do processo - o
// mesmo tipo de janela usado pelas ações rápidas (Remessa, Concluso etc.,
// ver showActionModal em quickActions.js) -, sem nova aba. Se a balança
// estiver num frame só do cabeçalho, o popup é aberto no documento do topo,
// para ocupar a tela toda. No cabeçalho do popup, um botão abre o mesmo
// endereço fora do popup: numa janela maximizada no segundo monitor, se
// houver, e senão numa aba nova ao lado da do processo (ver
// sistemas-cnj-open em background.js). O rótulo ("🖥 Segundo monitor" ou
// "🗂 Nova aba") segue screen.isExtended, mas quem decide é o background.
//
// Esses sistemas costumam recusar ser exibidos dentro de outra página; a
// regra em rules/sistemasCnj.json retira essa recusa apenas quando a janela
// é aberta a partir do Projudi ou do SEEU.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	// A janela do Oráculo mantém apenas os controles nativos.
	if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return;
	const NO_SEEU = /(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname);
	if (window.__pdpSistemasCnj || !location.pathname.startsWith(NO_SEEU ? "/seeu/" : "/projudi/") || !self.PDP_SISTEMAS_CNJ) return;
	window.__pdpSistemasCnj = true;

	const SISTEMAS = NO_SEEU
		? self.PDP_SISTEMAS_CNJ.filter(function (s) { return s.seeu === true; })
		: self.PDP_SISTEMAS_CNJ;
	const MODAL_ID = "pdp-sistemas-cnj-modal";
	const MENSAGEM_ABRIR = "pdp-sistemas-cnj-abrir";
	const TAM = 22; // mesmo tamanho da balança (menuExtensao.js)
	const ESPACO = 6;
	const ORDEM_KEY = NO_SEEU ? "pdpSistemasCnjOrdemSeeu" : "pdpSistemasCnjOrdem";
	const OUTROS_KEY = "pdpSistemasCnjOutros"; // só no Projudi
	const COM_OUTROS = !NO_SEEU;
	const COR_OUTROS = { claro: "#ffffff", escuro: "#e4e7eb", borda: "#8a939c", texto: "#3d4650" };
	const LARGURA_PAINEL = 270;
	const LIMIAR_ARRASTO = 4; // px de movimento antes de virar arrasto

	const CSS = `
:host { all: initial; }
.icone {
	position: fixed; z-index: 2147483000; min-width: ${TAM}px; height: ${TAM}px; padding: 0 6px; margin: 0;
	box-sizing: border-box; white-space: nowrap; font: 700 11px/1 Arial, Helvetica, sans-serif; letter-spacing: -.1px;
	border-radius: 6px; border: 1.5px solid var(--borda); background: linear-gradient(135deg, var(--claro), var(--escuro));
	color: var(--texto); cursor: pointer; display: flex; align-items: center; justify-content: center;
	box-shadow: 0 1px 4px rgba(0,0,0,.25); transition: transform .15s, box-shadow .15s, filter .15s;
}
.icone[hidden] { display: none; }
.icone.arrastando { z-index: 2147483001; cursor: grabbing; transform: scale(1.08); box-shadow: 0 4px 10px rgba(0,0,0,.35); transition: none; }
.icone.deslizando { transition: left .15s, transform .15s, box-shadow .15s, filter .15s; }
.icone:hover, .icone:focus-visible { transform: scale(1.06); filter: brightness(1.04); box-shadow: 0 2px 7px rgba(0,0,0,.3); outline: none; }
.icone.alvo { outline: 2px dashed #2a6cb3; outline-offset: 2px; }
.painel {
	position: fixed; z-index: 2147483000; width: ${LARGURA_PAINEL}px; box-sizing: border-box; padding: 8px 10px;
	background: #fff; border: 1px solid #c8ced6; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,.18);
	font: 11px/1.35 Arial, Helvetica, sans-serif; color: #444;
}
.painel[hidden] { display: none; }
.painel.alvo { border-color: #2a6cb3; box-shadow: 0 0 0 2px #9cc0ea, 0 6px 18px rgba(0,0,0,.18); }
.painel .titulo { font-weight: 700; margin-bottom: 6px; color: #333; }
.painel .lista { display: flex; flex-wrap: wrap; gap: 6px; }
.painel .icone { position: relative; z-index: 1; }
.painel .icone.arrastando { z-index: 2; }
.painel .vazio { color: #777; font-style: italic; }
.painel .dica { margin-top: 8px; color: #777; }
`;

	function orgao(sistema) {
		return sistema.orgao || "CNJ";
	}

	function porId(id) {
		return SISTEMAS.find(function (s) { return s.id === id; });
	}

	// ------------------------------------------------------------------
	// Popup
	// ------------------------------------------------------------------

	// Segundo monitor, se houver; senão, nova aba. O popup só fecha se abriu
	// de fato.
	function openOutside(sistema) {
		chrome.runtime.sendMessage({ source: "projudi-preview", type: "sistemas-cnj-open", sistema: sistema.id, onde: "fora" })
			.then(function (result) {
				if (result && result.ok) closeModal();
				else alert((result && result.error) || "Não foi possível abrir o " + sistema.nome + ".");
			})
			.catch(function (error) {
				alert("Não foi possível abrir o " + sistema.nome + ": " + error.message);
			});
	}

	function closeModal() {
		const el = document.getElementById(MODAL_ID);
		if (el) el.remove();
		document.removeEventListener("keydown", onKeydown, true);
	}

	function onKeydown(event) {
		if (event.key === "Escape") closeModal();
	}

	function openModal(sistema) {
		closeModal();
		const backdrop = document.createElement("div");
		backdrop.id = MODAL_ID;
		backdrop.className = "pdp-qa-modal-backdrop";
		backdrop.innerHTML =
			'<div class="pdp-qa-modal-box" style="width: min(1280px, 96vw); height: 94vh;">' +
			'<div class="pdp-qa-modal-header"><span class="pdp-sistemas-cnj-titulo"></span>' +
			'<span style="display: flex; gap: 6px;">' +
			'<button type="button" class="pdp-qa-modal-close pdp-sistemas-cnj-fora"></button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-sistemas-cnj-close">✕ Fechar</button>' +
			"</span></div>" +
			'<div class="pdp-qa-modal-body"><iframe class="pdp-sistemas-cnj-iframe" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-read; clipboard-write; fullscreen"></iframe></div>' +
			"</div>";
		backdrop.querySelector(".pdp-sistemas-cnj-titulo").textContent = sistema.nome + " — " + orgao(sistema);
		const fora = backdrop.querySelector(".pdp-sistemas-cnj-fora");
		const doisMonitores = window.screen && window.screen.isExtended === true;
		fora.textContent = doisMonitores ? "🖥 Segundo monitor" : "🗂 Nova aba";
		fora.title = "Abrir o " + sistema.nome + " fora do popup: no segundo monitor, se houver; senão, numa nova aba";
		fora.addEventListener("click", function () { openOutside(sistema); });
		backdrop.querySelector(".pdp-sistemas-cnj-close").addEventListener("click", closeModal);
		backdrop.querySelector(".pdp-sistemas-cnj-iframe").src = sistema.url;
		document.body.appendChild(backdrop);
		document.addEventListener("keydown", onKeydown, true);
	}

	// Janela que recebe o popup: o documento do topo ou, se ele for um
	// <frameset> (página dividida em quadros), o maior quadro dele.
	function topoUtil() {
		if (window.top === window) return null;
		try {
			const body = window.top.document.body;
			if (body && body.tagName !== "FRAMESET") return window.top;
			let maior = null, area = 0;
			for (let i = 0; i < window.top.frames.length; i++) {
				const w = window.top.frames[i];
				const a = w.innerWidth * w.innerHeight;
				if (w.location.origin === location.origin && a > area) { maior = w; area = a; }
			}
			return maior && maior !== window ? maior : null;
		} catch (err) {
			return null;
		}
	}

	function abrir(sistema) {
		const topo = topoUtil();
		if (topo) topo.postMessage({ tipo: MENSAGEM_ABRIR, sistema: sistema.id }, location.origin);
		else openModal(sistema);
	}

	// Ouve em todas as janelas: o pedido só chega à escolhida por topoUtil.
	window.addEventListener("message", function (event) {
		if (event.origin !== location.origin || !event.data || event.data.tipo !== MENSAGEM_ABRIR) return;
		const sistema = porId(event.data.sistema);
		if (sistema) openModal(sistema);
	});

	// ------------------------------------------------------------------
	// Ícones ao lado da balança
	// ------------------------------------------------------------------

	let host = null;
	let icones = {}; // id -> botão
	let ordem = []; // fila visível, da balança para a esquerda
	let outros = []; // guardados no card "Outros" (só Projudi)
	let base = null; // { top, left } da balança
	let arrasto = null; // card da fila: { id, inicioX, inicioY, leftInicial, ativo, ordemTemp, noOutros }
	let arrastoPainel = null; // card do painel "Outros": { id, inicioX, inicioY, ativo, alvo }
	let botaoOutros = null;
	let painel = null;
	let painelAberto = false;
	let ignorarClique = false;
	let menuHost = null;
	let comProcesso = false;
	const observaMenu = new MutationObserver(posicionar);

	// ------------------------------------------------------------------
	// Há processo aberto? (neste documento ou num quadro interno dele)
	// ------------------------------------------------------------------

	// Número único CNJ (0000000-00.0000.0.00.0000) no título da tela do
	// processo: no Projudi "Processo <em class="attention">número</em>"; no
	// SEEU o cabeçalho div.titulo.processo (os mesmos marcadores de
	// hasProcessNumberMarker em quickActions.js).
	const NUMERO_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

	function documentoDeProcesso(doc) {
		const titulo = doc.querySelector(NO_SEEU ? "div.titulo.processo" : "em.attention");
		return !!(titulo && NUMERO_CNJ.test(titulo.textContent || ""));
	}

	// Um quadro de outro endereço não pode ser lido, mas os quadros DENTRO
	// dele continuam sendo percorridos: no Projudi a página principal fica em
	// projudi.tjpr.jus.br e o processo (com a balança) em projudi2.tjpr.jus.br,
	// e parar no primeiro quadro ilegível escondia os cards em todo processo.
	function processoAberto(win, profundidade) {
		let doc = null;
		try { doc = win.document; } catch (err) { /* quadro de outro endereço */ }
		if (doc && doc.documentElement && documentoDeProcesso(doc)) return true;
		if (profundidade >= 4) return false;
		let quantos = 0;
		try { quantos = win.frames.length; } catch (err) { return false; }
		for (let i = 0; i < quantos; i++) {
			if (processoAberto(win.frames[i], profundidade + 1)) return true;
		}
		return false;
	}

	// Este documento primeiro (caso comum: balança e processo no mesmo
	// quadro); depois todos os quadros da aba, a partir do topo.
	function processoNaAba() {
		return !dentroDePopup() && (documentoDeProcesso(document) || processoAberto(window.top, 0));
	}

	// Tela aberta num popup sobre o processo (os popups das ações rápidas, de
	// Advogados, Partes etc. e os diálogos do próprio Projudi carregam telas
	// com o mesmo cabeçalho e a mesma balança): os cards ficam só na tela
	// principal. É popup quando o quadro está dentro de um popup da extensão
	// ou quando algum quadro acima dele já é a tela de um processo.
	const CLASSES_POPUP = ["pdp-qa-modal-iframe", "pdp-sistemas-cnj-iframe", "pdp-proc-preview-iframe"];
	function dentroDePopup() {
		let win = window;
		for (let nivel = 0; nivel < 8 && win !== win.top; nivel++) {
			try {
				const quadro = win.frameElement;
				if (quadro && CLASSES_POPUP.some(function (c) { return quadro.classList.contains(c); })) return true;
			} catch (err) { /* quadro de outro endereço */ }
			win = win.parent;
			try {
				if (win.document && documentoDeProcesso(win.document)) return true;
			} catch (err) { /* quadro de outro endereço */ }
		}
		return false;
	}

	// O quadro interno troca de tela sem mudar nada neste documento: confere
	// a cada segundo (só leituras; reposiciona apenas quando muda).
	function conferirProcesso() {
		const agora = processoNaAba();
		if (agora === comProcesso) return;
		comProcesso = agora;
		posicionar();
	}

	// ------------------------------------------------------------------
	// Ordem: padrão alfabético, escolha do usuário salva
	// ------------------------------------------------------------------

	function alfabetica(ids) {
		return ids.slice().sort(function (a, b) {
			return porId(a).nome.localeCompare(porId(b).nome, "pt-BR", { sensitivity: "base" });
		});
	}

	// Padrão: alfabética da esquerda para a direita; a fila vai da balança
	// para a esquerda, então é a alfabética invertida.
	function padrao() {
		const ids = SISTEMAS.map(function (s) { return s.id; });
		const guardados = COM_OUTROS ? ids.filter(function (id) { return porId(id).outros === true; }) : [];
		return {
			fila: alfabetica(ids.filter(function (id) { return guardados.indexOf(id) < 0; })).reverse(),
			outros: guardados
		};
	}

	// Ids conhecidos da lista salva, sem repetição (null se nada salvo).
	function validos(salva, fora) {
		if (!Array.isArray(salva)) return null;
		return salva.filter(function (id, i, a) {
			return !!porId(id) && a.indexOf(id) === i && (!fora || fora.indexOf(id) < 0);
		});
	}

	// Junta o que o usuário salvou com o padrão: quem já tinha uma ordem
	// salva mantém a sua; sistema novo numa versão futura entra no "Outros"
	// (se for marcado assim) ou no fim da fila.
	function normalizar(salvaFila, salvaOutros) {
		const pad = padrao();
		let lOutros = COM_OUTROS ? validos(salvaOutros) : [];
		let lFila = validos(salvaFila, lOutros || []);
		if (lFila === null && lOutros === null) return pad;
		if (lOutros === null) lOutros = pad.outros.filter(function (id) { return lFila.indexOf(id) < 0; });
		if (lFila === null) lFila = pad.fila.filter(function (id) { return lOutros.indexOf(id) < 0; });
		SISTEMAS.forEach(function (sistema) {
			const id = sistema.id;
			if (lFila.indexOf(id) >= 0 || lOutros.indexOf(id) >= 0) return;
			if (COM_OUTROS && sistema.outros === true) lOutros.push(id);
			else lFila.push(id);
		});
		return { fila: lFila, outros: lOutros };
	}

	function gravar() {
		const dados = { [ORDEM_KEY]: ordem };
		if (COM_OUTROS) dados[OUTROS_KEY] = outros;
		chrome.storage.local.set(dados).catch(function (err) {
			console.error("[Projudi] Erro ao gravar a ordem dos sistemas:", err);
		});
	}

	// Largura de cada card (depende do nome), medida uma vez já visível.
	const larguras = {};
	function largura(id) {
		const el = id === "__outros" ? botaoOutros : icones[id];
		if (!larguras[id] && el) {
			const w = el.offsetWidth;
			if (w) larguras[id] = w;
		}
		return larguras[id] || TAM;
	}

	// Posição (left) de cada card de `lista` (e do "Outros", colado à
	// balança), da balança para a esquerda.
	function posicoes(lista) {
		const lefts = {};
		let x = base.left;
		if (COM_OUTROS) {
			x -= ESPACO + largura("__outros");
			lefts.__outros = Math.max(4, x);
		}
		lista.forEach(function (id) {
			x -= ESPACO + largura(id);
			lefts[id] = Math.max(4, x);
		});
		return lefts;
	}

	function aplicarCores(el, cor) {
		el.style.setProperty("--claro", cor.claro);
		el.style.setProperty("--escuro", cor.escuro);
		el.style.setProperty("--borda", cor.borda);
		el.style.setProperty("--texto", cor.texto);
	}

	function criarCard(sistema, dica) {
		const icone = document.createElement("button");
		icone.type = "button";
		icone.className = "icone";
		icone.title = sistema.nome + " (" + orgao(sistema) + ") — abrir num popup sobre esta tela. " + dica;
		icone.setAttribute("aria-label", sistema.nome + " (" + orgao(sistema) + ")");
		aplicarCores(icone, sistema.cor);
		icone.textContent = sistema.rotulo;
		return icone;
	}

	function montar() {
		host = document.createElement("div");
		host.id = "pdp-sistemas-cnj-host";
		const shadow = host.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		style.textContent = CSS;
		shadow.append(style);
		icones = {};
		SISTEMAS.forEach(function (sistema) {
			const icone = criarCard(sistema, COM_OUTROS
				? "Arraste para o lado para mudar a posição, ou para o \"Outros\" para guardá-lo."
				: "Arraste para o lado para mudar a posição.");
			icone.hidden = true;
			icone.addEventListener("click", function (ev) {
				ev.stopPropagation();
				if (ignorarClique) { ignorarClique = false; return; }
				fecharPainel();
				abrir(sistema);
			});
			icone.addEventListener("pointerdown", function (ev) { iniciarArrasto(ev, sistema.id); });
			icone.addEventListener("pointermove", moverArrasto);
			icone.addEventListener("pointerup", soltarArrasto);
			icone.addEventListener("pointercancel", cancelarArrasto);
			shadow.append(icone);
			icones[sistema.id] = icone;
		});
		if (COM_OUTROS) {
			botaoOutros = document.createElement("button");
			botaoOutros.type = "button";
			botaoOutros.className = "icone";
			botaoOutros.hidden = true;
			aplicarCores(botaoOutros, COR_OUTROS);
			botaoOutros.addEventListener("click", function (ev) {
				ev.stopPropagation();
				painelAberto ? fecharPainel() : abrirPainel();
			});
			painel = document.createElement("div");
			painel.className = "painel";
			painel.hidden = true;
			shadow.append(botaoOutros, painel);
			atualizarBotaoOutros();
		}
		document.documentElement.append(host);
	}

	function atualizarBotaoOutros() {
		if (!botaoOutros) return;
		botaoOutros.textContent = "Outros " + (painelAberto ? "▴" : "▾");
		botaoOutros.title = "Outros sistemas (" + outros.length + "). Clique para ver; arraste um card da fila para cá para guardá-lo.";
		botaoOutros.setAttribute("aria-expanded", String(painelAberto));
	}

	function posicionar() {
		const pos = menuHost && menuHost.isConnected ? String(menuHost.getAttribute("data-pdp-icone-pos") || "").split(",") : [];
		const top = parseFloat(pos[0]);
		const left = parseFloat(pos[1]);
		if (!comProcesso || !isFinite(top) || !isFinite(left)) {
			if (arrasto) encerrarArrasto(false);
			if (arrastoPainel) encerrarArrastoPainel(false);
			fecharPainel();
			base = null;
			Object.keys(icones).forEach(function (id) { icones[id].hidden = true; });
			if (botaoOutros) botaoOutros.hidden = true;
			return;
		}
		base = { top: top, left: left };
		if (!host || !host.isConnected) montar();
		const lista = arrasto && arrasto.ativo ? arrasto.ordemTemp : ordem;
		Object.keys(icones).forEach(function (id) {
			icones[id].hidden = lista.indexOf(id) < 0 && !(arrasto && arrasto.id === id);
		});
		if (botaoOutros) botaoOutros.hidden = false; // visível antes de medir
		const lefts = posicoes(lista);
		lista.forEach(function (id) {
			const icone = icones[id];
			if (arrasto && arrasto.ativo && arrasto.id === id) return;
			icone.style.top = top + "px";
			icone.style.left = lefts[id] + "px";
		});
		if (botaoOutros) {
			botaoOutros.style.top = top + "px";
			botaoOutros.style.left = lefts.__outros + "px";
			posicionarPainel(lefts.__outros);
		}
	}

	// ------------------------------------------------------------------
	// Painel do "Outros"
	// ------------------------------------------------------------------

	function posicionarPainel(leftOutros) {
		if (!painel || !painelAberto || !base) return;
		const direita = leftOutros + largura("__outros");
		painel.style.top = (base.top + TAM + 6) + "px";
		painel.style.left = Math.max(4, Math.min(direita - LARGURA_PAINEL, innerWidth - LARGURA_PAINEL - 4)) + "px";
	}

	function montarPainel() {
		painel.textContent = "";
		const titulo = document.createElement("div");
		titulo.className = "titulo";
		titulo.textContent = "Outros sistemas";
		const lista = document.createElement("div");
		lista.className = "lista";
		alfabetica(outros).forEach(function (id) {
			const sistema = porId(id);
			const card = criarCard(sistema, "Arraste para cima de um card da fila para trocar os dois de lugar.");
			card.dataset.id = id;
			card.addEventListener("click", function (ev) {
				ev.stopPropagation();
				if (ignorarClique) { ignorarClique = false; return; }
				fecharPainel();
				abrir(sistema);
			});
			card.addEventListener("pointerdown", function (ev) { iniciarArrastoPainel(ev, id, card); });
			card.addEventListener("pointermove", moverArrastoPainel);
			card.addEventListener("pointerup", function () { encerrarArrastoPainel(true); });
			card.addEventListener("pointercancel", function () { encerrarArrastoPainel(false); });
			lista.append(card);
		});
		if (!outros.length) {
			const vazio = document.createElement("div");
			vazio.className = "vazio";
			vazio.textContent = "Nenhum sistema guardado aqui.";
			lista.append(vazio);
		}
		const dica = document.createElement("div");
		dica.className = "dica";
		dica.textContent = "Clique para abrir. Arraste um card daqui para cima de um card da fila para trocar os dois de lugar; arraste um card da fila para cá para guardá-lo.";
		painel.append(titulo, lista, dica);
	}

	function abrirPainel() {
		if (!painel || !base) return;
		painelAberto = true;
		montarPainel();
		painel.hidden = false;
		atualizarBotaoOutros();
		posicionar();
		document.addEventListener("mousedown", fecharPainelFora, true);
		document.addEventListener("keydown", fecharPainelEsc, true);
	}

	function fecharPainel() {
		if (!painelAberto) return;
		painelAberto = false;
		if (painel) painel.hidden = true;
		atualizarBotaoOutros();
		document.removeEventListener("mousedown", fecharPainelFora, true);
		document.removeEventListener("keydown", fecharPainelEsc, true);
	}

	function fecharPainelFora(ev) {
		if (!ev.composedPath().includes(host)) fecharPainel();
	}

	function fecharPainelEsc(ev) {
		if (ev.key === "Escape") fecharPainel();
	}

	function dentro(el, x, y) {
		if (!el || el.hidden) return false;
		const r = el.getBoundingClientRect();
		return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
	}

	// ------------------------------------------------------------------
	// Arrastar um card da fila: muda a posição ou guarda no "Outros"
	// ------------------------------------------------------------------

	function iniciarArrasto(ev, id) {
		if (ev.button !== 0 || !base) return;
		arrasto = { id: id, inicioX: ev.clientX, inicioY: ev.clientY, leftInicial: parseFloat(icones[id].style.left) || 0, ativo: false, ordemTemp: ordem.slice(), noOutros: false };
		try { icones[id].setPointerCapture(ev.pointerId); } catch (err) { /* segue sem captura */ }
	}

	function moverArrasto(ev) {
		if (!arrasto || !base) return;
		const dx = ev.clientX - arrasto.inicioX;
		const dy = ev.clientY - arrasto.inicioY;
		if (!arrasto.ativo) {
			if (Math.abs(dx) < LIMIAR_ARRASTO && Math.abs(dy) < LIMIAR_ARRASTO) return;
			arrasto.ativo = true;
			icones[arrasto.id].classList.add("arrastando");
			Object.keys(icones).forEach(function (id) { if (id !== arrasto.id) icones[id].classList.add("deslizando"); });
		}
		const icone = icones[arrasto.id];
		const left = arrasto.leftInicial + dx;
		icone.style.left = left + "px";
		icone.style.top = (base.top + (COM_OUTROS ? dy : 0)) + "px";
		const temp = ordem.filter(function (id) { return id !== arrasto.id; });
		// Sobre o card "Outros" (ou o painel aberto): soltar guarda o card lá.
		arrasto.noOutros = COM_OUTROS && (dentro(botaoOutros, ev.clientX, ev.clientY) || dentro(painel, ev.clientX, ev.clientY));
		if (botaoOutros) botaoOutros.classList.toggle("alvo", arrasto.noOutros);
		if (painel) painel.classList.toggle("alvo", arrasto.noOutros && painelAberto);
		if (!arrasto.noOutros) {
			// Destino: quantos dos outros cards ficam à direita do centro do card
			// arrastado (a lista vai da balança para a esquerda).
			const centro = left + largura(arrasto.id) / 2;
			const lefts = posicoes(ordem);
			const destino = temp.filter(function (id) { return lefts[id] + largura(id) / 2 > centro; }).length;
			temp.splice(destino, 0, arrasto.id);
		}
		arrasto.ordemTemp = temp;
		posicionar();
	}

	function evitarClique() {
		// O "click" que o navegador dispara ao soltar não abre o sistema.
		ignorarClique = true;
		setTimeout(function () { ignorarClique = false; }, 0);
	}

	function encerrarArrasto(salvar) {
		if (!arrasto) return;
		const foi = arrasto;
		arrasto = null;
		Object.keys(icones).forEach(function (id) { icones[id].classList.remove("arrastando", "deslizando"); });
		if (botaoOutros) botaoOutros.classList.remove("alvo");
		if (painel) painel.classList.remove("alvo");
		if (foi.ativo) {
			evitarClique();
			if (salvar && foi.noOutros) {
				ordem = ordem.filter(function (id) { return id !== foi.id; });
				outros = outros.concat(foi.id);
				gravar();
				if (painelAberto) montarPainel();
				atualizarBotaoOutros();
			} else if (salvar && foi.ordemTemp.join() !== ordem.join()) {
				ordem = foi.ordemTemp;
				gravar();
			}
		}
		posicionar();
	}

	function soltarArrasto() { encerrarArrasto(true); }
	function cancelarArrasto() { encerrarArrasto(false); }

	// ------------------------------------------------------------------
	// Arrastar um card do painel "Outros" para cima de um card da fila
	// ------------------------------------------------------------------

	function iniciarArrastoPainel(ev, id, card) {
		if (ev.button !== 0) return;
		arrastoPainel = { id: id, card: card, inicioX: ev.clientX, inicioY: ev.clientY, ativo: false, alvo: null };
		try { card.setPointerCapture(ev.pointerId); } catch (err) { /* segue sem captura */ }
	}

	function moverArrastoPainel(ev) {
		const a = arrastoPainel;
		if (!a) return;
		const dx = ev.clientX - a.inicioX;
		const dy = ev.clientY - a.inicioY;
		if (!a.ativo) {
			if (Math.abs(dx) < LIMIAR_ARRASTO && Math.abs(dy) < LIMIAR_ARRASTO) return;
			a.ativo = true;
			a.card.classList.add("arrastando");
		}
		a.card.style.transform = "translate(" + dx + "px, " + dy + "px) scale(1.08)";
		const alvo = ordem.filter(function (id) { return dentro(icones[id], ev.clientX, ev.clientY); })[0] || null;
		if (alvo !== a.alvo) {
			if (a.alvo) icones[a.alvo].classList.remove("alvo");
			if (alvo) icones[alvo].classList.add("alvo");
			a.alvo = alvo;
		}
	}

	function encerrarArrastoPainel(salvar) {
		const a = arrastoPainel;
		if (!a) return;
		arrastoPainel = null;
		a.card.classList.remove("arrastando");
		a.card.style.transform = "";
		if (a.alvo) icones[a.alvo].classList.remove("alvo");
		if (!a.ativo) return;
		evitarClique();
		if (!salvar || !a.alvo) return;
		// Troca: o card do painel ocupa o lugar do alvo; o alvo vai para o
		// "Outros".
		ordem = ordem.map(function (id) { return id === a.alvo ? a.id : id; });
		outros = outros.filter(function (id) { return id !== a.id; }).concat(a.alvo);
		gravar();
		montarPainel();
		atualizarBotaoOutros();
		posicionar();
	}

	function aplicarSalvo(dados) {
		const r = normalizar(dados[ORDEM_KEY], dados[OUTROS_KEY]);
		ordem = r.fila;
		outros = r.outros;
		if (painelAberto) montarPainel();
		atualizarBotaoOutros();
		posicionar();
	}

	chrome.storage.local.get([ORDEM_KEY, OUTROS_KEY]).then(aplicarSalvo).catch(function (err) {
		console.error("[Projudi] Erro ao ler a ordem dos sistemas:", err);
	});
	// Outra aba (ou a importação de preferências) mudou a ordem.
	chrome.storage.onChanged.addListener(function (mudancas, area) {
		if (area !== "local" || !(mudancas[ORDEM_KEY] || mudancas[OUTROS_KEY])) return;
		if (arrasto || arrastoPainel) return;
		chrome.storage.local.get([ORDEM_KEY, OUTROS_KEY]).then(aplicarSalvo).catch(function () {});
	});

	// A balança (#pdp-menu-host) é montada direto em <html>, às vezes alguns
	// segundos depois do carregamento (ver iniciar em menuExtensao.js).
	function procurarMenu() {
		const atual = document.getElementById("pdp-menu-host");
		if (atual === menuHost) return;
		observaMenu.disconnect();
		menuHost = atual;
		if (menuHost) observaMenu.observe(menuHost, { attributes: true, attributeFilter: ["data-pdp-icone-pos"] });
		posicionar();
	}

	(function () { const p = padrao(); ordem = p.fila; outros = p.outros; })();
	new MutationObserver(procurarMenu).observe(document.documentElement, { childList: true });
	comProcesso = processoNaAba();
	procurarMenu();
	setInterval(conferirProcesso, 1000);
})();
