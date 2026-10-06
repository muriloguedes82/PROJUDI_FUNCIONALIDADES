(function () {
	"use strict";

	const clientIdEl = document.getElementById("clientId");
	const tenantIdEl = document.getElementById("tenantId");
	const sendModeEl = document.getElementById("sendMode");
	const statusEl = document.getElementById("status");

	chrome.storage.sync.get(["azureClientId", "azureTenantId", "sendMode"]).then(function (data) {
		clientIdEl.value = data.azureClientId || "";
		tenantIdEl.value = data.azureTenantId || "";
		sendModeEl.value = data.sendMode || "auto";
	});

	function mostrarStatus(texto, erro) {
		statusEl.textContent = texto;
		statusEl.style.color = erro ? "#b00020" : "#2b6b2b";
		if (!erro) setTimeout(function () { statusEl.textContent = ""; }, 2000);
	}

	document.getElementById("logout").addEventListener("click", function () {
		chrome.runtime.sendMessage({ type: "OUTLOOK_LOGOUT" }).then(function (resp) {
			if (resp && resp.ok) mostrarStatus("Você saiu do Outlook nesta extensão.");
			else mostrarStatus("Não foi possível sair: " + ((resp && resp.error) || "erro desconhecido"), true);
		});
	});

	document.getElementById("save").addEventListener("click", function () {
		chrome.storage.sync
			.set({
				azureClientId: clientIdEl.value.trim(),
				azureTenantId: tenantIdEl.value.trim() || "common",
				sendMode: sendModeEl.value,
			})
			.then(function () {
				mostrarStatus("Configuração salva.");
			});
	});
})();
