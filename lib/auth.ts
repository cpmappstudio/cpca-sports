import { auth, clerkClient } from "@clerk/nextjs/server";

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

/**
 * Obtiene información sobre las organizaciones del usuario actual
 * y determina si debe ser redirigido o ver el selector de organizaciones
 * @returns Objeto con la información necesaria para decidir qué mostrar
 */
// export async function getUserOrganizationStatus() {
//   const { userId, orgSlug, has } = await auth();

//   // Si no está autenticado
//   if (!userId) {
//     return {
//       isAuthenticated: false,
//       shouldRedirect: false,
//       redirectTo: null,
//       organizationCount: 0,
//     };
//   }

//   const client = await clerkClient();
//   const { data: memberships } =
//     await client.users.getOrganizationMembershipList({
//       userId,
//     });

//   const organizationCount = memberships.length;

//   // Si tiene más de una organización, debe ver el selector
//   if (organizationCount > 1) {
//     return {
//       isAuthenticated: true,
//       shouldRedirect: false,
//       redirectTo: null,
//       organizationCount,
//     };
//   }

//   // Si tiene exactamente una organización Y está activa, redirigir
//   if (organizationCount === 1 && orgSlug) {
//     const redirectTo = getRouteByRole(orgSlug, has);
//     return {
//       isAuthenticated: true,
//       shouldRedirect: true,
//       redirectTo,
//       organizationCount,
//     };
//   }

//   // Si no tiene organizaciones o no está activa, mostrar selector
//   return {
//     isAuthenticated: true,
//     shouldRedirect: false,
//     redirectTo: null,
//     organizationCount,
//   };
// }
