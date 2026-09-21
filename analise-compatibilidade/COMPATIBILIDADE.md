# Análise de compatibilidade — `projudi-layout-teste-2.9.32.zip`

Análise do pacote anexado (`projudi-layout-teste-2.9.32.zip`) frente à
extensão atual do repositório
([`extensao-preview-documentos/`](../extensao-preview-documentos), versão
**2.9.49**). O conteúdo extraído do ZIP foi mantido, sem alterações, em
[`projudi-layout-teste-2.9.32/`](./projudi-layout-teste-2.9.32) para
referência.

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

## Conclusão

O arquivo anexado é **compatível em nível de manifesto/instalação**, mas é
uma **versão anterior** (2.9.32) da mesma extensão, mantida por um
"parceiro" a partir de um ponto antigo do histórico (2.9.3). Não introduz
nenhuma funcionalidade ausente da nossa versão atual (2.9.49); pelo
contrário, está atrás em pelo menos duas frentes (`loadMovementDocsInPlace`
em `content.js` e a cobertura do processo principal em
`sequencialProcessoPrincipal.js`). **Não há necessidade nem recomendação de
mesclar este pacote na extensão atual** — ele serve apenas como referência
de uma branch paralela de terceiros.
