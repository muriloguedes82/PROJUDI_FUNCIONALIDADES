// Projudi - Conclusões por Juiz (lista de Conclusões)
//
// Na lista "Conclusões" (processo/conclusao.do), acima da tabela, mostra um
// card para cada juiz (coluna "Responsável") com o total de conclusões dele
// e, dentro do card, o total por tipo de conclusão (coluna "Tipo de
// conclusão": SENTENÇA, DECISÃO, DESPACHO...), com uma barra proporcional.
//
// Clicar no total do card mostra na tabela só as conclusões daquele juiz;
// clicar num tipo, só as daquele juiz e tipo. Clicar de novo (ou em
// "Mostrar todas") volta a lista inteira. O filtro só esconde linhas na
// tela: nada é alterado no Projudi.
//
// Os totais são refeitos sozinhos quando a lista muda — por exemplo,
// quando "Listas em uma única página" (listasPaginaUnica.js) acrescenta as
// linhas das outras páginas. As colunas são achadas pelo título do
// cabeçalho, então a ordem delas pode mudar sem quebrar a contagem.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (!/^\/projudi\/processo\/conclusao\.do$/.test(location.pathname)) return;
	// Nunca nos iframes ocultos que a extensão usa para carregar telas.
	try {
		const fe = window.frameElement;
		if (fe) {
			if (fe.classList.contains("pdp-qa-modal-iframe")) return;
			for (const a of Array.from(fe.attributes)) if (/^data-pdp-/.test(a.name)) return;
		}
	} catch (e) { /* frame de outra origem */ }
	if (window.__pdpConclusoesPorJuiz) return;
	window.__pdpConclusoesPorJuiz = true;

	const SEM_RESPONSAVEL = "Sem responsável";
	const CORES = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#059669", "#dc2626", "#0891b2", "#65a30d"];
	const CORES_TIPO = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#6366f1"];

	let filtro = null; // { juiz, tipo|null }
	let assinatura = "";
	let agendado = 0;

	function normal(t) {
		return String(t || "").replace(/\s+/g, " ").trim();
	}
	function semAcento(t) {
		return normal(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function tabela() {
		const form = document.getElementById("processoConclusaoForm");
		return (form || document).querySelector("table.resultTable");
	}

	function colunas(tab) {
		const cab = tab.tHead && tab.tHead.rows[0];
		if (!cab) return null;
		let tipo = -1, juiz = -1;
		Array.from(cab.cells).forEach((c, i) => {
			const t = semAcento(c.textContent);
			if (tipo < 0 && t.startsWith("tipo de conclusao")) tipo = i;
			if (juiz < 0 && t === "responsavel") juiz = i;
		});
		return tipo < 0 || juiz < 0 ? null : { tipo, juiz, total: cab.cells.length };
	}

	// Linhas de registro: as do <tbody> com as células das colunas achadas
	// (linhas de detalhe do "+" ou de aviso têm outra quantidade de células).
	function registros(tab, col) {
		const lista = [];
		for (const corpo of Array.from(tab.tBodies)) {
			for (const tr of Array.from(corpo.rows)) {
				if (tr.cells.length <= Math.max(col.tipo, col.juiz)) continue;
				const tipo = normal(tr.cells[col.tipo].textContent);
				if (!tipo) continue;
				const juiz = normal(tr.cells[col.juiz].textContent) || SEM_RESPONSAVEL;
				lista.push({ tr, tipo, juiz });
			}
		}
		return lista;
	}

	function agrupar(regs) {
		const mapa = new Map();
		for (const r of regs) {
			if (!mapa.has(r.juiz)) mapa.set(r.juiz, { juiz: r.juiz, total: 0, tipos: new Map() });
			const g = mapa.get(r.juiz);
			g.total++;
			g.tipos.set(r.tipo, (g.tipos.get(r.tipo) || 0) + 1);
		}
		// Ordem crescente: do juiz com menos conclusões para o com mais.
		return Array.from(mapa.values()).sort((a, b) => a.total - b.total || a.juiz.localeCompare(b.juiz, "pt"));
	}

	function iniciais(nome) {
		if (nome === SEM_RESPONSAVEL) return "?";
		const partes = nome.split(" ").filter((p) => p.length > 2 || /^[A-ZÁ-Ú]/.test(p));
		const p = partes.length ? partes : nome.split(" ");
		return ((p[0] || "")[0] + ((p.length > 1 ? p[p.length - 1] : "")[0] || "")).toUpperCase();
	}

	function el(tag, cls, texto) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (texto != null) e.textContent = texto;
		return e;
	}

	function aplicarFiltro(regs) {
		for (const r of regs) {
			const mostra = !filtro || (r.juiz === filtro.juiz && (!filtro.tipo || r.tipo === filtro.tipo));
			if (mostra) {
				if (r.tr.hasAttribute("data-pdp-cpj-oculta")) {
					r.tr.style.display = "";
					r.tr.removeAttribute("data-pdp-cpj-oculta");
				}
			} else if (!r.tr.hasAttribute("data-pdp-cpj-oculta")) {
				r.tr.style.display = "none";
				r.tr.setAttribute("data-pdp-cpj-oculta", "1");
			}
		}
	}

	function quadro(tab) {
		let q = document.getElementById("pdp-conclusoes-juiz");
		if (q && q.isConnected) return q;
		q = el("section", "pdp-cpj");
		q.id = "pdp-conclusoes-juiz";
		q.setAttribute("aria-label", "Conclusões por juiz");
		const nav = document.getElementById("navigator");
		const ref = nav && nav.parentNode === tab.parentNode ? nav : tab;
		ref.parentNode.insertBefore(q, ref);
		return q;
	}

	function desenhar() {
		agendado = 0;
		const tab = tabela();
		if (!tab) return;
		const col = colunas(tab);
		if (!col) return;
		const regs = registros(tab, col);
		// Só entram cards (e tipos) com total maior que zero; sem nenhuma
		// conclusão na lista, o quadro inteiro não aparece.
		const grupos = agrupar(regs).filter((g) => g.total > 0);
		if (!grupos.length) {
			filtro = null;
			aplicarFiltro(regs);
			const velho = document.getElementById("pdp-conclusoes-juiz");
			if (velho) velho.remove();
			assinatura = "";
			return;
		}
		if (filtro && !grupos.some((g) => g.juiz === filtro.juiz && (!filtro.tipo || g.tipos.has(filtro.tipo)))) filtro = null;
		aplicarFiltro(regs);

		const nova = JSON.stringify([grupos.map((g) => [g.juiz, Array.from(g.tipos)]), filtro]);
		const q = quadro(tab);
		if (nova === assinatura && q.childElementCount) return;
		assinatura = nova;

		const todosTipos = new Map();
		for (const g of grupos) for (const [t, n] of g.tipos) todosTipos.set(t, (todosTipos.get(t) || 0) + n);
		const corTipo = new Map();
		Array.from(todosTipos.keys()).sort((a, b) => todosTipos.get(b) - todosTipos.get(a)).forEach((t, i) => corTipo.set(t, CORES_TIPO[i % CORES_TIPO.length]));

		q.textContent = "";
		const topo = el("div", "pdp-cpj-topo");
		const titulo = el("div", "pdp-cpj-titulo");
		titulo.append(el("span", "pdp-cpj-titulo-texto", "Conclusões por juiz"));
		titulo.append(el("span", "pdp-cpj-geral", regs.length + (regs.length === 1 ? " conclusão" : " conclusões")));
		topo.append(titulo);
		const resumo = el("div", "pdp-cpj-resumo");
		for (const [t, n] of Array.from(todosTipos).sort((a, b) => b[1] - a[1])) {
			const chip = el("span", "pdp-cpj-chip");
			const ponto = el("i", "pdp-cpj-ponto");
			ponto.style.background = corTipo.get(t);
			chip.append(ponto, document.createTextNode(t + " · " + n));
			resumo.append(chip);
		}
		topo.append(resumo);
		if (filtro) {
			const limpar = el("button", "pdp-cpj-limpar", "Mostrar todas");
			limpar.type = "button";
			limpar.addEventListener("click", () => { filtro = null; agendar(); });
			topo.append(limpar);
		}
		q.append(topo);

		const grade = el("div", "pdp-cpj-grade");
		grupos.forEach((g, i) => {
			const card = el("article", "pdp-cpj-card");
			const cor = CORES[i % CORES.length];
			card.style.setProperty("--pdp-cpj-cor", cor);
			if (filtro && filtro.juiz === g.juiz) card.classList.add("pdp-cpj-ativo");
			else if (filtro) card.classList.add("pdp-cpj-apagado");

			const cab = el("button", "pdp-cpj-cab");
			cab.type = "button";
			cab.title = filtro && filtro.juiz === g.juiz && !filtro.tipo
				? "Mostrar todas as conclusões"
				: g.juiz + " — " + g.total + (g.total === 1 ? " conclusão" : " conclusões") + ". Clique para ver na lista só as conclusões deste juiz.";
			const av = el("span", "pdp-cpj-avatar", iniciais(g.juiz));
			const nome = el("span", "pdp-cpj-nome", g.juiz);
			const tot = el("span", "pdp-cpj-total");
			tot.append(el("strong", null, String(g.total)), el("small", null, g.total === 1 ? "conclusão" : "conclusões"));
			cab.append(av, nome, tot);
			cab.addEventListener("click", () => {
				filtro = filtro && filtro.juiz === g.juiz && !filtro.tipo ? null : { juiz: g.juiz, tipo: null };
				agendar();
			});
			card.append(cab);

			const barra = el("div", "pdp-cpj-barra");
			const lista = el("ul", "pdp-cpj-tipos");
			for (const [t, n] of Array.from(g.tipos).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"))) {
				const pct = (n / g.total) * 100;
				const seg = el("span", "pdp-cpj-seg");
				seg.style.width = pct + "%";
				seg.style.background = corTipo.get(t);
				seg.title = t + ": " + n;
				barra.append(seg);

				const li = el("li");
				const bt = el("button", "pdp-cpj-tipo");
				bt.type = "button";
				const ativo = filtro && filtro.juiz === g.juiz && filtro.tipo === t;
				if (ativo) bt.classList.add("pdp-cpj-tipo-ativo");
				bt.title = ativo ? "Mostrar todas as conclusões" : "Mostrar na lista só " + t + " de " + g.juiz;
				const ponto = el("i", "pdp-cpj-ponto");
				ponto.style.background = corTipo.get(t);
				bt.append(ponto, el("span", "pdp-cpj-tipo-nome", t), el("span", "pdp-cpj-tipo-pct", Math.round(pct) + "%"), el("span", "pdp-cpj-tipo-n", String(n)));
				bt.addEventListener("click", () => {
					filtro = ativo ? null : { juiz: g.juiz, tipo: t };
					agendar();
				});
				li.append(bt);
				lista.append(li);
			}
			card.append(barra, lista);
			grade.append(card);
		});
		q.append(grade);
	}

	function agendar() {
		if (agendado) return;
		agendado = setTimeout(desenhar, 150);
	}

	function iniciar() {
		desenhar();
		// A tabela recebe linhas de outras páginas e enfeites de outras
		// funções; o desenho só é refeito quando os totais mudam.
		new MutationObserver((muts) => {
			for (const m of muts) {
				const alvo = m.target;
				if (alvo.closest && alvo.closest("#pdp-conclusoes-juiz")) continue;
				agendar();
				return;
			}
		}).observe(document.body, { childList: true, subtree: true });
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
	else iniciar();
})();
