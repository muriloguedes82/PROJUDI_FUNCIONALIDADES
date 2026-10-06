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
// Cards dos sistemas do CNJ ao lado da balança do Menu (src/sistemasCnj.js,
// nomes e cores em src/sistemasCnjLista.js). Fila da balança para a
// esquerda (row-reverse), com a largura de cada nome.
function cardCnj(s) {
	const el = document.createElement("div");
	el.id = "x-cnj-" + s.id;
	el.title = s.nome + " (" + (s.orgao || "CNJ") + ")";
	el.textContent = s.rotulo;
	el.style.cssText = "height:24px;box-sizing:border-box;padding:0 6px;border-radius:6px;background:linear-gradient(135deg," + s.cor.claro + "," + s.cor.escuro + ");border:1px solid " + s.cor.borda + ";color:" + s.cor.texto + ";font:700 11px/1 Arial,sans-serif;white-space:nowrap;display:flex;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.25)";
	return el;
}
const ALFA_CNJ = l => l.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
// Fila em ordem alfabética + card "Outros" colado à balança; painel do
// "Outros" (oculto) com os sistemas marcados `outros: true`.
function iconesSistemasCnj() {
	const ic = $("#x-menuicon");
	const fila = add('<div id="x-cnj-fila"></div>', ic.parentElement);
	fila.style.cssText = "position:absolute;right:42px;top:50px;z-index:30;display:flex;gap:6px";
	ALFA_CNJ(self.PDP_SISTEMAS_CNJ.filter(s => !s.outros)).forEach(s => fila.append(cardCnj(s)));
	const outros = cardCnj({ id: "outros", nome: "Outros sistemas", orgao: "extensão", rotulo: "Outros ▾", cor: { claro: "#ffffff", escuro: "#e4e7eb", borda: "#8a939c", texto: "#3d4650" } });
	fila.append(outros);
	const painel = add('<div id="x-cnj-painel"><div style="font-weight:bold;margin-bottom:6px;color:#333">Outros sistemas</div><div id="x-cnj-lista" style="display:flex;flex-wrap:wrap;gap:6px"></div><div style="margin-top:8px;color:#777">Clique para abrir. Arraste um card daqui para cima de um card da fila para trocar os dois de lugar; arraste um card da fila para cá para guardá-lo.</div></div>', ic.parentElement);
	painel.style.cssText = "position:absolute;right:42px;top:82px;z-index:31;width:270px;box-sizing:border-box;padding:8px 10px;background:#fff;border:1px solid #c8ced6;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);font:11px/1.35 Arial,sans-serif;color:#444;display:none";
	ALFA_CNJ(self.PDP_SISTEMAS_CNJ.filter(s => s.outros)).forEach(s => $("#x-cnj-lista").append(cardCnj(s)));
	return fila;
}
function painelCnj(aberto) {
	$("#x-cnj-painel").style.display = aberto ? "block" : "none";
	$("#x-cnj-outros").textContent = "Outros " + (aberto ? "▴" : "▾");
}
// Anima o card `el` até a posição do card `alvo` (efeito de arrastar).
async function arrastarCnj(el, alvo, ms = 1300) {
	const r0 = el.getBoundingClientRect(), r1 = alvo.getBoundingClientRect();
	const dx = r1.left + r1.width / 2 - (r0.left + r0.width / 2), dy = r1.top + r1.height / 2 - (r0.top + r0.height / 2);
	el.style.position = "relative";
	el.style.zIndex = "40";
	alvo.style.outline = "2px dashed #2a6cb3";
	alvo.style.outlineOffset = "2px";
	await S.move("#" + el.id);
	await Promise.all([
		S.move("#" + el.id, { dx: dx, dy: dy, ms: ms }),
		tween(ms, k => { el.style.transform = "translate(" + dx * k + "px," + dy * k + "px) scale(1.08)"; }),
	]);
	el.style.transform = "";
	el.style.position = "";
	el.style.zIndex = "";
	alvo.style.outline = "";
}
CENAS.V39 = {
	arquivo: "V39-sistemas-do-cnj.mp4",
	titulo: "Sistemas do CNJ",
	secao: "8.7",
	async run() {
		telaProcesso({});
		iconesSistemasCnj();
		await S.titleCard("VÍDEO V39", "Sistemas do CNJ e outros", "Cards ao lado da balança abrem SerpJud, BNMP, Sisbajud, Renajud e outros num popup, sem sair do processo.");
		S.hl("#x-cnj-fila", 4);
		await S.cap("No alto da tela, à esquerda da balança dourada do Menu, ficam os cards dos <b>sistemas</b>, em <b>ordem alfabética</b>.", { ms: 4600, bottom: true });
		S.hlOff();
		await S.cap("Passe o mouse sobre um card para ver o nome completo do sistema.", { bottom: true });
		await S.cap("O card <b>Outros</b>, colado à balança, guarda mais sistemas. Clique nele.", { bottom: true });
		await S.click("#x-cnj-outros");
		painelCnj(true);
		await S.cap("O painel traz <b>COPEL</b>, <b>FUPEN</b>, <b>SANEPAR</b> e <b>SESP</b>. Clique num deles para abri-lo.", { ms: 4400, bottom: true });
		await S.cap("Para trazer um deles para a fila, arraste-o <b>para cima de um card da fila</b> — por exemplo, o SANEPAR sobre o CNIEP.", { ms: 4600, bottom: true });
		const sanepar = $("#x-cnj-sanepar"), cniep = $("#x-cnj-cniep");
		await arrastarCnj(sanepar, cniep);
		cniep.replaceWith(sanepar);
		$("#x-cnj-lista").replaceChildren(...ALFA_CNJ(self.PDP_SISTEMAS_CNJ.filter(s => (s.outros && s.id !== "sanepar") || s.id === "cniep")).map(s => s.id === "cniep" ? cniep : $("#x-cnj-" + s.id)));
		await S.cap("Os dois trocam de lugar: o SANEPAR fica na fila e o CNIEP vai para dentro do <b>Outros</b>.", { ms: 4400, bottom: true });
		painelCnj(false);
		await S.cap("Para mudar a posição na fila, arraste um card para o lado. Para guardá-lo, arraste-o para cima do <b>Outros</b>.", { ms: 4600, bottom: true });
		const sniper = $("#x-cnj-sniper");
		await arrastarCnj(sniper, $("#x-cnj-outros"));
		$("#x-cnj-lista").append(sniper);
		await S.cap("Tudo fica guardado como sua preferência — inclusive depois de atualizar a extensão — e vai junto no <b>⬇ Exportar</b> do Menu.", { ms: 4600, bottom: true });
		await S.cap("Um clique sem arrastar abre o sistema. Clique, por exemplo, no <b>SerpJud</b>.", { bottom: true });
		await S.click("#x-cnj-serpjud");
		await abrindo("SerpJud", 1000);
		popup("SERP-JUD — Sistema Eletrônico dos Registros Públicos", '<div style="padding:30px;text-align:center;font-size:14px;color:#333"><div style="font-size:22px;font-weight:bold;color:#0d3560;margin-bottom:14px">SERP-JUD</div>Entre com o seu acesso do CNJ para consultar os registros públicos.<br><br><span class="pj-btn primary">Entrar</span><br><br><i style="color:#666">(tela do sistema — conteúdo ilustrativo)</i></div>', { hd: "SerpJud — CNJ", h: 520 });
		$("#x-fechar").outerHTML = '<span><span id="x-fora" style="margin-right:16px">🖥 Segundo monitor</span><span id="x-fechar">✕ Fechar</span></span>';
		await S.cap("O sistema abre num <b>popup</b> sobre a tela do processo, como os das ações rápidas. Entre com o seu acesso e trabalhe nele.", { ms: 4200, bottom: true });
		S.hl("#x-fora");
		await S.cap("Prefere fora do popup? Com dois monitores, <b>🖥 Segundo monitor</b> abre o sistema numa janela que ocupa o outro monitor.", { ms: 4400, bottom: true });
		$("#x-fora").textContent = "🗂 Nova aba";
		await S.cap("Com um monitor só, o mesmo botão aparece como <b>🗂 Nova aba</b> e abre o sistema numa aba nova, ao lado da do processo.", { ms: 4400, bottom: true });
		S.hlOff();
		await S.cap("Para voltar ao processo, clique em <b>✕ Fechar</b> (ou tecle <b>Esc</b>). Os outros cards funcionam do mesmo jeito.", { bottom: true });
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.endCard("Card do sistema ao lado da balança → popup (ou 🖥 Segundo monitor / 🗂 Nova aba) → ✕ Fechar.");
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

// Balões "✏️ Alterar" e "⭐" ao lado da classe e do assunto (alterarClasseAssuntos.js).
const ESTILO_BALAO = "display:inline-block;margin-left:8px;padding:1px 7px;font:11px/16px Arial,sans-serif;color:#222;text-decoration:none;white-space:nowrap;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,.08)";
function cardsAlterar() {
	const par = id => ' <a id="' + id + '" style="' + ESTILO_BALAO + '">✏️ Alterar</a><a id="' + id + '-pref" style="' + ESTILO_BALAO + ';margin-left:4px;padding:1px 6px">⭐</a>';
	$("#info tr:first-child td:nth-child(2)").insertAdjacentHTML("beforeend", par("x-alt-classe"));
	$("#row-assunto td:nth-child(2)").insertAdjacentHTML("beforeend", par("x-alt-assunto"));
}

// ------------------------------------------------------------------ V42
CENAS.V42 = {
	arquivo: "V42-alterar-classe-e-assuntos.mp4",
	titulo: "Alterar Classe/Assuntos",
	secao: "8.9",
	async run() {
		telaProcesso({});
		cardsAlterar();
		await S.titleCard("VÍDEO V42", "Alterar Classe/Assuntos", "A tela do botão “Alterar” (Informações Gerais) num popup, direto do cabeçalho do processo.");
		S.hl("#info", 4);
		await S.cap("No cabeçalho do processo, ao lado da <b>Classe Processual</b> e do <b>Assunto Principal</b>, há o card <b>✏️ Alterar</b>.");
		S.hlOff();
		await S.cap("Funciona em qualquer aba — não é preciso abrir <b>Informações Gerais</b>. Clique no da classe.");
		await S.click("#x-alt-classe");
		await abrindo("Alterar Classe/Assuntos", 1100);
		const campo = (rot, val, id) => '<tr' + (id ? ' id="' + id + '"' : "") + '><td class="l" style="width:230px"><b style="color:#c00">*</b> ' + rot + '</td><td><span class="pj-select" style="min-width:420px;display:inline-block">' + val + '</span> <span class="pj-btn">🔍</span></td></tr>';
		popup("Alteração de Processo",
			'<h4 style="margin:0 0 6px;color:#0d3560">Informações Processuais</h4><table class="pj-info" style="width:100%">' +
			campo("Classe Processual:", "283 - Ação Penal - Procedimento Ordinário", "x-ed-classe") +
			'<tr><td class="l">Motivo da Alteração da Classe Processual:</td><td><span id="x-ed-motivo">○ Retificação &nbsp; ○ Evolução</span></td></tr>' +
			campo("Assunto Principal:", "3418 - Furto Qualificado", "x-ed-assunto") +
			'<tr><td class="l">Assuntos Secundários:</td><td><span class="pj-btn">Adicionar</span> <span class="pj-btn">Remover</span></td></tr></table>' +
			'<div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn" id="x-ed-salvar">Salvar</span><span class="pj-btn">Voltar</span></div>',
			{ hd: "Alterar Classe/Assuntos — popup da extensão" });
		S.hl("#x-ed-classe", 3);
		await S.cap("Abre a tela de alteração do processo (a mesma do botão nativo <b>Alterar</b>), já no campo clicado.");
		S.hlOff();
		await S.click("#x-ed-classe .pj-btn");
		$("#x-ed-classe .pj-select").textContent = "10943 - Execução da Pena";
		$("#x-ed-motivo").textContent = "○ Retificação   ● Evolução";
		await S.cap("Escolha a nova classe e o <b>motivo</b> (Retificação ou Evolução), como de costume no Projudi.");
		await S.cap("Para os assuntos, use o card do <b>Assunto Principal</b> — é a mesma tela, com os assuntos secundários.", { ms: 2600 });
		await S.click("#x-ed-salvar");
		$(".x-popup").remove();
		$("#info tr:first-child td:nth-child(2)").firstChild.textContent = "Execução da Pena";
		S.hl("#info", 4);
		await S.cap("Ao <b>Salvar</b>, o popup fecha sozinho e a tela do processo é recarregada com a classe nova.");
		S.hlOff();
		await S.endCard("✏️ Alterar (classe ou assunto, no cabeçalho) → tela de alteração em popup → Salvar → a tela do processo é atualizada.");
	},
};

// ------------------------------------------------------------------ V43
CENAS.V43 = {
	arquivo: "V43-preferencia-de-alteracao-de-classe.mp4",
	titulo: "Preferência de alteração de classe",
	secao: "8.9",
	async run() {
		telaProcesso({});
		cardsAlterar();
		await S.titleCard("VÍDEO V43", "Preferência de alteração de classe", "Grave uma vez a classe e o motivo; depois, um clique altera e salva.");
		await S.cap("Ao lado de <b>✏️ Alterar</b> há a <b>⭐</b>. Clique na da classe.");
		await S.click("#x-alt-classe-pref");
		let pn = panelAt('<h4>⭐ Preferências — Alterar classe</h4><p style="color:#666;margin:0 0 8px">Nenhuma preferência gravada.</p><span class="x-btn small" id="x-nova">+ Nova preferência</span>', "#x-alt-classe-pref", { w: 300 });
		pn.style.left = "330px"; pn.style.top = "180px";
		await S.click("#x-nova");
		pn.remove();
		await abrindo("Alterar Classe/Assuntos", 900);
		const campo = (rot, val, id) => '<tr' + (id ? ' id="' + id + '"' : "") + '><td class="l" style="width:230px"><b style="color:#c00">*</b> ' + rot + '</td><td><span class="pj-select" style="min-width:420px;display:inline-block">' + val + '</span> <span class="pj-btn">🔍</span></td></tr>';
		popup("Alteração de Processo",
			'<div style="margin:0 0 10px;padding:8px 10px;border:1px solid #d4b106;background:#fffbe6;color:#5c4400;border-radius:4px"><b>⭐ Gravando preferência.</b> Escolha a nova classe e o <b>Motivo da Alteração</b> e clique em <b>Salvar</b>. Esse clique só grava a preferência: <b>o processo não é alterado agora</b>.</div>' +
			'<table class="pj-info" style="width:100%">' +
			campo("Classe Processual:", "283 - Ação Penal - Procedimento Ordinário", "x-ed-classe") +
			'<tr><td class="l">Motivo da Alteração da Classe Processual:</td><td><span id="x-ed-motivo">○ Retificação &nbsp; ○ Evolução</span></td></tr>' +
			campo("Assunto Principal:", "3418 - Furto Qualificado") + "</table>" +
			'<div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn" id="x-ed-salvar">Salvar</span><span class="pj-btn">Voltar</span></div>',
			{ hd: "Alterar Classe/Assuntos — popup da extensão" });
		await S.cap("O aviso amarelo indica que você está <b>gravando</b> uma preferência.");
		await S.click("#x-ed-classe .pj-btn");
		$("#x-ed-classe .pj-select").textContent = "279 - Inquérito Policial";
		await S.click("#x-ed-motivo");
		$("#x-ed-motivo").textContent = "○ Retificação   ● Evolução";
		await S.cap("Escolha a classe e o motivo e clique em <b>Salvar</b>.");
		await S.click("#x-ed-salvar");
		const m = modal('<b>Nome da preferência:</b><div class="pj-select" style="display:block;margin:8px 0">Inquérito Policial (Evolução)</div><span class="x-btn small green" id="x-ok">OK</span>', { w: 380, top: 200 });
		await S.cap("A extensão só guarda o que você escolheu — <b>o processo não é alterado</b> — e pede um nome.");
		await S.click("#x-ok");
		closeModal();
		$(".x-popup").remove();
		await S.cap("Pronto. Para usar, clique na <b>⭐</b> e no nome da preferência.");
		await S.click("#x-alt-classe-pref");
		pn = panelAt('<h4>⭐ Preferências — Alterar classe</h4><div style="display:flex;gap:4px;margin-bottom:6px"><span class="x-btn small" id="x-pref" style="flex:1">★ Inquérito Policial (Evolução)</span><span class="x-btn small">🗑</span></div><span class="x-btn small">+ Nova preferência</span>', "#x-alt-classe-pref", { w: 320 });
		pn.style.left = "330px"; pn.style.top = "180px";
		await S.click("#x-pref");
		pn.remove();
		const t = toast("★ Inquérito Policial (Evolução) — preenchendo…", { left: 470, top: 90 });
		await sleep(1200);
		t.innerHTML = "★ Inquérito Policial (Evolução) — salvando…";
		await sleep(1200);
		t.remove();
		$("#info tr:first-child td:nth-child(2)").firstChild.textContent = "Inquérito Policial";
		S.hl("#info", 4);
		await S.cap("A extensão escolhe a classe, marca o motivo e clica em <b>Salvar</b> sozinha. A tela é recarregada já com a classe nova.", { ms: 3600 });
		S.hlOff();
		await S.endCard("⭐ → + Nova preferência → classe + motivo → Salvar (só grava). Depois: ⭐ → ★ preferência → alterado e salvo, sem confirmação.");
	},
};

// ------------------------------------------------------------------ V44
// Tela inicial do processo (aba Movimentações) num painel, ao pousar o mouse
// sobre o número do processo nas listas de decurso de prazo.
function painelProcesso(n, x, y) {
	const abas = ABAS.map(([k, nm]) => '<span class="pj-tab' + (k === "mov" ? " on" : "") + '">' + nm + "</span>").join("");
	const linhas = MOVS.slice(0, 6).map((m, i) => '<tr class="' + (i % 2 ? "alt" : "") + '"><td>' + m.seq + "</td><td>" + m.data + "</td><td>" + (m.files.length ? '<span class="pj-plus">+</span>' : "") + m.ev + "</td><td>" + m.por + '<span class="papel">' + m.papel + "</span></td></tr>").join("");
	const p = add('<div class="x-preview" id="x-proc" style="width:760px;height:500px;background:#fff">' +
		'<div class="hd"><span class="t">Processo ' + n + ' — Movimentações</span><span class="x-btn small" id="x-fixar" style="background:#f5f7ef;color:#35412b">📌 Fixar</span><span>Abrir em nova aba ↗</span><span>✕</span></div>' +
		'<div id="x-proc-bd" style="position:relative;height:464px;overflow:hidden">' +
		'<div style="padding:8px 12px;font-size:12px"><div class="pj-title">Processo <em class="attention">' + n + '</em><span class="dias">(212 dia(s) em tramitação)</span></div>' +
		'<table class="pj-info"><tr><td class="l">Classe Processual:</td><td>Ação Penal - Procedimento Ordinário</td><td class="l">Juízo:</td><td>Vara Criminal de Exemplo</td></tr></table>' +
		'<div class="pj-tabs">' + abas + '</div><table class="pj-table" id="x-proc-movs"><tr><th style="width:40px">Seq.</th><th style="width:110px">Data</th><th>Evento</th><th style="width:200px">Movimentado Por</th></tr>' + linhas + "</table></div>" +
		'<div id="x-proc-load" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f5f7ef;color:#35412b;font-size:13px">Carregando o processo…</div>' +
		"</div></div>");
	Object.assign(p.style, { left: x + "px", top: y + "px" });
	return p;
}

CENAS.V44 = {
	arquivo: "V44-processo-ao-passar-o-mouse.mp4",
	titulo: "Processo ao passar o mouse no Decurso de Prazo",
	secao: "9.8",
	async run() {
		telaLista("Decurso de Prazo - Intimação", { path: "intimacaoBusca.do", col: "Data Decurso" });
		await S.titleCard("VÍDEO V44", "Processo ao passar o mouse", "Veja a tela do processo, já na aba Movimentações, sem sair da lista de decurso de prazo.");
		await S.cap("Nas listas de <b>Decurso de Prazo</b> (Intimação, Auxiliares da Justiça e Citações/Notificações), pare o mouse sobre o <b>número do processo</b>.");
		const link = $('#lista tr[data-i="1"] a.link');
		await S.move(link);
		await sleep(500);
		let p = painelProcesso(LISTA[1].n, 470, 180);
		await sleep(900);
		$("#x-proc-load").textContent = "Abrindo a aba Movimentações…";
		await sleep(800);
		$("#x-proc-load").remove();
		await S.cap("A tela do processo abre num painel sobre a lista, já na aba <b>Movimentações</b>. Role dentro dele normalmente.");
		S.hl("#x-proc-movs", 4);
		await S.cap("Dentro do painel a tela funciona como sempre: passe o mouse sobre um arquivo para lê-lo.");
		S.hlOff();
		await S.cap("Para fechar: tire o mouse do número e do painel, clique em <b>✕</b> ou tecle <b>Esc</b>.");
		await S.move({ x: 300, y: 560 });
		p.remove();
		await sleep(500);
		await S.cap("Quer o painel aberto mesmo tirando o mouse? Clique em <b>📌 Fixar</b>.");
		await S.move($('#lista tr[data-i="3"] a.link'));
		await sleep(500);
		p = painelProcesso(LISTA[3].n, 470, 180);
		await sleep(900);
		$("#x-proc-load").remove();
		await S.click("#x-fixar");
		$("#x-fixar").textContent = "📌 Fixado";
		p.style.outline = "2px solid #b59a1f";
		await S.move({ x: 300, y: 560 });
		await S.cap("Fixado, ele só fecha no <b>✕</b>. “Abrir em nova aba” abre o processo do jeito tradicional.", { ms: 3200 });
		p.remove();
		await S.endCard("Mouse parado sobre o número do processo = tela do processo na aba Movimentações. 📌 Fixar mantém aberto; Esc ou ✕ fecha.");
	},
};

// ------------------------------------------------------------------ V45
// ⭐ em lote (preferenciasNaLinha.js): caixinha abaixo do "+" da primeira
// coluna e a barra "⭐ Em lote" acima da tabela.
CENAS.V45 = {
	arquivo: "V45-preferencias-em-lote.mp4",
	titulo: "Preferências em lote (⭐ Em lote)",
	secao: "9.3",
	async run() {
		telaLista("Análise de Juntadas");
		$$("#lista tr[data-i]").forEach((tr, i) => {
			tr.cells[0].innerHTML = '<div style="text-align:center"><span style="display:inline-block;width:11px;height:11px;border:1px solid #777;font:bold 10px/10px Arial;text-align:center">+</span><div style="margin-top:4px"><input type="checkbox" data-lote="' + i + '"></div></div>';
		});
		$$(".x-rowslot").forEach((s, i) => (s.innerHTML = ' <span class="x-btn small">+</span> <span class="x-btn small">⭐</span><span class="st" data-st="' + i + '" style="margin-left:6px;font-size:11px"></span>'));
		$("#slot-legenda").innerHTML = '<div id="x-lote" style="display:flex;gap:8px;align-items:center;margin:6px 0;padding:5px 8px;background:#fffaf0;border:1px solid #e8cf8a;border-radius:6px;font-size:12px">' +
			'<b>⭐ Em lote:</b> <label><input type="checkbox"> marcar todos</label> <span id="x-cont" style="color:#5a6b4a">0 processo(s) marcado(s)</span>' +
			' <span class="x-btn small" id="x-exec" style="opacity:.5">⭐ Executar preferência nos marcados</span> <span id="x-lote-st" style="color:#1f4a7a;font-weight:bold"></span></div>';
		const marcar = async i => { await S.click('[data-lote="' + i + '"]'); $('[data-lote="' + i + '"]').checked = true; };
		const cont = n => { $("#x-cont").textContent = n + " processo(s) marcado(s)"; $("#x-exec").style.opacity = n ? "1" : ".5"; };
		await S.titleCard("VÍDEO V45", "Preferências em lote (⭐ Em lote)", "A mesma preferência ou combo em vários processos da lista, um de cada vez.");
		await S.cap("Cada linha ganhou uma <b>caixinha de marcar</b>, logo abaixo do <b>+</b> da primeira coluna.");
		await marcar(0); cont(1);
		await marcar(2); cont(2);
		await marcar(3); cont(3);
		S.hl("#x-lote", 2);
		await S.cap("A barra <b>⭐ Em lote</b>, acima da tabela, conta os processos marcados (há também “marcar todos”).");
		S.hlOff();
		await S.click("#x-exec");
		const pn = panelAt('<h4>⭐ Em lote — 3 processo(s) marcado(s)</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
			'<div class="x-chip" id="card" style="display:block;border-radius:6px;padding:8px;margin:0"><b>★ Remessa MP</b><div style="color:#666">Realizar Remessa</div></div>' +
			'<div class="x-chip" style="display:block;border-radius:6px;padding:8px;margin:0"><b>★ Concluso p/ sentença</b><div style="color:#666">Enviar Concluso</div></div></div>', "#x-exec", { w: 440 });
		pn.style.left = "420px"; pn.style.top = "250px";
		await S.cap("Escolha a preferência ou o combo — os mesmos cards da ⭐ da linha.");
		await S.click("#card");
		pn.remove();
		modal('<h3>Em lote (3 processos) · ★ Remessa MP</h3><div>Dispensar as juntadas pendentes de cada processo marcado antes de executar a preferência?</div><div style="color:#888;font-style:italic;margin-top:6px">A resposta vale para os 3 processos marcados.</div><div style="text-align:right;margin-top:12px"><span class="pj-btn primary" id="sim">✅ Sim, dispensar juntadas</span> <span class="pj-btn">Não, seguir sem isso</span></div>', { w: 540, top: 200 });
		await S.cap("A pergunta sobre as pendências é feita <b>uma vez só</b>, para todos os marcados.", { ms: 3800 });
		await S.click("#sim");
		closeModal();
		modal('<h3>Confirmar o lote</h3><div>Executar ★ Remessa MP — Realizar Remessa em 3 processo(s):</div>' +
			'<div style="font-family:monospace;margin:6px 0 6px 10px">1. ' + LISTA[0].n + '<br>2. ' + LISTA[2].n + '<br>3. ' + LISTA[3].n + '</div>' +
			'<div>Antes, em cada processo: dispensar juntadas (automático).</div><div style="margin-top:6px">Se ocorrer um erro, o lote para no processo com erro.</div>' +
			'<div style="text-align:right;margin-top:12px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="okLote">OK</span></div>', { w: 540, top: 190 });
		await S.cap("Antes de começar, a extensão mostra <b>a lista dos processos</b> que serão afetados e o que será feito automaticamente. Confira e clique em <b>OK</b>.", { ms: 4400 });
		await S.click("#okLote");
		closeModal();
		for (const [k, i] of [[1, 0], [2, 2], [3, 3]]) {
			$("#x-lote-st").textContent = "Processo " + k + " de 3: " + LISTA[i].n + "…";
			const tr = $('#lista tr[data-i="' + i + '"]');
			tr.style.outline = "2px solid #f0b400";
			const st = $('[data-st="' + i + '"]');
			st.textContent = "Dispensando juntadas…";
			await sleep(700);
			st.textContent = "✅ Juntada(s) dispensada(s) · ★ Remessa MP: abrindo…";
			popup("Realizar Remessa — " + LISTA[i].n, dlgRemessa({ op: "op-mp", dest: "Ministério Público", fin: "Manifestação", prazo: "5" }), { top: 120, h: 480 });
			bar('Confirmar “Realizar Remessa” com a preferência “Remessa MP”? <span class="x-btn small green" id="exec">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
			if (k === 1) await S.cap("O popup de cada processo abre preenchido: basta <b>✅ Sim, executar</b>.");
			await S.click("#exec");
			$(".x-bar").remove(); $(".x-popup").remove();
			st.textContent = "✅ Juntada(s) dispensada(s) · ★ Remessa MP: concluída";
			$('[data-lote="' + i + '"]').checked = false;
			tr.style.outline = "";
			cont(3 - k);
		}
		$("#x-lote-st").textContent = "Lote concluído: 3 executado(s)";
		S.hl("#x-lote", 3);
		await S.cap("Cada processo executado é desmarcado; os que não forem executados <b>continuam marcados</b>.");
		S.hlOff();
		await S.cap("Se der <b>erro</b> num processo, o lote <b>para ali</b>: os seguintes não são tocados e continuam marcados.", { ms: 3800 });
		await S.cap("No SEEU, a barra associa os localizadores do <b>📍 Localizador</b> em todos os marcados, sem confirmar um a um.", { ms: 4200 });
		await S.endCard("Marque os processos → ⭐ Executar preferência nos marcados → card → uma resposta → ✅ Sim, executar em cada um.");
	},
};

// ------------------------------------------------------------------ V46
// "Remessa Eletrônica para a Turma Recursal" no grupo Remessa das ações
// rápidas (ACTION_GROUPS em src/quickActions.js). A tela do Projudi
// (remessaAutos.do, "Envio do Processo ... para a Instância Superior") não
// tem campos da remessa: a preferência é gravada sem campos e só abre a
// tela e confirma (ACTIONS_PREF_SEM_CAMPOS).
function telaEnvioInstanciaSuperior() {
	return '<h3 style="margin:0 0 8px">Envio do Processo ' + PROC + ' para a Instância Superior</h3>' +
		'<table class="pj-form"><tr><td class="l">Processo:</td><td><u>' + PROC + '</u></td></tr>' +
		'<tr><td class="l">Vara:</td><td>Juizado Especial Cível de Exemplo</td></tr>' +
		'<tr><td class="l">Classe Processual:</td><td>436 - Procedimento do Juizado Especial Cível</td></tr>' +
		'<tr><td class="l">Polo Ativo:</td><td>JOSÉ EXEMPLO</td></tr>' +
		'<tr><td class="l">Polo Passivo:</td><td>EMPRESA EXEMPLO S/A</td></tr></table>' +
		'<h4 style="margin:10px 0 4px">Advogados</h4>' +
		'<table class="pj-table" style="width:640px"><tr><th style="width:24px"></th><th>OAB</th><th>Advogado/Sociedade de Advogados</th><th>Partes</th></tr>' +
		'<tr><td><input type="radio"></td><td>12345N-PR</td><td>JOÃO EXEMPLO</td><td>(Polo Ativo) JOSÉ EXEMPLO</td></tr></table>' +
		'<div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn">Adicionar</span><span class="pj-btn">Alterar</span><span class="pj-btn">Remover</span></div>' +
		'<div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn primary" id="f-confirmar">Confirmar</span><span class="pj-btn">Voltar</span></div>';
}
CENAS.V46 = {
	arquivo: "V46-remessa-turma-recursal.mp4",
	titulo: "Remessa para a Turma Recursal",
	secao: "7.1",
	async run() {
		telaProcesso({ acoesAbertas: true });
		const acoes = prefs => [{ nome: "Realizar Remessa" }, { nome: "Remessa Eletrônica para o Tribunal de Justiça" }, { nome: "Remessa Eletrônica para a Turma Recursal", prefs }];
		await S.titleCard("VÍDEO V46", "Remessa para a Turma Recursal", "Nos Juizados Especiais, pelo botão Remessa — e com preferência.");
		await S.cap("Clique no grupo <b>Remessa</b>.");
		await S.click('[data-g="Remessa"]');
		let pn = panelAt(acaoPanel("Remessa", acoes()), '[data-g="Remessa"]', { w: 440 });
		await S.cap("Além das remessas de sempre, aparece <b>Remessa Eletrônica para a Turma Recursal</b>.", { ms: 3600 });
		await S.cap("Para gravar uma preferência, clique em <b>+ Nova preferência</b> nela.");
		await S.click('[data-nova="Remessa Eletrônica para a Turma Recursal"]');
		pn.remove();
		await abrindo("Remessa Eletrônica para a Turma Recursal", 900);
		popup("Remessa Eletrônica para a Turma Recursal", telaEnvioInstanciaSuperior(), { top: 120, h: 470 });
		const b = bar('Preencha o diálogo e clique em <span class="x-btn small" id="salvarpref">💾 Salvar como preferência</span>', { top: 78 });
		await S.cap("Abre a tela <b>Envio do Processo para a Instância Superior</b>. Ela não tem campos da remessa: só confere os dados e os advogados.", { ms: 4400 });
		await S.click("#salvarpref");
		modal('<h3>Salvar como preferência</h3><div class="x-note">Esta tela não tem campos para gravar: a preferência só abre "Remessa Eletrônica para a Turma Recursal" e pede a confirmação (que clica em "Confirmar").</div><div style="margin-top:8px">Nome da preferência:</div><div class="x-field" id="nm"></div><div style="text-align:right;margin-top:10px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="ok">Salvar</span></div>', { top: 170 });
		await S.cap("A preferência guarda só a ação — a bolinha do advogado, que muda de processo para processo, fica de fora.", { ms: 4200 });
		await S.type("#nm", "Turma Recursal");
		await S.click("#ok");
		closeModal(); b.remove(); $(".x-popup").remove();
		await S.click('[data-g="Remessa"]');
		pn = panelAt(acaoPanel("Remessa", acoes(["Turma Recursal"])), '[data-g="Remessa"]', { w: 440 });
		await S.cap("Pronto: a preferência <b>★ Turma Recursal</b> fica no painel.", { ms: 3200 });
		await S.click('[data-pref="Turma Recursal"]', { dx: -30 });
		pn.remove();
		await abrindo("Remessa Eletrônica para a Turma Recursal", 900);
		popup("Remessa Eletrônica para a Turma Recursal", telaEnvioInstanciaSuperior(), { top: 120, h: 470 });
		const c = bar('Confirmar "Remessa Eletrônica para a Turma Recursal" com a preferência "Turma Recursal"? <span class="x-btn small green" id="sim">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("Confira a tela e clique em <b>✅ Sim, executar</b> — a extensão clica em <b>Confirmar</b>.", { ms: 3600 });
		await S.click("#sim");
		c.remove(); $(".x-popup").remove();
		await S.endCard("Remessa → Turma Recursal → + Nova preferência → 💾 Salvar (sem campos) → ★ preferência → ✅ Sim, executar (Confirmar).");
	},
};

// ------------------------------------------------------------------ V47
// Linha "Valor da Causa" + balão "💲 Novo Valor da Causa" no cabeçalho do processo (alterarValorCausa.js).
CENAS.V47 = {
	arquivo: "V47-novo-valor-da-causa.mp4",
	titulo: "Novo Valor da Causa",
	secao: "8.10",
	async run() {
		telaProcesso({});
		$("#row-assunto").insertAdjacentHTML("afterend",
			'<tr id="row-valor"><td class="l">Valor da Causa:</td><td colspan="3"><span id="x-valor">R$ 324,80</span> <a id="x-novo-valor" style="' + ESTILO_BALAO + '">💲 Novo Valor da Causa</a></td></tr>');
		await S.titleCard("VÍDEO V47", "Novo Valor da Causa", "Informe o novo valor: a extensão altera e salva no processo, sem abrir a tela de alteração.");
		S.hl("#row-valor", 4);
		await S.cap("No cabeçalho do processo, a extensão mostra a linha <b>Valor da Causa</b>, com o card <b>💲 Novo Valor da Causa</b> ao lado.");
		S.hlOff();
		await S.cap("Ela aparece em qualquer aba — não é preciso abrir <b>Informações Gerais</b>.", { ms: 2600 });
		await S.click("#x-novo-valor");
		const pn = panelAt('<h4>💲 Novo Valor da Causa</h4><p style="color:#555;margin:0 0 8px">Valor atual: R$ 324,80</p>' +
			'<div><b>Novo valor: R$</b> <span class="pj-input" id="x-nv" style="min-width:120px;display:inline-block;text-align:right"></span></div>' +
			'<p style="color:#666;margin:6px 0 8px">Digite o valor com os centavos (ex.: 1.500,00). Ao salvar, o Projudi registra a alteração nas Movimentações.</p>' +
			'<div style="display:flex;gap:6px;justify-content:flex-end"><span class="x-btn small" id="x-nv-salvar"><b>Salvar</b></span><span class="x-btn small">Cancelar</span></div>', "#x-novo-valor", { w: 340 });
		const ra = $("#x-novo-valor").getBoundingClientRect();
		pn.style.left = ra.left + "px"; pn.style.top = ra.bottom + 6 + "px";
		await S.cap("Abre um quadrinho com o valor atual. Digite o <b>novo valor</b>, com os centavos.");
		await S.type("#x-nv", "1.500,00");
		await S.click("#x-nv-salvar");
		pn.remove();
		const t = toast("Novo Valor da Causa — abrindo a tela de alteração…", { left: 420, top: 90 });
		await sleep(1100);
		t.textContent = "Novo Valor da Causa — preenchendo R$ 1.500,00…";
		await sleep(1100);
		t.textContent = "Novo Valor da Causa — salvando…";
		await S.cap("Sem abrir nenhuma tela, a extensão preenche o <b>Valor da Causa</b> na tela de alteração e clica em <b>Salvar</b> sozinha.", { ms: 3800 });
		t.remove();
		$("#x-valor").textContent = "R$ 1.500,00";
		S.hl("#row-valor", 4);
		await S.cap("A tela do processo é recarregada já com o valor novo; o Projudi registra a alteração na aba <b>Movimentações</b>.", { ms: 3800 });
		S.hlOff();
		await S.endCard("Informações Gerais → 💲 Novo Valor da Causa → digite o valor → Salvar → alterado e salvo no processo.");
	},
};
