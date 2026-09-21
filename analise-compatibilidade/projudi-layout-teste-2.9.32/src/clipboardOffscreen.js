// Offscreen não recebe foco: usa paste com a permissão clipboardRead da extensão.
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.target !== 'pdp-clipboard-offscreen' || message.type !== 'read-text') return false;
  if (sender.id !== chrome.runtime.id || sender.tab) return false;
  const field = document.getElementById('clipboard');
  let pasted = false;
  const onPaste = () => { pasted = true; };
  try {
    field.value = '';
    field.focus();
    field.select();
    field.addEventListener('paste', onPaste);
    const accepted = document.execCommand('paste');
    if (!accepted && !pasted) throw new Error('O Chrome bloqueou a colagem auxiliar. Verifique se a extensão tem permissão para ler a área de transferência.');
    reply({ ok: true, text: field.value });
  } catch (error) { reply({ ok: false, error: error.message }); }
  finally { field.removeEventListener('paste', onPaste); field.value = ''; }
  return false;
});
