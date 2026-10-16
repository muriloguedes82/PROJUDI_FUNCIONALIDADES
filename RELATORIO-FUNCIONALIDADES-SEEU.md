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
| Minhas Preferências na linha (⭐) | Só nas listas **Análise de Juntadas** e **Retorno de Conclusão**, e só com preferências do 📍 Localizador (com ⭐ Em lote) |
| Ações rápidas e Minhas Preferências | Parcial: ⭐ Minhas Preferências e 🔗 Combos com etapas do Localizador. Os grupos personalizados e o 📋 Colar processo ficam só no Projudi |
| Listas de tarefas | Nas listas do SEEU que usam a ⭐ (necessária para a ⭐ na linha) |
| Documento do Juiz ao passar o mouse no Retorno de Conclusão | O código atende `/seeu/processo/conclusao.do` (Anexo B, v2.29.0, diz "Projudi e SEEU"), **mas a tabela da seção 1.3 do manual não cita essa função** |

## 2. Ainda NÃO liberadas no SEEU

### 2.1 Marcadas como "só Projudi" no catálogo (nem aparecem no Menu do SEEU)

- Alterar Classe/Assuntos
- Novo Valor da Causa
- Prioridades
- Processo ao passar o mouse no Decurso de Prazo, nas Juntadas, nas Conclusões e nos Cumprimentos, no Expedir e nos Paralisados
- Analisar e Dispensar decurso na lista

### 2.2 Aparecem no Menu do SEEU, mas o código só age em telas `/projudi/`

- (Des)Habilitar Advogado
- Editar Partes/Outros
- Alvará Eletrônico
- Juntar Documento
- Oráculo
- Réus no cabeçalho (no SEEU o cabeçalho já mostra o sentenciado, com RJI, CPF e RG; talvez não faça falta)
- Dispensar juntadas, decursos e cumprimentos (no SEEU não há trava de pendências; ver CLAUDE.md)
- Finalizar conclusão pendente (idem)
- Ocultar contadores zerados (Mesa do Analista)
- RG e CPF nos cumprimentos
- Informações nas ordenações BNMP
- Endereço da parte e Mandado Regionalizado
- Ações rápidas: grupos de ações e preferências das ações (remessa, intimação, ordenação etc.)
- Sistemas do CNJ: SerpJud, CNIEP, PrevJud, Sisbajud, SNGB, Sniper, Infojud, Renajud e o card Outros (COPEL, FUPEN, SANEPAR)
- Minhas Preferências na linha (⭐) nas listas de Decurso de Prazo, cumprimentos, Expedir Intimações/Citação e Pré-Análise

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
