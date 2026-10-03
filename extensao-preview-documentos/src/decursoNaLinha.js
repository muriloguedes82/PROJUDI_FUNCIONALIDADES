// Projudi - "Analisar Decurso" e "Dispensar" na própria lista de decurso de
// prazo
//
// Nas listas do menu "Decurso de Prazo" — Intimação (processo/
// intimacaoBusca.do), Intimação de Auxiliares da Justiça (processo/
// intimacaoNomeados.do) e Citações/Notificações (processo/citacao.do) — a
// data da coluna "Data Decurso" abre a tela da intimação, que tem os botões
// nativos "Analisar Decurso" (#analisarButton, onclick
// document.location.href='/projudi/processo/certificar.do?_tj=...') e
// "Dispensar" (#dispensarButton, onclick dispensarAnaliseRecurso(), que pede
// "Confirma a dispensa de análise de Decurso de Prazo?").
//
// Este script põe esses dois botões em cada linha "Aguardando Análise do
// Decurso de Prazo", na coluna "Processo / Seq.", logo abaixo do sequencial:
// - Dispensar: abre a tela da intimação num iframe oculto e aciona o botão
//   nativo pelo background (clickDecursoWithConfirmation, o mesmo do
//   "Dispensar decursos" do quadro Pendências), que aceita só a confirmação
//   de dispensa do decurso. Confere o resultado (mensagem do Projudi ou a
//   tela da intimação sem o botão "Dispensar") e mostra na linha "Decurso de
//   prazo dispensado com sucesso". Tudo oculto; a lista não navega.
// - Analisar Decurso: lê, na tela da intimação (iframe oculto), o endereço do
//   botão nativo e abre a tela de análise (certificar.do) no popup das ações
//   rápidas, sem sair da lista. Se houver preferências do "📎 Juntar
//   Documento", um menu deixa escolher uma: a extensão clica em "Adicionar" e
//   faz a inclusão do arquivo com ela (Tipo do Arquivo, Modelo e texto) até
//   a assinatura e o "Confirmar Inclusão" - o mesmo fluxo do Juntar
//   Documento (juntarDocumento.js, prepararDecurso).
// Os botões usam delegação de clique no documento: continuam funcionando nas
// linhas copiadas pelo filtro por Sequencial (decursoPrazoSequencial.js).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpDecursoNaLinha) return;

	const LISTAS = /^\/projudi\/processo\/(intimacaoBusca|intimacaoNomeados|citacao)\.do$/;
	if (!LISTAS.test(location.pathname)) return;
	try {
		const fe = window.frameElement;
		if (fe && (fe.hasAttribute("data-pdp-loader") || fe.hasAttribute("data-pdp-decurso") || fe.hasAttribute("data-pdp-dispensa"))) return;
	} catch (e) { /* frame de outra origem */ }
	window.__pdpDecursoNaLinha = true;

	const TAG = "[Projudi Decurso na linha]";
	const DETALHES = ["/projudi/processo/intimacao.do", "/projudi/processo/intimacaoNomeados.do", "/projudi/processo/citacao.do"];
	const TIMEOUT_MS = 60000;
	let emAndamento = false;

	const norm = function (v) {
		return String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
	};

	// --- linhas ------------------------------------------------------------------

	function linhas() {
		const tabela = document.querySelector("table.resultTable");
		const tbody = tabela && tabela.tBodies[0];
		if (!tbody) return [];
		const res = [];
		for (const row of tbody.rows) {
			if (/^row\d+$/.test(row.id)) continue;
			if (!/aguardando analise d[eo] decurso de prazo/.test(norm(row.textContent))) continue;
			let celulaProcesso = null;
			let detalhe = null;
			for (const td of row.cells) {
				for (const a of td.querySelectorAll("a[href]")) {
					let url;
					try { url = new URL(a.getAttribute("href"), location.href); } catch (e) { continue; }
					if (url.origin !== location.origin || url.hash) continue;
					if (!celulaProcesso && url.pathname === "/projudi/processo.do" && url.search) celulaProcesso = td;
					if (!detalhe && DETALHES.indexOf(url.pathname) >= 0 && url.search) detalhe = url.href;
				}
			}
			if (celulaProcesso && detalhe) {
				const cnj = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(celulaProcesso.textContent || "");
				res.push({ row: row, celula: celulaProcesso, detalhe: detalhe, cnj: cnj ? cnj[0] : "" });
			}
		}
		return res;
	}

	function inserirBotoes() {
		linhas().forEach(function (item) {
			let caixa = item.celula.querySelector(".pdp-dec-acoes");
			if (!caixa) {
				caixa = document.createElement("div");
				caixa.className = "pdp-dec-acoes";
				caixa.innerHTML =
					'<button type="button" class="pdp-dec-btn" data-pdp-dec="analisar" title="Abrir a análise do decurso (mesmo botão &quot;Analisar Decurso&quot; da tela da intimação), sem sair da lista">Analisar Decurso</button>' +
					'<button type="button" class="pdp-dec-btn" data-pdp-dec="dispensar" title="Dispensar a análise do decurso desta intimação, sem sair da lista (a confirmação do Projudi é aceita sozinha)">Dispensar</button>' +
					'<div class="pdp-dec-status" role="status"></div>';
				item.celula.appendChild(caixa);
			}
			// Guarda o endereço na própria caixa: vale também para as linhas
			// copiadas pelo filtro por Sequencial.
			caixa.setAttribute("data-pdp-dec-url", item.detalhe);
			caixa.setAttribute("data-pdp-dec-cnj", item.cnj);
		});
	}

	function status(caixa, texto, tipo) {
		const s = caixa.querySelector(".pdp-dec-status");
		if (!s) return;
		s.textContent = texto || "";
		s.className = "pdp-dec-status" + (tipo ? " pdp-dec-" + tipo : "");
	}

	function travar(caixa, sim) {
		caixa.querySelectorAll(".pdp-dec-btn").forEach(function (b) { b.disabled = sim; });
	}

	// --- iframe oculto -------------------------------------------------------------

	function criarIframe(atributo, valor) {
		const frame = document.createElement("iframe");
		frame.setAttribute(atributo, valor);
		frame.setAttribute("aria-hidden", "true");
		frame.title = "Decurso de prazo em segundo plano";
		frame.style.cssText = "position:fixed;left:-15000px;top:0;width:1200px;height:850px;border:0;";
		document.body.appendChild(frame);
		return frame;
	}

	function mensagem(doc, id) {
		const el = doc && doc.getElementById(id);
		return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
	}

	// --- Dispensar ------------------------------------------------------------------

	function dispensar(caixa, url) {
		return new Promise(function (resolve) {
			const token = crypto.randomUUID();
			const frame = criarIframe("data-pdp-decurso", token);
			let etapa = "detalhe";
			let fim = false;
			const timer = setTimeout(function () { terminar(false, "a operação demorou além do esperado. Confira a intimação antes de tentar de novo."); }, TIMEOUT_MS);
			function terminar(ok, texto) {
				if (fim) return;
				fim = true;
				clearTimeout(timer);
				frame.remove();
				resolve({ ok: ok, texto: texto });
			}
			frame.addEventListener("load", async function () {
				if (fim) return;
				let doc;
				try {
					doc = frame.contentDocument;
				} catch (e) {
					terminar(false, "não foi possível ler a tela da intimação.");
					return;
				}
				if (!doc || doc.URL === "about:blank") return;
				try {
					if (etapa === "detalhe") {
						const botao = doc.getElementById("dispensarButton");
						if (!botao || botao.disabled || norm(botao.value || botao.textContent) !== "dispensar") {
							terminar(false, "o botão \"Dispensar\" não está disponível para esta intimação.");
							return;
						}
						botao.setAttribute("data-pdp-decurso-button", token);
						etapa = "enviado";
						const r = await chrome.runtime.sendMessage({ source: "projudi-preview", type: "decurso-dispense-marked", token: token });
						if (!r || !r.ok) terminar(false, (r && r.error) || "não foi possível acionar a dispensa.");
						return;
					}
					if (etapa === "enviado") {
						const erro = mensagem(doc, "errorMessages");
						if (erro) {
							terminar(false, erro);
							return;
						}
						const sucesso = mensagem(doc, "successMessages");
						if (sucesso) {
							terminar(true, "Decurso de prazo dispensado com sucesso");
							return;
						}
						// Sem mensagem: reabre a intimação e confere se o
						// "Dispensar" saiu.
						etapa = "conferir";
						frame.src = url;
						return;
					}
					if (etapa === "conferir") {
						const botao = doc.getElementById("dispensarButton");
						if (!botao || botao.disabled) terminar(true, "Decurso de prazo dispensado com sucesso");
						else terminar(false, "o Projudi não confirmou a dispensa. Confira a intimação antes de tentar de novo.");
					}
				} catch (e) {
					console.error(TAG, e);
					terminar(false, (e && e.message) || "falha na dispensa.");
				}
			});
			frame.src = url;
		});
	}

	// --- Analisar Decurso ---------------------------------------------------------------

	function urlAnalisar(url) {
		return new Promise(function (resolve, reject) {
			const frame = criarIframe("data-pdp-loader", "decurso-na-linha");
			const timer = setTimeout(function () { fim(new Error("a tela da intimação demorou demais para carregar.")); }, 30000);
			function fim(erro, valor) {
				clearTimeout(timer);
				frame.remove();
				if (erro) reject(erro);
				else resolve(valor);
			}
			frame.addEventListener("load", function () {
				let doc;
				try {
					doc = frame.contentDocument;
				} catch (e) {
					fim(new Error("não foi possível ler a tela da intimação."));
					return;
				}
				if (!doc || doc.URL === "about:blank") return;
				const botao = doc.getElementById("analisarButton");
				const m = /location\.href\s*=\s*'([^']+)'/.exec((botao && botao.getAttribute("onclick")) || "");
				if (!botao || botao.disabled || !m) {
					fim(new Error("o botão \"Analisar Decurso\" não está disponível para esta intimação."));
					return;
				}
				try {
					fim(null, new URL(m[1], doc.URL).href);
				} catch (e) {
					fim(new Error("endereço da análise não reconhecido."));
				}
			});
			frame.src = url;
		});
	}

	// Menu do "Analisar Decurso": abrir a análise ou usar uma preferência do
	// "📎 Juntar Documento". Resolve com { pref } (null = sem preferência)
	// ou null (fechado).
	let menu = null;
	function fecharMenu() {
		if (menu) {
			menu.el.remove();
			menu.resolve(null);
			menu = null;
		}
	}
	async function escolherPreferencia(botao) {
		const api = window.__pdpJuntarDocumentoApi;
		let prefs = [];
		try {
			prefs = api && api.listar ? await api.listar() : [];
		} catch (e) {
			prefs = [];
		}
		if (!prefs.length) return { pref: null };
		fecharMenu();
		return new Promise(function (resolve) {
			const el = document.createElement("div");
			el.className = "pdp-dec-menu";
			const titulo = document.createElement("div");
			titulo.className = "pdp-dec-menu-titulo";
			titulo.textContent = "Analisar Decurso";
			el.appendChild(titulo);
			function opcao(texto, dica, pref) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "pdp-dec-menu-item";
				b.textContent = texto;
				b.title = dica;
				b.addEventListener("click", function (ev) {
					ev.stopPropagation();
					const atual = menu;
					menu = null;
					el.remove();
					if (atual) atual.resolve({ pref: pref });
				});
				el.appendChild(b);
			}
			opcao("Abrir a análise", "Abre a tela de análise no popup, sem preencher nada", null);
			const sub = document.createElement("div");
			sub.className = "pdp-dec-menu-sub";
			sub.textContent = "Incluir arquivo com a preferência (📎 Juntar Documento):";
			el.appendChild(sub);
			prefs.forEach(function (pref) {
				opcao("★ " + pref.name, "Clica em \"Adicionar\" e inclui o arquivo com esta preferência (Tipo do Arquivo, Modelo e texto) até a assinatura", pref);
			});
			document.body.appendChild(el);
			const r = botao.getBoundingClientRect();
			el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + "px";
			el.style.top = (r.bottom + 4 + el.offsetHeight > window.innerHeight ? Math.max(8, r.top - el.offsetHeight - 4) : r.bottom + 4) + "px";
			menu = { el: el, resolve: resolve };
		});
	}
	document.addEventListener("mousedown", function (ev) {
		if (menu && !menu.el.contains(ev.target)) fecharMenu();
	}, true);
	document.addEventListener("keydown", function (ev) {
		if (ev.key === "Escape") fecharMenu();
	});

	async function analisar(caixa, url, pref) {
		const jd = window.__pdpJuntarDocumentoApi;
		const destino = await urlAnalisar(url);
		// Com preferência: o fluxo do Juntar Documento conduz a tela de
		// análise aberta a seguir (mesma aba, mesmo sessionStorage).
		if (pref && jd && jd.prepararDecurso) jd.prepararDecurso(pref, caixa.getAttribute("data-pdp-dec-cnj") || null);
		const qa = window.__pdpQuickActions;
		if (!qa || !qa.openActionModal) {
			// Sem o popup das ações rápidas (desligadas no Menu): abre a
			// análise nesta aba, como o botão nativo faria.
			window.location.href = destino;
			return { ok: true, texto: "Abrindo a análise do decurso…", final: true };
		}
		return new Promise(function (resolve) {
			qa.openActionModal("Analisar Decurso" + (pref ? " — ★ " + pref.name : ""), destino, {
				onClose: function (motivo) {
					// Popup fechado: encerra uma inclusão que tenha ficado pela metade.
					if (pref && jd && jd.hasActiveJob && jd.hasActiveJob()) jd.cancel();
					resolve(motivo === "auto"
						? { ok: true, texto: "Análise do decurso concluída" }
						: { ok: true, texto: "Análise do decurso aberta — popup fechado (confira na lista ao atualizar)", aviso: true });
				}
			});
		});
	}

	// --- cliques (delegação) -----------------------------------------------------------

	document.addEventListener("click", async function (ev) {
		const botao = ev.target && ev.target.closest ? ev.target.closest(".pdp-dec-btn") : null;
		if (!botao) return;
		ev.preventDefault();
		ev.stopPropagation();
		const caixa = botao.closest(".pdp-dec-acoes");
		const url = caixa && caixa.getAttribute("data-pdp-dec-url");
		if (!url) return;
		if (emAndamento) {
			status(caixa, "Aguarde: já há um decurso sendo tratado em outra linha.", "aviso");
			return;
		}
		emAndamento = true;
		travar(caixa, true);
		try {
			if (botao.getAttribute("data-pdp-dec") === "dispensar") {
				status(caixa, "Dispensando…", "andamento");
				const r = await dispensar(caixa, url);
				status(caixa, r.ok ? "✅ " + r.texto : "⚠ Não dispensado: " + r.texto, r.ok ? "ok" : "erro");
				// Dispensado: os botões saem; a linha fica com a mensagem.
				if (r.ok) caixa.querySelectorAll(".pdp-dec-btn").forEach(function (b) { b.remove(); });
			} else {
				const escolha = await escolherPreferencia(botao);
				if (!escolha) return;
				status(caixa, escolha.pref ? "Abrindo a análise com ★ " + escolha.pref.name + "…" : "Abrindo a análise do decurso…", "andamento");
				const r = await analisar(caixa, url, escolha.pref);
				status(caixa, (r.aviso ? "" : "✅ ") + r.texto, r.aviso ? "aviso" : "ok");
			}
		} catch (e) {
			console.error(TAG, e);
			status(caixa, "⚠ " + ((e && e.message) || "falha."), "erro");
		} finally {
			emAndamento = false;
			if (caixa.isConnected) travar(caixa, false);
		}
	}, true);

	let agendado = false;
	new MutationObserver(function () {
		if (agendado) return;
		agendado = true;
		setTimeout(function () {
			agendado = false;
			inserirBotoes();
		}, 200);
	}).observe(document.documentElement, { childList: true, subtree: true });
	inserirBotoes();
})();
