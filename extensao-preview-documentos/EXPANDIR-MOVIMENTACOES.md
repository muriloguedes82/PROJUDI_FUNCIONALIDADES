# Expandir movimentações — 2.7.4

O botão fica na última linha do quadro Pendências (#quadroPendencias), alinhado à esquerda, abaixo das pendências. Expandir movimentações aciona os controles nativos fechados de anexos da página atual; depois, Recolher movimentações aciona os abertos. Não percorre paginação nem abre cada documento. Listas mistas expandem primeiro as linhas ainda fechadas.

Usa ícones iPlus.gif/iMinus.gif vinculados a showDetail ou linkArquivos, reconhecidos no código existente. Se não encontrar controles, o botão fica desabilitado. A estrutura da tela real ainda precisa ser validada pelo usuário. Código próprio.

Preserva o fallback offscreen de Processo copiado, a seleção única de documentos e o aviso verde após dispensa. Testes simulados de alternância, lista mista e bloqueio de cliques concorrentes passaram.

Na listagem analisarJuntada.do, sem quadroPendencias, o botão é inserido na primeira célula da linha do controle nativo Filtrar. Não usa o token da URL. A localização foi validada em simulação; depende de a barra nativa usar uma linha de tabela.

## Ocultar sem arquivo — 2.9.11

Ao lado do botão Expandir/Recolher movimentações, o botão "(Des)ocultar sem arquivo (+)" oculta/mostra as linhas da mesma tabela que não têm nenhum controle nativo de anexo (nem iPlus.gif fechado nem iMinus.gif aberto) — ou seja, movimentações/pendências sem arquivo. Clicar no botão alterna a exibição só da página atual.

Dentro do próprio botão, separada por uma linha vertical, fica a caixa "sempre": marcá-la grava a preferência `hideMovementsWithoutFilePrefs` (chrome.storage.sync, chave `alwaysHide`) para que o ocultamento já venha ativado da próxima vez que a tela abrir, em qualquer processo. A preferência pode ser ligada ou desligada a qualquer momento por essa mesma caixa (clicar nela não aciona o botão) e muda em todas as abas abertas via `chrome.storage.onChanged`, no mesmo padrão usado pelo Destaque de movimentações.

As movimentações da aba "Movimentações" (tr id="mov1Grau,...", o mesmo id usado pelo Realces nativo e por movementHighlight.js) ficam numa tabela separada do quadro Pendências onde o botão fica — por isso a busca de linhas é pela página inteira (por esse id), e só cai para a tabela dos controles de anexo (showDetail/linkArquivos) quando esse id não existe (quadro Pendências, analisarJuntada.do).

Todas as decisões (linhas encontradas por id ou por fallback, quantas têm/não têm arquivo, quantas foram ocultadas, preferência carregada/gravada, cliques) são logadas no console com o prefixo `[PDP expandMovements]`, para diagnosticar sem precisar adivinhar quando a tela do Projudi tiver uma estrutura inesperada.
