// Página da extensão carregada em iframe nas telas do Projudi para abrir o
// Assinador TJPR (arquivo .jnlp baixado ao clicar em "Assinar") sem passar
// pela lista de downloads do navegador. Ver src/assinadorAutomatico.js.
//
// chrome.downloads.open só funciona com um clique do usuário NESTA página
// (o Chrome dá 5 segundos depois do clique) e com a autorização opcional
// "downloads.open", pedida no próprio cartão na primeira vez.
//
// Modos (?modo=):
//   botao  - área transparente sobre o "Assinar" do Projudi. O clique avisa
//            a página (que clica no botão de verdade) e, quando o .jnlp
//            termina de baixar, este iframe o abre.
//   cartao - aviso "O Assinador TJPR foi baixado" com o botão "Abrir o
//            assinador" (&id= download), usado quando o modo botao não
//            conseguiu abrir sozinho.
"use strict";

const MESSAGE_SOURCE = "projudi-preview";
const PERMISSAO = { permissions: ["downloads.open"] };
// Depois do clique, espera o download do .jnlp por até este tempo; mas o
// Chrome só aceita abrir enquanto o clique estiver "valendo" (5 s).
const ARMADO_MS = 15000;

const params = new URLSearchParams(location.search);
const modo = params.get("modo") === "cartao" ? "cartao" : "botao";
document.body.classList.add(modo);

const origemPai = (location.ancestorOrigins && location.ancestorOrigins[0]) || "*";
function avisarPagina(tipo) {
	try { parent.postMessage({ pdpAssinador: tipo }, origemPai); } catch (e) { /* página saiu */ }
}

let temPermissao = false;
function conferirPermissao() {
	try {
		chrome.permissions.contains(PERMISSAO, function (ok) {
			void chrome.runtime.lastError;
			temPermissao = !!ok;
		});
	} catch (e) { temPermissao = false; }
}
conferirPermissao();
if (chrome.permissions.onAdded) chrome.permissions.onAdded.addListener(conferirPermissao);
if (chrome.permissions.onRemoved) chrome.permissions.onRemoved.addListener(conferirPermissao);

function ehHostProjudi(url) {
	try { return /(^|\.)tjpr\.jus\.br$/i.test(new URL(url).hostname); } catch (e) { return false; }
}

function ehAssinador(item) {
	if (!item) return false;
	const jnlp = /\.jnlp$/i.test(item.filename || "") || /jnlp/i.test(item.mime || "");
	return jnlp && (ehHostProjudi(item.finalUrl || item.url) || ehHostProjudi(item.url) || ehHostProjudi(item.referrer));
}

// Abre o download e avisa o service worker (que então não mostra o cartão).
function abrir(id, retorno) {
	try {
		chrome.downloads.open(id, function () {
			const erro = chrome.runtime.lastError;
			if (!erro) chrome.runtime.sendMessage({ source: MESSAGE_SOURCE, type: "assinador-aberto", id: id }, function () { void chrome.runtime.lastError; });
			if (retorno) retorno(erro ? erro.message || String(erro) : null);
		});
	} catch (e) {
		if (retorno) retorno(String((e && e.message) || e));
	}
}

if (modo === "botao") {
	const area = document.getElementById("area");
	let armadoAte = 0;

	area.addEventListener("mouseenter", function () { avisarPagina("entrar"); });
	area.addEventListener("mouseleave", function () { avisarPagina("sair"); });
	area.addEventListener("click", function () {
		armadoAte = Date.now() + ARMADO_MS;
		avisarPagina("clique");
	});

	chrome.downloads.onChanged.addListener(function (delta) {
		if (!delta.state || delta.state.current !== "complete") return;
		if (Date.now() > armadoAte || !temPermissao) return;
		chrome.downloads.search({ id: delta.id }, function (itens) {
			if (chrome.runtime.lastError || !ehAssinador(itens && itens[0])) return;
			armadoAte = 0;
			// Sem o clique válido o Chrome recusa; o service worker mostra
			// então o cartão "Abrir o assinador".
			abrir(delta.id);
		});
	});
} else {
	const id = Number(params.get("id"));
	const botao = document.getElementById("abrir");
	const info = document.getElementById("info");

	function mostrarInfo(texto) { info.textContent = texto; }
	function textoInicial() {
		if (temPermissao) {
			botao.textContent = "Abrir o assinador";
			mostrarInfo("Clique para abrir o assinador e digitar o PIN.");
		} else {
			botao.textContent = "Autorizar e abrir o assinador";
			mostrarInfo("Só na primeira vez: o Chrome pede autorização para a extensão abrir arquivos baixados. Depois, o assinador abre sozinho ao clicar em \"Assinar\".");
		}
	}
	textoInicial();
	try {
		chrome.permissions.contains(PERMISSAO, function (ok) {
			void chrome.runtime.lastError;
			temPermissao = !!ok;
			textoInicial();
		});
	} catch (e) { /* mantém o texto sem autorização */ }

	document.getElementById("fechar").addEventListener("click", function () { avisarPagina("fechar"); });

	// Tudo dentro do próprio clique (sem esperar outras respostas antes),
	// porque o navegador só aceita abrir/pedir autorização nesse momento.
	botao.addEventListener("click", function () {
		if (!temPermissao) {
			chrome.permissions.request(PERMISSAO, function (ok) {
				const erro = chrome.runtime.lastError;
				if (erro || !ok) {
					mostrarInfo("Sem a autorização, abra pela seta de downloads (⬇) do navegador, no arquivo \"AssinadorTJPR\".");
					return;
				}
				temPermissao = true;
				abrir(id, function (falha) {
					if (falha) {
						botao.textContent = "Abrir o assinador agora";
						mostrarInfo("Autorizado! Clique de novo para abrir. Nas próximas vezes, o assinador abre sozinho ao clicar em \"Assinar\".");
					} else {
						avisarPagina("aberto");
					}
				});
			});
			return;
		}
		botao.disabled = true;
		abrir(id, function (falha) {
			if (!falha) {
				avisarPagina("aberto");
				return;
			}
			botao.disabled = false;
			mostrarInfo("Não foi possível abrir (" + falha + "). Abra pela seta de downloads (⬇) do navegador.");
		});
	});
}

avisarPagina("pronto");
