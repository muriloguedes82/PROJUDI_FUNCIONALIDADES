// Atalho para a consulta nativa da parte, sem guardar URLs ou tokens.
(function () {
  'use strict';
  // A janela do Oráculo mantém apenas os controles nativos.
  if (location.pathname === '/projudi/processo/criminal/antecedentesCriminais.do') return;
  if (window.__pdpOraculo || !location.pathname.startsWith('/projudi/')) return;
  window.__pdpOraculo = true;
  let button;
  function reconcile() {
    const row = document.getElementById('pdp-qa-row');
    const native = document.getElementById('btPesqOraculo');
    const host = row?.querySelector('.pdp-qa-row-line:last-child') || row || native?.parentElement;
    if (!host) { if (button?.isConnected) button.remove(); return; }
    if (!button) {
      button = document.createElement('button');
      button.id = 'pdp-oraculo-button';
      button.type = 'button';
      button.className = 'pdp-qa-group-btn';
      button.textContent = 'Oráculo';
      button.title = 'Abrir a consulta de antecedentes da parte na janela nativa do Projudi';
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        try {
          if (await window.__pdpOpenOraculoDirect?.()) return;
          const result = await chrome.runtime.sendMessage({source:'projudi-preview', type:'oraculo-open'});
          if (!result?.ok) alert(result?.error || 'Não foi possível abrir o Oráculo.');
        } catch (error) { alert('Não foi possível abrir o Oráculo: ' + error.message); }
        finally { button.disabled = false; }
      });
    }
    if (button.parentElement !== host) host.appendChild(button);
  }
  new MutationObserver(reconcile).observe(document.documentElement, {childList:true, subtree:true});
  reconcile();
})();
