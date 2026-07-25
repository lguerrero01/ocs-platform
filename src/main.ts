import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

/**
 * Service worker: es lo que hace la aplicación instalable y lo que permite
 * abrirla sin red. El ámbito sale del `<base href>`, porque en GitHub Pages el
 * sitio no cuelga de la raíz del dominio sino de `/ocs-platform/`.
 *
 * Solo en producción. En desarrollo los archivos no llevan hash, así que la
 * caché serviría la versión anterior y el navegador ignoraría cada cambio.
 */
if (environment.production && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch((err) => console.warn('No se pudo registrar el service worker:', err));
  });
}
