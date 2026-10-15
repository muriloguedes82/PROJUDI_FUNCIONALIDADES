// Projudi - Prioridades no cabeçalho do processo (incluir, remover e
// preferências)
//
// Incluir ou remover uma prioridade hoje exige: abrir a aba "Informações
// Gerais", clicar no botão nativo "Alterar" (barra de botões ao final dela),
// que leva à tela de alteração do processo (processoEdicao.do, formulário
// processoEdicaoForm), clicar na lupa da linha "Prioridade" (campo só de
// leitura descricaoTiposPrioridade), marcar/desmarcar as prioridades na
// janela "Seleção de Prioridade" e clicar em "Selecionar" e depois em
// "Salvar".
//
// A janela de seleção (quadro com /projudi/tipoPrioridade.do?actionType=
// iniciarSelecao&tipoDisponibilidade=P&idTiposPrioridade=...&parentForm=
// processoEdicaoForm, formulário tipoPrioridadeForm) é uma lista de caixas
// de marcação (idTiposPrioridadeSelecionados = id da prioridade, com o
// nome no <label for>), já marcadas as que o processo tem; "Selecionar"
// (selectButton) leva a escolha à tela de alteração, que só a grava no
// "Salvar" (saveButton).
//
// A linha "Prioridade:" do cabeçalho (`table#informacoesProcessuais`,
// visível em qualquer aba) mostra todas as prioridades numa só frase, em
// <em class="attentionBold">, separadas por vírgula — inclusive as que o
// Projudi atribui sozinho (idade, réu preso, ...), que NÃO aparecem na
// janela de seleção e não podem ser removidas por ela. Este recurso:
// - ✖ ao lado de cada prioridade: depois de confirmar, carrega a tela de
//   alteração num quadro oculto, abre a lupa, desmarca a prioridade, clica
//   em "Selecionar", confere que ela saiu do campo "Prioridade" e só então
//   clica em "Salvar". O ✖ só aparece nas prioridades que constam da
//   janela de seleção (lista guardada em CATALOGO_KEY cada vez que a
//   extensão abre a janela); enquanto essa lista não é conhecida, aparece
//   em todas, e numa prioridade automática avisa que ela não pode ser
//   removida.
// - "➕ Incluir": abre a tela de alteração no POPUP das Ações rápidas
//   (`openActionModal` em quickActions.js) já com a janela de seleção
//   aberta; marcadas as prioridades e clicado "Selecionar", a extensão
//   clica em "Salvar" sozinha, o popup fecha e a tela é recarregada.
// - ⭐ (preferências): uma inclusão/remoção gravada uma vez e depois
//   executada com um clique, sem confirmação. Gravar: a mesma tela no
//   popup; o "Selecionar" da janela é barrado (o processo não muda) e a
//   extensão guarda o que foi marcado e desmarcado. Executar: o mesmo
//   caminho do ✖, marcando/desmarcando o que foi gravado. Também entram
//   nos combos (etapa direta "Prioridades" em quickActions.js).
// Sem linha "Prioridade:" no cabeçalho (processo sem prioridade), a
// extensão põe uma, com "(nenhuma)", o "➕ Incluir" e a ⭐.
//
// A URL da tela de alteração é a do `onclick` do botão nativo "Alterar"
// (id="editButton"), lida da aba "Informações Gerais" com
// `__pdpLerAbaProcesso` (habilitarAdvogado.js) — o mesmo caminho de
// alterarClasseAssuntos.js e alterarValorCausa.js.
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

	if (window.__pdpAlterarPrioridades) return;
	window.__pdpAlterarPrioridades = true;

	const EDICAO_PATH = "/projudi/processoEdicao.do";
	const FORM_ID = "processoEdicaoForm";
	const CAMPO_ID = "descricaoTiposPrioridade";
	const JANELA_FORM_ID = "tipoPrioridadeForm";
	const CAIXA_NAME = "idTiposPrioridadeSelecionados";
	const LABEL = "Prioridades";
	const LINK_CLASS = "pdp-prioridade-link";
	const PREF_BTN_CLASS = "pdp-prioridade-pref";
	const REMOVER_CLASS = "pdp-prioridade-remover";
	const ITEM_ATTR = "data-pdp-prioridades";
	const ROW_ATTR = "data-pdp-prioridade-linha";
	const PANEL_ID = "pdp-prioridade-painel";
	const STATUS_ID = "pdp-prioridade-status";
	const AVISO_ID = "pdp-prioridade-aviso";
	const PREFS_KEY = "pdpPrioridadesPrefs";
	const CATALOGO_KEY = "pdpPrioridadesCatalogo";
	const RECARGA_MS = 1200;
	const EXEC_TIMEOUT_MS = 30000;
	const JANELA_TIMEOUT_MS = 20000;

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

	// Espera `teste()` devolver algo verdadeiro (ou falha com `erro`).
	async function esperar(teste, ms, erro) {
		const fim = Date.now() + ms;
		while (Date.now() < fim) {
			let r = null;
			try {
				r = teste();
			} catch (err) {
				r = null;
			}
			if (r) return r;
			await pausa(250);
		}
		throw new Error(erro);
	}

	// -------------------------------------------------------------------
	// Tela de alteração: endereço, linha "Prioridade" e janela de seleção
	// -------------------------------------------------------------------

	// Botão nativo, na barra ao final da aba "Informações Gerais" (ver
	// alterarClasseAssuntos.js).
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

	function linhaPrioridade(doc) {
		const campo = doc.getElementById(CAMPO_ID);
		return campo ? campo.closest("tr") : null;
	}

	// Lupa da linha "Prioridade" (<a class="searchButton" title="Seleção de
	// Prioridade">).
	function lupa(doc) {
		const linha = linhaPrioridade(doc);
		return linha ? linha.querySelector("a.searchButton, .searchButton") : null;
	}

	// Abre a lupa da Prioridade. Ela é um link "javascript:…", e o Chrome
	// não deixa a extensão executá-lo (nem com `click()`, nem com um
	// <script> posto na tela: "Running the JavaScript URL violates the
	// following Content Security Policy…"), e a janela não abria. O clique
	// é feito pelo background, no mundo da própria página
	// (clickPrioridadeLupa em background.js), no link marcado com um token.
	function abrirLupa(el) {
		const token = crypto.randomUUID();
		el.setAttribute("data-pdp-prioridade-lupa", token);
		return new Promise(function (resolve, reject) {
			try {
				chrome.runtime.sendMessage({ source: "projudi-preview", type: "prioridade-lupa-click", token: token }, function (resposta) {
					const erro = chrome.runtime.lastError;
					if (erro || !resposta || !resposta.ok) {
						reject(new Error("não consegui abrir a lupa da Prioridade (" + (erro ? erro.message : resposta && resposta.error ? resposta.error : "sem resposta") + ")."));
						return;
					}
					resolve();
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	// Estado da prioridade na tela de alteração: a descrição e os campos com
	// "prioridade" no nome (os ocultos que a janela de seleção preenche).
	// Muda quando o "Selecionar" da janela é aplicado.
	function assinatura(doc) {
		const form = doc && doc.getElementById(FORM_ID);
		if (!form) return null;
		const partes = [];
		Array.prototype.forEach.call(form.elements, function (el) {
			if (!el.name || !/prioridade/i.test(el.name)) return;
			const tipo = (el.type || "").toLowerCase();
			if ((tipo === "radio" || tipo === "checkbox") && !el.checked) return;
			partes.push(el.name + "=" + el.value);
		});
		return partes.join("|");
	}

	function descricaoAtual(doc) {
		const campo = doc && doc.getElementById(CAMPO_ID);
		return campo ? normalize(campo.value) : "";
	}

	// Documento da janela "Seleção de Prioridade" aberta dentro da tela de
	// alteração: { quadro, doc } ou null. `nova`: ignora as janelas já
	// usadas (marcadas com __pdpUsada).
	function janela(doc, nova) {
		const quadros = doc ? doc.querySelectorAll("iframe, frame") : [];
		for (let i = 0; i < quadros.length; i++) {
			try {
				const d = quadros[i].contentDocument;
				if (d && d.getElementById(JANELA_FORM_ID) && !(nova && d.__pdpUsada)) return { quadro: quadros[i], doc: d };
			} catch (err) {
				// quadro de outra origem — ignora
			}
		}
		return null;
	}

	// [{ id, descricao, caixa }] das prioridades da janela de seleção.
	function itensDaJanela(dlg) {
		return Array.prototype.map.call(dlg.querySelectorAll('input[name="' + CAIXA_NAME + '"]'), function (caixa) {
			let rotulo = caixa.id ? dlg.querySelector('label[for="' + caixa.id + '"]') : null;
			if (!rotulo) {
				const tr = caixa.closest("tr");
				rotulo = tr ? tr.querySelector("label") || tr.cells[tr.cells.length - 1] : null;
			}
			return { id: caixa.value, descricao: limpa(rotulo ? rotulo.textContent : caixa.value), caixa: caixa };
		});
	}

	// Mesma prioridade? Pelo id, se houver; senão, pelo nome (o cabeçalho
	// pode acrescentar algo ao fim do nome, ex. um prazo entre parênteses).
	function mesmoNome(a, b) {
		const x = normalize(a);
		const y = normalize(b);
		return !!x && !!y && (x === y || x.indexOf(y + " ") === 0 || y.indexOf(x + " ") === 0);
	}

	function acharItem(itens, alvo) {
		if (alvo.id) {
			const porId = itens.filter(function (it) { return it.id === String(alvo.id); })[0];
			if (porId) return porId;
		}
		return itens.filter(function (it) { return mesmoNome(it.descricao, alvo.descricao); })[0] || null;
	}

	// O campo "Prioridade" da tela mostra (ou não) esta prioridade?
	function campoTem(doc, descricao) {
		const atual = descricaoAtual(doc);
		const nome = normalize(descricao);
		return !!nome && atual.indexOf(nome) !== -1;
	}

	// Mensagem de erro/aviso que o Projudi mostra na própria tela.
	function mensagemDaTela(doc) {
		const el = doc.querySelector(".error, .errors, .erro, .mensagemErro, #errorMessages, .alert, .warning, .message, .msg");
		const texto = (el ? el.textContent : "").replace(/\s+/g, " ").trim();
		return texto.slice(0, 400);
	}

	function respostaDoSalvar(doc) {
		const form = doc && doc.getElementById(FORM_ID);
		const texto = doc && doc.body ? doc.body.textContent || "" : "";
		if (!form || doc.defaultView.location.pathname !== EDICAO_PATH) return { ok: true };
		if (/sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) return { ok: true };
		return { ok: false, mensagem: mensagemDaTela(doc) || alertas.join("\n") };
	}

	// Alertas do Projudi durante a execução automática (entram na mensagem
	// de erro, se houver).
	let alertas = [];

	// confirm nativo ("Deseja realmente…?") é aceito, como o usuário faria;
	// alertas são guardados em `alertas`.
	function semDialogos(win) {
		try {
			if (!win || win.__pdpSemDialogos) return;
			win.__pdpSemDialogos = true;
			win.confirm = function () { return true; };
			win.alert = function (msg) {
				alertas.push(limpa(msg));
				console.info("[Prioridades] alerta do Projudi:", msg);
			};
		} catch (err) {
			// segue
		}
	}

	// -------------------------------------------------------------------
	// Lista das prioridades da janela de seleção (decide onde vai o ✖)
	// -------------------------------------------------------------------

	let catalogo = null; // nomes normalizados; null = ainda não lido

	function carregarCatalogo() {
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.get(CATALOGO_KEY, function (data) {
					resolve(data && Array.isArray(data[CATALOGO_KEY]) ? data[CATALOGO_KEY] : []);
				});
			} catch (err) {
				resolve([]);
			}
		});
	}

	// Acrescenta ao catálogo os nomes da janela `dlg` (cada perfil/vara pode
	// ver uma lista diferente; a união vale para todas).
	function guardarCatalogo(dlg) {
		const nomes = itensDaJanela(dlg).map(function (it) { return normalize(it.descricao); }).filter(Boolean);
		const atual = catalogo || [];
		const novos = nomes.filter(function (n) { return atual.indexOf(n) === -1; });
		if (!novos.length) return;
		catalogo = atual.concat(novos);
		try {
			const data = {};
			data[CATALOGO_KEY] = catalogo;
			chrome.storage.local.set(data);
		} catch (err) {
			// segue
		}
		marcarCabecalhoParaRefazer();
	}

	// A prioridade do cabeçalho pode ser removida pela janela de seleção?
	// Sem catálogo, na dúvida, sim (a remoção avisa se não puder).
	function removivel(nome) {
		if (!catalogo || !catalogo.length) return true;
		return catalogo.some(function (n) { return mesmoNome(n, nome); });
	}

	// -------------------------------------------------------------------
	// Execução automática: quadro oculto → lupa → marcar → Selecionar →
	// confere → Salvar
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

	// Próxima carga de `quadro` (resolve com o documento novo).
	function proximaCarga(quadro, ms, erro) {
		return new Promise(function (resolve, reject) {
			const limite = setTimeout(function () {
				quadro.removeEventListener("load", aoCarregar);
				reject(new Error(erro || "o Projudi demorou demais para responder."));
			}, ms || EXEC_TIMEOUT_MS);
			function aoCarregar() {
				let d = null;
				try {
					if (quadro.contentWindow.location.href === "about:blank") return;
					d = quadro.contentDocument;
				} catch (err) {
					d = null;
				}
				clearTimeout(limite);
				quadro.removeEventListener("load", aoCarregar);
				try {
					semDialogos(quadro.contentWindow);
				} catch (err) {
					// segue
				}
				resolve(d);
			}
			quadro.addEventListener("load", aoCarregar);
		});
	}

	function criarQuadroOculto() {
		const quadro = document.createElement("iframe");
		quadro.setAttribute("data-pdp-loader", "");
		quadro.setAttribute("aria-hidden", "true");
		quadro.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1024px;height:768px;visibility:hidden";
		document.body.appendChild(quadro);
		return quadro;
	}

	function nomes(lista) {
		return lista.map(function (p) { return '"' + p.descricao + '"'; }).join(", ");
	}

	function comAvisos(doc) {
		const textos = [doc ? mensagemDaTela(doc) : ""].concat(alertas).filter(Boolean);
		return textos.length ? "\n\n" + textos.join("\n") : "";
	}

	// Abre a lupa de novo e lê a janela: [{ id, descricao, caixa }] com a
	// escolha que a tela de alteração está guardando para o "Salvar".
	async function releituraDaJanela(doc) {
		const anterior = janela(doc);
		if (anterior) anterior.doc.__pdpUsada = true;
		const botaoLupa = lupa(doc);
		if (!botaoLupa) return null;
		await abrirLupa(botaoLupa);
		const jan = await esperar(function () {
			const j = janela(doc, true);
			return j && j.doc.querySelector('input[name="' + CAIXA_NAME + '"]') ? j : null;
		}, JANELA_TIMEOUT_MS, "a janela de seleção de prioridade não abriu de novo para conferir a escolha. Nada foi salvo.");
		semDialogos(jan.quadro.contentWindow);
		return itensDaJanela(jan.doc);
	}

	// Aplica `alteracao` = { adicionar: [{ id, descricao }], remover: [...] }
	// e salva. Devolve { jaEstava } (nada a fazer), { automatica: [nomes] }
	// (só havia prioridades que a janela não mostra), { ok: true } ou
	// { ok: false, mensagem }; erros de tela viram exceção (nada é salvo).
	async function aplicarNoQuadro(alteracao, titulo) {
		const adicionar = alteracao.adicionar || [];
		const remover = alteracao.remover || [];
		const url = await urlDaEdicao();
		alertas = [];
		const quadro = criarQuadroOculto();
		try {
			let carga = proximaCarga(quadro);
			quadro.src = url;
			let doc = await carga;
			if (!doc || !doc.getElementById(FORM_ID)) throw new Error("a tela de alteração do processo não abriu.");
			const botaoLupa = lupa(doc);
			if (!botaoLupa) throw new Error('não encontrei a lupa da linha "Prioridade" na tela de alteração — talvez seu perfil não possa alterar as prioridades deste processo.');
			const antes = assinatura(doc);

			mostrarStatus(titulo + " — abrindo a seleção de prioridade…");
			await abrirLupa(botaoLupa);
			const jan = await esperar(function () {
				const j = janela(doc);
				return j && j.doc.getElementById("selectButton") && j.doc.querySelector('input[name="' + CAIXA_NAME + '"]') ? j : null;
			}, JANELA_TIMEOUT_MS, "a janela de seleção de prioridade não abriu.");
			semDialogos(jan.quadro.contentWindow);
			guardarCatalogo(jan.doc);

			const itens = itensDaJanela(jan.doc);
			const faltando = [];
			const automaticas = [];
			let mudou = false;
			adicionar.forEach(function (p) {
				const it = acharItem(itens, p);
				if (!it) {
					faltando.push(p);
					return;
				}
				if (!it.caixa.checked) {
					it.caixa.click();
					mudou = true;
				}
			});
			if (faltando.length) {
				throw new Error((faltando.length === 1 ? "a prioridade " : "as prioridades ") + nomes(faltando) + " não aparece" + (faltando.length === 1 ? "" : "m") + " na janela de seleção deste processo. Nada foi salvo.");
			}
			remover.forEach(function (p) {
				const it = acharItem(itens, p);
				if (!it) {
					automaticas.push(p.descricao);
					return;
				}
				if (it.caixa.checked) {
					it.caixa.click();
					mudou = true;
				}
			});
			// Confere que as caixas ficaram como deviam (alguma pode estar
			// travada pelo Projudi).
			adicionar.forEach(function (p) {
				const it = acharItem(itens, p);
				if (it && !it.caixa.checked) throw new Error('não consegui marcar a prioridade "' + it.descricao + '". Nada foi salvo.');
			});
			remover.forEach(function (p) {
				const it = acharItem(itens, p);
				if (it && it.caixa.checked) throw new Error('não consegui desmarcar a prioridade "' + it.descricao + '". Nada foi salvo.');
			});
			if (!mudou) return automaticas.length ? { automatica: automaticas } : { jaEstava: true };

			const selecionar = jan.doc.getElementById("selectButton");
			mostrarStatus(titulo + " — selecionando…");
			jan.doc.__pdpUsada = true;
			selecionar.click();
			// O "Selecionar" pode atualizar a tela de alteração ou recarregá-la
			// inteira: vale a que estiver no quadro quando a prioridade mudar.
			try {
				doc = await esperar(function () {
					const d = quadro.contentDocument;
					if (!d || !d.getElementById(FORM_ID)) return null;
					semDialogos(quadro.contentWindow);
					const a = assinatura(d);
					return a !== null && a !== antes ? d : null;
				}, JANELA_TIMEOUT_MS, "");
			} catch (err) {
				throw new Error("a tela de alteração não mostrou a mudança da prioridade depois de \"Selecionar\". Nada foi salvo." + comAvisos(quadro.contentDocument));
			}
			await pausa(300);
			doc = quadro.contentDocument;
			// Confere pelo campo "Prioridade" (nomes por extenso); se o campo
			// não bastar para dizer, pela própria janela, aberta de novo.
			const conferePeloCampo = adicionar.every(function (p) { return campoTem(doc, acharItem(itens, p).descricao); }) &&
				remover.every(function (p) {
					const it = acharItem(itens, p);
					return !it || !campoTem(doc, it.descricao);
				});
			if (!conferePeloCampo) {
				mostrarStatus(titulo + " — conferindo a escolha…");
				const relidos = await releituraDaJanela(doc);
				if (!relidos) throw new Error('não consegui conferir a prioridade na tela de alteração. Nada foi salvo.' + comAvisos(doc));
				const naoEntrou = adicionar.filter(function (p) {
					const it = acharItem(relidos, p);
					return !it || !it.caixa.checked;
				});
				const naoSaiu = remover.filter(function (p) {
					const it = acharItem(relidos, p);
					return it && it.caixa.checked;
				});
				if (naoEntrou.length) throw new Error("a tela de alteração não ficou com " + nomes(naoEntrou) + " depois de \"Selecionar\". Nada foi salvo." + comAvisos(doc));
				if (naoSaiu.length) throw new Error("a tela de alteração continuou com " + nomes(naoSaiu) + " depois de \"Selecionar\". Nada foi salvo." + comAvisos(doc));
			}
			const salvar = doc.getElementById("saveButton");
			if (!salvar) throw new Error('não encontrei o botão "Salvar".');

			mostrarStatus(titulo + " — salvando…");
			carga = proximaCarga(quadro);
			salvar.click();
			return respostaDoSalvar(await carga);
		} finally {
			setTimeout(function () { quadro.remove(); }, 0);
		}
	}

	let ocupado = false;

	function textoAutomatica(lista) {
		return (lista.length === 1 ? "a prioridade " : "as prioridades ") + lista.map(function (n) { return '"' + n + '"'; }).join(", ") +
			(lista.length === 1 ? " é atribuída" : " são atribuídas") +
			" pelo próprio Projudi (pela idade, prisão ou outro dado das partes) e não " + (lista.length === 1 ? "aparece" : "aparecem") +
			' na "Seleção de Prioridade" — não dá para removê-la' + (lista.length === 1 ? "" : "s") + " por aqui. Nada foi alterado.";
	}

	async function removerPrioridade(descricao) {
		if (ocupado) return;
		if (!confirm('Remover a prioridade "' + descricao + '" deste processo?\n\nA alteração é salva em seguida, sem abrir a tela de alteração.')) return;
		ocupado = true;
		const titulo = "✖ " + descricao;
		try {
			mostrarStatus(titulo + " — abrindo a tela de alteração…");
			const resultado = await aplicarNoQuadro({ remover: [{ descricao: descricao }] }, titulo);
			esconderStatus();
			if (resultado.automatica) {
				alert(titulo + ": " + textoAutomatica(resultado.automatica));
				return;
			}
			if (resultado.jaEstava) {
				alert(titulo + ": a prioridade já não está marcada na tela de alteração do processo. Nada foi alterado.");
				return;
			}
			if (!resultado.ok) {
				alert(titulo + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse "➕ Incluir" (ou o botão "Alterar" da aba Informações Gerais) para ver a tela e fazer a alteração à mão.');
				return;
			}
			mostrarStatus(titulo + " — prioridade removida. Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			esconderStatus();
			alert(titulo + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	function descreverPref(pref) {
		const partes = [];
		if ((pref.adicionar || []).length) partes.push("Incluir a(s) prioridade(s) " + nomes(pref.adicionar));
		if ((pref.remover || []).length) partes.push((partes.length ? "remover " : "Remover ") + nomes(pref.remover));
		return partes.join(" e ") + " e salvar.";
	}

	// Faz o que a preferência manda; não recarrega nem avisa (fica com quem
	// chama: o clique na ⭐ ou uma etapa de combo).
	async function alterarConformePreferencia(pref, titulo) {
		mostrarStatus(titulo + " — abrindo a tela de alteração…");
		try {
			return await aplicarNoQuadro({ adicionar: pref.adicionar || [], remover: pref.remover || [] }, titulo);
		} finally {
			esconderStatus();
		}
	}

	function textoJaEstava() {
		return "o processo já está com as prioridades desta preferência. Nada foi alterado.";
	}

	async function executarPreferencia(pref) {
		if (ocupado) return;
		ocupado = true;
		const titulo = "★ " + pref.name;
		try {
			const resultado = await alterarConformePreferencia(pref, titulo);
			if (resultado.jaEstava || resultado.automatica) {
				alert(titulo + ": " + (resultado.automatica ? textoAutomatica(resultado.automatica) : textoJaEstava()));
				return;
			}
			if (!resultado.ok) {
				alert(titulo + ": o Projudi não aceitou a alteração." + (resultado.mensagem ? "\n\n" + resultado.mensagem : "") + '\n\nUse "➕ Incluir" para ver a tela e fazer a alteração à mão.');
				return;
			}
			mostrarStatus(titulo + " — alteração salva. Recarregando o processo…");
			window.location.reload();
		} catch (error) {
			alert(titulo + ": " + (error && error.message ? error.message : error));
		} finally {
			ocupado = false;
		}
	}

	// Para os combos de preferências (quickActions.js, etapa direta
	// "Prioridades"): `executar` resolve com { ok, texto, mudou } — ok também
	// quando o processo já estava assim — e não recarrega a tela.
	window.__pdpPrioridadesApi = {
		label: LABEL,
		preferencias: carregarPrefs,
		disponivel: function () { return !!document.getElementById("informacoesProcessuais"); },
		descrever: descreverPref,
		executar: async function (pref) {
			if (ocupado) return { ok: false, texto: "já há uma alteração de prioridade em andamento." };
			ocupado = true;
			try {
				const resultado = await alterarConformePreferencia(pref, "★ " + pref.name);
				if (resultado.jaEstava) return { ok: true, texto: textoJaEstava(), mudou: false };
				if (resultado.automatica) return { ok: true, texto: textoAutomatica(resultado.automatica), mudou: false };
				if (!resultado.ok) return { ok: false, texto: "o Projudi não aceitou a alteração." + (resultado.mensagem ? " " + resultado.mensagem : "") };
				return { ok: true, texto: "alteração salva.", mudou: true };
			} catch (error) {
				return { ok: false, texto: error && error.message ? error.message : String(error) };
			} finally {
				ocupado = false;
			}
		},
	};

	// -------------------------------------------------------------------
	// Popup: "➕ Incluir" (salva sozinho depois do "Selecionar") e gravação
	// de preferência ("Selecionar" barrado)
	// -------------------------------------------------------------------

	function avisar(doc, html) {
		const form = doc.getElementById(FORM_ID);
		if (!form || doc.getElementById(AVISO_ID)) return;
		const aviso = doc.createElement("div");
		aviso.id = AVISO_ID;
		aviso.style.cssText = "margin:6px 0 10px;padding:8px 10px;border:1px solid #d4b106;background:#fffbe6;color:#5c4400;font:12px Arial,sans-serif;border-radius:4px";
		aviso.innerHTML = html;
		form.insertBefore(aviso, form.firstChild);
	}

	// Rola até a linha "Prioridade", destaca-a e abre a lupa.
	function focarEAbrirLupa(doc) {
		const linha = linhaPrioridade(doc);
		if (!linha) return;
		try {
			linha.scrollIntoView({ block: "center" });
		} catch (err) {
			linha.scrollIntoView();
		}
		const anterior = linha.style.backgroundColor;
		linha.style.transition = "background-color 0.6s";
		linha.style.backgroundColor = "#fff3b0";
		setTimeout(function () {
			linha.style.backgroundColor = anterior;
		}, 1800);
		const botao = lupa(doc);
		if (!botao) return;
		setTimeout(function () {
			abrirLupa(botao).catch(function (err) {
				console.info("[Prioridades]", err.message);
				alert('Não consegui abrir a "Seleção de Prioridade" sozinho: clique na lupa da linha "Prioridade".');
			});
		}, 300);
	}

	// modo: { tipo: "incluir" } ou { tipo: "gravar", concluir(alteracao, fechar) }
	function acompanharPopup(iframe, api, modo) {
		let salvou = false;
		let salvando = false;
		let encerrado = false;
		let primeiraTela = true;
		let antes = null; // assinatura da prioridade ao abrir
		let marcadasAntes = null; // { id: descricao } marcadas na 1ª janela

		function encerrar(recarregar) {
			if (encerrado) return;
			encerrado = true;
			observer.disconnect();
			clearInterval(timer);
			if (iframe.isConnected) api.closeActionModal();
			if (recarregar) window.location.reload();
		}

		// "✕ Fechar" depois de um "Salvar": recarrega também.
		const observer = new MutationObserver(function () {
			if (!iframe.isConnected) encerrar(salvou);
		});
		observer.observe(document.body, { childList: true });

		function prepararJanela(dlg) {
			if (!dlg || dlg.__pdpPrioridadeVigiada) return;
			dlg.__pdpPrioridadeVigiada = true;
			guardarCatalogo(dlg);
			if (!marcadasAntes) {
				marcadasAntes = {};
				itensDaJanela(dlg).forEach(function (it) {
					if (it.caixa.checked) marcadasAntes[it.id] = it.descricao;
				});
			}
			if (modo.tipo !== "gravar") return;
			let processando = false;
			dlg.addEventListener(
				"click",
				function (event) {
					const alvo = event.target && event.target.closest ? event.target.closest("#selectButton") : null;
					if (!alvo) return;
					event.preventDefault();
					event.stopImmediatePropagation();
					if (processando) return;
					const alteracao = { adicionar: [], remover: [] };
					itensDaJanela(dlg).forEach(function (it) {
						const antesMarcada = Object.prototype.hasOwnProperty.call(marcadasAntes, it.id);
						if (it.caixa.checked && !antesMarcada) alteracao.adicionar.push({ id: it.id, descricao: it.descricao });
						if (!it.caixa.checked && antesMarcada) alteracao.remover.push({ id: it.id, descricao: it.descricao });
					});
					if (!alteracao.adicionar.length && !alteracao.remover.length) {
						alert("Marque (para incluir) ou desmarque (para remover) ao menos uma prioridade antes de clicar em Selecionar.");
						return;
					}
					processando = true;
					Promise.resolve(modo.concluir(alteracao, function () { encerrar(false); })).finally(function () {
						processando = false;
					});
				},
				true
			);
		}

		// A janela de seleção abre (e pode recarregar) dentro da tela; no
		// "➕ Incluir", a prioridade mudada na tela dispara o "Salvar".
		const timer = setInterval(function () {
			if (encerrado) return;
			let doc;
			try {
				doc = iframe.contentDocument;
			} catch (err) {
				return;
			}
			if (!doc || !doc.getElementById(FORM_ID)) return;
			const jan = janela(doc);
			if (jan) prepararJanela(jan.doc);
			if (modo.tipo !== "incluir" || salvando || antes === null) return;
			const agora = assinatura(doc);
			if (agora === null || agora === antes) return;
			const salvar = doc.getElementById("saveButton");
			if (!salvar) return;
			salvando = true;
			setTimeout(function () {
				if (encerrado) return;
				salvou = true;
				try {
					salvar.click();
				} catch (err) {
					salvando = false;
				}
			}, 500);
		}, 300);

		iframe.addEventListener("load", function () {
			if (encerrado) return;
			let win, doc;
			try {
				win = iframe.contentWindow;
				doc = iframe.contentDocument;
			} catch (err) {
				return;
			}
			if (!win || !doc || win.location.href === "about:blank") return;

			if (win.location.search.indexOf("actionType=salvarEdicao") !== -1) salvou = true;
			// Saiu da tela de alteração ("Voltar" ou fim do "Salvar").
			if (win.location.pathname !== EDICAO_PATH || !doc.getElementById(FORM_ID)) {
				encerrar(salvou);
				return;
			}
			const texto = doc.body ? doc.body.textContent || "" : "";
			if (salvou && /sucesso/i.test(texto) && !/erro|n[aã]o foi poss[ií]vel|inv[aá]lid|obrigat[oó]ri/i.test(texto)) {
				setTimeout(function () {
					encerrar(true);
				}, RECARGA_MS);
				return;
			}
			// O Projudi devolveu a tela (erro ao salvar): o usuário vê a
			// mensagem e decide; a extensão não tenta salvar de novo.
			if (salvou) return;

			if (antes === null) antes = assinatura(doc);
			if (modo.tipo === "gravar") {
				avisar(doc, "<b>⭐ Gravando preferência.</b> Na <b>Seleção de Prioridade</b>, marque as prioridades a incluir e desmarque as que devem sair, e clique em <b>Selecionar</b>. " +
					"Esse clique só grava a preferência: <b>o processo não é alterado agora</b>.");
				// O "Salvar" da tela não grava nada na gravação.
				const salvar = doc.getElementById("saveButton");
				if (salvar) {
					salvar.addEventListener(
						"click",
						function (event) {
							event.preventDefault();
							event.stopImmediatePropagation();
							alert('Para gravar a preferência, abra a lupa da linha "Prioridade", marque/desmarque as prioridades e clique em "Selecionar".');
						},
						true
					);
				}
			} else {
				avisar(doc, "<b>➕ Incluir prioridade.</b> Na <b>Seleção de Prioridade</b>, marque as prioridades e clique em <b>Selecionar</b>: a extensão <b>salva em seguida</b> e recarrega o processo.");
			}
			if (primeiraTela) {
				primeiraTela = false;
				focarEAbrirLupa(doc);
			}
		});
	}

	async function abrirPopup(modo) {
		const api = window.__pdpQuickActions;
		if (!api || typeof api.openActionModal !== "function") {
			throw new Error('Não encontrei o recurso "Ações rápidas" (quickActions.js), necessário para abrir o popup.');
		}
		const url = await urlDaEdicao();
		acompanharPopup(api.openActionModal(modo.tipo === "gravar" ? LABEL + " — gravar preferência" : LABEL, url), api, modo);
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

	async function concluirGravacao(alteracao, fechar) {
		const sugestao = alteracao.adicionar.map(function (p) { return p.descricao; })
			.concat(alteracao.remover.map(function (p) { return "sem " + p.descricao; }))
			.join(" + ");
		const nome = prompt("Nome da preferência:", sugestao);
		if (nome === null) return; // continua na tela de gravação
		const pref = {
			id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
			name: nome.trim() || sugestao,
			adicionar: alteracao.adicionar,
			remover: alteracao.remover,
			criadaEm: new Date().toISOString(),
		};
		const prefs = await carregarPrefs();
		prefs.push(pref);
		await salvarPrefs(prefs);
		console.info("[Prioridades] preferência gravada:", pref);
		fechar();
		alert('Preferência "★ ' + pref.name + '" gravada. O processo não foi alterado.\n\nPara usá-la, clique na ⭐ da linha "Prioridade" e escolha a preferência: a alteração é feita e salva automaticamente.');
	}

	// -------------------------------------------------------------------
	// Painel da ⭐: preferências + "Nova preferência"
	// -------------------------------------------------------------------

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
		titulo.className = "pdp-prio-titulo";
		titulo.textContent = "⭐ Preferências — Prioridades";
		painel.appendChild(titulo);
		if (!prefs.length) {
			const vazio = document.createElement("div");
			vazio.className = "pdp-prio-vazio";
			vazio.textContent = "Nenhuma preferência gravada. Use \"+ Nova preferência\" para gravar a inclusão (ou remoção) de prioridades e depois repeti-la com um clique.";
			painel.appendChild(vazio);
		}
		prefs.forEach(function (pref) {
			const linha = document.createElement("div");
			linha.className = "pdp-prio-linha";
			const usar = document.createElement("button");
			usar.type = "button";
			usar.className = "pdp-prio-usar";
			usar.textContent = "★ " + pref.name;
			usar.title = descreverPref(pref).replace(/\.$/, "") + " agora — sem confirmação";
			usar.addEventListener("click", function () {
				fecharPainel();
				executarPreferencia(pref);
			});
			const apagar = document.createElement("button");
			apagar.type = "button";
			apagar.className = "pdp-prio-apagar";
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
		nova.className = "pdp-prio-nova pdp-pp-nova";
		nova.textContent = "+ Nova preferência";
		nova.addEventListener("click", async function () {
			fecharPainel();
			if (ocupado) return;
			ocupado = true;
			try {
				await abrirPopup({ tipo: "gravar", concluir: concluirGravacao });
			} catch (error) {
				alert("Não foi possível abrir a tela de alteração: " + error.message);
			} finally {
				ocupado = false;
			}
		});
		// Título, busca e "+ Nova preferência" no topo fixo do painel
		// (painelPreferencias.js).
		document.body.appendChild(painel);
		painel.removeChild(titulo);
		window.__pdpPainelPrefs.topo(painel, { conteudo: [titulo], novas: [nova], itens: ".pdp-prio-linha" });
		window.__pdpPainelPrefs.caber(painel, botao);
		document.addEventListener("mousedown", cliqueFora, true);
	}

	// -------------------------------------------------------------------
	// Linha "Prioridade:" do cabeçalho: ✖, "➕ Incluir" e ⭐
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
			"a." + PREF_BTN_CLASS + "{margin-left:4px;padding:1px 6px;}" +
			"a." + LINK_CLASS + "." + REMOVER_CLASS + "{margin-left:4px;padding:0 6px;color:#a00 !important;}" +
			"#" + PANEL_ID + "{position:fixed;z-index:2147483640;min-width:260px;max-width:420px;padding:8px;background:#fff;border:1px solid #adadad;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);font:12px Arial,Helvetica,sans-serif;color:#222}" +
			"#" + PANEL_ID + " .pdp-prio-titulo{font-weight:bold;margin:0}" +
			"#" + PANEL_ID + " .pdp-prio-vazio{color:#666;margin:0 0 8px;line-height:1.4}" +
			"#" + PANEL_ID + " button{font:12px Arial,Helvetica,sans-serif;color:#222;cursor:pointer;background:linear-gradient(to bottom,#fafafa,#e9e9e9);border:1px solid #adadad;border-radius:4px;padding:3px 9px}" +
			"#" + PANEL_ID + " button:hover{background:linear-gradient(to bottom,#ffffff,#dcdcdc);border-color:#888}" +
			"#" + PANEL_ID + " .pdp-prio-linha{display:flex;align-items:center;gap:2px;margin:0 0 4px;background:#fff8e6;border:1px solid #e8cf8a;border-radius:4px}" +
			"#" + PANEL_ID + " .pdp-prio-linha:hover{background:#fff0c7;border-color:#d4b25a}" +
			"#" + PANEL_ID + " .pdp-prio-linha button{background:none;border:none;border-radius:3px}" +
			"#" + PANEL_ID + " .pdp-prio-usar{flex:1;min-width:0;text-align:left;font-weight:bold;font-size:11.5px;color:#333;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			"#" + PANEL_ID + " .pdp-prio-apagar{flex:none;font-size:11px;padding:2px 5px;opacity:.6}" +
			"#" + PANEL_ID + " .pdp-prio-apagar:hover{opacity:1;background:#f6d6d6}" +
			"#" + PANEL_ID + " button.pdp-prio-nova{font-weight:bold}";
		(document.head || document.documentElement).appendChild(style);
	}

	// "A, B (8 anos, 4 meses), C" → ["A", "B (8 anos, 4 meses)", "C"]: só
	// as vírgulas fora de parênteses separam prioridades.
	function separar(texto) {
		const itens = [];
		let nivel = 0;
		let atual = "";
		for (let i = 0; i < texto.length; i++) {
			const c = texto[i];
			if (c === "(") nivel++;
			else if (c === ")") nivel = Math.max(0, nivel - 1);
			if (c === "," && nivel === 0) {
				if (limpa(atual)) itens.push(limpa(atual));
				atual = "";
				continue;
			}
			atual += c;
		}
		if (limpa(atual)) itens.push(limpa(atual));
		return itens;
	}

	function criarLink(texto, title, aoClicar, extra) {
		const a = document.createElement("a");
		a.href = "#";
		a.className = LINK_CLASS + (extra ? " " + extra : "");
		a.textContent = texto;
		a.title = title;
		a.addEventListener("click", function (event) {
			event.preventDefault();
			event.stopPropagation();
			aoClicar(a);
		});
		return a;
	}

	function botaoRemover(nome) {
		return criarLink("✖", 'Remover a prioridade "' + nome + '" e salvar (pede confirmação)', function () {
			removerPrioridade(nome);
		}, REMOVER_CLASS);
	}

	function botoesDaLinha(celula) {
		if (celula.querySelector("[" + ITEM_ATTR + "-incluir]")) return;
		const incluir = criarLink("➕ Incluir", "Incluir prioridades: abre a tela de alteração num popup, já na Seleção de Prioridade; depois do \"Selecionar\", a extensão salva sozinha", async function () {
			if (ocupado) return;
			ocupado = true;
			try {
				await abrirPopup({ tipo: "incluir" });
			} catch (error) {
				alert("Não foi possível abrir a tela de alteração: " + error.message);
			} finally {
				ocupado = false;
			}
		});
		incluir.setAttribute(ITEM_ATTR + "-incluir", "");
		const estrela = criarLink("⭐", "Preferências de prioridades: grave a inclusão (ou remoção) de prioridades e repita-a com um clique, já salva no processo", function (a) {
			abrirPainel(a);
		}, PREF_BTN_CLASS);
		celula.appendChild(incluir);
		celula.appendChild(estrela);
	}

	// Refaz as prioridades do <em> com um ✖ depois de cada uma que pode ser
	// removida. O texto original fica em `data-pdp-prioridades` (para
	// refazer quando o catálogo muda).
	function montarItens(em) {
		let original = em.getAttribute(ITEM_ATTR);
		if (original === null) {
			original = limpa(em.textContent);
			em.setAttribute(ITEM_ATTR, original);
		}
		const lista = separar(original);
		em.textContent = "";
		lista.forEach(function (nome, i) {
			const span = document.createElement("span");
			span.textContent = nome;
			em.appendChild(span);
			if (removivel(nome)) em.appendChild(botaoRemover(nome));
			if (i < lista.length - 1) em.appendChild(document.createTextNode(", "));
		});
		em.setAttribute(ITEM_ATTR + "-versao", String(versaoCatalogo));
	}

	let versaoCatalogo = 0;

	function marcarCabecalhoParaRefazer() {
		versaoCatalogo++;
		reconcile();
	}

	function rotuloPrioridade(tr) {
		const label = tr.querySelector("td.label, td.labelRadio");
		return label && /^prioridades?\s*:?$/.test(normalize(label.textContent)) ? label : null;
	}

	// Linha "Prioridade:" criada pela extensão (processo sem prioridade):
	// logo depois do "Nível de Sigilo", como no Projudi; senão, no fim.
	function criarLinha(table) {
		const rows = Array.prototype.slice.call(table.rows);
		const sigilo = rows.filter(function (tr) {
			const label = tr.querySelector("td.label, td.labelRadio");
			return label && /^nivel de sigilo/.test(normalize(label.textContent));
		})[0];
		const row = document.createElement("tr");
		row.setAttribute(ROW_ATTR, "");
		row.innerHTML = '<td class="label"><label>Prioridade:</label></td><td colspan="4"><span style="color:#666">(nenhuma)</span></td>';
		if (sigilo) sigilo.insertAdjacentElement("afterend", row);
		else (table.tBodies[0] || table).appendChild(row);
		return row;
	}

	function reconcile() {
		if (catalogo === null) return; // espera o catálogo (início)
		const table = document.getElementById("informacoesProcessuais");
		if (!table || !document.getElementById("processoForm")) return;
		let linha = null;
		for (const tr of table.rows) {
			if (tr.hasAttribute(ROW_ATTR)) continue;
			if (rotuloPrioridade(tr)) {
				linha = tr;
				break;
			}
		}
		const criada = table.querySelector("tr[" + ROW_ATTR + "]");
		if (linha && criada) criada.remove();
		if (!linha) linha = criada || criarLinha(table);
		const celula = rotuloPrioridade(linha) ? rotuloPrioridade(linha).nextElementSibling : null;
		if (!celula) return;
		garantirEstilo();
		if (!linha.hasAttribute(ROW_ATTR)) {
			const em = celula.querySelector("em") || null;
			if (em && em.getAttribute(ITEM_ATTR + "-versao") !== String(versaoCatalogo)) montarItens(em);
		}
		botoesDaLinha(celula);
	}

	carregarCatalogo().then(function (lista) {
		catalogo = lista;
		new MutationObserver(reconcile).observe(document.documentElement, { childList: true, subtree: true });
		reconcile();
	});
})();
