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

## Pendências (Análise de Juntadas / Conclusões)

O mesmo painel de pré-visualização também é oferecido no quadro
**Pendências** da capa do processo, para itens como:

```html
<td class="labelRadio"><label>Análise de Juntadas:</label></td>
<td>
  <a href=".../processo/analisarJuntada.do?_tj=..." class="link">
    Há 1 pendência(s) de análise de juntada
  </a>
</td>
```

Diferente do link de movimentação, esse link não aponta direto para um
documento — ele leva à tela de análise (`analisarJuntada.do`,
`conclusao.do`, etc.), que lista uma ou mais juntadas/conclusões
pendentes. Nessa tela, porém, o link de cada documento só existe no HTML
**depois** que o próprio JavaScript da página expande a linha (o ícone
"+", que dispara uma listagem via AJAX) — ele não está presente na página
carregada "crua".

Por isso, ao passar o mouse sobre o link da pendência, a extensão:

1. Carrega a tela de análise dentro de um `<iframe>` oculto (mesma
   sessão/cookies do usuário, sem abrir nada visível para quem está
   usando o Projudi).
2. Como essa tela normalmente lista o **histórico completo** de
   juntadas/conclusões do processo (não só as pendentes), a extensão
   identifica as linhas realmente pendentes pelo checkbox de seleção que
   só existe nelas, e restringe a expansão a essas linhas.
3. Dentro desse iframe oculto, clica programaticamente no ícone "+" de
   cada linha pendente — o mesmo que o usuário clicaria manualmente para
   expandir aquela linha — disparando a mesma listagem (somente leitura)
   já oferecida pelo Projudi. Nenhuma ação de aceitar/rejeitar/decidir a
   juntada é simulada, e linhas já analisadas (sem checkbox) não são
   tocadas.
4. Espera o resultado ser inserido no DOM pelo próprio JavaScript do
   Projudi e recolhe, **apenas dentro de cada linha expandida**, os links
   de documento (`a.link` com `href` contendo `/arquivo.do`) que
   apareceram.
5. Descarta o iframe oculto e abre um painel de pré-visualização para
   cada documento encontrado. Se houver **mais de uma** juntada ou
   conclusão pendente, é aberta uma janela de pré-visualização para
   **cada uma delas**, lado a lado (em cascata), permitindo revisar todos
   os documentos pendentes sem sair da tela do processo.

Se nenhum documento for encontrado (ou a tela demorar demais para
responder), um aviso é exibido com um atalho para abrir a análise
completa em nova aba — o comportamento original do link nunca é
removido.

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
- A pré-visualização das pendências depende de a tela de análise expor os
  ícones de expandir com o mesmo padrão observado (`<a id="linkArquivosN">`
  contendo uma `<img>`, ou `onclick="showDetail(...)"`) e de o resultado
  expandido usar o mesmo padrão de link (`a.link` com `href` contendo
  `/arquivo.do`) já usado na aba Movimentações. Se algum Tribunal usar uma
  tela de análise com estrutura diferente, a extensão mostra o aviso de
  "nenhum documento encontrado" (ou expira após alguns segundos) e o link
  original continua funcionando normalmente, sem nenhum efeito colateral.
