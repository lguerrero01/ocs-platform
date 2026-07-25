import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { GeoConsentService } from './geo-consent.service';

/** Exige sesión iniciada. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.listo();
  if (auth.autenticado()) return true;
  return router.createUrlTree(['/auth/login']);
};

/**
 * Exige ser miembro aprobado (`estatus = 'activo'`) y, si está configurado,
 * haber pasado por el consentimiento de ubicación.
 */
export const miembroActivoGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const geo = inject(GeoConsentService);
  const router = inject(Router);

  await auth.listo();
  if (!auth.autenticado()) return router.createUrlTree(['/auth/login']);

  const perfil = auth.perfil();
  if (!perfil) return router.createUrlTree(['/auth/login']);

  if (perfil.estatus === 'postulante') {
    return router.createUrlTree(['/auth/pendiente']);
  }
  if (perfil.estatus === 'suspendido' || perfil.estatus === 'rechazado') {
    return router.createUrlTree(['/auth/sin-acceso']);
  }

  if (geo.requerido() && !geo.tieneConsentimiento()) {
    return router.createUrlTree(['/onboarding/permisos'], {
      queryParams: { redirect: state.url },
    });
  }

  return true;
};

/** Solo admin o super_admin. */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.listo();
  if (!auth.autenticado()) return router.createUrlTree(['/auth/login']);
  if (auth.esAdmin()) return true;
  return router.createUrlTree(['/']);
};

/** Solo super_admin. */
export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.listo();
  if (auth.esSuperAdmin()) return true;
  return router.createUrlTree(['/admin']);
};
