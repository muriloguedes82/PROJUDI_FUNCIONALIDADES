// Projudi - Sequencial do processo principal nos processos apensos (e do
// próprio processo, quando ele é o principal)
//
// REGRA: o processo principal é sempre o PRIMEIRO processo da linha
// "Apensamentos:" da tela do processo, mesmo num apenso de apenso. Ex.:
//   Processo: 0037276-16.2025.8.16.0019 - Ação Penal        ← principal
//     Processo: 0035990-03.2025.8.16.0019 - Medidas Protetivas
//       Processo: 0022813-35.2026.8.16.0019 - Petição Criminal
// No 35990 e no 22813 aparece "Sequencial do Processo Principal:" com o
// Sequencial do 37276. O campo "Processo Principal:" do Projudi NÃO é usado
// para isso: ele pode apontar para a origem de um desmembramento (no
// exemplo, o próprio 37276 mostra "Processo Principal: 35990").
//
// No primeiro processo da árvore, e em qualquer processo sem a linha
// "Apensamentos:", mostra o "Sequencial:" do próprio processo, logo abaixo de
// "Nível de Sigilo:".
//
// O Sequencial só existe na aba "Informações Gerais", que costuma não estar
// aberta (o padrão é "Movimentações"). Ele é buscado em segundo plano com um
// POST para a action do "processoForm" com selectedIcon=tabDadosProcesso.
// Para o processo principal, troca-se o "id" dessa action pelo id dele, que
// se descobre abrindo o link da árvore (processo.do?_tj=..., que não revela
// o id) num iframe oculto e lendo a action do "processoForm" de lá.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

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
				// Quem chamou remove o iframe com `liberar()` depois de ler.
				clearTimeout(timeout);
				resolve({ doc: doc, liberar: cleanup });
			});

			document.body.appendChild(iframe);
			iframe.src = url;
		});
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
	//
	// Com `idOutroProcesso`, faz o MESMO POST trocando só o "id" da action
	// (visualizacaoProcesso.do?actionType=visualizar&id=...) — é assim que se
	// busca o Sequencial do processo principal de um apenso.
	let avisouFormNaoProcesso = false;
	async function fetchAbaInformacoesGeraisPOST(idOutroProcesso) {
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
		// Só a tela do processo em si (lista de abas + visualização) pode ser
		// reenviada. Diálogos do Projudi também usam id="processoForm" — o de
		// "Arquivamento de Processo" aponta para
		// processoArquivamento.do?actionType=arquivar — e rodam num iframe onde
		// este script também é injetado; reenviar esse formulário em segundo
		// plano EXECUTA a ação (gerava movimentações "ARQUIVADO
		// DEFINITIVAMENTE" duplicadas).
		if (
			!/\/visualizacaoProcesso\.do$/.test(actionUrl.pathname) ||
			actionUrl.searchParams.get("actionType") !== "visualizar" ||
			!document.querySelector('[id^="tabItemprefix"]')
		) {
			if (!avisouFormNaoProcesso) {
				avisouFormNaoProcesso = true;
				console.log(TAG, "#processoForm desta página não é o da tela do processo, busca em segundo plano ignorada:", actionUrl.href);
			}
			return null;
		}

		if (idOutroProcesso) actionUrl.searchParams.set("id", idOutroProcesso);

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

	const RE_NUMERO_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

	// Primeiro processo da árvore de "Apensamentos:" desta página. O Projudi
	// desenha essa árvore a partir do processo-raiz — o que não é apenso de
	// ninguém — com os apensos (e os apensos dos apensos) pendurados abaixo
	// dele, em qualquer processo da árvore que se abra. Ex.:
	//   Processo: 0037276-16.2025.8.16.0019 - Ação Penal        ← raiz
	//     Processo: 0035990-03.2025.8.16.0019 - Medidas Protetivas
	//       Processo: 0022813-35.2026.8.16.0019 - Petição Criminal
	// Tanto no 35990 quanto no 22813 o "processo principal" que interessa é
	// o 37276. Devolve { numero, href } ou null se a árvore não estiver na
	// página (ou o primeiro item não tiver um link utilizável).
	function raizDaArvoreDeApensamentos() {
		const row = document.getElementById("trApensamento") || findRowByLabel(document, "Apensamentos");
		if (!row) return null;
		const cells = row.querySelectorAll("td");
		const valor = cells[cells.length - 1];
		if (!valor) return null;
		const links = Array.prototype.filter.call(valor.querySelectorAll("a[href]"), function (link) {
			const href = link.getAttribute("href") || "";
			return href && href !== "#" && !/^javascript:/i.test(href);
		});
		// De preferência o link cujo próprio texto traz o número do processo
		// (o processo aberto aparece em negrito); senão, o primeiro link para
		// um processo cujo item da árvore traga o número (descarta ícones de
		// abrir/fechar a árvore).
		for (const link of links) {
			const m = RE_NUMERO_CNJ.exec(link.textContent);
			if (m) return { numero: m[0], href: link.href, atual: !!link.querySelector("b, strong") };
		}
		for (const link of links) {
			if (!/processo/i.test(link.href)) continue;
			const item = link.closest("li, tr, div, span") || link;
			const m = RE_NUMERO_CNJ.exec(item.textContent);
			if (m) return { numero: m[0], href: link.href };
		}
		return null;
	}

	// Número do processo exibido numa página do Projudi: o <title> da tela do
	// processo é o próprio número (ex.: " 0022813-35.2026.8.16.0019 ").
	function numeroDaPagina(doc) {
		const m = RE_NUMERO_CNJ.exec(doc.title || "");
		return m ? m[0] : null;
	}

	// Id interno do processo, que fica na action do #processoForm
	// (visualizacaoProcesso.do?actionType=visualizar&id=100000019278347).
	function idDoProcesso(doc) {
		const form = doc.getElementById("processoForm");
		if (!form) return null;
		try {
			return new URL(form.getAttribute("action") || "", window.location.href).searchParams.get("id");
		} catch (err) {
			return null;
		}
	}

	function valorDaAba(root) {
		const row = findRowByLabel(root, "Sequencial");
		const cell = row && row.querySelectorAll("td")[1];
		return (cell && cell.textContent.trim()) || null;
	}

	// Os links das árvores do Projudi (processo.do?_tj=...) não revelam o id
	// do processo. Abre o link num iframe oculto só para ler o id e o número
	// da página carregada; o Sequencial vem depois, pelo POST da aba
	// "Informações Gerais" (o mesmo que já funciona no próprio processo).
	async function identificarPorLink(href) {
		const carregado = await fetchDoc(href);
		try {
			return { id: idDoProcesso(carregado.doc), numero: numeroDaPagina(carregado.doc) };
		} finally {
			carregado.liberar();
		}
	}

	// Lê, pelo POST da aba "Informações Gerais", o Sequencial do processo
	// apontado por `href`. Confere o número do processo em cada passo: se o
	// Projudi devolver outra página, não mostra número nenhum (melhor do que
	// mostrar o Sequencial de outro processo).
	async function lerProcessoPorLink(href, numeroEsperado) {
		const ident = await identificarPorLink(href);
		console.log(TAG, "processo identificado pelo link", { href: href, id: ident.id, numero: ident.numero, numeroEsperado: numeroEsperado });
		if (!ident.id) return null;
		if (numeroEsperado && ident.numero && ident.numero !== numeroEsperado) {
			console.warn(TAG, "o link abriu outro processo", { esperado: numeroEsperado, aberto: ident.numero });
			return null;
		}
		const doc = await fetchAbaInformacoesGeraisPOST(ident.id);
		if (!doc) return null;
		const numero = numeroDaPagina(doc) || ident.numero;
		const esperado = numeroEsperado || ident.numero;
		if (esperado && numero && numero !== esperado) {
			console.warn(TAG, "a aba Informações Gerais veio de outro processo", { esperado: esperado, recebido: numero });
			return null;
		}
		return { numero: numero, sequencial: valorDaAba(doc) };
	}

	// Com a árvore de Apensamentos: o principal é o primeiro processo dela.
	async function sequencialDaRaiz(raiz) {
		const info = await lerProcessoPorLink(raiz.href, raiz.numero);
		console.log(TAG, "Sequencial do primeiro processo da árvore de Apensamentos:", info && info.sequencial, raiz);
		return info && info.sequencial;
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
		const raiz = raizDaArvoreDeApensamentos();
		const numeroAtual = numeroDaPagina(document);

		// O processo principal é sempre o PRIMEIRO da linha "Apensamentos:",
		// quando ela existe — mesmo num apenso de apenso. O campo "Processo
		// Principal:" do Projudi não serve para isso: ele pode apontar para a
		// origem de um desmembramento (ex.: a Ação Penal 37276 mostra
		// "Processo Principal: 35990", que é apenso DELA).
		const atualEhRaiz = raiz && (numeroAtual ? raiz.numero === numeroAtual : raiz.atual);
		if (raiz && !atualEhRaiz) {
			const anchor = principalRow || findRowByLabel(table, "Nível de Sigilo") || table.rows[table.rows.length - 1];
			if (!anchor) return;
			inserirLinhaSequencial(anchor, "Sequencial do Processo Principal", function () {
				return sequencialDaRaiz(raiz);
			});
			return;
		}

		// Primeiro processo da árvore de Apensamentos, ou processo sem
		// Apensamentos: o Projudi já mostra nativamente o próprio "Sequencial:"
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
