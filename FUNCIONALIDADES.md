# Catálogo de Funcionalidades

Este documento sintetiza **todas as funcionalidades existentes** no
repositório, servindo como referência única e atualizada do que já foi
implementado. Ele cobre a extensão de navegador em
[`extensao-preview-documentos/`](./extensao-preview-documentos), hoje o único
componente de código do projeto.

> **Regra de manutenção:** sempre que o código principal (qualquer arquivo em
> `extensao-preview-documentos/src/` ou `manifest.json`) for alterado — nova
> funcionalidade, remoção, ou mudança relevante de comportamento — este
> arquivo deve ser atualizado no mesmo commit/PR, junto com o `README.md`
> correspondente. Não deixe a documentação dessincronizar do código.

## Visão geral

Extensão de navegador (Chrome/Edge, Manifest V3) para as telas de processo do
**Projudi** (TJPR) e do **SEEU**, que compartilham o mesmo padrão de link de
documento. Versão atual: `2.7.0`.

## O que a extensão faz (resumo para o usuário final)

| # | Funcionalidade | Onde funciona |
|---|---|---|
| 1 | Pré-visualização de documentos ao passar o mouse | Projudi + SEEU |
| 2 | Pré-visualização de pendências (Análise de Juntadas/Conclusões) | Projudi |
| 3 | Botão "Dispensar juntadas" em segundo plano | Projudi |
| 4 | Seleção de documentos (checkboxes) para enviar | Projudi + SEEU |
| 5 | Envio de documentos por WhatsApp Web | Projudi + SEEU |
| 6 | Envio de documentos por e-mail (Outlook) | Projudi + SEEU |
| 7 | Ações rápidas (atalhos para o painel "Ações" do Projudi) | Projudi |
| 8 | Preferências de preenchimento das ações rápidas | Projudi |
| 9 | Ocultar itens zerados na Mesa do Analista/Escrivão | Projudi |
| 10 | Reposicionamento (arrastar) dos botões flutuantes na tela | Projudi + SEEU |
| 11 | Convivência com a extensão AzFlow, sem conflito | SEEU |

### 1. Pré-visualização de documentos
Ao passar o mouse sobre o nome de um arquivo numa movimentação, a íntegra do
documento aparece na hora, numa janela sobreposta — sem precisar clicar e
abrir em outra aba.

### 2. Pré-visualização de pendências
No quadro **Pendências** da capa do processo, passar o mouse sobre o link de
"Análise de Juntadas" já mostra o(s) documento(s) pendente(s), mesmo que
normalmente eles só apareçam depois de expandir manualmente a tela de
análise.

### 3. Botão "Dispensar juntadas"
Um botão ao lado do link de análise dispensa de uma vez todas as juntadas
pendentes daquela página, mostrando o andamento e o resultado (sucesso ou
erro com detalhes) — sem precisar marcar item por item.

### 4. Seleção de documentos
Uma checkbox ao lado de cada arquivo permite marcar um ou mais documentos
para enviar por WhatsApp ou e-mail, sem precisar baixar cada um manualmente.

### 5. Envio por WhatsApp Web
Marque os documentos desejados, informe o número (ou escolha um destinatário
salvo) e clique em "Enviar por WhatsApp": a extensão baixa os arquivos, abre
a conversa certa no WhatsApp Web e já anexa tudo — só falta revisar e clicar
em enviar. Mantém uma lista de destinatários salvos, com busca e favoritos.

### 6. Envio por e-mail (Outlook)
Marque os documentos (ou nenhum, se quiser só escrever um e-mail), clique em
"Enviar por e-mail" e a extensão abre um rascunho no Outlook institucional
já com os anexos, destinatário(s) e um texto inicial padrão (número dos
autos e juízo, preenchidos automaticamente). Também é possível salvar até
200 destinatários favoritos e até 20 remetentes ("De") de uso frequente.

### 7. Ações rápidas
Em vez de rolar a tela procurando no painel "Ações" do Projudi, botões
agrupados (Concluso, Remessa, Ordenações, Partes, Suspender, Transitar,
Arquivar, Outras) dão acesso direto às ações do processo, com apenas um ou
dois cliques, de qualquer aba do processo.

### 8. Preferências das ações rápidas
Permite salvar o preenchimento de um diálogo de ação (ex.: um tipo de
intimação usado com frequência) como uma preferência com nome, e reaplicá-lo
depois com um clique — sempre pedindo confirmação antes de executar a ação.

### 9. Ocultar itens zerados
Nas telas de Mesa do Analista/Escrivão, itens sem nenhuma pendência (contador
zerado) ficam ocultos automaticamente, deixando a lista mais limpa — e voltam
a aparecer sozinhos assim que surgir uma pendência.

### 10. Reposicionamento dos botões flutuantes
Os botões da extensão (WhatsApp, e-mail, ações rápidas) podem ser arrastados
verticalmente para a posição mais confortável na tela.

### 11. Convivência com o AzFlow
Para quem já usa a extensão AzFlow no SEEU, esta extensão detecta isso
automaticamente e evita duplicar a pré-visualização de documentos, mantendo
as duas funcionando sem conflito.

## Limitações conhecidas

- Só funciona para documentos exibíveis pelo navegador (ex.: PDF); alguns
  tipos de arquivo continuam exigindo "Abrir em nova aba".
- Hoje configurada para o TJPR (Projudi) e o SEEU; para usar em outro
  Tribunal é preciso um ajuste técnico.
- O envio de e-mail automático via Outlook depende de uma configuração
  prévia feita pelo TI; sem ela, a extensão usa um modo alternativo que
  exige um passo manual a mais para anexar os arquivos.
- O preenchimento automático de preferências das ações rápidas é uma
  facilidade "best effort": sempre confira os campos antes de confirmar uma
  ação.

Para o funcionamento técnico interno (arquitetura, arquivos envolvidos,
tratamento de CORS, autenticação, etc.), veja o
[apêndice técnico](./FUNCIONALIDADES_TECNICO.md) e o
[README da extensão](./extensao-preview-documentos/README.md).
