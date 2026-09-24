// Rotas em que a pré-visualização de documentos continua disponível, mas
// o grupo flutuante de atalhos/envios não deve ser exibido.
(function () {
  'use strict';
  if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)

  const exactPaths = new Set([
    '/projudi/processo/juntarDocumento.do',
    '/projudi/movimentacao.do',
    '/projudi/movimentarProcesso.do',
    '/projudi/processo/apensamento.do',
    '/projudi/processo/conclusao.do',
    '/projudi/digitarTexto.do',
    '/projudi/processo/cumprimentoCartorioMandado',
    '/projudi/processo/cumprimentoCartorioMandado.do',
    '/projudi/processo/advogadosParte',
    '/projudi/processo/advogadosParte.do',
    '/projudi/processo/analisarJuntada',
    '/projudi/processo/analisarJuntada.do'
  ]);
  const pathPrefixes = [
    '/projudi/processo/cumprimentoCartorio',
    '/projudi/processo/preAnalise'
  ];
  const path = location.pathname.replace(/\/+$/, '');

  let blockedByHostFrame = false;
  try {
    blockedByHostFrame = !!(window.frameElement && window.frameElement.hasAttribute('data-pdp-hide-button-group'));
  } catch (error) {
    blockedByHostFrame = false;
  }

  window.__pdpEmbeddedButtonGroupBlocked = blockedByHostFrame;

  window.__pdpButtonGroupBlocked = blockedByHostFrame || exactPaths.has(path) ||
    pathPrefixes.some(function (prefix) { return path.indexOf(prefix) === 0; });
})();
