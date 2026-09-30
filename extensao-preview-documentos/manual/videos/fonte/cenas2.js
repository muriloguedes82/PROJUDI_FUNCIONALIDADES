// Cenas V16–V27: ações rápidas, preferências, combos e popups.
"use strict";

// Diálogos simulados do Projudi -----------------------------------------
function dlgConcluso(pre = {}) {
	return '<table class="pj-form"><tr><td class="l">Tipo de Conclusão:</td><td><span class="pj-select" id="f-tipo">' + (pre.tipo || "Selecione") + '</span></td></tr>' +
		'<tr><td class="l">Magistrado(a):</td><td><span class="pj-select" id="f-mag">' + (pre.mag || "Selecione") + '</span></td></tr>' +
		'<tr><td class="l">Observação:</td><td><span class="pj-input" style="width:420px;height:50px" id="f-obs">' + (pre.obs || "") + '</span></td></tr></table>' +
		'<div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary" id="f-enviar">Enviar</span><span class="pj-btn">Cancelar</span></div>';
}
function dlgIntimar(pre = {}) {
	const ck = v => '<input type="checkbox"' + (v ? " checked" : "") + ">";
	return '<table class="pj-table" style="width:720px"><tr><th style="width:30px"></th><th>Partes - Réu</th><th>Advogado/Sociedade de Advogados</th></tr>' +
		REUS.map(r => "<tr><td>" + ck(pre.reu) + "</td><td>" + r.nome + "</td><td>" + ck(false) + " JOÃO EXEMPLO</td></tr>").join("") +
		'<tr><th></th><th>Partes - Vítima</th><th></th></tr><tr><td>' + ck(false) + '</td><td>PEDRO VÍTIMA EXEMPLO</td><td></td></tr>' +
		'<tr><th></th><th>Ministério Público</th><th></th></tr><tr><td id="f-mp">' + ck(pre.mp) + "</td><td>MINISTÉRIO PÚBLICO DO ESTADO DO PARANÁ</td><td></td></tr></table>" +
		'<table class="pj-form" style="margin-top:8px"><tr><td class="l">Finalidade:</td><td><span class="pj-select" id="f-fin">' + (pre.fin || "Selecione") + '</span></td><td class="l" style="width:auto">Prazo (dias):</td><td><span class="pj-input" id="f-prazo">' + (pre.prazo || "") + '</span></td></tr>' +
		'<tr><td class="l">Urgente:</td><td>○ Sim ● Não</td></tr></table>' +
		'<div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary" id="f-intimar">Intimar</span><span class="pj-btn">Cancelar</span></div>';
}
function dlgOrdenar(pre = {}) {
	return '<table class="pj-form"><tr><td class="l">Tipo de Cumprimento:</td><td><span class="pj-select" id="f-tc">' + (pre.tc || "Selecione") + '</span></td></tr>' +
		'<tr><td class="l">Referente a(s) parte(s):</td><td id="f-partes">' + REUS.map((r, i) => '<label style="display:block"><input type="checkbox"' + (pre.parte === i ? " checked" : "") + "> " + r.nome + "</label>").join("") + '</td></tr>' +
		'<tr><td class="l">Prazo (dias):</td><td><span class="pj-input" id="f-prazo">' + (pre.prazo || "") + '</span></td></tr>' +
		'<tr><td class="l">Orientações:</td><td><span class="pj-input" style="width:420px;height:44px" id="f-ori">' + (pre.ori || "") + '</span></td></tr></table>' +
		'<div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px" id="ord-btns"><span class="pj-btn primary" id="f-ordenar">Ordenar</span><span class="x-btn" id="f-nova">🔁 Nova Ordenação</span><span class="pj-btn">Cancelar</span></div><div id="fila" style="margin-left:196px"></div>';
}
function dlgRemessa(pre = {}) {
	const r = (id, t) => '<label style="display:block;margin:3px 0"><input type="radio" name="rem" id="' + id + '"' + (pre.op === id ? " checked" : "") + "> " + t + "</label>";
	return '<table class="pj-form"><tr><td class="l">Remessa:</td><td>' + r("op-del", "Enviar à Delegacia") + r("op-dist", "Autos ao Distribuidor") + r("op-mp", "Enviar ao Ministério Público") + r("op-out", "Outras Remessas") + '</td></tr>' +
		'<tr><td class="l">Destino:</td><td><span class="pj-select" id="f-dest">' + (pre.dest || "Selecione") + '</span></td></tr>' +
		'<tr><td class="l">Finalidade:</td><td><span class="pj-select" id="f-fin">' + (pre.fin || "Selecione") + '</span></td></tr>' +
		'<tr><td class="l">Prazo (dias):</td><td><span class="pj-input" id="f-prazo">' + (pre.prazo || "") + '</span></td></tr></table>' +
		'<div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary" id="f-realizar">Realizar Remessa</span><span class="x-btn" id="f-nova">🔁 Nova Remessa</span><span class="pj-btn">Cancelar</span></div><div id="fila" style="margin-left:196px"></div>';
}
function acaoPanel(grupo, acoes) {
	return "<h4>" + grupo + "</h4>" + acoes.map(a => '<div class="x-action"><div class="nm"><span>' + a.nome + '</span><span><span class="x-btn small" data-open="' + a.nome + '">' + (a.abrir || "Ir e abrir") + '</span> <span class="x-btn small" data-nova="' + a.nome + '">+ Nova preferência</span></span></div>' +
		(a.prefs || []).map(p => '<span class="x-chip" data-pref="' + p + '">★ ' + p + ' <span class="i">✏️</span> <span class="i">🗑</span></span>').join("") + "</div>").join("");
}
async function abrindo(nome, ms = 1300) {
	const t = toast("Abrindo “" + nome + "”… <u style=\"margin-left:10px\">Cancelar</u>", { left: 500, top: 330 });
	await sleep(ms);
	t.remove();
}
async function selecionar(sel, valor) {
	await S.click(sel);
	$(sel).textContent = valor;
	await sleep(200);
}

// ------------------------------------------------------------------ V16
CENAS.V16 = {
	arquivo: "V16-acoes-rapidas.mp4",
	titulo: "Ações rápidas",
	secao: "7.1",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V16", "Ações rápidas", "As ações do painel “Ações” do Projudi a um clique, sem rolar a tela.");
		await S.cap("Clique em <b>▸ Ações</b> para mostrar os grupos: Concluso, Remessa, Ordenações, Partes, Suspender…");
		await S.click("#x-toggle");
		setAcoesAbertas(true);
		await S.cap("Escolha um grupo — por exemplo, <b>Concluso</b>.");
		await S.click('[data-g="Concluso"]');
		const pn = panelAt(acaoPanel("Concluso", [{ nome: "Enviar Concluso" }]), '[data-g="Concluso"]', { w: 360 });
		await S.cap("Fora da tela de Ações, o botão se chama <b>Ir e abrir</b>. Na própria tela de Ações, <b>Abrir</b>.");
		await S.click('[data-open="Enviar Concluso"]');
		pn.remove();
		await S.cap("A extensão localiza o diálogo em segundo plano (a tela visível não muda)…", { ms: 1500 });
		await abrindo("Enviar Concluso");
		popup("Enviar Concluso", dlgConcluso());
		await S.cap("…e abre o <b>diálogo original do Projudi</b> num popup sobre a tela.");
		await S.cap("Preencha e confirme como sempre. <b>Nada é enviado sem o seu clique.</b>");
		await S.cap("Para sair sem fazer nada, clique em <b>✕ Fechar</b>.");
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.cap("Se você estiver em outra aba (ex.: Partes e Outros), o painel pede para abrir a aba Movimentações.");
		await S.endCard("▸ Ações → grupo → Ir e abrir/Abrir → diálogo do Projudi em popup → preencher e confirmar.");
	},
};

// ------------------------------------------------------------------ V17
CENAS.V17 = {
	arquivo: "V17-preferencias.mp4",
	titulo: "Preferências",
	secao: "7.2",
	async run() {
		telaProcesso({ acoesAbertas: true });
		await S.titleCard("VÍDEO V17", "Preferências: preencher e confirmar com um clique", "Grave o preenchimento de um diálogo e reaplique-o em outros processos.");
		await S.cap("Em qualquer ação do painel, clique em <b>+ Nova preferência</b>. Exemplo: grupo <b>Partes</b> → Intimar Partes.");
		await S.click('[data-g="Partes"]');
		let pn = panelAt(acaoPanel("Partes", [{ nome: "Intimar Partes" }, { nome: "Notificar Partes" }, { nome: "Citar Partes" }]), '[data-g="Partes"]', { w: 380 });
		await S.click('[data-nova="Intimar Partes"]');
		pn.remove();
		await abrindo("Intimar Partes", 900);
		popup("Intimar Partes", dlgIntimar(), { top: 120, h: 520 });
		const b = bar('Preencha o diálogo e clique em <span class="x-btn small" id="salvarpref">💾 Salvar como preferência</span>', { top: 78 });
		await S.cap("Preencha o diálogo do jeito de sempre…");
		await S.click("#f-mp input"); $("#f-mp input").checked = true;
		await selecionar("#f-fin", "Ciência");
		await S.type("#f-prazo", "5");
		await S.cap("…e clique em <b>💾 Salvar como preferência</b>.");
		await S.click("#salvarpref");
		modal('<h3>Salvar como preferência</h3><div class="x-note">Campos que serão gravados:</div><div class="x-list"><div>Ministério Público: ☑ marcado</div><div>Finalidade: Ciência</div><div>Prazo (dias): 5</div></div><div style="margin-top:8px">Nome da preferência:</div><div class="x-field" id="nm"></div><div style="text-align:right;margin-top:10px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="ok">Salvar</span></div>', { top: 170 });
		await S.cap("A extensão mostra <b>os campos que serão gravados</b>. Confira e dê um nome.");
		await S.type("#nm", "Intimar MP - ciência 5 dias");
		await S.click("#ok");
		closeModal(); b.remove(); $(".x-popup").remove();
		await S.cap("Nada foi enviado ao Projudi: a preferência só foi guardada no seu navegador.");
		await S.click('[data-g="Partes"]');
		pn = panelAt(acaoPanel("Partes", [{ nome: "Intimar Partes", prefs: ["Intimar MP - ciência 5 dias"] }, { nome: "Notificar Partes" }, { nome: "Citar Partes" }]), '[data-g="Partes"]', { w: 380 });
		await S.cap("A preferência aparece como <b>★ nome</b>. Em outro processo, basta clicar nela.");
		await S.click('[data-pref="Intimar MP - ciência 5 dias"]', { dx: -40 });
		pn.remove();
		await abrindo("Intimar Partes", 900);
		popup("Intimar Partes", dlgIntimar({ mp: true, fin: "Ciência", prazo: "5" }), { top: 120, h: 520 });
		bar('Confirmar “Intimar Partes” com a preferência “Intimar MP - ciência 5 dias”? <span class="x-btn small green" id="sim">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("O diálogo abre <b>já preenchido</b>. Confira os campos…");
		await S.cap("…e só então clique em <b>✅ Sim, executar</b>: é esse clique que pratica o ato.");
		await S.click("#sim");
		$(".x-bar").remove();
		$(".x-popup .bd").innerHTML = '<div class="x-dlg-title">Intimar Partes</div><div style="padding:16px"><div class="pj-msg-ok">Intimação(ões) expedida(s) com sucesso.</div></div>';
		await sleep(1500);
		$(".x-popup").remove();
		await S.cap("Use <b>✏️</b> para editar (aparece “💾 Atualizar preferência”) e <b>🗑</b> para remover.");
		await S.endCard("+ Nova preferência → preencher → 💾 Salvar como preferência → depois: ★ nome → conferir → ✅ Sim, executar.");
	},
};

// ------------------------------------------------------------------ V18
CENAS.V18 = {
	arquivo: "V18-minhas-preferencias.mp4",
	titulo: "Minhas Preferências",
	secao: "7.3",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V18", "Minhas Preferências", "Todas as preferências salvas, em cards, num só lugar.");
		await S.cap("Clique em <b>⭐ Minhas Preferências</b>.");
		await S.click("#x-fav");
		const cards = [["Intimar MP - ciência 5 dias", "Intimar Partes"], ["Concluso p/ sentença", "Enviar Concluso"], ["Remessa MP", "Realizar Remessa"], ["Certidão de decurso", "Juntar Documento"], ["🔗 Decurso + concluso", "Combo · 2 etapas"], ["Mandado de intimação", "Ordenar Cumprimentos"]];
		const pn = panelAt('<div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">⭐ Minhas Preferências</h4><span class="x-btn small" id="editpos">✏️ Editar posição</span></div>' +
			'<div id="grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">' + cards.map((c, i) => '<div class="x-chip" data-card="' + i + '" style="display:block;border-radius:6px;padding:8px;margin:0;font-size:12px"><b>' + (c[0].startsWith("🔗") ? "" : "★ ") + c[0] + '</b><div style="color:#666;font-size:11px">' + c[1] + "</div></div>").join("") +
			'</div><label style="display:block;margin-top:8px;font-size:11px"><input type="checkbox"> Mostrar todas</label>', "#x-fav", { w: 560 });
		await S.cap("Cada card é uma preferência (das ações rápidas e do Juntar Documento) ou um combo 🔗.");
		await S.cap("Clique num card para executá-lo — abre o diálogo preenchido com o <b>✅ Sim, executar</b>, como no vídeo V17.");
		await S.move('[data-card="1"]');
		await sleep(700);
		await S.cap("Para mudar a ordem, clique em <b>✏️ Editar posição</b> e arraste os cards.");
		await S.click("#editpos");
		$("#editpos").textContent = "✅ Concluir";
		const c = $('[data-card="5"]');
		await S.move(c);
		const r0 = c.getBoundingClientRect(), r1 = $('[data-card="0"]').getBoundingClientRect();
		c.style.position = "relative";
		await tween(900, k => { c.style.left = (r1.left - r0.left) * k + "px"; c.style.top = (r1.top - r0.top) * k + "px"; S.x = r0.left + r0.width / 2 + (r1.left - r0.left) * k; S.y = r0.top + r0.height / 2 + (r1.top - r0.top) * k; S.place(); });
		c.style.position = ""; c.style.left = ""; c.style.top = "";
		$("#grid").insertBefore(c, $("#grid").firstChild);
		await S.cap("A ordem é salva na hora. Clique em <b>✅ Concluir</b> ao terminar.");
		await S.click("#editpos");
		$("#editpos").textContent = "✏️ Editar posição";
		await S.endCard("⭐ Minhas Preferências → clique no card → conferir → ✅ Sim, executar. ✏️ Editar posição reordena.");
	},
};

// ------------------------------------------------------------------ V19
CENAS.V19 = {
	arquivo: "V19-combos-de-preferencias.mp4",
	titulo: "Combos de preferências",
	secao: "7.4",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V19", "Combos de preferências", "Várias preferências em sequência: cada etapa abre sozinha, você confirma cada uma.");
		await S.cap("Clique em <b>🔗 Combos</b> e depois em <b>+ Novo combo</b>.");
		await S.click("#x-combos");
		let pn = panelAt('<h4>🔗 Combos</h4><div class="x-note">Nenhum combo ainda.</div><span class="x-btn small" id="novo">+ Novo combo</span>', "#x-combos", { w: 320 });
		await S.click("#novo");
		pn.remove();
		const sel = n => '<div style="margin-top:8px"><div class="x-note">Caixa ' + n + '</div><span class="pj-select" style="width:100%" id="cx' + n + '">Escolha a preferência</span></div>';
		modal('<h3>Novo combo</h3><div>Nome do combo:</div><div class="x-field" id="cnome"></div><div id="caixas">' + sel(1) + '</div><div style="margin-top:8px"><span class="x-btn small" id="maiscx">+ Adicionar preferência</span></div><div style="text-align:right;margin-top:12px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="salvarc">💾 Salvar combo</span></div>', { w: 520, top: 130 });
		await S.type("#cnome", "Intimar MP e concluso");
		await S.cap("Na <b>caixa 1</b>, escolha a preferência que roda primeiro.");
		await selecionar("#cx1", "★ Intimar MP - ciência 5 dias (Intimar Partes)");
		await S.cap("Clique em <b>+ Adicionar preferência</b> para a próxima. As setas ↑/↓ mudam a ordem.");
		await S.click("#maiscx");
		$("#caixas").insertAdjacentHTML("beforeend", sel(2));
		await selecionar("#cx2", "★ Concluso p/ sentença (Enviar Concluso)");
		await S.click("#salvarc");
		closeModal();
		await S.click("#x-combos");
		pn = panelAt('<h4>🔗 Combos</h4><div class="x-chip" id="run" style="font-size:12px">▶ Intimar MP e concluso <span class="i">✏️</span> <span class="i">🗑</span></div><div style="margin-top:6px"><span class="x-btn small">+ Novo combo</span></div>', "#x-combos", { w: 320 });
		await S.cap("Para executar, clique em <b>▶ nome</b>.");
		await S.click("#run", { dx: -30 });
		pn.remove();
		const cb = bar('Combo “Intimar MP e concluso” — etapa 1 de 2 <span class="x-btn small">↻ Repetir etapa</span><span class="x-btn small">⏭ Próxima etapa</span><span class="x-btn small">⏹ Parar combo</span>', { cls: "combo", top: 572 });
		await abrindo("Intimar Partes", 900);
		popup("Intimar Partes", dlgIntimar({ mp: true, fin: "Ciência", prazo: "5" }), { top: 120, h: 500 });
		bar('Combo “Intimar MP e concluso” — etapa 1 de 2 · Confirmar “Intimar Partes”? <span class="x-btn small green" id="sim">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("A etapa 1 abre preenchida. <b>Cada etapa pede o seu ✅ Sim, executar.</b>");
		await S.click("#sim");
		$$(".x-bar")[1].remove(); $(".x-popup").remove();
		cb.innerHTML = cb.innerHTML.replace("etapa 1 de 2", "etapa 2 de 2");
		await abrindo("Enviar Concluso", 900);
		popup("Enviar Concluso", dlgConcluso({ tipo: "Para sentença", mag: "JULIANA MAGISTRADA" }), { top: 120, h: 500 });
		bar('Combo “Intimar MP e concluso” — etapa 2 de 2 · Confirmar “Enviar Concluso”? <span class="x-btn small green" id="sim2">✅ Sim, executar</span> <span class="x-btn small">Cancelar</span>', { top: 78 });
		await S.cap("Confirmada a etapa, a próxima <b>abre sozinha</b>.");
		await S.click("#sim2");
		$$(".x-bar")[1].remove(); $(".x-popup").remove();
		cb.innerHTML = "✅ Combo “Intimar MP e concluso” concluído (2 etapas).";
		await S.cap("Se fechar uma etapa sem executar, use <b>↻ Repetir</b>, <b>⏭ Próxima</b> ou <b>⏹ Parar</b> na barra de baixo.", { ms: 4200 });
		await S.endCard("🔗 Combos → + Novo combo → caixas em ordem → 💾 Salvar → ▶ nome → confirmar cada etapa.");
	},
};

// ------------------------------------------------------------------ V20
CENAS.V20 = {
	arquivo: "V20-alvara-eletronico.mp4",
	titulo: "Alvará Eletrônico",
	secao: "8.1",
	async run() {
		telaProcesso({ acoesAbertas: true });
		await S.titleCard("VÍDEO V20", "Alvará Eletrônico", "Abra o cadastro de alvará eletrônico em popup, já com os campos repetitivos preenchidos.");
		await S.cap("Em <b>▸ Ações</b>, clique em <b>🏦 Alvará Eletrônico</b>.");
		await S.click('[data-g="🏦 Alvará Eletrônico"]');
		let pn = panelAt(acaoPanel("🏦 Alvará Eletrônico", [{ nome: "Alvará Eletrônico", abrir: "Abrir", prefs: ["Levantamento pelo advogado"] }]), '[data-g="🏦 Alvará Eletrônico"]', { w: 380 });
		await S.cap("<b>Abrir</b> mostra a tela de Modalidade. Com <b>+ Nova preferência</b> você grava modalidade e campos fixos.");
		await S.cap("Clique numa preferência <b>★</b> para já cair no formulário completo.");
		await S.click('[data-pref="Levantamento pelo advogado"]', { dx: -40 });
		pn.remove();
		await abrindo("Alvará Eletrônico", 1500);
		const v = (id, t) => '<span class="pj-select" id="' + id + '" style="background:#fffbe6">' + t + "</span>";
		popup("Cadastrar Alvará Eletrônico - Pagamento ao beneficiário", '<table class="pj-form">' +
			'<tr><td class="l">Magistrado:</td><td>' + v("a1", "JULIANA MAGISTRADA") + '</td><td class="l">Urgente:</td><td>○ Sim ● Não</td></tr>' +
			'<tr><td class="l">Natureza do Alvará:</td><td>' + v("a2", "Criminal") + '</td><td class="l">Representação Processual:</td><td>' + v("a3", "Advogado") + "</td></tr>" +
			'<tr><td class="l">Finalidade do Pagamento:</td><td>' + v("a4", "Levantamento de fiança") + '</td><td class="l">Tipo de Crédito:</td><td>' + v("a5", "Transferência") + "</td></tr>" +
			'<tr><td class="l">Observação:</td><td colspan="3"><span class="pj-input" style="width:560px;background:#fffbe6">Levantamento conforme decisão de seq. 32.</span></td></tr>' +
			'<tr><td class="l">Conta judicial:</td><td><span class="pj-select" id="conta">Selecione</span></td><td class="l">Valor (R$):</td><td><span class="pj-input" id="valor" style="min-width:120px"></span></td></tr>' +
			'<tr><td class="l">Beneficiário:</td><td colspan="3"><span class="pj-input" style="width:560px" id="benef"></span></td></tr></table>' +
			'<div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary" id="salvar">Salvar</span><span class="pj-btn">Voltar</span></div>', { top: 80, h: 470 });
		await S.cap("Os campos que se repetem (magistrado, natureza, finalidade, tipo de crédito, observação) já vêm preenchidos.");
		await S.cap("Conta, beneficiário, dados bancários e <b>valores são sempre seus</b>: preencha-os.");
		await selecionar("#conta", "0001 - 123456-7");
		await S.type("#valor", "1.500,00");
		await S.type("#benef", "JOÃO EXEMPLO (OAB/PR 00000)");
		await S.cap("Aqui não há “Sim, executar”: confira e clique em <b>Salvar</b> do próprio Projudi.");
		await S.move("#salvar");
		await S.endCard("🏦 Alvará Eletrônico → ★ preferência → completar conta/beneficiário/valor → Salvar (Projudi).");
	},
};

// ------------------------------------------------------------------ V21
CENAS.V21 = {
	arquivo: "V21-juntar-documento.mp4",
	titulo: "Juntar Documento com preferências",
	secao: "8.2",
	async run() {
		const passo = (titulo, corpo) => {
			browser(["*Projudi - " + titulo], "https://projudi.tjpr.jus.br/projudi/processo/juntarDocumento.do");
			screen(pjHeader() + '<div class="pj-body" style="padding-top:60px"><div class="pj-h2">' + titulo + "</div>" + corpo + "</div>");
		};
		telaProcesso({});
		await S.titleCard("VÍDEO V21", "Juntar Documento com preferências", "Grave uma juntada (certidão, termo…) uma vez; depois, só digite o PIN do certificado.");
		await S.cap("Clique em <b>📎 Juntar Documento</b> (da extensão) e em <b>+ Nova preferência</b>.");
		await S.click("#x-juntar");
		const pn = panelAt('<h4>📎 Juntar Documento</h4><div class="x-action"><div class="nm"><span>Juntar Documento</span><span><span class="x-btn small">Abrir</span> <span class="x-btn small" id="nova">+ Nova preferência</span></span></div><span class="x-chip">★ Certidão de decurso <span class="i">✏️</span> <span class="i">🗑</span></span></div>', "#x-juntar", { w: 380 });
		await S.click("#nova");
		pn.remove();
		const rec = t => { $$(".x-bar").forEach(n => n.remove()); bar("● Gravando — " + t + ' <span class="x-btn small" style="margin-left:auto">Parar</span>', { cls: "rec", top: 52 }); };
		passo("Juntar Documento", '<table class="pj-form"><tr><td class="l">Tipo de Documento:</td><td><span class="pj-select" id="td">Selecione</span></td><td><span class="pj-btn" id="adicionar">Adicionar</span></td></tr></table>');
		rec("escolha o Tipo de Documento e clique em “Adicionar”.");
		await S.cap("A faixa <b>● Gravando</b> diz o que fazer em cada tela. Faça o fluxo normalmente, uma vez.");
		await selecionar("#td", "Certidão");
		await S.click("#adicionar");
		passo("Inserir Arquivo", '<table class="pj-form"><tr><td class="l">Tipo do Arquivo:</td><td><span class="pj-select" id="ta">Selecione</span></td></tr><tr><td class="l">Modelo:</td><td><span class="pj-select" id="mo">Selecione</span></td></tr></table><div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn" id="digitar">Digitar Texto</span></div>');
		rec("escolha Tipo do Arquivo/Modelo e clique em “Digitar Texto”.");
		await selecionar("#ta", "Certidão de Decurso de Prazo");
		await selecionar("#mo", "Certidão - modelo da vara");
		await S.click("#digitar");
		passo("Digitar Documento", '<div style="border:1px solid #999;height:300px;padding:14px;font-family:serif;font-size:13px;line-height:20px">CERTIDÃO<br><br>Autos nº ' + PROC + '<br><br><span id="txt">XXXXXXXXXX INSIRA O TEXTO AQUI XXXXXXXXXX</span></div><div class="pj-btnbar"><span class="pj-btn" id="cont">Continuar</span></div>');
		rec("escreva o texto e clique em “Continuar”.");
		await S.cap("Só o texto que <b>você escreveu</b> é gravado — cabeçalho, número dos autos e data o Projudi gera em cada processo.", { ms: 4200 });
		await S.type("#txt", "Certifico que decorreu o prazo sem manifestação da parte.");
		await S.click("#cont");
		passo("Documento", '<div style="border:1px solid #ccc;padding:14px;font-family:serif">CERTIDÃO … Certifico que decorreu o prazo sem manifestação da parte.</div><div class="pj-btnbar"><span class="pj-btn">Alterar</span><span class="pj-btn" id="concl">Concluir</span></div>');
		rec("confira e clique em “Concluir”.");
		await S.click("#concl");
		passo("Inserir Arquivo", '<table class="pj-table"><tr><th>Arquivo</th><th>Assinado</th></tr><tr><td>Certidão de Decurso de Prazo.pdf</td><td id="ass">Não</td></tr></table><div class="pj-btnbar"><span class="pj-btn" id="assinar">Assinar Arquivos</span><span class="pj-btn" id="confinc">Confirmar Inclusão</span></div>');
		rec("clique em “Assinar Arquivos”.");
		await S.click("#assinar");
		modal('<h3>Salvar preferência</h3><div>Nome da preferência:</div><div class="x-field" id="nm"></div><div style="text-align:right;margin-top:10px"><span class="pj-btn primary" id="ok">Salvar</span></div>', { top: 200 });
		await S.cap("Ao clicar em <b>Assinar Arquivos</b>, a extensão pede o <b>nome</b> e salva a preferência.");
		await S.type("#nm", "Certidão de decurso");
		await S.click("#ok");
		closeModal(); $$(".x-bar").forEach(n => n.remove());
		await S.cap("Pronto. Nos próximos processos, use a preferência <b>★ Certidão de decurso</b>:");
		passo("Inserir Arquivo", '<table class="pj-table"><tr><th>Arquivo</th><th>Assinado</th></tr><tr><td>Certidão de Decurso de Prazo.pdf</td><td id="ass">Não</td></tr></table><div class="pj-btnbar"><span class="pj-btn">Assinar Arquivos</span><span class="pj-btn">Confirmar Inclusão</span></div>');
		bar("📎 Aplicando “Certidão de decurso” — tipo, arquivo, texto e conclusão feitos automaticamente. Aguardando assinatura…", { top: 52 });
		modal('<h3>Assinador</h3><div>Digite o PIN do certificado:</div><div class="x-field" id="pin"></div><div style="text-align:right;margin-top:10px"><span class="pj-btn primary" id="okpin">OK</span></div>', { top: 220, w: 380 });
		await S.cap("Ela refaz todas as telas sozinha e chama o assinador. <b>Você só digita o PIN.</b>");
		await S.type("#pin", "••••••", { speed: 120 });
		await S.click("#okpin");
		closeModal();
		$("#ass").textContent = "Sim";
		await sleep(700);
		passo("Juntar Documento", '<table class="pj-table"><tr><th>Documento</th><th>Tipo</th></tr><tr><td>Certidão de Decurso de Prazo.pdf</td><td>Certidão</td></tr></table><div class="pj-btnbar"><span class="pj-btn" id="concmov">Concluir Movimento</span></div>');
		bar("📎 Arquivo assinado — “Confirmar Inclusão” e “Concluir Movimento” clicados pela extensão.", { top: 52 });
		await sleep(1200);
		passo("Movimentar Processo", '<div class="pj-msg-ok">Dados registrados com sucesso!</div>');
		await S.cap("Depois da assinatura, a extensão confirma a inclusão e conclui o movimento. O PIN <b>nunca</b> é guardado.");
		await S.cap("Use <b>✏️</b> para refazer o fluxo com as telas preenchidas e atualizar a preferência; <b>Parar</b> interrompe.", { ms: 4200 });
		await S.endCard("📎 Juntar Documento → + Nova preferência → fazer o fluxo uma vez → nome. Depois: ★ preferência → digitar o PIN.");
	},
};

// ------------------------------------------------------------------ V22
CENAS.V22 = {
	arquivo: "V22-des-habilitar-advogado.mp4",
	titulo: "(Des)Habilitar Advogado",
	secao: "8.3",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V22", "(Des)Habilitar Advogado", "A tela de Advogados do processo num popup, sem sair da aba atual.");
		await S.cap("Clique em <b>⚖️ Advogados</b>.");
		await S.click("#x-adv");
		await abrindo("Advogados", 1100);
		popup("Advogados", '<table class="pj-table"><tr><th></th><th>Parte</th><th>Advogado</th><th>OAB</th><th>Situação</th></tr><tr><td><input type="radio"></td><td>' + REUS[0].nome + '</td><td>JOÃO EXEMPLO</td><td>PR 00000</td><td>Habilitado</td></tr><tr class="alt"><td><input type="radio"></td><td>' + REUS[1].nome + '</td><td>—</td><td>—</td><td>—</td></tr></table><div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn">Adicionar</span><span class="pj-btn">Habilitar</span><span class="pj-btn">Desabilitar</span><span class="pj-btn">Remover</span><span class="pj-btn">Voltar</span></div>', { hd: "Advogados — popup da extensão" });
		await S.cap("É a mesma tela do botão nativo <b>Advogados</b> (aba Partes e Outros), num popup.");
		await S.cap("Habilite, desabilite, adicione ou remova o advogado normalmente. A extensão não pratica nada sozinha.");
		await S.cap("Ao terminar, clique em <b>✕ Fechar</b>.");
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.endCard("⚖️ Advogados → tela Advogados em popup → ✕ Fechar.");
	},
};

// ------------------------------------------------------------------ V23
CENAS.V23 = {
	arquivo: "V23-editar-partes-outros.mp4",
	titulo: "Editar Partes/Outros",
	secao: "8.4",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V23", "Editar Partes/Outros", "A tela “Partes do Processo” num popup, para adicionar ou alterar partes.");
		await S.cap("Clique em <b>👥 Partes</b>.");
		await S.click("#x-partes");
		await abrindo("Partes do Processo", 1100);
		popup("Partes do Processo", '<table class="pj-table"><tr><th>Nome</th><th>Tipo</th><th>Polo</th></tr>' + REUS.map((r, i) => '<tr class="' + (i ? "alt" : "") + '"><td><a class="link">' + r.nome + "</a></td><td>Réu</td><td>Passivo</td></tr>").join("") + '<tr><td><a class="link">PEDRO VÍTIMA EXEMPLO</a></td><td>Vítima</td><td>Outros</td></tr></table><div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn">Adicionar</span><span class="pj-btn">Voltar</span></div>', { hd: "Partes do Processo — popup da extensão" });
		await S.cap("É a tela do botão nativo <b>Partes e Outros</b>, com <b>Adicionar</b> e a lista de partes.");
		await S.cap("Faça as alterações no popup e feche com <b>✕ Fechar</b>. A aba do processo não sai do lugar.");
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.endCard("👥 Partes → Partes do Processo em popup → ✕ Fechar.");
	},
};

// ------------------------------------------------------------------ V24
CENAS.V24 = {
	arquivo: "V24-processo-copiado.mp4",
	titulo: "Colar processo",
	secao: "8.5",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V24", "Colar processo", "Copiou um número de processo? Um clique e a busca já abre com ele.");
		const nota = add('<div style="position:fixed;left:250px;top:150px;width:620px;background:#fff;border:1px solid #999;box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:45;font-size:14px"><div style="background:#eee;padding:6px 10px;font-size:12px">E-mail recebido</div><div style="padding:16px;line-height:24px">Prezados, solicito informações sobre os autos <span id="num">0009876-54.2024.8.16.0001</span>, em trâmite nesta vara.</div></div>');
		await S.cap("Copie (Ctrl+C) um número de processo de qualquer lugar: e-mail, planilha, documento…");
		await S.move("#num", { dx: -110 });
		const n = $("#num");
		await tween(700, k => (n.style.background = "rgba(51,144,255," + 0.45 * k + ")"));
		const t = toast("Ctrl + C", { left: 560, top: 260 });
		await sleep(900); t.remove(); nota.remove();
		await S.cap("Com ou sem pontos e traços — só não pode haver <b>mais de um</b> número copiado.");
		await S.cap("No Projudi, clique em <b>📋 Colar processo</b>.");
		await S.click("#x-clip");
		browser(["Projudi - Processo " + PROC, "*Projudi - Busca de Processos"], "https://projudi.tjpr.jus.br/projudi/processo/buscaProcesso.do?actionType=iniciarSimples");
		screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">Busca de Processos</div><table class="pj-form"><tr><td class="l">Número do Processo:</td><td><span class="pj-input" id="bn" style="min-width:230px"></span> <label><input type="checkbox" id="nu"> Número Único</label></td></tr></table><div class="pj-btnbar" style="justify-content:flex-start;margin-left:190px"><span class="pj-btn primary">Pesquisar</span></div><div id="res"></div></div>');
		await S.cap("Uma <b>nova aba</b> abre a busca, marca “Número Único”, preenche o número…", { ms: 1200 });
		$("#nu").checked = true;
		await S.type("#bn", "0009876-54.2024.8.16.0001", { click: false, speed: 30 });
		$("#res").innerHTML = '<table class="pj-table" style="margin-top:10px"><tr><th>Processo</th><th>Classe</th><th>Juízo</th></tr><tr><td><a class="link">0009876-54.2024.8.16.0001</a></td><td>Ação Penal - Procedimento Ordinário</td><td>Vara Criminal de Exemplo</td></tr></table>';
		await S.cap("…e já pesquisa. Clique no resultado para abrir o processo.");
		await S.endCard("Copiar o número (Ctrl+C) → 📋 Colar processo → nova aba com a busca feita.");
	},
};

// ------------------------------------------------------------------ V25
CENAS.V25 = {
	arquivo: "V25-oraculo.mp4",
	titulo: "Oráculo",
	secao: "8.6",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V25", "Oráculo", "Consulta de antecedentes da parte sem abrir a ficha dela.");
		await S.cap("Clique em <b>Oráculo</b>.");
		await S.click("#x-oraculo");
		modal('<h3>Oráculo — escolher parte</h3>' + REUS.map((r, i) => '<div class="pj-btn" style="display:block;margin:6px 0;padding:10px" id="p' + i + '">' + r.nome + "</div>").join("") + '<span class="pj-btn">Cancelar</span>', { w: 520, top: 170 });
		await S.cap("Com mais de uma parte habilitada (réus, investigados…), escolha qual consultar.");
		await S.click("#p0");
		closeModal();
		const w = add('<div style="position:fixed;left:260px;top:90px;width:760px;height:480px;background:#fff;border:1px solid #777;box-shadow:0 10px 40px rgba(0,0,0,.45);z-index:80"><div style="background:#dee1e6;padding:6px 10px;font-size:12px">Antecedentes Criminais - Oráculo</div><div class="x-dlg-title">Oráculo — Antecedentes Criminais</div><div style="padding:14px;font-size:13px">Parte: <b>' + REUS[0].nome + '</b><br>CPF: ' + REUS[0].cpf + '<br><br><i style="color:#666">(resultado da consulta nativa do Projudi)</i></div></div>');
		await S.cap("Abre a <b>janela nativa do Oráculo</b> do Projudi para essa parte.");
		await S.cap("Se você já estiver na ficha da parte, o atalho usa direto o botão Oráculo dela.");
		await S.endCard("Oráculo → escolher a parte → janela de Antecedentes Criminais.");
	},
};

// ------------------------------------------------------------------ V26
CENAS.V26 = {
	arquivo: "V26-nova-ordenacao.mp4",
	titulo: "Nova Ordenação",
	secao: "7.5",
	async run() {
		telaProcesso({ acoesAbertas: true });
		await S.titleCard("VÍDEO V26", "Nova Ordenação", "Ordene vários cumprimentos em seguida, sem reabrir o diálogo.");
		await S.cap("Abra <b>Ordenar Cumprimentos</b> (grupo Ordenações ou painel Ações do Projudi).");
		await S.click('[data-g="Ordenações"]');
		const pn = panelAt(acaoPanel("Ordenações", [{ nome: "Ordenar Cumprimentos" }, { nome: "Ordenar RPV" }, { nome: "Ordenar Expedição BNMP" }]), '[data-g="Ordenações"]', { w: 380 });
		await S.click('[data-open="Ordenar Cumprimentos"]');
		pn.remove();
		await abrindo("Ordenar Cumprimentos", 900);
		popup("Ordenar Cumprimentos", dlgOrdenar(), { h: 540 });
		await S.cap("Preencha o <b>primeiro</b> cumprimento…");
		await selecionar("#f-tc", "Mandado de Intimação");
		await S.click("#f-partes input"); $("#f-partes input").checked = true;
		await S.cap("…e, em vez de “Ordenar”, clique em <b>🔁 Nova Ordenação</b>.");
		await S.click("#f-nova");
		$(".x-popup .bd > div:last-child").innerHTML = dlgOrdenar();
		$("#f-nova").textContent = "🔁 Nova Ordenação (1 na fila)";
		$("#fila").innerHTML = '<div class="x-chip">1. Mandado de Intimação ✕</div>';
		await S.cap("O item vai para a <b>fila</b> (nada é enviado ainda) e o formulário fica limpo para o próximo.");
		await selecionar("#f-tc", "Ofício");
		await S.type("#f-ori", "Requisitar certidão de antecedentes.");
		await S.cap("No último item, clique no <b>Ordenar</b> do próprio Projudi: aí sim tudo é enviado, item por item.");
		await S.click("#f-ordenar");
		const t = toast("Enviando item 1 de 2…", { left: 560, top: 400 });
		await sleep(1100); t.innerHTML = "Enviando item 2 de 2…"; await sleep(1100); t.remove();
		$(".x-popup .bd > div:last-child").innerHTML = '<div class="pj-msg-ok">2 ordenação(ões) realizada(s) com sucesso.</div>';
		await S.cap("Se algum item falhar, a extensão <b>para</b> e diz qual — o resto fica na fila para revisão.");
		await S.cap("Recomendação: confira nos autos se todos os cumprimentos foram registrados. “Cancelar” descarta a fila.", { ms: 4200 });
		await S.endCard("Preencher → 🔁 Nova Ordenação (repete) → último item → Ordenar → conferir nos autos.");
	},
};

// ------------------------------------------------------------------ V27
CENAS.V27 = {
	arquivo: "V27-nova-remessa.mp4",
	titulo: "Nova Remessa",
	secao: "7.6",
	async run() {
		telaProcesso({ acoesAbertas: true });
		await S.titleCard("VÍDEO V27", "Nova Remessa", "Faça mais de uma remessa em seguida, na mesma tela.");
		await S.cap("Abra <b>Realizar Remessa</b> (grupo Remessa).");
		await S.click('[data-g="Remessa"]');
		const pn = panelAt(acaoPanel("Remessa", [{ nome: "Realizar Remessa" }, { nome: "Remessa Eletrônica para o Tribunal de Justiça" }]), '[data-g="Remessa"]', { w: 420 });
		await S.click('[data-open="Realizar Remessa"]');
		pn.remove();
		await abrindo("Realizar Remessa", 900);
		popup("Realizar Remessa", dlgRemessa(), { h: 520 });
		await S.cap("Escolha a primeira remessa e preencha…");
		await S.click("#op-del"); $("#op-del").checked = true;
		await selecionar("#f-dest", "Delegacia de Exemplo");
		await selecionar("#f-fin", "Cumprimento de diligências");
		await S.cap("…e clique em <b>🔁 Nova Remessa</b> para guardá-la na fila.");
		await S.click("#f-nova");
		$(".x-popup .bd > div:last-child").innerHTML = dlgRemessa();
		$("#f-nova").textContent = "🔁 Nova Remessa (1 na fila)";
		$("#fila").innerHTML = '<div class="x-chip">1. Enviar à Delegacia ✕</div>';
		await S.cap("Preencha a próxima (ex.: <b>Enviar ao Ministério Público</b>)…");
		await S.click("#op-mp"); $("#op-mp").checked = true;
		await selecionar("#f-fin", "Manifestação");
		await S.cap("…e termine com o <b>Realizar Remessa</b> nativo: todas são enviadas, uma a uma.");
		await S.click("#f-realizar");
		const t = toast("Enviando remessa 1 de 2…", { left: 560, top: 400 });
		await sleep(1100); t.innerHTML = "Enviando remessa 2 de 2…"; await sleep(1100); t.remove();
		$(".x-popup .bd > div:last-child").innerHTML = '<div class="pj-msg-ok">2 remessa(s) realizada(s) com sucesso.</div>';
		await S.cap("Como na Nova Ordenação: se uma falhar, o envio para e avisa qual. Confira nos autos.");
		await S.endCard("Preencher → 🔁 Nova Remessa (repete) → última → Realizar Remessa → conferir nos autos.");
	},
};
