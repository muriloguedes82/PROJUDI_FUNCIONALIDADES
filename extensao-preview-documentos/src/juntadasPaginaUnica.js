// Projudi - Análise de Juntadas em uma única página
//
// A lista "Análise de Juntadas" (processo/analisarJuntada.do) é paginada no
// servidor (20 registros por página, navegação "Próxima Página" no
// #navigator). Esta funcionalidade reúne todas as páginas na própria tabela
// da primeira: ao abrir a lista (ou depois de um Filtrar/ordenação), as
// demais páginas são buscadas em segundo plano e as linhas delas são
// acrescentadas, em ordem, ao <tbody> da tabela de resultados — dentro do
// mesmo formulário, então "Análise Múltipla", "Analisar", "Dispensar" e a
// caixa de marcar todos alcançam as juntadas de todas as páginas.
//
// Como a "Próxima Página" é descoberta e repetida: mesma técnica de
// decursoPrazoSequencial.js (que já faz isso no Decurso de Prazo). O link
// usa uma URL "javascript:" que define campos do formulário de busca
// (pageNumber, sortColumn, sortOrder...) e o envia; lemos essas atribuições
// do href/onclick e repetimos o mesmo POST com fetch() (mesma sessão do
// usuário), uma página de cada vez, até não haver mais "Próxima Página".
//
// Linhas trazidas das outras páginas: cada página do Projudi numera do 0 os
// ids do "+" dos arquivos (linkArquivosN, iconN, rowN, divN), então os ids
// são renumerados para continuar a numeração da tabela (e as referências a
// eles no onclick="showDetail(...)"), para o "+" abrir a linha certa. As
// demais funções da extensão que enfeitam as linhas (⭐ em lote, 📍
// localizador, listas de tarefas, pré-visualização) já observam a tabela e
// tratam as linhas novas sozinhas.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpJuntadasPaginaUnica) return;
	window.__pdpJuntadasPaginaUnica = true;

	if (!/^\/projudi\/processo\/analisarJuntada\.do$/.test(location.pathname)) return;

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

	const TAG = "[Projudi Juntadas em uma página]";
	const MAX_PAGINAS = 100;
	const TIMEOUT_PAGINA_MS = 20000;
	const PREFIXOS_ID = ["linkArquivos", "icon", "row", "div"];
	// Campos que não fazem parte da busca: as caixas de marcar das linhas.
	const CAMPOS_IGNORADOS = new Set(["idJuntadas", "checker"]);

	function formulario(doc) {
		return doc.querySelector('form#analisarJuntadaForm, form[name="analisarJuntadaForm"]');
	}

	function tabelaResultados(doc) {
		const form = formulario(doc);
		return (form && form.querySelector("table.resultTable")) || doc.querySelector("table.resultTable");
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
			atribuicoes.forEach(function (a) {
				let nome = a.campo;
				if (a.porId && formDoc) {
					const campo = formDoc.querySelector("#" + CSS.escape(a.campo));
					if (campo && campo.name) nome = campo.name;
				}
				corpo.set(nome, a.valor);
			});
			const url = urlDoFormulario(formDoc) || urlDoFormulario(formAtual);
			if (url) return { url: url, corpo: corpo };
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
			let html;
			try {
				html = new TextDecoder((charset && charset[1]) || "windows-1252").decode(bytes);
			} catch (e) {
				html = new TextDecoder("windows-1252").decode(bytes);
			}
			return new DOMParser().parseFromString(html, "text/html");
		} finally {
			clearTimeout(tempo);
		}
	}

	// --- linhas -----------------------------------------------------------------

	// Linha auxiliar: a linha oculta (rowN, com o divN "extendedinfo") que o
	// "+" preenche com os arquivos da juntada da linha anterior.
	function linhaAuxiliar(tr) {
		return /^row\d+$/.test(tr.id || "") || (!!tr.querySelector(".extendedinfo") && !tr.querySelector('a[href*="processo.do"]'));
	}

	// Identifica a juntada: pela caixa idJuntadas e, quando a linha não tem
	// caixa (há juntadas que o Projudi não deixa marcar), pelo processo e
	// pelo texto das colunas.
	function chaveDaJuntada(tr) {
		const caixa = tr.querySelector('input[name="idJuntadas"]');
		if (caixa && caixa.value) return "id:" + caixa.value;
		// Sem o que a própria extensão acrescenta à linha (📍, ⭐...), que
		// ainda não existe nas linhas buscadas.
		const copia = tr.cloneNode(true);
		copia.querySelectorAll('[class^="pdp-"], [class*=" pdp-"]').forEach(function (el) {
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

	// Agrupa as linhas do <tbody>: cada juntada seguida das linhas
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
				atual = { id: chaveDaJuntada(tr), linhas: [tr] };
				grupos.push(atual);
			});
		});
		return grupos;
	}

	function maiorIndice(tabela) {
		let maior = -1;
		const regex = new RegExp("^(?:" + PREFIXOS_ID.join("|") + ")(\\d+)$");
		tabela.querySelectorAll("[id]").forEach(function (el) {
			const m = regex.exec(el.id);
			if (m) maior = Math.max(maior, Number(m[1]));
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

	function concluirNavegacao(totalJuntadas, paginas, erro) {
		const nav = navegacao(document);
		if (!nav) return;
		if (erro) {
			// Mantém a navegação do Projudi para o usuário seguir à mão.
			mostrarAviso(
				"Reunidas " + paginas + " página(s) nesta tela (" + totalJuntadas + " juntadas). Não foi possível trazer as páginas seguintes: " + erro + ". Use a navegação do Projudi para vê-las.",
				true
			);
			return;
		}
		const direita = nav.querySelector(".navRight");
		if (direita) direita.remove();
		const esquerda = nav.querySelector(".navLeft");
		const texto =
			"Todas as juntadas em uma única página: " + totalJuntadas + " registro(s)" + (paginas > 1 ? " (" + paginas + " páginas do Projudi reunidas)." : ".");
		if (esquerda) esquerda.textContent = texto;
		else mostrarAviso(texto, false);
		if (aviso) {
			aviso.remove();
			aviso = null;
		}
	}

	// --- fluxo principal ---------------------------------------------------------

	async function reunirPaginas() {
		const tabela = tabelaResultados(document);
		const form = formulario(document);
		if (!tabela || !form || !linkProxima(document)) return; // uma página só: nada a fazer

		const tbody = tabela.tBodies[tabela.tBodies.length - 1];
		if (!tbody) return;

		const vistos = new Set(gruposDeLinhas(tabela).map(function (g) {
			return g.id;
		}));
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
			mostrarAviso("Reunindo todas as páginas nesta tela… buscando a página " + (paginas + 1) + " (" + vistos.size + " juntadas até agora).", false);

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
				console.warn(TAG, "a resposta da página", paginas + 1, "não trouxe a tabela de juntadas");
				erro = "a página " + (paginas + 1) + " veio sem a lista de juntadas (a sessão pode ter expirado)";
				break;
			}
			if (!tabelaResultados(document) || !tabela.isConnected) return; // a tela mudou enquanto buscávamos

			const novos = gruposDeLinhas(tabelaDoc).filter(function (g) {
				return !vistos.has(g.id);
			});
			if (!novos.length) {
				// Página repetida: evita laço infinito se a navegação não avançar.
				console.warn(TAG, "a página", paginas + 1, "não trouxe nenhuma juntada nova — parando");
				break;
			}
			const fragmento = document.createDocumentFragment();
			novos.forEach(function (grupo) {
				vistos.add(grupo.id);
				const linhas = grupo.linhas.map(function (tr) {
					return document.importNode(tr, true);
				});
				proximoIndice = renumerar(linhas, proximoIndice);
				linhas.forEach(function (tr) {
					tr.setAttribute("data-pdp-jpu-pagina", String(paginas + 1));
					fragmento.appendChild(tr);
				});
			});
			tbody.appendChild(fragmento);
			paginas++;
			console.log(TAG, "página", paginas, "reunida —", novos.length, "juntada(s) nova(s); total:", vistos.size);
			docAtual = doc;
		}

		concluirNavegacao(vistos.size, paginas, erro);
	}

	reunirPaginas().catch(function (e) {
		console.error(TAG, e);
		mostrarAviso("Não foi possível reunir as páginas das juntadas nesta tela. Use a navegação do Projudi.", true);
	});
})();
