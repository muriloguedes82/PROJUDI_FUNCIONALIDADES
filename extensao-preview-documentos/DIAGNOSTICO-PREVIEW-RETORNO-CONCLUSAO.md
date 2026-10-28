# Diagnóstico: processo ao passar o mouse no Retorno de Conclusão para de funcionar

Versão analisada: 2.55.4. Ainda não corrigido.

## Relato

> "estou encontrando alguns bugs no retorno de conclusão, ao tentar ver como
> está o processo parando em cima do número do processo, ele só mostra os
> primeiros 5 processos, depois não funciona mais"

A função é a de `src/previewProcesso.js`: na lista Retorno de Conclusão do
Projudi (`processo/conclusao.do`), pousar o mouse sobre o número abre a tela
do processo num painel sobreposto.

## Como foi testado

`desempenho/retorno-conclusao-hover.mjs` carrega a extensão inteira num
Chromium, abre uma lista que imita a do Projudi (número só como texto, link
"Analisar" na linha, telas "Dados da Conclusão", busca por número e tela do
processo) e passa o mouse sobre o número de cada processo, conferindo se o
painel mostra o processo certo.

| Cenário | Resultado |
|---|---|
| Mouse sai da lista entre um número e outro (1600 px, 12 processos) | todos abrem |
| Idem, com a tela "Dados da Conclusão" trazendo o link do processo (`COM_LINK=1`) | todos abrem |
| Projudi lento (`LATENCIA=1500`, 1366 px, 25 processos, com rolagem) | todos abrem |
| Mouse desce direto de um número para o seguinte (`CONTINUO=1`), 1366 px ou mais | todos abrem |
| **Mouse desce direto de um número para o seguinte, janela de 1340 px ou menos** | **só o 1º abre; os seguintes não** |
| Janela de 1024 px, mas o mouse sai do painel antes de ir ao próximo número | todos abrem |

Não há limite de quantidade no código (nenhum contador de processos, e o
cache de endereços é por linha), e nada se acumula entre um processo e
outro: cada passagem faz os mesmos pedidos ao Projudi (tela "Dados da
Conclusão", busca e tela do processo).

## Causa encontrada

`positionPanel` põe o painel (1100 px de largura, 88% da altura) à direita do
número. Quando não cabe — janela com menos de ~1100 px além da coluna do
número —, ele é **centralizado na tela** e passa a cobrir a coluna dos
números. O painel abre debaixo do mouse; ao descer para o próximo número, o
mouse está sobre o painel, não sobre o número, e o painel continua mostrando
o processo anterior (com o mouse dentro dele, ele não fecha). Para ver outro
processo é preciso tirar o mouse do painel (pela borda da tela) e voltar à
lista.

No simulador o limite foi ~1340 px. No Projudi real a coluna do número fica
mais à direita (cabeçalho, caixa de seleção, ⭐ das preferências) e o zoom do
navegador (110%–125%) reduz a largura útil, então o problema aparece em
telas comuns, como notebooks de 1366 px.

## Conclusão

O relato **tem fundamento**: em janelas estreitas (ou com zoom), depois do
primeiro processo o painel cobre os números e a pré-visualização "para de
funcionar" para quem passa o mouse de um número ao outro. O número exato
("5") depende da altura da tela e de onde o usuário tira o mouse; o
simulador não mostrou nenhum limite fixo de processos.

Não foi possível testar contra o Projudi de verdade (sem acesso da
máquina de testes). Se a correção abaixo não resolver para o usuário,
vale pedir: largura da janela e zoom do navegador, e se o painel ainda
aparece (com o processo anterior) ou não aparece mais nada.

## Correção sugerida (não aplicada)

Em `positionPanel` (`src/previewProcesso.js`), nunca cobrir a coluna do
número: sem espaço à direita, encolher o painel para caber entre o número e
a borda direita (com uma largura mínima) e, só se nem isso couber, pô-lo
acima ou abaixo da linha. Mudança de comportamento: exige versão nova,
manual (capa, seção da função, Anexo A) e `verificar-manual.mjs`, conforme
o CLAUDE.md.

Para conferir: `CONTINUO=1 LARGURA=1280 node desempenho/retorno-conclusao-hover.mjs`
deve sair com "RESULTADO: OK, todos abriram".
