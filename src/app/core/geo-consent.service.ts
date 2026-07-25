import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Consentimiento y captura de ubicación.
 *
 * NOTA DE DISEÑO — por qué esto no es lo que pedía el documento original:
 *
 * El spec pedía exigir ubicación GPS *y micrófono* al instalar, bloqueando la
 * interfaz si el usuario los rechaza. El permiso de micrófono no se implementó:
 * ninguna funcionalidad de la plataforma usa audio, así que pedirlo solo serviría
 * para capturar sonido sin que el miembro lo sepa. Además es técnicamente
 * inviable: el navegador exige un gesto del usuario y muestra su propio diálogo,
 * y `getUserMedia` sin uso visible hace que Chrome/Safari marquen el sitio.
 *
 * La ubicación sí se implementa, porque puede tener un uso operativo legítimo,
 * pero bajo tres reglas:
 *   1. El miembro ve exactamente qué se guarda y por qué antes de aceptar.
 *   2. Puede revocarlo en cualquier momento; revocar borra la última posición
 *      (lo aplica el trigger `exigir_consentimiento_geo` en la base de datos).
 *   3. Cada captura queda en `auditoria`.
 *
 * Si `environment.geo.required` es true, quien no acepte no pasa del onboarding,
 * pero lo hace sabiendo qué está aceptando — eso es una condición de membresía,
 * no vigilancia encubierta.
 */
@Injectable({ providedIn: 'root' })
export class GeoConsentService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  readonly estado = signal<'desconocido' | 'concedido' | 'denegado' | 'no_soportado'>(
    'desconocido',
  );
  readonly ultimoError = signal<string | null>(null);

  /** ¿Ya aceptó este miembro? Se lee del perfil, no de localStorage. */
  tieneConsentimiento(): boolean {
    return this.auth.perfil()?.geo_consentimiento_at != null;
  }

  requerido(): boolean {
    return environment.geo.required;
  }

  /**
   * Pide el permiso al navegador y guarda la posición.
   * Debe llamarse desde un gesto del usuario (click), no automáticamente.
   */
  async aceptarYCapturar(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      this.estado.set('no_soportado');
      this.ultimoError.set('Este dispositivo no soporta geolocalización.');
      return false;
    }

    const uid = this.auth.perfil()?.id;
    if (!uid) return false;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        });
      });

      const ahora = new Date().toISOString();

      // El consentimiento y las coordenadas se escriben juntos: el trigger de
      // la base de datos rechaza coordenadas sin consentimiento.
      const { error } = await this.supabase.client
        .from('perfiles')
        .update({
          geo_consentimiento_at: ahora,
          ubicacion_lat: pos.coords.latitude,
          ubicacion_lng: pos.coords.longitude,
          ubicacion_actualizada_at: ahora,
        })
        .eq('id', uid);

      if (error) throw error;

      await this.registrarAuditoria('geo_consentimiento_otorgado');
      await this.auth.cargarPerfil();
      this.estado.set('concedido');
      return true;
    } catch (e: unknown) {
      const err = e as GeolocationPositionError;
      this.estado.set('denegado');
      this.ultimoError.set(
        err?.code === 1
          ? 'Permiso de ubicación denegado en el navegador.'
          : 'No se pudo obtener la ubicación.',
      );
      return false;
    }
  }

  /** Revoca el consentimiento. El trigger de la BD borra la última posición. */
  async revocar(): Promise<void> {
    const uid = this.auth.perfil()?.id;
    if (!uid) return;

    await this.supabase.client
      .from('perfiles')
      .update({ geo_consentimiento_at: null })
      .eq('id', uid);

    await this.registrarAuditoria('geo_consentimiento_revocado');
    await this.auth.cargarPerfil();
    this.estado.set('desconocido');
  }

  /** Refresco periódico, solo si el miembro ya consintió y está configurado. */
  async refrescarSiCorresponde(): Promise<void> {
    if (!this.tieneConsentimiento()) return;
    if (environment.geo.refreshMinutes <= 0) return;

    const ultima = this.auth.perfil()?.ubicacion_actualizada_at;
    if (ultima) {
      const minutos = (Date.now() - new Date(ultima).getTime()) / 60000;
      if (minutos < environment.geo.refreshMinutes) return;
    }
    await this.aceptarYCapturar();
  }

  private async registrarAuditoria(accion: string): Promise<void> {
    const uid = this.auth.perfil()?.id;
    if (!uid) return;
    await this.supabase.client.from('auditoria').insert({
      actor_id: uid,
      accion,
      entidad: 'perfiles',
      entidad_id: uid,
    });
  }
}
