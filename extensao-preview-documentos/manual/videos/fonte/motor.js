// Motor dos vídeos do manual: cursor, cliques, legendas, cartões e telas
// SIMULADAS do Projudi. Tudo roda sob o relógio virtual do gravador
// (gravar.mjs): cada setTimeout/Date.now é controlado quadro a quadro.
"use strict";

const VERSAO_EXTENSAO = "2.9.92";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const easeInOut = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
async function tween(ms, fn, ease = easeInOut) {
	const t0 = Date.now();
	for (;;) {
		const p = Math.min(1, (Date.now() - t0) / ms);
		fn(ease(p));
		if (p >= 1) break;
		await sleep(16);
	}
}
const $ = (sel, root = document) => (typeof sel === "string" ? root.querySelector(sel) : sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function el(html) {
	const t = document.createElement("template");
	t.innerHTML = html.trim();
	return t.content.firstElementChild;
}
function add(html, parent = document.body) {
	const node = el(html);
	parent.appendChild(node);
	return node;
}
function byText(sel, text, root = document) {
	return $$(sel, root).find(n => n.textContent.includes(text));
}

// ---------------------------------------------------------------- S (diretor)
const S = {
	x: 640,
	y: 420,
	cursor: null,
	hls: [],

	init() {
		const ov = document.getElementById("overlay");
		ov.innerHTML =
			'<div id="watermark">Tela simulada para fins didáticos — a aparência real do Projudi pode variar</div>' +
			'<div id="ripple"></div><div id="caption"></div>' +
			'<svg id="cursor" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
			'<div id="titlecard"><div class="code"></div><div class="name"></div><div class="sub"></div><div class="foot"></div></div>';
		this.cursor = document.getElementById("cursor");
		this.place();
	},
	place() {
		this.cursor.style.left = this.x - 2 + "px";
		this.cursor.style.top = this.y - 2 + "px";
	},
	point(target, dx = 0, dy = 0) {
		const node = $(target);
		if (!node) throw new Error("Alvo não encontrado: " + target);
		const r = node.getBoundingClientRect();
		return { x: r.left + r.width / 2 + dx, y: r.top + r.height / 2 + dy };
	},
	async move(target, o = {}) {
		const p = typeof target === "object" && "x" in target ? target : this.point(target, o.dx || 0, o.dy || 0);
		const x0 = this.x, y0 = this.y;
		const dist = Math.hypot(p.x - x0, p.y - y0);
		const ms = o.ms || Math.max(350, Math.min(1100, dist * 1.3));
		await tween(ms, k => {
			this.x = x0 + (p.x - x0) * k;
			this.y = y0 + (p.y - y0) * k;
			this.place();
		});
	},
	async click(target, o = {}) {
		if (target) await this.move(target, o);
		await sleep(120);
		const r = document.getElementById("ripple");
		r.style.display = "block";
		await tween(280, k => {
			const d = 10 + 26 * k;
			r.style.width = r.style.height = d + "px";
			r.style.left = this.x - d / 2 + "px";
			r.style.top = this.y - d / 2 + "px";
			r.style.opacity = String(1 - k * 0.8);
		}, p => p);
		r.style.display = "none";
		await sleep(o.after ?? 250);
	},
	async type(target, text, o = {}) {
		const node = $(target);
		if (o.click !== false) await this.click(node, { after: 120 });
		const base = o.append ? node.textContent : "";
		for (let i = 1; i <= text.length; i++) {
			node.textContent = base + text.slice(0, i);
			await sleep(o.speed || 55);
		}
		await sleep(250);
	},
	// Legenda: fica na tela pelo tempo de leitura (ou até a próxima).
	async cap(html, o = {}) {
		const c = document.getElementById("caption");
		// Com uma barra da extensão no topo, a legenda desce para não cobri-la.
		const embaixo = o.bottom ?? !!document.querySelector(".x-bar[data-topo]");
		c.className = embaixo ? "bottom" : "";
		c.innerHTML = html;
		c.style.display = "block";
		const chars = html.replace(/<[^>]+>/g, "").length;
		await sleep(o.ms ?? Math.max(2300, chars * 58));
	},
	capOff() {
		document.getElementById("caption").style.display = "none";
	},
	hl(target, pad = 5) {
		const r = $(target).getBoundingClientRect();
		const h = add('<div class="hl"></div>', document.getElementById("overlay"));
		Object.assign(h.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
		this.hls.push(h);
		return h;
	},
	hlOff() {
		this.hls.forEach(h => h.remove());
		this.hls = [];
	},
	async titleCard(code, name, sub) {
		const t = document.getElementById("titlecard");
		t.querySelector(".code").textContent = code;
		t.querySelector(".name").textContent = name;
		t.querySelector(".sub").textContent = sub || "";
		t.querySelector(".foot").textContent = "Manual da extensão Projudi/SEEU · versão " + VERSAO_EXTENSAO;
		t.style.display = "flex";
		t.style.opacity = "1";
		await sleep(2600);
		await tween(450, k => (t.style.opacity = String(1 - k)));
		t.style.display = "none";
	},
	async endCard(text) {
		const t = document.getElementById("titlecard");
		this.capOff();
		t.querySelector(".code").textContent = "RESUMO";
		t.querySelector(".name").textContent = "";
		t.querySelector(".sub").innerHTML = text;
		t.style.display = "flex";
		await tween(400, k => (t.style.opacity = String(k)));
		await sleep(Math.max(3200, text.replace(/<[^>]+>/g, "").length * 55));
	},
	async scroll(y, ms = 700) {
		const sc = $("#app .scroll");
		const y0 = -parseFloat(sc.style.top || "0");
		await tween(ms, k => (sc.style.top = -(y0 + (y - y0) * k) + "px"));
	},
};

// ---------------------------------------------------------------- navegador
function browser(tabs, url) {
	document.getElementById("browser").innerHTML =
		'<div class="tabs">' + tabs.map((t, i) => '<div class="tab' + (t.startsWith("*") ? " on" : "") + '">' + t.replace(/^\*/, "") + "</div>").join("") + "</div>" +
		'<div class="bar"><span style="color:#777;margin-right:10px">◀ ▶ ⟳</span><div class="url">' + url + "</div></div>";
}
function screen(html) {
	document.querySelectorAll(".x-panel,.x-popup,.x-bar,.x-modal,.x-modal-bg,.x-preview,.x-toast,#x-group").forEach(n => n.remove());
	document.getElementById("app").innerHTML = '<div class="scroll" style="top:0">' + html + "</div>";
}

// ---------------------------------------------------------------- dados fictícios
const PROC = "0001234-56.2025.8.16.0001";
const REUS = [
	{ nome: "JOSÉ FICTÍCIO DOS SANTOS", rg: "12.345.678-9", cpf: "123.456.789-00" },
	{ nome: "MARIA EXEMPLO DE SOUZA", rg: "98.765.432-1", cpf: "987.654.321-00" },
];
const MOVS = [
	{ seq: 38, data: "25/09/2026 14:02", ev: "JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA DEFESA", por: "JOÃO EXEMPLO", papel: "Advogado", files: ["Peticao Defesa.pdf"] },
	{ seq: 37, data: "22/09/2026 09:41", ev: "EXPEDIÇÃO DE INTIMAÇÃO", por: "ANA SERVIDORA", papel: "Analista Judiciário", files: [] },
	{ seq: 36, data: "20/09/2026 16:15", ev: "DESPACHO - MERO EXPEDIENTE", por: "JULIANA MAGISTRADA", papel: "Magistrada", files: ["Despacho.pdf"] },
	{ seq: 35, data: "18/09/2026 11:30", ev: "JUNTADA DE MANIFESTAÇÃO DO MINISTÉRIO PÚBLICO", por: "CARLOS PROMOTOR", papel: "Membro(a) do Ministério Público", files: ["Manifestacao MP.pdf", "Anexo - Laudo.pdf"] },
	{ seq: 34, data: "10/09/2026 13:05", ev: "CERTIDÃO", por: "ANA SERVIDORA", papel: "Analista Judiciário", files: ["Certidao de Baixa.pdf"] },
	{ seq: 33, data: "02/09/2026 17:48", ev: "CONCLUSOS PARA DESPACHO", por: "ANA SERVIDORA", papel: "Analista Judiciário", files: [] },
	{ seq: 32, data: "28/08/2026 10:10", ev: "RECEBIDA A DENÚNCIA", por: "JULIANA MAGISTRADA", papel: "Magistrada", files: ["Decisao Recebimento.pdf"] },
];

// ---------------------------------------------------------------- telas do Projudi
const ICONE_BALANCA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0b2545" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="1.3" fill="#0b2545"/><path d="M12 5.3V19.5M8 20.5h8M4.5 7.5h15M4.5 7.5L2 13M4.5 7.5L7 13M19.5 7.5L17 13M19.5 7.5L22 13"/><path fill="#0b2545" d="M1.8 13a2.7 2.2 0 0 0 5.4 0zM16.8 13a2.7 2.2 0 0 0 5.4 0z"/></svg>';
function pjHeader() {
	return '<div class="pj-header"><div class="pj-logo">PROJUDI<small>Processo Judicial Digital</small></div>' +
		'<div class="pj-user">Usuário: ANA SERVIDORA · Atribuição: Analista Judiciário · <u>Sair</u><br><span id="areaatuacao">Vara Criminal de Exemplo</span></div><div id="x-menuicon" title="Menu da extensão">' + ICONE_BALANCA + '<span class="dot" hidden></span></div></div>' +
		'<div class="pj-menu"><span>Início</span><span>Processos</span><span>Citações/Intimações</span><span>Busca</span><span>Análises</span><span>Relatórios</span><span>Outros</span></div>';
}

const ABAS = [["gerais", "Informações Gerais"], ["adicionais", "Informações Adicionais"], ["partes", "Partes e Outros"], ["mov", "Movimentações"], ["apens", "Apensamentos"], ["vinc", "Vínculos"], ["nav", "Navegação"]];

function movRows(o) {
	return MOVS.map((m, i) => {
		const hasF = m.files.length > 0;
		const open = hasF && o.expanded;
		const files = open ? '<div class="pj-files">' + m.files.map(f => '<div>' + (o.checks ? '<input type="checkbox" class="x-chk">' : "") + '<a class="link doc" data-f="' + f + '">' + f + "</a></div>").join("") + "</div>" : "";
		return '<tr id="mov1Grau,' + m.seq + '" class="' + (i % 2 ? "alt" : "") + '" data-papel="' + m.papel + '"><td>' + m.seq + "</td><td>" + m.data + '</td><td>' + (hasF ? '<span class="pj-plus">' + (open ? "−" : "+") + "</span>" : "") + '<span class="ev">' + m.ev + "</span>" + files + '</td><td>' + m.por + '<span class="papel">' + m.papel + "</span></td></tr>";
	}).join("");
}

function telaProcesso(o = {}) {
	o = Object.assign({ tab: "mov", ext: true, expanded: false, checks: false, pend: true }, o);
	browser(["*Projudi - Processo " + PROC, "WhatsApp"].slice(0, o.tabs || 1), "https://projudi.tjpr.jus.br/projudi/processo.do?_tj=8f2a…");
	let conteudo = "";
	if (o.tab === "mov") {
		conteudo =
			(o.pend ? '<fieldset class="pj-fieldset" id="quadroPendencias"><legend>Pendências</legend><table class="pj-pend">' +
				'<tr><td class="l">Análise de Juntadas:</td><td><a class="link" id="pend-juntada">Há 2 pendência(s) de análise de juntada</a><span id="slot-juntada"></span></td></tr>' +
				'<tr><td class="l">Análise de Conclusão:</td><td><a class="link" id="pend-conclusao">Há 1 pendência(s) de conclusão</a><span id="slot-conclusao"></span></td></tr>' +
				'<tr><td class="l">Intimações:</td><td><a class="link" id="pend-decurso">Há 2 intimação(ões) aguardando análise de decurso de prazo</a><span id="slot-decurso"></span></td></tr>' +
				'<tr><td colspan="2" id="slot-expandir">' + (o.ext ? '<button class="x-btn small" id="x-expandir">Expandir movimentações</button> <span class="x-btn small" id="x-ocultar">(Des)ocultar sem arquivo (+) <span style="border-left:1px solid #999;padding-left:6px;margin-left:4px"><input type="checkbox" id="x-sempre" style="margin:0 3px 0 0;vertical-align:middle">sempre</span></span>' : "") + "</td></tr>" +
				"</table></fieldset>" : "") +
			'<table class="pj-table" id="movs"><tr><th style="width:44px">Seq.</th><th style="width:120px">Data</th><th>Evento</th><th style="width:260px">Movimentado Por</th></tr>' + movRows(o) + "</table>";
	} else if (o.tab === "gerais") {
		conteudo = '<table class="pj-info" style="margin-top:10px" id="tab-gerais">' +
			'<tr><td class="l">Processo:</td><td>' + (o.apenso ? "0005678-90.2025.8.16.0001" : PROC) + "</td></tr>" +
			'<tr><td class="l">Sequencial:</td><td>' + (o.apenso ? "45311" : "45054") + "</td></tr>" +
			(o.apenso ? '<tr id="row-principal"><td class="l">Processo Principal:</td><td><a class="link">' + PROC + "</a></td></tr>" : "") +
			'<tr><td class="l">Classe Processual:</td><td>' + (o.apenso ? "Incidente de Insanidade Mental" : "Ação Penal - Procedimento Ordinário") + "</td></tr>" +
			'<tr><td class="l">Juízo:</td><td>Vara Criminal de Exemplo</td></tr>' +
			'<tr><td class="l">Distribuição:</td><td>12/05/2025</td></tr></table>';
	} else if (o.tab === "partes") {
		conteudo = '<h4 style="margin:10px 0 4px;color:#0d3560">Réu</h4><table class="pj-table"><tr><th>Nome</th><th>RG</th><th>CPF/CNPJ</th><th>Advogado(s)</th></tr>' +
			REUS.map((r, i) => '<tr class="' + (i ? "alt" : "") + '"><td><a class="link">' + r.nome + "</a></td><td>" + r.rg + "</td><td>" + r.cpf + "</td><td>JOÃO EXEMPLO (OAB/PR 00000)</td></tr>").join("") +
			'</table><h4 style="margin:10px 0 4px;color:#0d3560">Vítima</h4><table class="pj-table"><tr><th>Nome</th><th>RG</th><th>CPF/CNPJ</th><th>Advogado(s)</th></tr><tr><td><a class="link">PEDRO VÍTIMA EXEMPLO</a></td><td>—</td><td>—</td><td>—</td></tr></table>' +
			'<div class="pj-btnbar"><span class="pj-btn">Partes e Outros</span><span class="pj-btn">Advogados</span><span class="pj-btn">Histórico de Substabelecimentos</span><span class="pj-btn">Desmembrar</span></div>';
	} else if (o.tab === "adicionais") {
		conteudo = '<table class="pj-info" style="margin-top:10px"><tr><td class="l">Suspensões:</td><td><a class="link">Art. 366 do CPP - ' + REUS[0].nome + ' - ATIVA</a></td></tr>' +
			'<tr><td class="l">Medidas Cautelares (Ex. Monitoração Eletrônica):</td><td><a class="link">Processo com Medida Cautelar</a></td></tr>' +
			'<tr><td class="l">Depósitos/Alvarás Eletrônicos - Integração CEF:</td><td><a class="link">Há 2 depósitos cadastrados (clique para visualizar)</a></td></tr></table>';
	}
	screen(pjHeader() + '<div class="pj-body">' +
		'<div class="pj-title">Processo <em class="attention">' + (o.apenso ? "0005678-90.2025.8.16.0001" : PROC) + '</em><span class="dias">(412 dia(s) em tramitação)</span><span id="hdr-cards" style="display:inline-flex;gap:6px"></span></div>' +
		'<table class="pj-info" id="info"><tr><td class="l">Classe Processual:</td><td>Ação Penal - Procedimento Ordinário</td><td class="l">Juízo:</td><td>Vara Criminal de Exemplo</td></tr>' +
		'<tr id="row-assunto"><td class="l">Assunto Principal:</td><td colspan="3">Furto Qualificado (Art. 155, § 4º, CP)</td></tr></table>' +
		'<div class="pj-tabs">' + ABAS.map(([k, n]) => '<span class="pj-tab' + (k === o.tab ? " on" : "") + '" data-tab="' + k + '">' + n + "</span>").join("") + "</div>" +
		conteudo +
		'<div class="pj-btnbar" id="btnbar"><span class="pj-btn">Pedido Incidental</span><span class="pj-btn" id="nat-juntar">Juntar Documento</span><span class="pj-btn">Peticionar</span><span class="pj-btn">Patronato</span><span class="pj-btn">Navegar</span><span class="pj-btn">Exportar Processo</span><span class="pj-btn">Voltar</span></div>' +
		"</div>");
	if (o.ext) extGroup(o);
}

// Grupo flutuante da extensão (canto inferior direito).
const GRUPOS = ["Concluso", "Remessa", "Ordenações", "Partes", "Suspender", "Transitar", "Arquivar", "🏦 Alvará Eletrônico", "Outras"];
function extGroup(o = {}) {
	document.querySelectorAll("#x-group").forEach(n => n.remove());
	const g = add('<div id="x-group"></div>');
	g.innerHTML =
		'<div class="line" id="x-line-grupos"' + (o.acoesAbertas ? "" : ' style="display:none"') + ">" + GRUPOS.map(n => '<span class="x-btn" data-g="' + n + '">' + n + "</span>").join("") + "</div>" +
		'<div class="line"><span class="x-btn" id="x-toggle">' + (o.acoesAbertas ? "▾" : "▸") + ' Ações</span><span class="x-btn" id="x-fav">⭐ Minhas Preferências</span><span class="x-btn" id="x-clip">📋 Processo copiado</span><span class="x-btn" id="x-adv">⚖️ (Des)Habilitar Advogado</span><span class="x-btn" id="x-partes">👥 Editar Partes/Outros</span><span class="x-btn" id="x-juntar">📎 Juntar Documento</span><span class="x-btn" id="x-destacar">🖍️ Destacar movimentações</span><span class="x-btn" id="x-combos">🔗 Combos</span><span class="x-btn" id="x-oraculo">Oráculo</span></div>' +
		'<div class="line"><span class="x-btn" id="x-whats">📱 Enviar por WhatsApp</span><span class="x-btn" id="x-email">✉️ Enviar por e-mail</span><span class="x-btn" id="x-email-menu" style="margin-left:-3px">▼</span><span class="x-btn small" id="x-mover" style="align-self:center">↕ Mover</span><span class="x-btn small" id="x-ocultarbtns" style="align-self:center">Ocultar</span></div>';
}
function setAcoesAbertas(v) {
	$("#x-line-grupos").style.display = v ? "" : "none";
	$("#x-toggle").textContent = (v ? "▾" : "▸") + " Ações";
}

// Documento simulado (conteúdo de um PDF).
function docPage(titulo, paragrafos) {
	return '<div class="pg"><h5>PODER JUDICIÁRIO DO ESTADO DO PARANÁ</h5><h5 style="font-weight:normal">Vara Criminal de Exemplo</h5><h5 style="font-weight:normal">Autos nº ' + PROC + "</h5><h3>" + titulo + "</h3>" +
		paragrafos.map(p => "<p>" + p + "</p>").join("") + '<p style="text-align:center;margin-top:30px">Documento assinado digitalmente<br>(conteúdo fictício)</p></div>';
}
const TXT = {
	"Certidao de Baixa.pdf": ["CERTIDÃO", ["Certifico, para os devidos fins, que procedi à baixa dos registros determinados nos autos em epígrafe, conforme decisão de seq. 32.", "O referido é verdade e dou fé."]],
	"Despacho.pdf": ["DESPACHO", ["1. Intime-se a defesa para, no prazo de 10 (dez) dias, apresentar resposta à acusação.", "2. Após, vista ao Ministério Público.", "3. Diligências necessárias."]],
	"Peticao Defesa.pdf": ["MANIFESTAÇÃO DA DEFESA", ["O acusado, por seu advogado, vem respeitosamente à presença de Vossa Excelência apresentar manifestação.", "Requer a juntada dos documentos anexos e o regular prosseguimento do feito."]],
	"Manifestacao MP.pdf": ["MANIFESTAÇÃO DO MINISTÉRIO PÚBLICO", ["O Ministério Público manifesta-se pelo prosseguimento do feito."]],
	"Decisao Recebimento.pdf": ["DECISÃO", ["Presentes os requisitos do art. 41 do CPP, recebo a denúncia.", "Cite-se o acusado para responder à acusação."]],
};
function preview(file, x, y, w, h) {
	const [t, ps] = TXT[file] || ["DOCUMENTO", ["Conteúdo fictício."]];
	const p = add('<div class="x-preview"><div class="hd"><span class="t">📄 ' + file + '</span><span>Abrir em nova aba</span><span>✕</span></div>' + docPage(t, ps) + "</div>");
	Object.assign(p.style, { left: x + "px", top: y + "px" });
	if (w) p.style.width = w + "px";
	if (h) p.style.height = h + "px";
	return p;
}

// Popup da extensão (o mesmo das "Ações rápidas") com um diálogo do Projudi dentro.
function popup(titulo, corpo, o = {}) {
	const p = add('<div class="x-popup"><div class="hd"><span>' + (o.hd || "Ações rápidas — " + titulo) + '</span><span id="x-fechar">✕ Fechar</span></div><div class="bd"><div class="x-dlg-title">' + titulo + '</div><div style="padding:12px 16px">' + corpo + "</div></div></div>");
	if (o.h) p.style.height = o.h + "px";
	if (o.top) p.style.top = o.top + "px";
	return p;
}
function bar(html, o = {}) {
	const b = add('<div class="x-bar ' + (o.cls || "") + '">' + html + "</div>");
	const top = o.top ?? 76;
	b.style.top = top + "px";
	if (top < 300) b.dataset.topo = "1";
	return b;
}
function panelAt(html, anchor, o = {}) {
	const p = add('<div class="x-panel">' + html + "</div>");
	if (o.w) p.style.width = o.w + "px";
	const r = $(anchor).getBoundingClientRect();
	const ph = p.getBoundingClientRect().height;
	p.style.left = Math.max(10, Math.min(1270 - p.getBoundingClientRect().width, r.right - p.getBoundingClientRect().width)) + "px";
	p.style.top = Math.max(50, r.top - ph - 8) + "px";
	return p;
}
function modal(html, o = {}) {
	if (o.bg !== false) add('<div class="x-modal-bg"></div>');
	const m = add('<div class="x-modal">' + html + "</div>");
	m.style.width = (o.w || 460) + "px";
	m.style.left = (o.left ?? (1280 - (o.w || 460)) / 2) + "px";
	m.style.top = (o.top || 150) + "px";
	return m;
}
function closeModal() {
	document.querySelectorAll(".x-modal,.x-modal-bg").forEach(n => n.remove());
}
function toast(html, o = {}) {
	const t = add('<div class="x-toast">' + html + "</div>");
	Object.assign(t.style, { left: (o.left ?? 20) + "px", top: o.top != null ? o.top + "px" : "", bottom: o.bottom != null ? o.bottom + "px" : "" });
	return t;
}

// Tela de listagem (Análise de Juntadas / Retorno de Conclusão / Decurso de Prazo).
const LISTA = [
	{ n: "0001111-11.2025.8.16.0001", seq: "45017", cl: "Ação Penal - Proc. Ordinário", d: "24/09/2026" },
	{ n: "0002222-22.2025.8.16.0001", seq: "45027", cl: "Inquérito Policial", d: "24/09/2026" },
	{ n: "0003333-33.2024.8.16.0001", seq: "44983", cl: "Ação Penal - Proc. Sumário", d: "23/09/2026" },
	{ n: "0004444-44.2024.8.16.0001", seq: "44997", cl: "Execução de Medidas Alternativas", d: "23/09/2026" },
	{ n: "0005555-55.2025.8.16.0001", seq: "45102", cl: "Medidas Protetivas de Urgência", d: "22/09/2026" },
	{ n: "0006666-66.2025.8.16.0001", seq: "45107", cl: "Ação Penal - Proc. Ordinário", d: "22/09/2026" },
];
function telaLista(titulo, o = {}) {
	browser(["*Projudi - " + titulo], "https://projudi.tjpr.jus.br/projudi/processo/" + (o.path || "analisarJuntada.do"));
	screen(pjHeader() + '<div class="pj-body"><div class="pj-h2">' + titulo + '</div>' +
		'<fieldset class="pj-fieldset"><legend>Filtros</legend><table class="pj-form" id="filtros"><tr><td class="l">Classe Processual:</td><td><span class="pj-select">Todas</span></td>' +
		'<td class="l" style="width:auto">Data Inicial:</td><td><span class="pj-input">01/09/2026</span></td>' +
		(o.seqField ? '<td class="l" style="width:auto;background:#fff8d8">Sequencial:</td><td style="background:#fff8d8"><span class="pj-input" id="f-seq" style="min-width:34px"></span></td>' : "") +
		'<td><span class="pj-btn primary" id="f-filtrar">Filtrar</span></td></tr></table></fieldset>' +
		'<div id="slot-legenda"></div>' +
		'<table class="pj-table" id="lista"><tr><th style="width:30px"></th><th>Processo</th><th>Classe Processual</th><th>' + (o.col || "Juntada em") + "</th></tr>" +
		(o.rows || LISTA).map((r, i) => '<tr class="' + (i % 2 ? "alt" : "") + '" data-i="' + i + '"><td><input type="checkbox"></td><td><a class="link">' + r.n + '</a><span class="x-rowslot"></span><br><span style="color:#555;font-size:11px">Seq.: ' + r.seq + "</span></td><td>" + r.cl + "</td><td>" + r.d + "</td></tr>").join("") +
		'</table><div id="paginacao" style="margin-top:6px;font-size:12px;color:#333">' + (o.pag || "Página 1 de 5 · ‹ 1 2 3 4 5 ›") + "</div></div>");
}
