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
  const additionalPaths = new Set([
    '/projudi/audiencia/agendaAudiencia',
    '/projudi/processo/criminal/apreensao',
    '/projudi/processo/criminal/transacaoPenal',
    '/projudi/processo/penhora/autoPenhora',
    '/projudi/processo/parteProcesso',
    '/projudi/processo/criminal/denunciado',
    '/projudi/processo/criminal/parteSentenciada',
    '/projudi/processo/criminal/autuacaoAcaoPenalUnica',
    '/projudi/processo/informacaoFinanceira',
    '/projudi/processo/criminal/parteProcessoPena',
    '/projudi/processo/criminal/transitoEmJulgadoCriminal',
    '/projudi/processo/guiaRecolhimento',
    '/projudi/processoTransitoEmJulgado',
    '/projudi/processo/depositoEletronico'
  ]);

  let blockedByHostFrame = false;
  try {
    // Herda o bloqueio também nos frames internos das janelas marcadas.
    let currentWindow = window;
    while (currentWindow !== currentWindow.parent) {
      const frame = currentWindow.frameElement;
      if (frame && frame.hasAttribute('data-pdp-hide-button-group')) {
        blockedByHostFrame = true;
        break;
      }
      currentWindow = currentWindow.parent;
    }
  } catch (error) {
    // Um ancestral de outra origem não pode ser inspecionado.
  }

  window.__pdpEmbeddedButtonGroupBlocked = blockedByHostFrame;

  window.__pdpButtonGroupBlocked = blockedByHostFrame || exactPaths.has(path) ||
    additionalPaths.has(path.replace(/\.do$/, '')) ||
    pathPrefixes.some(function (prefix) { return path.indexOf(prefix) === 0; });
})();
