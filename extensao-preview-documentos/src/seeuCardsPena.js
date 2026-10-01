// SEEU - Cards da pena na linha do número único do processo
//
// Só no SEEU (seeu.pje.jus.br). Na tela do processo de execução, insere
// quatro cards logo à direita do número único (cabeçalho <h3
// id="barraTituloStatusProcessual">), com:
//   - REGIME: valor da linha "Regime Atual:" (ex.: "Aberto  - ATIVO" →
//     "Aberto");
//   - DATA-BASE: linha "Data Base:" da seção "Progressão de Regime";
//   - LIVRAMENTO: só a data da linha "Data do Requisito Temporal:" da seção
//     "Livramento Condicional";
//   - TÉRMINO: só a data da linha "Data do Requisito Temporal:" da seção
//     "Término de Pena".
// Sem data no campo (ex.: "(Em regime aberto deferido em ...)"), o card
// mostra "---" e o texto original fica na dica (title) do card.
//
// Todos esses campos ficam na aba "Informações Adicionais". Mesma técnica de
// suspensaoAtiva.js: se a aba já estiver na página, lê direto; senão, busca
// a aba em segundo plano (POST para o próprio #processoForm com
// selectedIcon=tabDadosAdicionais). O resultado fica em sessionStorage (por
// número do processo), para os cards aparecerem de imediato ao trocar de
// aba. Enquanto a aba não é lida, Livramento e Término vêm do "Sumário da
// Pena" do quadro de informações do processo (linhas ocultas
// tr.temporalRequirement2 "Livramento Condicional:" e "Término:"), presente
// em todas as abas.
//
// Estrutura real confirmada a partir de um .mhtml salvo do SEEU (TJPR, aba
// "Informações Adicionais" de um processo de Execução):
// - <td class="label" data-label="regime atual">Regime Atual:</td>
//   <td nowrap>Aberto  - ATIVO</td>
// - <tr class="temporalRequirement"><td colspan="2"><h4>Progressão de
//   Regime</h4></td>...</tr>, seguido de <td class="label">Data Base<span
//   id="lbDataBaseProgRegManual">(MANUAL)</span>:</td>
//   <td id="tdDataBaseProgressaoRegime"></td>;
// - <h4>Livramento Condicional</h4> ... <td class="label">Data do Requisito
//   Temporal<span>(MANUAL)</span>:</td><td id="tdDataLivramentoCondicional">
//   10/05/2024 </td>;
// - <h4>Término de Pena</h4> ... <td id="tdDataTerminoPena">16/03/2028</td>;
// - cabeçalho: <h3 id="barraTituloStatusProcessual" style="display:flex">
//   <div (coluna)><div class="titulo processo">Execução 0000045-58...</div>
//   <div>2452 dia(s) em tramitação</div></div>...</h3>.
//
// Convivência com o AzFlow: os cards são um elemento próprio, inserido logo
// depois da coluna do número — nunca dentro dos elementos do AzFlow.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!/(^|\.)seeu\.pje\.jus\.br$/i.test(location.hostname)) return; // só SEEU
	if (!location.pathname.startsWith("/seeu/")) return;

	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpSeeuCardsPena) return;
	window.__pdpSeeuCardsPena = true;

	const TAG = "[SEEU Cards da pena]";
	const WRAP_ATTR = "data-pdp-seeu-pena";
	const ABA_LABEL = "Informações Adicionais";
	const ABA_SELECTED_ICON = "tabDadosAdicionais";
	const STORAGE_PREFIX = "pdpSeeuCardsPena:";
	const VAZIO = "---";
	const RE_DATA = /\b\d{2}\/\d{2}\/\d{4}\b/;

	const CARDS = [
		{ chave: "regime", rotulo: "Regime", dica: "Regime Atual" },
		{ chave: "dataBase", rotulo: "Data-base", dica: "Progressão de Regime — Data Base" },
		{ chave: "livramento", rotulo: "Livramento", dica: "Livramento Condicional — Data do Requisito Temporal" },
		{ chave: "termino", rotulo: "Término", dica: "Término de Pena — Data do Requisito Temporal" }
	];

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	// Texto do rótulo sem o "(MANUAL)" (span oculto dentro do <td>) e sem os
	// dois-pontos finais.
	function textoRotulo(td) {
		const copia = td.cloneNode(true);
		copia.querySelectorAll("span").forEach(function (s) { s.remove(); });
		return normalize(copia.textContent).replace(/:\s*$/, "").trim();
	}

	// ---------------------------------------------------------------------
	// Leitura dos campos
	// ---------------------------------------------------------------------

	// Linhas da seção iniciada pelo <h4> `titulo` (até o próximo <h4>).
	function linhasDaSecao(root, titulo) {
		const alvo = normalize(titulo);
		const h4 = Array.from(root.querySelectorAll("h4")).find(function (h) { return normalize(h.textContent) === alvo; });
		const tr = h4 && h4.closest("tr");
		const linhas = [];
		for (let r = tr && tr.nextElementSibling; r; r = r.nextElementSibling) {
			if (r.querySelector("h4")) break;
			linhas.push(r);
		}
		return linhas;
	}

	function valorNaSecao(root, titulo, rotulo) {
		const alvo = normalize(rotulo);
		for (const tr of linhasDaSecao(root, titulo)) {
			const td = tr.querySelector("td.label");
			if (td && textoRotulo(td) === alvo && td.nextElementSibling) return collapse(td.nextElementSibling.textContent);
		}
		return null;
	}

	function valorPorId(root, id) {
		const el = root.querySelector("#" + id);
		return el ? collapse(el.textContent) : null;
	}

	function lerRegime(root) {
		for (const td of root.querySelectorAll("td.label")) {
			if (textoRotulo(td) !== "regime atual" || !td.nextElementSibling) continue;
			return collapse(td.nextElementSibling.textContent);
		}
		return null;
	}

	// "Aberto  - ATIVO" → "Aberto".
	function regimeCurto(texto) {
		return collapse(String(texto || "").split(/\s+-\s+/)[0]) || VAZIO;
	}

	function soData(texto) {
		const m = RE_DATA.exec(String(texto || ""));
		return m ? m[0] : VAZIO;
	}

	function campo(valor, original) {
		return { valor: valor, original: collapse(original) };
	}

	// Lê os quatro campos do conteúdo da aba "Informações Adicionais".
	// Retorna null se a aba não tiver nenhum deles (processo sem cálculo de
	// pena).
	function lerAba(root) {
		const regime = lerRegime(root);
		const dataBase = valorPorId(root, "tdDataBaseProgressaoRegime") ?? valorNaSecao(root, "Progressão de Regime", "Data Base");
		const livramento = valorPorId(root, "tdDataLivramentoCondicional") ?? valorNaSecao(root, "Livramento Condicional", "Data do Requisito Temporal");
		const termino = valorPorId(root, "tdDataTerminoPena") ?? valorNaSecao(root, "Término de Pena", "Data do Requisito Temporal");
		if (regime === null && dataBase === null && livramento === null && termino === null) return null;
		return {
			regime: campo(regimeCurto(regime), regime),
			dataBase: campo(soData(dataBase), dataBase),
			livramento: campo(soData(livramento), livramento),
			termino: campo(soData(termino), termino)
		};
	}

	// Reserva enquanto a aba não é lida: "Sumário da Pena" do quadro de
	// informações do processo (linhas tr.temporalRequirement2, ocultas até o
	// usuário clicar em "Sumário da Pena:").
	function lerSumario(root) {
		const valores = {};
		root.querySelectorAll("tr.temporalRequirement2").forEach(function (tr) {
			const td = tr.querySelector("td.label");
			if (!td || !td.nextElementSibling) return;
			valores[textoRotulo(td)] = collapse(td.nextElementSibling.textContent);
		});
		if (!("termino" in valores) && !("livramento condicional" in valores)) return null;
		return {
			livramento: campo(soData(valores["livramento condicional"]), valores["livramento condicional"]),
			termino: campo(soData(valores["termino"]), valores["termino"])
		};
	}

	// ---------------------------------------------------------------------
	// Aba "Informações Adicionais" (local ou em segundo plano)
	// ---------------------------------------------------------------------

	function findTabContent(root) {
		let li = root.querySelector('li[name="' + ABA_SELECTED_ICON + '"][id^="tabItemprefix"]');
		if (!li) {
			li = Array.from(root.querySelectorAll('[id^="tabItemprefix"]')).find(function (el) {
				return normalize(el.textContent) === normalize(ABA_LABEL);
			});
		}
		const m = li && /tabItemprefix(\d+)/.exec(li.id);
		return m ? root.querySelector("#tabprefix" + m[1]) : null;
	}

	function tabContentReady(content) {
		return !!(content && content.querySelector("td.label"));
	}

	let avisouFormNaoProcesso = false;
	async function buscarAbaPOST() {
		const form = document.getElementById("processoForm");
		if (!form) return null;
		let actionUrl;
		try {
			actionUrl = new URL(form.getAttribute("action") || form.action, location.href);
		} catch (err) {
			return null;
		}
		// Só a tela do processo (lista de abas) pode ser reenviada: outros
		// diálogos também usam id="processoForm", e reenviá-los executaria a
		// ação (ver suspensaoAtiva.js).
		if (
			actionUrl.origin !== location.origin ||
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

		const controller = new AbortController();
		const timeout = setTimeout(function () { controller.abort(); }, 20000);
		try {
			const response = await fetch(actionUrl.href, {
				method: "POST",
				body: body,
				credentials: "same-origin",
				signal: controller.signal
			});
			if (!response.ok) throw new Error("SEEU respondeu " + response.status + " " + response.statusText);
			const bytes = await response.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const html = new TextDecoder((charsetMatch && charsetMatch[1]) || "windows-1252").decode(bytes);
			return new DOMParser().parseFromString(html, "text/html");
		} finally {
			clearTimeout(timeout);
		}
	}

	// ---------------------------------------------------------------------
	// Estado (memória + sessionStorage por número do processo)
	// ---------------------------------------------------------------------

	function numeroProcesso() {
		const header = document.getElementById("barraTituloStatusProcessual");
		const fontes = [header && header.textContent, document.title];
		for (const fonte of fontes) {
			const m = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/.exec(fonte || "");
			if (m) return m[1];
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
			sessionStorage.setItem(key, JSON.stringify(estado));
		} catch (err) {
			// sessionStorage indisponível — fica só em memória
		}
	}

	function carregarEstado() {
		const key = storageKey();
		if (!key) return null;
		try {
			const raw = sessionStorage.getItem(key);
			return raw ? JSON.parse(raw) : null;
		} catch (err) {
			return null;
		}
	}

	// null = aba ainda não lida (cards só com o Sumário da Pena, se houver).
	let estadoAba = carregarEstado();

	function estadoParaExibir() {
		if (estadoAba) return estadoAba.dados || null; // dados null = aba lida, sem pena
		const sumario = lerSumario(document);
		if (!sumario) return null;
		return {
			regime: campo(VAZIO, ""),
			dataBase: campo(VAZIO, ""),
			livramento: sumario.livramento,
			termino: sumario.termino
		};
	}

	function aplicarLeituraDaAba(dados) {
		estadoAba = { dados: dados };
		salvarEstado(estadoAba);
		sincronizarCards();
	}

	// ---------------------------------------------------------------------
	// Cards
	// ---------------------------------------------------------------------

	// Ponto de inserção: logo depois da coluna que tem o número do processo e
	// os dias em tramitação (filho direto do <h3>).
	function pontoDeInsercao() {
		const h3 = document.getElementById("barraTituloStatusProcessual");
		const titulo = h3 && h3.querySelector("div.titulo.processo");
		if (!titulo) return null;
		let coluna = titulo;
		while (coluna.parentElement && coluna.parentElement !== h3) coluna = coluna.parentElement;
		return coluna.parentElement === h3 ? coluna : null;
	}

	function criarWrap() {
		const wrap = document.createElement("span");
		wrap.setAttribute(WRAP_ATTR, "");
		wrap.className = "pdp-seeu-pena";
		CARDS.forEach(function (def) {
			const card = document.createElement("span");
			card.className = "pdp-seeu-pena-card pdp-seeu-pena-" + def.chave;
			card.setAttribute("data-chave", def.chave);
			const rotulo = document.createElement("span");
			rotulo.className = "pdp-seeu-pena-rotulo";
			rotulo.textContent = def.rotulo;
			const valor = document.createElement("span");
			valor.className = "pdp-seeu-pena-valor";
			card.append(rotulo, valor);
			wrap.appendChild(card);
		});
		return wrap;
	}

	function sincronizarCards() {
		const dados = estadoParaExibir();
		let wrap = document.querySelector("[" + WRAP_ATTR + "]");
		if (!dados) {
			if (wrap) wrap.remove();
			return;
		}
		const ponto = pontoDeInsercao();
		if (!ponto) return;
		if (!wrap) wrap = criarWrap();
		if (wrap.previousElementSibling !== ponto) ponto.insertAdjacentElement("afterend", wrap);
		wrap.classList.toggle("pdp-seeu-pena-provisorio", !estadoAba);

		CARDS.forEach(function (def) {
			const card = wrap.querySelector('[data-chave="' + def.chave + '"]');
			const info = dados[def.chave] || campo(VAZIO, "");
			const valorEl = card.querySelector(".pdp-seeu-pena-valor");
			if (valorEl.textContent !== info.valor) valorEl.textContent = info.valor;
			card.classList.toggle("pdp-seeu-pena-vazio", info.valor === VAZIO);
			const title = def.dica + ": " + (info.original || "(não informado)");
			if (card.title !== title) card.title = title;
		});
	}

	// ---------------------------------------------------------------------
	// Ciclo
	// ---------------------------------------------------------------------

	function lerSeDisponivelLocalmente() {
		const content = findTabContent(document);
		if (!tabContentReady(content)) return false;
		const dados = lerAba(content);
		const atual = estadoAba ? JSON.stringify(estadoAba.dados) : undefined;
		if (JSON.stringify(dados) !== atual) aplicarLeituraDaAba(dados);
		else sincronizarCards();
		return true;
	}

	let buscaEmAndamento = false;
	let buscaFeita = false;
	let tentativas = 0;
	function buscarEmSegundoPlano() {
		if (buscaEmAndamento || buscaFeita || tentativas >= 3) return;
		buscaEmAndamento = true;
		tentativas++;
		buscarAbaPOST()
			.then(function (doc) {
				if (!doc) return;
				const content = findTabContent(doc);
				if (!tabContentReady(content)) {
					console.log(TAG, "a resposta não trouxe o conteúdo da aba '" + ABA_LABEL + "'");
					return;
				}
				buscaFeita = true;
				// O usuário pode ter aberto a aba enquanto a busca corria: a
				// leitura local tem prioridade.
				if (!tabContentReady(findTabContent(document))) aplicarLeituraDaAba(lerAba(content));
			})
			.catch(function (err) {
				console.warn(TAG, "falha ao buscar a aba '" + ABA_LABEL + "' em segundo plano:", err && (err.message || err));
			})
			.finally(function () {
				buscaEmAndamento = false;
			});
	}

	function iniciar() {
		if (!document.getElementById("barraTituloStatusProcessual")) return false;
		sincronizarCards();
		// Uma leitura nova a cada carregamento da página (o cálculo pode ter
		// mudado); o estado salvo só serve para os cards aparecerem logo.
		if (!lerSeDisponivelLocalmente()) setTimeout(function () {
			if (!lerSeDisponivelLocalmente()) buscarEmSegundoPlano();
		}, 1500);
		return true;
	}

	let iniciado = iniciar();
	setInterval(function () {
		try {
			if (!iniciado) {
				iniciado = iniciar();
				return;
			}
			if (!lerSeDisponivelLocalmente()) {
				sincronizarCards();
				// Nova tentativa (até 3 no total) se a busca falhou e a aba
				// ainda não foi lida.
				if (!estadoAba) buscarEmSegundoPlano();
			}
		} catch (err) {
			console.error(TAG, "erro na reconciliação periódica:", err);
		}
	}, 1500);
})();
