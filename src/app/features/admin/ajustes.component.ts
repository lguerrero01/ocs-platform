import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { ConfigCorreo, ConfigMoneda } from '../../core/models';

interface FilaAuditoria {
  id: number;
  accion: string;
  entidad: string | null;
  creado_at: string;
  detalle: Record<string, unknown>;
}

/** Ajustes exclusivos del super admin: plantillas de correo, moneda y auditoría. */
@Component({
  selector: 'app-admin-ajustes',
  imports: [FormsModule, DatePipe],
  template: `
    <!-- Plantillas de correo -->
    <section class="mb-8">
      <h2 class="font-medium mb-1">Plantillas de correo</h2>
      <p class="text-sm text-ocs-muted mb-4">
        Variables disponibles:
        <code class="text-ocs-accent">{{ '{{nombre_usuario}}' }}</code>,
        <code class="text-ocs-accent">{{ '{{enlace}}' }}</code>,
        <code class="text-ocs-accent">{{ '{{motivo}}' }}</code>.
      </p>

      <div class="space-y-4">
        @for (p of plantillas(); track p.id) {
          <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4">
            <h3 class="text-sm font-medium mb-3">
              {{ p.clave === 'aprobacion' ? 'Correo de aprobación' : 'Correo de rechazo' }}
            </h3>

            <label class="block text-xs text-ocs-muted mb-1">Asunto</label>
            <input
              [(ngModel)]="p.plantilla_asunto"
              [name]="'asunto-' + p.id"
              class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm mb-3"
            />

            <label class="block text-xs text-ocs-muted mb-1">Cuerpo (HTML)</label>
            <textarea
              [(ngModel)]="p.plantilla_cuerpo"
              [name]="'cuerpo-' + p.id"
              rows="6"
              class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm font-mono"
            ></textarea>

            <div class="flex items-center gap-3 mt-3">
              <button
                (click)="guardarPlantilla(p)"
                class="rounded-lg bg-ocs-accent text-ocs-bg px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
              >
                Guardar
              </button>
              @if (guardado() === p.id) {
                <span class="text-xs text-ocs-exito">✓ Guardado</span>
              }
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Moneda interna -->
    <section class="mb-8">
      <h2 class="font-medium mb-1">Moneda de la organización</h2>
      <p class="text-sm text-ocs-muted mb-4">
        Define el nombre y el tipo de cambio de la moneda interna. La emisión on-chain de la
        stablecoin no está implementada todavía; esto funciona como unidad de cuenta.
      </p>

      @if (moneda(); as m) {
        <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-ocs-muted mb-1">Nombre</label>
              <input
                [(ngModel)]="m.nombre"
                name="moneda-nombre"
                class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-ocs-muted mb-1">Símbolo</label>
              <input
                [(ngModel)]="m.simbolo"
                name="moneda-simbolo"
                class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-ocs-muted mb-1">Valor de 1 unidad en USD</label>
            <input
              [(ngModel)]="m.valor_usd"
              name="moneda-valor"
              type="number"
              step="0.000001"
              class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
            />
          </div>
          <button
            (click)="guardarMoneda(m)"
            class="rounded-lg bg-ocs-accent text-ocs-bg px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
          >
            Guardar
          </button>
        </div>
      }
    </section>

    <!-- Auditoría -->
    <section>
      <h2 class="font-medium mb-1">Auditoría</h2>
      <p class="text-sm text-ocs-muted mb-4">
        Registro de acciones sensibles. Es append-only: nadie puede editarlo ni borrarlo.
      </p>

      <div class="space-y-1.5">
        @for (a of auditoria(); track a.id) {
          <div
            class="rounded-lg border border-ocs-border bg-ocs-surface px-3 py-2 flex justify-between gap-3 text-xs"
          >
            <span class="text-ocs-text">{{ a.accion }}</span>
            <span class="text-ocs-muted shrink-0">{{ a.creado_at | date: 'short' }}</span>
          </div>
        } @empty {
          <p class="text-sm text-ocs-muted">Sin registros todavía.</p>
        }
      </div>
    </section>
  `,
})
export class AdminAjustesComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly plantillas = signal<ConfigCorreo[]>([]);
  readonly moneda = signal<ConfigMoneda | null>(null);
  readonly auditoria = signal<FilaAuditoria[]>([]);
  readonly guardado = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const [plantillas, moneda, auditoria] = await Promise.all([
      this.datos.plantillasCorreo(),
      this.datos.moneda(),
      this.datos.auditoria(50),
    ]);
    this.plantillas.set(plantillas);
    this.moneda.set(moneda);
    this.auditoria.set(auditoria as FilaAuditoria[]);
  }

  async guardarPlantilla(p: ConfigCorreo): Promise<void> {
    await this.datos.guardarPlantilla(p);
    this.guardado.set(p.id);
    setTimeout(() => this.guardado.set(null), 2000);
  }

  async guardarMoneda(m: ConfigMoneda): Promise<void> {
    await this.datos.actualizarMoneda(m);
  }
}
