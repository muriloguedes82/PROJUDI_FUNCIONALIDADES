// Projudi - Listas em uma única página
//
// As listas "Análise de Juntadas" (processo/analisarJuntada.do),
// "Conclusões" (processo/conclusao.do), "Mandados" (mandados retornados e
// demais; processo/cumprimentoCartorioMandado.do), "Listagem de Multas -
// Sistema FUPEN" (processo/criminal/multaFupen.do), "Processos com suspeita
// de incompetência - Juiz das Garantias" (judiciario/juizo_garantia.do,
// actionType=listaProcessosNaoAtendidos), "Expedir Intimações"
// (processo/expedirIntimacao.do), "Intimação" - decurso de prazo
// (processo/intimacaoBusca.do), "Intimação de Auxiliares da Justiça"
// (processo/intimacaoNomeados.do) e "Listagem de Audiências"
// (audiencia/busca.do, formulário audienciaForm; versão 24) são paginadas
// no servidor
// (20 ou 30 registros por página, navegação "Próxima Página" no
// #navigator; nos Mandados, também o seletor "30/50/100/500 por pág."). Esta
// funcionalidade reúne todas as páginas na própria tabela da primeira: ao
// abrir a lista (ou depois de um Filtrar/ordenação), as demais páginas são
// buscadas em segundo plano e as linhas delas são acrescentadas, em ordem,
// ao <tbody> da tabela de resultados — dentro do mesmo formulário, então
// "Análise Múltipla", "Analisar", "Dispensar" e a caixa de marcar todos
// alcançam os itens de todas as páginas.
//
// Como a "Próxima Página" é descoberta e repetida: mesma técnica de
// decursoPrazoSequencial.js (que já faz isso no Decurso de Prazo). O link
// usa uma URL "javascript:" que define campos do formulário de busca
// (pageNumber, sortColumn, sortOrder...) e o envia; lemos essas atribuições
// do href/onclick e repetimos o mesmo POST com fetch() (mesma sessão do
// usuário), uma página de cada vez, até não haver mais "Próxima Página".
//
// Linhas trazidas das outras páginas: na Análise de Juntadas cada página
// numera do 0 os ids do "+" dos arquivos (linkArquivosN, iconN, rowN,
// divN), então os ids são renumerados para continuar a numeração da tabela
// (e as referências a eles no onclick="showDetail(...)"), para o "+" abrir
// a linha certa. Numa lista reunida, porém, o "+" do próprio Projudi deixa
// de trazer os arquivos certos (o servidor passa a "estar" na última página
// buscada) — o clique no "+" é então atendido pela extensão (ver "Arquivos
// do +", mais abaixo). As demais funções da extensão que enfeitam as linhas (⭐ em
// lote, 📍 localizador, listas de tarefas, pré-visualização) já observam a
// tabela e tratam as linhas novas sozinhas.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpListasPaginaUnica) return;
	window.__pdpListasPaginaUnica = true;

	// Telas atendidas: `form` é o formulário de busca que envolve a tabela;
	// `itens` e `todos`, como os registros são chamados nos avisos.
	const TELAS = [
		{ caminho: /^\/projudi\/processo\/analisarJuntada\.do$/, form: "analisarJuntadaForm", itens: "juntadas", todos: "Todas as" },
		{ caminho: /^\/projudi\/processo\/conclusao\.do$/, form: "processoConclusaoForm", itens: "conclusões", todos: "Todas as" },
		{ caminho: /^\/projudi\/processo\/cumprimentoCartorioMandado\.do$/, form: "cumprimentoCartorioMandadoForm", itens: "mandados", todos: "Todos os" },
		{ caminho: /^\/projudi\/processo\/criminal\/multaFupen\.do$/, form: "multaFupenForm", itens: "multas", todos: "Todas as" },
		{ caminho: /^\/projudi\/judiciario\/juizo_garantia\.do$/, form: "juizoGarantiaForm", itens: "processos", todos: "Todos os" },
		{ caminho: /^\/projudi\/processo\/expedirIntimacao\.do$/, form: "expedirIntimacaoForm", itens: "intimações", todos: "Todas as" },
		{ caminho: /^\/projudi\/processo\/intimacaoBusca\.do$/, form: "intimacaoBuscaForm", itens: "intimações", todos: "Todas as", decursoSequencial: true },
		{ caminho: /^\/projudi\/processo\/intimacaoNomeados\.do$/, form: "intimacaoAuxiliarNomeadoForm", itens: "intimações", todos: "Todas as" },
		{ caminho: /^\/projudi\/audiencia\/busca\.do$/, form: "audienciaForm", itens: "audiências", todos: "Todas as" },
	];
	const TELA = TELAS.find(function (t) {
		return t.caminho.test(location.pathname);
	});
	if (!TELA) return;

	// Nunca roda nos iframes ocultos que a própria extensão usa para carregar
	// telas em segundo plano (dispensa de juntadas, decursos, localizador,
	// pré-visualização...): ali a lista é lida/acionada por outro script e
	// não deve ser alterada.
	try {
		const quadro = window.frameElement;
		if (quadro) {
			if (quadro.classList.contains("pdp-qa-modal-iframe")) return;
			for (const atributo of Array.from(quadro.attributes)) {
				if (/^data-pdp-/.test(atributo.name)) return;
			}
		}
	} catch (e) {
		/* frameElement inacessível (outra origem) — segue normalmente */
	}

	const TAG = "[Projudi " + TELA.itens + " em uma página]";
	const MAX_PAGINAS = 100;
	const TIMEOUT_PAGINA_MS = 20000;
	const PREFIXOS_ID = ["linkArquivos", "icon", "row", "div"];
	// Campos que não fazem parte da busca: as caixas de marcar das linhas.
	const CAMPOS_IGNORADOS = new Set(["idJuntadas", "checker"]);

	function formulario(doc) {
		return doc.querySelector('form[id="' + TELA.form + '"], form[name="' + TELA.form + '"]');
	}

	function tabelaResultados(doc) {
		// Só a tabela de dentro do formulário da lista: conclusao.do,
		// cumprimentoCartorioMandado.do e multaFupen.do também abrem a tela
		// de um único registro (análise da conclusão, visualização do
		// mandado, detalhe da multa), que não deve ser tocada.
		const form = formulario(doc);
		return form ? form.querySelector("table.resultTable") : null;
	}

	function navegacao(doc) {
		return doc.querySelector("#navigator");
	}

	function linkProxima(doc) {
		const nav = navegacao(doc);
		return nav ? nav.querySelector("a.arrowNextOn") : null;
	}

	// --- descobrir e buscar a próxima página -----------------------------------

	function corpoDoFormulario(form) {
		const corpo = new URLSearchParams();
		if (!form) return corpo;
		for (const [nome, valor] of new FormData(form)) {
			if (typeof valor !== "string" || !nome || CAMPOS_IGNORADOS.has(nome) || /^pdp/i.test(nome)) continue;
			corpo.append(nome, valor);
		}
		return corpo;
	}

	function urlAbsoluta(url, base) {
		try {
			return new URL(url, base || location.href).href;
		} catch (e) {
			return null;
		}
	}

	function urlDoFormulario(form) {
		return form ? urlAbsoluta(form.getAttribute("action") || location.href) : null;
	}

	// document.forms['analisarJuntadaForm']['pageNumber'].value='2';
	function extrairAtribuicoes(trecho) {
		const regex = /document\.forms\[['"]([^'"]+)['"]\]\[['"]([^'"]+)['"]\]\.value\s*=\s*['"]([^'"]*)['"]/g;
		const atribuicoes = [];
		let m;
		while ((m = regex.exec(trecho))) atribuicoes.push({ campo: m[2], valor: m[3] });
		// Variante: document.getElementById('pageNumber').value = '2'
		const regexId = /getElementById\(\s*['"]([^'"]+)['"]\s*\)\.value\s*=\s*['"]([^'"]*)['"]/g;
		while ((m = regexId.exec(trecho))) atribuicoes.push({ campo: m[1], valor: m[2], porId: true });
		return atribuicoes;
	}

	// Devolve { url, corpo } do pedido que a "Próxima Página" de `doc` faria,
	// ou null se não houver próxima página / não der para descobrir.
	// `formAtual`: o formulário da aba (com a busca que o usuário fez), usado
	// como base do corpo.
	function pedidoDaProxima(doc, formAtual) {
		const link = linkProxima(doc);
		if (!link) return null;
		const href = link.getAttribute("href") || "";
		const onclick = link.getAttribute("onclick") || "";
		const trecho = href + "\n" + onclick;

		const atribuicoes = extrairAtribuicoes(trecho);
		if (atribuicoes.length) {
			const formDoc = formulario(doc);
			const corpo = corpoDoFormulario(formAtual);
			// Campos ocultos da própria página buscada (ex.: pageNumber,
			// sortColumn) prevalecem sobre os da aba; os filtros visíveis
			// continuam sendo os que o usuário escolheu na aba.
			if (formDoc && formDoc !== formAtual) {
				formDoc.querySelectorAll('input[type="hidden"][name]').forEach(function (campo) {
					if (!CAMPOS_IGNORADOS.has(campo.name)) corpo.set(campo.name, campo.value);
				});
			}
			const alterados = [];
			atribuicoes.forEach(function (a) {
				let nome = a.campo;
				if (a.porId && formDoc) {
					const campo = formDoc.querySelector("#" + CSS.escape(a.campo));
					if (campo && campo.name) nome = campo.name;
				}
				corpo.set(nome, a.valor);
				alterados.push({ nome: nome, valor: a.valor });
			});
			const url = urlDoFormulario(formDoc) || urlDoFormulario(formAtual);
			if (url) return { url: url, corpo: corpo, alterados: alterados };
		}

		// Link comum (href com endereço de verdade).
		if (href && !/^\s*(javascript:|#)/i.test(href)) {
			const url = urlAbsoluta(href);
			if (url) return { url: url, corpo: null };
		}

		// Outros padrões usados em botões do Projudi.
		const padroes = [/location\.href\s*=\s*['"]([^'"]+)['"]/, /submitPage\(\s*['"]([^'"]+)['"]/, /\.(?:load|get|post)\(\s*['"]([^'"]+)['"]/];
		for (const padrao of padroes) {
			const achado = padrao.exec(trecho);
			const url = achado && urlAbsoluta(achado[1]);
			if (url) return { url: url, corpo: corpoDoFormulario(formAtual) };
		}

		console.warn(TAG, 'não consegui descobrir como a "Próxima Página" funciona — href:', href || "(nenhum)", "| onclick:", onclick || "(nenhum)", "| HTML:", link.outerHTML);
		return null;
	}

	async function buscarPagina(pedido) {
		return new DOMParser().parseFromString(await buscarTexto(pedido), "text/html");
	}

	async function buscarTexto(pedido) {
		const controle = new AbortController();
		const tempo = setTimeout(function () {
			controle.abort();
		}, TIMEOUT_PAGINA_MS);
		try {
			const opcoes = { credentials: "same-origin", signal: controle.signal };
			if (pedido.corpo) {
				opcoes.method = "POST";
				opcoes.body = pedido.corpo;
			}
			const resposta = await fetch(pedido.url, opcoes);
			if (!resposta.ok) throw new Error("Projudi respondeu " + resposta.status + " " + resposta.statusText);
			const bytes = await resposta.arrayBuffer();
			const inicio = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charset =
				/charset\s*=\s*["']?([\w-]+)/i.exec(resposta.headers.get("content-type") || "") ||
				/charset\s*=\s*["']?([\w-]+)/i.exec(inicio);
			try {
				return new TextDecoder((charset && charset[1]) || "windows-1252").decode(bytes);
			} catch (e) {
				return new TextDecoder("windows-1252").decode(bytes);
			}
		} finally {
			clearTimeout(tempo);
		}
	}

	// --- linhas -----------------------------------------------------------------

	// Linha auxiliar: a linha oculta (rowN, com o divN "extendedinfo") que o
	// "+" preenche com os arquivos da juntada da linha anterior (só existe na
	// Análise de Juntadas).
	function linhaAuxiliar(tr) {
		return /^row\d+$/.test(tr.id || "") || (!!tr.querySelector(".extendedinfo") && !tr.querySelector('a[href*="processo.do"]'));
	}

	// Identifica o registro: pela caixa idJuntadas ("id:...", identificação
	// de verdade, usada para não repetir uma juntada que mudou de página
	// durante a busca) e, quando a linha não tem caixa (há juntadas que o
	// Projudi não deixa marcar, e as demais listas não têm nenhuma), pelo
	// processo e pelo texto das colunas ("linha:..."). A chave "linha:" NÃO
	// serve para descartar registros: linhas diferentes podem ter o mesmo
	// texto (ex.: "Segredo de justiça" em todas as colunas). Ela só compõe a
	// assinatura da página, para perceber uma página repetida.
	function chaveDoRegistro(tr) {
		const caixa = tr.querySelector('input[name="idJuntadas"]');
		if (caixa && caixa.value) return "id:" + caixa.value;
		// Sem o que a própria extensão acrescenta à linha (📍, ⭐...), que
		// ainda não existe nas linhas buscadas.
		// Também sem os <script> que o Projudi põe na linha: o do ícone de
		// copiar o número usa um número aleatório, diferente a cada carga da
		// página — a mesma linha nunca teria a mesma chave.
		const copia = tr.cloneNode(true);
		copia.querySelectorAll('[class^="pdp-"], [class*=" pdp-"], script, noscript, style').forEach(function (el) {
			el.remove();
		});
		const processo = copia.querySelector('a[href*="processo.do"]');
		const texto = Array.from(copia.cells)
			.map(function (td) {
				return (td.textContent || "").replace(/\s+/g, " ").trim();
			})
			.join("|");
		return "linha:" + (processo ? processo.textContent.trim() : "") + "|" + texto;
	}

	// Agrupa as linhas do <tbody>: cada registro seguido das linhas
	// auxiliares dela.
	function gruposDeLinhas(tabela) {
		const grupos = [];
		let atual = null;
		Array.from(tabela.tBodies).forEach(function (tbody) {
			Array.from(tbody.rows).forEach(function (tr) {
				if (!tr.cells.length) return;
				if (linhaAuxiliar(tr)) {
					if (atual) atual.linhas.push(tr);
					return;
				}
				atual = { id: chaveDoRegistro(tr), linhas: [tr] };
				grupos.push(atual);
			});
		});
		return grupos;
	}

	function maiorIndice(tabela) {
		let maior = -1;
		const regex = new RegExp("^(?:" + PREFIXOS_ID.join("|") + ")(\\d+)$");
		tabela.querySelectorAll("[id], [class*='linkArquivos']").forEach(function (el) {
			const m = regex.exec(el.id || "");
			if (m) maior = Math.max(maior, Number(m[1]));
			el.classList.forEach(function (classe) {
				const c = /^linkArquivos(\d+)$/.exec(classe);
				if (c) maior = Math.max(maior, Number(c[1]));
			});
		});
		return maior;
	}

	// Renumera, nas linhas de um grupo, os ids do "+" dos arquivos e as
	// referências a eles nos atributos onclick/href (ex.: showDetail('row3',
	// 'div3', ...) ou showDetail(3, ...)).
	function renumerar(linhas, proximoIndice) {
		const regexId = new RegExp("^(" + PREFIXOS_ID.join("|") + ")(\\d+)$");
		const antigos = new Set();
		linhas.forEach(function (tr) {
			[tr].concat(Array.from(tr.querySelectorAll("[id]"))).forEach(function (el) {
				const m = el.id && regexId.exec(el.id);
				if (m) antigos.add(m[2]);
				if (el.classList) {
					el.classList.forEach(function (classe) {
						const c = /^linkArquivos(\d+)$/.exec(classe);
						if (c) antigos.add(c[1]);
					});
				}
			});
		});
		if (!antigos.size) return proximoIndice;

		const mapa = new Map();
		Array.from(antigos).sort(function (a, b) {
			return Number(a) - Number(b);
		}).forEach(function (antigo) {
			mapa.set(antigo, String(proximoIndice++));
		});

		const regexRef = new RegExp("\\b(" + PREFIXOS_ID.join("|") + ")(\\d+)\\b", "g");
		linhas.forEach(function (tr) {
			[tr].concat(Array.from(tr.querySelectorAll("*"))).forEach(function (el) {
				const m = el.id && regexId.exec(el.id);
				if (m && mapa.has(m[2])) el.id = m[1] + mapa.get(m[2]);
				// Algumas listas marcam o "+" com a classe linkArquivosN.
				Array.from(el.classList).forEach(function (classe) {
					const c = /^linkArquivos(\d+)$/.exec(classe);
					if (c && mapa.has(c[1])) el.classList.replace(classe, "linkArquivos" + mapa.get(c[1]));
				});
				["onclick", "href"].forEach(function (nomeAtributo) {
					const valor = el.getAttribute(nomeAtributo);
					if (!valor || (nomeAtributo === "href" && !/^\s*javascript:/i.test(valor))) return;
					let novo = valor.replace(regexRef, function (tudo, prefixo, numero) {
						return mapa.has(numero) ? prefixo + mapa.get(numero) : tudo;
					});
					// Índice numérico como 1º argumento: showDetail(3, ...).
					novo = novo.replace(/(showDetail\(\s*)(['"]?)(\d+)\2(\s*[,)])/g, function (tudo, antes, aspas, numero, depois) {
						return mapa.has(numero) ? antes + aspas + mapa.get(numero) + aspas + depois : tudo;
					});
					if (novo !== valor) el.setAttribute(nomeAtributo, novo);
				});
			});
		});
		return proximoIndice;
	}

	// --- aviso na navegação -----------------------------------------------------

	let aviso = null;
	function mostrarAviso(texto, erro) {
		const nav = navegacao(document);
		if (!nav) return;
		if (!aviso || !aviso.isConnected) {
			aviso = document.createElement("div");
			aviso.className = "pdp-jpu-aviso";
			aviso.setAttribute("role", "status");
			aviso.style.cssText = "clear:both;padding:3px 0;font-size:11px;";
			nav.appendChild(aviso);
		}
		aviso.style.color = erro ? "#a33" : "#555";
		aviso.textContent = texto;
	}

	function concluirNavegacao(total, paginas, erro) {
		const nav = navegacao(document);
		if (!nav) return;
		if (erro) {
			// Mantém a navegação do Projudi para o usuário seguir à mão.
			mostrarAviso(
				"Reunidas " + paginas + " página(s) nesta tela (" + total + " " + TELA.itens + "). Não foi possível trazer as páginas seguintes: " + erro + ". Use a navegação do Projudi para vê-las.",
				true
			);
			return;
		}
		const direita = nav.querySelector(".navRight");
		if (direita) direita.remove();
		const esquerda = nav.querySelector(".navLeft");
		const texto =
			TELA.todos + " " + TELA.itens + " em uma única página: " + total + " registro(s)" + (paginas > 1 ? " (" + paginas + " páginas do Projudi reunidas)." : ".");
		if (esquerda) esquerda.textContent = texto;
		else mostrarAviso(texto, false);
		if (aviso) {
			aviso.remove();
			aviso = null;
		}
	}

	// --- Arquivos do "+" ---------------------------------------------------------
	//
	// O "+" das linhas (arquivos da juntada/intimação) é atendido pelo próprio
	// Projudi, que pergunta ao servidor pelos arquivos do item N "da página
	// atual da lista" — e o servidor guarda qual é a página atual: a última
	// pedida. Depois que a extensão busca as páginas 2, 3..., o "+" nativo
	// passa a abrir vazio (ou com os arquivos de outro item), inclusive nas
	// linhas da página 1. Além disso, as linhas trazidas das outras páginas
	// não têm os comandos que o Projudi liga ao "+" ao carregar a tela.
	//
	// Por isso, numa lista reunida, o clique no "+" é atendido assim: a página
	// de origem da linha é carregada num quadro oculto (com o mesmo pedido
	// usado para buscá-la, então o servidor volta a "estar" nela), o "+" da
	// mesma linha é clicado lá — pelo código do próprio Projudi — e o que
	// ele trouxer é copiado para a linha da tela. É o mesmo recurso de quadro
	// oculto que a pré-visualização das pendências já usa (content.js).
	// Os pedidos são atendidos por página de origem, aproveitando o quadro
	// enquanto ele estiver na página certa (ex.: "Expandir Mov").

	const pedidos = {}; // página -> { url, corpo }
	const ICONE_MAIS = 'img[id^="icon"], a[id^="linkArquivos"] img, a[class*="linkArquivos"] img, img[onclick*="showDetail"]';
	const TEMPO_ARQUIVOS_MS = 20000;
	let maisAtivo = false;

	// Pedido da página 1: o mesmo da página 2, com os campos que o link
	// "Próxima Página" altera (ex.: pageNumber=2) voltando para 1. Sem essa
	// informação, repete a busca do formulário (que traz a página 1).
	function pedidoDaPrimeira(pedido2, form) {
		if (pedido2 && pedido2.corpo && pedido2.alterados && pedido2.alterados.length) {
			const corpo = new URLSearchParams(pedido2.corpo);
			pedido2.alterados.forEach(function (a) {
				if (a.valor === "2") corpo.set(a.nome, "1");
			});
			return { url: pedido2.url, corpo: corpo };
		}
		return { url: urlDoFormulario(form), corpo: corpoDoFormulario(form) };
	}

	function numeroDoMais(tr) {
		const icone = tr.querySelector('img[id^="icon"]');
		let m = icone && /^icon(\d+)$/.exec(icone.id);
		if (m) return m[1];
		const link = tr.querySelector('a[id^="linkArquivos"], a[class*="linkArquivos"]');
		if (!link) return null;
		m = /^linkArquivos(\d+)$/.exec(link.id || "");
		if (m) return m[1];
		for (const classe of Array.from(link.classList)) {
			m = /^linkArquivos(\d+)$/.exec(classe);
			if (m) return m[1];
		}
		return null;
	}

	// Guarda, na linha, de que página ela veio e qual era o número do "+"
	// lá (antes de renumerar), para achar a mesma linha na página de origem.
	function marcarOrigem(linhas, pagina) {
		const principal = linhas[0];
		const numero = numeroDoMais(principal);
		principal.setAttribute("data-pdp-jpu-origem", String(pagina));
		if (numero !== null) principal.setAttribute("data-pdp-jpu-mais", numero);
		principal.setAttribute("data-pdp-jpu-chave", chaveDoRegistro(principal));
	}

	// Contêiner que o Projudi preenche com os arquivos (rowN / divN).
	function conteinerDoMais(doc, numero, linha) {
		const div = doc.getElementById("div" + numero);
		if (div) return { linha: doc.getElementById("row" + numero) || div.closest("tr"), div: div };
		const prox = linha && linha.nextElementSibling;
		if (prox && linhaAuxiliar(prox)) return { linha: prox, div: prox.querySelector(".extendedinfo") || prox.cells[0] };
		return null;
	}

	function trocarIcone(img, aberto) {
		if (!img) return;
		const src = img.getAttribute("src") || "";
		const novo = aberto ? src.replace(/iPlus\.gif/i, "iMinus.gif") : src.replace(/iMinus\.gif/i, "iPlus.gif");
		if (novo !== src) img.setAttribute("src", novo);
	}

	// Quadro oculto, reaproveitado entre os cliques.
	let quadro = null;
	let paginaNoQuadro = null;

	function carregarNoQuadro(pagina) {
		const pedido = pedidos[pagina];
		if (!pedido || !pedido.url) return Promise.reject(new Error("pedido da página " + pagina + " desconhecido"));
		return new Promise(function (resolver, rejeitar) {
			if (!quadro || !quadro.isConnected) {
				quadro = document.createElement("iframe");
				quadro.name = "pdpJpuQuadro" + Date.now();
				// data-pdp-loader vazio: os demais scripts da extensão não
				// atuam no quadro (eles conferem só a presença do atributo), e
				// o content.js não entra no modo de coleta (que confere o valor).
				quadro.setAttribute("data-pdp-loader", "");
				quadro.setAttribute("data-pdp-jpu-quadro", "1");
				quadro.setAttribute("aria-hidden", "true");
				quadro.tabIndex = -1;
				quadro.style.cssText = "position:fixed;left:-12000px;top:0;width:1000px;height:700px;border:0;visibility:hidden;";
				document.body.appendChild(quadro);
			}
			paginaNoQuadro = null;
			const tempo = setTimeout(function () {
				quadro.removeEventListener("load", aoCarregar);
				rejeitar(new Error("a página " + pagina + " demorou demais para abrir"));
			}, TEMPO_ARQUIVOS_MS);
			function aoCarregar() {
				clearTimeout(tempo);
				quadro.removeEventListener("load", aoCarregar);
				paginaNoQuadro = pagina;
				resolver(quadro.contentDocument);
			}
			quadro.addEventListener("load", aoCarregar);
			if (pedido.corpo) {
				// Envio de formulário de verdade (não fetch): o quadro abre a
				// página com os comandos do Projudi, como se fosse a aba.
				const envio = document.createElement("form");
				envio.method = "post";
				envio.action = pedido.url;
				envio.target = quadro.name;
				envio.style.display = "none";
				pedido.corpo.forEach(function (valor, nome) {
					const campo = document.createElement("input");
					campo.type = "hidden";
					campo.name = nome;
					campo.value = valor;
					envio.appendChild(campo);
				});
				document.body.appendChild(envio);
				HTMLFormElement.prototype.submit.call(envio);
				envio.remove();
			} else {
				quadro.src = pedido.url;
			}
		});
	}

	function esperar(ms) {
		return new Promise(function (r) {
			setTimeout(r, ms);
		});
	}

	// Na página aberta no quadro, a linha equivalente: pelo número do "+",
	// conferindo se é o mesmo registro; se a lista mudou, procura pelo
	// registro em toda a tabela.
	function linhaNoQuadro(doc, numero, chave) {
		const tabelaQ = tabelaResultados(doc);
		if (!tabelaQ) return null;
		const grupos = gruposDeLinhas(tabelaQ);
		const porNumero = grupos.find(function (g) {
			return numeroDoMais(g.linhas[0]) === numero;
		});
		if (porNumero && (!chave || chaveDoRegistro(porNumero.linhas[0]) === chave)) return porNumero.linhas[0];
		const porChave = chave && grupos.find(function (g) {
			return chaveDoRegistro(g.linhas[0]) === chave;
		});
		return porChave ? porChave.linhas[0] : null;
	}

	function origemDa(linha) {
		return Number(linha.getAttribute("data-pdp-jpu-origem"));
	}

	// Abre o "+" da linha na página que já está no quadro e devolve o que o
	// Projudi trouxer.
	async function abrirNoQuadro(doc, pagina, linha) {
		const numero = linha.getAttribute("data-pdp-jpu-mais");
		const chave = linha.getAttribute("data-pdp-jpu-chave");
		const linhaQ = linhaNoQuadro(doc, numero, chave);
		if (!linhaQ) throw new Error("o registro não está mais na página " + pagina + " da lista (ela pode ter mudado)");
		const numeroQ = numeroDoMais(linhaQ);
		const icone = linhaQ.querySelector(ICONE_MAIS);
		const alvo = conteinerDoMais(doc, numeroQ, linhaQ);
		if (!icone || !alvo || !alvo.div) throw new Error("a linha não tem arquivos na página " + pagina);
		linhaQ.setAttribute("data-pdp-jpu-aberto", "1");
		icone.click();
		// Espera o Projudi preencher o contêiner e o conteúdo parar de mudar.
		const limite = Date.now() + TEMPO_ARQUIVOS_MS;
		let anterior = null;
		let estavel = 0;
		while (Date.now() < limite) {
			await esperar(200);
			const html = alvo.div.innerHTML.trim();
			const carregando = !!alvo.div.querySelector('img[src*="indicator"], img[src*="loading"], img[src*="aguarde"]');
			if (html && !carregando && html === anterior) {
				if (++estavel >= 2) break;
			} else {
				estavel = 0;
			}
			anterior = html;
		}
		if (!alvo.div.innerHTML.trim()) throw new Error("o Projudi não trouxe os arquivos a tempo");
		// Copia com endereços completos (o quadro e a aba estão no mesmo
		// endereço base, mas assim não depende disso).
		const copia = document.importNode(alvo.div, true);
		copia.querySelectorAll("[href], [src]").forEach(function (el) {
			["href", "src"].forEach(function (attr) {
				const v = el.getAttribute(attr);
				if (v && !/^\s*(javascript:|#|data:)/i.test(v)) {
					const abs = urlAbsoluta(v, doc.baseURI);
					if (abs) el.setAttribute(attr, abs);
				}
			});
		});
		return copia.innerHTML;
	}

	// Pedidos pendentes de "+", atendidos por página: com o quadro numa
	// página, todos os "+" pedidos daquela página são abertos juntos (ex.:
	// "Expandir Mov"); depois passa para a próxima página pedida.
	const pendentes = []; // { linha, concluir(html), falhar(erro) }
	let trabalhando = false;

	// Caminho direto: nas listas de intimação (Expedir Intimações, decurso
	// de prazo, Auxiliares da Justiça) a própria linha traz o comando do
	// Projudi que liga o "+", por exemplo:
	//   new AjaxJspTag.HtmlContent("/projudi/processo/movimentacaoArquivoDocumento.do?actionType=listar",
	//     { sourceClass: "linkArquivos0", parameters: "idMovimentacao=1815986956,tipoLayout=1",
	//       doPost: true, target: "div0" });
	// O pedido é pela identificação da movimentação (não pela "página atual"
	// da lista): a extensão faz o mesmo pedido, sem quadro oculto. Nas
	// linhas trazidas das outras páginas esse comando está lá, mas não roda
	// (scripts copiados de outra página não são executados).
	function pedidoDiretoDaLinha(linha) {
		const scripts = [linha].concat(linhasDoGrupo(linha)).reduce(function (lista, tr) {
			return lista.concat(Array.from(tr.querySelectorAll("script")));
		}, []);
		for (const script of scripts) {
			const texto = script.textContent || "";
			if (!/AjaxJspTag\.HtmlContent/.test(texto) || !/sourceClass\s*:\s*["']linkArquivos/.test(texto)) continue;
			const url = /HtmlContent\(\s*["']([^"']+)["']/.exec(texto);
			if (!url) continue;
			const parametros = /parameters\s*:\s*["']([^"']*)["']/.exec(texto);
			const corpo = new URLSearchParams();
			(parametros ? parametros[1] : "").split(",").forEach(function (par) {
				const i = par.indexOf("=");
				if (i > 0) corpo.append(par.slice(0, i).trim(), par.slice(i + 1).trim());
			});
			const post = !/doPost\s*:\s*false/.test(texto);
			const absoluta = urlAbsoluta(url[1]);
			if (!absoluta) continue;
			if (post) return { url: absoluta, corpo: corpo };
			const u = new URL(absoluta);
			corpo.forEach(function (v, n) {
				u.searchParams.append(n, v);
			});
			return { url: u.href, corpo: null };
		}
		return null;
	}

	// Linhas auxiliares que seguem a linha principal (até a próxima juntada).
	function linhasDoGrupo(linha) {
		const lista = [];
		let prox = linha.nextElementSibling;
		while (prox && linhaAuxiliar(prox)) {
			lista.push(prox);
			prox = prox.nextElementSibling;
		}
		return lista;
	}

	// Poucos pedidos diretos ao mesmo tempo (o "Expandir Mov" pode pedir
	// dezenas de uma vez).
	const DIRETOS_SIMULTANEOS = 4;
	let diretosAtivos = 0;
	const diretosEsperando = [];
	function vezDoDireto() {
		if (diretosAtivos < DIRETOS_SIMULTANEOS) {
			diretosAtivos++;
			return Promise.resolve();
		}
		return new Promise(function (r) {
			diretosEsperando.push(r);
		});
	}
	function fimDoDireto() {
		const proximo = diretosEsperando.shift();
		if (proximo) proximo();
		else diretosAtivos--;
	}

	async function arquivosDiretos(pedido) {
		await vezDoDireto();
		try {
			const html = (await buscarTexto(pedido)).trim();
			// Página inteira (ex.: sessão expirada, tela de erro) não é a
			// lista de arquivos.
			if (!html || /<html[\s>]|<body[\s>]/i.test(html)) throw new Error("resposta inesperada do Projudi");
			return html;
		} finally {
			fimDoDireto();
		}
	}

	function pedirArquivos(item) {
		const direto = pedidoDiretoDaLinha(item.linha);
		if (direto) {
			arquivosDiretos(direto).then(item.concluir, function (e) {
				console.warn(TAG, "arquivos do + pelo pedido direto falharam; tentando pela página de origem:", e);
				pendentes.push(item);
				if (!trabalhando) processarPendentes();
			});
			return;
		}
		pendentes.push(item);
		if (!trabalhando) processarPendentes();
	}

	async function processarPendentes() {
		trabalhando = true;
		try {
			while (pendentes.length) {
				let pagina = paginaNoQuadro;
				if (!pendentes.some(function (it) { return origemDa(it.linha) === pagina; })) pagina = origemDa(pendentes[0].linha);
				const lote = [];
				for (let i = pendentes.length - 1; i >= 0; i--) {
					if (origemDa(pendentes[i].linha) === pagina) lote.unshift(pendentes.splice(i, 1)[0]);
				}
				await atenderLote(pagina, lote);
			}
		} finally {
			trabalhando = false;
		}
	}

	async function atenderLote(pagina, lote) {
		let doc = paginaNoQuadro === pagina && quadro && quadro.contentDocument;
		// Recarrega a página no quadro se ela não está lá, ou se algum desses
		// "+" já foi aberto nela (um segundo clique fecharia em vez de abrir).
		const recarregar = !doc || lote.some(function (it) {
			const l = linhaNoQuadro(doc, it.linha.getAttribute("data-pdp-jpu-mais"), it.linha.getAttribute("data-pdp-jpu-chave"));
			return !l || l.hasAttribute("data-pdp-jpu-aberto");
		});
		if (recarregar) {
			try {
				doc = await carregarNoQuadro(pagina);
				await esperar(300); // deixa o Projudi ligar os comandos da tela
			} catch (e) {
				lote.forEach(function (it) {
					it.falhar(e);
				});
				return;
			}
		}
		await Promise.all(
			lote.map(function (it) {
				return abrirNoQuadro(doc, pagina, it.linha).then(it.concluir, it.falhar);
			})
		);
	}

	function alternarMais(linha) {
		const numero = numeroDoMais(linha);
		const alvo = numero !== null ? conteinerDoMais(document, numero, linha) : null;
		const img = linha.querySelector(ICONE_MAIS);
		if (!alvo || !alvo.linha || !alvo.div) return;
		const aberto = alvo.linha.style.display !== "none" && alvo.linha.hasAttribute("data-pdp-jpu-mostrado");
		if (aberto) {
			alvo.linha.style.display = "none";
			alvo.linha.removeAttribute("data-pdp-jpu-mostrado");
			trocarIcone(img, false);
			return;
		}
		alvo.linha.style.display = "";
		alvo.linha.setAttribute("data-pdp-jpu-mostrado", "1");
		trocarIcone(img, true);
		const estado = alvo.div.getAttribute("data-pdp-jpu-arquivos");
		if (estado === "ok" || estado === "carregando") return; // já trazidos (ou a caminho)
		alvo.div.setAttribute("data-pdp-jpu-arquivos", "carregando");
		alvo.div.innerHTML = '<span style="color:#666;font-size:11px">Carregando os arquivos…</span>';
		pedirArquivos({
			linha: linha,
			concluir: function (html) {
				alvo.div.innerHTML = html;
				alvo.div.setAttribute("data-pdp-jpu-arquivos", "ok");
			},
			falhar: function (e) {
				console.warn(TAG, "arquivos do + não carregados:", e);
				alvo.div.removeAttribute("data-pdp-jpu-arquivos");
				alvo.div.innerHTML = '<span style="color:#a33;font-size:11px">Não foi possível trazer os arquivos: ' + String(e && e.message ? e.message : e).replace(/[<>&]/g, "") + ". Clique no + de novo para tentar outra vez.</span>";
			},
		});
	}

	function ativarArquivosDoMais(tabela) {
		if (maisAtivo) return;
		maisAtivo = true;
		// Na fase de captura, antes dos comandos do Projudi (que já não
		// trariam os arquivos certos).
		window.addEventListener(
			"click",
			function (ev) {
				const alvo = ev.target;
				if (!(alvo instanceof Element) || !tabela.contains(alvo)) return;
				const mais = alvo.closest('a[id^="linkArquivos"], a[class*="linkArquivos"], img[id^="icon"], img[onclick*="showDetail"]');
				if (!mais) return;
				const linha = mais.closest("tr");
				if (!linha || !linha.hasAttribute("data-pdp-jpu-origem")) return;
				ev.preventDefault();
				ev.stopImmediatePropagation();
				ev.stopPropagation();
				alternarMais(linha);
			},
			true
		);
	}

	// --- fluxo principal ---------------------------------------------------------

	// Decurso de prazo filtrado por Sequencial (decursoPrazoSequencial.js):
	// aquele filtro já percorre todas as páginas e troca as linhas da
	// tabela pelas do dígito escolhido — reunir as páginas aqui também
	// misturaria as duas coisas. Nessa carga, quem manda é o filtro.
	function filtroSequencialAtivo() {
		if (!TELA.decursoSequencial) return false;
		if (window.__pdpDecursoSequencialAtivo) return true;
		const campo = document.querySelector("#pdpSequencial");
		return !!(campo && /^[0-9]$/.test(campo.value || ""));
	}

	async function reunirPaginas() {
		if (filtroSequencialAtivo()) {
			console.log(TAG, "filtro por Sequencial ativo nesta carga — as páginas ficam por conta dele");
			return;
		}
		const tabela = tabelaResultados(document);
		const form = formulario(document);
		if (!tabela || !form || !linkProxima(document)) return; // uma página só: nada a fazer

		const tbody = tabela.tBodies[tabela.tBodies.length - 1];
		if (!tbody) return;

		const gruposIniciais = gruposDeLinhas(tabela);
		let total = gruposIniciais.length;
		const idsVistos = new Set();
		const assinaturas = new Set();
		function registrarPagina(grupos) {
			grupos.forEach(function (g) {
				if (g.id.indexOf("id:") === 0) idsVistos.add(g.id);
			});
			assinaturas.add(assinatura(grupos));
		}
		function assinatura(grupos) {
			return grupos.map(function (g) {
				return g.id;
			}).join("\n");
		}
		function paginaAtualDe(doc) {
			const b = navegacao(doc) && navegacao(doc).querySelector(".navRight b");
			return b ? b.textContent.trim() : null;
		}
		registrarPagina(gruposIniciais);
		gruposIniciais.forEach(function (g) {
			marcarOrigem(g.linhas, 1);
		});
		let proximoIndice = maiorIndice(tabela) + 1;
		let docAtual = document;
		let paginas = 1;
		let erro = null;

		while (true) {
			const pedido = pedidoDaProxima(docAtual, form);
			if (!pedido) {
				if (linkProxima(docAtual)) erro = 'não foi possível descobrir o endereço da "Próxima Página"';
				break;
			}
			if (paginas >= MAX_PAGINAS) {
				erro = "limite de " + MAX_PAGINAS + " páginas atingido";
				break;
			}
			mostrarAviso("Reunindo todas as páginas nesta tela… buscando a página " + (paginas + 1) + " (" + total + " " + TELA.itens + " até agora).", false);

			// A partir daqui o Projudi passa a "estar" em outra página da
			// lista: o "+" nativo deixaria de trazer os arquivos certos (ver
			// "Arquivos do +"), então ele passa a ser atendido pela extensão.
			pedidos[paginas + 1] = pedido;
			if (!pedidos[1]) pedidos[1] = pedidoDaPrimeira(pedido, form);
			ativarArquivosDoMais(tabela);

			let doc;
			try {
				doc = await buscarPagina(pedido);
			} catch (e) {
				console.error(TAG, "falha ao buscar a página", paginas + 1, e);
				erro = "falha ao carregar a página " + (paginas + 1);
				break;
			}
			const tabelaDoc = tabelaResultados(doc);
			if (!tabelaDoc) {
				console.warn(TAG, "a resposta da página", paginas + 1, "não trouxe a tabela de " + TELA.itens);
				erro = "a página " + (paginas + 1) + " veio sem a lista de " + TELA.itens + " (a sessão pode ter expirado)";
				break;
			}
			if (!tabelaResultados(document) || !tabela.isConnected) return; // a tela mudou enquanto buscávamos

			// Página repetida (a navegação não avançou): para, em vez de
			// repetir as mesmas linhas até o limite de páginas.
			const gruposDoc = gruposDeLinhas(tabelaDoc);
			const numeroAnterior = paginaAtualDe(docAtual);
			const numeroDoc = paginaAtualDe(doc);
			if (assinaturas.has(assinatura(gruposDoc)) || (numeroDoc && numeroDoc === numeroAnterior)) {
				console.warn(TAG, "a página", paginas + 1, "veio igual a uma já reunida (página", numeroDoc, ") — parando");
				erro = "o Projudi devolveu de novo uma página já reunida";
				break;
			}
			const novos = gruposDoc.filter(function (g) {
				return !idsVistos.has(g.id);
			});
			registrarPagina(gruposDoc);
			if (!novos.length) {
				console.warn(TAG, "a página", paginas + 1, "não trouxe nenhum registro novo — parando");
				erro = "a página " + (paginas + 1) + " só trouxe registros já reunidos";
				break;
			}
			const fragmento = document.createDocumentFragment();
			novos.forEach(function (grupo) {
				total++;
				const linhas = grupo.linhas.map(function (tr) {
					return document.importNode(tr, true);
				});
				marcarOrigem(linhas, paginas + 1);
				proximoIndice = renumerar(linhas, proximoIndice);
				linhas.forEach(function (tr) {
					tr.setAttribute("data-pdp-jpu-pagina", String(paginas + 1));
					fragmento.appendChild(tr);
				});
			});
			tbody.appendChild(fragmento);
			paginas++;
			console.log(TAG, "página", paginas, "reunida —", novos.length, "registro(s) novo(s); total:", total);
			docAtual = doc;
		}

		concluirNavegacao(total, paginas, erro);
	}

	reunirPaginas().catch(function (e) {
		console.error(TAG, e);
		mostrarAviso("Não foi possível reunir as páginas das " + TELA.itens + " nesta tela. Use a navegação do Projudi.", true);
	});
})();
