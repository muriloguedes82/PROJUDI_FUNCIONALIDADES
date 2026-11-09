# Funções do SEEU — onde estão e como recuperar

Na **versão 18** (decisão do usuário) a extensão passou a funcionar **só no
Projudi**: todas as funções do SEEU foram retiradas do código, do Menu e do
manual. Nada se perdeu — elas estão guardadas de três formas:

| Onde | O que tem |
|---|---|
| Branch **`backup-seeu-versao-17`** | A extensão **completa da versão 17**, com o SEEU funcionando (código, manual, vídeos e diagnósticos). É a forma mais simples de recuperar tudo. |
| Commit **`4f2abbf`** | O mesmo ponto da branch acima (último commit da `principal` antes da retirada). |
| Pasta [`arquivo-seeu/`](arquivo-seeu/) | Cópia de consulta dos arquivos **exclusivos** do SEEU (Localizador e Localizador na lista), do levantamento das funções do SEEU e dos diagnósticos/ferramentas feitos para ele. Não é carregada pela extensão nem vai no download do botão **2. Atualizar**. |

## O que foi retirado

- **Funções exclusivas do SEEU** (arquivos apagados de `src/`, cópia em
  `arquivo-seeu/src/`): **📍 Localizador** (`localizadorSeeu.js/.css`) e
  **Localizador na lista (SEEU)** (`localizadorNaLista.js/.css`).
- **Funcionamento no SEEU das funções comuns** (trechos tirados de cada
  arquivo): pré-visualização de documentos e convivência com o AzFlow
  (`content.js`), e-mail (`email.js`), Menu com abas PROJUDI/SEEU e ícone na
  faixa do SEEU (`menuExtensao.js`), Ações rápidas do SEEU, Redistribuir e
  Comunicar ao IIPR (`quickActions.js`), ⭐ na linha com o Localizador
  (`preferenciasNaLinha.js`), (Des)Habilitar Advogado do SEEU
  (`habilitarAdvogado.js`), Juntar Documento/Analisar Decurso do SEEU
  (`juntarDocumento.js`, `decursoNaLinha.js`), processo ao passar o mouse
  (`previewProcesso.js`), RG e CPF do Sentenciado
  (`cpfPartesCumprimentos.js`), Mesa do Analista sem zerados
  (`mesaAnalistaContadores.js`), botões do quadro Pendências
  (`juntadaDrag.js`, `dispensarCumprimentos.js`, `finalizarConclusao.js`),
  cards BNMP/SESP/S.U. no SEEU (`sistemasCnj.js`, `sistemasCnjLista.js`),
  documento do Juiz (`previewConclusao.js`), ordem dos botões
  (`ordemBotoesAcoes.js`) e cabeçalho do SEEU nos indicadores
  (`suspensaoAtiva.js`, `monitoracaoAtiva.js`).
- **Acesso ao SEEU**: endereços `seeu.pje.jus.br` e `seeutreino.pje.jus.br`
  saíram de `src/hostGuard.js`, `src/termosUso.js`, `src/background.js` e
  de `rules/sistemasCnj.json`; `seeutreino.pje.jus.br` saiu do
  `manifest.json`.
- **Manual**: seções 8.8 (Localizador), 9.12 (Localizador na lista do SEEU)
  e 10.2 (AzFlow), além dos trechos "No SEEU". Vídeos V40, V41 e V57.

**Continua:** o card **SEEU** dos Sistemas do CNJ, ao lado da balança, que
abre o SEEU num popup **a partir do Projudi** (por isso `seeu.pje.jus.br`
continua no `host_permissions` do `manifest.json` e na regra 2 de
`rules/sistemasCnj.json`).

## Como recuperar

**Usar a versão com SEEU (sem mexer na principal):** baixe a branch
`backup-seeu-versao-17` (no GitHub: botão **Code → Download ZIP** com essa
branch escolhida) e carregue a pasta `extensao-preview-documentos` no
navegador.

**Voltar o SEEU para a versão atual:** o commit que retirou o SEEU pode ser
desfeito com `git revert` (gera um commit novo que devolve tudo o que foi
tirado). Se a `principal` já tiver mudado bastante, compare arquivo a
arquivo com a branch de backup:

```bash
git fetch origin backup-seeu-versao-17
```

```bash
git diff origin/backup-seeu-versao-17 -- extensao-preview-documentos/src
```

As preferências gravadas no SEEU (Localizador, Advogados e Analisar Decurso
do SEEU) continuam no navegador de quem já as tinha e voltam a aparecer
quando o SEEU for recuperado.
