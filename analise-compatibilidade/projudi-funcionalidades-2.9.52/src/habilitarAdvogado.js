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
(function () {
	"use strict";

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

	// Encontra a URL da própria tela do processo com a aba "Partes e Outros"
	// selecionada, a partir do `onclick` do item de aba nativo (mesma técnica
	// usada por oraculoDirect.js para achar `setTab('...')`).
	function findTabPartesAction() {
		const tab = Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && /['"]tabPartes['"]/.test(onclick);
		});
		const onclickAttr = tab ? tab.getAttribute("onclick") : "";
		const actionMatch = /setTab\(\s*['"]([^'"]+)['"]/.exec(onclickAttr || "");
		if (!actionMatch) throw new Error('Não encontrei o acesso à aba "Partes e Outros" nesta tela.');
		const url = localURL(actionMatch[1], "/projudi/visualizacaoProcesso.do");
		if (url.searchParams.get("actionType") !== "visualizar") throw new Error('A aba "Partes e Outros" não aponta para uma página de visualização.');
		return url;
	}

	function tabPartesBody(form, id) {
		const body = new URLSearchParams();
		for (const pair of new FormData(form)) {
			if (typeof pair[1] === "string") body.append(pair[0], pair[1]);
		}
		body.set("selectedIcon", "tabPartes");
		body.set("id", id);
		return body;
	}

	window.__pdpOpenHabilitarAdvogado = async function () {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}

		const form = document.getElementById("processoForm");
		if (!form) throw new Error("Não foi possível identificar o processo atual — abra a tela de um processo primeiro.");
		const id = form.elements.namedItem("id") ? form.elements.namedItem("id").value : null;
		if (!/^\d+$/.test(id || "")) throw new Error("Não foi possível identificar o processo atual.");

		function checkContext() {
			const current = form.elements.namedItem("id");
			if (!form.isConnected || !current || current.value !== id) throw new Error("O processo mudou durante a operação. Clique novamente.");
		}

		const selectedIconField = form.elements.namedItem("selectedIcon");
		const jaEstaNaAbaPartes = !!selectedIconField && selectedIconField.value === "tabPartes";

		let doc = document;
		if (!jaEstaNaAbaPartes) {
			const tabUrl = findTabPartesAction();
			const body = tabPartesBody(form, id);
			doc = await readPage(tabUrl.href, { method: "POST", body: body });
			const responseId = doc.querySelector('#processoForm [name="id"]');
			if (!responseId || responseId.value !== id) throw new Error('A resposta da aba "Partes e Outros" não corresponde ao processo atual.');
			checkContext();
		}

		const url = findAdvogadosUrl(doc);
		if (!url) throw new Error('Não foi possível determinar o endereço da tela "Advogados" a partir do botão nativo.');
		checkContext();
		api.openActionModal("Advogados", url.href);
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
			button.textContent = "⚖️ (Des)Habilitar Advogado";
			button.title = 'Abrir a tela "Advogados" num popup, sem sair desta tela, para habilitar, desabilitar, adicionar ou remover um advogado';
			button.addEventListener("click", async function () {
				if (button.disabled) return;
				button.disabled = true;
				try {
					await window.__pdpOpenHabilitarAdvogado();
				} catch (error) {
					alert('Não foi possível abrir a tela de Advogados: ' + error.message);
				} finally {
					button.disabled = false;
				}
			});
		}
		if (button.previousElementSibling !== clipboardBtn || button.parentElement !== clipboardBtn.parentElement) {
			clipboardBtn.insertAdjacentElement("afterend", button);
		}
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
