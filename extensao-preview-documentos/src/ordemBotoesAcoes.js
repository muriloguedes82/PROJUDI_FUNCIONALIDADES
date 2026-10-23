// Projudi/SEEU - Ordem dos botões da barra de Ações Rápidas (#pdp-qa-row),
// escolhida pelo usuário arrastando os botões, como nos cards dos sistemas
// do CNJ (sistemasCnj.js).
//
// Os botões da barra correm numa fila só (as .pdp-qa-row-line têm
// display: contents, ver quickActions.css), então a ordem é aplicada pela
// propriedade CSS `order` de cada botão - nenhum botão sai do lugar no
// HTML. Isso importa porque outros scripts (habilitarAdvogado.js,
// editarPartes.js, juntarDocumento.js, localizadorSeeu.js, oraculo.js)
// põem seus botões ao lado de outros e os recolocam se acharem que
// saíram do lugar.
//
// Cada botão é identificado por uma chave estável (ver chaveDe): o id, o
// grupo de ação (data-group-id) ou o painel (data-panel-id). A ordem
// salva é a lista dessas chaves, em chrome.storage.local
// ("pdpAcoesRapidasOrdem" no Projudi, "pdpAcoesRapidasOrdemSeeu" no SEEU) -
// por começar com "pdp", entra no Exportar/Importar do Menu. Botão que
// ainda não está na lista salva (função ligada depois, botão novo de uma
// versão nova) entra logo depois do botão que vem antes dele no HTML.
// Botão escondido ou de função desligada guarda o seu lugar na lista e
// volta para ele quando reaparece.
//
// Um clique sem arrastar continua acionando o botão normalmente.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido || window.__pdpOrdemBotoesAcoes) return;
	if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return;
	window.__pdpOrdemBotoesAcoes = true;

	const NO_SEEU = /(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname);
	const ORDEM_KEY = NO_SEEU ? "pdpAcoesRapidasOrdemSeeu" : "pdpAcoesRapidasOrdem";
	const LIMIAR_ARRASTO = 5; // px de movimento antes de virar arrasto

	let row = null;
	let salva = []; // ordem gravada (chaves)
	let arrasto = null; // { botao, chave, inicioX, inicioY, ativo, ordemTemp }
	let ignorarClique = false;
	let observador = null;

	const estilo = document.createElement("style");
	estilo.textContent =
		"#pdp-qa-row .pdp-qa-group-btn.pdp-qa-arrastando { opacity: .55; outline: 2px dashed #6c93d6; outline-offset: 1px; cursor: grabbing; }" +
		"html.pdp-qa-arrastando-barra, html.pdp-qa-arrastando-barra * { cursor: grabbing !important; user-select: none !important; }";
	(document.head || document.documentElement).appendChild(estilo);

	function chaveDe(botao) {
		if (botao.id) return "#" + botao.id;
		if (botao.dataset.groupId) return "g:" + botao.dataset.groupId;
		if (botao.dataset.panelId) return "p:" + botao.dataset.panelId;
		if (botao.dataset.pdpParte) return "parte:" + botao.dataset.pdpParte;
		return null;
	}

	// Botões da barra, na ordem do HTML (com ou sem chave).
	function botoes() {
		return row ? Array.prototype.slice.call(row.querySelectorAll(".pdp-qa-group-btn")) : [];
	}

	// Junta a ordem salva com os botões presentes: cada botão que não está
	// na lista entra logo depois do anterior a ele no HTML (ou no começo).
	function ordemCompleta(base) {
		const lista = base.slice();
		let anterior = null;
		botoes().forEach(function (b) {
			const chave = chaveDe(b);
			if (!chave) return;
			if (lista.indexOf(chave) < 0) {
				const pos = anterior ? lista.indexOf(anterior) + 1 : 0;
				lista.splice(pos, 0, chave);
			}
			anterior = chave;
		});
		return lista;
	}

	function aplicar(lista) {
		if (!row) return;
		const completa = ordemCompleta(lista || salva);
		botoes().forEach(function (b, i) {
			const chave = chaveDe(b);
			// Sem chave: fica no fim, na ordem do HTML.
			const valor = String(chave ? completa.indexOf(chave) : completa.length + i);
			if (b.style.order !== valor) b.style.order = valor;
		});
	}

	function gravar(lista) {
		salva = lista;
		chrome.storage.local.set({ [ORDEM_KEY]: lista }).catch(function (err) {
			console.error("[Projudi] Erro ao gravar a ordem dos botões:", err);
		});
	}

	// ------------------------------------------------------------------
	// Arrastar
	// ------------------------------------------------------------------

	function aoPressionar(ev) {
		if (ev.button !== 0 || arrasto) return;
		const botao = ev.target.closest && ev.target.closest(".pdp-qa-group-btn");
		if (!botao || !row.contains(botao)) return;
		// A caixa "sempre" dentro de um botão (ver quickActions.css) continua
		// sendo só um clique.
		if (ev.target.closest("input, select, textarea, label")) return;
		const chave = chaveDe(botao);
		if (!chave) return;
		arrasto = { botao: botao, chave: chave, id: ev.pointerId, inicioX: ev.clientX, inicioY: ev.clientY, ativo: false, ordemTemp: null };
	}

	function aoMover(ev) {
		if (!arrasto || ev.pointerId !== arrasto.id) return;
		if (!arrasto.ativo) {
			if (Math.abs(ev.clientX - arrasto.inicioX) < LIMIAR_ARRASTO && Math.abs(ev.clientY - arrasto.inicioY) < LIMIAR_ARRASTO) return;
			arrasto.ativo = true;
			arrasto.botao.classList.add("pdp-qa-arrastando");
			document.documentElement.classList.add("pdp-qa-arrastando-barra");
		}
		ev.preventDefault();
		// Botão (à vista) sob o ponteiro: o arrastado vai para antes ou
		// depois dele, conforme o lado em que o ponteiro está.
		const alvo = botoes().filter(function (b) {
			if (b === arrasto.botao || !chaveDe(b) || !b.getClientRects().length) return false;
			const r = b.getBoundingClientRect();
			return ev.clientX >= r.left - 3 && ev.clientX <= r.right + 3 && ev.clientY >= r.top - 4 && ev.clientY <= r.bottom + 4;
		})[0];
		if (!alvo) return;
		const r = alvo.getBoundingClientRect();
		const depois = ev.clientX > r.left + r.width / 2;
		const lista = ordemCompleta(arrasto.ordemTemp || salva).filter(function (c) { return c !== arrasto.chave; });
		const pos = lista.indexOf(chaveDe(alvo)) + (depois ? 1 : 0);
		lista.splice(pos, 0, arrasto.chave);
		if (arrasto.ordemTemp && arrasto.ordemTemp.join() === lista.join()) return;
		arrasto.ordemTemp = lista;
		aplicar(lista);
		window.dispatchEvent(new Event("pdp-buttons-layout"));
	}

	function encerrar(salvar) {
		const a = arrasto;
		if (!a) return;
		arrasto = null;
		a.botao.classList.remove("pdp-qa-arrastando");
		document.documentElement.classList.remove("pdp-qa-arrastando-barra");
		if (!a.ativo) return;
		// O "click" que o navegador dispara ao soltar não aciona o botão.
		ignorarClique = true;
		setTimeout(function () { ignorarClique = false; }, 0);
		if (salvar && a.ordemTemp && a.ordemTemp.join() !== ordemCompleta(salva).join()) gravar(a.ordemTemp);
		aplicar();
		window.dispatchEvent(new Event("pdp-buttons-layout"));
	}

	function aoClicar(ev) {
		if (!ignorarClique) return;
		ev.preventDefault();
		ev.stopImmediatePropagation();
		ignorarClique = false;
	}

	document.addEventListener("pointerdown", function (ev) { if (row && row.contains(ev.target)) aoPressionar(ev); }, true);
	document.addEventListener("pointermove", aoMover, true);
	document.addEventListener("pointerup", function () { encerrar(true); }, true);
	document.addEventListener("pointercancel", function () { encerrar(false); }, true);
	document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && arrasto) encerrar(false); }, true);
	document.addEventListener("click", aoClicar, true);

	// ------------------------------------------------------------------
	// A barra é criada (e às vezes recriada) por quickActions.js; os botões
	// dos outros scripts chegam depois.
	// ------------------------------------------------------------------

	function procurarBarra() {
		const atual = document.getElementById("pdp-qa-row");
		if (atual === row) return;
		if (observador) observador.disconnect();
		row = atual;
		if (!row) return;
		observador = new MutationObserver(function () { if (!arrasto) aplicar(); });
		observador.observe(row, { childList: true, subtree: true, attributes: true, attributeFilter: ["id", "data-group-id", "data-panel-id"] });
		aplicar();
	}

	new MutationObserver(procurarBarra).observe(document.documentElement, { childList: true, subtree: true });
	procurarBarra();

	chrome.storage.local.get(ORDEM_KEY).then(function (d) {
		salva = Array.isArray(d[ORDEM_KEY]) ? d[ORDEM_KEY] : [];
		aplicar();
	}).catch(function (err) {
		console.error("[Projudi] Erro ao ler a ordem dos botões:", err);
	});
	// Outra aba (ou a importação de preferências) mudou a ordem.
	chrome.storage.onChanged.addListener(function (mudancas, area) {
		if (area !== "local" || !mudancas[ORDEM_KEY] || arrasto) return;
		salva = Array.isArray(mudancas[ORDEM_KEY].newValue) ? mudancas[ORDEM_KEY].newValue : [];
		aplicar();
		window.dispatchEvent(new Event("pdp-buttons-layout"));
	});
})();
