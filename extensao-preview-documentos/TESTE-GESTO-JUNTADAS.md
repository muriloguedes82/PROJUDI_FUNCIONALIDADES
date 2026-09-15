# Dispensa em segundo plano — 2.4.0

Atualize os arquivos, recarregue a extensão e atualize o Projudi.

Arrastar o link de análise de juntadas para fora do quadro executa a seleção e a dispensa em segundo plano. São selecionados somente campos idJuntadas habilitados da página atual, sem percorrer outras páginas. O painel PiP não aparece durante o fluxo normal.

A confirmação nativa é aceita automaticamente somente durante o clique no botão marcado para esta operação e somente se a mensagem perguntar sobre dispensa. A função original de confirmação é restaurada imediatamente após o clique, inclusive em erro. Outras confirmações e uma segunda confirmação são rejeitadas por esta operação. Não há alterações permanentes nas confirmações do Projudi.

Um aviso mostra o andamento e o sucesso reconhecido pelo mesmo detector da versão anterior. Se a seleção falhar, a confirmação for diferente ou o sucesso não for identificado em 60 segundos, o aviso oferece Ver detalhes. A extensão não repete a ação automaticamente. Confira o resultado antes de tentar novamente após uma falha ou demora.

Testes locais: reconhecimento de sucesso, confirmação específica, rejeição de confirmação de outra ação, restauração após erro, isolamento por token de operação e clique único. Não houve dispensa real durante o desenvolvimento. O fluxo em segundo plano ainda depende do teste no Projudi.
