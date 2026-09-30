// Configuração compartilhada dos Termos de Uso.
//
// Carregado pelo service worker (importScripts em background.js) e pela
// página src/termos.html. Ao alterar o texto dos termos de forma relevante,
// incremente `versao`: o aceite gravado passa a valer só para a versão
// anterior e a página de termos volta a ser exibida para novo aceite.
self.PDP_TERMOS = Object.freeze({
	versao: "1.0",
	chave: "pdpTermosUso",
	pagina: "src/termos.html"
});
