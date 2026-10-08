// Cenas V28–V33: telas de análise, mesa do analista, cumprimentos e BNMP.
"use strict";

// ------------------------------------------------------------------ V28
CENAS.V28 = {
	arquivo: "V28-sequencial-no-decurso-de-prazo.mp4",
	titulo: "Filtro por Sequencial no Decurso de Prazo",
	secao: "9.1",
	async run() {
		telaLista("Análise de Decurso de Prazo", { path: "intimacaoBusca.do", seqField: true, col: "Intimação em" });
		await S.titleCard("VÍDEO V28", "Filtro por Sequencial no Decurso de Prazo", "Divida a fila de decursos entre servidores pelo último dígito do Sequencial.");
		S.hl("#f-seq", 6);
		await S.cap("Na <b>Análise de Decurso de Prazo</b>, a extensão acrescenta o campo <b>Sequencial</b> (um dígito, de 0 a 9).");
		S.hlOff();
		await S.type("#f-seq", "7");
		await S.cap("Digite o dígito e clique em <b>Filtrar</b>.");
		await S.click("#f-filtrar");
		const t = toast("Buscando página 2 de 5…", { left: 560, top: 380 });
		for (let p = 3; p <= 5; p++) { await sleep(600); t.textContent = "Buscando página " + p + " de 5…"; }
		await sleep(500); t.remove();
		$$("#lista tr[data-i]").forEach(tr => { if (!/7$/.test(LISTA[+tr.dataset.i].seq)) tr.remove(); });
		$("#paginacao").innerHTML = '<span style="background:#fff8d8;border:1px solid #d9c46a;padding:3px 8px">3 processo(s) com Sequencial terminado em 7 — 5 página(s) percorrida(s)</span>';
		await S.cap("A extensão percorre <b>todas as páginas</b> sozinha e mostra só os processos cujo Seq. termina no dígito.");
		await S.cap("Para voltar à lista completa, apague o dígito e filtre de novo.");
		await S.endCard("Decurso de Prazo → Sequencial (0–9) → Filtrar → resultado de todas as páginas.");
	},
};

// ------------------------------------------------------------------ V29
CENAS.V29 = {
	arquivo: "V29-listas-de-tarefas.mp4",
	titulo: "Listas de tarefas",
	secao: "9.2",
	async run() {
		telaLista("Análise de Juntadas");
		$$(".x-rowslot").forEach((s, i) => (s.innerHTML = ' <span class="x-btn small" data-plus="' + i + '">+</span>'));
		$("#slot-legenda").innerHTML = '<div id="leg" style="display:flex;gap:10px;align-items:center;margin:6px 0;font-size:12px"><b>Listas de tarefas:</b><span id="legs"></span><span class="x-btn small" id="ger" style="margin-left:auto">⚙ Gerenciar listas e preferências</span></div>';
		await S.titleCard("VÍDEO V29", "Listas de tarefas", "Organize os processos das telas de análise com cores e anotações.");
		await S.cap("Nas telas <b>Análise de Juntadas</b>, <b>Retorno de Conclusão</b> e <b>Decurso de Prazo</b> aparece a barra “Listas de tarefas”.");
		await S.cap("Primeiro, crie suas listas em <b>⚙ Gerenciar listas e preferências</b>.");
		await S.click("#ger");
		modal('<h3>Listas de tarefas — listas (legenda) e preferências</h3><b>Listas (cores da legenda)</b><div class="x-list" id="ll"></div>' +
			'<div style="display:flex;gap:6px;margin-top:6px;align-items:center"><div class="x-field" id="ln" style="flex:1"></div><span class="x-swatch" style="background:#e53935" id="red"></span><span class="x-swatch" style="background:#1e88e5"></span><span class="x-swatch" style="background:#43a047"></span><span class="pj-btn" id="cl">+ Criar lista</span></div>' +
			'<b style="display:block;margin-top:12px">Preferências (tarefas prontas, aplicadas com um clique)</b><div class="x-list" id="pl"></div>' +
			'<div style="display:flex;gap:6px;margin-top:6px"><div class="x-field" id="pt" style="flex:1"></div><span class="pj-select" style="min-width:120px" id="plst">Lista</span><span class="pj-btn" id="cp">+ Criar preferência</span></div>' +
			'<div style="text-align:right;margin-top:12px"><span class="pj-btn" id="fechar">Fechar</span></div>', { w: 640, top: 90 });
		await S.type("#ln", "Urgente");
		await S.click("#red");
		await S.click("#cl");
		$("#ll").innerHTML = '<div><span class="x-dot" style="background:#e53935"></span> Urgente <span style="margin-left:auto">▲ ▼ ✏️ 🗑</span></div>';
		$("#ln").textContent = "";
		await S.cap("Uma <b>preferência</b> é uma tarefa pronta que também põe o processo numa lista.");
		await S.type("#pt", "Certificar decurso");
		await selecionar("#plst", "● Urgente");
		await S.click("#cp");
		$("#pl").innerHTML = '<div>Certificar decurso <span class="x-dot" style="background:#e53935"></span> <span style="margin-left:auto">▲ ▼ ✏️ 🗑</span></div>';
		await S.click("#fechar");
		closeModal();
		$("#legs").innerHTML = '<span id="lg1"><span class="x-dot" style="background:#e53935"></span> Urgente (0)</span>';
		await S.cap("Na linha do processo, clique em <b>+</b> para abrir o painel dele.");
		await S.click('[data-plus="1"]');
		const pn = panelAt('<h4>Listas e tarefas deste processo</h4><b>Listas (cores)</b><div><label><input type="checkbox" id="lu"> <span class="x-dot" style="background:#e53935"></span> Urgente</label></div>' +
			'<b style="display:block;margin-top:8px">Tarefas</b><div class="x-list" id="tl"><div style="color:#888">Nenhuma tarefa escrita.</div></div><div class="x-field" id="tn" style="margin-top:4px;color:#555"></div>' +
			'<b style="display:block;margin-top:8px">Preferências (tarefas prontas)</b><div>Certificar decurso <span class="x-btn small">Adicionar esta tarefa</span></div>', '[data-plus="1"]', { w: 360 });
		pn.style.left = "560px"; pn.style.top = "190px";
		await S.cap("Marque as listas (cores) e escreva tarefas — tecle <b>Enter</b> para incluir.");
		await S.click("#lu"); $("#lu").checked = true;
		await S.type("#tn", "Ligar para a delegacia");
		$("#tl").innerHTML = "<div>☐ Ligar para a delegacia <span style=\"margin-left:auto\">✏️ 🗑</span></div>";
		$("#tn").textContent = "";
		await sleep(600);
		pn.remove();
		$('[data-plus="1"]').insertAdjacentHTML("beforebegin", '<span class="x-dot" style="background:#e53935;margin:0 3px"></span><span id="tk" style="font-size:11px;color:#7a3d0b">✎ 1</span> ');
		$("#legs").innerHTML = '<span id="lg1" style="cursor:pointer"><span class="x-dot" style="background:#e53935"></span> Urgente (1)</span>';
		await S.cap("A linha ganha a <b>bolinha</b> da lista e o contador <b>✎ 1</b> de tarefas pendentes (passe o mouse para ler).");
		await S.cap("Clique numa lista da legenda para <b>filtrar</b> a tabela; “✕ limpar filtro” mostra todos de novo.");
		await S.click("#lg1");
		$$("#lista tr[data-i]").forEach(tr => { if (tr.dataset.i !== "1") tr.style.display = "none"; });
		$("#legs").insertAdjacentHTML("beforeend", ' <span class="x-btn small">✕ limpar filtro</span>');
		await S.cap("As marcações ficam no seu navegador e valem nas três telas, pelo número do processo.");
		await S.endCard("⚙ criar listas/preferências → + na linha → cores e tarefas → clique na legenda para filtrar.");
	},
};

// ------------------------------------------------------------------ V30
CENAS.V30 = {
	arquivo: "V30-minhas-preferencias-na-linha.mp4",
	titulo: "Minhas Preferências na linha do processo (⭐)",
	secao: "9.3",
	async run() {
		telaLista("Análise de Juntadas");
		$$(".x-rowslot").forEach((s, i) => (s.innerHTML = ' <span class="x-btn small">+</span> <span class="x-btn small" data-star="' + i + '">⭐</span><span class="st" data-st="' + i + '" style="margin-left:6px;font-size:11px"></span>'));
		await S.titleCard("VÍDEO V30", "Minhas Preferências na linha do processo (⭐)", "Execute uma preferência num processo direto da tela de análise.");
		await S.cap("Nas telas de análise, cada linha tem o botão <b>⭐</b>, ao lado do <b>+</b>.");
		await S.click('[data-star="0"]');
		const pn = panelAt('<h4>Minhas Preferências</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
			'<div class="x-chip" id="card" style="display:block;border-radius:6px;padding:8px;margin:0"><b>★ Remessa MP</b><div style="color:#666">Realizar Remessa</div></div>' +
			'<div class="x-chip" style="display:block;border-radius:6px;padding:8px;margin:0"><b>★ Concluso p/ sentença</b><div style="color:#666">Enviar Concluso</div></div>' +
			'<div class="x-chip" style="display:block;border-radius:6px;padding:8px;margin:0;opacity:.5"><b>★ Certidão de decurso</b><div style="color:#666">Juntar Documento</div></div>' +
			'<div class="x-chip combo" style="display:block;border-radius:6px;padding:8px;margin:0"><b>▶ Decurso + concluso</b><div class="acao" style="color:#1a5fb4">🔗 Combo · nova aba</div></div></div>', '[data-star="0"]', { w: 440 });
		pn.style.left = "520px"; pn.style.top = "200px";
		await S.cap("Escolha um card. Preferências de Juntar Documento e Alvará ficam esmaecidas (só na tela do processo).");
		await S.click("#card");
		pn.remove();
		modal('<h3>Minhas Preferências</h3><div>Dispensar as juntadas pendentes deste processo antes de executar a preferência?</div><div style="text-align:right;margin-top:12px"><span class="pj-btn primary" id="sim">Sim, dispensar juntadas</span> <span class="pj-btn">Não</span></div>', { w: 520, top: 200 });
		await S.cap("A extensão pergunta se deve antes <b>dispensar as juntadas</b> (no Retorno de Conclusão: finalizar a conclusão; no Decurso: dispensar decursos).", { ms: 5200 });
		await S.click("#sim");
		closeModal();
		const st = $('[data-st="0"]');
		st.textContent = "Dispensando juntadas…";
		await sleep(1400);
		st.textContent = "✅ Juntada(s) já dispensada(s) · ★ Remessa MP: abrindo…";
		await abrindo("Realizar Remessa", 900);
		popup("Realizar Remessa", dlgRemessa({ op: "op-mp", dest: "Ministério Público", fin: "Manifestação", prazo: "5" }), { top: 120, h: 480 });
		bar('Confirmar “Realizar Remessa” com a preferência “Remessa MP”? <span class="x-btn small green" id="exec">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("O diálogo abre preenchido, com o <b>✅ Sim, executar</b> de sempre.");
		await S.click("#exec");
		$(".x-bar").remove(); $(".x-popup").remove();
		st.textContent = "✅ Juntada(s) já dispensada(s) · ★ Remessa MP: concluída";
		S.hl(st, 3);
		await S.cap("A linha mostra o resultado. A lista <b>não é recarregada</b>, para não perder a busca feita.");
		S.hlOff();
		await S.cap("Combos com Juntar Documento ou Alvará abrem o processo numa <b>nova aba</b> e rodam lá.");
		await S.endCard("⭐ na linha → card → dispensar/finalizar antes? → conferir → ✅ Sim, executar.");
	},
};

// ------------------------------------------------------------------ V31
CENAS.V31 = {
	arquivo: "V31-mesa-do-analista-sem-zerados.mp4",
	titulo: "Mesa do Analista sem itens zerados",
	secao: "9.4",
	async run() {
		const itens = [["Análise de Juntadas", 12], ["Pedidos de Urgência", 0], ["Retorno de Conclusão", 4], ["Decurso de Prazo", 7], ["Aguardando Assinatura", 0], ["Mandados Devolvidos", 0], ["Ofícios Respondidos", 3], ["Cartas Precatórias Devolvidas", 0]];
		browser(["*Projudi - Mesa do Analista"], "https://projudi.tjpr.jus.br/projudi/mesaAnalista.do");
		screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">Mesa do Analista</div><div class="pj-tabs"><span class="pj-tab on">Análise de Juntadas</span><span class="pj-tab">Citações e Intimações</span><span class="pj-tab">Mesa do Escrivão Criminal</span><span class="pj-tab">Outros Cumprimentos</span></div>' +
			'<table class="pj-table" id="mesa" style="width:560px;margin-top:8px"><tr><th>Item</th><th style="width:80px">Total</th></tr>' + itens.map(([n, c], i) => '<tr data-i="' + i + '"><td>' + n + '</td><td><span class="pj-counter' + (c ? "" : " zero") + '">' + c + "</span></td></tr>").join("") + "</table></div>");
		await S.titleCard("VÍDEO V31", "Mesa do Analista sem itens zerados", "A mesa mostra só o que tem trabalho pendente.");
		await S.cap("Na <b>Mesa do Analista</b> (e na Mesa do Escrivão), muitas linhas ficam com total <b>zero</b>.");
		const zer = $$("#mesa tr[data-i]").filter(tr => itens[+tr.dataset.i][1] === 0);
		zer.forEach(tr => S.hl(tr, 1));
		await sleep(1500);
		S.hlOff();
		await tween(700, k => zer.forEach(tr => (tr.style.opacity = String(1 - k))));
		zer.forEach(tr => (tr.style.display = "none"));
		await S.cap("A extensão <b>oculta</b> as linhas em que todos os contadores estão zerados.");
		await S.cap("Em “Outros Cumprimentos”, uma linha só some se <b>todas as colunas</b> estiverem em zero.");
		const tr = zer[0];
		tr.style.display = ""; tr.style.opacity = "1";
		tr.querySelector(".pj-counter").textContent = "1"; tr.querySelector(".pj-counter").classList.remove("zero");
		S.hl(tr, 1);
		await S.cap("Se um contador passar a ter pendência, a linha <b>reaparece sozinha</b>.");
		S.hlOff();
		await S.endCard("Mesa do Analista/Escrivão: linhas totalmente zeradas ficam ocultas e voltam quando surgir pendência.");
	},
};

// ------------------------------------------------------------------ V32
CENAS.V32 = {
	arquivo: "V32-rg-e-cpf-nos-cumprimentos.mp4",
	titulo: "RG e CPF das partes nos cumprimentos",
	secao: "9.5",
	async run() {
		const linhas = [["0001234-56.2025.8.16.0001", "Mandado de Intimação", 0], ["0003333-33.2024.8.16.0001", "Ofício", 1], ["0005555-55.2025.8.16.0001", "Mandado de Citação", 0]];
		browser(["*Projudi - Cumprimentos"], "https://projudi.tjpr.jus.br/projudi/cumprimentoCartorio.do");
		screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">Demais cumprimentos — Para Expedir</div><table class="pj-table" id="cump"><tr><th>Processo</th><th>Tipo</th><th>Referente a(s) parte(s)</th><th>Ações</th></tr>' +
			linhas.map(([p, t, r], i) => '<tr class="' + (i % 2 ? "alt" : "") + '"><td><a class="link">' + p + "</a></td><td>" + t + '</td><td>' + REUS[r].nome + ' (Réu) <span class="rgcpf" data-r="' + r + '"></span></td><td><a class="link" data-vis="' + i + '">Visualizar</a></td></tr>').join("") + "</table></div>");
		await S.titleCard("VÍDEO V32", "RG e CPF das partes nos cumprimentos", "Identifique a parte certa sem abrir o processo.");
		await S.cap("Na lista de cumprimentos (ex.: <b>Demais cumprimentos › Para Expedir</b>), as partes aparecem só pelo nome.");
		$$(".rgcpf").forEach(s => (s.innerHTML = '<span style="color:#888">— RG/CPF: carregando…</span>'));
		await S.cap("A extensão busca, em segundo plano, o <b>RG</b> e o <b>CPF</b> de cada parte…", { ms: 1800 });
		$$(".rgcpf").forEach(s => { const r = REUS[+s.dataset.r]; s.innerHTML = "— RG: " + r.rg + "; CPF: " + r.cpf; s.style.background = "#fff8d8"; });
		await S.cap("…e mostra ao lado do nome. Documento ausente aparece como “não cadastrado”.");
		await S.click('[data-vis="0"]');
		screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">Cumprimento</div><table class="pj-form"><tr><td class="l">Identificador do Cumprimento:</td><td>123456 · Processo <a class="link">' + PROC + '</a></td></tr><tr><td class="l">Tipo:</td><td>Mandado de Intimação</td></tr><tr><td class="l">Referente a(s) parte(s):</td><td id="ref">' + REUS[0].nome + ' (Réu) <span style="background:#fff8d8">— RG: ' + REUS[0].rg + "; CPF: " + REUS[0].cpf + "</span></td></tr></table></div>");
		S.hl("#ref", 3);
		await S.cap("Na tela do cumprimento (<b>Visualizar</b>) também, na linha “Referente a(s) parte(s)”.");
		S.hlOff();
		await S.endCard("Lista de cumprimentos e tela do cumprimento: nome da parte + RG + CPF.");
	},
};

// ------------------------------------------------------------------ V33
CENAS.V33 = {
	arquivo: "V33-dados-processuais-nas-ordenacoes-bnmp.mp4",
	titulo: "Dados processuais nas ordenações BNMP",
	secao: "9.6",
	async run() {
		browser(["*Projudi - Ordenação BNMP"], "https://projudi.tjpr.jus.br/projudi/cumprimento/bnmp.do");
		screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">Ordenação BNMP — Mandado de Prisão</div><table class="pj-form"><tr><td class="l">Processo:</td><td><a class="link">' + PROC + '</a></td></tr><tr><td class="l">Referente a(s) parte(s):</td><td><a class="link">' + REUS[0].nome + '</a></td></tr><tr><td class="l">Tipo de Peça:</td><td>Mandado de Prisão</td></tr></table><div id="sec"></div></div>');
		await S.titleCard("VÍDEO V33", "Dados processuais nas ordenações BNMP", "Os dados para preencher o BNMP 3 também em mandados, alvarás e contramandados.");
		await S.cap("Nas guias, o Projudi já mostra “Dados da Peça”, “Cadastro de Sentença” etc. Nas <b>demais peças</b>, não.");
		await S.cap("Numa ordenação BNMP que não é guia (ex.: <b>Mandado de Prisão</b>), a extensão monta essas seções.", { ms: 3200 });
		const sec = (id, t, corpo) => '<fieldset class="pj-fieldset" id="' + id + '"><legend><span class="tg">⊟</span> ' + t + '</legend><div class="c">' + corpo + "</div></fieldset>";
		const secs = [
			sec("s1", "Dados da Peça", '<table class="pj-form"><tr><td class="l">Local da Prisão:</td><td>Sem informação</td></tr></table>'),
			sec("s2", "Dados do Processo Criminal", '<table class="pj-form"><tr><td class="l">Classe Processual:</td><td>Ação Penal - Procedimento Ordinário</td><td class="l">Data da Infração:</td><td>03/02/2025</td></tr><tr><td class="l">Data de Oferecimento:</td><td>10/06/2025</td><td class="l">Data de Recebimento:</td><td>28/08/2025</td></tr></table>'),
			sec("s3", "Cadastro de Sentença", '<table class="pj-form"><tr><td class="l">Data da Sentença:</td><td>15/07/2026</td><td class="l">Regime Inicial:</td><td>Semiaberto</td></tr><tr><td class="l">Tempo de Pena:</td><td>4 anos e 2 meses</td><td class="l">Trânsito em Julgado (defesa):</td><td>20/08/2026</td></tr></table>'),
			sec("s4", "Tipificação penal", '<table class="pj-table"><tr><th>Lei/Artigo</th><th>Data do Delito</th><th>Pena</th><th>Data de Prescrição</th></tr><tr><td>CP, art. 155, § 4º</td><td>03/02/2025</td><td>4a 2m</td><td>13/09/2031 (Ativa)</td></tr></table><div style="margin-top:4px"><b>Próxima Prescrição:</b> 13/09/2031</div>'),
			sec("s5", "Cadastro das Prisões", '<table class="pj-table"><tr><th>Data</th><th>Motivo</th><th>Local</th><th>Soltura/Conversão</th></tr><tr><td>03/02/2025</td><td>Flagrante</td><td>Delegacia de Exemplo</td><td>05/02/2025 — Liberdade provisória</td></tr></table>'),
		];
		for (const s of secs) { $("#sec").insertAdjacentHTML("beforeend", s); await sleep(500); }
		await S.cap("Os dados vêm das telas do processo, lidas em segundo plano: denúncia, sentença, infrações/penas e prisões.", { ms: 4200 });
		await S.scroll(260, 900);
		await S.cap("Veja a <b>Data de Prescrição</b> de cada crime e a <b>Próxima Prescrição</b>.");
		await S.scroll(0, 700);
		await S.cap("Clique em <b>⊟</b> para recolher uma seção.");
		await S.click("#s2 .tg");
		$("#s2 .c").style.display = "none"; $("#s2 .tg").textContent = "⊞";
		await S.cap("Se alguma tela não puder ser lida, aparece a seção <b>Avisos da extensão</b> explicando o motivo.");
		await S.endCard("Ordenação BNMP (não guia) → seções Dados da Peça, Processo Criminal, Sentença, Tipificação e Prisões.");
	},
};
