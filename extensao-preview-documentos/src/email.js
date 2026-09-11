// Projudi/SEEU - Envio de Documentos por E-mail (Outlook)
//
// Injeta uma checkbox ao lado de cada link de arquivo da tela de
// Movimentações (mesmo padrão usado por content.js: <a class="link"
// href=".../arquivo.do?...">, igual no Projudi e no SEEU). Dois botões
// flutuantes ficam sempre visíveis sobre a tela: "Destinatários"
// (cadastrar/remover/priorizar destinatários favoritos) e "Enviar por
// e-mail" — este último funciona com ou sem nenhum arquivo marcado, para
// permitir enviar um e-mail sem anexar documentos dos autos quando o
// usuário quiser.
//
// Ao clicar em "Enviar por e-mail": se houver destinatários salvos,
// primeiro é exibido um seletor para escolher um ou mais (com busca e os
// marcados como prioritários no topo); em seguida, o nome e o link de cada
// arquivo selecionado (se houver) são enviados ao background script — é lá
// que o download de fato acontece (não aqui, veja o motivo em
// src/background.js), que então cria um rascunho no Outlook (via
// Microsoft Graph) ou, no modo sem Azure AD, baixa os arquivos e abre o
// Outlook Web — em ambos os casos já com o(s) destinatário(s) escolhido(s)
// e um texto padrão no corpo (REF. AUTOS / JUÍZO, extraídos da própria
// tela do processo) preenchidos.

(function () {
	"use strict";

	if (window.__pdpEmailInjected) return;
	window.__pdpEmailInjected = true;

	const FILE_LINK_SELECTOR = 'a.link[href*="/arquivo.do"]';
	const RECIPIENTS_KEY = "pdpEmailRecipients";
	const MAX_RECIPIENTS = 200;
	const FROM_ACCOUNTS_KEY = "pdpFromAccounts";
	const DEFAULT_FROM_KEY = "pdpDefaultFromId";
	const MAX_FROM_ACCOUNTS = 20;

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
	let fromButton = null;
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
			// Usa a propriedade "href" (sempre absoluta), não getAttribute
			// ("href") (pode ser relativa, ex.: "arquivo.do?_tj=..." no
			// Projudi) — o link é enviado ao background script para o
			// download, e uma URL relativa não teria como ser resolvida
			// corretamente lá (o "base" do background é a extensão, não a
			// página do Projudi/SEEU).
			const href = link.href;
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

	// Algumas telas do Projudi/SEEU trocam de aba (Movimentações, Partes e
	// Outros, etc.) substituindo trechos inteiros do DOM via AJAX, em vez de
	// simplesmente escondê-los. Quando isso acontece, os elementos que
	// tínhamos criado (botões, checkboxes) são removidos da árvore, mas as
	// variáveis aqui ainda apontam para eles — daí a checagem "if (!X)"
	// sozinha não bastava, pois a variável continuava "preenchida" mesmo com
	// o elemento já fora do documento. Por isso também conferimos
	// "isConnected" (verdadeiro só enquanto o nó está de fato na página) e
	// recriamos o botão sempre que ele tiver sido desconectado.
	function ensureButtons() {
		if (!checkFrameEligible()) return;
		if (!recipientsButton || !recipientsButton.isConnected) {
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
		if (!fromButton || !fromButton.isConnected) {
			fromButton = document.createElement("button");
			fromButton.type = "button";
			fromButton.id = "pdp-from-button";
			fromButton.className = "pdp-email-visible";
			fromButton.textContent = "✉️ Remetente";
			fromButton.title = "Cadastrar remetentes e escolher o padrão ao abrir o Outlook";
			fromButton.addEventListener("click", function () {
				openFromAccountsDialog();
			});
			document.body.appendChild(fromButton);
		}
		if (!sendButton || !sendButton.isConnected) {
			sendButton = document.createElement("button");
			sendButton.type = "button";
			sendButton.id = "pdp-email-button";
			sendButton.className = "pdp-email-visible";
			sendButton.textContent = selected.size > 0 ? "Enviar por e-mail (" + selected.size + ")" : "Enviar por e-mail";
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

		let cursor = baseBottom;
		recipientsButton.style.bottom = cursor + "px";
		cursor += (recipientsButton.offsetHeight || 36) + BUTTON_GAP;

		if (fromButton) {
			fromButton.style.bottom = cursor + "px";
			cursor += (fromButton.offsetHeight || 36) + BUTTON_GAP;
		}

		if (sendButton) {
			sendButton.style.bottom = cursor + "px";
		}
	}

	// O botão de enviar fica sempre visível (mesmo sem nenhum arquivo
	// marcado), para permitir enviar um e-mail sem anexar documentos dos
	// autos quando o usuário quiser.
	function updateSendButton() {
		ensureButtons();
		if (!sendButton) return;
		const count = selected.size;
		sendButton.textContent = count > 0 ? "Enviar por e-mail (" + count + ")" : "Enviar por e-mail";
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
	// Remetentes salvos (chrome.storage.local) — o favorito ("padrão") é
	// lido diretamente por src/owa-attach.js, que tenta selecioná-lo no
	// campo "De" toda vez que o Outlook abre pela extensão. Só funciona se
	// o usuário já tiver permissão de "Enviar como" na conta desejada
	// (configuração do Exchange/TI, fora do controle da extensão).
	// ---------------------------------------------------------------------

	function loadFromAccounts() {
		return chrome.storage.local.get([FROM_ACCOUNTS_KEY, DEFAULT_FROM_KEY]).then(function (data) {
			return { accounts: data[FROM_ACCOUNTS_KEY] || [], defaultId: data[DEFAULT_FROM_KEY] || null };
		});
	}

	function saveFromAccounts(accounts) {
		return chrome.storage.local.set({ [FROM_ACCOUNTS_KEY]: accounts });
	}

	function setDefaultFromId(id) {
		return chrome.storage.local.set({ [DEFAULT_FROM_KEY]: id || null });
	}

	async function addFromAccount(label, email) {
		label = label.trim();
		email = email.trim();
		if (!label) throw new Error("Informe um nome para identificar o remetente.");
		if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");

		const { accounts } = await loadFromAccounts();
		if (accounts.length >= MAX_FROM_ACCOUNTS) {
			throw new Error("Limite de " + MAX_FROM_ACCOUNTS + " remetentes salvos atingido.");
		}
		if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
			throw new Error("Já existe um remetente salvo com esse e-mail.");
		}
		accounts.push({ id: crypto.randomUUID(), label: label, email: email });
		await saveFromAccounts(accounts);
		return accounts;
	}

	async function updateFromAccount(id, label, email) {
		label = label.trim();
		email = email.trim();
		if (!label) throw new Error("Informe um nome para identificar o remetente.");
		if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");

		const { accounts } = await loadFromAccounts();
		const item = accounts.find((a) => a.id === id);
		if (!item) throw new Error("Remetente não encontrado.");
		if (accounts.some((a) => a.id !== id && a.email.toLowerCase() === email.toLowerCase())) {
			throw new Error("Já existe um remetente salvo com esse e-mail.");
		}
		item.label = label;
		item.email = email;
		await saveFromAccounts(accounts);
		return accounts;
	}

	async function removeFromAccount(id) {
		const { accounts, defaultId } = await loadFromAccounts();
		await saveFromAccounts(accounts.filter((a) => a.id !== id));
		if (defaultId === id) await setDefaultFromId(null);
	}

	// ---------------------------------------------------------------------
	// Diálogo de remetentes (cadastrar / remover / favoritar o padrão)
	// ---------------------------------------------------------------------

	function closeFromAccountsDialog() {
		const existing = document.getElementById("pdp-from-overlay");
		if (existing) existing.remove();
	}

	async function openFromAccountsDialog() {
		closeFromAccountsDialog();

		const overlay = document.createElement("div");
		overlay.id = "pdp-from-overlay";
		overlay.className = "pdp-dialog-overlay";
		overlay.innerHTML =
			'<div class="pdp-recipients-panel" role="dialog" aria-label="Remetentes salvos">' +
			'  <div class="pdp-recipients-header">' +
			"    <strong>Remetentes salvos</strong>" +
			'    <button type="button" class="pdp-recipients-close" title="Fechar">✕</button>' +
			"  </div>" +
			'  <div class="pdp-from-hint">Marque a estrela do remetente que deve aparecer como padrão no campo ' +
			'"De" toda vez que o Outlook abrir pela extensão. Só funciona se a conta já tiver permissão de ' +
			'"Enviar como" configurada pelo TI — sem isso, o Outlook não vai oferecer essa opção.</div>' +
			'  <div class="pdp-recipients-list"></div>' +
			'  <div class="pdp-recipients-add">' +
			'    <input type="text" class="pdp-from-add-label" placeholder="Nome (ex.: Secretaria)" />' +
			'    <input type="email" class="pdp-from-add-email" placeholder="E-mail" />' +
			'    <button type="button" class="pdp-from-add-save">+ Adicionar</button>' +
			'    <button type="button" class="pdp-from-add-cancel" hidden>Cancelar edição</button>' +
			"  </div>" +
			'  <div class="pdp-recipients-error" hidden></div>' +
			"</div>";
		document.body.appendChild(overlay);

		const listEl = overlay.querySelector(".pdp-recipients-list");
		const errorEl = overlay.querySelector(".pdp-recipients-error");
		const labelInput = overlay.querySelector(".pdp-from-add-label");
		const emailInput = overlay.querySelector(".pdp-from-add-email");
		const saveBtn = overlay.querySelector(".pdp-from-add-save");
		const cancelBtn = overlay.querySelector(".pdp-from-add-cancel");
		let editingId = null;

		function showError(msg) {
			errorEl.textContent = msg;
			errorEl.hidden = !msg;
		}

		function enterEditMode(account) {
			editingId = account.id;
			labelInput.value = account.label;
			emailInput.value = account.email;
			saveBtn.textContent = "Salvar alterações";
			cancelBtn.hidden = false;
			labelInput.focus();
		}

		function exitEditMode() {
			editingId = null;
			labelInput.value = "";
			emailInput.value = "";
			saveBtn.textContent = "+ Adicionar";
			cancelBtn.hidden = true;
		}

		async function render() {
			const { accounts, defaultId } = await loadFromAccounts();

			listEl.innerHTML = "";
			if (accounts.length === 0) {
				const empty = document.createElement("div");
				empty.className = "pdp-recipients-empty";
				empty.textContent = "Nenhum remetente salvo ainda.";
				listEl.appendChild(empty);
			}

			accounts.forEach(function (a) {
				const isDefault = a.id === defaultId;
				const row = document.createElement("div");
				row.className = "pdp-recipients-row";

				const info = document.createElement("div");
				info.className = "pdp-recipients-row-info";
				info.innerHTML =
					"<span class=\"pdp-recipients-row-name\">" +
					escapeHtml(a.label) +
					"</span><span class=\"pdp-recipients-row-email\">" +
					escapeHtml(a.email) +
					"</span>";
				row.appendChild(info);

				const starBtn = document.createElement("button");
				starBtn.type = "button";
				starBtn.className = "pdp-recipients-row-pin";
				starBtn.title = isDefault ? "Remover como padrão" : "Marcar como remetente padrão";
				starBtn.textContent = isDefault ? "★" : "☆";
				starBtn.addEventListener("click", async function () {
					await setDefaultFromId(isDefault ? null : a.id);
					render();
				});
				row.appendChild(starBtn);

				const editBtn = document.createElement("button");
				editBtn.type = "button";
				editBtn.className = "pdp-recipients-row-edit";
				editBtn.title = "Editar nome/e-mail";
				editBtn.textContent = "✏️";
				editBtn.addEventListener("click", function () {
					enterEditMode(a);
				});
				row.appendChild(editBtn);

				const removeBtn = document.createElement("button");
				removeBtn.type = "button";
				removeBtn.className = "pdp-recipients-row-remove";
				removeBtn.title = "Remover remetente salvo";
				removeBtn.textContent = "🗑";
				removeBtn.addEventListener("click", async function () {
					if (editingId === a.id) exitEditMode();
					await removeFromAccount(a.id);
					render();
				});
				row.appendChild(removeBtn);

				listEl.appendChild(row);
			});
		}

		overlay.querySelector(".pdp-recipients-close").addEventListener("click", closeFromAccountsDialog);
		overlay.addEventListener("click", function (e) {
			if (e.target === overlay) closeFromAccountsDialog();
		});

		cancelBtn.addEventListener("click", function () {
			showError("");
			exitEditMode();
		});

		saveBtn.addEventListener("click", async function () {
			try {
				showError("");
				if (editingId) {
					await updateFromAccount(editingId, labelInput.value, emailInput.value);
				} else {
					await addFromAccount(labelInput.value, emailInput.value);
				}
				exitEditMode();
				render();
			} catch (err) {
				showError(err.message);
			}
		});

		await render();
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
		overlay.className = "pdp-dialog-overlay";
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
	// Envio (mensagem para o background script, que baixa os anexos)
	// ---------------------------------------------------------------------

	function subjectFromPage() {
		const match = document.title.match(/([\d.\-]{15,})/);
		return match ? "Documentos do processo " + match[1] : "Documentos do Projudi";
	}

	// Número dos autos: no Projudi vem de <em class="attention">; no SEEU
	// vem do cabeçalho do processo (div.titulo.processo, que mistura o
	// texto "Execução" com o número e alguns ícones/links — por isso
	// extraímos com regex em vez de usar o textContent inteiro). Como
	// última reserva, usa o mesmo padrão já usado em subjectFromPage,
	// aplicado ao título da página.
	function extractProcessNumber() {
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return projudiEl.textContent.trim();

		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl) {
			const seeuMatch = seeuEl.textContent.match(/([\d.\-]{15,})/);
			if (seeuMatch) return seeuMatch[1];
		}

		const match = document.title.match(/([\d.\-]{15,})/);
		return match ? match[1] : "";
	}

	// Juízo/vara: no SEEU vem do campo "Juízo:" da tabela de informações do
	// processo (td[data-label="juízo"], valor na célula seguinte); no
	// Projudi vem do link "área de atuação" do usuário no cabeçalho.
	function extractJudgeText() {
		const seeuLabelCell = document.querySelector('td[data-label="juízo"]');
		if (seeuLabelCell && seeuLabelCell.nextElementSibling) {
			const text = seeuLabelCell.nextElementSibling.textContent.trim();
			if (text) return text;
		}
		const projudiEl = document.querySelector("#areaatuacao");
		return projudiEl ? projudiEl.textContent.trim() : "";
	}

	// Monta o texto padrão inserido no início de todo e-mail, com o número
	// dos autos e o juízo, extraídos da própria tela do processo (Projudi
	// ou SEEU).
	function defaultBodyText() {
		const number = extractProcessNumber();
		const judge = extractJudgeText();

		const lines = [];
		if (number) lines.push("REF. AUTOS Nº (" + number + ")");
		if (judge) lines.push("JUÍZO: (" + judge + ")");
		if (lines.length === 0) return "";
		return lines.join("\n") + "\n\n";
	}

	async function onSendClick() {
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
		sendButton.textContent = entries.length > 0 ? "Baixando anexos…" : "Preparando e-mail…";

		try {
			// O download de cada arquivo é feito pelo background script (não
			// aqui), porque em alguns sistemas (ex.: SEEU) o link do arquivo
			// redireciona para um servidor de armazenamento (S3) que bloqueia
			// fetch() feito a partir da própria página por CORS — o service
			// worker da extensão não sofre essa restrição.
			const attachments = entries.map(function (entry) {
				return { name: entry.name, href: entry.href };
			});

			sendButton.textContent = "Enviando para o Outlook…";
			const response = await chrome.runtime.sendMessage({
				type: "SEND_EMAIL",
				subject: subjectFromPage(),
				body: defaultBodyText(),
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

	updateSendButton();
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
