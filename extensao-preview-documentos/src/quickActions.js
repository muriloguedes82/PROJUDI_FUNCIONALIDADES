Warning: truncated output (original token count: 61077)
Total output lines: 5942

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
			// "Remessa Eletrônica para a Turma Recursal" só aparece nos
			// Juizados Especiais (logo abaixo da do Tribunal de Justiça).
			actions: ["Realizar Remessa", "Remessa Eletrônica para o Tribunal de Justiça", "Remessa Eletrônica para a Turma Recursal"],
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
			// Tela "Habilitação de Advogado/Sociedade para Parte"
			// (advogadosParte.do), ensinada por habilitarAdvogado.js. Não
			// ganha botão nesta fileira (`semBotao`): o painel abre pelo
			// botão "⚖️ Advogados" que aquele arquivo já põe ao lado do
			// "Colar processo" (data-panel-id="advogados", ver
			// togglePanelById). Só no Projudi.
			id: "advogados",
			title: "Advogados",
			icon: "⚖️",
			actions: ["Advogados"],
			custom: true,
			semBotao: true,
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
				// Bloco "Comunicar ao IIPR" da coluna de Ações (só em
				// processos criminais). Ver ACTIONS_NEEDING_ACOES_PARENT.
				"Anotações Criminais",
				"Solicitar Antecedentes Criminais",
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
	const LOCALIZADOR_PREFS_KEY = "pdpLocalizadorPreferencias"; // ver localizadorSeeu.js (só SEEU)
	const LOCALIZADOR_LABEL = "📍 Localizador";
	const FAV_ORDER_KEY = "pdpPreferencesOrder"; // ["a:<id>" | "j:<id>" | "c:<id>" | "l:<id>", ...] — ordem dos cards em "Minhas Preferências"
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
		const projudiHeader = document.getElementById("barraTituloStatusProcessual");
		if (projudiHeader && /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(projudiHeader.textContent || "")) return true;
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

	// Movimentação de referência escolhida pelo usuário (caixinha ao lado do
	// evento, ver movimentoBase.js): a guardada no início do combo em
	// andamento ou, fora de combo, a marcada agora na tela. null = nenhuma
	// (a extensão escolhe sozinha, como sempre).
	function movimentoBaseEscolhido() {
		const run = readComboRun();
		if (run && run.movimentoBase) {
			const atual = numeroProcessoAtual();
			if (!run.numero || !atual || run.numero === atual) return run.movimentoBase;
		}
		const api = window.__pdpMovimentoBase;
		return api ? api.selecionada() : null;
	}

	function movimentoBaseLegenda(base) {
		return "movimentação " + (base.seq ? base.seq + " " : "") + (base.texto ? '"' + base.texto + '"' : "");
	}

	// Nome do evento de um link LNKmov — mesma regra de textoDoEvento em
	// movimentoBase.js: o título em negrito da célula ou o texto do link.
	function tituloDoEvento(link) {
		const celula = link.closest("td");
		const titulo = celula && celula.querySelector("b, strong");
		return ((titulo ? titulo.textContent : "") || "").replace(/\s+/g, " ").trim() || (link.textContent || "").replace(/\s+/g, " ").trim();
	}

	function normalizarNomeMovimento(text) {
		return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
	}

	// Preferência gravada a partir de um movimento (pref.movimento.texto, ver
	// showCaptureToolbar): acha em `root` a movimentação válida mais recente
	// (maior "Seq.") com esse nome. null = não há.
	function findMovimentoPorNomeIn(root, nome) {
		const alvo = normalizarNomeMovimento(nome);
		if (!alvo) return null;
		let melhor = null;
		let melhorSeq = -1;
		root.querySelectorAll('a[id^="LNKmov"]').forEach(function (link) {
			if ((link.id || "").indexOf("INVALIDO") !== -1 || link.closest("strike, s, del")) return;
			if (normalizarNomeMovimento(tituloDoEvento(link)) !== alvo) return;
			const row = link.closest('tr[id^="mov1Grau"]') || link.closest("tr");
			let seq = -1;
			if (row) {
				Array.prototype.some.call(row.querySelectorAll(":scope > td"), function (td) {
					const text = (td.textContent || "").replace(/\s+/g, " ").trim();
					if (/^\d+$/.test(text)) seq = parseInt(text, 10);
					return seq !== -1;
				});
			}
			if (!melhor || seq > melhorSeq) {
				melhor = link;
				melhorSeq = seq;
			}
		});
		return melhor;
	}

	// Acha a movimentação escolhida em `root` (a tela atual ou uma cópia da
	// aba Movimentações lida em segundo plano): pelo id do link do evento e,
	// se não houver, pelo número da movimentação (coluna "Seq.").
	function findMovimentoBaseIn(root, base) {
		const links = Array.prototype.slice.call(root.querySelectorAll('a[id^="LNKmov"]')).filter(function (link) {
			return (link.id || "").indexOf("INVALIDO") === -1 && !link.closest("strike, s, del");
		});
		const byId = links.filter(function (link) {
			return link.id === base.id;
		})[0];
		if (byId) return byId;
		if (!base.seq) return null;
		return (
			links.filter(function (link) {
				const row = link.closest('tr[id^="mov1Grau"]') || link.closest("tr");
				if (!row) return false;
				return Array.prototype.some.call(row.querySelectorAll(":scope > td"), function (td) {
					return (td.textContent || "").replace(/\s+/g, " ").trim() === base.seq;
				});
			})[0] || null
		);
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
	// para o Tribunal de Justiça; aceita qualquer `confirmaRemessa...(`,
	// como a da Turma Recursal nos Juizados). Resolve relativa a `baseUrl`
	// (a URL da própria página onde o onclick foi encontrado).
	function extractUrlFromOnclick(onclick, baseUrl) {
		if (!onclick) return null;
		const match = onclick.match(
			/(?:document\.location\.href\s*=\s*|open(?:DialogMaximized|Dialog)\(|confirmaRemessa\w*\()\s*'([^']+)'/
		);
		if (!match) return null;
		try {
			return new URL(match[1], baseUrl).href;
		} catch (err) {
			return null;
		}
	}

	// Resultado da cadeia para o link de uma ação já achado na tela de
	// Ações (`acoesUrl`). As ações de ACTIONS_NEEDING_ACOES_PARENT abrem
	// pelo clique no próprio link dentro da tela de Ações, então não
	// dependem de a URL do diálogo estar no `onclick` (os links do bloco
	// "Comunicar ao IIPR" podem não seguir o padrão `openDialog('...')` dos
	// demais) - nesse caso `url` fica null.
	function dialogResultForLink(label, link, acoesUrl) {
		const dialogUrl = extractUrlFromOnclick(link.getAttribute("onclick"), acoesUrl);
		if (dialogUrl) return { url: dialogUrl, acoesUrl: acoesUrl };
		if (ACTIONS_NEEDING_ACOES_PARENT.indexOf(label) !== -1 || ACTIONS_ACOES_PARENT_SEM_URL.indexOf(label) !== -1) {
			return { url: null, acoesUrl: acoesUrl };
		}
		return null;
	}

	// Ponto de entrada: devolve uma Promise que resolve com
	// `{ url }` (a URL do diálogo pronta para um iframe) ou
	// `{ failed: true, tried, screenTitle }` se não achar.
	// `origem` (opcional): { doc, url } de uma tela já carregada em segundo
	// plano (ex.: a tela do processo, aberta a partir da linha de uma
	// listagem - ver applyPreferenceFrom; a aba Movimentações lida pelos
	// combos quando a tela atual é outra aba do processo). Sem ela, parte
	// da tela atual.
	// `movimentoNome` (opcional): nome do movimento gravado na preferência
	// (ver findMovimentoPorNomeIn); sem ele, nada muda.
	// `tituloPergunta` (opcional): título da caixa que pergunta se segue sem o
	// movimento (ex.: "★ Remessa MP — Realizar Remessa").
	function resolveDialogUrl(label, origem, movimentoNome, tituloPergunta) {
		const rootDoc = (origem && origem.doc) || document;
		const baseUrl = (origem && origem.url) || window.location.href;
		logChainStep('resolvendo URL de "' + label + '" em segundo plano', { partindoDe: baseUrl });

		// A própria origem já é uma tela de Ações.
		if (origem && isOnAcoesScreenIn(rootDoc)) {
			const direct = findActionLinkIn(rootDoc, label);
			const directResult = direct ? dialogResultForLink(label, direct, baseUrl) : null;
			if (directResult) return Promise.resolve(directResult);
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
					const linkResult = link ? dialogResultForLink(label, link, result.url) : null;
					if (linkResult) return linkResult;
				}
				return { failed: true, screenTitle: getScreenTitleIn(result.doc) };
			});
		}

		let events = Array.prototype.slice
			.call(rootDoc.querySelectorAll('a.link[id^="LNKmov"]'))
			.filter(function (a) {
				return (a.id || "").indexOf("INVALIDO") === -1 && !a.closest("strike, s, del");
			})
			.slice(0, MAX_MOVEMENT_ATTEMPTS);

		// Movimentação marcada pelo usuário na aba Movimentações (ver
		// movimentoBase.js): só ela, sem tentar outras — como na
		// movimentação manual. Sem marcação, segue a escolha automática.
		const base = movimentoBaseEscolhido();
		if (base) {
			const baseLink = findMovimentoBaseIn(rootDoc, base);
			logChainStep("partindo da movimentação marcada pelo usuário", { seq: base.seq, evento: base.texto, achada: !!baseLink });
			if (!baseLink) return Promise.resolve({ failed: true, selecionada: base, naoAchada: true });
			events = [baseLink];
		}

		// Preferência gravada a partir de um movimento (e nenhuma caixinha
		// marcada agora): parte da movimentação mais recente com esse nome. Sem
		// ela no processo, pergunta; "OK" segue a regra geral, como se a
		// preferência não tivesse movimento.
		let nomeAchado = null;
		// Resolve com true para seguir, false se o usuário desistir.
		let seguir = Promise.resolve(true);
		if (!base && movimentoNome) {
			const porNome = findMovimentoPorNomeIn(rootDoc, movimentoNome);
			logChainStep("preferência gravada a partir do movimento \"" + movimentoNome + "\"", { achado: !!porNome, id: porNome ? porNome.id : null });
			if (porNome) {
				events = [porNome];
				nomeAchado = movimentoNome;
			} else {
				// A caixa fica na frente do "Abrindo…", que sai durante a pergunta.
				removeLoadingOverlay();
				seguir = perguntarPendencia(
					tituloPergunta || "📌 " + label,
					'Não localizei o movimento "' + movimentoNome + '" na aba Movimentações deste processo. Deseja prosseguir mesmo assim com "' + label + '"?',
					"Prosseguir",
					"Prosseguir executa pela regra geral (a partir da movimentação mais recente, como se a preferência não tivesse movimento). Cancelar não executa nada.",
					"Cancelar"
				).then(function (resposta) {
					logChainStep(resposta === "sim" ? "movimento não localizado; seguindo pela regra geral" : "movimento não localizado; usuário cancelou", null);
					return resposta === "sim";
				});
			}
		}

		let lastScreenTitle = null;

		function tryEvent(index) {
			if (index >= events.length) {
				return Promise.resolve({
					failed: true,
					tried: events.length,
					screenTitle: lastScreenTitle,
					selecionada: base || (nomeAchado ? { texto: nomeAchado } : null),
				});
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
						const linkResult = dialogResultForLink(label, link, acoes.url);
						if (!linkResult) {
							logChainStep("achei o link da ação mas não consegui extrair a URL do onclick", describeElement(link));
							return tryEvent(index + 1);
						}
						logChainStep("URL do diálogo resolvida", linkResult.url || "(abrirá pelo link nativo na tela de Ações)");
						return linkResult;
					});
				})
				.catch(function (err) {
					logChainStep("erro ao buscar uma etapa da cadeia, tentando a próxima movimentação", String(err));
					return tryEvent(index + 1);
				});
		}

		return seguir.then(function (ok) {
			return ok ? tryEvent(0) : { failed: true, desistiu: true, movimentoNome: movimentoNome };
		});
	}

	// -------------------------------------------------------------------
	// Overlay de carregamento — mostrado só durante a resolução em segundo
	// plano (fetches), tipicamente menos de 1-2s. A tela principal nunca
	// navega, então isso é só um indicador de "aguarde", não uma cortina
	// para esconder telas piscando como numa versão anterior.
	// -------------------------------------------------------------------

	const LOADING_OVERLAY_ID = "pdp-qa-loading-overlay";

	// `base` (opcional): movimentação marcada pelo usuário (ver
	// movimentoBaseEscolhido), mostrada no texto.
	function showLoadingOverlay(label, onCancel, base) {
		removeLoadingOverlay();
		const overlay = document.createElement("div");
		overlay.id = LOADING_OVERLAY_ID;
		overlay.className = "pdp-qa-loading-overlay";
		overlay.innerHTML =
			'<div class="pdp-qa-loading-box">' +
			'<div class="pdp-qa-loading-spinner"></div>' +
			'<div class="pdp-qa-loading-text">Abrindo "' +
			escapeHtml(label) +
			'"' +
			(base ? " a partir da " + escapeHtml(movimentoBaseLegenda(base)) : "") +
			"…</div>" +
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
	// Vale também para o popup aberto a partir da linha de uma listagem
	// (modalHooks), depois do "Sim, executar".
	function checkComboStepResult(iframe) {
		const comboConfirmed = !!comboStep && comboStep.iframe === iframe && comboStep.confirmed;
		const rowConfirmed = !!modalHooks && modalHooks.submitted && activeModalIframe === iframe;
		if (!comboConfirmed && !rowConfirmed) return;
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
		const iframe = backdrop.querySelector(".pdp-qa-modal-iframe");
		if (label === "Alvará Eletrônico" || label === "Partes do Processo" || label === "Alterar Classe/Assuntos" ||
			String(label).indexOf("Parte do Processo - ") === 0) {
			iframe.setAttribute("data-pdp-hide-button-group", "");
		}
		document.body.appendChild(backdrop);
		backdrop.querySelector(".pdp-qa-modal-close").addEventListener("click", function () {
			logChainStep('"✕ Fechar" clicado manualmente pelo usuário', null);
			removeActionModal("manual");
		});
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
			if (hooks.onClose) hooks.onClose(reason);
		}
		stopModalWatch();
		removeConfirmBar();
		removeCaptureToolbar();
		if (comboStep && closedIframe && comboStep.iframe === closedIframe) onComboStepModalClosed(reason);
	}

	function alertChainFailure(label, result) {
		if (result && result.desistiu) return; // o usuário já respondeu "Cancelar"
		if (result && result.selecionada) {
			alert(
				result.naoAchada
					? "Não encontrei a " + movimentoBaseLegenda(result.selecionada) + " marcada na aba Movimentações. Marque-a de novo (ou desmarque-a para a extensão escolher a movimentação sozinha) e repita."
					: "A " +
							movimentoBaseLegenda(result.selecionada) +
							' marcada não leva à ação "' +
							label +
							'"' +
							(result.screenTitle ? ' (cheguei na tela "' + result.screenTitle + '")' : "") +
							". Marque outra movimentação (um despacho/decisão costuma funcionar) ou desmarque-a para a extensão escolher sozinha."
			);
			return;
		}
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
	// contenha algum campo co…31077 tokens truncated…ement("div");
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
						alert('Combo "' + name + '" ' + (existing ? "atualizado" : "salvo") + ". Use-o pelo botão \"🔗 Combos\" ou \"⭐ Minhas Preferências\".");
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
				executarComPendencias('🔗 Combo "' + combo.name + '" (' + combo.steps.length + " etapas)", true, function () {
					startCombo(combo);
				});
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
			if (group.semBotao) return;
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
			clipboardBtn.textContent = "📋 Colar processo";
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
		highlightPrefsBtn.innerHTML = '<span class="pdp-qa-icon">🖍️</span><span>Destacar mov.</span>';
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
		const activeBtn = panelButton(group.id);
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
		// Busca no topo (painelPreferencias.js), quando há muitas preferências.
		window.__pdpPainelPrefs.topo(activePanel, {
			itens: ".pdp-qa-pref-chip",
			texto: function (chip) {
				const action = chip.closest(".pdp-qa-action");
				return chip.textContent + " " + (action ? action.dataset.actionLabel : "");
			}
		});
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
		actionRow.appendChild(header);

		const prefsWrap = document.createElement("div");
		prefsWrap.className = "pdp-qa-prefs";
		prefsWrap.dataset.actionLabel = label;
		actionRow.appendChild(prefsWrap);

		// "+ Nova preferência" na linha do nome da ação, ao lado de "Abrir":
		// abaixo das preferências, com muitas delas, ficava longe da vista.
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
		const headerBtns = document.createElement("span");
		headerBtns.className = "pdp-qa-action-btns";
		headerBtns.appendChild(openBtn);
		headerBtns.appendChild(newPrefBtn);
		header.appendChild(headerBtns);

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
			applyBtn.textContent = "★ " + pref.name + (pref.movimento && pref.movimento.texto ? " 📌" : "");
			applyBtn.title =
				(mode === "custom"
					? 'Abre "' + label + '" já preenchido com esta preferência'
					: 'Preenche automaticamente e pede 1 confirmação para executar "' + label + '"') +
				(pref.descricao ? "\n" + pref.descricao : "") +
				(pref.movimento && pref.movimento.texto ? '\n📌 Parte do movimento "' + pref.movimento.texto + '" (o mais recente com esse nome)' : "");
			applyBtn.addEventListener("click", function () {
				if (mode === "custom" || mode === "hop") closePanel();
				executarComPendencias("★ " + pref.name + " — " + label, false, function () {
					if (mode === "custom") {
						removeCaptureToolbar();
						applyPreferenceCustom(label, pref);
					} else if (mode === "hop") {
						applyPreferenceViaChain(label, pref);
					} else {
						applyPreference(label, pref);
					}
				});
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
		window.__pdpPainelPrefs.filtrar(activePanel);
	}

	// -------------------------------------------------------------------
	// "⭐ Minhas Preferências": todas as preferências salvas (das ações
	// rápidas, do "📎 Juntar Documento" e, no SEEU, do "📍 Localizador")
	// em cards, num painel que abre
	// para baixo do botão, agrupados num bloco por ação (ícone do botão,
	// nome da ação e quantidade). Só as FAV_VISIBLE_LIMIT primeiras aparecem
	// por padrão; o modo de edição permite arrastar os cards dentro do bloco
	// e os blocos (pelo título) entre si (ordem gravada em FAV_ORDER_KEY: a
	// ordem dos blocos é a do primeiro card de cada um).
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
		return loadFavItemsWith(false);
	}

	// Bloco de "Minhas Preferências" de um item: { key, icon, title }.
	function favGroupOf(item) {
		if (item.kind === "combo") return { key: "combo", icon: "🔗", title: "Combos" };
		if (item.kind === "localizador") return { key: "localizador", icon: "📍", title: "Localizador" };
		if (item.kind === "juntar") return { key: "a:" + JUNTAR_LABEL, icon: "📎", title: JUNTAR_LABEL };
		const group = groupForLabel(item.label);
		return { key: "a:" + item.label, icon: group ? group.icon : "★", title: item.label };
	}

	// Agrupa os itens (já na ordem salva) em blocos, na ordem do primeiro
	// item de cada um, e monta cada bloco em `container` com
	// buildCard(item) para os cards. Devolve os blocos criados.
	function buildFavGroups(container, items, buildCard) {
		const groups = new Map();
		items.forEach(function (item) {
			const info = favGroupOf(item);
			if (!groups.has(info.key)) groups.set(info.key, { info: info, items: [] });
			groups.get(info.key).items.push(item);
		});
		const built = [];
		groups.forEach(function (g) {
			const box = document.createElement("div");
			box.className = "pdp-qa-fav-group";
			box.dataset.group = g.info.key;
			const label = document.createElement("span");
			label.className = "pdp-qa-fav-group-label";
			label.title = g.info.title;
			const icon = document.createElement("span");
			icon.textContent = g.info.icon;
			const title = document.createElement("span");
			title.textContent = g.info.title;
			const count = document.createElement("span");
			count.className = "pdp-qa-fav-group-count";
			label.appendChild(icon);
			label.appendChild(title);
			label.appendChild(count);
			box.appendChild(label);
			const cards = document.createElement("div");
			cards.className = "pdp-qa-fav-group-cards";
			box.appendChild(cards);
			g.items.forEach(function (item) {
				cards.appendChild(buildCard(item));
			});
			updateFavGroupCount(box);
			container.appendChild(box);
			built.push(box);
		});
		return built;
	}

	function updateFavGroupCount(box) {
		const count = box.querySelector(".pdp-qa-fav-group-count");
		if (count) count.textContent = "(" + box.querySelectorAll(".pdp-qa-fav-card").length + ")";
	}

	// `includeCombos`: também os combos e as preferências de localizadores
	// (só o painel do botão; o da linha do processo, em
	// preferenciasNaLinha.js, não tem como executar nenhum dos dois).
	function loadFavItemsWith(includeCombos) {
		return chrome.storage.local.get(COMBO_PREFS_STORAGE_KEYS.concat([FAV_ORDER_KEY, COMBOS_KEY])).then(function (data) {
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
			// Localizadores: só onde localizadorSeeu.js está carregado (SEEU).
			if (includeCombos && window.__pdpLocalizador) {
				const locPrefs = Array.isArray(data[LOCALIZADOR_PREFS_KEY]) ? data[LOCALIZADOR_PREFS_KEY] : [];
				locPrefs.forEach(function (pref) {
					if (!pref || !Array.isArray(pref.localizadores) || !pref.localizadores.length) return;
					items.push({
						key: "l:" + pref.id,
						kind: "localizador",
						label: LOCALIZADOR_LABEL,
						pref: { id: pref.id, name: pref.nome || pref.localizadores.join(" • "), createdAt: pref.createdAt, localizadores: pref.localizadores },
					});
				});
			}
			if (includeCombos) {
				const all = comboPreferencesFrom(data);
				const combos = Array.isArray(data[COMBOS_KEY]) ? data[COMBOS_KEY] : [];
				combos.forEach(function (combo) {
					items.push({
						key: "c:" + combo.id,
						kind: "combo",
						label: "🔗 Combo · " + combo.steps.length + (combo.steps.length === 1 ? " etapa" : " etapas"),
						pref: { id: combo.id, name: combo.name, createdAt: combo.createdAt },
						combo: combo,
						all: all,
					});
				});
			}

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
		if (item.kind === "combo") return removeCombo(item.combo.id);
		if (item.kind === "action") return removePreference(item.label, item.pref.id);
		if (item.kind === "localizador") {
			return chrome.storage.local.get([LOCALIZADOR_PREFS_KEY]).then(function (data) {
				const prefs = Array.isArray(data[LOCALIZADOR_PREFS_KEY]) ? data[LOCALIZADOR_PREFS_KEY] : [];
				return chrome.storage.local.set({
					[LOCALIZADOR_PREFS_KEY]: prefs.filter(function (p) {
						return p.id !== item.pref.id;
					}),
				});
			});
		}
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
		hint.textContent = 'Arraste os cards para mudar a ordem dentro do bloco, ou o título de um bloco para mudá-lo de lugar. A ordem é salva na hora. Clique em "✅ Concluir" ao terminar.';
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

		// Topo fixo ao rolar (painelPreferencias.js): título, "✏️ Editar
		// posição", a explicação do modo de edição, "Mostrar todas" e a busca.
		// Com a busca preenchida, todos os cards que a contêm aparecem (o
		// limite de FAV_VISIBLE_LIMIT não vale).
		panel.removeChild(header);
		panel.removeChild(hint);
		const pp = window.__pdpPainelPrefs;
		pp.topo(panel, {
			conteudo: [header, hint, footer],
			itens: ".pdp-qa-fav-card",
			grupos: ".pdp-qa-fav-group",
			rotulo: ".pdp-qa-fav-group-label",
			aoFiltrar: function () { if (grid.isConnected) applyVisibility(); }
		});

		function applyVisibility() {
			const cards = grid.querySelectorAll(".pdp-qa-fav-card");
			const searching = !!pp.termo(panel);
			const showAll = state.showAll || state.editing || searching;
			cards.forEach(function (card, index) {
				card.classList.toggle("pdp-qa-fav-hidden", !showAll && index >= FAV_VISIBLE_LIMIT);
			});
			grid.querySelectorAll(".pdp-qa-fav-group").forEach(function (box) {
				box.classList.toggle("pdp-qa-fav-hidden", !box.querySelector(".pdp-qa-fav-card:not(.pdp-qa-fav-hidden)"));
			});
			const hiddenCount = Math.max(0, cards.length - FAV_VISIBLE_LIMIT);
			footer.hidden = hiddenCount === 0 || searching;
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
			// Arrastar com cards escondidos pela busca embaralharia a ordem.
			const search = panel.querySelector(".pdp-pp-busca");
			if (search) {
				if (state.editing && search.value) {
					search.value = "";
					pp.filtrar(panel);
				}
				search.disabled = state.editing;
			}
			panel.classList.toggle("pdp-qa-fav-editing", state.editing);
			editBtn.textContent = state.editing ? "✅ Concluir" : "✏️ Editar posição";
			hint.hidden = !state.editing;
			grid.querySelectorAll(".pdp-qa-fav-card, .pdp-qa-fav-group-label").forEach(function (el) {
				el.draggable = state.editing;
			});
			applyVisibility();
		});

		let draggedCard = null;
		let draggedGroup = null;
		// Mesmo critério do painel "🔗 Combos" (qualquer aba da tela do processo).
		const comboCanRun = isOnAcoesScreen() || !!findMovimentarButton() || !!findLatestValidEventLink() || hasProcessoForm() || !!findBackToProcessUrl();

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

			const isCombo = item.kind === "combo";
			if (isCombo) card.classList.add("pdp-qa-fav-combo");
			const isLocalizador = item.kind === "localizador";
			const mode = isCombo
				? (comboCanRun ? "combo" : null)
				: item.kind === "juntar"
					? (window.__pdpJuntarDocumento && location.pathname.startsWith("/projudi/") ? "juntar" : null)
					: isLocalizador
						? (window.__pdpLocalizador && window.__pdpLocalizador.disponivel() ? "localizador" : null)
						: modeForLabel(item.label);

			const nameEl = document.createElement("span");
			nameEl.className = "pdp-qa-fav-card-name";
			nameEl.textContent = (isCombo ? "▶ " : "★ ") + item.pref.name;
			if (!isCombo && item.pref.movimento && item.pref.movimento.texto) {
				nameEl.textContent += " 📌";
				nameEl.title = 'Parte do movimento "' + item.pref.movimento.texto + '" (o mais recente com esse nome)';
			}
			card.appendChild(nameEl);

			const tools = document.createElement("span");
			tools.className = "pdp-qa-fav-tools";
			card.appendChild(tools);

			const editPrefBtn = document.createElement("button");
			editPrefBtn.type = "button";
			editPrefBtn.className = "pdp-qa-fav-edit";
			editPrefBtn.textContent = "✏️";
			editPrefBtn.draggable = false;
			editPrefBtn.disabled = !mode && !isCombo;
			editPrefBtn.title = isCombo
				? "Editar este combo (etapas, ordem e nome)"
				: isLocalizador && mode
					? "Editar esta preferência (nome e localizadores)"
					: mode
					? "Editar esta preferência: abre o diálogo preenchido com ela para ajustar os campos (e o nome) e salvar de novo"
					: '"' + item.label + '" não está disponível nesta tela para editar.';
			editPrefBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (isCombo) {
					openComboEditor(item.combo);
					return;
				}
				if (!mode) return;
				closePanel();
				if (mode === "localizador") {
					window.__pdpLocalizador.editar(item.pref);
					return;
				}
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
			delBtn.title = isCombo ? "Remover este combo (as preferências dele continuam salvas)" : "Remover esta preferência";
			delBtn.draggable = false;
			delBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				const question = isCombo
					? 'Remover o combo "' + item.pref.name + '"? As preferências dele continuam salvas.'
					: 'Remover a preferência "' + item.pref.name + '" de "' + item.label + '"?';
				if (!confirm(question)) return;
				removeFavItem(item).then(function () {
					const box = card.closest(".pdp-qa-fav-group");
					card.remove();
					if (box && !box.querySelector(".pdp-qa-fav-card")) box.remove();
					else if (box) updateFavGroupCount(box);
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

			if (isCombo) {
				if (!mode) card.classList.add("pdp-qa-fav-unavailable");
				card.title = (mode ? "Executar em sequência (cada etapa pede a confirmação de sempre):\n" : "Abra a tela do processo para executar:\n") +
					describeComboSteps(item.combo.steps, item.all);
			} else if (!mode && isLocalizador) {
				card.classList.add("pdp-qa-fav-unavailable");
				card.title = "Localizadores só podem ser associados na tela do processo do SEEU (com o \"+\" dos localizadores disponível):\n" + item.pref.localizadores.join("\n");
			} else if (!mode) {
				card.classList.add("pdp-qa-fav-unavailable");
				card.title = '"' + item.label + '" não está disponível nesta tela. Abra a aba "Movimentações" do processo.';
			} else if (isLocalizador) {
				card.title = "Associar ao processo:\n" + item.pref.localizadores.join("\n");
			} else if (item.kind === "juntar") {
				card.title = 'Juntar Documento com a preferência "' + item.pref.name + '"';
			} else {
				card.title = mode === "custom"
					? 'Abre "' + item.label + '" já preenchido com esta preferência'
					: 'Preenche automaticamente e pede 1 confirmação para executar "' + item.label + '"';
				if (item.pref.descricao) card.title += "\n" + item.pref.descricao;
			}
			// O nome pode aparecer cortado ("…") no card: vai inteiro no balão.
			card.title = (isCombo ? "▶ " : "★ ") + item.pref.name + "\n" + card.title;

			function activate() {
				if (state.editing || !mode) return;
				closePanel();
				if (mode === "localizador") {
					window.__pdpLocalizador.aplicar(item.pref);
					return;
				}
				if (mode === "combo") {
					executarComPendencias('🔗 Combo "' + item.combo.name + '" (' + item.combo.steps.length + " etapas)", true, function () {
						startCombo(item.combo);
					});
					return;
				}
				executarComPendencias("★ " + item.pref.name + " — " + item.label, false, function () {
					removeConfirmBar();
					removeCaptureToolbar();
					if (mode === "juntar") window.__pdpJuntarDocumento.apply(item.pref);
					else if (mode === "custom") applyPreferenceCustom(item.label, item.pref);
					else if (mode === "hop") applyPreferenceViaChain(item.label, item.pref);
					else applyPreference(item.label, item.pref);
				});
			}
			card.addEventListener("click", activate);
			card.addEventListener("keydown", function (e) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					activate();
				}
			});

			card.addEventListener("dragstart", function (e) {
				e.stopPropagation();
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
			// Card só troca de lugar dentro do próprio bloco.
			card.addEventListener("dragover", function (e) {
				if (!draggedCard || draggedCard === card || draggedCard.parentNode !== card.parentNode) return;
				e.preventDefault();
				e.stopPropagation();
				e.dataTransfer.dropEffect = "move";
				card.classList.add("pdp-qa-fav-over");
			});
			card.addEventListener("dragleave", function () {
				card.classList.remove("pdp-qa-fav-over");
			});
			card.addEventListener("drop", function (e) {
				if (!draggedCard) return;
				e.preventDefault();
				e.stopPropagation();
				card.classList.remove("pdp-qa-fav-over");
				if (draggedCard === card || draggedCard.parentNode !== card.parentNode) return;
				const cards = Array.prototype.slice.call(card.parentNode.children);
				const movingForward = cards.indexOf(draggedCard) < cards.indexOf(card);
				card.insertAdjacentElement(movingForward ? "afterend" : "beforebegin", draggedCard);
				persistOrder();
			});

			return card;
		}

		// Blocos: arrastados pelo título, trocam de lugar entre si.
		function makeGroupDraggable(box) {
			const label = box.querySelector(".pdp-qa-fav-group-label");
			label.title += " — em \"Editar posição\", arraste por aqui para mudar o bloco de lugar";
			label.addEventListener("dragstart", function (e) {
				if (!state.editing) {
					e.preventDefault();
					return;
				}
				draggedGroup = box;
				box.classList.add("pdp-qa-fav-dragging");
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", box.dataset.group);
			});
			label.addEventListener("dragend", function () {
				box.classList.remove("pdp-qa-fav-dragging");
				grid.querySelectorAll(".pdp-qa-fav-over").forEach(function (c) {
					c.classList.remove("pdp-qa-fav-over");
				});
				draggedGroup = null;
			});
			box.addEventListener("dragover", function (e) {
				if (!draggedGroup || draggedGroup === box) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				box.classList.add("pdp-qa-fav-over");
			});
			box.addEventListener("dragleave", function (e) {
				if (!box.contains(e.relatedTarget)) box.classList.remove("pdp-qa-fav-over");
			});
			box.addEventListener("drop", function (e) {
				if (!draggedGroup) return;
				e.preventDefault();
				box.classList.remove("pdp-qa-fav-over");
				if (draggedGroup === box) return;
				const boxes = Array.prototype.slice.call(grid.children);
				const movingForward = boxes.indexOf(draggedGroup) < boxes.indexOf(box);
				box.insertAdjacentElement(movingForward ? "afterend" : "beforebegin", draggedGroup);
				persistOrder();
				applyVisibility();
			});
		}

		function showEmpty() {
			const empty = document.createElement("div");
			empty.className = "pdp-qa-empty";
			empty.textContent = 'Nenhuma preferência ou combo salvo ainda. Crie uma preferência com "+ Nova preferência" no painel de qualquer ação.';
			grid.replaceWith(empty);
			editBtn.hidden = true;
			hint.hidden = true;
		}

		loadFavItemsWith(true).then(function (items) {
			if (activePanel !== panel) return; // painel já fechado/trocado
			if (!items.length) {
				showEmpty();
			} else {
				buildFavGroups(grid, items, buildCard).forEach(makeGroupDraggable);
			}
			pp.filtrar(panel);
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
		// Monta os blocos por ação (mesmo visual de "Minhas Preferências")
		// em `container`, com buildCard(item) para cada card.
		buildFavGroups: buildFavGroups,
		// Aplica uma preferência de ação (não "Juntar Documento" nem ações
		// personalizadas) partindo de uma tela já carregada em segundo plano
		// (`origem` = { doc, url }, ex.: a tela do processo) - mesmo popup,
		// mesmo preenchimento e mesma barra "Sim, executar" das demais. Os
		// `hooks` ({ onSubmit, onDone, onClose, onFail }) informam quem
		// chamou; a tela por trás não é recarregada ao fim.
		// Combos salvos e as preferências que eles referenciam (por rótulo da
		// ação, com as do "Juntar Documento" em "Juntar Documento").
		loadCombos: loadCombos,
		loadComboPreferences: loadComboPreferences,
		findComboPref: findPref,
		comboPendingKey: COMBO_PENDING_KEY,
		// Etapas que só rodam na tela do processo (navegam a aba ou usam
		// telas próprias): "Juntar Documento", ações personalizadas e as
		// etapas diretas (Alterar Classe/Assuntos, Localizador).
		stepNeedsProcessScreen: function (label) {
			return label === JUNTAR_LABEL || !!getCustomAction(label) || label === "Alvará Eletrônico" || !!DIRECT_STEPS[label];
		},
		// Abre/fecha o painel de um grupo cujo botão é de outro arquivo
		// (ex.: "⚖️ Advogados", de habilitarAdvogado.js, com
		// data-panel-id="advogados").
		closePanel: closePanel,
		togglePanelById: function (id) {
			const group = ACTION_GROUPS.filter(function (g) {
				return g.id === id;
			})[0];
			if (group) togglePanel(group);
		},
		applyPreferenceFrom: function (label, pref, origem, hooks) {
			closePanel();
			removeConfirmBar();
			removeCaptureToolbar();
			applyPreferenceViaChain(label, pref, false, origem, Object.assign({ noReload: true }, hooks || {}));
		},
		// `hooks` (opcional, ver modalHooks): quem abre a partir de uma
		// listagem (ex.: decursoNaLinha.js) fica sabendo do fechamento, e a
		// tela por trás não é recarregada ao fim.
		openActionModal: function (label, url, hooks) {
			const iframe = showActionModal(label);
			if (hooks) modalHooks = Object.assign({ noReload: true }, hooks);
			if (url) iframe.src = url;
			return iframe;
		},
		// Fecha o popup aberto por openActionModal quando quem o abriu
		// detecta o fim da ação (ver alterarClasseAssuntos.js).
		closeActionModal: function () {
			removeActionModal("auto");
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
