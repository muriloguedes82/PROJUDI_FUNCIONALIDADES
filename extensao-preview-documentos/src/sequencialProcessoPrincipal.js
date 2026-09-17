// Projudi - Sequencial do processo principal nos processos apensos
//
// Na aba "Informações Gerais" de um processo apenso (ex.: um incidente
// processual apensado a uma Ação Penal), o Projudi já mostra o link do
// processo principal no campo "Processo Principal:", mas não mostra o
// "Sequencial" dele — um identificador numérico (ex.: 45054) que só
// aparece na aba "Informações Gerais" DAQUELE outro processo, e que às
// vezes é necessário (ex.: para localizar o processo por esse número em
// outras telas do Projudi).
//
// Este recurso busca esse número em segundo plano — um iframe oculto,
// mesma técnica já usada com sucesso em quickActions.js/content.js,
// necessária porque o Projudi devolve a página "capada" quando a
// requisição não parece uma navegação de aba de verdade — e insere uma
// linha "Sequencial do Processo Principal:" logo abaixo do campo
// "Processo Principal:" já existente. Só faz sentido (e só aparece) em
// processos que tenham esse campo, ou seja, processos apensos.
(function () {
	"use strict";

	// Evita rodar dentro de iframes ocultos usados por esta ou outras
	// funcionalidades para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpSequencialProcessoPrincipal) return;
	window.__pdpSequencialProcessoPrincipal = true;

	const TAG = "[Projudi Sequencial Processo Principal]";
	const ROW_ATTR = "data-pdp-sequencial-principal";
	const LOADER_ATTR = "data-pdp-loader";

	function findRowByLabel(root, labelText) {
		const labels = root.querySelectorAll("td.label label, td.labelRadio label");
		for (const label of labels) {
			if (label.textContent.trim().replace(/:\s*$/, "").toLowerCase() === labelText.toLowerCase()) {
				return label.closest("tr");
			}
		}
		return null;
	}

	function fetchDoc(url) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute(LOADER_ATTR, "pdp-seq-" + Date.now() + "-" + Math.random().toString(36).slice(2));
			iframe.style.position = "absolute";
			iframe.style.top = "-9999px";
			iframe.style.left = "-9999px";
			iframe.style.width = "1024px";
			iframe.style.height = "768px";

			let settled = false;
			const timeout = setTimeout(function () {
				if (settled) return;
				settled = true;
				cleanup();
				reject(new Error("tempo esgotado carregando " + url));
			}, 12000);

			function cleanup() {
				clearTimeout(timeout);
				if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
			}

			iframe.addEventListener("load", function () {
				if (settled) return;
				let doc, finalUrl;
				try {
					doc = iframe.contentDocument;
					finalUrl = iframe.contentWindow.location.href;
				} catch (err) {
					settled = true;
					cleanup();
					reject(err);
					return;
				}
				// Inserir o iframe já dispara um "load" para about:blank antes da
				// navegação de verdade começar; ignora esse primeiro evento.
				if (finalUrl === "about:blank") return;
				settled = true;
				cleanup();
				resolve(doc);
			});

			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	function init() {
		const table = document.getElementById("informacoesProcessuais");
		if (!table) return;

		const principalRow = findRowByLabel(table, "Processo Principal");
		if (!principalRow) return;
		if (principalRow.nextElementSibling && principalRow.nextElementSibling.hasAttribute(ROW_ATTR)) return;

		const principalLink = principalRow.querySelector("a.link");
		const principalUrl = principalLink && principalLink.href;
		if (!principalUrl) return;

		const newRow = document.createElement("tr");
		newRow.setAttribute(ROW_ATTR, "");
		newRow.innerHTML =
			'<td class="label"><label>Sequencial do Processo Principal:</label></td>' +
			'<td colspan="4"><span class="pdp-seq-principal-valor">Buscando…</span></td>';
		principalRow.insertAdjacentElement("afterend", newRow);
		const valueEl = newRow.querySelector(".pdp-seq-principal-valor");

		fetchDoc(principalUrl)
			.then(function (doc) {
				const sequencialRow = findRowByLabel(doc, "Sequencial");
				const valueCell = sequencialRow && sequencialRow.querySelectorAll("td")[1];
				const sequencial = valueCell && valueCell.textContent.trim();
				valueEl.textContent = sequencial || "não encontrado";
				if (!sequencial) console.warn(TAG, "campo Sequencial não encontrado na página do processo principal:", principalUrl);
			})
			.catch(function (err) {
				valueEl.textContent = "não foi possível buscar";
				console.warn(TAG, "falha ao buscar o Sequencial do processo principal:", principalUrl, err);
			});
	}

	init();
})();
