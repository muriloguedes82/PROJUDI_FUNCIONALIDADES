(function () {
  'use strict';
  if (window.__pdpClipboardProcess) return;
  function extractNumber(text) {
    const matches = [...String(text).matchAll(/(?<!\d)(?:\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4}|\d{20})(?!\d)/g)];
    const numbers = [...new Set(matches.map(match => match[0].replace(/\D/g,'')))];
    if (numbers.length !== 1) throw new Error(numbers.length ? 'Há mais de um número de processo copiado. Copie apenas um.' : 'Não encontrei um número de processo no padrão CNJ. Copie o número completo, com ou sem pontuação.');
    const n = numbers[0];
    return `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9,13)}.${n.slice(13,14)}.${n.slice(14,16)}.${n.slice(16)}`;
  }
  let busy = false;
  window.__pdpClipboardProcess = async function () {
    if (busy) return;
    busy = true;
    try {
      let text;
      try { text = await navigator.clipboard.readText(); }
      catch (pageError) {
        try {
          const response = await chrome.runtime.sendMessage({ source: 'projudi-preview', type: 'clipboard-process-read' });
          if (!response?.ok || typeof response.text !== 'string') throw new Error(response?.error || 'A extensão não respondeu.');
          text = response.text;
        } catch (extensionError) {
          throw new Error('Não foi possível ler a área de transferência. Recarregue a extensão e a página do Projudi e tente novamente.\n\nDetalhes: página: ' + (pageError.name || 'Erro') + ': ' + pageError.message + '; extensão: ' + extensionError.message);
        }
      }
      const number = extractNumber(text);
      const result = await chrome.runtime.sendMessage({ source:'projudi-preview',type:'clipboard-process-open',number });
      if (!result?.ok) throw new Error(result?.error || 'Não foi possível abrir a busca.');
    } catch (error) { alert(error.message); }
    finally { busy = false; }
  };
  // A marca é consumida antes de pesquisar: voltar ou recarregar não repete a busca.
  if (location.pathname !== '/projudi/processo/buscaProcesso.do' || !location.hash.startsWith('#pdp-search=')) return;
  let number;
  try { number = extractNumber(decodeURIComponent(location.hash.slice('#pdp-search='.length))); }
  catch (_) { return; }
  history.replaceState(history.state,'',location.pathname + location.search);
  let done = false;
  const deadline = Date.now() + 15000;
  function fill() {
    if (done) return;
    const form = document.getElementById('buscaProcessoForm');
    const input = form?.querySelector('#numeroProcesso');
    const unique = form?.querySelector('#flagNumeroUnico');
    const submit = form?.querySelector('#pesquisar');
    if (!input || !unique || !submit || input.disabled || submit.disabled) {
      if (Date.now() < deadline) { setTimeout(fill,200); return; }
      alert('A busca foi aberta, mas o formulário não foi encontrado. Pesquise manualmente pelo número: ' + number); return;
    }
    done = true;
    unique.click();
    unique.dispatchEvent(new Event('change',{bubbles:true}));
    const hiddenUnique = form.querySelector('#flagNumeroUnicoHidden');
    const oldPhysical = form.querySelector('#flagNumeroFisicoAntigo');
    if (hiddenUnique) hiddenUnique.value = 'true';
    if (oldPhysical) oldPhysical.value = 'false';
    input.value = number;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    submit.click();
  }
  fill();
})();
