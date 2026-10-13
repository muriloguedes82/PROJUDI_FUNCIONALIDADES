// Cenas V01–V15: primeiros passos, tela do processo e quadro Pendências.
"use strict";
const CENAS = {};

// ------------------------------------------------------------------ V01
CENAS.V01 = {
	arquivo: "V01-instalacao-e-termos-de-uso.mp4",
	titulo: "Instalação e Termos de Uso",
	secao: "2.1",
	async run() {
		browser(["*Extensões"], "chrome://extensions");
		screen('<div style="background:#f8f9fa;height:676px;padding:0 24px">' +
			'<div style="display:flex;align-items:center;height:56px;border-bottom:1px solid #ddd;font-size:20px;color:#333">🧩 Extensões<span style="margin-left:auto;font-size:13px">Modo do desenvolvedor <span id="devt" style="display:inline-block;width:34px;height:16px;border-radius:8px;background:#bbb;vertical-align:middle;position:relative"><span id="devk" style="position:absolute;left:1px;top:1px;width:14px;height:14px;border-radius:50%;background:#fff"></span></span></span></div>' +
			'<div id="devbar" style="display:none;padding:10px 0;border-bottom:1px solid #ddd"><span class="pj-btn" id="unpacked">Carregar sem compactação</span> <span class="pj-btn">Compactar extensão</span> <span class="pj-btn">Atualizar</span></div>' +
			'<div id="cards" style="padding:16px 0;display:flex;gap:16px"></div></div>');
		await S.titleCard("VÍDEO V01", "Instalação e Termos de Uso", "Como instalar a extensão no Chrome/Edge e ativá-la aceitando os Termos de Uso.");
		await S.cap("Abra <b>chrome://extensions</b> (no Edge, <b>edge://extensions</b>) e ative o <b>Modo do desenvolvedor</b>.");
		await S.click("#devt");
		$("#devt").style.background = "#1a73e8"; $("#devk").style.left = "19px"; $("#devbar").style.display = "block";
		await S.cap("Clique em <b>Carregar sem compactação</b>.");
		await S.click("#unpacked");
		const m = modal('<h3>Selecionar pasta</h3><div class="x-list"><div>📁 Documentos</div><div id="pasta" style="background:#e8f0fe">📁 extensao-preview-documentos</div><div>📁 Downloads</div></div><div style="text-align:right;margin-top:12px"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="sel">Selecionar pasta</span></div>', { top: 170 });
		await S.cap("Escolha a pasta <b>extensao-preview-documentos</b> (a pasta que contém o arquivo manifest.json).");
		await S.click("#pasta");
		await S.click("#sel");
		closeModal();
		add('<div style="width:360px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px;font-size:13px"><b>Projudi/SEEU - Documentos: Pré-visualização, WhatsApp e E-mail</b><div style="color:#666;margin:6px 0">Versão ' + VERSAO_EXTENSAO + '</div><div style="color:#666">ID: abcdefghijklmnopabcdefghijklmnop</div></div>', $("#cards"));
		await S.cap("A extensão aparece na lista. Em seguida, abre-se sozinha a página de <b>Termos de Uso</b>.");
		browser(["Extensões", "*Projudi/SEEU - Termos de Uso"], "chrome-extension://…/src/termos.html");
		screen('<div style="background:#eef2f6;height:676px;overflow:hidden"><div style="background:#0b3d6e;color:#fff;padding:16px 40px"><div style="font-size:13px;color:#cfe0f2">Extensão Projudi/SEEU · Documentos e Ações Rápidas</div><div style="font-size:26px;font-weight:bold">Termos de Uso</div></div>' +
			'<div style="background:#fff;margin:16px 40px;padding:16px 24px;border-radius:6px;font-size:13px;line-height:20px;color:#333"><b>Antes de começar</b><p>Leia com atenção. A extensão é uma ferramenta de apoio ao uso do Projudi e do SEEU: não substitui a conferência dos atos, que continua sendo sua responsabilidade.</p>' +
			'<b>I · Objeto e finalidade</b> · <b>II · Relação com os sistemas oficiais</b> · <b>III · Conferência dos atos e responsabilidade</b> · <b>IV · Sigilo e compartilhamento de documentos</b> · <b>V · Funcionamento local e dados armazenados</b> · <b>VI · Disponibilidade e suporte</b> · <b>VII · Revisão dos termos</b>' +
			'<div style="margin-top:22px;padding:12px;background:#f5f8fb;border:1px solid #c9d7e6;border-radius:4px"><label><input type="checkbox" id="aceito" style="width:16px;height:16px;vertical-align:middle"> Declaro que li os Termos de Uso e concordo com todas as condições</label></div>' +
			'<div style="margin-top:14px;display:flex;gap:10px"><span class="pj-btn primary" id="aceitar" style="padding:8px 16px;opacity:.5">Aceitar e ativar a extensão</span><span class="pj-btn" style="padding:8px 16px">Não concordo - remover extensão</span></div><div id="ok" style="margin-top:12px"></div></div></div>');
		await S.cap("Leia os termos. Sem o aceite, <b>nenhuma função</b> da extensão é carregada no Projudi/SEEU.");
		await S.cap("Marque a declaração de concordância…");
		await S.click("#aceito");
		$("#aceito").checked = true; $("#aceitar").style.opacity = "1";
		await S.cap("…e clique em <b>Aceitar e ativar a extensão</b>.");
		await S.click("#aceitar");
		$("#ok").innerHTML = '<div class="pj-msg-ok">Termos aceitos em 29/09/2026 10:02. A extensão está ativa.</div>';
		await S.cap("Pronto! Recarregue (F5) as páginas do Projudi/SEEU que já estavam abertas.");
		await S.endCard("Instalação: chrome://extensions → Modo do desenvolvedor → Carregar sem compactação → pasta da extensão → aceitar os Termos de Uso.");
	},
};

// ------------------------------------------------------------------ V02
CENAS.V02 = {
	arquivo: "V02-barra-de-botoes-da-extensao.mp4",
	titulo: "A barra de botões da extensão",
	secao: "2.4",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V02", "A barra de botões da extensão", "Onde ficam os botões, como abrir os grupos de ações, mover e ocultar a barra.");
		S.hl("#x-group", 6);
		await S.cap("Com um processo aberto, os botões da extensão ficam no <b>canto inferior direito</b> da tela.");
		S.hlOff();
		await S.cap("O botão <b>▸ Ações</b> mostra ou recolhe os grupos de ações rápidas (Concluso, Remessa, Partes…).");
		await S.click("#x-toggle");
		setAcoesAbertas(true);
		S.hl("#x-line-grupos", 4);
		await S.cap("Cada grupo abre um painel com as ações do Projudi daquele tipo.");
		S.hlOff();
		await S.click("#x-toggle");
		setAcoesAbertas(false);
		S.hl("#x-mover", 3);
		await S.cap("Se os botões cobrirem algo, arraste <b>↕ Mover</b> para cima ou para baixo (vale só para esta página).");
		S.hlOff();
		await S.move("#x-mover");
		const g = $("#x-group");
		await tween(900, k => (g.style.bottom = 12 + 170 * k + "px"));
		await S.move("#x-mover", { ms: 300 });
		await sleep(600);
		await S.cap("O botão <b>Ocultar</b> esconde todos os botões da extensão; <b>Mostrar</b> os traz de volta.");
		await S.click("#x-ocultarbtns");
		$$("#x-group .line").forEach((l, i) => { if (i < 2) l.style.display = "none"; });
		$$("#x-group .line:last-child .x-btn").forEach(b => { if (b.id !== "x-mover" && b.id !== "x-ocultarbtns") b.style.display = "none"; });
		$("#x-ocultarbtns").textContent = "Mostrar";
		await sleep(1200);
		await S.click("#x-ocultarbtns");
		$$("#x-group .line")[1].style.display = "";
		$$("#x-group .line:last-child .x-btn").forEach(b => (b.style.display = ""));
		$("#x-ocultarbtns").textContent = "Ocultar";
		await S.cap("Passe o mouse sobre qualquer botão para ver uma dica do que ele faz.");
		await S.endCard("▸ Ações abre os grupos · ↕ Mover reposiciona · Ocultar/Mostrar esconde a barra.");
	},
};

// ------------------------------------------------------------------ V03
CENAS.V03 = {
	arquivo: "V03-pre-visualizacao-de-documentos.mp4",
	titulo: "Pré-visualização de documentos",
	secao: "3.1",
	async run() {
		telaProcesso({ expanded: true });
		await S.titleCard("VÍDEO V03", "Pré-visualização de documentos", "Leia a íntegra do documento só passando o mouse — sem abrir outra aba.");
		await S.cap("Na aba <b>Movimentações</b>, pare o mouse sobre o <b>nome de um arquivo</b>.");
		await S.move(byText("a.doc", "Certidao de Baixa"));
		await sleep(400);
		let p = preview("Certidao de Baixa.pdf", 560, 60);
		await S.cap("O documento abre num painel sobre a própria tela. Role dentro dele normalmente.");
		await S.cap("Para fechar: tire o mouse do link e do painel, clique em <b>✕</b> ou tecle <b>Esc</b>.");
		await S.move({ x: 380, y: 300 });
		p.remove();
		await sleep(500);
		telaProcesso({ expanded: false });
		await S.cap("Também funciona sobre o <b>texto da movimentação</b> que tem o controle <b>+</b> (Arquivos), mesmo recolhida.");
		await S.move(byText(".ev", "DESPACHO"));
		await sleep(500);
		p = preview("Despacho.pdf", 560, 60);
		await sleep(2600);
		p.remove();
		await S.cap("Se a movimentação tiver <b>mais de um arquivo</b>, aparece o aviso “Múltiplos documentos”.");
		const ev = byText(".ev", "MINISTÉRIO PÚBLICO");
		await S.move(ev);
		ev.insertAdjacentHTML("afterend", '<span class="x-multi">Múltiplos documentos (2)</span>');
		await sleep(1500);
		await S.cap("Nesse caso, clique no <b>+</b> para ver a lista e passe o mouse sobre cada arquivo.");
		await S.endCard("Mouse parado sobre o arquivo = pré-visualização. Esc ou ✕ fecha. “Abrir em nova aba” mantém o jeito tradicional.");
	},
};

// ------------------------------------------------------------------ V04
CENAS.V04 = {
	arquivo: "V04-pre-visualizacao-das-pendencias.mp4",
	titulo: "Pré-visualização das pendências",
	secao: "3.2",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V04", "Pré-visualização das pendências", "Veja os documentos de juntadas e conclusões pendentes direto do quadro Pendências.");
		S.hl("#quadroPendencias", 3);
		await S.cap("No quadro <b>Pendências</b>, passe o mouse sobre o link da pendência de juntada ou de conclusão.");
		S.hlOff();
		await S.move("#pend-juntada");
		const t = toast("⏳ Carregando os documentos pendentes…", { left: 540, top: 250 });
		await sleep(1600);
		t.remove();
		preview("Peticao Defesa.pdf", 430, 50, 420, 500);
		await sleep(400);
		preview("Manifestacao MP.pdf", 520, 110, 420, 500);
		await S.cap("Uma janela para <b>cada pendência</b>, em cascata — sem sair da tela do processo.");
		await S.cap("Nada é aceito, rejeitado ou dispensado: a extensão só lê os documentos.");
		await S.cap("Se nada for encontrado, um aviso oferece abrir a análise completa. O clique normal no link continua funcionando.");
		await S.endCard("Mouse sobre “Há N pendência(s)…” = documentos pendentes em janelas lado a lado.");
	},
};

// ------------------------------------------------------------------ V05
CENAS.V05 = {
	arquivo: "V05-expandir-e-ocultar-movimentacoes.mp4",
	titulo: "Expandir movimentações e ocultar as sem arquivo",
	secao: "3.3",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V05", "Expandir movimentações e ocultar as sem arquivo", "Abra todos os anexos de uma vez e esconda as movimentações sem documento.");
		S.hl("#slot-expandir", 2);
		await S.cap("Na última linha do quadro <b>Pendências</b> ficam dois botões da extensão.");
		S.hlOff();
		await S.cap("<b>Expandir Mov ▼</b> abre de uma vez os anexos (+) de todas as movimentações da página.");
		await S.click("#x-expandir");
		telaProcesso({ expanded: true });
		$("#x-expandir").textContent = "Recolher Mov ▲";
		await S.cap("O mesmo botão vira <b>Recolher Mov ▲</b>.");
		await S.cap("<b>Apenas com arquivo (+)</b> esconde as movimentações que não têm nenhum documento.");
		await S.click("#x-ocultar", { dx: -40 });
		$$("#movs tr").forEach(tr => { if (tr.querySelector("td") && !tr.querySelector(".pj-plus")) tr.style.display = "none"; });
		$("#x-ocultar-rot").textContent = "Mostrar todos";
		await S.cap("O botão passa a se chamar <b>Mostrar todos</b>: clique nele para ver tudo de novo.");
		await sleep(1500);
		await S.cap("Marque a caixinha <b>sempre</b> para que isso já venha ativado em todos os processos.");
		await S.click("#x-sempre");
		$("#x-sempre").checked = true;
		await S.cap("Para desfazer, clique em <b>Mostrar todos</b> (e desmarque “sempre”, se quiser).");
		await S.endCard("Expandir Mov / Recolher Mov · Apenas com arquivo (+) / Mostrar todos · “sempre” grava a preferência.");
	},
};

// ------------------------------------------------------------------ V06
CENAS.V06 = {
	arquivo: "V06-destacar-movimentacoes.mp4",
	titulo: "Destacar movimentações por tipo de usuário",
	secao: "3.4",
	async run() {
		telaProcesso({});
		// Uma linha de exemplo movimentada por um Procurador (só nesta cena).
		const trProc = document.getElementById("mov1Grau,37");
		if (trProc) {
			trProc.dataset.papel = "Procurador";
			trProc.querySelector(".ev").textContent = "JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DO MUNICÍPIO";
			trProc.lastElementChild.innerHTML = 'PROCURADOR DO MUNICÍPIO DE EXEMPLO<span class="papel">Procurador</span>';
		}
		await S.titleCard("VÍDEO V06", "Destacar movimentações por tipo de usuário", "Pinte as movimentações de Magistrado, Ministério Público, Advogado, Procurador, Defensor ou Audiência — em todos os processos.");
		await S.cap("Clique em <b>🖍️ Destacar mov.</b>.");
		await S.click("#x-destacar");
		const cores = ["#fff3b0", "#cfe8ff", "#d9f2d0", "#ffd6d6", "#e9dcff"];
		const pal = sel => cores.map((c, i) => '<span class="x-swatch" data-c="' + i + '" style="background:' + c + '">' + (sel === i ? "✓" : "") + "</span>").join("");
		const m = modal('<h3>🖍️ Destacar movimentações</h3>' +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-mag"> <b>Magistrado / Magistrada</b></label><div id="p-mag">' + pal(-1) + "</div></div>" +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-mp"> <b>Ministério Público</b></label><div id="p-mp">' + pal(-1) + "</div></div>" +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-adv"> <b>Advogado / Advogada</b></label><div id="p-adv">' + pal(-1) + "</div></div>" +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-proc"> <b>Procurador / Procuradora</b></label><div id="p-proc">' + pal(-1) + "</div></div>" +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-def"> <b>Defensor / Defensora</b></label><div id="p-def">' + pal(-1) + "</div></div>" +
			'<div style="margin:8px 0"><label><input type="checkbox" id="c-aud"> <b>Audiência</b></label><div id="p-aud">' + pal(-1) + "</div></div>" +
			'<div style="text-align:right"><span class="pj-btn">Cancelar</span> <span class="pj-btn primary" id="salvar">Salvar</span></div><div id="st" style="color:#2c5e1a"></div>', { top: 120 });
		await S.cap("Marque os tipos que quer destacar e escolha uma cor para cada um.");
		await S.click("#c-mag"); $("#c-mag").checked = true;
		await S.click('#p-mag [data-c="0"]'); $("#p-mag").innerHTML = pal(0);
		await S.click("#c-mp"); $("#c-mp").checked = true;
		await S.click('#p-mp [data-c="1"]'); $("#p-mp").innerHTML = pal(1);
		await S.click("#c-proc"); $("#c-proc").checked = true;
		await S.click('#p-proc [data-c="3"]'); $("#p-proc").innerHTML = pal(3);
		await S.cap("Uma cor nunca fica repetida: escolher a cor de outro tipo troca as cores entre os dois.", { ms: 3200 });
		await S.click("#salvar");
		$("#st").textContent = "Preferência salva.";
		await sleep(700);
		closeModal();
		$$("#movs tr[data-papel]").forEach(tr => {
			const p = tr.dataset.papel;
			const c = /Magistrad/.test(p) ? cores[0] : /Minist/.test(p) ? cores[1] : /Procurador/.test(p) ? cores[3] : "";
			if (c) tr.querySelectorAll("td").forEach(td => (td.style.background = c));
		});
		await S.cap("As linhas passam a aparecer coloridas — <b>em qualquer processo</b>, sempre que abrir a aba Movimentações.");
		await S.cap("Para mudar depois, abra o mesmo botão: ele já vem preenchido com o que foi salvo.");
		await S.endCard("🖍️ Destacar mov. → marcar tipos → escolher cores → Salvar. Vale para todos os processos.");
	},
};

// ------------------------------------------------------------------ V07
CENAS.V07 = {
	arquivo: "V07-envio-por-whatsapp.mp4",
	titulo: "Envio por WhatsApp Web",
	secao: "5.1",
	async run() {
		telaProcesso({ expanded: true, checks: true });
		await S.titleCard("VÍDEO V07", "Envio de documentos por WhatsApp Web", "Selecione os documentos e eles chegam anexados na conversa certa do WhatsApp Web.");
		await S.cap("Marque a caixinha ao lado de cada documento que quer enviar.");
		const c1 = byText(".pj-files div", "Despacho").querySelector("input");
		const c2 = byText(".pj-files div", "Certidao").querySelector("input");
		await S.click(c1); c1.checked = true;
		await S.click(c2); c2.checked = true;
		await S.cap("Clique em <b>📱 Enviar por WhatsApp</b>.");
		await S.click("#x-whats");
		const pn = panelAt('<h4>Enviar por WhatsApp (2 documentos)</h4><div class="x-note">Número com DDD (sem DDI, assume +55):</div><div class="x-field" id="num"></div>' +
			'<div style="display:flex;justify-content:space-between;margin-top:8px"><b>Destinatários salvos</b><span class="x-btn small">+ Novo</span></div><div class="x-field" style="margin:4px 0;color:#999">🔍 Pesquisar</div>' +
			'<div class="x-list"><div id="d1">★ Delegacia de Exemplo — (41) 3333-0000</div><div>☆ Oficial de Justiça Paulo — (41) 99999-0000</div></div>' +
			'<div style="text-align:right;margin-top:8px"><span class="x-btn">Cancelar</span> <span class="x-btn green" id="enviar">Enviar</span></div>', "#x-whats", { w: 360 });
		await S.cap("Digite o número com DDD — ou clique num <b>destinatário salvo</b> (★ = favorito, fica no topo).");
		await S.click("#d1");
		$("#num").textContent = "(41) 3333-0000";
		await S.cap("Confira o número e clique em <b>Enviar</b>.");
		await S.click("#enviar");
		pn.remove();
		browser(["Projudi - Processo " + PROC, "*WhatsApp"], "https://web.whatsapp.com/send?phone=554133330000");
		screen('<div style="display:flex;height:676px"><div style="width:360px;background:#fff;border-right:1px solid #ddd"><div style="background:#f0f2f5;height:54px"></div><div style="padding:12px;border-bottom:1px solid #eee"><b>Delegacia de Exemplo</b><div style="color:#666;font-size:12px">clique para conversar</div></div></div>' +
			'<div style="flex:1;background:#efeae2;position:relative"><div style="background:#f0f2f5;height:54px;padding:16px;font-weight:bold">Delegacia de Exemplo</div>' +
			'<div id="att" style="position:absolute;left:0;right:0;top:54px;bottom:62px"></div><div style="position:absolute;bottom:0;left:0;right:0;height:62px;background:#f0f2f5;padding:12px"><div class="x-field" style="border-radius:8px;color:#888">Digite uma mensagem</div></div></div></div>');
		const t = toast("Projudi: aguardando a conversa carregar…", { left: 16, bottom: 20 });
		await S.cap("O WhatsApp Web abre <b>já na conversa do número informado</b> (é preciso estar conectado).");
		t.innerHTML = "Projudi: anexando arquivo(s)…";
		await sleep(1200);
		$("#att").innerHTML = '<div style="position:absolute;inset:20px 60px;background:#e9edef;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px"><div style="display:flex;gap:18px"><div style="background:#fff;padding:26px 18px;border-radius:6px">📄 Despacho.pdf</div><div style="background:#fff;padding:26px 18px;border-radius:6px">📄 Certidao de Baixa.pdf</div></div><div class="x-field" style="width:420px;color:#888">Adicione uma legenda…</div><span id="send" style="background:#00a884;color:#fff;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:20px">➤</span></div>';
		t.innerHTML = "Projudi: ✅ 2 arquivo(s) anexado(s)";
		await S.cap("Os arquivos já chegam anexados. <b>Revise o destinatário e os anexos</b>, escreva uma legenda se quiser…");
		await S.cap("…e <b>você</b> clica em enviar. A extensão nunca envia a mensagem sozinha.");
		await S.move("#send");
		await S.endCard("Marcar documentos → 📱 Enviar por WhatsApp → número ou destinatário salvo → conferir e enviar no WhatsApp Web.");
	},
};

// ------------------------------------------------------------------ V08
CENAS.V08 = {
	arquivo: "V08-envio-por-email.mp4",
	titulo: "Envio por e-mail (Outlook)",
	secao: "5.2",
	async run() {
		telaProcesso({ expanded: true, checks: true });
		await S.titleCard("VÍDEO V08", "Envio de documentos por e-mail (Outlook)", "Um rascunho no Outlook institucional já com os documentos anexados.");
		await S.cap("Marque os documentos (ou nenhum, para um e-mail sem anexos).");
		const c1 = byText(".pj-files div", "Decisao").querySelector("input");
		await S.click(c1); c1.checked = true;
		$("#x-email").textContent = "✉️ Enviar por e-mail (1)";
		await S.cap("O botão mostra quantos estão marcados. Clique em <b>✉️ Enviar por e-mail</b>.");
		await S.click("#x-email");
		const m = modal('<h3>Destinatários</h3><div class="x-field" style="color:#999">🔍 Buscar por nome ou e-mail</div><div class="x-list" style="margin-top:6px">' +
			'<div><input type="checkbox" id="r1"> ★ <b>Delegacia de Exemplo</b> <span style="color:#666">delegacia@exemplo.gov.br</span></div>' +
			'<div><input type="checkbox"> ☆ <b>CAPS Exemplo</b> <span style="color:#666">caps@exemplo.gov.br</span></div></div>' +
			'<div style="text-align:right;margin-top:10px"><span class="pj-btn">Pular</span> <span class="pj-btn primary" id="prosseguir">Prosseguir</span></div>', { w: 520, top: 170 });
		await S.cap("Se houver destinatários salvos, escolha um ou mais — ou clique em <b>Pular</b> para preencher no Outlook.");
		await S.click("#r1"); $("#r1").checked = true;
		await S.click("#prosseguir");
		closeModal();
		const t = toast("⏳ Baixando documentos e preparando o rascunho…", { left: 520, top: 300 });
		await sleep(1500);
		t.remove();
		const w = add('<div style="position:fixed;left:200px;top:70px;width:880px;height:560px;background:#fff;border:1px solid #888;box-shadow:0 10px 40px rgba(0,0,0,.45);z-index:80;font-size:13px">' +
			'<div style="background:#0f6cbd;color:#fff;padding:8px 12px">Outlook — Nova mensagem (janela pop-up)</div><div style="padding:12px 18px">' +
			'<div style="border-bottom:1px solid #ddd;padding:6px 0">Para: <span style="background:#e8f0fe;padding:2px 8px;border-radius:10px">delegacia@exemplo.gov.br</span></div>' +
			'<div style="border-bottom:1px solid #ddd;padding:6px 0;color:#888">Adicionar um assunto</div>' +
			'<div style="padding:8px 0"><span style="border:1px solid #ccc;padding:6px 10px;border-radius:4px">📄 Decisao Recebimento.pdf</span></div>' +
			'<div style="padding:10px 0;line-height:20px">REF. AUTOS Nº (' + PROC + ')<br>JUÍZO: (Vara Criminal de Exemplo)<br><br><span style="color:#888">|</span></div>' +
			'<span style="background:#0f6cbd;color:#fff;padding:6px 16px;border-radius:4px" id="send">Enviar</span></div></div>');
		await S.cap("Abre um <b>rascunho do Outlook</b> numa janela menor, com anexos, destinatário e o cabeçalho REF. AUTOS / JUÍZO.");
		await S.cap("Complete o assunto e o texto, confira tudo e clique em <b>Enviar</b> no próprio Outlook.");
		await S.move("#send");
		await S.cap("Sem cadastro no Azure pelo TI, o modo <b>Outlook Web</b> baixa os arquivos para Downloads e orienta a anexá-los pelo botão “Anexar arquivo”.", { ms: 5200 });
		await S.endCard("Marcar documentos → ✉️ Enviar por e-mail → destinatários → rascunho no Outlook → conferir e enviar.");
	},
};

// ------------------------------------------------------------------ V09
CENAS.V09 = {
	arquivo: "V09-destinatarios-e-remetentes-do-email.mp4",
	titulo: "Destinatários favoritos e remetentes do e-mail",
	secao: "5.3",
	async run() {
		telaProcesso({ expanded: true, checks: true });
		await S.titleCard("VÍDEO V09", "Destinatários favoritos e remetentes do e-mail", "Cadastre contatos frequentes e a conta que aparece no campo “De”.");
		await S.click("#x-email");
		modal('<h3>Destinatários</h3><div style="display:flex;gap:6px"><div class="x-field" style="flex:1" id="nome"></div><div class="x-field" style="flex:1.4" id="mail"></div><span class="pj-btn" id="addr">+ Adicionar</span></div>' +
			'<div class="x-field" style="margin-top:6px;color:#999" id="busca">🔍 Buscar por nome ou e-mail</div><div class="x-list" id="lst" style="margin-top:6px">' +
			'<div><input type="checkbox"> <span class="st">☆</span> <b>CAPS Exemplo</b> <span style="color:#666">caps@exemplo.gov.br</span> <span style="margin-left:auto">🗑</span></div>' +
			'<div><input type="checkbox"> <span class="st">★</span> <b>Delegacia de Exemplo</b> <span style="color:#666">delegacia@exemplo.gov.br</span> <span style="margin-left:auto">🗑</span></div></div>' +
			'<div style="text-align:right;margin-top:10px"><span class="pj-btn">Pular</span> <span class="pj-btn primary">Prosseguir</span></div>', { w: 620, top: 130 });
		await S.cap("A lista de destinatários aparece ao clicar em <b>Enviar por e-mail</b> (quando já há algum salvo).");
		await S.cap("Para <b>adicionar</b>: informe Nome e E-mail e clique em <b>+ Adicionar</b> (até 200 contatos).");
		await S.type("#nome", "Patronato Exemplo");
		await S.type("#mail", "patronato@exemplo.gov.br");
		await S.click("#addr");
		$("#lst").insertAdjacentHTML("beforeend", '<div id="novo"><input type="checkbox"> <span class="st">☆</span> <b>Patronato Exemplo</b> <span style="color:#666">patronato@exemplo.gov.br</span> <span style="margin-left:auto">🗑</span></div>');
		$("#nome").textContent = ""; $("#mail").textContent = "";
		await S.cap("Clique na <b>estrela</b> para priorizar: os prioritários ficam no topo. 🗑 remove.");
		await S.click("#novo .st");
		$("#novo .st").textContent = "★";
		$("#lst").insertBefore($("#novo"), $("#lst").firstChild);
		await S.cap("A lupa filtra a lista por nome ou e-mail.");
		closeModal();
		await S.cap("No modo <b>Outlook Web</b>, a seta <b>▼</b> ao lado do botão abre <b>Alterar Remetente</b>.");
		await S.click("#x-email-menu");
		const mm = panelAt('<div style="padding:4px 6px" id="alt">Alterar Remetente</div>', "#x-email-menu", { w: 170 });
		await S.click("#alt");
		mm.remove();
		modal('<h3>Remetentes (campo “De”)</h3><div class="x-list"><div>★ <b>Vara Criminal de Exemplo</b> vara@exemplo.jus.br <span style="margin-left:auto">✏️ 🗑</span></div><div>☆ <b>Ana Servidora</b> ana@exemplo.jus.br <span style="margin-left:auto">✏️ 🗑</span></div></div><div class="x-note">A conta marcada com ★ é selecionada no campo “De” do Outlook. Exige a permissão “Enviar como” (configurada pelo TI).</div>', { w: 560, top: 160 });
		await S.cap("Cadastre até 20 contas e marque a <b>padrão</b> com ★. O Outlook precisa ter a permissão “Enviar como” para essa conta.", { ms: 5200 });
		await S.endCard("Destinatários: + Adicionar, ★ prioriza, 🗑 remove, 🔍 busca. Remetente: ▼ → Alterar Remetente.");
	},
};

// ------------------------------------------------------------------ V10
CENAS.V10 = {
	arquivo: "V10-suspensao-e-monitoracao-no-cabecalho.mp4",
	titulo: "Suspensão e monitoração eletrônica no cabeçalho",
	secao: "4.1",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V10", "Suspensão e monitoração eletrônica no cabeçalho", "Saiba, ao abrir o processo, se há suspensão ou monitoração ativa.");
		S.hl(".pj-title", 4);
		await S.cap("Ao abrir o processo, a extensão lê a aba <b>Informações Adicionais</b> em segundo plano.");
		S.hlOff();
		await sleep(600);
		$("#hdr-cards").innerHTML = '<span class="x-card-hdr" id="c1">Suspenso: Art. 366 do CPP - ' + REUS[0].nome + "</span>";
		await S.cap("Se houver suspensão <b>ATIVA</b> (art. 366 CPP, art. 89 da Lei 9.099, insanidade, ANPP, transação penal), aparece um card.");
		$("#c1").textContent += " (desde 14/05/2025)";
		await S.cap("Logo depois, o card ganha a <b>data de início</b> da suspensão.");
		$("#hdr-cards").insertAdjacentHTML("beforeend", '<span class="x-card-hdr mon" id="c2">Monitorado eletronicamente: ' + REUS[1].nome + " (desde 20/07/2025)</span>");
		await S.cap("Com monitoração eletrônica ativa, outro card mostra a parte monitorada e desde quando.");
		await S.move("#c1");
		toast("Suspenso: Art. 366 do CPP - " + REUS[0].nome + " (desde 14/05/2025)", { left: 420, top: 150 });
		await S.cap("Passe o mouse sobre o card para ver a informação completa. Com vários réus, um card para cada.");
		await S.cap("Os cards continuam no cabeçalho ao trocar de aba.");
		await S.endCard("Cards no cabeçalho = suspensão ou monitoração eletrônica ATIVA, com a data de início.");
	},
};

// ------------------------------------------------------------------ V11
CENAS.V11 = {
	arquivo: "V11-reus-no-cabecalho.mp4",
	titulo: "Réus, indiciados e noticiados no cabeçalho",
	secao: "4.3",
	async run() {
		telaProcesso({});
		await S.titleCard("VÍDEO V11", "Réus, indiciados e noticiados no cabeçalho", "Nome, RG e CPF do polo passivo sem abrir a aba Partes e Outros.");
		await sleep(400);
		$("#row-assunto").insertAdjacentHTML("afterend", '<tr id="row-reu"><td class="l">Réu:</td><td colspan="3">' + REUS.map((r, i) => '<a class="link" id="reu' + i + '">' + r.nome + "</a> (RG: " + r.rg + "; CPF: " + r.cpf + ")").join("<br>") + "</td></tr>");
		S.hl("#row-reu", 3);
		await S.cap("Abaixo do <b>Assunto</b>, a extensão mostra todas as partes do polo passivo, com RG e CPF.");
		S.hlOff();
		await S.cap("Clique no <b>nome</b> para abrir a ficha da parte num popup, sem sair da tela.");
		await S.click("#reu0");
		popup("Parte do Processo", '<table class="pj-form"><tr><td class="l">Nome:</td><td>' + REUS[0].nome + '</td></tr><tr><td class="l">RG:</td><td>' + REUS[0].rg + '</td></tr><tr><td class="l">CPF:</td><td>' + REUS[0].cpf + '</td></tr><tr><td class="l">Polo:</td><td>Passivo — Réu</td></tr></table><div class="pj-btnbar" style="justify-content:flex-start"><span class="pj-btn">Alterar Parte</span><span class="pj-btn">Alterar Polo</span><span class="pj-btn">Dar Baixa</span><span class="pj-btn">Atualizar Dados IIPR</span></div>', { hd: "Parte — popup da extensão" });
		await S.cap("É a mesma tela da aba Partes e Outros (Alterar Parte, Alterar Polo, Dar Baixa…).");
		await S.cap("Feche com <b>✕ Fechar</b>.");
		await S.click("#x-fechar");
		$(".x-popup").remove();
		await S.endCard("Linha “Réu:” no cabeçalho · clique no nome → ficha da parte em popup.");
	},
};

// ------------------------------------------------------------------ V12
CENAS.V12 = {
	arquivo: "V12-sequencial-do-processo-principal.mp4",
	titulo: "Sequencial do processo principal (apensos)",
	secao: "4.4",
	async run() {
		telaProcesso({ tab: "gerais", apenso: true });
		await S.titleCard("VÍDEO V12", "Sequencial do processo principal (apensos)", "O Sequencial do processo principal aparece no próprio apenso.");
		S.hl("#row-principal", 3);
		await S.cap("Num processo <b>apenso</b>, a aba <b>Informações Gerais</b> mostra o “Processo Principal”.");
		S.hlOff();
		$("#row-principal").parentNode.insertAdjacentHTML("beforeend",
			'<tr id="row-apens"><td class="l">Apensamentos:</td><td style="line-height:1.6">' +
			'<span id="apens-raiz">Processo: <a class="link">' + PROC + '</a> - Ação Penal - ATIVO</span><br>' +
			'&nbsp;&nbsp;&nbsp;&nbsp;↳ Processo: 0003456-12.2025.8.16.0001 - Medidas Protetivas - ATIVO<br>' +
			'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Processo: 0005678-90.2025.8.16.0001 - Incidente - ATIVO</b></td></tr>');
		S.hl("#apens-raiz", 3);
		await S.cap("O processo principal é sempre o <b>primeiro da linha Apensamentos</b> — mesmo num apenso de apenso.");
		S.hlOff();
		$("#row-principal").insertAdjacentHTML("afterend", '<tr id="row-seqp"><td class="l" style="color:#ff6a00">Sequencial do Processo Principal:</td><td id="seqp" style="color:#888">Buscando…</td></tr>');
		await S.cap("Logo abaixo de “Processo Principal”, a extensão acrescenta o <b>Sequencial do Processo Principal</b>…");
		$("#seqp").textContent = "45054"; $("#seqp").style.color = "#ff6a00";
		S.hl("#row-seqp", 3);
		await S.cap("…buscado em segundo plano, sem abrir o processo principal.");
		S.hlOff();
		await S.cap("No primeiro processo da lista (ou num processo sem apensos) aparece a linha <b>Sequencial:</b> do próprio processo.");
		await S.endCard("Apenso → “Sequencial do Processo Principal” = Sequencial do 1º processo da linha Apensamentos.");
	},
};

// ------------------------------------------------------------------ V13
CENAS.V13 = {
	arquivo: "V13-dispensar-juntadas.mp4",
	titulo: "Dispensar juntadas",
	secao: "6.1",
	async run() {
		telaProcesso({});
		$("#slot-juntada").innerHTML = ' <span class="x-btn small" id="b-disp">Dispensar juntadas</span>';
		await S.titleCard("VÍDEO V13", "Dispensar juntadas", "Dispense todas as juntadas pendentes com um clique, sem abrir a tela de análise.");
		await S.cap("Ao lado da pendência de <b>Análise de Juntadas</b> aparece o botão <b>Dispensar juntadas</b>.");
		await S.cap("Antes, confira se as juntadas podem mesmo ser dispensadas (use a pré-visualização — vídeo V04).");
		await S.click("#b-disp");
		$("#slot-juntada").innerHTML = '<span class="x-inline"><span class="msg wait">Dispensando juntadas selecionáveis desta página…</span></span>';
		await S.cap("A extensão abre a análise em segundo plano e dispensa as juntadas selecionáveis.");
		$("#slot-juntada").innerHTML = '<span class="x-inline"><span class="msg">Juntada(s) já dispensada(s) - Movimentação permitida.</span><span class="x-btn small">Fechar aviso</span></span>';
		await S.cap("Pronto: <b>Juntada(s) já dispensada(s) - Movimentação permitida.</b>");
		await S.cap("Se algo falhar, o aviso oferece <b>Ver detalhes</b>, mostrando a tela onde parou.");
		await S.endCard("Pendências → Dispensar juntadas → aguarde a mensagem de sucesso.");
	},
};

// ------------------------------------------------------------------ V14
CENAS.V14 = {
	arquivo: "V14-finalizar-conclusao.mp4",
	titulo: "Finalizar conclusão pendente",
	secao: "6.2",
	async run() {
		telaProcesso({});
		$("#slot-conclusao").innerHTML = ' <span class="x-btn small" id="b-fin">Finalizar conclusão</span>';
		await S.titleCard("VÍDEO V14", "Finalizar conclusão pendente", "Finalize a conclusão pendente direto do quadro Pendências.");
		await S.cap("Na pendência de <b>Análise de Conclusão</b>, clique em <b>Finalizar conclusão</b>.");
		await S.click("#b-fin");
		$("#b-fin").textContent = "Finalizando…"; $("#b-fin").style.opacity = ".6";
		await S.cap("A extensão confere se o botão nativo “Finalizar Conclusão Pendente” existe e o aciona.");
		$("#b-fin").textContent = "Conclusão finalizada"; $("#b-fin").style.opacity = "1"; $("#b-fin").classList.add("green");
		await S.cap("Resultado: <b>Conclusão finalizada</b>. A lista de pendências só muda quando você recarregar a página.");
		await S.cap("Se aparecer <b>Verifique a conclusão</b>, confira manualmente no Projudi antes de tentar de novo.");
		await S.endCard("Pendências → Finalizar conclusão → “Conclusão finalizada”.");
	},
};

// ------------------------------------------------------------------ V15
CENAS.V15 = {
	arquivo: "V15-dispensar-decursos.mp4",
	titulo: "Dispensar decursos de prazo",
	secao: "6.3",
	async run() {
		telaProcesso({});
		$("#slot-decurso").innerHTML = ' <span class="x-btn small" id="b-dec">Dispensar decursos</span>';
		await S.titleCard("VÍDEO V15", "Dispensar decursos de prazo", "Dispense todas as intimações aguardando análise de decurso, uma após a outra.");
		await S.cap("Na pendência de intimações <b>aguardando análise de decurso de prazo</b>, clique em <b>Dispensar decursos</b>.");
		await S.click("#b-dec");
		$("#slot-decurso").innerHTML = '<span class="x-inline"><span class="msg wait">Localizando decursos pendentes…</span></span>';
		await sleep(1200);
		$("#slot-decurso").innerHTML = '<span class="x-inline"><span class="msg wait">Dispensando decurso 1 de 2…</span></span>';
		await S.cap("Cada intimação é aberta e dispensada em segundo plano, conferindo a lista a cada passo.");
		$("#slot-decurso").innerHTML = '<span class="x-inline"><span class="msg wait">Dispensando decurso 2 de 2…</span></span>';
		await sleep(1400);
		$("#slot-decurso").innerHTML = '<span class="x-inline"><span class="msg">Decurso(s) já dispensado(s) - Movimentação permitida.</span><span class="x-btn small">Fechar aviso</span></span>';
		await S.cap("Ao final: <b>Decurso(s) já dispensado(s) - Movimentação permitida.</b>");
		await S.cap("Qualquer erro <b>interrompe</b> a sequência — nada mais é dispensado — e “Ver detalhes” mostra onde parou.");
		await S.endCard("Pendências → Dispensar decursos → acompanhe “1 de N” até a mensagem final.");
	},
};
