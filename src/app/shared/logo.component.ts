import { Component, input } from '@angular/core';

/**
 * Emblema de la organización.
 *
 * El archivo es el emblema de marca teñido con el Mostaza de la paleta
 * (`--color-ocs-accent`), sobre transparente. Si cambia el acento hay que
 * regenerarlo junto con los iconos: ver `brand/README.md`.
 */
@Component({
  selector: 'app-logo',
  template: `
    <img
      src="logo-ocs.png"
      [width]="tamano()"
      [height]="tamano()"
      [alt]="decorativo() ? '' : 'Emblema de la organización'"
      [attr.aria-hidden]="decorativo() ? 'true' : null"
      class="object-contain shrink-0 emblema-ocs"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
    />
  `,
})
export class LogoComponent {
  readonly tamano = input(32);
  /** Verdadero cuando el logo acompaña a un texto que ya dice lo mismo. */
  readonly decorativo = input(false);
}
