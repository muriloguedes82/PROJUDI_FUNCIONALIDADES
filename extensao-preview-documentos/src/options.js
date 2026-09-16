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

	document.getElementById("save").addEventListener("click", function () {
		chrome.storage.sync
			.set({
				azureClientId: clientIdEl.value.trim(),
				azureTenantId: tenantIdEl.value.trim() || "common",
				sendMode: sendModeEl.value,
			})
			.then(function () {
				statusEl.textContent = "Configuração salva.";
				setTimeout(function () {
					statusEl.textContent = "";
				}, 2000);
			});
	});

	// ---------------------------------------------------------------------
	// Destaque de movimentações por tipo de usuário (Magistrado, Ministério
	// Público, Advogado) — lido pelo content script movementHighlight.js
	// ---------------------------------------------------------------------

	const HIGHLIGHT_STORAGE_KEY = "movementHighlightPrefs";
	const HIGHLIGHT_DEFAULTS = {
		magistrado: { enabled: false, color: "#1d5fa8" },
		ministerioPublico: { enabled: false, color: "#7a1fa2" },
		advogado: { enabled: false, color: "#c77700" },
	};

	const hlEnabledEl = {
		magistrado: document.getElementById("hlMagistrado"),
		ministerioPublico: document.getElementById("hlMinisterioPublico"),
		advogado: document.getElementById("hlAdvogado"),
	};
	const hlColorEl = {
		magistrado: document.getElementById("hlMagistradoCor"),
		ministerioPublico: document.getElementById("hlMinisterioPublicoCor"),
		advogado: document.getElementById("hlAdvogadoCor"),
	};
	const statusHighlightEl = document.getElementById("statusHighlight");

	chrome.storage.sync.get([HIGHLIGHT_STORAGE_KEY]).then(function (data) {
		const prefs = Object.assign({}, HIGHLIGHT_DEFAULTS, data[HIGHLIGHT_STORAGE_KEY]);
		Object.keys(HIGHLIGHT_DEFAULTS).forEach(function (key) {
			const pref = Object.assign({}, HIGHLIGHT_DEFAULTS[key], prefs[key]);
			hlEnabledEl[key].checked = !!pref.enabled;
			hlColorEl[key].value = pref.color || HIGHLIGHT_DEFAULTS[key].color;
		});
	});

	document.getElementById("saveHighlight").addEventListener("click", function () {
		const prefs = {};
		Object.keys(HIGHLIGHT_DEFAULTS).forEach(function (key) {
			prefs[key] = {
				enabled: hlEnabledEl[key].checked,
				color: hlColorEl[key].value || HIGHLIGHT_DEFAULTS[key].color,
			};
		});
		chrome.storage.sync.set({ [HIGHLIGHT_STORAGE_KEY]: prefs }).then(function () {
			statusHighlightEl.textContent = "Preferência de destaque salva. Ela vale para todos os processos.";
			setTimeout(function () {
				statusHighlightEl.textContent = "";
			}, 2500);
		});
	});
})();
