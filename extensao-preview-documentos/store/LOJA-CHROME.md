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

- **Nome (no manifest):** Olirum para Projudi – Ações Rápidas, Pré-visualização e WhatsApp
- **Nome curto:** Olirum Projudi
- **Resumo (manifest, 132 caracteres):** Assistente do Projudi (TJPR):
  pré-visualiza documentos ao passar o mouse, ações rápidas, preferências e
  envio por WhatsApp e e-mail.
- **Categoria:** Produtividade (Ferramentas / Fluxo de trabalho).
- **Idioma:** Português (Brasil).

**Descrição detalhada (sugestão):**

> Olirum para Projudi é um assistente para servidores(as) e magistrados(as)
> que usam o Projudi do Tribunal de Justiça do Paraná (TJPR).
>
> • Pré-visualização: veja a íntegra do documento ao passar o mouse nas
> Movimentações, nas juntadas, conclusões e listas — sem abrir outra aba.
> • Ações rápidas e Minhas Preferências: conclusão, remessa, ordenações,
> intimações e combos com um clique, sempre com sua confirmação.
> • Quadro Pendências: dispensar juntadas e decursos e finalizar conclusões.
> • Listas em uma única página, localizador na lista, tarefas coloridas.
> • Envio de documentos por WhatsApp Web e por e-mail (Outlook).
> • Réus, RG/CPF, suspensão e monitoração no cabeçalho do processo.
> • Atalhos para sistemas do CNJ (BNMP, Sisbajud, Renajud, Infojud, SerpJud…).
>
> Nenhum ato processual é praticado sem o seu clique. Suas preferências
> ficam no seu navegador. Extensão independente, sem vínculo oficial com o
> TJPR ou o CNJ.

**Por que o nome ajuda a achar a extensão:** a busca da Chrome Web Store dá
mais peso ao **nome**; com "Projudi" logo no início (e repetido no resumo),
quem pesquisa "Projudi" encontra a extensão de imediato. "Olirum" mantém a
marca, e "Ações Rápidas, Pré-visualização e WhatsApp" cobre as buscas mais
comuns de quem procura essas funções.

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
