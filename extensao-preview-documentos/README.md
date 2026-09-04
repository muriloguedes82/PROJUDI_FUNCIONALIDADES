# Projudi - Pré-visualização de Documentos

Extensão de navegador (Chrome/Edge, Manifest V3) com duas funcionalidades
para a tela de um processo no Projudi:

1. **Pré-visualização de documentos** ao passar o mouse sobre o nome do
   arquivo, sem precisar abrir em outra aba.
2. **Lembretes em formato post-it**, com cor à escolha, compartilhados em
   tempo real entre qualquer usuário que tenha a extensão ativa no mesmo
   processo.

## Instalação (modo desenvolvedor)

1. Acesse `chrome://extensions` (ou `edge://extensions`).
2. Ative o "Modo do desenvolvedor".
3. Clique em "Carregar sem compactação" e selecione a pasta
   `extensao-preview-documentos`.
4. Abra um processo no Projudi (TJPR) e passe o mouse sobre um documento na
   aba Movimentações, ou clique no botão "📌 Lembretes" no canto inferior
   direito.

> O `host_permissions` do `manifest.json` está restrito a `*.tjpr.jus.br`
> (mais o domínio do Firebase usado pelos lembretes). Para usar em outro
> Tribunal que também utilize o Projudi, ajuste os padrões de URL em
> `manifest.json`.

## 1. Pré-visualização de Documentos

Resolve o seguinte problema: na tela **Movimentações** do Projudi, para ler
a íntegra de um documento anexado é preciso clicar no link e abri-lo em
outra aba.

Com a extensão instalada, basta **passar o mouse sobre o nome do arquivo**
(ex.: `Certidao de Baixa.pdf`) para que a íntegra do documento apareça em um
painel flutuante sobreposto à própria tela de movimentações — sem precisar
trocar de aba. A ideia é a mesma já oferecida pelo eproc e pela extensão
AzFlow.

### Como funciona

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

### Limitações conhecidas

- Funciona apenas para documentos que o navegador consiga exibir dentro de
  um `<iframe>` (PDF é o caso comum, via visualizador nativo do
  Chrome/Edge). Alguns tipos de arquivo podem ser baixados diretamente pelo
  navegador em vez de exibidos — nesse caso, use "Abrir em nova aba".
- Não há armazenamento, envio ou cache de nenhum dado do processo pela
  extensão: o documento é sempre buscado diretamente do Projudi no momento
  do hover.

## 2. Lembretes (post-it)

Adiciona um botão flutuante **"📌 Lembretes"** no canto inferior direito de
qualquer tela de processo. Clicando nele, abre um painel lateral com os
lembretes daquele processo, onde é possível:

- Criar um novo lembrete ("+ Novo lembrete");
- Escolher a cor do post-it entre 6 opções;
- Editar o texto livremente (salva automaticamente após ~meio segundo sem
  digitar);
- Excluir um lembrete.

Os lembretes são gravados em um **Firebase Realtime Database** compartilhado
e chegam **em tempo real** (via Server-Sent Events) a qualquer outro usuário
que tenha a extensão ativa e esteja com a mesma tela de processo aberta —
não é preciso recarregar a página. Cada lembrete guarda o nome informado por
quem o criou (perguntado uma única vez, editável pelo link "alterar" no
painel, salvo localmente no navegador via `chrome.storage.local`).

### Como funciona

1. O content script (`src/lembretes.js`) identifica o número do processo a
   partir do elemento `#barraTituloStatusProcessual` da tela.
2. Cada processo tem seus lembretes guardados em
   `lembretes/<número do processo>` no Realtime Database configurado em
   `src/firebase-config.js`.
3. Leitura/escrita usam a API REST do Realtime Database (`fetch`); a
   sincronização em tempo real usa `EventSource` apontando para o mesmo
   endpoint (recurso nativo do Realtime Database, sem necessidade do SDK
   completo do Firebase).

### Configuração do Firebase (necessária antes de usar)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
   e ative o **Realtime Database**.
2. Em `src/firebase-config.js`, ajuste `databaseURL` para a URL do seu
   banco.
3. Nas regras do Realtime Database, cole o conteúdo de
   [`firebase-database-rules.json`](./firebase-database-rules.json) (aba
   "Regras" do Realtime Database no console). Essas regras:
   - restringem leitura/escrita apenas ao caminho `lembretes/<processo>`
     (bloqueando a raiz do banco, para evitar listar todos os processos);
   - validam o formato de cada lembrete (texto, cor em hexadecimal, datas).
4. Ajuste também `https://SEU-PROJETO-default-rtdb.firebaseio.com/*` em
   `host_permissions` no `manifest.json`, caso use um projeto diferente do
   já configurado.

### Limitações conhecidas

- Como não há autenticação de usuário configurada, qualquer pessoa que
  conheça a URL do banco e um número de processo pode ler/escrever os
  lembretes daquele processo (a raiz do banco fica bloqueada, então não dá
  para listar processos). Para um controle de acesso mais forte, é possível
  evoluir para Firebase Authentication mantendo a mesma estrutura de dados.
- O nome do autor é informado manualmente (não há como obter automaticamente
  o usuário logado no Projudi a partir da tela de movimentações).
