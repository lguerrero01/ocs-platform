import { Component, input } from '@angular/core';

export type NombreIcono =
  | 'inicio'
  | 'misiones'
  | 'rangos'
  | 'comercio'
  | 'info'
  | 'admin'
  | 'perfil'
  | 'salir'
  | 'candado'
  | 'ubicacion'
  | 'reloj'
  | 'carrito';

/**
 * Iconografía de la interfaz.
 *
 * Antes eran emoji, que cada sistema operativo dibuja distinto y en colores
 * ajenos a la paleta. Estos son trazos de 24×24 que heredan `currentColor`,
 * así que un icono activo se tiñe con el acento igual que su etiqueta.
 */
@Component({
  selector: 'app-icono',
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
      class="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      @switch (nombre()) {
        @case ('inicio') {
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z" />
          <path d="M4 22a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
          <path d="M10 6h8v5h-8z" />
          <path d="M10 15h8" />
          <path d="M10 18.5h5" />
        }
        @case ('misiones') {
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        }
        @case ('rangos') {
          <circle cx="12" cy="9" r="6" />
          <path d="M8.2 13.6 6.5 22l5.5-3 5.5 3-1.7-8.4" />
        }
        @case ('comercio') {
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h2.2l2.6 12.2a1.8 1.8 0 0 0 1.8 1.4h9.1a1.8 1.8 0 0 0 1.8-1.4L21 7H5.2" />
        }
        @case ('carrito') {
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h2.2l2.6 12.2a1.8 1.8 0 0 0 1.8 1.4h9.1a1.8 1.8 0 0 0 1.8-1.4L21 7H5.2" />
        }
        @case ('info') {
          <path d="M12 7.5v13" />
          <path d="M3 18.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        }
        @case ('admin') {
          <path
            d="M20 12.5c0 5-3.6 7.6-7.7 9a1 1 0 0 1-.66 0C7.6 20.1 4 17.5 4 12.5V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.25-2.7a1.1 1.1 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"
          />
        }
        @case ('perfil') {
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-1.5A4.5 4.5 0 0 1 9.5 15h5a4.5 4.5 0 0 1 4.5 4.5V21" />
        }
        @case ('salir') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('candado') {
          <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
          <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
        }
        @case ('ubicacion') {
          <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('reloj') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6.5V12l3.5 2" />
        }
      }
    </svg>
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
}
