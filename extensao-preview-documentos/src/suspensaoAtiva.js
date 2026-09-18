// Projudi - Indicador de suspensão ativa ao lado do número único do processo
//
// A aba "Informações Adicionais" do processo tem uma seção "Benefícios/
// Medidas/Suspensões" com um campo "Suspensões:" — uma lista (<ul><li>) em
// que cada item tem o formato "<motivo> - <nome> - <status>", ex.:
// "Art. 366 do CPP - RENATO AVELINO DA SILVA - ATIVA". Os motivos mais
// comuns são: "Art. 366, CPP", "Art. 89, L. 9099/95", "Insanidade Mental",
// "ANPP" e "Transação Penal".
//
// Este recurso lê esse campo (esperando a aba terminar de carregar via
// AJAX, como já ocorre com "Informações Gerais" — ver
// sequencialProcessoPrincipal.js) e, se encontrar um item com um desses
// motivos e status "ATIVA", insere um pequeno card logo depois do
// "(N dia(s) em tramitação)" no cabeçalho do processo
// (<h3 id="barraTituloStatusProcessual">), já com o motivo identificado
// escrito nele.
//
// O card precisa continuar visível mesmo navegando por outras abas do
// processo (Movimentações, Partes e Outros, etc.), mas o conteúdo da aba
// "Informações Adicionais" (div#tabprefix1) só fica disponível no DOM
// enquanto ela é a aba ativa — ao trocar de aba, o Projudi pode substituir
// o trecho da página onde ela estava (ver "Troca de abas do processo" no
// README) e o card, se fosse filho daquele trecho, sumiria junto. Por
// isso o estado (suspenso ou não, e com qual motivo) é guardado em
// memória (`estadoAtual`) assim que lido, e cada reconciliação periódica
// reaplica esse estado guardado no cabeçalho atual — sem depender da aba
// "Informações Adicionais" estar acessível naquele momento. O estado só é
// reavaliado quando a aba volta a estar disponível no DOM (normalmente ao
// reabri-la, ou na carga inicial da página).
//
// Estrutura real confirmada a partir de um .mhtml salvo de
// visualizacaoProcesso.do (Projudi/TJPR):
// - aba: <li id="tabItemprefix1" class="currentTab"><...><a>Informações
//   Adicionais</a></...></li>  →  conteúdo em <div id="tabprefix1">
//   (o id fica no <li>, não no <a> — different de outras telas).
// - campo: <td class="label"><label>Suspensões:</label></td>
//   <td colspan="4"><ul><li><a class="link">Art. 366 do CPP - NOME -
//   ATIVA</a></li></ul></td>
// - cabeçalho: <h3 id="barraTituloStatusProcessual">Processo
//   0000250-79.2001.8.16.0033 ... &nbsp;-&nbsp; (9187 dia(s) em
//   tramitação)</h3> — não há <em class="attention"> nesta tela.
(function () {
	"use strict";

	// Evita rodar dentro de iframes ocultos usados por outras
	// funcionalidades desta extensão para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpSuspensaoAtiva) return;
	window.__pdpSuspensaoAtiva = true;

	const TAG = "[Projudi Suspensão Ativa]";
	const CARD_ATTR = "data-pdp-suspensao-card";
	const ABA_LABEL = "Informações Adicionais";
	const CAMPO_LABELS = ["suspensoes", "suspensao"]; // já normalizados (sem acento/caixa)
	const STATUS_ATIVA = ["ativa", "ativo"];

	const MOTIVOS_SUSPENSAO = [
		"art. 366, cpp",
		"art. 366 cpp",
		"art. 366 do cpp",
		"art. 89, l. 9099/95",
		"art. 89 l. 9099/95",
		"art. 89 da lei 9099/95",
		"art. 89, lei 9099/95",
		"insanidade mental",
		"anpp",
		"transação penal",
		"transacao penal",
	];

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	const MOTIVOS_NORMALIZADOS = MOTIVOS_SUSPENSAO.map(normalize);

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

	function matchMotivo(text) {
		const normalized = normalize(text);
		if (!normalized) return null;
		return MOTIVOS_NORMALIZADOS.some((motivo) => normalized.indexOf(motivo) !== -1);
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
	// motivos reconhecidos e status "ATIVA". Retorna o texto a exibir no
	// card, ou null se não encontrar nenhum item ativo reconhecido.
	function findMotivoSuspensaoAtiva(tabContent) {
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
			if (!matchMotivo(text)) {
				console.log(TAG, "item ignorado (motivo não reconhecido):", text);
				continue;
			}
			return displayText(text);
		}

		return null;
	}

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

	function insertCard(motivo) {
		const container = headerContainer();
		if (!container) return false;
		const already = container.querySelector("[" + CARD_ATTR + "]");
		if (already) {
			const textEl = already.querySelector(".pdp-suspensao-card-texto");
			if (textEl) textEl.textContent = "Suspenso: " + motivo;
			already.title = "Suspensão ativa: " + motivo;
			return true;
		}
		const card = document.createElement("span");
		card.setAttribute(CARD_ATTR, "");
		card.title = "Suspensão ativa: " + motivo;
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
		textEl.textContent = "Suspenso: " + motivo;
		card.appendChild(textEl);

		// Insere como último filho do cabeçalho, logo depois de "(N dia(s) em
		// tramitação)", que é sempre o último conteúdo do elemento.
		container.appendChild(card);
		console.log(TAG, "card de suspensão ativa inserido —", motivo);
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
	let estadoAtual;

	// Só reavalia o estado quando a aba "Informações Adicionais" está
	// mesmo disponível agora no DOM — do contrário mantém o último estado
	// conhecido, para o card não sumir enquanto o usuário navega por outra
	// aba do processo.
	function reavaliarSeDisponivel() {
		const tabContent = findTabContent(ABA_LABEL, /* silent */ true);
		if (!tabContent || !tabContent.querySelector("td.label, td.labelRadio")) return;
		const motivo = findMotivoSuspensaoAtiva(tabContent);
		if (motivo !== estadoAtual) {
			console.log(TAG, "estado de suspensão atualizado:", { anterior: estadoAtual, novo: motivo });
		}
		estadoAtual = motivo;
	}

	function sincronizarCard() {
		if (estadoAtual) {
			insertCard(estadoAtual);
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
