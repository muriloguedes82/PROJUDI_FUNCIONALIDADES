(function () {
	"use strict";

	const clientIdEl = document.getElementById("clientId");
	const tenantIdEl = document.getElementById("tenantId");
	const statusEl = document.getElementById("status");

	chrome.storage.sync.get(["azureClientId", "azureTenantId"]).then(function (data) {
		clientIdEl.value = data.azureClientId || "";
		tenantIdEl.value = data.azureTenantId || "";
	});

	document.getElementById("save").addEventListener("click", function () {
		chrome.storage.sync
			.set({
				azureClientId: clientIdEl.value.trim(),
				azureTenantId: tenantIdEl.value.trim() || "common",
			})
			.then(function () {
				statusEl.textContent = "Configuração salva.";
				setTimeout(function () {
					statusEl.textContent = "";
				}, 2000);
			});
	});
})();
