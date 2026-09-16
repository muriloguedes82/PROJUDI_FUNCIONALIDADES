# Catálogo de Funcionalidades

Este documento sintetiza **todas as funcionalidades existentes** no
repositório, servindo como referência única e atualizada do que já foi
implementado. Ele cobre a extensão de navegador em
[`extensao-preview-documentos/`](./extensao-preview-documentos), hoje o único
componente de código do projeto.

> **Regra de manutenção:** sempre que o código principal (qualquer arquivo em
> `extensao-preview-documentos/src/` ou `manifest.json`) for alterado — nova
> funcionalidade, remoção, ou mudança relevante de comportamento — este
> arquivo deve ser atualizado no mesmo commit/PR, junto com o `README.md`
> correspondente. Não deixe a documentação dessincronizar do código.

## Visão geral

Extensão de navegador (Chrome/Edge, Manifest V3) para as telas de processo do
**Projudi** (TJPR) e do **SEEU**, que compartilham o mesmo padrão de link de
documento. Arquivo de manifesto: `extensao-preview-documentos/manifest.json`
(versão atual: `2.7.0`).

## Índice de funcionalidades

| # | Funcionalidade | Sistemas | Arquivo(s) principal(is) |
|---|---|---|---|
| 1 | Pré-visualização de documentos ao passar o mouse | Projudi + SEEU | `content.js`, `content.css` |
| 2 | Pré-visualização de pendências (Análise de Juntadas/Conclusões) | Projudi | `content.js` |
| 3 | Botão "Dispensar juntadas" em segundo plano | Projudi | `juntadaDrag.js`, `juntadaDrag.css` |
| 4 | Seleção de documentos (checkboxes) | Projudi + SEEU | `documentSelection.js` |
| 5 | Envio de documentos por WhatsApp Web | Projudi + SEEU | `whatsapp.js`, `background.js` |
| 6 | Envio de documentos por e-mail (Outlook / Microsoft Graph) | Projudi + SEEU | `email.js`, `email.css`, `owa-attach.js`, `owa-attach.css` |
| 7 | Ações rápidas (atalhos para o painel "Ações" do Projudi) | Projudi | `quickActions.js`, `quickActions.css` |
| 8 | Preferências de preenchimento das ações rápidas | Projudi | `quickActions.js` |
| 9 | Ocultar itens zerados na Mesa do Analista/Escrivão | Projudi | `mesaAnalistaContadores.js` |
| 10 | Reposicionamento (arrastar) dos botões flutuantes | Projudi + SEEU | `buttonDrag.js` |
| 11 | Convivência com a extensão AzFlow | SEEU | `content.js` |
| 12 | Download resiliente a CORS via service worker | Projudi + SEEU | `background.js` |
| 13 | Autenticação Microsoft Graph (OAuth via `chrome.identity`) | — | `background.js`, `options.html`, `options.js` |
| 14 | Modo alternativo de e-mail sem Azure AD (fallback semiautomático) | — | `email.js`, `owa-attach.js` |
| 15 | Página de opções da extensão | — | `options.html`, `options.js` |
| 16 | Fechamento robusto de popups nativos do Projudi (`flagClosePopup`) | Projudi | `closeShim.js`, `quickActions.js` |
| 17 | Cópia de arquivos para a área de transferência (offscreen) | Projudi + SEEU | `clipboardProcess.js`, `clipboardOffscreen.js`, `clipboardOffscreen.html` |
| 18 | Resiliência a troca de abas / recriação de containers do DOM | Projudi + SEEU | `content.js`, `email.js`, `quickActions.js` |

## Detalhamento

### 1. Pré-visualização de documentos
Ao passar o mouse (~350ms) sobre o link de um arquivo de movimentação
(`a.link[href*="arquivo.do"]`), abre um `<iframe>` sobreposto com a íntegra do
documento, reaproveitando a sessão autenticada. Fecha ao tirar o mouse, no
"✕" ou `Esc`. Atalho para abrir em nova aba sempre disponível.

### 2. Pré-visualização de pendências
No quadro **Pendências** da capa do processo (`analisarJuntada.do`), carrega
a tela de análise num iframe oculto, expande apenas as linhas realmente
pendentes (via checkbox de seleção) e abre um painel de pré-visualização por
documento encontrado — em cascata quando há mais de uma pendência. Nenhuma
ação de aceitar/rejeitar é simulada.

### 3. Botão "Dispensar juntadas"
Adiciona um botão ao lado do link de análise no quadro Pendências que
dispensa, em segundo plano, todas as juntadas selecionáveis da página
(usando a confirmação nativa já existente), sem navegar a tela visível.
Mostra andamento/sucesso ou erro com detalhes; fica desabilitado durante a
operação; não percorre múltiplas páginas; o clique manual no link continua
funcionando. Substituiu uma versão anterior baseada em arrastar-e-soltar
(ver `TESTE-GESTO-JUNTADAS.md`).

### 4. Seleção de documentos
Adiciona uma checkbox ao lado de cada link de arquivo (`a.link[href*="arquivo.do"]`)
das movimentações, usada tanto pelo envio por WhatsApp quanto pelo envio por
e-mail. A seleção sobrevive a reconstruções do DOM feitas pelo Projudi/SEEU
ao trocar de aba.

### 5. Envio por WhatsApp Web
Botão flutuante "Enviar por WhatsApp" baixa os arquivos marcados (via
`background.js`, contornando CORS), abre/reaproveita uma aba do WhatsApp Web
já na conversa do número informado (link oficial `web.whatsapp.com/send?phone=`)
e anexa os arquivos automaticamente (colar/CTRL+V, com fallback para
arrastar-e-soltar). Inclui lista de **destinatários salvos** (nome + número,
busca, favoritos) em `chrome.storage.local`. O envio da mensagem em si
continua manual.

### 6. Envio por e-mail (Outlook)
Checkbox por documento + botões flutuantes "👥 Destinatários" e "Enviar por
e-mail" (funciona com ou sem arquivos marcados). Cria um rascunho no Outlook
institucional via Microsoft Graph com os anexos, destinatário(s) e um texto
padrão (número dos autos + juízo, extraídos da própria página), aberto num
pop-up menor. Inclui:
- **Destinatários favoritos** (até 200, com busca, prioridade e ordenação).
- **Remetentes salvos** (até 20, campo "De" via `owa-attach.js`, modo sem
  Azure AD).
- **Modo automático (Graph)** e **modo alternativo sem Azure AD**
  (semiautomático: baixa os arquivos e orienta anexar manualmente, pois o
  Outlook Web bloqueia anexo automático por script).

### 7. Ações rápidas (painel "Ações" do Projudi)
Um botão flutuante por grupo de ações (Concluso, Remessa, Ordenações,
Partes, Suspender, Transitar, Arquivar, Outras). Na tela com o painel
"Ações", abre o diálogo nativo diretamente; em outras telas com a lista de
Movimentações, resolve a URL do diálogo navegando um iframe oculto (nunca a
tela visível) e abre um popup só com o diálogo final. Detecta e fecha
automaticamente popups presos em "Aguarde..." lendo o campo `flagClosePopup`.

### 8. Preferências das ações rápidas
Permite salvar o preenchimento de um diálogo de ação como preferência
nomeada e reaplicá-la depois com confirmação explícita
("✅ Sim, executar"). Localização heurística de formulário/campos/botão de
confirmação, guardada em `chrome.storage.local` por ação.

### 9. Ocultar itens zerados (Mesa do Analista/Escrivão)
Nas telas `mesaAnalista*.do`, oculta linhas cujo contador (`<span
class="contador">`) esteja zerado, reexibindo automaticamente via
`MutationObserver` quando o valor voltar a ser maior que zero (a página
atualiza via AJAX sem recarregar).

### 10. Reposicionamento dos botões flutuantes
Permite arrastar verticalmente o grupo de botões (WhatsApp, e-mail, ações
rápidas), compartilhando a mesma posição salva entre eles.

### 11. Convivência com o AzFlow (SEEU)
No domínio do SEEU, detecta se o AzFlow está ativo e, se estiver, não abre a
própria pré-visualização de documentos (deixa o AzFlow cuidar disso),
mantendo seleção/WhatsApp/e-mail funcionando normalmente. Nunca insere
elementos dentro da árvore de outra extensão nem chama
`stopPropagation()`/`stopImmediatePropagation()` em eventos nativos.

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

## Limitações conhecidas (resumo)

- Só funciona para documentos exibíveis em `<iframe>` (ex.: PDF).
- `host_permissions` restrito a `*.tjpr.jus.br`, `seeu.pje.jus.br` e domínios
  auxiliares (`amazonaws.com`, WhatsApp Web, Microsoft Graph/Outlook) — para
  outro Tribunal, ajustar `manifest.json`.
- Detecção de telas do SEEU validada a partir de HTML estático, não testes
  ao vivo.
- Envio por e-mail via Graph exige cadastro prévio no Azure AD pelo TI; sem
  isso, usa o modo alternativo semiautomático.
- Preenchimento de preferências das ações rápidas é heurístico e não foi
  validado ao vivo no Projudi.

Para detalhes completos de cada funcionalidade, fluxo de uso e configuração,
veja o [README da extensão](./extensao-preview-documentos/README.md).
