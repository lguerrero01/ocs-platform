import { Component, OnInit, inject, signal } from '@angular/core';
import { DatosService } from '../../core/datos.service';
import { Rango } from '../../core/models';

/**
 * Jerarquía: cada rango con su insignia, cupo, responsabilidades y qué rango
 * tiene bajo su mando.
 */
@Component({
  selector: 'app-rangos',
  template: `
    <h1 class="text-xl font-semibold mb-1">Jerarquía</h1>
    <p class="text-sm text-ocs-muted mb-5">Rangos de la organización, de mayor a menor.</p>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!rangos().length) {
      <p class="text-sm text-ocs-muted">Aún no se han definido rangos.</p>
    } @else {
      <ol class="space-y-3">
        @for (r of rangos(); track r.id; let i = $index) {
          <li class="relative">
            @if (i > 0) {
              <div class="absolute -top-3 left-6 w-px h-3 bg-ocs-border"></div>
            }
            <article class="rounded-xl border border-ocs-border bg-ocs-surface p-4">
              <div class="flex items-start gap-3">
                <div
                  class="w-12 h-12 rounded-lg border border-ocs-border bg-ocs-bg flex items-center justify-center shrink-0 overflow-hidden"
                >
                  @if (r.insignia_url) {
                    <img [src]="r.insignia_url" [alt]="r.nombre" class="w-full h-full object-cover" />
                  } @else {
                    <span class="text-ocs-muted text-xs">N{{ r.nivel }}</span>
                  }
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <h2 class="font-medium">{{ r.nombre }}</h2>
                    <span class="text-xs text-ocs-muted">nivel {{ r.nivel }}</span>
                  </div>

                  <p class="text-xs text-ocs-muted mt-0.5">
                    {{ plazasOcupadas(r.id) }} / {{ r.inventario_existencia }} plazas ocupadas
                  </p>

                  @if (r.responsabilidades) {
                    <p class="text-sm text-ocs-muted mt-2 whitespace-pre-line">
                      {{ r.responsabilidades }}
                    </p>
                  }

                  @if (nombreSubordinado(r); as sub) {
                    <p class="text-xs text-ocs-accent mt-2">Tiene bajo su mando: {{ sub }}</p>
                  }
                </div>
              </div>
            </article>
          </li>
        }
      </ol>
    }
  `,
})
export class RangosComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly rangos = signal<Rango[]>([]);
  readonly conteo = signal<Record<string, number>>({});
  readonly cargando = signal(true);

  plazasOcupadas(rangoId: string): number {
    return this.conteo()[rangoId] || 0;
  }

  nombreSubordinado(r: Rango): string | null {
    if (!r.rango_subordinado_id) return null;
    return this.rangos().find((x) => x.id === r.rango_subordinado_id)?.nombre ?? null;
  }

  async ngOnInit(): Promise<void> {
    const [rangos, conteo] = await Promise.all([
      this.datos.rangos(),
      this.datos.contarMiembrosPorRango(),
    ]);
    this.rangos.set(rangos);
    this.conteo.set(conteo);
    this.cargando.set(false);
  }
}
