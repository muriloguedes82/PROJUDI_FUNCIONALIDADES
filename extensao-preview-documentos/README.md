# Projudi - Pré-visualização de Documentos

Extensão de navegador (Chrome/Edge, Manifest V3) que resolve dois problemas
do dia a dia no Projudi:

1. na tela **Movimentações**, para ler a íntegra de um documento anexado é
   preciso clicar no link e abri-lo em outra aba;
2. não há como enviar rapidamente um ou mais documentos do processo por
   WhatsApp — é preciso baixar cada arquivo e depois anexá-lo manualmente
   numa conversa do WhatsApp Web.

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

## Envio de documentos por WhatsApp Web

A extensão adiciona uma caixinha de seleção ao lado de cada documento
(mesmo link `a.link` com `href` contendo `/arquivo.do` usado na
pré-visualização) e um botão **"Enviar por WhatsApp"**, posicionado acima da
barra de botões da tela do processo (Pedido Incidental, Juntar Documento,
Peticionar, Patronato, Navegar, Exportar Processo, Voltar). Ao rolar a
página para cima ou para baixo, o botão acompanha o usuário, "flutuando"
fixo do lado direito da tela, para continuar acessível mesmo com a barra de
botões fora da área visível.

Fluxo de uso:

1. Marque a caixinha ao lado de um ou mais documentos do processo.
2. Clique em "Enviar por WhatsApp" e informe o número de destino (com DDD;
   se nenhum DDI for digitado, assume-se `55`/Brasil).
3. Ao confirmar, a extensão baixa os arquivos selecionados (reaproveitando a
   sessão do Projudi, do mesmo jeito que a pré-visualização) e abre (ou
   reaproveita) uma aba do WhatsApp Web — sem nunca recarregá-la — na
   conversa do número informado, reaproveitando a sessão já
   aberta/conectada no navegador, se houver.
4. Assim que a conversa termina de carregar, os arquivos são anexados
   automaticamente — a extensão simula "colar" (Ctrl+V) os arquivos na
   caixa de mensagem, o mesmo mecanismo que o próprio WhatsApp Web já
   suporta manualmente (se isso falhar, tenta arrastar-e-soltar como
   alternativa). O envio da mensagem continua sendo uma ação manual do
   usuário, que pode revisar os anexos e adicionar uma legenda antes de
   enviar. Um aviso aparece no canto inferior esquerdo da tela do WhatsApp
   Web mostrando o andamento ("abrindo conversa…", "aguardando a conversa
   carregar…", "anexando arquivo(s)…", "arquivo(s) anexado(s)" ou um erro).

Importante: o WhatsApp Web não permite duas abas logadas ao mesmo tempo (a
segunda cai numa tela de conflito de sessão), e trocar a URL de uma aba
(mesmo reaproveitando-a) sempre recarrega a página inteira — o que parece
um "reinício de sessão" a cada envio. Por isso a extensão nunca navega uma
aba do WhatsApp Web já aberta:

- se já existe uma aba de `web.whatsapp.com` aberta, ela só é focada — a
  extensão então abre a conversa do número informado simulando o fluxo
  manual (clicar em "Nova conversa", digitar o número na busca e clicar no
  resultado), do mesmo jeito que você faria com o mouse, inteiramente por
  manipulação da página, sem nenhuma navegação/reload;
- essa mesma simulação é usada mesmo numa aba **nova** (criada quando
  nenhuma estava aberta ainda) — a aba é criada em branco
  (`web.whatsapp.com/`, sem número na URL) e a conversa é aberta do mesmo
  jeito assim que a página carrega;
- ela é sempre repetida a cada envio, mesmo que a conversa "pareça" já ser
  a certa — não há como saber com certeza, de fora, qual conversa está
  aberta no momento (você pode ter trocado de chat manualmente), e anexar
  no chat errado enviaria o documento para a pessoa errada;
- se, por algum motivo, não for possível abrir a conversa simulando esse
  fluxo (ex.: o WhatsApp Web mudou a tela de "Nova conversa"), a extensão
  cai de volta para navegar a aba para a URL `send?phone=...` como último
  recurso — o que nesse caso específico *recarrega* a página (mas ainda
  sem logout).

Essa parte depende de dois componentes adicionais:

- `src/background.js`: service worker que guarda temporariamente os
  arquivos selecionados (em `chrome.storage.local`, apenas até serem
  anexados ou expirarem após alguns minutos) e abre/reaproveita a aba do
  WhatsApp Web.
- `src/whatsapp.js`: content script injetado em `web.whatsapp.com` que
  busca esse conteúdo pendente e tenta anexá-lo à conversa aberta. Ele
  mostra o andamento na própria tela e também registra tudo no console do
  DevTools da aba do WhatsApp Web (mensagens com o prefixo
  `[Projudi WhatsApp]`), útil para diagnosticar se o anexo automático não
  funcionar.

Detalhe técnico: como a aba do WhatsApp Web reaproveitada nunca é
recarregada (ver acima), uma aba que já estava aberta antes de a extensão
ser instalada/atualizada não teria `src/whatsapp.js` rodando nela — content
scripts declarados no manifest só são injetados quando a página
carrega/navega. Por isso `src/background.js` sempre tenta avisar a aba por
mensagem primeiro e, se isso falhar (script ausente ou órfão de uma versão
anterior), reinjeta `src/whatsapp.js` nela por conta própria (via
`chrome.scripting`), sem precisar de nenhum F5 manual.

### Se o anexo automático não funcionar

1. Depois de atualizar os arquivos da extensão, sempre recarregue-a em
   `chrome://extensions` (ícone de recarregar no card da extensão) — só
   atualizar a página do Projudi ou do WhatsApp Web não é suficiente.
2. Confira se a aba do WhatsApp Web está mesmo reaproveitando a sessão
   (não deveria abrir uma aba nova a cada envio, só na primeira vez). Se
   continuar abrindo aba nova, abra `chrome://extensions`, clique em
   "Inspecionar visualizações: service worker" da extensão e veja se
   aparecem as mensagens `[Projudi WhatsApp] abas do WhatsApp Web
   encontradas: ...` — se aparecer `0` mesmo com uma aba do WhatsApp Web já
   aberta, feche todas as abas de `web.whatsapp.com`, deixe só uma aberta e
   logada, e tente de novo.
3. Ao abrir o DevTools para ver os logs de `src/whatsapp.js`, confirme que
   ele está inspecionando mesmo a aba do **WhatsApp Web** — se o DevTools
   estiver "solto" (janela separada), ele fica preso à aba que estava em
   foco quando foi aberto, e trocar de aba clicando nela não muda isso;
   feche e abra o DevTools de novo com a aba do WhatsApp Web em foco, e
   confira que a URL mostrada no painel é `web.whatsapp.com`.
3. Se a aba abre na conversa certa mas o arquivo não aparece anexado, ou
   se a conversa não abre e a aba acaba recarregando mesmo já estando
   aberta, abra o DevTools (F12) **na aba do WhatsApp Web** e veja as
   mensagens `[Projudi WhatsApp]` no console — elas indicam em qual etapa
   parou (abrir a conversa sem recarregar, colar, arrastar-e-soltar).
   Isso normalmente indica que o WhatsApp Web mudou a estrutura da tela
   (botão de "Nova conversa", campo de busca, caixa de mensagem, etc.) e
   os seletores usados por `src/whatsapp.js` precisam de ajuste.

Limitações:

- É necessário que o WhatsApp Web já esteja conectado (QR Code lido) no
  navegador; caso contrário, a aba abre normalmente, mas os arquivos não
  são anexados (a extensão espera até 60s pela conversa carregar e depois
  desiste silenciosamente).
- A simulação de anexar arquivos depende da estrutura de tela atual do
  WhatsApp Web (área principal `#main` com uma caixa de mensagem editável);
  se o WhatsApp alterar esse layout, o anexo automático pode parar de
  funcionar — a conversa ainda abre normalmente e os arquivos podem ser
  anexados manualmente.
- Nenhum arquivo, número de telefone ou mensagem é armazenado além do
  tempo necessário para abrir a conversa e anexar os documentos.

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
