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
tela.

Ao clicar no botão:

1. Os arquivos marcados são baixados pela extensão reaproveitando a sessão
   já autenticada do Projudi (mesmo mecanismo usado na pré-visualização).
2. A extensão autentica o usuário no Outlook institucional (Microsoft
   Entra ID / Azure AD, via Microsoft Graph) e cria um **rascunho de
   e-mail** já com os arquivos selecionados anexados.
3. Esse rascunho é aberto numa **janela pop-up menor**, sobreposta à janela
   do Projudi (não uma aba nova), no próprio Outlook Web — bastando
   preencher destinatário, assunto e mensagem, e clicar em Enviar.

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

### Modo alternativo sem Azure AD (fallback, experimental)

Se o cadastro no Azure AD não for viável, é possível usar o modo
**"Outlook Web (sem Azure AD)"**, selecionável nas opções da extensão
(`chrome://extensions` → "Detalhes" → "Opções da extensão" → "Modo de
envio"). Nesse modo:

1. A extensão abre o **outlook.office.com de verdade** num pop-up, já com
   um link direto para a tela de novo e-mail (com o assunto preenchido).
2. O usuário faz **login normalmente** com usuário e senha da conta
   institucional, exatamente como abriria o Outlook Web manualmente — não
   há nenhum aplicativo Azure AD envolvido.
3. Assim que a tela de novo e-mail termina de carregar, o content script
   `src/owa-attach.js` (injetado apenas nas páginas do próprio Outlook Web)
   anexa automaticamente os documentos selecionados, simulando uma seleção
   de arquivos feita pelo usuário no campo de anexo.
4. O modo **"Automático"** (padrão) usa o Graph quando o Client ID estiver
   configurado e cai automaticamente neste modo quando não estiver — ou
   seja, a extensão funciona "out of the box" sem precisar de nenhum
   cadastro, só com uma robustez menor (veja limitações abaixo).

Esse modo **não depende de nenhuma configuração de TI**, mas é uma
automação não-oficial da interface do Outlook Web (não existe API pública
da Microsoft para isso), então é o modo Graph que deve ser preferido sempre
que o cadastro no Azure AD for possível.

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
- **Modo Outlook Web (fallback):** depende de o Outlook Web expor um
  `<input type="file">` "clássico" por trás do botão de anexar — isso não é
  documentado nem garantido pela Microsoft e pode mudar a qualquer
  atualização da interface, quebrando o anexo automático (nesse caso, o
  usuário verá um aviso e precisará anexar os arquivos manualmente, já que
  eles já foram baixados). Este repositório não tem acesso a uma conta real
  do Outlook Web para testar/validar esse comportamento; se parar de
  funcionar, inspecione o botão "Anexar" no navegador (botão direito →
  Inspecionar) para localizar o campo real e ajustar o seletor em
  `src/owa-attach.js`. Os anexos pendentes ficam guardados por até 10
  minutos (`chrome.storage.local`) esperando o pop-up carregar; depois
  disso, expiram e é preciso selecionar os arquivos novamente no Projudi.
