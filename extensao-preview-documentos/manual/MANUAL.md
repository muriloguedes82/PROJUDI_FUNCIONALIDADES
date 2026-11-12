# Manual do Usuário — Assistente Projudi – Ações Rápidas e Pré-visualização

**Documentos, Ações Rápidas, WhatsApp e E-mail**

| Item | Informação |
|---|---|
| **Versão do manual** | 24 |
| **Versão da extensão** | 24 |
| **Data desta versão** | 12/11/2026 |
| **Público** | Servidores(as) e magistrados(as) que já sabem abrir um processo no Projudi e navegar pelas abas dele e do sistema |

> **Como abrir este manual.** No Projudi, clique no ícone da balança
> (canto superior direito, abaixo de **Sair**) e depois em **📖 Manual do
> Usuário**. Ele abre numa nova aba, com índice e busca. Veja
> [2.6](#cap-2-6).
>
> **Como ler este manual.** Cada função tem a mesma estrutura: *Para que
> serve*, *Onde fica*, *Passo a passo* e *Bom saber*.
>
> O número da versão do manual é **igual** ao da extensão. Desde a
> versão 3, cada versão nova tem um número inteiro (3, 4, 5…); as
> anteriores usavam números como 2.61.0. Se a sua
> extensão estiver numa versão diferente (veja em `chrome://extensions`),
> algumas telas podem não bater com o que está descrito aqui — veja o
> [Anexo A](#anexo-a) para saber o que mudou.

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
   - 6.5 [Dispensar e analisar decurso de cumprimentos](#cap-6-5)
7. [Ações rápidas e preferências](#cap-7)
   - 7.1 [Ações rápidas](#cap-7-1)
   - 7.2 [Preferências (preencher e confirmar com um clique)](#cap-7-2)
   - 7.3 [Minhas Preferências](#cap-7-3)
   - 7.4 [Combos de preferências](#cap-7-4)
   - 7.5 [Nova Ordenação](#cap-7-5)
   - 7.6 [Nova Remessa](#cap-7-6)
   - 7.7 [Escolher a movimentação das Ações rápidas](#cap-7-7)
   - 7.8 [Painéis com muitas preferências (busca e + Nova preferência no topo)](#cap-7-8)
   - 7.9 [Seção Preferências na tela do processo](#cap-7-9)
8. [Atalhos para telas do processo](#cap-8)
   - 8.1 [Alvará Eletrônico](#cap-8-1)
   - 8.2 [Juntar Documento com preferências](#cap-8-2)
   - 8.3 [(Des)Habilitar Advogado](#cap-8-3)
   - 8.4 [Editar Partes/Outros](#cap-8-4)
   - 8.5 [Colar processo](#cap-8-5)
   - 8.6 [Oráculo](#cap-8-6)
   - 8.7 [Sistemas do CNJ e outros (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud, SEEU, Sistema Uniformizado, COPEL, FUPEN, SANEPAR, SESP)](#cap-8-7)
   - 8.8 [Alterar Classe/Assuntos](#cap-8-8)
   - 8.9 [Novo Valor da Causa](#cap-8-9)
   - 8.10 [Prioridades (incluir, remover e preferências)](#cap-8-10)
   - 8.11 [Agendar Audiência com preferências](#cap-8-11)
9. [Telas de análise, mesas e cumprimentos](#cap-9)
   - 9.1 [Filtro por Sequencial na Análise de Decurso de Prazo](#cap-9-1)
   - 9.2 [Listas de tarefas](#cap-9-2)
   - 9.3 [Minhas Preferências na linha do processo (⭐)](#cap-9-3)
   - 9.4 [Mesa do Analista sem itens zerados](#cap-9-4)
   - 9.5 [RG e CPF das partes nos cumprimentos](#cap-9-5)
   - 9.6 [Dados processuais nas ordenações BNMP](#cap-9-6)
   - 9.7 [Endereço da parte e Mandado Regionalizado](#cap-9-7)
   - 9.8 [Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões, nos Cumprimentos, no Expedir e nos Paralisados](#cap-9-8)
   - 9.9 [Documento do Juiz ao passar o mouse no Retorno de Conclusão](#cap-9-9)
   - 9.10 [Analisar e Dispensar decurso na lista](#cap-9-10)
   - 9.11 [Analisar (Pré-Análise) dos cumprimentos com preferências](#cap-9-11)
   - 9.12 [Localizador na lista de juntadas e de conclusões (Projudi)](#cap-9-12)
   - 9.13 [Listas em uma única página (Juntadas, Conclusões, Mandados, Intimações, Multas FUPEN e Juiz das Garantias)](#cap-9-13)
   - 9.14 [Processos Paralisados (+90 dias) na tela Início](#cap-9-14)
   - 9.15 [Totais da Mesa do Escrivão Criminal na Análise de Juntadas](#cap-9-15)
   - 9.16 [Visual novo da Mesa do Analista (Projudi)](#cap-9-16)
   - 9.17 [Audiências pendentes na Análise de Juntadas](#cap-9-17)
10. [Privacidade e perfis bloqueados](#cap-10)
    - 10.1 [O que fica guardado no seu navegador](#cap-10-1)
    - 10.2 [Bloqueio para perfis de advocacia](#cap-10-2)
11. [Solução de problemas](#cap-11)
- [Anexo A — Histórico de versões do manual](#anexo-a)

---

<a id="cap-1"></a>
## 1. Apresentação

A extensão é um complemento instalado no navegador (Google Chrome ou
Microsoft Edge) que acrescenta botões, painéis e informações às telas do
**Projudi** (TJPR). Ela não substitui nenhuma tela
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
| ⚠️ | Atenção: cuidado para não praticar um ato sem conferir |
| ✅ **Sim, executar** | O único botão da extensão que confirma um ato processual — sempre depois de você conferir |

<a id="cap-1-3"></a>
### 1.3 Onde a extensão funciona

| Sistema | O que funciona |
|---|---|
| **Projudi (TJPR)** | Todas as funções deste manual |
| **SEEU** | Não funciona. Desde a versão 18 a extensão atende só o Projudi (o card **SEEU**, ao lado da balança, continua abrindo o SEEU a partir do Projudi — [8.7](#cap-8-7)) |

A extensão **não funciona** quando o usuário está logado com perfil de
advogado(a) ou de assessor(a) de advogado — veja [10.2](#cap-10-2).

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
5. **Pendências antes de uma preferência:** com juntadas
   ou conclusões pendentes, a extensão pergunta antes se deve **dispensar
   as juntadas**, **finalizar a conclusão** ou **dispensar os decursos**.

---

<a id="cap-2"></a>
## 2. Primeiros passos

<a id="cap-2-1"></a>
### 2.1 Instalação

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
6. A extensão aparece na lista com o nome **Assistente Projudi – Ações Rápidas e Pré-visualização** e a página de **Termos de Uso** se abre
   sozinha — siga o item [2.2](#cap-2-2).

**Bom saber:** não apague nem mova a pasta depois de instalar: o navegador
usa os arquivos dela.

<a id="cap-2-2"></a>
### 2.2 Termos de Uso

**Para que serve:** a extensão só é ativada depois que você lê e aceita os
Termos de Uso. Enquanto não houver aceite, **nenhuma função aparece** no
Projudi.

**Passo a passo:**

1. Leia os termos na página que se abriu.
2. Marque **Declaro que li os Termos de Uso e concordo com todas as
   condições**.
3. Clique em **Aceitar e ativar a extensão**.
4. Recarregue (tecla **F5**) as páginas do Projudi que já estavam
   abertas.

**Bom saber:**

- **Não concordo - remover extensão** desinstala a extensão.
- Sem aceite, a página de termos volta a abrir ao iniciar o navegador, após
  uma atualização e ao abrir o Projudi.
- Para reler os termos ou **revogar o aceite**, use o link **Termos de Uso
  da extensão** na página de opções ([2.5](#cap-2-5)).
- Quando o texto dos termos muda de forma relevante, todos precisam aceitar
  de novo.

<a id="cap-2-3"></a>
### 2.3 Atualização da extensão

**Para que serve:** saber quando há novidades na extensão e instalar a
versão nova sem perder as suas preferências.

**Como você fica sabendo:** a extensão confere sozinha, algumas vezes por
dia, se saiu uma versão nova. Quando sai, aparece no Projudi, logo
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
7. Recarregue (**F5**) as abas do Projudi, WhatsApp Web e Outlook que
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
- **Ver o que mudou** abre o histórico do manual ([Anexo A](#anexo-a)) na
  página da extensão no GitHub.
- A versão instalada aparece no card da extensão, em `chrome://extensions`,
  e no topo do Menu. Compare com a versão na capa deste manual.
- Também é possível atualizar sem o aviso: substitua o conteúdo da pasta
  pelos arquivos novos e siga os passos 6 e 7.

<a id="cap-2-4"></a>
### 2.4 A barra de botões da extensão

**Onde fica:** com um processo aberto, no **canto inferior direito** da
tela, "flutuando" sobre a página. Os botões são compactos e só com o nome
(sem símbolos, exceto a ⭐ de **Minhas Preferências** e o 🔗 de **Combos**), para cobrir o mínimo
possível dos botões do próprio Projudi. Neste manual, alguns botões ainda
aparecem com um símbolo antes do nome (como 📎 Juntar Documento) apenas para
facilitar a leitura. Se você esconder um botão ou desligar uma função no
Menu ([2.6](#cap-2-6)), os botões seguintes **se reorganizam** e ocupam o
espaço que ficou vazio; ao mostrar o botão de novo, ele volta ao seu lugar.
O mesmo vale para **Enviar por WhatsApp** e **Enviar por e-mail**: se só um
deles estiver à vista, ele vai para o fim da barra e os outros botões
ocupam o lugar do que saiu. Esconder ou mostrar um botão vale na hora; ligar ou desligar uma função
vale ao recarregar a página.

**Duas linhas:** a de cima começa sempre com **⭐ Minhas Preferências**,
seguido dos grupos de ação e do **▾ Ações**; a de baixo começa sempre com
**Combos**, seguido de **Advogados**, **Editar Partes**, **Colar processo**
e os demais.

**Mudar a ordem dos botões:** arraste um botão da barra com o mouse até o
lugar que preferir, inclusive para a outra linha (por exemplo, o **Colar
processo** para a linha de cima). Só o **⭐ Minhas Preferências** e o
**Combos** não mudam de lugar. Os outros botões se ajeitam sozinhos, e a nova ordem fica **salva**: vale em todos os
processos e vai junto no **⬇ Exportar** do
Menu. Um clique sem arrastar continua abrindo o botão normalmente. Para
voltar à ordem original: Menu (balança) → **Ações rápidas e Minhas
Preferências** → lista **Botões** → **↺ Ordem original**. O botão **🔗 Combos**
fica em azul e o **⭐ Minhas Preferências** em dourado claro, para serem
achados mais depressa.

| Botão | O que faz | Seção |
|---|---|---|
| **▸ Ações** / **▾ Ações** | Mostra ou recolhe os grupos de ações rápidas (**Concluso**, **Remessa**, **Ordenações**, **Int. Partes**, **Alvará Eletrônico**, **Outras**) | [7.1](#cap-7-1) |
| **⭐ Minhas Preferências** | Todas as preferências salvas, em cards | [7.3](#cap-7-3) |
| **Colar processo** | Pesquisa o número de processo que você copiou | [8.5](#cap-8-5) |
| **Advogados** | Tela de Advogados em popup ((Des)Habilitar Advogado), com preferências de advogados | [8.3](#cap-8-3) |
| **Editar Partes** | Tela Partes do Processo em popup (Editar Partes/Outros) | [8.4](#cap-8-4) |
| **Juntar Documento** | Juntada com preferências gravadas | [8.2](#cap-8-2) |
| **Destacar mov.** | Cores por tipo de usuário | [3.4](#cap-3-4) |
| **🔗 Combos** | Várias preferências em sequência | [7.4](#cap-7-4) |
| **Oráculo** | Consulta de antecedentes da parte | [8.6](#cap-8-6) |
| **Enviar por WhatsApp** | Envia documentos marcados | [5.1](#cap-5-1) |
| **Enviar por e-mail** e **▼** | Envia documentos marcados pelo Outlook; ▼ = Alterar Remetente | [5.2](#cap-5-2) |
| **↕ Mover** | Arraste para cima/baixo se a barra cobrir algo (vale só para a página atual; também funciona com as setas do teclado) | — |
| **Ocultar** / **Mostrar** | Esconde ou mostra todos os botões da extensão | — |

**Bom saber:**

- O **ícone da balança** (canto superior direito, abaixo de **Sair**) não faz
  parte desta barra: ele abre o **Menu da extensão** — veja [2.6](#cap-2-6).
  Os **cards coloridos com o nome** de cada sistema, logo à esquerda dela, abrem os **sistemas do CNJ**
  (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud e Renajud, o SEEU e o Sistema Uniformizado do TJPR), e o card **Outros** guarda
  COPEL, FUPEN, SANEPAR e SESP Intranet — veja [8.7](#cap-8-7).
- Passe o mouse sobre qualquer botão para ver uma dica.
- A barra acompanha a rolagem da página. Ela se alinha ao quadro
  **Pendências**; quando a tela não tem esse quadro, alinha-se ao quadro
  **Anotações nos autos**.
- A barra aparece na tela do processo. Em algumas telas (ex.: **Juntar
  Documento**, **Análise de Juntadas**, **Retorno de Conclusão**, telas de
  cumprimento, ficha da parte, **Denunciado(s)**, **Sentenciados**,
  **Infrações/Penas**, **Apreensão**, **Suspensão/Transação Penal**, **Auto
  de Penhora**, **Guia de Recolhimento**, **Trânsito em Julgado**,
  **Informações Financeiras**, **Depósitos/Alvarás Eletrônicos**, **Agenda de
  Audiências**) ela fica oculta — a pré-visualização continua funcionando.
  Ela também não aparece dentro dos popups do **🏦 Alvará Eletrônico**, do
  **Editar Partes** e da ficha de um réu aberta pelo cabeçalho.

<a id="cap-2-5"></a>
### 2.5 Página de opções

**Onde fica:** `chrome://extensions` → **Detalhes** (no card da extensão) →
**Opções da extensão**.

| Campo | Para que serve |
|---|---|
| **Modo de envio** | Como o e-mail é preparado: **Automático** (padrão), **Sempre via Microsoft Graph** ou **Sempre via Outlook Web (sem Azure AD)** — veja [5.2](#cap-5-2) |
| **Client ID** / **Tenant ID** | Dados fornecidos pelo setor de TI para o modo Microsoft Graph. Não preencha se o TI não informou (o Tenant ID é opcional) |
| **Sair do Outlook nesta extensão** | Apaga o login do Outlook guardado pela extensão. Útil em computador compartilhado; no próximo envio a Microsoft pede login de novo |
| **Termos de Uso da extensão** | Consultar os termos ou revogar o aceite |

Clique em **Salvar** depois de alterar.

<a id="cap-2-6"></a>
### 2.6 Menu da extensão (ícone da balança)

**Para que serve:** deixar a extensão do jeito da sua rotina — ligar e
desligar funções inteiras ou só os botões que você não usa —, levar as suas
preferências para outro computador e abrir este manual.

**Onde fica:** um ícone pequeno — a **balança da Justiça** em azul-marinho,
num quadrado dourado — sempre visível no cabeçalho do Projudi, no canto
superior direito, logo abaixo do link **Sair**.

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
Menu há uma faixa com uma chave **"Extensão ativada no PROJUDI"**. Verde = extensão funcionando; ao desligar, a faixa fica
vermelha ("Extensão desativada…") e **nenhuma função** atua no Projudi a
partir do próximo carregamento da página (clique em **Recarregar agora**). Só o
ícone da balança continua na tela, para você poder ligar de novo. As escolhas
da lista de funções ficam guardadas e **não** são perdidas. O pontinho vermelho do ícone também aparece
quando a extensão está desativada.

**1. Funcionalidades** — a lista de todas as funções, agrupadas por assunto,
cada uma com uma **chave liga/desliga**. Por padrão, **tudo vem ativo**.
Acima da lista aparece "Funcionalidades no PROJUDI: N de 40 ativas".

1. Clique na chave da função que quer ligar ou desligar.
2. A mudança vale para **todas as páginas do Projudi**, a partir da
   próxima vez que a página for carregada. Clique em **Recarregar agora** para
   aplicar na página atual.

Algumas funções dependem de outras (aparece em dourado, sob o nome:
"Requer: …"). O Menu cuida disso e avisa o que fez:

- ao **desligar** uma função, as que dependem dela também são desligadas;
- ao **ligar** uma função, as que ela exige são ligadas junto.

Exemplo: **Editar Partes/Outros** exige **Ações rápidas e Minhas
Preferências** e **(Des)Habilitar Advogado**.

**Procurar uma função** — logo acima da lista há o campo **🔎 Procurar
funcionalidade ou botão…**. Digite parte do nome (por exemplo, "combos" ou
"whatsapp") e a lista mostra só as funções com esse nome, na descrição ou
num dos seus botões. Apague o texto para ver a lista inteira de novo.

**Esconder só alguns botões** — algumas funções têm vários botões. Nelas,
logo abaixo da chave, aparece a linha **Botões: N de N à mostra**; clique
nela para abrir a lista, e cada botão tem a sua própria chave (menor). Assim
você esconde só o que não usa, sem desligar a função inteira:

| Função | Botões que podem ser escondidos um a um |
|---|---|
| **Pré-visualização e WhatsApp** | 📱 Enviar por WhatsApp (a pré-visualização continua) |
| **Expandir anexos / ocultar sem arquivo** | Expandir/Recolher movimentações · Apenas com arquivo (+) |
| **Ações rápidas e Minhas Preferências** | Concluso · Remessa · Ordenações · Int. Partes · Outras (inclui Suspender, Transitar e Arquivar) · ⭐ Minhas Preferências · Seção "Preferências" (abaixo das Pendências) · Combos · Destacar mov. · Colar processo |
| **Dispensar juntadas, decursos e cumprimentos** | Dispensar juntadas · Dispensar decursos · Dispensar pendências (cumprimentos para expedir) · Dispensar decurso · Analisar decurso (cumprimentos aguardando análise de decurso) |

- Esconder ou mostrar um botão vale **na hora**, sem recarregar a página, em
  todas as abas abertas do Projudi.
- O **↺ Padrão** mostra todos os botões de novo.
- Com a função desligada, as chaves dos botões ficam bloqueadas (cinza):
  ligue a função primeiro.
- Acima da lista aparece também quantos botões estão escondidos ("· 2
  botão(ões) escondido(s)").
- Esconder um botão só tira o botão da tela: as preferências e os combos
  continuam salvos e funcionando por outros caminhos (por exemplo, a ⭐ das
  listas).

**Desativar todas (montar a extensão do zero)** — o link **Desativar
todas**, ao lado do total de funções ativas, desliga todas as funções,
depois de você confirmar.
Em seguida, ligue uma a uma só as que você usa. Nada do que você salvou
(preferências, combos, listas, contatos) é apagado, e o **↺ Padrão** volta a
ligar tudo.

> **Dica: computador lento.** Se o Projudi estiver lento num computador
> mais fraco, ou com muitas abas abertas, **desligue no Menu as funções que
> você não usa**. Uma função desligada deixa de ser carregada nas páginas e
> não gasta mais nada do computador (vale a partir do próximo carregamento da
> página; clique em **Recarregar agora**). Esconder só alguns botões (acima)
> não deixa a extensão mais leve: a função continua carregada, só o botão
> some da tela. As que mais trabalham são
> **Pré-visualização e WhatsApp**, **Envio por e-mail**, **Destaque de
> movimentações** e **Expandir anexos / ocultar sem arquivo**, porque
> conferem a lista de movimentações sempre que ela muda. Para saber se a
> lentidão vem da extensão ou do próprio Projudi, desligue a extensão pela
> chave geral (item 0 acima) e abra a mesma tela: se continuar lenta, é o
> Projudi.

| Grupo | Funções que podem ser ligadas/desligadas | Seção |
|---|---|---|
| **Documentos e movimentações** | Pré-visualização e WhatsApp · Envio por e-mail (Outlook) · Destaque de movimentações · Expandir anexos / ocultar sem arquivo | [3.1](#cap-3-1), [5](#cap-5), [3.4](#cap-3-4), [3.3](#cap-3-3) |
| **Ações rápidas e atalhos** | Ações rápidas e Minhas Preferências · Escolher a movimentação das Ações rápidas · (Des)Habilitar Advogado · Editar Partes/Outros · Alterar Classe/Assuntos · Novo Valor da Causa · Prioridades · Agendar Audiência (preferências) · Alvará Eletrônico · Juntar Documento · Oráculo · Sistemas do CNJ · Nova Remessa · Nova Ordenação | [7](#cap-7), [8](#cap-8) |
| **Informações do processo** | Réus no cabeçalho · Sequencial do processo principal · Indicador de suspensão ativa · Indicador de monitoração eletrônica · Bloco de anotações | [4](#cap-4) |
| **Pendências, mesa e listas** | Dispensar juntadas, decursos e cumprimentos · Finalizar conclusão pendente · Ocultar contadores zerados · Filtro por Sequencial no Decurso de Prazo · Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões, nos Cumprimentos, no Expedir e nos Paralisados · Documento do Juiz ao passar o mouse no Retorno de Conclusão · Analisar e Dispensar decurso na lista · Listas de tarefas · Minhas Preferências na linha (⭐) · Localizador na lista (Projudi) · Listas em uma única página · Processos Paralisados (+90 dias) na tela Início · Totais da Mesa do Escrivão Criminal na Análise de Juntadas · Audiências pendentes na Análise de Juntadas · Visual novo da Mesa do Analista | [6](#cap-6), [9](#cap-9) |
| **Cumprimentos** | RG e CPF nos cumprimentos · Informações nas ordenações BNMP · Endereço da parte e Mandado Regionalizado | [9.5](#cap-9-5), [9.6](#cap-9-6), [9.7](#cap-9-7) |

Botões como **📋 Colar processo**, **🔗 Combos** e **🖍️ Destacar
mov.** fazem parte das funções acima (as duas primeiras, das
**Ações rápidas**; a última, do **Destaque de movimentações**).

**Cor do visual da Mesa do Analista** — escolhe a cor do
visual novo da Mesa ([9.16](#cap-9-16)): **Projudi original** (padrão, as
cores de sempre do Projudi), **Oliva fosco**, **Areia**, **Sálvia**, **Névoa**
ou **Escuro suave**. A mesma escolha pode ser
feita nas bolinhas ao lado do título da Mesa.

**Abrir os sistemas (cards ao lado da balança)** — logo acima de
Preferências e combos, escolhe como os cards dos sistemas ([8.7](#cap-8-7))
abrem: **Automático** (padrão: no segundo monitor, se houver; senão, no
popup), **Sempre no popup** ou **Sempre fora do popup** (segundo monitor ou
nova aba).

**2. Preferências e combos** — cópia de segurança para levar tudo a outro
computador:

- **⬇ Exportar**: baixa um arquivo `.json` com **toda e qualquer preferência
  que você criou**: as preferências das ações (intimações, citações,
  mandados, alvará, advogados etc.), de **Juntar Documento**, de **Analisar
  Decurso**, de **Pré-Análise**, de **classe**, **assunto principal** e
  **assuntos secundários**, os **combos**, a ordem
  dos cards em **Minhas Preferências**, as listas de tarefas (com as
  preferências e os processos marcados), contatos do WhatsApp, destinatários
  e remetentes de e-mail, configuração do envio por e-mail, destaques de
  movimentações, a ordem dos cards dos sistemas (e o que fica no **Outros**)
  ([8.7](#cap-8-7)) e as funções desligadas. Ao terminar, o
  Menu mostra o resumo do que foi salvo (por exemplo, "12 preferência(s) das
  ações; 3 preferência(s) de assunto secundário; 2 combo(s)…"). Preferências
  de funções novas entram no arquivo automaticamente.
- **⬆ Importar**: no outro computador (com a mesma extensão instalada), escolha
  o arquivo. O Menu mostra um **resumo do que ele contém**; depois de você
  **confirmar**, as preferências daquele computador são **substituídas** pelas
  do arquivo. Recarregue as páginas abertas.
- **↺ Padrão**: religa todas as funções. **Não** apaga nenhuma preferência.

⚠️ O arquivo **não** leva o aceite dos Termos de Uso (cada instalação aceita os
seus), nem login do Microsoft Graph, nem trabalhos em andamento (envios,
combos e juntadas pendentes). Guarde o arquivo com cuidado: ele contém os
seus contatos.

**3. 📖 Manual do Usuário** — abre este manual numa nova aba, com **índice
lateral e busca**. Logo acima fica o link **Termos de Uso**.

**Bom saber:** se um botão da extensão "sumiu", confira no Menu se a função
não foi desligada (e se alguma função de que ela depende não foi desligada
junto).

---

<a id="cap-3"></a>
## 3. Leitura do processo (aba Movimentações)

<a id="cap-3-1"></a>
### 3.1 Pré-visualização de documentos

**Para que serve:** ler a íntegra de um documento **sem abrir outra aba**.

**Onde fica:** aba **Movimentações** do processo.

**Passo a passo:**

1. Abra os arquivos de uma movimentação (ícone **+**), como de costume.
2. **Pare o mouse sobre o nome do arquivo** (ex.: `Certidao de Baixa.pdf`)
   por meio segundo.
3. O documento aparece num painel sobre a tela, já **na largura do
   painel** (sem a coluna de miniaturas das páginas à esquerda), para a
   leitura ficar confortável. Role dentro dele normalmente.
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
- O mesmo ajuste de tamanho vale para todas as pré-visualizações de
  documentos da extensão (pendências, mandados devolvidos e conclusões).
  Se quiser mudar o tamanho, use os botões **−** e **+** do próprio painel;
  a coluna de miniaturas pode ser reaberta pelo botão **☰**.
- Arquivos que o navegador não consegue exibir (alguns formatos que não
  são PDF) podem ser baixados em vez de exibidos.

<a id="cap-3-2"></a>
### 3.2 Pré-visualização das pendências

**Para que serve:** ver os documentos de juntadas e conclusões **pendentes**
sem abrir a tela de análise.

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

**Para que serve:** num processo **apenso**, ver o **Sequencial** do
processo principal sem abri-lo; no processo principal, ver o próprio
**Sequencial** sem precisar abrir a aba **Informações Gerais**.

**Qual é o processo principal:** é sempre o **primeiro processo da linha
Apensamentos:** da tela do processo, mesmo quando há apensos de apensos.
Exemplo:

| Linha Apensamentos: | O que a extensão mostra |
|---|---|
| Processo 0037276… — Ação Penal (primeiro da lista) | **Sequencial:** da própria Ação Penal |
| ↳ Processo 0035990… — Medidas Protetivas | **Sequencial do Processo Principal:** o da Ação Penal |
| ↳↳ Processo 0022813… — Petição Criminal | **Sequencial do Processo Principal:** o da Ação Penal |

O campo **Processo Principal:** do Projudi não é usado para isso, porque
ele às vezes indica só a origem de um desmembramento.

**Onde fica:**

- **No apenso:** linha laranja **Sequencial do Processo Principal:**, logo
  abaixo de **Processo Principal:** (ou de **Nível de Sigilo:**, quando o
  apenso não tem esse campo).
- **No primeiro processo da lista de Apensamentos, ou num processo sem
  apensos:** linha laranja **Sequencial:**, com o Sequencial do próprio
  processo (o mesmo da aba **Informações Gerais**), logo abaixo de
  **Nível de Sigilo:**.

**Bom saber:** a linha mostra "Buscando…" por um instante. Se a extensão
não conseguir confirmar o número do processo principal, mostra "não
encontrado" em vez de um número errado.

---

<a id="cap-5"></a>

### 4.5 Bloco de anotações

**Para que serve:** escrever uma nota pessoal, ou compartilhar o texto como lembrete ativo do Projudi para que os servidores com acesso ao processo também possam consultá-lo.

**Onde fica:** no canto superior direito. A anotação do processo aparece nas telas da ficha e de movimentação do processo; a anotação permanente pode ser usada nas demais páginas.

**Passo a passo:** escreva no post-it; o texto fica salvo neste navegador enquanto você edita. Na opção **Deste processo**, clique em **Salvar no Projudi** para atualizar o lembrete ativo mostrado na ficha do processo. Se ainda não houver lembrete ativo, a extensão cria um com o assunto **Anotação compartilhada - Abra ou instale a extensão Assistente Projudi**. O envio só acontece ao clicar nesse botão. A extensão consulta **Informações Gerais** em segundo plano para localizar o lembrete, sem trocar a aba que você está usando. Arraste pelo título **Anotações** para mudar a posição. Use **−** para recolher e **▾** para reabrir. Os quadrinhos ao lado do aviso de salvamento escolhem amarelo, azul, verde ou vermelho. Clique em **+** no título para criar uma nota pessoal adicional para o processo; cada nota tem sua própria cor e posição. Use **×** para excluir uma nota adicional (pede confirmação se houver texto). Escolha **Permanente (todos os processos)** para editar uma nota pessoal que não é enviada ao Projudi.

**Bom saber:** acompanha a rolagem da página e guarda a posição neste navegador. O texto de **Deste processo**, depois de salvo no Projudi, fica no lembrete ativo e é compartilhado com quem tem acesso ao processo. A extensão não altera lembretes desativados. Cores, posição, notas adicionais e a opção permanente ficam apenas neste perfil do navegador. Nas listagens e telas de análise, mostra apenas a anotação permanente, nunca a anotação de um processo da lista. Não aparece nas janelas de diálogo bloqueadas para os botões.

---

<a id="cap-5"></a>
## 5. Envio de documentos

Nas duas formas de envio, você marca
os documentos pelas caixinhas que a extensão coloca ao lado de cada arquivo
da aba **Movimentações** (abra o **+** da movimentação para vê-las). A
seleção é a mesma para WhatsApp e e-mail.

> **Caixinhas da extensão são laranja.** Todas as caixinhas de marcar que a
> extensão coloca na página (as dos arquivos, a da movimentação nas Ações
> rápidas e a do **⭐ Em lote** nas listas) têm **contorno laranja**, para
> não serem confundidas com as caixinhas do próprio Projudi.

<a id="cap-5-1"></a>
### 5.1 Envio por WhatsApp Web

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

**Bom saber:** no modo **Microsoft Graph**, o login fica guardado só
enquanto o navegador estiver aberto: ao fechar e abrir o navegador, a
Microsoft pede login de novo no primeiro envio. Para sair antes (por
exemplo, em computador compartilhado), use **Sair do Outlook nesta
extensão** na página de opções ([2.5](#cap-2-5)).

Anexos grandes seguem o limite do Outlook da instituição
(normalmente 25 MB por e-mail). Se o navegador pergunta onde salvar cada
download, uma janela aparecerá por arquivo.

<a id="cap-5-3"></a>
### 5.3 Destinatários favoritos e remetentes do e-mail

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

---

<a id="cap-6"></a>
## 6. Quadro Pendências

Botões que a extensão coloca ao lado dos links do quadro **Pendências** da
capa do processo.

⚠️ Estes botões **agem ao clicar**. Confira antes as pendências (a
pré-visualização do item [3.2](#cap-3-2) ajuda).

Todos esses botões (e os avisos que aparecem no lugar deles depois de
usados) têm o **mesmo tamanho**, pequeno e discreto, para não poluir o
quadro.

<a id="cap-6-1"></a>
### 6.1 Dispensar juntadas

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

**Passo a passo:**

1. Ao lado de "Há N pendência(s) de conclusão", clique em **Finalizar
   conclusão**.
2. O botão mostra **Finalizando…** e depois **Conclusão finalizada**.

**Bom saber:**

- A extensão só age se encontrar o botão nativo **Finalizar Conclusão
  Pendente** habilitado; senão, cancela com aviso. Para achá-lo, ela abre
  sozinha, sem você ver, a mesma tela que o Projudi mostraria ao clicar em
  **Analisar** — por isso o botão pode levar alguns segundos a mais.
- Se aparecer **Verifique a conclusão**, confira manualmente no Projudi
  **antes** de tentar de novo (evita finalizar duas vezes).
- O quadro Pendências só se atualiza quando você recarregar a página.

<a id="cap-6-3"></a>
### 6.3 Dispensar decursos de prazo

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

**Para que serve:** remover os cumprimentos pendentes de expedição de um mesmo tipo, incluindo mandados.

**Onde fica:** no quadro **Pendências**, ao lado de cada tipo em **Cumprimentos para Expedir** com quantidade maior que zero, inclusive **Mandado**.

**Passo a passo:**

1. Confira o tipo e a quantidade. Clique em **Dispensar pendências** somente se quiser remover todos os cumprimentos daquele tipo, inclusive os mandados.
2. Acompanhe **Dispensando 1/N…**. O botão fica desabilitado durante a operação.
3. Ao terminar, aparece **Cumprimentos dispensados (N)**. A página principal permanece aberta; recarregue-a para atualizar os contadores.

**Bom saber:** cada remoção só é contabilizada depois da confirmação do Projudi. Em caso de erro, a sequência para e aparece **Conferir dispensa (X/N)**, com a quantidade confirmada. Confira a listagem antes de repetir; não há reenvio automático. A opção **Dispensar juntadas, decursos e cumprimentos** no Menu também controla este botão.

<a id="cap-6-5"></a>
### 6.5 Dispensar e analisar decurso de cumprimentos

**Para que serve:** dispensar ou analisar o decurso de prazo de um cumprimento (ofício, ofício em reiteração etc.) sem abrir a lista **Demais Cumprimentos** e a tela do cumprimento.

**Onde fica:** no quadro **Pendências**, na linha **Cumprimentos Aguardando Análise de Decurso**, ao lado do link (o nome do link muda conforme o tipo, ex.: "Ofício em Reiteração: 01").

**Passo a passo:**

1. Confira o cumprimento (o link abre a lista, como sempre). Clique em **Dispensar decurso**.
2. O botão mostra **Dispensando decurso…** (com mais de um, **Dispensando decurso 1/N…**). Sem você ver, a extensão abre a lista, clica em **Visualizar**, clica em **Dispensar Decurso** e responde **OK** à pergunta "Confirma que é desnecessário gerar alguma movimentação em função da análise deste decurso de prazo…?".
3. Ao terminar, aparece **Decurso dispensado** (ou **Decursos dispensados (N)**). A tela do processo continua aberta; recarregue-a para atualizar o quadro Pendências.

**Bom saber:** cada dispensa só é contada depois que o Projudi a confirma. Em caso de erro, a sequência para e aparece **Conferir dispensa (X/N)**, com a quantidade confirmada; confira a lista antes de repetir (não há reenvio automático). Os cumprimentos da lista que não têm o botão **Dispensar Decurso** são deixados como estão.

**Analisar decurso — passo a passo:**

1. Na mesma linha, clique em **Analisar decurso**. Abre um menu, igual ao do **Analisar Decurso** das listas de decurso de prazo ([9.10](#cap-9-10)):
   - **Abrir a análise**: abre a tela **Analisar Decurso de Prazo** numa janela por cima da tela do processo, sem preencher nada;
   - **+ Nova preferência**: abre a análise e grava o que você fizer na janela **Inserir Arquivo** (Tipo do Arquivo, Modelo e texto). No **Assinar Arquivos**, a extensão pede um nome e salva a preferência;
   - uma **preferência salva** (as do Analisar Decurso, com ✏️ para editar e 🗑 para remover, e as do **📎 Juntar Documento**).
2. A extensão procura o cumprimento na lista, abre a tela dele na janela e clica sozinha em **Analisar Decurso de Prazo**.
3. Com uma preferência, ela clica em **Adicionar** e preenche a janela **Inserir Arquivo** com o Tipo do Arquivo, o Modelo e o texto gravados, até o **Assinar Arquivos**.
4. **Assine você mesmo(a)**, no assinador, como de costume.
5. Depois da assinatura, a extensão clica sozinha em **Confirmar Inclusão** e, de volta à tela de análise, em **Concluir**. A janela fecha e a linha mostra **✅ Análise do decurso concluída com ★ (nome da preferência)**; o botão passa a **Decurso analisado**.

**Bom saber:** se houver mais de um cumprimento aguardando, a extensão abre o primeiro; para o próximo, recarregue a página e clique de novo. Se a tela de análise não mostrar o botão **Concluir** (por exemplo, **Dispensar Arquivo**), a extensão não clica: o botão fica destacado para você conferir e clicar. Fechar a janela antes do fim interrompe o preenchimento. O **Analisar decurso** depende da função **Analisar e Dispensar decurso na lista** ligada no Menu. A opção **Dispensar juntadas, decursos e cumprimentos** no Menu também controla estes botões.

---

<a id="cap-7"></a>
## 7. Ações rápidas e preferências

<a id="cap-7-1"></a>
### 7.1 Ações rápidas

**Para que serve:** abrir as ações do painel lateral **Ações** do Projudi
(Enviar Concluso, Realizar Remessa, Intimar Partes…) sem rolar a tela e sem
sair da aba em que você está.

**Grupos e ações:**

**Suspender ou Sobrestar Processo**, **Transitar em Julgado** e **Arquivar
Processo** ficam dentro do botão **Outras** (até a versão 2.54, cada uma
tinha botão próprio). As
preferências já salvas para elas continuam valendo.

| Grupo | Ações |
|---|---|
| **Concluso** | Enviar Concluso |
| **Remessa** | Realizar Remessa; Remessa Eletrônica para o Tribunal de Justiça; Remessa Eletrônica para a Turma Recursal (Juizados Especiais) |
| **Ordenações** | Ordenar Cumprimentos; Ordenar RPV; Ordenar Expedição BNMP |
| **Int. Partes** | Intimar Partes; Notificar Partes; Citar Partes; Intimar Peritos e Auxiliares da Justiça |
| **🏦 Alvará Eletrônico** | Cadastrar Alvará Eletrônico ([8.1](#cap-8-1)) |
| **Outras** | Interromper Prazo; Declínio de competência para a Segunda Instância; Apensar; Desapensar; Anotações Criminais; Solicitar Antecedentes Criminais; Suspender ou Sobrestar Processo; Transitar em Julgado; Arquivar Processo |

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
- **Remessa Eletrônica para a Turma Recursal** só existe nos **Juizados
  Especiais** (no Projudi, fica logo abaixo da remessa ao Tribunal de
  Justiça). Ela abre, no popup, a tela **Envio do Processo … para a
  Instância Superior**, que não tem campos a preencher: só mostra os dados
  do processo, os advogados e o botão **Confirmar**. Por isso a
  preferência dela ([7.2](#cap-7-2)) não grava nenhum campo (nem a
  bolinha do advogado, que muda de processo para processo): ela só abre
  essa tela e pede o **✅ Sim, executar**, que clica em **Confirmar**.
  Mesmo na tela de Ações do Projudi, a extensão abre essa tela no popup.
  Em processo de outra vara, a extensão avisa que não achou a ação.
- **Anotações Criminais** e **Solicitar Antecedentes Criminais** (no
  Projudi, ficam no quadro **Comunicar ao IIPR** da coluna de Ações) só
  aparecem em processos criminais. Pelo botão **Outras**, a extensão abre
  a tela de Ações do processo no popup e clica ela mesma na opção, para a
  janela do Projudi aparecer exatamente como apareceria clicando lá.
  Ao criar uma preferência dessas ações, pode preencher a janela
  **Comunicar ao IIPR** normalmente (escolher a parte, a origem etc.) e
  só então clicar em **💾 Salvar como preferência**. A **Parte do
  Processo** não é gravada, porque muda de um processo para outro: ao
  usar a preferência, se o processo tiver **um só réu** na lista, a
  extensão já o deixa escolhido; com mais de um, escolha a parte antes de
  clicar em **✅ Sim, executar**.
- **Origem padrão** (Anotações Criminais e Solicitar Antecedentes
  Criminais): se a **Origem** estiver escolhida na hora de salvar (ex.:
  "Recebida em 21/09/2026"), a extensão pergunta se grava **"Recebida"**
  como origem padrão. Com **OK**, a cada uso ela procura, no processo, a
  origem "Recebida" **mais recente** e a seleciona sozinha, inclusive
  quando a lista de origens só aparece depois de você escolher a parte.
  Se o processo não tiver essa origem, a Origem fica para você escolher, e
  ao clicar em **✅ Sim, executar** a extensão avisa e pergunta se segue
  assim mesmo. Com **Cancelar**, a origem fica sempre para você escolher.
  Ao editar a preferência (✏️) sem origem escolhida, ela pergunta se mantém
  a origem padrão que já estava gravada.
- Nessas duas ações, a preferência grava o que está escolhido na janela
  (Comunicação, Antecedentes, Assinado por magistrado, Observação), mesmo
  que já viesse assim. Em **Solicitar Antecedentes Criminais**, que só tem
  a Parte e a Observação, a preferência pode ficar sem nenhum campo: ela
  apenas abre a tela e pede o **✅ Sim, executar**, que clica em
  **Salvar** (com um só réu, ele já vem escolhido; com mais de um,
  escolha a parte antes).
- Em outra aba (ex.: **Partes e Outros**), o painel pede para abrir a aba
  **Movimentações** primeiro.
- Ao terminar ações como **Ordenar Cumprimentos**, o popup se fecha e a
  página é recarregada sozinha.

<a id="cap-7-2"></a>
### 7.2 Preferências (preencher e confirmar com um clique)

**Para que serve:** gravar o preenchimento de um diálogo (ex.: "Intimar o
MP para ciência, 5 dias") e reaplicá-lo em outros processos.

**Criar:**

1. No painel da ação, clique em **+ Nova preferência** (na linha do nome
   da ação, ao lado de **Abrir**) — o diálogo do Projudi abre em branco.
2. Preencha como faria normalmente.
3. Com o diálogo aberto, clique em **💾 Salvar como preferência** (barra no
   topo da tela).
4. Confira a **lista de campos que serão gravados** (se faltar algum,
   cancele, ajuste e salve de novo).
5. Dê um nome e salve. **Nada foi enviado ao Projudi** — você ainda pode
   confirmar ou cancelar o diálogo normalmente.

**Usar:**

1. No painel da ação, clique no chip **nome-da-preferência**.
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

**Para que serve:** ver **todas** as preferências salvas (das ações rápidas,
do Juntar Documento e do **Agendar Audiência**) e os combos, em
cards, num só lugar.

**Como o painel é organizado:** as preferências ficam em **blocos, um por
ação**. No alto de cada bloco aparecem o ícone do botão da ação, o nome
dela e quantas preferências ela tem, ex.: **📤 Enviar Concluso (3)**. Os
combos ficam no bloco **🔗 Combos**, em azul. Os blocos ficam lado a lado,
e cada preferência é um card retangular com **nome da preferência**, o **✏️** (editar)
e o **🗑** (remover). O nome aparece sempre inteiro, em letra pequena; se
for comprido, ele continua na linha de baixo, dentro do mesmo card.

**Passo a passo:**

1. Clique em **⭐ Minhas Preferências**.
2. Clique no card desejado — o fluxo é o mesmo do item [7.2](#cap-7-2)
   (pergunta sobre juntadas/conclusão pendentes, se houver, diálogo
   preenchido + ✅ **Sim, executar**).
3. Para **editar** uma preferência, clique no **✏️** do card: o diálogo da
   ação abre preenchido com ela, para você ajustar os campos (e o nome) e
   salvar de novo. No card de um combo, o **✏️** abre o editor de etapas.
4. Para mudar a ordem: **✏️ Editar posição**, arraste os cards dentro do
   bloco ou o **título de um bloco** para mudá-lo de lugar, e clique em
   **✅ Concluir**. A ordem é salva na hora.

**Bom saber:** só os primeiros cards aparecem de início; marque **Mostrar
todas** para ver o restante — ou use a busca **🔍 Buscar preferência** do
topo do painel, que fica parado ao rolar ([7.8](#cap-7-8)). Os cards do bloco **Agendar Audiência** (só no
Projudi) abrem a tela de agendamento já com o tipo escolhido, depois do
**Manual** — veja [8.11](#cap-8-11); neles, o **✏️** só muda o nome.
Os mesmos cards ficam também **sempre à vista** na seção **Preferências**
da tela do processo, abaixo do quadro Pendências — veja [7.9](#cap-7-9).

<a id="cap-7-4"></a>
### 7.4 Combos de preferências

**Para que serve:** executar várias preferências **em sequência**, ex.:
"Intimar MP" → "Juntar certidão de decurso" → "Enviar concluso para
sentença".

**Que preferências podem entrar:** qualquer preferência que você já gravou
para usar na tela do processo — as das Ações rápidas (inclusive **Alvará
Eletrônico** e **⚖️ Advogados**), as do **📎 Juntar Documento**, as do
**✏️ Alterar Classe/Assuntos** (classe, assunto principal e assunto
secundário — [8.8](#cap-8-8)), as de **Prioridades**
([8.10](#cap-8-10)), as do **Agendar Audiência**
([8.11](#cap-8-11)). Na caixa de cada etapa elas aparecem separadas
pelo nome da função.

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
- Etapas de **✏️ Alterar Classe/Assuntos** e de **📍 Localizador** não
  abrem janela: a barra do combo mostra o que será feito (ex.: "Alterar a
  classe para ... e salvar" ou "Associar ao processo: ...") e só executa
  quando você clica em **▶ Sim, executar** nela. A alteração de
  classe/assuntos recarrega o processo (para o cabeçalho mostrar o novo
  valor) e o combo segue sozinho. Se algo der errado (por exemplo, um
  localizador que não existe na unidade), a barra mostra o aviso e oferece
  **↻ Repetir etapa**, **⏭ Próxima etapa** ou **⏹ Parar combo**.
- Etapas de **Agendar Audiência** também pedem o **▶ Sim, executar** na
  barra do combo. Depois dele, a extensão abre o **Agendar Audiência**,
  escolhe o tipo e clica em **Manual**; você termina o agendamento à mão.
  O combo **espera**: só segue para a próxima etapa quando você voltar à
  tela do processo. Por isso, o mais prático é deixar essa etapa por
  último.
- Preferências que só funcionam nas listas (Analisar Decurso, Pré-Análise
  e listas de tarefas) não entram nos combos: elas agem sobre a linha da
  lista, e não sobre a tela do processo.
- O combo continua mesmo depois de a página recarregar, mas **não**
  continua se você abrir outro processo na mesma aba.
- Editar uma preferência vale também para os combos que a usam; se ela for
  removida, o combo avisa.

<a id="cap-7-5"></a>
### 7.5 Nova Ordenação

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
- Para enviar cada item, a extensão abre o diálogo de novo, por trás da
  tela. Se não conseguir reabri-lo pelo caminho das Ações rápidas (por
  exemplo, quando o diálogo foi aberto direto pelo Projudi), ela reabre o
  mesmo diálogo que está na sua tela, sem você precisar fazer nada.
- Mandado Regionalizado também vai na fila: a extensão espera o Projudi
  carregar a lista de **Central de Mandados** da Comarca de Destino antes
  de escolher a central guardada. Opções que liberam outros campos (ex.:
  **Urgente: Sim**, que libera o **Tipo de Urgência**) também são
  refeitas como um clique seu.
- Campos que o Projudi só mostra depois de escolher o tipo de cumprimento
  (ex.: **necessitará de retorno?**) também são refeitos: a extensão espera
  o campo aparecer antes de enviar.
- **Cancelar** descarta a fila.
- ⚠️ Confira nos autos se todos os cumprimentos foram registrados,
  especialmente em ordenações com prazo.

<a id="cap-7-6"></a>
### 7.6 Nova Remessa

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

**Para que serve:** escolher **a partir de qual movimentação** as Ações
rápidas, as preferências e os combos vão agir — o mesmo que você faz à mão
ao clicar num evento e depois em **Movimentar a Partir Desta Movimentação**.
Assim, a remessa, a intimação ou a ordenação fica ligada ao evento certo
(ex.: o despacho que a determinou), e é esse evento que o destinatário vê.

**Onde fica:** na aba **Movimentações** do processo, uma **caixinha**
(com contorno laranja, como todas as da extensão) na
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
   (**nome da preferência**), um card de **⭐ Minhas Preferências** ou um **🔗 Combo**.
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

<a id="cap-7-8"></a>
### 7.8 Painéis com muitas preferências (busca e + Nova preferência no topo)

**Para que serve:** achar rápido uma preferência e criar uma nova mesmo
quando você já tem muitas — sem rolar a lista inteira nem diminuir o zoom
do navegador.

**Onde fica:** em todos os painéis que mostram preferências:

| Painel | Onde fica o **+ Nova preferência** |
|---|---|
| Painéis das **Ações rápidas** (Partes, Remessa, Concluso…) e **📎 Juntar Documento** | Na linha do nome de cada ação, ao lado de **Abrir** |
| **⭐ Minhas Preferências** ([7.3](#cap-7-3)) | Não tem (as preferências são criadas nos painéis das ações) |
| **⭐** de **Alterar Classe/Assuntos** ([8.8](#cap-8-8)) | No topo, ao lado do título |
| **⭐** da linha **Prioridade** ([8.10](#cap-8-10)) | No topo, ao lado do título |
| **Analisar Decurso** da lista ([9.10](#cap-9-10)) | No topo, abaixo de **Abrir a análise** |
| **⭐** da linha e **⭐ Em lote** ([9.3](#cap-9-3)) | No topo: **+ Nova · Analisar (Pré-Análise)** / **+ Nova · Analisar Decurso** |

**Como funciona:**

- O painel **cabe sempre na tela**. Se as preferências não couberem, ele
  rola por dentro (use a rodinha do mouse sobre ele).
- O **topo** do painel (título, botões e busca) fica **parado** enquanto
  as preferências rolam por baixo.
- Quando o painel tem **6 ou mais** preferências, aparece no topo o campo
  **🔍 Buscar preferência**. Digite parte do nome da preferência — ou do
  nome da ação, ex.: "remessa" — e só as que combinam continuam à vista.
  Não precisa de acento nem de maiúsculas. Apague o texto para ver todas de
  novo.
- Os blocos que ficam sem nenhuma preferência à vista somem durante a
  busca. Se nada combinar, o painel avisa "Nenhuma preferência com …".

**Bom saber:**

- No **⭐ Minhas Preferências**, com a busca preenchida aparecem **todas**
  as que combinam, mesmo as que o **Mostrar todas** esconderia. Durante o
  **✏️ Editar posição** a busca fica desligada (para arrastar, todos os
  cards precisam estar à vista).
- A busca só filtra o que aparece no painel: nada é apagado nem mudado
  nas suas preferências.

<a id="cap-7-9"></a>
### 7.9 Seção Preferências na tela do processo

**Para que serve:** deixar **todas** as suas preferências e combos
**sempre à vista** na tela do processo, para usar com **um clique só**,
sem precisar abrir o **⭐ Minhas Preferências**.

**Onde fica:** na própria página do processo, num quadro chamado
**Preferências**:

- logo **abaixo do quadro Pendências**, quando o processo tem pendências;
- logo **acima dos botões do Projudi** (**Pedido Incidental**, **Juntar
  Documento**, **Peticionar**...), quando não tem.

Ela só aparece se você tiver ao menos uma preferência ou combo salvo.

**Passo a passo:**

1. Abra o processo. A seção **Preferências** mostra os mesmos blocos do
   **⭐ Minhas Preferências** (um por ação, com a quantidade), na mesma
   ordem, e os combos no bloco **🔗 Combos**, em azul.
2. Clique no card desejado. O fluxo é o mesmo do item [7.2](#cap-7-2):
   pergunta sobre juntadas/conclusão pendentes, se houver, diálogo
   preenchido + ✅ **Sim, executar**. No card de um combo, ele começa como
   em [7.4](#cap-7-4).
3. Para editar, remover ou mudar a ordem dos cards, clique em
   **⚙ Organizar** (no título da seção): ele abre o **⭐ Minhas
   Preferências** ([7.3](#cap-7-3)). A nova ordem vale também na seção.
4. Para deixar só o título à vista, clique em **▾ Recolher**; para ver os
   cards de novo, **▸ Mostrar**. A escolha fica salva para os próximos
   processos.

**Bom saber:**

- Todas as preferências aparecem, sem o limite do **Mostrar todas** do
  painel.
- Um card **apagado** (mais claro) é de uma ação que não pode ser usada na
  aba em que você está — passe o mouse sobre ele para ver o motivo (ex.:
  abra a aba **Movimentações**).
- A seção não muda o lugar dos botões da extensão (eles continuam ao lado
  do quadro Pendências). Se esses botões ficarem na altura da seção (por
  exemplo, depois de usar o **↕ Mover**), os cards deixam livre o espaço
  deles, à direita, e nada fica por baixo de nada.
- Pode ser escondida no Menu ([2.6](#cap-2-6)): **Ações rápidas e Minhas
  Preferências** → **Seção "Preferências" (abaixo das Pendências)**. Vale
  na hora.

---

<a id="cap-8"></a>
## 8. Atalhos para telas do processo

Os atalhos de 8.1
a 8.6 abrem num **popup** sobre a tela atual — a aba do processo não sai do
lugar. Feche com **✕ Fechar**.

<a id="cap-8-1"></a>
### 8.1 Alvará Eletrônico

**Para que serve:** chegar ao **Cadastrar Alvará Eletrônico** sem passar
por Informações Adicionais → Depósitos/Alvarás → Novo Alvará, e já com os
campos repetitivos preenchidos.

**Onde fica:** **▸ Ações** → **🏦 Alvará Eletrônico**.

**Passo a passo:**

- **Abrir**: mostra a tela de **Modalidade** para você escolher.
- **+ Nova preferência**: escolha a modalidade, preencha os campos fixos no
  formulário completo e clique em **💾 Salvar como preferência**. Crie uma
  preferência para cada modalidade que usa.
- **nome da preferência**: a modalidade é escolhida sozinha e você já vê o
  formulário preenchido.

**Campos gravados:** Magistrado, Urgente, Natureza do Alvará, Representação
Processual, Finalidade do Pagamento, Tipo de Crédito e Observação.

⚠️ Conta judicial, beneficiário, sacadores, dados bancários, datas e
**valores** são sempre preenchidos por você. Não há ✅ **Sim, executar**:
confira e clique em **Salvar** do próprio Projudi.

<a id="cap-8-2"></a>
### 8.2 Juntar Documento com preferências

**Para que serve:** juntar documentos digitados de rotina (certidões,
informações, termos) refazendo sozinha todas as telas — você só digita o
PIN do certificado.

**Onde fica:** botão **📎 Juntar Documento** da barra da extensão (não
confundir com o botão nativo de mesmo nome).

| Opção | O que faz |
|---|---|
| **Abrir** | Vai para a tela Juntar Documento, como o botão nativo |
| **+ Nova preferência** | Grava o fluxo que você fizer (fica ao lado de **Abrir**) |
| **nome da preferência** | Refaz o fluxo sozinha |
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

**Usar (nome da preferência):** a extensão faz Tipo de Documento → Adicionar → Tipo do
Arquivo/Modelo → texto → Continuar → Concluir → **Assinar Arquivos**. Você
digita o PIN; depois ela clica em **Confirmar Inclusão** e **Concluir
Movimento**.

**Bom saber:**

- O que fica gravado é a **versão final** do documento no momento do
  clique em **Continuar** (é ele que encerra a edição). Se você não
  alterou nada, fica gravado o texto do Modelo como está; se alterou, a
  versão alterada. Cabeçalho, número dos autos, data e dados das partes
  são sempre os do processo em que a preferência é usada.
- **Editar o texto do Modelo também vale:** se você apagar trechos, mudar
  a formatação (negrito, itálico, sublinhado) ou alterar parágrafos do
  texto que o Modelo gerou, a preferência grava essas edições, parágrafo
  a parágrafo, e as refaz em cada uso — no documento novo, gerado pelo
  mesmo Modelo. Os parágrafos que você não mexeu ficam como o Projudi os
  gerou para o processo novo; nos que você alterou, os dados do processo
  (número, nomes das partes, endereço, CPF, datas) são trocados pelos do
  processo novo. Se o documento não parecer do mesmo Modelo, a extensão
  não mexe nele e avisa, para você fazer à mão.
- Confira sempre o documento antes de concluir: um dado que você digitou
  à mão (fora do que o Modelo gera) não é trocado.
- O PIN **nunca** é guardado.
- Se um passo automático falhar, faça-o à mão: a extensão continua do
  seguinte. **Parar**, na faixa, encerra sem gravar.
- O acompanhamento expira em 1 hora e para se você abrir outro processo.
- As mesmas preferências servem para incluir o arquivo na **análise do
  decurso de prazo**, direto da lista de decursos ([9.10](#cap-9-10)).

<a id="cap-8-3"></a>
### 8.3 (Des)Habilitar Advogado

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
| **nome da preferência** | Abre a tela já com os advogados da preferência na seção **Advogados** |
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

1. Clique em **⚖️ Advogados** → **nome-da-preferência** (ou use o card
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

- Preferências de advogados gravadas no SEEU (antes da versão 18) não
  aparecem mais.

<a id="cap-8-4"></a>
### 8.4 Editar Partes/Outros

**Para que serve:** abrir a tela **Partes do Processo** (botão nativo
**Partes e Outros**, com **Adicionar** e **Voltar**) num popup.

**Passo a passo:** clique em **Editar Partes**, faça as
alterações e feche com **✕ Fechar**.

<a id="cap-8-5"></a>
### 8.5 Colar processo

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
### 8.7 Sistemas do CNJ e outros (SerpJud, CNIEP, BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud, SEEU, Sistema Uniformizado, COPEL, FUPEN, SANEPAR, SESP)

**Para que serve:** abrir sistemas do CNJ e de outros órgãos usados no dia
a dia sem sair do processo.

**Onde fica:** no alto da tela, numa fileira de **cards coloridos, com o
nome de cada sistema escrito**, logo **à esquerda da balança dourada** do
Menu da extensão (abaixo do link **Sair**). Os cards são compactos, um pouco
mais baixos que a balança e centralizados nela, e acompanham a balança ao
rolar a página. **Só aparecem com um processo
aberto** (de qualquer jeito que ele tenha sido aberto: pela Mesa, pelas
listas — inclusive a de **Paralisados** — ou pelo atalho **Processo** do
topo), e só na **tela principal** dele — na Mesa, nas listas, nas demais
telas e dentro dos popups (Advogados, Partes, ações rápidas, janelas do
Projudi) fica só a balança.

**Ordem:** por padrão, os cards ficam em **ordem alfabética** do nome do
sistema, da esquerda para a direita. Você pode reorganizá-los como quiser
(veja abaixo); a sua arrumação fica guardada.

| Card | Sistema | Para quê |
|---|---|---|
| **BNMP** (azul-lavanda) | BNMP 3.0 | Banco Nacional de Medidas Penais e Prisões (mandados) |
| **CNIEP** (lilás) | CNIEP | Inspeções em estabelecimentos penais |
| **Infojud** (coral) | Infojud | Declarações e dados da Receita Federal (pelo e-CAC) |
| **PrevJud** (pêssego) | PrevJud | Informações previdenciárias |
| **Renajud** (orquídea) | Renajud | Restrições judiciais sobre veículos (bloqueio de transferência, licenciamento e circulação) |
| **SEEU** (terracota) | SEEU | Sistema Eletrônico de Execução Unificado (execução penal) — abre a página de entrada do SEEU |
| **SerpJud** (verde-água) | SERP-JUD | Registros públicos (cartórios de imóveis, títulos, pessoas) |
| **Sisbajud** (verde-claro) | Sisbajud | Ordens a bancos (bloqueio de valores, informações) |
| **S.U.** (cinza-azulado) | Sistema Uniformizado | Sistema do TJPR de fundos, custas e guias |
| **SNGB** (rosa) | SNGB | Gestão de bens apreendidos |
| **Sniper** (azul-claro) | Sniper | Investigação patrimonial |
| **Outros ▾** (branco) | — | Abre o painel com os sistemas guardados |

**Card Outros**: fica colado à balança. Clique nele para abrir
um painel com os sistemas guardados, também em ordem alfabética. No começo,
o painel traz:

| Card | Sistema | Para quê |
|---|---|---|
| **COPEL** (areia) | COPEL | Companhia Paranaense de Energia |
| **FUPEN** (oliva) | FUPEN | Fundo Penitenciário do Paraná (DEPEN-PR) |
| **SANEPAR** (azul-água) | SANEPAR | Portal da Sanepar para o Poder Judiciário |
| **SESP** (malva) | SESP Intranet | Intranet da Secretaria da Segurança Pública do Paraná |

Clique num card do painel para abrir o sistema. Para fechar o painel, clique
de novo em **Outros**, clique fora dele ou tecle **Esc**.

**Arrumar os cards como preferir:**

- **Mudar a posição:** clique num card da fila e, **sem soltar**, arraste-o
  para a direita ou para a esquerda; os outros abrem espaço. Solte no lugar
  desejado.
- **Trazer um sistema do Outros para a fila:** abra o **Outros**, clique num
  card do painel e, **sem soltar**, arraste-o **para cima de um card da
  fila**. Os dois trocam de lugar: o novo fica visível no lugar do outro, e
  o substituído vai para dentro do **Outros**.
- **Guardar um card da fila no Outros:** arraste-o **para cima do card
  Outros** (ou do painel aberto) e solte.

Um clique sem arrastar abre o sistema normalmente. A arrumação fica
guardada como sua preferência: vale para todas as abas, continua depois das
atualizações da extensão e vai junto no **⬇ Exportar** do Menu
([2.6](#cap-2-6)), para ser trazida de volta com o **⬆ Importar**. Quem já
tinha mudado a ordem antes desta versão continua com a sua ordem; os
sistemas novos entram no **Outros**.

**Passo a passo:**

1. Clique no card do sistema (passe o mouse para ver o nome completo).
2. Onde o sistema abre depende de quantos monitores você usa (é o padrão;
   dá para mudar — veja **Como os sistemas abrem**, abaixo):
   - com **dois monitores**, ele abre **direto numa janela que ocupa o
     outro monitor**;
   - com **um monitor só**, ele abre num **popup** sobre a tela do processo
     (o mesmo tipo de janela usado por Remessa, Concluso e as demais ações
     rápidas).

   Entre com o seu acesso e trabalhe nele.
3. No popup, se preferir trabalhar com o sistema fora dele, use o botão do
   topo. Ele já escolhe o melhor lugar:
   - com **dois monitores**, aparece como **🖥 Segundo monitor** e abre o
     sistema numa janela que ocupa o **outro monitor** inteiro;
   - com **um monitor só**, aparece como **🗂 Nova aba** e abre o sistema
     numa aba nova do navegador, logo ao lado da aba do processo.
4. Para voltar ao processo, clique em **✕ Fechar** (ou tecle **Esc**).

**Bom saber:**

- O popup fica sobre o processo: a aba do processo não muda de lugar.
- Se o login de um sistema não funcionar dentro do popup, use o botão
  **🖥 Segundo monitor** (ou **🗂 Nova aba**, com um monitor só).
- O nome do botão segue o que o navegador enxerga: se ele mostra
  **🖥 Segundo monitor**, abre no outro monitor; se mostra **🗂 Nova aba**,
  abre numa aba nova.
- Se o segundo monitor estiver desligado ou desconectado, o sistema abre
  no popup (ou, no botão do popup, numa nova aba).

**Como os sistemas abrem (sua escolha):** no Menu da extensão (ícone da
balança, [2.6](#cap-2-6)), em **Abrir os sistemas (cards ao lado da
balança)**, escolha uma das opções:

| Opção | Com dois monitores | Com um monitor só |
|---|---|---|
| **Automático (padrão): 2º monitor ou popup** | direto no outro monitor | no popup |
| **Sempre no popup, sobre o processo** | no popup | no popup |
| **Sempre fora do popup: 2º monitor ou nova aba** | direto no outro monitor | direto numa nova aba |

A escolha vale para todas as abas, já no próximo clique, continua depois
das atualizações da extensão e vai junto no **⬇ Exportar** do Menu.
- Ao fechar o popup, o que estava aberto no sistema não fica guardado; ao
  clicar de novo, ele abre na tela inicial.
- O **Infojud** é da Receita Federal e abre pelo **e-CAC**: o acesso é com
  o certificado digital (ou gov.br). Se o e-CAC não abrir no popup, use
  **🖥 Segundo monitor** (ou **🗂 Nova aba**, com um monitor só).
- A **SESP Intranet** é da rede interna do Estado: só abre em computadores
  ligados a essa rede.

---

<a id="cap-8-8"></a>
### 8.8 Alterar Classe/Assuntos

**Para que serve:** alterar a **classe processual** ou os **assuntos** do
processo sem sair da tela em que você está. Abre, num popup, a mesma tela
do botão **Alterar** da aba **Informações Gerais**.

**Onde fica:** no cabeçalho do processo, logo abaixo do número, há um
pequeno botão cinza **Alterar** ao lado da **Classe Processual** e ao
lado do **Assunto Principal**. Ele aparece em qualquer aba do processo.

**Passo a passo:**

1. Clique em **Alterar** ao lado da classe (para mudar a classe) ou do
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

**Preferências de alteração (⭐)**

Ao lado de cada **Alterar** há um botão **⭐**. Com ele você grava uma
alteração que se repete muito (por exemplo, classe **279 - Inquérito
Policial**, motivo **Evolução**) e depois a faz **com um clique**: a
extensão escolhe a classe, marca o motivo e clica em **Salvar** sozinha,
sem pedir confirmação.

*Gravar uma preferência:*

1. Clique na **⭐** ao lado da classe (ou do assunto principal) e em
   **+ Nova preferência**.
2. Abre-se a tela de alteração no popup, com um aviso amarelo
   "Gravando preferência".
3. Escolha a nova classe pela lupa e marque o **Motivo da Alteração da
   Classe Processual** (**Retificação** ou **Evolução**). Na ⭐ do assunto,
   escolha o novo assunto principal.
4. Clique em **Salvar**. Nesse momento **o processo não é alterado**: a
   extensão só guarda o que você escolheu, pede um nome para a preferência
   e fecha o popup.

*Usar a preferência:* clique na **⭐** e no nome da preferência
(**…**). Um aviso no alto da tela mostra o andamento ("preenchendo…",
"salvando…"); no fim, a tela do processo é recarregada já com a classe
nova.

*Bom saber:*

- A preferência é executada **direto, sem confirmação** — confira o nome
  antes de clicar.
- Se o processo **já estiver** com a classe (ou o assunto) da
  preferência, nada é feito e a extensão avisa.
- Se o Projudi recusar a alteração, a extensão mostra a mensagem dele e
  nada mais é feito; use **Alterar** para fazer à mão.
- Na ⭐ da classe, a extensão só grava a preferência se a classe foi
  trocada **e** o motivo foi marcado.
- Para apagar uma preferência, use **🗑** ao lado dela. As preferências
  entram no **⬇ Exportar** do Menu da extensão ([2.6](#cap-2-6)).
- O **+ Nova preferência** fica no topo do painel da ⭐, ao lado do título;
  com muitas preferências, o painel rola por dentro e ganha a busca
  **🔍 Buscar preferência** ([7.8](#cap-7-8)).
- A ⭐ do **assunto principal** grava só o assunto principal. Para os
  **Assuntos Secundários**, use a ⭐ própria deles (abaixo).

**Preferências de assuntos secundários (⭐ Secundários)**

Funciona como a ⭐ da classe e do assunto principal, mas para **incluir**
um assunto secundário que se repete muito — por exemplo, acrescentar
**3418 - Furto de coisa comum**.

**Onde fica:** se o processo já tem assunto secundário, o cabeçalho mostra
a linha **Assuntos Secundários**, e nela há **Alterar** e **⭐**. Se ainda
não tem, o balão **⭐ Secundários** fica na linha do **Assunto Principal**,
depois da ⭐ dele.

*Gravar uma preferência:*

1. Clique na **⭐** dos assuntos secundários (ou em **⭐ Secundários**) e em
   **+ Nova preferência**.
2. Abre-se a tela de alteração no popup, já na linha **Assuntos
   Secundários**, com o aviso amarelo "Gravando preferência".
3. Clique em **Adicionar**. Na janela de seleção do Projudi, pesquise o
   assunto, marque-o e clique em **Selecionar**.
4. Nesse momento **nada é alterado**: o assunto não entra no processo. A
   extensão só guarda o assunto escolhido, pede um nome para a preferência
   e fecha o popup.

*Usar a preferência:* clique na **⭐** dos assuntos secundários e no nome da
preferência (**…**). A extensão faz, sozinha e sem mostrar a tela, o
mesmo que você faria: **Adicionar**, pesquisa o assunto, marca, clica em
**Selecionar**, confere se ele entrou na lista e só então clica em
**Salvar**. Um aviso no alto da tela mostra o andamento; no fim, a tela do
processo é recarregada.

*Bom saber:*

- Se o processo **já tiver** o assunto secundário da preferência, nada é
  feito e a extensão avisa.
- Se o assunto não aparecer na pesquisa com o nome inteiro, a extensão
  pesquisa de novo de outras formas (sem acentos, só pela palavra mais
  longa do nome e pelo código do assunto).
- Se mesmo assim o assunto não aparecer, ou não entrar na lista, **nada é
  salvo** e aparece um aviso — use **Alterar** para fazer à mão. Se o
  Projudi tiver mostrado alguma mensagem ao selecionar o assunto, ela vem
  no aviso, depois de "Aviso do Projudi:".
- Às vezes o Projudi não reage ao primeiro **Selecionar**. A extensão
  percebe, clica de novo e, se ainda assim não der, recomeça tudo sozinha
  (até 3 tentativas). O aviso no alto da tela mostra "tentando de novo".
- A preferência só **inclui** assunto secundário. Para remover, use o
  **✖** ao lado do assunto (abaixo).
- Preferências de assunto secundário gravadas em versões de teste
  anteriores à 2.28.0 não funcionam: apague-as com **🗑** e grave de novo.
- Para apagar, use **🗑** ao lado da preferência. Elas também entram no
  **⬇ Exportar** do Menu da extensão ([2.6](#cap-2-6)).

**Remover um assunto secundário (✖)**

No cabeçalho do processo, na linha **Assuntos Secundários**, cada assunto
tem no fim um pequeno balão **✖**. Ele tira aquele assunto do processo sem
você abrir a tela de alteração.

1. Clique no **✖** do assunto que quer tirar.
2. Confirme a pergunta "Remover o assunto secundário … deste processo?".
3. Um aviso no alto da tela mostra o andamento ("removendo da lista…",
   "salvando…"). A extensão faz o mesmo que o botão **Remover** da tela de
   alteração, confere se o assunto saiu da lista e só então clica em
   **Salvar**. No fim, a tela do processo é recarregada sem o assunto.

*Bom saber:*

- Só os assuntos **secundários** têm **✖**; o assunto principal não pode ser
  removido, só trocado (**Alterar** ou **⭐**).
- Se o assunto não sair da lista, **nada é salvo** e a extensão avisa — use
  **Alterar** para fazer à mão.

<a id="cap-8-9"></a>
### 8.9 Novo Valor da Causa

**Para que serve:** alterar o **valor da causa** do processo só digitando
o valor novo. Você não precisa clicar em **Alterar**, procurar o campo
**Valor da Causa** na tela de alteração nem clicar em **Salvar**: a
extensão faz isso sozinha, sem mostrar aquela tela.

**Onde fica:** no cabeçalho do processo, logo abaixo do número — junto da
**Classe Processual**, do **Assunto Principal** e do **Nível de Sigilo** —,
a extensão acrescenta a linha **Valor da Causa**, com o valor atual e, ao
lado dele, um pequeno botão cinza **Novo Valor da Causa**. Ela aparece
em qualquer aba do processo: não é preciso abrir **Informações Gerais**.

**Passo a passo:**

1. Abra o processo (em qualquer aba).
2. Na linha **Valor da Causa** do cabeçalho, clique em
   **Novo Valor da Causa**. Abre-se um quadrinho com o
   **valor atual** e o campo **Novo valor**.
3. Digite o novo valor, com os centavos (por exemplo, **1.500,00**). Os
   pontos e a vírgula aparecem sozinhos enquanto você digita.
4. Clique em **Salvar** (ou tecle **Enter**). Um aviso no alto da tela
   mostra o andamento ("abrindo a tela de alteração…", "preenchendo…",
   "salvando…").
5. No fim, a tela do processo é recarregada, já com o valor novo. A
   alteração fica registrada pelo Projudi na aba **Movimentações**, como
   quando ela é feita pelo botão **Alterar**.

**Bom saber:**

- Logo que o processo abre, a linha mostra "carregando…" por um instante,
  enquanto a extensão busca o valor na aba **Informações Gerais**.
- O **Salvar** do quadrinho já grava no processo: **não há outra
  confirmação**. Confira o valor antes de clicar.
- **Cancelar**, a tecla **Esc** ou um clique fora do quadrinho fecham-no
  sem alterar nada.
- Se o processo **já estiver** com o valor digitado, nada é feito e a
  extensão avisa.
- Se o Projudi recusar a alteração (por exemplo, por falta de outro campo
  obrigatório da tela de alteração), a extensão mostra a mensagem dele e
  nada é alterado; nesse caso, use o botão **Alterar** da aba
  **Informações Gerais** para fazer à mão.
- Se aparecer "Não encontrei o botão Alterar…", o seu perfil não tem
  permissão para alterar este processo.

<a id="cap-8-10"></a>
### 8.10 Prioridades (incluir, remover e preferências)

**Para que serve:** incluir ou tirar uma **prioridade** do processo sem
passar pelo caminho de sempre (**Informações Gerais** → **Alterar** → lupa
da linha **Prioridade** → **Seleção de Prioridade** → **Selecionar** →
**Salvar**). Funciona como o **✖** e a **⭐** dos assuntos secundários
([8.8](#cap-8-8)).

**Onde fica:** no cabeçalho do processo, na linha **Prioridade** (a frase
em vermelho com as prioridades, separadas por vírgula). Ela aparece em
qualquer aba do processo. A extensão acrescenta:

- um pequeno balão **✖** depois de cada prioridade que pode ser tirada;
- no fim da linha, os botões **Incluir** e **⭐**.

Se o processo ainda não tem nenhuma prioridade, a extensão mostra a linha
**Prioridade** com "(nenhuma)", logo abaixo do **Nível de Sigilo**, já com
**Incluir** e **⭐**.

**Remover uma prioridade (✖):**

1. Clique no **✖** da prioridade que quer tirar.
2. Confirme a pergunta "Remover a prioridade … deste processo?".
3. Um aviso no alto da tela mostra o andamento ("abrindo a seleção de
   prioridade…", "selecionando…", "salvando…"). A extensão faz, sem mostrar
   a tela, o mesmo que você faria: abre a **Seleção de Prioridade**,
   desmarca a prioridade, clica em **Selecionar**, confere que ela saiu e
   só então clica em **Salvar**. No fim, a tela do processo é recarregada
   sem ela.

**Incluir prioridades (Incluir):**

1. Clique em **Incluir**. Abre-se a tela de alteração do processo num
   popup, já na linha **Prioridade** e com a janela **Seleção de
   Prioridade** do Projudi aberta.
2. Marque as prioridades que quer incluir (pode ser mais de uma) e clique
   em **Selecionar**.
3. A extensão clica em **Salvar** sozinha. O popup fecha e o processo é
   recarregado, já com as prioridades novas.

**Preferências (⭐):** para uma prioridade que você inclui (ou tira) com
frequência — por exemplo, **Violência doméstica e familiar contra a
mulher**.

*Gravar uma preferência:*

1. Clique na **⭐** da linha **Prioridade** e em **+ Nova preferência**.
2. Abre-se a tela de alteração no popup, com o aviso amarelo "Gravando
   preferência" e a **Seleção de Prioridade** aberta.
3. Marque as prioridades que a preferência deve **incluir** e desmarque as
   que ela deve **tirar**. Clique em **Selecionar**.
4. Nesse momento **nada é alterado** no processo: a extensão só guarda o
   que você marcou e desmarcou, pede um nome para a preferência e fecha o
   popup.

*Usar a preferência:* clique na **⭐** e no nome da preferência (**…**).
A extensão faz o mesmo caminho do **✖** — marca/desmarca na **Seleção de
Prioridade**, **Selecionar**, confere e **Salvar** — e recarrega o
processo. As preferências de prioridade também podem entrar nos **🔗
Combos** ([7.4](#cap-7-4)).

**Bom saber:**

- O **✖**, o **Selecionar** do **Incluir** e a preferência já gravam no
  processo. Só o **✖** pede confirmação; a preferência é executada
  **direto** — confira o nome antes de clicar.
- Algumas prioridades são colocadas **pelo próprio Projudi** (por exemplo,
  **Maior que 60 anos** ou **Réu Preso**, calculadas pela idade ou pela
  prisão). Elas não aparecem na **Seleção de Prioridade** e não podem ser
  tiradas por lá — por isso ficam **sem ✖**. Até a extensão abrir a
  Seleção de Prioridade pela primeira vez no seu navegador, o **✖** aparece
  em todas; se você clicar no de uma prioridade automática, a extensão
  avisa que ela não pode ser removida e nada é alterado.
- Se o processo **já estiver** como a preferência manda, nada é feito e a
  extensão avisa.
- Se a prioridade não mudar depois do **Selecionar**, ou se o Projudi
  recusar a alteração, **nada é salvo** e a extensão mostra a mensagem;
  nesse caso, use **Incluir** (ou o botão **Alterar** da aba
  **Informações Gerais**) para fazer à mão.
- Para apagar uma preferência, use **🗑** ao lado dela. As preferências
  entram no **⬇ Exportar** do Menu da extensão ([2.6](#cap-2-6)).
- Pode ser desligada no Menu ([2.6](#cap-2-6)): **Prioridades**, no grupo
  *Ações rápidas e atalhos*.

---

<a id="cap-8-11"></a>
### 8.11 Agendar Audiência com preferências

**Para que serve:** chegar mais rápido à tela de agendamento de um tipo de
audiência que você marca com frequência (por exemplo, **Audiência de
Instrução e Julgamento**). A preferência faz por você o começo do caminho
de sempre — **Agendar** → escolher o **Tipo da Audiência** → **Manual** — e
para na tela **Agendar Audiência de …**, onde **você continua à mão**
(data, horário, sala etc.). A extensão **não agenda** a audiência.

**Onde fica:** no cabeçalho do processo, na linha **Audiência**, logo depois
do link **Agendar**, aparece uma **⭐**. Ela aparece em qualquer aba do
processo.

**Gravar uma preferência:**

1. Clique na **⭐** da linha **Audiência** e em **+ Nova preferência**.
2. Abre-se a tela **Agendar Audiência** do Projudi, com o aviso amarelo
   "Gravando preferência".
3. Escolha o **Tipo da Audiência** (e a **Vara**, se houver mais de uma) e
   clique em **Manual**.
4. A extensão pede o **nome da preferência** (já vem sugerido o nome do
   tipo escolhido). Digite o nome e clique em **OK**.
5. A preferência é gravada e o Projudi segue para a tela **Agendar
   Audiência de …**, com o aviso verde "Preferência … gravada". Continue o
   agendamento normalmente — ou clique em **Voltar**, se só queria gravar a
   preferência.

Se você clicar em **Cancelar** na hora do nome, nada é gravado e a tela
continua como estava (o próximo clique em **Manual** segue normalmente).

**Usar a preferência:**

1. Clique na **⭐** da linha **Audiência** e no nome da preferência.
2. Se o processo tiver juntadas ou conclusão pendentes no quadro
   **Pendências**, a extensão pergunta antes se deve dispensá-las ou
   finalizá-la, como em toda preferência ([7.2](#cap-7-2)).
3. A extensão abre a tela **Agendar Audiência**, escolhe o tipo gravado e
   clica em **Manual** sozinha.
4. Você chega à tela **Agendar Audiência de …**, com o aviso verde
   "… aplicada. Continue o agendamento nesta tela." Daqui em diante, é
   com você.

**Bom saber:**

- A preferência só escolhe o tipo (e a vara) e clica em **Manual**: nada é
  agendado nem gravado no processo até você terminar o agendamento na tela
  seguinte.
- Se o tipo gravado **não existir** na tela de agendamento deste processo,
  a extensão para, avisa e deixa você escolher à mão.
- Se a vara gravada não aparecer na tela, a extensão mantém a que o
  Projudi mostrou e avisa na tela seguinte.
- Se o Projudi não sair da tela depois do **Manual** (por exemplo, por
  uma mensagem dele), a extensão avisa; confira a tela e clique em
  **Manual** de novo.
- As mesmas preferências aparecem em **⭐ Minhas Preferências**, no bloco
  **Agendar Audiência** ([7.3](#cap-7-3)), e podem entrar nos **🔗
  Combos** ([7.4](#cap-7-4)). No combo, a etapa abre o agendamento e o
  combo espera você voltar à tela do processo para seguir.
- Para apagar uma preferência, use **🗑** ao lado dela. As preferências
  entram no **⬇ Exportar** do Menu da extensão ([2.6](#cap-2-6)).
- Pode ser desligada no Menu ([2.6](#cap-2-6)): **Agendar Audiência
  (preferências)**, no grupo *Ações rápidas e atalhos*.

---

<a id="cap-9"></a>
## 9. Telas de análise, mesas e cumprimentos

<a id="cap-9-1"></a>
### 9.1 Filtro por Sequencial na Análise de Decurso de Prazo

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
normal — com ele vazio, a lista inteira aparece numa só página
([9.13](#cap-9-13)).

<a id="cap-9-2"></a>
### 9.2 Listas de tarefas

**Onde fica:** telas **Análise de Juntadas**, **Retorno de Conclusão** e
**Análise de Decurso de Prazo** (listas de Intimação, Auxiliares da Justiça
e Citações/Notificações), e nas telas de cumprimentos **Expedir
Intimações**, **Expedir Citação**, **Expedir Notificação**, **Expedir
Intimações de Auxiliares da Justiça**, **Demais Cumprimentos** (nesta,
qualquer que seja o **Tipo de Cumprimento** escolhido na busca) e
**Mandados** (lista de expedição de mandados).

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

**Bom saber:** as marcações seguem o **número do processo** (valem em
todas essas telas), ficam só no seu navegador e aparecem em todas as abas
abertas.

<a id="cap-9-3"></a>
### 9.3 Minhas Preferências na linha do processo (⭐)

**Para que serve:** executar uma preferência ou combo num processo direto
da tela de análise ou de cumprimentos, sem abri-lo — ou em vários
processos marcados, **em lote**.

**Onde fica:** nas mesmas telas das listas de tarefas ([9.2](#cap-9-2)).

**Passo a passo:**

1. Clique no **⭐** da linha (ao lado do **+**).
2. Escolha um card.
3. Nas telas de análise, a extensão pergunta, conforme a tela, se deve
   antes **dispensar as juntadas**, **finalizar a conclusão** ou
   **dispensar os decursos** pendentes do processo. **Sim** acrescenta
   essa etapa; **Não** segue sem ela; **✕** (ou Esc) cancela tudo. Nas
   telas de cumprimentos, a extensão primeiro olha o quadro Pendências do
   processo e só pergunta pelo que houver: **dispensar as juntadas**
   pendentes e/ou **finalizar a conclusão** (linha "Retorno de
   Conclusão"). Sem pendências, a preferência abre direto.
4. O diálogo abre preenchido no popup; confira e clique em ✅ **Sim,
   executar**.
5. A linha mostra o andamento e o resultado, ex.: "✅ Juntada(s) já
   dispensada(s) · ★ Remessa MP: concluída".

**Bom saber:**

- A lista **não** é recarregada ao final, para não perder a busca feita.
- Preferências avulsas de **Juntar Documento**, **Alvará Eletrônico** e
  **Advogados** aparecem esmaecidas (use-as na tela do processo).
- Combos com essas etapas (ou com etapas de **✏️ Alterar Classe/Assuntos**
  ou de **📍 Localizador**) abrem o processo numa **nova aba** e rodam lá;
  o card deles tem o sinal **↗**.
- Os cards ficam em blocos, um por ação, como em **⭐ Minhas
  Preferências** ([7.3](#cap-7-3)), mas sem os botões ✏️ e 🗑.
  O nome aparece inteiro (se for comprido, continua na linha de baixo).
  Nos cards do **Analisar (Pré-Análise)** e do **Analisar Decurso**, o que
  a preferência faz (ex.: "Analisar · postergar assinatura") fica numa
  linha em cima, e o nome da preferência na linha de baixo.

**Com muitas preferências:**

- O card **⭐** cabe sempre na tela: quando as preferências não cabem, ele
  rola por dentro (use a rodinha do mouse sobre ele). Não é preciso
  diminuir o zoom do navegador.
- O **topo** do card fica parado enquanto os cards rolam. Nele estão:
  - o campo **🔍 Buscar preferência** (a partir de 6 preferências): digite parte do nome (ou do nome da
    ação, ex.: "remessa") e só os cards que o contêm continuam à vista; não
    precisa de acento nem de maiúsculas. Apague o texto para ver todos de
    novo;
  - nas listas com as seções **📝 Analisar (Pré-Análise)** ([9.11](#cap-9-11))
    ou **📝 Analisar Decurso** ([9.10](#cap-9-10)), o botão **+ Nova ·
    Analisar (Pré-Análise)** ou **+ Nova · Analisar Decurso**, que faz o
    mesmo que o card **+ Nova preferência** do fim da seção.
- No **Retorno de Conclusão**, o **Sim** finaliza a conclusão pela linha
  **"Retorno de Conclusão"** do quadro Pendências do processo (a mesma do
  botão **Finalizar conclusão** da capa). Se o processo não tiver essa
  linha, a extensão segue o **Analisar** da tela "Dados da Conclusão". Se
  mesmo assim não houver o botão **Finalizar Conclusão Pendente**, a linha
  avisa quais botões a tela tem, e a preferência abre do mesmo jeito.
- Um card por vez.

**Em lote (vários processos de uma vez):**

Em todas as telas que têm a **⭐** (Análise de Juntadas, Retorno de
Conclusão, Análise de Decurso de Prazo e telas de cumprimentos), cada linha tem também uma
**caixinha de marcar** (com contorno laranja), logo abaixo do **+** da primeira coluna (na lista
de **Mandados**, abaixo do semáforo). Acima da tabela aparece a barra
**⭐ Em lote**.

1. Marque os processos (ou use **marcar todos**, que marca os que estão
   aparecendo na tabela). A barra mostra quantos estão marcados.
2. Clique em **⭐ Executar preferência nos marcados** e escolha o card —
   os mesmos da **⭐** da linha.
3. A pergunta sobre **dispensar as juntadas**, **finalizar a conclusão**
   ou **dispensar os decursos** é feita **uma vez só** e vale para todos
   os marcados. Nas telas de cumprimentos, a pergunta é se deve dispensar
   as juntadas e finalizar a conclusão nos processos que tiverem essas
   pendências; os que não tiverem seguem direto.
4. Antes de começar, uma janela mostra **a lista dos processos** que
   serão afetados (até 25 números; acima disso, "… e mais N"), a
   preferência ou combo escolhido e, se você respondeu **Sim**, o que será
   feito automaticamente antes em cada um (dispensar juntadas, finalizar a
   conclusão ou dispensar decursos). Confira e clique em **OK** —
   **Cancelar** não executa nada.
5. A extensão passa pelos processos **um de cada vez**: a linha da vez fica
   destacada e o popup dela abre já preenchido. Confira e clique em ✅
   **Sim, executar** — cada processo continua pedindo a sua confirmação.
   Fechar o popup sem executar pula aquele processo.
6. A barra mostra "Processo 2 de 5…" e, no fim, o resumo (ex.: "Lote
   concluído: 4 executado(s) · 1 não executado(s)").

- Cada processo executado é **desmarcado**; os que não foram executados
  **continuam marcados**, para você repetir só com eles.
- **O lote para no primeiro erro.** Se um processo der erro (por
  exemplo, não foi possível abri-lo ou fazer a dispensa antes), a extensão
  **não segue** para os próximos: eles não são tocados e continuam
  marcados. Um aviso diz em qual processo houve o erro e quantos já tinham
  sido executados; a mensagem do erro fica na linha do processo. Confira e
  rode o lote de novo. Fechar o popup **não** é erro: só pula o processo.
- **⏹ Parar lote** não abre os próximos processos (o que estiver aberto
  continua até você confirmar ou fechar).
- Em lote não rodam os combos que abrem o processo numa **nova aba**
  (aparecem esmaecidos): eles abririam uma aba por processo.
- Se você usar o filtro da legenda das listas de tarefas, só os processos
  que estão aparecendo entram no lote.

<a id="cap-9-4"></a>
### 9.4 Mesa do Analista sem itens zerados

**Como funciona:** na **Mesa do Analista** e na **Mesa do Escrivão**, as
linhas cujos contadores estão **todos em zero** ficam ocultas. Em "Outros
Cumprimentos", uma linha só some se todas as colunas (Para Expedir, Com
Urgência, Para Assinar…) estiverem zeradas. Quando surge pendência, a linha
reaparece sozinha.

<a id="cap-9-5"></a>
### 9.5 RG e CPF das partes nos cumprimentos

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

<a id="cap-9-8"></a>
### 9.8 Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões, nos Cumprimentos, no Expedir e nos Paralisados

**Para que serve:** conferir o processo — cabeçalho e **Movimentações** —
sem sair da lista de decursos, de juntadas, de conclusões, de cumprimentos, do
Expedir Intimações/Citação ou de processos paralisados e sem abrir outra aba.

**Onde fica:**

- menu **Decurso de Prazo**, nas listas **Intimação**, **Intimação —
  Auxiliares da Justiça** e **Citações/Notificações**;
- lista da **Análise de Juntadas** (a relação de juntadas pendentes);
- lista de **Conclusões** (Retorno de Conclusão);
- listas de cumprimentos: **Demais Cumprimentos** e **Mandados**. Na tela de
  um cumprimento aberto (**Visualizar**), o número continua como sempre;
- listas **Expedir Intimações** e **Expedir Citação**;
- lista de **Processos Paralisados**.

**Passo a passo:**

1. Pare o mouse sobre o **número do processo** (coluna **Processo**).
2. Em menos de um segundo, a tela do processo abre num painel sobre a lista,
   **já na aba Movimentações** (enquanto carrega aparece "Carregando o
   processo…" e, se preciso, "Abrindo a aba Movimentações…").
3. Role e use a tela dentro do painel normalmente — inclusive a
   pré-visualização de documentos ([3.1](#cap-3-1)).
4. Para fechar: tire o mouse do número e do painel, clique em **✕** ou tecle
   **Esc**.

Na lista de **Conclusões** o número do processo não é um link (no Expedir
Intimações/Citação, às vezes também não): mesmo assim, basta parar o mouse
sobre ele. O painel mostra "Localizando o
processo…" por um instante enquanto a extensão descobre qual é o processo e,
em seguida, abre a tela dele. Nas Conclusões, o **Analisar** da mesma linha
continua mostrando o documento do Juiz ([9.9](#cap-9-9)).

**Bom saber:**

- **📌 Fixar** mantém o painel aberto mesmo tirando o mouse; ele então só
  fecha no **✕** (ou em **Esc**). Clique de novo para desafixar.
- **Abrir em nova aba ↗** abre o processo do jeito tradicional. Clicar no
  número continua funcionando como sempre.
- A lista **não muda**: nada é dispensado, juntado nem analisado ao abrir o
  painel.
- Dentro do painel não aparecem a balança do Menu, os cards dos sistemas do
  CNJ nem a barra de botões da extensão — eles ficam só na tela principal.

<a id="cap-9-9"></a>
### 9.9 Documento do Juiz ao passar o mouse no Retorno de Conclusão

**Para que serve:** ler o despacho, a decisão ou a sentença que o Juiz fez
sem sair da lista **Retorno de Conclusão**. Sem a extensão, seria preciso
clicar em **Analisar** (tela **Dados da Conclusão**), de novo em **Analisar**
(tela **Movimentar Processo**) e só então abrir o arquivo da linha
**Documentos**.

**Onde fica:** lista **Retorno de Conclusão**, no botão **Analisar** de
cada linha.

**Passo a passo:**

1. Pare o mouse sobre o **Analisar** da linha do processo.
2. Aparece uma janela com "Procurando o documento da conclusão…" e, em
   seguida, o documento que o Juiz fez — o mesmo da linha **Documentos**
   (colunas Descrição, Assinado Por, Arquivo e Nível de Sigilo) da tela
   **Movimentar Processo**. Os arquivos das **Movimentações Realizadas**,
   mais abaixo naquela tela, não aparecem.
3. Se a conclusão tiver **mais de um arquivo**, abre **uma janela para cada
   um**, em cascata. O título de cada janela começa pelo número do arquivo
   ("1/3", "2/3"…), que aparece também na faixa das janelas de trás.
   - Para ver outro arquivo, **clique na janela de trás** (na faixa do
     título ou na parte que aparece do documento): ela passa para a frente.
   - O **✕** fecha **só aquela janela**; as outras continuam abertas. O ✕ da
     última fecha tudo.
4. Para fechar todas de uma vez: tire o mouse do **Analisar** e das janelas
   ou tecle **Esc**.

**Bom saber:**

- **📌 Fixar** mantém as janelas abertas mesmo tirando o mouse; elas então
  só fecham no **✕** (ou em **Esc**). Clique de novo para desafixar.
- **Abrir em nova aba ↗** abre o documento numa aba própria. Clicar no
  **Analisar** continua abrindo a tela **Dados da Conclusão** como sempre.
- A lista **não muda**: nada é analisado nem finalizado ao abrir as janelas.
- Se a linha **Documentos** não tiver arquivo, a janela avisa "Nenhum
  documento encontrado…"; clique em **Analisar** para ver a tela completa.
- Passar o mouse de novo na mesma linha abre mais rápido: o documento já
  encontrado é lembrado enquanto a lista estiver aberta.

<a id="cap-9-10"></a>
### 9.10 Analisar e Dispensar decurso na lista

**Para que serve:** usar os botões **Analisar Decurso** e **Dispensar** da
tela da intimação sem precisar abri-la — direto na lista de decursos.

**Onde fica:** menu **Decurso de Prazo** (listas **Intimação**,
**Intimação — Auxiliares da Justiça** e **Citações/Notificações**), na
coluna **Processo / Seq.**, logo abaixo do sequencial, em cada linha
**aguardando análise do decurso de prazo**. Na lista **Intimação —
Auxiliares da Justiça**, essas linhas são as que mostram, na coluna
**Situação**, "Decurso de prazo em" seguido da data (é o que aparece com o
Status **Analisar Decurso de Prazo**).

**Dispensar:**

1. Clique em **Dispensar** na linha.
2. A extensão abre a intimação escondida, clica no **Dispensar** do Projudi
   e responde **OK** à pergunta "Confirma a dispensa de análise de Decurso
   de Prazo?" — sozinha.
3. A linha mostra **"Decurso de prazo dispensado com sucesso"** e os botões
   saem dela. Você continua na lista.

**Analisar Decurso:**

1. Clique em **Analisar Decurso** na linha. Aparece um menu:
   - **Abrir a análise** — a tela "Analisar Decurso de Prazo" abre num
     popup, para você fazer tudo como de costume;
   - **+ Nova preferência** — a análise abre no popup e a extensão grava o
     que você fizer na inclusão do arquivo: clique em **Adicionar**,
     escolha o Tipo do Arquivo e o Modelo, clique em **Digitar Texto**,
     escreva e continue. No **Assinar Arquivos**, ela pede um **nome** e
     salva a preferência (o assinador segue normalmente);
   - **Preferências de Analisar Decurso** — as que você criou aqui, com
     **✏️** (editar: abre a análise já preenchida, sem avançar sozinha, e
     atualiza a preferência no "Assinar Arquivos") e **🗑** (remover);
   - **Do 📎 Juntar Documento** — as preferências do Juntar Documento
     ([8.2](#cap-8-2)) também servem aqui (Tipo do Arquivo, Modelo e
     texto).
2. Escolhendo uma preferência, a extensão abre a análise no popup, clica em
   **Adicionar** e inclui o arquivo com ela. Você só **assina** no
   assinador; depois ela clica em **Confirmar Inclusão** e em **Concluir**.
3. Ao terminar, o popup fecha sozinho, os botões saem da linha e ela
   mostra **"Análise do decurso concluída com ★ nome"**.

As preferências do Analisar Decurso também estão no card **⭐** da linha,
na seção **📝 Analisar Decurso** (com **+ Nova preferência**, ✏️ e 🗑).
Com muitas preferências, o menu do **Analisar Decurso** rola por dentro e
o título, **Abrir a análise**, **+ Nova preferência** e a busca **🔍
Buscar preferência** ficam parados no topo ([7.8](#cap-7-8)).

**Em lote** (vários processos de uma vez):

1. Marque os processos na caixinha de cada linha (ou **marcar todos**), na
   barra **⭐ Em lote** acima da tabela ([9.3](#cap-9-3)).
2. Na mesma barra, clique em:
   - **Dispensar nos marcados** — confira a janela, que mostra **a lista
     dos processos** que serão dispensados (até 25 números; acima disso,
     "… e mais N"), e clique em **OK** (**Cancelar** não faz nada); a
     extensão dispensa um processo de cada vez, sozinha;
   - **Analisar decurso nos marcados** — escolha a preferência; a análise
     abre no popup para cada processo, um de cada vez, e você **assina
     cada documento**. As mesmas preferências também aparecem no
     **⭐ Executar preferência nos marcados**, na seção **📝 Analisar
     Decurso**.
3. Cada linha mostra o seu resultado e o processo feito é desmarcado.
   **⏹ Parar** não começa os próximos (o atual termina). Processos que não
   aguardam análise do decurso são pulados.
4. **O lote para no primeiro erro.** No **Dispensar nos marcados**,
   qualquer processo que não pôde ser dispensado interrompe o lote; no
   **Analisar decurso nos marcados**, só um erro de verdade (por exemplo,
   o processo não abriu) — fechar o popup apenas pula o processo. Os
   processos seguintes não são tocados e continuam marcados, e um aviso
   diz em qual processo houve o erro e quantos já tinham sido feitos.
   Confira a mensagem na linha do processo antes de repetir.

**Bom saber:**

- A lista **não** é recarregada: atualize-a (Filtrar) quando quiser ver a
  situação nova.
- Se nenhum dos processos marcados aguardar análise do decurso (já
  analisados ou dispensados), os botões do lote avisam isso ao clicar.
- A confirmação aceita sozinha é **só** a da dispensa do decurso; qualquer
  outra pergunta faz a extensão parar, sem dispensar.
- Se algo não der certo, a linha avisa o motivo (ex.: o botão **Dispensar**
  não estava disponível) e nada é feito às cegas.
- Na análise com preferência, se o botão final aparecer com outro nome que
  não **Concluir**, a extensão para e pede que você clique nele e feche o
  popup — no lote, o próximo processo só começa depois disso.
- O PIN da assinatura **nunca** é guardado.
- O texto gravado é a **versão final** do documento no momento em que
  você clicou em **Continuar** — com ou sem alterações no texto do Modelo.
  Ao usar a preferência, a extensão refaz essa versão e clica em
  **Continuar** sozinha. Preferências antigas, gravadas sem passar pelo
  Continuar, param no "Digitar Documento" para você digitar; para
  regravá-las, use **✏️**.
- Um decurso (ou um lote) por vez.

<a id="cap-9-11"></a>
### 9.11 Analisar (Pré-Análise) dos cumprimentos com preferências

**Para que serve:** fazer o **Analisar** (Pré-Análise) de um cumprimento —
por exemplo, um ALVARÁ ou um mandado — com um texto pronto, sem abrir o cumprimento,
anexar os documentos de um movimento do processo (ex.: a decisão de
**Concedida a Medida Protetiva**) e deixar a assinatura **postergada** ou
para você **Assinar e Expedir**.

**Onde fica:** listas **Demais Cumprimentos** (qualquer Tipo de
Cumprimento), **Mandados** (expedição de mandados), **Expedir Intimações**
e **Expedir Citação**, no card **⭐** da linha, seção **📝 Analisar
(Pré-Análise)** — e no **⭐ Em lote**, para vários processos. Cada lista
mostra as preferências criadas nela (as gravadas antes da versão 2.30.0
aparecem em todas).

**Criar uma preferência (+ Nova preferência):**

1. No **⭐** de uma linha, clique em **+ Nova · Analisar (Pré-Análise)**,
   no topo do card (ou em **+ Nova preferência**, na seção 📝 Analisar,
   no fim do card). A Pré-Análise desse cumprimento abre num popup.
2. Escolha o **Tipo do Arquivo** e o **Modelo** (em Expedir Intimações e
   Expedir Citação há o Modelo e a **Descrição**, que também fica gravada), clique em **Digitar Texto**, escreva
   ou edite o texto do Modelo e continue, como de costume.
3. Clique em **Salvar e Concluir**.
4. Na tela do cumprimento (a última), se precisar anexar documentos do
   processo, clique em **Adicionar** (em **Documento(s) do Processo/Recurso**).
   Na janela **Seleção de Documentos**, ao lado de cada movimento aparece
   **☆ padrão**: marque o movimento cujos documentos devem ir sempre (ex.:
   **Concedida a Medida Protetiva**) — os documentos dele são marcados — e
   clique em **Selecionar**. Documentos que você marcar sem o ☆ vão só
   desta vez.
5. Clique, como sempre, em **Assinar e Expedir** ou em **Postergar
   Assinatura**. A preferência é gravada nesse clique, com o botão que você
   escolheu: **Postergar** fica gravado para ser clicado sozinho; **Assinar
   e Expedir** fica para você clicar a cada uso. Em Expedir Intimações e
   Expedir Citação, o **Prazo** (tipo e número de dias) e a caixinha
   **Usar Anexos** dessa tela também ficam gravados.
6. Dê um **nome** à preferência (se cancelar, o clique é desfeito e você
   pode clicar de novo). Pronto: ela aparece no card ⭐, com **✏️**
   (editar) e **🗑** (remover). O card mostra "+ documentos" quando a
   preferência anexa documentos.

**Usar a preferência:**

1. No **⭐** da linha, clique em **nome da preferência** (o card mostra "postergar
   assinatura" ou "você assina e expede").
2. Se o processo tiver juntadas ou conclusão pendentes, a extensão pergunta
   antes se deve dispensá-las/finalizá-la ([9.3](#cap-9-3)).
3. A Pré-Análise abre no popup e a extensão escolhe o Tipo do Arquivo e o
   Modelo, digita o texto, conclui o documento e clica em **Salvar e
   Concluir**.
4. Na tela do cumprimento, se a preferência tiver movimento padrão, ela
   clica em **Adicionar**, procura o movimento **mais recente** com esse
   nome e anexa os documentos dele. Se o movimento não existir no processo
   (ou não tiver documentos), nada é anexado e ela **não** posterga
   sozinha: destaca o botão para você conferir.
5. Com "postergar", ela clica em **Postergar Assinatura** e o popup fecha
   sozinho; senão, ela destaca **Assinar e Expedir** — clique nele e feche
   o popup.
6. A linha mostra o resultado.

**Em lote:** marque os processos, clique em **⭐ Executar preferência nos
marcados** e escolha a preferência na seção 📝 Analisar. Os cumprimentos
são feitos um de cada vez; com "postergar", seguem sozinhos até o fim.

**Bom saber:**

- A lista **não** é recarregada; atualize-a (Filtrar) para ver a situação
  nova.
- Se um passo automático falhar (ex.: o Tipo do Arquivo não existe para
  esse cumprimento), a faixa avisa e você faz esse passo à mão — a
  extensão continua do seguinte.
- Precisa das **Ações rápidas** e do **Juntar Documento** ligados no Menu
  ([2.6](#cap-2-6)).
- No **Digitar Documento**, você pode tanto escrever um texto quanto
  **editar o texto do Modelo** (apagar trechos, negrito, itálico): as
  edições são gravadas e refeitas em cada mandado, com os dados de cada
  processo (veja [8.2](#cap-8-2)).
- Em **Expedir Intimações** e **Expedir Citação**, anexar documentos por
  movimento padrão ainda não está disponível (a tela final usa
  "Selecionar Arquivos", diferente do "Adicionar" dos mandados): anexe à
  mão, se precisar, antes de clicar em Assinar e Expedir ou Postergar.
- Na lista de **Mandados**, se a tela final do mandado não mostrar
  **Postergar Assinatura** nem **Assinar e Expedir**, a extensão não faz
  nada nela: termine o mandado à mão e feche o popup.

<a id="cap-9-12"></a>
### 9.12 Localizador na lista de juntadas e de conclusões (Projudi)

**Para que serve:** ver, já na lista, o **localizador** de cada processo e
trocá-lo, incluir outro ou tirar um que não serve mais, sem abrir o
processo. A extensão lê a linha **Localizadores:** da aba **Informações
Gerais** do processo e faz as alterações pela tela **Histórico de
Localizadores** (a que abre ao clicar nessa linha).

**Onde fica:** nas listas **Análise de Juntadas** e **Retorno de
Conclusão** do Projudi, numa coluna nova, **Localizadores**, a última da
tabela (depois de **Outras**, na Análise de Juntadas). Em cada linha, a
coluna mostra **📍** com o que consta em **Localizadores:** na aba
Informações Gerais (por exemplo, **Localizador não cadastrado**, quando o
processo não tem nenhum), seguido de dois botões:

| Onde clicar | O que faz |
|---|---|
| **No próprio localizador** | Ao pousar o mouse aparece **Remover do processo** (e o **⊗**); clicando, a extensão pergunta "Remover o localizador … do processo …?" e, com **OK**, tira-o do processo |
| **✏️** | Abre o painel **📍 Localizadores** do processo, para trocar, incluir ou remover localizadores |
| **↻** | Lê de novo o localizador do processo (por exemplo, depois de alterá-lo no próprio Projudi) |

**Passo a passo:**

1. Abra a lista. Na coluna **Localizadores**, cada linha mostra
   **📍 aguardando…** e, logo depois,
   **lendo…**: a extensão consulta os processos **em segundo plano**, **três
   ao mesmo tempo**, de cima para baixo, e mostra o que está na linha
   **Localizadores:** da aba Informações Gerais. Se a linha não trouxer
   nada, aparece **sem localizador**. Você pode continuar
   trabalhando na lista enquanto isso.
2. Para trocar ou incluir, clique no **✏️** da linha. O painel abre o
   **Histórico de Localizadores** do processo em segundo plano e mostra:
   - **No processo:** os localizadores em aberto, cada um com **✖**;
   - a caixa **Baixar demais localizadores em aberto (trocar)** — a mesma
     do Projudi, que já vem marcada. Marcada, o localizador escolhido
     **substitui** os que o processo tem (**Trocar por**, botões **🔁**);
     desmarcada, ele é **acrescentado** (**Incluir**, botões **➕**);
   - os **localizadores ativos** da tela Histórico de Localizadores (a
     mesma lista do campo **Localizador** dessa tela), com **Pesquisar
     localizador...**.
3. Clique no localizador desejado. A extensão faz o mesmo que você faria na
   tela Histórico de Localizadores: escolhe o localizador, deixa a caixa
   **Baixar demais localizadores em aberto** como você deixou no painel e
   clica em **Adicionar**. O painel avisa o resultado e a linha da lista já
   mostra o localizador novo.
4. Para remover, clique no **✖** do localizador no painel e responda
   **OK**: a extensão clica no **Remover** da linha dele no Histórico de
   Localizadores (e responde à confirmação do Projudi, se houver).
5. Feche o painel no **✕**, com **Esc** ou clicando fora dele.

**Remover um localizador direto na lista:** clique no nome dele na coluna
**Localizadores** (ao pousar o mouse, aparece **Remover do processo**) e responda
**OK** em "Remover o localizador … do processo …?". A extensão abre o
Histórico de Localizadores em segundo plano, clica no **Remover** e a
linha mostra o resultado (**✅** ou **⚠**).

**Bom saber:**

- Para ligar ou desligar, use **Localizador na lista (Projudi)** no Menu da
  extensão ([2.6](#cap-2-6)).
- Com **Listas em uma única página** ligada ([9.13](#cap-9-13)), as linhas
  trazidas das outras páginas também ganham a coluna **Localizadores** e
  são lidas do mesmo jeito.
- No **Retorno de Conclusão** a linha da lista não tem o link do processo:
  a extensão o encontra pela tela do **Analisar** ou pesquisando o número,
  o que pode levar alguns segundos a mais.
- O que foi lido fica guardado por **10 minutos** na aba: voltar a uma
  página da lista já vista mostra os localizadores na hora. Use o **↻**
  para ler de novo antes disso.
- Depois da primeira leitura, a extensão sabe o caminho direto para a aba
  Informações Gerais de cada processo (enquanto a aba do navegador estiver
  aberta): o **↻** e a leitura depois de uma troca ficam mais rápidos.
- A extensão confere se cada resposta do Projudi é mesmo do processo da
  linha. Se vier a de outro processo, ela lê aquele processo de novo,
  sozinho; se isso acontecer duas vezes na mesma página, ela passa a ler
  um processo de cada vez até você recarregar a lista.
- Para alterar, o perfil precisa ter acesso à tela Histórico de
  Localizadores (o link da linha **Localizadores:** precisa aparecer na aba
  Informações Gerais). Sem ele, o painel avisa.
- **⚠ não foi possível ler** (passe o mouse para ver o motivo) aparece
  quando o processo não abriu — por exemplo, se a sessão do Projudi
  expirou. Use o **↻** para tentar de novo.
- Se o painel disser que **não deu para confirmar** a alteração, use o
  **↻** da linha para conferir. Se não for possível remover, o painel
  mostra **📋 Copiar diagnóstico**: ele copia como a tabela do Histórico de
  Localizadores aparece (só localizadores, datas e quem cadastrou), para
  você enviar a quem cuida da extensão.
- Enquanto o painel está aberto, a leitura das demais linhas espera; ela
  continua quando você o fecha.

<a id="cap-9-13"></a>
### 9.13 Listas em uma única página (Juntadas, Conclusões, Mandados, Intimações, Multas FUPEN e Juiz das Garantias)

**Para que serve:** ver **todos** os registros de uma lista do Projudi numa
só tela, sem precisar clicar em **Próxima Página** e voltar a cada vez.
Fica mais fácil percorrer a fila inteira, usar **Ctrl+F** para achar um
processo e marcar vários registros de páginas diferentes para a **Análise
Múltipla** ou o **Dispensar**.

**Onde fica:** nestas listas do Projudi, sempre que elas têm mais de uma
página. Não há botão: a extensão faz isso sozinha.

| Lista | O total aparece como |
|---|---|
| **Análise de Juntadas** | Todas as juntadas em uma única página… |
| **Conclusões** (Retorno de Conclusão) | Todas as conclusões em uma única página… |
| **Mandados** (por exemplo, os mandados retornados) | Todos os mandados em uma única página… |
| **Expedir Intimações** | Todas as intimações em uma única página… |
| **Intimação** (decurso de prazo) | Todas as intimações em uma única página… |
| **Intimação de Auxiliares da Justiça** | Todas as intimações em uma única página… |
| **Listagem de Multas - Sistema FUPEN** | Todas as multas em uma única página… |
| **Processos com suspeita de incompetência - Juiz das Garantias** | Todos os processos em uma única página… |

**Passo a passo:**

1. Abra a lista (ou clique em **Filtrar**, ou em um título de coluna para
   ordenar). O Projudi mostra a primeira página, como sempre.
2. Logo abaixo da navegação de páginas aparece **Reunindo todas as páginas
   nesta tela… buscando a página 2**: a extensão traz, uma a uma, as
   páginas seguintes, com os **mesmos filtros e a mesma ordenação** que
   você escolheu. Você já pode trabalhar na lista enquanto isso.
3. Os registros de cada página entram **no fim da mesma tabela**, na ordem
   do Projudi. Ao terminar, no lugar da navegação de páginas aparece o
   total, por exemplo **Todas as juntadas em uma única página: N
   registro(s) (P páginas do Projudi reunidas)**.
4. Use a lista normalmente:
   - o **+** de cada linha mostra os arquivos, em qualquer página de
     origem: ao clicar, aparece **Carregando os arquivos…** e, em um ou dois
     segundos, a lista de arquivos (veja **Bom saber**);
   - na **Análise de Juntadas**, a
     caixa do título marca todas, e **Análise Múltipla**, **Analisar** e
     **Dispensar** valem para as juntadas marcadas de qualquer página;
   - nas **Conclusões**, o **Analisar** de cada linha e a **Análise
     Múltipla** funcionam como sempre;
   - nos **Mandados**, o link da data (coluna **Ordenação**) e o botão
     **Analisar Retorno** de cada linha também;
   - no **Expedir Intimações**, o **Visualizar** de cada linha abre a
     intimação; nas listas de **decurso de prazo** (Intimação e
     Auxiliares da Justiça), os botões **Analisar Decurso** e
     **Dispensar** da linha ([9.10](#cap-9-10)) também aparecem nas
     intimações trazidas das outras páginas;
   - nas **Multas FUPEN**, o **Código FUPEN** de cada linha abre a multa;
     no **Juiz das Garantias**, o número abre o processo.

**Bom saber:**

- Para ligar ou desligar, use **Listas em uma única página** no Menu da
  extensão ([2.6](#cap-2-6)). Desligada, as listas voltam a ser mostradas
  em páginas, como no Projudi.
- Na lista **Intimação** (decurso de prazo), se você preencher o campo
  **Sequencial** e clicar em **Filtrar**, quem percorre as páginas é o
  próprio filtro ([9.1](#cap-9-1)): a tabela mostra só os processos com
  aquele dígito, de todas as páginas. Com o campo vazio, a lista inteira
  vem numa só página.
- Na lista de Mandados, o seletor **30/50/100/500 por pág.** do Projudi
  some junto com a navegação, porque todos os mandados já estão na tela.
- As outras funções da extensão na lista (**⭐**, **📍** localizador,
  listas de tarefas, processo ou documento do Juiz ao passar o mouse,
  **Analisar Retorno**, RG e CPF das partes) também aparecem nos registros
  trazidos das outras páginas, alguns instantes depois.
- **Arquivos do +:** depois que a extensão traz as outras páginas, o
  Projudi passa a "estar" na última delas, e o **+** do próprio Projudi
  abriria vazio. Por isso, nas listas reunidas, quem atende o **+** é a
  extensão. Nas listas de intimação (**Expedir Intimações**, **Intimação**
  e **Auxiliares da Justiça**) ela pede os arquivos direto ao Projudi,
  pela própria movimentação, e eles aparecem quase na hora. Na **Análise
  de Juntadas**, ela abre, sem você ver, a página de onde a linha veio,
  clica no **+** da mesma linha ali e copia os arquivos para a sua tela: o
  primeiro **+** de cada página demora um pouco mais; os seguintes da
  mesma página, menos. O **Expandir Mov** também funciona (abre os de uma
  mesma página juntos). Se aparecer **Não foi possível trazer os
  arquivos**, clique no **+** de novo; se a lista tiver mudado (alguém
  analisou a juntada, por exemplo), recarregue a lista (F5).
- Linhas de processos em **Segredo de justiça** (que o Projudi mostra sem
  dados) também são trazidas, mesmo quando várias são iguais.
- Com muitos registros (centenas), a lista leva alguns segundos a mais
  para ficar completa. A extensão reúne até **100 páginas**.
- Se alguma página não puder ser trazida (por exemplo, se a sessão do
  Projudi expirou), aparece em vermelho **Não foi possível trazer as
  páginas seguintes** e a navegação de páginas do Projudi continua no
  lugar, para você seguir à mão. Recarregue a lista (F5) para tentar de
  novo.
- Nos registros trazidos das outras páginas, alguns ícones que dependem do
  próprio Projudi (como o semáforo e o ícone de copiar o número do
  processo) podem não responder ao clique. Os demais recursos da linha
  funcionam normalmente.

---

<a id="cap-9-14"></a>
### 9.14 Processos Paralisados (+90 dias) na tela Início

**Para que serve:** saber, logo ao entrar no Projudi, quantos processos
estão parados na Secretaria **há mais de 90 dias**, sem precisar abrir a
**Busca por Processos Paralisados**, trocar o número de dias e pesquisar.

**Onde fica:** na tela **Início** do Projudi, numa linha nova, **Processos
Paralisados (+90 dias):**, logo abaixo da linha do próprio Projudi
**Processos Paralisados (+30 dias):**.

**Passo a passo:**

1. Abra a tela **Início**. Na linha **Processos Paralisados (+90 dias):**
   aparecem **Secretaria: …**, **Em Remessa: …** e **Em Remessa (exceto
   processos conclusos): …** enquanto a extensão faz a contagem.
2. Em instantes, no lugar das reticências, aparecem os totais, um de cada
   vez, em vermelho e sublinhados, como os números da linha de cima. Cada
   um é o mesmo número que você veria clicando no total correspondente da
   linha **(+30 dias)**, trocando **Mínimo de dias paralisado** para **91**
   e clicando em **Pesquisar** (o "N registro(s) encontrado(s)" da lista).
3. Clique num número para abrir a **Busca por Processos Paralisados** já
   pesquisada com **91** dias, com a lista desses processos (na
   Secretaria, em remessa ou em remessa exceto conclusos, conforme o
   número clicado). Com **Ctrl** apertado, ela abre em outra aba.

**Bom saber:**

- Os totais não usam filtro de prioridade, classe ou localizador. O
  total de **Razões Externas** da linha de cima não é repetido na linha de
  +90 dias.
- A contagem é refeita **toda vez** que a tela Início é aberta ou
  recarregada — inclusive quando você **troca de atuação** (área de
  atuação/competência): os números são sempre os da atuação em que você
  está.
- Se o Projudi não responder, aparece **não disponível** no lugar do
  número que não pôde ser contado; basta voltar à tela Início mais tarde.
- Para ligar ou desligar, use **Processos Paralisados (+90 dias) na tela
  Início** no Menu da extensão ([2.6](#cap-2-6)).

---

<a id="cap-9-15"></a>
### 9.15 Totais da Mesa do Escrivão Criminal na Análise de Juntadas

*Só nas varas que têm a aba **Mesa do Escrivão Criminal**.*

**Para que serve:** ver, junto com as juntadas e os demais itens do dia,
quantos processos estão em três quadros da aba **Mesa do Escrivão
Criminal** que não mostram número (é preciso clicar neles para ver a lista
e o total):

- **Feitos sem infração penal** — feitos ativos sem infração penal
  anotada;
- **Reavaliação da prisão provisória a cada 90 dias (Art 316, CPP)** —
  prisões provisórias que precisam ser reavaliadas;
- **Prescrições** → **Vencidas** — processos ativos com prescrição
  vencida, contados como na tela **Prescrições de processos ativos** com
  **Somente sem sentença anotada** e **Agrupar por processo** marcados.

**Onde fica:** na **Mesa do Analista Judiciário**, aba **Análise de
Juntadas**, em três linhas novas no fim do quadro **Para Realizar**:
**Feitos sem infração penal:**, **Reavaliação da prisão provisória a cada
90 dias (Art. 316, CPP):** e **Prescrições vencidas:**.

**Passo a passo:**

1. Abra a aba **Análise de Juntadas**. No fim do quadro **Para Realizar**
   aparecem as três linhas, com **…** enquanto a extensão faz a contagem.
2. Em instantes, no lugar das reticências, aparece cada total, como os
   demais números do quadro. É o mesmo número que você veria clicando no
   quadro correspondente da aba **Mesa do Escrivão Criminal** (o "N
   registro(s) encontrado(s)" da lista que abre). Nas **Prescrições
   vencidas**, é o número que aparece depois de clicar em **Vencidas**,
   marcar **Somente sem sentença anotada** e **Agrupar por processo** e
   clicar em **Pesquisar**.
3. Clique num número para abrir a lista correspondente. Com **Ctrl**
   apertado, ela abre em outra aba. Nas **Prescrições vencidas**, a tela
   **Prescrições de processos ativos** já abre pesquisada, com as duas
   caixas marcadas.

**Bom saber:**

- Se um total for **zero** e **Ocultar contadores zerados** estiver
  ligado, a linha some, como as demais linhas zeradas da Mesa.
- Para não repetir a contagem a cada volta à aba, os totais ficam
  guardados por **5 minutos** naquela aba. Depois disso (ou numa aba
  nova), a extensão conta de novo.
- As **Prescrições vencidas** podem levar alguns segundos a mais para
  aparecer: a extensão abre a aba **Mesa do Escrivão Criminal** sem
  mostrá-la, clica em **Vencidas** e faz a pesquisa, como você faria.
- Se o Projudi não responder, aparece **não disponível** no lugar do
  número; basta voltar à aba mais tarde.
- Para ligar ou desligar, use **Totais da Mesa do Escrivão Criminal na
  Análise de Juntadas** no Menu da extensão ([2.6](#cap-2-6)).

<a id="cap-9-16"></a>
### 9.16 Visual novo da Mesa do Analista (Projudi)

*Vem ligado.*

**Para que serve:** deixar a **Mesa do Analista Judiciário** mais fácil de
ler. Os números e os links são os mesmos de sempre; muda só a arrumação na
tela.

**Onde fica:** na Mesa do Analista Judiciário, em todas as abas:
**Início**, **Citações e Intimações**, **Análise de Juntadas**, **Outros
Cumprimentos**, **Lembretes**, **Cumprimentos de Medidas** e **Mesa do
Escrivão Criminal**. Vale também para a **Mesa do Magistrado** e para a Mesa
das varas de execução e de prestação pecuniária, que têm outras abas (como
**Intimações**) e outros títulos (como **Execuções Ativas**). O topo do Projudi (a barra de menus — Início,
Processos, Citações e Notificações… — e a linha **Usuário / Atribuição /
Atuação / Data**) acompanha o mesmo tom em todas as telas do Projudi.

**O que muda em cada aba:**

| Aba | Como fica |
|---|---|
| **Início** | Cada assunto num quadro: Dados do Juízo (com o nome da vara à esquerda), Processos Ativos (números grandes), Processos Paralisados (+30 dias e, se ligado, +90 dias), com um número para Secretaria, Em Remessa, Em Remessa (exceto processos conclusos) e Razões Externas, e Últimas Mensagens, com a data numa etiqueta |
| **Citações e Intimações** | **Com Urgência** no alto, ocupando a largura toda; depois um quadro para Para Conferir, Para Expedir, Para Assinar, AR Digital e Decurso de Prazo, com os números grandes. Quadro sem nada mostra **Nada pendente.** |
| **Análise de Juntadas** | À esquerda, numa coluna estreita, **Com Urgência** e **Para Realizar** (Juntadas e Retorno de Conclusão). À direita, os demais itens separados em quadros: **Retornos de cumprimento** (mandados, cartas eletrônicas, diligências…), **Multas Fupen e custas** (multas Fupen e prestações pecuniárias), **Outros** (guia de execução, comunicações recursais, Juiz das Garantias e o que mais o Projudi mostrar) e, se for o caso, **Da Mesa do Escrivão Criminal** |
| **Outros Cumprimentos** | As tabelas BNMP e Cumprimentos com o número de cada coluna numa etiqueta (vermelha para Com Urgência e Devolvido pelo Juiz) e os zeros bem claros. O título das colunas fica à vista ao rolar a tela, e as colunas aparecem agrupadas em **Andamento**, **Atenção**, **Prazos** e **AR Digital**. Itens soltos abaixo das tabelas (como **Comunicações Recursais Pendentes de Encaminhamento**) vão para o quadro **Outros pendentes** |
| **Lembretes** | Um quadro com **Data de Hoje**, **Últimos 7 dias** e **Total Ativos**, com os números grandes |
| **Cumprimentos de Medidas** | Um quadro para Atrasados (em vermelho), A Cumprir e Sem Cumprimentos |
| **Mesa do Escrivão Criminal** | Os 35 atalhos separados por assunto: Réu preso e prisões; Prazos vencidos e atrasos; Denúncia, sentença e arquivamento; Bens, fianças e valores; Cadastro incompleto; Violência doméstica; Comunicações e remessas. As opções que ficavam entre colchetes (como [Vencidas] e [A vencer]) viram botõezinhos ao lado do nome |

**Passo a passo:**

1. Abra a **Mesa do Analista Judiciário** como sempre. O visual novo já
   aparece.
2. Clique em um número ou atalho: abre a mesma lista que abria antes.
3. Em **Outros Cumprimentos**, para achar um tipo de cumprimento, digite
   parte do nome em **Filtrar cumprimento** (ex.: "edital"). A caixinha
   **Só linhas com pendência** esconde as linhas em que todas as colunas
   estão em zero; desmarque-a para ver todas.
4. Na **Mesa do Escrivão Criminal**, digite parte do nome em **Procurar
   atalho** (ex.: "fiança") para ver só os atalhos com essa palavra.

**Escolher a cor:**

- Ao lado do título **Mesa do Analista Judiciário** há seis bolinhas,
  cada uma com as duas cores do tom: **Projudi original** (padrão, as cores
  de sempre do Projudi), **Oliva fosco** (oliva mais fechado), **Areia**
  (bege de papel), **Sálvia** (verde-acinzentado), **Névoa**
  (cinza-azulado) e **Escuro suave** (quadros escuros). Clique numa delas e a tela
  troca de cor na hora.
- A mesma escolha fica no Menu (ícone da balança), em **Cor do visual da
  Mesa do Analista** ([2.6](#cap-2-6)).
- A cor fica guardada no seu navegador e vale nas próximas vezes. Ela entra
  no **⬇ Exportar** do Menu, para levar a outro computador. Cada
  computador tem a sua: a cor que você escolhe não muda a dos colegas.
- **Projudi original**, o padrão, usa as mesmas cores do Projudi: creme esverdeado no
  fundo, verde-oliva nos títulos, quadros num creme bem claro (um pouco
  mais claro que o fundo, sem o brilho do branco puro), laranja nos dados do
  usuário e vermelho puro nos números urgentes. É o mais claro de todos.
  Quem preferir menos brilho pode escolher um dos outros tons, que evitam o
  branco puro e as cores vivas para não cansar a vista. No **Escuro suave**, só os quadros da Mesa ficam escuros: o
  cabeçalho, a barra de menus, a linha do usuário e a barra de abas
  continuam claros.
- Os itens urgentes e atrasados ficam sempre em vermelho (no Projudi
  original, o vermelho puro do próprio Projudi).

**Bom saber:**

- Os números continuam se atualizando sozinhos, como antes.
- Na tela **Início**, a linha **Processos Paralisados (+90 dias)**
  ([9.14](#cap-9-14)) aparece no mesmo quadro dos paralisados +30 dias,
  logo abaixo deles, com os números do mesmo tamanho. Clicar num número
  continua abrindo a Busca por Processos Paralisados já pesquisada.
- Funciona junto com a **Mesa do Analista sem itens zerados**
  ([9.4](#cap-9-4)): com ela ligada, as linhas zeradas continuam
  escondidas. Em **Outros Cumprimentos**, desmarcar **Só linhas com
  pendência** mostra também essas linhas. A escolha da caixinha fica
  guardada.
- A barra de menus e a linha do usuário mudam só de cores e letras: os
  menus abrem e funcionam como antes.
- Para voltar à tela original do Projudi (Mesa, barra de menus e linha do
  usuário), desligue **Visual novo da Mesa do
  Analista** no Menu ([2.6](#cap-2-6)) e recarregue a página (F5).
- Na aba **Análise de Juntadas**, os totais trazidos da Mesa do Escrivão
  Criminal ([9.15](#cap-9-15)) aparecem no quadro **Da Mesa do Escrivão
  Criminal**, logo depois dos demais quadros de Para Realizar. As
  **Audiências pendentes** ([9.17](#cap-9-17)) ficam no quadro **Para
  Realizar**, logo abaixo de Juntadas e Retorno de Conclusão.
- Atalho novo que o Projudi acrescentar na Mesa do Escrivão Criminal
  aparece no quadro **Outros atalhos**; item novo da Análise de Juntadas,
  no quadro **Outros**.

---

<a id="cap-9-17"></a>
### 9.17 Audiências pendentes na Análise de Juntadas

**Para que serve:** ver, junto com as juntadas e os demais itens do dia,
quantas audiências estão **pendentes**: audiências **designadas** cuja data
já passou e que ainda não foram movimentadas (ainda sem o resultado
lançado). No Projudi, esse número só aparece abrindo **Audiências →
Listagem**, marcando **Pendentes** e clicando em **Pesquisar**.

**Onde fica:** na **Mesa do Analista Judiciário**, aba **Análise de
Juntadas**, numa linha nova no fim do quadro **Para Realizar**:
**Audiências pendentes:**.

**Passo a passo:**

1. Abra a aba **Análise de Juntadas**. No fim do quadro **Para Realizar**
   aparece a linha **Audiências pendentes:**, com **…** enquanto a extensão
   faz a contagem.
2. Em instantes, no lugar das reticências, aparece o total, como os demais
   números do quadro. É o mesmo número que você veria em **Audiências →
   Listagem**, com **Situação da Audiência: Pendentes** e **Local da
   Audiência** na sua vara (o "N registro(s) encontrado(s)" da lista).
3. Clique no número para abrir a **Listagem de Audiências** já pesquisada
   em **Pendentes**. Com **Ctrl** apertado, ela abre em outra aba. Para cada
   audiência, clique em **DESIGNADA** (coluna Situação da Audiência) para
   lançar o resultado, como de costume.

**Bom saber:**

- Audiências marcadas para hoje ou para datas futuras não entram na conta:
  só as que já deveriam ter acontecido e continuam como **designadas**.
- A contagem é refeita **toda vez** que a aba é aberta — inclusive quando
  você **troca de atuação**: o número é sempre o da atuação em que você
  está.
- Se o total for **zero** e **Ocultar contadores zerados** estiver ligado,
  a linha some, como as demais linhas zeradas da Mesa.
- No **Visual novo da Mesa do Analista** ([9.16](#cap-9-16)), a linha fica
  no quadro **Para Realizar**, junto de Juntadas e Retorno de Conclusão.
- Se o Projudi não responder, aparece **não disponível** no lugar do
  número; basta voltar à aba mais tarde.
- Para ligar ou desligar, use **Audiências pendentes na Análise de
  Juntadas** no Menu da extensão ([2.6](#cap-2-6)).

---

<a id="cap-10"></a>
## 10. Privacidade e perfis bloqueados

<a id="cap-10-1"></a>
### 10.1 O que fica guardado no seu navegador

A extensão **não tem servidor próprio**. Tudo fica no navegador/perfil onde
ela está instalada (não vai para outro computador):

| O que | Onde |
|---|---|
| Aceite dos Termos de Uso | Armazenamento da extensão |
| Preferências (inclusive de advogados), combos, ordem dos cards | Armazenamento da extensão |
| Cores de destaque e "sempre ocultar sem arquivo" | Armazenamento da extensão |
| Listas de tarefas e tarefas | Armazenamento da extensão |
| Destinatários (WhatsApp e e-mail) e remetentes | Armazenamento da extensão |
| Documentos a anexar | Só até serem anexados; se o envio for interrompido, são apagados em até 15 minutos ou ao fechar o navegador |
| Login do Outlook (modo Microsoft Graph) | Só enquanto o navegador estiver aberto (nunca gravado no computador) |
| Cards do cabeçalho, réus, RG/CPF | Só na aba atual, enquanto ela estiver aberta |

Para levar esses dados a outro computador, use **⬇ Exportar** / **⬆ Importar**
no Menu ([2.6](#cap-2-6)).

Documentos são sempre lidos do Projudi na hora; não há cópia guardada.
A senha/PIN do certificado **nunca** é guardada.

<a id="cap-10-2"></a>
### 10.2 Bloqueio para perfis de advocacia

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
| A tela do processo trava por completo (não responde a cliques, nem deixa fechar a aba) | Atualize a extensão ([2.3](#cap-2-3)). Se acontecer, a extensão desliga sozinha, em menos de um segundo, a função que causou o travamento, e a tela volta a responder; essa função só volta ao recarregar a tela (F5). Se repetir, avise quem mantém a extensão |
| O botão **Finalizar conclusão** avisa "Conclusão não enviada: Não foi encontrada uma conclusão habilitada para finalização", mas a conclusão pode ser finalizada pelo próprio Projudi | Corrigido na versão 2.55.5: atualize a extensão ([2.3](#cap-2-3)). Se o aviso continuar, abra a conclusão pelo link do quadro Pendências e confira se o botão **Finalizar Conclusão Pendente** do Projudi está habilitado ([6.2](#cap-6-2)) |
| O Projudi fica lento com a extensão (computador mais fraco ou muitas abas abertas) | Desligue no Menu as funções que você não usa: desligadas, elas não são carregadas. Para conferir se a lentidão é da extensão, desligue-a pela chave geral e abra a mesma tela ([2.6](#cap-2-6)) |
| Nenhum botão da extensão aparece | Confira se aceitou os Termos de Uso ([2.2](#cap-2-2)); recarregue a página (F5); confira se a extensão está ativada em `chrome://extensions`; confira se o perfil não é de advocacia ([10.2](#cap-10-2)) |
| Numa lista reunida em uma única página, o **+** abre vazio, sem os arquivos, ou mostra "Não foi possível trazer os arquivos: o registro não está mais na página…" | Corrigido nas versões 10 e 11: atualize a extensão ([2.3](#cap-2-3)). Ao clicar no **+**, deve aparecer **Carregando os arquivos…** e, em seguida, os arquivos. Se aparecer **Não foi possível trazer os arquivos**, clique no **+** de novo ou recarregue a lista (F5) ([9.13](#cap-9-13)) |
| Numa das listas reunidas em uma única página (Juntadas, Conclusões, Mandados, Intimações, Multas FUPEN, Juiz das Garantias) aparece "Não foi possível trazer as páginas seguintes" | A sessão do Projudi pode ter expirado ou a conexão falhou: recarregue a lista (F5). Enquanto isso, a navegação de páginas do Projudi continua funcionando ([9.13](#cap-9-13)) |
| A Mesa do Analista está com o visual novo e eu prefiro a tela original | Desligue **Visual novo da Mesa do Analista** no Menu (ícone da balança) e recarregue a página (F5) ([9.16](#cap-9-16)) |
| Atualizei a extensão e nada mudou | Clique em ↻ no card da extensão em `chrome://extensions` e depois recarregue as páginas ([2.3](#cap-2-3)) |
| A barra de botões cobre algo da tela | Arraste **↕ Mover** ou clique em **Ocultar** ([2.4](#cap-2-4)) |
| O painel de ações diz para abrir a aba Movimentações | Abra a aba **Movimentações** do processo e tente de novo ([7.1](#cap-7-1)) |
| "A movimentação … marcada não leva à ação" | Marque outro evento na aba Movimentações (um despacho/decisão costuma funcionar) ou desmarque a caixinha ([7.7](#cap-7-7)) |
| "Não localizei o movimento … na aba Movimentações" | O processo não tem movimento com o nome gravado na preferência 📌: **✅ Prosseguir** segue a regra geral, **Cancelar** não executa ([7.7](#cap-7-7)) |
| "Não encontrei o botão Alterar…" no Alterar do cabeçalho ou no Novo Valor da Causa | Seu perfil não pode alterar este processo; confira na aba **Informações Gerais** se o botão **Alterar** aparece ([8.8](#cap-8-8), [8.9](#cap-8-9)) |
| Preferência abre com "⚠ Não consegui preencher" | A opção gravada não existe neste processo; preencha o campo à mão, ou edite/recrie a preferência ([7.2](#cap-7-2)) |
| Preferência de Intimar Partes não marca as caixas certas | Grave-a de novo (preferências anteriores à versão 2.9.84) |
| Importei o arquivo de backup e nada mudou | Recarregue (F5) as páginas do Projudi abertas ([2.6](#cap-2-6)) |
| Combo parou numa etapa | Use **↻ Repetir etapa**, **⏭ Próxima etapa** ou **⏹ Parar combo** ([7.4](#cap-7-4)) |
| WhatsApp abre a conversa, mas sem anexos | Confira se o WhatsApp Web está conectado; recarregue a extensão; anexe manualmente se precisar |
| E-mail pede Client ID / dá erro de configuração | Mude o **Modo de envio** para **Automático** ou **Outlook Web** nas opções ([2.5](#cap-2-5)), ou peça o Client ID ao TI |
| WhatsApp: "O envio expirou" | Passaram-se mais de 15 minutos desde o clique em enviar: marque os documentos e envie de novo ([5.1](#cap-5-1)) |
| No Outlook Web os anexos não entram sozinhos | É o esperado nesse modo: **Anexar arquivo → Navegar neste computador** e escolha os arquivos na pasta **Downloads** |
| O campo "De" não muda para a conta escolhida | Falta a permissão "Enviar como" nessa caixa — peça ao TI ([5.3](#cap-5-3)) |
| "Verifique a conclusão" | Confira a conclusão no Projudi antes de repetir ([6.2](#cap-6-2)) |
| Os botões **Dispensar juntadas**, **Dispensar decursos** ou **Finalizar conclusão** aparecem no quadro Pendências, mas não respondem ao clique (acontecia com o zoom do navegador acima de 100%, ex.: 110%) | Corrigido na versão 4: atualize a extensão ([2.3](#cap-2-3)). Enquanto não atualiza, volte o zoom para 100% (**Ctrl+0**) |
| Dispensa de juntadas/decursos parou com erro | Clique em **Ver detalhes**, resolva no Projudi e tente de novo ([6.1](#cap-6-1), [6.3](#cap-6-3)) |
| Card de suspensão/monitoração não aparece | Só são sinalizados status **ATIVA** e os motivos listados em [4.1](#cap-4-1)/[4.2](#cap-4-2); aguarde alguns segundos após abrir o processo |
| Mandado não virou Regionalizado | Só muda se a cidade da parte for de outra comarca **e** constar em Comarca de Destino; veja a nota amarela do diálogo ([9.7](#cap-9-7)) |
| Colar processo: "Não encontrei um número de processo" | Copie o número completo (20 dígitos), só um ([8.5](#cap-8-5)) |
| Um sistema do CNJ aberto numa aba comum (por exemplo, a tela **Crianças e Adolescentes** do SNA) fica em branco, com o aviso "… está bloqueado" | Corrigido na versão 2.54.1: atualize a extensão ([2.3](#cap-2-3)) e recarregue a página do sistema (F5) |
| O popup de um sistema do CNJ fica em branco ou o login não termina | Use o botão **🖥 Segundo monitor** (ou **🗂 Nova aba**, com um monitor só) no topo do popup ([8.7](#cap-8-7)) |

Se o problema continuar, anote a versão da extensão, a tela e o que
aconteceu, e informe o responsável pela extensão.

---

<a id="anexo-a"></a>
<a id="anexo-b"></a>
## Anexo A — Histórico de versões do manual

A versão do manual acompanha a da extensão. A cada nova função ou correção
de erro na extensão, este manual ganha uma nova linha aqui (o procedimento
está em [COMO-ATUALIZAR.md](COMO-ATUALIZAR.md)).

| Versão | Data | Alterações no manual |
|---|---|---|
| 24 | 12/11/2026 | Nova seção 9.17 **Audiências pendentes na Análise de Juntadas** (só no Projudi): no fim do quadro "Para Realizar" da aba Análise de Juntadas aparece o total de audiências pendentes (designadas, com a data já passada e ainda não movimentadas), o mesmo da **Listagem de Audiências** com **Pendentes**; clicar no número abre essa lista já pesquisada. No visual novo da Mesa (9.16), a linha fica no quadro Para Realizar. Sumário e tabela da 2.6 atualizados. Novo vídeo V74 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 23 | 11/11/2026 | Visual novo da Mesa do Analista (9.16): novo tom **Projudi original**, com as cores do tema do próprio Projudi (creme esverdeado, verde-oliva, quadros num creme bem claro, laranja nos dados do usuário e vermelho puro nos urgentes), que passa a ser o **padrão** (antes, Oliva fosco). Quem já tinha escolhido um tom continua com ele. Ajustados 2.6 (Cor do visual da Mesa do Analista) e 9.16 (Escolher a cor). Vídeo V73 regravado (não citado no manual). |
| 22 | 11/11/2026 | Corrigido (seção 9.15): a linha **Prescrições vencidas** da Análise de Juntadas continuava em **não disponível**: o link **Vencidas** do quadro Prescrições não vem na página da aba Mesa do Escrivão Criminal quando ela é aberta sem ser mostrada, e o endereço desse link muda a cada vez que se entra no Projudi. Agora, se não achar o link, a extensão abre a aba Mesa do Escrivão Criminal sem mostrá-la e clica em **Vencidas**, como a pessoa faria. Novo item no Bom saber. Sem vídeo novo (a tela não mudou). |
| 21 | 10/11/2026 | Corrigido (seção 9.14): ao trocar de atuação, a linha **Processos Paralisados (+90 dias)** continuava mostrando os números da atuação anterior (os totais ficavam guardados por 5 minutos). Agora a contagem é refeita toda vez que a tela Início é aberta ou recarregada, inclusive na troca de atuação. Bom saber da 9.14 atualizado. Sem vídeo novo (a tela não mudou). |
| 20 | 09/11/2026 | Sem alteração de texto nas seções; nova descrição da extensão na lista de extensões do navegador (`chrome://extensions`): "Ações rápidas, preferências e combos no Projudi; íntegra dos documentos ao passar o mouse e envio por WhatsApp Web e Outlook.". Sem vídeo novo (a descrição não aparece nos vídeos). |
| 19 | 09/11/2026 | A extensão passa a se chamar **Assistente Projudi – Ações Rápidas e Pré-visualização** (antes, **Olirum**): título do manual, item 6 da seção 2.1 (nome na lista de extensões) e 4.5 (assunto padrão do lembrete criado pelo post-it: "Anotação compartilhada - Abra ou instale a extensão Assistente Projudi"). O aviso de versão nova (2.3) e as páginas do Manual e dos Termos de Uso mostram o nome novo. Vídeos V01, V34 e V48 regravados e guardados em `videos-do-manual/` (não citados no manual). |
| 18 | 09/11/2026 | **A extensão passa a funcionar só no Projudi.** Retiradas todas as funções do SEEU (a extensão não aparece mais no SEEU nem no SEEU de treino): o Menu não tem mais as abas PROJUDI/SEEU nem o **Copiar para o…** (2.6); saíram as seções **Localizador (só no SEEU)** e **Localizador na lista de juntadas e de conclusões (só no SEEU)** e a seção **Convivência com o AzFlow**, o que renumerou as seções 8.9 a 8.12 (agora 8.8 a 8.11), 9.13 a 9.17 (agora 9.12 a 9.16) e 10.3 (agora 10.2). Tirados também os trechos "No SEEU" das seções 1.3, 1.4, 2.2 a 2.6, 3.1, 5, 6, 7.1 a 7.8, 8.3, 8.7, 9.3, 9.4, 9.5, 9.8, 9.9, 9.10, 9.12, 10 e 11. O card **SEEU** ao lado da balança continua abrindo o SEEU a partir do Projudi (8.7). Preferências gravadas no SEEU não aparecem no Projudi. As funções do SEEU ficam guardadas no repositório (branch **backup-seeu-versao-17**), para recuperar se for preciso. Vídeos V40, V41 e V57 (SEEU) retirados de `videos-do-manual/` e guardados na mesma branch. |
| 17 | 09/11/2026 | Sem alteração de texto; corrigido (seção 9.16): a linha **Prescrições vencidas** da Análise de Juntadas mostrava **não disponível**, porque a página da aba Mesa do Escrivão Criminal, aberta pela extensão sem você ver, não traz o link **Vencidas** do quadro Prescrições. Agora a extensão procura o link de mais formas e, se não o achar, usa o endereço já conhecido desse link, aceito só se abrir a tela de Prescrições. Sem vídeo novo (a tela não mudou). |
| 16 | 09/11/2026 | Visual novo da Mesa do Analista (9.17): na tela Início, o nome da vara em **Dados do Juízo** fica à esquerda e o quadro **Últimas Mensagens** fica compacto, só da largura do texto; o visual passa a valer também na Mesa das varas de execução e de prestação pecuniária (endereço diferente no Projudi), com a aba **Intimações** e o título **Execuções Ativas**; na Análise de Juntadas, **Com Urgência** e **Para Realizar** ficam numa coluna estreita à esquerda e os demais quadros à direita; os quadros deixam o branco puro. Os tons passam a ser **Oliva fosco** (novo padrão, menos claro que o Oliva), **Areia**, **Sálvia**, **Névoa** e **Escuro suave**; saem Azul-petróleo, Azul-marinho e Grafite (quem os tinha escolhido volta ao Oliva fosco). A aba **Lembretes** ganha o visual novo, e a barra de menus e a linha do usuário (Usuário / Atribuição / Atuação / Data) do Projudi passam a acompanhar o tom escolhido, em todas as telas. Ajustados 2.6 (Cor do visual da Mesa do Analista) e 9.17 (Onde fica, tabela das abas, Escolher a cor e Bom saber). Vídeo V73 regravado (não citado no manual). |
| 15 | 09/11/2026 | Nova seção 9.17 **Visual novo da Mesa do Analista (Projudi)**: abas Início, Citações e Intimações, Análise de Juntadas (itens agrupados por assunto), Outros Cumprimentos (filtro e caixinha "Só linhas com pendência"), Cumprimentos de Medidas e Mesa do Escrivão Criminal (atalhos agrupados e busca) organizadas em quadros, com escolha de cor (Oliva, Azul-petróleo, Azul-marinho ou Grafite) guardada como preferência. Na tela Início, os Processos Paralisados (+30 dias) e (+90 dias, seção 9.15) ficam no mesmo quadro; na Análise de Juntadas, os totais da Mesa do Escrivão Criminal (seção 9.16) ficam no quadro "Da Mesa do Escrivão Criminal". Sumário, tabela da 2.6 (função e **Cor do visual da Mesa do Analista**) e **11. Solução de problemas** atualizados. Novo vídeo V73 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 14 | 09/11/2026 | Nova seção 9.16 **Totais da Mesa do Escrivão Criminal na Análise de Juntadas** (só no Projudi, nas varas com a aba Mesa do Escrivão Criminal): no fim do quadro "Para Realizar" da aba Análise de Juntadas aparecem os totais de **Feitos sem infração penal**, de **Reavaliação da prisão provisória a cada 90 dias (Art. 316, CPP)** e de **Prescrições vencidas** (somente sem sentença anotada, agrupadas por processo), que na Mesa do Escrivão Criminal só se veem clicando no quadro; clicar num número abre a lista. Sumário e tabela da 2.6 atualizados. Novo vídeo V72 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 13 | 09/11/2026 | Nova seção 9.15 **Processos Paralisados (+90 dias) na tela Início** (só no Projudi): abaixo de "Processos Paralisados (+30 dias)", a tela Início mostra os totais de processos paralisados há mais de 90 dias na Secretaria, Em Remessa e Em Remessa (exceto processos conclusos); clicar num número abre a Busca por Processos Paralisados já pesquisada com 91 dias. Sumário e tabela da 2.6 atualizados. Novo vídeo V71 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 12 | 09/11/2026 | Localizador na lista do Projudi (9.13): os localizadores passam a aparecer numa **coluna nova, Localizadores**, a última da tabela, em vez de abaixo do número do processo. Ajustados "Onde fica", o passo 1, "Remover um localizador direto na lista" e o Bom saber (linhas das listas em uma única página). |
| 11 | 06/11/2026 | Corrigido (seção 9.14): nas listas de intimação reunidas (**Intimação** — decurso de prazo, **Expedir Intimações** e **Auxiliares da Justiça**), o **+** mostrava "Não foi possível trazer os arquivos: o registro não está mais na página 1 da lista". Agora, nessas listas, a extensão pede os arquivos direto ao Projudi, pela movimentação da linha, e eles aparecem quase na hora. Linha de **11. Solução de problemas** atualizada. Sem vídeo novo (a tela não mudou). |
| 10 | 06/11/2026 | Corrigido (seção 9.14): nas listas reunidas em uma única página, o **+** abria vazio, sem os arquivos — tanto nas linhas da primeira página quanto nas trazidas das outras (o Projudi passava a "estar" na última página buscada). Agora a extensão atende o **+**: mostra **Carregando os arquivos…** e traz os arquivos da página de onde a linha veio; o **Expandir Mov** também funciona. Nova linha em **11. Solução de problemas**. Novo vídeo V70 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 9 | 06/11/2026 | Seção 9.14 (agora **Listas em uma única página (Juntadas, Conclusões, Mandados, Intimações, Multas FUPEN e Juiz das Garantias)**): também as listas **Expedir Intimações**, **Intimação** (decurso de prazo) e **Intimação de Auxiliares da Justiça** passam a mostrar todas as páginas numa só tela; na Intimação, com o campo **Sequencial** preenchido, continua valendo o filtro da 9.1 (que já percorre todas as páginas). Seção 9.1 com a mesma observação. Sumário, tabela da 2.6 e **11. Solução de problemas** atualizados. Novo vídeo V69 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 8 | 06/11/2026 | Seção 9.14 (agora **Listas em uma única página (Juntadas, Conclusões, Mandados, Multas FUPEN e Juiz das Garantias)**): também a **Listagem de Multas - Sistema FUPEN** e a fila **Processos com suspeita de incompetência - Juiz das Garantias** passam a mostrar todas as páginas numa só tela; tabela com as cinco listas. Corrigido: linhas iguais (como as de processos em **Segredo de justiça**) não são mais descartadas como repetidas; e, se o Projudi devolver de novo uma página já reunida, a navegação de páginas fica no lugar, com o aviso em vermelho. O nome da função no Menu mudou para **Listas em uma única página (…)**. Sumário, tabela da 2.6 e **11. Solução de problemas** atualizados. Novo vídeo V68 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 7 | 06/11/2026 | Seção 9.14 (agora **Juntadas, Conclusões e Mandados em uma única página**): a lista de **Mandados** (por exemplo, os mandados retornados) também passa a mostrar todas as páginas numa só tela; no lugar da navegação (e do seletor de registros por página) aparece **Todos os mandados em uma única página: N registro(s)**. O nome da função no Menu mudou para **Juntadas, Conclusões e Mandados em uma única página**. Sumário, tabela da 2.6 e **11. Solução de problemas** atualizados. Novo vídeo V67 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 6 | 06/11/2026 | Seção 9.14 (agora **Juntadas e Conclusões em uma única página**): a lista de **Conclusões** (Retorno de Conclusão) também passa a mostrar todas as páginas numa só tela, como a Análise de Juntadas; no lugar da navegação aparece **Todas as conclusões em uma única página: N registro(s)**. O nome da função no Menu mudou para **Juntadas e Conclusões em uma única página**. Sumário, tabela da 2.6 e **11. Solução de problemas** atualizados. Novo vídeo V66 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 5 | 06/11/2026 | **Nova seção 9.14 — Análise de Juntadas em uma única página:** quando a lista **Análise de Juntadas** do Projudi tem mais de uma página, a extensão traz sozinha as páginas seguintes (com os mesmos filtros e a mesma ordenação) e as acrescenta à mesma tabela; no lugar da navegação aparece **Todas as juntadas em uma única página: N registro(s)**. Sumário, tabela da 2.6 e **11. Solução de problemas** atualizados. Novo vídeo V65 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 4 | 06/11/2026 | Corrigido: com o zoom do navegador acima de 100% (ex.: 110%), os botões **Dispensar juntadas**, **Dispensar decursos** e **Finalizar conclusão** do quadro Pendências apareciam, mas não respondiam ao clique — uma área invisível da fila de botões da extensão ficava por cima deles. Nova linha em **11. Solução de problemas**. |
| 3 | 06/11/2026 | Nova forma de numerar as versões: em vez de números como 2.61.0 ou 2.60.1, cada nova versão da extensão (e deste manual) passa a ter um número inteiro — 3, 4, 5 e assim por diante. A 3 vem logo depois da 2.61.0. O conteúdo das seções não mudou. |
| 2.61.0 | 06/11/2026 | Nova seção **7.9 Seção Preferências na tela do processo**: quadro **Preferências** abaixo do quadro Pendências (ou acima dos botões do Projudi, quando não há pendências) com todas as preferências e combos, executados com um clique, **⚙ Organizar** e **▾ Recolher**. Na tabela do Menu (2.6), a nova parte **Seção "Preferências"** de **Ações rápidas e Minhas Preferências**. |
| 2.60.1 | 06/11/2026 | Capítulo 6: os botões do quadro **Pendências** (**Dispensar juntadas**, **Finalizar conclusão**, **Dispensar decursos**, **Dispensar pendências**, **Dispensar decurso**, **Analisar decurso** e **Analisar Retorno**) e os avisos que aparecem no lugar deles ficaram menores e com um tamanho padrão, para ocupar menos espaço e deixar o quadro mais limpo. Nada mudou no que eles fazem. |
| 2.60.0 | 04/11/2026 | Seção 6.5 (agora **Dispensar e analisar decurso de cumprimentos**): na linha **Cumprimentos Aguardando Análise de Decurso** do quadro Pendências, novo botão **Analisar decurso**, com o mesmo menu do Analisar Decurso das listas (**Abrir a análise**, **+ Nova preferência** e as preferências). A extensão abre o cumprimento, clica em **Analisar Decurso de Prazo** e em **Adicionar**, preenche a **Inserir Arquivo**, para no **Assinar Arquivos** para você assinar e depois clica em **Confirmar Inclusão** e em **Concluir**. Sumário e tabela da 2.6 atualizados. Novo vídeo V63 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.59.0 | 04/11/2026 | **Nova seção 6.5 — Dispensar decurso de cumprimentos:** na linha **Cumprimentos Aguardando Análise de Decurso** do quadro Pendências, o botão **Dispensar decurso** faz sozinho o caminho lista **Demais Cumprimentos** → **Visualizar** → **Dispensar Decurso** → **OK**, mostrando **Dispensando decurso…** e, no fim, **Decurso dispensado**. Sumário e tabela da 2.6 atualizados. Novo vídeo V62 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.58.0 | 04/11/2026 | Nova seção **9.13 Localizador na lista de juntadas e de conclusões (Projudi)**: nas listas Análise de Juntadas e Retorno de Conclusão do Projudi, a linha **📍** mostra o que consta em **Localizadores:** na aba Informações Gerais (a extensão passa para essa aba antes de ler), o **✏️** troca ou inclui um localizador escolhido entre os ativos do Histórico de Localizadores, e clicar no localizador tira-o do processo. A leitura é feita em três processos ao mesmo tempo, com conferência de que cada resposta é do processo certo. Incluída também na tabela de 2.6. |
| 2.57.1 | 04/11/2026 | Seção 3.1: a pré-visualização de documentos passa a abrir o PDF **na largura do painel** (texto maior, sem a coluna de miniaturas à esquerda), em vez da página inteira reduzida. Vale para todas as pré-visualizações de documentos (movimentações, pendências, mandados devolvidos e conclusões). Sem vídeo novo (o leitor de PDF do navegador não aparece nos vídeos simulados). |
| 2.57.0 | 04/11/2026 | Seções 8.12, 7.3 e 7.4: as preferências do **Agendar Audiência** passam a aparecer em **⭐ Minhas Preferências** (bloco **Agendar Audiência**, com ✏️ para mudar o nome) e a poder entrar nos **🔗 Combos**. No combo, a etapa pede o **▶ Sim, executar**, abre o agendamento já depois do **Manual** e espera você voltar à tela do processo para seguir. Vídeo V60 regravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.56.0 | 04/11/2026 | **Nova seção 8.12 — Agendar Audiência com preferências:** na linha **Audiência** do cabeçalho do processo (só no Projudi), uma **⭐** ao lado do **Agendar**. A preferência grava o **Tipo da Audiência** escolhido na tela **Agendar Audiência** (e a vara) no clique em **Manual**, pedindo um nome; ao usá-la, a extensão abre a tela, escolhe o tipo, clica em **Manual** e deixa você na tela **Agendar Audiência de …** para continuar à mão. Sumário e tabela da 2.6 atualizados. Novo vídeo V60 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.55.5 | 04/11/2026 | Corrigido: o botão **Finalizar conclusão** do quadro Pendências (6.2) às vezes não funcionava e avisava "Não foi encontrada uma conclusão habilitada para finalização", embora a mesma finalização feita antes de uma preferência funcionasse. Agora o botão segue o mesmo caminho: quando preciso, abre sozinho a tela do **Analisar** para achar o botão do Projudi. Ajuste em 6.2 e linha nova em Solução de problemas (11). |
| 2.55.4 | 26/10/2026 | Corrigido: no **SEEU**, a tela do processo (sobretudo a aba **Movimentações**) **travava por completo** — nem os botões do SEEU respondiam —, porque os botões **Advogados** e **Localizador** disputavam o mesmo lugar na barra, logo depois de **⭐ Minhas Preferências**, e um tirava o outro do lugar sem parar. Agora o **Localizador** fica depois do **Advogados**. Além disso, se alguma função da extensão voltar a entrar nesse tipo de disputa, ela é desligada sozinha e a tela continua respondendo. Linha nova em Solução de problemas (11). |
| 2.55.3 | 23/10/2026 | Seção 8.10: o quadrinho que abre no **Novo Valor da Causa** passa a ter o título só com o texto, sem o 💲. Vídeo V47 regravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.55.2 | 23/10/2026 | Seções 8.9, 8.10 e 8.11: os botões do cabeçalho do processo (**Alterar** da classe e dos assuntos, **⭐**, **⭐ Secundários**, **Novo Valor da Causa**, **Incluir** e **✖** das prioridades) ficam **retangulares, com cantos levemente curvos** (como os botões das Ações Rápidas), um pouco **menores**, e sem os símbolos ✏️, 💲 e ➕ (as ⭐ e o ✖ continuam). Textos dessas seções e da Solução de problemas (11) ajustados. Vídeos V42, V43, V47, V49, V50 e V56 regravados e guardados em `videos-do-manual/` (não citados no manual). |
| 2.55.1 | 23/10/2026 | Corrigido: com só o **Enviar por WhatsApp** (ou só o **Enviar por e-mail**) à vista e a página com barra de rolagem, o botão de envio ficava um pouco à esquerda do lugar dele e cobria o último botão da segunda linha (ex.: **Oráculo**). Pelo mesmo motivo, os painéis que abrem a partir da barra (grupos de ação, **⭐ Minhas Preferências**, **🔗 Combos**, **Advogados**, **Juntar Documento**, **Localizador** do SEEU e o **▼** do e-mail) abriam um pouco à esquerda do botão; agora ficam alinhados a ele. Sem alteração de texto nas seções. |
| 2.55.0 | 23/10/2026 | Seção 2.4: barra em **duas linhas** — a de cima começa sempre com **⭐ Minhas Preferências** e a de baixo com **Combos** —; **mudar a ordem dos botões** arrastando-os com o mouse, inclusive de uma linha para a outra; a ordem fica salva (separada no Projudi e no SEEU, e vai junto no ⬇ Exportar), e **↺ Ordem original** (Menu → Ações rápidas → Botões) volta ao padrão. Os botões da barra (**Concluso**, **Remessa**, **⭐ Minhas Preferências**, **Combos**, **Oráculo**, **Enviar por WhatsApp**, **↕ Mover**, **Ocultar** etc.) ficam **menores** — mais baixos, mais estreitos e com letra um pouco menor — e **sem os símbolos** antes do nome (só a ⭐ de Minhas Preferências e o 🔗 de Combos continuam), para não cobrirem os botões do próprio Projudi (como os do quadro Pendências); **Combos** fica em azul e **⭐ Minhas Preferências** em dourado claro. Ao esconder um botão ou desligar uma função no Menu, os demais se reorganizam e ocupam o espaço vazio (inclusive o lugar do **Enviar por WhatsApp** ou do **Enviar por e-mail**, quando só um dos dois está à vista), sem que um botão fique por cima de outro (e voltam ao arranjo anterior quando o botão é mostrado de novo). A posição da barra na tela não mudou. Os nomes dos botões no Menu (2.6) também ficam sem os símbolos. As **preferências** aparecem só com o nome, sem o **★** antes (nos painéis das ações, no Juntar Documento, em Alterar Classe/Assuntos, em Prioridades, no Analisar Decurso, na ⭐ das listas e em **⭐ Minhas Preferências**, onde os grupos também ficam sem símbolo); só os **combos** mantêm os seus (**🔗**, **▶**). O texto do **Enviar por e-mail** (e o **▼**) fica centralizado no botão. Seção 8.7: os **cards dos sistemas do CNJ** (ao lado da balança) ficam menores — mais baixos, mais estreitos, com letra um pouco menor e menos espaço entre eles —, centralizados na altura da balança. Seção 7.1: as ações **Suspender ou Sobrestar Processo**, **Transitar em Julgado** e **Arquivar Processo** passam para dentro do botão **Outras** (os botões **Suspender**, **Transitar** e **Arquivar** saem da barra e da lista Botões do Menu; as preferências salvas continuam valendo). Os dois botões "Partes" passam a se chamar **Int. Partes** (intimar, notificar, citar — 7.1) e **Editar Partes** (tela Partes do Processo — 8.4). Vídeo V59 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.54.3 | 20/10/2026 | O histórico de versões do manual (antes Anexo B) passa a ser o **Anexo A**, já que o anexo dos vídeos saiu na 2.53.2. O arquivo baixado pelo botão **2. Atualizar** (2.3) fica bem menor: os vídeos guardados para uso futuro não vão mais nele. O conteúdo das seções não mudou. |
| 2.54.2 | 20/10/2026 | Seção 2.6: dica **Computador lento** (desligar no Menu as funções que não usa — esconder só os botões não deixa a extensão mais leve —; como saber se a lentidão é da extensão ou do Projudi) e linha nova em Solução de problemas (11). **Extensão mais leve**: com a aba do Projudi/SEEU em segundo plano (atrás de outra aba), a extensão quase não usa mais o computador — antes ela continuava conferindo a tela várias vezes por segundo; ao voltar para a aba, tudo é conferido de novo. Ao trocar de aba do processo, a extensão confere a tela uma vez só, em vez de uma vez para cada pedaço que muda. As telas que a extensão abre escondidas para buscar informações (prévia de documentos, pendências, suspensões, preferências) carregam mais rápido, porque não recebem mais os botões e painéis, que ninguém vê ali. Sem vídeo novo. |
| 2.54.1 | 20/10/2026 | Corrigido: com a extensão instalada, a tela **Crianças e Adolescentes** do **SNA** (Sistema Nacional de Adoção e Acolhimento, do CNJ), aberta normalmente numa aba do navegador, ficava em branco, com o aviso "sna.cloud.cnj.jus.br está bloqueado". A regra que deixa os sistemas do CNJ abrirem dentro do popup do Projudi/SEEU passa a não atrapalhar esses sites quando usados fora dele. Linha nova na Solução de problemas (11). Sem vídeo novo: a tela da extensão não muda. |
| 2.54.0 | 19/10/2026 | Seção 2.6 (Menu da extensão): **busca** no alto da lista de funções; lista **Botões** nas funções com vários botões (Ações rápidas, Pré-visualização e WhatsApp, Expandir anexos, Dispensar juntadas/decursos/cumprimentos), para **esconder cada botão** na hora, sem recarregar e sem desligar a função; link **Desativar todas**, para montar a extensão do zero e ligar só o que usa. **Copiar para o…** e **↺ Padrão** passam a valer também para os botões escondidos, e o **⬇ Exportar** os leva junto. Vídeo V58 gravado e guardado em `videos-do-manual/` (não citado no manual). |
| 2.53.2 | 19/10/2026 | Os vídeos instrutivos saem do manual e deixam de ir junto com a extensão (que fica bem menor): retirados os links **▶ Vídeo** das seções, o Anexo A (lista dos vídeos) e as menções a eles na capa, em 1.2 e em 2.6. O conteúdo das seções não mudou. |
| 2.53.1 | 19/10/2026 | As caixinhas de marcar criadas pela extensão (arquivos para WhatsApp/e-mail, movimentação das Ações rápidas e **⭐ Em lote**) passam a ter **cor laranja**, para não se confundirem com as caixinhas do próprio Projudi/SEEU. Aviso no capítulo 5 e ajustes em 7.7 e 9.3. Vídeos V07, V08, V09, V37, V38 e V45 regravados. |
| 2.53.0 | 19/10/2026 | Mescla com a versão principal (até a 2.43.5). As versões desta série sobre o SEEU, desenvolvidas em paralelo como 2.42.0 a 2.51.0, foram renumeradas para **2.44.0 a 2.53.0** (linhas abaixo). Seção 8.3: **(Des)Habilitar Advogado** também no **SEEU** — botão **⚖️ Advogados** ao lado do ⭐ Minhas Preferências, com **Abrir**, **+ Nova preferência** e preferências. No SEEU a preferência grava um advogado (escolhido pela lupa), a **Atuação**, as **Partes do Processo** (pelo tipo) e o **Salvar**: ao gravar, o Salvar só pede o nome, sem salvar a habilitação; ao usar, o **✅ Sim, executar** clica em Salvar. Abertura do capítulo 8 ajustada. Sem vídeo novo (o vídeo V22 mostra o mesmo painel). |
| 2.52.0 | 19/10/2026 | Seção 7.1: duas ações rápidas novas, **só no SEEU**, no botão **Outras**: **Redistribuir** e **Comunicar ao IIPR** — abrem a tela no popup e aceitam preferências, como as demais. Sem vídeo novo. |
| 2.51.0 | 19/10/2026 | Seção 7.1: no **SEEU**, as Ações rápidas passam a mostrar só **Enviar Concluso**, **Realizar Remessa**, **Ordenar Cumprimentos**, **Intimar Partes**, **Intimar Peritos e Auxiliares da Justiça**, **Transitar em Julgado**, **Arquivar Processo** e **Interromper Prazo** (o botão **Suspender** some lá); as preferências das demais ações ficam só no Projudi. No Projudi, nada muda. Abertura do capítulo 7 ajustada. Sem vídeo novo. |
| 2.50.0 | 18/10/2026 | **Pendências também no SEEU.** Capítulo 6: os botões **Dispensar juntadas**, **Finalizar conclusão**, **Dispensar decursos** e **Dispensar pendências** (cumprimentos para expedir) no quadro Pendências da tela do processo do SEEU. Regra 1.4, item 5: as perguntas sobre dispensar juntadas/decursos e finalizar a conclusão antes de uma preferência passam a valer **também no SEEU** — na tela do processo, no painel 📍 Localizador e na ⭐ das listas (também em lote). Ajustes em 7.2 e 9.3. Sem vídeo novo (os vídeos V13 a V16 e V45 mostram o mesmo uso). |
| 2.49.0 | 18/10/2026 | Seção 9.5: o **RG e CPF nos cumprimentos** também no **SEEU** (listas **Demais Cumprimentos** e **Mandados**, tela do cumprimento e tela do **Analisar**), com os documentos do **Sentenciado** lidos do cabeçalho do processo. Seção 9.3: a **⭐** e o **⭐ Em lote** também nas listas de cumprimentos do SEEU, com as preferências do **📍 Localizador**. Abertura do capítulo 9 reescrita em lista; ajuste em 1.3. Sem vídeo novo (os vídeos V32 e V41 mostram o mesmo uso). |
| 2.48.0 | 16/10/2026 | Seção 9.10: as **preferências do Analisar Decurso** também no **SEEU** — **+ Nova preferência**, ★ (com ✏️ e 🗑) no botão da linha e na ⭐, e **Analisar decurso nos marcados** no lote. Na janela Inserir Arquivo do SEEU, o Tipo do Arquivo e o Modelo são digitados e escolhidos na sugestão (a preferência grava os dois) e a assinatura é pelo **Assinar** com código de confirmação. Preferências do SEEU e do Projudi ficam separadas. Ajustes em 9.3. Sem vídeo novo (o vídeo V52 mostra o mesmo uso). |
| 2.47.0 | 16/10/2026 | Seção 9.3: a **⭐** e o **⭐ Em lote** também nas listas de decurso de prazo do **SEEU** (**Intimações** e **Intimação de Auxiliares da Justiça**): preferências do **📍 Localizador**, seção **📝 Analisar Decurso** com **Abrir a análise** e, na barra do lote, **Dispensar nos marcados**. Ajustes em 1.3 (com uma vírgula que faltava) e 9.10. Sem vídeo novo (os vídeos V41 e V45 mostram o mesmo uso). |
| 2.46.0 | 16/10/2026 | Seção 9.10: o **Analisar e Dispensar decurso na lista** passa a valer também no **SEEU** (listas **Intimações** e **Intimação de Auxiliares da Justiça** da Análise de Decurso de Prazo): **Dispensar** completo e **Analisar Decurso** com **Abrir a análise** no popup. As preferências do Analisar Decurso (e o **+ Nova preferência**) continuam só no Projudi por enquanto. Ajustes em 1.3, 2.6 e na abertura do capítulo 9. Sem vídeo novo (o vídeo V52 mostra o mesmo uso). |
| 2.45.0 | 16/10/2026 | Seção 9.8: o **processo ao passar o mouse** passa a valer também no **SEEU** — listas de Análise de Juntadas, Retorno de Conclusão, Mandados (e Demais Cumprimentos), Decurso de Prazo e Processos Paralisados e, só no SEEU, as listas de **Execuções** e de **Processos Suspensos** e o **Painel de Incidentes**: pousar o mouse sobre o número do processo abre a tela dele num painel. Ajustes em 1.3, 2.6 e na abertura do capítulo 9. Sem vídeo novo (o vídeo V44 mostra o mesmo uso). |
| 2.44.0 | 16/10/2026 | Seção 9.4: a **Mesa do Analista sem itens zerados** passa a valer também no **SEEU** (Mesa do(a) Analista Judiciário, em todas as abas: Pendências de Incidentes, Cumprimentos de Medidas, Intimações, Análise de Juntadas, Outros Cumprimentos…): as linhas com contador zerado somem e voltam sozinhas quando surge pendência; um grupo (Com Urgência, Para Conferir, Para Expedir…) com todas as linhas zeradas some inteiro, com o título. Ajustes em 1.3 e na abertura do capítulo 9. Sem vídeo novo (a tela é a mesma do vídeo V31). |
| 2.43.5 | 19/10/2026 | Sem alteração de texto; corrigida uma espera de até 15 segundos no envio dos itens da fila da **Nova Ordenação** (7.5) quando um item sem retorno vinha depois de um item com retorno. |
| 2.43.4 | 19/10/2026 | Seção 7.5: corrigido o erro *"Informe se o Cumprimento necessitará de retorno"* ao enviar os itens da fila da **Nova Ordenação**. A extensão agora espera aparecerem os campos que o Projudi só mostra depois de escolher o tipo de cumprimento antes de enviar. *Bom saber* da 7.5 atualizado. |
| 2.43.3 | 19/10/2026 | Seção 7.5: corrigido o erro *"não consegui abrir um diálogo novo de 'Ordenar Cumprimentos' em segundo plano"* ao clicar em **Ordenar** com itens na fila da **Nova Ordenação**. Quando não consegue reabrir o diálogo pelo caminho das Ações rápidas, a extensão agora reabre o mesmo diálogo que está na tela. *Bom saber* da 7.5 atualizado. |
| 2.43.2 | 19/10/2026 | Convivência com o AzFlow (10.2): no SEEU, com o AzFlow ligado, a pré-visualização desta extensão fica desligada também nas telas em que antes ainda podia abrir junto com a do AzFlow (ex.: quadro **Movimentações Realizadas** da tela **Analisar Conclusão**); ao desligar o AzFlow pelo botão dele, a pré-visualização desta extensão volta sem recarregar a página. Texto da 10.2 atualizado. |
| 2.43.1 | 19/10/2026 | Seção 9.12: as mensagens de remoção de localizador passam a dizer **Remover** / **Removendo** / **removido** (antes, "Tirar", "Tirando" e "tirado"). Vídeo V57 regravado. |
| 2.43.0 | 18/10/2026 | Seção 9.12: o localizador mostrado na linha **📍** das listas **Análise de Juntadas** e **Retorno de Conclusão** do SEEU passa a funcionar como no cabeçalho do processo: ao pousar o mouse aparece **Remover do processo** (com **⊗**) e, clicando nele e respondendo **OK**, a extensão tira o localizador do processo (responde **SIM** no **Confirme** do SEEU) e mostra o resultado na linha. O **✖** do painel do **✏️** continua. Vídeo V57 regravado. |
| 2.42.1 | 18/10/2026 | Seção 9.12: corrigido o **✖** do painel **📍 Localizadores**, que não tirava o localizador do processo. Agora a extensão faz como no SEEU: clica no localizador e responde **SIM** na janela **Confirme** ("Deseja desassociar o localizador…"). Novo botão **📋 Copiar diagnóstico** quando não é possível tirar um localizador. *Bom saber* da 9.12 atualizado. |
| 2.42.0 | 18/10/2026 | **Nova seção 9.12** (*só no SEEU*): nas listas **Análise de Juntadas** e **Retorno de Conclusão**, a coluna do número do processo passa a mostrar a linha **📍** com os localizadores cadastrados em cada processo (lidos em segundo plano, um processo de cada vez), com **✏️** para associar um localizador da lista da unidade ou tirar (**✖**) um localizador do processo sem sair da lista, e **↻** para ler de novo. Ao associar pela **⭐** da linha, a linha **📍** é atualizada. Nova função **Localizador na lista (SEEU)** no Menu (2.6). Ajustes em 1.3, na abertura do capítulo 9 e em 8.8. Novo vídeo V57. |
| 2.41.3 | 16/10/2026 | Alterar Classe/Assuntos (8.9), preferência de assunto secundário: corrigido o aviso "a tela de alteração não voltou depois de selecionar o assunto" (ex.: **Injúria**, **Violação de domicílio**), que aparecia quando o Projudi não recarregava a tela inteira depois do **Selecionar**. Agora a extensão confere se o assunto entrou na lista, recarregando a tela ou não. Se der errado, o aviso mostra também a mensagem do Projudi. *Bom saber* da 8.9 atualizado. Quando o Projudi não reage ao **Selecionar** (assunto secundário e prioridades), a extensão clica de novo e, no assunto secundário, recomeça sozinha (até 3 tentativas) — antes era preciso usar a preferência outra vez —, e passa a esperar a janela de seleção terminar de carregar antes de marcar o assunto (com assuntos como **Injúria**, que já aparecem na janela sem pesquisa, o primeiro **Selecionar** era ignorado). Para o Projudi lento (sobretudo o de testes), a extensão espera mais pela resposta antes de desistir — até 1 minuto por tela — nas preferências de classe, assuntos, prioridades e valor da causa, na inclusão de advogado e no Tipo de Documento das juntadas. |
| 2.41.2 | 16/10/2026 | Minhas Preferências (7.3) e ⭐ na linha do processo (9.3): os nomes das preferências e dos combos não aparecem mais cortados com "…". A letra dos cards ficou um pouco menor e, quando o nome é comprido, ele continua na linha de baixo, no mesmo card. Nos cards do Analisar (Pré-Análise) e do Analisar Decurso, a descrição da ação fica numa linha em cima e o nome embaixo. Textos da 7.3 e da 9.3 atualizados. |
| 2.41.1 | 16/10/2026 | Alterar Classe/Assuntos (8.9), preferência de assunto secundário: corrigido o aviso "o assunto … não apareceu na pesquisa da janela de seleção" para assuntos de nome longo (ex.: **14227 - Crime de Descumprimento de Medida Protetiva de Urgência**). Se a pesquisa pelo nome inteiro não traz o assunto, a extensão pesquisa de novo sem acentos, pela palavra mais longa do nome e pelo código. *Bom saber* da 8.9 atualizado. |
| 2.41.0 | 15/10/2026 | **Nova seção 8.11 — Prioridades:** na linha **Prioridade** do cabeçalho do processo (só no Projudi), **✖** ao lado de cada prioridade que pode ser tirada (remove e salva, depois de confirmar), **➕ Incluir** (abre a tela de alteração num popup já com a **Seleção de Prioridade**; depois do **Selecionar**, salva sozinho) e **⭐** com preferências que incluem/tiram prioridades e salvam com um clique — também nos **🔗 Combos**. Sem prioridade, a linha aparece com "(nenhuma)". Sumário, tabela da 2.6, seções 7.4 e 7.8 atualizados. Novo vídeo V56. |
| 2.40.0 | 15/10/2026 | Seção 9.8: o processo ao passar o mouse também na lista de **Processos Paralisados** — pousar o mouse sobre o **número do processo** abre a tela dele num painel, já na aba **Movimentações**. Título da seção, Sumário e tabela da 2.6 atualizados; vídeo V44 regravado. |
| 2.39.0 | 15/10/2026 | Seção 9.8: o processo ao passar o mouse também nas listas **Expedir Intimações** e **Expedir Citação** — pousar o mouse sobre o **número do processo** abre a tela dele num painel, já na aba **Movimentações**. Título da seção, Sumário e tabela da 2.6 atualizados; vídeo V44 regravado. |
| 2.38.0 | 15/10/2026 | Seção 9.8: o processo ao passar o mouse também nas listas de cumprimentos (**Demais Cumprimentos** e **Mandados**) — pousar o mouse sobre o **número do processo** abre a tela dele num painel, já na aba **Movimentações**. Título da seção, Sumário e tabela da 2.6 atualizados; vídeo V44 regravado. |
| 2.37.0 | 15/10/2026 | Seção 9.8: o processo ao passar o mouse também na lista de **Conclusões** — pousar o mouse sobre o **número do processo** (que lá não é link) abre a tela dele num painel, já na aba **Movimentações**. O **Analisar** continua mostrando o documento do Juiz (9.9). Título da seção, Sumário e tabela da 2.6 atualizados; vídeo V44 regravado. |
| 2.36.0 | 15/10/2026 | Seção 9.8: o processo ao passar o mouse também na lista da **Análise de Juntadas** — pousar o mouse sobre o **número do processo** abre a tela dele num painel, já na aba **Movimentações**, como nas listas de Decurso de Prazo. Título da seção, Sumário e tabela da 2.6 atualizados; vídeo V44 regravado. |
| 2.35.0 | 15/10/2026 | Painéis com muitas preferências. **Seção 9.3 (e 9.11):** o card **⭐** da linha passa a caber sempre na tela e rolar por dentro — antes, o fim dele (com a seção **📝 Analisar** e o **+ Nova preferência**) ficava fora da tela e só aparecia diminuindo o zoom; o topo do card fica parado ao rolar, com o campo **🔍 Buscar preferência** e os botões **+ Nova · Analisar (Pré-Análise)** / **+ Nova · Analisar Decurso**. **Nova seção 7.8:** o mesmo vale para **todos** os painéis com preferências — painéis das Ações rápidas, 📎 Juntar Documento, ⭐ Minhas Preferências, ⭐ de Alterar Classe/Assuntos, Analisar Decurso e 📍 Localizador (SEEU): o painel cabe na tela e rola por dentro, o topo fica parado, a busca aparece a partir de 6 preferências, e o **+ Nova preferência** fica no topo (nas ações rápidas e no Juntar Documento, na linha do nome da ação, ao lado de **Abrir**). Ajustes nas seções 7.2, 7.3, 8.2, 8.8, 8.9 e 9.10. Novos vídeos V54 e V55; vídeos V40, V43 e V49 regravados. |
| 2.34.3 | 15/10/2026 | Corrigido: a preferência de **Anotações Criminais** dizia "Nenhum campo preenchido ou selecionado" mesmo com a janela **Comunicar ao IIPR** preenchida, e a de **Solicitar Antecedentes Criminais** não podia ser salva (só tem a Parte, que não é gravada). Agora grava o que está escolhido na janela, a de Antecedentes pode ficar sem campos, e o preenchimento e a origem padrão continuam funcionando quando a janela recarrega a cada escolha. Ao usar essas preferências, com **um só réu** na lista "Parte do Processo" ele já vem escolhido; com mais de um, a escolha fica com o usuário (7.1). |
| 2.34.2 | 15/10/2026 | Sistemas (8.7): corrigido — os cards dos sistemas do CNJ não apareciam quando o processo era aberto pela lista de **Paralisados** ou pelo atalho **Processo** do topo da tela (nessas telas o número do processo vem escrito de outro jeito no título). Agora aparecem como nas demais. Texto do "Onde fica" ajustado. Sem vídeo novo: a tela não muda. |
| 2.34.1 | 15/10/2026 | Corrigido: ao criar uma preferência de **Anotações Criminais** (ou **Solicitar Antecedentes Criminais**), o **💾 Salvar como preferência** dizia "Não encontrei o formulário do diálogo" com a janela **Comunicar ao IIPR** aberta e preenchida. Agora a extensão encontra a janela na hora de salvar. A **Parte do Processo** deixa de ser gravada nessas preferências (nem é preenchida pelas antigas): escolha a parte antes de clicar em **✅ Sim, executar**. Nova **origem padrão**: ao salvar com a Origem escolhida, a extensão pergunta se grava o nome dela (ex.: "Recebida") e, a cada uso, seleciona a origem mais recente com esse nome, sempre que existir (7.1). |
| 2.34.0 | 15/10/2026 | Sistemas (8.7): com **dois monitores**, o card abre o sistema **direto no outro monitor**; com um só, no popup, como antes. Nova opção no Menu (2.6), **Abrir os sistemas**: Automático (padrão), Sempre no popup ou Sempre fora do popup (2º monitor ou nova aba); a escolha vai no Exportar. Vídeos V34 e V39 regravados. |
| 2.33.1 | 14/10/2026 | Seção 9.9: corrigido — na lista **Intimação — Auxiliares da Justiça** do Decurso de Prazo os botões **Analisar Decurso** e **Dispensar** não apareciam nas linhas (lá a coluna Situação mostra "Decurso de prazo em" e a data, e não "Aguardando Análise do Decurso de Prazo"). Agora aparecem, e também o **Dispensar nos marcados** e o **Analisar decurso nos marcados** da barra **⭐ Em lote** funcionam nessa lista. Texto do "Onde fica" ajustado. Sem vídeo novo: a tela não muda. |
| 2.33.0 | 14/10/2026 | Novo card **SEEU** (terracota), só no Projudi, na fileira dos sistemas ao lado da balança (1.3 e 8.7): abre a página de entrada do SEEU num popup sobre o processo (ou no segundo monitor/nova aba). Quem já tinha mudado a ordem dos cards encontra o SEEU dentro do **Outros**. Vídeo V39 regravado. |
| 2.32.2 | 13/10/2026 | Sem alteração de texto; corrigido um erro em que a extensão podia repetir, sem o usuário perceber, o envio de uma tela de ação do Projudi aberta dentro do processo (ex.: comunicação de ação vinculada, na aba **Vínculos**), gerando comunicações/juntadas duplicadas. Afetava a linha dos réus no cabeçalho do processo e a busca de RG/CPF e endereços das partes (cumprimentos, mandados e BNMP), que agora só consultam a própria tela do processo. |
| 2.32.1 | 13/10/2026 | Sistemas do CNJ e card **Outros** (8.7): corrigido o nome do botão do topo do popup, que podia aparecer como **🗂 Nova aba** mesmo com dois monitores (e então abria o sistema no segundo monitor). Agora, com dois monitores, ele aparece como **🖥 Segundo monitor**, como descrito. Nota nova no *Bom saber*. |
| 2.32.0 | 13/10/2026 | Seção 7.4: os **🔗 Combos** passam a aceitar toda preferência usada na tela do processo, incluindo as do **✏️ Alterar Classe/Assuntos** (Projudi) e as do **📍 Localizador** (SEEU). Essas etapas não abrem janela: a barra do combo mostra o que será feito e executa no **▶ Sim, executar** dela; a alteração de classe/assuntos recarrega o processo e o combo segue. Pela **⭐** das listas (9.3), combos com essas etapas abrem o processo numa nova aba (↗). |
| 2.31.1 | 13/10/2026 | Seção 2.6: o **⬇ Exportar** passa a levar toda e qualquer preferência criada pelo usuário — inclusive as de Analisar Decurso, Pré-Análise, classe e assuntos, localizador (SEEU) e as listas de tarefas — e qualquer preferência de função nova entra automaticamente; o resumo mostrado ao exportar e ao importar lista cada tipo de preferência com a quantidade. |
| 2.31.0 | 13/10/2026 | Mescla com a versão principal (até a 2.29.1). As funções desenvolvidas em paralelo, listadas abaixo nas linhas de 2.25.1 a 2.30.5 (sobre preferências de Pré-Análise, Mandados, Expedir Intimações/Citação, decurso em lote, Sistemas do CNJ e e-mail), passam a conviver com as da principal (2.26.0 a 2.29.1). Renumeração: as seções **Analisar e Dispensar decurso na lista** e **Analisar (Pré-Análise) dos cumprimentos com preferências** passam a **9.10** e **9.11** (a 9.9 é a do Documento do Juiz no Retorno de Conclusão), e os vídeos delas passam a **V52** e **V53** (V49 a V51 são os da principal). Nas linhas antigas abaixo, essas seções e vídeos aparecem com a numeração da época. |
| 2.30.5 | 09/10/2026 | Corrigido (9.10): em **Demais Cumprimentos**, a janela **Seleção de Documentos** (botão Adicionar) tem outro formato (colunas Seq., Data, Evento e Movimentado por) e não mostrava a **☆ padrão** ao lado dos movimentos; agora mostra, e a preferência anexa os documentos do movimento escolhido também nessa lista. |
| 2.30.4 | 09/10/2026 | Sem alteração de texto; preferências com texto (8.2, 9.9, 9.10): se a versão gravada trouxer variáveis do Modelo sem dados (ex.: "$parteSelecionadaDadosBasicos"), a extensão não a aplica, deixa o documento como o Projudi o gerou e avisa para gravar a preferência de novo. |
| 2.30.3 | 09/10/2026 | Sem alteração de texto; Pré-Análise com preferências (9.10): se o Projudi devolver uma página de erro (ex.: "403 Forbidden") no popup, a extensão avisa que o erro é do servidor e como recomeçar. |
| 2.30.2 | 09/10/2026 | Corrigido (9.10): em Expedir Intimações e Expedir Citação, o **Prazo** e o **Usar Anexos** da tela final não ficavam gravados na preferência; agora são gravados no clique em Assinar e Expedir/Postergar Assinatura e preenchidos em cada uso. |
| 2.30.1 | 09/10/2026 | Corrigido (9.10): em Expedir Intimações e Expedir Citação, o campo **Descrição** da Pré-Análise não ficava gravado na preferência; agora é gravado e preenchido em cada uso. |
| 2.30.0 | 09/10/2026 | Pré-Análise com preferências (9.10) também nas listas **Expedir Intimações** e **Expedir Citação**, na linha e em lote: grava a versão final do texto no "Continuar" (editada ou não), troca os dados de cada processo e parte, e salva no clique em **Assinar e Expedir** ou **Postergar Assinatura**. Essas telas não têm "Tipo do Arquivo" (só o Modelo). Cada lista passa a mostrar só as preferências criadas nela. Sem vídeo novo: a tela é a mesma do V50. |
| 2.29.11 | 13/10/2026 | O assunto padrão de lembretes criados pelo post-it passa a ser **Anotação compartilhada - Abra ou instale a extensão Olirum**. |
| 2.29.10 | 10/10/2026 | A nota por processo também é identificada na ficha inicial, que pode usar `processo.do` sem parâmetros explícitos de visualização. Listagens continuam usando apenas a nota permanente porque não têm a barra de título individual. |
| 2.29.9 | 10/10/2026 | O post-it é ocultado nos quadros de cabeçalho e em prévias/diálogos dentro de iframes; só aparece uma vez no quadro da tela principal. |
| 2.29.8 | 10/10/2026 | A listagem de processos ativos não é mais confundida com uma ficha individual; o post-it nessa página mostra apenas a anotação permanente. |
| 2.29.7 | 10/10/2026 | A anotação por processo fica restrita à ficha e à tela de movimentação do processo. Nas listagens e análises, o post-it exibe somente a anotação permanente. |
| 2.29.6 | 09/10/2026 | O post-it consulta Informações Gerais em segundo plano para localizar o lembrete ativo ou o link de criação, mesmo quando a aba aberta é Movimentações. |
| 2.29.5 | 09/10/2026 | O link “Novo Lembrete” identificado em Informações Gerais fica disponível no post-it ao alternar para outras abas do processo. |
| 2.29.4 | 09/10/2026 | Corrigida a identificação do link “Novo Lembrete” para liberar a criação de um lembrete compartilhado quando não há um ativo. |
| 2.29.3 | 09/10/2026 | O post-it do processo pode carregar o lembrete ativo e salvá-lo explicitamente no Projudi; se não houver um ativo, cria um com assunto padrão. Notas permanentes e adicionais continuam pessoais. |
| 2.29.2 | 09/10/2026 | Integradas as novidades da versão 2.29.1 com o bloco de anotações por processo, cores e múltiplas notas. |
| 2.29.1 | 07/10/2026 | Preferências com texto (8.2, 9.9, 9.10): a versão final do documento no clique em **Continuar** é sempre a gravada — também quando você não altera nada no texto do Modelo (antes aparecia o aviso "Não consegui gravar nenhum texto" e, com o marcador "INSIRA O TEXTO AQUI", a extensão parava para você digitar). Textos das seções 8.2 e 9.9 ajustados. |
| 2.29.0 | 07/10/2026 | Preferências com texto (Juntar Documento 8.2, Analisar Decurso 9.9 e Pré-Análise 9.10): passam a gravar também as **edições do texto do Modelo** — trechos apagados, formatação (negrito, itálico, sublinhado) e parágrafos alterados —, e as refazem em cada uso no documento novo, trocando os dados do processo (número, nomes, endereço, CPF, datas) pelos do processo novo nos parágrafos alterados. Os parágrafos não alterados ficam como o Projudi os gera. Sem vídeo novo: a tela não muda. |
| 2.28.1 | 07/10/2026 | Sem alteração de texto; corrigido: em documentos gerados por **Modelo** (ex.: mandados), ao gravar uma preferência (Juntar Documento, Analisar Decurso ou Pré-Análise) a extensão gravava o documento inteiro em vez do texto digitado, e ao usá-la avisava "Não encontrei onde inserir o texto da preferência". Agora grava só o que você digitou e o insere no mesmo lugar — inclusive quando o parágrafo de referência tem dados do processo (nome, data). Se o texto gravado parecer o documento inteiro, a extensão avisa antes de salvar. Preferências gravadas com o erro precisam ser gravadas de novo (✏️). |
| 2.28.0 | 06/10/2026 | Pré-Análise com preferências (9.10): a gravação não pergunta mais sobre o "Postergar Assinatura" — ela termina no seu clique em **Assinar e Expedir** ou **Postergar Assinatura** (o botão escolhido fica gravado), e só então a extensão pede o nome. Nova opção **☆ padrão** na janela **Seleção de Documentos** (botão **Adicionar** de Documento(s) do Processo/Recurso): ao usar a preferência, a extensão anexa os documentos do movimento mais recente com esse nome (ex.: Concedida a Medida Protetiva). O card ⭐ mostra "+ documentos". Vídeo V50 regravado. |
| 2.27.2 | 06/10/2026 | Sem alteração de texto; corrigido: ao usar uma preferência de Pré-Análise na lista de **Mandados** (9.10), a extensão parava na pré-visualização do documento, que ali tem os botões **Salvar** e **Voltar** (e não Concluir e Alterar). Agora ela clica em **Salvar** e segue. |
| 2.27.1 | 06/10/2026 | Sem alteração de texto; corrigido: na Pré-Análise da lista de **Mandados** (9.10), o texto digitado no documento não era gravado na preferência (aparecia o aviso "Não consegui gravar nenhum texto nesta preferência"), porque ali a tela de digitar o documento é outra. |
| 2.27.0 | 06/10/2026 | Lista de **Mandados** (expedição de mandados), no Projudi: ganha as listas de tarefas (9.2), a **⭐** na linha e o **⭐ Em lote** (9.3), com a mesma pergunta sobre juntadas e conclusão pendentes das demais telas de cumprimentos, e a seção **📝 Analisar (Pré-Análise)** com preferências e **Postergar Assinatura**, também em lote (9.10). Descrição da função no Menu atualizada (2.6). Sem vídeo novo: a tela da função é a mesma do V45 e do V50. |
| 2.26.1 | 06/10/2026 | Decurso em lote (9.9): **Dispensar nos marcados** mostra a lista dos processos antes de começar, e os dois lotes do decurso **param no primeiro erro**, deixando os seguintes intactos e marcados (no Analisar, fechar o popup só pula o processo). Vídeos V49 e V50 regravados (V49 com a nova legenda; os dois com o número novo na abertura). |
| 2.26.0 | 06/10/2026 | Nova seção **9.9** (só no Projudi): botões **Analisar Decurso** e **Dispensar** em cada linha das listas de **Decurso de Prazo**, abaixo do sequencial. O Dispensar responde OK à confirmação do Projudi sozinho e mostra "Decurso de prazo dispensado com sucesso". O Analisar Decurso abre a análise num popup, com menu para criar (**+ Nova preferência**), editar e remover preferências próprias do Analisar Decurso, ou usar as do Juntar Documento (8.2): a extensão inclui o arquivo, você assina e ela conclui e fecha o popup. Na barra **⭐ Em lote**: **Dispensar nos marcados** e **Analisar decurso nos marcados**. A lista de Citações/Notificações do Decurso de Prazo passa a ter também as listas de tarefas e a ⭐ (9.2, 9.3). Nova função na tabela da 2.6 e vídeo V49. Nova seção **9.10** (só no Projudi): no card **⭐** da lista **Demais Cumprimentos**, seção **📝 Analisar (Pré-Análise)** com **+ Nova preferência**, ✏️ e 🗑; ao criar, a extensão pergunta, na tela do cumprimento, se deve sempre clicar em **Postergar Assinatura** (Sim: grava e clica; Não: você clica em **Assinar e Expedir**); também em lote. Vídeo V50. Ao gravar uma preferência (Juntar Documento, Analisar Decurso ou Pré-Análise), o texto digitado ao lado do marcador "INSIRA O TEXTO AQUI" passa a ser gravado, e a extensão avisa antes de salvar uma preferência sem texto (9.9). As preferências do Analisar Decurso também aparecem no card ⭐ (linha e Em lote), seção **📝 Analisar Decurso**; os botões do lote do decurso avisam quando nenhum marcado aguarda análise. |
| 2.25.1 | 06/10/2026 | Opções (2.5) e e-mail (5.2): o **Tenant ID** volta a ser **opcional** no modo Microsoft Graph (como antes da 2.23.1); quem já usava esse modo não precisa informar nada. Retirada a linha correspondente da Solução de problemas (11). O login só enquanto o navegador estiver aberto e o botão **Sair do Outlook nesta extensão** continuam. |
| 2.29.1 | 09/10/2026 | Seção 4.4 reescrita: o processo principal é sempre o **primeiro processo da linha Apensamentos:**, também nos apensos de apensos (antes podia aparecer o Sequencial de outro processo, ou "não encontrado"); no primeiro processo da lista, e em processos sem apensos, aparece a linha **Sequencial:** do próprio processo. Vídeo V12 refeito. |
| 2.29.0 | 08/10/2026 | Nova seção **9.9** (Projudi e SEEU): na lista **Retorno de Conclusão**, pousar o mouse sobre o **Analisar** mostra o documento que o Juiz fez (despacho, decisão ou sentença) — o da linha **Documentos** da tela **Movimentar Processo**, sem clicar duas vezes em Analisar —, uma janela por arquivo, com **📌 Fixar**, **Abrir em nova aba** e **✕**. Com mais de um arquivo, o **✕** fecha só aquela janela e clicar numa janela de trás a traz para a frente. Nova função na tabela da 2.6 e vídeo V51. |
| 2.28.0 | 08/10/2026 | Alterar Classe/Assuntos (8.9): novas **preferências de assuntos secundários** (**⭐** na linha **Assuntos Secundários** do cabeçalho, ou **⭐ Secundários** na linha do Assunto Principal quando ainda não há assunto secundário) — para gravar, use **Adicionar**, pesquise, marque o assunto e clique em **Selecionar** (só grava a preferência); ao usar, a extensão faz o mesmo caminho na janela de seleção do Projudi, confere se o assunto entrou na lista e só então salva. Novo balão **✖** no fim de cada assunto secundário do cabeçalho, que remove aquele assunto e salva (pede confirmação). Corrigido: fora da tela do processo, os indicadores de suspensão e de monitoração e o botão do WhatsApp deixam de repetir avisos internos a cada 1,5 segundo. Novos vídeos V49 e V50. |
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
| 2.9.88 | 29/09/2026 | Primeira edição do manual: todas as funções da extensão até a versão 2.9.88, com 33 vídeos instrutivos (num anexo próprio, retirado na versão 2.53.2). |
