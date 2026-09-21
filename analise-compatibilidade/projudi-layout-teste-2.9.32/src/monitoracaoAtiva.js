// Projudi - Indicador de monitoração eletrônica ativa ao lado do número
// único do processo
//
// A aba "Informações Adicionais" do processo tem, na mesma seção
// "Benefícios/Medidas/Suspensões" usada pelo indicador de suspensão ativa
// (veja suspensaoAtiva.js), um campo com a lista de medidas do tipo
// "Monitoração Eletrônica" do processo — cada item no formato "<algo> -
// <status>" ou "<algo> - <nome> - <status>", com status "ATIVA" quando em
// vigor. Cada item é também um link (`a.link`) para a tela de detalhe da
// medida (`medidaAlternativa.do`), que tem os campos "Status:" e "Data
// Início:" (confirmados a partir de um .mhtml real dessa tela — ver
// estrutura abaixo).
//
// Este recurso lê esse campo e, para CADA item reconhecido como
// "Monitoração Eletrônica" com status "ATIVA", insere um pequeno card logo
// depois do "(N dia(s) em tramitação)" no cabeçalho do processo (<h3
// id="barraTituloStatusProcessual">) — um card por item, lado a lado, com
// o NOME DA PARTE e a "Data Início" assim que a busca em segundo plano (na
// tela de detalhe) termina, ex.: "Monitorado eletronicamente: ANDREIA DA
// SILVA (desde 20/07/2024)". Um processo com mais de uma parte em
// monitoração eletrônica ativa (a tela "Medida Cautelar" tem um combo
// "Partes:" nesse caso) ganha um card por parte — ver
// `listarOpcoesPartes`/`avaliarPaginaDeMedida` mais abaixo.
//
// Mesma técnica de leitura/busca/persistência já usada em
// suspensaoAtiva.js: leitura direta da aba "Informações Adicionais" se ela
// já estiver na página, senão busca em segundo plano (POST para
// #processoForm com selectedIcon=tabDadosAdicionais); busca da "Data
// Início" de cada item num iframe oculto apontando para
// `medidaAlternativa.do`; e estado espelhado em sessionStorage (por
// número único do processo) para os cards sobreviverem à navegação entre
// abas do processo, que recarrega a página inteira.
//
// Estrutura real confirmada a partir de um .mhtml salvo do Projudi (TJPR),
// tela de detalhe (medidaAlternativa.do, aberta a partir de um link na aba
// "Informações Adicionais"):
// <form name="medidaAlternativaForm" id="medidaAlternativaForm" ...>
//   <h3>Monitoração eletrônica</h3>
//   <table class="form"><tbody>
//     <tr><td class="label">Status:</td><td>ATIVA</td></tr>
//     <tr><td class="label">Data Provável de Término:</td><td>...</td></tr>
//     <tr><td class="label">Data de Término Efetiva:</td><td> </td></tr>
//     <tr><td class="label"><label for="medida.cautelar.data.inicio">
//       Data Início:</label></td><td>20/07/2024</td></tr>
//     <tr><td class="label"><label for="valor">Prazo de
//       monitoramento:</label></td><td>450 dia(s)</td></tr>
//     ...
//   </tbody></table></form>
// — igual a transacaoPenal.do (suspensaoAtiva.js), "Status:" fica direto
// no texto do <td class="label">, sem <label> dentro; já "Data Início:"
// tem um <label> dentro do <td class="label">, então a leitura do campo
// usa o texto do <td> inteiro (funciona nos dois casos).
//
// A estrutura real do campo na aba "Informações Adicionais" (confirmada a
// partir do diagnóstico desta extensão num processo real) NÃO é uma lista
// de monitorações — é um campo genérico de "Medidas Cautelares":
// <tr><td class="label">Medidas Cautelares (Ex. Monitoração
// Eletrônica):</td><td><a class="link" href=".../listaMedidaCautelar.do?
// ...">Processo com Medida Cautelar</a></td></tr>
// (ou "Processo sem Medida Cautelar (clique para cadastrar)", sem link,
// quando não há nenhuma). Esse único link cobre QUALQUER tipo de medida
// cautelar do processo (monitoração eletrônica é só um exemplo, dado entre
// parênteses no próprio rótulo do campo) — não dá para saber, só pelo
// campo, se é uma monitoração eletrônica ou outra medida (ex.: prisão
// domiciliar, entrega de passaporte). Por isso, quando esse campo indica a
// presença de alguma medida, a extensão busca a página desse link em
// segundo plano (mesma técnica de iframe oculto já usada para a Data
// Início) e só cria o card se a página buscada confirmar "Monitoração
// Eletrônica" com status "ATIVA" — a mesma estrutura da tela de detalhe
// documentada acima (`medidaAlternativa.do`, com <h3>Monitoração
// eletrônica</h3> e o campo "Status:").
//
// `CAMPO_LABELS`/`MOTIVOS_REGEX` abaixo continuam existindo como
// mecanismo alternativo (para Tribunais/versões do Projudi em que o campo
// já liste as monitorações diretamente, como no indicador de suspensão
// ativa) — cada rótulo/item avaliado é registrado no console (F12,
// mensagens com o prefixo "[Projudi Monitoração Ativa]") para ajudar a
// ajustar esses padrões, ou os rótulos candidatos de "Medidas Cautelares"
// (`MEDIDA_CAUTELAR_LABELS`), caso o card ainda não apareça.
(function () {
	"use strict";

	// Evita rodar dentro de iframes ocultos usados por esta ou outras
	// funcionalidades desta extensão para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
	if (!location.pathname.startsWith("/projudi/") || !document.getElementById("processoForm")) return;

	if (window.__pdpMonitoracaoAtiva) return;
	window.__pdpMonitoracaoAtiva = true;

	const TAG = "[Projudi Monitoração Ativa]";
	const CARD_ATTR = "data-pdp-monitoracao-card";
	const LOADER_ATTR = "data-pdp-loader";
	const ABA_LABEL = "Informações Adicionais";
	const ABA_SELECTED_ICON = "tabDadosAdicionais";
	const CAMPO_LABELS = [
		"monitoracoes eletronicas",
		"monitoracao eletronica",
		"monitoracoes",
		"monitoracao",
		"medidas alternativas",
		"medida alternativa",
	]; // já normalizados (sem acento/caixa)
	// Rótulo real confirmado: "Medidas Cautelares (Ex. Monitoração
	// Eletrônica):" — comparado com o texto do rótulo já sem o trecho entre
	// parênteses (ver `stripParens`), por isso aqui só "medidas cautelares"/
	// "medida cautelar".
	const MEDIDA_CAUTELAR_LABELS = ["medidas cautelares", "medida cautelar"];
	const STATUS_ATIVA = ["ativa", "ativo"];
	const MOTIVOS_REGEX = [
		{ nome: "Monitoração Eletrônica", re: /monitora(c|ç)(a|ã)o\s+eletr(o|ô)nica/ },
		{ nome: "Monitoramento Eletrônico", re: /monitoramento\s+eletr(o|ô)nic[oa]/ },
		{ nome: "Tornozeleira Eletrônica", re: /tornozeleira\s+eletr(o|ô)nica/ },
	];

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	// Remove trechos entre parênteses antes de comparar rótulos de campo —
	// ex.: "Medidas Cautelares (Ex. Monitoração Eletrônica):" não deve ser
	// tratado como se o campo JÁ fosse sobre monitoração eletrônica (é só um
	// exemplo do tipo de medida cautelar que pode estar ali, entre outras).
	function stripParens(text) {
		return String(text || "").replace(/\([^)]*\)/g, " ");
	}

	function collapseWhitespace(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	// O texto de cada item vem como "<algo> - <status>" ou "<algo> - <nome>
	// - <status>" (com espaços/quebras de linha irregulares entre os
	// trechos). O status é o último segmento depois do último " - ".
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

	// Ao contrário do campo "Suspensões:" (que tem um <label> dentro do
	// <td class="label">), nem todo campo do Projudi segue esse padrão —
	// por isso este busca tanto em <label> aninhado quanto no texto do
	// próprio <td class="label">/<td class="labelRadio"> (sem <label>
	// dentro), como a tela de detalhe da medida (`findDetailField` abaixo)
	// já precisa fazer com o campo "Status:".
	function findLabelCell(tabContent, wantedLabels) {
		const labels = tabContent.querySelectorAll("td.label label, td.labelRadio label");
		for (const label of labels) {
			const text = normalize(label.textContent).replace(/:\s*$/, "");
			if (wantedLabels.indexOf(text) !== -1) return label;
		}
		const cells = tabContent.querySelectorAll("td.label, td.labelRadio");
		for (const cell of cells) {
			if (cell.querySelector("label")) continue; // já coberto acima
			const text = normalize(cell.textContent).replace(/:\s*$/, "");
			if (wantedLabels.indexOf(text) !== -1) return cell;
		}
		return null;
	}

	// Extrai os itens candidatos (um por <li>, ou por <td> de valor se não
	// houver lista) da linha (<tr>) de um campo já localizado.
	function itensDaLinha(row) {
		if (!row) return [];
		const items = Array.prototype.slice.call(row.querySelectorAll("li"));
		return items.length ? items : Array.prototype.slice.call(row.querySelectorAll("td")).slice(1);
	}

	// Avalia um elemento candidato (item de lista, célula de valor, etc.):
	// retorna { texto, href } se reconhecido como "Monitoração Eletrônica"
	// ativa, ou null caso contrário (registrando o motivo do descarte).
	// `motivoImplicito` = true quando o próprio rótulo do campo (ex.:
	// "Monitorações Eletrônicas:") já garante o motivo, dispensando o
	// texto do item repetir "Monitoração Eletrônica" (pode trazer só
	// "<nome> - ATIVA", por exemplo).
	function avaliarCandidato(item, motivoImplicito) {
		const text = collapseWhitespace(item.textContent);
		if (!text) return null;
		const status = extractStatus(text);
		if (status && STATUS_ATIVA.indexOf(status) === -1) {
			console.log(TAG, "item ignorado (status não é ativa):", { texto: text, status: status });
			return null;
		}
		const motivo = matchMotivo(text) || (motivoImplicito ? "Monitoração Eletrônica" : null);
		if (!motivo) {
			console.log(TAG, "item ignorado (não reconhecido como Monitoração Eletrônica):", text);
			return null;
		}
		console.log(TAG, "item de monitoração eletrônica ativa reconhecido:", { texto: text, motivo: motivo });
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

	// Procura, dentro do campo de medidas de monitoração, TODOS os itens de
	// lista reconhecidos como "Monitoração Eletrônica" com status "ATIVA" —
	// um processo com mais de um réu pode ter mais de um item ativo ao
	// mesmo tempo. Retorna um array de { texto, href } (href = link para a
	// tela de detalhe daquela medida, ou null se o item não tiver link);
	// array vazio se nenhum item ativo reconhecido for encontrado.
	//
	// O rótulo exato desse campo na aba "Informações Adicionais" não foi
	// confirmado a partir de uma página real, então a busca é em duas
	// etapas: primeiro tenta achar o campo por um dos rótulos candidatos
	// (`CAMPO_LABELS`, rápido e preciso quando acerta); se isso falhar,
	// cai para uma busca ampla por QUALQUER item (<li> em qualquer lista,
	// ou link "a.link"/"a[href]" solto) na aba inteira cujo texto já bata
	// com `MOTIVOS_REGEX` — não depende de acertar o rótulo do campo, só
	// do texto do próprio item (que é o dado mais estável).
	function findMonitoracoesAtivas(tabContent) {
		const label = findLabelCell(tabContent, CAMPO_LABELS);
		const encontrados = [];
		const vistos = new Set();

		if (label) {
			// Ignora exemplos entre parênteses no próprio rótulo (ex.: "Medidas
			// Cautelares (Ex. Monitoração Eletrônica):" NÃO deve contar como
			// "eletrônica" aqui — é só um exemplo do tipo de medida, tratado à
			// parte por `findMedidaCautelarLink`/`avaliarPaginaDeMedida`).
			const motivoImplicito = /eletr(o|ô)nica/.test(normalize(stripParens(label.textContent)));
			const candidates = itensDaLinha(label.closest("tr"));
			console.log(TAG, "campo de monitoração eletrônica encontrado pelo rótulo, avaliando itens:", candidates.map((c) => collapseWhitespace(c.textContent)));
			candidates.forEach(function (item) {
				const achado = avaliarCandidato(item, motivoImplicito);
				if (achado) {
					encontrados.push(achado);
					vistos.add(item);
				}
			});
		} else {
			console.log(TAG, "campo de monitoração eletrônica não encontrado por rótulo na aba '" + ABA_LABEL + "' — tentando busca ampla por texto");
		}

		// Busca ampla (sempre feita, mesmo com rótulo encontrado, para não
		// perder réus/itens que estejam fora da linha do campo por algum
		// motivo de layout) — evita duplicar itens já capturados acima.
		const candidatosAmplos = Array.prototype.slice
			.call(tabContent.querySelectorAll("li"))
			.concat(Array.prototype.slice.call(tabContent.querySelectorAll("a.link, a[href]")).filter((a) => !a.closest("li")));
		candidatosAmplos.forEach(function (item) {
			if (vistos.has(item)) return;
			if (!matchMotivo(item.textContent)) return;
			const achado = avaliarCandidato(item);
			if (achado) {
				encontrados.push(achado);
				vistos.add(item);
			}
		});

		// Nada encontrado (nem por rótulo, nem pela busca ampla): despeja um
		// diagnóstico completo — com JSON.stringify, para sobreviver a um
		// copiar/colar do console (um objeto "vivo" vira só "[object
		// Object]"/"Object" ao ser colado como texto) — com TODOS os rótulos
		// de campo e itens de lista da aba, para ajustar CAMPO_LABELS/
		// MOTIVOS_REGEX a partir de uma página real.
		if (!encontrados.length) {
			const rotulos = Array.prototype.slice
				.call(tabContent.querySelectorAll("td.label, td.labelRadio"))
				.map((l) => collapseWhitespace(l.textContent))
				.filter(Boolean);
			const itensLista = Array.prototype.slice.call(tabContent.querySelectorAll("li")).map((li) => collapseWhitespace(li.textContent)).filter(Boolean);
			const linksSoltos = Array.prototype.slice
				.call(tabContent.querySelectorAll("a.link, a[href]"))
				.filter((a) => !a.closest("li"))
				.map((a) => collapseWhitespace(a.textContent))
				.filter(Boolean);
			console.log(
				TAG,
				"DIAGNÓSTICO — nenhum item de monitoração eletrônica reconhecido nesta leitura da aba '" + ABA_LABEL + "'. " +
					"Copie a linha abaixo (JSON) e envie para ajustar a extensão:\n" +
					JSON.stringify({ rotulos: rotulos, itensLista: itensLista, linksSoltos: linksSoltos }, null, 2)
			);
		}

		return encontrados;
	}

	// ---------------------------------------------------------------------
	// Busca em segundo plano (iframe oculto): tanto da própria aba
	// "Informações Adicionais" (quando a página atual não é essa aba) quanto
	// da "Data Início" de cada medida, na tela de detalhe
	// (medidaAlternativa.do). Mesma técnica já usada em suspensaoAtiva.js.
	// ---------------------------------------------------------------------

	function fetchDoc(url) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute(LOADER_ATTR, "pdp-monit-" + Date.now() + "-" + Math.random().toString(36).slice(2));
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
	// segundo plano — POST para a própria action do formulário
	// `#processoForm`, com um campo oculto `selectedIcon` no corpo (mesma
	// técnica de oraculoDirect.js/suspensaoAtiva.js).
	let avisouSemProcessoForm = false;
	async function fetchAbaInformacoesAdicionaisPOST() {
		const form = document.getElementById("processoForm");
		if (!form) {
			// Página sem #processoForm (ex.: telas de busca/listagem, não a do
			// processo em si) — não vale a pena avisar a cada 1.5s.
			if (!avisouSemProcessoForm) {
				avisouSemProcessoForm = true;
				console.warn(TAG, "#processoForm não encontrado nesta página — não é possível buscar a aba em segundo plano aqui (próximas ocorrências nesta página não serão avisadas de novo)");
			}
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

	// Em telas de detalhe (medidaAlternativa.do, transacaoPenal.do/"Medida
	// Cautelar"), tanto "Status:" quanto "Data (de) Início:" ficam num
	// <td class="label"> seguido do valor no <td> seguinte — só que "Data
	// (de) Início:" às vezes tem um <label> dentro do <td class="label">
	// (diferente de "Status:", que não tem); por isso a leitura usa o texto
	// do <td> inteiro (funciona nos dois casos), não só de um eventual
	// <label> dentro dele. O rótulo varia por tela: "Data Início:" em
	// `medidaAlternativa.do`, "Data de Início:" (com "de") na tela "Medida
	// Cautelar" — por isso `wantedNormalizedLabels` aceita mais de uma
	// variante.
	function findDetailField(doc, wantedNormalizedLabels) {
		const wanted = Array.isArray(wantedNormalizedLabels) ? wantedNormalizedLabels : [wantedNormalizedLabels];
		const labelCells = doc.querySelectorAll("td.label");
		for (const td of labelCells) {
			const text = normalize(td.textContent).replace(/:\s*$/, "");
			if (wanted.indexOf(text) === -1) continue;
			const valueCell = td.nextElementSibling;
			const value = valueCell ? collapseWhitespace(valueCell.textContent) : "";
			return value || null;
		}
		return null;
	}

	function findDataInicio(doc) {
		return findDetailField(doc, ["data inicio", "data de inicio"]);
	}

	// href -> "pending" | string (data) | null (buscado, não encontrado)
	const dataInicioPorHref = new Map();

	function buscarDataInicio(href) {
		if (!href || dataInicioPorHref.has(href)) return;
		dataInicioPorHref.set(href, "pending");
		console.log(TAG, "buscando Data Início em segundo plano:", href);
		fetchDoc(href)
			.then(function (doc) {
				const data = findDataInicio(doc);
				dataInicioPorHref.set(href, data);
				console.log(TAG, data ? "Data Início encontrada: " + data : "campo 'Data Início' não encontrado na tela de detalhe", { href: href });
				atualizarDataInicio(href, data);
			})
			.catch(function (err) {
				dataInicioPorHref.set(href, null);
				console.warn(TAG, "falha ao buscar Data Início:", { href: href, erro: err && (err.stack || err.message || err) });
			});
	}

	// ---------------------------------------------------------------------
	// Campo genérico "Medidas Cautelares (Ex. Monitoração Eletrônica):" —
	// ver comentário no topo do arquivo. Um único link cobre qualquer tipo
	// de medida cautelar do processo; só dá pra saber se é uma monitoração
	// eletrônica ativa buscando a página desse link em segundo plano.
	// ---------------------------------------------------------------------

	// Acha o link do campo "Medidas Cautelares" na aba "Informações
	// Adicionais", se houver alguma medida cadastrada (quando não há, o
	// texto é "Processo sem Medida Cautelar (clique para cadastrar)", sem
	// indicar nenhuma medida existente — ignorado aqui).
	function findMedidaCautelarLink(tabContent) {
		const cells = tabContent.querySelectorAll("td.label, td.labelRadio");
		for (const cell of cells) {
			const text = normalize(stripParens(cell.textContent)).replace(/:\s*$/, "").trim();
			if (MEDIDA_CAUTELAR_LABELS.indexOf(text) === -1) continue;
			const row = cell.closest("tr");
			const link = row ? row.querySelector("a.link, a[href]") : null;
			if (!link) return null;
			const linkText = normalize(link.textContent);
			if (/^sem\b/.test(linkText) || /nenhum/.test(linkText)) return null;
			let href = null;
			try {
				href = new URL(link.getAttribute("href"), window.location.href).href;
			} catch (err) {
				href = link.getAttribute("href");
			}
			console.log(TAG, "campo 'Medidas Cautelares' indica processo com medida(s) cadastrada(s):", { texto: collapseWhitespace(link.textContent), href: href });
			return href;
		}
		return null;
	}

	// Lista as partes disponíveis no seletor "Partes:" da tela "Medida
	// Cautelar" (<select id="codParteProcessoFiltro">) — um processo com
	// mais de um réu/parte pode ter esse seletor com mais de uma opção
	// (além do placeholder "-- CLIQUE AQUI PARA SELECIONAR --", com
	// value="", descartado aqui). Cada opção é uma parte distinta, cuja
	// própria medida cautelar (e status/tabela de tipos) só aparece na
	// página filtrada para ELA — por isso, com mais de uma parte, é preciso
	// buscar a página de novo, uma vez por parte (ver `avaliarPaginaDeMedida`
	// abaixo).
	function listarOpcoesPartes(doc) {
		const select = doc.getElementById("codParteProcessoFiltro");
		if (!select) return [];
		return Array.prototype.slice
			.call(select.querySelectorAll("option"))
			.map(function (opt) {
				return { valor: opt.value, nome: collapseWhitespace(opt.textContent), selecionada: !!opt.selected };
			})
			.filter(function (opt) {
				return opt.valor;
			});
	}

	// Busca a página "Medida Cautelar" filtrada para UMA parte específica —
	// mesma técnica de POST em segundo plano já usada em
	// `fetchAbaInformacoesAdicionaisPOST`, replicando o que o próprio
	// Projudi faz ao trocar a seleção no combo "Partes:" (função
	// `filtrarParteProcesso` da própria tela: reenvia o formulário
	// `transacaoPenalForm` para `actionType=visualizar&codParteProcessoFiltro=
	// <valor>`). `doc` é a página já buscada (para outra parte, ou a
	// primeira lida), de onde vem o formulário/action a reenviar.
	async function fetchMedidaCautelarPorParte(doc, baseUrl, valorParte) {
		const form = doc.getElementById("transacaoPenalForm");
		if (!form) {
			console.warn(TAG, "#transacaoPenalForm não encontrado na página de 'Medida Cautelar' — não é possível filtrar por parte");
			return null;
		}
		let actionUrl;
		try {
			actionUrl = new URL(form.getAttribute("action") || form.action, baseUrl);
		} catch (err) {
			console.warn(TAG, "action do #transacaoPenalForm inválida:", err);
			return null;
		}
		actionUrl.searchParams.set("actionType", "visualizar");
		actionUrl.searchParams.set("codParteProcessoFiltro", valorParte);

		const body = new URLSearchParams();
		for (const [name, value] of new FormData(form)) {
			if (typeof value === "string") body.append(name, value);
		}
		body.set("codParteProcessoFiltro", valorParte);

		console.log(TAG, "buscando 'Medida Cautelar' filtrada por parte em segundo plano (POST):", { url: actionUrl.href, parte: valorParte });

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

	// Extrai os achados de UMA página "Medida Cautelar" já carregada
	// (de uma única parte, já filtrada) — estrutura real confirmada a
	// partir de um .mhtml dessa tela (TJPR): <h3>Medida Cautelar -
	// <processo></h3>, com "Status:", "Parte:" e "Data de Início:" no
	// nível da página inteira (aplicam-se à parte selecionada como um
	// todo, não a um tipo específico), e um campo "Medida Cautelar:"
	// (<td class="labelRadio">) com uma tabela (<table class="resultTable">,
	// colunas "Tipo de Medida"/"Data de Término Efetiva") listando um tipo
	// por linha — ex.: "Monitoração eletrônica" — cada um um link
	// (`a.link`) para `medidaAlternativa.do`. Uma linha com a coluna "Data
	// de Término Efetiva" preenchida indica que aquele tipo específico já
	// encerrou (mesmo com "Status:" geral ainda ATIVA por causa de outro
	// tipo). `nomeParteConhecido` (opcional) evita reler o campo "Parte:" —
	// útil quando o nome já veio do próprio combo "Partes:".
	function extrairAchadosDeDoc(doc, url, nomeParteConhecido) {
		const status = normalize(findDetailField(doc, "status") || "");
		if (STATUS_ATIVA.indexOf(status) === -1) {
			console.log(TAG, "página de detalhe de 'Medida Cautelar' não está com status ativo:", { status: status, url: url, parte: nomeParteConhecido });
			return [];
		}
		const dataInicioGeral = findDataInicio(doc);
		const nomeParte = nomeParteConhecido || findDetailField(doc, "parte");

		const achados = [];
		const labelCells = doc.querySelectorAll("td.label, td.labelRadio");
		for (const cell of labelCells) {
			const text = normalize(cell.textContent).replace(/:\s*$/, "").trim();
			if (text !== "medida cautelar") continue;
			const row = cell.closest("tr");
			const tabela = row ? row.querySelector("table") : null;
			if (!tabela) break;
			Array.prototype.slice.call(tabela.querySelectorAll("tbody tr")).forEach(function (tr) {
				const colunas = tr.querySelectorAll("td");
				if (!colunas.length) return;
				const tipoTexto = collapseWhitespace(colunas[0].textContent);
				if (!matchMotivo(tipoTexto)) return;
				const terminoTexto = colunas[1] ? collapseWhitespace(colunas[1].textContent) : "";
				if (terminoTexto) {
					console.log(TAG, "tipo de medida 'Monitoração Eletrônica' encontrado, mas já com Data de Término Efetiva preenchida — não é mais ativo:", { terminoTexto: terminoTexto, url: url, parte: nomeParte });
					return;
				}
				const link = colunas[0].querySelector("a.link, a[href]");
				let subHref = url;
				if (link && link.getAttribute("href")) {
					try {
						subHref = new URL(link.getAttribute("href"), url).href;
					} catch (err) {
						subHref = url;
					}
				}
				// O nome da parte é o texto principal do card (ver
				// `criarCardElemento`/`textoItem` mais abaixo) — cai para o
				// próprio nome do tipo de medida só se a parte não puder ser
				// identificada (não deveria acontecer nas telas reais já
				// confirmadas, mas evita um card sem texto nenhum).
				achados.push({ texto: nomeParte || tipoTexto, href: subHref, dataInicio: dataInicioGeral });
			});
			break;
		}

		if (achados.length) {
			console.log(TAG, "medida cautelar 'Monitoração Eletrônica' confirmada como ativa na página de detalhe:", { dataInicio: dataInicioGeral, parte: nomeParte, url: url });
			return achados;
		}

		{
			// Diagnóstico completo (JSON.stringify, sobrevive a copiar/colar —
			// ver mesma justificativa no diagnóstico da aba "Informações
			// Adicionais" acima): título(s) da página, todos os campos
			// rótulo/valor e itens de lista, para descobrir se esta página é de
			// outro tipo de medida cautelar (não monitoração eletrônica — caso
			// em que não mostrar o card está correto) ou se a extensão só não
			// está reconhecendo a estrutura real dela.
			const titulos = Array.prototype.slice.call(doc.querySelectorAll("h1, h2, h3, h4")).map((h) => collapseWhitespace(h.textContent)).filter(Boolean);
			const campos = Array.prototype.slice
				.call(doc.querySelectorAll("td.label, td.labelRadio"))
				.map((td) => collapseWhitespace(td.textContent) + " => " + collapseWhitespace((td.nextElementSibling && td.nextElementSibling.textContent) || ""));
			const itens = Array.prototype.slice.call(doc.querySelectorAll("li")).map((li) => collapseWhitespace(li.textContent)).filter(Boolean);
			console.log(
				TAG,
				"DIAGNÓSTICO — página de 'Medidas Cautelares' (" + url + ", parte: " + (nomeParte || "?") + ") não trouxe nenhuma Monitoração Eletrônica ativa reconhecida. " +
					"Copie a linha abaixo (JSON) e envie para ajustar a extensão:\n" +
					JSON.stringify({ titulos: titulos, campos: campos, itens: itens }, null, 2)
			);
		}
		return achados;
	}

	// Avalia a página de detalhe buscada a partir do link de "Medidas
	// Cautelares". Com uma parte só (o caso mais comum), a página já
	// carregada já reflete essa parte — extrai direto. Com mais de uma
	// parte (`listarOpcoesPartes`), a tabela "Medida Cautelar:" e os campos
	// "Status:"/"Data de Início:" só valem para a parte selecionada no
	// combo — por isso busca a página de novo, uma vez por parte (em
	// paralelo), para que CADA parte com Monitoração Eletrônica ativa
	// ganhe seu próprio achado (e, no fim, seu próprio card).
	async function avaliarPaginaDeMedida(doc, url) {
		const opcoesPartes = listarOpcoesPartes(doc);
		if (opcoesPartes.length <= 1) {
			return extrairAchadosDeDoc(doc, url);
		}

		console.log(TAG, "processo com mais de uma parte com medida cautelar — avaliando cada uma em segundo plano:", opcoesPartes.map((o) => o.nome));

		const porParte = await Promise.all(
			opcoesPartes.map(async function (opcao) {
				try {
					const docParte = opcao.selecionada ? doc : await fetchMedidaCautelarPorParte(doc, url, opcao.valor);
					if (!docParte) return [];
					return extrairAchadosDeDoc(docParte, url, opcao.nome);
				} catch (err) {
					console.warn(TAG, "falha ao buscar medida cautelar da parte '" + opcao.nome + "':", err && (err.stack || err.message || err));
					return [];
				}
			})
		);

		return porParte.reduce(function (acc, arr) {
			return acc.concat(arr);
		}, []);
	}

	// href do link de "Medidas Cautelares" -> array de achados (cache, para
	// não buscar a mesma página de novo a cada reconciliação de 1.5s).
	const medidaCautelarPorHref = new Map();

	// Combina a detecção direta na aba "Informações Adicionais"
	// (`findMonitoracoesAtivas`, mecanismo alternativo) com a busca em
	// segundo plano da página de "Medidas Cautelares" (o mecanismo
	// confirmado). Assíncrono porque a segunda parte depende de uma busca de
	// rede; resolve com o array combinado de itens encontrados.
	async function coletarMonitoracoesAtivas(tabContent) {
		const diretos = findMonitoracoesAtivas(tabContent);
		const href = findMedidaCautelarLink(tabContent);
		if (!href) return diretos;

		if (medidaCautelarPorHref.has(href)) {
			const cache = medidaCautelarPorHref.get(href);
			return diretos.concat(cache === "pending" ? [] : cache);
		}

		medidaCautelarPorHref.set(href, "pending");
		try {
			console.log(TAG, "buscando página de 'Medidas Cautelares' em segundo plano:", href);
			const doc = await fetchDoc(href);
			const daPagina = await avaliarPaginaDeMedida(doc, href);
			medidaCautelarPorHref.set(href, daPagina);
			return diretos.concat(daPagina);
		} catch (err) {
			medidaCautelarPorHref.delete(href);
			console.warn(TAG, "falha ao buscar a página de 'Medidas Cautelares':", { href: href, erro: err && (err.stack || err.message || err) });
			return diretos;
		}
	}

	// ---------------------------------------------------------------------
	// Cards no cabeçalho (um por medida de monitoração ativa reconhecida)
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
		card.style.border = "1px solid #1a73e8";
		card.style.background = "#e8f0fe";
		card.style.color = "#174ea6";
		card.style.fontSize = "11px";
		card.style.fontWeight = "bold";
		card.style.verticalAlign = "middle";
		card.style.cursor = "help";

		const textEl = document.createElement("span");
		textEl.className = "pdp-monitoracao-card-texto";
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
			card.title = "Monitoração eletrônica ativa: " + item.texto;
			card.querySelector(".pdp-monitoracao-card-texto").textContent = "Monitorado eletronicamente: " + item.texto;
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
	// Persistência entre abas do processo (ver justificativa detalhada em
	// suspensaoAtiva.js, "Persistência entre abas do processo").
	// ---------------------------------------------------------------------

	const STORAGE_PREFIX = "pdpMonitoracaoAtiva:";

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
	// restaurado; `null`/array vazio = avaliado, sem monitoração ativa
	// reconhecida. Quando há monitorações: array de { texto, href,
	// dataInicio } — um item por réu/medida ativa.
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
	// sessionStorage, dispara a busca da Data Início de cada item novo e
	// sincroniza os cards.
	function aplicarMonitoracoes(encontrados) {
		const anterior = estadoAtual ? estadoAtual.map((e) => e.texto).sort().join(" | ") : "";
		const novo = encontrados.map((e) => e.texto).sort().join(" | ");
		if (novo !== anterior) {
			console.log(TAG, "estado de monitoração eletrônica atualizado:", { anterior: anterior || "(nenhuma)", novo: novo || "(nenhuma)" });
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
		coletarMonitoracoesAtivas(tabContent).then(aplicarMonitoracoes);
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
				coletarMonitoracoesAtivas(tabContent).then(aplicarMonitoracoes);
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
			coletarMonitoracoesAtivas(tabContent).then(aplicarMonitoracoes);
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
