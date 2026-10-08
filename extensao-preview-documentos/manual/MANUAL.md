Warning: truncated output (original token count: 31936)
Total output lines: 2210

# Manual do Usuário — Extensão Projudi/SEEU

**Documentos, Ações Rápidas, WhatsApp e E-mail**

| Item | Informação |
|---|---|
| **Versão do manual** | 2.26.4 |
| **Versão da extensão** | 2.26.4 |
| **Data desta versão** | 08/10/2026 |
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
   - 8.7 [Sistemas do CNJ e outros (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud, Sistema Uniformizado, COPEL, FUPEN, SANEPAR, SESP)](#cap-8-7)
   - 8.8 [Localizador (só no SEEU)](#cap-8-8)
   - 8.9 [Alterar Classe/Assuntos](#cap-8-9)
   - 8.10 [Novo Valor da Causa](#cap-8-10)
9. [Telas de análise, mesas e cumprimentos](#cap-9)
   - 9.1 [Filtro por Sequencial na Análise de Decurso de Prazo](#cap-9-1)
   - 9.2 [Listas de tarefas](#cap-9-2)
   - 9.3 [Minhas Preferências na linha do processo (⭐)](#cap-9-3)
   - 9.4 [Mesa do Analista sem itens zerados](#cap-9-4)
   - 9.5 [RG e CPF das partes nos cumprimentos](#cap-9-5)
   - 9.6 [Dados processuais nas ordenações BNMP](#cap-9-6)
   - 9.7 [Endereço da parte e Mandado Regionalizado](#cap-9-7)
   - 9.8 [Processo ao passar o mouse nas listas de Decurso de Prazo](#cap-9-8)
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
| **SEEU** | Menu da extensão ([2.6](#cap-2-6)), pré-visualização de documentos ([3.1](#cap-3-1)), envio por WhatsApp ([5.1](#cap-5-1)) e por e-mail ([5.2](#cap-5-2)), os cards do BNMP, da SESP Intranet e do S.U. (Sistema Uniformizado) ao lado da balança ([8.7](#cap-8-7)) e o botão **📍 Localizador** ([8.8](#cap-8-8)), que só existe no SEEU — também pela **⭐** das listas de juntadas e de conclusões ([9.3](#cap-9-3)). Vale também para o **SEEU de treino** (ambiente de testes) |

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

▶ [**Vídeo V48** — Aviso de versão nova e atualização](videos/V48-aviso-de-versao-nova.mp4)

**Para que serve:** saber quando há novidades na extensão e instalar a
versão nova sem perder as suas preferências.

**Como você fica sabendo:** a extensão confere sozinha, algumas vezes por
dia, se saiu uma versão nova. Quando sai, aparece no Projudi/SEEU, logo
abaixo do **ícone da balança**, o aviso **🆕 Há novidades na extensão!**,
com a versão nova e a sua. O ícone da balança também ganha um **ponto
azul**, e o Menu ([2.6](#cap-2-6)) mostra a faixa **"Versão nova
disponível"**, com o botão **Como atualizar**, que reabre o aviso.

**Passo a passo (pelo aviso):**

1. Leia a **Observação**: *antes de atualizar, exporte suas preferências*.
2. Clique em **1. Exportar preferências**. Um arquivo com todas as suas
   preferências, combos e listas vai para a pasta **Downloads** — guarde-o
   até terminar. (Se você pular este passo e clicar direto em **2.
   Atualizar**, o aviso pergunta se quer exportar antes.)
3. Clique em **2. Atualizar**. A versão nova é baixada para a pasta
   **Downloads** (arquivo **PROJUDI_FUNCIONALIDADES-principal.zip**) e o
   aviso mostra o que fazer em seguida.
4. Abra o arquivo baixado e copie a pasta **extensao-preview-documentos**
   que está dentro dele.
5. Cole-a **por cima** da pasta da extensão que você já tem (**no mesmo
   lugar** de antes), substituindo os arquivos.
6. Clique em **↻ Recarregar a extensão**, no próprio aviso (ou, em
   `chrome://extensions`, no ícone de recarregar ↻ do card da extensão — o
   botão **Abrir tela de extensões** leva até lá).
7. Recarregue (**F5**) as abas do Projudi, SEEU, WhatsApp Web e Outlook que
   estavam abertas — só recarregar a página, sem o passo 6, não basta.

**As minhas preferências continuam depois da atualização?** **Sim**, desde
que você cole os arquivos novos **por cima da pasta de antes** e recarregue
a extensão (passos 5 e 6): o navegador guarda as preferências junto da
extensão instalada, e não dentro da pasta. Elas **se perdem** se você
**remover** a extensão em `chrome://extensions`, ou se instalar a versão
nova a partir de **outra pasta** (o navegador a trata como outra extensão).
Por isso exporte sempre antes: se algo faltar, abra o Menu e use **⬆
Importar** com o arquivo exportado ([2.6](#cap-2-6)).

**Bom saber:**

- **Agora não (lembrar amanhã)** (ou o **✕**) esconde o aviso por um dia;
  depois ele volta, até você atualizar.
- **Ver o que mudou** abre o histórico do manual ([Anexo B](#anexo-b)) na
  página da extensão no GitHub.
- A versão instalada aparece no card da extensão, em `chrome://extensions`,
  e no topo do Menu. Compare com a versão na capa deste manual.
- Também é possível atualizar sem o aviso: substitua o conteúdo da pasta
  pelos arquivos novos e siga os passos 6 e 7.

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
  Os **cards coloridos com o nome** de cada sistema, logo à esquerda dela, abrem os **sistemas do CNJ**
  (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud e Renajud, e o Sistema Uniformizado do TJPR), e o card **Outros** guarda
  COPEL, FUPEN, SANEPAR e SESP Intranet — veja [8.7](#cap-8-7).
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
| **Client ID** / **Tenant ID do Tribunal** | Dados fornecidos pelo setor de TI para o modo Microsoft Graph. Não preencha se o TI não informou. Se preencher o Client ID, o **Tenant ID do Tribunal** passa a ser obrigatório (um código como `00000000-0000-0000-0000-000000000000`): ele garante que só contas do Tribunal consigam entrar |
| **Sair do Outlook nesta extensão** | Apaga o login do Outlook guardado pela extensão. Útil em computador compartilhado; no próximo envio a Microsoft pede login de novo |
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
desativadas; um **ponto azul** avisa que há uma versão nova da extensão
(veja [2.3](#cap-2-3)). O ícone fica só na tela principal: **não aparece dentro dos
popups** (Advogados, Partes, ações rápidas, janelas do Projudi).

**Como abrir e fechar:** clique no ícone. Para fechar, use o **✕**, a tecla
**Esc** ou clique fora do Menu.

**O que há no Menu:**

**Versão nova disponível** — quando há uma versão nova, uma faixa azul logo
abaixo do título do Menu mostra o número dela; o botão **Como atualizar**
abre o aviso com o passo a passo ([2.3](#cap-2-3)). Esse aviso faz parte do
Menu e não tem chave para desligar.

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
da lista aparece "Funcionalidades no PROJUDI: N de 30 ativas" (ou no SEEU).

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
| **Ações rápidas e atalhos** | Ações rápidas e Minhas Preferências · Escolher a movimentação das Ações rápidas · (Des)Habilitar Advogado · Editar Partes/Outros · Alterar Classe/Assuntos (Projudi) · Novo Valor da Causa (Projudi) · Alvará Eletrônico · Juntar Documento · Localizador (SEEU) · Oráculo · Sistemas do CNJ · Nova Remessa · Nova Ordenação | [7](#cap-7), [8](#cap-8) |
| **Informações do processo** | Réus no cabeçalho · Sequencial do processo principal · Indicador de suspensão ativa · Indicador de monitoração eletrônica | [4](#cap-4) |
| **Pendências, mesa e listas** | Dispensar juntadas, decursos e cumprimentos · Finalizar conclusão pendente · Ocultar contadores zerados · Filtro por Sequencial no Decurso de Prazo · Processo ao passar o mouse no Decurso de Prazo (Projudi) · Listas de tarefas · Minhas Preferências na linha (⭐) | [6](#cap-6), [9](#cap-9) |
| **Cumprimentos** | RG e CPF nos cumprimentos · Informações nas ordenações BNMP · Endereço da parte e Mandado Regionalizado | [9.5](#cap-9-5), [9.6](#cap-9-6), [9.7](#cap-9-7) |

Botões como **📋 Colar processo**, **🔗 Combos** e **🖍️ Destacar
mov.** fazem parte das funções acima (as duas primeiras, das
**Ações rápidas**; a última, do **Destaque de movimentações**).

**2. Preferências e combos** — cópia de segurança para levar tudo a outro
computador:

- **⬇ Exportar**: baixa um arquivo `.json` com as suas preferências, combos,
  listas de tarefas, contatos do WhatsApp, destinatários e remetentes de
  e-mail, destaques de movimentações, a ordem dos cards dos sistemas (e o que fica no **Outros**)
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
**Magistrado(a)**, **Ministério Público**, **Advogado(a)**,
**Procurador(a)** (por exemplo, "Procurador do Município de ..."),
**Defensor(a)** (Defensoria Pública) e/ou **Audiência**, em **todos os
processos**.

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
- **Procurador / Procuradora** destaca as movimentações em que a coluna
  **Movimentado Por** mostra o papel **Procurador** (procuradores de
  município, estado e outros entes públicos).
- **Defensor / Defensora** destaca as movimentações feitas pela
  Defensoria Pública.
- **Audiência** é diferente dos demais: destaca as movimentações **de
  audiência** (por exemplo, "Audiência de custódia designada"), seja quem
  for que as lançou. Se a mesma linha também for de um tipo marcado (por
  exemplo, um Magistrado), vale a cor da **Audiência**.
- Os tipos são os mesmos do quadro **Realces** do Projudi.
- É independente do quadro nativo **Realces** do Projudi (que tem cores
  fixas e não lembra a escolha entre processos).

---

<a id="cap-4"></a>
## 4. Informações extras na tela do processo

Estas funções não têm botão: aparecem sozinhas ao abrir o processo. *Só no
Projudi.*

<a id="cap-4-1"></a>
### 4.1 Suspensão ativa no cabeçalho

▶ [**Vídeo V10** — Suspensão e mon…16936 tokens truncated…mail continua funcionando. No Projudi, as duas convivem
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
| Os cards dos sistemas (SerpJud, BNMP…) não aparecem ao lado da balança | Eles só aparecem com um **processo aberto**; na Mesa e nas listas fica só a balança. Com o processo aberto, aguarde 1 segundo; se continuar sem eles, confira no Menu se **Sistemas do CNJ** está ligada ([8.7](#cap-8-7)) |
| Nenhum botão da extensão aparece | Confira se aceitou os Termos de Uso ([2.2](#cap-2-2)); recarregue a página (F5); confira se a extensão está ativada em `chrome://extensions`; confira se o perfil não é de advocacia ([10.3](#cap-10-3)) |
| Atualizei a extensão e nada mudou | Clique em ↻ no card da extensão em `chrome://extensions` e depois recarregue as páginas ([2.3](#cap-2-3)) |
| A barra de botões cobre algo da tela | Arraste **↕ Mover** ou clique em **Ocultar** ([2.4](#cap-2-4)) |
| O painel de ações diz para abrir a aba Movimentações | Abra a aba **Movimentações** do processo e tente de novo ([7.1](#cap-7-1)) |
| "A movimentação … marcada não leva à ação" | Marque outro evento na aba Movimentações (um despacho/decisão costuma funcionar) ou desmarque a caixinha ([7.7](#cap-7-7)) |
| "Não localizei o movimento … na aba Movimentações" | O processo não tem movimento com o nome gravado na preferência 📌: **✅ Prosseguir** segue a regra geral, **Cancelar** não executa ([7.7](#cap-7-7)) |
| "Não encontrei o botão Alterar…" no ✏️ Alterar do cabeçalho ou no 💲 Novo Valor da Causa | Seu perfil não pode alterar este processo; confira na aba **Informações Gerais** se o botão **Alterar** aparece ([8.9](#cap-8-9), [8.10](#cap-8-10)) |
| Preferência abre com "⚠ Não consegui preencher" | A opção gravada não existe neste processo; preencha o campo à mão, ou edite/recrie a preferência ([7.2](#cap-7-2)) |
| Preferência de Intimar Partes não marca as caixas certas | Grave-a de novo (preferências anteriores à versão 2.9.84) |
| Importei o arquivo de backup e nada mudou | Recarregue (F5) as páginas do Projudi/SEEU abertas ([2.6](#cap-2-6)) |
| Combo parou numa etapa | Use **↻ Repetir etapa**, **⏭ Próxima etapa** ou **⏹ Parar combo** ([7.4](#cap-7-4)) |
| WhatsApp abre a conversa, mas sem anexos | Confira se o WhatsApp Web está conectado; recarregue a extensão; anexe manualmente se precisar |
| E-mail pede Client ID / dá erro de configuração | Mude o **Modo de envio** para **Automático** ou **Outlook Web** nas opções ([2.5](#cap-2-5)), ou peça o Client ID ao TI |
| E-mail pede o Tenant ID do Tribunal | Peça ao TI o Tenant ID e informe-o nas opções ([2.5](#cap-2-5)), ou mude o **Modo de envio** para **Outlook Web** |
| WhatsApp: "O envio expirou" | Passaram-se mais de 15 minutos desde o clique em enviar: marque os documentos e envie de novo ([5.1](#cap-5-1)) |
| No Outlook Web os anexos não entram sozinhos | É o esperado nesse modo: **Anexar arquivo → Navegar neste computador** e escolha os arquivos na pasta **Downloads** |
| O campo "De" não muda para a conta escolhida | Falta a permissão "Enviar como" nessa caixa — peça ao TI ([5.3](#cap-5-3)) |
| "Verifique a conclusão" | Confira a conclusão no Projudi antes de repetir ([6.2](#cap-6-2)) |
| Dispensa de juntadas/decursos parou com erro | Clique em **Ver detalhes**, resolva no Projudi e tente de novo ([6.1](#cap-6-1), [6.3](#cap-6-3)) |
| Card de suspensão/monitoração não aparece | Só são sinalizados status **ATIVA** e os motivos listados em [4.1](#cap-4-1)/[4.2](#cap-4-2); aguarde alguns segundos após abrir o processo |
| Mandado não virou Regionalizado | Só muda se a cidade da parte for de outra comarca **e** constar em Comarca de Destino; veja a nota amarela do diálogo ([9.7](#cap-9-7)) |
| Colar processo: "Não encontrei um número de processo" | Copie o número completo (20 dígitos), só um ([8.5](#cap-8-5)) |
| O popup de um sistema do CNJ fica em branco ou o login não termina | Use o botão **🖥 Segundo monitor** (ou **🗂 Nova aba**, com um monitor só) no topo do popup ([8.7](#cap-8-7)) |

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
| [V06](videos/V06-destacar-movimentacoes.mp4) | [Destacar movimentações por tipo de usuário](videos/V06-destacar-movimentacoes.mp4) | [3.4](#cap-3-4) | 0:38 |
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
| [V18](videos/V18-minhas-preferencias.mp4) | [Minhas Preferências](videos/V18-minhas-preferencias.mp4) | [7.3](#cap-7-3) | 0:55 |
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
| [V39](videos/V39-sistemas-do-cnj.mp4) | [Sistemas do CNJ](videos/V39-sistemas-do-cnj.mp4) | [8.7](#cap-8-7) | 1:14 |
| [V40](videos/V40-localizador-seeu.mp4) | [Localizador (SEEU)](videos/V40-localizador-seeu.mp4) | [8.8](#cap-8-8) | 1:02 |
| [V41](videos/V41-localizador-na-linha-seeu.mp4) | [Localizador pela ⭐ da lista (SEEU)](videos/V41-localizador-na-linha-seeu.mp4) | [9.3](#cap-9-3) | 0:31 |
| [V42](videos/V42-alterar-classe-e-assuntos.mp4) | [Alterar Classe/Assuntos](videos/V42-alterar-classe-e-assuntos.mp4) | [8.9](#cap-8-9) | 0:44 |
| [V43](videos/V43-preferencia-de-alteracao-de-classe.mp4) | [Preferência de alteração de classe](videos/V43-preferencia-de-alteracao-de-classe.mp4) | [8.9](#cap-8-9) | 0:43 |
| [V44](videos/V44-processo-ao-passar-o-mouse.mp4) | [Processo ao passar o mouse no Decurso de Prazo](videos/V44-processo-ao-passar-o-mouse.mp4) | [9.8](#cap-9-8) | 0:48 |
| [V45](videos/V45-preferencias-em-lote.mp4) | [Preferências em lote (⭐ Em lote)](videos/V45-preferencias-em-lote.mp4) | [9.3](#cap-9-3) | 1:01 |
| [V46](videos/V46-remessa-turma-recursal.mp4) | [Remessa para a Turma Recursal](videos/V46-remessa-turma-recursal.mp4) | [7.1](#cap-7-1) | 0:47 |
| [V47](videos/V47-novo-valor-da-causa.mp4) | [Novo Valor da Causa](videos/V47-novo-valor-da-causa.mp4) | [8.10](#cap-8-10) | 0:36 |
| [V48](videos/V48-aviso-de-versao-nova.mp4) | [Aviso de versão nova e atualização](videos/V48-aviso-de-versao-nova.mp4) | [2.3](#cap-2-3) | 0:41 |
<!-- tabela-videos:fim -->

---

<a id="anexo-b"></a>
## Anexo B — Histórico de versões do manual

A versão do manual acompanha a da extensão. A cada nova função ou correção
de erro na extensão, este manual ganha uma nova linha aqui (o procedimento
está em [COMO-ATUALIZAR.md](COMO-ATUALIZAR.md)).

| Versão | Data | Alterações no manual |
|---|---|---|
| 2.26.4 | 08/10/2026 | Sem alteração de texto; associadas as linhas **Analisar** e da data pelo código do mandado na listagem. |
| 2.26.3 | 08/10/2026 | Sem alteração de texto; a dispensa de mandados agora abre a ficha diretamente pela data da linha na listagem. |
| 2.26.2 | 08/10/2026 | Sem alteração de texto; corrigido o reconhecimento do link **Analisar** na listagem de mandados. |
| 2.26.1 | 08/10/2026 | Seção 6.4: **Dispensar pendências** também funciona para mandados para expedir. |
| 2.26.0 | 07/10/2026 | Seção 7.3: o painel **⭐ Minhas Preferências** passa a mostrar as preferências em **blocos, um por ação** (ícone do botão, nome da ação e quantidade), com o bloco **🔗 Combos** no fim, e cada preferência vira um **card retangular de uma linha** com ✏️ (editar) e 🗑 (remover) sempre à vista; **✏️ Editar posição** passa a arrastar os cards dentro do bloco e os blocos entre si. Seção 9.3: a **⭐** da linha e o **⭐ Em lote** usam os mesmos blocos (combos que abrem nova aba ganham o sinal ↗). Todas as preferências e combos, em qualquer painel (Ordenações, Concluso, Partes, Juntar Documento, Combos, Alterar Classe/Assunto, Localizador, Listas de tarefas etc.), deixam de ser ovais e passam a ser retangulares com cantos levemente arredondados. Vídeos V16 a V22, V26, V27, V30, V35, V37, V38, V40, V41, V43, V45 e V46 regravados. |
| 2.25.0 | 06/10/2026 | Nova seção 2.3 (**Atualização da extensão**) reescrita: aviso **🆕 Há novidades na extensão!** abaixo do ícone da balança quando sai versão nova, com a observação para exportar as preferências antes, os botões **1. Exportar preferências** e **2. Atualizar** e o passo a passo para recarregar a extensão; explica que as preferências continuam quando os arquivos novos são colados por cima da mesma pasta. Seção 2.6: ponto azul no ícone e faixa "Versão nova disponível" no Menu. Novo vídeo V48. |
| 2.24.0 | 06/10/2026 | Nova seção **8.10 Novo Valor da Causa** (só no Projudi): linha **Valor da Causa** no cabeçalho do processo (em qualquer aba), com o balão **💲 Novo Valor da Causa** ao lado do valor; você digita o novo valor e a extensão o grava na tela de alteração do processo e clica em **Salvar** sozinha, sem abrir a tela — o Projudi registra a alteração nas Movimentações. Nova função na tabela da 2.6 (30 funções no Projudi), Solução de problemas (11) e vídeo V47. |
| 2.23.4 | 06/10/2026 | Destacar movimentações (3.4): novos tipos **Procurador / Procuradora** (ex.: "Procurador do Município de ..."), **Defensor / Defensora** e **Audiência** (esta destaca as movimentações de audiência, seja quem for que as lançou), os mesmos do quadro **Realces** do Projudi. Vídeo V06 regravado. |
| 2.23.3 | 05/10/2026 | Sistemas do CNJ e card **Outros** (8.7): o popup passa a ter **um só botão** para abrir o sistema fora dele, que usa o **segundo monitor** sempre que houver um conectado (**🖥 Segundo monitor**) e, se não houver, abre numa **nova aba** (**🗂 Nova aba**). Antes eram dois botões, e o do segundo monitor só avisava quando não havia outro monitor. Solução de problemas (11) ajustada e vídeo V39 regravado. |
| 2.23.2 | 05/10/2026 | **⭐ Em lote** (9.3), no Projudi e no SEEU: antes de começar, a confirmação mostra a lista dos processos (até 25 números), a preferência/combo e o que será feito automaticamente antes (dispensar juntadas, finalizar conclusão ou dispensar decursos); o lote **para no primeiro erro**, deixando os seguintes intactos e marcados, e avisa em qual processo foi. Vídeo V45 regravado. |
| 2.23.1 | 05/10/2026 | Correções de segurança. Opções (2.5): **Tenant ID do Tribunal** obrigatório para o modo Microsoft Graph e novo botão **Sair do Outlook nesta extensão**. E-mail (5.2): o login do Outlook vale só enquanto o navegador estiver aberto. Privacidade (10.1): documentos de um envio interrompido são apagados em até 15 minutos ou ao fechar o navegador. Solução de problemas (11): Tenant ID e envio expirado do WhatsApp. Os sistemas do CNJ (8.7) só podem ser abertos dentro do Projudi/SEEU, não em outras páginas (sem mudança na tela). Sem vídeo novo. |
| 2.23.0 | 04/10/2026 | Seção 8.7: novo card **Outros ▾** (só no Projudi), com **COPEL**, **FUPEN**, **SANEPAR** e **SESP Intranet**; arrastar um card do painel para cima de um card da fila troca os dois, e arrastar um card da fila para o **Outros** o guarda lá. Os cards passam a ter **ordem alfabética** como padrão (quem já tinha mudado a ordem mantém a sua). No SEEU, novo card **SESP** ao lado do BNMP (1.3 e 8). A arrumação vai no Exportar/Importar (2.6). Vídeo V39 regravado. |
| 2.22.0 | 04/10/2026 | O grupo **Remessa** das ações rápidas (7.1) ganha a **Remessa Eletrônica para a Turma Recursal** (Juizados Especiais), com **+ Nova preferência**: como a tela do Projudi não tem campos, a preferência só abre a tela e confirma. Vídeo V46. |
| 2.21.0 | 03/10/2026 | **⭐ Em lote** (9.3): caixinha de marcar abaixo do **+** de cada linha e barra **⭐ Em lote** acima da tabela, em todas as telas com a ⭐ (Juntadas, Retorno de Conclusão, Decurso de Prazo, cumprimentos e, no SEEU, Juntadas e Conclusão). No Projudi, a pergunta sobre dispensar/finalizar é feita uma vez para todos e cada processo continua pedindo o seu ✅ Sim, executar; no SEEU, os localizadores são associados em todos os marcados. Descrição da função no Menu atualizada e vídeo V45. |
| 2.20.0 | 03/10/2026 | Listas de tarefas (9.2) e **⭐** na linha do processo (9.3) também nas telas de cumprimentos: **Expedir Intimações**, **Expedir Citação**, **Expedir Notificação**, **Expedir Intimações de Auxiliares da Justiça** e **Demais Cumprimentos** (para qualquer Tipo de Cumprimento). Nessas telas o ⭐ verifica o quadro Pendências do processo e só pergunta se deve dispensar as juntadas e/ou finalizar a conclusão quando elas existirem; sem pendências, abre a preferência direto. Catálogo do Menu atualizado (2.6). |
| 2.19.0 | 03/10/2026 | Nova seção **9.8** (só no Projudi): nas listas de **Decurso de Prazo** (Intimação, Auxiliares da Justiça e Citações/Notificações), pousar o mouse sobre o **número do processo** abre a tela dele num painel, já na aba **Movimentações**, com **📌 Fixar**, **Abrir em nova aba** e **✕**. Nova função na tabela da 2.6 (29 funções no Projudi) e vídeo V44. |
| 2.18.2 | 03/10/2026 | A **balança** do Menu (2.6) também deixa de aparecer **dentro dos popups** (Advogados, Partes, ações rápidas, janelas do Projudi): fica só na tela principal. |
| 2.18.1 | 03/10/2026 | Corrigido: os cards dos sistemas (8.7) apareciam também **dentro dos popups** (ex.: Advogados), que carregam uma tela com o mesmo cabeçalho; agora aparecem só na tela principal do processo. |
| 2.18.0 | 03/10/2026 | Novo card **Renajud** (orquídea), só no Projudi (8.7). Corrigido: os cards dos sistemas **não apareciam** no Projudi, porque a tela do processo fica num endereço (projudi2) diferente da página principal e a extensão parava de procurar o processo ao encontrar a página principal; agora ela confere todos os quadros. Vídeo V39 regravado. |
| 2.17.0 | 03/10/2026 | Seção 8.9: **⭐ Preferências de alteração** ao lado de cada **✏️ Alterar** — grava a classe e o motivo (ou o assunto principal) clicando em Salvar sem alterar o processo, e depois faz a alteração e salva com um clique, sem confirmação. Vídeo V43. |
| 2.16.0 | 03/10/2026 | Os ícones com desenho dos sistemas (8.7) viram **cards com o nome oficial escrito** (SerpJud, CNIEP, BNMP, PrevJud, Sisbajud, SNGB, Sniper, Infojud e S.U.), na mesma altura da balança e nas mesmas cores; a ordem escolhida continua valendo. Textos de 1.3, 2.4 e 8 ajustados e vídeo V39 regravado. |
| 2.15.0 | 03/10/2026 | Novo ícone **Sistema Uniformizado** (TJPR — fundos, custas e guias; cinza-azulado, guia com código de barras) ao lado da balança, **no Projudi e no SEEU**, com o mesmo popup, **🗂 Nova aba** e **🖥 Segundo monitor** dos sistemas do CNJ (8.7, 8 e 1.3). Vídeo V39 regravado. |
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
