// Projudi - Conclusões por Juiz (lista de Conclusões)
//
// Na lista "Conclusões" (processo/conclusao.do), acima da tabela, mostra um
// card para cada juiz (coluna "Responsável") com o total de conclusões dele
// e, dentro do card, o total por tipo de conclusão (coluna "Tipo de
// conclusão": SENTENÇA, DECISÃO, DESPACHO...), com uma barra proporcional.
//
// No pé do card, etiquetas pequenas (só aparecem quando há o que contar):
// - ⏱ conclusões há mais de 120 dias (coluna "Dt. Remessa");
// - o mesmo símbolo de réu preso que o Projudi põe ao lado do número do
//   processo, com quantas conclusões são de processo com réu preso;
// - 📝 quantas já têm pré-análise (coluna "Pré-análise") / total do juiz.
//
// Clicar no total do card mostra na tabela só as conclusões daquele juiz;
// clicar num tipo ou numa etiqueta, só aquelas do juiz. Clicar de novo (ou
// em "Mostrar todas") volta a lista inteira. O filtro só esconde linhas na
// tela: nada é alterado no Projudi. O último filtro fica guardado no
// navegador e volta ao abrir a lista de novo, até clicar em "Mostrar todas".
//
// "📋 Copiar resumo" copia os totais em texto, para colar num e-mail.
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
	const CORES = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#dc2626", "#0891b2", "#65a30d"];
	const CORES_TIPO = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#6366f1"];

	const DIAS_ATRASO = 120;
	const CHAVE_FILTRO = "pdpConclusoesPorJuizFiltro";
	const MARCAS = {
		atraso: { nome: "há mais de " + DIAS_ATRASO + " dias" },
		preso: { nome: "de processo com réu preso" },
		pre: { nome: "com pré-análise" },
	};

	// { juiz, tipo|null, marca|null } — guardado até "Mostrar todas".
	let filtro = lerFiltro();
	let assinatura = "";
	let agendado = 0;

	function normal(t) {
		return String(t || "").replace(/\s+/g, " ").trim();
	}
	function semAcento(t) {
		return normal(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function lerFiltro() {
		try {
			const f = JSON.parse(localStorage.getItem(CHAVE_FILTRO) || "null");
			return f && typeof f.juiz === "string" ? { juiz: f.juiz, tipo: f.tipo || null, marca: f.marca || null } : null;
		} catch (e) { return null; }
	}
	function definirFiltro(f) {
		filtro = f;
		try {
			if (f) localStorage.setItem(CHAVE_FILTRO, JSON.stringify(f));
			else localStorage.removeItem(CHAVE_FILTRO);
		} catch (e) { /* sem armazenamento: o filtro vale só nesta tela */ }
		agendar();
	}
	function mesmoFiltro(a, b) {
		return !!a && !!b && a.juiz === b.juiz && (a.tipo || null) === (b.tipo || null) && (a.marca || null) === (b.marca || null);
	}
	function alternar(f) {
		definirFiltro(mesmoFiltro(filtro, f) ? null : f);
	}

	// Dias desde a remessa (dd/mm/aaaa da coluna Dt. Remessa), contados por data.
	function diasDesde(texto) {
		const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(texto || "");
		if (!m) return null;
		const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
		const h = new Date();
		const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate());
		return Math.round((hoje - d) / 86400000);
	}

	function tabela() {
		const form = document.getElementById("processoConclusaoForm");
		return (form || document).querySelector("table.resultTable");
	}

	function colunas(tab) {
		const cab = tab.tHead && tab.tHead.rows[0];
		if (!cab) return null;
		let tipo = -1, juiz = -1, data = -1, pre = -1;
		Array.from(cab.cells).forEach((c, i) => {
			const t = semAcento(c.textContent);
			if (tipo < 0 && t.startsWith("tipo de conclusao")) tipo = i;
			if (juiz < 0 && t === "responsavel") juiz = i;
			if (data < 0 && t.includes("remessa")) data = i;
			if (pre < 0 && t.replace(/[^a-z]/g, "") === "preanalise") pre = i;
		});
		return tipo < 0 || juiz < 0 ? null : { tipo, juiz, data, pre };
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
				const dias = col.data >= 0 && tr.cells[col.data] ? diasDesde(tr.cells[col.data].textContent) : null;
				const imgPreso = tr.querySelector('[class*="REU_PRESO"] img, img[src*="preso.png"]');
				lista.push({
					tr, tipo, juiz, dias,
					atraso: dias != null && dias > DIAS_ATRASO,
					preso: !!(imgPreso || tr.querySelector('[class*="REU_PRESO"]')),
					imgPreso: imgPreso ? imgPreso.src : null,
					pre: col.pre >= 0 && !!tr.cells[col.pre] && normal(tr.cells[col.pre].textContent) !== "",
				});
			}
		}
		return lista;
	}

	function agrupar(regs) {
		const mapa = new Map();
		for (const r of regs) {
			if (!mapa.has(r.juiz)) mapa.set(r.juiz, { juiz: r.juiz, total: 0, tipos: new Map(), atraso: 0, preso: 0, pre: 0, maisAntiga: null });
			const g = mapa.get(r.juiz);
			g.total++;
			if (r.atraso) g.atraso++;
			if (r.preso) g.preso++;
			if (r.pre) g.pre++;
			if (r.dias != null && (g.maisAntiga == null || r.dias > g.maisAntiga)) g.maisAntiga = r.dias;
			g.tipos.set(r.tipo, (g.tipos.get(r.tipo) || 0) + 1);
		}
		// Ordem crescente: do juiz com menos conclusões para o com mais.
		return Array.from(mapa.values()).sort((a, b) => a.total - b.total || a.juiz.localeCompare(b.juiz, "pt"));
	}

	// Cor fixa de cada juiz: sai do nome (não da posição do card), então o
	// juiz mantém a mesma cor quando a ordem muda ou entre uma visita e
	// outra. Se dois juízes da lista caírem na mesma cor, o segundo (em
	// ordem alfabética) pega a próxima livre.
	function hashNome(nome) {
		let h = 0;
		for (const c of semAcento(nome)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
		return h;
	}
	function coresDosJuizes(grupos) {
		const cores = new Map();
		const usadas = new Set();
		for (const juiz of grupos.map((g) => g.juiz).sort((a, b) => a.localeCompare(b, "pt"))) {
			let i = hashNome(juiz) % CORES.length;
			for (let k = 0; k < CORES.length && usadas.has(i); k++) i = (i + 1) % CORES.length;
			usadas.add(i);
			cores.set(juiz, juiz === SEM_RESPONSAVEL ? "#64748b" : CORES[i]);
		}
		return cores;
	}

	function el(tag, cls, texto) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (texto != null) e.textContent = texto;
		return e;
	}

	function passa(r, f) {
		return r.juiz === f.juiz && (!f.tipo || r.tipo === f.tipo) && (!f.marca || !!r[f.marca]);
	}

	function aplicarFiltro(regs, f) {
		for (const r of regs) {
			const mostra = !f || passa(r, f);
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
			aplicarFiltro(regs, null);
			const velho = document.getElementById("pdp-conclusoes-juiz");
			if (velho) velho.remove();
			assinatura = "";
			return;
		}
		// O filtro guardado só vale se houver linhas para ele (enquanto as
		// outras páginas chegam, ele espera, sem esconder a lista toda).
		const ativo = filtro && regs.some((r) => passa(r, filtro)) ? filtro : null;
		aplicarFiltro(regs, ativo);

		const imgPreso = (regs.find((r) => r.imgPreso) || {}).imgPreso || null;
		const nova = JSON.stringify([grupos.map((g) => [g.juiz, Array.from(g.tipos), g.atraso, g.preso, g.pre, g.maisAntiga]), ativo, col.pre >= 0, imgPreso]);
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
		if (ativo) {
			const limpar = el("button", "pdp-cpj-limpar", "Mostrar todas");
			limpar.type = "button";
			limpar.addEventListener("click", () => definirFiltro(null));
			topo.append(limpar);
		}
		const copiar = el("button", "pdp-cpj-copiar", "📋 Copiar resumo");
		copiar.type = "button";
		copiar.title = "Copiar os totais por juiz em texto, para colar num e-mail ou relatório";
		copiar.addEventListener("click", () => copiarResumo(grupos, regs.length, col.pre >= 0, copiar));
		topo.append(copiar);
		q.append(topo);

		const grade = el("div", "pdp-cpj-grade");
		const corJuiz = coresDosJuizes(grupos);
		grupos.forEach((g) => {
			const card = el("article", "pdp-cpj-card");
			const cor = corJuiz.get(g.juiz);
			card.style.setProperty("--pdp-cpj-cor", cor);
			if (ativo && ativo.juiz === g.juiz) card.classList.add("pdp-cpj-ativo");
			else if (ativo) card.classList.add("pdp-cpj-apagado");

			const cab = el("button", "pdp-cpj-cab");
			cab.type = "button";
			const soJuiz = { juiz: g.juiz, tipo: null, marca: null };
			cab.title = mesmoFiltro(ativo, soJuiz)
				? "Mostrar todas as conclusões"
				: g.juiz + " — " + g.total + (g.total === 1 ? " conclusão" : " conclusões") + ". Clique para ver na lista só as conclusões deste juiz.";
			const nome = el("span", "pdp-cpj-nome", g.juiz);
			const tot = el("span", "pdp-cpj-total");
			tot.append(el("strong", null, String(g.total)), el("small", null, g.total === 1 ? "conclusão" : "conclusões"));
			cab.append(nome, tot);
			cab.addEventListener("click", () => alternar(soJuiz));
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
				const fTipo = { juiz: g.juiz, tipo: t, marca: null };
				const ligado = mesmoFiltro(ativo, fTipo);
				if (ligado) bt.classList.add("pdp-cpj-tipo-ativo");
				bt.title = ligado ? "Mostrar todas as conclusões" : "Mostrar na lista só " + t + " de " + g.juiz;
				const ponto = el("i", "pdp-cpj-ponto");
				ponto.style.background = corTipo.get(t);
				bt.append(ponto, el("span", "pdp-cpj-tipo-nome", t), el("span", "pdp-cpj-tipo-pct", Math.round(pct) + "%"), el("span", "pdp-cpj-tipo-n", String(n)));
				bt.addEventListener("click", () => alternar(fTipo));
				li.append(bt);
				lista.append(li);
			}
			card.append(barra, lista);

			// Etiquetas do pé do card (só as que têm o que contar).
			const marcas = el("div", "pdp-cpj-marcas");
			const marca = (chave, conteudo, titulo, extra) => {
				const f = { juiz: g.juiz, tipo: null, marca: chave };
				const ligado = mesmoFiltro(ativo, f);
				const b = el("button", "pdp-cpj-marca pdp-cpj-marca-" + chave + (ligado ? " pdp-cpj-marca-ativa" : ""));
				b.type = "button";
				b.append(...conteudo);
				b.title = (ligado ? "Mostrar todas as conclusões. " : "") + titulo + (ligado ? "" : " Clique para ver só essas na lista.");
				if (extra) b.classList.add(extra);
				b.addEventListener("click", () => alternar(f));
				marcas.append(b);
			};
			if (g.atraso) {
				marca("atraso", [document.createTextNode("⏱ " + g.atraso)],
					g.atraso + (g.atraso === 1 ? " conclusão" : " conclusões") + " há mais de " + DIAS_ATRASO + " dias (a mais antiga, há " + g.maisAntiga + " dias).");
			}
			if (g.preso) {
				const icone = imgPreso ? Object.assign(el("img", "pdp-cpj-preso"), { src: imgPreso, alt: "Réu preso" }) : document.createTextNode("🔒");
				marca("preso", [icone, document.createTextNode(String(g.preso))],
					g.preso + (g.preso === 1 ? " conclusão" : " conclusões") + " de processo com réu preso.");
			}
			if (col.pre >= 0) {
				const sem = g.total - g.pre;
				marca("pre", [document.createTextNode("📝 " + g.pre + "/" + g.total)],
					g.pre + " com pré-análise e " + sem + " sem pré-análise.", g.pre ? null : "pdp-cpj-marca-zero");
			}
			if (marcas.childElementCount) card.append(marcas);
			grade.append(card);
		});
		q.append(grade);
	}

	function textoResumo(grupos, total, temPre) {
		const h = new Date();
		const data = String(h.getDate()).padStart(2, "0") + "/" + String(h.getMonth() + 1).padStart(2, "0") + "/" + h.getFullYear();
		const linhas = ["Conclusões por juiz — " + data + " — " + total + (total === 1 ? " conclusão" : " conclusões")];
		for (const g of grupos) {
			const tipos = Array.from(g.tipos).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt")).map(([t, n]) => t + " " + n).join(", ");
			const extras = [];
			if (g.atraso) extras.push(g.atraso + " há mais de " + DIAS_ATRASO + " dias");
			if (g.preso) extras.push(g.preso + " réu preso");
			if (temPre) extras.push(g.pre + " com pré-análise");
			linhas.push("• " + g.juiz + ": " + g.total + " (" + tipos + ")" + (extras.length ? " — " + extras.join("; ") : ""));
		}
		return linhas.join("\n");
	}

	async function copiarResumo(grupos, total, temPre, botao) {
		const texto = textoResumo(grupos, total, temPre);
		let ok = false;
		try {
			await navigator.clipboard.writeText(texto);
			ok = true;
		} catch (e) {
			const area = document.createElement("textarea");
			area.value = texto;
			area.style.cssText = "position:fixed;left:-9999px;top:0";
			document.body.append(area);
			area.select();
			try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
			area.remove();
		}
		botao.textContent = ok ? "✓ Copiado" : "Não foi possível copiar";
		setTimeout(() => { botao.textContent = "📋 Copiar resumo"; }, 2000);
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
