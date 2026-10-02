// Cenas V34–V35: Menu da extensão e endereço/Mandado Regionalizado (versões 2.9.89–2.9.91).
"use strict";

// Catálogo do Menu (espelha src/funcionalidades.js).
const MENU = [
	["Documentos e movimentações", [
		["preview", "Pré-visualização e WhatsApp", "Íntegra do documento ao passar o mouse e envio de arquivos por WhatsApp Web."],
		["email", "Envio por e-mail (Outlook)", "Botão \"✉️ Enviar por e-mail\" com destinatários e remetentes salvos."],
		["destaque", "Destaque de movimentações", "Cores por tipo de usuário (Magistrado, MP, Advogado) na aba Movimentações."],
		["expandir", "Expandir anexos / ocultar sem arquivo", "Expande os anexos e oculta movimentações sem arquivo."]]],
	["Ações rápidas e atalhos", [
		["acoesRapidas", "Ações rápidas e Minhas Preferências", "Botões do painel \"Ações\", preferências salvas e combos."],
		["habilitarAdvogado", "(Des)Habilitar Advogado", "Tela de advogados do processo num popup.", ["acoesRapidas"]],
		["editarPartes", "Editar Partes/Outros", "Tela \"Partes do Processo\" num popup.", ["acoesRapidas", "habilitarAdvogado"]],
		["alvara", "Alvará Eletrônico", "Cadastro de alvará eletrônico pelo painel de Ações rápidas.", ["acoesRapidas", "habilitarAdvogado"]],
		["juntarDocumento", "Juntar Documento", "Juntada de documento digitado com preferências gravadas.", ["acoesRapidas"]],
		["oraculo", "Oráculo", "Atalho para a consulta de antecedentes da parte."]]],
	["Informações do processo", [
		["reus", "Réus no cabeçalho", "Réus/Indiciados/Noticiados, com RG e CPF, no cabeçalho do processo."],
		["suspensao", "Indicador de suspensão ativa", "Card ao lado do número do processo com suspensões ativas."]]],
	["Pendências, mesa e listas", [
		["listaTarefas", "Listas de tarefas", "Bolinhas coloridas e tarefas escritas nas telas de análise."],
		["prefLinha", "Minhas Preferências na linha (⭐)", "Aplica preferências e combos direto na linha do processo.", ["listaTarefas", "acoesRapidas"]]]],
];

function abrirMenu() {
	const itens = MENU.flatMap(g => g[1]);
	const estado = Object.fromEntries(itens.map(i => [i[0], true]));
	const nome = id => itens.find(i => i[0] === id)[1];
	let html = "";
	for (const [g, lista] of MENU) {
		html += '<div class="gh">' + g + "</div>";
		for (const [id, n, d, rq] of lista)
			html += '<div class="it" data-id="' + id + '"><span class="sw"></span><div><div class="nm">' + n + '</div><div class="ds">' + d + "</div>" + (rq ? '<div class="rq">Requer: ' + rq.map(nome).join(", ") + "</div>" : "") + "</div></div>";
	}
	const m = add('<div id="x-menu"><div class="mh"><div><b>Menu da extensão</b><small>Projudi/SEEU · versão ' + VERSAO_EXTENSAO + '</small></div><span class="mx">✕</span></div>' +
		'<div class="geral" id="mgeral"><span class="sw" id="mgsw"></span><div><div class="nm" id="mgnm">Extensão ativada no PROJUDI</div><div class="ds" id="mgds">Desligue para pausar todas as funcionalidades sem perder suas escolhas.</div></div></div>' +
		'<div class="abas"><span class="aba sel">PROJUDI <small>(este)</small></span><span class="aba">SEEU</span></div>' +
		'<div class="mb"><div class="mb-in"><div class="cnt" id="mcnt">Funcionalidades: 25 de 25 ativas</div>' + html + '</div><div class="aviso" id="mav" hidden></div></div>' +
		'<div class="mf"><h4>Preferências e combos</h4><div class="btns"><span class="bt" id="m-exp">⬇ Exportar</span><span class="bt" id="m-imp">⬆ Importar</span><span class="bt" id="m-pad">↺ Padrão</span></div>' +
		'<div class="nota">Use "Exportar" e, no outro computador, "Importar" o mesmo arquivo para levar tudo junto. <u>Termos de Uso</u>.</div><div class="bt manual" id="m-manual">📖 Manual do Usuário</div></div></div>');
	const api = {
		el: m,
		async geral(ligar) {
			await S.click("#mgsw");
			$("#mgsw").classList.toggle("off", !ligar);
			$("#mgeral").classList.toggle("off", !ligar);
			$("#mgnm").textContent = ligar ? "Extensão ativada no PROJUDI" : "Extensão desativada no PROJUDI";
			$("#mgds").textContent = ligar ? "Desligue para pausar todas as funcionalidades sem perder suas escolhas." : "Nenhuma funcionalidade funciona até você ativar de novo. Suas escolhas ficam guardadas.";
			$("#x-menu .mb-in").style.opacity = ligar ? 1 : .45;
			$("#x-menuicon .dot").hidden = ligar;
		},
		aviso(t, ok) { const a = $("#mav"); a.hidden = false; a.className = "aviso" + (ok ? " ok" : ""); a.innerHTML = t; },
		semAviso() { $("#mav").hidden = true; },
		async mudar(id, ligar) {
			const nodo = $('[data-id="' + id + '"] .sw');
			await S.click(nodo);
			const extras = [];
			const set = (i, v) => { if (estado[i] !== v) { estado[i] = v; $('[data-id="' + i + '"] .sw').classList.toggle("off", !v); } };
			estado[id] = ligar; nodo.classList.toggle("off", !ligar);
			if (!ligar) itens.forEach(([i, , , rq]) => { if (estado[i] && (rq || []).some(r => !estado[r])) { set(i, false); extras.push(i); } });
			else (itens.find(i => i[0] === id)[3] || []).forEach(r => { if (!estado[r]) { set(r, true); extras.push(r); } });
			const n = Object.values(estado).filter(Boolean).length + 25 - itens.length - (window.__fora || 0);
			$("#mcnt").textContent = "Funcionalidades: " + n + " de 25 ativas";
			$("#x-menuicon .dot").hidden = n === 25;
			api.aviso(extras.length ? (ligar ? "Também ativada(s), pois são necessárias: " : "Também desativada(s), pois dependem dela: ") + extras.map(nome).join(", ") + "." : "As mudanças valem a partir do próximo carregamento da página. <b>Recarregar agora</b>");
			return extras;
		},
		async rolar(y, ms = 900) { const b = $("#x-menu .mb-in"); const y0 = -parseFloat(b.style.top || "0"); await tween(ms, k => (b.style.top = -(y0 + (y - y0) * k) + "px")); },
	};
	return api;
}

// ------------------------------------------------------------------ V34
CENAS.V34 = {
	arquivo: "V34-menu-da-extensao.mp4",
	titulo: "Menu da extensão (ícone da balança)",
	secao: "2.6",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V34", "Menu da extensão", "Ligue e desligue funções, leve suas preferências a outro computador e abra o manual.");
		S.hl("#x-menuicon", 5);
		await S.cap("No canto superior direito, logo abaixo de <b>Sair</b>, fica o <b>ícone da balança</b>: o Menu da extensão.");
		S.hlOff();
		await S.cap("Clique no ícone para abrir o Menu.");
		await S.click("#x-menuicon");
		const menu = abrirMenu();
		await S.cap("Logo abaixo do título fica a <b>chave geral</b>: <b>Extensão ativada no PROJUDI</b>. Ao lado, as abas <b>PROJUDI</b> e <b>SEEU</b> — cada sistema tem a sua chave.", { ms: 5000 });
		await S.cap("Para pausar a extensão inteira, desligue a chave geral.");
		await menu.geral(false);
		S.hl("#x-menuicon", 5);
		await S.cap("A faixa fica <b>vermelha</b>, nenhuma função atua a partir do próximo carregamento e o ícone ganha o <b>pontinho vermelho</b>. Suas escolhas ficam guardadas.", { ms: 5600 });
		S.hlOff();
		await S.cap("Para voltar a usar, ligue a chave de novo.");
		await menu.geral(true);
		await S.cap("Em <b>Funcionalidades</b>, cada função tem uma <b>chave liga/desliga</b>. No topo: quantas estão ativas.");
		await S.cap("Vamos desligar <b>Destaque de movimentações</b>.");
		await menu.mudar("destaque", false);
		S.hl("#x-menuicon", 5);
		await S.cap("Um <b>pontinho vermelho</b> no ícone avisa que há funções desligadas. A mudança vale a partir do próximo carregamento — use <b>Recarregar agora</b>.", { ms: 5200 });
		S.hlOff();
		await menu.rolar(190);
		await S.cap("Algumas funções dependem de outras (em dourado: <b>Requer</b>). Desligar <b>Ações rápidas</b>…");
		await menu.mudar("acoesRapidas", false);
		await S.cap("…desliga também as que dependem dela. O Menu avisa quais.", { ms: 3800 });
		await S.cap("Ligar <b>Editar Partes/Outros</b> liga junto as que ela exige.");
		await menu.mudar("editarPartes", true);
		await S.cap("Ao ligar uma função, as funções de que ela precisa também são ligadas — e o Menu avisa.", { ms: 3800 });
		await menu.rolar(0, 600);
		menu.semAviso();
		await S.cap("Em <b>Preferências e combos</b> ficam os botões de cópia de segurança.");
		await S.click("#m-exp");
		menu.aviso("Backup exportado (preferências, combos, listas de tarefas, contatos…). Guarde o arquivo e use \"Importar\" no outro computador.", true);
		await S.cap("<b>⬇ Exportar</b> baixa um arquivo com todas as suas preferências, combos, listas, contatos e as funções desligadas.", { ms: 4600 });
		await S.click("#m-imp");
		menu.aviso("<b>Importar este backup?</b> Contém: 12 preferências, 3 combos, 4 listas de tarefas, 6 contatos. As preferências deste computador serão <b>substituídas</b>. <u>Cancelar</u> · <b>Importar</b>");
		await S.cap("<b>⬆ Importar</b>, no outro computador, mostra um <b>resumo</b> do arquivo e só substitui as preferências depois da sua confirmação.", { ms: 5000 });
		menu.semAviso();
		await S.click("#m-pad");
		itens_reativar();
		menu.aviso("Todas as funcionalidades foram reativadas.", true);
		await S.cap("<b>↺ Padrão</b> religa todas as funções, sem apagar nenhuma preferência.");
		await S.cap("Por fim, <b>📖 Manual do Usuário</b> abre este manual numa nova aba.");
		await S.click("#m-manual");
		browser(["Projudi - Processo " + PROC, "*Projudi/SEEU - Manual do Usuário"], "chrome-extension://…/src/manual.html");
		document.querySelectorAll("#x-menu").forEach(n => n.remove());
		const app = add('<div class="manual-app"><div class="topo"><div><small>Extensão Projudi/SEEU · versão ' + VERSAO_EXTENSAO + '</small><b>Manual do Usuário</b></div><div class="busca" id="mbusca" style="color:#fff">Buscar no manual…</div></div>' +
			'<div class="idx"><b>Apresentação</b><br>1. Apresentação<br>2. Primeiros passos<br>&nbsp;&nbsp;2.6 Menu da extensão<br>3. Leitura do processo<br>4. Informações extras<br>5. Envio de documentos<br>…<br>Anexo A — Vídeos instrutivos</div>' +
			'<div class="ct"><div class="card"><h3>3.1 Pré-visualização de documentos</h3><p><a class="link" id="lv">▶ <b>Vídeo V03</b> — Pré-visualização de documentos</a></p><p><b>Para que serve:</b> ler a íntegra de um documento sem abrir outra aba.</p></div></div></div>');
		await S.cap("O manual tem <b>índice lateral</b> e <b>busca</b>.");
		await S.type("#mbusca", "whatsapp", { speed: 90 });
		await S.cap("Os links <b>▶ Vídeo</b> tocam na própria página.");
		await S.click("#lv");
		add('<div class="vid-fundo"><div class="vid-caixa"><div class="vid-cab"><span>Vídeo V03 — Pré-visualização de documentos</span><span>✕ Fechar</span></div><div class="vid-tela">▶</div></div></div>');
		await sleep(2500);
		await S.endCard("Ícone da balança → chave geral · Funcionalidades (liga/desliga) · Exportar/Importar/Padrão · 📖 Manual do Usuário.");

		function itens_reativar() { $$("#x-menu .sw").forEach(n => n.classList.remove("off")); $("#mcnt").textContent = "Funcionalidades: 25 de 25 ativas"; $("#x-menuicon .dot").hidden = true; }
	},
};

// ------------------------------------------------------------------ V35
CENAS.V35 = {
	arquivo: "V35-endereco-e-mandado-regionalizado.mp4",
	titulo: "Endereço da parte e Mandado Regionalizado",
	secao: "9.7",
	async run() {
		telaProcesso({ acoesAbertas: true });
		$("#areaatuacao").textContent = "Vara Criminal de Pinhais";
		await S.titleCard("VÍDEO V35", "Endereço da parte e Mandado Regionalizado", "Veja o endereço ao ordenar e deixe a extensão sugerir o tipo de mandado.");
		await S.cap("Abra <b>Ordenar Cumprimentos</b> (grupo <b>Ordenações</b>).");
		await S.click('[data-g="Ordenações"]');
		const pn = panelAt(acaoPanel("Ordenações", [{ nome: "Ordenar Cumprimentos" }]), '[data-g="Ordenações"]', { w: 380 });
		await S.click('[data-open="Ordenar Cumprimentos"]');
		pn.remove();
		await abrindo("Ordenar Cumprimentos", 900);
		const ender = ["Ponta Grossa", "Pinhais"];
		popup("Ordenar Cumprimentos", '<table class="pj-form"><tr><td class="l">Tipo de Cumprimento:</td><td><span class="pj-select" id="f-tc">Selecione</span></td></tr>' +
			'<tr><td class="l">Referente a(s) parte(s):</td><td id="f-partes">' + REUS.map((r, i) => '<div><label><input type="checkbox" data-p="' + i + '"> ' + r.nome + ' (Réu)</label><div class="ende" data-e="' + i + '" style="display:none;margin-left:22px;color:#4b431d;background:#fff8d8;padding:2px 6px;font-size:11px"></div></div>').join("") + '</td></tr>' +
			'<tr id="linha-tm" style="display:none"><td class="l">Tipo do Mandado:</td><td><span class="pj-select" id="f-tm">Mandado Comum</span></td></tr>' +
			'<tr id="linha-cd" style="display:none"><td class="l">Comarca de Destino:</td><td><span class="pj-select" id="f-cd">Ponta Grossa</span> <span class="pj-select" id="f-cm" style="min-width:180px">Central de Mandados de Ponta Grossa</span></td></tr>' +
			'<tr><td></td><td id="nota"></td></tr></table><div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary">Ordenar</span><span class="pj-btn">Cancelar</span></div>', { h: 540 });
		const ends = ["📍 (1) R das Flores, 230 Bairro: Jardim Carvalho Cidade: PONTA GROSSA/PR CEP: 84000-000", "📍 (1) R das Palmeiras, 15 Bairro: Centro Cidade: PINHAIS/PR CEP: 83320-000"];
		const nota = t => ($("#nota").innerHTML = '<div style="background:#fff8d8;border:1px solid #d9c46a;padding:5px 8px;font-size:11px;color:#4b431d;max-width:520px">' + t + "</div>");
		await S.cap("Ao <b>marcar uma parte</b>, o endereço dela aparece logo abaixo, lido da aba <b>Partes e Outros</b>.");
		await S.click('[data-p="0"]'); $('[data-p="0"]').checked = true;
		const e0 = $('[data-e="0"]'); e0.textContent = ends[0]; e0.style.display = "block";
		S.hl(e0, 3); await sleep(1800); S.hlOff();
		await S.cap("Agora escolha o Tipo de Cumprimento <b>MANDADO</b>. A extensão compara a cidade com a comarca do seu juízo (Pinhais).");
		await selecionar("#f-tc", "MANDADO");
		$("#linha-tm").style.display = "";
		await sleep(600);
		$("#f-tm").textContent = "Mandado Regionalizado"; $("#linha-cd").style.display = "";
		nota("Parte com endereço em PONTA GROSSA (outra comarca): Tipo do Mandado alterado para Mandado Regionalizado e comarca de destino marcada.");
		S.hl("#linha-tm", 3);
		await S.cap("Cidade de <b>outra comarca</b> da lista: vira <b>Mandado Regionalizado</b>, com a comarca de destino marcada.", { ms: 4500 });
		S.hlOff();
		await S.cap("Uma <b>nota amarela</b> explica o que foi feito. Se preferir outro tipo, <b>a sua escolha manual sempre prevalece</b>.", { ms: 4500 });
		await S.cap("Se a parte for da <b>própria comarca</b>, o mandado fica <b>Comum</b>. Desmarque esta parte e marque a outra:");
		await S.click('[data-p="0"]'); $('[data-p="0"]').checked = false; e0.style.display = "none";
		await S.click('[data-p="1"]'); $('[data-p="1"]').checked = true;
		const e1 = $('[data-e="1"]'); e1.textContent = ends[1]; e1.style.display = "block";
		$("#f-tm").textContent = "Mandado Comum"; $("#linha-cd").style.display = "none";
		nota("Endereço em PINHAIS (comarca do juízo): Mandado Comum.");
		await S.cap("Cidade da própria comarca: <b>Mandado Comum</b> (volta para Comum se foi a extensão que tinha escolhido Regionalizado).", { ms: 4600 });
		await S.cap("Endereço sem cidade, partes em comarcas diferentes ou cidade fora da lista (ex.: outro estado): <b>nada é alterado</b>.", { ms: 4600 });
		await S.endCard("Marcar a parte → endereço aparece · MANDADO → Regionalizado ou Comum conforme a cidade · a sua escolha manual prevalece.");
	},
};

// ------------------------------------------------------------------ V36
CENAS.V36 = {
	arquivo: "V36-dispensar-cumprimentos.mp4",
	titulo: "Dispensar cumprimentos para expedir",
	secao: "6.4",
	async run() {
		telaProcesso({});
		$("#quadroPendencias table").insertAdjacentHTML("beforeend", '<tr><td class="l">Cumprimentos para Expedir:</td><td><a class="link">Ofício à Copel: 2</a> <button class="x-btn small" id="b-cump">Dispensar pendências</button></td></tr>');
		await S.titleCard("VÍDEO V36", "Dispensar cumprimentos para expedir", "Remova as pendências de expedição de um mesmo tipo.");
		await S.cap("Confira o <b>tipo e a quantidade</b>: o botão remove todos os cumprimentos pendentes daquele tipo.");
		await S.click("#b-cump");
		$("#b-cump").disabled = true;
		$("#b-cump").textContent = "Dispensando 1/2…";
		await S.cap("A extensão remove um cumprimento por vez e confere a confirmação do Projudi.");
		$("#b-cump").textContent = "Dispensando 2/2…";
		await sleep(1200);
		$("#b-cump").textContent = "Cumprimentos dispensados (2)";
		await S.cap("Ao terminar, recarregue a página para atualizar os contadores do quadro Pendências.");
		await S.cap("Se houver erro, a sequência para em <b>Conferir dispensa (X/N)</b>. Confira a listagem antes de repetir.");
		await S.endCard("Pendências → Cumprimentos para Expedir → Dispensar pendências.");
	},
};

// ------------------------------------------------------------------ V37
// Caixinha ao lado do evento para escolher a movimentação de referência das
// Ações rápidas (src/movimentoBase.js).
function caixinhasMovimentacao() {
	document.querySelectorAll("#movs tr[id]").forEach(tr => {
		const seq = tr.id.split(",")[1];
		tr.cells[0].insertAdjacentHTML("afterbegin", '<input type="checkbox" class="x-movbase" id="mb-' + seq + '" style="margin:0 4px 0 0;vertical-align:middle;accent-color:#1f6feb">');
	});
}
function marcarMovimentacao(seq) {
	document.querySelectorAll("#movs .x-movbase").forEach(c => {
		c.checked = c.id === "mb-" + seq;
		c.style.opacity = seq && !c.checked ? "0.35" : "";
		c.closest("tr").querySelectorAll("td").forEach(td => (td.style.boxShadow = c.checked ? "inset 0 2px 0 #1f6feb, inset 0 -2px 0 #1f6feb" : ""));
	});
}
CENAS.V37 = {
	arquivo: "V37-escolher-a-movimentacao.mp4",
	titulo: "Escolher a movimentação das Ações rápidas",
	secao: "7.7",
	async run() {
		telaProcesso({ acoesAbertas: true });
		caixinhasMovimentacao();
		await S.titleCard("VÍDEO V37", "Escolher a movimentação das Ações rápidas", "Marque o evento a partir do qual a remessa, a intimação ou a ordenação será feita.");
		await S.cap("Na aba <b>Movimentações</b>, cada movimentação ganha uma <b>caixinha</b> na primeira coluna, à esquerda do número (Seq.).");
		await S.cap("Sem nenhuma marcada, tudo continua como antes: a extensão parte da movimentação <b>mais recente</b>.");
		await S.click("#mb-36");
		marcarMovimentacao(36);
		await S.cap("Marque a movimentação de referência — por exemplo, o <b>despacho</b> que manda remeter os autos. É como clicar em “Movimentar a Partir Desta Movimentação”.", { ms: 5200 });
		await S.cap("As demais caixinhas ficam <b>esmaecidas</b> e não podem ser marcadas: só uma movimentação por vez.", { ms: 4200 });
		await S.click("#mb-36");
		marcarMovimentacao(0);
		await S.cap("Para escolher outra, primeiro <b>desmarque</b> a atual — as caixinhas voltam a ficar livres.", { ms: 4200 });
		await S.click("#mb-36");
		marcarMovimentacao(36);
		await S.cap("As caixinhas dos <b>arquivos</b> (para WhatsApp e e-mail) continuam como antes, independentes desta.", { ms: 4200 });
		await S.cap("Agora use as Ações rápidas normalmente. Exemplo: grupo <b>Remessa</b> → preferência salva.");
		await S.click('[data-g="Remessa"]');
		const pn = panelAt(acaoPanel("Remessa", [{ nome: "Realizar Remessa", prefs: ["Vista ao MP - 5 dias"] }, { nome: "Remessa Eletrônica para o Tribunal de Justiça" }]), '[data-g="Remessa"]', { w: 420 });
		await S.click('[data-pref="Vista ao MP - 5 dias"]', { dx: -40 });
		pn.remove();
		const t = toast("Abrindo “Realizar Remessa” a partir da movimentação 36 “DESPACHO - MERO EXPEDIENTE”… <u style=\"margin-left:10px\">Cancelar</u>", { left: 330, top: 330 });
		await S.cap("O aviso “Abrindo…” mostra de qual movimentação a ação vai partir.", { ms: 3600 });
		t.remove();
		popup("Realizar Remessa", dlgRemessa({ op: "op-mp", dest: "Ministério Público", fin: "Vista", prazo: "5" }), { top: 120, h: 470 });
		bar('Confirmar “Realizar Remessa” com a preferência “Vista ao MP - 5 dias”? <span class="x-btn small green" id="sim">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("O diálogo abre preenchido, como sempre. Confira e clique em <b>✅ Sim, executar</b>.");
		await S.click("#sim");
		$(".x-bar").remove();
		$(".x-popup .bd").innerHTML = '<div class="x-dlg-title">Realizar Remessa</div><div style="padding:16px"><div class="pj-msg-ok">Remessa realizada com sucesso.</div></div>';
		await S.cap("A remessa fica vinculada à movimentação marcada — é ela que o destinatário vê como referência.", { ms: 4200 });
		$(".x-popup").remove();
		marcarMovimentacao(0);
		await S.cap("Vale para <b>Ir e abrir</b>, preferências, <b>⭐ Minhas Preferências</b> e <b>🔗 Combos</b> (todas as etapas usam a movimentação marcada no início).", { ms: 5200 });
		await S.cap("Quando a tela recarrega, a marcação some. Para voltar ao automático, basta desmarcar.");
		await S.endCard("Aba Movimentações → marcar a caixinha do evento → Ações rápidas/preferência/combo → conferir → ✅ Sim, executar.");
	},
};

// ------------------------------------------------------------------ V38
// Preferência gravada a partir de um movimento (pref.movimento, ver
// showCaptureToolbar/resolveDialogUrl em src/quickActions.js).
CENAS.V38 = {
	arquivo: "V38-preferencia-a-partir-de-um-movimento.mp4",
	titulo: "Preferência a partir de um movimento",
	secao: "7.7",
	async run() {
		telaProcesso({ acoesAbertas: true });
		caixinhasMovimentacao();
		await S.titleCard("VÍDEO V38", "Preferência a partir de um movimento", "A preferência guarda o nome do movimento e sempre parte dele.");
		await S.cap("Para gravar: marque a caixinha do movimento — por exemplo, <b>RECEBIDA A DENÚNCIA</b>.");
		await S.click("#mb-32");
		marcarMovimentacao(32);
		await S.cap("Depois, crie a preferência como sempre: <b>+ Nova preferência</b>.");
		await S.click('[data-g="Remessa"]');
		let pn = panelAt(acaoPanel("Remessa", [{ nome: "Realizar Remessa" }, { nome: "Remessa Eletrônica para o Tribunal de Justiça" }]), '[data-g="Remessa"]', { w: 420 });
		await S.click('[data-nova="Realizar Remessa"]');
		pn.remove();
		await abrindo("Realizar Remessa", 900);
		popup("Realizar Remessa", dlgRemessa({ op: "op-del", dest: "Delegacia de Exemplo", fin: "Cumprimento", prazo: "30" }), { top: 120, h: 470 });
		const b = bar('Preencha o diálogo e clique em <span class="x-btn small" id="salvarpref">💾 Salvar como preferência</span>', { top: 78 });
		await S.click("#salvarpref");
		modal('<h3>Salvar como preferência</h3><div class="x-note">Campos que serão gravados:</div><div class="x-list"><div>Remessa: Enviar à Delegacia</div><div>Destino: Delegacia de Exemplo</div><div>Prazo (dias): 30</div><div><b>Movimento de referência: RECEBIDA A DENÚNCIA</b></div></div><div style="margin-top:8px">Nome da preferência:</div><div class="x-field" id="nm"></div><div style="text-align:right;margin-top:10px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="ok">Salvar</span></div>', { top: 170 });
		await S.cap("A lista do que será gravado mostra o <b>Movimento de referência</b>.");
		await S.type("#nm", "Delegacia - cumprir denúncia");
		await S.click("#ok");
		closeModal(); b.remove(); $(".x-popup").remove();
		marcarMovimentacao(0);
		await S.click('[data-g="Remessa"]');
		pn = panelAt(acaoPanel("Remessa", [{ nome: "Realizar Remessa", prefs: ["Delegacia - cumprir denúncia 📌"] }]), '[data-g="Remessa"]', { w: 420 });
		await S.cap("A preferência ganha um <b>📌</b>. Em qualquer processo, ela procura o movimento com esse nome (o mais recente)…", { ms: 4600 });
		await S.click('[data-pref="Delegacia - cumprir denúncia 📌"]', { dx: -40 });
		pn.remove();
		const t = toast("Abrindo “Realizar Remessa” a partir da movimentação “RECEBIDA A DENÚNCIA”… <u style=\"margin-left:10px\">Cancelar</u>", { left: 360, top: 330 });
		await S.cap("…e parte dele, sem você marcar nada.", { ms: 3000 });
		t.remove();
		await S.cap("Se o processo <b>não tiver</b> esse movimento, a extensão avisa e pergunta:");
		modal('<div style="display:flex;justify-content:space-between;gap:8px"><b>★ Delegacia - cumprir denúncia — Realizar Remessa</b><span style="color:#888">✕</span></div>' +
			'<p style="margin:10px 0">Não localizei o movimento "RECEBIDA A DENÚNCIA" na aba Movimentações deste processo. Deseja prosseguir mesmo assim com "Realizar Remessa"?</p>' +
			'<p style="margin:8px 0;color:#666;font-size:12px;font-style:italic">Prosseguir executa pela regra geral (a partir da movimentação mais recente, como se a preferência não tivesse movimento). Cancelar não executa nada.</p>' +
			'<div style="display:flex;gap:6px;justify-content:flex-end"><span class="x-btn small green" id="okm">✅ Prosseguir</span><span class="x-btn small">Cancelar</span></div>', { w: 480, top: 150 });
		await S.cap("<b>✅ Prosseguir</b> segue pela regra geral; <b>Cancelar</b> não executa nada.", { ms: 4000 });
		await S.click("#okm");
		closeModal();
		await S.cap("Preferências gravadas <b>sem</b> caixinha marcada continuam como sempre. E uma caixinha marcada na hora tem prioridade.", { ms: 5200 });
		await S.endCard("Marcar o movimento → + Nova preferência → 💾 Salvar (Movimento de referência) → ★ nome 📌 → parte do movimento com esse nome.");
	},
};

// ------------------------------------------------------------------ V39
// Ícones dos sistemas do CNJ ao lado da balança do Menu (src/sistemasCnj.js,
// lista e cores em src/sistemasCnjLista.js).
function iconesSistemasCnj() {
	const ic = $("#x-menuicon");
	return self.PDP_SISTEMAS_CNJ.map((s, i) => {
		const el = add('<div id="x-cnj-' + s.id + '" title="' + s.nome + " (" + (s.orgao || "CNJ") + ')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + s.cor.desenho + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + s.svg.replace(/class="cheio"/g, 'fill="' + s.cor.desenho + '"') + "</svg></div>", ic.parentElement);
		el.style.cssText = "position:absolute;right:" + (12 + (i + 1) * 30) + "px;top:50px;z-index:30;width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg," + s.cor.claro + "," + s.cor.escuro + ");border:1px solid " + s.cor.borda + ";display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.25)";
		return el;
	});
}
CENAS.V39 = {
	arquivo: "V39-sistemas-do-cnj.mp4",
	titulo: "Sistemas do CNJ",
	secao: "8.7",
	async run() {
		telaProcesso({});
		iconesSistemasCnj();
		await S.titleCard("VÍDEO V39", "Sistemas do CNJ", "SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper e Infojud num popup, sem sair do processo.");
		S.hl("#x-cnj-infojud", 4);
		await S.cap("No alto da tela, à esquerda da balança dourada do Menu, ficam os ícones coloridos dos <b>sistemas do CNJ</b>.", { ms: 4200, bottom: true });
		S.hlOff();
		for (const s of self.PDP_SISTEMAS_CNJ) {
			S.hl("#x-cnj-" + s.id, 3);
			await S.cap("<b>" + s.nome + "</b>", { ms: 1100, bottom: true });
		}
		S.hlOff();
		await S.cap("Para mudar a ordem, clique num ícone e, sem soltar, <b>arraste-o para o lado</b>.", { bottom: true });
		const lista = self.PDP_SISTEMAS_CNJ.map(x => x.id);
		const rightDe = i => 12 + (i + 1) * 30;
		const arrastado = $("#x-cnj-infojud");
		await S.move("#x-cnj-infojud");
		arrastado.style.transform = "scale(1.15)";
		arrastado.style.zIndex = "31";
		const de = lista.length - 1, para = 1;
		await Promise.all([
			S.move("#x-cnj-infojud", { dx: (de - para) * 30, ms: 1400 }),
			tween(1400, k => {
				arrastado.style.right = (rightDe(de) - (de - para) * 30 * k) + "px";
				const atual = Math.round(de - (de - para) * k);
				lista.filter(id => id !== "infojud").forEach((id, i) => {
					$("#x-cnj-" + id).style.right = rightDe(i >= atual ? i + 1 : i) + "px";
				});
			}),
		]);
		arrastado.style.transform = "";
		await S.cap("Solte no lugar desejado: a nova ordem fica guardada como sua preferência e vai junto no <b>⬇ Exportar</b> do Menu.", { ms: 4200, bottom: true });
		await S.cap("Um clique sem arrastar abre o sistema. Clique, por exemplo, no do <b>SerpJud</b>.", { bottom: true });
		await S.click("#x-cnj-serpjud");
		await abrindo("SerpJud", 1000);
		popup("SERP-JUD — Sistema Eletrônico dos Registros Públicos", '<div style="padding:30px;text-align:center;font-size:14px;color:#333"><div style="font-size:22px;font-weight:bold;color:#0d3560;margin-bottom:14px">SERP-JUD</div>Entre com o seu acesso do CNJ para consultar os registros públicos.<br><br><span class="pj-btn primary">Entrar</span><br><br><i style="color:#666">(tela do sistema — conteúdo ilustrativo)</i></div>', { hd: "SerpJud — CNJ", h: 520 });
		$("#x-fechar").outerHTML = '<span><span id="x-aba" style="margin-right:14px">🗂 Nova aba</span><span id="x-monitor" style="margin-right:16px">🖥 Segundo monitor</span><span id="x-fechar">✕ Fechar</span></span>';
		await S.cap("O sistema abre num <b>popup</b> sobre a tela do processo, como os das ações rápidas. Entre com o seu acesso e trabalhe nele.", { ms: 4200, bottom: true });
		S.hl("#x-aba");
		await S.cap("Prefere fora do popup? <b>🗂 Nova aba</b> abre o sistema numa aba nova, ao lado da do processo.", { ms: 4200, bottom: true });
		S.hl("#x-monitor");
		await S.cap("<b>🖥 Segundo monitor</b> abre o sistema numa janela que ocupa o outro monitor (se houver um conectado).", { ms: 4200, bottom: true });
		S.hlOff();
		await S.cap("Para voltar ao processo, clique em <b>✕ Fechar</b> (ou tecle <b>Esc</b>). Os outros ícones funcionam do mesmo jeito.", { bottom: true });
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.endCard("Ícone do sistema ao lado da balança → popup (ou 🗂 Nova aba / 🖥 Segundo monitor) → ✕ Fechar.");
	},
};

// ------------------------------------------------------------------ V40
// Botão 📍 Localizador do SEEU (src/localizadorSeeu.js), na linha do
// ⭐ Minhas Preferências: preferências de localizadores associadas ao
// processo pela lista nativa do "+"; também como cards em ⭐ Minhas
// Preferências.
const LOCS_SEEU = ["ABERTO", "AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA", "Aguardando Audiência - Pendente de Cumprimento", "AGUARDANDO CUMPRIMENTO DE PENA", "CÁLCULO DE PENA", "REVISAR INCIDENTES- ANÁLISE PRESCRIÇÃO", "SUSPENDER - MANDADO EXPEDIDO"];
function telaSeeu() {
	browser(["*SEEU - Sistema Eletrônico de Execução Unificado"], "https://seeu.pje.jus.br/seeu/visualizacaoProcesso.do?…");
	screen('<div style="background:#fff;height:676px;font-family:Inter,Arial,sans-serif;font-size:13px;color:#333">' +
		'<div style="background:#1f3b57;color:#fff;padding:10px 20px;font-weight:600">SEEU · Sistema Eletrônico de Execução Unificado</div>' +
		'<div style="display:flex;align-items:center;padding:12px 20px;border-bottom:1px solid #ddd">' +
		'<div><div style="font-size:18px;font-weight:700">Execução ' + PROC + '</div><div style="font-size:11px;color:#666">2454 dia(s) em tramitação</div></div>' +
		'<div id="sl-chips" style="flex:1;display:flex;justify-content:flex-end;gap:6px;align-items:center"></div>' +
		'<span id="sl-plus" style="padding:0 8px;font-size:18px;color:#555">+</span></div>' +
		'<div style="padding:14px 20px;line-height:24px">Juízo: Vara de Execução de Exemplo<br>Sentenciado: FULANO DE TAL (fictício)<br>Classe Processual: 386 - Execução da Pena</div></div>');
	document.querySelectorAll("#x-group").forEach(n => n.remove());
	add('<div id="x-group"><div class="line"><span class="x-btn">▸ Ações</span><span class="x-btn" id="x-fav">⭐ Minhas Preferências</span><span class="x-btn" id="sl-bt">📍 Localizador</span><span class="x-btn">🖍️ Destacar mov.</span><span class="x-btn">🔗 Combos</span></div>' +
		'<div class="line"><span class="x-btn">📱 Enviar por WhatsApp</span><span class="x-btn">✉️ Enviar por e-mail</span><span class="x-btn small" style="align-self:center">↕ Mover</span><span class="x-btn small" style="align-self:center">Ocultar</span></div></div>');
}
// Painel do 📍 Localizador: abre para cima, porque a fileira fica no rodapé.
function painelLoc(html) {
	document.querySelectorAll("#sl-painel").forEach(n => n.remove());
	const r = $("#sl-bt").getBoundingClientRect();
	const p = add('<div id="sl-painel" style="position:fixed;width:320px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);font:12px/1.4 Inter,Arial;padding:10px;z-index:60">' + html + "</div>");
	p.style.left = Math.min(1270 - 320, r.right - 320) + "px";
	p.style.bottom = 720 - r.top + 4 + "px";
	return p;
}
const SL_TIT = t => '<div style="font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:6px">' + t + "</div>";
const SL_BT = (id, t, prim) => '<span id="' + id + '" style="display:inline-block;padding:5px 10px;font-weight:600;border-radius:6px;border:1px solid ' + (prim ? "#2563eb;background:#2563eb;color:#fff" : "#cbd5e1;background:#fff") + '">' + t + "</span>";
function listaPrefsLoc(prefs, status) {
	let h = SL_TIT("Minhas preferências de localizadores");
	if (!prefs.length) h += '<div style="color:#64748b;font-style:italic">Nenhuma preferência ainda. Crie uma com os localizadores que você mais usa: depois, um clique associa todos ao processo.</div>';
	prefs.forEach((p, i) => {
		h += '<div style="display:flex;gap:2px;margin:4px 0"><span id="sl-pref' + i + '" style="flex:1;padding:6px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;color:#1e3a8a"><b>' + p[0] + '</b><br><small style="color:#475569">' + p[1].join(" • ") + '</small></span><span style="width:24px;text-align:center;opacity:.5">↑</span><span style="width:24px;text-align:center">✏️</span><span style="width:24px;text-align:center">🗑</span></div>';
	});
	h += '<div style="text-align:right;margin-top:6px">' + SL_BT("sl-nova", "➕ Nova preferência", true) + "</div>";
	if (status) h += '<div style="margin-top:8px;padding:6px 8px;border-radius:6px;background:' + (status[1] ? "#ecfdf5;color:#065f46" : "#f1f5f9;color:#334155") + '">' + status[0] + "</div>";
	return painelLoc(h);
}
CENAS.V40 = {
	arquivo: "V40-localizador-seeu.mp4",
	titulo: "Localizador (SEEU)",
	secao: "8.8",
	async run() {
		telaSeeu();
		await S.titleCard("VÍDEO V40", "Localizador (SEEU)", "Preferências de localizadores: associe ao processo com um clique.");
		S.hl("#sl-plus", 6);
		await S.cap("No SEEU, os localizadores do processo ficam no alto, à direita. O <b>+</b> do próprio SEEU associa um de cada vez.");
		S.hlOff();
		S.hl("#sl-bt", 4);
		await S.cap("Na fileira de botões da extensão, ao lado de <b>⭐ Minhas Preferências</b>, fica o botão <b>📍 Localizador</b>.");
		S.hlOff();
		await S.click("#sl-bt");
		listaPrefsLoc([]);
		await S.cap("Para criar uma preferência, clique em <b>➕ Nova preferência</b>.");
		await S.click("#sl-nova");
		const marc = new Set();
		const editor = () => painelLoc(SL_TIT("Nova preferência") + '<div style="font-weight:600;color:#475569">Nome da preferência</div><div id="sl-nome" style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 7px;min-height:16px"></div>' +
			'<div style="font-weight:600;color:#475569;margin-top:6px">Localizadores (' + marc.size + " marcado" + (marc.size === 1 ? "" : "s") + ')</div><div style="border:1px solid #cbd5e1;border-radius:6px;padding:5px 7px;color:#94a3b8">Pesquisar localizador...</div>' +
			'<div style="border:1px solid #e2e8f0;border-radius:6px;margin-top:6px;padding:2px">' + LOCS_SEEU.map((n, i) => '<div id="sl-o' + i + '" style="padding:4px 6px;font-size:11px">' + (marc.has(i) ? "☑" : "☐") + " " + n + "</div>").join("") + "</div>" +
			'<div style="text-align:right;margin-top:8px">' + SL_BT("sl-canc", "Cancelar") + " " + SL_BT("sl-salvar", "Salvar", true) + "</div>");
		editor();
		await S.cap("A extensão lê a lista de <b>localizadores ativos da unidade</b> (a mesma do +).");
		await S.type("#sl-nome", "Audiência cumprida");
		const nome = $("#sl-nome").textContent;
		await S.cap("Marque <b>um ou mais</b> localizadores e clique em <b>Salvar</b>.");
		for (const i of [0, 1]) {
			await S.click("#sl-o" + i);
			marc.add(i);
			editor();
			$("#sl-nome").textContent = nome;
		}
		await S.click("#sl-salvar");
		const pref = ["Audiência cumprida", [LOCS_SEEU[0], LOCS_SEEU[1]]];
		listaPrefsLoc([pref], ["Preferência salva.", true]);
		await S.cap("A preferência também entra em <b>⭐ Minhas Preferências</b>, junto das outras.");
		$("#sl-painel").remove();
		await S.click("#x-fav");
		const cards = [["Audiência cumprida", "📍 Localizador"], ["Intimar MP - ciência 5 dias", "Intimar Partes"], ["🔗 Decurso + concluso", "Combo · 2 etapas"]];
		const pn = panelAt('<div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">⭐ Minhas Preferências</h4><span class="x-btn small">✏️ Editar posição</span></div>' +
			'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">' + cards.map((c, i) => '<div class="x-chip" data-card="' + i + '" style="display:block;border-radius:6px;padding:8px;margin:0;font-size:12px"><div style="color:#666;font-size:11px">' + c[1] + "</div><b>" + (c[0].startsWith("🔗") ? "" : "★ ") + c[0] + "</b></div>").join("") + "</div>", "#x-fav", { w: 520 });
		await S.cap("Um clique no card <b>📍 Localizador · ★ Audiência cumprida</b> associa os localizadores.");
		await S.click('[data-card="0"]');
		pn.remove();
		listaPrefsLoc([pref], ["Associando 1 de 2: ABERTO..."]);
		await sleep(900);
		$("#sl-chips").innerHTML = '<span style="padding:2px 8px;background:#e2e8f0;border-radius:10px;font-size:11px">ABERTO ×</span>';
		listaPrefsLoc([pref], ["Associando 2 de 2: AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA..."]);
		await sleep(900);
		$("#sl-chips").innerHTML += '<span style="padding:2px 8px;background:#e2e8f0;border-radius:10px;font-size:11px">AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA ×</span>';
		listaPrefsLoc([pref], ["Associado(s): ABERTO, AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA.", true]);
		await S.cap("A extensão escolhe cada localizador na lista do <b>+</b>, como você faria, e mostra o resultado.", { ms: 4200 });
		await S.cap("Localizador que já está no processo não é associado de novo.");
		await S.endCard("📍 Localizador → ➕ Nova preferência → marcar localizadores → Salvar → um clique na preferência (ou no card de ⭐ Minhas Preferências) associa todos.");
	},
};

// ------------------------------------------------------------------ V41
// ⭐ na linha das listas do SEEU (preferenciasNaLinha.js, modo SEEU):
// preferências do 📍 Localizador associadas em segundo plano.
CENAS.V41 = {
	arquivo: "V41-localizador-na-linha-seeu.mp4",
	titulo: "Localizador pela ⭐ da lista (SEEU)",
	secao: "9.3",
	async run() {
		telaLista("Análise de Juntadas");
		browser(["*SEEU - Sistema Eletrônico de Execução Unificado"], "https://seeu.pje.jus.br/seeu/processo/analisarJuntada.do");
		$(".pj-logo").innerHTML = "SEEU<small>Sistema Eletrônico de Execução Unificado</small>";
		$(".pj-menu").innerHTML = "<span>Início</span><span>Processos</span><span>Intimações</span><span>Decurso de Prazo</span><span>Análise de Juntadas</span><span>Cumprimentos</span><span>Outros</span>";
		$("#areaatuacao").textContent = "Vara de Execução de Exemplo";
		$$(".x-rowslot").forEach((s, i) => (s.innerHTML = ' <span class="x-btn small">+</span> <span class="x-btn small" data-star="' + i + '">⭐</span><span class="st" data-st="' + i + '" style="margin-left:6px;font-size:11px"></span>'));
		await S.titleCard("VÍDEO V41", "Localizador pela ⭐ da lista (SEEU)", "Associe localizadores a um processo sem sair da lista de juntadas ou conclusões.");
		await S.cap("No SEEU, as listas <b>Análise de Juntadas</b> e <b>Retorno de Conclusão</b> também têm a <b>⭐</b> em cada linha.");
		await S.click('[data-star="0"]');
		const pn = panelAt('<h4>⭐ Minhas Preferências — ' + LISTA[0].n + '</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
			'<div class="x-chip" id="card" style="display:block;border-radius:6px;padding:8px;margin:0"><div style="color:#666">📍 Localizador</div><b>★ Audiência cumprida</b></div>' +
			'<div class="x-chip" style="display:block;border-radius:6px;padding:8px;margin:0"><div style="color:#666">📍 Localizador</div><b>★ Cálculo de pena</b></div></div>', '[data-star="0"]', { w: 440 });
		pn.style.left = "520px"; pn.style.top = "200px";
		await S.cap("No SEEU, a ⭐ mostra as preferências do <b>📍 Localizador</b>. Escolha uma.");
		await S.click("#card");
		pn.remove();
		const st = $('[data-st="0"]');
		st.textContent = "★ Audiência cumprida · Carregando o processo…";
		await S.cap("A extensão abre o processo <b>em segundo plano</b> — você continua na lista.", { ms: 3200 });
		st.textContent = "★ Audiência cumprida · Associando 1 de 2: ABERTO…";
		await sleep(1300);
		st.textContent = "★ Audiência cumprida · Associando 2 de 2: AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA…";
		await sleep(1300);
		st.textContent = "✅ ★ Audiência cumprida · Associado(s): ABERTO, AGUARDANDO AUDIÊNCIA - JÁ CUMPRIDA.";
		S.hl(st, 3);
		await S.cap("No fim, a linha mostra o resultado: ✅ quando deu certo, ⚠ com o que não foi possível.", { ms: 4200 });
		S.hlOff();
		await S.endCard("Lista do SEEU → ⭐ na linha → preferência do 📍 Localizador → associada em segundo plano → resultado na linha.");
	},
};
