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
//    filtros, aceitando só um dígito (0 a 9). Ele começa sempre em branco
//    — não há um dígito padrão — e só é preenchido depois que o próprio
//    usuário digita algo e clica em "Filtrar".
// 2. Ao enviar o formulário, guarda o dígito escolhido no sessionStorage
//    só para a PRÓXIMA carga de página (é consumido — removido do
//    sessionStorage — assim que lido), o suficiente para sobreviver ao
//    recarregamento que o próprio "Filtrar" provoca sem "vazar" para
//    acessos futuros à tela.
// 3. Ao carregar a página de resultados, oculta as linhas da tabela cujo
//    "Seq." não termine com o dígito guardado — preservando as demais
//    linhas (cabeçalhos, mensagens etc.) intactas.
//
// Além do filtro na página atual, o botão "Listar em todas as páginas"
// percorre automaticamente as páginas seguintes (clicando em "Próxima
// Página", do mesmo jeito que o usuário faria) coletando os processos cujo
// Seq. bate com o dígito informado, e mostra a lista completa ao final —
// já que a busca nativa só filtra/pagina no servidor, uma página por vez.
(function () {
	"use strict";

	const TAG = "[Projudi Sequencial Decurso de Prazo]";
	const STORAGE_KEY = "pdpDecursoPrazoSequencialDigito";
	const STORAGE_COLETA_KEY = "pdpDecursoPrazoColeta";
	const MAX_PAGINAS = 200;

	if (window.__pdpDecursoPrazoSequencial) return;
	window.__pdpDecursoPrazoSequencial = true;

	if (!/\/processo\/intimacaoBusca\.do$/.test(location.pathname)) return;

	function digitoValido(valor) {
		return typeof valor === "string" && /^[0-9]$/.test(valor);
	}

	// --- campo no formulário -------------------------------------------------

	function inserirCampo(form, valorInicial) {
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
			'autocomplete="off" title="Restringe a tabela de resultados às linhas cujo Seq. termina neste dígito (0 a 9)"> ' +
			'<button type="button" id="pdpColetarTodasPaginas" title="Percorre automaticamente todas as páginas de resultado e lista os processos cujo Seq. termina no dígito informado">Listar em todas as páginas</button> ' +
			'<span id="pdpColetaStatus" style="font-size:11px;color:#666;"></span></td>';
		ancoraRow.parentNode.insertBefore(tr, ancoraRow);

		const input = tr.querySelector("#pdpSequencial");
		input.addEventListener("input", function () {
			const filtrado = input.value.replace(/[^0-9]/g, "").slice(0, 1);
			if (filtrado !== input.value) input.value = filtrado;
		});

		// Nunca preenche sozinho com um dígito "padrão": só mostra algo aqui
		// se esta carga de página é, de fato, o resultado de um Filtrar (ou
		// de uma coleta em andamento) que informou um dígito válido.
		if (digitoValido(valorInicial)) input.value = valorInicial;

		tr.querySelector("#pdpColetarTodasPaginas").addEventListener("click", function () {
			const digito = input.value.trim();
			if (!digitoValido(digito)) {
				window.alert("Informe um dígito de 0 a 9 no campo Sequencial antes de listar em todas as páginas.");
				input.focus();
				return;
			}
			const nav = obterNavegacao();
			iniciarColeta(digito, !!(nav && nav.primeira));
		});

		return input;
	}

	// --- leitura das linhas da tabela ----------------------------------------

	// Só mexemos em linhas que claramente são "linha de processo" da própria
	// tela (têm o link para processo.do na 2ª coluna, igual ao exemplo real
	// registrado no header da coluna: "Processo" / "Seq."). A tela também
	// pode ter outras linhas nesse <tbody> que não são nossas — geradas por
	// outra extensão/script de extração em massa que já existe nessa mesma
	// tabela (ex.: os botões "Extrair Retorno"/"Baixar Retorno", que não
	// fazem parte desta extensão) — e essas nunca devem ser tocadas.
	function seqDaCelula(celula) {
		const br = celula.querySelector("br");
		const texto = br && br.nextSibling ? br.nextSibling.textContent : celula.textContent;
		const encontrado = String(texto || "").trim().match(/(\d+)\s*$/);
		return encontrado ? encontrado[1] : null;
	}

	function dadosDaLinha(row) {
		const celulas = row.querySelectorAll("td");
		const celulaProcesso = celulas[1];
		if (!celulaProcesso) return null;
		const link = celulaProcesso.querySelector('a[href*="/processo.do"]');
		if (!link) return null;
		return {
			processo: link.textContent.trim().replace(/\s+/g, " "),
			url: link.href,
			seq: seqDaCelula(celulaProcesso),
			dataDecurso: celulas[2] ? celulas[2].textContent.trim() : "",
			situacao: celulas.length ? celulas[celulas.length - 1].textContent.trim().replace(/\s+/g, " ") : "",
		};
	}

	function amostraHTML(row) {
		const html = row.outerHTML || "";
		return html.length > 220 ? html.slice(0, 220) + "…" : html;
	}

	function obterLinhasDaTabela() {
		const tabela = document.querySelector("table.resultTable");
		const reconhecidas = [];
		const ignoradas = [];
		if (!tabela) return { tabela: null, reconhecidas: reconhecidas, ignoradas: ignoradas };

		tabela.querySelectorAll("tbody > tr").forEach(function (row, indice) {
			if (!row.querySelector("td")) return;
			const dados = dadosDaLinha(row);
			if (!dados) {
				ignoradas.push({ indice: indice, motivo: "sem link para processo.do na 2ª coluna", html: amostraHTML(row) });
				return; // nunca ocultamos/tocamos linha que não reconhecemos como "linha de processo"
			}
			reconhecidas.push({ row: row, dados: dados });
		});

		return { tabela: tabela, reconhecidas: reconhecidas, ignoradas: ignoradas };
	}

	// --- filtro visual na página atual ---------------------------------------

	function filtrarTabela(digito) {
		const info = obterLinhasDaTabela();
		if (!info.tabela) {
			console.log(TAG, "table.resultTable não encontrada na página — nada a filtrar");
			return;
		}

		let visiveis = 0;
		const linhasLog = info.reconhecidas.map(function (item) {
			const manter = !digito || item.dados.seq === null || item.dados.seq.slice(-1) === digito;
			item.row.style.display = manter ? "" : "none";
			if (manter) visiveis++;
			return { processo: item.dados.processo, seq: item.dados.seq, oculta: !manter };
		});

		console.groupCollapsed(
			TAG,
			"filtro aplicado — dígito:", digito || "(nenhum)",
			"| linhas na tabela:", info.reconhecidas.length + info.ignoradas.length,
			"| reconhecidas como processo:", info.reconhecidas.length,
			"| ignoradas (não mexidas):", info.ignoradas.length,
			"| visíveis após filtro:", visiveis
		);
		if (linhasLog.length) console.table(linhasLog);
		if (info.ignoradas.length) {
			console.warn(TAG, info.ignoradas.length, "linha(s) no tbody não reconhecidas como linha de processo — preservadas sem alteração. Amostra:");
			console.table(info.ignoradas.slice(0, 5));
		}
		console.groupEnd();
	}

	// --- navegação entre páginas ---------------------------------------------

	function obterNavegacao() {
		const nav = document.querySelector("#navigator");
		if (!nav) return null;
		const paginaEl = nav.querySelector("b");
		return {
			primeira: nav.querySelector("a.arrowFirstOn"),
			proxima: nav.querySelector("a.arrowNextOn"),
			paginaAtual: paginaEl ? paginaEl.textContent.trim() : null,
		};
	}

	// Clica no link de navegação (Próxima/Primeira Página) e cobre os dois
	// jeitos como a tela pode reagir: recarregando a página inteira (nesse
	// caso o script para por aqui mesmo, e a coleta continua sozinha quando
	// o script for injetado de novo na próxima carga) ou atualizando a
	// tabela via AJAX sem navegar (nesse caso continuamos a coleta aqui,
	// assim que percebemos a mudança no navegador de páginas).
	function clicarNavegacao(link, proximoPasso) {
		const paginaAntes = obterNavegacao()?.paginaAtual;
		let concluido = false;
		const nav = document.querySelector("#navigator");
		const observer = nav
			? new MutationObserver(function () {
					if (concluido) return;
					const paginaAgora = obterNavegacao()?.paginaAtual;
					if (paginaAgora && paginaAgora !== paginaAntes) {
						concluido = true;
						observer.disconnect();
						console.log(TAG, "tabela atualizada sem recarregar a página (AJAX) — continuando a coleta");
						proximoPasso();
					}
			  })
			: null;
		if (observer && nav) observer.observe(nav, { childList: true, subtree: true, characterData: true });

		link.click();

		window.setTimeout(function () {
			if (concluido) return;
			if (observer) observer.disconnect();
			// Se a página recarregou de verdade, o script atual nem chega até
			// aqui (o contexto já foi destruído); se chegamos aqui é porque o
			// clique não teve efeito nenhum.
			console.warn(TAG, "cliquei para avançar de página mas não detectei nenhuma mudança em 8s — a coleta pode ter parado nesta página. Confira manualmente.");
		}, 8000);
	}

	// --- coleta em todas as páginas ------------------------------------------

	function obterColeta() {
		try {
			const raw = sessionStorage.getItem(STORAGE_COLETA_KEY);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			console.warn(TAG, "não consegui ler o estado salvo da coleta:", err);
			return null;
		}
	}

	function salvarColeta(coleta) {
		try {
			sessionStorage.setItem(STORAGE_COLETA_KEY, JSON.stringify(coleta));
		} catch (err) {
			console.warn(TAG, "não consegui salvar o estado da coleta:", err);
		}
	}

	function limparColeta() {
		sessionStorage.removeItem(STORAGE_COLETA_KEY);
	}

	function iniciarColeta(digito, precisaVoltarPrimeira) {
		limparColeta();
		const coleta = {
			digito: digito,
			ativo: true,
			fase: precisaVoltarPrimeira ? "irParaPrimeira" : "coletando",
			paginasVisitadas: [],
			encontrados: [],
		};
		salvarColeta(coleta);
		console.log(TAG, "iniciando coleta em todas as páginas — dígito:", digito);
		passoColeta();
	}

	function atualizarStatus(texto) {
		const status = document.querySelector("#pdpColetaStatus");
		if (status) status.textContent = texto || "";
	}

	function passoColeta() {
		const coleta = obterColeta();
		if (!coleta || !coleta.ativo) return;

		const nav = obterNavegacao();
		const paginaAtual = nav?.paginaAtual || "?";

		console.groupCollapsed(TAG, "coleta em todas as páginas — página atual:", paginaAtual, "| fase:", coleta.fase);
		atualizarStatus("Coletando… página " + paginaAtual + " (" + coleta.encontrados.length + " encontrado(s) até agora)");

		if (coleta.fase === "irParaPrimeira") {
			if (nav && nav.primeira) {
				console.log(TAG, "indo para a primeira página antes de começar a coletar");
				salvarColeta(coleta);
				console.groupEnd();
				clicarNavegacao(nav.primeira, passoColeta);
				return;
			}
			coleta.fase = "coletando";
		}

		if (coleta.paginasVisitadas.indexOf(paginaAtual) !== -1) {
			console.warn(TAG, "página", paginaAtual, "já tinha sido coletada — parando para evitar loop infinito");
			coleta.fase = "concluido";
			coleta.erro = "loop-detectado";
			salvarColeta(coleta);
			console.groupEnd();
			exibirResultadosColeta(coleta);
			return;
		}

		const info = obterLinhasDaTabela();
		let novos = 0;
		info.reconhecidas.forEach(function (item) {
			const seq = item.dados.seq;
			if (seq === null || seq.slice(-1) !== coleta.digito) return;
			const chave = item.dados.processo + "#" + seq;
			if (coleta.encontrados.some(function (r) { return r.chave === chave; })) return;
			coleta.encontrados.push(Object.assign({ chave: chave, pagina: paginaAtual }, item.dados));
			novos++;
		});
		coleta.paginasVisitadas.push(paginaAtual);
		console.log(TAG, novos, "processo(s) novo(s) nesta página | total acumulado:", coleta.encontrados.length, "| linhas ignoradas nesta página:", info.ignoradas.length);

		if (coleta.paginasVisitadas.length >= MAX_PAGINAS) {
			console.warn(TAG, "atingido o limite de segurança de", MAX_PAGINAS, "páginas — parando");
			coleta.fase = "concluido";
			coleta.erro = "limite-paginas";
			salvarColeta(coleta);
			console.groupEnd();
			exibirResultadosColeta(coleta);
			return;
		}

		if (nav && nav.proxima) {
			salvarColeta(coleta);
			console.log(TAG, "avançando para a próxima página…");
			console.groupEnd();
			clicarNavegacao(nav.proxima, passoColeta);
			return;
		}

		coleta.fase = "concluido";
		salvarColeta(coleta);
		console.log(TAG, "última página alcançada — coleta concluída com", coleta.encontrados.length, "processo(s) em", coleta.paginasVisitadas.length, "página(s)");
		console.groupEnd();
		exibirResultadosColeta(coleta);
	}

	function exibirResultadosColeta(coleta) {
		atualizarStatus("");

		const ancora = document.querySelector("#navigator") || document.querySelector("table.resultTable");
		if (!ancora || !ancora.parentNode) return;

		let painel = document.getElementById("pdpColetaResultado");
		if (!painel) {
			painel = document.createElement("div");
			painel.id = "pdpColetaResultado";
			painel.style.cssText = "border:2px solid #5c6b3f;background:#fbfaf3;padding:10px 14px;margin:10px 0;font-size:12px;color:#26301f;";
			ancora.parentNode.insertBefore(painel, ancora);
		}

		const linhas = coleta.encontrados
			.map(function (r) {
				return (
					"<tr>" +
					'<td><a href="' + r.url + '" target="_blank" rel="noopener">' + r.processo + "</a></td>" +
					"<td>" + (r.seq || "") + "</td>" +
					"<td>" + r.dataDecurso + "</td>" +
					"<td>" + r.situacao + "</td>" +
					"<td>" + r.pagina + "</td>" +
					"</tr>"
				);
			})
			.join("");

		const aviso =
			coleta.erro === "limite-paginas"
				? '<p style="color:#a33">Parei em ' + coleta.paginasVisitadas.length + " páginas (limite de segurança). Pode haver mais processos além do que está listado.</p>"
				: coleta.erro === "loop-detectado"
				? '<p style="color:#a33">A navegação entre páginas parece ter travado (voltou para uma página já vista); a lista abaixo pode estar incompleta.</p>'
				: "";

		painel.innerHTML =
			'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px;">' +
			"<strong>Sequencial " + coleta.digito + " em todas as páginas — " + coleta.encontrados.length + " processo(s) em " + coleta.paginasVisitadas.length + " página(s)</strong>" +
			'<button type="button" id="pdpColetaFechar" style="cursor:pointer;">Fechar</button>' +
			"</div>" +
			aviso +
			(coleta.encontrados.length
				? '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
				  '<thead><tr><th style="text-align:left;border-bottom:1px solid #ccc;padding:2px 6px 2px 0;">Processo</th>' +
				  '<th style="text-align:left;border-bottom:1px solid #ccc;padding:2px 6px;">Seq.</th>' +
				  '<th style="text-align:left;border-bottom:1px solid #ccc;padding:2px 6px;">Data Decurso</th>' +
				  '<th style="text-align:left;border-bottom:1px solid #ccc;padding:2px 6px;">Situação</th>' +
				  '<th style="text-align:left;border-bottom:1px solid #ccc;padding:2px 6px;">Pág.</th></tr></thead>' +
				  "<tbody>" + linhas + "</tbody></table>"
				: "<p>Nenhum processo com Sequencial " + coleta.digito + " foi encontrado nas páginas percorridas.</p>");

		const fechar = document.getElementById("pdpColetaFechar");
		if (fechar) {
			fechar.addEventListener("click", function () {
				limparColeta();
				painel.remove();
			});
		}

		console.log(TAG, "resultado final da coleta:");
		console.table(coleta.encontrados);
	}

	// --- inicialização --------------------------------------------------------

	// O dígito guardado ao clicar em "Filtrar" só vale para ESTA carga de
	// página: é lido e removido do sessionStorage imediatamente, então uma
	// visita normal (ou futura) a esta tela sempre começa com o campo em
	// branco, sem nenhum dígito aplicado por padrão.
	const digitoDoFiltrar = sessionStorage.getItem(STORAGE_KEY);
	sessionStorage.removeItem(STORAGE_KEY);
	const digitoParaEstaCarga = digitoValido(digitoDoFiltrar) ? digitoDoFiltrar : null;

	const form = document.querySelector("#intimacaoBuscaForm");
	if (form) {
		const input = inserirCampo(form, digitoParaEstaCarga);
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

	if (digitoParaEstaCarga) {
		console.log(TAG, "aplicando o dígito informado no Filtrar:", digitoParaEstaCarga);
		filtrarTabela(digitoParaEstaCarga);
	}

	const coletaEmAndamento = obterColeta();
	if (coletaEmAndamento) {
		if (coletaEmAndamento.ativo) {
			passoColeta();
		} else {
			exibirResultadosColeta(coletaEmAndamento);
		}
	}
})();
