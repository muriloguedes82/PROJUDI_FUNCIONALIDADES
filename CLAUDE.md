# Regras do repositório

## Idioma das respostas

Responda ao usuário **sempre em português**, em todas as mensagens e em
qualquer conversa nova (decisão do usuário, versão 12). Isso vale também
para avisos curtos de andamento, perguntas e resumos finais.

## Numeração das versões

Desde a versão 3 (decisão do usuário), cada nova versão da extensão usa um
**número inteiro**, somado de 1 em 1: `"version": "3"`, depois `"4"`, `"5"`
etc. no `manifest.json`, para função nova, mudança de comportamento ou
correção de erro. Não use mais números com pontos (como 2.61.0 ou
2.60.1.1). A 3 sucede a 2.61.0; o aviso de versão nova compara número a
número, então 3 > 2.61.0 e as próximas continuam sendo maiores.

**Uma versão por mesclagem (decisão do usuário, versão 24):** o número só
sobe quando há uma mesclagem nova na `principal`. Enquanto uma branch está
sendo criada, sem mesclar, ela usa **a versão da `principal` + 1** (ex.:
`principal` na 23 → a branch usa a 24) e **mantém esse número**, por mais
correções e ajustes que se façam nela. Antes de mudar `version`, confira a
versão da `principal` (`git show origin/principal:extensao-preview-documentos/manifest.json`):
se a branch já estiver nela + 1, não mude. Se a `principal` avançar antes
da mesclagem (outra branch mesclada), a branch passa a usar a nova versão
da `principal` + 1.

## Manual da extensão (obrigatório a cada versão)

Toda mudança que altera `version` em `extensao-preview-documentos/manifest.json`
(função nova, mudança de comportamento ou correção de erro) deve atualizar,
**no mesmo commit/PR**, o manual em `extensao-preview-documentos/manual/MANUAL.md`, seguindo
`extensao-preview-documentos/manual/COMO-ATUALIZAR.md`:

Na mesma branch (sem mesclar), cada correção nova continua na mesma versão
(veja "Uma versão por mesclagem"): atualize a capa (data), o texto e a
**mesma linha** do Anexo A daquela versão, em vez de criar outra.

1. capa (versão do manual = versão da extensão, e data);
2. seção da função (e o Sumário, se a seção for nova);
3. vídeo da função em `videos-do-manual/` quando o que aparece na tela mudou
   (cena em `videos-do-manual/fonte/cenas*.js`, gravada com
   `node videos-do-manual/fonte/gravar.mjs Vnn`). Desde a versão 2.53.2
   (decisão do usuário) os vídeos **continuam sendo gravados**, mas ficam
   fora da extensão e **não são citados no manual**, para uso futuro;
4. linha nova no Anexo A (histórico);
5. `node extensao-preview-documentos/manual/verificar-manual.mjs --corrigir` e depois
   `node extensao-preview-documentos/manual/verificar-manual.mjs` até sair "Manual OK" (não há CI
   automático: a verificação é feita à mão antes do commit).

O manual fica dentro da extensão porque o botão **📖 Manual do Usuário** do
Menu (ícone da balança) o abre a partir de `manual/MANUAL.md`. Os vídeos
não: ficam em `videos-do-manual/`, na raiz do repositório. Ao criar uma funcionalidade nova, inclua-a também no catálogo
`src/funcionalidades.js` e na tabela do manual (seção 2.6).

O manual é escrito para quem só conhece o Projudi: sem termos técnicos.

## Só Projudi (versão 18)

Desde a versão 18 (decisão do usuário) a extensão funciona **só no
Projudi**: todas as funções do SEEU foram retiradas. O código completo da
versão 17 (com o SEEU) está guardado na branch `backup-seeu-versao-17`;
veja `SEEU-RECUPERAR.md` na raiz. Não acrescente funções para o SEEU sem
pedido do usuário. O card **SEEU** dos Sistemas do CNJ (abre o SEEU num
popup a partir do Projudi) continua.

## Pendências antes de uma preferência

Antes de executar uma preferência ou combo (tela do processo e ⭐ das
listas), a extensão pergunta se deve dispensar as juntadas/decursos ou
finalizar a conclusão pendentes, e faz isso pelos mesmos recursos dos botões
do quadro Pendências (ver `executarComPendencias` em `src/quickActions.js`
e a REGRA no início de `src/preferenciasNaLinha.js`).
