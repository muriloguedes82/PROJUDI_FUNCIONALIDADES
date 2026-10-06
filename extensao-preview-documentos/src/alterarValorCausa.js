// Projudi - Atalho "Novo Valor da Causa"
//
// Alterar o valor da causa hoje exige: abrir a aba "Informações Gerais",
// clicar no botão nativo "Alterar" (barra de botões ao final dela), achar o
// campo "Valor da Causa" na tela de alteração do processo
// (processoEdicao.do, formulário processoEdicaoForm, campo id="valorAcao")
// e clicar em "Salvar".
//
// Este recurso mostra a linha "Valor da Causa:" no cabeçalho do processo
// (`table#informacoesProcessuais`, visível em qualquer aba, junto da Classe,
// do Assunto, do Nível de Sigilo...), com o valor lido da aba "Informações
// Gerais" (`__pdpLerAbaProcesso` em habilitarAdvogado.js: o próprio DOM, se
// já é essa aba; senão, buscada em segundo plano), e põe ao lado dele um
// card (balão cinza) "💲 Novo Valor da Causa". O card abre um quadrinho com
// o valor atual e um campo para o novo valor; nada de tela nova. Ao clicar
// em "Salvar" no quadrinho, a extensão:
// - carrega a tela de alteração num quadro oculto (a URL é a do `onclick`
//   do botão nativo "Alterar", lida com `__pdpLerAbaProcesso` em
//   habilitarAdvogado.js — o mesmo caminho de alterarClasseAssuntos.js);
// - escreve o novo valor no campo "Valor da Causa" (valorAcao), com a
//   máscara do próprio Projudi (`formataValor`, se existir na tela);
// - clica de verdade no "Salvar" nativo (id="saveButton").
// O registro do novo valor nas Movimentações é feito pelo próprio Projudi
// ao salvar a alteração. Se o Projudi sair da tela de alteração (ou
// mostrar "sucesso"), a tela do processo é recarregada para mostrar o valor
// novo e a movimentação; se devolver a tela com erro, a mensagem é mostrada
// e nada mais é feito.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!location.pathname.startsWith("/projudi/")) return;

	// Não roda dentro de iframes ocultos (carregamento em segundo plano) nem
	// dentro do próprio popup desta extensão.
	try {
		if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;
		if (window.frameElement && window.frameElement.classList.contains("pdp-qa-modal-iframe")) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}

	if (window.__pdpAlterarValorCausa) return;
	window.__pdpAlterarValorCausa = true;

	const EDICAO_PATH = "/projudi/processoEdicao.do";
	const FORM_ID = "processoEdicaoForm";
	const CAMPO_ID = "valorAcao";
	const TITULO = "Novo Valor da Causa";
	const LINK_CLASS = "pdp-valor-causa-link";
	const PANEL_ID = "pdp-valor-causa-painel";
	const STATUS_ID = "pdp-valor-causa-status";
	const ROW_ATTR = "data-pdp-valor-causa";
	const EXEC_TIMEOUT_MS = 30000;

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	// -------------------------------------------------------------------
	// Valores: "1.234,56" <-> centavos
	// -------------------------------------------------------------------

	// Aceita "1234,56", "1.234,56", "1234.56", "R$ 1.234", "1234". Devolve
	// o valor em centavos (inteiro) ou null se não for um número válido.
	function paraCentavos(texto) {
		let t = String(texto || "").replace(/R\$|\s/gi, "");
		if (!t || /[^\d.,]/.test(t)) return null;
		const ultimaVirgula = t.lastIndexOf(",");
		const ultimoPonto = t.lastIndexOf(".");
		let inteiro = t;
		let decimais = "";
		if (ultimaVirgula !== -1) {
			// Vírgula = separador decimal (padrão brasileiro); pontos = milhar.
			if (ultimoPonto > ultimaVirgula) return null;
			inteiro = t.slice(0, ultimaVirgula);
			decimais = t.slice(ultimaVirgula + 1);
		} else if (ultimoPonto !== -1 && t.length - ultimoPonto - 1 <= 2 && t.indexOf(".") === ultimoPonto) {
			// Um único ponto com 1–2 casas depois: decimal ("1234.5").
			inteiro = t.slice(0, ultimoPonto);
			decimais = t.slice(ultimoPonto + 1);
		}
		inteiro = inteiro.replace(/\./g, "");
		if (/[^\d]/.test(inteiro) || /[^\d]/.test(decimais) || decimais.length > 2) return null;
		if (!inteiro && !decimais) return null;
		const centavos = parseInt(inteiro || "0", 10) * 100 + parseInt((decimais + "00").slice(0, 2), 10);
		return Number.isFinite(centavos) ? centavos : null;
	}

	function formatarCentavos(centavos) {
		const inteiro = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		return inteiro + "," + String(centavos % 100).padStart(2, "0");
	}

	// Máscara enquanto digita: só dígitos, sempre com dois centavos
	// ("12345" -> "123,45"), como o `formataValor` do Projudi.
	function mascarar(input) {
		const digitos = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
		input.value = digitos ? formatarCentavos(parseInt(digitos, 10)) : "";
	}

	// -------------------------------------------------------------------
	// Endereço da tela de alteração (botão nativo "Alterar")
	// -------------------------------------------------------------------

	// <input type="button" name="editButton" id="editButton" value="Alterar"
	//   onclick="disableScreen(); document.location.href=
	//   '/projudi/processoEdicao.do?_tj=...'">
	// Na falta do id, procura um botão "Alterar" que leve a processoEdicao.do.
	function findEdicaoUrl(doc) {
		const candidates = [doc.getElementById("editButton")].concat(
			Array.prototype.slice.call(doc.querySelectorAll('input[type="button"], button'))
		);
		for (let i = 0; i < candidates.length; i++) {
			const el = candidates[i];
			if (!el) continue;
			if (el.id !== "editButton" && normalize(el.value || el.textContent) !== "alterar") continue;
			const hrefMatch = /document\.location\.href\s*=\s*(['"])([^'"]+)\1/.exec(el.getAttribute("onclick") || "");
			if (!hrefMatch) continue;
			try {
				const url = new URL(hrefMatch[2], location.href);
				if (url.origin === location.origin && url.pathname === EDICAO_PATH) return url;
			} catch (err) {
				// endereço inválido — tenta o próximo
			}
		}
		return null;
	}

	async function urlDaEdicao() {
		if (typeof window.__pdpLerAbaProcesso !== "function") {
			throw new Error("Não encontrei a leitura das abas do processo (habilitarAdvogado.js).");
		}
		const aba = await window.__pdpLerAbaProcesso("tabDadosProcesso", "Informações Gerais");
		const url = findEdicaoUrl(aba.doc);
		if (!url) {
			throw new Error('Não encontrei o botão "Alterar" na aba "Informações Gerais" — talvez seu perfil não tenha permissão para alterar este processo.');
		}
		aba.checkContext();
		return url.href;
	}

	// -------------------------------------------------------------------
	// Execução: quadro oculto → valor → "Salvar"
	// -------------------------------------------------------------------

	function mostrarStatus(texto) {
		let el = document.getElementById(STATUS_ID);
		if (!el) {
			el = document.createElement("div");
			el.id = STATUS_ID;
			el.style.cssText = "position:fixed;left:50%;top:80px;transform:translateX(-50%);z-index:2147483646;padding:10px 16px;background:#3c4b5c;color:#fff;font:13px Arial,sans-serif;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.3)";
			document.body.appendChild(el);
		}
		el.textContent = texto;
	}

	function esconderStatus() {
		const el = document.getElementById(STATUS_ID);
		if (el) el.remove();
	}

	// Mensagem de erro/aviso que o Projudi mostra na própria tela.
	function mensagemDaTela(doc) {
		const el = doc.querySelector(".error, .errors, .erro, .mensagemErro, #errorMessages, .alert, .warning, .message, .msg");
		const texto = (el ? el.textContent : "").replace(/\s+/g, " ").trim();
		return texto.slice(0, 400);
	}

	// Carrega `url` num quadro oculto e chama `etapa(doc, n, win, alertas)` a
	// cada tela (n = 0, 1, ...); `etapa` devolve um resultado final ou
	// `undefined` para esperar a próxima tela. Mesmo esquema de
	// alterarClasseAssuntos.js.
	function rodarNoQuadro(url, etapa) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			iframe.setAttribute("data-pdp-loader", "");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1024px;height:768px;visibility:hidden";
			const alertas = [];
			let n = 0;
			let fim = false;
			const limite = setTimeout(function () {
				terminar(null, new Error("o Projudi demorou demais para responder."));
			}, EXEC_TIMEOUT_MS);
			function terminar(valor, erro) {
				if (fim) return;
				fim = true;
				clearTimeout(limite);
				setTimeout(function () { iframe.remove(); }, 0);
				if (erro) reject(erro);
				else resolve(valor);
			}
			iframe.addEventListener("load", function () {
				if (fim) return;
				let doc;
				try {
					if (iframe.contentWindow.location.href === "about:blank") return;
					doc = iframe.contentDocument;
				} catch (err) {
					terminar(null, new Error("não consegui ler a tela do Projudi."));
					return;
				}
				// confirm nativo ("Deseja realmente…?") é aceito, como o
				// usuário faria; os alertas são guardados para o caso de erro.
				try {
					iframe.contentWindow.confirm = function () { return true; };
					iframe.contentWindow.alert = function (msg) {
						alertas.push(String(msg || ""));
						console.info("[Novo Valor da Causa] alerta do Projudi:", msg);
					};
				} catch (err) {
					// segue
				}
				let r;
				try {
					r = etapa(doc, n++, iframe.contentWindow, alertas);
				} catch (err) {
					terminar(null, err);
					return;
				}
				if (r !== undefined) terminar(r);
			});
			document.body.appendChild(iframe);
			iframe.src = url;
		});
	}

	let ocupado = false;

	async function alterarValor(centavos) {
		if (ocupado) return;
		ocupado = true;
		const novo = formatarCentavos(centavos);
		try {
			mostrarStatus(TITULO + " — abrindo a tela de alteração…");
			const url = await urlDaEdicao();
			const resultado = await rodarNoQuadro(url, function (doc, n, win, alertas) {
				const form = doc.getElementById(FORM_ID);
				if (n === 0) {
					if (!form) throw new Error("a tela de alteração do processo não abriu.");
					const campo = doc.getElementById(CAMPO_ID) || form.elements.namedItem(CAMPO_ID);
					if (!campo) throw new Error('não encontrei o campo "Valor da Causa" na tela de alteração.');
					if (paraCentavos(campo.value) === centavos) return { jaEstava: true };
					mostrarStatus(TITULO + " — preenchendo R$ " + novo + "…");
					campo.focus();
					campo.value = novo;
					// Máscara do próprio Projudi (onkeyup="formataValor(this)").
					try {
						if (typeof win.formataValor === "function") win.formataValor(campo);
					} catch (err) {
						// segue com o valor já formatado
					}
					campo.dispatchEvent(new Event("input", { bubbles: true }));
					campo.dispatchEvent(new Event("change", { bubbles: true }));
					campo.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
					if (paraCentavos(campo.value) !== centavos) {
						throw new Error('o campo "Valor da Causa" não aceitou o valor R$ ' + novo + ' (ficou "' + campo.value + '").');
					}
					const salvar = doc.getElementById("saveButton");
					if (!salvar) throw new Error('não encontrei o botão "Salvar".');
					mostrarStatus(TITULO + " — salvando…");
					salvar.click();
					return undefined;
				}
				// Resposta do "Salvar".
				const texto = doc.body ? doc.body.textContent || "" : "";
				if (!form || win.location.pathname !== EDICAO_PATH) return { ok: true };
				if (/sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) return { ok: true };
				return { ok: false, mensagem: mensagemDaTela(doc) || alertas.join("\n") };
			});
			esconderStatus();
			if (resultado.jaEstava) {
				alert(TITULO + ": o processo já está com o valor da causa R$ " + novo + ". Nada foi alterado.");
				return;
			}
			if (!resultado.ok) {
				alert(TITULO + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse o botão "Alterar" da aba Informações Gerais para fazer a alteração à mão.');
				return;
			}
			mostrarStatus(TITULO + " — valor alterado para R$ " + novo + ". Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			esconderStatus();
			alert(TITULO + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	// -------------------------------------------------------------------
	// Quadrinho: valor atual, novo valor, Salvar/Cancelar
	// -------------------------------------------------------------------

	function fecharPainel() {
		const el = document.getElementById(PANEL_ID);
		if (el) el.remove();
		document.removeEventListener("mousedown", cliqueFora, true);
	}

	function cliqueFora(event) {
		const el = document.getElementById(PANEL_ID);
		if (el && !el.contains(event.target) && !(event.target.closest && event.target.closest("." + LINK_CLASS))) fecharPainel();
	}

	function abrirPainel(botao, valorAtual) {
		if (document.getElementById(PANEL_ID)) {
			fecharPainel();
			return;
		}
		const painel = document.createElement("div");
		painel.id = PANEL_ID;

		const titulo = document.createElement("div");
		titulo.className = "pdp-vc-titulo";
		titulo.textContent = "💲 " + TITULO;
		painel.appendChild(titulo);

		const atual = document.createElement("div");
		atual.className = "pdp-vc-atual";
		atual.textContent = "Valor atual: " + (valorAtual || "—");
		painel.appendChild(atual);

		const form = document.createElement("form");
		const rotulo = document.createElement("label");
		rotulo.textContent = "Novo valor: R$ ";
		const input = document.createElement("input");
		input.type = "text";
		input.inputMode = "decimal";
		input.autocomplete = "off";
		input.maxLength = 18;
		input.placeholder = "0,00";
		input.addEventListener("input", function () {
			mascarar(input);
		});
		rotulo.appendChild(input);
		form.appendChild(rotulo);

		const dica = document.createElement("div");
		dica.className = "pdp-vc-dica";
		dica.textContent = "Digite o valor com os centavos (ex.: 1.500,00). Ao salvar, o Projudi registra a alteração nas Movimentações.";
		form.appendChild(dica);

		const botoes = document.createElement("div");
		botoes.className = "pdp-vc-botoes";
		const salvar = document.createElement("button");
		salvar.type = "submit";
		salvar.textContent = "Salvar";
		const cancelar = document.createElement("button");
		cancelar.type = "button";
		cancelar.textContent = "Cancelar";
		cancelar.addEventListener("click", fecharPainel);
		botoes.appendChild(salvar);
		botoes.appendChild(cancelar);
		form.appendChild(botoes);

		form.addEventListener("submit", function (event) {
			event.preventDefault();
			const centavos = paraCentavos(input.value);
			if (centavos === null || centavos <= 0) {
				alert("Informe o novo valor da causa (ex.: 1.500,00).");
				input.focus();
				return;
			}
			fecharPainel();
			alterarValor(centavos);
		});
		painel.addEventListener("keydown", function (event) {
			if (event.key === "Escape") fecharPainel();
		});
		painel.appendChild(form);

		document.body.appendChild(painel);
		const r = botao.getBoundingClientRect();
		painel.style.left = Math.max(8, Math.min(window.innerWidth - painel.offsetWidth - 8, r.left + window.scrollX)) + "px";
		painel.style.top = r.bottom + window.scrollY + 4 + "px";
		document.addEventListener("mousedown", cliqueFora, true);
		input.focus();
	}

	// -------------------------------------------------------------------
	// Linha "Valor da Causa:" + card no cabeçalho do processo
	// -------------------------------------------------------------------

	// Mesmo card cinza do "✏️ Alterar" (alterarClasseAssuntos.js).
	function garantirEstilo() {
		if (document.getElementById(LINK_CLASS + "-estilo")) return;
		const style = document.createElement("style");
		style.id = LINK_CLASS + "-estilo";
		style.textContent =
			"a." + LINK_CLASS + "{display:inline-block;margin-left:8px;padding:1px 7px;" +
			"font:normal 11px/16px Arial,Helvetica,sans-serif;color:#222 !important;text-decoration:none !important;" +
			"white-space:nowrap;vertical-align:middle;cursor:pointer;" +
			"background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:10px;" +
			"box-shadow:0 1px 2px rgba(0,0,0,0.08);}" +
			"a." + LINK_CLASS + ":hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888;}" +
			"#" + PANEL_ID + "{position:absolute;z-index:2147483640;min-width:280px;max-width:360px;padding:10px;background:#fff;border:1px solid #adadad;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);font:12px Arial,Helvetica,sans-serif;color:#222;text-align:left}" +
			"#" + PANEL_ID + " .pdp-vc-titulo{font-weight:bold;margin:0 0 6px}" +
			"#" + PANEL_ID + " .pdp-vc-atual{color:#555;margin:0 0 8px}" +
			"#" + PANEL_ID + " label{font-weight:bold}" +
			"#" + PANEL_ID + " input{width:140px;padding:3px 5px;font:13px Arial,Helvetica,sans-serif;text-align:right;border:1px solid #adadad;border-radius:3px}" +
			"#" + PANEL_ID + " .pdp-vc-dica{color:#666;margin:6px 0 8px;line-height:1.4}" +
			"#" + PANEL_ID + " .pdp-vc-botoes{display:flex;gap:6px;justify-content:flex-end}" +
			"#" + PANEL_ID + " button{font:12px Arial,Helvetica,sans-serif;color:#222;cursor:pointer;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:10px;padding:3px 12px}" +
			"#" + PANEL_ID + " button:hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888}" +
			"#" + PANEL_ID + " button[type=submit]{font-weight:bold}";
		(document.head || document.documentElement).appendChild(style);
	}

	function criarLink(celulaValor) {
		const a = document.createElement("a");
		a.href = "#";
		a.className = LINK_CLASS;
		a.textContent = "💲 " + TITULO;
		a.title = "Informar o novo valor da causa: a extensão altera o valor e salva no processo, sem abrir a tela de alteração";
		a.addEventListener("click", function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (ocupado) return;
			abrirPainel(a, celulaValor.textContent.replace(/\s+/g, " ").trim());
		});
		return a;
	}

	// Valor da causa lido da aba "Informações Gerais" (`doc`):
	// <td class="label"><label>Valor da Causa:</label></td>
	// <td width="1%" nowrap="nowrap">R$ 324,80</td>
	// Ignora a linha desta extensão no cabeçalho e a tela de alteração.
	function lerValorDaAba(doc) {
		const labels = doc.querySelectorAll("td.label, td.labelRadio");
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i];
			if (normalize(label.textContent) !== "valor da causa:") continue;
			if (label.closest("[" + ROW_ATTR + "], #" + FORM_ID)) continue;
			const valor = label.nextElementSibling;
			if (valor) return valor.textContent.replace(/\s+/g, " ").trim();
		}
		return null;
	}

	// Linha "Valor da Causa:" no cabeçalho do processo
	// (`table#informacoesProcessuais`, visível em qualquer aba), logo antes
	// do "Nível de Sigilo" — depois da Classe, do Assunto e da linha de réus
	// (reusCabecalho.js, que se põe logo após o Assunto). A linha é inserida
	// uma vez e nunca movida, para não disputar posição com as linhas das
	// outras funções (sequencialProcessoPrincipal.js entra após o Sigilo).
	function criarLinha(table) {
		const rows = Array.prototype.slice.call(table.rows);
		const sigilo = rows.filter(function (tr) {
			const label = tr.querySelector("td.label, td.labelRadio");
			return label && /^nivel de sigilo/.test(normalize(label.textContent));
		})[0];
		const row = document.createElement("tr");
		row.setAttribute(ROW_ATTR, "");
		row.innerHTML = '<td class="label"><label>Valor da Causa:</label></td><td colspan="4"><span class="pdp-vc-valor">carregando…</span></td>';
		if (sigilo) sigilo.insertAdjacentElement("beforebegin", row);
		else (table.tBodies[0] || table).appendChild(row);
		return row;
	}

	let carregando = false;

	async function preencherLinha(row) {
		const celula = row.querySelector(".pdp-vc-valor");
		let valor = null;
		try {
			if (typeof window.__pdpLerAbaProcesso !== "function") throw new Error("leitura das abas indisponível");
			const aba = await window.__pdpLerAbaProcesso("tabDadosProcesso", "Informações Gerais");
			aba.checkContext();
			valor = lerValorDaAba(aba.doc);
		} catch (err) {
			console.info("[Novo Valor da Causa] não consegui ler o valor da causa:", err && err.message);
		}
		if (!row.isConnected) return;
		celula.textContent = valor || "(não informado)";
		garantirEstilo();
		celula.insertAdjacentElement("afterend", criarLink(celula));
	}

	function reconcile() {
		if (carregando) return;
		const table = document.getElementById("informacoesProcessuais");
		if (!table || !document.getElementById("processoForm")) return;
		if (table.querySelector("tr[" + ROW_ATTR + "]")) return;
		carregando = true;
		const row = criarLinha(table);
		preencherLinha(row).finally(function () {
			carregando = false;
		});
	}

	new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
	reconcile();
})();
