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
		const campo = doc.getElementById(campoId);
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
	function acompanharPopup(iframe, api, campoId) {
		let salvou = false;
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

	async function abrir(campoId) {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}
		if (typeof window.__pdpLerAbaProcesso !== "function") {
			throw new Error('Não encontrei a leitura das abas do processo (habilitarAdvogado.js).');
		}
		const aba = await window.__pdpLerAbaProcesso("tabDadosProcesso", "Informações Gerais");
		const url = findEdicaoUrl(aba.doc);
		if (!url) {
			throw new Error('Não encontrei o botão "Alterar" na aba "Informações Gerais" — talvez seu perfil não tenha permissão para alterar este processo.');
		}
		aba.checkContext();
		acompanharPopup(api.openActionModal(LABEL, url.href), api, campoId);
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
			"a." + LINK_CLASS + ":hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888;}";
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

	const ALVOS = [
		{
			rotulo: /^classe processual/,
			campo: "descricaoClasseProcessual",
			title: 'Alterar a classe processual num popup, sem sair desta tela (mesma tela do botão "Alterar" da aba Informações Gerais)',
		},
		{
			rotulo: /^assunto principal/,
			campo: "descricaoAssuntoPrincipal",
			title: 'Alterar o assunto principal e os assuntos secundários num popup, sem sair desta tela (mesma tela do botão "Alterar" da aba Informações Gerais)',
		},
	];

	function reconcile() {
		const table = document.getElementById("informacoesProcessuais");
		if (!table || !document.getElementById("processoForm")) return;
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
			if (!valor || valor.querySelector("." + LINK_CLASS)) continue;
			garantirEstilo();
			valor.appendChild(criarLink(alvo.campo, alvo.title));
		}
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
