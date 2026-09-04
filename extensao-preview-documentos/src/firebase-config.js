// Configuração do Firebase Realtime Database usado para sincronizar os
// lembretes (post-its) entre todos os usuários que tenham a extensão ativa.
//
// Não é necessário o SDK completo do Firebase: a extensão fala diretamente
// com a API REST do Realtime Database (suportada nativamente, inclusive
// para receber atualizações em tempo real via Server-Sent Events).

window.PDP_LEMBRETES_CONFIG = {
	databaseURL: "https://projudi-lembretes-default-rtdb.firebaseio.com",
};
