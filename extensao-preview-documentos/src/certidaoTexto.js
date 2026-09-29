// Certidão narrativa - funções puras (sem DOM, sem chrome.*).
//
// Usadas em dois lugares:
//   - no content script do Projudi/SEEU (certidaoNarrativa.js), para
//     classificar os movimentos e achar as peças principais;
//   - na página da certidão (certidao.js), para extrair dos textos das
//     peças o trecho dos pedidos e montar os resumos do modo manual.
// Também podem ser carregadas no Node (module.exports) para testes.

(function (root) {
	"use strict";

	function normalizar(texto) {
		return String(texto || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
	}

	function colapsar(texto) {
		return String(texto || "").replace(/\s+/g, " ").trim();
	}

	// ---------------------------------------------------------------
	// Classificação dos movimentos
	// ---------------------------------------------------------------

	// Classificação por APROXIMAÇÃO: o nome do movimento é quebrado em
	// palavras (sem acento, minúsculas) e cada tipo de peça é descrito por
	// "radicais" que precisam aparecer em ordem, com até 3 palavras entre
	// eles. Um radical casa com a palavra que começa por ele, tolerando um
	// erro de digitação (distância de edição 1) nos radicais de 6+ letras.
	// As exclusões e as comunicações usam só o começo exato da palavra.
	// Assim "JUNTADA DE PETIÇÃO DE INICIAL", "PETIÇÃO INICIAL" e "Juntada de
	// Peticao Inicial" caem todos em "inicial".
	//
	// Os movimentos que só MENCIONAM uma peça (intimação, prazo, certidão,
	// "Recebida a denúncia", "cumprimento de sentença", emenda à inicial...)
	// são descartados antes, pelas EXCLUSOES.
	const TIPOS_PECA = [
		{ tipo: "denuncia", rotulo: "Denúncia", frases: [["denuncia"], ["queixa", "crime"]] },
		{ tipo: "inicial", rotulo: "Petição inicial", frases: [["inicial"]] },
		{ tipo: "resposta", rotulo: "Resposta à acusação", frases: [["resposta", "acusac"], ["resposta", "escrit"], ["resposta", "previ"], ["defesa", "previ"], ["defesa", "preliminar"]] },
		{ tipo: "contestacao", rotulo: "Contestação", frases: [["contestac"]] },
		{ tipo: "recurso", rotulo: "Recurso", frases: [["apelac"], ["recurs"], ["razoes"], ["embargos", "declarac"], ["agrav"]] },
		{ tipo: "sentenca", rotulo: "Sentença", frases: [["sentenc"], ["julgad", "procedent"], ["julgad", "improcedent"], ["julgad", "parcial"], ["homologad", "acordo"], ["homologad", "transac"], ["extint"], ["extinc"], ["condenac"], ["absolvi"], ["pronunci"], ["impronunci"]] },
	];

	const EXCLUSOES = [
		["intima"], ["cita"], ["notifica"], ["prazo"], ["decurso"], ["decorr"], ["certida"], ["certific"], ["expedi"],
		["mandado"], ["aviso", "recebimento"], ["leitura"], ["ciencia"], ["publica"], ["disponibiliz"], ["remet"],
		["recebid"], ["recebiment"], ["conclus"], ["vista"], ["carga"], ["contrarraz"], ["contra", "razoes"],
		["audiencia"], ["despach"], ["decisao"], ["cumprimento", "sentenc"], ["transit"], ["arquiv"], ["desarquiv"],
		["emenda"], ["aditament"], ["rejeit"], ["desist"],
	];

	// Movimentos de comunicação (intimação, citação, leitura, prazo, DJEN...),
	// que na certidão viram subitens do evento a que se referem.
	const COMUNICACAO = [
		["intima"], ["cita"], ["notifica"], ["leitura"], ["decurso"], ["decorr"], ["prazo"], ["disponibiliz"],
		["publica"], ["expedi"], ["ciencia"], ["confirmad"], ["aviso", "recebimento"], ["mandado"], ["carta"],
		["edital"], ["oficio"],
	];

	function palavras(texto) {
		return normalizar(texto).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
	}

	function distancia(a, b) {
		if (a === b) return 0;
		const m = a.length;
		const n = b.length;
		let anterior = [];
		for (let j = 0; j <= n; j++) anterior[j] = j;
		for (let i = 1; i <= m; i++) {
			const atual = [i];
			for (let j = 1; j <= n; j++) {
				atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
			}
			anterior = atual;
		}
		return anterior[n];
	}

	function palavraCasa(palavra, radical, aproximado) {
		if (palavra.indexOf(radical) === 0) return true;
		if (!aproximado || radical.length < 6 || palavra.length < radical.length - 1) return false;
		// Um erro de digitação: troca, falta ou sobra de uma letra.
		for (let k = radical.length - 1; k <= radical.length + 1; k++) {
			if (k > 0 && k <= palavra.length && distancia(palavra.slice(0, k), radical) <= 1) return true;
		}
		return false;
	}

	function fraseCasa(lista, frase, aproximado) {
		let inicio = 0;
		let anterior = -1;
		for (const radical of frase) {
			let achou = -1;
			for (let i = inicio; i < lista.length; i++) {
				if (anterior >= 0 && i - anterior > 4) break;
				if (palavraCasa(lista[i], radical, aproximado)) { achou = i; break; }
			}
			if (achou < 0) return false;
			anterior = achou;
			inicio = achou + 1;
		}
		return true;
	}

	function algumaCasa(lista, frases, aproximado) {
		return frases.some(function (f) { return fraseCasa(lista, f, aproximado); });
	}

	// Recebe o NOME do movimento (sem o complemento) e devolve
	// { tipo, rotulo } ou null.
	function classificarMovimento(texto) {
		const lista = palavras(texto);
		if (!lista.length) return null;
		// No Projudi a sentença SEMPRE é lançada num movimento que começa com
		// "JULGADA"/"JULGADO" ("JULGADA PROCEDENTE A AÇÃO", "JULGADA
		// IMPROCEDENTE A AÇÃO"...): é peça essencial e entra sempre, antes de
		// qualquer exclusão (o complemento pode citar "prazo", "recurso" etc.).
		if (/^julgad/.test(lista[0])) return { tipo: "sentenca", rotulo: "Sentença" };
		if (algumaCasa(lista, EXCLUSOES)) return null;
		for (const def of TIPOS_PECA) {
			if (algumaCasa(lista, def.frases, true)) return { tipo: def.tipo, rotulo: def.rotulo };
		}
		return null;
	}

	function ehComunicacao(texto) {
		return algumaCasa(palavras(texto), COMUNICACAO);
	}

	// Número do evento a que um movimento se refere: "Referente ao evento
	// (seq. 45)", "Refer. ao Evento: 5", "referente à movimentação 12",
	// "Referente ao evento 2". Devolve a string do número ou "".
	function referenciaEvento(texto) {
		const t = normalizar(texto);
		const m = /\brefer\w*\.?\s*(?:a|ao|as|aos)?\s*(?:o\s+)?(?:evento|movimentac\w*|mov\.?|seq\w*\.?)\s*(?:[:.\-]\s*)?(?:\(\s*)?(?:seq\.?\s*)?(\d+(?:\.\d+)?)/.exec(t);
		return m ? m[1] : "";
	}

	// "OAB 116785N-PR - FULANA DE TAL" -> "FULANA DE TAL (OAB 116785N-PR)".
	function formatarAdvogado(linha) {
		const l = colapsar(linha);
		const m = /^OAB\s*[:\-]?\s*(\S+)\s+-\s+(.+)$/i.exec(l);
		if (m) return colapsar(m[2]) + " (OAB " + m[1] + ")";
		return l;
	}

	// "12247 - Execução Extrajudicial de Alimentos" -> "Execução Extrajudicial de Alimentos".
	function semCodigo(texto) {
		return colapsar(texto).replace(/^\d+\s*-\s*/, "");
	}

	function rotuloDoTipo(tipo) {
		const def = TIPOS_PECA.find(function (d) { return d.tipo === tipo; });
		return def ? def.rotulo : "Peça";
	}

	// ---------------------------------------------------------------
	// Extração do trecho dos pedidos (modo manual)
	// ---------------------------------------------------------------

	const LIMITE_TRECHO = 2000;
	const LIMITE_FALLBACK = 1500;

	// Assinatura/fecho da peça: "Nestes termos, pede deferimento", local e
	// data ("Curitiba, 10 de setembro de 2026"), "Termos em que". O trecho
	// termina ali, quando houver.
	const FECHO = /(\n|^)\s*(nestes termos|nesses termos|termos em que|pede e espera deferimento|pede deferimento|[A-ZÀ-Úa-zà-ú ]{3,40}, \d{1,2} de [a-zç]+ de \d{4}|documento assinado digitalmente)/i;

	const TITULOS_POR_TIPO = {
		inicial: /(^|\n)\s*(d[oa]s? pedidos?|d[oa]s? requerimentos?( finais)?|requerimentos? finais|ante o exposto|diante do exposto|isto posto|posto isso|pelo exposto|em face do exposto)\b/gi,
		contestacao: /(^|\n)\s*(d[oa]s? pedidos?|d[oa]s? requerimentos?( finais)?|requerimentos? finais|ante o exposto|diante do exposto|isto posto|posto isso|pelo exposto|em face do exposto)\b/gi,
		resposta: /(^|\n)\s*(d[oa]s? pedidos?|d[oa]s? requerimentos?( finais)?|requerimentos? finais|ante o exposto|diante do exposto|isto posto|posto isso|pelo exposto|em face do exposto)\b/gi,
		sentenca: /(^|\n)\s*(dispositivo|ante o exposto|diante do exposto|isto posto|posto isso|pelo exposto|em face do exposto|em razao do exposto)\b/gi,
		recurso: /(^|\n)\s*(d[oa]s? pedidos?|d[oa]s? requerimentos?|ante o exposto|diante do exposto|isto posto|posto isso|pelo exposto|em face do exposto)\b/gi,
	};

	function ultimaOcorrencia(re, texto) {
		re.lastIndex = 0;
		let ultima = -1;
		let m;
		while ((m = re.exec(texto))) {
			ultima = m.index + (m[1] ? m[1].length : 0);
			if (m[0].length === 0) re.lastIndex++;
		}
		return ultima;
	}

	function cortarNoFecho(trecho) {
		const m = FECHO.exec(trecho);
		if (m && m.index > 80) return trecho.slice(0, m.index);
		return trecho;
	}

	function limitar(trecho, limite) {
		const t = trecho.trim();
		if (t.length <= limite) return t;
		const corte = t.lastIndexOf(" ", limite);
		return t.slice(0, corte > limite * 0.8 ? corte : limite).trim() + " […]";
	}

	// Para a sentença, o dispositivo começa, na falta de título, no primeiro
	// "JULGO ..." / "CONDENO" / "ABSOLVO" / "HOMOLOGO" da parte final.
	const VERBO_DISPOSITIVO = /(^|\n|\.\s)\s*(julgo|condeno|absolvo|homologo|declaro extint|extingo|pronuncio|impronuncio|rejeito|acolho)/gi;

	// Devolve o trecho (texto) em que a peça formula os pedidos (ou, na
	// sentença, o dispositivo). Para a denúncia, use extrairDenuncia().
	function extrairTrechoPedidos(texto, tipo) {
		const t = limparAssinaturas(texto).replace(/[ \t]+/g, " ");
		if (!t.trim()) return "";
		if (tipo === "denuncia") {
			const d = extrairDenuncia(t);
			return d.trecho;
		}
		const re = TITULOS_POR_TIPO[tipo] || TITULOS_POR_TIPO.inicial;
		let inicio = ultimaOcorrencia(re, t);
		if (inicio < 0 && tipo === "sentenca") {
			// O primeiro verbo de dispositivo que aparecer no último terço.
			VERBO_DISPOSITIVO.lastIndex = 0;
			let m;
			const minimo = Math.floor(t.length * 0.5);
			while ((m = VERBO_DISPOSITIVO.exec(t))) {
				const pos = m.index + m[0].length - m[2].length;
				if (pos >= minimo) { inicio = pos; break; }
			}
		}
		if (inicio >= 0) return limitar(cortarNoFecho(t.slice(inicio)), LIMITE_TRECHO);
		return limitar(t.slice(-LIMITE_FALLBACK), LIMITE_FALLBACK + 10);
	}

	// ---------------------------------------------------------------
	// Denúncia (padrão das denúncias do Ministério Público)
	// ---------------------------------------------------------------

	const MESES = {
		janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
		julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
	};

	function dataPorExtenso(texto) {
		const m = /\b(\d{1,2})(?:º|o)? de ([a-zç]+) de (\d{4})\b/i.exec(texto);
		if (m) {
			const mes = MESES[normalizar(m[2])];
			if (mes) return pad2(m[1]) + "/" + pad2(mes) + "/" + m[3];
		}
		const n = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(texto);
		return n ? n[1] + "/" + n[2] + "/" + n[3] : "";
	}

	function pad2(n) {
		return String(n).padStart(2, "0");
	}

	// "FATO 01 – lesão corporal", "1º FATO - Furto", "FATO ÚNICO – ameaça"
	const TITULO_FATO = /(^|\n)[ \t]*(?:(\d{1,2})\s*[ºo°]?\s*FATO|(PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO|SEXTO|S[ÉE]TIMO|OITAVO|NONO|D[ÉE]CIMO)\s+FATO|FATO\s*(\d{1,2}|[ÚU]NICO))\s*[–—\-:.]?\s*([^\n]*)/gi;
	const ORDINAIS = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, setimo: 7, oitavo: 8, nono: 9, decimo: 10 };

	const INICIO_REQUERIMENTOS = /(^|\n|\.\s)\s*((o ministerio publico )?(requer|pugna|requer-se)|diante do exposto|pelo exposto|ante o exposto|isto posto|posto isso|razao pela qual)/i;

	const PEDIDOS_DENUNCIA = [
		{ re: /receb\w* (d[ae] )?(presente )?denuncia|seja (a presente )?denuncia recebida/i, rotulo: "o recebimento da denúncia" },
		{ re: /cita\w*/i, rotulo: "a citação do(s) denunciado(s)" },
		{ re: /oitiva|inquiri\w*|rol de testemunhas|testemunhas? abaixo/i, rotulo: "a oitiva das testemunhas arroladas" },
		{ re: /condena\w*/i, rotulo: "a condenação" },
		{ re: /387,?\s*(inciso\s*)?iv|valor minimo|repara\w* (dos )?danos|indeniza\w* (minima|a vitima)/i, rotulo: "a fixação de valor mínimo para reparação dos danos (art. 387, IV, do CPP)" },
		{ re: /medidas? protetivas?/i, rotulo: "medidas protetivas de urgência" },
		{ re: /prisao preventiva|decreta\w* (d[ae] )?prisao/i, rotulo: "a decretação da prisão preventiva" },
	];

	function tiraAcentoMantendoTamanho(texto) {
		// normalize("NFD") muda o tamanho; aqui trocamos letra por letra
		// para que os índices continuem valendo no texto original.
		return String(texto).replace(/[À-ÿ]/g, function (c) {
			return c.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0) || c;
		});
	}

	function denunciadosDe(texto) {
		const nomes = [];
		const re = /\b(?:o|a|os|as) denunciad[oa]s?,?\s+([A-ZÀ-Ú][A-ZÀ-Ú'´`.\-]+(?:\s+(?:D[AEO]S?|E|[A-ZÀ-Ú][A-ZÀ-Ú'´`.\-]+))+)/g;
		let m;
		while ((m = re.exec(texto))) {
			const nome = colapsar(m[1]).replace(/\s+(D[AEO]S?|E)$/, "");
			if (nome.split(" ").length >= 2 && nomes.indexOf(nome) === -1) nomes.push(nome);
		}
		return nomes;
	}

	function vitimaDe(texto) {
		const m = /\bv[ií]tima,?\s+([A-ZÀ-Ú](?:[.\wÀ-ú]*\.)+[A-ZÀ-Ú]?\.?|[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/.exec(texto);
		return m ? m[1] : "";
	}

	// Devolve:
	// { fatos:[{n, crime, data, denunciados, vitima}], denunciados:[...],
	//   capitulacao, requerimentos:[...], trecho, resumo }
	// Onde começa a narrativa dos fatos numa denúncia sem títulos "FATO":
	// depois de "pela prática do(s) seguinte(s) fato(s)...:", "DOS FATOS",
	// "consta dos inclusos autos...", ou no primeiro "No dia / Em data...".
	const MARCADORES_NARRATIVA = [
		/pel[ao]s? pratica d[oa]s? seguintes? (fatos?|condutas?)[^:\n]{0,60}:/i,
		/pel[ao]s? (fatos?|condutas?) (a seguir|seguintes?) [^:\n]{0,60}:/i,
		/(^|\n)\s*(dos fatos|do fato|da conduta|dos fatos e fundamentos|narrativa fatica|exposicao do fato)\s*[:.\n]/i,
		/(^|\n)\s*(consta d[oa]s? (inclus[oa]s?|presentes?|anexos?)? ?(autos|inquerito|procedimento))/i,
		/(^|\n|[.:]\s)\s*(no dia|em data|na data|no periodo|no mes|nos dias|em \d{1,2} de [a-z]+ de \d{4}|em meados|em horario|desde)\b/i,
	];

	function inicioDaNarrativa(texto) {
		const semAc = tiraAcentoMantendoTamanho(texto);
		for (const re of MARCADORES_NARRATIVA) {
			const m = re.exec(semAc);
			if (!m) continue;
			// Marcador que termina em ":" -> a narrativa começa depois dele;
			// senão, no próprio marcador ("No dia...", "Consta dos autos...").
			if (/:\s*$/.test(m[0])) return m.index + m[0].length;
			const pre = m[1] ? m[1].length : 0;
			return m.index + pre;
		}
		return 0;
	}

	// "incidiu no crime de ameaça (art. 147 do CP)" -> "ameaça".
	function crimeDaCapitulacao(cap) {
		const m = /crimes?\s+(?:de|do|da)\s+([a-zà-ú][a-zà-ú ]{2,50}?)\s*(?:\(|,|previst|tipificad|descrit|capitulad|$)/i.exec(cap || "");
		return m ? colapsar(m[1]) : "";
	}

	function tituloDoFato(f) {
		let s = f.unico ? "Fato único" : "Fato " + f.n;
		if (f.crime) s += " – " + f.crime;
		if (f.data) s += " (" + f.data + ")";
		return s;
	}

	// Os fatos como narrados na denúncia, na íntegra (sem o carimbo de
	// assinatura), um parágrafo por fato, e a imputação.
	function fatosIntegrais(d) {
		const partes = d.fatos.map(function (f) { return tituloDoFato(f) + ": " + f.texto; });
		const artigos = artigosImputacao(d.capitulacao);
		if (artigos) partes.push("Imputação: " + artigos + ".");
		return partes.join("\n\n");
	}

	function extrairDenuncia(texto) {
		const t = limparAssinaturas(texto).replace(/[ \t]+/g, " ");
		const semAcento = tiraAcentoMantendoTamanho(t);
		const fatos = [];
		TITULO_FATO.lastIndex = 0;
		let m;
		const titulos = [];
		while ((m = TITULO_FATO.exec(t))) {
			const inicio = m.index + (m[1] ? m[1].length : 0);
			const numeroTxt = m[2] || m[4] || "";
			const n = m[3] ? ORDINAIS[normalizar(m[3])] || 1 : /^\d+$/.test(numeroTxt) ? parseInt(numeroTxt, 10) : 1;
			const crime = colapsar(m[5]).replace(/[.:;]+$/, "");
			titulos.push({ inicio: inicio, fimTitulo: TITULO_FATO.lastIndex, n: n, crime: crime });
		}

		// Onde começa a capitulação ("Assim agindo, o denunciado ... incidiu
		// nos crimes ..."): procura a partir do último fato (ou do começo).
		const aPartirDe = titulos.length ? titulos[titulos.length - 1].fimTitulo : 0;
		let capitulacao = "";
		let fimCapitulacao = -1;
		let inicioCapitulacao = -1;
		// A capitulação é a frase que contém "incidiu / incorreu / está
		// incurso"; ela começa na expressão "Assim agindo…" (ou similar) que
		// estiver logo antes, ou no início da frase. Assim um "Dessa forma"
		// no meio da narrativa não é confundido com a capitulação.
		const reInc = /\b(incidiu|incidiram|incorreu|incorreram|incorrendo|incidindo|esta(o)? incurs[oa]s?|restou incurs[oa]|praticou o crime|cometeu o crime|praticaram o crime)\b/gi;
		reInc.lastIndex = aPartirDe;
		const mi = reInc.exec(semAcento);
		if (mi) {
			const janela = semAcento.slice(Math.max(aPartirDe, mi.index - 500), mi.index);
			const base = Math.max(aPartirDe, mi.index - 500);
			const reCap = /(assim agindo|assim procedendo|ao assim agir|agindo assim|com tais condutas|com (essa|esta) conduta|dessa forma|desta forma|ao agir assim|com isso)\b/gi;
			let ultimaCap = null;
			let mc;
			while ((mc = reCap.exec(janela))) ultimaCap = mc;
			// Início da frase: último ". " seguido de maiúscula antes do verbo.
			const reFrase = /[.;]\s+(?=[A-ZÀ-Ú])/g;
			let inicioFrase = base;
			let mf;
			while ((mf = reFrase.exec(janela))) inicioFrase = base + mf.index + mf[0].length;
			inicioCapitulacao = ultimaCap && base + ultimaCap.index >= inicioFrase - 2 ? base + ultimaCap.index : inicioFrase;
		}
		if (inicioCapitulacao >= 0) {
			const resto = t.slice(inicioCapitulacao);
			const restoSemAcento = semAcento.slice(inicioCapitulacao);
			// Termina no primeiro ponto final seguido de quebra de linha, ou
			// no início dos requerimentos.
			const fimReq = INICIO_REQUERIMENTOS.exec(restoSemAcento.slice(20));
			const fimPonto = /\.\s*\n/.exec(resto);
			let fim = resto.length;
			if (fimReq) fim = Math.min(fim, 20 + fimReq.index + (fimReq[1] ? fimReq[1].length : 0));
			if (fimPonto) fim = Math.min(fim, fimPonto.index + 1);
			capitulacao = colapsar(resto.slice(0, fim));
			fimCapitulacao = inicioCapitulacao + fim;
		}

		// Fatos: o texto de cada um vai do título até o próximo título (ou
		// até a capitulação).
		titulos.forEach(function (tit, i) {
			const proximo = i + 1 < titulos.length ? titulos[i + 1].inicio : (inicioCapitulacao > tit.fimTitulo ? inicioCapitulacao : t.length);
			const corpo = t.slice(tit.fimTitulo, proximo);
			const primeiraFrase = colapsar(corpo).slice(0, 600);
			let data = dataPorExtenso(primeiraFrase.slice(0, 250));
			const herda = /mesma(s)? circunstancias? de (data|tempo)[^.]*?fato\s*(\d{1,2})/i.exec(tiraAcentoMantendoTamanho(primeiraFrase));
			if (herda) {
				const ref = fatos.find(function (f) { return f.n === parseInt(herda[3], 10); });
				if (ref) data = ref.data;
			}
			fatos.push({
				n: tit.n,
				crime: tit.crime,
				data: data,
				denunciados: denunciadosDe(corpo),
				vitima: vitimaDe(corpo),
				texto: colapsar(corpo),
			});
		});

		// Fato único sem título ("... pela prática do seguinte fato delituoso:
		// No dia ..."): a narrativa vai do fim da qualificação (marcadores
		// abaixo) até a capitulação.
		const corpoGeral = inicioCapitulacao > 0 ? t.slice(0, inicioCapitulacao) : t;
		if (!titulos.length) {
			const inicioFatos = inicioDaNarrativa(corpoGeral);
			const corpo = corpoGeral.slice(inicioFatos);
			if (colapsar(corpo).length > 40) {
				const primeira = colapsar(corpo).slice(0, 300);
				fatos.push({
					n: 1,
					unico: true,
					crime: crimeDaCapitulacao(capitulacao),
					data: dataPorExtenso(primeira),
					denunciados: denunciadosDe(corpo),
					vitima: vitimaDe(corpo),
					texto: colapsar(corpo),
				});
			}
		}
		let denunciados = [];
		fatos.forEach(function (f) {
			f.denunciados.forEach(function (d) { if (denunciados.indexOf(d) === -1) denunciados.push(d); });
		});
		denunciadosDe(capitulacao).forEach(function (d) { if (denunciados.indexOf(d) === -1) denunciados.push(d); });
		if (!denunciados.length) denunciados = denunciadosDe(corpoGeral);

		// Requerimentos finais.
		const posReq = fimCapitulacao >= 0 ? fimCapitulacao : Math.floor(t.length * 0.6);
		const trechoReq = semAcento.slice(posReq);
		const requerimentos = [];
		const mr = INICIO_REQUERIMENTOS.exec(trechoReq);
		let textoRequerimentos = "";
		if (mr) {
			textoRequerimentos = t.slice(posReq + mr.index).slice(0, 2500);
			const semAc = tiraAcentoMantendoTamanho(textoRequerimentos);
			PEDIDOS_DENUNCIA.forEach(function (p) {
				if (p.re.test(semAc)) requerimentos.push(p.rotulo);
			});
		}

		const partesTrecho = [];
		fatos.forEach(function (f) {
			partesTrecho.push(tituloDoFato(f) + "\n" + f.texto);
		});
		if (capitulacao) partesTrecho.push(capitulacao);
		if (textoRequerimentos) partesTrecho.push(limitar(cortarNoFecho(textoRequerimentos), 900));
		let trecho = partesTrecho.join("\n\n");
		if (!trecho.trim()) trecho = limitar(t.slice(-LIMITE_FALLBACK), LIMITE_FALLBACK + 10);

		const resultado = {
			fatos: fatos,
			denunciados: denunciados,
			capitulacao: capitulacao,
			requerimentos: requerimentos,
			trecho: trecho,
		};
		resultado.resumo = resumoDenuncia(resultado);
		return resultado;
	}

	function juntarLista(itens) {
		if (itens.length <= 1) return itens.join("");
		return itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
	}

	// ---------------------------------------------------------------
	// Assinatura digital do Projudi
	// ---------------------------------------------------------------

	// Rodapé/carimbo que o Projudi imprime em todas as páginas dos arquivos:
	//   "Documento assinado digitalmente, conforme MP nº 2.200-2/2001, Lei nº
	//   11.419/2006, resolução do Projudi, do TJPR/OE Validação deste em
	//   https://projudi.tjpr.jus.br/projudi/ - Identificador: PJ5GS H2PRA ...
	//   PROJUDI - Processo: 0000002-92.2024.8.16.0038 - Ref. mov. 1.1 -
	//   Assinado digitalmente por Fulano:06728036903 01/01/2024: JUNTADA DE
	//   PETIÇÃO DE INICIAL. Arq: Ofício"
	// Ele aparece no meio do texto extraído (a cada quebra de página) e é
	// removido antes de qualquer extração.
	const ASSINATURA_TRECHOS = [
		/documento assinado digitalmente,?\s*conforme\s*MP[\s\S]{0,160}?(?:TJPR\s*\/\s*OE|resolu[çc][ãa]o do projudi[^\n]*)/gi,
		/valida[çc][ãa]o deste em\s*\S+\s*(?:-\s*)?(?:identificador:?\s*(?:[A-Z0-9]{5}\b\s*){1,6})?/gi,
		/identificador:?\s*(?:[A-Z0-9]{5}\b\s*){3,6}/g,
		/PROJUDI\s*-\s*Processo:[\s\S]{0,400}?\bArq:[^\n]*/gi,
		/PROJUDI\s*-\s*Processo:\s*[\d.\-]+\s*-\s*Ref\.?\s*mov\.?\s*[\d.]+/gi,
		/assinado digitalmente por[^\n]*(?:\n\s*\d{2}\/\d{2}\/\d{4}:[^\n]*)?/gi,
		/\d{2}\/\d{2}\/\d{4}:\s*[^\n]{0,200}?\bArq:[^\n]*/gi,
	];
	const ASSINATURA_LINHA = /(documento assinado digitalmente|MP\s*n[º°o]?\s*2\.200-2|Lei\s*n[º°o]?\s*11\.419\/2006|valida[çc][ãa]o deste em|identificador:\s*[A-Z0-9]{5}|PROJUDI\s*-\s*Processo:|Ref\.\s*mov\.\s*\d|assinado digitalmente por|^\s*Arq:\s|^\s*\d{2}\/\d{2}\/\d{4}:\s.*\bArq:)/i;

	function limparAssinaturas(texto) {
		let t = String(texto || "").replace(/\r/g, "");
		ASSINATURA_TRECHOS.forEach(function (re) { t = t.replace(re, " "); });
		return t
			.split("\n")
			.filter(function (linha) { return !ASSINATURA_LINHA.test(linha); })
			.join("\n")
			.replace(/[ \t]{2,}/g, " ");
	}

	// ---------------------------------------------------------------
	// Resumo objetivo da denúncia: fatos + artigos da imputação
	// ---------------------------------------------------------------

	// Primeira frase do fato, sem as fórmulas de estilo ("dolosamente, ciente
	// da ilicitude..."), sem endereço completo e sem a lista de provas
	// ("tudo conforme: boletim de ocorrência ... (mov. 1.4)").
	function descricaoObjetivaFato(texto) {
		let t = colapsar(texto);
		// Primeira frase: termina em ". " seguido de maiúscula (não corta em
		// "nº 372", "L.A.d.S.," nem "mov. 1.4").
		const fim = /\.\s+(?=[A-ZÀ-Ú])/.exec(t);
		if (fim) t = t.slice(0, fim.index + 1);
		// "Consta dos inclusos autos de inquérito policial que, no dia..." -> "No dia..."
		t = t.replace(/^consta d[oa]s?\s+(?:inclus[oa]s?\s+|presentes\s+)?(?:autos|inqu[ée]rito|procedimento)[^,]{0,80}?\bque,?\s*/i, "");
		t = t.charAt(0).toUpperCase() + t.slice(1);
		t = t
			.replace(/,?\s*(?:tudo\s+)?(?:conforme|consoante|segundo)\s*:?\s*(?:se\s+(?:v[eê]|infere)\s+d[oa]s?\s*)?(?:o\s+|a\s+|os\s+|as\s+)?(?:boletim|termos?|autos?|laudos?|atestado|depoimentos?|declara[çc][õo]es|relat[óo]rio|fotografias?|imagens?|documentos?)[\s\S]*$/i, ".")
			.replace(/\s*\((?:mov|evento|seq|fl|fls)\.?[^)]*\)/gi, "")
			.replace(/(?:,\s*|\s+)(?:de forma\s+)?(?:dolosamente|livre e conscientemente|com consci[êe]ncia e vontade|com vontade livre e consciente|de forma livre e consciente|volunt[áa]ria e conscientemente)[^,]*?(?:,\s*ciente[^,]*?(?:conduta|a[çc][ãa]o|comportamento))?\s*,/gi, " ")
			.replace(/(?:,\s*|\s+)por raz[õo]es d[ae] condi[çc][ãa]o d[eo] sexo feminino[^,]*?(?:contra a mulher)?\s*,/gi, " ")
			.replace(/\s*situad[oa]s?\s+n[ao]s?\s[\s\S]*?(?=,\s*(?:o|a|os|as)\s+(?:ora\s+)?(?:denunciad|acusad|investigad))/i, "")
			.replace(/\s*,\s*,/g, ",")
			.replace(/,\s*\./g, ".")
			.replace(/\s+/g, " ")
			.trim();
		if (t && !/[.!?]$/.test(t)) t += ".";
		return limitar(t, 420);
	}

	// Só os dispositivos legais da imputação, a partir do parágrafo da
	// capitulação: "art. 129, §13º, e art. 147, §1º, na forma do art. 69,
	// todos do Código Penal e c/c art. 5º e 7º, incisos I e II, da Lei Maria
	// da Penha".
	function artigosImputacao(cap) {
		let c = colapsar(cap);
		if (!c) return "";
		const inicio = /\bart(?:igo)?s?\.?\s*\d/i.exec(c);
		if (!inicio) return "";
		c = c.slice(inicio.index);
		c = c
			.replace(/\s*\((?:\d+\s*[ºo°]?\s*fato|fato)[^)]*\)/gi, "") // "(1º Fato – lesão corporal)"
			.replace(/\s*\((?:concurso|crime continuado)[^)]*\)/gi, "")
			.replace(/\bartigos\b/gi, "arts.")
			.replace(/\bartigo\b/gi, "art.")
			.replace(/\bart\s+(?=\d)/gi, "art. ")
			.replace(/(\be|,)\s+n[oa]s?\s+(?=arts?\.)/gi, "$1 ")
			.replace(/,?\s*(?:e\s+)?(?:requer|raz[ãa]o pela qual|motivo pelo qual|pelo que|diante do exposto|ante o exposto|pelo exposto)[\s\S]*$/i, "")
			.replace(/\s*,\s*,/g, ",")
			.replace(/[.;:\s]+$/, "")
			.trim();
		return c;
	}

	function resumoDenuncia(d) {
		const partes = [];
		let abertura = "Denúncia oferecida";
		if (d.denunciados.length) abertura += " contra " + juntarLista(d.denunciados);
		partes.push(abertura + ".");
		d.fatos.forEach(function (f) {
			const desc = descricaoObjetivaFato(f.texto);
			partes.push(tituloDoFato(f) + (desc ? ": " + desc : "."));
		});
		const artigos = artigosImputacao(d.capitulacao);
		if (artigos) partes.push("Imputação: " + artigos + ".");
		return partes.join(" ");
	}

	// ---------------------------------------------------------------
	// Processo criminal e sentença criminal
	// ---------------------------------------------------------------

	const RE_CLASSE_CRIMINAL = /(acao penal|\bpenal\b|criminal|\bcrime|inquerito|prisao em flagrante|termo circunstanciado|medidas? protetivas?|\bjuri\b|execucao penal|habeas|queixa|contraven|antitoxico|entorpecente|lei 11\.?343|carta precatoria criminal)/;

	// Criminal pela classe processual ou pela existência de denúncia.
	function ehProcessoCriminal(classe, movimentos) {
		if (RE_CLASSE_CRIMINAL.test(normalizar(classe))) return true;
		return (movimentos || []).some(function (m) {
			const c = classificarMovimento(m.titulo || m.evento);
			return c && c.tipo === "denuncia";
		});
	}

	const NUM_EXT = "\\d+(?:\\s*\\([^)]{1,40}\\))?";
	// "1 (um) ano, 2 (dois) meses e 10 (dez) dias de detenção"
	const RE_PENA = new RegExp("((?:" + NUM_EXT + "\\s*(?:anos?|m[eê]s(?:es)?|dias?)(?![-\\w])\\s*(?:,\\s*|\\s+e\\s+)?)+)\\s*(?:de\\s+)?(reclus[ãa]o|deten[çc][ãa]o|pris[ãa]o simples)", "gi");
	const RE_MULTA = new RegExp("(" + NUM_EXT + "\\s*dias?-multa)", "gi");
	const RE_REGIME = /regime\s+(?:inicial(?:mente)?\s+|prisional\s+)?(?:de cumprimento\s+)?(?:o\s+)?(fechado|semi-?aberto|aberto)/gi;
	const RE_NOME = "([A-ZÀ-Ý][A-ZÀ-Ý'´`.\\-]+(?:\\s+(?:D[AEO]S?|E|[A-ZÀ-Ý][A-ZÀ-Ý'´`.\\-]+))+)";

	// Divide em frases sem quebrar em abreviações ("art. 77", "Dr. João",
	// "nº 45.678", "L.A.d.S.").
	const ABREVIACOES = /(?:\b(?:arts?|n|nº|inc|incs|al|dr|dra|drs|sr|sra|fl|fls|mov|p|pg|pag|págs?|cf|ex|obs|res|par|c|s|ss|av|min|des|proc|prof|profa|adv|op|cit|v|vol|ed|ltda|cia)\.|\b[A-Za-zÀ-ÿ]\.)$/i;
	function frasesDe(texto) {
		const pedacos = colapsar(texto).split(/(?<=[.;])\s+(?=[A-ZÀ-Ý0-9"“(a-z])/);
		const frases = [];
		pedacos.forEach(function (p) {
			const anterior = frases[frases.length - 1];
			if (anterior && (ABREVIACOES.test(anterior) || !/^[A-ZÀ-Ý0-9"“(]/.test(p) && !/;$/.test(anterior))) frases[frases.length - 1] = anterior + " " + p;
			else frases.push(p);
		});
		return frases;
	}

	function ultimo(re, texto) {
		re.lastIndex = 0;
		let m, u = null;
		while ((m = re.exec(texto))) u = m;
		return u;
	}

	function nomesApos(re, texto) {
		const nomes = [];
		let m;
		re.lastIndex = 0;
		while ((m = re.exec(texto))) {
			const n = colapsar(m[m.length - 1]).replace(/\s+(D[AEO]S?|E)$/, "");
			if (n.split(" ").length >= 2 && !/^(PELA|PELO|NOS|NAS|COMO|AS|OS)\b/.test(n) && nomes.indexOf(n) === -1) nomes.push(n);
		}
		return nomes;
	}

	// Sentença criminal: quem foi absolvido/condenado, pena de cada um,
	// substituição/suspensão, indenização à vítima e honorários do dativo.
	// Só entram no resumo os itens encontrados.
	function extrairSentencaCriminal(texto) {
		const t = colapsar(limparAssinaturas(texto));
		const qualif = "(?:o|a|os|as)?\\s*(?:r[ée]us?|r[ée]|acusad[oa]s?|denunciad[oa]s?|sentenciad[oa]s?)?\\s*,?\\s*";
		const absolvidos = nomesApos(new RegExp("\\b(?:[Aa]bsolv(?:o|er|endo)|ABSOLV(?:O|ER|ENDO))\\s+" + qualif + RE_NOME, "g"), t);
		const condenados = nomesApos(new RegExp("\\b(?:[Cc]onden(?:o|ar|ando)|CONDEN(?:O|AR|ANDO))\\s+" + qualif + RE_NOME, "g"), t)
			.filter(function (n) { return absolvidos.indexOf(n) === -1 && !/^(ESTADO|MUNIC[ÍI]PIO|UNI[ÃA]O|FAZENDA|INSS|DISTRITO)\b/.test(n); });

		// Pena de cada condenado: procura, nos trechos em que o nome aparece
		// (até o nome de outro condenado), a última pena "definitiva".
		function penaEm(trecho) {
			const frases = frasesDe(trecho);
			const definitivas = frases.filter(function (f) { return /definitiv|pena final|totaliz|resta(?:ndo)? (?:a pena|fixada)|concretiz/i.test(f) && (RE_PENA.test(f) || (RE_PENA.lastIndex = 0, false)); });
			RE_PENA.lastIndex = 0;
			const base = definitivas.length ? definitivas[definitivas.length - 1] : trecho;
			const mp = ultimo(RE_PENA, base);
			const mm = ultimo(RE_MULTA, definitivas.length ? definitivas.join(" ") : trecho);
			const mr = ultimo(RE_REGIME, trecho);
			return {
				pena: mp ? colapsar(mp[1]).replace(/[,\s]+$/, "") + " de " + mp[2].toLowerCase() : "",
				multa: mm ? colapsar(mm[1]) : "",
				regime: mr ? mr[1].toLowerCase().replace("semi-aberto", "semiaberto") : "",
			};
		}
		const condenacoes = condenados.map(function (nome) {
			let trechos = [];
			if (condenados.length === 1) trechos = [t];
			else {
				const re = new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
				let m;
				while ((m = re.exec(t))) {
					let fim = t.length;
					condenados.forEach(function (outro) {
						if (outro === nome) return;
						const i = t.indexOf(outro, m.index + nome.length);
						if (i !== -1 && i < fim) fim = i;
					});
					trechos.push(t.slice(m.index, fim));
				}
			}
			return Object.assign({ nome: nome }, penaEm(trechos.join(" ")));
		});

		const frases = frasesDe(t);
		const achar = function (re, filtro) {
			const f = frases.filter(function (x) { return re.test(x) && (!filtro || filtro.test(x)); });
			return f.length ? f[f.length - 1] : "";
		};
		const curta = function (f) { return limitar(f.replace(/\s+/g, " ").trim(), 260); };

		// Substituição e suspensão: só entram se CONCEDIDAS de forma expressa
		// ("substituo a pena…", "concedo a suspensão…"), sem negação na mesma
		// frase. Negadas, não tratadas ou apenas citadas não são mencionadas.
		const NEGA = /\b(n[ãa]o\s+(?:se\s+|é\s+|h[áa]\s+|ser[áa]\s+|sendo\s+|estão\s+|est[áa]\s+)?(?:\w+\s+){0,2}?(?:aplic|cab|poss[ií]v|permit|preench|faz|conce|substitu|suspend|recomend|adequ|suficien|atend|presentes|autoriz)|incab[ií]ve|invi[áa]ve|imposs[ií]ve|deixo\s+de|descab|vedad|prejudicad|inaplic|ausentes?\s+(?:os\s+)?(?:requisitos|pressupostos)|n[ãa]o\s+preench|supera(?:ndo|r)?\s+(?:a\s+)?(?:4|quatro)|superior\s+a\s+(?:4|quatro)|acima\s+de\s+(?:4|quatro)|pelo\s+mesmo\s+motivo)/i;
		const decisoria = function (f, re) {
			const m = re.exec(f);
			return m ? curta(m[0].charAt(0).toUpperCase() + m[0].slice(1)) : "";
		};
		const CONCEDE_SUBST = /\b(substituo|substitui-se|substituindo|converto|convertendo|procedo [àa] substitui[çc][ãa]o|fica(?:ndo)? substitu[ií]d)[\s\S]*$/i;
		const CONCEDE_SUSP = /\b(concedo|conceder|defiro|suspendo|aplico|fica(?:ndo)?\s+suspens)[\s\S]*$/i;
		const frasesSubst = frases.filter(function (x) { return /substitu|convert/i.test(x) && /restritiv|presta[çc][ãa]o|multa substitutiva|interdi[çc][ãa]o|limita[çc][ãa]o de fim/i.test(x); });
		const frasesSusp = frases.filter(function (x) { return /suspens[ãa]o condicional da pena|sursis|suspendo a execu/i.test(x); });
		const concedida = function (lista, re) {
			for (let i = lista.length - 1; i >= 0; i--) {
				if (NEGA.test(lista[i])) continue;
				const d = decisoria(lista[i], re);
				if (d) return d;
			}
			return "";
		};
		let substituicao = concedida(frasesSubst, CONCEDE_SUBST);
		let suspensao = concedida(frasesSusp, CONCEDE_SUSP);

		// Indenização à vítima (art. 387, IV, do CPP / danos morais ou materiais).
		const fraseInd = achar(/387,?\s*(?:inciso\s*)?iv|repara[çc][ãa]o (?:dos |de )?danos|danos? (?:morais|materiais)|indeniza/i, /R\$\s*[\d.,]+|valor m[ií]nimo|deixo de fixar|n[ãa]o fix/i);
		let indenizacao = "";
		if (fraseInd && !/deixo de fixar|n[ãa]o (?:h[áa]|cabe|fixo|ser[áa]) (?:fixad|fix)/i.test(fraseInd)) {
			const v = /R\$\s*[\d.]+(?:,\d{2})?/.exec(fraseInd);
			const tipo = /morais/i.test(fraseInd) && /materiais/i.test(fraseInd) ? "danos morais e materiais" : /morais/i.test(fraseInd) ? "danos morais" : /materiais/i.test(fraseInd) ? "danos materiais" : "reparação de danos";
			indenizacao = (v ? v[0].replace(/\s+/, " ") + ", a título de " : "") + tipo + (v ? "" : ": " + curta(fraseInd));
		}

		// Honorários ao advogado dativo: nome, OAB, valor e item da tabela.
		const honorarios = [];
		frases.forEach(function (f) {
			if (!/honor[áa]rios/i.test(f) || !/dativ|nomead|defensor/i.test(f)) return;
			const nome = /(?:Dr\.?|Dra\.?|advogad[oa]\s+(?:dativ[oa]\s+)?|defensor[a]?\s+(?:dativ[oa]\s+)?|a\(o\)\s+)\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'´.\-]+(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ý][A-Za-zÀ-ÿ'´.\-]+))+)/.exec(f);
			const oab = /OAB\s*(?:\/\s*[A-Z]{2})?\s*(?:n[º°o.]*\s*)?[\d.]+[A-Z]?(?:\s*[-\/]\s*[A-Z]{2})?/i.exec(f);
			const valor = /R\$\s*[\d.]+(?:,\d{2})?/.exec(f);
			const item = /\bite(?:m|ns)\s+(?:n[º°o.]*\s*)?(\d+(?:\.\d+)*(?:\s*(?:e|,)\s*\d+(?:\.\d+)*)*)/i.exec(f);
			const h = {
				nome: nome ? colapsar(nome[1]).replace(/[,.]$/, "") : "",
				oab: oab ? colapsar(oab[0]) : "",
				valor: valor ? valor[0].replace(/\s+/, " ") : "",
				item: item ? item[1].replace(/\.$/, "") : "",
			};
			if ((h.valor || h.oab || h.nome) && !honorarios.some(function (x) { return x.valor === h.valor && x.nome === h.nome; })) honorarios.push(h);
		});

		// Conferência legal: com pena privativa acima de 4 anos, ou regime
		// inicial fechado, não cabem substituição (art. 44, I, CP) nem
		// suspensão condicional (art. 77, CP). Evita falso positivo quando a
		// sentença só cita esses institutos.
		const impedem = condenacoes.length && condenacoes.every(function (c) {
			return penaEmAnos(c.pena) > 4 || c.regime === "fechado";
		});
		if (impedem) {
			substituicao = "";
			suspensao = "";
		}

		const resultado = {
			absolvidos: absolvidos,
			condenacoes: condenacoes,
			substituicao: substituicao,
			suspensao: suspensao,
			indenizacao: indenizacao,
			honorarios: honorarios,
		};
		resultado.resumo = resumoSentencaCriminal(resultado);
		// Trecho de referência: as frases que tratam desses pontos.
		const relevantes = frases.filter(function (f) {
			return /absolv|condeno|condenar|definitiv|regime|substitu|suspens[ãa]o condicional|sursis|387|indeniza|danos? (?:morais|materiais)|honor[áa]rios|dativ|julgo (?:procedente|improcedente|parcialmente)/i.test(f);
		});
		resultado.trecho = relevantes.join("\n") || limitar(t.slice(-LIMITE_FALLBACK), LIMITE_FALLBACK + 10);
		return resultado;
	}

	const NUMEROS_EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12 };
	// "08 (oito) anos e 02 (dois) meses de reclusão" -> 8.17
	function penaEmAnos(pena) {
		const t = normalizar(pena).replace(/\([^)]*\)/g, " ");
		const num = function (re) {
			const m = re.exec(t);
			if (!m) return 0;
			return /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMEROS_EXTENSO[m[1]] || 0;
		};
		return num(/(\d+|[a-z]+)\s+anos?\b/) + num(/(\d+|[a-z]+)\s+m[eê]s(?:es)?\b/) / 12 + num(/(\d+|[a-z]+)\s+dias?\b(?!-)/) / 365;
	}

	function resumoSentencaCriminal(r) {
		const linhas = [];
		if (r.absolvidos.length) linhas.push((r.absolvidos.length > 1 ? "Absolvidos: " : "Absolvido(a): ") + juntarLista(r.absolvidos) + ".");
		r.condenacoes.forEach(function (c) {
			const partes = [];
			if (c.pena) partes.push("pena de " + c.pena);
			if (c.multa) partes.push(c.multa);
			if (c.regime) partes.push("regime inicial " + c.regime);
			linhas.push("Condenado(a): " + c.nome + (partes.length ? " — " + partes.join(", ") : "") + ".");
		});
		if (r.substituicao) linhas.push("Substituição da pena: " + r.substituicao.replace(/\.$/, "") + ".");
		if (r.suspensao) linhas.push("Suspensão da pena: " + r.suspensao.replace(/\.$/, "") + ".");
		if (r.indenizacao) linhas.push("Indenização à vítima: " + r.indenizacao.replace(/\.$/, "") + ".");
		r.honorarios.forEach(function (h) {
			const partes = [h.nome, h.oab ? "(" + h.oab + ")" : ""].filter(Boolean).join(" ");
			let s = "Honorários ao advogado dativo" + (partes ? " " + partes : "");
			if (h.valor) s += ": " + h.valor;
			if (h.item) s += ", item " + h.item + " da tabela";
			linhas.push(s + ".");
		});
		return linhas.join("\n");
	}

	// ---------------------------------------------------------------
	// Audiências (a partir dos movimentos)
	// ---------------------------------------------------------------

	const SITUACAO_AUDIENCIA = [
		{ situacao: "não realizada", re: /\b(nao realizad|nao ocorrid|frustrad|prejudicad|deixou de ser realizad)/ },
		{ situacao: "cancelada", re: /\b(cancelad|desmarcad|retirad[ao] de pauta|sem efeito)/ },
		{ situacao: "redesignada", re: /\b(redesignad|remarcad|reagendad|adiad|transferid)/ },
		{ situacao: "realizada", re: /\b(realizad|ocorrid|encerrad|concluid)/ },
		{ situacao: "designada", re: /\b(designad|marcad|agendad|pautad|redesignacao)/ },
	];

	// Tipo da audiência a partir do texto ("Audiência de Instrução e
	// Julgamento", "de conciliação", "de custódia"...).
	function tipoAudiencia(texto) {
		const m = /audi[êe]ncia\s+((?:de|do|da)\s+)?([A-Za-zÀ-ú ]{3,60}?)(?=\s+(?:designad|redesignad|realizad|cancelad|nao|não|marcad|agendad|remarcad|adiad|para|em|\(|-|–)|[,.;:(\-–]|$)/i.exec(texto);
		// Mantém a preposição original: "de conciliação", mas "admonitória".
		return m ? "Audiência " + (m[1] ? m[1].toLowerCase().trim() + " " : "") + colapsar(m[2]).toLowerCase() : "Audiência";
	}

	// Data e hora da audiência mencionadas no texto (não a data do
	// movimento): "27/11/2026 13:20", "27/11/2026 às 13h20".
	function dataAudiencia(texto) {
		const m = /(\d{2}\/\d{2}\/\d{4})(?:\s*(?:às|as|-)?\s*(\d{1,2})[:h](\d{2}))?/i.exec(texto || "");
		if (!m) return "";
		return m[1] + (m[2] ? " " + pad2(m[2]) + ":" + m[3] : "");
	}

	// Devolve { eventos:[{seq, dataHora, tipo, situacao, dataAudiencia, texto}],
	//           pendentes:[...], contagem:{designada, redesignada, cancelada, realizada, "não realizada"} }.
	// "pendentes" são as audiências designadas para data futura que não
	// foram depois canceladas, redesignadas ou realizadas.
	function analisarAudiencias(movs, agora) {
		const agoraMs = typeof agora === "number" ? agora : Date.now();
		const eventos = [];
		(movs || []).forEach(function (m) {
			if (m.invalido) return;
			const titulo = m.titulo || m.evento || "";
			const completo = colapsar(titulo + " " + (m.complemento || ""));
			const n = normalizar(completo);
			if (!/\baudiencia/.test(normalizar(titulo)) && !/^audiencia/.test(n)) return;
			const def = SITUACAO_AUDIENCIA.find(function (d) { return d.re.test(normalizar(titulo)); }) ||
				SITUACAO_AUDIENCIA.find(function (d) { return d.re.test(n); });
			if (!def) return;
			eventos.push({
				seq: m.seq,
				dataHora: m.dataHora,
				tipo: tipoAudiencia(completo),
				situacao: def.situacao,
				dataAudiencia: dataAudiencia(m.complemento || "") || dataAudiencia(titulo),
				texto: completo,
			});
		});

		const contagem = { designada: 0, redesignada: 0, cancelada: 0, realizada: 0, "não realizada": 0 };
		eventos.forEach(function (e) { contagem[e.situacao]++; });

		// Cada evento de audiência pode ser "substituído" por um evento
		// posterior da mesma audiência (mesma data marcada, ou mesmo tipo):
		// designada -> redesignada -> realizada, por exemplo. Na certidão só
		// aparece o último evento de cada audiência ("finais"); a situação
		// "designada" fica só para as que ainda não têm resultado.
		function mesmaAudiencia(a, b) {
			if (a.dataAudiencia && b.dataAudiencia && a.dataAudiencia === b.dataAudiencia) return true;
			return a.tipo === b.tipo || a.tipo === "Audiência" || b.tipo === "Audiência";
		}
		eventos.forEach(function (e, i) {
			if (e.situacao !== "designada" && e.situacao !== "redesignada") return;
			const sucessor = eventos.slice(i + 1).find(function (p) { return mesmaAudiencia(e, p); });
			if (sucessor) e.substituidaPor = sucessor.seq || true;
		});
		const finais = eventos.filter(function (e) { return !e.substituidaPor; });
		const pendentes = [];
		finais.forEach(function (e) {
			if (e.situacao !== "designada" && e.situacao !== "redesignada") return;
			const quando = chaveData(e.dataAudiencia);
			if (!isNaN(quando) && quando < agoraMs - 12 * 3600 * 1000) {
				e.semResultado = true; // data já passou e não há registro do resultado
				return;
			}
			pendentes.push(e);
		});
		return { eventos: eventos, finais: finais, pendentes: pendentes, contagem: contagem };
	}

	// ---------------------------------------------------------------
	// Texto da certidão
	// ---------------------------------------------------------------

	// Monta a frase de um movimento no formato do eproc:
	// "em 25/09/2026 15:39:05, Distribuído por sorteio (seq. 1)".
	function fraseMovimento(mov) {
		let s = "em " + (mov.dataHora || "[data]") + ", " + colapsar(mov.evento || "[evento]");
		const extras = [];
		if (mov.seq) extras.push("seq. " + mov.seq);
		if (mov.invalido) extras.push("invalidado");
		if (extras.length) s += " (" + extras.join(", ") + ")";
		return s;
	}

	// "25/09/2026 15:39:05" -> número comparável; sem data -> NaN.
	function chaveData(dataHora) {
		const m = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(dataHora || "");
		if (!m) return NaN;
		return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
	}

	// Ordem cronológica crescente; empate (ou sem data) pelo sequencial.
	function ordenarMovimentos(movs) {
		return movs.slice().sort(function (a, b) {
			const da = chaveData(a.dataHora);
			const db = chaveData(b.dataHora);
			if (!isNaN(da) && !isNaN(db) && da !== db) return da - db;
			const sa = parseFloat(a.seq);
			const sb = parseFloat(b.seq);
			if (!isNaN(sa) && !isNaN(sb) && sa !== sb) return sa - sb;
			return 0;
		});
	}

	// "AUTOR" + [{nome, documento, advogados}] -> "como AUTOR, FULANO - CPF: x (representado(a) por Y - OAB: z)"
	function frasePolo(polo) {
		const partes = (polo.partes || []).map(function (p) {
			let s = p.nome;
			if (p.documento) s += " - " + p.documento;
			if (p.advogados && p.advogados.length) s += " (representado(a) por " + p.advogados.join(", ") + ")";
			return s;
		});
		return "como " + (polo.titulo || "PARTE").toUpperCase() + ", " + juntarLista(partes);
	}

	const api = {
		normalizar: normalizar,
		colapsar: colapsar,
		classificarMovimento: classificarMovimento,
		ehComunicacao: ehComunicacao,
		referenciaEvento: referenciaEvento,
		formatarAdvogado: formatarAdvogado,
		semCodigo: semCodigo,
		palavras: palavras,
		rotuloDoTipo: rotuloDoTipo,
		extrairTrechoPedidos: extrairTrechoPedidos,
		extrairDenuncia: extrairDenuncia,
		resumoDenuncia: resumoDenuncia,
		limparAssinaturas: limparAssinaturas,
		ehProcessoCriminal: ehProcessoCriminal,
		penaEmAnos: penaEmAnos,
		extrairSentencaCriminal: extrairSentencaCriminal,
		fatosIntegrais: fatosIntegrais,
		tituloDoFato: tituloDoFato,
		descricaoObjetivaFato: descricaoObjetivaFato,
		artigosImputacao: artigosImputacao,
		analisarAudiencias: analisarAudiencias,
		dataPorExtenso: dataPorExtenso,
		fraseMovimento: fraseMovimento,
		ordenarMovimentos: ordenarMovimentos,
		frasePolo: frasePolo,
		juntarLista: juntarLista,
	};

	root.PdpCertidaoTexto = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
