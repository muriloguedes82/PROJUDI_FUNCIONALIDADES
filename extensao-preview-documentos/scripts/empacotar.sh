#!/usr/bin/env bash
# Gera o .zip para envio à Chrome Web Store, contendo só o que a extensão usa
# em tempo de execução (manifest.json, src/ e icons/). Documentação (.md/.txt)
# e scripts ficam de fora.
#
# Uso (a partir de qualquer pasta): bash extensao-preview-documentos/scripts/empacotar.sh
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$raiz"

versao="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' manifest.json)"
[ -n "$versao" ] || { echo "Não foi possível ler a versão do manifest.json" >&2; exit 1; }

for tam in 16 32 48 128; do
	[ -f "icons/icon$tam.png" ] || { echo "Faltando icons/icon$tam.png (rode scripts/gerar-icones.py)" >&2; exit 1; }
done

mkdir -p dist
saida="dist/projudi-seeu-documentos-$versao.zip"
rm -f "$saida"
zip -r -X -q "$saida" manifest.json src icons -x '*.DS_Store' '*/.*'
echo "Pacote gerado: extensao-preview-documentos/$saida"
