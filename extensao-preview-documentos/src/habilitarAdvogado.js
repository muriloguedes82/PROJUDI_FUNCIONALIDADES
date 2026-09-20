// Projudi - Atalho "(Des)Habilitar Advogado"
//
// Habilitar ou desabilitar o advogado de um Réu hoje exige: abrir a aba
// "Partes e Outros" e, na barra de botões ao final dela, clicar no botão
// nativo "Advogados" (name/id="enableLawyerButton") — um único botão por
// processo (não por parte), que leva à tela `advogadosParte.do` onde o
// advogado pode ser adicionado, alterado (inclui habilitar/desabilitar) ou
// removido.
//
// Este botão pula o passo manual de trocar de aba: garante que a aba
// "Partes e Outros" (selectedIcon=tabPartes) esteja disponível — usando o
// conteúdo já presente na página quando o usuário já estiver nela, ou
// buscando-a em segundo plano via POST para o próprio `#processoForm`
// (mesma técnica, sem iframe, já usada pelo Oráculo em oraculoDirect.js e
// documentada em suspensaoAtiva.js) quando ele estiver em outra aba — e
// então navega direto para a URL que o próprio botão "Advogados" levaria,
// lida do `onclick` desse botão nativo.
//
// Importante: a existência (ou não) de um advogado já habilitado para a
// parte NÃO deve impedir o botão de funcionar — o objetivo é só levar o
// usuário até a tela nativa `advogadosParte.do` (a "última tela"), que por
// si só já mostra a situação atual e permite adicionar o primeiro
// advogado, se for o caso. A navegação final é sempre uma troca de aba de
// verdade (`document.location.href`), igual à que o próprio botão nativo
// faria — nenhuma ação é praticada sozinha; habilitar, desabilitar,
// adicionar ou remover o advogado continua sendo feito manualmente pelo
// usuário na tela nativa.
//
// Se a busca em segundo plano trouxer a aba "Partes e Outros" mas, por
// algum motivo, o botão "Advogados" ainda não vier com o endereço pronto
// (`onclick`) — algo só observado nessa busca em segundo plano, nunca numa
// navegação de verdade —, a extensão não desiste com um erro: ela navega
// de verdade para a aba "Partes e Outros" (a mesma troca de aba que
// aconteceria clicando nela manualmente) e deixa o usuário terminar com um
// único clique em "Advogados" ali mesmo.
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
	function findTabPartesAction(form) {
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

	// Navegação de verdade (não `fetch()`) para a aba "Partes e Outros" —
	// usada quando a busca em segundo plano não trouxe o endereço pronto do
	// botão "Advogados" (ver comentário no topo do arquivo). O usuário
	// termina com um único clique manual em "Advogados" nessa aba.
	function navigateToTabPartes(url, body) {
		const realForm = document.createElement("form");
		realForm.method = "POST";
		realForm.action = url.href;
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
	}

	function navigateToAdvogados(url) {
		if (typeof window.disableScreen === "function") {
			try {
				window.disableScreen();
			} catch (err) {
				// Ignora — é só o efeito visual nativo de "carregando".
			}
		}
		document.location.href = url.href;
	}

	window.__pdpOpenHabilitarAdvogado = async function () {
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

		if (jaEstaNaAbaPartes) {
			const url = findAdvogadosUrl(document);
			if (!url) throw new Error('Não foi possível determinar o endereço da tela "Advogados" a partir do botão nativo.');
			navigateToAdvogados(url);
			return;
		}

		const tabUrl = findTabPartesAction(form);
		const body = tabPartesBody(form, id);
		const doc = await readPage(tabUrl.href, { method: "POST", body: body });
		const responseId = doc.querySelector('#processoForm [name="id"]');
		if (!responseId || responseId.value !== id) throw new Error('A resposta da aba "Partes e Outros" não corresponde ao processo atual.');
		checkContext();

		const url = findAdvogadosUrl(doc);
		if (url) {
			navigateToAdvogados(url);
			return;
		}

		// O botão "Advogados" existe na aba, mas não veio com o endereço
		// pronto nessa leitura em segundo plano — navega de verdade para a
		// aba, em vez de travar com um erro (ver comentário no topo do
		// arquivo).
		navigateToTabPartes(tabUrl, body);
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
			button.title = 'Abrir direto a tela "Advogados" do Réu, para habilitar, desabilitar, adicionar ou remover um advogado';
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
