// Projudi - Atalho "Juntar Documento" com preferências
//
// Juntar um documento digitado (certidão, informação, termo...) hoje exige:
// clicar no botão nativo "Juntar Documento" da barra de botões do processo
// (id="movimentarButton", `document.location.href =
// '/projudi/movimentarProcesso.do?_tj=...'`), escolher o "Tipo de
// Documento" (campo com autocompletar + pesquisa), clicar em "Adicionar"
// (o Projudi abre a janela interna "Inserir Arquivo", upload.do), escolher
// o "Tipo do Arquivo" (e às vezes o "Modelo"), clicar em "Digitar Texto"
// (a mesma janela vai para "Digitar Documento", digitarTexto.do, com o
// CKEditor), digitar o texto, clicar em "Continuar", clicar em "Confirmar
// Inclusão" e, de volta à tela "Juntar Documento", clicar em "Concluir
// Movimento" — que chama o assinador.
//
// Este arquivo adiciona o botão "📎 Juntar Documento" ao lado do
// "📋 Processo copiado" (ver quickActions.js). Ele abre um painel com:
// - "Abrir": só vai para a tela "Juntar Documento" (como o botão nativo);
// - preferências salvas (★), cada uma com ✏️ (editar) e 🗑 (remover);
// - "+ Nova preferência".
//
// Uma preferência guarda: Tipo de Documento, Tipo do Arquivo, Descrição
// (para "Outros"), Modelo, um texto opcional a inserir no lugar de
// "XXXXXXXXXX INSIRA O TEXTO AQUI XXXXXXXXXX", e se a extensão deve clicar
// sozinha em "Continuar" (só quando há texto) e em "Concluir Movimento".
// É editada num formulário desta extensão (nada é enviado ao Projudi na
// edição). As listas de sugestões (tipos de documento, tipos de arquivo e
// modelos) são aprendidas das próprias telas do Projudi à medida que o
// usuário passa por elas (ver `aprenderCatalogo`).
//
// A automação atravessa várias páginas (a tela do processo, a "Juntar
// Documento" e as telas da janela interna do Projudi, que é um iframe da
// mesma origem). O estado fica no `sessionStorage` (compartilhado pelos
// frames da mesma origem nesta aba, e só nela), em JOB_KEY, com a etapa
// atual:
//   "juntar"   → tela Juntar Documento: preenche o Tipo de Documento e
//                clica em "Adicionar";
//   "upload"   → janela "Inserir Arquivo": escolhe Tipo do Arquivo/Modelo e
//                clica em "Digitar Texto";
//   "digitar"  → "Digitar Documento": insere o texto (ou seleciona o
//                marcador para o usuário digitar por cima); o "Continuar"
//                (do usuário ou automático) passa para "incluir";
//   "incluir"  → "Inserir Arquivo" já com o arquivo na lista: clica em
//                "Confirmar Inclusão";
//   "concluir" → Juntar Documento já com o arquivo: clica em "Concluir
//                Movimento" (assinador) ou só o destaca.
// Se algum passo automático falhar, o usuário faz esse passo à mão e a
// automação continua a partir do seguinte (os cliques nos botões nativos
// correspondentes também avançam a etapa).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpJuntarDocumento || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpJuntarDocumento = true;

	const PREFS_KEY = "pdpJuntarDocumentoPrefs"; // [{id, name, tipoDocumento, tipoArquivo, descricao, modelo, texto, autoContinuar, autoConcluir}]
	const CATALOGO_KEY = "pdpJuntarDocumentoCatalogo"; // {tiposDocumento:[{id,text}], tiposArquivo:[{value,text}], modelos:{[tipoArquivo]:[{value,text}]}}
	const JOB_KEY = "pdpJuntarDocumentoJob";
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

	function buttonText(el) {
		return (el.value || el.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findButton(root, label, exclude) {
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
		const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((doc.title || "") + " " + ((doc.querySelector("h3 em.attention") || {}).textContent || ""));
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
	// Estado da automação (sessionStorage: só esta aba, frames da mesma
	// origem)
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
			console.warn(LOG, "não foi possível gravar o estado da automação:", err);
		}
	}

	function setStage(stage) {
		const job = readJob();
		if (!job) return;
		job.stage = stage;
		writeJob(job);
	}

	function clearJob() {
		try {
			sessionStorage.removeItem(JOB_KEY);
		} catch (err) {
			// sem sessionStorage: nada a limpar
		}
		removeStatus();
	}

	// -------------------------------------------------------------------
	// Faixa de status (no frame em que a automação está agindo)
	// -------------------------------------------------------------------

	let statusBar = null;

	function showStatus(message, kind) {
		if (!document.body) return;
		if (!statusBar || !statusBar.isConnected) {
			statusBar = document.createElement("div");
			statusBar.className = "pdp-jd-status";
			const text = document.createElement("span");
			text.className = "pdp-jd-status-text";
			statusBar.appendChild(text);
			const cancel = document.createElement("button");
			cancel.type = "button";
			cancel.textContent = "Parar automação";
			cancel.title = "A extensão deixa de agir nesta juntada; você segue manualmente";
			cancel.addEventListener("click", clearJob);
			statusBar.appendChild(cancel);
			const close = document.createElement("button");
			close.type = "button";
			close.textContent = "✕";
			close.title = "Fechar este aviso";
			close.addEventListener("click", removeStatus);
			statusBar.appendChild(close);
			document.body.appendChild(statusBar);
		}
		statusBar.classList.toggle("pdp-jd-status-warn", kind === "warn");
		statusBar.classList.toggle("pdp-jd-status-ok", kind === "ok");
		statusBar.querySelector(".pdp-jd-status-text").textContent = "📎 " + message;
	}

	function removeStatus() {
		if (statusBar && statusBar.isConnected) statusBar.remove();
		statusBar = null;
	}

	// -------------------------------------------------------------------
	// Catálogo de sugestões, aprendido das telas do Projudi
	// -------------------------------------------------------------------

	let catalogoSave = Promise.resolve();

	function mergeList(list, items, keyName) {
		const byKey = {};
		list.forEach(function (item) {
			byKey[String(item[keyName])] = item;
		});
		let changed = false;
		items.forEach(function (item) {
			const key = String(item[keyName]);
			if (!item.text || !key) return;
			if (!byKey[key] || byKey[key].text !== item.text) {
				byKey[key] = item;
				changed = true;
			}
		});
		if (!changed) return null;
		return Object.keys(byKey)
			.map(function (k) {
				return byKey[k];
			})
			.sort(function (a, b) {
				return a.text.localeCompare(b.text, "pt-BR");
			});
	}

	function aprenderCatalogo(update) {
		catalogoSave = catalogoSave
			.then(function () {
				return storageGet(CATALOGO_KEY, {});
			})
			.then(function (catalogo) {
				catalogo = catalogo || {};
				if (update(catalogo)) return storageSet(CATALOGO_KEY, catalogo);
			})
			.catch(function (err) {
				console.warn(LOG, "não foi possível atualizar as sugestões:", err);
			});
		return catalogoSave;
	}

	function aprenderTiposDocumento(items) {
		if (!items.length) return;
		aprenderCatalogo(function (catalogo) {
			const merged = mergeList(catalogo.tiposDocumento || [], items, "id");
			if (!merged) return false;
			catalogo.tiposDocumento = merged;
			return true;
		});
	}

	function optionItems(select) {
		return Array.prototype.slice
			.call(select.options)
			.filter(function (o) {
				return o.value !== "" && o.value !== "0" && o.value !== "-1";
			})
			.map(function (o) {
				return { value: o.value, text: (o.textContent || "").replace(/ /g, " ").replace(/\s+/g, " ").trim() };
			});
	}

	// Tela "Pesquisa de Tipo de Documento" (tipoDocumento.do): árvore com
	// <input type="radio" name="idTipoDocumentoSelecionado" value="ID"><a>TEXTO</a>.
	function aprenderDaPesquisaTipoDocumento() {
		const radios = document.querySelectorAll('input[type="radio"][name="idTipoDocumentoSelecionado"]');
		const items = [];
		radios.forEach(function (radio) {
			const link = radio.nextElementSibling;
			const text = link ? (link.textContent || "").replace(/\s+/g, " ").trim() : "";
			if (radio.value && text) items.push({ id: radio.value, text: text });
		});
		aprenderTiposDocumento(items);
	}

	// Sugestões do autocompletar do campo "Tipo de Documento" (<li id="ID">TEXTO</li>).
	function aprenderDoAutocompletar(container) {
		const items = [];
		container.querySelectorAll("li[id]").forEach(function (li) {
			const text = (li.textContent || "").replace(/\s+/g, " ").trim();
			if (/^\d+$/.test(li.id) && text) items.push({ id: li.id, text: text });
		});
		aprenderTiposDocumento(items);
	}

	function aprenderTiposArquivo(select) {
		const items = optionItems(select);
		if (!items.length) return;
		aprenderCatalogo(function (catalogo) {
			const merged = mergeList(catalogo.tiposArquivo || [], items, "value");
			if (!merged) return false;
			catalogo.tiposArquivo = merged;
			return true;
		});
	}

	function aprenderModelos(tipoArquivo, select) {
		const items = optionItems(select);
		if (!tipoArquivo || tipoArquivo === "0" || !items.length) return;
		aprenderCatalogo(function (catalogo) {
			catalogo.modelos = catalogo.modelos || {};
			const merged = mergeList(catalogo.modelos[tipoArquivo] || [], items, "value");
			if (!merged) return false;
			catalogo.modelos[tipoArquivo] = merged;
			return true;
		});
	}

	// -------------------------------------------------------------------
	// Preferências
	// -------------------------------------------------------------------

	function loadPrefs() {
		return storageGet(PREFS_KEY, []).then(function (prefs) {
			return Array.isArray(prefs) ? prefs : [];
		});
	}

	function savePref(pref) {
		return loadPrefs().then(function (prefs) {
			const idx = prefs.findIndex(function (p) {
				return p.id === pref.id;
			});
			pref.updatedAt = Date.now();
			if (idx === -1) {
				pref.createdAt = pref.updatedAt;
				prefs.push(pref);
			} else {
				prefs[idx] = pref;
			}
			return storageSet(PREFS_KEY, prefs);
		});
	}

	function removePref(id) {
		return loadPrefs().then(function (prefs) {
			return storageSet(
				PREFS_KEY,
				prefs.filter(function (p) {
					return p.id !== id;
				})
			);
		});
	}

	function describePref(pref) {
		const parts = [];
		if (pref.tipoDocumento && pref.tipoDocumento.text) parts.push("Tipo de Documento: " + pref.tipoDocumento.text);
		if (pref.tipoArquivo && pref.tipoArquivo.text) parts.push("Tipo do Arquivo: " + pref.tipoArquivo.text);
		if (pref.descricao) parts.push("Descrição: " + pref.descricao);
		if (pref.modelo && pref.modelo.text) parts.push("Modelo: " + pref.modelo.text);
		parts.push(pref.texto ? "Texto: " + pref.texto.slice(0, 80) + (pref.texto.length > 80 ? "…" : "") : "Texto: digitado na hora");
		if (pref.texto && pref.autoContinuar) parts.push('Clica em "Continuar" sozinho');
		parts.push(pref.autoConcluir ? 'Clica em "Concluir Movimento" sozinho (assinador)' : 'Para antes de "Concluir Movimento"');
		return parts.join("\n");
	}

	// -------------------------------------------------------------------
	// Tela do processo: botão nativo "Juntar Documento" e início da
	// automação
	// -------------------------------------------------------------------

	// <input type="button" id="movimentarButton" value="Juntar Documento"
	//   onclick="disableScreen(); document.location.href='/projudi/movimentarProcesso.do?_tj=...'">
	function findNativeJuntarButton(doc) {
		const byId = doc.getElementById("movimentarButton");
		if (byId && norm(buttonText(byId)) === "JUNTAR DOCUMENTO") return byId;
		return findButton(doc, "Juntar Documento", function (el) {
			return el.tagName === "BUTTON" || el.id === "pdp-juntar-documento-button" || !!el.closest("#pdp-qa-row, .pdp-qa-panel, .pdp-jd-editor");
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

	function iniciarJuntada(pref) {
		const url = findJuntarUrl(document);
		if (!url) {
			alert('Não encontrei o botão nativo "Juntar Documento" nesta tela. Abra o processo (a barra com "Peticionar", "Juntar Documento", "Navegar"...) e tente de novo.');
			return;
		}
		if (pref) {
			writeJob({
				stage: "juntar",
				pref: pref,
				numero: numeroProcesso(document),
				createdAt: Date.now(),
			});
		} else {
			clearJob();
		}
		location.href = url.href;
	}

	// -------------------------------------------------------------------
	// Tela "Juntar Documento" (form#juntarDocumentoForm)
	// -------------------------------------------------------------------

	function isJuntarScreen() {
		const form = document.getElementById("juntarDocumentoForm");
		return !!form && !!document.getElementById("descricaoTipoDocumento");
	}

	function juntarForm() {
		return document.getElementById("juntarDocumentoForm");
	}

	function idTipoDocumentoField() {
		const form = juntarForm();
		return (form && form.elements.namedItem("idTipoDocumento")) || document.querySelector('[name="idTipoDocumento"]');
	}

	// Linhas de arquivo da tabela "Arquivos" (a que fica junto do botão
	// "Adicionar"/do botão "Confirmar Inclusão"), sem a linha "Nenhum
	// registro encontrado".
	function fileRows(root) {
		const table = root.querySelector("table.resultTable");
		if (!table) return [];
		return Array.prototype.slice.call(table.querySelectorAll("tbody tr")).filter(function (tr) {
			return tr.querySelectorAll("td").length >= 3 && !/nenhum registro encontrado/i.test(tr.textContent || "");
		});
	}

	function tipoDocumentoPreenchido(pref) {
		const input = document.getElementById("descricaoTipoDocumento");
		const hidden = idTipoDocumentoField();
		if (!input || norm(input.value) !== norm(pref.tipoDocumento.text)) return false;
		return !hidden || !!hidden.value;
	}

	async function preencherTipoDocumento(pref) {
		const input = document.getElementById("descricaoTipoDocumento");
		if (!input || !pref.tipoDocumento || !pref.tipoDocumento.text) return false;
		const hidden = idTipoDocumentoField();

		// Caminho direto: id conhecido e campo oculto presente.
		if (hidden && pref.tipoDocumento.id) {
			input.value = pref.tipoDocumento.text;
			hidden.value = pref.tipoDocumento.id;
			fire(input, "change");
			fire(hidden, "change");
			return true;
		}

		// Caminho pelo autocompletar nativo: digita a descrição e escolhe a
		// sugestão de mesmo texto.
		const box = document.getElementById("ajaxAuto_descricaoTipoDocumento");
		input.focus();
		input.value = pref.tipoDocumento.text;
		input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
		fire(input, "input");
		if (box) {
			const wanted = norm(pref.tipoDocumento.text);
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
				input.value = (li.textContent || "").replace(/\s+/g, " ").trim();
			}
		}
		await sleep(200);
		return tipoDocumentoPreenchido(pref);
	}

	let juntarActed = false;
	let juntarBusy = false;

	async function tickJuntar(job) {
		const form = juntarForm();
		if (!form || juntarBusy) return;

		// Clique manual em "Adicionar" também avança a automação.
		const adicionar = findButton(form, "Adicionar");
		if (adicionar && !adicionar.__pdpJdWatch) {
			adicionar.__pdpJdWatch = true;
			adicionar.addEventListener("click", function () {
				const current = readJob();
				if (current && current.stage === "juntar") setStage("upload");
			});
		}

		if (job.numero) {
			const numero = numeroProcesso(document);
			if (numero && numero !== job.numero) {
				console.info(LOG, "tela de outro processo; automação encerrada.");
				clearJob();
				return;
			}
		}

		if (job.stage === "juntar" && !juntarActed) {
			juntarActed = true;
			juntarBusy = true;
			try {
				showStatus('Preenchendo o Tipo de Documento "' + job.pref.tipoDocumento.text + '"…');
				const ok = await preencherTipoDocumento(job.pref);
				if (!ok) {
					showStatus('Não consegui escolher o Tipo de Documento "' + job.pref.tipoDocumento.text + '". Escolha-o manualmente e clique em "Adicionar" — a extensão continua daí.', "warn");
					return;
				}
				if (!adicionar) {
					showStatus('Não encontrei o botão "Adicionar". Clique nele manualmente — a extensão continua daí.', "warn");
					return;
				}
				showStatus('Abrindo "Inserir Arquivo"…');
				setStage("upload");
				adicionar.click();
			} finally {
				juntarBusy = false;
			}
			return;
		}

		if (job.stage === "upload" || job.stage === "digitar") {
			showStatus("Continue na janela do Projudi (Inserir Arquivo / Digitar Documento).");
			return;
		}

		if ((job.stage === "incluir" || job.stage === "concluir") && fileRows(form).length) {
			const concluir = findButton(form, "Concluir Movimento");
			if (!concluir) {
				showStatus('Documento incluído. Não encontrei o botão "Concluir Movimento"; clique nele manualmente.', "warn");
				clearJobKeepStatus();
				return;
			}
			if (job.pref.autoConcluir) {
				clearJobKeepStatus();
				showStatus('Documento incluído. Clicando em "Concluir Movimento" (o assinador será chamado)…', "ok");
				concluir.click();
			} else {
				clearJobKeepStatus();
				concluir.classList.add("pdp-jd-highlight");
				concluir.scrollIntoView({ block: "center" });
				showStatus('Documento incluído. Confira e clique em "Concluir Movimento" para assinar.', "ok");
			}
		}
	}

	function clearJobKeepStatus() {
		try {
			sessionStorage.removeItem(JOB_KEY);
		} catch (err) {
			// sem sessionStorage: nada a limpar
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

	function chooseOption(select, saved) {
		if (!saved) return false;
		const options = Array.prototype.slice.call(select.options);
		const option =
			(saved.value &&
				options.filter(function (o) {
					return o.value === String(saved.value) && norm(o.textContent) === norm(saved.text);
				})[0]) ||
			options.filter(function (o) {
				return norm(o.textContent) === norm(saved.text);
			})[0] ||
			(saved.value &&
				options.filter(function (o) {
					return o.value === String(saved.value);
				})[0]);
		if (!option) return false;
		if (select.value !== option.value) {
			select.value = option.value;
			fire(select, "input");
			fire(select, "change");
		}
		return true;
	}

	let uploadActed = false;
	let uploadBusy = false;

	function watchUploadScreen() {
		const tipo = document.getElementById("codDescricao");
		const modelo = document.getElementById("codModelo");
		if (tipo && !tipo.__pdpJdWatch) {
			tipo.__pdpJdWatch = true;
			aprenderTiposArquivo(tipo);
		}
		if (tipo && modelo && !modelo.__pdpJdWatch) {
			modelo.__pdpJdWatch = true;
			new MutationObserver(function () {
				aprenderModelos(tipo.value, modelo);
			}).observe(modelo, { childList: true });
			aprenderModelos(tipo.value, modelo);
		}
		// Cliques manuais nos botões avançam a automação.
		const digitar = findButton(document, "Digitar Texto");
		if (digitar && !digitar.__pdpJdWatch) {
			digitar.__pdpJdWatch = true;
			digitar.addEventListener("click", function () {
				const current = readJob();
				if (current && current.stage === "upload") setStage("digitar");
			});
		}
		const confirmar = findButton(document, "Confirmar Inclusão");
		if (confirmar && !confirmar.__pdpJdWatch) {
			confirmar.__pdpJdWatch = true;
			confirmar.addEventListener("click", function () {
				const current = readJob();
				if (current && (current.stage === "incluir" || current.stage === "upload" || current.stage === "digitar")) setStage("concluir");
			});
		}
	}

	async function tickUpload(job) {
		if (uploadBusy) return;
		const form = document.getElementById("fileUploadForm");

		if (job.stage === "upload" && !uploadActed) {
			uploadActed = true;
			uploadBusy = true;
			try {
				await preencherUpload(job.pref);
			} finally {
				uploadBusy = false;
			}
			return;
		}

		if ((job.stage === "incluir" || job.stage === "digitar") && fileRows(form).length && !uploadActed) {
			uploadActed = true;
			const confirmar = findButton(document, "Confirmar Inclusão");
			if (!confirmar) {
				showStatus('Texto incluído. Clique em "Confirmar Inclusão" — a extensão continua daí.', "warn");
				return;
			}
			setStage("concluir");
			showStatus('Texto incluído. Clicando em "Confirmar Inclusão"…');
			confirmar.click();
		}
	}

	async function preencherUpload(pref) {
		const tipo = document.getElementById("codDescricao");
		const modelo = document.getElementById("codModelo");
		const digitar = findButton(document, "Digitar Texto");

		if (pref.tipoArquivo && pref.tipoArquivo.text) {
			showStatus('Escolhendo o Tipo do Arquivo "' + pref.tipoArquivo.text + '"…');
			if (!chooseOption(tipo, pref.tipoArquivo)) {
				showStatus('O Tipo do Arquivo "' + pref.tipoArquivo.text + '" não está disponível aqui. Escolha-o manualmente e clique em "Digitar Texto" — a extensão continua daí.', "warn");
				return;
			}
		} else if (!tipo.value || tipo.value === "0") {
			showStatus('Escolha o Tipo do Arquivo e clique em "Digitar Texto" — a extensão continua daí.', "warn");
			return;
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
					return;
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

		if (!digitar) {
			showStatus('Não encontrei o botão "Digitar Texto". Clique nele manualmente — a extensão continua daí.', "warn");
			return;
		}
		setStage("digitar");
		showStatus('Abrindo "Digitar Documento"…');
		digitar.click();
	}

	// -------------------------------------------------------------------
	// "Digitar Documento" (digitarTexto.do, CKEditor sobre o textarea
	// conteudoEditor)
	// -------------------------------------------------------------------

	function isDigitarScreen() {
		const form = document.getElementById("fileUploadForm");
		return !!form && !!document.getElementById("conteudoEditor") && /digitarTexto\.do/i.test(form.getAttribute("action") || "");
	}

	function editorBody() {
		const frame = document.querySelector("#cke_conteudoEditor iframe.cke_wysiwyg_frame, #cke_conteudoEditor iframe");
		try {
			const doc = frame && frame.contentDocument;
			if (doc && doc.body && doc.body.isContentEditable && doc.body.childNodes.length) return doc.body;
		} catch (err) {
			return null;
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

	// Texto simples → parágrafos com o mesmo estilo do marcador (linha em
	// branco separa parágrafos; quebra simples vira <br>).
	function insertText(body, placeholder, texto) {
		const doc = body.ownerDocument;
		const paragraphs = texto
			.replace(/\r\n?/g, "\n")
			.split(/\n\s*\n/)
			.map(function (p) {
				return p.replace(/^\n+|\n+$/g, "");
			})
			.filter(Boolean);
		const style = placeholder.getAttribute("style");
		let last = null;
		paragraphs.forEach(function (text) {
			const p = doc.createElement("p");
			if (style) p.setAttribute("style", style);
			text.split("\n").forEach(function (line, idx) {
				if (idx) p.appendChild(doc.createElement("br"));
				p.appendChild(doc.createTextNode(line));
			});
			placeholder.parentNode.insertBefore(p, placeholder);
			last = p;
		});
		placeholder.remove();
		return last;
	}

	let digitarActed = false;

	async function tickDigitar(job) {
		const form = document.getElementById("fileUploadForm");
		if (form && !form.__pdpJdWatch) {
			form.__pdpJdWatch = true;
			// "Continuar" (submit), do usuário ou automático.
			form.addEventListener("submit", function () {
				const current = readJob();
				if (current && current.stage === "digitar") setStage("incluir");
			});
			const continuar = findButton(form, "Continuar");
			if (continuar) {
				continuar.addEventListener("click", function () {
					const current = readJob();
					if (current && current.stage === "digitar") setStage("incluir");
				});
			}
		}

		if (job.stage !== "digitar" || digitarActed) return;
		const body = editorBody();
		if (!body) return; // CKEditor ainda carregando
		digitarActed = true;

		const placeholder = findPlaceholder(body);
		const win = body.ownerDocument.defaultView;
		if (job.pref.texto) {
			if (!placeholder) {
				showStatus('Não encontrei o marcador "INSIRA O TEXTO AQUI" no documento. Cole/digite o texto e clique em "Continuar" — a extensão continua daí.', "warn");
				return;
			}
			const last = insertText(body, placeholder, job.pref.texto);
			if (job.pref.autoContinuar) {
				const continuar = findButton(form, "Continuar");
				if (continuar) {
					showStatus('Texto inserido. Clicando em "Continuar"…');
					setStage("incluir");
					await sleep(400);
					continuar.click();
					return;
				}
			}
			if (last) {
				body.focus();
				const range = body.ownerDocument.createRange();
				range.selectNodeContents(last);
				range.collapse(false);
				win.getSelection().removeAllRanges();
				win.getSelection().addRange(range);
			}
			showStatus('Texto inserido. Revise e clique em "Continuar" — a extensão segue com "Confirmar Inclusão" e "Concluir Movimento".', "ok");
			return;
		}

		// Sem texto na preferência: seleciona o marcador para o usuário
		// digitar por cima.
		if (placeholder) {
			body.focus();
			const range = body.ownerDocument.createRange();
			range.selectNodeContents(placeholder);
			win.getSelection().removeAllRanges();
			win.getSelection().addRange(range);
		}
		showStatus('Digite o texto e clique em "Continuar" — a extensão segue com "Confirmar Inclusão" e "Concluir Movimento".', "ok");
	}

	// -------------------------------------------------------------------
	// Laço de verificação (cada frame cuida da sua tela)
	// -------------------------------------------------------------------

	function tick() {
		try {
			if (location.pathname.indexOf("tipoDocumento.do") !== -1) aprenderDaPesquisaTipoDocumento();
			const auto = document.getElementById("ajaxAuto_descricaoTipoDocumento");
			if (auto && !auto.__pdpJdWatch) {
				auto.__pdpJdWatch = true;
				new MutationObserver(function () {
					aprenderDoAutocompletar(auto);
				}).observe(auto, { childList: true, subtree: true });
			}

			const juntar = isJuntarScreen();
			const upload = !juntar && isUploadScreen();
			const digitar = !juntar && !upload && isDigitarScreen();
			if (upload) watchUploadScreen();

			const job = readJob();
			if (!job) {
				if (statusBar && !statusBar.classList.contains("pdp-jd-status-ok") && !statusBar.classList.contains("pdp-jd-status-warn")) removeStatus();
				return;
			}
			if (juntar) tickJuntar(job);
			else if (upload) tickUpload(job);
			else if (digitar) tickDigitar(job);
		} catch (err) {
			console.error(LOG, err);
		}
	}

	setInterval(tick, POLL_MS);
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
	else tick();

	// -------------------------------------------------------------------
	// Botão flutuante ao lado do "📋 Processo copiado" (quickActions.js) e
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
			button.title = 'Juntar um documento digitado: abre a tela "Juntar Documento" e, com uma preferência, preenche os tipos, abre o editor e segue até "Concluir Movimento"';
			button.addEventListener("click", function (e) {
				e.stopPropagation();
				if (panel) closePanel();
				else openPanel();
			});
		}
		// Imediatamente antes (à esquerda) do "Processo copiado": o lado
		// direito já é disputado pelo "(Des)Habilitar Advogado" e pelo
		// "Editar Partes/Outros", cada um ancorado no anterior.
		if (button.nextElementSibling !== clipboardBtn || button.parentElement !== clipboardBtn.parentElement) {
			clipboardBtn.insertAdjacentElement("beforebegin", button);
		}
	}

	new MutationObserver(reconcileButton).observe(document.documentElement, { childList: true, subtree: true });
	reconcileButton();

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
		let left = rect.left;
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
		openBtn.title = 'Só abre a tela "Juntar Documento", sem preencher nada';
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
		newBtn.title = "Cadastrar Tipo de Documento, Tipo do Arquivo, Modelo e texto para juntar com um clique";
		newBtn.addEventListener("click", function () {
			closePanel();
			openEditor(null);
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
				empty.textContent = 'Nenhuma preferência ainda. Use "+ Nova preferência".';
				wrap.appendChild(empty);
			}
			prefs.forEach(function (pref) {
				const chip = document.createElement("span");
				chip.className = "pdp-qa-pref-chip";

				const applyBtn = document.createElement("button");
				applyBtn.type = "button";
				applyBtn.className = "pdp-qa-pref-btn";
				applyBtn.textContent = "★ " + pref.name;
				applyBtn.title = 'Juntar com esta preferência:\n' + describePref(pref);
				applyBtn.addEventListener("click", function () {
					closePanel();
					iniciarJuntada(pref);
				});
				chip.appendChild(applyBtn);

				const editBtn = document.createElement("button");
				editBtn.type = "button";
				editBtn.className = "pdp-qa-pref-edit";
				editBtn.textContent = "✏️";
				editBtn.title = "Editar esta preferência";
				editBtn.addEventListener("click", function () {
					closePanel();
					openEditor(pref);
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

	// -------------------------------------------------------------------
	// Formulário de preferência (criar/editar)
	// -------------------------------------------------------------------

	let editor = null;

	function findByText(list, text, keyName) {
		const wanted = norm(text);
		const item = (list || []).filter(function (i) {
			return norm(i.text) === wanted;
		})[0];
		return item ? item[keyName] : null;
	}

	function fillDatalist(datalist, list) {
		datalist.innerHTML = "";
		(list || []).forEach(function (item) {
			const option = document.createElement("option");
			option.value = item.text;
			datalist.appendChild(option);
		});
	}

	function field(container, labelText, input, hint) {
		const row = document.createElement("label");
		row.className = "pdp-jd-field";
		const span = document.createElement("span");
		span.className = "pdp-jd-label";
		span.textContent = labelText;
		row.appendChild(span);
		row.appendChild(input);
		if (hint) {
			const small = document.createElement("small");
			small.textContent = hint;
			row.appendChild(small);
		}
		container.appendChild(row);
		return input;
	}

	function textInput(value, listId) {
		const input = document.createElement("input");
		input.type = "text";
		input.value = value || "";
		if (listId) input.setAttribute("list", listId);
		input.autocomplete = "off";
		return input;
	}

	function checkbox(container, labelText, checked, hint) {
		const row = document.createElement("label");
		row.className = "pdp-jd-check";
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = !!checked;
		row.appendChild(input);
		const span = document.createElement("span");
		span.textContent = labelText;
		row.appendChild(span);
		if (hint) row.title = hint;
		container.appendChild(row);
		return input;
	}

	function closeEditor() {
		if (editor) editor.remove();
		editor = null;
	}

	async function openEditor(pref) {
		closeEditor();
		const catalogo = (await storageGet(CATALOGO_KEY, {})) || {};
		const editing = !!pref;
		pref = pref || { autoConcluir: true };

		editor = document.createElement("div");
		editor.className = "pdp-jd-editor-backdrop";
		const box = document.createElement("div");
		box.className = "pdp-jd-editor";
		editor.appendChild(box);

		const title = document.createElement("h3");
		title.textContent = editing ? 'Editar preferência — Juntar Documento' : 'Nova preferência — Juntar Documento';
		box.appendChild(title);

		const uid = "pdp-jd-" + Date.now();
		const dlTipoDoc = document.createElement("datalist");
		dlTipoDoc.id = uid + "-tipodoc";
		fillDatalist(dlTipoDoc, catalogo.tiposDocumento);
		const dlTipoArq = document.createElement("datalist");
		dlTipoArq.id = uid + "-tipoarq";
		fillDatalist(dlTipoArq, catalogo.tiposArquivo);
		const dlModelo = document.createElement("datalist");
		dlModelo.id = uid + "-modelo";
		box.appendChild(dlTipoDoc);
		box.appendChild(dlTipoArq);
		box.appendChild(dlModelo);

		const nome = field(box, "Nome da preferência *", textInput(pref.name));
		nome.placeholder = "Ex.: Certidão de decurso";

		const tipoDoc = field(
			box,
			"Tipo de Documento (tela Juntar Documento) *",
			textInput(pref.tipoDocumento && pref.tipoDocumento.text, dlTipoDoc.id),
			"Exatamente como aparece no Projudi (ex.: CERTIDÃO, INFORMAÇÃO)."
		);

		const tipoArq = field(
			box,
			"Tipo do Arquivo (janela Inserir Arquivo) *",
			textInput(pref.tipoArquivo && pref.tipoArquivo.text, dlTipoArq.id),
			"Opção do campo \"Tipo do Arquivo\" (ex.: Certidão, Informação, Outros)."
		);

		const descricao = field(box, "Outros (Descrição)", textInput(pref.descricao), 'Só usada quando o Tipo do Arquivo é "Outros".');

		const modelo = field(
			box,
			"Modelo",
			textInput(pref.modelo && pref.modelo.text, dlModelo.id),
			'Deixe vazio para usar o modelo que o Projudi sugerir (ex.: "Documento em branco").'
		);

		function refreshModelos() {
			const value = findByText(catalogo.tiposArquivo, tipoArq.value, "value");
			fillDatalist(dlModelo, value && catalogo.modelos ? catalogo.modelos[value] : []);
		}
		tipoArq.addEventListener("input", refreshModelos);
		refreshModelos();

		const texto = document.createElement("textarea");
		texto.rows = 6;
		texto.value = pref.texto || "";
		texto.placeholder = 'Opcional. Substitui "XXXXXXXXXX INSIRA O TEXTO AQUI XXXXXXXXXX" no editor. Linha em branco separa parágrafos. Vazio: você digita na hora.';
		field(box, "Texto a inserir", texto);

		const autoContinuar = checkbox(
			box,
			'Clicar em "Continuar" sozinho depois de inserir o texto',
			pref.autoContinuar,
			"Só vale quando há texto na preferência. Desmarcado: você revisa o texto e clica em Continuar."
		);
		const autoConcluir = checkbox(
			box,
			'Clicar em "Concluir Movimento" sozinho (chama o assinador)',
			pref.autoConcluir,
			'Desmarcado: a extensão para na tela Juntar Documento com o botão "Concluir Movimento" destacado.'
		);

		function syncAutoContinuar() {
			autoContinuar.disabled = !texto.value.trim();
			autoContinuar.parentElement.classList.toggle("pdp-jd-disabled", autoContinuar.disabled);
		}
		texto.addEventListener("input", syncAutoContinuar);
		syncAutoContinuar();

		if (!(catalogo.tiposDocumento || []).length || !(catalogo.tiposArquivo || []).length) {
			const note = document.createElement("div");
			note.className = "pdp-qa-note";
			note.textContent =
				"As sugestões destes campos são aprendidas das telas do Projudi: abra uma vez a tela Juntar Documento (a pesquisa de Tipo de Documento) e a janela Inserir Arquivo para carregá-las. Também dá para digitar o texto exato.";
			box.appendChild(note);
		}

		const actions = document.createElement("div");
		actions.className = "pdp-jd-editor-actions";
		const cancel = document.createElement("button");
		cancel.type = "button";
		cancel.textContent = "Cancelar";
		cancel.addEventListener("click", closeEditor);
		const save = document.createElement("button");
		save.type = "button";
		save.className = "pdp-jd-primary";
		save.textContent = "Salvar preferência";
		save.addEventListener("click", function () {
			const name = nome.value.trim();
			const tipoDocText = tipoDoc.value.trim();
			const tipoArqText = tipoArq.value.trim();
			if (!name || !tipoDocText || !tipoArqText) {
				alert("Preencha o nome, o Tipo de Documento e o Tipo do Arquivo.");
				return;
			}
			const modeloText = modelo.value.trim();
			const tipoArqValue = findByText(catalogo.tiposArquivo, tipoArqText, "value");
			const updated = {
				id: pref.id || "jd-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
				name: name,
				tipoDocumento: {
					text: tipoDocText,
					id: findByText(catalogo.tiposDocumento, tipoDocText, "id"),
				},
				tipoArquivo: { text: tipoArqText, value: tipoArqValue },
				descricao: descricao.value.trim(),
				modelo: modeloText
					? {
							text: modeloText,
							value: tipoArqValue && catalogo.modelos ? findByText(catalogo.modelos[tipoArqValue], modeloText, "value") : null,
					  }
					: null,
				texto: texto.value.replace(/\s+$/, ""),
				autoContinuar: !!texto.value.trim() && autoContinuar.checked,
				autoConcluir: autoConcluir.checked,
				createdAt: pref.createdAt,
			};
			save.disabled = true;
			savePref(updated)
				.then(function () {
					closeEditor();
					openPanel();
				})
				.catch(function (err) {
					save.disabled = false;
					alert("Não foi possível salvar a preferência: " + err.message);
				});
		});
		actions.appendChild(cancel);
		actions.appendChild(save);
		box.appendChild(actions);

		editor.addEventListener("keydown", function (e) {
			if (e.key === "Escape") closeEditor();
		});
		document.body.appendChild(editor);
		nome.focus();
	}
})();
