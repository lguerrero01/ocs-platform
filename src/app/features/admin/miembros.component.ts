import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { AuthService } from '../../core/auth.service';
import { Perfil, Rango } from '../../core/models';

interface MiembroFila extends Perfil {
  rangos?: { nombre: string } | null;
}

/**
 * Gestión de miembros: rango, penalizaciones y delegación del rol admin.
 * El botón de delegar solo aparece para el super admin — y la base de datos
 * lo vuelve a comprobar en `proteger_super_admin`, porque ocultar un botón
 * no es una medida de seguridad.
 */
@Component({
  selector: 'app-admin-miembros',
  imports: [FormsModule],
  template: `
    <input
      [(ngModel)]="busqueda"
      name="busqueda"
      placeholder="Buscar por nombre o correo…"
      class="w-full rounded-lg bg-ocs-surface border border-ocs-border px-3 py-2 text-sm mb-4"
    />

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else {
      <div class="space-y-2">
        @for (m of filtrados(); track m.id) {
          <div class="rounded-lg border border-ocs-border bg-ocs-surface p-3">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <h3 class="text-sm font-medium">{{ m.nombre_usuario }}</h3>
                <p class="text-xs text-ocs-muted truncate">{{ m.correo }}</p>
              </div>
              <div class="flex gap-1.5 shrink-0">
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-ocs-bg text-ocs-muted">
                  {{ m.rol }}
                </span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full"
                  [class]="
                    m.estatus === 'activo'
                      ? 'bg-green-950 text-green-400'
                      : 'bg-ocs-bg text-ocs-muted'
                  "
                >
                  {{ m.estatus }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 text-xs mb-2">
              <span class="text-ocs-muted">Progreso {{ m.progreso }}%</span>
              <div class="flex-1 h-1 rounded-full bg-ocs-bg overflow-hidden">
                <div class="h-full bg-ocs-accent" [style.width.%]="m.progreso"></div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 items-center">
              <select
                [value]="m.rango_id ?? ''"
                (change)="cambiarRango(m, $event)"
                class="text-xs rounded-lg bg-ocs-bg border border-ocs-border px-2 py-1.5"
              >
                <option value="">Sin rango</option>
                @for (r of rangos(); track r.id) {
                  <option [value]="r.id">{{ r.nombre }}</option>
                }
              </select>

              <button (click)="penalizar(m)" class="text-xs text-red-400 px-2 py-1.5">
                Penalizar
              </button>

              @if (auth.esSuperAdmin() && m.id !== auth.perfil()?.id && m.rol !== 'super_admin') {
                <button
                  (click)="alternarAdmin(m)"
                  class="text-xs text-ocs-accent px-2 py-1.5"
                >
                  {{ m.rol === 'admin' ? 'Quitar admin' : 'Hacer admin' }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminMiembrosComponent implements OnInit {
  private readonly datos = inject(DatosService);
  readonly auth = inject(AuthService);

  readonly miembros = signal<MiembroFila[]>([]);
  readonly rangos = signal<Rango[]>([]);
  readonly cargando = signal(true);

  busqueda = '';

  filtrados(): MiembroFila[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.miembros();
    return this.miembros().filter(
      (m) =>
        m.nombre_usuario.toLowerCase().includes(q) || m.correo.toLowerCase().includes(q),
    );
  }

  async ngOnInit(): Promise<void> {
    await this.recargar();
    this.rangos.set(await this.datos.rangos());
    this.cargando.set(false);
  }

  private async recargar(): Promise<void> {
    this.miembros.set((await this.datos.miembros()) as MiembroFila[]);
  }

  async cambiarRango(m: MiembroFila, evento: Event): Promise<void> {
    const valor = (evento.target as HTMLSelectElement).value;
    await this.datos.cambiarRango(m.id, valor || null);
    await this.recargar();
  }

  async alternarAdmin(m: MiembroFila): Promise<void> {
    const nuevo = m.rol === 'admin' ? 'usuario' : 'admin';
    if (!confirm(`¿Cambiar el rol de ${m.nombre_usuario} a ${nuevo}?`)) return;
    await this.datos.cambiarRol(m.id, nuevo);
    await this.recargar();
  }

  async penalizar(m: MiembroFila): Promise<void> {
    const motivo = prompt(`Motivo de la penalización para ${m.nombre_usuario}:`);
    if (!motivo) return;

    const puntosTexto = prompt('Puntos a restar (número positivo):', '10');
    const puntos = Number(puntosTexto);
    if (!puntos || Number.isNaN(puntos)) return;

    await this.datos.penalizar(m.id, motivo, -Math.abs(puntos));
    await this.recargar();
  }
}
