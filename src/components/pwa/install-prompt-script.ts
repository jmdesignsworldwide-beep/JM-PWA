/**
 * Script que corre en <head> ANTES de React para no perder el evento
 * `beforeinstallprompt` (Android lo dispara muy temprano). Lo guarda en
 * `window.__bipEvent` y avisa con eventos personalizados para que el botón de
 * instalar lo lea sin importar cuándo monte.
 */
export const pwaInstallScript = `(function(){
  try {
    window.__bipEvent = window.__bipEvent || null;
    window.addEventListener('beforeinstallprompt', function(e){
      e.preventDefault();
      window.__bipEvent = e;
      window.dispatchEvent(new Event('bip-ready'));
    });
    window.addEventListener('appinstalled', function(){
      window.__bipEvent = null;
      window.dispatchEvent(new Event('bip-installed'));
    });
  } catch (e) {}
})();`;
