# Projudi - Documentos: Pré-visualização e Envio por E-mail

Extensão de navegador (Chrome/Edge, Manifest V3) que resolve dois problemas
na tela **Movimentações** do Projudi:

1. Para ler a íntegra de um documento anexado é preciso clicar no link e
   abri-lo em outra aba (veja "Pré-visualização" abaixo).
2. Para enviar um ou mais documentos do processo por e-mail, é preciso
   baixar cada arquivo manualmente e anexá-los um a um no Outlook (veja
   "Envio por e-mail" abaixo).

## Pré-visualização de Documentos

Com a extensão instalada, basta **passar o mouse sobre o nome do arquivo**
(ex.: `Certidao de Baixa.pdf`) para que a íntegra do documento apareça em um
painel flutuante sobreposto à própria tela de movimentações — sem precisar
trocar de aba. A ideia é a mesma já oferecida pelo eproc e pela extensão
AzFlow.

## Envio por E-mail (Outlook)

Ao lado de cada arquivo listado numa movimentação (os mesmos links de
`arquivo.do`, que aparecem ao expandir o "+" da movimentação), a extensão
insere uma checkbox. Assim que pelo menos um arquivo é marcado, surge um
botão flutuante **"Enviar por e-mail (N)"** no canto inferior direito da
tela, logo acima de um segundo botão, **"👥 Destinatários"**, sempre visível.

Ao clicar no botão:

1. Se houver destinatários salvos como preferência (veja "Destinatários
   favoritos" abaixo), é exibido um seletor para escolher um ou mais antes
   de prosseguir (ou pular a etapa, se preferir preencher na hora).
2. Os arquivos marcados são baixados pela extensão reaproveitando a sessão
   já autenticada do Projudi (mesmo mecanismo usado na pré-visualização).
3. A extensão autentica o usuário no Outlook institucional (Microsoft
   Entra ID / Azure AD, via Microsoft Graph) e cria um **rascunho de
   e-mail** já com os arquivos selecionados anexados e, se algum
   destinatário foi escolhido, com o campo "Para" já preenchido.
4. Esse rascunho é aberto numa **janela pop-up menor**, sobreposta à janela
   do Projudi (não uma aba nova), no próprio Outlook Web — bastando
   preencher o que faltar (destinatário, se não escolhido antes, assunto e
   mensagem) e clicar em Enviar.

### Destinatários favoritos

O botão **"👥 Destinatários"** (sempre visível, independente de haver
arquivos selecionados) abre uma tela para gerenciar até **200**
destinatários salvos como preferência:

- **Adicionar**: informe Nome e E-mail e clique em "+ Adicionar".
- **Remover**: clique no ícone 🗑 ao lado do destinatário.
- **Priorizar**: clique na estrela (☆ → ★) para marcar um destinatário
  como prioritário — destinatários prioritários aparecem primeiro na
  lista, e dentro de cada grupo (prioritários / demais) a ordem é
  alfabética pelo nome.
- **Buscar**: o campo com a lupa 🔍 filtra a lista por nome ou e-mail.

Ao clicar em **"Enviar por e-mail"** com pelo menos um destinatário salvo,
essa mesma lista aparece antes de prosseguir, com uma checkbox por
destinatário (permite marcar mais de um) e dois botões no rodapé:
**"Pular"** (segue sem pré-selecionar destinatário) ou **"Prosseguir"**
(usa os marcados e continua o fluxo normal — download dos anexos, abertura
do Outlook, etc.).

Os destinatários salvos ficam em `chrome.storage.local`, portanto são
locais ao navegador/perfil onde a extensão está instalada (não são
sincronizados entre computadores nem enviados a nenhum servidor).

### Configuração necessária (feita uma única vez pelo TI)

O envio usa a Microsoft Graph API, então é preciso um aplicativo cadastrado
no Azure AD / Microsoft Entra ID do Tribunal:

1. No [Portal do Azure](https://portal.azure.com) → **Microsoft Entra ID**
   → **Registros de aplicativo** → **Novo registro**.
2. Tipo de conta: apenas o diretório da organização (single-tenant) é
   suficiente.
3. Em **Autenticação** → **Adicionar uma plataforma** → **Aplicativos
   móveis e de desktop**, cadastre como Redirect URI o valor retornado por
   `chrome.identity.getRedirectURL()` para a extensão instalada — algo como
   `https://<ID-DA-EXTENSAO>.chromiumapp.org/`. Esse ID varia por instalação
   e pode ser lido abrindo o console da extensão (`chrome://extensions` →
   "Detalhes" → "Inspecionar visualizações" → console → digite
   `chrome.identity.getRedirectURL()`), ou é fixo se a extensão for
   publicada/fixada com uma chave.
4. Em **Permissões de API**, adicione a permissão **delegada**
   `Mail.ReadWrite` (Microsoft Graph) e conceda **consentimento do
   administrador**.
5. Copie o **Client ID (Application ID)** gerado.
6. Na extensão, acesse `chrome://extensions` → "Detalhes" → "Opções da
   extensão" e informe o Client ID (e o Tenant ID, se a organização exigir
   restringir a um tenant específico em vez de "common").

No primeiro envio, o navegador abrirá a tela de login padrão da
Microsoft para o usuário autorizar o acesso à própria caixa de Outlook; nas
próximas vezes o token é reaproveitado/renovado automaticamente.

### Modo alternativo sem Azure AD (fallback semiautomático)

Se o cadastro no Azure AD não for viável, é possível usar o modo
**"Outlook Web (sem Azure AD)"**, selecionável nas opções da extensão
(`chrome://extensions` → "Detalhes" → "Opções da extensão" → "Modo de
envio"). Nesse modo:

1. A extensão baixa os documentos selecionados para a pasta **Downloads**
   do computador do usuário.
2. Em seguida, abre o **outlook.office.com de verdade** num pop-up, já com
   um link direto para a tela de novo e-mail (com o assunto e, se algum
   destinatário foi escolhido no seletor, o campo "Para" preenchidos).
3. O usuário faz **login normalmente** com usuário e senha da conta
   institucional, exatamente como abriria o Outlook Web manualmente — não
   há nenhum aplicativo Azure AD envolvido.
4. Um aviso aparece no topo da tela do Outlook (`src/owa-attach.js`) com os
   nomes dos arquivos baixados, orientando a anexá-los pelo próprio botão
   **"Anexar arquivo" → "Navegar neste computador"**, escolhendo o(s)
   arquivo(s) na pasta Downloads.
5. O modo **"Automático"** (padrão) usa o Graph quando o Client ID estiver
   configurado e cai automaticamente neste modo quando não estiver — ou
   seja, a extensão funciona "out of the box" sem precisar de nenhum
   cadastro, mesmo que com um passo manual a mais (veja abaixo por que o
   anexo não é 100% automático nesse modo).

**Por que o anexo não é automático aqui?** Foram testadas três formas de
anexar sozinho, e nenhuma funcionou:

1. Preencher o campo de anexo (`<input type="file">`) via script: o
   Outlook Web trata esse anexo como vindo de um evento "não confiável"
   (`isTrusted: false`) e força um fluxo de upload para o OneDrive que
   falha para um arquivo montado em memória (erro "Não foi possível
   anexar... Tente novamente mais tarde").
2. Simular o "drop" inteiro via `dispatchEvent`: o Outlook nem chega a
   reconhecer a operação como um arraste de arquivo válido.
3. Um elemento arrastável de verdade (`draggable="true"`), para que o
   `dragstart` fosse disparado por um gesto real do usuário (mousedown/
   mousemove genuínos): mesmo assim o Outlook Web não mostrou a interface
   de destino do arraste que aparece normalmente ao arrastar um arquivo
   real — indicando alguma verificação adicional da origem do arraste que
   não foi possível replicar de dentro de um content script.

Em todos os três casos, o **mesmo arquivo anexado manualmente** pelo botão
"Anexar arquivo" → "Navegar neste computador" funciona sem problemas — por
isso este modo ficou semiautomático (baixa os arquivos e orienta esse
caminho manual comprovado), em vez de insistir em mais automação de DOM
sem garantia de funcionar.

Esse modo **não depende de nenhuma configuração de TI**, mas é o modo Graph
que deve ser preferido sempre que o cadastro no Azure AD for possível, já
que é o único caminho 100% automático.

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
- O envio por e-mail depende do cadastro prévio de um aplicativo no Azure
  AD pelo TI (Client ID com permissão `Mail.ReadWrite`) — veja a seção
  "Envio por E-mail" acima. Sem essa configuração, o botão exibirá um erro
  pedindo para configurar as opções da extensão.
- A janela do Outlook é aberta como um pop-up separado (não um `<iframe>`),
  pois o Outlook Web bloqueia ser exibido dentro de outra página
  (cabeçalhos `X-Frame-Options`/CSP). O pop-up é posicionado e dimensionado
  para ficar menor e sobreposto à janela do Projudi, mas ainda é uma janela
  própria do sistema operacional, não uma camada dentro da aba.
- Documentos de até 3MB são anexados diretamente; arquivos maiores usam o
  upload em partes da Microsoft Graph. O limite total de anexos por e-mail
  segue as regras do Outlook/Exchange da organização (normalmente 25MB).
- **Modo Outlook Web (fallback):** o anexo não é 100% automático (veja o
  porquê na seção "Modo alternativo sem Azure AD" acima) — o usuário
  precisa anexar manualmente pelo botão "Anexar arquivo" → "Navegar neste
  computador", escolhendo o(s) arquivo(s) já baixados. Os nomes dos
  arquivos ficam guardados temporariamente por até 10 minutos
  (`chrome.storage.local`) esperando o pop-up do Outlook carregar; depois
  disso, expiram (o aviso simplesmente não aparece) e é preciso selecionar
  os arquivos novamente no Projudi — mas os arquivos já baixados continuam
  na pasta Downloads normalmente.
- Os downloads usam a permissão `downloads` da extensão; se o navegador
  estiver configurado para **perguntar onde salvar cada arquivo**
  (em vez de salvar direto na pasta Downloads), o usuário verá um diálogo
  de salvar por arquivo baixado.
