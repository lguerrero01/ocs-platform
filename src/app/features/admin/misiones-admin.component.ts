import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Mision, Rango, TipoMision } from '../../core/models';

@Component({
  selector: 'app-admin-misiones',
  imports: [FormsModule],
  template: `
    <form
      (ngSubmit)="guardar()"
      class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6 space-y-3"
    >
      <h2 class="font-medium">{{ editando() ? 'Editar' : 'Nueva' }} misión</h2>

      <input
        name="titulo"
        [(ngModel)]="borrador.titulo"
        required
        placeholder="Título"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      />

      <textarea
        name="descripcion"
        [(ngModel)]="borrador.descripcion"
        rows="3"
        placeholder="Descripción"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      ></textarea>

      <div class="grid grid-cols-2 gap-3">
        <select
          name="tipo"
          [(ngModel)]="borrador.tipo"
          class="rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
        >
          <option value="individual">Individual</option>
          <option value="grupal">Grupal</option>
        </select>

        <input
          name="recompensa"
          type="number"
          [(ngModel)]="borrador.recompensa_creditos"
          placeholder="Puntos"
          class="rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
        />
      </div>

      <select
        name="rango"
        [(ngModel)]="borrador.rango_requerido_id"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      >
        <option [ngValue]="null">Cualquier rango</option>
        @for (r of rangos(); track r.id) {
          <option [ngValue]="r.id">{{ r.nombre }}</option>
        }
      </select>

      <div class="flex gap-2">
        <button
          type="submit"
          class="rounded-lg bg-ocs-accent text-ocs-bg px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
        >
          Guardar
        </button>
        @if (editando()) {
          <button type="button" (click)="cancelar()" class="text-sm text-ocs-muted px-3">
            Cancelar
          </button>
        }
      </div>
    </form>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else {
      <div class="space-y-2">
        @for (m of misiones(); track m.id) {
          <div
            class="rounded-lg border border-ocs-border bg-ocs-surface p-3 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <h3 class="text-sm font-medium">{{ m.titulo }}</h3>
              <p class="text-xs text-ocs-muted">
                {{ m.tipo }} · +{{ m.recompensa_creditos }} pts · {{ nombreRango(m) }}
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button (click)="editar(m)" class="text-xs text-ocs-accent">Editar</button>
              <button (click)="borrar(m)" class="text-xs text-ocs-peligro">Borrar</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminMisionesComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly misiones = signal<Mision[]>([]);
  readonly rangos = signal<Rango[]>([]);
  readonly editando = signal<Mision | null>(null);
  readonly cargando = signal(true);

  borrador: Partial<Mision> = {
    titulo: '',
    descripcion: '',
    tipo: 'individual' as TipoMision,
    recompensa_creditos: 5,
    rango_requerido_id: null,
  };

  nombreRango(m: Mision): string {
    if (!m.rango_requerido_id) return 'todos los rangos';
    return this.rangos().find((r) => r.id === m.rango_requerido_id)?.nombre ?? '—';
  }

  async ngOnInit(): Promise<void> {
    const [misiones, rangos] = await Promise.all([this.datos.misiones(), this.datos.rangos()]);
    this.misiones.set(misiones);
    this.rangos.set(rangos);
    this.cargando.set(false);
  }

  editar(m: Mision): void {
    this.editando.set(m);
    this.borrador = { ...m };
  }

  cancelar(): void {
    this.editando.set(null);
    this.borrador = {
      titulo: '',
      descripcion: '',
      tipo: 'individual',
      recompensa_creditos: 5,
      rango_requerido_id: null,
    };
  }

  async guardar(): Promise<void> {
    await this.datos.guardarMision(this.borrador);
    this.misiones.set(await this.datos.misiones());
    this.cancelar();
  }

  async borrar(m: Mision): Promise<void> {
    if (!confirm(`¿Borrar "${m.titulo}"?`)) return;
    await this.datos.borrarMision(m.id);
    this.misiones.set(await this.datos.misiones());
  }
}
