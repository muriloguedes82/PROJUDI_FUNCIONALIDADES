// Testes das funções puras da certidão narrativa (src/certidaoTexto.js).
// Rodar com: node --test extensao-preview-documentos/testes/
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/certidaoTexto.js");

const DENUNCIA = `O MINISTÉRIO PÚBLICO DO ESTADO DO PARANÁ, por seu Promotor de Justiça, vem oferecer DENÚNCIA em face de VALDIR CARNEIRO, pela prática das seguintes condutas delituosas:
FATO 01 – lesão corporal
No dia 06 de setembro de 2026, por volta das 20h20min, no interior da
residência situada na Travessa Rio Betara, nº 372, Bairro Iguaçu, neste
município e Foro Regional de Fazenda Rio Grande, Comarca da Região
Metropolitana de Curitiba/PR, o denunciado VALDIR CARNEIRO,
dolosamente, ciente da ilicitude e reprovabilidade de sua conduta, por
razões de condição do sexo feminino caracterizadas pela violência
doméstica e familiar contra a mulher, ofendeu a integridade corporal da
vítima L.A.d.S., sua companheira, ao desferir um golpe de arma branca
(faca) contra ela, causando-lhe lesão corporal consistente em um
ferimento corto-contuso superficial, sem necessidade de sutura, na orelha
da vítima, tudo conforme: boletim de ocorrência nº 2026/1183745 (mov.
1.4), termos de depoimento e declaração (mov. 1.5/10), atestado médico
(mov. 1.16, fl. 6) e fotografia (mov. 1.18).
Consta dos autos que na data e local mencionados, enquanto a vítima se
arrumava para sair, o denunciado e a vítima travaram discussão, momento
em que VALDIR CARNEIRO apanhou uma faca e desferiu um golpe contra
a ofendida, que, ao tentar se esquivar, foi atingida na orelha.
FATO 02 – ameaça
Sob a mesma circunstância de data e local do fato 01, em momento
imediatamente posterior, o ora denunciado VALDIR CARNEIRO,
dolosamente, ciente da ilicitude e reprovabilidade de sua conduta, por
razões de condição do sexo feminino caracterizadas pela violência
doméstica e familiar contra a mulher, ameaçou de causar mal injusto e
grave à L.A.d.S., sua companheira, por palavras ao dizer que, caso a
ofendida acionasse a polícia e ele fosse preso, iria matá-la assim que saísse.
Assim agindo, o denunciado VALDIR CARNEIRO incidiu nos crimes
previstos no artigo 129, §13º (1º Fato – lesão corporal), e no artigo 147, §1º (2º
Fato – ameaça), na forma do artigo 69 (concurso material), todos do Código
Penal e c/c art. 5º e 7º, incisos I e II, da Lei Maria da Penha.
Diante do exposto, requer o Ministério Público seja a presente denúncia recebida e autuada,
citando-se o denunciado para apresentar resposta à acusação, prosseguindo-se nos
ulteriores termos até final condenação, com a fixação de valor mínimo para reparação
dos danos causados à vítima, nos termos do art. 387, inciso IV, do CPP, ouvindo-se as testemunhas abaixo arroladas.
Fazenda Rio Grande, 20 de setembro de 2026.
Promotor de Justiça`;

test("denúncia: fatos objetivos, datas herdadas e só os artigos da imputação", () => {
	const d = T.extrairDenuncia(DENUNCIA);
	assert.equal(d.fatos.length, 2);
	assert.deepEqual(d.fatos.map((f) => [f.n, f.crime, f.data]), [
		[1, "lesão corporal", "06/09/2026"],
		[2, "ameaça", "06/09/2026"],
	]);
	assert.deepEqual(d.denunciados, ["VALDIR CARNEIRO"]);
	assert.match(d.capitulacao, /^Assim agindo/);
	assert.ok(d.requerimentos.includes("o recebimento da denúncia"));
	assert.match(d.resumo, /^Denúncia oferecida contra VALDIR CARNEIRO\. Fato 1 – lesão corporal \(06\/09\/2026\): No dia 06 de setembro de 2026/);
	assert.match(d.resumo, /o denunciado VALDIR CARNEIRO ofendeu a integridade corporal/);
	// Sem fórmulas de estilo, endereço e lista de provas.
	assert.doesNotMatch(d.resumo, /dolosamente|ciente da ilicitude|sexo feminino|Travessa|boletim|mov\. 1/);
	assert.match(d.resumo, /Imputação: art\. 129, §13º, e art\. 147, §1º, na forma do art\. 69, todos do Código Penal e c\/c art\. 5º e 7º, incisos I e II, da Lei Maria da Penha\.$/);
	assert.doesNotMatch(d.resumo, /Requer|1º Fato –/);
	console.log(d.resumo);
});

test("remove o carimbo de assinatura digital do Projudi", () => {
	const carimbo = "Documento assinado digitalmente, conforme MP nº 2.200-2/2001, Lei nº 11.419/2006, resolução do Projudi, do TJPR/OE\nValidação deste em https://projudi.tjpr.jus.br/projudi/ - Identificador: PJ5GS H2PRA 7JJ39 EE84U\nPROJUDI - Processo: 0000002-92.2024.8.16.0038 - Ref. mov. 1.1 - Assinado digitalmente por Michel Teixeira de Carvalho:06728036903\n01/01/2024: JUNTADA DE PETIÇÃO DE INICIAL. Arq: Ofício";
	const texto = "FATO 01 – furto\nNo dia 02 de janeiro de 2024, o denunciado JOAO DA SILVA subtraiu\n" + carimbo + "\num celular da vítima.";
	const limpo = T.limparAssinaturas(texto);
	assert.doesNotMatch(limpo, /assinado|Identificador|PJ5GS|MP nº|11\.419|Arq:|Ref\. mov|TJPR\/OE/);
	assert.match(limpo, /subtraiu/);
	assert.match(limpo, /um celular da vítima/);
	// Como o pdf.js entrega (sem o CPF após o nome, datas em outra linha).
	const pdf = T.limparAssinaturas("contra a mulher\nDocumento assinado digitalmente, conforme MP nº 2.200-2/2001, Lei nº 11.419/2006, resolução do Projudi, do TJPR/OE\nValidação deste em https://projudi.tjpr.jus.br/projudi/ - Identificador: PJ5GS H2PRA 7JJ39 EE84U\nPROJUDI - Processo: 0000002-92.2024.8.16.0038 - Ref. mov. 1.1 - Assinado digitalmente por Michel Teixeira de Carvalho:\n01/01/2024: JUNTADA DE PETIÇÃO DE INICIAL. Arq: Ofício\nofendeu a vítima");
	assert.equal(pdf.replace(/\s+/g, " ").trim(), "contra a mulher ofendeu a vítima");
	// Também na versão em uma linha só (como às vezes sai do PDF).
	const umaLinha = T.limparAssinaturas("texto antes " + carimbo.replace(/\n/g, " ") + " texto depois");
	assert.doesNotMatch(umaLinha, /assinado|Identificador|Arq:/);
	assert.match(umaLinha, /texto antes/);
});

test("audiências: designada, redesignada, cancelada e pendente", () => {
	const agora = Date.UTC(2026, 8, 28);
	const movs = [
		{ seq: "3", dataHora: "25/09/2026 15:39:06", titulo: "AUDIÊNCIA DE CONCILIAÇÃO DESIGNADA", complemento: "Local JEC - Conciliações - 20/10/2026 13:20" },
		{ seq: "8", dataHora: "15/10/2026 10:00:00", titulo: "AUDIÊNCIA DE CONCILIAÇÃO REDESIGNADA", complemento: "para 27/11/2026 às 14h00" },
		{ seq: "9", dataHora: "16/10/2026 10:00:00", titulo: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO DESIGNADA", complemento: "03/12/2026 09:00" },
		{ seq: "10", dataHora: "20/10/2026 10:00:00", titulo: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO CANCELADA", complemento: "03/12/2026 09:00" },
		{ seq: "11", dataHora: "20/10/2026 11:00:00", titulo: "JUNTADA DE PETIÇÃO DE INICIAL", complemento: "" },
	];
	const a = T.analisarAudiencias(movs, agora);
	assert.deepEqual(a.eventos.map((e) => e.situacao), ["designada", "redesignada", "designada", "cancelada"]);
	assert.equal(a.contagem.redesignada, 1);
	assert.equal(a.contagem.cancelada, 1);
	assert.equal(a.pendentes.length, 1);
	assert.equal(a.pendentes[0].seq, "8");
	assert.equal(a.pendentes[0].dataAudiencia, "27/11/2026 14:00");
	assert.equal(a.pendentes[0].tipo, "Audiência de conciliação");
	assert.equal(T.analisarAudiencias([movs[4]], agora).eventos.length, 0);
	// Só o último evento de cada audiência: a designação de 20/11 (seq. 3)
	// foi substituída pela redesignação (seq. 8); a de 03/12 (seq. 9), pelo
	// cancelamento (seq. 10).
	assert.deepEqual(a.finais.map((e) => [e.seq, e.situacao]), [["8", "redesignada"], ["10", "cancelada"]]);
	// Designada com data passada e sem resultado registrado.
	const passada = T.analisarAudiencias([{ seq: "1", dataHora: "01/08/2026 10:00:00", titulo: "AUDIÊNCIA DE INSTRUÇÃO DESIGNADA", complemento: "10/09/2026 14:00" }], agora);
	assert.equal(passada.pendentes.length, 0);
	assert.equal(passada.finais[0].semResultado, true);
});

test("petição inicial: pega a seção DOS PEDIDOS até o fecho", () => {
	const txt = "EXCELENTÍSSIMO SENHOR JUIZ\nFULANA, vem propor AÇÃO...\nDOS FATOS\nA autora comprou passagem...\nDO DIREITO\nO CDC...\nDOS PEDIDOS\nAnte o exposto, requer:\na) a citação da ré;\nb) a condenação da ré ao pagamento de R$ 400,00 por danos materiais;\nc) a condenação em R$ 10.000,00 por danos morais.\nDá-se à causa o valor de R$ 10.400,00.\nNestes termos, pede deferimento.\nCapanema, 25 de setembro de 2026.";
	const trecho = T.extrairTrechoPedidos(txt, "inicial");
	assert.match(trecho, /danos morais/);
	assert.doesNotMatch(trecho, /pede deferimento/);
	assert.doesNotMatch(trecho, /DOS FATOS/);
});

test("sentença: dispositivo", () => {
	const txt = "SENTENÇA\nRelatório dispensado.\nFundamentação longa ".repeat(5) + "\nANTE O EXPOSTO, JULGO PROCEDENTE o pedido para condenar a ré ao pagamento de R$ 5.000,00.\nPublique-se.";
	const trecho = T.extrairTrechoPedidos(txt, "sentenca");
	assert.match(trecho, /^ANTE O EXPOSTO, JULGO PROCEDENTE/);
});

test("classificação dos movimentos", () => {
	const c = (s) => (T.classificarMovimento(s) || {}).tipo || null;
	assert.equal(c("Juntada de Petição Inicial"), "inicial");
	assert.equal(c("OFERECIDA A DENÚNCIA"), "denuncia");
	assert.equal(c("JUNTADA DE PETIÇÃO DE CONTESTAÇÃO"), "contestacao");
	assert.equal(c("Juntada de Petição de Resposta à Acusação"), "resposta");
	assert.equal(c("JULGADO PROCEDENTE O PEDIDO"), "sentenca");
	assert.equal(c("Juntada de Petição de Recurso Inominado"), "recurso");
	assert.equal(c("Expedida/certificada a intimação eletrônica - Sentença"), null);
	assert.equal(c("Recebido o recurso de apelação"), null);
	assert.equal(c("Juntada de Petição de cumprimento de sentença"), null);
	assert.equal(c("Audiência de conciliação designada"), null);
});

test("ordenação e frase do movimento", () => {
	const movs = T.ordenarMovimentos([
		{ seq: "2", dataHora: "28/09/2026 02:00:41", evento: "Disponibilizado no DJEN" },
		{ seq: "1", dataHora: "25/09/2026 15:39:05", evento: "Distribuído por sorteio" },
	]);
	assert.equal(movs[0].seq, "1");
	assert.equal(T.fraseMovimento(movs[0]), "em 25/09/2026 15:39:05, Distribuído por sorteio (seq. 1)");
});

test("classificação por aproximação (nomes reais do Projudi e erros de digitação)", () => {
	const c = (s) => (T.classificarMovimento(s) || {}).tipo || null;
	assert.equal(c("JUNTADA DE PETIÇÃO DE INICIAL"), "inicial");
	assert.equal(c("JUNTADA DE PETIÇÃO DE PETIÇAO INICAL"), "inicial");
	assert.equal(c("JUNTADA DE PETIÇÃO DE CONTESTAÇAO"), "contestacao");
	assert.equal(c("JUNTADA DE PETIÇÃO DE DENÚNCIA"), "denuncia");
	assert.equal(c("JUNTADA DE PETIÇÃO DE RAZÕES DE APELAÇÃO"), "recurso");
	assert.equal(c("JUNTADA DE PETIÇÃO DE EMENDA A INICIAL"), null);
	assert.equal(c("JUNTADA DE PETIÇÃO DE CONTRARRAZÕES"), null);
	assert.equal(c("RECEBIDA A DENÚNCIA"), null);
	assert.equal(c("EXTINTO O PROCESSO POR PAGAMENTO"), "sentenca");
});

test("intimações: referência ao evento e identificação", () => {
	assert.equal(T.referenciaEvento("Referente ao evento (seq. 45) JUNTADA DE PETIÇÃO"), "45");
	assert.equal(T.referenciaEvento("Refer. ao Evento: 5"), "5");
	assert.equal(T.referenciaEvento("referente à movimentação 12"), "12");
	assert.equal(T.referenciaEvento("Local JEC - Conciliações"), "");
	assert.ok(T.ehComunicacao("EXPEDIÇÃO DE INTIMAÇÃO"));
	assert.ok(T.ehComunicacao("LEITURA DE INTIMAÇÃO REALIZADA"));
	assert.ok(T.ehComunicacao("DECORRIDO PRAZO DE FULANO"));
	assert.ok(!T.ehComunicacao("JUNTADA DE PETIÇÃO DE INICIAL"));
});

test("denúncia com fato único, sem título FATO", () => {
	const d = T.extrairDenuncia("O MINISTÉRIO PÚBLICO vem oferecer DENÚNCIA em face de EZEQUIEL ROCHA LEAL, brasileiro, RG nº 80024193, pela prática do seguinte fato delituoso:\nNo dia 31 de dezembro de 2023, por volta das 23h, na residência situada na Rua das Flores, nº 50, nesta cidade, o denunciado EZEQUIEL ROCHA LEAL, dolosamente, ameaçou a vítima M.S.L., sua ex-companheira, de causar-lhe mal injusto e grave, conforme boletim de ocorrência (mov. 1.3).\nDessa forma, a vítima acionou a polícia.\nAssim agindo, o denunciado EZEQUIEL ROCHA LEAL incorreu nas sanções do artigo 147, caput, do Código Penal, com as implicações da Lei nº 11.340/2006.\nDiante do exposto, requer o recebimento da denúncia.");
	assert.equal(d.fatos.length, 1);
	assert.equal(d.fatos[0].unico, true);
	assert.equal(d.fatos[0].data, "31/12/2023");
	assert.doesNotMatch(d.fatos[0].texto, /RG nº|brasileiro|pela prática/);
	assert.match(d.fatos[0].texto, /Dessa forma, a vítima acionou a polícia\.$/);
	assert.match(d.capitulacao, /^Assim agindo/);
	assert.match(d.resumo, /Fato único \(31\/12\/2023\): No dia 31 de dezembro de 2023/);
	assert.match(d.resumo, /Imputação: art\. 147, caput, do Código Penal, com as implicações da Lei nº 11\.340\/2006\.$/);
	// "Consta dos autos que..." e imputação sem "razão pela qual".
	const b = T.extrairDenuncia("Consta dos inclusos autos de inquérito policial que, no dia 05/03/2024, na Rua Um, o denunciado JOÃO DA SILVA, com vontade livre e consciente, subtraiu um celular da vítima C.A.P.\nAo assim agir, o denunciado JOÃO DA SILVA incidiu no crime de furto, previsto no artigo 155, caput, do Código Penal, razão pela qual requer o recebimento desta denúncia.");
	assert.equal(b.fatos[0].crime, "furto");
	assert.match(b.resumo, /Fato único – furto \(05\/03\/2024\): No dia 05\/03\/2024, na Rua Um, o denunciado JOÃO DA SILVA subtraiu/);
	assert.match(b.resumo, /Imputação: art\. 155, caput, do Código Penal\.$/);
	// Fatos na íntegra (para a IA e para o botão "fatos na íntegra").
	assert.match(T.fatosIntegrais(d), /^Fato único \(31\/12\/2023\): No dia 31[\s\S]*conforme boletim de ocorrência \(mov\. 1\.3\)\./);
});

test("títulos por extenso: PRIMEIRO FATO / SEGUNDO FATO", () => {
	const d = T.extrairDenuncia("PRIMEIRO FATO – furto\nNo dia 02 de janeiro de 2024, o denunciado PEDRO SOUZA subtraiu uma bicicleta.\nSEGUNDO FATO – receptação\nEm data de 03 de janeiro de 2024, o denunciado PEDRO SOUZA adquiriu coisa produto de crime.\nAssim agindo, o denunciado PEDRO SOUZA incidiu nos crimes do artigo 155, caput (1º fato) e artigo 180, caput (2º fato), ambos do Código Penal.");
	assert.deepEqual(d.fatos.map((f) => [f.n, f.crime, f.data]), [[1, "furto", "02/01/2024"], [2, "receptação", "03/01/2024"]]);
});

const SENTENCA_CRIMINAL = `SENTENÇA
I - RELATÓRIO
O Ministério Público ofereceu denúncia em face de EZEQUIEL ROCHA LEAL e MARCOS ANTONIO SILVA, imputando-lhes o crime do art. 147 do Código Penal.
II - FUNDAMENTAÇÃO
A materialidade e a autoria restaram comprovadas quanto ao réu EZEQUIEL ROCHA LEAL. Quanto ao réu MARCOS ANTONIO SILVA, não há prova suficiente.
III - DISPOSITIVO
Ante o exposto, JULGO PARCIALMENTE PROCEDENTE a denúncia para:
a) ABSOLVER o réu MARCOS ANTONIO SILVA, com fundamento no art. 386, VII, do Código de Processo Penal;
b) CONDENAR o réu EZEQUIEL ROCHA LEAL, qualificado nos autos, como incurso nas sanções do art. 147 do Código Penal, c/c Lei 11.340/2006.
Passo à dosimetria da pena.
Na primeira fase, fixo a pena-base em 1 (um) mês de detenção. Na segunda fase, presente a agravante do art. 61, II, f, elevo a pena para 1 (um) mês e 5 (cinco) dias de detenção. Na terceira fase, ausentes causas de aumento ou diminuição, torno a pena definitiva em 1 (um) mês e 5 (cinco) dias de detenção.
Fixo o regime inicial aberto para cumprimento da pena, nos termos do art. 33, §2º, c, do CP.
Deixo de substituir a pena privativa de liberdade por restritivas de direitos, por se tratar de crime cometido com grave ameaça (art. 44, I, do CP).
Presentes os requisitos do art. 77 do CP, concedo a suspensão condicional da pena pelo prazo de 2 (dois) anos, mediante as condições do art. 78, §2º, do CP.
Com fundamento no art. 387, IV, do CPP, fixo o valor mínimo de R$ 1.000,00 (mil reais) para reparação dos danos morais causados à vítima.
Condeno o Estado do Paraná ao pagamento de honorários advocatícios ao advogado dativo nomeado, Dr. João Pereira da Costa, OAB/PR nº 45.678, que fixo em R$ 1.200,00, nos termos do item 2.4 da tabela da Resolução Conjunta PGE/SEFA nº 15/2019.
Publique-se. Registre-se. Intimem-se.
Almirante Tamandaré, 10 de maio de 2024.`;

test("sentença criminal: absolvidos, condenados, pena, suspensão, indenização e dativo", () => {
	const r = T.extrairSentencaCriminal(SENTENCA_CRIMINAL);
	assert.deepEqual(r.absolvidos, ["MARCOS ANTONIO SILVA"]);
	assert.equal(r.condenacoes.length, 1);
	assert.equal(r.condenacoes[0].nome, "EZEQUIEL ROCHA LEAL");
	assert.equal(r.condenacoes[0].pena, "1 (um) mês e 5 (cinco) dias de detenção");
	assert.equal(r.condenacoes[0].regime, "aberto");
	assert.equal(r.substituicao, ""); // negada -> não aparece
	assert.match(r.suspensao, /^Concedo a suspensão condicional da pena pelo prazo de 2 \(dois\) anos/);
	assert.equal(r.indenizacao, "R$ 1.000,00, a título de danos morais");
	assert.deepEqual(r.honorarios, [{ nome: "João Pereira da Costa", oab: "OAB/PR nº 45.678", valor: "R$ 1.200,00", item: "2.4" }]);
	assert.doesNotMatch(r.resumo, /Substituição|Negad/);
	assert.match(r.resumo, /Honorários ao advogado dativo João Pereira da Costa \(OAB\/PR nº 45\.678\): R\$ 1\.200,00, item 2\.4 da tabela\./);
});

test("sentença criminal: substituição concedida, multa, e itens ausentes omitidos", () => {
	const r = T.extrairSentencaCriminal("Ante o exposto, JULGO PROCEDENTE a denúncia para CONDENAR a ré MARIA DE SOUZA como incursa no art. 155 do CP. Torno definitiva a pena em 1 (um) ano de reclusão e 10 (dez) dias-multa. Fixo o regime inicial aberto. Presentes os requisitos do art. 44 do CP, substituo a pena privativa de liberdade por uma pena restritiva de direitos, consistente em prestação de serviços à comunidade. Publique-se.");
	assert.deepEqual(r.absolvidos, []);
	assert.equal(r.condenacoes[0].nome, "MARIA DE SOUZA");
	assert.equal(r.condenacoes[0].pena, "1 (um) ano de reclusão");
	assert.equal(r.condenacoes[0].multa, "10 (dez) dias-multa");
	assert.match(r.substituicao, /^Substituo a pena privativa de liberdade por uma pena restritiva de direitos/);
	assert.equal(r.suspensao, "");
	assert.equal(r.indenizacao, "");
	assert.deepEqual(r.honorarios, []);
	assert.doesNotMatch(r.resumo, /Absolvid|Suspensão|Indenização|Honorários/);
});

test("processo criminal pela classe ou pela denúncia", () => {
	assert.ok(T.ehProcessoCriminal("Ação Penal - Procedimento Ordinário", []));
	assert.ok(T.ehProcessoCriminal("", [{ titulo: "JUNTADA DE DENÚNCIA" }]));
	assert.ok(!T.ehProcessoCriminal("Procedimento do Juizado Especial Cível", [{ titulo: "JUNTADA DE PETIÇÃO DE INICIAL" }]));
});

test("advogado e classe no formato da aba Partes", () => {
	assert.equal(T.formatarAdvogado("OAB 116785N-PR - DANIELLE DAS NEVES"), "DANIELLE DAS NEVES (OAB 116785N-PR)");
	assert.equal(T.semCodigo("12247 - Execução Extrajudicial de Alimentos"), "Execução Extrajudicial de Alimentos");
});

test("linguagem simples: modelo fixo", () => {
	const L = require("../src/certidaoSimples.js");
	assert.equal(L.dataExtenso("01/01/2024 10:00"), "1º de janeiro de 2024");
	assert.equal(L.horaExtenso("27/11/2026 14:00"), "às 14h");
	assert.equal(L.nomeProprio("DAVI DE BARROS representado(a) por JOSIANE DA SILVA"), "Davi de Barros representado(a) por Josiane da Silva");
	assert.equal(L.iniciais("MARIA DA SILVA SANTOS"), "M. S. S.");
	const d = {
		numero: "0000002-92.2024.8.16.0038", classe: "Ação Penal - Procedimento Ordinário", criminal: true, assuntos: ["12194 - Contra a Mulher"],
		polos: [{ titulo: "Réu", partes: [{ nome: "EZEQUIEL ROCHA LEAL", advogados: ["JOÃO DA COSTA (OAB 45678N-PR)"] }] }, { titulo: "Vítima", partes: [{ nome: "MARIA DA SILVA" }] }],
		movimentos: [
			{ seq: "1", dataHora: "01/01/2024 10:00:00", titulo: "DISTRIBUÍDO POR SORTEIO" },
			{ seq: "5", dataHora: "10/01/2024 09:00:00", titulo: "JUNTADA DE DENÚNCIA" },
			{ seq: "9", dataHora: "01/09/2026 10:00:00", titulo: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO DESIGNADA", complemento: "27/11/2026 14:00" },
		],
	};
	const b = L.gerarLinguagemSimples(d, { sentencaCriminal: T.extrairSentencaCriminal(SENTENCA_CRIMINAL), textoCertidao: "denúncia audiência regime aberto", agora: Date.UTC(2026, 8, 29) });
	const texto = L.blocosEmTexto(b);
	assert.match(texto, /É um processo criminal/);
	assert.match(texto, /Ezequiel Rocha Leal \(réu\) é a pessoa acusada/);
	assert.match(texto, /M\. S\. \(vítima\) é a pessoa que sofreu o crime/); // vítima só pelas iniciais
	assert.doesNotMatch(texto, /MARIA|Maria da Silva/);
	assert.match(texto, /A acusação \(denúncia\) foi apresentada ao juiz em 10 de janeiro de 2024/);
	assert.match(texto, /Há uma audiência de instrução e julgamento marcada para 27 de novembro de 2026, às 14h/);
	assert.match(texto, /foi condenado\(a\) a 1 mês e 5 dias de detenção/);
	assert.match(texto, /• Denúncia: /);
	assert.match(texto, /Importante\nEste resumo explica/);
});

test("sentença criminal: substituição/suspensão negadas ou incabíveis não aparecem", () => {
	const casos = [
		"Ante o exposto, JULGO PROCEDENTE a denúncia para CONDENAR o réu LUIS RICARDO XAVIER como incurso no art. 157, § 2º, II, do CP. Torno a pena definitiva em 08 (oito) anos e 02 (dois) meses de reclusão e 700 (setecentos) dias-multa. Fixo o regime inicial fechado. Incabível a substituição da pena privativa de liberdade por restritivas de direitos, uma vez que a pena aplicada supera 4 anos (art. 44, I, do CP). Pelo mesmo motivo, não se aplica a suspensão condicional da pena (art. 77 do CP). Publique-se.",
		"CONDENO o réu JOSE DA SILVA à pena de 2 (dois) anos de reclusão, em regime aberto. Não é possível substituir a pena privativa de liberdade por restritiva de direitos, pois o crime foi cometido com violência. Ausentes os requisitos, não se concede a suspensão condicional da pena. Publique-se.",
		// Só cita os institutos, sem decidir.
		"CONDENO a ré ANA DE SOUZA a 6 (seis) anos de reclusão, em regime semiaberto. O art. 44 do CP prevê a substituição por penas restritivas de direitos quando a pena não supera 4 anos. Publique-se.",
	];
	casos.forEach((c) => {
		const r = T.extrairSentencaCriminal(c);
		assert.equal(r.substituicao, "", c.slice(0, 60));
		assert.equal(r.suspensao, "", c.slice(0, 60));
		assert.doesNotMatch(r.resumo, /Substituição|Suspensão/);
	});
	const r = T.extrairSentencaCriminal(casos[0]);
	assert.equal(r.condenacoes[0].nome, "LUIS RICARDO XAVIER");
	assert.equal(r.condenacoes[0].regime, "fechado");
	assert.ok(T.penaEmAnos(r.condenacoes[0].pena) > 8);
});
