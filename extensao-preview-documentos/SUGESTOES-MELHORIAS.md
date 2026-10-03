# Sugestões de melhorias e novas funcionalidades (Olirum 2.14.2)

Documento de proposta: **nada aqui está implementado ainda**. Ele parte do
que a extensão já faz (catálogo em `src/funcionalidades.js`, manual em
`manual/MANUAL.md`) e procura os pontos em que o servidor ainda clica,
rola, espera ou troca de tela à toa. Cada item diz **o problema**, **a ideia**,
**quanto clique economiza** e **o que já existe no código para reaproveitar**.

Regras mantidas em todas as propostas:

- nenhum ato processual é praticado sem o clique do usuário no
  ✅ **Sim, executar** (ou no PIN, no caso de assinatura);
- **Projudi** continua perguntando sobre juntadas/conclusões pendentes;
  **SEEU** continua sem essa pergunta (ver `CLAUDE.md`);
- tudo novo entra no catálogo `src/funcionalidades.js`, com chave
  liga/desliga no Menu, e no manual.

---

## Resumo por prioridade

| # | Sugestão | Sistema | Economia estimada | Esforço | Reaproveita |
|---|---|---|---|---|---|
| 1 | ⭐ em lote nas listas de análise | Projudi e SEEU | **muito alta** | médio | `preferenciasNaLinha.js` |
| 2 | ⏭ Próximo processo da lista | Projudi e SEEU | **muito alta** | baixo | `listaTarefas.js` |
| 3 | Paleta de comandos (Ctrl+K) e atalhos de teclado | Projudi e SEEU | alta | médio | `quickActions.js`, `menuExtensao.js` |
| 4 | Variáveis no texto das preferências do Juntar Documento | Projudi | alta | médio | `juntarDocumento.js`, `reusCabecalho.js` |
| 5 | "Resolver pendências" num botão só | Projudi | alta | baixo | `juntadaDrag.js`, `finalizarConclusao.js`, `dispensarCumprimentos.js` |
| 6 | Sugestão da preferência pelo último movimento | Projudi | alta | médio | `movimentoBase.js` |
| 7 | Certidão de envio automática após e-mail/WhatsApp | Projudi | média | médio | `email.js`, `whatsapp.js`, `juntarDocumento.js` |
| 8 | Copiar dados do processo formatados | Projudi e SEEU | média | baixo | `reusCabecalho.js`, `clipboardProcess.js` |
| 9 | Cards da execução penal no cabeçalho do SEEU | SEEU | alta | alto | `suspensaoAtiva.js`, `monitoracaoAtiva.js` |
| 10 | Ações rápidas próprias do SEEU | SEEU | alta | alto | `quickActions.js` (estrutura) |
| 11 | Compartilhar preferências com a equipe (importar mesclando) | Projudi e SEEU | média | baixo | `menuExtensao.js` |
| 12 | Histórico do que a extensão fez | Projudi e SEEU | média | baixo | todos |
| 13 | Pré-visualização: setas, fixar e "último documento" | Projudi e SEEU | média | baixo | `content.js` |
| 14 | Filtro por Sequencial também em Juntadas e Conclusão | Projudi | média | baixo | `decursoPrazoSequencial.js` |
| 15 | Prazo vencendo / vencido destacado nas listas | Projudi | média | médio | `listaTarefas.js` |

---

## 1. ⭐ em lote nas listas de análise

**Problema.** Na Análise de Juntadas, no Retorno de Conclusão e no Decurso
de Prazo, a ⭐ (`preferenciasNaLinha.js`) aplica uma preferência **num
processo por vez** ("Um card por vez", manual 9.3). Num dia com 40 decursos
que terminam todos em "certificar decurso + concluso", são 40 vezes:
⭐ → card → pergunta → ✅.

**Ideia.**

- Caixinha em cada linha + **"⭐ Aplicar aos marcados"** no topo da lista.
- Escolhe-se **uma** preferência/combo e **uma** resposta para a pergunta de
  pendências (Projudi), que vale para todos.
- A extensão percorre os processos em fila, um de cada vez, abrindo o
  diálogo preenchido; o usuário só clica ✅ **Sim, executar** (ou
  **⏭ Pular**). A linha de cada processo mostra o resultado, como hoje.
- **No SEEU** (Localizador) o lote é ainda mais simples: associar
  localizador não é ato processual e já roda sem confirmação — marcar 30
  processos e associar "Aguardando cálculo" de uma vez.

**Economia.** De ~4 cliques + espera por processo para **1 clique por
processo** (o ✅), sem perder a busca.

**Reaproveita.** Todo o fluxo de `preferenciasNaLinha.js` (iframe oculto,
dispensa, popup); só falta a fila e a seleção. No SEEU,
`window.__pdpLocalizador.associarEm` já faz o trabalho por processo.

---

## 2. ⏭ Próximo processo da lista

**Problema.** Quem analisa pela lista abre o processo, trabalha, volta à
lista (que às vezes recarrega e perde a página/filtro), acha a próxima linha
e abre de novo.

**Ideia.** Ao abrir um processo **a partir** de uma lista de análise (ou de
qualquer pesquisa), a extensão guarda a ordem dos processos da lista
(`sessionStorage`) e mostra na barra da extensão:

`◀ Anterior · 7 de 32 · Próximo ▶` (e atalho Alt+→ / Alt+←)

Opcionalmente, com as bolinhas das **Listas de tarefas**: "próximo da lista
*Urgente*".

**Economia.** 2–3 cliques e uma recarga por processo, em todas as filas.

**Reaproveita.** `listaTarefas.js` já identifica as linhas e o número de
cada processo nas três telas.

---

## 3. Paleta de comandos (Ctrl+K) e atalhos de teclado

**Problema.** Hoje tudo é mouse: abrir ▸ Ações → grupo → chip; ⭐ Minhas
Preferências → card. Não há nenhum atalho de teclado (`manifest.json` não
declara `commands`).

**Ideia.**

- **Ctrl+K** (ou Ctrl+Espaço) abre uma caixa de busca única: digitar
  "mp 5" encontra *★ Intimar MP ciência 5 dias*; "sisb" abre o Sisbajud;
  "combo sent" roda o combo de sentença; um número de processo cola e
  pesquisa (como o 📋 Colar processo).
- **Alt+1 … Alt+9**: as nove primeiras preferências de ⭐ Minhas
  Preferências (na ordem que o usuário já arrasta em "✏️ Editar posição").
- **Ctrl+Enter** = ✅ Sim, executar; **Esc** = Cancelar (na barra de
  confirmação).
- Atalho global do Chrome (`commands`) para "Colar processo" de qualquer
  aba do Projudi/SEEU.

**Economia.** 2–4 cliques por ação, e o fim da rolagem até o botão.

**Reaproveita.** A lista unificada de preferências/combos que monta os
cards de ⭐ Minhas Preferências (`quickActions.js`) e a lista de sistemas do
CNJ (`sistemasCnjLista.js`).

---

## 4. Variáveis no texto das preferências do Juntar Documento

**Problema.** A preferência do Juntar Documento grava o texto fixo (manual
8.2). Certidões que mencionam nome do réu, data, número do evento, prazo ou
destinatário precisam ser ajustadas à mão — ou nem viram preferência.

**Ideia.** Campos entre chaves no texto gravado, trocados na hora:

| Variável | Valor |
|---|---|
| `{hoje}` / `{hoje_extenso}` | 03/10/2026 / 3 de outubro de 2026 |
| `{reu}` `{reu_cpf}` `{reus}` | réu(s) do cabeçalho (já lido por `reusCabecalho.js`) |
| `{evento}` `{evento_nome}` | movimentação marcada na caixinha (7.7) |
| `{servidor}` | nome do usuário logado |
| `{perguntar:Texto}` | abre uma caixinha pedindo o valor antes de juntar |

**Economia.** Transforma em "um clique + PIN" certidões que hoje são
digitadas uma a uma.

---

## 5. "Resolver pendências" num botão só (Projudi)

**Problema.** O quadro Pendências tem três botões separados (6.1, 6.2, 6.3)
e cada um é um clique + espera; muitas vezes o servidor quer só "liberar o
processo para movimentar".

**Ideia.** Um botão **🧹 Liberar processo** no topo do quadro que, após
**uma** confirmação listando o que será feito ("Dispensar 2 juntadas,
1 decurso; finalizar 1 conclusão"), executa em sequência e para no primeiro
erro (mesma regra de hoje).

**Economia.** 2–3 cliques e esperas por processo. Só no Projudi.

---

## 6. Sugestão da preferência pelo último movimento (Projudi)

**Problema.** O que se faz num processo quase sempre depende do último ato:
depois de *JULGADA PROCEDENTE A AÇÃO* → intimar partes; depois de *DECORRIDO
PRAZO* → concluso; depois de *CONCEDIDA A MEDIDA PROTETIVA* → mandado +
intimação.

**Ideia.** A extensão aprende, **no próprio navegador**, quais preferências o
usuário aplica após cada nome de movimento (o 📌 da 7.7 já liga preferência a
movimento) e mostra 1–3 chips "💡 Sugeridas" no topo do painel de Ações
rápidas e na ⭐ das listas. Nada executa sozinho: é só um atalho na frente.

**Economia.** Elimina a procura pelo card certo na maioria dos casos.

---

## 7. Certidão de envio automática após e-mail/WhatsApp (Projudi)

**Problema.** Depois de enviar documentos por e-mail ou WhatsApp
(capítulo 5), quase sempre é preciso certificar o envio nos autos — outra
ida ao Juntar Documento e digitação de destinatário/arquivos.

**Ideia.** Ao terminar o envio, oferecer **"📎 Certificar envio"**, que roda
uma preferência do Juntar Documento escolhida pelo usuário já com
`{destinatario}`, `{arquivos}` e `{data_envio}` (ver item 4). Para no PIN,
como hoje.

---

## 8. Copiar dados do processo formatados

**Ideia.** Botão/atalho **📄 Copiar dados** que coloca na área de
transferência, num formato pronto para ofício, e-mail ou planilha:

```
Autos nº 0001234-56.2024.8.16.0001 — Ação Penal - Procedimento Ordinário
Réu: FULANO DE TAL (RG 1.234.567-8, CPF 123.456.789-00)
Vara: 1ª Vara Criminal de Curitiba
```

Variantes: só o número sem máscara; uma linha por réu (para colar no
Sisbajud/Infojud abertos pelos ícones do CNJ).

**Reaproveita.** Dados já lidos por `reusCabecalho.js` e `clipboardProcess.js`.

---

## 9. Cards da execução penal no cabeçalho do SEEU

**Problema.** No SEEU, para saber o regime atual, se o sentenciado está
preso, quando vence o próximo benefício ou quanto falta de pena, é preciso
abrir abas e o cálculo.

**Ideia.** Cards ao lado do número do processo, no mesmo estilo de
"Suspensão ativa" e "Monitoração ativa" (capítulo 4):

- **Regime** atual e situação (preso / solto / foragido);
- **Próximo benefício** (progressão, livramento) com data e um alerta
  vermelho se **já venceu**;
- **Pena remanescente**;
- **Incidentes pendentes** de análise.

**Economia.** 3–5 cliques e abas por processo de execução, e evita benefício
vencido sem análise.

---

## 10. Ações rápidas próprias do SEEU

**Problema.** As Ações rápidas, as preferências e os combos são só do
Projudi; no SEEU existe apenas o 📍 Localizador.

**Ideia.** Gravar e reaplicar, no SEEU, os diálogos mais repetidos (ex.:
movimentar/remeter ao MP ou à Defensoria, intimar, juntar documento),
reaproveitando o mesmo mecanismo "gravar campos preenchidos → reaplicar →
✅ Sim, executar". **Sem** as perguntas de pendências (regra do SEEU).
Junto com o item 1, permite "remeter 20 processos ao MP" pela lista.

**Esforço.** Alto: exige mapear as telas do SEEU; vale começar pela ação
mais usada no cartório.

---

## 11. Compartilhar preferências com a equipe

**Problema.** O ⬆ Importar do Menu **substitui** tudo (`menuExtensao.js`).
Para um servidor passar o combo "Sentença criminal" para o colega, o colega
perderia as próprias preferências.

**Ideia.**

- **Exportar selecionadas**: escolher quais preferências/combos vão no
  arquivo;
- **Importar mesclando**: acrescenta o que não existe e pergunta no caso de
  nomes iguais (manter / substituir / renomear).

Assim a vara monta um "kit de preferências" padrão e distribui a todos.

---

## 12. Histórico do que a extensão fez

**Ideia.** Aba **📜 Histórico** no Menu com as últimas ~200 ações praticadas
pela extensão (data/hora, processo, preferência/combo, resultado). Serve
para conferir um lote (item 1), para responder "eu já intimei esse?" e para
**↻ Repetir** a mesma preferência em outro processo. Fica só no navegador,
como o resto (ver 10.1 do manual).

---

## 13. Pré-visualização: setas, fixar e "último documento"

- **← / →** dentro do painel passam para o documento anterior/seguinte da
  aba Movimentações, sem voltar o mouse à lista;
- **📌 Fixar** mantém o painel aberto ao lado enquanto se preenche um
  diálogo (ler a decisão enquanto ordena o cumprimento);
- botão **"👁 Último documento"** na capa: abre direto a última decisão /
  despacho / petição, sem ir à aba Movimentações;
- em movimentações com vários arquivos (hoje só aviso "Múltiplos
  documentos"), abrir o primeiro com setas para os demais.

---

## 14. Filtro por Sequencial também em Juntadas e Conclusão (Projudi)

Hoje o campo **Sequencial** existe só na Análise de Decurso de Prazo
(`decursoPrazoSequencial.js`). Onde a tela nativa não tiver o filtro, levar o
mesmo campo (dígito final do Seq., percorrendo todas as páginas) para a
Análise de Juntadas e o Retorno de Conclusão — a divisão da fila entre
servidores passa a valer em todas as filas.

---

## 15. Prazo vencendo / vencido destacado nas listas (Projudi)

Nas listas de análise, uma etiqueta colorida na linha (🟢 no prazo,
🟡 vence em até 2 dias, 🔴 vencido) e ordenação por urgência, lendo a data
que a própria lista ou o quadro Pendências já informa. Junto com o filtro
das **Listas de tarefas**, permite começar o dia pelo que está vencendo.

---

## Melhorias internas (não visíveis, mas reduzem quebras)

- `src/quickActions.js` tem ~5.300 linhas: separar em módulos (painel,
  preferências, combos, popup, pendências) facilita corrigir sem efeito
  colateral.
- Não há testes automatizados: alguns testes de "tela simulada" com
  Playwright (já usado para gravar os vídeos em `manual/videos/fonte/`)
  pegariam quebras quando o Projudi/SEEU muda o HTML.
- Um **"modo diagnóstico"** no Menu, que gera um relatório (sem dados de
  partes) de quais seletores não foram encontrados na tela, ajudaria a
  diagnosticar problemas relatados por colegas.

---

## Por onde começar

Sugestão de ordem, do maior ganho por esforço para o menor:

1. **Item 2 (⏭ Próximo da lista)** — pequeno e usado o dia todo;
2. **Item 1 (⭐ em lote)** — começando pelo Localizador do SEEU, que não
   precisa de confirmação, e depois as preferências do Projudi;
3. **Item 3 (Ctrl+K e atalhos)**;
4. **Item 5 (Liberar processo)** e **item 4 (variáveis)**;
5. Itens do SEEU (9 e 10), depois de mapear as telas reais.

Cada item escolhido vira uma versão nova da extensão, com manual, vídeo e
linha no Anexo B, como manda o `CLAUDE.md`.
