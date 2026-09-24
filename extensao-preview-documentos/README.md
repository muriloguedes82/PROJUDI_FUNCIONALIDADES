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
5. na tela **Movimentações**, é difícil identificar rapidamente quais
   movimentações foram feitas por Magistrado(a), Ministério Público ou
   Advogado(a) — é preciso ler a coluna "Movimentado Por" linha a linha
   (veja "Destaque de movimentações por tipo de usuário" abaixo).
6. num processo apenso, o número **Sequencial** do processo principal
   (útil para localizá-lo por esse número em outras telas) só aparece na
   aba "Informações Gerais" do próprio processo principal — é preciso
   abrir o processo principal só para consultá-lo (veja "Sequencial do
   processo principal nos processos apensos" abaixo).
7. não há como saber, olhando só o número único do processo no topo da
   tela, se ele está com uma suspensão ativa — é preciso abrir a aba
   "Informações Adicionais" para conferir (veja "Indicador de suspensão
   ativa" abaixo).
8. o mesmo vale para a monitoração eletrônica: não há como saber, no
   topo da tela, se o processo tem uma monitoração eletrônica ativa
   (nem desde quando) sem abrir a aba "Informações Adicionais" e depois
   a tela de detalhe da medida (veja "Indicador de monitoração
   eletrônica ativa" abaixo).
9. no quadro **Pendências** da capa do processo, finalizar uma conclusão
   pendente exige abrir a tela de análise, clicar no botão nativo
   "Finalizar Conclusão Pendente" e aguardar o recarregamento da página
   — é preciso repetir isso pendência por pendência (veja "Finalizar
   conclusão pendente" abaixo).

## Pré-visualização de Documentos

Com a extensão instalada, basta **passar o mouse sobre o nome do arquivo**
(ex.: `Certidao de Baixa.pdf`) para que a íntegra do documento apareça em um
painel flutuante sobreposto à própria tela de movimentações — sem precisar
trocar de aba. A ideia é a mesma já oferecida pelo eproc e pela extensão
AzFlow.

Também é possível passar o mouse sobre o **texto da movimentação** quando
a linha possui o controle **Arquivos (+)**. Se os arquivos já estiverem
expandidos, a extensão os usa diretamente; se estiverem recolhidos, ela
consulta a movimentação em segundo plano e mostra o Preview sem navegar a
aba nem abrir visualmente a linha.

Quando a movimentação contém mais de um arquivo, nenhum painel é aberto.
Um aviso compacto ao lado do link informa **"Múltiplos documentos"** e a
quantidade de arquivos encontrados.

## Destaque de movimentações por tipo de usuário

Na tela **Movimentações**, cada linha mostra na coluna "Movimentado Por"
quem fez aquela movimentação e, logo abaixo do nome, o papel dessa pessoa
no processo (ex.: "Magistrada", "Membro(a) do Ministério Público",
"Advogado"). Esta extensão deixa você escolher, uma vez só, quais desses
tipos destacar e com qual cor — e aplica esse destaque automaticamente
em **todos os processos**, sempre que a aba Movimentações é aberta, sem
precisar configurar de novo a cada um.

1. na tela de Movimentações, clique no botão **"🖍️ Destacar
   movimentações"** do painel de Ações Rápidas (veja "Ações rápidas"
   abaixo) — abre um popup de configuração sobreposto à própria tela,
   sem trocar de aba;
2. marque um ou mais tipos — **Magistrado / Magistrada**, **Ministério
   Público** e/ou **Advogado / Advogada**;
3. escolha a cor de cada tipo clicando numa das amostras da paleta
   abaixo dele (a cor já usada por outro tipo fica marcada com um ✓;
   escolher essa mesma cor para outro tipo troca as cores entre os
   dois — assim nunca dois tipos ficam com a mesma cor);
4. clique em "Salvar".

A partir daí, toda linha de movimentação feita por um dos tipos marcados
aparece com o fundo na cor escolhida — em qualquer processo, não só no
que estava aberto ao salvar. Para editar a preferência depois (mudar
cores, marcar ou desmarcar tipos), é só abrir o mesmo popup de novo; ele
já vem preenchido com o que estava salvo.

O destaque é identificado a partir da mesma informação usada pelo quadro
nativo "Realces" do Projudi (que também existe na tela, mas com cores
fixas e sem lembrar a preferência entre processos) — por isso é preciso
estar na aba Movimentações de um processo real para o botão funcionar;
esta extensão não usa aquele quadro, apenas a mesma forma de identificar
o tipo de cada movimentação.

## Sequencial do processo principal nos processos apensos

Na aba **Informações Gerais** de um processo apenso (ex.: um incidente
processual apensado a uma Ação Penal), o Projudi já mostra o campo
"Processo Principal:" com o link/número do processo principal, mas não
mostra o **Sequencial** dele — um identificador numérico (ex.: `45054`)
que só aparece na aba Informações Gerais daquele outro processo.

A extensão busca esse número automaticamente em segundo plano (sem abrir
nem trocar de aba) e insere uma linha **"Sequencial do Processo
Principal:"** logo abaixo do campo "Processo Principal:" já existente,
preenchida assim que a busca termina. Esse campo só aparece nos processos
que já têm "Processo Principal:" preenchido, ou seja, nos processos
apensos — o processo principal em si não ganha essa linha extra.

## Filtro por "Sequencial" na Análise de Decurso de Prazo

Várias telas de análise do Projudi (ex.: Análise de Juntadas) já têm um
campo **Sequencial** no formulário de busca: o servidor informa um dígito
de 0 a 9 e, ao clicar em **Filtrar**, a tabela de resultados é restrita às
linhas cujo "Seq." termina naquele dígito — útil para dividir a fila de
trabalho entre vários servidores. A tela de **Análise de Decurso de
Prazo** (menu "Decurso de Prazo", `processo/intimacaoBusca.do`) não tinha
esse campo, embora a própria tabela de resultados já exiba um "Seq." para
cada linha (coluna "Processo", logo abaixo do número do processo).

A extensão insere o campo **Sequencial:** nesse formulário de busca,
aceitando só um dígito (0 a 9). O campo começa sempre em branco — não há
um dígito padrão — e basta digitar o número e clicar em **Filtrar**, nada
além disso: como a busca dessa tela é paginada no servidor (20 registros
por página) e um dígito de Sequencial pode ter processos espalhados por
várias páginas, a extensão busca sozinha, em segundo plano (com `fetch()`,
mesma sessão/cookies do usuário, sem abrir nem trocar de aba, mesma
técnica já usada na busca do Sequencial do processo principal acima),
todas as páginas seguintes — repetindo, uma vez por página, a mesma busca
que o botão "Filtrar" já faz. Ao final, a própria tabela de resultados já
existente na tela passa a mostrar só os processos cujo "Seq." termina no
dígito informado, de todas as páginas percorridas, com um resumo (quantos
processos, em quantas páginas) no lugar da
navegação entre páginas.

## Indicador de suspensão ativa

No cabeçalho do processo, logo depois do texto "(N dia(s) em
tramitação)" — ao lado do número único do processo —, a extensão insere
um pequeno **card** ("Suspenso: ...") para cada item com status
**ATIVA** e um dos motivos mais comuns encontrado no campo
**"Suspensões:"** da aba **"Informações Adicionais"**:

- Art. 366, CPP
- Art. 89, L. 9099/95
- Insanidade Mental
- ANPP
- Transação Penal

Esse campo lista cada suspensão do processo no formato usado pelo
próprio Projudi, ex.: "Art. 366 do CPP - NOME DO INVESTIGADO - ATIVA".
Cada card mostra o motivo (e o nome, quando presente) no próprio texto —
ex.: "Suspenso: Art. 366 do CPP - RENATO AVELINO DA SILVA" —, e passar o
mouse sobre ele reforça a informação como tooltip. Um item cujo status
não seja "ATIVA" (ex.: encerrado) é ignorado, e se nenhum item ativo com
um dos cinco motivos for encontrado, nenhum card é exibido — o recurso
não tenta adivinhar se o processo está suspenso por outro motivo
qualquer, só sinaliza os cinco listados acima. **Num processo com mais
de um réu, cada suspensão ativa reconhecida ganha o seu próprio card**,
lado a lado — não só a primeira.

Cada item de "Suspensões:" também é um link para uma tela de detalhe
daquela suspensão específica (`transacaoPenal.do`), que tem a **Data de
Início**. A extensão busca essa data automaticamente em segundo plano
(iframe oculto, mesma técnica já usada em "Sequencial do processo
principal") e a acrescenta ao card correspondente assim que a busca
termina, ex.: "Suspenso: Art. 366 do CPP - RENATO AVELINO DA SILVA
(desde 14/05/2010)". Enquanto a busca não termina, o card já aparece
sem a data, que é adicionada depois sem precisar recarregar nada.

### Funciona mesmo sem visitar a aba "Informações Adicionais"

O processo sempre abre na aba **Movimentações**, não em "Informações
Adicionais" — então os cards não podem depender do usuário clicar nela.
Ao abrir qualquer processo (ou trocar de aba), a extensão:

1. Usa direto o conteúdo da aba "Informações Adicionais" se ela já
   estiver na própria página (ex.: você está nela, ou acabou de
   carregar);
2. Senão — o caso mais comum, já que o processo abre em Movimentações —
   busca essa aba **em segundo plano**. Uma primeira tentativa fazia
   isso só trocando a aba pela URL (`?selectedIcon=tabDadosAdicionais`)
   num iframe oculto, mas o Projudi não decide a aba por aí nesta
   tela — uma navegação nova sempre volta para a aba padrão
   (Movimentações), por isso só funcionava depois de o usuário clicar
   manualmente na aba pelo menos uma vez. A troca de aba de verdade é
   um **POST** para a própria action do formulário `#processoForm`, com
   um campo `selectedIcon` no corpo — confirmado a partir de
   `oraculoDirect.js` (recurso "Oráculo" desta mesma extensão), que já
   usa exatamente essa técnica para acessar a aba "Partes e Outros" em
   segundo plano. Nenhuma aba nova é aberta nem nada muda na tela
   visível — o card simplesmente aparece assim que a busca termina,
   tipicamente em poucos segundos após abrir o processo.

Uma vez identificado o estado (quais suspensões, e com qual motivo), os
cards **ficam fixos no cabeçalho do processo mesmo navegando por outras
abas** depois (Movimentações, Partes e Outros, etc.). Algumas dessas
abas não são só uma troca de conteúdo via AJAX — o Projudi navega para
uma URL de verdade, recarregando a página inteira (o mesmo comportamento
já documentado logo abaixo, em "Troca de abas do processo", para outros
recursos desta extensão). Isso descartaria qualquer estado guardado só
em memória, e nessas abas a "Informações Adicionais" nem chega a existir
no HTML para ser relida em segundo plano de novo. Por isso o estado
(motivos, hrefs e datas de início) também é salvo em `sessionStorage`,
associado ao número único do processo: ao entrar em qualquer aba do
processo, os cards aparecem **imediatamente**, restaurados do que foi
salvo da última leitura — nesta mesma aba do navegador, sem persistir
entre processos diferentes nem sair do navegador. O estado só é
reavaliado de novo (e o `sessionStorage` atualizado) quando a aba
"Informações Adicionais" volta a estar disponível localmente (ex.: ao
reabri-la) — a busca em segundo plano só acontece uma vez por carga de
página, para não gerar uma requisição extra a cada reconciliação.

A estrutura da aba "Informações Adicionais" e do campo "Suspensões:" foi
confirmada a partir de uma página real do Projudi (TJPR) — inclusive um
detalhe importante: o `id` da aba (`tabItemprefixN`) fica no item da
lista de abas (`<li>`), não no link (`<a>`) dentro dele, diferente do que
outras partes desta extensão assumiam. Ainda assim, o texto exato de
cada item de suspensão pode variar por Tribunal/Vara, então a extensão
registra no console (F12, mensagens com o prefixo `[Projudi Suspensão
Ativa]`) cada item da lista avaliado e o motivo do descarte (status
diferente de "ATIVA", ou motivo não reconhecido) — útil para ajustar
`findMotivoSuspensaoAtiva` em `src/suspensaoAtiva.js` caso o card não
apareça com um processo suspenso.

## Indicador de monitoração eletrônica ativa

No cabeçalho do processo, logo depois do texto "(N dia(s) em
tramitação)" — ao lado do número único do processo, junto de eventuais
cards de suspensão ativa —, a extensão insere um pequeno **card**
("Monitorado eletronicamente: ...") para cada medida de **Monitoração
Eletrônica** com status **ATIVA** encontrada na aba "Informações
Adicionais" do processo, no mesmo campo de Benefícios/Medidas usado pelo
indicador de suspensão ativa.

Diferente da suspensão, a aba "Informações Adicionais" **não** lista as
monitorações do processo diretamente — tem um campo genérico **"Medidas
Cautelares (Ex. Monitoração Eletrônica):"**, com um único link ("Processo
com Medida Cautelar") que cobre qualquer tipo de medida cautelar do
processo (monitoração eletrônica é só um dos exemplos citados no próprio
rótulo do campo — pode ser outra coisa, ex.: prisão domiciliar). Só a
tela de detalhe desse link diz do que se trata. Por isso, quando esse
campo indica a presença de alguma medida, a extensão busca essa tela em
segundo plano (iframe oculto, mesma técnica já usada nos outros recursos
desta extensão) — a tela **"Medida Cautelar"** (`transacaoPenal.do`), com
**"Status:"** e **"Data de Início:"** do registro como um todo, e um
campo **"Medida Cautelar:"** com uma tabela listando um **tipo** por
linha (ex.: "Monitoração eletrônica", "Recolhimento domiciliar
noturno") — só cria o card se essa tabela tiver uma linha "Monitoração
Eletrônica" **sem** "Data de Término Efetiva" preenchida (ou seja, esse
tipo específico ainda em vigor) e o registro geral estiver com "Status:"
ATIVA. O texto do card é o **nome da parte** (campo "Parte:" dessa
mesma tela), ex.: "Monitorado eletronicamente: ANDREIA DA SILVA (desde
20/07/2024)". Enquanto a busca não termina, nenhum card aparece ainda —
ele surge assim que ela confirma a medida.

Um processo pode ter **mais de uma parte** com medida cautelar — nesse
caso a tela "Medida Cautelar" tem um combo **"Partes:"** para trocar de
réu/parte (cada um com seu próprio "Status:"/"Data de Início:"/tabela de
tipos). A extensão detecta esse combo e, quando ele tem mais de uma
opção, busca a tela de novo para CADA parte (em paralelo, em segundo
plano) — assim, cada parte com Monitoração Eletrônica ativa ganha o seu
próprio card, lado a lado, um por pessoa.

Funciona pela mesma mecânica descrita acima em "Indicador de suspensão
ativa" (Funciona mesmo sem visitar a aba "Informações Adicionais",
persistência entre abas via `sessionStorage`). A extensão registra no
console (F12, mensagens com o prefixo `[Projudi Monitoração Ativa]`) cada
etapa dessa busca — inclusive um bloco de diagnóstico em JSON quando
nenhuma "Monitoração Eletrônica" é reconhecida — útil para ajustar
`MEDIDA_CAUTELAR_LABELS`/`MOTIVOS_REGEX` em `src/monitoracaoAtiva.js`
caso o card não apareça com um processo com monitoração eletrônica
ativa.

## Envio por E-mail (Outlook)

Ao lado de cada arquivo listado numa movimentação (os mesmos links de
`arquivo.do`, que aparecem ao expandir o "+" da movimentação), a extensão
insere uma checkbox. O botão flutuante **"✉️ Enviar por e-mail"** fica
**sempre visível** no canto inferior direito da tela — funciona com ou sem
nenhum arquivo marcado, para enviar um e-mail sem anexar documentos dos
autos quando for o caso (nesse caso mostra só "Enviar por e-mail"; com
arquivos marcados, mostra a contagem, ex.: "Enviar por e-mail (2)"). Ao
lado dele, uma seta **"▼"** abre um menu com **"Alterar Remetente"** (veja
"Remetentes salvos" abaixo).

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

Não há mais um botão dedicado para gerenciar destinatários salvos — essa
tela só aparece ao clicar em **"Enviar por e-mail"** quando já existe pelo
menos um destinatário salvo (veja abaixo). Nela é possível gerenciar até
**200** destinatários:

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

No modo **"Outlook Web (sem Azure AD)"**, a seta **"▼"** ao lado de
"Enviar por e-mail" → **"Alterar Remetente"** abre uma tela para cadastrar
até **20** contas remetentes (Nome + E-mail),
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
Remessa, Ordenações, Partes, Suspender, Transitar, Arquivar, Outras —
lado a lado, no mesmo canto da tela dos botões de WhatsApp/e-mail
(posicionando-se ao lado deles quando presentes):

- **Concluso**: Enviar Concluso
- **Remessa**: Realizar Remessa, Remessa Eletrônica para o Tribunal de
  Justiça
- **Ordenações**: Ordenar Cumprimentos, Ordenar RPV, Ordenar Expedição
  BNMP
- **Partes**: Intimar Partes, Notificar Partes, Citar Partes, Intimar
  Peritos e Auxiliares da Justiça
- **Suspender**: Suspender ou Sobrestar Processo
- **Transitar**: Transitar em Julgado
- **Arquivar**: Arquivar Processo
  (fora da tela de Ações, o popup carrega a própria tela de Ações do
  processo e abre o diálogo "Arquivamento de Processo" pelo link nativo —
  esse diálogo só grava o arquivamento quando roda dentro dela)
- **Outras**: Interromper Prazo, Declínio de competência para a Segunda
  Instância, Apensar, Desapensar

Numa segunda linha, logo abaixo do botão **"▸/▾ Ações"** (que recolhe ou
mostra os botões dos grupos acima), ficam o botão **"📋 Processo
copiado"** e o botão **"🖍️ Destacar movimentações"**, que abre um popup
(sobreposto à própria tela, sem trocar de aba) para escolher quais tipos
de usuário (Magistrado, Ministério Público, Advogado) destacar na aba
Movimentações, e com qual cor — veja "Destaque de movimentações por tipo
de usuário" mais acima.

Cada botão abre um painel com as ações daquele grupo — o conteúdo do
painel depende de qual tela do processo você está vendo, já que o painel
"Ações" do Projudi só existe numa tela específica:

- **Na tela com o painel "Ações"**: o painel mostra só as ações que
  existirem no processo agora (ex.: se já estiver apensado, só
  "Desapensar" aparece, não "Apensar"); se nenhuma ação do grupo existir
  para este processo, uma mensagem avisa. Clicar em **"Abrir"** localiza o
  link nativo correspondente já presente na página (mesmo texto, mesmo
  elemento `<a class="link">`, com o `onclick` que o próprio Projudi já
  definiu) e simula um clique nele — o mesmo diálogo (`openDialog`/
  `openDialogMaximized`) que apareceria clicando diretamente no painel
  "Ações" aparece normalmente ali mesmo, sobreposto à tela.
- **Em qualquer outra tela do processo que tenha a lista de Movimentações
  visível** (a capa do processo, a lista de eventos, ou a tela
  intermediária de detalhe de uma movimentação): o painel mostra todas as
  ações do grupo, cada uma com um botão **"Ir e abrir"**. Ao clicar, a
  extensão **não navega a tela visível em nenhum momento** — em vez
  disso, ela carrega as mesmas telas que você navegaria manualmente num
  **iframe oculto** (fora da área visível da tela, mas uma navegação de
  verdade — testes mostraram que o Projudi devolve as telas sem os botões
  de ação quando a requisição não "parece" uma navegação de aba real, daí
  não dar para usar `fetch()` puro), só para descobrir a URL real do
  diálogo final:
  1. Carrega a lista de Movimentações (se ainda não estiver na tela de
     detalhe de uma movimentação) e acha o **evento mais recente e
     válido** (não tachado) da coluna "Evento" — identificado pelo
     próprio Projudi de forma estável (`id="LNKmov..."` nos válidos,
     tachados/inválidos têm "INVALIDO" nesse id).
  2. Carrega a tela de detalhe dessa movimentação e lê para onde o botão
     "Movimentar a Partir Desta Movimentação" levaria.
  3. Carrega essa tela seguinte; se for a de Ações, lê a URL exata do
     diálogo da ação escolhida (do próprio `onclick` do link, algo como
     `openDialog('/projudi/processo/enviarConcluso.do?_tj=...', ...)`).
     Se não for (o tipo dessa movimentação leva a outra tela de ação, ver
     abaixo), repete os passos 1-3 com a **próxima** movimentação válida,
     até achar uma que funcione ou esgotar até 5 tentativas.
  4. Com a URL em mãos, descarta o iframe oculto e abre um **popup**
     visível (sobreposto à tela atual, com um "✕ Fechar") com um NOVO
     iframe carregando só essa URL — esse é o único iframe que o usuário
     chega a ver. Algumas ações (ex.: Ordenar Cumprimentos) terminam numa
     tela nativa "Aguarde..." que o próprio Projudi normalmente fecha
     sozinha: um campo oculto `flagClosePopup` no formulário da tela final
     vem `"true"` quando a ação termina, e um script nativo (`checkClosePopup()`)
     usa isso para submeter, na JANELA PAI, um formulário que volta para a
     tela de Ações — o diálogo foi desenhado pra rodar como um iframe
     dentro da própria tela de Ações, não como uma janela separada. Como
     aqui a "janela pai" é a página onde esta extensão criou o popup (não
     a tela de Ações, que não existe nesse fluxo), aquele formulário nunca
     é encontrado e nada acontece — a tela ficava presa em "Aguarde..." até
     um clique manual em "✕ Fechar" (a ação em si já havia sido registrada
     normalmente mesmo antes dessa correção). A extensão agora lê esse
     mesmo campo `flagClosePopup` diretamente e, quando ele vier `"true"`,
     recarrega a aba real por trás e fecha o popup por conta própria — sem
     depender do formulário nativo, que nunca existe no contexto do popup
     desta extensão.

  **Nada disso pratica qualquer ato processual por conta própria** — os
  passos 1-3 só leem páginas dentro do iframe oculto, sem exibi-las ao
  usuário nem enviar nada ao Projudi além do carregamento de leitura
  normal (o mesmo que aconteceria navegando manualmente); o popup do
  passo 4 abre o
  diálogo nativo em branco (com "Abrir"/"Ir e abrir") ou repreenche uma
  preferência salva e pede a confirmação única de sempre antes de clicar
  em confirmar/enviar (ver "Preferências" abaixo) — nunca confirma
  sozinha. Enquanto os passos 1-3 acontecem (tipicamente menos de 1-2s), um
  pequeno indicador "Abrindo '...'…" aparece, com um botão "Cancelar".
- **Se não houver lista de Movimentações na tela atual** (ex.: você está
  numa aba diferente do processo, como Partes e Outros): o painel avisa
  para abrir a aba "Movimentações" primeiro.

**Atenção a um detalhe já corrigido, mas que vale registrar:** o Projudi
reaproveita o mesmo `id`/`name` (`movimentarButton`) para vários botões de
"iniciar uma movimentação" em telas diferentes — por exemplo, o botão
nativo **"Juntar Documento"** da barra de ferramentas da tela principal do
processo também tem `id="movimentarButton"`, só com um texto (`value`)
diferente. Por isso a extensão identifica o botão "Movimentar a Partir
Desta Movimentação" **só pelo texto**, nunca por id/name.

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

As preferências (e o "+ Nova preferência") também funcionam a partir de
qualquer tela com a lista de Movimentações visível: nesse caso elas
primeiro resolvem a URL do diálogo em segundo plano (ver acima) e só
então abrem o popup já preenchido/com a confirmação.

**Como funciona por baixo dos panos e suas limitações:** já que a extensão
não tem acesso ao código-fonte desses diálogos, a localização do
formulário (dentro do popup, ou da própria página quando já se está na
tela de Ações) é **heurística**: ao salvar, ela usa o último
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

## (Des)Habilitar Advogado (popup para a tela de Advogados)

Habilitar, desabilitar, adicionar ou remover um advogado hoje exige abrir
a aba "Partes e Outros" e, na barra de botões ao final dela, clicar no
botão nativo **"Advogados"** (um único botão por processo, não por parte),
que leva à tela onde essas ações ficam disponíveis.

Ao lado do botão **"📋 Processo copiado"** (ver "Ações rápidas" acima), a
extensão adiciona o botão **"⚖️ (Des)Habilitar Advogado"**, que abre essa
tela num **popup sobreposto à tela atual** — a MESMA janela/mecanismo já
usado pelo painel "Ações rápidas" para diálogos como "Ordenar
Cumprimentos" e "Realizar Remessa" (ver acima): a aba visível nunca
navega, e o usuário habilita, desabilita, adiciona ou remove o advogado
direto no popup, fechando com "✕ Fechar" ao terminar.

Como a extensão resolve a URL final, ANTES de sequer abrir o popup:

1. Se a tela atual já é a aba "Partes e Outros", lê o `onclick` do botão
   nativo "Advogados" direto do DOM.
2. Senão, busca essa aba em segundo plano via `fetch()` (POST para o
   próprio formulário do processo, sem iframe — mesma técnica já usada e
   validada ao vivo pelo Oráculo, ver "Indicador de suspensão ativa" mais
   acima) e lê o mesmo `onclick` dali.

Só então o popup é aberto, com o `<iframe>` já apontando (um `src` comum,
GET) direto para a URL resolvida — nunca um `<form target="...">` mirando
o nome do iframe: essa técnica foi tentada numa versão anterior e, quando
o nome do iframe não é reconhecido a tempo pelo navegador como um alvo
válido, ele abre uma **aba nova** em vez de navegar o iframe (o
comportamento padrão do HTML nesse caso) — exatamente o bug visto ao vivo
nessa versão. Um `src` comum não tem essa armadilha.

A existência (ou não) de um advogado já habilitado nunca impede o botão de
funcionar: o popup mostra a tela nativa tal como ela está, inclusive
permitindo adicionar o primeiro advogado. Nenhuma ação é praticada
sozinha — a extensão só abre a tela; habilitar, desabilitar, adicionar ou
remover o advogado continua sendo feito manualmente pelo usuário, dentro
do popup.

## Réus/Indiciados/Noticiados no cabeçalho do processo

No SEEU, o cabeçalho do processo já mostra o nome do sentenciado (com RJI,
CPF e RG), e o nome leva à tela da parte. No Projudi, para saber quem são
os réus é preciso abrir a aba "Partes e Outros".

A extensão adiciona, na tabela de informações do processo, uma linha logo
abaixo da última linha de **"Assunto"** (Principal ou Secundário, se
houver) com **todas** as partes do polo passivo — Réu, Indiciado,
Noticiado, etc. —, uma por linha, no formato `NOME (RG: ...; CPF: ...)`
(só os documentos preenchidos). O rótulo da linha é o próprio título do
polo na aba "Partes e Outros" (ex.: "Réu:").

O **nome é um link**: ao clicar, a tela da parte (a mesma do link nativo
da aba "Partes e Outros", com "Alterar Parte", "Alterar Polo", "Dar
Baixa", "Atualizar Dados IIPR", etc.) abre num **popup sobreposto à tela
atual** — o mesmo popup do painel "Ações rápidas" e do "(Des)Habilitar
Advogado" —, sem navegar a aba. Fecha com "✕ Fechar".

De onde vêm os dados:

1. Se a tela atual já é a aba "Partes e Outros", lê direto do DOM.
2. Senão, busca essa aba em segundo plano via `fetch()` (POST para o
   próprio formulário do processo com `selectedIcon=tabPartes`, mesma
   técnica do "(Des)Habilitar Advogado"), sem iframe.

O polo passivo é identificado pelo id das linhas da tabela
(`rowpromovidas*`/`iconpromovidas*`) e, na falta dele, pelo título do polo.
O resultado fica salvo em `sessionStorage` (por processo), para a linha
aparecer na hora ao trocar de aba; a busca é refeita a cada carregamento
e a linha é atualizada quando ela termina. Só no Projudi.

## "Nova Remessa" (realizar mais de uma remessa em seguida)

Só no Projudi. A tela nativa **Realizar Remessa** só permite escolher UMA
opção por vez — "Enviar à Delegacia", "Autos ao Distribuidor", "Enviar ao
Ministério Público" ou "Outras Remessas" — e, ao clicar em "Realizar
Remessa", encerra o fluxo e volta para a tela do processo: correto para uma
única remessa, mas obriga a reabrir a tela do zero para cada remessa que o
processo precise.

A extensão adiciona um botão **"🔁 Nova Remessa"** ao lado do botão nativo
"Realizar Remessa", com o mesmo mecanismo de fila já usado por "🔁 Nova
Ordenação" (veja a seção logo abaixo para o raciocínio completo — vale a
pena ler, porque explica por que essa abordagem foi escolhida). Em vez de
enviar o formulário, ele:

1. Confere o preenchimento atual (validação nativa do navegador).
2. **Guarda** os dados preenchidos numa fila, em memória — nada é enviado
   ao Projudi ainda.
3. Limpa o formulário (opção escolhida, Destino, Finalidade, Prazo,
   Urgente, Orientações etc.) para a próxima remessa, na **mesma tela já
   aberta**, sem navegar nem reabrir nada.

O botão mostra quantos itens já estão na fila (ex.: "🔁 Nova Remessa (2 na
fila)"), com um pequeno painel logo abaixo listando cada um pelo nome da
opção escolhida (ex.: "1. Enviar à Delegacia", "2. Enviar ao Ministério
Público") — é possível remover um item da fila clicando no ✕ ao lado dele.

Só quando você clica no botão **"Realizar Remessa" nativo de verdade** (o
último, para encerrar o fluxo) é que tudo é enviado ao Projudi: cada item da
fila (inclusive o que você acabou de preencher na tela) resolve e carrega um
diálogo **novo** de "Realizar Remessa" em segundo plano, aplica os campos
guardados e clica no botão desse diálogo novo — a tela visível nunca chega a
enviar nada nativamente. Se todos forem confirmados, uma mensagem de sucesso
substitui o diálogo. Se algum item falhar (ex.: um campo que ficou
inválido), a extensão avisa **qual item falhou e para** — nada mais é
enviado, e esse item continua na fila para revisão.

Como a tela nativa nunca é modificada enquanto você preenche (sempre uma
bolinha por vez, exatamente como o Projudi já faz — inclusive os campos que
ele mesmo habilita/desabilita conforme a opção escolhida), este recurso não
depende de nenhuma heurística sobre "quais campos pertencem a qual opção".
Duas tentativas anteriores tentavam justamente isso (trocar as bolinhas por
checkboxes e ligar/desligar campos por conta própria) e acabaram travando
campos que deveriam continuar editáveis, porque a extensão não tem acesso ao
código-fonte da tela para saber com certeza a estrutura real dela.

### "Nova Ordenação" (ordenar vários cumprimentos em seguida)

Depois que o script de triagem roda num processo, é comum precisar ordenar
mais de um cumprimento seguido (um ofício, um mandado, um edital, uma
requisição de laudo, etc.). O diálogo nativo só ordena UM cumprimento por
envio: ao clicar em "Ordenar", o Projudi encerra o fluxo e leva de volta
para a tela do processo — correto para uma única ação, mas obriga a
reabrir manualmente o diálogo do zero a cada nova ordenação.

A extensão adiciona um botão **"🔁 Nova Ordenação"** ao lado do botão
nativo "Ordenar" desses diálogos. Em vez de enviar o formulário, ele:

1. Confere o preenchimento atual (validação nativa do navegador).
2. **Guarda** os dados preenchidos numa fila, em memória — nada é enviado
   ao Projudi ainda.
3. Limpa o formulário (`Tipo de Cumprimento`, partes, prazo, orientações
   etc.) para a próxima ordenação, no **mesmo diálogo já aberto**, sem
   navegar nem reabrir nada.

O botão mostra quantos itens já estão na fila (ex.: "🔁 Nova Ordenação (2
na fila)"), com um pequeno painel logo abaixo listando cada um (é possível
remover um item da fila clicando no ✕ ao lado dele, caso tenha sido
adicionado por engano).

Só quando você clica no botão **"Ordenar" nativo de verdade** (o último,
para encerrar o fluxo) é que tudo é enviado ao Projudi:

1. Cada item da fila **resolve e carrega um diálogo NOVO do mesmo tipo**
   em segundo plano, num iframe oculto — reaproveitando a mesma cadeia já
   usada pelo recurso "Ações rápidas" acima (`resolveDialogUrl`) para não
   navegar a aba visível. Só os campos que você preencheu de verdade
   (nunca campos ocultos) são aplicados nesse diálogo novo, e só então o
   "Ordenar" dele é clicado.
2. Só depois que todos os itens da fila forem confirmados, a extensão
   dispara um clique de verdade em "Ordenar" no diálogo **visível** —
   agora com a fila vazia, o formulário atual (o último preenchido) segue
   o fluxo 100% nativo do Projudi: mesma validação, mesmo envio, mesma
   navegação de saída.
3. Se algum item da fila for rejeitado pelo Projudi (ex.: um campo que
   ficou inválido), a extensão avisa **qual item falhou e para** — nada
   mais é enviado, e esse item continua na fila para revisão. Nenhum envio
   é feito "no escuro".

Clicar em **"Cancelar"** descarta a fila normalmente junto com o diálogo —
nada do que foi só guardado chega a ser enviado.

**Por que um diálogo novo por item, em vez de reenviar os mesmos campos
para o mesmo endereço:** testes ao vivo mostraram um item "confirmado" sem
erro nenhum, mas que não aparecia nos autos depois. A explicação mais
provável (padrão comum em aplicações Java/Struts como o Projudi): um campo
oculto de sessão/token de uso único no formulário — reenviar o MESMO token
de uma página que o usuário ainda está vendo arrisca reaproveitar um token
já consumido pelo primeiro envio, e o Projudi pode aceitar a requisição
sem indicar erro algum, mas sem repetir a ação de fato. Resolver um
diálogo novo a cada item evita isso: cada um chega com seu próprio token,
nunca reaproveitado.

**Atenção:** ainda assim, isso não foi validado em produção para os
diálogos "Ordenar RPV" e "Ordenar Expedição BNMP" nem para toda a
variedade de tipos de cumprimento. Antes de confiar nele em ordenações com
prazo real, recomenda-se testar com um item não crítico e conferir depois,
nos autos, se todos os itens da fila foram realmente registrados.

**Diagnóstico:** cada passo (o script carregando, o diálogo sendo
reconhecido, o que cada item guardou, o que cada reenvio em segundo plano
mandou e recebeu de volta do Projudi — inclusive a mensagem de erro e o
número de protocolo, quando o Projudi mostrar uma tela de erro) fica
registrado em `window.__pdpNovaOrdenacaoLog`, acessível pelo console do
navegador (F12). O log é salvo em `sessionStorage` (não só em memória),
então sobrevive à navegação de saída que o "Ordenar" final sempre faz —
inclusive se essa navegação abrir **outra aba** (nesse caso o log
acompanha, já que o navegador copia o `sessionStorage` da aba de origem
para uma aba aberta a partir dela). Depois de reproduzir um problema, na
aba/tela final (onde o erro apareceu), com o console no frame certo
(dropdown de contexto, não "top"), rodar:

```js
copy(JSON.stringify(window.__pdpNovaOrdenacaoLog, null, 2))
```

copia o log inteiro para a área de transferência, pronto para compartilhar
e investigar a causa raiz em vez de adivinhar.

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

## Finalizar conclusão pendente

No mesmo quadro **Pendências** da capa do processo, quando o item é uma
**Conclusão** (não uma Análise de Juntada), a extensão insere um botão
**"Finalizar conclusão"** logo ao lado do link nativo, ex.:

```html
<td class="labelRadio"><label>Análise de Conclusão:</label></td>
<td>
  <a href=".../processo/conclusao.do?_tj=..." class="link">
    Há 1 pendência(s) de conclusão
  </a>
  <button class="pdp-finalizar-conclusao">Finalizar conclusão</button>
</td>
```

Ao clicar nesse botão, a extensão:

1. Carrega a tela de análise da conclusão (`conclusao.do`) em segundo
   plano, via `fetch` autenticado com a sessão do próprio navegador —
   sem abrir aba nem iframe visível.
2. Confirma, na página retornada, que existe o botão nativo **"Finalizar
   Conclusão Pendente"** habilitado (`#extraButton`, valor
   `finalizar.conclusao.pendente`) dentro do formulário
   `#movimentarProcessoForm`, junto com um `idMovimentacao` numérico. Se
   a pendência já não estiver mais nesse estado (ex.: foi finalizada por
   outra aba, ou não é uma conclusão simples), a operação é cancelada com
   um aviso — nenhuma tentativa é feita "no escuro".
3. Reenvia esse mesmo formulário (`POST`, mesmos campos que o clique no
   botão nativo enviaria) para a URL de finalização indicada pela própria
   página. Se o formulário tiver algum campo de arquivo, a extensão
   também cancela a operação — esse caso exige o fluxo manual.
4. Confere, na resposta, a mensagem de sucesso nativa do Projudi
   ("Conclusão pendente finalizada com sucesso!"). Se a finalização não
   puder ser confirmada (erro de rede, mensagem inesperada), o botão
   fica com o aviso **"Verifique a conclusão"** e um alerta pede para
   conferir manualmente no Projudi antes de repetir a operação — evita
   reenviar duas vezes a mesma finalização.

O botão fica desabilitado durante a operação e mostra o resultado
("Finalizando…", "Conclusão finalizada" ou "Verifique a conclusão")
diretamente nele; a lista de pendências não é recarregada
automaticamente, já que o Projudi não faz isso sozinho. Apenas uma
finalização é processada por vez.

## Dispensar decursos de prazo

Ainda no quadro **Pendências**, quando o item é uma intimação
**aguardando análise de decurso de prazo** (link para
`processo/intimacaoBusca.do`), a extensão insere o botão
**"Dispensar decursos"** ao lado do link. Ao clicar, ela dispensa, em um
iframe oculto, todas as intimações daquele processo que aguardam a
análise:

1. Carrega a listagem (`intimacaoBusca.do`) e colhe os links das linhas
   "aguardando análise do decurso de prazo". Se a listagem vier vazia ou
   não for reconhecida, a operação é interrompida com erro — nunca
   informa "já dispensado" sem ter dispensado nada.
2. Abre cada intimação (`intimacao.do`), exige o botão nativo
   **"Dispensar"** (`#intimacaoForm #dispensarButton`) habilitado e o
   aciona pelo background, que só aceita uma única confirmação nativa que
   mencione dispensa e decurso — qualquer outra é recusada.
3. Recarrega a listagem e só segue para a próxima se a quantidade de
   pendentes diminuiu; ao zerar, mostra "Decurso(s) já dispensado(s) -
   Movimentação permitida.".

Qualquer erro (inclusive o prazo de 60 s por etapa) **interrompe** a
sequência: o card mostra a mensagem, "Ver detalhes" exibe o iframe no
estado em que parou e nada mais é dispensado automaticamente. Apenas uma
operação por vez. O filtro por Sequencial (`decursoPrazoSequencial.js`)
não roda dentro desse iframe.

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
- **"Nova Remessa":** depende do botão nativo ter o texto exato "Realizar
  Remessa" e de a tela usar a mesma caixa de erro genérica do Projudi
  (`#errorMessages`) já usada por "Nova Ordenação" para detectar falha num
  item da fila. O nome de cada item na fila (ex.: "Enviar à Delegacia") é só
  cosmético, pelo texto do rótulo mais próximo da opção marcada — se não
  bater com nenhum dos rótulos esperados, o item aparece como "Remessa N",
  sem afetar o envio. Como em "Nova Ordenação", isso não foi validado ao
  vivo no Projudi.
