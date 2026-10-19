# Regras do repositório

## Manual da extensão (obrigatório a cada versão)

Toda mudança que altera `version` em `extensao-preview-documentos/manifest.json`
(função nova, mudança de comportamento ou correção de erro) deve atualizar,
**no mesmo commit/PR**, o manual em `extensao-preview-documentos/manual/MANUAL.md`, seguindo
`extensao-preview-documentos/manual/COMO-ATUALIZAR.md`:

1. capa (versão do manual = versão da extensão, e data);
2. seção da função (e o Sumário, se a seção for nova);
3. vídeo da função em `videos-do-manual/` quando o que aparece na tela mudou
   (cena em `videos-do-manual/fonte/cenas*.js`, gravada com
   `node videos-do-manual/fonte/gravar.mjs Vnn`). Desde a versão 2.53.2
   (decisão do usuário) os vídeos **continuam sendo gravados**, mas ficam
   fora da extensão e **não são citados no manual**, para uso futuro;
4. linha nova no Anexo B (histórico);
5. `node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir` e depois
   `node extensao-preview-documentos/manual/verificar-manual.mjs` até sair "Manual OK" (não há CI
   automático: a verificação é feita à mão antes do commit).

O manual fica dentro da extensão porque o botão **📖 Manual do Usuário** do
Menu (ícone da balança) o abre a partir de `manual/MANUAL.md`. Os vídeos
não: ficam em `videos-do-manual/`, na raiz do repositório. Ao criar uma funcionalidade nova, inclua-a também no catálogo
`src/funcionalidades.js` e na tabela do manual (seção 2.6).

O manual é escrito para quem só conhece o Projudi: sem termos técnicos.

## Projudi e SEEU: pendências antes de uma preferência

Nos **dois sistemas** (decisão do usuário, versão 2.50.0), antes de executar
uma preferência ou combo (tela do processo, painel 📍 Localizador e ⭐ das
listas), a extensão pergunta se deve dispensar as juntadas/decursos ou
finalizar a conclusão pendentes, e faz isso pelos mesmos recursos dos botões
do quadro Pendências (que também existem no SEEU). Mantenha o mesmo
comportamento nos dois (ver `executarComPendencias` em `src/quickActions.js`
e a REGRA no início de `src/preferenciasNaLinha.js`).
