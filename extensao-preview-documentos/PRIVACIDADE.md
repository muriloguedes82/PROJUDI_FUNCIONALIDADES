# Política de Privacidade

**Extensão:** Projudi/SEEU - Documentos: Pré-visualização, WhatsApp e E-mail
**Última atualização:** 30/09/2026

Esta extensão é uma ferramenta de produtividade para servidores e
magistrados que usam o Projudi (TJPR) e o SEEU. Ela funciona inteiramente no
navegador do usuário. **O desenvolvedor não mantém servidores, não coleta,
não recebe, não vende e não compartilha nenhum dado dos usuários.**

## Dados tratados e finalidade

| Dado | Onde é usado | Finalidade | Armazenamento |
| --- | --- | --- | --- |
| Conteúdo das páginas do Projudi/SEEU (processos, partes, movimentações, documentos) | Somente no navegador, nas páginas `*.tjpr.jus.br` e `seeu.pje.jus.br` | Exibir pré-visualizações, montar atalhos e preencher formulários a pedido do usuário | Não é armazenado; é lido no momento do uso |
| Documentos selecionados pelo usuário para envio | Transferidos do Projudi/SEEU para o WhatsApp Web ou para o Outlook/Microsoft Graph | Anexar os arquivos na conversa ou no e-mail escolhido pelo próprio usuário | Guardados temporariamente em `chrome.storage.local` só até o anexo ser concluído |
| Contatos, destinatários e remetentes favoritos, preferências de ações rápidas, listas de tarefas, funcionalidades ligadas no Menu | Somente no navegador | Evitar redigitação e organizar o trabalho | `chrome.storage.local` / `chrome.storage.sync` do próprio usuário |
| Aceite dos Termos de Uso (versão e data) | Somente no navegador | Liberar as funcionalidades após o aceite | `chrome.storage.local` |
| Arquivo de backup das preferências | Gerado e lido só quando o usuário clica em "Exportar"/"Importar" no Menu | Levar as preferências para outro computador | Arquivo `.json` salvo pelo próprio usuário |
| Client ID/Tenant ID do Azure AD e token de acesso da Microsoft | Somente no navegador e nas chamadas a `login.microsoftonline.com` e `graph.microsoft.com` | Criar rascunhos de e-mail na conta Outlook do próprio usuário (modo Graph, opcional) | `chrome.storage.sync` (configuração) e `chrome.storage.local` (token) |
| Texto da área de transferência | Somente quando o usuário clica em "📋 Processo copiado" | Ler o número do processo copiado e abri-lo | Não é armazenado |

## Compartilhamento

Os dados só saem do navegador quando **o próprio usuário** manda enviar um
documento — e, nesse caso, vão diretamente para o serviço escolhido por ele
(WhatsApp Web ou Microsoft Outlook/Graph), sob os termos desses serviços.
Nenhum dado é enviado ao desenvolvedor ou a terceiros.

## Uso limitado

O uso das informações recebidas pela extensão segue a
[Política de Dados de Usuário da Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
incluindo os requisitos de Uso Limitado. Os dados não são usados para
publicidade, perfis de usuário, avaliação de crédito nem transferidos para
fins alheios às funções descritas acima.

## Remoção dos dados

Todos os dados guardados pela extensão ficam no perfil do navegador e são
apagados ao remover a extensão em `chrome://extensions`.

## Contato

Dúvidas: abra uma *issue* em
<https://github.com/muriloguedes82/PROJUDI_FUNCIONALIDADES/issues>.
