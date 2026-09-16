# Apêndice técnico

Complemento de [`FUNCIONALIDADES.md`](./FUNCIONALIDADES.md) com os
mecanismos internos que sustentam as funcionalidades voltadas ao usuário
final. Não são funcionalidades visíveis por si só, mas fazem parte do que
deve ser mantido atualizado junto com o código (ver regra de manutenção em
`FUNCIONALIDADES.md` e `CLAUDE.md`).

| # | Mecanismo | Arquivo(s) principal(is) |
|---|---|---|
| 12 | Download resiliente a CORS via service worker | `background.js` |
| 13 | Autenticação Microsoft Graph (OAuth via `chrome.identity`) | `background.js`, `options.html`, `options.js` |
| 14 | Modo alternativo de e-mail sem Azure AD (fallback semiautomático) | `email.js`, `owa-attach.js` |
| 15 | Página de opções da extensão | `options.html`, `options.js` |
| 16 | Fechamento robusto de popups nativos do Projudi (`flagClosePopup`) | `closeShim.js`, `quickActions.js` |
| 17 | Cópia de arquivos para a área de transferência (offscreen) | `clipboardProcess.js`, `clipboardOffscreen.js`, `clipboardOffscreen.html` |
| 18 | Resiliência a troca de abas / recriação de containers do DOM | `content.js`, `email.js`, `quickActions.js` |

### 12. Download resiliente a CORS
`background.js` (service worker) baixa os arquivos selecionados a partir do
próprio contexto da extensão, contornando bloqueios de CORS de sistemas como
o SEEU (que redireciona para um bucket S3 com URL assinada).

### 13. Autenticação Microsoft Graph
Usa `chrome.identity` (OAuth/Azure AD) para autenticar no Outlook
institucional e criar rascunhos de e-mail via Microsoft Graph
(`Mail.ReadWrite`). Configuração de Client ID/Tenant ID feita na página de
opções.

### 14. Modo alternativo sem Azure AD
Fallback que não exige cadastro de TI: baixa os arquivos, abre o Outlook Web
real num pop-up e orienta o anexo manual; tenta revelar/selecionar o campo
"De" via `owa-attach.js`.

### 15. Página de opções
`options.html`/`options.js` — configuração do modo de envio (Automático /
Graph / Outlook Web sem Azure AD), Client ID e Tenant ID.

### 16. Fechamento robusto de popups nativos
`closeShim.js`, injetado em `document_start` em todos os frames, e lógica em
`quickActions.js` que lê o campo oculto `flagClosePopup` para fechar
diálogos que ficariam presos em "Aguarde..." dentro de popups criados pela
extensão (o formulário nativo que faria isso automaticamente não existe
nesse contexto).

### 17. Cópia para área de transferência (offscreen)
`clipboardProcess.js` + `clipboardOffscreen.js`/`.html` usam a API
`offscreen` para copiar arquivos para a área de transferência do sistema
fora do contexto normal da página.

### 18. Resiliência a troca de abas
Todos os elementos injetados (botões, checkboxes, painéis) são anexados
direto ao `document.body`/`document.documentElement` com posição fixa,
nunca dependendo de um elemento nativo específico continuar existindo —
reconciliados periodicamente (~700ms) para sobreviver a trocas de aba que
substituem containers inteiros do DOM no Projudi/SEEU.
