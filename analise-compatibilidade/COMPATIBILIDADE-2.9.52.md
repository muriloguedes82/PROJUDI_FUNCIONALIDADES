# Análise de compatibilidade — `projudi-funcionalidades-2.9.52.zip`

Comparação do pacote anexado com a extensão principal do repositório
([`extensao-preview-documentos/`](../extensao-preview-documentos), versão
**2.9.51**, commit `fa576a2`). O conteúdo do ZIP está guardado sem
alterações em
[`projudi-funcionalidades-2.9.52/`](./projudi-funcionalidades-2.9.52).
**Atualização:** a funcionalidade foi portada para a extensão principal
(versão 2.9.52) com as correções — veja
["Portagem para a extensão principal"](#portagem-para-a-extensão-principal-2952).
As seções abaixo descrevem o pacote **como veio**.

## Resumo

Ao contrário do pacote 2.9.32 analisado antes, este **parte exatamente da
nossa 2.9.51**. Só três arquivos mudam; os outros 40 são idênticos byte a
byte, incluindo `decursoPrazoSequencial.js`, `juntadaDrag.css` e
`content.js`:

| Arquivo | Mudança |
|---|---|
| `manifest.json` | só `version`: `2.9.51` → `2.9.52` |
| `src/juntadaDrag.js` | +185 linhas: novo IIFE “Dispensar decursos” no fim do arquivo |
| `src/background.js` | +37 linhas: `clickDecursoWithConfirmation` e um novo listener `decurso-dispense-marked` |

- **Manifesto:** compatível. A funcionalidade usa apenas `scripting` e
  `*://*.tjpr.jus.br/*`, que já estão declarados. Nenhum content script
  novo; o código vem dentro de `juntadaDrag.js`, que já roda em todos os
  frames do Projudi.
- **Sintaxe:** os dois JS passam no `node --check`.
- **Convenções:** segue o padrão do botão “Dispensar juntadas” (iframe
  oculto com token, `data-pdp-*`, clique feito pelo background em
  `world: 'MAIN'` com `confirm` interceptado, card inline no lugar do
  botão). As classes CSS `pdp-dispensar-*` já existem em `juntadaDrag.css`,
  então o botão aparece com o visual certo sem mudar o CSS.
- **Sem colisões:** usa flag, atributos e tipo de mensagem próprios
  (`__pdpDispensarDecurso`, `data-pdp-decurso`,
  `data-pdp-decurso-button`, `decurso-dispense-marked`). Nada coincide
  com a dispensa de juntadas (`data-pdp-dispensa`,
  `juntada-dispense-marked`) nem com `finalizarConclusao.js`. Esse último
  só reconhece links de `conclusao.do`, então nenhum link recebe os dois
  botões.

**Veredito:** dá para incorporar ao código principal, sem conflito de
merge nem de manifesto. Antes disso, convém corrigir os pontos 1 a 3
abaixo. O ponto 1 pode fazer o fluxo **continuar dispensando intimações
depois de mostrar erro na tela**.

## Como a funcionalidade funciona

1. Em `processo.do`, para cada link de `#quadroPendencias` cujo texto tem
   “intimação” e “aguardando análise de decurso de prazo” e que aponta
   para `processo/intimacaoBusca.do?…`, insere o botão
   **“Dispensar decursos”** logo após o link.
2. Ao clicar, cria um iframe oculto marcado com `data-pdp-decurso=<uuid>`
   e segue esta sequência:
   `list` (carrega a listagem, colhe os links `intimacao.do` das linhas
   “aguardando análise do decurso de prazo”) → `detail` (abre a primeira,
   localiza `#intimacaoForm #dispensarButton` com valor “Dispensar” e
   marca o botão com o token) → pede ao background que clique nele →
   `submitted` → `verify` (recarrega a listagem e exige que a contagem
   **diminua**) → repete até a lista zerar.
3. No background, `clickDecursoWithConfirmation` só age no frame cujo
   `frameElement` tem o token e cuja rota é `/projudi/processo/intimacao.do`.
   Ele aceita **uma única** `confirm()` que mencione “dispens”, “decurso de
   prazo” e “confirm” e recusa qualquer outra.
4. Ao terminar, exibe “Decurso(s) já dispensado(s) - Movimentação
   permitida.” e não oferece mais o botão para aquele link.

As salvaguardas são boas e iguais às da dispensa de juntadas: origem
conferida, token de uso único, rota exata, botão nativo validado pelo
texto, `confirm` restrita e confirmação pela listagem, não por mensagem de
sucesso.

## Problemas encontrados

### 1. `fail()` não interrompe o fluxo (importante)

`fail()` mostra o erro e libera `busy`, mas não marca `closed` nem muda
`state`, e o iframe continua no DOM. O listener de `load` segue ativo. Assim:

- **Timeout de 120 s:** o timer é **único para a operação inteira**, não
  por intimação. Num processo com várias intimações ele pode disparar no
  meio. O card passa a dizer “A operação demorou além do esperado…”, mas o
  próximo `load` (`submitted` → `verify` → `detail`) continua dispensando
  as intimações restantes em segundo plano.
- **Background responde `ok:false` mas o formulário foi enviado.** Isso
  acontece, por exemplo, quando o botão nativo não chama `confirm()`
  (`!accepted` resulta em erro) ou quando `button.click()` lança erro
  depois de o submit começar. O card mostra erro, o frame navega, e o
  fluxo continua para `verify` e para a próxima intimação.
- Depois que `busy = false`, o `MutationObserver` reabilita os botões de
  outras pendências. O usuário pode então iniciar uma segunda operação
  **ao mesmo tempo** que a primeira ainda roda.
- Com “Ver detalhes” aberto, se o usuário navegar dentro do iframe, o
  listener também pode reagir.

**Correção sugerida:** em `fail()`, definir `state = 'failed'` (ou uma
flag `halted`) e fazer o listener de `load` retornar logo quando ela
estiver ativa. Também convém reiniciar o timer a cada intimação em
`openNext()`, por exemplo 60 s por item, em vez de 120 s no total. A
dispensa de juntadas não tem esse problema porque usa `attempted` e só age
uma vez.

### 2. `decursoPrazoSequencial.js` roda dentro do iframe oculto

O iframe da dispensa carrega `processo/intimacaoBusca.do`, exatamente a
tela do filtro por Sequencial (PR #62). Esse script só se desativa em
frames `data-pdp-loader`, não em `data-pdp-decurso`, então:

- insere o campo “Sequencial” no formulário do iframe (inofensivo);
- **lê e apaga** `pdpDecursoPrazoSequencialDigito` do `sessionStorage`,
  que é compartilhado entre a aba e seus iframes da mesma origem. Se
  houver um dígito pendente, o iframe o consome e dispara
  `filtrarEmTodasAsPaginas()`, que percorre as páginas **dentro do iframe
  da dispensa**. Isso gera `load` inesperados e confunde a máquina de
  estados (ou tira o dígito da aba real).

É um caso raro, porque o dígito normalmente é consumido logo após o
“Filtrar”, mas a correção é simples. Em `decursoPrazoSequencial.js`, trocar
`window.frameElement.hasAttribute("data-pdp-loader")` por
`… || window.frameElement.hasAttribute("data-pdp-decurso")`. Também vale
aplicar o mesmo guard a `sequencialProcessoPrincipal.js`,
`movementHighlight.js`, `suspensaoAtiva.js` e `monitoracaoAtiva.js`, para
que nenhum deles rode dentro do iframe de trabalho.

Mesmo com o filtro ativo, as linhas ocultas continuariam contando em
`detailLinks()`, que lê `textContent` e não a visibilidade. Esse ponto não
causa erro.

### 3. Não fecha a pré-visualização da pendência

O botão “Dispensar juntadas” dispara `pdp-juntada-action-start`, que faz
`content.js` fechar os painéis de pré-visualização e cancelar o loader da
pendência. O link de decurso também é um link de `#quadroPendencias`, então
também tem pré-visualização ao passar o mouse, mas o novo botão **não
dispara o evento**. Um painel aberto sobre o link fica visível durante a
operação.

**Correção:** incluir
`window.dispatchEvent(new Event('pdp-juntada-action-start'))` no clique,
antes de `run(...)`.

### 4. Pontos a validar na tela real (sem HTML de referência no repo)

O código depende de textos e IDs que não estão documentados no
repositório:

- o link da pendência deve conter **“aguardando análise *de* decurso de
  prazo”**, mas a linha da listagem deve conter **“aguardando análise *do*
  decurso de prazo”**. Se o texto real for igual nos dois lugares, uma das
  expressões nunca casa: ou o botão não aparece, ou a lista vem vazia.
  Nesse último caso o fluxo termina logo com **“já dispensado(s)” sem ter
  dispensado nada**, um falso positivo;
- o botão nativo precisa ter `id="dispensarButton"` dentro de
  `#intimacaoForm`, com valor exatamente “Dispensar”;
- a mensagem da `confirm()` nativa precisa conter “dispens”, “decurso de
  prazo” **e** “confirm”. Se for, por exemplo, “Deseja realmente
  dispensar…?”, a confirmação é recusada. O resultado é seguro (nada é
  enviado), mas o botão fica inútil. A juntada aceita
  `confirm|deseja|certeza`;
- `detailLinks()` percorre só a **página atual** da listagem. Se houver
  mais de uma página de intimações para o mesmo processo, o que é
  improvável com o filtro por processo, só a primeira é tratada, e a
  página seguinte aparece depois da verificação.

Recomendação: abrir uma pendência real com o DevTools e confirmar esses
quatro itens antes de publicar. Para o item do falso positivo, vale exigir
que a **primeira** listagem tenha ao menos uma linha. Se vier vazia, o
fluxo deveria mostrar um erro (“listagem não reconhecida”) em vez de
“já dispensado(s)”.

### 5. Menores

- `clickDecursoWithConfirmation` compara a rota com
  `'/projudi/processo/intimacao.do'` exato, e o content script usa a
  mesma constante, então os dois estão consistentes. Isso só quebraria se
  o Projudi usasse outro contexto de URL. A juntada usa regex mais
  flexível.
- O novo IIFE fica em `juntadaDrag.js`, cujo nome e comentário de
  cabeçalho falam só de juntadas. Por organização, poderia ir para um
  `dispensarDecurso.js` próprio no manifesto, sem impacto funcional.
- O botão reaproveita a classe `pdp-dispensar-juntadas`. Nenhum outro
  código seleciona essa classe, então não há efeito colateral.
- O README do pacote não documenta a nova funcionalidade.

## Portagem para a extensão principal (2.9.52)

O IIFE e o handler do background foram levados para
`extensao-preview-documentos/` com estas mudanças em relação ao pacote:

- **Ponto 1:** `fail()` agora põe `state = 'failed'`, e o listener de
  `load` e o `finish()` ignoram qualquer evento depois disso. O prazo
  passou a ser de 60 s **por etapa** (listagem, intimação, verificação),
  reiniciado a cada passo, em vez de 120 s para a operação toda. Um
  `ok:false` do background só vira erro se o iframe ainda não saiu da
  página da intimação; se o envio já aconteceu, a verificação da
  listagem decide.
- **Ponto 2:** `decursoPrazoSequencial.js` não roda em frames
  `data-pdp-decurso`.
- **Ponto 3:** o clique em "Dispensar decursos" dispara
  `pdp-juntada-action-start`, que fecha a pré-visualização da pendência.
- **Ponto 4:**
  - a primeira listagem vazia agora é erro, não "já dispensado(s)";
  - os dois textos aceitam "análise **de**" e "análise **do**" decurso
    de prazo;
  - a `confirm()` aceita "confirm", "deseja" ou "certeza", desde que
    mencione dispensa e decurso;
  - se o botão nativo enviar o formulário sem pedir confirmação, isso
    não é mais tratado como erro, porque a listagem é conferida em
    seguida;
  - o `id="dispensarButton"` continua a ser conferido na tela real.
- README da extensão: nova seção "Dispensar decursos de prazo".
