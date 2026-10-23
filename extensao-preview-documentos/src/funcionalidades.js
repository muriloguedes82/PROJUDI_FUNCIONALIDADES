// Catálogo das funcionalidades que o usuário pode ativar/desativar no Menu
// da extensão (ícone fixo no Projudi/SEEU - ver src/menuExtensao.js).
//
// Carregado pelo service worker (importScripts em termosUso.js), que só
// registra os arquivos das funcionalidades ativas, e pelo próprio Menu, que
// monta a lista de chaves a partir daqui. Desativar uma funcionalidade,
// portanto, simplesmente deixa de injetar os scripts/estilos dela nas
// próximas páginas carregadas - nenhum script precisa conferir a preferência.
//
// `requer`: funcionalidades que precisam estar ativas para esta funcionar
// (ex.: os atalhos que abrem telas no popup das Ações rápidas). O Menu ativa
// as exigidas junto e desativa as dependentes em cascata.
//
// Preferência por sistema: cada funcionalidade pode ficar ativa ou desativada
// separadamente no Projudi e no SEEU (abas do Menu). O sistema é reconhecido
// pelo endereço da página (seeu.pje.jus.br e o treino seeutreino.pje.jus.br = SEEU; demais hosts do Tribunal =
// Projudi). Por padrão, tudo vem ativo nos dois.
//
// `sistemas` (opcional): funcionalidade exclusiva desses sistemas. Nos
// demais, os arquivos dela nunca são injetados e ela não aparece no Menu.
//
// `partes` (opcional): pedaços de uma funcionalidade que podem ser escondidos
// um a um, sem desligar a funcionalidade inteira (ex.: cada botão das Ações
// rápidas, ou o "Enviar por WhatsApp" sem tirar a pré-visualização). Cada
// parte tem `id`, `nome`, `ocultar` (seletores CSS dos botões/elementos que
// somem) e, se for o caso, `sistemas`. Ao contrário das funcionalidades, as
// partes valem na hora: src/partesFuncionalidades.js (sempre carregado)
// mantém na página um estilo que esconde os seletores das partes
// desativadas e o refaz quando a escolha muda no Menu. A escolha fica em
// `chavePartes`, por sistema, como "idDaFuncionalidade.idDaParte".
//
// Os arquivos que não aparecem aqui (hostGuard.js, uiVisibility.js,
// painelPreferencias.js/.css, clipboardProcess.js, documentSelection.js, buttonDrag.js,
// partesFuncionalidades.js e o próprio Menu) são infraestrutura e são sempre carregados.
self.PDP_FUNCIONALIDADES = Object.freeze({
	// { projudi: [id], seeu: [id] } em chrome.storage.local
	chave: "pdpFuncionalidadesDesativadasPorSistema",
	// Chave antiga (uma só lista para os dois sistemas): usada enquanto a nova
	// não existe, para não perder a escolha de quem já desativou algo.
	chaveAntiga: "pdpFuncionalidadesDesativadas",
	// { projudi: true|false, seeu: true|false } em chrome.storage.local:
	// true = extensão desligada naquele sistema (chave geral do Menu).
	chaveExtensao: "pdpExtensaoDesligadaPorSistema",
	// { projudi: ["item.parte"], seeu: [...] } em chrome.storage.local:
	// partes escondidas (ver `partes` acima).
	chavePartes: "pdpPartesDesativadasPorSistema",
	sistemas: [
		{ id: "projudi", nome: "PROJUDI" },
		{ id: "seeu", nome: "SEEU" }
	],
	grupos: [
		{
			nome: "Documentos e movimentações",
			itens: [
				{
					id: "preview",
					nome: "Pré-visualização e WhatsApp",
					descricao: "Íntegra do documento ao passar o mouse e envio de arquivos por WhatsApp Web.",
					js: ["src/content.js"],
					css: ["src/content.css"],
					partes: [
						{ id: "whatsapp", nome: "Botão \"Enviar por WhatsApp\"", ocultar: ["#pdp-wa-launcher"] }
					]
				},
				{
					id: "email",
					nome: "Envio por e-mail (Outlook)",
					descricao: "Botão \"✉️ Enviar por e-mail\" com destinatários e remetentes salvos.",
					js: ["src/email.js"],
					css: ["src/email.css"]
				},
				{
					id: "destaque",
					nome: "Destaque de movimentações",
					descricao: "Cores por tipo de usuário (Magistrado, MP, Advogado) na aba Movimentações.",
					js: ["src/movementHighlight.js"],
					css: ["src/movementHighlight.css"]
				},
				{
					id: "expandir",
					nome: "Expandir anexos / ocultar sem arquivo",
					descricao: "Expande os anexos e oculta movimentações sem arquivo.",
					js: ["src/expandMovements.js"],
					partes: [
						{ id: "expandir", nome: "Botão \"Expandir/Recolher\" movimentações", ocultar: ["#pdp-expand-movements"] },
						{ id: "semArquivo", nome: "Botão \"Apenas com arquivo (+)\"", ocultar: ["#pdp-hide-no-file-movements"] }
					]
				}
			]
		},
		{
			nome: "Ações rápidas e atalhos",
			itens: [
				{
					id: "acoesRapidas",
					nome: "Ações rápidas e Minhas Preferências",
					descricao: "Botões do painel \"Ações\", preferências salvas e combos. A ordem dos botões da barra pode ser mudada arrastando (fica salva).",
					js: ["src/quickActions.js", "src/ordemBotoesAcoes.js"],
					css: ["src/quickActions.css"],
					partes: [
						{ id: "concluso", nome: "Botão \"Concluso\"", ocultar: ["#pdp-qa-row [data-group-id=\"concluso\"]"] },
						{ id: "remessa", nome: "Botão \"Remessa\"", ocultar: ["#pdp-qa-row [data-group-id=\"remessa\"]"] },
						{ id: "ordenacoes", nome: "Botão \"Ordenações\"", ocultar: ["#pdp-qa-row [data-group-id=\"ordenacoes\"]"] },
						{ id: "partes", nome: "Botão \"Int. Partes\" (intimar, notificar, citar)", ocultar: ["#pdp-qa-row [data-group-id=\"partes\"]"] },
						{ id: "outras", nome: "Botão \"Outras\" (inclui Suspender, Transitar e Arquivar)", ocultar: ["#pdp-qa-row [data-group-id=\"outras\"]"] },
						{ id: "favoritas", nome: "Botão \"⭐ Minhas Preferências\"", ocultar: ["#pdp-fav-prefs-button"] },
						{ id: "combos", nome: "Botão \"Combos\"", ocultar: ["#pdp-qa-row [data-panel-id=\"combos\"]"] },
						{ id: "destacar", nome: "Botão \"Destacar mov.\"", ocultar: ["#pdp-qa-row [data-pdp-parte=\"destacar\"]"] },
						{ id: "colar", nome: "Botão \"Colar processo\"", ocultar: ["#pdp-clipboard-button"], sistemas: ["projudi"] }
					]
				},
				{
					id: "movimentoBase",
					nome: "Escolher a movimentação das Ações rápidas",
					descricao: "Caixinha ao lado de cada evento da aba Movimentações para as ações, preferências e combos partirem dele.",
					js: ["src/movimentoBase.js"],
					css: ["src/movimentoBase.css"],
					requer: ["acoesRapidas"]
				},
				{
					id: "habilitarAdvogado",
					nome: "(Des)Habilitar Advogado",
					descricao: "Tela de advogados do processo num popup, com preferências de listas de advogados. No SEEU, a preferência grava um advogado, a Atuação, as partes e o Salvar.",
					js: ["src/habilitarAdvogado.js"],
					requer: ["acoesRapidas"]
				},
				{
					id: "editarPartes",
					nome: "Editar Partes/Outros",
					descricao: "Tela \"Partes do Processo\" num popup.",
					js: ["src/editarPartes.js"],
					requer: ["acoesRapidas", "habilitarAdvogado"]
				},
				{
					id: "alterarClasseAssuntos",
					nome: "Alterar Classe/Assuntos",
					descricao: "Balão \"✏️ Alterar\" ao lado da classe processual e do assunto principal, no cabeçalho do processo, que abre a tela de alteração num popup, e ⭐ com preferências que fazem a alteração (classe, assunto principal ou inclusão de assunto secundário) e salvam com um clique, e ✖ ao lado de cada assunto secundário do cabeçalho para removê-lo e salvar.",
					js: ["src/alterarClasseAssuntos.js"],
					requer: ["acoesRapidas", "habilitarAdvogado"],
					sistemas: ["projudi"]
				},
				{
					id: "alterarValorCausa",
					nome: "Novo Valor da Causa",
					descricao: "Linha \"Valor da Causa\" no cabeçalho do processo, com o balão \"💲 Novo Valor da Causa\": informe o novo valor e a extensão altera e salva no processo, sem abrir a tela de alteração.",
					js: ["src/alterarValorCausa.js"],
					requer: ["habilitarAdvogado"],
					sistemas: ["projudi"]
				},
				{
					id: "alterarPrioridades",
					nome: "Prioridades",
					descricao: "Na linha \"Prioridade\" do cabeçalho do processo: ✖ ao lado de cada prioridade para removê-la e salvar, \"➕ Incluir\", que abre a Seleção de Prioridade num popup e salva depois do \"Selecionar\", e ⭐ com preferências que incluem/removem prioridades e salvam com um clique.",
					js: ["src/alterarPrioridades.js"],
					requer: ["acoesRapidas", "habilitarAdvogado"],
					sistemas: ["projudi"]
				},
				{
					id: "alvara",
					nome: "Alvará Eletrônico",
					descricao: "Cadastro de alvará eletrônico pelo painel de Ações rápidas.",
					js: ["src/alvaraEletronico.js"],
					requer: ["acoesRapidas", "habilitarAdvogado"]
				},
				{
					id: "juntarDocumento",
					nome: "Juntar Documento",
					descricao: "Juntada de documento digitado com preferências gravadas. No SEEU, vale para as preferências do Analisar Decurso.",
					js: ["src/juntarDocumento.js"],
					css: ["src/juntarDocumento.css"],
					requer: ["acoesRapidas"]
				},
				{
					id: "localizador",
					nome: "Localizador (SEEU)",
					descricao: "Botão \"📍 Localizador\" na linha do \"⭐ Minhas Preferências\", com preferências que associam localizadores com um clique.",
					js: ["src/localizadorSeeu.js"],
					css: ["src/localizadorSeeu.css"],
					requer: ["acoesRapidas"],
					sistemas: ["seeu"]
				},
				{
					id: "oraculo",
					nome: "Oráculo",
					descricao: "Atalho para a consulta de antecedentes da parte.",
					js: ["src/oraculoDirect.js", "src/oraculo.js"]
				},
				{
					id: "sistemasCnj",
					nome: "Sistemas do CNJ",
					descricao: "Cards com o nome de cada sistema, ao lado da balança do Menu, que abrem SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud, SEEU, Sistema Uniformizado (TJPR) e, no card \"Outros\", COPEL, FUPEN, SANEPAR e SESP Intranet, num popup sobre a tela do processo (ordem alfabética por padrão; os cards podem ser reorganizados arrastando).",
					js: ["src/sistemasCnjLista.js", "src/sistemasCnj.js"]
				},
				{
					id: "novaRemessa",
					nome: "Nova Remessa",
					descricao: "Realizar mais de uma remessa em seguida.",
					js: ["src/remessaMultipla.js"],
					css: ["src/remessaMultipla.css"]
				},
				{
					id: "novaOrdenacao",
					nome: "Nova Ordenação",
					descricao: "Ordenar vários cumprimentos em seguida.",
					js: ["src/ordenarCumprimentos.js"],
					css: ["src/ordenarCumprimentos.css"]
				}
			]
		},
		{
			nome: "Informações do processo",
			itens: [
				{ id: "anotacoes", nome: "Bloco de anotações", descricao: "Post-it móvel: rascunhos pessoais no navegador e envio explícito do texto para o lembrete ativo do Projudi.", js: ["src/blocoAnotacoes.js"], css: ["src/blocoAnotacoes.css"] },
				{
					id: "reus",
					nome: "Réus no cabeçalho",
					descricao: "Réus/Indiciados/Noticiados, com RG e CPF, no cabeçalho do processo.",
					js: ["src/reusCabecalho.js"],
					css: ["src/reusCabecalho.css"]
				},
				{
					id: "sequencial",
					nome: "Sequencial do processo principal",
					descricao: "Mostra o Sequencial do processo principal nos apensos.",
					js: ["src/sequencialProcessoPrincipal.js"]
				},
				{
					id: "suspensao",
					nome: "Indicador de suspensão ativa",
					descricao: "Card ao lado do número do processo com suspensões ativas.",
					js: ["src/suspensaoAtiva.js"]
				},
				{
					id: "monitoracao",
					nome: "Indicador de monitoração eletrônica",
					descricao: "Card ao lado do número do processo com monitoração ativa.",
					js: ["src/monitoracaoAtiva.js"]
				}
			]
		},
		{
			nome: "Pendências, mesa e listas",
			itens: [
				{
					id: "dispensarJuntadas",
					nome: "Dispensar juntadas, decursos e cumprimentos",
					descricao: "Botões de dispensa em segundo plano no quadro Pendências.",
					js: ["src/juntadaDrag.js", "src/dispensarCumprimentos.js"],
					css: ["src/juntadaDrag.css"],
					partes: [
						{ id: "juntadas", nome: "Botão \"Dispensar juntadas\"", ocultar: [".pdp-dispensar-juntadas:not([data-pdp-parte=\"decursos\"])"] },
						{ id: "decursos", nome: "Botão \"Dispensar decursos\"", ocultar: [".pdp-dispensar-juntadas[data-pdp-parte=\"decursos\"]"] },
						{ id: "cumprimentos", nome: "Botão \"Dispensar pendências\" (cumprimentos para expedir)", ocultar: [".pdp-dispensar-cumprimentos"] }
					]
				},
				{
					id: "finalizarConclusao",
					nome: "Finalizar conclusão pendente",
					descricao: "Finaliza a conclusão direto do quadro Pendências.",
					js: ["src/finalizarConclusao.js"]
				},
				{
					id: "contadores",
					nome: "Ocultar contadores zerados",
					descricao: "Esconde, na Mesa do Analista/Escrivão, os itens com total zero.",
					js: ["src/mesaAnalistaContadores.js"]
				},
				{
					id: "decursoSequencial",
					nome: "Filtro por Sequencial no Decurso de Prazo",
					descricao: "Campo \"Sequencial\" na Análise de Decurso de Prazo.",
					js: ["src/decursoPrazoSequencial.js"]
				},
				{
					id: "previewProcesso",
					nome: "Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões e nos Cumprimentos, no Expedir e nos Paralisados",
					descricao: "Nas listas de decurso de prazo (Intimação, Auxiliares da Justiça e Citações/Notificações) na lista da Análise de Juntadas, na lista de Conclusões e nas listas de cumprimentos (Demais Cumprimentos e Mandados) no Expedir Intimações/Citação e na lista de Processos Paralisados, mostra a tela do processo, na aba Movimentações, ao pousar o mouse sobre o número. No SEEU, também nas listas de Execuções e de Processos Suspensos e no Painel de Incidentes.",
					js: ["src/previewProcesso.js"],
					css: ["src/previewProcesso.css"]
				},
				{
					id: "decursoNaLinha",
					nome: "Analisar e Dispensar decurso na lista",
					descricao: "Nas listas de decurso de prazo, botões \"Analisar Decurso\" e \"Dispensar\" em cada linha, abaixo do sequencial, sem abrir a intimação.",
					js: ["src/decursoNaLinha.js"],
					css: ["src/decursoNaLinha.css"]
				},
				{
					id: "previewConclusao",
					nome: "Documento do Juiz ao passar o mouse no Retorno de Conclusão",
					descricao: "Na lista Retorno de Conclusão, mostra o despacho/decisão/sentença (uma janela por arquivo) ao pousar o mouse sobre o \"Analisar\".",
					js: ["src/previewConclusao.js"],
					css: ["src/previewConclusao.css"]
				},
				{
					id: "listaTarefas",
					nome: "Listas de tarefas",
					descricao: "Bolinhas coloridas e tarefas escritas nas telas de análise e de cumprimentos.",
					js: ["src/listaTarefas.js"],
					css: ["src/listaTarefas.css"]
				},
				{
					id: "preferenciasNaLinha",
					nome: "Minhas Preferências na linha (⭐)",
					descricao: "Aplica preferências e combos direto na linha do processo, ou em lote nos processos marcados (no SEEU, as do \"📍 Localizador\" e, nas listas de decurso, o Analisar Decurso e o Dispensar nos marcados). Em Demais Cumprimentos, Mandados, Expedir Intimações e Expedir Citação, também as preferências do Analisar (Pré-Análise), que podem anexar os documentos de um movimento padrão.",
					js: ["src/preferenciasNaLinha.js"],
					requer: ["listaTarefas", "acoesRapidas"]
				},
				{
					id: "localizadorNaLista",
					nome: "Localizador na lista (SEEU)",
					descricao: "Nas listas Análise de Juntadas e Retorno de Conclusão do SEEU, mostra os localizadores do processo na coluna do número, com ✏️ para associar ou tirar localizadores sem sair da lista.",
					js: ["src/localizadorNaLista.js"],
					css: ["src/localizadorNaLista.css"],
					requer: ["localizador"],
					sistemas: ["seeu"]
				}
			]
		},
		{
			nome: "Cumprimentos",
			itens: [
				{
					id: "cpfPartes",
					nome: "RG e CPF nos cumprimentos",
					descricao: "RG e CPF das partes nas telas de cumprimentos (no SEEU, os do Sentenciado, lidos do cabeçalho do processo).",
					js: ["src/cpfPartesCumprimentos.js"],
					css: ["src/cpfPartesCumprimentos.css"]
				},
				{
					id: "bnmp",
					nome: "Informações nas ordenações BNMP",
					descricao: "Dados processuais nas ordenações BNMP que não são guias.",
					js: ["src/bnmpMandadoPrisao.js"],
					css: ["src/bnmpMandadoPrisao.css"]
				},
				{
					id: "enderecoMandado",
					nome: "Endereço da parte e Mandado Regionalizado",
					descricao: "Endereço da parte ao ordenar e Mandado Regionalizado automático.",
					js: ["src/enderecoMandado.js"],
					css: ["src/enderecoMandado.css"]
				}
			]
		}
	]
});

// Arquivos (js e css) que ficam de fora com a lista de ids desativados,
// já incluídas as funcionalidades que dependem de alguma desativada. Com
// `sistema`, ficam de fora também as exclusivas de outro sistema.
self.pdpArquivosDesativados = function (desativadas, sistema) {
	const itens = self.PDP_FUNCIONALIDADES.grupos.flatMap(function (g) { return g.itens; });
	const fora = new Set(Array.isArray(desativadas) ? desativadas : []);
	let mudou = true;
	while (mudou) {
		mudou = false;
		itens.forEach(function (item) {
			if (!fora.has(item.id) && (item.requer || []).some(function (id) { return fora.has(id); })) {
				fora.add(item.id);
				mudou = true;
			}
		});
	}
	const arquivos = new Set();
	itens.forEach(function (item) {
		if (!fora.has(item.id) && !(sistema && item.sistemas && item.sistemas.indexOf(sistema) < 0)) return;
		(item.js || []).concat(item.css || []).forEach(function (arq) { arquivos.add(arq); });
	});
	return arquivos;
};

// Sistema ("projudi" ou "seeu") a que pertence um endereço/host.
self.pdpSistemaDoHost = function (endereco) {
	let host = String(endereco || "");
	try { host = new URL(host).hostname; } catch (e) { /* já é um host */ }
	return /(^|\.)seeu(treino)?\.pje\.jus\.br$/i.test(host) ? "seeu" : "projudi";
};

// Lista de ids desativados de um sistema, a partir do que está em
// chrome.storage.local (`dados` = resultado de get com as duas chaves).
self.pdpDesativadasDoSistema = function (dados, sistema) {
	const cat = self.PDP_FUNCIONALIDADES;
	dados = dados || {};
	const porSistema = dados[cat.chave];
	const lista = porSistema && typeof porSistema === "object" && !Array.isArray(porSistema)
		? porSistema[sistema]
		: dados[cat.chaveAntiga];
	return Array.isArray(lista) ? lista : [];
};

// A extensão está desligada (chave geral do Menu) neste sistema? Desligada,
// só o Menu continua carregado, para poder religá-la.
self.pdpExtensaoDesligada = function (dados, sistema) {
	const porSistema = (dados || {})[self.PDP_FUNCIONALIDADES.chaveExtensao];
	return !!(porSistema && typeof porSistema === "object" && porSistema[sistema] === true);
};

// Partes escondidas de um sistema ("item.parte"), a partir do que está em
// chrome.storage.local (`dados` = resultado de get com `chavePartes`).
self.pdpPartesDesativadasDoSistema = function (dados, sistema) {
	const porSistema = (dados || {})[self.PDP_FUNCIONALIDADES.chavePartes];
	const lista = porSistema && typeof porSistema === "object" ? porSistema[sistema] : null;
	return Array.isArray(lista) ? lista : [];
};

// Seletores CSS a esconder para a lista de partes desativadas, no sistema.
self.pdpSeletoresPartesOcultas = function (partesDesativadas, sistema) {
	const fora = new Set(Array.isArray(partesDesativadas) ? partesDesativadas : []);
	const seletores = [];
	self.PDP_FUNCIONALIDADES.grupos.forEach(function (g) {
		g.itens.forEach(function (item) {
			(item.partes || []).forEach(function (parte) {
				if (!fora.has(item.id + "." + parte.id)) return;
				if (sistema && parte.sistemas && parte.sistemas.indexOf(sistema) < 0) return;
				seletores.push.apply(seletores, parte.ocultar || []);
			});
		});
	});
	return seletores;
};
