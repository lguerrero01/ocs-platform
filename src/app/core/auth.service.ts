import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Perfil } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);

  readonly autenticado = computed(() => this.session() !== null);
  readonly esAdmin = computed(() => {
    const rol = this.perfil()?.rol;
    return rol === 'admin' || rol === 'super_admin';
  });
  readonly esSuperAdmin = computed(() => this.perfil()?.rol === 'super_admin');
  readonly esActivo = computed(() => this.perfil()?.estatus === 'activo');

  constructor() {
    void this.inicializar();

    this.supabase.client.auth.onAuthStateChange((_evento, session) => {
      this.session.set(session);
      if (session) {
        void this.cargarPerfil();
      } else {
        this.perfil.set(null);
      }
    });
  }

  private async inicializar(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this.session.set(data.session);
    if (data.session) await this.cargarPerfil();
    this.cargando.set(false);
  }

  async cargarPerfil(): Promise<Perfil | null> {
    const uid = this.session()?.user.id;
    if (!uid) return null;

    const { data, error } = await this.supabase.client
      .from('perfiles')
      .select('*')
      .eq('id', uid)
      .single<Perfil>();

    if (error) {
      console.error('No se pudo cargar el perfil', error);
      return null;
    }

    this.perfil.set(data);
    return data;
  }

  async registrar(correo: string, password: string, nombreUsuario: string) {
    return this.supabase.client.auth.signUp({
      email: correo,
      password,
      options: { data: { nombre_usuario: nombreUsuario } },
    });
  }

  async iniciarSesion(correo: string, password: string) {
    return this.supabase.client.auth.signInWithPassword({ email: correo, password });
  }

  async cerrarSesion(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.perfil.set(null);
  }

  /** Espera a que termine la carga inicial de sesión. Lo usan los guards. */
  async listo(): Promise<void> {
    if (!this.cargando()) return;
    await new Promise<void>((resolve) => {
      const t = setInterval(() => {
        if (!this.cargando()) {
          clearInterval(t);
          resolve();
        }
      }, 30);
    });
  }
}
