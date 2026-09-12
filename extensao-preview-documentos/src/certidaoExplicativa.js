// Projudi/SEEU - Certidão Explicativa dos Autos
//
// Monta uma minuta de certidão explicativa/narrativa (objeto e pé) a partir
// das movimentações da tela de Movimentações, destacando os eventos mais
// relevantes de um processo criminal (denúncia, aditamento, audiências,
// sentença, acórdão, trânsito em julgado, arquivamento, recursos) e, para a
// denúncia/aditamento, tenta extrair automaticamente do PDF anexado a
// qualificação do(a) denunciado(a) e a capitulação penal imputada.
//
// Como a extensão não tem acesso a nenhuma API de "resumo" do Projudi/SEEU,
// tudo é heurístico a partir do DOM e do texto do PDF (via pdf.js, carregado
// como content script antes deste arquivo — ver manifest.json). A minuta
// final é sempre aberta em uma aba nova, com o conteúdo editável
// (contenteditable), para o usuário revisar e corrigir antes de expedir a
// certidão de verdade — esta extensão nunca gera nem envia a certidão
// oficial sozinha, só uma minuta de apoio.
//
// Limitação conhecida: processos com movimentações espalhadas em mais de uma
// "aba"/grau (ex.: 1º e 2º grau, ou apensos com movimentação própria) exigem
// que o usuário troque para cada tela e clique em "Coletar desta tela"
// novamente — a extensão não tenta adivinhar sozinha todas as abas
// existentes, para não arriscar cliques em lugares errados da página.

(function () {
	"use strict";

	if (window.__pdpCertidaoInjected) return;
	window.__pdpCertidaoInjected = true;

	const MESSAGE_SOURCE = "projudi-preview";
	const EVENT_LINK_SELECTOR = 'a.link[id^="LNKmov"]';
	const DOC_LINK_HREF_MARKER = "/arquivo.do";
	const BUTTON_SCREEN_MARGIN = 12;
	const OTHER_BUTTON_SELECTOR = "#pdp-qa-row, #pdp-wa-launcher, .pdp-email-visible";
	const MAX_PDF_PAGES = 40;
	const PROCESS_TOOLBAR_LABELS = ["Peticionar", "Juntar Documento", "Patronato", "Exportar Processo", "Pedido Incidental", "Navegar", "Voltar"];

	// Ordem importa: regras mais específicas primeiro (ex.: "aditamento" antes
	// de "denúncia", já que "aditamento à denúncia" contém as duas palavras).
	const HIGHLIGHT_RULES = [
		{ id: "aditamento", label: "Aditamento à Denúncia", re: /aditament/i, extractDoc: true },
		{ id: "denuncia", label: "Denúncia", re: /den[uú]ncia/i, extractDoc: true },
		{ id: "audiencia", label: "Audiência", re: /audi[eê]ncia/i },
		{ id: "sentenca", label: "Sentença", re: /senten[çc]a/i },
		{ id: "acordao", label: "Acórdão", re: /ac[oó]rd[ãa]o/i },
		{ id: "recurso", label: "Recurso", re: /recurso|apela[çc][ãa]o|embargos de declara/i },
		{ id: "transito", label: "Trânsito em Julgado", re: /tr[aâ]nsito em julgado/i },
		{ id: "arquivamento", label: "Arquivamento", re: /arquivad|arquivamento/i },
		{ id: "distribuicao", label: "Distribuição", re: /distribu[íi]d/i },
	];

	function classify(text) {
		for (let i = 0; i < HIGHLIGHT_RULES.length; i++) {
			if (HIGHLIGHT_RULES[i].re.test(text)) return HIGHLIGHT_RULES[i];
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Detecção de tela de processo (mesma técnica dos recursos irmãos)
	// -------------------------------------------------------------------

	let processScreenEligible = false;
	function findProcessToolbarElement() {
		const candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			const text = (el.textContent || el.value || "").trim();
			if (PROCESS_TOOLBAR_LABELS.indexOf(text) !== -1) return el;
		}
		return null;
	}
	function isOnProcessScreen() {
		if (processScreenEligible) return true;
		if (findProcessToolbarElement() || document.querySelector(EVENT_LINK_SELECTOR) || findMovementsTable()) {
			processScreenEligible = true;
		}
		return processScreenEligible;
	}

	function extractProcessNumber() {
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return projudiEl.textContent.trim();
		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl) {
			const match = seeuEl.textContent.match(/([\d.\-]{15,})/);
			if (match) return match[1];
		}
		const match = document.title.match(/([\d.\-]{15,})/);
		return match ? match[1] : "processo-desconhecido";
	}

	// -------------------------------------------------------------------
	// Coleta de eventos da tela atual
	// -------------------------------------------------------------------
	//
	// A tabela de Movimentações do Projudi tem colunas "Seq.", "Data",
	// "Evento" e "Movimentado Por" — mas nem todo evento vira um link
	// clicável com id="LNKmov..." (só os que levam a uma tela de
	// detalhe/ação o têm; eventos automáticos do sistema, sem essa
	// possibilidade, ficam como texto puro na célula). Usar só esse
	// seletor de link deixava a maioria dos eventos de fora. Por isso a
	// coleta agora localiza a TABELA pelo cabeçalho ("Evento" +
	// "Movimentado Por") e lê linha a linha, o que também é mais estável
	// entre Projudi e SEEU.
	//
	// Os documentos anexados a cada evento só aparecem no DOM depois que o
	// usuário expande o indicador "Arquivos N" daquela linha (mesmo padrão
	// de ícone "+"/showDetail já usado no recurso de Pendências, em
	// content.js) — por isso, depois de montar a lista de eventos, a
	// extensão clica automaticamente nesses indicadores (leitura apenas,
	// nenhuma ação processual) e aguarda o resultado ser inserido no DOM
	// antes de coletar os links de documento.

	const EXPAND_ICON_SELECTOR = 'a[id^="linkArquivos"] img, img[onclick*="showDetail"], img[id^="icon"]';
	const EXPAND_WAIT_MS = 1500;

	function normalizeText(node) {
		const clone = node.cloneNode(true);
		clone.querySelectorAll("img, input, script, style").forEach(function (el) {
			el.remove();
		});
		return (clone.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findDateIn(text) {
		const match = text.match(/(\d{2}\/\d{2}\/\d{4})(?:\s+(?:às\s+)?(\d{2}:\d{2}(?::\d{2})?))?/);
		if (!match) return null;
		return { date: match[1], time: match[2] || null };
	}

	function collectDocsFromRow(row) {
		const docs = [];
		if (!row || !row.querySelectorAll) return docs;
		row.querySelectorAll('a.link[href*="' + DOC_LINK_HREF_MARKER + '"]').forEach(function (a) {
			let href;
			try {
				href = new URL(a.getAttribute("href"), document.baseURI).href;
			} catch (e) {
				href = a.getAttribute("href");
			}
			docs.push({ href: href, name: (a.textContent || "documento").trim() });
		});
		return docs;
	}

	function isStruckThrough(el) {
		if (!el) return false;
		if (el.querySelector && el.querySelector("strike, s, del")) return true;
		const all = [el].concat(el.querySelectorAll ? Array.prototype.slice.call(el.querySelectorAll("*")) : []);
		return all.some(function (node) {
			if (node.nodeType !== 1 || !window.getComputedStyle) return false;
			const cs = window.getComputedStyle(node);
			return cs && /line-through/.test(cs.textDecorationLine || cs.textDecoration || "");
		});
	}

	// Remove o indicador "Arquivos N" (link/ícone de expandir) do texto do
	// evento — sem isso ele aparecia embutido no meio da frase, quebrando a
	// leitura ("...JUNTADA DE PETIÇÃO Arquivos 1 03/01/2021...").
	function cleanEventoText(cell) {
		const clone = cell.cloneNode(true);
		clone.querySelectorAll("img, script, style, input").forEach(function (el) {
			el.remove();
		});
		clone.querySelectorAll("a, span").forEach(function (el) {
			const t = (el.textContent || "").trim();
			if (/^\(?\d+\)?\s*arquivos?$/i.test(t) || /^arquivos?\s*\(?\d+\)?$/i.test(t)) el.remove();
		});
		return (clone.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findMovementsTable() {
		const tables = document.querySelectorAll("table");
		for (let t = 0; t < tables.length; t++) {
			const table = tables[t];
			const rows = table.rows;
			for (let r = 0; r < Math.min(rows.length, 3); r++) {
				const cells = rows[r].cells;
				const texts = [];
				for (let c = 0; c < cells.length; c++) texts.push(normalizeText(cells[c]).toLowerCase());
				const hasEvento = texts.some(function (txt) {
					return /^evento/.test(txt);
				});
				const hasMovimentado = texts.some(function (txt) {
					return /movimentado/.test(txt);
				});
				if (hasEvento && hasMovimentado) {
					return { table: table, headerRowIndex: r, headerTexts: texts };
				}
			}
		}
		return null;
	}

	function wait(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	function findArquivosToggle(row) {
		const icon = row.querySelector(EXPAND_ICON_SELECTOR);
		if (icon) return icon;
		const candidates = row.querySelectorAll("a, span");
		for (let i = 0; i < candidates.length; i++) {
			const t = (candidates[i].textContent || "").trim();
			if (/^\(?\d+\)?\s*arquivos?$/i.test(t) || /^arquivos?\s*\(?\d+\)?$/i.test(t)) return candidates[i];
		}
		return null;
	}

	// A partir do ícone "+" (ex.: id="icon0"), localiza o contêiner que o
	// Projudi preenche com o resultado da expansão (ex.: id="row0"/"div0") —
	// mesma técnica já usada e validada no recurso de Pendências
	// (content.js, findContainerForIcon). Sem um id numerado reconhecível,
	// cai de volta para a própria linha e a linha seguinte.
	function findExpandedContainer(icon, row) {
		const id = icon.id || "";
		const match = id.match(/(\d+)$/);
		if (match) {
			const suffix = match[1];
			const byRow = document.getElementById("row" + suffix);
			if (byRow) return byRow;
			const byDiv = document.getElementById("div" + suffix);
			if (byDiv) return byDiv;
		}
		const next = row.nextElementSibling;
		if (next && next.tagName === "TR") return next;
		return row;
	}

	// Devolve a lista de eventos encontrados NA TELA ATUAL. Só expande (por
	// clique programático) os indicadores "Arquivos N" das linhas — nenhuma
	// navegação, nenhuma ação processual — para poder coletar os links de
	// documento que o Projudi só insere no DOM depois dessa expansão.
	async function collectFromCurrentScreen(onProgress) {
		const found = findMovementsTable();
		if (!found) return legacyCollectFromCurrentScreen();

		const headerTexts = found.headerTexts;
		const seqIdx = headerTexts.findIndex(function (t) {
			return /^seq/.test(t);
		});
		let eventoIdx = headerTexts.findIndex(function (t) {
			return /^evento/.test(t);
		});
		if (eventoIdx === -1) eventoIdx = headerTexts.findIndex(function (t) {
			return /evento/.test(t);
		});
		const dataIdx = headerTexts.findIndex(function (t) {
			return /^data/.test(t);
		});

		const rows = Array.prototype.slice.call(found.table.rows).slice(found.headerRowIndex + 1);
		const events = [];
		let current = null;

		rows.forEach(function (row, idx) {
			const cells = row.cells;
			if (eventoIdx !== -1 && cells.length > eventoIdx) {
				const eventoCell = cells[eventoIdx];
				if (isStruckThrough(eventoCell)) {
					current = null;
					return;
				}
				const text = cleanEventoText(eventoCell);
				if (!text) {
					current = null;
					return;
				}
				const seqText = seqIdx !== -1 && cells[seqIdx] ? normalizeText(cells[seqIdx]) : "";
				const dataText = dataIdx !== -1 && cells[dataIdx] ? normalizeText(cells[dataIdx]) : "";
				const dateInfo = findDateIn(dataText) || findDateIn(normalizeText(row));
				current = {
					id: "seq-" + (seqText || idx) + "-" + idx,
					seq: seqText,
					date: dateInfo ? dateInfo.date : null,
					time: dateInfo ? dateInfo.time : null,
					text: text,
					docs: collectDocsFromRow(row),
					_row: row,
					_toggle: findArquivosToggle(row),
				};
				events.push(current);
			} else if (current) {
				// Linha de continuação (ex.: conteúdo já expandido de "Arquivos") —
				// não tem a coluna Evento própria; junta os documentos dela ao
				// último evento válido.
				collectDocsFromRow(row).forEach(function (doc) {
					if (!current.docs.some(function (d) { return d.href === doc.href; })) current.docs.push(doc);
				});
			}
		});

		const toExpand = events.filter(function (ev) {
			return ev._toggle && ev.docs.length === 0;
		});
		if (toExpand.length) {
			if (onProgress) onProgress("Expandindo anexos de " + toExpand.length + " evento(s)…");
			toExpand.forEach(function (ev) {
				try {
					ev._toggle.click();
				} catch (err) {
					/* ignore */
				}
			});
			await wait(EXPAND_WAIT_MS);
			toExpand.forEach(function (ev) {
				const container = findExpandedContainer(ev._toggle, ev._row);
				[ev._row, container].forEach(function (scope) {
					collectDocsFromRow(scope).forEach(function (doc) {
						if (!ev.docs.some(function (d) { return d.href === doc.href; })) ev.docs.push(doc);
					});
				});
			});
		}

		events.forEach(function (ev) {
			delete ev._row;
			delete ev._toggle;
		});
		return events;
	}

	// Reserva para telas em que a tabela de Movimentações não é reconhecida
	// pelo cabeçalho (ex.: layout muito diferente) — mesmo comportamento da
	// versão anterior deste recurso, baseado só nos links de evento válidos.
	function legacyCollectFromCurrentScreen() {
		const links = document.querySelectorAll(EVENT_LINK_SELECTOR);
		const events = [];
		links.forEach(function (link) {
			if ((link.id || "").indexOf("INVALIDO") !== -1) return;
			if (link.closest("strike, s, del")) return;
			const row = link.closest("tr") || link.closest("td") || link.parentElement;
			if (!row) return;
			const rowText = normalizeText(row);
			const dateInfo = findDateIn(rowText);
			events.push({
				id: link.id,
				date: dateInfo ? dateInfo.date : null,
				time: dateInfo ? dateInfo.time : null,
				text: rowText,
				docs: collectDocsFromRow(row),
			});
		});
		return events;
	}

	// -------------------------------------------------------------------
	// Acumulador em memória (uma "aba"/grau por vez — ver limitação no topo)
	// -------------------------------------------------------------------

	const collected = new Map(); // id -> evento

	function addEvents(events) {
		events.forEach(function (ev) {
			collected.set(ev.id, ev);
		});
	}

	function sortedEvents() {
		return Array.from(collected.values()).sort(function (a, b) {
			const ka = sortKey(a);
			const kb = sortKey(b);
			return ka.localeCompare(kb);
		});
	}

	function sortKey(ev) {
		const seqNum = parseInt(ev.seq, 10);
		const seqPart = "__" + (isNaN(seqNum) ? "999999" : String(seqNum).padStart(6, "0"));
		if (!ev.date) return "9999-99-99 99:99:99" + seqPart;
		const parts = ev.date.split("/");
		const iso = parts[2] + "-" + parts[1] + "-" + parts[0];
		return iso + " " + (ev.time || "00:00:00") + seqPart;
	}

	// -------------------------------------------------------------------
	// Extração de texto de PDF (pdf.js, vendorizado - ver src/vendor/)
	// -------------------------------------------------------------------

	function fetchDocBase64(href) {
		return new Promise(function (resolve, reject) {
			chrome.runtime.sendMessage({ source: MESSAGE_SOURCE, type: "certidao-fetch-doc", href: href }, function (response) {
				if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
				if (!response || !response.ok) return reject(new Error((response && response.error) || "Falha ao baixar o documento."));
				resolve(response);
			});
		});
	}

	function base64ToUint8Array(base64) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	}

	async function extractPdfText(href) {
		const doc = await fetchDocBase64(href);
		if (!/pdf/i.test(doc.contentType || "") && !/\.pdf($|\?)/i.test(href)) {
			throw new Error("Documento não é um PDF (não é possível extrair texto automaticamente).");
		}
		if (!window.pdfjsLib) throw new Error("Biblioteca de leitura de PDF não carregou.");
		window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("src/vendor/pdf.worker.min.js");
		const bytes = base64ToUint8Array(doc.base64);
		const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
		const numPages = Math.min(pdf.numPages, MAX_PDF_PAGES);
		let fullText = "";
		for (let i = 1; i <= numPages; i++) {
			const page = await pdf.getPage(i);
			const content = await page.getTextContent();
			const pageText = content.items.map(function (item) {
				return item.str;
			}).join(" ");
			fullText += pageText + "\n\n";
		}
		return fullText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
	}

	// Heurística: não tenta "entender" o documento, só localiza trechos com
	// grande probabilidade de conter a capitulação penal (referências a
	// artigo de lei) e devolve também o início do texto (onde a denúncia
	// normalmente qualifica o(a) denunciado(a)), para o usuário revisar e
	// completar manualmente antes de usar na certidão final.
	const CRIME_ARTICLE_RE =
		/art(?:igo)?s?\.?\s*\d+[ºo°]?(?:[-,]\s*(?:§\s*\d+[ºo°]?|par[aá]grafo\s*[uú]nico|inciso\s*[IVXLCDM]+))*(?:,?\s*(?:c\/c|combinado\s+com)\s*(?:o\s*)?art(?:igo)?s?\.?\s*\d+[ºo°]?)*\s*,?\s*(?:d[oa]s?)\s*(?:C[óo]digo\s+Penal|CP|Lei\s*(?:federal\s*)?n[ºo°]?\.?\s*[\d.]+\/\d{2,4}|Lei\s+de\s+[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+)*)/gi;

	function extractHeuristics(text) {
		const crimesFound = [];
		const seen = Object.create(null);
		let match;
		CRIME_ARTICLE_RE.lastIndex = 0;
		while ((match = CRIME_ARTICLE_RE.exec(text))) {
			const clean = match[0].replace(/\s+/g, " ").trim();
			const key = clean.toLowerCase();
			if (!seen[key]) {
				seen[key] = true;
				crimesFound.push(clean);
			}
			if (crimesFound.length >= 15) break;
		}
		const qualificationExcerpt = text.slice(0, 2500).trim();
		return { crimes: crimesFound, qualificationExcerpt: qualificationExcerpt };
	}

	// -------------------------------------------------------------------
	// Botão flutuante e painel
	// -------------------------------------------------------------------

	let launcher = null;
	let panel = null;

	function ensureLauncher() {
		if (launcher && launcher.isConnected) return;
		if (!isOnProcessScreen()) return;
		launcher = document.createElement("button");
		launcher.type = "button";
		launcher.id = "pdp-certidao-launcher";
		launcher.className = "pdp-certidao-launcher";
		launcher.innerHTML = '<span class="pdp-certidao-icon">📜</span><span>Certidão Explicativa</span>';
		launcher.title = "Montar uma minuta de certidão explicativa dos autos";
		launcher.addEventListener("click", togglePanel);
		document.body.appendChild(launcher);
	}

	function reposition() {
		if (!launcher) return;
		const others = Array.prototype.slice.call(document.querySelectorAll(OTHER_BUTTON_SELECTOR));
		if (others.length) {
			let minLeft = null;
			let minTop = null;
			let maxBottom = null;
			others.forEach(function (btn) {
				const rect = btn.getBoundingClientRect();
				if (minLeft === null || rect.left < minLeft) minLeft = rect.left;
				if (minTop === null || rect.top < minTop) minTop = rect.top;
				if (maxBottom === null || rect.bottom > maxBottom) maxBottom = rect.bottom;
			});
			const center = (minTop + maxBottom) / 2;
			const height = launcher.offsetHeight || 32;
			launcher.style.bottom = Math.max(BUTTON_SCREEN_MARGIN, Math.round(window.innerHeight - center - height / 2)) + "px";
			launcher.style.right = Math.round(window.innerWidth - minLeft + 8) + "px";
			return;
		}
		let bottom = BUTTON_SCREEN_MARGIN;
		const toolbarButton = findProcessToolbarElement();
		if (toolbarButton) {
			const row = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = row.getBoundingClientRect();
			if (rect.bottom > 0 && rect.top < window.innerHeight) {
				bottom = Math.min(Math.max(BUTTON_SCREEN_MARGIN, Math.round(window.innerHeight - rect.top + BUTTON_SCREEN_MARGIN)), window.innerHeight - BUTTON_SCREEN_MARGIN);
			}
		}
		launcher.style.bottom = bottom + "px";
		launcher.style.right = BUTTON_SCREEN_MARGIN + "px";
	}

	function closePanel() {
		if (panel) {
			panel.remove();
			panel = null;
		}
	}

	function togglePanel() {
		if (panel) {
			closePanel();
			return;
		}
		buildPanel();
	}

	function buildPanel() {
		panel = document.createElement("div");
		panel.className = "pdp-certidao-panel";
		panel.innerHTML =
			'<div class="pdp-certidao-panel-header"><span>📜 Certidão Explicativa dos Autos</span>' +
			'<button type="button" class="pdp-certidao-close">✕</button></div>' +
			'<div class="pdp-certidao-panel-body">' +
			'<p class="pdp-certidao-hint">Lê as movimentações desta tela e monta uma minuta narrativa, destacando denúncia, ' +
			"aditamento, audiências, sentença, acórdão, trânsito em julgado e arquivamento. A minuta abre em uma aba nova, " +
			"editável, para revisão antes de virar a certidão oficial.</p>" +
			'<p class="pdp-certidao-hint pdp-certidao-warn">Se o processo tiver movimentações em mais de uma aba/grau (ex.: ' +
			'1º e 2º grau, apensos), mude para cada uma delas e clique em "Coletar desta tela" outra vez antes de gerar — ' +
			"os eventos coletados vão se somando.</p>" +
			'<div class="pdp-certidao-status"></div>' +
			'<div class="pdp-certidao-actions">' +
			'<button type="button" class="pdp-certidao-collect">🔍 Coletar desta tela</button>' +
			'<button type="button" class="pdp-certidao-clear">🗑 Limpar coletados</button>' +
			"</div>" +
			'<button type="button" class="pdp-certidao-generate" disabled>📄 Gerar minuta da certidão</button>' +
			"</div>";
		document.body.appendChild(panel);

		panel.querySelector(".pdp-certidao-close").addEventListener("click", closePanel);
		panel.querySelector(".pdp-certidao-collect").addEventListener("click", onCollectClick);
		panel.querySelector(".pdp-certidao-clear").addEventListener("click", onClearClick);
		panel.querySelector(".pdp-certidao-generate").addEventListener("click", onGenerateClick);

		positionPanel();
		refreshStatus();
	}

	function positionPanel() {
		if (!panel || !launcher) return;
		const rect = launcher.getBoundingClientRect();
		panel.style.bottom = Math.round(window.innerHeight - rect.top + 6) + "px";
		panel.style.right = Math.round(window.innerWidth - rect.right) + "px";
	}

	function refreshStatus(message) {
		if (!panel) return;
		const statusEl = panel.querySelector(".pdp-certidao-status");
		const count = collected.size;
		let docCount = 0;
		collected.forEach(function (ev) {
			docCount += ev.docs.length;
		});
		statusEl.textContent = message || count + " evento(s) coletado(s) até agora (" + docCount + " documento(s) associado(s)).";
		panel.querySelector(".pdp-certidao-generate").disabled = count === 0;
	}

	async function onCollectClick() {
		const collectBtn = panel.querySelector(".pdp-certidao-collect");
		collectBtn.disabled = true;
		refreshStatus("Lendo movimentações desta tela…");
		try {
			const events = await collectFromCurrentScreen(refreshStatus);
			if (!events.length) {
				refreshStatus('Nenhuma movimentação válida encontrada nesta tela. Abra a aba "Movimentações" do processo.');
				return;
			}
			addEvents(events);
			refreshStatus();
		} finally {
			collectBtn.disabled = false;
		}
	}

	function onClearClick() {
		if (collected.size && !confirm("Limpar todos os " + collected.size + " evento(s) já coletado(s)?")) return;
		collected.clear();
		refreshStatus();
	}

	async function onGenerateClick() {
		const events = sortedEvents();
		if (!events.length) return;

		const generateBtn = panel.querySelector(".pdp-certidao-generate");
		generateBtn.disabled = true;
		const originalLabel = generateBtn.textContent;

		const enriched = [];
		let docIndex = 0;
		let docTotal = 0;
		events.forEach(function (ev) {
			const rule = classify(ev.text);
			if (rule && rule.extractDoc && ev.docs.length) docTotal += 1;
		});

		for (let i = 0; i < events.length; i++) {
			const ev = events[i];
			const rule = classify(ev.text);
			const item = { event: ev, rule: rule, extraction: null, extractionError: null };
			if (rule && rule.extractDoc && ev.docs.length) {
				docIndex++;
				generateBtn.textContent = "Lendo documento " + docIndex + "/" + docTotal + "…";
				try {
					const text = await extractPdfText(ev.docs[0].href);
					item.extraction = extractHeuristics(text);
				} catch (err) {
					item.extractionError = String((err && err.message) || err);
				}
			}
			enriched.push(item);
		}

		generateBtn.textContent = originalLabel;
		generateBtn.disabled = false;

		openDraftTab(enriched);
	}

	// -------------------------------------------------------------------
	// Montagem da minuta (aba nova, HTML editável)
	// -------------------------------------------------------------------

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text == null ? "" : text;
		return div.innerHTML;
	}

	const MONTHS_PT = [
		"janeiro", "fevereiro", "março", "abril", "maio", "junho",
		"julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
	];

	// Converte "03/01/2021" em "03 de janeiro de 2021" — mesmo formato por
	// extenso usado nas certidões narratórias do eproc/STJ, que lê de forma
	// mais fluida numa frase corrida do que a data numérica isolada.
	function dateExtenso(dateStr) {
		if (!dateStr) return "data não identificada";
		const parts = dateStr.split("/");
		if (parts.length !== 3) return dateStr;
		const day = parseInt(parts[0], 10);
		const month = MONTHS_PT[parseInt(parts[1], 10) - 1];
		if (!month) return dateStr;
		return (day < 10 ? "0" + day : day) + " de " + month + " de " + parts[2];
	}

	// Frase corrida por evento, no molde "em 03 de janeiro de 2021, [texto do
	// evento]" — os eventos são unidos por "; " numa única narrativa (ver
	// buildNarrativeParagraph), em vez de itens soltos de lista, para ler
	// como um texto humano/corrido, no mesmo estilo das certidões
	// narratórias do eproc/STJ.
	function formatEventoFrase(item) {
		const ev = item.event;
		const when = "em " + dateExtenso(ev.date) + (ev.time ? ", às " + ev.time : "");
		const textHtml = escapeHtml(ev.text);
		const body = item.rule
			? '<mark class="pdp-cert-highlight" data-cat="' + item.rule.id + '">' + textHtml + "</mark>"
			: textHtml;
		return when + ", " + body;
	}

	function buildNarrativeParagraph(enriched) {
		return enriched.map(formatEventoFrase).join("; ") + ".";
	}

	// Bloco separado (fora da narrativa corrida) com o que foi extraído
	// automaticamente do PDF de cada denúncia/aditamento — mantém a
	// narrativa principal fluida, sem interromper a leitura no meio da
	// frase com o texto bruto extraído do documento.
	function buildExtractionSections(enriched) {
		const withDoc = enriched.filter(function (item) {
			return item.rule && item.rule.extractDoc && item.event.docs.length;
		});
		if (!withDoc.length) return "";

		const blocks = withDoc
			.map(function (item, index) {
				const ev = item.event;
				let html =
					'<div class="pdp-cert-extract">' +
					"<strong>" +
					(index + 1) +
					". " +
					escapeHtml(item.rule.label) +
					" de " +
					escapeHtml(dateExtenso(ev.date)) +
					' — documento "' +
					escapeHtml(ev.docs[0].name) +
					'":</strong>';

				if (item.extractionError) {
					html +=
						"<p><em>Não foi possível extrair automaticamente o texto deste documento (" +
						escapeHtml(item.extractionError) +
						"). Abra-o manualmente e preencha abaixo:</em></p>";
					html += '<div contenteditable="true" class="pdp-cert-editable">[qualificação do(a) denunciado(a) e capitulação penal — preencher manualmente]</div>';
				} else {
					const extraction = item.extraction;
					html += "<p>Capitulação penal identificada automaticamente (revise antes de usar):</p>";
					html +=
						'<div contenteditable="true" class="pdp-cert-editable">' +
						(extraction.crimes.length
							? escapeHtml(extraction.crimes.join("; "))
							: "[nenhuma referência a artigo de lei identificada automaticamente — preencher manualmente]") +
						"</div>";
					html += "<p>Trecho inicial do documento (geralmente traz a qualificação do(a) denunciado(a) — revise e recorte o necessário):</p>";
					html += '<div contenteditable="true" class="pdp-cert-editable pdp-cert-editable-long">' + escapeHtml(extraction.qualificationExcerpt) + "</div>";
				}
				html += "</div>";
				return html;
			})
			.join("");

		return (
			'<p contenteditable="true"><strong>Qualificação e capitulação penal identificadas nos documentos de denúncia/aditamento:</strong></p>' +
			blocks
		);
	}

	function buildDraftHtml(enriched) {
		const processNumber = extractProcessNumber();
		const highlightedItems = enriched.filter(function (item) {
			return !!item.rule;
		});
		const summaryList = highlightedItems
			.map(function (item) {
				return "<li>" + escapeHtml(dateExtenso(item.event.date)) + " — " + escapeHtml(item.rule.label) + "</li>";
			})
			.join("");

		const narrativeParagraph = buildNarrativeParagraph(enriched);
		const extractionSections = buildExtractionSections(enriched);

		return (
			"<!doctype html><html><head><meta charset=\"utf-8\"><title>Minuta de Certidão Explicativa</title>" +
			"<style>" +
			"body{font-family:'Times New Roman', serif; font-size:14px; line-height:1.7; max-width:900px; margin:32px auto; padding:0 24px; color:#111;}" +
			"h1{font-size:16px; text-align:center; text-transform:uppercase; letter-spacing:.03em;}" +
			".pdp-cert-toolbar{position:sticky; top:0; background:#fffbe6; border:1px solid #e8cf8a; border-radius:4px; padding:8px 12px; margin-bottom:20px; font-family:Arial, sans-serif; font-size:12.5px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;}" +
			".pdp-cert-toolbar button{font-size:12px; padding:5px 10px; cursor:pointer;}" +
			".pdp-cert-summary{background:#f4f7fb; border:1px solid #d5e2f2; border-radius:4px; padding:10px 16px; margin-bottom:20px; font-family:Arial, sans-serif; font-size:13px;}" +
			".pdp-cert-summary li{margin:2px 0;}" +
			".pdp-cert-narrative{text-align:justify;}" +
			".pdp-cert-highlight{background:#fff3b0; padding:0 1px;}" +
			".pdp-cert-extract{margin:10px 0 18px; padding:10px 14px; background:#f7fcf7; border:1px dashed #9bcf9b; border-radius:4px; font-family:Arial, sans-serif; font-size:12.5px;}" +
			".pdp-cert-extract p{margin:8px 0 2px;}" +
			".pdp-cert-editable{border:1px solid #cfe3cf; background:#fff; border-radius:3px; padding:6px 8px; margin:4px 0 2px; min-height:1.4em; white-space:pre-wrap;}" +
			".pdp-cert-editable-long{max-height:260px; overflow:auto;}" +
			".pdp-cert-editable:focus{outline:2px solid #6c93d6;}" +
			"[contenteditable]:focus{outline:2px solid #6c93d6;}" +
			"@media print{.pdp-cert-toolbar{display:none;} .pdp-cert-editable{border:none; padding:0;}}" +
			"</style></head><body>" +
			'<div class="pdp-cert-toolbar">' +
			"<strong>Minuta — revise todo o conteúdo antes de expedir a certidão oficial.</strong>" +
			'<button type="button" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>' +
			"</div>" +
			"<h1 contenteditable=\"true\">Certidão Explicativa dos Autos</h1>" +
			'<p contenteditable="true">Certifico, para os fins de direito, que o processo nº <strong>' +
			escapeHtml(processNumber) +
			"</strong> apresenta, a partir das movimentações e documentos constantes dos autos, o resumo a seguir, com destaque para os " +
			"principais atos processuais (denúncia, aditamento, audiências, sentença, acórdão, trânsito em julgado e arquivamento, " +
			"quando existentes):</p>" +
			(summaryList
				? '<div class="pdp-cert-summary"><strong>Principais eventos identificados:</strong><ul>' + summaryList + "</ul></div>"
				: "") +
			'<p contenteditable="true" class="pdp-cert-narrative">' + narrativeParagraph + "</p>" +
			extractionSections +
			'<p contenteditable="true">Nada mais havendo a certificar, encerro a presente certidão, que segue assinada digitalmente.</p>' +
			"</body></html>"
		);
	}

	function openDraftTab(enriched) {
		const html = buildDraftHtml(enriched);
		const blob = new Blob([html], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		window.open(url, "_blank");
		setTimeout(function () {
			URL.revokeObjectURL(url);
		}, 60000);
	}

	// -------------------------------------------------------------------
	// Reconciliação (sobrevive a trocas de aba do processo)
	// -------------------------------------------------------------------

	function reconcile() {
		try {
			if (!launcher || !launcher.isConnected) ensureLauncher();
			if (panel && !panel.isConnected) panel = null;
			reposition();
			if (panel) positionPanel();
		} catch (err) {
			console.error("[Projudi Certidão]", "erro ao reconciliar:", err);
		}
	}

	setInterval(reconcile, 700);
	reconcile();

	const observer = new MutationObserver(function () {
		try {
			reconcile();
		} catch (err) {
			console.error("[Projudi Certidão]", "erro no MutationObserver:", err);
		}
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });

	let repositionScheduled = false;
	function scheduleReposition() {
		if (repositionScheduled) return;
		repositionScheduled = true;
		requestAnimationFrame(function () {
			repositionScheduled = false;
			reposition();
			if (panel) positionPanel();
		});
	}
	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);
})();
