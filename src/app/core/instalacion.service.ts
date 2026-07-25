import { Injectable, signal } from '@angular/core';

/** El evento no está en lib.dom todavía. */
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Instalación de la aplicación.
 *
 * Chrome y Edge avisan con `beforeinstallprompt` cuando la app cumple los
 * requisitos, y guardamos el evento para disparar el diálogo desde nuestro
 * propio botón. Safari en iOS no implementa nada de esto: allí se instala desde
 * Compartir → Añadir a pantalla de inicio, así que lo único que podemos hacer
 * es explicarlo.
 */
@Injectable({ providedIn: 'root' })
export class InstalacionService {
  /** Hay diálogo nativo listo para lanzarse. */
  readonly sePuedeInstalar = signal(false);
  /** Ya está instalada: se abrió como aplicación, no como pestaña. */
  readonly yaInstalada = signal(this.detectarInstalada());
  /** iOS: no hay diálogo, hay que dar instrucciones. */
  readonly esIos = signal(this.detectarIos());

  private evento?: EventoInstalacion;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Sin esto el navegador muestra su propia barra además de nuestro botón.
      e.preventDefault();
      this.evento = e as EventoInstalacion;
      this.sePuedeInstalar.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.evento = undefined;
      this.sePuedeInstalar.set(false);
      this.yaInstalada.set(true);
    });
  }

  async instalar(): Promise<'accepted' | 'dismissed' | 'no-disponible'> {
    if (!this.evento) return 'no-disponible';

    await this.evento.prompt();
    const { outcome } = await this.evento.userChoice;

    // El evento es de un solo uso: si lo rechazan, el navegador enviará otro
    // más adelante si sigue cumpliendo los requisitos.
    this.evento = undefined;
    this.sePuedeInstalar.set(false);

    return outcome;
  }

  private detectarInstalada(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS marca las apps de pantalla de inicio con esta propiedad propia.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  private detectarIos(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
  }
}
