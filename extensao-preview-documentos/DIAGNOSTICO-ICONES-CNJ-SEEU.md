# Diagnóstico: ícones dos Sistemas do CNJ não aparecem no SEEU

Versão analisada: 2.11.1.

## Sintoma

No SEEU, a balança dourada do Menu aparece no alto da tela (ao lado de
**Sair**), mas os ícones coloridos dos sistemas do CNJ (SerpJud, CNIEP,
BNMP 3.0, PrevJud, Sisbajud, SNGB, Sniper e Infojud), que no Projudi ficam
à esquerda da balança, não aparecem. O Menu do SEEU mostra "Sistemas do CNJ"
como ativa (27 de 27), o que dá a impressão de que deveria funcionar.

## Causa

A função foi feita **só para o Projudi** (o manual, seção 8.7, marca
"*Só no Projudi*"), mas o script `src/sistemasCnj.js` é registrado também
para o SEEU (`src/termosUso.js` / `src/funcionalidades.js`) e por isso a
chave aparece no Menu do SEEU. Há quatro travas independentes que impedem os
ícones de funcionar no SEEU:

1. **`src/sistemasCnj.js`, linha 37** — o script encerra se o endereço não
   começa com `/projudi/`. No SEEU o endereço começa com `/seeu/`, então
   nenhum ícone é criado. **É esta a causa direta do sintoma.**
2. **`src/sistemasCnj.js`, `documentoDeProcesso` (linha 176, versão 2.11.1)**
   — os ícones só aparecem com um processo aberto, reconhecido pelo número
   CNJ em `em.attention` (marcador do Projudi). No SEEU o número fica em
   `div.titulo.processo` (o mesmo que `hasProcessNumberMarker` em
   `quickActions.js` e `extractProcessNumber` em `email.js` já tratam).
   Mesmo retirando a trava 1, os ícones continuariam escondidos.
3. **`src/background.js`, mensagem `sistemas-cnj-open`** — os botões
   "🗂 Nova aba" e "🖥 Segundo monitor" só são atendidos para páginas
   `*.tjpr.jus.br` com caminho `/projudi/`.
4. **`rules/sistemasCnj.json`** — a regra que permite exibir os sistemas
   dentro do popup só vale quando a janela é aberta a partir de
   `tjpr.jus.br` (`initiatorDomains`). Aberto do SEEU (`pje.jus.br`), o
   popup ficaria em branco/recusado pelos sistemas.

## Caminhos possíveis

- **Levar os ícones ao SEEU:** liberar `/seeu/` na trava 1; aceitar
  `div.titulo.processo` com o número CNJ em `documentoDeProcesso`; aceitar
  `seeu.pje.jus.br` em `sistemas-cnj-open`; incluir `seeu.pje.jus.br` em
  `initiatorDomains`. Depois, versão nova e manual (capa, 8.7 sem
  "*Só no Projudi*", Anexo B). Convém testar no SEEU real se o quadro onde a
  balança fica enxerga o quadro da tela do processo (mesmo endereço).
- **Manter só no Projudi:** não registrar `sistemasCnj` para o SEEU (ou
  escondê-la na aba SEEU do Menu), para não parecer uma função ativa que
  não faz nada.

## Decisão (versão 2.11.2)

Todos os ícones (entre eles o do BNMP 3.0) passam a aparecer também no
SEEU, iguais aos do Projudi, sem mudar nada no Menu: `sistemasCnj.js` aceita
`/seeu/` e reconhece o processo por `div.titulo.processo`; `background.js`
atende o SEEU nos botões "Nova aba"/"Segundo monitor";
`rules/sistemasCnj.json` inclui `seeu.pje.jus.br` em `initiatorDomains`.
