// Projudi - Atalho "Alterar Classe/Assuntos"
//
// Alterar a classe processual ou os assuntos do processo hoje exige: abrir
// a aba "Informações Gerais" e clicar no botão nativo "Alterar" (barra de
// botões ao final dela), que leva à tela de alteração do processo
// (processoEdicao.do: "Classe Processual", "Motivo da Alteração da Classe
// Processual", "Assunto Principal", "Assuntos Secundários", ... e
// "Salvar"/"Voltar").
//
// Este recurso põe um card (balão cinza) "✏️ Alterar" ao lado da "Classe
// Processual" e do "Assunto Principal" no cabeçalho do processo
// (`table#informacoesProcessuais`, visível em qualquer aba). O card mostra
// essa tela num POPUP sobreposto à tela atual — o mesmo popup das Ações
// rápidas, de "👥 Partes" e de "⚖️ Advogados" (ver `openActionModal` em
// quickActions.js) —, já rolada até o campo clicado.
//
// A URL é a do `onclick` do botão nativo "Alterar" (id="editButton",
// `document.location.href='/projudi/processoEdicao.do?_tj=...'`), lida da
// aba "Informações Gerais" (tabDadosProcesso) com `__pdpLerAbaProcesso`
// (habilitarAdvogado.js): o próprio DOM, se já é essa aba; senão, buscada
// em segundo plano.
//
// Depois do "Salvar" (o formulário é enviado para
// processoEdicao.do?actionType=salvarEdicao), quando o Projudi sai da tela
// de alteração (volta ao processo) ou mostra a mensagem de sucesso, o popup
// fecha e a tela por trás é recarregada, para o cabeçalho mostrar a classe
// e os assuntos novos. Se o Projudi devolver a própria tela com um erro de
// preenchimento, o popup continua aberto. "Voltar" (sem salvar) só fecha o
// popup.
//
// PREFERÊNCIAS (⭐ ao lado de cada "✏️ Alterar"): uma alteração gravada uma
// vez (ex.: classe "279 - Inquérito Policial", motivo "Evolução") e depois
// executada com um clique, do começo ao fim, sem confirmação.
// - Gravar ("+ Nova preferência"): abre a mesma tela no popup. A extensão
//   tira uma "foto" de todos os campos do formulário ao abrir; o usuário
//   escolhe a classe (lupa nativa) e o motivo (Retificação/Evolução) e
//   clica em "Salvar". Esse clique NÃO é repassado ao Projudi (o envio é
//   barrado): a extensão compara os campos com a foto e grava só o que
//   mudou — inclusive os campos ocultos que a seleção de classe preenche
//   junto da descrição (`descricaoClasseProcessual` é só leitura) — e o
//   motivo marcado. O processo não é alterado.
// - Executar (clique na preferência): carrega a tela de alteração num
//   quadro oculto, repõe os campos gravados, marca o motivo com clique de
//   verdade e clica de verdade em "Salvar". Se o Projudi sair da tela de
//   alteração (ou mostrar "sucesso"), a tela do processo é recarregada; se
//   devolver a tela com erro, a mensagem é mostrada e nada mais é feito.
// As preferências ficam em chrome.storage.local (chave PREFS_KEY, com o
// prefixo "pdp" para entrarem no Exportar/Importar do Menu).
//
// ASSUNTOS SECUNDÁRIOS (tipo "secundario"): a ⭐ fica na linha "Assunto(s)
// Secundário(s)" do cabeçalho, se houver; senão, um balão "⭐ Secundários"
// na linha do Assunto Principal. Aqui o "Adicionar"/"Remover" do Projudi
// pode recarregar a tela (o formulário é enviado com outro actionType), e
// só repor os campos no fim não basta. Por isso a gravação guarda PASSOS:
// a cada tela, a extensão tira uma foto dos campos; quando a tela vai ser
// trocada (pagehide) por um envio que não é o "Salvar", guarda o que mudou
// desde a foto, o actionType, o endereço do formulário e o botão de envio
// (se houve). No "Salvar" (barrado), guarda o que mudou na última tela e
// a lista de assuntos secundários antes/depois (adicionados e removidos).
// Na execução, cada passo é repetido no quadro oculto (campos → envio),
// depois os campos finais; antes de clicar em "Salvar", a extensão confere
// se a lista da tela ficou como a gravada — se não ficou, nada é salvo.
// Quando o "Adicionar" monta a lista na própria tela, sem envio (não há
// passo a repetir), a gravação guarda também como cada assunto adicionado
// aparece na lista (a opção ou a linha da tabela) e os campos ocultos que
// entraram/saíram (`lista`); a execução os repõe antes de conferir.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	// Não roda dentro de iframes ocultos (carregamento em segundo plano) nem
	// dentro do próprio popup desta extensão.
	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpAlterarClasseAssuntos) return;
	window.__pdpAlterarClasseAssuntos = true;

	const EDICAO_PATH = "/projudi/processoEdicao.do";
	const FORM_ID = "processoEdicaoForm";
	const LABEL = "Alterar Classe/Assuntos";
	const LINK_CLASS = "pdp-alterar-classe-link";
	const RECARGA_MS = 1200;
	const PREFS_KEY = "pdpAlterarClassePrefs";
	const PREF_BTN_CLASS = "pdp-alterar-classe-pref";
	const PANEL_ID = "pdp-alterar-classe-painel";
	const MOTIVO_NAME = "retificacaoEvolucaoClasseProcessual";
	const SECUNDARIOS_ROTULO = /^assuntos? secundarios?\b/;
	const EXEC_TIMEOUT_MS = 30000;
	// Campos de controle da página (tokens de uso único etc.): nunca entram
	// numa preferência — repor um valor antigo invalidaria o envio.
	const CAMPOS_IGNORADOS = /token|^_tj$|^org\.apache\.struts|^actionType$|^selectedIcon$/i;

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	// Botão nativo, na barra ao final da aba "Informações Gerais":
	// <input type="button" name="editButton" id="editButton" value="Alterar"
	//   onclick="disableScreen(); document.location.href=
	//   '/projudi/processoEdicao.do?_tj=...'">
	// Na falta do id, procura um botão "Alterar" que leve a processoEdicao.do.
	function findEdicaoUrl(doc) {
		const candidates = [doc.getElementById("editButton")].concat(
			Array.prototype.slice.call(doc.querySelectorAll('input[type="button"], button'))
		);
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			if (!el) continue;
			if (el.id !== "editButton" && normalize(el.value || el.textContent) !== "alterar") continue;
			const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(el.getAttribute("onclick") || "");
			if (!hrefMatch) continue;
			try {
				const url = new URL(hrefMatch[2], location.href);
				if (url.origin === location.origin && url.pathname === EDICAO_PATH) return url;
			} catch (err) {
				// endereço inválido — tenta o próximo
			}
		}
		return null;
	}

	// Rola o popup até o campo clicado e o destaca por um instante.
	function focarCampo(doc, campoId) {
		const campo = campoId === "secundarios" ? linhaSecundarios(doc) : doc.getElementById(campoId);
		if (!campo) return;
		const linha = campo.closest("tr") || campo;
		try {
			linha.scrollIntoView({ block: "center" });
		} catch (err) {
			linha.scrollIntoView();
		}
		const anterior = linha.style.backgroundColor;
		linha.style.transition = "background-color 0.6s";
		linha.style.backgroundColor = "#fff3b0";
		setTimeout(function () {
			linha.style.backgroundColor = anterior;
		}, 1800);
	}

	// Acompanha o popup: marca o "Salvar", e fecha (recarregando a tela por
	// trás, se salvou) quando o Projudi sai da tela de alteração.
	function acompanharPopup(iframe, api, campoId, gravacao) {
		let salvou = false;
		let foto = null;
		let primeiraTela = true;
		let encerrado = false;
		// Só na gravação de assuntos secundários: passos (envios que não são
		// o "Salvar") e a lista de assuntos secundários da primeira tela.
		const passos = [];
		let itensIniciais;
		let ocultosIniciais;

		function encerrar(recarregar) {
			if (encerrado) return;
			encerrado = true;
			observer.disconnect();
			if (iframe.isConnected) api.closeActionModal();
			if (recarregar) window.location.reload();
		}

		// "✕ Fechar" depois de um "Salvar": recarrega também.
		const observer = new MutationObserver(function () {
			if (!iframe.isConnected) encerrar(salvou);
		});
		observer.observe(document.body, { childList: true });

		iframe.addEventListener("load", function () {
			if (encerrado) return;
			let win, doc;
			try {
				win = iframe.contentWindow;
				doc = iframe.contentDocument;
			} catch (err) {
				return;
			}
			if (!win || !doc || win.location.href === "about:blank") return;

			if (win.location.search.indexOf("actionType=salvarEdicao") !== -1) salvou = true;
			// Saiu da tela de alteração ("Voltar" ou fim do "Salvar"). Conta
			// pelo formulário, não só pelo endereço: o Projudi pode responder
			// ao "Salvar" com a tela do processo sem mudar o endereço.
			if (win.location.pathname !== EDICAO_PATH || !doc.getElementById(FORM_ID)) {
				encerrar(salvou);
				return;
			}
			const texto = doc.body ? doc.body.textContent || "" : "";
			if (salvou && /sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) {
				setTimeout(function () {
					encerrar(true);
				}, RECARGA_MS);
				return;
			}

			if (gravacao && gravacao.tipo === "secundario") {
				if (itensIniciais === undefined) {
					itensIniciais = itensSecundarios(doc);
					ocultosIniciais = lerOcultos(doc.getElementById(FORM_ID));
				}
				const base = lerCampos(doc.getElementById(FORM_ID));
				acompanharPassos(doc, win, base, function (passo) {
					if (!encerrado) passos.push(passo);
				});
				prepararGravacao(doc, gravacao.tipo, function () {
					const form = doc.getElementById(FORM_ID);
					const depois = itensSecundarios(doc);
					const adicionados = itensIniciais && depois ? itensFaltando(depois, itensIniciais) : [];
					return gravacao.concluir(
						{
							lista: gravarLista(doc, adicionados, ocultosIniciais),
							passos: passos.slice(),
							// Campos que não existiam na tela (ex.: um oculto por assunto
							// adicionado) vão em `lista`, não aqui.
							campos: listaDiferencas(base, lerCampos(form)).filter(function (c) {
								return c.name in base;
							}),
							listaLida: itensIniciais !== null && depois !== null,
							adicionados: adicionados,
							removidos: itensIniciais && depois ? itensFaltando(itensIniciais, depois) : [],
						},
						function () {
							encerrar(false);
						}
					);
				});
				if (primeiraTela) {
					primeiraTela = false;
					focarCampo(doc, campoId);
				}
				return;
			}

			if (gravacao) {
				// Foto dos campos na PRIMEIRA tela (antes de qualquer escolha).
				if (!foto) foto = lerCampos(doc.getElementById(FORM_ID));
				prepararGravacao(doc, gravacao.tipo, function () {
					const resultado = diferencas(foto, lerCampos(doc.getElementById(FORM_ID)));
					return gravacao.concluir(resultado, function () {
						encerrar(false);
					});
				});
				if (primeiraTela) {
					primeiraTela = false;
					focarCampo(doc, campoId);
				}
				return;
			}

			doc.addEventListener(
				"submit",
				function (event) {
					if (event.target && event.target.id === FORM_ID) salvou = true;
				},
				true
			);
			const salvar = doc.getElementById("saveButton");
			if (salvar) {
				salvar.addEventListener("click", function () {
					salvou = true;
				});
			}
			if (primeiraTela) {
				primeiraTela = false;
				focarCampo(doc, campoId);
			}
		});
	}

	async function urlDaEdicao() {
		if (typeof window.__pdpLerAbaProcesso !== "function") {
			throw new Error('Não encontrei a leitura das abas do processo (habilitarAdvogado.js).');
		}
		const aba = await window.__pdpLerAbaProcesso("tabDadosProcesso", "Informações Gerais");
		const url = findEdicaoUrl(aba.doc);
		if (!url) {
			throw new Error('Não encontrei o botão "Alterar" na aba "Informações Gerais" — talvez seu perfil não tenha permissão para alterar este processo.');
		}
		aba.checkContext();
		return url.href;
	}

	async function abrir(campoId, gravacao) {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}
		const url = await urlDaEdicao();
		acompanharPopup(api.openActionModal(LABEL, url), api, campoId, gravacao);
	}

	// -------------------------------------------------------------------
	// Campos do formulário: foto, diferenças e reposição
	// -------------------------------------------------------------------

	// { nome: valor } de todos os campos do formulário (inclusive ocultos);
	// radios valem o marcado ("" se nenhum), checkboxes "1"/"".
	function lerCampos(form) {
		const campos = {};
		if (!form) return campos;
		Array.prototype.forEach.call(form.elements, function (el) {
			const nome = el.name;
			const tipo = (el.type || "").toLowerCase();
			if (!nome || CAMPOS_IGNORADOS.test(nome)) return;
			if (/^(submit|button|reset|image|file|password)$/.test(tipo) || el.tagName === "BUTTON") return;
			if (tipo === "radio") {
				if (!(nome in campos)) campos[nome] = "";
				if (el.checked) campos[nome] = el.value;
				return;
			}
			if (tipo === "checkbox") {
				campos[nome] = el.checked ? "1" : "";
				return;
			}
			if (el.tagName === "SELECT" && el.multiple) {
				campos[nome] = Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; }).join("\n");
				return;
			}
			// Nomes repetidos (fora radio): vale o primeiro.
			if (!(nome in campos)) campos[nome] = el.value;
		});
		return campos;
	}

	// [{ name, value }] dos campos que mudaram de `antes` para `depois`.
	function listaDiferencas(antes, depois) {
		const campos = [];
		Object.keys(depois).forEach(function (nome) {
			if ((antes[nome] || "") !== (depois[nome] || "")) campos.push({ name: nome, value: depois[nome] });
		});
		return campos;
	}

	function diferencas(antes, depois) {
		const campos = listaDiferencas(antes, depois).filter(function (c) {
			return c.name !== MOTIVO_NAME; // o motivo vai à parte
		});
		return {
			campos: campos,
			motivo: depois[MOTIVO_NAME] || "",
			classe: depois.descricaoClasseProcessual || "",
			assunto: depois.descricaoAssuntoPrincipal || "",
			classeMudou: (antes.descricaoClasseProcessual || "") !== (depois.descricaoClasseProcessual || ""),
			assuntoMudou: (antes.descricaoAssuntoPrincipal || "") !== (depois.descricaoAssuntoPrincipal || ""),
		};
	}

	function disparar(el) {
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
	}

	// Repõe os campos gravados. Devolve os nomes que não existem nesta tela.
	function reporCampos(form, campos) {
		const faltando = [];
		campos.forEach(function (c) {
			const els = Array.prototype.filter.call(form.elements, function (el) {
				return el.name === c.name;
			});
			if (!els.length) {
				faltando.push(c.name);
				return;
			}
			const el = els[0];
			const tipo = (el.type || "").toLowerCase();
			if (tipo === "radio") {
				const alvo = els.filter(function (r) { return r.value === c.value; })[0];
				if (alvo && !alvo.checked) alvo.click();
				else if (!alvo) faltando.push(c.name);
			} else if (tipo === "checkbox") {
				if (el.checked !== (c.value === "1")) el.click();
			} else if (el.tagName === "SELECT" && el.multiple) {
				const valores = String(c.value).split("\n");
				Array.prototype.forEach.call(el.options, function (o) { o.selected = valores.indexOf(o.value) !== -1; });
				disparar(el);
			} else {
				el.value = c.value;
				disparar(el);
			}
		});
		return faltando;
	}

	// Motivo da alteração da classe, com clique de verdade (como o usuário).
	function marcarMotivo(form, motivo) {
		if (!motivo) return true;
		const radio = Array.prototype.filter.call(form.elements, function (el) {
			return el.name === MOTIVO_NAME && el.value === motivo;
		})[0];
		if (!radio) return false;
		if (!radio.checked) radio.click();
		return radio.checked;
	}

	function textoMotivo(motivo) {
		return motivo === "retificacao" ? "Retificação" : motivo === "evolucao" ? "Evolução" : "";
	}

	// Mensagem de erro/aviso que o Projudi mostra na própria tela.
	function mensagemDaTela(doc) {
		const el = doc.querySelector(".error, .errors, .erro, .mensagemErro, #errorMessages, .alert, .warning, .message, .msg");
		const texto = (el ? el.textContent : "").replace(/\s+/g, " ").trim();
		return texto.slice(0, 400);
	}

	// -------------------------------------------------------------------
	// Assuntos secundários: lista da tela e passos (envios)
	// -------------------------------------------------------------------

	function textoRotulo(el) {
		return normalize(el.textContent).replace(/^\*\s*/, "");
	}

	// Área "Assuntos Secundários" da tela de alteração: { linha, celulas }.
	// O rótulo (<label> ou célula com o texto curto "Assuntos
	// Secundários:") fica numa célula e a lista e os botões nas células
	// seguintes da mesma linha; fora de tabela, a área é o elemento que
	// contém o <label> (sem ele).
	function areaSecundarios(doc) {
		const raiz = doc.getElementById(FORM_ID) || doc;
		const rotulos = raiz.querySelectorAll("label, td, th");
		for (let i = 0; i < rotulos.length; i++) {
			const el = rotulos[i];
			const texto = textoRotulo(el);
			if (texto.length > 40 || !SECUNDARIOS_ROTULO.test(texto)) continue;
			const celula = el.tagName === "LABEL" ? el.closest("td, th") : el;
			const tr = celula && celula.parentElement && celula.parentElement.tagName === "TR" ? celula.parentElement : null;
			if (tr) {
				const celulas = [];
				let c = celula;
				while ((c = c.nextElementSibling)) celulas.push(c);
				// Rótulo sozinho na célula e nada depois: a lista pode estar
				// na mesma célula, depois do <label>.
				if (!celulas.length && el.tagName === "LABEL") celulas.push(celula);
				if (celulas.length) return { linha: tr, celulas: celulas };
				continue;
			}
			if (el.tagName === "LABEL" && el.parentElement) return { linha: el.parentElement, celulas: [el.parentElement] };
		}
		return null;
	}

	function linhaSecundarios(doc) {
		const area = areaSecundarios(doc);
		return area ? area.linha : null;
	}

	function limparTexto(t) {
		return String(t || "").replace(/\s+/g, " ").trim();
	}

	function textoDeItem(t) {
		const n = normalize(t);
		return t.length > 2 && !/^(adicionar|remover|nenhum.*)$/.test(n) && !SECUNDARIOS_ROTULO.test(n);
	}

	// Itens da lista de assuntos secundários: [{ texto, el, tipo }], com
	// tipo "option" (lista de seleção múltipla ou com várias linhas), "tr"
	// (tabela interna), "li" ou "texto" (linhas soltas, sem elemento
	// próprio). null se a área não foi encontrada.
	function elementosSecundarios(doc) {
		const area = areaSecundarios(doc);
		if (!area) return null;
		const itens = [];
		area.celulas.forEach(function (celula) {
			const listas = Array.prototype.filter.call(celula.querySelectorAll("select"), function (sel) {
				return sel.multiple || sel.size > 1;
			});
			if (listas.length) {
				listas.forEach(function (sel) {
					Array.prototype.forEach.call(sel.options, function (o) { itens.push({ texto: limparTexto(o.text), el: o, tipo: "option" }); });
				});
				return;
			}
			const linhas = celula.querySelectorAll("tr");
			if (linhas.length) {
				Array.prototype.forEach.call(linhas, function (linha) {
					if (!linha.querySelector("th, tr")) itens.push({ texto: limparTexto(linha.textContent), el: linha, tipo: "tr" });
				});
				return;
			}
			const lis = celula.querySelectorAll("li");
			if (lis.length) {
				Array.prototype.forEach.call(lis, function (li) { itens.push({ texto: limparTexto(li.textContent), el: li, tipo: "li" }); });
				return;
			}
			const copia = celula.cloneNode(true);
			Array.prototype.forEach.call(copia.querySelectorAll("br"), function (br) { br.replaceWith("\n"); });
			Array.prototype.forEach.call(copia.querySelectorAll("p, div"), function (el) { el.append("\n"); });
			Array.prototype.forEach.call(copia.querySelectorAll("label, input, button, select, script, style, img"), function (el) { el.remove(); });
			copia.textContent.split("\n").forEach(function (linha) { itens.push({ texto: limparTexto(linha), el: null, tipo: "texto" }); });
		});
		return itens.filter(function (i) { return textoDeItem(i.texto); });
	}

	// Assuntos secundários que a tela mostra (texto de cada um), ou null.
	function itensSecundarios(doc) {
		const els = elementosSecundarios(doc);
		return els ? els.map(function (i) { return i.texto; }) : null;
	}

	// Campos ocultos do formulário como "nome=valor" (com repetições).
	function lerOcultos(form) {
		const lista = [];
		if (!form) return lista;
		Array.prototype.forEach.call(form.querySelectorAll('input[type="hidden"]'), function (el) {
			if (el.name && !CAMPOS_IGNORADOS.test(el.name)) lista.push(el.name + "=" + el.value);
		});
		return lista;
	}

	// Itens de `a` que sobram depois de descontar os de `b` (multiconjunto).
	function sobra(a, b) {
		const resto = b.slice();
		return a.filter(function (x) {
			const i = resto.indexOf(x);
			if (i === -1) return true;
			resto.splice(i, 1);
			return false;
		});
	}

	function separarOculto(par) {
		const i = par.indexOf("=");
		return { name: par.slice(0, i), value: par.slice(i + 1) };
	}

	// Na gravação (no "Salvar"): como cada assunto adicionado aparece na
	// lista da tela (a opção ou a linha da tabela) e os campos ocultos que
	// entraram/saíram desde a primeira tela. É o que permite repor o
	// assunto quando o "Adicionar" do Projudi monta a lista na própria
	// tela, sem envio.
	function gravarLista(doc, adicionados, ocultosIniciais) {
		const els = elementosSecundarios(doc) || [];
		const itens = [];
		adicionados.forEach(function (texto) {
			const item = els.filter(function (i) { return normalize(i.texto) === normalize(texto); })[0];
			if (!item || !item.el) return;
			if (item.tipo === "option") itens.push({ tipo: "option", texto: item.el.text, value: item.el.value, selected: item.el.selected });
			else itens.push({ tipo: item.tipo, texto: texto, html: item.el.outerHTML });
		});
		const finais = lerOcultos(doc.getElementById(FORM_ID));
		return {
			itens: itens,
			ocultosNovos: sobra(finais, ocultosIniciais || []),
			ocultosRemovidos: sobra(ocultosIniciais || [], finais),
		};
	}

	// Na execução: repõe na lista da tela os assuntos gravados (e tira os
	// removidos), com os campos ocultos que o "Adicionar" tinha criado.
	function aplicarLista(doc, pref) {
		const form = doc.getElementById(FORM_ID);
		const area = areaSecundarios(doc);
		const lista = pref.lista || {};
		if (!form || !area) return false;
		let mexeu = false;
		const atuais = elementosSecundarios(doc) || [];
		(pref.removidos || []).forEach(function (texto) {
			atuais.forEach(function (i) {
				if (i.el && normalize(i.texto) === normalize(texto)) {
					i.el.remove();
					mexeu = true;
				}
			});
		});
		(lista.itens || []).forEach(function (item) {
			if (contemItem(itensSecundarios(doc) || [], item.texto)) return;
			let alvo = null;
			area.celulas.some(function (c) {
				if (item.tipo === "option") {
					alvo = Array.prototype.filter.call(c.querySelectorAll("select"), function (sel) { return sel.multiple || sel.size > 1; })[0] || null;
				} else if (item.tipo === "tr") {
					const tabela = c.querySelector("table");
					alvo = tabela ? tabela.tBodies[0] || tabela : null;
				} else if (item.tipo === "li") {
					alvo = c.querySelector("ul, ol");
				}
				return !!alvo;
			});
			if (!alvo) return;
			if (item.tipo === "option") {
				const opt = doc.createElement("option");
				opt.value = item.value;
				opt.text = item.texto;
				alvo.appendChild(opt);
				opt.selected = !!item.selected;
				disparar(alvo);
			} else {
				alvo.insertAdjacentHTML("beforeend", item.html);
			}
			mexeu = true;
		});
		(lista.ocultosRemovidos || []).forEach(function (par) {
			const c = separarOculto(par);
			const el = Array.prototype.filter.call(form.querySelectorAll('input[type="hidden"]'), function (i) { return i.name === c.name && i.value === c.value; })[0];
			if (el) {
				el.remove();
				mexeu = true;
			}
		});
		const presentes = lerOcultos(form);
		sobra(lista.ocultosNovos || [], presentes).forEach(function (par) {
			const c = separarOculto(par);
			const el = doc.createElement("input");
			el.type = "hidden";
			el.name = c.name;
			el.value = c.value;
			form.appendChild(el);
			mexeu = true;
		});
		return mexeu;
	}

	function contemItem(lista, item) {
		const alvo = normalize(item);
		return lista.some(function (t) {
			const n = normalize(t);
			return n === alvo || n.indexOf(alvo) !== -1;
		});
	}

	// Itens de `lista` que não estão em `outra`.
	function itensFaltando(lista, outra) {
		return lista.filter(function (t) { return !contemItem(outra, t); });
	}

	// A tela já mostra os assuntos secundários como a preferência deixaria?
	// null = não dá para saber (lista não lida ou nada gravado sobre ela).
	function listaConfere(doc, pref) {
		const itens = itensSecundarios(doc);
		const adicionados = pref.adicionados || [];
		const removidos = pref.removidos || [];
		if (itens === null || (!adicionados.length && !removidos.length)) return null;
		return adicionados.every(function (t) { return contemItem(itens, t); }) && !removidos.some(function (t) { return contemItem(itens, t); });
	}

	function valorActionType(form) {
		const el = form.elements.namedItem("actionType");
		if (!el) return null;
		return el.length !== undefined && !el.tagName ? (el[0] ? el[0].value : null) : el.value;
	}

	// Na gravação: quando a tela vai ser trocada por um envio que não é o
	// "Salvar" (ex.: "Adicionar"), chama `aoPasso` com o que mudou desde a
	// foto `base`, o actionType, o endereço do formulário e o botão de envio.
	//
	// Só conta como passo repetível um ENVIO do formulário: com botão de
	// envio (evento submit) ou com o endereço do formulário trocado pela
	// página (ex.: "Remover" troca para actionType=removerAssuntoSecundario
	// e chama form.submit()). Qualquer outra troca de tela — como a volta
	// da janela de seleção do "Adicionar", que registra o assunto no
	// servidor e recarrega a tela — vira um passo { navegacao: true }, que
	// NÃO pode ser repetido: reenviar o formulário com o endereço original
	// seria o "Salvar" (actionType=salvarEdicao).
	function acompanharPassos(doc, win, base, aoPasso) {
		let botao = null;
		let enviou = false;
		const formInicial = doc.getElementById(FORM_ID);
		const actionInicial = formInicial ? formInicial.getAttribute("action") || "" : "";
		doc.addEventListener(
			"submit",
			function (event) {
				const b = event.submitter;
				if (b && b.id === "saveButton") return;
				if (event.target && event.target.id === FORM_ID) enviou = true;
				if (b) botao = { id: b.id || "", name: b.name || "", value: b.value || "" };
			},
			true
		);
		win.addEventListener("pagehide", function () {
			const form = doc.getElementById(FORM_ID);
			if (!form) return;
			const action = form.getAttribute("action") || "";
			if (!enviou && action === actionInicial) {
				aoPasso({ navegacao: true });
				return;
			}
			aoPasso({
				campos: listaDiferencas(base, lerCampos(form)),
				actionType: valorActionType(form),
				action: form.getAttribute("action") || "",
				botao: botao,
			});
		});
	}

	// Na execução: repete um passo gravado (campos → envio). O envio usa o
	// mesmo botão, se houve; senão, o envio do próprio formulário.
	function executarPasso(form, passo) {
		if (passo.navegacao) {
			throw new Error('o "Adicionar" dos assuntos secundários (janela de seleção do Projudi) ainda não pode ser repetido pela extensão. Nada foi salvo.');
		}
		// Segurança: um passo nunca pode ser o próprio "Salvar".
		if (!passo.botao && /salvarEdicao/i.test(passo.action || form.getAttribute("action") || "") && !passo.actionType) {
			throw new Error("esta preferência foi gravada numa versão com erro e enviaria a tela como um \"Salvar\". Nada foi salvo. Apague-a (🗑).");
		}
		const faltando = reporCampos(form, passo.campos || []);
		if (faltando.length) throw new Error("a tela de alteração não tem mais o(s) campo(s) " + faltando.join(", ") + ". Grave a preferência de novo.");
		if (passo.action && form.getAttribute("action") !== passo.action) form.setAttribute("action", passo.action);
		if (passo.actionType !== null && passo.actionType !== undefined) {
			const el = form.elements.namedItem("actionType");
			if (el && el.tagName) el.value = passo.actionType;
			else if (el && el[0]) el[0].value = passo.actionType;
		}
		const b = passo.botao;
		const botao = b && Array.prototype.filter.call(form.elements, function (el) {
			return (b.id && el.id === b.id) || (!b.id && b.name && el.name === b.name && el.value === b.value);
		})[0];
		if (botao) botao.click();
		else HTMLFormElement.prototype.submit.call(form);
	}

	// -------------------------------------------------------------------
	// Gravação: "Salvar" barrado, campos alterados guardados
	// -------------------------------------------------------------------

	const AVISO_GRAVACAO_ID = "pdp-alterar-classe-aviso";

	function prepararGravacao(doc, tipo, aoSalvar) {
		if (doc.__pdpGravacaoPronta) return;
		doc.__pdpGravacaoPronta = true;
		const form = doc.getElementById(FORM_ID);
		if (form && !doc.getElementById(AVISO_GRAVACAO_ID)) {
			const aviso = doc.createElement("div");
			aviso.id = AVISO_GRAVACAO_ID;
			aviso.style.cssText = "margin:6px 0 10px;padding:8px 10px;border:1px solid #d4b106;background:#fffbe6;color:#5c4400;font:12px Arial,sans-serif;border-radius:4px";
			aviso.innerHTML = "<b>⭐ Gravando preferência.</b> " +
				(tipo === "secundario"
					? "Use <b>Adicionar</b> (ou <b>Remover</b>) dos <b>Assuntos Secundários</b>, como de costume, e clique em <b>Salvar</b>. "
					: "Escolha a nova classe (lupa) e o <b>Motivo da Alteração</b> — ou o novo assunto principal — e clique em <b>Salvar</b>. ") +
				"Esse clique só grava a preferência: <b>o processo não é alterado agora</b>.";
			form.insertBefore(aviso, form.firstChild);
		}
		let processando = false;
		function barrar(event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (processando) return;
			processando = true;
			Promise.resolve(aoSalvar()).finally(function () {
				processando = false;
			});
		}
		const salvar = doc.getElementById("saveButton");
		if (salvar) salvar.addEventListener("click", barrar, true);
		// Envio pelo "Salvar" (Enter num campo, por exemplo). Outros envios
		// (a tela pode se recarregar ao escolher a classe) passam normalmente.
		doc.addEventListener(
			"submit",
			function (event) {
				if (event.target && event.target.id === FORM_ID && event.submitter && event.submitter.id === "saveButton") barrar(event);
			},
			true
		);
	}

	async function concluirGravacaoSecundario(resultado, fechar) {
		if (resultado.passos.some(function (p) { return p.navegacao; })) {
			alert('A extensão ainda não consegue repetir o "Adicionar" dos assuntos secundários (a janela de seleção do Projudi grava o assunto direto no servidor). A preferência NÃO foi gravada.\n\nClique em "Voltar" para sair sem alterar o processo.');
			return;
		}
		const mudouLista = resultado.adicionados.length || resultado.removidos.length;
		if (!mudouLista && (resultado.listaLida || (!resultado.passos.length && !resultado.campos.length))) {
			alert('Adicione (ou remova) um assunto secundário com os botões de "Assuntos Secundários" antes de clicar em Salvar.');
			return;
		}
		const partes = resultado.adicionados.map(function (t) { return "+ " + t; }).concat(resultado.removidos.map(function (t) { return "− " + t; }));
		const descricao = partes.join("; ") || "assuntos secundários alterados";
		const sugestao =
			resultado.adicionados.concat(resultado.removidos).map(function (t) { return t.replace(/^\d+\s*-\s*/, ""); }).join(" + ") || "Assuntos secundários";
		const nome = prompt("Nome da preferência:", sugestao);
		if (nome === null) return; // continua na tela de gravação
		const pref = {
			id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
			tipo: "secundario",
			name: nome.trim() || sugestao,
			descricao: descricao,
			adicionados: resultado.adicionados,
			removidos: resultado.removidos,
			passos: resultado.passos,
			campos: resultado.campos,
			lista: resultado.lista,
			criadaEm: new Date().toISOString(),
		};
		const prefs = await carregarPrefs();
		prefs.push(pref);
		await salvarPrefs(prefs);
		console.info("[Alterar Classe/Assuntos] preferência gravada:", pref);
		fechar();
		alert('Preferência "★ ' + pref.name + '" gravada. O processo não foi alterado.\n\nPara usá-la, clique na ⭐ dos assuntos secundários e escolha a preferência: a alteração é feita e salva automaticamente.');
	}

	async function concluirGravacao(tipo, resultado, fechar) {
		if (tipo === "secundario") return concluirGravacaoSecundario(resultado, fechar);
		if (tipo === "classe" && !resultado.classeMudou) {
			alert("Escolha uma classe diferente da atual (lupa da Classe Processual) antes de clicar em Salvar.");
			return;
		}
		if (tipo === "classe" && !resultado.motivo) {
			alert('Marque o "Motivo da Alteração da Classe Processual" (Retificação ou Evolução) antes de clicar em Salvar.');
			return;
		}
		if (tipo === "assunto" && !resultado.assuntoMudou) {
			alert("Escolha um assunto principal diferente do atual (lupa do Assunto Principal) antes de clicar em Salvar.");
			return;
		}
		if (!resultado.campos.length) {
			alert("Nada foi alterado na tela — não há o que gravar.");
			return;
		}
		const descricao = tipo === "classe" ? resultado.classe : resultado.assunto;
		const sugestao = descricao.replace(/^\d+\s*-\s*/, "") + (tipo === "classe" && resultado.motivo ? " (" + textoMotivo(resultado.motivo) + ")" : "");
		const nome = prompt("Nome da preferência:", sugestao);
		if (nome === null) return; // continua na tela de gravação
		const pref = {
			id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
			tipo: tipo,
			name: nome.trim() || sugestao,
			descricao: descricao,
			motivo: tipo === "classe" ? resultado.motivo : "",
			campos: resultado.campos,
			criadaEm: new Date().toISOString(),
		};
		const prefs = await carregarPrefs();
		prefs.push(pref);
		await salvarPrefs(prefs);
		console.info("[Alterar Classe/Assuntos] preferência gravada:", pref);
		fechar();
		alert('Preferência "★ ' + pref.name + '" gravada. O processo não foi alterado.\n\nPara usá-la, clique na ⭐ ao lado de "✏️ Alterar" e escolha a preferência: a alteração é feita e salva automaticamente.');
	}

	function carregarPrefs() {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(PREFS_KEY, function (data) {
					const lista = data && Array.isArray(data[PREFS_KEY]) ? data[PREFS_KEY] : [];
					resolve(lista);
				});
			} catch (err) {
				resolve([]);
			}
		});
	}

	function salvarPrefs(prefs) {
		return new Promise(function (resolve, reject) {
			try {
				const data = {};
				data[PREFS_KEY] = prefs;
				chrome.storage.local.set(data, function () {
					if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
					else resolve();
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	// -------------------------------------------------------------------
	// Execução automática: quadro oculto → campos → motivo → "Salvar"
	// -------------------------------------------------------------------

	const STATUS_ID = "pdp-alterar-classe-status";

	function mostrarStatus(texto) {
		let el = document.getElementById(STATUS_ID);
		if (!el) {
			el = document.createElement("div");
			el.id = STATUS_ID;
			el.style.cssText = "position:fixed;left:50%;top:80px;transform:translateX(-50%);z-index:2147483646;padding:10px 16px;background:#3c4b5c;color:#fff;font:13px Arial,sans-serif;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.3)";
			document.body.appendChild(el);
		}
		el.textContent = texto;
	}

	function esconderStatus() {
		const el = document.getElementById(STATUS_ID);
		if (el) el.remove();
	}

	// Carrega `url` num quadro oculto e chama `etapa(doc, n)` a cada tela
	// (n = 0, 1, ...); `etapa` devolve um resultado final ou `undefined`
	// para esperar a próxima tela.
	function rodarNoQuadro(url, etapa) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1024px;height:768px;visibility:hidden";
			let n = 0;
			let fim = false;
			const limite = setTimeout(function () {
				terminar(null, new Error("o Projudi demorou demais para responder."));
			}, EXEC_TIMEOUT_MS);
			function terminar(valor, erro) {
				if (fim) return;
				fim = true;
				clearTimeout(limite);
				setTimeout(function () { iframe.remove(); }, 0);
				if (erro) reject(erro);
				else resolve(valor);
			}
			iframe.addEventListener("load", function () {
				if (fim) return;
				let doc;
				try {
					if (iframe.contentWindow.location.href === "about:blank") return;
					doc = iframe.contentDocument;
				} catch (err) {
					terminar(null, new Error("não consegui ler a tela do Projudi."));
					return;
				}
				// Repasse de alert/confirm da página: um confirm nativo
				// ("Deseja realmente…?") é aceito, como o usuário faria.
				try {
					iframe.contentWindow.confirm = function () { return true; };
					iframe.contentWindow.alert = function (msg) { console.info("[Alterar Classe/Assuntos] alerta do Projudi:", msg); };
				} catch (err) {
					// segue
				}
				let r;
				try {
					r = etapa(doc, n++, iframe.contentWindow);
				} catch (err) {
					terminar(null, err);
					return;
				}
				if (r !== undefined) terminar(r);
			});
			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	async function executarPreferencia(pref) {
		if (ocupado) return;
		ocupado = true;
		const titulo = "★ " + pref.name;
		try {
			mostrarStatus(titulo + " — abrindo a tela de alteração…");
			const url = await urlDaEdicao();
			const resultado = await rodarNoQuadro(url, pref.tipo === "secundario" ? etapasSecundario(pref, titulo) : function (doc, n, win) {
				const form = doc.getElementById(FORM_ID);
				if (n === 0) {
					if (!form) throw new Error("a tela de alteração do processo não abriu.");
					const atual = (doc.getElementById(pref.tipo === "classe" ? "descricaoClasseProcessual" : "descricaoAssuntoPrincipal") || {}).value || "";
					if (normalize(atual) === normalize(pref.descricao)) return { jaEstava: true };
					mostrarStatus(titulo + " — preenchendo…");
					const faltando = reporCampos(form, pref.campos);
					if (faltando.length) throw new Error("a tela de alteração não tem mais o(s) campo(s) " + faltando.join(", ") + ". Grave a preferência de novo.");
					if (pref.tipo === "classe" && !marcarMotivo(form, pref.motivo)) throw new Error('não consegui marcar o motivo "' + textoMotivo(pref.motivo) + '".');
					const salvar = doc.getElementById("saveButton");
					if (!salvar) throw new Error('não encontrei o botão "Salvar".');
					mostrarStatus(titulo + " — salvando…");
					salvar.click();
					return undefined;
				}
				// Resposta do "Salvar".
				const texto = doc.body ? doc.body.textContent || "" : "";
				if (!form || win.location.pathname !== EDICAO_PATH) return { ok: true };
				if (/sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) return { ok: true };
				return { ok: false, mensagem: mensagemDaTela(doc) };
			});
			esconderStatus();
			if (resultado.jaEstava) {
				const oQue = pref.tipo === "classe" ? "a classe" : pref.tipo === "secundario" ? "os assuntos secundários" : "o assunto principal";
				alert(titulo + ": o processo já está com " + oQue + ' "' + pref.descricao + '". Nada foi alterado.');
				return;
			}
			if (!resultado.ok) {
				alert(titulo + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse "✏️ Alterar" para ver a tela e fazer a alteração à mão.');
				return;
			}
			mostrarStatus(titulo + " — alteração salva. Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			esconderStatus();
			alert(titulo + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	// Etapas da execução de uma preferência de assuntos secundários: tela 0
	// confere se já está como a preferência deixaria; telas 0..k-1 repetem
	// os k passos gravados (cada envio recarrega a tela); a tela k repõe os
	// campos finais, confere a lista e clica em "Salvar"; a seguinte é a
	// resposta do "Salvar".
	function etapasSecundario(pref, titulo) {
		const passos = pref.passos || [];
		let salvarClicado = false;
		return function (doc, n, win) {
			const form = doc.getElementById(FORM_ID);
			if (salvarClicado) {
				const texto = doc.body ? doc.body.textContent || "" : "";
				if (!form || win.location.pathname !== EDICAO_PATH) return { ok: true };
				if (/sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) return { ok: true };
				return { ok: false, mensagem: mensagemDaTela(doc) };
			}
			if (!form || win.location.pathname !== EDICAO_PATH) {
				const msg = n === 0 ? "a tela de alteração do processo não abriu." : "a tela de alteração não voltou depois de " + (passos.length > 1 ? "um dos passos" : "adicionar/remover") + "; nada foi salvo." + (mensagemDaTela(doc) ? " " + mensagemDaTela(doc) : "");
				throw new Error(msg);
			}
			if (n === 0 && listaConfere(doc, pref) === true) return { jaEstava: true };
			if (n < passos.length) {
				mostrarStatus(titulo + " — preenchendo (" + (n + 1) + " de " + passos.length + ")…");
				executarPasso(form, passos[n]);
				return undefined;
			}
			mostrarStatus(titulo + " — preenchendo…");
			const faltando = reporCampos(form, pref.campos || []);
			if (faltando.length) throw new Error("a tela de alteração não tem mais o(s) campo(s) " + faltando.join(", ") + ". Grave a preferência de novo.");
			// Os passos não deixaram a lista como a gravada (o "Adicionar" do
			// Projudi monta a lista na própria tela): repõe os itens gravados.
			if (listaConfere(doc, pref) === false && pref.lista) aplicarLista(doc, pref);
			if (listaConfere(doc, pref) === false) {
				const area = areaSecundarios(doc);
				console.warn("[Alterar Classe/Assuntos] lista de assuntos secundários não conferiu.", { preferencia: pref, tela: area ? area.linha.outerHTML : "(área não encontrada)" });
				throw new Error("os assuntos secundários da tela não ficaram como na preferência (" + pref.descricao + "). Nada foi salvo. Grave a preferência de novo ou use \"✏️ Alterar\".");
			}
			const salvar = doc.getElementById("saveButton");
			if (!salvar) throw new Error('não encontrei o botão "Salvar".');
			mostrarStatus(titulo + " — salvando…");
			salvarClicado = true;
			salvar.click();
			return undefined;
		};
	}

	// -------------------------------------------------------------------
	// Painel da ⭐: preferências do tipo + "Nova preferência"
	// -------------------------------------------------------------------

	function fecharPainel() {
		const el = document.getElementById(PANEL_ID);
		if (el) el.remove();
		document.removeEventListener("mousedown", cliqueFora, true);
	}

	function cliqueFora(event) {
		const el = document.getElementById(PANEL_ID);
		if (el && !el.contains(event.target) && !(event.target.closest && event.target.closest("." + PREF_BTN_CLASS))) fecharPainel();
	}

	async function abrirPainel(botao, alvo) {
		const aberto = document.getElementById(PANEL_ID);
		if (aberto && aberto.getAttribute("data-tipo") === alvo.tipo) {
			fecharPainel();
			return;
		}
		fecharPainel();
		const prefs = (await carregarPrefs()).filter(function (p) { return p.tipo === alvo.tipo; });
		const painel = document.createElement("div");
		painel.id = PANEL_ID;
		painel.setAttribute("data-tipo", alvo.tipo);
		const titulo = document.createElement("div");
		titulo.className = "pdp-acp-titulo";
		titulo.textContent = "⭐ Preferências — " + (alvo.tipo === "classe" ? "Alterar classe" : alvo.tipo === "secundario" ? "Assuntos secundários" : "Alterar assunto");
		painel.appendChild(titulo);
		if (!prefs.length) {
			const vazio = document.createElement("div");
			vazio.className = "pdp-acp-vazio";
			vazio.textContent = "Nenhuma preferência gravada. Use \"+ Nova preferência\" para gravar uma alteração e depois repeti-la com um clique.";
			painel.appendChild(vazio);
		}
		prefs.forEach(function (pref) {
			const linha = document.createElement("div");
			linha.className = "pdp-acp-linha";
			const usar = document.createElement("button");
			usar.type = "button";
			usar.className = "pdp-acp-usar";
			usar.textContent = "★ " + pref.name;
			usar.title = (pref.tipo === "secundario" ? "Alterar agora os assuntos secundários (" + pref.descricao + ")" : "Alterar agora para \"" + pref.descricao + "\"") + (pref.motivo ? " (motivo: " + textoMotivo(pref.motivo) + ")" : "") + " e salvar — sem confirmação";
			usar.addEventListener("click", function () {
				fecharPainel();
				executarPreferencia(pref);
			});
			const apagar = document.createElement("button");
			apagar.type = "button";
			apagar.className = "pdp-acp-apagar";
			apagar.textContent = "🗑";
			apagar.title = "Excluir esta preferência";
			apagar.addEventListener("click", async function () {
				if (!confirm('Excluir a preferência "★ ' + pref.name + '"?')) return;
				const todas = await carregarPrefs();
				await salvarPrefs(todas.filter(function (p) { return p.id !== pref.id; }));
				fecharPainel();
				abrirPainel(botao, alvo);
			});
			linha.appendChild(usar);
			linha.appendChild(apagar);
			painel.appendChild(linha);
		});
		const nova = document.createElement("button");
		nova.type = "button";
		nova.className = "pdp-acp-nova";
		nova.textContent = "+ Nova preferência";
		nova.addEventListener("click", async function () {
			fecharPainel();
			if (ocupado) return;
			ocupado = true;
			try {
				await abrir(alvo.campo, {
					tipo: alvo.tipo,
					concluir: function (resultado, fechar) {
						return concluirGravacao(alvo.tipo, resultado, fechar);
					},
				});
			} catch (error) {
				alert("Não foi possível abrir a tela de alteração: " + error.message);
			} finally {
				ocupado = false;
			}
		});
		painel.appendChild(nova);
		document.body.appendChild(painel);
		const r = botao.getBoundingClientRect();
		painel.style.left = Math.max(8, Math.min(window.innerWidth - painel.offsetWidth - 8, r.left + window.scrollX)) + "px";
		painel.style.top = r.bottom + window.scrollY + 4 + "px";
		document.addEventListener("mousedown", cliqueFora, true);
	}

	// -------------------------------------------------------------------
	// Links no cabeçalho do processo
	// -------------------------------------------------------------------

	let ocupado = false;

	// Card (balão) pequeno, no mesmo cinza dos botões da barra da extensão
	// (.pdp-qa-group-btn em quickActions.css), em tamanho menor.
	function garantirEstilo() {
		if (document.getElementById(LINK_CLASS + "-estilo")) return;
		const style = document.createElement("style");
		style.id = LINK_CLASS + "-estilo";
		style.textContent =
			"a." + LINK_CLASS + "{display:inline-block;margin-left:8px;padding:1px 7px;" +
			"font:normal 11px/16px Arial,Helvetica,sans-serif;color:#222 !important;text-decoration:none !important;" +
			"white-space:nowrap;vertical-align:middle;cursor:pointer;" +
			"background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:10px;" +
			"box-shadow:0 1px 2px rgba(0,0,0,0.08);}" +
			"a." + LINK_CLASS + ":hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888;}" +
			"a." + PREF_BTN_CLASS + "{margin-left:4px;padding:1px 6px;}" +
			"#" + PANEL_ID + "{position:absolute;z-index:2147483640;min-width:260px;max-width:420px;padding:8px;background:#fff;border:1px solid #adadad;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);font:12px Arial,Helvetica,sans-serif;color:#222}" +
			"#" + PANEL_ID + " .pdp-acp-titulo{font-weight:bold;margin:0 0 6px}" +
			"#" + PANEL_ID + " .pdp-acp-vazio{color:#666;margin:0 0 8px;line-height:1.4}" +
			"#" + PANEL_ID + " .pdp-acp-linha{display:flex;gap:4px;margin:0 0 4px}" +
			"#" + PANEL_ID + " button{font:12px Arial,Helvetica,sans-serif;color:#222;cursor:pointer;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:10px;padding:3px 9px}" +
			"#" + PANEL_ID + " button:hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888}" +
			"#" + PANEL_ID + " .pdp-acp-usar{flex:1;text-align:left}" +
			"#" + PANEL_ID + " .pdp-acp-nova{margin-top:4px}";
		(document.head || document.documentElement).appendChild(style);
	}

	function criarLink(campoId, title) {
		const a = document.createElement("a");
		a.href = "#";
		a.className = LINK_CLASS;
		a.setAttribute("data-pdp-campo", campoId);
		a.textContent = "✏️ Alterar";
		a.title = title;
		a.addEventListener("click", async function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (ocupado) return;
			ocupado = true;
			try {
				await abrir(campoId);
			} catch (error) {
				alert("Não foi possível abrir a tela de alteração: " + error.message);
			} finally {
				ocupado = false;
			}
		});
		return a;
	}

	function criarBotaoPref(alvo, texto) {
		const a = document.createElement("a");
		a.href = "#";
		a.className = LINK_CLASS + " " + PREF_BTN_CLASS;
		a.textContent = texto || "⭐";
		a.title = alvo.tipo === "classe"
			? "Preferências de alteração de classe: grave uma alteração (classe + motivo) e repita-a com um clique, já salva no processo"
			: alvo.tipo === "secundario"
				? "Preferências de assuntos secundários: grave uma inclusão (ou exclusão) de assunto secundário e repita-a com um clique, já salva no processo"
				: "Preferências de alteração do assunto principal: grave uma alteração e repita-a com um clique, já salva no processo";
		a.addEventListener("click", function (event) {
			event.preventDefault();
			event.stopPropagation();
			abrirPainel(a, alvo);
		});
		return a;
	}

	const ALVOS = [
		{
			rotulo: /^classe processual/,
			tipo: "classe",
			campo: "descricaoClasseProcessual",
			title: 'Alterar a classe processual num popup, sem sair desta tela (mesma tela do botão "Alterar" da aba Informações Gerais)',
		},
		{
			rotulo: /^assunto principal/,
			tipo: "assunto",
			campo: "descricaoAssuntoPrincipal",
			title: 'Alterar o assunto principal e os assuntos secundários num popup, sem sair desta tela (mesma tela do botão "Alterar" da aba Informações Gerais)',
		},
		{
			rotulo: SECUNDARIOS_ROTULO,
			tipo: "secundario",
			campo: "secundarios",
			title: 'Alterar os assuntos secundários num popup, sem sair desta tela (mesma tela do botão "Alterar" da aba Informações Gerais)',
		},
	];
	const ALVO_SECUNDARIO = ALVOS[2];

	function reconcile() {
		const table = document.getElementById("informacoesProcessuais");
		if (!table || !document.getElementById("processoForm")) return;
		let celulaPrincipal = null;
		let temLinhaSecundario = false;
		for (const tr of table.rows) {
			const label = tr.querySelector("td.label, td.labelRadio");
			if (!label) continue;
			const texto = normalize(label.textContent);
			const alvo = ALVOS.filter(function (a) {
				return a.rotulo.test(texto);
			})[0];
			if (!alvo) continue;
			// Célula do valor: a seguinte ao rótulo.
			const valor = label.nextElementSibling;
			if (!valor) continue;
			if (alvo.tipo === "assunto") celulaPrincipal = valor;
			if (alvo.tipo === "secundario") {
				// Uma linha por assunto secundário: os balões só na primeira.
				if (temLinhaSecundario) continue;
				temLinhaSecundario = true;
			}
			if (valor.querySelector("." + LINK_CLASS)) continue;
			garantirEstilo();
			valor.appendChild(criarLink(alvo.campo, alvo.title));
			valor.appendChild(criarBotaoPref(alvo));
		}
		// Sem linha de assunto secundário no cabeçalho: a ⭐ dos secundários
		// vai para a linha do Assunto Principal.
		if (!temLinhaSecundario && celulaPrincipal && !celulaPrincipal.querySelector("[data-pdp-secundario]")) {
			garantirEstilo();
			const botao = criarBotaoPref(ALVO_SECUNDARIO, "⭐ Secundários");
			botao.setAttribute("data-pdp-secundario", "");
			celulaPrincipal.appendChild(botao);
		}
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
