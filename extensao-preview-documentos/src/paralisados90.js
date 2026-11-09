// Projudi - Tela Início: "Processos Paralisados (+90 dias)"
//
// Na tela Início (usuario/mesaAnalista.do?actionType=listaInicio, aberta no
// quadro central do Projudi), a linha nativa "Processos Paralisados (+30
// dias):" traz os totais de processos parados há mais de 30 dias
// ("Secretaria", "Em Remessa", "Em Remessa (exceto processos conclusos)" e
// "Razões Externas"), cada um com um link para a tela "Busca por Processos
// Paralisados" (processo/processoBuscaParalisado.do). Os links abrem o
// mesmo formulário; muda só a opção "Local em que está paralisado"
// (opcaoBusca 1, 2 ou 3).
//
// Esta funcionalidade acrescenta, logo abaixo dela, a linha "Processos
// Paralisados (+90 dias):", com os totais da Secretaria, Em Remessa e Em
// Remessa (exceto processos conclusos). Cada total é obtido em segundo
// plano, repetindo o que a pessoa faria à mão:
//   1. abre (fetch) o link do total correspondente da linha de +30 dias;
//   2. no formulário "Busca por Processos Paralisados", troca "Mínimo de dias
//      paralisado" (numeroDiasParalisados) de 30 para 91 e envia a pesquisa,
//      mantendo os demais campos como vieram;
//   3. lê o total em "N registro(s) encontrado(s)" (div.navLeft).
// As três pesquisas são feitas uma depois da outra (não ao mesmo tempo),
// para não embaralhar o formulário que o Projudi guarda na sessão.
// "Razões Externas" fica de fora. O número aparece como link: clicar nele abre a Busca por Processos
// Paralisados já pesquisada com 91 dias (o mesmo formulário, enviado na
// própria página).
//
// Para não refazer a pesquisa a cada volta à tela Início, o total fica
// guardado por alguns minutos (sessionStorage da aba).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi (ver hostGuard.js)
	if (window.__pdpParalisados90) return;
	window.__pdpParalisados90 = true;

	if (!/^\/projudi\/usuario\/mesaAnalista\.do$/.test(location.pathname)) return;
	if (!/(^|[?&])actionType=listaInicio(&|$)/.test(location.search)) return;

	const TAG = "[Projudi Paralisados +90]";
	const DIAS = "91";
	const ROTULO = "Processos Paralisados (+90 dias):";
	const CACHE = "pdpParalisados90";
	const VALIDADE_MS = 5 * 60 * 1000;
	const LINHA_ATTR = "data-pdp-paralisados90";

	function normalizar(texto) {
		return String(texto || "").replace(/\s+/g, " ").trim();
	}

	// Linha nativa "Processos Paralisados (+30 dias):".
	function acharLinhaNativa() {
		const rotulos = document.querySelectorAll("td.label");
		for (const td of rotulos) {
			if (/^Processos Paralisados \(\+30 dias\):?$/i.test(normalizar(td.textContent))) return td.closest("tr");
		}
		return null;
	}

	// Totais contados, na ordem da linha nativa (o rótulo é o texto que vem
	// antes de cada link na linha de +30 dias).
	const LOCAIS = [
		{ rotulo: "Secretaria", teste: /^Secretaria:?$/i },
		{ rotulo: "Em Remessa", teste: /^Em Remessa:?$/i },
		{ rotulo: "Em Remessa (exceto processos conclusos)", teste: /^Em Remessa \(exceto processos conclusos\):?$/i },
	];

	function textoAntes(link) {
		let texto = "";
		for (let n = link.previousSibling; n; n = n.previousSibling) {
			if (n.nodeType === 1 && n.tagName === "A") break;
			texto = (n.textContent || "") + texto;
		}
		return normalizar(texto.replace(/\u00a0/g, " "));
	}

	function linksDaLinha(linha) {
		const links = Array.from(linha.querySelectorAll('a[href*="processoBuscaParalisado.do"]'));
		const achados = [];
		LOCAIS.forEach((local) => {
			const link = links.find((a) => local.teste.test(textoAntes(a)));
			if (link) achados.push({ rotulo: local.rotulo, href: new URL(link.getAttribute("href"), location.href).href });
		});
		// Rótulos diferentes do esperado: ao menos a Secretaria (primeiro link).
		if (!achados.length && links[0]) achados.push({ rotulo: "Secretaria", href: new URL(links[0].getAttribute("href"), location.href).href });
		return achados;
	}

	async function baixarDocumento(url, opcoes) {
		const resposta = await fetch(url, Object.assign({ credentials: "same-origin" }, opcoes || {}));
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
		return new DOMParser().parseFromString(texto, "text/html");
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

	function comDias(campos) {
		const saida = campos.filter(([nome]) => nome !== "numeroDiasParalisados");
		saida.push(["numeroDiasParalisados", DIAS]);
		return saida;
	}

	function lerTotal(doc) {
		const nav = doc.querySelector("#navigator .navLeft, div.navLeft");
		const m = nav && /([\d.]+)\s*registro/i.exec(nav.textContent);
		if (m) return parseInt(m[1].replace(/\./g, ""), 10);
		// Sem resultados o Projudi não mostra o navegador: conta as linhas.
		const tabela = doc.querySelector("table.resultTable");
		if (!tabela) {
			if (/nenhum\s+registro/i.test(doc.body ? doc.body.textContent : "")) return 0;
			throw new Error("total não encontrado na resposta");
		}
		return tabela.querySelectorAll("tbody tr").length;
	}

	async function pesquisar(href) {
		const busca = await baixarDocumento(href);
		const form = busca.querySelector("#processoBuscaParalisadoForm, form[name='processoBuscaParalisadoForm']");
		if (!form) throw new Error("formulário da Busca por Processos Paralisados não encontrado");
		const acao = new URL(form.getAttribute("action") || href, href).href;
		const campos = comDias(camposDoFormulario(form));
		const corpo = new URLSearchParams();
		campos.forEach(([nome, valor]) => corpo.append(nome, valor));
		const resultado = await baixarDocumento(acao, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: corpo.toString(),
		});
		return { total: lerTotal(resultado), acao, campos };
	}

	// { [href]: { quando, total, acao, campos } }, um por total.
	function lerTodoCache() {
		try {
			const c = JSON.parse(sessionStorage.getItem(CACHE) || "null");
			return c && typeof c === "object" && !c.href ? c : {};
		} catch (e) {
			return {};
		}
	}

	function lerCache(href) {
		const c = lerTodoCache()[href];
		return c && Date.now() - c.quando < VALIDADE_MS ? c : null;
	}

	function gravarCache(href, dados) {
		try {
			const todos = lerTodoCache();
			todos[href] = Object.assign({ quando: Date.now() }, dados);
			sessionStorage.setItem(CACHE, JSON.stringify(todos));
		} catch (e) {}
	}

	// Abre a Busca por Processos Paralisados já pesquisada com 91 dias:
	// envia, na própria página, o mesmo formulário usado na contagem.
	function abrirPesquisa(acao, campos, alvo) {
		const form = document.createElement("form");
		form.method = "post";
		form.action = acao;
		if (alvo) form.target = alvo;
		form.style.display = "none";
		campos.forEach(([nome, valor]) => {
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

	function criarLinha(linhaNativa, locais) {
		const tr = document.createElement("tr");
		tr.setAttribute(LINHA_ATTR, "");
		const tdRotulo = document.createElement("td");
		tdRotulo.className = "label";
		const larguraNativa = linhaNativa.querySelector("td.label");
		if (larguraNativa && larguraNativa.getAttribute("style")) tdRotulo.setAttribute("style", larguraNativa.getAttribute("style"));
		const label = document.createElement("label");
		label.textContent = ROTULO;
		tdRotulo.appendChild(label);
		const tdValor = document.createElement("td");
		const valores = locais.map((local, i) => {
			if (i) tdValor.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0\u00a0 "));
			tdValor.appendChild(document.createTextNode(local.rotulo + ": "));
			const valor = document.createElement("span");
			valor.textContent = "…";
			valor.title = "Contando os processos paralisados há mais de 90 dias…";
			tdValor.appendChild(valor);
			return valor;
		});
		tr.append(tdRotulo, tdValor);
		linhaNativa.after(tr);
		return valores;
	}

	function mostrarTotal(span, dados) {
		const link = document.createElement("a");
		link.href = "#";
		link.style.color = "red";
		link.style.textDecoration = "underline";
		link.textContent = String(dados.total);
		link.title = "Abrir a Busca por Processos Paralisados com mínimo de " + DIAS + " dias";
		link.addEventListener("click", (ev) => {
			ev.preventDefault();
			abrirPesquisa(dados.acao, dados.campos, ev.ctrlKey || ev.metaKey || ev.shiftKey ? "_blank" : "");
		});
		span.replaceWith(link);
	}

	async function iniciar() {
		const linha = acharLinhaNativa();
		if (!linha) {
			console.log(TAG, "linha \"Processos Paralisados (+30 dias)\" não encontrada nesta tela Início");
			return;
		}
		if (linha.nextElementSibling && linha.nextElementSibling.hasAttribute(LINHA_ATTR)) return;
		const locais = linksDaLinha(linha);
		if (!locais.length) {
			console.log(TAG, "linha dos paralisados sem links para a Busca por Processos Paralisados");
			return;
		}
		const spans = criarLinha(linha, locais);
		for (let i = 0; i < locais.length; i++) {
			const { rotulo, href } = locais[i];
			let dados = lerCache(href);
			if (!dados) {
				try {
					dados = await pesquisar(href);
					gravarCache(href, dados);
				} catch (erro) {
					console.warn(TAG, "não foi possível contar os paralisados +90 dias (" + rotulo + "):", erro);
					spans[i].textContent = "não disponível";
					spans[i].title = "Não foi possível consultar a Busca por Processos Paralisados agora.";
					continue;
				}
			}
			console.log(TAG, "total de paralisados +90 dias (" + rotulo + "):", dados.total);
			mostrarTotal(spans[i], dados);
		}
	}

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
	else iniciar();
})();
