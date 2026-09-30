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
