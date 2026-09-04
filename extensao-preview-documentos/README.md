# Projudi - Pré-visualização de Documentos

Extensão de navegador (Chrome/Edge, Manifest V3) que resolve o seguinte
problema: na tela **Movimentações** do Projudi, para ler a íntegra de um
documento anexado é preciso clicar no link e abri-lo em outra aba.

Com a extensão instalada, basta **passar o mouse sobre o nome do arquivo**
(ex.: `Certidao de Baixa.pdf`) para que a íntegra do documento apareça em um
painel flutuante sobreposto à própria tela de movimentações — sem precisar
trocar de aba. A ideia é a mesma já oferecida pelo eproc e pela extensão
AzFlow.

## Como funciona

1. Um content script (`src/content.js`) é injetado nas páginas
   `processo.do` do Projudi (tela de movimentações/autos do processo).
2. Ele identifica os links de arquivo da movimentação, que no HTML do
   Projudi seguem o padrão:
   ```html
   <a target="_blank" class="link" href=".../arquivo.do?_tj=...">
       Certidao de Baixa.pdf
   </a>
   ```
3. Ao detectar o mouse parado sobre um desses links por ~350ms, abre um
   painel (`<iframe>`) carregando a própria URL do `arquivo.do`. Como o
   iframe está na mesma origem do Projudi, ele reaproveita a sessão/cookies
   já autenticados do usuário — nenhuma credencial extra é usada ou
   armazenada pela extensão.
4. O painel some automaticamente ao tirar o mouse do link e do próprio
   painel (com uma pequena tolerância para permitir mover o cursor até
   ele), ou pode ser fechado com o botão "✕" ou a tecla `Esc`. Também há um
   atalho "Abrir em nova aba" para o fluxo tradicional, quando necessário.

## Instalação (modo desenvolvedor)

1. Acesse `chrome://extensions` (ou `edge://extensions`).
2. Ative o "Modo do desenvolvedor".
3. Clique em "Carregar sem compactação" e selecione a pasta
   `extensao-preview-documentos`.
4. Abra um processo no Projudi (TJPR) e passe o mouse sobre um documento na
   aba Movimentações.

## Limitações conhecidas

- Funciona apenas para documentos que o navegador consiga exibir dentro de
  um `<iframe>` (PDF é o caso comum, via visualizador nativo do
  Chrome/Edge). Alguns tipos de arquivo podem ser baixados diretamente pelo
  navegador em vez de exibidos — nesse caso, use "Abrir em nova aba".
- O `host_permissions` do `manifest.json` está restrito a
  `*.tjpr.jus.br`, domínio do exemplo fornecido. Para usar em outro
  Tribunal que também utilize o Projudi, ajuste os padrões de URL em
  `manifest.json`.
- Não há armazenamento, envio ou cache de nenhum dado do processo pela
  extensão: o documento é sempre buscado diretamente do Projudi no momento
  do hover.
