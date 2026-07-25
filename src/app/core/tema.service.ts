import { Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';
/** `sistema` no es un tema: es delegar la decisión al sistema operativo. */
export type PreferenciaTema = Tema | 'sistema';

const CLAVE = 'ocs-tema';

/**
 * Tema claro/oscuro.
 *
 * La preferencia se guarda como `claro`, `oscuro` o `sistema`. Solo las dos
 * primeras escriben `data-tema` en el `<html>`; con `sistema` se retira el
 * atributo y decide la media query de `styles.css`, que es lo que permite que
 * la app siga al sistema si el usuario lo cambia con la app abierta.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly preferencia = signal<PreferenciaTema>(this.leerGuardada());
  /** El tema que se está pintando ahora mismo, ya resuelto. */
  readonly temaEfectivo = signal<Tema>('oscuro');

  private readonly consultaClaro = window.matchMedia('(prefers-color-scheme: light)');

  constructor() {
    this.aplicar(this.preferencia());
    // Si sigue al sistema, hay que repintar cuando el sistema cambie.
    this.consultaClaro.addEventListener('change', () => {
      if (this.preferencia() === 'sistema') this.aplicar('sistema');
    });
  }

  /** Alterna entre claro y oscuro partiendo de lo que se ve ahora. */
  alternar(): void {
    this.establecer(this.temaEfectivo() === 'oscuro' ? 'claro' : 'oscuro');
  }

  establecer(preferencia: PreferenciaTema): void {
    this.preferencia.set(preferencia);
    if (preferencia === 'sistema') localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, preferencia);
    this.aplicar(preferencia);
  }

  private aplicar(preferencia: PreferenciaTema): void {
    const raiz = document.documentElement;

    if (preferencia === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', preferencia);

    const efectivo: Tema =
      preferencia === 'sistema'
        ? this.consultaClaro.matches
          ? 'claro'
          : 'oscuro'
        : preferencia;

    this.temaEfectivo.set(efectivo);

    // La barra del navegador y la de la PWA instalada leen esto.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', efectivo === 'claro' ? '#ffffff' : '#202221');
    document
      .querySelector('meta[name="color-scheme"]')
      ?.setAttribute('content', efectivo);
  }

  private leerGuardada(): PreferenciaTema {
    const guardada = localStorage.getItem(CLAVE);
    return guardada === 'claro' || guardada === 'oscuro' ? guardada : 'sistema';
  }
}
