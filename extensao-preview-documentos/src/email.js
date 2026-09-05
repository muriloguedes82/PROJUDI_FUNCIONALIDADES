// Projudi - Envio de Documentos por E-mail (Outlook)
//
// Injeta uma checkbox ao lado de cada link de arquivo da tela de
// Movimentações (mesmo padrão usado por content.js: <a class="link"
// href=".../arquivo.do?...">). Um botão flutuante "Enviar por e-mail"
// aparece assim que pelo menos um arquivo é marcado. Ao clicar, os arquivos
// selecionados são baixados (reaproveitando a sessão do Projudi), enviados
// ao background script, que cria um rascunho no Outlook (via Microsoft
// Graph) já com os anexos, e abre esse rascunho em uma janela pop-up menor
// sobre a tela do Projudi para o usuário preencher destinatário, assunto e
// mensagem.

(function () {
	"use strict";

	if (window.__pdpEmailInjected) return;
	window.__pdpEmailInjected = true;

	const FILE_LINK_SELECTOR = 'a.link[href*="/arquivo.do"]';

	const selected = new Map(); // href -> { href, name }
	let button = null;

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
			updateButton();
		});

		link.parentNode.insertBefore(checkbox, link);
	}

	function scan(root) {
		if (root.querySelectorAll) {
			root.querySelectorAll(FILE_LINK_SELECTOR).forEach(injectCheckbox);
		}
	}

	function ensureButton() {
		if (button) return button;
		button = document.createElement("button");
		button.type = "button";
		button.id = "pdp-email-button";
		button.textContent = "Enviar por e-mail";
		button.addEventListener("click", onSendClick);
		document.body.appendChild(button);
		return button;
	}

	function updateButton() {
		const count = selected.size;
		if (count === 0) {
			if (button) button.classList.remove("pdp-email-visible");
			return;
		}
		ensureButton();
		button.textContent = "Enviar por e-mail (" + count + ")";
		button.classList.add("pdp-email-visible");
	}

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

		const entries = Array.from(selected.values());
		button.disabled = true;
		button.textContent = "Preparando anexos…";

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

			button.textContent = "Enviando para o Outlook…";
			const response = await chrome.runtime.sendMessage({
				type: "SEND_EMAIL",
				subject: subjectFromPage(),
				attachments: attachments,
			});

			if (!response || !response.ok) {
				throw new Error((response && response.error) || "Falha desconhecida ao preparar o e-mail.");
			}

			selected.clear();
			document.querySelectorAll(".pdp-email-checkbox").forEach(function (cb) {
				cb.checked = false;
			});
			updateButton();
		} catch (err) {
			alert("Não foi possível preparar o e-mail: " + err.message);
		} finally {
			button.disabled = false;
			updateButton();
		}
	}

	scan(document);

	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			mutation.addedNodes.forEach(function (node) {
				if (!(node instanceof Element)) return;
				if (node.matches && node.matches(FILE_LINK_SELECTOR)) injectCheckbox(node);
				scan(node);
			});
		});
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });
})();
