# Apêndice técnico

Complemento de [`FUNCIONALIDADES.md`](./FUNCIONALIDADES.md) com os
mecanismos internos que sustentam as funcionalidades voltadas ao usuário
final. Não são funcionalidades visíveis por si só, mas fazem parte do que
deve ser mantido atualizado junto com o código (ver regra de manutenção em
`FUNCIONALIDADES.md` e `CLAUDE.md`).

| # | Mecanismo | Arquivo(s) principal(is) |
|---|---|---|
| 14 | Download resiliente a CORS via service worker | `background.js` |
| 15 | Autenticação Microsoft Graph (OAuth via `chrome.identity`) | `background.js`, `options.html`, `options.js` |
| 16 | Modo alternativo de e-mail sem Azure AD (fallback semiautomático) | `email.js`, `owa-attach.js` |
| 17 | Página de opções da extensão | `options.html`, `options.js` |
| 18 | Fechamento robusto de popups nativos do Projudi (`flagClosePopup`) | `closeShim.js`, `quickActions.js` |
| 19 | Cópia de arquivos para a área de transferência (offscreen) | `clipboardProcess.js`, `clipboardOffscreen.js`, `clipboardOffscreen.html` |
| 20 | Resiliência a troca de abas / recriação de containers do DOM | `content.js`, `email.js`, `quickActions.js` |
| 21 | Fila de ordenações + reenvio em segundo plano ("Nova Ordenação") | `ordenarCumprimentos.js`, `ordenarCumprimentos.css` |
| 22 | Identificação do tipo de usuário via id nativo de "Realces" | `movementHighlight.js`, `movementHighlight.css` |

### 14. Download resiliente a CORS
`background.js` (service worker) baixa os arquivos selecionados a partir do
próprio contexto da extensão, contornando bloqueios de CORS de sistemas como
o SEEU (que redireciona para um bucket S3 com URL assinada).

### 15. Autenticação Microsoft Graph
Usa `chrome.identity` (OAuth/Azure AD) para autenticar no Outlook
institucional e criar rascunhos de e-mail via Microsoft Graph
(`Mail.ReadWrite`). Configuração de Client ID/Tenant ID feita na página de
opções.

### 16. Modo alternativo sem Azure AD
Fallback que não exige cadastro de TI: baixa os arquivos, abre o Outlook Web
real num pop-up e orienta o anexo manual; tenta revelar/selecionar o campo
"De" via `owa-attach.js`.

### 17. Página de opções
`options.html`/`options.js` — configuração do modo de envio (Automático /
Graph / Outlook Web sem Azure AD), Client ID e Tenant ID.

### 18. Fechamento robusto de popups nativos
`closeShim.js`, injetado em `document_start` em todos os frames, e lógica em
`quickActions.js` que lê o campo oculto `flagClosePopup` para fechar
diálogos que ficariam presos em "Aguarde..." dentro de popups criados pela
extensão (o formulário nativo que faria isso automaticamente não existe
nesse contexto).

### 19. Cópia para área de transferência (offscreen)
`clipboardProcess.js` + `clipboardOffscreen.js`/`.html` usam a API
`offscreen` para copiar arquivos para a área de transferência do sistema
fora do contexto normal da página.

### 20. Resiliência a troca de abas
Todos os elementos injetados (botões, checkboxes, painéis) são anexados
direto ao `document.body`/`document.documentElement` com posição fixa,
nunca dependendo de um elemento nativo específico continuar existindo —
reconciliados periodicamente (~700ms) para sobreviver a trocas de aba que
substituem containers inteiros do DOM no Projudi/SEEU.

### 21. Fila de ordenações + reenvio em segundo plano
O botão "🔁 Nova Ordenação" (`ordenarCumprimentos.js`) não envia o
formulário: guarda os campos preenchidos numa fila em memória e limpa o
diálogo visível para a próxima ordenação. Só quando o "Ordenar" nativo é
clicado de verdade, cada item da fila resolve e carrega um **diálogo novo do
mesmo tipo em segundo plano**, num iframe oculto (reaproveitando a mesma
cadeia de resolução de URL do recurso "Ações rápidas",
`resolveDialogUrl`) — nunca reenviando o mesmo formulário/token já visível,
porque testes ao vivo mostraram que reaproveitar o token de sessão de uma
página ainda aberta pode ser aceito pelo Projudi sem indicar erro, mas sem
registrar a ação de fato (padrão comum em tokens de uso único
Java/Struts). Só depois de todos os itens da fila serem confirmados em
segundo plano é que o clique final em "Ordenar" segue o fluxo 100% nativo
para o formulário visível. Se algum item da fila for rejeitado, a extensão
para e mantém esse item na fila, sem prosseguir com o restante. Diagnóstico
disponível em `window.__pdpNovaOrdenacaoLog` (persistido em
`sessionStorage`, sobrevive à navegação de saída, inclusive em nova aba).
Ainda não validado em produção para "Ordenar RPV"/"Ordenar Expedição BNMP"
nem toda a variedade de tipos de cumprimento.

### 22. Identificação do tipo de usuário via id nativo de "Realces"
`movementHighlight.js` lê o `id` de cada `<tr>` de movimentação, no formato
`mov1Grau,GRUPO,,,,,` (ex.: `mov1Grau,ADVOGADO,,,,,`, `mov1Grau,JUIZ,,,,,`,
`mov1Grau,PROMOTOR,,,,,`) — a mesma informação que o quadro nativo
"Realces" do Projudi usa, mais confiável do que ler o texto da coluna
"Movimentado Por". Quando esse id não existe (ex.: SEEU, ou layout
diferente), cai de volta na leitura do texto da coluna. A preferência de
cores/tipos marcados fica em `chrome.storage.local` (`movementHighlightPrefs`)
e é aplicada de novo a cada abertura da aba Movimentações, em qualquer
processo. O script evita rodar dentro dos iframes ocultos usados por
`content.js` (varredura de pendências) e pelas Ações Rápidas.
