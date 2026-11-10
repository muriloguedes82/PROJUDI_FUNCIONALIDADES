# Diagnóstico: SEEU trava por completo na tela do processo (aba Movimentações)

Versão analisada: 2.55.3. Corrigido na 2.55.4.

## Sintoma

No SEEU, dentro do processo (aba **Movimentações**), a aba do navegador
trava por completo: nada responde, e nem o DevTools (Console) abre, nem é
possível salvar o HTML da página. Nas demais telas a extensão funciona
normalmente.

Um travamento total, em que nem o DevTools abre, indica que a página nunca
devolve o controle ao navegador: um laço sem fim no JavaScript. Lentidão
comum (tarefas pesadas, temporizadores) deixa a tela lenta, mas ela ainda
responde.

## Causa

Dois `MutationObserver` disputavam o mesmo lugar na barra de botões:

| Script | Regra (no SEEU) |
|---|---|
| `src/habilitarAdvogado.js` (`reconcile`) | botão **Advogados** logo depois do **⭐ Minhas Preferências** (`#pdp-fav-prefs-button`), quando há `#processoForm` (2.51.0) |
| `src/localizadorSeeu.js` (`reconciliarBotao`) | botão **Localizador** logo depois do **⭐ Minhas Preferências**, quando há o cabeçalho `seeu-localizador-processo-header` |

Cada um observa o documento inteiro e, se o seu botão não está logo depois
do ⭐, o coloca lá. Isso move o botão do outro, cujo observador reage e
recoloca o dele, e assim por diante. Os retornos dos observadores rodam
como microtarefas, então o navegador nunca chega a desenhar a tela nem a
atender o DevTools.

Por isso só acontece **dentro do processo**: é a única tela que tem, ao
mesmo tempo, o `#processoForm` e o cabeçalho de localizadores. As duas
regras existem desde a 2.51.0 (19/10/2026), quando o **Advogados** passou a
existir no SEEU ao lado do ⭐.

## Como foi confirmado

`desempenho/travamento-seeu.mjs` carrega a extensão num Chromium e abre uma
tela que imita a do processo do SEEU (cabeçalho de localizadores,
`#processoForm`, quadro de Movimentações com o "+" do SEEU) e confere, a
cada segundo, se a página responde:

```
cd extensao-preview-documentos
node desempenho/travamento-seeu.mjs                    # TRAVOU na 2.55.3
SEM_LOCALIZADOR=1 node desempenho/travamento-seeu.mjs  # sem o cabeçalho: OK
CONSOLE=Vigia node desempenho/travamento-seeu.mjs      # mostra os avisos do vigia
```

| Situação | Resultado |
|---|---|
| 2.55.3 | trava 1 s depois de abrir a tela |
| 2.55.3 sem o cabeçalho de localizadores | responde |
| 2.55.4 | responde, com ⭐, Advogados e Localizador na barra |
| 2.55.4 só com o vigia (sem a correção do Localizador) | responde; o console aponta `localizadorSeeu.js` e `habilitarAdvogado.js` |

## Correções (2.55.4)

1. **`src/localizadorSeeu.js`**: o **Localizador** passa a ficar depois do
   **Advogados** quando este está na fileira (senão, depois do ⭐) — a
   mesma "cadeia" que `juntarDocumento.js` já usa no Projudi. A posição na
   tela não depende disso: ela vem do `order` de `ordemBotoesAcoes.js`.
2. **Vigia contra laços (`src/hostGuard.js`)**: como `hostGuard.js` roda
   antes de todos os scripts, no mesmo mundo isolado, ele troca o
   `MutationObserver` só para a extensão (a página não é afetada). Conta os
   retornos de cada tarefa; passados 200 numa só tarefa (sinal de laço),
   passa a conferir quais retornos mudam a página, e o observador que muda
   a página 300 vezes na mesma tarefa é desligado, com um aviso no console
   apontando o script e a linha. A função desligada para até recarregar a
   tela, mas a aba nunca mais trava por esse motivo. No uso normal o custo
   é só uma contagem por retorno.

## Outros riscos avaliados

- `expandMovements.js` observa também o atributo `src` (o "+"/"−" do SEEU
  troca a imagem), mas agrupa por `requestAnimationFrame`: não laça.
- `ordemBotoesAcoes.js` reaplica a ordem a cada mudança da barra, mas só
  mexe no `style`, que ele não observa, e só quando o valor muda.
- `editarPartes.js` e `juntarDocumento.js` ancoram no
  `#pdp-clipboard-button`, que não existe no SEEU.
- Laços `while (Date.now() < fim)` dos scripts têm `await` dentro: não
  prendem a página.

## Se travar de novo

Com a 2.55.4, a tela deve voltar a responder em menos de um segundo. Abra o
Console (F12) e procure a mensagem `[Projudi] Vigia de src/... desligado`:
ela diz qual script entrou em laço.
