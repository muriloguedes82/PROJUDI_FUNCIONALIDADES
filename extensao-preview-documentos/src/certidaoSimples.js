// Certidão narrativa - "Entenda esta certidão" (linguagem simples).
//
// Gera, por MODELO FIXO (sem IA), um resumo da certidão para qualquer
// cidadão, seguindo as diretrizes do Pacto Nacional do Judiciário pela
// Linguagem Simples (CNJ): frases curtas, voz ativa, sem jargão nem latim,
// datas por extenso, termos técnicos explicados num glossário.
//
// Usa só dados já coletados (classe, partes, movimentos, audiências e,
// quando extraídos, denúncia e sentença criminal). Nada é inventado: o que
// não foi identificado simplesmente não aparece.
//
// Funções puras (sem DOM): usadas pela página da certidão (certidao.js) e
// pelos testes no Node.

(function (root) {
	"use strict";

	const T = root.PdpCertidaoTexto || (typeof require === "function" ? require("./certidaoTexto.js") : null);
	const normalizar = T.normalizar;
	const colapsar = T.colapsar;

	const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

	// "25/09/2026 15:39:05" -> "25 de setembro de 2026"
	function dataExtenso(dataHora) {
		const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(dataHora || "");
		if (!m) return "";
		const dia = parseInt(m[1], 10);
		return (dia === 1 ? "1º" : String(dia)) + " de " + MESES[parseInt(m[2], 10) - 1] + " de " + m[3];
	}

	// "27/11/2026 14:00" -> "às 14h"; "13:20" -> "às 13h20"
	function horaExtenso(dataHora) {
		const m = /\b(\d{1,2}):(\d{2})/.exec(dataHora || "");
		if (!m) return "";
		return "às " + parseInt(m[1], 10) + "h" + (m[2] === "00" ? "" : m[2]);
	}

	function juntar(itens) {
		return T.juntarLista(itens.filter(Boolean));
	}

	function primeiraMaiuscula(s) {
		return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
	}

	// Nome próprio em caixa normal: "EZEQUIEL ROCHA LEAL" -> "Ezequiel Rocha Leal"
	function nomeProprio(nome) {
		// Só converte as palavras que estão em MAIÚSCULAS; o resto (como
		// "representado(a) por") fica como está.
		return colapsar(nome)
			.split(" ")
			.map(function (w) {
				if (!/[A-ZÀ-Ý]/.test(w) || w !== w.toUpperCase()) return w;
				if (/^(DA|DE|DO|DAS|DOS|E)$/.test(w)) return w.toLowerCase();
				if (/^[A-Z]{2}$/.test(w) || /\d/.test(w)) return w; // UF, OAB etc.
				const l = w.toLowerCase();
				return l.charAt(0).toUpperCase() + l.slice(1);
			})
			.join(" ");
	}

	// Vítima pelas iniciais, para preservar a intimidade: "Maria da Silva" -> "M. S."
	function iniciais(nome) {
		return colapsar(nome)
			.split(" ")
			.filter(function (p) { return p.length > 2 || !/^(da|de|do|e)$/i.test(p); })
			.map(function (p) { return p.charAt(0).toUpperCase() + "."; })
			.join(" ");
	}

	// ---------------------------------------------------------------
	// 1. Que processo é este?
	// ---------------------------------------------------------------

	const CLASSES = [
		[/medidas? protetivas?/, "É um pedido de proteção para uma pessoa em situação de violência doméstica ou familiar. O juiz pode, por exemplo, proibir o agressor de se aproximar ou de entrar em contato com a vítima."],
		[/prisao em flagrante/, "É o registro da prisão de uma pessoa no momento do crime ou logo depois dele. O juiz verifica se a prisão foi legal e se a pessoa deve continuar presa ou responder em liberdade."],
		[/inquerito/, "É uma investigação feita pela polícia para descobrir se um crime aconteceu e quem o cometeu. Nesta fase, ainda não há acusação formal contra ninguém."],
		[/termo circunstanciado/, "É o registro de uma infração de menor gravidade, que é tratada no Juizado Especial Criminal, com procedimento mais simples e rápido."],
		[/execucao (da )?pena|execucao penal/, "É o processo que acompanha o cumprimento da pena de uma pessoa que já foi condenada."],
		[/juri/, "É um processo criminal para crimes contra a vida, como o homicídio. Quem decide se a pessoa é culpada é um grupo de cidadãos, chamado Tribunal do Júri."],
		[/acao penal|queixa.crime|\bpenal\b|criminal/, "É um processo criminal. Nele, a acusação (normalmente o Ministério Público) afirma que uma ou mais pessoas cometeram um crime, e o juiz decide se elas são culpadas ou não."],
		[/alimentos/, "É um processo sobre pensão alimentícia: o valor que uma pessoa deve pagar para ajudar no sustento de outra, como um filho."],
		[/execucao fiscal/, "É um processo em que o poder público (União, Estado ou Município) cobra uma dívida, como impostos não pagos."],
		[/execucao|cumprimento de sentenca/, "É um processo de cobrança. Quem tem o direito de receber pede ao juiz que obrigue a outra parte a pagar ou a cumprir o que deve."],
		[/juizado especial civel|procedimento do juizado especial/, "É um processo no Juizado Especial Cível, que resolve causas de menor valor de forma mais simples e rápida. Nele, uma pessoa pede que outra seja obrigada a pagar, fazer ou deixar de fazer algo."],
		[/divorcio/, "É um processo para encerrar oficialmente um casamento e resolver questões como bens, guarda dos filhos e pensão."],
		[/guarda|visitas|regulamentacao/, "É um processo para definir com quem os filhos vão morar e como será a convivência com o outro responsável."],
		[/inventario|arrolamento/, "É um processo para organizar e dividir os bens de uma pessoa que faleceu entre os herdeiros."],
		[/usucapiao/, "É um processo em que uma pessoa pede para ser reconhecida como dona de um imóvel que ocupa há muitos anos."],
		[/mandado de seguranca/, "É um processo para proteger um direito que foi ameaçado ou violado por uma autoridade pública."],
		[/procedimento comum|ordinario|sumario/, "É um processo em que uma pessoa ou empresa pede ao juiz que resolva um conflito com outra parte."],
	];

	function explicarClasse(classe) {
		const n = normalizar(classe);
		const def = CLASSES.find(function (c) { return c[0].test(n); });
		return def ? def[1] : "";
	}

	// ---------------------------------------------------------------
	// 2. Quem participa?
	// ---------------------------------------------------------------

	function papelDoPolo(titulo, criminal) {
		const t = normalizar(titulo);
		if (/vitima|ofendid/.test(t)) return { papel: "é a pessoa que sofreu o crime", vitima: true };
		if (/ministerio publico/.test(t)) return { papel: "é o órgão que faz a acusação e defende os interesses da sociedade" };
		if (/exequente|credor/.test(t)) return { papel: "é quem está cobrando" };
		if (/executad|devedor/.test(t)) return { papel: "é quem está sendo cobrado" };
		if (/impetrante/.test(t)) return { papel: "é quem pediu a proteção do direito" };
		if (/impetrad|autoridade coatora/.test(t)) return { papel: "é a autoridade contra quem o pedido foi feito" };
		if (/reu|re\b|requerid|promovid|acusad|denunciad|indiciad|investigad|noticiad|autor do fato|flagrantead|sentenciad|apenad/.test(t)) {
			return { papel: criminal ? "é a pessoa acusada (ou investigada) no processo" : "é a parte contra quem o processo foi aberto" };
		}
		if (/autor|requerente|promovente|embargante|reclamante|querelante/.test(t)) return { papel: "é quem entrou com o processo" };
		if (/testemunha/.test(t)) return { papel: "é quem pode contar o que viu ou sabe sobre os fatos" };
		return { papel: "participa do processo como " + colapsar(titulo).toLowerCase() };
	}

	function blocoPartes(d) {
		const linhas = [];
		(d.polos || []).forEach(function (polo) {
			const r = papelDoPolo(polo.titulo, d.criminal);
			(polo.partes || []).forEach(function (p) {
				const nome = r.vitima ? iniciais(p.nome) : nomeProprio(p.nome);
				let s = nome + " (" + colapsar(polo.titulo).toLowerCase() + ") " + r.papel + ".";
				if (p.advogados && p.advogados.length) {
					const advs = p.advogados.map(function (a) { return nomeProprio(a.replace(/\s*\(OAB[^)]*\)/i, "")); });
					s += " " + (advs.length > 1 ? "É representado(a) pelos advogados " : "É representado(a) pelo(a) advogado(a) ") + juntar(advs) + ".";
				}
				linhas.push(s);
			});
		});
		return linhas;
	}

	// ---------------------------------------------------------------
	// 3. O que já aconteceu? / 4. Qual é a situação agora?
	// ---------------------------------------------------------------

	const MARCOS = [
		{ re: /\bdistribuid|\bautuad/, texto: function (m) { return "O processo começou em " + dataExtenso(m.dataHora) + "."; }, unico: true },
		{ re: /\bdenuncia\b/, excluir: /recebid|rejeit|aditament|intima|cita/, texto: function (m) { return "A acusação (denúncia) foi apresentada ao juiz em " + dataExtenso(m.dataHora) + "."; }, unico: true },
		{ re: /recebid[ao] a denuncia|denuncia recebida|recebimento da denuncia/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o juiz aceitou a acusação, e o acusado passou a responder ao processo."; }, unico: true },
		{ re: /rejeitad[ao] a denuncia|denuncia rejeitada/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o juiz não aceitou a acusação."; }, unico: true },
		{ re: /\bcitad|citacao (realizada|cumprida|efetivada)/, excluir: /expedi|aguard/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", a parte foi avisada oficialmente do processo (citação)."; }, unico: true },
		{ tipo: "sentenca", texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o juiz deu a sentença, que é a decisão sobre o pedido principal do processo."; } },
		{ tipo: "recurso", texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", foi apresentado um recurso, que é um pedido para que outra instância revise a decisão."; } },
		{ re: /transit/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", a decisão se tornou definitiva: não é mais possível recorrer (trânsito em julgado)."; }, unico: true },
		{ re: /suspens[ao] (do processo|condicional do processo)|processo suspenso/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o andamento do processo foi suspenso."; } },
		{ re: /\barquivad|baixa definitiva/, excluir: /desarquiv/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o processo foi arquivado."; } },
		{ re: /desarquiv/, texto: function (m) { return "Em " + dataExtenso(m.dataHora) + ", o processo foi desarquivado e voltou a andar."; } },
	];

	function marcosDoProcesso(movs) {
		const linhas = [];
		const usados = new Set();
		let houveSentenca = false;
		(movs || []).forEach(function (m) {
			if (m.invalido) return;
			if (ehTipo(m, "sentenca")) houveSentenca = true;
			const titulo = normalizar(m.titulo || m.evento);
			MARCOS.forEach(function (def, i) {
				if (def.unico && usados.has(i)) return;
				let casa;
				if (def.tipo) {
					const c = T.classificarMovimento(m.titulo || m.evento);
					casa = c && c.tipo === def.tipo;
					// Recurso só conta depois de uma sentença (é contra ela).
					if (casa && def.tipo === "recurso" && !houveSentenca) casa = false;
				} else {
					casa = def.re.test(titulo) && !(def.excluir && def.excluir.test(titulo));
				}
				if (!casa || !m.dataHora) return;
				usados.add(i);
				const linha = def.texto(m);
				if (linhas.indexOf(linha) === -1) linhas.push(linha);
			});
		});
		return linhas;
	}

	function situacaoAtual(d, agora) {
		const linhas = [];
		const a = T.analisarAudiencias(d.movimentos, agora);
		a.pendentes.forEach(function (e) {
			const quando = e.dataAudiencia ? " para " + dataExtenso(e.dataAudiencia) + (horaExtenso(e.dataAudiencia) ? ", " + horaExtenso(e.dataAudiencia) : "") : "";
			linhas.push("Há uma " + e.tipo.toLowerCase() + " marcada" + quando + ". A audiência é o encontro com o juiz (ou com um conciliador) em que as partes são ouvidas.");
		});
		const movs = (d.movimentos || []).filter(function (m) { return !m.invalido; });
		const ultimoArq = movs.filter(function (m) { return /\barquivad|baixa definitiva/.test(normalizar(m.titulo || m.evento)) && !/desarquiv/.test(normalizar(m.titulo || m.evento)); }).pop();
		const ultimoDesarq = movs.filter(function (m) { return /desarquiv/.test(normalizar(m.titulo || m.evento)); }).pop();
		const arquivado = ultimoArq && (!ultimoDesarq || movs.indexOf(ultimoArq) > movs.indexOf(ultimoDesarq));
		if (arquivado) linhas.push("O processo está arquivado desde " + dataExtenso(ultimoArq.dataHora) + ".");
		else if (!a.pendentes.length) linhas.push("O processo está em andamento. Não há audiência marcada nos registros.");
		const ultimo = movs[movs.length - 1];
		if (ultimo && ultimo.dataHora) linhas.push("O último registro no processo é de " + dataExtenso(ultimo.dataHora) + ": " + colapsar(ultimo.titulo || ultimo.evento).toLowerCase() + ".");
		return linhas;
	}

	// ---------------------------------------------------------------
	// 5. Acusação e decisão
	// ---------------------------------------------------------------

	function blocoAcusacao(denuncia) {
		if (!denuncia || !denuncia.fatos || !denuncia.fatos.length) return [];
		const crimes = denuncia.fatos.map(function (f) { return f.crime; }).filter(Boolean);
		const quem = denuncia.denunciados.map(nomeProprio);
		const linhas = [];
		if (crimes.length) linhas.push((quem.length ? juntar(quem) + (quem.length > 1 ? " são acusados" : " é acusado(a)") : "A acusação aponta") + " de " + juntar(crimes.filter(function (c, i) { return crimes.indexOf(c) === i; })) + ".");
		else if (quem.length) linhas.push(juntar(quem) + (quem.length > 1 ? " são acusados" : " é acusado(a)") + " de ter cometido crime.");
		const datas = denuncia.fatos.map(function (f) { return f.data ? dataExtenso(f.data) : ""; }).filter(Boolean);
		if (datas.length) linhas.push("Segundo a acusação, os fatos aconteceram em " + juntar(datas.filter(function (x, i) { return datas.indexOf(x) === i; })) + ".");
		linhas.push("Ser acusado não significa ser culpado: quem decide é o juiz, depois de ouvir a acusação e a defesa.");
		return linhas;
	}

	const REGIMES = {
		aberto: "no regime aberto (a pessoa trabalha ou estuda durante o dia e se recolhe à noite, cumprindo regras fixadas pelo juiz)",
		semiaberto: "no regime semiaberto (a pena começa em estabelecimento com mais liberdade, como colônia agrícola ou industrial)",
		fechado: "no regime fechado (a pena começa na prisão)",
	};

	function penaSimples(pena) {
		return pena
			.replace(/\s*\([^)]*\)/g, "")
			.replace(/\breclus[ãa]o\b/i, "reclusão (pena de prisão para crimes mais graves)")
			.replace(/\bdeten[çc][ãa]o\b/i, "detenção (pena de prisão para crimes menos graves)");
	}

	function blocoDecisao(sent) {
		if (!sent) return [];
		const linhas = [];
		sent.absolvidos.forEach(function (n) {
			linhas.push(nomeProprio(n) + " foi absolvido(a): o juiz decidiu que não deve ser condenado(a).");
		});
		sent.condenacoes.forEach(function (c) {
			let s = nomeProprio(c.nome) + " foi condenado(a)";
			if (c.pena) s += " a " + penaSimples(c.pena);
			if (c.regime && REGIMES[c.regime]) s += ", " + REGIMES[c.regime];
			s += ".";
			if (c.multa) s += " Também deverá pagar multa (" + c.multa.replace(/\s*\([^)]*\)/g, "") + ", valor calculado pelo juiz).";
			linhas.push(s);
		});
		if (sent.substituicao) linhas.push("A pena de prisão foi trocada por outra pena, como prestação de serviços à comunidade ou pagamento em dinheiro (substituição da pena).");
		if (sent.suspensao) {
			const prazo = /prazo de\s+(\d+)(?:\s*\([^)]*\))?\s*anos?/i.exec(sent.suspensao);
			linhas.push("A pena ficou suspensa" + (prazo ? " por " + prazo[1] + (prazo[1] === "1" ? " ano" : " anos") : "") + ": a pessoa não precisa cumpri-la se respeitar as condições fixadas pelo juiz nesse período (suspensão condicional da pena).");
		}
		if (sent.indenizacao) {
			const v = /R\$\s*[\d.]+(?:,\d{2})?/.exec(sent.indenizacao);
			linhas.push("Também foi determinado o pagamento " + (v ? "de " + v[0] + " " : "de indenização ") + "à vítima, para reparar os danos causados.");
		}
		sent.honorarios.forEach(function (h) {
			linhas.push("O Estado deverá pagar " + (h.valor ? h.valor + " " : "") + "ao advogado nomeado pelo juiz para fazer a defesa (advogado dativo)" + (h.nome ? ", " + nomeProprio(h.nome) : "") + ".");
		});
		return linhas;
	}

	// ---------------------------------------------------------------
	// O processo já tem sentença? Resultado e recurso.
	// ---------------------------------------------------------------

	function ehTipo(m, tipo) {
		const c = T.classificarMovimento(m.titulo || m.evento);
		return !!(c && c.tipo === tipo);
	}

	// Resultado lido do nome do movimento da sentença, quando não há a
	// leitura da própria sentença criminal.
	function resultadoPeloMovimento(m, criminal) {
		const t = normalizar((m.titulo || m.evento || "") + " " + (m.complemento || ""));
		if (/absolv/.test(t)) return criminal ? "o juiz absolveu o acusado (decidiu que ele não deve ser condenado)" : "";
		if (/condena/.test(t)) return criminal ? "o juiz condenou o acusado" : "o juiz condenou a parte ré";
		if (/parcialmente procedente|procedente em parte|procedencia parcial/.test(t)) return criminal ? "o juiz aceitou em parte a acusação (condenação parcial)" : "o juiz deu razão em parte a quem entrou com o processo (pedido parcialmente procedente)";
		if (/improcedente|improcedencia/.test(t)) return criminal ? "o juiz não aceitou a acusação (absolvição)" : "o juiz não deu razão a quem entrou com o processo (pedido improcedente)";
		if (/procedente|procedencia/.test(t)) return criminal ? "o juiz aceitou a acusação (condenação)" : "o juiz deu razão a quem entrou com o processo (pedido procedente)";
		if (/extint|extincao/.test(t)) return criminal && /punibilidade/.test(t) ? "o juiz declarou extinta a punibilidade (o Estado não pode mais punir pelo fato)" : "o juiz encerrou o processo (extinção)";
		if (/homolog/.test(t)) return "o juiz aprovou o acordo feito entre as partes (homologação)";
		if (/impronunci/.test(t)) return "o juiz decidiu que o acusado não vai a júri (impronúncia)";
		if (/pronunci/.test(t)) return "o juiz decidiu que o acusado vai a julgamento pelo Tribunal do Júri (pronúncia)";
		return "";
	}

	function blocoSentenca(d, extras) {
		const movs = (d.movimentos || []).filter(function (m) { return !m.invalido; });
		let iSent = -1;
		movs.forEach(function (m, i) { if (ehTipo(m, "sentenca")) iSent = i; });
		if (iSent < 0) {
			return [d.criminal ? "Ainda não há sentença. O juiz ainda não decidiu se o acusado deve ser condenado ou absolvido." : "Ainda não há sentença. O juiz ainda não decidiu o pedido principal do processo."];
		}
		const sent = movs[iSent];
		const linhas = [];
		// Resultado: pela leitura da sentença criminal (nomes), ou pelo nome do movimento.
		const sc = extras.sentencaCriminal;
		let resultado = "";
		if (sc && (sc.condenacoes.length || sc.absolvidos.length)) {
			const partes = [];
			if (sc.condenacoes.length) partes.push("condenou " + juntar(sc.condenacoes.map(function (c) { return nomeProprio(c.nome); })));
			if (sc.absolvidos.length) partes.push("absolveu " + juntar(sc.absolvidos.map(nomeProprio)));
			resultado = "o juiz " + partes.join(" e ");
		} else {
			resultado = resultadoPeloMovimento(sent, d.criminal);
		}
		linhas.push("Sim. A sentença foi dada em " + dataExtenso(sent.dataHora) + (resultado ? ": " + resultado + "." : ". O resultado está resumido na parte IV da certidão."));

		// Recurso contra a sentença: só os apresentados depois dela.
		const depois = movs.slice(iSent + 1);
		const recursos = depois.filter(function (m) { return ehTipo(m, "recurso"); });
		const transito = depois.filter(function (m) { return /transit/.test(normalizar(m.titulo || m.evento)); }).pop();
		if (recursos.length) {
			linhas.push("Houve recurso contra a sentença, apresentado em " + dataExtenso(recursos[0].dataHora) + ". Por isso, a decisão ainda pode ser mudada por um tribunal.");
		} else if (transito) {
			linhas.push("Não houve recurso, e a sentença se tornou definitiva (não cabe mais recurso) em " + dataExtenso(transito.dataHora) + ".");
		} else {
			linhas.push("Até agora, não há registro de recurso contra a sentença. Enquanto o prazo estiver aberto, as partes ainda podem recorrer.");
		}
		return linhas;
	}

	// ---------------------------------------------------------------
	// 6. Glossário (só os termos que aparecem na certidão)
	// ---------------------------------------------------------------

	const GLOSSARIO = [
		[/\baudiencias?\b/, "Audiência", "encontro marcado com o juiz (ou conciliador) para ouvir as partes, testemunhas ou tentar um acordo."],
		[/\bcitac|\bcitad/, "Citação", "aviso oficial à pessoa de que existe um processo contra ela, para que possa se defender."],
		[/\bintimac|\bintimad/, "Intimação", "aviso oficial sobre um ato do processo, como uma decisão ou uma audiência."],
		[/\bdenuncia\b/, "Denúncia", "documento em que o Ministério Público acusa formalmente uma pessoa de ter cometido um crime."],
		[/\bpeticao inicial\b|\binicial\b/, "Petição inicial", "documento que dá início ao processo, com o pedido feito ao juiz."],
		[/\bcontestac/, "Contestação", "resposta de quem foi processado, apresentando sua defesa."],
		[/resposta a acusacao/, "Resposta à acusação", "primeira defesa escrita da pessoa acusada em um processo criminal."],
		[/\bsentenca\b/, "Sentença", "decisão do juiz que resolve o pedido principal do processo."],
		[/\brecursos?\b|\bapelac/, "Recurso", "pedido para que um tribunal revise uma decisão."],
		[/transit/, "Trânsito em julgado", "momento em que a decisão se torna definitiva e não cabe mais recurso."],
		[/\barquivad/, "Arquivamento", "encerramento do andamento do processo, que fica guardado."],
		[/ministerio publico/, "Ministério Público", "instituição que defende os interesses da sociedade e faz a acusação nos processos criminais."],
		[/\bdativ/, "Advogado dativo", "advogado nomeado pelo juiz para defender quem não tem advogado; é pago pelo Estado."],
		[/defensoria/, "Defensoria Pública", "instituição que presta assistência jurídica gratuita a quem não pode pagar advogado."],
		[/regime (inicial )?(aberto|semiaberto|fechado)/, "Regime de cumprimento da pena", "forma de cumprir a pena de prisão: fechado (na prisão), semiaberto (com mais liberdade) ou aberto (em liberdade, com regras)."],
		[/dias?-multa/, "Dias-multa", "forma de calcular a multa penal; o valor final é fixado pelo juiz."],
		[/suspensao condicional da pena|sursis/, "Suspensão condicional da pena", "a pena não é cumprida se a pessoa respeitar as condições fixadas pelo juiz durante um período."],
		[/substitui/, "Substituição da pena", "troca da pena de prisão por outra, como prestação de serviços à comunidade."],
		[/medidas? protetivas?/, "Medida protetiva", "ordem do juiz para proteger a vítima de violência doméstica, como proibir o agressor de se aproximar."],
		[/\bexequente\b/, "Exequente", "quem está cobrando uma dívida ou obrigação no processo."],
		[/\bexecutad/, "Executado", "quem está sendo cobrado no processo."],
		[/\breu\b|\bre\b/, "Réu", "pessoa contra quem o processo foi aberto; no processo criminal, a pessoa acusada."],
		[/\bvitima/, "Vítima", "pessoa que sofreu o crime."],
		[/valor da causa/, "Valor da causa", "valor atribuído ao processo, normalmente o que está sendo pedido."],
		[/assunto principal/, "Assunto principal", "tema do processo, segundo a tabela oficial do Conselho Nacional de Justiça."],
		[/\bjuizo\b/, "Juízo", "a vara ou unidade do Judiciário responsável pelo processo."],
		[/juizado especial/, "Juizado Especial", "unidade que julga causas mais simples, de forma mais rápida."],
		[/\bdjen\b|diario de justica/, "DJEN", "Diário de Justiça Eletrônico Nacional, onde as comunicações do processo são publicadas."],
		[/decurso de prazo|decorrido prazo|decorreu o prazo/, "Decurso de prazo", "o prazo para fazer algo no processo terminou."],
		[/\bconclus/, "Conclusão", "o processo foi enviado ao juiz para que ele decida algo."],
		[/\bevento|\bseq\./, "Evento", "cada registro feito no processo, numerado em sequência (seq.)."],
	];

	function glossario(textoCertidao) {
		const n = normalizar(textoCertidao);
		return GLOSSARIO.filter(function (g) { return g[0].test(n); }).map(function (g) { return [g[1], g[2]]; });
	}

	// ---------------------------------------------------------------
	// Montagem
	// ---------------------------------------------------------------

	// d: dados da certidão; extras: { denuncia, sentencaCriminal, textoCertidao, agora }
	// Devolve [{ titulo, paragrafos: [...], glossario?: [[termo, definição]] }]
	function gerarLinguagemSimples(d, extras) {
		extras = extras || {};
		const blocos = [];
		const classe = colapsar(d.classe || "");
		const explica = explicarClasse(classe);
		const p1 = [];
		if (d.numero) p1.push("Este é o processo número " + d.numero + (d.juizo ? ", que tramita no " + d.juizo : "") + ".");
		if (classe) p1.push("O tipo de processo é “" + classe + "”. " + explica);
		if (d.assuntos && d.assuntos[0]) p1.push("O assunto principal é “" + T.semCodigo(d.assuntos[0]) + "”.");
		if (p1.length) blocos.push({ titulo: "Que processo é este?", paragrafos: p1 });

		const partes = blocoPartes(d);
		if (partes.length) blocos.push({ titulo: "Quem participa?", paragrafos: partes });

		const acusacao = d.criminal ? blocoAcusacao(extras.denuncia) : [];
		if (acusacao.length) blocos.push({ titulo: "Qual é a acusação?", paragrafos: acusacao });

		const marcos = marcosDoProcesso(d.movimentos);
		if (marcos.length) blocos.push({ titulo: "O que já aconteceu?", paragrafos: marcos });

		blocos.push({ titulo: "O processo já tem sentença?", paragrafos: blocoSentenca(d, extras) });

		const decisao = blocoDecisao(extras.sentencaCriminal);
		if (decisao.length) blocos.push({ titulo: "O que o juiz decidiu?", paragrafos: decisao });

		const situacao = situacaoAtual(d, extras.agora);
		if (situacao.length) blocos.push({ titulo: "Qual é a situação agora?", paragrafos: situacao });

		const g = glossario(extras.textoCertidao || "");
		if (g.length) blocos.push({ titulo: "Palavras que aparecem nesta certidão", paragrafos: [], glossario: g });

		blocos.push({
			titulo: "Importante",
			paragrafos: ["Este resumo explica, com palavras simples, o conteúdo da certidão acima. Ele não substitui a certidão nem as decisões do processo. Em caso de dúvida, procure um advogado, a Defensoria Pública ou o atendimento da unidade judiciária."],
		});
		return blocos;
	}

	// Texto corrido (para a IA e para "Copiar texto").
	function blocosEmTexto(blocos) {
		return blocos
			.map(function (b) {
				const linhas = [b.titulo];
				b.paragrafos.forEach(function (p) { linhas.push(p); });
				(b.glossario || []).forEach(function (g) { linhas.push("• " + g[0] + ": " + g[1]); });
				return linhas.join("\n");
			})
			.join("\n\n");
	}

	const api = {
		gerarLinguagemSimples: gerarLinguagemSimples,
		blocosEmTexto: blocosEmTexto,
		dataExtenso: dataExtenso,
		horaExtenso: horaExtenso,
		nomeProprio: nomeProprio,
		iniciais: iniciais,
		explicarClasse: explicarClasse,
		glossario: glossario,
		TITULOS: ["Que processo é este?", "Quem participa?", "Qual é a acusação?", "O que já aconteceu?", "O que cada parte pediu?", "O processo já tem sentença?", "O que o juiz decidiu?", "Houve recurso?", "Qual é a situação agora?", "Palavras que aparecem nesta certidão", "Importante"],
	};
	root.PdpCertidaoSimples = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
