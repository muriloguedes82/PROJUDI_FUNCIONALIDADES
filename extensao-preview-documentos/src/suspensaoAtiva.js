// Projudi - Indicador de suspensão ativa ao lado do número único do processo
//
// A aba "Informações Adicionais" do processo tem uma seção "Benefícios/
// Medidas/Suspensões" com um campo "Suspensões:" — uma lista (<ul><li>) em
// que cada item tem o formato "<motivo> - <nome> - <status>", ex.:
// "Art. 366 do CPP - RENATO AVELINO DA SILVA - ATIVA" ou "Art. 89 da Lei
// 9.099/95 - PAULO CESAR GAÇA - ATIVA". Os motivos mais comuns são:
// "Art. 366, CPP", "Art. 89, L. 9.099/95", "Insanidade Mental", "ANPP" e
// "Transação Penal".
//
// Este recurso lê esse campo (esperando a aba terminar de carregar via
// AJAX, como já ocorre com "Informações Gerais" — ver
// sequencialProcessoPrincipal.js) e, se encontrar um item com um desses
// motivos e status "ATIVA", insere um pequeno card logo depois do
// "(N dia(s) em tramitação)" no cabeçalho do processo
// (<h3 id="barraTituloStatusProcessual">), já com o motivo identificado
// escrito nele. Cada item da lista é também um link (`a.link`) para uma
// tela de detalhe da suspensão (`transacaoPenal.do`) com a "Data de
// Início" dela — o card busca essa data em segundo plano, num iframe
// oculto (mesma técnica de sequencialProcessoPrincipal.js), e a inclui no
// texto assim que a busca termina.
//
// O card precisa continuar visível mesmo navegando por outras abas do
// processo (Movimentações, Partes e Outros, etc.), mas o conteúdo da aba
// "Informações Adicionais" (div#tabprefix1) só fica disponível no DOM
// enquanto ela é a aba ativa — ao trocar de aba, o Projudi pode substituir
// o trecho da página onde ela estava (ver "Troca de abas do processo" no
// README) e o card, se fosse filho daquele trecho, sumiria junto. Por
// isso o estado (suspenso ou não, com qual motivo e data de início) é
// guardado em memória (`estadoAtual`) assim que lido, e cada
// reconciliação periódica reaplica esse estado guardado no cabeçalho
// atual — sem depender da aba "Informações Adicionais" estar acessível
// naquele momento. O estado só é reavaliado quando a aba volta a estar
// disponível no DOM (normalmente ao reabri-la, ou na carga inicial da
// página).
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

	// Evita rodar dentro de iframes ocultos usados por esta ou outras
	// funcionalidades desta extensão para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpSuspensaoAtiva) return;
	window.__pdpSuspensaoAtiva = true;

	const TAG = "[Projudi Suspensão Ativa]";
	const CARD_ATTR = "data-pdp-suspensao-card";
	const LOADER_ATTR = "data-pdp-loader";
	const ABA_LABEL = "Informações Adicionais";
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
	// id, não só por <a>.
	function findTabAnchorByLabel(labelText, silent) {
		const candidates = document.querySelectorAll('[id^="tabItemprefix"]');
		for (const el of candidates) {
			if (normalize(el.textContent) === normalize(labelText)) return el;
		}
		if (!silent) console.log(TAG, "nenhum elemento com id tabItemprefix* casou com o rótulo da aba", { labelText: labelText });
		return null;
	}

	// `silent` evita poluir o console nas reconciliações periódicas, em que
	// a aba não estar disponível agora é esperado (usuário está em outra
	// aba do processo) — não é um erro a cada 1.5s.
	function findTabContent(labelText, silent) {
		const anchor = findTabAnchorByLabel(labelText, silent);
		if (!anchor) return null;
		const match = /tabItemprefix(\d+)/.exec(anchor.id);
		if (!match) return null;
		const content = document.getElementById("tabprefix" + match[1]);
		if (!content && !silent) console.log(TAG, "aba encontrada mas #tabprefix" + match[1] + " não existe no documento");
		return content;
	}

	function waitForTabContent(labelText, timeoutMs) {
		return new Promise(function (resolve) {
			const deadline = Date.now() + timeoutMs;
			(function tick() {
				const content = findTabContent(labelText, /* silent */ true);
				if (content && content.querySelector("td.label, td.labelRadio")) return resolve(content);
				if (Date.now() >= deadline) {
					if (!content) console.log(TAG, "aba '" + labelText + "' não encontrada após " + timeoutMs + "ms de espera na carga inicial");
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

	// Procura, dentro do campo "Suspensões:", um item de lista com um dos
	// motivos reconhecidos e status "ATIVA". Retorna { texto, href } (href
	// = link para a tela de detalhe daquela suspensão, ou null se o item
	// não tiver link) ou null se não encontrar nenhum item ativo
	// reconhecido.
	function findSuspensaoAtiva(tabContent) {
		const label = findLabelCell(tabContent, CAMPO_LABELS);
		if (!label) {
			console.log(TAG, "campo 'Suspensões' não encontrado na aba '" + ABA_LABEL + "'", {
				rotulosEncontrados: Array.prototype.slice
					.call(tabContent.querySelectorAll("td.label label, td.labelRadio label"))
					.map((l) => l.textContent.trim())
					.filter(Boolean),
			});
			return null;
		}

		const row = label.closest("tr");
		const items = row ? Array.prototype.slice.call(row.querySelectorAll("li")) : [];
		const candidates = items.length ? items : row ? Array.prototype.slice.call(row.querySelectorAll("td")).slice(1) : [];

		console.log(TAG, "campo 'Suspensões' encontrado, avaliando itens:", candidates.map((c) => collapseWhitespace(c.textContent)));

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
			return { texto: displayText(text), href: href };
		}

		return null;
	}

	// ---------------------------------------------------------------------
	// Busca em segundo plano da "Data de Início" na tela de detalhe da
	// suspensão (transacaoPenal.do), mesma técnica de iframe oculto já usada
	// em sequencialProcessoPrincipal.js.
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
				if (estadoAtual && estadoAtual.href === href) {
					estadoAtual = Object.assign({}, estadoAtual, { dataInicio: data });
					sincronizarCard();
				}
			})
			.catch(function (err) {
				dataInicioPorHref.set(href, null);
				console.warn(TAG, "falha ao buscar Data de Início:", { href: href, erro: err && (err.stack || err.message || err) });
			});
	}

	// ---------------------------------------------------------------------
	// Card no cabeçalho
	// ---------------------------------------------------------------------

	// Cabeçalho do processo: no Projudi (tela visualizacaoProcesso.do) é
	// <h3 id="barraTituloStatusProcessual">, terminando em "(N dia(s) em
	// tramitação)" — é logo depois desse texto que o card deve aparecer. Em
	// telas/sistemas sem esse cabeçalho (ex.: SEEU), cai para os mesmos
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

	function textoCompleto(estado) {
		if (!estado) return null;
		if (estado.dataInicio) return estado.texto + " (desde " + estado.dataInicio + ")";
		return estado.texto;
	}

	function insertCard(texto) {
		const container = headerContainer();
		if (!container) return false;
		const already = container.querySelector("[" + CARD_ATTR + "]");
		if (already) {
			const textEl = already.querySelector(".pdp-suspensao-card-texto");
			if (textEl) textEl.textContent = "Suspenso: " + texto;
			already.title = "Suspensão ativa: " + texto;
			return true;
		}
		const card = document.createElement("span");
		card.setAttribute(CARD_ATTR, "");
		card.title = "Suspensão ativa: " + texto;
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
		textEl.textContent = "Suspenso: " + texto;
		card.appendChild(textEl);

		// Insere como último filho do cabeçalho, logo depois de "(N dia(s) em
		// tramitação)", que é sempre o último conteúdo do elemento.
		container.appendChild(card);
		console.log(TAG, "card de suspensão ativa inserido —", texto);
		return true;
	}

	function removeCard() {
		document.querySelectorAll("[" + CARD_ATTR + "]").forEach(function (el) {
			el.remove();
		});
	}

	// Estado guardado em memória: sobrevive a trocas de aba do processo
	// (script continua carregado na mesma página, ver guarda
	// `window.__pdpSuspensaoAtiva` no topo) mesmo quando a aba "Informações
	// Adicionais" sai do DOM. `undefined` = ainda não avaliado nesta carga
	// de página; `null` = avaliado, sem suspensão ativa reconhecida.
	// Quando não-nulo: { texto, href, dataInicio }.
	let estadoAtual;

	// Só reavalia o estado quando a aba "Informações Adicionais" está
	// mesmo disponível agora no DOM — do contrário mantém o último estado
	// conhecido, para o card não sumir enquanto o usuário navega por outra
	// aba do processo.
	function reavaliarSeDisponivel() {
		const tabContent = findTabContent(ABA_LABEL, /* silent */ true);
		if (!tabContent || !tabContent.querySelector("td.label, td.labelRadio")) return;

		const encontrado = findSuspensaoAtiva(tabContent);
		const textoAnterior = estadoAtual ? estadoAtual.texto : null;
		const textoNovo = encontrado ? encontrado.texto : null;
		if (textoNovo !== textoAnterior) {
			console.log(TAG, "estado de suspensão atualizado:", { anterior: textoAnterior, novo: textoNovo });
		}

		if (!encontrado) {
			estadoAtual = null;
			return;
		}

		const dataConhecida = encontrado.href ? dataInicioPorHref.get(encontrado.href) : undefined;
		estadoAtual = {
			texto: encontrado.texto,
			href: encontrado.href,
			dataInicio: dataConhecida && dataConhecida !== "pending" ? dataConhecida : null,
		};

		if (encontrado.href) buscarDataInicio(encontrado.href);
	}

	function sincronizarCard() {
		const texto = textoCompleto(estadoAtual);
		if (texto) {
			insertCard(texto);
		} else {
			removeCard();
		}
	}

	function tick() {
		reavaliarSeDisponivel();
		sincronizarCard();
	}

	// Carga inicial: espera a aba "Informações Adicionais" terminar de
	// carregar via AJAX (pode demorar mais que o resto da página) antes da
	// primeira avaliação.
	waitForTabContent(ABA_LABEL, 10000).then(function () {
		tick();
	});

	// A tela do processo pode trocar de aba/recarregar trechos via AJAX (ver
	// "Troca de abas do processo" no README), o que pode remover o card
	// junto com o cabeçalho antigo (ou a própria aba "Informações
	// Adicionais" do DOM). Reconcilia periodicamente: reaplica o último
	// estado conhecido sempre, e reavalia o estado quando a aba estiver
	// disponível — o mesmo padrão já usado por outros elementos desta
	// extensão (ver "Troca de abas do processo" no README).
	setInterval(function () {
		try {
			tick();
		} catch (err) {
			console.error(TAG, "erro na reconciliação periódica:", err);
		}
	}, 1500);
})();
