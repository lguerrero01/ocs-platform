import { Injectable, computed, signal } from '@angular/core';
import { ArticuloTienda, ItemCarrito } from './models';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly items = signal<ItemCarrito[]>([]);

  readonly totalUsd = computed(() =>
    this.items().reduce((s, i) => s + i.articulo.precio_usd * i.cantidad, 0),
  );

  readonly cantidadTotal = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));

  agregar(articulo: ArticuloTienda): void {
    this.items.update((items) => {
      const existente = items.find((i) => i.articulo.id === articulo.id);
      if (existente) {
        if (existente.cantidad >= articulo.stock) return items;
        return items.map((i) =>
          i.articulo.id === articulo.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [...items, { articulo, cantidad: 1 }];
    });
  }

  quitar(articuloId: string): void {
    this.items.update((items) => items.filter((i) => i.articulo.id !== articuloId));
  }

  cambiarCantidad(articuloId: string, cantidad: number): void {
    if (cantidad <= 0) return this.quitar(articuloId);
    this.items.update((items) =>
      items.map((i) =>
        i.articulo.id === articuloId
          ? { ...i, cantidad: Math.min(cantidad, i.articulo.stock) }
          : i,
      ),
    );
  }

  vaciar(): void {
    this.items.set([]);
  }
}
