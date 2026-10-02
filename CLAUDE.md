# Regras do repositório

## Manual da extensão (obrigatório a cada versão)

Toda mudança que altera `version` em `extensao-preview-documentos/manifest.json`
(função nova, mudança de comportamento ou correção de erro) deve atualizar,
**no mesmo commit/PR**, o manual em `extensao-preview-documentos/manual/MANUAL.md`, seguindo
`extensao-preview-documentos/manual/COMO-ATUALIZAR.md`:

1. capa (versão do manual = versão da extensão, e data);
2. seção da função (e o Sumário, se a seção for nova);
3. vídeo da função em `extensao-preview-documentos/manual/videos/` quando o que aparece na tela mudou
   (cena em `extensao-preview-documentos/manual/videos/fonte/cenas*.js`, gravada com
   `node extensao-preview-documentos/manual/videos/fonte/gravar.mjs Vnn`);
4. linha nova no Anexo B (histórico);
5. `node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir` e depois
   `node extensao-preview-documentos/manual/verificar-manual.mjs` até sair "Manual OK" (não há CI
   automático: a verificação é feita à mão antes do commit).

O manual fica dentro da extensão porque o botão **📖 Manual do Usuário** do
Menu (ícone da balança) o abre a partir de `manual/MANUAL.md`, com os
vídeos. Ao criar uma funcionalidade nova, inclua-a também no catálogo
`src/funcionalidades.js` e na tabela do manual (seção 2.6).

O manual é escrito para quem só conhece o Projudi: sem termos técnicos.

## Projudi × SEEU: pendências antes de uma preferência

O **Projudi** trava as ações enquanto houver juntadas ou conclusões
pendentes; por isso, lá, antes de executar uma preferência ou combo (tela do
processo e ⭐ das listas), a extensão pergunta se deve dispensar as
juntadas/decursos ou finalizar a conclusão. **Mantenha isso no Projudi.**

O **SEEU não tem essa trava**: lá **não** se pergunta nada sobre dispensar
juntadas ou finalizar conclusões, e nada é dispensado/finalizado — a
preferência é executada direto. Não acrescente essas perguntas ao SEEU
(ver `executarComPendencias` em `src/quickActions.js` e a REGRA no início de
`src/preferenciasNaLinha.js`).
