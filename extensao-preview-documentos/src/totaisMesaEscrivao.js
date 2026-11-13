// Projudi - Mesa do Analista, aba "Análise de Juntadas": totais de quadros da
// aba "Mesa do Escrivão Criminal"
//
// Na aba "Mesa do Escrivão Criminal" (usuario/mesaAnalista.do?actionType=
// listaMesaEscrivao, só nas varas criminais) vários quadros não mostram
// número: só clicando neles se vê a lista e o total ("N registro(s)
// encontrado(s), exibindo de 1 até 20", em div.navLeft). Esta funcionalidade
// traz o total de alguns desses quadros para a aba "Análise de Juntadas", em
// linhas novas no fim do quadro "Para Realizar", como os demais contadores da
// aba (<span class="contador"> dentro de um link):
//   - "Feitos sem infração penal" → lista "Feitos Ativos Com Pendência De
//     Anotação Da Infração Penal" (usuario/mesaAnalistaEscrivao.do,
//     formulário com action "?actionType=pesquisarProcessosSemInfracaoPenal");
//   - "Reavaliação da prisão provisória a cada 90 dias (Art 316, CPP)" →
//     lista de mesmo nome (processo/criminal/reavaliacaoProvisoria.do,
//     formulário reavaliacaoProvisoriaForm);
//   - "Prescrições" → [Vencidas] → tela "Prescrições de processos ativos"
//     (usuario/mesaAnalistaEscrivao.do, formulário com action
//     "?actionType=pesquisarPrescricoes"), pesquisada com "Somente sem
//     sentença anotada" (semSentencaAnotada) e "Agrupar por processo"
//     (agruparPorProcesso) marcados. Aqui o "Vencidas"/"A vencer" não vai no
//     formulário: fica na sessão do Projudi, escolhido pelo link (com _tj
//     codificado) do quadro. Por isso a extensão abre primeiro esse link,
//     achado na aba "Mesa do Escrivão Criminal" (baixada em segundo plano
//     ou, se ela não o trouxer, aberta num quadro invisível onde a extensão
//     clica em "Vencidas" — versão 22), e depois envia o formulário
//     com as duas caixas marcadas. Clicar no número refaz os dois passos, na
//     própria página.
//   - "Processos com apreensões sem registro no SNGB" (versão 32) → relatório "Processos com
//     apreensões sem registro no SNGB" de Relatórios/Estatísticas >
//     Relatórios Dinâmicos (administracao/relatorio.do). A extensão abre a
//     Lista de Relatórios, abre o link do relatório (o _tj codificado do
//     link escolhe o relatório na sessão do Projudi) e envia o formulário
//     (actionType=gerarRelatorio) com "Formato de exportação" = Arquivo CSV:
//     texto simples, uma linha por bem, sem paginação nem layout de
//     impressão, o formato mais fácil de contar. O total é o número de
//     linhas de dados (sem a linha de títulos das colunas). Clicar no número
//     leva à tela "Processos com apreensões sem registro no SNGB" (o link do
//     relatório na Lista de Relatórios), onde a pessoa escolhe o formato e
//     clica em "Gerar Relatório". (Gerar o relatório direto em Html, por um
//     formulário montado pela extensão, dava "Erro geral" no Projudi.)
//
// Os dois primeiros totais são obtidos em segundo plano, tentando, nesta ordem, até um
// trazer a lista certa (conferida pelo formulário ou pelo título):
//   1. os endereços diretos da lista (sem o _tj codificado do Projudi);
//   2. o endereço da lista com o _tj "genérico" que o Projudi usa nos links
//      sem ação (o mesmo de "Último Acesso", #lnkUltimosAcessos);
//   3. o endereço que o quadro abre ao ser clicado, procurado no código (com
//      os scripts) da aba "Mesa do Escrivão Criminal".
// Clicar no número abre a mesma lista (Ctrl+clique abre em outra aba).
//
// Só aparece quando a Mesa tem a aba "Mesa do Escrivão Criminal". Cada linha
// só aparece quando o total é maior que zero (versão 32, pedido do usuário),
// mesmo com "Ocultar contadores zerados" desligado. Os totais NÃO são guardados:
// são contados de novo toda vez que a aba é carregada ou atualizada (versão
// 32, ver atualizar()).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpTotaisMesaEscrivao) return;
	window.__pdpTotaisMesaEscrivao = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Totais Mesa do Escrivão]";
	const LINHA_ATTR = "data-pdp-total-escrivao";
	const RAIZ = location.origin + "/projudi/";

	const ITENS = [
		{
			id: "semInfracaoPenal",
			rotulo: "Feitos sem infração penal:",
			dica: "Feitos ativos sem infração penal (quadro da aba Mesa do Escrivão Criminal)",
			quadro: /Feitos ativos sem infra/i,
			caminho: "usuario/mesaAnalistaEscrivao.do",
			diretos: ["usuario/mesaAnalistaEscrivao.do?actionType=pesquisarProcessosSemInfracaoPenal"],
			acao: "pesquisarProcessosSemInfracaoPenal",
			titulo: /Anota[cç][aã]o Da Infra[cç][aã]o Penal/i,
		},
		{
			id: "reavaliacaoProvisoria",
			rotulo: "Reavaliação da prisão provisória a cada 90 dias (Art. 316, CPP):",
			dica: "Reavaliação da prisão provisória a cada 90 dias (Art 316, CPP) (quadro da aba Mesa do Escrivão Criminal)",
			quadro: /Reavalia[cç][aã]o da pris[aã]o provis[oó]ria/i,
			caminho: "processo/criminal/reavaliacaoProvisoria.do",
			diretos: ["processo/criminal/reavaliacaoProvisoria.do", "processo/criminal/reavaliacaoProvisoria.do?actionType=listar"],
			form: "reavaliacaoProvisoriaForm",
			titulo: /Reavalia[cç][aã]o da pris[aã]o provis[oó]ria/i,
		},
		{
			id: "prescricoesVencidas",
			rotulo: "Prescrições vencidas:",
			dica: "Prescrições vencidas, somente sem sentença anotada e agrupadas por processo (quadro Prescrições da aba Mesa do Escrivão Criminal)",
			acao: "pesquisarPrescricoes",
			titulo: /Prescri[cç][oõ]es de processos ativos/i,
			contar: contarPrescricoes,
			abrir: abrirPrescricoes,
		},
		{
			id: "bensSemSngb",
			rotulo: "Processos com apreensões sem registro no SNGB:",
			dica: "Bens apreendidos sem registro no SNGB (relatório \"Processos com apreensões sem registro no SNGB\" dos Relatórios Dinâmicos); clique para abrir a tela do relatório e gerá-lo",
			contar: contarSngb,
		},
	];

	function normalizar(texto) {
		return String(texto || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function nomesDasAbas() {
		return Array.from(document.querySelectorAll("#tabHorz li")).map((li) => ({
			nome: normalizar(li.textContent),
			atual: li.classList.contains("currentTab"),
		}));
	}

	function naAnaliseDeJuntadas(abas) {
		const atual = abas.find((a) => a.atual);
		if (atual) return /^An[aá]lise de Juntadas$/i.test(atual.nome);
		return /(^|[?&])actionType=listaAnaliseJuntadas(&|$)/.test(location.search);
	}

	// Quadro "Para Realizar" da aba (o <h4> seguido do <fieldset>).
	function acharTabelaParaRealizar() {
		for (const h4 of document.querySelectorAll("h4")) {
			if (!/^Para Realizar$/i.test(normalizar(h4.textContent))) continue;
			let el = h4.nextElementSibling;
			while (el && el.tagName !== "FIELDSET") el = el.nextElementSibling;
			const tabela = el && el.querySelector("table.form, table");
			if (tabela) return tabela;
		}
		return null;
	}

	async function baixarDocumento(url) {
		const resposta = await fetch(url, { credentials: "same-origin", cache: "no-store" });
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		const tipo = resposta.headers.get("content-type") || "";
		let charset = /charset=([\w-]+)/i.exec(tipo);
		if (!charset) charset = /charset=["']?([\w-]+)/i.exec(new TextDecoder("windows-1252").decode(bytes.slice(0, 4096)));
		let texto;
		try {
			texto = new TextDecoder((charset && charset[1]) || "windows-1252").decode(bytes);
		} catch (e) {
			texto = new TextDecoder("windows-1252").decode(bytes);
		}
		return { texto, doc: new DOMParser().parseFromString(texto, "text/html") };
	}

	// A resposta é mesmo a lista do item?
	function ehLista(item, doc) {
		if (item.acao && doc.querySelector("form[action*='" + item.acao + "']")) return true;
		if (item.form && doc.getElementById(item.form)) return true;
		const h3 = doc.querySelector("#content h3, h3");
		return !!(h3 && item.titulo.test(h3.textContent) && (doc.querySelector("div.navLeft, table.resultTable") || /nenhum\s+registro/i.test(doc.body.textContent)));
	}

	function lerTotal(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /([\d.]+)\s*registro/i.exec(nav.textContent);
		if (m) return parseInt(m[1].replace(/\./g, ""), 10);
		// Sem resultados (ou numa página só) o navegador pode faltar.
		const tabela = doc.querySelector("table.resultTable");
		if (tabela) return tabela.querySelectorAll("tbody tr").length;
		if (/nenhum\s+registro/i.test(doc.body ? doc.body.textContent : "")) return 0;
		throw new Error("total não encontrado na resposta");
	}

	// _tj "genérico" dos links do Projudi sem ação própria (ex.: "Último Acesso").
	function tjGenerico() {
		const a = document.querySelector("#lnkUltimosAcessos[href*='_tj=']");
		const m = a && /[?&]_tj=([0-9a-f]+)/i.exec(a.getAttribute("href"));
		return m ? m[1] : null;
	}

	// Código (com os scripts) da aba "Mesa do Escrivão Criminal", baixado uma vez.
	let mesaEscrivao = null;
	function codigoMesaEscrivao() {
		if (!mesaEscrivao) mesaEscrivao = baixarDocumento(RAIZ + "usuario/mesaAnalista.do?actionType=listaMesaEscrivao").then((r) => r.texto);
		return mesaEscrivao;
	}

	// Endereço que o quadro do item abre ao ser clicado (onclick da linha do quadro).
	async function enderecoPeloQuadro(item) {
		const texto = await codigoMesaEscrivao();
		const nome = item.caminho.split("/").pop().replace(/\./g, "\\.");
		const url = new RegExp("[^\\s'\"<>()]*" + nome + "(?:\\?[^\\s'\"<>()]*)?");
		let achado = null;
		const i = texto.search(item.quadro);
		if (i >= 0) {
			const inicio = texto.lastIndexOf("<tr", i);
			const fim = texto.indexOf("</tr>", i);
			const m = url.exec(inicio >= 0 ? texto.slice(inicio, fim > i ? fim : i + 2000) : "");
			if (m) achado = m[0];
		}
		if (!achado && item.acao) {
			const m = new RegExp("[^\\s'\"<>()]*" + nome + "\\?[^\\s'\"<>()]*" + item.acao + "[^\\s'\"<>()]*").exec(texto);
			if (m) achado = m[0];
		}
		if (!achado) throw new Error("endereço do quadro não encontrado na Mesa do Escrivão Criminal");
		return new URL(achado.replace(/&amp;/g, "&"), location.href).href;
	}

	async function contar(item) {
		const candidatos = item.diretos.map((c) => RAIZ + c);
		const tj = tjGenerico();
		if (tj) candidatos.push(RAIZ + item.caminho + "?_tj=" + tj);
		for (const href of candidatos) {
			try {
				const { doc } = await baixarDocumento(href);
				if (ehLista(item, doc)) return { total: lerTotal(doc), href };
				console.log(TAG, item.id + ": " + href + " não trouxe a lista");
			} catch (erro) {
				console.log(TAG, item.id + ": " + href + " falhou (" + erro.message + ")");
			}
		}
		console.log(TAG, item.id + ": procurando o endereço do quadro na Mesa do Escrivão Criminal");
		const href = await enderecoPeloQuadro(item);
		const { doc } = await baixarDocumento(href);
		if (!ehLista(item, doc)) throw new Error("a página aberta pelo quadro não é a lista esperada");
		return { total: lerTotal(doc), href };
	}

	// ---- Prescrições vencidas ----------------------------------------------
	//
	// O link "Vencidas" do quadro "Prescrições" tem _tj codificado, que muda a
	// cada sessão do Projudi, e a página da aba "Mesa do Escrivão Criminal"
	// baixada em segundo plano (fetch, sem rodar os scripts do Projudi) pode
	// não trazê-lo (versões 14 a 17: "não disponível"). Por isso, se a busca
	// simples não achar o link, a extensão abre a aba num quadro (iframe)
	// invisível, onde os scripts do Projudi rodam como na tela, e clica em
	// "Vencidas" ali, exatamente como a pessoa faria (versão 22).

	const MESA_ESCRIVAO = RAIZ + "usuario/mesaAnalista.do?actionType=listaMesaEscrivao";

	// Link "Vencidas" do quadro "Prescrições": um <a> com o texto "Vencidas"
	// perto (no mesmo quadro) da palavra "Prescrições". Não depende de como a
	// tela foi montada (tabela original ou cartões do visual novo da Mesa).
	function acharLinkVencidas(doc) {
		if (!doc) return null;
		for (const a of doc.querySelectorAll("a")) {
			if (!/^Vencidas$/i.test(normalizar(a.textContent))) continue;
			let el = a.parentElement;
			for (let n = 0; el && n < 8; n++, el = el.parentElement) {
				const t = el.textContent || "";
				if (t.length > 600) break;
				if (/Prescri/i.test(t)) return a;
			}
		}
		return null;
	}

	function enderecoReal(a) {
		const href = a.getAttribute("href") || "";
		if (!href || href === "#" || /^javascript:/i.test(href)) return null;
		return new URL(href.replace(/&amp;/g, "&"), RAIZ + "usuario/mesaAnalista.do").href;
	}

	// Endereços do link "Vencidas" achados na página da aba baixada em segundo plano.
	async function linksPrescricoesVencidas() {
		const achados = [];
		let texto = "";
		try {
			texto = await codigoMesaEscrivao();
		} catch (erro) {
			console.log(TAG, "prescricoesVencidas: não foi possível baixar a Mesa do Escrivão Criminal (" + erro.message + ")");
			return achados;
		}
		const a = acharLinkVencidas(new DOMParser().parseFromString(texto, "text/html"));
		const href = a && enderecoReal(a);
		if (href) achados.push(href);
		// Também no texto da página (inclusive dentro de scripts).
		const i = texto.search(/Prescri\S{1,6}es/i);
		if (i >= 0) {
			const m = /href\s*=\s*["']([^"'#][^"']*)["'][^>]*>\s*Vencidas\s*</i.exec(texto.slice(i, i + 4000));
			if (m && !/^javascript:/i.test(m[1])) achados.push(new URL(m[1].replace(/&amp;/g, "&"), RAIZ + "usuario/mesaAnalista.do").href);
		}
		if (!achados.length) {
			const d = new DOMParser().parseFromString(texto, "text/html");
			console.log(TAG, "prescricoesVencidas: o link \"Vencidas\" não veio na página baixada em segundo plano —",
				"h3:", Array.from(d.querySelectorAll("h3")).map((h) => normalizar(h.textContent)).join(" / "),
				"| tem \"Prescri\":", /Prescri/i.test(texto), "| tamanho:", texto.length, "— tentando pela aba aberta num quadro invisível");
		}
		return Array.from(new Set(achados));
	}

	// Campos do formulário como o navegador os enviaria (sem botões).
	function camposDoFormulario(form) {
		const campos = [];
		for (const el of form.elements) {
			if (!el.name || el.disabled) continue;
			const tipo = (el.type || "").toLowerCase();
			if (["submit", "button", "reset", "image", "file"].includes(tipo)) continue;
			if ((tipo === "checkbox" || tipo === "radio") && !el.checked) continue;
			if (el.tagName === "SELECT") {
				const opcoes = Array.from(el.options);
				let escolhidas = opcoes.filter((o) => o.selected);
				if (!escolhidas.length && !el.multiple && opcoes.length) escolhidas = [opcoes[0]];
				escolhidas.forEach((o) => campos.push([el.name, o.value]));
				continue;
			}
			campos.push([el.name, el.value]);
		}
		return campos;
	}

	// Envio da pesquisa com "Somente sem sentença anotada" e "Agrupar por
	// processo" marcados, a partir do formulário da tela de Prescrições.
	function envioDoFormulario(form, base) {
		const fixos = { semSentencaAnotada: "true", agruparPorProcesso: "true", pageNumber: "1" };
		const campos = camposDoFormulario(form).filter(([nome]) => !(nome in fixos));
		campos.push(["semSentencaAnotada", "true"], ["agruparPorProcesso", "true"]);
		if (form.querySelector("[name='pageNumber']")) campos.push(["pageNumber", "1"]);
		return { acao: new URL(form.getAttribute("action"), base).href, campos };
	}

	// 1º caminho: abre (fetch) o link "Vencidas" achado na página baixada.
	async function prepararPorBusca() {
		for (const href of await linksPrescricoesVencidas()) {
			try {
				const { doc } = await baixarDocumento(href);
				const form = doc.querySelector("form[action*='pesquisarPrescricoes']");
				if (form) return Object.assign({ vencidas: href }, envioDoFormulario(form, href));
				console.log(TAG, "prescricoesVencidas: " + href + " não abriu a tela de Prescrições");
			} catch (erro) {
				console.log(TAG, "prescricoesVencidas: link falhou (" + erro.message + ")");
			}
		}
		return null;
	}

	function esperarCarga(iframe, ms) {
		return new Promise((ok, falha) => {
			const t = setTimeout(() => falha(new Error("o Projudi demorou a responder")), ms);
			iframe.addEventListener("load", () => {
				clearTimeout(t);
				ok();
			}, { once: true });
		});
	}

	async function esperarAte(teste, ms) {
		const fim = Date.now() + ms;
		for (;;) {
			let r = null;
			try {
				r = teste();
			} catch (e) {}
			if (r) return r;
			if (Date.now() > fim) return null;
			await new Promise((ok) => setTimeout(ok, 250));
		}
	}

	// 2º caminho: abre a aba "Mesa do Escrivão Criminal" num quadro invisível
	// e clica em "Vencidas", como a pessoa faria. A sessão do Projudi fica nas
	// vencidas e a tela de Prescrições traz o formulário da pesquisa.
	async function prepararPorQuadroInvisivel() {
		const iframe = document.createElement("iframe");
		iframe.setAttribute("aria-hidden", "true");
		iframe.tabIndex = -1;
		iframe.title = "Prescrições (contagem da extensão)";
		iframe.style.cssText = "position:absolute;left:-10000px;top:0;width:1200px;height:800px;border:0;visibility:hidden";
		const carregou = esperarCarga(iframe, 30000);
		iframe.src = MESA_ESCRIVAO;
		document.body.appendChild(iframe);
		try {
			await carregou;
			const doc = () => iframe.contentDocument;
			let a = await esperarAte(() => acharLinkVencidas(doc()), 8000);
			if (!a) {
				// A Mesa abriu em outra aba: clica na aba "Mesa do Escrivão Criminal".
				const atual = doc().querySelector("#tabHorz li.currentTab");
				const naAba = atual && /^Mesa do Escriv[aã]o Criminal$/i.test(normalizar(atual.textContent));
				const aba = naAba ? null : Array.from(doc().querySelectorAll("#tabHorz a, a")).find((x) => /^Mesa do Escriv[aã]o Criminal$/i.test(normalizar(x.textContent)));
				if (aba) {
					const foi = esperarCarga(iframe, 15000);
					aba.click();
					await foi.catch(() => {});
					a = await esperarAte(() => acharLinkVencidas(doc()), 8000);
				}
			}
			if (!a) {
				const d = doc();
				console.log(TAG, "prescricoesVencidas: o link \"Vencidas\" também não apareceu na aba aberta no quadro invisível —",
					"endereço:", d && d.URL, "| h3:", d ? Array.from(d.querySelectorAll("h3")).map((h) => normalizar(h.textContent)).join(" / ") : "-",
					"| aba atual:", d ? normalizar((d.querySelector("#tabHorz li.currentTab") || {}).textContent) : "-",
					"| tem \"Prescri\":", !!(d && d.body && /Prescri/i.test(d.body.textContent)));
				throw new Error("link \"Vencidas\" do quadro Prescrições não encontrado na Mesa do Escrivão Criminal");
			}
			const vencidas = enderecoReal(a);
			const foi = esperarCarga(iframe, 30000);
			a.click();
			await foi;
			const form = await esperarAte(() => doc().querySelector("form[action*='pesquisarPrescricoes']"), 5000);
			if (!form) throw new Error("o clique em \"Vencidas\" não abriu a tela de Prescrições (endereço: " + (doc() && doc().URL) + ")");
			return Object.assign({ vencidas }, envioDoFormulario(form, doc().URL));
		} finally {
			iframe.remove();
		}
	}

	// Deixa a sessão do Projudi nas prescrições vencidas e devolve o envio da
	// pesquisa com as duas caixas marcadas.
	async function prepararPrescricoes() {
		return (await prepararPorBusca()) || (await prepararPorQuadroInvisivel());
	}

	async function contarPrescricoes(item) {
		const envio = await prepararPrescricoes();
		const corpo = new URLSearchParams();
		envio.campos.forEach(([nome, valor]) => corpo.append(nome, valor));
		const resposta = await fetch(envio.acao, {
			method: "POST",
			credentials: "same-origin",
			cache: "no-store",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		const doc = new DOMParser().parseFromString(new TextDecoder("windows-1252").decode(bytes), "text/html");
		if (!ehLista(item, doc)) throw new Error("a pesquisa não trouxe a tela de Prescrições");
		return { total: lerTotal(doc), href: envio.vencidas || MESA_ESCRIVAO };
	}

	// Clique no número: deixa a sessão nas vencidas e envia, na própria
	// página, o formulário com as duas caixas marcadas.
	async function abrirPrescricoes(alvo) {
		const envio = await prepararPrescricoes();
		const form = document.createElement("form");
		form.method = "post";
		form.action = envio.acao;
		if (alvo) form.target = alvo;
		form.style.display = "none";
		envio.campos.forEach(([nome, valor]) => {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = nome;
			input.value = valor;
			form.appendChild(input);
		});
		document.body.appendChild(form);
		form.submit();
		form.remove();
	}

	// ---- Processos com apreensões sem registro no SNGB (versão 32)---------------------------
	//
	// Relatórios/Estatísticas > Relatórios Dinâmicos > "Processos com
	// apreensões sem registro no SNGB" > Formato de exportação "Arquivo CSV"
	// > Gerar Relatório. O link do menu "Relatórios Dinâmicos" usa o mesmo
	// _tj genérico de "Último Acesso".

	const RELATORIO_SNGB = /apreens\S*es\s+sem\s+registro\s+no\s+SNGB/i;

	// Endereço da Lista de Relatórios: o link do menu (na moldura de cima,
	// quando acessível) ou relatorio.do com o _tj genérico.
	function enderecosListaRelatorios() {
		const achados = [];
		const docs = [document];
		try {
			if (window.top && window.top !== window && window.top.document) docs.push(window.top.document);
		} catch (e) {}
		for (const d of docs) {
			for (const a of d.querySelectorAll("a[href*='administracao/relatorio.do']")) {
				if (/Relat[oó]rios Din[aâ]micos/i.test(normalizar(a.textContent))) achados.push(new URL(a.getAttribute("href"), d.URL).href);
			}
		}
		const tj = tjGenerico();
		if (tj) achados.push(RAIZ + "administracao/relatorio.do?_tj=" + tj);
		achados.push(RAIZ + "administracao/relatorio.do");
		return Array.from(new Set(achados));
	}

	// Abre a Lista de Relatórios e depois o relatório do SNGB (o que deixa a
	// sessão do Projudi nele). Devolve o formulário "Gerar Relatório".
	async function prepararSngb() {
		let linkRelatorio = null;
		for (const href of enderecosListaRelatorios()) {
			try {
				const { doc } = await baixarDocumento(href);
				const a = Array.from(doc.querySelectorAll("a[href]")).find((x) => RELATORIO_SNGB.test(normalizar(x.textContent)));
				if (a) {
					linkRelatorio = new URL(a.getAttribute("href").replace(/&amp;/g, "&"), href).href;
					break;
				}
				console.log(TAG, "bensSemSngb: " + href + " não trouxe o relatório na Lista de Relatórios");
			} catch (erro) {
				console.log(TAG, "bensSemSngb: " + href + " falhou (" + erro.message + ")");
			}
		}
		if (!linkRelatorio) throw new Error("relatório \"Processos com apreensões sem registro no SNGB\" não encontrado na Lista de Relatórios");
		const { doc } = await baixarDocumento(linkRelatorio);
		const form = doc.querySelector("form[action*='gerarRelatorio']") || doc.getElementById("relatorioForm");
		if (!form) throw new Error("o link do relatório não abriu a tela \"Gerar Relatório\"");
		return { link: linkRelatorio, acao: new URL(form.getAttribute("action"), linkRelatorio).href, campos: camposDoFormulario(form) };
	}

	function camposComFormato(envio, formato) {
		return envio.campos.filter(([nome]) => nome !== "tipoExportacao").concat([["tipoExportacao", formato]]);
	}

	// Linhas do CSV (respeitando aspas e quebras de linha dentro delas).
	function lerCsv(texto) {
		texto = texto.replace(/^\uFEFF/, "");
		const primeira = texto.split(/\r?\n/).find((l) => l.trim()) || "";
		const contar = (c) => primeira.split(c).length;
		const sep = [";", ",", "\t"].sort((a, b) => contar(b) - contar(a))[0];
		const linhas = [];
		let linha = [], campo = "", aspas = false;
		for (let i = 0; i < texto.length; i++) {
			const c = texto[i];
			if (aspas) {
				if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
				else if (c === '"') aspas = false;
				else campo += c;
			} else if (c === '"') aspas = true;
			else if (c === sep) { linha.push(campo); campo = ""; }
			else if (c === "\n" || c === "\r") {
				if (c === "\r" && texto[i + 1] === "\n") i++;
				linha.push(campo); linhas.push(linha); linha = []; campo = "";
			} else campo += c;
		}
		linha.push(campo);
		linhas.push(linha);
		return linhas.map((l) => l.map((x) => normalizar(x))).filter((l) => l.some((x) => x));
	}

	// Número de bens: linhas de dados do CSV, sem a linha de títulos das
	// colunas (e suas repetições) e sem linhas de título ou de total.
	function contarLinhasCsv(texto) {
		const linhas = lerCsv(texto);
		const preenchidas = (l) => l.filter((x) => x).length;
		let i = linhas.findIndex((l) => preenchidas(l) >= 2 && l.some((x) => /processo|apreens|bem|bens/i.test(x) && x.length < 60 && !/\d{7}-\d{2}/.test(x)));
		if (i < 0) i = linhas.findIndex((l) => preenchidas(l) >= 2);
		if (i < 0) return { total: 0, cabecalho: [] };
		const cabecalho = linhas[i];
		const igual = (l) => l.join("|") === cabecalho.join("|");
		const dados = linhas.slice(i + 1).filter((l) => !igual(l) && preenchidas(l) >= 1 && !/^total/i.test(l.find((x) => x) || ""));
		return { total: dados.length, cabecalho };
	}

	async function contarSngb() {
		const envio = await prepararSngb();
		const corpo = new URLSearchParams();
		camposComFormato(envio, "CSV").forEach(([nome, valor]) => corpo.append(nome, valor));
		const resposta = await fetch(envio.acao, {
			method: "POST",
			credentials: "same-origin",
			cache: "no-store",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		let texto;
		try {
			texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		} catch (e) {
			texto = new TextDecoder("windows-1252").decode(bytes);
		}
		const tipo = resposta.headers.get("content-type") || "";
		if (/html/i.test(tipo) || /^\s*(<!DOCTYPE|<html)/i.test(texto)) {
			// O Projudi devolveu uma página (sem arquivo): "nenhum registro" ou erro.
			const doc = new DOMParser().parseFromString(texto, "text/html");
			const msg = normalizar(doc.body ? doc.body.textContent : "");
			if (/nenhum\s+(registro|resultado|dado)|n[aã]o\s+(h[aá]|foram\s+encontrad)/i.test(msg)) return { total: 0, href: envio.link };
			throw new Error("o relatório não veio em CSV (" + msg.slice(0, 150) + ")");
		}
		const { total, cabecalho } = contarLinhasCsv(texto);
		console.log(TAG, "bensSemSngb: colunas do CSV:", cabecalho.join(" | "));
		return { total, href: envio.link };
	}

	// -----------------------------------------------------------------------

	// Célula do total na linha do item (criada no fim do quadro "Para
	// Realizar" na primeira vez; depois reaproveitada, mesmo se o visual novo
	// da Mesa a levou para o quadro "Da Mesa do Escrivão Criminal").
	function celulaDoTotal(tabela, item) {
		const existente = document.querySelector("tr[" + LINHA_ATTR + "='" + item.id + "']");
		if (existente && existente.cells.length) return existente.cells[existente.cells.length - 1];
		const corpo = tabela.tBodies[0] || tabela;
		const tr = document.createElement("tr");
		tr.setAttribute(LINHA_ATTR, item.id);
		const tdRotulo = document.createElement("td");
		tdRotulo.className = "label";
		const modelo = corpo.querySelector("td.label");
		tdRotulo.setAttribute("style", (modelo && modelo.getAttribute("style")) || "width:150px");
		const label = document.createElement("label");
		label.textContent = item.rotulo;
		label.title = item.dica;
		tdRotulo.appendChild(label);
		const tdValor = document.createElement("td");
		tr.append(tdRotulo, tdValor);
		corpo.appendChild(tr);
		return tdValor;
	}

	// Cada linha só aparece com total maior que zero (versão 32, pedido do
	// usuário); também fica escondida enquanto conta, para não aparecer e
	// sumir em seguida. "não disponível" aparece, para avisar do erro.
	function mostrarLinha(celula, visivel) {
		const tr = celula && celula.closest("tr");
		if (!tr) return;
		if (visivel) tr.style.removeProperty("display");
		else tr.style.setProperty("display", "none", "important");
	}

	function mostrarEspera(celula) {
		const espera = document.createElement("span");
		espera.textContent = "…";
		espera.title = "Contando…";
		celula.replaceChildren(espera);
		mostrarLinha(celula, false);
	}

	function naoDisponivel(celula) {
		const aviso = document.createElement("span");
		aviso.textContent = "não disponível";
		aviso.title = "Não foi possível abrir a lista agora.";
		celula.replaceChildren(aviso);
		mostrarLinha(celula, true);
	}

	function mostrarTotal(celula, item, dados) {
		const link = document.createElement("a");
		link.href = dados.href;
		link.title = "Abrir a lista (" + item.dica + ")";
		const span = document.createElement("span");
		span.className = "contador";
		span.id = "pdpTotalEscrivao_" + item.id;
		span.textContent = String(dados.total);
		link.appendChild(span);
		if (item.abrir) {
			link.addEventListener("click", (ev) => {
				ev.preventDefault();
				const alvo = ev.ctrlKey || ev.metaKey || ev.shiftKey ? "_blank" : "";
				// Janela aberta já no clique (senão o navegador a bloqueia).
				const nome = alvo ? "pdpTotalEscrivao" + Date.now() : "";
				if (nome) window.open("about:blank", nome);
				item.abrir(nome).catch((erro) => {
					console.warn(TAG, item.id + ": não foi possível abrir a lista:", erro);
					if (nome) window.open(dados.href, nome);
					else location.href = dados.href;
				});
			});
		}
		celula.replaceChildren(link);
		mostrarLinha(celula, dados.total > 0);
	}

	function temAbaEscrivao(abas) {
		return abas.some((a) => /^Mesa do Escriv[aã]o Criminal$/i.test(a.nome));
	}

	// Os totais são contados de novo toda vez que a aba é carregada ou
	// atualizada (versão 32, pedido do usuário; antes ficavam guardados por
	// 5 minutos):
	//   - ao abrir ou recarregar a aba (o script roda de novo);
	//   - ao voltar a ela pelo botão Voltar do navegador (pageshow com
	//     persisted);
	//   - se o conteúdo da aba for trocado sem recarregar a página (as linhas
	//     somem e são recriadas pelo observador abaixo).
	// Só vale a contagem mais recente (rodada).
	let rodada = 0;
	async function atualizar() {
		const abas = nomesDasAbas();
		if (!temAbaEscrivao(abas) || !naAnaliseDeJuntadas(abas)) return;
		const tabela = acharTabelaParaRealizar();
		if (!tabela && !ITENS.every((item) => document.querySelector("tr[" + LINHA_ATTR + "='" + item.id + "']"))) {
			console.log(TAG, "quadro \"Para Realizar\" não encontrado na Análise de Juntadas");
			return;
		}
		const minha = ++rodada;
		mesaEscrivao = null; // baixa a aba Mesa do Escrivão Criminal de novo
		const celulas = ITENS.map((item) => celulaDoTotal(tabela, item));
		celulas.forEach(mostrarEspera);
		// Uma pesquisa depois da outra, para não embaralhar a sessão do Projudi.
		for (let i = 0; i < ITENS.length; i++) {
			const item = ITENS[i];
			try {
				const dados = await (item.contar || contar)(item);
				if (minha !== rodada) return;
				console.log(TAG, item.id + ": total", dados.total);
				mostrarTotal(celulas[i], item, dados);
			} catch (erro) {
				if (minha !== rodada) return;
				console.warn(TAG, item.id + ": não foi possível contar:", erro);
				naoDisponivel(celulas[i]);
			}
		}
	}

	function vigiarConteudo() {
		let agendado = false;
		const faltaLinha = () => ITENS.some((item) => !document.querySelector("tr[" + LINHA_ATTR + "='" + item.id + "']"));
		new MutationObserver(() => {
			if (agendado || !faltaLinha()) return;
			const abas = nomesDasAbas();
			if (!temAbaEscrivao(abas) || !naAnaliseDeJuntadas(abas) || !acharTabelaParaRealizar()) return;
			agendado = true;
			setTimeout(() => {
				agendado = false;
				if (faltaLinha()) atualizar();
			}, 300);
		}).observe(document.body, { childList: true, subtree: true });
	}

	function iniciar() {
		atualizar();
		if (document.body) vigiarConteudo();
		window.addEventListener("pageshow", (ev) => {
			if (ev.persisted) atualizar();
		});
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
	else iniciar();
})();
