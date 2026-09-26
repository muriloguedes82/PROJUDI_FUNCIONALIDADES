// Projudi - Informações processuais na ordenação BNMP do mandado de prisão
//
// Ao abrir uma ordenação do BNMP (`cumprimentoCartorio.do`, formulário com
// `actionType=cumprirBnmp`) de uma GUIA de recolhimento/execução, o próprio
// Projudi monta, no servidor, as seções "Dados da Peça", "Dados do Processo
// Criminal", "Cadastro de Sentença", "Tipificação penal" e "Cadastro das
// Prisões", que ajudam a preencher a peça no BNMP 3. Na ordenação de um
// MANDADO DE PRISÃO essas seções não vêm.
//
// Este recurso monta seções equivalentes na ordenação do mandado de prisão,
// buscando os dados em segundo plano (`fetch()`, sem iframe e sem navegar a
// aba), POR PARTE (cada parte de "Referente a(s) parte(s)"):
// 1. página do processo (link "Processo" da ordenação) e, se preciso, a aba
//    "Informações Adicionais" (POST com `selectedIcon=tabDadosAdicionais`,
//    mesma técnica de cpfPartesCumprimentos.js): "Classe Processual", "Data
//    da Infração" e os links abaixo;
// 2. "Denunciado(s)/Querelado(s)" (`denunciado.do` da parte): Data de
//    Oferecimento, Data de Recebimento e Imputações;
// 3. "Sentenciados" (`parteSentenciada.do` da parte, "Primeiro Grau" e
//    "Tribunal de Justiça"): datas da sentença e do acórdão, recurso, regime,
//    tempo de pena, multa e trânsito em julgado (relativo à sentença) — a
//    anotação do Tribunal de Justiça prevalece; a do Primeiro Grau completa o
//    que faltar;
// 4. "Infrações/Penas" (`parteProcessoPena.do`, filtrado pela parte): a
//    tipificação vem da PRIMEIRA origem que existir, nesta ordem — Sentença
//    Judicial Tribunal de Justiça, Sentença Judicial Primeiro Grau,
//    Ministério Público; as demais são desprezadas (Delegacia nunca é usada);
//    cada infração escolhida tem o detalhe lido (`parteProcessoPena.do?
//    actionType=visualizar&numeroProcesso=<id do processo>&id=<id da
//    infração>&tipoOrigemPena=<origem>`): Data do Delito, Realização do Crime,
//    Violência Doméstica, Hediondo, Reincidente Comum/Específico e as frações
//    para progressão de regime e livramento condicional;
// 5. aba "Prisões" da tela da parte (`parteProcesso.do`, link do nome da
//    parte na ordenação; na falta dele, o link "Prisões:" da aba "Informações
//    Adicionais"): tabela de prisões e o "Local da Prisão" de "Dados da Peça"
//    (local da prisão ainda sem soltura/conversão; se não houver, nenhum).
//
// Estrutura real das telas confirmada a partir de .mhtml salvos do Projudi
// (TJPR):
// - ordenação: <form id="cumprimentoCartorioForm" action="...
//   cumprimentoCartorio.do?actionType=cumprirBnmp&id=...">, 1ª <table
//   class="form"> com as linhas <td class="label">Tipo de Documento:</td>
//   <td>Mandado de Prisão</td> e "Referente a(s) parte(s):" (<ul><li><a
//   href="parteProcesso.do?..."><b>NOME</b></a> ... <span
//   id="infoParteBnmp27965566">), com o link `processo.do?_tj=...`. Na guia,
//   as seções são linhas <tr><td colspan="100%"><h3><a><img
//   src=".../iMinus.gif"></a>Dados da Peça</h3></td></tr> + <tr id="row...">
//   <td colspan="100%"><table class="form">...</table></td></tr> dessa mesma
//   tabela — este recurso usa a mesma estrutura, para herdar o visual.
// - aba "Informações Adicionais": <td class="labelRadio"><label>Data da
//   Infração:</label></td><td>21/07/2018</td>; <td class="label"><label>
//   Infrações/Penas:</label></td><td><a href="parteProcessoPena.do?...">;
//   "Denunciado(s)/Querelado(s):" com um <li><a href="denunciado.do?...">
//   NOME - Recebida em 22/11/2018</a></li> por denunciado; "Sentenciados:"
//   com <li>Sentenciado: NOME</li> seguido de um <li> com <li>Primeiro Grau:
//   Com <a href="parteSentenciada.do?...">1 anotação de sentença ativa</a>
//   </li> e <li>Tribunal de Justiça: Com <a ...>...</a></li>; "Prisões:" com
//   <a href="parteProcessoCadastroAcolhimento.do?...">. "Classe Processual:"
//   fica na tabela #informacoesProcessuais (acima das abas).
// - `parteProcessoPena.do`: <form id="parteProcessoPenaForm" action="...
//   parteProcessoPena.do?actionType=listar"> com <select
//   name="idFiltroParteProcesso"> (value = id da parte, o mesmo do
//   `infoParteBnmp<ID>` da ordenação) e <select name="tipoOrigemPena">
//   (2 = Ministério Público, 3 = Sentença Judicial); <h3>Infrações/Penas -
//   Data da Infração: 21/07/2018</h3>; table.resultTable com colunas "Dt.
//   Cadastro", "Parte do Processo", "Origem" ("Sentença Judicial
//   &nbsp;Tribunal de Justiça<br>CONDENATÓRIA"), "Pena Cominada", "Complemento"
//   (<a title="Consumado">CON</a>...) e "Prescrição"; paginada de 20 em 20
//   (<div id="navigator">... "36 registro(s) encontrado(s), exibindo de 1 até
//   20").
// - `denunciado.do`: <td class="label"><label>Data de Oferecimento:</label>
//   </td><td>01/10/2018</td>, idem "Data de Recebimento:", e "Imputações:"
//   com table.resultTable (Lei, Pena Cominada, Complemento, Data de
//   Prescrição).
// - `parteSentenciada.do`: <h3>Anotação de Sentença Primeiro Grau</h3> ou
//   <h3>Cadastro de Anotação de Acórdão Tribunal de Justiça</h3>; linhas
//   <td class="label">Regime Inicial:</td>, "Tempo de Pena:", "Dias-Multa:",
//   "Proporção S.M.:", "Tipo de Sentença:", "Observação:", "Data de
//   Publicação:", "Data do Recebimento:", "Nº do Acórdão:", "Órgão
//   Julgador:", "Recorrentes" (<ul><li>); na sentença de 1º grau, a tabela
//   "Sentença:" (Dt. Retorno, Tipo de Sentença, ...); e <fieldset
//   id="quadroPendencias"><legend>Trânsito em Julgado (relativo à sentença):
//   14/04/2026</legend> com as tabelas "Autor:", "Assistente de Acusação:",
//   "Réu:" e "Defensor do Réu:" (nome | data ou "Não Informado").
// - `parteProcesso.do` (tela da parte): <h3>Área da Parte e Outros NOME</h3>;
//   o conteúdo de todas as abas vem na página (só a atual visível); a aba
//   "Prisões" (<div id="tabprefix2">) tem uma table.resultTable com <th>
//   "Data da Prisão", "Guia de Prisão", "Motivo da Prisão", "Fiança", "Local
//   da Prisão", "Soltura/ Conversão", "Guia de Soltura", "Motivo da
//   Soltura", "Período de Prisão" e "Arquivo", e um <tfoot> "Total Geral:".
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpBnmpMandadoPrisao) return;
	window.__pdpBnmpMandadoPrisao = true;

	const TAG = "[Projudi BNMP mandado de prisão]";
	const ROW_ATTR = "data-pdp-bnmp-mandado";
	const SEM_INFO = "Sem informação";
	const ORIGEM_MP = "2";
	const ORIGEM_SENTENCA = "3";

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	function valor(text) {
		const value = collapse(text);
		if (!value || /^(nao informad[oa]|sem informacao|-+)$/.test(normalize(value))) return "";
		return value;
	}

	function projudiURL(value, base) {
		const url = new URL(value, base || location.href);
		if (url.origin !== location.origin || !url.pathname.startsWith("/projudi/")) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	async function readPage(url, options) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 25000);
		try {
			const response = await fetch(url, Object.assign({}, options, { credentials: "same-origin", signal: controller.signal }));
			if (!response.ok) throw new Error("O Projudi não respondeu (" + response.status + ").");
			projudiURL(response.url);
			const bytes = await response.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			const doc = new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), "text/html");
			return { doc: doc, url: response.url };
		} finally {
			clearTimeout(timer);
		}
	}

	function serializar(form) {
		const body = new URLSearchParams();
		for (const el of form.elements) {
			if (!el.name || el.disabled) continue;
			const type = (el.type || "").toLowerCase();
			if (type === "file" || type === "submit" || type === "button" || type === "reset" || type === "image") continue;
			if ((type === "checkbox" || type === "radio") && !el.checked) continue;
			if (el.tagName === "SELECT") {
				for (const opt of el.options) if (opt.selected) body.append(el.name, opt.value);
				continue;
			}
			body.append(el.name, el.value);
		}
		return body;
	}

	// ---------------------------------------------------------------------
	// Leitura genérica de telas "label: valor"
	// ---------------------------------------------------------------------

	function celulasRotulo(root) {
		return Array.prototype.filter.call(root.querySelectorAll("td"), function (td) {
			return td.classList.contains("label") || td.classList.contains("labelRadio");
		});
	}

	// Célula de valor ao lado do primeiro rótulo que casar com `regex`
	// (testado no texto normalizado, sem o ":" final).
	function celulaDoCampo(root, regex) {
		for (const td of celulasRotulo(root)) {
			const rotulo = normalize(td.textContent).replace(/\s*:\s*$/, "");
			if (!regex.test(rotulo)) continue;
			let next = td.nextElementSibling;
			while (next && next.tagName !== "TD") next = next.nextElementSibling;
			if (next) return next;
		}
		return null;
	}

	// Texto de um nó sem o conteúdo de <script>/<style> — algumas células do
	// Projudi trazem um script embutido (ex.: callout da "Classe Processual"),
	// cujo código apareceria no textContent.
	function textoLimpo(node) {
		if (!node) return "";
		const clone = node.cloneNode(true);
		for (const el of clone.querySelectorAll("script, style, noscript")) el.remove();
		return clone.textContent;
	}

	function campo(root, regex) {
		const td = celulaDoCampo(root, regex);
		return td ? valor(textoLimpo(td)) : "";
	}

	// Resumo de uma página devolvida pelo Projudi, para os avisos quando a
	// tela não é a esperada: endereço, título (<h3>/<title>) e mensagem de erro.
	function descreverPagina(doc, url) {
		let caminho = "";
		try {
			const u = new URL(url);
			caminho = u.pathname.replace(/^\/projudi\//, "") + (u.searchParams.get("actionType") ? "?actionType=" + u.searchParams.get("actionType") : "");
		} catch (err) {
			caminho = String(url || "");
		}
		const h3 = doc.querySelector("#content h3, h3");
		const titulo = collapse(textoLimpo(h3)) || collapse(doc.title);
		const erro = doc.querySelector("#errorMessages, .errorMessages, .error, #warningMessages");
		const partes = [caminho, titulo ? "título \"" + titulo.slice(0, 80) + "\"" : ""];
		if (erro) partes.push("mensagem \"" + collapse(textoLimpo(erro)).slice(0, 160) + "\"");
		return partes.filter(Boolean).join(", ");
	}

	function primeiraData(text) {
		const m = /\d{2}\/\d{2}\/\d{4}/.exec(text || "");
		return m ? m[0] : "";
	}

	// Mesmo critério de cpfPartesCumprimentos.js: nome igual (sem acentos/
	// caixa) ou um começando pelo outro.
	function mesmoNome(a, b) {
		const x = normalize(a);
		const y = normalize(b);
		if (!x || !y) return false;
		return x === y || x.startsWith(y) || y.startsWith(x);
	}

	// Títulos do "Complemento" (<a title="Consumado">CON</a>...).
	function complementos(td) {
		if (!td) return "";
		return Array.prototype.map
			.call(td.querySelectorAll("[title]"), function (el) { return collapse(el.getAttribute("title")); })
			.filter(Boolean)
			.join("; ");
	}

	// Pena de uma imputação ("..., Reclusão: 6 anos e 3 meses") em anos/
	// meses/dias; faixas de pena cominada ("5 a 15 anos") não são pena imposta.
	function penaEmPartes(text) {
		const partes = { anos: "", meses: "", dias: "" };
		const trecho = String(text || "").split(":").pop();
		if (/\d+\s*a\s*\d+/.test(trecho)) return partes;
		const anos = /(\d+)\s*anos?/i.exec(trecho);
		const meses = /(\d+)\s*m[eê]s(es)?/i.exec(trecho);
		const dias = /(\d+)\s*dias?/i.exec(trecho);
		if (anos) partes.anos = anos[1];
		if (meses) partes.meses = meses[1];
		if (dias) partes.dias = dias[1];
		return partes;
	}

	// ---------------------------------------------------------------------
	// Ordenação do mandado de prisão (página atual)
	// ---------------------------------------------------------------------

	function lerOrdenacao() {
		const form = document.getElementById("cumprimentoCartorioForm");
		if (!form || !/actionType=cumprirBnmp/i.test(form.getAttribute("action") || "")) return null;
		const table = form.querySelector("table.form");
		if (!table) return null;
		if (!/^mandado de prisao/.test(normalize(campo(table, /^tipo de documento$/)))) return null;
		const jaTemSecoes = Array.prototype.some.call(form.querySelectorAll("h3"), function (h3) {
			return normalize(h3.textContent) === "dados da peca" && !h3.closest("[" + ROW_ATTR + "]");
		});
		if (jaTemSecoes) return null;

		const link = table.querySelector('a[href*="/processo.do"]');
		if (!link) return null;
		const numero = collapse((link.querySelector("em") || link).textContent);

		const partes = [];
		const tdPartes = celulaDoCampo(table, /^referente a\(?s?\)? parte\(?s?\)?$/);
		if (tdPartes) {
			for (const li of tdPartes.querySelectorAll("li")) {
				const a = li.querySelector('a[href*="parteProcesso.do"]');
				const nome = collapse(((a && (a.querySelector("b") || a)) || li).textContent);
				if (!nome) continue;
				const span = li.querySelector('[id^="infoParteBnmp"]');
				const id = span ? span.id.replace(/^infoParteBnmp/, "") : "";
				partes.push({ nome: nome, id: /^\d+$/.test(id) ? id : "", href: a ? a.href : "" });
			}
		}
		if (!partes.length) return null;

		return {
			table: table,
			tipoDocumento: campo(table, /^tipo de documento$/),
			processoHref: link.href,
			numero: numero,
			partes: partes,
		};
	}

	// ---------------------------------------------------------------------
	// Aba "Informações Adicionais"
	// ---------------------------------------------------------------------

	function temAbaInformacoesAdicionais(doc) {
		return !!(celulaDoCampo(doc, /^infracoes\/penas$/) || celulaDoCampo(doc, /^denunciado\(s\)\/querelado\(s\)$/));
	}

	function urlAba(doc, form, base, tabId) {
		const tab = Array.prototype.find.call(doc.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && new RegExp("['\"]" + tabId + "['\"]").test(onclick);
		});
		const match = /setTab\(\s*['"]([^'"]+)['"]/.exec(tab ? tab.getAttribute("onclick") : "");
		return projudiURL(new URL(match ? match[1] : form.getAttribute("action") || base, base).href);
	}

	async function lerInformacoesAdicionais(processoHref) {
		const pagina = await readPage(projudiURL(processoHref).href, { method: "GET" });
		if (temAbaInformacoesAdicionais(pagina.doc)) return pagina;

		const form = pagina.doc.getElementById("processoForm");
		const idField = form && form.querySelector('[name="id"]');
		const id = idField && /^\d+$/.test(idField.value) ? idField.value : null;
		if (!form || !id) throw new Error("a página do processo não pôde ser lida");
		const body = serializar(form);
		body.set("selectedIcon", "tabDadosAdicionais");
		body.set("id", id);
		const aba = await readPage(urlAba(pagina.doc, form, pagina.url, "tabDadosAdicionais").href, { method: "POST", body: body });
		if (!temAbaInformacoesAdicionais(aba.doc)) throw new Error('a resposta não contém a aba "Informações Adicionais"');
		return aba;
	}

	function linkDoCampo(doc, base, regex) {
		const td = celulaDoCampo(doc, regex);
		const a = td && td.querySelector("a[href]");
		return a ? { href: new URL(a.getAttribute("href"), base).href, texto: collapse(a.textContent) } : null;
	}

	function linkDenunciado(doc, base, nome) {
		const td = celulaDoCampo(doc, /^denunciado\(s\)\/querelado\(s\)$/);
		if (!td) return null;
		for (const a of td.querySelectorAll('a[href*="denunciado.do"]')) {
			const texto = collapse(a.textContent).replace(/\s+-\s+(recebida|oferecida|rejeitada).*$/i, "");
			if (mesmoNome(texto, nome)) return new URL(a.getAttribute("href"), base).href;
		}
		return null;
	}

	// { primeiroGrau, tribunal } — hrefs de `parteSentenciada.do` da parte.
	function linksSentenca(doc, base, nome) {
		const resultado = { primeiroGrau: null, tribunal: null };
		const td = celulaDoCampo(doc, /^sentenciados$/);
		const ul = td && td.querySelector("ul");
		if (!ul) return resultado;
		let atual = null;
		for (const li of ul.children) {
			if (li.tagName !== "LI") continue;
			const texto = collapse(li.textContent);
			const m = /^sentenciado:\s*(.+)$/i.exec(texto);
			if (m && !li.querySelector("li")) {
				atual = m[1];
				continue;
			}
			if (!atual || !mesmoNome(atual, nome)) continue;
			for (const item of li.querySelectorAll("li")) {
				const a = item.querySelector('a[href*="parteSentenciada.do"]');
				if (!a || !/anotac/.test(normalize(a.textContent))) continue;
				const instancia = normalize(item.textContent);
				const href = new URL(a.getAttribute("href"), base).href;
				if (/^primeiro grau/.test(instancia)) resultado.primeiroGrau = href;
				else if (/^tribunal de justica/.test(instancia)) resultado.tribunal = href;
			}
		}
		return resultado;
	}

	// ---------------------------------------------------------------------
	// Denunciado/Querelado
	// ---------------------------------------------------------------------

	function tabelaDoCampo(doc, regex) {
		const td = celulaDoCampo(doc, regex);
		return td ? td.querySelector("table.resultTable") : null;
	}

	function linhasComDados(table) {
		if (!table) return [];
		return Array.prototype.filter.call(table.querySelectorAll("tr"), function (tr) {
			return !tr.querySelector("th") && tr.cells.length > 1;
		});
	}

	async function lerDenunciado(href) {
		const { doc } = await readPage(projudiURL(href).href, { method: "GET" });
		const imputacoes = linhasComDados(tabelaDoCampo(doc, /^imputacoes$/)).map(function (tr) {
			return {
				lei: collapse(textoLimpo(tr.cells[0])),
				pena: collapse(textoLimpo(tr.cells[1])),
				tipo: complementos(tr.cells[2]),
			};
		});
		return {
			oferecimento: campo(doc, /^data de oferecimento$/),
			recebimento: campo(doc, /^data de recebimento$/),
			imputacoes: imputacoes,
		};
	}

	// ---------------------------------------------------------------------
	// Anotação de sentença (Primeiro Grau / Tribunal de Justiça)
	// ---------------------------------------------------------------------

	function ehDetalheDeSentenca(doc) {
		return !!(doc.getElementById("tableImputacoes") || celulaDoCampo(doc, /^tempo de pena$/));
	}

	// Data da tabela do quadro de trânsito (`rotulo`: "autor", "reu"...),
	// preferindo a linha cujo nome casar com `preferir`.
	function dataTransito(quadro, rotulo, preferir) {
		const table = tabelaDoCampo(quadro, rotulo);
		const linhas = linhasComDados(table);
		if (!linhas.length) return "";
		const escolhida =
			linhas.find(function (tr) { return preferir && preferir.test(normalize(tr.cells[0].textContent)); }) || linhas[0];
		return primeiraData(escolhida.cells[1].textContent);
	}

	async function lerSentenca(href, nome) {
		let pagina = await readPage(projudiURL(href).href, { method: "GET" });
		if (!ehDetalheDeSentenca(pagina.doc)) {
			// Mais de uma anotação: a lista traz links "visualizar"; usa a ativa.
			const links = Array.prototype.filter.call(pagina.doc.querySelectorAll('a[href*="parteSentenciada.do"]'), function (a) {
				return /actionType=visualizar/.test(a.getAttribute("href")) && /ativa/.test(normalize(a.textContent));
			});
			if (!links.length) throw new Error("anotação de sentença não encontrada (resposta: " + descreverPagina(pagina.doc, pagina.url) + ")");
			pagina = await readPage(projudiURL(links[0].getAttribute("href"), pagina.url).href, { method: "GET" });
			if (!ehDetalheDeSentenca(pagina.doc)) throw new Error("anotação de sentença não pôde ser lida (resposta: " + descreverPagina(pagina.doc, pagina.url) + ")");
		}
		const doc = pagina.doc;

		let dataSentenca = "";
		const tabelaSentenca = tabelaDoCampo(doc, /^sentenca$/);
		const linhaSentenca = linhasComDados(tabelaSentenca)[0];
		if (linhaSentenca) dataSentenca = primeiraData(linhaSentenca.cells[0].textContent);

		const tdRecorrentes = celulaDoCampo(doc, /^recorrentes$/);
		const recorrentes = tdRecorrentes
			? Array.prototype.map.call(tdRecorrentes.querySelectorAll("li"), function (li) { return collapse(li.textContent); }).filter(Boolean)
			: [];

		const transito = { sentenca: "", acusacao: "", assistente: "", reu: "", defesa: "" };
		const quadro = doc.getElementById("quadroPendencias");
		if (quadro) {
			const legend = quadro.querySelector("legend");
			transito.sentenca = primeiraData(legend ? legend.textContent : "");
			const nomeRe = new RegExp("^" + normalize(nome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
			transito.acusacao = dataTransito(quadro, /^autor$/, /ministerio publico/);
			transito.assistente = dataTransito(quadro, /^assistente de acusacao$/, null);
			transito.reu = dataTransito(quadro, /^reu$/, nomeRe);
			transito.defesa = dataTransito(quadro, /^defensor do reu$/, nomeRe);
		}

		return {
			tipoSentenca: campo(doc, /^tipo de sentenca$/),
			dataSentenca: dataSentenca || primeiraData(campo(doc, /^data de cadastro$/)),
			dataPublicacao: primeiraData(campo(doc, /^data de publicacao$/)),
			dataRecebimento: primeiraData(campo(doc, /^data do recebimento$/)),
			numeroAcordao: campo(doc, /^n. do acordao$/),
			orgaoJulgador: campo(doc, /^orgao julgador$/),
			recorrentes: recorrentes,
			regime: campo(doc, /^regime inicial$/),
			tempoPena: campo(doc, /^tempo de pena$/),
			diasMulta: campo(doc, /^dias-multa$/),
			proporcaoSM: campo(doc, /^proporcao s\.m\.$/).replace(/\s*\/\s*/g, "/"),
			observacao: campo(doc, /^observacao$/),
			transito: transito,
		};
	}

	// ---------------------------------------------------------------------
	// Infrações/Penas (tipificação)
	// ---------------------------------------------------------------------

	function lerListaInfracoes(doc) {
		const h3 = doc.querySelector("#parteProcessoPenaForm h3");
		const dataInfracao = primeiraData(h3 ? h3.textContent : "");
		const nav = doc.querySelector("#navigator .navLeft");
		const table = Array.prototype.find.call(doc.querySelectorAll("table.resultTable"), function (t) {
			return Array.prototype.some.call(t.querySelectorAll("thead th"), function (th) { return normalize(th.textContent) === "origem"; });
		});
		const linhas = [];
		if (table) {
			const ths = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return normalize(th.textContent); });
			const col = function (nome) { return ths.indexOf(nome); };
			for (const tr of table.tBodies.length ? table.tBodies[0].rows : []) {
				if (tr.cells.length < ths.length || tr.style.display === "none") continue;
				const origemTd = tr.cells[col("origem")];
				// A linha oculta seguinte (id="trLinhaDoTempo<ID>_<n>") traz o id
				// da infração/pena, usado para abrir o detalhe dela.
				const seguinte = tr.nextElementSibling;
				const idMatch = seguinte && /^trLinhaDoTempo(\d+)_/.exec(seguinte.id || "");
				linhas.push({
					id: idMatch ? idMatch[1] : "",
					parte: collapse(textoLimpo(tr.cells[col("parte do processo")])),
					origem: normalize(origemTd.textContent),
					origemTexto: collapse(textoLimpo(origemTd)),
					artigo: collapse(textoLimpo(tr.cells[col("pena cominada")])),
					tipo: complementos(tr.cells[col("complemento")]),
				});
			}
		}
		return { dataInfracao: dataInfracao, navegacao: nav ? collapse(nav.textContent) : "", linhas: linhas };
	}

	// Detalhe de uma infração/pena (`parteProcessoPena.do?actionType=
	// visualizar`): Data do Delito, realização, frações e reincidência. Só é
	// aceito se a tela for de fato da parte esperada.
	async function lerDetalheInfracao(action, processoId, linha, origem, parte) {
		const url = new URL(action);
		url.search = "";
		url.searchParams.set("actionType", "visualizar");
		url.searchParams.set("numeroProcesso", processoId);
		url.searchParams.set("id", linha.id);
		url.searchParams.set("tipoOrigemPena", origem);
		const { doc } = await readPage(projudiURL(url.href).href, { method: "GET" });
		const form = doc.getElementById("parteProcessoPenaForm");
		const h3 = form && form.querySelector("h3");
		if (!h3 || normalize(h3.textContent) !== "infracao/pena") throw new Error("detalhe da infração não reconhecido");
		if (!mesmoNome(campo(form, /^parte do processo$/), parte.nome)) throw new Error("detalhe da infração de outra parte");
		const sim = function (regex) { return /^sim/.test(normalize(campo(form, regex))); };
		const tipo = [campo(form, /^realizacao do crime$/)];
		if (sim(/^violencia domestica$/)) tipo.push("Violência Doméstica");
		if (sim(/^hediondo$/)) tipo.push("Hediondo");
		if (sim(/^com violencia ou grave ameaca$/)) tipo.push("Com violência ou grave ameaça");
		if (sim(/^resultado morte$/)) tipo.push("Resultado morte");
		const complemento = campo(form, /^complemento$/);
		if (complemento) tipo.push(complemento);
		const reincidente = [];
		if (sim(/^reincidente comum$/)) reincidente.push("Comum");
		if (sim(/^reincidente especifico$/)) reincidente.push("Específico");
		return {
			dataDelito: primeiraData(campo(form, /^data do delito$/)),
			tipo: tipo.filter(Boolean).join("; "),
			fracaoProgressao: campo(form, /^fracao para progressao de regime$/),
			fracaoLivramento: campo(form, /^fracao para livramento condicional$/),
			reincidente: reincidente.join(" e "),
			pena: campo(form, /^pena cominada$/),
		};
	}

	async function lerInfracoes(href, parte, processoId) {
		const inicial = await readPage(projudiURL(href).href, { method: "GET" });
		const form = inicial.doc.getElementById("parteProcessoPenaForm");
		if (!form) throw new Error("a tela de Infrações/Penas não pôde ser lida (resposta: " + descreverPagina(inicial.doc, inicial.url) + ")");
		const select = form.querySelector('select[name="idFiltroParteProcesso"]');
		let idParte = parte.id;
		if (select && !Array.prototype.some.call(select.options, function (o) { return o.value === idParte; })) {
			const opt = Array.prototype.find.call(select.options, function (o) { return o.value && mesmoNome(o.textContent, parte.nome); });
			idParte = opt ? opt.value : "";
		}
		const action = projudiURL(form.getAttribute("action") || inicial.url, inicial.url).href;

		async function pesquisar(origem) {
			if (!idParte) {
				// Sem o id da parte: filtra a lista inicial (todas as partes) pelo nome.
				const lista = lerListaInfracoes(inicial.doc);
				lista.linhas = lista.linhas.filter(function (l) { return mesmoNome(l.parte, parte.nome); });
				return lista;
			}
			const body = new URLSearchParams();
			body.set("idFiltroParteProcesso", idParte);
			body.set("tipoOrigemPena", origem);
			const resp = await readPage(action, { method: "POST", body: body });
			const lista = lerListaInfracoes(resp.doc);
			lista.resposta = descreverPagina(resp.doc, resp.url) + ", " + lista.linhas.length + " linha(s)";
			lista.linhas = lista.linhas.filter(function (l) { return !l.parte || mesmoNome(l.parte, parte.nome); });
			return lista;
		}

		const prioridades = [
			{ origem: ORIGEM_SENTENCA, teste: /^sentenca judicial.*tribunal de justica/, rotulo: "Sentença Judicial – Tribunal de Justiça" },
			{ origem: ORIGEM_SENTENCA, teste: /^sentenca judicial.*primeiro grau/, rotulo: "Sentença Judicial – Primeiro Grau" },
			{ origem: ORIGEM_MP, teste: /^ministerio publico/, rotulo: "Ministério Público" },
		];
		const listaInicial = lerListaInfracoes(inicial.doc);
		const inicialDaParte = {
			dataInfracao: listaInicial.dataInfracao,
			navegacao: listaInicial.navegacao,
			linhas: listaInicial.linhas.filter(function (l) { return mesmoNome(l.parte, parte.nome); }),
		};
		let dataInfracao = listaInicial.dataInfracao;

		async function escolher(fontes) {
			for (const p of prioridades) {
				const lista = await fontes(p.origem);
				dataInfracao = dataInfracao || lista.dataInfracao;
				const linhas = lista.linhas.filter(function (l) { return p.teste.test(l.origem); });
				if (linhas.length) return { p: p, lista: lista, linhas: linhas };
			}
			return null;
		}

		// 1º: pesquisa filtrada (parte + origem), como o botão "Pesquisar"; se
		// nada vier, a lista inicial (todas as partes, 1ª página) pelo nome.
		const cache = {};
		let escolha = await escolher(async function (origem) {
			if (!cache[origem]) cache[origem] = await pesquisar(origem);
			return cache[origem];
		});
		if (!escolha) escolha = await escolher(async function () { return inicialDaParte; });

		if (!escolha) {
			const respostas = Object.keys(cache).map(function (o) { return "origem " + o + ": " + (cache[o].resposta || cache[o].linhas.length + " linha(s)"); });
			return {
				origem: "",
				linhas: [],
				dataInfracao: dataInfracao,
				navegacao: "",
				diagnostico: "lista inicial: " + descreverPagina(inicial.doc, inicial.url) + ", " + listaInicial.linhas.length + " linha(s); " + respostas.join("; "),
			};
		}

		if (processoId) {
			for (const linha of escolha.linhas) {
				if (!linha.id) continue;
				try {
					linha.detalhe = await lerDetalheInfracao(action, processoId, linha, escolha.p.origem, parte);
				} catch (err) {
					console.warn(TAG, "detalhe da infração " + linha.id + ":", err);
				}
			}
		}
		return { origem: escolha.p.rotulo, linhas: escolha.linhas, dataInfracao: dataInfracao, navegacao: escolha.lista.navegacao };
	}

	// ---------------------------------------------------------------------
	// Prisões (aba "Prisões" da tela da parte)
	// ---------------------------------------------------------------------

	function tabelaDePrisoes(doc) {
		return Array.prototype.find.call(doc.querySelectorAll("table.resultTable"), function (t) {
			return Array.prototype.some.call(t.querySelectorAll("th"), function (th) { return normalize(th.textContent) === "data da prisao"; });
		});
	}

	function nomeDaTelaDaParte(doc) {
		const h3 = Array.prototype.find.call(doc.querySelectorAll("h3"), function (h) { return /^area da parte/.test(normalize(h.textContent)); });
		return h3 ? collapse(h3.textContent).replace(/^.*?parte e outros\s*/i, "") : "";
	}

	function lerTabelaPrisoes(table) {
		const ths = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return normalize(th.textContent); });
		const col = function (regex) { return ths.findIndex(function (t) { return regex.test(t); }); };
		const c = {
			data: col(/^data da prisao/),
			motivo: col(/^motivo da prisao/),
			local: col(/^local da prisao/),
			soltura: col(/^soltura/),
			motivoSoltura: col(/^motivo da soltura/),
			periodo: col(/^periodo/),
		};
		const texto = function (tr, i) { return i >= 0 && tr.cells[i] ? collapse(textoLimpo(tr.cells[i])) : ""; };
		const linhas = [];
		for (const tbody of table.tBodies) {
			for (const tr of tbody.rows) {
				if (tr.querySelector("th") || tr.cells.length < ths.length - 1) continue;
				const data = texto(tr, c.data);
				if (!primeiraData(data)) continue;
				linhas.push({
					data: data,
					motivo: texto(tr, c.motivo),
					local: texto(tr, c.local),
					soltura: texto(tr, c.soltura),
					motivoSoltura: texto(tr, c.motivoSoltura),
					periodo: texto(tr, c.periodo),
				});
			}
		}
		const foot = table.tFoot ? Array.prototype.map.call(table.tFoot.querySelectorAll("th"), function (th) { return collapse(th.textContent); }).filter(Boolean) : [];
		return { linhas: linhas, total: foot.length > 1 ? foot[foot.length - 1] : "" };
	}

	async function lerPrisoes(parte, linkProcesso) {
		const candidatos = [parte.href, linkProcesso && linkProcesso.href].filter(Boolean);
		let ultimoErro = null;
		for (const href of candidatos) {
			try {
				const { doc } = await readPage(projudiURL(href).href, { method: "GET" });
				const nomeTela = nomeDaTelaDaParte(doc);
				if (nomeTela && !mesmoNome(nomeTela, parte.nome)) continue;
				const table = tabelaDePrisoes(doc);
				if (table) return lerTabelaPrisoes(table);
			} catch (err) {
				ultimoErro = err;
			}
		}
		if (ultimoErro) throw ultimoErro;
		throw new Error("a aba Prisões da parte não foi encontrada");
	}

	// ---------------------------------------------------------------------
	// Busca de tudo, por parte
	// ---------------------------------------------------------------------

	function erroTexto(err) {
		return err && err.message ? err.message : String(err);
	}

	async function capturar(promise) {
		try {
			return { ok: await promise };
		} catch (err) {
			console.warn(TAG, err);
			return { erro: erroTexto(err) };
		}
	}

	// Id interno do processo: campo "id" do #processoForm; na falta dele, o
	// `id=` da action desse formulário.
	function idDoProcesso(doc) {
		const form = doc.getElementById("processoForm");
		if (!form) return "";
		const field = form.querySelector('[name="id"]');
		if (field && /^\d+$/.test(field.value)) return field.value;
		const m = /[?&]id=(\d+)/.exec(form.getAttribute("action") || "");
		return m ? m[1] : "";
	}

	async function buscarDados(ordenacao) {
		const info = await lerInformacoesAdicionais(ordenacao.processoHref);
		const doc = info.doc;
		const base = info.url;
		const geral = {
			processoId: idDoProcesso(doc),
			classe: campo(doc.getElementById("informacoesProcessuais") || doc, /^classe processual$/),
			dataInfracao: campo(doc, /^data da infracao$/),
			infracoes: linkDoCampo(doc, base, /^infracoes\/penas$/),
			prisoes: linkDoCampo(doc, base, /^prisoes$/),
		};

		// Uma busca de cada vez: o Projudi guarda o estado das telas (formulário
		// da anotação de sentença, filtro de Infrações/Penas...) na sessão, e
		// buscas simultâneas podem se atrapalhar.
		const porParte = [];
		for (const parte of ordenacao.partes) {
			const denunciadoHref = linkDenunciado(doc, base, parte.nome);
			const sentencas = linksSentenca(doc, base, parte.nome);
			const item = { parte: parte, denunciado: null, primeiroGrau: null, tribunal: null, infracoes: null, prisoes: null };
			if (denunciadoHref) item.denunciado = await capturar(lerDenunciado(denunciadoHref));
			if (sentencas.primeiroGrau) item.primeiroGrau = await capturar(lerSentenca(sentencas.primeiroGrau, parte.nome));
			if (sentencas.tribunal) item.tribunal = await capturar(lerSentenca(sentencas.tribunal, parte.nome));
			if (geral.infracoes) item.infracoes = await capturar(lerInfracoes(geral.infracoes.href, parte, geral.processoId));
			if (parte.href || geral.prisoes) item.prisoes = await capturar(lerPrisoes(parte, geral.prisoes));
			porParte.push(item);
		}
		return { geral: geral, partes: porParte };
	}

	// ---------------------------------------------------------------------
	// Montagem das seções (mesma estrutura das seções da guia)
	// ---------------------------------------------------------------------

	function iconeTema(nome) {
		const img = document.querySelector('img[src*="/img/themes/"]');
		const m = img && /^(.*\/img\/themes\/[^/]+\/)/.exec(img.getAttribute("src"));
		return (m ? m[1] : "/projudi/img/themes/olive/") + nome;
	}

	function el(tag, attrs, children) {
		const node = document.createElement(tag);
		if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
		for (const child of [].concat(children || [])) {
			if (child == null) continue;
			node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
		}
		return node;
	}

	function tabelaCampos(pares) {
		const tbody = el("tbody");
		for (const par of pares) {
			tbody.appendChild(el("tr", null, [el("td", { class: "label" }, par[0] + ":"), el("td", null, par[1] instanceof Node ? par[1] : par[1] || SEM_INFO)]));
		}
		return el("table", { class: "form" }, tbody);
	}

	function tabelaResultado(cabecalhos, linhas) {
		const tbody = el("tbody", null, el("tr", null, cabecalhos.map(function (h) { return el("th", null, h); })));
		linhas.forEach(function (linha, i) {
			tbody.appendChild(el("tr", { class: i % 2 ? "odd" : "even" }, linha.map(function (c) { return el("td", null, c || ""); })));
		});
		return el("table", { class: "resultTable", cellpadding: "0", cellspacing: "0", style: "width:100%" }, tbody);
	}

	function secao(tbody, titulo, conteudo) {
		const icone = el("img", { src: iconeTema("iMinus.gif"), alt: "" });
		const toggle = el("a", { href: "#", title: "Recolher/expandir" }, icone);
		const cabecalho = el("tr", { [ROW_ATTR]: "" }, el("td", { colspan: "100%" }, [el("br"), el("h3", null, [toggle, titulo])]));
		const corpo = el("tr", { [ROW_ATTR]: "" }, el("td", { colspan: "100%" }, conteudo));
		toggle.addEventListener("click", function (event) {
			event.preventDefault();
			const aberto = corpo.style.display !== "none";
			corpo.style.display = aberto ? "none" : "";
			icone.setAttribute("src", iconeTema(aberto ? "iPlus.gif" : "iMinus.gif"));
		});
		tbody.appendChild(cabecalho);
		tbody.appendChild(corpo);
	}

	function aviso(texto, title) {
		return el("em", Object.assign({ class: "pdp-bnmp-aviso" }, title ? { title: title } : {}), texto);
	}

	function limparSecoes(ordenacao) {
		for (const tr of ordenacao.table.querySelectorAll("tr[" + ROW_ATTR + "]")) tr.remove();
	}

	function corpoDaTabela(ordenacao) {
		return ordenacao.table.tBodies[0] || ordenacao.table.appendChild(document.createElement("tbody"));
	}

	function mostrarCarregando(ordenacao) {
		limparSecoes(ordenacao);
		secao(corpoDaTabela(ordenacao), "Dados para o BNMP", aviso("Carregando as informações do processo (extensão)…"));
	}

	function mostrarErro(ordenacao, err) {
		limparSecoes(ordenacao);
		secao(corpoDaTabela(ordenacao), "Dados para o BNMP", aviso("Não foi possível carregar as informações do processo: " + erroTexto(err)));
	}

	// Primeiro valor preenchido entre as anotações (Tribunal de Justiça
	// prevalece sobre Primeiro Grau).
	function preferir(anotacoes, ler) {
		for (const a of anotacoes) {
			const v = a && ler(a);
			if (v && (!Array.isArray(v) || v.length)) return v;
		}
		return "";
	}

	function renderizar(ordenacao, dados) {
		limparSecoes(ordenacao);
		const tbody = corpoDaTabela(ordenacao);
		const varias = dados.partes.length > 1;

		for (const item of dados.partes) {
			const sufixo = varias ? " — " + item.parte.nome : "";
			const pg = item.primeiroGrau && item.primeiroGrau.ok;
			const tj = item.tribunal && item.tribunal.ok;
			const anotacoes = [tj, pg].filter(Boolean);
			const den = item.denunciado && item.denunciado.ok;
			const inf = item.infracoes && item.infracoes.ok;
			const erros = [
				item.denunciado && item.denunciado.erro ? "Denunciado/Querelado: " + item.denunciado.erro : "",
				item.primeiroGrau && item.primeiroGrau.erro ? "Sentença (Primeiro Grau): " + item.primeiroGrau.erro : "",
				item.tribunal && item.tribunal.erro ? "Acórdão (Tribunal de Justiça): " + item.tribunal.erro : "",
				item.infracoes && item.infracoes.erro ? "Infrações/Penas: " + item.infracoes.erro : "",
				item.infracoes && item.infracoes.ok && item.infracoes.ok.diagnostico ? "Infrações/Penas (diagnóstico): " + item.infracoes.ok.diagnostico : "",
				item.prisoes && item.prisoes.erro ? "Prisões: " + item.prisoes.erro : "",
			].filter(Boolean);
			const pri = item.prisoes && item.prisoes.ok;
			const emAberto = pri ? pri.linhas.filter(function (l) { return !l.soltura; }) : [];
			const localPrisao = emAberto.length ? emAberto[emAberto.length - 1].local : "";

			const regime = preferir(anotacoes, function (a) { return a.regime; });
			secao(tbody, "Dados da Peça" + sufixo, tabelaCampos([
				["Tipo de Peça", ordenacao.tipoDocumento],
				["Regime", regime ? "Regime " + regime : ""],
				["Número do Processo", ordenacao.numero],
				["Local da Prisão", localPrisao],
			]));

			const tr = function (campoTransito) { return preferir(anotacoes, function (a) { return a.transito[campoTransito]; }); };
			secao(tbody, "Dados do Processo Criminal" + sufixo, tabelaCampos([
				["Tipo Processo Criminal", dados.geral.classe],
				["Data da Infração", dados.geral.dataInfracao || (inf && inf.dataInfracao)],
				["Data de Oferecimento da Denúncia", den && den.oferecimento],
				["Data de Recebimento da Denúncia", den && den.recebimento],
				["Data da Sentença", pg && pg.dataSentenca],
				["Data do Acórdão", tj && tj.dataPublicacao],
				["Data do Trânsito em Julgado (relativo à sentença)", tr("sentenca")],
				["Data de Trânsito em Julgado da Acusação", tr("acusacao")],
				["Data de Trânsito em Julgado do Assistente da Acusação", tr("assistente")],
				["Data de Trânsito em Julgado da Defesa", tr("defesa")],
				["Data de Trânsito em Julgado do Réu", tr("reu")],
			]));

			secao(tbody, "Cadastro de Sentença" + sufixo, tabelaCampos([
				["Tipo da Pena", preferir(anotacoes, function (a) { return a.tipoSentenca; })],
				["Número do Recurso", tj && tj.numeroAcordao],
				["Recorrentes do Recurso", tj && tj.recorrentes.join(", ")],
				["Data recebimento", tj && tj.dataRecebimento],
				["Órgão Judiciário do Recurso", tj && tj.orgaoJulgador],
				["Observação", preferir(anotacoes, function (a) { return a.observacao; })],
			]));

			const conteudoTip = [];
			if (inf && inf.linhas.length) {
				conteudoTip.push(el("p", null, [el("b", null, "Origem: "), inf.origem]));
				conteudoTip.push(tabelaResultado(
					["Artigo", "Data do Delito", "Tipo", "Fração para Progressão de Regime", "Fração para Livramento Condicional", "Reincidente", "Anos", "Meses", "dia(s)"],
					inf.linhas.map(function (l) {
						const d = l.detalhe || {};
						const pena = penaEmPartes(d.pena || l.artigo);
						return [
							l.artigo,
							d.dataDelito || dados.geral.dataInfracao || inf.dataInfracao,
							d.tipo || l.tipo,
							d.fracaoProgressao,
							d.fracaoLivramento,
							d.reincidente,
							pena.anos,
							pena.meses,
							pena.dias,
						];
					})
				));
				const pagina = /(\d+) registro.*ate (\d+)/.exec(normalize(inf.navegacao));
				if (pagina && Number(pagina[1]) > Number(pagina[2])) {
					conteudoTip.push(aviso("Atenção: lista parcial (" + inf.navegacao + ") — confira na tela Infrações/Penas."));
				}
			} else {
				conteudoTip.push(aviso(inf ? "Nenhuma infração/pena de Sentença Judicial ou do Ministério Público para esta parte." : SEM_INFO));
			}
			conteudoTip.push(tabelaCampos([
				["Tempo de Pena", preferir(anotacoes, function (a) { return a.tempoPena; })],
				["Dias-Multa", preferir(anotacoes, function (a) { return a.diasMulta; })],
				["Proporção S.M.", preferir(anotacoes, function (a) { return a.proporcaoSM; })],
			]));
			secao(tbody, "Tipificação penal" + sufixo, conteudoTip);

			const conteudoDen = [tabelaCampos([
				["Data de Oferecimento", den && den.oferecimento],
				["Data de Recebimento", den && den.recebimento],
			])];
			if (den && den.imputacoes.length) {
				conteudoDen.push(tabelaResultado(["Lei", "Pena Cominada", "Complemento"], den.imputacoes.map(function (i) { return [i.lei, i.pena, i.tipo]; })));
			}
			secao(tbody, "Denunciado(s)/Querelado(s)" + sufixo, conteudoDen);

			let conteudoPri;
			if (pri && pri.linhas.length) {
				conteudoPri = [tabelaResultado(
					["Data da Prisão", "Motivo da Prisão", "Local da Prisão", "Soltura/ Conversão", "Motivo da Soltura", "Período de Prisão"],
					pri.linhas.map(function (l) { return [l.data, l.motivo, l.local, l.soltura, l.motivoSoltura, l.periodo]; })
				)];
				if (pri.total) conteudoPri.push(tabelaCampos([["Total Geral", pri.total]]));
			} else if (pri) {
				conteudoPri = aviso("Nenhuma prisão cadastrada para esta parte.");
			} else if (dados.geral.prisoes) {
				conteudoPri = el("p", null, el("a", { href: dados.geral.prisoes.href, class: "link", target: "_blank" }, dados.geral.prisoes.texto || "Ver prisões cadastradas"));
			} else {
				conteudoPri = aviso(SEM_INFO);
			}
			secao(tbody, "Cadastro das Prisões" + sufixo, conteudoPri);

			if (erros.length) {
				secao(tbody, "Avisos da extensão" + sufixo, erros.map(function (e) { return el("div", null, aviso(e)); }));
			}
		}
	}

	// ---------------------------------------------------------------------
	// Execução
	// ---------------------------------------------------------------------

	const ordenacao = lerOrdenacao();
	if (!ordenacao) return;
	mostrarCarregando(ordenacao);
	buscarDados(ordenacao)
		.then(function (dados) {
			renderizar(ordenacao, dados);
		})
		.catch(function (err) {
			console.warn(TAG, "falha ao carregar as informações:", err);
			mostrarErro(ordenacao, err);
		});
})();
