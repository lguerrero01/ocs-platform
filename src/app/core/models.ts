export type RolUsuario = 'super_admin' | 'admin' | 'usuario';
export type EstatusPerfil = 'postulante' | 'activo' | 'suspendido' | 'rechazado';
export type EstatusSolicitud = 'pendiente' | 'aprobado' | 'rechazado';
export type TipoMision = 'individual' | 'grupal';
export type TipoPublicacion = 'noticia' | 'articulo_lectura' | 'anuncio' | 'llamado_atencion';

export interface Perfil {
  id: string;
  nombre_usuario: string;
  correo: string;
  rango_id: string | null;
  rol: RolUsuario;
  estatus: EstatusPerfil;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  ubicacion_actualizada_at: string | null;
  geo_consentimiento_at: string | null;
  progreso: number;
  creado_at: string;
}

export interface Rango {
  id: string;
  nombre: string;
  nivel: number;
  insignia_url: string | null;
  inventario_existencia: number;
  responsabilidades: string | null;
  rango_subordinado_id: string | null;
}

export interface CodigoQr {
  id: string;
  codigo_aleatorio: string;
  creado_por: string;
  usado: boolean;
  usado_por: string | null;
  inhabilitado_at: string | null;
  expira_at: string;
  creado_at: string;
}

export interface SolicitudAdmision {
  id: string;
  usuario_id: string;
  respuestas_formulario: Record<string, string>;
  estatus: EstatusSolicitud;
  aprobado_por: string | null;
  decidido_at: string | null;
  motivo_decision: string | null;
  fecha_solicitud: string;
  perfiles?: Pick<Perfil, 'nombre_usuario' | 'correo'>;
}

export interface Mision {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoMision;
  rango_requerido_id: string | null;
  recompensa_creditos: number;
  activa: boolean;
}

export interface MisionAsignada {
  id: string;
  mision_id: string;
  usuario_id: string;
  completada: boolean;
  completada_at: string | null;
  misiones?: Mision;
}

export interface Publicacion {
  id: string;
  tipo: TipoPublicacion;
  titulo: string;
  contenido: string;
  publicado: boolean;
  creado_por: string | null;
  fecha: string;
}

export interface InfoInstitucional {
  id: string;
  clave: string;
  titulo: string;
  contenido: string;
  nivel_minimo: number;
  orden: number;
}

export interface ArticuloTienda {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  precio_usd: number;
  precio_stablecoin: number | null;
  stock: number;
  activo: boolean;
}

export interface ConfigCorreo {
  id: string;
  clave: string;
  plantilla_asunto: string;
  plantilla_cuerpo: string;
}

export interface ConfigMoneda {
  id: string;
  nombre: string;
  simbolo: string;
  valor_usd: number;
}

export interface ItemCarrito {
  articulo: ArticuloTienda;
  cantidad: number;
}

/** Preguntas del formulario de admisión. Editables sin tocar el resto del código. */
export const PREGUNTAS_ADMISION: { clave: string; etiqueta: string; tipo: 'texto' | 'area' }[] = [
  { clave: 'motivacion', etiqueta: '¿Por qué quieres unirte?', tipo: 'area' },
  { clave: 'referencia', etiqueta: '¿Quién te refirió?', tipo: 'texto' },
  { clave: 'experiencia', etiqueta: 'Cuéntanos tu experiencia relevante', tipo: 'area' },
  { clave: 'disponibilidad', etiqueta: '¿Qué disponibilidad tienes?', tipo: 'texto' },
];
