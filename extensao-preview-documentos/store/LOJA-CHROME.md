# Publicação na Chrome Web Store — edição somente Projudi

Esta branch (`claude/elegant-hopper-tvyp0w`) é a edição da extensão para a
Chrome Web Store. Ela funciona **só no Projudi (TJPR)**: as funções do SEEU
foram retiradas apenas aqui (a branch `principal` continua com as duas).

## O que mudou em relação à `principal`

- `manifest.json`: nome, `short_name` e descrição (até 132 caracteres) da
  loja; saem as permissões de `seeu.pje.jus.br`, `seeutreino.pje.jus.br`,
  `*.amazonaws.com` (armazenamento usado pelo SEEU) e
  `raw.githubusercontent.com` (aviso de versão nova).
- `src/funcionalidades.js`: só o sistema PROJUDI; saem **Localizador
  (SEEU)** e **Localizador na lista (SEEU)** (e os arquivos
  `localizadorSeeu.*` e `localizadorNaLista.*` deixam de ser injetados).
- `src/termosUso.js` e `src/hostGuard.js`: scripts registrados e liberados
  só em `*.tjpr.jus.br`.
- `src/background.js`: operações aceitas só de páginas do Projudi; aviso de
  versão nova desligado (a loja atualiza a extensão sozinha).
- `src/sistemasCnjLista.js` e `rules/sistemasCnj.json`: sai o card **SEEU**
  ao lado da balança e a regra que o abria em popup.
- `src/menuExtensao.js`: sem as abas PROJUDI/SEEU e sem "Copiar para o
  SEEU".
- Termos de Uso, página do manual e manual: textos só com Projudi.

## Ficha da loja (sugestão)

- **Nome (no manifest):** Assistente Projudi – Ações Rápidas e Pré-visualização
- **Nome curto:** Assistente Projudi
- **Resumo (manifest, 132 caracteres):** Assistente do Projudi (TJPR):
  pré-visualiza documentos ao passar o mouse, ações rápidas, preferências e
  envio por WhatsApp e e-mail.
- **Categoria:** Produtividade (Ferramentas / Fluxo de trabalho).
- **Idioma:** Português (Brasil).

**Descrição detalhada** (versão reenviada depois da recusa por "spam de
palavra-chave", ID Yellow Argon: a loja não aceita listas de nomes de
sistemas ou de telas na descrição; descreva o que a função faz, sem
enumerar nomes):

```
Assistente Projudi é uma extensão para servidores(as), assessores(as) e magistrados(as) que trabalham no Projudi do Tribunal de Justiça do Paraná (TJPR). Ela acrescenta botões, atalhos e informações às telas do próprio Projudi para agilizar as rotinas de secretaria e de gabinete.

PRÉ-VISUALIZAÇÃO
• Veja a íntegra do documento ao passar o mouse sobre ele, sem abrir outra aba.
• Nas listas de trabalho, veja o processo ao passar o mouse sobre o número.
• Expanda os anexos, esconda movimentações sem arquivo e destaque as movimentações por tipo de usuário.

AÇÕES RÁPIDAS E PREFERÊNCIAS
• Botões para os atos mais comuns direto na tela do processo.
• Grave os atos que você mais repete como preferências e execute-os com um clique, também em vários processos de uma vez.
• Encadeie várias preferências numa sequência só.

PENDÊNCIAS E LISTAS
• Resolva pendências direto da tela do processo.
• Veja as listas de trabalho numa única página, sem trocar de página.
• Organize os processos com marcações coloridas e tarefas.

INFORMAÇÕES DO PROCESSO
• Dados das partes e avisos importantes no cabeçalho do processo.
• Bloco de anotações por processo.

ENVIO DE DOCUMENTOS
• Selecione arquivos do processo e envie-os pelo WhatsApp Web ou por e-mail (Outlook).

ATALHOS
• Abra, sem sair do processo, os sistemas judiciais que você já usa no dia a dia.

VOCÊ NO CONTROLE
• Nenhum ato processual é praticado sem o seu clique: a extensão preenche e para, para você conferir e confirmar.
• Cada funcionalidade pode ser ligada ou desligada no Menu da extensão.
• Exporte e importe as suas preferências.
• Manual do Usuário completo dentro da própria extensão.

PRIVACIDADE
• Suas preferências ficam guardadas no seu navegador.
• A extensão não envia dados para servidores próprios. Documentos só saem do computador quando você clica em enviar.

AVISO
Extensão independente, sem vínculo oficial com o Tribunal de Justiça do Paraná (TJPR). Antes de usar, a extensão pede o aceite dos Termos de Uso.
```

**Por que o nome ajuda a achar a extensão:** a busca da Chrome Web Store dá
mais peso ao **nome**; com "Projudi" logo no início (e repetido no resumo),
quem pesquisa "Projudi" encontra a extensão de imediato. "Assistente" deixa
claro que é uma ajuda para usar o Projudi, e não o sistema oficial (a loja
recusa nomes que pareçam oficiais), e "Ações Rápidas e Pré-visualização"
cobre as buscas mais comuns de quem procura essas funções.

## Imagens da loja

- **Ícone da extensão (128×128):** `icons/icon128.png` (vai no pacote).
- **Ícone da loja (128×128):** `store/icone-loja-128.png` — a mesma lupa,
  redesenhada (`store/icone-loja.svg`) em 96×96 no centro, com margem
  transparente de 16 px, como pede a Chrome Web Store.
- **Imagem de divulgação pequena (440×280):** `store/promo-pequeno-440x280.png`
  — "Assistente Projudi.", "Seu assistente no Projudi (TJPR)" e as etiquetas
  das funções. Enviada à parte, na ficha da loja (não vai no pacote).
- **Capturas de tela (1280×800 ou 640×400, pelo menos uma):**
  `store/captura-1-tela-do-processo-1280x800.png` — tela do processo com as
  Ações rápidas, Minhas Preferências, Combos e os cards dos sistemas do CNJ.
  Número do processo, nome, RG e demais números trocados por dados
  fictícios, e o card **SEEU** retirado (não existe nesta edição). Novas
  capturas devem seguir o mesmo cuidado.

## Gerar o pacote (.zip) para enviar à loja

Na raiz do repositório:

```bash
cd extensao-preview-documentos && zip -r ../olirum-projudi-webstore.zip . -x "*.md" "desempenho/*" "store/*" "manual/*.mjs" "manual/MANUAL.pdf" "RECONSTRUCAO-CHROME-2.9.9.txt" "icones.png" && zip ../olirum-projudi-webstore.zip manual/MANUAL.md
```

O `manual/MANUAL.md` precisa ir no pacote (o botão **📖 Manual do Usuário**
o abre); os demais `.md` são anotações de desenvolvimento.

## Antes de enviar

- Teste no Projudi o envio por WhatsApp: a permissão `*.amazonaws.com` foi
  retirada por ser usada pelo SEEU; se algum documento do Projudi não for
  enviado, ela precisa voltar.
- A loja pede justificativa para cada permissão (`tabs`, `scripting`,
  `downloads`, `clipboardRead`, `identity`, `declarativeNetRequest`,
  `system.display` e os endereços) e uma política de privacidade.
- Cada envio à loja precisa de um número de versão maior que o anterior.
