// Mesa do Analista / Mesa do Escrivão: oculta os itens com total zerado.
//
// Nas abas "Análise de Juntadas", "Outros Cumprimentos", "Mesa do Escrivão
// Criminal" etc. (ex.: mesaAnalista.do, mesaAnalistaEscrivao.do), cada linha
// da tabela tem um contador (<span class="contador">) com a quantidade de
// pendências daquele tipo. Quando o total é 0, a linha inteira é ocultada;
// como a página atualiza os contadores via AJAX sem recarregar, um
// MutationObserver reavalia as linhas sempre que o texto de um contador
// muda, reexibindo a linha assim que o total voltar a ser maior que zero.
(function () {
  "use strict";
  if (window.__pdpMesaAnalistaContadores || !/^\/projudi\/usuario\/mesaAnalista/.test(location.pathname)) return;
  window.__pdpMesaAnalistaContadores = true;

  const HIDDEN_ATTR = "data-pdp-contador-zero";

  function rowOf(span) {
    return span.closest("tr");
  }

  function updateRow(span) {
    const row = rowOf(span);
    if (!row) return;
    const value = parseInt(String(span.textContent).replace(/\D+/g, ""), 10);
    const isZero = Number.isFinite(value) && value === 0;
    if (isZero) {
      row.style.display = "none";
      row.setAttribute(HIDDEN_ATTR, "");
    } else if (row.hasAttribute(HIDDEN_ATTR)) {
      row.style.display = "";
      row.removeAttribute(HIDDEN_ATTR);
    }
  }

  function scan(root) {
    root.querySelectorAll("span.contador").forEach(updateRow);
  }

  scan(document);

  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      scan(document);
    }, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
