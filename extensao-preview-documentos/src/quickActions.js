// Projudi - Atalhos para o painel "Ações" da tela de Movimentações
//
// A tela de Movimentações do Projudi tem um painel lateral "Ações" (e um
// segundo bloco "Outras Ações" logo abaixo) com uma lista comprida de
// links (Intimar Partes, Ordenar Cumprimentos, Realizar Remessa, Enviar
// Concluso, Apensar, etc.) que obriga a rolar a tela para encontrar a ação
// desejada. Este recurso adiciona um botão flutuante POR GRUPO de ações
// (Concluso, Remessa, Ordenações, Partes, Outras ações), lado a lado, no
// mesmo canto onde já ficam os botões de WhatsApp e e-mail.
//
// Cada botão abre um painel com:
// 1. As ações do grupo, com um atalho "Abrir" que só localiza o link
//    NATIVO correspondente já presente na página (mesmo texto, mesmo
//    elemento <a class="link">, com o onclick que o próprio Projudi já
//    definiu) e simula um clique nele — sem reconstruir nenhuma URL/token
//    de sessão.
// 2. Preferências salvas para cada ação: um "instantâneo" dos campos que o
//    próprio usuário preencheu uma vez num diálogo do Projudi. Clicar numa
//    preferência salva reabre o diálogo, repreenche os mesmos campos e
//    pede UMA confirmação rápida (dentro do próprio painel desta
//    extensão, sem precisar digitar nada de novo) antes de clicar no botão
//    de confirmar/enviar do próprio Projudi.
//
// Aviso importante (ver README, seção "Ações rápidas e preferências"): como
// o Projudi abre esses diálogos como janelas internas da própria página
// (não uma nova aba), a extensão não tem uma lista oficial dos campos de
// cada formulário — ela localiza o formulário visível mais provável de
// forma heurística. Sempre confira os campos preenchidos automaticamente
// antes de confirmar.

(function () {
	"use strict";

	if (window.__pdpQuickActionsInjected) return;
	window.__pdpQuickActionsInjected = true;

	// Este recurso ("Ações rápidas") lê o painel "Ações" do Projudi, que não
	// existe no SEEU — os rótulos em ACTION_GROUPS/PROCESS_TOOLBAR_LABELS são
	// específicos do Projudi. hasProcessNumberMarker() (usada por
	// isOnProcessScreen) reconhece o marcador de processo do SEEU também
	// (mesma função usada pelo recurso irmão de e-mail), o que fazia a
	// fileira de botões aparecer no SEEU sem nenhuma ação funcionar de fato.
	// Por isso o recurso inteiro fica desativado nesse domínio.
	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(window.location.hostname);

	// Rótulos exatos dos links do painel Ações/Outras Ações, agrupados como
	// aparecem para o usuário. Comparados com o texto do link já "limpo"
	// (sem os marcadores "(*)"/ícones de ajuda/menu de contexto — ver
	// normalizeLinkText()).
	const ACTION_GROUPS = [
		{
			id: "concluso",
			title: "Concluso",
			icon: "📤",
			actions: ["Enviar Concluso"],
		},
		{
			id: "remessa",
			title: "Remessa",
			icon: "📦",
			actions: ["Realizar Remessa", "Remessa Eletrônica para o Tribunal de Justiça"],
		},
		{
			id: "ordenacoes",
			title: "Ordenações",
			icon: "🔀",
			actions: ["Ordenar Cumprimentos", "Ordenar RPV", "Ordenar Expedição BNMP"],
		},
		{
			id: "partes",
			title: "Partes",
			icon: "📨",
			actions: ["Intimar Partes", "Notificar Partes", "Citar Partes", "Intimar Peritos e Auxiliares da Justiça"],
		},
		{
			id: "suspender",
			title: "Suspender",
			icon: "⏸️",
			actions: ["Suspender ou Sobrestar Processo"],
		},
		{
			id: "transitar",
			title: "Transitar",
			icon: "🏁",
			actions: ["Transitar em Julgado"],
		},
		{
			id: "arquivar",
			title: "Arquivar",
			icon: "🗄️",
			actions: ["Arquivar Processo"],
		},
		{
			id: "outras",
			title: "Outras",
			icon: "⋯",
			actions: [
				"Interromper Prazo",
				"Declínio de competência para a Segunda Instância",
				"Apensar",
				"Desapensar",
			],
		},
	];

	const PROCESS_TOOLBAR_LABELS = [
		"Peticionar",
		"Juntar Documento",
		"Patronato",
		"Exportar Processo",
		"Pedido Incidental",
		"Navegar",
		"Voltar",
	];
	const BUTTON_SCREEN_MARGIN = 12;
	// Fica à esquerda do botão de WhatsApp e dos botões de e-mail, quando
	// existirem, para os grupos de botões desta extensão ficarem juntos sem
	// se sobrepor (mesma técnica usada entre WhatsApp e e-mail).
	const OTHER_BUTTON_SELECTOR = "#pdp-wa-launcher, .pdp-email-visible";
	const PREFERENCES_KEY = "pdpActionPreferences"; // { [actionLabel]: [{id, name, fields, createdAt}] }
	const DIALOG_WAIT_TIMEOUT_MS = 6000;
	const DIALOG_WAIT_INTERVAL_MS = 150;
	const SUBMIT_LABEL_CANDIDATES = ["confirmar", "enviar", "salvar", "ok", "concluir", "sim", "gravar", "executar", "confirma"];

	let row = null;
	let activePanel = null;
	let activeGroupId = null;
	let processScreenEligible = false;
	let captureToolbar = null;
	let confirmBar = null;
	let activeModalIframe = null;

	// O shim de window.close()/window.opener (src/closeShim.js,
	// "document_start", roda ANTES de qualquer script da própria página do
	// diálogo) avisa por postMessage sobre o que acontece dentro do iframe
	// do popup — inclusive erros não tratados no script nativo (ver
	// closeShim.js para o porquê disso ser útil para diagnóstico) — mesmo
	// quando isso acontece de forma síncrona durante o carregamento da
	// página, cedo demais para qualquer shim aplicado só a partir do evento
	// "load" do <iframe> (ver attachModalIframeCloseShim).
	//
	// IMPORTANTE: o Projudi usa framesets — a própria tela do processo
	// (onde esta extensão cria o popup) já é um sub-frame, nunca o topo
	// literal da aba (confirmado via os logs de diagnóstico do
	// closeShim.js: "top?" veio `false` até para a página processo.do).
	// Por isso o listener NÃO pode ficar restrito a `window.top === window`
	// — isso registrava o listener só no frameset externo, que nunca cria
	// popup nenhum e por isso nunca via a mensagem. Cada instância deste
	// script (uma por frame) registra seu próprio listener; só a que tiver
	// `activeModalIframe` preenchido (a que de fato abriu o popup) chega a
	// bater no `event.source` e reagir — as demais ignoram silenciosamente.
	window.addEventListener("message", function (event) {
		if (event.origin !== window.location.origin) return;
		if (!event.data || event.data.__pdpShim !== true) return;
		if (!activeModalIframe || event.source !== activeModalIframe.contentWindow) return;
		if (event.data.__pdpCloseSignal) {
			logChainStep("recebido sinal de fechamento do popup (closeShim, document_start)", event.data);
			removeActionModal();
		} else if (event.data.__pdpOpenerSignal) {
			logChainStep("closeShim: estado inicial de window.opener no diálogo", event.data);
		} else if (event.data.__pdpErrorSignal) {
			logChainStep("closeShim: erro não tratado dentro do diálogo", event.data);
		}
	});

	// -------------------------------------------------------------------
	// Detecção da tela de processo (mesma técnica usada em content.js/email.js)
	// -------------------------------------------------------------------

	function findProcessToolbarElement() {
		const candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			const text = (el.textContent || el.value || "").trim();
			if (PROCESS_TOOLBAR_LABELS.indexOf(text) !== -1) return el;
		}
		return null;
	}

	// Número dos autos: mesma técnica usada em email.js (extractProcessNumber)
	// para identificar que a tela atual pertence de fato a um processo aberto,
	// e não só a alguma tela solta do sistema que por coincidência tenha um
	// elemento #backButton ou um cabeçalho "Ações" (padrão comum em telas de
	// cadastro/administração do Projudi que nada têm a ver com processos).
	function hasProcessNumberMarker() {
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return true;
		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl && /[\d.\-]{15,}/.test(seeuEl.textContent || "")) return true;
		return false;
	}

	// A tela de Ações (movimentarProcesso.do) e a tela intermediária de
	// detalhe da movimentação NÃO têm nenhum dos botões de
	// PROCESS_TOOLBAR_LABELS — o botão de voltar delas se chama "Voltar
	// para o Processo" (id="backButton"), texto diferente do "Voltar" da
	// barra de ações do processo. Por isso a checagem original deixava a
	// fileira de botões desta extensão sem aparecer justamente nas telas
	// onde ela mais importa. Agora também conta como elegível qualquer
	// tela com esse #backButton, com o marcador direto da tela de Ações
	// (isOnAcoesScreen) ou com o botão "Movimentar a Partir Desta
	// Movimentação" (findMovimentarButton) — mesma ideia de robustez a
	// diferenças de texto já usada no recurso irmão de WhatsApp
	// (content.js), que por isso continuava aparecendo nessas telas
	// enquanto esta fileira de botões não aparecia.
	//
	// Esses três sinais, sozinhos, são genéricos demais (um #backButton ou um
	// <h3>Ações</h3> aparecem em telas do Projudi sem nenhuma relação com um
	// processo específico), o que fazia a fileira de botões surgir em "telas
	// aleatórias". Por isso eles só contam quando também há o marcador de
	// número de processo na tela (hasProcessNumberMarker) — já
	// findProcessToolbarElement() continua bastando sozinho, sem essa
	// exigência extra, pois é o mesmo sinal (comprovadamente confiável) usado
	// pelo recurso irmão de WhatsApp.
	function isOnProcessScreen() {
		if (IS_SEEU) return false;
		if (processScreenEligible) return true;
		if (findProcessToolbarElement()) {
			processScreenEligible = true;
		} else if ((document.getElementById("backButton") || isOnAcoesScreen() || findMovimentarButton()) && hasProcessNumberMarker()) {
			processScreenEligible = true;
		}
		return processScreenEligible;
	}

	// -------------------------------------------------------------------
	// Localização dos links nativos do painel Ações
	// -------------------------------------------------------------------

	function normalizeLinkText(link) {
		const clone = link.cloneNode(true);
		clone.querySelectorAll("em, img, span").forEach(function (el) {
			el.remove();
		});
		return (clone.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findActionLinkIn(root, label) {
		const links = root.querySelectorAll("a.link");
		for (let i = 0; i < links.length; i++) {
			if (normalizeLinkText(links[i]) === label) return links[i];
		}
		return null;
	}
	function findActionLink(label) {
		return findActionLinkIn(document, label);
	}

	// O painel "Ações" só existe na tela alcançada por: (1) clicar num
	// evento válido (não tachado) da coluna "Evento" da aba Movimentações,
	// o que abre a tela de detalhe daquela movimentação; e (2) nela, clicar
	// em "Movimentar a Partir Desta Movimentação" — só então o Projudi
	// carrega a URL movimentarProcesso.do, que tem o painel "Ações".
	//
	// Em vez de navegar de verdade por essas telas na aba visível (o que
	// fazia a tela principal "piscar" entre elas, mesmo coberta por um
	// overlay), a extensão carrega cada uma delas num IFRAME OCULTO (fora
	// da área visível da tela, mas uma navegação de verdade — ver
	// fetchDoc) e lê o HTML resultante só para achar o link/botão
	// seguinte. No fim, ela extrai a URL real do diálogo final (do
	// `onclick` do link da ação, algo como
	// `openDialog('/projudi/processo/enviarConcluso.do?_tj=...', ...)`) e
	// mostra SÓ essa URL, dentro de um iframe visível, num popup sobre a
	// tela atual — a tela principal nunca navega. Essas funções "*In"
	// recebem o `document` a examinar (o documento carregado no iframe
	// oculto de cada etapa,
	// ou `document` de verdade para o modo "já na tela de Ações").
	//
	// A escolha de QUAL movimentação usar como base (a mais recente e
	// válida) é automática, mas como isso agora só afeta quais páginas são
	// buscadas em segundo plano — nenhuma delas é exibida nem confirmada —
	// o risco é ainda menor do que antes. O que de fato executa a ação
	// processual — o clique final de confirmar dentro do diálogo — nunca é
	// automático (ver showConfirmBar/"Sim, executar").
	//
	// IMPORTANTE: o Projudi reaproveita o mesmo id/name "movimentarButton"
	// para outros botões de "iniciar uma movimentação" em telas diferentes
	// — por exemplo, o botão nativo "Juntar Documento" da barra de
	// ferramentas da tela principal do processo TAMBÉM tem
	// id="movimentarButton" e name="movimentarButton", só com um "value"
	// (texto) diferente. Por isso a checagem tem que ser SÓ pelo texto do
	// botão ("Movimentar a Partir Desta Movimentação"), nunca por id/name
	// — uma versão anterior usava id/name como atalho e acabava
	// encontrando o botão errado ("Juntar Documento") sempre que ele
	// existia na mesma tela, confirmado via log de diagnóstico em produção.
	function findMovimentarButtonIn(root) {
		const candidates = root.querySelectorAll('input[type="button"]');
		for (let i = 0; i < candidates.length; i++) {
			if ((candidates[i].value || "").trim() === "Movimentar a Partir Desta Movimentação") return candidates[i];
		}
		return null;
	}
	function findMovimentarButton() {
		return findMovimentarButtonIn(document);
	}

	// `excludeIds`: ids de eventos já tentados nesta cadeia (ver
	// resolveDialogUrl) — alguns tipos de movimentação (ex.: confirmações
	// automáticas do sistema, juntadas de petição) levam a uma tela de
	// ação específica em vez da lista geral de Ações; nesse caso a
	// extensão busca (em segundo plano) a próxima movimentação válida, em
	// vez de insistir sempre na mesma.
	function findLatestValidEventLinkIn(root, excludeIds) {
		const links = root.querySelectorAll('a.link[id^="LNKmov"]');
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			if ((link.id || "").indexOf("INVALIDO") !== -1) continue;
			if (link.closest("strike, s, del")) continue;
			if (excludeIds && excludeIds.indexOf(link.id) !== -1) continue;
			return link;
		}
		return null;
	}
	function findLatestValidEventLink(excludeIds) {
		return findLatestValidEventLinkIn(document, excludeIds);
	}

	// Marcador direto e estável de que uma tela é a do painel "Ações" (o
	// próprio título "Ações" da seção, ver TELA_DE_A__ES_HTML).
	function isOnAcoesScreenIn(root) {
		const headers = root.querySelectorAll("h3");
		for (let i = 0; i < headers.length; i++) {
			if ((headers[i].textContent || "").trim() === "Ações") return true;
		}
		return false;
	}
	function isOnAcoesScreen() {
		return isOnAcoesScreenIn(document);
	}

	// Lê o sufixo do título de uma tela (ex.: "Processo 0000... - Juntar
	// Documento" → "Juntar Documento") para explicar ao usuário para onde
	// uma movimentação levou, quando não é a tela de Ações esperada.
	function getScreenTitleIn(root) {
		const headers = root.querySelectorAll("h3");
		for (let i = 0; i < headers.length; i++) {
			const text = (headers[i].textContent || "").replace(/\s+/g, " ").trim();
			const match = text.match(/-\s*([^-]+)$/);
			if (match && text.toLowerCase().indexOf("processo") !== -1) return match[1].trim();
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Resolução em segundo plano da URL do diálogo final
	//
	// Em vez de navegar de verdade pela lista de Movimentações → tela de
	// detalhe → tela de Ações na aba visível (o que fazia a aba trocar de
	// conteúdo em cada etapa, mesmo coberta por um overlay), a extensão
	// carrega cada uma dessas telas num iframe oculto — fora da área
	// visível da tela, mas uma navegação de verdade (`fetch()`/`XHR`
	// simples não davam certo: o Projudi devolve as telas sem os botões de
	// ação quando a requisição não "parece" uma navegação de aba de
	// verdade) — e lê o HTML resultante só para achar o link/botão
	// seguinte. No fim, extrai a URL real do diálogo (do `onclick` do link
	// da ação, ex.:
	// `openDialog('/projudi/processo/enviarConcluso.do?_tj=...', ...)`) e
	// devolve só essa URL — quem a exibe (num iframe, dentro de um popup
	// desta extensão) é o código mais abaixo. A aba visível nunca navega.
	//
	// A escolha de QUAL movimentação usar como base (a mais recente e
	// válida) continua automática, mas agora só decide quais páginas são
	// buscadas em segundo plano — nenhuma delas chega a ser exibida. O que
	// de fato executa a ação processual — o clique final de confirmar
	// dentro do diálogo — nunca é automático (ver showConfirmBar/"Sim,
	// executar").
	// -------------------------------------------------------------------

	// Quantas movimentações diferentes a extensão tenta em segundo plano
	// (da mais recente para trás) antes de desistir e pedir para o usuário
	// abrir manualmente uma mais antiga.
	const MAX_MOVEMENT_ATTEMPTS = 5;

	// Diagnóstico: registra cada etapa da resolução no console (F12,
	// filtro "Projudi Ações Rápidas"), para investigar casos em que o
	// diálogo final não é o esperado sem precisar adivinhar o que a
	// extensão fez.
	function logChainStep(step, extra) {
		// JSON.stringify em vez de passar `extra` como argumento separado:
		// copiar o texto do console (Ctrl+C numa seleção, ou botão direito →
		// "Save as...") perde os `Object`/`Array` que o Chrome só expande
		// interativamente — com tudo já em texto, uma cópia simples basta
		// para diagnosticar.
		let extraText = "";
		if (extra !== undefined) {
			try {
				extraText = " | " + JSON.stringify(extra);
			} catch (err) {
				extraText = " | " + String(extra);
			}
		}
		console.info("[Projudi Ações Rápidas] " + new Date().toISOString() + " " + step + extraText);
	}

	function describeElement(el) {
		if (!el) return null;
		return {
			tag: el.tagName,
			id: el.id || null,
			name: el.name || null,
			value: el.value || null,
			text: (el.textContent || "").trim().slice(0, 60) || null,
			href: el.getAttribute ? el.getAttribute("href") : null,
			onclick: el.getAttribute ? el.getAttribute("onclick") : null,
		};
	}

	// Busca uma URL com a sessão/cookies do usuário e devolve o HTML já
	// interpretado (DOMParser), sem navegar nenhuma aba/frame visível.
	// Carrega uma URL numa navegação de verdade, só que invisível — um
	// iframe fora da área visível da tela (mesma técnica já usada com
	// sucesso no recurso de Pendências, em content.js). Comparado a
	// `fetch()`, isso foi necessário porque testes reais mostraram que o
	// Projudi devolve uma versão da página SEM os botões de ação (mesmo
	// título, mesmo HTML "por fora") quando a requisição não é uma
	// navegação de aba de verdade — provavelmente algum filtro/proteção do
	// próprio Tribunal que distingue `fetch()`/XHR de uma navegação normal
	// pelos cabeçalhos que o navegador envia automaticamente (não dá para
	// alterar esses cabeçalhos por JavaScript). Um iframe, mesmo oculto, é
	// tecnicamente uma navegação como outra qualquer para o navegador e
	// para o servidor.
	function fetchDoc(url) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
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
				// Inserir o iframe no documento já dispara um "load" para a
				// página em branco inicial (about:blank), ANTES mesmo da
				// navegação para `url` começar — sem essa checagem, a Promise
				// resolvia cedo demais com um documento vazio. Só resolve no
				// "load" que corresponde à navegação de verdade.
				if (finalUrl === "about:blank") return;
				settled = true;
				cleanup();
				resolve({ doc: doc, url: finalUrl });
			});

			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	// Extrai a URL de dentro de um `onclick` nativo do Projudi — cobre os
	// padrões já observados: `document.location.href='...'` (botão
	// "Movimentar a Partir Desta Movimentação"), `openDialog('...', ...)` /
	// `openDialogMaximized('...', ...)` (maioria dos itens do painel
	// Ações) e `confirmaRemessaTribunalJustica('...')` (Remessa Eletrônica
	// para o Tribunal de Justiça). Resolve relativa a `baseUrl` (a URL da
	// própria página onde o onclick foi encontrado).
	function extractUrlFromOnclick(onclick, baseUrl) {
		if (!onclick) return null;
		const match = onclick.match(
			/(?:document\.location\.href\s*=\s*|open(?:DialogMaximized|Dialog)\(|confirmaRemessaTribunalJustica\()\s*'([^']+)'/
		);
		if (!match) return null;
		try {
			return new URL(match[1], baseUrl).href;
		} catch (err) {
			return null;
		}
	}

	// Ponto de entrada: devolve uma Promise que resolve com
	// `{ url }` (a URL do diálogo pronta para um iframe) ou
	// `{ failed: true, tried, screenTitle }` se não achar.
	function resolveDialogUrl(label) {
		logChainStep('resolvendo URL de "' + label + '" em segundo plano', { partindoDe: window.location.href });

		const liveMovBtn = findMovimentarButtonIn(document);
		if (liveMovBtn) {
			// Já estamos na tela de detalhe de uma movimentação escolhida
			// manualmente pelo usuário — só um destino possível, sem tentar
			// outras movimentações.
			logChainStep("já na tela de detalhe da movimentação", describeElement(liveMovBtn));
			const movUrl = extractUrlFromOnclick(liveMovBtn.getAttribute("onclick"), window.location.href);
			if (!movUrl) return Promise.resolve({ failed: true, screenTitle: null });
			return fetchDoc(movUrl).then(function (result) {
				if (isOnAcoesScreenIn(result.doc)) {
					const link = findActionLinkIn(result.doc, label);
					if (link) {
						const dialogUrl = extractUrlFromOnclick(link.getAttribute("onclick"), result.url);
						if (dialogUrl) return { url: dialogUrl };
					}
				}
				return { failed: true, screenTitle: getScreenTitleIn(result.doc) };
			});
		}

		const events = Array.prototype.slice
			.call(document.querySelectorAll('a.link[id^="LNKmov"]'))
			.filter(function (a) {
				return (a.id || "").indexOf("INVALIDO") === -1 && !a.closest("strike, s, del");
			})
			.slice(0, MAX_MOVEMENT_ATTEMPTS);

		let lastScreenTitle = null;

		function tryEvent(index) {
			if (index >= events.length) {
				return Promise.resolve({ failed: true, tried: events.length, screenTitle: lastScreenTitle });
			}
			const href = events[index].getAttribute("href");
			let eventUrl;
			try {
				eventUrl = new URL(href, window.location.href).href;
			} catch (err) {
				return tryEvent(index + 1);
			}
			return fetchDoc(eventUrl)
				.then(function (detail) {
					const movBtn = findMovimentarButtonIn(detail.doc);
					const logInfo = { url: detail.url, movimentarBtn: describeElement(movBtn) };
					if (!movBtn) {
						// Diagnóstico: se o botão não veio, mostra o que a página
						// carregada no iframe oculto realmente trouxe (título,
						// eventual redirecionamento, um trecho do texto visível) —
						// útil para investigar qualquer causa futura sem precisar
						// adivinhar.
						logInfo.title = detail.doc.title;
						logInfo.metaRefresh = !!detail.doc.querySelector('meta[http-equiv="refresh" i]');
						logInfo.scriptsComLocationHref = Array.prototype.slice
							.call(detail.doc.querySelectorAll("script"))
							.filter(function (s) {
								return /location\.href|location\.replace/.test(s.textContent || "");
							}).length;
						logInfo.bodySnippet = (detail.doc.body ? detail.doc.body.textContent || "" : "").replace(/\s+/g, " ").trim().slice(0, 300);
					}
					logChainStep("movimentação " + (index + 1) + " buscada", logInfo);
					const movUrl = movBtn ? extractUrlFromOnclick(movBtn.getAttribute("onclick"), detail.url) : null;
					if (!movUrl) return tryEvent(index + 1);
					return fetchDoc(movUrl).then(function (acoes) {
						if (!isOnAcoesScreenIn(acoes.doc)) {
							lastScreenTitle = getScreenTitleIn(acoes.doc);
							logChainStep("movimentação " + (index + 1) + " não levou à tela de Ações", {
								screenTitle: lastScreenTitle,
							});
							return tryEvent(index + 1);
						}
						const link = findActionLinkIn(acoes.doc, label);
						if (!link) {
							lastScreenTitle = "Ações (sem esta ação específica)";
							const found = Array.prototype.slice
								.call(acoes.doc.querySelectorAll("a.link"))
								.map(normalizeLinkText)
								.filter(Boolean);
							logChainStep('tela de Ações achada, mas sem o rótulo "' + label + '"', { url: acoes.url, linksEncontrados: found });
							return tryEvent(index + 1);
						}
						const dialogUrl = extractUrlFromOnclick(link.getAttribute("onclick"), acoes.url);
						if (!dialogUrl) {
							logChainStep("achei o link da ação mas não consegui extrair a URL do onclick", describeElement(link));
							return tryEvent(index + 1);
						}
						logChainStep("URL do diálogo resolvida", dialogUrl);
						return { url: dialogUrl };
					});
				})
				.catch(function (err) {
					logChainStep("erro ao buscar uma etapa da cadeia, tentando a próxima movimentação", String(err));
					return tryEvent(index + 1);
				});
		}

		return tryEvent(0);
	}

	// -------------------------------------------------------------------
	// Overlay de carregamento — mostrado só durante a resolução em segundo
	// plano (fetches), tipicamente menos de 1-2s. A tela principal nunca
	// navega, então isso é só um indicador de "aguarde", não uma cortina
	// para esconder telas piscando como numa versão anterior.
	// -------------------------------------------------------------------

	const LOADING_OVERLAY_ID = "pdp-qa-loading-overlay";

	function showLoadingOverlay(label, onCancel) {
		removeLoadingOverlay();
		const overlay = document.createElement("div");
		overlay.id = LOADING_OVERLAY_ID;
		overlay.className = "pdp-qa-loading-overlay";
		overlay.innerHTML =
			'<div class="pdp-qa-loading-box">' +
			'<div class="pdp-qa-loading-spinner"></div>' +
			'<div class="pdp-qa-loading-text">Abrindo "' +
			escapeHtml(label) +
			'"…</div>' +
			'<button type="button" class="pdp-qa-loading-cancel">Cancelar</button>' +
			"</div>";
		document.body.appendChild(overlay);
		overlay.querySelector(".pdp-qa-loading-cancel").addEventListener("click", function () {
			removeLoadingOverlay();
			if (onCancel) onCancel();
		});
	}

	function removeLoadingOverlay() {
		const el = document.getElementById(LOADING_OVERLAY_ID);
		if (el) el.remove();
	}

	// -------------------------------------------------------------------
	// Popup com o diálogo final — um iframe visível apontando direto para
	// a URL resolvida por resolveDialogUrl, sobreposto à tela atual (que
	// nunca navega). Mesma origem do Projudi, então dá para ler/preencher
	// o formulário dentro do iframe (iframe.contentDocument) sem CORS.
	// -------------------------------------------------------------------

	const MODAL_ID = "pdp-qa-modal";

	// Diálogos como "Ordenar Cumprimentos" terminam com uma tela nativa do
	// Projudi ("Aguarde...") que fica esperando a conclusão do processamento
	// e então se fecha sozinha — mas esse fechamento automático foi escrito
	// para quando o diálogo é uma janela de verdade aberta via
	// `window.open()` (com `window.opener` apontando para a tela do
	// processo e `window.close()` funcionando). Como aqui o diálogo roda
	// dentro de um <iframe> deste popup (não uma janela real), `opener` vem
	// `null` e `close()` não faz nada — o script nativo tenta usá-los e a
	// tela fica presa em "Aguarde..." apesar de a ordenação já ter sido
	// registrada no processo por trás; só o clique manual em "✕ Fechar"
	// (que sempre funcionou, por ser desta extensão) "resolvia" o problema.
	//
	// Para o iframe nativo se comportar como se fosse mesmo a janela que
	// ele espera ser, isso reaplica `opener`/`close` a cada navegação dele
	// (inclusive a própria tela de "Aguarde...", que é uma navegação nova):
	// `opener` passa a apontar para a aba real do processo (então
	// `opener.location.reload()` recarrega a tela por trás, como o Projudi
	// já esperava fazer) e `close()` passa a fechar este popup da extensão
	// em vez de não fazer nada — assim a tela fecha sozinha assim que o
	// próprio Projudi decidir que a ação terminou, para qualquer ação que
	// use este popup (Ordenar Cumprimentos, Ordenar RPV, Enviar Concluso
	// etc.), não só para esta.
	// Diagnóstico: o "watcher" abaixo faz um snapshot periódico do
	// documento carregado no iframe do popup enquanto ele estiver aberto,
	// para descobrirmos (via console, F12, filtro "Projudi Ações Rápidas")
	// POR QUE a tela "Aguarde..." não fecha sozinha mesmo com o shim de
	// opener/close. Hipóteses que este log ajuda a distinguir:
	//   a) o script nativo nunca chama window.close()/opener.*, e sim
	//      top.close()/parent.close() (aí o shim, que só troca
	//      iframe.contentWindow, não pega essa chamada);
	//   b) a tela "Aguarde..." não é uma NAVEGAÇÃO nova do iframe — é a
	//      MESMA página trocando o próprio conteúdo via AJAX/innerHTML, daí
	//      o evento "load" (onde o shim reaplica opener/close) nunca
	//      dispara de novo depois da 1ª carga, e o script pode ter guardado
	//      uma referência à função close() original antes do shim rodar;
	//   c) o iframe é bloqueado por cross-origin em algum ponto (troca de
	//      domínio/subdomínio) e win/doc somem;
	//   d) o script nativo trava numa exceção não relacionada a
	//      opener/close (ex.: outro campo que também espera comportamento
	//      de janela de verdade), e a tela realmente NUNCA chega a chamar
	//      close() — precisaria de outro mecanismo (ex.: detectar o fim via
	//      o conteúdo da própria tela, não via close()).
	const MODAL_WATCH_INTERVAL_MS = 1000;
	let modalWatchInterval = null;
	let modalWatchLastSnapshot = null;
	let modalWatchLastDumpedHref = null;

	// Diagnóstico definitivo: em vez de continuar adivinhando o que a tela
	// "Aguarde..." faz (window.close()? top.close()? um erro? nada?),
	// extrai o HTML/scripts REAIS dessa página (mesma origem do Projudi,
	// acesso direto permitido) e manda pro console — dá pra ler o código
	// de verdade em vez de inferir a partir de sintomas. Roda só uma vez
	// por URL nova (não a cada poll de 1s) pra não poluir o console.
	// Palavras que só aparecem em scripts que de fato tentam controlar a
	// janela/navegação (fechar, redirecionar, recarregar, fazer polling) —
	// os scripts de framework (jQuery, prototype.js etc., vistos no dump
	// anterior) não têm nada disso, então filtrar por elas separa o que
	// interessa da bagagem genérica que todo página do Projudi carrega.
	const DIALOG_SCRIPT_KEYWORDS = [
		"close",
		"opener",
		"top.",
		"parent.",
		"location.href",
		"location.reload",
		"periodicalUpdater",
		"setTimeout",
		"setInterval",
		"submit(",
	];

	function dumpDialogSourceOnce(doc, href) {
		if (href === modalWatchLastDumpedHref) return;
		modalWatchLastDumpedHref = href;
		try {
			const allScripts = Array.prototype.slice.call(doc.querySelectorAll("script"));
			const relevant = allScripts.filter(function (s) {
				const text = s.textContent || "";
				return !s.src && DIALOG_SCRIPT_KEYWORDS.some(function (kw) {
					return text.indexOf(kw) !== -1;
				});
			});
			const relevantText = relevant
				.map(function (s, i) {
					return "----- script inline relevante " + i + " -----\n" + (s.textContent || "").slice(0, 20000);
				})
				.join("\n\n");
			const metaRefresh = doc.querySelector('meta[http-equiv="refresh" i]');
			const visibleText = doc.body ? doc.body.innerText || "" : "";
			console.info(
				"[Projudi Ações Rápidas] DUMP do diálogo (" +
					href +
					")\n=== texto visível (innerText) ===\n" +
					visibleText +
					"\n=== total de <script>: " +
					allScripts.length +
					" (" +
					relevant.length +
					" inline relevante(s) por palavra-chave) ===" +
					"\n=== meta refresh: " +
					(metaRefresh ? metaRefresh.getAttribute("content") : "(nenhum)") +
					"\n=== scripts inline relevantes ===\n" +
					(relevantText || "(nenhum script inline bateu com as palavras-chave — ver lista completa abaixo)") +
					(relevant.length
						? ""
						: "\n=== TODOS os scripts inline (fallback, já que o filtro não achou nada) ===\n" +
								allScripts
									.filter(function (s) {
										return !s.src;
									})
									.map(function (s, i) {
										return "----- script inline " + i + " -----\n" + (s.textContent || "").slice(0, 20000);
									})
									.join("\n\n"))
			);
		} catch (err) {
			logChainStep("watcher: erro ao extrair HTML/scripts do iframe", String(err));
		}
	}

	function snapshotIframeState(iframe, tag) {
		let win, doc;
		try {
			win = iframe.contentWindow;
			doc = iframe.contentDocument;
		} catch (err) {
			logChainStep("watcher do popup: erro de acesso ao iframe (" + tag + ")", String(err));
			return;
		}
		if (!win || !doc) {
			logChainStep("watcher do popup: iframe sem contentWindow/contentDocument (" + tag + ")", null);
			return;
		}
		let href = null;
		try {
			href = win.location.href;
		} catch (err) {
			href = "(erro ao ler location: " + err + ")";
		}
		if (doc.readyState === "complete") dumpDialogSourceOnce(doc, href);
		const bodyText = (doc.body ? doc.body.textContent || "" : "").replace(/\s+/g, " ").trim().slice(0, 200);
		const snapshot = JSON.stringify({
			href: href,
			readyState: doc.readyState,
			title: doc.title,
			bodySnippet: bodyText,
			typeofClose: typeof win.close,
			closeIsOurShim: win.close && win.close.__pdpShim === true,
			opener: win.opener === window ? "(nossa aba)" : win.opener ? "(outro valor)" : null,
		});
		if (snapshot !== modalWatchLastSnapshot) {
			modalWatchLastSnapshot = snapshot;
			logChainStep("watcher do popup: mudança detectada (" + tag + ")", JSON.parse(snapshot));
		}
	}

	function startModalWatch(iframe) {
		stopModalWatch();
		modalWatchLastSnapshot = null;
		snapshotIframeState(iframe, "inicial");
		modalWatchInterval = setInterval(function () {
			snapshotIframeState(iframe, "poll");
		}, MODAL_WATCH_INTERVAL_MS);
	}

	function stopModalWatch() {
		if (modalWatchInterval) {
			clearInterval(modalWatchInterval);
			modalWatchInterval = null;
		}
	}

	function attachModalIframeCloseShim(iframe) {
		iframe.addEventListener("load", function () {
			let win;
			try {
				win = iframe.contentWindow;
			} catch (err) {
				logChainStep("shim: erro ao acessar contentWindow no load", String(err));
				return;
			}
			if (!win) {
				logChainStep("shim: contentWindow ausente no load", null);
				return;
			}
			let href = null;
			try {
				href = win.location.href;
			} catch (err) {
				href = "(erro ao ler location: " + err + ")";
			}
			logChainStep("shim: iframe do popup navegou/recarregou", { href: href, title: win.document && win.document.title });

			try {
				win.opener = window;
				logChainStep("shim: opener aplicado", null);
			} catch (err) {
				logChainStep("shim: falhou ao aplicar opener", String(err));
			}
			// Reaplica um shim de close() também aqui, como reforço, para o
			// caso (raro) de o script nativo chamar close() depois deste
			// evento "load" (ex.: um setTimeout) — mas o caminho principal
			// para fechar o popup automaticamente é o closeShim.js (ver
			// listener de "message" no topo deste arquivo), que roda em
			// "document_start" e por isso consegue interceptar mesmo uma
			// chamada síncrona de close() feita durante o carregamento da
			// página, antes deste evento "load" chegar a disparar.
			try {
				const shimClose = function () {
					logChainStep("shim (load): win.close() do iframe foi chamado — fechando o popup da extensão", null);
					removeActionModal();
				};
				shimClose.__pdpShim = true;
				win.close = shimClose;
				logChainStep("shim: close aplicado", null);
			} catch (err) {
				logChainStep("shim: falhou ao aplicar close", String(err));
			}

			checkFlagClosePopup(win);
		});
	}

	// O diálogo final de ações como "Ordenar Cumprimentos" NUNCA chama
	// window.close() — o dump de diagnóstico revelou o mecanismo real
	// (função checkClosePopup(), presente em vários desses diálogos):
	//
	//   if (document.xxxForm.flagClosePopup.value == "true") {
	//     var parentForm = window.parent.$(document.xxxForm.parentForm.value);
	//     parentForm.action = document.xxxForm.backURL.value;
	//     parentForm.submit();
	//   }
	//
	// Ou seja: o diálogo foi desenhado para rodar como um iframe DENTRO da
	// própria tela de Ações do Projudi — "window.parent" é essa tela, que
	// tem um <form> com o id salvo em `parentForm`; ao terminar, ele ajusta
	// a action desse form pra "backURL" e submete, fazendo a tela de Ações
	// (o pai de verdade) recarregar/voltar sozinha. Nunca existiu uma
	// "janela" pra fechar.
	//
	// No modo "hop" desta extensão, `window.parent` é a página onde o
	// popup foi criado (ex.: processo.do) — que não tem esse form
	// específico —, então aquele `parentForm.submit()` nativo não encontra
	// nada e não faz efeito nenhum (sem lançar erro, o que explica por que
	// nunca vimos um "erro não tratado" nos logs). O `flagClosePopup` em si
	// já é o sinal confiável de "a ação terminou" — em vez de depender do
	// submit nativo (que mira no lugar errado no nosso caso), lemos esse
	// campo diretamente e agimos por conta própria: recarrega a aba real
	// por trás (equivalente ao que o backURL faria) e fecha o popup.
	function checkFlagClosePopup(win) {
		let doc;
		try {
			doc = win.document;
		} catch (err) {
			return;
		}
		if (!doc || !doc.forms) return;
		for (let i = 0; i < doc.forms.length; i++) {
			const form = doc.forms[i];
			const flagField = form.elements && form.elements.namedItem ? form.elements.namedItem("flagClosePopup") : null;
			if (!flagField) continue;
			const backURLField = form.elements.namedItem("backURL");
			logChainStep("shim: achado campo flagClosePopup no diálogo", {
				form: form.name || form.id || "(sem nome)",
				flagClosePopup: flagField.value,
				backURL: backURLField ? backURLField.value : null,
			});
			if (flagField.value === "true") {
				logChainStep("shim: flagClosePopup=true — a ação terminou; recarregando a tela e fechando o popup", null);
				try {
					window.location.reload();
				} catch (err) {
					logChainStep("shim: falhou ao recarregar a tela por trás", String(err));
				}
				removeActionModal();
			}
			break; // só o 1º form com esse campo importa — mesma suposição do próprio Projudi
		}
	}

	function showActionModal(label) {
		removeActionModal();
		const backdrop = document.createElement("div");
		backdrop.id = MODAL_ID;
		backdrop.className = "pdp-qa-modal-backdrop";
		backdrop.innerHTML =
			'<div class="pdp-qa-modal-box">' +
			'<div class="pdp-qa-modal-header"><span>' +
			escapeHtml(label) +
			'</span><button type="button" class="pdp-qa-modal-close">✕ Fechar</button></div>' +
			'<div class="pdp-qa-modal-body"><iframe class="pdp-qa-modal-iframe"></iframe></div>' +
			"</div>";
		document.body.appendChild(backdrop);
		backdrop.querySelector(".pdp-qa-modal-close").addEventListener("click", function () {
			logChainStep('"✕ Fechar" clicado manualmente pelo usuário', null);
			removeActionModal();
		});
		const iframe = backdrop.querySelector(".pdp-qa-modal-iframe");
		activeModalIframe = iframe;
		attachModalIframeCloseShim(iframe);
		startModalWatch(iframe);
		return iframe;
	}

	function removeActionModal() {
		const el = document.getElementById(MODAL_ID);
		if (el) el.remove();
		activeModalIframe = null;
		stopModalWatch();
		removeConfirmBar();
		removeCaptureToolbar();
	}

	function alertChainFailure(label, result) {
		const tried = (result && result.tried) || 0;
		alert(
			tried
				? "Tentei " +
						tried +
						' movimentação(ões) recente(s) do processo e nenhuma levou à ação "' +
						label +
						'"' +
						(result.screenTitle ? ' (cheguei em telas como "' + result.screenTitle + '")' : "") +
						". Abra manualmente uma movimentação mais antiga (um despacho/decisão costuma funcionar) e use \"Abrir\" a partir da tela de Ações."
				: 'Não consegui localizar a ação "' +
						label +
						'" automaticamente' +
						(result && result.screenTitle ? ' (cheguei na tela "' + result.screenTitle + '")' : "") +
						". Abra manualmente a partir da aba Movimentações."
		);
	}

	// -------------------------------------------------------------------
	// Preferências salvas (chrome.storage.local)
	// -------------------------------------------------------------------

	function loadAllPreferences() {
		return chrome.storage.local.get([PREFERENCES_KEY]).then(function (data) {
			return data[PREFERENCES_KEY] || {};
		});
	}

	function saveAllPreferences(all) {
		return chrome.storage.local.set({ [PREFERENCES_KEY]: all });
	}

	function loadPreferencesFor(label) {
		return loadAllPreferences().then(function (all) {
			return all[label] || [];
		});
	}

	function addPreference(label, name, fields) {
		return loadAllPreferences().then(function (all) {
			const list = all[label] || [];
			list.push({ id: "p" + Date.now() + Math.random().toString(36).slice(2, 7), name: name, fields: fields, createdAt: Date.now() });
			all[label] = list;
			return saveAllPreferences(all);
		});
	}

	function removePreference(label, id) {
		return loadAllPreferences().then(function (all) {
			all[label] = (all[label] || []).filter(function (p) {
				return p.id !== id;
			});
			return saveAllPreferences(all);
		});
	}

	// -------------------------------------------------------------------
	// Captura/preenchimento genérico de formulário de diálogo
	//
	// O Projudi abre cada ação como uma janela "interna" da própria página
	// (não uma aba nova), normalmente inserindo um novo <form> no fim do
	// documento. Como não temos acesso ao código-fonte desses diálogos
	// (só ao HTML estático de cada um, sem garantia de que a estrutura
	// seja idêntica em todo Tribunal/versão), a extensão localiza o
	// formulário-alvo de forma heurística: o <form> visível mais recente
	// que tenha campos — e, ao aplicar uma preferência, o mais recente que
	// contenha algum campo com o mesmo "name" do que foi salvo. Sempre
	// confira os campos antes de confirmar.
	// -------------------------------------------------------------------

	function isVisible(el) {
		return !!el && el.offsetParent !== null;
	}

	// Aceitam um `root` (o `document` de verdade para o modo "ready", ou
	// `iframe.contentDocument` para o popup do modo "hop") — ver
	// resolveDialogUrl/showActionModal.
	function findLikelyDialogFormIn(root) {
		const forms = root.querySelectorAll("form");
		for (let i = forms.length - 1; i >= 0; i--) {
			const form = forms[i];
			if (isVisible(form) && form.querySelector("input, select, textarea")) return form;
		}
		return null;
	}
	function findLikelyDialogForm() {
		return findLikelyDialogFormIn(document);
	}

	function findFormContainingFieldNamesIn(root, names) {
		const forms = root.querySelectorAll("form");
		for (let i = forms.length - 1; i >= 0; i--) {
			const form = forms[i];
			if (!isVisible(form)) continue;
			const hasAny = names.some(function (name) {
				return !!form.querySelector('[name="' + cssEscapeAttr(name) + '"]');
			});
			if (hasAny) return form;
		}
		return null;
	}
	function findFormContainingFieldNames(names) {
		return findFormContainingFieldNamesIn(document, names);
	}

	function cssEscapeAttr(value) {
		if (window.CSS && CSS.escape) return CSS.escape(value);
		return String(value).replace(/["\\]/g, "\\$&");
	}

	function captureFormFields(form) {
		const fields = [];
		const elements = form.querySelectorAll("input, select, textarea");
		elements.forEach(function (el) {
			if (!el.name) return;
			const type = (el.type || el.tagName || "").toLowerCase();
			if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "file" || type === "password") return;
			if (type === "checkbox" || type === "radio") {
				fields.push({ name: el.name, type: type, value: el.value, checked: el.checked });
			} else {
				fields.push({ name: el.name, type: type, value: el.value });
			}
		});
		return fields;
	}

	function applyFormFields(form, fields) {
		fields.forEach(function (f) {
			if (f.type === "checkbox" || f.type === "radio") {
				const el = form.querySelector('[name="' + cssEscapeAttr(f.name) + '"][value="' + cssEscapeAttr(f.value) + '"]');
				if (el) {
					el.checked = f.checked;
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}
			} else {
				const el = form.querySelector('[name="' + cssEscapeAttr(f.name) + '"]');
				if (el) {
					el.value = f.value;
					el.dispatchEvent(new Event("input", { bubbles: true }));
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}
			}
		});
	}

	function findSubmitControl(form) {
		const controls = Array.prototype.slice.call(
			form.querySelectorAll('input[type="submit"], button[type="submit"], input[type="button"], button')
		);
		for (let i = 0; i < controls.length; i++) {
			const c = controls[i];
			if (!isVisible(c)) continue;
			const label = (c.value || c.textContent || "").trim().toLowerCase();
			if (SUBMIT_LABEL_CANDIDATES.indexOf(label) !== -1) return c;
		}
		const submits = controls.filter(function (c) {
			return c.type === "submit" && isVisible(c);
		});
		return submits.length ? submits[submits.length - 1] : null;
	}

	function waitForFormWithFieldNames(names, callback) {
		const start = Date.now();
		const iv = setInterval(function () {
			const form = findFormContainingFieldNames(names);
			if (form) {
				clearInterval(iv);
				callback(form);
			} else if (Date.now() - start > DIALOG_WAIT_TIMEOUT_MS) {
				clearInterval(iv);
				callback(null);
			}
		}, DIALOG_WAIT_INTERVAL_MS);
	}

	// -------------------------------------------------------------------
	// Barra flutuante de captura ("+ Nova preferência")
	// -------------------------------------------------------------------

	function removeCaptureToolbar() {
		if (captureToolbar) {
			captureToolbar.remove();
			captureToolbar = null;
		}
	}

	// `doc` é o documento onde o diálogo está: `document` de verdade no
	// modo "ready" (diálogo nativo aberto na própria tela de Ações), ou
	// `iframe.contentDocument` no modo "hop" (diálogo dentro do popup
	// desta extensão — ver showActionModal). Por padrão usa `document`.
	function showCaptureToolbar(label, doc) {
		doc = doc || document;
		removeCaptureToolbar();
		captureToolbar = document.createElement("div");
		captureToolbar.className = "pdp-qa-capture-bar";
		captureToolbar.innerHTML =
			'<span>Preencha o diálogo acima normalmente e depois:</span>' +
			'<button type="button" class="pdp-qa-capture-save">💾 Salvar como preferência</button>' +
			'<button type="button" class="pdp-qa-capture-cancel">Cancelar</button>';
		document.body.appendChild(captureToolbar);

		captureToolbar.querySelector(".pdp-qa-capture-cancel").addEventListener("click", removeCaptureToolbar);
		captureToolbar.querySelector(".pdp-qa-capture-save").addEventListener("click", function () {
			const form = findLikelyDialogFormIn(doc);
			if (!form) {
				alert('Não encontrei o formulário do diálogo "' + label + '" para capturar. Ele ainda está aberto na tela?');
				return;
			}
			const name = prompt('Nome para esta preferência de "' + label + '":', "");
			if (!name) return;
			const fields = captureFormFields(form);
			addPreference(label, name.trim(), fields).then(function () {
				removeCaptureToolbar();
				alert('Preferência "' + name.trim() + '" salva para "' + label + '". Você ainda pode revisar e enviar este formulário normalmente.');
			});
		});
	}

	// -------------------------------------------------------------------
	// Barra flutuante de confirmação (aplicar preferência)
	// -------------------------------------------------------------------

	function removeConfirmBar() {
		if (confirmBar) {
			confirmBar.remove();
			confirmBar = null;
		}
	}

	function showConfirmBar(label, pref, form) {
		removeConfirmBar();
		confirmBar = document.createElement("div");
		confirmBar.className = "pdp-qa-confirm-bar";
		confirmBar.innerHTML =
			'<span>Confirmar "' + escapeHtml(label) + '" com a preferência "' + escapeHtml(pref.name) + '"?</span>' +
			'<button type="button" class="pdp-qa-confirm-yes">✅ Sim, executar</button>' +
			'<button type="button" class="pdp-qa-confirm-cancel">Cancelar</button>';
		document.body.appendChild(confirmBar);

		confirmBar.querySelector(".pdp-qa-confirm-cancel").addEventListener("click", removeConfirmBar);
		confirmBar.querySelector(".pdp-qa-confirm-yes").addEventListener("click", function () {
			const submit = findSubmitControl(form);
			removeConfirmBar();
			if (!submit) {
				alert('Os campos foram preenchidos, mas não encontrei o botão de confirmar do Projudi automaticamente. Confira e clique nele manualmente.');
				return;
			}
			submit.click();
		});
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	// -------------------------------------------------------------------
	// Ações dos itens do painel
	// -------------------------------------------------------------------

	function openActionDialog(label) {
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		link.click();
	}

	function startNewPreferenceCapture(label) {
		closePanel();
		removeConfirmBar();
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		link.click();
		setTimeout(function () {
			showCaptureToolbar(label);
		}, 400);
	}

	function applyPreference(label, pref) {
		closePanel();
		removeCaptureToolbar();
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		const fieldNames = pref.fields.map(function (f) {
			return f.name;
		});
		link.click();
		waitForFormWithFieldNames(fieldNames, function (form) {
			if (!form) {
				alert('A janela de "' + label + '" não apareceu a tempo (ou os campos mudaram). Preencha manualmente desta vez.');
				return;
			}
			applyFormFields(form, pref.fields);
			showConfirmBar(label, pref, form);
		});
	}

	// -------------------------------------------------------------------
	// Versões "hop" das três ações acima — usadas quando a tela atual
	// ainda não é a de Ações (ver resolveDialogUrl). Resolvem a URL do
	// diálogo em segundo plano e mostram só ela, num popup desta extensão
	// (showActionModal), sem navegar a aba visível em nenhum momento.
	// -------------------------------------------------------------------

	function openActionDialogViaChain(label) {
		const cancelToken = { cancelled: false };
		showLoadingOverlay(label, function () {
			cancelToken.cancelled = true;
		});
		resolveDialogUrl(label).then(function (result) {
			removeLoadingOverlay();
			if (cancelToken.cancelled) return;
			if (result.failed) {
				alertChainFailure(label, result);
				return;
			}
			showActionModal(label).src = result.url;
		});
	}

	function startNewPreferenceCaptureViaChain(label) {
		const cancelToken = { cancelled: false };
		showLoadingOverlay(label, function () {
			cancelToken.cancelled = true;
		});
		resolveDialogUrl(label).then(function (result) {
			removeLoadingOverlay();
			if (cancelToken.cancelled) return;
			if (result.failed) {
				alertChainFailure(label, result);
				return;
			}
			const iframe = showActionModal(label);
			iframe.addEventListener(
				"load",
				function () {
					showCaptureToolbar(label, iframe.contentDocument);
				},
				{ once: true }
			);
			iframe.src = result.url;
		});
	}

	function applyPreferenceViaChain(label, pref) {
		const cancelToken = { cancelled: false };
		showLoadingOverlay(label, function () {
			cancelToken.cancelled = true;
		});
		resolveDialogUrl(label).then(function (result) {
			removeLoadingOverlay();
			if (cancelToken.cancelled) return;
			if (result.failed) {
				alertChainFailure(label, result);
				return;
			}
			const iframe = showActionModal(label);
			iframe.addEventListener(
				"load",
				function () {
					let doc;
					try {
						doc = iframe.contentDocument;
					} catch (err) {
						alert("Não consegui acessar o conteúdo do diálogo carregado.");
						return;
					}
					const fieldNames = pref.fields.map(function (f) {
						return f.name;
					});
					const form = findFormContainingFieldNamesIn(doc, fieldNames) || findLikelyDialogFormIn(doc);
					if (!form) {
						alert('Carreguei "' + label + '", mas não encontrei o formulário para preencher automaticamente. Preencha manualmente.');
						return;
					}
					applyFormFields(form, pref.fields);
					showConfirmBar(label, pref, form);
				},
				{ once: true }
			);
			iframe.src = result.url;
		});
	}

	// -------------------------------------------------------------------
	// Botões flutuantes (um por grupo) e painéis
	// -------------------------------------------------------------------

	function ensureRow() {
		if (row && row.isConnected) return;
		if (!isOnProcessScreen()) return;

		row = document.createElement("div");
		row.id = "pdp-qa-row";
		row.className = "pdp-qa-row";

		ACTION_GROUPS.forEach(function (group) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "pdp-qa-group-btn";
			btn.dataset.groupId = group.id;
			btn.innerHTML = '<span class="pdp-qa-icon">' + group.icon + "</span><span>" + group.title + "</span>";
			btn.title = "Ações de " + group.title;
			btn.addEventListener("click", function () {
				togglePanel(group);
			});
			row.appendChild(btn);
		});

		document.body.appendChild(row);
	}

	function closePanel() {
		if (activePanel) {
			activePanel.remove();
			activePanel = null;
		}
		if (activeGroupId && row) {
			const prevBtn = row.querySelector('[data-group-id="' + activeGroupId + '"]');
			if (prevBtn) prevBtn.classList.remove("pdp-qa-active");
		}
		activeGroupId = null;
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onKeydown, true);
	}

	function onOutsideClick(e) {
		if (activePanel && !activePanel.contains(e.target) && !(row && row.contains(e.target))) closePanel();
	}

	function onKeydown(e) {
		if (e.key === "Escape") closePanel();
	}

	function togglePanel(group) {
		if (activeGroupId === group.id) {
			closePanel();
			return;
		}
		closePanel();
		buildPanel(group);
	}

	// Diagnóstico: quando nenhuma ação de um grupo é encontrada, registra no
	// console (F12, filtro "Projudi Ações Rápidas") os rótulos esperados e
	// todo texto de link "a.link" realmente presente neste frame/URL — útil
	// para comparar se o Projudi usa um texto levemente diferente do
	// esperado (acento, espaço, "(*)" etc.) ou se esta tela/frame
	// simplesmente não é a que tem o painel "Ações" (ex.: usuário está em
	// outra aba do processo, não em Movimentações).
	function logAvailableLinkTexts(group) {
		const found = Array.prototype.slice.call(document.querySelectorAll("a.link")).map(normalizeLinkText).filter(Boolean);
		console.info(
			"[Projudi Ações Rápidas]",
			'grupo "' + group.title + '" — nenhum rótulo esperado bateu nesta tela.',
			"\nURL/frame:",
			window.location.href,
			"\nRótulos esperados:",
			group.actions,
			"\nTextos de a.link encontrados aqui:",
			found
		);
	}

	function buildPanel(group) {
		activeGroupId = group.id;
		const activeBtn = row && row.querySelector('[data-group-id="' + group.id + '"]');
		if (activeBtn) activeBtn.classList.add("pdp-qa-active");
		activePanel = document.createElement("div");
		activePanel.className = "pdp-qa-panel";

		let actionsToRender = [];
		let mode; // 'ready' | 'hop' | 'unreachable'

		if (isOnAcoesScreen()) {
			mode = "ready";
			actionsToRender = group.actions.filter(function (label) {
				return !!findActionLink(label);
			});
			if (!actionsToRender.length) {
				const empty = document.createElement("div");
				empty.className = "pdp-qa-empty";
				empty.textContent = 'Nenhuma ação de "' + group.title + '" está disponível neste processo agora.';
				activePanel.appendChild(empty);
				logAvailableLinkTexts(group);
			}
		} else if (findMovimentarButton() || findLatestValidEventLink()) {
			mode = "hop";
			actionsToRender = group.actions;
			const note = document.createElement("div");
			note.className = "pdp-qa-note";
			note.textContent =
				'Esta tela ainda não é a de "Ações", mas ao clicar a extensão resolve isso sozinha em segundo ' +
				"plano (sem sair desta tela) e abre a ação escolhida num popup.";
			activePanel.appendChild(note);
		} else {
			mode = "unreachable";
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Abra a aba "Movimentações" do processo para usar esta ação.';
			activePanel.appendChild(empty);
		}

		actionsToRender.forEach(function (label) {
			activePanel.appendChild(buildActionRow(label, mode));
		});

		document.body.appendChild(activePanel);
		positionPanel(group.id);

		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onKeydown, true);
		}, 0);

		actionsToRender.forEach(function (label) {
			loadPreferencesFor(label).then(function (prefs) {
				if (activeGroupId !== group.id) return; // painel já fechado/trocado
				renderPreferences(label, prefs, mode);
			});
		});
	}

	function buildActionRow(label, mode) {
		const actionRow = document.createElement("div");
		actionRow.className = "pdp-qa-action";
		actionRow.dataset.actionLabel = label;

		const header = document.createElement("div");
		header.className = "pdp-qa-action-header";

		const labelEl = document.createElement("span");
		labelEl.className = "pdp-qa-action-label";
		labelEl.textContent = label;
		header.appendChild(labelEl);

		const openBtn = document.createElement("button");
		openBtn.type = "button";
		openBtn.className = "pdp-qa-open-btn";
		openBtn.textContent = mode === "hop" ? "Ir e abrir" : "Abrir";
		openBtn.title = "Abrir o diálogo normal do Projudi para esta ação";
		openBtn.addEventListener("click", function () {
			closePanel();
			if (mode === "hop") {
				openActionDialogViaChain(label);
			} else {
				openActionDialog(label);
			}
		});
		header.appendChild(openBtn);

		actionRow.appendChild(header);

		const prefsWrap = document.createElement("div");
		prefsWrap.className = "pdp-qa-prefs";
		prefsWrap.dataset.actionLabel = label;
		actionRow.appendChild(prefsWrap);

		const newPrefBtn = document.createElement("button");
		newPrefBtn.type = "button";
		newPrefBtn.className = "pdp-qa-pref-new";
		newPrefBtn.textContent = "+ Nova preferência";
		newPrefBtn.title = "Abre o diálogo para você preencher e salvar o preenchimento como preferência";
		newPrefBtn.addEventListener("click", function () {
			closePanel();
			if (mode === "hop") {
				startNewPreferenceCaptureViaChain(label);
			} else {
				startNewPreferenceCapture(label);
			}
		});
		actionRow.appendChild(newPrefBtn);

		return actionRow;
	}

	function renderPreferences(label, prefs, mode) {
		if (!activePanel) return;
		const wrap = activePanel.querySelector('.pdp-qa-prefs[data-action-label="' + cssEscapeAttr(label) + '"]');
		if (!wrap) return;
		wrap.innerHTML = "";
		prefs.forEach(function (pref) {
			const chip = document.createElement("span");
			chip.className = "pdp-qa-pref-chip";

			const applyBtn = document.createElement("button");
			applyBtn.type = "button";
			applyBtn.className = "pdp-qa-pref-btn";
			applyBtn.textContent = "★ " + pref.name;
			applyBtn.title = 'Preenche automaticamente e pede 1 confirmação para executar "' + label + '"';
			applyBtn.addEventListener("click", function () {
				if (mode === "hop") {
					closePanel();
					applyPreferenceViaChain(label, pref);
				} else {
					applyPreference(label, pref);
				}
			});
			chip.appendChild(applyBtn);

			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "pdp-qa-pref-del";
			delBtn.textContent = "🗑";
			delBtn.title = "Remover esta preferência";
			delBtn.addEventListener("click", function () {
				if (!confirm('Remover a preferência "' + pref.name + '" de "' + label + '"?')) return;
				removePreference(label, pref.id).then(function () {
					return loadPreferencesFor(label);
				}).then(function (updated) {
					renderPreferences(label, updated, mode);
				});
			});
			chip.appendChild(delBtn);

			wrap.appendChild(chip);
		});
	}

	// -------------------------------------------------------------------
	// Posicionamento (mesma técnica dos botões irmãos de WhatsApp/e-mail)
	// -------------------------------------------------------------------

	function positionPanel(groupId) {
		if (!activePanel || !row) return;
		const btn = row.querySelector('[data-group-id="' + groupId + '"]');
		if (!btn) return;
		const rect = btn.getBoundingClientRect();

		const bottom = window.innerHeight - rect.top + 6;
		const maxHeight = rect.top - BUTTON_SCREEN_MARGIN * 2;
		activePanel.style.bottom = Math.round(bottom) + "px";
		activePanel.style.maxHeight = Math.max(140, Math.round(maxHeight)) + "px";

		const panelRect = activePanel.getBoundingClientRect();
		let right = window.innerWidth - rect.right;
		const overflowLeft = window.innerWidth - right - panelRect.width - BUTTON_SCREEN_MARGIN;
		if (overflowLeft < 0) right += overflowLeft;
		activePanel.style.right = Math.max(BUTTON_SCREEN_MARGIN, Math.round(right)) + "px";
	}

	function repositionRow() {
		if (!row) return;

		const otherButtons = Array.prototype.slice.call(document.querySelectorAll(OTHER_BUTTON_SELECTOR));
		if (otherButtons.length) {
			let minLeft = null;
			let minTop = null;
			let maxBottom = null;
			otherButtons.forEach(function (btn) {
				const rect = btn.getBoundingClientRect();
				if (minLeft === null || rect.left < minLeft) minLeft = rect.left;
				if (minTop === null || rect.top < minTop) minTop = rect.top;
				if (maxBottom === null || rect.bottom > maxBottom) maxBottom = rect.bottom;
			});

			const groupCenter = (minTop + maxBottom) / 2;
			const rowHeight = row.offsetHeight || 32;
			const bottom = window.innerHeight - groupCenter - rowHeight / 2;
			row.style.bottom = Math.max(BUTTON_SCREEN_MARGIN, Math.round(bottom)) + "px";
			row.style.right = Math.round(window.innerWidth - minLeft + 8) + "px";
			if (activeGroupId) positionPanel(activeGroupId);
			return;
		}

		let bottom = BUTTON_SCREEN_MARGIN;
		const toolbarButton = findProcessToolbarElement();
		if (toolbarButton) {
			const toolbarRow = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = toolbarRow.getBoundingClientRect();
			const toolbarVisible = rect.bottom > 0 && rect.top < window.innerHeight;
			if (toolbarVisible) {
				const offset = Math.round(window.innerHeight - rect.top + BUTTON_SCREEN_MARGIN);
				bottom = Math.min(Math.max(BUTTON_SCREEN_MARGIN, offset), window.innerHeight - BUTTON_SCREEN_MARGIN);
			}
		}
		row.style.bottom = bottom + "px";
		row.style.right = BUTTON_SCREEN_MARGIN + "px";
		if (activeGroupId) positionPanel(activeGroupId);
	}

	// -------------------------------------------------------------------
	// Reconciliação (sobrevive a trocas de aba do processo) e listeners
	// -------------------------------------------------------------------

	function isElementUsable(el) {
		return !!el && el.isConnected;
	}

	function reconcile() {
		try {
			if (!isElementUsable(row)) {
				ensureRow();
			}
			if (activePanel && !activePanel.isConnected) {
				activePanel = null;
				activeGroupId = null;
			}
			repositionRow();
		} catch (err) {
			console.error("[Projudi Ações Rápidas]", "erro ao reconciliar:", err);
		}
	}

	setInterval(reconcile, 700);
	reconcile();

	const observer = new MutationObserver(function () {
		try {
			reconcile();
		} catch (err) {
			console.error("[Projudi Ações Rápidas]", "erro no MutationObserver:", err);
		}
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });

	let repositionScheduled = false;
	function scheduleReposition() {
		if (repositionScheduled) return;
		repositionScheduled = true;
		requestAnimationFrame(function () {
			repositionScheduled = false;
			repositionRow();
		});
	}
	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);
})();
