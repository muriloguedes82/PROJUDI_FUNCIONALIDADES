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
//    ordenação (peça, processo, parte, CPF), com os botões "Buscar CPF em
//    Pessoas" e "Buscar CPF em Peças";
// 2. na PRIMEIRA vez que a janela chega ao BNMP 3 depois de um clique no
//    logotipo da ordenação, faz sozinho a busca do CPF em Pessoas: vai para
//    /pessoas (clicando no link do menu, sem recarregar), marca o filtro
//    "CPF", digita o CPF, pesquisa e destaca a linha da pessoa encontrada;
// 3. registra no console (F12), a cada troca de tela, o endereço e os
//    botões/links visíveis ("[Projudi BNMP portal]"), para as próximas
//    etapas da automação.
//
// Estrutura das telas confirmada a partir de .mhtml salvos (bnmp.pdpj.jus.br,
// /pessoas e /pecas): menu lateral com <a href="https://bnmp.pdpj.jus.br/
// pessoas" aria-label="Ir para Pessoas">; filtro em <div class=
// "uikit-finder"> com <section class="radio-group-more-filter"> de
// <mat-checkbox> ("CPF", "RJI", "NOME" em Pessoas; "CPF", "RJI", "Nº PEÇA",
// "NOME DA PESSOA" em Peças; marcado = classe `mat-checkbox-checked`), um
// <input matinput data-placeholder="Pesquisar"> e o <button class=
// "btn-search">; resultados em <tr class="mat-row"> com <td class="mat-cell
// cdk-column-cpf"> (Pessoas) / "cdk-column-cpf" e "cdk-column-nomePessoa"
// (Peças), CPF formatado "000.000.000-00".
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
			["Peça", ctx.tipoDocumento],
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
		if (location.host === APP_HOST && ctx.cpf) {
			const botoes = document.createElement("div");
			botoes.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;";
			[
				["Buscar CPF em Pessoas", "/pessoas"],
				["Buscar CPF em Peças", "/pecas"],
			].forEach(function (par) {
				const bt = document.createElement("button");
				bt.type = "button";
				bt.textContent = par[0];
				bt.style.cssText = "font:12px Arial,Helvetica,sans-serif;padding:3px 8px;border:1px solid #b09a3a;border-radius:3px;background:#fff;cursor:pointer;";
				bt.addEventListener("click", function () {
					executarBusca(par[1], ctx);
				});
				botoes.appendChild(bt);
			});
			corpo.appendChild(botoes);
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
					if (location.host !== APP_HOST || !ctx.cpf) return;
					// Busca automática só uma vez por clique no logotipo (cada
					// clique grava um `criadoEm` novo).
					const chave = "pdpBnmpBuscaAuto:" + ctx.criadoEm;
					try {
						if (sessionStorage.getItem(chave)) return;
						sessionStorage.setItem(chave, "1");
					} catch (err) {
						// sem sessionStorage — busca assim mesmo
					}
					executarBusca("/pessoas", ctx);
				});

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
