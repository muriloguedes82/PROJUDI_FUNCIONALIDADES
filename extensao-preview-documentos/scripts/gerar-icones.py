#!/usr/bin/env python3
"""Gera os ícones PNG da extensão (16, 32, 48 e 128 px) sem dependências externas.

Desenho: quadrado azul com cantos arredondados e uma folha de documento
branca (canto dobrado e linhas de texto). Usa superamostragem para suavizar
as bordas. Uso: python3 scripts/gerar-icones.py (a partir da pasta da extensão).
"""
import os
import struct
import zlib

AZUL = (26, 86, 160)
AZUL_CLARO = (120, 160, 210)
BRANCO = (255, 255, 255)
SS = 4  # superamostragem


def dentro_ret_arred(x, y, x0, y0, x1, y1, r):
	if x < x0 or x > x1 or y < y0 or y > y1:
		return False
	cx = min(max(x, x0 + r), x1 - r)
	cy = min(max(y, y0 + r), y1 - r)
	return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def cor_em(u, v):
	"""u, v em [0, 1]; retorna (r, g, b, a)."""
	if not dentro_ret_arred(u, v, 0.02, 0.02, 0.98, 0.98, 0.18):
		return (0, 0, 0, 0)
	# folha: x 0.26..0.74, y 0.16..0.84, canto dobrado de 0.14
	fx0, fy0, fx1, fy1, dobra = 0.26, 0.16, 0.74, 0.84, 0.14
	if fx0 <= u <= fx1 and fy0 <= v <= fy1:
		# recorte do canto superior direito
		if u - (fx1 - dobra) > v - fy0:
			return AZUL + (255,)
		# triângulo da dobra
		if u >= fx1 - dobra and v <= fy0 + dobra:
			return AZUL_CLARO + (255,)
		# linhas de texto
		for ly in (0.40, 0.52, 0.64, 0.76):
			fim = 0.66 if ly != 0.76 else 0.54
			if abs(v - ly) <= 0.03 and 0.33 <= u <= fim:
				return AZUL + (255,)
		return BRANCO + (255,)
	return AZUL + (255,)


def renderizar(tam, margem=0.0):
	"""margem: fração transparente em cada lado (a Chrome Web Store pede 16 px no ícone de 128)."""
	escala = 1 - 2 * margem
	linhas = []
	n = tam * SS
	for py in range(tam):
		linha = bytearray([0])
		for px in range(tam):
			acc = [0, 0, 0, 0]
			for sy in range(SS):
				for sx in range(SS):
					u = (px * SS + sx + 0.5) / n
					v = (py * SS + sy + 0.5) / n
					r, g, b, a = cor_em((u - margem) / escala, (v - margem) / escala)
					acc[0] += r * a
					acc[1] += g * a
					acc[2] += b * a
					acc[3] += a
			a = acc[3]
			if a:
				linha += bytes((round(acc[0] / a), round(acc[1] / a), round(acc[2] / a), round(a / (SS * SS))))
			else:
				linha += bytes((0, 0, 0, 0))
		linhas.append(bytes(linha))
	return b"".join(linhas)


def png(tam, dados):
	def chunk(tipo, conteudo):
		c = tipo + conteudo
		return struct.pack(">I", len(conteudo)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

	ihdr = struct.pack(">IIBBBBB", tam, tam, 8, 6, 0, 0, 0)
	return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(dados, 9)) + chunk(b"IEND", b"")


def main():
	destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
	os.makedirs(destino, exist_ok=True)
	for tam in (16, 32, 48, 128):
		with open(os.path.join(destino, "icon%d.png" % tam), "wb") as f:
			f.write(png(tam, renderizar(tam, 16 / 128 if tam == 128 else 0.0)))
		print("icons/icon%d.png" % tam)


if __name__ == "__main__":
	main()
