# Análise de compatibilidade — `projudi-layout-teste-2.9.32.zip`

Análise do pacote anexado (`projudi-layout-teste-2.9.32.zip`) frente à
extensão atual do repositório
([`extensao-preview-documentos/`](../extensao-preview-documentos), versão
**2.9.50**, antes desta análise **2.9.49**). O conteúdo extraído do ZIP foi
mantido, sem alterações, em
[`projudi-layout-teste-2.9.32/`](./projudi-layout-teste-2.9.32) para
referência.

**Atualização**: três melhorias identificadas no pacote-teste (ausentes na
2.9.49) foram portadas para a nossa extensão — veja
["Melhorias portadas para a nossa versão"](#melhorias-portadas-para-a-nossa-versão-2950)
abaixo. As comparações de tamanho/diff e a lista de "funcionalidades só na
nossa versão" a seguir foram feitas **antes** da portagem, contra a 2.9.49;
os itens portados deixaram de valer como diferença depois dela.

## Resumo

O pacote anexado é uma build **anterior e menos evoluída** da mesma
extensão — o próprio `RECONSTRUCAO-CHROME-2.9.9.txt` do pacote confirma que
se trata de uma reconstrução "baseada integralmente no ZIP do parceiro
(2.9.3)", ou seja, uma branch paralela mantida por terceiros a partir de um
ponto antigo do histórico, não uma versão nova a incorporar.

- `manifest.json`: **idêntico** em `permissions`, `host_permissions`,
  `background`, `options_page` e nos `content_scripts` (mesmos arquivos,
  mesmos `matches`, mesma ordem de carregamento). A única diferença é o
  campo `version` (`2.9.32` no pacote vs. `2.9.49` no repositório).
  → **Sem incompatibilidade de manifesto.** Os dois pacotes podem ser
  instalados como extensões Chrome/Edge MV3 sem ajuste de permissões.
- Nomes de arquivo, IDs de elementos injetados (`data-pdp-*`), prefixos de
  log (`[PDP ...]`, `[Projudi ...]`) e chaves de `chrome.storage` continuam
  no mesmo padrão nos dois pacotes — não há mudança de convenção que
  quebre compatibilidade de dados salvos (preferências) entre as versões.

## Diferenças por arquivo (linhas de diff `diff -u`)

| Arquivo | linhas (nossa) | linhas (teste) | linhas de diff |
|---|---:|---:|---:|
| `sequencialProcessoPrincipal.js` | 379 | 186 | 342 |
| `content.js` | 2130 | 1936 | 336 |
| `quickActions.js` | 1937 | 1880 | 189 |
| `buttonDrag.js` | 249 | 209 | 118 |
| `email.js` | 833 | 824 | 49 |
| `expandMovements.js` | 301 | 316 | 39 |
| `email.css` | 300 | 297 | 37 |
| `uiVisibility.js` | 22 | 37 | 23 |
| `manifest.json` | — | — | 1 (só `version`) |
| `README.md` | — | — | seções reordenadas/adicionadas |
| `content.css` | 607 | 607 | 4 |
| `habilitarAdvogado.js` | 183 | 183 | 4 |
| `oraculo.js` | 37 | 37 | 4 |
| `monitoracaoAtiva.js` | 1075 | 1076 | 2 |
| `suspensaoAtiva.js` | 706 | 707 | 2 |

`clipboardOffscreen.js/.html`, `closeShim.js`, `documentSelection.js`,
`clipboardProcess.js`, `owa-attach.js/.css`, `whatsapp.js`, `background.js`,
`options.js/.html`, `finalizarConclusao.js`,
`mesaAnalistaContadores.js`, `movementHighlight.js/.css`,
`ordenarCumprimentos.js/.css`, `juntadaDrag.js/.css`,
`remessaMultipla.js/.css`: **idênticos byte a byte** nos dois pacotes.

## Funcionalidades presentes só na nossa versão (2.9.49)

- **`content.js` — `loadMovementDocsInPlace`**: carregamento em segundo
  plano dos documentos de uma movimentação a partir do quadro Pendências
  (sem precisar clicar no controle nativo de anexos), usado pelo preview
  ao passar o mouse. Não existe no pacote anexado.
- **`sequencialProcessoPrincipal.js`**: a nossa versão também resolve o
  Sequencial no **próprio processo principal** (busca em segundo plano via
  `POST` ao `#processoForm` quando a aba "Informações Gerais" ainda não
  carregou), além do caso já coberto pelo pacote anexado (processos
  apensos, lendo o campo "Processo Principal:" já presente na página). O
  pacote anexado cobre só o segundo caso, de forma mais simples/antiga (sem
  o `POST` em segundo plano, sem o fallback multinível de apensamento em
  cadeia).
- **README**: o pacote anexado já traz seções de "(Des)Habilitar
  Advogado", "Retorno de mandados", "Indicador de suspensão ativa" e
  "Indicador de monitoração ativa" com uma redação mais antiga; a nossa
  versão tem essas mesmas funcionalidades (arquivos `habilitarAdvogado.js`,
  `suspensaoAtiva.js`, `monitoracaoAtiva.js` praticamente idênticos nos
  dois pacotes) documentadas de forma mais detalhada e com itens adicionais
  (finalizar conclusão pendente, indicador de monitoração no topo da tela).

Os `.md`/`.txt` extras do pacote (`EXPANDIR-MOVIMENTACOES.md`,
`AJUSTE-ROLAGEM.md`, `TESTE-GESTO-JUNTADAS.md`) documentam ajustes já
presentes, de forma equivalente, na nossa versão atual (botão
Expandir/Recolher movimentações, drag do grupo de botões, dispensa de
juntadas).

## Melhorias portadas para a nossa versão (2.9.50)

Apesar de ser uma build mais antiga em geral, o pacote-teste continha três
correções pontuais, em arquivos que a tabela acima já apontava como
divergentes, que a nossa versão não tinha. Foram portadas para
`extensao-preview-documentos/`:

1. **Grupo de botões (WhatsApp/e-mail) — evita aparecer na posição errada
   antes do reposicionamento.** `quickActions.js` (`ensureRow`) agora cria o
   `#pdp-qa-row` com `data-pdp-layout-pending` e `visibility:hidden`;
   `buttonDrag.js` (`layoutColumns`) remove o atributo e a ocultação assim
   que calcula a posição final, ancorada ao quadro Pendências/Análise
   Automática. Isso complementa (não substitui) o cache de larguras
   (`widthsSignature`/`setPx`) que já tínhamos contra o *jitter* contínuo —
   mantido como estava.
2. **Botões Expandir/Recolher e (Des)ocultar sem arquivo — mesma ideia, e
   agora também ancoram em `#quadroAnaliseAutomatica`.**
   `expandMovements.js`: `refresh()` passou a considerar
   `#quadroAnaliseAutomatica` além de `#quadroPendencias` como host do
   rodapé (`boxHost = panel || automaticPanel`); `isOnProcessScreen()` trata
   `analisarJuntada(.do)` como exceção (o botão aparece mesmo sem a barra de
   ações de um processo aberto); e o módulo agora respeita
   `window.__pdpEmbeddedButtonGroupBlocked` (item 3) antes de rodar.
3. **Blacklist de subpáginas atualizada.** `uiVisibility.js`: acrescentadas
   as rotas `cumprimentoCartorioMandado(.do)`, `advogadosParte(.do)` e
   `analisarJuntada(.do)` a `exactPaths`; e adicionado bloqueio por iframe
   hospedeiro — quando a página está embutida num `<iframe>` marcado com
   `data-pdp-hide-button-group`, `window.__pdpEmbeddedButtonGroupBlocked` é
   ligado e some com o grupo de botões flutuantes só nesse frame
   (`expandMovements.js` já consome essa flag, item 2).

Depois da portagem, `expandMovements.js` e `uiVisibility.js` ficaram
**idênticos** aos do pacote-teste; `buttonDrag.js` e `quickActions.js`
mantêm a versão portada somada ao cache anti-*jitter* que só existia na
nossa. `manifest.json` foi incrementado para `2.9.50`.

## Conclusão

O arquivo anexado é **compatível em nível de manifesto/instalação** e é, no
geral, uma **versão anterior** (2.9.32) da mesma extensão, mantida por um
"parceiro" a partir de um ponto antigo do histórico (2.9.3): continua atrás
em `loadMovementDocsInPlace` (`content.js`) e na cobertura do processo
principal em `sequencialProcessoPrincipal.js`, por exemplo. Mesmo assim,
tinha três correções pontuais mais recentes que a nossa 2.9.49 — todas
portadas nesta análise (veja seção acima). Não há mais nenhuma melhoria
pendente de incorporação identificada neste pacote; ele segue guardado em
[`projudi-layout-teste-2.9.32/`](./projudi-layout-teste-2.9.32) apenas como
referência de uma branch paralela de terceiros.
