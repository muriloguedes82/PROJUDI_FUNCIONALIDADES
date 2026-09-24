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
// 2. As demais páginas são buscadas em segundo plano com fetch() — mesma
//    sessão/cookies do usuário (credentials: same-origin), sem abrir nem
//    navegar nenhuma aba/iframe (mesma técnica já usada em outras partes
//    desta extensão, ex.: sequencialProcessoPrincipal.js). A tentativa
//    inicial de clicar de verdade no link "Próxima Página" dentro de um
//    iframe oculto esbarrou no Content-Security-Policy do Projudi (o link
//    usa uma URL "javascript:", que o navegador bloqueia); por isso, em
//    vez de clicar em qualquer coisa, descobrimos a URL/parâmetros reais
//    da "Próxima Página" a partir do próprio HTML (bruto, como o servidor
//    manda — via fetch, não a partir do DOM já processado pelo Chrome) e
//    repetimos o mesmo POST que o formulário de busca já faz, uma vez por
//    página.
// 3. Os processos cujo "Seq." termina no dígito informado, de todas as
//    páginas, substituem as linhas da própria tabela de resultados já
//    existente na tela (nada de painel novo) — e o resumo (quantos
//    processos, em quantas páginas) aparece onde antes ficava a navegação
//    de páginas.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	// Nunca roda dentro de um iframe oculto usado por OUTRA parte desta
	// extensão para carregar páginas em segundo plano (ex.:
	// sequencialProcessoPrincipal.js) — essa tela em si não deveria aparecer
	// assim, mas o guarda-costas é o mesmo padrão usado em todo o resto do
	// código, então mantemos por consistência/segurança.
	// Idem para o iframe oculto da dispensa de decursos (juntadaDrag.js),
	// que carrega justamente esta tela: aqui o script consumiria o dígito
	// guardado no sessionStorage (compartilhado com a aba) e poderia
	// navegar pelas páginas dentro do iframe, atrapalhando a dispensa.
	if (window.frameElement && (window.frameElement.hasAttribute("data-pdp-loader") || window.frameElement.hasAttribute("data-pdp-decurso"))) return;

	const TAG = "[Projudi Sequencial Decurso de Prazo]";
	const STORAGE_KEY = "pdpDecursoPrazoSequencialDigito";
	const MAX_PAGINAS = 200;
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

	// --- coleta em segundo plano, via fetch() ---------------------------------

	// Repete, com fetch(), o mesmo POST que o formulário de busca já faz —
	// mesma técnica de fetchAbaInformacoesGeraisPOST em
	// sequencialProcessoPrincipal.js (detecção de charset a partir do
	// <meta charset>/cabeçalho HTTP, igual à tela de Decurso de Prazo, que
	// também é servida em windows-1252/ISO-8859-1).
	async function buscarDocumentoPOST(actionUrl, corpo) {
		const controller = new AbortController();
		const timeout = setTimeout(function () {
			controller.abort();
		}, TIMEOUT_AVANCAR_PAGINA_MS);
		try {
			const resposta = await fetch(actionUrl, {
				method: "POST",
				body: corpo,
				credentials: "same-origin",
				signal: controller.signal,
			});
			if (!resposta.ok) throw new Error("Projudi respondeu " + resposta.status + " " + resposta.statusText);
			const bytes = await resposta.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") ||
				/charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			const html = new TextDecoder(charset).decode(bytes);
			return new DOMParser().parseFromString(html, "text/html");
		} finally {
			clearTimeout(timeout);
		}
	}

	// Os campos atualmente preenchidos no formulário de busca (menos o nosso
	// próprio campo Sequencial, que o Projudi não conhece) — usados para
	// repetir a MESMA busca ao avançar de página.
	function corpoDoFormularioAtual() {
		const form = document.querySelector("#intimacaoBuscaForm");
		const body = new URLSearchParams();
		if (form) {
			for (const [name, value] of new FormData(form)) {
				if (typeof value === "string" && name !== "pdpSequencial") body.append(name, value);
			}
		}
		return body;
	}

	// Extrai atribuições do tipo
	// document.forms['intimacaoBuscaForm']['pageNumber'].value='2'; — o
	// padrão de verdade usado pelo link "Próxima Página" desta tela (href
	// "javascript:...", confirmado no console: seta pageNumber/sortColumn/
	// sortOrder no próprio formulário de busca e chama .submit()).
	function extrairAtribuicoesJS(trecho) {
		const regex = /document\.forms\[['"]([^'"]+)['"]\]\[['"]([^'"]+)['"]\]\.value\s*=\s*['"]([^'"]*)['"]/g;
		const atribuicoes = [];
		let m;
		while ((m = regex.exec(trecho))) {
			atribuicoes.push({ formulario: m[1], campo: m[2], valor: m[3] });
		}
		return atribuicoes;
	}

	// Descobre como o link "Próxima Página" realmente funciona, a partir do
	// HTML bruto devolvido pelo servidor (não a partir do DOM já processado
	// pelo Chrome, que pode não trazer os mesmos atributos). Loga sempre o
	// HTML bruto do link, para diagnosticar sem precisar advinhar caso mude.
	function acharProximaPaginaAction(doc) {
		const nav = doc.querySelector("#navigator");
		const link = nav && nav.querySelector("a.arrowNextOn");
		if (!link) return null;

		console.log(TAG, 'anchor "Próxima Página" (HTML bruto, como o servidor mandou):', link.outerHTML);

		const href = link.getAttribute("href") || "";
		const onclick = link.getAttribute("onclick") || "";

		// Padrão real desta tela: define campos do próprio formulário de
		// busca (pageNumber, sortColumn, sortOrder) e reenvia. Reproduzimos
		// com fetch(): mesmo corpo do formulário atual, com esses campos
		// sobrescritos pelos valores que o link usaria.
		const trechoComSubmit = /\.submit\(\)/.test(href) ? href : /\.submit\(\)/.test(onclick) ? onclick : "";
		const atribuicoes = trechoComSubmit ? extrairAtribuicoesJS(trechoComSubmit) : [];
		if (atribuicoes.length) {
			const nomeFormulario = atribuicoes[0].formulario;
			const formulario = doc.querySelector('form[name="' + nomeFormulario + '"]') || doc.getElementById(nomeFormulario) || doc.querySelector("#intimacaoBuscaForm");
			let actionUrl = null;
			if (formulario) {
				try {
					actionUrl = new URL(formulario.getAttribute("action") || formulario.action, location.href).href;
				} catch (e) {
					actionUrl = null;
				}
			}
			if (formulario && actionUrl) {
				const corpo = new URLSearchParams();
				for (const [name, value] of new FormData(formulario)) {
					if (typeof value === "string" && name !== "pdpSequencial") corpo.append(name, value);
				}
				atribuicoes.forEach(function (a) {
					corpo.set(a.campo, a.valor);
				});
				console.log(TAG, "avançando via campos do formulário:", atribuicoes.map(function (a) { return a.campo + "=" + a.valor; }).join(", "));
				return { url: actionUrl, corpo: corpo };
			}
		}

		// Outros padrões possíveis (não confirmados nesta tela, mas usados
		// noutros botões do Projudi — ver extractAnalisarRetornoAction em
		// content.js) — mantidos como alternativa.
		if (href && !/^\s*(javascript:|#)/i.test(href)) {
			try {
				return { url: new URL(href, location.href).href, corpo: null };
			} catch (e) {
				/* ignora e tenta o onclick abaixo */
			}
		}
		const padroes = [/submitPage\(\s*['"]([^'"]+)['"]/, /location\.href\s*=\s*['"]([^'"]+)['"]/, /\.(?:load|get|post)\(\s*['"]([^'"]+)['"]/];
		for (const padrao of padroes) {
			const encontrado = padrao.exec(onclick);
			if (encontrado && encontrado[1]) {
				try {
					return { url: new URL(encontrado[1], location.href).href, corpo: corpoDoFormularioAtual() };
				} catch (e) {
					/* tenta o próximo padrão */
				}
			}
		}

		console.warn(TAG, 'não consegui descobrir como a "Próxima Página" funciona a partir do HTML — onclick:', onclick || "(nenhum)", "| href:", href || "(nenhum)");
		logarScriptsDePaginacao(doc);
		return null;
	}

	// Diagnóstico de última instância: procura, nos <script> da própria
	// resposta do servidor (fetch preserva o texto deles, diferente do "Save
	// as MHTML" do Chrome, que remove <script>), algum trecho que pareça
	// implementar a navegação entre páginas — para não precisar advinhar
	// caso acharProximaPaginaAction não encontre nada.
	function logarScriptsDePaginacao(doc) {
		const scripts = doc.querySelectorAll("script:not([src])");
		let achou = false;
		scripts.forEach(function (script, indice) {
			const texto = script.textContent || "";
			if (/arrowNext|numeroPagina|goToPage|irParaPagina|paginaAtual|navigator/i.test(texto)) {
				achou = true;
				console.log(TAG, "script inline #" + indice + " com possível lógica de paginação (primeiros 2000 caracteres):", texto.slice(0, 2000));
			}
		});
		if (!achou) console.warn(TAG, "nenhum <script> da resposta menciona paginação — pode estar num arquivo .js externo, fora do alcance deste diagnóstico");
	}

	// Busca todas as páginas seguintes à página 1 (já visível na aba de
	// verdade) em segundo plano, e devolve todos os processos, de todas as
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

		registrar(document, "página 1 (aba visível)");
		let docAtual = document;
		let navAtual = obterNavegacao(document);
		if (!navAtual || !navAtual.proxima) {
			return { encontrados: encontrados, paginas: 1, erro: null };
		}

		atualizarStatus("Buscando demais páginas em segundo plano…");

		let pagina = 1;
		while (pagina < MAX_PAGINAS) {
			const proxima = acharProximaPaginaAction(docAtual);
			if (!proxima) {
				erro = "nao-consegui-descobrir-a-proxima-pagina";
				break;
			}

			atualizarStatus("Buscando demais páginas em segundo plano… (página " + (pagina + 1) + ")");

			let doc;
			try {
				doc = await buscarDocumentoPOST(proxima.url, proxima.corpo || corpoDoFormularioAtual());
			} catch (e) {
				console.error(TAG, "falha ao buscar a página", pagina + 1, ":", e);
				erro = "falha-buscando-pagina-" + (pagina + 1);
				break;
			}

			const infoDoc = obterLinhasDaTabela(doc);
			if (!infoDoc.tabela) {
				console.warn(TAG, "a resposta da página", pagina + 1, "não trouxe a tabela de resultados esperada");
				erro = "resposta-sem-tabela-na-pagina-" + (pagina + 1);
				break;
			}

			pagina++;
			paginasPercorridas = pagina;
			registrar(doc, "página " + pagina + " (segundo plano)");
			docAtual = doc;

			navAtual = obterNavegacao(doc);
			if (!navAtual || !navAtual.proxima) break;
		}

		if (pagina >= MAX_PAGINAS) {
			console.warn(TAG, "atingido o limite de segurança de", MAX_PAGINAS, "páginas — parando");
			erro = "limite-de-" + MAX_PAGINAS + "-paginas";
		}

		return { encontrados: encontrados, paginas: paginasPercorridas, erro: erro };
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
