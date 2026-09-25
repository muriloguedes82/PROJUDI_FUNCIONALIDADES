// Projudi - Ação rápida "Alvará Eletrônico"
//
// Cadastrar um alvará eletrônico hoje exige: abrir a aba "Informações
// Adicionais" do processo, clicar no link de "Depósitos/Alvarás
// Eletrônicos - Integração CEF" ("Há N depósitos cadastrados (clique para
// visualizar)", `depositoEletronico.do`), e na tela "Informações
// Financeiras" clicar no botão nativo "Novo Alvará" (name="btnNovoAlvara",
// `submitPage('/projudi/processo/alvaraEletronico.do?_tj=...',
// document.depositoEletronicoForm)`), que leva à tela "Cadastrar Alvará
// Eletrônico - Pagamento ao beneficiário".
//
// Este arquivo só ensina esses passos ao painel "Ações rápidas"
// (quickActions.js), que ganha o grupo "🏦 Alvará Eletrônico" com os mesmos
// "Abrir", "+ Nova preferência" e preferências salvas das demais ações (ver
// CUSTOM_ACTIONS e openCustomAction lá):
// 1. `resolveUrl()` descobre, em segundo plano, a URL da tela de depósitos:
//    o link já presente na página (se ela é a aba "Informações
//    Adicionais"), ou o mesmo link lido da aba buscada via `fetch()`
//    (`__pdpLerAbaProcesso` em habilitarAdvogado.js — mesma técnica do
//    "(Des)Habilitar Advogado").
// 2. O popup carrega essa tela (navegação de verdade, oculta até o fim) e
//    `step(doc)` clica no "Novo Alvará" nativo DENTRO dele — o próprio
//    `submitPage` do Projudi faz o POST com o formulário e o token certos,
//    sem reconstruir nada — até chegar ao formulário do alvará
//    (id="alvaraEletronicoForm"), que é o único mostrado ao usuário.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpAlvaraEletronico || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpAlvaraEletronico = true;

	const LABEL = "Alvará Eletrônico";
	const DEPOSITOS_PATH = "/projudi/processo/depositoEletronico.do";
	const ALVARA_FORM_ID = "alvaraEletronicoForm";

	// Link "Há N depósitos cadastrados (clique para visualizar)" da linha
	// "Depósitos/Alvarás Eletrônicos - Integração CEF" da aba "Informações
	// Adicionais". É o único `a.link` dessa aba apontando para
	// depositoEletronico.do (os botões "Novo Depósito" ficam na tela
	// seguinte).
	function findDepositosUrl(doc) {
		const links = doc.querySelectorAll("a[href]");
		for (let i = 0; i < links.length; i++) {
			let url;
			try {
				url = new URL(links[i].getAttribute("href"), location.href);
			} catch (err) {
				continue;
			}
			if (url.origin === location.origin && url.pathname === DEPOSITOS_PATH) return url;
		}
		return null;
	}

	function findNovoAlvaraButton(doc) {
		const byName = doc.querySelector('input[name="btnNovoAlvara"]');
		if (byName) return byName;
		const candidates = doc.querySelectorAll('input[type="button"], input[type="submit"], button');
		for (let i = 0; i < candidates.length; i++) {
			if ((candidates[i].value || candidates[i].textContent || "").replace(/\s+/g, " ").trim() === "Novo Alvará") return candidates[i];
		}
		return null;
	}

	async function resolveUrl() {
		const local = findDepositosUrl(document);
		if (local) return local.href;
		if (typeof window.__pdpLerAbaProcesso !== "function") {
			throw new Error('Não encontrei a leitura das abas do processo (habilitarAdvogado.js).');
		}
		const aba = await window.__pdpLerAbaProcesso("tabDadosAdicionais", "Informações Adicionais");
		const url = findDepositosUrl(aba.doc);
		if (!url) {
			throw new Error(
				'Não encontrei o link "Depósitos/Alvarás Eletrônicos - Integração CEF" na aba "Informações Adicionais" deste processo.'
			);
		}
		aba.checkContext();
		return url.href;
	}

	// Chamado a cada página carregada no popup (ainda oculto). `clicked`
	// indica se o "Novo Alvará" já foi clicado nesta abertura — nunca clica
	// duas vezes, para não entrar em laço caso o Projudi volte à tela de
	// depósitos (ex.: mensagem de erro).
	function step(doc, clicked) {
		if (doc.getElementById(ALVARA_FORM_ID)) return { state: "ready" };
		if (!clicked) {
			const button = findNovoAlvaraButton(doc);
			if (button) {
				button.click();
				return { state: "clicked" };
			}
			return { state: "fail", message: 'Não encontrei o botão "Novo Alvará" na tela de Depósitos/Alvarás Eletrônicos. Verifique se você tem permissão para cadastrar alvarás neste processo.' };
		}
		return { state: "fail", message: 'O Projudi não abriu a tela "Cadastrar Alvará Eletrônico".' };
	}

	window.__pdpCustomActions = window.__pdpCustomActions || {};
	window.__pdpCustomActions[LABEL] = {
		resolveUrl: resolveUrl,
		step: step,
		formId: ALVARA_FORM_ID,
		// Só os campos que fazem sentido reaproveitar entre processos. Conta
		// judicial, beneficiário, sacadores, advogado, dados bancários,
		// datas e valores dependem de cada processo/pagamento (e vários
		// deles são campos só-leitura preenchidos por pesquisa, com um id
		// oculto por trás) — ficam sempre para o usuário preencher.
		prefFields: [
			"loginMagistrado",
			"urgente",
			"naturezaAlvara",
			"codRepresentacaoProcessual",
			"codFinalidadePagamento",
			"tipoCredito",
			"observacao",
		],
		// Ao aplicar uma preferência, só preenche: o alvará ainda precisa de
		// conta, beneficiário e valor, então o "Salvar" fica com o usuário
		// (sem a barra "Sim, executar").
		confirmAfterApply: false,
	};
})();
