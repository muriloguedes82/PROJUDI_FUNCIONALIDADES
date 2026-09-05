// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Injeta uma checkbox ao lado de cada link de arquivo da tela de
// Movimentações (mesmo padrão usado por content.js: <a class="link"
// href=".../arquivo.do?...">). Dois botões flutuantes aparecem sobre a
// tela: "Destinatários" (sempre visível, para cadastrar/remover/priorizar
// destinatários favoritos) e "Enviar por e-mail (N)" (visível quando pelo
// menos um arquivo é marcado).
//
// Ao clicar em "Enviar por e-mail": se houver destinatários salvos,
// primeiro é exibido um seletor para escolher um ou mais (com busca e os
// marcados como prioritários no topo); em seguida, os arquivos selecionados
// são baixados (reaproveitando a sessão do Projudi) e enviados ao
// background script, que cria um rascunho no Outlook (via Microsoft Graph)
// ou, no modo sem Azure AD, baixa os arquivos e abre o Outlook Web — em
// ambos os casos já com o(s) destinatário(s) escolhido(s) preenchido(s).

(function () {
	"use strict";

	if (window.__pdpEmailInjected) return;
	window.__pdpEmailInjected = true;

	const FILE_LINK_SELECTOR = 'a.link[href*="/arquivo.do"]';
	const RECIPIENTS_KEY = "pdpEmailRecipients";
	const MAX_RECIPIENTS = 200;

	// Rótulos da barra de ações inferior do Projudi (Pedido Incidental,
	// Juntar Documento, Peticionar, Patronato, Navegar, Exportar Processo,
	// Voltar). Usados apenas para localizar a barra e posicionar os botões
	// de e-mail logo acima dela, sem depender de classes/IDs internos do
	// Projudi que podem mudar.
	const TOOLBAR_LABELS = [
		"Peticionar",
		"Juntar Documento",
		"Patronato",
		"Exportar Processo",
		"Pedido Incidental",
		"Navegar",
		"Voltar",
	];
	const BUTTON_MARGIN = 12;
	const BUTTON_GAP = 8;

	const selected = new Map(); // href -> { href, name }
	let sendButton = null;
	let recipientsButton = null;
	let frameEligible = false;

	// ---------------------------------------------------------------------
	// Seleção de arquivos (checkboxes)
	// ---------------------------------------------------------------------

	function injectCheckbox(link) {
		if (link.dataset.pdpEmailChecked !== undefined) return;
		link.dataset.pdpEmailChecked = "";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "pdp-email-checkbox";
		checkbox.title = "Selecionar para enviar por e-mail";

		checkbox.addEventListener("click", function (e) {
			e.stopPropagation();
		});

		checkbox.addEventListener("change", function () {
			const href = link.getAttribute("href");
			const name = (link.textContent || "documento").trim();
			if (checkbox.checked) {
				selected.set(href, { href: href, name: name });
			} else {
				selected.delete(href);
			}
			updateSendButton();
		});

		link.parentNode.insertBefore(checkbox, link);
	}

	function scan(root) {
		if (root.querySelectorAll) {
			root.querySelectorAll(FILE_LINK_SELECTOR).forEach(injectCheckbox);
		}
	}

	// ---------------------------------------------------------------------
	// Botões flutuantes e posicionamento (acima da barra de ações)
	// ---------------------------------------------------------------------

	// Como o content script roda em todos os frames do Projudi (a barra de
	// ações e a lista de arquivos costumam ficar num frame específico do
	// frameset), só criamos os botões flutuantes no(s) frame(s) que
	// realmente têm a barra de ações ou algum link de arquivo — evita
	// botões duplicados sobrepostos vindos de outros frames vazios.
	function checkFrameEligible() {
		if (frameEligible) return true;
		if (document.querySelector(FILE_LINK_SELECTOR) || findActionToolbarElement()) {
			frameEligible = true;
		}
		return frameEligible;
	}

	function ensureButtons() {
		if (!checkFrameEligible()) return;
		if (!recipientsButton) {
			recipientsButton = document.createElement("button");
			recipientsButton.type = "button";
			recipientsButton.id = "pdp-recipients-button";
			recipientsButton.className = "pdp-email-visible";
			recipientsButton.textContent = "👥 Destinatários";
			recipientsButton.title = "Cadastrar, remover ou priorizar destinatários salvos";
			recipientsButton.addEventListener("click", function () {
				openRecipientsDialog({ mode: "manage" });
			});
			document.body.appendChild(recipientsButton);
		}
		if (!sendButton) {
			sendButton = document.createElement("button");
			sendButton.type = "button";
			sendButton.id = "pdp-email-button";
			sendButton.textContent = "Enviar por e-mail";
			sendButton.addEventListener("click", onSendClick);
			document.body.appendChild(sendButton);
		}
	}

	function findActionToolbarElement() {
		const candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
		for (const el of candidates) {
			const text = (el.textContent || el.value || "").trim();
			if (TOOLBAR_LABELS.indexOf(text) !== -1) return el;
		}
		return null;
	}

	let repositionScheduled = false;
	function scheduleReposition() {
		if (repositionScheduled) return;
		repositionScheduled = true;
		requestAnimationFrame(function () {
			repositionScheduled = false;
			ensureButtons();
			repositionButtons();
		});
	}

	function repositionButtons() {
		if (!recipientsButton) return;

		let baseBottom = BUTTON_MARGIN;
		const toolbarButton = findActionToolbarElement();
		if (toolbarButton) {
			// Sobe até um ancestral que representa a linha/barra inteira (tr,
			// div ou td), para medir o topo da barra como um todo, não só do
			// botão individual encontrado.
			const row = toolbarButton.closest("tr, div, td") || toolbarButton.parentElement || toolbarButton;
			const rect = row.getBoundingClientRect();

			// A barra de ações normalmente rola junto com o conteúdo (não é
			// fixa). Se ela estiver fora da área visível no momento (usuário
			// rolou para além dela, pra cima ou pra baixo), "rect.top" pode
			// ficar negativo ou muito grande, o que jogaria os botões para
			// fora da tela caso apenas subtraíssemos os valores. Nesse caso,
			// mantemos os botões simplesmente ancorados ao rodapé da janela —
			// o comportamento normal de um elemento fixo — em vez de
			// perseguir uma barra que não está à vista.
			const toolbarVisible = rect.bottom > 0 && rect.top < window.innerHeight;
			if (toolbarVisible) {
				const offset = Math.round(window.innerHeight - rect.top + BUTTON_MARGIN);
				baseBottom = Math.min(Math.max(BUTTON_MARGIN, offset), window.innerHeight - BUTTON_MARGIN);
			}
		}

		recipientsButton.style.bottom = baseBottom + "px";
		if (sendButton) {
			const recipientsHeight = recipientsButton.offsetHeight || 36;
			sendButton.style.bottom = baseBottom + recipientsHeight + BUTTON_GAP + "px";
		}
	}

	function updateSendButton() {
		ensureButtons();
		if (!sendButton) return;
		const count = selected.size;
		if (count === 0) {
			sendButton.classList.remove("pdp-email-visible");
			return;
		}
		sendButton.textContent = "Enviar por e-mail (" + count + ")";
		sendButton.classList.add("pdp-email-visible");
		repositionButtons();
	}

	// ---------------------------------------------------------------------
	// Destinatários salvos (chrome.storage.local)
	// ---------------------------------------------------------------------

	function loadRecipients() {
		return chrome.storage.local.get([RECIPIENTS_KEY]).then(function (data) {
			return data[RECIPIENTS_KEY] || [];
		});
	}

	function saveRecipients(list) {
		return chrome.storage.local.set({ [RECIPIENTS_KEY]: list });
	}

	function sortRecipients(list) {
		return list.slice().sort(function (a, b) {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
		});
	}

	function isValidEmail(email) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	async function addRecipient(name, email) {
		name = name.trim();
		email = email.trim();
		if (!name) throw new Error("Informe o nome do destinatário.");
		if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");

		const list = await loadRecipients();
		if (list.length >= MAX_RECIPIENTS) {
			throw new Error("Limite de " + MAX_RECIPIENTS + " destinatários salvos atingido.");
		}
		if (list.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
			throw new Error("Já existe um destinatário salvo com esse e-mail.");
		}
		list.push({ id: crypto.randomUUID(), name: name, email: email, pinned: false });
		await saveRecipients(list);
		return list;
	}

	async function removeRecipient(id) {
		const list = await loadRecipients();
		await saveRecipients(list.filter((r) => r.id !== id));
	}

	async function togglePinned(id) {
		const list = await loadRecipients();
		const item = list.find((r) => r.id === id);
		if (item) item.pinned = !item.pinned;
		await saveRecipients(list);
		return list;
	}

	// ---------------------------------------------------------------------
	// Diálogo de destinatários (gerenciar / escolher antes de enviar)
	// ---------------------------------------------------------------------

	function closeRecipientsDialog() {
		const existing = document.getElementById("pdp-recipients-overlay");
		if (existing) existing.remove();
	}

	// options.mode: "manage" (cadastrar/remover/priorizar, sem seleção) ou
	// "pick" (mostra checkboxes + botões Prosseguir/Pular, para escolher
	// destinatários antes de enviar). options.onProceed(emails) só é
	// chamado no modo "pick".
	async function openRecipientsDialog(options) {
		closeRecipientsDialog();
		const mode = options.mode;
		const checkedIds = new Set();

		const overlay = document.createElement("div");
		overlay.id = "pdp-recipients-overlay";
		overlay.innerHTML =
			'<div class="pdp-recipients-panel" role="dialog" aria-label="Destinatários salvos">' +
			'  <div class="pdp-recipients-header">' +
			"    <strong>" +
			(mode === "pick" ? "Selecionar destinatário(s)" : "Destinatários salvos") +
			"</strong>" +
			'    <button type="button" class="pdp-recipients-close" title="Fechar">✕</button>' +
			"  </div>" +
			'  <div class="pdp-recipients-search">' +
			'    <span class="pdp-recipients-search-icon">🔍</span>' +
			'    <input type="text" placeholder="Buscar por nome ou e-mail…" class="pdp-recipients-search-input" />' +
			"  </div>" +
			'  <div class="pdp-recipients-list"></div>' +
			'  <div class="pdp-recipients-add">' +
			'    <input type="text" class="pdp-recipients-add-name" placeholder="Nome" />' +
			'    <input type="email" class="pdp-recipients-add-email" placeholder="E-mail" />' +
			'    <button type="button" class="pdp-recipients-add-save">+ Adicionar</button>' +
			"  </div>" +
			'  <div class="pdp-recipients-error" hidden></div>' +
			'  <div class="pdp-recipients-footer" hidden>' +
			'    <button type="button" class="pdp-recipients-skip">Pular</button>' +
			'    <button type="button" class="pdp-recipients-proceed">Prosseguir</button>' +
			"  </div>" +
			"</div>";
		document.body.appendChild(overlay);

		const listEl = overlay.querySelector(".pdp-recipients-list");
		const searchInput = overlay.querySelector(".pdp-recipients-search-input");
		const errorEl = overlay.querySelector(".pdp-recipients-error");
		const footerEl = overlay.querySelector(".pdp-recipients-footer");

		function showError(msg) {
			errorEl.textContent = msg;
			errorEl.hidden = !msg;
		}

		async function render(filterText) {
			const list = sortRecipients(await loadRecipients());
			const filtered = !filterText
				? list
				: list.filter(function (r) {
						const haystack = (r.name + " " + r.email).toLowerCase();
						return haystack.indexOf(filterText.toLowerCase()) !== -1;
					});

			listEl.innerHTML = "";
			if (filtered.length === 0) {
				const empty = document.createElement("div");
				empty.className = "pdp-recipients-empty";
				empty.textContent = list.length === 0 ? "Nenhum destinatário salvo ainda." : "Nenhum resultado para essa busca.";
				listEl.appendChild(empty);
			}

			filtered.forEach(function (r) {
				const row = document.createElement("div");
				row.className = "pdp-recipients-row";

				if (mode === "pick") {
					const checkbox = document.createElement("input");
					checkbox.type = "checkbox";
					checkbox.className = "pdp-recipients-row-checkbox";
					checkbox.checked = checkedIds.has(r.id);
					checkbox.addEventListener("change", function () {
						if (checkbox.checked) checkedIds.add(r.id);
						else checkedIds.delete(r.id);
					});
					row.appendChild(checkbox);
				}

				const info = document.createElement("div");
				info.className = "pdp-recipients-row-info";
				info.innerHTML =
					"<span class=\"pdp-recipients-row-name\">" +
					escapeHtml(r.name) +
					"</span><span class=\"pdp-recipients-row-email\">" +
					escapeHtml(r.email) +
					"</span>";
				row.appendChild(info);

				const pinBtn = document.createElement("button");
				pinBtn.type = "button";
				pinBtn.className = "pdp-recipients-row-pin";
				pinBtn.title = r.pinned ? "Remover prioridade" : "Marcar como prioritário (aparece primeiro)";
				pinBtn.textContent = r.pinned ? "★" : "☆";
				pinBtn.addEventListener("click", async function () {
					await togglePinned(r.id);
					render(searchInput.value.trim());
				});
				row.appendChild(pinBtn);

				const removeBtn = document.createElement("button");
				removeBtn.type = "button";
				removeBtn.className = "pdp-recipients-row-remove";
				removeBtn.title = "Remover destinatário salvo";
				removeBtn.textContent = "🗑";
				removeBtn.addEventListener("click", async function () {
					checkedIds.delete(r.id);
					await removeRecipient(r.id);
					render(searchInput.value.trim());
				});
				row.appendChild(removeBtn);

				listEl.appendChild(row);
			});

			if (mode === "pick") footerEl.hidden = false;
		}

		searchInput.addEventListener("input", function () {
			render(searchInput.value.trim());
		});

		overlay.querySelector(".pdp-recipients-close").addEventListener("click", closeRecipientsDialog);
		overlay.addEventListener("click", function (e) {
			if (e.target === overlay) closeRecipientsDialog();
		});

		overlay.querySelector(".pdp-recipients-add-save").addEventListener("click", async function () {
			const nameInput = overlay.querySelector(".pdp-recipients-add-name");
			const emailInput = overlay.querySelector(".pdp-recipients-add-email");
			try {
				showError("");
				await addRecipient(nameInput.value, emailInput.value);
				nameInput.value = "";
				emailInput.value = "";
				render(searchInput.value.trim());
			} catch (err) {
				showError(err.message);
			}
		});

		if (mode === "pick") {
			overlay.querySelector(".pdp-recipients-skip").addEventListener("click", function () {
				closeRecipientsDialog();
				options.onProceed([]);
			});
			overlay.querySelector(".pdp-recipients-proceed").addEventListener("click", async function () {
				const list = await loadRecipients();
				const emails = list.filter((r) => checkedIds.has(r.id)).map((r) => r.email);
				closeRecipientsDialog();
				options.onProceed(emails);
			});
		}

		await render("");
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	// ---------------------------------------------------------------------
	// Envio (download dos anexos + mensagem para o background script)
	// ---------------------------------------------------------------------

	function fileToAttachment(href) {
		return fetch(href, { credentials: "include" }).then(function (resp) {
			if (!resp.ok) {
				throw new Error("Falha ao baixar documento (HTTP " + resp.status + ").");
			}
			return resp.blob();
		}).then(function (blob) {
			return new Promise(function (resolve, reject) {
				const reader = new FileReader();
				reader.onload = function () {
					const base64 = String(reader.result).split(",")[1] || "";
					resolve({ base64: base64, contentType: blob.type || "application/octet-stream" });
				};
				reader.onerror = function () {
					reject(reader.error || new Error("Falha ao ler o documento."));
				};
				reader.readAsDataURL(blob);
			});
		});
	}

	function subjectFromPage() {
		const match = document.title.match(/([\d.\-]{15,})/);
		return match ? "Documentos do processo " + match[1] : "Documentos do Projudi";
	}

	async function onSendClick() {
		if (selected.size === 0) return;

		const recipients = await loadRecipients();
		if (recipients.length > 0) {
			openRecipientsDialog({
				mode: "pick",
				onProceed: function (emails) {
					proceedSend(emails);
				},
			});
			return;
		}

		proceedSend([]);
	}

	async function proceedSend(recipientEmails) {
		const entries = Array.from(selected.values());
		sendButton.disabled = true;
		sendButton.textContent = "Preparando anexos…";

		try {
			const attachments = [];
			for (const entry of entries) {
				const file = await fileToAttachment(entry.href);
				attachments.push({
					name: entry.name,
					contentType: file.contentType,
					base64: file.base64,
				});
			}

			sendButton.textContent = "Enviando para o Outlook…";
			const response = await chrome.runtime.sendMessage({
				type: "SEND_EMAIL",
				subject: subjectFromPage(),
				recipients: recipientEmails,
				attachments: attachments,
			});

			if (!response || !response.ok) {
				throw new Error((response && response.error) || "Falha desconhecida ao preparar o e-mail.");
			}

			selected.clear();
			document.querySelectorAll(".pdp-email-checkbox").forEach(function (cb) {
				cb.checked = false;
			});
			updateSendButton();
		} catch (err) {
			alert("Não foi possível preparar o e-mail: " + err.message);
		} finally {
			sendButton.disabled = false;
			updateSendButton();
		}
	}

	// ---------------------------------------------------------------------

	ensureButtons();
	if (recipientsButton) repositionButtons();
	scan(document);

	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			mutation.addedNodes.forEach(function (node) {
				if (!(node instanceof Element)) return;
				if (node.matches && node.matches(FILE_LINK_SELECTOR)) injectCheckbox(node);
				scan(node);
			});
		});
		scheduleReposition();
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });

	window.addEventListener("resize", scheduleReposition);
	window.addEventListener("scroll", scheduleReposition, true);
})();
