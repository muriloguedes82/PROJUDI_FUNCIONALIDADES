// Projudi - Certidão de envio (e-mail e WhatsApp)
//
// Depois de mandar documentos do processo por e-mail (email.js) ou por
// WhatsApp (content.js), quase sempre é preciso certificar o envio nos
// autos. Este arquivo guarda cada envio feito a partir da tela do processo e
// mostra, nessa mesma tela, um quadro "📎 Certificar envio" que roda uma
// preferência do "📎 Juntar Documento" (juntarDocumento.js) com as
// variáveis do envio já preenchidas: {meio}, {destinatario}, {arquivos},
// {data_envio}, {hora_envio}, {remetente}, {assunto} e {comprovante}.
//
// Conferência do envio (o "Enviar" final é sempre clicado pelo usuário, no
// Outlook ou no WhatsApp — a extensão não sabe sozinha se ele foi clicado):
// - e-mail pelo Microsoft Graph: o background procura o e-mail na pasta
//   Itens Enviados (data/hora do servidor, De, Para, Assunto, anexos);
// - e-mail pelo Outlook Web (sem Azure AD): não há como conferir — o quadro
//   avisa e a data/hora e o comprovante ficam para o usuário completar;
// - WhatsApp: o background lê, na conversa aberta pela extensão, as
//   mensagens enviadas depois do envio (nome do arquivo, hora, ✓/✓✓/lida).
// A conferência é repetida a cada VERIFICAR_MS enquanto o quadro estiver
// aberto. Certificar sem conferência pede confirmação.
//
// Os envios pendentes ficam no sessionStorage (só esta aba), por número do
// processo, até serem certificados ou descartados (✕), ou por MAX_IDADE_MS.
// Projudi e SEEU (o SEEU usa o mesmo fluxo de juntada do Projudi).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (!/^\/(projudi|seeu)\//.test(location.pathname)) return;
	try {
		const frame = window.frameElement;
		if (frame && (frame.hasAttribute("data-pdp-loader") || frame.classList.contains("pdp-qa-fetch-iframe") || frame.classList.contains("pdp-qa-modal-iframe"))) return;
	} catch (err) {
		// frameElement inacessível — segue normalmente
	}
	if (window.__pdpCertidaoEnvio) return;

	const ENVIOS_KEY = "pdpCertidaoEnvioPendentes";
	const ESCOLHA_KEY = "pdpCertidaoEnvioEscolha"; // { email: prefId, whatsapp: prefId, revisar: bool }
	const MAX_IDADE_MS = 4 * 60 * 60 * 1000;
	const VERIFICAR_MS = 10000;
	const VERIFICAR_ATE_MS = 2 * 60 * 60 * 1000;
	const MESSAGE_SOURCE = "projudi-preview";
	const LOG = "[Projudi Certidão de envio]";
	const MODELO =
		"CERTIFICO que, nesta data, encaminhei por {meio} a {destinatario} o(s) seguinte(s) documento(s): {arquivos}.\n\n{comprovante}";

	// -------------------------------------------------------------------
	// Utilidades
	// -------------------------------------------------------------------

	function limpar(text) {
		return (text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function semAcento(text) {
		return limpar(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function dois(n) {
		return (n < 10 ? "0" : "") + n;
	}

	function dataBr(ms) {
		const d = new Date(ms);
		return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear();
	}

	function horaBr(ms) {
		const d = new Date(ms);
		return dois(d.getHours()) + ":" + dois(d.getMinutes());
	}

	function numeroProcesso(doc) {
		const heading = doc.querySelector("h3 em.attention, em.attention, div.titulo.processo");
		const match = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec((doc.title || "") + " " + (heading ? heading.textContent : ""));
		return match ? match[0] : null;
	}

	// 5541999998888 → +55 (41) 99999-8888
	function telefoneBr(digitos) {
		const d = String(digitos || "").replace(/\D/g, "");
		const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d);
		return m ? "+55 (" + m[1] + ") " + m[2] + "-" + m[3] : d ? "+" + d : "";
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
		return new Promise(function (resolve) {
			try {
				chrome.storage.local.set({ [key]: value }, resolve);
			} catch (err) {
				resolve();
			}
		});
	}

	function sendMessage(message) {
		return new Promise(function (resolve) {
			try {
				chrome.runtime.sendMessage(message, function (response) {
					if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
					else resolve(response || { ok: false, error: "Sem resposta da extensão." });
				});
			} catch (err) {
				resolve({ ok: false, error: err.message });
			}
		});
	}

	// -------------------------------------------------------------------
	// Envios pendentes (sessionStorage desta aba)
	// -------------------------------------------------------------------

	function lerEnvios() {
		try {
			const lista = JSON.parse(sessionStorage.getItem(ENVIOS_KEY) || "[]");
			return (Array.isArray(lista) ? lista : []).filter(function (e) {
				return e && Date.now() - e.criadoEm < MAX_IDADE_MS;
			});
		} catch (err) {
			return [];
		}
	}

	function gravarEnvios(lista) {
		try {
			sessionStorage.setItem(ENVIOS_KEY, JSON.stringify(lista));
		} catch (err) {
			console.warn(LOG, "não foi possível guardar o envio:", err);
		}
	}

	function atualizarEnvio(id, fn) {
		const lista = lerEnvios();
		const envio = lista.find(function (e) { return e.id === id; });
		if (!envio) return null;
		fn(envio);
		gravarEnvios(lista);
		return envio;
	}

	function removerEnvio(id) {
		gravarEnvios(lerEnvios().filter(function (e) { return e.id !== id; }));
	}

	// Envio mais recente deste processo, ainda não certificado.
	function envioDaTela() {
		const numero = numeroProcesso(document);
		const lista = lerEnvios().filter(function (e) { return !numero || !e.numero || e.numero === numero; });
		return { envio: lista[lista.length - 1] || null, total: lista.length };
	}

	// -------------------------------------------------------------------
	// Conferência do envio
	// -------------------------------------------------------------------

	const SITUACAO_WA = { "-1": "erro no envio", 0: "aguardando envio", 1: "enviado", 2: "entregue", 3: "lido", 4: "lido" };

	function baseNome(nome) {
		return semAcento(nome).replace(/\.[a-z0-9]{2,5}$/, "");
	}

	// Liga cada arquivo do envio à mensagem do WhatsApp com o mesmo nome.
	function casarWhatsapp(envio, resposta) {
		const msgs = (resposta.mensagens || []).filter(function (m) { return m.nome; });
		const usados = new Set();
		const itens = envio.arquivos.map(function (arq) {
			const alvo = baseNome(arq.nome);
			const idx = msgs.findIndex(function (m, i) {
				if (usados.has(i)) return false;
				const nome = baseNome(m.nome);
				return nome === alvo || nome.indexOf(alvo) === 0 || alvo.indexOf(nome) === 0;
			});
			if (idx === -1) return { nome: arq.nome, enviado: false };
			usados.add(idx);
			const m = msgs[idx];
			return { nome: m.nome, enviado: typeof m.ack === "number" && m.ack >= 1, t: m.t, situacao: SITUACAO_WA[m.ack] || "aguardando envio" };
		});
		const enviados = itens.filter(function (i) { return i.enviado; });
		return {
			completo: enviados.length === itens.length && itens.length > 0,
			parcial: enviados.length > 0 && enviados.length < itens.length,
			enviadoEm: enviados.length ? Math.max.apply(null, enviados.map(function (i) { return i.t; })) : null,
			titulo: resposta.titulo || "",
			itens: itens,
		};
	}

	let verificando = false;

	async function verificar(envio) {
		if (verificando || !envio || !envio.verificacao) return;
		const tipo = envio.verificacao.tipo;
		if (tipo !== "graph" && tipo !== "whatsapp") return;
		if (envio.conferido && envio.conferido.completo) return;
		if (Date.now() - envio.criadoEm > VERIFICAR_ATE_MS) return;
		verificando = true;
		try {
			let resposta;
			if (tipo === "graph") {
				resposta = await sendMessage({
					type: "CERTIDAO_EMAIL_VERIFICAR",
					internetMessageId: envio.verificacao.internetMessageId,
					conversationId: envio.verificacao.conversationId,
					assunto: envio.verificacao.assunto,
					desde: envio.criadoEm,
				});
				atualizarEnvio(envio.id, function (e) {
					if (!resposta.ok) e.erroConferencia = resposta.error;
					else {
						e.erroConferencia = null;
						if (resposta.enviado) e.conferido = Object.assign({ completo: true }, resposta);
					}
				});
			} else {
				resposta = await sendMessage({ source: MESSAGE_SOURCE, type: "whatsapp-verificar-envio", id: envio.verificacao.envioId, desde: envio.criadoEm });
				atualizarEnvio(envio.id, function (e) {
					if (!resposta.ok) e.erroConferencia = resposta.error;
					else {
						e.erroConferencia = null;
						e.conferido = casarWhatsapp(e, resposta);
					}
				});
			}
		} finally {
			verificando = false;
			// Só redesenha se a situação mudou (não fecha a lista de
			// preferências aberta a cada conferência).
			const e = envioDaTela().envio;
			if (!e || textoSituacao(e).texto !== ultimaSituacao) render();
		}
	}

	// -------------------------------------------------------------------
	// Variáveis do envio (ver VARIAVEIS em juntarDocumento.js)
	// -------------------------------------------------------------------

	function contato(d) {
		return d.nome && d.contato ? d.nome + " (" + d.contato + ")" : d.nome || d.contato || "";
	}

	function enderecoEmail(a) {
		return a.nome && a.email && a.nome !== a.email ? a.nome + " <" + a.email + ">" : a.email || a.nome || "";
	}

	function listaArquivos(envio) {
		return envio.arquivos.map(function (a) { return a.nome + (a.seq ? " (mov. " + a.seq + ")" : ""); }).join("; ");
	}

	function variaveisDoEnvio(envio) {
		const c = envio.conferido;
		const vars = {
			meio: envio.meio === "email" ? "e-mail" : "WhatsApp",
			destinatario: envio.destinatarios.map(contato).filter(Boolean).join("; "),
			arquivos: listaArquivos(envio),
			data_envio: dataBr(envio.criadoEm),
		};
		if (envio.meio === "email" && c && c.completo) {
			if (c.para && c.para.length) vars.destinatario = c.para.map(enderecoEmail).join("; ");
			if (c.enviadoEm) {
				vars.data_envio = dataBr(c.enviadoEm);
				vars.hora_envio = horaBr(c.enviadoEm);
			}
			if (c.de) vars.remetente = enderecoEmail(c.de);
			if (c.assunto) vars.assunto = c.assunto;
			const linhas = ["COMPROVANTE DE ENVIO (dados da pasta Itens Enviados do Outlook)"];
			if (c.de) linhas.push("De: " + enderecoEmail(c.de));
			linhas.push("Para: " + (c.para || []).map(enderecoEmail).join("; "));
			if (c.cc && c.cc.length) linhas.push("Cc: " + c.cc.map(enderecoEmail).join("; "));
			if (c.enviadoEm) linhas.push("Data/hora do envio: " + dataBr(c.enviadoEm) + " às " + horaBr(c.enviadoEm));
			if (c.assunto) linhas.push("Assunto: " + c.assunto);
			linhas.push("Anexos: " + ((c.anexos && c.anexos.length) ? c.anexos.join("; ") : "nenhum"));
			vars.comprovante = linhas.join("\n");
		}
		if (envio.meio === "whatsapp" && c && (c.completo || c.parcial)) {
			if (c.enviadoEm) {
				vars.data_envio = dataBr(c.enviadoEm);
				vars.hora_envio = horaBr(c.enviadoEm);
			}
			const dest = envio.destinatarios[0] || {};
			const linhas = ["COMPROVANTE DE ENVIO (dados da conversa no WhatsApp Web)"];
			linhas.push("Para: " + (c.titulo && c.titulo !== dest.contato ? c.titulo + " (" + dest.contato + ")" : contato(dest)));
			c.itens.forEach(function (i) {
				linhas.push("Arquivo: " + i.nome + " — " + (i.enviado ? "enviado em " + dataBr(i.t) + " às " + horaBr(i.t) + " (situação: " + i.situacao + ")" : "não localizado na conversa"));
			});
			vars.comprovante = linhas.join("\n");
		}
		return vars;
	}

	// -------------------------------------------------------------------
	// Quadro "📎 Certificar envio"
	// -------------------------------------------------------------------

	let quadro = null;
	let ultimaSituacao = "";
	let previaAberta = false;
	let temporizador = null;

	function api() {
		const jd = window.__pdpJuntarDocumentoApi;
		return jd && typeof jd.startComVariaveis === "function" && jd.available() ? jd : null;
	}

	function textoSituacao(envio) {
		const tipo = envio.verificacao && envio.verificacao.tipo;
		const c = envio.conferido;
		if (envio.meio === "email") {
			if (tipo !== "graph") {
				return { texto: 'Depois de clicar em "Enviar" no Outlook, certifique aqui. Neste modo de envio (Outlook Web) a extensão não consegue conferir o envio: a hora e o comprovante ficam para você completar.', tipo: "aviso" };
			}
			if (c && c.completo) return { texto: "✅ E-mail enviado em " + dataBr(c.enviadoEm) + " às " + horaBr(c.enviadoEm) + " (conferido nos Itens Enviados do Outlook).", tipo: "ok" };
		} else {
			if (c && c.completo) return { texto: "✅ " + c.itens.length + " de " + c.itens.length + " arquivo(s) enviado(s) no WhatsApp (" + c.itens.map(function (i) { return i.situacao; }).join(", ") + ").", tipo: "ok" };
			if (c && c.parcial) {
				const n = c.itens.filter(function (i) { return i.enviado; }).length;
				return { texto: "⚠ Só " + n + " de " + c.itens.length + " arquivo(s) aparecem como enviados na conversa.", tipo: "aviso" };
			}
		}
		if (envio.erroConferencia) return { texto: "⚠ Ainda não consegui conferir o envio: " + envio.erroConferencia, tipo: "aviso" };
		if (Date.now() - envio.criadoEm > VERIFICAR_ATE_MS) return { texto: "⚠ O envio não foi localizado. Se ele foi feito, você pode certificar mesmo assim.", tipo: "aviso" };
		return { texto: "⏳ Aguardando o envio no " + (envio.meio === "email" ? "Outlook" : "WhatsApp") + "… (a extensão confere sozinha)", tipo: "" };
	}

	function fecharQuadro() {
		if (quadro && quadro.isConnected) quadro.remove();
		quadro = null;
		if (temporizador) clearInterval(temporizador);
		temporizador = null;
	}

	async function copiarModelo(botao) {
		try {
			await navigator.clipboard.writeText(MODELO);
			botao.textContent = "✅ Modelo copiado";
		} catch (err) {
			prompt("Copie o modelo de texto (Ctrl+C):", MODELO.replace(/\n/g, " "));
		}
	}

	async function render() {
		const jd = api();
		const atual = envioDaTela();
		const envio = atual.envio;
		if (!jd || !envio || !document.body) {
			fecharQuadro();
			return;
		}
		const escolha = await storageGet(ESCOLHA_KEY, {});
		const prefs = await jd.prefs();

		const novo = !quadro || !quadro.isConnected;
		const aberto = quadro && quadro.querySelector("select");
		const prefIdAtual = aberto ? aberto.value : null;
		const revisarAtual = quadro && quadro.querySelector(".pdp-ce-revisar input");
		if (!novo) quadro.textContent = "";
		else {
			quadro = document.createElement("div");
			quadro.className = "pdp-ce-quadro";
		}
		quadro.dataset.envio = envio.id;

		const titulo = document.createElement("div");
		titulo.className = "pdp-ce-titulo";
		titulo.textContent = (envio.meio === "email" ? "✉️ E-mail para " : "📱 WhatsApp para ") + (envio.destinatarios.map(contato).join("; ") || "(destinatário escolhido no " + (envio.meio === "email" ? "Outlook" : "WhatsApp") + ")");
		quadro.appendChild(titulo);

		const arquivos = document.createElement("div");
		arquivos.className = "pdp-ce-arquivos";
		arquivos.textContent = envio.arquivos.length ? envio.arquivos.length + " documento(s): " + listaArquivos(envio) : "Sem documentos anexados.";
		quadro.appendChild(arquivos);

		const sit = textoSituacao(envio);
		ultimaSituacao = sit.texto;
		const situacao = document.createElement("div");
		situacao.className = "pdp-ce-situacao" + (sit.tipo ? " pdp-ce-" + sit.tipo : "");
		situacao.textContent = sit.texto;
		quadro.appendChild(situacao);

		const linha = document.createElement("div");
		linha.className = "pdp-ce-linha";
		let select = null;
		if (!prefs.length) {
			const vazio = document.createElement("span");
			vazio.textContent = 'Crie no "📎 Juntar Documento" uma preferência com o texto da certidão (use as variáveis):';
			linha.appendChild(vazio);
		} else {
			const rotulo = document.createElement("label");
			rotulo.textContent = "Certidão: ";
			select = document.createElement("select");
			const vazia = document.createElement("option");
			vazia.value = "";
			vazia.textContent = "— escolha a preferência do Juntar Documento —";
			select.appendChild(vazia);
			prefs.forEach(function (p) {
				const opt = document.createElement("option");
				opt.value = p.id;
				opt.textContent = p.name;
				select.appendChild(opt);
			});
			const sugerida = prefs.find(function (p) { return /certid|envio/i.test(p.name); });
			select.value = prefIdAtual || escolha[envio.meio] || (sugerida ? sugerida.id : "");
			if (!select.value) select.value = "";
			rotulo.appendChild(select);
			linha.appendChild(rotulo);

			const revisar = document.createElement("label");
			revisar.className = "pdp-ce-revisar";
			const chk = document.createElement("input");
			chk.type = "checkbox";
			chk.checked = revisarAtual ? revisarAtual.checked : !!escolha.revisar;
			revisar.appendChild(chk);
			revisar.appendChild(document.createTextNode(" conferir o texto antes de assinar"));
			linha.appendChild(revisar);
		}
		quadro.appendChild(linha);

		const botoes = document.createElement("div");
		botoes.className = "pdp-ce-botoes";
		function botao(texto, titulo, fn, primario) {
			const b = document.createElement("button");
			b.type = "button";
			b.textContent = texto;
			b.title = titulo;
			if (primario) b.className = "pdp-ce-primario";
			b.addEventListener("click", function () { fn(b); });
			botoes.appendChild(b);
			return b;
		}
		if (select) {
			botao("📎 Certificar envio", "Junta a certidão com a preferência escolhida, já com os dados do envio; você só digita o PIN", function () {
				certificar(envio.id, select.value, quadro.querySelector(".pdp-ce-revisar input").checked);
			}, true);
			botao("👁 Ver texto", "Mostra o texto que será juntado (sem o cabeçalho e a assinatura, que o Projudi gera)", function () {
				previaAberta = !previaAberta;
				render();
			});
		}
		botao("📋 Copiar modelo", "Copia um modelo de texto de certidão com as variáveis, para colar ao gravar a preferência", copiarModelo);
		botao("✕", "Não certificar este envio (o quadro some)", function () {
			if (!confirm("Descartar a certidão deste envio? O quadro some e nada é juntado.")) return;
			removerEnvio(envio.id);
			previaAberta = false;
			render();
		});
		quadro.appendChild(botoes);

		if (atual.total > 1) {
			const mais = document.createElement("div");
			mais.className = "pdp-ce-mais";
			mais.textContent = "Há mais " + (atual.total - 1) + " envio(s) deste processo para certificar; eles aparecem aqui depois deste.";
			quadro.appendChild(mais);
		}

		if (previaAberta && select) {
			const pref = prefs.find(function (p) { return p.id === select.value; });
			const pre = document.createElement("pre");
			pre.className = "pdp-ce-previa";
			if (!pref) pre.textContent = "Escolha a preferência da certidão.";
			else {
				const previa = jd.previa(pref, variaveisDoEnvio(envio));
				pre.textContent = previa.texto || "(a preferência não tem texto próprio)";
				if (previa.faltando.length) pre.textContent += "\n\n⚠ Sem valor: " + previa.faltando.join(", ") + " — o texto vai parar para você completar.";
			}
			quadro.appendChild(pre);
			select.addEventListener("change", render);
		}

		if (novo) document.body.appendChild(quadro);
		if (!temporizador) {
			temporizador = setInterval(function () {
				const e = envioDaTela().envio;
				if (e) verificar(e);
			}, VERIFICAR_MS);
		}
	}

	async function certificar(id, prefId, revisar) {
		const jd = api();
		const envio = lerEnvios().find(function (e) { return e.id === id; });
		if (!jd || !envio) return;
		const prefs = await jd.prefs();
		const pref = prefs.find(function (p) { return p.id === prefId; });
		if (!pref) {
			alert("Escolha a preferência do Juntar Documento com o texto da certidão.");
			return;
		}
		const conferivel = envio.verificacao && (envio.verificacao.tipo === "graph" || envio.verificacao.tipo === "whatsapp");
		if (conferivel && !(envio.conferido && envio.conferido.completo)) {
			const ok = confirm(
				"A extensão ainda não conseguiu confirmar que " + (envio.meio === "email" ? "o e-mail foi enviado" : "todos os arquivos foram enviados no WhatsApp") +
					".\n\nCertificar assim mesmo? (O comprovante e a hora do envio ficam para você completar no texto.)"
			);
			if (!ok) return;
		}
		const escolha = await storageGet(ESCOLHA_KEY, {});
		escolha[envio.meio] = prefId;
		escolha.revisar = !!revisar;
		await storageSet(ESCOLHA_KEY, escolha);
		const vars = variaveisDoEnvio(envio);
		removerEnvio(envio.id);
		previaAberta = false;
		fecharQuadro();
		if (!jd.startComVariaveis(pref, vars, revisar)) {
			// Botão nativo ausente ou pergunta cancelada: o envio volta à lista.
			const lista = lerEnvios();
			lista.push(envio);
			gravarEnvios(lista);
			render();
		}
	}

	// -------------------------------------------------------------------
	// Registro de um envio (chamado por email.js e content.js)
	// -------------------------------------------------------------------

	window.__pdpCertidaoEnvio = {
		// envio: { meio: "email" | "whatsapp", destinatarios: [{ nome, contato }],
		//          arquivos: [{ nome, seq }], verificacao: { tipo, ... } | null }
		registrar: function (envio) {
			try {
				const lista = lerEnvios();
				lista.push({
					id: "env-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
					meio: envio.meio === "whatsapp" ? "whatsapp" : "email",
					numero: numeroProcesso(document),
					destinatarios: (envio.destinatarios || []).filter(function (d) { return d && (d.nome || d.contato); }),
					arquivos: (envio.arquivos || []).map(function (a) { return { nome: limpar(a.nome), seq: a.seq || null }; }),
					verificacao: envio.verificacao || null,
					criadoEm: (envio.verificacao && envio.verificacao.criadoEm) || Date.now(),
					conferido: null,
				});
				gravarEnvios(lista);
				previaAberta = false;
				render();
			} catch (err) {
				console.warn(LOG, err);
			}
		},
		telefone: telefoneBr,
	};

	// O quadro aparece de novo ao recarregar a tela do processo (até ser
	// certificado ou descartado). O Juntar Documento expõe a API depois de
	// carregar, por isso a primeira tentativa espera um pouco.
	setTimeout(render, 800);
})();
