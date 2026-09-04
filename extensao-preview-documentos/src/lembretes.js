// Projudi - Lembretes em formato post-it
//
// Adiciona um quadro de lembretes (post-its coloridos) à tela de um processo
// no Projudi. Os lembretes são gravados no Firebase Realtime Database e
// sincronizados em tempo real: qualquer pessoa com a extensão ativa que
// abrir o mesmo processo vê, cria, edita e apaga os mesmos post-its.

(function () {
	"use strict";

	const CONFIG = window.PDP_LEMBRETES_CONFIG;
	if (!CONFIG || !CONFIG.databaseURL) {
		console.warn("[Projudi Lembretes] configuração do Firebase ausente.");
		return;
	}

	const DB_URL = CONFIG.databaseURL.replace(/\/$/, "");
	const AUTOR_STORAGE_KEY = "pdpLembreteAutor";

	const CORES = [
		{ nome: "Amarelo", valor: "#fff59d" },
		{ nome: "Laranja", valor: "#ffcc80" },
		{ nome: "Rosa", valor: "#f8bbd0" },
		{ nome: "Verde", valor: "#c8e6c9" },
		{ nome: "Azul", valor: "#b3e5fc" },
		{ nome: "Lilás", valor: "#d1c4e9" },
	];
	const COR_PADRAO = CORES[0].valor;

	let processoNumero = null;
	let processoKey = null;
	let notas = {}; // { [id]: { texto, cor, autor, criadoEm, atualizadoEm } }
	let eventSource = null;
	let painelAberto = false;

	let toggleBtn = null;
	let painel = null;
	let listaEl = null;
	let autorEl = null;

	function sanitizarChaveFirebase(texto) {
		return String(texto).replace(/[.#$\/\[\]]/g, "_");
	}

	function extrairNumeroProcesso() {
		const titulo = document.getElementById("barraTituloStatusProcessual");
		if (!titulo) return null;
		const match = titulo.textContent.match(
			/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/
		);
		return match ? match[0] : null;
	}

	function getAutor() {
		return new Promise((resolve) => {
			chrome.storage.local.get([AUTOR_STORAGE_KEY], (result) => {
				resolve(result[AUTOR_STORAGE_KEY] || "");
			});
		});
	}

	function setAutor(nome) {
		return new Promise((resolve) => {
			chrome.storage.local.set({ [AUTOR_STORAGE_KEY]: nome }, resolve);
		});
	}

	async function pedirNomeAutor(nomeAtual) {
		const nome = window.prompt(
			"Como devemos identificar você nos lembretes que você criar?",
			nomeAtual || ""
		);
		if (nome === null) return nomeAtual || "";
		const nomeLimpo = nome.trim();
		await setAutor(nomeLimpo);
		return nomeLimpo;
	}

	// --- Comunicação com o Firebase Realtime Database (via REST) -----------

	function urlLembretes(sufixo) {
		return `${DB_URL}/lembretes/${processoKey}${sufixo || ""}.json`;
	}

	async function carregarNotas() {
		const resp = await fetch(urlLembretes());
		if (!resp.ok) throw new Error("Falha ao carregar lembretes: " + resp.status);
		const data = await resp.json();
		notas = data || {};
	}

	async function criarNota(cor, autor) {
		const agora = Date.now();
		const nota = {
			texto: "",
			cor: cor || COR_PADRAO,
			autor: autor || "",
			criadoEm: agora,
			atualizadoEm: agora,
		};
		const resp = await fetch(urlLembretes(), {
			method: "POST",
			body: JSON.stringify(nota),
		});
		if (!resp.ok) throw new Error("Falha ao criar lembrete: " + resp.status);
		const { name: id } = await resp.json();
		notas[id] = nota;
		return id;
	}

	function atualizarNota(id, campos) {
		return fetch(urlLembretes("/" + id), {
			method: "PATCH",
			body: JSON.stringify({ ...campos, atualizadoEm: Date.now() }),
		});
	}

	function excluirNota(id) {
		return fetch(urlLembretes("/" + id), { method: "DELETE" });
	}

	// --- Sincronização em tempo real (Server-Sent Events) -------------------

	function conectarStream() {
		if (eventSource) eventSource.close();
		eventSource = new EventSource(urlLembretes());

		eventSource.addEventListener("put", (e) => aplicarEventoStream(e, true));
		eventSource.addEventListener("patch", (e) => aplicarEventoStream(e, false));
		eventSource.onerror = () => {
			// EventSource já tenta reconectar sozinho; nada a fazer aqui.
		};
	}

	function aplicarEventoStream(e, ehPut) {
		let payload;
		try {
			payload = JSON.parse(e.data);
		} catch (err) {
			return;
		}
		const { path, data } = payload;

		if (path === "/") {
			notas = ehPut ? data || {} : { ...notas, ...(data || {}) };
		} else {
			const id = path.replace(/^\//, "").split("/")[0];
			if (data === null) {
				delete notas[id];
			} else if (ehPut) {
				notas[id] = data;
			} else {
				notas[id] = { ...(notas[id] || {}), ...data };
			}
		}
		renderizarNotas();
	}

	// --- Interface -----------------------------------------------------------

	function montarInterface() {
		toggleBtn = document.createElement("button");
		toggleBtn.type = "button";
		toggleBtn.id = "pdpLembretesToggle";
		toggleBtn.title = "Lembretes deste processo";
		toggleBtn.innerHTML = '📌 Lembretes <span id="pdpLembretesContador">0</span>';
		toggleBtn.addEventListener("click", () => setPainelAberto(!painelAberto));
		document.body.appendChild(toggleBtn);

		painel = document.createElement("div");
		painel.id = "pdpLembretesPainel";
		painel.innerHTML =
			'<div class="pdp-lembretes-header">' +
			"  <strong>Lembretes do processo</strong>" +
			'  <button type="button" class="pdp-lembretes-fechar" title="Fechar">✕</button>' +
			"</div>" +
			'<div class="pdp-lembretes-subheader">' +
			'  <span>Autor: <span id="pdpLembretesAutorNome">—</span></span>' +
			'  <button type="button" id="pdpLembretesAlterarAutor">alterar</button>' +
			"</div>" +
			'<div id="pdpLembretesLista" class="pdp-lembretes-lista"></div>' +
			'<button type="button" id="pdpLembretesNovo" class="pdp-lembretes-novo">+ Novo lembrete</button>';
		document.body.appendChild(painel);

		listaEl = painel.querySelector("#pdpLembretesLista");
		autorEl = painel.querySelector("#pdpLembretesAutorNome");

		painel
			.querySelector(".pdp-lembretes-fechar")
			.addEventListener("click", () => setPainelAberto(false));

		painel.querySelector("#pdpLembretesNovo").addEventListener("click", async () => {
			let autor = await getAutor();
			if (!autor) autor = await pedirNomeAutor(autor);
			await criarNota(COR_PADRAO, autor);
			renderizarNotas();
		});

		painel.querySelector("#pdpLembretesAlterarAutor").addEventListener("click", async () => {
			const atual = await getAutor();
			const novo = await pedirNomeAutor(atual);
			autorEl.textContent = novo || "(não informado)";
		});

		getAutor().then((nome) => {
			autorEl.textContent = nome || "(não informado)";
		});
	}

	function setPainelAberto(aberto) {
		painelAberto = aberto;
		painel.classList.toggle("pdp-lembretes-visivel", aberto);
	}

	function formatarData(timestamp) {
		if (!timestamp) return "";
		const d = new Date(timestamp);
		return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
	}

	function renderizarNotas() {
		const ids = Object.keys(notas).sort(
			(a, b) => (notas[a].criadoEm || 0) - (notas[b].criadoEm || 0)
		);

		toggleBtn.querySelector("#pdpLembretesContador").textContent = ids.length;
		toggleBtn.classList.toggle("pdp-lembretes-tem-notas", ids.length > 0);

		listaEl.innerHTML = "";

		if (ids.length === 0) {
			const vazio = document.createElement("p");
			vazio.className = "pdp-lembretes-vazio";
			vazio.textContent = "Nenhum lembrete neste processo ainda.";
			listaEl.appendChild(vazio);
			return;
		}

		ids.forEach((id) => listaEl.appendChild(criarElementoNota(id, notas[id])));
	}

	function criarElementoNota(id, nota) {
		const el = document.createElement("div");
		el.className = "pdp-postit";
		el.style.backgroundColor = nota.cor || COR_PADRAO;

		const header = document.createElement("div");
		header.className = "pdp-postit-cores";
		CORES.forEach((cor) => {
			const swatch = document.createElement("button");
			swatch.type = "button";
			swatch.className = "pdp-postit-swatch";
			swatch.style.backgroundColor = cor.valor;
			swatch.title = cor.nome;
			if (cor.valor === nota.cor) swatch.classList.add("pdp-postit-swatch-ativo");
			swatch.addEventListener("click", async () => {
				el.style.backgroundColor = cor.valor;
				nota.cor = cor.valor;
				header.querySelectorAll(".pdp-postit-swatch").forEach((s) =>
					s.classList.remove("pdp-postit-swatch-ativo")
				);
				swatch.classList.add("pdp-postit-swatch-ativo");
				await atualizarNota(id, { cor: cor.valor });
			});
			header.appendChild(swatch);
		});

		const excluirBtn = document.createElement("button");
		excluirBtn.type = "button";
		excluirBtn.className = "pdp-postit-excluir";
		excluirBtn.title = "Excluir lembrete";
		excluirBtn.textContent = "🗑";
		excluirBtn.addEventListener("click", async () => {
			if (!window.confirm("Excluir este lembrete para todos os usuários?")) return;
			await excluirNota(id);
			delete notas[id];
			renderizarNotas();
		});
		header.appendChild(excluirBtn);

		const textarea = document.createElement("textarea");
		textarea.className = "pdp-postit-texto";
		textarea.placeholder = "Escreva o lembrete...";
		textarea.value = nota.texto || "";

		let salvarTimer = null;
		textarea.addEventListener("input", () => {
			clearTimeout(salvarTimer);
			salvarTimer = setTimeout(async () => {
				nota.texto = textarea.value;
				await atualizarNota(id, { texto: textarea.value });
			}, 500);
		});

		const rodape = document.createElement("div");
		rodape.className = "pdp-postit-rodape";
		const autor = nota.autor ? nota.autor : "anônimo";
		rodape.textContent = `${autor} · ${formatarData(nota.atualizadoEm || nota.criadoEm)}`;

		el.appendChild(header);
		el.appendChild(textarea);
		el.appendChild(rodape);
		return el;
	}

	// --- Inicialização --------------------------------------------------------

	async function iniciar() {
		processoNumero = extrairNumeroProcesso();
		if (!processoNumero) return;
		processoKey = sanitizarChaveFirebase(processoNumero);

		montarInterface();

		try {
			await carregarNotas();
		} catch (err) {
			console.error("[Projudi Lembretes] erro ao carregar lembretes:", err);
		}
		renderizarNotas();
		conectarStream();
	}

	function aguardarTituloEIniciar() {
		if (document.getElementById("barraTituloStatusProcessual")) {
			iniciar();
			return;
		}
		const observer = new MutationObserver(() => {
			if (document.getElementById("barraTituloStatusProcessual")) {
				observer.disconnect();
				iniciar();
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", aguardarTituloEIniciar);
	} else {
		aguardarTituloEIniciar();
	}

	window.addEventListener("beforeunload", () => {
		if (eventSource) eventSource.close();
	});
})();
