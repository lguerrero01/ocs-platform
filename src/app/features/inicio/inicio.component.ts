import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DatosService } from '../../core/datos.service';
import { Publicacion, TipoPublicacion } from '../../core/models';

/**
 * Inicio: noticias, artículos de lectura y anuncios/llamados de atención.
 * El spec pedía estos tres en la portada, no escondidos tras un menú.
 */
@Component({
  selector: 'app-inicio',
  imports: [DatePipe],
  template: `
    <h1 class="text-xl font-semibold mb-4">Inicio</h1>

    <!-- Anuncios y llamados de atención: siempre arriba, siempre visibles. -->
    @if (destacados().length) {
      <section class="mb-8 space-y-3">
        @for (p of destacados(); track p.id) {
          <article
            class="rounded-xl border p-4"
            [class]="
              p.tipo === 'llamado_atencion'
                ? 'border-red-900 bg-red-950/30'
                : 'border-ocs-accent/40 bg-ocs-accent/5'
            "
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs uppercase tracking-wide"
                [class]="p.tipo === 'llamado_atencion' ? 'text-red-400' : 'text-ocs-accent'"
              >
                {{ p.tipo === 'llamado_atencion' ? 'Llamado de atención' : 'Anuncio' }}
              </span>
              <span class="text-xs text-ocs-muted">{{ p.fecha | date: 'short' }}</span>
            </div>
            <h2 class="font-medium mb-1">{{ p.titulo }}</h2>
            <p class="text-sm text-ocs-muted whitespace-pre-line">{{ p.contenido }}</p>
          </article>
        }
      </section>
    }

    <!-- Pestañas noticias / artículos -->
    <div class="flex gap-1 border-b border-ocs-border mb-4">
      @for (t of pestanas; track t.tipo) {
        <button
          (click)="pestanaActiva.set(t.tipo)"
          class="px-3 py-2 text-sm border-b-2 -mb-px"
          [class]="
            pestanaActiva() === t.tipo
              ? 'border-ocs-accent text-ocs-accent'
              : 'border-transparent text-ocs-muted'
          "
        >
          {{ t.etiqueta }}
        </button>
      }
    </div>

    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!visibles().length) {
      <p class="text-sm text-ocs-muted">Todavía no hay contenido en esta sección.</p>
    } @else {
      <div class="space-y-4">
        @for (p of visibles(); track p.id) {
          <article class="rounded-xl border border-ocs-border bg-ocs-surface p-4">
            <div class="text-xs text-ocs-muted mb-1">{{ p.fecha | date: 'mediumDate' }}</div>
            <h2 class="font-medium mb-2">{{ p.titulo }}</h2>
            <p class="text-sm text-ocs-muted whitespace-pre-line leading-relaxed">
              {{ p.contenido }}
            </p>
          </article>
        }
      </div>
    }
  `,
})
export class InicioComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly pestanas: { tipo: TipoPublicacion; etiqueta: string }[] = [
    { tipo: 'noticia', etiqueta: 'Noticias' },
    { tipo: 'articulo_lectura', etiqueta: 'Artículos' },
  ];

  readonly todas = signal<Publicacion[]>([]);
  readonly pestanaActiva = signal<TipoPublicacion>('noticia');
  readonly cargando = signal(true);

  destacados = () =>
    this.todas().filter((p) => p.tipo === 'anuncio' || p.tipo === 'llamado_atencion');

  visibles = () => this.todas().filter((p) => p.tipo === this.pestanaActiva());

  async ngOnInit(): Promise<void> {
    this.todas.set(await this.datos.publicaciones());
    this.cargando.set(false);
  }
}
