import { Component, inject } from '@angular/core';
import { TemaService } from '../core/tema.service';
import { IconoComponent } from './icono.component';

/**
 * Interruptor de tema.
 *
 * Muestra el icono del tema al que se va a cambiar, no el del actual: es lo que
 * la gente espera de un botón, que anuncie su efecto.
 */
@Component({
  selector: 'app-tema-toggle',
  imports: [IconoComponent],
  template: `
    <button
      type="button"
      (click)="tema.alternar()"
      [attr.aria-label]="etiqueta()"
      [title]="etiqueta()"
      class="w-11 h-11 flex items-center justify-center rounded-lg text-ocs-muted hover:text-ocs-accent hover:bg-ocs-elevated transition-colors duration-200 cursor-pointer"
    >
      <app-icono [nombre]="tema.temaEfectivo() === 'oscuro' ? 'sol' : 'luna'" [tamano]="20" />
    </button>
  `,
})
export class TemaToggleComponent {
  readonly tema = inject(TemaService);

  etiqueta(): string {
    return this.tema.temaEfectivo() === 'oscuro'
      ? 'Cambiar a tema claro'
      : 'Cambiar a tema oscuro';
  }
}
