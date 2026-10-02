// Sistemas do CNJ com ícone ao lado da balança do Menu (ver sistemasCnj.js).
//
// Carregado pela página (antes de sistemasCnj.js) e pelo service worker
// (background.js), que só abre em nova aba/segundo monitor os endereços
// desta lista. Ordem padrão: do mais próximo da balança para a esquerda (o
// usuário pode reordenar arrastando; a ordem dele fica em
// "pdpSistemasCnjOrdem", no chrome.storage.local).
//
// `orgao`: quem mantém o sistema, no título do popup e na dica (padrão: CNJ).
// `cor`: fundo (dois tons pastel), borda e desenho do ícone - uma cor por
// sistema; nenhuma repete o dourado da balança.
// `svg`: desenho 24x24 no traço da balança (class="cheio" = preenchido),
// inspirado no logotipo de cada sistema.
self.PDP_SISTEMAS_CNJ = Object.freeze([
	{
		id: "serpjud",
		nome: "SerpJud",
		titulo: "SERP-JUD — Sistema Eletrônico dos Registros Públicos",
		url: "https://serp.registros.org.br/?login-callback=true",
		cor: { claro: "#d4f7f1", escuro: "#8fdccf", borda: "#2a8c7f", desenho: "#0f5e55" },
		// "on" do logotipo do ONSERP.
		svg: '<circle cx="7.5" cy="13.5" r="4.5"/><path d="M14 18v-4.5a3.5 3.5 0 0 1 7 0V18"/>'
	},
	{
		id: "cniep",
		nome: "CNIEP",
		titulo: "CNIEP — Cadastro Nacional de Inspeções em Estabelecimentos Penais",
		url: "https://cniep.cnj.jus.br/dashboard",
		cor: { claro: "#ece6fd", escuro: "#cbbcf4", borda: "#7a62c7", desenho: "#4a3596" },
		// Losango com o "visto" do logotipo.
		svg: '<path d="M12 2.5L21.5 12 12 21.5 2.5 12z"/><path d="M7.5 12l3 3 6-6.5"/>'
	},
	{
		id: "bnmp",
		nome: "BNMP 3.0",
		titulo: "BNMP 3.0 — Banco Nacional de Medidas Penais e Prisões",
		url: "https://bnmp.pdpj.jus.br/pagina-inicial",
		cor: { claro: "#e3e6fb", escuro: "#bcc3f2", borda: "#5b67c7", desenho: "#2e3a8f" },
		// Pessoa com a seta do logotipo.
		svg: '<circle class="cheio" cx="9.5" cy="8.5" r="3.2"/><path d="M3 20.5a6.5 6 0 0 1 13 0M15.5 3.5h5v5M20.5 3.5L15.5 8.5"/>'
	},
	{
		id: "prevjud",
		nome: "PrevJud",
		titulo: "PrevJud — Previdenciário (PDPJ)",
		url: "https://previdenciario.pdpj.jus.br/dashboard",
		cor: { claro: "#ffeadb", escuro: "#fcc9a3", borda: "#d98a4c", desenho: "#8a4a17" },
		// Quadrado com a pessoa sorrindo do logotipo.
		svg: '<rect x="3" y="3" width="18" height="18" rx="4.5"/><circle class="cheio" cx="12" cy="9" r="2.1"/><path d="M7.5 13.5a4.5 4.5 0 0 0 9 0"/>'
	},
	{
		id: "sisbajud",
		nome: "Sisbajud",
		titulo: "Sisbajud — Sistema de Busca de Ativos do Poder Judiciário",
		url: "https://sisbajud.cnj.jus.br/minuta",
		cor: { claro: "#e6f6da", escuro: "#bfe3a3", borda: "#6fa64a", desenho: "#3e6b22" },
		// Pilha de moedas (valores bancários) - o logotipo é só o nome.
		svg: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/>'
	},
	{
		id: "sngb",
		nome: "SNGB",
		titulo: "SNGB — Sistema Nacional de Gestão de Bens",
		url: "https://sngb.pdpj.jus.br/home",
		cor: { claro: "#fde4ee", escuro: "#f5bcd2", borda: "#c96088", desenho: "#8a2f55" },
		// Mosaico de quadradinhos em "X" do logotipo.
		svg: '<rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.6"/><rect x="15" y="2.5" width="6.5" height="6.5" rx="1.6"/><rect class="cheio" x="8.75" y="8.75" width="6.5" height="6.5" rx="1.6"/><rect x="2.5" y="15" width="6.5" height="6.5" rx="1.6"/><rect class="cheio" x="15" y="15" width="6.5" height="6.5" rx="1.6"/>'
	},
	{
		id: "sniper",
		nome: "Sniper",
		titulo: "Sniper — Sistema Nacional de Investigação Patrimonial e Recuperação de Ativos",
		url: "https://sniper.pdpj.jus.br/",
		cor: { claro: "#e0eefc", escuro: "#b3d3f3", borda: "#4f8fcf", desenho: "#1f5591" },
		// Cifrão entre arcos, como no logotipo.
		svg: '<path d="M15 8.6c-.5-1.1-1.6-1.8-3-1.8-1.8 0-3 .9-3 2.3 0 3.1 6 1.6 6 4.8 0 1.4-1.2 2.3-3 2.3-1.4 0-2.6-.7-3.1-1.8M12 4.8v14.4M20.5 12a8.5 8.5 0 0 1-8.5 8.5M3.5 12A8.5 8.5 0 0 1 12 3.5"/>'
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
