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
// Como chega até lá:
// 1. Se a página atual já é a aba "Partes e Outros" (selectedIcon=
//    tabPartes) e o botão nativo "Advogados" já vem com o endereço pronto
//    (lido do seu `onclick`), abre esse endereço direto no popup.
// 2. Senão, abre a PRÓPRIA aba "Partes e Outros" dentro do popup (POST de
//    verdade num iframe — não `fetch()`: testes anteriores desta extensão
//    mostraram o Projudi devolver telas sem os botões de ação quando a
//    requisição não "parece" uma navegação de aba real, ver README) e,
//    assim que ela carregar, continua sozinha para "Advogados" se o
//    endereço já vier pronto — sem exigir um segundo clique. Se não vier
//    (caso raro), o usuário só precisa clicar em "Advogados" ali mesmo,
//    dentro do popup, sem nunca ter saído da tela principal.
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

	// POST de verdade DENTRO de um iframe já existente (o do popup desta
	// extensão), pelo `name` dele como alvo do formulário — nunca navega a
	// aba visível, só o conteúdo do iframe.
	function postIntoIframe(iframe, url, body) {
		const frameName = iframe.name || "pdp-habilitar-advogado-" + Date.now() + "-" + Math.random().toString(36).slice(2);
		iframe.name = frameName;
		const realForm = document.createElement("form");
		realForm.method = "POST";
		realForm.action = url;
		realForm.target = frameName;
		realForm.style.display = "none";
		for (const [name, value] of body) {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = name;
			input.value = value;
			realForm.appendChild(input);
		}
		document.body.appendChild(realForm);
		realForm.submit();
		realForm.remove();
	}

	// Chama `callback` só na primeira navegação de VERDADE do iframe —
	// inserir/apontar um iframe já dispara um "load" para o `about:blank`
	// inicial, antes de qualquer navegação de verdade começar (mesma
	// armadilha documentada em quickActions.js/fetchDoc e em
	// ordenarCumprimentos.js/waitForIframeEvent).
	function onFirstRealLoad(iframe, callback) {
		function onLoad() {
			let href;
			try {
				href = iframe.contentWindow.location.href;
			} catch (err) {
				href = null;
			}
			if (href === "about:blank") return;
			iframe.removeEventListener("load", onLoad);
			callback();
		}
		iframe.addEventListener("load", onLoad);
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

		const selectedIconField = form.elements.namedItem("selectedIcon");
		const jaEstaNaAbaPartes = !!selectedIconField && selectedIconField.value === "tabPartes";

		if (jaEstaNaAbaPartes) {
			const url = findAdvogadosUrl(document);
			if (url) {
				api.openActionModal("Advogados", url.href);
				return;
			}
			// Raro: já está na aba certa, mas o botão nativo ainda não veio com
			// o endereço pronto — cai para o mesmo caminho de baixo, que abre a
			// aba dentro do popup e tenta de novo por ali.
		}

		const tabUrl = findTabPartesAction();
		const body = tabPartesBody(form, id);
		const iframe = api.openActionModal("Partes e Outros", null);
		onFirstRealLoad(iframe, function () {
			let doc;
			try {
				doc = iframe.contentDocument;
			} catch (err) {
				return;
			}
			if (!doc) return;
			const url = findAdvogadosUrl(doc);
			// Continua sozinha para "Advogados", ainda dentro do mesmo popup,
			// se o endereço já vier pronto. Senão, deixa o usuário na aba
			// "Partes e Outros" (já aberta no popup) para clicar em
			// "Advogados" manualmente ali mesmo.
			if (url) iframe.src = url.href;
		});
		postIntoIframe(iframe, tabUrl.href, body);
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
