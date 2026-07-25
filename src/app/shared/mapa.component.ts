import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type * as L from 'leaflet';

/**
 * Mapa de una sola posición.
 *
 * Leaflet con teselas de OpenStreetMap: es la única combinación que funciona sin
 * cuenta ni clave de API. Las alternativas de teselas vectoriales (MapTiler,
 * Stadia) se ven mejor pero todas exigen registrarse.
 *
 * Leaflet se carga con `import()` dinámico para que sus ~40 kB no entren en el
 * bundle inicial: solo dos pantallas muestran mapa.
 *
 * El marcador es un `circleMarker` y no el marcador por defecto a propósito: el
 * icono de Leaflet son PNG que referencia por ruta relativa desde su CSS, y con
 * un empaquetador y un base-href que no es la raíz salen roto. Un círculo del
 * color de acento no depende de ningún asset.
 */
@Component({
  selector: 'app-mapa',
  template: `
    <div class="rounded-lg overflow-hidden border border-ocs-border">
      <div #lienzo class="mapa-ocs" [style.height.px]="altura()"></div>
    </div>
    @if (fallo()) {
      <p class="text-xs text-ocs-muted mt-1">{{ fallo() }}</p>
    }
  `,
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  /** Texto del globo. Si está vacío no se muestra ninguno. */
  readonly etiqueta = input('');
  readonly altura = input(220);
  readonly zoom = input(15);

  readonly fallo = signal<string | null>(null);

  private readonly lienzo = viewChild.required<ElementRef<HTMLDivElement>>('lienzo');
  private mapa?: L.Map;
  private marcador?: L.CircleMarker;
  private leaflet?: typeof L;
  private observador?: ResizeObserver;

  constructor() {
    // Reposicionar cuando cambian las coordenadas sin recrear el mapa.
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (!this.mapa || !this.marcador) return;
      this.marcador.setLatLng([lat, lng]);
      this.mapa.setView([lat, lng], this.mapa.getZoom());
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      this.leaflet = await import('leaflet');
    } catch {
      this.fallo.set('No se pudo cargar el mapa.');
      return;
    }

    const L = this.leaflet;
    const acento =
      getComputedStyle(document.documentElement).getPropertyValue('--ocs-accent').trim() ||
      '#b78b4c';

    this.mapa = L.map(this.lienzo().nativeElement, {
      center: [this.lat(), this.lng()],
      zoom: this.zoom(),
      // El scroll del ratón sobre un mapa embebido secuestra el de la página.
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.mapa);

    this.marcador = L.circleMarker([this.lat(), this.lng()], {
      radius: 8,
      color: acento,
      weight: 3,
      fillColor: acento,
      fillOpacity: 0.35,
    }).addTo(this.mapa);

    if (this.etiqueta()) this.marcador.bindPopup(this.etiqueta());

    /**
     * Leaflet mide el contenedor al crearse y cachea ese tamaño. Si todavía no
     * tenía su altura definitiva —dentro de un bloque que acaba de aparecer, o
     * antes de que el navegador termine el layout— carga las teselas para un
     * tamaño equivocado y el mapa queda a medias y descentrado. El observador
     * lo recalcula cada vez que el contenedor cambia de tamaño, que cubre
     * también el giro del móvil y el plegado de la barra lateral.
     */
    // Solo `invalidateSize`: ya conserva el centro. Encadenarle un `setView`
    // deja a Leaflet a medias de la animación de zoom y acaba con dos
    // contenedores de teselas superpuestos y media rejilla sin pintar.
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.lienzo().nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.mapa?.remove();
  }
}
