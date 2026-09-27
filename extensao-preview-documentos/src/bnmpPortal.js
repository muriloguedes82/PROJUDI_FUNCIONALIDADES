// Portal do BNMP 3 aberto pelo botão do BNMP 3 da ordenação no Projudi (ver
// bnmp3Popup.js)
//
// O link do Projudi aponta para `portalbnmp.cnj.jus.br/bnmpportal/api/
// pessoas/cpf/<CPF>`; o BNMP 3 em si fica em `bnmp.pdpj.jus.br` (aplicação
// Angular de página única: /pagina-inicial, /pecas, /pessoas, /parte,
// /eventos). Este script roda nos dois domínios; os dados da ordenação são
// guardados por ABA (background.js), então continuam valendo depois dos
// redirecionamentos e do login do PDPJ. Só age na janela que a própria
// extensão abriu a partir de uma ordenação; em qualquer outra aba do
// portal, não faz nada.
//
// O que faz:
// 1. mostra, num quadro no canto inferior direito (recolhível), os dados da
//    ordenação (peça, processo, parte, CPF), com os botões "Incluir Peça" e
//    "Incluir Evento" (na tela da parte) e "Buscar CPF em Pessoas"/"Buscar
//    CPF em Peças";
// 2. o link do Projudi sempre leva à TELA DA PARTE (/parte/visualizar/<id>).
//    Na primeira vez que a janela chega a essa tela depois de um clique no
//    logotipo da ordenação, a extensão clica sozinha:
//    - em "Incluir Peça" (pasta com seta, `fa-file-import`, ao lado do olho)
//      quando a ordenação é de uma PEÇA (Mandado de Prisão, Alvará de
//      Soltura, guias etc.);
//    - em "Incluir Evento" (4º ícone, `fa-list`, ao lado do lápis de
//      "Editar Pessoa") quando a ordenação é de um dos 7 EVENTOS do BNMP 3
//      (ver EVENTOS);
//    em seguida, confirma (OK) o aviso "Prezado Usuário" que o BNMP 3
//    sempre mostra ("Você está prestes a emitir uma peça/evento...") e
//    escolhe o tipo: no caso de evento, na lista "Tipo de evento" da tela
//    /eventos/incluir/rji/<RJI>; no caso de peça, no campo "Tipo de peça"
//    (autocompletar) da tela /pecas/nova-peca/incluir/rji/<RJI>, digitando o
//    tipo de documento da ordenação e escolhendo a sugestão idêntica (ou a
//    única compatível) — sem certeza, deixa as sugestões abertas;
// 3. registra no console (F12), a cada troca de tela, o endereço e os
//    botões/links visíveis ("[Projudi BNMP portal]").
//
// Estrutura das telas confirmada a partir de .mhtml salvos (bnmp.pdpj.jus.br):
// - tela da parte: <div class="icon d-flex justify-content-end"> com <a> na
//   ordem: olho (`far fa-eye`), <a mattooltip="Incluir Peça"><i class="fas
//   fa-file-import">, <a mattooltip="Editar Pessoa"><i class="fas
//   fa-pencil-alt">, <a mattooltip="Incluir Evento"><i class="fas fa-list">,
//   "Desativar Pessoa", "Histórico", "Imprimir", "Download", "Atualizar
//   Status" (os <a> não têm href; o Angular trata o clique);
// - /pessoas e /pecas: menu lateral com <a href="https://bnmp.pdpj.jus.br/
//   pessoas" aria-label="Ir para Pessoas">; filtro em <div class=
//   "uikit-finder"> com <section class="radio-group-more-filter"> de
//   <mat-checkbox> ("CPF", "RJI", "NOME"...; marcado = classe
//   `mat-checkbox-checked`), um <input matinput data-placeholder=
//   "Pesquisar"> e o <button class="btn-search">; resultados em <tr
//   class="mat-row"> com <td class="mat-cell cdk-column-cpf"> (CPF
//   formatado "000.000.000-00");
// - /eventos: tipos de evento na coluna "Evento" (ex.: "Audiência de
//   Custódia e Análise de Prisão", "Auto de Prisão em Flagrante",
//   "Averbação da alteração do prazo de validade...", "Transferência de
//   documentos para outras unidades judiciárias").
(function () {
	"use strict";
	if (window.top !== window) return;
	if (window.__pdpBnmpPortal) return;
	window.__pdpBnmpPortal = true;

	const TAG = "[Projudi BNMP portal]";
	const QUADRO_ID = "pdp-bnmp-portal-quadro";
	const DESTAQUE_ATTR = "data-pdp-bnmp-cpf";
	const APP_HOST = "bnmp.pdpj.jus.br";
	const ESPERA_MS = 30000;

	// Os 7 tipos de evento do BNMP 3 (lista "Tipo de evento" da tela
	// /eventos/incluir/rji/<RJI>, confirmada por .mhtml). `ordenacao` é
	// comparado com o "Tipo de Documento" da ordenação do Projudi e `opcao`
	// com o texto da opção da lista, ambos sem acentos/maiúsculas. Qualquer
	// tipo de documento que não case com nenhum deles é tratado como peça.
	const EVENTOS = [
		{ nome: "Fuga", ordenacao: /\bfuga\b/, opcao: /^fuga$/ },
		{ nome: "Auto de Prisão em Flagrante", ordenacao: /auto de prisao em flagrante/, opcao: /^auto de prisao em flagrante$/ },
		{ nome: "Evasão", ordenacao: /\bevasao\b/, opcao: /^evasao$/ },
		{ nome: "Saída temporária", ordenacao: /saida temporaria/, opcao: /^saida temporaria$/ },
		{
			nome: "Transferência de documentos para outras unidades judiciárias",
			ordenacao: /transferencia de documentos?\b/,
			opcao: /^transferencia de documentos/,
		},
		{ nome: "Alteração Unidade Prisional", ordenacao: /alteracao (de |da )?unidade prisional/, opcao: /^alteracao (de |da )?unidade prisional$/ },
		{ nome: "Audiência de Custódia e Análise de Prisão", ordenacao: /audiencia de custodia/, opcao: /^audiencia de custodia/ },
	];

	// Ícones da tela da parte: tooltip, classe do ícone e posição (1 = olho).
	const ACOES = {
		peca: { rotulo: "Incluir Peça", icone: "fa-file-import", posicao: 2 },
		evento: { rotulo: "Incluir Evento", icone: "fa-list", posicao: 4 },
	};

	function collapse(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	function normalize(text) {
		return collapse(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function soDigitos(text) {
		return String(text || "").replace(/\D/g, "");
	}

	function cpfFormatado(cpf) {
		return String(cpf || "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
	}

	function visivel(el) {
		return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
	}

	function esperar(fn, timeout) {
		return new Promise(function (resolve, reject) {
			const fim = Date.now() + (timeout || ESPERA_MS);
			(function tentar() {
				let r = null;
				try {
					r = fn();
				} catch (err) {
					r = null;
				}
				if (r) return resolve(r);
				if (Date.now() > fim) return reject(new Error("tempo esgotado"));
				setTimeout(tentar, 250);
			})();
		});
	}

	function pausa(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	// ---------------------------------------------------------------------
	// Busca por CPF (Pessoas ou Peças)
	// ---------------------------------------------------------------------

	function irPara(caminho) {
		if (location.pathname === caminho) return Promise.resolve();
		const link = Array.prototype.find.call(document.querySelectorAll("a[href]"), function (a) {
			try {
				const u = new URL(a.href);
				return u.host === APP_HOST && u.pathname === caminho;
			} catch (err) {
				return false;
			}
		});
		if (link) link.click();
		else location.assign("https://" + APP_HOST + caminho);
		return esperar(function () {
			return location.pathname === caminho;
		});
	}

	function filtroVisivel() {
		return Array.prototype.find.call(document.querySelectorAll(".uikit-finder"), visivel) || null;
	}

	// Digita no <input> do Angular: valor pelo setter nativo + evento "input",
	// que é o que o formulário reativo escuta.
	function digitar(input, valor) {
		input.focus();
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
		setter.call(input, valor);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}

	function linhaDoCpf(cpf) {
		const alvo = soDigitos(cpf);
		return Array.prototype.filter.call(document.querySelectorAll("tr.mat-row"), function (tr) {
			const td = tr.querySelector("td.cdk-column-cpf");
			return td && soDigitos(td.textContent) === alvo;
		});
	}

	// Destaca as linhas do CPF da ordenação. Chamado também a cada mudança
	// na tela, porque o Angular redesenha a tabela (e perde o destaque) ao
	// receber o resultado da busca ou trocar de página.
	function destacar(cpf) {
		const linhas = linhaDoCpf(cpf);
		linhas.forEach(function (tr) {
			if (tr.hasAttribute(DESTAQUE_ATTR)) return;
			tr.setAttribute(DESTAQUE_ATTR, "");
			tr.style.outline = "3px solid #e0a800";
			tr.style.outlineOffset = "-3px";
		});
		return linhas;
	}

	async function buscarCpf(caminho, cpf) {
		if (!/^\d{11}$/.test(cpf || "")) throw new Error("a ordenação não trouxe um CPF válido");
		await irPara(caminho);
		const finder = await esperar(filtroVisivel);
		await pausa(300);

		const opcao = Array.prototype.find.call(finder.querySelectorAll("mat-checkbox"), function (cb) {
			return normalize(cb.textContent) === "cpf";
		});
		if (!opcao) throw new Error('filtro "CPF" não encontrado');
		if (!opcao.classList.contains("mat-checkbox-checked")) {
			(opcao.querySelector("label") || opcao).click();
			await pausa(300);
		}

		const input = await esperar(function () {
			const i = filtroVisivel() && filtroVisivel().querySelector("input.mat-input-element");
			return visivel(i) ? i : null;
		});
		digitar(input, cpf);
		await pausa(200);
		const botao = filtroVisivel().querySelector("button.btn-search");
		if (botao) botao.click();
		else input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));

		// Dá tempo de o resultado chegar antes de procurar a linha (a lista
		// anterior à busca pode já trazer o mesmo CPF).
		await pausa(1500);
		const linhas = await esperar(function () {
			const l = destacar(cpf);
			return l.length ? l : null;
		}, 20000).catch(function () {
			return [];
		});
		if (linhas[0]) linhas[0].scrollIntoView({ block: "center" });
		console.info(TAG, "busca do CPF em", caminho, "—", linhas.length, "linha(s) encontrada(s)");
		return linhas.length;
	}

	// ---------------------------------------------------------------------
	// Tela da parte: "Incluir Peça" / "Incluir Evento"
	// ---------------------------------------------------------------------

	function eventoDaOrdenacao(ctx) {
		const tipo = normalize(ctx.tipoDocumento);
		return (
			(tipo &&
				EVENTOS.find(function (ev) {
					return ev.ordenacao.test(tipo);
				})) ||
			null
		);
	}

	function tipoDaOrdenacao(ctx) {
		if (!normalize(ctx.tipoDocumento)) return null;
		return eventoDaOrdenacao(ctx) ? "evento" : "peca";
	}

	function naTelaDaParte() {
		return location.host === APP_HOST && /^\/parte\/visualizar\//.test(location.pathname);
	}

	function iconeDaAcao(acao) {
		const def = ACOES[acao];
		const porTooltip = Array.prototype.find.call(document.querySelectorAll("a[mattooltip], button[mattooltip]"), function (el) {
			return normalize(el.getAttribute("mattooltip")) === normalize(def.rotulo) && visivel(el);
		});
		if (porTooltip) return porTooltip;
		const porIcone = document.querySelector("div.icon a > i." + def.icone);
		if (porIcone && visivel(porIcone.parentElement)) return porIcone.parentElement;
		// Último recurso: posição na barra de ícones, conferindo que o 1º é o olho.
		const barra = document.querySelector("div.icon.d-flex");
		const links = barra ? barra.querySelectorAll(":scope > a") : [];
		if (links.length >= def.posicao && links[0].querySelector(".fa-eye")) return links[def.posicao - 1];
		return null;
	}

	// Aviso que o BNMP 3 sempre mostra depois de "Incluir Peça"/"Incluir
	// Evento" (confirmado por .mhtml): <mat-dialog-container> com
	// <app-alerta-dialog>, título "Prezado Usuário", texto "Você está prestes
	// a emitir uma peça/evento para a unidade judiciária ..." e os botões
	// <button class="btn-cancelar">CANCELAR</button> e <button
	// class="btn-confirmar">OK</button>. Só este aviso é confirmado.
	function avisoDeEmissao() {
		const dialogos = document.querySelectorAll("mat-dialog-container");
		for (const d of dialogos) {
			if (!/prestes a emitir/.test(normalize(d.textContent))) continue;
			const ok = d.querySelector("button.btn-confirmar") ||
				Array.prototype.find.call(d.querySelectorAll("button"), function (b) {
					return normalize(b.textContent) === "ok";
				});
			if (ok && visivel(ok)) return ok;
		}
		return null;
	}

	function selectTipoEvento() {
		if (!/^\/eventos\/incluir\b/.test(location.pathname)) return null;
		const sel = document.querySelector('mat-select[name="tipoEvento"]') || document.querySelector("mat-form-field.tipo-evento mat-select");
		return visivel(sel) ? sel : null;
	}

	// Escolhe o evento da ordenação na lista "Tipo de evento" (mat-select do
	// Angular Material: abre a lista clicando no gatilho e clica na
	// <mat-option>, que é criada num overlay fora do formulário).
	async function escolherEvento(evento) {
		const sel = await esperar(selectTipoEvento);
		const atual = sel.querySelector(".mat-select-value");
		if (atual && evento.opcao.test(normalize(atual.textContent))) return;
		(sel.querySelector(".mat-select-trigger") || sel).click();
		const opcao = await esperar(function () {
			return Array.prototype.find.call(document.querySelectorAll("mat-option"), function (o) {
				return visivel(o) && evento.opcao.test(normalize(o.textContent));
			});
		}, 10000);
		opcao.click();
	}

	// Campo "Tipo de peça" da tela /pecas/nova-peca/incluir/rji/<RJI>
	// (confirmado por .mhtml): <mat-form-field> com <mat-label>Tipo de
	// peça</mat-label> e um <input matinput role="combobox" class="...
	// mat-autocomplete-trigger"> ligado a um <mat-autocomplete>; as opções
	// (<mat-option>) só existem num overlay depois de digitar/abrir o campo.
	function inputTipoPeca() {
		if (!/^\/pecas\/nova-peca\/incluir\b/.test(location.pathname)) return null;
		for (const campo of document.querySelectorAll("mat-form-field")) {
			const rotulo = campo.querySelector("mat-label, label");
			if (!rotulo || normalize(rotulo.textContent) !== "tipo de peca") continue;
			const input = campo.querySelector("input.mat-autocomplete-trigger, input[role='combobox'], input");
			if (visivel(input)) return input;
		}
		return null;
	}

	function opcoesVisiveis() {
		return Array.prototype.filter.call(document.querySelectorAll("mat-option"), visivel);
	}

	// Escolhe a opção só quando há certeza: texto idêntico ao tipo de
	// documento da ordenação (sem acentos/maiúsculas) ou, na falta dele, uma
	// ÚNICA opção que começa com o tipo (ou em que o tipo começa).
	function opcaoDaPeca(tipo, opcoes) {
		const alvo = normalize(tipo);
		const exata = opcoes.find(function (o) {
			return normalize(o.textContent) === alvo;
		});
		if (exata) return exata;
		const parecidas = opcoes.filter(function (o) {
			const t = normalize(o.textContent);
			return t.indexOf(alvo) === 0 || alvo.indexOf(t) === 0;
		});
		return parecidas.length === 1 ? parecidas[0] : null;
	}

	async function escolherPeca(tipo) {
		const input = await esperar(inputTipoPeca);
		input.focus();
		input.click();
		digitar(input, tipo);
		// Espera as sugestões assentarem (o filtro pode vir do servidor).
		let opcoes = [];
		const fim = Date.now() + 10000;
		let anterior = -1;
		let estavel = 0;
		while (Date.now() < fim) {
			await pausa(300);
			opcoes = opcoesVisiveis();
			if (opcoes.length && opcoes.length === anterior) estavel++;
			else estavel = 0;
			anterior = opcoes.length;
			if (estavel >= 2) break;
		}
		console.info(TAG, "sugestões de \"Tipo de peça\" para", tipo + ":", opcoes.map(function (o) { return collapse(o.textContent); }));
		const escolhida = opcaoDaPeca(tipo, opcoes);
		if (!escolhida) {
			throw new Error(opcoes.length ? "nenhuma sugestão corresponde com certeza" : "o BNMP 3 não sugeriu nenhum tipo");
		}
		const nome = collapse(escolhida.textContent);
		escolhida.click();
		return nome;
	}

	async function clicarAcao(acao, evento, tipoPeca) {
		const def = ACOES[acao];
		status('Abrindo "' + def.rotulo + '"…');
		let el;
		try {
			el = await esperar(function () {
				return naTelaDaParte() && iconeDaAcao(acao);
			});
		} catch (err) {
			status('Não encontrei o botão "' + def.rotulo + '" na tela da parte.');
			console.warn(TAG, "botão não encontrado:", def.rotulo, err);
			return;
		}
		el.click();
		console.info(TAG, "clicado:", def.rotulo);

		try {
			const ok = await esperar(avisoDeEmissao, 10000);
			ok.click();
			console.info(TAG, 'aviso "Prezado Usuário" confirmado (OK)');
		} catch (err) {
			// Sem o aviso (ou já fechado): segue.
			console.info(TAG, 'aviso "Prezado Usuário" não apareceu');
		}

		if (acao === "peca") {
			if (!tipoPeca) {
				status('"' + def.rotulo + '" aberto pela extensão.');
				return;
			}
			status('Escolhendo o tipo de peça "' + tipoPeca + '"…');
			try {
				const nome = await escolherPeca(tipoPeca);
				status('Tipo de peça "' + nome + '" escolhido pela extensão. Confira e continue o preenchimento.');
				console.info(TAG, "tipo de peça escolhido:", nome);
			} catch (err) {
				status('"Incluir Peça" aberto; escolha o tipo de peça na lista (' + err.message + ").");
				console.warn(TAG, "tipo de peça não escolhido:", tipoPeca, err);
			}
			return;
		}
		if (!evento) {
			status('"' + def.rotulo + '" aberto pela extensão.');
			return;
		}
		status('Escolhendo o evento "' + evento.nome + '"…');
		try {
			await escolherEvento(evento);
			status('Evento "' + evento.nome + '" escolhido pela extensão. Confira e continue o preenchimento.');
			console.info(TAG, "evento escolhido:", evento.nome);
		} catch (err) {
			status('"Incluir Evento" aberto, mas não consegui escolher "' + evento.nome + '" na lista "Tipo de evento".');
			console.warn(TAG, "falha ao escolher o evento:", evento.nome, err);
		}
	}

	// ---------------------------------------------------------------------
	// Quadro com os dados da ordenação
	// ---------------------------------------------------------------------

	let statusEl = null;

	function status(texto) {
		if (statusEl) statusEl.textContent = texto || "";
	}

	function executarBusca(caminho, ctx) {
		const nome = caminho === "/pecas" ? "Peças" : "Pessoas";
		status("Buscando o CPF em " + nome + "…");
		return buscarCpf(caminho, ctx.cpf)
			.then(function (n) {
				status(n ? "CPF encontrado em " + nome + " (linha destacada)." : "Nenhum resultado para o CPF em " + nome + ".");
			})
			.catch(function (err) {
				console.warn(TAG, "busca do CPF falhou:", err);
				status("Não foi possível buscar o CPF em " + nome + ": " + err.message);
			});
	}

	function mostrarQuadro(ctx) {
		if (document.getElementById(QUADRO_ID)) return;
		const quadro = document.createElement("div");
		quadro.id = QUADRO_ID;
		quadro.style.cssText =
			"position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:340px;background:#fffbe6;border:1px solid #c9b458;" +
			"border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.25);font:12px/1.4 Arial,Helvetica,sans-serif;color:#222;";
		const cab = document.createElement("div");
		cab.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;font-weight:bold;cursor:pointer;";
		cab.textContent = "Ordenação do Projudi";
		const seta = document.createElement("span");
		seta.textContent = "▾";
		cab.appendChild(seta);
		const corpo = document.createElement("div");
		corpo.style.cssText = "padding:0 10px 8px;";
		[
			["Documento", ctx.tipoDocumento],
			["Processo", ctx.processo],
			["Parte", ctx.parte],
			["CPF", cpfFormatado(ctx.cpf)],
		].forEach(function (par) {
			if (!par[1]) return;
			const linha = document.createElement("div");
			const b = document.createElement("b");
			b.textContent = par[0] + ": ";
			linha.appendChild(b);
			linha.appendChild(document.createTextNode(par[1]));
			corpo.appendChild(linha);
		});
		const tipo = tipoDaOrdenacao(ctx);
		if (tipo) {
			const linha = document.createElement("div");
			const b = document.createElement("b");
			b.textContent = "No BNMP 3: ";
			linha.appendChild(b);
			const ev = eventoDaOrdenacao(ctx);
			linha.appendChild(document.createTextNode(ev ? "evento — " + ev.nome : "peça"));
			corpo.appendChild(linha);
		}
		if (location.host === APP_HOST) {
			const botoes = document.createElement("div");
			botoes.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;";
			const itens = [
				[ACOES.peca.rotulo, function () { clicarAcao("peca", null, ctx.tipoDocumento); }, naTelaDaParte],
				[ACOES.evento.rotulo, function () { clicarAcao("evento", eventoDaOrdenacao(ctx)); }, naTelaDaParte],
			];
			if (ctx.cpf) {
				itens.push(["Buscar CPF em Pessoas", function () { executarBusca("/pessoas", ctx); }]);
				itens.push(["Buscar CPF em Peças", function () { executarBusca("/pecas", ctx); }]);
			}
			itens.forEach(function (item) {
				const bt = document.createElement("button");
				bt.type = "button";
				bt.textContent = item[0];
				bt.style.cssText = "font:12px Arial,Helvetica,sans-serif;padding:3px 8px;border:1px solid #b09a3a;border-radius:3px;background:#fff;cursor:pointer;";
				if (item[2]) bt.setAttribute("data-so-parte", "");
				bt.addEventListener("click", item[1]);
				botoes.appendChild(bt);
			});
			corpo.appendChild(botoes);
			atualizarBotoes(quadro);
		}
		statusEl = document.createElement("div");
		statusEl.style.cssText = "margin-top:4px;color:#555;";
		corpo.appendChild(statusEl);
		cab.addEventListener("click", function () {
			const aberto = corpo.style.display !== "none";
			corpo.style.display = aberto ? "none" : "";
			seta.textContent = aberto ? "▸" : "▾";
		});
		quadro.appendChild(cab);
		quadro.appendChild(corpo);
		document.body.appendChild(quadro);
	}

	// "Incluir Peça"/"Incluir Evento" só aparecem na tela da parte.
	function atualizarBotoes(quadro) {
		const naParte = naTelaDaParte();
		(quadro || document).querySelectorAll("[data-so-parte]").forEach(function (bt) {
			bt.style.display = naParte ? "" : "none";
		});
	}

	// ---------------------------------------------------------------------
	// Diagnóstico
	// ---------------------------------------------------------------------

	function diagnosticar() {
		const itens = [];
		document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"]').forEach(function (el) {
			if (!visivel(el) || el.closest("#" + QUADRO_ID)) return;
			const texto = collapse(el.value || el.textContent || el.getAttribute("aria-label") || el.getAttribute("mattooltip") || el.getAttribute("title"));
			if (!texto) return;
			itens.push(el.tagName.toLowerCase() + ": " + texto.slice(0, 80) + (el.getAttribute("href") ? " → " + el.getAttribute("href") : ""));
		});
		console.info(TAG, "tela:", location.href, "\n" + itens.slice(0, 150).join("\n"));
	}

	// ---------------------------------------------------------------------
	// Início
	// ---------------------------------------------------------------------

	chrome.runtime
		.sendMessage({ source: "projudi-preview", type: "bnmp3-contexto" })
		.then(function (ctx) {
			if (!ctx) return;
			console.info(TAG, "aberto pela ordenação do Projudi:", ctx);

			// Espera o BNMP 3 montar a tela (menu lateral) antes do quadro e da
			// busca automática.
			esperar(function () {
				return document.body && document.querySelector('a[aria-label^="Ir para"], .uikit-finder, mat-sidenav, app-root *');
			})
				.catch(function () {})
				.then(function () {
					mostrarQuadro(ctx);
					acaoAutomatica();
				});

			// Clique automático em "Incluir Peça"/"Incluir Evento" só uma vez
			// por clique no logotipo (cada clique grava um `criadoEm` novo), e
			// só quando a janela está na tela da parte (depois do login do
			// PDPJ, a chegada pode demorar).
			function acaoAutomatica() {
				if (!naTelaDaParte()) return;
				const tipo = tipoDaOrdenacao(ctx);
				if (!tipo) return;
				const chave = "pdpBnmpAcaoAuto:" + ctx.criadoEm;
				try {
					if (sessionStorage.getItem(chave)) return;
					sessionStorage.setItem(chave, "1");
				} catch (err) {
					if (window.__pdpBnmpAcaoFeita === ctx.criadoEm) return;
				}
				window.__pdpBnmpAcaoFeita = ctx.criadoEm;
				clicarAcao(tipo, eventoDaOrdenacao(ctx), ctx.tipoDocumento);
			}

			// Troca de tela na aplicação de página única: recoloca o quadro se a
			// tela o removeu e registra a tela nova no console.
			let ultimaUrl = location.href;
			let timer = null;
			new MutationObserver(function () {
				if (location.host === APP_HOST && ctx.cpf) destacar(ctx.cpf);
				if (statusEl && !document.getElementById(QUADRO_ID) && document.body) {
					const texto = statusEl.textContent;
					mostrarQuadro(ctx);
					status(texto);
				}
				if (location.href === ultimaUrl) return;
				atualizarBotoes();
				acaoAutomatica();
				clearTimeout(timer);
				timer = setTimeout(function () {
					ultimaUrl = location.href;
					diagnosticar();
				}, 1500);
			}).observe(document.documentElement, { childList: true, subtree: true });
			setTimeout(diagnosticar, 2000);
		})
		.catch(function (err) {
			console.warn(TAG, "sem contato com a extensão:", err);
		});
})();
