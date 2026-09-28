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

test("advogado e classe no formato da aba Partes", () => {
	assert.equal(T.formatarAdvogado("OAB 116785N-PR - DANIELLE DAS NEVES"), "DANIELLE DAS NEVES (OAB 116785N-PR)");
	assert.equal(T.semCodigo("12247 - Execução Extrajudicial de Alimentos"), "Execução Extrajudicial de Alimentos");
});
