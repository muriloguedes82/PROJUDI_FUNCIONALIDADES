// Projudi - Listagem de Audiências: dias de atraso das pendentes
//
// Na tela "Listagem de Audiências" (audiencia/busca.do, formulário
// audienciaForm), quando a pesquisa é de audiências "Pendentes"
// (idSituacaoAudiencia = 8: designadas, com a data já passada e ainda não
// movimentadas), acrescenta à tabela, logo depois da coluna "Data", a coluna
// "Atraso" com os dias desde a data da audiência. As pendentes há mais de 30
// dias ficam em destaque (vermelho e fundo rosado). Nas demais situações
// (Para Hoje, Movimentadas Hoje, Para a data) a tabela não muda.
//
// As linhas trazidas depois por "Listas em uma única página"
// (listasPaginaUnica.js) também ganham a coluna: a tabela é observada.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpAtrasoAudiencias) return;
	window.__pdpAtrasoAudiencias = true;

	if (!/^\/projudi\/audiencia\/busca\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Atraso das Audiências]";
	const SITUACAO_PENDENTES = "8";
	const DIAS_ANTIGA = 30;
	const DIA_MS = 24 * 60 * 60 * 1000;
	const MARCA = "data-pdp-atraso";

	function semAcento(texto) {
		return String(texto || "").replace(/ /g, " ").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function hojeMeiaNoite() {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}

	function diasDeAtraso(texto) {
		const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(texto || "");
		if (!m) return null;
		const dia = new Date(+m[3], +m[2] - 1, +m[1]);
		return Math.max(0, Math.round((hojeMeiaNoite() - dia) / DIA_MS));
	}

	function instalarEstilo() {
		if (document.getElementById("pdp-atraso-estilo")) return;
		const estilo = document.createElement("style");
		estilo.id = "pdp-atraso-estilo";
		estilo.textContent = [
			"table.resultTable td.pdp-atraso { text-align: center; white-space: nowrap; color: #444; }",
			"table.resultTable td.pdp-atraso.pdp-atraso-antiga { color: #c00000; font-weight: bold; background: #fdeaea !important; }",
		].join("\n");
		(document.head || document.documentElement).appendChild(estilo);
	}

	function iniciar() {
		const form = document.getElementById("audienciaForm") || document.querySelector("form[name='audienciaForm']");
		if (!form) return;
		const marcada = form.querySelector("input[name='idSituacaoAudiencia']:checked");
		if (!marcada || marcada.value !== SITUACAO_PENDENTES) return;
		const tabela = form.querySelector("table.resultTable");
		if (!tabela || !tabela.tHead || !tabela.tBodies[0]) return;
		const ths = Array.from(tabela.tHead.rows[0] ? tabela.tHead.rows[0].cells : []);
		const iData = ths.findIndex((th) => /^data/.test(semAcento(th.textContent)));
		if (iData < 0) {
			console.log(TAG, "coluna Data não encontrada");
			return;
		}
		instalarEstilo();
		if (!tabela.tHead.querySelector("th.pdp-atraso")) {
			const th = document.createElement("th");
			th.className = "pdp-atraso";
			th.setAttribute("style", ths[iData].getAttribute("style") || "");
			th.setAttribute("nowrap", "nowrap");
			th.textContent = "Atraso";
			th.title = "Dias desde a data da audiência (extensão). Em destaque: mais de " + DIAS_ANTIGA + " dias.";
			ths[iData].after(th);
			// Uma coluna a mais no <colgroup>, para a largura das demais não mudar.
			const cols = tabela.querySelectorAll(":scope > colgroup > col");
			if (cols[iData]) {
				const col = document.createElement("col");
				col.setAttribute("width", "1%");
				cols[iData].after(col);
			}
		}
		const tratar = () => {
			for (const tr of tabela.tBodies[0].rows) {
				if (tr.hasAttribute(MARCA) || tr.cells.length < iData + 1 || tr.parentElement !== tabela.tBodies[0]) continue;
				tr.setAttribute(MARCA, "");
				const dias = diasDeAtraso(tr.cells[iData].textContent);
				const td = document.createElement("td");
				td.className = "pdp-atraso" + (dias > DIAS_ANTIGA ? " pdp-atraso-antiga" : "");
				td.textContent = dias == null ? "" : dias + (dias === 1 ? " dia" : " dias");
				tr.cells[iData].after(td);
			}
		};
		tratar();
		// Linhas acrescentadas depois (Listas em uma única página).
		new MutationObserver(tratar).observe(tabela.tBodies[0], { childList: true });
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
	else iniciar();
})();
