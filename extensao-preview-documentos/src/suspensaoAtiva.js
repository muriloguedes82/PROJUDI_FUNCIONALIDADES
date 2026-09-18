// Projudi - Indicador de suspensão ativa ao lado do número único do processo
//
// A aba "Informações Adicionais" do processo pode ter um campo preenchido
// pela vara com o motivo da suspensão, quando o processo está
// suspenso/sobrestado. Os motivos mais comuns são: "Art. 366, CPP",
// "Art. 89, L. 9099/95", "Insanidade Mental", "ANPP" e "Transação Penal".
//
// Este recurso lê essa aba (esperando ela terminar de carregar via AJAX,
// como já ocorre com "Informações Gerais" — ver
// sequencialProcessoPrincipal.js) e, se encontrar um desses motivos
// preenchido em algum campo, insere um ícone de alerta logo ao lado do
// número único do processo no cabeçalho da página, com o motivo
// identificado como título (tooltip) do ícone.
//
// Atenção: como não há acesso a uma instância real do Projudi para validar
// o HTML exato da aba "Informações Adicionais" (que é customizável por
// Tribunal/Vara), a busca é propositalmente ampla — percorre pares
// rótulo/valor (padrão já usado em sequencialProcessoPrincipal.js), campos
// <select> e checkboxes/radios marcados dentro da aba, comparando o texto
// contra os motivos conhecidos. Se a estrutura real for diferente, ajuste
// `findMotivoSuspensao` abaixo (o console, com o prefixo do TAG, mostra o
// que foi e não foi encontrado).
(function () {
	"use strict";

	// Evita rodar dentro de iframes ocultos usados por outras
	// funcionalidades desta extensão para carregar páginas em segundo plano.
	if (window.frameElement && window.frameElement.hasAttribute("data-pdp-loader")) return;

	if (window.__pdpSuspensaoAtiva) return;
	window.__pdpSuspensaoAtiva = true;

	const TAG = "[Projudi Suspensão Ativa]";
	const ICON_ATTR = "data-pdp-suspensao-icone";
	const ABA_LABEL = "Informações Adicionais";

	const MOTIVOS_SUSPENSAO = [
		"art. 366, cpp",
		"art. 366 cpp",
		"art. 366 do cpp",
		"art. 89, l. 9099/95",
		"art. 89 l. 9099/95",
		"art. 89 da lei 9099/95",
		"art. 89, lei 9099/95",
		"insanidade mental",
		"anpp",
		"transação penal",
		"transacao penal",
	];

	function normalize(text) {
		return String(text || "")
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.trim()
			.toLowerCase();
	}

	const MOTIVOS_NORMALIZADOS = MOTIVOS_SUSPENSAO.map(normalize);

	function matchMotivo(text) {
		const normalized = normalize(text);
		if (!normalized) return null;
		const encontrado = MOTIVOS_NORMALIZADOS.find(function (motivo) {
			return normalized.indexOf(motivo) !== -1;
		});
		return encontrado ? String(text).trim() : null;
	}

	function findTabAnchorByLabel(labelText) {
		const anchors = document.querySelectorAll('a[id^="tabItemprefix"]');
		for (const anchor of anchors) {
			if (normalize(anchor.textContent) === normalize(labelText)) return anchor;
		}
		return null;
	}

	function findTabContent(labelText) {
		const anchor = findTabAnchorByLabel(labelText);
		if (!anchor) return null;
		const match = /tabItemprefix(\d+)/.exec(anchor.id);
		if (!match) return null;
		return document.getElementById("tabprefix" + match[1]);
	}

	function labelForInput(input) {
		if (input.id) {
			const label = document.querySelector('label[for="' + input.id + '"]');
			if (label) return label.textContent;
		}
		const parentLabel = input.closest("label");
		return parentLabel ? parentLabel.textContent : "";
	}

	// Percorre pares rótulo/valor (td.label / td.labelRadio + demais células
	// da linha), campos <select> e checkboxes/radios marcados dentro da aba,
	// procurando por um dos motivos reconhecidos em qualquer texto.
	function findMotivoSuspensao(tabContent) {
		const labelCells = tabContent.querySelectorAll("td.label, td.labelRadio");
		for (const labelCell of labelCells) {
			const row = labelCell.closest("tr");
			if (!row) continue;
			const cells = row.querySelectorAll("td");
			for (let i = 1; i < cells.length; i++) {
				const encontrado = matchMotivo(cells[i].textContent);
				if (encontrado) return encontrado;
			}
		}

		const selects = tabContent.querySelectorAll("select");
		for (const select of selects) {
			const option = select.options[select.selectedIndex];
			const encontrado = option && matchMotivo(option.textContent);
			if (encontrado) return encontrado;
		}

		const marcados = tabContent.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
		for (const input of marcados) {
			const encontrado = matchMotivo(input.value) || matchMotivo(labelForInput(input));
			if (encontrado) return encontrado;
		}

		return null;
	}

	function waitForTabContent(labelText, timeoutMs) {
		return new Promise(function (resolve) {
			const deadline = Date.now() + timeoutMs;
			(function tick() {
				const content = findTabContent(labelText);
				if (content && (content.querySelector("td.label, td.labelRadio") || Date.now() >= deadline)) {
					return resolve(content);
				}
				if (Date.now() >= deadline) return resolve(content);
				setTimeout(tick, 250);
			})();
		});
	}

	// Número único do processo: no Projudi vem de <em class="attention">; no
	// SEEU vem do cabeçalho do processo (div.titulo.processo) — mesmos
	// elementos já usados em email.js (extractProcessNumber).
	function processNumberAnchor() {
		const projudiEl = document.querySelector("em.attention");
		if (projudiEl && projudiEl.textContent.trim()) return projudiEl;
		const seeuEl = document.querySelector("div.titulo.processo");
		if (seeuEl && seeuEl.textContent.trim()) return seeuEl;
		return null;
	}

	function insertIcon(motivo) {
		const anchor = processNumberAnchor();
		if (!anchor) {
			console.warn(TAG, "número único do processo não encontrado na página, ícone não inserido");
			return;
		}
		const already = anchor.nextElementSibling;
		if (already && already.hasAttribute(ICON_ATTR)) {
			already.title = "Suspensão ativa: " + motivo;
			return;
		}
		const icon = document.createElement("span");
		icon.setAttribute(ICON_ATTR, "");
		icon.textContent = " ⏸️";
		icon.title = "Suspensão ativa: " + motivo;
		icon.style.cursor = "help";
		anchor.insertAdjacentElement("afterend", icon);
		console.log(TAG, "ícone de suspensão ativa inserido —", motivo);
	}

	function init() {
		waitForTabContent(ABA_LABEL, 10000).then(function (tabContent) {
			if (!tabContent) {
				console.log(TAG, "aba '" + ABA_LABEL + "' não encontrada nesta tela — nada a fazer");
				return;
			}
			const motivo = findMotivoSuspensao(tabContent);
			if (!motivo) {
				console.log(TAG, "nenhum motivo de suspensão reconhecido na aba '" + ABA_LABEL + "'");
				return;
			}
			insertIcon(motivo);
		});
	}

	init();

	// A tela do processo pode trocar de aba/recarregar trechos via AJAX (ver
	// content.js), o que pode remover o ícone junto com o cabeçalho antigo.
	// Reconcilia periodicamente, como já é feito para outros elementos desta
	// extensão.
	setInterval(function () {
		try {
			init();
		} catch (err) {
			console.error(TAG, "erro na reconciliação periódica:", err);
		}
	}, 3000);
})();
