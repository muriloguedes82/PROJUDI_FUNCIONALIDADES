// Projudi/SEEU - Pré-visualização de Documentos
//
// Ao passar o mouse sobre um link de arquivo na tela de Movimentações
// (ex.: <a class="link" target="_blank" href=".../arquivo.do?...">Certidao.pdf</a>),
// mostra a íntegra do documento em um painel flutuante, sem abrir nova aba.
// O documento é carregado num <iframe> apontando para a própria URL do
// sistema (Projudi ou SEEU — os dois usam o mesmo padrão de link e de
// sessão via cookies), reaproveitando a sessão/cookies já autenticados do
// usuário. O quadro de "Pendências" (mais abaixo) é específico do Projudi;
// no SEEU esse trecho simplesmente não encontra nada e não tem efeito.
//
// O mesmo painel flutuante é oferecido para os itens do quadro
// "Pendências" (ex.: "Análise de Juntadas: Há 1 pendência(s) de análise de
// juntada", "Análise de Conclusões: ..."). Nesse caso o link da pendência
// não aponta direto para um documento, e sim para uma tela de análise
// (ex.: analisarJuntada.do) que lista uma ou mais juntadas/conclusões
// pendentes; o link do documento de cada uma só existe no DOM depois que o
// próprio JS da página expande a linha (ícone "+") e carrega o resultado
// via AJAX. Por isso, ao passar o mouse sobre a pendência, carregamos essa
// tela dentro de um <iframe> oculto (mesma sessão/cookies do usuário),
// clicamos programaticamente nos mesmos ícones "+" que o usuário clicaria
// manualmente — disparando a mesma listagem, somente leitura, sem aceitar
// ou rejeitar nada — esperamos o resultado ser inserido no DOM e então
// abrimos um painel de pré-visualização para cada documento encontrado. Se
// houver mais de uma juntada/conclusão pendente, abrimos uma janela de
// pré-visualização para cada uma delas.
//
// A pendência "Cumprimentos Aguardando Análise de Retorno" (mandados
// devolvidos, ex.: "Mandado: 01") segue um padrão parecido, mas o link da
// pendência abre uma tela de LISTAGEM (cumprimentoCartorioMandado.do) sem
// ícone "+" nem checkbox — cada linha pendente só abre a análise de
// verdade depois de um clique na DATA da coluna "Ordenação" (<a
// class="url">). Por isso, ao carregar essa listagem em segundo plano,
// buscamos (via fetch(), mesma sessão) a tela de análise de cada mandado
// pendente diretamente por essa URL, sem precisar desse clique manual
// extra ("Mandado - Processo ..."), e coletamos só o(s) documento(s) do
// campo "Documento(s) Retornado(s):" dessa tela — o(s) arquivo(s) que o
// oficial de justiça anexou ao devolver o mandado. Normalmente é uma
// certidão textual (ex.: "INTIMEI ( ) NÃO INTIMEI ( ) CITEI ( ) NÃO CITEI
// ( ) ... PROCEDI À ..."), com o resultado assinalado à mão/por cima do
// texto impresso — ou seja, SEM nenhum campo de formulário real no PDF, o
// que torna a extração automática de texto pouco confiável bem nos trechos
// que importam (a marcação embaralha com a palavra ao lado). Por isso essa
// certidão só é mostrada para leitura humana na pré-visualização; nenhuma
// marcação é interpretada automaticamente. Os demais documentos dessa
// mesma tela ("Documento(s) do Processo/Recurso", mais abaixo) não têm
// relação com o retorno deste mandado e por isso são ignorados.
//
// Cada painel de pré-visualização de um documento retornado ganha também
// um botão "Analisar Retorno", que reproduz o clique no botão de mesmo
// nome da tela de detalhe do mandado (ver `extractAnalisarRetornoAction` e
// `submitAnalisarRetorno`), poupando os dois cliques manuais anteriores
// (abrir a pendência, depois a data na coluna "Ordenação"). Esse botão
// mostra a tela seguinte ("Marcar Leitura" + "Resultado do Cumprimento")
// num POPUP sobreposto à tela atual — a mesma técnica (mesmo popup,
// inclusive) já usada pelo botão "(Des)Habilitar Advogado" (ver README,
// "(Des)Habilitar Advogado", e `showActionModal`/`openActionModalPost` em
// quickActions.js): a aba de verdade NUNCA navega. Nenhum campo dessa tela
// é preenchido automaticamente, pelo mesmo motivo acima — quem decide o
// resultado é sempre o usuário, depois de ler a certidão, dentro do
// próprio popup.
//
// Há ainda um segundo botão, "Analisar Retorno", inserido direto no quadro
// de Pendências logo depois do próprio link (ex.: depois de "Mandado:
// 01") — mesmo padrão de botão inline já usado para outras pendências
// desta extensão (ver "Dispensar juntadas" em juntadaDrag.js e "Finalizar
// conclusão" em finalizarConclusao.js). Ele dispensa até passar o mouse:
// busca a análise em segundo plano e, havendo um único mandado pendente
// naquele link, já abre esse mesmo popup direto na última tela. Havendo
// mais de um mandado pendente no mesmo link, não escolhe por conta própria
// qual analisar — pede para o usuário passar o mouse sobre o link e
// escolher pelo painel de pré-visualização de cada mandado.
//
// Há ainda um terceiro botão, igual aos dois primeiros, mas na própria
// tela de listagem de mandados (cumprimentoCartorioMandado.do?actionType=
// listar) — a mesma que os dois botões acima acabam abrindo em segundo
// plano, mas que também pode ser a página de verdade que o usuário está
// vendo (ex.: um oficial de cartório que abre essa listagem direto, sem
// passar pelo quadro de Pendências de um processo específico). Nela, cada
// linha pendente já tem a data/hora de ordenação (<a class="url">) na
// coluna "Ordenação" — o botão é inserido logo abaixo dessa data/hora, na
// mesma célula (ver `scanMandadoListButtons` e `.pdp-analisar-retorno-
// mandado-row` em content.css), e abre o mesmo popup direto na última tela
// daquele mandado, sem navegar a aba de verdade.

(function () {
	"use strict";

	const LOADER_ATTR = "data-pdp-loader";
	const MESSAGE_SOURCE = "projudi-preview";
	const DOC_LINK_HREF_MARKER = "/arquivo.do";

	// ---------------------------------------------------------------------
	// Tela de "Cumprimentos Aguardando Análise de Retorno" (mandados
	// devolvidos, ex.: cumprimentoCartorioMandado.do?actionType=listar) —
	// helpers compartilhados entre runLoaderMode() (busca em segundo plano,
	// disparada pelo hover na pendência ou pelo botão do quadro de
	// Pendências) e o botão inline da própria tela de listagem (mais abaixo,
	// no frame de verdade — ver scanMandadoListRowButtons). Diferente das
	// telas de Análise de Juntadas/Conclusões, aqui não há ícone "+" nem
	// checkbox — a análise de cada mandado só começa ao clicar na DATA da
	// coluna "Ordenação" (<a class="url">), que navega para a tela de
	// análise daquele mandado específico (confirmado a partir do .mhtml da
	// tela de listagem: <table class="resultTable">, uma linha por mandado
	// pendente, com <a class="url">DD/MM/AAAA HH:mm</a> na primeira coluna
	// de dados). Precisam ficar aqui, ANTES do `if (loaderToken)` logo
	// abaixo — runLoaderMode() pode chamá-las de imediato quando o próprio
	// frame já é o de busca em segundo plano, e uma `const` declarada mais
	// abaixo no arquivo ainda não teria sido inicializada nesse momento
	// (temporal dead zone).
	// ---------------------------------------------------------------------

	const MANDADO_ROW_LINK_SELECTOR = "table.resultTable a.url[href]";

	function isMandadoListScreen() {
		return !!(document.getElementById("cumprimentoCartorioMandadoForm") || document.querySelector(MANDADO_ROW_LINK_SELECTOR));
	}

	function findMandadoRowLinks() {
		return Array.prototype.slice.call(document.querySelectorAll(MANDADO_ROW_LINK_SELECTOR));
	}

	// Busca a tela de análise de um mandado específico (destino do clique na
	// data) e devolve o Document já decodificado — mesma técnica (fetch +
	// detecção de charset a partir do <meta charset>/cabeçalho HTTP) já
	// usada em suspensaoAtiva.js e oraculoDirect.js para outras telas do
	// Projudi, que também são servidas em windows-1252.
	function fetchMandadoAnalise(href) {
		return fetch(href, { credentials: "same-origin" })
			.then(function (response) {
				if (!response.ok) throw new Error("Projudi respondeu " + response.status + " " + response.statusText);
				return response.arrayBuffer().then(function (bytes) {
					const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
					const charsetMatch =
						/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") ||
						/charset\s*=\s*["']?([\w-]+)/i.exec(preview);
					const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
					const html = new TextDecoder(charset).decode(bytes);
					return new DOMParser().parseFromString(html, "text/html");
				});
			})
			.catch(function (err) {
				console.warn("[Projudi Preview] falha ao buscar análise do mandado:", { href: href, erro: err && (err.stack || err.message || err) });
				return null;
			});
	}

	// `baseURL` é necessário para `scope` vindo de um documento buscado via
	// fetch() (ex.: a tela de análise de um mandado, ver
	// `fetchMandadoAnalise`) — um Document criado por DOMParser não sabe a
	// URL de onde veio, então um href relativo (ex.: "arquivo.do?...")
	// precisa ser resolvido contra a URL que foi buscada, não contra
	// `document.baseURI` (que aqui é a URL desta própria página/iframe,
	// ex.: a listagem de mandados, não a tela de análise).
	function collectDocsFrom(scope, baseURL) {
		const anchors = Array.prototype.slice.call(scope.querySelectorAll("a.link"));
		const docs = [];

		anchors.forEach(function (a) {
			const href = a.getAttribute("href") || "";
			if (href.indexOf(DOC_LINK_HREF_MARKER) === -1) return;

			let absolute;
			try {
				absolute = new URL(href, baseURL || document.baseURI).href;
			} catch (e) {
				absolute = href;
			}

			docs.push({ href: absolute, text: (a.textContent || "Documento").trim() });
		});

		return docs;
	}

	// Normaliza um rótulo de campo para comparação: remove acentos, baixa
	// caixa, colapsa espaços e ignora o sufixo "(s)" de plural opcional
	// (ex.: "Documento(s) Retornado(s):" e "Documento Retornado:" devem
	// casar com o mesmo padrão).
	function normalizeLabel(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\(s\)/gi, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase()
			.replace(/:$/, "");
	}

	// Na tela de análise de um mandado ("Mandado - Processo ..."), o
	// campo "Documento(s) Retornado(s):" traz o(s) arquivo(s) que o
	// oficial de justiça anexou ao devolver o mandado — normalmente uma
	// certidão de cumprimento (às vezes com o resultado assinalado por
	// checkbox: intimou/não intimou, citou/não citou, procedeu à
	// diligência, etc.), texto que geralmente já basta para saber o
	// resultado sem abrir mais nada. Essa é a informação que interessa
	// aqui — não os demais documentos do processo, listados mais abaixo
	// nessa mesma tela ("Documento(s) do Processo/Recurso"), que não têm
	// relação com o retorno deste mandado específico.
	const DOCUMENTOS_RETORNADOS_LABEL = normalizeLabel("Documento(s) Retornado(s):");

	function findDocumentosRetornadosRow(doc) {
		const candidates = doc.querySelectorAll("td, span, label, div");
		for (const el of candidates) {
			const ownText = Array.prototype.slice
				.call(el.childNodes)
				.filter(function (node) {
					return node.nodeType === 3; // Node.TEXT_NODE
				})
				.map(function (node) {
					return node.textContent;
				})
				.join("");
			if (normalizeLabel(ownText) !== DOCUMENTOS_RETORNADOS_LABEL) continue;
			const row = el.closest("tr") || el.parentElement;
			if (row) return row;
		}
		return null;
	}

	// Coleta só os documentos do campo "Documento(s) Retornado(s):"
	// (ver acima). Se o campo não for encontrado (ex.: Projudi mudou o
	// texto do rótulo numa vara/versão diferente), cai de volta para
	// coletar a tela de análise inteira, para não deixar de mostrar nada.
	function collectDocumentosRetornados(doc, baseURL) {
		const row = findDocumentosRetornadosRow(doc);
		if (row) return collectDocsFrom(row, baseURL);
		console.warn('[Projudi Preview] campo "Documento(s) Retornado(s)" não encontrado na tela de análise do mandado — usando a tela inteira');
		return collectDocsFrom(doc, baseURL);
	}

	// Na tela de análise de um mandado, o botão "Analisar Retorno" (ex.:
	// <input type="button" id="removeButton" value="Analisar Retorno"
	// onclick="submitPage('URL', document.cumprimentoCartorioMandadoForm)">)
	// segue o mesmo padrão de outros botões dessa tela (ex.: "Voltar") — a
	// função `submitPage(url, form)` do próprio Projudi troca a `action` do
	// formulário e o submete (POST) de verdade. Para reproduzir esse
	// clique mais tarde, na aba de verdade (ver `submitAnalisarRetorno`),
	// extraímos aqui a URL de destino e os campos atuais do formulário (via
	// FormData, mesma técnica de fetchAbaInformacoesAdicionaisPOST em
	// suspensaoAtiva.js) — sem preencher nem alterar nenhum campo, só
	// copiando o que a tela já trouxe preenchido para aquele mandado
	// específico.
	const ANALISAR_RETORNO_LABEL = normalizeLabel("Analisar Retorno");

	function extractAnalisarRetornoAction(doc, baseURL) {
		const form = doc.getElementById("cumprimentoCartorioMandadoForm");
		if (!form) return null;

		const button =
			doc.getElementById("removeButton") ||
			Array.prototype.slice
				.call(doc.querySelectorAll('input[type="button"], input[type="submit"], button'))
				.find(function (b) {
					return normalizeLabel(b.value || b.textContent) === ANALISAR_RETORNO_LABEL;
				});
		if (!button) return null;

		const match = /submitPage\(\s*['"]([^'"]+)['"]/.exec(button.getAttribute("onclick") || "");
		if (!match) return null;

		let url;
		try {
			url = new URL(match[1], baseURL).href;
		} catch (e) {
			url = match[1];
		}

		const fields = [];
		new FormData(form).forEach(function (value, name) {
			if (typeof value === "string") fields.push([name, value]);
		});

		return { url: url, fields: fields };
	}

	const loaderToken = (function () {
		try {
			return window.frameElement && window.frameElement.getAttribute(LOADER_ATTR);
		} catch (e) {
			return null;
		}
	})();

	if (loaderToken) {
		runLoaderMode(loaderToken);
		return;
	}

	// Evita rodar duas vezes no mesmo frame (ex.: reinjeção manual, ou
	// bordas de casos em que o manifest injeta o script mais de uma vez) —
	// duas instâncias concorrentes tentando criar/reconciliar os mesmos
	// elementos causariam duplicação e comportamento inconsistente.
	if (window.__pdpWaInjected) return;
	window.__pdpWaInjected = true;

	console.log("[Projudi Preview] content script carregado em", window.location.href);

	const OPEN_DELAY_MS = 350;
	const CLOSE_DELAY_MS = 250;
	const PANEL_WIDTH = 780;
	const PANEL_HEIGHT_RATIO = 0.85;
	const MARGIN = 12;
	const CASCADE_OFFSET = 28;
	const PENDENCIA_TIMEOUT_MS = 8000;

	const PENDENCIA_FIELDSET_SELECTOR = "#quadroPendencias";

	// No SEEU (só lá — no Projudi não houve esse conflito), a extensão
	// AzFlow também oferece pré-visualização de documentos ao passar o
	// mouse, disputando o mesmo tipo de interação. Tentar "vencer" esse
	// conflito silenciando os eventos da AzFlow já mostrou ter efeitos
	// colaterais (quebrou o reposicionamento da barra de botões dela) —
	// então, em vez disso, quando o AzFlow está ativo no SEEU, esta
	// extensão simplesmente não abre sua própria pré-visualização, e deixa
	// o AzFlow cuidar disso sozinho. O restante (seleção de documentos e
	// envio por WhatsApp) continua funcionando normalmente, já que não é
	// algo que o AzFlow ofereça.
	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(window.location.hostname);

	// O AzFlow injeta atributos/classes com esse prefixo por toda a página
	// quando está ativo (confirmado inspecionando o SEEU com ele habilitado:
	// "data-azflow-onclick-original", "azflow-button-text", etc.). Sem esses
	// marcadores, consideramos que o AzFlow não está rodando. O resultado é
	// guardado em cache (uma vez detectado, continua detectado) para não
	// repetir essa consulta a cada evento de mouseover.
	const AZFLOW_MARKER_SELECTOR =
		'[class*="azflow-"], [id*="azflow-"], [data-azflow-onclick-original], [data-azflow-menucs-applied]';
	let azFlowDetected = false;

	function isAzFlowActive() {
		if (azFlowDetected) return true;
		if (document.querySelector(AZFLOW_MARKER_SELECTOR)) {
			azFlowDetected = true;
			return true;
		}
		return false;
	}

	function shouldDeferPreviewToAzFlow() {
		return IS_SEEU && isAzFlowActive();
	}

	let openTimer = null;
	let closeTimerDoc = null;
	let closeTimerPendencia = null;

	// --- pré-visualização simples (link de documento, ex.: aba Movimentações) ---
	let docPanel = null;
	let activeDocLink = null;

	// --- pré-visualização das pendências (Análise de Juntadas / Conclusões) ---
	// pode abrir mais de um painel, um para cada juntada/conclusão pendente
	let pendenciaPanels = [];
	let activePendenciaLink = null;
	let pendenciaLoader = null; // { iframe, token, cleanup }
	let movementMultipleNotice = null;
	let movementInPlaceLoad = null; // { link }

	function isDocumentLink(el) {
		if (!(el instanceof HTMLAnchorElement)) return false;
		if (!el.classList.contains("link")) return false;
		const href = el.getAttribute("href") || "";
		return href.indexOf(DOC_LINK_HREF_MARKER) !== -1;
	}

	function findDocumentLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isDocumentLink(link) ? link : null;
	}

	function isPendenciaLink(el) {
		if (!(el instanceof HTMLAnchorElement)) return false;
		if (!el.classList.contains("link")) return false;
		if (isDocumentLink(el)) return false; // esse já é tratado pelo preview simples
		if (!el.getAttribute("href")) return false;
		return !!el.closest(PENDENCIA_FIELDSET_SELECTOR);
	}

	function findPendenciaLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isPendenciaLink(link) ? link : null;
	}

	// Link textual da movimentação. Só é elegível quando a própria linha
	// possui o controle "Arquivos"; linhas que têm apenas "Intimações" ou
	// nenhum anexo continuam com o comportamento nativo, sem Preview vazio.
	// Mesmo critério (id, não class) já usado e comprovado em
	// expandMovements.js e no modo loader mais abaixo (EXPAND_ICON_SELECTOR).
	function movementFileToggle(link) {
		const row = link && link.closest('tr[id^="mov1Grau,"]');
		return row && row.querySelector('img[onclick*="showDetail"], a[id^="linkArquivos"] img');
	}

	function isMovementLink(el) {
		if (!(el instanceof HTMLAnchorElement) || !el.classList.contains("link")) return false;
		if (!movementFileToggle(el)) return false;
		try {
			return new URL(el.getAttribute("href"), document.baseURI).pathname === "/projudi/movimentacao.do";
		} catch (e) {
			return false;
		}
	}

	function findMovementLink(target) {
		if (!(target instanceof Element)) return null;
		const link = target.closest("a.link");
		return isMovementLink(link) ? link : null;
	}

	function findPreviewGroupLink(target) {
		return findPendenciaLink(target) || findMovementLink(target);
	}

	// Localiza o contêiner que o Projudi preenche ao expandir o "+" de uma
	// linha, a partir do próprio ícone — mesmo critério do modo loader
	// (ver findContainerForIcon em runLoaderMode, mais abaixo): tenta o id
	// explícito no onclick="showDetail('id', ...)" e, na falta dele, o
	// sufixo numérico do id do ícone (ex.: "icon0" -> "row0"/"div0").
	function movementDocsContainer(toggle) {
		const onclick = toggle.getAttribute("onclick") || "";
		const explicit = onclick.match(/showDetail\(\s*['"]([^'"]+)/);
		if (explicit) {
			const byArg = document.getElementById(explicit[1]);
			if (byArg) return byArg;
		}
		const suffixMatch = (toggle.id || "").match(/(\d+)$/);
		if (suffixMatch) {
			const suffix = suffixMatch[1];
			return document.getElementById("row" + suffix) || document.getElementById("div" + suffix);
		}
		return null;
	}

	// Se o usuário já abriu o "+", usa os links que estão na página e evita
	// qualquer nova consulta.
	function loadedMovementDocs(link) {
		const toggle = movementFileToggle(link);
		if (!toggle) return [];
		const container = movementDocsContainer(toggle);
		if (!container) return [];
		return Array.prototype.slice
			.call(container.querySelectorAll('a.link[href*="/arquivo.do"]'))
			.filter(isDocumentLink)
			.map(function (docLink) {
				return {
					href: new URL(docLink.getAttribute("href"), document.baseURI).href,
					text: (docLink.textContent || "Documento").trim(),
				};
			});
	}

	function buildPanel() {
		const wrap = document.createElement("div");
		wrap.className = "pdp-overlay";
		wrap.innerHTML =
			'<div class="pdp-panel" role="dialog" aria-label="Pré-visualização do documento">' +
			'  <div class="pdp-header">' +
			'    <span class="pdp-title">Documento</span>' +
			'    <div class="pdp-actions">' +
			'      <button type="button" class="pdp-analisar-retorno" hidden>Analisar Retorno ↗</button>' +
			'      <a class="pdp-open-tab" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' +
			'      <button type="button" class="pdp-close" title="Fechar (Esc)">✕</button>' +
			"    </div>" +
			"  </div>" +
			'  <div class="pdp-body">' +
			'    <div class="pdp-loading">Carregando documento…</div>' +
			'    <iframe class="pdp-frame" referrerpolicy="no-referrer"></iframe>' +
			"  </div>" +
			"</div>";
		document.body.appendChild(wrap);

		const frame = wrap.querySelector(".pdp-frame");
		frame.addEventListener("load", function () {
			wrap.classList.add("pdp-loaded");
		});

		const panel = {
			wrap: wrap,
			frame: frame,
			title: wrap.querySelector(".pdp-title"),
			openTab: wrap.querySelector(".pdp-open-tab"),
			analisarRetorno: wrap.querySelector(".pdp-analisar-retorno"),
			onClose: null,
		};

		wrap.querySelector(".pdp-close").addEventListener("click", function () {
			if (panel.onClose) panel.onClose();
		});

		panel.analisarRetorno.addEventListener("click", function () {
			if (panel.analisarRetornoAction) submitAnalisarRetorno(panel.analisarRetornoAction);
		});

		return panel;
	}

	// Reproduz o clique no botão "Analisar Retorno" da tela de detalhe de um
	// mandado — poupando o usuário dos dois cliques manuais anteriores
	// (abrir a pendência, depois a data na coluna "Ordenação"). Mostra a
	// tela seguinte ("Marcar Leitura" + "Resultado do Cumprimento") num
	// POPUP sobreposto à tela atual, em vez de navegar a aba de verdade —
	// mesma técnica já usada pelo botão "(Des)Habilitar Advogado" (ver
	// `openActionModalPost`/`showActionModal` em quickActions.js): a aba
	// visível NUNCA navega, o usuário faz a análise dentro do popup e fecha
	// com "✕ Fechar" quando terminar. NÃO preenche nenhum campo dessa tela:
	// a marcação de opções na certidão do oficial de justiça é feita por
	// cima do texto impresso (sem nenhum campo de formulário real no PDF), o
	// que torna a leitura automática dessas marcações não confiável o
	// bastante para preencher um registro do processo sem revisão humana —
	// por isso o preenchimento continua 100% manual, só a navegação até a
	// tela é automática.
	//
	// `action.url` e `action.fields` vêm do próprio botão "Analisar Retorno"
	// da tela de detalhe do mandado (extraído em segundo plano por
	// `extractAnalisarRetornoAction`, dentro do iframe de busca) — mesmo
	// destino e mesmos campos que o botão de verdade enviaria via
	// `submitPage(url, form)`; `openActionModalPost` reproduz esse mesmo POST,
	// só que direcionado ao iframe do popup em vez da aba inteira.
	function submitAnalisarRetorno(action) {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModalPost !== "function") {
			alert('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
			return;
		}
		api.openActionModalPost("Analisar Retorno", action.url, action.fields);
	}

	function positionPanel(panel, link, cascadeIndex) {
		const rect = link.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(PANEL_WIDTH, vw - MARGIN * 2);
		const height = Math.min(vh * PANEL_HEIGHT_RATIO, vh - MARGIN * 2);
		const cascade = (cascadeIndex || 0) * CASCADE_OFFSET;

		let left = rect.right + MARGIN + cascade;
		if (left + width > vw - MARGIN) {
			left = rect.left - MARGIN - width - cascade;
		}
		if (left < MARGIN || left + width > vw - MARGIN) {
			left = Math.max(MARGIN, Math.min((vw - width) / 2 + cascade, vw - width - MARGIN));
		}

		let top = rect.top - height / 2 + rect.height / 2 + cascade;
		top = Math.min(Math.max(top, MARGIN), vh - height - MARGIN);

		panel.wrap.style.left = left + "px";
		panel.wrap.style.top = top + "px";
		panel.wrap.style.width = width + "px";
		panel.wrap.style.height = height + "px";
	}

	// ---------------------------------------------------------------------
	// Pré-visualização simples (link de documento)
	// ---------------------------------------------------------------------

	// Algumas telas trocam de aba (Movimentações, Partes e Outros, etc.)
	// substituindo trechos do DOM via AJAX, o que remove nosso painel da
	// página mesmo com a variável "docPanel" continuando preenchida — por
	// isso também conferimos "isConnected" (só é verdadeiro enquanto o nó
	// ainda está de fato na página) e recriamos o painel quando ele tiver
	// sido desconectado, senão a pré-visualização para de aparecer depois
	// de voltar para a aba de Movimentações.
	function ensureDocPanel() {
		// Se o painel antigo ficou "órfão" (a página substituiu o contêiner
		// que o continha, ex.: ao trocar de aba do processo), ele já não faz
		// mais parte do documento visível — descarta e recria do zero.
		if (docPanel && !docPanel.wrap.isConnected) docPanel = null;
		if (docPanel) return docPanel;
		docPanel = buildPanel();
		docPanel.wrap.addEventListener("mouseenter", cancelCloseDoc);
		docPanel.wrap.addEventListener("mouseleave", scheduleCloseDoc);
		docPanel.onClose = closeDocNow;
		return docPanel;
	}

	function showDoc(link) {
		const panel = ensureDocPanel();
		const href = link.getAttribute("href");
		const filename = (link.textContent || "Documento").trim();

		if (activeDocLink === link && panel.wrap.classList.contains("pdp-visible")) {
			return;
		}
		activeDocLink = link;

		panel.wrap.classList.remove("pdp-loaded");
		panel.title.textContent = filename;
		panel.openTab.href = href;
		panel.frame.src = href;

		positionPanel(panel, link, 0);
		panel.wrap.classList.add("pdp-visible");
	}

	function closeDocNow() {
		if (!docPanel) return;
		docPanel.wrap.classList.remove("pdp-visible", "pdp-loaded");
		docPanel.frame.src = "about:blank";
		activeDocLink = null;
	}

	function scheduleCloseDoc() {
		cancelOpen();
		clearTimeout(closeTimerDoc);
		closeTimerDoc = setTimeout(closeDocNow, CLOSE_DELAY_MS);
	}

	function cancelCloseDoc() {
		clearTimeout(closeTimerDoc);
	}

	// ---------------------------------------------------------------------
	// Pré-visualização das pendências (Análise de Juntadas / Conclusões)
	// ---------------------------------------------------------------------

	function closeAllPendenciaPanels() {
		pendenciaPanels.forEach(function (panel) {
			panel.frame.src = "about:blank";
			panel.wrap.remove();
		});
		pendenciaPanels = [];
		if (movementMultipleNotice) movementMultipleNotice.remove();
		movementMultipleNotice = null;
		activePendenciaLink = null;
	}

	window.addEventListener("pdp-juntada-action-start", function () {
		cancelOpen();
		cleanupPendenciaLoader();
		closeAllPendenciaPanels();
	});

	function scheduleClosePendencia() {
		cancelOpen();
		clearTimeout(closeTimerPendencia);
		closeTimerPendencia = setTimeout(closeAllPendenciaPanels, CLOSE_DELAY_MS);
	}

	function cancelClosePendencia() {
		clearTimeout(closeTimerPendencia);
	}

	function attachPendenciaPanelBehavior(panel) {
		panel.wrap.addEventListener("mouseenter", cancelClosePendencia);
		panel.wrap.addEventListener("mouseleave", scheduleClosePendencia);
	}

	function showPendenciaMessage(link, message) {
		closeAllPendenciaPanels();

		const panel = buildPanel();
		attachPendenciaPanelBehavior(panel);
		panel.onClose = closeAllPendenciaPanels;
		panel.title.textContent = "Pendências";
		panel.openTab.href = link.getAttribute("href");

		const body = panel.wrap.querySelector(".pdp-body");
		panel.frame.remove();
		const msg = document.createElement("div");
		msg.className = "pdp-message";
		msg.textContent = message;
		body.appendChild(msg);

		positionPanel(panel, link, 0);
		panel.wrap.classList.add("pdp-visible", "pdp-loaded");

		pendenciaPanels = [panel];
		activePendenciaLink = link;
	}

	function positionMovementMultipleNotice(notice, link) {
		const rect = link.getBoundingClientRect();
		const margin = 8;
		const noticeRect = notice.getBoundingClientRect();
		let left = rect.right + margin;
		if (left + noticeRect.width > window.innerWidth - margin) {
			left = Math.max(margin, rect.left - margin - noticeRect.width);
		}
		let top = rect.top + (rect.height - noticeRect.height) / 2;
		top = Math.max(margin, Math.min(top, window.innerHeight - noticeRect.height - margin));
		notice.style.left = left + "px";
		notice.style.top = top + "px";
	}

	function showMovementMultipleNotice(link, count) {
		closeAllPendenciaPanels();
		activePendenciaLink = link;
		const notice = document.createElement("div");
		notice.className = "pdp-multiple-docs-notice";
		notice.setAttribute("role", "status");
		notice.textContent = "Múltiplos documentos (" + count + " arquivos)";
		notice.addEventListener("mouseenter", cancelClosePendencia);
		notice.addEventListener("mouseleave", scheduleClosePendencia);
		document.body.appendChild(notice);
		movementMultipleNotice = notice;
		positionMovementMultipleNotice(notice, link);
	}

	function showPendenciaDocs(link, docs) {
		if (isMovementLink(link) && docs.length > 1) {
			showMovementMultipleNotice(link, docs.length);
			return;
		}
		closeAllPendenciaPanels();
		activePendenciaLink = link;

		docs.forEach(function (doc, index) {
			const panel = buildPanel();
			attachPendenciaPanelBehavior(panel);
			panel.onClose = function () {
				panel.frame.src = "about:blank";
				panel.wrap.remove();
				pendenciaPanels = pendenciaPanels.filter(function (p) {
					return p !== panel;
				});
			};

			panel.title.textContent = docs.length > 1 ? doc.text + " (" + (index + 1) + "/" + docs.length + ")" : doc.text;
			panel.openTab.href = doc.href;
			panel.frame.src = doc.href;

			// Documento retornado de um mandado (ver runLoaderMode/
			// extractAnalisarRetornoAction): oferece o atalho para pular
			// direto para a tela "Analisar Retorno" daquele mandado.
			if (doc.analisarRetorno) {
				panel.analisarRetornoAction = doc.analisarRetorno;
				panel.analisarRetorno.hidden = false;
			}

			positionPanel(panel, link, index);
			panel.wrap.classList.add("pdp-visible");

			pendenciaPanels.push(panel);
		});
	}

	function cleanupPendenciaLoader() {
		if (!pendenciaLoader) return;
		window.removeEventListener("message", pendenciaLoader.onMessage);
		clearTimeout(pendenciaLoader.timeoutId);
		if (pendenciaLoader.iframe.parentNode) {
			pendenciaLoader.iframe.parentNode.removeChild(pendenciaLoader.iframe);
		}
		pendenciaLoader = null;
	}

	function openPendenciaGroup(link) {
		// Já tem uma busca em segundo plano em andamento para este mesmo
		// link: não reinicia. Antes, esta checagem também exigia
		// "activePendenciaLink === link" — mas activePendenciaLink é zerado
		// por closeAllPendenciaPanels() a cada vez que o mouse sai do link
		// por mais de CLOSE_DELAY_MS, o que acontecia quase sempre antes da
		// busca (raramente instantânea, sobretudo para expandir uma
		// movimentação) terminar. Resultado: cada nova passada do mouse
		// cancelava a busca anterior e recomeçava do zero, e a pré-
		// visualização nunca chegava a aparecer. A identidade de "já estou
		// buscando isto" agora depende só do próprio pendenciaLoader.
		if (pendenciaLoader && pendenciaLoader.link === link) return;
		if (activePendenciaLink === link && (pendenciaPanels.length || movementMultipleNotice)) return;

		const href = link.getAttribute("href");
		if (!href) return;

		cleanupPendenciaLoader();
		activePendenciaLink = link;

		const token = "pdp-" + Date.now() + "-" + Math.random().toString(36).slice(2);

		const iframe = document.createElement("iframe");
		iframe.setAttribute(LOADER_ATTR, token);
		iframe.style.position = "fixed";
		iframe.style.top = "0";
		iframe.style.left = "-9999px";
		iframe.style.width = "1px";
		iframe.style.height = "1px";
		iframe.style.opacity = "0";
		iframe.style.pointerEvents = "none";
		iframe.setAttribute("aria-hidden", "true");

		function onMessage(e) {
			if (e.origin !== window.location.origin) return;
			const data = e.data;
			if (!data || data.source !== MESSAGE_SOURCE || data.type !== "pendencia-docs" || data.token !== token) return;

			cleanupPendenciaLoader();
			// O token já garante que esta resposta é da busca certa para
			// este link — mesmo que o mouse tenha saído nesse meio-tempo
			// (por isso não checamos mais "activePendenciaLink === link"
			// aqui), então o resultado é exibido de qualquer forma.
			activePendenciaLink = link;

			const docs = Array.isArray(data.docs) ? data.docs : [];
			if (!docs.length) {
				showPendenciaMessage(
					link,
					"Nenhum documento encontrado para pré-visualização. Clique no link para abrir a análise completa."
				);
				return;
			}
			showPendenciaDocs(link, docs);
		}

		const timeoutId = setTimeout(function () {
			cleanupPendenciaLoader();
			activePendenciaLink = link;
			showPendenciaMessage(
				link,
				"Não foi possível carregar a pré-visualização a tempo. Clique no link para abrir a análise completa."
			);
		}, PENDENCIA_TIMEOUT_MS);

		pendenciaLoader = { iframe: iframe, link: link, onMessage: onMessage, timeoutId: timeoutId };

		window.addEventListener("message", onMessage);
		document.body.appendChild(iframe);
		iframe.src = href;
	}

	// Clica no próprio controle "+" nativo da linha (mesmo elemento que o
	// usuário clicaria manualmente) para disparar a carga dos anexos dessa
	// movimentação, sem depender de recarregar a URL da movimentação num
	// iframe à parte — carregar a URL inteira numa aba oculta mostrou-se
	// pouco confiável: a página de detalhe de uma movimentação também
	// reexibe o contexto de movimentações vizinhas, então "expandir tudo e
	// coletar tudo" (mesmo mecanismo usado para as pendências de
	// juntada/conclusão, ver runLoaderMode) varria documentos de OUTRAS
	// movimentações junto. Clicando no controle desta linha específica, só
	// o contêiner dela (o mesmo que loadedMovementDocs já lê) é populado.
	//
	// Para não abrir a linha visivelmente enquanto isso acontece, tanto o
	// ícone "+"/"-" quanto o contêiner ficam escondidos (display:none, não
	// reserva espaço nenhum — nem o ícone alternando nem uma linha em
	// branco aparecem) durante a espera; ao final, os documentos são lidos
	// e o controle é clicado de novo para recolher a linha ao estado
	// original, só então os dois voltam a ficar visíveis.
	//
	// Em vez de esperar um tempo fixo, verifica a cada 100ms se o
	// contêiner já foi populado e segue assim que encontrar algo — mais
	// rápido que esperar sempre o pior caso, com um teto de segurança para
	// quando a carga demorar mais (rede lenta, etc.).
	function loadMovementDocsInPlace(link, callback) {
		const toggle = movementFileToggle(link);
		if (!toggle) {
			callback([]);
			return;
		}
		let container = movementDocsContainer(toggle);
		function hide() {
			toggle.style.setProperty("visibility", "hidden", "important");
			if (container) container.style.setProperty("display", "none", "important");
		}
		function finish(docs) {
			try {
				toggle.click();
			} catch (e) {
				/* ignore */
			}
			toggle.style.removeProperty("visibility");
			if (container) container.style.removeProperty("display");
			callback(docs);
		}

		hide();
		try {
			toggle.click();
		} catch (e) {
			/* ignore */
		}
		// O contêiner pode só passar a existir depois do clique, em vez de
		// já estar presente (vazio) na página — tenta achar de novo e
		// escondê-lo também, caso tenha aparecido agora.
		if (!container) {
			container = movementDocsContainer(toggle);
			hide();
		}

		const POLL_INTERVAL_MS = 100;
		const MAX_WAIT_MS = 3000;
		let waited = 0;
		const poll = setInterval(function () {
			waited += POLL_INTERVAL_MS;
			const docs = loadedMovementDocs(link);
			if (docs.length || waited >= MAX_WAIT_MS) {
				clearInterval(poll);
				finish(docs);
			}
		}, POLL_INTERVAL_MS);
	}

	function openPreviewGroup(link) {
		if (isMovementLink(link)) {
			const docs = loadedMovementDocs(link);
			if (docs.length) {
				showPendenciaDocs(link, docs);
				return;
			}
			// Já tem uma carga em andamento para esta mesma movimentação —
			// não clica no "+" de novo por cima.
			if (movementInPlaceLoad && movementInPlaceLoad.link === link) return;
			movementInPlaceLoad = { link: link };
			activePendenciaLink = link;
			loadMovementDocsInPlace(link, function (loadedDocs) {
				if (movementInPlaceLoad && movementInPlaceLoad.link === link) movementInPlaceLoad = null;
				console.log(
					"[Projudi Preview] carga em segundo plano da movimentação concluída: " +
						JSON.stringify({ href: link.href, docsEncontrados: loadedDocs.length, docs: loadedDocs }, null, 2)
				);
				// O mouse pode já ter saído da linha nesse meio-tempo — mesmo
				// assim, exibe o resultado (mesmo raciocínio da correção em
				// openPendenciaGroup: só há uma carga por vez para este link,
				// então o resultado é sempre o certo).
				activePendenciaLink = link;
				if (loadedDocs.length) {
					showPendenciaDocs(link, loadedDocs);
				} else {
					showPendenciaMessage(link, "Nenhum documento encontrado para pré-visualização nesta movimentação.");
				}
			});
			return;
		}
		// Pendências de Análise de Juntada/Conclusão: continuam usando o
		// iframe oculto, que já é específico da tela de análise (sem o
		// problema de "varrer" outras movimentações).
		openPendenciaGroup(link);
	}

	function cancelOpen() {
		clearTimeout(openTimer);
	}

	// ---------------------------------------------------------------------
	// Botão "Analisar Retorno" ao lado da pendência de mandado
	// ---------------------------------------------------------------------
	//
	// Mesmo padrão de botão inline já usado para outras pendências desta
	// extensão (ex.: "Dispensar juntadas" em juntadaDrag.js, "Finalizar
	// conclusão" em finalizarConclusao.js): inserido logo depois do link da
	// própria pendência, dentro de #quadroPendencias — aqui, ao lado de
	// "Mandado: NN". Ao clicar, busca em segundo plano (mesmo mecanismo do
	// hover — iframe oculto com token, ver openPendenciaGroup/runLoaderMode)
	// a análise de cada mandado pendente daquele link e, quando há só um
	// mandado, navega a aba de verdade direto para a última tela ("Marcar
	// Leitura" + "Resultado do Cumprimento" — ver submitAnalisarRetorno),
	// poupando os dois cliques manuais anteriores (abrir a listagem, depois
	// a data na coluna "Ordenação"). Quando há mais de um mandado pendente
	// no mesmo link, não escolhemos por conta própria qual analisar
	// primeiro — pedimos para o usuário passar o mouse sobre o link e usar
	// o botão "Analisar Retorno ↗" de dentro do painel do mandado desejado.

	const MANDADO_PENDENCIA_HREF_MARKER = "/cumprimentoCartorioMandado.do";
	const mandadoButtons = new WeakMap();

	// O quadro de Pendências tem mais de uma linha cujo link aponta para
	// cumprimentoCartorioMandado.do (ex.: "Cumprimentos Expedidos e Não
	// Lidos:" e "Cumprimentos Aguardando Análise de Retorno:") — só a
	// segunda tem uma tela de análise de retorno de verdade para pular;
	// checar só o href levaria o botão a aparecer também na primeira. Por
	// isso confirmamos o rótulo (td.labelRadio) da própria linha do link.
	const CUMPRIMENTOS_AGUARDANDO_RETORNO_LABEL = normalizeLabel("Cumprimentos Aguardando Análise de Retorno:");

	// Cada linha do quadro de Pendências é, na verdade, <tr> (rótulo) + <td>
	// com uma SEGUNDA <table class="form"> aninhada dentro, cuja própria
	// <tr>/<td> é que envolve o link da pendência (confirmado no .mhtml real
	// da capa do processo). Por isso `link.closest("tr")` sozinho encontra
	// essa <tr> interna (sem nenhum td.labelRadio) — é preciso subir além
	// dela, <tr> por <tr>, até achar a linha externa que realmente tem o
	// rótulo.
	function findPendenciaLabelRow(link) {
		let node = link;
		while (node) {
			const tr = node.closest("tr");
			if (!tr) return null;
			if (tr.querySelector(":scope > td.labelRadio")) return tr;
			node = tr.parentElement;
		}
		return null;
	}

	function isMandadoPendenciaLink(link) {
		if (!isPendenciaLink(link)) return false;
		const href = link.getAttribute("href") || "";
		if (href.indexOf(MANDADO_PENDENCIA_HREF_MARKER) === -1) return false;
		const row = findPendenciaLabelRow(link);
		const labelCell = row && row.querySelector(":scope > td.labelRadio");
		if (!labelCell) return false;
		return normalizeLabel(labelCell.textContent) === CUMPRIMENTOS_AGUARDANDO_RETORNO_LABEL;
	}

	// Busca independente do estado do hover (não usa/mexe em `pendenciaLoader`
	// nem nos painéis de pré-visualização, para o botão poder ser clicado sem
	// depender do mouse estar sobre a pendência nem fechar uma pré-visualização
	// já aberta por outro link).
	function fetchMandadoDocsFor(href) {
		return new Promise(function (resolve) {
			const token = "pdp-btn-" + Date.now() + "-" + Math.random().toString(36).slice(2);
			const iframe = document.createElement("iframe");
			iframe.setAttribute(LOADER_ATTR, token);
			iframe.style.position = "fixed";
			iframe.style.top = "0";
			iframe.style.left = "-9999px";
			iframe.style.width = "1px";
			iframe.style.height = "1px";
			iframe.style.opacity = "0";
			iframe.style.pointerEvents = "none";
			iframe.setAttribute("aria-hidden", "true");

			let settled = false;
			const timeoutId = setTimeout(function () {
				finish([]);
			}, PENDENCIA_TIMEOUT_MS);

			function finish(docs) {
				if (settled) return;
				settled = true;
				window.removeEventListener("message", onMessage);
				clearTimeout(timeoutId);
				if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
				resolve(docs);
			}

			function onMessage(e) {
				if (e.origin !== window.location.origin) return;
				const data = e.data;
				if (!data || data.source !== MESSAGE_SOURCE || data.type !== "pendencia-docs" || data.token !== token) return;
				finish(Array.isArray(data.docs) ? data.docs : []);
			}

			window.addEventListener("message", onMessage);
			document.body.appendChild(iframe);
			iframe.src = href;
		});
	}

	function iniciarAnaliseRetornoMandado(link, button) {
		const href = link.getAttribute("href");
		if (!href || button.disabled) return;

		const originalLabel = button.textContent;
		button.disabled = true;
		button.textContent = "Abrindo…";

		fetchMandadoDocsFor(href).then(function (docs) {
			const actions = [];
			const seen = Object.create(null);
			docs.forEach(function (doc) {
				if (!doc.analisarRetorno || seen[doc.analisarRetorno.url]) return;
				seen[doc.analisarRetorno.url] = true;
				actions.push(doc.analisarRetorno);
			});

			button.disabled = false;
			button.textContent = originalLabel;

			if (actions.length === 1) {
				submitAnalisarRetorno(actions[0]); // abre num popup; a aba de trás não navega
				return;
			}

			if (actions.length > 1) {
				alert(
					'Há mais de um mandado pendente neste link. Passe o mouse sobre "' +
						(link.textContent || "").trim() +
						'" e use o botão "Analisar Retorno" de dentro do painel do mandado desejado.'
				);
			} else {
				alert("Não foi possível localizar a tela de análise deste mandado automaticamente. Clique no link para abrir manualmente.");
			}
		});
	}

	function scanMandadoButtons() {
		document.querySelectorAll(PENDENCIA_FIELDSET_SELECTOR + " a.link[href]").forEach(function (link) {
			if (!isMandadoPendenciaLink(link)) return;

			let button = mandadoButtons.get(link);
			if (!button || !button.isConnected) {
				button = document.createElement("button");
				button.type = "button";
				button.className = "pdp-analisar-retorno-mandado";
				button.textContent = "Analisar Retorno";
				button.title = "Pular direto para a tela de análise de retorno deste mandado";
				button.addEventListener("click", function (e) {
					e.preventDefault();
					e.stopPropagation();
					iniciarAnaliseRetornoMandado(link, button);
				});
				link.insertAdjacentElement("afterend", button);
				mandadoButtons.set(link, button);
			}
		});
	}

	scanMandadoButtons();
	new MutationObserver(scanMandadoButtons).observe(document.documentElement, { childList: true, subtree: true });

	// ---------------------------------------------------------------------
	// Botão "Analisar Retorno" na própria tela de listagem de mandados
	// ---------------------------------------------------------------------
	//
	// A mesma tela de listagem (cumprimentoCartorioMandado.do?actionType=
	// listar) também pode ser a página de verdade que o usuário está vendo
	// — não só buscada em segundo plano por runLoaderMode (ex.: um oficial
	// de cartório que abre essa tela direto, sem passar pelo quadro de
	// Pendências de um processo específico). Cada linha já tem, na coluna
	// "Ordenação", a data/hora de ordenação (<a class="url">); insere-se um
	// botão "Analisar Retorno" logo abaixo dela, na mesma célula (ver
	// `.pdp-analisar-retorno-mandado-row` em content.css), que busca a tela
	// de análise daquele mandado (mesmas `fetchMandadoAnalise`/
	// `extractAnalisarRetornoAction` de runLoaderMode) e navega a aba de
	// verdade direto para a última tela — sem preencher nenhum campo dela,
	// pelo mesmo motivo do botão do quadro de Pendências.

	const mandadoListButtons = new WeakMap();

	// A tela de listagem (cumprimentoCartorioMandado.do) é usada para vários
	// status de mandado (o filtro "Status:" no topo da tela troca o que é
	// listado — ex.: "Aguardando Análise de Decurso de Prazo" também aparece
	// aqui, não só "Aguardando Análise de Retorno (Mandado Retornado)"). Só
	// esse último status tem, de fato, a tela "Analisar Retorno" para pular;
	// nos demais o botão "Analisar Retorno" da tela de detalhe nem existe.
	// Por isso o botão só é inserido na linha cujo valor da coluna "Status"
	// bate com esse texto — o índice dessa coluna é achado a partir do
	// próprio cabeçalho da tabela (thead), em vez de fixo, para não quebrar
	// se o Projudi reordenar/ocultar colunas.
	const MANDADO_STATUS_AGUARDANDO_RETORNO_LABEL = normalizeLabel("Aguardando Análise de Retorno (Mandado Retornado)");

	function mandadoRowStatusMatches(link) {
		const row = link.closest("tr");
		const table = row && row.closest("table.resultTable");
		if (!row || !table) return false;

		const headerCells = Array.prototype.slice.call(table.querySelectorAll("thead th"));
		const statusIndex = headerCells.findIndex(function (th) {
			return normalizeLabel(th.textContent) === "status";
		});
		if (statusIndex === -1) return false;

		const rowCells = Array.prototype.slice.call(row.children).filter(function (el) {
			return el.tagName === "TD";
		});
		const statusCell = rowCells[statusIndex];
		if (!statusCell) return false;

		return normalizeLabel(statusCell.textContent) === MANDADO_STATUS_AGUARDANDO_RETORNO_LABEL;
	}

	function iniciarAnaliseRetornoMandadoRow(link, button) {
		const href = link.getAttribute("href");
		if (!href || button.disabled) return;

		let absolute;
		try {
			absolute = new URL(href, document.baseURI).href;
		} catch (e) {
			absolute = href;
		}

		const originalLabel = button.textContent;
		button.disabled = true;
		button.textContent = "Abrindo…";

		fetchMandadoAnalise(absolute).then(function (doc) {
			const action = doc && extractAnalisarRetornoAction(doc, absolute);

			button.disabled = false;
			button.textContent = originalLabel;

			if (action) {
				submitAnalisarRetorno(action); // abre num popup; a aba de trás não navega
				return;
			}

			alert("Não foi possível localizar a tela de análise deste mandado automaticamente. Clique na data para abrir manualmente.");
		});
	}

	function scanMandadoListButtons() {
		if (!isMandadoListScreen()) return;

		findMandadoRowLinks().forEach(function (link) {
			if (!mandadoRowStatusMatches(link)) return;

			let button = mandadoListButtons.get(link);
			if (!button || !button.isConnected) {
				button = document.createElement("button");
				button.type = "button";
				button.className = "pdp-analisar-retorno-mandado pdp-analisar-retorno-mandado-row";
				button.textContent = "Analisar Retorno";
				button.title = "Pular direto para a tela de análise de retorno deste mandado";
				button.addEventListener("click", function (e) {
					e.preventDefault();
					e.stopPropagation();
					iniciarAnaliseRetornoMandadoRow(link, button);
				});
				link.insertAdjacentElement("afterend", button);
				mandadoListButtons.set(link, button);
			}
		});
	}

	scanMandadoListButtons();
	new MutationObserver(scanMandadoListButtons).observe(document.documentElement, { childList: true, subtree: true });

	// Importante: NÃO chamamos stopPropagation()/stopImmediatePropagation()
	// aqui. Outras extensões (ex.: AzFlow) também escutam esses mesmos
	// eventos nativos para o próprio funcionamento (ex.: reposicionar a
	// barra de botões da tela) — "consumir" o evento já chegou a quebrar
	// esse comportamento delas. A prioridade desta extensão em caso de
	// conflito visual vem só do z-index dos painéis (ver content.css), que
	// não interfere em nada do que outra extensão faz.
	document.addEventListener(
		"mouseover",
		function (e) {
			if (shouldDeferPreviewToAzFlow()) return;

			const docLink = findDocumentLink(e.target);
			if (docLink) {
				cancelCloseDoc();
				cancelOpen();
				openTimer = setTimeout(function () {
					showDoc(docLink);
				}, OPEN_DELAY_MS);
				return;
			}

			const groupLink = findPreviewGroupLink(e.target);
			if (groupLink) {
				cancelClosePendencia();
				cancelOpen();
				openTimer = setTimeout(function () {
					openPreviewGroup(groupLink);
				}, OPEN_DELAY_MS);
			}
		},
		true
	);

	document.addEventListener(
		"mouseout",
		function (e) {
			if (shouldDeferPreviewToAzFlow()) return;

			const docLink = findDocumentLink(e.target);
			if (docLink) {
				const toEl = e.relatedTarget;
				if (docPanel && toEl && docPanel.wrap.contains(toEl)) return;
				scheduleCloseDoc();
				return;
			}

			const groupLink = findPreviewGroupLink(e.target);
			if (groupLink) {
				const toEl = e.relatedTarget;
				const stillInsideAPanel =
					toEl &&
					((movementMultipleNotice && movementMultipleNotice.contains(toEl)) ||
						pendenciaPanels.some(function (panel) {
							return panel.wrap.contains(toEl);
						}));
				if (stillInsideAPanel) return;
				scheduleClosePendencia();
			}
		},
		true
	);

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape") {
			closeDocNow();
			cleanupPendenciaLoader();
			closeAllPendenciaPanels();
			closeWaPanel();
		}
	});

	window.addEventListener(
		"scroll",
		function () {
			if (activeDocLink && docPanel && docPanel.wrap.classList.contains("pdp-visible")) {
				positionPanel(docPanel, activeDocLink, 0);
			}
			if (activePendenciaLink && pendenciaPanels.length) {
				pendenciaPanels.forEach(function (panel, index) {
					positionPanel(panel, activePendenciaLink, index);
				});
			}
			if (activePendenciaLink && movementMultipleNotice) {
				positionMovementMultipleNotice(movementMultipleNotice, activePendenciaLink);
			}
		},
		true
	);

	// ---------------------------------------------------------------------
	// Envio de documentos selecionados por WhatsApp Web
	// ---------------------------------------------------------------------
	//
	// Adiciona uma caixinha de seleção ao lado de cada link de documento
	// (mesmo padrão a.link[href*="/arquivo.do"] usado na pré-visualização,
	// idêntico no Projudi e no SEEU) e um botão flutuante, acima da barra de
	// botões da tela do processo (Peticionar/Juntar Documento, ..., Voltar),
	// que abre um pequeno painel para informar o número de WhatsApp e
	// confirmar o envio.
	//
	// Ao confirmar, os arquivos selecionados são baixados (reaproveitando a
	// sessão do Projudi, igual à pré-visualização) e passados para
	// src/background.js, que abre uma nova aba do WhatsApp Web já com a
	// conversa do número informado; src/whatsapp.js, injetado nessa aba,
	// anexa os arquivos à conversa assim que ela estiver pronta. O envio da
	// mensagem em si continua sendo manual, para o usuário revisar antes.

	const WA_DOC_ATTR = "data-pdp-wa";
	const selectedDocs = window.__pdpDocumentSelection.docs;
	window.__pdpDocumentSelection.subscribe(function () { updateWaLauncherCount(); refreshWaPanelList(); });
	let waPanel = null;

	function decorateDocLinkForWhatsapp(link) {
		window.__pdpDocumentSelection.decorate(link);
		link.setAttribute(WA_DOC_ATTR, "1");
	}

	function scanDocLinksForWhatsapp(root) {
		if (!root || !root.querySelectorAll) return;
		const anchors = root.querySelectorAll("a.link");
		Array.prototype.forEach.call(anchors, function (a) {
			if (isDocumentLink(a)) decorateDocLinkForWhatsapp(a);
		});
		if (root.matches && root.matches("a.link") && isDocumentLink(root)) {
			decorateDocLinkForWhatsapp(root);
		}
	}

	function findCheckboxForHref(href) {
		const links = document.querySelectorAll("a.link[" + WA_DOC_ATTR + "]");
		for (let i = 0; i < links.length; i++) {
			const a = links[i];
			let absolute;
			try {
				absolute = new URL(a.getAttribute("href"), document.baseURI).href;
			} catch (e) {
				absolute = a.getAttribute("href");
			}
			if (absolute === href) return a.previousElementSibling;
		}
		return null;
	}

	function updateWaLauncherCount() {
		const launcher = document.getElementById("pdp-wa-launcher");
		if (!launcher) return;
		const countEl = launcher.querySelector(".pdp-wa-count");
		const n = selectedDocs.size;
		countEl.hidden = n === 0;
		countEl.textContent = String(n);
	}

	// ---------------------------------------------------------------------
	// Destinatários salvos (nome + número), com busca e favoritos
	// ---------------------------------------------------------------------
	//
	// Guardados em chrome.storage.local (compartilhado pela extensão, não
	// por site), então a mesma lista aparece tanto no Projudi quanto no
	// SEEU — igual a uma lista de contatos de e-mail.

	const CONTACTS_STORAGE_KEY = "pdpWhatsappContacts";
	let contactsCache = [];

	function loadContacts() {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(CONTACTS_STORAGE_KEY, function (data) {
					resolve((data && data[CONTACTS_STORAGE_KEY]) || []);
				});
			} catch (e) {
				resolve([]);
			}
		});
	}

	function saveContacts(list) {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.set({ [CONTACTS_STORAGE_KEY]: list }, resolve);
			} catch (e) {
				resolve();
			}
		});
	}

	function sortContacts(list) {
		return list.slice().sort(function (a, b) {
			if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
			return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
		});
	}

	function openContactForm() {
		if (!waPanel) return;
		waPanel.contactForm.hidden = false;
		waPanel.contactFormName.value = "";
		waPanel.contactFormPhone.value = waPanel.phoneInput.value || "";
		waPanel.contactFormName.focus();
	}

	function closeContactForm() {
		if (!waPanel) return;
		waPanel.contactForm.hidden = true;
		waPanel.contactFormName.value = "";
		waPanel.contactFormPhone.value = "";
	}

	function saveContactFromForm() {
		if (!waPanel) return;
		const name = waPanel.contactFormName.value.trim();
		const phone = normalizePhone(waPanel.contactFormPhone.value);

		if (!name) {
			waPanel.status.textContent = "Informe um nome para o destinatário.";
			waPanel.contactFormName.focus();
			return;
		}
		if (phone.length < 12 || phone.length > 15) {
			waPanel.status.textContent = "Informe um número de WhatsApp válido (com DDD).";
			waPanel.contactFormPhone.focus();
			return;
		}

		waPanel.status.textContent = "";
		const contact = {
			id: "c-" + Date.now() + "-" + Math.random().toString(36).slice(2),
			name: name,
			phone: phone,
			favorite: false,
		};
		contactsCache.push(contact);
		saveContacts(contactsCache).then(function () {
			closeContactForm();
			refreshContactsList();
		});
	}

	function toggleContactFavorite(id) {
		const contact = contactsCache.find(function (c) {
			return c.id === id;
		});
		if (!contact) return;
		contact.favorite = !contact.favorite;
		saveContacts(contactsCache).then(refreshContactsList);
	}

	function deleteContact(id, name) {
		if (!confirm('Remover "' + name + '" da lista de destinatários salvos?')) return;
		contactsCache = contactsCache.filter(function (c) {
			return c.id !== id;
		});
		saveContacts(contactsCache).then(refreshContactsList);
	}

	function refreshContactsList() {
		if (!waPanel) return;
		const query = waPanel.contactsSearch.value.trim().toLowerCase();
		const filtered = contactsCache.filter(function (c) {
			return !query || c.name.toLowerCase().indexOf(query) !== -1;
		});
		const sorted = sortContacts(filtered);

		waPanel.contactsList.innerHTML = "";

		if (!sorted.length) {
			const li = document.createElement("li");
			li.className = "pdp-wa-contacts-empty";
			li.textContent = contactsCache.length
				? "Nenhum destinatário encontrado."
				: "Nenhum destinatário salvo ainda — clique em “+ Novo” para adicionar.";
			waPanel.contactsList.appendChild(li);
			return;
		}

		sorted.forEach(function (contact) {
			const li = document.createElement("li");
			li.className = "pdp-wa-contact-item";
			li.title = "Usar este destinatário";

			const favBtn = document.createElement("button");
			favBtn.type = "button";
			favBtn.className = "pdp-wa-contact-fav";
			favBtn.title = contact.favorite ? "Remover dos favoritos" : "Marcar como favorito";
			favBtn.textContent = contact.favorite ? "★" : "☆";
			favBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				toggleContactFavorite(contact.id);
			});

			const info = document.createElement("span");
			info.className = "pdp-wa-contact-info";
			const nameSpan = document.createElement("span");
			nameSpan.className = "pdp-wa-contact-name";
			nameSpan.textContent = contact.name;
			const phoneSpan = document.createElement("span");
			phoneSpan.className = "pdp-wa-contact-phone";
			phoneSpan.textContent = contact.phone;
			info.appendChild(nameSpan);
			info.appendChild(phoneSpan);

			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "pdp-wa-contact-delete";
			delBtn.title = "Remover destinatário";
			delBtn.textContent = "✕";
			delBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				deleteContact(contact.id, contact.name);
			});

			li.appendChild(favBtn);
			li.appendChild(info);
			li.appendChild(delBtn);

			li.addEventListener("click", function () {
				waPanel.phoneInput.value = contact.phone;
				waPanel.status.textContent = "";
			});

			waPanel.contactsList.appendChild(li);
		});
	}

	function ensureWaPanel() {
		// Mesmo raciocínio do ensureDocPanel(): se o painel antigo ficou
		// órfão (fora da árvore visível do documento), descarta e recria.
		if (waPanel && !waPanel.wrap.isConnected) waPanel = null;
		if (waPanel) return waPanel;

		const wrap = document.createElement("div");
		wrap.className = "pdp-wa-overlay";
		wrap.innerHTML =
			'<div class="pdp-wa-modal" role="dialog" aria-label="Enviar arquivos por WhatsApp">' +
			'  <div class="pdp-wa-modal-header">' +
			"    <span>Enviar por WhatsApp</span>" +
			'    <button type="button" class="pdp-wa-modal-close" title="Fechar (Esc)">✕</button>' +
			"  </div>" +
			'  <div class="pdp-wa-modal-body">' +
			'    <label class="pdp-wa-field-label" for="pdp-wa-phone">Número do WhatsApp (com DDD)</label>' +
			'    <input type="tel" id="pdp-wa-phone" class="pdp-wa-phone-input" placeholder="Ex.: 41 99999-8888" autocomplete="off">' +
			'    <div class="pdp-wa-contacts">' +
			'      <div class="pdp-wa-contacts-toolbar">' +
			'        <input type="text" class="pdp-wa-contacts-search" placeholder="Pesquisar destinatário salvo…">' +
			'        <button type="button" class="pdp-wa-contact-add" title="Salvar destinatário">+ Novo</button>' +
			"      </div>" +
			'      <div class="pdp-wa-contact-form" hidden>' +
			'        <input type="text" class="pdp-wa-contact-form-name" placeholder="Nome">' +
			'        <input type="tel" class="pdp-wa-contact-form-phone" placeholder="Número (com DDD)">' +
			'        <div class="pdp-wa-contact-form-actions">' +
			'          <button type="button" class="pdp-wa-contact-form-cancel">Cancelar</button>' +
			'          <button type="button" class="pdp-wa-contact-form-save">Salvar</button>' +
			"        </div>" +
			"      </div>" +
			'      <ul class="pdp-wa-contacts-list"></ul>' +
			"    </div>" +
			'    <div class="pdp-wa-files-label">Arquivos selecionados:</div>' +
			'    <ul class="pdp-wa-files-list"></ul>' +
			'    <div class="pdp-wa-empty-hint">Marque a caixinha ao lado de um documento na tela para selecioná-lo.</div>' +
			"  </div>" +
			'  <div class="pdp-wa-modal-footer">' +
			'    <span class="pdp-wa-status"></span>' +
			'    <button type="button" class="pdp-wa-cancel">Cancelar</button>' +
			'    <button type="button" class="pdp-wa-send">Enviar</button>' +
			"  </div>" +
			"</div>";
		document.body.appendChild(wrap);

		waPanel = {
			wrap: wrap,
			phoneInput: wrap.querySelector("#pdp-wa-phone"),
			list: wrap.querySelector(".pdp-wa-files-list"),
			emptyHint: wrap.querySelector(".pdp-wa-empty-hint"),
			status: wrap.querySelector(".pdp-wa-status"),
			sendBtn: wrap.querySelector(".pdp-wa-send"),
			contactsSearch: wrap.querySelector(".pdp-wa-contacts-search"),
			contactsList: wrap.querySelector(".pdp-wa-contacts-list"),
			contactAddBtn: wrap.querySelector(".pdp-wa-contact-add"),
			contactForm: wrap.querySelector(".pdp-wa-contact-form"),
			contactFormName: wrap.querySelector(".pdp-wa-contact-form-name"),
			contactFormPhone: wrap.querySelector(".pdp-wa-contact-form-phone"),
		};

		wrap.querySelector(".pdp-wa-modal-close").addEventListener("click", closeWaPanel);
		wrap.querySelector(".pdp-wa-cancel").addEventListener("click", closeWaPanel);
		wrap.addEventListener("click", function (e) {
			if (e.target === wrap) closeWaPanel();
		});
		waPanel.sendBtn.addEventListener("click", sendSelectedDocsViaWhatsapp);

		waPanel.contactsSearch.addEventListener("input", refreshContactsList);
		waPanel.contactAddBtn.addEventListener("click", openContactForm);
		wrap.querySelector(".pdp-wa-contact-form-cancel").addEventListener("click", closeContactForm);
		wrap.querySelector(".pdp-wa-contact-form-save").addEventListener("click", saveContactFromForm);

		return waPanel;
	}

	function openWaPanel() {
		const panel = ensureWaPanel();
		refreshWaPanelList();
		closeContactForm();
		panel.wrap.classList.add("pdp-wa-visible");
		panel.status.textContent = "";
		panel.phoneInput.focus();
		loadContacts().then(function (list) {
			contactsCache = list;
			refreshContactsList();
		});
	}

	function closeWaPanel() {
		if (!waPanel) return;
		waPanel.wrap.classList.remove("pdp-wa-visible");
	}

	function refreshWaPanelList() {
		if (!waPanel) return;
		waPanel.list.innerHTML = "";
		const docs = Array.from(selectedDocs.values());
		waPanel.emptyHint.style.display = docs.length ? "none" : "block";
		docs.forEach(function (doc) {
			const li = document.createElement("li");
			li.textContent = doc.name;

			const removeBtn = document.createElement("button");
			removeBtn.type = "button";
			removeBtn.className = "pdp-wa-remove";
			removeBtn.title = "Remover da seleção";
			removeBtn.textContent = "✕";
			removeBtn.addEventListener("click", function () {
				selectedDocs.delete(doc.href);
				const checkbox = findCheckboxForHref(doc.href);
				if (checkbox) checkbox.checked = false;
				updateWaLauncherCount();
				refreshWaPanelList();
			});

			li.appendChild(removeBtn);
			waPanel.list.appendChild(li);
		});
	}

	function normalizePhone(raw) {
		const digits = (raw || "").replace(/\D/g, "");
		if (!digits) return "";
		if (digits.length <= 11) return "55" + digits; // sem DDI: assume Brasil
		return digits;
	}

	// O download do arquivo em si é feito pelo service worker (background.js),
	// não aqui: alguns sistemas (ex.: SEEU) redirecionam o link do documento
	// para um armazenamento externo (ex.: um bucket S3 com URL assinada) sem
	// cabeçalhos de CORS liberando leitura via fetch() de dentro da própria
	// página — só uma extensão com host_permissions para aquele domínio,
	// buscando a partir do seu contexto de background, consegue ler esse
	// conteúdo. Aqui só enviamos o link e o nome; quem baixa é o background.
	function sendSelectedDocsViaWhatsapp() {
		if (!waPanel) return;
		const docs = Array.from(selectedDocs.values());
		if (!docs.length) {
			waPanel.status.textContent = "Selecione ao menos um arquivo.";
			return;
		}

		const phone = normalizePhone(waPanel.phoneInput.value);
		if (phone.length < 12 || phone.length > 15) {
			waPanel.status.textContent = "Informe um número de WhatsApp válido (com DDD).";
			return;
		}

		waPanel.sendBtn.disabled = true;
		waPanel.status.textContent = "Baixando arquivo(s) e abrindo WhatsApp Web…";

		new Promise(function (resolve, reject) {
			chrome.runtime.sendMessage(
				{ source: MESSAGE_SOURCE, type: "whatsapp-share", phone: phone, docs: docs },
				function (response) {
					if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
					if (!response || !response.ok) {
						return reject(new Error((response && response.error) || "Falha ao abrir o WhatsApp Web."));
					}
					resolve();
				}
			);
		})
			.then(function () {
				selectedDocs.clear();
				Array.prototype.forEach.call(document.querySelectorAll(".pdp-wa-checkbox:checked"), function (cb) {
					cb.checked = false;
				});
				updateWaLauncherCount();
				closeWaPanel();
			})
			.catch(function (err) {
				waPanel.status.textContent = "Erro: " + ((err && err.message) || String(err));
			})
			.then(function () {
				if (waPanel) waPanel.sendBtn.disabled = false;
			});
	}

	// A barra de botões da tela do processo tem `class="buttonBar"` no
	// Projudi, mas não no SEEU (mesmo layout de botões, sem essa classe —
	// provavelmente reskinado por uma extensão de terceiros). Em ambos,
	// porém, o botão "Voltar" existe com o mesmo `id="backButton"`. Usamos
	// isso só como SINAL de que estamos numa tela de processo (para não
	// mostrar o botão em telas irrelevantes, ex.: login) — não como ponto
	// de inserção. O launcher nunca é inserido como filho/irmão de um
	// elemento nativo da página: ele é sempre anexado direto ao
	// `document.body`, com posição fixa (position: fixed) na tela. Isso é
	// proposital, por dois motivos:
	//
	// 1. Robustez ao trocar de aba do processo (Movimentações → Partes →
	//    Movimentações de novo): quando isso acontecia, o Projudi/SEEU
	//    recriava o trecho da página onde o botão tinha sido inserido como
	//    filho, e o botão "sumia" — mesmo com toda a reconciliação
	//    periódica, porque o ponto de inserção em si deixava de existir.
	//    Um botão fixo, solto no body, não depende de nenhum elemento
	//    nativo continuar existindo.
	// 2. Não interferir na estrutura de outras extensões (ex.: AzFlow):
	//    nunca inserimos nada dentro da árvore de elementos que outra
	//    extensão criou ou da barra de botões nativa — só adicionamos um
	//    elemento novo, solto, ao body. Isso evita repetir o problema já
	//    visto no SEEU, em que interferir na estrutura/eventos de outra
	//    extensão quebrou o funcionamento dela.
	// Rótulos da barra de ações do processo (Projudi/SEEU). Procurar pelo
	// TEXTO do botão, em vez de por classe/id (`table.buttonBar`,
	// `#backButton`), é mais resistente a diferenças de estrutura entre
	// Projudi e SEEU e a re-renderizações que mudem atributos internos —
	// mesma técnica usada com sucesso no recurso irmão de envio por e-mail
	// para este problema exato de "sumir" ao trocar de aba.
	const PROCESS_TOOLBAR_LABELS = [
		"Peticionar",
		"Juntar Documento",
		"Patronato",
		"Exportar Processo",
		"Pedido Incidental",
		"Navegar",
		"Voltar",
	];

	function findProcessToolbarElement() {
		const candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			const text = (el.textContent || el.value || "").trim();
			if (PROCESS_TOOLBAR_LABELS.indexOf(text) !== -1) return el;
		}
		return null;
	}

	// Uma vez que este frame provou ter uma tela de processo (achou a
	// barra de ações ou algum link de documento), continuamos considerando
	// elegível daqui pra frente, mesmo que uma checagem pontual não ache
	// nada no meio de uma transição de aba (ex.: um instante em que a AJAX
	// ainda não terminou de repor o conteúdo). Reavaliar do zero a cada vez
	// arriscava um falso negativo bem na hora de trocar de aba — exatamente
	// quando mais precisamos que o botão reapareça.
	let processScreenEligible = false;

	function isOnProcessScreen() {
		if (location.pathname === "/projudi/processo/criminal/antecedentesCriminais.do") return false;
		if (processScreenEligible) return true;
		if (findProcessToolbarElement() || document.querySelector('a.link[href*="' + DOC_LINK_HREF_MARKER + '"]')) {
			processScreenEligible = true;
		}
		return processScreenEligible;
	}

	function initWhatsappLauncher() {
		if (document.getElementById("pdp-wa-launcher")) return;
		if (!isOnProcessScreen()) return;

		const launcher = document.createElement("button");
		launcher.type = "button";
		launcher.id = "pdp-wa-launcher";
		launcher.className = "pdp-wa-launcher";
		launcher.innerHTML =
			'<span class="pdp-wa-icon">\u{1F4F1}</span>' +
			'<span class="pdp-wa-label">Enviar por WhatsApp</span>' +
			'<span class="pdp-wa-count" hidden>0</span>';
		document.body.appendChild(launcher);

		launcher.addEventListener("click", openWaPanel);
	}

	// Posicionamento do launcher — mesma técnica usada com sucesso no
	// recurso irmão de envio por e-mail (src/email.js, função
	// repositionButtons()):
	//
	// 1. Por padrão, o botão "acompanha" a barra de ações (Pedido
	//    Incidental, Juntar Documento, ..., Voltar): fica ancorado
	//    logo ACIMA dela, na mesma posição relativa à tela, então rolar a
	//    página para cima/baixo o move junto (ele é position:fixed, com o
	//    "bottom" recalculado a cada rolagem para simular estar "grudado"
	//    à barra). Se a barra sair da área visível (usuário rolou além
	//    dela), o botão simplesmente fica ancorado ao rodapé da janela, em
	//    vez de tentar perseguir uma barra que não está mais à vista.
	// 2. Se houver botões de outra funcionalidade desta extensão no canto
	//    da tela (ex.: envio por e-mail — mesmos ids/classes
	//    "pdp-email-button"/"pdp-recipients-button"/".pdp-email-visible"),
	//    o launcher se posiciona à ESQUERDA deles, na mesma altura, em vez
	//    de seguir a barra de ações — para os dois grupos de botões
	//    ficarem visualmente juntos, sem se sobrepor.
	const EMAIL_BUTTON_SELECTOR = "#pdp-email-button, #pdp-recipients-button, .pdp-email-visible";
	const BUTTON_SCREEN_MARGIN = 12;

	function repositionLauncher() {
		const launcher = document.getElementById("pdp-wa-launcher");
		if (!launcher) return;

		const emailButtons = Array.prototype.slice.call(document.querySelectorAll(EMAIL_BUTTON_SELECTOR));
		if (emailButtons.length) {
			let minLeft = null;
			let minTop = null;
			let maxBottom = null;
			emailButtons.forEach(function (btn) {
				const rect = btn.getBoundingClientRect();
				if (minLeft === null || rect.left < minLeft) minLeft = rect.left;
				if (minTop === null || rect.top < minTop) minTop = rect.top;
				if (maxBottom === null || rect.bottom > maxBottom) maxBottom = rect.bottom;
			});

			const groupCenter = (minTop + maxBottom) / 2;
			const launcherHeight = launcher.offsetHeight || 32;
			const bottom = window.innerHeight - groupCenter - launcherHeight / 2;
			launcher.style.bottom = Math.max(BUTTON_SCREEN_MARGIN, Math.round(bottom)) + "px";
			launcher.style.right = Math.round(window.innerWidth - minLeft + 8) + "px";
			return;
		}

		let bottom = BUTTON_SCREEN_MARGIN;
		const toolbarButton = findProcessToolbarElement();
		if (toolbarButton) {
			// Sobe até um ancestral que representa a linha/barra inteira (tr,
			// div ou td), para medir o topo da barra como um todo, não só do
			// botão individual encontrado.
			const row = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = row.getBoundingClientRect();
			const toolbarVisible = rect.bottom > 0 && rect.top < window.innerHeight;
			if (toolbarVisible) {
				const offset = Math.round(window.innerHeight - rect.top + BUTTON_SCREEN_MARGIN);
				bottom = Math.min(Math.max(BUTTON_SCREEN_MARGIN, offset), window.innerHeight - BUTTON_SCREEN_MARGIN);
			}
		}
		launcher.style.bottom = bottom + "px";
		launcher.style.right = BUTTON_SCREEN_MARGIN + "px";
	}

	// Algumas telas (Projudi e SEEU) trocam de "aba" do processo (ex.:
	// Movimentações → Partes → Movimentações de novo) substituindo um
	// contêiner inteiro da página por conteúdo novo, em vez de só
	// mostrar/esconder o que já existia. Quando isso inclui o próprio
	// `document.body` (ou um ancestral direto dele), qualquer elemento que
	// esta extensão tinha criado antes (o botão de WhatsApp, o painel de
	// pré-visualização, as caixinhas de seleção) fica "órfão" — some
	// visualmente mesmo sem erro nenhum, porque ainda existe em memória, só
	// que fora da árvore visível do documento. Um MutationObserver
	// observando `document.body` diretamente sofre do mesmo problema: se o
	// body for trocado, o observer para de "ver" qualquer coisa.
	//
	// Por isso: (1) o observer é montado em `document.documentElement`
	// (`<html>`), que praticamente nunca é substituído, mesmo quando o
	// `<body>` é; e (2) como rede de segurança extra — para cobrir qualquer
	// padrão de troca de conteúdo que o observer não pegue a tempo — uma
	// checagem periódica reconecta o botão e as caixinhas de seleção.
	function isElementUsable(el) {
		return !!el && el.isConnected;
	}

	// Diagnóstico: registra no console (prefixo "[Projudi WA-UI]") sempre que
	// o botão aparece/desaparece, e qualquer erro que aconteça tentando
	// reconciliar — sem isso, um erro numa chamada síncrona dentro de
	// initWhatsappFeature() poderia interromper a função ANTES da linha que
	// registra o setInterval, deixando a "rede de segurança" nunca
	// instalada, silenciosamente. Também ajuda a diagnosticar por que o
	// botão não está voltando: se aparecer "erro ao reconciliar" no
	// console, esse é o problema; se não aparecer nada, o script pode nem
	// estar rodando mais nessa página/aba.
	const WA_UI_LOG_PREFIX = "[Projudi WA-UI]";
	let waUiLauncherWasPresent = null;

	function logWaUi() {
		console.info.apply(console, [WA_UI_LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
	}

	function reconcileWhatsappUi() {
		try {
			const present = isElementUsable(document.getElementById("pdp-wa-launcher"));
			if (present !== waUiLauncherWasPresent) {
				logWaUi(present ? "botão presente." : "botão ausente — recriando…", window.location.href);
				waUiLauncherWasPresent = present;
			}

			if (!present) {
				initWhatsappLauncher();
				// O botão recém-criado começa com o contador zerado/oculto —
				// sincroniza com o que já estava selecionado (a seleção em si,
				// `selectedDocs`, não depende do DOM antigo, então sobrevive à
				// troca de aba).
				updateWaLauncherCount();

				if (!isElementUsable(document.getElementById("pdp-wa-launcher"))) {
					logWaUi("initWhatsappLauncher() não criou o botão — isOnProcessScreen() retornou falso?", isOnProcessScreen());
				}
			}

			scanDocLinksForWhatsapp(document);
			repositionLauncher();
		} catch (err) {
			console.error(WA_UI_LOG_PREFIX, "erro ao reconciliar:", err);
		}
	}

	function initWhatsappFeature() {
		logWaUi("content script iniciado em", window.location.href);

		// A "rede de segurança" (setInterval) é registrada ANTES da primeira
		// chamada síncrona de reconcileWhatsappUi(), para o caso de ela
		// lançar um erro não previsto: mesmo assim, o intervalo continua
		// rodando e tentando de novo a cada 700ms.
		setInterval(reconcileWhatsappUi, 700);
		reconcileWhatsappUi();

		const observer = new MutationObserver(function (mutations) {
			try {
				mutations.forEach(function (m) {
					m.addedNodes.forEach(function (node) {
						if (node.nodeType !== 1) return;
						scanDocLinksForWhatsapp(node);
					});
				});
				// Reconcilia depois de QUALQUER mutação no documento, não só
				// quando encontramos nós novos no laço acima — mesma
				// abordagem usada com sucesso no recurso irmão de envio por
				// e-mail para este problema. Uma troca de aba pode remover
				// nós (sem necessariamente adicionar nós novos na mesma
				// leva de mutações) e ainda assim precisar recriar o botão.
				reconcileWhatsappUi();
			} catch (err) {
				console.error(WA_UI_LOG_PREFIX, "erro no MutationObserver:", err);
			}
		});
		observer.observe(document.documentElement, { childList: true, subtree: true });

		// Rolar a página/redimensionar a janela só precisa reposicionar o
		// launcher (não re-escanear o documento inteiro atrás de links de
		// documento) — por isso usa só repositionLauncher(), não o
		// reconcileWhatsappUi() completo, e agrupado por requestAnimationFrame
		// (no máximo uma vez por frame), já que "scroll" pode disparar
		// dezenas de vezes por segundo.
		let repositionScheduled = false;
		function scheduleReposition() {
			if (repositionScheduled) return;
			repositionScheduled = true;
			requestAnimationFrame(function () {
				repositionScheduled = false;
				repositionLauncher();
			});
		}
		window.addEventListener("resize", scheduleReposition);
		window.addEventListener("scroll", scheduleReposition, true);
	}

	// Nas rotas da blacklist de interface (window.__pdpButtonGroupBlocked,
	// definida em uiVisibility.js), mantém todo o código de Preview acima
	// ativo, mas não cria o botão flutuante do WhatsApp.
	if (!window.__pdpButtonGroupBlocked) initWhatsappFeature();

	// ---------------------------------------------------------------------
	// Modo "loader": executado dentro do <iframe> oculto criado acima.
	// ---------------------------------------------------------------------

	// ---------------------------------------------------------------------
	function runLoaderMode(token) {
		const EXPAND_ICON_SELECTOR = 'a[id^="linkArquivos"] img, img[onclick*="showDetail"], img[id^="icon"]';

		function dedupe(docs) {
			const seen = Object.create(null);
			return docs.filter(function (doc) {
				if (seen[doc.href]) return false;
				seen[doc.href] = true;
				return true;
			});
		}

		function finish(docs) {
			try {
				window.parent.postMessage(
					{ source: MESSAGE_SOURCE, type: "pendencia-docs", token: token, docs: dedupe(docs) },
					window.location.origin
				);
			} catch (e) {
				/* ignore */
			}
		}

		// A partir do ícone "+" (ex.: id="icon0"), localiza o contêiner que o
		// Projudi preenche com o resultado da expansão (ex.: id="row0"/"div0"),
		// para restringir a coleta de documentos só ao que essa linha trouxe.
		function findContainerForIcon(icon, row) {
			const id = icon.id || "";
			const match = id.match(/(\d+)$/);
			if (match) {
				const suffix = match[1];
				const byRow = document.getElementById("row" + suffix);
				if (byRow) return byRow;
				const byDiv = document.getElementById("div" + suffix);
				if (byDiv) return byDiv;
			}
			const next = row && row.nextElementSibling;
			if (next && next.tagName === "TR") return next;
			return row;
		}

		function run() {
			// Mandados devolvidos aguardando análise de retorno: cada linha
			// pendente exige clicar na data (coluna "Ordenação") para abrir a
			// tela de análise daquele mandado — buscamos cada uma em segundo
			// plano (sem navegar esta página, para poder buscar todas em
			// paralelo quando houver mais de um mandado pendente) e coletamos
			// os documentos de cada tela de análise.
			const mandadoLinks = isMandadoListScreen() ? findMandadoRowLinks() : [];
			if (mandadoLinks.length) {
				Promise.all(
					mandadoLinks.map(function (link) {
						let absolute;
						try {
							absolute = new URL(link.getAttribute("href"), document.baseURI).href;
						} catch (e) {
							absolute = link.getAttribute("href");
						}
						return fetchMandadoAnalise(absolute).then(function (doc) {
							if (!doc) return [];
							const docs = collectDocumentosRetornados(doc, absolute);
							const action = extractAnalisarRetornoAction(doc, absolute);
							if (action) {
								docs.forEach(function (item) {
									item.analisarRetorno = action;
								});
							}
							return docs;
						});
					})
				).then(function (docsPerMandado) {
					finish(Array.prototype.concat.apply([], docsPerMandado));
				});
				return;
			}

			// A tela de análise (analisarJuntada.do e afins) normalmente lista o
			// HISTÓRICO completo de juntadas/conclusões do processo, não só as
			// pendentes — só as linhas com checkbox de seleção são as realmente
			// pendentes de análise (as demais aparecem apenas para contexto).
			// Por isso, restringimos a expansão/coleta às linhas com checkbox;
			// se a tela não seguir esse padrão, caímos de volta no comportamento
			// de expandir e coletar a página inteira.
			const checkboxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]'));

			const items = [];
			checkboxes.forEach(function (checkbox) {
				const row = checkbox.closest("tr");
				if (!row) return;
				const icon = row.querySelector(EXPAND_ICON_SELECTOR);
				items.push({
					row: row,
					icon: icon,
					container: icon ? findContainerForIcon(icon, row) : row,
				});
			});

			if (items.length) {
				items.forEach(function (item) {
					if (item.icon) {
						try {
							item.icon.click();
						} catch (e) {
							/* ignore */
						}
					}
				});

				setTimeout(function () {
					let docs = [];
					items.forEach(function (item) {
						docs = docs.concat(collectDocsFrom(item.container));
					});
					finish(docs);
				}, 1500);
				return;
			}

			// Sem checkboxes de pendência: mantém o comportamento anterior
			// (expande tudo que houver na página e coleta o resultado inteiro).
			const expandIcons = Array.prototype.slice.call(document.querySelectorAll(EXPAND_ICON_SELECTOR));

			if (!expandIcons.length) {
				finish(collectDocsFrom(document));
				return;
			}

			expandIcons.forEach(function (icon) {
				try {
					icon.click();
				} catch (e) {
					/* ignore */
				}
			});

			setTimeout(function () {
				finish(collectDocsFrom(document));
			}, 1500);
		}

		if (document.readyState === "complete" || document.readyState === "interactive") {
			run();
		} else {
			document.addEventListener("DOMContentLoaded", run, { once: true });
		}
	}
})();
