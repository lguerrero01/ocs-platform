import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';
import { PREGUNTAS_ADMISION } from '../../core/models';
import { LogoComponent } from '../../shared/logo.component';

/**
 * Registro en tres pasos:
 *   1. Validar el código QR (se canjea y queda inhabilitado al instante).
 *   2. Crear la cuenta.
 *   3. Responder el formulario de admisión.
 */
@Component({
  selector: 'app-registro',
  imports: [FormsModule, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <div class="flex items-center gap-3 mb-6">
          <app-logo [tamano]="52" [decorativo]="true" />
          <h1 class="text-2xl font-semibold text-ocs-accent">Solicitud de ingreso</h1>
        </div>

        <!-- Indicador de paso -->
        <div
          class="flex gap-2 mb-8"
          role="progressbar"
          aria-valuemin="1"
          aria-valuemax="3"
          [attr.aria-valuenow]="paso()"
          [attr.aria-label]="'Paso ' + paso() + ' de 3'"
        >
          @for (p of [1, 2, 3]; track p) {
            <div
              class="h-1 flex-1 rounded-full"
              [class.bg-ocs-accent]="paso() >= p"
              [class.bg-ocs-border]="paso() < p"
            ></div>
          }
        </div>

        @switch (paso()) {
          @case (1) {
            <h2 class="text-lg mb-2">Código de invitación</h2>
            <p class="text-sm text-ocs-muted mb-4">
              Escanea el QR que te entregaron o pega el código aquí. Solo funciona una vez.
            </p>
            <input
              [(ngModel)]="codigo"
              name="codigo"
              placeholder="00000000-0000-0000-0000-000000000000"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2 mb-4 font-mono text-sm"
            />
            @if (error()) {
              <p class="text-sm text-ocs-peligro mb-3">{{ error() }}</p>
            }
            <button
              (click)="validarCodigo()"
              [disabled]="cargando() || !codigo"
              class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
            >
              {{ cargando() ? 'Validando…' : 'Validar código' }}
            </button>
          }

          @case (2) {
            <h2 class="text-lg mb-4">Crea tu cuenta</h2>
            <form (ngSubmit)="crearCuenta()" class="space-y-4">
              <div>
                <label class="block text-sm mb-1" for="nombre">Nombre de usuario</label>
                <input
                  id="nombre"
                  name="nombre"
                  [(ngModel)]="nombreUsuario"
                  required
                  class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm mb-1" for="correo">Correo</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  [(ngModel)]="correo"
                  required
                  class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm mb-1" for="pass">Contraseña</label>
                <input
                  id="pass"
                  name="pass"
                  type="password"
                  [(ngModel)]="password"
                  required
                  minlength="8"
                  class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2"
                />
                <p class="text-xs text-ocs-muted mt-1">Mínimo 8 caracteres.</p>
              </div>
              @if (error()) {
                <p class="text-sm text-ocs-peligro">{{ error() }}</p>
              }
              <button
                type="submit"
                [disabled]="cargando()"
                class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
              >
                {{ cargando() ? 'Creando…' : 'Continuar' }}
              </button>
            </form>
          }

          @case (3) {
            <h2 class="text-lg mb-2">Formulario de admisión</h2>
            <p class="text-sm text-ocs-muted mb-4">
              Un administrador leerá tus respuestas antes de aprobar tu ingreso.
            </p>
            <form (ngSubmit)="enviarSolicitud()" class="space-y-4">
              @for (pregunta of preguntas; track pregunta.clave) {
                <div>
                  <label class="block text-sm mb-1" [for]="pregunta.clave">
                    {{ pregunta.etiqueta }}
                  </label>
                  @if (pregunta.tipo === 'area') {
                    <textarea
                      [id]="pregunta.clave"
                      [name]="pregunta.clave"
                      rows="3"
                      [(ngModel)]="respuestas[pregunta.clave]"
                      class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2"
                    ></textarea>
                  } @else {
                    <input
                      [id]="pregunta.clave"
                      [name]="pregunta.clave"
                      [(ngModel)]="respuestas[pregunta.clave]"
                      class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2"
                    />
                  }
                </div>
              }
              @if (error()) {
                <p class="text-sm text-ocs-peligro">{{ error() }}</p>
              }
              <button
                type="submit"
                [disabled]="cargando()"
                class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
              >
                {{ cargando() ? 'Enviando…' : 'Enviar solicitud' }}
              </button>
            </form>
          }
        }
      </div>
    </div>
  `,
})
export class RegistroComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly datos = inject(DatosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly preguntas = PREGUNTAS_ADMISION;

  readonly paso = signal(1);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  codigo = '';
  nombreUsuario = '';
  correo = '';
  password = '';
  respuestas: Record<string, string> = {};
  private codigoId?: string;

  ngOnInit(): void {
    // El QR apunta a /auth/registro?codigo=<uuid>
    const desdeUrl = this.route.snapshot.queryParamMap.get('codigo');
    if (desdeUrl) this.codigo = desdeUrl;
  }

  async validarCodigo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const { data, error } = await this.datos.canjearCodigoQr(this.codigo.trim());
    this.cargando.set(false);

    if (error || !data) {
      this.error.set('No se pudo validar el código.');
      return;
    }

    if (!data.valido) {
      const motivos: Record<string, string> = {
        inexistente: 'Ese código no existe.',
        usado: 'Ese código ya fue utilizado.',
        inhabilitado: 'Ese código fue inhabilitado.',
        expirado: 'Ese código expiró.',
      };
      this.error.set(motivos[data.motivo ?? ''] ?? 'Código inválido.');
      return;
    }

    this.paso.set(2);
  }

  async crearCuenta(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const { error } = await this.auth.registrar(this.correo, this.password, this.nombreUsuario);
    this.cargando.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    await this.auth.cargarPerfil();
    this.paso.set(3);
  }

  async enviarSolicitud(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const { error } = await this.datos.enviarSolicitud(this.respuestas, this.codigoId);
    this.cargando.set(false);

    if (error) {
      this.error.set(error);
      return;
    }

    void this.router.navigate(['/auth/pendiente']);
  }
}
