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

	// -----------------------------------------------------------------
	// Seção "Minhas Preferências": reúne, num só lugar, todas as
	// preferências salvas pelo usuário nos botões "★" do painel de Ações
	// Rápidas (ver PREFERENCES_KEY em src/quickActions.js — mesma chave
	// de chrome.storage.local, só lida/gravada aqui também). Mostra as 20
	// primeiras por padrão (ORDER_KEY define a ordem; sem ordem salva,
	// usa a data de criação), com um campo para exibir as demais, e um
	// modo de edição que permite arrastar os cards para reordená-los.
	// -----------------------------------------------------------------

	const PREFERENCES_KEY = "pdpActionPreferences";
	const ORDER_KEY = "pdpPreferencesOrder";
	const VISIBLE_LIMIT = 20;

	const prefsSection = document.getElementById("prefsSection");
	const prefsGrid = document.getElementById("prefsGrid");
	const prefsEmpty = document.getElementById("prefsEmpty");
	const prefsShowAll = document.getElementById("prefsShowAll");
	const prefsShowAllLabel = document.getElementById("prefsShowAllLabel");
	const prefsEditToggle = document.getElementById("prefsEditToggle");

	let editMode = false;
	let draggingId = null;

	function loadAllPreferences() {
		return chrome.storage.local.get([PREFERENCES_KEY]).then(function (data) {
			return data[PREFERENCES_KEY] || {};
		});
	}

	function saveAllPreferences(all) {
		return chrome.storage.local.set({ [PREFERENCES_KEY]: all });
	}

	function removePreference(label, id) {
		return loadAllPreferences().then(function (all) {
			all[label] = (all[label] || []).filter(function (p) {
				return p.id !== id;
			});
			return saveAllPreferences(all);
		});
	}

	function loadOrder() {
		return chrome.storage.local.get([ORDER_KEY]).then(function (data) {
			return data[ORDER_KEY] || [];
		});
	}

	function saveOrder(order) {
		return chrome.storage.local.set({ [ORDER_KEY]: order });
	}

	function flattenPreferences(all, order) {
		const flat = [];
		Object.keys(all).forEach(function (label) {
			(all[label] || []).forEach(function (pref) {
				flat.push(Object.assign({}, pref, { _label: label }));
			});
		});
		const orderIndex = new Map(order.map(function (id, i) { return [id, i]; }));
		flat.sort(function (a, b) {
			const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Infinity;
			const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Infinity;
			if (ai !== bi) return ai - bi;
			return (a.createdAt || 0) - (b.createdAt || 0);
		});
		return flat;
	}

	function escapeHtml(str) {
		return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
		});
	}

	function renderPrefsGrid() {
		Promise.all([loadAllPreferences(), loadOrder()]).then(function (results) {
			const all = results[0];
			const order = results[1];
			const flat = flattenPreferences(all, order);

			prefsGrid.innerHTML = "";
			prefsEmpty.style.display = flat.length ? "none" : "block";

			const hiddenCount = Math.max(0, flat.length - VISIBLE_LIMIT);
			prefsShowAllLabel.textContent = hiddenCount
				? "Mostrar todas as preferências (" + hiddenCount + " ocultas)"
				: "Mostrar todas as preferências";

			flat.forEach(function (pref, index) {
				const card = document.createElement("div");
				card.className = "pdp-pref-card";
				card.dataset.id = pref.id;
				card.dataset.label = pref._label;
				if (index >= VISIBLE_LIMIT && !prefsShowAll.checked) {
					card.classList.add("is-hidden");
				}

				const labelEl = document.createElement("span");
				labelEl.className = "pdp-pref-label";
				labelEl.textContent = pref._label;
				card.appendChild(labelEl);

				const nameEl = document.createElement("span");
				nameEl.className = "pdp-pref-name";
				nameEl.textContent = pref.name;
				nameEl.title = pref.name;
				card.appendChild(nameEl);

				const actions = document.createElement("div");
				actions.className = "pdp-pref-actions";

				const delBtn = document.createElement("button");
				delBtn.type = "button";
				delBtn.textContent = "🗑 Remover";
				delBtn.addEventListener("click", function () {
					if (!confirm('Remover a preferência "' + pref.name + '" de "' + pref._label + '"?')) return;
					removePreference(pref._label, pref.id).then(renderPrefsGrid);
				});
				actions.appendChild(delBtn);

				card.appendChild(actions);

				if (editMode) {
					card.draggable = true;
					card.addEventListener("dragstart", function () {
						draggingId = pref.id;
						card.classList.add("dragging");
					});
					card.addEventListener("dragend", function () {
						draggingId = null;
						card.classList.remove("dragging");
						Array.prototype.forEach.call(prefsGrid.children, function (c) {
							c.classList.remove("drag-over");
						});
					});
					card.addEventListener("dragover", function (ev) {
						ev.preventDefault();
						if (pref.id !== draggingId) card.classList.add("drag-over");
					});
					card.addEventListener("dragleave", function () {
						card.classList.remove("drag-over");
					});
					card.addEventListener("drop", function (ev) {
						ev.preventDefault();
						card.classList.remove("drag-over");
						if (!draggingId || draggingId === pref.id) return;
						const draggedEl = prefsGrid.querySelector('[data-id="' + cssEscape(draggingId) + '"]');
						if (!draggedEl) return;
						prefsGrid.insertBefore(draggedEl, card);
						persistOrderFromDom();
					});
				}

				prefsGrid.appendChild(card);
			});
		});
	}

	function cssEscape(str) {
		return String(str).replace(/["\\]/g, "\\$&");
	}

	function persistOrderFromDom() {
		const order = Array.prototype.map.call(prefsGrid.children, function (c) {
			return c.dataset.id;
		});
		saveOrder(order);
	}

	prefsShowAll.addEventListener("change", renderPrefsGrid);

	prefsEditToggle.addEventListener("click", function () {
		editMode = !editMode;
		prefsSection.classList.toggle("pdp-edit-mode", editMode);
		prefsEditToggle.textContent = editMode ? "✅ Concluir edição" : "✏️ Editar posição dos cards";
		if (editMode && !prefsShowAll.checked) {
			prefsShowAll.checked = true;
		}
		renderPrefsGrid();
	});

	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area === "local" && (changes[PREFERENCES_KEY] || changes[ORDER_KEY])) {
			renderPrefsGrid();
		}
	});

	renderPrefsGrid();
})();
