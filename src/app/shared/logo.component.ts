import { Component, input } from '@angular/core';

/**
 * Emblema de la organización.
 *
 * El archivo es el logo de marca teñido con `--color-ocs-accent`; el dorado
 * original (#956d2f) queda por debajo del 4.5:1 sobre el fondo del tema, así
 * que para pantalla se usa el mismo matiz aclarado. Ver `public/logo-ocs.png`.
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
      class="object-contain shrink-0"
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
