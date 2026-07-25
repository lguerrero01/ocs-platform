import { Component, inject, signal } from '@angular/core';
import { InstalacionService } from '../core/instalacion.service';
import { IconoComponent } from './icono.component';

/**
 * Botón de instalación. No se pinta nada si la app ya está instalada o si el
 * navegador no ofrece instalarla — un botón que no hace nada es peor que
 * ninguno.
 */
@Component({
  selector: 'app-instalar',
  imports: [IconoComponent],
  template: `
    @if (!instalacion.yaInstalada()) {
      @if (instalacion.sePuedeInstalar()) {
        <button
          type="button"
          (click)="instalar()"
          class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ocs-accent border border-ocs-accent/40 hover:bg-ocs-accent/10 transition-colors duration-200 cursor-pointer"
        >
          <app-icono nombre="instalar" [tamano]="18" />
          <span>Instalar aplicación</span>
        </button>
      } @else if (instalacion.esIos()) {
        <button
          type="button"
          (click)="mostrarAyudaIos.set(!mostrarAyudaIos())"
          [attr.aria-expanded]="mostrarAyudaIos()"
          class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-ocs-accent border border-ocs-accent/40 hover:bg-ocs-accent/10 transition-colors duration-200 cursor-pointer"
        >
          <app-icono nombre="instalar" [tamano]="18" />
          <span>Instalar aplicación</span>
        </button>
        @if (mostrarAyudaIos()) {
          <p class="text-xs text-ocs-muted mt-2 leading-relaxed">
            En iPhone se instala desde Safari: toca
            <span class="text-ocs-text">Compartir</span> y luego
            <span class="text-ocs-text">Añadir a pantalla de inicio</span>.
          </p>
        }
      }
    }
  `,
})
export class InstalarComponent {
  readonly instalacion = inject(InstalacionService);
  readonly mostrarAyudaIos = signal(false);

  async instalar(): Promise<void> {
    await this.instalacion.instalar();
  }
}
