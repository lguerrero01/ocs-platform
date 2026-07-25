import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DatosService } from '../../core/datos.service';
import { CarritoService } from '../../core/carrito.service';
import { ArticuloTienda, ConfigMoneda } from '../../core/models';

/**
 * Comercio. Cada precio se muestra en USD y en la moneda interna, cuyo valor
 * fija el super admin en `config_moneda`.
 *
 * La stablecoin en sí (contrato, liquidación on-chain) no está implementada:
 * el documento la deja explícitamente para el final. Aquí la moneda funciona
 * como unidad de cuenta con tipo de cambio configurable, que es lo que se
 * necesita para que la tienda opere mientras tanto.
 */
@Component({
  selector: 'app-tienda',
  imports: [DecimalPipe],
  template: `
    <div class="flex items-start justify-between mb-5">
      <div>
        <h1 class="text-xl font-semibold mb-1">Comercio</h1>
        @if (moneda(); as m) {
          <p class="text-sm text-ocs-muted">
            1 {{ m.simbolo }} = {{ m.valor_usd | number: '1.2-6' }} USD
          </p>
        }
      </div>

      @if (carrito.cantidadTotal() > 0) {
        <button
          (click)="mostrarCarrito.set(!mostrarCarrito())"
          class="rounded-lg border border-ocs-accent text-ocs-accent px-3 py-1.5 text-sm shrink-0"
        >
          🛒 {{ carrito.cantidadTotal() }}
        </button>
      }
    </div>

    @if (mostrarCarrito() && carrito.items().length) {
      <div class="rounded-xl border border-ocs-accent/40 bg-ocs-accent/5 p-4 mb-6">
        <h2 class="font-medium mb-3 text-sm">Tu pedido</h2>
        <div class="space-y-2 mb-3">
          @for (item of carrito.items(); track item.articulo.id) {
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="flex-1 min-w-0 truncate">{{ item.articulo.nombre }}</span>
              <input
                type="number"
                min="1"
                [max]="item.articulo.stock"
                [value]="item.cantidad"
                (input)="cambiarCantidad(item.articulo.id, $event)"
                class="w-16 rounded bg-ocs-bg border border-ocs-border px-2 py-1 text-center"
              />
              <span class="w-20 text-right text-ocs-muted">
                {{ item.articulo.precio_usd * item.cantidad | number: '1.2-2' }} $
              </span>
              <button (click)="carrito.quitar(item.articulo.id)" class="text-red-400 text-xs">
                ✕
              </button>
            </div>
          }
        </div>
        <div class="flex items-center justify-between border-t border-ocs-border pt-3">
          <div class="text-sm">
            <div>Total: {{ carrito.totalUsd() | number: '1.2-2' }} USD</div>
            @if (moneda(); as m) {
              <div class="text-ocs-accent text-xs">
                {{ enMoneda(carrito.totalUsd()) | number: '1.2-2' }} {{ m.simbolo }}
              </div>
            }
          </div>
          <button
            (click)="confirmarPedido()"
            [disabled]="enviando()"
            class="rounded-lg bg-ocs-accent text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {{ enviando() ? 'Enviando…' : 'Confirmar pedido' }}
          </button>
        </div>
      </div>
    }

    @if (mensaje()) {
      <p class="text-sm text-green-400 mb-4">{{ mensaje() }}</p>
    }

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!articulos().length) {
      <p class="text-sm text-ocs-muted">No hay artículos disponibles.</p>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (a of articulos(); track a.id) {
          <article
            class="rounded-xl border border-ocs-border bg-ocs-surface overflow-hidden flex flex-col"
          >
            @if (a.imagen_url) {
              <img [src]="a.imagen_url" [alt]="a.nombre" class="w-full h-32 object-cover" />
            }
            <div class="p-4 flex flex-col flex-1">
              <h2 class="font-medium mb-1">{{ a.nombre }}</h2>
              <p class="text-sm text-ocs-muted flex-1 mb-3">{{ a.descripcion }}</p>

              <div class="mb-3">
                <div class="text-ocs-accent font-medium">
                  {{ a.precio_usd | number: '1.2-2' }} USD
                </div>
                @if (moneda(); as m) {
                  <div class="text-xs text-ocs-muted">
                    ≈ {{ precioEnMoneda(a) | number: '1.2-2' }} {{ m.simbolo }}
                  </div>
                }
              </div>

              @if (a.stock > 0) {
                <button
                  (click)="carrito.agregar(a)"
                  class="w-full rounded-lg border border-ocs-accent text-ocs-accent py-2 text-sm"
                >
                  Agregar
                </button>
                <p class="text-[11px] text-ocs-muted mt-1.5 text-center">{{ a.stock }} en stock</p>
              } @else {
                <span class="text-xs text-ocs-muted text-center py-2">Agotado</span>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class TiendaComponent implements OnInit {
  private readonly datos = inject(DatosService);
  readonly carrito = inject(CarritoService);

  readonly articulos = signal<ArticuloTienda[]>([]);
  readonly moneda = signal<ConfigMoneda | null>(null);
  readonly cargando = signal(true);
  readonly enviando = signal(false);
  readonly mostrarCarrito = signal(false);
  readonly mensaje = signal<string | null>(null);

  /** Precio explícito en moneda interna, o conversión desde USD si no lo hay. */
  precioEnMoneda(a: ArticuloTienda): number {
    if (a.precio_stablecoin != null) return a.precio_stablecoin;
    return this.enMoneda(a.precio_usd);
  }

  enMoneda(usd: number): number {
    const valor = this.moneda()?.valor_usd ?? 1;
    return valor > 0 ? usd / valor : 0;
  }

  cambiarCantidad(articuloId: string, evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.carrito.cambiarCantidad(articuloId, valor);
  }

  async ngOnInit(): Promise<void> {
    const [articulos, moneda] = await Promise.all([this.datos.articulos(), this.datos.moneda()]);
    this.articulos.set(articulos);
    this.moneda.set(moneda);
    this.cargando.set(false);
  }

  async confirmarPedido(): Promise<void> {
    this.enviando.set(true);

    const items = this.carrito.items().map((i) => ({
      articulo_id: i.articulo.id,
      cantidad: i.cantidad,
      precio_usd: i.articulo.precio_usd,
    }));

    const pedido = await this.datos.crearPedido(items);
    this.enviando.set(false);

    if (pedido) {
      this.carrito.vaciar();
      this.mostrarCarrito.set(false);
      this.mensaje.set('Pedido enviado. Un administrador lo revisará.');
      setTimeout(() => this.mensaje.set(null), 5000);
    }
  }
}
