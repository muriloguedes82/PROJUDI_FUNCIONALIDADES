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
// No SEEU só aparecem os ícones marcados com `seeu: true` na lista (BNMP 3.0
// e Sistema Uniformizado); a ordem não é gravada ali, para não mexer na
// ordem escolhida no Projudi.
//
// A ordem dos ícones pode ser trocada arrastando um deles para o lado; ela
// fica em chrome.storage.local ("pdpSistemasCnjOrdem", lista de ids) e, por
// começar com "pdp", entra no Exportar/Importar do Menu (menuExtensao.js).
// Um clique sem arrastar abre o sistema.
//
// O clique abre o sistema num popup sobre a própria tela do processo - o
// mesmo tipo de janela usado pelas ações rápidas (Remessa, Concluso etc.,
// ver showActionModal em quickActions.js) -, sem nova aba. Se a balança
// estiver num frame só do cabeçalho, o popup é aberto no documento do topo,
// para ocupar a tela toda. No cabeçalho do popup, "🗂 Nova aba" abre o
// mesmo endereço numa aba nova do navegador (ao lado da do processo) e
// "🖥 Segundo monitor" numa janela maximizada no outro monitor, se houver
// (ver sistemas-cnj-open em background.js).
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
	const ORDEM_KEY = "pdpSistemasCnjOrdem";
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

	// `onde`: "aba" ou "monitor". O popup só fecha se abriu de fato (ex.:
	// sem segundo monitor, avisa e mantém o popup).
	function openOutside(sistema, onde) {
		chrome.runtime.sendMessage({ source: "projudi-preview", type: "sistemas-cnj-open", sistema: sistema.id, onde: onde })
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
			'<button type="button" class="pdp-qa-modal-close pdp-sistemas-cnj-aba">🗂 Nova aba</button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-sistemas-cnj-monitor">🖥 Segundo monitor</button>' +
			'<button type="button" class="pdp-qa-modal-close pdp-sistemas-cnj-close">✕ Fechar</button>' +
			"</span></div>" +
			'<div class="pdp-qa-modal-body"><iframe class="pdp-sistemas-cnj-iframe" style="width: 100%; height: 100%; border: none; display: block;" allow="clipboard-read; clipboard-write; fullscreen"></iframe></div>' +
			"</div>";
		backdrop.querySelector(".pdp-sistemas-cnj-titulo").textContent = sistema.nome + " — " + orgao(sistema);
		const aba = backdrop.querySelector(".pdp-sistemas-cnj-aba");
		aba.title = "Abrir o " + sistema.nome + " numa nova aba deste navegador";
		aba.addEventListener("click", function () { openOutside(sistema, "aba"); });
		const monitor = backdrop.querySelector(".pdp-sistemas-cnj-monitor");
		monitor.title = "Abrir o " + sistema.nome + " numa janela no segundo monitor, se houver";
		monitor.addEventListener("click", function () { openOutside(sistema, "monitor"); });
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
	let ordem = SISTEMAS.map(function (s) { return s.id; });
	let base = null; // { top, left } da balança
	let arrasto = null; // { id, inicioX, leftInicial, ativo, ordemTemp }
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

	// Ordem salva: ids conhecidos na ordem do usuário + os que faltarem
	// (sistema novo numa versão futura) na ordem padrão.
	function normalizarOrdem(salva) {
		const padrao = SISTEMAS.map(function (s) { return s.id; });
		const lista = (Array.isArray(salva) ? salva : []).filter(function (id, i, a) {
			return padrao.indexOf(id) >= 0 && a.indexOf(id) === i;
		});
		return lista.concat(padrao.filter(function (id) { return lista.indexOf(id) < 0; }));
	}

	function gravarOrdem() {
		if (NO_SEEU) return; // no SEEU a lista é reduzida (só `seeu: true`)
		chrome.storage.local.set({ [ORDEM_KEY]: ordem }).catch(function (err) {
			console.error("[Projudi] Erro ao gravar a ordem dos sistemas do CNJ:", err);
		});
	}

	// Largura de cada card (depende do nome), medida uma vez já visível.
	const larguras = {};
	function largura(id) {
		if (!larguras[id]) {
			const w = icones[id].offsetWidth;
			if (w) larguras[id] = w;
		}
		return larguras[id] || TAM;
	}

	// Posição (left) de cada card de `lista`, da balança para a esquerda.
	function posicoes(lista) {
		const lefts = {};
		let x = base.left;
		lista.forEach(function (id) {
			x -= ESPACO + largura(id);
			lefts[id] = Math.max(4, x);
		});
		return lefts;
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
			const icone = document.createElement("button");
			icone.type = "button";
			icone.className = "icone";
			icone.title = sistema.nome + " (" + orgao(sistema) + ") — abrir num popup sobre esta tela. Arraste para o lado para mudar a posição.";
			icone.setAttribute("aria-label", sistema.nome + " (" + orgao(sistema) + ")");
			icone.style.setProperty("--claro", sistema.cor.claro);
			icone.style.setProperty("--escuro", sistema.cor.escuro);
			icone.style.setProperty("--borda", sistema.cor.borda);
			icone.style.setProperty("--texto", sistema.cor.texto);
			icone.textContent = sistema.rotulo;
			icone.hidden = true;
			icone.addEventListener("click", function (ev) {
				ev.stopPropagation();
				if (ignorarClique) { ignorarClique = false; return; }
				abrir(sistema);
			});
			icone.addEventListener("pointerdown", function (ev) { iniciarArrasto(ev, sistema.id); });
			icone.addEventListener("pointermove", moverArrasto);
			icone.addEventListener("pointerup", soltarArrasto);
			icone.addEventListener("pointercancel", cancelarArrasto);
			shadow.append(icone);
			icones[sistema.id] = icone;
		});
		document.documentElement.append(host);
	}

	function posicionar() {
		const pos = menuHost && menuHost.isConnected ? String(menuHost.getAttribute("data-pdp-icone-pos") || "").split(",") : [];
		const top = parseFloat(pos[0]);
		const left = parseFloat(pos[1]);
		if (!comProcesso || !isFinite(top) || !isFinite(left)) {
			if (arrasto) encerrarArrasto(false);
			base = null;
			Object.keys(icones).forEach(function (id) { icones[id].hidden = true; });
			return;
		}
		base = { top: top, left: left };
		if (!host || !host.isConnected) montar();
		const lista = arrasto && arrasto.ativo ? arrasto.ordemTemp : ordem;
		lista.forEach(function (id) { icones[id].hidden = false; }); // visível antes de medir
		const lefts = posicoes(lista);
		lista.forEach(function (id) {
			const icone = icones[id];
			icone.style.top = top + "px";
			if (!(arrasto && arrasto.ativo && arrasto.id === id)) icone.style.left = lefts[id] + "px";
		});
	}

	// ------------------------------------------------------------------
	// Arrastar para trocar a posição
	// ------------------------------------------------------------------

	function iniciarArrasto(ev, id) {
		if (ev.button !== 0 || !base) return;
		arrasto = { id: id, inicioX: ev.clientX, leftInicial: parseFloat(icones[id].style.left) || 0, ativo: false, ordemTemp: ordem.slice() };
		try { icones[id].setPointerCapture(ev.pointerId); } catch (err) { /* segue sem captura */ }
	}

	function moverArrasto(ev) {
		if (!arrasto || !base) return;
		const dx = ev.clientX - arrasto.inicioX;
		if (!arrasto.ativo) {
			if (Math.abs(dx) < LIMIAR_ARRASTO) return;
			arrasto.ativo = true;
			icones[arrasto.id].classList.add("arrastando");
			Object.keys(icones).forEach(function (id) { if (id !== arrasto.id) icones[id].classList.add("deslizando"); });
		}
		const left = arrasto.leftInicial + dx;
		icones[arrasto.id].style.left = left + "px";
		// Destino: quantos dos outros cards ficam à direita do centro do card
		// arrastado (a lista vai da balança para a esquerda).
		const centro = left + largura(arrasto.id) / 2;
		const temp = ordem.filter(function (id) { return id !== arrasto.id; });
		const lefts = posicoes(ordem);
		const destino = temp.filter(function (id) { return lefts[id] + largura(id) / 2 > centro; }).length;
		temp.splice(destino, 0, arrasto.id);
		arrasto.ordemTemp = temp;
		posicionar();
	}

	function encerrarArrasto(salvar) {
		if (!arrasto) return;
		const foi = arrasto;
		arrasto = null;
		Object.keys(icones).forEach(function (id) { icones[id].classList.remove("arrastando", "deslizando"); });
		if (foi.ativo) {
			// O "click" que o navegador dispara ao soltar não abre o sistema.
			ignorarClique = true;
			setTimeout(function () { ignorarClique = false; }, 0);
			if (salvar && foi.ordemTemp.join() !== ordem.join()) {
				ordem = foi.ordemTemp;
				gravarOrdem();
			}
		}
		posicionar();
	}

	function soltarArrasto() { encerrarArrasto(true); }
	function cancelarArrasto() { encerrarArrasto(false); }

	chrome.storage.local.get(ORDEM_KEY).then(function (dados) {
		ordem = normalizarOrdem(dados[ORDEM_KEY]);
		posicionar();
	}).catch(function (err) {
		console.error("[Projudi] Erro ao ler a ordem dos sistemas do CNJ:", err);
	});
	// Outra aba (ou a importação de preferências) mudou a ordem.
	chrome.storage.onChanged.addListener(function (mudancas, area) {
		if (area !== "local" || !mudancas[ORDEM_KEY]) return;
		ordem = normalizarOrdem(mudancas[ORDEM_KEY].newValue);
		if (!arrasto) posicionar();
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

	new MutationObserver(procurarMenu).observe(document.documentElement, { childList: true });
	comProcesso = processoNaAba();
	procurarMenu();
	setInterval(conferirProcesso, 1000);
})();
