# Applications Module

Este módulo implementa la funcionalidad de gestión de solicitudes (applications) con soporte para dos roles:

## 📁 Estructura

```
lib/applications/
├── types.ts          # Definición de tipos
├── mocks.ts          # Datos mock para testing
└── columns.tsx       # Definición de columnas de la tabla

components/sections/shell/applications/
└── applications-table.tsx   # Componente de tabla

app/[locale]/(shell)/[tenant]/applications/
└── page.tsx          # Página de solicitudes
```

## 👥 Roles Soportados

### Cliente (IS_ADMIN = false)
- Ve solo sus propias solicitudes
- Puede crear nuevas solicitudes
- No puede exportar datos
- Columnas básicas: Código, Atleta, Programa, Estado, Fecha

### Administrador (IS_ADMIN = true)
- Ve todas las solicitudes de la organización
- No puede crear solicitudes
- Puede exportar datos a CSV
- Puede usar filtros avanzados
- Columnas extendidas: incluye Email, Teléfono, Grado, Padre/Tutor

## 🔧 Configuración para Testing

Para cambiar entre vistas durante el desarrollo, edita `lib/applications/mocks.ts`:

```typescript
// Vista Cliente (ve solo solicitudes del usuario actual)
export const CURRENT_USER_ID = "user_client_123";
export const IS_ADMIN = false;

// Vista Administrador (ve todas las solicitudes)
export const IS_ADMIN = true;
```

## 📊 Datos Mock

El archivo `mocks.ts` contiene 4 solicitudes de ejemplo:
- 2 solicitudes del usuario "user_client_123" (Juan Pérez)
- 1 solicitud del usuario "user_client_456" (María González)
- 1 solicitud del usuario "user_client_789" (Carlos Rodríguez)

Estados disponibles:
- `pending` - Pendiente
- `under_review` - En Revisión
- `approved` - Aprobado
- `rejected` - Rechazado

## 🔄 Migración Futura al Backend

Cuando se implemente Convex, actualizar `page.tsx`:

**Actual (Mock):**
```typescript
import { getApplicationsByRole, IS_ADMIN, CURRENT_USER_ID } from "@/lib/applications/mocks";
const applications = getApplicationsByRole(IS_ADMIN, CURRENT_USER_ID);
```

**Futuro (Backend):**
```typescript
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const { orgRole } = await auth();
const isAdmin = orgRole === "org:admin";

const preloadedApplications = isAdmin
  ? await preloadQuery(api.applications.list, { organizationSlug: tenant })
  : await preloadQuery(api.applications.myApplications, { organizationSlug: tenant });
```

## 🎯 Funcionalidades

### DataTable Features
- ✅ Búsqueda por nombre
- ✅ Ordenamiento por código y fecha
- ✅ Filtrado por estado y programa (solo admin)
- ✅ Paginación (50 items por página)
- ✅ Click en fila para ver detalle
- ✅ Exportación a CSV (solo admin)
- ✅ Botón crear (solo cliente)
- ✅ Columnas ocultables/mostrables

### Rutas
- Lista: `/{tenant}/applications`
- Detalle: `/{tenant}/applications/{id}`
- Crear: `/{tenant}/applications/create`

## 📝 Campos Capturados

La estructura de `Application` incluye todos los campos del formulario de preadmission:

- **Información del Atleta**: nombre, apellido, sexo, altura, fecha de nacimiento, email, teléfono
- **Nacionalidad**: país de nacimiento, país de ciudadanía, necesita I-20
- **Dirección**: país, estado, ciudad, dirección, código postal
- **Programa**: formato, programa, año de ingreso, año de graduación, grado, programa de interés
- **Escuela Actual**: nombre, tipo, GPA, dirección completa
- **Referencias**: nombre completo, teléfono, relación
- **Padres/Tutores**: información de hasta 2 padres/tutores (nombre, relación, email, teléfono)
- **Adicional**: persona que envía, cómo conoció el programa, interés en boarding, mensaje

## 🎨 Personalización

### Agregar Nueva Columna

1. Actualizar tipo en `types.ts`
2. Agregar campo en `mocks.ts`
3. Agregar columna en `columns.tsx`:

```typescript
{
  accessorKey: "nuevoCampo",
  header: "Nuevo Campo",
  cell: ({ row }) => <div>{row.getValue("nuevoCampo")}</div>,
}
```

### Agregar Nuevo Filtro

Actualizar `applicationFilters` en `columns.tsx`:

```typescript
{
  id: "nuevoFiltro",
  label: "Nuevo Filtro",
  options: [
    { value: "opcion1", label: "Opción 1" },
    { value: "opcion2", label: "Opción 2" },
  ],
}
```
