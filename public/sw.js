/**
 * Service worker de la OCS.
 *
 * Existe por dos razones: sin un `fetch` registrado el navegador no ofrece
 * instalar la aplicación, y una vez instalada tiene que abrir aunque no haya
 * red. Se escribió a mano en vez de traer `@angular/service-worker` porque el
 * sitio se sirve bajo un `base-href` que no es la raíz y la configuración por
 * defecto de Angular asume lo contrario.
 *
 * Estrategias:
 *   - Navegación  → red primero, y si falla, el index cacheado (es una SPA:
 *     cualquier ruta se resuelve en el cliente).
 *   - Estáticos   → cache primero. Los bundles llevan hash en el nombre, así
 *     que un archivo cacheado nunca queda obsoleto: cambia su nombre.
 *   - Todo lo demás (la API de Supabase) → no se toca. Cachear respuestas con
 *     datos de miembros sería guardarlas en el disco del dispositivo.
 */
const VERSION = 'ocs-v1';
const BASE = new URL(self.registration.scope).pathname;
const INDEX = BASE;

const ESENCIALES = [
  BASE,
  BASE + 'manifest.webmanifest',
  BASE + 'logo-ocs.png',
  BASE + 'icon-192.png',
  BASE + 'favicon.ico',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      // `catch` porque si uno solo de los recursos falla, addAll aborta entero
      // y la aplicación se quedaría sin service worker.
      .then((cache) => cache.addAll(ESENCIALES).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  // Distinto origen: la API. Que pase directa.
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((cache) => cache.put(INDEX, copia));
          return res;
        })
        .catch(() => caches.match(INDEX).then((res) => res ?? Response.error())),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((cacheada) => {
      if (cacheada) return cacheada;
      return fetch(peticion).then((res) => {
        // Las respuestas opacas o con error no se guardan.
        if (res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
        }
        return res;
      });
    }),
  );
});
