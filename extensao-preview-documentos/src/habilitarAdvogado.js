// Projudi - Atalho "(Des)Habilitar Advogado"
//
// Habilitar ou desabilitar o advogado de um Réu hoje exige: abrir a aba
// "Partes e Outros" e, na barra de botões ao final dela, clicar no botão
// nativo "Advogados" (name/id="enableLawyerButton") — um único botão por
// processo (não por parte), que leva à tela `advogadosParte.do` onde o
// advogado pode ser adicionado, alterado (inclui habilitar/desabilitar) ou
// removido.
//
// Este botão pula esses passos manuais e mostra a tela final num POPUP
// sobreposto à tela atual — a mesma técnica (mesmo popup, inclusive) já
// usada pelo painel "Ações rápidas" para diálogos como "Ordenar
// Cumprimentos" e "Realizar Remessa" (ver README, "Ações rápidas", e
// `showActionModal`/`openActionModal` em quickActions.js): a aba visível
// NUNCA navega, o usuário faz tudo (habilitar, desabilitar, adicionar,
// remover) dentro do popup e fecha com "✕ Fechar" quando terminar.
//
// Como resolve a URL final (`advogadosParte.do`), antes de sequer abrir o
// popup:
// 1. Se a página atual já é a aba "Partes e Outros" (selectedIcon=
//    tabPartes), lê o `onclick` do botão nativo "Advogados" direto do DOM.
// 2. Senão, busca essa aba em segundo plano via `fetch()` (POST para o
//    próprio `#processoForm`, sem iframe — mesma técnica já usada e
//    validada ao vivo pelo Oráculo em `oraculoDirect.js`, documentada em
//    "Indicador de suspensão ativa") e lê o mesmo `onclick` dali.
//
// Só então o popup é aberto, com o `<iframe>` já apontando (`src`, um GET
// comum) direto para a URL resolvida — nunca um `<form target="...">`
// mirando o nome do iframe: essa técnica foi tentada numa versão anterior
// e, quando o nome do iframe não é reconhecido a tempo pelo navegador como
// alvo válido, ele abre uma ABA NOVA em vez de navegar o iframe (o
// comportamento padrão do HTML para um `target` sem contexto de navegação
// correspondente) - exatamente o bug relatado ao vivo. Um `src` comum não
// tem essa armadilha.
//
// Importante: a existência (ou não) de um advogado já habilitado para a
// parte NÃO impede o botão de funcionar — o popup mostra a tela nativa tal
// como ela está, inclusive permitindo adicionar o primeiro advogado.
//
// Preferências de advogados: o botão "⚖️ Advogados" abre o painel das
// Ações rápidas (grupo "advogados" em quickActions.js) com "Abrir",
// "+ Nova preferência" e as preferências salvas — este arquivo registra a
// ação personalizada "Advogados" (ver "Ações personalizadas" em
// quickActions.js):
// - a preferência guarda a lista da seção "Advogados" da tela
//   (advogadosParteForm) e a "Atuação". Cada advogado da lista é uma
//   bolinha `advogadoSelecionado` de valor "OAB-Complemento-UF-Tipo" (ex.:
//   "12345-N-PR-0") — os mesmos dados que o "Selecionar" da tela "Seleção
//   de Advogado" manda para `advogadosParte.do?actionType=
//   adicionarAdvogadoCadastroMultiplo&oab=…&complemento=…&uf=…&
//   idTipoAdvogado=…` para incluir o advogado na lista;
// - ao usar a preferência, o popup abre a tela e `step()` chama esse mesmo
//   endereço para cada advogado gravado que ainda não está na lista, um de
//   cada vez (o Projudi guarda a lista na sessão e devolve a tela já com o
//   advogado incluído), e no fim escolhe a Atuação. As "Partes do
//   Processo" mudam de um processo para outro: ficam com o usuário, que
//   marca as partes e clica em "Salvar" (nada é salvo sem esse clique).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpHabilitarAdvogado || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpHabilitarAdvogado = true;

	function localURL(value, path) {
		const url = new URL(value, location.href);
		if (url.origin !== location.origin || url.pathname !== path) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	async function readPage(url, options) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 25000);
		try {
			const response = await fetch(url, Object.assign({}, options, { credentials: "same-origin", signal: controller.signal }));
			if (!response.ok) throw new Error("O Projudi não respondeu (" + response.status + ").");
			localURL(response.url, new URL(url, location.href).pathname);
			const bytes = await response.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			return new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), "text/html");
		} finally {
			clearTimeout(timer);
		}
	}

	// O botão "Advogados" é único por processo (não por parte) — fica na
	// barra de botões ao final da aba "Partes e Outros", junto de "Partes e
	// Outros", "Histórico de Substabelecimentos" e "Desmembrar".
	function findAdvogadosUrl(doc) {
		const enableLawyerButton = doc.getElementById("enableLawyerButton");
		const onclick = enableLawyerButton ? enableLawyerButton.getAttribute("onclick") || "" : "";
		const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(onclick);
		if (!hrefMatch) return null;
		try {
			return localURL(hrefMatch[2], "/projudi/processo/advogadosParte.do");
		} catch (err) {
			return null;
		}
	}

	// Encontra a URL da própria tela do processo com a aba `tabId` (ex.:
	// "tabPartes") selecionada, a partir do `onclick` do item de aba nativo
	// (mesma técnica usada por oraculoDirect.js para achar `setTab('...')`).
	function findTabAction(tabId, tabName) {
		const tab = Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && new RegExp("['\"]" + tabId + "['\"]").test(onclick);
		});
		const onclickAttr = tab ? tab.getAttribute("onclick") : "";
		const actionMatch = /setTab\(\s*['"]([^'"]+)['"]/.exec(onclickAttr || "");
		if (!actionMatch) throw new Error('Não encontrei o acesso à aba "' + tabName + '" nesta tela.');
		const url = localURL(actionMatch[1], "/projudi/visualizacaoProcesso.do");
		if (url.searchParams.get("actionType") !== "visualizar") throw new Error('A aba "' + tabName + '" não aponta para uma página de visualização.');
		return url;
	}

	function tabBody(form, id, tabId) {
		const body = new URLSearchParams();
		for (const pair of new FormData(form)) {
			if (typeof pair[1] === "string") body.append(pair[0], pair[1]);
		}
		body.set("selectedIcon", tabId);
		body.set("id", id);
		return body;
	}

	// Devolve o documento da aba `tabId` do processo atual (o próprio
	// `document`, se já é essa aba; senão, buscado em segundo plano) e uma
	// função que confirma que o processo não mudou nesse meio-tempo.
	// Usado aqui ("Partes e Outros"), por editarPartes.js (idem) e por
	// alvaraEletronico.js ("Informações Adicionais", tabDadosAdicionais).
	async function lerAbaProcesso(tabId, tabName) {
		const form = document.getElementById("processoForm");
		if (!form) throw new Error("Não foi possível identificar o processo atual — abra a tela de um processo primeiro.");
		const id = form.elements.namedItem("id") ? form.elements.namedItem("id").value : null;
		if (!/^\d+$/.test(id || "")) throw new Error("Não foi possível identificar o processo atual.");

		function checkContext() {
			const current = form.elements.namedItem("id");
			if (!form.isConnected || !current || current.value !== id) throw new Error("O processo mudou durante a operação. Clique novamente.");
		}

		const selectedIconField = form.elements.namedItem("selectedIcon");
		const jaEstaNaAba = !!selectedIconField && selectedIconField.value === tabId;

		let doc = document;
		if (!jaEstaNaAba) {
			const tabUrl = findTabAction(tabId, tabName);
			const body = tabBody(form, id, tabId);
			doc = await readPage(tabUrl.href, { method: "POST", body: body });
			const responseId = doc.querySelector('#processoForm [name="id"]');
			if (!responseId || responseId.value !== id) throw new Error('A resposta da aba "' + tabName + '" não corresponde ao processo atual.');
			checkContext();
		}

		return { doc: doc, checkContext: checkContext };
	}
	window.__pdpLerAbaProcesso = lerAbaProcesso;

	function lerAbaPartes() {
		return lerAbaProcesso("tabPartes", "Partes e Outros");
	}
	window.__pdpLerAbaPartes = lerAbaPartes;

	async function resolveAdvogadosUrl() {
		const aba = await lerAbaPartes();
		const url = findAdvogadosUrl(aba.doc);
		if (!url) throw new Error('Não foi possível determinar o endereço da tela "Advogados" a partir do botão nativo.');
		aba.checkContext();
		return url.href;
	}

	window.__pdpOpenHabilitarAdvogado = async function () {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}
		api.openActionModal("Advogados", await resolveAdvogadosUrl());
	};

	// -------------------------------------------------------------------
	// Ação personalizada "Advogados" (preferências) — ver o topo do arquivo
	// -------------------------------------------------------------------

	const LABEL = "Advogados";
	const FORM_ID = "advogadosParteForm";
	const ADVOGADOS_PATH = "/projudi/processo/advogadosParte.do";
	const AVISO_ID = "pdp-advogados-aviso";

	function limpa(text) {
		return (text || "").replace(/\s+/g, " ").trim();
	}

	function chave(adv) {
		return [adv.oab, adv.complemento, adv.uf, adv.tipo].join("-").toUpperCase();
	}

	function descreverAdvogado(adv) {
		return (adv.inscricao || adv.oab + adv.complemento + "-" + adv.uf) + (adv.nome ? " " + adv.nome : "");
	}

	// Advogados da seção "Advogados" da tela (bolinhas
	// `advogadoSelecionado`, valor "OAB-Complemento-UF-Tipo"; a linha traz a
	// inscrição, ex.: "12345N-PR", e o nome).
	function lerAdvogados(form) {
		const lista = [];
		form.querySelectorAll('input[type="radio"][name="advogadoSelecionado"]').forEach(function (radio) {
			const partes = String(radio.value || "").split("-");
			if (partes.length < 4) return;
			const tipo = partes.pop();
			const uf = partes.pop();
			const complemento = partes.pop();
			const oab = partes.join("-");
			if (!oab || !uf) return;
			const linha = radio.closest("tr");
			const celulas = linha ? linha.cells : [];
			lista.push({
				oab: oab,
				complemento: complemento,
				uf: uf,
				tipo: tipo,
				inscricao: celulas.length > 1 ? limpa(celulas[1].textContent) : "",
				nome: celulas.length > 2 ? limpa(celulas[2].textContent) : "",
			});
		});
		return lista;
	}

	function atuacaoSelect(form) {
		const select = form.querySelector("select#idTipoAdvogado") || form.querySelector('select[name="idTipoAdvogado"]');
		return select && select.tagName === "SELECT" ? select : null;
	}

	function lerAtuacao(form) {
		const select = atuacaoSelect(form);
		const option = select && select.options[select.selectedIndex];
		return option ? { value: option.value, text: limpa(option.textContent) } : null;
	}

	function descrever(advogados, atuacao) {
		return (
			"Advogados: " + advogados.map(descreverAdvogado).join("; ") +
			(atuacao ? "\nAtuação: " + atuacao.text : "")
		);
	}

	// O Projudi só aceita a inclusão vinda da própria tela "Seleção de
	// Advogado" (o endereço de inclusão aberto direto responde "Erro
	// geral"): para cada advogado, a extensão faz o caminho do usuário —
	// "Adicionar" → OAB → "Pesquisar" → bolinha → "Selecionar". A tela de
	// seleção abre numa janela interna do Projudi (um quadro dentro da tela
	// de habilitação, às vezes aberto sozinho ao carregar a tela).
	const SELECAO_PATH = "/projudi/usuario/advogadoSelecao.do";
	const ESPERA_JANELA_MS = 1500; // a tela pode abrir a seleção sozinha
	const LIMITE_ETAPA_MS = 20000;

	function janelaSelecao(doc) {
		const quadros = doc.querySelectorAll("iframe");
		for (let i = 0; i < quadros.length; i++) {
			try {
				const win = quadros[i].contentWindow;
				if (win && win.location.pathname === SELECAO_PATH) return quadros[i];
			} catch (err) {
				// quadro de outra origem
			}
		}
		return null;
	}

	// Bolinha "parametros" do resultado da pesquisa (valor
	// "&oab=…&complemento=…&uf=…&idTipoAdvogado=…") do advogado gravado.
	function resultadoDo(selDoc, adv) {
		const radios = selDoc.querySelectorAll('input[type="radio"][name="parametros"]');
		for (let i = 0; i < radios.length; i++) {
			const p = new URLSearchParams(String(radios[i].value || "").replace(/^&/, ""));
			const achado = { oab: p.get("oab") || "", complemento: p.get("complemento") || "", uf: p.get("uf") || "", tipo: p.get("idTipoAdvogado") || "" };
			if (chave(achado) === chave(adv)) return radios[i];
		}
		return null;
	}

	function preencher(el, valor) {
		el.value = valor;
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
	}

	// Uma rodada da inclusão de `adv` (estado em `ctx.inclusao`). Devolve
	// "agindo" (seguir acompanhando), "selecionado" (clicou em "Selecionar":
	// a tela de habilitação vai recarregar) ou "falhou".
	function incluirPelaSelecao(doc, ctx, adv) {
		const inc = ctx.inclusao;
		if (Date.now() - inc.inicio > LIMITE_ETAPA_MS) return "falhou";
		const quadro = janelaSelecao(doc);
		let selDoc = null;
		try {
			selDoc = quadro && quadro.contentDocument;
		} catch (err) {
			selDoc = null;
		}
		if (!quadro) {
			// A janela ainda está abrindo (se não abrir, clica de novo).
			if (inc.abriu && Date.now() - inc.abriuEm < 4000) return "agindo";
			if (Date.now() - ctx.docVistoEm < ESPERA_JANELA_MS) return "agindo";
			const adicionar = doc.getElementById("addButton") ||
				botoesDa(doc).filter(function (b) { return /^adicionar$/i.test(textoBotao(b)); })[0];
			if (!adicionar) return "falhou";
			inc.abriu = true;
			inc.abriuEm = Date.now();
			adicionar.click();
			return "agindo";
		}
		inc.abriu = true;
		inc.abriuEm = inc.abriuEm || Date.now();
		if (!selDoc || selDoc.readyState !== "complete" || selDoc === inc.pesquisaDoc) return "agindo";
		const form = selDoc.getElementById("advogadoForm") || selDoc.querySelector("form");
		if (!form) return "agindo";

		const radio = resultadoDo(selDoc, adv);
		if (radio) {
			const selecionar = selDoc.getElementById("selectButton") ||
				botoesDa(selDoc).filter(function (b) { return /^selecionar$/i.test(textoBotao(b)); })[0];
			if (!selecionar) return "falhou";
			radio.checked = true;
			radio.dispatchEvent(new Event("click", { bubbles: true }));
			radio.dispatchEvent(new Event("change", { bubbles: true }));
			selecionar.click();
			return "selecionado";
		}
		// Pesquisou e o advogado não veio no resultado (a janela fica aberta
		// para o próximo; é fechada no fim).
		if (inc.pesquisou) return "falhou";
		const oab = selDoc.getElementById("oab") || form.querySelector('[name="oab"]');
		const pesquisar = selDoc.getElementById("searchButton") ||
			botoesDa(selDoc).filter(function (b) { return /^pesquisar$/i.test(textoBotao(b)); })[0];
		if (!oab || !pesquisar) return "falhou";
		const tipo = selDoc.getElementById("tipoAdvogado") || form.querySelector('select[name="tipoAdvogado"]');
		if (tipo) {
			const temTipo = Array.prototype.some.call(tipo.options, function (o) { return o.value === adv.tipo; });
			preencher(tipo, temTipo ? adv.tipo : "-1");
		}
		const nome = selDoc.getElementById("nome");
		if (nome) preencher(nome, "");
		preencher(oab, adv.oab);
		inc.pesquisou = true;
		inc.pesquisaDoc = selDoc;
		pesquisar.click();
		return "agindo";
	}

	function escolherAtuacao(form, salva) {
		const select = atuacaoSelect(form);
		if (!select || !salva) return !salva;
		const opcoes = Array.prototype.slice.call(select.options);
		const opcao =
			opcoes.filter(function (o) { return o.value === salva.value; })[0] ||
			opcoes.filter(function (o) { return limpa(o.textContent) === salva.text; })[0];
		if (!opcao) return false;
		if (select.value !== opcao.value) {
			select.value = opcao.value;
			select.dispatchEvent(new Event("input", { bubbles: true }));
			select.dispatchEvent(new Event("change", { bubbles: true }));
		}
		return true;
	}

	// Aviso dentro da própria tela do popup, logo acima do formulário.
	function avisar(doc, form, texto, tipo) {
		let aviso = doc.getElementById(AVISO_ID);
		if (!aviso) {
			aviso = doc.createElement("div");
			aviso.id = AVISO_ID;
			form.parentNode.insertBefore(aviso, form);
		}
		const cores = tipo === "erro"
			? "background:#fdecea;border:1px solid #e0a39a;color:#7a1f12;"
			: "background:#fff8d6;border:1px solid #e3c96b;color:#4d3d00;";
		aviso.setAttribute("style", cores + "margin:8px 0;padding:8px 10px;border-radius:4px;font-size:12px;white-space:pre-line;");
		aviso.textContent = texto;
	}

	// O botão nativo "Advogados" abre primeiro a LISTA dos advogados do
	// processo (OAB / Advogado / Partes) — com o mesmo `advogadosParteForm`
	// —, e só um botão dela leva à tela "Habilitação de Advogado/Sociedade
	// para Parte" (com um `_tj` novo, que prepara no Projudi a lista do
	// cadastro múltiplo; incluir advogados sem passar por ele dá "Erro
	// geral"). A tela de habilitação é a que tem a "Atuação" e as caixas
	// das partes.
	function telaHabilitacao(doc) {
		const form = doc.getElementById(FORM_ID);
		if (!form || form.tagName !== "FORM") return null;
		return form.querySelector('select[name="idTipoAdvogado"]') || form.querySelector('[name="idxParteProcessoSelecionada"]') ? form : null;
	}

	function textoBotao(el) {
		return limpa(el.value || el.textContent);
	}

	function botoesDa(doc) {
		return Array.prototype.filter.call(doc.querySelectorAll('input[type="button"], input[type="submit"], button'), function (b) {
			return !b.disabled && textoBotao(b);
		});
	}

	// Botão da lista que abre a tela de habilitação (o nome exato não é
	// conhecido: tenta, nesta ordem, os rótulos usuais do Projudi).
	const ROTULOS_HABILITAR = [/^adicionar$/i, /^novo$/i, /^incluir$/i, /^habilitar$/i, /^cadastrar$/i, /^(adicionar|novo|incluir|habilitar|cadastrar)\b/i];
	function botaoHabilitar(doc) {
		const botoes = botoesDa(doc);
		for (let i = 0; i < ROTULOS_HABILITAR.length; i++) {
			const achado = botoes.filter(function (b) { return ROTULOS_HABILITAR[i].test(textoBotao(b)); })[0];
			if (achado) return achado;
		}
		return null;
	}

	// Chamado pelo popup a cada página carregada e periodicamente (ver
	// openCustomAction em quickActions.js). `ctx.actedDoc` é a página em que
	// este script já agiu (clicou no botão da lista ou mandou incluir um
	// advogado): enquanto ela continuar no popup, a navegação ainda está em
	// andamento.
	function step(doc, ctx) {
		if (doc === ctx.actedDoc) return { state: ctx.revelado ? "show" : "wait" };
		const form = telaHabilitacao(doc);
		if (!form) {
			if (ctx.ultimo) {
				return { state: "fail", message: 'O Projudi não voltou à tela "Advogados" ao incluir ' + descreverAdvogado(ctx.ultimo) + ". Confira a mensagem na tela." };
			}
			const lista = doc.getElementById(FORM_ID);
			if (!lista) return { state: "fail", message: 'O Projudi não abriu a tela "Advogados" deste processo.' };
			// Lista dos advogados do processo: é a tela do "Abrir".
			if (ctx.mode === "open") return { state: "ready" };
			if (ctx.clicouHabilitar) {
				return { state: "fail", message: 'O Projudi não abriu a tela "Habilitação de Advogado/Sociedade para Parte". Abra-a pelo botão da tela e continue manualmente.' };
			}
			const botao = botaoHabilitar(doc);
			if (!botao) {
				return {
					state: "fail",
					message: 'Não encontrei, na tela "Advogados", o botão que abre a "Habilitação de Advogado/Sociedade para Parte". Botões encontrados: ' +
						(botoesDa(doc).map(textoBotao).join(", ") || "nenhum") + ". Abra a habilitação manualmente.",
				};
			}
			ctx.clicouHabilitar = true;
			ctx.actedDoc = doc;
			botao.click();
			return { state: "wait" };
		}
		if (ctx.mode === "open" || ctx.mode === "capture") return { state: "ready" };

		// mode === "apply" | "edit"
		const salvos = (ctx.pref && ctx.pref.advogados) || [];
		const atuais = {};
		lerAdvogados(form).forEach(function (adv) {
			atuais[chave(adv)] = true;
		});
		if (!ctx.tentados) {
			ctx.tentados = {};
			ctx.falhas = [];
		}
		if (ctx.ultimo && !atuais[chave(ctx.ultimo)]) ctx.falhas.push(ctx.ultimo);
		ctx.ultimo = null;

		const faltam = salvos.filter(function (adv) {
			return !atuais[chave(adv)] && !ctx.tentados[chave(adv)];
		});
		if (faltam.length) {
			const proximo = faltam[0];
			const feitos = salvos.length - faltam.length + 1;
			// Mostra o popup enquanto inclui (sem o limite de tempo da
			// abertura, que valeria para todas as inclusões juntas).
			ctx.revelado = true;
			if (ctx.docVisto !== doc) {
				ctx.docVisto = doc;
				ctx.docVistoEm = Date.now();
			}
			if (!ctx.inclusao || ctx.inclusao.chave !== chave(proximo)) {
				ctx.inclusao = { chave: chave(proximo), inicio: Date.now() };
				avisar(doc, form, 'Preferência "' + ctx.pref.name + '": incluindo ' + descreverAdvogado(proximo) + " (" + feitos + " de " + salvos.length + ")…");
			}
			const resultado = incluirPelaSelecao(doc, ctx, proximo);
			if (resultado === "selecionado") {
				ctx.tentados[chave(proximo)] = true;
				ctx.ultimo = proximo;
				ctx.actedDoc = doc;
				ctx.inclusao = null;
			} else if (resultado === "falhou") {
				ctx.tentados[chave(proximo)] = true;
				ctx.falhas.push(proximo);
				ctx.inclusao = null;
			}
			return { state: "show" };
		}

		// Fecha a janela de seleção que tenha ficado aberta.
		const sobra = janelaSelecao(doc);
		if (sobra) {
			try {
				const cancelar = sobra.contentDocument.getElementById("cancelButton");
				if (cancelar) cancelar.click();
			} catch (err) {
				// segue: o usuário fecha pelo "Fechar" da janela
			}
		}
		const atuacaoOk = escolherAtuacao(form, ctx.pref && ctx.pref.atuacao);
		const problemas = [];
		if (ctx.falhas.length) {
			problemas.push("Não consegui incluir: " + ctx.falhas.map(descreverAdvogado).join("; ") + ". Use \"Adicionar\" para incluí-los manualmente.");
		}
		if (!atuacaoOk) problemas.push('A atuação "' + ctx.pref.atuacao.text + '" não está disponível: escolha a Atuação manualmente.');
		avisar(
			doc,
			form,
			'Preferência "' + ctx.pref.name + '": ' + (problemas.length ? problemas.join("\n") + "\n" : "advogados incluídos. ") +
				(ctx.mode === "edit"
					? 'Ajuste a lista e a Atuação e clique em "💾 Atualizar preferência".'
					: 'Marque as Partes do Processo e clique em "Salvar".'),
			problemas.length ? "erro" : null
		);
		return { state: "ready" };
	}

	// Na hora de salvar a preferência: a lista e a Atuação da tela atual.
	function captureExtra(doc) {
		const form = doc && telaHabilitacao(doc);
		if (!form) throw new Error('Abra a tela "Habilitação de Advogado/Sociedade para Parte" no popup e inclua os advogados antes de salvar a preferência.');
		const advogados = lerAdvogados(form);
		if (!advogados.length) {
			throw new Error('Inclua pelo menos um advogado na seção "Advogados" (botão "Adicionar") antes de salvar a preferência.');
		}
		const atuacao = lerAtuacao(form);
		return { advogados: advogados, atuacao: atuacao, descricao: descrever(advogados, atuacao) };
	}

	window.__pdpCustomActions = window.__pdpCustomActions || {};
	window.__pdpCustomActions[LABEL] = {
		resolveUrl: resolveAdvogadosUrl,
		step: step,
		formId: FORM_ID,
		// Nenhum campo comum: a lista de advogados e a Atuação vão em
		// `captureExtra`; as partes do processo nunca são gravadas.
		prefFields: [],
		captureExtra: captureExtra,
		// Só inclui os advogados: marcar as partes e "Salvar" ficam com o
		// usuário (sem a barra "Sim, executar").
		confirmAfterApply: false,
	};

	// -------------------------------------------------------------------
	// Botão flutuante, ao lado do "📋 Processo copiado" (ver quickActions.js)
	// -------------------------------------------------------------------

	let button;

	function reconcile() {
		const clipboardBtn = document.getElementById("pdp-clipboard-button");
		if (!clipboardBtn) {
			if (button && button.isConnected) button.remove();
			return;
		}
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.id = "pdp-habilitar-advogado-button";
			button.className = "pdp-qa-group-btn";
			// Painel do grupo "advogados" das Ações rápidas (quickActions.js).
			button.dataset.panelId = "advogados";
			button.textContent = "⚖️ Advogados";
			button.title = 'Tela "Advogados" num popup (habilitar, desabilitar, adicionar ou remover advogados) e preferências com listas de advogados';
			button.addEventListener("click", function () {
				const api = window.__pdpQuickActions;
				if (api && typeof api.togglePanelById === "function") {
					api.togglePanelById("advogados");
					return;
				}
				window.__pdpOpenHabilitarAdvogado().catch(function (error) {
					alert('Não foi possível abrir a tela de Advogados: ' + error.message);
				});
			});
		}
		if (button.previousElementSibling !== clipboardBtn || button.parentElement !== clipboardBtn.parentElement) {
			clipboardBtn.insertAdjacentElement("afterend", button);
		}
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
