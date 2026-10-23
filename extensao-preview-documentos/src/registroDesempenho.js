// Registro de travamentos e lentidão (diagnóstico).
//
// Anota, em cada quadro das páginas do Projudi/SEEU, os momentos em que a
// tela ficou sem responder ou pesada, e quem ocupou esse tempo (scripts
// desta extensão, do próprio Projudi/SEEU ou de outra extensão). O Menu
// (ícone da balança) baixa o registro em .json para análise - ver
// "Registro de travamentos e lentidão" em src/menuExtensao.js.
//
// Três tipos de anotação:
//   - "travamento": um quadro de tela (long animation frame) que levou
//     TRAVAMENTO_MS ou mais - nesse tempo clique e digitação não respondem;
//   - "lentidao": numa janela de JANELA_MS, a soma dos quadros longos passou
//     de LENTIDAO_MS (a tela ficou pesada, ainda que sem uma travada grande);
//   - "carregamento": a página levou CARREGAMENTO_MS ou mais para abrir,
//     separando a espera pelo servidor do Tribunal da montagem da tela.
//
// Privacidade: guarda só o caminho da tela (sem "?..." - nada de número de
// processo ou token), tempos, nomes de arquivos/funções de script e a
// quantidade de elementos da página. Nenhum texto da tela é lido.
//
// O registro fica em chrome.storage.local (`pdpRegistroDesempenho`), com no
// máximo 500 anotações; quem grava é o service worker (background.js), para
// os vários quadros não sobrescreverem uns aos outros.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpRegistroDesempenho) return;
	window.__pdpRegistroDesempenho = true;

	const TRAVAMENTO_MS = 200;
	const JANELA_MS = 10000;
	const LENTIDAO_MS = 3000;
	const CARREGAMENTO_MS = 4000;
	const MAX_POR_MINUTO = 30;

	const SISTEMA = /(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(location.hostname) ? "SEEU" : "Projudi";
	const BASE_EXTENSAO = "chrome-extension://" + chrome.runtime.id + "/";

	function tipoDeQuadro() {
		if (window === window.top) return "janela";
		try {
			const fe = window.frameElement;
			if (fe && (fe.hasAttribute("data-pdp-loader") || fe.classList.contains("pdp-qa-fetch-iframe"))) return "oculto da extensão";
			if (fe && fe.classList.contains("pdp-qa-modal-iframe")) return "popup da extensão";
			return "quadro" + (window.name ? " " + window.name : "");
		} catch (err) {
			return "quadro";
		}
	}
	const QUADRO = tipoDeQuadro();

	// -------------------------------------------------------------------
	// Cronômetro dos scripts da extensão
	// -------------------------------------------------------------------
	// O Chrome não diz quais scripts de extensão rodaram num quadro longo
	// (aparecem sem endereço). Por isso a extensão cronometra os próprios
	// vigias de mudança (MutationObserver), temporizadores (setTimeout,
	// setInterval, requestAnimationFrame) e reações a eventos
	// (addEventListener). As trocas abaixo valem só para os scripts desta
	// extensão neste quadro (o "mundo isolado" deles): o código do
	// Projudi/SEEU não é tocado. Cada execução de 1 ms ou mais fica numa
	// lista curta, com o horário absoluto, para a janela de cima somar o que
	// caiu dentro de cada quadro longo (de todos os quadros da aba).
	const MIN_EXECUCAO_MS = 1;
	const MAX_EXECUCOES = 400;
	const execucoes = [];
	window.__pdpExecucoesExtensao = execucoes;
	const T0 = performance.timeOrigin;

	// Arquivo da extensão que registrou a função, lido da pilha guardada no
	// registro - só quando uma execução demora (montar o texto da pilha a
	// cada registro custava caro nas telas com milhares de elementos).
	function pilhaCurta() {
		const limite = Error.stackTraceLimit;
		Error.stackTraceLimit = 6;
		const erro = new Error();
		Error.stackTraceLimit = limite;
		return erro;
	}
	function arquivoDaPilha(erro) {
		const pilha = String(erro.stack || "").split("\n");
		for (let i = 1; i < pilha.length; i++) {
			const m = pilha[i].indexOf(BASE_EXTENSAO);
			if (m === -1 || pilha[i].indexOf("registroDesempenho.js") !== -1) continue;
			return pilha[i].slice(m + BASE_EXTENSAO.length).split(/[:?#)]/)[0];
		}
		return "?";
	}

	const embrulhadas = new WeakMap();
	function embrulhar(fn, tipo) {
		if (typeof fn !== "function") return fn;
		const pronta = embrulhadas.get(fn);
		if (pronta) return pronta;
		const pilha = pilhaCurta();
		let arquivo = null;
		const nova = function () {
			const inicio = performance.now();
			try {
				return fn.apply(this, arguments);
			} catch (err) {
				// Erro não tratado num vigia/temporizador/evento da extensão:
				// anota e deixa seguir como antes (o Chrome continua mostrando).
				if (arquivo === null) arquivo = arquivoDaPilha(pilha);
				registrarErro("erro", [err], arquivo + " (" + tipo + ")");
				throw err;
			} finally {
				const ms = performance.now() - inicio;
				if (ms >= MIN_EXECUCAO_MS) {
					if (arquivo === null) arquivo = arquivoDaPilha(pilha);
					execucoes.push({ inicio: T0 + inicio, ms: ms, arquivo: arquivo, tipo: tipo });
					if (execucoes.length > MAX_EXECUCOES) execucoes.splice(0, execucoes.length - MAX_EXECUCOES);
				}
			}
		};
		embrulhadas.set(fn, nova);
		return nova;
	}

	const OriginalObserver = window.MutationObserver;
	window.MutationObserver = class extends OriginalObserver {
		constructor(fn) { super(embrulhar(fn, "vigia de mudanças")); }
	};
	const originais = { setTimeout: window.setTimeout, setInterval: window.setInterval, requestAnimationFrame: window.requestAnimationFrame };
	window.setTimeout = function (fn, ...resto) { return originais.setTimeout.call(window, embrulhar(fn, "temporizador"), ...resto); };
	window.setInterval = function (fn, ...resto) { return originais.setInterval.call(window, embrulhar(fn, "conferência periódica"), ...resto); };
	window.requestAnimationFrame = function (fn) { return originais.requestAnimationFrame.call(window, embrulhar(fn, "antes de desenhar")); };
	// Eventos: só os da página como um todo (janela, documento, <html> e
	// <body>), onde ficam as reações a rolar, passar o mouse e teclar. As de
	// cada botão ou caixinha só rodam com um clique e não pesam - e
	// cronometrá-las custava caro (milhares de caixinhas a cada troca de aba).
	const adicionar = EventTarget.prototype.addEventListener;
	const remover = EventTarget.prototype.removeEventListener;
	function daPagina(alvo) {
		return alvo === window || alvo === document || alvo === document.documentElement || alvo === document.body;
	}
	EventTarget.prototype.addEventListener = function (tipo, fn, opcoes) {
		return adicionar.call(this, tipo, daPagina(this) ? embrulhar(fn, "evento " + tipo) : fn, opcoes);
	};
	EventTarget.prototype.removeEventListener = function (tipo, fn, opcoes) {
		return remover.call(this, tipo, daPagina(this) ? (fn && embrulhadas.get(fn)) || fn : fn, opcoes);
	};

	// -------------------------------------------------------------------
	// Erros e avisos da extensão
	// -------------------------------------------------------------------
	// Os mesmos que aparecem em chrome://extensions → Erros (que não tem como
	// baixar tudo de uma vez): erros não tratados nos vigias, temporizadores e
	// eventos (acima), promessas rejeitadas sem tratamento e o que os scripts
	// da extensão escrevem com console.error/console.warn. Só os textos (e
	// mensagens de erro), já limpos: sem "?..." de endereços, número de
	// processo, CPF ou outros números longos. Objetos não entram. O service
	// worker junta as repetições numa linha só, com a contagem.
	const MAX_ERROS_POR_MINUTO = 60;
	let errosNoMinuto = 0;
	let minutoDosErros = 0;

	function limparTexto(t) {
		return String(t)
			.replace(/(https?:\/\/[^\s?#"')]+)[?#][^\s"')]*/g, "$1?…")
			.replace(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g, "[processo]")
			.replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[cpf]")
			.replace(/\d{6,}/g, "[número]")
			.slice(0, 400);
	}

	// Linhas da pilha que são desta extensão: "src/content.js:123".
	function locaisDaPilha(err) {
		return String((err && err.stack) || "").split("\n")
			.filter(function (l) { return l.indexOf(BASE_EXTENSAO) !== -1 && l.indexOf("registroDesempenho.js") === -1; })
			.slice(0, 4)
			.map(function (l) {
				const resto = l.slice(l.indexOf(BASE_EXTENSAO) + BASE_EXTENSAO.length);
				const m = /^([^:?#)]+)[^:]*:(\d+)/.exec(resto);
				return m ? m[1] + ":" + m[2] : resto.split(/[?#)]/)[0];
			});
	}

	function registrarErro(tipo, partes, local) {
		const minuto = Math.floor(Date.now() / 60000);
		if (minuto !== minutoDosErros) {
			minutoDosErros = minuto;
			errosNoMinuto = 0;
		}
		if (++errosNoMinuto > MAX_ERROS_POR_MINUTO) return;
		let pilha = [];
		const texto = Array.prototype.map.call(partes, function (p) {
			if (p instanceof Error || (p && typeof p === "object" && typeof p.message === "string" && p.stack)) {
				if (!pilha.length) pilha = locaisDaPilha(p);
				return (p.name || "Error") + ": " + p.message;
			}
			if (typeof p === "string" || typeof p === "number" || typeof p === "boolean") return String(p);
			return p === null || p === undefined ? String(p) : "[objeto]";
		}).join(" ");
		if (!pilha.length) pilha = locaisDaPilha(new Error());
		try {
			chrome.runtime.sendMessage({
				source: "projudi-preview",
				type: "registro-erro",
				erro: {
					tipo: tipo,
					mensagem: limparTexto(texto),
					local: local || pilha[0] || "?",
					pilha: pilha,
					sistema: SISTEMA,
					tela: location.pathname,
					quadro: QUADRO
				}
			}).catch(function () {});
		} catch (err) {
			// extensão recarregada
		}
	}

	const consoleErro = console.error;
	const consoleAviso = console.warn;
	console.error = function () {
		registrarErro("erro", arguments);
		return consoleErro.apply(console, arguments);
	};
	console.warn = function () {
		registrarErro("aviso", arguments);
		return consoleAviso.apply(console, arguments);
	};
	window.addEventListener("unhandledrejection", function (ev) {
		const r = ev.reason;
		// Só as da extensão (com a extensão na pilha) - as do Projudi não.
		if (!(r && r.stack && String(r.stack).indexOf(BASE_EXTENSAO) !== -1)) return;
		registrarErro("erro sem tratamento", [r]);
	});

	// Tempo da extensão entre dois horários absolutos, somando este quadro e
	// os quadros internos da mesma origem.
	function listasDeExecucoes(win, nivel, listas) {
		try {
			if (win.__pdpExecucoesExtensao) listas.push(win.__pdpExecucoesExtensao);
			if (nivel < 3) for (let i = 0; i < win.frames.length; i++) listasDeExecucoes(win.frames[i], nivel + 1, listas);
		} catch (err) {
			// quadro de outra origem
		}
		return listas;
	}
	function tempoDaExtensao(de, ate) {
		const porArquivo = {};
		let total = 0;
		listasDeExecucoes(window, 0, []).forEach(function (lista) {
			lista.forEach(function (e) {
				if (e.inicio + e.ms < de || e.inicio > ate) return;
				const k = e.arquivo + " (" + e.tipo + ")";
				porArquivo[k] = (porArquivo[k] || 0) + e.ms;
				total += e.ms;
			});
		});
		return {
			ms: Math.round(total),
			arquivos: Object.keys(porArquivo)
				.map(function (k) { return { arquivo: k, ms: Math.round(porArquivo[k]) }; })
				.sort(function (a, b) { return b.ms - a.ms; })
				.slice(0, 8)
		};
	}

	// Endereço de script sem "?..." e "#...": "extensão: src/content.js",
	// "Projudi/SEEU: /projudi/js/prototype.js" etc.
	function origemDoScript(url) {
		const u = String(url || "");
		if (!u) return { origem: "desconhecida", arquivo: "" };
		if (u.indexOf(BASE_EXTENSAO) === 0) return { origem: "extensão", arquivo: u.slice(BASE_EXTENSAO.length).split(/[?#]/)[0] };
		if (u.indexOf("chrome-extension://") === 0) return { origem: "outra extensão", arquivo: u.split(/[?#]/)[0] };
		try {
			const p = new URL(u);
			return { origem: p.origin === location.origin ? SISTEMA : "outro site", arquivo: p.pathname };
		} catch (err) {
			return { origem: "desconhecida", arquivo: "" };
		}
	}

	// O Chrome entrega a anotação à janela de cima, mas a tela que mudou
	// costuma estar num quadro interno (ex.: userMainFrame): anota também as
	// telas abertas nos quadros, com o tamanho de cada uma.
	function quadrosInternos(win, nivel, lista) {
		for (let i = 0; i < win.frames.length && lista.length < 12; i++) {
			try {
				const f = win.frames[i];
				const fe = f.frameElement;
				const oculto = !!fe && (fe.hasAttribute("data-pdp-loader") || fe.classList.contains("pdp-qa-fetch-iframe"));
				lista.push({
					quadro: (oculto ? "oculto da extensão" : "quadro") + (f.name ? " " + f.name : ""),
					tela: f.location.pathname,
					elementos: f.document.getElementsByTagName("*").length
				});
				if (nivel < 2) quadrosInternos(f, nivel + 1, lista);
			} catch (err) {
				// quadro de outra origem
			}
		}
		return lista;
	}

	function contexto() {
		const c = { elementos: document.getElementsByTagName("*").length };
		const quadros = quadrosInternos(window, 0, []);
		if (quadros.length) c.quadros = quadros;
		if (performance.memory) c.memoriaMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
		return c;
	}

	let enviadosNoMinuto = 0;
	let minutoAtual = 0;
	function anotar(item) {
		const minuto = Math.floor(Date.now() / 60000);
		if (minuto !== minutoAtual) {
			minutoAtual = minuto;
			enviadosNoMinuto = 0;
		}
		if (++enviadosNoMinuto > MAX_POR_MINUTO) return;
		const registro = Object.assign({
			em: new Date().toISOString(),
			sistema: SISTEMA,
			tela: location.pathname,
			quadro: QUADRO,
			abaVisivel: !document.hidden
		}, item, contexto());
		try {
			chrome.runtime.sendMessage({ source: "projudi-preview", type: "registro-desempenho", registro: registro }).catch(function () {});
		} catch (err) {
			// extensão recarregada: esta página não grava mais
		}
	}

	// Scripts de um quadro longo, do mais demorado para o menos.
	function scriptsDoQuadro(entrada) {
		return (entrada.scripts || []).map(function (s) {
			const o = origemDoScript(s.sourceURL);
			return {
				origem: o.origem,
				arquivo: o.arquivo,
				funcao: s.sourceFunctionName || "",
				chamadoPor: s.invokerType || "",
				ms: Math.round(s.duration),
				layoutForcadoMs: Math.round(s.forcedStyleAndLayoutDuration || 0)
			};
		}).sort(function (a, b) { return b.ms - a.ms; });
	}

	function somarPorOrigem(scripts, alvo) {
		scripts.forEach(function (s) { alvo[s.origem] = (alvo[s.origem] || 0) + s.ms; });
		return alvo;
	}

	// Janela de lentidão: soma dos quadros longos em JANELA_MS.
	let janela = null;
	function novaJanela(agora) {
		return { inicio: agora, quadrosLongos: 0, ms: 0, maiorMs: 0, porOrigem: {}, porArquivo: {} };
	}
	function acumular(entrada, scripts) {
		const agora = performance.now();
		if (!janela) janela = novaJanela(agora);
		if (agora - janela.inicio >= JANELA_MS) {
			if (janela.ms >= LENTIDAO_MS) {
				const arquivos = Object.keys(janela.porArquivo)
					.map(function (k) { return { arquivo: k, ms: janela.porArquivo[k] }; })
					.sort(function (a, b) { return b.ms - a.ms; })
					.slice(0, 8);
				anotar({
					tipo: "lentidao",
					janelaS: Math.round((agora - janela.inicio) / 1000),
					quadrosLongos: janela.quadrosLongos,
					msOcupado: Math.round(janela.ms),
					maiorQuadroMs: Math.round(janela.maiorMs),
					extensao: tempoDaExtensao(T0 + janela.inicio, T0 + agora),
					msPorOrigem: janela.porOrigem,
					arquivos: arquivos
				});
			}
			janela = novaJanela(agora);
		}
		janela.quadrosLongos++;
		janela.ms += entrada.duration;
		janela.maiorMs = Math.max(janela.maiorMs, entrada.duration);
		somarPorOrigem(scripts, janela.porOrigem);
		scripts.forEach(function (s) {
			const k = s.origem + ": " + s.arquivo;
			janela.porArquivo[k] = (janela.porArquivo[k] || 0) + s.ms;
		});
	}

	function aoQuadroLongo(entrada) {
		const scripts = scriptsDoQuadro(entrada);
		acumular(entrada, scripts);
		if (entrada.duration < TRAVAMENTO_MS) return;
		const fim = entrada.startTime + entrada.duration;
		anotar({
			tipo: "travamento",
			// Quanto deste tempo foi da extensão, por arquivo (cronômetro acima).
			extensao: tempoDaExtensao(T0 + entrada.startTime, T0 + fim),
			ms: Math.round(entrada.duration),
			bloqueioMs: Math.round(entrada.blockingDuration || 0),
			// Recalcular estilos e a posição dos elementos no fim do quadro.
			layoutMs: entrada.styleAndLayoutStart ? Math.round(fim - entrada.styleAndLayoutStart) : null,
			msPorOrigem: somarPorOrigem(scripts, {}),
			scripts: scripts.slice(0, 8)
		});
	}

	try {
		if ((PerformanceObserver.supportedEntryTypes || []).indexOf("long-animation-frame") !== -1) {
			new PerformanceObserver(function (lista) {
				lista.getEntries().forEach(aoQuadroLongo);
			}).observe({ type: "long-animation-frame", buffered: true });
		} else {
			// Chrome anterior ao 123: só a duração, sem dizer de quem foi.
			new PerformanceObserver(function (lista) {
				lista.getEntries().forEach(function (e) {
					if (e.duration >= TRAVAMENTO_MS) anotar({ tipo: "travamento", ms: Math.round(e.duration), scripts: [] });
				});
			}).observe({ type: "longtask", buffered: true });
		}
	} catch (err) {
		console.warn("[Projudi Registro de desempenho] navegador sem suporte:", err);
	}

	// Carregamento lento da página: quanto foi o servidor, quanto foi a tela.
	function conferirCarregamento() {
		const n = performance.getEntriesByType("navigation")[0];
		if (!n || !n.loadEventEnd || n.loadEventEnd < CARREGAMENTO_MS) return;
		anotar({
			tipo: "carregamento",
			ms: Math.round(n.loadEventEnd),
			servidorMs: Math.round(n.responseStart - n.requestStart),
			downloadMs: Math.round(n.responseEnd - n.responseStart),
			montagemMs: Math.round(n.domContentLoadedEventEnd - n.responseEnd),
			recursosMs: Math.round(n.loadEventEnd - n.domContentLoadedEventEnd)
		});
	}
	if (document.readyState === "complete") setTimeout(conferirCarregamento, 0);
	else window.addEventListener("load", function () { setTimeout(conferirCarregamento, 0); }, { once: true });
})();
