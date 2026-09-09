# Projudi/SEEU - Pré-visualização de Documentos

Extensão de navegador (Chrome/Edge, Manifest V3) que resolve dois problemas
do dia a dia no Projudi (TJPR) e no SEEU — os dois usam o mesmo padrão de
link de documento (`<a class="link" href=".../arquivo.do?...">`), então a
extensão funciona da mesma forma nos dois sistemas:

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

1. Um content script (`src/content.js`) é injetado nas páginas de processo
   do Projudi (`processo.do`) e do SEEU (qualquer página em
   `seeu.pje.jus.br/seeu/`, incluindo a tela de movimentações/autos do
   processo, carregada em `visualizacaoProcesso.do`).
2. Ele identifica os links de arquivo da movimentação, que seguem o mesmo
   padrão nos dois sistemas:
   ```html
   <a target="_blank" class="link" href=".../arquivo.do?_tj=...">
       Certidao de Baixa.pdf
   </a>
   ```
3. Ao detectar o mouse parado sobre um desses links por ~350ms, abre um
   painel (`<iframe>`) carregando a própria URL do `arquivo.do`. Como o
   iframe está na mesma origem do sistema (Projudi ou SEEU), ele reaproveita
   a sessão/cookies já autenticados do usuário — nenhuma credencial extra é
   usada ou armazenada pela extensão.
4. O painel some automaticamente ao tirar o mouse do link e do próprio
   painel (com uma pequena tolerância para permitir mover o cursor até
   ele), ou pode ser fechado com o botão "✕" ou a tecla `Esc`. Também há um
   atalho "Abrir em nova aba" para o fluxo tradicional, quando necessário.

## Pendências (Análise de Juntadas / Conclusões) — só no Projudi

Esse recurso depende de uma tela específica do Projudi
(`analisarJuntada.do`) que não existe no SEEU; lá, a pré-visualização
funciona normalmente para os links de documento das movimentações (seção
anterior), só esse quadro de Pendências que não se aplica.

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
   se nenhum DDI for digitado, assume-se `55`/Brasil) — ou escolha um
   destinatário já salvo (ver "Destinatários salvos" abaixo).
3. Ao confirmar, a extensão baixa os arquivos selecionados (reaproveitando a
   sessão do Projudi/SEEU, do mesmo jeito que a pré-visualização — o
   download em si é feito pelo `src/background.js`, não pela página, porque
   alguns sistemas como o SEEU redirecionam o link do documento para um
   armazenamento externo com CORS bloqueado para leitura direto da página)
   e abre (ou reaproveita) uma aba do WhatsApp Web na conversa do número
   informado, reaproveitando a sessão já aberta/conectada no navegador, se
   houver.
4. Assim que a conversa termina de carregar, os arquivos são anexados
   automaticamente — a extensão simula "colar" (Ctrl+V) os arquivos na
   caixa de mensagem, o mesmo mecanismo que o próprio WhatsApp Web já
   suporta manualmente (se isso falhar, tenta arrastar-e-soltar como
   alternativa). O envio da mensagem continua sendo uma ação manual do
   usuário, que pode revisar os anexos e adicionar uma legenda antes de
   enviar. Um aviso aparece no canto inferior esquerdo da tela do WhatsApp
   Web mostrando o andamento ("aguardando a conversa carregar…", "anexando
   arquivo(s)…", "arquivo(s) anexado(s)" ou um erro).

### Destinatários salvos

O painel de envio tem uma lista de destinatários salvos (nome + número),
parecida com um catálogo de contatos de e-mail:

- **Salvar**: clique em "+ Novo" (dentro do painel de envio), preencha nome
  e número e confirme. Se já houver um número digitado no campo principal,
  ele já vem preenchido no formulário.
- **Usar**: clique em qualquer destinatário da lista para preencher o campo
  de número com ele.
- **Pesquisar**: digite no campo de busca para filtrar a lista pelo nome.
- **Favoritar**: clique na estrela (☆/★) ao lado do nome — favoritos sempre
  aparecem no topo da lista, antes dos demais (ordenados por ordem
  alfabética dentro de cada grupo).
- **Remover**: clique no "✕" ao lado do destinatário (pede confirmação
  antes de remover).

A lista é guardada em `chrome.storage.local` (armazenamento da própria
extensão, não do site), então é a mesma lista tanto no Projudi quanto no
SEEU, e continua disponível depois de fechar e reabrir o navegador.

**Importante — confira sempre o destinatário antes de clicar em enviar.**
Documentos de processo são sensíveis; esse segundo antes de clicar em
"Enviar" vale a pena mesmo com a abertura da conversa sendo confiável (ver
abaixo).

Como a conversa certa é aberta: o WhatsApp Web não permite duas abas
logadas ao mesmo tempo (a segunda cai numa tela de conflito de sessão), e
não há uma forma de simular clique/busca na interface que seja garantida
de acertar o destinatário — uma versão anterior desta extensão tentou isso
e chegou a abrir a conversa de outra pessoa por engano. Por isso a
extensão sempre abre a conversa através do link oficial
`web.whatsapp.com/send?phone=<número>` (o "clique para conversar" que o
próprio WhatsApp Web disponibiliza), que é a única forma garantida de abrir
no destinatário certo:

- se já existe uma aba de `web.whatsapp.com` aberta **na mesma conversa**
  que o número informado, ela só é focada, sem recarregar — a extensão
  avisa o content script já injetado nela para buscar o novo arquivo
  pendente e anexá-lo;
- se a aba já aberta está numa conversa **diferente**, ela é reaproveitada
  mas precisa ser navegada para a URL da conversa certa — isso recarrega a
  página do WhatsApp Web (não tem como evitar usando esse link), mas a
  sessão/login continua a mesma, não é um logout;
- só é aberta uma aba **nova** se nenhuma estiver aberta ainda (também já
  direto na conversa certa).

Essa parte depende de dois componentes adicionais:

- `src/background.js`: service worker que baixa os arquivos selecionados
  (a partir do seu próprio contexto de extensão — necessário para
  contornar CORS em sistemas que redirecionam o link do documento para um
  armazenamento externo, como o SEEU faz para um bucket S3), guarda
  temporariamente o resultado (em `chrome.storage.local`, apenas até serem
  anexados ou expirarem após alguns minutos) e abre/reaproveita a aba do
  WhatsApp Web na conversa certa.
- `src/whatsapp.js`: content script injetado em `web.whatsapp.com` que
  busca esse conteúdo pendente e anexa os arquivos assim que a conversa
  termina de carregar. Ele mostra o andamento na própria tela e também
  registra tudo no console do DevTools da aba do WhatsApp Web (mensagens
  com o prefixo `[Projudi WhatsApp]`), útil para diagnosticar se o anexo
  automático não funcionar.

Detalhe técnico: quando a aba já está na conversa certa e não precisa ser
navegada, `src/background.js` avisa o content script por mensagem — mas
uma aba que já estava aberta antes de a extensão ser instalada/atualizada
pode não ter `src/whatsapp.js` rodando nela (content scripts declarados no
manifest só são injetados quando a página carrega/navega) ou pode estar
com uma versão órfã dele (o canal com `chrome.runtime` é cortado quando a
extensão recarrega). Por isso, se avisar por mensagem falhar,
`src/background.js` reinjeta `src/whatsapp.js` na aba por conta própria
(via `chrome.scripting`), sem precisar de nenhum F5 manual.

### Se o anexo automático não funcionar

1. Depois de atualizar os arquivos da extensão, sempre recarregue-a em
   `chrome://extensions` (ícone de recarregar no card da extensão) — só
   atualizar a página do Projudi ou do WhatsApp Web não é suficiente.
2. Ao abrir o DevTools para ver os logs de `src/whatsapp.js`, confirme que
   ele está inspecionando mesmo a aba do **WhatsApp Web** — se o DevTools
   estiver "solto" (janela separada), ele fica preso à aba que estava em
   foco quando foi aberto, e trocar de aba clicando nela não muda isso;
   feche e abra o DevTools de novo com a aba do WhatsApp Web em foco, e
   confira que a URL mostrada no painel é `web.whatsapp.com`.
3. Se a conversa abre certa mas o arquivo não aparece anexado, abra o
   DevTools (F12) **na aba do WhatsApp Web** e veja as mensagens
   `[Projudi WhatsApp]` no console — elas indicam em qual etapa parou
   (conversa não carregou, colar, arrastar-e-soltar). Isso normalmente
   indica que o WhatsApp Web mudou a estrutura da caixa de mensagem e o
   seletor usado por `src/whatsapp.js` precisa de ajuste.

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
4. Abra um processo no Projudi (TJPR) ou no SEEU e passe o mouse sobre um
   documento na aba Movimentações.

## Convivência com o AzFlow no SEEU

O AzFlow é uma extensão de produtividade jurídica muito usada junto com o
SEEU, e oferece uma pré-visualização de documentos parecida com a desta
extensão. Como as duas reagem aos mesmos eventos nativos do navegador
(mouseover/mouseout), tentar fazer as duas coexistirem sem critério gera
conflito — em um teste anterior, interceptar esses eventos para dar
prioridade a esta extensão chegou a quebrar o reposicionamento da própria
barra de botões do AzFlow, que depende deles para funcionar.

A solução adotada: **só no domínio do SEEU**, esta extensão detecta se o
AzFlow está ativo (procurando pelos atributos/classes com prefixo
`azflow-`/`data-azflow-` que ele injeta na página) e, se estiver, **não
abre sua própria pré-visualização de documentos** — deixa o AzFlow cuidar
disso sozinho, sem nenhuma interferência. As funcionalidades que só esta
extensão oferece (seleção de documentos e envio por WhatsApp) continuam
funcionando normalmente, já que não há nada do AzFlow para conflitar ali.
No Projudi esse comportamento não se aplica — a pré-visualização desta
extensão funciona normalmente, com ou sem o AzFlow instalado.

Se o AzFlow mudar a forma como se identifica na página e a detecção parar
de funcionar (a pré-visualização desta extensão voltar a aparecer no SEEU
mesmo com o AzFlow ativo), ajuste `AZFLOW_MARKER_SELECTOR` em
`src/content.js`.

## Limitações conhecidas

- Funciona apenas para documentos que o navegador consiga exibir dentro de
  um `<iframe>` (PDF é o caso comum, via visualizador nativo do
  Chrome/Edge). Alguns tipos de arquivo podem ser baixados diretamente pelo
  navegador em vez de exibidos — nesse caso, use "Abrir em nova aba".
- O `host_permissions` do `manifest.json` está restrito a `*.tjpr.jus.br`
  (Projudi) e `seeu.pje.jus.br` (SEEU). Para usar em outro Tribunal que
  também utilize o Projudi, ou outro domínio do SEEU, ajuste os padrões de
  URL em `manifest.json`.
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
