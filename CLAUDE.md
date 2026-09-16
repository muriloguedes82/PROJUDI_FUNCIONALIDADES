# Instruções para este repositório

- O arquivo [`FUNCIONALIDADES.md`](./FUNCIONALIDADES.md) sintetiza, em
  linguagem para o usuário final, todas as funcionalidades existentes no
  repositório. Mecanismos internos/técnicos (autenticação, tratamento de
  CORS, resiliência de DOM, etc.) ficam à parte em
  [`FUNCIONALIDADES_TECNICO.md`](./FUNCIONALIDADES_TECNICO.md).
- **Sempre que o código principal for atualizado** — qualquer mudança em
  `extensao-preview-documentos/src/` ou em `manifest.json` que adicione,
  remova ou altere o comportamento de uma funcionalidade — atualize o
  arquivo correspondente (`FUNCIONALIDADES.md` para o que é visível ao
  usuário, `FUNCIONALIDADES_TECNICO.md` para mecanismos internos) e o
  `README.md` da pasta afetada, no mesmo commit/PR. Não deixe a
  documentação dessincronizar do código.
