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

	// O campo "Sequencial" fica dentro do conteúdo da aba "Informações
	// Gerais" (div#tabprefix0), que o Projudi carrega via uma requisição
	// AJAX própria assim que a página termina de montar — não vem pronto no
	// HTML inicial. Por isso o "load" do iframe (fetchDoc) não é garantia de
	// que o campo já esteja no documento: é preciso esperar por ele
	// aparecer, tentando de novo por alguns segundos.
	function waitForRow(doc, labelText, timeoutMs) {
		return new Promise(function (resolve) {
			const deadline = Date.now() + timeoutMs;
			(function tick() {
				const row = findRowByLabel(doc, labelText);
				if (row) return resolve(row);
				if (Date.now() >= deadline) return resolve(null);
				setTimeout(tick, 250);
			})();
		});
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
		if (!principalLink || !principalLink.href) return;

		// Sem indicar a aba, o Projudi abre a página do processo principal na
		// última aba que a sessão do usuário deixou selecionada (pode não ser
		// "Informações Gerais", onde fica o Sequencial) — o mesmo parâmetro já
		// é usado nativamente pelo Projudi noutros links da própria página
		// (ex.: "selectedIcon=tabAcoesVinculadas" para abrir na aba Vínculos).
		let principalUrl;
		try {
			const url = new URL(principalLink.href, window.location.href);
			url.searchParams.set("selectedIcon", "tabDadosProcesso");
			principalUrl = url.href;
		} catch (err) {
			principalUrl = principalLink.href;
		}

		const newRow = document.createElement("tr");
		newRow.setAttribute(ROW_ATTR, "");
		newRow.innerHTML =
			'<td class="label" style="color:#e08a1e"><label style="color:#e08a1e">Sequencial do Processo Principal:</label></td>' +
			'<td colspan="4" style="color:#e08a1e"><span class="pdp-seq-principal-valor">Buscando…</span></td>';
		principalRow.insertAdjacentElement("afterend", newRow);
		const valueEl = newRow.querySelector(".pdp-seq-principal-valor");

		console.log(TAG, "iniciando busca", { paginaAtual: window.location.href, principalUrl: principalUrl });

		fetchDoc(principalUrl)
			.then(function (doc) {
				console.log(TAG, "iframe carregado", {
					finalUrl: doc.location && doc.location.href,
					title: doc.title,
					temTabelaInformacoesProcessuais: !!doc.getElementById("informacoesProcessuais"),
					temAbaInformacoesGeraisAtiva: !!doc.querySelector("#tabItemprefix0.currentTab"),
				});
				return waitForRow(doc, "Sequencial", 10000).then(function (sequencialRow) {
					const valueCell = sequencialRow && sequencialRow.querySelectorAll("td")[1];
					const sequencial = valueCell && valueCell.textContent.trim();
					valueEl.textContent = sequencial || "não encontrado";
					if (!sequencial) {
						// Diagnóstico: sem isso, uma falha aqui não dá nenhuma pista de
						// qual foi o problema (aba errada, sessão/redirecionamento,
						// rótulo diferente do esperado etc.) — lista os rótulos que
						// realmente vieram na página buscada, para comparar com
						// "Sequencial" à mão no console (F12) sem precisar adivinhar.
						const rotulosEncontrados = Array.prototype.slice
							.call(doc.querySelectorAll("td.label label, td.labelRadio label"))
							.map(function (label) {
								return label.textContent.trim();
							})
							.filter(Boolean);
						console.warn(TAG, "campo Sequencial não encontrado na página do processo principal", {
							principalUrl: principalUrl,
							finalUrl: doc.location && doc.location.href,
							title: doc.title,
							rotulosEncontrados: rotulosEncontrados,
							bodySnippet: (doc.body ? doc.body.textContent || "" : "").replace(/\s+/g, " ").trim().slice(0, 300),
						});
					} else {
						console.log(TAG, "Sequencial encontrado:", sequencial);
					}
				});
			})
			.catch(function (err) {
				valueEl.textContent = "não foi possível buscar";
				console.warn(TAG, "falha ao buscar o Sequencial do processo principal:", { principalUrl: principalUrl, erro: err && (err.stack || err.message || err) });
			});
	}

	init();
})();
