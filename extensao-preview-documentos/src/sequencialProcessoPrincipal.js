// Projudi - Sequencial do processo principal nos processos apensos (e do
// próprio processo, quando ele é o principal)
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
// "Processo Principal:" já existente, só nos processos apensos (os que
// têm esse campo).
//
// No processo principal em si (que não tem "Processo Principal:", por não
// ser apenso de ninguém) o próprio "Sequencial" já aparece nativamente
// nessa mesma página, só que mais abaixo no quadro (perto de "Chave do
// Processo") e só depois que a aba "Informações Gerais" carregar — o que
// não acontece sozinho se o processo abrir noutra aba (o padrão é
// "Movimentações"). Por isso, quando o campo ainda não estiver disponível
// localmente, ele é buscado em segundo plano com um POST para o próprio
// "processoForm" da página (sem iframe, sem depender de nenhum link de
// Apensamentos/Vínculos) — e o valor é repetido, destacado, numa linha
// "Sequencial:" logo abaixo de "Nível de Sigilo:", para ficar tão visível
// quanto nos apensos.
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
	const COR = "#ff6a00";

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

	// Sem indicar a aba, o Projudi abre a página na última aba que a sessão
	// do usuário deixou selecionada (pode não ser "Informações Gerais", onde
	// fica o Sequencial) — o mesmo parâmetro já é usado nativamente pelo
	// Projudi noutros links da própria página (ex.: "selectedIcon=
	// tabAcoesVinculadas" para abrir na aba Vínculos).
	function comAbaInformacoesGerais(href) {
		try {
			const url = new URL(href, window.location.href);
			url.searchParams.set("selectedIcon", "tabDadosProcesso");
			return url.href;
		} catch (err) {
			return href;
		}
	}

	// Busca a aba "Informações Gerais" DESTA MESMA página em segundo plano —
	// POST para a própria action do formulário #processoForm, com um campo
	// oculto "selectedIcon" no corpo (mesma técnica já usada com sucesso em
	// monitoracaoAtiva.js/suspensaoAtiva.js/oraculoDirect.js). Diferente de
	// reabrir a página num iframe por GET (que não funciona aqui — essa URL
	// costuma ser resultado de um POST do próprio "processoForm", e reabri-la
	// como GET não navega para o mesmo lugar), este POST funciona em
	// QUALQUER aba em que o processo tenha aberto: o Projudi normalmente abre
	// em "Movimentações", não em "Informações Gerais", então o campo
	// "Sequencial" só existiria no documento se o usuário já tivesse clicado
	// nessa aba — o que não pode ser exigido aqui.
	async function fetchAbaInformacoesGeraisPOST() {
		const form = document.getElementById("processoForm");
		if (!form) {
			console.warn(TAG, "#processoForm não encontrado nesta página — não é possível buscar a aba em segundo plano aqui");
			return null;
		}

		let actionUrl;
		try {
			actionUrl = new URL(form.getAttribute("action") || form.action, window.location.href);
		} catch (err) {
			console.warn(TAG, "action do #processoForm inválida:", err);
			return null;
		}
		if (actionUrl.origin !== window.location.origin) {
			console.warn(TAG, "action do #processoForm aponta para outra origem, abortando busca em segundo plano:", actionUrl.href);
			return null;
		}

		const body = new URLSearchParams();
		for (const [name, value] of new FormData(form)) {
			if (typeof value === "string") body.append(name, value);
		}
		body.set("selectedIcon", "tabDadosProcesso");

		console.log(TAG, "buscando a aba 'Informações Gerais' em segundo plano (POST):", actionUrl.href);

		const controller = new AbortController();
		const timeout = setTimeout(function () {
			controller.abort();
		}, 20000);
		try {
			const response = await fetch(actionUrl.href, {
				method: "POST",
				body: body,
				credentials: "same-origin",
				signal: controller.signal,
			});
			if (!response.ok) throw new Error("Projudi respondeu " + response.status + " " + response.statusText);
			const bytes = await response.arrayBuffer();
			// O Projudi serve em windows-1252; lê o <meta charset> da própria
			// resposta (ou do cabeçalho HTTP) em vez de assumir um valor fixo,
			// mesma técnica usada em oraculoDirect.js.
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			const html = new TextDecoder(charset).decode(bytes);
			return new DOMParser().parseFromString(html, "text/html");
		} finally {
			clearTimeout(timeout);
		}
	}

	// Sobe a cadeia de apensamentos até achar a raiz — o processo que já
	// não tem, ele mesmo, um "Processo Principal:" — e devolve o Sequencial
	// DELA. Necessário porque um apenso pode estar apensado a outro
	// processo que, por sua vez, também é apenso de um terceiro (ex.: uma
	// Liberdade Provisória apensada a uma Medida Protetiva, que por sua vez
	// está apensada ao Inquérito Policial original): o "processo principal"
	// que interessa mostrar é sempre o da raiz, não o do primeiro nível.
	//
	// O campo "Processo Principal:" fica fora da aba "Informações Gerais"
	// (não depende dela carregar via AJAX — está sempre presente assim que
	// a página termina de montar, mesmo padrão já usado em `init()` para a
	// página atual), por isso dá para checar cada nível assim que o iframe
	// carrega, sem esperar. Só o "Sequencial" da raiz, que é o que
	// realmente precisa da aba carregada, é que exige a espera.
	async function sequencialDaRaizDaCadeia(url) {
		const LIMITE_NIVEIS = 10;
		let alvo = url;
		for (let nivel = 0; nivel < LIMITE_NIVEIS; nivel++) {
			const targetUrl = comAbaInformacoesGerais(alvo);
			console.log(TAG, "buscando na cadeia de apensamentos", { nivel: nivel, targetUrl: targetUrl });
			const doc = await fetchDoc(targetUrl);
			console.log(TAG, "iframe carregado", {
				nivel: nivel,
				finalUrl: doc.location && doc.location.href,
				title: doc.title,
				temTabelaInformacoesProcessuais: !!doc.getElementById("informacoesProcessuais"),
			});

			const principalRowNesteNivel = findRowByLabel(doc, "Processo Principal");
			const linkNesteNivel = principalRowNesteNivel && principalRowNesteNivel.querySelector("a.link");
			if (linkNesteNivel && linkNesteNivel.href) {
				// Este processo também é apenso de outro — sobe mais um nível.
				alvo = linkNesteNivel.href;
				continue;
			}

			// Achou a raiz: busca o Sequencial DELA (aqui sim é preciso esperar
			// a aba "Informações Gerais" carregar via AJAX).
			const sequencialRow = await waitForRow(doc, "Sequencial", 10000);
			const valueCell = sequencialRow && sequencialRow.querySelectorAll("td")[1];
			const sequencial = valueCell && valueCell.textContent.trim();
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
				console.warn(TAG, "campo Sequencial não encontrado na raiz da cadeia de apensamentos", {
					nivel: nivel,
					targetUrl: targetUrl,
					finalUrl: doc.location && doc.location.href,
					title: doc.title,
					rotulosEncontrados: rotulosEncontrados,
					bodySnippet: (doc.body ? doc.body.textContent || "" : "").replace(/\s+/g, " ").trim().slice(0, 300),
				});
			} else {
				console.log(TAG, "Sequencial da raiz da cadeia encontrado:", sequencial, { niveis: nivel + 1 });
			}
			return sequencial || null;
		}
		console.warn(TAG, "cadeia de apensamentos excedeu " + LIMITE_NIVEIS + " níveis — abortando para evitar loop infinito", { url: url });
		return null;
	}

	// Insere a linha "labelTexto:" logo depois de `anchorRow`, com o valor
	// resolvido de forma assíncrona por `buscarValor` (uma função que
	// devolve uma Promise<string|null>).
	function inserirLinhaSequencial(anchorRow, labelTexto, buscarValor) {
		if (anchorRow.nextElementSibling && anchorRow.nextElementSibling.hasAttribute(ROW_ATTR)) return;

		const newRow = document.createElement("tr");
		newRow.setAttribute(ROW_ATTR, "");
		newRow.innerHTML =
			'<td class="label" style="color:' + COR + '"><label style="color:' + COR + '">' + labelTexto + ':</label></td>' +
			'<td colspan="4" style="color:' + COR + '"><span class="pdp-seq-principal-valor">Buscando…</span></td>';
		anchorRow.insertAdjacentElement("afterend", newRow);
		const valueEl = newRow.querySelector(".pdp-seq-principal-valor");

		buscarValor()
			.then(function (sequencial) {
				valueEl.textContent = sequencial || "não encontrado";
			})
			.catch(function (err) {
				valueEl.textContent = "não foi possível buscar";
				console.warn(TAG, "falha ao buscar o Sequencial:", { erro: err && (err.stack || err.message || err) });
			});
	}

	function init() {
		const table = document.getElementById("informacoesProcessuais");
		if (!table) return;

		const principalRow = findRowByLabel(table, "Processo Principal");

		if (principalRow) {
			// Processo apenso: mostra o Sequencial do processo principal, logo
			// abaixo do campo "Processo Principal:" já existente — subindo a
			// cadeia de apensamentos até a raiz, se este processo estiver
			// apensado a outro que, por sua vez, também é apenso de um
			// terceiro.
			const principalLink = principalRow.querySelector("a.link");
			if (!principalLink || !principalLink.href) return;
			inserirLinhaSequencial(principalRow, "Sequencial do Processo Principal", function () {
				return sequencialDaRaizDaCadeia(principalLink.href);
			});
			return;
		}

		// Processo principal (ou um processo qualquer que não é apenso de
		// ninguém): o Projudi já mostra nativamente o próprio "Sequencial:"
		// nessa mesma página, só que mais abaixo no quadro (perto de "Chave
		// do Processo") — mas só depois que a aba "Informações Gerais" for
		// carregada, o que não acontece sozinho quando o processo abre
		// noutra aba (o padrão é "Movimentações"). Em vez de depender do
		// usuário clicar nessa aba, ou de adivinhar — numa árvore de
		// Apensamentos ou Vínculos — qual link leva de volta a "este
		// processo" (o que dava número errado quando o processo não tinha
		// apensos, já que a árvore de Vínculos não garante que o primeiro
		// item seja "este processo", ao contrário da de Apensamentos), busca
		// a aba em segundo plano (POST) sempre que ela ainda não estiver
		// disponível localmente — funciona em qualquer aba em que o processo
		// tenha aberto, com ou sem apensos/vínculos, e nunca pode mostrar o
		// número de outro processo, pois a busca sempre volta para este
		// mesmo #processoForm.
		const anchorRow = findRowByLabel(table, "Nível de Sigilo") || table.rows[table.rows.length - 1];
		if (!anchorRow) return;
		if (anchorRow.nextElementSibling && anchorRow.nextElementSibling.hasAttribute(ROW_ATTR)) return;

		function inserirValor(sequencial) {
			if (!sequencial) return;
			if (anchorRow.nextElementSibling && anchorRow.nextElementSibling.hasAttribute(ROW_ATTR)) return;

			const newRow = document.createElement("tr");
			newRow.setAttribute(ROW_ATTR, "");
			newRow.innerHTML =
				'<td class="label" style="color:' + COR + '"><label style="color:' + COR + '">Sequencial:</label></td>' +
				'<td colspan="4" style="color:' + COR + '"></td>';
			newRow.querySelector("td:last-child").textContent = sequencial;
			anchorRow.insertAdjacentElement("afterend", newRow);
		}

		function valorDaAba(root) {
			const row = findRowByLabel(root, "Sequencial");
			const cell = row && row.querySelectorAll("td")[1];
			return cell && cell.textContent.trim();
		}

		// Espera um pouco pela aba local (cobre tanto o caso em que o
		// usuário já está nela quanto o caso, mais raro, em que o Projudi
		// abriu o processo direto nela e ela ainda está carregando via
		// AJAX); se não aparecer a tempo, busca em segundo plano (POST).
		waitForRow(document, "Sequencial", 4000).then(function (sequencialRow) {
			const cell = sequencialRow && sequencialRow.querySelectorAll("td")[1];
			const sequencial = cell && cell.textContent.trim();
			if (sequencial) {
				inserirValor(sequencial);
				return;
			}

			fetchAbaInformacoesGeraisPOST()
				.then(function (doc) {
					if (!doc) return;
					inserirValor(valorDaAba(doc));
				})
				.catch(function (err) {
					console.warn(TAG, "falha ao buscar a aba 'Informações Gerais' em segundo plano:", err && (err.stack || err.message || err));
				});
		});
	}

	init();
})();
