import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import {
  ArticuloTienda,
  ConfigCorreo,
  ConfigMoneda,
  InfoInstitucional,
  Mision,
  MisionAsignada,
  Publicacion,
  Rango,
  SolicitudAdmision,
  TipoPublicacion,
} from './models';

/**
 * Acceso a datos. Deliberadamente delgado: las consultas no filtran por
 * permisos, de eso se encarga RLS en PostgreSQL. Si una consulta devuelve
 * menos filas de lo esperado, la respuesta está en las políticas, no aquí.
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private get db() {
    return this.supabase.client;
  }

  // --- publicaciones -------------------------------------------------------
  async publicaciones(tipo?: TipoPublicacion): Promise<Publicacion[]> {
    let q = this.db.from('publicaciones').select('*').order('fecha', { ascending: false });
    if (tipo) q = q.eq('tipo', tipo);
    const { data } = await q;
    return (data ?? []) as Publicacion[];
  }

  async guardarPublicacion(p: Partial<Publicacion>): Promise<void> {
    if (p.id) {
      await this.db.from('publicaciones').update(p).eq('id', p.id);
    } else {
      await this.db
        .from('publicaciones')
        .insert({ ...p, creado_por: this.auth.perfil()?.id });
    }
  }

  async borrarPublicacion(id: string): Promise<void> {
    await this.db.from('publicaciones').delete().eq('id', id);
  }

  // --- misiones ------------------------------------------------------------
  async misiones(): Promise<Mision[]> {
    const { data } = await this.db
      .from('misiones')
      .select('*')
      .order('recompensa_creditos', { ascending: false });
    return (data ?? []) as Mision[];
  }

  async misAsignaciones(): Promise<MisionAsignada[]> {
    const uid = this.auth.perfil()?.id;
    if (!uid) return [];
    const { data } = await this.db
      .from('misiones_asignadas')
      .select('*, misiones(*)')
      .eq('usuario_id', uid);
    return (data ?? []) as MisionAsignada[];
  }

  async marcarMisionCompletada(asignacionId: string): Promise<void> {
    await this.db
      .from('misiones_asignadas')
      .update({ completada: true, completada_at: new Date().toISOString() })
      .eq('id', asignacionId);
  }

  async guardarMision(m: Partial<Mision>): Promise<void> {
    if (m.id) {
      await this.db.from('misiones').update(m).eq('id', m.id);
    } else {
      await this.db.from('misiones').insert({ ...m, creado_por: this.auth.perfil()?.id });
    }
  }

  async borrarMision(id: string): Promise<void> {
    await this.db.from('misiones').delete().eq('id', id);
  }

  async asignarMision(misionId: string, usuarioId: string): Promise<void> {
    await this.db
      .from('misiones_asignadas')
      .upsert({ mision_id: misionId, usuario_id: usuarioId }, { onConflict: 'mision_id,usuario_id' });
  }

  // --- rangos --------------------------------------------------------------
  async rangos(): Promise<Rango[]> {
    const { data } = await this.db
      .from('rangos')
      .select('*')
      .order('nivel', { ascending: false });
    return (data ?? []) as Rango[];
  }

  async guardarRango(r: Partial<Rango>): Promise<void> {
    if (r.id) {
      await this.db.from('rangos').update(r).eq('id', r.id);
    } else {
      await this.db.from('rangos').insert(r);
    }
  }

  async contarMiembrosPorRango(): Promise<Record<string, number>> {
    const { data } = await this.db.from('perfiles').select('rango_id').eq('estatus', 'activo');
    const conteo: Record<string, number> = {};
    for (const fila of (data ?? []) as { rango_id: string | null }[]) {
      if (fila.rango_id) conteo[fila.rango_id] = (conteo[fila.rango_id] ?? 0) + 1;
    }
    return conteo;
  }

  // --- información institucional ------------------------------------------
  async infoInstitucional(): Promise<InfoInstitucional[]> {
    const { data } = await this.db
      .from('info_institucional')
      .select('*')
      .order('orden', { ascending: true });
    return (data ?? []) as InfoInstitucional[];
  }

  async guardarInfo(i: Partial<InfoInstitucional>): Promise<void> {
    if (i.id) await this.db.from('info_institucional').update(i).eq('id', i.id);
    else await this.db.from('info_institucional').insert(i);
  }

  // --- tienda --------------------------------------------------------------
  async articulos(): Promise<ArticuloTienda[]> {
    const { data } = await this.db
      .from('tienda_articulos')
      .select('*')
      .order('nombre', { ascending: true });
    return (data ?? []) as ArticuloTienda[];
  }

  async guardarArticulo(a: Partial<ArticuloTienda>): Promise<void> {
    if (a.id) await this.db.from('tienda_articulos').update(a).eq('id', a.id);
    else await this.db.from('tienda_articulos').insert(a);
  }

  async borrarArticulo(id: string): Promise<void> {
    await this.db.from('tienda_articulos').delete().eq('id', id);
  }

  async moneda(): Promise<ConfigMoneda | null> {
    const { data } = await this.db.from('config_moneda').select('*').limit(1).maybeSingle();
    return data as ConfigMoneda | null;
  }

  async actualizarMoneda(m: Partial<ConfigMoneda>): Promise<void> {
    if (!m.id) return;
    await this.db
      .from('config_moneda')
      .update({ ...m, actualizado_at: new Date().toISOString() })
      .eq('id', m.id);
  }

  async crearPedido(items: { articulo_id: string; cantidad: number; precio_usd: number }[]) {
    const uid = this.auth.perfil()?.id;
    if (!uid) return null;

    const total = items.reduce((s, i) => s + i.precio_usd * i.cantidad, 0);
    const { data: pedido, error } = await this.db
      .from('pedidos')
      .insert({ usuario_id: uid, total_usd: total })
      .select()
      .single();

    if (error || !pedido) return null;

    await this.db
      .from('pedido_items')
      .insert(items.map((i) => ({ ...i, pedido_id: (pedido as { id: string }).id })));

    return pedido;
  }

  // --- solicitudes ---------------------------------------------------------
  async solicitudesPendientes(): Promise<SolicitudAdmision[]> {
    const { data } = await this.db
      .from('solicitudes_admision')
      .select('*, perfiles!solicitudes_admision_usuario_id_fkey(nombre_usuario, correo)')
      .eq('estatus', 'pendiente')
      .order('fecha_solicitud', { ascending: true });
    const solicitudes = (data ?? []) as SolicitudAdmision[];
    this.postulantesPendientes.set(solicitudes.length);
    return solicitudes;
  }

  /**
   * Cuántos postulantes esperan decisión. Vive aquí y no en el componente de
   * solicitudes porque el aviso se muestra en la navegación, que sigue montada
   * mientras el admin trabaja en otra pestaña.
   */
  readonly postulantesPendientes = signal(0);

  async refrescarPostulantesPendientes(): Promise<void> {
    const { count } = await this.db
      .from('solicitudes_admision')
      .select('id', { count: 'exact', head: true })
      .eq('estatus', 'pendiente');
    this.postulantesPendientes.set(count ?? 0);
  }

  async historialSolicitudes(): Promise<SolicitudAdmision[]> {
    const { data } = await this.db
      .from('solicitudes_admision')
      .select('*, perfiles!solicitudes_admision_usuario_id_fkey(nombre_usuario, correo)')
      .neq('estatus', 'pendiente')
      .order('decidido_at', { ascending: false })
      .limit(100);
    return (data ?? []) as SolicitudAdmision[];
  }

  async miSolicitud(): Promise<SolicitudAdmision | null> {
    const uid = this.auth.perfil()?.id;
    if (!uid) return null;
    const { data } = await this.db
      .from('solicitudes_admision')
      .select('*')
      .eq('usuario_id', uid)
      .maybeSingle();
    return data as SolicitudAdmision | null;
  }

  async enviarSolicitud(respuestas: Record<string, string>, codigoQrId?: string) {
    const uid = this.auth.perfil()?.id;
    if (!uid) return { error: 'Sin sesión.' };
    const { error } = await this.db.from('solicitudes_admision').insert({
      usuario_id: uid,
      respuestas_formulario: respuestas,
      codigo_qr_id: codigoQrId ?? null,
    });
    return { error: error?.message ?? null };
  }

  /** Aprueba o rechaza vía Edge Function (valida rol y dispara el correo). */
  async decidirSolicitud(solicitudId: string, decision: 'aprobado' | 'rechazado', motivo?: string) {
    const { data, error } = await this.db.functions.invoke('decidir-solicitud', {
      body: { solicitud_id: solicitudId, decision, motivo },
    });
    return { data, error };
  }

  // --- códigos QR ----------------------------------------------------------
  async generarCodigoQr() {
    const uid = this.auth.perfil()?.id;
    if (!uid) return null;
    const { data } = await this.db
      .from('codigos_qr')
      .insert({ creado_por: uid })
      .select()
      .single();
    return data as { id: string; codigo_aleatorio: string; expira_at: string } | null;
  }

  async codigosQr() {
    const { data } = await this.db
      .from('codigos_qr')
      .select('*')
      .order('creado_at', { ascending: false })
      .limit(50);
    return data ?? [];
  }

  async canjearCodigoQr(codigo: string) {
    const { data, error } = await this.db.rpc('canjear_codigo_qr', { p_codigo: codigo });
    return {
      data: data as {
        valido: boolean;
        motivo?: string;
        codigo_id?: string;
        numero_aspirante?: number;
      } | null,
      error,
    };
  }

  async inhabilitarCodigo(id: string): Promise<void> {
    await this.db
      .from('codigos_qr')
      .update({ inhabilitado_at: new Date().toISOString() })
      .eq('id', id);
  }

  // --- miembros y configuración -------------------------------------------
  async miembros() {
    const { data } = await this.db
      .from('perfiles')
      .select('*, rangos(nombre)')
      .order('creado_at', { ascending: false });
    return data ?? [];
  }

  async cambiarRol(usuarioId: string, rol: 'admin' | 'usuario'): Promise<void> {
    await this.db.from('perfiles').update({ rol }).eq('id', usuarioId);
    await this.db.from('auditoria').insert({
      actor_id: this.auth.perfil()?.id,
      accion: 'rol_cambiado',
      entidad: 'perfiles',
      entidad_id: usuarioId,
      detalle: { nuevo_rol: rol },
    });
  }

  async cambiarRango(usuarioId: string, rangoId: string | null): Promise<void> {
    await this.db.from('perfiles').update({ rango_id: rangoId }).eq('id', usuarioId);
  }

  async penalizar(usuarioId: string, motivo: string, puntos: number): Promise<void> {
    await this.db.from('penalizaciones').insert({
      usuario_id: usuarioId,
      motivo,
      puntos,
      aplicada_por: this.auth.perfil()?.id,
    });
    await this.db.rpc('recalcular_progreso', { p_usuario: usuarioId });
  }

  async plantillasCorreo(): Promise<ConfigCorreo[]> {
    const { data } = await this.db.from('config_correo').select('*').order('clave');
    return (data ?? []) as ConfigCorreo[];
  }

  async guardarPlantilla(p: ConfigCorreo): Promise<void> {
    await this.db
      .from('config_correo')
      .update({
        plantilla_asunto: p.plantilla_asunto,
        plantilla_cuerpo: p.plantilla_cuerpo,
        actualizado_por: this.auth.perfil()?.id,
        actualizado_at: new Date().toISOString(),
      })
      .eq('id', p.id);
  }

  async auditoria(limite = 100) {
    const { data } = await this.db
      .from('auditoria')
      .select('*')
      .order('creado_at', { ascending: false })
      .limit(limite);
    return data ?? [];
  }
}
