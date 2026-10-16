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
// na linha do Assunto Principal. A preferência ADICIONA um assunto
// secundário. No Projudi a lista de assuntos secundários fica no servidor:
// o "Adicionar" (addButton) abre a janela de seleção (quadro com
// /projudi/processo/assunto.do, formulário assuntoForm, dentro da tela de
// alteração); nela se pesquisa (descricaoPesquisa + searchButton), marca o
// assunto (rádio idAssuntoSelecionado) e clica em "Selecionar"
// (selectButton → confirmarSelecaoAssuntoSecundario), que grava o assunto
// na lista do servidor e recarrega a tela de alteração, já com a linha nova
// (rádio idAssuntoSecundarioSelecionado = id do assunto).
// - Gravar: o "Selecionar" da janela é barrado (o processo e a lista não
//   mudam); a extensão guarda o id e a descrição do assunto marcado.
// - Executar: no quadro oculto, faz o mesmo que o usuário — Adicionar →
//   pesquisa pela descrição (sem resultado: sem acentos, pela palavra mais
//   longa, pelo código — ver termosDePesquisa) → marca o assunto →
//   Selecionar —, espera o assunto aparecer na lista (a tela de alteração
//   pode recarregar ou não — ver selecionarEConferir) e só então clica em
//   "Salvar". Se o assunto não aparecer na lista, nada é salvo. Sem
//   resposta do Projudi, clica de novo no "Selecionar" e recomeça tudo, até
//   3 vezes (ver selecionarEConferir e executarSecundario).
//
// REMOVER (✖ no fim de cada assunto secundário do cabeçalho): depois de
// confirmar, a extensão carrega a tela de alteração num quadro oculto,
// marca o assunto (rádio idAssuntoSecundarioSelecionado) e faz o mesmo
// envio do "Remover" do Projudi (removerAssuntoSecundario: endereço do
// formulário → processoEdicao.do?actionType=removerAssuntoSecundario e
// form.submit(), sem o confirm nativo); quando a tela volta, confere que
// o assunto saiu da lista e só então clica em "Salvar".
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
	// Limite de espera por resposta do Projudi: folgado, porque o servidor
	// (sobretudo o de testes) às vezes passa de 30 s numa única tela.
	const EXEC_TIMEOUT_MS = 60000;
	// "Selecionar" sem reação do Projudi (ver selecionarEConferir) e
	// tentativas da preferência de assunto secundário inteira.
	const CLIQUE_PERDIDO_MS = 6000;
	const CLIQUES_SELECIONAR = 3;
	const TENTATIVAS_SECUNDARIO = 3;
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
				prepararGravacao(doc, gravacao.tipo, function () {
					alert('Para gravar a preferência, use "Adicionar" dos Assuntos Secundários: pesquise, marque o assunto e clique em "Selecionar".');
				});
				vigiarJanelaDeSelecao(doc, function (assunto) {
					return gravacao.concluir(assunto, function () {
						encerrar(false);
					});
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
	// Assuntos secundários: lista da tela e janela de seleção
	// -------------------------------------------------------------------

	// Linha "Assuntos Secundários" da tela de alteração (rótulo curto, num
	// <label> ou na própria célula).
	function linhaSecundarios(doc) {
		const raiz = doc.getElementById(FORM_ID) || doc;
		const rotulos = raiz.querySelectorAll("label, td, th");
		for (let i = 0; i < rotulos.length; i++) {
			const texto = normalize(rotulos[i].textContent).replace(/^\*\s*/, "");
			if (texto.length <= 40 && SECUNDARIOS_ROTULO.test(texto)) return rotulos[i].closest("tr") || rotulos[i].parentElement;
		}
		return null;
	}

	// O assunto `id` está na lista de assuntos secundários da tela?
	function temSecundario(doc, id) {
		const form = doc.getElementById(FORM_ID);
		if (!form) return false;
		return Array.prototype.some.call(form.querySelectorAll('input[name="idAssuntoSecundarioSelecionado"]'), function (r) {
			return r.value === String(id);
		});
	}

	// Documento da janela de seleção de assunto aberta dentro da tela de
	// alteração (quadro com o formulário assuntoForm), ou null.
	function docDaJanela(doc) {
		const quadros = doc.querySelectorAll("iframe, frame");
		for (let i = 0; i < quadros.length; i++) {
			try {
				const d = quadros[i].contentDocument;
				if (d && d.getElementById("assuntoForm")) return { quadro: quadros[i], doc: d };
			} catch (err) {
				// quadro de outra origem — ignora
			}
		}
		return null;
	}

	// Assunto marcado na janela de seleção: { idAssunto, descricao }.
	function assuntoMarcado(dlg) {
		const radio = dlg.querySelector('input[name="idAssuntoSelecionado"]:checked');
		if (!radio) return null;
		const oculto = radio.nextElementSibling && radio.nextElementSibling.name === "descricaoAssuntoSelecionado" ? radio.nextElementSibling : null;
		const li = radio.closest("li");
		const link = li ? li.querySelector("a") : null;
		const descricao = String((oculto && oculto.value) || (link && link.textContent) || radio.value).replace(/\s+/g, " ").trim();
		return { idAssunto: radio.value, descricao: descricao };
	}

	// Na gravação: em cada janela de seleção que abrir na tela, barra o
	// "Selecionar" e entrega o assunto marcado a `aoEscolher` (a lista do
	// processo não é tocada).
	function vigiarJanelaDeSelecao(doc, aoEscolher) {
		function preparar(d) {
			if (!d || d.__pdpSelecaoVigiada || !d.getElementById("assuntoForm")) return;
			d.__pdpSelecaoVigiada = true;
			let processando = false;
			d.addEventListener(
				"click",
				function (event) {
					const alvo = event.target && event.target.closest ? event.target.closest("#selectButton") : null;
					if (!alvo) return;
					event.preventDefault();
					event.stopImmediatePropagation();
					if (processando) return;
					const assunto = assuntoMarcado(d);
					if (!assunto) {
						alert("Marque um assunto na lista antes de clicar em Selecionar.");
						return;
					}
					processando = true;
					Promise.resolve(aoEscolher(assunto)).finally(function () {
						processando = false;
					});
				},
				true
			);
		}
		const timer = setInterval(function () {
			if (!doc.defaultView) {
				clearInterval(timer);
				return;
			}
			Array.prototype.forEach.call(doc.querySelectorAll("iframe, frame"), function (q) {
				try {
					preparar(q.contentDocument);
				} catch (err) {
					// segue
				}
			});
		}, 300);
		doc.defaultView.addEventListener("pagehide", function () {
			clearInterval(timer);
		});
	}

	function pausa(ms) {
		return new Promise(function (resolve) { setTimeout(resolve, ms); });
	}

	// Espera `teste()` devolver algo verdadeiro (ou falha com `erro`).
	async function esperar(teste, ms, erro) {
		const fim = Date.now() + ms;
		while (Date.now() < fim) {
			let r = null;
			try {
				r = teste();
			} catch (err) {
				r = null;
			}
			if (r) return r;
			await pausa(250);
		}
		throw new Error(erro);
	}

	// Próxima carga de `quadro` (resolve com o documento novo).
	function proximaCarga(quadro, ms, erro) {
		return new Promise(function (resolve, reject) {
			const limite = setTimeout(function () {
				quadro.removeEventListener("load", aoCarregar);
				const falha = new Error(erro || "o Projudi demorou demais para responder.");
				falha.repetir = true; // o Projudi não respondeu: vale tentar de novo
				reject(falha);
			}, ms || EXEC_TIMEOUT_MS);
			function aoCarregar() {
				let d = null;
				try {
					if (quadro.contentWindow.location.href === "about:blank") return;
					d = quadro.contentDocument;
				} catch (err) {
					d = null;
				}
				clearTimeout(limite);
				quadro.removeEventListener("load", aoCarregar);
				// Repasse de confirm/alert da página (ver rodarNoQuadro).
				try {
					quadro.contentWindow.confirm = function () { return true; };
					quadro.contentWindow.alert = function (msg) { console.info("[Alterar Classe/Assuntos] alerta do Projudi:", msg); };
				} catch (err) {
					// segue
				}
				resolve(d);
			}
			quadro.addEventListener("load", aoCarregar);
		});
	}

	function respostaDoSalvar(doc) {
		const form = doc && doc.getElementById(FORM_ID);
		const texto = doc && doc.body ? doc.body.textContent || "" : "";
		if (!form || doc.defaultView.location.pathname !== EDICAO_PATH) return { ok: true };
		if (/sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) return { ok: true };
		return { ok: false, mensagem: mensagemDaTela(doc) };
	}

	function criarQuadroOculto() {
		const quadro = document.createElement("iframe");
		quadro.setAttribute("data-pdp-loader", "");
		quadro.setAttribute("aria-hidden", "true");
		quadro.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1024px;height:768px;visibility:hidden";
		document.body.appendChild(quadro);
		return quadro;
	}

	// Remove o assunto secundário `id` (ver o início do arquivo):
	// marca → envio do "Remover" → confere que saiu → "Salvar".
	async function removerSecundarioNoQuadro(id, titulo) {
		const url = await urlDaEdicao();
		const quadro = criarQuadroOculto();
		try {
			let carga = proximaCarga(quadro);
			quadro.src = url;
			let doc = await carga;
			let form = doc && doc.getElementById(FORM_ID);
			if (!form) throw new Error("a tela de alteração do processo não abriu.");
			const radio = Array.prototype.filter.call(form.querySelectorAll('input[name="idAssuntoSecundarioSelecionado"]'), function (r) {
				return r.value === String(id);
			})[0];
			if (!radio) return { naoEstava: true };
			if (!radio.checked) radio.click();
			if (!radio.checked) throw new Error("não consegui marcar o assunto na tela de alteração. Nada foi alterado.");

			mostrarStatus(titulo + " — removendo da lista…");
			carga = proximaCarga(quadro, EXEC_TIMEOUT_MS, "a tela de alteração não voltou depois de remover o assunto. Nada foi salvo.");
			form.setAttribute("action", EDICAO_PATH + "?actionType=removerAssuntoSecundario");
			HTMLFormElement.prototype.submit.call(form);
			doc = await carga;
			form = doc && doc.getElementById(FORM_ID);
			if (!form) throw new Error("a tela de alteração não voltou depois de remover o assunto. Nada foi salvo." + (doc && mensagemDaTela(doc) ? "\n\n" + mensagemDaTela(doc) : ""));
			if (temSecundario(doc, id)) throw new Error("o assunto não saiu da lista de assuntos secundários. Nada foi salvo." + (mensagemDaTela(doc) ? "\n\n" + mensagemDaTela(doc) : ""));
			const salvar = doc.getElementById("saveButton");
			if (!salvar) throw new Error('não encontrei o botão "Salvar".');

			mostrarStatus(titulo + " — salvando…");
			carga = proximaCarga(quadro);
			salvar.click();
			return respostaDoSalvar(await carga);
		} finally {
			setTimeout(function () { quadro.remove(); }, 0);
		}
	}

	async function removerSecundario(id, descricao) {
		if (ocupado) return;
		if (!confirm('Remover o assunto secundário "' + descricao + '" deste processo?\n\nA alteração é salva em seguida, sem abrir a tela de alteração.')) return;
		ocupado = true;
		const titulo = "✖ " + descricao;
		try {
			mostrarStatus(titulo + " — abrindo a tela de alteração…");
			const resultado = await removerSecundarioNoQuadro(id, titulo);
			esconderStatus();
			if (resultado.naoEstava) {
				alert(titulo + ": o assunto já não está na lista de assuntos secundários do processo. Nada foi alterado.");
				return;
			}
			if (!resultado.ok) {
				alert(titulo + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse "✏️ Alterar" para ver a tela e fazer a alteração à mão.');
				return;
			}
			mostrarStatus(titulo + " — assunto removido. Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			esconderStatus();
			alert(titulo + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	// Rádio do assunto da preferência na janela de seleção: pelo id gravado
	// ou, se o valor do rádio não bater, pelo código do início do texto
	// ("14227 - Crime de ...") ou pela descrição inteira.
	function radioDoAssunto(d, pref) {
		if (!d) return null;
		const radios = Array.prototype.slice.call(d.querySelectorAll('input[name="idAssuntoSelecionado"]'));
		const porId = radios.filter(function (r) { return r.value === String(pref.idAssunto); })[0];
		if (porId) return porId;
		const codigo = (/^(\d+)\s*-/.exec(String(pref.descricao || "").trim()) || [])[1];
		const descricao = normalize(String(pref.descricao || "").replace(/^\d+\s*-\s*/, ""));
		return radios.filter(function (r) {
			const oculto = r.nextElementSibling && r.nextElementSibling.name === "descricaoAssuntoSelecionado" ? r.nextElementSibling.value : "";
			const li = r.closest("li");
			const link = li ? li.querySelector("a") : null;
			const texto = normalize(oculto || (link && link.textContent) || (li && li.textContent) || "");
			if (codigo && new RegExp("^" + codigo + "\\s*-").test(texto)) return true;
			return !!descricao && texto.replace(/^\d+\s*-\s*/, "") === descricao;
		})[0] || null;
	}

	// Termos para a pesquisa da janela de seleção, do mais preciso ao mais
	// amplo: a descrição inteira, sem acentos, a palavra mais longa e o
	// código. Cada termo cabe no limite de letras do campo de pesquisa
	// (cortado no fim de uma palavra). A descrição inteira, sozinha, nem
	// sempre é encontrada (ex.: "14227 - Crime de Descumprimento de Medida
	// Protetiva de Urgência").
	function termosDePesquisa(pref, limite) {
		const semAcento = function (s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); };
		const descricao = String(pref.descricao || "").replace(/^\d+\s*-\s*/, "").replace(/\s+/g, " ").trim();
		const palavra = descricao.split(" ").reduce(function (a, b) { return b.length > a.length ? b : a; }, "");
		const codigo = (/^(\d+)\s*-/.exec(String(pref.descricao || "").trim()) || [])[1] || "";
		function caber(s) {
			if (!(limite > 0) || s.length <= limite) return s;
			const corte = s.slice(0, limite);
			const espaco = corte.lastIndexOf(" ");
			return (espaco > 0 ? corte.slice(0, espaco) : corte).trim();
		}
		const termos = [];
		[descricao, semAcento(descricao), palavra, semAcento(palavra), codigo].forEach(function (t) {
			t = caber(t);
			if (t && termos.indexOf(t) === -1) termos.push(t);
		});
		return termos;
	}

	// Pesquisa o assunto na janela de seleção (quadro `quadro`), tentando os
	// termos acima até o assunto aparecer. Devolve o rádio dele ou null.
	async function pesquisarNaJanela(quadro, pref) {
		const jaNaTela = radioDoAssunto(quadro.contentDocument, pref);
		if (jaNaTela) return jaNaTela;
		const inicial = quadro.contentDocument.getElementById("descricaoPesquisa");
		const termos = termosDePesquisa(pref, inicial ? inicial.maxLength : 0);
		for (let i = 0; i < termos.length; i++) {
			const d = quadro.contentDocument;
			const campo = d && d.getElementById("descricaoPesquisa");
			const botao = d && d.getElementById("searchButton");
			if (!campo || !botao) break;
			const carga = proximaCarga(quadro, EXEC_TIMEOUT_MS, "a pesquisa de assunto não respondeu.");
			campo.value = termos[i];
			botao.click();
			await carga;
			try {
				return await esperar(function () {
					return radioDoAssunto(quadro.contentDocument, pref);
				}, 3000, "");
			} catch (err) {
				console.info('[Alterar Classe/Assuntos] pesquisa "' + termos[i] + '" não trouxe o assunto ' + pref.descricao);
			}
		}
		return null;
	}

	// Avisos (alert) do Projudi numa janela: ficam guardados em `lista` para
	// entrar na mensagem de erro; confirmações são aceitas, como o usuário
	// faria.
	function capturarAvisos(win, lista) {
		try {
			if (!win || win.__pdpAvisosCapturados === lista) return;
			win.__pdpAvisosCapturados = lista;
			win.alert = function (msg) {
				const texto = String(msg || "").replace(/\s+/g, " ").trim();
				if (texto && lista.indexOf(texto) === -1) lista.push(texto);
				console.info("[Alterar Classe/Assuntos] alerta do Projudi:", msg);
			};
			win.confirm = function () { return true; };
		} catch (err) {
			// janela inacessível — segue
		}
	}

	// Tela de alteração (já carregada) dentro de `quadro` ou de um quadro
	// dele, ou null.
	function telasDeAlteracao(quadro) {
		const docs = [];
		function olhar(d) {
			if (!d || d.readyState !== "complete" || !d.getElementById(FORM_ID)) return;
			docs.push(d);
		}
		try {
			const d = quadro.contentDocument;
			olhar(d);
			if (d) {
				Array.prototype.forEach.call(d.querySelectorAll("iframe, frame"), function (q) {
					try {
						olhar(q.contentDocument);
					} catch (err) {
						// segue
					}
				});
			}
		} catch (err) {
			// segue
		}
		return docs;
	}

	// Clica em "Selecionar" e espera o assunto aparecer na lista dos
	// assuntos secundários. O Projudi nem sempre recarrega a tela de
	// alteração inteira depois do "Selecionar" (com assunto secundário já
	// na lista, a tela não voltava e dava "a tela de alteração não voltou"):
	// por isso a lista é conferida na tela atual, na tela recarregada e na
	// que se abrir dentro da janela de seleção. Devolve o documento com o
	// assunto na lista (é nele que se clica em "Salvar").
	//
	// CLIQUE PERDIDO: às vezes o Projudi não reage ao primeiro "Selecionar"
	// (nenhuma tela carrega; na mão, a 2ª ou 3ª tentativa dá certo). Se em
	// CLIQUE_PERDIDO_MS nada se mexer — nenhuma tela saiu nem voltou —,
	// marca o assunto e clica de novo, até CLIQUES_SELECIONAR vezes.
	async function selecionarEConferir(quadro, docAntes, dlg, selecionar, pref, radio) {
		const avisos = [];
		let mexeu = false;
		function marcarMovimento() {
			mexeu = true;
		}
		[dlg.defaultView, quadro.contentWindow].forEach(function (w) {
			try {
				w.addEventListener("pagehide", marcarMovimento);
				w.addEventListener("beforeunload", marcarMovimento);
			} catch (err) {
				// segue
			}
		});
		capturarAvisos(dlg.defaultView, avisos);
		capturarAvisos(quadro.contentWindow, avisos);
		function aoCarregar() {
			capturarAvisos(quadro.contentWindow, avisos);
		}
		quadro.addEventListener("load", aoCarregar);
		const vigia = setInterval(function () {
			try {
				Array.prototype.forEach.call(quadro.contentDocument.querySelectorAll("iframe, frame"), function (q) {
					capturarAvisos(q.contentWindow, avisos);
				});
			} catch (err) {
				// segue
			}
		}, 200);
		function comAvisos(texto, doc) {
			const extra = avisos.slice();
			const tela = doc ? mensagemDaTela(doc) : "";
			if (tela && extra.indexOf(tela) === -1) extra.push(tela);
			return texto + (extra.length ? "\n\nAviso do Projudi: " + extra.join("\n") : "");
		}
		try {
			selecionar.click();
			let cliques = 1;
			let ultimoClique = Date.now();
			const fim = Date.now() + EXEC_TIMEOUT_MS;
			let semAssuntoDesde = 0;
			while (Date.now() < fim) {
				await pausa(250);
				const telas = telasDeAlteracao(quadro);
				const certa = telas.filter(function (d) { return temSecundario(d, pref.idAssunto); })[0];
				if (certa) {
					await pausa(300); // scripts da tela recarregada terminarem
					return certa;
				}
				if (!dlg.defaultView || quadro.contentDocument !== docAntes) mexeu = true;
				if (!mexeu && Date.now() - ultimoClique > CLIQUE_PERDIDO_MS && !avisos.length) {
					if (cliques >= CLIQUES_SELECIONAR) {
						const perdido = new Error('o Projudi não reagiu ao "Selecionar" da janela de seleção. Nada foi salvo.');
						perdido.repetir = true;
						throw perdido;
					}
					console.info("[Alterar Classe/Assuntos] o Projudi não reagiu ao \"Selecionar\"; clicando de novo.");
					if (!radio.checked) radio.click();
					selecionar.click();
					cliques++;
					ultimoClique = Date.now();
					continue;
				}
				// A tela de alteração voltou (é outra) sem o assunto: dá um
				// tempo para scripts da tela e desiste.
				const nova = telas.filter(function (d) { return d !== docAntes; })[0];
				if (nova) {
					if (!semAssuntoDesde) semAssuntoDesde = Date.now();
					else if (Date.now() - semAssuntoDesde > 3000) {
						throw new Error(comAvisos('o assunto "' + pref.descricao + '" não entrou na lista de assuntos secundários. Nada foi salvo.', nova));
					}
				}
			}
			const demorou = new Error(comAvisos("a tela de alteração não voltou depois de selecionar o assunto. Nada foi salvo.", null));
			demorou.repetir = !avisos.length;
			throw demorou;
		} finally {
			clearInterval(vigia);
			quadro.removeEventListener("load", aoCarregar);
		}
	}

	// Execução de uma preferência de assunto secundário (ver o início do
	// arquivo): Adicionar → pesquisa → marca → Selecionar → confere → Salvar.
	//
	// Se o Projudi não responder (erro marcado com `repetir`), a extensão
	// começa de novo, do zero, até TENTATIVAS_SECUNDARIO vezes — como o
	// usuário faria. Numa nova tentativa, o assunto já na lista da tela de
	// alteração pode ter entrado pela tentativa anterior sem ter sido salvo:
	// então só se clica em "Salvar" (salvar de novo o que já está salvo não
	// muda nada).
	async function executarSecundario(pref, titulo) {
		if (!pref.idAssunto) {
			throw new Error("esta preferência foi gravada numa versão anterior da extensão e não pode ser usada. Apague-a (🗑) e grave de novo.");
		}
		for (let n = 0; ; n++) {
			try {
				return await tentativaSecundario(pref, titulo, n);
			} catch (err) {
				if (!err || !err.repetir || n + 1 >= TENTATIVAS_SECUNDARIO) throw err;
				console.info("[Alterar Classe/Assuntos] tentativa " + (n + 1) + " falhou (" + err.message + "); tentando de novo.");
				mostrarStatus(titulo + " — o Projudi não respondeu; tentando de novo (" + (n + 2) + "ª tentativa)…");
				await pausa(1000);
			}
		}
	}

	async function tentativaSecundario(pref, titulo, n) {
		const url = await urlDaEdicao();
		const quadro = criarQuadroOculto();
		try {
			const carga = proximaCarga(quadro);
			quadro.src = url;
			let doc = await carga;
			if (!doc || !doc.getElementById(FORM_ID)) throw new Error("a tela de alteração do processo não abriu.");
			if (temSecundario(doc, pref.idAssunto)) {
				if (n === 0) return { jaEstava: true };
				return await salvarSecundario(quadro, doc, titulo);
			}
			const adicionar = doc.getElementById("addButton");
			if (!adicionar) throw new Error('não encontrei o botão "Adicionar" dos Assuntos Secundários.');

			mostrarStatus(titulo + " — abrindo a seleção de assunto…");
			adicionar.click();
			const janela = await esperar(function () {
				const j = docDaJanela(doc);
				return j && j.doc.getElementById("descricaoPesquisa") && j.doc.getElementById("searchButton") ? j : null;
			}, EXEC_TIMEOUT_MS, "a janela de seleção de assunto não abriu.").catch(function (err) {
				err.repetir = true;
				throw err;
			});

			mostrarStatus(titulo + " — pesquisando o assunto…");
			const radio = await pesquisarNaJanela(janela.quadro, pref);
			if (!radio) throw new Error('o assunto "' + pref.descricao + '" não apareceu na pesquisa da janela de seleção. Nada foi salvo.');
			const dlg = radio.ownerDocument;
			if (!radio.checked) radio.click();
			const continuar = dlg.getElementById("continuarCadastrando");
			if (continuar && continuar.checked) continuar.click();
			const selecionar = dlg.getElementById("selectButton");
			if (!selecionar) throw new Error('não encontrei o botão "Selecionar" da janela de seleção.');

			mostrarStatus(titulo + " — selecionando o assunto…");
			doc = await selecionarEConferir(quadro, doc, dlg, selecionar, pref, radio);
			return await salvarSecundario(quadro, doc, titulo);
		} finally {
			setTimeout(function () { quadro.remove(); }, 0);
		}
	}

	// "Salvar" da tela de alteração `doc` (no quadro oculto ou dentro da
	// janela de seleção: a resposta chega no quadro dela).
	async function salvarSecundario(quadro, doc, titulo) {
		const salvar = doc.getElementById("saveButton");
		if (!salvar) throw new Error('não encontrei o botão "Salvar".');
		mostrarStatus(titulo + " — salvando…");
		const quadroDaTela = doc === quadro.contentDocument ? quadro : doc.defaultView.frameElement || quadro;
		const carga = proximaCarga(quadroDaTela);
		salvar.click();
		return respostaDoSalvar(await carga);
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
					? "Clique em <b>Adicionar</b> dos <b>Assuntos Secundários</b>, pesquise, marque o assunto e clique em <b>Selecionar</b>. " +
						"Esse clique só grava a preferência: <b>o assunto não entra no processo agora</b>."
					: "Escolha a nova classe (lupa) e o <b>Motivo da Alteração</b> — ou o novo assunto principal — e clique em <b>Salvar</b>. " +
						"Esse clique só grava a preferência: <b>o processo não é alterado agora</b>.");
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

	async function concluirGravacaoSecundario(assunto, fechar) {
		const sugestao = assunto.descricao.replace(/^\d+\s*-\s*/, "");
		const nome = prompt("Nome da preferência:", sugestao);
		if (nome === null) return; // continua na tela de gravação
		const pref = {
			id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
			tipo: "secundario",
			name: nome.trim() || sugestao,
			descricao: assunto.descricao,
			idAssunto: assunto.idAssunto,
			criadaEm: new Date().toISOString(),
		};
		const prefs = await carregarPrefs();
		prefs.push(pref);
		await salvarPrefs(prefs);
		console.info("[Alterar Classe/Assuntos] preferência gravada:", pref);
		fechar();
		alert('Preferência "★ ' + pref.name + '" gravada. O processo não foi alterado.\n\nPara usá-la, clique na ⭐ dos assuntos secundários e escolha a preferência: o assunto é adicionado e salvo automaticamente.');
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

	// Faz a alteração da preferência e devolve { jaEstava } (nada a fazer),
	// { ok: true } (salva) ou { ok: false, mensagem } (o Projudi recusou);
	// erros de tela viram exceção. Não recarrega nem avisa: isso fica com
	// quem chama (o clique na ⭐, abaixo, ou uma etapa de combo).
	async function alterarConformePreferencia(pref, titulo) {
		mostrarStatus(titulo + " — abrindo a tela de alteração…");
		try {
			return pref.tipo === "secundario" ? await executarSecundario(pref, titulo) : await rodarNoQuadro(await urlDaEdicao(), function (doc, n, win) {
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
		} finally {
			esconderStatus();
		}
	}

	function textoJaEstava(pref) {
		const oQue = pref.tipo === "classe" ? "a classe" : pref.tipo === "secundario" ? "o assunto secundário" : "o assunto principal";
		return "o processo já está com " + oQue + ' "' + pref.descricao + '". Nada foi alterado.';
	}

	async function executarPreferencia(pref) {
		if (ocupado) return;
		ocupado = true;
		const titulo = "★ " + pref.name;
		try {
			const resultado = await alterarConformePreferencia(pref, titulo);
			if (resultado.jaEstava) {
				alert(titulo + ": " + textoJaEstava(pref));
				return;
			}
			if (!resultado.ok) {
				alert(titulo + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse "✏️ Alterar" para ver a tela e fazer a alteração à mão.');
				return;
			}
			mostrarStatus(titulo + " — alteração salva. Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			alert(titulo + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	// Para os combos de preferências (quickActions.js): lista gravada e
	// execução de uma preferência como etapa. `executar` resolve com
	// { ok, texto } — ok também quando o processo já estava assim — e não
	// recarrega a tela (o combo recarrega e segue para a próxima etapa).
	window.__pdpAlterarClasseApi = {
		label: LABEL,
		preferencias: carregarPrefs,
		disponivel: function () { return !!document.getElementById("informacoesProcessuais"); },
		descrever: function (pref) {
			const oQue = pref.tipo === "classe" ? "Alterar a classe para" : pref.tipo === "secundario" ? "Adicionar o assunto secundário" : "Alterar o assunto principal para";
			return oQue + ' "' + pref.descricao + '"' + (pref.tipo === "classe" && pref.motivo ? " (motivo: " + textoMotivo(pref.motivo) + ")" : "") + " e salvar.";
		},
		executar: async function (pref) {
			if (ocupado) return { ok: false, texto: "já há uma alteração de classe/assuntos em andamento." };
			ocupado = true;
			try {
				const resultado = await alterarConformePreferencia(pref, "★ " + pref.name);
				if (resultado.jaEstava) return { ok: true, texto: textoJaEstava(pref), mudou: false };
				if (!resultado.ok) return { ok: false, texto: "o Projudi não aceitou a alteração." + (resultado.mensagem ? " " + resultado.mensagem : "") };
				return { ok: true, texto: "alteração salva.", mudou: true };
			} catch (error) {
				return { ok: false, texto: error && error.message ? error.message : String(error) };
			} finally {
				ocupado = false;
			}
		},
	};

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
			usar.title = (pref.tipo === "secundario" ? "Adicionar agora o assunto secundário \"" + pref.descricao + "\"" : "Alterar agora para \"" + pref.descricao + "\"") + (pref.motivo ? " (motivo: " + textoMotivo(pref.motivo) + ")" : "") + " e salvar — sem confirmação";
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
		nova.className = "pdp-acp-nova pdp-pp-nova";
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
		// Título, busca e "+ Nova preferência" no topo fixo do painel, que
		// cabe sempre na tela e rola por dentro (painelPreferencias.js): no
		// fim de uma lista comprida, o "+ Nova" ficava fora da vista.
		document.body.appendChild(painel);
		painel.removeChild(titulo);
		window.__pdpPainelPrefs.topo(painel, { conteudo: [titulo], novas: [nova], itens: ".pdp-acp-linha" });
		window.__pdpPainelPrefs.caber(painel, botao);
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
			"a." + LINK_CLASS + ".pdp-remover-secundario{margin-left:6px;padding:0 6px;color:#a00 !important;}" +
			"#" + PANEL_ID + "{position:fixed;z-index:2147483640;min-width:260px;max-width:420px;padding:8px;background:#fff;border:1px solid #adadad;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);font:12px Arial,Helvetica,sans-serif;color:#222}" +
			"#" + PANEL_ID + " .pdp-acp-titulo{font-weight:bold;margin:0 0 6px}" +
			"#" + PANEL_ID + " .pdp-acp-vazio{color:#666;margin:0 0 8px;line-height:1.4}" +
			"#" + PANEL_ID + " button{font:12px Arial,Helvetica,sans-serif;color:#222;cursor:pointer;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:4px;padding:3px 9px}" +
			"#" + PANEL_ID + " button:hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888}" +
			// Cada preferência: card retangular de uma linha (★ nome 🗑), o
			// mesmo de "⭐ Minhas Preferências" (quickActions.css).
			"#" + PANEL_ID + " .pdp-acp-linha{display:flex;align-items:center;gap:2px;margin:0 0 4px;background:#fff8e6;border:1px solid #e8cf8a;border-radius:4px}" +
			"#" + PANEL_ID + " .pdp-acp-linha:hover{background:#fff0c7;border-color:#d4b25a}" +
			"#" + PANEL_ID + " .pdp-acp-linha button{background:none;border:none;border-radius:3px}" +
			"#" + PANEL_ID + " .pdp-acp-usar{flex:1;min-width:0;text-align:left;font-weight:bold;font-size:11.5px;color:#333;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			"#" + PANEL_ID + " .pdp-acp-apagar{flex:none;font-size:11px;padding:2px 5px;opacity:.6}" +
			"#" + PANEL_ID + " .pdp-acp-apagar:hover{opacity:1;background:#f6d6d6}" +
			"#" + PANEL_ID + " button.pdp-acp-nova{font-weight:bold}" +
			"#" + PANEL_ID + " .pdp-acp-titulo{margin:0}";
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
				? "Preferências de assuntos secundários: grave um assunto secundário e adicione-o com um clique, já salvo no processo"
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

	const REMOVER_CLASS = "pdp-remover-secundario";

	// ✖ no fim de cada assunto secundário da célula (um por <li>; sem
	// lista, a própria célula é um assunto). O código do assunto é o número
	// do início do texto ("3416 - Furto").
	function botoesRemover(celula) {
		const itens = celula.querySelectorAll("li");
		const alvos = itens.length ? Array.prototype.slice.call(itens) : [celula];
		alvos.forEach(function (item) {
			if (item.querySelector("." + REMOVER_CLASS)) return;
			// Só o texto visível: o Projudi põe no item um <script> (balão de
			// informações, AjaxJspTag.Callout), que não pode entrar no nome.
			const copia = item.cloneNode(true);
			Array.prototype.forEach.call(copia.querySelectorAll("script, style, noscript, ul, ol, ." + LINK_CLASS), function (el) { el.remove(); });
			const texto = copia.textContent.replace(/\s+/g, " ").trim();
			const m = /^(\d+)\s*-/.exec(texto);
			if (!m) return;
			const a = document.createElement("a");
			a.href = "#";
			a.className = LINK_CLASS + " " + REMOVER_CLASS;
			a.textContent = "✖";
			a.title = 'Remover o assunto secundário "' + texto + '" e salvar (pede confirmação)';
			a.addEventListener("click", function (event) {
				event.preventDefault();
				event.stopPropagation();
				removerSecundario(m[1], texto);
			});
			// Sem lista, o ✖ vai antes dos balões "✏️ Alterar"/⭐ da célula.
			const antes = item === celula ? item.querySelector(":scope > ." + LINK_CLASS) : null;
			item.insertBefore(a, antes);
		});
	}

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
				garantirEstilo();
				botoesRemover(valor);
				// Uma linha por assunto secundário: os balões só na primeira.
				if (temLinhaSecundario) continue;
				temLinhaSecundario = true;
			}
			// (o ✖ dos assuntos secundários também é um balão: conta o "✏️ Alterar")
			if (valor.querySelector("a[data-pdp-campo]")) continue;
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
