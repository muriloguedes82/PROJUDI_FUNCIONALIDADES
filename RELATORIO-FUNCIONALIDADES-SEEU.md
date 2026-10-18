# Funcionalidades da extensão no SEEU — levantamento

Levantamento feito em 16/10/2026 sobre a versão atual da extensão
(`extensao-preview-documentos`), cruzando três fontes:

1. o catálogo `src/funcionalidades.js` (campo `sistemas`);
2. o código de cada script (se ele encerra fora de `/projudi/` ou se trata as telas `/seeu/`);
3. o manual (`manual/MANUAL.md`, seção 1.3 "Onde a extensão funciona" e Anexo B).

Não houve teste no SEEU real: o "precisa de teste" abaixo vem só da leitura do código.

## 1. Já liberadas no SEEU

| Função (Menu) | O que funciona no SEEU |
|---|---|
| Pré-visualização e WhatsApp | Completa (aba Movimentações) |
| Envio por e-mail (Outlook) | Completa |
| Sistemas do CNJ | Só os cards **BNMP**, **SESP** e **S.U.** (os demais ficam só no Projudi) |
| Localizador (SEEU) | Exclusiva do SEEU |
| Minhas Preferências na linha (⭐) | Listas **Análise de Juntadas**, **Retorno de Conclusão** de **Decurso de Prazo** (2.45.0) e de **cumprimentos** (2.47.0): preferências do 📍 Localizador (com ⭐ Em lote); nas de decurso, também Abrir a análise e Dispensar nos marcados |
| Ações rápidas e Minhas Preferências | Parcial: ⭐ Minhas Preferências e 🔗 Combos com etapas do Localizador. Os grupos personalizados e o 📋 Colar processo ficam só no Projudi |
| Ocultar contadores zerados | Mesa do(a) Analista Judiciário, todas as abas (liberada na 2.42.0; conferida nas telas salvas de Análise de Juntadas, Pendências de Incidentes, Cumprimentos de Medidas, Intimações e Outros Cumprimentos; grupos todos zerados somem com o título) |
| Processo ao passar o mouse | Listas de Juntadas, Retorno de Conclusão, Mandados/Demais Cumprimentos, Decurso de Prazo, Paralisados, Suspensos, Execuções e Painel de Incidentes (liberada na 2.43.0) |
| Analisar e Dispensar decurso na lista | Listas Intimações e Auxiliares da Justiça: Dispensar e "Abrir a análise" (liberada na 2.44.0); ⭐ e "Dispensar nos marcados" na 2.45.0; preferências do Analisar Decurso na 2.46.0 (Juntar Documento no SEEU, só para elas) |
| RG e CPF nos cumprimentos | Listas Demais Cumprimentos e Mandados, tela do cumprimento e tela do Analisar (Pré-Análise), com os documentos do Sentenciado (2.47.0) |
| Dispensar juntadas, decursos e cumprimentos / Finalizar conclusão | Botões no quadro Pendências da tela do processo e perguntas antes das preferências, como no Projudi (2.48.0) |
| Listas de tarefas | Nas listas do SEEU que usam a ⭐ (necessária para a ⭐ na linha) |
| Documento do Juiz ao passar o mouse no Retorno de Conclusão | O código atende `/seeu/processo/conclusao.do` (Anexo B, v2.29.0, diz "Projudi e SEEU"), **mas a tabela da seção 1.3 do manual não cita essa função** |

## 2. Ainda NÃO liberadas no SEEU

### 2.1 Marcadas como "só Projudi" no catálogo (nem aparecem no Menu do SEEU)

- Alterar Classe/Assuntos
- Novo Valor da Causa
- Prioridades

### 2.2 Aparecem no Menu do SEEU, mas o código só age em telas `/projudi/`

- (Des)Habilitar Advogado
- Editar Partes/Outros
- Alvará Eletrônico
- Juntar Documento (o botão 📎 da tela do processo; no SEEU só funciona o fluxo do Analisar Decurso, desde a 2.46.0)
- Oráculo
- Réus no cabeçalho (no SEEU o cabeçalho já mostra o sentenciado, com RJI, CPF e RG; talvez não faça falta)
- Informações nas ordenações BNMP
- Endereço da parte e Mandado Regionalizado
- Ações rápidas: grupos de ações e preferências das ações (remessa, intimação, ordenação etc.)
- Sistemas do CNJ: SerpJud, CNIEP, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud e o card Outros (COPEL, FUPEN, SANEPAR)
- Minhas Preferências na linha (⭐): as listas Expedir Intimações/Citação (as preferências do "Analisar" dos cumprimentos não serão levadas ao SEEU, a pedido do usuário)

### 2.3 O código não bloqueia o SEEU, mas não estão declaradas como liberadas (precisam de teste no SEEU)

- Destaque de movimentações (tem leitura alternativa da coluna "Movimentado Por" pensada para o SEEU)
- Expandir anexos / ocultar sem arquivo
- Escolher a movimentação das Ações rápidas
- Indicador de suspensão ativa e Indicador de monitoração eletrônica (têm caminho para o cabeçalho do SEEU, `div.titulo.processo`)
- Sequencial do processo principal
- Filtro por Sequencial no Decurso de Prazo
- Nova Remessa e Nova Ordenação

## 3. Inconsistências encontradas

- O Menu do SEEU mostra as funções da seção 2.2 como "ativas", mas elas não fazem nada lá. Seria mais claro marcá-las com
  `sistemas: ["projudi"]` no catálogo (como já foi feito com as da seção 2.1) ou liberá-las de fato.
- A seção 1.3 do manual não cita a função "Documento do Juiz ao passar o mouse no Retorno de Conclusão", que o Anexo B dá
  como disponível no SEEU.

## 4. Plano de liberação (combinado com o usuário)

Uma função por vez, a partir de telas salvas do SEEU enviadas pelo usuário:

1. Ocultar contadores zerados — **feito (2.42.0)**
2. Processo ao passar o mouse — **feito (2.43.0)**
3. Analisar/Dispensar decurso na lista, ⭐ e lote nas listas de decurso — **feito (2.44.0 a 2.46.0)**
4. RG e CPF nos cumprimentos e ⭐ nas listas de cumprimentos — **feito (2.47.0)**, com as preferências do Localizador (sem as do "Analisar", a pedido do usuário)
5. Dispensar juntadas/decursos/cumprimentos e Finalizar conclusão — **feito (2.48.0)**: botões
   e perguntas antes das preferências, como no Projudi (regra do CLAUDE.md alterada a pedido do usuário)
6. Grupos de Ações rápidas, uma ação por vez
