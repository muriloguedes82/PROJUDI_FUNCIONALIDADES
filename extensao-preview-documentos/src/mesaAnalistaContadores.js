// Mesa do Analista / Mesa do Escrivão: oculta os itens com total zerado.
//
// Nas abas "Análise de Juntadas", "Citações e Intimações", "Mesa do
// Escrivão Criminal" etc. (ex.: mesaAnalista.do, mesaAnalistaEscrivao.do),
// cada linha da tabela tem um único contador (<span class="contador">) com
// a quantidade de pendências daquele tipo. Já na aba "Outros Cumprimentos"
// há tabelas (ex.: BNMP, Cumprimentos) com várias colunas por linha, cada
// uma com seu próprio contador (ex.: "Para Expedir", "Com Urgência",
// "Para Assinar" etc. do mesmo tipo de peça).
//
// A regra é a mesma nos dois casos: uma linha só é ocultada quando TODOS
// os contadores dela estão zerados; se qualquer coluna da linha tiver um
// total maior que zero, a linha inteira é preservada. Como a página
// atualiza os contadores via AJAX sem recarregar, um MutationObserver
// reavalia as linhas sempre que o texto de um contador muda, reexibindo a
// linha assim que algum dos seus totais voltar a ser maior que zero.
//
// SEEU (mesaAnalistaVepma.do, mesaAnalista.do...): não há <span
// class="contador">; cada total é o próprio link da linha, com o número
// sublinhado (`<a href="…/analisarJuntada.do?…"><u>101</u></a>`, ou
// `<u><font color="red">1</font></u>` em "Com Urgência"), na célula ao lado
// do rótulo (`td.label`). Lá o contador é esse link, e a regra é a mesma;
// e um grupo (<h4> + <fieldset>) com todas as linhas ocultas some inteiro.
(function () {
  "use strict";
  if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
  const TAG = "[Projudi Contadores Zero]";

  if (window.__pdpMesaAnalistaContadores) {
    console.log(TAG, "já estava carregado neste frame, ignorando nova injeção — url:", location.href);
    return;
  }
  window.__pdpMesaAnalistaContadores = true;

  if (!/^\/(projudi|seeu)\/usuario\/mesaAnalista/.test(location.pathname)) {
    console.log(TAG, "script injetado mas pathname não corresponde, nada será feito — pathname:", location.pathname, "| url:", location.href);
    return;
  }

  console.log(TAG, "ativo nesta página — url:", location.href);

  const HIDDEN_ATTR = "data-pdp-contador-zero";
  const NO_SEEU = location.pathname.startsWith("/seeu/");

  function labelOf(row) {
    const label = row.querySelector("td.label");
    if (label) return label.textContent.trim();
    const firstCell = row.querySelector("td");
    return firstCell ? firstCell.textContent.trim() : "(sem label)";
  }

  function valueOf(span) {
    const value = parseInt(String(span.textContent).replace(/\D+/g, ""), 10);
    return Number.isFinite(value) ? value : 0;
  }

  function updateRow(row, spans) {
    const anyPositive = spans.some((span) => valueOf(span) > 0);
    const wasHidden = row.hasAttribute(HIDDEN_ATTR);
    if (!anyPositive && !wasHidden) {
      row.style.display = "none";
      row.setAttribute(HIDDEN_ATTR, "");
      console.log(TAG, "ocultando linha (todos os contadores = 0):", labelOf(row));
    } else if (anyPositive && wasHidden) {
      row.style.display = "";
      row.removeAttribute(HIDDEN_ATTR);
      console.log(TAG, "reexibindo linha (ao menos um contador > 0):", labelOf(row));
    }
  }

  // Contadores da página: <span class="contador"> (Projudi) ou, no SEEU, os
  // links cujo texto é só o número, fora da célula do rótulo.
  function contadores(root) {
    if (!NO_SEEU) return root.querySelectorAll("span.contador");
    const area = root.querySelector("#mesaAnalistaForm") || root;
    return Array.from(area.querySelectorAll("td > a[href]")).filter((a) => {
      return !a.closest("td.label") && /^\d+$/.test(a.textContent.trim());
    });
  }

  function scan(root) {
    const spans = contadores(root);
    const rows = new Map();
    spans.forEach((span) => {
      const row = span.closest("tr");
      if (!row) {
        console.log(TAG, "span.contador sem <tr> ancestral, ignorado:", span);
        return;
      }
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(span);
    });
    console.log(TAG, "varredura — " + spans.length + " contador(es) em " + rows.size + " linha(s)");
    rows.forEach((rowSpans, row) => {
      try {
        updateRow(row, rowSpans);
      } catch (err) {
        console.error(TAG, "erro ao avaliar linha:", err, row);
      }
    });
    if (NO_SEEU) updateGroups(rows);
  }

  // SEEU: cada grupo da aba ("Com Urgência", "Para Conferir"...) é um <h4>
  // seguido de um <fieldset> com as linhas. Com todas as linhas ocultas,
  // somem também o título e a caixa, que ficariam vazios.
  function updateGroups(rows) {
    const groups = new Set();
    rows.forEach((spans, row) => {
      const fs = row.closest("fieldset");
      if (fs) groups.add(fs);
    });
    groups.forEach((fs) => {
      const all = Array.from(rows.keys()).filter((row) => row.closest("fieldset") === fs);
      const empty = all.every((row) => row.hasAttribute(HIDDEN_ATTR));
      const title = fs.previousElementSibling && fs.previousElementSibling.tagName === "H4" ? fs.previousElementSibling : null;
      [fs, title].forEach((el) => {
        if (!el) return;
        if (empty && !el.hasAttribute(HIDDEN_ATTR)) {
          el.style.display = "none";
          el.setAttribute(HIDDEN_ATTR, "");
        } else if (!empty && el.hasAttribute(HIDDEN_ATTR)) {
          el.style.display = "";
          el.removeAttribute(HIDDEN_ATTR);
        }
      });
    });
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
