import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Publicacion, TipoPublicacion } from '../../core/models';

/** CRUD de noticias, artículos, anuncios y llamados de atención. */
@Component({
  selector: 'app-admin-contenido',
  imports: [FormsModule, DatePipe],
  template: `
    <form
      (ngSubmit)="guardar()"
      class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6 space-y-3"
    >
      <h2 class="font-medium">{{ editando()?.id ? 'Editar' : 'Nueva' }} publicación</h2>

      <select
        name="tipo"
        [(ngModel)]="borrador.tipo"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      >
        @for (t of tipos; track t.valor) {
          <option [value]="t.valor">{{ t.etiqueta }}</option>
        }
      </select>

      <input
        name="titulo"
        [(ngModel)]="borrador.titulo"
        required
        placeholder="Título"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      />

      <textarea
        name="contenido"
        [(ngModel)]="borrador.contenido"
        required
        rows="5"
        placeholder="Contenido"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border-strong px-3 py-2 text-sm"
      ></textarea>

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
        @for (p of publicaciones(); track p.id) {
          <div class="rounded-lg border border-ocs-border bg-ocs-surface p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-[10px] uppercase text-ocs-accent">{{ etiquetaTipo(p.tipo) }}</div>
                <h3 class="text-sm font-medium truncate">{{ p.titulo }}</h3>
                <span class="text-xs text-ocs-muted">{{ p.fecha | date: 'short' }}</span>
              </div>
              <div class="flex gap-2 shrink-0">
                <button (click)="editar(p)" class="text-xs text-ocs-accent">Editar</button>
                <button (click)="borrar(p)" class="text-xs text-ocs-peligro">Borrar</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminContenidoComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly tipos: { valor: TipoPublicacion; etiqueta: string }[] = [
    { valor: 'noticia', etiqueta: 'Noticia' },
    { valor: 'articulo_lectura', etiqueta: 'Artículo de lectura' },
    { valor: 'anuncio', etiqueta: 'Anuncio' },
    { valor: 'llamado_atencion', etiqueta: 'Llamado de atención' },
  ];

  readonly publicaciones = signal<Publicacion[]>([]);
  readonly editando = signal<Publicacion | null>(null);
  readonly cargando = signal(true);

  borrador: Partial<Publicacion> = { tipo: 'noticia', titulo: '', contenido: '' };

  etiquetaTipo(t: TipoPublicacion): string {
    return this.tipos.find((x) => x.valor === t)?.etiqueta ?? t;
  }

  async ngOnInit(): Promise<void> {
    this.publicaciones.set(await this.datos.publicaciones());
    this.cargando.set(false);
  }

  editar(p: Publicacion): void {
    this.editando.set(p);
    this.borrador = { ...p };
  }

  cancelar(): void {
    this.editando.set(null);
    this.borrador = { tipo: 'noticia', titulo: '', contenido: '' };
  }

  async guardar(): Promise<void> {
    await this.datos.guardarPublicacion(this.borrador);
    this.publicaciones.set(await this.datos.publicaciones());
    this.cancelar();
  }

  async borrar(p: Publicacion): Promise<void> {
    if (!confirm(`¿Borrar "${p.titulo}"?`)) return;
    await this.datos.borrarPublicacion(p.id);
    this.publicaciones.set(await this.datos.publicaciones());
  }
}
