// Projudi - Filtro por "Sequencial" na tela de Análise de Decurso de Prazo
//
// Várias telas de análise do Projudi (ex.: Análise de Juntadas) já têm um
// campo "Sequencial" no formulário de busca: o servidor informa um dígito
// de 0 a 9 e, ao clicar em "Filtrar", a tabela de resultados é restrita às
// linhas cujo "Seq." termina naquele dígito — útil para dividir a fila de
// trabalho entre vários servidores. A tela de Análise de Decurso de Prazo
// (menu "Decurso de Prazo", `processo/intimacaoBusca.do`) não tem esse
// campo, embora a própria tabela de resultados já exiba um "Seq." para
// cada linha (coluna "Processo", ex.: "0002549-67.2025.8.16.0007" / 43295).
//
// Como a busca desta tela é um formulário comum (recarrega a página; não é
// AJAX) e o servidor não reconheceria um parâmetro novo, o filtro é feito
// inteiramente no navegador:
// 1. Insere um campo "Sequencial:" no formulário, ao lado dos demais
//    filtros, aceitando só um dígito (0 a 9).
// 2. Ao enviar o formulário (botão "Filtrar"), guarda o dígito escolhido
//    no sessionStorage (sobrevive à navegação, mas não a outras abas).
// 3. Ao carregar a página de resultados, oculta as linhas da tabela cujo
//    "Seq." não termine com o dígito guardado — preservando as demais
//    linhas (cabeçalhos, mensagens etc.) intactas.
(function () {
	"use strict";

	const TAG = "[Projudi Sequencial Decurso de Prazo]";
	const STORAGE_KEY = "pdpDecursoPrazoSequencialDigito";

	if (window.__pdpDecursoPrazoSequencial) return;
	window.__pdpDecursoPrazoSequencial = true;

	if (!/\/processo\/intimacaoBusca\.do$/.test(location.pathname)) return;

	function digitoValido(valor) {
		return typeof valor === "string" && /^[0-9]$/.test(valor);
	}

	function inserirCampo(form) {
		if (form.querySelector("#pdpSequencial")) return null;

		const prioridadeRow = form.querySelector("#flagSomentePrioritarios")?.closest("tr");
		const ancoraRow = prioridadeRow || form.querySelector("#situacao")?.closest("tr");
		if (!ancoraRow) {
			console.warn(TAG, "não encontrei onde inserir o campo Sequencial no formulário");
			return null;
		}

		const tr = document.createElement("tr");
		tr.innerHTML =
			'<td class="label"><label for="pdpSequencial">Sequencial:</label></td>' +
			'<td><input type="text" id="pdpSequencial" name="pdpSequencial" maxlength="1" size="2" ' +
			'autocomplete="off" title="Restringe a tabela de resultados às linhas cujo Seq. termina neste dígito (0 a 9)"></td>';
		ancoraRow.parentNode.insertBefore(tr, ancoraRow);

		const input = tr.querySelector("#pdpSequencial");
		input.addEventListener("input", function () {
			const filtrado = input.value.replace(/[^0-9]/g, "").slice(0, 1);
			if (filtrado !== input.value) input.value = filtrado;
		});

		const salvo = sessionStorage.getItem(STORAGE_KEY);
		if (digitoValido(salvo)) input.value = salvo;

		return input;
	}

	// Só mexemos em linhas que claramente são "linha de processo" da própria
	// tela (têm o link para processo.do na 2ª coluna, igual ao exemplo real
	// registrado no header da coluna: "Processo" / "Seq."). A tela também
	// pode ter outras linhas nesse <tbody> que não são nossas — geradas por
	// outra extensão/script de extração em massa que já existe nessa mesma
	// tabela (ex.: os botões "Extrair Retorno"/"Baixar Retorno", que não
	// fazem parte desta extensão) — e essas nunca devem ser tocadas.
	function linkDoProcesso(row) {
		const celulas = row.querySelectorAll("td");
		const celula = celulas[1];
		if (!celula) return null;
		return celula.querySelector('a[href*="/processo.do"]');
	}

	function seqDaLinha(celula) {
		const br = celula.querySelector("br");
		const texto = br && br.nextSibling ? br.nextSibling.textContent : celula.textContent;
		const encontrado = String(texto || "").trim().match(/(\d+)\s*$/);
		return encontrado ? encontrado[1] : null;
	}

	function amostraHTML(row) {
		const html = row.outerHTML || "";
		return html.length > 220 ? html.slice(0, 220) + "…" : html;
	}

	function filtrarTabela(digito) {
		const tabela = document.querySelector("table.resultTable");
		if (!tabela) {
			console.log(TAG, "table.resultTable não encontrada na página — nada a filtrar");
			return;
		}

		const linhas = Array.from(tabela.querySelectorAll("tbody > tr"));
		const reconhecidas = [];
		const ignoradas = [];
		let visiveis = 0;

		linhas.forEach(function (row, indice) {
			if (!row.querySelector("td")) return;

			const link = linkDoProcesso(row);
			if (!link) {
				ignoradas.push({ indice: indice, motivo: "sem link para processo.do na 2ª coluna", html: amostraHTML(row) });
				return; // nunca ocultamos linha que não reconhecemos como "linha de processo"
			}

			const celula = link.closest("td");
			const seq = seqDaLinha(celula);
			const manter = !digito || seq === null || seq.slice(-1) === digito;
			row.style.display = manter ? "" : "none";
			if (manter) visiveis++;

			reconhecidas.push({
				indice: indice,
				processo: link.textContent.trim().replace(/\s+/g, " "),
				seq: seq,
				oculta: !manter,
			});
		});

		console.groupCollapsed(
			TAG,
			"filtro aplicado — dígito:", digito || "(nenhum)",
			"| linhas na tabela:", linhas.length,
			"| reconhecidas como processo:", reconhecidas.length,
			"| ignoradas (não mexidas):", ignoradas.length,
			"| visíveis após filtro:", visiveis
		);
		if (reconhecidas.length) console.table(reconhecidas);
		if (ignoradas.length) {
			console.warn(TAG, ignoradas.length, "linha(s) no tbody não reconhecidas como linha de processo — preservadas sem alteração. Amostra:");
			console.table(ignoradas.slice(0, 5));
		}
		console.groupEnd();
	}

	const form = document.querySelector("#intimacaoBuscaForm");
	if (form) {
		const input = inserirCampo(form);
		if (input) {
			form.addEventListener("submit", function () {
				const valor = input.value.trim();
				if (digitoValido(valor)) {
					sessionStorage.setItem(STORAGE_KEY, valor);
				} else {
					sessionStorage.removeItem(STORAGE_KEY);
				}
			});
		}
	}

	const digitoSalvo = sessionStorage.getItem(STORAGE_KEY);
	if (digitoValido(digitoSalvo)) {
		console.log(TAG, 'reaplicando dígito salvo de um "Filtrar" anterior nesta aba:', digitoSalvo,
			"— para limpar, apague o campo Sequencial e clique em Filtrar de novo");
		filtrarTabela(digitoSalvo);
	}
})();
