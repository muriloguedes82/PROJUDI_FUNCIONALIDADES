// Projudi - Preferências de agendamento de audiência (⭐ na linha
// "Audiência: Agendar" do cabeçalho do processo)
//
// Agendar uma audiência hoje exige: clicar em "Agendar" na linha
// "Audiência:" do cabeçalho do processo (`table#informacoesProcessuais`,
// visível em qualquer aba; link para /projudi/audiencia/agendaAudiencia.do),
// escolher a Vara (select codVara) e o Tipo da Audiência (select
// idTipoAudiencia) na tela "Agendar Audiência" (formulário
// agendaAudienciaForm) e clicar em "Manual" (id="manualButton",
// onclick="validarAgendamento(false)"), que leva à tela "Agendar Audiência
// de <tipo>", onde o usuário escolhe data, sala etc.
//
// Este recurso põe uma ⭐ ao lado do "Agendar". A preferência guarda as
// escolhas da tela "Agendar Audiência" (sobretudo o Tipo da Audiência) e
// vai SÓ até o clique em "Manual": daí em diante o usuário continua à mão,
// na tela "Agendar Audiência de ...". Nada é agendado pela extensão.
// - Gravar ("+ Nova preferência"): a extensão abre a tela "Agendar
//   Audiência" (mesma aba), com um aviso amarelo. O usuário escolhe o Tipo
//   (e a Vara, se houver mais de uma) e clica em "Manual"; nesse clique a
//   extensão lê as escolhas, pede o NOME da preferência, grava e deixa o
//   "Manual" seguir — o usuário já cai na tela "Agendar Audiência de ...".
//   Cancelar o nome: nada é gravado e a tela fica como está (o próximo
//   "Manual" segue normalmente).
// - Usar (clique no nome da preferência): como toda preferência da tela do
//   processo, primeiro as perguntas das pendências (executarComPendencias
//   em quickActions.js — ver CLAUDE.md); depois a extensão abre a tela
//   "Agendar Audiência", escolhe o que foi gravado (com o evento "change",
//   para o Projudi atualizar a tela como se fosse o usuário) e clica em
//   "Manual". Se o tipo gravado não existir nesta vara, para e avisa.
//
// O "modo" (gravar/usar) passa de uma tela para a outra em sessionStorage
// (vale só para esta aba), com prazo curto para não pegar uma abertura
// posterior da tela feita à mão.
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

	if (window.__pdpAgendarAudiencia) return;
	window.__pdpAgendarAudiencia = true;

	const AGENDA_PATH = "/projudi/audiencia/agendaAudiencia.do";
	const FORM_ID = "agendaAudienciaForm";
	const TIPO_ID = "idTipoAudiencia";
	const MANUAL_ID = "manualButton";
	const LABEL = "Agendar Audiência";
	const PREFS_KEY = "pdpAgendarAudienciaPrefs";
	const MODO_KEY = "pdpAgendarAudienciaModo"; // sessionStorage
	const MODO_VALIDADE_MS = 2 * 60 * 1000;
	const LINK_CLASS = "pdp-audiencia-link";
	const PREF_BTN_CLASS = "pdp-audiencia-pref";
	const PANEL_ID = "pdp-audiencia-painel";
	const AVISO_ID = "pdp-audiencia-aviso";
	// Até 3 cargas da tela "Agendar Audiência" por execução (o Projudi pode
	// recarregá-la ao trocar a Vara); depois disso, desiste.
	const MAX_CARGAS = 3;
	const ESPERA_CAMPO_MS = 8000;
	const ESPERA_MANUAL_MS = 15000;

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function limpa(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	function pausa(ms) {
		return new Promise(function (resolve) { setTimeout(resolve, ms); });
	}

	// -------------------------------------------------------------------
	// Modo (gravar / usar / continuar) entre uma tela e outra
	// -------------------------------------------------------------------

	function lerModo() {
		try {
			const bruto = sessionStorage.getItem(MODO_KEY);
			if (!bruto) return null;
			const modo = JSON.parse(bruto);
			if (!modo || !modo.tipo || Date.now() - (modo.em || 0) > MODO_VALIDADE_MS) {
				sessionStorage.removeItem(MODO_KEY);
				return null;
			}
			return modo;
		} catch (err) {
			return null;
		}
	}

	function gravarModo(modo) {
		try {
			sessionStorage.setItem(MODO_KEY, JSON.stringify(Object.assign({}, modo, { em: Date.now() })));
			return true;
		} catch (err) {
			return false;
		}
	}

	function apagarModo() {
		try {
			sessionStorage.removeItem(MODO_KEY);
		} catch (err) {
			// sem sessionStorage — nada a apagar
		}
	}

	// -------------------------------------------------------------------
	// Preferências
	// -------------------------------------------------------------------

	function carregarPrefs() {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(PREFS_KEY, function (data) {
					resolve(data && Array.isArray(data[PREFS_KEY]) ? data[PREFS_KEY] : []);
				});
			} catch (err) {
				resolve([]);
			}
		});
	}

	function salvarPrefs(prefs) {
		return new Promise(function (resolve, reject) {
			try {
				const data = {};
				data[PREFS_KEY] = prefs;
				chrome.storage.local.set(data, function () {
					if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
					else resolve();
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	function campoTipo(pref) {
		return (pref.campos || []).filter(function (c) { return c.name === TIPO_ID; })[0] || null;
	}

	function descreverPref(pref) {
		const partes = (pref.campos || []).map(function (c) { return (c.rotulo ? c.rotulo + ": " : "") + (c.texto || c.value); });
		return "Abre o Agendar Audiência com " + (partes.join(" · ") || "as escolhas gravadas") + " e clica em Manual.";
	}

	// -------------------------------------------------------------------
	// Tela do processo: linha "Audiência: Agendar"
	// -------------------------------------------------------------------

	function linkAgendar(doc) {
		const table = doc.getElementById("informacoesProcessuais");
		if (!table) return null;
		const links = table.querySelectorAll('a[href*="agendaAudiencia.do"]');
		for (let i = 0; i < links.length; i++) {
			if (normalize(links[i].textContent) === "agendar") return links[i];
		}
		return null;
	}

	function urlAgendar() {
		const a = linkAgendar(document);
		return a ? a.href : null;
	}

	function abrirTelaAgendar(modo) {
		const url = urlAgendar();
		if (!url) {
			alert('Não encontrei o "Agendar" da linha "Audiência" neste processo.');
			return;
		}
		if (!gravarModo(modo)) {
			alert("O navegador não deixou a extensão guardar a preferência nesta aba. Agende à mão pelo \"Agendar\".");
			return;
		}
		window.location.href = url;
	}

	function usarPreferencia(pref) {
		const executar = function () { abrirTelaAgendar({ tipo: "usar", pref: pref, cargas: 0 }); };
		const qa = window.__pdpQuickActions;
		// Como toda preferência (ver executarComPendencias em quickActions.js
		// e o CLAUDE.md): pergunta das juntadas/conclusão pendentes antes.
		if (qa && typeof qa.executarComPendencias === "function") {
			qa.executarComPendencias("★ " + pref.name + " — " + LABEL, false, executar);
		} else {
			executar();
		}
	}

	// Mesmo card cinza do "Incluir"/⭐ das Prioridades (alterarPrioridades.js).
	function garantirEstilo() {
		if (document.getElementById(LINK_CLASS + "-estilo")) return;
		const style = document.createElement("style");
		style.id = LINK_CLASS + "-estilo";
		style.textContent =
			"a." + LINK_CLASS + "{display:inline-block;margin-left:6px;padding:0 4px;" +
			"font:normal 11px/15px Arial,Helvetica,sans-serif;color:#222 !important;text-decoration:none !important;" +
			"white-space:nowrap;vertical-align:middle;cursor:pointer;" +
			"background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:3px;" +
			"box-shadow:0 1px 2px rgba(0,0,0,0.08);}" +
			"a." + LINK_CLASS + ":hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888;}" +
			"#" + PANEL_ID + "{position:fixed;z-index:2147483640;min-width:260px;max-width:420px;padding:8px;background:#fff;border:1px solid #adadad;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);font:12px Arial,Helvetica,sans-serif;color:#222}" +
			"#" + PANEL_ID + " .pdp-aud-titulo{font-weight:bold;margin:0}" +
			"#" + PANEL_ID + " .pdp-aud-vazio{color:#666;margin:0 0 8px;line-height:1.4}" +
			"#" + PANEL_ID + " button{font:12px Arial,Helvetica,sans-serif;color:#222;cursor:pointer;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:4px;padding:3px 9px}" +
			"#" + PANEL_ID + " button:hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888}" +
			"#" + PANEL_ID + " .pdp-aud-linha{display:flex;align-items:center;gap:2px;margin:0 0 4px;background:#fff8e6;border:1px solid #e8cf8a;border-radius:4px}" +
			"#" + PANEL_ID + " .pdp-aud-linha:hover{background:#fff0c7;border-color:#d4b25a}" +
			"#" + PANEL_ID + " .pdp-aud-linha button{background:none;border:none;border-radius:3px}" +
			"#" + PANEL_ID + " .pdp-aud-usar{flex:1;min-width:0;text-align:left;font-weight:bold;font-size:11.5px;color:#333;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			"#" + PANEL_ID + " .pdp-aud-apagar{flex:none;font-size:11px;padding:2px 5px;opacity:.6}" +
			"#" + PANEL_ID + " .pdp-aud-apagar:hover{opacity:1;background:#f6d6d6}" +
			"#" + PANEL_ID + " button.pdp-aud-nova{font-weight:bold}";
		(document.head || document.documentElement).appendChild(style);
	}

	function fecharPainel() {
		const el = document.getElementById(PANEL_ID);
		if (el) el.remove();
		document.removeEventListener("mousedown", cliqueFora, true);
	}

	function cliqueFora(event) {
		const el = document.getElementById(PANEL_ID);
		if (el && !el.contains(event.target) && !(event.target.closest && event.target.closest("." + PREF_BTN_CLASS))) fecharPainel();
	}

	async function abrirPainel(botao) {
		if (document.getElementById(PANEL_ID)) {
			fecharPainel();
			return;
		}
		const prefs = await carregarPrefs();
		const painel = document.createElement("div");
		painel.id = PANEL_ID;
		const titulo = document.createElement("div");
		titulo.className = "pdp-aud-titulo";
		titulo.textContent = "⭐ Preferências — Agendar Audiência";
		painel.appendChild(titulo);
		if (!prefs.length) {
			const vazio = document.createElement("div");
			vazio.className = "pdp-aud-vazio";
			vazio.textContent = "Nenhuma preferência gravada. Use \"+ Nova preferência\" para gravar o tipo de audiência e, depois, abrir o agendamento manual dele com um clique.";
			painel.appendChild(vazio);
		}
		prefs.forEach(function (pref) {
			const linha = document.createElement("div");
			linha.className = "pdp-aud-linha";
			const usar = document.createElement("button");
			usar.type = "button";
			usar.className = "pdp-aud-usar";
			usar.textContent = pref.name;
			usar.title = descreverPref(pref);
			usar.addEventListener("click", function () {
				fecharPainel();
				usarPreferencia(pref);
			});
			const apagar = document.createElement("button");
			apagar.type = "button";
			apagar.className = "pdp-aud-apagar";
			apagar.textContent = "🗑";
			apagar.title = "Excluir esta preferência";
			apagar.addEventListener("click", async function () {
				if (!confirm('Excluir a preferência "★ ' + pref.name + '"?')) return;
				const todas = await carregarPrefs();
				await salvarPrefs(todas.filter(function (p) { return p.id !== pref.id; }));
				fecharPainel();
				abrirPainel(botao);
			});
			linha.appendChild(usar);
			linha.appendChild(apagar);
			painel.appendChild(linha);
		});
		const nova = document.createElement("button");
		nova.type = "button";
		nova.className = "pdp-aud-nova pdp-pp-nova";
		nova.textContent = "+ Nova preferência";
		nova.title = "Abre o Agendar Audiência: escolha o Tipo da Audiência e clique em Manual; a extensão grava a escolha e pede um nome";
		nova.addEventListener("click", function () {
			fecharPainel();
			abrirTelaAgendar({ tipo: "gravar" });
		});
		document.body.appendChild(painel);
		const pp = window.__pdpPainelPrefs;
		if (pp) {
			// Título, busca e "+ Nova preferência" no topo fixo do painel
			// (painelPreferencias.js).
			painel.removeChild(titulo);
			pp.topo(painel, { conteudo: [titulo], novas: [nova], itens: ".pdp-aud-linha" });
			pp.caber(painel, botao);
		} else {
			painel.appendChild(nova);
			const r = botao.getBoundingClientRect();
			painel.style.top = Math.round(r.bottom + 4) + "px";
			painel.style.left = Math.round(r.left) + "px";
		}
		document.addEventListener("mousedown", cliqueFora, true);
	}

	function reconcileProcesso() {
		const a = linkAgendar(document);
		if (!a) return;
		const proximo = a.nextElementSibling;
		if (proximo && proximo.classList.contains(PREF_BTN_CLASS)) return;
		garantirEstilo();
		const estrela = document.createElement("a");
		estrela.href = "#";
		estrela.className = LINK_CLASS + " " + PREF_BTN_CLASS;
		estrela.textContent = "⭐";
		estrela.title = "Preferências de agendamento: grave o tipo de audiência e, depois, abra o agendamento manual dele com um clique";
		estrela.addEventListener("click", function (event) {
			event.preventDefault();
			event.stopPropagation();
			abrirPainel(estrela);
		});
		a.insertAdjacentElement("afterend", estrela);
	}

	// -------------------------------------------------------------------
	// Tela "Agendar Audiência" (escolha do tipo + Manual)
	// -------------------------------------------------------------------

	function telaDeEscolha() {
		if (location.pathname !== AGENDA_PATH) return null;
		const form = document.getElementById(FORM_ID);
		if (!form || !document.getElementById(TIPO_ID) || !document.getElementById(MANUAL_ID)) return null;
		return form;
	}

	// "Agendar Audiência de <tipo>" (depois do Manual).
	function telaDoTipo() {
		if (location.pathname !== AGENDA_PATH || telaDeEscolha()) return false;
		const h3 = document.querySelector("#" + FORM_ID + " h3, h3");
		return !!h3 && /^agendar audi\S*ncia d/.test(normalize(h3.textContent));
	}

	function visivel(el) {
		return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
	}

	function rotuloDe(el) {
		const tr = el.closest ? el.closest("tr") : null;
		const label = tr ? tr.querySelector("td.label, td.labelRadio") : null;
		return label ? limpa(label.textContent).replace(/^\*\s*/, "").replace(/\s*:$/, "") : "";
	}

	// Escolhas da tela: as listas (Vara, Tipo da Audiência e as que o
	// Projudi mostrar a mais), na ordem da tela.
	function lerEscolhas(form) {
		const campos = [];
		Array.prototype.forEach.call(form.querySelectorAll("select[name]"), function (sel) {
			if (sel.disabled || !visivel(sel) || sel.selectedIndex < 0) return;
			const opt = sel.options[sel.selectedIndex];
			campos.push({ name: sel.name, value: sel.value, texto: limpa(opt ? opt.textContent : ""), rotulo: rotuloDe(sel) });
		});
		return campos;
	}

	function avisar(html, cor) {
		let aviso = document.getElementById(AVISO_ID);
		if (!aviso) {
			aviso = document.createElement("div");
			aviso.id = AVISO_ID;
			const form = document.getElementById(FORM_ID);
			if (form) form.insertBefore(aviso, form.firstChild);
			else document.body.insertBefore(aviso, document.body.firstChild);
		}
		const cores = cor === "ok"
			? "border:1px solid #6aa84f;background:#eef7e8;color:#274e13"
			: "border:1px solid #d4b106;background:#fffbe6;color:#5c4400";
		aviso.style.cssText = "margin:6px 0 10px;padding:8px 10px;" + cores + ";font:12px Arial,sans-serif;border-radius:4px";
		aviso.innerHTML = html;
	}

	function tirarAviso() {
		const aviso = document.getElementById(AVISO_ID);
		if (aviso) aviso.remove();
	}

	function escapar(texto) {
		return String(texto).replace(/[&<>"]/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
		});
	}

	function prepararGravacao(form) {
		avisar("<b>⭐ Gravando preferência.</b> Escolha o <b>Tipo da Audiência</b> (e a Vara, se for o caso) e clique em <b>Manual</b>. " +
			"A extensão grava a escolha, pede o nome da preferência e segue para a tela de agendamento, onde você continua normalmente.");
		let liberado = false;
		document.addEventListener(
			"click",
			async function (event) {
				const alvo = event.target && event.target.closest ? event.target.closest("#" + MANUAL_ID) : null;
				if (!alvo || liberado) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				const campos = lerEscolhas(form);
				const tipo = campos.filter(function (c) { return c.name === TIPO_ID; })[0];
				if (!tipo || !tipo.value) {
					alert("Escolha o Tipo da Audiência antes de clicar em Manual.");
					return;
				}
				const nome = prompt("Nome da preferência:", tipo.texto);
				liberado = true; // daqui em diante, o Manual segue sem a extensão
				if (nome === null) {
					tirarAviso();
					return; // nada gravado; a tela fica como está
				}
				const pref = {
					id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
					name: nome.trim() || tipo.texto,
					campos: campos,
					criadaEm: new Date().toISOString(),
				};
				try {
					const prefs = await carregarPrefs();
					prefs.push(pref);
					await salvarPrefs(prefs);
				} catch (error) {
					alert("Não foi possível gravar a preferência: " + (error && error.message ? error.message : error));
					return;
				}
				console.info("[Agendar Audiência] preferência gravada:", pref);
				gravarModo({ tipo: "continuar", texto: 'Preferência "★ ' + pref.name + '" gravada. Continue o agendamento nesta tela.' });
				avisar('<b>Preferência "★ ' + escapar(pref.name) + '" gravada.</b> Seguindo para a tela de agendamento…', "ok");
				alvo.click();
				apagarModoSeNaoSaiu();
			},
			true
		);
	}

	// Se o "Manual" não sair da tela (validação do Projudi, por exemplo),
	// o aviso para a próxima tela não deve valer para uma abertura futura.
	function apagarModoSeNaoSaiu() {
		setTimeout(function () {
			const modo = lerModo();
			if (modo && modo.tipo === "continuar") apagarModo();
		}, ESPERA_MANUAL_MS);
	}

	function acharOpcao(sel, campo) {
		const opcoes = Array.prototype.slice.call(sel.options);
		return opcoes.filter(function (o) { return o.value === campo.value; })[0] ||
			opcoes.filter(function (o) { return normalize(o.textContent) === normalize(campo.texto); })[0] ||
			null;
	}

	async function esperarOpcao(campo) {
		const fim = Date.now() + ESPERA_CAMPO_MS;
		while (Date.now() < fim) {
			const sel = document.querySelector('#' + FORM_ID + ' select[name="' + campo.name + '"]');
			if (sel && !sel.disabled) {
				const opt = acharOpcao(sel, campo);
				if (opt) return { sel: sel, opt: opt };
			}
			await pausa(250);
		}
		const sel = document.querySelector('#' + FORM_ID + ' select[name="' + campo.name + '"]');
		return sel ? { sel: sel, opt: null } : null;
	}

	async function aplicarPreferencia(modo) {
		const pref = modo.pref;
		const titulo = "★ " + pref.name;
		if ((modo.cargas || 0) >= MAX_CARGAS) {
			apagarModo();
			alert(titulo + ": a tela de agendamento recarregou várias vezes e a preferência não foi concluída. Escolha o tipo e clique em Manual à mão.");
			return;
		}
		gravarModo(Object.assign({}, modo, { cargas: (modo.cargas || 0) + 1 }));
		avisar("<b>" + escapar(titulo) + ":</b> escolhendo o que foi gravado e clicando em <b>Manual</b>…");
		const avisos = [];
		for (const campo of pref.campos || []) {
			const achado = await esperarOpcao(campo);
			if (!achado || !achado.opt) {
				const nomeCampo = campo.rotulo || campo.name;
				if (campo.name === TIPO_ID) {
					apagarModo();
					avisar("<b>" + escapar(titulo) + ":</b> o tipo <b>" + escapar(campo.texto) + "</b> não está disponível nesta tela. Escolha o tipo e clique em <b>Manual</b> à mão.");
					alert(titulo + ': o tipo "' + campo.texto + '" não está disponível nesta tela. Escolha o tipo e clique em Manual à mão.');
					return;
				}
				avisos.push(nomeCampo + ' "' + campo.texto + '" não está disponível; ficou o que o Projudi mostrou.');
				continue;
			}
			if (achado.sel.value === achado.opt.value) continue;
			achado.sel.value = achado.opt.value;
			achado.sel.dispatchEvent(new Event("input", { bubbles: true }));
			achado.sel.dispatchEvent(new Event("change", { bubbles: true }));
			await pausa(600);
		}
		await pausa(400);
		const manual = document.getElementById(MANUAL_ID);
		if (!manual || manual.disabled) {
			apagarModo();
			avisar("<b>" + escapar(titulo) + ":</b> não encontrei o botão <b>Manual</b> habilitado. Confira a tela e clique nele à mão.");
			return;
		}
		gravarModo({
			tipo: "continuar",
			texto: '"★ ' + pref.name + '" aplicada. Continue o agendamento nesta tela.' + (avisos.length ? " Atenção: " + avisos.join(" ") : ""),
		});
		manual.click();
		setTimeout(function () {
			const m = lerModo();
			if (!m || m.tipo !== "continuar") return;
			apagarModo();
			avisar("<b>" + escapar(titulo) + ":</b> a tela não avançou depois do <b>Manual</b>. Confira a mensagem do Projudi e clique em <b>Manual</b> de novo, se for o caso.");
		}, ESPERA_MANUAL_MS);
	}

	// -------------------------------------------------------------------
	// Início
	// -------------------------------------------------------------------

	const modo = lerModo();
	const formEscolha = telaDeEscolha();
	if (formEscolha && modo) {
		if (modo.tipo === "gravar") {
			apagarModo();
			prepararGravacao(formEscolha);
		} else if (modo.tipo === "usar" && modo.pref) {
			aplicarPreferencia(modo);
		} else {
			apagarModo();
		}
	} else if (modo && modo.tipo === "continuar" && telaDoTipo()) {
		apagarModo();
		avisar("<b>" + escapar(modo.texto || "Preferência aplicada.") + "</b>", "ok");
	}

	if (location.pathname !== AGENDA_PATH) {
		let agendado = false;
		reconcileProcesso();
		new MutationObserver(function () {
			if (agendado) return;
			agendado = true;
			setTimeout(function () {
				agendado = false;
				reconcileProcesso();
			}, 200);
		}).observe(document.documentElement, { childList: true, subtree: true });
	}
})();
