// Projudi - Atalho "Editar Partes/Outros"
//
// Editar as partes do processo (adicionar, alterar, dar baixa) hoje exige:
// abrir a aba "Partes e Outros" e, na barra de botões ao final dela, clicar
// no botão nativo "Partes e Outros" — junto de "Advogados", "Histórico de
// Substabelecimentos" e "Desmembrar" —, que leva à tela "Partes do
// Processo" (lista de todas as partes, com "Adicionar" e "Voltar").
//
// Este botão pula esses passos e mostra essa tela num POPUP sobreposto à
// tela atual — o mesmo popup do painel "Ações rápidas" e do "(Des)Habilitar
// Advogado" (ver `openActionModal` em quickActions.js): a aba visível nunca
// navega, e o usuário fecha com "✕ Fechar" quando terminar.
//
// A URL final é resolvida antes de abrir o popup, com a mesma leitura da
// aba "Partes e Outros" do "(Des)Habilitar Advogado" (`__pdpLerAbaPartes`
// em habilitarAdvogado.js: o próprio DOM, se já é essa aba; senão, um
// `fetch()` em segundo plano) e lendo o `onclick` do botão nativo
// "Partes e Outros". O popup abre com um `src` comum (GET) no iframe.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpEditarPartes || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpEditarPartes = true;

	const NATIVE_LABEL = "Partes e Outros";

	function normalize(text) {
		return (text || "").replace(/\s+/g, " ").trim();
	}

	// O botão nativo é localizado pelo texto (não há id conhecido/estável),
	// só entre botões — o item de aba "Partes e Outros" tem o mesmo texto,
	// mas é um link/span com `setTab(...)`, não um botão.
	function findNativeButton(doc) {
		const candidates = doc.querySelectorAll('input[type="button"], input[type="submit"], button');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			if (el.id === "pdp-editar-partes-button") continue;
			if (normalize(el.value || el.textContent) === NATIVE_LABEL) return el;
		}
		return null;
	}

	function localURL(value) {
		const url = new URL(value, location.href);
		if (url.origin !== location.origin || !url.pathname.startsWith("/projudi/")) throw new Error("Endereço inesperado: " + value);
		return url;
	}

	// Mesmo formato do botão "Advogados" (`document.location.href = '...'`)
	// e, na falta dele, a primeira URL `.do` entre aspas do `onclick`.
	function findPartesUrl(doc) {
		const button = findNativeButton(doc);
		if (!button) return null;
		const onclick = button.getAttribute("onclick") || "";
		const match =
			/location\.href\s*=\s*(['"])([^'"]+)\1/.exec(onclick) ||
			/(['"])((?:https?:\/\/[^'"\/]+)?\/?[^'"\s]*\.do(?:\?[^'"]*)?)\1/.exec(onclick);
		if (!match) {
			console.info("[Projudi Editar Partes] onclick do botão nativo sem URL reconhecível: " + JSON.stringify(onclick));
			return null;
		}
		try {
			return localURL(match[2]);
		} catch (err) {
			console.info("[Projudi Editar Partes] " + err.message);
			return null;
		}
	}

	window.__pdpOpenEditarPartes = async function () {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}
		if (typeof window.__pdpLerAbaPartes !== "function") {
			throw new Error('Não encontrei a leitura da aba "Partes e Outros" (habilitarAdvogado.js).');
		}

		const aba = await window.__pdpLerAbaPartes();
		const url = findPartesUrl(aba.doc);
		if (!url) throw new Error('Não foi possível determinar o endereço da tela "Partes do Processo" a partir do botão nativo "Partes e Outros".');
		aba.checkContext();
		api.openActionModal("Partes do Processo", url.href);
	};

	// -------------------------------------------------------------------
	// Botão flutuante, na mesma linha do "📋 Processo copiado" — logo após
	// o "(Des)Habilitar Advogado", que já ocupa a posição imediatamente ao
	// lado dele (cada um ancorado no anterior, para os dois
	// MutationObservers não disputarem a mesma posição).
	// -------------------------------------------------------------------

	let button;

	function reconcile() {
		const clipboardBtn = document.getElementById("pdp-clipboard-button");
		if (!clipboardBtn) {
			if (button && button.isConnected) button.remove();
			return;
		}
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.id = "pdp-editar-partes-button";
			button.className = "pdp-qa-group-btn";
			button.textContent = "👥 Editar Partes/Outros";
			button.title = 'Abrir a tela "Partes do Processo" num popup, sem sair desta tela, para adicionar ou alterar partes';
			button.addEventListener("click", async function () {
				if (button.disabled) return;
				button.disabled = true;
				try {
					await window.__pdpOpenEditarPartes();
				} catch (error) {
					alert("Não foi possível abrir a tela de Partes: " + error.message);
				} finally {
					button.disabled = false;
				}
			});
		}
		const advogadoBtn = document.getElementById("pdp-habilitar-advogado-button");
		const anchor = advogadoBtn && advogadoBtn.parentElement === clipboardBtn.parentElement ? advogadoBtn : clipboardBtn;
		if (button.previousElementSibling !== anchor || button.parentElement !== anchor.parentElement) {
			anchor.insertAdjacentElement("afterend", button);
		}
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
