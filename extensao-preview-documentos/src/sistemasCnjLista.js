// Sistemas do CNJ com ícone ao lado da balança do Menu (ver sistemasCnj.js).
//
// Carregado pela página (antes de sistemasCnj.js) e pelo service worker
// (background.js), que só abre em nova aba/segundo monitor os endereços
// desta lista. Ordem padrão: do mais próximo da balança para a esquerda (o
// usuário pode reordenar arrastando; a ordem dele fica em
// "pdpSistemasCnjOrdem", no chrome.storage.local). A ordem da lista abaixo
// não importa: o padrão é a ordem ALFABÉTICA do `nome` (ver sistemasCnj.js).
//
// `outros`: true = no Projudi começa guardado no card "Outros" (o usuário
// pode trazê-lo para a fila arrastando).
// `orgao`: quem mantém o sistema, no título do popup e na dica (padrão: CNJ).
// `seeu`: true = o ícone também aparece no SEEU (os demais, só no Projudi).
// `cor`: fundo (dois tons pastel), borda e texto do card - uma cor por
// sistema; nenhuma repete o dourado da balança.
// `rotulo`: nome oficial curto escrito no card (o nome completo fica na dica).
self.PDP_SISTEMAS_CNJ = Object.freeze([
	{
		id: "serpjud",
		rotulo: "SerpJud",
		nome: "SerpJud",
		titulo: "SERP-JUD — Sistema Eletrônico dos Registros Públicos",
		url: "https://serp.registros.org.br/?login-callback=true",
		cor: { claro: "#d4f7f1", escuro: "#8fdccf", borda: "#2a8c7f", texto: "#0f5e55" }
	},
	{
		id: "cniep",
		rotulo: "CNIEP",
		nome: "CNIEP",
		titulo: "CNIEP — Cadastro Nacional de Inspeções em Estabelecimentos Penais",
		url: "https://cniep.cnj.jus.br/dashboard",
		cor: { claro: "#ece6fd", escuro: "#cbbcf4", borda: "#7a62c7", texto: "#4a3596" }
	},
	{
		id: "bnmp",
		rotulo: "BNMP",
		nome: "BNMP 3.0",
		titulo: "BNMP 3.0 — Banco Nacional de Medidas Penais e Prisões",
		url: "https://bnmp.pdpj.jus.br/pagina-inicial",
		seeu: true,
		cor: { claro: "#e3e6fb", escuro: "#bcc3f2", borda: "#5b67c7", texto: "#2e3a8f" }
	},
	{
		id: "prevjud",
		rotulo: "PrevJud",
		nome: "PrevJud",
		titulo: "PrevJud — Previdenciário (PDPJ)",
		url: "https://previdenciario.pdpj.jus.br/dashboard",
		cor: { claro: "#ffeadb", escuro: "#fcc9a3", borda: "#d98a4c", texto: "#8a4a17" }
	},
	{
		id: "sisbajud",
		rotulo: "Sisbajud",
		nome: "Sisbajud",
		titulo: "Sisbajud — Sistema de Busca de Ativos do Poder Judiciário",
		url: "https://sisbajud.cnj.jus.br/minuta",
		cor: { claro: "#e6f6da", escuro: "#bfe3a3", borda: "#6fa64a", texto: "#3e6b22" }
	},
	{
		id: "sngb",
		rotulo: "SNGB",
		nome: "SNGB",
		titulo: "SNGB — Sistema Nacional de Gestão de Bens",
		url: "https://sngb.pdpj.jus.br/home",
		cor: { claro: "#fde4ee", escuro: "#f5bcd2", borda: "#c96088", texto: "#8a2f55" }
	},
	{
		id: "sniper",
		rotulo: "Sniper",
		nome: "Sniper",
		titulo: "Sniper — Sistema Nacional de Investigação Patrimonial e Recuperação de Ativos",
		url: "https://sniper.pdpj.jus.br/",
		cor: { claro: "#e0eefc", escuro: "#b3d3f3", borda: "#4f8fcf", texto: "#1f5591" }
	},
	{
		id: "infojud",
		rotulo: "Infojud",
		nome: "Infojud",
		orgao: "Receita Federal",
		titulo: "Infojud — Informações ao Judiciário (Receita Federal, e-CAC)",
		url: "https://cav.receita.fazenda.gov.br/ecac/Aplicacao.aspx?id=5032&origem=menu",
		cor: { claro: "#ffe3e1", escuro: "#f6b3ad", borda: "#d0605a", texto: "#8f2a24" }
	},
	{
		id: "renajud",
		rotulo: "Renajud",
		nome: "Renajud",
		titulo: "Renajud — Restrições Judiciais sobre Veículos Automotores",
		url: "https://renajud.pdpj.jus.br/",
		cor: { claro: "#f7e4f8", escuro: "#e3b9e7", borda: "#a556ad", texto: "#6b2373" }
	},
	{
		// Sistema Uniformizado do TJPR (fundos, custas e guias). Endereço sem os
		// parâmetros de rastreamento (_gl, _ga) que vêm ao copiar do navegador.
		id: "uniformizado",
		rotulo: "S.U.",
		nome: "Sistema Uniformizado",
		orgao: "TJPR",
		titulo: "Sistema Uniformizado — TJPR (fundos, custas e guias)",
		url: "https://portal.tjpr.jus.br/fundos/index.do?perform=listar",
		seeu: true,
		cor: { claro: "#e8edf2", escuro: "#c4d0dc", borda: "#6b7f93", texto: "#34495e" }
	},
	{
		id: "copel",
		rotulo: "COPEL",
		nome: "COPEL",
		orgao: "Copel",
		titulo: "COPEL — Companhia Paranaense de Energia",
		url: "https://www.copel.com/externo/public/index.jsf",
		outros: true,
		cor: { claro: "#f6eee2", escuro: "#e3cfae", borda: "#a8875a", texto: "#5f4523" }
	},
	{
		id: "fupen",
		rotulo: "FUPEN",
		nome: "FUPEN",
		orgao: "DEPEN-PR",
		titulo: "FUPEN — Fundo Penitenciário do Paraná",
		url: "https://www.fupen.depen.pr.gov.br/fupen/",
		outros: true,
		cor: { claro: "#eef1d9", escuro: "#d4dba3", borda: "#8a9440", texto: "#4d5520" }
	},
	{
		id: "sanepar",
		rotulo: "SANEPAR",
		nome: "SANEPAR",
		orgao: "Sanepar",
		titulo: "SANEPAR — Portal do Poder Judiciário",
		url: "https://poderjudiciario.sanepar.com.br/#/login",
		outros: true,
		cor: { claro: "#dff6fb", escuro: "#a9e1ee", borda: "#3a9bb5", texto: "#135e70" }
	},
	{
		// Rede interna do Estado: só abre em computadores ligados a ela.
		id: "sesp",
		rotulo: "SESP",
		nome: "SESP Intranet",
		orgao: "SESP-PR",
		titulo: "SESP Intranet — Secretaria da Segurança Pública do Paraná",
		url: "https://sespintranet.sesp.parana/sespintranet/moduloValidacao.do?action=index",
		outros: true,
		seeu: true,
		cor: { claro: "#f1e6ea", escuro: "#d9c0c9", borda: "#93677a", texto: "#5a3446" }
	}
]);