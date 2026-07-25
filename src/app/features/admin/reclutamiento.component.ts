import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import * as QRCode from 'qrcode';
import { DatosService } from '../../core/datos.service';
import { environment } from '../../../environments/environment';

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
  imports: [DatePipe],
  template: `
    <div class="rounded-xl border border-ocs-border bg-ocs-surface p-4 mb-6">
      <h2 class="font-medium mb-1">Generar código de invitación</h2>
      <p class="text-sm text-ocs-muted mb-4">
        Válido 24 horas y para un solo uso. Se inhabilita al escanearse.
      </p>

      <button
        (click)="generar()"
        [disabled]="generando()"
        class="rounded-lg bg-ocs-accent text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
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

    <h2 class="font-medium mb-3">Códigos recientes</h2>
    @if (cargando()) {
      <p class="text-sm text-ocs-muted">Cargando…</p>
    } @else if (!codigos().length) {
      <p class="text-sm text-ocs-muted">Aún no se han generado códigos.</p>
    } @else {
      <div class="space-y-2">
        @for (c of codigos(); track c.id) {
          <div
            class="rounded-lg border border-ocs-border bg-ocs-surface p-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <code class="text-xs text-ocs-muted block truncate">{{ c.codigo_aleatorio }}</code>
              <span class="text-[11px] text-ocs-muted">
                {{ c.creado_at | date: 'short' }}
              </span>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full shrink-0" [class]="claseEstado(c)">
              {{ estado(c) }}
            </span>
          </div>
        }
      </div>
    }
  `,
})
export class AdminReclutamientoComponent implements OnInit {
  private readonly datos = inject(DatosService);

  readonly codigos = signal<CodigoListado[]>([]);
  readonly qrDataUrl = signal<string | null>(null);
  readonly enlaceActual = signal('');
  readonly cargando = signal(true);
  readonly generando = signal(false);
  readonly copiado = signal(false);

  async ngOnInit(): Promise<void> {
    this.codigos.set((await this.datos.codigosQr()) as CodigoListado[]);
    this.cargando.set(false);
  }

  async generar(): Promise<void> {
    this.generando.set(true);
    const codigo = await this.datos.generarCodigoQr();

    if (codigo) {
      const enlace = `${environment.appUrl}/auth/registro?codigo=${codigo.codigo_aleatorio}`;
      this.enlaceActual.set(enlace);
      this.qrDataUrl.set(
        await QRCode.toDataURL(enlace, {
          width: 512,
          margin: 2,
          color: { dark: '#0b0f14', light: '#ffffff' },
        }),
      );
      this.codigos.set((await this.datos.codigosQr()) as CodigoListado[]);
    }

    this.generando.set(false);
  }

  async copiar(): Promise<void> {
    await navigator.clipboard.writeText(this.enlaceActual());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  estado(c: CodigoListado): string {
    if (c.usado) return 'usado';
    if (c.inhabilitado_at) return 'inhabilitado';
    if (new Date(c.expira_at) < new Date()) return 'expirado';
    return 'activo';
  }

  claseEstado(c: CodigoListado): string {
    return this.estado(c) === 'activo'
      ? 'bg-green-950 text-green-400'
      : 'bg-ocs-bg text-ocs-muted';
  }
}
