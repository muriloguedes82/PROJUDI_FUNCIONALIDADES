# Vídeos do manual (guardados para uso futuro)

Estes vídeos mostram, em telas **simuladas** e com dados fictícios, como usar
cada função da extensão. Desde a versão **2.53.2** eles **não vão mais junto
com a extensão** e **não aparecem no Manual do Usuário** (decisão do
usuário). Continuam sendo gravados a cada função nova ou mudança do que
aparece na tela, para poderem voltar ao manual no futuro.

- `fonte/` — as cenas (`cenas*.js`), o palco simulado e o gravador
  (`gravar.mjs`). Para gravar uma cena:
  `node videos-do-manual/fonte/gravar.mjs Vnn` (requisitos em
  [`COMO-ATUALIZAR.md`](../extensao-preview-documentos/manual/COMO-ATUALIZAR.md#requisitos-para-gravar-os-vídeos)).
- A tabela abaixo não é editada à mão: ela é regravada por
  `node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir`.

## Como voltar a mostrar os vídeos no manual

1. Mover esta pasta (sem `README.md`, se quiser) de volta para
   `extensao-preview-documentos/manual/videos/` e ajustar, em
   `fonte/palco.html`, o caminho de `src/sistemasCnjLista.js`;
2. citar cada vídeo no início da sua seção do `MANUAL.md`:
   `▶ [**Vídeo Vnn** — Título](videos/Vnn-nome.mp4)` — o leitor do manual
   (`src/manual.js`) ainda sabe tocar esses links;
3. ajustar `verificar-manual.mjs` para voltar a exigir as citações.

## Índice

<!-- tabela-videos:inicio -->
| Vídeo | Função | Seção do manual | Duração |
|---|---|---|---|
| [V01](V01-instalacao-e-termos-de-uso.mp4) | [Instalação e Termos de Uso](V01-instalacao-e-termos-de-uso.mp4) | [2.1](../extensao-preview-documentos/manual/MANUAL.md#cap-2-1) | 0:50 |
| [V02](V02-barra-de-botoes-da-extensao.mp4) | [A barra de botões da extensão](V02-barra-de-botoes-da-extensao.mp4) | [2.4](../extensao-preview-documentos/manual/MANUAL.md#cap-2-4) | 0:44 |
| [V03](V03-pre-visualizacao-de-documentos.mp4) | [Pré-visualização de documentos](V03-pre-visualizacao-de-documentos.mp4) | [3.1](../extensao-preview-documentos/manual/MANUAL.md#cap-3-1) | 0:44 |
| [V04](V04-pre-visualizacao-das-pendencias.mp4) | [Pré-visualização das pendências](V04-pre-visualizacao-das-pendencias.mp4) | [3.2](../extensao-preview-documentos/manual/MANUAL.md#cap-3-2) | 0:30 |
| [V05](V05-expandir-e-ocultar-movimentacoes.mp4) | [Expandir movimentações e ocultar as sem arquivo](V05-expandir-e-ocultar-movimentacoes.mp4) | [3.3](../extensao-preview-documentos/manual/MANUAL.md#cap-3-3) | 0:42 |
| [V06](V06-destacar-movimentacoes.mp4) | [Destacar movimentações por tipo de usuário](V06-destacar-movimentacoes.mp4) | [3.4](../extensao-preview-documentos/manual/MANUAL.md#cap-3-4) | 0:38 |
| [V07](V07-envio-por-whatsapp.mp4) | [Envio por WhatsApp Web](V07-envio-por-whatsapp.mp4) | [5.1](../extensao-preview-documentos/manual/MANUAL.md#cap-5-1) | 0:44 |
| [V08](V08-envio-por-email.mp4) | [Envio por e-mail (Outlook)](V08-envio-por-email.mp4) | [5.2](../extensao-preview-documentos/manual/MANUAL.md#cap-5-2) | 0:46 |
| [V09](V09-destinatarios-e-remetentes-do-email.mp4) | [Destinatários favoritos e remetentes do e-mail](V09-destinatarios-e-remetentes-do-email.mp4) | [5.3](../extensao-preview-documentos/manual/MANUAL.md#cap-5-3) | 0:46 |
| [V10](V10-suspensao-e-monitoracao-no-cabecalho.mp4) | [Suspensão e monitoração eletrônica no cabeçalho](V10-suspensao-e-monitoracao-no-cabecalho.mp4) | [4.1](../extensao-preview-documentos/manual/MANUAL.md#cap-4-1) | 0:37 |
| [V11](V11-reus-no-cabecalho.mp4) | [Réus, indiciados e noticiados no cabeçalho](V11-reus-no-cabecalho.mp4) | [4.3](../extensao-preview-documentos/manual/MANUAL.md#cap-4-3) | 0:27 |
| [V12](V12-sequencial-do-processo-principal.mp4) | [Sequencial do processo principal (apensos)](V12-sequencial-do-processo-principal.mp4) | [4.4](../extensao-preview-documentos/manual/MANUAL.md#cap-4-4) | 0:34 |
| [V13](V13-dispensar-juntadas.mp4) | [Dispensar juntadas](V13-dispensar-juntadas.mp4) | [6.1](../extensao-preview-documentos/manual/MANUAL.md#cap-6-1) | 0:31 |
| [V14](V14-finalizar-conclusao.mp4) | [Finalizar conclusão pendente](V14-finalizar-conclusao.mp4) | [6.2](../extensao-preview-documentos/manual/MANUAL.md#cap-6-2) | 0:27 |
| [V15](V15-dispensar-decursos.mp4) | [Dispensar decursos de prazo](V15-dispensar-decursos.mp4) | [6.3](../extensao-preview-documentos/manual/MANUAL.md#cap-6-3) | 0:31 |
| [V16](V16-acoes-rapidas.mp4) | [Ações rápidas](V16-acoes-rapidas.mp4) | [7.1](../extensao-preview-documentos/manual/MANUAL.md#cap-7-1) | 0:44 |
| [V17](V17-preferencias.mp4) | [Preferências](V17-preferencias.mp4) | [7.2](../extensao-preview-documentos/manual/MANUAL.md#cap-7-2) | 1:18 |
| [V18](V18-minhas-preferencias.mp4) | [Minhas Preferências](V18-minhas-preferencias.mp4) | [7.3](../extensao-preview-documentos/manual/MANUAL.md#cap-7-3) | 0:55 |
| [V19](V19-combos-de-preferencias.mp4) | [Combos de preferências](V19-combos-de-preferencias.mp4) | [7.4](../extensao-preview-documentos/manual/MANUAL.md#cap-7-4) | 0:58 |
| [V20](V20-alvara-eletronico.mp4) | [Alvará Eletrônico](V20-alvara-eletronico.mp4) | [8.1](../extensao-preview-documentos/manual/MANUAL.md#cap-8-1) | 0:45 |
| [V21](V21-juntar-documento.mp4) | [Juntar Documento com preferências](V21-juntar-documento.mp4) | [8.2](../extensao-preview-documentos/manual/MANUAL.md#cap-8-2) | 1:09 |
| [V22](V22-des-habilitar-advogado.mp4) | [(Des)Habilitar Advogado](V22-des-habilitar-advogado.mp4) | [8.3](../extensao-preview-documentos/manual/MANUAL.md#cap-8-3) | 1:18 |
| [V23](V23-editar-partes-outros.mp4) | [Editar Partes/Outros](V23-editar-partes-outros.mp4) | [8.4](../extensao-preview-documentos/manual/MANUAL.md#cap-8-4) | 0:22 |
| [V24](V24-processo-copiado.mp4) | [Colar processo](V24-processo-copiado.mp4) | [8.5](../extensao-preview-documentos/manual/MANUAL.md#cap-8-5) | 0:28 |
| [V25](V25-oraculo.mp4) | [Oráculo](V25-oraculo.mp4) | [8.6](../extensao-preview-documentos/manual/MANUAL.md#cap-8-6) | 0:25 |
| [V26](V26-nova-ordenacao.mp4) | [Nova Ordenação](V26-nova-ordenacao.mp4) | [7.5](../extensao-preview-documentos/manual/MANUAL.md#cap-7-5) | 0:51 |
| [V27](V27-nova-remessa.mp4) | [Nova Remessa](V27-nova-remessa.mp4) | [7.6](../extensao-preview-documentos/manual/MANUAL.md#cap-7-6) | 0:41 |
| [V28](V28-sequencial-no-decurso-de-prazo.mp4) | [Filtro por Sequencial no Decurso de Prazo](V28-sequencial-no-decurso-de-prazo.mp4) | [9.1](../extensao-preview-documentos/manual/MANUAL.md#cap-9-1) | 0:29 |
| [V29](V29-listas-de-tarefas.mp4) | [Listas de tarefas](V29-listas-de-tarefas.mp4) | [9.2](../extensao-preview-documentos/manual/MANUAL.md#cap-9-2) | 1:04 |
| [V30](V30-minhas-preferencias-na-linha.mp4) | [Minhas Preferências na linha do processo (⭐)](V30-minhas-preferencias-na-linha.mp4) | [9.3](../extensao-preview-documentos/manual/MANUAL.md#cap-9-3) | 0:42 |
| [V31](V31-mesa-do-analista-sem-zerados.mp4) | [Mesa do Analista sem itens zerados](V31-mesa-do-analista-sem-zerados.mp4) | [9.4](../extensao-preview-documentos/manual/MANUAL.md#cap-9-4) | 0:28 |
| [V32](V32-rg-e-cpf-nos-cumprimentos.mp4) | [RG e CPF das partes nos cumprimentos](V32-rg-e-cpf-nos-cumprimentos.mp4) | [9.5](../extensao-preview-documentos/manual/MANUAL.md#cap-9-5) | 0:25 |
| [V33](V33-dados-processuais-nas-ordenacoes-bnmp.mp4) | [Dados processuais nas ordenações BNMP](V33-dados-processuais-nas-ordenacoes-bnmp.mp4) | [9.6](../extensao-preview-documentos/manual/MANUAL.md#cap-9-6) | 0:39 |
| [V34](V34-menu-da-extensao.mp4) | [Menu da extensão (ícone da balança)](V34-menu-da-extensao.mp4) | [2.6](../extensao-preview-documentos/manual/MANUAL.md#cap-2-6) | 1:51 |
| [V35](V35-endereco-e-mandado-regionalizado.mp4) | [Endereço da parte e Mandado Regionalizado](V35-endereco-e-mandado-regionalizado.mp4) | [9.7](../extensao-preview-documentos/manual/MANUAL.md#cap-9-7) | 0:58 |
| [V36](V36-dispensar-cumprimentos.mp4) | [Dispensar cumprimentos para expedir](V36-dispensar-cumprimentos.mp4) | [6.4](../extensao-preview-documentos/manual/MANUAL.md#cap-6-4) | 0:29 |
| [V37](V37-escolher-a-movimentacao.mp4) | [Escolher a movimentação das Ações rápidas](V37-escolher-a-movimentacao.mp4) | [7.7](../extensao-preview-documentos/manual/MANUAL.md#cap-7-7) | 1:14 |
| [V38](V38-preferencia-a-partir-de-um-movimento.mp4) | [Preferência a partir de um movimento](V38-preferencia-a-partir-de-um-movimento.mp4) | [7.7](../extensao-preview-documentos/manual/MANUAL.md#cap-7-7) | 0:56 |
| [V39](V39-sistemas-do-cnj.mp4) | [Sistemas do CNJ](V39-sistemas-do-cnj.mp4) | [8.7](../extensao-preview-documentos/manual/MANUAL.md#cap-8-7) | 1:19 |
| [V40](V40-localizador-seeu.mp4) | [Localizador (SEEU)](V40-localizador-seeu.mp4) | [8.8](../extensao-preview-documentos/manual/MANUAL.md#cap-8-8) | 1:02 |
| [V41](V41-localizador-na-linha-seeu.mp4) | [Localizador pela ⭐ da lista (SEEU)](V41-localizador-na-linha-seeu.mp4) | [9.3](../extensao-preview-documentos/manual/MANUAL.md#cap-9-3) | 0:31 |
| [V42](V42-alterar-classe-e-assuntos.mp4) | [Alterar Classe/Assuntos](V42-alterar-classe-e-assuntos.mp4) | [8.9](../extensao-preview-documentos/manual/MANUAL.md#cap-8-9) | 0:44 |
| [V43](V43-preferencia-de-alteracao-de-classe.mp4) | [Preferência de alteração de classe](V43-preferencia-de-alteracao-de-classe.mp4) | [8.9](../extensao-preview-documentos/manual/MANUAL.md#cap-8-9) | 0:43 |
| [V44](V44-processo-ao-passar-o-mouse.mp4) | [Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões e nos Cumprimentos, no Expedir e nos Paralisados](V44-processo-ao-passar-o-mouse.mp4) | [9.8](../extensao-preview-documentos/manual/MANUAL.md#cap-9-8) | 1:30 |
| [V45](V45-preferencias-em-lote.mp4) | [Preferências em lote (⭐ Em lote)](V45-preferencias-em-lote.mp4) | [9.3](../extensao-preview-documentos/manual/MANUAL.md#cap-9-3) | 1:01 |
| [V46](V46-remessa-turma-recursal.mp4) | [Remessa para a Turma Recursal](V46-remessa-turma-recursal.mp4) | [7.1](../extensao-preview-documentos/manual/MANUAL.md#cap-7-1) | 0:47 |
| [V47](V47-novo-valor-da-causa.mp4) | [Novo Valor da Causa](V47-novo-valor-da-causa.mp4) | [8.10](../extensao-preview-documentos/manual/MANUAL.md#cap-8-10) | 0:36 |
| [V48](V48-aviso-de-versao-nova.mp4) | [Aviso de versão nova e atualização](V48-aviso-de-versao-nova.mp4) | [2.3](../extensao-preview-documentos/manual/MANUAL.md#cap-2-3) | 0:41 |
| [V49](V49-preferencia-de-assunto-secundario.mp4) | [Preferência de assunto secundário](V49-preferencia-de-assunto-secundario.mp4) | [8.9](../extensao-preview-documentos/manual/MANUAL.md#cap-8-9) | 0:52 |
| [V50](V50-remover-assunto-secundario.mp4) | [Remover assunto secundário](V50-remover-assunto-secundario.mp4) | [8.9](../extensao-preview-documentos/manual/MANUAL.md#cap-8-9) | 0:22 |
| [V51](V51-documento-da-conclusao.mp4) | [Documento do Juiz no Retorno de Conclusão](V51-documento-da-conclusao.mp4) | [9.9](../extensao-preview-documentos/manual/MANUAL.md#cap-9-9) | 0:59 |
| [V52](V52-analisar-e-dispensar-decurso-na-lista.mp4) | [Analisar e Dispensar decurso na lista](V52-analisar-e-dispensar-decurso-na-lista.mp4) | [9.10](../extensao-preview-documentos/manual/MANUAL.md#cap-9-10) | 1:28 |
| [V53](V53-pre-analise-com-preferencias.mp4) | [Pré-Análise com preferências](V53-pre-analise-com-preferencias.mp4) | [9.11](../extensao-preview-documentos/manual/MANUAL.md#cap-9-11) | 1:11 |
| [V54](V54-painel-da-estrela-com-muitas-preferencias.mp4) | [⭐ da linha com muitas preferências](V54-painel-da-estrela-com-muitas-preferencias.mp4) | [9.3](../extensao-preview-documentos/manual/MANUAL.md#cap-9-3) | 0:40 |
| [V55](V55-paineis-com-muitas-preferencias.mp4) | [Painéis com muitas preferências](V55-paineis-com-muitas-preferencias.mp4) | [7.8](../extensao-preview-documentos/manual/MANUAL.md#cap-7-8) | 0:42 |
| [V56](V56-incluir-e-remover-prioridades.mp4) | [Incluir e remover prioridades](V56-incluir-e-remover-prioridades.mp4) | [8.11](../extensao-preview-documentos/manual/MANUAL.md#cap-8-11) | 0:58 |
| [V57](V57-localizador-na-lista-seeu.mp4) | [Localizador na lista (SEEU)](V57-localizador-na-lista-seeu.mp4) | [9.12](../extensao-preview-documentos/manual/MANUAL.md#cap-9-12) | 1:00 |
| [V58](V58-escolher-funcoes-e-botoes.mp4) | [Escolher funções e botões (busca, Desativar todas)](V58-escolher-funcoes-e-botoes.mp4) | [2.6](../extensao-preview-documentos/manual/MANUAL.md#cap-2-6) | 1:05 |
<!-- tabela-videos:fim -->
