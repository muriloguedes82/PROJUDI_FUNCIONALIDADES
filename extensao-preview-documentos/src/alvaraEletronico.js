// Projudi - Ação rápida "Alvará Eletrônico"
//
// Cadastrar um alvará eletrônico hoje exige: abrir a aba "Informações
// Adicionais" do processo, clicar no link de "Depósitos/Alvarás
// Eletrônicos - Integração CEF" ("Há N depósitos cadastrados (clique para
// visualizar)", `depositoEletronico.do`), na tela "Informações
// Financeiras" clicar no botão nativo "Novo Alvará" (name="btnNovoAlvara",
// `submitPage('/projudi/processo/alvaraEletronico.do?_tj=...',
// document.depositoEletronicoForm)`), escolher a "Modalidade" na primeira
// tela "Cadastrar Alvará Eletrônico" e só então chegar ao formulário
// completo (ex.: "Cadastrar Alvará Eletrônico - Pagamento ao beneficiário
// (ordem de pagamento/transferência)").
//
// Este arquivo só ensina esses passos ao painel "Ações rápidas"
// (quickActions.js), que ganha o grupo "🏦 Alvará Eletrônico" com os mesmos
// "Abrir", "+ Nova preferência" e preferências salvas das demais ações (ver
// "Ações personalizadas" e openCustomAction lá):
// 1. `resolveUrl()` descobre, em segundo plano, a URL da tela de depósitos:
//    o link já presente na página (se ela é a aba "Informações
//    Adicionais"), ou o mesmo link lido da aba buscada via `fetch()`
//    (`__pdpLerAbaProcesso` em habilitarAdvogado.js — mesma técnica do
//    "(Des)Habilitar Advogado").
// 2. O popup carrega essa tela (navegação de verdade, oculta) e `step()`
//    clica no "Novo Alvará" nativo DENTRO dele — o próprio `submitPage` do
//    Projudi faz o POST com o formulário e o token certos.
// 3. Na tela de Modalidade:
//    - "Abrir": mostra essa tela, para o usuário escolher;
//    - "+ Nova preferência": mostra essa tela, anota a modalidade que o
//      usuário escolher e, no formulário completo, oferece "Salvar como
//      preferência" — a preferência guarda a modalidade + os campos;
//    - preferência salva (e sua edição, ✏️): escolhe a modalidade
//      guardada sozinha (o `onchange` nativo do Projudi leva à tela
//      seguinte), com o popup ainda oculto — a tela de Modalidade é "pulada" e o usuário já vê o
//      formulário completo, preenchido com os campos da preferência.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

	if (window.__pdpAlvaraEletronico || !location.pathname.startsWith("/projudi/")) return;
	window.__pdpAlvaraEletronico = true;

	const LABEL = "Alvará Eletrônico";
	const DEPOSITOS_PATH = "/projudi/processo/depositoEletronico.do";
	const ALVARA_FORM_ID = "alvaraEletronicoForm";
	// Campos que só existem no formulário completo (segunda tela), em
	// qualquer modalidade.
	const FINAL_FIELD_NAMES = ["loginMagistrado", "naturezaAlvara", "codFinalidadePagamento", "valorPagar"];
	// Se a modalidade escolhida pela preferência não levar à tela seguinte
	// neste tempo, mostra a tela para o usuário seguir manualmente.
	const MODALIDADE_WAIT_MS = 6000;

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

	function isFinalScreen(doc) {
		return FINAL_FIELD_NAMES.some(function (name) {
			return !!doc.querySelector('[name="' + name + '"]');
		});
	}

	// Select "Modalidade" da primeira tela "Cadastrar Alvará Eletrônico":
	// pelo nome/id, ou pelo rótulo "Modalidade" na mesma linha.
	function findModalidadeSelect(doc) {
		const selects = Array.prototype.slice.call(doc.querySelectorAll("select"));
		const byName = selects.filter(function (sel) {
			return /modalidade/i.test((sel.name || "") + " " + (sel.id || ""));
		})[0];
		if (byName) return byName;
		return (
			selects.filter(function (sel) {
				const rowEl = sel.closest("tr");
				return !!rowEl && /modalidade/i.test(rowEl.textContent || "");
			})[0] || null
		);
	}

	function optionText(option) {
		return (option.textContent || "").replace(/\s+/g, " ").trim();
	}

	// Modalidade escolhida (ignora o "-- CLIQUE AQUI PARA SELECIONAR --").
	function selectedModalidade(select) {
		const option = select.options[select.selectedIndex];
		if (!option) return null;
		const text = optionText(option);
		if (option.value === "" || option.value === "-1" || /selecionar/i.test(text)) return null;
		return { value: option.value, text: text };
	}

	function rememberModalidade(ctx, select) {
		const chosen = selectedModalidade(select);
		if (!chosen) return;
		ctx.extra.modalidade = chosen;
		ctx.extra.descricao = "Modalidade: " + chosen.text;
	}

	function chooseModalidade(select, saved) {
		const options = Array.prototype.slice.call(select.options);
		const option =
			options.filter(function (o) {
				return o.value === saved.value;
			})[0] ||
			options.filter(function (o) {
				return optionText(o) === saved.text;
			})[0];
		if (!option) return false;
		select.value = option.value;
		select.dispatchEvent(new Event("input", { bubbles: true }));
		select.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
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

	// Chamado pelo popup a cada página carregada e periodicamente (ver
	// openCustomAction em quickActions.js). `ctx.actedDoc` é a última
	// página em que este script já agiu (clique/escolha): enquanto ela
	// continuar no popup, a navegação que a ação provoca ainda está em
	// andamento — só espera, sem agir de novo.
	function step(doc, ctx) {
		if (isFinalScreen(doc)) return { state: "ready" };

		const modalidade = findModalidadeSelect(doc);
		if (modalidade) {
			if (ctx.mode === "open") return { state: "ready" };
			// Anota a modalidade escolhida (lida a cada verificação e no
			// próprio "change", antes de a tela seguinte carregar) — pelo
			// usuário ou por este script.
			if (!modalidade.__pdpModalidadeWatch) {
				modalidade.__pdpModalidadeWatch = true;
				modalidade.addEventListener("change", function () {
					rememberModalidade(ctx, modalidade);
				});
			}
			rememberModalidade(ctx, modalidade);
			if (ctx.mode === "capture") return { state: "show" }; // o usuário escolhe
			// mode === "apply" | "edit"
			const saved = ctx.pref && ctx.pref.modalidade;
			if (!saved) return { state: "show" }; // preferência sem modalidade: o usuário escolhe
			if (doc === ctx.actedDoc) {
				// Já escolhida nesta tela — espera a tela seguinte; se ela não
				// vier, deixa o usuário seguir manualmente.
				return Date.now() - ctx.actedAt > MODALIDADE_WAIT_MS ? { state: "show" } : { state: "wait" };
			}
			if (ctx.modalidadeTried) {
				return { state: "fail", message: 'O Projudi voltou à tela de Modalidade depois de escolher "' + saved.text + '". Escolha a modalidade manualmente.' };
			}
			ctx.modalidadeTried = true;
			ctx.actedDoc = doc;
			ctx.actedAt = Date.now();
			if (!chooseModalidade(modalidade, saved)) {
				return { state: "fail", message: 'A modalidade "' + saved.text + '" desta preferência não está disponível neste processo. Escolha a modalidade manualmente.' };
			}
			return { state: "wait" };
		}

		if (doc === ctx.actedDoc) return { state: "wait" };

		const button = findNovoAlvaraButton(doc);
		if (button && !ctx.clickedNovo) {
			ctx.clickedNovo = true;
			ctx.actedDoc = doc;
			button.click();
			return { state: "wait" };
		}
		if (!ctx.clickedNovo) {
			return { state: "fail", message: 'Não encontrei o botão "Novo Alvará" na tela de Depósitos/Alvarás Eletrônicos. Verifique se você tem permissão para cadastrar alvarás neste processo.' };
		}
		return { state: "fail", message: 'O Projudi não abriu a tela "Cadastrar Alvará Eletrônico".' };
	}

	window.__pdpCustomActions = window.__pdpCustomActions || {};
	window.__pdpCustomActions[LABEL] = {
		resolveUrl: resolveUrl,
		step: step,
		formId: ALVARA_FORM_ID,
		// Só os campos do formulário completo que fazem sentido reaproveitar
		// entre processos (a modalidade vai à parte, em `modalidade`). Conta
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
