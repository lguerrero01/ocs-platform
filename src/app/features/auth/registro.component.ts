import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';
import { SECCIONES_ADMISION } from '../../core/models';
import { LogoComponent } from '../../shared/logo.component';

/** Pasos del ingreso, en orden. `abandono` queda fuera de la secuencia. */
type Paso = 'codigo' | 'advertencia' | 'cuenta' | 'formulario' | 'abandono';

/**
 * Ingreso en cuatro pasos:
 *   1. Validar el código QR (se canjea y queda inhabilitado al instante).
 *   2. Bienvenida y advertencia de discreción — se puede abandonar aquí.
 *   3. Crear la cuenta.
 *   4. Formulario de admisión, recorrido sección por sección.
 */
@Component({
  selector: 'app-registro',
  imports: [FormsModule, LogoComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-10">
      <div class="w-full" [class.max-w-md]="paso() !== 'formulario'" [class.max-w-2xl]="paso() === 'formulario'">
        <div class="flex items-center gap-3 mb-6">
          <app-logo [tamano]="52" [decorativo]="true" />
          <h1 class="text-2xl font-semibold text-ocs-accent">Solicitud de ingreso</h1>
        </div>

        @if (paso() !== 'abandono') {
          <!-- Indicador de paso -->
          <div
            class="flex gap-2 mb-8"
            role="progressbar"
            aria-valuemin="1"
            aria-valuemax="4"
            [attr.aria-valuenow]="numeroPaso()"
            [attr.aria-label]="'Paso ' + numeroPaso() + ' de 4'"
          >
            @for (p of [1, 2, 3, 4]; track p) {
              <div
                class="h-1 flex-1 rounded-full"
                [class.bg-ocs-accent]="numeroPaso() >= p"
                [class.bg-ocs-border]="numeroPaso() < p"
              ></div>
            }
          </div>
        }

        @switch (paso()) {
          @case ('codigo') {
            <h2 class="text-lg mb-2">Código de invitación</h2>
            <p class="text-sm text-ocs-muted mb-4">
              Escanea el QR que te entregaron o pega el código aquí. Solo funciona una vez.
            </p>
            <label class="sr-only" for="codigo">Código de invitación</label>
            <input
              id="codigo"
              [(ngModel)]="codigo"
              name="codigo"
              placeholder="00000000-0000-0000-0000-000000000000"
              class="w-full rounded-lg bg-ocs-surface border border-ocs-border-strong px-3 py-2 mb-4 font-mono text-sm"
            />
            @if (error()) {
              <p class="text-sm text-ocs-peligro mb-3" role="alert">{{ error() }}</p>
            }
            <button
              (click)="validarCodigo()"
              [disabled]="cargando() || !codigo"
              class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
            >
              {{ cargando() ? 'Validando…' : 'Validar código' }}
            </button>
          }

          @case ('advertencia') {
            <h2 class="text-lg mb-4">
              Bienvenido a la OCS aspirante número
              <span class="text-ocs-accent font-mono">{{ numeroAspiranteFormateado() }}</span>
            </h2>
            <p class="text-sm text-ocs-muted mb-6">
              Es un honor tenerte como postulante en nuestra muy distinguida y augusta organización.
            </p>

            <div
              class="rounded-lg border border-ocs-peligro/40 bg-ocs-peligro/5 p-4 mb-6"
              role="note"
              aria-labelledby="titulo-advertencia"
            >
              <h3
                id="titulo-advertencia"
                class="text-sm font-semibold tracking-wide text-ocs-peligro mb-2"
              >
                ADVERTENCIA
              </h3>
              <p class="text-sm leading-relaxed mb-3">
                Es imperativo hacerte saber que si fuiste elegido por un Guardián para postular tu
                membresía ante la orden es porque vio en ti el potencial que requerimos. La primera
                de muchas responsabilidades que vas a adquirir (siempre y cuando estés de acuerdo
                con nuestro propósito, compromiso, valores y misión), es mantener absoluta
                discreción con la información a la que posiblemente tendrás acceso a continuación y
                mantener en total anonimato a la organización de la que puedes ser parte.
              </p>
              <p class="text-sm font-semibold text-ocs-peligro">
                NO RESPETAR ESTA REGLA PUEDE TRAER CONSECUENCIAS.
              </p>
            </div>

            <button
              (click)="paso.set('cuenta')"
              class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 mb-3 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
            >
              ¡Listo para continuar!
            </button>
            <button
              (click)="paso.set('abandono')"
              class="w-full rounded-lg border border-ocs-border-strong py-2.5 text-sm text-ocs-muted cursor-pointer transition-colors duration-200 hover:text-ocs-texto hover:border-ocs-muted"
            >
              Abandonar este lugar
            </button>
          }

          @case ('abandono') {
            <h2 class="text-lg mb-2">¿Abandonar?</h2>
            <p class="text-sm text-ocs-muted mb-4">
              Tu código ya fue canjeado y no puede volver a usarse. Si te retiras ahora, necesitarás
              que un Guardián te entregue uno nuevo para postular más adelante.
            </p>
            <button
              (click)="paso.set('advertencia')"
              class="w-full rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 mb-3 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
            >
              Quiero continuar
            </button>
            <button
              (click)="abandonar()"
              class="w-full rounded-lg border border-ocs-peligro/40 py-2.5 text-sm text-ocs-peligro cursor-pointer transition-colors duration-200 hover:bg-ocs-peligro/10"
            >
              Sí, abandonar
            </button>
          }

          @case ('cuenta') {
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
                <p class="text-sm text-ocs-peligro" role="alert">{{ error() }}</p>
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

          @case ('formulario') {
            <h2 class="text-lg mb-2">Formulario de admisión</h2>
            <p class="text-sm text-ocs-muted mb-6">
              Por favor llena este formulario y cuéntanos sobre ti. La información recopilada se usa
              para garantizar la seguridad de los miembros en caso de emergencia.
            </p>

            <!-- Secciones -->
            <div class="flex flex-wrap gap-2 mb-6" role="list" aria-label="Secciones del formulario">
              @for (s of secciones; track s.clave; let i = $index) {
                <span
                  role="listitem"
                  class="text-xs px-2.5 py-1 rounded-full border transition-colors duration-200"
                  [class.border-ocs-accent]="i === indiceSeccion()"
                  [class.text-ocs-accent]="i === indiceSeccion()"
                  [class.border-ocs-border]="i !== indiceSeccion()"
                  [class.text-ocs-muted]="i !== indiceSeccion()"
                >
                  {{ s.titulo }}
                </span>
              }
            </div>

            <form (ngSubmit)="siguienteSeccion()">
              <h3 class="text-base font-medium mb-4">{{ seccionActual().titulo }}</h3>

              <div class="space-y-4">
                @for (campo of seccionActual().campos; track campo.clave) {
                  <div>
                    <label class="block text-sm mb-1" [for]="campo.clave">
                      {{ campo.etiqueta }}
                      @if (campo.requerido) {
                        <span class="text-ocs-peligro" aria-hidden="true">*</span>
                      }
                    </label>

                    @switch (campo.tipo) {
                      @case ('area') {
                        <textarea
                          [id]="campo.clave"
                          [name]="campo.clave"
                          rows="3"
                          [required]="!!campo.requerido"
                          [attr.aria-invalid]="falta(campo.clave) ? 'true' : null"
                          [(ngModel)]="respuestas[campo.clave]"
                          class="w-full rounded-lg bg-ocs-surface border px-3 py-2"
                          [class]="falta(campo.clave) ? 'border-ocs-peligro' : 'border-ocs-border-strong'"
                        ></textarea>
                      }
                      @case ('si_no') {
                        <select
                          [id]="campo.clave"
                          [name]="campo.clave"
                          [required]="!!campo.requerido"
                          [attr.aria-invalid]="falta(campo.clave) ? 'true' : null"
                          [(ngModel)]="respuestas[campo.clave]"
                          class="w-full rounded-lg bg-ocs-surface border px-3 py-2 cursor-pointer"
                          [class]="falta(campo.clave) ? 'border-ocs-peligro' : 'border-ocs-border-strong'"
                        >
                          <option value="">Selecciona…</option>
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                      }
                      @default {
                        <input
                          [id]="campo.clave"
                          [name]="campo.clave"
                          [type]="tipoInput(campo.tipo)"
                          [required]="!!campo.requerido"
                          [attr.aria-invalid]="falta(campo.clave) ? 'true' : null"
                          [(ngModel)]="respuestas[campo.clave]"
                          class="w-full rounded-lg bg-ocs-surface border px-3 py-2"
                          [class]="falta(campo.clave) ? 'border-ocs-peligro' : 'border-ocs-border-strong'"
                        />
                      }
                    }
                  </div>
                }
              </div>

              @if (error()) {
                <p class="text-sm text-ocs-peligro mt-4" role="alert">{{ error() }}</p>
              }

              <div class="flex gap-3 mt-6">
                @if (indiceSeccion() > 0) {
                  <button
                    type="button"
                    (click)="seccionAnterior()"
                    class="rounded-lg border border-ocs-border-strong px-4 py-2.5 text-sm cursor-pointer transition-colors duration-200 hover:border-ocs-muted"
                  >
                    Anterior
                  </button>
                }
                <button
                  type="submit"
                  [disabled]="cargando()"
                  class="flex-1 rounded-lg bg-ocs-accent text-ocs-bg font-medium py-2.5 disabled:opacity-50 cursor-pointer transition-colors duration-200 hover:bg-ocs-accent-soft"
                >
                  @if (esUltimaSeccion()) {
                    {{ cargando() ? 'Enviando…' : 'Enviar solicitud' }}
                  } @else {
                    Siguiente
                  }
                </button>
              </div>
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

  readonly secciones = SECCIONES_ADMISION;

  readonly paso = signal<Paso>('codigo');
  readonly indiceSeccion = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly numeroAspirante = signal<number | null>(null);
  /** Solo se marcan los campos en rojo después del primer intento de avanzar. */
  readonly intentado = signal(false);

  readonly seccionActual = computed(() => this.secciones[this.indiceSeccion()]);
  readonly esUltimaSeccion = computed(() => this.indiceSeccion() === this.secciones.length - 1);

  /** El indicador de progreso solo cuenta los pasos de la secuencia. */
  readonly numeroPaso = computed(() => {
    switch (this.paso()) {
      case 'codigo':
        return 1;
      case 'advertencia':
        return 2;
      case 'cuenta':
        return 3;
      default:
        return 4;
    }
  });

  readonly numeroAspiranteFormateado = computed(() => {
    const n = this.numeroAspirante();
    return n === null ? '——————' : String(n).padStart(6, '0');
  });

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

  tipoInput(tipo: string): string {
    switch (tipo) {
      case 'fecha':
        return 'date';
      case 'email':
        return 'email';
      case 'telefono':
        return 'tel';
      default:
        return 'text';
    }
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

    // Se guardan para enlazar la solicitud con el código que la originó.
    this.codigoId = data.codigo_id;
    this.numeroAspirante.set(data.numero_aspirante ?? null);
    this.paso.set('advertencia');
  }

  abandonar(): void {
    void this.router.navigate(['/auth/login']);
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
    this.paso.set('formulario');
  }

  seccionAnterior(): void {
    this.error.set(null);
    this.intentado.set(false);
    this.indiceSeccion.update((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Qué falta por responder en la sección actual.
   *
   * La validación es explícita porque Angular pone `novalidate` en el
   * formulario: el atributo `required` de los campos no bloquea nada por sí
   * solo, y sin esto la solicitud se envía en blanco.
   */
  faltantes(): string[] {
    return this.seccionActual()
      .campos.filter((c) => c.requerido && !(this.respuestas[c.clave] ?? '').trim())
      .map((c) => c.clave);
  }

  falta(clave: string): boolean {
    return this.intentado() && this.faltantes().includes(clave);
  }

  /** Avanza de sección, o envía si ya es la última. */
  async siguienteSeccion(): Promise<void> {
    const faltan = this.faltantes();
    if (faltan.length) {
      this.intentado.set(true);
      this.error.set(
        faltan.length === 1
          ? 'Falta una respuesta obligatoria en esta sección.'
          : `Faltan ${faltan.length} respuestas obligatorias en esta sección.`,
      );
      document.getElementById(faltan[0])?.focus();
      return;
    }

    this.intentado.set(false);

    if (!this.esUltimaSeccion()) {
      this.error.set(null);
      this.indiceSeccion.update((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await this.enviarSolicitud();
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
