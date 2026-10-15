// Painéis de preferências (infraestrutura, sempre carregado): topo fixo,
// busca e encaixe na tela, usados por todos os painéis que listam
// preferências - ⭐ da linha e ⭐ Em lote (preferenciasNaLinha.js), ⭐ Minhas
// Preferências e painéis das ações rápidas (quickActions.js), 📎 Juntar
// Documento (juntarDocumento.js), ⭐ de Alterar Classe/Assuntos
// (alterarClasseAssuntos.js), Analisar Decurso (decursoNaLinha.js) e
// 📍 Localizador (localizadorSeeu.js).
//
// Com muitas preferências esses painéis ficavam compridos e o que vinha no
// fim - em especial o "+ Nova preferência" - saía da tela ou exigia rolar
// tudo (ou diminuir o zoom). Aqui:
//   - topo(painel, opcoes): põe no início do painel uma faixa que fica
//     parada enquanto o resto rola, com o que o painel quiser (título,
//     botões, "+ Nova preferência") e, se houver itens suficientes, o
//     campo "🔍 Buscar preferência";
//   - filtrar(painel): reaplica a busca (chamar depois de acrescentar
//     itens ao painel);
//   - caber(painel, ancora): põe o painel (position: fixed) abaixo da
//     âncora; se não couber, acima; se não couber em nenhum dos dois, sobe
//     até caber inteiro - a altura máxima é a da tela e ele rola por dentro.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpPainelPrefs) return;

	const MARGEM = 8;
	// Abaixo disso a busca só atrapalha (aparece quando o painel cresce).
	const MINIMO_PARA_BUSCA = 6;

	function semAcento(texto) {
		return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function config(painel) {
		return painel && painel.__pdpPainelPrefs;
	}

	function termo(painel) {
		const c = config(painel);
		return c && c.busca ? semAcento(c.busca.value).trim() : "";
	}

	// opcoes:
	//   itens: seletor dos itens filtráveis (cards/chips de preferência);
	//   grupos: seletor dos blocos que somem quando ficam sem itens à vista;
	//   texto(item): texto pesquisado (padrão: o texto do item e o rótulo
	//     do bloco, em `rotulo`);
	//   rotulo: seletor, dentro do bloco, do nome do bloco (ex.: a ação);
	//   conteudo: nós que vão para o topo (título, botões...);
	//   novas: botões "+ Nova preferência" (ficam à direita da busca);
	//   aoFiltrar(termo): chamado depois de cada filtragem;
	//   minimo: quantidade de itens a partir da qual a busca aparece.
	function topo(painel, opcoes) {
		const o = opcoes || {};
		const faixa = document.createElement("div");
		faixa.className = "pdp-pp-topo";
		(o.conteudo || []).forEach(function (n) { if (n) faixa.appendChild(n); });
		const barra = document.createElement("div");
		barra.className = "pdp-pp-barra";
		const busca = document.createElement("input");
		busca.type = "search";
		busca.className = "pdp-pp-busca";
		busca.placeholder = "🔍 Buscar preferência…";
		busca.title = "Mostra só as preferências com este texto no nome (ou no nome da ação). Não precisa de acento nem de maiúsculas.";
		busca.setAttribute("aria-label", "Buscar preferência");
		busca.hidden = true;
		barra.appendChild(busca);
		const novas = document.createElement("span");
		novas.className = "pdp-pp-novas";
		(o.novas || []).forEach(function (n) { if (n) novas.appendChild(n); });
		barra.appendChild(novas);
		faixa.appendChild(barra);
		painel.insertBefore(faixa, painel.firstChild);
		painel.classList.add("pdp-pp-painel");
		painel.__pdpPainelPrefs = Object.assign({}, o, { faixa: faixa, busca: busca, barra: barra });
		busca.addEventListener("input", function () {
			filtrar(painel);
			const c = config(painel);
			if (c.ancora) caber(painel, c.ancora);
		});
		// Esc na busca com texto: só limpa (não fecha o painel).
		busca.addEventListener("keydown", function (ev) {
			if (ev.key === "Escape" && busca.value) {
				ev.preventDefault();
				ev.stopPropagation();
				busca.value = "";
				filtrar(painel);
			}
		});
		filtrar(painel);
		return faixa;
	}

	// Elemento que rola: o próprio painel ou um ancestral (ex.: o 📍
	// Localizador rola a caixa de fora, não a lista).
	function rolagemDe(painel) {
		for (let n = painel; n && n !== document.body; n = n.parentElement) {
			if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n;
		}
		return painel;
	}

	// O topo encosta nas bordas do painel, cobrindo o recuo dele, para que
	// nada apareça acima dele ao rolar.
	function ajustarTopo(painel) {
		const c = config(painel);
		if (!c) return;
		const cs = getComputedStyle(painel);
		const t = parseFloat(cs.paddingTop) || 0, d = parseFloat(cs.paddingRight) || 0, e = parseFloat(cs.paddingLeft) || 0;
		const tRolagem = parseFloat(getComputedStyle(rolagemDe(painel)).paddingTop) || 0;
		const f = c.faixa;
		f.style.top = -tRolagem + "px";
		f.style.margin = -t + "px " + -d + "px 6px " + -e + "px";
		f.style.padding = Math.max(t, 6) + "px " + Math.max(d, 6) + "px 6px " + Math.max(e, 6) + "px";
	}

	function textoDe(c, item) {
		if (c.texto) return c.texto(item);
		const grupo = c.grupos ? item.closest(c.grupos) : null;
		const rotulo = grupo && c.rotulo ? grupo.querySelector(c.rotulo) : null;
		return item.textContent + " " + (rotulo ? rotulo.textContent : "");
	}

	function filtrar(painel) {
		const c = config(painel);
		if (!c) return;
		if (painel.isConnected) ajustarTopo(painel);
		const itens = c.itens ? painel.querySelectorAll(c.itens) : [];
		const minimo = c.minimo != null ? c.minimo : MINIMO_PARA_BUSCA;
		if (itens.length >= minimo || c.busca.value) c.busca.hidden = false;
		c.barra.hidden = c.busca.hidden && !c.barra.querySelector(".pdp-pp-novas > *");
		// Sem nada para mostrar (painel pequeno, sem título): nem a faixa.
		c.faixa.hidden = c.barra.hidden && c.faixa.children.length === 1;
		const t = termo(painel);
		let visiveis = 0;
		Array.prototype.forEach.call(itens, function (item) {
			const oculto = !!t && semAcento(textoDe(c, item)).indexOf(t) === -1;
			item.classList.toggle("pdp-pp-oculto", oculto);
			if (!oculto) visiveis++;
		});
		if (c.grupos) {
			painel.querySelectorAll(c.grupos).forEach(function (g) {
				const temItens = !!g.querySelector(c.itens);
				g.classList.toggle("pdp-pp-oculto", !!t && temItens && !g.querySelector(c.itens + ":not(.pdp-pp-oculto)"));
			});
		}
		let aviso = painel.querySelector(".pdp-pp-sem-resultado");
		const nenhum = !!t && itens.length > 0 && visiveis === 0;
		if (nenhum && !aviso) {
			aviso = document.createElement("div");
			aviso.className = "pdp-pp-sem-resultado";
			c.faixa.insertAdjacentElement("afterend", aviso);
		}
		if (aviso) {
			aviso.hidden = !nenhum;
			aviso.textContent = "Nenhuma preferência com \"" + c.busca.value.trim() + "\".";
		}
		if (c.aoFiltrar) c.aoFiltrar(t);
	}

	function caber(painel, ancora) {
		const c = config(painel);
		if (c) c.ancora = ancora;
		painel.style.position = "fixed";
		painel.style.boxSizing = "border-box";
		painel.style.maxHeight = (window.innerHeight - 2 * MARGEM) + "px";
		painel.style.overflowY = "auto";
		painel.style.bottom = "auto";
		painel.style.right = "auto";
		const r = ancora.getBoundingClientRect();
		const largura = painel.offsetWidth;
		const altura = painel.offsetHeight;
		let top = r.bottom + 4;
		if (top + altura > window.innerHeight - MARGEM) {
			top = r.top - altura - 4 >= MARGEM ? r.top - altura - 4 : window.innerHeight - altura - MARGEM;
		}
		painel.style.left = Math.max(MARGEM, Math.min(r.left, window.innerWidth - largura - MARGEM)) + "px";
		painel.style.top = Math.max(MARGEM, top) + "px";
		if (c) ajustarTopo(painel);
	}

	window.__pdpPainelPrefs = { topo: topo, filtrar: filtrar, caber: caber, termo: termo, ajustarTopo: ajustarTopo };
})();
