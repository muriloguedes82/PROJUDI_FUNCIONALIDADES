# Regras do repositório

## Manual da extensão (obrigatório a cada versão)

Toda mudança que altera `version` em `extensao-preview-documentos/manifest.json`
(função nova, mudança de comportamento ou correção de erro) deve atualizar,
**no mesmo commit/PR**, o manual em `manual/MANUAL.md`, seguindo
`manual/COMO-ATUALIZAR.md`:

1. capa (versão do manual = versão da extensão, e data);
2. seção da função (e o Sumário, se a seção for nova);
3. vídeo da função em `manual/videos/` quando o que aparece na tela mudou
   (cena em `manual/videos/fonte/cenas*.js`, gravada com
   `node manual/videos/fonte/gravar.mjs Vnn`);
4. linha nova no Anexo B (histórico);
5. `node manual/verificar-manual.mjs --corrigir` e depois
   `node manual/verificar-manual.mjs` até sair "Manual OK" (o CI roda a
   mesma verificação).

O manual é escrito para quem só conhece o Projudi: sem termos técnicos.
