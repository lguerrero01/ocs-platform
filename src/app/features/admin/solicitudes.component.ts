import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { SECCIONES_ADMISION, SolicitudAdmision } from '../../core/models';

/**
 * Bandeja de solicitudes. Al decidir se llama a la Edge Function, que registra
 * quién decidió y dispara el correo con la plantilla del super admin.
 */
@Component({
  selector: 'app-admin-solicitudes',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="flex gap-1 mb-4">
      <button
        (click)="vista.set('pendientes')"
        class="px-3 py-1.5 text-sm rounded-lg"
        [class]="vista() === 'pendientes' ? 'bg-ocs-accent text-ocs-bg' : 'text-ocs-muted'"
      >
        Pendientes ({{ pendientes().length }})
      </button>
      <button
        (click)="vista.set('historial')"
        class="px-3 py-1.5 text-sm rounded-lg"
        [class]="vista() === 'historial' ? 'bg-ocs-accent text-ocs-bg' : 'text-ocs-muted'"
      >
        Historial
      </button>
    </div>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (vista() === 'pendientes') {
      @if (!pendientes().length) {
        <p class="text-sm text-ocs-muted">No hay solicitudes pendientes.</p>
      }
      <div class="space-y-3">
        @for (s of pendientes(); track s.id) {
          <article class="rounded-xl border border-ocs-border bg-ocs-surface p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 class="font-medium">{{ s.perfiles?.nombre_usuario }}</h2>
                <p class="text-xs text-ocs-muted">{{ s.perfiles?.correo }}</p>
              </div>
              <span class="text-xs text-ocs-muted shrink-0">
                {{ s.fecha_solicitud | date: 'short' }}
              </span>
            </div>

            <div class="mb-4 border-t border-ocs-border pt-3 space-y-4">
              @for (seccion of secciones; track seccion.clave) {
                <section>
                  <h3
                    class="text-xs font-semibold uppercase tracking-wide text-ocs-accent mb-2"
                  >
                    {{ seccion.titulo }}
                  </h3>
                  <dl class="grid gap-2 sm:grid-cols-2 text-sm">
                    @for (p of seccion.campos; track p.clave) {
                      <div>
                        <dt class="text-xs text-ocs-muted">{{ p.etiqueta }}</dt>
                        <dd class="whitespace-pre-line">
                          {{ s.respuestas_formulario[p.clave] || '—' }}
                        </dd>
                      </div>
                    }
                  </dl>
                </section>
              }
            </div>

            <input
              [(ngModel)]="motivos[s.id]"
              [name]="'motivo-' + s.id"
              placeholder="Motivo (opcional, queda registrado)"
              class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm mb-3"
            />

            <div class="flex gap-2">
              <button
                (click)="decidir(s, 'aprobado')"
                [disabled]="procesando() === s.id"
                class="flex-1 rounded-lg bg-ocs-accent text-ocs-bg py-2 text-sm font-medium disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
              >
                Aprobar
              </button>
              <button
                (click)="decidir(s, 'rechazado')"
                [disabled]="procesando() === s.id"
                class="flex-1 rounded-lg border border-ocs-peligro/50 text-ocs-peligro py-2 text-sm disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-peligro/10"
              >
                Rechazar
              </button>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="space-y-2">
        @for (s of historial(); track s.id) {
          <div class="rounded-lg border border-ocs-border bg-ocs-surface p-3 text-sm">
            <div class="flex justify-between items-center gap-2">
              <span>{{ s.perfiles?.nombre_usuario }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                [class]="
                  s.estatus === 'aprobado'
                    ? 'bg-ocs-exito/15 text-ocs-exito'
                    : 'bg-ocs-peligro/15 text-ocs-peligro'
                "
              >
                {{ s.estatus }}
              </span>
            </div>
            <p class="text-xs text-ocs-muted mt-1">
              {{ s.decidido_at | date: 'short' }}
              @if (s.motivo_decision) {
                — {{ s.motivo_decision }}
              }
            </p>
          </div>
        }
      </div>
    }
  `,
})
export class AdminSolicitudesComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly secciones = SECCIONES_ADMISION;
  readonly pendientes = signal<SolicitudAdmision[]>([]);
  readonly historial = signal<SolicitudAdmision[]>([]);
  readonly vista = signal<'pendientes' | 'historial'>('pendientes');
  readonly cargando = signal(true);
  readonly procesando = signal<string | null>(null);

  motivos: Record<string, string> = {};

  async ngOnInit(): Promise<void> {
    await this.recargar();
    this.cargando.set(false);
  }

  private async recargar(): Promise<void> {
    const [pendientes, historial] = await Promise.all([
      this.datos.solicitudesPendientes(),
      this.datos.historialSolicitudes(),
    ]);
    this.pendientes.set(pendientes);
    this.historial.set(historial);
  }

  async decidir(s: SolicitudAdmision, decision: 'aprobado' | 'rechazado'): Promise<void> {
    this.procesando.set(s.id);
    await this.datos.decidirSolicitud(s.id, decision, this.motivos[s.id]);
    await this.recargar();
    this.procesando.set(null);
  }
}
