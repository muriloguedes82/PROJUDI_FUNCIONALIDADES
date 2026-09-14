// Projudi - Botão "Nova Ordenação" nos diálogos de ordenação
// (Ordenar Cumprimentos, Ordenar RPV, Ordenar Expedição BNMP)
//
// Depois que o script de triagem roda num processo, é comum o usuário
// precisar ordenar mais de um cumprimento em seguida (ex.: um ofício, um
// mandado, um edital, uma requisição de laudo). Sem este recurso, ao
// clicar em "Ordenar" o Projudi encerra o fluxo e leva o usuário para a
// tela geral de "Ordenações" (não de volta ao processo), tendo que
// recomeçar manualmente todo o caminho até "Ordenar Cumprimentos" (painel
// Ações do processo) a cada nova ordenação.
//
// Este recurso adiciona um botão "🔁 Nova Ordenação" ao lado do botão
// nativo "Ordenar", dentro desses diálogos. Ele:
// 1. Clica no MESMO botão "Ordenar" nativo (nenhuma validação é pulada
//    nem reimplementada) - a ordenação é concretizada exatamente como
//    clicando em "Ordenar" normalmente, com a mesma navegação de saída
//    que o Projudi já faz sozinho.
// 2. Guarda um sinalizador (sessionStorage, sobrevive à navegação) antes
//    disso, com QUAL diálogo estava aberto.
// 3. Assim que a tela de "Ordenar Cumprimentos"/RPV/Expedição BNMP some
//    (ordenação concluída, Projudi já navegou para outra tela), usa esse
//    sinalizador para voltar automaticamente à tela anterior do processo
//    (`history.back()`, a mesma navegação que o botão "Voltar" do
//    navegador faria) e then reabrir o MESMO diálogo, reaproveitando a
//    lógica já pronta em src/quickActions.js (`window.__pdpQuickActions.
//    reopenAction`) — clique direto no link nativo quando já se está na
//    tela de Ações, ou a cadeia oculta em segundo plano (iframe fora da
//    tela, sem navegar a aba visível) quando não se está. Nada disso
//    pratica nenhum ato processual por conta própria: só reabre o
//    diálogo em branco, pronto para a próxima ordenação.
//
// O botão "Ordenar" original continua funcionando normalmente, sem
// nenhuma mudança de comportamento - "Nova Ordenação" é só um atalho a
// mais ao lado dele.

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
	const REOPEN_LABEL_KEY = "pdpReabrirOrdenacaoLabel";
	const REOPEN_WENT_BACK_KEY = "pdpReabrirOrdenacaoVoltou";
	const REOPEN_STARTED_AT_KEY = "pdpReabrirOrdenacaoDesde";
	const RECONCILE_INTERVAL_MS = 500;
	const MAX_ANCESTOR_HOPS = 8;
	// Tempo máximo tentando reabrir antes de desistir silenciosamente (evita
	// ficar navegando/tentando para sempre se a tela seguinte não for a
	// esperada por algum motivo imprevisto).
	const GIVE_UP_AFTER_MS = 12000;

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
	// Projudi) e identifica QUAL diálogo é, subindo alguns níveis a partir
	// do botão até achar um container cujo texto inclua um dos títulos
	// esperados.
	function findDialogTitle(button) {
		let node = button;
		for (let i = 0; i < MAX_ANCESTOR_HOPS && node; i++) {
			const text = node.textContent || "";
			for (let j = 0; j < DIALOG_TITLES.length; j++) {
				if (text.indexOf(DIALOG_TITLES[j]) !== -1) return DIALOG_TITLES[j];
			}
			node = node.parentElement;
		}
		return null;
	}

	function findOrdenacaoDialog(doc) {
		const button = findOrdenarButton(doc);
		if (!button) return null;
		const title = findDialogTitle(button);
		if (!title) return null;
		return { button: button, title: title };
	}

	function makeNovaOrdenacaoButton(ordenarBtn, title) {
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
		btn.title = 'Ordena e já reabre "' + title + '" em branco para a próxima ordenação (ex.: um ofício, um mandado, um edital), sem precisar recomeçar pelo processo.';
		btn.addEventListener("click", function (evt) {
			evt.preventDefault();
			try {
				sessionStorage.setItem(REOPEN_FLAG_KEY, "1");
				sessionStorage.setItem(REOPEN_LABEL_KEY, title);
				sessionStorage.setItem(REOPEN_STARTED_AT_KEY, String(Date.now()));
				sessionStorage.removeItem(REOPEN_WENT_BACK_KEY);
			} catch (err) {
				console.error("[Projudi Nova Ordenação]", "erro ao gravar sessionStorage:", err);
			}
			// Dispara o clique no botão NATIVO "Ordenar" de verdade — qualquer
			// validação/onclick que o Projudi já tenha definido roda
			// normalmente, exatamente como se o usuário tivesse clicado nele
			// (inclusive a navegação de saída que o Projudi já faz sozinho).
			ordenarBtn.click();
		});
		return btn;
	}

	function injectButton(dialog) {
		if (dialog.button.dataset[DONE_MARKER]) return;
		dialog.button.dataset[DONE_MARKER] = "1";
		const novoBtn = makeNovaOrdenacaoButton(dialog.button, dialog.title);
		dialog.button.insertAdjacentElement("afterend", novoBtn);
	}

	// -------------------------------------------------------------------
	// Reabertura automática após a ordenação
	// -------------------------------------------------------------------

	function clearReopenState() {
		sessionStorage.removeItem(REOPEN_FLAG_KEY);
		sessionStorage.removeItem(REOPEN_LABEL_KEY);
		sessionStorage.removeItem(REOPEN_WENT_BACK_KEY);
		sessionStorage.removeItem(REOPEN_STARTED_AT_KEY);
	}

	function maybeReopen() {
		let flag, label;
		try {
			flag = sessionStorage.getItem(REOPEN_FLAG_KEY);
			label = sessionStorage.getItem(REOPEN_LABEL_KEY);
		} catch (err) {
			return;
		}
		if (flag !== "1" || !label) return;

		// O diálogo ainda está aberto (validação falhou, ou ainda carregando
		// a navegação de saída) - espera a próxima checagem em vez de agir
		// agora.
		if (findOrdenacaoDialog(document)) return;

		const api = window.__pdpQuickActions;
		if (api && typeof api.reopenAction === "function" && api.reopenAction(label)) {
			clearReopenState();
			return;
		}

		// Ainda não estamos numa tela de onde dá para reabrir o diálogo
		// (provável tela de destino do "Ordenar" nativo, ex.: a listagem
		// geral de Ordenações) - volta uma vez para a tela anterior do
		// processo (a mesma navegação do botão "Voltar" do navegador), de
		// onde a próxima checagem deve conseguir reabrir.
		let startedAt;
		try {
			startedAt = Number(sessionStorage.getItem(REOPEN_STARTED_AT_KEY)) || Date.now();
		} catch (err) {
			startedAt = Date.now();
		}
		if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
			// Não conseguiu reabrir a tempo - desiste silenciosamente; a
			// ordenação em si já foi concretizada normalmente pelo "Ordenar"
			// nativo, só a reabertura automática não deu certo desta vez.
			clearReopenState();
			return;
		}

		let wentBack;
		try {
			wentBack = sessionStorage.getItem(REOPEN_WENT_BACK_KEY);
		} catch (err) {
			wentBack = null;
		}
		if (!wentBack) {
			try {
				sessionStorage.setItem(REOPEN_WENT_BACK_KEY, "1");
			} catch (err) {
				// ignora - sem persistência, na pior hipótese tenta de novo
			}
			history.back();
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
