// Projudi - Mesa do Analista, aba "Análise de Juntadas": audiências
// pendentes e audiências para hoje
//
// A tela "Listagem de Audiências" do Projudi (menu Audiências → Listagem,
// audiencia/busca.do, formulário audienciaForm) tem, em "Situação da
// Audiência", as opções "Pendentes" (idSituacaoAudiencia = 8: audiências
// DESIGNADAS cuja data já passou e que ainda não foram movimentadas, sem o
// resultado lançado) e "Para Hoje" (7). O total aparece em "N registro(s)
// encontrado(s)" (div.navLeft), mas só abrindo a tela e pesquisando.
//
// Esta funcionalidade acrescenta, no fim do quadro "Para Realizar" da aba
// "Análise de Juntadas", duas linhas, como os demais contadores da aba
// (<span class="contador"> dentro de um link):
//   - "Audiências pendentes:" — total e, ao lado, quantas são de réu preso
//     (em vermelho), quantas estão pendentes há mais de 30 dias e a data da
//     mais antiga (com os dias de atraso);
//   - "Audiências para hoje:" — total da pauta do dia.
// Ao pousar o mouse num número, abre uma janelinha com a lista (processo,
// data, atraso ou hora, tipo, réu preso). Clicar no número abre a Listagem
// de Audiências já pesquisada (Ctrl+clique abre em outra aba).
//
// Como a contagem é feita, repetindo o que a pessoa faria:
//   1. abre a Listagem de Audiências — pelo endereço direto
//      (audiencia/busca.do?actionType=listar) ou, se ele não trouxer o
//      formulário, pelo link "Listagem" do menu Audiências do Projudi (com o
//      _tj codificado), procurado nas janelas acima da Mesa;
//   2. no formulário, marca "Pendentes" (ou "Para Hoje") e mantém os demais
//      campos como vieram (Local da Audiência = a vara da atuação, Tipo =
//      Todos etc.) e envia a pesquisa;
//   3. lê o total e as linhas e, se houver mais páginas, repete a "Próxima
//      Página" do próprio Projudi (o link do #navigator) até ter todas as
//      linhas (réu preso, mais antiga e a lista dependem de todas). Se não
//      conseguir passar de página, usa as linhas que tem e avisa
//      ("nas N primeiras").
// As duas pesquisas são feitas uma depois da outra, para não embaralhar o
// formulário que o Projudi guarda na sessão.
//
// Os números NÃO são guardados: são contados de novo toda vez que a aba é
// aberta, recarregada, reaberta pelo botão Voltar do navegador ou tem o
// conteúdo trocado (ver atualizar()), sem reaproveitar respostas antigas do
// navegador (cache "no-store"), para nunca mostrar um número velho ou de
// outra atuação. Com total zero, a linha some se "Ocultar contadores
// zerados" estiver ligado (mesaAnalistaContadores.js). No visual novo da
// Mesa (visualMesa.js), as linhas (data-pdp-audiencias-pendentes e
// data-pdp-audiencias-hoje) vão para o quadro principal "Para Realizar",
// junto das Juntadas e do Retorno de Conclusão.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpAudienciasPendentes) return;
	window.__pdpAudienciasPendentes = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Audiências Pendentes]";
	const RAIZ = location.origin + "/projudi/";
	const LISTAGEM = RAIZ + "audiencia/busca.do?actionType=listar";
	const MAX_PAGINAS = 30;
	const DIAS_ANTIGA = 30;
	const DIA_MS = 24 * 60 * 60 * 1000;

	const ITENS = [
		{
			id: "pendentes",
			situacao: "8",
			attr: "data-pdp-audiencias-pendentes",
			spanId: "pdpAudienciasPendentes",
			rotulo: "Audiências pendentes:",
			dica: "Audiências designadas cuja data já passou e que ainda não foram movimentadas (Listagem de Audiências → Pendentes)",
			titulo: "Audiências pendentes",
			nomeSituacao: "Pendentes",
			pendentes: true,
		},
		{
			id: "hoje",
			situacao: "7",
			attr: "data-pdp-audiencias-hoje",
			spanId: "pdpAudienciasHoje",
			rotulo: "Audiências para hoje:",
			dica: "Audiências marcadas para hoje (Listagem de Audiências → Para Hoje)",
			titulo: "Audiências para hoje",
			nomeSituacao: "Para Hoje",
		},
	];

	function normalizar(texto) {
		return String(texto || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function semAcento(texto) {
		return normalizar(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function naAnaliseDeJuntadas() {
		const atual = document.querySelector("#tabHorz li.currentTab");
		if (atual) return /^An[aá]lise de Juntadas$/i.test(normalizar(atual.textContent));
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

	// ---- Projudi: pesquisa na Listagem de Audiências -------------------------

	function decodificar(bytes, tipo) {
		let charset = /charset=([\w-]+)/i.exec(tipo || "");
		if (!charset) charset = /charset=["']?([\w-]+)/i.exec(new TextDecoder("windows-1252").decode(bytes.slice(0, 4096)));
		try {
			return new TextDecoder((charset && charset[1]) || "windows-1252").decode(bytes);
		} catch (e) {
			return new TextDecoder("windows-1252").decode(bytes);
		}
	}

	async function baixar(url, opcoes) {
		const resposta = await fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opcoes || {}));
		if (!resposta.ok) throw new Error("HTTP " + resposta.status);
		const bytes = new Uint8Array(await resposta.arrayBuffer());
		const texto = decodificar(bytes, resposta.headers.get("content-type"));
		return new DOMParser().parseFromString(texto, "text/html");
	}

	function enviarPost(url, corpo) {
		return baixar(url, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
	}

	function formularioDe(doc) {
		return doc.getElementById("audienciaForm") || doc.querySelector("form[name='audienciaForm']");
	}

	// Link "Listagem" do menu Audiências, nas janelas acima da Mesa (o menu
	// fica na página que contém o quadro central do Projudi).
	function linksDoMenu() {
		const achados = [];
		let janela = window;
		for (let n = 0; n < 4; n++) {
			let pai;
			try {
				pai = janela.parent;
				if (!pai || pai === janela) break;
				const doc = pai.document; // erro se for de outro endereço
				for (const a of doc.querySelectorAll("a[href*='audiencia/busca.do']")) {
					if (/^Listagem$/i.test(normalizar(a.textContent))) achados.push(a.href);
				}
			} catch (e) {
				break;
			}
			janela = pai;
		}
		return achados;
	}

	// Campos do formulário como o navegador os enviaria (sem botões e sem a
	// situação, a data e a página, que são escolhidas depois).
	function camposBase(form) {
		const campos = [];
		for (const el of form.elements) {
			if (!el.name || el.disabled) continue;
			const tipo = (el.type || "").toLowerCase();
			if (["submit", "button", "reset", "image", "file"].includes(tipo)) continue;
			if (el.name === "idSituacaoAudiencia" || el.name === "dataBusca" || el.name === "pageNumber") continue;
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
		return { campos, temPagina: !!form.querySelector("[name='pageNumber']") };
	}

	// Formulário da Listagem (baixado uma vez por atualização da aba).
	async function lerFormulario() {
		const candidatos = [LISTAGEM].concat(linksDoMenu());
		for (const href of candidatos) {
			try {
				const doc = await baixar(href);
				const form = formularioDe(doc);
				if (form && form.querySelector("[name='idSituacaoAudiencia']")) {
					return Object.assign({ acao: new URL(form.getAttribute("action") || LISTAGEM, href).href }, camposBase(form));
				}
				console.log(TAG, href + " não trouxe a Listagem de Audiências");
			} catch (erro) {
				console.log(TAG, href + " falhou (" + erro.message + ")");
			}
		}
		throw new Error("Listagem de Audiências não encontrada");
	}

	function envioDe(base, item) {
		const campos = base.campos.concat([["idSituacaoAudiencia", item.situacao], ["dataBusca", ""]]);
		if (base.temPagina) campos.push(["pageNumber", "1"]);
		return { acao: base.acao, campos };
	}

	function lerTotal(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /([\d.]+)\s*registro/i.exec(nav.textContent);
		if (m) return parseInt(m[1].replace(/\./g, ""), 10);
		const tabela = tabelaDe(doc);
		if (tabela && tabela.tBodies[0]) return linhasDaTabela(tabela).length;
		if (/nenhum\s+registro|nenhuma\s+audi/i.test(doc.body ? doc.body.textContent : "")) return 0;
		if (formularioDe(doc)) return 0; // formulário sem lista: nenhuma audiência
		throw new Error("total não encontrado na resposta");
	}

	// "exibindo de 21 até 24": o primeiro registro da página.
	function inicioDaPagina(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /exibindo\s+de\s+([\d.]+)/i.exec(nav.textContent);
		return m ? parseInt(m[1].replace(/\./g, ""), 10) : null;
	}

	function paginaAtual(doc) {
		const b = doc.querySelector("#navigator .navRight b");
		const n = b && parseInt(b.textContent, 10);
		return Number.isFinite(n) ? n : 1;
	}

	function tabelaDe(doc) {
		const form = formularioDe(doc);
		return (form && form.querySelector("table.resultTable")) || doc.querySelector("table.resultTable");
	}

	function linhasDaTabela(tabela) {
		return Array.from(tabela.tBodies[0] ? tabela.tBodies[0].rows : []).filter((tr) => tr.cells.length >= 4);
	}

	// Linhas da página: processo, data, tipo e réu preso, pelas colunas do
	// cabeçalho (Processo/Recurso, Partes, Local, Data, Tipo, Modalidade,
	// Situação).
	function lerLinhas(doc, base) {
		const tabela = tabelaDe(doc);
		if (!tabela) return [];
		const cab = Array.from(tabela.querySelectorAll("thead th")).map((th) => semAcento(th.textContent));
		const col = (re, padrao) => {
			const i = cab.findIndex((t) => re.test(t));
			return i >= 0 ? i : padrao;
		};
		const iProc = col(/^processo/, 0);
		const iData = col(/^data/, 3);
		const iTipo = col(/^tipo/, 4);
		const linhas = [];
		for (const tr of linhasDaTabela(tabela)) {
			const celulas = tr.cells;
			const a = celulas[iProc] && celulas[iProc].querySelector("a[href*='processo.do']");
			const numero = normalizar((celulas[iProc] && (celulas[iProc].querySelector("em") || celulas[iProc]).textContent) || "");
			const dataTexto = normalizar(celulas[iData] && celulas[iData].textContent);
			const m = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(dataTexto);
			const data = m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
			linhas.push({
				numero,
				href: a ? new URL(a.getAttribute("href"), base).href : "",
				dataTexto,
				data,
				tipo: normalizar(celulas[iTipo] && celulas[iTipo].textContent),
				reuPreso: !!tr.querySelector(".class_flag_REU_PRESO, img[title='Réu Preso'], img[src*='preso.png']"),
			});
		}
		return linhas;
	}

	// Como a "Próxima Página" do Projudi seria pedida, a partir do link do
	// #navigator: atribuições a campos do formulário ("document.forms[...]
	// [...].value='2'"), endereço comum, location.href=, submitPage(...).
	// Sem padrão conhecido, tenta pageNumber = página atual + 1 (a página que
	// voltar é conferida pelo "exibindo de").
	function pedidoDaProxima(doc, envio) {
		const link = doc.querySelector("#navigator a.arrowNextOn");
		if (!link) return null;
		const href = link.getAttribute("href") || "";
		const onclick = link.getAttribute("onclick") || "";
		const trecho = href + "\n" + onclick;
		const corpo = new URLSearchParams(envio.campos);
		const form = formularioDe(doc);
		if (form) {
			form.querySelectorAll("input[type='hidden'][name]").forEach((campo) => corpo.set(campo.name, campo.value));
		}
		let achou = false;
		let m;
		const atribuicao = /document\.forms\[['"][^'"]+['"]\]\[['"]([^'"]+)['"]\]\.value\s*=\s*['"]([^'"]*)['"]/g;
		while ((m = atribuicao.exec(trecho))) {
			corpo.set(m[1], m[2]);
			achou = true;
		}
		const porId = /getElementById\(\s*['"]([^'"]+)['"]\s*\)\.value\s*=\s*['"]([^'"]*)['"]/g;
		while ((m = porId.exec(trecho))) {
			const campo = form && form.querySelector("#" + CSS.escape(m[1]));
			corpo.set((campo && campo.name) || m[1], m[2]);
			achou = true;
		}
		if (achou) return { url: envio.acao, corpo };
		if (href && !/^\s*(javascript:|#)/i.test(href)) return { url: new URL(href, envio.acao).href };
		const local = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec(trecho);
		if (local) return { url: new URL(local[1], envio.acao).href };
		const submit = /submitPage\(\s*['"]([^'"]+)['"]/.exec(trecho);
		if (submit) return { url: new URL(submit[1], envio.acao).href, corpo };
		console.log(TAG, "\"Próxima Página\" sem padrão conhecido — tentando pageNumber. href:", href || "(nenhum)", "| onclick:", onclick || "(nenhum)");
		corpo.set("pageNumber", String(paginaAtual(doc) + 1));
		return { url: envio.acao, corpo };
	}

	function chave(l) {
		return l.numero + "|" + l.dataTexto + "|" + l.tipo;
	}

	async function pesquisar(envio, item) {
		const doc = await enviarPost(envio.acao, new URLSearchParams(envio.campos));
		if (!formularioDe(doc)) throw new Error("a pesquisa não trouxe a Listagem de Audiências");
		const marcada = doc.querySelector("[name='idSituacaoAudiencia'][value='" + item.situacao + "']");
		if (marcada && !marcada.checked && !marcada.hasAttribute("checked")) throw new Error("a pesquisa não ficou em \"" + item.nomeSituacao + "\"");
		const total = lerTotal(doc);
		const linhas = lerLinhas(doc, envio.acao);
		const vistas = new Set(linhas.map(chave));
		let atual = doc;
		let inicio = inicioDaPagina(doc) || 1;
		for (let n = 1; n < MAX_PAGINAS && linhas.length < total; n++) {
			const pedido = pedidoDaProxima(atual, envio);
			if (!pedido) break;
			let proxima;
			try {
				proxima = pedido.corpo ? await enviarPost(pedido.url, pedido.corpo) : await baixar(pedido.url);
			} catch (erro) {
				console.log(TAG, item.id + ": a página seguinte falhou (" + erro.message + ")");
				break;
			}
			const inicioNovo = inicioDaPagina(proxima);
			if (!formularioDe(proxima) || !inicioNovo || inicioNovo <= inicio) {
				console.log(TAG, item.id + ": a página seguinte não avançou; usando as " + linhas.length + " linhas já lidas");
				break;
			}
			inicio = inicioNovo;
			atual = proxima;
			lerLinhas(proxima, envio.acao).forEach((l) => {
				if (vistas.has(chave(l))) return;
				vistas.add(chave(l));
				linhas.push(l);
			});
		}
		return { total, linhas, completo: linhas.length >= total };
	}

	// Clique no número: envia, na própria página (ou em outra aba), a pesquisa.
	function abrir(envio, alvo) {
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

	// ---- Contas ---------------------------------------------------------------

	function hojeMeiaNoite() {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}

	function diasDeAtraso(data) {
		if (!data) return null;
		const dia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
		return Math.max(0, Math.round((hojeMeiaNoite() - dia) / DIA_MS));
	}

	function resumo(resultado) {
		const linhas = resultado.linhas;
		const comData = linhas.filter((l) => l.data);
		const maisAntiga = comData.reduce((a, l) => (!a || l.data < a.data ? l : a), null);
		return {
			reuPreso: linhas.filter((l) => l.reuPreso).length,
			antigas: comData.filter((l) => diasDeAtraso(l.data) > DIAS_ANTIGA).length,
			maisAntiga,
		};
	}

	function plural(n, um, varios) {
		return n + " " + (n === 1 ? um : varios);
	}

	// ---- Tela -----------------------------------------------------------------

	function instalarEstilo() {
		if (document.getElementById("pdp-aud-estilo")) return;
		const estilo = document.createElement("style");
		estilo.id = "pdp-aud-estilo";
		estilo.textContent = [
			".pdp-aud-detalhe { margin-left: 10px; font-size: 11px; color: #555; font-weight: normal; white-space: normal; }",
			".pdp-aud-detalhe .pdp-aud-preso { color: #d00000; font-weight: bold; }",
			".pdp-aud-detalhe .pdp-aud-sep { color: #aaa; margin: 0 4px; }",
			"html.pdp-vm .pdp-vm-blocos .pdp-aud-detalhe { display: block; margin: 2px 0 0; font-size: 12px; line-height: 1.35; color: var(--vm-suave, #555); }",
			"html.pdp-vm .pdp-vm-blocos .pdp-aud-detalhe .pdp-aud-preso { color: var(--vm-urgente, #d00000); }",
			// No cartão estreito do visual novo: uma informação por linha.
			"html.pdp-vm .pdp-vm-blocos .pdp-aud-detalhe > span:not(.pdp-aud-sep) { display: block; white-space: nowrap; }",
			"html.pdp-vm .pdp-vm-blocos .pdp-aud-detalhe > .pdp-aud-sep { display: none; }",
			"#pdp-aud-janela { position: fixed; z-index: 2147483000; background: #fff; color: #222; border: 1px solid #b9bfa8; border-radius: 6px;",
			"  box-shadow: 0 6px 22px rgba(0,0,0,.22); font: 12px Arial, Helvetica, sans-serif; max-width: 640px; min-width: 380px; }",
			"#pdp-aud-janela .pdp-aud-jtitulo { padding: 7px 10px; font-weight: bold; background: #eef0e4; border-bottom: 1px solid #d6dac8; border-radius: 6px 6px 0 0; }",
			"#pdp-aud-janela .pdp-aud-jcorpo { max-height: 320px; overflow: auto; }",
			"#pdp-aud-janela table { border-collapse: collapse; width: 100%; }",
			"#pdp-aud-janela th { position: sticky; top: 0; background: #f7f8f1; text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 11px; color: #555; }",
			"#pdp-aud-janela td { padding: 4px 8px; border-bottom: 1px solid #eee; vertical-align: top; }",
			"#pdp-aud-janela td.pdp-aud-num { white-space: nowrap; }",
			"#pdp-aud-janela td.pdp-aud-antiga { color: #d00000; font-weight: bold; }",
			"#pdp-aud-janela .pdp-aud-selo { display: inline-block; padding: 0 6px; border-radius: 9px; background: #fde2e2; color: #b00000; font-size: 11px; font-weight: bold; white-space: nowrap; }",
			"#pdp-aud-janela .pdp-aud-jrodape { padding: 6px 10px; color: #666; font-size: 11px; border-top: 1px solid #eee; }",
		].join("\n");
		(document.head || document.documentElement).appendChild(estilo);
	}

	// Linha da extensão no quadro "Para Realizar" (cria se ainda não houver)
	// e devolve a célula do número.
	function celulaDoTotal(tabela, item) {
		const existente = document.querySelector("tr[" + item.attr + "]");
		if (existente && existente.cells[1]) return existente.cells[1];
		const corpo = tabela.tBodies[0] || tabela;
		const tr = document.createElement("tr");
		tr.setAttribute(item.attr, "");
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

	function mostrarEspera(celula) {
		const espera = document.createElement("span");
		espera.textContent = "…";
		espera.title = "Contando…";
		celula.replaceChildren(espera);
	}

	function texto(tag, classe, conteudo) {
		const el = document.createElement(tag);
		if (classe) el.className = classe;
		if (conteudo != null) el.textContent = conteudo;
		return el;
	}

	// Ao lado do total das pendentes: réu preso, há mais de 30 dias e a mais antiga.
	function detalheDasPendentes(resultado) {
		if (!resultado.total) return null;
		const r = resumo(resultado);
		const partes = [];
		if (r.reuPreso) partes.push(texto("span", "pdp-aud-preso", plural(r.reuPreso, "com réu preso", "com réu preso")));
		if (r.antigas) partes.push(texto("span", "", plural(r.antigas, "há mais de " + DIAS_ANTIGA + " dias", "há mais de " + DIAS_ANTIGA + " dias")));
		if (r.maisAntiga) {
			const dias = diasDeAtraso(r.maisAntiga.data);
			partes.push(texto("span", "", "mais antiga: " + r.maisAntiga.dataTexto.slice(0, 10) + " (" + plural(dias, "dia", "dias") + ")"));
		}
		if (!resultado.completo) partes.push(texto("span", "", "nas " + resultado.linhas.length + " primeiras"));
		if (!partes.length) return null;
		const detalhe = texto("span", "pdp-aud-detalhe");
		partes.forEach((p, i) => {
			if (i) detalhe.appendChild(texto("span", "pdp-aud-sep", "·"));
			detalhe.appendChild(p);
		});
		return detalhe;
	}

	// ---- Janelinha com a lista (ao pousar o mouse no número) ------------------

	let janela = null;
	let fecharTimer = null;

	function fecharJanela() {
		clearTimeout(fecharTimer);
		if (janela) janela.remove();
		janela = null;
	}

	function agendarFechar() {
		clearTimeout(fecharTimer);
		fecharTimer = setTimeout(fecharJanela, 300);
	}

	function abrirJanela(link, item, resultado) {
		fecharJanela();
		if (!resultado.linhas.length) return;
		const j = texto("div");
		j.id = "pdp-aud-janela";
		j.setAttribute("role", "dialog");
		j.appendChild(texto("div", "pdp-aud-jtitulo", item.titulo + " (" + resultado.total + ")"));
		const corpo = texto("div", "pdp-aud-jcorpo");
		const tabela = texto("table");
		const cab = texto("tr");
		["Processo", item.pendentes ? "Data" : "Hora", item.pendentes ? "Atraso" : null, "Tipo", "Réu"].forEach((t) => {
			if (t) cab.appendChild(texto("th", "", t));
		});
		tabela.appendChild(texto("thead")).appendChild(cab);
		const tbody = tabela.appendChild(texto("tbody"));
		const linhas = resultado.linhas.slice().sort((a, b) => (a.data && b.data ? a.data - b.data : 0));
		linhas.forEach((l) => {
			const tr = tbody.appendChild(texto("tr"));
			const tdNum = tr.appendChild(texto("td", "pdp-aud-num"));
			if (l.href) {
				const a = texto("a", "", l.numero);
				a.href = l.href;
				tdNum.appendChild(a);
			} else tdNum.textContent = l.numero;
			if (item.pendentes) {
				tr.appendChild(texto("td", "pdp-aud-num", l.dataTexto));
				const dias = diasDeAtraso(l.data);
				tr.appendChild(texto("td", "pdp-aud-num" + (dias > DIAS_ANTIGA ? " pdp-aud-antiga" : ""), dias == null ? "" : plural(dias, "dia", "dias")));
			} else {
				tr.appendChild(texto("td", "pdp-aud-num", l.dataTexto.slice(11) || l.dataTexto));
			}
			tr.appendChild(texto("td", "", l.tipo));
			const tdReu = tr.appendChild(texto("td", "pdp-aud-num"));
			if (l.reuPreso) tdReu.appendChild(texto("span", "pdp-aud-selo", "Réu preso"));
		});
		corpo.appendChild(tabela);
		j.appendChild(corpo);
		const faltam = resultado.total - resultado.linhas.length;
		j.appendChild(texto("div", "pdp-aud-jrodape",
			(faltam > 0 ? "Mostrando " + resultado.linhas.length + " de " + resultado.total + ". " : "") + "Clique no número para abrir a Listagem de Audiências."));
		j.addEventListener("mouseenter", () => clearTimeout(fecharTimer));
		j.addEventListener("mouseleave", agendarFechar);
		document.body.appendChild(j);
		janela = j;
		// Abaixo do número (ou acima, se não couber), sem sair da tela.
		const r = link.getBoundingClientRect();
		const largura = j.offsetWidth;
		const altura = j.offsetHeight;
		let x = Math.min(r.left, window.innerWidth - largura - 8);
		let y = r.bottom + 6;
		if (y + altura > window.innerHeight - 8 && r.top - altura - 6 > 8) y = r.top - altura - 6;
		j.style.left = Math.max(8, x) + "px";
		j.style.top = Math.max(8, y) + "px";
	}

	function mostrarTotal(celula, item, resultado, envio) {
		const link = document.createElement("a");
		link.href = LISTAGEM;
		link.title = "Abrir a Listagem de Audiências (" + item.nomeSituacao + ")";
		const span = document.createElement("span");
		span.className = "contador";
		span.id = item.spanId;
		span.textContent = String(resultado.total);
		link.appendChild(span);
		link.addEventListener("click", (ev) => {
			ev.preventDefault();
			fecharJanela();
			const nome = ev.ctrlKey || ev.metaKey || ev.shiftKey ? "pdpAudiencias" + Date.now() : "";
			// Janela aberta já no clique (senão o navegador a bloqueia).
			if (nome) window.open("about:blank", nome);
			abrir(envio, nome);
		});
		let abrirTimer = null;
		link.addEventListener("mouseenter", () => {
			clearTimeout(fecharTimer);
			clearTimeout(abrirTimer);
			abrirTimer = setTimeout(() => abrirJanela(link, item, resultado), 250);
		});
		link.addEventListener("mouseleave", () => {
			clearTimeout(abrirTimer);
			agendarFechar();
		});
		const filhos = [link];
		const detalhe = item.pendentes ? detalheDasPendentes(resultado) : null;
		if (detalhe) filhos.push(detalhe);
		celula.replaceChildren(...filhos);
	}

	function naoDisponivel(celula) {
		const aviso = document.createElement("span");
		aviso.textContent = "não disponível";
		aviso.title = "Não foi possível abrir a Listagem de Audiências agora.";
		celula.replaceChildren(aviso);
	}

	// A contagem é refeita a cada vez que a aba é carregada ou atualizada:
	//   - ao abrir ou recarregar a aba (o script roda de novo);
	//   - ao voltar a ela pelo botão Voltar do navegador (página restaurada
	//     da memória do navegador, evento pageshow com persisted);
	//   - se o conteúdo da aba for trocado sem recarregar a página (as linhas
	//     somem e são recriadas pelo observador abaixo).
	// Só vale a contagem mais recente (rodada): uma mais antiga que termine
	// depois não sobrescreve os números.
	let rodada = 0;
	async function atualizar() {
		if (!naAnaliseDeJuntadas()) return;
		const tabela = acharTabelaParaRealizar();
		if (!tabela && !ITENS.every((item) => document.querySelector("tr[" + item.attr + "]"))) {
			console.log(TAG, "quadro \"Para Realizar\" não encontrado na Análise de Juntadas");
			return;
		}
		instalarEstilo();
		fecharJanela();
		const minha = ++rodada;
		const celulas = ITENS.map((item) => celulaDoTotal(tabela, item));
		celulas.forEach(mostrarEspera);
		let base;
		try {
			base = await lerFormulario();
		} catch (erro) {
			if (minha !== rodada) return;
			console.warn(TAG, "não foi possível contar:", erro);
			celulas.forEach(naoDisponivel);
			return;
		}
		// Uma pesquisa depois da outra, para não embaralhar a sessão do Projudi.
		for (let i = 0; i < ITENS.length; i++) {
			const item = ITENS[i];
			const envio = envioDe(base, item);
			try {
				const resultado = await pesquisar(envio, item);
				if (minha !== rodada) return;
				console.log(TAG, item.id + ": total", resultado.total, "| linhas lidas", resultado.linhas.length);
				mostrarTotal(celulas[i], item, resultado, envio);
			} catch (erro) {
				if (minha !== rodada) return;
				console.warn(TAG, item.id + ": não foi possível contar:", erro);
				naoDisponivel(celulas[i]);
			}
		}
	}

	function vigiarConteudo() {
		let agendado = false;
		const faltaLinha = () => ITENS.some((item) => !document.querySelector("tr[" + item.attr + "]"));
		new MutationObserver(() => {
			if (agendado || !faltaLinha()) return;
			if (!naAnaliseDeJuntadas() || !acharTabelaParaRealizar()) return;
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
