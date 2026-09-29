# Como atualizar o manual

O [manual](MANUAL.md) é **versionado junto com a extensão**: a versão do
manual é sempre igual ao `version` do
[`manifest.json`](../extensao-preview-documentos/manifest.json). Toda
alteração que muda a versão da extensão — função nova, mudança de
comportamento ou correção de erro — deve atualizar o manual **no mesmo pull
request**. O CI ([`.github/workflows/manual.yml`](../.github/workflows/manual.yml))
reprova o PR se o manual ficar para trás.

## Passo a passo

1. **Capa** do `MANUAL.md`: atualize **Versão do manual**, **Versão da
   extensão** e **Data desta versão**.
2. **Texto**:
   - função nova → crie a seção no capítulo certo, com âncora
     `<a id="cap-X-Y"></a>` antes do título, e inclua-a no **Sumário**
     (mesma numeração);
   - mudança ou correção → ajuste a seção existente (passos, nomes de
     botões, mensagens) e, se for o caso, a tabela de
     [Solução de problemas](MANUAL.md#cap-11);
   - mantenha o padrão *Para que serve / Onde fica / Passo a passo / Bom
     saber* e escreva para quem só conhece o Projudi (nada de termos
     técnicos como `fetch`, `iframe`, `sessionStorage`).
3. **Vídeo** (quando a função é nova ou o que aparece na tela mudou):
   - crie ou ajuste a cena em `videos/fonte/cenas1.js`, `cenas2.js` ou
     `cenas3.js` (cada cena tem `arquivo`, `titulo` e `secao`);
   - grave só ela: `node manual/videos/fonte/gravar.mjs V34`;
   - cite o vídeo na seção: `▶ [**Vídeo V34** — Título](videos/V34-nome.mp4)`.
4. **Anexo B**: acrescente uma linha no topo da tabela do histórico com a
   versão, a data e o que mudou no manual.
5. **Anexo A**: não edite à mão — rode
   `node manual/verificar-manual.mjs --corrigir` (atualiza títulos, seções e
   durações dos vídeos).
6. Rode `node manual/verificar-manual.mjs` e só abra o PR com
   "Manual OK".

Correção de erro que não muda nada do que o usuário vê? Ainda assim a
versão da extensão muda: registre no Anexo B ("Sem alteração de texto;
corrigido …") e atualize a capa.

## Requisitos para gravar os vídeos

- Node.js 18+ e o pacote `playwright` com Chromium (`npm i -g playwright` e
  `npx playwright install chromium`, se ainda não houver);
- `ffmpeg` com H.264 (libx264) no PATH, ou indicado na variável `FFMPEG`.
  Uma forma simples: `pip install imageio-ffmpeg` e
  `FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")`.

`CHECAR=1 node manual/videos/fonte/gravar.mjs` roda todas as cenas sem
gravar, só para achar erros.

## Como os vídeos são feitos

Os vídeos **não** são gravações do Projudi real (que exige login e dados
reais): `videos/fonte/palco.html` desenha telas **simuladas**, com dados
fictícios, e `motor.js` move um cursor, clica e mostra legendas.
`gravar.mjs` roda cada cena sob um relógio virtual e captura quadro a quadro
(25 quadros/s), o que deixa o resultado nítido e sempre igual. Um aviso no
canto de cada vídeo informa que a tela é simulada.

Se preferir trocar algum vídeo por uma gravação real de tela, mantenha o
mesmo nome de arquivo (e retire a cena correspondente, ou ela sobrescreverá
o arquivo na próxima gravação completa). Cuide para não aparecerem dados
reais de processos, partes ou servidores.
