# PROJUDI_FUNCIONALIDADES

## Tela de Apresentação de Documentos

Problema resolvido: na tela **Movimentações** do Projudi (tela padrão ao
abrir um processo), para ler a íntegra de um documento é preciso clicar no
link e abri-lo em outra aba.

A pasta [`extensao-preview-documentos/`](./extensao-preview-documentos) contém
uma extensão de navegador que exibe o documento em um painel sobreposto ao
simplesmente passar o mouse sobre o arquivo, sem precisar trocar de aba —
nos moldes do que já existe no eproc e na extensão AzFlow. Veja o README da
pasta para detalhes de funcionamento e instalação.

## Lembretes em formato Post-it

A mesma extensão também adiciona um quadro de **lembretes coloridos (estilo
post-it)** à tela do processo, com cor à escolha e sincronizados em tempo
real entre todos os usuários que tiverem a extensão ativa no mesmo
processo. Veja a seção "Lembretes (post-it)" do README da pasta
[`extensao-preview-documentos/`](./extensao-preview-documentos) para
detalhes de funcionamento e configuração (é necessário um projeto Firebase
Realtime Database).
