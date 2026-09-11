# Projudi/SEEU - Documentos: Pré-visualização, WhatsApp e E-mail

Extensão de navegador (Chrome/Edge, Manifest V3) que resolve problemas do
dia a dia no Projudi (TJPR) e no SEEU — os dois usam o mesmo padrão de
link de documento (`<a class="link" href=".../arquivo.do?...">`), então a
extensão funciona da mesma forma nos dois sistemas:

1. na tela **Movimentações**, para ler a íntegra de um documento anexado é
   preciso clicar no link e abri-lo em outra aba (veja "Pré-visualização de
   Documentos" abaixo);
2. não há como enviar rapidamente um ou mais documentos do processo por
   WhatsApp — é preciso baixar cada arquivo e depois anexá-lo manualmente
   numa conversa do WhatsApp Web (veja "Envio de documentos por WhatsApp
   Web" abaixo);
3. para enviar um ou mais documentos do processo por e-mail, é preciso
   baixar cada arquivo manualmente e anexá-los um a um no Outlook (veja
   "Envio por E-mail (Outlook)" abaixo);
4. no Projudi, o painel lateral **Ações** (Intimar Partes, Ordenar
   Cumprimentos, Realizar Remessa, Enviar Concluso, Apensar, etc.) fica
   comprido e é preciso rolar a tela para achar a ação desejada (veja
   "Ações rápidas" abaixo).

## Pré-visualização de Documentos

Com a extensão instalada, basta **passar o mouse sobre o nome do arquivo**
(ex.: `Certidao de Baixa.pdf`) para que a íntegra do documento apareça em um
painel flutuante sobreposto à própria tela de movimentações — sem precisar
trocar de aba. A ideia é a mesma já oferecida pelo eproc e pela extensão
AzFlow.

## Envio por E-mail (Outlook)

Ao lado de cada arquivo listado numa movimentação (os mesmos links de
`arquivo.do`, que aparecem ao expandir o "+" da movimentação), a extensão
insere uma checkbox. Dois botões flutuantes ficam **sempre visíveis** no
canto inferior direito da tela: **"👥 Destinatários"** e **"Enviar por
e-mail"** — este último funciona com ou sem nenhum arquivo marcado, para
enviar um e-mail sem anexar documentos dos autos quando for o caso (nesse
caso mostra só "Enviar por e-mail"; com arquivos marcados, mostra a
contagem, ex.: "Enviar por e-mail (2)").

Ao clicar em "Enviar por e-mail":

1. Se houver destinatários salvos como preferência (veja "Destinatários
   favoritos" abaixo), é exibido um seletor para escolher um ou mais antes
   de prosseguir (ou pular a etapa, se preferir preencher na hora).
2. Os arquivos marcados (se houver) são baixados pelo **background script**
   da extensão (não pela página), reaproveitando a sessão já autenticada
   — necessário porque, no SEEU, o link do arquivo redireciona para um
   bucket S3 com URL assinada que bloqueia `fetch()` feito a partir da
   própria página (erro de CORS); o service worker da extensão não sofre
   essa restrição para os domínios liberados no `manifest.json`.
3. A extensão autentica o usuário no Outlook institucional (Microsoft
   Entra ID / Azure AD, via Microsoft Graph) e cria um **rascunho de
   e-mail** já com os arquivos selecionados anexados (se houver), o campo
   "Para" preenchido (se algum destinatário foi escolhido) e um texto
   padrão no início do corpo (veja "Texto padrão do e-mail" abaixo).
4. Esse rascunho é aberto numa **janela pop-up menor**, sobreposta à janela
   do Projudi (não uma aba nova), no próprio Outlook Web — bastando
   preencher o que faltar (destinatário, se não escolhido antes, assunto e
   o restante da mensagem) e clicar em Enviar.

### Texto padrão do e-mail

Todo e-mail já sai com estas duas linhas no início do corpo, extraídas
diretamente da tela do processo:

```
REF. AUTOS Nº (0004608-81.2024.8.16.0033)
JUÍZO: (Vara Criminal de Pinhais)
```

A extração muda um pouco conforme o sistema, mas o resultado final é igual:

- **Número dos autos**: no Projudi vem do elemento `<em class="attention">`;
  no SEEU (e como reserva geral, caso esse elemento não exista) vem do
  próprio título da página, que em ambos os sistemas contém o número do
  processo.
- **Juízo**: no SEEU vem do campo "Juízo:" da tabela de informações do
  processo (`td[data-label="juízo"]`); no Projudi vem do link "área de
  atuação" do usuário no cabeçalho (`#areaatuacao`).

Se nenhuma dessas fontes for encontrada na página (ex.: layout diferente
numa atualização do sistema), a linha correspondente simplesmente não é
incluída.

### Destinatários favoritos

O botão **"👥 Destinatários"** abre uma tela para gerenciar até **200**
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

### Remetentes salvos (campo "De")

No modo **"Outlook Web (sem Azure AD)"**, o botão **"✉️ Remetente"** abre
uma tela para cadastrar até **20** contas remetentes (Nome + E-mail),
editar (✏️), remover (🗑) e marcar uma delas com a estrela (☆ → ★) como
**padrão**. Toda vez que o Outlook abrir pela extensão:

1. O script (`src/owa-attach.js`) revela o campo **"De"** automaticamente,
   clicando na guia **Opções** da faixa de opções e marcando a caixinha
   **"Mostrar de"** (só se ainda não estiver marcada).
2. Em seguida, tenta selecionar nele o remetente marcado como padrão.

**Pré-requisito obrigatório, fora do controle da extensão:** a conta
autenticada precisa já ter a permissão **"Enviar como"** (configuração do
Exchange/TI) na caixa marcada como padrão — sem isso, o Outlook nem
oferece essa conta na lista para escolher, e a seleção automática não tem
efeito (o campo "De" continua revelado, só não muda o remetente).

A etapa de **selecionar** o remetente no campo "De" é experimental: ao
contrário de revelar a caixinha "Mostrar de" (testado e funcionando), não
temos o HTML real do controle "De" nem da lista de contas que ele abre, só
um palpite razoável de seletores (`src/owa-attach.js`,
`findFromControl()`/`findFromOption()`). Se não funcionar, inspecione o
campo "De" no Outlook Web (botão direito → Inspecionar) e ajuste esses
seletores — o console do navegador (F12, filtro "Projudi") mostra em qual
etapa a automação parou.

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
   arquivo(s) na pasta Downloads. O mesmo script também tenta revelar o
   campo **"De"**: clica na guia **Opções** da faixa de opções e marca a
   caixinha **"Mostrar de"** (só se ainda não estiver marcada), permitindo
   trocar o remetente manualmente pelo próprio seletor do Outlook — só
   funciona se o usuário já tiver permissão de "Enviar como" na conta
   desejada (configuração do Exchange/TI, fora do controle da extensão);
   se o Outlook não mostrar nenhuma opção além da conta padrão, é porque
   essa permissão não está configurada.
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

## Ações rápidas (painel "Ações" do Projudi)

Só no Projudi. A tela de Movimentações tem um painel lateral **Ações** (e
um segundo bloco **Outras Ações** logo abaixo) com uma lista comprida de
links — Intimar Partes, Ordenar Cumprimentos, Realizar Remessa, Enviar
Concluso, Apensar, etc. — que obriga a rolar a página até achar a ação
desejada.

A extensão adiciona **um botão flutuante por grupo de ações** — Concluso,
Remessa, Ordenações, Partes, Outras — lado a lado, no mesmo canto da tela
dos botões de WhatsApp/e-mail (posicionando-se ao lado deles quando
presentes):

- **Concluso**: Enviar Concluso
- **Remessa**: Realizar Remessa, Remessa Eletrônica para o Tribunal de
  Justiça
- **Ordenações**: Ordenar Cumprimentos, Ordenar RPV, Ordenar Expedição
  BNMP
- **Partes**: Intimar Partes, Notificar Partes, Citar Partes, Intimar
  Peritos e Auxiliares da Justiça
- **Outras**: Interromper Prazo, Suspender ou Sobrestar Processo,
  Transitar em Julgado, Declínio de competência para a Segunda Instância,
  Arquivar Processo, Apensar, Desapensar

Cada botão abre um painel com as ações daquele grupo — o conteúdo do
painel depende de qual tela do processo você está vendo, já que o painel
"Ações" do Projudi só existe numa tela específica:

- **Na tela com o painel "Ações"** (chegando lá manualmente, ou pelo modo
  "Ir e abrir" abaixo): o painel mostra só as ações que existirem no
  processo agora (ex.: se já estiver apensado, só "Desapensar" aparece,
  não "Apensar"); se nenhuma ação do grupo existir para este processo, uma
  mensagem avisa.
- **Numa tela intermediária do processo, com o botão "Movimentar a Partir
  Desta Movimentação"** (a tela que abre ao clicar num evento da aba
  Movimentações): o painel mostra todas as ações do grupo, cada uma com um
  botão **"Ir e abrir"** — ele clica sozinho em "Movimentar a Partir Desta
  Movimentação" (navegação de página inteira do próprio Projudi) e, ao
  chegar na tela de Ações, abre a ação escolhida automaticamente. Esse
  passo é sempre mecânico (é literalmente o mesmo botão que você clicaria
  na sequência normal), então a extensão pode fazê-lo sozinha com
  segurança.
- **Em qualquer outra tela** (ex.: a lista de Movimentações do processo):
  o painel só mostra um aviso explicando os dois passos manuais para
  chegar à tela de Ações — clicar num evento válido (não tachado) da
  coluna "Evento" e, na tela seguinte, em "Movimentar a Partir Desta
  Movimentação". **A extensão nunca escolhe esse evento por conta
  própria** — qual movimentação usar como base para uma nova ação é uma
  decisão processual sua, não uma formalidade mecânica.

Para cada ação, o painel oferece:

- **"Abrir"**: localiza o link nativo correspondente já presente na
  página (mesmo texto, mesmo elemento `<a class="link">`, com o `onclick`
  que o próprio Projudi já definiu) e simula um clique nele — o mesmo
  diálogo (`openDialog`/`openDialogMaximized`) ou confirmação que
  apareceria clicando diretamente no painel "Ações" aparece normalmente, e
  o preenchimento/confirmação continua manual. Isso evita a extensão
  precisar reconstruir as URLs de cada ação (cujo token de sessão,
  `_tj=...`, expira e é específico de cada usuário) — ela sempre clica no
  elemento que já está na página.
- **Preferências salvas** (★): veja a seção seguinte.

### Preferências (preencher e confirmar com um clique)

Além de abrir o diálogo em branco, é possível salvar o preenchimento de um
diálogo como **preferência** e reaplicá-lo depois com poucos cliques:

1. Clique em **"+ Nova preferência"** na ação desejada — isso abre o
   diálogo normal do Projudi (igual ao botão "Abrir").
2. Preencha o diálogo como faria manualmente (destinatário, tipo de
   ordem, texto, etc.).
3. Com o diálogo ainda aberto, clique em **"💾 Salvar como preferência"**
   (uma barra aparece no topo da tela) e dê um nome a ela — ex.: "Intimar
   assistente social padrão". Nada é enviado ao Projudi nesse passo: você
   ainda decide se confirma o formulário manualmente, como sempre.
4. Da próxima vez, clique na preferência salva (aparece como um chip
   **"★ nome-da-preferência"** abaixo da ação, com um 🗑 para remover) — a
   extensão abre o mesmo diálogo, repreenche os mesmos campos
   automaticamente e mostra uma barra de confirmação única, do tipo
   `Confirmar "Enviar Concluso" com a preferência "..."? [✅ Sim, executar]
   [Cancelar]`. Só ao clicar em **"✅ Sim, executar"** a extensão clica no
   botão de confirmar/enviar do próprio Projudi — **esse é o passo que
   efetivamente realiza a ação processual**, então confira os campos
   preenchidos antes de confirmar.

As preferências (e o "+ Nova preferência") também funcionam a partir da
tela intermediária ("Movimentar a Partir Desta Movimentação"): nesse caso
elas primeiro dão o passo "Ir" (clicam nesse botão) e só então aplicam o
preenchimento/mostram a confirmação, na tela de Ações que acabou de
carregar.

**Como funciona por baixo dos panos e suas limitações:** como o Projudi
abre cada ação como uma janela "interna" da própria página (não uma aba
nova) e a extensão não tem acesso ao código-fonte desses diálogos, a
localização do formulário é **heurística**: ao salvar, ela usa o último
`<form>` visível da página com campos preenchíveis; ao aplicar uma
preferência, ela procura o `<form>` visível mais recente que contenha
algum campo com o mesmo nome do que foi salvo, e para confirmar procura um
botão cujo texto seja algo como "Confirmar", "Enviar", "Salvar", "OK" etc.
Campos ocultos (tokens de sessão, `_tj=...`) nunca são capturados nem
reescritos. Isso deve funcionar bem na maioria dos diálogos, mas **não foi
validado ao vivo no Projudi** (só a partir dos HTMLs estáticos das telas)
— sempre confira visualmente os campos preenchidos antes de clicar em
"Sim, executar", e se algo não funcionar como esperado, use "Abrir" e
preencha manualmente dessa vez.

As preferências ficam em `chrome.storage.local` (armazenamento local da
própria extensão, não enviado a nenhum servidor), organizadas por ação —
ex.: as preferências de "Ordenar Cumprimentos" não aparecem em "Ordenar
RPV".

## Como funciona

1. Os content scripts (`src/content.js` e `src/email.js`) são injetados nas
   páginas de processo do Projudi (`processo.do`) e do SEEU (qualquer
   página em `seeu.pje.jus.br/seeu/`, incluindo a tela de
   movimentações/autos do processo, carregada em
   `visualizacaoProcesso.do`).
2. Eles identificam os links de arquivo da movimentação, que seguem o mesmo
   padrão nos dois sistemas (o SEEU é construído sobre a mesma plataforma
   do Projudi):
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

Além dessa checagem específica (pré-visualização, só no SEEU), esta
extensão segue duas regras gerais, em qualquer sistema, para nunca alterar
a estrutura de outra extensão:

1. **Nunca insere nada dentro da árvore de elementos que outra extensão
   criou**, nem da barra de botões nativa da página — o botão "Enviar por
   WhatsApp" é sempre um elemento solto, anexado direto ao
   `document.body`, nunca filho/irmão de um elemento nativo ou de outra
   extensão.
2. **Nunca chama `stopPropagation()`/`stopImmediatePropagation()`** nos
   eventos do navegador (mouseover, mouseout, etc.) — outras extensões
   podem depender desses mesmos eventos para o próprio funcionamento, e
   "consumi-los" já quebrou o AzFlow numa tentativa anterior (ver acima).

## Posição do botão "Enviar por WhatsApp"

O botão usa `position: fixed`, mas sua posição é recalculada
continuamente (em cada rolagem, redimensionamento da janela, ou troca de
aba) — mesma técnica do recurso irmão de envio por e-mail:

- **Sem outros botões desta extensão na tela**: fica ancorado logo
  **acima da barra de ações** do processo (Pedido Incidental, Juntar
  Documento, ..., Voltar). Como ele é fixo e a posição é recalculada a
  cada evento de rolagem, o efeito visual é o botão "acompanhando" a
  página ao rolar — sempre logo acima da barra, enquanto ela estiver
  visível. Se você rolar além da barra (ela sair da tela), o botão fica
  ancorado ao rodapé da janela, em vez de tentar perseguir uma barra fora
  de vista.
- **Com botões de outra funcionalidade desta extensão fixados no canto da
  tela** (ex.: um recurso de envio por e-mail, reconhecido pelos
  ids/classes `#pdp-email-button`, `#pdp-recipients-button` ou
  `.pdp-email-visible`): o botão do WhatsApp se posiciona automaticamente
  **à esquerda deles**, alinhado na mesma altura do grupo — sem precisar
  de nenhuma configuração manual.

## Troca de abas do processo (Movimentações, Partes, etc.)

Ao trocar de aba dentro da tela do processo e voltar, o Projudi/SEEU pode
substituir um contêiner inteiro da página por conteúdo novo (em vez de só
mostrar/esconder o que já existia) — o que fazia o botão "Enviar por
WhatsApp", a pré-visualização e as caixinhas de seleção "sumirem", já que
os elementos que esta extensão tinha criado ficavam fora da árvore visível
do documento (ou eram removidos junto com o trecho da página em que
tinham sido inseridos).

A solução foi parar de inserir o botão como filho/irmão de qualquer
elemento nativo da página: o botão "Enviar por WhatsApp" é sempre um
elemento solto, anexado direto ao `document.body`, com posição fixa na
tela (`position: fixed`) — não depende de nenhum elemento nativo
continuar existindo no mesmo lugar. Isso também é proposital pelo motivo
2 abaixo (convivência com outras extensões). Além disso:

- a extensão reconcilia periodicamente (a cada ~700ms) o botão e as
  caixinhas de seleção dos documentos — recriando o que for necessário —
  e monitora `document.documentElement` em vez de `document.body` (o
  `<body>` é o que costuma ser trocado; o `<html>`, praticamente nunca);
- a seleção de arquivos em andamento (`selectedDocs`) não depende do DOM
  antigo, então sobrevive normalmente a essas trocas — as caixinhas
  recriadas já nascem marcadas para os documentos que ainda estavam
  selecionados;
- o painel de pré-visualização se recria sozinho se detectar que ficou
  "órfão" (fora da árvore do documento).

Duas causas adicionais do mesmo sintoma, encontradas depois (a última é a
mais importante — quem realmente resolvia o problema em outro recurso
irmão desta mesma extensão, o envio por e-mail):

- o `manifest.json` injetava o content script só em páginas cuja URL
  batesse com padrões restritos (ex.: `processo.do*`, `*processo*`) — mas
  algumas abas do processo (Apensamentos, Vínculos, HCs TJ, etc.) navegam
  para URLs que não batem com esses padrões, então o script **nunca
  chegava a rodar** nelas. Agora os padrões cobrem toda a aplicação
  (`/projudi/*` e `/seeu/*`);
- a checagem de "isso é uma tela de processo?" usava classe/id
  (`table.buttonBar`, `#backButton`), que pode variar entre Projudi e SEEU
  ou não existir num instante específico de uma transição de aba. Agora
  ela procura pelo **texto** dos botões da barra de ações (ex.:
  "Peticionar", "Juntar Documento", "Voltar"), mais estável entre os dois
  sistemas — e, uma vez que a tela provou ser de um processo, essa
  elegibilidade fica guardada (não é reavaliada do zero a cada vez, o que
  evitava um falso negativo bem no meio de uma troca de aba).

## Limitações conhecidas

- Funciona apenas para documentos que o navegador consiga exibir dentro de
  um `<iframe>` (PDF é o caso comum, via visualizador nativo do
  Chrome/Edge). Alguns tipos de arquivo podem ser baixados diretamente pelo
  navegador em vez de exibidos — nesse caso, use "Abrir em nova aba".
- O `host_permissions` do `manifest.json` está restrito a `*.tjpr.jus.br`
  (Projudi) e `seeu.pje.jus.br` (SEEU), os domínios usados no TJPR. Para
  usar em outro Tribunal (outro domínio de Projudi, ou outra instância do
  SEEU), ajuste os padrões de URL em `manifest.json`.
- A extensão também tem permissão para `*.amazonaws.com` — necessária
  porque o SEEU redireciona o link do arquivo para um bucket S3 (com URL
  assinada) na hora do download, e o service worker precisa poder buscar
  esse endereço final. Não é usada para mais nada além de baixar o
  documento que o próprio usuário selecionou.
- O reconhecimento das telas do SEEU foi validado a partir de um HTML
  estático (arquivo `.mhtml` salvo com a movimentação já expandida), não de
  testes ao vivo no sistema — o link de arquivo usa o mesmo padrão do
  Projudi (`class="link"` + `href` contendo `/arquivo.do`), então a
  detecção de documentos deve funcionar sem ajustes, mas vale confirmar na
  prática.
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
