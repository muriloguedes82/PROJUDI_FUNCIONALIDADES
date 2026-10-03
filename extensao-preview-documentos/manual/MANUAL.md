# Manual do Usuário — Extensão Projudi/SEEU

**Documentos, Ações Rápidas, WhatsApp e E-mail**

| Item | Informação |
|---|---|
| **Versão do manual** | 2.16.0 |
| **Versão da extensão** | 2.16.0 |
| **Data desta versão** | 03/10/2026 |
| **Público** | Servidores(as) e magistrados(as) que já sabem abrir um processo no Projudi e navegar pelas abas dele e do sistema |

> **Como abrir este manual.** No Projudi/SEEU, clique no ícone da balança
> (canto superior direito, abaixo de **Sair**) e depois em **📖 Manual do
> Usuário**. Ele abre numa nova aba, com índice e busca, e os links **▶
> Vídeo** tocam na própria página. Veja [2.6](#cap-2-6).
>
> **Como ler este manual.** Cada função tem a mesma estrutura: *Para que
> serve*, *Onde fica*, *Passo a passo* e *Bom saber*. Sempre que houver um
> vídeo curto mostrando a função, o link **▶ Vídeo** aparece no início da
> seção. Todos os vídeos estão reunidos no [Anexo A](#anexo-a).
>
> O número da versão do manual é **igual** ao da extensão. Se a sua
> extensão estiver numa versão diferente (veja em `chrome://extensions`),
> algumas telas podem não bater com o que está descrito aqui — veja o
> [Anexo B](#anexo-b) para saber o que mudou.

---

## Sumário

1. [Apresentação](#cap-1)
   - 1.1 [Para quem é este manual](#cap-1-1)
   - 1.2 [Convenções usadas](#cap-1-2)
   - 1.3 [Onde a extensão funciona](#cap-1-3)
   - 1.4 [Regras de segurança da extensão](#cap-1-4)
2. [Primeiros passos](#cap-2)
   - 2.1 [Instalação](#cap-2-1)
   - 2.2 [Termos de Uso](#cap-2-2)
   - 2.3 [Atualização da extensão](#cap-2-3)
   - 2.4 [A barra de botões da extensão](#cap-2-4)
   - 2.5 [Página de opções](#cap-2-5)
   - 2.6 [Menu da extensão (ícone da balança)](#cap-2-6)
3. [Leitura do processo (aba Movimentações)](#cap-3)
   - 3.1 [Pré-visualização de documentos](#cap-3-1)
   - 3.2 [Pré-visualização das pendências](#cap-3-2)
   - 3.3 [Expandir movimentações e ocultar as sem arquivo](#cap-3-3)
   - 3.4 [Destacar movimentações por tipo de usuário](#cap-3-4)
4. [Informações extras na tela do processo](#cap-4)
   - 4.1 [Suspensão ativa no cabeçalho](#cap-4-1)
   - 4.2 [Monitoração eletrônica ativa no cabeçalho](#cap-4-2)
   - 4.3 [Réus, indiciados e noticiados no cabeçalho](#cap-4-3)
   - 4.4 [Sequencial do processo principal (apensos)](#cap-4-4)
5. [Envio de documentos](#cap-5)
   - 5.1 [Envio por WhatsApp Web](#cap-5-1)
   - 5.2 [Envio por e-mail (Outlook)](#cap-5-2)
   - 5.3 [Destinatários favoritos e remetentes do e-mail](#cap-5-3)
   - 5.4 [Certidão de envio (e-mail e WhatsApp)](#cap-5-4)
6. [Quadro Pendências](#cap-6)
   - 6.1 [Dispensar juntadas](#cap-6-1)
   - 6.2 [Finalizar conclusão pendente](#cap-6-2)
   - 6.3 [Dispensar decursos de prazo](#cap-6-3)
   - 6.4 [Dispensar cumprimentos para expedir](#cap-6-4)
7. [Ações rápidas e preferências](#cap-7)
   - 7.1 [Ações rápidas](#cap-7-1)
   - 7.2 [Preferências (preencher e confirmar com um clique)](#cap-7-2)
   - 7.3 [Minhas Preferências](#cap-7-3)
   - 7.4 [Combos de preferências](#cap-7-4)
   - 7.5 [Nova Ordenação](#cap-7-5)
   - 7.6 [Nova Remessa](#cap-7-6)
   - 7.7 [Escolher a movimentação das Ações rápidas](#cap-7-7)
8. [Atalhos para telas do processo](#cap-8)
   - 8.1 [Alvará Eletrônico](#cap-8-1)
   - 8.2 [Juntar Documento com preferências](#cap-8-2)
   - 8.3 [(Des)Habilitar Advogado](#cap-8-3)
   - 8.4 [Editar Partes/Outros](#cap-8-4)
   - 8.5 [Colar processo](#cap-8-5)
   - 8.6 [Oráculo](#cap-8-6)
   - 8.7 [Sistemas do CNJ (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud)](#cap-8-7)
   - 8.8 [Localizador (só no SEEU)](#cap-8-8)
   - 8.9 [Alterar Classe/Assuntos](#cap-8-9)
9. [Telas de análise, mesas e cumprimentos](#cap-9)
   - 9.1 [Filtro por Sequencial na Análise de Decurso de Prazo](#cap-9-1)
   - 9.2 [Listas de tarefas](#cap-9-2)
   - 9.3 [Minhas Preferências na linha do processo (⭐)](#cap-9-3)
   - 9.4 [Mesa do Analista sem itens zerados](#cap-9-4)
   - 9.5 [RG e CPF das partes nos cumprimentos](#cap-9-5)
   - 9.6 [Dados processuais nas ordenações BNMP](#cap-9-6)
   - 9.7 [Endereço da parte e Mandado Regionalizado](#cap-9-7)
10. [Privacidade e convivência com outras extensões](#cap-10)
    - 10.1 [O que fica guardado no seu navegador](#cap-10-1)
    - 10.2 [Convivência com o AzFlow](#cap-10-2)
    - 10.3 [Bloqueio para perfis de advocacia](#cap-10-3)
11. [Solução de problemas](#cap-11)
- [Anexo A — Vídeos instrutivos](#anexo-a)
- [Anexo B — Histórico de versões do manual](#anexo-b)

---

<a id="cap-1"></a>
## 1. Apresentação

A extensão é um complemento instalado no navegador (Google Chrome ou
Microsoft Edge) que acrescenta botões, painéis e informações às telas do
**Projudi** (TJPR) e, em parte, do **SEEU**. Ela não substitui nenhuma tela
do sistema: tudo o que o Projudi já faz continua disponível exatamente como
antes — a extensão só encurta caminhos.

<a id="cap-1-1"></a>
### 1.1 Para quem é este manual

Para quem já usa o Projudi no dia a dia e sabe:

- localizar e abrir um processo;
- reconhecer as abas do processo (**Informações Gerais**, **Informações
  Adicionais**, **Partes e Outros**, **Movimentações** etc.);
- reconhecer as áreas do sistema (mesas, telas de análise, cumprimentos).

Não é preciso saber nada de informática além disso.

<a id="cap-1-2"></a>
### 1.2 Convenções usadas

| Símbolo / formato | Significado |
|---|---|
| **Negrito** | Nome de um botão, aba, campo ou tela, exatamente como aparece |
| ▶ **Vídeo Vnn** | Link para o vídeo daquela função (ver [Anexo A](#anexo-a)) |
| ⚠️ | Atenção: cuidado para não praticar um ato sem conferir |
| *Só no Projudi* | A função não existe no SEEU |
| *Só no SEEU* | A função não existe no Projudi |
| ✅ **Sim, executar** | O único botão da extensão que confirma um ato processual — sempre depois de você conferir |

> Os vídeos usam **telas simuladas** do Projudi, com dados fictícios, só
> para mostrar onde clicar. Cores e posições podem variar um pouco no
> sistema real.

<a id="cap-1-3"></a>
### 1.3 Onde a extensão funciona

| Sistema | O que funciona |
|---|---|
| **Projudi (TJPR)** | Todas as funções deste manual |
| **SEEU** | Menu da extensão ([2.6](#cap-2-6)), pré-visualização de documentos ([3.1](#cap-3-1)), envio por WhatsApp ([5.1](#cap-5-1)) e por e-mail ([5.2](#cap-5-2)), a certidão de envio ([5.4](#cap-5-4)), o **📎 Juntar Documento** com preferências e variáveis ([8.2](#cap-8-2)), o ícone do BNMP 3.0 ao lado da balança ([8.7](#cap-8-7)) e o botão **📍 Localizador** ([8.8](#cap-8-8)), que só existe no SEEU — também pela **⭐** das listas de juntadas e de conclusões ([9.3](#cap-9-3)). Vale também para o **SEEU de treino** (ambiente de testes) |

A extensão **não funciona** quando o usuário está logado com perfil de
advogado(a) ou de assessor(a) de advogado — veja [10.3](#cap-10-3).

<a id="cap-1-4"></a>
### 1.4 Regras de segurança da extensão

1. **Nenhum ato processual é praticado sem o seu clique.** Quando a
   extensão preenche um formulário, ela sempre para e mostra o botão
   ✅ **Sim, executar** (ou deixa o **Salvar**/**Assinar** do próprio
   Projudi para você). Confira os campos antes de clicar.
2. As exceções, que agem ao clicar, são os botões do quadro Pendências
   (**Dispensar juntadas**, **Finalizar conclusão**, **Dispensar
   decursos**): o próprio clique neles é a sua decisão. Use-os só depois
   de conferir as pendências.
3. **Nada sai do seu computador** por conta da extensão: preferências,
   listas e contatos ficam guardados no seu navegador. Documentos só são
   enviados quando você clica em enviar no WhatsApp Web ou no Outlook.
4. Documentos do processo são sensíveis: **confira sempre o destinatário**
   antes de enviar.
5. **Pendências antes de uma preferência — Projudi × SEEU:** o **Projudi**
   não deixa praticar ações enquanto houver juntadas ou conclusões
   pendentes; por isso, lá, a extensão pergunta antes se deve **dispensar
   as juntadas**, **finalizar a conclusão** ou **dispensar os decursos**.
   O **SEEU** não tem essa trava: lá a extensão **não pergunta** e **não
   dispensa nem finaliza nada** — a preferência é executada direto.

---

<a id="cap-2"></a>
## 2. Primeiros passos

<a id="cap-2-1"></a>
### 2.1 Instalação

▶ [**Vídeo V01** — Instalação e Termos de Uso](videos/V01-instalacao-e-termos-de-uso.mp4)

**Para que serve:** colocar a extensão no navegador.

**Passo a passo:**

1. Tenha a pasta **extensao-preview-documentos** no computador (fornecida
   pelo responsável pela extensão, ou baixada deste repositório).
2. No Chrome, abra o endereço `chrome://extensions` (no Edge,
   `edge://extensions`).
3. Ative o botão **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação**.
5. Escolha a pasta **extensao-preview-documentos** (a que contém o
   arquivo `manifest.json`) e confirme.
6. A extensão aparece na lista e a página de **Termos de Uso** se abre
   sozinha — siga o item [2.2](#cap-2-2).

**Bom saber:** não apague nem mova a pasta depois de instalar: o navegador
usa os arquivos dela.

<a id="cap-2-2"></a>
### 2.2 Termos de Uso

▶ [**Vídeo V01** — Instalação e Termos de Uso](videos/V01-instalacao-e-termos-de-uso.mp4)

**Para que serve:** a extensão só é ativada depois que você lê e aceita os
Termos de Uso. Enquanto não houver aceite, **nenhuma função aparece** no
Projudi/SEEU.

**Passo a passo:**

1. Leia os termos na página que se abriu.
2. Marque **Declaro que li os Termos de Uso e concordo com todas as
   condições**.
3. Clique em **Aceitar e ativar a extensão**.
4. Recarregue (tecla **F5**) as páginas do Projudi/SEEU que já estavam
   abertas.

**Bom saber:**

- **Não concordo - remover extensão** desinstala a extensão.
- Sem aceite, a página de termos volta a abrir ao iniciar o navegador, após
  uma atualização e ao abrir o Projudi/SEEU.
- Para reler os termos ou **revogar o aceite**, use o link **Termos de Uso
  da extensão** na página de opções ([2.5](#cap-2-5)).
- Quando o texto dos termos muda de forma relevante, todos precisam aceitar
  de novo.

<a id="cap-2-3"></a>
### 2.3 Atualização da extensão

Quando receber uma versão nova:

1. Substitua o conteúdo da pasta **extensao-preview-documentos** pelos
   arquivos novos (mesmo lugar de antes).
2. Em `chrome://extensions`, clique no ícone de **recarregar** (↻) no card
   da extensão.
3. Recarregue (**F5**) as abas do Projudi, SEEU, WhatsApp Web e Outlook que
   estavam abertas — só recarregar a página, sem o passo 2, não basta.

A versão instalada aparece no card da extensão, em `chrome://extensions`.
Compare com a versão na capa deste manual.

<a id="cap-2-4"></a>
### 2.4 A barra de botões da extensão

▶ [**Vídeo V02** — A barra de botões da extensão](videos/V02-barra-de-botoes-da-extensao.mp4)

**Onde fica:** com um processo aberto, no **canto inferior direito** da
tela, "flutuando" sobre a página.

| Botão | O que faz | Seção |
|---|---|---|
| **▸ Ações** / **▾ Ações** | Mostra ou recolhe os grupos de ações rápidas (**Concluso**, **Remessa**, **Ordenações**, **Partes**, **Suspender**, **Transitar**, **Arquivar**, **🏦 Alvará Eletrônico**, **Outras**) | [7.1](#cap-7-1) |
| **⭐ Minhas Preferências** | Todas as preferências salvas, em cards | [7.3](#cap-7-3) |
| **📍 Localizador** | *Só no SEEU:* preferências de localizadores, associadas ao processo com um clique | [8.8](#cap-8-8) |
| **📋 Colar processo** | Pesquisa o número de processo que você copiou | [8.5](#cap-8-5) |
| **⚖️ Advogados** | Tela de Advogados em popup ((Des)Habilitar Advogado), com preferências de advogados | [8.3](#cap-8-3) |
| **👥 Partes** | Tela Partes do Processo em popup (Editar Partes/Outros) | [8.4](#cap-8-4) |
| **📎 Juntar Documento** | Juntada com preferências gravadas | [8.2](#cap-8-2) |
| **🖍️ Destacar mov.** | Cores por tipo de usuário | [3.4](#cap-3-4) |
| **🔗 Combos** | Várias preferências em sequência | [7.4](#cap-7-4) |
| **Oráculo** | Consulta de antecedentes da parte | [8.6](#cap-8-6) |
| **📱 Enviar por WhatsApp** | Envia documentos marcados | [5.1](#cap-5-1) |
| **✉️ Enviar por e-mail** e **▼** | Envia documentos marcados pelo Outlook; ▼ = Alterar Remetente | [5.2](#cap-5-2) |
| **↕ Mover** | Arraste para cima/baixo se a barra cobrir algo (vale só para a página atual; também funciona com as setas do teclado) | — |
| **Ocultar** / **Mostrar** | Esconde ou mostra todos os botões da extensão | — |

**Bom saber:**

- O **ícone da balança** (canto superior direito, abaixo de **Sair**) não faz
  parte desta barra: ele abre o **Menu da extensão** — veja [2.6](#cap-2-6).
  Os ícones **coloridos** logo à esquerda dela abrem os **sistemas do CNJ**
  (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper e Infojud) — veja [8.7](#cap-8-7).
- Passe o mouse sobre qualquer botão para ver uma dica.
- A barra acompanha a rolagem da página. Ela se alinha ao quadro
  **Pendências**; quando a tela não tem esse quadro, alinha-se ao quadro
  **Anotações nos autos**.
- No SEEU aparecem só os botões de envio (WhatsApp e e-mail).
- A barra aparece na tela do processo. Em algumas telas (ex.: **Juntar
  Documento**, **Análise de Juntadas**, **Retorno de Conclusão**, telas de
  cumprimento, ficha da parte, **Denunciado(s)**, **Sentenciados**,
  **Infrações/Penas**, **Apreensão**, **Suspensão/Transação Penal**, **Auto
  de Penhora**, **Guia de Recolhimento**, **Trânsito em Julgado**,
  **Informações Financeiras**, **Depósitos/Alvarás Eletrônicos**, **Agenda de
  Audiências**) ela fica oculta — a pré-visualização continua funcionando.
  Ela também não aparece dentro dos popups do **🏦 Alvará Eletrônico**, do
  **👥 Partes** e da ficha de um réu aberta pelo cabeçalho.

<a id="cap-2-5"></a>
### 2.5 Página de opções

**Onde fica:** `chrome://extensions` → **Detalhes** (no card da extensão) →
**Opções da extensão**.

| Campo | Para que serve |
|---|---|
| **Modo de envio** | Como o e-mail é preparado: **Automático** (padrão), **Sempre via Microsoft Graph** ou **Sempre via Outlook Web (sem Azure AD)** — veja [5.2](#cap-5-2) |
| **Client ID** / **Tenant ID** | Dados fornecidos pelo setor de TI para o modo Microsoft Graph. Não preencha se o TI não informou |
| **Termos de Uso da extensão** | Consultar os termos ou revogar o aceite |

Clique em **Salvar** depois de alterar.

<a id="cap-2-6"></a>
### 2.6 Menu da extensão (ícone da balança)

▶ [**Vídeo V34** — Menu da extensão](videos/V34-menu-da-extensao.mp4)

**Para que serve:** ligar e desligar funções da extensão, levar as suas
preferências para outro computador e abrir este manual.

**Onde fica:** um ícone pequeno — a **balança da Justiça** em azul-marinho,
num quadrado dourado — sempre visível no cabeçalho:

- **Projudi:** no canto superior direito, logo abaixo do link **Sair**;
- **SEEU:** na faixa azul do menu, abaixo do nome do usuário.

Ao rolar a página ele acompanha o cabeçalho e, quando este sai da tela, fica
preso no topo. Um **pontinho vermelho** no ícone avisa que há funções
desativadas.

**Como abrir e fechar:** clique no ícone. Para fechar, use o **✕**, a tecla
**Esc** ou clique fora do Menu.

**O que há no Menu:**

**0. Chave geral: ativar e desativar a extensão** — logo abaixo do título do
Menu há uma faixa com uma chave **"Extensão ativada no PROJUDI"** (ou SEEU,
conforme a aba aberta). Verde = extensão funcionando; ao desligar, a faixa fica
vermelha ("Extensão desativada…") e **nenhuma função** atua naquele sistema a
partir do próximo carregamento da página (clique em **Recarregar agora**). Só o
ícone da balança continua na tela, para você poder ligar de novo. As escolhas
da lista de funções ficam guardadas e **não** são perdidas. Cada sistema tem a
sua chave (PROJUDI e SEEU), e o pontinho vermelho do ícone também aparece
quando a extensão está desativada.

**1. Funcionalidades** — a lista de todas as funções, agrupadas por assunto,
cada uma com uma **chave liga/desliga**. No topo do Menu há **duas abas,
PROJUDI e SEEU**, com a mesma lista: cada sistema guarda as suas próprias
escolhas. Por padrão, **tudo vem ativo nos dois**. A extensão reconhece em que
sistema você está pelo endereço da página e abre o Menu na aba dele (marcada
com "(este)"); você pode clicar na outra aba para configurá-la também. Acima
da lista aparece "Funcionalidades no PROJUDI: N de 29 ativas" (ou no SEEU).

1. Clique na aba do sistema que quer configurar (PROJUDI ou SEEU).
2. Clique na chave da função que quer ligar ou desligar.
3. A mudança vale para **todas as páginas daquele sistema**, a partir da
   próxima vez que a página for carregada. Clique em **Recarregar agora** para
   aplicar na página atual (o aviso só aparece quando você mexeu na aba do
   sistema em que está).
4. Para deixar o outro sistema igual, use o link **Copiar para o SEEU** (ou
   **Copiar para o PROJUDI**), ao lado do total de funções ativas, e confirme.

Algumas funções dependem de outras (aparece em dourado, sob o nome:
"Requer: …"). O Menu cuida disso e avisa o que fez:

- ao **desligar** uma função, as que dependem dela também são desligadas;
- ao **ligar** uma função, as que ela exige são ligadas junto.

Exemplo: **Editar Partes/Outros** exige **Ações rápidas e Minhas
Preferências** e **(Des)Habilitar Advogado**.

| Grupo | Funções que podem ser ligadas/desligadas | Seção |
|---|---|---|
| **Documentos e movimentações** | Pré-visualização e WhatsApp · Envio por e-mail (Outlook) · Destaque de movimentações · Expandir anexos / ocultar sem arquivo | [3.1](#cap-3-1), [5](#cap-5), [3.4](#cap-3-4), [3.3](#cap-3-3) |
| **Ações rápidas e atalhos** | Ações rápidas e Minhas Preferências · Escolher a movimentação das Ações rápidas · (Des)Habilitar Advogado · Editar Partes/Outros · Alterar Classe/Assuntos (Projudi) · Alvará Eletrônico · Juntar Documento · Certidão de envio · Localizador (SEEU) · Oráculo · Sistemas do CNJ · Nova Remessa · Nova Ordenação | [7](#cap-7), [8](#cap-8) |
| **Informações do processo** | Réus no cabeçalho · Sequencial do processo principal · Indicador de suspensão ativa · Indicador de monitoração eletrônica | [4](#cap-4) |
| **Pendências, mesa e listas** | Dispensar juntadas, decursos e cumprimentos · Finalizar conclusão pendente · Ocultar contadores zerados · Filtro por Sequencial no Decurso de Prazo · Listas de tarefas · Minhas Preferências na linha (⭐) | [6](#cap-6), [9](#cap-9) |
| **Cumprimentos** | RG e CPF nos cumprimentos · Informações nas ordenações BNMP · Endereço da parte e Mandado Regionalizado | [9.5](#cap-9-5), [9.6](#cap-9-6), [9.7](#cap-9-7) |

Botões como **📋 Colar processo**, **🔗 Combos** e **🖍️ Destacar
mov.** fazem parte das funções acima (as duas primeiras, das
**Ações rápidas**; a última, do **Destaque de movimentações**).

**2. Preferências e combos** — cópia de segurança para levar tudo a outro
computador:

- **⬇ Exportar**: baixa um arquivo `.json` com as suas preferências, combos,
  listas de tarefas, contatos do WhatsApp, destinatários e remetentes de
  e-mail, destaques de movimentações, a ordem dos ícones dos sistemas do CNJ
  ([8.7](#cap-8-7)) e as funções desligadas em cada sistema.
- **⬆ Importar**: no outro computador (com a mesma extensão instalada), escolha
  o arquivo. O Menu mostra um **resumo do que ele contém**; depois de você
  **confirmar**, as preferências daquele computador são **substituídas** pelas
  do arquivo. Recarregue as páginas abertas.
- **↺ Padrão**: religa todas as funções **do sistema da aba aberta** (o outro
  não muda). **Não** apaga nenhuma preferência.

⚠️ O arquivo **não** leva o aceite dos Termos de Uso (cada instalação aceita os
seus), nem login do Microsoft Graph, nem trabalhos em andamento (envios,
combos e juntadas pendentes). Guarde o arquivo com cuidado: ele contém os
seus contatos.

**3. 📖 Manual do Usuário** — abre este manual numa nova aba, com **índice
lateral e busca**. Os links **▶ Vídeo** tocam na própria página (feche com
**✕ Fechar** ou **Esc**). Logo acima fica o link **Termos de Uso**.

**Bom saber:** se um botão da extensão "sumiu", confira no Menu, **na aba do
sistema em que você está**, se a função não foi desligada (e se alguma função
de que ela depende não foi desligada junto). O **pontinho vermelho** do ícone
refere-se ao sistema em que a página está aberta. Quem já tinha funções
desligadas antes desta versão continua com elas desligadas nos dois sistemas,
até mudar em uma das abas.

---

<a id="cap-3"></a>
## 3. Leitura do processo (aba Movimentações)

<a id="cap-3-1"></a>
### 3.1 Pré-visualização de documentos

▶ [**Vídeo V03** — Pré-visualização de documentos](videos/V03-pre-visualizacao-de-documentos.mp4)

**Para que serve:** ler a íntegra de um documento **sem abrir outra aba**.

**Onde fica:** aba **Movimentações** do processo (Projudi e SEEU).

**Passo a passo:**

1. Abra os arquivos de uma movimentação (ícone **+**), como de costume.
2. **Pare o mouse sobre o nome do arquivo** (ex.: `Certidao de Baixa.pdf`)
   por meio segundo.
3. O documento aparece num painel sobre a tela. Role dentro dele
   normalmente.
4. Para fechar: tire o mouse do link e do painel, clique no **✕** ou tecle
   **Esc**.

**Bom saber:**

- Também funciona parando o mouse sobre o **texto da movimentação** que tem
  o controle **+** — mesmo com os arquivos recolhidos.
- Na tela **Análise de Juntadas**, funciona parando o mouse sobre o nome do
  documento na coluna **Tipo de Documento** (ex.: **Petição**), nas linhas
  que têm o controle **+**.
- Se a movimentação tiver **mais de um arquivo**, o painel não abre;
  aparece o aviso **"Múltiplos documentos"** com a quantidade. Abra o **+** e
  passe o mouse sobre cada arquivo.
- O link **Abrir em nova aba**, no topo do painel, mantém o jeito
  tradicional.
- Arquivos que o navegador não consegue exibir (alguns formatos que não
  são PDF) podem ser baixados em vez de exibidos.

<a id="cap-3-2"></a>
### 3.2 Pré-visualização das pendências

▶ [**Vídeo V04** — Pré-visualização das pendências](videos/V04-pre-visualizacao-das-pendencias.mp4)

**Para que serve:** ver os documentos de juntadas e conclusões **pendentes**
sem abrir a tela de análise. *Só no Projudi.*

**Onde fica:** quadro **Pendências** da capa do processo, nos links como
"Há 1 pendência(s) de análise de juntada".

**Passo a passo:**

1. Pare o mouse sobre o link da pendência.
2. Aguarde um instante: a extensão lê a tela de análise em segundo plano.
3. Abre-se uma janela de pré-visualização para **cada** pendência, em
   cascata.

**Bom saber:**

- A extensão só **lê**: nada é aceito, rejeitado ou dispensado.
- Se nenhum documento for encontrado, um aviso oferece abrir a análise
  completa em nova aba. O clique normal no link continua funcionando.

<a id="cap-3-3"></a>
### 3.3 Expandir movimentações e ocultar as sem arquivo

▶ [**Vídeo V05** — Expandir e ocultar movimentações](videos/V05-expandir-e-ocultar-movimentacoes.mp4)

**Para que serve:** abrir de uma vez os anexos de todas as movimentações da
página e esconder as movimentações que não têm documento.

**Onde fica:** última linha do quadro **Pendências** (na tela **Análise de
Juntadas**, na linha do botão **Filtrar**).

**Passo a passo:**

1. **Expandir Mov ▼** abre todos os controles **+** da página. O botão
   passa a se chamar **Recolher Mov ▲**.
2. **Apenas com arquivo (+)** esconde as linhas sem nenhum documento. O
   botão passa a se chamar **Mostrar todos**: clique nele para ver tudo de
   novo.
3. Marque a caixinha **sempre**, dentro desse botão, para que o ocultamento
   já venha ligado em todos os processos. Desmarque para desligar.

**Bom saber:** vale só para a página atual — a extensão não percorre as
outras páginas da lista de movimentações. Os botões só aparecem com um
processo aberto.

<a id="cap-3-4"></a>
### 3.4 Destacar movimentações por tipo de usuário

▶ [**Vídeo V06** — Destacar movimentações](videos/V06-destacar-movimentacoes.mp4)

**Para que serve:** colorir automaticamente as movimentações feitas por
**Magistrado(a)**, **Ministério Público** e/ou **Advogado(a)**, em
**todos os processos**.

**Onde fica:** botão **🖍️ Destacar mov.** da barra da extensão
(com a aba **Movimentações** aberta).

**Passo a passo:**

1. Clique em **🖍️ Destacar mov.**.
2. Marque os tipos que quer destacar.
3. Clique numa cor da paleta abaixo de cada tipo.
4. Clique em **Salvar**.

**Bom saber:**

- Duas categorias nunca ficam com a mesma cor: escolher a cor já usada por
  outro tipo troca as cores entre os dois (a cor em uso aparece com ✓).
- Para mudar, abra o botão de novo — ele vem preenchido com o que foi
  salvo.
- É independente do quadro nativo **Realces** do Projudi (que tem cores
  fixas e não lembra a escolha entre processos).

---

<a id="cap-4"></a>
## 4. Informações extras na tela do processo

Estas funções não têm botão: aparecem sozinhas ao abrir o processo. *Só no
Projudi.*

<a id="cap-4-1"></a>
### 4.1 Suspensão ativa no cabeçalho

▶ [**Vídeo V10** — Suspensão e monitoração no cabeçalho](videos/V10-suspensao-e-monitoracao-no-cabecalho.mp4)

**Para que serve:** saber, sem abrir a aba **Informações Adicionais**, se o
processo tem uma suspensão **ATIVA**.

**Onde fica:** no cabeçalho, logo depois de "(N dia(s) em tramitação)".

**Como funciona:**

1. Ao abrir o processo, a extensão lê a aba **Informações Adicionais** em
   segundo plano.
2. Para cada suspensão com status **ATIVA** e um destes motivos — **Art.
   366, CPP**; **Art. 89, L. 9.099/95**; **Insanidade Mental**; **ANPP**;
   **Transação Penal** — aparece um card, ex.: "Suspenso: Art. 366 do CPP -
   NOME DO RÉU".
3. Em seguida o card ganha a data de início: "(desde 14/05/2025)".

**Bom saber:**

- Suspensões encerradas ou por outros motivos **não** geram card.
- Com vários réus, cada suspensão ativa tem o seu card.
- Os cards continuam no cabeçalho ao trocar de aba.
- Passe o mouse sobre o card para ler a informação completa.

<a id="cap-4-2"></a>
### 4.2 Monitoração eletrônica ativa no cabeçalho

▶ [**Vídeo V10** — Suspensão e monitoração no cabeçalho](videos/V10-suspensao-e-monitoracao-no-cabecalho.mp4)

**Para que serve:** saber se há **monitoração eletrônica** em vigor e desde
quando.

**Como funciona:** quando o campo **Medidas Cautelares (Ex. Monitoração
Eletrônica)** da aba **Informações Adicionais** indica medida cautelar, a
extensão abre a tela da medida em segundo plano. Se houver "Monitoração
Eletrônica" sem data de término e com status **ATIVA**, aparece o card
"Monitorado eletronicamente: NOME DA PARTE (desde dd/mm/aaaa)" — um para
cada parte monitorada.

**Bom saber:** o card só aparece depois que a consulta termina (alguns
segundos). Outras medidas cautelares (ex.: recolhimento domiciliar) não
geram card.

<a id="cap-4-3"></a>
### 4.3 Réus, indiciados e noticiados no cabeçalho

▶ [**Vídeo V11** — Réus no cabeçalho](videos/V11-reus-no-cabecalho.mp4)

**Para que serve:** ver as partes do polo passivo com RG e CPF sem abrir a
aba **Partes e Outros**.

**Onde fica:** na tabela de informações do processo, logo abaixo da linha
**Assunto**. O rótulo é o título do polo (ex.: **Réu:**, **Indiciado:**).

**Passo a passo:**

1. Veja a lista: `NOME (RG: ...; CPF: ...)`, uma parte por linha (só os
   documentos cadastrados aparecem).
2. Clique no **nome** para abrir a ficha da parte (a mesma da aba Partes e
   Outros, com **Alterar Parte**, **Alterar Polo**, **Dar Baixa**,
   **Atualizar Dados IIPR** etc.) num popup.
3. Feche com **✕ Fechar**.

<a id="cap-4-4"></a>
### 4.4 Sequencial do processo principal (apensos)

▶ [**Vídeo V12** — Sequencial do processo principal](videos/V12-sequencial-do-processo-principal.mp4)

**Para que serve:** num processo **apenso**, ver o **Sequencial** do
processo principal sem abri-lo.

**Onde fica:** aba **Informações Gerais** do apenso, na nova linha
**Sequencial do Processo Principal:**, logo abaixo de **Processo
Principal:**.

**Bom saber:** a linha mostra "carregando…" por um instante. No próprio
processo principal ela não aparece.

---

<a id="cap-5"></a>
## 5. Envio de documentos

Funciona no **Projudi** e no **SEEU**, inclusive a certidão de envio do item
[5.4](#cap-5-4). Nas duas formas de envio, você marca
os documentos pelas caixinhas que a extensão coloca ao lado de cada arquivo
da aba **Movimentações** (abra o **+** da movimentação para vê-las). A
seleção é a mesma para WhatsApp e e-mail.

<a id="cap-5-1"></a>
### 5.1 Envio por WhatsApp Web

▶ [**Vídeo V07** — Envio por WhatsApp](videos/V07-envio-por-whatsapp.mp4)

**Antes de começar:** o WhatsApp Web precisa estar conectado (QR Code lido)
neste navegador.

**Passo a passo:**

1. Marque a caixinha de um ou mais documentos.
2. Clique em **📱 Enviar por WhatsApp**.
3. Digite o número com DDD (sem DDI, a extensão assume +55) **ou** clique
   num destinatário salvo.
4. Clique em **Enviar**.
5. O WhatsApp Web abre **na conversa do número informado** e os arquivos
   são anexados sozinhos. Um aviso no canto inferior esquerdo mostra o
   andamento ("anexando arquivo(s)…", "arquivo(s) anexado(s)").
6. ⚠️ Confira o destinatário e os anexos, escreva uma legenda se quiser e
   **clique você mesmo em enviar** no WhatsApp.

**Destinatários salvos** (dentro do painel de envio):

- **+ Novo**: nome e número (se já houver número digitado, ele vem
  preenchido);
- clique num destinatário para usá-lo;
- ☆/★ marca como favorito (favoritos ficam no topo);
- o campo de busca filtra pelo nome;
- ✕ remove (pede confirmação).

**Bom saber:**

- Se já houver uma aba do WhatsApp Web aberta, ela é reaproveitada (pode
  recarregar para trocar de conversa — o login continua).
- Se os arquivos não forem anexados, anexe manualmente; veja também
  [Solução de problemas](#cap-11).

<a id="cap-5-2"></a>
### 5.2 Envio por e-mail (Outlook)

▶ [**Vídeo V08** — Envio por e-mail](videos/V08-envio-por-email.mp4)

**Onde fica:** botão **✉️ Enviar por e-mail**, sempre visível no canto
inferior direito. Com documentos marcados ele mostra a quantidade, ex.:
"Enviar por e-mail (2)".

**Passo a passo:**

1. Marque os documentos (ou nenhum, para um e-mail sem anexos).
2. Clique em **✉️ Enviar por e-mail**.
3. Se houver destinatários salvos, marque um ou mais e clique em
   **Prosseguir** — ou em **Pular** para preencher no Outlook.
4. Abre-se um **rascunho do Outlook** numa janela menor, com:
   - os documentos anexados;
   - o campo **Para** (se escolheu destinatário);
   - no início do texto: `REF. AUTOS Nº (número)` e `JUÍZO: (vara)`.
5. Preencha o assunto e o texto, confira e clique em **Enviar** no Outlook.

**Os dois modos de envio** (escolhidos em [2.5](#cap-2-5)):

| Modo | Quando usar | Anexos |
|---|---|---|
| **Microsoft Graph** | Quando o TI cadastrou o aplicativo e informou o Client ID | Anexados automaticamente. No primeiro uso, a Microsoft pede login/autorização |
| **Outlook Web (sem Azure AD)** | Sem cadastro do TI (é o que o modo **Automático** usa nesse caso) | Os arquivos são baixados para a pasta **Downloads**; um aviso no Outlook orienta: **Anexar arquivo → Navegar neste computador** → escolha os arquivos |

**Bom saber:** anexos grandes seguem o limite do Outlook da instituição
(normalmente 25 MB por e-mail). Se o navegador pergunta onde salvar cada
download, uma janela aparecerá por arquivo.

<a id="cap-5-3"></a>
### 5.3 Destinatários favoritos e remetentes do e-mail

▶ [**Vídeo V09** — Destinatários e remetentes](videos/V09-destinatarios-e-remetentes-do-email.mp4)

**Destinatários** (a lista aparece ao clicar em **✉️ Enviar por e-mail**,
depois que houver pelo menos um salvo):

- **Adicionar**: Nome + E-mail → **+ Adicionar** (até 200);
- **Priorizar**: ☆ → ★ (prioritários primeiro; dentro de cada grupo,
  ordem alfabética);
- **Buscar**: 🔍 filtra por nome ou e-mail;
- **Remover**: 🗑.

**Remetentes (campo "De")** — modo Outlook Web:

1. Clique na seta **▼** ao lado de **Enviar por e-mail** → **Alterar
   Remetente**.
2. Cadastre até 20 contas (Nome + E-mail), edite (✏️), remova (🗑) e marque
   a **padrão** com ★.
3. Ao abrir o Outlook, a extensão mostra o campo **De** e tenta selecionar a
   conta padrão.

⚠️ A sua conta precisa ter a permissão **"Enviar como"** na caixa escolhida
(configurada pelo TI). Sem ela, o Outlook não oferece a conta e o remetente
não muda.

<a id="cap-5-4"></a>
### 5.4 Certidão de envio (e-mail e WhatsApp)

▶ [**Vídeo V43** — Certidão de envio (e-mail e WhatsApp)](videos/V43-certidao-de-envio.mp4)

*No Projudi e no SEEU.*

**Para que serve:** depois de mandar documentos do processo por e-mail
([5.2](#cap-5-2)) ou por WhatsApp ([5.1](#cap-5-1)), juntar nos autos a
**certidão do envio** com um clique e o PIN — com o destinatário, os
documentos enviados e o **comprovante** do envio já escritos no texto.

**Antes de começar (uma vez só):** grave no **📎 Juntar Documento** uma
preferência com o texto da certidão ([8.2](#cap-8-2)), usando as
**variáveis entre chaves**. Um modelo pronto é copiado pelo botão
**📋 Copiar modelo** do quadro:

> CERTIFICO que, nesta data, encaminhei por {meio} a {destinatario} o(s)
> seguinte(s) documento(s): {arquivos}.
>
> {comprovante}

Ponha a palavra **"certidão"** ou **"envio"** no nome da preferência: o
quadro já vem com ela escolhida.

**Onde fica:** depois de um envio, na tela do processo aparece, no canto
inferior esquerdo, o quadro **📎 Certificar envio**.

**Passo a passo:**

1. Envie os documentos por e-mail ou WhatsApp, como sempre.
2. O quadro mostra para quem foi, quais documentos (com o número da
   movimentação) e a situação do envio:
   - **⏳ Aguardando o envio…** — enquanto você não clicou em **Enviar**
     no Outlook ou no WhatsApp;
   - **✅ E-mail enviado em … (conferido nos Itens Enviados do Outlook)**;
   - **✅ 2 de 2 arquivo(s) enviado(s) no WhatsApp (entregue, lido)**.
3. Confira a preferência em **Certidão:**. Se quiser ler o texto antes,
   clique em **👁 Ver texto**.
4. Clique em **📎 Certificar envio**. A extensão faz a juntada sozinha e
   chama o assinador: **você só digita o PIN**.

**O que entra no comprovante:**

| Envio | Comprovante |
|---|---|
| **E-mail (Microsoft Graph)** | Dados da pasta **Itens Enviados** do Outlook: De, Para, Cc, data e hora do envio, assunto e anexos |
| **WhatsApp** | Dados da própria conversa no WhatsApp Web: nome e número do contato e, para cada arquivo, a hora do envio e a situação (enviado, entregue ou lido) |
| **E-mail (Outlook Web, sem cadastro do TI)** | Não há como conferir o envio neste modo: o quadro avisa, e a hora e o comprovante ficam para você completar no texto |

**Bom saber:**

- A extensão **confere sozinha**, a cada poucos segundos, se o e-mail ou os
  arquivos saíram. Se você certificar antes da conferência, ela pergunta se
  quer seguir assim mesmo.
- Se faltar algum dado (por exemplo, a hora no modo Outlook Web), a juntada
  **para no texto**, com o aviso *sem valor para {…}*: complete e clique em
  **Continuar** — a extensão segue daí. Marque **conferir o texto antes de
  assinar** para parar sempre nesse ponto.
- O quadro continua na tela do processo (mesmo recarregando) até você
  certificar ou clicar em **✕**. Vários envios do mesmo processo aparecem um
  depois do outro.
- A certidão **não** leva imagem (print) do e-mail ou da conversa: o
  comprovante é escrito no próprio texto da certidão, com os dados conferidos.
- Pode ser desligada no Menu ([2.6](#cap-2-6)): **Certidão de envio (e-mail e
  WhatsApp)**.

---

<a id="cap-6"></a>
## 6. Quadro Pendências

Botões que a extensão coloca ao lado dos links do quadro **Pendências** da
capa do processo. *Só no Projudi.*

⚠️ Estes botões **agem ao clicar**. Confira antes as pendências (a
pré-visualização do item [3.2](#cap-3-2) ajuda).

<a id="cap-6-1"></a>
### 6.1 Dispensar juntadas

▶ [**Vídeo V13** — Dispensar juntadas](videos/V13-dispensar-juntadas.mp4)

**Passo a passo:**

1. Ao lado de "Há N pendência(s) de análise de juntada", clique em
   **Dispensar juntadas**.
2. Aguarde: "Dispensando juntadas selecionáveis desta página…".
3. Resultado: **"Juntada(s) já dispensada(s) - Movimentação permitida."**

**Bom saber:** dispensa as juntadas selecionáveis da primeira página da
análise. Em caso de falha, **Ver detalhes** mostra a tela onde parou. O
botão fica desabilitado durante a operação.

<a id="cap-6-2"></a>
### 6.2 Finalizar conclusão pendente

▶ [**Vídeo V14** — Finalizar conclusão](videos/V14-finalizar-conclusao.mp4)

**Passo a passo:**

1. Ao lado de "Há N pendência(s) de conclusão", clique em **Finalizar
   conclusão**.
2. O botão mostra **Finalizando…** e depois **Conclusão finalizada**.

**Bom saber:**

- A extensão só age se encontrar o botão nativo **Finalizar Conclusão
  Pendente** habilitado; senão, cancela com aviso.
- Se aparecer **Verifique a conclusão**, confira manualmente no Projudi
  **antes** de tentar de novo (evita finalizar duas vezes).
- O quadro Pendências só se atualiza quando você recarregar a página.

<a id="cap-6-3"></a>
### 6.3 Dispensar decursos de prazo

▶ [**Vídeo V15** — Dispensar decursos](videos/V15-dispensar-decursos.mp4)

**Passo a passo:**

1. Ao lado do link de intimações **aguardando análise de decurso de
   prazo**, clique em **Dispensar decursos**.
2. Acompanhe "Dispensando decurso 1 de N…".
3. Resultado: **"Decurso(s) já dispensado(s) - Movimentação permitida."**

**Bom saber:** qualquer erro (inclusive demora maior que 60 s numa etapa)
**interrompe** a sequência e nada mais é dispensado; **Ver detalhes** mostra
onde parou. Uma operação por vez.

---

<a id="cap-6-4"></a>
### 6.4 Dispensar cumprimentos para expedir

▶ [**Vídeo V36** — Dispensar cumprimentos para expedir](videos/V36-dispensar-cumprimentos.mp4)

**Para que serve:** remover os cumprimentos pendentes de expedição de um mesmo tipo.

**Onde fica:** no quadro **Pendências**, ao lado de cada tipo em **Cumprimentos para Expedir** com quantidade maior que zero.

**Passo a passo:**

1. Confira o tipo e a quantidade. Clique em **Dispensar pendências** somente se quiser remover todos os cumprimentos daquele tipo.
2. Acompanhe **Dispensando 1/N…**. O botão fica desabilitado durante a operação.
3. Ao terminar, aparece **Cumprimentos dispensados (N)**. A página principal permanece aberta; recarregue-a para atualizar os contadores.

**Bom saber:** cada remoção só é contabilizada depois da confirmação do Projudi. Em caso de erro, a sequência para e aparece **Conferir dispensa (X/N)**, com a quantidade confirmada. Confira a listagem antes de repetir; não há reenvio automático. A opção **Dispensar juntadas, decursos e cumprimentos** no Menu também controla este botão.

---

<a id="cap-7"></a>
## 7. Ações rápidas e preferências

*Só no Projudi.*

<a id="cap-7-1"></a>
### 7.1 Ações rápidas

▶ [**Vídeo V16** — Ações rápidas](videos/V16-acoes-rapidas.mp4)

**Para que serve:** abrir as ações do painel lateral **Ações** do Projudi
(Enviar Concluso, Realizar Remessa, Intimar Partes…) sem rolar a tela e sem
sair da aba em que você está.

**Grupos e ações:**

| Grupo | Ações |
|---|---|
| **Concluso** | Enviar Concluso |
| **Remessa** | Realizar Remessa; Remessa Eletrônica para o Tribunal de Justiça |
| **Ordenações** | Ordenar Cumprimentos; Ordenar RPV; Ordenar Expedição BNMP |
| **Partes** | Intimar Partes; Notificar Partes; Citar Partes; Intimar Peritos e Auxiliares da Justiça |
| **Suspender** | Suspender ou Sobrestar Processo |
| **Transitar** | Transitar em Julgado |
| **Arquivar** | Arquivar Processo |
| **🏦 Alvará Eletrônico** | Cadastrar Alvará Eletrônico ([8.1](#cap-8-1)) |
| **Outras** | Interromper Prazo; Declínio de competência para a Segunda Instância; Apensar; Desapensar; Anotações Criminais; Solicitar Antecedentes Criminais |

**Passo a passo:**

1. Clique em **▸ Ações** para mostrar os grupos.
2. Clique no grupo desejado — abre um painel com as ações dele.
3. Clique em:
   - **Abrir** — quando você está na tela de Ações do Projudi;
   - **Ir e abrir** — em qualquer outra tela do processo com a lista de
     movimentações (capa, aba Movimentações, detalhe de movimentação).
4. Aparece "Abrindo '...'…" (com **Cancelar**) por um ou dois segundos e o
   **diálogo original do Projudi** abre num popup sobre a tela.
5. Preencha e confirme como sempre, ou feche com **✕ Fechar**.

**Bom saber:**

- Na tela de Ações, só aparecem as ações disponíveis para aquele processo
  (ex.: já apensado → só **Desapensar**).
- **Anotações Criminais** e **Solicitar Antecedentes Criminais** (no
  Projudi, ficam no quadro **Comunicar ao IIPR** da coluna de Ações) só
  aparecem em processos criminais. Pelo botão **Outras**, a extensão abre
  a tela de Ações do processo no popup e clica ela mesma na opção, para a
  janela do Projudi aparecer exatamente como apareceria clicando lá.
- Em outra aba (ex.: **Partes e Outros**), o painel pede para abrir a aba
  **Movimentações** primeiro.
- Ao terminar ações como **Ordenar Cumprimentos**, o popup se fecha e a
  página é recarregada sozinha.

<a id="cap-7-2"></a>
### 7.2 Preferências (preencher e confirmar com um clique)

▶ [**Vídeo V17** — Preferências](videos/V17-preferencias.mp4)

**Para que serve:** gravar o preenchimento de um diálogo (ex.: "Intimar o
MP para ciência, 5 dias") e reaplicá-lo em outros processos.

**Criar:**

1. No painel da ação, clique em **+ Nova preferência** — o diálogo do
   Projudi abre em branco.
2. Preencha como faria normalmente.
3. Com o diálogo aberto, clique em **💾 Salvar como preferência** (barra no
   topo da tela).
4. Confira a **lista de campos que serão gravados** (se faltar algum,
   cancele, ajuste e salve de novo).
5. Dê um nome e salve. **Nada foi enviado ao Projudi** — você ainda pode
   confirmar ou cancelar o diálogo normalmente.

**Usar:**

1. No painel da ação, clique no chip **★ nome-da-preferência**.
   - Se o quadro **Pendências** do processo tiver **juntadas a analisar**,
     aparece antes a pergunta *Dispensar as juntadas pendentes deste
     processo antes de executar a preferência?*: **✅ Sim, dispensar
     juntadas** dispensa e segue; **Não, seguir sem isso** só segue; **✕**
     desiste.
   - Se tiver **Retorno de Conclusão**, a pergunta é *Finalizar a conclusão
     pendente deste processo antes de executar a preferência?* (**✅ Sim,
     finalizar conclusão** ou **Não, seguir sem isso**). Havendo as duas
     pendências, são duas perguntas: primeiro as juntadas, depois a
     conclusão. É a mesma pergunta do ⭐ nas listagens ([9.3](#cap-9-3)).
   - Essas perguntas são **só do Projudi**: o SEEU não trava ações com
     pendências, e lá a preferência segue direto ([1.4](#cap-1-4)).
2. O diálogo abre **já preenchido** e aparece a barra: *Confirmar "Ação" com
   a preferência "..."?*
3. ⚠️ Confira os campos e clique em ✅ **Sim, executar** — é esse clique
   que pratica o ato. **Cancelar** desiste.

**Editar e remover:** ✏️ abre o diálogo preenchido com o botão **💾
Atualizar preferência** (nada é enviado); 🗑 remove.

**Bom saber:**

- Só o que você preencheu ou mudou em relação ao padrão é gravado.
- Uma parte específica (ex.: um réu) só é marcada no processo em que ela
  existe; em outro processo vale a caixa "marcar todos" da coluna, se ela
  foi gravada.
- Se algum campo não puder ser preenchido, a barra avisa **⚠ Não consegui
  preencher: …** e o **Sim, executar** não envia enquanto ele estiver vazio.
- Preferências de **Intimar Partes** gravadas antes da versão 2.9.84 devem
  ser salvas de novo.
- As preferências são separadas por ação e ficam no seu navegador.
- Gravada com a caixinha de um movimento marcada, a preferência passa a
  partir sempre do movimento com aquele nome (📌) — veja [7.7](#cap-7-7).
- Se a dispensa das juntadas ou a finalização da conclusão não der certo,
  um aviso informa e a preferência abre mesmo assim; confira o quadro
  Pendências.

<a id="cap-7-3"></a>
### 7.3 Minhas Preferências

▶ [**Vídeo V18** — Minhas Preferências](videos/V18-minhas-preferencias.mp4)

**Para que serve:** ver **todas** as preferências salvas (das ações rápidas,
do Juntar Documento e, no SEEU, do **📍 Localizador**) e os combos, em
cards, num só lugar.

**Passo a passo:**

1. Clique em **⭐ Minhas Preferências**.
2. Clique no card desejado — o fluxo é o mesmo do item [7.2](#cap-7-2)
   (pergunta sobre juntadas/conclusão pendentes, se houver, diálogo
   preenchido + ✅ **Sim, executar**).
3. Para mudar a ordem: **✏️ Editar posição**, arraste os cards e clique em
   **✅ Concluir**. A ordem é salva na hora.

**Bom saber:** só os primeiros cards aparecem de início; marque **Mostrar
todas** para ver o restante. Os cards **📍 Localizador** (só no SEEU)
associam os localizadores na hora, sem diálogo nem ✅ **Sim, executar**
— veja [8.8](#cap-8-8).

<a id="cap-7-4"></a>
### 7.4 Combos de preferências

▶ [**Vídeo V19** — Combos](videos/V19-combos-de-preferencias.mp4)

**Para que serve:** executar várias preferências **em sequência**, ex.:
"Intimar MP" → "Juntar certidão de decurso" → "Enviar concluso para
sentença".

**Criar:**

1. Clique em **🔗 Combos** → **+ Novo combo**.
2. Dê um nome.
3. Na **caixa 1**, escolha a preferência que roda primeiro.
4. **+ Adicionar preferência** abre a caixa seguinte. Use ↑/↓ para mudar a
   ordem e ✕ para remover uma caixa.
5. **💾 Salvar combo** (mínimo de 2 preferências).

**Executar:**

1. Em **🔗 Combos** (ou em **⭐ Minhas Preferências**), clique em **▶ nome**.
   Se o quadro Pendências tiver juntadas a analisar e/ou Retorno de
   Conclusão, o combo pergunta antes se deve dispensar as juntadas e/ou
   finalizar a conclusão (como em [7.2](#cap-7-2)); **Sim** ou **Não**
   iniciam o combo, **✕** desiste.
2. Cada etapa abre sozinha, preenchida, com a barra "Combo ... — etapa i de
   N".
3. ⚠️ **Cada etapa pede o seu ✅ Sim, executar.** O combo nunca confirma um
   ato sozinho.
4. Se uma etapa for fechada sem executar, a barra de baixo oferece **↻
   Repetir etapa**, **⏭ Próxima etapa** (se você a fez à mão) e **⏹ Parar
   combo**.

**Bom saber:**

- Etapas de **Juntar Documento** são feitas na própria aba e param na
  assinatura (você digita o PIN) — ver [8.2](#cap-8-2).
- Etapas de **Alvará Eletrônico** só preenchem; clique em **Salvar** do
  Projudi e depois em **⏭ Próxima etapa**.
- O combo continua mesmo depois de a página recarregar, mas **não**
  continua se você abrir outro processo na mesma aba.
- Editar uma preferência vale também para os combos que a usam; se ela for
  removida, o combo avisa.

<a id="cap-7-5"></a>
### 7.5 Nova Ordenação

▶ [**Vídeo V26** — Nova Ordenação](videos/V26-nova-ordenacao.mp4)

**Para que serve:** ordenar **vários cumprimentos seguidos** (mandado,
ofício, edital…) sem reabrir o diálogo a cada um. Vale para **Ordenar
Cumprimentos**, **Ordenar RPV** e **Ordenar Expedição BNMP**.

**Passo a passo:**

1. Abra o diálogo de ordenação e preencha o primeiro cumprimento.
2. Clique em **🔁 Nova Ordenação** (ao lado de **Ordenar**). O item vai para
   a fila — nada é enviado — e o formulário fica limpo.
3. Repita para os demais. O botão mostra a fila, ex.: "🔁 Nova Ordenação (2
   na fila)"; ✕ remove um item.
4. No último, clique no **Ordenar** do Projudi: todos os itens são enviados,
   um a um.

**Bom saber:**

- Se algum item falhar, a extensão **para** e diz qual; o restante continua
  na fila.
- Mandado Regionalizado também vai na fila: a extensão espera o Projudi
  carregar a lista de **Central de Mandados** da Comarca de Destino antes
  de escolher a central guardada. Opções que liberam outros campos (ex.:
  **Urgente: Sim**, que libera o **Tipo de Urgência**) também são
  refeitas como um clique seu.
- **Cancelar** descarta a fila.
- ⚠️ Confira nos autos se todos os cumprimentos foram registrados,
  especialmente em ordenações com prazo.

<a id="cap-7-6"></a>
### 7.6 Nova Remessa

▶ [**Vídeo V27** — Nova Remessa](videos/V27-nova-remessa.mp4)

**Para que serve:** fazer mais de uma remessa seguida (ex.: Delegacia e
Ministério Público) na mesma tela de **Realizar Remessa**.

**Passo a passo:**

1. Em **Realizar Remessa**, escolha e preencha a primeira remessa.
2. Clique em **🔁 Nova Remessa** — ela vai para a fila e a tela é limpa.
3. Preencha a próxima; repita se precisar.
4. Termine com o **Realizar Remessa** do Projudi: todas são enviadas.

**Bom saber:** mesmas regras da Nova Ordenação (para no primeiro erro;
confira nos autos).

<a id="cap-7-7"></a>
### 7.7 Escolher a movimentação das Ações rápidas

▶ [**Vídeo V37** — Escolher a movimentação das Ações rápidas](videos/V37-escolher-a-movimentacao.mp4)

**Para que serve:** escolher **a partir de qual movimentação** as Ações
rápidas, as preferências e os combos vão agir — o mesmo que você faz à mão
ao clicar num evento e depois em **Movimentar a Partir Desta Movimentação**.
Assim, a remessa, a intimação ou a ordenação fica ligada ao evento certo
(ex.: o despacho que a determinou), e é esse evento que o destinatário vê.

**Onde fica:** na aba **Movimentações** do processo, uma **caixinha** na
primeira coluna de **todas** as movimentações, à esquerda do número
(**Seq.**) — haja ou não arquivos (antes de **⊞ Arquivos**, quando houver).
Nas movimentações tachadas (inválidas) a caixinha aparece bloqueada. As
caixinhas **dos arquivos**, usadas para enviar por WhatsApp e e-mail, não
mudam: continuam permitindo marcar vários arquivos ([5.1](#cap-5-1)).

**Passo a passo:**

1. Na aba **Movimentações**, marque a caixinha da movimentação desejada. A linha
   fica contornada em azul e as demais caixinhas ficam **esmaecidas** e não
   podem ser marcadas. Para escolher outra, desmarque primeiro a atual.
2. Use as Ações rápidas como sempre: **Ir e abrir**, uma preferência
   (**★ nome**), um card de **⭐ Minhas Preferências** ou um **🔗 Combo**.
3. O aviso passa a dizer *Abrindo "Ação" a partir da movimentação N
   "EVENTO"…*.
4. Confira o diálogo e confirme (✅ **Sim, executar**) como de costume.

**Bom saber:**

- **Sem nenhuma caixinha marcada, nada muda:** a extensão continua
  escolhendo sozinha a movimentação mais recente, como antes.
- Num **combo**, a movimentação marcada no início vale para **todas as
  etapas**, mesmo depois de a página recarregar.
- Quando a tela recarrega (por exemplo, ao terminar uma ação), a marcação
  some — como na movimentação manual, escolha de novo para a próxima ação.
- Se o evento marcado não permitir a ação (alguns tipos de movimentação
  levam a outra tela), a extensão **não** troca por outro: ela avisa, e você
  marca outro evento (um despacho/decisão costuma funcionar) ou desmarca a
  caixinha para a escolha automática.
- **Juntar Documento**, **Alvará Eletrônico** e **Advogados** não usam a
  movimentação marcada.

**Preferência que sempre parte de um movimento** (ex.: *JULGADA PROCEDENTE
A AÇÃO*, *CONCEDIDA A MEDIDA PROTETIVA*):

▶ [**Vídeo V38** — Preferência a partir de um movimento](videos/V38-preferencia-a-partir-de-um-movimento.mp4)

1. Na aba **Movimentações**, marque a caixinha do movimento.
2. Crie a preferência como sempre (**+ Nova preferência**, preencher, **💾
   Salvar como preferência** — [7.2](#cap-7-2)). A lista do que será gravado
   mostra **Movimento de referência: NOME DO MOVIMENTO**.
3. A preferência ganha um **📌** ao lado do nome (passe o mouse para ver o
   movimento).
4. Ao usá-la, em qualquer processo, a extensão procura na aba Movimentações
   o movimento **com esse nome** (o mais recente, se houver vários; maiúsculas
   e acentos não importam) e parte dele.
5. Se o processo **não tiver** esse movimento, aparece o aviso *Não localizei
   o movimento "…" na aba Movimentações deste processo*, numa caixa igual à
   da pergunta sobre juntadas pendentes: **✅ Prosseguir** segue pela regra
   geral (como se a preferência não tivesse movimento); **Cancelar** (ou **✕**)
   não executa nada (num combo, a barra
   oferece Repetir, Próxima etapa ou Parar).

Bom saber sobre essas preferências:

- Preferências gravadas **sem** caixinha marcada continuam como sempre.
- Uma caixinha marcada na hora de **usar** tem prioridade sobre o movimento
  gravado (num combo, a marcada no início do combo).
- Na própria tela de **Ações** do Projudi (botão **Abrir**), a movimentação
  já foi escolhida por você e o movimento gravado não é procurado.
- Ao **editar** (✏️) uma preferência com 📌: com uma caixinha marcada, o
  movimento é trocado pelo marcado; sem caixinha, a extensão pergunta se
  mantém o movimento gravado (**OK**) ou se o retira (**Cancelar**).
- Pode ser desligada no Menu ([2.6](#cap-2-6)): **Escolher a movimentação
  das Ações rápidas**.

---

<a id="cap-8"></a>
## 8. Atalhos para telas do processo

*Só no Projudi* (exceto o [8.8](#cap-8-8), *só no SEEU*, o ícone do BNMP 3.0 do [8.7](#cap-8-7) e o **📎 Juntar Documento** do [8.2](#cap-8-2), que também aparecem no SEEU). Os atalhos de 8.1
a 8.6 abrem num **popup** sobre a tela atual — a aba do processo não sai do
lugar. Feche com **✕ Fechar**.

<a id="cap-8-1"></a>
### 8.1 Alvará Eletrônico

▶ [**Vídeo V20** — Alvará Eletrônico](videos/V20-alvara-eletronico.mp4)

**Para que serve:** chegar ao **Cadastrar Alvará Eletrônico** sem passar
por Informações Adicionais → Depósitos/Alvarás → Novo Alvará, e já com os
campos repetitivos preenchidos.

**Onde fica:** **▸ Ações** → **🏦 Alvará Eletrônico**.

**Passo a passo:**

- **Abrir**: mostra a tela de **Modalidade** para você escolher.
- **+ Nova preferência**: escolha a modalidade, preencha os campos fixos no
  formulário completo e clique em **💾 Salvar como preferência**. Crie uma
  preferência para cada modalidade que usa.
- **★ preferência**: a modalidade é escolhida sozinha e você já vê o
  formulário preenchido.

**Campos gravados:** Magistrado, Urgente, Natureza do Alvará, Representação
Processual, Finalidade do Pagamento, Tipo de Crédito e Observação.

⚠️ Conta judicial, beneficiário, sacadores, dados bancários, datas e
**valores** são sempre preenchidos por você. Não há ✅ **Sim, executar**:
confira e clique em **Salvar** do próprio Projudi.

<a id="cap-8-2"></a>
### 8.2 Juntar Documento com preferências

▶ [**Vídeo V21** — Juntar Documento](videos/V21-juntar-documento.mp4)

*No Projudi e no SEEU* — o SEEU usa as mesmas telas de juntada do Projudi.
No SEEU, o botão fica na barra da extensão logo depois de **⭐ Minhas
Preferências** e do **📍 Localizador**, nas telas do processo que têm o botão
**Juntar Documento** do próprio SEEU.

**Para que serve:** juntar documentos digitados de rotina (certidões,
informações, termos) refazendo sozinha todas as telas — você só digita o
PIN do certificado.

**Onde fica:** botão **📎 Juntar Documento** da barra da extensão (não
confundir com o botão nativo de mesmo nome).

| Opção | O que faz |
|---|---|
| **Abrir** | Vai para a tela Juntar Documento, como o botão nativo |
| **+ Nova preferência** | Grava o fluxo que você fizer |
| **★ nome** | Refaz o fluxo sozinha |
| **✏️** | Refaz o fluxo com as telas preenchidas, sem clicar em nada, para você ajustar e atualizar |
| **🗑** | Remove a preferência |

**Gravar (+ Nova preferência):** uma faixa **● Gravando** no topo diz o que
fazer em cada tela.

1. **Juntar Documento**: escolha o **Tipo de Documento** → **Adicionar**.
2. **Inserir Arquivo**: **Tipo do Arquivo** (e **Modelo**, se usar) →
   **Digitar Texto**.
3. **Digitar Documento**: escreva o texto → **Continuar**.
4. Pré-visualização: **Concluir**.
5. De volta ao **Inserir Arquivo**: **Assinar Arquivos** — a extensão pede o
   **nome** da preferência e salva. O assinador segue normalmente.

**Usar (★ nome):** a extensão faz Tipo de Documento → Adicionar → Tipo do
Arquivo/Modelo → texto → Continuar → Concluir → **Assinar Arquivos**. Você
digita o PIN; depois ela clica em **Confirmar Inclusão** e **Concluir
Movimento**.

**Variáveis no texto:** escreva no texto da preferência palavras entre
chaves; ao juntar, a extensão as troca pelo valor do processo. A lista fica
em **{ } Variáveis no texto**, no próprio painel do 📎 Juntar Documento.

| Variável | Vira |
|---|---|
| `{numero_processo}` | o número do processo |
| `{hoje}` / `{hoje_extenso}` | a data de hoje (03/10/2026 / 3 de outubro de 2026) |
| `{agora}` | a hora atual |
| `{juizo}` | o juízo/vara do cabeçalho |
| `{reus}` | os réus do cabeçalho, com RG e CPF ([4.3](#cap-4-3)) — só no Projudi |
| `{evento}` | a movimentação marcada na caixinha da aba Movimentações ([7.7](#cap-7-7)) |
| `{perguntar:Texto}` | a extensão pergunta o valor na hora (ex.: `{perguntar:Número do ofício}`) |
| `{meio}`, `{destinatario}`, `{arquivos}`, `{data_envio}`, `{hora_envio}`, `{remetente}`, `{assunto}`, `{comprovante}` | dados do envio — só na certidão de envio ([5.4](#cap-5-4)) |

Se uma variável ficar sem valor, a juntada **para no texto** (*sem valor
para {…}*): complete e clique em **Continuar** — a extensão segue daí.

**Bom saber:**

- Só o texto que **você** escreveu é gravado; cabeçalho, número dos autos,
  data e texto do Modelo são gerados pelo Projudi em cada processo.
- O PIN **nunca** é guardado.
- Se um passo automático falhar, faça-o à mão: a extensão continua do
  seguinte. **Parar**, na faixa, encerra sem gravar.
- O acompanhamento expira em 1 hora e para se você abrir outro processo.

<a id="cap-8-3"></a>
### 8.3 (Des)Habilitar Advogado

▶ [**Vídeo V22** — (Des)Habilitar Advogado](videos/V22-des-habilitar-advogado.mp4)

**Para que serve:** abrir a tela do botão nativo **Advogados** (aba Partes e
Outros) num popup, para habilitar, desabilitar, adicionar ou remover
advogado — e guardar **preferências de advogados**: listas de advogados
que você costuma cadastrar juntos (ex.: os advogados de um mesmo
escritório), para não ter de pesquisar um por um pela OAB a cada processo.

**Onde fica:** botão **⚖️ Advogados** da barra da extensão. Ele abre um
painel com:

| Opção | O que faz |
|---|---|
| **Abrir** | Abre no popup a tela do botão nativo **Advogados** (a lista de advogados do processo), como antes |
| **+ Nova preferência** | Abre direto a tela **Habilitação de Advogado/Sociedade para Parte**, para você montar a lista e salvá-la |
| **★ nome** | Abre a tela já com os advogados da preferência na seção **Advogados** |
| **✏️** | Abre a tela com a preferência, para você ajustar a lista e atualizá-la |
| **🗑** | Remove a preferência |

**Passo a passo — usar a tela sem preferência:** clique em **⚖️ Advogados**
→ **Abrir**, faça a alteração no popup e feche com **✕ Fechar**. Funciona
mesmo sem advogado cadastrado (para incluir o primeiro).

**Passo a passo — criar uma preferência:**

1. Clique em **⚖️ Advogados** → **+ Nova preferência**.
2. Na seção **Advogados**, clique em **Adicionar**. Na tela **Seleção de
   Advogado**, digite a **OAB**, clique em **Pesquisar**, marque a bolinha
   do advogado e clique em **Selecionar**. Ele aparece na lista.
3. Repita o passo 2 para cada advogado que deve fazer parte da preferência.
4. Se quiser, escolha a **Atuação** (ex.: Defensor Dativo).
5. Clique em **💾 Salvar como preferência** (barra abaixo do popup),
   confira a lista que aparece e dê um **nome** (ex.: "Escritório Silva").

**Passo a passo — usar a preferência:**

1. Clique em **⚖️ Advogados** → **★ nome-da-preferência** (ou use o card
   em **⭐ Minhas Preferências**, ou ponha a preferência num **🔗 Combo**).
2. A tela **Habilitação de Advogado/Sociedade para Parte** abre e a extensão inclui sozinha, um de cada vez, cada advogado
   da preferência na seção **Advogados**, fazendo por você o mesmo caminho
   de sempre: **Adicionar** → OAB → **Pesquisar** → bolinha →
   **Selecionar** (um aviso amarelo no alto da tela mostra o andamento). No
   fim, escolhe a **Atuação** gravada.
3. Marque as **Partes do Processo** que o advogado vai representar e
   clique em **Salvar** do próprio Projudi.

**Bom saber:**

- As **Partes do Processo** **não** são gravadas — elas mudam de um
  processo para outro. Marcá-las e clicar em **Salvar** é sempre com você:
  nada é salvo no Projudi sem esse clique.
- Advogado que já está na lista não é incluído de novo.
- Se algum advogado não puder ser incluído (ex.: inscrição cancelada), o
  aviso no alto da tela fica vermelho e diz qual: inclua-o pelo
  **Adicionar**, se for o caso.
- Para mudar a lista de uma preferência, use **✏️**: ajuste a lista
  (**Adicionar**/**Remover**) e clique em **💾 Atualizar preferência**.
- A preferência só funciona na tela do processo (não no ⭐ das listagens).

<a id="cap-8-4"></a>
### 8.4 Editar Partes/Outros

▶ [**Vídeo V23** — Editar Partes/Outros](videos/V23-editar-partes-outros.mp4)

**Para que serve:** abrir a tela **Partes do Processo** (botão nativo
**Partes e Outros**, com **Adicionar** e **Voltar**) num popup.

**Passo a passo:** clique em **👥 Partes**, faça as
alterações e feche com **✕ Fechar**.

<a id="cap-8-5"></a>
### 8.5 Colar processo

▶ [**Vídeo V24** — Colar processo](videos/V24-processo-copiado.mp4)

**Para que serve:** abrir a busca de um processo cujo número você copiou de
outro lugar (e-mail, planilha, documento).

**Passo a passo:**

1. Selecione o número e copie (**Ctrl+C**). Pode ter pontos e traços ou
   não, mas deve ser **um único** número no padrão CNJ (20 dígitos).
2. No Projudi, clique em **📋 Colar processo** (antes chamado "Processo
   copiado").
3. Uma **nova aba** abre a **Busca de Processos**, marca "Número Único",
   preenche o número e pesquisa.

**Bom saber:** se aparecer "Há mais de um número de processo copiado",
copie só um. Na primeira vez, o navegador pode pedir permissão para ler a
área de transferência — autorize.

<a id="cap-8-6"></a>
### 8.6 Oráculo

▶ [**Vídeo V25** — Oráculo](videos/V25-oraculo.mp4)

**Para que serve:** abrir a consulta de **antecedentes criminais (Oráculo)**
da parte sem ir até a ficha dela.

**Passo a passo:**

1. Clique em **Oráculo**.
2. Se houver mais de uma parte que pode ser consultada (réu, investigado,
   noticiado…), escolha na lista.
3. Abre-se a janela nativa **Antecedentes Criminais - Oráculo**.

**Bom saber:** se você já estiver na ficha de uma parte, o atalho usa o
botão Oráculo dela.

<a id="cap-8-7"></a>
### 8.7 Sistemas do CNJ (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud)

▶ [**Vídeo V39** — Sistemas do CNJ](videos/V39-sistemas-do-cnj.mp4)

**Para que serve:** abrir sistemas do CNJ usados no dia a dia sem sair do
processo.

**Onde fica:** no alto da tela, numa fileira de **ícones pequenos e
coloridos** logo **à esquerda da balança dourada** do Menu da extensão
(abaixo do link **Sair**). Eles acompanham a balança ao rolar a página e
**só aparecem com um processo aberto** — na Mesa, nas listas e nas demais
telas fica só a balança. **No SEEU** aparece só o ícone do **BNMP 3.0**
(também só com um processo aberto). Cada desenho lembra o logotipo do sistema. Na ordem
padrão, da balança para a esquerda:

| Ícone | Sistema | Para quê |
|---|---|---|
| Verde-água, "on" (do logotipo ONSERP) | **SerpJud** | Registros públicos (cartórios de imóveis, títulos, pessoas) |
| Lilás, losango com um "visto" | **CNIEP** | Inspeções em estabelecimentos penais |
| Azul-lavanda, pessoa com uma seta | **BNMP 3.0** | Banco Nacional de Medidas Penais e Prisões (mandados) |
| Pêssego, quadrado com uma pessoa sorrindo | **PrevJud** | Informações previdenciárias |
| Verde-claro, pilha de moedas | **Sisbajud** | Ordens a bancos (bloqueio de valores, informações) |
| Rosa, quadradinhos em "X" | **SNGB** | Gestão de bens apreendidos |
| Azul-claro, cifrão entre arcos | **Sniper** | Investigação patrimonial |
| Coral, documento com lupa | **Infojud** | Declarações e dados da Receita Federal (pelo e-CAC) |

**Mudar a ordem dos ícones:** clique num ícone e, **sem soltar**, arraste-o
para a direita ou para a esquerda; os outros abrem espaço. Solte no lugar
desejado. A nova ordem fica guardada como sua preferência (vale para todas
as abas do Projudi) e vai junto no **⬇ Exportar** do Menu
([2.6](#cap-2-6)). Um clique sem arrastar abre o sistema normalmente.

**Passo a passo:**

1. Clique no ícone do sistema (passe o mouse para ver o nome).
2. O sistema abre num **popup** sobre a tela do processo (o mesmo tipo de
   janela usado por Remessa, Concluso e as demais ações rápidas). Entre com
   o seu acesso e trabalhe nele.
3. Se preferir trabalhar com o sistema fora do popup, use os botões do topo
   dele:
   - **🗂 Nova aba** — abre o sistema numa aba nova do navegador, logo ao
     lado da aba do processo;
   - **🖥 Segundo monitor** — abre o sistema numa janela que ocupa o
     **outro monitor** inteiro. Se só houver um monitor conectado, a
     extensão avisa e o popup continua aberto.
4. Para voltar ao processo, clique em **✕ Fechar** (ou tecle **Esc**).

**Bom saber:**

- O popup fica sobre o processo: a aba do processo não muda de lugar.
- Se o login de um sistema não funcionar dentro do popup, use **🗂 Nova
  aba** ou **🖥 Segundo monitor**.
- Ao fechar o popup, o que estava aberto no sistema não fica guardado; ao
  clicar de novo, ele abre na tela inicial.
- O **Infojud** é da Receita Federal e abre pelo **e-CAC**: o acesso é com
  o certificado digital (ou gov.br). Se o e-CAC não abrir no popup, use
  **🗂 Nova aba** ou **🖥 Segundo monitor**.

---

<a id="cap-8-8"></a>
### 8.8 Localizador (só no SEEU)

*Só no SEEU.*

▶ [**Vídeo V40** — Localizador (SEEU)](videos/V40-localizador-seeu.mp4)

**Para que serve:** associar ao processo, **com um clique**, os
localizadores que você mais usa — um ou vários de uma vez —, sem procurar
cada um na lista do **+** do SEEU.

**Onde fica:** na barra de botões da extensão ([2.4](#cap-2-4)), logo
depois do **⭐ Minhas Preferências**: botão **📍 Localizador**. Ele abre um
painel com as suas preferências:

| Opção | O que faz |
|---|---|
| **nome da preferência** | Associa ao processo todos os localizadores da preferência |
| **➕ Nova preferência** | Abre a lista de localizadores ativos da unidade para você montar uma preferência |
| **✏️** | Muda o nome ou os localizadores da preferência |
| **↑** | Sobe a preferência na lista |
| **🗑** | Remove a preferência |

**Passo a passo — criar uma preferência:**

1. Clique em **📍 Localizador** → **➕ Nova preferência**.
2. A extensão lê a lista **Associar localizador ao processo** (a mesma do
   **+**) e mostra os localizadores ativos da unidade. Use **Pesquisar
   localizador...** para achar mais rápido.
3. Marque **um ou mais** localizadores e, se quiser, dê um **nome** (ex.:
   "Audiência cumprida"). Sem nome, a preferência mostra os localizadores.
4. Clique em **Salvar**.

**Passo a passo — usar a preferência:**

1. Com o processo aberto, clique em **📍 Localizador** — ou em
   **⭐ Minhas Preferências**, onde a preferência aparece como um card
   **📍 Localizador** ([7.3](#cap-7-3)).
2. Clique na preferência (ou no card). A extensão escolhe cada localizador na lista do
   **+**, um de cada vez, como você faria, e mostra o andamento no painel.
3. No fim, o painel diz quais foram associados.

**Bom saber:**

- O botão só aparece no **SEEU** (também no SEEU de treino), na tela do
  processo, e precisa das **Ações rápidas** ligadas no Menu
  ([2.6](#cap-2-6)). Para associar, o **+** dos localizadores precisa
  estar disponível (perfil com permissão para associar localizador).
- No **✏️** e no **🗑** do card em **⭐ Minhas Preferências** você também
  edita ou remove a preferência.
- Localizador que **já está** no processo não é associado de novo.
- Se um localizador da preferência **não estiver** na lista da unidade (foi
  desativado, ou você está em outra unidade), o painel avisa qual — os
  demais são associados normalmente. No **✏️**, ele aparece com o aviso
  "(não está na lista desta unidade)", para você desmarcá-lo.
- Se o painel pedir para **conferir no cabeçalho**, a extensão escolheu o
  localizador na lista, mas não conseguiu confirmar que ele apareceu: olhe
  os localizadores no alto da tela.
- Para tirar um localizador do processo, use o próprio SEEU.
- As preferências entram no **⬇ Exportar** do Menu da extensão
  ([2.6](#cap-2-6)).

<a id="cap-8-9"></a>
### 8.9 Alterar Classe/Assuntos

*Só no Projudi.*

▶ [**Vídeo V42** — Alterar Classe/Assuntos](videos/V42-alterar-classe-e-assuntos.mp4)

**Para que serve:** alterar a **classe processual** ou os **assuntos** do
processo sem sair da tela em que você está. Abre, num popup, a mesma tela
do botão **Alterar** da aba **Informações Gerais**.

**Onde fica:** no cabeçalho do processo, logo abaixo do número, há um
pequeno balão cinza **✏️ Alterar** ao lado da **Classe Processual** e ao
lado do **Assunto Principal**. Ele aparece em qualquer aba do processo.

**Passo a passo:**

1. Clique em **✏️ Alterar** ao lado da classe (para mudar a classe) ou do
   assunto principal (para mudar os assuntos).
2. Abre-se o popup com a tela de alteração do processo, já no campo
   clicado (ele pisca em amarelo por um instante).
3. Faça a alteração como de costume no Projudi: na classe, escolha também
   o **Motivo da Alteração** (Retificação ou Evolução); nos assuntos, use a
   lupa do **Assunto Principal** e **Adicionar**/**Remover** dos
   **Assuntos Secundários**.
4. Clique em **Salvar**. O popup fecha sozinho e a tela do processo é
   recarregada, já com a classe e os assuntos novos.

**Bom saber:**

- Os dois balões abrem a **mesma tela** (ela tem a classe e os assuntos);
  muda só o campo em que ela abre.
- Se o Projudi apontar algum erro ao salvar (por exemplo, um campo
  obrigatório), o popup continua aberto para você corrigir.
- **Voltar** ou **✕ Fechar** fecham o popup sem alterar nada (se você já
  tinha salvado, a tela do processo é recarregada).
- Se aparecer "Não encontrei o botão Alterar…", o seu perfil não tem
  permissão para alterar este processo — o mesmo que acontece na aba
  **Informações Gerais**.

---

<a id="cap-9"></a>
## 9. Telas de análise, mesas e cumprimentos

*Só no Projudi* — exceto as listas de tarefas ([9.2](#cap-9-2)) e a **⭐**
([9.3](#cap-9-3)), que também aparecem nas listas **Análise de Juntadas** e
**Retorno de Conclusão** do SEEU.

<a id="cap-9-1"></a>
### 9.1 Filtro por Sequencial na Análise de Decurso de Prazo

▶ [**Vídeo V28** — Sequencial no Decurso de Prazo](videos/V28-sequencial-no-decurso-de-prazo.mp4)

**Para que serve:** dividir a fila de decursos entre servidores pelo último
dígito do **Seq.**, como já existe em outras telas de análise.

**Onde fica:** menu **Decurso de Prazo** (tela **Análise de Decurso de
Prazo**), no formulário de busca, campo **Sequencial:**.

**Passo a passo:**

1. Digite um dígito de **0 a 9**.
2. Clique em **Filtrar**.
3. A extensão percorre **todas as páginas** do resultado e mostra só os
   processos cujo Seq. termina nesse dígito, com um resumo no lugar da
   paginação.

**Bom saber:** o campo começa sempre em branco. Deixe-o vazio para a busca
normal.

<a id="cap-9-2"></a>
### 9.2 Listas de tarefas

▶ [**Vídeo V29** — Listas de tarefas](videos/V29-listas-de-tarefas.mp4)

**Onde fica:** telas **Análise de Juntadas**, **Retorno de Conclusão** e
**Análise de Decurso de Prazo**.

**Criar listas e preferências:** clique em **⚙ Gerenciar listas e
preferências**:

- **Listas (cores da legenda)**: nome (ex.: "Urgente", "Cobrar AR") + cor →
  **+ Criar lista**. ▲/▼ reordenam, ✏️ edita, 🗑 remove (a lista sai de
  todos os processos; as tarefas escritas continuam).
- **Preferências (tarefas prontas)**: texto (ex.: "Certificar decurso") e,
  se quiser, uma lista → **+ Criar preferência**.
- **Apagar tarefas concluídas de todos os processos**, quando quiser
  limpar.

**Usar na linha do processo:**

1. Clique no **+** ao lado do número do processo.
2. Marque as listas (cores) do processo.
3. Escreva tarefas e tecle **Enter**; marque-as como concluídas (☑), edite
   (✏️) ou remova (🗑). Ou use uma preferência (**Adicionar esta tarefa**).
4. A linha mostra as bolinhas das listas e **✎ N** (tarefas pendentes —
   passe o mouse para ler; "✎ ✓" quando todas foram concluídas).

**Filtrar:** clique numa lista da legenda **Listas de tarefas** para ver só
os processos dela; **✕ limpar filtro** volta a mostrar todos.

**Bom saber:** as marcações seguem o **número do processo** (valem nas três
telas), ficam só no seu navegador e aparecem em todas as abas abertas.

<a id="cap-9-3"></a>
### 9.3 Minhas Preferências na linha do processo (⭐)

▶ [**Vídeo V30** — ⭐ na linha do processo](videos/V30-minhas-preferencias-na-linha.mp4)

**Para que serve:** executar uma preferência ou combo num processo direto
da tela de análise, sem abri-lo.

**Passo a passo:**

1. Clique no **⭐** da linha (ao lado do **+**).
2. Escolha um card.
3. A extensão pergunta, conforme a tela, se deve antes **dispensar as
   juntadas**, **finalizar a conclusão** ou **dispensar os decursos**
   pendentes do processo. **Sim** acrescenta essa etapa; **Não** segue sem
   ela; **✕** (ou Esc) cancela tudo.
4. O diálogo abre preenchido no popup; confira e clique em ✅ **Sim,
   executar**.
5. A linha mostra o andamento e o resultado, ex.: "✅ Juntada(s) já
   dispensada(s) · ★ Remessa MP: concluída".

**Bom saber:**

- A lista **não** é recarregada ao final, para não perder a busca feita.
- Preferências avulsas de **Juntar Documento**, **Alvará Eletrônico** e
  **Advogados** aparecem esmaecidas (use-as na tela do processo).
- Combos com essas etapas abrem o processo numa **nova aba** e rodam lá.
- No **Retorno de Conclusão**, o **Sim** finaliza a conclusão pela linha
  **"Retorno de Conclusão"** do quadro Pendências do processo (a mesma do
  botão **Finalizar conclusão** da capa). Se o processo não tiver essa
  linha, a extensão segue o **Analisar** da tela "Dados da Conclusão". Se
  mesmo assim não houver o botão **Finalizar Conclusão Pendente**, a linha
  avisa quais botões a tela tem, e a preferência abre do mesmo jeito.
- Um card por vez.

**No SEEU** (listas **Análise de Juntadas** e **Retorno de Conclusão**):

▶ [**Vídeo V41** — Localizador pela ⭐ da lista (SEEU)](videos/V41-localizador-na-linha-seeu.mp4)

1. Clique no **⭐** da linha. Aparecem as preferências do
   **📍 Localizador** ([8.8](#cap-8-8)) — as ações rápidas não funcionam
   no SEEU.
2. Clique numa preferência. A extensão abre o processo **em segundo
   plano** e associa os localizadores dela, um de cada vez, pela lista do
   **+** do próprio SEEU. Você continua na lista.
3. A linha mostra o andamento e, no fim, o resultado: **✅** quando todos
   foram associados; **⚠** dizendo o que não foi possível (ex.:
   localizador que não está na lista da unidade).

- Localizador que já está no processo não é associado de novo.
- No SEEU **não há** a pergunta sobre dispensar as juntadas ou finalizar a
  conclusão, e nada é dispensado nem finalizado: o SEEU, ao contrário do
  Projudi, não trava as ações quando há juntadas ou conclusões pendentes
  ([1.4](#cap-1-4)). A preferência é executada direto.
- Sem preferências de localizador, a ⭐ avisa para criá-las no botão
  **📍 Localizador**, na tela do processo.

<a id="cap-9-4"></a>
### 9.4 Mesa do Analista sem itens zerados

▶ [**Vídeo V31** — Mesa do Analista](videos/V31-mesa-do-analista-sem-zerados.mp4)

**Como funciona:** na **Mesa do Analista** e na **Mesa do Escrivão**, as
linhas cujos contadores estão **todos em zero** ficam ocultas. Em "Outros
Cumprimentos", uma linha só some se todas as colunas (Para Expedir, Com
Urgência, Para Assinar…) estiverem zeradas. Quando surge pendência, a linha
reaparece sozinha.

<a id="cap-9-5"></a>
### 9.5 RG e CPF das partes nos cumprimentos

▶ [**Vídeo V32** — RG e CPF nos cumprimentos](videos/V32-rg-e-cpf-nos-cumprimentos.mp4)

**Onde aparece:**

- na **lista de cumprimentos** (ao clicar num contador da lista de
  ordenações, ex.: "Demais cumprimentos" › "Para Expedir"), coluna
  **Referente a(s) parte(s)**;
- na tela do cumprimento (**Visualizar**), linha **Referente a(s)
  parte(s):**.

Formato: `NOME (Réu) — RG: ...; CPF: ...`. Enquanto busca, mostra
"RG/CPF: carregando…"; documento ausente aparece como "não cadastrado".

<a id="cap-9-6"></a>
### 9.6 Dados processuais nas ordenações BNMP

▶ [**Vídeo V33** — Ordenações BNMP](videos/V33-dados-processuais-nas-ordenacoes-bnmp.mp4)

**Para que serve:** ter, também nas peças que **não são guias** (Mandado de
Prisão, Alvará de Soltura, Mandado de Internação, Contramandado, Mandado de
Monitoramento Eletrônico etc.), os dados que ajudam a preencher o **BNMP
3** — nas guias o Projudi já os mostra.

**Seções montadas (para cada parte da ordenação):**

| Seção | Conteúdo |
|---|---|
| **Dados da Peça** | Local da Prisão (a prisão sem soltura/conversão; senão "Sem informação") |
| **Dados do Processo Criminal** | Classe, data da infração, datas de oferecimento/recebimento da denúncia (e do aditamento), imputações |
| **Cadastro de Sentença** | Datas da sentença e do acórdão, recurso, regime inicial, pena, dias-multa, trânsito em julgado (relativo à sentença) |
| **Tipificação penal** | Por crime: data do delito, tipo, frações de progressão/livramento, reincidência, pena e **Data de Prescrição**; abaixo, **Próxima Prescrição** |
| **Cadastro das Prisões** | Data, motivo, local, soltura/conversão, período e total |

**Bom saber:** clique em **⊟** para recolher uma seção. Se alguma tela não
puder ser lida, aparece a seção **Avisos da extensão** com o motivo. "Medida
de Segurança" não é exibida. Se a lista de infrações tiver mais de uma
página, há aviso de lista parcial.

<a id="cap-9-7"></a>
### 9.7 Endereço da parte e Mandado Regionalizado

▶ [**Vídeo V35** — Endereço e Mandado Regionalizado](videos/V35-endereco-e-mandado-regionalizado.mp4)

**Para que serve:** ver o **endereço** de cada parte no próprio diálogo
**Ordenar Cumprimentos** e deixar a extensão escolher entre **Mandado Comum**
e **Mandado Regionalizado**, conforme a cidade da parte.

**Onde fica:** diálogo **Ordenar Cumprimentos**, linha **Referente a(s)
parte(s)**.

**Passo a passo:**

1. Abra **Ordenar Cumprimentos** ([7.1](#cap-7-1)).
2. **Marque uma parte**: logo abaixo dela aparece o endereço cadastrado na
   aba **Partes e Outros**, ex.: `📍 (1) R ..., 23 Bairro: ... Cidade:
   CURITIBA/PR CEP: ...`.
3. Escolha o **Tipo de Cumprimento: MANDADO**. A extensão compara a cidade
   da parte com a **comarca do seu juízo** (lida do link **Atuação** do
   cabeçalho) e:

| Situação | O que a extensão faz |
|---|---|
| Cidade de **outra comarca** que consta em **Comarca de Destino** | Muda o **Tipo do Mandado** para **Mandado Regionalizado** e marca a comarca (havendo uma só Central de Mandados, ela já fica marcada) |
| Cidade da **própria comarca** | Deixa **Mandado Comum** (se foi a extensão que tinha escolhido Regionalizado, volta para Comum) |
| Endereço **sem cidade** identificável, partes em **comarcas diferentes** ou cidade **fora da lista** (ex.: outro estado) | **Nada é alterado** |

4. Uma **nota amarela** abaixo de **Tipo do Mandado** explica o que foi feito
   (ou por que nada foi alterado). Confira e siga como sempre.

**Bom saber:**

- **A sua escolha manual sempre prevalece.** A extensão só age quando você
  marca ou desmarca partes, ou escolhe o Tipo de Cumprimento — nunca durante o
  envio em segundo plano da **Nova Ordenação** ([7.5](#cap-7-5)).
- Se a aba **Partes e Outros** não estiver aberta, a extensão a lê em segundo
  plano.
- O endereço deve estar cadastrado na aba **Partes e Outros**; sem ele, nada é
  mostrado.

---

<a id="cap-10"></a>
## 10. Privacidade e convivência com outras extensões

<a id="cap-10-1"></a>
### 10.1 O que fica guardado no seu navegador

A extensão **não tem servidor próprio**. Tudo fica no navegador/perfil onde
ela está instalada (não vai para outro computador):

| O que | Onde |
|---|---|
| Aceite dos Termos de Uso | Armazenamento da extensão |
| Preferências (inclusive de advogados e de localizadores), combos, ordem dos cards | Armazenamento da extensão |
| Cores de destaque e "sempre ocultar sem arquivo" | Armazenamento da extensão |
| Listas de tarefas e tarefas | Armazenamento da extensão |
| Destinatários (WhatsApp e e-mail) e remetentes | Armazenamento da extensão |
| Documentos a anexar | Só até serem anexados (alguns minutos) |
| Cards do cabeçalho, réus, RG/CPF | Só na aba atual, enquanto ela estiver aberta |
| Envios a certificar (certidão de envio) | Só na aba do processo, até certificar ou descartar (no máximo 4 horas) |

Para levar esses dados a outro computador, use **⬇ Exportar** / **⬆ Importar**
no Menu ([2.6](#cap-2-6)).

Documentos são sempre lidos do Projudi/SEEU na hora; não há cópia guardada.
A senha/PIN do certificado **nunca** é guardada.

<a id="cap-10-2"></a>
### 10.2 Convivência com o AzFlow

No **SEEU**, se o AzFlow estiver ativo, a pré-visualização desta extensão
fica desligada para não conflitar — o AzFlow cuida disso. O envio por
WhatsApp e e-mail continua funcionando. No Projudi, as duas convivem
normalmente.

<a id="cap-10-3"></a>
### 10.3 Bloqueio para perfis de advocacia

A extensão é de uso interno e **não carrega** quando o perfil logado é de
advogado(a) ou de assessor(a) de advogado (identificado pelo campo
**Atribuição**, pela mesa inicial e pelo menu). Assessores do Judiciário
continuam liberados. Ao trocar para um perfil que não é de advocacia, as
telas abertas a partir daí voltam a funcionar.

---

<a id="cap-11"></a>
## 11. Solução de problemas

| Problema | O que fazer |
|---|---|
| Um botão da extensão sumiu | Abra o Menu (ícone da balança) e confira se a função não foi desligada — ou se alguma função de que ela depende foi ([2.6](#cap-2-6)). **↺ Padrão** religa todas |
| Nenhum botão da extensão aparece | Confira se aceitou os Termos de Uso ([2.2](#cap-2-2)); recarregue a página (F5); confira se a extensão está ativada em `chrome://extensions`; confira se o perfil não é de advocacia ([10.3](#cap-10-3)) |
| Atualizei a extensão e nada mudou | Clique em ↻ no card da extensão em `chrome://extensions` e depois recarregue as páginas ([2.3](#cap-2-3)) |
| A barra de botões cobre algo da tela | Arraste **↕ Mover** ou clique em **Ocultar** ([2.4](#cap-2-4)) |
| O painel de ações diz para abrir a aba Movimentações | Abra a aba **Movimentações** do processo e tente de novo ([7.1](#cap-7-1)) |
| "A movimentação … marcada não leva à ação" | Marque outro evento na aba Movimentações (um despacho/decisão costuma funcionar) ou desmarque a caixinha ([7.7](#cap-7-7)) |
| "Não localizei o movimento … na aba Movimentações" | O processo não tem movimento com o nome gravado na preferência 📌: **✅ Prosseguir** segue a regra geral, **Cancelar** não executa ([7.7](#cap-7-7)) |
| "Não encontrei o botão Alterar…" no ✏️ Alterar do cabeçalho | Seu perfil não pode alterar este processo; confira na aba **Informações Gerais** se o botão **Alterar** aparece ([8.9](#cap-8-9)) |
| Preferência abre com "⚠ Não consegui preencher" | A opção gravada não existe neste processo; preencha o campo à mão, ou edite/recrie a preferência ([7.2](#cap-7-2)) |
| Preferência de Intimar Partes não marca as caixas certas | Grave-a de novo (preferências anteriores à versão 2.9.84) |
| Importei o arquivo de backup e nada mudou | Recarregue (F5) as páginas do Projudi/SEEU abertas ([2.6](#cap-2-6)) |
| A juntada parou no texto com "sem valor para {…}" | A variável não tem valor neste processo ou envio: complete o texto e clique em **Continuar** ([8.2](#cap-8-2), [5.4](#cap-5-4)) |
| O quadro da certidão de envio fica em "⏳ Aguardando o envio…" | Confira se clicou em **Enviar** no Outlook/WhatsApp. No WhatsApp, deixe a aba do WhatsApp Web aberta; no e-mail, a conferência só existe no modo Microsoft Graph. Se o envio foi feito, **📎 Certificar envio** pergunta e segue assim mesmo ([5.4](#cap-5-4)) |
| Combo parou numa etapa | Use **↻ Repetir etapa**, **⏭ Próxima etapa** ou **⏹ Parar combo** ([7.4](#cap-7-4)) |
| WhatsApp abre a conversa, mas sem anexos | Confira se o WhatsApp Web está conectado; recarregue a extensão; anexe manualmente se precisar |
| E-mail pede Client ID / dá erro de configuração | Mude o **Modo de envio** para **Automático** ou **Outlook Web** nas opções ([2.5](#cap-2-5)), ou peça o Client ID ao TI |
| No Outlook Web os anexos não entram sozinhos | É o esperado nesse modo: **Anexar arquivo → Navegar neste computador** e escolha os arquivos na pasta **Downloads** |
| O campo "De" não muda para a conta escolhida | Falta a permissão "Enviar como" nessa caixa — peça ao TI ([5.3](#cap-5-3)) |
| "Verifique a conclusão" | Confira a conclusão no Projudi antes de repetir ([6.2](#cap-6-2)) |
| Dispensa de juntadas/decursos parou com erro | Clique em **Ver detalhes**, resolva no Projudi e tente de novo ([6.1](#cap-6-1), [6.3](#cap-6-3)) |
| Card de suspensão/monitoração não aparece | Só são sinalizados status **ATIVA** e os motivos listados em [4.1](#cap-4-1)/[4.2](#cap-4-2); aguarde alguns segundos após abrir o processo |
| Mandado não virou Regionalizado | Só muda se a cidade da parte for de outra comarca **e** constar em Comarca de Destino; veja a nota amarela do diálogo ([9.7](#cap-9-7)) |
| Colar processo: "Não encontrei um número de processo" | Copie o número completo (20 dígitos), só um ([8.5](#cap-8-5)) |
| O popup de um sistema do CNJ fica em branco ou o login não termina | Use **🗂 Nova aba** ou **🖥 Segundo monitor** no topo do popup ([8.7](#cap-8-7)) |

Se o problema continuar, anote a versão da extensão, a tela e o que
aconteceu, e informe o responsável pela extensão.

---

<a id="anexo-a"></a>
## Anexo A — Vídeos instrutivos

Vídeos curtos (MP4, sem áudio, com legendas na tela), um por função. No Menu da extensão, clique no título para assistir na própria página. Eles
usam **telas simuladas** com dados fictícios; a aparência real do Projudi
pode variar um pouco. Clique no título para assistir.

<!-- tabela-videos:inicio -->
| Vídeo | Função | Seção do manual | Duração |
|---|---|---|---|
| [V01](videos/V01-instalacao-e-termos-de-uso.mp4) | [Instalação e Termos de Uso](videos/V01-instalacao-e-termos-de-uso.mp4) | [2.1](#cap-2-1) | 0:50 |
| [V02](videos/V02-barra-de-botoes-da-extensao.mp4) | [A barra de botões da extensão](videos/V02-barra-de-botoes-da-extensao.mp4) | [2.4](#cap-2-4) | 0:44 |
| [V03](videos/V03-pre-visualizacao-de-documentos.mp4) | [Pré-visualização de documentos](videos/V03-pre-visualizacao-de-documentos.mp4) | [3.1](#cap-3-1) | 0:44 |
| [V04](videos/V04-pre-visualizacao-das-pendencias.mp4) | [Pré-visualização das pendências](videos/V04-pre-visualizacao-das-pendencias.mp4) | [3.2](#cap-3-2) | 0:30 |
| [V05](videos/V05-expandir-e-ocultar-movimentacoes.mp4) | [Expandir movimentações e ocultar as sem arquivo](videos/V05-expandir-e-ocultar-movimentacoes.mp4) | [3.3](#cap-3-3) | 0:42 |
| [V06](videos/V06-destacar-movimentacoes.mp4) | [Destacar movimentações por tipo de usuário](videos/V06-destacar-movimentacoes.mp4) | [3.4](#cap-3-4) | 0:36 |
| [V07](videos/V07-envio-por-whatsapp.mp4) | [Envio por WhatsApp Web](videos/V07-envio-por-whatsapp.mp4) | [5.1](#cap-5-1) | 0:44 |
| [V08](videos/V08-envio-por-email.mp4) | [Envio por e-mail (Outlook)](videos/V08-envio-por-email.mp4) | [5.2](#cap-5-2) | 0:46 |
| [V09](videos/V09-destinatarios-e-remetentes-do-email.mp4) | [Destinatários favoritos e remetentes do e-mail](videos/V09-destinatarios-e-remetentes-do-email.mp4) | [5.3](#cap-5-3) | 0:46 |
| [V10](videos/V10-suspensao-e-monitoracao-no-cabecalho.mp4) | [Suspensão e monitoração eletrônica no cabeçalho](videos/V10-suspensao-e-monitoracao-no-cabecalho.mp4) | [4.1](#cap-4-1) | 0:37 |
| [V11](videos/V11-reus-no-cabecalho.mp4) | [Réus, indiciados e noticiados no cabeçalho](videos/V11-reus-no-cabecalho.mp4) | [4.3](#cap-4-3) | 0:27 |
| [V12](videos/V12-sequencial-do-processo-principal.mp4) | [Sequencial do processo principal (apensos)](videos/V12-sequencial-do-processo-principal.mp4) | [4.4](#cap-4-4) | 0:22 |
| [V13](videos/V13-dispensar-juntadas.mp4) | [Dispensar juntadas](videos/V13-dispensar-juntadas.mp4) | [6.1](#cap-6-1) | 0:31 |
| [V14](videos/V14-finalizar-conclusao.mp4) | [Finalizar conclusão pendente](videos/V14-finalizar-conclusao.mp4) | [6.2](#cap-6-2) | 0:27 |
| [V15](videos/V15-dispensar-decursos.mp4) | [Dispensar decursos de prazo](videos/V15-dispensar-decursos.mp4) | [6.3](#cap-6-3) | 0:31 |
| [V16](videos/V16-acoes-rapidas.mp4) | [Ações rápidas](videos/V16-acoes-rapidas.mp4) | [7.1](#cap-7-1) | 0:44 |
| [V17](videos/V17-preferencias.mp4) | [Preferências](videos/V17-preferencias.mp4) | [7.2](#cap-7-2) | 1:18 |
| [V18](videos/V18-minhas-preferencias.mp4) | [Minhas Preferências](videos/V18-minhas-preferencias.mp4) | [7.3](#cap-7-3) | 0:48 |
| [V19](videos/V19-combos-de-preferencias.mp4) | [Combos de preferências](videos/V19-combos-de-preferencias.mp4) | [7.4](#cap-7-4) | 0:58 |
| [V20](videos/V20-alvara-eletronico.mp4) | [Alvará Eletrônico](videos/V20-alvara-eletronico.mp4) | [8.1](#cap-8-1) | 0:45 |
| [V21](videos/V21-juntar-documento.mp4) | [Juntar Documento com preferências](videos/V21-juntar-documento.mp4) | [8.2](#cap-8-2) | 1:09 |
| [V22](videos/V22-des-habilitar-advogado.mp4) | [(Des)Habilitar Advogado](videos/V22-des-habilitar-advogado.mp4) | [8.3](#cap-8-3) | 1:18 |
| [V23](videos/V23-editar-partes-outros.mp4) | [Editar Partes/Outros](videos/V23-editar-partes-outros.mp4) | [8.4](#cap-8-4) | 0:22 |
| [V24](videos/V24-processo-copiado.mp4) | [Colar processo](videos/V24-processo-copiado.mp4) | [8.5](#cap-8-5) | 0:28 |
| [V25](videos/V25-oraculo.mp4) | [Oráculo](videos/V25-oraculo.mp4) | [8.6](#cap-8-6) | 0:25 |
| [V26](videos/V26-nova-ordenacao.mp4) | [Nova Ordenação](videos/V26-nova-ordenacao.mp4) | [7.5](#cap-7-5) | 0:51 |
| [V27](videos/V27-nova-remessa.mp4) | [Nova Remessa](videos/V27-nova-remessa.mp4) | [7.6](#cap-7-6) | 0:41 |
| [V28](videos/V28-sequencial-no-decurso-de-prazo.mp4) | [Filtro por Sequencial no Decurso de Prazo](videos/V28-sequencial-no-decurso-de-prazo.mp4) | [9.1](#cap-9-1) | 0:29 |
| [V29](videos/V29-listas-de-tarefas.mp4) | [Listas de tarefas](videos/V29-listas-de-tarefas.mp4) | [9.2](#cap-9-2) | 1:04 |
| [V30](videos/V30-minhas-preferencias-na-linha.mp4) | [Minhas Preferências na linha do processo (⭐)](videos/V30-minhas-preferencias-na-linha.mp4) | [9.3](#cap-9-3) | 0:42 |
| [V31](videos/V31-mesa-do-analista-sem-zerados.mp4) | [Mesa do Analista sem itens zerados](videos/V31-mesa-do-analista-sem-zerados.mp4) | [9.4](#cap-9-4) | 0:28 |
| [V32](videos/V32-rg-e-cpf-nos-cumprimentos.mp4) | [RG e CPF das partes nos cumprimentos](videos/V32-rg-e-cpf-nos-cumprimentos.mp4) | [9.5](#cap-9-5) | 0:25 |
| [V33](videos/V33-dados-processuais-nas-ordenacoes-bnmp.mp4) | [Dados processuais nas ordenações BNMP](videos/V33-dados-processuais-nas-ordenacoes-bnmp.mp4) | [9.6](#cap-9-6) | 0:39 |
| [V34](videos/V34-menu-da-extensao.mp4) | [Menu da extensão (ícone da balança)](videos/V34-menu-da-extensao.mp4) | [2.6](#cap-2-6) | 1:46 |
| [V35](videos/V35-endereco-e-mandado-regionalizado.mp4) | [Endereço da parte e Mandado Regionalizado](videos/V35-endereco-e-mandado-regionalizado.mp4) | [9.7](#cap-9-7) | 0:58 |
| [V36](videos/V36-dispensar-cumprimentos.mp4) | [Dispensar cumprimentos para expedir](videos/V36-dispensar-cumprimentos.mp4) | [6.4](#cap-6-4) | 0:29 |
| [V37](videos/V37-escolher-a-movimentacao.mp4) | [Escolher a movimentação das Ações rápidas](videos/V37-escolher-a-movimentacao.mp4) | [7.7](#cap-7-7) | 1:14 |
| [V38](videos/V38-preferencia-a-partir-de-um-movimento.mp4) | [Preferência a partir de um movimento](videos/V38-preferencia-a-partir-de-um-movimento.mp4) | [7.7](#cap-7-7) | 0:56 |
| [V39](videos/V39-sistemas-do-cnj.mp4) | [Sistemas do CNJ](videos/V39-sistemas-do-cnj.mp4) | [8.7](#cap-8-7) | 0:58 |
| [V40](videos/V40-localizador-seeu.mp4) | [Localizador (SEEU)](videos/V40-localizador-seeu.mp4) | [8.8](#cap-8-8) | 1:02 |
| [V41](videos/V41-localizador-na-linha-seeu.mp4) | [Localizador pela ⭐ da lista (SEEU)](videos/V41-localizador-na-linha-seeu.mp4) | [9.3](#cap-9-3) | 0:31 |
| [V42](videos/V42-alterar-classe-e-assuntos.mp4) | [Alterar Classe/Assuntos](videos/V42-alterar-classe-e-assuntos.mp4) | [8.9](#cap-8-9) | 0:44 |
| [V43](videos/V43-certidao-de-envio.mp4) | [Certidão de envio (e-mail e WhatsApp)](videos/V43-certidao-de-envio.mp4) | [5.4](#cap-5-4) | 1:06 |
<!-- tabela-videos:fim -->

---

<a id="anexo-b"></a>
## Anexo B — Histórico de versões do manual

A versão do manual acompanha a da extensão. A cada nova função ou correção
de erro na extensão, este manual ganha uma nova linha aqui (o procedimento
está em [COMO-ATUALIZAR.md](COMO-ATUALIZAR.md)).

| Versão | Data | Alterações no manual |
|---|---|---|
| 2.16.0 | 03/10/2026 | **📎 Juntar Documento** (8.2), com preferências e variáveis, e a **Certidão de envio** (5.4) passam a funcionar também no **SEEU**, que usa as mesmas telas de juntada do Projudi; no SEEU, o botão fica depois de **⭐ Minhas Preferências** e do **📍 Localizador**. Ajustes em 1.3, na abertura dos capítulos 5 e 8 e na tabela da 2.6. Sem vídeo novo: a função aparece igual nos dois sistemas. |
| 2.15.0 | 03/10/2026 | Nova seção **5.4 Certidão de envio (e-mail e WhatsApp)** (só no Projudi): depois de um envio, o quadro **📎 Certificar envio** junta a certidão com uma preferência do Juntar Documento, já com destinatário, documentos e o comprovante conferido nos **Itens Enviados** do Outlook (modo Microsoft Graph) ou na conversa do WhatsApp. Seção 8.2: **variáveis no texto** das preferências do Juntar Documento (`{numero_processo}`, `{hoje}`, `{reus}`, `{perguntar:…}` etc.). Nova função na tabela da 2.6 (29 no Projudi), novas linhas na Solução de problemas e vídeo V43. |
| 2.14.2 | 02/10/2026 | Corrigida a **Nova Ordenação** com **mandado urgente**: o envio parava com "Selecione o tipo de urgência do Mandado" porque o **Tipo de Urgência** guardado ficava desligado no envio; agora as opções Sim/Não da fila são marcadas como um clique de verdade, que libera os campos ligados a elas (7.5). |
| 2.14.1 | 02/10/2026 | Seção 8.9: o **✏️ Alterar** da classe e do assunto passa a ser um pequeno balão cinza, no mesmo tom dos botões da extensão (antes, um link). Vídeo V42 regravado. |
| 2.14.0 | 02/10/2026 | Nova seção **8.9 Alterar Classe/Assuntos** (só no Projudi): link **✏️ Alterar** ao lado da **Classe Processual** e do **Assunto Principal**, no cabeçalho do processo, que abre num popup a tela do botão **Alterar** da aba Informações Gerais; ao salvar, o popup fecha e a tela do processo é recarregada. Nova função na tabela da 2.6 (28 funções no Projudi) e vídeo V42. |
| 2.13.2 | 02/10/2026 | Sem alteração de texto; corrigido: no SEEU a balança do Menu (e, com ela, o ícone do BNMP 3.0) não aparecia, porque o cabeçalho novo do SEEU esconde o nome do usuário e os itens do menu. Ela volta a ficar na faixa azul-clara, abaixo do nome do usuário (2.6). |
| 2.13.1 | 02/10/2026 | Regra gravada (1.4, item 5; 7.2; 9.3): as perguntas sobre dispensar juntadas/decursos e finalizar a conclusão antes de uma preferência existem **só no Projudi**, que trava as ações com pendências; no **SEEU**, que não trava, a preferência é executada direto, sem pergunta. |
| 2.13.0 | 02/10/2026 | Seção 9.3: **⭐** nas listas **Análise de Juntadas** e **Retorno de Conclusão** do SEEU, com as preferências do **📍 Localizador** executadas em segundo plano e o resultado na linha (ainda sem as perguntas de dispensar juntadas/finalizar conclusão). Ajustes em 1.3 e na abertura do capítulo 9; vídeo V41. |
| 2.12.2 | 02/10/2026 | O botão **📍 Localizador** passa para a barra de botões, ao lado de **⭐ Minhas Preferências**, e as preferências de localizadores aparecem como cards em **⭐ Minhas Preferências** (2.4, 7.3 e 8.8). Vídeo V40 regravado. |
| 2.12.1 | 02/10/2026 | A extensão passa a funcionar também no **SEEU de treino** (ambiente de testes), como no SEEU (1.3 e 8.8). |
| 2.12.0 | 02/10/2026 | Nova seção 8.8: botão **📍 Localizador**, *só no SEEU*, com preferências de localizadores associadas ao processo com um clique (lista nativa do **+**). Convenção *Só no SEEU* (1.2), tabelas 1.3 e 2.6 e vídeo V40. |
| 2.11.2 | 02/10/2026 | No SEEU, com um processo aberto, aparece o ícone do **BNMP 3.0** ao lado da balança, que abre o BNMP no popup (com **🗂 Nova aba** e **🖥 Segundo monitor**), como no Projudi (8.7 e 1.3). Os demais sistemas do CNJ continuam só no Projudi. O Menu não muda. |
| 2.11.1 | 02/10/2026 | Os ícones dos sistemas do CNJ (8.7) passam a aparecer **só com um processo aberto**; antes apareciam também na Mesa e nas demais telas. |
| 2.11.0 | 02/10/2026 | Nova seção **8.7 Sistemas do CNJ**: ícones pastel ao lado da balança do Menu (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper e Infojud, da Receita Federal), com desenhos inspirados nos logotipos e ordem que o usuário escolhe arrastando (guardada como preferência e incluída no Exportar/Importar), que abrem cada sistema num popup sobre o processo, com os botões **🗂 Nova aba** e **🖥 Segundo monitor** para abri-lo fora do popup. A barra de botões não muda. Menção em 2.4, nova função na tabela da 2.6 (27 funções), linha nova em Solução de problemas e vídeo V39. |
| 2.10.6 | 02/10/2026 | O botão **Outras** das Ações rápidas ganhou **Anotações Criminais** e **Solicitar Antecedentes Criminais** (quadro **Comunicar ao IIPR** da coluna de Ações), com **Abrir**/**Ir e abrir**, **+ Nova preferência**, ⭐ Minhas Preferências e 🔗 Combos, como as demais ações (7.1). |
| 2.10.5 | 02/10/2026 | A pergunta "Não localizei o movimento…" (7.7) passa a usar a mesma caixa da pergunta sobre juntadas pendentes, com os botões **✅ Prosseguir** e **Cancelar** (antes, OK/Cancel do navegador). Vídeo V38 regravado. |
| 2.10.4 | 02/10/2026 | Seção 7.7: **preferência que sempre parte de um movimento** — gravada com a caixinha de um movimento marcada, guarda o nome dele (📌) e, ao ser usada, parte do movimento mais recente com esse nome; se não houver, pergunta se segue pela regra geral. Linha nova em Solução de problemas e vídeo V38. |
| 2.10.3 | 02/10/2026 | A caixinha da seção 7.7 passa para a **primeira coluna** da aba Movimentações, à esquerda do número (Seq.), em **todas** as movimentações (haja ou não arquivos); marcada uma, as demais ficam esmaecidas e bloqueadas até ela ser desmarcada. As caixinhas dos arquivos (WhatsApp e e-mail) não mudam. Vídeo V37 regravado. |
| 2.10.2 | 02/10/2026 | Nova seção **7.7 Escolher a movimentação das Ações rápidas**: caixinha ao lado de cada evento da aba Movimentações para as ações rápidas, preferências e combos partirem do evento marcado (como em "Movimentar a Partir Desta Movimentação"); sem marcação, tudo continua como antes. Nova função na tabela da 2.6 (26 funções), linha nova em Solução de problemas e vídeo V37. |
| 2.10.1 | 02/10/2026 | Corrigida a **Nova Ordenação** com **Mandado Regionalizado**: o envio parava com "Necessário informar a Central de Mandados de Destino" porque a central era escolhida antes de o Projudi carregar a lista da Comarca de Destino; agora a extensão espera a lista e tenta de novo abrir o diálogo se a primeira tentativa falhar (7.5). |
| 2.10.0 | 01/10/2026 | **Preferências de advogados** no botão **⚖️ Advogados**: o botão passa a abrir um painel com **Abrir**, **+ Nova preferência** e as preferências salvas; a preferência guarda a lista de advogados (e a Atuação) e, ao ser usada, inclui sozinha cada advogado na seção Advogados — você só marca as partes e clica em Salvar (8.3, 9.3, tabela da 2.4). As preferências de advogados também aparecem em ⭐ Minhas Preferências e nos 🔗 Combos. Vídeo V22 regravado. |
| 2.9.99 | 01/10/2026 | Na tela do processo, ao executar uma preferência ou um combo (chip ★ da ação, ⭐ Minhas Preferências ou 🔗 Combos), a extensão pergunta antes se deve **dispensar as juntadas pendentes** e/ou **finalizar a conclusão pendente** do quadro Pendências — uma pergunta para cada, como no ⭐ das listagens (7.2, 7.3, 7.4). Vídeos V17, V18 e V19 regravados com a pergunta. |
| 2.9.98 | 30/09/2026 | Correção no ⭐ do Retorno de Conclusão (9.3): o **Sim** passa a finalizar a conclusão pela linha "Retorno de Conclusão" do quadro Pendências do processo (antes procurava o botão na tela "Dados da Conclusão", onde ele não fica) e, quando não conseguir, avisa na linha quais botões encontrou. |
| 2.9.97 | 30/09/2026 | Botão **Dispensar pendências** por tipo em Cumprimentos para Expedir, com acompanhamento das remoções e interrupção em caso de erro (6.4). Catálogo do Menu atualizado e vídeo V36 incluído. |
| 2.9.95 | 30/09/2026 | Botões com nomes mais curtos: **📋 Colar processo** (antes "Processo copiado", seção 8.5 renomeada), **⚖️ Advogados**, **👥 Partes**, **🖍️ Destacar mov.**, **Expandir Mov ▼ / Recolher Mov ▲** e **Apenas com arquivo (+) / Mostrar todos** (2.4, 3.3, 3.4, 8.3–8.5). Pré-visualização pelo nome do documento na tela Análise de Juntadas (3.1). A barra de botões se alinha ao quadro "Anotações nos autos" quando não há quadro Pendências e fica oculta em mais telas e nos popups do Alvará Eletrônico, de Partes e da ficha do réu (2.4). Vídeos regravados com os nomes novos. |
| 2.9.94 | 29/09/2026 | Menu da extensão (seção 2.6): nova **chave geral "Extensão ativada/desativada"** no topo do Menu, uma por sistema (PROJUDI e SEEU), que pausa todas as funções sem apagar as escolhas. O vídeo V34 foi regravado e agora mostra a chave geral e as abas. |
| 2.9.93 | 29/09/2026 | Menu da extensão (seção 2.6): duas abas, **PROJUDI** e **SEEU**, para ligar e desligar as funções de cada sistema separadamente (tudo ativo por padrão nos dois), com **Copiar para o outro sistema**; a extensão reconhece o sistema pelo endereço da página. O vídeo V34 ainda mostra o Menu sem as abas e será regravado. |
| 2.9.92 | 29/09/2026 | O manual passa a ser aberto pelo botão **📖 Manual do Usuário** do Menu, com índice, busca e vídeos na própria página. Novos: seção 2.6 (Menu da extensão: funcionalidades liga/desliga, exportar/importar/padrão) e 9.7 (Endereço da parte e Mandado Regionalizado, versões 2.9.89–2.9.91). Vídeos V34 e V35; todos os demais foram regravados com o ícone do Menu na tela. |
| 2.9.88 | 29/09/2026 | Primeira edição do manual: todas as funções da extensão até a versão 2.9.88, com 33 vídeos instrutivos (Anexo A). |
