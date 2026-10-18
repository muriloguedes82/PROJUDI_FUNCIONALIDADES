# Diagnóstico: pré-visualização nas movimentações do SEEU não funciona

Versão analisada: 2.41.3. Base: página salva do SEEU Treino, tela
**Analisar Conclusão** (`/seeu/processo/conclusao.do`, que abre o
formulário `movimentarProcessoForm`), com o AzFlow instalado.

## Sintoma

No SEEU, parar o mouse sobre uma movimentação não abre o painel de
pré-visualização. O manual (seção 3.1) promete isso "no Projudi e no SEEU",
inclusive parando o mouse sobre o **texto da movimentação** que tem o **+**.

## O que a página salva mostra

- O `content.js` roda no quadro da conclusão (os checkboxes
  `pdp-document-checkbox` do WhatsApp/e-mail foram inseridos), e o link de
  arquivo da linha **Documentos** (`a.link[href*="/arquivo.do"]`,
  "online.pdf") tem o formato que a pré-visualização reconhece.
- O quadro **Movimentações Realizadas** do SEEU é montado assim:

  ```html
  <tr class="even" id="">
    <td><a class="linkArquivos0"><img src=".../iPlus.gif" id="icon0"></a></td>
    <td>16/03/2026 12:20:45</td>
    <td><b>DOCUMENTO</b><br>Guia de Recolhimento Penal</td>
  </tr>
  <tr id="row0" style="display:none"><td colspan="5"><div id="div0" class="extendedinfo"></div></td></tr>
  ```

  O "+" é ligado pelo jQuery do SEEU pela **classe** `linkArquivosN`, sem
  `onclick` e sem `id`, e os arquivos só chegam ao `div0` depois do clique.

## Causas

1. **Texto da movimentação: a regra é só do Projudi.**
   `isMovementLink` (`src/content.js`, ~linha 415) só aceita um
   `a.link` cujo endereço seja `/projudi/movimentacao.do`. No SEEU o
   endereço começa com `/seeu/` e, nesta tela, o texto do evento nem é um
   link (é um `<b>`). Resultado: parar o mouse sobre a movimentação nunca
   abre nada no SEEU, embora o manual diga que sim.
2. **O "+" do SEEU não é reconhecido.** `movementFileToggle` (~linha 396)
   procura `a[id^="linkArquivos"]` (por `id`) ou `img[onclick*="showDetail"]`,
   e só dentro de `tr[id^="mov1Grau,"]`. No SEEU o link usa **classe**
   (`a.linkArquivos0`), a imagem não tem `onclick` e a linha tem `id=""`.
   O mesmo vale para `expandMovements.js` (linhas 84, 95 e 99), que usa os
   mesmos seletores. Mesmo liberando `/seeu/` na causa 1, a linha
   continuaria sem "controle de arquivos" e seria ignorada.
3. **AzFlow pode desligar a pré-visualização.** Quando encontra marcas do
   AzFlow na página (`[class*="azflow-"]`, `[data-azflow-onclick-original]`,
   ...), o `content.js` não abre nenhum painel no SEEU
   (`shouldDeferPreviewToAzFlow`, ~linha 342), contando que o AzFlow mostre
   a sua. Nesta captura o AzFlow está em modo `data-azflow-extension=
   "unrelated-lite"` (só autotextos/barra) e colocou sua barra
   (`azflow-bar-button`, `#azflow-barra-menu`) no quadro de fora. Nesse
   modo é provável que ele **não** faça pré-visualização; se a aba
   Movimentações carregar no mesmo quadro onde a barra aparece (ou o
   AzFlow marcar algum elemento ali), ninguém mostra o documento — nem
   mesmo ao parar o mouse no nome do arquivo depois de abrir o "+". No
   quadro da conclusão salvo não havia marca que dispare a regra, então
   isto precisa ser confirmado na aba Movimentações da capa do processo.

## Como confirmar a causa 3 no SEEU

Na aba Movimentações do processo, com o "+" aberto, abrir o Console
(F12), escolher o quadro do processo e rodar:

```js
document.querySelector('[class*="azflow-"], [id*="azflow-"], [data-azflow-onclick-original], [data-azflow-menucs-applied]')
```

Se devolver um elemento, a extensão está se calando por causa do AzFlow.
Repetir com o AzFlow desligado: se a pré-visualização do nome do arquivo
voltar, a causa 3 está confirmada.

## Correção proposta

- **Causas 1 e 2:** aceitar `/seeu/` em `isMovementLink`; reconhecer o "+"
  do SEEU (`a[class*="linkArquivos"] img` / `img[id^="icon"]` na mesma
  linha) em `movementFileToggle` e `expandMovements.js`; no SEEU, tratar o
  `<b>` do evento (célula "Evento") como alvo do mouse, como já é feito com
  o `<b>` da Análise de Juntadas (`isJuntadaTitle`). Como o SEEU só traz
  os arquivos depois do clique, a busca em segundo plano (modo loader, que
  já aceita `img[id^="icon"]`) é o caminho para listar os arquivos sem
  abrir o "+".
- **Causa 3:** só ceder ao AzFlow quando ele estiver de fato oferecendo a
  pré-visualização — por exemplo, não ceder quando
  `<html data-azflow-extension="unrelated-lite">` ou
  `data-azflow-disabled="true"`, ou passar a olhar só a marca que o AzFlow
  põe nos links de arquivo.

Qualquer correção muda a versão e exige atualizar o manual (seção 3.1,
vídeo V03 se a tela mudar, Anexo B), conforme `CLAUDE.md`.
