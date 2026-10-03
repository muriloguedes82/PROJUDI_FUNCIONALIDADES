// Projudi/SEEU - Botão "📄 Copiar dados" do processo
//
// Para ofícios, e-mails, Sisbajud/Infojud/BNMP, planilhas de controle e
// WhatsApp, o usuário copia à mão, um por um, o número do processo, a
// classe, o nome, o RG e o CPF de cada réu e o juízo. Este arquivo põe na
// barra da extensão o botão "📄 Copiar dados", que abre um painel curto
// (mesmo visual .pdp-qa-panel) com formatos prontos; clicar num formato
// monta o texto com os dados da tela e copia para a área de transferência.
//
// Formatos prontos (FORMATOS_PRONTOS):
// 1. Cabeçalho de ofício: "Autos nº ... — classe", "Réu: NOME (RG x, CPF y)"
//    por réu e "Juízo: ...";
// 2. Só o número, com máscara ou só com os 20 dígitos;
// 3. Réus com documentos: um por linha, nome, RG e CPF;
// 4. Só os CPFs: só números, um por linha;
// 5. Linha para planilha: número, classe, réu e CPF separados por TAB (cola
//    em colunas no Excel); vários réus = uma linha por réu.
// Formatos personalizados: nome + texto com as mesmas variáveis {…} do
// Juntar Documento (variaveisProcesso.js), em chrome.storage.local
// (FORMATOS_KEY, que entra no backup do Menu).
//
// Dados que faltam: se o texto ficaria com algo vazio (classe, réus, juízo,
// variável sem valor), NADA é copiado — o painel diz o que ficou vazio e
// oferece "Copiar assim mesmo", que copia sem essas partes.
//
// Onde fica o botão: Projudi, na linha do "📋 Colar processo", depois da
// cadeia "⚖️ Advogados" → "👥 Partes" → "📎 Juntar Documento"; SEEU (sem o
// "Colar processo"), depois do "⭐ Minhas Preferências"/"📍 Localizador" (e
// do "📎 Juntar Documento", se houver). Só nas telas de processo: o botão
// só aparece quando a tela tem o número do processo no cabeçalho.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpCopiarDados || !/^\/(projudi|seeu)\//.test(location.pathname)) return;
	const VP = window.__pdpVariaveisProcesso; // variaveisProcesso.js (infraestrutura)
	if (!VP) return;
	const IS_SEEU = location.pathname.startsWith("/seeu/");
	window.__pdpCopiarDados = true;

	const FORMATOS_KEY = "pdpCopiarDadosFormatos"; // [{id, nome, texto, criadoEm, atualizadoEm}]
	// Botões da mesma fileira, na ordem: o "Copiar dados" vai depois do último
	// que existir (cada um se ancora no anterior; assim os MutationObservers
	// não disputam a mesma posição).
	const CADEIA = ["pdp-localizador-button", "pdp-habilitar-advogado-button", "pdp-editar-partes-button", "pdp-juntar-documento-button"];
	const LOG = "[Copiar dados]";

	function cleanText(text) {
		return (text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function storageGet(key, fallback) {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(key, function (data) {
					resolve(data && data[key] !== undefined ? data[key] : fallback);
				});
			} catch (err) {
				resolve(fallback);
			}
		});
	}

	function storageSet(key, value) {
		return new Promise(function (resolve, reject) {
			try {
				chrome.storage.local.set({ [key]: value }, function () {
					if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
					else resolve();
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	function carregarFormatos() {
		return storageGet(FORMATOS_KEY, []).then(function (lista) {
			return Array.isArray(lista) ? lista.filter(function (f) { return f && f.id && f.nome; }) : [];
		});
	}

	function salvarFormato(formato) {
		return carregarFormatos().then(function (lista) {
			const agora = Date.now();
			const idx = lista.findIndex(function (f) { return f.id === formato.id; });
			if (idx >= 0) lista[idx] = Object.assign({}, lista[idx], formato, { atualizadoEm: agora });
			else lista.push({ id: "f" + agora.toString(36) + Math.random().toString(36).slice(2, 6), nome: formato.nome, texto: formato.texto, criadoEm: agora, atualizadoEm: agora });
			return storageSet(FORMATOS_KEY, lista);
		});
	}

	function removerFormato(id) {
		return carregarFormatos().then(function (lista) {
			return storageSet(FORMATOS_KEY, lista.filter(function (f) { return f.id !== id; }));
		});
	}

	// -------------------------------------------------------------------
	// Dados do processo e formatos
	// -------------------------------------------------------------------

	function lerDados() {
		return { vars: VP.variaveisDoProcesso(document), reus: VP.reusDoProcesso(document) };
	}

	// Por que os réus ficaram vazios (complemento do aviso).
	function motivoReus(reus) {
		switch (reus.situacao) {
			case "carregando":
				return "Os réus ainda estão sendo lidos da aba Partes e Outros: tente de novo em instantes.";
			case "erro":
				return "Não foi possível ler os réus da aba Partes e Outros.";
			case "desativado":
				return 'Para os réus, ligue "Réus no cabeçalho" no Menu da extensão.';
			case "seeu":
				return "No SEEU, a extensão ainda não lê os réus.";
			default:
				return "Nenhum réu cadastrado no polo passivo.";
		}
	}

	// Réus sem CPF (ou sem RG e CPF): o texto sai, com um aviso.
	function avisosDocumentos(reus, soCpf) {
		return reus.filter(function (r) { return !r.cpf || (!soCpf && !r.rg); }).map(function (r) {
			if (soCpf || r.rg) return r.nome + ": sem CPF";
			return r.nome + (r.cpf ? ": sem RG" : ": sem RG e sem CPF");
		});
	}

	// Cada formato pronto devolve { texto, faltando, avisos }: `texto` já sem
	// as partes vazias; `faltando` (variáveis vazias) impede a cópia direta.
	const FORMATOS_PRONTOS = [
		{
			id: "oficio",
			nome: "Cabeçalho de ofício",
			icone: "📄",
			dica: "Autos nº … — classe, uma linha \"Réu: NOME (RG x, CPF y)\" por réu e \"Juízo: …\"",
			montar: function (d) {
				const v = d.vars;
				const reus = d.reus.reus;
				const faltando = [];
				const linhas = ["Autos nº " + v.numero_processo + (v.classe ? " — " + v.classe : "")];
				if (!v.classe) faltando.push("{classe}");
				reus.forEach(function (r) {
					const docs = [].concat(r.rg ? ["RG " + r.rg] : [], r.cpf ? ["CPF " + r.cpf] : []);
					linhas.push("Réu: " + r.nome + (docs.length ? " (" + docs.join(", ") + ")" : ""));
				});
				if (!reus.length) faltando.push("{reus}");
				if (v.juizo) linhas.push("Juízo: " + v.juizo);
				else faltando.push("{juizo}");
				return { texto: linhas.join("\n"), faltando: faltando, avisos: avisosDocumentos(reus, false) };
			},
		},
		{
			id: "numero",
			nome: "Só o número",
			icone: "🔢",
			dica: "Número do processo com pontos e traço",
			variante: { nome: "só dígitos", dica: "Os 20 dígitos, sem pontos e traço (para sistemas que pedem só números)" },
			montar: function (d, variante) {
				return { texto: variante ? d.vars.numero_sem_mascara : d.vars.numero_processo, faltando: [], avisos: [] };
			},
		},
		{
			id: "reus",
			nome: "Réus com documentos",
			icone: "👥",
			dica: "Um réu por linha: nome, RG e CPF",
			montar: function (d) {
				const reus = d.reus.reus;
				return { texto: reus.map(VP.reuEmLinha).join("\n"), faltando: reus.length ? [] : ["{reus}"], avisos: avisosDocumentos(reus, false) };
			},
		},
		{
			id: "cpfs",
			nome: "Só os CPFs",
			icone: "🪪",
			dica: "CPFs dos réus só com números, um por linha (Sisbajud, Infojud, BNMP…)",
			montar: function (d) {
				const reus = d.reus.reus;
				const cpfs = reus.map(function (r) { return VP.soDigitos(r.cpf); }).filter(Boolean);
				return { texto: cpfs.join("\n"), faltando: cpfs.length ? [] : [reus.length ? "{cpfs}" : "{reus}"], avisos: cpfs.length ? avisosDocumentos(reus, true) : [] };
			},
		},
		{
			id: "planilha",
			nome: "Linha para planilha",
			icone: "📊",
			dica: "Número, classe, réu e CPF separados por TAB: cole numa célula do Excel e cada dado vai para uma coluna (uma linha por réu)",
			montar: function (d) {
				const v = d.vars;
				const reus = d.reus.reus;
				const faltando = [];
				if (!v.classe) faltando.push("{classe}");
				if (!reus.length) faltando.push("{reus}");
				const linhas = (reus.length ? reus : [{ nome: "", cpf: "" }]).map(function (r) {
					return [v.numero_processo, v.classe || "", r.nome, r.cpf || ""].join("\t");
				});
				return { texto: linhas.join("\n"), faltando: faltando, avisos: avisosDocumentos(reus, true) };
			},
		},
	];

	// Formato personalizado: troca as variáveis; {perguntar:Texto} pede o
	// valor na hora (null = cancelado).
	function montarPersonalizado(formato, d) {
		const vars = Object.assign({}, d.vars);
		const perguntas = VP.perguntasDoTexto(formato.texto);
		for (let i = 0; i < perguntas.length; i++) {
			const resposta = window.prompt(formato.nome + "\n\n" + perguntas[i] + ":", "");
			if (resposta === null) return null;
			vars["perguntar:" + perguntas[i]] = resposta.trim();
		}
		const r = VP.aplicarTexto(formato.texto, vars);
		return { texto: r.texto, semFaltando: r.semFaltando, faltando: r.faltando, avisos: [] };
	}

	// -------------------------------------------------------------------
	// Área de transferência
	// -------------------------------------------------------------------

	async function copiarTexto(texto) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(texto);
				return true;
			}
		} catch (err) {
			console.warn(LOG, "clipboard.writeText falhou; tentando o modo antigo:", err);
		}
		const area = document.createElement("textarea");
		area.value = texto;
		area.setAttribute("readonly", "");
		area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
		document.body.appendChild(area);
		area.select();
		let ok = false;
		try {
			ok = document.execCommand("copy");
		} catch (err) {
			ok = false;
		}
		area.remove();
		return ok;
	}

	// -------------------------------------------------------------------
	// Botão na fileira da extensão
	// -------------------------------------------------------------------

	let button = null;
	let panel = null;

	function reconcileButton() {
		const base = document.getElementById(IS_SEEU ? "pdp-fav-prefs-button" : "pdp-clipboard-button");
		if (!base || !VP.numeroProcesso(document)) {
			if (button && button.isConnected) {
				closePanel();
				button.remove();
			}
			return;
		}
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.id = "pdp-copiar-dados-button";
			button.className = "pdp-qa-group-btn";
			button.textContent = "📄 Copiar dados";
			button.title = "Copiar número, classe, réus (RG e CPF) e juízo deste processo, num formato pronto para ofício, e-mail, planilha ou sistemas do CNJ";
			button.addEventListener("click", function (e) {
				e.stopPropagation();
				if (panel) closePanel();
				else openPanel();
			});
		}
		let anchor = base;
		CADEIA.forEach(function (id) {
			const el = document.getElementById(id);
			if (el && el.parentElement === base.parentElement) anchor = el;
		});
		if (button.previousElementSibling !== anchor || button.parentElement !== anchor.parentElement) {
			anchor.insertAdjacentElement("afterend", button);
		}
	}

	new MutationObserver(reconcileButton).observe(document.documentElement, { childList: true, subtree: true });
	reconcileButton();

	// -------------------------------------------------------------------
	// Painel
	// -------------------------------------------------------------------

	function closePanel() {
		if (panel) panel.remove();
		panel = null;
		if (button) button.classList.remove("pdp-qa-active");
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onPanelKeydown, true);
	}

	function onOutsideClick(e) {
		if (panel && !panel.contains(e.target) && e.target !== button) closePanel();
	}

	function onPanelKeydown(e) {
		if (e.key === "Escape") closePanel();
	}

	function positionPanel() {
		if (!panel || !button) return;
		const rect = button.getBoundingClientRect();
		const margin = 12;
		const above = rect.top - margin - 6;
		const below = window.innerHeight - rect.bottom - margin - 6;
		const openAbove = above >= below;
		panel.style.maxHeight = Math.max(120, openAbove ? above : below) + "px";
		panel.style.top = openAbove ? "auto" : rect.bottom + 6 + "px";
		panel.style.bottom = openAbove ? window.innerHeight - rect.top + 6 + "px" : "auto";
		const width = panel.offsetWidth || 330;
		let left = rect.right - width;
		if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
		panel.style.left = Math.max(margin, Math.round(left)) + "px";
		panel.style.right = "auto";
	}

	function elemento(tag, props, filhos) {
		const node = document.createElement(tag);
		Object.keys(props || {}).forEach(function (k) {
			if (k === "text") node.textContent = props[k];
			else if (k === "onclick") node.addEventListener("click", props[k]);
			else if (k === "class") node.className = props[k];
			else node.setAttribute(k, props[k]);
		});
		(filhos || []).forEach(function (f) { if (f) node.appendChild(f); });
		return node;
	}

	function openPanel() {
		closePanel();
		panel = elemento("div", { class: "pdp-qa-panel pdp-cd-panel" });
		document.body.appendChild(panel);
		button.classList.add("pdp-qa-active");
		renderLista();
		setTimeout(function () {
			document.addEventListener("click", onOutsideClick, true);
			document.addEventListener("keydown", onPanelKeydown, true);
		}, 0);
	}

	// Situação (resultado da cópia ou aviso), no rodapé do painel.
	function mostrarSituacao(info) {
		if (!panel) return;
		let box = panel.querySelector(".pdp-cd-situacao");
		if (!box) {
			box = elemento("div", { class: "pdp-cd-situacao" });
			panel.appendChild(box);
		}
		box.textContent = "";
		box.className = "pdp-cd-situacao pdp-cd-" + info.tipo;
		box.appendChild(elemento("div", { class: "pdp-cd-situacao-titulo", text: info.titulo }));
		(info.linhas || []).forEach(function (l) { box.appendChild(elemento("div", { text: l })); });
		if (info.previa) box.appendChild(elemento("pre", { class: "pdp-cd-previa", text: info.previa }));
		(info.botoes || []).forEach(function (b) { box.appendChild(elemento("button", { type: "button", class: "pdp-qa-open-btn pdp-cd-situacao-btn", text: b.texto, onclick: b.onclick })); });
		positionPanel();
	}

	function previa(texto) {
		const linhas = texto.split("\n");
		const curto = linhas.slice(0, 6).join("\n").replace(/\t/g, " ⇥ ");
		return linhas.length > 6 ? curto + "\n… (+" + (linhas.length - 6) + " linha(s))" : curto;
	}

	async function copiarResultado(nome, texto, avisos) {
		if (!cleanText(texto)) {
			mostrarSituacao({ tipo: "aviso", titulo: "⚠️ Nada para copiar em \"" + nome + "\": os dados não estão nesta tela." });
			return;
		}
		const ok = await copiarTexto(texto);
		if (!ok) {
			mostrarSituacao({ tipo: "aviso", titulo: "⚠️ O navegador não deixou copiar. Selecione o texto abaixo e use Ctrl+C:", previa: texto });
			return;
		}
		mostrarSituacao({
			tipo: "ok",
			titulo: "✅ Copiado — " + nome + (avisos && avisos.length ? " (atenção: " + avisos.join("; ") + ")" : ""),
			previa: previa(texto),
		});
	}

	// Aplica um formato: com tudo preenchido, copia; senão, avisa o que
	// ficou vazio e oferece "Copiar assim mesmo" (sem as partes vazias).
	function usarFormato(nome, r, reus) {
		if (!r) return; // {perguntar:…} cancelado
		if (!r.faltando.length) {
			copiarResultado(nome, r.texto, r.avisos);
			return;
		}
		const textoParcial = r.semFaltando !== undefined ? r.semFaltando : r.texto;
		const linhas = ["Sem valor neste processo: " + r.faltando.join(", ") + ". Nada foi copiado."];
		if (r.faltando.some(function (m) { return /\{\s*(reus|reus_linhas|cpfs)\s*\}/i.test(m); })) linhas.push(motivoReus(reus));
		mostrarSituacao({
			tipo: "aviso",
			titulo: "⚠️ " + nome,
			linhas: linhas,
			botoes: cleanText(textoParcial)
				? [{ texto: "Copiar assim mesmo (sem o que ficou vazio)", onclick: function (e) { e.stopPropagation(); copiarResultado(nome, textoParcial, r.avisos); } }]
				: [],
		});
	}

	function renderLista() {
		if (!panel) return;
		panel.textContent = "";
		const action = elemento("div", { class: "pdp-qa-action" });
		action.appendChild(elemento("div", { class: "pdp-qa-action-header" }, [elemento("span", { class: "pdp-qa-action-label", text: "Copiar dados do processo" })]));

		const prontos = elemento("div", { class: "pdp-cd-formatos" });
		FORMATOS_PRONTOS.forEach(function (f) {
			const linha = elemento("div", { class: "pdp-cd-formato-linha" });
			linha.appendChild(elemento("button", {
				type: "button", class: "pdp-cd-formato", "data-formato": f.id, title: f.dica,
				onclick: function (e) { e.stopPropagation(); const d = lerDados(); usarFormato(f.nome, f.montar(d, false), d.reus); },
			}, [elemento("span", { class: "pdp-cd-icone", text: f.icone }), elemento("span", { text: f.nome })]));
			if (f.variante) {
				linha.appendChild(elemento("button", {
					type: "button", class: "pdp-qa-open-btn pdp-cd-variante", "data-formato": f.id + "-variante", title: f.variante.dica, text: f.variante.nome,
					onclick: function (e) { e.stopPropagation(); const d = lerDados(); usarFormato(f.nome + " (" + f.variante.nome + ")", f.montar(d, true), d.reus); },
				}));
			}
			prontos.appendChild(linha);
		});
		action.appendChild(prontos);

		action.appendChild(elemento("div", { class: "pdp-cd-subtitulo", text: "Meus formatos" }));
		const meus = elemento("div", { class: "pdp-qa-prefs" });
		action.appendChild(meus);
		action.appendChild(elemento("button", {
			type: "button", class: "pdp-qa-pref-new", text: "+ Novo formato",
			title: "Criar um formato seu: um nome e um texto com as variáveis {…} (número, classe, réus, CPFs, juízo, data…)",
			onclick: function (e) { e.stopPropagation(); renderEditor(null); },
		}));
		panel.appendChild(action);
		positionPanel();

		carregarFormatos().then(function (lista) {
			if (!panel || !meus.isConnected) return;
			if (!lista.length) meus.appendChild(elemento("div", { class: "pdp-qa-empty", text: "Nenhum formato seu ainda. Use \"+ Novo formato\"." }));
			lista.forEach(function (f) {
				meus.appendChild(elemento("span", { class: "pdp-qa-pref-chip" }, [
					elemento("button", {
						type: "button", class: "pdp-qa-pref-btn", text: "★ " + f.nome, title: "Copiar:\n" + f.texto,
						onclick: function (e) { e.stopPropagation(); const d = lerDados(); usarFormato(f.nome, montarPersonalizado(f, d), d.reus); },
					}),
					elemento("button", { type: "button", class: "pdp-qa-pref-edit", text: "✏️", title: "Editar este formato", onclick: function (e) { e.stopPropagation(); renderEditor(f); } }),
					elemento("button", {
						type: "button", class: "pdp-qa-pref-del", text: "🗑", title: "Remover este formato",
						onclick: function (e) {
							e.stopPropagation();
							if (!confirm('Remover o formato "' + f.nome + '"?')) return;
							removerFormato(f.id).then(renderLista);
						},
					}),
				]));
			});
			positionPanel();
		});
	}

	// Criar (formato = null) ou editar um formato personalizado.
	function renderEditor(formato) {
		if (!panel) return;
		panel.textContent = "";
		const action = elemento("div", { class: "pdp-qa-action pdp-cd-editor" });
		action.appendChild(elemento("div", { class: "pdp-qa-action-header" }, [elemento("span", { class: "pdp-qa-action-label", text: formato ? "Editar formato" : "Novo formato" })]));
		const nome = elemento("input", { type: "text", class: "pdp-cd-nome", placeholder: "Nome (ex.: Ofício à Delegacia)", maxlength: "60" });
		nome.value = formato ? formato.nome : "";
		const texto = elemento("textarea", { class: "pdp-cd-texto", rows: "6", placeholder: "Texto, com as variáveis entre chaves. Ex.:\nProcesso {numero_processo}\n{reus_linhas}" });
		texto.value = formato ? formato.texto : "";
		action.appendChild(elemento("label", { class: "pdp-cd-rotulo", text: "Nome" }));
		action.appendChild(nome);
		action.appendChild(elemento("label", { class: "pdp-cd-rotulo", text: "Texto" }));
		action.appendChild(texto);

		const ajuda = elemento("div", { class: "pdp-cd-vars" });
		ajuda.appendChild(elemento("div", { text: "Clique numa variável para colocá-la no texto:" }));
		Object.keys(VP.VARIAVEIS_PROCESSO).concat(["perguntar"]).forEach(function (v) {
			const marca = v === "perguntar" ? "{perguntar:Texto}" : "{" + v + "}";
			ajuda.appendChild(elemento("button", {
				type: "button", class: "pdp-cd-var", text: marca,
				title: v === "perguntar" ? "a extensão pergunta o valor na hora de copiar" : VP.VARIAVEIS_PROCESSO[v],
				onclick: function (e) {
					e.stopPropagation();
					const ini = texto.selectionStart != null ? texto.selectionStart : texto.value.length;
					const fim = texto.selectionEnd != null ? texto.selectionEnd : ini;
					texto.value = texto.value.slice(0, ini) + marca + texto.value.slice(fim);
					texto.focus();
					texto.selectionStart = texto.selectionEnd = ini + marca.length;
				},
			}));
		});
		action.appendChild(ajuda);

		const erro = elemento("div", { class: "pdp-cd-erro" });
		action.appendChild(erro);
		action.appendChild(elemento("div", { class: "pdp-cd-editor-botoes" }, [
			elemento("button", {
				type: "button", class: "pdp-qa-open-btn pdp-cd-salvar", text: "Salvar",
				onclick: function (e) {
					e.stopPropagation();
					const n = cleanText(nome.value);
					const t = texto.value.replace(/\s+$/, "");
					if (!n || !cleanText(t)) {
						erro.textContent = "Preencha o nome e o texto.";
						return;
					}
					salvarFormato({ id: formato ? formato.id : undefined, nome: n, texto: t })
						.then(renderLista)
						.catch(function (err) { erro.textContent = "Não foi possível salvar: " + err.message; });
				},
			}),
			elemento("button", { type: "button", class: "pdp-qa-open-btn", text: "Cancelar", onclick: function (e) { e.stopPropagation(); renderLista(); } }),
		]));
		panel.appendChild(action);
		positionPanel();
		nome.focus();
	}
})();
