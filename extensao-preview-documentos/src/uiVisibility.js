// Rotas em que a pré-visualização de documentos continua disponível, mas
// o grupo flutuante de atalhos/envios não deve ser exibido.
(function () {
  'use strict';

  const exactPaths = new Set([
    '/projudi/processo/juntarDocumento.do',
    '/projudi/movimentacao.do',
    '/projudi/movimentarProcesso.do',
    '/projudi/processo/apensamento.do',
    '/projudi/processo/conclusao.do',
    '/projudi/digitarTexto.do'
  ]);
  const pathPrefixes = [
    '/projudi/processo/cumprimentoCartorio',
    '/projudi/processo/preAnalise'
  ];
  const path = location.pathname.replace(/\/+$/, '');

  window.__pdpButtonGroupBlocked = exactPaths.has(path) ||
    pathPrefixes.some(function (prefix) { return path.indexOf(prefix) === 0; });
})();
