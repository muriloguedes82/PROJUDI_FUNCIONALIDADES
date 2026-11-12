// Projudi - Mesa do Analista, aba "Análise de Juntadas": audiências pendentes
//
// A tela "Listagem de Audiências" do Projudi (menu Audiências → Listagem,
// audiencia/busca.do, formulário audienciaForm) tem, em "Situação da
// Audiência", a opção "Pendentes" (idSituacaoAudiencia = 8): as audiências
// DESIGNADAS cuja data já passou e que ainda não foram movimentadas (sem o
// resultado lançado). O total aparece em "N registro(s) encontrado(s)"
// (div.navLeft), mas só abrindo a tela e pesquisando.
//
// Esta funcionalidade traz esse total para a aba "Análise de Juntadas", numa
// linha nova no fim do quadro "Para Realizar" ("Audiências pendentes:"),
// como os demais contadores da aba (<span class="contador"> dentro de um
// link). O total é obtido em segundo plano, repetindo o que a pessoa faria:
//   1. abre a Listagem de Audiências — pelo endereço direto
//      (audiencia/busca.do?actionType=listar) ou, se ele não trouxer o
//      formulário, pelo link "Listagem" do menu Audiências do Projudi (com o
//      _tj codificado), procurado nas janelas acima da Mesa;
//   2. no formulário, marca "Pendentes" e mantém os demais campos como
//      vieram (Local da Audiência = a vara da atuação, Tipo = Todos etc.);
//   3. envia a pesquisa e lê o total.
// Clicar no número envia o mesmo formulário na própria página e abre a
// Listagem de Audiências já pesquisada (Ctrl+clique abre em outra aba).
//
// O total NÃO é guardado: é contado de novo toda vez que a aba é aberta,
// recarregada, reaberta pelo botão Voltar do navegador ou tem o conteúdo
// trocado (ver atualizar()), sem reaproveitar respostas antigas do
// navegador (cache "no-store"), para nunca mostrar um número velho ou de
// outra atuação. Com
// total zero, a linha some se "Ocultar contadores zerados" estiver ligado
// (mesaAnalistaContadores.js). No visual novo da Mesa (visualMesa.js), a
// linha (data-pdp-audiencias-pendentes) vai para o quadro principal "Para
// Realizar", junto das Juntadas e do Retorno de Conclusão.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpAudienciasPendentes) return;
	window.__pdpAudienciasPendentes = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;

	const TAG = "[Projudi Audiências Pendentes]";
	const LINHA_ATTR = "data-pdp-audiencias-pendentes";
	const RAIZ = location.origin + "/projudi/";
	const LISTAGEM = RAIZ + "audiencia/busca.do?actionType=listar";
	const SITUACAO_PENDENTES = "8";
	const ROTULO = "Audiências pendentes:";
	const DICA = "Audiências designadas cuja data já passou e que ainda não foram movimentadas (Listagem de Audiências → Pendentes)";

	function normalizar(texto) {
		return String(texto || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
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

	// Campos do formulário como o navegador os enviaria (sem botões), com
	// "Situação da Audiência" = Pendentes.
	function camposPendentes(form) {
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
		campos.push(["idSituacaoAudiencia", SITUACAO_PENDENTES], ["dataBusca", ""]);
		if (form.querySelector("[name='pageNumber']")) campos.push(["pageNumber", "1"]);
		return campos;
	}

	// Envio da pesquisa "Pendentes", a partir do formulário da Listagem.
	async function prepararEnvio() {
		const candidatos = [LISTAGEM].concat(linksDoMenu());
		for (const href of candidatos) {
			try {
				const doc = await baixar(href);
				const form = formularioDe(doc);
				if (form && form.querySelector("[name='idSituacaoAudiencia']")) {
					return { acao: new URL(form.getAttribute("action") || LISTAGEM, href).href, campos: camposPendentes(form) };
				}
				console.log(TAG, href + " não trouxe a Listagem de Audiências");
			} catch (erro) {
				console.log(TAG, href + " falhou (" + erro.message + ")");
			}
		}
		throw new Error("Listagem de Audiências não encontrada");
	}

	function lerTotal(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /([\d.]+)\s*registro/i.exec(nav.textContent);
		if (m) return parseInt(m[1].replace(/\./g, ""), 10);
		const tabela = doc.querySelector("table.resultTable");
		if (tabela && tabela.tBodies[0]) return tabela.tBodies[0].querySelectorAll(":scope > tr").length;
		if (/nenhum\s+registro|nenhuma\s+audi/i.test(doc.body ? doc.body.textContent : "")) return 0;
		if (formularioDe(doc)) return 0; // formulário sem lista: nenhuma audiência
		throw new Error("total não encontrado na resposta");
	}

	async function contar(envio) {
		const corpo = new URLSearchParams();
		envio.campos.forEach(([nome, valor]) => corpo.append(nome, valor));
		const doc = await baixar(envio.acao, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
		if (!formularioDe(doc)) throw new Error("a pesquisa não trouxe a Listagem de Audiências");
		const marcada = doc.querySelector("[name='idSituacaoAudiencia'][value='" + SITUACAO_PENDENTES + "']");
		if (marcada && !marcada.checked && !marcada.hasAttribute("checked")) throw new Error("a pesquisa não ficou em \"Pendentes\"");
		return lerTotal(doc);
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

	// Linha da extensão no quadro "Para Realizar" (cria se ainda não houver)
	// e devolve a célula do número.
	function celulaDoTotal(tabela) {
		const existente = document.querySelector("tr[" + LINHA_ATTR + "]");
		if (existente && existente.cells[1]) return existente.cells[1];
		const corpo = tabela.tBodies[0] || tabela;
		const tr = document.createElement("tr");
		tr.setAttribute(LINHA_ATTR, "");
		const tdRotulo = document.createElement("td");
		tdRotulo.className = "label";
		const modelo = corpo.querySelector("td.label");
		tdRotulo.setAttribute("style", (modelo && modelo.getAttribute("style")) || "width:150px");
		const label = document.createElement("label");
		label.textContent = ROTULO;
		label.title = DICA;
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

	function pintarVermelho() {
		if (document.getElementById("pdp-aud-vermelho-estilo")) return;
		const estilo = document.createElement("style");
		estilo.id = "pdp-aud-vermelho-estilo";
		estilo.textContent = "span.contador.pdp-aud-vermelho { color: #d00000; font-weight: bold; }";
		(document.head || document.documentElement).appendChild(estilo);
	}

	function mostrarTotal(celula, total, envio) {
		const link = document.createElement("a");
		link.href = LISTAGEM;
		link.title = "Abrir a Listagem de Audiências (Pendentes)";
		const span = document.createElement("span");
		span.className = "contador";
		span.id = "pdpAudienciasPendentes";
		span.textContent = String(total);
		// Em vermelho quando há audiências pendentes: "urgente" é a classe que
		// o visual novo da Mesa (visualMesa.css) já pinta com o vermelho do
		// tom escolhido; no visual original vale a regra de pintarVermelho().
		if (total > 0) {
			span.classList.add("urgente", "pdp-aud-vermelho");
			pintarVermelho();
		}
		link.appendChild(span);
		link.addEventListener("click", (ev) => {
			ev.preventDefault();
			const nome = ev.ctrlKey || ev.metaKey || ev.shiftKey ? "pdpAudiencias" + Date.now() : "";
			// Janela aberta já no clique (senão o navegador a bloqueia).
			if (nome) window.open("about:blank", nome);
			abrir(envio, nome);
		});
		celula.replaceChildren(link);
	}

	// A contagem é refeita a cada vez que a aba é carregada ou atualizada:
	//   - ao abrir ou recarregar a aba (o script roda de novo);
	//   - ao voltar a ela pelo botão Voltar do navegador (página restaurada
	//     da memória do navegador, evento pageshow com persisted);
	//   - se o conteúdo da aba for trocado sem recarregar a página (a linha
	//     some e é recriada pelo observador abaixo).
	// Só vale a contagem mais recente (rodada): uma mais antiga que termine
	// depois não sobrescreve o número.
	let rodada = 0;
	async function atualizar() {
		if (!naAnaliseDeJuntadas()) return;
		const tabela = acharTabelaParaRealizar();
		if (!tabela && !document.querySelector("tr[" + LINHA_ATTR + "]")) {
			console.log(TAG, "quadro \"Para Realizar\" não encontrado na Análise de Juntadas");
			return;
		}
		const minha = ++rodada;
		const celula = celulaDoTotal(tabela);
		mostrarEspera(celula);
		try {
			const envio = await prepararEnvio();
			const total = await contar(envio);
			if (minha !== rodada) return;
			console.log(TAG, "total", total);
			mostrarTotal(celula, total, envio);
		} catch (erro) {
			if (minha !== rodada) return;
			console.warn(TAG, "não foi possível contar:", erro);
			const aviso = document.createElement("span");
			aviso.textContent = "não disponível";
			aviso.title = "Não foi possível abrir a Listagem de Audiências agora.";
			celula.replaceChildren(aviso);
		}
	}

	function vigiarConteudo() {
		let agendado = false;
		new MutationObserver(() => {
			if (agendado || document.querySelector("tr[" + LINHA_ATTR + "]")) return;
			if (!naAnaliseDeJuntadas() || !acharTabelaParaRealizar()) return;
			agendado = true;
			setTimeout(() => {
				agendado = false;
				if (!document.querySelector("tr[" + LINHA_ATTR + "]")) atualizar();
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
