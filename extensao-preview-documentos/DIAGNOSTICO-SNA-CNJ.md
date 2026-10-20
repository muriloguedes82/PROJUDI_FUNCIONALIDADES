# Diagnóstico: a extensão impedia a exibição de informações no SNA (CNJ)

**Relato (20/10/2026):** com a extensão instalada, a tela **Crianças e
Adolescentes** do SNA (`https://sna.cnj.jus.br/sna-base/crianca`) mostrava
só o cabeçalho e o rodapé, sem a lista. A tela **Consultar Pretendentes**
(`/area-interna/pretendente/consultar-pretendente`) funcionava.

## O que as páginas salvas mostram

- A tela de crianças é uma "casca" que carrega o conteúdo num quadro
  (`<iframe id="legado">`) vindo de **`sna.cloud.cnj.jus.br`**. O quadro
  salvo é a página de erro do Chrome: *"sna.cloud.cnj.jus.br está
  bloqueado — A conexão com sna.cloud.cnj.jus.br foi recusada.
  ERR_BLOCKED_BY_RESPONSE"*.
- A tela de pretendentes não usa quadro (é desenhada pela própria
  `sna.cnj.jus.br`), por isso não era afetada.

`ERR_BLOCKED_BY_RESPONSE` num quadro é o navegador recusando a exibição por
causa dos cabeçalhos `X-Frame-Options`/`Content-Security-Policy:
frame-ancestors` da resposta.

## Causa: `rules/sistemasCnj.json` (regra 1)

Para abrir os sistemas do CNJ dentro do popup do Projudi/SEEU, a regra 1
vale para todo `sub_frame` cujo destino seja `cnj.jus.br` (e outros) **e
cujo iniciador seja qualquer domínio de `initiatorDomains` — que inclui o
próprio `cnj.jus.br`**. Ela troca a CSP da resposta por:

    frame-ancestors 'self' https://*.tjpr.jus.br https://seeu.pje.jus.br https://seeutreino.pje.jus.br

No SNA aberto numa aba comum, o quadro `sna.cloud.cnj.jus.br` é pedido por
`sna.cnj.jus.br` (iniciador `cnj.jus.br`), então a regra se aplica; e
`sna.cnj.jus.br` (a página de cima) não está nessa lista → o Chrome bloqueia
o quadro. Sem a extensão, a CSP original do SNA permite o próprio SNA.

O DNR não tem condição "página de cima", então não dá para limitar a regra
só ao popup do Projudi/SEEU; e retirar `cnj.jus.br` de `initiatorDomains`
quebraria as navegações do login dentro do popup.

## Correção (2.54.1)

O `frame-ancestors` passa a incluir também os domínios de
`initiatorDomains` (cada um com e sem `*.`): `*.cnj.jus.br`, `*.pdpj.jus.br`,
`sso.cloud.pje.jus.br`, `sso.acesso.gov.br`, Receita, Registros, Copel,
Sanepar, Depen, Sesp. Assim os sites continuam podendo embutir os próprios
quadros quando usados fora do Projudi, e o popup do Projudi/SEEU continua
funcionando (o Tribunal e o SEEU seguem na lista). Páginas de fora desses
domínios continuam sem poder embuti-los.

## Como conferir

1. Atualize a extensão (↻ em `chrome://extensions`).
2. Abra `https://sna.cnj.jus.br/sna-base/crianca` e recarregue (F5): a lista
   deve aparecer.
3. Para confirmar que era a extensão (antes da correção): desligue-a em
   `chrome://extensions`, recarregue o SNA e compare. No DevTools (F12 →
   Console) aparecia a recusa de `frame-ancestors` para `sna.cloud.cnj.jus.br`.
4. No Projudi, abra um processo e um card de sistema do CNJ (ex.: SNGB,
   BNMP): o popup deve abrir como antes.
