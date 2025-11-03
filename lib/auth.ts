/**
 * Determina la ruta de destino según el rol del usuario en la organización
 * @param orgSlug - El slug de la organización
 * @param hasRole - Función has() de Clerk auth para verificar roles
 * @returns La ruta completa hacia donde redirigir al usuario
 */
export function getRouteByRole(
  orgSlug: string,
  hasRole: (params: { role: string }) => boolean,
): string {
  // Orden de prioridad: admin > staff > member
  if (hasRole({ role: "org:admin" })) {
    console.log("Admin role detected");
    console.log(orgSlug);
    return `/${orgSlug}/admin`;
  }

  if (hasRole({ role: "org:staff" })) {
    return `/${orgSlug}/staff`;
  }

  if (hasRole({ role: "org:member" })) {
    return `/${orgSlug}/member`;
  }

  return `/${orgSlug}/apply`;
}
