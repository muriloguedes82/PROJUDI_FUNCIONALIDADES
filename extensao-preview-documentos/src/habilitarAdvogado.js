// Projudi - Atalho "(Des)Habilitar Advogado"
//
// Habilitar ou desabilitar o advogado de um Réu hoje exige: abrir a aba
// "Partes e Outros", localizar o Réu na lista, abrir a ficha da parte e só
// então clicar no botão nativo "Advogados" (id="enableLawyerButton"), que
// leva à tela `advogadosParte.do` onde o advogado pode ser adicionado,
// alterado (inclui habilitar/desabilitar) ou removido.
//
// Este botão pula esses passos manuais: localiza o(s) Réu/Acusado do
// processo (mesma lista de rótulos usada pelo Oráculo, em oraculoDirect.js
// — "réu", "acusado", "investigado", "noticiado", "autor do fato",
// "representado"), abre a ficha da parte e navega direto para a URL que o
// próprio botão nativo "Advogados" levaria — a mesma técnica de leitura em
// segundo plano via `fetch()` (sem iframe) já usada em oraculoDirect.js e
// documentada em suspensaoAtiva.js. Com mais de um Réu, um diálogo pede
// para escolher qual.
//
// A navegação final para `advogadosParte.do` é sempre uma troca de aba de
// verdade (`document.location.href`), igual à que o próprio botão nativo
// faria — nenhuma ação é praticada sozinha; a habilitação/desabilitação em
// si continua sendo feita manualmente pelo usuário na tela nativa.
(function () {
	"use strict";

	if (window.__pdpHabilitarAdvogado || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpHabilitarAdvogado = true;

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.trim()
			.toLowerCase();
	}

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

	// Mesmos rótulos de seção usados pelo Oráculo (oraculoDirect.js) para
	// achar o Réu/Acusado na aba "Partes e Outros" — o campo "Advogados" só
	// existe para esse tipo de parte.
	const REU_LABELS = /^(reu|reus|acusado|acusados|investigado|investigados|noticiado|noticiados|autor do fato|autores do fato|autores dos fatos|representado|representados)$/;

	function reus(doc) {
		const found = new Map();
		for (const heading of doc.querySelectorAll("h4")) {
			if (!REU_LABELS.test(normalize(heading.textContent))) continue;
			let table = heading.nextElementSibling;
			while (table && !table.matches("table,h3,h4")) table = table.nextElementSibling;
			if (!table || !table.matches("table.resultTable")) continue;
			for (const link of table.querySelectorAll("a.link[href]")) {
				let url;
				try {
					url = localURL(link.getAttribute("href"), "/projudi/processo/parteProcesso.do");
				} catch (err) {
					continue;
				}
				if (!url.searchParams.has("_tj")) continue;
				const name = link.textContent.trim().replace(/\s+/g, " ");
				if (name) found.set(url.href, { name: name, url: url.href });
			}
		}
		return Array.from(found.values());
	}

	function choose(items) {
		if (items.length === 1) return Promise.resolve(items[0]);
		return new Promise(function (resolve) {
			const dialog = document.createElement("dialog");
			dialog.style.cssText = "max-width:520px;width:90%;padding:20px;border:1px solid #777;border-radius:8px;font:14px Arial;";
			const title = document.createElement("h3");
			title.textContent = "(Des)Habilitar Advogado — escolher réu";
			dialog.appendChild(title);
			function finish(value) {
				dialog.close();
				dialog.remove();
				resolve(value);
			}
			items.forEach(function (item) {
				const button = document.createElement("button");
				button.type = "button";
				button.textContent = item.name;
				button.style.cssText = "display:block;width:100%;padding:10px;margin:6px 0;text-align:left;cursor:pointer;";
				button.addEventListener("click", function () { finish(item); });
				dialog.appendChild(button);
			});
			const cancel = document.createElement("button");
			cancel.type = "button";
			cancel.textContent = "Cancelar";
			cancel.addEventListener("click", function () { finish(null); });
			dialog.appendChild(cancel);
			dialog.addEventListener("cancel", function (event) {
				event.preventDefault();
				finish(null);
			});
			document.body.appendChild(dialog);
			dialog.showModal();
		});
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

		let doc = document;
		const selectedIconField = form.elements.namedItem("selectedIcon");
		if (!selectedIconField || selectedIconField.value !== "tabPartes") {
			const tab = Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
				const onclick = el.getAttribute("onclick") || "";
				return /setTab\(/.test(onclick) && /['"]tabPartes['"]/.test(onclick);
			});
			const onclickAttr = tab ? tab.getAttribute("onclick") : "";
			const actionMatch = /setTab\(\s*['"]([^'"]+)['"]/.exec(onclickAttr || "");
			if (!actionMatch) throw new Error('Não encontrei o acesso à aba "Partes e Outros" nesta tela.');
			const url = localURL(actionMatch[1], "/projudi/visualizacaoProcesso.do");
			if (url.searchParams.get("actionType") !== "visualizar") throw new Error('A aba "Partes e Outros" não aponta para uma página de visualização.');
			const body = new URLSearchParams();
			for (const pair of new FormData(form)) {
				if (typeof pair[1] === "string") body.append(pair[0], pair[1]);
			}
			body.set("selectedIcon", "tabPartes");
			body.set("id", id);
			doc = await readPage(url.href, { method: "POST", body: body });
			const responseId = doc.querySelector('#processoForm [name="id"]');
			if (!responseId || responseId.value !== id) throw new Error('A resposta da aba "Partes e Outros" não corresponde ao processo atual.');
		}
		checkContext();

		const items = reus(doc);
		if (!items.length) throw new Error("Não encontrei nenhuma parte classificada como Réu, Acusado, Investigado, Noticiado, Autor do fato ou Representado.");
		const selected = await choose(items);
		if (!selected) return;
		checkContext();

		const party = await readPage(selected.url);
		const enableLawyerButton = party.getElementById("enableLawyerButton");
		if (!enableLawyerButton || enableLawyerButton.disabled) throw new Error('A ficha de "' + selected.name + '" não disponibiliza a opção "Advogados".');
		const onclick = enableLawyerButton.getAttribute("onclick") || "";
		const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(onclick);
		if (!hrefMatch) throw new Error('A ficha de "' + selected.name + '" não disponibiliza a opção "Advogados".');
		const url = localURL(hrefMatch[2], "/projudi/processo/advogadosParte.do");
		checkContext();

		if (typeof window.disableScreen === "function") {
			try {
				window.disableScreen();
			} catch (err) {
				// Ignora — é só o efeito visual nativo de "carregando".
			}
		}
		document.location.href = url.href;
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
