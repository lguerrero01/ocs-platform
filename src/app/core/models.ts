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
  /** Correlativo del aspirante. Se asigna al emitir el código, no al registrarse. */
  numero_aspirante: number;
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

export type TipoCampo = 'texto' | 'area' | 'fecha' | 'si_no' | 'email' | 'telefono';

export interface CampoAdmision {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  /**
   * Marcar como requerido solo lo que todo aspirante puede responder. Las
   * preguntas condicionales (nombres de hermanos, de pareja, de hijos) quedan
   * opcionales: exigirlas dejaría fuera a quien no tiene ninguno.
   */
  requerido?: boolean;
}

export interface SeccionAdmision {
  clave: string;
  titulo: string;
  campos: CampoAdmision[];
}

/**
 * Formulario de admisión, agrupado en las secciones que lee el admin antes de
 * decidir. Editable sin tocar el resto del código: el registro y la vista de
 * solicitudes se generan a partir de esta estructura.
 */
export const SECCIONES_ADMISION: SeccionAdmision[] = [
  {
    clave: 'personal',
    titulo: 'Personal',
    campos: [
      { clave: 'nombres_apellidos', etiqueta: 'Nombres y apellidos', tipo: 'texto', requerido: true },
      { clave: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true },
      { clave: 'lugar_nacimiento', etiqueta: 'Lugar de nacimiento', tipo: 'texto', requerido: true },
      { clave: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'texto', requerido: true },
      { clave: 'ci', etiqueta: 'CI', tipo: 'texto', requerido: true },
      { clave: 'telefono', etiqueta: 'Nro. de teléfono', tipo: 'telefono', requerido: true },
      { clave: 'telefono_emergencia', etiqueta: 'Nro. de emergencia', tipo: 'telefono', requerido: true },
      { clave: 'correo_contacto', etiqueta: 'Correo', tipo: 'email', requerido: true },
      { clave: 'direccion', etiqueta: 'Dirección completa', tipo: 'area', requerido: true },
      { clave: 'tipo_sangre', etiqueta: 'Tipo de sangre', tipo: 'texto' },
      { clave: 'altura', etiqueta: 'Tu altura', tipo: 'texto' },
      { clave: 'peso', etiqueta: 'Tu peso', tipo: 'texto' },
      { clave: 'discapacidad', etiqueta: '¿Tienes alguna discapacidad o limitación?', tipo: 'area' },
      { clave: 'enfermedad', etiqueta: '¿Padeces alguna enfermedad?', tipo: 'area' },
      { clave: 'alergias', etiqueta: '¿Sufres de alergias?', tipo: 'area' },
      { clave: 'medicamentos', etiqueta: '¿Tomas medicamentos regularmente?', tipo: 'area' },
    ],
  },
  {
    clave: 'familiar',
    titulo: 'Familiar',
    campos: [
      { clave: 'tiene_padres', etiqueta: '¿Tienes padres?', tipo: 'si_no' },
      { clave: 'padres_vivos', etiqueta: '¿Están vivos?', tipo: 'texto' },
      { clave: 'padres_nombres', etiqueta: '¿Cuáles son sus nombres?', tipo: 'texto' },
      { clave: 'padres_viven_contigo', etiqueta: '¿Viven contigo?', tipo: 'si_no' },
      { clave: 'tiene_hermanos', etiqueta: '¿Tienes hermanos?', tipo: 'si_no' },
      { clave: 'hermanos_nombres', etiqueta: '¿Cuáles son sus nombres?', tipo: 'texto' },
      { clave: 'hermanos_viven_contigo', etiqueta: '¿Viven contigo?', tipo: 'si_no' },
      { clave: 'tiene_pareja', etiqueta: '¿Tienes esposa/novia/concubina?', tipo: 'si_no' },
      { clave: 'pareja_nombre', etiqueta: '¿Cuál es su nombre?', tipo: 'texto' },
      { clave: 'tiene_hijos', etiqueta: '¿Tienes hijos?', tipo: 'si_no' },
      { clave: 'hijos_nombres', etiqueta: '¿Cuáles son sus nombres?', tipo: 'texto' },
    ],
  },
  {
    clave: 'academico',
    titulo: 'Académico',
    campos: [
      { clave: 'ocupacion', etiqueta: '¿Ocupación actual, trabajo o estudio?', tipo: 'texto', requerido: true },
      { clave: 'nivel_academico', etiqueta: '¿Nivel académico?', tipo: 'texto', requerido: true },
      { clave: 'habilidades', etiqueta: '¿Habilidades o experticias útiles?', tipo: 'area' },
      {
        clave: 'organizaciones',
        etiqueta: '¿Has pertenecido o perteneces a una organización de cualquier índole?',
        tipo: 'area',
      },
    ],
  },
  {
    clave: 'interes',
    titulo: 'De interés',
    campos: [
      { clave: 'antecedentes', etiqueta: '¿Tienes antecedentes penales o legales?', tipo: 'area' },
      { clave: 'vehiculo', etiqueta: '¿Tienes vehículo propio?', tipo: 'si_no' },
      { clave: 'metas', etiqueta: '¿Cuáles son tus metas a corto y largo plazo?', tipo: 'area', requerido: true },
      {
        clave: 'motivacion',
        etiqueta: '¿Por qué crees que debería ser aprobada tu solicitud?',
        tipo: 'area',
        requerido: true,
      },
    ],
  },
];

/** Lista plana, para las vistas que no agrupan por sección. */
export const PREGUNTAS_ADMISION: CampoAdmision[] = SECCIONES_ADMISION.flatMap((s) => s.campos);
