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
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	// A janela do Oráculo mantém apenas os controles nativos.
	if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return;
	// Nas telas em que a fileira de botões não aparece (ver uiVisibility.js)
	// o script continua carregando, sem interface, só para expor a API
	// window.__pdpQuickActions - usada, por exemplo, pelas preferências
	// aplicadas a partir da linha do processo nas telas de Análise de
	// Juntadas/Retorno de Conclusão/Decurso de Prazo (preferenciasNaLinha.js).
	const semInterface = !!window.__pdpButtonGroupBlocked;

	if (window.__pdpQuickActionsInjected) return;
	window.__pdpQuickActionsInjected = true;
	// Dentro do próprio popup desta extensão (ex.: a tela de Ações carregada
	// para "Arquivar Processo", ver openInsideAcoesScreen) não cria outra
	// fileira de botões por cima do diálogo.
	try {
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

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
			// Não é um link do painel Ações: o caminho até a tela final
			// (aba "Informações Adicionais" → Depósitos/Alvarás Eletrônicos
			// → "Novo Alvará") é ensinado por alvaraEletronico.js — ver
			// CUSTOM_ACTIONS/openCustomAction. Só no Projudi.
			id: "alvara",
			title: "Alvará Eletrônico",
			icon: "🏦",
			actions: ["Alvará Eletrônico"],
			custom: true,
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
	const JUNTAR_PREFS_KEY = "pdpJuntarDocumentoPrefs"; // ver juntarDocumento.js
	const FAV_ORDER_KEY = "pdpPreferencesOrder"; // ["a:<id>" | "j:<id>", ...] — ordem dos cards em "Minhas Preferências"
	const FAV_PANEL_ID = "__minhas-preferencias";
	const FAV_VISIBLE_LIMIT = 20;
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
	// Etapa de combo em andamento neste frame (ver "Combos de preferências").
	let comboStep = null;
	// A tela está sendo recarregada por esta extensão (fim de uma ação): a
	// próxima etapa de um combo fica para a instância da página recarregada.
	let pageReloading = false;
	// Ganchos do popup aberto a partir da linha de uma listagem (ver
	// applyPreferenceFrom): { noReload, onSubmit, onDone, onClose }. Lá a
	// tela por trás é uma listagem (resultado de um POST), que não deve ser
	// recarregada ao fim da ação - a linha é que mostra o resultado.
	let modalHooks = null;
	const ROW_EXPANDED_KEY = "pdpQuickActionsExpanded";
	let rowExpanded = false;
	let rowPreferenceLoaded = false;
	let rowPreferenceSave = Promise.resolve();

	function applyRowExpandedState() {
		if (!row) return;

		const optionsBtn = row.querySelector("#pdp-qa-options");
		if (optionsBtn) {
			optionsBtn.disabled = !rowPreferenceLoaded;
			optionsBtn.setAttribute("aria-expanded", String(rowExpanded));
			optionsBtn.textContent = rowExpanded ? "▾ Ações" : "▸ Ações";
			optionsBtn.title = rowExpanded
				? "Recolher atalhos"
				: "Mostrar atalhos";
		}

		row.querySelectorAll("[data-group-id]").forEach(function (btn) {
			btn.hidden = !rowExpanded;
			if (rowExpanded) {
				btn.style.removeProperty("display");
			} else {
				// Garante o recolhimento mesmo se o CSS definir display.
				btn.style.setProperty("display", "none", "important");
			}
		});

		window.dispatchEvent(new Event("pdp-buttons-layout"));
		if (!rowExpanded) closePanel();
		repositionRow();
	}

	function toggleRowExpanded() {
		if (!rowPreferenceLoaded) return;

		rowExpanded = !rowExpanded;
		applyRowExpandedState();

		const expandedToSave = rowExpanded;

		// Mantém a ordem de gravação mesmo com vários cliques rápidos.
		rowPreferenceSave = rowPreferenceSave
			.then(function () {
				return chrome.storage.local.set({
					[ROW_EXPANDED_KEY]: expandedToSave,
				});
			})
			.catch(function (err) {
				console.error(
					"[Projudi Ações Rápidas] Erro ao salvar estado dos atalhos:",
					err
				);
				alert(
					"Não foi possível salvar a preferência dos atalhos. " +
					"A alteração continua válida nesta tela."
				);
			});
	}

	function loadRowExpandedPreference() {
		chrome.storage.local.get([ROW_EXPANDED_KEY])
			.then(function (data) {
				rowExpanded = data[ROW_EXPANDED_KEY] === true;
			})
			.catch(function (err) {
				console.error(
					"[Projudi Ações Rápidas] Erro ao carregar estado dos atalhos:",
					err
				);
			})
			.finally(function () {
				rowPreferenceLoaded = true;
				applyRowExpandedState();
			});
	}

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
			removeActionModal("auto");
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
			iframe.className = "pdp-qa-fetch-iframe";
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
	// `origem` (opcional): { doc, url } de uma tela já carregada em segundo
	// plano (ex.: a tela do processo, aberta a partir da linha de uma
	// listagem - ver applyPreferenceFrom; a aba Movimentações lida pelos
	// combos quando a tela atual é outra aba do processo). Sem ela, parte
	// da tela atual.
	function resolveDialogUrl(label, origem) {
		const rootDoc = (origem && origem.doc) || document;
		const baseUrl = (origem && origem.url) || window.location.href;
		logChainStep('resolvendo URL de "' + label + '" em segundo plano', { partindoDe: baseUrl });

		// A própria origem já é uma tela de Ações.
		if (origem && isOnAcoesScreenIn(rootDoc)) {
			const direct = findActionLinkIn(rootDoc, label);
			const directUrl = direct ? extractUrlFromOnclick(direct.getAttribute("onclick"), baseUrl) : null;
			if (directUrl) return Promise.resolve({ url: directUrl, acoesUrl: baseUrl });
		}

		const liveMovBtn = findMovimentarButtonIn(rootDoc);
		if (liveMovBtn) {
			// Já estamos na tela de detalhe de uma movimentação escolhida
			// manualmente pelo usuário — só um destino possível, sem tentar
			// outras movimentações.
			logChainStep("já na tela de detalhe da movimentação", describeElement(liveMovBtn));
			const movUrl = extractUrlFromOnclick(liveMovBtn.getAttribute("onclick"), baseUrl);
			if (!movUrl) return Promise.resolve({ failed: true, screenTitle: null });
			return fetchDoc(movUrl).then(function (result) {
				if (isOnAcoesScreenIn(result.doc)) {
					const link = findActionLinkIn(result.doc, label);
					if (link) {
						const dialogUrl = extractUrlFromOnclick(link.getAttribute("onclick"), result.url);
						if (dialogUrl) return { url: dialogUrl, acoesUrl: result.url };
					}
				}
				return { failed: true, screenTitle: getScreenTitleIn(result.doc) };
			});
		}

		const events = Array.prototype.slice
			.call(rootDoc.querySelectorAll('a.link[id^="LNKmov"]'))
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
				eventUrl = new URL(href, baseUrl).href;
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
						return { url: dialogUrl, acoesUrl: acoes.url };
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
					removeActionModal("auto");
				};
				shimClose.__pdpShim = true;
				win.close = shimClose;
				logChainStep("shim: close aplicado", null);
			} catch (err) {
				logChainStep("shim: falhou ao aplicar close", String(err));
			}

			checkFlagClosePopup(win);
			checkComboStepResult(iframe);
		});
	}

	// Etapa de combo já confirmada ("Sim, executar") cujo popup parou numa
	// tela de resultado com "sucesso" (sem formulário para preencher): a
	// ação terminou — fecha o popup e o combo segue sozinho. Telas de erro
	// ou com formulário ficam abertas para o usuário.
	const COMBO_RESULT_CLOSE_MS = 1500;
	function checkComboStepResult(iframe) {
		if (!comboStep || comboStep.iframe !== iframe || !comboStep.confirmed) return;
		let doc;
		try {
			doc = iframe.contentDocument;
		} catch (err) {
			return;
		}
		if (!doc || !doc.body) return;
		const text = doc.body.textContent || "";
		if (!/sucesso/i.test(text) || /erro|n[aã]o foi poss[ií]vel|inv[aá]lid/i.test(text)) return;
		if (findLikelyDialogFormIn(doc)) return;
		logChainStep("combo: tela de sucesso no popup da etapa — fechando e seguindo", null);
		setTimeout(function () {
			if (activeModalIframe === iframe) removeActionModal("auto");
		}, COMBO_RESULT_CLOSE_MS);
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
	// Fim de uma ação no popup: recarrega a tela por trás - exceto quando o
	// popup foi aberto a partir da linha de uma listagem (modalHooks).
	function finishActionAndReload() {
		if (modalHooks && modalHooks.noReload) {
			if (modalHooks.onDone) modalHooks.onDone();
			return;
		}
		try {
			// Um combo em andamento continua na página recarregada (ver
			// advanceCombo/maybeResumeCombo).
			pageReloading = true;
			window.location.reload();
		} catch (err) {
			logChainStep("falhou ao recarregar a tela por trás", String(err));
		}
	}

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
				finishActionAndReload();
				removeActionModal("auto");
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
			removeActionModal("manual");
		});
		const iframe = backdrop.querySelector(".pdp-qa-modal-iframe");
		activeModalIframe = iframe;
		attachModalIframeCloseShim(iframe);
		startModalWatch(iframe);
		// O primeiro popup aberto por uma etapa de combo é o dessa etapa
		// (ver runPendingComboStep); a barra do combo fica por cima dele.
		if (comboStep && !comboStep.iframe) {
			comboStep.iframe = iframe;
			bringComboBarToFront();
		}
		return iframe;
	}

	// `reason`: "auto" quando o próprio Projudi sinalizou o fim da ação
	// (flagClosePopup, window.close(), volta à tela do processo), "manual"
	// no "✕ Fechar"/"Cancelar" — os combos usam isso para saber se a etapa
	// foi executada (ver onComboStepModalClosed).
	function removeActionModal(reason) {
		const el = document.getElementById(MODAL_ID);
		if (el) el.remove();
		const closedIframe = activeModalIframe;
		activeModalIframe = null;
		if (modalHooks) {
			const hooks = modalHooks;
			modalHooks = null;
			if (hooks.onClose) hooks.onClose();
		}
		stopModalWatch();
		removeConfirmBar();
		removeCaptureToolbar();
		if (comboStep && closedIframe && comboStep.iframe === closedIframe) onComboStepModalClosed(reason);
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

	// `extra`: dados além dos campos, guardados na própria preferência (ex.:
	// a modalidade do "Alvará Eletrônico" — ver ações personalizadas).
	function addPreference(label, name, fields, extra) {
		return loadAllPreferences().then(function (all) {
			const list = all[label] || [];
			const pref = Object.assign({}, extra || {}, { id: "p" + Date.now() + Math.random().toString(36).slice(2, 7), name: name, fields: fields, createdAt: Date.now() });
			list.push(pref);
			all[label] = list;
			return saveAllPreferences(all);
		});
	}

	// Substitui uma preferência existente (mesmo id e data de criação),
	// com novo nome/campos/dados extras — botão ✏️ (editar).
	function updatePreference(label, id, name, fields, extra) {
		return loadAllPreferences().then(function (all) {
			all[label] = (all[label] || []).map(function (p) {
				if (p.id !== id) return p;
				return Object.assign({}, extra || {}, { id: p.id, name: name, fields: fields, createdAt: p.createdAt, updatedAt: Date.now() });
			});
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

	// Campos de um formulário — por `form.elements`, não pelos filhos no
	// DOM: quando o Projudi abre o `<form>` direto dentro de uma `<table>`
	// (ex.: "Cadastrar Alvará Eletrônico"), o navegador deixa o `<form>`
	// vazio (e oculto: o Chrome aplica `display: none` a um form filho de
	// table/tr) e os campos ficam fora dele, só ASSOCIADOS a ele — um
	// `form.querySelector(...)` não acha nenhum.
	function formControls(form) {
		return Array.prototype.slice.call(form.elements || []);
	}
	function formFieldsNamed(form, name) {
		return formControls(form).filter(function (el) {
			return el.name === name;
		});
	}
	// "Visível" = tem algum campo preenchível visível (não o próprio
	// `<form>`, que pode estar oculto mesmo com os campos na tela — ver
	// formControls).
	function hasVisibleFields(form) {
		return formControls(form).some(function (el) {
			return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== "hidden" && isVisible(el);
		});
	}

	// Aceitam um `root` (o `document` de verdade para o modo "ready", ou
	// `iframe.contentDocument` para o popup do modo "hop") — ver
	// resolveDialogUrl/showActionModal.
	function findLikelyDialogFormIn(root) {
		const forms = root.querySelectorAll("form");
		for (let i = forms.length - 1; i >= 0; i--) {
			const form = forms[i];
			if (hasVisibleFields(form)) return form;
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
			if (!hasVisibleFields(form)) continue;
			const hasAny = names.some(function (name) {
				return formFieldsNamed(form, name).length > 0;
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

	// -------------------------------------------------------------------
	// Gravação e preenchimento de preferências
	//
	// Cada campo gravado guarda, além de name/type/value (e checked):
	// - `text`: o texto da opção escolhida numa lista (<select>) — há listas
	//   que nascem vazias no diálogo novo e só ganham as opções por AJAX
	//   (ex.: "Finalidade" de "Outras Remessas", que depende do Destino; o
	//   próprio "Destino" é um select2 alimentado por busca). Com o texto
	//   dá para achar a opção mesmo com outro value, e, em último caso,
	//   recriá-la (mesma técnica validada ao vivo em remessaMultipla.js);
	// - `id` (campos sem name) e `label` (rótulo na tela, para o usuário
	//   conferir o que foi gravado e ser avisado do que não foi preenchido).
	//
	// O preenchimento (fillFormFields) é feito em rodadas, até cada campo
	// "pegar" ou o tempo acabar:
	// - bolinhas (radio) e caixas (checkbox) primeiro, com .click() de
	//   verdade — a tela liga/desliga os campos de cada opção pelo onclick,
	//   que um `checked = true` não dispara (visto ao vivo em "Outras
	//   Remessas": o Destino ficava de fora do envio);
	// - depois os demais, na ordem da tela; campo ainda desabilitado, ou
	//   lista sem a opção gravada (carregando), fica para a rodada
	//   seguinte;
	// - as listas e bolinhas são conferidas de novo a cada rodada (uma
	//   escolha pode recarregar/zerar outra) e o preenchimento só termina
	//   com tudo certo em duas rodadas seguidas;
	// - lista vazia (select2 alimentado por busca) ganha de volta a opção
	//   gravada, com o value/texto que o usuário escolheu; lista com opções
	//   sem a gravada é aguardada até FILL_TIMEOUT_MS e, se não aparecer,
	//   entra no aviso;
	// - depois, por FILL_GUARD_MS, e de novo no "Sim, executar", campos
	//   gravados que a tela tenha ESVAZIADO (recarga por AJAX) são repostos
	//   — uma troca feita pelo usuário nunca é desfeita; ainda vazios, o
	//   "Sim, executar" avisa e não envia.
	// Só no fim aparece a barra "Sim, executar", com aviso dos campos que
	// não foi possível preencher.
	// -------------------------------------------------------------------

	const FILL_ROUND_MS = 300;
	const FILL_INJECT_AFTER_MS = 2500;
	const FILL_TIMEOUT_MS = 8000;

	function cleanLabel(text) {
		return (text || "").replace(/\(\*\)/g, "").replace(/\s+/g, " ").replace(/[*:]+\s*$/, "").replace(/^\s*\*\s*/, "").trim();
	}

	function normText(text) {
		return (text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	}

	// Texto do <label for> de um controle (ou null).
	function labelForText(el) {
		if (!el.id) return null;
		try {
			const forLabel = el.ownerDocument.querySelector('label[for="' + cssEscapeAttr(el.id) + '"]');
			return forLabel && cleanLabel(forLabel.textContent) ? cleanLabel(forLabel.textContent).slice(0, 60) : null;
		} catch (err) {
			return null;
		}
	}

	// Caixa "marcar todos" da coluna de uma caixa de linha: a caixa rotulada
	// na mesma coluna de uma linha acima, na mesma seção (ex.: "Intimação
	// de Partes" — o cabeçalho de cada seção é uma linha comum da tabela,
	// com as caixas "checker" "Intimação Pessoal" / "Advogado/Sociedade de
	// Advogados"; o título da seção, um <h4> numa linha anterior). Também
	// cobre tabelas com <thead>.
	function columnHeaderCheckbox(el) {
		const cell = el.closest("td, th");
		const row = cell && cell.parentElement;
		if (!row || !row.closest("table")) return null;
		const col = cell.cellIndex;
		for (let prev = row.previousElementSibling; prev; prev = prev.previousElementSibling) {
			if (prev.querySelector("h1, h2, h3, h4, h5, legend")) break; // outra seção
			const headerCell = prev.cells && prev.cells[col];
			const box = headerCell && headerCell.querySelector('input[type="checkbox"]');
			if (box && box !== el && labelForText(box)) return box;
		}
		const table = row.closest("table");
		if (table.tHead && table.tHead.rows.length && row.parentElement !== table.tHead) {
			const th = table.tHead.rows[0].cells[col];
			return th ? th.querySelector('input[type="checkbox"]') : null;
		}
		return null;
	}

	// Caixa de uma linha de tabela: "coluna — parte" (ex.: "Advogado/
	// Sociedade de Advogados — DEJAIR PORTES DE FRANÇA").
	function tableColumnLabel(el) {
		const header = columnHeaderCheckbox(el);
		const headerText = header ? labelForText(header) || cleanLabel(header.closest("td, th").textContent) : null;
		if (!headerText) return null;
		const cell = el.closest("td, th");
		const other = Array.prototype.filter
			.call(cell.parentElement.cells, function (c) {
				return c !== cell && !c.querySelector("input, select, textarea") && cleanLabel(c.textContent);
			})
			.map(function (c) {
				return cleanLabel(c.textContent);
			})
			.join(" ");
		return headerText.slice(0, 60) + (other ? " — " + other.slice(0, 50) : "");
	}

	// Âncora de uma caixa/bolinha: "seção | rótulo" (ex.: "Partes - Vítima |
	// Advogado/Sociedade de Advogados"). Identifica o controle de um
	// processo para outro mesmo quando nome e valor se repetem (as caixas
	// "marcar todos" de "Intimar Partes" são todas name="checker"
	// value="checker") e a numeração muda (quais seções o processo tem).
	function controlAnchor(el) {
		return (sectionTitle(el) || "") + " | " + (labelForText(el) || tableColumnLabel(el) || "");
	}

	// A lista está na opção padrão da tela (a marcada no HTML, ou a primeira).
	function isDefaultOption(select) {
		const options = Array.prototype.slice.call(select.options);
		if (!options.length) return true;
		const def = options.filter(function (o) {
			return o.defaultSelected;
		})[0] || options[0];
		return select.selectedIndex === options.indexOf(def);
	}

	// O controle aparece na tela (blocos ocultos — ex.: o prazo individual de
	// cada parte, que só abre no "+" — não foram preenchidos pelo usuário).
	function isRendered(el) {
		return el.getClientRects().length > 0;
	}

	// Texto logo antes do campo, até o campo anterior ("<b>Urgente:</b> ◉").
	// Numa bolinha, a partir da primeira do grupo (senão "◉ Sim ○ Não"
	// daria "Sim" como rótulo do "Não").
	function inlineLabelBefore(el) {
		let start = el;
		if (el.type === "radio" && el.name && el.form) {
			const first = formFieldsNamed(el.form, el.name)[0];
			if (first) start = first;
		}
		let text = "";
		for (let node = start.previousSibling; node; node = node.previousSibling) {
			if (node.nodeType === 1 && (node.matches("input, select, textarea, br, hr, table, div") || node.querySelector("input, select, textarea"))) break;
			text = (node.textContent || "") + text;
		}
		return cleanLabel(text).slice(0, 60) || null;
	}

	// Rótulo do campo na tela: <label for>, <label> em volta, coluna da
	// tabela, texto logo antes, ou a célula anterior da mesma linha.
	function fieldLabel(el) {
		// Numa bolinha, o <label> é o da OPÇÃO ("Sim"/"Não"); o rótulo do
		// campo é o texto antes da primeira bolinha do grupo ("Urgente").
		if (el.type !== "radio") {
			const forText = labelForText(el);
			if (forText) return forText;
			const wrap = el.closest("label");
			if (wrap && cleanLabel(wrap.textContent)) return cleanLabel(wrap.textContent).slice(0, 60);
		}
		if (el.type === "checkbox" || el.type === "radio") {
			const column = tableColumnLabel(el);
			if (column) return column;
		}
		const inline = inlineLabelBefore(el);
		if (inline) return inline;
		// Campo sem rótulo próprio logo depois de outro (ex.: os dias do
		// "Prazo: [Estipular em dias] [10]"): o rótulo do anterior.
		const prevControl = el.previousElementSibling;
		if (prevControl && /^(INPUT|SELECT|TEXTAREA)$/.test(prevControl.tagName)) {
			const prevText = labelForText(prevControl) || inlineLabelBefore(prevControl);
			if (prevText) return prevText;
		}
		const cell = el.closest("td");
		if (cell) {
			let prev = cell.previousElementSibling;
			while (prev && !cleanLabel(prev.textContent)) prev = prev.previousElementSibling;
			if (prev) return cleanLabel(prev.textContent).slice(0, 60);
		}
		return el.name || el.id || "(campo)";
	}

	// Título da seção do diálogo em que o campo está (último título antes
	// dele — ex.: "Partes - Vítima"), para distinguir rótulos repetidos.
	function sectionTitle(el) {
		const headings = el.ownerDocument.querySelectorAll("h1, h2, h3, h4, legend");
		let title = null;
		for (let i = 0; i < headings.length; i++) {
			if (headings[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) title = cleanLabel(headings[i].textContent);
		}
		return title;
	}

	// Controles "de verdade" com o mesmo nome (campos ocultos de mesmo nome,
	// que o Projudi usa como espelho de listas e caixas, ficam de fora), do
	// mesmo tipo do controle gravado.
	function controlKind(type) {
		if (type === "checkbox" || type === "radio") return type;
		if (type === "select-one" || type === "select-multiple") return "select";
		return "text";
	}
	function sameNameControls(form, name, kind) {
		return formFieldsNamed(form, name).filter(function (c) {
			return /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && c.type !== "hidden" && controlKind((c.type || "").toLowerCase()) === kind;
		});
	}

	// Texto da opção de uma bolinha: o <label> dela, ou o texto logo depois
	// dela até o próximo campo ("◉ Sim ○ Não" → "Sim").
	function radioOptionLabel(el) {
		const doc = el.ownerDocument;
		try {
			if (el.id) {
				const forLabel = doc.querySelector('label[for="' + cssEscapeAttr(el.id) + '"]');
				if (forLabel && cleanLabel(forLabel.textContent)) return cleanLabel(forLabel.textContent).slice(0, 60);
			}
		} catch (err) {
			// seletor inválido: segue
		}
		const wrap = el.closest("label");
		if (wrap && cleanLabel(wrap.textContent)) return cleanLabel(wrap.textContent).slice(0, 60);
		let text = "";
		for (let node = el.nextSibling; node; node = node.nextSibling) {
			if (node.nodeType === 1 && (node.matches("input, select, textarea, br") || node.querySelector("input, select, textarea"))) break;
			text += node.textContent || "";
		}
		return cleanLabel(text).slice(0, 60) || el.value;
	}

	// Texto do valor gravado, para mostrar ao usuário.
	function describeFieldValue(f) {
		if (f.type === "checkbox") return f.checked ? "marcado" : "desmarcado";
		if (f.type === "radio") return f.optionLabel || f.value;
		if (f.type === "select-multiple") return (f.texts || f.values || []).join(", ") || "(nenhum)";
		if (f.type === "select-one") return f.text || f.value || "(vazio)";
		return f.value ? (f.value.length > 60 ? f.value.slice(0, 60) + "…" : f.value) : "(vazio)";
	}

	function describeFields(fields) {
		return fields
			.filter(function (f) {
				return f.type !== "radio" || f.checked;
			})
			.map(function (f) {
				return "• " + (f.label || f.name || f.id) + ": " + describeFieldValue(f);
			})
			.join("\n");
	}

	function captureFormFields(form) {
		const fields = [];
		const elements = formControls(form).filter(function (el) {
			return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
		});
		elements.forEach(function (el) {
			if (!el.name && !el.id) return;
			const type = (el.type || el.tagName || "").toLowerCase();
			if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "file" || type === "password" || type === "image") return;
			// Só o que o usuário de fato preencheu/selecionou: campos
			// bloqueados (ex.: as seções não escolhidas de "Realizar
			// Remessa"), vazios, bolinhas não marcadas e caixas desmarcadas
			// ficam de fora — salvo a caixa que vinha marcada e foi
			// desmarcada (essa escolha também é do usuário).
			if (el.disabled) return;
			if (!isRendered(el) && !(el.tagName === "SELECT" && isSelect2(el))) return; // o select2 esconde a lista original
			// Bolinha, lista e texto: só se diferem do padrão da tela (o que
			// já vem assim — ex.: "Urgente: Não", "Prazo: Estipular em dias"
			// — não foi escolha do usuário).
			if (type === "radio" && (!el.checked || el.defaultChecked)) return;
			// (o select2 cria a opção escolhida já como "padrão" — ele fica
			// de fora dessa regra; vazio, cai na regra abaixo)
			if (type === "select-one" && !isSelect2(el) && isDefaultOption(el)) return;
			if ((type === "text" || type === "textarea" || type === "number" || type === "date" || type === "email" || type === "tel") && el.value === el.defaultValue) return;
			// Caixa: só se o estado difere do padrão da tela. As caixas de
			// cada parte (valor = código da parte) só existem no processo em
			// que a preferência foi gravada; noutro processo são ignoradas, e
			// vale o "marcar todos" da coluna, se ele foi gravado.
			if (type === "checkbox" && el.checked === el.defaultChecked) return;
			if (type === "select-multiple" && !Array.prototype.some.call(el.options, function (o) { return o.selected; })) return;
			if (type !== "radio" && type !== "checkbox" && type !== "select-multiple" && !(el.value || "").trim()) return;
			const f = { name: el.name || "", type: type, label: fieldLabel(el) };
			if (!el.name) f.id = el.id;
			// Posição entre os controles de mesmo nome (e, nas caixas e
			// bolinhas, entre os de mesmo nome E valor): há diálogos com
			// várias caixas de mesmo nome/valor (ex.: os "marcar todos" de
			// cada coluna/seção de "Intimar Partes") — sem a posição, a
			// aplicação clicava sempre na primeira.
			if (el.name) {
				const kind = controlKind(type);
				const same = sameNameControls(form, el.name, kind);
				f.idx = same.indexOf(el);
				f.count = same.length;
				if (kind === "checkbox" || kind === "radio") {
					f.vidx = same
						.filter(function (c) {
							return c.value === el.value;
						})
						.indexOf(el);
				}
			}
			if (type === "checkbox" || type === "radio") f.anchor = controlAnchor(el);
			f.section = sectionTitle(el);
			if (type === "checkbox" || type === "radio") {
				f.value = el.value;
				f.checked = el.checked;
				if (type === "checkbox" && !el.checked) f.unchecked = true; // desmarcada pelo usuário
				if (type === "radio" && el.checked) f.optionLabel = radioOptionLabel(el);
			} else if (type === "select-multiple") {
				const selected = Array.prototype.filter.call(el.options, function (o) {
					return o.selected;
				});
				f.values = selected.map(function (o) {
					return o.value;
				});
				f.texts = selected.map(function (o) {
					return cleanLabel(o.textContent);
				});
			} else if (type === "select-one") {
				f.value = el.value;
				const option = el.options[el.selectedIndex];
				f.text = option ? cleanLabel(option.textContent) : "";
			} else {
				f.value = el.value;
			}
			fields.push(f);
		});
		// Rótulos repetidos (ex.: "Urgente" em cada seção de partes) ganham
		// o título da seção.
		const counts = {};
		fields.forEach(function (f) {
			counts[f.label] = (counts[f.label] || 0) + 1;
		});
		fields.forEach(function (f) {
			if (counts[f.label] > 1 && f.section && f.label.indexOf(f.section) === -1) f.label += " — " + f.section;
		});
		return fields;
	}

	// O controle do campo gravado no formulário: por name (ignorando campos
	// ocultos de mesmo nome), escolhido pela posição gravada quando há mais
	// de um; campos sem name, pelo id no documento. Devolve [] ou [el].
	function controlsFor(form, f) {
		if (!f.name) {
			const byId = f.id ? form.ownerDocument.getElementById(f.id) : null;
			return byId ? [byId] : [];
		}
		const kind = controlKind(f.type);
		const same = sameNameControls(form, f.name, kind);
		if (!same.length) return [];
		if (kind === "checkbox" || kind === "radio") {
			const byValue = same.filter(function (c) {
				return c.value === f.value;
			});
			if (byValue.length === 1) return byValue;
			if (byValue.length > 1) {
				// Várias com o mesmo valor: a de mesma âncora (seção + rótulo)
				// — vale entre processos —; senão, a da posição gravada (entre
				// as de mesmo valor; preferências antigas, sem posição, ficam
				// com a primeira, como antes).
				if (f.anchor) {
					const byAnchor = byValue.filter(function (c) {
						return controlAnchor(c) === f.anchor;
					});
					if (byAnchor.length === 1) return byAnchor;
				}
				if (f.vidx >= 0 && f.vidx < byValue.length) return [byValue[f.vidx]];
				if (f.idx >= 0 && same[f.idx] && same[f.idx].value === f.value) return [same[f.idx]];
				return [byValue[0]];
			}
			// Nenhuma com o valor gravado (ex.: a caixa de uma parte, cujo
			// valor é o código dela, noutro processo): não existe aqui —
			// nunca escolher outra "pela posição", que poderia ser outra
			// parte.
			return [];
		}
		if (f.idx >= 0 && same[f.idx]) return [same[f.idx]];
		return [same[0]];
	}

	function fireFieldEvents(el) {
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
	}

	function findOption(select, value, text) {
		const options = Array.prototype.slice.call(select.options);
		const wanted = normText(text);
		return (
			options.filter(function (o) {
				return o.value === value && (!wanted || normText(o.textContent) === wanted);
			})[0] ||
			(wanted
				? options.filter(function (o) {
						return normText(o.textContent) === wanted;
					})[0]
				: null) ||
			(value !== ""
				? options.filter(function (o) {
						return o.value === value;
					})[0]
				: null) ||
			null
		);
	}

	// Aplica um campo; devolve true se ele já está como gravado. `ctx`
	// (opcional, só durante fillFormFields): ctx.changed() avisa que um
	// campo foi alterado; ctx.canInject(f, el) diz se a opção gravada pode
	// ser recriada numa lista vazia.
	function applyField(form, f, ctx) {
		function changed(el) {
			fireFieldEvents(el);
			if (ctx) ctx.changed();
		}
		const els = controlsFor(form, f);
		if (f.type === "radio") {
			if (!f.checked) return true; // o grupo desmarca sozinho os outros
			const el = els[0];
			if (!el || el.disabled) return false;
			if (!el.checked) {
				el.click();
				if (ctx) ctx.changed();
			}
			return el.checked;
		}
		if (f.type === "checkbox") {
			const el = els[0];
			if (!el || el.disabled) return false;
			if (el.checked !== f.checked) {
				el.click();
				if (ctx) ctx.changed();
			}
			return el.checked === f.checked;
		}
		const el = els[0];
		if (!el || el.disabled) return false;
		if (f.type === "select-multiple") {
			let changed = false;
			let ok = true;
			(f.values || []).forEach(function (value, i) {
				const option = findOption(el, value, (f.texts || [])[i]);
				if (!option) {
					ok = false;
					return;
				}
				if (!option.selected) {
					option.selected = true;
					changed = true;
				}
			});
			if (changed) {
				fireFieldEvents(el);
				if (ctx) ctx.changed();
			}
			return ok;
		}
		if (f.type === "select-one") {
			let option = findOption(el, f.value, f.text);
			// Lista vazia (só o "selecione", ex.: select2 alimentado por
			// busca): recria a opção gravada. Lista COM opções sem a
			// gravada: espera (pode estar carregando) e, se não aparecer,
			// avisa — recriar ali enviaria um valor que o Projudi não
			// oferece mais.
			if (!option && f.value !== "" && el.options.length <= 1 && ctx && ctx.canInject(f, el)) {
				option = new Option(f.text || f.value, f.value);
				el.add(option);
				logChainStep("preferência: opção recriada na lista", { campo: f.label || f.name, opcao: f.text || f.value });
			}
			if (!option) return f.value === "" && !f.text;
			if (el.value !== option.value) {
				el.value = option.value;
				changed(el);
			}
			return el.value === option.value;
		}
		// Texto: aplica uma vez (máscaras podem reformatar o valor); só
		// reaplica se o campo voltar vazio.
		if (el.value !== f.value && !(el.__pdpFilled && el.value)) {
			el.value = f.value;
			el.__pdpFilled = true;
			changed(el);
		}
		return true;
	}

	// <select> transformado em select2 (o original fica oculto, com a
	// classe/atributos que o próprio select2 aplica, e o widget logo depois).
	function isSelect2(el) {
		if (el.classList.contains("select2-hidden-accessible") || el.hasAttribute("data-select2-id")) return true;
		const next = el.nextElementSibling;
		return !!next && (next.classList.contains("select2") || next.classList.contains("select2-container"));
	}

	// Campo que o usuário de fato preencheu na preferência. Preferências
	// gravadas antes da versão 2.9.82 guardavam também os campos vazios, as
	// bolinhas não marcadas e as caixas desmarcadas — esses são ignorados.
	function isMeaningfulField(f) {
		if (f.type === "radio") return !!f.checked;
		if (f.type === "checkbox") return !!f.checked || !!f.unchecked;
		if (f.type === "select-multiple") return !!(f.values && f.values.length);
		return (f.value || "").trim() !== "";
	}

	// O campo (ou a opção da bolinha/caixa) existe na tela, mas bloqueado.
	function fieldDisabledNow(form, f) {
		const el = controlsFor(form, f)[0];
		return !!el && el.disabled;
	}

	// Campo que continua bloqueado depois de marcadas as bolinhas e caixas
	// da preferência pertence a uma parte do diálogo que ela não usa (ex.:
	// outra seção de "Realizar Remessa", em preferência antiga) — não é
	// preenchido nem cobrado.
	const FILL_DISABLED_GRACE_MS = 1500;

	// Preenche `fields` em rodadas (ver acima) e chama done(faltando).
	function fillFormFields(form, fields, done) {
		fields = fields.filter(isMeaningfulField);
		const ordered = fields
			.filter(function (f) {
				return f.type === "radio" || f.type === "checkbox";
			})
			.concat(
				fields.filter(function (f) {
					return f.type !== "radio" && f.type !== "checkbox";
				})
			);
		const start = Date.now();
		let stableRounds = 0;
		let lastMissing = ordered;
		// Uma alteração pode fazer a tela recarregar outras listas (ex.:
		// Destino → Finalidade): lista comum vazia só ganha a opção
		// recriada depois de FILL_INJECT_AFTER_MS vazia e sem nenhuma
		// alteração. Um select2 vazio (ex.: o Destino) é alimentado só pela
		// busca do usuário — nunca carrega a opção sozinho —, então ganha
		// a opção gravada na hora.
		let lastChangeAt = start;
		const emptySince = new Map();
		const ctx = {
			changed: function () {
				lastChangeAt = Date.now();
			},
			canInject: function (f, el) {
				if (isSelect2(el)) return true;
				if (!emptySince.has(f)) emptySince.set(f, Date.now());
				return Date.now() - Math.max(emptySince.get(f), lastChangeAt) >= FILL_INJECT_AFTER_MS;
			},
		};

		function round() {
			// Popup fechado/diálogo trocado no meio: não há o que preencher.
			if (!form.isConnected) return;
			const pastGrace = Date.now() - start >= FILL_DISABLED_GRACE_MS;
			const missing = ordered.filter(function (f) {
				try {
					// Depois da carência: campo bloqueado (parte do diálogo que a
					// preferência não usa) ou inexistente neste processo (ex.: o
					// prazo de uma parte que só havia no processo em que a
					// preferência foi gravada) não é preenchido nem cobrado.
					if (pastGrace && (fieldDisabledNow(form, f) || !controlsFor(form, f).length)) return false;
					const el = controlsFor(form, f)[0];
					if (el && el.tagName === "SELECT" && el.options.length > 1) emptySince.delete(f);
					return !applyField(form, f, ctx);
				} catch (err) {
					logChainStep("preferência: erro ao preencher um campo", { campo: f.label || f.name, erro: String(err) });
					return true;
				}
			});
			lastMissing = missing;
			stableRounds = missing.length || Date.now() - lastChangeAt < FILL_ROUND_MS ? 0 : stableRounds + 1;
			if (stableRounds >= 3 || Date.now() - start >= FILL_TIMEOUT_MS) {
				if (missing.length) logChainStep("preferência: campos não preenchidos", missing.map(function (f) { return (f.label || f.name) + " = " + describeFieldValue(f); }));
				logChainStep("preferência: preenchimento concluído", { segundos: ((Date.now() - start) / 1000).toFixed(1), campos: ordered.length, faltando: missing.length });
				guardEmptyFields(form, ordered);
				done(missing);
				return;
			}
			setTimeout(round, FILL_ROUND_MS);
		}
		round();
		return function () {
			return lastMissing;
		};
	}

	// Campo gravado com valor que está VAZIO agora (lista no "selecione",
	// texto em branco, grupo de bolinhas sem nenhuma marcada) — o que uma
	// recarga por AJAX costuma fazer. Só esses são repostos depois do
	// preenchimento: uma troca feita pelo usuário nunca é desfeita.
	function fieldIsEmptyNow(form, f) {
		if (!isMeaningfulField(f) || fieldDisabledNow(form, f)) return false;
		if (f.type === "radio") {
			// Grupo inteiro sem nenhuma marcada.
			return f.checked && !!f.name && !sameNameControls(form, f.name, "radio").some(function (c) {
				return c.checked;
			});
		}
		if (f.type === "checkbox" || f.type === "select-multiple") return false;
		const el = controlsFor(form, f)[0];
		if (!el) return false; // não existe neste processo
		return f.value !== "" && el.value === "";
	}

	function restoreEmptyFields(form, fields) {
		return fields.filter(function (f) {
			if (!fieldIsEmptyNow(form, f)) return false;
			try {
				applyField(form, f);
			} catch (err) {
				return true;
			}
			return fieldIsEmptyNow(form, f);
		});
	}

	// Por alguns segundos depois do preenchimento, repõe campos que uma
	// recarga tardia (AJAX) tenha esvaziado.
	const FILL_GUARD_MS = 6000;
	function guardEmptyFields(form, fields) {
		const until = Date.now() + FILL_GUARD_MS;
		const iv = setInterval(function () {
			if (!form.isConnected || Date.now() > until) {
				clearInterval(iv);
				return;
			}
			const restored = fields.filter(function (f) {
				return fieldIsEmptyNow(form, f);
			});
			if (restored.length) {
				logChainStep("preferência: repondo campo(s) esvaziado(s) pela tela", restored.map(function (f) { return f.label || f.name; }));
				restoreEmptyFields(form, restored);
			}
		}, FILL_ROUND_MS);
	}

	// Compatível com o uso antigo (uma passada, sem esperar).
	function applyFormFields(form, fields) {
		fields.forEach(function (f) {
			applyField(form, f);
		});
	}

	function findSubmitControl(form) {
		const controls = formControls(form).filter(function (c) {
			return c.tagName === "BUTTON" || (c.tagName === "INPUT" && (c.type === "submit" || c.type === "button"));
		});
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
	// `doc` também pode ser uma função que devolve o documento na hora de
	// salvar; `getExtra` (opcional) devolve os dados extras da preferência.
	// Com `editingPref`, é a edição dessa preferência (botão ✏️): o diálogo
	// já vem preenchido com ela, e salvar a SUBSTITUI (mesmo id), com o nome
	// atual sugerido.
	function showCaptureToolbar(label, doc, getExtra, editingPref) {
		doc = doc || document;
		removeCaptureToolbar();
		captureToolbar = document.createElement("div");
		captureToolbar.className = "pdp-qa-capture-bar";
		captureToolbar.innerHTML =
			(editingPref
				? '<span>Editando a preferência "' + escapeHtml(editingPref.name) + '" — ajuste o diálogo acima e depois:</span>' +
					'<button type="button" class="pdp-qa-capture-save">💾 Atualizar preferência</button>'
				: '<span>Preencha o diálogo acima normalmente e depois:</span>' +
					'<button type="button" class="pdp-qa-capture-save">💾 Salvar como preferência</button>') +
			'<button type="button" class="pdp-qa-capture-cancel">Cancelar</button>';
		document.body.appendChild(captureToolbar);

		captureToolbar.querySelector(".pdp-qa-capture-cancel").addEventListener("click", removeCaptureToolbar);
		captureToolbar.querySelector(".pdp-qa-capture-save").addEventListener("click", function () {
			const currentDoc = typeof doc === "function" ? doc() : doc;
			const form = findCustomForm(label, currentDoc) || findLikelyDialogFormIn(currentDoc);
			if (!form) {
				alert('Não encontrei o formulário do diálogo "' + label + '" para capturar. Ele ainda está aberto na tela?');
				return;
			}
			const custom = getCustomAction(label);
			const fields = captureFormFields(form).filter(function (f) {
				return !custom || !custom.prefFields || custom.prefFields.indexOf(f.name) !== -1;
			});
			if (!fields.length) {
				alert('Nenhum campo preenchido ou selecionado no diálogo "' + label + '". Preencha o que a preferência deve guardar e salve de novo.');
				return;
			}
			// Mostra o que vai ser gravado: dá para conferir na hora se algum
			// campo (ex.: uma lista que carrega depois) ficou de fora.
			const name = prompt(
				"Campos que serão gravados:\n" + describeFields(fields) + "\n\nSe algum estiver errado, cancele, ajuste o diálogo e salve de novo.\n\nNome para esta preferência de \"" + label + '":',
				editingPref ? editingPref.name : ""
			);
			if (!name || !name.trim()) return;
			const extra = getExtra ? getExtra() : null;
			const saving = editingPref
				? updatePreference(label, editingPref.id, name.trim(), fields, extra)
				: addPreference(label, name.trim(), fields, extra);
			saving
				.then(function () {
					// Confere a gravação lendo de volta do armazenamento.
					return loadPreferencesFor(label);
				})
				.then(function (prefs) {
					const saved = prefs.filter(function (p) {
						return p.name === name.trim() && (p.fields || []).length === fields.length;
					})[0];
					if (!saved) throw new Error("a preferência não foi encontrada ao reler o armazenamento");
					removeCaptureToolbar();
					alert(
						'Preferência "' + name.trim() + '" ' + (editingPref ? "atualizada" : "salva") + ' para "' + label +
						'" (' + fields.length + " campos). Você ainda pode revisar e enviar este formulário normalmente."
					);
				})
				.catch(function (err) {
					alert("Não foi possível salvar a preferência: " + (err && err.message ? err.message : err) + ". Tente de novo.");
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

	// Barra provisória enquanto fillFormFields preenche o diálogo.
	function showFillingBar(label, pref) {
		removeConfirmBar();
		confirmBar = document.createElement("div");
		confirmBar.className = "pdp-qa-confirm-bar pdp-qa-filling-bar";
		confirmBar.innerHTML =
			(comboStep ? '<span class="pdp-qa-confirm-combo">' + escapeHtml(comboStepCaption()) + "</span>" : "") +
			'<span>Preenchendo "' + escapeHtml(label) + '" com a preferência "' + escapeHtml(pref.name) + '"…</span>';
		document.body.appendChild(confirmBar);
	}

	function missingFieldsText(missing) {
		return missing
			.map(function (f) {
				return (f.label || f.name || f.id) + " (" + describeFieldValue(f) + ")";
			})
			.join("; ");
	}

	// Aviso fora da barra de confirmação (edição, ações sem "Sim, executar").
	function warnMissingFields(label, pref, missing) {
		if (!missing || !missing.length) return;
		alert('Não consegui preencher estes campos da preferência "' + pref.name + '" em "' + label + '":\n' + missingFieldsText(missing) + "\n\nPreencha-os manualmente.");
	}

	// Preenche o diálogo com a preferência e, no fim, mostra a barra certa.
	function fillPreference(label, pref, form, doc, editing) {
		showFillingBar(label, pref);
		fillFormFields(form, pref.fields, function (missing) {
			removeConfirmBar();
			afterPreferenceFilled(label, pref, form, doc, editing, missing);
		});
	}

	// `missing`: campos que não foi possível preencher — a barra avisa
	// (confira e preencha antes de confirmar).
	function showConfirmBar(label, pref, form, missing) {
		removeConfirmBar();
		confirmBar = document.createElement("div");
		confirmBar.className = "pdp-qa-confirm-bar" + (missing && missing.length ? " pdp-qa-confirm-warn" : "");
		confirmBar.innerHTML =
			(comboStep ? '<span class="pdp-qa-confirm-combo">' + escapeHtml(comboStepCaption()) + "</span>" : "") +
			(missing && missing.length
				? '<span class="pdp-qa-confirm-missing">⚠ Não consegui preencher: ' + escapeHtml(missingFieldsText(missing)) + ". Preencha antes de confirmar.</span>"
				: "") +
			'<span>Confirmar "' + escapeHtml(label) + '" com a preferência "' + escapeHtml(pref.name) + '"?</span>' +
			'<button type="button" class="pdp-qa-confirm-yes">✅ Sim, executar</button>' +
			'<button type="button" class="pdp-qa-confirm-cancel">Cancelar</button>';
		document.body.appendChild(confirmBar);

		confirmBar.querySelector(".pdp-qa-confirm-cancel").addEventListener("click", removeConfirmBar);
		confirmBar.querySelector(".pdp-qa-confirm-yes").addEventListener("click", function () {
			// Última conferência antes de enviar: repõe o que a tela tenha
			// esvaziado e não envia com campo gravado ainda vazio.
			const stillEmpty = form.isConnected ? restoreEmptyFields(form, pref.fields || []) : [];
			if (stillEmpty.length) {
				alert("Antes de confirmar, preencha: " + missingFieldsText(stillEmpty) + ". Depois clique de novo em \"Sim, executar\".");
				return;
			}
			const submit = findSubmitControl(form);
			removeConfirmBar();
			if (!submit) {
				alert('Os campos foram preenchidos, mas não encontrei o botão de confirmar do Projudi automaticamente. Confira e clique nele manualmente.');
				return;
			}
			if (comboStep) comboStep.confirmed = true;
			if (modalHooks && modalHooks.onSubmit) modalHooks.onSubmit();
			submit.click();
		});
	}

	// Depois de preencher o diálogo com uma preferência: no uso normal, a
	// barra "Sim, executar"; na edição (✏️), a barra "Atualizar
	// preferência" — nada é enviado ao Projudi.
	function afterPreferenceFilled(label, pref, form, doc, editing, missing) {
		if (editing) {
			warnMissingFields(label, pref, missing);
			showCaptureToolbar(label, doc, null, pref);
		} else {
			showConfirmBar(label, pref, form, missing);
		}
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

	function applyPreference(label, pref, editing) {
		closePanel();
		removeCaptureToolbar();
		const link = findActionLink(label);
		if (!link) {
			alert('Não foi possível localizar a ação "' + label + '" na tela atual.');
			return;
		}
		const fieldNames = pref.fields.map(function (f) {
			return f.name;
		}).filter(Boolean);
		link.click();
		waitForFormWithFieldNames(fieldNames, function (form) {
			if (!form) {
				alert('A janela de "' + label + '" não apareceu a tempo (ou os campos mudaram). Preencha manualmente desta vez.');
				return;
			}
			fillPreference(label, pref, form, document, editing);
		});
	}

	// -------------------------------------------------------------------
	// Versões "hop" das três ações acima — usadas quando a tela atual
	// ainda não é a de Ações (ver resolveDialogUrl). Resolvem a URL do
	// diálogo em segundo plano e mostram só ela, num popup desta extensão
	// (showActionModal), sem navegar a aba visível em nenhum momento.
	// -------------------------------------------------------------------

	// Ações cujo diálogo nativo só funciona aberto DENTRO da tela de Ações.
	// O diálogo "Arquivamento de Processo" (que o próprio Projudi abre com o
	// título "Suspender ou Sobrestar Processo", como janela interna da tela
	// de Ações — com "Maximizar"/"Fechar") não grava nada sozinho: o botão
	// "Arquivar" dele depende da tela de Ações que o abriu (window.parent).
	// Carregado solto no popup (só a URL do diálogo, como as demais ações),
	// o clique em "Arquivar" não tinha para onde enviar e nenhuma
	// movimentação era gerada. Para essas ações o popup carrega a própria
	// tela de Ações e clica no link nativo dentro dela, reproduzindo
	// exatamente o ambiente em que o Projudi abre o diálogo.
	const ACTIONS_NEEDING_ACOES_PARENT = ["Arquivar Processo"];

	function needsAcoesParent(label, result) {
		return ACTIONS_NEEDING_ACOES_PARENT.indexOf(label) !== -1 && !!(result && result.acoesUrl);
	}

	// Espera o diálogo nativo (iframe interno da tela de Ações) terminar de
	// carregar e devolve o documento dele — usado para capturar/aplicar
	// preferências no formulário certo.
	function waitForNestedDialogDoc(acoesDoc, dialogUrl, callback) {
		let dialogPath = null;
		try {
			dialogPath = new URL(dialogUrl).pathname;
		} catch (err) {
			// sem caminho conhecido: aceita qualquer iframe com formulário
		}
		const start = Date.now();
		const iv = setInterval(function () {
			const frames = acoesDoc.querySelectorAll("iframe");
			for (let i = 0; i < frames.length; i++) {
				let doc;
				try {
					doc = frames[i].contentDocument;
					if (!doc || doc.readyState !== "complete") continue;
					if (dialogPath && frames[i].contentWindow.location.pathname !== dialogPath) continue;
				} catch (err) {
					continue;
				}
				if (!doc.querySelector("form")) continue;
				clearInterval(iv);
				callback(doc);
				return;
			}
			if (Date.now() - start > DIALOG_WAIT_TIMEOUT_MS * 2) {
				clearInterval(iv);
				callback(null);
			}
		}, DIALOG_WAIT_INTERVAL_MS);
	}

	// Resumo de uma página carregada (para o log de diagnóstico).
	function describeLoadedPage(win, doc) {
		const info = { href: null, title: doc ? doc.title : null };
		try {
			info.href = win.location.href;
		} catch (err) {
			info.href = "(erro ao ler location: " + err + ")";
		}
		if (doc && doc.body) info.texto = (doc.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 400);
		if (doc && doc.forms) {
			for (let i = 0; i < doc.forms.length; i++) {
				const flag = doc.forms[i].elements.namedItem("flagClosePopup");
				if (!flag) continue;
				const back = doc.forms[i].elements.namedItem("backURL");
				info.flagClosePopup = flag.value;
				info.backURL = back ? back.value : null;
				break;
			}
		}
		return info;
	}

	// Registra cada navegação do diálogo nativo aberto dentro da tela de
	// Ações (iframe interno do Projudi), inclusive a resposta do servidor
	// depois do clique em "Arquivar".
	function watchNestedDialogFrames(acoesDoc, label) {
		const seen = [];
		const start = Date.now();
		const iv = setInterval(function () {
			let frames;
			try {
				frames = acoesDoc.querySelectorAll("iframe");
			} catch (err) {
				clearInterval(iv);
				return;
			}
			frames.forEach(function (frame) {
				if (seen.indexOf(frame) !== -1) return;
				seen.push(frame);
				frame.addEventListener("load", function () {
					try {
						logChainStep('diálogo de "' + label + '" carregou uma página', describeLoadedPage(frame.contentWindow, frame.contentDocument));
					} catch (err) {
						logChainStep('diálogo de "' + label + '": sem acesso à página carregada', String(err));
					}
				});
			});
			if (Date.now() - start > 10000) clearInterval(iv);
		}, DIALOG_WAIT_INTERVAL_MS);
	}

	// Depois que a tela de Ações do popup navega de novo, espera ela
	// "assentar" (sem novas navegações por este tempo) antes de decidir se
	// a ação terminou. O Projudi pode passar por telas intermediárias
	// (reenvio de formulário, "Aguarde...") até gravar a movimentação —
	// fechar o popup ou recarregar a tela na primeira navegação destruía o
	// iframe no meio desse fluxo e nada era gravado.
	const ACOES_SETTLE_MS = 2500;

	function openInsideAcoesScreen(label, result, onDialogDoc) {
		const iframe = showActionModal(label);
		let acoesLoaded = false;
		let settleTimer = null;
		iframe.addEventListener("load", function onLoad() {
			let doc;
			try {
				doc = iframe.contentDocument;
			} catch (err) {
				logChainStep("tela de Ações no popup: sem acesso ao documento", String(err));
				return;
			}
			if (!acoesLoaded) {
				acoesLoaded = true;
				const link = doc ? findActionLinkIn(doc, label) : null;
				if (!link) {
					logChainStep('tela de Ações carregada no popup, mas sem o link "' + label + '"', { url: result.acoesUrl });
					alert('Não consegui localizar a ação "' + label + '" na tela de Ações. Abra manualmente a partir da aba Movimentações.');
					removeActionModal();
					return;
				}
				logChainStep('tela de Ações carregada no popup — abrindo "' + label + '" pelo link nativo', describeElement(link));
				link.click();
				watchNestedDialogFrames(doc, label);
				if (onDialogDoc) waitForNestedDialogDoc(doc, result.url, onDialogDoc);
				return;
			}
			logChainStep('popup de "' + label + '" navegou', describeLoadedPage(iframe.contentWindow, doc));
			clearTimeout(settleTimer);
			settleTimer = setTimeout(function () {
				if (activeModalIframe !== iframe) return; // popup já fechado
				let settledDoc;
				try {
					settledDoc = iframe.contentDocument;
				} catch (err) {
					return;
				}
				if (!settledDoc || settledDoc.readyState !== "complete") return;
				// Só fecha sozinho quando o Projudi voltou para uma tela
				// "normal" (a do processo, com as abas, ou a própria tela de
				// Ações). Qualquer outra tela (mensagem de erro, confirmação)
				// fica visível no popup para o usuário ler e fechar.
				const voltouAoProcesso = !!settledDoc.querySelector('[id^="tabItemprefix"]') || isOnAcoesScreenIn(settledDoc);
				if (!voltouAoProcesso) {
					logChainStep('popup de "' + label + '" parou numa tela intermediária — mantendo aberto', describeLoadedPage(iframe.contentWindow, settledDoc));
					return;
				}
				iframe.removeEventListener("load", onLoad);
				logChainStep('"' + label + '" concluído — fechando o popup e recarregando a tela', null);
				finishActionAndReload();
				removeActionModal("auto");
			}, ACOES_SETTLE_MS);
		});
		iframe.src = result.acoesUrl;
	}

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
			if (needsAcoesParent(label, result)) {
				openInsideAcoesScreen(label, result);
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
			if (needsAcoesParent(label, result)) {
				openInsideAcoesScreen(label, result, function (dialogDoc) {
					if (!dialogDoc) {
						alert('A janela de "' + label + '" não apareceu a tempo. Preencha manualmente desta vez.');
						return;
					}
					showCaptureToolbar(label, dialogDoc);
				});
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

	// `origem`/`hooks` (opcionais): ver resolveDialogUrl e modalHooks.
	function applyPreferenceViaChain(label, pref, editing, origem, hooks) {
		const cancelToken = { cancelled: false };
		showLoadingOverlay(label, function () {
			cancelToken.cancelled = true;
			if (hooks && hooks.onFail) hooks.onFail("cancelado");
			onComboStepFailed("Abertura da etapa cancelada.");
		});
		resolveDialogUrl(label, origem).then(function (result) {
			removeLoadingOverlay();
			if (cancelToken.cancelled) return;
			if (result.failed) {
				if (hooks && hooks.onFail) hooks.onFail(result.screenTitle ? 'o Projudi levou à tela "' + result.screenTitle + '"' : "ação não localizada");
				alertChainFailure(label, result);
				onComboStepFailed('Não consegui abrir "' + label + '" a partir desta tela.');
				return;
			}
			const fieldNamesForAcoes = pref.fields.map(function (f) {
				return f.name;
			}).filter(Boolean);
			if (needsAcoesParent(label, result)) {
				openInsideAcoesScreen(label, result, function (dialogDoc) {
					const form = dialogDoc && (findFormContainingFieldNamesIn(dialogDoc, fieldNamesForAcoes) || findLikelyDialogFormIn(dialogDoc));
					if (!form) {
						alert('Carreguei "' + label + '", mas não encontrei o formulário para preencher automaticamente. Preencha manualmente.');
						return;
					}
					fillPreference(label, pref, form, dialogDoc, editing);
				});
				modalHooks = hooks || null;
				return;
			}
			const iframe = showActionModal(label);
			modalHooks = hooks || null;
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
					}).filter(Boolean);
					const form = findFormContainingFieldNamesIn(doc, fieldNames) || findLikelyDialogFormIn(doc);
					if (!form) {
						alert('Carreguei "' + label + '", mas não encontrei o formulário para preencher automaticamente. Preencha manualmente.');
						return;
					}
					fillPreference(label, pref, form, doc, editing);
				},
				{ once: true }
			);
			iframe.src = result.url;
		});
	}

	// -------------------------------------------------------------------
	// Ações "personalizadas" — não são links do painel Ações, e sim telas
	// alcançadas por outro caminho, ensinado por outro arquivo desta
	// extensão, que se registra em `window.__pdpCustomActions[rótulo]`:
	// - resolveUrl(): Promise com a URL da primeira tela a carregar;
	// - step(doc, ctx): chamado a cada página carregada no popup e,
	//   enquanto ela estiver aberta, periodicamente (telas que trocam de
	//   conteúdo sem navegar). `ctx` é o estado desta abertura:
	//   { mode: "open" | "capture" | "apply" | "edit", pref, extra,
	//   actedDoc } ("edit" = abrir já preenchido com `pref` para editá-la,
	//   com as mesmas etapas de "apply"). O
	//   handler pode clicar/escolher opções nativas e devolve:
	//   { state: "wait" }  — continua oculto, esperando a próxima tela;
	//   { state: "show" }  — mostra o popup (o usuário precisa agir nele)
	//                        e continua acompanhando;
	//   { state: "ready" } — tela final: mostra e encerra (onReady);
	//   { state: "fail", message }.
	//   Em `ctx.extra` o handler guarda o que a preferência deve levar além
	//   dos campos da tela final (ex.: a modalidade da tela anterior).
	// - formId: id do <form> da tela final (captura/aplicação);
	// - prefFields: nomes dos campos que uma preferência pode guardar;
	// - confirmAfterApply: false para só preencher, sem "Sim, executar".
	// Hoje: "Alvará Eletrônico" (alvaraEletronico.js).
	// -------------------------------------------------------------------

	const CUSTOM_STEP_TIMEOUT_MS = 20000;
	const CUSTOM_POLL_MS = 400;

	function getCustomAction(label) {
		const all = window.__pdpCustomActions;
		return (all && all[label]) || null;
	}

	// Formulário da tela final pelo id declarado pela ação (`formId`), se
	// houver — mais seguro que a heurística do "último form visível".
	function findCustomForm(label, doc) {
		const custom = getCustomAction(label);
		if (!custom || !custom.formId || !doc) return null;
		const form = doc.getElementById(custom.formId);
		return form && form.tagName === "FORM" ? form : null;
	}

	// Abre a ação no popup, mantendo o iframe oculto (sob o overlay de
	// carregamento) enquanto o handler passa pelas telas intermediárias.
	// `onReady(doc, ctx, iframe)` recebe a tela final.
	function openCustomAction(label, mode, pref, onReady) {
		const custom = getCustomAction(label);
		if (!custom) {
			alert('O atalho "' + label + '" não está disponível nesta tela.');
			return;
		}
		const cancelToken = { cancelled: false };
		function onCancel() {
			cancelToken.cancelled = true;
			removeActionModal("manual");
			onComboStepFailed("Abertura da etapa cancelada.");
		}
		showLoadingOverlay(label, onCancel);

		Promise.resolve()
			.then(function () {
				return custom.resolveUrl();
			})
			.then(function (url) {
				if (cancelToken.cancelled) return;
				const iframe = showActionModal(label);
				iframe.style.visibility = "hidden";
				// O popup acabou de entrar por cima do overlay — traz o
				// overlay de volta para a frente até a tela final chegar.
				showLoadingOverlay(label, onCancel);

				const ctx = { mode: mode, pref: pref || null, extra: {}, actedDoc: null };
				let finished = false;
				let revealed = false;
				let lastState = null;
				let timer = setTimeout(function () {
					if (!finished && !revealed) finish('A tela de "' + label + '" demorou demais para abrir.');
				}, CUSTOM_STEP_TIMEOUT_MS);
				const poll = setInterval(evaluate, CUSTOM_POLL_MS);

				function reveal() {
					if (revealed) return;
					revealed = true;
					clearTimeout(timer);
					removeLoadingOverlay();
					iframe.style.visibility = "";
				}

				function finish(errorMessage, doc) {
					finished = true;
					clearTimeout(timer);
					clearInterval(poll);
					iframe.removeEventListener("load", evaluate);
					if (cancelToken.cancelled || activeModalIframe !== iframe) return;
					reveal();
					// Em caso de erro, mostra mesmo assim a tela em que o
					// Projudi parou (mensagem de erro, falta de permissão).
					if (errorMessage) {
						alert(errorMessage);
						return;
					}
					if (onReady) onReady(doc, ctx, iframe);
				}

				function evaluate() {
					if (finished) return;
					if (cancelToken.cancelled || activeModalIframe !== iframe) {
						finish(null, null);
						return;
					}
					let doc;
					try {
						doc = iframe.contentDocument;
						// O "load" da página em branco inicial (inserir o
						// iframe sem `src`) não é uma etapa — ver fetchDoc.
						if (!doc || iframe.contentWindow.location.href === "about:blank" || doc.readyState !== "complete") return;
					} catch (err) {
						finish("Não consegui acessar o conteúdo do popup.");
						return;
					}
					const result = custom.step(doc, ctx) || { state: "wait" };
					if (result.state !== lastState) {
						lastState = result.state;
						logChainStep('"' + label + '": etapa no popup', { url: iframe.contentWindow.location.href, estado: result.state });
					}
					if (result.state === "ready") {
						finish(null, doc);
					} else if (result.state === "show") {
						reveal();
					} else if (result.state === "fail") {
						finish(result.message || 'Não consegui abrir "' + label + '".');
					}
				}

				iframe.addEventListener("load", evaluate);
				iframe.src = url;
			})
			.catch(function (err) {
				if (cancelToken.cancelled) return;
				removeLoadingOverlay();
				removeActionModal();
				alert('Não foi possível abrir "' + label + '": ' + (err && err.message ? err.message : err));
				onComboStepFailed('Não consegui abrir "' + label + '" a partir desta tela.');
			});
	}

	function startNewPreferenceCaptureCustom(label) {
		openCustomAction(label, "capture", null, function (doc, ctx, iframe) {
			// Documento ATUAL do popup no momento de salvar (a tela pode ter
			// sido recarregada pelo próprio Projudi enquanto o usuário
			// preenchia).
			showCaptureToolbar(
				label,
				function () {
					try {
						return iframe.contentDocument || doc;
					} catch (err) {
						return doc;
					}
				},
				function () {
					return ctx.extra;
				}
			);
		});
	}

	function applyPreferenceCustom(label, pref, editing) {
		const custom = getCustomAction(label);
		openCustomAction(label, editing ? "edit" : "apply", pref, function (doc, ctx, iframe) {
			const fieldNames = pref.fields.map(function (f) {
				return f.name;
			}).filter(Boolean);
			const form = findCustomForm(label, doc) || findFormContainingFieldNamesIn(doc, fieldNames) || findLikelyDialogFormIn(doc);
			if (!form) {
				alert('Carreguei "' + label + '", mas não encontrei o formulário para preencher automaticamente. Preencha manualmente.');
				return;
			}
			showFillingBar(label, pref);
			fillFormFields(form, pref.fields, function (missing) {
				removeConfirmBar();
				if (editing) {
					warnMissingFields(label, pref, missing);
					// Mantém os dados extras da preferência (ex.: a modalidade),
					// salvo se o usuário escolheu outros nesta abertura.
					showCaptureToolbar(
						label,
						function () {
							try {
								return iframe.contentDocument || doc;
							} catch (err) {
								return doc;
							}
						},
						function () {
							const kept = {};
							Object.keys(pref).forEach(function (key) {
								if (["id", "name", "fields", "createdAt", "updatedAt"].indexOf(key) === -1) kept[key] = pref[key];
							});
							return Object.assign(kept, ctx.extra);
						},
						pref
					);
				} else if (!custom || custom.confirmAfterApply !== false) {
					showConfirmBar(label, pref, form, missing);
				} else {
					warnMissingFields(label, pref, missing);
				}
			});
		});
	}

	// -------------------------------------------------------------------
	// Combos de preferências
	//
	// Um combo é uma lista ORDENADA de preferências já salvas (de qualquer
	// ação do painel, e também do "📎 Juntar Documento" — ver
	// juntarDocumento.js), executadas uma depois da outra. O editor mostra uma
	// caixa por etapa: na 1ª o usuário escolhe a preferência que roda
	// primeiro; "+ Adicionar preferência" cria a caixa seguinte, e assim por
	// diante. Guardados em chrome.storage.local, em COMBOS_KEY:
	//   [{ id, name, steps: [{ label, prefId }], createdAt, updatedAt }]
	// A etapa guarda só a referência (ação + id): editar a preferência
	// depois vale também para o combo.
	//
	// Execução: cada etapa é a mesma "★ preferência" de sempre, sempre no
	// popup desta extensão (applyPreferenceViaChain/applyPreferenceCustom),
	// com a mesma confirmação "Sim, executar" — o combo nunca confirma um
	// ato processual sozinho. Quando o popup da etapa fecha depois de
	// executada (o usuário clicou em "Sim, executar", ou o próprio Projudi
	// sinalizou o fim da ação — ver removeActionModal), a próxima etapa
	// abre sozinha. Se o popup fechar sem execução (✕ Fechar, Cancelar,
	// erro), a barra do combo pergunta: repetir, ir para a próxima ou parar.
	//
	// Ao terminar uma ação, o Projudi/esta extensão recarregam a tela do
	// processo (checkFlagClosePopup) — por isso o andamento fica no
	// sessionStorage (só esta aba, compartilhado pelos frames da mesma
	// origem), em COMBO_RUN_KEY:
	//   { comboId, name, steps: [{ label, prefId, prefName }], index,
	//     phase: "pending" | "running" | "waiting", numero, startedAt }
	// e a instância da página recarregada continua da etapa "pending".
	//
	// Etapa "Juntar Documento": não usa o popup — a juntada navega a
	// própria aba (tela Juntar Documento → Inserir Arquivo → ... →
	// "Concluir Movimento"), conduzida por juntarDocumento.js, que marca
	// COMBO_JUNTAR_DONE_KEY no "Concluir Movimento". De volta à tela do
	// processo, maybeResumeCombo vê a marca e segue para a próxima etapa.
	// -------------------------------------------------------------------

	const COMBOS_KEY = "pdpPreferenceCombos";
	const COMBO_RUN_KEY = "pdpComboRun";
	const COMBO_RUN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
	const COMBO_NEXT_STEP_DELAY_MS = 900;
	const COMBO_RESUME_DELAY_MS = 1500;
	const COMBO_EDITOR_ID = "pdp-qa-combo-editor";
	const COMBO_BAR_ID = "pdp-qa-combo-bar";
	const JUNTAR_LABEL = "Juntar Documento"; // preferências em JUNTAR_PREFS_KEY (topo)
	const COMBO_JUNTAR_DONE_KEY = "pdpComboJuntadaConcluida"; // idem
	const COMBO_JUNTAR_CONCLUIR_KEY = "pdpComboJuntadaConcluir"; // idem
	let comboResumeChecked = false;

	function loadCombos() {
		return chrome.storage.local.get([COMBOS_KEY]).then(function (data) {
			return data[COMBOS_KEY] || [];
		});
	}

	function saveCombos(combos) {
		return chrome.storage.local.set({ [COMBOS_KEY]: combos });
	}

	// Inclui (sem `id`) ou substitui (mesmo `id`) um combo.
	function saveCombo(combo) {
		return loadCombos().then(function (combos) {
			if (combo.id) {
				combos = combos.map(function (c) {
					return c.id === combo.id ? Object.assign({}, c, combo, { updatedAt: Date.now() }) : c;
				});
			} else {
				combos.push(Object.assign({}, combo, { id: "c" + Date.now() + Math.random().toString(36).slice(2, 7), createdAt: Date.now() }));
			}
			return saveCombos(combos);
		});
	}

	function removeCombo(id) {
		return loadCombos().then(function (combos) {
			return saveCombos(
				combos.filter(function (c) {
					return c.id !== id;
				})
			);
		});
	}

	// Todas as preferências que podem entrar num combo, por rótulo da ação:
	// as das Ações rápidas e as do "Juntar Documento" (em JUNTAR_LABEL).
	function loadComboPreferences() {
		return Promise.all([loadAllPreferences(), chrome.storage.local.get([JUNTAR_PREFS_KEY])]).then(function (data) {
			const all = Object.assign({}, data[0]);
			const juntar = data[1][JUNTAR_PREFS_KEY];
			if (Array.isArray(juntar) && juntar.length) all[JUNTAR_LABEL] = juntar;
			return all;
		});
	}

	// Todas as preferências salvas, na ordem dos grupos do painel, depois o
	// "Juntar Documento" (ações desconhecidas — de versões antigas — no
	// fim): [{ label, pref }].
	function flattenPreferences(all) {
		const labels = [];
		ACTION_GROUPS.forEach(function (group) {
			group.actions.forEach(function (label) {
				if (labels.indexOf(label) === -1) labels.push(label);
			});
		});
		labels.push(JUNTAR_LABEL);
		Object.keys(all).forEach(function (label) {
			if (labels.indexOf(label) === -1) labels.push(label);
		});
		const items = [];
		labels.forEach(function (label) {
			(all[label] || []).forEach(function (pref) {
				items.push({ label: label, pref: pref });
			});
		});
		return items;
	}

	function findPref(all, step) {
		return (all[step.label] || []).filter(function (p) {
			return p.id === step.prefId;
		})[0] || null;
	}

	function describeComboSteps(steps, all) {
		return steps
			.map(function (step, i) {
				const pref = all ? findPref(all, step) : null;
				const name = pref ? pref.name : step.prefName || "(preferência removida)";
				return i + 1 + ". " + step.label + " — ★ " + name;
			})
			.join("\n");
	}

	function numeroProcessoAtual() {
		const el = document.querySelector("em.attention");
		const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((el ? el.textContent : "") + " " + (document.title || ""));
		return match ? match[0] : null;
	}

	// --- Andamento (sessionStorage) ------------------------------------

	function readComboRun() {
		try {
			return JSON.parse(sessionStorage.getItem(COMBO_RUN_KEY) || "null");
		} catch (err) {
			return null;
		}
	}

	function writeComboRun(run) {
		try {
			sessionStorage.setItem(COMBO_RUN_KEY, JSON.stringify(run));
		} catch (err) {
			console.error("[Projudi Ações Rápidas] não foi possível gravar o andamento do combo:", err);
		}
	}

	function clearComboRun() {
		try {
			sessionStorage.removeItem(COMBO_RUN_KEY);
		} catch (err) {
			// sem sessionStorage: nada a limpar
		}
	}

	function comboStepCaption(run) {
		run = run || readComboRun();
		if (!run) return "";
		return 'Combo "' + run.name + '" — etapa ' + Math.min(run.index + 1, run.steps.length) + " de " + run.steps.length;
	}

	// --- Barra do combo --------------------------------------------------

	function removeComboBar() {
		const el = document.getElementById(COMBO_BAR_ID);
		if (el) el.remove();
		document.documentElement.classList.remove("pdp-qa-combo-active");
	}

	// Mantém a barra acima do popup da etapa (mesma camada, mais ao fim do
	// <body>).
	function bringComboBarToFront() {
		const el = document.getElementById(COMBO_BAR_ID);
		if (el) document.body.appendChild(el);
	}

	// `message` (opcional): aviso sobre a etapa atual. Fora da fase
	// "pending" (a etapa está abrindo), a barra oferece Repetir/Próxima —
	// também quando a etapa não chegou a abrir (erro, "Cancelar" no
	// "Abrindo…").
	function renderComboBar(message) {
		const run = readComboRun();
		removeComboBar();
		if (!run) return;
		const step = run.steps[run.index];
		const bar = document.createElement("div");
		bar.id = COMBO_BAR_ID;
		bar.className = "pdp-qa-combo-bar";

		const text = document.createElement("div");
		text.className = "pdp-qa-combo-bar-text";
		const title = document.createElement("strong");
		title.textContent = "🔗 " + comboStepCaption(run) + (step ? ": " + step.label + " — ★ " + step.prefName : "");
		text.appendChild(title);
		if (message) {
			const msg = document.createElement("span");
			msg.className = "pdp-qa-combo-bar-msg";
			msg.textContent = message;
			text.appendChild(msg);
		}
		bar.appendChild(text);
		bar.title = describeComboSteps(run.steps);

		function addButton(caption, tip, onClick) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = caption;
			btn.title = tip;
			btn.addEventListener("click", onClick);
			bar.appendChild(btn);
		}
		if (run.phase !== "pending") {
			addButton("↻ Repetir etapa", "Abrir de novo esta etapa", function () {
				restartComboStep(0);
			});
			addButton(
				"⏭ Próxima etapa",
				run.phase === "running" ? "Fechar esta etapa sem executá-la e abrir a próxima" : "Considerar esta etapa concluída (ou pulá-la) e abrir a próxima",
				function () {
					restartComboStep(1);
				}
			);
		}
		addButton("⏹ Parar combo", "Encerrar o combo (as etapas já executadas continuam valendo)", stopCombo);
		document.body.appendChild(bar);
		// Espaço no fim da página para a barra não cobrir botões nativos
		// (ex.: "Concluir Movimento" da tela Juntar Documento).
		document.documentElement.classList.add("pdp-qa-combo-active");
	}

	// --- Execução --------------------------------------------------------

	function startCombo(combo) {
		if (readComboRun() && !confirm("Já há um combo em andamento nesta aba. Encerrá-lo e iniciar \"" + combo.name + '"?')) return;
		loadComboPreferences().then(function (all) {
			const missing = combo.steps.filter(function (step) {
				return !findPref(all, step);
			});
			if (missing.length) {
				alert(
					'O combo "' + combo.name + '" usa preferência(s) que não existem mais:\n' +
						missing
							.map(function (step) {
								return "- " + step.label;
							})
							.join("\n") +
						"\n\nEdite o combo (✏️) e escolha outra preferência para essa(s) etapa(s)."
				);
				return;
			}
			abandonComboStep();
			writeComboRun({
				comboId: combo.id,
				name: combo.name,
				steps: combo.steps.map(function (step) {
					return { label: step.label, prefId: step.prefId, prefName: findPref(all, step).name };
				}),
				index: 0,
				phase: "pending",
				numero: numeroProcessoAtual(),
				startedAt: Date.now(),
			});
			logChainStep('combo "' + combo.name + '" iniciado', { etapas: combo.steps.length });
			runPendingComboStep();
		});
	}

	// Ponto de partida de uma etapa para resolveDialogUrl: a aba
	// Movimentações lida em segundo plano, ou a própria tela de Ações (o
	// combo sempre usa o popup, para saber quando a etapa termina — a
	// origem "tela de Ações" dá a URL direto do link nativo); sem nenhuma,
	// a tela atual.
	function comboOrigem(screen) {
		if (screen.eventsDoc) return { doc: screen.eventsDoc, url: window.location.href };
		if (isOnAcoesScreen()) return { doc: document, url: window.location.href };
		return undefined;
	}

	function runPendingComboStep() {
		const run = readComboRun();
		if (!run || run.phase !== "pending") return;
		if (run.index >= run.steps.length) {
			finishCombo(run);
			return;
		}
		const step = run.steps[run.index];
		// Marca antes de qualquer espera: outro frame/instância não abre a
		// mesma etapa de novo.
		run.phase = "running";
		writeComboRun(run);
		Promise.all([loadComboPreferences(), prepareComboScreen(step)]).then(function (data) {
			const pref = findPref(data[0], step);
			const screen = data[1];
			if (!pref) {
				setComboWaiting('A preferência "' + step.prefName + '" não existe mais. Pule esta etapa ou pare o combo.');
				return;
			}
			if (screen.navigate) {
				navigateForCombo(screen.navigate, screen.message);
				return;
			}
			if (screen.fail) {
				setComboWaiting(screen.fail);
				return;
			}
			const current = readComboRun();
			if (current && current.hops) {
				current.hops = 0;
				writeComboRun(current);
			}
			logChainStep("combo: abrindo etapa " + (run.index + 1), { acao: step.label, preferencia: pref.name, abaLidaEmSegundoPlano: !!screen.eventsDoc });
			if (step.label === JUNTAR_LABEL) {
				startJuntarStep(pref);
				return;
			}
			comboStep = { confirmed: false, iframe: null };
			renderComboBar();
			if (getCustomAction(step.label)) {
				applyPreferenceCustom(step.label, pref);
			} else {
				applyPreferenceViaChain(step.label, pref, false, comboOrigem(screen));
			}
		});
	}

	// --- Preparo da tela para uma etapa ----------------------------------
	//
	// Cada etapa precisa de um ponto de partida: as ações do painel, da
	// lista de movimentações (ou da tela de Ações); o "Juntar Documento",
	// do botão nativo da tela do processo; o "Alvará Eletrônico", do
	// formulário do processo. Uma etapa anterior pode terminar noutra tela
	// — o "Concluir Movimento" da juntada para numa tela com "Voltar para o
	// Processo", e esse botão abre o processo na aba "Informações Gerais",
	// sem a lista de movimentações. Por isso, antes de abrir a etapa:
	// 1. se a tela já serve, abre direto;
	// 2. na tela do processo, noutra aba: lê a aba "Movimentações" em
	//    segundo plano (__pdpLerAbaProcesso, de habilitarAdvogado.js — a
	//    mesma leitura validada para "Partes e Outros") e usa as
	//    movimentações dela; se não der, abre a aba Movimentações pelo
	//    próprio item de aba do Projudi (navega) e continua lá;
	// 3. fora da tela do processo: clica (navega) no "Voltar para o
	//    Processo" e continua lá.
	// Navegações seguidas sem conseguir abrir a etapa são limitadas
	// (COMBO_MAX_HOPS) para nunca entrar em laço.

	const MOVIMENTACOES_TAB_ID = "tabMovimentacoesProcesso";
	const COMBO_MAX_HOPS = 3;
	const COMBO_MAX_AUTO_RETRIES = 2;
	const COMBO_NAVIGATION_FALLBACK_MS = 6000;

	function hasProcessoForm() {
		return !!document.getElementById("processoForm");
	}

	// Item de aba nativo "Movimentações" (onclick com setTab(...)).
	function findMovimentacoesTab() {
		return Array.prototype.find.call(document.querySelectorAll("[onclick]"), function (el) {
			const onclick = el.getAttribute("onclick") || "";
			return /setTab\(/.test(onclick) && onclick.indexOf(MOVIMENTACOES_TAB_ID) !== -1;
		}) || null;
	}

	// "Voltar para o Processo" (document.location.href='/projudi/processo.do?_tj=...').
	function findBackToProcessUrl() {
		const candidates = [document.getElementById("backButton")].concat(Array.prototype.slice.call(document.querySelectorAll('input[type="button"], button')));
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			if (!el) continue;
			const text = (el.value || el.textContent || "").replace(/\s+/g, " ").trim();
			if (el.id !== "backButton" && !/^Voltar para o Processo$/i.test(text)) continue;
			const url = extractUrlFromOnclick(el.getAttribute("onclick"), window.location.href);
			if (!url) continue;
			try {
				const parsed = new URL(url);
				if (parsed.origin === window.location.origin && /\/processo\.do$/.test(parsed.pathname)) return url;
			} catch (err) {
				// URL inválida: tenta o próximo
			}
		}
		return null;
	}

	// Resolve com { eventsDoc? } (pode abrir), { navigate, message } (ir
	// para outra tela antes) ou { fail } (sem saída automática).
	function prepareComboScreen(step) {
		const backUrl = hasProcessoForm() ? null : findBackToProcessUrl();
		function goBackOr(fail) {
			return backUrl ? { navigate: { url: backUrl }, message: "Voltando para a tela do processo…" } : { fail: fail };
		}

		if (step.label === JUNTAR_LABEL) {
			const api = window.__pdpJuntarDocumentoApi;
			if (api && api.available()) return Promise.resolve({});
			return Promise.resolve(goBackOr('Abra a tela do processo (com o botão "Juntar Documento") e clique em "Repetir etapa".'));
		}
		if (getCustomAction(step.label)) {
			return Promise.resolve(hasProcessoForm() ? {} : goBackOr("Abra a tela do processo e clique em \"Repetir etapa\"."));
		}
		if (isOnAcoesScreen() || findMovimentarButton() || findLatestValidEventLink()) return Promise.resolve({});
		if (!hasProcessoForm()) return Promise.resolve(goBackOr('Abra a aba "Movimentações" do processo e clique em "Repetir etapa".'));

		function openTabOr(fail) {
			const tab = findMovimentacoesTab();
			return tab ? { navigate: { element: tab }, message: 'Abrindo a aba "Movimentações"…' } : { fail: fail };
		}
		if (!window.__pdpLerAbaProcesso) return Promise.resolve(openTabOr('Abra a aba "Movimentações" e clique em "Repetir etapa".'));
		renderComboBar('Lendo a aba "Movimentações" em segundo plano…');
		return window.__pdpLerAbaProcesso(MOVIMENTACOES_TAB_ID, "Movimentações")
			.then(function (aba) {
				if (findLatestValidEventLinkIn(aba.doc)) return { eventsDoc: aba.doc };
				logChainStep("combo: aba Movimentações lida em segundo plano, mas sem movimentações válidas", null);
				return openTabOr('Não encontrei movimentações neste processo. Abra a aba "Movimentações" e clique em "Repetir etapa".');
			})
			.catch(function (err) {
				logChainStep("combo: falhou a leitura da aba Movimentações em segundo plano", String(err));
				return openTabOr('Não consegui ler a aba "Movimentações" (' + (err && err.message ? err.message : err) + '). Abra-a e clique em "Repetir etapa".');
			});
	}

	// Navega (Voltar para o Processo / aba Movimentações) com a etapa ainda
	// pendente: a página nova continua o combo (maybeResumeCombo).
	function navigateForCombo(target, message) {
		const run = readComboRun();
		if (!run) return;
		run.hops = (run.hops || 0) + 1;
		if (run.hops > COMBO_MAX_HOPS) {
			run.hops = 0;
			writeComboRun(run);
			setComboWaiting('Não consegui chegar a uma tela de onde abrir esta etapa. Abra a aba "Movimentações" do processo e clique em "Repetir etapa".');
			return;
		}
		run.phase = "pending";
		writeComboRun(run);
		renderComboBar(message);
		logChainStep("combo: " + message, { destino: target.url || "item de aba Movimentações", tentativa: run.hops });
		pageReloading = true;
		if (target.element) target.element.click();
		else window.location.href = target.url;
		// Se a página não foi trocada (ex.: aba carregada sem recarregar a
		// tela), continua daqui mesmo.
		setTimeout(function () {
			pageReloading = false;
			runPendingComboStep();
		}, COMBO_NAVIGATION_FALLBACK_MS);
	}

	// Uma etapa não chegou a abrir o popup (resolução falhou, "Cancelar"
	// no "Abrindo…"): a barra pergunta como seguir.
	function onComboStepFailed(message) {
		if (!comboStep || comboStep.iframe) return;
		comboStep = null;
		setComboWaiting(message);
	}

	// Etapa "Juntar Documento": a juntada navega esta aba; o combo continua
	// quando a tela do processo voltar (ver maybeResumeCombo).
	function startJuntarStep(pref) {
		const api = window.__pdpJuntarDocumentoApi;
		if (!api) {
			setComboWaiting('"Juntar Documento" não está disponível nesta tela (só no Projudi, com o processo aberto).');
			return;
		}
		try {
			sessionStorage.removeItem(COMBO_JUNTAR_DONE_KEY);
			sessionStorage.removeItem(COMBO_JUNTAR_CONCLUIR_KEY);
		} catch (err) {
			// sem marca antiga a limpar
		}
		renderComboBar('Abrindo "Juntar Documento"… A juntada segue sozinha até o "Concluir Movimento" (assine quando o assinador pedir).');
		if (!api.start(pref)) setComboWaiting('Não consegui abrir "Juntar Documento" nesta tela. Abra a tela do processo e clique em "Repetir etapa".');
	}

	// A juntada da etapa terminou: confirmada pela tela "Dados registrados
	// com sucesso" (juntarDocumento.js marca COMBO_JUNTAR_DONE_KEY), ou —
	// se o Projudi voltar direto à tela do processo depois do "Concluir
	// Movimento" — pela chegada a esta tela com o clique anotado.
	function juntarStepDone() {
		try {
			if (sessionStorage.getItem(COMBO_JUNTAR_DONE_KEY)) {
				sessionStorage.removeItem(COMBO_JUNTAR_DONE_KEY);
				sessionStorage.removeItem(COMBO_JUNTAR_CONCLUIR_KEY);
				return true;
			}
			if (sessionStorage.getItem(COMBO_JUNTAR_CONCLUIR_KEY) && hasProcessoForm()) {
				sessionStorage.removeItem(COMBO_JUNTAR_CONCLUIR_KEY);
				return true;
			}
			return false;
		} catch (err) {
			return false;
		}
	}

	function juntarJobActive() {
		const api = window.__pdpJuntarDocumentoApi;
		return !!(api && api.hasActiveJob());
	}

	// O popup da etapa atual fechou (ver removeActionModal).
	function onComboStepModalClosed(reason) {
		const step = comboStep;
		comboStep = null;
		const executed = step.confirmed || reason === "auto";
		logChainStep("combo: popup da etapa fechado", { motivo: reason || null, executada: executed });
		if (executed) {
			advanceCombo();
		} else {
			setComboWaiting('O popup da etapa foi fechado sem o "Sim, executar". Se ela foi concluída, clique em "Próxima etapa"; senão, em "Repetir etapa".');
		}
	}

	function setComboWaiting(message) {
		const run = readComboRun();
		if (!run) return;
		run.phase = "waiting";
		writeComboRun(run);
		renderComboBar(message);
	}

	function advanceCombo() {
		const run = readComboRun();
		if (!run) return;
		run.index++;
		run.retries = 0;
		// Com a tela recarregando, o aviso de conclusão fica para a página
		// nova (runPendingComboStep chama finishCombo).
		if (run.index >= run.steps.length && !pageReloading) {
			finishCombo(run);
			return;
		}
		run.phase = "pending";
		writeComboRun(run);
		renderComboBar("Etapa anterior concluída. Abrindo a próxima…");
		// Se a tela está sendo recarregada, a página nova continua daqui
		// (ver maybeResumeCombo).
		if (!pageReloading) setTimeout(runPendingComboStep, COMBO_NEXT_STEP_DELAY_MS);
	}

	// Desliga a etapa em andamento deste frame sem tratá-la como fechada.
	function abandonComboStep() {
		const step = comboStep;
		comboStep = null;
		if (step && step.iframe && activeModalIframe === step.iframe) removeActionModal("manual");
	}

	// `offset`: 0 repete a etapa atual; 1 vai para a próxima.
	function restartComboStep(offset) {
		const run = readComboRun();
		if (!run) return;
		abandonComboStep();
		abandonJuntarStep(run);
		removeLoadingOverlay();
		run.index += offset;
		if (run.index >= run.steps.length) {
			finishCombo(run);
			return;
		}
		run.phase = "pending";
		writeComboRun(run);
		runPendingComboStep();
	}

	// Encerra o acompanhamento de uma juntada aberta pela etapa atual.
	function abandonJuntarStep(run) {
		const step = run && run.steps[run.index];
		const api = window.__pdpJuntarDocumentoApi;
		if (step && step.label === JUNTAR_LABEL && api && api.hasActiveJob()) api.cancel();
	}

	function stopCombo() {
		abandonComboStep();
		abandonJuntarStep(readComboRun());
		clearComboRun();
		removeComboBar();
		logChainStep("combo encerrado pelo usuário", null);
	}

	function finishCombo(run) {
		clearComboRun();
		removeComboBar();
		logChainStep('combo "' + run.name + '" concluído', null);
		const bar = document.createElement("div");
		bar.id = COMBO_BAR_ID;
		bar.className = "pdp-qa-combo-bar pdp-qa-combo-bar-done";
		bar.textContent = '✅ Combo "' + run.name + '" concluído (' + run.steps.length + " etapas).";
		document.body.appendChild(bar);
		setTimeout(function () {
			if (bar.isConnected) bar.remove();
		}, 5000);
	}

	// Na primeira vez que a fileira de botões aparece nesta página, continua
	// um combo em andamento nesta aba (a tela foi recarregada ao fim de uma
	// etapa) — ver reconcile.
	function maybeResumeCombo() {
		if (comboResumeChecked || !row || !row.isConnected) return;
		comboResumeChecked = true;
		if (insideHelperFrame()) return;
		const run = readComboRun();
		if (!run) return;
		if (Date.now() - (run.startedAt || 0) > COMBO_RUN_MAX_AGE_MS) {
			clearComboRun();
			return;
		}
		const numero = numeroProcessoAtual();
		if (run.numero && numero && run.numero !== numero) {
			// Outro processo aberto nesta aba: não executa nada aqui.
			run.phase = "waiting";
			writeComboRun(run);
			renderComboBar("Este combo foi iniciado no processo " + run.numero + ". Volte a ele para continuar, ou pare o combo.");
			return;
		}
		const step = run.steps[run.index];
		if (run.phase === "running" && step && step.label === JUNTAR_LABEL) {
			if (juntarStepDone()) {
				// Voltou do "Concluir Movimento": segue como etapa executada.
				run.index++;
				run.phase = "pending";
				writeComboRun(run);
			} else if (juntarJobActive()) {
				// Ainda nas telas da juntada.
				renderComboBar('Juntada em andamento — o combo continua depois do "Concluir Movimento".');
				return;
			} else {
				setComboWaiting('A juntada não chegou ao "Concluir Movimento" pelo combo. Se ela foi concluída, clique em "Próxima etapa"; senão, em "Repetir etapa".');
				return;
			}
		}
		// Etapa (do popup) interrompida pela troca de tela antes do "Sim,
		// executar": nada foi executado, então é reaberta sozinha (ela só
		// abre e preenche) — no máximo COMBO_MAX_AUTO_RETRIES vezes.
		if (run.phase === "running" && step && step.label !== JUNTAR_LABEL && (run.retries || 0) < COMBO_MAX_AUTO_RETRIES) {
			run.retries = (run.retries || 0) + 1;
			run.phase = "pending";
			writeComboRun(run);
			logChainStep("combo: etapa interrompida pela troca de tela — reabrindo", { etapa: run.index + 1, tentativa: run.retries });
		}
		if (run.phase === "pending") {
			renderComboBar(run.index < run.steps.length ? "Continuando o combo…" : "");
			setTimeout(runPendingComboStep, COMBO_RESUME_DELAY_MS);
		} else {
			setComboWaiting(run.phase === "running" ? "A tela mudou enquanto esta etapa estava aberta." : "");
		}
	}

	// Páginas carregadas nos iframes auxiliares (os ocultos de fetchDoc e
	// de outros recursos, e os diálogos dentro do popup) também rodam este
	// script — nelas um combo nunca é retomado.
	function insideHelperFrame() {
		let win = window;
		try {
			while (win.frameElement) {
				const frame = win.frameElement;
				if (frame.classList.contains("pdp-qa-fetch-iframe") || frame.classList.contains("pdp-qa-modal-iframe")) return true;
				const rect = frame.getBoundingClientRect();
				if (rect.right <= 0 || rect.bottom <= 0 || rect.width === 0 || rect.height === 0) return true;
				win = win.parent;
			}
		} catch (err) {
			// frame de outra origem acima: não é um iframe auxiliar desta extensão
		}
		return false;
	}

	// --- Editor (caixas de etapas) ---------------------------------------

	function closeComboEditor() {
		const el = document.getElementById(COMBO_EDITOR_ID);
		if (el) el.remove();
	}

	// `existing`: combo a editar (✏️); sem ele, um combo novo.
	function openComboEditor(existing) {
		closePanel();
		loadComboPreferences().then(function (all) {
			const items = flattenPreferences(all);
			if (!items.length) {
				alert('Ainda não há preferências salvas. Crie-as primeiro com "+ Nova preferência" nas ações do painel e depois monte o combo.');
				return;
			}
			// Índice em `items` escolhido em cada caixa (-1 = nada/removida).
			let slots = existing
				? existing.steps.map(function (step) {
						return items.findIndex(function (item) {
							return item.label === step.label && item.pref.id === step.prefId;
						});
					})
				: [-1];

			closeComboEditor();
			const backdrop = document.createElement("div");
			backdrop.id = COMBO_EDITOR_ID;
			backdrop.className = "pdp-qa-combo-backdrop";
			backdrop.innerHTML =
				'<div class="pdp-qa-combo-box">' +
				'<div class="pdp-qa-modal-header"><span>' +
				(existing ? "Editar combo de preferências" : "Novo combo de preferências") +
				'</span><button type="button" class="pdp-qa-modal-close">✕ Fechar</button></div>' +
				'<div class="pdp-qa-combo-body">' +
				'<p class="pdp-qa-combo-help">Escolha na 1ª caixa a preferência que deve ser executada primeiro. Depois use "+ Adicionar preferência" para a próxima, e assim por diante. Ao usar o combo, cada etapa abre já preenchida e pede a confirmação de sempre ("Sim, executar"; no Juntar Documento, a assinatura); executada uma, a seguinte abre sozinha.</p>' +
				'<label class="pdp-qa-combo-name">Nome do combo <input type="text" maxlength="80"></label>' +
				'<div class="pdp-qa-combo-steps"></div>' +
				'<button type="button" class="pdp-qa-combo-add">+ Adicionar preferência</button>' +
				"</div>" +
				'<div class="pdp-qa-combo-footer">' +
				'<button type="button" class="pdp-qa-combo-save">💾 Salvar combo</button>' +
				'<button type="button" class="pdp-qa-combo-cancel">Cancelar</button>' +
				"</div>" +
				"</div>";
			document.body.appendChild(backdrop);

			const removed = slots.filter(function (v) {
				return v < 0;
			}).length;
			if (existing && removed) {
				const warn = document.createElement("div");
				warn.className = "pdp-qa-note";
				warn.textContent = removed + " etapa(s) deste combo usava(m) uma preferência que foi removida — escolha outra na caixa vazia ou remova a caixa com ✕.";
				backdrop.querySelector(".pdp-qa-combo-help").after(warn);
			}

			const nameInput = backdrop.querySelector(".pdp-qa-combo-name input");
			nameInput.value = existing ? existing.name : "";
			const stepsWrap = backdrop.querySelector(".pdp-qa-combo-steps");
			const addBtn = backdrop.querySelector(".pdp-qa-combo-add");

			function buildSelect(slotIndex) {
				const select = document.createElement("select");
				select.className = "pdp-qa-combo-select";
				const placeholder = document.createElement("option");
				placeholder.value = "-1";
				placeholder.textContent = "— escolha uma preferência —";
				select.appendChild(placeholder);
				let group = null;
				items.forEach(function (item, i) {
					if (!group || group.label !== item.label) {
						group = document.createElement("optgroup");
						group.label = item.label;
						select.appendChild(group);
					}
					const option = document.createElement("option");
					option.value = String(i);
					option.textContent = "★ " + item.pref.name;
					group.appendChild(option);
				});
				select.value = String(slots[slotIndex]);
				// Ação da preferência escolhida, acima da lista (o nome da
				// preferência sozinho nem sempre diz de qual ação ela é).
				const wrap = document.createElement("div");
				wrap.className = "pdp-qa-combo-select-wrap";
				const action = document.createElement("span");
				action.className = "pdp-qa-combo-step-action";
				function showAction() {
					const item = items[slots[slotIndex]];
					action.textContent = item ? item.label : "Preferência";
				}
				showAction();
				select.addEventListener("change", function () {
					slots[slotIndex] = parseInt(select.value, 10);
					showAction();
					updateAddButton();
				});
				wrap.appendChild(action);
				wrap.appendChild(select);
				return wrap;
			}

			function moveSlot(from, to) {
				const moved = slots.splice(from, 1)[0];
				slots.splice(to, 0, moved);
				renderSlots();
			}

			function renderSlots() {
				stepsWrap.innerHTML = "";
				slots.forEach(function (value, i) {
					const box = document.createElement("div");
					box.className = "pdp-qa-combo-step";

					const num = document.createElement("span");
					num.className = "pdp-qa-combo-step-num";
					num.textContent = String(i + 1);
					num.title = i === 0 ? "Executada primeiro" : "Executada depois da etapa " + i;
					box.appendChild(num);

					box.appendChild(buildSelect(i));

					const tools = document.createElement("span");
					tools.className = "pdp-qa-combo-step-tools";
					[
						{ text: "↑", tip: "Executar antes", disabled: i === 0, fn: function () { moveSlot(i, i - 1); } },
						{ text: "↓", tip: "Executar depois", disabled: i === slots.length - 1, fn: function () { moveSlot(i, i + 1); } },
						{
							text: "✕",
							tip: "Remover esta etapa",
							disabled: slots.length === 1,
							fn: function () {
								slots.splice(i, 1);
								renderSlots();
							},
						},
					].forEach(function (spec) {
						const btn = document.createElement("button");
						btn.type = "button";
						btn.textContent = spec.text;
						btn.title = spec.tip;
						btn.disabled = spec.disabled;
						btn.addEventListener("click", spec.fn);
						tools.appendChild(btn);
					});
					box.appendChild(tools);
					stepsWrap.appendChild(box);
				});
				updateAddButton();
			}

			// Só cria a próxima caixa depois de escolhida a preferência da
			// última.
			function updateAddButton() {
				const last = slots[slots.length - 1];
				addBtn.disabled = last === undefined || last < 0;
				addBtn.title = addBtn.disabled ? "Escolha primeiro a preferência da última caixa" : "Adicionar a etapa " + (slots.length + 1);
			}

			addBtn.addEventListener("click", function () {
				slots.push(-1);
				renderSlots();
				const selects = stepsWrap.querySelectorAll("select");
				if (selects.length) selects[selects.length - 1].focus();
			});

			backdrop.querySelector(".pdp-qa-modal-close").addEventListener("click", closeComboEditor);
			backdrop.querySelector(".pdp-qa-combo-cancel").addEventListener("click", closeComboEditor);
			backdrop.addEventListener("click", function (event) {
				if (event.target === backdrop) closeComboEditor();
			});

			backdrop.querySelector(".pdp-qa-combo-save").addEventListener("click", function () {
				const name = nameInput.value.trim();
				if (!name) {
					alert("Dê um nome ao combo.");
					nameInput.focus();
					return;
				}
				if (slots.some(function (v) { return v < 0; })) {
					alert("Escolha a preferência de todas as caixas (ou remova as que sobraram com ✕).");
					return;
				}
				if (slots.length < 2) {
					alert("Um combo precisa de pelo menos 2 preferências. Use \"+ Adicionar preferência\".");
					return;
				}
				const combo = {
					name: name,
					steps: slots.map(function (v) {
						return { label: items[v].label, prefId: items[v].pref.id };
					}),
				};
				if (existing) combo.id = existing.id;
				saveCombo(combo)
					.then(function () {
						closeComboEditor();
						alert('Combo "' + name + '" ' + (existing ? "atualizado" : "salvo") + ". Use-o pelo botão \"🔗 Combos\".");
					})
					.catch(function (err) {
						alert("Não foi possível salvar o combo: " + (err && err.message ? err.message : err));
					});
			});

			renderSlots();
			nameInput.focus();
		});
	}

	// --- Painel "🔗 Combos" ----------------------------------------------

	function toggleCombosPanel() {
		if (activeGroupId === "combos") {
			closePanel();
			return;
		}
		closePanel();
		buildCombosPanel();
	}

	function buildCombosPanel() {
		activeGroupId = "combos";
		const activeBtn = panelButton("combos");
		if (activeBtn) activeBtn.classList.add("pdp-qa-active");
		activePanel = document.createElement("div");
		activePanel.className = "pdp-qa-panel";

		// Qualquer aba da tela do processo serve (ver prepareComboScreen).
		const canRun = isOnAcoesScreen() || !!findMovimentarButton() || !!findLatestValidEventLink() || hasProcessoForm() || !!findBackToProcessUrl();
		if (!canRun) {
			const note = document.createElement("div");
			note.className = "pdp-qa-empty";
			note.textContent = "Para usar um combo, abra a tela do processo. Aqui dá para criar e editar combos.";
			activePanel.appendChild(note);
		}

		const list = document.createElement("div");
		list.className = "pdp-qa-combo-list";
		activePanel.appendChild(list);

		const newBtn = document.createElement("button");
		newBtn.type = "button";
		newBtn.className = "pdp-qa-pref-new";
		newBtn.textContent = "+ Novo combo";
		newBtn.title = "Combinar preferências já salvas, para executá-las em sequência, na ordem escolhida";
		newBtn.addEventListener("click", function () {
			openComboEditor(null);
		});
		activePanel.appendChild(newBtn);

		document.body.appendChild(activePanel);
		positionPanel("combos");
		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onKeydown, true);
		}, 0);

		Promise.all([loadCombos(), loadComboPreferences()]).then(function (data) {
			if (activeGroupId !== "combos") return;
			renderCombos(list, data[0], data[1], canRun);
			positionPanel("combos");
		});
	}

	function renderCombos(list, combos, all, canRun) {
		list.innerHTML = "";
		if (!combos.length) {
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Nenhum combo ainda. Use "+ Novo combo" para combinar preferências já salvas.';
			list.appendChild(empty);
			return;
		}
		combos.forEach(function (combo) {
			const item = document.createElement("div");
			item.className = "pdp-qa-combo-item";

			const chip = document.createElement("span");
			chip.className = "pdp-qa-pref-chip";

			const runBtn = document.createElement("button");
			runBtn.type = "button";
			runBtn.className = "pdp-qa-pref-btn";
			runBtn.textContent = "▶ " + combo.name;
			runBtn.disabled = !canRun;
			runBtn.title = (canRun ? "Executar em sequência (cada etapa pede a confirmação de sempre):\n" : 'Abra a tela do processo para executar:\n') + describeComboSteps(combo.steps, all);
			runBtn.addEventListener("click", function () {
				closePanel();
				startCombo(combo);
			});
			chip.appendChild(runBtn);

			const editBtn = document.createElement("button");
			editBtn.type = "button";
			editBtn.className = "pdp-qa-pref-edit";
			editBtn.textContent = "✏️";
			editBtn.title = "Editar este combo (etapas, ordem e nome)";
			editBtn.addEventListener("click", function () {
				openComboEditor(combo);
			});
			chip.appendChild(editBtn);

			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "pdp-qa-pref-del";
			delBtn.textContent = "🗑";
			delBtn.title = "Remover este combo (as preferências continuam salvas)";
			delBtn.addEventListener("click", function () {
				if (!confirm('Remover o combo "' + combo.name + '"? As preferências dele continuam salvas.')) return;
				removeCombo(combo.id)
					.then(loadCombos)
					.then(function (updated) {
						renderCombos(list, updated, all, canRun);
					});
			});
			chip.appendChild(delBtn);
			item.appendChild(chip);

			const steps = document.createElement("div");
			steps.className = "pdp-qa-combo-item-steps";
			steps.textContent = combo.steps.length + " etapas: " + combo.steps
				.map(function (step) {
					const pref = findPref(all, step);
					return pref ? pref.name : "⚠ removida";
				})
				.join(" → ");
			item.appendChild(steps);
			list.appendChild(item);
		});
	}

	// -------------------------------------------------------------------
	// Botões flutuantes (um por grupo) e painéis
	// -------------------------------------------------------------------

	function ensureRow() {
		if (row && row.isConnected) return;
		if (!isOnProcessScreen()) return;

		closePanel();

		row = document.createElement("div");
		row.id = "pdp-qa-row";
		row.className = "pdp-qa-row";
		// O controlador compartilhado (buttonDrag.js) posiciona este grupo no
		// próximo frame. Mantê-lo oculto até lá evita que apareça por um
		// instante na posição padrão quando o Projudi recria trechos via AJAX.
		row.setAttribute("data-pdp-layout-pending", "");
		row.style.visibility = "hidden";

		const mainLine = document.createElement("div");
		mainLine.className = "pdp-qa-row-line";
		const secondLine = document.createElement("div");
		secondLine.className = "pdp-qa-row-line";

		ACTION_GROUPS.forEach(function (group) {
			if (group.custom && !location.pathname.startsWith("/projudi/")) return;
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "pdp-qa-group-btn";
			btn.dataset.groupId = group.id;
			btn.innerHTML =
				'<span class="pdp-qa-icon">' + group.icon +
				"</span><span>" + group.title + "</span>";
			btn.title = "Ações de " + group.title;
			btn.addEventListener("click", function () {
				togglePanel(group);
			});
			mainLine.appendChild(btn);
		});

		const optionsBtn = document.createElement("button");
		optionsBtn.type = "button";
		optionsBtn.id = "pdp-qa-options";
		optionsBtn.className = "pdp-qa-group-btn";
		optionsBtn.addEventListener("click", toggleRowExpanded);
		mainLine.appendChild(optionsBtn);

		if (location.pathname.startsWith("/projudi/")) {
			const clipboardBtn = document.createElement("button");
			clipboardBtn.type = "button";
			clipboardBtn.id = "pdp-clipboard-button";
			clipboardBtn.className = "pdp-qa-group-btn";
			clipboardBtn.textContent = "📋 Processo copiado";
			clipboardBtn.title = "Pesquisar em nova aba o número de processo da área de transferência";
			clipboardBtn.addEventListener("click", function () { window.__pdpClipboardProcess(); });
			secondLine.appendChild(clipboardBtn);
		}

		// Antes (à esquerda) do "Processo copiado": os botões irmãos
		// (habilitarAdvogado.js etc.) disputam a posição logo DEPOIS dele.
		const favBtn = document.createElement("button");
		favBtn.type = "button";
		favBtn.id = "pdp-fav-prefs-button";
		favBtn.className = "pdp-qa-group-btn";
		favBtn.innerHTML = '<span class="pdp-qa-icon">⭐</span><span>Minhas Preferências</span>';
		favBtn.title = "Todas as preferências salvas, num só lugar: escolha uma para acioná-la";
		favBtn.addEventListener("click", toggleFavPanel);
		secondLine.insertBefore(favBtn, secondLine.firstChild);

		const highlightPrefsBtn = document.createElement("button");
		highlightPrefsBtn.type = "button";
		highlightPrefsBtn.className = "pdp-qa-group-btn";
		highlightPrefsBtn.innerHTML = '<span class="pdp-qa-icon">🖍️</span><span>Destacar movimentações</span>';
		highlightPrefsBtn.title = "Escolher a cor de destaque de cada tipo de usuário na aba Movimentações";
		highlightPrefsBtn.addEventListener("click", function () {
			if (window.__pdpOpenMovementHighlightConfig) window.__pdpOpenMovementHighlightConfig();
		});
		secondLine.appendChild(highlightPrefsBtn);

		const combosBtn = document.createElement("button");
		combosBtn.type = "button";
		combosBtn.className = "pdp-qa-group-btn";
		combosBtn.dataset.panelId = "combos";
		combosBtn.innerHTML = '<span class="pdp-qa-icon">🔗</span><span>Combos</span>';
		combosBtn.title = "Combos de preferências: executar várias preferências salvas em sequência, na ordem escolhida";
		combosBtn.addEventListener("click", toggleCombosPanel);
		secondLine.appendChild(combosBtn);

		row.appendChild(mainLine);
		row.appendChild(secondLine);

		// Aplica o estado antes de exibir, evitando mostrar os atalhos
		// por um instante quando a preferência é mantê-los recolhidos.
		applyRowExpandedState();
		document.body.appendChild(row);
		repositionRow();
	}

	// Botão que abre o painel `id`: um grupo de ações (data-group-id) ou
	// o "🔗 Combos" (data-panel-id, que não é recolhido com os grupos).
	function panelButton(id) {
		return row ? row.querySelector('[data-group-id="' + id + '"], [data-panel-id="' + id + '"]') : null;
	}

	function closePanel() {
		if (activePanel) {
			activePanel.remove();
			activePanel = null;
		}
		if (activeGroupId === FAV_PANEL_ID && row) {
			const favBtn = row.querySelector("#pdp-fav-prefs-button");
			if (favBtn) favBtn.classList.remove("pdp-qa-active");
		} else if (activeGroupId && row) {
			const prevBtn = panelButton(activeGroupId);
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
		let mode; // 'ready' | 'hop' | 'custom' | 'unreachable'

		if (group.custom) {
			mode = "custom";
			actionsToRender = group.actions.filter(function (label) {
				return !!getCustomAction(label);
			});
			if (!actionsToRender.length) {
				const empty = document.createElement("div");
				empty.className = "pdp-qa-empty";
				empty.textContent = 'O atalho "' + group.title + '" não está disponível nesta tela.';
				activePanel.appendChild(empty);
			}
		} else if (isOnAcoesScreen()) {
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
			if (mode === "custom") {
				openCustomAction(label, "open", null, null);
			} else if (mode === "hop") {
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
			if (mode === "custom") {
				removeConfirmBar();
				startNewPreferenceCaptureCustom(label);
			} else if (mode === "hop") {
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
			applyBtn.title =
				(mode === "custom"
					? 'Abre "' + label + '" já preenchido com esta preferência'
					: 'Preenche automaticamente e pede 1 confirmação para executar "' + label + '"') +
				(pref.descricao ? "\n" + pref.descricao : "");
			applyBtn.addEventListener("click", function () {
				if (mode === "custom") {
					closePanel();
					removeCaptureToolbar();
					applyPreferenceCustom(label, pref);
				} else if (mode === "hop") {
					closePanel();
					applyPreferenceViaChain(label, pref);
				} else {
					applyPreference(label, pref);
				}
			});
			chip.appendChild(applyBtn);

			const editBtn = document.createElement("button");
			editBtn.type = "button";
			editBtn.className = "pdp-qa-pref-edit";
			editBtn.textContent = "✏️";
			editBtn.title = "Editar esta preferência: abre o diálogo preenchido com ela para ajustar os campos (e o nome) e salvar de novo";
			editBtn.addEventListener("click", function () {
				closePanel();
				removeConfirmBar();
				removeCaptureToolbar();
				if (mode === "custom") {
					applyPreferenceCustom(label, pref, true);
				} else if (mode === "hop") {
					applyPreferenceViaChain(label, pref, true);
				} else {
					applyPreference(label, pref, true);
				}
			});
			chip.appendChild(editBtn);

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
	// "⭐ Minhas Preferências": todas as preferências salvas (das ações
	// rápidas e do "📎 Juntar Documento") em cards, num painel que abre
	// para baixo do botão. Só as FAV_VISIBLE_LIMIT primeiras aparecem por
	// padrão; o modo de edição permite arrastar os cards para reordená-los
	// (ordem gravada em FAV_ORDER_KEY).
	// -------------------------------------------------------------------

	function groupForLabel(label) {
		for (let i = 0; i < ACTION_GROUPS.length; i++) {
			if (ACTION_GROUPS[i].actions.indexOf(label) !== -1) return ACTION_GROUPS[i];
		}
		return null;
	}

	// Mesma decisão de modo de buildPanel(), por ação; null = indisponível aqui.
	function modeForLabel(label) {
		const group = groupForLabel(label);
		if (!group) return null;
		if (group.custom) {
			if (!location.pathname.startsWith("/projudi/")) return null;
			return getCustomAction(label) ? "custom" : null;
		}
		if (isOnAcoesScreen()) return findActionLink(label) ? "ready" : null;
		if (findMovimentarButton() || findLatestValidEventLink()) return "hop";
		return null;
	}

	function loadFavItems() {
		return chrome.storage.local.get([PREFERENCES_KEY, JUNTAR_PREFS_KEY, FAV_ORDER_KEY]).then(function (data) {
			const items = [];
			const actionPrefs = data[PREFERENCES_KEY] || {};
			Object.keys(actionPrefs).forEach(function (label) {
				(actionPrefs[label] || []).forEach(function (pref) {
					items.push({ key: "a:" + pref.id, kind: "action", label: label, pref: pref });
				});
			});
			const juntarPrefs = Array.isArray(data[JUNTAR_PREFS_KEY]) ? data[JUNTAR_PREFS_KEY] : [];
			juntarPrefs.forEach(function (pref) {
				items.push({ key: "j:" + pref.id, kind: "juntar", label: "Juntar Documento", pref: pref });
			});

			const order = Array.isArray(data[FAV_ORDER_KEY]) ? data[FAV_ORDER_KEY] : [];
			const position = new Map(order.map(function (key, i) { return [key, i]; }));
			items.sort(function (a, b) {
				const pa = position.has(a.key) ? position.get(a.key) : Infinity;
				const pb = position.has(b.key) ? position.get(b.key) : Infinity;
				if (pa !== pb) return pa - pb;
				return (a.pref.createdAt || 0) - (b.pref.createdAt || 0);
			});
			return items;
		});
	}

	function removeFavItem(item) {
		if (item.kind === "action") return removePreference(item.label, item.pref.id);
		return chrome.storage.local.get([JUNTAR_PREFS_KEY]).then(function (data) {
			const prefs = Array.isArray(data[JUNTAR_PREFS_KEY]) ? data[JUNTAR_PREFS_KEY] : [];
			return chrome.storage.local.set({
				[JUNTAR_PREFS_KEY]: prefs.filter(function (p) {
					return p.id !== item.pref.id;
				}),
			});
		});
	}

	function toggleFavPanel() {
		if (activeGroupId === FAV_PANEL_ID) {
			closePanel();
			return;
		}
		closePanel();
		buildFavPanel();
	}

	function buildFavPanel() {
		activeGroupId = FAV_PANEL_ID;
		const favBtn = row && row.querySelector("#pdp-fav-prefs-button");
		if (favBtn) favBtn.classList.add("pdp-qa-active");

		const panel = document.createElement("div");
		panel.className = "pdp-qa-panel pdp-qa-fav-panel";
		activePanel = panel;

		const state = { showAll: false, editing: false };

		const header = document.createElement("div");
		header.className = "pdp-qa-fav-header";
		const title = document.createElement("span");
		title.className = "pdp-qa-action-label";
		title.textContent = "⭐ Minhas Preferências";
		header.appendChild(title);
		const editBtn = document.createElement("button");
		editBtn.type = "button";
		editBtn.className = "pdp-qa-open-btn";
		editBtn.textContent = "✏️ Editar posição";
		editBtn.title = "Arrastar os cards para colocá-los na ordem que você quiser";
		header.appendChild(editBtn);
		panel.appendChild(header);

		const hint = document.createElement("div");
		hint.className = "pdp-qa-note";
		hint.textContent = 'Arraste os cards para reordená-los. A ordem é salva na hora. Clique em "✅ Concluir" ao terminar.';
		hint.hidden = true;
		panel.appendChild(hint);

		const grid = document.createElement("div");
		grid.className = "pdp-qa-fav-grid";
		panel.appendChild(grid);

		const footer = document.createElement("label");
		footer.className = "pdp-qa-fav-footer";
		const showAllBox = document.createElement("input");
		showAllBox.type = "checkbox";
		const showAllText = document.createElement("span");
		footer.appendChild(showAllBox);
		footer.appendChild(showAllText);
		footer.hidden = true;
		panel.appendChild(footer);

		function applyVisibility() {
			const cards = grid.querySelectorAll(".pdp-qa-fav-card");
			const showAll = state.showAll || state.editing;
			cards.forEach(function (card, index) {
				card.classList.toggle("pdp-qa-fav-hidden", !showAll && index >= FAV_VISIBLE_LIMIT);
			});
			const hiddenCount = Math.max(0, cards.length - FAV_VISIBLE_LIMIT);
			footer.hidden = hiddenCount === 0;
			showAllBox.checked = showAll;
			showAllBox.disabled = state.editing;
			showAllText.textContent = "Mostrar todas (+" + hiddenCount + ")";
			positionFavPanel();
		}

		showAllBox.addEventListener("change", function () {
			state.showAll = showAllBox.checked;
			applyVisibility();
		});

		editBtn.addEventListener("click", function () {
			state.editing = !state.editing;
			panel.classList.toggle("pdp-qa-fav-editing", state.editing);
			editBtn.textContent = state.editing ? "✅ Concluir" : "✏️ Editar posição";
			hint.hidden = !state.editing;
			grid.querySelectorAll(".pdp-qa-fav-card").forEach(function (card) {
				card.draggable = state.editing;
			});
			applyVisibility();
		});

		let draggedCard = null;

		function persistOrder() {
			const order = Array.prototype.map.call(grid.querySelectorAll(".pdp-qa-fav-card"), function (card) {
				return card.dataset.key;
			});
			chrome.storage.local.set({ [FAV_ORDER_KEY]: order }).catch(function (err) {
				console.error("[Projudi Ações Rápidas]", "erro ao salvar a ordem das preferências:", err);
			});
		}

		function buildCard(item) {
			const card = document.createElement("div");
			card.className = "pdp-qa-fav-card";
			card.dataset.key = item.key;
			card.tabIndex = 0;
			card.setAttribute("role", "button");

			const mode = item.kind === "juntar"
				? (window.__pdpJuntarDocumento && location.pathname.startsWith("/projudi/") ? "juntar" : null)
				: modeForLabel(item.label);

			const actionEl = document.createElement("span");
			actionEl.className = "pdp-qa-fav-card-action";
			actionEl.textContent = item.label;
			card.appendChild(actionEl);
			const nameEl = document.createElement("span");
			nameEl.className = "pdp-qa-fav-card-name";
			nameEl.textContent = "★ " + item.pref.name;
			card.appendChild(nameEl);

			const tools = document.createElement("span");
			tools.className = "pdp-qa-fav-tools";
			card.appendChild(tools);

			const editPrefBtn = document.createElement("button");
			editPrefBtn.type = "button";
			editPrefBtn.className = "pdp-qa-fav-edit";
			editPrefBtn.textContent = "✏️";
			editPrefBtn.draggable = false;
			editPrefBtn.disabled = !mode;
			editPrefBtn.title = mode
				? "Editar esta preferência: abre o diálogo preenchido com ela para ajustar os campos (e o nome) e salvar de novo"
				: '"' + item.label + '" não está disponível nesta tela para editar.';
			editPrefBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (!mode) return;
				closePanel();
				removeConfirmBar();
				removeCaptureToolbar();
				if (mode === "juntar") window.__pdpJuntarDocumento.edit(item.pref);
				else if (mode === "custom") applyPreferenceCustom(item.label, item.pref, true);
				else if (mode === "hop") applyPreferenceViaChain(item.label, item.pref, true);
				else applyPreference(item.label, item.pref, true);
			});
			editPrefBtn.addEventListener("keydown", function (e) {
				e.stopPropagation();
			});
			tools.appendChild(editPrefBtn);

			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "pdp-qa-fav-del";
			delBtn.textContent = "🗑";
			delBtn.title = "Remover esta preferência";
			delBtn.draggable = false;
			delBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (!confirm('Remover a preferência "' + item.pref.name + '" de "' + item.label + '"?')) return;
				removeFavItem(item).then(function () {
					card.remove();
					if (!grid.querySelector(".pdp-qa-fav-card")) showEmpty();
					applyVisibility();
				}).catch(function (err) {
					console.error("[Projudi Ações Rápidas]", "erro ao remover preferência:", err);
					alert("Não foi possível remover a preferência. Tente de novo.");
				});
			});
			delBtn.addEventListener("keydown", function (e) {
				e.stopPropagation();
			});
			tools.appendChild(delBtn);

			if (!mode) {
				card.classList.add("pdp-qa-fav-unavailable");
				card.title = '"' + item.label + '" não está disponível nesta tela. Abra a aba "Movimentações" do processo.';
			} else if (item.kind === "juntar") {
				card.title = 'Juntar Documento com a preferência "' + item.pref.name + '"';
			} else {
				card.title = mode === "custom"
					? 'Abre "' + item.label + '" já preenchido com esta preferência'
					: 'Preenche automaticamente e pede 1 confirmação para executar "' + item.label + '"';
				if (item.pref.descricao) card.title += "\n" + item.pref.descricao;
			}

			function activate() {
				if (state.editing || !mode) return;
				closePanel();
				removeConfirmBar();
				removeCaptureToolbar();
				if (mode === "juntar") window.__pdpJuntarDocumento.apply(item.pref);
				else if (mode === "custom") applyPreferenceCustom(item.label, item.pref);
				else if (mode === "hop") applyPreferenceViaChain(item.label, item.pref);
				else applyPreference(item.label, item.pref);
			}
			card.addEventListener("click", activate);
			card.addEventListener("keydown", function (e) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					activate();
				}
			});

			card.addEventListener("dragstart", function (e) {
				if (!state.editing) {
					e.preventDefault();
					return;
				}
				draggedCard = card;
				card.classList.add("pdp-qa-fav-dragging");
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", item.key);
			});
			card.addEventListener("dragend", function () {
				card.classList.remove("pdp-qa-fav-dragging");
				grid.querySelectorAll(".pdp-qa-fav-over").forEach(function (c) {
					c.classList.remove("pdp-qa-fav-over");
				});
				draggedCard = null;
			});
			card.addEventListener("dragover", function (e) {
				if (!draggedCard || draggedCard === card) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				card.classList.add("pdp-qa-fav-over");
			});
			card.addEventListener("dragleave", function () {
				card.classList.remove("pdp-qa-fav-over");
			});
			card.addEventListener("drop", function (e) {
				e.preventDefault();
				card.classList.remove("pdp-qa-fav-over");
				if (!draggedCard || draggedCard === card) return;
				const cards = Array.prototype.slice.call(grid.children);
				const movingForward = cards.indexOf(draggedCard) < cards.indexOf(card);
				card.insertAdjacentElement(movingForward ? "afterend" : "beforebegin", draggedCard);
				persistOrder();
			});

			return card;
		}

		function showEmpty() {
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Nenhuma preferência salva ainda. Crie uma com "+ Nova preferência" no painel de qualquer ação.';
			grid.replaceWith(empty);
			editBtn.hidden = true;
			hint.hidden = true;
		}

		loadFavItems().then(function (items) {
			if (activePanel !== panel) return; // painel já fechado/trocado
			if (!items.length) {
				showEmpty();
			} else {
				items.forEach(function (item) {
					grid.appendChild(buildCard(item));
				});
			}
			applyVisibility();
		});

		document.body.appendChild(panel);
		positionFavPanel();

		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onKeydown, true);
		}, 0);
	}

	// Abre para baixo do botão; só vai para cima quando não cabe embaixo.
	function positionFavPanel() {
		if (!activePanel || !row || activeGroupId !== FAV_PANEL_ID) return;
		const btn = row.querySelector("#pdp-fav-prefs-button");
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		const above = rect.top - BUTTON_SCREEN_MARGIN - 6;
		const below = window.innerHeight - rect.bottom - BUTTON_SCREEN_MARGIN - 6;
		const openBelow = below >= Math.min(260, activePanel.scrollHeight) || below >= above;
		activePanel.style.boxSizing = "border-box";
		activePanel.style.maxHeight = Math.max(0, openBelow ? below : above) + "px";
		activePanel.style.top = openBelow ? (rect.bottom + 6) + "px" : "auto";
		activePanel.style.bottom = openBelow ? "auto" : (window.innerHeight - rect.top + 6) + "px";

		const width = activePanel.offsetWidth || 380;
		let left = rect.right - width;
		if (left + width > window.innerWidth - BUTTON_SCREEN_MARGIN) left = window.innerWidth - BUTTON_SCREEN_MARGIN - width;
		activePanel.style.left = Math.max(BUTTON_SCREEN_MARGIN, Math.round(left)) + "px";
		activePanel.style.right = "auto";
	}

	// -------------------------------------------------------------------
	// Posicionamento (mesma técnica dos botões irmãos de WhatsApp/e-mail)
	// -------------------------------------------------------------------

	function positionPanel(groupId) {
		if (groupId === FAV_PANEL_ID) {
			positionFavPanel();
			return;
		}
		if (!activePanel || !row) return;
		const btn = panelButton(groupId);
		if (!btn) return;
		const rect = btn.getBoundingClientRect();

		const above = rect.top - BUTTON_SCREEN_MARGIN - 6;
		const below = window.innerHeight - rect.bottom - BUTTON_SCREEN_MARGIN - 6;
		const openAbove = above >= below;
		activePanel.style.boxSizing = "border-box";
		activePanel.style.maxHeight = Math.max(0, openAbove ? above : below) + "px";
		activePanel.style.top = openAbove ? "auto" : (rect.bottom + 6) + "px";
		activePanel.style.bottom = openAbove ? (window.innerHeight - rect.top + 6) + "px" : "auto";

		const panelRect = activePanel.getBoundingClientRect();
		let right = window.innerWidth - rect.right;
		const overflowLeft = window.innerWidth - right - panelRect.width - BUTTON_SCREEN_MARGIN;
		if (overflowLeft < 0) right += overflowLeft;
		activePanel.style.right = Math.max(BUTTON_SCREEN_MARGIN, Math.round(right)) + "px";
	}

	// Quando o grupo de botões (buttonDrag.js) já assumiu #pdp-qa-row —
	// sinalizado pelo atributo "data-pdp-movable" que ele mesmo aplica em
	// layoutColumns()/place() —, NÃO reposiciona por aqui. buttonDrag.js
	// inclui "#pdp-qa-row" diretamente no seletor de peers (não só quando
	// há botões de e-mail/WhatsApp), então assim que a fila existe e fica
	// visível ele sempre a reivindica. Sem essa checagem, os dois códigos
	// rodavam em paralelo (mesmo intervalo de 700ms, mesmos eventos de
	// scroll/resize) com fórmulas diferentes de "bottom"/"right" para o
	// MESMO elemento, e o valor aplicado por último — de um jeito ou de
	// outro — vencia a cada ciclo: a fila (com "Processo copiado",
	// "(Des)Habilitar Advogado", "Destacar movimentações", "Oráculo")
	// ficava alternando entre as duas posições. Mesma causa e mesma
	// correção já aplicadas ao botão de WhatsApp em content.js.
	function repositionRow() {
		if (!row) return;
		if (row.hasAttribute("data-pdp-movable")) {
			if (activeGroupId) positionPanel(activeGroupId);
			return;
		}

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
			maybeResumeCombo();
		} catch (err) {
			console.error("[Projudi Ações Rápidas]", "erro ao reconciliar:", err);
		}
	}

	if (!semInterface) {
		loadRowExpandedPreference();
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
	}

	let repositionScheduled = false;
	function scheduleReposition() {
		if (repositionScheduled) return;
		repositionScheduled = true;
		requestAnimationFrame(function () {
			repositionScheduled = false;
			repositionRow();
		});
	}
	window.addEventListener("pdp-buttons-hide", closePanel);
	window.addEventListener("pagehide", function () {
		pageReloading = true;
	});
	window.addEventListener("pdp-buttons-moved", function () {
		if (activeGroupId) positionPanel(activeGroupId);
	});
	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);

	// -------------------------------------------------------------------
	// API mínima exposta para outros recursos desta extensão:
	// - resolveDialogUrl (ver src/ordenarCumprimentos.js, botão "Nova
	//   Ordenação"): resolve a URL de um diálogo de ação pelo rótulo exato,
	//   reaproveitando a MESMA cadeia já usada e testada aqui - cada
	//   chamada gera um diálogo (e token de sessão) NOVO, nunca
	//   reaproveitando uma URL já usada. Necessário porque reenviar um
	//   formulário com o token de uma página já carregada antes (ex.: a
	//   mesma página que o usuário ainda está vendo) corre o risco de
	//   reaproveitar um token de uso único já consumido por outro envio -
	//   o Projudi pode aceitar a requisição sem indicar erro algum, mas
	//   sem de fato repetir a ação.
	// - openActionModal (ver src/habilitarAdvogado.js, botão "(Des)
	//   Habilitar Advogado"): abre o MESMO popup usado pelas ações do
	//   painel "Ações" (Ordenar Cumprimentos, Realizar Remessa etc.) direto
	//   numa URL já conhecida - reaproveita showActionModal (com o mesmo
	//   shim de opener/close e o mesmo "✕ Fechar"), sem precisar da cadeia
	//   de resolveDialogUrl (que serve para DESCOBRIR a URL a partir de uma
	//   movimentação; aqui quem chama já sabe a URL de antemão). Sempre um
	//   `src` comum (GET) no iframe - nunca um `<form target="...">`
	//   mirando o nome do iframe, que abre uma ABA NOVA em vez de navegar o
	//   iframe quando o nome não é reconhecido a tempo como alvo válido
	//   (comportamento padrão do HTML nesse caso - já visto ao vivo).
	// - openActionModalPost (ver src/content.js, botão "Analisar Retorno"
	//   de mandados devolvidos): mesma ideia, mas para uma ação cujo botão
	//   nativo faz um POST (via `submitPage(url, form)`) em vez de um link
	//   GET comum - o caso de openActionModal (`src` direto no iframe) não
	//   serve aqui, pois um GET não reproduziria o POST original.
	//
	//   A primeira versão disto usava um `<form target="nome-do-iframe">`
	//   mirando o iframe já existente do popup, na suposição de que isso
	//   seria seguro por o iframe já estar conectado ao documento (ao
	//   contrário do aviso acima sobre openActionModal, que é sobre um
	//   iframe criado/nomeado no mesmíssimo instante da tentativa de mirar
	//   nele). Testado ao vivo, isso também abriu uma ABA NOVA em vez de
	//   navegar o iframe do popup - ou seja, a mesma armadilha ocorre mesmo
	//   com o iframe já presente no DOM, então esta técnica foi abandonada
	//   por completo (não é só "quando o nome não é reconhecido a tempo").
	//
	//   Em vez disso, reproduzimos o POST em segundo plano via fetch() -
	//   mesma técnica de leitura já usada por `readPage()` em
	//   habilitarAdvogado.js e por `fetchMandadoAnalise()` em content.js
	//   (inclusive a mesma detecção de charset, já que o Projudi serve em
	//   windows-1252) - e escrevemos o HTML resultante diretamente no
	//   iframe do popup via `iframe.srcdoc`, com uma tag `<base href="...">`
	//   injetada logo no `<head>` apontando para a URL de verdade da
	//   resposta. Sem essa tag, os links/formulários/scripts relativos da
	//   tela resultante (ex.: os botões nativos "Marcar Leitura"/
	//   "Confirmar" da tela seguinte) resolveriam contra "about:srcdoc" e
	//   quebrariam; com ela, se comportam como se o iframe tivesse navegado
	//   de verdade para aquela URL - inclusive o clique num desses botões
	//   nativos, que faz uma navegação real do iframe (não mais um
	//   `srcdoc`), então o shim de opener/close e o `checkFlagClosePopup`
	//   (ambos ligados ao evento "load" do iframe, que dispara tanto ao
	//   final de um `srcdoc` quanto de uma navegação comum) continuam
	//   funcionando normalmente daí em diante.
	//
	//   Um detalhe à parte, no manifest.json: um iframe `srcdoc` tem URL
	//   própria "about:srcdoc", que por padrão NÃO bate com nenhum padrão
	//   de `matches` dos content_scripts — sem o `match_origin_as_fallback:
	//   true` nos blocos de content_scripts do Projudi/SEEU, nenhum script
	//   desta extensão (inclusive a pré-visualização de documentos ao
	//   passar o mouse, de content.js) rodaria dentro deste popup, mesmo
	//   a origem "de verdade" da resposta sendo o próprio Projudi. O Chrome
	//   exige que o `path` do padrão de `matches` seja exatamente "*"
	//   quando `match_origin_as_fallback` está ativo (senão recusa carregar
	//   a extensão) — por isso esses dois blocos passaram de
	//   "*://*.tjpr.jus.br/projudi/*"/"*://seeu.pje.jus.br/seeu/*" para
	//   "*://*.tjpr.jus.br/*"/"*://seeu.pje.jus.br/*" (mesmos hosts já
	//   cobertos por host_permissions, só sem restringir o caminho): os
	//   scripts desta extensão passam a rodar em qualquer página desses
	//   dois domínios, não só sob /projudi/ ou /seeu/ — sem problema prático
	//   aqui, já que cada recurso só age depois de confirmar marcadores
	//   específicos da tela (número do processo, formulários nativos etc.),
	//   nunca só pela URL.
	// -------------------------------------------------------------------

	// Insere `<base href="...">` logo após a abertura do `<head>` (ou cria
	// um `<head>` mínimo se a página não tiver um, caso nunca visto no
	// Projudi mas tratado por segurança) - resolve todo link/formulário/
	// script relativo do HTML como se ele tivesse navegado de verdade para
	// `baseUrl`, mesmo carregado via `iframe.srcdoc` (cuja URL própria é
	// "about:srcdoc").
	function injectBaseHref(html, baseUrl) {
		const baseTag = '<base href="' + String(baseUrl).replace(/"/g, "&quot;") + '">';
		if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, function (match) { return match + baseTag; });
		if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, function (match) { return match + "<head>" + baseTag + "</head>"; });
		return baseTag + html;
	}

	window.__pdpQuickActions = {
		resolveDialogUrl: resolveDialogUrl,
		// Preferências salvas (mesma lista/ordem de "Minhas Preferências").
		loadFavItems: loadFavItems,
		// Aplica uma preferência de ação (não "Juntar Documento" nem ações
		// personalizadas) partindo de uma tela já carregada em segundo plano
		// (`origem` = { doc, url }, ex.: a tela do processo) - mesmo popup,
		// mesmo preenchimento e mesma barra "Sim, executar" das demais. Os
		// `hooks` ({ onSubmit, onDone, onClose, onFail }) informam quem
		// chamou; a tela por trás não é recarregada ao fim.
		applyPreferenceFrom: function (label, pref, origem, hooks) {
			closePanel();
			removeConfirmBar();
			removeCaptureToolbar();
			applyPreferenceViaChain(label, pref, false, origem, Object.assign({ noReload: true }, hooks || {}));
		},
		openActionModal: function (label, url) {
			const iframe = showActionModal(label);
			if (url) iframe.src = url;
			return iframe;
		},
		openActionModalPost: function (label, url, fields) {
			const iframe = showActionModal(label);

			const body = new URLSearchParams();
			(fields || []).forEach(function (pair) {
				body.append(pair[0], pair[1]);
			});

			fetch(url, { method: "POST", credentials: "same-origin", body: body })
				.then(function (response) {
					if (!response.ok) throw new Error("O Projudi não respondeu (" + response.status + ").");
					return response.arrayBuffer().then(function (bytes) {
						const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
						const charsetMatch =
							/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") ||
							/charset\s*=\s*["']?([\w-]+)/i.exec(preview);
						const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
						const html = new TextDecoder(charset).decode(bytes);
						iframe.srcdoc = injectBaseHref(html, response.url);
					});
				})
				.catch(function (err) {
					alert('Não foi possível abrir "' + label + '": ' + err.message);
					removeActionModal();
				});

			return iframe;
		},
	};
})();
