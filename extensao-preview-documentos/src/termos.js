// Página de Termos de Uso (src/termos.html).
//
// Sem aceite da versão vigente, exibe a caixa "concordo" e os botões de
// aceitar/remover. Com aceite, mostra quando ele foi registrado e permite
// revogá-lo. O registro fica em chrome.storage.local; o service worker
// (src/termosUso.js) observa essa chave e liga/desliga os scripts do
// Projudi/SEEU conforme o aceite.
(function () {
	"use strict";

	const termos = self.PDP_TERMOS;
	const body = document.body;
	const concordo = document.getElementById("concordo");
	const aceitar = document.getElementById("aceitar");
	const remover = document.getElementById("remover");
	const fechar = document.getElementById("fechar");
	const revogar = document.getElementById("revogar");
	const aceiteRegistrado = document.getElementById("aceite-registrado");

	document.getElementById("versao-termos").textContent = termos.versao;

	function formatarData(iso) {
		const data = new Date(iso);
		if (isNaN(data.getTime())) return "";
		return data.toLocaleDateString("pt-BR") + " às " +
			data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
	}

	function exibir(aceite) {
		const valido = !!(aceite && aceite.aceito === true && aceite.versao === termos.versao);
		body.classList.toggle("modo-aceite", !valido);
		body.classList.toggle("modo-consulta", valido);
		if (valido) {
			const quando = formatarData(aceite.data);
			aceiteRegistrado.textContent = "Termos aceitos" + (quando ? " em " + quando : "") +
				" (versão " + aceite.versao + "). A extensão está ativa no Projudi e no SEEU - " +
				"recarregue as páginas que já estavam abertas.";
		} else {
			concordo.checked = false;
			aceitar.disabled = true;
		}
	}

	function carregar() {
		chrome.storage.local.get(termos.chave).then(function (data) {
			exibir(data[termos.chave]);
		});
	}

	concordo.addEventListener("change", function () {
		aceitar.disabled = !concordo.checked;
	});

	aceitar.addEventListener("click", function () {
		if (!concordo.checked) return;
		aceitar.disabled = true;
		chrome.storage.local.set({
			[termos.chave]: {
				aceito: true,
				versao: termos.versao,
				data: new Date().toISOString(),
				versaoExtensao: chrome.runtime.getManifest().version
			}
		});
	});

	remover.addEventListener("click", function () {
		chrome.management.uninstallSelf({ showConfirmDialog: true }).catch(function () {
			// Usuário cancelou a confirmação: a extensão continua inativa.
		});
	});

	revogar.addEventListener("click", function () {
		if (!window.confirm("Revogar o aceite desativa a extensão no Projudi e no SEEU até que os termos sejam aceitos novamente. Continuar?")) return;
		chrome.storage.local.remove(termos.chave);
	});

	fechar.addEventListener("click", function () {
		chrome.tabs.getCurrent(function (tab) {
			if (tab) chrome.tabs.remove(tab.id);
			else window.close();
		});
	});

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area === "local" && changes[termos.chave]) exibir(changes[termos.chave].newValue);
	});

	carregar();
})();
