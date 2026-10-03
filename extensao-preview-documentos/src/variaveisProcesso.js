// Projudi/SEEU - Variáveis com os dados do processo ({numero_processo},
// {reus}, {classe}...)
//
// Compartilhado pelo "📎 Juntar Documento" (juntarDocumento.js, que troca as
// variáveis no texto das preferências; a certidão de envio, certidaoEnvio.js,
// acrescenta as do envio) e pelo "📄 Copiar dados" (copiarDados.js, que monta
// o texto a copiar). É infraestrutura: sempre carregado, antes dos dois (ver
// a lista em termosUso.js), e não aparece no catálogo do Menu.
//
// De onde vêm os dados (todos lidos da tela do processo, na hora):
// - número: Projudi <h3><em class="attention">; SEEU div.titulo.processo;
// - juízo: SEEU td[data-label="juízo"] + célula seguinte; Projudi
//   #areaatuacao (link "Atuação");
// - classe e assunto: rótulos "Classe Processual"/"Assunto Principal" da
//   tabela de informações do cabeçalho (Projudi table#informacoesProcessuais;
//   no SEEU, os mesmos rótulos, se a tela os mostrar);
// - réus: Projudi, a API de reusCabecalho.js (window.__pdpReusCabecalho),
//   com nome, RG e CPF de cada parte do polo passivo; sem ela, o texto da
//   lista já desenhada no cabeçalho (.pdp-reus-lista > li). No SEEU não há
//   leitor dos réus: as variáveis de réus ficam sem valor.
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpVariaveisProcesso) return;

	// Nome → descrição (a descrição aparece na ajuda dos painéis).
	const VARIAVEIS_PROCESSO = {
		numero_processo: "número do processo",
		numero_sem_mascara: "número do processo só com os 20 dígitos, sem pontos e traços",
		classe: "classe processual do cabeçalho",
		assunto_processo: "assunto principal do cabeçalho",
		juizo: "juízo/vara do cabeçalho",
		reus: "réus do cabeçalho (com RG e CPF, se a função \"Réus no cabeçalho\" estiver ativa), separados por \";\"",
		reus_linhas: "réus, um por linha: nome, RG e CPF",
		cpfs: "CPFs dos réus só com números, um por linha",
		hoje: "data de hoje (03/10/2026)",
		hoje_extenso: "data de hoje por extenso (3 de outubro de 2026)",
		agora: "hora atual (14:32)",
		evento: "movimentação marcada na caixinha da aba Movimentações",
	};
	// Só têm valor na certidão de envio (certidaoEnvio.js).
	const VARIAVEIS_ENVIO = {
		meio: "envio: e-mail ou WhatsApp",
		destinatario: "envio: nome e contato de quem recebeu",
		arquivos: "envio: documentos enviados, com o número da movimentação",
		data_envio: "envio: data do envio",
		hora_envio: "envio: hora do envio",
		remetente: "envio: conta que enviou o e-mail",
		assunto: "envio: assunto do e-mail",
		comprovante: "envio: quadro com os dados conferidos do envio",
	};
	const VARIAVEL_PERGUNTAR = { perguntar: "{perguntar:Texto} pede o valor na hora" };
	const VARIAVEL_RE = /\{\s*([a-z_]+)\s*(?::\s*([^{}<>]{1,80}?))?\s*\}/gi;
	const NUMERO_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
	const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

	function cleanText(text) {
		return (text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
	}

	function normalize(text) {
		return cleanText(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	}

	function doisDigitos(n) {
		return (n < 10 ? "0" : "") + n;
	}

	function dataBr(d) {
		return doisDigitos(d.getDate()) + "/" + doisDigitos(d.getMonth() + 1) + "/" + d.getFullYear();
	}

	function horaBr(d) {
		return doisDigitos(d.getHours()) + ":" + doisDigitos(d.getMinutes());
	}

	// Projudi: <h3><em class="attention">; SEEU: div.titulo.processo.
	function numeroProcesso(doc) {
		const heading = doc.querySelector("h3 em.attention, div.titulo.processo");
		const match = NUMERO_RE.exec((doc.title || "") + " " + (heading ? heading.textContent : ""));
		return match ? match[0] : null;
	}

	// Texto de uma célula sem <script>/<style> (algumas células do Projudi
	// trazem um script embutido) e sem o que a extensão acrescentou nela
	// (ex.: o balão "✏️ Alterar" de alterarClasseAssuntos.js).
	function textoCelula(td) {
		const clone = td.cloneNode(true);
		clone.querySelectorAll("script, style, noscript, [class^='pdp-'], [class*=' pdp-']").forEach(function (el) { el.remove(); });
		return cleanText(clone.textContent);
	}

	// Valor ao lado do primeiro rótulo que casar com `regex` (texto do rótulo
	// normalizado, sem o ":" final). Rótulos: td.label/td.labelRadio do
	// Projudi e td[data-label] do SEEU; o valor é a célula seguinte.
	function campoCabecalho(doc, regex) {
		const raiz = doc.getElementById("informacoesProcessuais") || doc;
		const rotulos = raiz.querySelectorAll("td.label, td.labelRadio, td[data-label]");
		for (let i = 0; i < rotulos.length; i++) {
			const td = rotulos[i];
			if (td.closest("[class^='pdp-'], [class*=' pdp-']")) continue;
			const rotulo = normalize(td.getAttribute("data-label") || td.textContent).replace(/\s*:\s*$/, "");
			if (!regex.test(rotulo)) continue;
			let valor = td.nextElementSibling;
			while (valor && valor.tagName !== "TD") valor = valor.nextElementSibling;
			const texto = valor ? textoCelula(valor) : "";
			if (texto) return texto;
		}
		return "";
	}

	function juizoDoProcesso(doc) {
		// SEEU: campo "Juízo:" da tabela do processo; Projudi: link "Atuação".
		const juizoSeeu = doc.querySelector('td[data-label="juízo"]');
		const juizo = juizoSeeu && juizoSeeu.nextElementSibling ? juizoSeeu.nextElementSibling : doc.querySelector("#areaatuacao");
		return juizo ? cleanText(juizo.textContent) : "";
	}

	// Réus do cabeçalho: { reus: [{nome, rg, cpf}], situacao } com situacao
	// "ok", "carregando" (o Projudi ainda está respondendo), "erro",
	// "desativado" (função "Réus no cabeçalho" desligada) ou "seeu".
	function reusDoProcesso(doc) {
		if (location.pathname.startsWith("/seeu/")) return { reus: [], situacao: "seeu" };
		const api = window.__pdpReusCabecalho;
		if (api && typeof api.partes === "function") {
			const partes = api.partes();
			if (partes) return { reus: partes, situacao: "ok" };
			return { reus: [], situacao: api.erro() ? "erro" : "carregando" };
		}
		// Sem a API (outro frame?): o texto da lista "NOME (RG: x; CPF: y)".
		const itens = Array.prototype.slice.call(doc.querySelectorAll(".pdp-reus-lista > li"));
		if (!itens.length) return { reus: [], situacao: "desativado" };
		return {
			situacao: "ok",
			reus: itens.map(function (li) {
				const nome = li.querySelector(".pdp-reus-nome");
				const docs = cleanText((li.querySelector(".pdp-reus-docs") || {}).textContent);
				const rg = /RG:\s*([^;)]+)/.exec(docs);
				const cpf = /CPF:\s*([^;)]+)/.exec(docs);
				return { nome: cleanText(nome ? nome.textContent : li.textContent), rg: rg ? cleanText(rg[1]) : "", cpf: cpf ? cleanText(cpf[1]) : "" };
			}),
		};
	}

	function soDigitos(text) {
		return String(text || "").replace(/\D/g, "");
	}

	// "NOME (RG: x; CPF: y)" — o mesmo texto da linha do cabeçalho.
	function reuComDocumentos(r) {
		const docs = [];
		if (r.rg) docs.push("RG: " + r.rg);
		if (r.cpf) docs.push("CPF: " + r.cpf);
		return r.nome + (docs.length ? " (" + docs.join("; ") + ")" : "");
	}

	// "NOME, RG x, CPF y" — só os documentos preenchidos.
	function reuEmLinha(r) {
		return [r.nome].concat(r.rg ? ["RG " + r.rg] : [], r.cpf ? ["CPF " + r.cpf] : []).join(", ");
	}

	// Lidas na tela do processo, na hora. Variável sem valor fica de fora
	// (ver aplicarVariaveis/aplicarTexto: sobra no texto, como aviso).
	function variaveisDoProcesso(doc) {
		const agora = new Date();
		const numero = numeroProcesso(doc) || "";
		const vars = {
			numero_processo: numero,
			numero_sem_mascara: soDigitos(numero),
			hoje: dataBr(agora),
			hoje_extenso: agora.getDate() + " de " + MESES[agora.getMonth()] + " de " + agora.getFullYear(),
			agora: horaBr(agora),
		};
		const juizo = juizoDoProcesso(doc);
		if (juizo) vars.juizo = juizo;
		const classe = campoCabecalho(doc, /^classe( processual)?$/);
		if (classe) vars.classe = classe;
		const assunto = campoCabecalho(doc, /^assunto( principal)?$/);
		if (assunto) vars.assunto_processo = assunto;
		const reus = reusDoProcesso(doc).reus;
		if (reus.length) {
			vars.reus = reus.map(reuComDocumentos).join("; ");
			vars.reus_linhas = reus.map(reuEmLinha).join("\n");
			const cpfs = reus.map(function (r) { return soDigitos(r.cpf); }).filter(Boolean);
			if (cpfs.length) vars.cpfs = cpfs.join("\n");
		}
		try {
			const mov = window.__pdpMovimentoBase && window.__pdpMovimentoBase.selecionada();
			if (mov) vars.evento = (mov.seq ? "mov. " + mov.seq + " – " : "") + (mov.texto || "");
		} catch (err) {
			// sem movimentação marcada
		}
		return vars;
	}

	function escapeHtml(text) {
		return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	// Rótulos dos {perguntar:...} do texto, sem repetição.
	function perguntasDoTexto(texto) {
		const rotulos = [];
		String(texto || "").replace(VARIAVEL_RE, function (m, nome, rotulo) {
			if (nome.toLowerCase() === "perguntar") {
				const r = cleanText(rotulo || "Valor");
				if (rotulos.indexOf(r) === -1) rotulos.push(r);
			}
			return m;
		});
		return rotulos;
	}

	function trocar(texto, vars, formatar) {
		const faltando = [];
		const out = String(texto || "").replace(VARIAVEL_RE, function (m, nome, rotulo) {
			const chave = nome.toLowerCase() === "perguntar" ? "perguntar:" + cleanText(rotulo || "Valor") : nome.toLowerCase();
			const valor = vars ? vars[chave] : undefined;
			if (valor === undefined || valor === null || valor === "") {
				if (faltando.indexOf(m) === -1) faltando.push(m);
				return m;
			}
			return formatar(String(valor));
		});
		return { texto: out, faltando: faltando };
	}

	// Troca as variáveis pelo valor (texto com quebras de linha vira <br>).
	// Devolve { html, faltando: [variáveis sem valor] }; as sem valor ficam
	// como estão, para o usuário ver e completar.
	function aplicarVariaveis(html, vars) {
		const r = trocar(html, vars, function (valor) { return escapeHtml(valor).replace(/\r?\n/g, "<br>"); });
		return { html: r.texto, faltando: r.faltando };
	}

	// Mesmo que aplicarVariaveis, para texto simples (Copiar dados). Devolve
	// também `semFaltando`: o texto sem as variáveis vazias, para quem quiser
	// copiar assim mesmo. Na linha que tinha uma delas, saem também os
	// separadores que sobraram no fim (" — ", ",", ";"); e a linha some se
	// ficar só com o rótulo ("Evento:") ou sem letras e números.
	function aplicarTexto(texto, vars) {
		const r = trocar(texto, vars, function (valor) { return valor; });
		let semFaltando = r.texto;
		if (r.faltando.length) {
			semFaltando = r.texto.split(/\r?\n/).map(function (linha) {
				let nova = linha;
				r.faltando.forEach(function (m) { nova = nova.split(m).join(""); });
				if (nova === linha) return linha;
				nova = nova.replace(/\(\s*\)/g, "").replace(/[\s,;—–-]+$/, "");
				return /[\p{L}\p{N}]/u.test(nova) && !/:\s*$/.test(nova) ? nova : null;
			}).filter(function (l) { return l !== null; }).join("\n");
		}
		return { texto: r.texto, faltando: r.faltando, semFaltando: semFaltando };
	}

	window.__pdpVariaveisProcesso = {
		VARIAVEIS_PROCESSO: VARIAVEIS_PROCESSO,
		VARIAVEIS_ENVIO: VARIAVEIS_ENVIO,
		// Juntar Documento: todas (as do envio só valem na certidão de envio).
		VARIAVEIS: Object.assign({}, VARIAVEIS_PROCESSO, VARIAVEIS_ENVIO, VARIAVEL_PERGUNTAR),
		numeroProcesso: numeroProcesso,
		campoCabecalho: campoCabecalho,
		reusDoProcesso: reusDoProcesso,
		reuComDocumentos: reuComDocumentos,
		reuEmLinha: reuEmLinha,
		soDigitos: soDigitos,
		variaveisDoProcesso: variaveisDoProcesso,
		perguntasDoTexto: perguntasDoTexto,
		aplicarVariaveis: aplicarVariaveis,
		aplicarTexto: aplicarTexto,
		dataBr: dataBr,
		horaBr: horaBr,
	};
})();
