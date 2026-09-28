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
		if (!lista.length || algumaCasa(lista, EXCLUSOES)) return null;
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
		const t = String(texto || "").replace(/\r/g, "").replace(/[ \t]+/g, " ");
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
	const TITULO_FATO = /(^|\n)[ \t]*(?:(\d{1,2})\s*[ºo°]?\s*FATO|FATO\s*(\d{1,2}|[ÚU]NICO))\s*[–—\-:.]?\s*([^\n]*)/gi;

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
	function extrairDenuncia(texto) {
		const t = String(texto || "").replace(/\r/g, "").replace(/[ \t]+/g, " ");
		const semAcento = tiraAcentoMantendoTamanho(t);
		const fatos = [];
		TITULO_FATO.lastIndex = 0;
		let m;
		const titulos = [];
		while ((m = TITULO_FATO.exec(t))) {
			const inicio = m.index + (m[1] ? m[1].length : 0);
			const numeroTxt = m[2] || m[3] || "";
			const n = /^\d+$/.test(numeroTxt) ? parseInt(numeroTxt, 10) : 1;
			const crime = colapsar(m[4]).replace(/[.:;]+$/, "");
			titulos.push({ inicio: inicio, fimTitulo: TITULO_FATO.lastIndex, n: n, crime: crime });
		}

		// Onde começa a capitulação ("Assim agindo, o denunciado ... incidiu
		// nos crimes ..."): procura a partir do último fato (ou do começo).
		const aPartirDe = titulos.length ? titulos[titulos.length - 1].fimTitulo : 0;
		let capitulacao = "";
		let fimCapitulacao = -1;
		let inicioCapitulacao = -1;
		const reCap = /(^|\n|\.\s)\s*(assim agindo|assim procedendo|ao assim agir|agindo assim|com tais condutas|com (essa|esta) conduta|dessa forma|desta forma)\b/gi;
		reCap.lastIndex = aPartirDe;
		const mc = reCap.exec(semAcento);
		if (mc) {
			inicioCapitulacao = mc.index + mc[0].length - mc[2].length;
		} else {
			const reInc = /\b(incidiu|incidiram|incorreu|incorreram|esta(o)? incurs[oa]s?)\b/gi;
			reInc.lastIndex = aPartirDe;
			const mi = reInc.exec(semAcento);
			if (mi) {
				// Volta até o começo da frase.
				const antes = t.lastIndexOf(".", mi.index);
				const quebra = t.lastIndexOf("\n", mi.index);
				inicioCapitulacao = Math.max(antes + 1, quebra + 1, aPartirDe);
			}
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

		// Fato único sem título: tenta ao menos a data e os denunciados do
		// texto anterior à capitulação.
		const corpoGeral = inicioCapitulacao > 0 ? t.slice(0, inicioCapitulacao) : t;
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
		titulos.forEach(function (tit, i) {
			const f = fatos[i];
			partesTrecho.push(colapsar(t.slice(tit.inicio, tit.fimTitulo)) + "\n" + f.texto.slice(0, 450) + (f.texto.length > 450 ? " […]" : ""));
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

	// Enxuga "Assim agindo, o denunciado FULANO incidiu nos crimes previstos
	// no ..." para "crimes previstos no ...".
	function capitulacaoEnxuta(cap) {
		let c = colapsar(cap);
		const m = /\b(incidiu|incidiram|incorreu|incorreram|est[aã]o? incurs[oa]s?)\s+(n[oa]s?\s+)?/i.exec(c);
		if (m) c = c.slice(m.index + m[0].length);
		c = c.replace(/^(s)?an[cç][aã]o d[oa]s?\s+/i, "");
		c = c.replace(/[.;:\s]+$/, "");
		return c.charAt(0).toLowerCase() + c.slice(1);
	}

	function resumoDenuncia(d) {
		const partes = [];
		let abertura = "Denúncia oferecida";
		if (d.denunciados.length) abertura += " contra " + juntarLista(d.denunciados);
		if (d.fatos.length) {
			const fatos = d.fatos.map(function (f) {
				let s = "Fato " + f.n + (f.crime ? " – " + f.crime : "");
				if (f.data) s += " (" + f.data + ")";
				return s;
			});
			abertura += " pela prática de: " + fatos.join("; ");
		}
		partes.push(abertura + ".");
		if (d.capitulacao) partes.push("Capitulação: " + capitulacaoEnxuta(d.capitulacao) + ".");
		if (d.requerimentos.length) partes.push("Requer " + juntarLista(d.requerimentos) + ".");
		return partes.join(" ");
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
		dataPorExtenso: dataPorExtenso,
		fraseMovimento: fraseMovimento,
		ordenarMovimentos: ordenarMovimentos,
		frasePolo: frasePolo,
		juntarLista: juntarLista,
	};

	root.PdpCertidaoTexto = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
