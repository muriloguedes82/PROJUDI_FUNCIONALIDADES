// Menu da extensão - ícone fixo e discreto no cabeçalho do Projudi/SEEU.
//
// Onde fica o ícone:
//   - Projudi: logo abaixo do link "Sair" (canto superior direito);
//   - SEEU: na faixa azul do menu, abaixo do nome do usuário.
// O ícone acompanha o elemento de referência (posição fixa recalculada a
// cada rolagem/redimensionamento) e nunca sai do topo da tela. Se a
// referência não for encontrada (tela diferente), fica no canto superior
// direito.
//
// Ao clicar, abre o Menu com:
//   1. todas as funcionalidades (src/funcionalidades.js), cada uma com uma
//      chave liga/desliga, em duas abas iguais: PROJUDI e SEEU. A aba que
//      abre é a do sistema em que a página está (reconhecido pelo endereço),
//      mas as duas podem ser editadas. A escolha é gravada em
//      chrome.storage.local, por sistema, e o service worker
//      (src/termosUso.js) passa a injetar em cada sistema só os arquivos das
//      funcionalidades ativas nele - vale a partir do próximo carregamento
//      da página (o Menu oferece "Recarregar agora");
//   2. backup das preferências: "Exportar" baixa um arquivo .json com todas
//      as preferências (inclusive as funcionalidades desativadas), combos,
//      listas de tarefas, destinatários etc.; "Importar" lê esse arquivo em
//      outro computador e substitui as preferências de lá; "Padrão" reativa
//      todas as funcionalidades do sistema da aba aberta, sem apagar
//      preferências;
//   3. "Manual do Usuário" (src/manual.html) e os Termos de Uso.
//
// O backup nunca leva o aceite dos Termos de Uso (é pessoal e por
// instalação), tokens de login (msalToken), trabalhos em andamento (envios,
// combos e juntadas pendentes) nem registros de diagnóstico.
//
// A interface fica num Shadow DOM, para que o CSS das páginas do Tribunal
// não interfira nela (e vice-versa).
(function () {
	"use strict";
	if (!window.__pdpHostPermitido) return; // só Projudi/SEEU (ver hostGuard.js)
	if (window.__pdpMenuExtensao || !self.PDP_FUNCIONALIDADES) return;
	window.__pdpMenuExtensao = true;

	const CAT = self.PDP_FUNCIONALIDADES;
	const CHAVE = CAT.chave;
	const ITENS = CAT.grupos.flatMap(function (g) { return g.itens; });
	const POR_ID = new Map(ITENS.map(function (item) { return [item.id, item]; }));
	const IS_SEEU = /(^|\.)seeu\.pje\.jus\.br$/i.test(location.hostname);
	const SISTEMAS = CAT.sistemas;
	const SISTEMA_ATUAL = self.pdpSistemaDoHost(location.hostname);
	const outroSistema = function (id) { return SISTEMAS.find(function (s) { return s.id !== id; }); };
	const nomeSistema = function (id) { return SISTEMAS.find(function (s) { return s.id === id; }).nome; };
	const IS_TOPO = window.top === window;

	const FORMATO_BACKUP = "projudi-seeu-extensao-backup";
	// Chaves do chrome.storage.local que não vão para o backup (ver acima).
	// Do storage.local só entram chaves "pdp..."; do storage.sync, todas
	// (configuração do e-mail e preferências de destaque/ocultação).
	const FORA_DO_BACKUP = new Set([
		"pdpTermosUso",
		"pdpPerfilAdvocaciaBloqueado",
		"pdpWhatsappPending",
		"pdpJuntarDocumentoJob",
		"pdpJuntarDocumentoPendingSave",
		"pdpComboRun",
		"pdpComboPendente",
		"pdpComboJuntadaConcluir",
		"pdpComboJuntadaConcluida",
		"pdpNovaRemessaLog",
		"pdpNovaOrdenacaoLog",
		"pdpNovaRemessaFeito",
		"pdpNovaOrdenacaoFeito"
	]);
	const entraNoBackup = function (chave) { return /^pdp/.test(chave) && !FORA_DO_BACKUP.has(chave); };

	const normalizar = function (t) {
		return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
	};

	function el(tag, attrs, filhos) {
		const e = document.createElement(tag);
		Object.entries(attrs || {}).forEach(function ([k, v]) {
			if (v == null || v === false) return;
			if (k === "text") e.textContent = v;
			else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
			else e.setAttribute(k, v === true ? "" : v);
		});
		(filhos || []).forEach(function (f) { if (f) e.append(f); });
		return e;
	}

	// ------------------------------------------------------------------
	// Localização do ícone
	// ------------------------------------------------------------------

	function visivel(e) {
		if (!e || !e.isConnected) return null;
		const r = e.getBoundingClientRect();
		return r.width > 0 && r.height > 0 ? r : null;
	}

	// Projudi: link "Sair" do cabeçalho (num frame interno, só se o frame
	// também tiver o quadro do usuário - "Usuário:", "Atribuição:"...).
	function referenciaProjudi() {
		if (!IS_TOPO && !document.querySelector("#userinfo, .userinfo_label")) return null;
		for (const a of document.querySelectorAll("a, button")) {
			if (normalizar(a.textContent).replace(/^[^a-z]+/, "") !== "sair") continue;
			const r = visivel(a);
			if (r && r.top < 200) return { tipo: "abaixo", alvo: a };
		}
		return null;
	}

	// SEEU: faixa do menu (Início, Processos, ... Cadastro, Outros) e, acima
	// dela, o nome do usuário (texto mais à direita do cabeçalho).
	function referenciaSeeu() {
		const links = [...document.querySelectorAll("a, span, li, button")].filter(function (e) {
			return e.children.length === 0 && /^(processos|cadastro)$/.test(normalizar(e.textContent)) && visivel(e);
		});
		const processos = links.find(function (e) { return normalizar(e.textContent) === "processos"; });
		const cadastro = links.find(function (e) { return normalizar(e.textContent) === "cadastro"; });
		if (!IS_TOPO || !processos || !cadastro) return null;
		let barra = processos.parentElement;
		while (barra && !barra.contains(cadastro)) barra = barra.parentElement;
		// Sobe até a faixa ocupar (quase) toda a largura da tela.
		while (barra && barra.parentElement && barra.getBoundingClientRect().width < innerWidth * 0.8 &&
			barra.parentElement !== document.body) barra = barra.parentElement;
		const rBarra = barra && visivel(barra);
		if (!rBarra || rBarra.top > 260) return null;
		let nome = null, rNome = null;
		for (const e of document.body.querySelectorAll("*")) {
			if (e.id === "pdp-menu-host") continue;
			const texto = [...e.childNodes].filter(function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join("").trim();
			if (!/[a-z]{2,}/.test(normalizar(texto)) || /tjpr|vara|seeu|juizo|comarca/.test(normalizar(texto))) continue;
			const r = visivel(e);
			if (!r || r.bottom > rBarra.top + 2 || r.left < innerWidth * 0.6) continue;
			if (!rNome || r.right > rNome.right) { nome = e; rNome = r; }
		}
		return { tipo: "faixa", alvo: barra, nome: nome };
	}

	// A busca percorre a página; o resultado fica guardado e só é refeito
	// quando o elemento some (ou a cada verificação periódica, se ainda não
	// houver referência).
	let referencia = null;
	function calcularPosicao(buscar) {
		const TAM = 22;
		if (!visivel(referencia && referencia.alvo) && buscar) referencia = IS_SEEU ? referenciaSeeu() : referenciaProjudi();
		const ref = referencia;
		const rect = visivel(ref && ref.alvo);
		if (!rect) return null;
		let top, left;
		if (ref.tipo === "abaixo") {
			top = rect.bottom + 4;
			left = rect.right - TAM;
		} else {
			const rNome = visivel(ref.nome);
			top = rect.top + (rect.height - TAM) / 2;
			left = rNome ? rNome.left + (rNome.width - TAM) / 2 : rect.right - 80;
		}
		return {
			top: Math.max(4, Math.min(top, innerHeight - TAM - 4)),
			left: Math.max(4, Math.min(left, innerWidth - TAM - 4))
		};
	}

	// ------------------------------------------------------------------
	// Estado: funcionalidades desativadas
	// ------------------------------------------------------------------

	// Uma lista de desativadas por sistema; `desativadas` é a da aba aberta.
	const listas = {};
	SISTEMAS.forEach(function (s) { listas[s.id] = new Set(); });
	let abaAtiva = SISTEMA_ATUAL;
	let desativadas = listas[abaAtiva];
	let alterouNestaPagina = false;

	function definirListas(dados) {
		SISTEMAS.forEach(function (s) {
			listas[s.id] = new Set(self.pdpDesativadasDoSistema(dados, s.id).filter(function (id) { return POR_ID.has(id); }));
		});
		desativadas = listas[abaAtiva];
	}

	function trocarAba(id) {
		if (id === abaAtiva) return;
		abaAtiva = id;
		desativadas = listas[id];
		aviso = null;
		confirmacao = null;
		render();
	}

	// Inclui as dependentes das desativadas (a mesma regra do service worker).
	function efetivamenteDesativadas(conjunto) {
		const fora = new Set(conjunto);
		let mudou = true;
		while (mudou) {
			mudou = false;
			ITENS.forEach(function (item) {
				if (!fora.has(item.id) && (item.requer || []).some(function (id) { return fora.has(id); })) {
					fora.add(item.id);
					mudou = true;
				}
			});
		}
		return fora;
	}

	function nomes(ids) {
		return ids.map(function (id) { return "\"" + POR_ID.get(id).nome + "\""; }).join(", ");
	}

	function alternar(id, ativar) {
		const novo = new Set(efetivamenteDesativadas(desativadas));
		const extras = [];
		if (ativar) {
			const fila = [id];
			while (fila.length) {
				const atual = fila.shift();
				if (novo.delete(atual) && atual !== id) extras.push(atual);
				(POR_ID.get(atual).requer || []).forEach(function (r) { if (novo.has(r)) fila.push(r); });
			}
		} else {
			novo.add(id);
			efetivamenteDesativadas(novo).forEach(function (x) {
				if (!novo.has(x)) { novo.add(x); extras.push(x); }
			});
		}
		listas[abaAtiva] = desativadas = novo;
		if (abaAtiva === SISTEMA_ATUAL) alterouNestaPagina = true;
		gravar();
		if (extras.length) {
			avisar((ativar ? "Também ativada(s), pois são necessárias: " : "Também desativada(s), pois dependem dela: ") + nomes(extras) + ".", "info");
		}
		render();
	}

	function gravar() {
		const valor = {};
		SISTEMAS.forEach(function (s) { valor[s.id] = [...listas[s.id]]; });
		chrome.storage.local.set({ [CHAVE]: valor }).catch(function (err) {
			avisar("Não foi possível gravar a preferência: " + err.message, "erro");
		});
	}

	// ------------------------------------------------------------------
	// Backup
	// ------------------------------------------------------------------

	function contarBackup(local) {
		const tamanho = function (v) { return Array.isArray(v) ? v.length : 0; };
		const acoes = Object.values(local.pdpActionPreferences || {}).reduce(function (s, v) { return s + tamanho(v); }, 0);
		const linhas = [
			["preferência(s) das ações rápidas", acoes],
			["preferência(s) de Juntar Documento", tamanho(local.pdpJuntarDocumentoPrefs)],
			["combo(s)", tamanho(local.pdpPreferenceCombos)],
			["lista(s) de tarefas", tamanho(local.pdpTarefasListas)],
			["contato(s) de WhatsApp", tamanho(local.pdpWhatsappContacts)],
			["destinatário(s) de e-mail", tamanho(local.pdpEmailRecipients)],
			["remetente(s) de e-mail", tamanho(local.pdpFromAccounts)]
		].filter(function (l) { return l[1] > 0; }).map(function (l) { return l[1] + " " + l[0]; });
		SISTEMAS.forEach(function (s) {
			const fora = self.pdpDesativadasDoSistema(local, s.id).length;
			linhas.push(fora ? fora + " funcionalidade(s) desativada(s) no " + s.nome : "todas as funcionalidades ativas no " + s.nome);
		});
		return linhas;
	}

	async function exportar() {
		try {
			const [local, sync] = await Promise.all([chrome.storage.local.get(null), chrome.storage.sync.get(null)]);
			const dadosLocal = {};
			Object.keys(local).filter(entraNoBackup).forEach(function (k) { dadosLocal[k] = local[k]; });
			const backup = {
				formato: FORMATO_BACKUP,
				versaoFormato: 1,
				versaoExtensao: chrome.runtime.getManifest().version,
				criadoEm: new Date().toISOString(),
				local: dadosLocal,
				sync: sync
			};
			const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const hoje = new Date();
			const data = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0");
			const a = el("a", { href: url, download: "extensao-projudi-seeu-preferencias-" + data + ".json" });
			shadow.append(a);
			a.click();
			a.remove();
			setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
			avisar("Backup exportado (" + contarBackup(dadosLocal).join("; ") + "). Guarde o arquivo e use \"Importar\" no outro computador.", "ok");
		} catch (err) {
			avisar("Falha ao exportar: " + err.message, "erro");
		}
	}

	function escolherArquivo() {
		const input = el("input", { type: "file", accept: ".json,application/json" });
		input.style.display = "none";
		input.addEventListener("change", function () {
			const arquivo = input.files && input.files[0];
			input.remove();
			if (!arquivo) return;
			arquivo.text().then(function (texto) {
				let backup;
				try { backup = JSON.parse(texto); } catch (_) { backup = null; }
				if (!backup || backup.formato !== FORMATO_BACKUP || typeof backup.local !== "object" || !backup.local) {
					avisar("Este arquivo não é um backup de preferências desta extensão.", "erro");
					return;
				}
				confirmarImportacao(backup, arquivo.name);
			}).catch(function (err) { avisar("Não foi possível ler o arquivo: " + err.message, "erro"); });
		});
		shadow.append(input);
		input.click();
	}

	function confirmarImportacao(backup, nomeArquivo) {
		const local = {};
		Object.keys(backup.local).filter(entraNoBackup).forEach(function (k) { local[k] = backup.local[k]; });
		const sync = backup.sync && typeof backup.sync === "object" ? backup.sync : {};
		const quando = backup.criadoEm ? new Date(backup.criadoEm).toLocaleString("pt-BR") : "data desconhecida";
		confirmacao = {
			titulo: "Importar \"" + nomeArquivo + "\"?",
			texto: "Backup de " + quando + " (versão " + (backup.versaoExtensao || "?") + "): " + contarBackup(local).join("; ") +
				". As preferências atuais deste computador serão substituídas por essas.",
			rotulo: "Substituir preferências",
			acao: function () { importar(local, sync); }
		};
		render();
	}

	async function importar(local, sync) {
		try {
			const atual = await chrome.storage.local.get(null);
			const remover = Object.keys(atual).filter(function (k) { return entraNoBackup(k) && !(k in local); });
			if (remover.length) await chrome.storage.local.remove(remover);
			await chrome.storage.local.set(local);
			if (Object.keys(sync).length) await chrome.storage.sync.set(sync);
			definirListas(local);
			alterouNestaPagina = true;
			avisar("Preferências importadas. Recarregue as páginas do Projudi/SEEU abertas para aplicá-las.", "ok");
		} catch (err) {
			avisar("Falha ao importar: " + err.message, "erro");
		}
		render();
	}

	function copiarPara(destino) {
		confirmacao = {
			titulo: "Copiar para o " + nomeSistema(destino) + "?",
			texto: "O " + nomeSistema(destino) + " passará a ter as mesmas funcionalidades ativas e desativadas do " + nomeSistema(abaAtiva) + " (as escolhas atuais do " + nomeSistema(destino) + " serão substituídas).",
			rotulo: "Copiar",
			acao: function () {
				listas[destino] = new Set(desativadas);
				if (destino === SISTEMA_ATUAL) alterouNestaPagina = true;
				gravar();
				avisar("Configuração copiada para o " + nomeSistema(destino) + ".", "ok");
			}
		};
		render();
	}

	function restaurarPadrao() {
		confirmacao = {
			titulo: "Restaurar o padrão do " + nomeSistema(abaAtiva) + "?",
			texto: "Todas as funcionalidades do " + nomeSistema(abaAtiva) + " voltam a ficar ativas (o outro sistema não muda). Preferências, combos, listas e contatos salvos não são apagados.",
			rotulo: "Reativar tudo",
			acao: function () {
				listas[abaAtiva] = desativadas = new Set();
				if (abaAtiva === SISTEMA_ATUAL) alterouNestaPagina = true;
				gravar();
				avisar("Todas as funcionalidades do " + nomeSistema(abaAtiva) + " foram reativadas.", "ok");
				render();
			}
		};
		render();
	}

	function abrirPagina(pagina) {
		chrome.runtime.sendMessage({ source: "projudi-preview", type: "abrir-pagina-extensao", pagina: pagina })
			.then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || "sem resposta"); })
			.catch(function (err) {
				avisar("Não foi possível abrir a página (" + err.message + "). Recarregue a página e tente de novo.", "erro");
			});
	}

	// ------------------------------------------------------------------
	// Interface
	// ------------------------------------------------------------------

	// Balança da Justiça (pratos preenchidos com a mesma cor do traço).
	const ICONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="cheio" cx="12" cy="4" r="1.3"/>' +
		'<path d="M12 5.3V19.5M8 20.5h8M4.5 7.5h15M4.5 7.5L2 13M4.5 7.5L7 13M19.5 7.5L17 13M19.5 7.5L22 13"/>' +
		'<path class="cheio" d="M1.8 13a2.7 2.2 0 0 0 5.4 0zM16.8 13a2.7 2.2 0 0 0 5.4 0z"/></svg>';

	const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: "Segoe UI", Roboto, Arial, Helvetica, sans-serif; }
.icone {
	position: fixed; z-index: 2147483000; width: 22px; height: 22px; padding: 0; margin: 0;
	border-radius: 6px; border: 1.5px solid #0b2545; background: linear-gradient(135deg, #f7d774, #c9a227 55%, #9c7a12);
	color: #0b2545; cursor: pointer; display: flex; align-items: center; justify-content: center;
	box-shadow: 0 1px 4px rgba(156,122,18,.55); transition: transform .15s, box-shadow .15s, filter .15s;
}
.icone:hover, .icone:focus-visible, .icone[aria-expanded="true"] { transform: scale(1.1); filter: brightness(1.06); box-shadow: 0 2px 7px rgba(11,37,69,.45); outline: none; }
.icone svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icone svg .cheio, .cab svg .cheio { fill: currentColor; }
.icone.desativadas::after {
	content: ""; position: absolute; top: -4px; right: -4px; width: 8px; height: 8px; border-radius: 50%;
	background: #d6453d; border: 1.5px solid #fff;
}
.painel {
	position: fixed; z-index: 2147483001; width: 400px; max-width: calc(100vw - 16px);
	display: flex; flex-direction: column; background: #fff; color: #25324a; font-size: 13px; line-height: 1.35;
	border: 1px solid #d5deea; border-radius: 10px; box-shadow: 0 10px 30px rgba(11,37,69,.25); overflow: hidden;
}
.cab {
	display: flex; align-items: center; gap: 10px; padding: 10px 12px; color: #fff;
	background: linear-gradient(120deg, #0b2545, #13396b 60%, #1f5591); border-bottom: 3px solid #c9a227;
}
.cab svg { width: 22px; height: 22px; fill: none; stroke: currentColor; color: #e6c14a; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.cab h2 { margin: 0; font-size: 14px; font-weight: 600; }
.cab small { display: block; font-size: 11px; opacity: .8; }
.cab .fechar { margin-left: auto; background: none; border: 0; color: #fff; font-size: 18px; cursor: pointer; opacity: .8; padding: 0 4px; }
.cab .fechar:hover { opacity: 1; }
.abas { display: flex; gap: 4px; padding: 8px 12px 0; background: #f4f6fa; border-bottom: 1px solid #d5deea; }
.aba {
	flex: 1; padding: 7px 8px; border: 1px solid #d5deea; border-bottom: 0; border-radius: 7px 7px 0 0;
	background: #e8eff8; color: #5b6980; font-size: 12.5px; font-weight: 700; letter-spacing: .03em; cursor: pointer;
}
.aba:hover { background: #dbe6f4; }
.aba[aria-selected="true"] { background: #fff; color: #13396b; box-shadow: inset 0 3px 0 #c9a227; margin-bottom: -1px; padding-bottom: 8px; }
.aba small { font-weight: 400; font-size: 10.5px; opacity: .8; margin-left: 4px; }
.aba:focus-visible { outline: 2px solid #c9a227; outline-offset: -2px; }
.copiar { background: none; border: 0; padding: 0; color: #1f5591; font-size: 12px; text-decoration: underline; cursor: pointer; }
.corpo { overflow-y: auto; padding: 4px 12px 8px; }
.resumo { display: flex; justify-content: space-between; align-items: center; margin: 6px 0 2px; color: #5b6980; font-size: 12px; }
.grupo h3 { margin: 12px 0 4px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #1f5591; }
.item { display: flex; align-items: flex-start; gap: 10px; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
.item:hover { background: #f4f6fa; }
.item .txt { flex: 1; min-width: 0; }
.item .nome { font-weight: 600; }
.item .desc { color: #5b6980; font-size: 11.5px; }
.item .req { color: #8a6d12; font-size: 11px; }
.item.off .nome, .item.off .desc { color: #98a3b5; }
.chave { position: relative; flex: none; width: 34px; height: 18px; margin-top: 1px; }
.chave input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.chave span { position: absolute; inset: 0; border-radius: 9px; background: #c3ccd9; transition: background .15s; pointer-events: none; }
.chave span::after {
	content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
	background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .15s;
}
.chave input:checked + span { background: #1f5591; }
.chave input:checked + span::after { transform: translateX(16px); }
.chave input:focus-visible + span { outline: 2px solid #c9a227; outline-offset: 1px; }
.aviso { margin: 8px 12px 0; padding: 8px 10px; border-radius: 6px; font-size: 12px; }
.aviso.info { background: #e8eff8; color: #13396b; }
.aviso.ok { background: #e6f4ea; color: #1e6b34; }
.aviso.erro { background: #fdecea; color: #a12622; }
.recarregar { display: flex; align-items: center; gap: 8px; margin: 8px 12px 0; padding: 8px 10px; border-radius: 6px; background: #f7efd6; color: #6b5310; font-size: 12px; }
.recarregar button { margin-left: auto; }
.rodape { border-top: 1px solid #d5deea; padding: 10px 12px 12px; background: #f9fafc; }
.rodape h4 { margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #1f5591; }
.botoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
button.bt {
	padding: 6px 8px; border: 1px solid #c7d2e2; border-radius: 6px; background: #fff; color: #13396b;
	font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
button.bt:hover { background: #e8eff8; border-color: #1f5591; }
button.bt.primario { background: #13396b; border-color: #13396b; color: #fff; }
button.bt.primario:hover { background: #1f5591; }
.manual { width: 100%; margin-top: 8px; padding: 8px; }
.nota { margin: 6px 0 0; color: #5b6980; font-size: 11px; }
.nota a { color: #1f5591; cursor: pointer; text-decoration: underline; }
.confirmar { margin: 8px 12px 0; padding: 10px; border: 1px solid #c9a227; border-radius: 8px; background: #fffaf0; }
.confirmar strong { display: block; margin-bottom: 4px; }
.confirmar p { margin: 0 0 8px; font-size: 12px; }
.confirmar .acoes { display: flex; gap: 6px; justify-content: flex-end; }
`;

	let host = null, shadow = null, icone = null, painel = null;
	let aberto = false;
	let aviso = null; // {texto, tipo}
	let confirmacao = null; // {titulo, texto, rotulo, acao}

	function avisar(texto, tipo) {
		aviso = { texto: texto, tipo: tipo || "info" };
		render();
	}

	function montar() {
		host = el("div", { id: "pdp-menu-host" });
		shadow = host.attachShadow({ mode: "closed" });
		shadow.append(el("style", { text: CSS }));
		icone = el("button", {
			type: "button", class: "icone", "aria-haspopup": "dialog", "aria-expanded": "false",
			title: "Menu da extensão Projudi/SEEU - funcionalidades, backup e manual",
			"aria-label": "Menu da extensão Projudi/SEEU",
			onclick: function (ev) { ev.stopPropagation(); aberto ? fechar() : abrir(); }
		});
		icone.innerHTML = ICONE_SVG;
		shadow.append(icone);
		document.documentElement.append(host);
	}

	function abrir() {
		aberto = true;
		aviso = null;
		confirmacao = null;
		icone.setAttribute("aria-expanded", "true");
		render();
		posicionar();
	}

	function fechar() {
		aberto = false;
		icone.setAttribute("aria-expanded", "false");
		if (painel) { painel.remove(); painel = null; }
	}

	function render() {
		if (icone) {
			const qtd = efetivamenteDesativadas(listas[SISTEMA_ATUAL]).size;
			icone.classList.toggle("desativadas", qtd > 0);
		}
		if (!aberto) return;
		const foco = shadow.activeElement && shadow.activeElement.dataset ? shadow.activeElement.dataset.id : null;
		const rolagem = painel ? painel.querySelector(".corpo").scrollTop : 0;
		const novo = construirPainel();
		if (painel) painel.replaceWith(novo); else shadow.append(novo);
		painel = novo;
		painel.querySelector(".corpo").scrollTop = rolagem;
		if (foco) {
			const alvo = painel.querySelector('input[data-id="' + foco + '"]');
			if (alvo) alvo.focus();
		}
		posicionar();
	}

	function construirPainel() {
		const fora = efetivamenteDesativadas(desativadas);
		const ativas = ITENS.length - fora.size;

		const cabIcone = el("span");
		cabIcone.innerHTML = ICONE_SVG;
		const cab = el("div", { class: "cab" }, [
			cabIcone.firstChild,
			el("div", {}, [
				el("h2", { text: "Menu da extensão" }),
				el("small", { text: "Projudi/SEEU · versão " + chrome.runtime.getManifest().version })
			]),
			el("button", { type: "button", class: "fechar", title: "Fechar (Esc)", "aria-label": "Fechar", text: "✕", onclick: fechar })
		]);

		const abas = el("div", { class: "abas", role: "tablist", "aria-label": "Sistema" }, SISTEMAS.map(function (sis) {
			const selecionada = sis.id === abaAtiva;
			return el("button", {
				type: "button", class: "aba", role: "tab", "aria-selected": selecionada ? "true" : "false", "data-aba": sis.id,
				title: sis.id === SISTEMA_ATUAL ? "Sistema em que você está agora" : "Configurar também o " + sis.nome,
				onclick: function () { trocarAba(sis.id); }
			}, [sis.nome, sis.id === SISTEMA_ATUAL ? el("small", { text: "(este)" }) : null]);
		}));

		const outro = outroSistema(abaAtiva);
		const corpo = el("div", { class: "corpo", role: "tabpanel" }, [
			el("div", { class: "resumo" }, [
				el("span", { text: "Funcionalidades no " + nomeSistema(abaAtiva) + ": " + ativas + " de " + ITENS.length + " ativas" }),
				el("button", {
					type: "button", class: "copiar", text: "Copiar para o " + outro.nome,
					title: "Deixa o " + outro.nome + " com as mesmas funcionalidades ativas do " + nomeSistema(abaAtiva),
					onclick: function () { copiarPara(outro.id); }
				})
			])
		]);
		CAT.grupos.forEach(function (grupo) {
			const bloco = el("div", { class: "grupo" }, [el("h3", { text: grupo.nome })]);
			grupo.itens.forEach(function (item) {
				const ligado = !fora.has(item.id);
				const idCampo = "pdp-menu-" + item.id;
				const input = el("input", {
					type: "checkbox", id: idCampo, "data-id": item.id, checked: ligado,
					onchange: function () { alternar(item.id, input.checked); }
				});
				const requer = (item.requer || []).length
					? el("div", { class: "req", text: "Requer: " + item.requer.map(function (id) { return POR_ID.get(id).nome; }).join(", ") })
					: null;
				bloco.append(el("label", { class: "item" + (ligado ? "" : " off"), for: idCampo }, [
					el("span", { class: "chave" }, [input, el("span")]),
					el("span", { class: "txt" }, [
						el("div", { class: "nome", text: item.nome }),
						el("div", { class: "desc", text: item.descricao }),
						requer
					])
				]));
			});
			corpo.append(bloco);
		});

		const filhos = [cab, abas];
		if (alterouNestaPagina) {
			filhos.push(el("div", { class: "recarregar" }, [
				el("span", { text: "As mudanças valem a partir do próximo carregamento da página." }),
				el("button", { type: "button", class: "bt primario", text: "Recarregar agora", onclick: function () { location.reload(); } })
			]));
		}
		if (aviso) filhos.push(el("div", { class: "aviso " + aviso.tipo, role: "status", text: aviso.texto }));
		if (confirmacao) {
			const c = confirmacao;
			filhos.push(el("div", { class: "confirmar", role: "alertdialog" }, [
				el("strong", { text: c.titulo }),
				el("p", { text: c.texto }),
				el("div", { class: "acoes" }, [
					el("button", { type: "button", class: "bt", text: "Cancelar", onclick: function () { confirmacao = null; render(); } }),
					el("button", { type: "button", class: "bt primario", text: c.rotulo, onclick: function () { confirmacao = null; c.acao(); } })
				])
			]));
		}
		filhos.push(corpo);

		const termos = el("a", { text: "Termos de Uso", onclick: function () { abrirPagina("termos"); } });
		filhos.push(el("div", { class: "rodape" }, [
			el("h4", { text: "Preferências e combos" }),
			el("div", { class: "botoes" }, [
				el("button", { type: "button", class: "bt", text: "⬇ Exportar", title: "Baixar um arquivo com todas as preferências, combos e funcionalidades ativadas/desativadas", onclick: exportar }),
				el("button", { type: "button", class: "bt", text: "⬆ Importar", title: "Carregar um arquivo exportado (ex.: em outro computador)", onclick: escolherArquivo }),
				el("button", { type: "button", class: "bt", text: "↺ Padrão", title: "Reativar todas as funcionalidades (as preferências salvas são mantidas)", onclick: restaurarPadrao })
			]),
			el("p", { class: "nota" }, [
				"Use \"Exportar\" e, no outro computador, \"Importar\" o mesmo arquivo para levar tudo junto. ",
				termos,
				"."
			]),
			el("button", { type: "button", class: "bt manual", text: "📖 Manual do Usuário", onclick: function () { abrirPagina("manual"); } })
		]));

		return el("div", { class: "painel", role: "dialog", "aria-label": "Menu da extensão" }, filhos);
	}

	function posicionar(buscar) {
		if (!icone) return;
		const pos = calcularPosicao(buscar) || (IS_TOPO ? { top: 4, left: innerWidth - 30 } : null);
		if (!pos) return;
		icone.style.top = pos.top + "px";
		icone.style.left = pos.left + "px";
		if (painel) {
			const largura = painel.offsetWidth;
			const top = pos.top + 28;
			painel.style.top = top + "px";
			painel.style.left = Math.max(8, Math.min(pos.left + 22 - largura, innerWidth - largura - 8)) + "px";
			painel.style.maxHeight = Math.max(200, innerHeight - top - 8) + "px";
		}
	}

	let agendado = false;
	function agendarPosicao() {
		if (agendado) return;
		agendado = true;
		requestAnimationFrame(function () { agendado = false; posicionar(); });
	}

	// ------------------------------------------------------------------
	// Início
	// ------------------------------------------------------------------

	// O ícone vai para o frame que tem a referência (no Projudi o cabeçalho
	// pode estar num frame próprio, que então marca o documento do topo).
	// Sem referência, só o frame do topo o recebe, no canto superior
	// direito - e só se for uma página comum (não um <frameset>), que não
	// tenha sido aberta como janela auxiliar do sistema (ex.: Oráculo).
	const MARCA_FRAME = "data-pdp-menu-no-frame";
	function iniciar(tentativa) {
		const temReferencia = !!calcularPosicao(true);
		const raizTopo = (function () { try { return window.top.document.documentElement; } catch (_) { return null; } })();
		const podeSemReferencia = IS_TOPO && tentativa >= 6 && !window.opener && document.body &&
			document.body.tagName !== "FRAMESET" && !document.documentElement.hasAttribute(MARCA_FRAME);
		if (!temReferencia && !podeSemReferencia) {
			if (tentativa < 6) setTimeout(function () { iniciar(tentativa + 1); }, 500);
			return;
		}
		if (temReferencia && !IS_TOPO && raizTopo) raizTopo.setAttribute(MARCA_FRAME, "1");
		montar();
		render();
		posicionar(true);
		addEventListener("scroll", agendarPosicao, true);
		addEventListener("resize", agendarPosicao);
		setInterval(function () { posicionar(true); }, 1500); // o cabeçalho pode mudar de tamanho sem evento
		document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && aberto) fechar(); }, true);
		document.addEventListener("mousedown", function (ev) {
			if (aberto && !ev.composedPath().includes(host)) fechar();
		}, true);
	}

	chrome.storage.local.get([CHAVE, CAT.chaveAntiga]).then(function (data) {
		definirListas(data);
		iniciar(0);
	});

	// Mudanças feitas em outra aba (ou por uma importação) aparecem aqui também.
	chrome.storage.onChanged.addListener(function (changes, area) {
		if (area !== "local" || !(changes[CHAVE] || changes[CAT.chaveAntiga])) return;
		chrome.storage.local.get([CHAVE, CAT.chaveAntiga]).then(function (data) {
			definirListas(data);
			render();
		});
	});
})();
