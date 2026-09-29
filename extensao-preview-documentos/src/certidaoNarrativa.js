// Projudi/SEEU - Certidão narrativa do processo (botão "📜 Certidão").
//
// Na tela do processo, coleta:
//   - o cabeçalho (número, classe, juízo, assuntos, valor da causa, partes);
//   - todos os movimentos da tabela de Movimentações (data/hora, evento,
//     sequencial), inclusive das demais páginas, se a tabela for paginada;
//   - os links dos arquivos das peças principais (petição inicial/denúncia,
//     contestação/resposta à acusação, sentença, recurso).
// Tudo vai para chrome.storage.local e o service worker abre a página da
// certidão (src/certidao.html) numa janela própria, onde os arquivos são
// lidos, os resumos são gerados e a certidão pode ser editada e impressa.
//
// Depende de certidaoTexto.js (classificação dos movimentos) e, só no
// Projudi, de habilitarAdvogado.js (window.__pdpLerAbaProcesso) para ler as
// abas "Informações Gerais" e "Partes e Outros" sem trocar de aba.

(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpButtonGroupBlocked) return;
	try {
		if (window.frameElement && (window.frameElement.hasAttribute("data-pdp-loader") || window.frameElement.classList.contains("pdp-qa-modal-iframe"))) return;
	} catch (e) {
		/* frame de outra origem: segue */
	}
	if (window.__pdpCertidao) return;
	window.__pdpCertidao = true;

	const T = window.PdpCertidaoTexto;
	if (!T) return;

	const TAG = "[Projudi Certidão]";
	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(location.hostname);
	const IS_PROJUDI = location.pathname.startsWith("/projudi/");
	const DATA_HORA = /\b(\d{2}\/\d{2}\/\d{4})(?:\s*(?:às|as|-)?\s*(\d{2}:\d{2}(?::\d{2})?))?/;

	const normalizar = T.normalizar;
	const colapsar = T.colapsar;

	// -------------------------------------------------------------------
	// Leitura de páginas (fetch + charset), igual às demais funcionalidades
	// -------------------------------------------------------------------

	async function lerPagina(url, opcoes) {
		const controller = new AbortController();
		const timer = setTimeout(function () { controller.abort(); }, 25000);
		try {
			const response = await fetch(url, Object.assign({}, opcoes, { credentials: "same-origin", signal: controller.signal }));
			if (!response.ok) throw new Error("O sistema respondeu " + response.status + ".");
			if (new URL(response.url).origin !== location.origin) throw new Error("Resposta de origem inesperada.");
			const bytes = await response.arrayBuffer();
			const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
			const charsetMatch =
				/charset\s*=\s*["']?([\w-]+)/i.exec(response.headers.get("content-type") || "") || /charset\s*=\s*["']?([\w-]+)/i.exec(preview);
			const charset = (charsetMatch && charsetMatch[1]) || "windows-1252";
			return new DOMParser().parseFromString(new TextDecoder(charset).decode(bytes), "text/html");
		} finally {
			clearTimeout(timer);
		}
	}

	// Texto visível de um elemento, sem os elementos que esta extensão
	// injeta (checkboxes, botões, selos) e com <br> virando separador.
	function textoLimpo(el) {
		if (!el) return "";
		const clone = el.cloneNode(true);
		clone.querySelectorAll('script, style, input, button, select, img, [class^="pdp-"], [class*=" pdp-"], [id^="pdp-"]').forEach(function (n) { n.remove(); });
		clone.querySelectorAll("br").forEach(function (br) { br.replaceWith(" - "); });
		return colapsar(clone.textContent).replace(/(\s-\s)+/g, " - ").replace(/^\s*-\s*|\s*-\s*$/g, "");
	}

	// -------------------------------------------------------------------
	// Cabeçalho
	// -------------------------------------------------------------------

	// Número único no padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).
	const RE_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;

	function numeroDoProcesso() {
		// Projudi: "Processo 0000068-38.2025.8.16.0038" no título da tela
		// (h3#barraTituloStatusProcessual), em qualquer aba do processo.
		const barra = document.getElementById("barraTituloStatusProcessual");
		const mb = barra && RE_CNJ.exec(barra.textContent || "");
		if (mb) return mb[0];
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return projudiEl.textContent.trim();
		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl) {
			const m = seeuEl.textContent.match(/([\d.\-]{15,})/);
			if (m) return m[1];
		}
		const m = document.title.match(/([\d.\-]{15,})/);
		if (m) return m[1];
		const mc = RE_CNJ.exec((document.body && document.body.textContent) || "");
		return mc ? mc[0] : "";
	}

	// Pares "rótulo: valor" de um documento: células td.label/td.labelRadio
	// (Projudi), td[data-label] (SEEU) e, em geral, qualquer célula curta
	// terminada em ":" seguida de outra célula. Devolve Map(rótulo
	// normalizado -> [valores]).
	function lerCampos(doc) {
		const campos = new Map();
		function add(rotulo, valor) {
			const r = normalizar(rotulo).replace(/:$/, "").trim();
			const v = colapsar(valor);
			if (!r || !v || r.length > 60) return;
			if (!campos.has(r)) campos.set(r, []);
			if (campos.get(r).indexOf(v) === -1) campos.get(r).push(v);
		}
		doc.querySelectorAll("td, th").forEach(function (cell) {
			const proxima = cell.nextElementSibling;
			if (!proxima) return;
			const dataLabel = cell.getAttribute("data-label");
			const ehRotulo = cell.matches("td.label, td.labelRadio") || /:\s*$/.test(cell.textContent || "") || !!dataLabel;
			if (!ehRotulo) return;
			const rotulo = colapsar(cell.textContent) || colapsar(dataLabel);
			if (!rotulo || rotulo.length > 60) return;
			add(rotulo, textoLimpo(proxima));
		});
		return campos;
	}

	function primeiroCampo(campos, re) {
		for (const [rotulo, valores] of campos) {
			if (re.test(rotulo)) return valores[0];
		}
		return "";
	}

	function todosCampos(campos, re) {
		const lista = [];
		for (const [rotulo, valores] of campos) {
			if (!re.test(rotulo)) continue;
			valores.forEach(function (v) { if (lista.indexOf(v) === -1) lista.push(v); });
		}
		return lista;
	}

	// Linhas de um campo em árvore do cabeçalho (Apensamentos, Vínculos):
	//   Processo: 0000002-92... - Ação Penal - ATIVO        <- o próprio processo (raiz)
	//     └ Processo: 0000003-77... - Medidas Protetivas... - ARQUIVADO
	// Devolve só os itens relacionados (sem a raiz, que é o próprio
	// processo), ou null se o campo não existe na tela.
	function linhasDoCampo(docs, re, numeroAtual) {
		for (const doc of docs) {
			const escopo = doc.getElementById("informacoesProcessuais") || doc;
			const rotulos = escopo.querySelectorAll("td.label, td.labelRadio, th");
			for (const cell of rotulos) {
				if (!re.test(normalizar(cell.textContent).replace(/:$/, "").trim())) continue;
				const valor = cell.nextElementSibling;
				if (!valor) continue;
				const clone = valor.cloneNode(true);
				clone.querySelectorAll('script, style, input, button, select, img, [class^="pdp-"], [class*=" pdp-"], [id^="pdp-"]').forEach(function (n) { n.remove(); });
				clone.querySelectorAll("br").forEach(function (br) { br.replaceWith("\n"); });
				clone.querySelectorAll("div, li, tr, p, table, ul, dd, dt").forEach(function (n) { n.before("\n"); n.append("\n"); });
				const digitos = String(numeroAtual || "").replace(/\D/g, "");
				return clone.textContent
					.split("\n")
					.map(colapsar)
					.filter(function (linha) {
						if (!linha) return false;
						// A raiz da árvore é o próprio processo.
						if (digitos && linha.replace(/\D/g, "").indexOf(digitos) !== -1 && /^processo/i.test(linha)) return false;
						return true;
					});
			}
		}
		return null;
	}

	async function lerCabecalho(avisos) {
		const docs = [document];
		if (IS_PROJUDI && typeof window.__pdpLerAbaProcesso === "function") {
			try {
				const aba = await window.__pdpLerAbaProcesso("tabDadosProcesso", "Informações Gerais");
				if (aba.doc !== document) docs.push(aba.doc);
			} catch (e) {
				avisos.push('Não foi possível ler a aba "Informações Gerais": ' + e.message);
			}
		}
		// A tabela de informações do processo (#informacoesProcessuais) tem
		// prioridade: fora dela há outros rótulos parecidos (ex.: "Assunto:"
		// das anotações do processo, que levava a "... e juntar oráculo").
		const campos = new Map();
		function juntar(mapa) {
			mapa.forEach(function (valores, rotulo) {
				if (!campos.has(rotulo)) campos.set(rotulo, valores);
			});
		}
		docs.forEach(function (doc) {
			const info = doc.getElementById("informacoesProcessuais");
			if (info) juntar(lerCampos(info));
		});
		docs.forEach(function (doc) { juntar(lerCampos(doc)); });
		const numero = numeroDoProcesso();
		// Assunto: só o "Assunto Principal", como aparece ("12194 - Contra a Mulher").
		const assuntoPrincipal = primeiroCampo(campos, /^assunto principal$/) || primeiroCampo(campos, /^assunto$/);
		return {
			numero: numero,
			classe: T.semCodigo(primeiroCampo(campos, /^classe( processual| judicial)?$/)),
			juizo: primeiroCampo(campos, /^(juizo|vara|orgao julgador|juizo\/vara|unidade judiciaria)$/),
			comarca: primeiroCampo(campos, /^(comarca|foro)$/),
			assuntos: assuntoPrincipal ? [assuntoPrincipal] : [],
			apensamentos: linhasDoCampo(docs, /^apensamentos?$/, numero),
			vinculos: linhasDoCampo(docs, /^vinculos?$/, numero),
			dependentes: linhasDoCampo(docs, /^processos? dependentes?$/, ""),
			valorCausa: primeiroCampo(campos, /^valor (da causa|da acao)/),
			sigilo: primeiroCampo(campos, /^nivel de sigilo$/),
			distribuicao: primeiroCampo(campos, /^(data (da )?distribuicao|distribuid[oa] em|data de autuacao|autuacao)$/),
		};
	}

	// -------------------------------------------------------------------
	// Partes (aba "Partes e Outros" no Projudi; página atual no SEEU)
	// -------------------------------------------------------------------

	function tituloDaTabela(table) {
		for (let el = table.previousElementSibling; el; el = el.previousElementSibling) {
			if (el.tagName === "H4" || el.tagName === "H3") return colapsar(el.textContent);
			if (el.tagName === "TABLE" && el.classList.contains("resultTable")) return "";
		}
		return "";
	}

	const RE_OAB = /OAB\s*[:\-/]?\s*([A-Z]{2}\s*[\d.]+[A-Z]?|[\d.]+[A-Z]?\s*[\/\-]\s*[A-Z]{2})/i;

	// Advogados da célula da coluna "Advogados" da aba Partes. No Projudi,
	// cada um vem num <li> com quebras de linha internas ("OAB\n116785N-PR
	// -\nNOME"), por isso o <li> inteiro é uma entrada.
	function advogadosDaCelula(cell) {
		if (!cell) return [];
		let linhas;
		const itens = cell.querySelectorAll("li");
		if (itens.length) {
			linhas = Array.prototype.map.call(itens, function (li) { return colapsar(li.textContent); });
		} else {
			const clone = cell.cloneNode(true);
			clone.querySelectorAll("br").forEach(function (br) { br.replaceWith("\n"); });
			clone.querySelectorAll("div, p").forEach(function (el) { el.append("\n"); });
			linhas = clone.textContent.split("\n").map(colapsar);
		}
		return linhas.filter(function (linha) {
			return linha && !/^(nao (cadastrad|informad|possui)\w*|parte sem advogad\w*|sem advogad\w*|-+)$/.test(normalizar(linha));
		}).map(T.formatarAdvogado);
	}

	function lerPartes(doc) {
		// Só as tabelas "folha" (sem outra tabela de partes dentro), para não
		// pegar tabelas de layout que envolvem as tabelas dos polos.
		const LINK_PARTE = 'a[href*="parteProcesso"]';
		const tables = Array.prototype.filter.call(doc.querySelectorAll("table"), function (table) {
			return !!table.querySelector(LINK_PARTE) && !!table.querySelector("th") && !table.querySelector(":scope table " + LINK_PARTE);
		});
		const polos = [];
		const vistos = new Set();
		tables.forEach(function (table) {
			const titulo = tituloDaTabela(table) || "Parte";
			const ths = Array.prototype.slice.call(table.querySelectorAll(":scope > thead > tr > th"));
			if (!ths.length) {
				const primeira = Array.prototype.find.call(table.rows, function (tr) { return tr.querySelector("th"); });
				if (primeira) ths.push.apply(ths, primeira.cells);
			}
			const col = function (re) { return ths.findIndex(function (th) { return re.test(normalizar(th.textContent)); }); };
			const colDoc = col(/^(cpf|cnpj|documento)/);
			const colAdv = col(/advogad|procurador|defensor/);
			const partes = [];
			const linhas = table.tBodies.length ? table.tBodies[0].rows : table.rows;
			Array.prototype.forEach.call(linhas, function (tr) {
				const link = tr.querySelector(LINK_PARTE);
				if (!link) return;
				const nome = colapsar(link.textContent);
				const chave = titulo + "|" + nome;
				if (!nome || vistos.has(chave)) return;
				vistos.add(chave);
				let documento = colDoc >= 0 && tr.cells[colDoc] ? colapsar(tr.cells[colDoc].textContent) : "";
				if (/^(nao cadastrad|nao informad|-+$)/.test(normalizar(documento))) documento = "";
				if (documento && !/^(cpf|cnpj)/i.test(documento)) {
					documento = (documento.replace(/\D/g, "").length > 11 ? "CNPJ: " : "CPF: ") + documento;
				}
				let advogados = colAdv >= 0 ? advogadosDaCelula(tr.cells[colAdv]) : [];
				if (!advogados.length) {
					const m = RE_OAB.exec(tr.textContent || "");
					if (m) advogados = [colapsar((tr.textContent || "").slice(Math.max(0, m.index - 60), m.index + m[0].length)).replace(/^.*?([A-ZÀ-Ú][A-ZÀ-Ú ]+\s*-?\s*OAB)/, "$1")];
				}
				partes.push({ nome: nome, documento: documento, advogados: advogados });
			});
			if (partes.length) polos.push({ titulo: titulo, partes: partes });
		});
		return polos;
	}

	// Reserva para quando o item de aba nativo não traz o setTab('...')
	// (usado por __pdpLerAbaProcesso): reenvia o próprio #processoForm com
	// selectedIcon=<aba>, como faz reusCabecalho.js.
	async function lerAbaPorFormulario(tabId) {
		const form = document.getElementById("processoForm");
		if (!form) throw new Error("formulário do processo não encontrado");
		const id = form.elements.namedItem("id") ? form.elements.namedItem("id").value : new URL(form.action, location.href).searchParams.get("id");
		const corpo = new URLSearchParams();
		for (const [k, v] of new FormData(form)) if (typeof v === "string") corpo.append(k, v);
		corpo.set("selectedIcon", tabId);
		if (id) corpo.set("id", id);
		return lerPagina(new URL(form.getAttribute("action") || location.href, location.href).href, { method: "POST", body: corpo });
	}

	async function lerPolos(avisos) {
		let polos = lerPartes(document);
		let erro = null;
		if (!polos.length && IS_PROJUDI && typeof window.__pdpLerAbaPartes === "function") {
			try {
				const aba = await window.__pdpLerAbaPartes();
				polos = lerPartes(aba.doc);
			} catch (e) {
				erro = e;
			}
		}
		if (!polos.length && IS_PROJUDI) {
			try {
				polos = lerPartes(await lerAbaPorFormulario("tabPartes"));
			} catch (e) {
				erro = erro || e;
			}
		}
		if (!polos.length && erro) avisos.push('Não foi possível ler a aba "Partes e Outros": ' + erro.message);
		if (!polos.length) avisos.push("Partes não encontradas automaticamente — preencha na certidão.");
		return polos;
	}

	// -------------------------------------------------------------------
	// Movimentos
	// -------------------------------------------------------------------

	function acharColunas(table) {
		const cab = table.querySelector("thead tr") || Array.prototype.find.call(table.rows, function (tr) { return tr.querySelector("th"); });
		const cols = { seq: -1, data: -1, evento: -1, usuario: -1 };
		if (!cab) return cols;
		Array.prototype.forEach.call(cab.cells, function (cell, i) {
			const t = normalizar(cell.textContent);
			if (cols.seq < 0 && /^(seq|n[ºo°]?\.?$|sequencial|#)/.test(t)) cols.seq = i;
			else if (cols.data < 0 && /^data/.test(t)) cols.data = i;
			else if (cols.evento < 0 && /^(evento|movimentac|descricao|movimento)/.test(t)) cols.evento = i;
			else if (cols.usuario < 0 && /movimentado por|usuario|responsavel/.test(t)) cols.usuario = i;
		});
		return cols;
	}

	function linhasDeMovimento(doc) {
		const projudi = Array.prototype.slice.call(doc.querySelectorAll('tr[id^="mov1Grau,"], tr[id^="mov2Grau,"]'));
		if (projudi.length) return projudi;
		// SEEU e outros layouts: a tabela cujo cabeçalho tem "Data" e
		// "Evento"/"Movimentação"; as linhas são as que têm data/hora.
		const tabelas = Array.prototype.filter.call(doc.querySelectorAll("table"), function (table) {
			const c = acharColunas(table);
			return c.data >= 0 && c.evento >= 0;
		});
		const linhas = [];
		tabelas.forEach(function (table) {
			Array.prototype.forEach.call(table.tBodies.length ? table.tBodies : [table], function (tbody) {
				Array.prototype.forEach.call(tbody.rows, function (tr) {
					if (tr.querySelector("th") || tr.closest("table") !== table) return;
					if (DATA_HORA.test(tr.textContent || "")) linhas.push(tr);
				});
			});
		});
		return linhas;
	}

	function lerMovimento(tr) {
		const table = tr.closest("table");
		const cols = table ? acharColunas(table) : { seq: -1, data: -1, evento: -1, usuario: -1 };
		const cells = Array.prototype.slice.call(tr.cells);
		const cell = function (i) { return i >= 0 && i < cells.length ? cells[i] : null; };

		let seq = cell(cols.seq) ? textoLimpo(cell(cols.seq)) : "";
		if (!/^\d+(\.\d+)?$/.test(seq)) {
			const c = cells.find(function (td) { return /^\d+(\.\d+)?$/.test(textoLimpo(td)); });
			seq = c ? textoLimpo(c) : "";
		}

		let dataCell = cell(cols.data);
		if (!dataCell || !DATA_HORA.test(dataCell.textContent || "")) {
			dataCell = cells.find(function (td) { return DATA_HORA.test(td.textContent || "") && textoLimpo(td).length < 40; }) || null;
		}
		const md = dataCell ? DATA_HORA.exec(textoLimpo(dataCell)) : null;
		const dataHora = md ? md[1] + (md[2] ? " " + md[2] : "") : "";

		const linkMov = tr.querySelector('a.link[id^="LNKmov"], a[id^="LNKmov"]');
		let eventoCell = cell(cols.evento) || (linkMov && linkMov.closest("td"));
		if (!eventoCell) {
			// A célula de texto mais longo que não seja a de data nem a de usuário.
			eventoCell = cells.filter(function (td) { return td !== dataCell && td !== cell(cols.usuario); })
				.sort(function (a, b) { return textoLimpo(b).length - textoLimpo(a).length; })[0] || null;
		}
		const evento = textoLimpo(eventoCell);
		// Nome do movimento (o link/negrito) separado do complemento.
		const tituloEl = (linkMov && eventoCell && eventoCell.contains(linkMov) && linkMov) || (eventoCell && eventoCell.querySelector("b, strong"));
		const titulo = tituloEl ? textoLimpo(tituloEl) : evento.split(" - ")[0];
		let complemento = evento;
		if (titulo && complemento.indexOf(titulo) === 0) complemento = complemento.slice(titulo.length).replace(/^\s*-\s*/, "");
		else if (titulo === evento.split(" - ")[0]) complemento = evento.split(" - ").slice(1).join(" - ");
		const usuario = textoLimpo(cell(cols.usuario));
		const invalido = /INVALIDO/i.test((linkMov && linkMov.id) || "") || !!tr.querySelector("strike a, s a, del a, strike, del");

		const temArquivos = !!toggleDaLinha(tr) || linksDeArquivo(tr).length > 0;
		return { seq: seq, dataHora: dataHora, evento: evento, titulo: titulo, complemento: complemento, usuario: usuario, invalido: invalido, temArquivos: temArquivos };
	}

	// Paginação da tabela de movimentações (#navigator / a.arrowNextOn),
	// seguindo o mesmo formato já visto em decursoPrazoSequencial.js:
	// o link "Próxima" preenche campos de um formulário e o submete.
	function proximaPagina(doc) {
		const nav = doc.querySelector("#navigator");
		const link = nav && nav.querySelector("a.arrowNextOn");
		if (!link) return null;
		const js = (link.getAttribute("href") || "") + " " + (link.getAttribute("onclick") || "");
		const re = /document\.forms\[['"]([^'"]+)['"]\]\[['"]([^'"]+)['"]\]\.value\s*=\s*['"]([^'"]*)['"]/g;
		const atribuicoes = [];
		let m;
		while ((m = re.exec(js))) atribuicoes.push({ form: m[1], campo: m[2], valor: m[3] });
		if (atribuicoes.length) {
			const nome = atribuicoes[0].form;
			const form = doc.querySelector('form[name="' + nome + '"]') || doc.getElementById(nome);
			if (form) {
				const corpo = new URLSearchParams();
				for (const [k, v] of new FormData(form)) if (typeof v === "string") corpo.append(k, v);
				atribuicoes.forEach(function (a) { corpo.set(a.campo, a.valor); });
				return { url: new URL(form.getAttribute("action") || location.href, location.href).href, opcoes: { method: "POST", body: corpo } };
			}
		}
		const href = link.getAttribute("href") || "";
		if (href && !/^\s*(javascript:|#)/i.test(href)) return { url: new URL(href, location.href).href, opcoes: {} };
		return null;
	}

	async function lerMovimentos(avisos) {
		const linhas = linhasDeMovimento(document);
		const movimentos = linhas.map(function (tr) {
			const mov = lerMovimento(tr);
			mov.row = tr;
			return mov;
		});

		// Demais páginas, se houver.
		let prox = proximaPagina(document);
		let paginas = 1;
		const vistos = new Set(movimentos.map(function (m) { return m.seq + "|" + m.dataHora + "|" + m.evento; }));
		while (prox && paginas < 50) {
			let doc;
			try {
				doc = await lerPagina(prox.url, prox.opcoes);
			} catch (e) {
				avisos.push("Não foi possível ler a página " + (paginas + 1) + " das movimentações (" + e.message + "); confira se faltam movimentos.");
				break;
			}
			paginas++;
			let novos = 0;
			linhasDeMovimento(doc).forEach(function (tr) {
				const mov = lerMovimento(tr);
				const chave = mov.seq + "|" + mov.dataHora + "|" + mov.evento;
				if (vistos.has(chave)) return;
				vistos.add(chave);
				mov.docsDiretos = linksDeArquivo(tr, prox.url);
				movimentos.push(mov);
				novos++;
			});
			if (!novos) break;
			prox = proximaPagina(doc);
		}
		if (paginas > 1) console.log(TAG, "movimentações lidas de", paginas, "páginas");
		if (!movimentos.length) avisos.push("Nenhum movimento encontrado — abra a aba Movimentações do processo e tente de novo.");
		return movimentos;
	}

	// -------------------------------------------------------------------
	// Arquivos das peças principais
	// -------------------------------------------------------------------

	function linksDeArquivo(scope, base) {
		return Array.prototype.slice.call(scope.querySelectorAll('a[href*="/arquivo.do"], a[href*="arquivo.do"]'))
			.map(function (a) {
				let url;
				try { url = new URL(a.getAttribute("href"), base || document.baseURI).href; } catch (e) { return null; }
				return { nome: colapsar(a.textContent) || "Documento", url: url };
			})
			.filter(Boolean);
	}

	function toggleDaLinha(tr) {
		return tr.querySelector('img[onclick*="showDetail"], a[id^="linkArquivos"] img, a[id^="linkArquivos"]');
	}

	// Mesmo critério de content.js (movementDocsContainer): id explícito no
	// showDetail('id', ...) ou sufixo numérico do ícone (row<N>/div<N>).
	function containerDoToggle(toggle) {
		const onclick = toggle.getAttribute("onclick") || (toggle.parentElement && toggle.parentElement.getAttribute("onclick")) || "";
		const explicit = onclick.match(/showDetail\(\s*['"]([^'"]+)/);
		if (explicit) {
			const el = document.getElementById(explicit[1]);
			if (el) return el;
		}
		const m = (toggle.id || "").match(/(\d+)$/);
		if (m) return document.getElementById("row" + m[1]) || document.getElementById("div" + m[1]);
		return null;
	}

	// Carrega os arquivos de uma movimentação clicando no "+" nativo (sem
	// deixar a linha aberta), como content.js já faz no Preview.
	function arquivosDaLinha(tr) {
		return new Promise(function (resolve) {
			const diretos = linksDeArquivo(tr);
			if (diretos.length) return resolve(diretos);
			const toggle = toggleDaLinha(tr);
			if (!toggle) return resolve([]);
			let container = containerDoToggle(toggle);
			if (container) {
				const ja = linksDeArquivo(container);
				if (ja.length) return resolve(ja);
			}
			const alvoClique = toggle;
			function esconder() {
				toggle.style.setProperty("visibility", "hidden", "important");
				if (container) container.style.setProperty("display", "none", "important");
			}
			function terminar(docs) {
				try { alvoClique.click(); } catch (e) { /* ignora */ }
				toggle.style.removeProperty("visibility");
				if (container) container.style.removeProperty("display");
				resolve(docs);
			}
			esconder();
			try { alvoClique.click(); } catch (e) { /* ignora */ }
			if (!container) {
				container = containerDoToggle(toggle);
				esconder();
			}
			let esperou = 0;
			const poll = setInterval(function () {
				esperou += 100;
				if (!container) container = containerDoToggle(toggle);
				const docs = container ? linksDeArquivo(container) : [];
				if (docs.length || esperou >= 4000) {
					clearInterval(poll);
					terminar(docs);
				}
			}, 100);
		});
	}

	const RE_ARQUIVO_IGNORADO = /^auto\s*_?(de\s*)?pris[aã]o\s*_?(em\s*)?flagrante/i;

	async function lerPecas(movimentos, avisos, criminal) {
		const pecas = [];
		const unicas = new Set(); // inicial e denúncia: só a primeira
		let ordenados = T.ordenarMovimentos(movimentos);
		// Processo criminal: a peça inicial é a denúncia ("JUNTADA DE
		// DENÚNCIA"). Os movimentos anteriores a ela (inquérito, APF,
		// medidas cautelares...) não entram nas peças principais — continuam
		// normalmente na lista de eventos.
		if (criminal) {
			const iDen = ordenados.findIndex(function (m) {
				const c = !m.invalido && T.classificarMovimento(m.titulo || m.evento);
				return c && c.tipo === "denuncia";
			});
			if (iDen > 0) ordenados = ordenados.slice(iDen);
		}
		for (const mov of ordenados) {
			if (mov.invalido) continue;
			const tipo = T.classificarMovimento(mov.titulo || mov.evento);
			if (!tipo) continue;
			if (criminal && tipo.tipo === "inicial") continue;
			if ((tipo.tipo === "inicial" || tipo.tipo === "denuncia") && unicas.has(tipo.tipo)) continue;
			let docs = mov.docsDiretos || [];
			if (!docs.length && mov.row) docs = await arquivosDaLinha(mov.row);
			// Processo criminal: a "inicial" costuma ser a juntada do auto de
			// prisão em flagrante, que não precisa de resumo. Arquivos
			// "autoPrisaoFlagrante..." são ignorados; se o movimento só tiver
			// esse tipo de arquivo, a peça não entra na certidão.
			const total = docs.length;
			docs = docs.filter(function (d) { return !RE_ARQUIVO_IGNORADO.test(colapsar(d.nome)); });
			if (total && !docs.length) continue;
			if (tipo.tipo === "inicial" || tipo.tipo === "denuncia") unicas.add(tipo.tipo);
			pecas.push({
				tipo: tipo.tipo,
				rotulo: tipo.rotulo,
				seq: mov.seq,
				dataHora: mov.dataHora,
				evento: mov.evento,
				docs: docs,
			});
		}
		if (!pecas.length) avisos.push("Nenhuma peça principal (inicial/denúncia, contestação/resposta, sentença, recurso) foi identificada pelos nomes dos movimentos.");
		return pecas;
	}

	// -------------------------------------------------------------------
	// Coleta completa e abertura da janela
	// -------------------------------------------------------------------

	async function gerarCertidao() {
		const avisos = [];
		// Cada etapa é independente: uma falha de leitura vira aviso na
		// certidão (com o campo em branco para preencher), sem impedir o resto.
		async function etapa(nome, fn, padrao) {
			try {
				return await fn();
			} catch (e) {
				console.error(TAG, "falha em", nome, e);
				avisos.push("Falha ao ler " + nome + " (" + e.message + ") — confira e preencha na certidão.");
				return padrao;
			}
		}
		const cabecalho = await etapa("o cabeçalho do processo", function () { return lerCabecalho(avisos); }, { numero: numeroDoProcesso(), assuntos: [] });
		const polos = await etapa("as partes", function () { return lerPolos(avisos); }, []);
		const movimentos = await etapa("os movimentos", function () { return lerMovimentos(avisos); }, []);
		const criminal = T.ehProcessoCriminal(cabecalho.classe, movimentos);
		const pecas = await etapa("as peças principais", function () { return lerPecas(movimentos, avisos, criminal); }, []);

		const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);
		const payload = Object.assign({}, cabecalho, {
			id: id,
			criadoEm: Date.now(),
			sistema: IS_SEEU ? "SEEU" : "Projudi",
			origem: location.origin,
			criminal: criminal,
			polos: polos,
			movimentos: T.ordenarMovimentos(movimentos.map(function (m) {
				return { seq: m.seq, dataHora: m.dataHora, evento: m.evento, titulo: m.titulo, complemento: m.complemento, usuario: m.usuario, invalido: m.invalido, temArquivos: !!(m.temArquivos || (m.docsDiretos && m.docsDiretos.length)) };
			})),
			pecas: T.ordenarMovimentos(pecas),
			avisos: avisos,
		});
		console.log(TAG, "dados coletados:", payload);

		await chrome.storage.local.set({ ["pdpCertidao:" + id]: payload });
		const resposta = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "certidao-open", id: id });
		if (!resposta || !resposta.ok) throw new Error((resposta && resposta.error) || "Não foi possível abrir a janela da certidão.");
	}
	window.__pdpGerarCertidao = gerarCertidao;

	// "+ Adicionar peça" na janela da certidão: carrega, nesta aba, os
	// arquivos de um movimento escolhido (pelo sequencial), do mesmo jeito
	// que na coleta inicial (clicando no "+" da linha, sem deixá-la aberta).
	chrome.runtime.onMessage.addListener(function (msg, _sender, responder) {
		if (!msg || msg.source !== "projudi-preview" || msg.type !== "certidao-arquivos-movimento") return false;
		const linha = linhasDeMovimento(document).find(function (tr) {
			const m = lerMovimento(tr);
			return m.seq === msg.seq && (!msg.dataHora || m.dataHora === msg.dataHora);
		});
		if (!linha) {
			responder({ ok: false, error: "O movimento " + msg.seq + " não está na página de movimentações aberta (talvez esteja em outra página, ou a aba do processo foi fechada/trocada)." });
			return false;
		}
		arquivosDaLinha(linha)
			.then(function (docs) { responder({ ok: true, docs: docs }); })
			.catch(function (e) { responder({ ok: false, error: e.message }); });
		return true;
	});

	// -------------------------------------------------------------------
	// Botão na barra da extensão (#pdp-qa-row, ver quickActions.js)
	// -------------------------------------------------------------------

	let button;

	function reconcile() {
		const row = document.getElementById("pdp-qa-row");
		const host = row && (row.querySelector(".pdp-qa-row-line:last-child") || row);
		if (!host) {
			if (button && button.isConnected) button.remove();
			return;
		}
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.id = "pdp-certidao-button";
			button.className = "pdp-qa-group-btn";
			button.textContent = "📜 Certidão";
			button.title = "Gerar a certidão narrativa do processo (movimentos com data e hora, e resumo dos pedidos das peças principais)";
			button.addEventListener("click", async function () {
				if (button.disabled) return;
				button.disabled = true;
				const textoOriginal = button.textContent;
				button.textContent = "⏳ Coletando…";
				try {
					await gerarCertidao();
				} catch (error) {
					console.error(TAG, error);
					alert("Não foi possível gerar a certidão: " + error.message);
				} finally {
					button.disabled = false;
					button.textContent = textoOriginal;
				}
			});
		}
		if (button.parentElement !== host) host.appendChild(button);
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
