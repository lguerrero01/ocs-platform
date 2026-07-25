import { Component, OnInit, inject, signal } from '@angular/core';
import { DatosService } from '../../core/datos.service';
import { InfoInstitucional } from '../../core/models';

/**
 * Información institucional en menú colapsable. RLS ya filtra por nivel de
 * rango, así que aquí solo llega lo que el miembro tiene derecho a ver.
 */
@Component({
  selector: 'app-info',
  template: `
    <h1 class="text-xl font-semibold mb-1">Información institucional</h1>
    <p class="text-sm text-ocs-muted mb-5">Lo que corresponde a tu rango.</p>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!secciones().length) {
      <p class="text-sm text-ocs-muted">No hay información disponible para tu rango.</p>
    } @else {
      <div class="space-y-2">
        @for (s of secciones(); track s.id) {
          <div class="rounded-xl border border-ocs-border bg-ocs-surface overflow-hidden">
            <button
              (click)="alternar(s.id)"
              class="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span class="font-medium text-sm">{{ s.titulo }}</span>
              <span class="text-ocs-muted text-xs">{{ abierta() === s.id ? '−' : '+' }}</span>
            </button>
            @if (abierta() === s.id) {
              <div class="px-4 pb-4 text-sm text-ocs-muted whitespace-pre-line leading-relaxed">
                {{ s.contenido }}
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class InfoComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly secciones = signal<InfoInstitucional[]>([]);
  readonly abierta = signal<string | null>(null);
  readonly cargando = signal(true);

  alternar(id: string): void {
    this.abierta.update((a) => (a === id ? null : id));
  }

  async ngOnInit(): Promise<void> {
    this.secciones.set(await this.datos.infoInstitucional());
    this.cargando.set(false);
  }
}
