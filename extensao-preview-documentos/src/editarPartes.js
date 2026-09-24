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
// "Partes e Outros" (id="enableParteButton", `document.location.href =
// '/projudi/processo/parteProcesso.do?_tj=...'`). O popup abre com um
// `src` comum (GET) no iframe.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpEditarPartes || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpEditarPartes = true;

	const PARTES_PATH = "/projudi/processo/parteProcesso.do";

	// Botão nativo, na barra ao final da aba "Partes e Outros":
	// <input type="button" name="enableParteButton" id="enableParteButton"
	//   value="Partes e Outros" onclick="disableScreen();
	//   document.location.href='/projudi/processo/parteProcesso.do?_tj=...'">
	// Na falta do id, procura pelo texto — só entre botões, pois o item de
	// aba "Partes e Outros" tem o mesmo texto, mas é um link com `setTab(...)`.
	function findNativeButton(doc) {
		const byId = doc.getElementById("enableParteButton");
		if (byId) return byId;
		const candidates = doc.querySelectorAll('input[type="button"], input[type="submit"], button');
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			if (el.id === "pdp-editar-partes-button") continue;
			if ((el.value || el.textContent || "").replace(/\s+/g, " ").trim() === "Partes e Outros") return el;
		}
		return null;
	}

	// Mesmo formato (e mesma validação) do botão "Advogados" em
	// habilitarAdvogado.js.
	function findPartesUrl(doc) {
		const button = findNativeButton(doc);
		const onclick = button ? button.getAttribute("onclick") || "" : "";
		const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(onclick);
		if (!hrefMatch) return null;
		try {
			const url = new URL(hrefMatch[2], location.href);
			if (url.origin !== location.origin || url.pathname !== PARTES_PATH) return null;
			return url;
		} catch (err) {
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
