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
  const TAG = "[Projudi Contadores Zero]";

  if (window.__pdpMesaAnalistaContadores) {
    console.log(TAG, "já estava carregado neste frame, ignorando nova injeção — url:", location.href);
    return;
  }
  window.__pdpMesaAnalistaContadores = true;

  if (!/^\/projudi\/usuario\/mesaAnalista/.test(location.pathname)) {
    console.log(TAG, "script injetado mas pathname não corresponde, nada será feito — pathname:", location.pathname, "| url:", location.href);
    return;
  }

  console.log(TAG, "ativo nesta página — url:", location.href);

  const HIDDEN_ATTR = "data-pdp-contador-zero";

  function rowOf(span) {
    return span.closest("tr");
  }

  function labelOf(row) {
    const label = row.querySelector("td.label");
    return label ? label.textContent.trim() : "(sem label)";
  }

  function updateRow(span) {
    const row = rowOf(span);
    if (!row) {
      console.log(TAG, "span.contador sem <tr> ancestral, ignorado:", span);
      return;
    }
    const value = parseInt(String(span.textContent).replace(/\D+/g, ""), 10);
    const isZero = Number.isFinite(value) && value === 0;
    const wasHidden = row.hasAttribute(HIDDEN_ATTR);
    if (isZero && !wasHidden) {
      row.style.display = "none";
      row.setAttribute(HIDDEN_ATTR, "");
      console.log(TAG, "ocultando linha (total = 0):", labelOf(row));
    } else if (!isZero && wasHidden) {
      row.style.display = "";
      row.removeAttribute(HIDDEN_ATTR);
      console.log(TAG, "reexibindo linha (total = " + value + "):", labelOf(row));
    }
  }

  function scan(root) {
    const spans = root.querySelectorAll("span.contador");
    console.log(TAG, "varredura — " + spans.length + " contador(es) encontrado(s)");
    spans.forEach(updateRow);
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
