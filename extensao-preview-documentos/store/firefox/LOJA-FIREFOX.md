# Publicação no Firefox (addons.mozilla.org)

O pacote do Firefox é gerado a partir da mesma pasta da edição da Chrome
Web Store. Na raiz do repositório:

```bash
node extensao-preview-documentos/store/firefox/gerar-pacote-firefox.mjs
```

O arquivo `assistente-projudi-firefox.zip` sai na raiz do repositório (ou
no caminho passado como argumento). Não faça commit dele.

## O que muda em relação ao pacote do Chrome

- **Nome:** "Assistente Projudi – Ações e Pré-visualização" (o Firefox aceita
  até 45 caracteres).
- **Processo de fundo:** lista de scripts (`background.scripts`), porque o
  Firefox não usa `service_worker`.
- **`src/firefox-compat.js`** (cópia de `store/firefox/firefox-compat.js`),
  carregado antes dos demais:
  - `importScripts` sem efeito (os arquivos já vêm em ordem);
  - leitura auxiliar do **Colar processo** num quadro escondido, no lugar do
    `chrome.offscreen`;
  - downloads de endereços `data:` (anexos do e-mail) convertidos em `blob:`.
- **Identificador:** `assistente-projudi@muriloguedes82`. Não mude depois
  da primeira publicação: o Firefox o usa para reconhecer as atualizações.
- **Versão mínima:** Firefox 140, exigido pela declaração de coleta de dados.
- **Declaração de coleta de dados** (`data_collection_permissions`):
  `websiteContent` (documentos do processo enviados por WhatsApp/e-mail) e
  `personalCommunications` (rascunho de e-mail no Outlook). O Firefox mostra
  isso na instalação.
- Saem as permissões que o Firefox não conhece: `offscreen`,
  `system.display` (abrir sistemas no segundo monitor: no Firefox, abre em
  nova aba) e `windows`.

## Verificação

`addons-linter` 10.15.0 (o mesmo verificador do addons.mozilla.org):
**0 erros**. Avisos esperados:

- `UNSAFE_VAR_ASSIGNMENT` (uso de `innerHTML`): não impedem a publicação.
- `UNSUPPORTED_API` para `system.display` e `offscreen.createDocument`: o
  código confere se existem antes de usar, e o `firefox-compat.js` cobre o
  `offscreen`.
- `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`: refere-se ao Firefox
  para Android, que não é o público da extensão. No envio, marque só
  **Firefox (computador)**.

## Ficha no addons.mozilla.org

- **Resumo (até 250 caracteres):** Assistente do Projudi (TJPR):
  pré-visualiza documentos ao passar o mouse, ações rápidas, preferências e
  combos, e envio de documentos por WhatsApp Web e e-mail (Outlook).
- **Descrição:** a mesma da Chrome Web Store (`store/LOJA-CHROME.md`), sem
  listas de nomes de sistemas.
- **Categoria:** Produtividade (*Productivity*).
- **Política de privacidade:** o texto de `store/POLITICA-DE-PRIVACIDADE.md`
  (o addons.mozilla.org aceita colar o texto direto no campo).
- **Licença:** escolha "Todos os direitos reservados" se o código não for
  aberto.
- **Código-fonte:** não é exigido: o pacote não é minificado nem gerado por
  ferramenta.
- **Notas para o revisor:** a extensão só funciona com login no Projudi
  (TJPR), que exige credenciais de servidor do Tribunal. Explique isso e
  aponte as capturas de tela.

## Antes de publicar

- **Teste no Firefox:** em `about:debugging#/runtime/this-firefox`, clique em
  **Carregar extensão temporária** e escolha o `.zip`. Aceite os Termos de
  Uso e confira no Projudi: pré-visualização, Ações rápidas, Colar processo,
  WhatsApp e e-mail.
- **Envio por e-mail (Outlook):** no Firefox, o endereço de retorno do login
  Microsoft é diferente do Chrome (termina em `.extensions.allizom.org`). Ele
  precisa ser cadastrado no registro do aplicativo no Azure, senão o login
  do Outlook falha.
- Cada envio precisa de um número de versão maior que o anterior.
