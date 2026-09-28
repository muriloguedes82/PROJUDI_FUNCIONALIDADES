(function () {
	"use strict";

	const clientIdEl = document.getElementById("clientId");
	const tenantIdEl = document.getElementById("tenantId");
	const sendModeEl = document.getElementById("sendMode");
	const statusEl = document.getElementById("status");
	const certidaoModoEl = document.getElementById("certidaoModo");

	chrome.storage.sync.get(["azureClientId", "azureTenantId", "sendMode", "certidaoModo"]).then(function (data) {
		clientIdEl.value = data.azureClientId || "";
		tenantIdEl.value = data.azureTenantId || "";
		sendModeEl.value = data.sendMode || "auto";
		certidaoModoEl.value = data.certidaoModo === "ia" ? "ia" : "manual";
	});

	document.getElementById("save").addEventListener("click", function () {
		chrome.storage.sync
			.set({
				azureClientId: clientIdEl.value.trim(),
				azureTenantId: tenantIdEl.value.trim() || "common",
				sendMode: sendModeEl.value,
				certidaoModo: certidaoModoEl.value,
			})
			.then(function () {
				statusEl.textContent = "Configuração salva.";
				setTimeout(function () {
					statusEl.textContent = "";
				}, 2000);
			});
	});
})();
