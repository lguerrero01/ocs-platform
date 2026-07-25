import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { ArticuloTienda } from '../../core/models';

@Component({
  selector: 'app-admin-tienda',
  imports: [FormsModule, DecimalPipe],
  template: `
    <form
      (ngSubmit)="guardar()"
      class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6 space-y-3"
    >
      <h2 class="font-medium">{{ editando() ? 'Editar' : 'Nuevo' }} artículo</h2>

      <input
        name="nombre"
        [(ngModel)]="borrador.nombre"
        required
        placeholder="Nombre"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border px-3 py-2 text-sm"
      />

      <textarea
        name="descripcion"
        [(ngModel)]="borrador.descripcion"
        rows="2"
        placeholder="Descripción"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border px-3 py-2 text-sm"
      ></textarea>

      <input
        name="imagen"
        [(ngModel)]="borrador.imagen_url"
        placeholder="URL de imagen (opcional)"
        class="w-full rounded-lg bg-ocs-bg border border-ocs-border px-3 py-2 text-sm"
      />

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-ocs-muted mb-1">Precio USD</label>
          <input
            name="precio"
            type="number"
            step="0.01"
            [(ngModel)]="borrador.precio_usd"
            required
            class="w-full rounded-lg bg-ocs-bg border border-ocs-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="block text-xs text-ocs-muted mb-1">Stock</label>
          <input
            name="stock"
            type="number"
            [(ngModel)]="borrador.stock"
            required
            class="w-full rounded-lg bg-ocs-bg border border-ocs-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p class="text-xs text-ocs-muted">
        El precio en moneda interna se calcula automáticamente desde el tipo de cambio, salvo que
        lo fijes en Ajustes.
      </p>

      <div class="flex gap-2">
        <button
          type="submit"
          class="rounded-lg bg-ocs-accent text-black px-4 py-2 text-sm font-medium"
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
        @for (a of articulos(); track a.id) {
          <div
            class="rounded-lg border border-ocs-border bg-ocs-surface p-3 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <h3 class="text-sm font-medium truncate">{{ a.nombre }}</h3>
              <p class="text-xs text-ocs-muted">
                {{ a.precio_usd | number: '1.2-2' }} USD · {{ a.stock }} en stock
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button (click)="editar(a)" class="text-xs text-ocs-accent">Editar</button>
              <button (click)="borrar(a)" class="text-xs text-red-400">Borrar</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminTiendaComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly articulos = signal<ArticuloTienda[]>([]);
  readonly editando = signal<ArticuloTienda | null>(null);
  readonly cargando = signal(true);

  borrador: Partial<ArticuloTienda> = {
    nombre: '',
    descripcion: '',
    imagen_url: '',
    precio_usd: 0,
    stock: 0,
  };

  async ngOnInit(): Promise<void> {
    this.articulos.set(await this.datos.articulos());
    this.cargando.set(false);
  }

  editar(a: ArticuloTienda): void {
    this.editando.set(a);
    this.borrador = { ...a };
  }

  cancelar(): void {
    this.editando.set(null);
    this.borrador = { nombre: '', descripcion: '', imagen_url: '', precio_usd: 0, stock: 0 };
  }

  async guardar(): Promise<void> {
    await this.datos.guardarArticulo(this.borrador);
    this.articulos.set(await this.datos.articulos());
    this.cancelar();
  }

  async borrar(a: ArticuloTienda): Promise<void> {
    if (!confirm(`¿Borrar "${a.nombre}"?`)) return;
    await this.datos.borrarArticulo(a.id);
    this.articulos.set(await this.datos.articulos());
  }
}
