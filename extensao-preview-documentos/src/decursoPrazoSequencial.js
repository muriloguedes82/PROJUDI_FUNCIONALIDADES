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
// Diferente das outras telas, aqui a busca é paginada no servidor (20
// registros por página) — um dígito de Sequencial pode ter processos
// espalhados por várias páginas, então filtrar só a página atual não bastaria.
// O fluxo é: usuário digita o dígito e clica em "Filtrar" (nada além disso);
// a página de resultados (1ª página) carrega normalmente e, a partir daí,
// tudo é feito sozinho, sem navegar a aba de verdade:
// 1. O dígito informado no Filtrar é lido do sessionStorage (guardado só
//    para esta carga — nunca fica pendurado para acessos futuros, então a
//    tela sempre começa com o campo Sequencial em branco).
// 2. As demais páginas são buscadas em segundo plano, num <iframe> oculto
//    (mesma sessão/cookies do usuário, técnica já usada por outras partes
//    desta extensão — ver README, "Pendências"), clicando de verdade no
//    link "Próxima Página" de cada página carregada ali dentro. Como é a
//    própria página do Projudi (com o JavaScript dela) rodando dentro do
//    iframe, não precisamos saber como esse avanço de página funciona por
//    baixo dos panos.
// 3. Os processos cujo "Seq." termina no dígito informado, de todas as
//    páginas, substituem as linhas da própria tabela de resultados já
//    existente na tela (nada de painel novo) — e o resumo (quantos
//    processos, em quantas páginas) aparece onde antes ficava a navegação
//    de páginas.
(function () {
	"use strict";

	// Nunca roda dentro do iframe oculto usado para buscar as demais
	// páginas em segundo plano (ver coletarTodasAsPaginas/clicarProximaNoIframe
	// abaixo) — senão esta mesma lógica tentaria rodar recursivamente lá
	// dentro também.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	const TAG = "[Projudi Sequencial Decurso de Prazo]";
	const STORAGE_KEY = "pdpDecursoPrazoSequencialDigito";
	const MAX_PAGINAS = 200;
	const TIMEOUT_PRIMEIRA_CARGA_MS = 15000;
	const TIMEOUT_AVANCAR_PAGINA_MS = 12000;

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
			'autocomplete="off" title="Ao clicar em Filtrar, restringe a tabela de resultados (em todas as páginas) aos processos cujo Seq. termina neste dígito (0 a 9)"> ' +
			'<span id="pdpColetaStatus" style="font-size:11px;color:#666;"></span></td>';
		ancoraRow.parentNode.insertBefore(tr, ancoraRow);

		const input = tr.querySelector("#pdpSequencial");
		input.addEventListener("input", function () {
			const filtrado = input.value.replace(/[^0-9]/g, "").slice(0, 1);
			if (filtrado !== input.value) input.value = filtrado;
		});

		// Nunca preenche sozinho com um dígito "padrão": só mostra algo aqui
		// se esta carga de página é, de fato, o resultado de um Filtrar que
		// informou um dígito válido.
		if (digitoValido(valorInicial)) input.value = valorInicial;

		return input;
	}

	function atualizarStatus(texto) {
		const status = document.querySelector("#pdpColetaStatus");
		if (status) status.textContent = texto || "";
	}

	// --- leitura das linhas de uma tabela de resultados ----------------------

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
			seq: seqDaCelula(celulaProcesso),
			dataDecurso: celulas[2] ? celulas[2].textContent.trim() : "",
			situacao: celulas.length ? celulas[celulas.length - 1].textContent.trim().replace(/\s+/g, " ") : "",
		};
	}

	function amostraHTML(row) {
		const html = row.outerHTML || "";
		return html.length > 220 ? html.slice(0, 220) + "…" : html;
	}

	function obterLinhasDaTabela(doc) {
		const tabela = (doc || document).querySelector("table.resultTable");
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

	function obterNavegacao(doc) {
		const nav = (doc || document).querySelector("#navigator");
		if (!nav) return null;
		const paginaEl = nav.querySelector("b");
		return {
			nav: nav,
			proxima: nav.querySelector("a.arrowNextOn"),
			paginaAtual: paginaEl ? paginaEl.textContent.trim() : null,
		};
	}

	// --- coleta em segundo plano, num iframe oculto --------------------------

	// Clica de verdade no link "Próxima Página" DENTRO do iframe oculto (que
	// está rodando a página real do Projudi, com o JavaScript dela) e espera
	// a página avançar — seja recarregando o iframe inteiro, seja atualizando
	// só a tabela via AJAX. Não precisamos saber qual dos dois é: cobrimos os
	// dois com o mesmo Promise.
	function clicarProximaNoIframe(iframe, link) {
		return new Promise(function (resolve) {
			let concluido = false;
			let observer = null;

			function finalizar(motivo) {
				if (concluido) return;
				concluido = true;
				iframe.removeEventListener("load", aoRecarregar);
				if (observer) observer.disconnect();
				clearTimeout(timer);
				resolve(motivo);
			}

			function aoRecarregar() {
				finalizar("recarregou");
			}
			iframe.addEventListener("load", aoRecarregar);

			try {
				const navAntes = obterNavegacao(iframe.contentDocument);
				const marcadorAntes = navAntes ? navAntes.paginaAtual : null;
				if (navAntes && navAntes.nav) {
					observer = new MutationObserver(function () {
						try {
							const navAgora = obterNavegacao(iframe.contentDocument);
							if (navAgora && navAgora.paginaAtual && navAgora.paginaAtual !== marcadorAntes) {
								finalizar("atualizou");
							}
						} catch (e) {
							// iframe pode estar no meio de uma navegação — ignora e espera o "load".
						}
					});
					observer.observe(navAntes.nav, { childList: true, subtree: true, characterData: true });
				}
			} catch (e) {
				console.warn(TAG, "não consegui observar o navegador de páginas do iframe:", e);
			}

			const timer = setTimeout(function () {
				finalizar("timeout");
			}, TIMEOUT_AVANCAR_PAGINA_MS);

			link.click();
		});
	}

	// Busca todas as páginas seguintes à página 1 (já visível na aba de
	// verdade) num iframe oculto, e devolve todos os processos, de todas as
	// páginas, cujo Seq. termina no dígito informado.
	async function coletarTodasAsPaginas(digito) {
		const encontrados = [];
		const chaves = new Set();
		let paginasPercorridas = 1;
		let erro = null;

		function registrar(doc, origemLabel) {
			const info = obterLinhasDaTabela(doc);
			let novos = 0;
			info.reconhecidas.forEach(function (item) {
				const seq = item.dados.seq;
				if (seq === null || seq.slice(-1) !== digito) return;
				const chave = item.dados.processo + "#" + seq;
				if (chaves.has(chave)) return;
				chaves.add(chave);
				encontrados.push({
					processo: item.dados.processo,
					seq: seq,
					dataDecurso: item.dados.dataDecurso,
					situacao: item.dados.situacao,
					linha: item.row.cloneNode(true),
				});
				novos++;
			});
			console.log(TAG, origemLabel, "—", novos, "processo(s) novo(s) | total acumulado:", encontrados.length, "| linhas ignoradas nesta página:", info.ignoradas.length);
			return info;
		}

		const infoPagina1 = registrar(document, "página 1 (aba visível)");
		const navPagina1 = obterNavegacao(document);
		if (!navPagina1 || !navPagina1.proxima) {
			return { encontrados: encontrados, paginas: 1, erro: null };
		}

		const primeiroProcessoVisivel = infoPagina1.reconhecidas[0] ? infoPagina1.reconhecidas[0].dados.processo : null;

		atualizarStatus("Buscando demais páginas em segundo plano…");

		const iframe = document.createElement("iframe");
		iframe.setAttribute("data-pdp-loader", "decurso-prazo-sequencial");
		iframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;";
		document.body.appendChild(iframe);

		try {
			await new Promise(function (resolve, reject) {
				const t = setTimeout(function () {
					reject(new Error("tempo esgotado carregando a 1ª página em segundo plano"));
				}, TIMEOUT_PRIMEIRA_CARGA_MS);
				iframe.addEventListener("load", function aoCarregar() {
					iframe.removeEventListener("load", aoCarregar);
					clearTimeout(t);
					resolve();
				});
				iframe.src = location.href;
			});

			// Confere que o iframe reproduziu a MESMA busca (o Projudi guarda o
			// critério de busca na sessão do usuário; se por algum motivo vier
			// outra coisa, é mais seguro parar aqui do que coletar dados errados).
			const infoIframe1 = obterLinhasDaTabela(iframe.contentDocument);
			const primeiroProcessoIframe = infoIframe1.reconhecidas[0] ? infoIframe1.reconhecidas[0].dados.processo : null;
			if (primeiroProcessoVisivel && primeiroProcessoIframe !== primeiroProcessoVisivel) {
				console.warn(
					TAG,
					"a página carregada em segundo plano não bateu com a busca atual — esperava como 1º processo:",
					primeiroProcessoVisivel,
					"| veio:",
					primeiroProcessoIframe,
					"— parando a coleta em todas as páginas; mostrando só a página atual."
				);
				return { encontrados: encontrados, paginas: 1, erro: "busca-nao-reproduzida-em-segundo-plano" };
			}

			let pagina = 1;
			while (pagina < MAX_PAGINAS) {
				const navAtual = obterNavegacao(iframe.contentDocument);
				if (!navAtual || !navAtual.proxima) break;

				atualizarStatus("Buscando demais páginas em segundo plano… (indo para a página " + (pagina + 1) + ")");
				const motivo = await clicarProximaNoIframe(iframe, navAtual.proxima);

				if (motivo === "timeout") {
					console.warn(TAG, "não detectei avanço da página", pagina, "para a seguinte em", TIMEOUT_AVANCAR_PAGINA_MS / 1000, "s — parando a coleta aqui.");
					erro = "sem-resposta-apos-pagina-" + pagina;
					break;
				}

				pagina++;
				paginasPercorridas = pagina;
				registrar(iframe.contentDocument, "página " + pagina + " (segundo plano)");
			}

			if (pagina >= MAX_PAGINAS) {
				console.warn(TAG, "atingido o limite de segurança de", MAX_PAGINAS, "páginas — parando");
				erro = "limite-de-" + MAX_PAGINAS + "-paginas";
			}

			return { encontrados: encontrados, paginas: paginasPercorridas, erro: erro };
		} catch (e) {
			console.error(TAG, "erro coletando as demais páginas em segundo plano:", e);
			return { encontrados: encontrados, paginas: paginasPercorridas, erro: String((e && e.message) || e) };
		} finally {
			iframe.remove();
		}
	}

	// --- apresentação do resultado na própria tabela -------------------------

	function apresentarResultado(digito, resultado) {
		atualizarStatus("");

		const tabela = document.querySelector("table.resultTable");
		const tbody = tabela && tabela.querySelector("tbody");
		if (tbody) {
			tbody.innerHTML = "";
			resultado.encontrados.forEach(function (item) {
				tbody.appendChild(item.linha);
			});
		}

		const nav = document.querySelector("#navigator");
		if (nav) {
			const avisoErro = resultado.erro
				? ' <span style="color:#a33">— a lista pode estar incompleta (' + resultado.erro + ").</span>"
				: "";
			nav.innerHTML =
				'<div class="navLeft"><strong>Sequencial ' +
				digito +
				"</strong> em todas as páginas: " +
				resultado.encontrados.length +
				" processo(s) encontrados, percorrendo " +
				resultado.paginas +
				" página(s)." +
				avisoErro +
				"</div>" +
				'<div style="clear:both"></div>';
		}

		console.groupCollapsed(TAG, "resultado final — dígito:", digito, "| processos:", resultado.encontrados.length, "| páginas percorridas:", resultado.paginas, "| erro:", resultado.erro || "(nenhum)");
		console.table(
			resultado.encontrados.map(function (item) {
				return { processo: item.processo, seq: item.seq, dataDecurso: item.dataDecurso, situacao: item.situacao };
			})
		);
		console.groupEnd();
	}

	async function filtrarEmTodasAsPaginas(digito) {
		console.log(TAG, "Filtrar acionado com Sequencial", digito, "— buscando em todas as páginas em segundo plano");
		const resultado = await coletarTodasAsPaginas(digito);
		apresentarResultado(digito, resultado);
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
		filtrarEmTodasAsPaginas(digitoParaEstaCarga);
	}
})();
