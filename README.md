# PROJUDI_FUNCIONALIDADES

## Tela de Apresentação de Documentos, Envio por WhatsApp e por E-mail

Problemas resolvidos na tela **Movimentações** do Projudi ou do SEEU (tela
padrão ao abrir um processo):

- Para ler a íntegra de um documento é preciso clicar no link e abri-lo em
  outra aba.
- Para enviar documentos do processo por WhatsApp ou por e-mail, é preciso
  baixar cada arquivo manualmente e anexá-los um a um.

A pasta [`extensao-preview-documentos/`](./extensao-preview-documentos) contém
uma extensão de navegador que resolve os três casos:

1. Exibe o documento em um painel sobreposto ao simplesmente passar o mouse
   sobre o arquivo, sem precisar trocar de aba — nos moldes do que já
   existe no eproc e na extensão AzFlow.
2. Permite selecionar documentos do processo e enviá-los diretamente por
   WhatsApp Web, já anexados numa nova conversa com o número informado —
   veja a seção "Envio de documentos por WhatsApp Web" no README da pasta.
3. Adiciona checkboxes junto aos arquivos da movimentação e um botão
   "Enviar por e-mail", que prepara um rascunho no Outlook institucional já
   com os documentos selecionados anexados, aberto em uma janela pop-up
   menor sobre a tela do Projudi.

Veja o README da pasta para detalhes de funcionamento, instalação e
configuração.
