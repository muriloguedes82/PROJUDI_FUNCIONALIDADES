// Sistemas do CNJ com ícone ao lado da balança do Menu (ver sistemasCnj.js).
//
// Carregado pela página (antes de sistemasCnj.js) e pelo service worker
// (background.js), que só abre em nova aba/segundo monitor os endereços
// desta lista. Ordem: do mais próximo da balança para a esquerda.
//
// `orgao`: quem mantém o sistema, no título do popup e na dica (padrão: CNJ).
// `cor`: fundo (dois tons pastel), borda e desenho do ícone - uma cor por
// sistema; nenhuma repete o dourado da balança.
// `svg`: desenho 24x24 no traço da balança (class="cheio" = preenchido).
self.PDP_SISTEMAS_CNJ = Object.freeze([
	{
		id: "serpjud",
		nome: "SerpJud",
		titulo: "SERP-JUD — Sistema Eletrônico dos Registros Públicos",
		url: "https://serp.registros.org.br/?login-callback=true",
		cor: { claro: "#d4f7f1", escuro: "#8fdccf", borda: "#2a8c7f", desenho: "#0f5e55" },
		// Prédio de colunas (registros públicos).
		svg: '<path class="cheio" d="M12 2.5L2.5 7.5h19z"/><path d="M3 9.5h18M5 11v6.5M9.7 11v6.5M14.3 11v6.5M19 11v6.5M3 19.5h18M2 21.5h20"/>'
	},
	{
		id: "cniep",
		nome: "CNIEP",
		titulo: "CNIEP — Cadastro Nacional de Inspeções em Estabelecimentos Penais",
		url: "https://cniep.cnj.jus.br/dashboard",
		cor: { claro: "#ece6fd", escuro: "#cbbcf4", borda: "#7a62c7", desenho: "#4a3596" },
		// Grade (estabelecimento penal).
		svg: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M8 3.5v17M12 3.5v17M16 3.5v17M3.5 12h17"/>'
	},
	{
		id: "prevjud",
		nome: "PrevJud",
		titulo: "PrevJud — Previdenciário (PDPJ)",
		url: "https://previdenciario.pdpj.jus.br/dashboard",
		cor: { claro: "#ffeadb", escuro: "#fcc9a3", borda: "#d98a4c", desenho: "#8a4a17" },
		// Guarda-chuva (proteção previdenciária).
		svg: '<path class="cheio" d="M2.5 12a9.5 8 0 0 1 19 0z"/><path d="M12 3v1.5M12 12v6.5a2 2 0 0 1-4 0"/>'
	},
	{
		id: "sisbajud",
		nome: "Sisbajud",
		titulo: "Sisbajud — Sistema de Busca de Ativos do Poder Judiciário",
		url: "https://sisbajud.cnj.jus.br/minuta",
		cor: { claro: "#e6f6da", escuro: "#bfe3a3", borda: "#6fa64a", desenho: "#3e6b22" },
		// Pilha de moedas (valores bancários).
		svg: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/>'
	},
	{
		id: "sngb",
		nome: "SNGB",
		titulo: "SNGB — Sistema Nacional de Gestão de Bens",
		url: "https://sngb.pdpj.jus.br/home",
		cor: { claro: "#fde4ee", escuro: "#f5bcd2", borda: "#c96088", desenho: "#8a2f55" },
		// Caixa (bens apreendidos).
		svg: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.2l9 4.6"/>'
	},
	{
		id: "sniper",
		nome: "Sniper",
		titulo: "Sniper — Sistema Nacional de Investigação Patrimonial e Recuperação de Ativos",
		url: "https://sniper.pdpj.jus.br/",
		cor: { claro: "#e0eefc", escuro: "#b3d3f3", borda: "#4f8fcf", desenho: "#1f5591" },
		// Mira (investigação patrimonial).
		svg: '<circle cx="12" cy="12" r="7.5"/><circle class="cheio" cx="12" cy="12" r="1.8"/><path d="M12 1.8v5M12 17.2v5M1.8 12h5M17.2 12h5"/>'
	},
	{
		id: "infojud",
		nome: "Infojud",
		orgao: "Receita Federal",
		titulo: "Infojud — Informações ao Judiciário (Receita Federal, e-CAC)",
		url: "https://cav.receita.fazenda.gov.br/ecac/Aplicacao.aspx?id=5032&origem=menu",
		cor: { claro: "#ffe3e1", escuro: "#f6b3ad", borda: "#d0605a", desenho: "#8f2a24" },
		// Documento com lupa (declarações à Receita).
		svg: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21H11M14 3l5 5h-5zM19 8v3M8 9h3M8 12.5h4"/><circle cx="16" cy="16" r="3.2"/><path d="M18.4 18.4L21 21"/>'
	}
]);
