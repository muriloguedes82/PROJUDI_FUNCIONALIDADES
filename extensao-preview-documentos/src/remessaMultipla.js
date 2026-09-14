// Projudi - Remessas múltiplas na tela "Realizar Remessa"
//
// A tela nativa "Realizar Remessa" (aberta a partir do painel Ações do
// processo) usa bolinhas seletoras (radio buttons) para as opções "Enviar à
// Delegacia", "Autos ao Distribuidor", "Enviar ao Ministério Público" e
// "Outras Remessas" — só uma pode ser escolhida por vez, obrigando o usuário
// a repetir o fluxo inteiro (abrir a tela de novo, escolher a próxima opção,
// preencher os campos, confirmar) uma vez para cada remessa que precise
// fazer no mesmo processo.
//
// Este recurso troca essas bolinhas por checkboxes, permitindo marcar mais
// de uma opção ao mesmo tempo. Depois de preencher os campos de cada opção
// marcada, um único clique em "Realizar Remessa" dispara TODAS as remessas
// selecionadas, uma atrás da outra, sem sair da tela.
//
// Como não temos acesso ao código-fonte desta tela (só ao HTML/JS que o
// próprio navegador expõe, sem garantia de que a estrutura seja idêntica em
// todo Tribunal/versão do Projudi), a localização de cada opção e de seus
// campos é heurística, pelo texto literal de cada rótulo (mesma técnica já
// usada em quickActions.js para os links do painel Ações). Sempre confira o
// resultado de cada remessa no painel exibido ao final antes de considerar a
// tarefa concluída.
(function () {
	"use strict";

	if (window.__pdpRemessaMultiplaInjected) return;
	window.__pdpRemessaMultiplaInjected = true;

	// Rótulos exatos (ou o início deles) de cada opção da tela "Realizar
	// Remessa", na ordem em que aparecem. Comparados com o texto já limpo
	// (espaços colapsados) do menor ancestral do radio que já contenha o
	// rótulo inteiro.
	const OPTION_LABELS = [
		"Enviar à Delegacia",
		"Autos ao Distribuidor",
		"Enviar ao Ministério Público",
		"Outras Remessas",
	];

	const SUBMIT_LABEL = "Realizar Remessa";
	const DIALOG_TITLE = "Realizar Remessa";
	const IFRAME_SUBMIT_TIMEOUT_MS = 15000;

	if (!isRemessaScreen()) return;

	// Roda depois do carregamento completo: a tela costuma montar parte do
	// formulário (comboboxes de comarca/delegacia) via JS próprio.
	if (document.readyState === "complete") {
		init();
	} else {
		window.addEventListener("load", init, { once: true });
	}

	// -------------------------------------------------------------------
	// Detecção da tela
	// -------------------------------------------------------------------

	function isRemessaScreen() {
		const headers = document.querySelectorAll("h1, h2, h3, .subtitulo, .tituloDialog, div.titulo");
		for (let i = 0; i < headers.length; i++) {
			if ((headers[i].textContent || "").replace(/\s+/g, " ").trim() === DIALOG_TITLE) return true;
		}
		return false;
	}

	function init() {
		const radios = findOptionRadios();
		// Precisa de pelo menos duas opções para fazer sentido oferecer
		// seleção múltipla — com uma só, a tela já funciona normalmente.
		if (radios.length < 2) return;

		const blocks = buildBlocks(radios);
		if (blocks.length < 2) return;

		const submitControl = findSubmitControl(blocks);
		if (!submitControl) return;

		convertBlocksToCheckboxes(blocks);
		wireBlockToggling(blocks);
		installMultiSelectionHint(blocks);
		hookSubmit(submitControl, blocks);
	}

	// -------------------------------------------------------------------
	// Localização das opções (radios) e dos campos de cada uma
	// -------------------------------------------------------------------

	function normalizedText(el) {
		return (el.textContent || "").replace(/\s+/g, " ").trim();
	}

	function findOptionLabel(radio) {
		let el = radio;
		for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
			const text = normalizedText(el);
			for (let j = 0; j < OPTION_LABELS.length; j++) {
				const label = OPTION_LABELS[j];
				if (text.indexOf(label) === 0) return label;
			}
		}
		return null;
	}

	function findOptionRadios() {
		const allRadios = Array.prototype.slice.call(document.querySelectorAll('input[type="radio"]'));
		const matched = [];
		allRadios.forEach(function (radio) {
			const label = findOptionLabel(radio);
			if (label) matched.push({ radio: radio, label: label });
		});
		return matched;
	}

	// Ancestral comum a todas as opções (normalmente o <form> ou um <table>
	// interno da tela).
	function findCommonAncestor(elements) {
		let ancestor = elements[0];
		for (let i = 1; i < elements.length; i++) {
			while (ancestor && !ancestor.contains(elements[i])) {
				ancestor = ancestor.parentElement;
			}
		}
		return ancestor;
	}

	// Sobe a partir de `el` até achar o filho direto de `ancestor` que o
	// contém — a "linha" (tr/div/...) daquela opção dentro do container
	// comum.
	function topLevelChildContaining(ancestor, el) {
		let node = el;
		while (node && node.parentElement !== ancestor) {
			node = node.parentElement;
		}
		return node;
	}

	// Cada opção ocupa, dentro do container comum, uma sequência contígua de
	// elementos-irmãos que começa na "linha" do seu próprio radio e vai até
	// (sem incluir) a linha do radio da opção seguinte — cobre tanto o caso
	// de os campos da opção ficarem aninhados dentro da mesma linha do
	// radio quanto o caso de ficarem em linhas-irmãs subsequentes.
	function buildBlocks(entries) {
		const radios = entries.map(function (e) {
			return e.radio;
		});
		const ancestor = findCommonAncestor(radios);
		if (!ancestor) return [];

		const rows = entries.map(function (e) {
			return topLevelChildContaining(ancestor, e.radio);
		});
		// Alguma opção cujo radio já É filho direto do ancestral comum, ou
		// cuja "linha" não foi encontrada (estrutura fora do esperado),
		// invalida o agrupamento — mais seguro não mexer na tela do que
		// mexer com um mapeamento errado.
		if (rows.some(function (r) { return !r; })) return [];

		const blocks = [];
		for (let i = 0; i < entries.length; i++) {
			const start = rows[i];
			const end = rows[i + 1] || null;
			const elements = [];
			let el = start;
			while (el && el !== end) {
				elements.push(el);
				el = el.nextElementSibling;
			}
			blocks.push({
				radio: entries[i].radio,
				label: entries[i].label,
				elements: elements,
				originalName: entries[i].radio.name,
				originalValue: entries[i].radio.value,
			});
		}
		return blocks;
	}

	function findSubmitControl(blocks) {
		const ancestor = findCommonAncestor(
			blocks.map(function (b) {
				return b.radio;
			})
		);
		const scope = ancestor ? ancestor.closest("form") || ancestor : document;
		const candidates = Array.prototype.slice.call(
			scope.querySelectorAll('input[type="submit"], input[type="button"], button')
		);
		for (let i = 0; i < candidates.length; i++) {
			const c = candidates[i];
			if ((c.value || c.textContent || "").trim() === SUBMIT_LABEL) return c;
		}
		return null;
	}

	// -------------------------------------------------------------------
	// Transformação visual: radio -> checkbox, independentes entre si
	// -------------------------------------------------------------------

	function fieldsOf(block) {
		const fields = [];
		block.elements.forEach(function (el) {
			el.querySelectorAll("input, select, textarea").forEach(function (f) {
				if (f !== block.radio) fields.push(f);
			});
		});
		return fields;
	}

	function convertBlocksToCheckboxes(blocks) {
		blocks.forEach(function (block, index) {
			const radio = block.radio;
			// Nome único por opção: se todas continuassem com o mesmo
			// `name`, o navegador voltaria a tratá-las como um grupo
			// exclusivo (só uma marcada por vez), mesmo com type="checkbox".
			radio.name = "__pdpRemessaMulti_" + index;
			radio.type = "checkbox";
			block.elements.forEach(function (el) {
				el.classList.add("pdp-rm-block");
			});
		});
	}

	function applyBlockEnabledState(block) {
		const enabled = block.radio.checked;
		block.elements.forEach(function (el) {
			el.classList.toggle("pdp-rm-block-active", enabled);
		});
		fieldsOf(block).forEach(function (field) {
			field.disabled = !enabled;
		});
	}

	function wireBlockToggling(blocks) {
		blocks.forEach(function (block) {
			// Nenhuma opção começa marcada: a tela nativa também abre sem
			// nenhuma bolinha pré-selecionada, e assim evita enviar uma
			// remessa que o usuário não chegou a revisar.
			block.radio.checked = false;
			applyBlockEnabledState(block);
			block.radio.addEventListener("change", function () {
				applyBlockEnabledState(block);
			});
		});
	}

	function installMultiSelectionHint(blocks) {
		const ancestor = findCommonAncestor(
			blocks.map(function (b) {
				return b.radio;
			})
		);
		if (!ancestor || !ancestor.parentElement) return;
		const hint = document.createElement("div");
		hint.className = "pdp-rm-hint";
		hint.textContent =
			"Marque uma ou mais opções abaixo, preencha os campos de cada uma e clique em \"" +
			SUBMIT_LABEL +
			"\" para realizá-las todas de uma vez.";
		ancestor.parentElement.insertBefore(hint, ancestor);
	}

	// -------------------------------------------------------------------
	// Envio: uma opção -> comportamento nativo; duas ou mais -> sequencial,
	// reaproveitando a validação/submissão nativa do próprio formulário a
	// cada rodada.
	// -------------------------------------------------------------------

	function selectedBlocks(blocks) {
		return blocks.filter(function (b) {
			return b.radio.checked;
		});
	}

	// Prepara o formulário para submeter SÓ a opção `target`: restaura o
	// `name`/`value` originais nela (assim o JS nativo da tela, que espera
	// um grupo de radios com esse nome, volta a encontrar exatamente um
	// elemento marcado) e desliga por completo (checkbox + campos) todas as
	// demais, para que não sejam enviadas junto.
	function isolateBlockForSubmission(target, blocks) {
		blocks.forEach(function (block) {
			const isTarget = block === target;
			block.radio.disabled = !isTarget;
			if (isTarget) {
				block.radio.name = block.originalName;
				block.radio.value = block.originalValue;
				block.radio.checked = true;
			}
			fieldsOf(block).forEach(function (field) {
				field.disabled = !isTarget;
			});
		});
	}

	// Desfaz isolateBlockForSubmission, devolvendo a tela ao estado de
	// seleção múltipla (cada opção com seu próprio nome exclusivo,
	// habilitada conforme o checkbox de cada uma).
	function restoreAfterSubmission(blocks) {
		blocks.forEach(function (block, index) {
			block.radio.disabled = false;
			block.radio.name = "__pdpRemessaMulti_" + index;
			applyBlockEnabledState(block);
		});
	}

	function findForm(blocks) {
		return blocks[0].radio.form;
	}

	// Submete o formulário (reaproveitando o clique/onclick nativo do botão
	// — inclusive qualquer confirm() ou validação de campos obrigatórios
	// que ele já faça) dentro de um iframe oculto, para não navegar a aba
	// visível. Resolve com o texto visível da resposta, ou rejeita se
	// nenhuma navegação chegar a acontecer dentro do prazo (indício de que
	// a validação nativa bloqueou o envio — provavelmente falta preencher
	// algo obrigatório naquela opção).
	function submitInHiddenIframe(form, submitControl) {
		return new Promise(function (resolve, reject) {
			const iframe = document.createElement("iframe");
			const frameName = "pdpRemessaMultiFrame" + Date.now();
			iframe.name = frameName;
			iframe.style.position = "absolute";
			iframe.style.top = "-9999px";
			iframe.style.left = "-9999px";
			iframe.style.width = "1024px";
			iframe.style.height = "768px";

			const originalTarget = form.target;
			form.target = frameName;

			let settled = false;
			const timeout = setTimeout(function () {
				if (settled) return;
				settled = true;
				cleanup();
				reject(new Error("A tela não confirmou o envio a tempo — confira se algum campo obrigatório ficou em branco."));
			}, IFRAME_SUBMIT_TIMEOUT_MS);

			function cleanup() {
				clearTimeout(timeout);
				form.target = originalTarget;
				if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
			}

			iframe.addEventListener("load", function () {
				if (settled) return;
				settled = true;
				let text = "";
				try {
					text = (iframe.contentDocument.body && iframe.contentDocument.body.innerText || "").trim().slice(0, 500);
				} catch (err) {
					text = "(não foi possível ler a resposta: " + err + ")";
				}
				cleanup();
				resolve(text);
			});

			document.body.appendChild(iframe);

			// requestSubmit respeita o botão como "submitter" (equivalente a
			// clicar nele de verdade) e roda qualquer validação/onclick
			// nativo antes de submeter — se esse onclick cancelar o envio
			// (campo obrigatório vazio, confirm() recusado etc.), nenhuma
			// navegação ocorre e o timeout acima acaba resolvendo o caso.
			if (typeof form.requestSubmit === "function") {
				form.requestSubmit(submitControl);
			} else {
				submitControl.click();
			}
		});
	}

	function showResultsPanel(results) {
		removeResultsPanel();
		const backdrop = document.createElement("div");
		backdrop.id = "pdp-rm-results";
		backdrop.className = "pdp-rm-results-backdrop";
		const items = results
			.map(function (r) {
				const status = r.error ? "❌ " + escapeHtml(r.error) : "✅ enviado";
				return (
					'<li><strong>' +
					escapeHtml(r.label) +
					"</strong><br>" +
					status +
					(r.responseText ? '<div class="pdp-rm-results-response">' + escapeHtml(r.responseText) + "</div>" : "") +
					"</li>"
				);
			})
			.join("");
		backdrop.innerHTML =
			'<div class="pdp-rm-results-box">' +
			"<h4>Resultado das remessas</h4>" +
			"<ul>" +
			items +
			"</ul>" +
			'<button type="button" class="pdp-rm-results-close">Fechar</button>' +
			"</div>";
		document.body.appendChild(backdrop);
		backdrop.querySelector(".pdp-rm-results-close").addEventListener("click", function () {
			removeResultsPanel();
			if (window.opener) {
				try {
					window.opener.location.reload();
				} catch (err) {
					// origem diferente ou opener já fechado — ignora.
				}
			}
		});
	}

	function removeResultsPanel() {
		const el = document.getElementById("pdp-rm-results");
		if (el) el.remove();
	}

	function escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text == null ? "" : String(text);
		return div.innerHTML;
	}

	function runSequentially(blocks, form, submitControl) {
		const results = [];
		let chain = Promise.resolve();
		blocks.forEach(function (block) {
			chain = chain.then(function () {
				isolateBlockForSubmission(block, blocks);
				return submitInHiddenIframe(form, submitControl)
					.then(function (responseText) {
						results.push({ label: block.label, responseText: responseText });
					})
					.catch(function (err) {
						results.push({ label: block.label, error: String(err.message || err) });
					});
			});
		});
		return chain.then(function () {
			restoreAfterSubmission(blocks);
			return results;
		});
	}

	function hookSubmit(submitControl, blocks) {
		submitControl.addEventListener(
			"click",
			function (event) {
				const chosen = selectedBlocks(blocks);
				if (chosen.length === 0) {
					event.preventDefault();
					event.stopImmediatePropagation();
					alert("Marque ao menos uma opção de remessa antes de continuar.");
					return;
				}
				// Uma única opção marcada: restaura o comportamento 100%
				// nativo (mesmo name/value de sempre) e deixa o clique
				// seguir seu curso normal, sem interceptar nada.
				if (chosen.length === 1) {
					isolateBlockForSubmission(chosen[0], blocks);
					return;
				}

				// Duas ou mais: assume o envio por completo.
				event.preventDefault();
				event.stopImmediatePropagation();
				const form = findForm(blocks);
				if (!form) {
					alert("Não foi possível localizar o formulário desta tela para enviar as remessas selecionadas.");
					return;
				}
				submitControl.disabled = true;
				runSequentially(chosen, form, submitControl).then(function (results) {
					submitControl.disabled = false;
					showResultsPanel(results);
				});
			},
			true
		);
	}
})();
