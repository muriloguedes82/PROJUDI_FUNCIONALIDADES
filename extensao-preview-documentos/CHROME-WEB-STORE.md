# Publicação na Chrome Web Store

Roteiro para publicar (ou atualizar) a extensão no
[Painel de Desenvolvedor da Chrome Web Store](https://chrome.google.com/webstore/devconsole).

## 1. Gerar o pacote

```bash
python3 extensao-preview-documentos/scripts/gerar-icones.py   # só se os ícones mudarem
bash extensao-preview-documentos/scripts/empacotar.sh
```

O arquivo sai em `extensao-preview-documentos/dist/` (ignorado pelo git) e
contém só `manifest.json`, `src/` e `icons/`. A cada nova submissão, a
`version` do `manifest.json` precisa ser maior que a publicada.

## 2. O que já foi ajustado no manifesto

- **Ícones** 16/32/48/128 px em `icons/` (o de 128 px tem a margem
  transparente de 16 px recomendada).
- **Descrição** com até 132 caracteres (limite da loja); o texto longo vai
  na ficha (item 3).
- **Permissões mínimas**: removidas `tabs` (a busca da aba do WhatsApp Web
  já é coberta pela permissão de host `web.whatsapp.com`) e `windows` (não
  existe como permissão; `chrome.windows` funciona sem ela e a loja
  acusaria aviso).
- `options_ui` no lugar de `options_page`.
- `minimum_chrome_version: 116` (usa `chrome.offscreen` e
  `chrome.runtime.getContexts`).
- Nenhum código remoto: todos os scripts estão no pacote, sem `eval` nem
  `new Function` (exigência do Manifest V3).

## 3. Ficha da loja

- **Categoria:** Produtividade (Ferramentas de trabalho).
- **Idioma:** Português (Brasil).
- **Descrição detalhada** (sugestão):

  > Ferramentas de produtividade para quem trabalha no Projudi (TJPR) e no
  > SEEU:
  > • pré-visualização da íntegra de documentos ao passar o mouse, sem
  >   abrir outra aba (movimentações e pendências de juntada/conclusão);
  > • envio dos documentos selecionados por WhatsApp Web ou por e-mail
  >   (Outlook), já anexados;
  > • painel de ações rápidas, com preferências gravadas para Juntar
  >   Documento, Alvará Eletrônico, remessas e ordenações;
  > • destaque de movimentações por tipo de usuário, indicadores de
  >   suspensão e monitoração eletrônica ativas, sequencial do processo
  >   principal, RG/CPF das partes nos cumprimentos, entre outros.
  >
  > A extensão roda só no navegador e não envia dados ao desenvolvedor.
  > Não é um produto oficial do TJPR nem do CNJ.

- **Capturas de tela:** ao menos 1 (até 5), 1280×800 ou 640×400, PNG/JPEG.
  **Não use dados reais de processos** — use um processo de teste ou borre
  nomes, números e documentos.
- **Bloco promocional pequeno:** 440×280 (opcional, mas recomendado).
- **URL da política de privacidade:** link público para `PRIVACIDADE.md`,
  por exemplo
  `https://github.com/muriloguedes82/PROJUDI_FUNCIONALIDADES/blob/principal/extensao-preview-documentos/PRIVACIDADE.md`
  (o repositório precisa estar público, ou publique o texto em outra página).
- **Nome e marcas:** evite sugerir que a extensão é oficial do TJPR/CNJ
  (política de representação enganosa); o aviso na descrição cobre isso.

## 4. Aba "Práticas de privacidade"

**Finalidade única** (sugestão):

> Agilizar o trabalho nos sistemas Projudi (TJPR) e SEEU: visualizar,
> selecionar e enviar documentos do processo e executar ações do sistema
> com menos cliques.

**Justificativa de cada permissão:**

| Permissão | Justificativa |
| --- | --- |
| `identity` | Login OAuth na conta Microsoft do usuário (opcional) para criar o rascunho de e-mail com os documentos anexados via Microsoft Graph. |
| `storage` | Guardar preferências, contatos/destinatários favoritos e a configuração do envio por e-mail. |
| `unlimitedStorage` | Guardar temporariamente os documentos (PDFs) selecionados para envio até serem anexados no WhatsApp Web/Outlook; arquivos grandes excedem a cota padrão. |
| `scripting` | Injetar o script de anexo na aba do WhatsApp Web e acionar funções nativas das páginas do Projudi (ex.: abrir a janela do Oráculo, confirmar juntada) quando o usuário clica no botão correspondente. |
| `downloads` | Baixar os documentos selecionados quando o usuário escolhe anexá-los manualmente no Outlook Web. |
| `clipboardRead` | Ler o número de processo copiado quando o usuário clica em "📋 Processo copiado". |
| `offscreen` | Documento auxiliar para essa leitura da área de transferência quando a página do Projudi não permite fazê-la diretamente. |
| Host `*.tjpr.jus.br`, `seeu.pje.jus.br` | Páginas onde a extensão atua. |
| Host `*.amazonaws.com` | O SEEU redireciona o download do documento para um bucket S3 com URL assinada; o service worker precisa buscar esse endereço. |
| Host `web.whatsapp.com` | Anexar os documentos na conversa do WhatsApp Web. |
| Host `login.microsoftonline.com`, `graph.microsoft.com` | Autenticação e criação do rascunho de e-mail (modo Graph). |
| Host `outlook.office.com`, `outlook.office365.com` | Anexar os documentos no Outlook Web (modo alternativo). |

**Código remoto:** "Não, não estou usando código remoto".

**Uso de dados** — marcar:
- *Informações de identificação pessoal* e *Conteúdo do site* (a extensão
  lê páginas dos processos e envia documentos a pedido do usuário);
- *Informações de autenticação* (token da Microsoft, guardado localmente).

E certificar as três declarações (não vende dados; não usa para fins
alheios à finalidade única; não usa para crédito/empréstimos).

## 5. Visibilidade

Se a extensão for só para uso interno do tribunal, considere publicar como
**Não listada** (acessível apenas por link) ou **Privada** (restrita a um
domínio do Google Workspace), o que costuma simplificar a revisão.
