// Manual do Usuário (src/manual.html), aberto pelo botão "📖 Manual do
// Usuário" do Menu da extensão (src/menuExtensao.js).
//
// O conteúdo é o manual em manual/MANUAL.md, convertido aqui para HTML -
// assim o botão do Menu sempre abre a versão que acompanha a extensão.
// Cada capítulo "## ..." vira um card, com índice lateral e busca por
// palavras. Os links "videos/....mp4" abrem o vídeo num player sobre a
// página (manual/videos/); os links "#..." rolam até a seção.
// O conversor cobre só o Markdown usado no README (títulos, parágrafos,
// listas, citações, tabelas, blocos de código, negrito, itálico, código e
// links); todo texto é escapado antes da formatação. Linhas com âncora
// (<a id="x"></a>) viram destinos dos links internos e comentários HTML
// são ignorados.
(function () {
	"use strict";

	const conteudo = document.getElementById("conteudo");
	const indice = document.getElementById("indice");
	const busca = document.getElementById("busca");
	document.getElementById("versao").textContent = "versão " + chrome.runtime.getManifest().version;

	const escapar = function (t) {
		return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	};
	const semAcento = function (t) {
		return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	};

	function inline(texto) {
		const codigos = [];
		let t = escapar(texto).replace(/`([^`]+)`/g, function (_, c) {
			codigos.push(c);
			return "\u0000" + (codigos.length - 1) + "\u0000";
		});
		t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
			.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>")
			.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, rotulo, url) {
				if (/^videos\/[\w.-]+\.mp4$/i.test(url)) return '<a href="#" class="video" data-video="' + url + '">' + rotulo + "</a>";
				if (/^#[\w-]+$/.test(url)) return '<a href="' + url + '" class="interno">' + rotulo + "</a>";
				if (/^https?:/i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener">' + rotulo + "</a>";
				return rotulo; // arquivos do repositório, que não existem aqui
			});
		return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return "<code>" + codigos[i] + "</code>"; });
	}

	// Converte um trecho de Markdown em HTML.
	function markdown(md) {
		const linhas = md.replace(/\r/g, "").split("\n");
		const html = [];
		let i = 0;
		const ehLista = function (l) { return /^\s*([-*]|\d+\.)\s+/.test(l); };
		const ehEspecial = function (l) { return /^(#{1,6}\s|```|>|\||<a id=|-{3,}\s*$)/.test(l) || ehLista(l); };
		while (i < linhas.length) {
			const linha = linhas[i];
			if (!linha.trim()) { i++; continue; }
			if (/^-{3,}\s*$/.test(linha)) { html.push("<hr>"); i++; continue; }
			const ancora = /^<a id="([\w-]+)"><\/a>\s*$/.exec(linha);
			if (ancora) { html.push('<span class="ancora" id="' + ancora[1] + '"></span>'); i++; continue; }
			if (/^```/.test(linha)) {
				const bloco = [];
				i++;
				while (i < linhas.length && !/^```/.test(linhas[i])) bloco.push(linhas[i++]);
				i++;
				html.push("<pre><code>" + escapar(bloco.join("\n")) + "</code></pre>");
				continue;
			}
			const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
			if (titulo) {
				const nivel = Math.min(titulo[1].length, 4);
				html.push("<h" + nivel + ">" + inline(titulo[2]) + "</h" + nivel + ">");
				i++;
				continue;
			}
			if (/^>/.test(linha)) {
				const bloco = [];
				while (i < linhas.length && /^>/.test(linhas[i])) bloco.push(linhas[i++].replace(/^>\s?/, ""));
				html.push("<blockquote>" + markdown(bloco.join("\n")) + "</blockquote>");
				continue;
			}
			if (/^\|/.test(linha)) {
				const bloco = [];
				while (i < linhas.length && /^\|/.test(linhas[i])) bloco.push(linhas[i++]);
				const celulas = function (l) { return l.replace(/^\||\|$/g, "").split("|").map(function (c) { return inline(c.trim()); }); };
				const corpo = bloco.filter(function (l, n) { return !(n === 1 && /^[|\s:-]+$/.test(l)); });
				html.push("<table><thead><tr>" + celulas(corpo[0]).map(function (c) { return "<th>" + c + "</th>"; }).join("") +
					"</tr></thead><tbody>" + corpo.slice(1).map(function (l) {
						return "<tr>" + celulas(l).map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
					}).join("") + "</tbody></table>");
				continue;
			}
			if (ehLista(linha)) {
				// Junta a lista inteira (itens, continuações e subníveis
				// indentados) e monta recursivamente.
				const base = linha.match(/^\s*/)[0].length;
				const ordenada = /^\s*\d+\./.test(linha);
				const itens = [];
				while (i < linhas.length) {
					const l = linhas[i];
					const recuo = l.match(/^\s*/)[0].length;
					if (!l.trim()) {
						const prox = linhas[i + 1] || "";
						if (prox.trim() && prox.match(/^\s*/)[0].length > base) { i++; continue; }
						break;
					}
					if (recuo === base && ehLista(l)) itens.push([l.replace(/^\s*([-*]|\d+\.)\s+/, "")]);
					else if (recuo > base && itens.length) itens[itens.length - 1].push(l.slice(Math.min(recuo, base + 3)));
					else break;
					i++;
				}
				const tag = ordenada ? "ol" : "ul";
				html.push("<" + tag + ">" + itens.map(function (partes) {
					const primeiro = [partes[0]];
					let n = 1;
					while (n < partes.length && !ehLista(partes[n]) && !/^```/.test(partes[n].trim())) primeiro.push(partes[n++].trim());
					const resto = partes.slice(n).join("\n");
					return "<li>" + inline(primeiro.join(" ")) + (resto.trim() ? markdown(resto) : "") + "</li>";
				}).join("") + "</" + tag + ">");
				continue;
			}
			const paragrafo = [];
			while (i < linhas.length && linhas[i].trim() && !ehEspecial(linhas[i])) paragrafo.push(linhas[i++].trim());
			if (!paragrafo.length) paragrafo.push(linhas[i++].trim());
			html.push("<p>" + inline(paragrafo.join(" ")) + "</p>");
		}
		return html.join("\n");
	}

	const semComentarios = function (md) { return md.replace(/<!--[\s\S]*?-->/g, ""); };

	// Divide o manual nos capítulos "## ..." (a primeira é a introdução).
	function secoes(md) {
		const lista = [];
		let atual = { titulo: "Apresentação", nivel: 1, linhas: [] };
		let emCodigo = false;
		semComentarios(md).replace(/\r/g, "").split("\n").forEach(function (linha) {
			if (/^```/.test(linha)) emCodigo = !emCodigo;
			const m = !emCodigo && /^##\s+(.*)$/.exec(linha);
			if (m) {
				// Âncoras (e linhas em branco) logo antes do título pertencem a este capítulo.
				const antes = [];
				while (atual.linhas.length && (!atual.linhas[atual.linhas.length - 1].trim() || /^<a id="[\w-]+"><\/a>\s*$/.test(atual.linhas[atual.linhas.length - 1]))) {
					antes.unshift(atual.linhas.pop());
				}
				lista.push(atual);
				atual = { titulo: m[1], nivel: 2, linhas: antes.concat([linha]) };
			} else {
				atual.linhas.push(linha);
			}
		});
		lista.push(atual);
		return lista.filter(function (s) { return s.linhas.join("").trim(); });
	}

	function subtitulos(secao) {
		let emCodigo = false;
		return secao.linhas.filter(function (l) {
			if (/^```/.test(l)) emCodigo = !emCodigo;
			return !emCodigo && /^###\s+/.test(l);
		}).map(function (l) { return l.replace(/^###\s+/, ""); });
	}

	const textoPuro = function (t) { return t.replace(/[`*]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); };

	function montar(md) {
		conteudo.textContent = "";
		const cards = [];
		secoes(md).forEach(function (secao, n) {
			const id = "secao-" + n;
			const card = document.createElement("section");
			card.className = "secao" + (n === 0 ? " intro" : "");
			card.id = id;
			card.innerHTML = markdown(secao.linhas.join("\n"));
			card.querySelectorAll("h3").forEach(function (h, k) { h.id = id + "-" + k; });
			conteudo.append(card);

			const link = document.createElement("a");
			link.href = "#" + id;
			link.textContent = textoPuro(secao.titulo);
			indice.append(link);
			const subs = subtitulos(secao).map(function (titulo, k) {
				const a = document.createElement("a");
				a.href = "#" + id + "-" + k;
				a.className = "sub";
				a.textContent = textoPuro(titulo);
				indice.append(a);
				return a;
			});
			cards.push({ card: card, link: link, subs: subs, texto: semAcento(card.textContent), html: card.innerHTML });
		});
		const vazio = document.createElement("p");
		vazio.className = "sem-resultado";
		vazio.textContent = "Nenhuma seção encontrada para essa busca.";
		vazio.hidden = true;
		conteudo.append(vazio);

		// Índice: destaca a seção visível.
		const observador = new IntersectionObserver(function (entradas) {
			entradas.forEach(function (e) {
				if (!e.isIntersecting) return;
				cards.forEach(function (c) { c.link.classList.toggle("atual", c.card === e.target); });
			});
		}, { root: conteudo, rootMargin: "0px 0px -70% 0px" });
		cards.forEach(function (c) { observador.observe(c.card); });

		// Busca: mostra só as seções com todas as palavras e as realça.
		let espera = null;
		busca.addEventListener("input", function () {
			clearTimeout(espera);
			espera = setTimeout(function () {
				const termos = semAcento(busca.value).split(/\s+/).filter(Boolean);
				let visiveis = 0;
				cards.forEach(function (c) {
					const ok = termos.every(function (t) { return c.texto.includes(t); });
					c.card.classList.toggle("oculta", !ok);
					c.link.classList.toggle("oculto", !ok);
					c.subs.forEach(function (s) { s.classList.toggle("oculto", !ok); });
					c.card.innerHTML = c.html;
					if (ok && termos.length) realcar(c.card, termos);
					if (ok) visiveis++;
				});
				vazio.hidden = visiveis > 0;
				conteudo.scrollTop = 0;
			}, 200);
		});

		if (location.hash) {
			const alvo = document.getElementById(location.hash.slice(1));
			if (alvo) alvo.scrollIntoView();
		}
	}

	function realcar(raiz, termos) {
		const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
		const nos = [];
		while (caminhante.nextNode()) nos.push(caminhante.currentNode);
		nos.forEach(function (no) {
			const original = no.textContent;
			const normal = semAcento(original);
			const trechos = [];
			termos.forEach(function (t) {
				let p = normal.indexOf(t);
				while (p >= 0) { trechos.push([p, p + t.length]); p = normal.indexOf(t, p + t.length); }
			});
			if (!trechos.length) return;
			trechos.sort(function (a, b) { return a[0] - b[0]; });
			const frag = document.createDocumentFragment();
			let pos = 0;
			trechos.forEach(function (tr) {
				if (tr[0] < pos) return;
				frag.append(original.slice(pos, tr[0]));
				const mark = document.createElement("mark");
				mark.textContent = original.slice(tr[0], tr[1]);
				frag.append(mark);
				pos = tr[1];
			});
			frag.append(original.slice(pos));
			no.replaceWith(frag);
		});
	}

	// Player dos vídeos (links "videos/....mp4" do manual).
	function abrirVideo(arquivo, titulo) {
		const fundo = document.createElement("div");
		fundo.className = "video-fundo";
		const caixa = document.createElement("div");
		caixa.className = "video-caixa";
		const cab = document.createElement("div");
		cab.className = "video-cab";
		const nome = document.createElement("span");
		nome.textContent = titulo;
		const fechar = document.createElement("button");
		fechar.type = "button";
		fechar.textContent = "✕ Fechar";
		const video = document.createElement("video");
		video.controls = true;
		video.autoplay = true;
		video.src = chrome.runtime.getURL("manual/" + arquivo);
		const fim = function () { document.removeEventListener("keydown", aoTeclar); fundo.remove(); };
		const aoTeclar = function (e) { if (e.key === "Escape") fim(); };
		fechar.addEventListener("click", fim);
		fundo.addEventListener("click", function (e) { if (e.target === fundo) fim(); });
		document.addEventListener("keydown", aoTeclar);
		cab.append(nome, fechar);
		caixa.append(cab, video);
		fundo.append(caixa);
		document.body.append(fundo);
	}

	conteudo.addEventListener("click", function (e) {
		const link = e.target.closest && e.target.closest("a");
		if (!link) return;
		if (link.classList.contains("video")) {
			e.preventDefault();
			abrirVideo(link.dataset.video, link.textContent.replace(/^▶\s*/, ""));
		} else if (link.classList.contains("interno")) {
			e.preventDefault();
			const id = link.getAttribute("href").slice(1);
			const limpar = busca.value !== "";
			if (limpar) { busca.value = ""; busca.dispatchEvent(new Event("input")); }
			// Com filtro ativo, as seções são refeitas após a busca (200 ms): procura o destino só depois.
			setTimeout(function () {
				const alvo = conteudo.querySelector("#" + id);
				if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
			}, limpar ? 300 : 0);
		}
	});

	fetch(chrome.runtime.getURL("manual/MANUAL.md"))
		.then(function (r) {
			if (!r.ok) throw new Error("HTTP " + r.status);
			return r.text();
		})
		.then(montar)
		.catch(function (err) {
			conteudo.innerHTML = "";
			const p = document.createElement("p");
			p.className = "sem-resultado";
			p.textContent = "Não foi possível carregar o manual (" + err.message + ").";
			conteudo.append(p);
		});
})();
