# Diagnóstico: extensão "pesada" e lentidão no Projudi/SEEU

Versão analisada: 2.53.0. Correções aplicadas na 2.54.2 (desenvolvidas como 2.53.1, em paralelo com a 2.53.1 das caixinhas laranja).

## Sintoma

Com o tempo, a extensão passou a deixar o Projudi/SEEU mais lento: telas que
demoram mais a responder, sobretudo com várias abas de processo abertas.

## Como foi medido

`desempenho/medir.mjs` carrega a extensão num Chromium, aceita os Termos de
Uso e abre uma tela que imita a do processo do Projudi (cabeçalho em quadro
próprio, quadro principal com 400 movimentações com arquivo, barra de botões
e `#processoForm`). Mede o tempo de processamento da aba, com e sem a
extensão, em cinco situações:

| Etapa | O que simula |
|---|---|
| carregamento | abrir a tela do processo |
| 10 s parado | a aba à vista, sem o usuário mexer |
| 40 trocas de aba | trocas de aba do processo (conteúdo substituído por AJAX) |
| 10 quadros ocultos | 10 carregamentos da tela em quadro oculto, como fazem as prévias e as buscas em segundo plano |
| 10 s em segundo plano | a aba atrás de outra aba |

```
cd extensao-preview-documentos
node desempenho/medir.mjs              # com e sem a extensão
PERFIL=1 node desempenho/medir.mjs     # e onde (arquivo/função) o tempo foi gasto
```

O Playwright mantém toda página "à vista"; por isso, na etapa em segundo
plano, o script faz `document.hidden` valer verdadeiro só para os scripts da
extensão (é o que o navegador informa quando o usuário troca de aba).

## O que foi encontrado

1. **Tudo é injetado em todo quadro.** O bloco principal tem 46 scripts
   (≈1,3 MB) registrados com `allFrames: true` para qualquer endereço do
   Projudi/SEEU (`src/termosUso.js`). Cada quadro — cabeçalho, tela, e cada
   quadro oculto que a própria extensão abre — recebe e executa todos eles.
2. **Quadros ocultos montavam a interface inteira.** Há 22 pontos que
   carregam telas do Projudi em quadro oculto (prévias, pendências,
   suspensões, preferências na linha, localizador...). Vários scripts
   (e-mail, WhatsApp, botões arrastáveis, Ações rápidas, Bloco de anotações,
   expandir movimentações...) não reconheciam esses quadros e criavam
   botões, caixas de seleção em todos os documentos e vigias de tela neles.
   Medido: cada carregamento oculto custava ≈3× o da página sem extensão.
3. **Vigias rodando sem parar, inclusive em segundo plano.** São ≈30
   observadores de mudanças no documento inteiro e ≈15 temporizadores de
   0,4 s a 1,5 s. Com a aba em segundo plano, a extensão continuava gastando
   ≈13 ms de processamento a cada segundo por aba — com 15 abas do Projudi
   abertas, ≈20 % de um núcleo do processador o tempo todo.
4. **`juntarDocumento.js` procurava as telas do fluxo a cada 0,4 s** (todos
   os botões e campos da página), mesmo sem nenhum fluxo de juntada em
   andamento. Era o maior consumidor "de fundo".
5. **Recálculo de layout forçado.** `remessaMultipla.js` e
   `ordenarCumprimentos.js` mediam a posição de cada botão da tela antes de
   ler o rótulo dele, a cada mudança no documento; com outros scripts
   alterando a página no meio, o navegador recalculava o layout várias vezes
   por troca de aba (≈1,3 s em 40 trocas, no perfil).
6. **Reações a cada pedaço da mudança.** Os observadores de `content.js`
   (WhatsApp), `remessaMultipla.js` e `ordenarCumprimentos.js` varriam o
   documento inteiro a cada leva de mudanças, e uma troca de aba gera várias
   levas seguidas.

Descartado: as buscas em segundo plano de suspensão/monitoração **não** se
repetem em laço quando o processo não tem a aba "Informações Adicionais"
(medido: 2 pedidos por abertura, um de cada recurso).

## O que foi corrigido (2.54.2)

| Correção | Onde |
|---|---|
| Quadros ocultos da extensão (`data-pdp-loader`, `pdp-qa-fetch-iframe`) passam a valer como telas sem interface: e-mail, WhatsApp, botões, Ações rápidas, Bloco de anotações, Oráculo, Movimento base e Expandir movimentações não são montados neles (os combos já não eram retomados nesses quadros — ver `insideHelperFrame` em `quickActions.js`) | `src/uiVisibility.js` |
| Temporizadores de conferência pausam com a aba em segundo plano (o observador de mudanças continua ativo; ao voltar, a próxima volta confere tudo) | `buttonDrag.js`, `content.js`, `movementHighlight.js`, `ordenarCumprimentos.js`, `remessaMultipla.js`, `sistemasCnj.js`, `menuExtensao.js`, `suspensaoAtiva.js`, `monitoracaoAtiva.js`, `habilitarAdvogado.js` |
| Sem fluxo de juntada em andamento (nada em `sessionStorage`), o temporizador de 0,4 s sai antes de procurar as telas | `src/juntarDocumento.js` |
| Rótulo antes da visibilidade ao procurar botões | `remessaMultipla.js`, `ordenarCumprimentos.js`, `quickActions.js` |
| Uma reconciliação por quadro de animação nos observadores | `content.js`, `remessaMultipla.js`, `ordenarCumprimentos.js` |

Os temporizadores de `quickActions.js` e o de `juntarDocumento.js` com
fluxo em andamento continuam iguais: são eles que conduzem combos e
juntadas, que podem seguir com a aba em segundo plano.

## Resultado

Mediana de 5 rodadas, mesma máquina. "Extra" = com a extensão menos sem a
extensão (processamento total da aba, em ms).

| Etapa | Extra antes (2.53.0) | Extra depois (2.54.2) | Redução |
|---|---:|---:|---:|
| carregamento | 267 | 238 | 11 % |
| 10 s parado | 185 | 134 | 27 % |
| 40 trocas de aba | 1 050 | 1 079 | — |
| 10 quadros ocultos | 824 | 500 | 39 % |
| 10 s em segundo plano | 169 | 34 | 80 % |

Só JavaScript da extensão em segundo plano: 130 ms → 9 ms a cada 10 s (−93 %).

As trocas de aba não mudaram na simulação: o custo que sobra é a criação
das caixas de seleção nos documentos novos (`documentSelection.js`) e o
reposicionamento dos botões, que dependem do layout novo de qualquer forma.

## Próximos passos recomendados (por ordem de ganho)

1. **Carregar cada script só nas telas em que ele age.** Dividir o bloco
   principal de `src/termosUso.js` em blocos com `matches` por endereço (ex.:
   `juntarDocumento.js` só em `juntarDocumento.do`, `upload.do`,
   `digitarTexto.do`, `preAnalise.do`...; `alterarClasseAssuntos.js` só na
   tela do processo e em `processoEdicao.do`), e deixar fora dos quadros do
   cabeçalho/menu o que só age na tela do processo. É o maior ganho no
   carregamento de cada quadro, mas exige mapear, para cada script, as telas
   e as funções compartilhadas (`window.__pdp...`) de que ele depende.
2. **Um vigia compartilhado.** Trocar os ≈30 observadores do documento
   inteiro e os temporizadores por um único observador e um único
   temporizador (em `hostGuard.js` ou num script novo carregado logo depois)
   que agrupe as mudanças e chame cada função uma vez por quadro de
   animação.
3. **Uma só varredura dos links de documento.** `content.js`
   (`scanDocLinksForWhatsapp`), `email.js` (`scan`) e
   `documentSelection.js` percorrem os mesmos `a.link` a cada mudança.
4. **Lembrar a resposta negativa de "é tela de processo?"**
   (`findProcessToolbarElement` em `content.js` e `quickActions.js` lê o
   texto de todos os botões da tela a cada 0,7 s em telas que não são de
   processo).
5. **Trocar quadros ocultos por `fetch()` onde o Projudi permitir** (alguns
   recursos documentam por que precisam de navegação de verdade; os demais
   ganhariam bastante).

## Como conferir no Projudi de verdade

No Chrome, **Shift+Esc** (Gerenciador de tarefas) mostra a CPU de cada aba:
compare uma aba do Projudi parada, à vista e em segundo plano, com a
extensão ligada e desligada. Para detalhar, DevTools → **Performance** →
gravar uma troca de aba do processo e ver o tempo gasto em
`chrome-extension://…` no "Bottom-Up".

## Registro de travamentos e lentidão (2.56.0)

A simulação não reproduz tudo o que acontece no Projudi real (telas,
processos e computadores de cada usuário). Por isso a extensão passou a
anotar sozinha, em uso real, os travamentos e a lentidão
(`src/registroDesempenho.js`); o Menu baixa o registro em .json (**Travamentos
e lentidão → ⬇ Baixar registro**).

- **travamento**: quadro de tela de 200 ms ou mais (API *long animation
  frame*), com o tempo de scripts do Projudi/SEEU e de outras extensões e,
  em `extensao`, quanto foi desta extensão por arquivo e tipo de chamada
  (vigia de mudanças, temporizador, antes de desenhar, evento da página);
- **lentidao**: 10 s em que os quadros longos somaram 3 s ou mais;
- **carregamento**: tela que levou 4 s ou mais para abrir, com a espera pelo
  servidor (`servidorMs`) separada da montagem da tela (`montagemMs`);
- em todos: tela (sem "?..."), quadros internos com a quantidade de
  elementos, memória usada e se a aba estava à vista.

O Chrome não informa quais scripts de extensão rodaram num quadro longo; por
isso o registro cronometra os vigias, temporizadores e eventos da página
registrados pelos scripts da extensão (só no mundo isolado deles; o código
do Projudi não é tocado). Custo medido (mediana de 3 rodadas, 400
movimentações): +0,03 s de processamento ao abrir a tela; nas trocas de aba,
parado e em segundo plano, dentro da variação entre rodadas.

Exemplo, na tela simulada com 2000 movimentações: travamento de 342 ms, dos
quais 245 ms da extensão (`email.js` reposicionando os botões, 159 ms;
`content.js` marcando os documentos, 60 ms).
