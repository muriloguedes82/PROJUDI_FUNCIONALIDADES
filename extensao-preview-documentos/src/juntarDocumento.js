// Projudi - Atalho "Juntar Documento" com preferências gravadas
//
// Juntar um documento digitado (certidão, informação, termo...) hoje exige:
// clicar no botão nativo "Juntar Documento" da barra de botões do processo
// (id="movimentarButton", `document.location.href =
// '/projudi/movimentarProcesso.do?_tj=...'`), escolher o "Tipo de
// Documento" (campo com autocompletar + pesquisa), clicar em "Adicionar"
// (o Projudi abre a janela interna "Inserir Arquivo", upload.do), escolher
// o "Tipo do Arquivo" (e às vezes o "Modelo"), clicar em "Digitar Texto"
// (a mesma janela vai para "Digitar Documento", digitarTexto.do, com o
// CKEditor), digitar o texto, clicar em "Continuar", clicar em "Concluir"
// na pré-visualização "Documento", clicar em "Assinar Arquivos" de volta
// ao "Inserir Arquivo" (chama o assinador), depois em "Confirmar Inclusão"
// e, na tela "Juntar Documento", em "Concluir Movimento".
//
// Este arquivo adiciona o botão "📎 Juntar Documento" na linha do
// "📋 Processo copiado" (ver quickActions.js), logo após o "👥 Editar
// Partes/Outros". Ele abre um painel com:
// - "Abrir": só vai para a tela "Juntar Documento" (como o botão nativo);
// - "+ Nova preferência": abre a tela "Juntar Documento" e GRAVA o que o
//   usuário faz no fluxo completo — Tipo de Documento (ao clicar em
//   "Adicionar"), Tipo do Arquivo/Descrição/Modelo (ao clicar em "Digitar
//   Texto") e o texto digitado (ao clicar em "Continuar") — até o
//   "Assinar Arquivos", quando pede o nome e salva a preferência (o
//   assinador segue normalmente);
// - preferências salvas (★): refazem o fluxo sozinhas até o "Assinar
//   Arquivos" (o usuário só digita o PIN) e, com o arquivo assinado,
//   clicam em "Confirmar Inclusão" e em "Concluir Movimento";
// - ✏️: refaz o fluxo com a preferência já preenchida em cada tela, mas
//   sem clicar em nada — o usuário ajusta o que quiser, avança
//   manualmente e, no "Assinar Arquivos", a preferência é atualizada;
// - 🗑: remove a preferência.
//
// O texto gravado é só o que o usuário acrescentou/alterou no documento
// (os blocos do corpo do editor que não existiam quando ele abriu — ver
// `snapshotEditor`/`conteudoDigitado`): cabeçalho, número dos autos, data
// e assinatura, que o Projudi gera para cada processo, ficam de fora. Ao
// aplicar, esse conteúdo substitui o marcador "XXXXXXXXXX INSIRA O TEXTO
// AQUI XXXXXXXXXX".
//
// O fluxo atravessa várias páginas (a tela do processo, a "Juntar
// Documento" e as telas da janela interna do Projudi, que é um iframe da
// mesma origem). O estado fica no `sessionStorage` (compartilhado pelos
// frames da mesma origem nesta aba, e só nela), em JOB_KEY:
//   { mode: "apply" | "capture" | "edit", stage, pref, rec, numero, createdAt }
// com a etapa atual:
//   "juntar"   → tela Juntar Documento (Tipo de Documento → "Adicionar");
//   "upload"   → janela "Inserir Arquivo" (tipo/modelo → "Digitar Texto");
//   "digitar"  → "Digitar Documento" (texto → "Continuar");
//   "incluir"  → pré-visualização ("Concluir") e "Inserir Arquivo" com o
//                arquivo na lista, ainda sem assinatura → "Assinar Arquivos";
//   "assinar"  → aguardando o assinador; com "Assinado: Sim" → "Confirmar
//                Inclusão";
//   "concluir" → Juntar Documento com o arquivo → "Concluir Movimento".
// Os cliques nos botões nativos (do usuário ou da extensão) avançam a
// etapa; assim, se um passo automático falhar, o usuário faz esse passo à
// mão e a automação continua do seguinte.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpJuntarDocumento || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpJuntarDocumento = true;

	const PREFS_KEY = "pdpJuntarDocumentoPrefs"; // [{id, name, tipoDocumento, tipoArquivo, descricao, modelo, conteudo, createdAt, updatedAt}]
	const JOB_KEY = "pdpJuntarDocumentoJob";
	// Preferências próprias do "Analisar Decurso" (lista de decurso de prazo,
	// decursoNaLinha.js): mesmo formato, sem o Tipo de Documento.
	const DECURSO_PREFS_KEY = "pdpDecursoPrefs";
	// Marcas (sessionStorage) para quem abriu a análise do decurso saber o
	// fim: o botão final foi clicado, ou ficou para o usuário clicar.
	const DECURSO_CONCLUIDA_KEY = "pdpDecursoAnaliseConcluida";
	const DECURSO_AGUARDANDO_KEY = "pdpDecursoAnaliseAguardando";
	// Preferências do "Analisar" dos cumprimentos (Pré-Análise, lista Demais
	// Cumprimentos - preAnaliseNaLinha.js): Tipo do Arquivo, Modelo, texto e
	// `postergar` (true = clicar em "Postergar Assinatura" no fim). O fim do
	// fluxo usa as mesmas marcas do decurso (um fluxo por vez na aba).
	const PREANALISE_PREFS_KEY = "pdpPreAnalisePrefs";
	// Preferência gravada no clique em "Concluir Movimento", até o
	// chrome.storage confirmar a gravação (a página pode navegar antes).
	const PENDING_SAVE_KEY = "pdpJuntarDocumentoPendingSave";
	// Combos de preferências (quickActions.js). Uma juntada iniciada por um
	// combo anota COMBO_CONCLUIR_KEY no clique em "Concluir Movimento"; a
	// tela seguinte do Projudi ("Dados registrados com sucesso!", em
	// juntarDocumento.do — onde a fileira de botões e o motor do combo não
	// rodam, ver uiVisibility.js) confirma a juntada: a extensão marca
	// COMBO_DONE_KEY e clica sozinha em "Voltar para o Processo". De volta
	// à tela do processo, o combo segue para a etapa seguinte.
	const COMBO_CONCLUIR_KEY = "pdpComboJuntadaConcluir";
	const COMBO_DONE_KEY = "pdpComboJuntadaConcluida";
	const COMBO_CONCLUIR_MAX_AGE_MS = 5 * 60 * 1000;
	const SUCCESS_RE = /dados registrados com sucesso/i;
	// O usuário pode levar um bom tempo digitando o texto.
	const JOB_MAX_AGE_MS = 60 * 60 * 1000;
	const WAIT_TIMEOUT_MS = 8000;
	const POLL_MS = 400;
	const PLACEHOLDER_RE = /X{5,}\s*INSIRA O TEXTO AQUI\s*X{5,}/i;
	const LOG = "[Projudi Juntar Documento]";

	// -------------------------------------------------------------------
	// Utilidades
	// -------------------------------------------------------------------

	function norm(text) {
		return (text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/ /g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.toUpperCase();
	}

	function cleanText(text) {
		return (text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function buttonText(el) {
		return cleanText(el.value || el.textContent);
	}

	function findButton(root, label, exclude) {
		if (!root) return null;
		const candidates = root.querySelectorAll('input[type="button"], input[type="submit"], button');
		for (let i = 0; i < candidates.length; i++) {
			if (exclude && exclude(candidates[i])) continue;
			if (norm(buttonText(candidates[i])) === norm(label)) return candidates[i];
		}
		return null;
	}

	function sleep(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	async function waitFor(fn, timeoutMs) {
		const limit = Date.now() + (timeoutMs || WAIT_TIMEOUT_MS);
		for (;;) {
			let value = null;
			try {
				value = fn();
			} catch (err) {
				value = null;
			}
			if (value) return value;
			if (Date.now() > limit) return null;
			await sleep(150);
		}
	}

	function fire(el, type) {
		el.dispatchEvent(new Event(type, { bubbles: true }));
	}

	function numeroProcesso(doc) {
		const heading = doc.querySelector("h3 em.attention");
		const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((doc.title || "") + " " + (heading ? heading.textContent : ""));
		return match ? match[0] : null;
	}

	function storageGet(key, fallback) {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(key, function (data) {
					resolve(data && data[key] !== undefined ? data[key] : fallback);
				});
			} catch (err) {
				resolve(fallback);
			}
		});
	}

	function storageSet(key, value) {
		return new Promise(function (resolve, reject) {
			try {
				chrome.storage.local.set({ [key]: value }, function () {
					if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
					else resolve();
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	// -------------------------------------------------------------------
	// Estado do fluxo (sessionStorage: só esta aba, frames da mesma origem)
	// -------------------------------------------------------------------

	function readJob() {
		try {
			const job = JSON.parse(sessionStorage.getItem(JOB_KEY) || "null");
			if (!job || Date.now() - job.createdAt > JOB_MAX_AGE_MS) return null;
			return job;
		} catch (err) {
			return null;
		}
	}

	function writeJob(job) {
		try {
			sessionStorage.setItem(JOB_KEY, JSON.stringify(job));
		} catch (err) {
			console.warn(LOG, "não foi possível gravar o estado do fluxo:", err);
		}
	}

	function updateJob(fn) {
		const job = readJob();
		if (!job) return null;
		fn(job);
		writeJob(job);
		return job;
	}

	// Avança a etapa só a partir das etapas indicadas (evita voltar atrás
	// quando o mesmo botão é clicado de novo).
	function advance(from, to) {
		updateJob(function (job) {
			if (from.indexOf(job.stage) !== -1) job.stage = to;
		});
	}

	function record(fields) {
		updateJob(function (job) {
			if (job.mode === "apply") return;
			job.rec = Object.assign(job.rec || {}, fields);
		});
	}

	function clearJob(keepStatus) {
		try {
			sessionStorage.removeItem(JOB_KEY);
		} catch (err) {
			// sem sessionStorage: nada a limpar
		}
		if (!keepStatus) removeStatus();
	}

	// -------------------------------------------------------------------
	// Faixa de status (no frame em que o fluxo está)
	// -------------------------------------------------------------------

	let statusBar = null;

	function showStatus(message, kind, extraButtons) {
		if (!document.body) return;
		if (statusBar && statusBar.isConnected) statusBar.remove();
		statusBar = document.createElement("div");
		statusBar.className = "pdp-jd-status";
		if (kind) statusBar.classList.add("pdp-jd-status-" + kind);
		const text = document.createElement("span");
		text.className = "pdp-jd-status-text";
		text.textContent = "📎 " + message;
		statusBar.appendChild(text);
		(extraButtons || []).forEach(function (spec) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = spec.label;
			if (spec.title) btn.title = spec.title;
			if (spec.primary) btn.className = "pdp-jd-primary";
			btn.addEventListener("click", spec.onClick);
			statusBar.appendChild(btn);
		});
		if (readJob()) {
			const stop = document.createElement("button");
			stop.type = "button";
			stop.textContent = "Parar";
			stop.title = "A extensão deixa de acompanhar esta juntada (nada é gravado); você segue manualmente";
			stop.addEventListener("click", function () {
				clearJob();
			});
			statusBar.appendChild(stop);
		}
		const close = document.createElement("button");
		close.type = "button";
		close.textContent = "✕";
		close.title = "Fechar este aviso";
		close.addEventListener("click", removeStatus);
		statusBar.appendChild(close);
		document.body.appendChild(statusBar);
	}

	// Só recria a faixa quando a mensagem muda (o laço roda a cada POLL_MS).
	let lastStatusKey = "";
	function showStatusOnce(key, message, kind, extraButtons) {
		if (lastStatusKey === key && statusBar && statusBar.isConnected) return;
		lastStatusKey = key;
		showStatus(message, kind, extraButtons);
	}

	function removeStatus() {
		if (statusBar && statusBar.isConnected) statusBar.remove();
		statusBar = null;
		lastStatusKey = "";
	}

	function modeLabel(job) {
		if (job.mode === "capture") return "Gravando nova preferência";
		if (job.mode === "edit") return 'Editando "' + job.pref.name + '"';
		return 'Preferência "' + job.pref.name + '"';
	}

	// -------------------------------------------------------------------
	// Preferências
	// -------------------------------------------------------------------

	// `chave` (opcional): PREFS_KEY (Juntar Documento, padrão) ou
	// DECURSO_PREFS_KEY (Analisar Decurso).
	function loadPrefs(chave) {
		return storageGet(chave || PREFS_KEY, []).then(function (prefs) {
			return Array.isArray(prefs) ? prefs : [];
		});
	}

	function savePref(pref, chave) {
		return loadPrefs(chave).then(function (prefs) {
			const idx = prefs.findIndex(function (p) {
				return p.id === pref.id;
			});
			pref.updatedAt = Date.now();
			if (idx === -1) {
				pref.createdAt = pref.updatedAt;
				prefs.push(pref);
			} else {
				pref.createdAt = prefs[idx].createdAt;
				prefs[idx] = pref;
			}
			return storageSet(chave || PREFS_KEY, prefs);
		});
	}

	function removePref(id, chave) {
		return loadPrefs(chave).then(function (prefs) {
			return storageSet(
				chave || PREFS_KEY,
				prefs.filter(function (p) {
					return p.id !== id;
				})
			);
		});
	}

	// Grava primeiro no sessionStorage (sobrevive a uma navegação imediata
	// provocada pelo "Concluir Movimento") e depois no chrome.storage.
	function persistPref(pref, chave) {
		try {
			sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(chave ? Object.assign({}, pref, { __chave: chave }) : pref));
		} catch (err) {
			// segue direto para o chrome.storage
		}
		return savePref(pref, chave).then(function () {
			try {
				sessionStorage.removeItem(PENDING_SAVE_KEY);
			} catch (err) {
				// nada a limpar
			}
		});
	}

	function flushPendingSave() {
		let pending = null;
		try {
			pending = JSON.parse(sessionStorage.getItem(PENDING_SAVE_KEY) || "null");
		} catch (err) {
			pending = null;
		}
		if (pending) {
			const chave = pending.__chave || null;
			delete pending.__chave;
			persistPref(pending, chave).catch(function (err) {
				console.warn(LOG, "não foi possível salvar a preferência pendente:", err);
			});
		}
	}

	function htmlToText(html) {
		const div = document.createElement("div");
		div.innerHTML = html || "";
		return cleanText(div.textContent);
	}

	function describePref(pref) {
		const parts = [];
		if (pref.tipoDocumento && pref.tipoDocumento.text) parts.push("Tipo de Documento: " + pref.tipoDocumento.text);
		if (pref.tipoArquivo && pref.tipoArquivo.text) parts.push("Tipo do Arquivo: " + pref.tipoArquivo.text);
		if (pref.descricao) parts.push("Descrição: " + pref.descricao);
		if (pref.modelo && pref.modelo.text) parts.push("Modelo: " + pref.modelo.text);
		const texto = htmlToText(pref.conteudo);
		parts.push(texto ? "Texto: " + texto.slice(0, 100) + (texto.length > 100 ? "…" : "") : "Texto: (nenhum — você digita na hora)");
		return parts.join("\n");
	}

	// -------------------------------------------------------------------
	// Tela do processo: botão nativo "Juntar Documento" e início do fluxo
	// -------------------------------------------------------------------

	// <input type="button" id="movimentarButton" value="Juntar Documento"
	//   onclick="disableScreen(); document.location.href='/projudi/movimentarProcesso.do?_tj=...'">
	function findNativeJuntarButton(doc) {
		const byId = doc.getElementById("movimentarButton");
		if (byId && norm(buttonText(byId)) === "JUNTAR DOCUMENTO") return byId;
		return findButton(doc, "Juntar Documento", function (el) {
			return el.tagName === "BUTTON" || !!el.closest("#pdp-qa-row, .pdp-qa-panel");
		});
	}

	function findJuntarUrl(doc) {
		const button = findNativeJuntarButton(doc);
		const onclick = button ? button.getAttribute("onclick") || "" : "";
		const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(onclick);
		if (!hrefMatch) return null;
		try {
			const url = new URL(hrefMatch[2], location.href);
			if (url.origin !== location.origin) return null;
			return url;
		} catch (err) {
			return null;
		}
	}

	// mode: null (só abrir) | "apply" | "capture" | "edit"
	// `combo`: juntada iniciada por um combo de preferências (ver
	// COMBO_DONE_KEY). Devolve false se não achou o botão nativo.
	function iniciarJuntada(mode, pref, combo) {
		const url = findJuntarUrl(document);
		if (!url) {
			alert('Não encontrei o botão nativo "Juntar Documento" nesta tela. Abra o processo (a barra com "Peticionar", "Juntar Documento", "Navegar"...) e tente de novo.');
			return false;
		}
		if (mode) {
			writeJob({
				mode: mode,
				stage: "juntar",
				pref: pref || null,
				rec: {},
				numero: numeroProcesso(document),
				combo: !!combo,
				createdAt: Date.now(),
			});
		} else {
			clearJob();
		}
		location.href = url.href;
		return true;
	}

	// Usado pelos combos de preferências (quickActions.js) e pelo "Analisar
	// Decurso" das listas de decurso de prazo (decursoNaLinha.js).
	window.__pdpJuntarDocumentoApi = {
		// Preferências salvas (Tipo do Arquivo, Modelo e texto).
		listar: function () {
			return loadPrefs();
		},
		// Prepara a juntada com `pref` na tela "Analisar Decurso de Prazo"
		// (certificar.do) que quem chama vai abrir (ex.: no popup das ações
		// rápidas): lá a extensão clica em "Adicionar" e segue o mesmo fluxo
		// da janela "Inserir Arquivo" até a assinatura e o "Confirmar
		// Inclusão". O estado fica no sessionStorage da aba (compartilhado
		// com o popup, que é da mesma origem).
		prepararDecurso: function (pref, numero) {
			limparMarcasDecurso();
			writeJob({ mode: "apply", stage: "juntar", pref: pref, rec: {}, numero: numero || null, decurso: true, createdAt: Date.now() });
		},
		// Preferências próprias do "Analisar Decurso".
		listarDecurso: function () {
			return loadPrefs(DECURSO_PREFS_KEY);
		},
		removerDecurso: function (id) {
			return removePref(id, DECURSO_PREFS_KEY);
		},
		// Grava (mode "capture") ou edita (mode "edit", com `pref`) uma
		// preferência do "Analisar Decurso" na tela de análise aberta a seguir.
		gravarDecurso: function (numero, pref) {
			limparMarcasDecurso();
			writeJob({ mode: pref ? "edit" : "capture", stage: "juntar", pref: pref || null, rec: {}, numero: numero || null, decurso: true, createdAt: Date.now() });
		},
		// Preferências do "Analisar" dos cumprimentos (Pré-Análise).
		listarPreAnalise: function () {
			return loadPrefs(PREANALISE_PREFS_KEY);
		},
		removerPreAnalise: function (id) {
			return removePref(id, PREANALISE_PREFS_KEY);
		},
		// mode "apply" (com `pref`), "capture" (nova) ou "edit" (com `pref`)
		// na tela de Pré-Análise aberta a seguir.
		prepararPreAnalise: function (mode, pref, numero) {
			limparMarcasDecurso();
			// `tela`: lista de onde veio (Demais Cumprimentos, Mandados, Expedir
			// Intimações, Expedir Citação) - cada uma mostra só as suas.
			writeJob({ mode: mode, stage: "upload", pref: pref || null, rec: {}, numero: numero || null, preanalise: true, tela: location.pathname, createdAt: Date.now() });
		},
		// Fim da análise iniciada com prepararDecurso: "concluida" (a
		// extensão clicou no botão final), "aguardando" (o botão final ficou
		// para o usuário) ou null.
		fimDecurso: function () {
			try {
				if (sessionStorage.getItem(DECURSO_CONCLUIDA_KEY)) return "concluida";
				if (sessionStorage.getItem(DECURSO_AGUARDANDO_KEY)) return "aguardando";
			} catch (err) {
				// sem sessionStorage
			}
			return null;
		},
		start: function (pref) {
			return iniciarJuntada("apply", pref, true);
		},
		// Esta tela tem o botão nativo "Juntar Documento" (tela do processo).
		available: function () {
			return !!findJuntarUrl(document);
		},
		hasActiveJob: function () {
			return !!readJob();
		},
		cancel: function () {
			clearJob();
		},
	};

	// -------------------------------------------------------------------
	// Tela "Juntar Documento" (form#juntarDocumentoForm)
	// -------------------------------------------------------------------

	function isJuntarScreen() {
		return (!!document.getElementById("juntarDocumentoForm") && !!document.getElementById("descricaoTipoDocumento")) || isDecursoScreen();
	}

	// Tela "Analisar Decurso de Prazo" (certificar.do, form#certificarForm):
	// faz o papel da "Juntar Documento" - o "Adicionar" abre a mesma janela
	// "Inserir Arquivo" -, mas sem "Tipo de Documento" e sem "Concluir
	// Movimento" (o botão final é o #concluirButton).
	function isDecursoScreen() {
		const form = document.getElementById("certificarForm");
		return !!form && !!form.querySelector("#addButton");
	}

	function idTipoDocumentoField() {
		const form = document.getElementById("juntarDocumentoForm");
		return (form && form.elements.namedItem("idTipoDocumento")) || document.querySelector('[name="idTipoDocumento"]');
	}

	// Linhas de arquivo da primeira tabela "resultTable" (a lista de
	// arquivos, tanto na Juntar Documento quanto na Inserir Arquivo), sem a
	// linha "Nenhum registro encontrado".
	function fileRows(root) {
		const table = root && root.querySelector("table.resultTable");
		if (!table) return [];
		return Array.prototype.slice.call(table.querySelectorAll("tbody tr")).filter(function (tr) {
			return tr.querySelectorAll("td").length >= 3 && !/nenhum registro encontrado/i.test(tr.textContent || "");
		});
	}

	function lerTipoDocumento() {
		const input = document.getElementById("descricaoTipoDocumento");
		const hidden = idTipoDocumentoField();
		const text = input ? cleanText(input.value) : "";
		if (!text) return null;
		return { text: text, id: hidden && hidden.value ? hidden.value : null };
	}

	function tipoDocumentoPreenchido(tipo) {
		const input = document.getElementById("descricaoTipoDocumento");
		const hidden = idTipoDocumentoField();
		if (!input || norm(input.value) !== norm(tipo.text)) return false;
		return !hidden || !!hidden.value;
	}

	async function preencherTipoDocumento(tipo) {
		const input = document.getElementById("descricaoTipoDocumento");
		if (!input || !tipo || !tipo.text) return false;
		const hidden = idTipoDocumentoField();

		// Caminho direto: id gravado e campo oculto presente.
		if (hidden && tipo.id) {
			input.value = tipo.text;
			hidden.value = tipo.id;
			fire(input, "change");
			fire(hidden, "change");
			return true;
		}

		// Caminho pelo autocompletar nativo: digita a descrição e escolhe a
		// sugestão de mesmo texto.
		const box = document.getElementById("ajaxAuto_descricaoTipoDocumento");
		input.focus();
		input.value = tipo.text;
		input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
		fire(input, "input");
		if (box) {
			const wanted = norm(tipo.text);
			const li = await waitFor(function () {
				const items = Array.prototype.slice.call(box.querySelectorAll("li"));
				if (!items.length) return null;
				return (
					items.filter(function (item) {
						return norm(item.textContent) === wanted;
					})[0] || (items.length === 1 ? items[0] : null)
				);
			});
			if (li) {
				li.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
				li.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				await sleep(300);
				if (hidden && !hidden.value && /^\d+$/.test(li.id)) hidden.value = li.id;
				input.value = cleanText(li.textContent);
			}
		}
		await sleep(200);
		return tipoDocumentoPreenchido(tipo);
	}

	// Pede o nome e salva a preferência gravada. Chamado no clique em
	// "Assinar Arquivos" da janela Inserir Arquivo (antes do handler do
	// Projudi, na fase de captura — o `prompt` segura o assinador até o
	// usuário responder); na falta dele, no "Concluir Movimento" ou no botão
	// "Salvar sem concluir" da faixa.
	function salvarGravacao(job) {
		const rec = job.rec || {};
		if (job.decurso) return salvarGravacaoDecurso(job, rec);
		if (!rec.tipoDocumento || !rec.tipoArquivo) {
			alert(
				"A preferência não foi salva: não consegui gravar o " +
					(!rec.tipoDocumento ? 'Tipo de Documento (grava ao clicar em "Adicionar")' : 'Tipo do Arquivo (grava ao clicar em "Digitar Texto")') +
					"."
			);
			return false;
		}
		// Juntar Documento salva mesmo sem texto (o documento pode vir do
		// Modelo); só confirma quando o "texto" é o documento inteiro.
		if (rec.conteudo && rec.conteudoInteiro && !rec.edicao && !confirmarSemTexto(rec)) return false;
		const name = prompt(
			job.mode === "edit" ? 'Atualizar a preferência de "Juntar Documento". Nome:' : 'Nome para esta preferência de "Juntar Documento":',
			job.mode === "edit" ? job.pref.name : ""
		);
		if (!name || !name.trim()) return false;
		const pref = {
			id: job.mode === "edit" ? job.pref.id : "jd-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
			name: name.trim(),
			tipoDocumento: rec.tipoDocumento,
			tipoArquivo: rec.tipoArquivo,
			descricao: rec.descricao || "",
			modelo: rec.modelo || null,
			conteudo: rec.conteudo || "",
			ancora: rec.ancora || null,
			ancoraIndice: typeof rec.ancoraIndice === "number" ? rec.ancoraIndice : null,
			totalBlocos: typeof rec.totalBlocos === "number" ? rec.totalBlocos : null,
			edicao: rec.edicao || null,
		};
		persistPref(pref).catch(function (err) {
			alert("Não foi possível salvar a preferência: " + err.message);
		});
		return pref;
	}

	// Preferência do "Analisar Decurso": só a janela "Inserir Arquivo" e o
	// texto (não há Tipo de Documento nessa tela).
	// Preferência sem texto: ao usá-la, a extensão para no "Digitar
	// Documento" para o usuário digitar (não clica em "Continuar" sozinha).
	function confirmarSemTexto(rec) {
		// A versão final foi captada no "Continuar" (rec.edicao): é ela que
		// vale, com ou sem alterações no texto do Modelo.
		if (rec.edicao) return true;
		if (rec.conteudo && rec.conteudoInteiro) {
			return confirm(
				"O texto gravado nesta preferência parece ser o documento inteiro, com dados deste processo (nomes, endereços, datas), e não só o trecho que você digitou.\n\n" +
					"Ao usá-la, esses dados iriam para o documento de outro processo.\n\n" +
					"Salvar assim mesmo? (Cancelar = não salvar; recomendado gravar de novo.)"
			);
		}
		if (rec.conteudo) return true;
		return confirm(
			"Não consegui gravar nenhum texto nesta preferência (o texto é gravado ao clicar em \"Continuar\", no \"Digitar Documento\").\n\n" +
				"Sem texto, ao usá-la a extensão vai parar no \"Digitar Documento\" para você digitar.\n\n" +
				"Salvar assim mesmo? (Cancelar = não salvar; depois use ✏️ para gravar de novo com o texto.)"
		);
	}

	function salvarGravacaoDecurso(job, rec) {
		if (!rec.tipoArquivo) {
			alert('A preferência não foi salva: não consegui gravar o Tipo do Arquivo (grava ao clicar em "Digitar Texto").');
			return false;
		}
		if (!confirmarSemTexto(rec)) return false;
		const name = prompt(
			job.mode === "edit" ? 'Atualizar a preferência de "Analisar Decurso". Nome:' : 'Nome para esta preferência de "Analisar Decurso":',
			job.mode === "edit" ? job.pref.name : ""
		);
		if (!name || !name.trim()) return false;
		const pref = {
			id: job.mode === "edit" ? job.pref.id : "dec-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
			name: name.trim(),
			tipoArquivo: rec.tipoArquivo,
			descricao: rec.descricao || "",
			modelo: rec.modelo || null,
			conteudo: rec.conteudo || "",
			ancora: rec.ancora || null,
			ancoraIndice: typeof rec.ancoraIndice === "number" ? rec.ancoraIndice : null,
			totalBlocos: typeof rec.totalBlocos === "number" ? rec.totalBlocos : null,
			edicao: rec.edicao || null,
		};
		persistPref(pref, DECURSO_PREFS_KEY).catch(function (err) {
			alert("Não foi possível salvar a preferência: " + err.message);
		});
		return pref;
	}

	let juntarActed = false;
	let juntarBusy = false;

	function watchJuntarScreen(form) {
		const adicionar = findButton(form, "Adicionar");
		if (adicionar && !adicionar.__pdpJdWatch) {
			adicionar.__pdpJdWatch = true;
			adicionar.addEventListener(
				"click",
				function () {
					const tipo = lerTipoDocumento();
					if (tipo) record({ tipoDocumento: tipo });
					advance(["juntar"], "upload");
				},
				true
			);
		}
		const concluir = findButton(form, "Concluir Movimento");
		if (concluir && !concluir.__pdpJdWatch) {
			concluir.__pdpJdWatch = true;
			concluir.addEventListener(
				"click",
				function () {
					const job = readJob();
					if (!job) return;
					if (job.mode === "capture" || job.mode === "edit") {
						const saved = salvarGravacao(job);
						clearJob(true);
						if (saved) showStatus('Preferência "' + saved.name + '" ' + (job.mode === "edit" ? "atualizada" : "salva") + ".", "ok");
						else removeStatus();
					} else {
						if (job.combo) {
							try {
								sessionStorage.setItem(COMBO_CONCLUIR_KEY, JSON.stringify({ at: Date.now(), numero: job.numero || null }));
							} catch (err) {
								// sem sessionStorage: o combo pergunta como seguir
							}
						}
						clearJob(true);
					}
				},
				true
			);
		}
		return { adicionar: adicionar, concluir: concluir };
	}

	async function tickJuntar(job) {
		if (isDecursoScreen()) {
			tickDecurso(job);
			return;
		}
		const form = document.getElementById("juntarDocumentoForm");
		if (!form || juntarBusy) return;
		const buttons = watchJuntarScreen(form);

		if (job.numero) {
			const numero = numeroProcesso(document);
			if (numero && numero !== job.numero) {
				console.info(LOG, "tela de outro processo; fluxo encerrado.");
				clearJob();
				return;
			}
		}

		const hasFiles = fileRows(form).length > 0;

		if (job.stage === "juntar" && !juntarActed) {
			juntarActed = true;
			if (job.mode === "capture") {
				showStatusOnce("capture-juntar", modeLabel(job) + ': escolha o Tipo de Documento e clique em "Adicionar".', "rec");
				return;
			}
			juntarBusy = true;
			try {
				const tipo = job.pref.tipoDocumento;
				showStatus(modeLabel(job) + ': preenchendo o Tipo de Documento "' + tipo.text + '"…', job.mode === "edit" ? "rec" : null);
				const ok = await preencherTipoDocumento(tipo);
				if (job.mode === "edit") {
					showStatus(
						modeLabel(job) + ": " + (ok ? "Tipo de Documento preenchido. Ajuste se quiser e" : 'não consegui preencher o Tipo de Documento "' + tipo.text + '". Escolha-o e') + ' clique em "Adicionar".',
						"rec"
					);
					return;
				}
				if (!ok) {
					showStatus('Não consegui escolher o Tipo de Documento "' + tipo.text + '". Escolha-o manualmente e clique em "Adicionar" — a extensão continua daí.', "warn");
					return;
				}
				if (!buttons.adicionar) {
					showStatus('Não encontrei o botão "Adicionar". Clique nele manualmente — a extensão continua daí.', "warn");
					return;
				}
				showStatus(modeLabel(job) + ': abrindo "Inserir Arquivo"…');
				buttons.adicionar.click();
			} finally {
				juntarBusy = false;
			}
			return;
		}

		if (["upload", "digitar", "assinar"].indexOf(job.stage) !== -1 || (job.stage === "incluir" && !hasFiles)) {
			showStatusOnce("juntar-wait-" + job.mode, modeLabel(job) + ": continue na janela do Projudi (Inserir Arquivo / Digitar Documento).", job.mode === "apply" ? null : "rec");
			return;
		}

		if ((job.stage === "incluir" || job.stage === "concluir") && hasFiles) {
			if (!buttons.concluir) {
				clearJob(true);
				showStatus('Documento incluído, mas não encontrei o botão "Concluir Movimento". Clique nele manualmente.', "warn");
				return;
			}
			if (job.mode === "apply") {
				if (juntarBusy) return;
				juntarBusy = true;
				showStatus('Documento incluído. Clicando em "Concluir Movimento"…', "ok");
				buttons.concluir.click(); // o listener acima encerra o fluxo
				return;
			}
			buttons.concluir.classList.add("pdp-jd-highlight");
			showStatusOnce(
				"juntar-save-" + job.mode,
				modeLabel(job) + ': confira e clique em "Concluir Movimento" — a preferência é ' + (job.mode === "edit" ? "atualizada" : "salva") + " nesse momento.",
				"rec",
				[
					{
						label: "💾 Salvar sem concluir",
						title: 'Salva a preferência agora, sem clicar em "Concluir Movimento"',
						onClick: function () {
							const current = readJob();
							if (!current) return;
							const saved = salvarGravacao(current);
							if (!saved) return;
							clearJob(true);
							showStatus('Preferência "' + saved.name + '" ' + (current.mode === "edit" ? "atualizada" : "salva") + '. Clique em "Concluir Movimento" quando quiser.', "ok");
						},
					},
				]
			);
		}
	}

	function limparMarcasDecurso() {
		try {
			sessionStorage.removeItem(DECURSO_CONCLUIDA_KEY);
			sessionStorage.removeItem(DECURSO_AGUARDANDO_KEY);
		} catch (err) {
			// sem sessionStorage
		}
	}

	function marcarDecurso(chave) {
		try {
			sessionStorage.setItem(chave, String(Date.now()));
		} catch (err) {
			// sem sessionStorage
		}
	}

	// -------------------------------------------------------------------
	// "Analisar" dos cumprimentos (listas Demais Cumprimentos e Mandados):
	// tela de Pré-Análise (preAnalise.do: Tipo do Arquivo, Modelo, "Digitar
	// Texto", "Salvar e Concluir") e, depois, a tela do cumprimento
	// (cumprimentoCartorio.do ou cumprimentoCartorioMandado.do: "Assinar e
	// Expedir" / "Postergar Assinatura"). Só fluxos iniciados pelo card ⭐ da
	// lista (job.preanalise).
	// -------------------------------------------------------------------

	// A Pré-Análise de Expedir Intimações/Citação não tem "Tipo do Arquivo"
	// (só o Modelo).
	function isPreAnaliseScreen() {
		const form = document.getElementById("preAnaliseForm");
		return !!form && (!!document.getElementById("codTipoArquivo") || !!document.getElementById("codModelo")) && !!form.querySelector("#digitarButton");
	}

	// Botão "Postergar Assinatura" (qual = "postergar") ou "Assinar e
	// Expedir" (qual = "assinar"): pelo id e, se a tela usar outro, pelo
	// texto do botão.
	function botaoCumprimento(form, qual) {
		const porId = form.querySelector(qual === "postergar" ? "#postergarButton" : "#assinarButton");
		if (porId) return porId;
		const re = qual === "postergar" ? /^postergar assinatura$/i : /^assinar e expedir$/i;
		return Array.prototype.find.call(form.querySelectorAll('input[type="button"], input[type="submit"], button'), function (b) {
			return re.test(String(b.value || b.textContent || "").replace(/\s+/g, " ").trim());
		}) || null;
	}

	// Formulário da tela do cumprimento (Demais Cumprimentos ou Mandados).
	// A lista de mandados usa o mesmo id de formulário, mas não tem esses
	// botões, então não é confundida com a tela do cumprimento.
	function formCumprimento() {
		for (const id of ["cumprimentoCartorioForm", "cumprimentoCartorioMandadoForm", "expedirIntimacaoForm", "expedirCitacaoForm"]) {
			const form = document.getElementById(id);
			if (form && (botaoCumprimento(form, "postergar") || botaoCumprimento(form, "assinar"))) return form;
		}
		// Outra tela de expedição com os dois botões ("Assinar e Expedir" e
		// "Postergar Assinatura").
		return Array.prototype.find.call(document.forms, function (f) {
			return !!f.querySelector("#postergarButton") && !!f.querySelector("#assinarButton");
		}) || null;
	}

	function isCumprimentoScreen() {
		return !!formCumprimento();
	}

	// Campo "Descrição" da Pré-Análise (Expedir Intimações/Citação:
	// name="descricao", sem id).
	function campoDescricaoPreAnalise() {
		const form = document.getElementById("preAnaliseForm");
		const campo = form && form.querySelector('input[name="descricao"]');
		return campo && !campo.readOnly && !campo.disabled ? campo : null;
	}

	function lerPreAnalise() {
		const tipo = selectedOption(document.getElementById("codTipoArquivo"));
		const modelo = document.getElementById("codModelo");
		const descricao = campoDescricaoPreAnalise();
		return {
			descricao: descricao ? cleanText(descricao.value) : "",
			tipoArquivo: tipo && tipo.value !== "0" ? tipo : null,
			modelo: modelo && !modelo.disabled ? selectedOption(modelo) : null,
			semTipoArquivo: !document.getElementById("codTipoArquivo"),
		};
	}

	let preAnaliseActed = false;
	let preAnaliseBusy = false;

	async function tickPreAnalise(job) {
		if (preAnaliseBusy) return;
		const form = document.getElementById("preAnaliseForm");
		const digitar = form.querySelector("#digitarButton");
		const salvarConcluir = form.querySelector("#finishButton");
		if (digitar && !digitar.__pdpJdWatch) {
			digitar.__pdpJdWatch = true;
			digitar.addEventListener("click", function () {
				const lido = lerPreAnalise();
				if (lido.tipoArquivo || lido.semTipoArquivo) record(lido);
				advance(["upload"], "digitar");
			}, true);
		}
		if (salvarConcluir && !salvarConcluir.__pdpJdWatch) {
			salvarConcluir.__pdpJdWatch = true;
			salvarConcluir.addEventListener("click", function () {
				advance(["upload", "digitar", "incluir"], "concluir");
			}, true);
		}

		if (job.stage === "upload" && !preAnaliseActed) {
			preAnaliseActed = true;
			if (job.mode === "capture") {
				showStatusOnce("capture-preanalise", modeLabel(job) + " (Pré-Análise): escolha " + (document.getElementById("codTipoArquivo") ? "o Tipo do Arquivo (e o Modelo)" : "o Modelo") + ' e clique em "Digitar Texto".', "rec");
				return;
			}
			preAnaliseBusy = true;
			try {
				const pref = job.pref;
				// "Digitar Texto" vale para o envio por texto (tipoUpload 1).
				const porTexto = form.querySelector('input[name="tipoUpload"][value="1"]');
				if (porTexto && !porTexto.checked) porTexto.click();
				const tipoSel = document.getElementById("codTipoArquivo");
				if (pref.tipoArquivo) {
					showStatus(modeLabel(job) + ': escolhendo o Tipo do Arquivo "' + pref.tipoArquivo.text + '"…', job.mode === "edit" ? "rec" : null);
					if (!chooseOption(tipoSel, pref.tipoArquivo)) {
						showStatus('O Tipo do Arquivo "' + pref.tipoArquivo.text + '" não está disponível aqui. Escolha-o e clique em "Digitar Texto" — a extensão continua daí.', "warn");
						return;
					}
				} else if (tipoSel) {
					// Preferência gravada numa tela sem "Tipo do Arquivo".
					showStatus('Esta preferência não tem Tipo do Arquivo gravado. Escolha-o e clique em "Digitar Texto" — a extensão continua daí.', "warn");
					return;
				}
				const modelo = document.getElementById("codModelo");
				if (modelo && pref.modelo && pref.modelo.text) {
					const ok = await waitFor(function () {
						return !modelo.disabled && chooseOption(modelo, pref.modelo);
					});
					if (!ok) {
						showStatus('O Modelo "' + pref.modelo.text + '" não apareceu. Escolha-o e clique em "Digitar Texto" — a extensão continua daí.', "warn");
						return;
					}
				}
				// Descrição depois do Modelo (que pode mexer nela).
				const descricao = campoDescricaoPreAnalise();
				if (descricao && pref.descricao) {
					descricao.value = pref.descricao;
					fire(descricao, "input");
					fire(descricao, "change");
				}
				await sleep(300);
				if (job.mode === "edit") {
					showStatus(modeLabel(job) + ': campos preenchidos. Ajuste se quiser e clique em "Digitar Texto".', "rec");
					return;
				}
				if (!digitar) {
					showStatus('Não encontrei o botão "Digitar Texto". Clique nele — a extensão continua daí.', "warn");
					return;
				}
				showStatus(modeLabel(job) + ': abrindo "Digitar Documento"…');
				digitar.click();
			} finally {
				preAnaliseBusy = false;
			}
			return;
		}

		// De volta, com o documento incluído: "Salvar e Concluir".
		if (job.stage === "incluir" && !preAnaliseActed) {
			preAnaliseActed = true;
			if (job.mode !== "apply") {
				if (salvarConcluir) salvarConcluir.classList.add("pdp-jd-highlight");
				showStatus(modeLabel(job) + ': confira e clique em "Salvar e Concluir". Na tela seguinte, a preferência é salva quando você clicar em "Assinar e Expedir" ou "Postergar Assinatura".', "rec");
				return;
			}
			if (!salvarConcluir) {
				showStatus('Documento incluído. Clique em "Salvar e Concluir" — a extensão continua daí.', "warn");
				return;
			}
			showStatus(modeLabel(job) + ': clicando em "Salvar e Concluir"…');
			setTimeout(function () { salvarConcluir.click(); }, 400);
		}
	}

	// Nomes dos movimentos cujos documentos a preferência anexa ao
	// cumprimento ("Documento(s) do Processo/Recurso" → "Adicionar").
	function movimentosDaGravacao(job) {
		const rec = job.rec || {};
		if (Array.isArray(rec.docMovimentos)) return rec.docMovimentos;
		return job.mode === "edit" && job.pref && Array.isArray(job.pref.docMovimentos) ? job.pref.docMovimentos : [];
	}

	function salvarGravacaoPreAnalise(job, postergar) {
		const rec = job.rec || {};
		if (!rec.tipoArquivo && !rec.semTipoArquivo) {
			alert('A preferência não foi salva: não consegui gravar o Tipo do Arquivo (grava ao clicar em "Digitar Texto").');
			return false;
		}
		if (!confirmarSemTexto(rec)) return false;
		const name = prompt(
			job.mode === "edit" ? 'Atualizar a preferência de "Analisar" (cumprimentos). Nome:' : 'Nome para esta preferência de "Analisar" (cumprimentos):',
			job.mode === "edit" ? job.pref.name : ""
		);
		if (!name || !name.trim()) return false;
		const pref = {
			id: job.mode === "edit" ? job.pref.id : "pa-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
			name: name.trim(),
			tipoArquivo: rec.tipoArquivo,
			descricao: rec.descricao || "",
			modelo: rec.modelo || null,
			conteudo: rec.conteudo || "",
			ancora: rec.ancora || null,
			ancoraIndice: typeof rec.ancoraIndice === "number" ? rec.ancoraIndice : null,
			totalBlocos: typeof rec.totalBlocos === "number" ? rec.totalBlocos : null,
			edicao: rec.edicao || null,
			postergar: !!postergar,
			docMovimentos: movimentosDaGravacao(job),
			camposFinais: rec.camposFinais || null,
			tela: (job.mode === "edit" && job.pref && job.pref.tela) || job.tela || null,
		};
		persistPref(pref, PREANALISE_PREFS_KEY).catch(function (err) {
			alert("Não foi possível salvar a preferência: " + err.message);
		});
		return pref;
	}

	// Gravando, na tela do cumprimento: a preferência é salva no clique do
	// próprio usuário em "Assinar e Expedir" ou "Postergar Assinatura" (o
	// botão escolhido fica gravado). O nome é pedido nesse clique (prompt,
	// síncrono) e, salvo, o clique segue para o Projudi; persistPref guarda
	// a preferência também no sessionStorage, então a troca de página não a
	// perde. Sem nome, o clique é segurado e a gravação continua.
	function armarGravacaoCumprimento(job) {
		if (document.__pdpJdGravacaoCumprimento) return;
		document.__pdpJdGravacaoCumprimento = true;
		document.addEventListener("click", function (ev) {
			const form = formCumprimento();
			if (!form) return;
			const postergarBtn = botaoCumprimento(form, "postergar");
			const assinarBtn = botaoCumprimento(form, "assinar");
			const alvo = ev.target;
			if (!alvo || (alvo !== postergarBtn && alvo !== assinarBtn)) return;
			const atual = readJob();
			if (!atual || !atual.preanalise || (atual.mode !== "capture" && atual.mode !== "edit")) return;
			atual.rec = atual.rec || {};
			atual.rec.camposFinais = lerCamposFinais(form);
			const saved = salvarGravacaoPreAnalise(atual, alvo === postergarBtn);
			if (!saved) {
				ev.preventDefault();
				ev.stopImmediatePropagation();
				showStatus('A preferência não foi salva. Clique de novo em "Assinar e Expedir" ou "Postergar Assinatura" para dar o nome — ou em "Parar" para sair da gravação.', "warn");
				return;
			}
			clearJob(true);
			showStatus('Preferência "' + saved.name + '" ' + (atual.mode === "edit" ? "atualizada" : "salva") + ".", "ok");
		}, true);
		const movs = movimentosDaGravacao(job);
		showStatus(modeLabel(job) + ": " + (botaoAdicionarDocumentos() ? 'se precisar anexar documentos do processo, clique em "Adicionar" (Documento(s) do Processo/Recurso) e marque ☆ padrão ao lado do movimento. Depois clique' : "clique") +
			' em "Assinar e Expedir" ou "Postergar Assinatura": a preferência é gravada nesse clique (e o botão escolhido fica gravado).' +
			(movs.length ? " Movimento(s) padrão: " + movs.join("; ") + "." : ""), "rec");
	}

	// Campos da tela final gravados na preferência (Expedir Intimações/
	// Citação: tipo e número do Prazo e "Usar Anexos"). Lista fechada, para
	// não gravar dados do processo (endereços etc.).
	const CAMPOS_FINAIS = ["tipoPrazo", "prazo", "utilizarContraFe"];

	function lerCamposFinais(form) {
		const campos = {};
		CAMPOS_FINAIS.forEach(function (nome) {
			const el = form.querySelector('[name="' + nome + '"]');
			if (!el || el.disabled || el.type === "hidden") return;
			if (el.type === "checkbox" || el.type === "radio") campos[nome] = !!el.checked;
			else campos[nome] = el.value;
		});
		return campos;
	}

	// Preenche na ordem da lista (o tipo do prazo antes do número, que pode
	// depender dele). Devolve quantos campos foram preenchidos.
	function preencherCamposFinais(form, campos) {
		if (!form || !campos) return 0;
		let n = 0;
		CAMPOS_FINAIS.forEach(function (nome) {
			if (!(nome in campos)) return;
			const el = form.querySelector('[name="' + nome + '"]');
			if (!el || el.disabled || el.readOnly) return;
			if (el.type === "checkbox" || el.type === "radio") {
				if (el.checked !== !!campos[nome]) el.click();
			} else if (el.tagName === "SELECT") {
				if (!Array.prototype.some.call(el.options, function (o) { return o.value === campos[nome]; })) return;
				el.value = campos[nome];
				fire(el, "change");
			} else {
				el.value = campos[nome];
				fire(el, "input");
				fire(el, "change");
			}
			n++;
		});
		return n;
	}

	// Botão "Adicionar" da lista "Documento(s) do Processo/Recurso".
	function botaoAdicionarDocumentos() {
		const porId = document.getElementById("editButton");
		if (porId && norm(buttonText(porId)) === norm("Adicionar")) return porId;
		return findButton(document, "Adicionar");
	}

	// Tela do cumprimento, de volta depois do "Salvar e Concluir" da
	// Pré-Análise. Gravando: espera o clique do usuário em "Assinar e
	// Expedir" ou "Postergar Assinatura" (armarGravacaoCumprimento).
	// Aplicando: se a preferência tiver movimentos padrão, abre o
	// "Adicionar" dos documentos do processo e espera a janela de seleção
	// (tickSelecaoDocumentos) marcar e anexar os documentos; depois clica em
	// "Postergar Assinatura" se a preferência mandar, ou destaca "Assinar e
	// Expedir" para o usuário.
	const DOCS_TIMEOUT_MS = 60000;
	let cumprimentoActed = false;
	function tickCumprimento(job) {
		if (job.stage !== "concluir" || cumprimentoActed) return;
		if (job.mode === "capture" || job.mode === "edit") {
			armarGravacaoCumprimento(job);
			return;
		}
		const movs = (job.pref && Array.isArray(job.pref.docMovimentos)) ? job.pref.docMovimentos : [];
		if (movs.length && !job.docs) {
			const adicionar = botaoAdicionarDocumentos();
			if (adicionar && !adicionar.disabled) {
				updateJob(function (current) { current.docs = { status: "abrindo", at: Date.now() }; });
				showStatus('Anexando os documentos do movimento "' + movs.join('" / "') + '": abrindo "Adicionar"…');
				setTimeout(function () { adicionar.click(); }, 400);
				return;
			}
			updateJob(function (current) { current.docs = { status: "sem-botao" }; });
			job = readJob() || job;
		}
		if (job.docs && job.docs.status === "abrindo") {
			if (Date.now() - job.docs.at < DOCS_TIMEOUT_MS) return;
			updateJob(function (current) { current.docs.status = "tempo"; });
			job = readJob() || job;
		}
		cumprimentoActed = true;
		const docs = job.docs || null;
		let avisoDocs = "";
		if (docs) {
			if (docs.status === "ok") avisoDocs = docs.n + " documento(s) anexado(s). ";
			else if (docs.status === "nenhum") avisoDocs = 'Nenhum documento anexado: não encontrei o movimento "' + movs.join('" / "') + '" com documentos. ';
			else avisoDocs = "Não consegui anexar os documentos do movimento padrão; confira em Documento(s) do Processo/Recurso. ";
		}
		const form = formCumprimento();
		const postergarBtn = botaoCumprimento(form, "postergar");
		const assinarBtn = botaoCumprimento(form, "assinar");
		const postergar = !!(job.pref && job.pref.postergar);
		if (job.pref && job.pref.camposFinais && preencherCamposFinais(form, job.pref.camposFinais)) {
			avisoDocs += "Prazo/campos da preferência preenchidos. ";
		}
		clearJob(true);
		// Documentos não anexados: não posterga sozinha - o usuário confere.
		const docsOk = !docs || docs.status === "ok";
		if (postergar && docsOk && postergarBtn && !postergarBtn.disabled) {
			marcarDecurso(DECURSO_CONCLUIDA_KEY);
			showStatus(avisoDocs + 'Clicando em "Postergar Assinatura"…', "ok");
			setTimeout(function () { postergarBtn.click(); }, 500);
			return;
		}
		marcarDecurso(DECURSO_AGUARDANDO_KEY);
		if (postergar && postergarBtn) postergarBtn.classList.add("pdp-jd-highlight");
		else if (assinarBtn) assinarBtn.classList.add("pdp-jd-highlight");
		showStatus(avisoDocs + (postergar
			? (docsOk ? 'Não encontrei o botão "Postergar Assinatura" habilitado. Conclua manualmente.' : 'Confira os documentos e clique em "Postergar Assinatura".')
			: 'Pré-análise concluída. Clique em "Assinar e Expedir" para assinar.'), postergar || !docsOk ? "warn" : "ok");
	}

	// -------------------------------------------------------------------
	// Janela "Seleção de Documentos" (botão "Adicionar" de "Documento(s) do
	// Processo/Recurso" no cumprimento: cumprimentoCartorioMandado.do,
	// formulário que envia para salvarDocumentosProcesso, com uma linha por
	// movimento - data e nome em negrito - seguida da linha "rowN" com as
	// caixinhas dos arquivos dele, "movimentacoesArquivos").
	// -------------------------------------------------------------------

	// Dois formatos da janela: o dos mandados (salvarDocumentosProcesso,
	// caixinhas "movimentacoesArquivos", botão #selectButton) e o de Demais
	// Cumprimentos (título "Seleção de Documentos", colunas Seq./Data/
	// Evento/Movimentado por, caixinhas "arquivo", botão #confirmarButton).
	const CAIXAS_ARQUIVO = 'input[type="checkbox"][name="movimentacoesArquivos"], input[type="checkbox"][name="arquivo"]';

	function formSelecaoDocumentos() {
		return Array.prototype.find.call(document.forms, function (f) {
			if (/salvarDocumentosProcesso/i.test(f.getAttribute("action") || "") && f.querySelector('input[name="movimentacoesArquivos"], #selectButton')) return true;
			const titulo = f.querySelector("h3");
			return !!titulo && norm(titulo.textContent).toLowerCase() === "selecao de documentos" && !!f.querySelector("#confirmarButton, #selectButton") && !!f.querySelector("table.resultTable");
		}) || null;
	}

	function botoesSelecao(form) {
		return {
			selecionar: form.querySelector("#selectButton, #confirmarButton") || findButton(form, "Selecionar"),
			voltar: form.querySelector("#backButton, #cancelarButton") || findButton(form, "Voltar") || findButton(form, "Cancelar"),
		};
	}

	function isSelecaoDocumentosScreen() {
		return !!formSelecaoDocumentos();
	}

	function nomeMovimento(nome) {
		return norm(nome).toUpperCase();
	}

	// [{ nome, b, row, caixas }] na ordem da tela (a mais recente primeiro).
	// Linha do movimento: o nome em negrito numa das células; logo abaixo,
	// a linha "rowN" (mandados) ou "rowmovimentacoesN" (Demais
	// Cumprimentos) com as caixinhas dos arquivos dele.
	function movimentosSelecao(form) {
		const tabela = form.querySelector("table.resultTable");
		const tbody = tabela && tabela.tBodies[0];
		const lista = [];
		if (!tbody) return lista;
		let atual = null;
		Array.prototype.forEach.call(tbody.rows, function (row) {
			if (/^row(movimentacoes)?\d+$/.test(row.id)) {
				if (atual) atual.caixas = Array.prototype.slice.call(row.querySelectorAll(CAIXAS_ARQUIVO));
				return;
			}
			const b = row.querySelector(":scope > td > b");
			if (!b) return;
			atual = { nome: b.textContent.replace(/\s+/g, " ").trim(), b: b, row: row, caixas: [] };
			lista.push(atual);
		});
		return lista;
	}

	let selecaoActed = false;
	function tickSelecaoDocumentos(job) {
		if (job.stage !== "concluir" || selecaoActed) return;
		const form = formSelecaoDocumentos();
		const movimentos = movimentosSelecao(form);
		// A lista de movimentos pode chegar depois (carregada em segundo plano).
		if (!movimentos.length) return;
		if (job.mode === "capture" || job.mode === "edit") {
			selecaoActed = true;
			gravarSelecaoDocumentos(job, form, movimentos);
			return;
		}
		if (!job.docs || job.docs.status !== "abrindo") return;
		selecaoActed = true;
		const nomes = (job.pref && job.pref.docMovimentos) || [];
		let n = 0;
		const achados = [];
		nomes.forEach(function (nome) {
			// O mais recente com esse nome (a lista vem do mais novo ao mais antigo).
			const mov = movimentos.find(function (m) { return nomeMovimento(m.nome) === nomeMovimento(nome) && m.caixas.length; });
			if (!mov) return;
			achados.push(mov.nome);
			mov.caixas.forEach(function (c) {
				if (c.disabled) return;
				if (!c.checked) c.click();
				n++;
			});
		});
		const botoes = botoesSelecao(form);
		const selecionar = botoes.selecionar;
		const voltar = botoes.voltar;
		if (n && selecionar) {
			updateJob(function (current) { current.docs = { status: "ok", n: n, movimentos: achados }; });
			showStatus("Marcados " + n + " documento(s) do movimento " + achados.join(" / ") + '. Clicando em "Selecionar"…');
			setTimeout(function () { selecionar.click(); }, 500);
			return;
		}
		updateJob(function (current) { current.docs = { status: n ? "falha" : "nenhum" }; });
		showStatus(n ? 'Não encontrei o botão "Selecionar".' : "Movimento padrão não encontrado neste processo (ou sem documentos).", "warn");
		if (voltar) setTimeout(function () { voltar.click(); }, 800);
	}

	// Gravando: uma caixinha "☆ padrão" ao lado de cada movimento. Marcá-la
	// marca os documentos dele; no "Selecionar", os movimentos marcados vão
	// para a gravação (job.rec.docMovimentos).
	function gravarSelecaoDocumentos(job, form, movimentos) {
		const gravados = movimentosDaGravacao(job).map(nomeMovimento);
		const marcas = [];
		const jaMarcado = {};
		movimentos.forEach(function (mov) {
			if (!mov.b || mov.row.querySelector(".pdp-jd-mov-padrao")) return;
			const label = document.createElement("label");
			label.className = "pdp-jd-mov-padrao";
			label.title = "Movimento padrão desta preferência: ao usá-la, a extensão procura o movimento mais recente com este nome e anexa os documentos dele.";
			label.style.cssText = "margin-left:10px;font-weight:normal;white-space:nowrap;cursor:pointer;color:#7a5b00";
			const caixa = document.createElement("input");
			caixa.type = "checkbox";
			caixa.style.verticalAlign = "middle";
			label.appendChild(caixa);
			label.appendChild(document.createTextNode(" ☆ padrão" + (mov.caixas.length ? "" : " (sem documentos aqui)")));
			mov.b.insertAdjacentElement("afterend", label);
			marcas.push({ mov: mov, caixa: caixa });
			// Editando: já vem marcado o mais recente de cada movimento gravado.
			const chave = nomeMovimento(mov.nome);
			if (gravados.indexOf(chave) >= 0 && !jaMarcado[chave]) {
				jaMarcado[chave] = true;
				caixa.checked = true;
				mov.caixas.forEach(function (c) { if (!c.checked && !c.disabled) c.click(); });
			}
			caixa.addEventListener("change", function () {
				mov.caixas.forEach(function (c) { if (c.checked !== caixa.checked && !c.disabled) c.click(); });
			});
		});
		const selecionar = botoesSelecao(form).selecionar;
		if (selecionar) {
			selecionar.addEventListener("click", function () {
				const nomes = [];
				marcas.forEach(function (m) {
					if (m.caixa.checked && nomes.indexOf(m.mov.nome) < 0) nomes.push(m.mov.nome);
				});
				updateJob(function (current) {
					current.rec = current.rec || {};
					current.rec.docMovimentos = nomes;
				});
			}, true);
		}
		showStatus(modeLabel(job) + ': marque ☆ padrão ao lado do movimento cujos documentos devem ser anexados sempre (ex.: "Concedida a Medida Protetiva") e clique em "Selecionar". Documentos marcados sem ☆ são anexados só desta vez.', "rec");
	}

	// Tela "Analisar Decurso de Prazo": só fluxos iniciados pelo "Analisar
	// Decurso" da lista (job.decurso). Clica em "Adicionar"; com o arquivo
	// incluído, conclui pelo botão final - só se ele disser "Concluir" (sem
	// arquivo o Projudi o mostra como "Dispensar Arquivo"); senão, pede o
	// clique ao usuário.
	let decursoActed = false;
	function tickDecurso(job) {
		if (!job.decurso || juntarBusy) return;
		const form = document.getElementById("certificarForm");
		const adicionar = form.querySelector("#addButton");
		if (adicionar && !adicionar.__pdpJdWatch) {
			adicionar.__pdpJdWatch = true;
			adicionar.addEventListener("click", function () {
				advance(["juntar"], "upload");
			}, true);
		}
		if (job.numero) {
			const numero = numeroProcesso(document);
			if (numero && numero !== job.numero) {
				console.info(LOG, "análise de decurso de outro processo; fluxo encerrado.");
				clearJob();
				return;
			}
		}
		// A tela tem duas tabelas: a do documento relativo (Descrição /
		// Assinado Por / Arquivo...) e a dos arquivos incluídos na análise
		// (Nome / Descrição / Tamanho) - só esta conta.
		const tabela = Array.prototype.find.call(form.querySelectorAll("table.resultTable"), function (t) {
			return /tamanho/i.test((t.tHead || t).textContent || "");
		});
		const hasFiles = !!tabela && Array.prototype.some.call(tabela.querySelectorAll("tbody tr"), function (tr) {
			return tr.querySelectorAll("td").length >= 3 && !/nenhum registro encontrado/i.test(tr.textContent || "");
		});
		if (job.stage === "juntar" && !decursoActed) {
			decursoActed = true;
			if (job.mode === "capture") {
				showStatusOnce("capture-decurso", modeLabel(job) + ' (Analisar Decurso): clique em "Adicionar" e faça a inclusão como de costume — no "Assinar Arquivos" a extensão pede o nome e salva.', "rec");
				return;
			}
			showStatus(modeLabel(job) + ': abrindo "Inserir Arquivo"…', job.mode === "edit" ? "rec" : null);
			adicionar.click();
			return;
		}
		if (job.mode !== "apply") return;
		// Só conclui depois do "Confirmar Inclusão" (etapa "concluir").
		if (job.stage !== "concluir" || !hasFiles) {
			if (job.stage !== "juntar") showStatusOnce("decurso-wait", modeLabel(job) + ": continue na janela do Projudi (Inserir Arquivo / Digitar Documento / assinatura).", null);
			return;
		}
		{
			const concluir = form.querySelector("#concluirButton");
			const rotulo = concluir ? buttonText(concluir) : "";
			clearJob(true);
			if (concluir && norm(rotulo) === "CONCLUIR") {
				juntarBusy = true;
				showStatus('Documento incluído. Clicando em "Concluir"…', "ok");
				marcarDecurso(DECURSO_CONCLUIDA_KEY);
				concluir.click();
				juntarBusy = false;
				return;
			}
			marcarDecurso(DECURSO_AGUARDANDO_KEY);
			if (concluir) concluir.classList.add("pdp-jd-highlight");
			showStatus('Documento incluído e assinado. Confira e clique em "' + (rotulo || "Concluir") + '" para terminar a análise do decurso.', "warn");
		}
	}

	// -------------------------------------------------------------------
	// Janela "Inserir Arquivo" (upload.do, form#fileUploadForm com o
	// select codDescricao)
	// -------------------------------------------------------------------

	function isUploadScreen() {
		const form = document.getElementById("fileUploadForm");
		return !!form && !!document.getElementById("codDescricao") && /upload\.do/i.test(form.getAttribute("action") || "");
	}

	function selectedOption(select) {
		if (!select) return null;
		const option = select.options[select.selectedIndex];
		if (!option || option.value === "" || option.value === "-1") return null;
		return { value: option.value, text: cleanText(option.textContent) };
	}

	function chooseOption(select, saved) {
		if (!select || !saved) return false;
		const options = Array.prototype.slice.call(select.options);
		const option =
			options.filter(function (o) {
				return o.value === String(saved.value) && norm(o.textContent) === norm(saved.text);
			})[0] ||
			options.filter(function (o) {
				return norm(o.textContent) === norm(saved.text);
			})[0] ||
			options.filter(function (o) {
				return o.value === String(saved.value);
			})[0];
		if (!option) return false;
		if (select.value !== option.value) {
			select.value = option.value;
			fire(select, "input");
			fire(select, "change");
		}
		return true;
	}

	function lerUpload() {
		const tipo = selectedOption(document.getElementById("codDescricao"));
		const descricao = document.getElementById("descricao");
		const modelo = document.getElementById("codModelo");
		return {
			tipoArquivo: tipo && tipo.value !== "0" ? tipo : null,
			descricao: descricao && !descricao.readOnly && !descricao.disabled ? cleanText(descricao.value) : "",
			modelo: modelo && !modelo.disabled ? selectedOption(modelo) : null,
		};
	}

	let uploadActed = false;
	let uploadBusy = false;
	let assinarClicked = false;
	let confirmarClicked = false;

	// Coluna "Assinado" da lista de arquivos: true quando todas as linhas
	// estão assinadas ("Sim"); null se a coluna não existe.
	function todosAssinados(form) {
		const table = form && form.querySelector("table.resultTable");
		if (!table) return null;
		const headers = Array.prototype.slice.call(table.querySelectorAll("thead th"));
		const col = headers.findIndex(function (th) {
			return norm(th.textContent) === "ASSINADO";
		});
		if (col === -1) return null;
		return fileRows(form).every(function (tr) {
			const cell = tr.children[col];
			return !!cell && /^SIM\b/.test(norm(cell.textContent));
		});
	}

	// Depois do "Concluir" da pré-visualização, o Projudi volta ao
	// "Inserir Arquivo" com o arquivo "Assinado: Não" e o botão "Assinar
	// Arquivos" (no lugar do "Confirmar Inclusão"), que chama o assinador.
	function findAssinarButton() {
		return findButton(document, "Assinar Arquivos") || findButton(document, "Assinar Arquivo") || findButton(document, "Assinar");
	}

	function watchUploadScreen() {
		const digitar = findButton(document, "Digitar Texto");
		if (digitar && !digitar.__pdpJdWatch) {
			digitar.__pdpJdWatch = true;
			digitar.addEventListener(
				"click",
				function () {
					const lido = lerUpload();
					if (lido.tipoArquivo) record(lido);
					advance(["juntar", "upload"], "digitar");
				},
				true
			);
		}
		// Flags separadas por papel e texto conferido no clique: o Projudi
		// pode trocar o texto do mesmo botão ("Assinar Arquivos" ↔
		// "Confirmar Inclusão").
		const assinar = findAssinarButton();
		if (assinar && !assinar.__pdpJdAssinar) {
			assinar.__pdpJdAssinar = true;
			assinar.addEventListener(
				"click",
				function () {
					if (!/^ASSINAR/.test(norm(buttonText(assinar)))) return;
					const job = readJob();
					if (!job) return;
					if (job.mode === "capture" || job.mode === "edit") {
						// Fim da gravação: daqui em diante (assinar, "Confirmar
						// Inclusão", "Concluir Movimento") a preferência segue
						// sozinha quando aplicada.
						const saved = salvarGravacao(job);
						if (saved) {
							clearJob(true);
							showStatus(
								'Preferência "' + saved.name + '" ' + (job.mode === "edit" ? "atualizada" : "salva") + '. Assine no assinador e depois clique em "Confirmar Inclusão" e ' + (job.decurso ? "no botão final da análise." : 'em "Concluir Movimento".'),
								"ok"
							);
						}
						return;
					}
					advance(["upload", "digitar", "incluir"], "assinar");
				},
				true
			);
		}
		const confirmar = findButton(document, "Confirmar Inclusão");
		if (confirmar && !confirmar.__pdpJdConfirmar) {
			confirmar.__pdpJdConfirmar = true;
			confirmar.addEventListener(
				"click",
				function () {
					if (norm(buttonText(confirmar)) !== "CONFIRMAR INCLUSAO") return;
					advance(["upload", "digitar", "incluir", "assinar"], "concluir");
				},
				true
			);
		}
		return { digitar: digitar, assinar: assinar, confirmar: confirmar };
	}

	async function tickUpload(job) {
		if (uploadBusy) return;
		const form = document.getElementById("fileUploadForm");
		const buttons = watchUploadScreen();

		if (job.stage === "upload" && !uploadActed) {
			uploadActed = true;
			if (job.mode === "capture") {
				showStatusOnce("capture-upload", modeLabel(job) + ': escolha o Tipo do Arquivo (e o Modelo, se quiser) e clique em "Digitar Texto".', "rec");
				return;
			}
			uploadBusy = true;
			try {
				const ok = await preencherUpload(job);
				if (job.mode === "edit") {
					showStatus(modeLabel(job) + ": " + (ok ? "campos preenchidos. Ajuste se quiser e" : "confira os campos e") + ' clique em "Digitar Texto".', "rec");
					return;
				}
				if (!ok) return; // preencherUpload já avisou
				if (!buttons.digitar) {
					showStatus('Não encontrei o botão "Digitar Texto". Clique nele manualmente — a extensão continua daí.', "warn");
					return;
				}
				showStatus(modeLabel(job) + ': abrindo "Digitar Documento"…');
				buttons.digitar.click();
			} finally {
				uploadBusy = false;
			}
			return;
		}

		if (["digitar", "incluir", "assinar"].indexOf(job.stage) === -1 || !fileRows(form).length) return;
		const assinados = todosAssinados(form);

		// Arquivo ainda sem assinatura: "Assinar Arquivos" chama o assinador.
		if (assinados === false || (assinados === null && buttons.assinar && !buttons.confirmar)) {
			if (job.mode !== "apply") {
				if (buttons.assinar) buttons.assinar.classList.add("pdp-jd-highlight");
				showStatusOnce(
					"rec-assinar",
					modeLabel(job) + ': clique em "Assinar Arquivos" — a preferência é ' + (job.mode === "edit" ? "atualizada" : "salva") + " nesse momento e o assinador é chamado.",
					"rec"
				);
				return;
			}
			if (!buttons.assinar) {
				showStatusOnce("apply-assinar-missing", 'Texto incluído. Assine o arquivo (não encontrei o botão "Assinar Arquivos") — a extensão continua depois.', "warn");
				return;
			}
			if (assinarClicked || job.stage === "assinar") {
				showStatusOnce("apply-assinando", job.decurso
					? 'Assine no assinador. Depois da assinatura a extensão clica em "Confirmar Inclusão" e volta à análise do decurso.'
					: 'Assine no assinador. Depois da assinatura a extensão clica em "Confirmar Inclusão" e em "Concluir Movimento".', "ok");
				return;
			}
			assinarClicked = true;
			showStatus(modeLabel(job) + ': clicando em "Assinar Arquivos" (o assinador será chamado)…', "ok");
			buttons.assinar.click();
			return;
		}

		// Assinado: "Confirmar Inclusão".
		if (job.mode !== "apply" || confirmarClicked) return;
		if (!buttons.confirmar) {
			showStatusOnce("apply-confirmar-missing", 'Arquivo assinado. Clique em "Confirmar Inclusão" — a extensão continua daí.', "warn");
			return;
		}
		confirmarClicked = true;
		showStatus(modeLabel(job) + ': arquivo assinado. Clicando em "Confirmar Inclusão"…');
		buttons.confirmar.click();
	}

	// -------------------------------------------------------------------
	// Pré-visualização "Documento" (depois do "Continuar" do editor): PDF
	// com os botões "Concluir" e "Alterar" - ou, na Pré-Análise de
	// mandados (preAnalise.do?actionType=visualizar), "Salvar" e "Voltar".
	// -------------------------------------------------------------------

	// { concluir, alterar, rotulo, voltar } da pré-visualização, ou null
	// fora dela.
	function botoesPreview() {
		if (editorTextarea()) return null;
		const concluir = findButton(document, "Concluir");
		const alterar = findButton(document, "Alterar");
		if (concluir && alterar) return { concluir: concluir, alterar: alterar, rotulo: "Concluir", voltar: "Alterar" };
		if (/\/preAnalise\.do$/.test(location.pathname)) {
			const salvar = findButton(document, "Salvar");
			const voltar = findButton(document, "Voltar");
			if (salvar && voltar) return { concluir: salvar, alterar: voltar, rotulo: "Salvar", voltar: "Voltar" };
		}
		return null;
	}

	function isPreviewScreen() {
		return !!botoesPreview();
	}

	let previewActed = false;

	function tickPreview(job) {
		const botoes = botoesPreview();
		const concluir = botoes.concluir;
		const alterar = botoes.alterar;
		if (!concluir.__pdpJdWatch) {
			concluir.__pdpJdWatch = true;
			concluir.addEventListener(
				"click",
				function () {
					advance(["upload", "digitar"], "incluir");
				},
				true
			);
		}
		if (!alterar.__pdpJdWatch) {
			alterar.__pdpJdWatch = true;
			alterar.addEventListener(
				"click",
				function () {
					updateJob(function (current) {
						current.stage = "digitar";
						current.reentry = true;
					});
				},
				true
			);
		}
		if (["digitar", "incluir"].indexOf(job.stage) === -1 || previewActed) return;
		previewActed = true;
		if (job.mode !== "apply") {
			showStatus(modeLabel(job) + ': confira o documento e clique em "' + botoes.rotulo + '" (ou em "' + botoes.voltar + '" para voltar ao texto).', "rec");
			return;
		}
		showStatus(modeLabel(job) + ': clicando em "' + botoes.rotulo + '" na pré-visualização…');
		setTimeout(function () {
			concluir.click();
		}, 400);
	}

	async function preencherUpload(job) {
		const pref = job.pref;
		const tipo = document.getElementById("codDescricao");
		const modelo = document.getElementById("codModelo");

		showStatus(modeLabel(job) + ': escolhendo o Tipo do Arquivo "' + pref.tipoArquivo.text + '"…', job.mode === "edit" ? "rec" : null);
		if (!chooseOption(tipo, pref.tipoArquivo)) {
			showStatus('O Tipo do Arquivo "' + pref.tipoArquivo.text + '" não está disponível aqui. Escolha-o manualmente e clique em "Digitar Texto" — a extensão continua daí.', "warn");
			return false;
		}

		// Descrição ("Outros"): o Projudi só libera o campo para esse tipo.
		const descricao = document.getElementById("descricao");
		if (pref.descricao && descricao) {
			await waitFor(function () {
				return !descricao.readOnly && !descricao.disabled;
			}, 2000);
			if (!descricao.readOnly && !descricao.disabled) {
				descricao.value = pref.descricao;
				fire(descricao, "input");
				fire(descricao, "change");
			}
		}

		// Modelo: carregado pelo Projudi depois da escolha do tipo.
		if (modelo) {
			if (pref.modelo && pref.modelo.text) {
				const ok = await waitFor(function () {
					return !modelo.disabled && chooseOption(modelo, pref.modelo);
				});
				if (!ok) {
					showStatus('O Modelo "' + pref.modelo.text + '" não apareceu para este Tipo do Arquivo. Escolha o modelo manualmente e clique em "Digitar Texto" — a extensão continua daí.', "warn");
					return false;
				}
			} else {
				// Dá tempo de o Projudi recarregar a lista de modelos antes de
				// seguir com o modelo padrão.
				await waitFor(function () {
					return !modelo.disabled;
				}, 2500);
			}
			await sleep(300);
		}
		return true;
	}

	// -------------------------------------------------------------------
	// "Digitar Documento" (digitarTexto.do, CKEditor sobre o textarea
	// conteudoEditor)
	// -------------------------------------------------------------------

	// Caixa de texto do editor (CKEditor): "conteudoEditor" no Digitar
	// Documento de sempre; em outras telas (ex.: a Pré-Análise de mandados,
	// preAnalise.do?actionType=visualizar), a primeira caixa de texto que
	// tenha um CKEditor ligado a ela (div "cke_" + id).
	function editorTextarea() {
		const padrao = document.getElementById("conteudoEditor");
		if (padrao) return padrao;
		return Array.prototype.find.call(document.querySelectorAll("textarea[id]"), function (t) {
			return !!document.getElementById("cke_" + t.id);
		}) || null;
	}

	// Formulário da tela "Digitar Documento": o da janela "Inserir Arquivo"
	// (fileUploadForm) ou, vindo da Pré-Análise dos cumprimentos, qualquer
	// formulário que envie para digitarTexto.do - ou, se nenhum enviar (a
	// Pré-Análise de mandados usa preAnalise.do), o formulário do editor.
	function formDigitar() {
		const form = document.getElementById("fileUploadForm");
		if (form && /digitarTexto\.do/i.test(form.getAttribute("action") || "")) return form;
		const porAcao = Array.prototype.find.call(document.forms, function (f) {
			return /digitarTexto\.do/i.test(f.getAttribute("action") || "");
		});
		if (porAcao) return porAcao;
		const caixa = editorTextarea();
		return (caixa && caixa.form) || null;
	}

	function isDigitarScreen() {
		return !!editorTextarea() && !!formDigitar();
	}

	function editorBody() {
		const caixa = editorTextarea();
		const id = caixa ? caixa.id : "conteudoEditor";
		const frame = document.querySelector("#cke_" + id + " iframe.cke_wysiwyg_frame, #cke_" + id + " iframe");
		try {
			const doc = frame && frame.contentDocument;
			if (doc && doc.body && doc.body.isContentEditable && doc.body.childNodes.length) return doc.body;
		} catch (err) {
			return null;
		}
		return null;
	}

	function nodeKey(node) {
		if (node.nodeType === 1) return node.outerHTML;
		if (node.nodeType === 3) return "#text:" + node.nodeValue;
		return null;
	}

	// Container dos blocos (parágrafos) do documento. Documentos gerados por
	// Modelo (ex.: mandados) vêm embrulhados num único <div> - às vezes em
	// dois -, e comparar só o primeiro nível tomaria o documento inteiro
	// como "texto digitado". Desce enquanto houver um único bloco embrulho.
	function blocosRaiz(body) {
		let c = body;
		for (let i = 0; i < 12; i++) {
			const kids = Array.prototype.filter.call(c.childNodes, function (n) {
				if (n.nodeType === 3) return !!cleanText(n.nodeValue);
				return n.nodeType === 1 && !/^(STYLE|SCRIPT|BR)$/.test(n.tagName);
			});
			if (kids.length !== 1 || kids[0].nodeType !== 1) break;
			const k = kids[0];
			if (!/^(DIV|SPAN|SECTION|ARTICLE|FONT|CENTER|BLOCKQUOTE)$/.test(k.tagName) || !k.children.length) break;
			c = k;
		}
		return c;
	}

	// Blocos do corpo quando o editor abriu (antes de qualquer alteração).
	function snapshotEditor(body) {
		return Array.prototype.slice.call(blocosRaiz(body).childNodes).map(nodeKey).filter(Boolean);
	}

	// Só o que o usuário acrescentou/alterou: blocos do corpo que não
	// existiam na abertura, ignorando os vazios.
	//
	// `ancora`: texto do bloco inalterado imediatamente anterior ao
	// primeiro bloco novo — onde inserir o conteúdo quando o documento não
	// tem o marcador "INSIRA O TEXTO AQUI" (ex.: documento gerado por um
	// Modelo).
	//
	// `ancoraIndice`/`totalBlocos`: posição do primeiro bloco novo (quantos
	// blocos inalterados vêm antes) e total de blocos na abertura - para
	// inserir pela posição quando a âncora tem dados do processo (nome,
	// data) e não se repete noutro documento do mesmo Modelo.
	function conteudoDigitado(body, snapshot) {
		const remaining = snapshot.slice();
		const parts = [];
		let lastKeptText = null;
		let ancora = null;
		let mantidos = 0;
		let ancoraIndice = null;
		let textoNovo = 0;
		const raiz = blocosRaiz(body);
		Array.prototype.slice.call(raiz.childNodes).forEach(function (node) {
			const key = nodeKey(node);
			if (!key) return;
			const idx = remaining.indexOf(key);
			if (idx !== -1) {
				remaining.splice(idx, 1);
				mantidos++;
				if (cleanText(node.textContent)) lastKeptText = cleanText(node.textContent);
				return;
			}
			if (!cleanText(node.textContent) && !(node.querySelector && node.querySelector("img, table"))) return;
			let html = node.nodeType === 1 ? node.outerHTML : node.nodeValue;
			// Bloco que ainda tem o marcador "XXXXXXXXXX INSIRA O TEXTO AQUI
			// XXXXXXXXXX": se o usuário digitou ao lado dele (sem apagá-lo),
			// grava o que foi digitado e tira só o marcador.
			if (PLACEHOLDER_RE.test(node.textContent || "")) {
				const restante = cleanText((node.textContent || "").replace(PLACEHOLDER_RE, ""));
				if (!restante) return;
				if (node.nodeType === 1) {
					const copia = node.cloneNode(true);
					const walker = document.createTreeWalker(copia, NodeFilter.SHOW_TEXT);
					let t;
					while ((t = walker.nextNode())) t.nodeValue = t.nodeValue.replace(/X{5,}\s*INSIRA O TEXTO AQUI\s*X{5,}/gi, "");
					// Marcador partido em vários pedaços de texto: usa só o texto.
					html = PLACEHOLDER_RE.test(copia.textContent || "") ? "<p>" + restante.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</p>" : copia.outerHTML;
				} else {
					html = restante;
				}
			}
			if (!parts.length) {
				ancora = lastKeptText;
				ancoraIndice = mantidos;
			}
			textoNovo += cleanText(node.textContent || "").length;
			parts.push(html);
		});
		const textoTotal = cleanText(raiz.textContent || "").length;
		return {
			conteudo: parts.join(""),
			ancora: ancora,
			ancoraIndice: ancoraIndice,
			totalBlocos: snapshot.length,
			// Quase o documento inteiro "digitado": provavelmente não é o
			// texto da preferência (e traz dados deste processo).
			conteudoInteiro: textoTotal > 400 && textoNovo > textoTotal * 0.6,
		};
	}

	// -------------------------------------------------------------------
	// Edição do texto do Modelo. Em vez de só acrescentar um trecho, o
	// usuário pode editar o documento que o Projudi gerou pelo Modelo
	// (apagar trechos, mudar a formatação, alterar parágrafos). A gravação
	// guarda essa edição parágrafo a parágrafo, comparando com o documento
	// como ele abriu: "keep" (parágrafo igual - no uso fica o do documento
	// novo, com os dados do processo novo), "mod" (parágrafo alterado: a
	// versão do usuário, com os dados variáveis trocados pelos do processo
	// novo) e "new" (parágrafo acrescentado). Parágrafos apagados
	// simplesmente não aparecem. No uso, os parágrafos dos dois documentos
	// são casados pela posição (mesmo Modelo, mesmo número de parágrafos)
	// ou pela semelhança do começo do texto.
	// -------------------------------------------------------------------

	function textoDaChave(key) {
		if (key.indexOf("#text:") === 0) return cleanText(key.slice(6));
		try {
			return cleanText(new DOMParser().parseFromString(key, "text/html").body.textContent);
		} catch (err) {
			return "";
		}
	}

	function palavras(texto) {
		return texto ? texto.split(" ") : [];
	}

	// Pares [i, j] da maior subsequência comum entre `a` e `b`.
	function lcsPares(a, b, igual) {
		const n = a.length;
		const m = b.length;
		const t = [];
		for (let i = 0; i <= n; i++) t.push(new Array(m + 1).fill(0));
		for (let i = n - 1; i >= 0; i--) {
			for (let j = m - 1; j >= 0; j--) {
				t[i][j] = igual(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
			}
		}
		const pares = [];
		let i = 0;
		let j = 0;
		while (i < n && j < m) {
			if (igual(a[i], b[j])) {
				pares.push([i, j]);
				i++;
				j++;
			} else if (t[i + 1][j] >= t[i][j + 1]) i++;
			else j++;
		}
		return pares;
	}

	function semelhanca(a, b) {
		const pa = palavras(a.toLowerCase());
		const pb = palavras(b.toLowerCase());
		if (!pa.length && !pb.length) return 1;
		if (!pa.length || !pb.length) return 0;
		return (2 * lcsPares(pa, pb, function (x, y) { return x === y; }).length) / (pa.length + pb.length);
	}

	// Começo do parágrafo, sem números, para casar parágrafos de documentos
	// do mesmo Modelo quando o número de parágrafos muda.
	function assinatura(texto) {
		return palavras(texto.toLowerCase().replace(/\d/g, "#")).slice(0, 8).join(" ");
	}

	function blocosDoEditor(body) {
		return Array.prototype.slice.call(blocosRaiz(body).childNodes).filter(function (node) { return !!nodeKey(node); });
	}

	function blocoVisivel(node) {
		return !!cleanText(node.textContent || "") || !!(node.querySelector && node.querySelector("img, table, hr"));
	}

	// Gravação: a edição do documento em relação a `snapshot` (blocos na
	// abertura do editor).
	function gerarEdicao(body, snapshot) {
		const finais = blocosDoEditor(body);
		const chavesFinais = finais.map(nodeKey);
		const pares = lcsPares(snapshot, chavesFinais, function (x, y) { return x === y; });
		pares.push([snapshot.length, chavesFinais.length]);
		const itens = [];
		const usados = {};
		let i = 0;
		let j = 0;
		pares.forEach(function (par) {
			// Trecho alterado entre dois parágrafos iguais: cada parágrafo
			// final é casado com o original mais parecido do trecho (em
			// ordem); sem nenhum parecido, é parágrafo novo.
			let minimo = i;
			for (let f = j; f < par[1]; f++) {
				const node = finais[f];
				if (!blocoVisivel(node)) continue;
				const texto = cleanText(node.textContent || "");
				let melhor = -1;
				let nota = 0.4;
				for (let o = minimo; o < par[0]; o++) {
					const s = semelhanca(textoDaChave(snapshot[o]), texto);
					if (s >= nota) {
						nota = s;
						melhor = o;
					}
				}
				const html = node.nodeType === 1 ? node.outerHTML : "<span>" + escapeHtml(node.nodeValue) + "</span>";
				if (melhor >= 0) {
					itens.push({ k: "mod", i: melhor, html: html, orig: textoDaChave(snapshot[melhor]) });
					usados[melhor] = true;
					minimo = melhor + 1;
				} else {
					itens.push({ k: "new", html: html });
				}
			}
			if (par[0] < snapshot.length) {
				itens.push({ k: "keep", i: par[0] });
				usados[par[0]] = true;
			}
			i = par[0] + 1;
			j = par[1] + 1;
		});
		let apagados = 0;
		for (let o = 0; o < snapshot.length; o++) if (!usados[o] && cleanText(textoDaChave(snapshot[o]))) apagados++;
		return {
			total: snapshot.length,
			assin: snapshot.map(function (k) { return assinatura(textoDaChave(k)); }),
			itens: itens,
			mudou: apagados > 0 || itens.some(function (it) { return it.k !== "keep"; }),
		};
	}

	function escapeHtml(texto) {
		return String(texto).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
	}

	// Trocas de dados variáveis entre o parágrafo original (gravação) e o
	// mesmo parágrafo no documento novo: trechos que diferem, com as palavras
	// iguais em volta servindo de referência (ex.: o nome da parte).
	// Palavras e sinais de pontuação separados (o nome da parte costuma vir
	// em negrito, com a vírgula fora dele).
	function tokens(texto) {
		return (texto || "").match(/[^\s,;:!?"“”()]+|[,;:!?"“”()]/g) || [];
	}

	const PONTUACAO_RE = /^[,;:!?"“”().\-–]+$/;

	function trocasEntre(antigo, novo) {
		const pa = tokens(antigo);
		const pn = tokens(novo);
		const pares = lcsPares(pa, pn, function (x, y) { return x === y; });
		pares.push([pa.length, pn.length]);
		const trocas = [];
		let i = 0;
		let j = 0;
		function limpa(lista) {
			let a = 0;
			let b = lista.length;
			while (a < b && PONTUACAO_RE.test(lista[a])) a++;
			while (b > a && PONTUACAO_RE.test(lista[b - 1])) b--;
			return lista.slice(a, b);
		}
		pares.forEach(function (par) {
			if (par[0] > i && par[1] > j) {
				const velho = limpa(pa.slice(i, par[0]));
				const novoRun = limpa(pn.slice(j, par[1]));
				if (velho.length && novoRun.length) trocas.push([velho, novoRun]);
			}
			i = par[0] + 1;
			j = par[1] + 1;
		});
		return trocas;
	}

	function aplicarTrocas(raiz, trocas) {
		if (!trocas.length) return;
		// Cada troca: [tokens antigos, tokens novos]. Entre os tokens, espaço
		// opcional (a pontuação vem colada na palavra).
		const ordenadas = trocas.slice().sort(function (a, b) { return b[0].join(" ").length - a[0].join(" ").length; });
		const walker = raiz.ownerDocument.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
		const textos = [];
		let t;
		while ((t = walker.nextNode())) textos.push(t);
		textos.forEach(function (node) {
			let valor = node.nodeValue;
			ordenadas.forEach(function (tr) {
				const velho = tr[0].join(" ");
				const novo = tr[1].join(" ").replace(/\s+([,;:!?)])/g, "$1").replace(/([(])\s+/g, "$1");
				if (velho.length < 2 || velho === novo) return;
				const re = new RegExp(tr[0].map(function (p) { return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("[\\s\\u00a0]*"), "g");
				valor = valor.replace(re, function () { return novo; });
			});
			if (valor !== node.nodeValue) node.nodeValue = valor;
		});
	}

	// Casa os parágrafos da gravação (0..total-1) com os do documento novo.
	// Devolve um array orig -> índice novo (ou -1).
	function casarParagrafos(edicao, novosTextos) {
		const mapa = new Array(edicao.total).fill(-1);
		if (novosTextos.length === edicao.total) {
			for (let o = 0; o < edicao.total; o++) mapa[o] = o;
			return mapa;
		}
		const assinNovas = novosTextos.map(assinatura);
		const pares = lcsPares(edicao.assin || [], assinNovas, function (x, y) { return x === y || (!!x && !!y && semelhanca(x, y) >= 0.6); });
		pares.forEach(function (p) { mapa[p[0]] = p[1]; });
		return mapa;
	}

	// Variáveis do Modelo ainda não resolvidas pelo Projudi
	// ("$parteSelecionadaDadosBasicos", "$audienciaDataHora"...).
	const VARIAVEL_MODELO_RE = /\$[a-zA-Z][a-zA-Z0-9]{3,}/g;

	function contarVariaveis(no) {
		return ((no.textContent || "").match(VARIAVEL_MODELO_RE) || []).length;
	}

	// Uso: refaz a edição gravada no documento aberto. Devolve o último nó
	// colocado; null se o documento não parecer do mesmo Modelo; ou
	// "variaveis" se a edição traria variáveis do Modelo não resolvidas
	// (nesse caso o documento volta a ser o que o Projudi gerou).
	function aplicarEdicao(body, edicao) {
		const raiz = blocosRaiz(body);
		const originais = Array.prototype.slice.call(raiz.childNodes);
		const variaveisAntes = contarVariaveis(raiz);
		const novos = blocosDoEditor(body);
		const novosTextos = novos.map(function (n) { return cleanText(n.textContent || ""); });
		const mapa = casarParagrafos(edicao, novosTextos);
		// Só segue se os parágrafos que a edição usa foram achados.
		let precisa = 0;
		let achados = 0;
		edicao.itens.forEach(function (it) {
			if (it.k === "new") return;
			precisa++;
			if (mapa[it.i] >= 0) achados++;
		});
		if (precisa && achados / precisa < 0.8) return null;

		const doc = body.ownerDocument;
		const globais = [];
		edicao.itens.forEach(function (it) {
			if (it.k === "mod" && mapa[it.i] >= 0) Array.prototype.push.apply(globais, trocasEntre(it.orig, novosTextos[mapa[it.i]]));
		});
		// Parágrafos do documento novo sem par na gravação (ex.: uma parte a
		// mais): ficam depois do parágrafo anterior que tem par.
		const usadosNovos = {};
		mapa.forEach(function (j) { if (j >= 0) usadosNovos[j] = true; });
		const extrasDepoisDe = {};
		let anteriorOrig = -1;
		const origDoNovo = {};
		mapa.forEach(function (j, o) { if (j >= 0) origDoNovo[j] = o; });
		novos.forEach(function (node, j) {
			if (usadosNovos[j]) {
				anteriorOrig = origDoNovo[j];
				return;
			}
			(extrasDepoisDe[anteriorOrig] = extrasDepoisDe[anteriorOrig] || []).push(node);
		});

		const saida = (extrasDepoisDe[-1] || []).slice();
		const emitidos = { "-1": true };
		function emitirExtrasAte(o) {
			Object.keys(extrasDepoisDe).forEach(function (k) {
				if (!emitidos[k] && Number(k) <= o) {
					emitidos[k] = true;
					Array.prototype.push.apply(saida, extrasDepoisDe[k]);
				}
			});
		}
		function fragmento(html, trocas) {
			const caixa = doc.createElement("div");
			caixa.innerHTML = html;
			aplicarTrocas(caixa, trocas);
			return Array.prototype.slice.call(caixa.childNodes);
		}
		edicao.itens.forEach(function (it) {
			if (it.k === "keep") {
				if (mapa[it.i] >= 0) saida.push(novos[mapa[it.i]]);
				emitirExtrasAte(it.i);
			} else if (it.k === "mod") {
				const trocas = mapa[it.i] >= 0 ? trocasEntre(it.orig, novosTextos[mapa[it.i]]) : [];
				Array.prototype.push.apply(saida, fragmento(it.html, trocas.concat(globais)));
				emitirExtrasAte(it.i);
			} else {
				Array.prototype.push.apply(saida, fragmento(it.html, globais));
			}
		});
		emitirExtrasAte(Infinity);
		while (raiz.firstChild) raiz.removeChild(raiz.firstChild);
		saida.forEach(function (node) { raiz.appendChild(node); });
		if (contarVariaveis(raiz) > variaveisAntes) {
			console.warn(LOG, "edição gravada traria variáveis do Modelo não resolvidas:", (raiz.textContent.match(VARIAVEL_MODELO_RE) || []).join(", "));
			while (raiz.firstChild) raiz.removeChild(raiz.firstChild);
			originais.forEach(function (node) { raiz.appendChild(node); });
			return "variaveis";
		}
		return saida.length ? saida[saida.length - 1] : null;
	}

	// Onde inserir o conteúdo gravado num documento sem marcador: logo
	// depois do bloco com o texto da âncora (último, se repetido). Sem ele,
	// pela posição gravada, se o documento tiver o mesmo número de blocos
	// (mesmo Modelo). Devolve { ref, antes } ou null.
	function findAncora(body, pref) {
		const raiz = blocosRaiz(body);
		if (pref.ancora) {
			const nodes = Array.prototype.slice.call(raiz.childNodes).filter(function (node) {
				return node.nodeType === 1 && cleanText(node.textContent) === pref.ancora;
			});
			if (nodes.length) return { ref: nodes[nodes.length - 1], antes: false };
		}
		if (typeof pref.ancoraIndice === "number" && typeof pref.totalBlocos === "number") {
			const blocos = Array.prototype.slice.call(raiz.childNodes).filter(function (node) { return !!nodeKey(node); });
			if (blocos.length === pref.totalBlocos) {
				if (pref.ancoraIndice === 0 && blocos.length) return { ref: blocos[0], antes: true };
				if (pref.ancoraIndice > 0 && pref.ancoraIndice <= blocos.length) return { ref: blocos[pref.ancoraIndice - 1], antes: false };
			}
		}
		return null;
	}

	function findPlaceholder(body) {
		const blocks = body.querySelectorAll("p, div, td, li");
		for (let i = 0; i < blocks.length; i++) {
			if (PLACEHOLDER_RE.test(blocks[i].textContent || "") && !blocks[i].querySelector("p, div, td, li")) return blocks[i];
		}
		return null;
	}

	// Substitui o marcador pelo conteúdo gravado; devolve o último nó
	// inserido.
	function insertConteudo(placeholder, html) {
		const last = insertAfter(placeholder, html, true);
		placeholder.remove();
		return last;
	}

	// Insere o HTML logo depois de `ref` (ou antes, se `before`).
	function insertAfter(ref, html, before) {
		const doc = ref.ownerDocument;
		const container = doc.createElement("div");
		container.innerHTML = html;
		const anchor = before ? ref : ref.nextSibling;
		let last = null;
		while (container.firstChild) {
			last = container.firstChild;
			ref.parentNode.insertBefore(last, anchor);
		}
		return last;
	}

	function placeCaret(body, node, selectContents) {
		const doc = body.ownerDocument;
		const win = doc.defaultView;
		body.focus();
		const range = doc.createRange();
		range.selectNodeContents(node);
		if (!selectContents) range.collapse(false);
		win.getSelection().removeAllRanges();
		win.getSelection().addRange(range);
	}

	let digitarActed = false;
	let digitarSnapshot = null;

	// Diagnóstico (uma vez por página): numa tela da Pré-Análise, durante
	// um fluxo do card ⭐, que nenhuma etapa reconheceu, registra no console
	// os formulários e botões, para ajustar o reconhecimento.
	let diagnosticoFeito = false;
	function diagnosticoPreAnalise() {
		if (diagnosticoFeito || !/\/preAnalise\.do$/.test(location.pathname)) return;
		const job = readJob();
		if (!job || !job.preanalise) return;
		// Página de erro do servidor (ex.: "403 Forbidden", do nginx): avisa
		// na própria janela o que fazer.
		if (!document.forms.length && /\b(403|404|500|502|503)\b/.test(document.title + " " + ((document.body && document.body.textContent) || "").slice(0, 300))) {
			diagnosticoFeito = true;
			console.warn(LOG, "Pré-Análise: o Projudi devolveu uma página de erro:", document.title || (document.body && document.body.textContent || "").trim().slice(0, 80));
			showStatus("O Projudi recusou esta página (erro do servidor, não da extensão). Feche o popup e comece de novo pelo ⭐ da linha. Se acontecer de novo no mesmo ponto, anote o último botão clicado.", "warn");
			return;
		}
		// Páginas sem formulário (o PDF da pré-visualização etc.) não são
		// etapas do fluxo.
		if (!document.forms.length) return;
		diagnosticoFeito = true;
		const forms = Array.prototype.map.call(document.forms, function (f) {
			return (f.id || f.name || "(sem id)") + " → " + (f.getAttribute("action") || "");
		});
		const botoes = Array.prototype.map.call(document.querySelectorAll('input[type="button"], input[type="submit"], button'), function (b) {
			return (b.id ? "#" + b.id + " " : "") + String(b.value || b.textContent || "").trim();
		});
		const caixas = Array.prototype.map.call(document.querySelectorAll("textarea"), function (t) { return t.id || t.name || "(sem id)"; });
		console.info(LOG, "Pré-Análise: tela não reconhecida (" + location.search + "). Formulários:", forms, "Botões:", botoes, "Caixas de texto:", caixas);
	}

	function watchDigitarScreen(form) {
		if (form.__pdpJdWatch) return;
		form.__pdpJdWatch = true;
		function onContinuar() {
			const body = editorBody();
			if (body && digitarSnapshot) {
				record(conteudoDigitado(body, digitarSnapshot));
				record({ edicao: gerarEdicao(body, digitarSnapshot) });
			}
			advance(["upload", "digitar"], "incluir");
		}
		// "Continuar" (submit), do usuário ou automático.
		form.addEventListener("submit", onContinuar, true);
		const continuar = findButton(form, "Continuar");
		if (continuar) continuar.addEventListener("click", onContinuar, true);
	}

	async function clickContinuar(form, job, message) {
		const continuar = findButton(form, "Continuar");
		if (!continuar) {
			showStatus(message + ' Clique em "Continuar" — a extensão continua daí.', "warn");
			return;
		}
		showStatus(modeLabel(job) + ": " + message + ' Clicando em "Continuar"…');
		await sleep(400);
		continuar.click();
	}

	async function tickDigitar(job) {
		const form = formDigitar();
		if (!form) return;
		watchDigitarScreen(form);

		if (job.stage !== "digitar" || digitarActed) return;
		const body = editorBody();
		if (!body) return; // CKEditor ainda carregando
		digitarActed = true;

		// Volta pelo "Alterar" da pré-visualização: compara com o documento
		// como ele abriu da primeira vez (guardado no fluxo), não com o texto
		// já alterado.
		if (job.reentry && job.snapshot) {
			digitarSnapshot = job.snapshot;
			showStatus(modeLabel(job) + ': ajuste o texto e clique em "Continuar".', job.mode === "apply" ? null : "rec");
			return;
		}
		digitarSnapshot = snapshotEditor(body);
		updateJob(function (current) {
			current.snapshot = digitarSnapshot;
		});

		const placeholder = findPlaceholder(body);

		if (job.mode === "capture") {
			if (placeholder) placeCaret(body, placeholder, true);
			showStatus(
				modeLabel(job) + ': digite/ajuste o texto e clique em "Continuar". O que você acrescentar ou alterar (sem cabeçalho, data e assinatura) vai para a preferência.',
				"rec"
			);
			return;
		}

		// Preferência gravada como edição do texto do Modelo: refaz a edição.
		const edicao = job.pref.edicao;
		if (edicao && edicao.mudou) {
			const ultimo = aplicarEdicao(body, edicao);
			if (ultimo === "variaveis") {
				showStatus('A versão gravada nesta preferência tem variáveis do Modelo sem dados (ex.: "$parteSelecionadaDadosBasicos"). Deixei o documento como o Projudi o gerou: confira e clique em "Continuar". Para corrigir, grave a preferência de novo (✏️).', "warn");
				return;
			}
			if (!ultimo) {
				showStatus('Este documento não parece ser do mesmo Modelo da preferência: não refiz as edições gravadas. Faça-as à mão e clique em "Continuar" — a extensão continua daí.', "warn");
				return;
			}
			if (job.mode === "edit") {
				if (ultimo.nodeType === 1) placeCaret(body, ultimo, false);
				showStatus(modeLabel(job) + ': edições da preferência refeitas neste documento. Ajuste se quiser e clique em "Continuar".', "rec");
				return;
			}
			await clickContinuar(form, job, "edições da preferência refeitas.");
			return;
		}
		// Versão final gravada sem nenhuma alteração no texto do Modelo:
		// segue com o documento como o Projudi o gerou.
		if (edicao && !edicao.mudou) {
			if (job.mode === "edit") {
				showStatus(modeLabel(job) + ': esta preferência usa o texto do Modelo sem alterações. Ajuste se quiser e clique em "Continuar".', "rec");
				return;
			}
			await clickContinuar(form, job, "texto do Modelo, como gravado.");
			return;
		}

		const conteudo = job.pref.conteudo;
		if (!conteudo) {
			// Sem texto gravado: o documento é o que o Projudi gerou (ex.: a
			// partir do Modelo) — segue como está.
			if (job.mode === "edit") {
				if (placeholder) placeCaret(body, placeholder, true);
				showStatus(modeLabel(job) + ': esta preferência não tem texto próprio. Ajuste se quiser e clique em "Continuar".', "rec");
				return;
			}
			if (placeholder) {
				placeCaret(body, placeholder, true);
				showStatus(modeLabel(job) + ': esta preferência não tem texto gravado. Digite-o e clique em "Continuar" — a extensão continua daí. (Para gravar o texto nela, use ✏️ Editar.)', "ok");
				return;
			}
			await clickContinuar(form, job, "documento gerado pelo Projudi.");
			return;
		}

		let last = null;
		if (placeholder) {
			last = insertConteudo(placeholder, conteudo);
		} else {
			const onde = findAncora(body, job.pref);
			if (!onde) {
				showStatus('Não encontrei onde inserir o texto da preferência neste documento. Digite/cole o texto e clique em "Continuar" — a extensão continua daí.', "warn");
				return;
			}
			last = insertAfter(onde.ref, conteudo, onde.antes);
		}

		if (job.mode === "edit") {
			if (last && last.nodeType === 1) placeCaret(body, last, false);
			showStatus(modeLabel(job) + ': texto da preferência inserido. Ajuste se quiser e clique em "Continuar".', "rec");
			return;
		}
		await clickContinuar(form, job, "texto inserido.");
	}

	// -------------------------------------------------------------------
	// Laço de verificação (cada frame cuida da sua tela)
	// -------------------------------------------------------------------

	// Tela depois do "Concluir Movimento" de uma juntada do combo: com a
	// confirmação "Dados registrados com sucesso", marca a etapa como feita
	// e volta para o processo (ver COMBO_CONCLUIR_KEY).
	let comboBackClicked = false;
	function tickComboAfterConcluir() {
		if (comboBackClicked || !document.body) return;
		let pending = null;
		try {
			pending = JSON.parse(sessionStorage.getItem(COMBO_CONCLUIR_KEY) || "null");
		} catch (err) {
			return;
		}
		if (!pending) return;
		if (Date.now() - pending.at > COMBO_CONCLUIR_MAX_AGE_MS) {
			sessionStorage.removeItem(COMBO_CONCLUIR_KEY);
			return;
		}
		if (!SUCCESS_RE.test(document.body.textContent || "")) return;
		const numero = numeroProcesso(document);
		if (pending.numero && numero && pending.numero !== numero) return;
		const voltar = findButton(document, "Voltar para o Processo");
		comboBackClicked = true;
		try {
			sessionStorage.removeItem(COMBO_CONCLUIR_KEY);
			sessionStorage.setItem(COMBO_DONE_KEY, String(Date.now()));
		} catch (err) {
			return;
		}
		console.info(LOG, "combo: juntada confirmada (\"Dados registrados com sucesso\")" + (voltar ? '; voltando para o processo.' : '; sem "Voltar para o Processo" nesta tela.'));
		if (voltar) {
			showStatus('Documento juntado. Voltando para o processo para continuar o combo…', "ok");
			setTimeout(function () {
				voltar.click();
			}, 600);
		} else {
			showStatus('Documento juntado. Volte para o processo para o combo continuar.', "ok");
		}
	}

	function tick() {
		try {
			tickComboAfterConcluir();
			// Telas dos cumprimentos: vêm antes das demais - a do cumprimento
			// tem "Concluir" (barra de progresso) e "Alterar", que a fariam
			// parecer a pré-visualização do documento.
			if (isCumprimentoScreen() || isPreAnaliseScreen() || isSelecaoDocumentosScreen()) {
				const jobCump = readJob();
				if (jobCump && jobCump.preanalise) {
					if (isCumprimentoScreen()) tickCumprimento(jobCump);
					else if (isSelecaoDocumentosScreen()) tickSelecaoDocumentos(jobCump);
					else tickPreAnalise(jobCump);
				}
				return;
			}
			const juntar = isJuntarScreen();
			const upload = !juntar && isUploadScreen();
			const digitar = !juntar && !upload && isDigitarScreen();
			const preview = !juntar && !upload && !digitar && isPreviewScreen();
			if (!juntar && !upload && !digitar && !preview) {
				diagnosticoPreAnalise();
				return;
			}

			const job = readJob();
			if (!job) {
				if (statusBar && statusBar.classList.contains("pdp-jd-status-rec")) removeStatus();
				return;
			}
			if (juntar) tickJuntar(job);
			else if (upload) tickUpload(job);
			else if (digitar) tickDigitar(job);
			else tickPreview(job);
		} catch (err) {
			console.error(LOG, err);
		}
	}

	flushPendingSave();
	setInterval(tick, POLL_MS);
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
	else tick();

	// -------------------------------------------------------------------
	// Botão flutuante na linha do "📋 Processo copiado" (quickActions.js) e
	// painel de preferências — só no frame que tem essa fileira.
	// -------------------------------------------------------------------

	let button = null;
	let panel = null;

	function reconcileButton() {
		const clipboardBtn = document.getElementById("pdp-clipboard-button");
		if (!clipboardBtn) {
			if (button && button.isConnected) button.remove();
			return;
		}
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.id = "pdp-juntar-documento-button";
			button.className = "pdp-qa-group-btn";
			button.textContent = "📎 Juntar Documento";
			button.title = 'Juntar um documento digitado: grave o fluxo completo uma vez ("+ Nova preferência") e depois repita-o com um clique, até o "Concluir Movimento"';
			button.addEventListener("click", function (e) {
				e.stopPropagation();
				if (panel) closePanel();
				else openPanel();
			});
		}
		// À direita, depois do último da cadeia "Processo copiado" →
		// "(Des)Habilitar Advogado" → "Editar Partes/Outros" (cada um
		// ancorado no anterior, para os MutationObservers não disputarem a
		// mesma posição).
		let anchor = clipboardBtn;
		["pdp-habilitar-advogado-button", "pdp-editar-partes-button"].forEach(function (id) {
			const el = document.getElementById(id);
			if (el && el.parentElement === clipboardBtn.parentElement) anchor = el;
		});
		if (button.previousElementSibling !== anchor || button.parentElement !== anchor.parentElement) {
			anchor.insertAdjacentElement("afterend", button);
		}
	}

	new MutationObserver(reconcileButton).observe(document.documentElement, { childList: true, subtree: true });
	reconcileButton();

	// Usado pelo painel "⭐ Minhas Preferências" (quickActions.js).
	window.__pdpJuntarDocumento = {
		apply: function (pref) {
			closePanel();
			iniciarJuntada("apply", pref);
		},
		edit: function (pref) {
			closePanel();
			iniciarJuntada("edit", pref);
		},
	};

	function closePanel() {
		if (panel) panel.remove();
		panel = null;
		if (button) button.classList.remove("pdp-qa-active");
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onPanelKeydown, true);
	}

	function onOutsideClick(e) {
		if (panel && !panel.contains(e.target) && e.target !== button) closePanel();
	}

	function onPanelKeydown(e) {
		if (e.key === "Escape") closePanel();
	}

	function positionPanel() {
		if (!panel || !button) return;
		const rect = button.getBoundingClientRect();
		const margin = 12;
		const above = rect.top - margin - 6;
		const below = window.innerHeight - rect.bottom - margin - 6;
		const openAbove = above >= below;
		panel.style.maxHeight = Math.max(120, openAbove ? above : below) + "px";
		panel.style.top = openAbove ? "auto" : rect.bottom + 6 + "px";
		panel.style.bottom = openAbove ? window.innerHeight - rect.top + 6 + "px" : "auto";
		const width = panel.offsetWidth || 340;
		let left = rect.right - width;
		if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
		panel.style.left = Math.max(margin, Math.round(left)) + "px";
		panel.style.right = "auto";
	}

	function openPanel() {
		closePanel();
		panel = document.createElement("div");
		panel.className = "pdp-qa-panel pdp-jd-panel";

		const actionRow = document.createElement("div");
		actionRow.className = "pdp-qa-action";

		const header = document.createElement("div");
		header.className = "pdp-qa-action-header";
		const label = document.createElement("span");
		label.className = "pdp-qa-action-label";
		label.textContent = "Juntar Documento";
		header.appendChild(label);
		const openBtn = document.createElement("button");
		openBtn.type = "button";
		openBtn.className = "pdp-qa-open-btn";
		openBtn.textContent = "Abrir";
		openBtn.title = 'Só abre a tela "Juntar Documento", sem preencher nem gravar nada';
		openBtn.addEventListener("click", function () {
			closePanel();
			iniciarJuntada(null);
		});
		header.appendChild(openBtn);
		actionRow.appendChild(header);

		const prefsWrap = document.createElement("div");
		prefsWrap.className = "pdp-qa-prefs";
		actionRow.appendChild(prefsWrap);

		const newBtn = document.createElement("button");
		newBtn.type = "button";
		newBtn.className = "pdp-qa-pref-new";
		newBtn.textContent = "+ Nova preferência";
		newBtn.title =
			'Abre a tela "Juntar Documento" e grava o que você fizer no fluxo completo (Tipo de Documento, Tipo do Arquivo, Modelo e texto). Ao clicar em "Concluir Movimento", a extensão pede o nome e salva a preferência; o assinador segue normalmente.';
		newBtn.addEventListener("click", function () {
			closePanel();
			iniciarJuntada("capture", null);
		});
		actionRow.appendChild(newBtn);

		panel.appendChild(actionRow);
		document.body.appendChild(panel);
		button.classList.add("pdp-qa-active");
		positionPanel();

		renderPrefs(prefsWrap);

		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onPanelKeydown, true);
		}, 0);
	}

	function renderPrefs(wrap) {
		loadPrefs().then(function (prefs) {
			if (!panel || !wrap.isConnected) return;
			wrap.innerHTML = "";
			if (!prefs.length) {
				const empty = document.createElement("div");
				empty.className = "pdp-qa-empty";
				empty.textContent = 'Nenhuma preferência ainda. Use "+ Nova preferência" e faça a juntada completa uma vez.';
				wrap.appendChild(empty);
			}
			prefs.forEach(function (pref) {
				const chip = document.createElement("span");
				chip.className = "pdp-qa-pref-chip";

				const applyBtn = document.createElement("button");
				applyBtn.type = "button";
				applyBtn.className = "pdp-qa-pref-btn";
				applyBtn.textContent = "★ " + pref.name;
				applyBtn.title = 'Juntar com esta preferência, até "Concluir Movimento" (assinador):\n' + describePref(pref);
				applyBtn.addEventListener("click", function () {
					closePanel();
					iniciarJuntada("apply", pref);
				});
				chip.appendChild(applyBtn);

				const editBtn = document.createElement("button");
				editBtn.type = "button";
				editBtn.className = "pdp-qa-pref-edit";
				editBtn.textContent = "✏️";
				editBtn.title =
					'Editar esta preferência: refaz o fluxo com cada tela já preenchida, sem clicar em nada — ajuste o que quiser e avance; no "Concluir Movimento" a preferência é atualizada';
				editBtn.addEventListener("click", function () {
					closePanel();
					iniciarJuntada("edit", pref);
				});
				chip.appendChild(editBtn);

				const delBtn = document.createElement("button");
				delBtn.type = "button";
				delBtn.className = "pdp-qa-pref-del";
				delBtn.textContent = "🗑";
				delBtn.title = "Remover esta preferência";
				delBtn.addEventListener("click", function () {
					if (!confirm('Remover a preferência "' + pref.name + '" de "Juntar Documento"?')) return;
					removePref(pref.id).then(function () {
						renderPrefs(wrap);
					});
				});
				chip.appendChild(delBtn);

				wrap.appendChild(chip);
			});
			positionPanel();
		});
	}
})();
