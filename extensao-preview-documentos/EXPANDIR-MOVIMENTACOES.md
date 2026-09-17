# Expandir movimentações — 2.7.4

O botão fica na última linha do quadro Pendências (#quadroPendencias), alinhado à esquerda, abaixo das pendências. Expandir movimentações aciona os controles nativos fechados de anexos da página atual; depois, Recolher movimentações aciona os abertos. Não percorre paginação nem abre cada documento. Listas mistas expandem primeiro as linhas ainda fechadas.

Usa ícones iPlus.gif/iMinus.gif vinculados a showDetail ou linkArquivos, reconhecidos no código existente. Se não encontrar controles, o botão fica desabilitado. A estrutura da tela real ainda precisa ser validada pelo usuário. Código próprio.

Preserva o fallback offscreen de Processo copiado, a seleção única de documentos e o aviso verde após dispensa. Testes simulados de alternância, lista mista e bloqueio de cliques concorrentes passaram.

Na listagem analisarJuntada.do, sem quadroPendencias, o botão é inserido na primeira célula da linha do controle nativo Filtrar. Não usa o token da URL. A localização foi validada em simulação; depende de a barra nativa usar uma linha de tabela.

## Ocultar sem arquivo — 2.9.11

Ao lado do botão Expandir/Recolher movimentações, um segundo botão ("Ocultar sem arquivo (+)" / "Mostrar sem arquivo") oculta as linhas da mesma tabela que não têm nenhum controle nativo de anexo (nem iPlus.gif fechado nem iMinus.gif aberto) — ou seja, movimentações/pendências sem arquivo. O botão apenas alterna a exibição da página atual.

Uma caixa "sempre", ao lado, grava a preferência `hideMovementsWithoutFilePrefs` (chrome.storage.sync, chave `alwaysHide`) para que o ocultamento já venha ativado da próxima vez que a tela abrir, em qualquer processo. A preferência pode ser ligada ou desligada a qualquer momento pela mesma caixa; muda em todas as abas abertas via `chrome.storage.onChanged`, no mesmo padrão usado pelo Destaque de movimentações.
