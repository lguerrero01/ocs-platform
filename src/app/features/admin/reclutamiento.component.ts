import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import * as QRCode from 'qrcode';
import { DatosService } from '../../core/datos.service';
import { environment } from '../../../environments/environment';
import { IconoComponent } from '../../shared/icono.component';

interface CodigoListado {
  id: string;
  codigo_aleatorio: string;
  usado: boolean;
  inhabilitado_at: string | null;
  expira_at: string;
  creado_at: string;
}

/**
 * Generación de códigos QR de reclutamiento. Un código = un ingreso; se
 * inhabilita en el momento en que alguien lo canjea (ver `canjear_codigo_qr`).
 */
@Component({
  selector: 'app-admin-reclutamiento',
  imports: [DatePipe, IconoComponent],
  template: `
    <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6">
      <h2 class="font-medium mb-1">Generar código de invitación</h2>
      <p class="text-sm text-ocs-muted mb-4">
        Válido 24 horas y para un solo uso. Se inhabilita al escanearse.
      </p>

      <button
        (click)="generar()"
        [disabled]="generando()"
        class="rounded-lg bg-ocs-accent text-ocs-bg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
      >
        {{ generando() ? 'Generando…' : 'Generar nuevo QR' }}
      </button>

      @if (qrDataUrl()) {
        <div class="mt-5 flex flex-col items-center gap-3">
          <img [src]="qrDataUrl()!" alt="Código QR de invitación" class="w-56 h-56 rounded-lg" />
          <code class="text-xs text-ocs-muted break-all text-center px-4">
            {{ enlaceActual() }}
          </code>
          <div class="flex gap-2">
            <button
              (click)="copiar()"
              class="text-xs rounded-lg border border-ocs-border px-3 py-1.5"
            >
              {{ copiado() ? '✓ Copiado' : 'Copiar enlace' }}
            </button>
            <a
              [href]="qrDataUrl()!"
              download="invitacion-ocs.png"
              class="text-xs rounded-lg border border-ocs-border px-3 py-1.5"
            >
              Descargar PNG
            </a>
          </div>
        </div>
      }
    </div>

    <h2 class="font-medium mb-1">Códigos recientes</h2>
    <p class="text-sm text-ocs-muted mb-3">Toca cualquiera para ver su QR y descargarlo.</p>
    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!codigos().length) {
      <p class="text-sm text-ocs-muted">Aún no se han generado códigos.</p>
    } @else {
      <div class="space-y-2">
        @for (c of codigos(); track c.id) {
          <button
            type="button"
            (click)="abrirQr(c)"
            [attr.aria-label]="'Ver el QR del código ' + c.codigo_aleatorio"
            class="w-full text-left rounded-lg border border-ocs-border bg-ocs-surface p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-200 hover:bg-ocs-elevated hover:border-ocs-border-strong"
          >
            <div class="min-w-0 flex items-center gap-3">
              <app-icono nombre="qr" [tamano]="18" class="text-ocs-accent shrink-0" />
              <div class="min-w-0">
                <code class="text-xs text-ocs-muted block truncate">{{ c.codigo_aleatorio }}</code>
                <span class="text-[11px] text-ocs-muted">
                  {{ c.creado_at | date: 'short' }}
                </span>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full shrink-0" [class]="claseEstado(c)">
              {{ estado(c) }}
            </span>
          </button>
        }
      </div>
    }

    <!--
      El QR no se guarda en ninguna parte: se deriva del código, así que se
      vuelve a dibujar aquí en el cliente sin pedirle nada al servidor.
    -->
    <dialog
      #dialogo
      class="dialogo-ocs"
      aria-labelledby="titulo-qr"
      (close)="alCerrar()"
      (click)="clicFuera($event)"
    >
      @if (codigoAbierto(); as c) {
        <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 text-ocs-text">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="min-w-0">
              <h2 id="titulo-qr" class="font-medium">QR de invitación</h2>
              <span class="text-xs px-2 py-0.5 rounded-full inline-block mt-1" [class]="claseEstado(c)">
                {{ estado(c) }}
              </span>
            </div>
            <button
              type="button"
              (click)="cerrarQr()"
              aria-label="Cerrar"
              class="shrink-0 rounded-lg p-2 text-ocs-muted cursor-pointer transition-colors duration-200 hover:bg-ocs-elevated hover:text-ocs-text"
            >
              <app-icono nombre="cerrar" [tamano]="18" />
            </button>
          </div>

          @if (estado(c) !== 'activo') {
            <p
              class="text-xs rounded-lg border border-ocs-peligro/40 bg-ocs-peligro/10 text-ocs-peligro px-3 py-2 mb-4"
            >
              Este código ya no sirve para registrarse. Puedes descargarlo para tus registros,
              pero quien lo escanee no podrá ingresar.
            </p>
          }

          <!-- Altura fija: sin ella la tarjeta salta cuando termina de dibujarse. -->
          <div class="flex justify-center mb-3" aria-live="polite">
            @if (qrAbierto(); as src) {
              <img
                [src]="src"
                [alt]="'Código QR de la invitación ' + c.codigo_aleatorio"
                class="w-56 h-56 rounded-lg"
              />
            } @else {
              <div
                class="w-56 h-56 rounded-lg bg-ocs-elevated flex items-center justify-center text-xs text-ocs-muted"
              >
                Generando…
              </div>
            }
          </div>

          <code class="text-xs text-ocs-muted break-all block text-center mb-4">
            {{ enlaceDe(c) }}
          </code>

          <div class="flex gap-2 justify-center">
            <button
              type="button"
              (click)="copiarModal(enlaceDe(c))"
              class="text-xs rounded-lg border border-ocs-border px-3 py-1.5 cursor-pointer transition-colors duration-200 hover:bg-ocs-elevated"
            >
              {{ copiadoModal() ? '✓ Copiado' : 'Copiar enlace' }}
            </button>
            @if (qrAbierto(); as src) {
              <a
                [href]="src"
                [download]="'invitacion-ocs-' + c.codigo_aleatorio + '.png'"
                class="text-xs rounded-lg border border-ocs-border px-3 py-1.5 cursor-pointer transition-colors duration-200 hover:bg-ocs-elevated"
              >
                Descargar PNG
              </a>
            }
          </div>
        </div>
      }
    </dialog>
  `,
})
export class AdminReclutamientoComponent implements OnInit {
  private readonly datos = inject(DatosService);

  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  readonly codigos = signal<CodigoListado[]>([]);
  readonly qrDataUrl = signal<string | null>(null);
  readonly enlaceActual = signal('');
  readonly cargando = signal(true);
  readonly generando = signal(false);
  readonly copiado = signal(false);

  /** Código cuyo QR se está mostrando en el diálogo. */
  readonly codigoAbierto = signal<CodigoListado | null>(null);
  readonly qrAbierto = signal<string | null>(null);
  readonly copiadoModal = signal(false);

  async ngOnInit(): Promise<void> {
    this.codigos.set((await this.datos.codigosQr()) as CodigoListado[]);
    this.cargando.set(false);
  }

  enlaceDe(codigo: { codigo_aleatorio: string }): string {
    return `${environment.appUrl}/auth/registro?codigo=${codigo.codigo_aleatorio}`;
  }

  /**
   * Los colores van fijos y no siguen al tema: un QR necesita módulos oscuros
   * sobre fondo claro para que los lectores lo resuelvan, y el PNG descargado
   * acaba impreso o enviado por ahí, fuera de la aplicación.
   */
  private crearQr(enlace: string): Promise<string> {
    return QRCode.toDataURL(enlace, {
      width: 512,
      margin: 2,
      color: { dark: '#202221', light: '#ffffff' },
    });
  }

  async generar(): Promise<void> {
    this.generando.set(true);
    const codigo = await this.datos.generarCodigoQr();

    if (codigo) {
      const enlace = this.enlaceDe(codigo);
      this.enlaceActual.set(enlace);
      this.qrDataUrl.set(await this.crearQr(enlace));
      this.codigos.set((await this.datos.codigosQr()) as CodigoListado[]);
    }

    this.generando.set(false);
  }

  async abrirQr(c: CodigoListado): Promise<void> {
    this.codigoAbierto.set(c);
    this.qrAbierto.set(null);
    this.copiadoModal.set(false);
    // `showModal` y no `show`: solo la forma modal inertiza el fondo, atrapa el
    // foco y habilita Escape.
    this.dialogo()?.nativeElement.showModal();
    this.qrAbierto.set(await this.crearQr(this.enlaceDe(c)));
  }

  cerrarQr(): void {
    this.dialogo()?.nativeElement.close();
  }

  /** También lo dispara Escape, que cierra el diálogo sin pasar por el botón. */
  alCerrar(): void {
    this.codigoAbierto.set(null);
    this.qrAbierto.set(null);
  }

  /**
   * El `<dialog>` ocupa toda la ventana y el hueco alrededor de la tarjeta es
   * parte de él, así que un clic ahí llega con el propio diálogo como destino.
   */
  clicFuera(evento: MouseEvent): void {
    if (evento.target === this.dialogo()?.nativeElement) this.cerrarQr();
  }

  async copiar(): Promise<void> {
    await navigator.clipboard.writeText(this.enlaceActual());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  async copiarModal(enlace: string): Promise<void> {
    await navigator.clipboard.writeText(enlace);
    this.copiadoModal.set(true);
    setTimeout(() => this.copiadoModal.set(false), 2000);
  }

  estado(c: CodigoListado): string {
    if (c.usado) return 'usado';
    if (c.inhabilitado_at) return 'inhabilitado';
    if (new Date(c.expira_at) < new Date()) return 'expirado';
    return 'activo';
  }

  claseEstado(c: CodigoListado): string {
    return this.estado(c) === 'activo'
      ? 'bg-ocs-exito/15 text-ocs-exito'
      : 'bg-ocs-bg text-ocs-muted';
  }
}
