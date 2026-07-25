import { Component, OnInit, inject, signal } from '@angular/core';
import { DatosService } from '../../core/datos.service';
import { AuthService } from '../../core/auth.service';
import { Mision, MisionAsignada, TipoMision } from '../../core/models';

@Component({
  selector: 'app-misiones',
  template: `
    <h1 class="text-xl font-semibold mb-1">Misiones</h1>
    <p class="text-sm text-ocs-muted mb-5">
      Completa misiones para avanzar de rango. Solo ves las de tu nivel o inferiores.
    </p>

    <!-- Barra de progreso del miembro -->
    <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-ocs-muted">Progreso</span>
        <span class="text-ocs-accent font-medium">{{ auth.perfil()?.progreso ?? 0 }}%</span>
      </div>
      <div class="h-2 rounded-full bg-ocs-bg overflow-hidden">
        <div
          class="h-full bg-ocs-accent transition-all"
          [style.width.%]="auth.perfil()?.progreso ?? 0"
        ></div>
      </div>
    </div>

    <div class="flex gap-1 border-b border-ocs-border mb-4">
      @for (f of filtros; track f.valor) {
        <button
          (click)="filtro.set(f.valor)"
          class="px-3 py-2 text-sm border-b-2 -mb-px"
          [class]="
            filtro() === f.valor
              ? 'border-ocs-accent text-ocs-accent'
              : 'border-transparent text-ocs-muted'
          "
        >
          {{ f.etiqueta }}
        </button>
      }
    </div>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!visibles().length) {
      <p class="text-sm text-ocs-muted">No hay misiones disponibles para tu rango.</p>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2">
        @for (m of visibles(); track m.id) {
          <article class="rounded-xl border border-ocs-border bg-ocs-surface p-4 flex flex-col">
            <div class="flex items-start justify-between gap-2 mb-2">
              <h2 class="font-medium">{{ m.titulo }}</h2>
              <span
                class="text-[10px] uppercase px-2 py-0.5 rounded-full border shrink-0"
                [class]="
                  m.tipo === 'grupal'
                    ? 'border-blue-800 text-blue-300'
                    : 'border-ocs-border text-ocs-muted'
                "
              >
                {{ m.tipo }}
              </span>
            </div>
            <p class="text-sm text-ocs-muted flex-1 mb-3">{{ m.descripcion }}</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-ocs-accent">+{{ m.recompensa_creditos }} pts</span>
              @if (estadoDe(m.id); as asignacion) {
                @if (asignacion.completada) {
                  <span class="text-xs text-green-400">✓ Completada</span>
                } @else {
                  <button
                    (click)="completar(asignacion)"
                    class="text-xs rounded-lg border border-ocs-accent text-ocs-accent px-3 py-1.5"
                  >
                    Marcar completada
                  </button>
                }
              } @else {
                <span class="text-xs text-ocs-muted">No asignada</span>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class MisionesComponent implements OnInit {
  private readonly datos = inject(DatosService);
  readonly auth = inject(AuthService);

  readonly filtros: { valor: TipoMision | 'todas'; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'individual', etiqueta: 'Individuales' },
    { valor: 'grupal', etiqueta: 'Grupales' },
  ];

  readonly misiones = signal<Mision[]>([]);
  readonly asignaciones = signal<MisionAsignada[]>([]);
  readonly filtro = signal<TipoMision | 'todas'>('todas');
  readonly cargando = signal(true);

  visibles = () => {
    const f = this.filtro();
    return f === 'todas' ? this.misiones() : this.misiones().filter((m) => m.tipo === f);
  };

  estadoDe = (misionId: string): MisionAsignada | undefined =>
    this.asignaciones().find((a) => a.mision_id === misionId);

  async ngOnInit(): Promise<void> {
    const [misiones, asignaciones] = await Promise.all([
      this.datos.misiones(),
      this.datos.misAsignaciones(),
    ]);
    this.misiones.set(misiones);
    this.asignaciones.set(asignaciones);
    this.cargando.set(false);
  }

  async completar(asignacion: MisionAsignada): Promise<void> {
    await this.datos.marcarMisionCompletada(asignacion.id);
    this.asignaciones.set(await this.datos.misAsignaciones());
    await this.auth.cargarPerfil();
  }
}
