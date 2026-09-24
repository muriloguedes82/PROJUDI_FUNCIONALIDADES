// Projudi - Indicador de suspensão ativa ao lado do número único do processo
//
// A aba "Informações Adicionais" do processo tem uma seção "Benefícios/
// Medidas/Suspensões" com um campo "Suspensões:" — uma lista (<ul><li>) em
// que cada item tem o formato "<motivo> - <nome> - <status>", ex.:
// "Art. 366 do CPP - RENATO AVELINO DA SILVA - ATIVA" ou "Art. 89 da Lei
// 9.099/95 - PAULO CESAR GAÇA - ATIVA". Os motivos mais comuns são:
// "Art. 366, CPP", "Art. 89, L. 9.099/95", "Insanidade Mental", "ANPP" e
// "Transação Penal". Um processo com mais de um réu pode ter mais de um
// item ativo ao mesmo tempo (um por réu).
//
// Este recurso lê esse campo e, para CADA item com um desses motivos e
// status "ATIVA", insere um pequeno card logo depois do "(N dia(s) em
// tramitação)" no cabeçalho do processo (<h3
// id="barraTituloStatusProcessual">) — um card por item, lado a lado.
// Cada item da lista é também um link (`a.link`) para uma tela de
// detalhe da suspensão (`transacaoPenal.do`) com a "Data de Início"
// dela — cada card busca essa data em segundo plano, num iframe oculto
// (mesma técnica de sequencialProcessoPrincipal.js), e a inclui no texto
// assim que a busca termina.
//
// O processo sempre abre na aba "Movimentações", não em "Informações
// Adicionais" — por isso os cards não podem depender do usuário visitar
// essa aba manualmente. Ao abrir qualquer aba do processo, se a aba
// "Informações Adicionais" já estiver disponível na própria página (ela
// está aberta agora), lê direto; senão, busca essa aba em segundo plano,
// num iframe oculto apontando para a mesma URL do processo com
// `selectedIcon=tabDadosAdicionais` (mesma técnica de
// sequencialProcessoPrincipal.js) — sem precisar o usuário clicar nela.
//
// Os cards também precisam continuar visíveis mesmo navegando por outras
// abas do processo depois. Pelo menos uma delas (Movimentações) navega
// para uma URL de verdade (ver "Troca de abas do processo" no README),
// recarregando a página inteira e descartando qualquer estado em
// memória — por isso o estado (motivos, hrefs e datas de início) também
// é salvo em `sessionStorage`, associado ao número único do processo:
// ao entrar em qualquer aba, os cards aparecem imediatamente a partir do
// que foi salvo da última leitura, e são atualizados de novo assim que
// a aba "Informações Adicionais" for lida (local ou em segundo plano).
//
// Estrutura real confirmada a partir de dois .mhtml salvos do Projudi
// (TJPR):
// - aba: <li id="tabItemprefix1" class="currentTab"><...><a>Informações
//   Adicionais</a></...></li>  →  conteúdo em <div id="tabprefix1">
//   (o id fica no <li>, não no <a> — diferente de outras telas).
// - campo: <td class="label"><label>Suspensões:</label></td>
//   <td colspan="4"><ul><li><a class="link" href=".../transacaoPenal.do?
//   _tj=...">Art. 366 do CPP - NOME - ATIVA</a></li></ul></td>
// - cabeçalho: <h3 id="barraTituloStatusProcessual">Processo
//   0000250-79.2001.8.16.0033 ... &nbsp;-&nbsp; (9187 dia(s) em
//   tramitação)</h3> — não há <em class="attention"> nesta tela.
// - tela de detalhe (transacaoPenal.do, aberta pelo link acima):
//   <tr><td class="label">Motivo da Suspensão: </td><td>Art. 366 do
//   CPP</td></tr> ... <tr><td class="label">Data de Início:</td>
//   <td>14/05/2010</td></tr> ... <tr><td class="label">Status:
//   </td><td>ATIVA</td></tr> — sem <label> dentro do <td class="label">
//   (diferente do padrão usado noutras telas desta extensão).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	// Evita rodar dentro de iframes ocultos usados por esta ou outras
	// funcionalidades desta extensão para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpSuspensaoAtiva) return;
	window.__pdpSuspensaoAtiva = true;

	const TAG = "[Projudi Suspensão Ativa]";
	const CARD_ATTR = "data-pdp-suspensao-card";
	const LOADER_ATTR = "data-pdp-loader";
	const ABA_LABEL = "Informações Adicionais";
	const ABA_SELECTED_ICON = "tabDadosAdicionais";
	const CAMPO_LABELS = ["suspensoes", "suspensao"]; // já normalizados (sem acento/caixa)
	const STATUS_ATIVA = ["ativa", "ativo"];

	// Comparação por regex (não por texto exato) porque o Projudi varia a
	// pontuação entre telas/varas — ex.: "9099/95" vs "9.099/95", "L." vs
	// "Lei". Os padrões operam sobre o texto já normalizado (sem acento,
	// minúsculo, espaços colapsados — ver `normalize`).
	// O "gap" entre partes (`.{0,N}`) precisa aceitar QUALQUER caractere, não
	// só pontuação/espaço — o Projudi intercala texto como "do" ou "da Lei"
	// entre o artigo e a referência (ex.: "Art. 366 do CPP", "Art. 89 da Lei
	// 9.099/95"), então uma classe como `[^a-z0-9]` (só não-alfanumérico)
	// não bate com esses casos.
	const MOTIVOS_REGEX = [
		{ nome: "Art. 366, CPP", re: /art\.?\s*366.{0,10}cpp/ },
		{ nome: "Art. 89, L. 9.099/95", re: /art\.?\s*89.{0,30}9\.?\s*099\s*\/\s*95/ },
		{ nome: "Insanidade Mental", re: /insanidade\s+mental/ },
		{ nome: "ANPP", re: /\banpp\b/ },
		{ nome: "Transação Penal", re: /transacao\s+penal/ },
	];

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function collapseWhitespace(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	// O texto de cada <li> vem como "<motivo> - <nome> - <status>" (com
	// espaços/quebras de linha irregulares entre os trechos). O status é o
	// último segmento depois do último " - ".
	function extractStatus(text) {
		const collapsed = collapseWhitespace(text);
		const parts = collapsed.split(" - ").map((p) => p.trim()).filter(Boolean);
		return parts.length ? normalize(parts[parts.length - 1]) : "";
	}

	// Texto para exibir no card: o mesmo texto do item, sem repetir o status
	// no final (já indicado pelo próprio card existir).
	function displayText(text) {
		const collapsed = collapseWhitespace(text);
		return collapsed.replace(/-\s*(ativa|ativo)\s*$/i, "").replace(/-\s*$/, "").trim() || collapsed;
	}

	// Retorna o nome canônico do motivo reconhecido (para log) ou null.
	function matchMotivo(text) {
		const normalized = normalize(text);
		if (!normalized) return null;
		const found = MOTIVOS_REGEX.find((m) => m.re.test(normalized));
		return found ? found.nome : null;
	}

	// O id da aba fica no <li> (ex.: <li id="tabItemprefix1">), não no <a>
	// interno — por isso a busca é por qualquer elemento com esse prefixo de
	// id, não só por <a>. `root` permite buscar tanto no documento atual
	// quanto num documento buscado em segundo plano (iframe oculto).
	function findTabAnchorByLabel(root, labelText, silent) {
		const candidates = root.querySelectorAll('[id^="tabItemprefix"]');
		for (const el of candidates) {
			if (normalize(el.textContent) === normalize(labelText)) return el;
		}
		if (!silent) console.log(TAG, "nenhum elemento com id tabItemprefix* casou com o rótulo da aba", { labelText: labelText });
		return null;
	}

	// `silent` evita poluir o console nas reconciliações periódicas, em que
	// a aba não estar disponível agora é esperado (usuário está em outra
	// aba do processo) — não é um erro a cada 1.5s.
	function findTabContent(root, labelText, silent) {
		const anchor = findTabAnchorByLabel(root, labelText, silent);
		if (!anchor) return null;
		const match = /tabItemprefix(\d+)/.exec(anchor.id);
		if (!match) return null;
		const content = root.getElementById ? root.getElementById("tabprefix" + match[1]) : null;
		if (!content && !silent) console.log(TAG, "aba encontrada mas #tabprefix" + match[1] + " não existe no documento");
		return content;
	}

	function tabContentReady(content) {
		return !!(content && content.querySelector("td.label, td.labelRadio"));
	}

	// Espera o conteúdo da aba terminar de carregar via AJAX (o Projudi
	// carrega o conteúdo de cada aba numa requisição própria, que só
	// termina um pouco depois do resto da página montar — mesmo
	// comportamento já documentado em sequencialProcessoPrincipal.js).
	function waitForTabContent(root, labelText, timeoutMs) {
		return new Promise(function (resolve) {
			const deadline = Date.now() + timeoutMs;
			(function tick() {
				const content = findTabContent(root, labelText, /* silent */ true);
				if (tabContentReady(content)) return resolve(content);
				if (Date.now() >= deadline) {
					if (!content) console.log(TAG, "aba '" + labelText + "' não encontrada após " + timeoutMs + "ms de espera");
					return resolve(content);
				}
				setTimeout(tick, 250);
			})();
		});
	}

	function findLabelCell(tabContent, wantedLabels) {
		const labelCells = tabContent.querySelectorAll("td.label label, td.labelRadio label");
		for (const label of labelCells) {
			const text = normalize(label.textContent).replace(/:\s*$/, "");
			if (wantedLabels.indexOf(text) !== -1) return label;
		}
		return null;
	}

	// Procura, dentro do campo "Suspensões:", TODOS os itens de lista com
	// um dos motivos reconhecidos e status "ATIVA" — um processo com mais
	// de um réu pode ter mais de um item ativo ao mesmo tempo. Retorna um
	// array de { texto, href } (href = link para a tela de detalhe daquela
	// suspensão, ou null se o item não tiver link); array vazio se nenhum
	// item ativo reconhecido for encontrado.
	function findSuspensoesAtivas(tabContent) {
		const label = findLabelCell(tabContent, CAMPO_LABELS);
		if (!label) {
			console.log(TAG, "campo 'Suspensões' não encontrado na aba '" + ABA_LABEL + "'", {
				rotulosEncontrados: Array.prototype.slice
					.call(tabContent.querySelectorAll("td.label label, td.labelRadio label"))
					.map((l) => l.textContent.trim())
					.filter(Boolean),
			});
			return [];
		}

		const row = label.closest("tr");
		const items = row ? Array.prototype.slice.call(row.querySelectorAll("li")) : [];
		const candidates = items.length ? items : row ? Array.prototype.slice.call(row.querySelectorAll("td")).slice(1) : [];

		console.log(TAG, "campo 'Suspensões' encontrado, avaliando itens:", candidates.map((c) => collapseWhitespace(c.textContent)));

		const encontrados = [];
		for (const item of candidates) {
			const text = collapseWhitespace(item.textContent);
			if (!text) continue;
			const status = extractStatus(text);
			if (status && STATUS_ATIVA.indexOf(status) === -1) {
				console.log(TAG, "item ignorado (status não é ativa):", { texto: text, status: status });
				continue;
			}
			const motivo = matchMotivo(text);
			if (!motivo) {
				console.log(TAG, "item ignorado (motivo não reconhecido):", text);
				continue;
			}
			console.log(TAG, "item de suspensão ativa reconhecido:", { texto: text, motivo: motivo });
			const link = item.querySelector ? item.querySelector("a.link, a[href]") : null;
			let href = null;
			if (link && link.getAttribute("href")) {
				try {
					href = new URL(link.getAttribute("href"), window.location.href).href;
				} catch (err) {
					href = link.getAttribute("href");
				}
			}
			encontrados.push({ texto: displayText(text), href: href });
		}

		return encontrados;
	}

	// ---------------------------------------------------------------------
	// Busca em segundo plano (iframe oculto): tanto da própria aba
	// "Informações Adicionais" (quando a página atual não é essa aba) quanto
	// da "Data de Início" de cada suspensão, na tela de detalhe
	// (transacaoPenal.do). Mesma técnica já usada em
	// sequencialProcessoPrincipal.js.
	// ---------------------------------------------------------------------

	function fetchDoc(url) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute(LOADER_ATTR, "pdp-susp-" + Date.now() + "-" + Math.random().toString(36).slice(2));
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

	// Busca a aba "Informações Adicionais" da MESMA página/processo em
	// segundo plano.
	//
	// Uma tentativa anterior fazia isso navegando um iframe oculto para a
	// própria URL da página, só trocando a query string (`?selectedIcon=
	// tabDadosAdicionais`) — não funcionou: o Projudi não decide a aba pela
	// URL nessa tela, e uma navegação nova sempre volta para a aba padrão
	// (Movimentações, a mesma que abre na primeira vez que o processo é
	// aberto). A troca de aba de verdade é um **POST** para a própria
	// action do formulário `#processoForm`, com um campo oculto
	// `selectedIcon` no corpo — confirmado a partir de
	// `oraculoDirect.js` (`window.__pdpOpenOraculoDirect`), que já usa
	// exatamente essa técnica para acessar a aba "Partes e Outros"
	// (`selectedIcon=tabPartes`) em segundo plano, via `fetch()` (sem
	// iframe) com o restante dos campos do formulário reaproveitados via
	// `FormData`. Aqui é a mesma ideia, com `selectedIcon=tabDadosAdicionais`.
	let avisouFormNaoProcesso = false;
	async function fetchAbaInformacoesAdicionaisPOST() {
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

		const body = new URLSearchParams();
		for (const [name, value] of new FormData(form)) {
			if (typeof value === "string") body.append(name, value);
		}
		body.set("selectedIcon", ABA_SELECTED_ICON);

		console.log(TAG, "buscando aba '" + ABA_LABEL + "' em segundo plano (POST):", actionUrl.href);

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

	// Para diagnóstico: qual aba veio marcada como ativa numa resposta —
	// ajuda a confirmar se o POST realmente trocou de aba ou se voltou
	// para a padrão (Movimentações).
	function abaAtivaEm(root) {
		const ativa = root.querySelector('[id^="tabItemprefix"].currentTab, [id^="tabItemprefix"][class*="currentTab"]');
		return ativa ? collapseWhitespace(ativa.textContent) : "(nenhuma aba marcada como atual)";
	}

	// Na tela de detalhe (transacaoPenal.do), "Data de Início:" fica direto
	// no texto do <td class="label"> (sem <label> dentro, diferente do
	// padrão usado noutras telas), com o valor no <td> seguinte.
	function findDataInicio(doc) {
		const labelCells = doc.querySelectorAll("td.label");
		for (const td of labelCells) {
			const text = normalize(td.textContent).replace(/:\s*$/, "");
			if (text !== "data de inicio") continue;
			const valueCell = td.nextElementSibling;
			const value = valueCell ? collapseWhitespace(valueCell.textContent) : "";
			return value || null;
		}
		return null;
	}

	// href -> "pending" | string (data) | null (buscado, não encontrado)
	const dataInicioPorHref = new Map();

	function buscarDataInicio(href) {
		if (!href || dataInicioPorHref.has(href)) return;
		dataInicioPorHref.set(href, "pending");
		console.log(TAG, "buscando Data de Início em segundo plano:", href);
		fetchDoc(href)
			.then(function (doc) {
				const data = findDataInicio(doc);
				dataInicioPorHref.set(href, data);
				console.log(TAG, data ? "Data de Início encontrada: " + data : "campo 'Data de Início' não encontrado na tela de detalhe", { href: href });
				atualizarDataInicio(href, data);
			})
			.catch(function (err) {
				dataInicioPorHref.set(href, null);
				console.warn(TAG, "falha ao buscar Data de Início:", { href: href, erro: err && (err.stack || err.message || err) });
			});
	}

	// ---------------------------------------------------------------------
	// Cards no cabeçalho (um por suspensão ativa reconhecida)
	// ---------------------------------------------------------------------

	// Cabeçalho do processo: no Projudi (tela visualizacaoProcesso.do) é
	// <h3 id="barraTituloStatusProcessual">, terminando em "(N dia(s) em
	// tramitação)" — é logo depois desse texto que os cards devem aparecer.
	// Em telas/sistemas sem esse cabeçalho (ex.: SEEU), cai para os mesmos
	// elementos já usados em email.js (extractProcessNumber).
	function headerContainer() {
		const barra = document.getElementById("barraTituloStatusProcessual");
		if (barra && barra.textContent.trim()) return barra;
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return projudiEl.parentElement || projudiEl;
		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl && seeuEl.textContent.trim()) return seeuEl;
		return null;
	}

	function textoItem(item) {
		return item.dataInicio ? item.texto + " (desde " + item.dataInicio + ")" : item.texto;
	}

	function criarCardElemento(chave) {
		const card = document.createElement("span");
		card.setAttribute(CARD_ATTR, chave);
		card.style.display = "inline-flex";
		card.style.alignItems = "center";
		card.style.gap = "4px";
		card.style.marginLeft = "8px";
		card.style.padding = "1px 8px";
		card.style.borderRadius = "10px";
		card.style.border = "1px solid #d99400";
		card.style.background = "#fff4d9";
		card.style.color = "#8a5800";
		card.style.fontSize = "11px";
		card.style.fontWeight = "bold";
		card.style.verticalAlign = "middle";
		card.style.cursor = "help";

		const textEl = document.createElement("span");
		textEl.className = "pdp-suspensao-card-texto";
		card.appendChild(textEl);
		return card;
	}

	// Insere/atualiza um card por item de `items` (array de { href, texto
	// já formatado }), preservando os elementos existentes (por href, para
	// não perder o hover/posição à toa a cada reconciliação) e removendo os
	// que não estão mais na lista.
	function insertCards(items) {
		const container = headerContainer();
		if (!container) return false;

		const existentes = new Map();
		container.querySelectorAll("[" + CARD_ATTR + "]").forEach(function (el) {
			existentes.set(el.getAttribute(CARD_ATTR), el);
		});

		const chavesDesejadas = [];
		let ultimoInserido = null;
		items.forEach(function (item, idx) {
			const chave = item.href || "idx:" + idx;
			chavesDesejadas.push(chave);
			let card = existentes.get(chave);
			if (!card) {
				card = criarCardElemento(chave);
				if (ultimoInserido) ultimoInserido.insertAdjacentElement("afterend", card);
				else container.appendChild(card);
			}
			card.title = "Suspensão ativa: " + item.texto;
			card.querySelector(".pdp-suspensao-card-texto").textContent = "Suspenso: " + item.texto;
			ultimoInserido = card;
		});

		existentes.forEach(function (el, chave) {
			if (chavesDesejadas.indexOf(chave) === -1) el.remove();
		});

		return true;
	}

	function removeCards() {
		document.querySelectorAll("[" + CARD_ATTR + "]").forEach(function (el) {
			el.remove();
		});
	}

	// ---------------------------------------------------------------------
	// Persistência entre abas do processo
	//
	// A princípio o estado em memória (`estadoAtual`) bastaria, já que o
	// script continua carregado enquanto o usuário troca de aba dentro da
	// mesma página (guarda `window.__pdpSuspensaoAtiva` no topo). Só que,
	// na prática, pelo menos a aba Movimentações navega para uma URL de
	// verdade (o mesmo comportamento já documentado em "Troca de abas do
	// processo" no README, para outros recursos desta extensão) — o que
	// recarrega a página, descarta esse estado em memória, e nessas abas a
	// "Informações Adicionais" nem está no DOM para ser relida. Por isso o
	// estado também é salvo em `sessionStorage`, associado ao número único
	// do processo: ao carregar qualquer aba do processo, os cards aparecem
	// imediatamente a partir do que foi salvo da última vez que a aba
	// "Informações Adicionais" foi lida (local ou em segundo plano) —
	// nesta mesma aba do navegador, sem persistir entre processos
	// diferentes nem enviar nada a lugar nenhum.
	// ---------------------------------------------------------------------

	const STORAGE_PREFIX = "pdpSuspensaoAtiva:";

	function numeroProcesso() {
		const header = document.getElementById("barraTituloStatusProcessual");
		const fontes = [header && header.textContent, document.title, window.location.href];
		for (const fonte of fontes) {
			if (!fonte) continue;
			const match = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/.exec(fonte);
			if (match) return match[1];
		}
		return null;
	}

	function storageKey() {
		const numero = numeroProcesso();
		return numero ? STORAGE_PREFIX + numero : null;
	}

	function salvarEstado(estado) {
		const key = storageKey();
		if (!key) return;
		try {
			if (estado && estado.length) sessionStorage.setItem(key, JSON.stringify(estado));
			else sessionStorage.removeItem(key);
		} catch (err) {
			console.warn(TAG, "não foi possível salvar o estado em sessionStorage:", err);
		}
	}

	function carregarEstado() {
		const key = storageKey();
		if (!key) return undefined;
		try {
			const raw = sessionStorage.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			console.warn(TAG, "não foi possível ler o estado salvo em sessionStorage:", err);
			return undefined;
		}
	}

	// Estado guardado em memória nesta carga de página, espelhado em
	// `sessionStorage` (ver acima). `undefined` = ainda não avaliado nem
	// restaurado; `null`/array vazio = avaliado, sem suspensão ativa
	// reconhecida. Quando há suspensões: array de { texto, href,
	// dataInicio } — um item por réu/motivo ativo.
	let estadoAtual;

	function sincronizarCards() {
		if (estadoAtual && estadoAtual.length) {
			insertCards(estadoAtual.map(function (item) {
				return { href: item.href, texto: textoItem(item) };
			}));
		} else {
			removeCards();
		}
	}

	// Aplica uma nova leitura da aba "Informações Adicionais" (local ou
	// buscada em segundo plano): atualiza o estado, salva em
	// sessionStorage, dispara a busca da Data de Início de cada item novo e
	// sincroniza os cards.
	function aplicarSuspensoes(encontrados) {
		const anterior = estadoAtual ? estadoAtual.map((e) => e.texto).sort().join(" | ") : "";
		const novo = encontrados.map((e) => e.texto).sort().join(" | ");
		if (novo !== anterior) {
			console.log(TAG, "estado de suspensão atualizado:", { anterior: anterior || "(nenhuma)", novo: novo || "(nenhuma)" });
		}

		estadoAtual = encontrados.map(function (item) {
			const dataConhecida = item.href ? dataInicioPorHref.get(item.href) : undefined;
			return {
				texto: item.texto,
				href: item.href,
				dataInicio: dataConhecida && dataConhecida !== "pending" ? dataConhecida : null,
			};
		});
		salvarEstado(estadoAtual);

		estadoAtual.forEach(function (item) {
			if (item.href) buscarDataInicio(item.href);
		});

		sincronizarCards();
	}

	// Callback de `buscarDataInicio`: atualiza a data de início do item
	// correspondente (por href), se ele ainda fizer parte do estado atual.
	function atualizarDataInicio(href, data) {
		if (!estadoAtual) return;
		const idx = estadoAtual.findIndex(function (item) {
			return item.href === href;
		});
		if (idx === -1) return;
		estadoAtual = estadoAtual.slice();
		estadoAtual[idx] = Object.assign({}, estadoAtual[idx], { dataInicio: data });
		salvarEstado(estadoAtual);
		sincronizarCards();
	}

	// Se a aba "Informações Adicionais" já estiver disponível na própria
	// página agora (usuário está nela), lê direto — sem gastar nenhuma
	// requisição extra — e retorna true. Senão, retorna false (chamador
	// decide se busca em segundo plano).
	function lerSeDisponivelLocalmente() {
		const tabContent = findTabContent(document, ABA_LABEL, /* silent */ true);
		if (!tabContentReady(tabContent)) return false;
		aplicarSuspensoes(findSuspensoesAtivas(tabContent));
		return true;
	}

	// Busca a aba "Informações Adicionais" em segundo plano (POST para o
	// próprio #processoForm, ver `fetchAbaInformacoesAdicionaisPOST` acima)
	// — usado quando o processo abre em outra aba (o padrão, já que ele
	// sempre abre em "Movimentações") e essa aba não está disponível na
	// página atual.
	let buscaEmSegundoPlanoFeita = false;
	function buscarEmSegundoPlano() {
		if (buscaEmSegundoPlanoFeita) return;
		buscaEmSegundoPlanoFeita = true;
		console.log(TAG, "aba '" + ABA_LABEL + "' não está na página atual — buscando em segundo plano (POST)");
		fetchAbaInformacoesAdicionaisPOST()
			.then(function (doc) {
				if (!doc) {
					buscaEmSegundoPlanoFeita = false;
					return;
				}
				const tabContent = findTabContent(doc, ABA_LABEL, false);
				if (!tabContentReady(tabContent)) {
					console.log(TAG, "busca em segundo plano (POST) não encontrou o conteúdo da aba '" + ABA_LABEL + "' pronto na resposta — aba que veio ativa na resposta:", abaAtivaEm(doc));
					buscaEmSegundoPlanoFeita = false;
					return;
				}
				aplicarSuspensoes(findSuspensoesAtivas(tabContent));
			})
			.catch(function (err) {
				console.warn(TAG, "falha ao buscar a aba 'Informações Adicionais' em segundo plano:", err && (err.stack || err.message || err));
				// Permite tentar de novo na próxima reconciliação, se ainda não
				// houver nenhum estado conhecido (nem local, nem restaurado).
				buscaEmSegundoPlanoFeita = false;
			});
	}

	// Restaura, antes de qualquer outra coisa, o que já se sabia sobre este
	// processo (salvo por uma leitura anterior nesta mesma aba do
	// navegador) — assim os cards aparecem imediatamente em QUALQUER aba
	// do processo, mesmo antes de qualquer leitura/busca terminar nesta
	// carga de página.
	const restaurado = carregarEstado();
	if (restaurado !== undefined) {
		estadoAtual = restaurado;
		console.log(TAG, "estado restaurado do sessionStorage:", restaurado);
		sincronizarCards();
	}

	// Garante uma leitura atualizada assim que a página termina de montar:
	// usa a aba local se ela já estiver disponível (ex.: usuário abriu
	// direto em "Informações Adicionais", ou está nela agora); senão, como
	// o processo normalmente abre em "Movimentações", busca a aba em
	// segundo plano — sem depender do usuário clicar nela.
	waitForTabContent(document, ABA_LABEL, 4000).then(function (tabContent) {
		if (tabContentReady(tabContent)) {
			aplicarSuspensoes(findSuspensoesAtivas(tabContent));
		} else {
			buscarEmSegundoPlano();
		}
	});

	// A tela do processo pode trocar de aba/recarregar trechos via AJAX, ou
	// navegar para uma URL diferente (ver "Troca de abas do processo" no
	// README) — em qualquer um dos dois casos, os cards podem precisar ser
	// reinseridos (ou restaurados do zero, se a página recarregou).
	// Reconcilia periodicamente: reaplica o último estado conhecido sempre
	// (cobre o cabeçalho ter sido recriado), relê a aba "Informações
	// Adicionais" quando ela estiver disponível localmente (usuário
	// navegou para ela, dado mais atual que qualquer busca em segundo
	// plano), e tenta a busca em segundo plano de novo se ainda não tiver
	// nenhum estado conhecido nem local nem restaurado.
	setInterval(function () {
		try {
			if (!lerSeDisponivelLocalmente()) {
				sincronizarCards();
				if (estadoAtual === undefined) buscarEmSegundoPlano();
			}
		} catch (err) {
			console.error(TAG, "erro na reconciliação periódica:", err);
		}
	}, 1500);
})();
