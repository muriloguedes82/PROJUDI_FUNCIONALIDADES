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
//     achado na aba "Mesa do Escrivão Criminal" (ou, se a página da aba
//     baixada em segundo plano não o trouxer, o link já conhecido — versão
//     17), e depois envia o formulário
//     com as duas caixas marcadas. Clicar no número refaz os dois passos, na
//     própria página.
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
// Só aparece quando a Mesa tem a aba "Mesa do Escrivão Criminal". Com total
// zero a linha fica como as demais: some se "Ocultar contadores zerados"
// estiver ligado (mesaAnalistaContadores.js). Para não refazer as pesquisas a
// cada volta à aba, os totais ficam guardados por alguns minutos
// (sessionStorage da aba).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpTotaisMesaEscrivao) return;
	window.__pdpTotaisMesaEscrivao = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Totais Mesa do Escrivão]";
	const CACHE = "pdpTotaisMesaEscrivao";
	const VALIDADE_MS = 5 * 60 * 1000;
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
		const resposta = await fetch(url, { credentials: "same-origin" });
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

	// Link "Vencidas" do quadro "Prescrições", tal como aparece na aba "Mesa
	// do Escrivão Criminal" (o _tj codificado é o mesmo enquanto o Projudi não
	// mudar a chave). Só é usado se a página da aba, baixada em segundo plano,
	// não trouxer o link (o Projudi pode montar o conteúdo da aba depois de
	// abrir a página); e só é aceito se abrir de fato a tela de Prescrições.
	const VENCIDAS_CONHECIDO = "usuario/mesaAnalistaEscrivao.do?_tj=879e8a0fd8df99251ba48000d2eefd6adc76785491635d1ccc288204c1f3f4a66b55d45b05f97b4e2fa7dd96a4f20f16ba2e3efd916bbe137fc5a9bdf849bdff94e484499e77f3a3a231dbfe8990f53ed0271b083411a2dcaf4371d943ad729a0733091e5d04f5d6db7fbacd6bfda077736e2db9eb27cfbf23426f62f40f2723dc5cf81db0672ec103049044720f94ff732041a2f7b0162f6aa5cbd2e21ebeebfbd56a1d7c28bb9231a458fbb01fcbef74e2e1483bfbd03e6e9033eb2d9da331425fce913272897e3ea1bdb97226b98b550cfdc2acf5e287998f421caeec0fb9";

	// Endereços candidatos ao link "Vencidas" do quadro "Prescrições", na ordem
	// em que são tentados: os achados na aba "Mesa do Escrivão Criminal" e,
	// por último, o conhecido.
	async function linksPrescricoesVencidas() {
		const base = RAIZ + "usuario/mesaAnalista.do";
		const achados = [];
		let texto = "";
		try {
			texto = await codigoMesaEscrivao();
		} catch (erro) {
			console.log(TAG, "prescricoesVencidas: não foi possível abrir a Mesa do Escrivão Criminal (" + erro.message + ")");
		}
		if (texto) {
			// 1) Pela página montada: o link "Vencidas" na mesma célula do rótulo "Prescrições".
			const doc = new DOMParser().parseFromString(texto, "text/html");
			for (const label of doc.querySelectorAll("label, b")) {
				if (!/^Prescri\S{1,6}es$/i.test(normalizar(label.textContent))) continue;
				const td = label.closest("td") || label.parentElement;
				const a = Array.from(td.querySelectorAll("a[href]")).find((x) => /^Vencidas$/i.test(normalizar(x.textContent)));
				if (a) achados.push(new URL(a.getAttribute("href"), base).href);
			}
			// 2) Pelo texto da página (também dentro de scripts): o primeiro link
			// "Vencidas" depois da palavra "Prescrições".
			const i = texto.search(/>\s*Prescri\S{1,6}es\s*</i);
			if (i >= 0) {
				const m = /href\s*=\s*["']([^"']+)["'][^>]*>\s*Vencidas\s*</i.exec(texto.slice(i, i + 4000));
				if (m) achados.push(new URL(m[1].replace(/&amp;/g, "&"), base).href);
			}
			if (!achados.length) {
				const d = new DOMParser().parseFromString(texto, "text/html");
				console.log(TAG, "prescricoesVencidas: link \"Vencidas\" não está na página da Mesa do Escrivão Criminal baixada —",
					"título:", normalizar(d.title), "| h3:", Array.from(d.querySelectorAll("h3")).map((h) => normalizar(h.textContent)).join(" / "),
					"| tem \"Prescri\":", /Prescri/i.test(texto), "| tamanho:", texto.length);
			}
		}
		achados.push(RAIZ + VENCIDAS_CONHECIDO);
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

	// Abre o link "Vencidas" e devolve o envio do formulário com
	// "Somente sem sentença anotada" e "Agrupar por processo" marcados.
	async function prepararPrescricoes() {
		let vencidas = null;
		let form = null;
		for (const href of await linksPrescricoesVencidas()) {
			try {
				const { doc } = await baixarDocumento(href);
				const f = doc.querySelector("form[action*='pesquisarPrescricoes']");
				if (f) {
					vencidas = href;
					form = f;
					break;
				}
				console.log(TAG, "prescricoesVencidas: " + (href.indexOf(VENCIDAS_CONHECIDO) >= 0 ? "link conhecido" : href) + " não abriu a tela de Prescrições");
			} catch (erro) {
				console.log(TAG, "prescricoesVencidas: link falhou (" + erro.message + ")");
			}
		}
		if (!form) throw new Error("nenhum link \"Vencidas\" abriu a tela de Prescrições");
		const fixos = { semSentencaAnotada: "true", agruparPorProcesso: "true", pageNumber: "1" };
		const campos = camposDoFormulario(form).filter(([nome]) => !(nome in fixos));
		campos.push(["semSentencaAnotada", "true"], ["agruparPorProcesso", "true"]);
		if (form.querySelector("[name='pageNumber']")) campos.push(["pageNumber", "1"]);
		return { vencidas, acao: new URL(form.getAttribute("action"), vencidas).href, campos };
	}

	async function contarPrescricoes(item) {
		const envio = await prepararPrescricoes();
		const corpo = new URLSearchParams();
		envio.campos.forEach(([nome, valor]) => corpo.append(nome, valor));
		const resposta = await fetch(envio.acao, {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		const doc = new DOMParser().parseFromString(new TextDecoder("windows-1252").decode(bytes), "text/html");
		if (!ehLista(item, doc)) throw new Error("a pesquisa não trouxe a tela de Prescrições");
		return { total: lerTotal(doc), href: envio.vencidas };
	}

	// Clique no número: abre "Vencidas" (para a sessão ficar nas vencidas) e
	// envia, na própria página, o formulário com as duas caixas marcadas.
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

	// -----------------------------------------------------------------------

	function lerTodoCache() {
		try {
			const c = JSON.parse(sessionStorage.getItem(CACHE) || "null");
			return c && typeof c === "object" ? c : {};
		} catch (e) {
			return {};
		}
	}

	function lerCache(id) {
		const c = lerTodoCache()[id];
		return c && Date.now() - c.quando < VALIDADE_MS && Number.isFinite(c.total) ? c : null;
	}

	function gravarCache(id, dados) {
		try {
			const todos = lerTodoCache();
			todos[id] = Object.assign({ quando: Date.now() }, dados);
			sessionStorage.setItem(CACHE, JSON.stringify(todos));
		} catch (e) {}
	}

	function criarLinha(tabela, item) {
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
		const espera = document.createElement("span");
		espera.textContent = "…";
		espera.title = "Contando…";
		tdValor.appendChild(espera);
		tr.append(tdRotulo, tdValor);
		corpo.appendChild(tr);
		return espera;
	}

	function mostrarTotal(espera, item, dados) {
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
				const nome = alvo ? "pdpPrescricoes" + Date.now() : "";
				if (nome) window.open("about:blank", nome);
				item.abrir(nome).catch((erro) => {
					console.warn(TAG, item.id + ": não foi possível abrir a lista:", erro);
					location.href = dados.href;
				});
			});
		}
		espera.replaceWith(link);
	}

	async function iniciar() {
		const abas = nomesDasAbas();
		if (!abas.some((a) => /^Mesa do Escriv[aã]o Criminal$/i.test(a.nome))) return;
		if (!naAnaliseDeJuntadas(abas)) return;
		if (document.querySelector("[" + LINHA_ATTR + "]")) return;
		const tabela = acharTabelaParaRealizar();
		if (!tabela) {
			console.log(TAG, "quadro \"Para Realizar\" não encontrado na Análise de Juntadas");
			return;
		}
		const esperas = ITENS.map((item) => criarLinha(tabela, item));
		// Uma pesquisa depois da outra, para não embaralhar a sessão do Projudi.
		for (let i = 0; i < ITENS.length; i++) {
			const item = ITENS[i];
			let dados = lerCache(item.id);
			if (!dados) {
				try {
					dados = await (item.contar || contar)(item);
					gravarCache(item.id, dados);
				} catch (erro) {
					console.warn(TAG, item.id + ": não foi possível contar:", erro);
					esperas[i].textContent = "não disponível";
					esperas[i].title = "Não foi possível abrir a lista agora.";
					continue;
				}
			}
			console.log(TAG, item.id + ": total", dados.total);
			mostrarTotal(esperas[i], item, dados);
		}
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
	else iniciar();
})();
