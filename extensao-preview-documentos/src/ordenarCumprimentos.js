// Projudi - Botão "Nova Ordenação" nos diálogos de ordenação
// (Ordenar Cumprimentos, Ordenar RPV, Ordenar Expedição BNMP)
//
// Depois que o script de triagem roda num processo, é comum o usuário
// precisar ordenar mais de um cumprimento em seguida (ex.: um ofício, um
// mandado, um edital, uma requisição de laudo). Sem este recurso, ao
// clicar em "Ordenar" o diálogo se fecha e o usuário volta para a tela
// inicial, tendo que reabrir manualmente "Ordenar Cumprimentos" (painel
// Ações) a cada nova ordenação.
//
// Este recurso adiciona um botão "🔁 Nova Ordenação" ao lado do botão
// nativo "Ordenar", dentro desses diálogos. Ele tem o MESMO efeito do
// "Ordenar" nativo (clica exatamente no botão original, disparando
// qualquer validação/onclick que o próprio Projudi já tenha definido —
// nada é reimplementado), mas guarda um sinalizador antes disso; quando o
// diálogo de ordenação some da tela (ordenação concluída), o sinalizador
// é consumido para reabrir automaticamente o MESMO diálogo em branco,
// pronto para a próxima ordenação, sem voltar para a tela inicial do
// processo.
//
// O Projudi abre esses diálogos como IFRAMES internos da própria página
// (ver README, seção "Ações rápidas" — mesma técnica do `openDialog`/
// `openDialogMaximized`), por isso este script (carregado com
// `all_frames: true`) roda tanto no documento principal quanto dentro do
// iframe do diálogo, dependendo de onde cada coisa acontece.

(function () {
	"use strict";

	if (window.__pdpNovaOrdenacaoInjected) return;
	window.__pdpNovaOrdenacaoInjected = true;

	// Títulos exatos dos diálogos de ordenação (mesmos rótulos do grupo
	// "Ordenações" em quickActions.js) para os quais faz sentido oferecer
	// "Nova Ordenação" — em vez de assumir a partir de nomes de campos que a
	// extensão não conhece com certeza (o Projudi não documenta o HTML
	// desses diálogos), a confirmação é pelo texto visível do diálogo.
	const DIALOG_TITLES = ["Ordenar Cumprimentos", "Ordenar RPV", "Ordenar Expedição BNMP"];

	const NEW_BUTTON_CLASS = "pdp-nova-ordenacao-btn";
	const DONE_MARKER = "pdpNovaOrdenacaoFeito";
	const REOPEN_FLAG_KEY = "pdpReabrirOrdenacao";
	const REOPEN_URL_KEY = "pdpReabrirOrdenacaoUrl";
	const RECONCILE_INTERVAL_MS = 500;
	const MAX_ANCESTOR_HOPS = 8;

	function normalizeText(el) {
		return (el.textContent || "").replace(/\s+/g, " ").trim();
	}

	function isVisible(el) {
		if (!el || !el.isConnected) return false;
		const rect = el.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return false;
		const style = window.getComputedStyle(el);
		return style.display !== "none" && style.visibility !== "hidden";
	}

	// Acha o botão "Ordenar" visível cujo botão "Cancelar" fica logo ao
	// lado (mesmo container imediato) — o par de botões do rodapé desses
	// diálogos, como visto na tela "Ordenar Cumprimentos".
	function findOrdenarButton(doc) {
		const controls = doc.querySelectorAll('input[type="submit"], input[type="button"], button');
		for (let i = 0; i < controls.length; i++) {
			const c = controls[i];
			if (!isVisible(c)) continue;
			const label = (c.value || normalizeText(c) || "").trim();
			if (label !== "Ordenar") continue;
			const parent = c.parentElement;
			if (!parent) continue;
			const hasCancelar = Array.prototype.some.call(parent.children, function (sibling) {
				const siblingLabel = (sibling.value || normalizeText(sibling) || "").trim();
				return siblingLabel === "Cancelar";
			});
			if (hasCancelar) return c;
		}
		return null;
	}

	// Confirma que o par de botões encontrado pertence mesmo a um dos
	// diálogos de ordenação (e não a outro par "Ordenar"/"Cancelar" do
	// Projudi), subindo alguns níveis a partir do botão até achar um
	// container cujo texto inclua um dos títulos esperados.
	function findDialogContainer(button) {
		let node = button;
		for (let i = 0; i < MAX_ANCESTOR_HOPS && node; i++) {
			const text = node.textContent || "";
			for (let j = 0; j < DIALOG_TITLES.length; j++) {
				if (text.indexOf(DIALOG_TITLES[j]) !== -1) return node;
			}
			node = node.parentElement;
		}
		return null;
	}

	function findOrdenacaoDialog(doc) {
		const button = findOrdenarButton(doc);
		if (!button) return null;
		const container = findDialogContainer(button);
		if (!container) return null;
		return { button: button, container: container };
	}

	function makeNovaOrdenacaoButton(ordenarBtn) {
		const btn = ordenarBtn.cloneNode(true);
		btn.removeAttribute("id");
		btn.removeAttribute("name");
		btn.removeAttribute("onclick");
		btn.type = "button";
		btn.classList.add(NEW_BUTTON_CLASS);
		if (btn.tagName === "INPUT") {
			btn.value = "🔁 Nova Ordenação";
		} else {
			btn.textContent = "🔁 Nova Ordenação";
		}
		btn.title = 'Ordena e já reabre esta tela em branco para a próxima ordenação (ex.: um ofício, um mandado, um edital), sem voltar para a tela inicial.';
		btn.addEventListener("click", function (evt) {
			evt.preventDefault();
			try {
				sessionStorage.setItem(REOPEN_FLAG_KEY, "1");
				sessionStorage.setItem(REOPEN_URL_KEY, window.location.href);
			} catch (err) {
				console.error("[Projudi Nova Ordenação]", "erro ao gravar sessionStorage:", err);
			}
			// Dispara o clique no botão NATIVO "Ordenar" de verdade — qualquer
			// validação/onclick que o Projudi já tenha definido roda
			// normalmente, exatamente como se o usuário tivesse clicado nele.
			ordenarBtn.click();
		});
		return btn;
	}

	function injectButton(dialog) {
		if (dialog.button.dataset[DONE_MARKER]) return;
		dialog.button.dataset[DONE_MARKER] = "1";
		const novoBtn = makeNovaOrdenacaoButton(dialog.button);
		dialog.button.insertAdjacentElement("afterend", novoBtn);
	}

	// -------------------------------------------------------------------
	// Reabertura automática após a ordenação
	// -------------------------------------------------------------------

	function findReopenLinkIn(doc) {
		const links = doc.querySelectorAll("a.link");
		for (let i = 0; i < links.length; i++) {
			const text = normalizeText(links[i]);
			if (DIALOG_TITLES.indexOf(text) !== -1) return links[i];
		}
		return null;
	}

	// Tenta reabrir pelo link nativo do painel Ações — preferível a recarregar
	// a URL do diálogo "na mão", porque esses diálogos costumam levar um
	// token de uso único na URL (`_tj=...`, ver quickActions.js); clicar de
	// novo no link nativo faz o Projudi gerar um diálogo (e token) novos.
	function tryReopenViaLink() {
		let link = findReopenLinkIn(document);
		if (link) {
			link.click();
			return true;
		}
		try {
			if (window.parent && window.parent !== window && window.parent.document) {
				link = findReopenLinkIn(window.parent.document);
				if (link) {
					link.click();
					return true;
				}
			}
		} catch (err) {
			// Acesso entre frames bloqueado (ex.: origem diferente) - ignora e
			// cai no fallback abaixo.
		}
		return false;
	}

	function maybeReopen() {
		let flag;
		try {
			flag = sessionStorage.getItem(REOPEN_FLAG_KEY);
		} catch (err) {
			return;
		}
		if (flag !== "1") return;
		// O diálogo ainda está aberto (validação falhou, ou ainda carregando)
		// - espera a próxima checagem em vez de agir agora.
		if (findOrdenacaoDialog(document)) return;

		if (tryReopenViaLink()) {
			sessionStorage.removeItem(REOPEN_FLAG_KEY);
			sessionStorage.removeItem(REOPEN_URL_KEY);
			return;
		}

		// Não achou o link nativo em nenhum frame acessível (provável iframe
		// isolado do próprio diálogo, já navegado para uma tela de
		// sucesso/confirmação) - último recurso: recarrega a mesma URL que
		// abriu o diálogo, reabrindo-o em branco.
		let url;
		try {
			url = sessionStorage.getItem(REOPEN_URL_KEY);
		} catch (err) {
			url = null;
		}
		if (url) {
			sessionStorage.removeItem(REOPEN_FLAG_KEY);
			sessionStorage.removeItem(REOPEN_URL_KEY);
			if (url !== window.location.href) window.location.href = url;
		}
	}

	// -------------------------------------------------------------------
	// Reconciliação (mesmo padrão de quickActions.js: intervalo curto +
	// MutationObserver, com try/catch para nunca travar a tela do Projudi)
	// -------------------------------------------------------------------

	function reconcile() {
		try {
			const dialog = findOrdenacaoDialog(document);
			if (dialog) injectButton(dialog);
			maybeReopen();
		} catch (err) {
			console.error("[Projudi Nova Ordenação]", "erro ao reconciliar:", err);
		}
	}

	setInterval(reconcile, RECONCILE_INTERVAL_MS);
	reconcile();

	const observer = new MutationObserver(function () {
		try {
			reconcile();
		} catch (err) {
			console.error("[Projudi Nova Ordenação]", "erro no MutationObserver:", err);
		}
	});
	observer.observe(document.documentElement, { childList: true, subtree: true });
})();
