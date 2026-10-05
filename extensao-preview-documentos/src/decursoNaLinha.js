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
//   rápidas, sem sair da lista. Um menu oferece: "Abrir a análise", "+ Nova
//   preferência" (grava a inclusão do arquivo - Tipo do Arquivo, Modelo e
//   texto - num grupo próprio, pdpDecursoPrefs, com ✏️ e 🗑) e as
//   preferências (as do Analisar Decurso e as do "📎 Juntar Documento").
//   Com uma preferência, a extensão clica em "Adicionar" e faz a inclusão
//   até a assinatura e o "Confirmar Inclusão" - o mesmo fluxo do Juntar
//   Documento (juntarDocumento.js, prepararDecurso/gravarDecurso) -, clica
//   no botão final se ele disser "Concluir" e fecha o popup sozinha.
// - Em lote: na barra "⭐ Em lote" (preferenciasNaLinha.js), "Dispensar nos
//   marcados" e "Analisar decurso nos marcados" (com uma preferência), um
//   processo de cada vez.
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

	// Menu do "Analisar Decurso". Resolve com { acao, pref } ou null
	// (fechado). `acao`: "abrir" (sem preferência), "nova" (gravar uma
	// preferência), "editar" (✏️) ou "pref" (executar `pref`). Em lote
	// (`emLote`), só as preferências (as do "Analisar Decurso" e as do
	// "📎 Juntar Documento").
	let menu = null;
	function fecharMenu() {
		if (menu) {
			menu.el.remove();
			const resolve = menu.resolve;
			menu = null;
			resolve(null);
		}
	}
	async function listarPreferencias() {
		const api = window.__pdpJuntarDocumentoApi;
		const resultado = { decurso: [], juntar: [] };
		if (!api) return resultado;
		try {
			resultado.decurso = api.listarDecurso ? await api.listarDecurso() : [];
			resultado.juntar = api.listar ? await api.listar() : [];
		} catch (e) {
			console.warn(TAG, "não foi possível ler as preferências:", e);
		}
		return resultado;
	}
	async function escolherPreferencia(botao, emLote) {
		fecharMenu();
		const prefs = await listarPreferencias();
		const api = window.__pdpJuntarDocumentoApi;
		return new Promise(function (resolve) {
			const el = document.createElement("div");
			el.className = "pdp-dec-menu";
			menu = { el: el, resolve: resolve };
			function escolher(valor) {
				const atual = menu;
				menu = null;
				el.remove();
				if (atual) atual.resolve(valor);
			}
			function linha(texto, dica, valor, extras) {
				const wrap = document.createElement("div");
				wrap.className = "pdp-dec-menu-linha";
				const b = document.createElement("button");
				b.type = "button";
				b.className = "pdp-dec-menu-item";
				b.textContent = texto;
				b.title = dica;
				b.addEventListener("click", function (ev) {
					ev.stopPropagation();
					escolher(valor);
				});
				wrap.appendChild(b);
				(extras || []).forEach(function (x) { wrap.appendChild(x); });
				el.appendChild(wrap);
			}
			function icone(texto, dica, onclick) {
				const b = document.createElement("button");
				b.type = "button";
				b.className = "pdp-dec-menu-icone";
				b.textContent = texto;
				b.title = dica;
				b.addEventListener("click", function (ev) {
					ev.stopPropagation();
					onclick();
				});
				return b;
			}
			function secao(texto) {
				const d = document.createElement("div");
				d.className = "pdp-dec-menu-sub";
				d.textContent = texto;
				el.appendChild(d);
			}
			const titulo = document.createElement("div");
			titulo.className = "pdp-dec-menu-titulo";
			titulo.textContent = emLote ? "Analisar decurso nos marcados" : "Analisar Decurso";
			el.appendChild(titulo);
			if (!emLote) {
				linha("Abrir a análise", "Abre a tela de análise no popup, sem preencher nada", { acao: "abrir" });
				linha("+ Nova preferência", "Abre a análise no popup e grava o que você fizer na inclusão do arquivo (Tipo do Arquivo, Modelo e texto); no \"Assinar Arquivos\", pede o nome e salva", { acao: "nova" });
			}
			if (prefs.decurso.length) {
				secao("Preferências de Analisar Decurso:");
				prefs.decurso.forEach(function (pref) {
					const extras = emLote ? [] : [
						icone("✏️", "Editar: abre a análise com a preferência preenchida, sem avançar sozinho; no \"Assinar Arquivos\" ela é atualizada", function () { escolher({ acao: "editar", pref: pref }); }),
						icone("🗑", "Remover esta preferência", function () {
							if (!confirm("Remover a preferência \"" + pref.name + "\" do Analisar Decurso?")) return;
							api.removerDecurso(pref.id).then(function () {
								escolher(null);
								botao.click();
							});
						})
					];
					linha("★ " + pref.name, "Clica em \"Adicionar\" e inclui o arquivo com esta preferência até a assinatura" + (emLote ? ", em cada processo marcado" : ""), { acao: "pref", pref: pref }, extras);
				});
			}
			if (prefs.juntar.length) {
				secao("Do 📎 Juntar Documento:");
				prefs.juntar.forEach(function (pref) {
					linha("★ " + pref.name, "Usa o Tipo do Arquivo, o Modelo e o texto desta preferência do Juntar Documento", { acao: "pref", pref: pref });
				});
			}
			if (emLote && !prefs.decurso.length && !prefs.juntar.length) {
				secao("Nenhuma preferência salva. Crie uma pelo \"+ Nova preferência\" do Analisar Decurso de uma linha.");
			}
			document.body.appendChild(el);
			const r = botao.getBoundingClientRect();
			el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + "px";
			el.style.top = (r.bottom + 4 + el.offsetHeight > window.innerHeight ? Math.max(8, r.top - el.offsetHeight - 4) : r.bottom + 4) + "px";
		});
	}
	document.addEventListener("mousedown", function (ev) {
		if (menu && !menu.el.contains(ev.target)) fecharMenu();
	}, true);
	document.addEventListener("keydown", function (ev) {
		if (ev.key === "Escape") fecharMenu();
	});

	// Abre a análise no popup conforme `escolha` e resolve quando ela
	// termina: { ok, texto, aviso }. Com preferência, o fim vem da marca do
	// juntarDocumento.js (fimDecurso): "concluida" fecha o popup sozinho;
	// "aguardando" espera o usuário clicar no botão final e fechar o popup.
	async function analisar(caixa, url, escolha) {
		const jd = window.__pdpJuntarDocumentoApi;
		const cnj = caixa.getAttribute("data-pdp-dec-cnj") || null;
		const destino = await urlAnalisar(url);
		const qa = window.__pdpQuickActions;
		if (!qa || !qa.openActionModal) {
			if (escolha.acao !== "abrir") throw new Error("o popup das ações rápidas não está disponível nesta tela (ligue as Ações rápidas no Menu).");
			window.location.href = destino;
			return { ok: true, texto: "Abrindo a análise do decurso…" };
		}
		const comPref = escolha.acao === "pref";
		const gravando = escolha.acao === "nova" || escolha.acao === "editar";
		if (comPref && jd) jd.prepararDecurso(escolha.pref, cnj);
		if (gravando && jd) jd.gravarDecurso(cnj, escolha.acao === "editar" ? escolha.pref : null);
		const rotulo = comPref || escolha.acao === "editar" ? " — ★ " + escolha.pref.name : gravando ? " — gravando nova preferência" : "";
		return new Promise(function (resolve) {
			let concluida = false;
			let timer = null;
			let fechar = null;
			if (comPref && jd && jd.fimDecurso) {
				timer = setInterval(function () {
					const fim = jd.fimDecurso();
					if (fim === "concluida" && !concluida) {
						concluida = true;
						status(caixa, "Concluindo a análise…", "andamento");
						fechar = setTimeout(function () { if (qa.closeActionModal) qa.closeActionModal(); }, 2500);
					} else if (fim === "aguardando") {
						status(caixa, "Arquivo incluído: clique no botão final da análise, no popup.", "aviso");
					}
				}, 500);
			}
			qa.openActionModal("Analisar Decurso" + rotulo, destino, {
				onClose: function (motivo) {
					clearInterval(timer);
					clearTimeout(fechar);
					// Popup fechado: encerra uma inclusão/gravação que tenha
					// ficado pela metade.
					if ((comPref || gravando) && jd && jd.hasActiveJob && jd.hasActiveJob()) jd.cancel();
					if (gravando) resolve({ ok: true, texto: "Popup fechado. A preferência é salva no \"Assinar Arquivos\".", aviso: true, executado: false });
					else if (concluida || motivo === "auto") resolve({ ok: true, texto: "Análise do decurso concluída" + (comPref ? " com ★ " + escolha.pref.name : ""), executado: true });
					else resolve({ ok: true, texto: "Popup da análise fechado (confira na lista ao atualizar)", aviso: true, executado: false });
				}
			});
		});
	}

	// --- cliques na linha (delegação) ------------------------------------------------

	document.addEventListener("click", async function (ev) {
		const botao = ev.target && ev.target.closest ? ev.target.closest(".pdp-dec-btn") : null;
		if (!botao) return;
		ev.preventDefault();
		ev.stopPropagation();
		const caixa = botao.closest(".pdp-dec-acoes");
		const url = caixa && caixa.getAttribute("data-pdp-dec-url");
		if (!url) return;
		if (emAndamento) {
			status(caixa, "Aguarde: já há um decurso sendo tratado.", "aviso");
			return;
		}
		emAndamento = true;
		travar(caixa, true);
		atualizarLote();
		try {
			if (botao.getAttribute("data-pdp-dec") === "dispensar") {
				await dispensarNaLinha(caixa, url);
			} else {
				const escolha = await escolherPreferencia(botao, false);
				if (!escolha) return;
				await analisarNaLinha(caixa, url, escolha);
			}
		} catch (e) {
			console.error(TAG, e);
			status(caixa, "⚠ " + ((e && e.message) || "falha."), "erro");
		} finally {
			emAndamento = false;
			if (caixa.isConnected) travar(caixa, false);
			atualizarLote();
		}
	}, true);

	async function dispensarNaLinha(caixa, url) {
		status(caixa, "Dispensando…", "andamento");
		const r = await dispensar(caixa, url);
		status(caixa, r.ok ? "✅ " + r.texto : "⚠ Não dispensado: " + r.texto, r.ok ? "ok" : "erro");
		// Dispensado: os botões saem; a linha fica com a mensagem.
		if (r.ok) caixa.querySelectorAll(".pdp-dec-btn").forEach(function (b) { b.remove(); });
		return r.ok;
	}

	async function analisarNaLinha(caixa, url, escolha) {
		status(caixa, escolha.pref ? "Abrindo a análise com ★ " + escolha.pref.name + "…" : "Abrindo a análise do decurso…", "andamento");
		const r = await analisar(caixa, url, escolha);
		status(caixa, (r.aviso ? "" : "✅ ") + r.texto, r.aviso ? "aviso" : "ok");
		if (r.executado) caixa.querySelectorAll(".pdp-dec-btn").forEach(function (b) { b.remove(); });
		return !!r.executado;
	}

	// --- em lote ---------------------------------------------------------------------
	// Na barra "⭐ Em lote" (preferenciasNaLinha.js, com as caixinhas de
	// marcar de cada linha), dois botões a mais: "Dispensar nos marcados" e
	// "Analisar decurso nos marcados". Os processos marcados são tratados um
	// de cada vez, cada um com o resultado na sua linha; o executado é
	// desmarcado. Linhas que não aguardam análise do decurso são puladas.

	let loteEl = null;
	let parar = false;

	function alvosMarcados() {
		const alvos = [];
		let pulados = 0;
		document.querySelectorAll("input.pdp-pl-lote-check").forEach(function (c) {
			const row = c.closest("tr");
			if (!c.checked || !row || row.classList.contains("pdp-tl-oculta")) return;
			const caixa = row.querySelector(".pdp-dec-acoes");
			if (caixa && caixa.querySelector(".pdp-dec-btn") && caixa.getAttribute("data-pdp-dec-url")) alvos.push({ check: c, row: row, caixa: caixa });
			else pulados++;
		});
		return { alvos: alvos, pulados: pulados };
	}

	function garantirLote() {
		const barra = document.getElementById("pdpPreferenciasLote");
		if (!barra || (loteEl && loteEl.isConnected && barra.contains(loteEl))) return;
		loteEl = document.createElement("span");
		loteEl.className = "pdp-dec-lote";
		loteEl.innerHTML =
			'<button type="button" class="pdp-tl-btn" data-pdp-dec-lote="dispensar" title="Dispensar a análise do decurso nos processos marcados, um de cada vez (a confirmação do Projudi é aceita sozinha)">Dispensar nos marcados</button>' +
			'<button type="button" class="pdp-tl-btn" data-pdp-dec-lote="analisar" title="Analisar o decurso nos processos marcados com uma preferência, um de cada vez (você assina cada documento)">Analisar decurso nos marcados</button>' +
			'<button type="button" class="pdp-tl-btn" data-pdp-dec-lote="parar" hidden title="Não começar os próximos processos (o atual continua)">⏹ Parar</button>' +
			'<span class="pdp-dec-lote-status" role="status"></span>';
		barra.appendChild(loteEl);
		atualizarLote();
	}

	// Habilitados com qualquer processo marcado: se nenhum aguardar análise
	// do decurso, o clique explica (em vez de o botão ficar apagado sem
	// motivo aparente).
	function marcadosVisiveis() {
		return Array.prototype.filter.call(document.querySelectorAll("input.pdp-pl-lote-check"), function (c) {
			const row = c.closest("tr");
			return c.checked && row && !row.classList.contains("pdp-tl-oculta");
		}).length;
	}
	function atualizarLote() {
		if (!loteEl) return;
		const n = marcadosVisiveis();
		loteEl.querySelectorAll('[data-pdp-dec-lote="dispensar"], [data-pdp-dec-lote="analisar"]').forEach(function (b) {
			b.disabled = !n;
			b.title = b.getAttribute("data-titulo") || b.title;
		});
	}

	function statusLote(texto) {
		const s = loteEl && loteEl.querySelector(".pdp-dec-lote-status");
		if (s) s.textContent = texto || "";
	}

	document.addEventListener("change", function (ev) {
		if (ev.target && ev.target.classList && ev.target.classList.contains("pdp-pl-lote-check")) atualizarLote();
	}, true);
	document.addEventListener("click", function (ev) {
		// "marcar todos"/"Desmarcar todos" da barra mudam as caixinhas sem
		// evento "change" nelas.
		if (ev.target && ev.target.closest && ev.target.closest("#pdpPreferenciasLote") && !ev.target.closest(".pdp-dec-lote")) setTimeout(atualizarLote, 0);
	}, true);

	document.addEventListener("click", async function (ev) {
		const botao = ev.target && ev.target.closest ? ev.target.closest("[data-pdp-dec-lote]") : null;
		if (!botao) return;
		ev.preventDefault();
		ev.stopPropagation();
		const acao = botao.getAttribute("data-pdp-dec-lote");
		if (acao === "parar") {
			parar = true;
			botao.disabled = true;
			statusLote("Parando: o lote para depois do processo atual…");
			return;
		}
		if (acao === "dispensar") {
			const sel = podeLote();
			if (!sel) return;
			if (!confirm("Dispensar a análise do decurso de prazo de " + sel.alvos.length + " processo(s) marcado(s)?\n\nA confirmação do Projudi é aceita sozinha em cada um." + (sel.pulados ? "\n\n" + sel.pulados + " marcado(s) não aguardam análise do decurso e serão pulados." : ""))) return;
			await rodarLote("dispensar", null, sel);
		} else {
			if (!podeLote()) return;
			const escolha = await escolherPreferencia(botao, true);
			if (!escolha || !escolha.pref) return;
			await rodarLote("analisar", escolha, null);
		}
	}, true);

	// Confere se dá para começar um lote; avisa o motivo quando não dá.
	function podeLote() {
		if (emAndamento) {
			statusLote("Aguarde: já há um decurso sendo tratado (feche o popup aberto, se houver).");
			alert("Já há um decurso sendo tratado. Termine-o (ou feche o popup aberto) e tente de novo.");
			return null;
		}
		const sel = alvosMarcados();
		if (!sel.alvos.length) {
			const msg = marcadosVisiveis()
				? "Nenhum dos processos marcados aguarda análise do decurso de prazo nesta lista (já analisados/dispensados, ou sem os botões \"Analisar Decurso\"/\"Dispensar\" na linha)."
				: "Marque os processos na caixinha de cada linha.";
			statusLote(msg);
			alert(msg);
			return null;
		}
		return sel;
	}

	// Analisa (com `escolha`) ou dispensa os processos marcados, um de cada
	// vez. Usado pelos botões da barra e pelo card ⭐ (API abaixo).
	async function rodarLote(acao, escolha, sel) {
		sel = sel || podeLote();
		if (!sel) return;
		emAndamento = true;
		parar = false;
		const pararBtn = loteEl ? loteEl.querySelector('[data-pdp-dec-lote="parar"]') : null;
		if (pararBtn) {
			pararBtn.hidden = false;
			pararBtn.disabled = false;
		}
		atualizarLote();
		let feitos = 0;
		let falhas = 0;
		const total = sel.alvos.length;
		try {
			for (let i = 0; i < total; i++) {
				if (parar) break;
				const a = sel.alvos[i];
				if (!a.caixa.isConnected) { falhas++; continue; }
				statusLote("Processo " + (i + 1) + " de " + total + "…");
				a.row.classList.add("pdp-pl-lote-atual");
				try { a.row.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* segue */ }
				travar(a.caixa, true);
				let ok = false;
				try {
					const url = a.caixa.getAttribute("data-pdp-dec-url");
					ok = acao === "dispensar" ? await dispensarNaLinha(a.caixa, url) : await analisarNaLinha(a.caixa, url, escolha);
				} catch (e) {
					console.error(TAG, e);
					status(a.caixa, "⚠ " + ((e && e.message) || "falha."), "erro");
				}
				if (a.caixa.isConnected) travar(a.caixa, false);
				a.row.classList.remove("pdp-pl-lote-atual");
				if (ok) {
					feitos++;
					a.check.checked = false;
					a.check.dispatchEvent(new Event("change", { bubbles: true }));
				} else {
					falhas++;
				}
			}
		} finally {
			const parado = parar;
			emAndamento = false;
			if (pararBtn) pararBtn.hidden = true;
			atualizarLote();
			const naoIniciados = total - feitos - falhas;
			statusLote((parado ? "⏹ Parado: " : (acao === "dispensar" ? "Dispensa" : "Análise") + " em lote concluída: ") + feitos + " feito(s)" +
				(falhas ? " · " + falhas + " não feito(s)" : "") + (naoIniciados ? " · " + naoIniciados + " não iniciado(s)" : "") +
				(sel.pulados ? " · " + sel.pulados + " pulado(s) (não aguardam análise)" : ""));
		}
	}

	// API para o card ⭐ (preferenciasNaLinha.js): as preferências do
	// Analisar Decurso aparecem também lá, na linha e no "Em lote".
	window.__pdpDecursoNaLinha = {
		// Esta lista tem linhas com os botões do decurso.
		disponivel: function () {
			return !!document.querySelector(".pdp-dec-acoes");
		},
		listarPreferencias: listarPreferencias,
		removerPreferencia: function (id) {
			const api = window.__pdpJuntarDocumentoApi;
			return api && api.removerDecurso ? api.removerDecurso(id) : Promise.resolve();
		},
		// `escolha`: { acao: "pref" | "nova" | "editar", pref }. Resolve com
		// { ok, texto }.
		executarNaLinha: async function (row, escolha) {
			const caixa = row && row.querySelector(".pdp-dec-acoes");
			if (!caixa || !caixa.querySelector(".pdp-dec-btn")) return { ok: false, texto: "esta linha não aguarda análise do decurso de prazo." };
			if (emAndamento) return { ok: false, texto: "já há um decurso sendo tratado." };
			emAndamento = true;
			travar(caixa, true);
			try {
				const ok = await analisarNaLinha(caixa, caixa.getAttribute("data-pdp-dec-url"), escolha);
				return { ok: true, texto: ok ? "Análise do decurso concluída (veja a linha)." : "Veja o resultado na linha." };
			} catch (e) {
				status(caixa, "⚠ " + ((e && e.message) || "falha."), "erro");
				return { ok: false, texto: (e && e.message) || "falha." };
			} finally {
				emAndamento = false;
				if (caixa.isConnected) travar(caixa, false);
				atualizarLote();
			}
		},
		executarLote: function (escolha) {
			return rodarLote("analisar", escolha, null);
		}
	};

	let agendado = false;
	new MutationObserver(function () {
		if (agendado) return;
		agendado = true;
		setTimeout(function () {
			agendado = false;
			inserirBotoes();
			garantirLote();
		}, 200);
	}).observe(document.documentElement, { childList: true, subtree: true });
	inserirBotoes();
	garantirLote();
})();
