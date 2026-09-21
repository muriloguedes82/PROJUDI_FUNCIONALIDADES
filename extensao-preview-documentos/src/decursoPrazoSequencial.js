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

		const ancoraRow = form.querySelector("#flagSomentePrioritarios, #situacao")?.closest("tr");
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

	function seqDaLinha(row) {
		const celulas = row.querySelectorAll("td");
		const celula = celulas[1];
		if (!celula) return null;

		const br = celula.querySelector("br");
		const texto = br && br.nextSibling ? br.nextSibling.textContent : celula.textContent;
		const encontrado = String(texto || "").trim().match(/(\d+)\s*$/);
		return encontrado ? encontrado[1] : null;
	}

	function filtrarTabela(digito) {
		const tabela = document.querySelector("table.resultTable");
		if (!tabela) return;

		let total = 0;
		let visiveis = 0;
		tabela.querySelectorAll("tbody > tr").forEach(function (row) {
			if (!row.querySelector("td")) return;
			total++;

			const seq = seqDaLinha(row);
			const manter = !digito || seq === null || seq.slice(-1) === digito;
			row.style.display = manter ? "" : "none";
			if (manter) visiveis++;
		});

		console.log(TAG, "filtro aplicado — dígito:", digito || "(nenhum)", "| linhas visíveis:", visiveis, "de", total);
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
	if (digitoValido(digitoSalvo)) filtrarTabela(digitoSalvo);
})();
